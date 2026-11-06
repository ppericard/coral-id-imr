#!/usr/bin/env python3
"""Size and depth facts for the fish species sheets (Pierre, 2026-11-06, Q6 of the fish-sheets study: Reef Life Survey
first, else FishBase, each value with its source, shown as "up to X cm").

Sources:
- Reef Life Survey, "Reef Species of the World" (reeflifesurvey.com/species/<slug>/): each species page gives "Max Size"
  and "Depth". Read once per species with a generic User-Agent, one request every PAUSE seconds, the pages cached in
  tools/.cache/rls/ (robots.txt allows /species/; 2026-11-06). The slug is the name in lower case with hyphens: the PDF
  name first, then the WoRMS-accepted name (fish.json now).
- FishBase, only where Reef Life Survey has no value: the rfishbase snapshot (huggingface.co/datasets/cboettig/fishbase,
  v25.04, the FishBase team's export, CC BY-NC), table species.parquet: Length (the maximum length, cm) with its type
  LTypeMaxM (TL, SL, FL...), DepthRangeShallow, DepthRangeDeep, SpecCode (the species page). Never its web pages. Needs
  pyarrow (as tools/fish_common.py).
Facts (a length, a depth) are cited, never copied prose.

Output: tools/fish_facts.json, one species per line, {species id: {len, lt (the length type when not total length),
lsrc ('rls' or 'fishbase'), dep [shallow or null when the source gives none, deep] (m), dsrc, rls (the slug), fb (FishBase SpecCode)}}. tools/build_fish.py
builds it into fish.json species (size: {len, lt, src}, depth: {m, src}); the species sheet shows them.

    python3 tools/fish_facts.py --rls                 fetch (or read from the cache) the Reef Life Survey pages
    python3 tools/fish_facts.py --fishbase DIR        fill the gaps from DIR/species.parquet
Tests: node --test tests/fishsheets.test.js (the file's shape, built into fish.json).
"""
import argparse
import html
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FISH = ROOT / "fish.json"
OUT = ROOT / "tools" / "fish_facts.json"
CACHE = ROOT / "tools" / ".cache" / "rls"
UA = {"User-Agent": "coral-id-imr/1.0"}
PAUSE = 1.2
RLS = "https://reeflifesurvey.com/species/{}/"


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def get(url, path):
    """The page at url, cached at path; None when the site has no such page (404)."""
    if path.exists():
        t = path.read_text(encoding="utf-8", errors="replace")
        return t or None
    time.sleep(PAUSE)
    for tries in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                t = r.read().decode("utf-8", "replace")
            break
        except urllib.error.HTTPError as e:
            if e.code == 404:
                t = ""
                break
            time.sleep(5 * (tries + 1))
        except Exception:
            time.sleep(5 * (tries + 1))
    else:
        return None
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(t, encoding="utf-8")
    return t or None


def parse_rls(page):
    """(max size in cm, [shallow, deep] in m) from a Reef Life Survey species page; None for what it does not give."""
    t = html.unescape(re.sub(r"<[^>]+>", "\n", re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S)))
    t = "\n".join(x.strip() for x in t.split("\n") if x.strip())
    m = re.search(r"Max Size:\s*([\d.]+)\s*cm", t)
    d = re.search(r"Depth:\s*([\d.]+)\s*-\s*([\d.]+)\s*m", t)
    num = lambda x: int(float(x)) if float(x).is_integer() else float(x)
    return (num(m.group(1)) if m else None), ([num(d.group(1)), num(d.group(2))] if d else None)


def load():
    return json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}


def dump(o):
    keys = sorted(o)
    lines = ["{"] + [f"  {json.dumps(k)}: {json.dumps(o[k], ensure_ascii=False)}" + ("," if i < len(keys) - 1 else "") for i, k in enumerate(keys)] + ["}", ""]
    OUT.write_text("\n".join(lines), encoding="utf-8")


def species():
    f = json.loads(FISH.read_text(encoding="utf-8"))
    return [s for s in f["species"] if s.get("family")]


def run_rls():
    o = load()
    for s in species():
        r = o.get(s["id"], {})
        for name in [s["name"]] + ([s["now"]] if s.get("now") and s["now"] != s["name"] else []):
            sl = slug(name)
            page = get(RLS.format(sl), CACHE / (sl + ".html"))
            if not page:
                continue
            ln, dep = parse_rls(page)
            if ln is None and dep is None:
                continue
            r["rls"] = sl
            if ln is not None:
                r.update(len=ln, lsrc="rls")
                r.pop("lt", None)
            if dep is not None:
                r.update(dep=dep, dsrc="rls")
            break
        if r:
            o[s["id"]] = r
    dump(o)
    print(f"Reef Life Survey: {sum(1 for x in o.values() if x.get('lsrc') == 'rls')} sizes, {sum(1 for x in o.values() if x.get('dsrc') == 'rls')} depths")


def run_fishbase(d):
    import pyarrow.parquet as pq

    t = pq.read_table(Path(d) / "species.parquet", columns=["SpecCode", "Genus", "Species", "Length", "LTypeMaxM", "DepthRangeShallow", "DepthRangeDeep"]).to_pylist()
    by = {f"{r['Genus']} {r['Species']}": r for r in t}
    o = load()
    for s in species():
        row = by.get(s["name"]) or (by.get(s["now"]) if s.get("now") else None)
        if not row:
            continue
        r = o.get(s["id"], {})
        r["fb"] = row["SpecCode"]
        if r.get("lsrc") != "rls" and row.get("Length"):
            r.update(len=round(float(row["Length"]), 1) if not float(row["Length"]).is_integer() else int(row["Length"]), lsrc="fishbase")
            lt = (row.get("LTypeMaxM") or "").strip()
            if lt and lt != "TL":
                r["lt"] = lt
            else:
                r.pop("lt", None)
        sh, dp = row.get("DepthRangeShallow"), row.get("DepthRangeDeep")
        if r.get("dsrc") != "rls" and dp is not None:
            r.update(dep=[None if sh is None else int(sh), int(dp)], dsrc="fishbase")  # no shallow limit given: None, never 0 (Codex review #696)
        o[s["id"]] = r
    dump(o)
    print(f"FishBase: {sum(1 for x in o.values() if x.get('lsrc') == 'fishbase')} sizes, {sum(1 for x in o.values() if x.get('dsrc') == 'fishbase')} depths")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--rls", action="store_true")
    ap.add_argument("--fishbase", metavar="DIR")
    a = ap.parse_args()
    if not a.rls and not a.fishbase:
        ap.error("--rls or --fishbase DIR")
    if a.rls:
        run_rls()
    if a.fishbase:
        run_fishbase(a.fishbase)


if __name__ == "__main__":
    sys.exit(main())
