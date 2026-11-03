#!/usr/bin/env python3
"""Builds fish.json, the content of the fish mode, from tools/fish_source.json plus WoRMS and iNaturalist lookups.

Decided with Pierre, 2026-11-03: one engine for corals and fish, with a taxonomy made of two trees.
1. Reference tree (`ref`), from WoRMS (World Register of Marine Species, https://www.marinespecies.org/rest/). No fixed
   ranks: each node keeps its WoRMS rank as given (Order, Suborder, Family, Subfamily, Tribe, Genus, Species...), unranked
   or odd clades are kept, missing ranks are simply skipped. A node is {name: accepted name, rank, parent, syn: WoRMS
   synonyms (old names stay accepted when typed), inat: iNaturalist taxon id (photos), iname: iNaturalist's name when it
   differs from WoRMS}. Nodes run from the WoRMS class (Teleostei, Elasmobranchii...) down to the species.
2. Teaching tree (`teach`), what the game asks: level 1 = the 27 family-level entries of the IMR fish presentation in the
   order of its 10 shape groups (chapters), then the other circles; level 2 = species. Each teaching node points to one
   or more reference nodes (`ref`, minus `not`): Unicornfish = genus Naso, Surgeonfish = the rest of Acanthuridae,
   Parrotfish = subfamily Scarinae, Wrasse = Labridae without Scarinae, Sweetlips = Plectorhinchus + Diagramma...
   A species belongs to the teaching node whose `ref` holds its nearest WoRMS ancestor (the most specific wins).
   `sub` holds the sub-entries IMR names inside an entry (Chromis / Dascyllus / Pomacentrus, Surgeonfish / Unicornfish).
Circles: 1 = IMR core (the 27 entries, their species from the EventMeasure reference PDF "Common Filipino Fishes",
cheatsheet first, and the species the slides name); 2 = seen sometimes on SVS video (barracudas for now); 3 = opt-in
"beyond IMR" (the other PDF families, and dive favourites observed near Dauin). Silvery/pelagic groups are not circle 1.
Presence rule (Pierre, AGENTS.md rule 11): a species is kept only when confirmed in the Philippines, meaning at least one
Research Grade iNaturalist observation there (place 6873); `present.dauin` counts Research Grade observations within
40 km of Dauin (9.19, 123.26). Species not confirmed are dropped and listed in `drop`.

Every species name of the source is checked against WoRMS: an exact match on the name as written (or on its hand fix
`as`), else WoRMS's fuzzy match (TAXAMATCH); an unaccepted name is replaced by its accepted name and kept in `was`.
The build prints every fix, the WoRMS / iNaturalist name mismatches, the dropped species and a cross-check of the PDF
sections against the teaching nodes.

Each species: {id, name (WoRMS accepted), common, ref (AphiaID), inat, circle, r (rank order: the PDF cheatsheet's 24
most sighted first, then the source order, i.e. PDF order, then the slides, then Dauin favourites), present: {dauin, ph},
pdf (pages), cs (cheatsheet rank), sl (slide), was (the name as written when it differs)}. Ids are stable and never names:
they live in the source file (teaching nodes t01..., species s001...), never reuse or renumber one.

Network: WoRMS and iNaturalist, read only, a short pause between calls, generic User-Agent. Every reply is cached in
tools/.cache/fish.json (git-ignored), so a rerun is offline and gives the same file; --refresh asks again (counts and
names move over time), --offline fails instead of asking. The output is deterministic: one record per line, sorted.

Usage: python3 tools/build_fish.py [--offline | --refresh] [--dry]   (--dry: print the report, leave fish.json as it is)
Check: node --test tests/fish.test.js
"""
import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "fish_source.json"
OUT = ROOT / "fish.json"
CACHE = ROOT / "tools" / ".cache" / "fish.json"
V = 1  # fish.json format version

UA = {"User-Agent": "coral-id-imr/1.0", "Accept": "application/json"}
WORMS = "https://www.marinespecies.org/rest/"
INAT = "https://api.inaturalist.org/v1/"
PAUSE = {WORMS: 0.3, INAT: 1.0}
DAUIN = "lat=9.19&lng=123.26&radius=40"
PH = "place_id=6873"
CHORDATA = 2  # iNaturalist
INAT_RANKS = {"class", "subclass", "infraclass", "superorder", "order", "suborder", "infraorder", "superfamily", "family",
              "subfamily", "supertribe", "tribe", "subtribe", "genus", "subgenus", "species"}
