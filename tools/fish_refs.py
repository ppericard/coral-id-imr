#!/usr/bin/env python3
"""Reference photos for the fish units: tools/fish_refs.json, the photos reference sources use to represent each taxon.

Pierre, 2026-11-05 and 2026-11-06: a photo a reference source uses to represent a taxon (iNaturalist's taxon cover, its
`default_photo`; FishBase's main picture of the species) is easy to identify, so it should be a unit's cover and its
first photo (judging/FISH.md "Reference photos"; core.js easyRank ranks the reference flag first among equally easy
photos). Before this file a cover was tagged only when it happened to be among the fetched candidates (2 game photos).

For every game species (fish.json species of a level-1 entry, not `out`), every circle-1 genus (app.js fishGenera: the
first word of a circle-1 species' name) and every entry's family (fish.json teach fam), in this order:
  1. iNaturalist: the taxon's cover, then the other photos its taxon page shows (taxon_photos, iNaturalist's order),
     for a species all of them, for a genus or a family the first, that pass every game photo rule on the observation that holds it (the rules of tools/fetch_fish.py:
     Research Grade at the species level, licence CC0, CC BY or CC BY-NC, never share-alike or ND, not captive, not
     annotated Dead, hosted on iNaturalist's open-data host, and in the Indo-West Pacific box `IWP`: a species
     confirmed near Dauin takes its photos from anywhere there, ARCHITECTURE "Fish photos"; every game species is
     confirmed in the Philippines, rule C8). For a genus or a family, the observation must be of a game species of
     that entry (the photo joins that entry's photos with that species). A photo with no observation found among the
     taxon's 200 most faved Research Grade observations in the box is not taken (nothing proves it passes the rules).
  2. FishBase (species only): its photos that pass tools/fetch_fishbase.py's rules (usable: underwater, CC BY-NC as
     FishBase states it, the box, abroad only for a species confirmed in the Philippines), its main picture first, all
     of them (Pierre, 2026-11-06: FishBase enters automatically when its licence allows; "a maximum of good photos to
     complement the weaker ones on iNaturalist").
Each photo object has fish-photos.json's shape plus rep ("inaturalist" for the cover or a taxon-page photo, "fishbase"
for FishBase's main picture; FishBase's other photos have none), via ("fishbase"), from (cover, taxon, fishbase) and for (the units it represents: species ids, "g:<genus>",
"fam:<family>"), keyed by species (fish.json species id), so the file outlives a renaming of the teaching entries.
tools/fish_judge.py apply() adds each one to the game photos of the entry that holds its species once it is judged at
the reference level (core.js refLevel) (tools/fish_judge.json
photos), like any game photo: a reference photo is judged on what it shows, and its rep adds the flag r and one ease
point (judging/FISH.md). One already in the list is tagged in place.

Network: iNaturalist API v1 for the taxa, v2 (only the fields used) for the observations, read only, about one request a second (rule C7), generic User-Agent, every reply cached
(trimmed) in tools/.cache/fish_refs.json (git-ignored): a rerun is offline. Taxa 30 a request; one observation search
per taxon with a usable reference photo.
Usage: python3 tools/fish_refs.py [--offline | --refresh] [--only t01,t02]
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fetch_fish as ff  # noqa: E402  (the cached, paced Net; IWP, in_iwp, OK)
import fetch_fishbase as fbase  # noqa: E402  (FishBase's rules and records)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tools" / "fish_refs.json"
CACHE = ROOT / "tools" / ".cache" / "fish_refs.json"
V1 = "https://api.inaturalist.org/v1/"
HOST = "https://inaturalist-open-data.s3.amazonaws.com/"
BOX = "&".join(f"{k}={v}" for k, v in ff.IWP.items())
DAUIN = (9.19, 123.26)
SPECIES_RANKS = ("species", "subspecies", "variety")
DEAD = (17, 19)
# No cap per species (Pierre, 2026-11-06 14:02: "don't limit ourselves: the goal is a maximum of good photos to complement
# the weaker ones on iNaturalist"): every iNaturalist cover and taxon-page photo and every FishBase photo that passes the
# rules is listed; the judging decides which play (reference level only, tools/fish_judge.py add_refs).
INAT_MAX = FB_MAX = None
# iNaturalist API v2 observation fields the rules read (a v1 reply of 200 observations weighs about 12 MB).
FIELDS = ("id,quality_grade,location,place_ids,captive,taxon.id,taxon.name,taxon.rank,taxon.min_species_taxon_id,user.login,"
          "photos.id,annotations.controlled_attribute_id,annotations.controlled_value_id,annotations.vote_score")


def ph(p):
    """A taxon photo (iNaturalist v1) trimmed to what the rules read."""
    if not p:
        return None
    dim = p.get("original_dimensions") or {}
    return {"id": p.get("id"), "url": p.get("url") or "", "lic": (p.get("license_code") or "").lower(), "a": p.get("attribution") or "",
            "w": dim.get("width"), "h": dim.get("height")}


def keep_taxa(d):
    out = {}
    for t in d.get("results") or []:
        L = [ph(t.get("default_photo"))] + [ph(x.get("photo")) for x in t.get("taxon_photos") or []]
        seen, P = set(), []
        for p in L:
            if p and p["id"] and p["id"] not in seen:
                seen.add(p["id"])
                P.append(p)
        out[str(t["id"])] = {"name": t.get("name"), "rank": t.get("rank"), "photos": P}
    return out


def taxa(net, ids):
    """{taxon id: {name, rank, photos: [cover, then the taxon page's photos]}}, 30 taxa a request."""
    out, ids = {}, sorted(set(ids))
    for i in range(0, len(ids), 30):
        out.update(net.fetch(V1 + "taxa/" + ",".join(map(str, ids[i:i + 30])) + "?per_page=30", keep_taxa) or {})
    return {int(k): v for k, v in out.items()}


def keep_find(d):
    return [{"id": t["id"], "name": t.get("name"), "rank": t.get("rank")} for t in d.get("results") or []]


def find(net, name, rank):
    """The iNaturalist taxon id of a genus or family name among the chordates, or None."""
    L = net.fetch(V1 + f"taxa?q={name}&rank={rank}&is_active=true&taxon_id=2&per_page=10", keep_find) or []
    return next((t["id"] for t in L if t["name"] == name and t["rank"] == rank), None)


def keep_obs(d):
    """{photo id: the observation's fields the rules read} for every photo of the reply."""
    out = {}
    for o in d.get("results") or []:
        t = o.get("taxon") or {}
        rec = {"id": o["id"], "q": o.get("quality_grade"), "loc": o.get("location"), "pl": o.get("place_ids") or [],
               "user": (o.get("user") or {}).get("login"), "cap": bool(o.get("captive")),
               "sp": t.get("min_species_taxon_id") or t.get("id"), "rank": t.get("rank"), "t": t.get("name"),
               "dead": any((a.get("controlled_attribute_id"), a.get("controlled_value_id")) == DEAD and (a.get("vote_score") or 0) >= 0
                           for a in o.get("annotations") or [])}
        for p in o.get("photos") or []:
            out[str(p["id"])] = rec
    return out


def held(net, taxon):
    """The 200 most faved Research Grade observations of a taxon in the box, by photo id."""
    url = (ff.API + f"taxon_id={taxon}&photos=true&captive=false&quality_grade=research"
           f"&photo_license={','.join(ff.OK)}&{BOX}&order_by=votes&per_page=200&fields={FIELDS}")
    return net.fetch(url, keep_obs) or {}


def usable(p):
    return bool(p) and p["lic"] in ff.OK and p["url"].startswith(HOST) and "/square." in p["url"]


def passes(o, want):
    """The observation passes the game photo rules and is of one of the species taxa `want`."""
    if not o or o["q"] != "research" or o["cap"] or o["dead"] or o["rank"] not in SPECIES_RANKS or o["sp"] not in want:
        return False
    try:
        return ff.in_iwp(tuple(map(float, (o["loc"] or "").split(","))))
    except ValueError:
        return False


def where(o):
    la, lo = map(float, o["loc"].split(","))
    return "dauin" if ff.km((la, lo), DAUIN) <= 40 else "ph" if ff.PH in o["pl"] else "world"


def pick(net, T, taxon, want, n=1):
    """[(photo, observation, from)]: the taxon's first n reference photos (its cover, then its taxon page's) that pass
    the rules, one per observation."""
    rec = T.get(taxon)
    P = [(p, "cover" if i == 0 else "taxon") for i, p in enumerate((rec or {}).get("photos") or []) if usable(p)]
    if not P:
        return []
    H, out = held(net, taxon), []
    for p, src in P:
        o = H.get(str(p["id"]))
        if passes(o, want) and all(o["id"] != x[1]["id"] for x in out):
            out.append((p, o, src))
            if n and len(out) >= n:
                break
    return out


def credit(a, lic):
    """The credit as the game photos have it ("(c) Name, some rights reserved (CC BY-NC)"): a taxon photo's attribution
    comes with ", uploaded by ..." after the licence and, for some, its rights phrase in another language (iNaturalist's locale)."""
    a = re.sub(r"(\(CC[^)]*\)).*$", r"\1", a or "")  # what follows the licence: "uploaded by ..." in any language
    m = re.match(r"^\(c\)\s*(.+),\s*[^,]+\((CC[^)]*)\)\s*$", a)
    if lic == "cc0":
        return re.sub(r",.*$", "", a) + ", no rights reserved (CC0)" if a else "no rights reserved"
    return f"(c) {m.group(1)}, some rights reserved ({m.group(2)})" if m else a


def inat_obj(p, o, src, sid):
    out = {"f": f"fi{p['id']}", "o": f"https://www.inaturalist.org/observations/{o['id']}", "src": p["url"].replace("/square.", "/original."),
           "r": 1, "a": credit(p["a"], p["lic"]), "lic": p["lic"], "t": o["t"], "sp": sid, "loc": where(o), "rep": "inaturalist", "from": src}
    if o["user"] == ff.PIERRE:
        out["own"] = True
    if p["w"] and p["h"]:
        out["ar"] = round(p["w"] / p["h"], 3)
    return out


def fb_objs(s, fb, n=FB_MAX):
    """FishBase's photos of species s that pass its rules (fetch_fishbase.usable), in its order (the main picture first,
    then the nearest), at most n: the main picture carries rep "fishbase"."""
    out = []
    for row in fbase.ordered((fb or {}).get("photos") or [], s.get("present"))[:n or None]:
        r = fbase.record(s, fb["code"], row)
        o = {"f": "fb" + row["n"].rsplit(".", 1)[0], "o": r["o"], "src": r["src"], "r": 1, "a": r["a"], "lic": r["lic"], "t": r["t"],
             "sp": s["id"], "loc": r["loc"], "from": "fishbase", "via": "fishbase"}
        if row.get("main"):
            o["rep"] = "fishbase"
        out.append(o)
    return out


def build(net, F, only=()):
    sp = {s["id"]: s for s in F["species"]}
    entries = [t for t in F["teach"] if t.get("level") == 1 and (not only or t["id"] in only)]
    game = {t["id"]: [sp[i] for i in t.get("species", []) if i in sp and not sp[i].get("out") and sp[i].get("inat")] for t in entries}
    gen = {}  # entry id -> {genus name: [species]}, app.js fishGenera: circle-1 entries, circle-1 species
    for t in entries:
        if t.get("circle") == 1:
            for s in game[t["id"]]:
                if s.get("circle") == 1:
                    gen.setdefault(t["id"], {}).setdefault(s["name"].split()[0], []).append(s)
    names = {}
    for t in entries:
        if t.get("fam"):
            names[(t["fam"], "family")] = None
    for G in gen.values():
        for g in G:
            names[(g, "genus")] = None
    for k in names:
        names[k] = find(net, *k)
    T = taxa(net, [s["inat"] for L in game.values() for s in L] + [v for v in names.values() if v])
    FB = fbase.load_src().get("species", {})
    # A sheet-only photo (fish-photos.json sheet: a species iNaturalist files under another one) never becomes a game photo.
    fp = ROOT / "fish-photos.json"
    sheet = {p["f"] for L in (json.loads(fp.read_text(encoding="utf-8")).get("sheet") or {}).values() for p in L} if fp.exists() else set()
    out, stats = {}, {"species": 0, "inat": 0, "fishbase": 0, "genus": [0, 0], "family": [0, 0]}

    def put(tid, obj, unit):
        if obj["f"] in sheet:
            return
        # One photo once (two species iNaturalist lumps can share a cover): kept under the first species that took it.
        old = next((x for L in out.values() for x in L if x["f"] == obj["f"] or x["o"] == obj["o"]), None)
        if old:
            old["for"] = sorted(set(old["for"]) | {unit})
            return
        out.setdefault(obj["sp"], []).append({**obj, "for": [unit]})  # by species: outlives a renaming of the entries

    for t in entries:
        tid, L = t["id"], game[t["id"]]
        by_inat = {s["inat"]: s for s in L}
        fam = names.get((t.get("fam"), "family"))
        if fam:
            stats["family"][1] += 1
            got = pick(net, T, fam, set(by_inat))
            if got:
                stats["family"][0] += 1
                put(tid, inat_obj(*got[0], by_inat[got[0][1]["sp"]]["id"]), "fam:" + t["fam"])
        for g, S in (gen.get(tid) or {}).items():
            gid = names.get((g, "genus"))
            stats["genus"][1] += 1
            got = pick(net, T, gid, {s["inat"] for s in S}) if gid else []
            if got:
                stats["genus"][0] += 1
                put(tid, inat_obj(*got[0], by_inat[got[0][1]["sp"]]["id"]), "g:" + g)
        for s in L:
            stats["species"] += 1
            got = pick(net, T, s["inat"], {s["inat"]}, INAT_MAX)
            if got:
                stats["inat"] += 1
            for x in got:
                put(tid, inat_obj(*x, s["id"]), s["id"])
            B = fb_objs(s, FB.get(s["id"]))
            if any(b.get("rep") for b in B):
                stats["fishbase"] += 1
            for b in B:
                put(tid, b, s["id"])
    return out, stats


def write(doc):
    dump = lambda v: json.dumps(v, ensure_ascii=False, separators=(",", ":"))  # noqa: E731
    lines = ["{", f'"_doc":{dump(doc["_doc"])},', '"photos":{']
    lines.append(",\n".join(f'"{k}":{dump(v)}' for k, v in doc["photos"].items()))
    lines += ["}", "}"]
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--offline", action="store_true")
    g.add_argument("--refresh", action="store_true")
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    net = ff.Net(CACHE, offline=a.offline, refresh=a.refresh)
    F = json.loads((ROOT / "fish.json").read_text(encoding="utf-8"))
    only = set(filter(None, a.only.split(",")))
    try:
        photos, st = build(net, F, only)
    finally:
        net.save()
    order = [s["id"] for s in F["species"]]
    old = json.loads(OUT.read_text(encoding="utf-8")).get("photos", {}) if OUT.exists() and only else {}
    # An --only run keeps the other species and replaces those of its entries, emptied first, so a species that lost
    # every reference photo loses its old ones too (Codex review #660).
    mine = {sid for t in F["teach"] if t.get("level") == 1 and t["id"] in only for sid in t.get("species", [])}
    photos = {**{k: v for k, v in old.items() if k not in mine}, **photos}
    write({"_doc": ["Reference photos of the fish units (tools/fish_refs.py, judging/FISH.md \"Reference photos\"): fish.json species id -> "
                    "photo objects (fish-photos.json's shape, plus rep, from and for: the units each represents: species ids, "
                    "g:<genus>, fam:<family>). tools/fish_judge.py adds a photo to the game photos of the entry that holds its species "
                    "once tools/fish_judge.json judges it."],
           "photos": {k: photos[k] for k in sorted(photos, key=lambda k: order.index(k) if k in order else 1e9)}})
    print(f"species: {st['species']}, with an iNaturalist reference photo {st['inat']}, a FishBase main picture {st['fishbase']}; "
          f"genera {st['genus'][0]} of {st['genus'][1]}; families {st['family'][0]} of {st['family'][1]}; "
          f"photos {sum(len(v) for v in photos.values())}")


if __name__ == "__main__":
    main()
