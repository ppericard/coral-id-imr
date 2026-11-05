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
  2. Research Grade observations in the Philippines with a CC0 or CC BY photo, then CC BY-NC; never a share-alike
     licence nor an ND one (Pierre's rules, 2026-11-03; a crop is a derivative);
  3. when that leaves an entry short: Research Grade observations anywhere, same licence order (its species are all
     confirmed in the Philippines: fish.json keeps the others out of the game).
Within each step the species take turns in fish.json order (the PDF cheatsheet's most sighted first), so an entry's
photos spread over its species; at most PER observations per entry, one photo per observation (its first one, the one
the observer chose), since a quiz question shows one observation (AGENTS.md rule 14b).

Photo object, as data.json's: {f: 'fi<photo id>' (unique, never a file), o: observation URL, src: the original photo
URL (app.js inat() swaps the size), r: 1 (remote), a: attribution, lic, t: species name as iNaturalist has it, sp:
fish.json species id, own: true for Pierre's, loc: dauin (within 40 km) / ph / world, ar: width / height, e / jt: the
judged ease 1-5 and tags (tools/fish_judge.py, judging/FISH.md)}.

Sheet-only photos ("sheet": {species id: [photo]}, Pierre, 2026-11-05). A few circle-1 species have no photo the rules
above accept (Research Grade or Pierre's own; CC0 / CC BY / CC BY-NC; the Philippines or the Indo-West Pacific), so no
game photo and no candidate. They keep a photo for their sheet only, never in the quiz or any game (Pierre: "no exception
to the rules for the game"): for each species of SHEET, its iNaturalist cover photo (the taxon's default photo) when its
licence is CC0, CC BY or CC BY-NC; otherwise another photo of the species with such a licence, taken anywhere, Research
Grade or not: first the taxon's other photos (those iNaturalist shows on the taxon page, in its order), then the
observations, Research Grade first; none, and the species stays without a photo. Each such photo object carries
use: 'ref' (the corals' word for "sheet only", curation.json use), which every game draw honours (core.js fishGen keeps
it out of the game photos wherever it is), plus from (cover / taxon / obs), qg (the observation's quality grade) and iwp
(false for a photo taken outside the Indo-West Pacific box of tools/fetch_fish.py), and note when iNaturalist files it
under another species of fish.json (a species it lumps: Pomacentrus armillatus under P. opisthostigma). Two batched
requests for every species of SHEET (the taxa, then their observations with an accepted licence).

Every iNaturalist reply is cached in tools/.cache/fish-photos.json (git-ignored): a rerun is offline and identical;
--refresh asks again. Usage: python3 tools/fish_photos.py [--offline | --refresh] [--per 24] [--sheet]
(--sheet: only the sheet-only photos, the game photos kept as they are.)
"""
import argparse
import json
import math
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_fish as bf  # noqa: E402  (its cached, paced Net)
import fish_judge  # noqa: E402  (the judged ease of each photo)
from fetch_fish import in_iwp  # noqa: E402  (the Indo-West Pacific box of the fish candidates)

ROOT = bf.ROOT
OUT = ROOT / "fish-photos.json"
bf.CACHE = ROOT / "tools" / ".cache" / "fish-photos.json"
V = 1
PER = 24
DAUIN = (9.19, 123.26)
# Pierre's licence rules (2026-11-03, the fish photo lists): never share-alike, never ND (a crop is a derivative).
LIC1, LIC2 = "cc0,cc-by", "cc-by-nc"
# The species that keep a sheet-only photo (Pierre, 2026-11-05; see the top): fish.json species ids. Chromis agilis
# (iNaturalist: Pycnochromis agilis), Siganus margaritiferus, Pomacentrus armillatus (filed under P. opisthostigma),
# Halichoeres chlorocephalus, H. marginatus. Add an id to give another species one.
SHEET = ["s088", "s061", "s105", "s238", "s244"]


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def obs(taxa, extra):
    """Observations of these iNaturalist taxa (and below), first 200, iNaturalist's default order."""
    url = f"{bf.INAT}observations?taxon_id={','.join(map(str, taxa))}&photos=true&per_page=200&{extra}"
    return (bf.NET.get(url) or {}).get("results", [])


def where(o):
    """An observation's place: dauin (within 40 km), ph (the Philippines) or world."""
    if o.get("location"):
        la, lo = map(float, o["location"].split(","))
        return "dauin" if km((la, lo), DAUIN) <= 40 else "ph" if o.get("place_ids") and 6873 in o["place_ids"] else "world"
    return "ph" if 6873 in (o.get("place_ids") or []) else "world"


def ratio(p):
    dim = p.get("original_dimensions") or {}
    return round(dim["width"] / dim["height"], 3) if dim.get("width") and dim.get("height") else None


def photo(o, sp, lic_ok):
    """The observation's first photo with an accepted licence, as a photo object, or None."""
    for p in o.get("photos") or []:
        lic = (p.get("license_code") or "").lower()
        if not lic_ok(lic):
            continue
        url = (p.get("url") or "").replace("/square.", "/original.")
        if "/original." not in url:
            continue
        ar = ratio(p)
        loc = where(o)
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


SHEET_LIC = set(LIC1.split(",") + LIC2.split(","))


def sheet_pick(taxon, observations):
    """The sheet-only photo of one species (see the top): (iNaturalist photo, its observation or None, from), or None.
    taxon: the iNaturalist taxon (default_photo, taxon_photos); observations: its observations with an accepted licence."""
    ok = lambda p: bool(p) and (p.get("license_code") or "").lower() in SHEET_LIC and "/square." in (p.get("url") or "")  # noqa: E731
    held = {p["id"]: o for o in observations for p in o.get("photos") or []}
    if ok(taxon.get("default_photo")):
        return taxon["default_photo"], held.get(taxon["default_photo"]["id"]), "cover"
    for tp in taxon.get("taxon_photos") or []:
        if ok(tp.get("photo")):
            return tp["photo"], held.get(tp["photo"]["id"]), "taxon"
    for o in sorted(observations, key=lambda o: o.get("quality_grade") != "research"):  # Research Grade first, then as given
        for p in o.get("photos") or []:
            if ok(p):
                return p, o, "obs"
    return None


def sheet_photo(s, taxon, observations, names):
    """The sheet-only photo object of fish.json species s, or None (no photo with an accepted licence)."""
    got = sheet_pick(taxon, observations)
    if not got:
        return None
    p, o, src = got
    lic = p["license_code"].lower()
    t = ((o or {}).get("taxon") or {}).get("name") or taxon.get("name", "")
    out = {"f": f"fi{p['id']}", "o": f"https://www.inaturalist.org/observations/{o['id']}" if o else f"https://www.inaturalist.org/photos/{p['id']}",
           "src": p["url"].replace("/square.", "/original."), "r": 1, "a": p.get("attribution") or "", "lic": lic, "t": t, "sp": s["id"],
           "use": "ref", "from": src}
    if o:
        out["loc"] = where(o)
        out["qg"] = o.get("quality_grade") or ""
        if o.get("location") and not in_iwp(tuple(map(float, o["location"].split(",")))):
            out["iwp"] = False
        if (o.get("user") or {}).get("login") == bf.PIERRE:
            out["own"] = True
    if ratio(p):
        out["ar"] = ratio(p)
    # iNaturalist files the photo under another species of fish.json (one it lumps with this one; AGENTS.md rule 6a:
    # the name shown stays the PDF's): say so beside the credit.
    if t != s["name"] and t in names:
        out["note"] = f"Filed under {t} on iNaturalist, which lumps the two species" + (" (as WoRMS does)" if s.get("now") == t else "") + "."
    return out


def sheet(F):
    """The sheet-only photos of the species of SHEET: {species id: [photo]}, in SHEET order; two batched requests."""
    sp = {s["id"]: s for s in F["species"]}
    want = [sp[i] for i in SHEET if i in sp and sp[i].get("inat")]
    taxa = sorted({s["inat"] for s in want})
    if not taxa:
        return {}
    T = {t["id"]: t for t in (bf.NET.get(f"{bf.INAT}taxa/{','.join(map(str, taxa))}") or {}).get("results", [])}
    O = obs(taxa, f"photo_license={LIC1},{LIC2}")
    names = {s["name"] for s in F["species"]}
    out = {}
    for s in want:
        mine = [o for o in O if ((o.get("taxon") or {}).get("min_species_taxon_id") or (o.get("taxon") or {}).get("id")) == s["inat"]]
        p = sheet_photo(s, T.get(s["inat"]) or {}, mine, names)
        if p:
            out[s["id"]] = [p]
        print(f"sheet only {s['id']} {s['name']}: " + (f"{p['f']} ({p['from']}, {p['lic']}, {p.get('qg') or '?'}) {p['a']}" if p else "no photo with an accepted licence"))
    return out


def main():
    global PER
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--offline", action="store_true")
    g.add_argument("--refresh", action="store_true")
    ap.add_argument("--per", type=int, default=PER)
    ap.add_argument("--sheet", action="store_true", help="only the sheet-only photos; the game photos kept as they are")
    a = ap.parse_args()
    PER = a.per
    bf.NET = bf.Net(offline=a.offline, refresh=a.refresh)
    F = json.loads((ROOT / "fish.json").read_text(encoding="utf-8"))
    if a.sheet:
        doc = json.loads(OUT.read_text(encoding="utf-8"))
        try:
            doc["sheet"] = sheet(F)
        finally:
            bf.NET.save()
        fish_judge.write(doc)
        return
    species = {s["id"]: s for s in F["species"]}
    photos = {}
    try:
        for t in F["teach"]:
            if t.get("level") != 1:
                continue
            photos[t["id"]] = entry(t, species)
            own = sum(1 for p in photos[t["id"]] if p.get("own"))
            print(f"{t['id']} {t['name']}: {len(photos[t['id']])} photos ({own} Pierre's)")
        sheet_only = sheet(F)
    finally:
        bf.NET.save()
    # The judged ease of each photo (judging/FISH.md; tools/fish_judge.json), kept through a rebuild.
    print(f"judged photos: {fish_judge.apply(photos, F)}")
    fish_judge.write({"v": V, "built": date.today().isoformat(),
                      "stopgap": "remote iNaturalist photos until the fish photo pipeline exists (tools/fish_photos.py)",
                      "photos": photos, "sheet": sheet_only})
    short = [k for k, v in photos.items() if len(v) < 6]
    if short:
        print("Fewer than 6 photos:", ", ".join(short))


if __name__ == "__main__":
    main()