LOW = {"Subspecies", "Variety", "Forma", "Natio", "Mutatio"}  # synonyms below the species: not kept


class Net:
    """GET JSON with a cache (one file, {url: reply}); None for an empty reply (WoRMS answers 204 when nothing matches)."""

    def __init__(self, offline=False, refresh=False):
        self.offline, self.refresh, self.new, self.asked = offline, refresh, 0, set()
        self.c = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}

    def get(self, url):
        if url in self.c and not (self.refresh and url not in self.asked):
            return self.c[url]
        if self.offline:
            sys.exit(f"--offline: not cached: {url}")
        base = WORMS if url.startswith(WORMS) else INAT
        for k in range(6):
            time.sleep(PAUSE[base])
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                    body = r.read()
                v = json.loads(body) if body.strip() else None
                break
            except urllib.error.HTTPError as e:
                if e.code in (204, 404):
                    v = None
                    break
                err = e
            except Exception as e:  # noqa: BLE001  (network, timeout, bad JSON: retried)
                err = e
            print(f"  retry {url[:90]} ({err})", file=sys.stderr)
            time.sleep(5 * (k + 1))
        else:
            raise RuntimeError(f"failed: {url}")
        self.c[url] = v
        self.asked.add(url)
        self.new += 1
        if self.new % 40 == 0:
            self.save()
        return v

    def save(self):
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        tmp = CACHE.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.c, sort_keys=True, separators=(",", ":")), encoding="utf-8")
        tmp.replace(CACHE)


NET = None
q = urllib.parse.quote


def chordate(recs):
    return [r for r in recs or [] if r.get("phylum") == "Chordata"]


def worms_record(aid):
    return NET.get(f"{WORMS}AphiaRecordByAphiaID/{aid}")


def accepted(rec):
    """Follow valid_AphiaID until an accepted record (WoRMS chains are short)."""
    for _ in range(5):
        if rec["status"] == "accepted" or not rec.get("valid_AphiaID") or rec["valid_AphiaID"] == rec["AphiaID"]:
            return rec
        rec = worms_record(rec["valid_AphiaID"])
    return rec


def worms_name(name):
    """(record as matched, how) for a name in Chordata: exact match first, then WoRMS's fuzzy match (TAXAMATCH)."""
    recs = chordate(NET.get(f"{WORMS}AphiaRecordsByName/{q(name)}?like=false&marine_only=true"))
    if not recs:
        recs = chordate(NET.get(f"{WORMS}AphiaRecordsByName/{q(name)}?like=false&marine_only=false"))
    if recs:
        same = [r for r in recs if r["scientificname"] == name] or recs
        best = sorted(same, key=lambda r: (r["status"] != "accepted", r["AphiaID"]))[0]
        return best, "exact"
    m = NET.get(f"{WORMS}AphiaRecordsByMatchNames?scientificnames[]={q(name)}&marine_only=true") or [[]]
    recs = chordate(m[0] if m else [])
    valid = sorted({r["valid_AphiaID"] for r in recs if r.get("valid_AphiaID")})
    if len(valid) == 1:
        return recs[0], "fuzzy"
    return None, ("ambiguous: " + ", ".join(sorted({r["scientificname"] for r in recs}))) if recs else "no match"


def classification(aid):
    """[(AphiaID, name, rank)] from the deepest WoRMS class down to the taxon itself."""
    node, out = NET.get(f"{WORMS}AphiaClassificationByAphiaID/{aid}"), []
    while node:
        out.append((node["AphiaID"], node["scientificname"], node["rank"]))
        node = node.get("child")
    cls = [i for i, x in enumerate(out) if x[2] == "Class"]
    return out[cls[-1]:] if cls else out


def synonyms(aid):
    names, off = set(), 1
    while True:
        rs = NET.get(f"{WORMS}AphiaSynonymsByAphiaID/{aid}?offset={off}") or []
        names |= {r["scientificname"] for r in rs if r.get("rank") not in LOW and r.get("scientificname")}
        if len(rs) < 50:
            return names
        off += 50


