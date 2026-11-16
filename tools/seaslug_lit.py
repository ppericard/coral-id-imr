#!/usr/bin/env python3
"""The sea-slug literature watch: compares the subject's species list (tools/seaslugs.json) with WoRMS today and lists
what needs a look (docs/reviews/2026-11-17-seaslug-literature-scan.md). Pierre, 2026-11-17: "C'est là où ça vaut le coup
d'explorer la littérature scientifique parce que régulièrement ils séquencent des nudibranches et identifient des
espèces." It changes no game data: it writes tools/seaslug_lit.json, read by people (the integrator applies a change in
a PR of its own; a discrepancy between sources goes to points.json, rule C5).

Inputs: tools/seaslugs.json (the species, their genus, family and WoRMS AphiaID) and tools/seaslug_lit_source.json
(hand-kept: the year from which a species counts as new, the genera watched beyond the list, the informal labels, the
labels and old names a paper has since named).

Two stages:
  fetch (network, every reply cached in tools/.cache/seaslug_lit.json, git-ignored; a rerun is offline):
    - WoRMS REST (0.3 s between requests, tools/inat.py): our species' records (AphiaRecordsByAphiaIDs, 50 a request)
      and their sources (AphiaSourcesByAphiaID, one each); the genus record of every genus of the list and of the
      source's extraGenera (AphiaRecordsByNames, 50 a request); every child of those genera (AphiaChildrenByAphiaID,
      50 a page; a subgenus is opened too); the original description of each species whose authority year is `since`
      or later (AphiaSourcesByAphiaID); the records of the `named` names (AphiaRecordsByNames).
    - iNaturalist (tools/inat.py, rule C7: 1 s between requests, the project's User-Agent, paced retries): the species
      of the subject's roots (tools/seaslug_source.json) observed in the Philippines, Research Grade and verifiable,
      and Research Grade within the instance centre's radius (observations/species_counts on the five roots together,
      500 a page); then the distinct observers of the new and named species only (observations/observers, one each,
      only when the count can reach the threshold).
  derive (offline, pure): from those replies and the species list they were pulled against (`raw.list`: name, family,
    genus) to the `look` lists (`derive`); `--check` reruns it on the committed file and fails when the file disagrees
    (CI has no cache); a later change to tools/seaslugs.json is reported, never a failure, and `--derive` follows it.

The `look` lists:
  rename     a species of ours that WoRMS no longer accepts under our name (status, the accepted name);
  placement  a species whose WoRMS family or genus is not the one in our list;
  genus      a genus of ours that WoRMS no longer accepts;
  add        a species described in `since` or later, in a watched genus, not in our list, and confirmed in the
             Philippines by rule C8 (tools/presence.py; no sea-slug checklist exists, so 3 observers in the Philippines
             or 2 near the centre);
  watch      the same, observed in the Philippines (Research Grade or Needs ID) but not confirmed;
  inList     the same, already in our list;
  revised    a species of ours whose WoRMS sources cite a paper of `since` or later (other than its original
             description, WoRMS's regional context lists, and the source's ignoreSources): a revision, a
             redescription or a record to read;
  named      each `named` entry of the source: its WoRMS status, whether we hold it, its presence;
  unnamed    the source's informal labels that no `named` entry names yet (the label before " (" is matched).
New species with no observation in the Philippines are only counted (`counts.elsewhere`).

Usage: python3 tools/seaslug_lit.py [--offline | --refresh] [--dry]
       python3 tools/seaslug_lit.py --derive   (rewrite the look lists from the committed replies, offline)
       python3 tools/seaslug_lit.py --check    (derive again from tools/seaslug_lit.json, offline; exit 1 on a difference)
Tests: node --test tests/seaslug-lit.test.js.
"""
import argparse
import datetime
import json
import re
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import inat  # noqa: E402  (the one paced, retried client; rule C7)
from presence import NEAR_AREA, NEAR_OBSERVERS, PH_OBSERVERS, near_dauin, ph_confirmed  # noqa: E402  (rule C8, once)

SRC = ROOT / "tools" / "seaslug_lit_source.json"
LIST = ROOT / "tools" / "seaslugs.json"
LIST_SRC = ROOT / "tools" / "seaslug_source.json"
OUT = ROOT / "tools" / "seaslug_lit.json"
CACHE = ROOT / "tools" / ".cache" / "seaslug_lit.json"
WORMS = "https://www.marinespecies.org/rest/"
OBS = inat.V1 + "observations"
PLACE = 6873  # the Philippines (the subject's area, tools/seaslug_source.json)
SKIP_USES = {"context source (CoRMS)"}  # WoRMS's regional context lists, not a paper on the species
V = 1


