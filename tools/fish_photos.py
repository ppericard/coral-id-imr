#!/usr/bin/env python3
"""Writes fish-photos.json: the photos the fish quiz shows, as remote iNaturalist photos (nothing downloaded).

STOPGAP (2026-11-03): until the fish photo pipeline exists (downloaded, judged and curated photos, as for the corals,
built by another agent), the fish quiz shows iNaturalist photos straight from iNaturalist, like a coral candidate photo
waiting to be downloaded (data.json `r: 1`, app.js img()). The pipeline replaces this file; the app reads only the
photo objects below, so nothing else changes then. Varied quality on purpose (very good to bad, blue / green water) is
the pipeline's goal, not this script's: here the photos come as iNaturalist ranks them.

For each level-1 teaching entry of fish.json (every circle, winks too), the observations of its species in the game
(species without `out`), in this order (AGENTS.md rules 6a and 7):
  1. Pierre's own observations (iNaturalist user ppericard) identified to the species, even Needs ID (Pierre,
     2026-11-03: he names a species only when very sure; his only, nobody else's), whatever their licence (his photos);
  2. Research Grade observations in the Philippines with a CC0 or CC BY photo, then CC BY-NC (and the -SA variants);
     no ND licence (a crop is a derivative);
  3. when that leaves an entry short: Research Grade observations anywhere, same licence order (its species are all
     confirmed in the Philippines: fish.json keeps the others out of the game).
Within each step the species take turns in fish.json order (the PDF cheatsheet's most sighted first), so an entry's
photos spread over its species; at most PER observations per entry, one photo per observation (its first one, the one
the observer chose), since a quiz question shows one observation (AGENTS.md rule 14b).

Photo object, as data.json's: {f: 'fi<photo id>' (unique, never a file), o: observation URL, src: the original photo
URL (app.js inat() swaps the size), r: 1 (remote), a: attribution, lic, t: species name as iNaturalist has it, sp:
fish.json species id, own: true for Pierre's, loc: dauin (within 40 km) / ph / world, ar: width / height}.

Every iNaturalist reply is cached in tools/.cache/fish-photos.json (git-ignored): a rerun is offline and identical;
--refresh asks again. Usage: python3 tools/fish_photos.py [--offline | --refresh] [--per 24]
"""
import argparse
import json
import math
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_fish as bf  # noqa: E402  (its cached, paced Net)

ROOT = bf.ROOT
OUT = ROOT / "fish-photos.json"
bf.CACHE = ROOT / "tools" / ".cache" / "fish-photos.json"
V = 1
PER = 24
DAUIN = (9.19, 123.26)
LIC1, LIC2 = "cc0,cc-by", "cc-by-sa,cc-by-nc,cc-by-nc-sa"


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def obs(taxa, extra):
    """Observations of these iNaturalist taxa (and below), first 200, iNaturalist's default order."""
    url = f"{bf.INAT}observations?taxon_id={','.join(map(str, taxa))}&photos=true&per_page=200&{extra}"
    return (bf.NET.get(url) or {}).get("results", [])


def photo(o, sp, lic_ok):
    """The observation's first photo with an accepted licence, as a photo object, or None."""
    for p in o.get("photos") or []:
        lic = (p.get("license_code") or "").lower()
        if not lic_ok(lic):
            continue
        url = (p.get("url") or "").replace("/square.", "/original.")
        if "/original." not in url:
            continue
        dim = p.get("original_dimensions") or {}
        ar = round(dim["width"] / dim["height"], 3) if dim.get("width") and dim.get("height") else None
        loc = "world"
        if o.get("location"):
            la, lo = map(float, o["location"].split(","))
            loc = "dauin" if km((la, lo), DAUIN) <= 40 else "ph" if o.get("place_ids") and 6873 in o["place_ids"] else "world"
        elif 6873 in (o.get("place_ids") or []):
            loc = "ph"
        out = {"f": f"fi{p['id']}", "o": f"https://www.inaturalist.org/observations/{o['id']}", "src": url, "r": 1,
               "a": p.get("attribution") or "", "lic": lic or "c", "t": (o.get("taxon") or {}).get("name", ""), "sp": sp,
               "loc": loc}
        if (o.get("user") or {}).get("login") == bf.PIERRE:
            out["own"] = True
        if ar:
            out["ar"] = ar
        return out
    return None


def entry(node, species):
    """The photos of one teaching entry: steps in order, species taking turns, at most PER observations."""
    sp = [s for s in (species[i] for i in node.get("species", [])) if not s.get("out") and s.get("inat")]
    if not sp:
        return []
    by_taxon = {s["inat"]: s for s in sp}
    taxa = [s["inat"] for s in sp]
    steps = [
        (f"user_login={bf.PIERRE}&hrank=species&lrank=species", lambda lic: True),
        (f"quality_grade=research&place_id=6873&photo_license={LIC1}", lambda lic: lic in LIC1.split(",")),
        (f"quality_grade=research&place_id=6873&photo_license={LIC2}", lambda lic: lic in LIC2.split(",")),
        (f"quality_grade=research&photo_license={LIC1}", lambda lic: lic in LIC1.split(",")),
        (f"quality_grade=research&photo_license={LIC2}", lambda lic: lic in LIC2.split(",")),
    ]
    got, seen = [], set()
    for k, (q, ok) in enumerate(steps):
        if len(got) >= PER:
            break
        if k >= 3 and len(got) >= PER // 2:  # worldwide only for an entry left short in the Philippines
            break
        queues = {t: [] for t in taxa}
        for o in obs(taxa, q):
            t = (o.get("taxon") or {}).get("min_species_taxon_id") or (o.get("taxon") or {}).get("id")
            if t in queues and o["id"] not in seen:
                queues[t].append(o)
        while len(got) < PER and any(queues.values()):
            for t in taxa:
                if len(got) >= PER:
                    break
                while queues[t]:
                    o = queues[t].pop(0)
                    p = photo(o, by_taxon[t]["id"], ok)
                    if p:
                        seen.add(o["id"])
                        got.append(p)
                        break
    return got


def main():
    global PER
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--offline", action="store_true")
    g.add_argument("--refresh", action="store_true")
    ap.add_argument("--per", type=int, default=PER)
    a = ap.parse_args()
    PER = a.per
    bf.NET = bf.Net(offline=a.offline, refresh=a.refresh)
    F = json.loads((ROOT / "fish.json").read_text(encoding="utf-8"))
    species = {s["id"]: s for s in F["species"]}
    photos = {}
    try:
        for t in F["teach"]:
            if t.get("level") != 1:
                continue
            photos[t["id"]] = entry(t, species)
            own = sum(1 for p in photos[t["id"]] if p.get("own"))
            print(f"{t['id']} {t['name']}: {len(photos[t['id']])} photos ({own} Pierre's)")
    finally:
        bf.NET.save()
    lines = ["{", f'"v":{V},', f'"built":"{date.today().isoformat()}",', '"stopgap":"remote iNaturalist photos until the fish photo pipeline exists (tools/fish_photos.py)",', '"photos":{']
    lines.append(",\n".join(f'"{k}":{bf.dumps(v)}' for k, v in photos.items()))
    lines += ["}", "}"]
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    short = [k for k, v in photos.items() if len(v) < 6]
    if short:
        print("Fewer than 6 photos:", ", ".join(short))


if __name__ == "__main__":
    main()
