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

Sheet-only photos ("sheet": {species id: [photo]}, Pierre, 2026-11-05). A few circle-1 species have no game photo and
no candidate, because iNaturalist files their photos under another species (Pomacentrus armillatus: iNaturalist and
WoRMS lump it with P. opisthostigma). They keep a photo for their sheet only, never in the quiz or any game. A sheet
photo passes every game photo rule all the same (Pierre, 2026-11-05: "if they don't pass the game rules, we don't keep
them"): licence CC0, CC BY or CC BY-NC (Pierre's own: any), Research Grade or Pierre's own identified to the species,
taken in the Indo-West Pacific box of tools/fetch_fish.py (the Philippines are inside it), never captive, never
annotated Dead. For each species of SHEET, in this order: its iNaturalist cover (the taxon's default photo), the taxon's
other photos (those iNaturalist shows on the taxon page, in its order), then its observations, Pierre's own first, each
taken only when it passes those rules on the observation that holds it (a photo with no observation found is not
taken); none, and the species stays without a photo (its future sheet shows a generic fish drawing: ROADMAP). Each
photo object carries use: 'ref' (the corals' word for "sheet only", curation.json use), which every game draw honours
(core.js fishGen keeps it out of the game photos wherever it is), from (cover / taxon / obs), and note when iNaturalist
files it under another species of fish.json. Two batched requests for every species of SHEET (the taxa, then their
observations in the Indo-West Pacific box).

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
from fetch_fish import IWP, in_iwp  # noqa: E402  (the Indo-West Pacific box of the fish candidates)

ROOT = bf.ROOT
OUT = ROOT / "fish-photos.json"
bf.CACHE = ROOT / "tools" / ".cache" / "fish-photos.json"
V = 1
PER = 24
DAUIN = (9.19, 123.26)
# Pierre's licence rules (2026-11-03, the fish photo lists): never share-alike, never ND (a crop is a derivative).
LIC1, LIC2 = "cc0,cc-by", "cc-by-nc"
# The species that may keep a sheet-only photo (Pierre, 2026-11-05; see the top): fish.json species ids, the circle-1
# species with no game photo nor candidate. Chromis agilis (iNaturalist: Pycnochromis agilis), Siganus margaritiferus,
# Pomacentrus armillatus (filed under P. opisthostigma), Halichoeres chlorocephalus, H. marginatus. Only P. armillatus
# has a photo that passes the rules (2026-11-05); the others are asked again at each run. Add an id to try another.
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
    for o in sorted(observations, key=lambda o: (o.get("user") or {}).get("login") != bf.PIERRE):  # Pierre's own first
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
    box = "&".join(f"{k}={v}" for k, v in IWP.items())
    reply = bf.NET.get(f"{bf.INAT}observations?taxon_id={','.join(map(str, taxa))}&photos=true&captive=false&{box}&per_page=200") or {}
    O = reply.get("results", [])
    if reply.get("total_results", 0) > len(O):
        print(f"sheet only: {reply['total_results']} observations in the box, only the first {len(O)} read", file=sys.stderr)
    names = {s["name"] for s in F["species"]}
    out = {}
    for s in want:
        mine = [o for o in O if ((o.get("taxon") or {}).get("min_species_taxon_id") or (o.get("taxon") or {}).get("id")) == s["inat"]]
        p = sheet_photo(s, T.get(s["inat"]) or {"id": s["inat"]}, mine, names)
        if p:
            out[s["id"]] = [p]
        print(f"sheet only {s['id']} {s['name']}: " + (f"{p['f']} ({p['from']}, {p['lic']}, {p['loc']}) {p['a']}" if p else "no photo passes the game photo rules"))
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
