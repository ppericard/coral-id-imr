#!/usr/bin/env python3
"""Builds fish.json, the content of the fish mode, from tools/fish_source.json plus WoRMS and iNaturalist lookups.

Decided with Pierre, 2026-11-03: one engine for corals and fish, with a taxonomy made of two trees.
1. Reference tree (`ref`), from WoRMS (World Register of Marine Species, https://www.marinespecies.org/rest/). No fixed
   ranks: each node keeps its WoRMS rank as given (Order, Suborder, Family, Subfamily, Tribe, Genus, Species...), unranked
   or odd clades are kept, missing ranks are simply skipped. A node is {name: accepted name, rank, parent, syn: WoRMS
   synonyms (old names stay accepted when typed), inat: iNaturalist taxon id (photos), iname: iNaturalist's name when it
   differs from WoRMS}. Nodes run from the WoRMS class (Teleostei, Elasmobranchii...) down to the species.
2. Teaching tree (`teach`), what the game asks: level 1 = the 27 family-level entries of the IMR fish presentation in its
   order, then the other circles; level 2 = species. Each teaching node points to one or more reference nodes (`ref`,
   minus `not`): Unicornfish = genus Naso, Surgeonfish = the rest of Acanthuridae,
   Parrotfish = subfamily Scarinae, Wrasse = Labridae without Scarinae, Sweetlips = Plectorhinchus + Diagramma...
   A species belongs to the teaching node whose `ref` holds its nearest ancestor (the most specific wins), its genus
   being the genus of its PDF name: Chromis agilis stays under Chromis though WoRMS now has it in Pycnochromis.
   `sub` holds the sub-entries IMR names inside an entry (Chromis / Dascyllus / Pomacentrus, Surgeonfish / Unicornfish).
Circles: 1 = IMR core (the 27 entries, their species from the EventMeasure reference PDF "Common Filipino Fishes",
cheatsheet first, and the species the slides name); 2 = seen sometimes on SVS video (barracudas for now); 3 = opt-in
"beyond IMR", not PDF-based (Pierre, 2026-11-03): the fish families divers want to recognise, muck diving above all
(sources in the source file's `sources`, reason in each node's `why`), with their species confirmed near Dauin (near_dauin), plus winks
(`wink`: unmistakable species, fun to meet, a light bonus rather than ID training). Silvery/pelagic groups are not circle 1.

Identification groups (Pierre, 2026-11-04; AGENTS.md rule 6c): the regional identification key in force (the source's
`deploy.key`, one of its `keys`; for the Indo-Pacific, the index of a reef fish ID book) is the reference for fish groups.
Every teaching node gets the group of its key (`group`, the key's group number): the first key label met walking up WoRMS
from each of its references (a subfamily label wins over its family's), the same for all of them. The build fails, naming
the node, when a node in the game (any circle, winks aside) has no group or spans two groups, unless the source makes the
choice explicit (`keyGroup`; null with `keyWhy` while a node waits for a decision, listed by the build). A region with no
key has no such rule. fish.json `key` = the key in force (id, region, cite, short, groups without their labels).

Names (Pierre, 2026-11-03): the name shown and expected is the PDF's, i.e. EventMeasure's (a fixed pick list that may lag
WoRMS). The WoRMS accepted name goes beside it in `now` ("now X in WoRMS"); both are accepted when typed, and the WoRMS
synonyms too. Each name is checked against WoRMS: an exact match on the name as written (or its hand fix `as`), else
WoRMS's fuzzy match (TAXAMATCH). A spelling WoRMS does not know at all is a likely slip in the PDF: kept as written and
flagged in `check` for Pierre to check against EventMeasure (common-name slips too, from the source's `check`). Two PDF
species that WoRMS treats as one stay two entries. The build prints all of these, the WoRMS / iNaturalist mismatches
and a cross-check of the PDF sections against the teaching nodes.

Presence (AGENTS.md rule 6g, Pierre 2026-11-04: "the same scientific rigour for everyone, me included"; the rule is
defined once in tools/presence.py): confirmed near Dauin (present.near, reasons in nearBy) = Research Grade observations
within 40 km of Dauin (9.19, 123.26) by at least 2 distinct observers, or the IMR reference PDF list; confirmed in the
Philippines (present.ph, reasons in phBy) = Research Grade observations there (place 6873) by at least 3 distinct
observers, or at least 1 there and FishBase's Philippine checklist (Table 1) lists it, or confirmed near Dauin. Pierre's
own observations (user ppericard), two halves: photos identified to the species stay usable as that species even when
Needs ID (rule 6a: he names a species only when nearly sure); presence: he is one observer like anyone, Research Grade
only, and his observations no longer confirm anything on their own (until 2026-11-04 they did). present = {dauin, dauinNI,
dauinU, near, nearBy, rg, phU, chk, ph, phBy, own} (presence()); circle 3 also needs near. --near recomputes dauinU and
near on the existing fish.json only (the rest of the build and its counts unchanged). A species not confirmed
in the Philippines leaves the game but stays in fish.json with `out` (a future Fish ID Key for EventMeasure must hold
every PDF species, unfiltered), as does a PDF species whose family is in no circle.

Each species: {id, name (PDF / source), now (WoRMS accepted, when it differs), common, ref (AphiaID), inat (iNaturalist
taxon of its PDF name, else of the WoRMS name), circle (in the game) or out (why not), r (rank order: the PDF
cheatsheet's 24 most sighted first, then the source order, i.e. PDF order, then the slides, winks, Dauin species),
present, src (slides, dauin, wink; PDF when absent), sec (PDF section), pdf (pages), cs (cheatsheet rank), sl (slide),
check}. Ids are stable and never names: they live in the source file (teaching nodes t01..., species s001...), never
reuse or renumber one (`retired` lists the ids taken out).

Network: WoRMS and iNaturalist, read only, a short pause between calls, generic User-Agent. Every reply is cached in
tools/.cache/fish.json (git-ignored), so a rerun is offline and gives the same file; --refresh asks again (counts and
names move over time), --offline fails instead of asking. The output is deterministic: one record per line, sorted.

Usage: python3 tools/build_fish.py [--offline | --refresh] [--dry]   (--dry: print the report, leave fish.json as it is)
       python3 tools/build_fish.py --regroup   (offline, no WoRMS call: re-applies the key in force to fish.json as it is,
       from its own reference tree; after an edit of `keys`, `deploy` or `keyGroup`, or to settle a merge of fish.json)
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
PIERRE = "ppericard"  # his observations: usable photos (rule 6a); one observer like anyone for presence (2026-11-04)
CHORDATA = 2  # iNaturalist
INAT_RANKS = {"class", "subclass", "infraclass", "superorder", "order", "suborder", "infraorder", "superfamily", "family",
              "subfamily", "supertribe", "tribe", "subtribe", "genus", "subgenus", "species"}
sys.path.insert(0, str(Path(__file__).resolve().parent))
from presence import NEAR_OBSERVERS, PH_OBSERVERS, listed, near_dauin, ph_confirmed  # noqa: E402  (the rule, once)

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


def inat_count(tid, where, grade="research"):
    """Observations of a taxon (and below it); grade "" = any quality grade."""
    g = f"&quality_grade={grade}" if grade else ""
    return (NET.get(f"{INAT}observations?taxon_id={tid}{g}&{where}&per_page=0") or {}).get("total_results", 0)


def presence(tid, imr=False, names=()):
    """present for an iNaturalist species taxon, by the presence rule (tools/presence.py, AGENTS.md rule 6g; Pierre,
    2026-11-04: "the same scientific rigour for everyone, me included"). Querying by the species taxon returns
    observations identified to it or below, so a genus-level observation never counts. dauin = Research Grade observations
    within 40 km of Dauin; dauinNI = the Needs ID observations there ("not confirmed near Dauin", never "never seen");
    dauinU = their distinct Research Grade observers; near / nearBy = confirmed near Dauin and why (near_dauin); rg =
    Research Grade observations in the Philippines; phU = their distinct observers (asked only when rg >= PH_OBSERVERS
    and nothing else confirms it); chk = the checklist (FishBase Table 1) lists it for the Philippines (`names`: the PDF
    name, the WoRMS name, iNaturalist's, the synonyms); ph / phBy = confirmed in the Philippines and why (ph_confirmed);
    own = all of Pierre's observations of it, anywhere: usable photos (rule 6a), no longer a confirmation by itself."""
    own = inat_count(tid, f"user_login={PIERRE}", "")
    rg_p = inat_count(tid, PH)
    rg_d = inat_count(tid, DAUIN) if rg_p else 0
    ni_d = inat_count(tid, DAUIN, "needs_id")
    p = {"dauin": rg_d, "dauinNI": ni_d}
    if own:
        p["own"] = own
    p.update(near_fields(tid, p, imr))
    chk = listed("fish", names)
    u = observers(tid, PH)[0] if rg_p >= PH_OBSERVERS and not (chk or p["near"]) else None
    why = ph_confirmed(rg_p, u, chk, p["near"])
    p.update({"rg": rg_p, "chk": chk, "ph": bool(why), "phBy": why})
    if u is not None:
        p["phU"] = u
    return p


# Circle 3 is limited to species confirmed near Dauin (Pierre, 2026-11-03), by the same rule.
C3_OUT = "circle 3: not confirmed near Dauin"


def observers(tid, where):
    """(distinct observers of Research Grade observations, their logins: the first 10) of a taxon in a place."""
    d = NET.get(f"{INAT}observations/observers?taxon_id={tid}&quality_grade=research&{where}&per_page=10") or {}
    return d.get("total_results", 0), [r["user"]["login"] for r in d.get("results") or []]


def near_fields(tid, p, imr=False):
    """present.dauinU (distinct Research Grade observers within 40 km of Dauin), near (near_dauin) and nearBy (why)."""
    n, _ = observers(tid, DAUIN) if p.get("dauin") else (0, [])
    why = near_dauin(n, imr)
    return {"dauinU": n, "near": bool(why), "nearBy": why}


def update_near(path=OUT):
    """--near: (re)compute present.dauinU, near and nearBy on the species of an existing fish.json, and take out of the
    game a circle-3 species not confirmed near Dauin (out: C3_OUT, also out of its teaching node's lists), nothing else
    (the rest of the build unchanged, so its WoRMS and iNaturalist counts do not move). A species taken out comes back
    with a full build once confirmed. Returns (fish.json, changes of near, circle-3 species and nodes taken out)."""
    o = json.loads(Path(path).read_text(encoding="utf-8"))
    changed, left = [], []
    for s in o["species"]:
        p = s.get("present")
        if not p or not s.get("inat"):
            continue
        old = p.get("near")
        p.pop("near", None)
        p.pop("nearBy", None)
        p.update(near_fields(s["inat"], p, "pdf" in s))
        who = None
        if p["near"] != old or (s.get("circle") == 3 and not p["near"]):
            _, who = observers(s["inat"], DAUIN) if p.get("dauin") else (0, [])
        if p["near"] != old:
            changed.append(f"{s['id']} {s['name']} (circle {s.get('circle', 'out')}): {p['dauin']} confirmed near Dauin, "
                           f"observers {', '.join(who) or 'none'} -> "
                           f"{'confirmed (' + ', '.join(p['nearBy']) + ')' if p['near'] else 'not confirmed'}")
        if s.get("circle") == 3 and not p["near"]:
            left.append(f"{s['id']} {s['name']}: {p['dauin']} Research Grade near Dauin, {p['dauinU']} observer(s) "
                        f"({', '.join(who) or 'none'})")
            del s["circle"]
            s["out"] = C3_OUT
    game = {s["id"] for s in o["species"] if s.get("circle")}
    keep = []
    for t in o["teach"]:
        t["species"] = [x for x in t.get("species", []) if x in game]
        for u in t.get("sub", []):
            u["species"] = [x for x in u.get("species", []) if x in game]
        if t["species"]:
            keep.append(t)
        else:
            left.append(f"teaching node {t['id']} {t['name']}: no species left, left out")
    o["teach"] = keep
    return o, changed, left


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


def key_in_force(src):
    """The identification key of this deployment's region (source `deploy.key` among `keys`), or None when the region has
    none (then no group rule). Its labels' names must be unique across groups."""
    kid = (src.get("deploy") or {}).get("key")
    if not kid:
        return None
    key = next((k for k in src.get("keys", []) if k["id"] == kid), None)
    if key is None:
        sys.exit(f"deploy.key {kid!r}: no such key in keys")
    seen = {}
    for g in key["groups"]:
        for lab in g["labels"]:
            for name in lab[1]:
                if seen.setdefault(name, g["n"]) != g["n"]:
                    sys.exit(f"key {kid}: {name} is under groups {seen[name]} and {g['n']}")
    return key


def key_out(key):
    """The key as fish.json carries it: the app shows group numbers and titles and credits the key (no labels)."""
    if key is None:
        return None
    o = {k: key[k] for k in ("id", "region", "cite", "short")}
    o["groups"] = [{"n": g["n"], "title": g["title"], "pages": g["pages"]} for g in key["groups"]]
    return o


def key_groups(key, units, tree):
    """{unit id: group n or None} under the key in force. units: [{id, name, refs (AphiaIDs), subs: [{id, name, refs}],
    game (in the game: any circle, winks aside), choice (the source's keyGroup for this key, absent: no entry), why}];
    tree: AphiaID -> {name, parent}. A reference's group: the first key label met walking up from it. Fails, naming every
    offending node, when a node in the game has no group, a reference with none, or two groups, without an explicit choice;
    a sub-entry must fall in its entry's group. Returns ({id: n}, [waiting: "id name: why"])."""
    if key is None:
        return {}, []
    label = {name: g["n"] for g in key["groups"] for lab in g["labels"] for name in lab[1]}
    nums = {g["n"] for g in key["groups"]}

    def of(aid):
        while aid is not None:
            n = tree[aid]
            if n["name"] in label:
                return label[n["name"]]
            aid = n["parent"]
        return None

    out, waiting, bad = {}, [], []
    for u in units:
        gs = [of(a) for a in u["refs"]]
        if "choice" in u:
            c = u["choice"]
            if c is None and not u.get("why"):
                bad.append(f"{u['id']} {u['name']}: keyGroup null needs a keyWhy")
            elif c is not None and c not in nums:
                bad.append(f"{u['id']} {u['name']}: keyGroup {c} is not a group of key {key['id']}")
            elif c is None:
                waiting.append(f"{u['id']} {u['name']}: {u['why']}")
            out[u["id"]] = c
        elif None not in gs and len(set(gs)) == 1:
            out[u["id"]] = gs[0]
        else:
            out[u["id"]] = None
            hit = sorted(set(gs) - {None})
            if u["game"]:
                lost = [tree[a]["name"] for a, g in zip(u["refs"], gs) if g is None]
                why = (f"two groups {', '.join(map(str, hit))}" if len(hit) > 1
                       else f"no group for {', '.join(lost)}" if hit else "no group")
                bad.append(f"{u['id']} {u['name']}: {why} in key {key['id']} (add its family to the key, or a keyGroup)")
        for sub in u.get("subs", []):
            sg = {of(a) for a in sub["refs"]}
            if out[u["id"]] is not None and sg != {out[u["id"]]}:
                bad.append(f"{sub['id']} {sub['name']}: group {sorted(sg, key=str)}, its entry {u['id']} {out[u['id']]}")
    if bad:
        sys.exit("identification groups (AGENTS.md rule 6c):\n  " + "\n  ".join(bad))
    return out, waiting


def regroup(src_path, check):
    """--regroup: the key in force applied again to fish.json as it is, from its own reference tree (no network).
    --check: write nothing, fail when fish.json differs (tests/fish.test.js runs it)."""
    src = json.loads(src_path.read_text(encoding="utf-8"))
    o = json.loads(OUT.read_text(encoding="utf-8"))
    key = key_in_force(src)
    tree = {int(a): {"name": n["name"], "parent": n["parent"]} for a, n in o["ref"].items()}
    by = {t["id"]: t for t in src["teach"]}
    kid = key["id"] if key else None
    units = [unit(t["ref"], [(u["id"], u["name"], u["ref"]) for u in t.get("sub", [])], by[t["id"]], not t.get("wink"), kid)
             for t in o["teach"]]
    groups, waiting = key_groups(key, units, tree)
    teach = []
    for t in o["teach"]:
        t = {k: v for k, v in t.items() if k != "group"}
        put_group(t, groups.get(t["id"]))
        teach.append(t)
    o["teach"], o["key"] = teach, key_out(key)
    o.pop("groups", None)
    if check:
        if render(o) != OUT.read_text(encoding="utf-8"):
            kid = key["id"] if key else "(none)"
            sys.exit(f"{OUT.relative_to(ROOT)} is not as key {kid} gives it: run python3 tools/build_fish.py --regroup")
        print("fish.json groups: as the key gives them")
        return
    write(o)
    print(f"regrouped {OUT.relative_to(ROOT)} with key {key['id'] if key else '(none)'}")
    for w in waiting:
        print("  waiting on Pierre: " + w)


def unit(refs, subs, s, game, kid):
    """A teaching node as key_groups reads it (refs: AphiaIDs; s: its source node, whose keyGroup for key kid is the
    explicit choice)."""
    u = {"id": s["id"], "name": s["name"], "refs": refs, "game": game,
         "subs": [{"id": i, "name": n, "refs": r} for i, n, r in subs]}
    kg = s.get("keyGroup") or {}
    if kid in kg:
        u["choice"], u["why"] = kg[kid], s.get("keyWhy", "")
    return u


def put_group(o, g):
    """Insert `group` right after fam / wfam (the record's layout), when the node has one."""
    if g is None:
        return
    items = list(o.items())
    at = next((i + 1 for i, (k, _) in reversed(list(enumerate(items))) if k in ("fam", "wfam")), len(items))
    items.insert(at, ("group", g))
    o.clear()
    o.update(items)


def dumps(o):
    return json.dumps(o, ensure_ascii=False, separators=(",", ":"))


def main():
    global NET
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--near", action="store_true", help="only (re)compute present.near on the existing fish.json")
    ap.add_argument("--regroup", action="store_true")
    ap.add_argument("--check", action="store_true", help="with --regroup: fail when fish.json is not as the key gives it")
    ap.add_argument("--src", help=argparse.SUPPRESS)  # tests: another source file
    a = ap.parse_args()
    if a.regroup:
        regroup(Path(a.src) if a.src else SRC, a.check)
        return
    NET = Net(a.offline, a.refresh)
    if a.near:
        try:
            o, changed, left = update_near()
        finally:
            NET.save()
        print(f"species whose 'confirmed near Dauin' changed: {len(changed)}")
        for x in changed:
            print("  " + x)
        print(f"out of circle 3 (not confirmed near Dauin): {len(left)}")
        for x in left:
            print("  " + x)
        if not a.dry:
            write(o)
            print(f"wrote {OUT.relative_to(ROOT)}")
        return
    src = json.loads(SRC.read_text(encoding="utf-8"))
    report = {"waiting": [], "refnames": [], "renamed": [], "typo": [], "lumped": [], "empty": [], "pierre": [], "out": [], "drop": [], "mismatch": [], "noinat": [], "pdf": [], "unplaced": []}
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
    # The key in force: every label names a WoRMS accepted taxon, as written (a key is matched by name on the tree).
    key = key_in_force(src)
    for g in (key or {}).get("groups", []):
        for lab in g["labels"]:
            for name in lab[1]:
                rec, how = worms_name(name)
                if not rec or how != "exact" or accepted(rec)["scientificname"] != name:
                    sys.exit(f"key {key['id']} group {g['n']} {lab[0]}: {name} is not a WoRMS accepted name ({how})")

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

    # Species. The name shown and expected is the PDF's (EventMeasure's: a fixed pick list that may lag WoRMS, Pierre,
    # 2026-11-03); the WoRMS accepted name goes beside it (`now`), and either is accepted when typed.
    genus_chain = {}

    def pdf_genus(g, worms_genus):
        """The chain of the genus the source name uses, when WoRMS has moved the species out of it (Chromis agilis is
        Pycnochromis agilis in WoRMS: the teaching tree still files it under Chromis). None when it is the same genus."""
        if g == worms_genus:
            return None
        if g not in genus_chain:
            rec, how = worms_name(g)
            ok = rec and how == "exact" and accepted(rec)["rank"] == "Genus"
            genus_chain[g] = add_chain(accepted(rec)["AphiaID"]) if ok else None
        return genus_chain[g]

    species, seen = [], {}
    for i, s in enumerate(src["species"]):
        written = s.get("as") or s["name"]
        rec, how = worms_name(written)
        if not rec:
            report["typo"].append(f"{s['id']} {s['name']}: NOT IN WoRMS ({how})")
            report["drop"].append({"name": s["name"], "why": "not in WoRMS"})
            continue
        acc = accepted(rec)
        now = acc["scientificname"]
        check = [s["check"]] if s.get("check") else []
        if how == "fuzzy" or s.get("as"):  # a spelling WoRMS does not know: likely a slip, to check against EventMeasure
            check.append(f"spelling as in the PDF; WoRMS has {now}")
            report["typo"].append(f"{s['id']} {s['name']}: WoRMS has {now} (fuzzy match {rec['scientificname']})")
        elif now != s["name"]:
            why = f"{rec['status']}{', ' + rec['unacceptreason'] if rec.get('unacceptreason') else ''}"
            report["renamed"].append(f"{s['id']} {s['name']}: now {now} in WoRMS ({why})")
        if s.get("check"):
            report["typo"].append(f"{s['id']} {s['name']}: {s['check']}")
        aid = acc["AphiaID"]
        if aid in seen:  # two PDF species, one WoRMS species: both kept, each under its PDF name (Pierre, 2026-11-03)
            report["lumped"].append(f"{s['id']} {s['name']} and {seen[aid]['s']['id']} {seen[aid]['s']['name']}: one WoRMS species, {now}")
        anc = add_chain(aid)
        gc = pdf_genus(s["name"].split()[0], tree[anc[1]]["name"] if tree[anc[1]]["rank"] == "Genus" else None)
        place_anc = [aid, *gc] if gc else anc
        t = place(place_anc, nodes)
        if not t and s.get("src") in ("dauin", "wink"):  # picked for a teaching node that does not hold it in WoRMS
            report["unplaced"].append(f"{s['id']} {s['name']} ({tree[anc[1]]['name']}...): left out")
            continue
        sub = place(place_anc, t.get("sub", [])) if t else None
        if t and s.get("sec") and s["sec"] not in t.get("pdf", []):
            report["pdf"].append(f"{s['id']} {s['name']}: PDF section {s['sec']} but teaching node {t['id']} {t['name']}")
        x = {"i": i, "s": s, "aid": aid, "now": now, "t": t, "sub": sub, "check": check, "out": []}
        if not t:  # a PDF species whose family is in no circle: kept for the Fish ID Key, out of the game
            x["out"].append("family in no circle")
        seen.setdefault(aid, x)
        species.append(x)

    # iNaturalist: taxon ids for every reference node, then for each species under its PDF name (iNaturalist may keep
    # the name EventMeasure uses), presence counts for species.
    syn = {aid: sorted(synonyms(aid) - {n["name"]}) for aid, n in tree.items()}
    for aid in sorted(tree):
        n = tree[aid]
        alt = syn[aid][:8] if n["rank"] == "Species" else []
        tid, iname = inat_taxon(n["name"], n["rank"], alt)
        n["inat"] = tid
        if tid is None:
            report["noinat"].append(f"{aid} {n['name']} ({n['rank']})")
        elif iname != n["name"]:
            n["iname"] = iname
            if n["rank"] != "Species":  # species are reported below, against their PDF name too
                report["mismatch"].append(f"{n['name']} ({n['rank']}): iNaturalist {iname}")
    for x in species:
        s, node = x["s"], tree[x["aid"]]
        tid, iname = inat_taxon(s["name"], "Species") if s["name"] != node["name"] else (None, None)
        if tid is None:
            tid, iname = node["inat"], node.get("iname") or node["name"]
            if tid and iname != node["name"]:
                node["iname"] = iname
        if tid and iname not in (s["name"], node["name"]):
            report["mismatch"].append(f"{s['name']} (WoRMS {node['name']}): iNaturalist {iname}")
        x["inat"] = tid
        if tid:
            r = tree[x["aid"]]
            x["present"] = presence(tid, bool(s.get("pdf")), [s["name"], x["now"], r["name"], iname, *syn.get(x["aid"], [])])
        else:
            imr = ["imr"] if s.get("pdf") else []
            # Not on iNaturalist: only the IMR list can confirm it (near Dauin, so in the Philippines).
            x["present"] = {"dauin": 0, "dauinNI": 0, "dauinU": 0, "near": bool(imr), "nearBy": imr, "rg": 0, "chk": False,
                            "ph": bool(imr), "phBy": ["near"] if imr else []}
        # Circle 3 only for species confirmed near Dauin (Pierre, 2026-11-03), by the same rule (near_dauin).
        c3 = s.get("src") in ("dauin", "wink") or (x["t"] or {}).get("circle") == 3
        if c3 and not x["out"] and x["present"]["ph"] and not x["present"]["near"]:
            x["out"].append(C3_OUT)
        if x["present"].get("own") and not x["present"]["ph"]:
            report["pierre"].append(f"{s['id']} {s['name']}: Pierre has {x['present']['own']} observation(s), not confirmed")
        if not x["present"]["ph"]:  # kept for the Fish ID Key (every PDF species), out of the game
            x["out"].append("not confirmed in the Philippines")
            report["drop"].append({"name": s["name"], "why": x["out"][-1]})
        if x["out"]:
            report["out"].append(f"{s['id']} {s['name']}: {'; '.join(x['out'])}")
    kept = [x for x in species if not x["out"]]  # in the game

    # Rank order: cheatsheet first, then source order.
    species.sort(key=lambda x: (0, x["s"]["cs"]) if x["s"].get("cs") else (1, x["i"]))
    out_sp = []
    for r, x in enumerate(species, 1):
        s = x["s"]
        o = {"id": s["id"], "name": s["name"]}
        if x["now"] != s["name"]:
            o["now"] = x["now"]
        o.update({"common": s.get("common", ""), "ref": x["aid"], "inat": x["inat"]})
        if not x["out"]:
            o["circle"] = 3 if s.get("src") in ("dauin", "wink") else x["t"].get("circle", 1)
        else:
            o["out"] = "; ".join(x["out"])
        o["r"] = r
        o["present"] = x["present"]
        if s.get("src"):
            o["src"] = s["src"]
        for k in ("sec", "pdf", "cs", "sl"):
            if s.get(k):
                o[k] = s[k]
        if x["check"]:
            o["check"] = "; ".join(x["check"])
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
            o["level"] = 1
            o["circle"] = u.get("circle", 1)
            o["src"] = u.get("src", "imr")
            if u.get("wink"):
                o["wink"] = u["wink"]
            if u.get("sign") is False:
                o["sign"] = False
        o["ref"] = u["_ref"]
        if u["_not"]:
            o["not"] = u["_not"]
        o["species"] = [x["s"]["id"] for x in sorted(members, key=lambda x: x["r"])]
        for k in ("sl", "cues", "look", "phase", "dimorph", "juv", "why", "note"):
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

    need = set()  # ancestors of the kept species and of the teaching nodes' references (all species, in the game or not)
    for a in [x["aid"] for x in species] + [a for t in nodes for u in [t, *t.get("sub", [])] for a in u["_ref"] + u["_not"]]:
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
    # Identification groups under the key in force (AGENTS.md rule 6c): every node in the game has one, or the build stops.
    kept_ids = {o["id"] for o in out_t}
    units = [unit(t["_ref"], [(u["id"], u["name"], u["_ref"]) for u in t.get("sub", [])], t, not t.get("wink"), key["id"] if key else None)
             for t in nodes if t["id"] in kept_ids]
    groups, report["waiting"] = key_groups(key, units, tree)
    for o in out_t:
        put_group(o, groups.get(o["id"]))
    # start: the starter core (fish_source.json _doc), circle-1 entries met first; checked to be kept entries.
    start = [t for t in src.get("start", []) if any(o["id"] == t and o["circle"] == 1 for o in out_t)]
    return {"v": V, "start": start, "key": key_out(key), "teach": out_t, "species": out_sp, "ref": ref}


def write(o):
    OUT.write_text(render(o), encoding="utf-8")


def render(o):
    lines = ["{", f'"v":{o["v"]},', f'"start":{dumps(o.get("start", []))},']
    if o.get("key"):  # the key in force, one group per line
        k = o["key"]
        lines.append('"key":' + dumps({x: k[x] for x in k if x != "groups"})[:-1] + ',"groups":[')
        lines.append(",\n".join(dumps(g) for g in k["groups"]))
        lines.append("]},")
    for k in ("teach", "species"):
        lines.append(f'"{k}":[')
        lines.append(",\n".join(dumps(x) for x in o[k]))
        lines.append("],")
    lines.append('"ref":{')
    lines.append(",\n".join(f'"{aid}":{dumps(n)}' for aid, n in o["ref"].items()))
    lines.append("}")
    lines.append("}")
    return "\n".join(lines) + "\n"


def show(o, rep):
    sp = o["species"]
    game = [s for s in sp if "out" not in s]
    print(f"teaching nodes: {len(o['teach'])} ({sum(1 for t in o['teach'] if t['circle'] == 1)} in circle 1), "
          f"reference nodes: {len(o['ref'])}, species: {len(sp)} ({len(game)} in the game, {len(sp) - len(game)} out)")
    for c in (1, 2, 3):
        cs = [s for s in game if s["circle"] == c]
        print(f"  circle {c}: {sum(1 for t in o['teach'] if t['circle'] == c)} teaching nodes, {len(cs)} species, "
              f"{sum(1 for s in cs if s['present'].get('near'))} confirmed near Dauin, "
              f"{sum(1 for s in cs if not s['present'].get('near') and (s['present']['dauin'] or s['present']['dauinNI']))} more seen there, not confirmed")
    for k, title in (("waiting", "teaching nodes in the game waiting for an identification group (keyGroup null)"),
                     ("refnames", "teaching refs resolved to another accepted name"),
                     ("renamed", "PDF names WoRMS has since changed (PDF name kept, WoRMS name in `now`)"),
                     ("typo", "likely slips in the PDF, to check against EventMeasure (PDF text kept)"),
                     ("lumped", "PDF species WoRMS treats as one (both kept)"),
                     ("pdf", "PDF section vs teaching node"), ("unplaced", "Dauin species in no teaching node"),
                     ("empty", "teaching nodes left out: no species in the game"),
                     ("pierre", "species Pierre observed, not confirmed (his observations confirm nothing alone)"),
                     ("out", "species out of the game (kept for the Fish ID Key)"),
                     ("mismatch", "WoRMS / iNaturalist name mismatches"), ("noinat", "reference nodes not on iNaturalist")):
        print(f"{title}: {len(rep[k])}")
        for x in rep[k]:
            print("  " + x)


if __name__ == "__main__":
    main()