def inat_taxon(name, rank, alt=()):
    """(iNat id, iNat name) of the taxon named `name` in Chordata; for a species, else the species iNat files that name
    (or an old name, `alt`) under. Above the species only the exact name counts: iNaturalist's other matches there are
    another rank (Scarini -> Scarinae, Caesionidae -> Lutjaninae). (None, None) when iNaturalist has nothing."""
    for k, n in enumerate([name, *alt]):
        rs = (NET.get(f"{INAT}taxa?q={q(n)}&per_page=30") or {}).get("results") or []
        rs = [r for r in rs if CHORDATA in (r.get("ancestor_ids") or [])]
        exact = [r for r in rs if r["name"] == n]
        if not exact and rank == "Species":
            exact = [r for r in rs if r.get("matched_term") == n]
        if exact:
            r = sorted(exact, key=lambda r: (r["rank"] != rank.lower(), r["id"]))[0]
            if k == 0 or r["rank"] == rank.lower():
                return r["id"], r["name"]
    return None, None


def inat_count(tid, where):
    return (NET.get(f"{INAT}observations?taxon_id={tid}&quality_grade=research&{where}&per_page=0") or {}).get("total_results", 0)


def resolve_ref(x, report):
    """A teaching node's ref entry (WoRMS name or AphiaID) -> accepted AphiaID."""
    if isinstance(x, int):
        return accepted(worms_record(x))["AphiaID"]
    rec, how = worms_name(x)
    if not rec:
        sys.exit(f"teaching ref {x!r}: {how}")
    acc = accepted(rec)
    if acc["scientificname"] != x:
        report["refnames"].append(f"{x} -> {acc['scientificname']} ({acc['rank']}, {rec['status']})")
    return acc["AphiaID"]


def dumps(o):
    return json.dumps(o, ensure_ascii=False, separators=(",", ":"))


def main():
    global NET
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    NET = Net(a.offline, a.refresh)
    src = json.loads(SRC.read_text(encoding="utf-8"))
    report = {"refnames": [], "fixes": [], "lumped": [], "empty": [], "drop": [], "mismatch": [], "noinat": [], "pdf": [], "unplaced": []}
    try:
        out = build(src, report)
    finally:
        NET.save()
    show(out, report)
    if not a.dry:
        write(out)
        print(f"wrote {OUT.relative_to(ROOT)}")


