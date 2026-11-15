#!/usr/bin/env python3
"""Writes fish-photos.json "sheet": the sheet-only fish photos, found on iNaturalist and FishBase.

The stopgap list this script wrote under "photos" until 2026-11-15 (remote iNaturalist photos the fish quiz showed
straight from iNaturalist, from 2026-11-03, while the curated photos on R2 did not exist yet) is retired (Pierre,
2026-11-15): every fish photo in play is on R2 (fish-game.json, tools/fish_game.py), and fish-photos.json "photos" now
holds a few of those records per entry, written by tools/fish_game.py (first_photos). This script writes "sheet" only.

Sheet-only photos ("sheet": {species id: [photo]}, Pierre, 2026-11-05). A few circle-1 species have no game photo and
no candidate, because iNaturalist files their photos under another species (Pomacentrus armillatus: iNaturalist and
WoRMS lump it with P. opisthostigma). They keep a photo for their sheet only, never in the quiz or any game. A sheet
photo passes every game photo rule all the same (Pierre, 2026-11-05: "if they don't pass the game rules, we don't keep
them"): licence CC0, CC BY or CC BY-NC (Pierre's own: any), Research Grade or Pierre's own identified to the species,
taken in the Indo-West Pacific box of tools/fetch_fish.py (the Philippines are inside it), never captive, never
annotated Dead. For each species of SHEET, in this order: its iNaturalist cover (the taxon's default photo), the taxon's
other photos (those iNaturalist shows on the taxon page, in its order), then its observations in iNaturalist's order
(Pierre's own with no priority since 2026-11-06), each
taken only when it passes those rules on the observation that holds it (a photo with no observation found is not
taken); then FishBase (tools/fetch_fishbase.py, the same rules: underwater, CC BY-NC as FishBase states it, the box),
its main picture first (from: fishbase, via: fishbase); none, and the species stays without a photo (its future sheet
shows a generic fish drawing: ROADMAP). A photo a reference source uses to represent the species (the iNaturalist
cover, FishBase's main picture) carries rep: "inaturalist" / "fishbase" (judging/FISH.md "Reference photos"). Each
photo object carries use: 'ref' (the corals' word for "sheet only", curation.json use), which every game draw honours
(core.js fishGen keeps it out of the game photos wherever it is), from (cover / taxon / obs), and note when iNaturalist
files it under another species of fish.json. Two batched requests for every species of SHEET (the taxa, then their
observations in the Indo-West Pacific box).

A photo found here is written remote (r: 1, src its original); the Candidate photos workflow downloads it in the four
sizes and uploads it to R2 like a game photo, then lists it without r (tools/fish_game.py run, sheet_of), so the app
reads it from R2. A photo already downloaded (the same f and src, no r) is kept as it is. A species that has a photo in
play loses its sheet-only photo at that run (tools/fish_game.py sheet_of).

Every iNaturalist reply is cached in tools/.cache/fish-photos.json (git-ignored): a rerun is offline and identical;
--refresh asks again. Usage: python3 tools/fish_photos.py [--offline | --refresh]
"""
import argparse
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_fish as bf  # noqa: E402  (its cached, paced Net)
import fish_game  # noqa: E402  (fish-photos.json's writer: photos_dumps)
from fetch_fish import IWP, in_iwp  # noqa: E402  (the Indo-West Pacific box of the fish candidates)
import fetch_fishbase as fbase  # noqa: E402  (FishBase photos: the same rules, from tools/fishbase_src.json)

ROOT = bf.ROOT
OUT = ROOT / "fish-photos.json"
bf.CACHE = ROOT / "tools" / ".cache" / "fish-photos.json"
DAUIN = (9.19, 123.26)
# Pierre's licence rules (2026-11-03, the fish photo lists): never share-alike, never ND (a crop is a derivative).
LIC1, LIC2 = "cc0,cc-by", "cc-by-nc"
# The species that may keep a sheet-only photo (Pierre, 2026-11-05; see the top): fish.json species ids, the circle-1
# species with no game photo nor candidate. Chromis agilis (iNaturalist: Pycnochromis agilis), Siganus margaritiferus,
# Pomacentrus armillatus (filed under P. opisthostigma), Halichoeres chlorocephalus, H. marginatus. Asked at each run; a
# species that has a photo in play since (H. chlorocephalus: FishBase's, 2026-11-15) loses its sheet-only photo at the next
# Candidate photos run (tools/fish_game.py sheet_of). Add an id to try another.
SHEET = ["s088", "s061", "s105", "s238", "s244"]


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def where(o):
    """An observation's place: dauin (within 40 km), ph (the Philippines) or world."""
    if o.get("location"):
        la, lo = map(float, o["location"].split(","))
        return "dauin" if km((la, lo), DAUIN) <= 40 else "ph" if o.get("place_ids") and 6873 in o["place_ids"] else "world"
    return "ph" if 6873 in (o.get("place_ids") or []) else "world"