def today():
    return datetime.date.today().isoformat()


# ---------------------------------------------------------------- network, cached


class Net:
    """GET with a cache ({url: reply}); offline: a reply not cached stops the run."""

    def __init__(self, offline=False, refresh=False, get=None):
        self.offline, self.refresh, self.asked, self.new = offline, refresh, set(), 0
        self._get = get or (lambda url: inat.get(url, missing=True))
        self.c = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() and get is None else {}

    def get(self, url):
        if url in self.c and not (self.refresh and url not in self.asked):
            return self.c[url]
        if self.offline:
            sys.exit(f"--offline: not cached: {url}")
        self.c[url] = self._get(url)
        self.asked.add(url)
        self.new += 1
        if self.new % 50 == 0:
            self.save()
        return self.c[url]

    def save(self):
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        tmp = CACHE.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.c, sort_keys=True, separators=(",", ":")), encoding="utf-8")
        tmp.replace(CACHE)


# ---------------------------------------------------------------- WoRMS


def year(authority):
    """The year of an authority ("(Gosliner & Behrens, 2018)" -> 2018); None without one."""
    m = re.findall(r"\b(1[6-9]\d\d|20\d\d)\b", authority or "")
    return int(m[-1]) if m else None


def slim(r):
    """The fields of a WoRMS record the watch keeps."""
    return {"aphia": r["AphiaID"], "name": r.get("scientificname"), "authority": r.get("authority"),
            "status": r.get("status"), "valid": r.get("valid_name"), "validAphia": r.get("valid_AphiaID"),
            "rank": r.get("rank"), "family": r.get("family"), "genus": r.get("genus")}


def records_by_ids(net, ids):
    """{aphia: slim record} (AphiaRecordsByAphiaIDs, 50 a request)."""
    out = {}
    for B in inat.chunks(sorted(set(ids)), 50):
        q = "&".join(f"aphiaids[]={i}" for i in B)
        for r in net.get(f"{WORMS}AphiaRecordsByAphiaIDs?{q}") or []:
            if r:
                out[r["AphiaID"]] = slim(r)
    return out


def records_by_names(net, names, rank):
    """{name: slim record}: the exact gastropod record of each name at `rank`, the accepted one first."""
    out = {}
    for B in inat.chunks(sorted(set(names)), 50):
        q = "&".join("scientificnames[]=" + urllib.parse.quote(n) for n in B)
        d = net.get(f"{WORMS}AphiaRecordsByNames?{q}&like=false&marine_only=false") or []
        for n, recs in zip(B, d):
            recs = [r for r in (recs or []) if r.get("rank") == rank and r.get("class") == "Gastropoda"]
            r = next((r for r in recs if r.get("status") == "accepted"), recs[0] if recs else None)
            if r:
                out[n] = slim(r)
    return out


def children(net, aphia):
    """Every species-rank child of a genus (a subgenus is opened too), 50 a page."""
    out, off = [], 1
    while True:
        d = net.get(f"{WORMS}AphiaChildrenByAphiaID/{aphia}?marine_only=false&offset={off}") or []
        for r in d:
            if r.get("rank") == "Subgenus":
                out += children(net, r["AphiaID"])
            elif r.get("rank") == "Species":
                out.append(slim(r))
        if len(d) < 50:
            return out
        off += 50


def sources(net, aphia):
    """[[year, use, reference, doi]] of a record's WoRMS sources (AphiaSourcesByAphiaID)."""
    out = []
    for s in net.get(f"{WORMS}AphiaSourcesByAphiaID/{aphia}") or []:
        ref = (s.get("reference") or "").strip()
        m = re.search(r"\((1[6-9]\d\d|20\d\d)[a-z]?\)", ref)
        out.append([int(m.group(1)) if m else year(ref[:100]), s.get("use"), ref, s.get("doi")])
    return out


# ---------------------------------------------------------------- iNaturalist