def build(src, report):
    tree = {}  # AphiaID -> {name, rank, parent}

    def add_chain(aid):
        chain = classification(aid)
        parent = None
        for cid, name, rank in chain:
            tree.setdefault(cid, {"name": name, "rank": rank, "parent": parent})
            parent = cid
        return [c[0] for c in chain][::-1]  # the taxon first, then its ancestors

    # Teaching nodes: refs resolved to accepted AphiaIDs, each with its classification.
    nodes = []
    for t in src["teach"]:
        for u in [t, *t.get("sub", [])]:
            u["_ref"] = [resolve_ref(x, report) for x in u["ref"]]
            u["_not"] = [resolve_ref(x, report) for x in u.get("not", [])]
            for aid in u["_ref"] + u["_not"]:
                add_chain(aid)
        nodes.append(t)

    def place(anc, cands):
        best = None
        for t in cands:
            if any(x in t["_not"] for x in anc):
                continue
            hit = [i for i, x in enumerate(anc) if x in t["_ref"]]
            if hit and (best is None or hit[0] < best[0]):
                best = (hit[0], t)
            elif hit and hit[0] == best[0]:
                sys.exit(f"two teaching nodes hold the same reference node: {best[1]['id']} {t['id']}")
        return best[1] if best else None

    # Species.
    species, seen = [], {}
    for i, s in enumerate(src["species"]):
        written = s.get("as") or s["name"]
        rec, how = worms_name(written)
        if not rec:
            report["fixes"].append(f"{s['id']} {s['name']}: NOT IN WoRMS ({how})")
            report["drop"].append({"name": s["name"], "why": "not in WoRMS"})
            continue
        acc = accepted(rec)
        name = acc["scientificname"]
        if name != s["name"]:
            why = []
            if s.get("as"):
                why.append(f"hand fix to {s['as']}")
            if how == "fuzzy":
                why.append(f"spelling (WoRMS fuzzy match {rec['scientificname']})")
            if rec["status"] != "accepted":
                why.append(f"{rec['status']}{', ' + rec['unacceptreason'] if rec.get('unacceptreason') else ''}")
            report["fixes"].append(f"{s['id']} {s['name']} -> {name}: {'; '.join(why)}")
        aid = acc["AphiaID"]
        if aid in seen:  # two names of the source are one WoRMS species: kept once, the other name accepted when typed
            report["lumped"].append(f"{s['id']} {s['name']} is WoRMS {name}, already {seen[aid]['s']['id']} {seen[aid]['s']['name']}: merged")
            seen[aid]["more"].append(s["name"])
            continue
        anc = add_chain(aid)
        t = place(anc, nodes)
        if not t:
            report["unplaced"].append(f"{s['id']} {name} ({tree[anc[1]]['name']}...)")
            continue
        sub = place(anc, t.get("sub", []))
        if s.get("sec") and s["sec"] not in t.get("pdf", []):
            report["pdf"].append(f"{s['id']} {name}: PDF section {s['sec']} but teaching node {t['id']} {t['name']}")
        seen[aid] = {"i": i, "s": s, "aid": aid, "name": name, "t": t, "sub": sub, "more": []}
        species.append(seen[aid])

    # iNaturalist: taxon ids for every reference node, presence counts for species.
    syn = {aid: sorted(synonyms(aid) - {n["name"]}) for aid, n in tree.items()}
    was = {x["aid"]: [x["s"]["name"], x["s"].get("as")] for x in species}
    for aid in sorted(tree):
        n = tree[aid]
        alt = [w for w in was.get(aid, []) if w and w != n["name"]] + syn[aid][:8] if n["rank"] == "Species" else []
        tid, iname = inat_taxon(n["name"], n["rank"], alt)
        n["inat"] = tid
        if tid is None:
            report["noinat"].append(f"{aid} {n['name']} ({n['rank']})")
        elif iname != n["name"]:
            n["iname"] = iname
            report["mismatch"].append(f"{n['name']} ({n['rank']}): iNaturalist {iname}")
    kept = []
    for x in species:
        tid = tree[x["aid"]]["inat"]
        ph = inat_count(tid, PH) if tid else 0
        if not ph:
            report["drop"].append({"name": x["name"], "why": "no Research Grade iNaturalist observation in the Philippines"
                                   if tid else "not on iNaturalist"})
            continue
        x["ph"], x["dauin"] = ph, inat_count(tid, DAUIN)
        kept.append(x)

    # Rank order: cheatsheet first, then source order.
    kept.sort(key=lambda x: (0, x["s"]["cs"]) if x["s"].get("cs") else (1, x["i"]))
    out_sp = []
    for r, x in enumerate(kept, 1):
        s = x["s"]
        circle = 3 if s.get("src") == "dauin" else x["t"].get("circle", 1)
        o = {"id": s["id"], "name": x["name"], "common": s.get("common", ""), "ref": x["aid"], "inat": tree[x["aid"]]["inat"],
             "circle": circle, "r": r, "present": {"dauin": x["dauin"], "ph": True}}
        for k in ("pdf", "cs", "sl"):
            if s.get(k):
                o[k] = s[k]
        w = sorted({n for n in (s["name"], s.get("as"), *x["more"]) if n and n != x["name"]})
        if w:
            o["was"] = w
        out_sp.append(o)
        x["r"] = r

    def fams(u):
        """WoRMS families holding the node's reference nodes (or the reference node itself when it is a family)."""
        f = set()
        for aid in u["_ref"]:
            a = aid
            while a is not None and tree[a]["rank"] != "Family":
                a = tree[a]["parent"]
            if a is not None:
                f.add(tree[a]["name"])
        return sorted(f)

    def teach_out(u, members, top):
        o = {"id": u["id"], "name": u["name"]}
        if top:
            o["fam"] = u.get("fam")
            wf = fams(u)
            if u.get("fam") and wf != [u["fam"]]:
                o["wfam"] = wf
            if u.get("group"):
                o["group"] = u["group"]
            o["level"] = 1
            o["circle"] = u.get("circle", 1)
            o["src"] = u.get("src", "imr")
            if u.get("sign") is False:
                o["sign"] = False
        o["ref"] = u["_ref"]
        if u["_not"]:
            o["not"] = u["_not"]
        o["species"] = [x["s"]["id"] for x in sorted(members, key=lambda x: x["r"])]
        for k in ("sl", "cues", "look", "phase"):
            if u.get(k):
                o[k] = u[k]
        return o

    out_t = []
    for t in nodes:
        mem = [x for x in kept if x["t"] is t]
        o = teach_out(t, mem, True)
        if t.get("sub"):
            o["sub"] = [teach_out(u, [x for x in mem if x["sub"] is u], False) for u in t["sub"]]
        if not mem and o["circle"] != 1:  # all its species dropped: left out until one is confirmed (id kept)
            report["empty"].append(f"{t['id']} {t['name']}")
            continue
        out_t.append(o)

    need = set()  # ancestors of the kept species and of the teaching nodes' references (dropped species leave)
    for a in [x["aid"] for x in kept] + [a for t in nodes for u in [t, *t.get("sub", [])] for a in u["_ref"] + u["_not"]]:
        while a is not None and a not in need:
            need.add(a)
            a = tree[a]["parent"]
    ref = {}
    for aid in sorted(need):
        n = tree[aid]
        o = {"name": n["name"], "rank": n["rank"], "parent": n["parent"]}
        if syn[aid]:
            o["syn"] = syn[aid]
        o["inat"] = n["inat"]
        if n.get("iname"):
            o["iname"] = n["iname"]
        ref[aid] = o
    drop = sorted(report["drop"], key=lambda d: d["name"])
    return {"v": V, "groups": src["groups"], "teach": out_t, "species": out_sp, "ref": ref, "drop": drop}