def ratio(p):
    dim = p.get("original_dimensions") or {}
    return round(dim["width"] / dim["height"], 3) if dim.get("width") and dim.get("height") else None


SHEET_LIC = set(LIC1.split(",") + LIC2.split(","))


def sheet_ok(p, o, inat):
    """A sheet photo passes the game photo rules (see the top): photo p (iNaturalist v1) on observation o of taxon inat."""
    if not p or not o or "/square." not in (p.get("url") or ""):
        return False
    t, own = o.get("taxon") or {}, (o.get("user") or {}).get("login") == bf.PIERRE
    if (t.get("min_species_taxon_id") or t.get("id")) != inat or t.get("rank") not in ("species", "subspecies", "variety"):
        return False  # identified to this species (a lumped name included: iNaturalist's taxon is the species')
    if not own and ((p.get("license_code") or "").lower() not in SHEET_LIC or o.get("quality_grade") != "research"):
        return False
    if o.get("captive") or any((a.get("controlled_attribute_id"), a.get("controlled_value_id")) == (17, 19)
                               and (a.get("vote_score") or 0) >= 0 for a in o.get("annotations") or []):
        return False  # captive, or annotated Dead (tools/fetch_fish.py DEAD)
    try:
        return in_iwp(tuple(map(float, (o.get("location") or "").split(","))))
    except ValueError:
        return False  # no coordinates: not known to be in the Indo-West Pacific


def sheet_pick(taxon, observations):
    """The sheet-only photo of one species (see the top): (iNaturalist photo, its observation, from), or None.
    taxon: the iNaturalist taxon (id, default_photo, taxon_photos); observations: its observations in the box."""
    held = {p["id"]: o for o in observations for p in o.get("photos") or []}
    inat = taxon.get("id")
    for p, src in [(taxon.get("default_photo"), "cover")] + [(tp.get("photo"), "taxon") for tp in taxon.get("taxon_photos") or []]:
        if p and sheet_ok(p, held.get(p.get("id")), inat):
            return p, held[p["id"]], src
    for o in observations:  # iNaturalist's order, whoever observed (Pierre, 2026-11-06: his own take no priority)
        for p in o.get("photos") or []:
            if sheet_ok(p, o, inat):
                return p, o, "obs"
    return None


def sheet_photo(s, taxon, observations, names):
    """The sheet-only photo object of fish.json species s, or None (no photo passes the rules)."""
    got = sheet_pick(taxon, observations)
    if not got:
        return None
    p, o, src = got
    t = (o.get("taxon") or {}).get("name") or taxon.get("name", "")
    out = {"f": f"fi{p['id']}", "o": f"https://www.inaturalist.org/observations/{o['id']}", "src": p["url"].replace("/square.", "/original."),
           "r": 1, "a": p.get("attribution") or "", "lic": (p.get("license_code") or "c").lower(), "t": t, "sp": s["id"], "loc": where(o),
           "use": "ref", "from": src}
    if src == "cover":
        out["rep"] = "inaturalist"  # the photo iNaturalist uses to represent the species (judging/FISH.md "Reference photos")
    if (o.get("user") or {}).get("login") == bf.PIERRE:
        out["own"] = True
    if ratio(p):
        out["ar"] = ratio(p)
    # iNaturalist files the photo under another species of fish.json (one it lumps with this one; rule S2:
    # the name shown stays the PDF's): say so beside the credit.
    if t != s["name"] and t in names:
        out["note"] = f"Filed under {t} on iNaturalist, which lumps the two species" + (" (as WoRMS does)" if s.get("now") == t else "") + "."
    return out