def inat_species(net, roots, where):
    """{species name: {"id", "n"}}: the species under the roots with observations matching `where` (species_counts, 500
    a page; a subspecies row counts for its species, and gives the species' id when no species row comes)."""
    out, page = {}, 1
    while True:
        d = net.get(f"{OBS}/species_counts?taxon_id={roots}&{where}&per_page=500&page={page}") or {}
        res = d.get("results") or []
        for x in res:
            t = x["taxon"]
            if t.get("rank") not in ("species", "subspecies", "variety", "form"):
                continue
            name = " ".join(t["name"].split()[:2])
            row = out.setdefault(name, {"id": None, "n": 0})
            row["n"] += x["count"]
            if t.get("rank") == "species":
                row["id"] = t["id"]
            elif row["id"] is None:  # only subspecies rows so far: their parent is the species (Codex review #1031)
                anc = t.get("ancestor_ids") or []
                row["id"] = t.get("parent_id") or (anc[-2] if len(anc) > 1 and anc[-1] == t["id"] else None)
        if page * 500 >= (d.get("total_results") or 0) or not res:
            return out
        page += 1


def observers(net, taxon, where):
    return (net.get(f"{OBS}/observers?taxon_id={taxon}&{where}&per_page=1") or {}).get("total_results", 0)


def inat_rows(net, roots, names):
    """{name: {"rg", "ver", "near", "obsPh", "obsNear", "id"}} for each name observed in the Philippines; the observers
    are asked only when the count can reach rule C8's thresholds."""
    rg = inat_species(net, roots, f"place_id={PLACE}&quality_grade=research")
    ver = inat_species(net, roots, f"place_id={PLACE}&verifiable=true")
    nr = inat_species(net, roots, f"{NEAR_AREA}&quality_grade=research")
    out = {}
    for n in sorted(set(names)):
        if n not in ver and n not in rg:
            continue
        a, v, b = rg.get(n, {}), ver.get(n, {}), nr.get(n, {})
        tid = a.get("id") or v.get("id")
        row = {"id": tid, "rg": a.get("n", 0), "ver": v.get("n", 0), "near": b.get("n", 0), "obsPh": None, "obsNear": None}
        if tid and row["near"] >= NEAR_OBSERVERS:
            row["obsNear"] = observers(net, tid, f"quality_grade=research&{NEAR_AREA}")
        if tid and row["rg"] >= PH_OBSERVERS:
            row["obsPh"] = observers(net, tid, f"quality_grade=research&place_id={PLACE}")
        out[n] = row
    return out


# ---------------------------------------------------------------- fetch


def fetch(net, ours, src, roots, log=print):
    since = src["since"]
    log(f"WoRMS: {len(ours)} species of ours")
    recs = records_by_ids(net, [s["worms"]["aphia"] for s in ours if s.get("worms")])
    mine = {}
    for s in ours:
        a = (s.get("worms") or {}).get("aphia")
        r = dict(recs.get(a) or {}) if a else {}
        if r:
            r["sources"] = [x for x in sources(net, a) if (x[0] or 0) >= since and x[1] != "original description"]
        mine[s["name"]] = r or None
    gnames = sorted({s["genus"] for s in ours} | set(src.get("extraGenera") or {}))
    log(f"WoRMS: {len(gnames)} genera")
    G = records_by_names(net, gnames, "Genus")
    genera, kids = {}, []
    for g in gnames:
        r = G.get(g)
        if not r:
            genera[g] = None
            continue
        ch = children(net, r["aphia"])
        genera[g] = {**r, "species": sum(1 for c in ch if c["status"] == "accepted")}
        kids += [{**c, "searched": g} for c in ch]
    alt = {}
    for c in kids:
        if c["status"] != "accepted" and c.get("validAphia"):
            alt.setdefault(c["validAphia"], set()).add(c["name"])
    new = {}
    for c in kids:
        y = year(c["authority"])
        if c["status"] == "accepted" and y and y >= since and c["aphia"] not in new:
            src_desc = [x for x in sources(net, c["aphia"]) if x[1] == "original description"]
            new[c["aphia"]] = {**c, "year": y, "alt": sorted(alt.get(c["aphia"], set()) - {c["name"]}),
                               "description": src_desc[0][2:] if src_desc else None}
    named = records_by_names(net, [x["name"] for x in src.get("named") or []], "Species")
    log(f"WoRMS: {len(new)} species since {since}; iNaturalist next")
    want = [n for c in new.values() for n in [c["name"], *c["alt"]]] + [x["name"] for x in src.get("named") or []]
    want += [r["valid"] for r in named.values() if r.get("valid")]
    ins = inat_rows(net, ",".join(str(r) for r in roots), want)
    return {"since": since, "ours": mine, "genera": genera, "new": sorted(new.values(), key=lambda c: (c["searched"], c["name"])),
            "named": named, "inat": ins}