def write(o):
    lines = ["{", f'"v":{o["v"]},', '"groups":[']
    lines.append(",\n".join(dumps(g) for g in o["groups"]))
    lines.append("],")
    for k in ("teach", "species"):
        lines.append(f'"{k}":[')
        lines.append(",\n".join(dumps(x) for x in o[k]))
        lines.append("],")
    lines.append('"ref":{')
    lines.append(",\n".join(f'"{aid}":{dumps(n)}' for aid, n in o["ref"].items()))
    lines.append("},")
    lines.append('"drop":[')
    lines.append(",\n".join(dumps(d) for d in o["drop"]))
    lines.append("]")
    lines.append("}")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def show(o, rep):
    sp = o["species"]
    print(f"teaching nodes: {len(o['teach'])} ({sum(1 for t in o['teach'] if t['circle'] == 1)} in circle 1), "
          f"reference nodes: {len(o['ref'])}, species: {len(sp)}")
    for c in (1, 2, 3):
        print(f"  circle {c}: {sum(1 for t in o['teach'] if t['circle'] == c)} teaching nodes, "
              f"{sum(1 for s in sp if s['circle'] == c)} species, {sum(1 for s in sp if s['circle'] == c and s['present']['dauin'])} seen near Dauin")
    for k, title in (("refnames", "teaching refs resolved to another accepted name"), ("fixes", "species names fixed"), ("lumped", "source species merged (one WoRMS species)"),
                     ("pdf", "PDF section vs teaching node"), ("unplaced", "species in no teaching node (left out)"), ("empty", "teaching nodes left out: no species kept"),
                     ("mismatch", "WoRMS / iNaturalist name mismatches"), ("noinat", "reference nodes not on iNaturalist")):
        print(f"{title}: {len(rep[k])}")
        for x in rep[k]:
            print("  " + x)
    print(f"dropped: {len(o['drop'])}")
    for d in o["drop"]:
        print(f"  {d['name']}: {d['why']}")
    empty = [t["id"] + " " + t["name"] for t in o["teach"] if not t["species"]]
    if empty:
        print("teaching nodes without species: " + ", ".join(empty))


if __name__ == "__main__":
    main()