def sheet_fishbase(s, fb):
    """The FishBase sheet-only photo of fish.json species s, or None: the first of tools/fetch_fishbase.py's order (its
    main picture first) that passes the game photo rules (fetch_fishbase.usable). fb: its tools/fishbase_src.json entry."""
    L = fbase.ordered((fb or {}).get("photos") or [], s.get("present"))
    if not L:
        return None
    row = L[0]
    r = fbase.record(s, fb["code"], row)
    out = {"f": "fb" + row["n"].rsplit(".", 1)[0], "o": r["o"], "src": r["src"], "r": 1, "a": r["a"], "lic": r["lic"], "t": r["t"],
           "sp": s["id"], "loc": r["loc"], "use": "ref", "from": "fishbase", "via": "fishbase"}
    if r.get("rep"):
        out["rep"] = "fishbase"
    if row.get("type") in ("holotype", "paratype"):
        where = ", ".join(x for x in (row.get("where"), fbase.IWP_COUNTRIES.get(row.get("cc") or "")) if x)
        what = "the holotype (the specimen the species was described from)" if row["type"] == "holotype" else "a paratype"
        out["note"] = f"FishBase: {what}, photographed alive underwater{' at ' + where + ',' if where else ''} before it was collected."
    return out


def sheet(F):
    """The sheet-only photos of the species of SHEET: {species id: [photo]}, in SHEET order; two batched requests."""
    sp = {s["id"]: s for s in F["species"]}
    want = [sp[i] for i in SHEET if i in sp and sp[i].get("inat")]
    taxa = sorted({s["inat"] for s in want})
    if not taxa:
        return {}
    T = {t["id"]: t for t in (bf.NET.get(f"{bf.INAT}taxa/{','.join(map(str, taxa))}") or {}).get("results", [])}
    box = "&".join(f"{k}={v}" for k, v in IWP.items())
    reply = bf.NET.get(f"{bf.INAT}observations?taxon_id={','.join(map(str, taxa))}&photos=true&captive=false&{box}&per_page=200") or {}
    O = reply.get("results", [])
    if reply.get("total_results", 0) > len(O):
        print(f"sheet only: {reply['total_results']} observations in the box, only the first {len(O)} read", file=sys.stderr)
    names = {s["name"] for s in F["species"]}
    FB = fbase.load_src().get("species", {})
    out = {}
    for s in want:
        mine = [o for o in O if ((o.get("taxon") or {}).get("min_species_taxon_id") or (o.get("taxon") or {}).get("id")) == s["inat"]]
        # iNaturalist first (the cover, the taxon's photos, the observations), then FishBase (Pierre, 2026-11-05: FishBase
        # is a fish photo source; the same rules), its main picture first.
        p = sheet_photo(s, T.get(s["inat"]) or {"id": s["inat"]}, mine, names) or sheet_fishbase(s, FB.get(s["id"]))
        if p:
            out[s["id"]] = [p]
        print(f"sheet only {s['id']} {s['name']}: " + (f"{p['f']} ({p['from']}, {p['lic']}, {p['loc']}) {p['a']}" if p else "no photo passes the game photo rules"))
    return out


def keep_done(new, old):
    """The sheet photos to write: new (sheet()), each one already downloaded (old: the file's, the same f and src, no r)
    kept as it is (its shape measured, listed for R2)."""
    have = {(p.get("f"), p.get("src")): p for L in (old or {}).values() for p in L if not p.get("r")}
    return {sid: [have.get((p.get("f"), p.get("src")), p) for p in L] for sid, L in new.items()}


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--offline", action="store_true")
    g.add_argument("--refresh", action="store_true")
    a = ap.parse_args()
    bf.NET = bf.Net(offline=a.offline, refresh=a.refresh)
    F = json.loads((ROOT / "fish.json").read_text(encoding="utf-8"))
    doc = json.loads(OUT.read_text(encoding="utf-8"))
    try:
        doc["sheet"] = keep_done(sheet(F), doc.get("sheet"))
    finally:
        bf.NET.save()
    OUT.write_text(fish_game.photos_dumps(doc), encoding="utf-8")


if __name__ == "__main__":
    main()