# ---------------------------------------------------------------- derive (offline, pure)


def presence(row):
    """Rule C8's reasons (tools/presence.py) for an iNaturalist row (no sea-slug checklist exists)."""
    if not row:
        return []
    return ph_confirmed(row["rg"], row["obsPh"], False, near_dauin(row["obsNear"] or 0))


def seen(raw, names):
    """The first of names observed in the Philippines, and its row."""
    for n in names:
        if n in raw["inat"]:
            return n, raw["inat"][n]
    return None, None


def derive(raw, ours, src):
    """The look lists, from the replies kept in raw and the current species list."""
    names = {s["name"] for s in ours}
    ignore = [x["ref"] for x in src.get("ignoreSources") or []]
    look = {k: [] for k in ("rename", "placement", "genus", "add", "watch", "inList", "revised", "named")}
    for s in ours:
        r = raw["ours"].get(s["name"])
        if r is None:
            look["rename"].append({"name": s["name"], "status": "not pulled", "valid": None})
            continue
        if r["status"] != "accepted" or r["valid"] != s["name"]:
            look["rename"].append({"name": s["name"], "status": r["status"], "valid": r["valid"]})
        if r["family"] != s["family"] or (r["genus"] and r["genus"] != s["genus"]):
            look["placement"].append({"name": s["name"], "ours": [s["family"], s["genus"]], "worms": [r["family"], r["genus"]]})
        papers = [x[2] for x in r.get("sources") or [] if not any(x[2].startswith(p) for p in ignore) and x[1] not in SKIP_USES]
        if papers:
            look["revised"].append({"name": s["name"], "papers": papers})
    for g, r in sorted(raw["genera"].items()):
        if r is None or r["status"] != "accepted":
            look["genus"].append({"genus": g, "status": r and r["status"], "valid": r and r["valid"]})
    elsewhere = 0
    for c in raw["new"]:
        held = [n for n in [c["name"], *c["alt"]] if n in names]
        hit, row = seen(raw, [c["name"], *c["alt"]])
        e = {"name": c["name"], "authority": c["authority"], "genus": c["searched"],
             "description": c["description"][0] if c["description"] else None}
        if row:
            e.update(inat=hit, rg=row["rg"], ver=row["ver"], observers=row["obsPh"], by=presence(row))
        if held:
            look["inList"].append({**e, "as": held[0]})
        elif row and e["by"]:
            look["add"].append(e)
        elif row:
            look["watch"].append(e)
        else:
            elsewhere += 1
    alts = {c["name"]: c["alt"] for c in raw["new"]}
    for x in src.get("named") or []:
        r = raw["named"].get(x["name"])
        cur = (r or {}).get("valid") or x["name"]
        hit, row = seen(raw, [cur, x["name"], *alts.get(cur, [])])
        look["named"].append({"label": x["label"], "name": x["name"], "worms": r and r["status"], "valid": r and r["valid"],
                              "held": cur in names or x["name"] in names, "rg": row and row["rg"], "ver": row and row["ver"],
                              "by": presence(row)})
    done = {x["label"].split(" (")[0] for x in src.get("named") or []}
    look["unnamed"] = [x for x in src.get("labels") or [] if x["label"] not in done]
    for k in ("add", "watch"):
        look[k].sort(key=lambda e: (-len(e["by"]), -(e["observers"] or 0), -e["rg"], -e["ver"], e["name"]))
    counts = {"species": len(ours), "genera": len(raw["genera"]), "new": len(raw["new"]), "elsewhere": elsewhere,
              **{k: len(v) for k, v in look.items()}}
    return {"counts": counts, "look": look}


# ---------------------------------------------------------------- output


def dump(raw, d, pulled):
    """Deterministic: one record per line."""
    head = {"_doc": "Built by tools/seaslug_lit.py (its doc says how) from tools/seaslugs.json, "
                    "tools/seaslug_lit_source.json, WoRMS and iNaturalist; the reading: "
                    "docs/reviews/2026-11-17-seaslug-literature-scan.md. Not read by the app.",
            "v": V, "pulled": pulled, "since": raw["since"], "counts": d["counts"]}
    lines = ["{"] + [f" {json.dumps(k)}: {json.dumps(v, ensure_ascii=False, sort_keys=True)}," for k, v in head.items()]

    lines.append(' "look": {')
    keys = list(d["look"])
    for i, k in enumerate(keys):
        rows = d["look"][k]
        lines.append(f'  {json.dumps(k)}: [' + ("]" + ("," if i < len(keys) - 1 else "") if not rows else ""))
        if rows:
            lines += [f"   {json.dumps(r, ensure_ascii=False, sort_keys=True)}" + ("," if j < len(rows) - 1 else "") for j, r in enumerate(rows)]
            lines.append("  ]" + ("," if i < len(keys) - 1 else ""))
    lines.append(" },")
    lines.append(' "raw": {')
    lines.append(f'  "since": {raw["since"]},')
    lines.append(f'  "list": {json.dumps(raw["list"], ensure_ascii=False)},')
    for key in ("ours", "genera", "named", "inat"):
        lines.append(f'  {json.dumps(key)}: {{')
        items = sorted(raw[key].items())
        lines += [f"   {json.dumps(k)}: {json.dumps(v, ensure_ascii=False, sort_keys=True)}" + ("," if j < len(items) - 1 else "")
                  for j, (k, v) in enumerate(items)]
        lines.append("  },")
    lines.append('  "new": [')
    lines += [f"   {json.dumps(c, ensure_ascii=False, sort_keys=True)}" + ("," if j < len(raw["new"]) - 1 else "")
              for j, c in enumerate(raw["new"])]
    lines.append("  ]")
    lines.append(" }")
    lines.append("}")
    return "\n".join(lines) + "\n"


def load_list():
    return json.loads(LIST.read_text(encoding="utf-8"))["species"]


def snapshot(species):
    """[[name, family, genus]]: the species list the look lists were derived against, kept in raw so that a change to
    tools/seaslugs.json never fails --check (it is reported, and --derive follows it)."""
    return [[s["name"], s["family"], s["genus"]] for s in species]


def unsnap(rows):
    return [{"name": n, "family": f, "genus": g} for n, f, g in rows]


def check(src):
    d = json.loads(OUT.read_text(encoding="utf-8"))
    again = derive(d["raw"], unsnap(d["raw"]["list"]), src)
    if again["look"] != d["look"] or again["counts"] != d["counts"]:
        bad = [k for k in again["look"] if again["look"][k] != d["look"].get(k)]
        print(f"tools/seaslug_lit.json is not what the derive stage gives ({bad or 'counts'}): "
              "run python3 tools/seaslug_lit.py --derive")
        return 1
    c = d["counts"]
    print(f"tools/seaslug_lit.json derives as written: {c['species']} species, {c['genera']} genera, {c['new']} new since "
          f"{d['since']} (add {c['add']}, watch {c['watch']}, in list {c['inList']}), rename {c['rename']}, "
          f"revised {c['revised']}")
    if snapshot(load_list()) != d["raw"]["list"]:
        print("note: tools/seaslugs.json has changed since; python3 tools/seaslug_lit.py --derive follows it offline "
              "(a new genus needs a network run)")
    return 0


def main():
    a = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    a.add_argument("--offline", action="store_true")
    a.add_argument("--refresh", action="store_true")
    a.add_argument("--dry", action="store_true")
    a.add_argument("--derive", action="store_true")
    a.add_argument("--check", action="store_true")
    o = a.parse_args()
    src = json.loads(SRC.read_text(encoding="utf-8"))
    if o.check:
        sys.exit(check(src))
    if o.derive:
        d = json.loads(OUT.read_text(encoding="utf-8"))
        raw, pulled = d["raw"], d["pulled"]
    else:
        roots = json.loads(LIST_SRC.read_text(encoding="utf-8"))["roots"].values()
        net = Net(offline=o.offline, refresh=o.refresh)
        try:
            raw = fetch(net, load_list(), src, roots)
        finally:
            net.save()
        raw = json.loads(json.dumps(raw))  # the keys as the file writes them (AphiaIDs as strings)
        pulled = today()
        print(f"requests: {dict(inat.calls)}")
    raw["list"] = snapshot(load_list())
    d = derive(raw, unsnap(raw["list"]), src)
    for k, v in d["look"].items():
        print(f"{k}: {len(v)}")
    if not o.dry:
        OUT.write_text(dump(raw, d, pulled), encoding="utf-8")
        print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
