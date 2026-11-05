#!/usr/bin/env python3
"""FishBase photos for the fish subject: candidates in fish-cand.json, and the sheet-only photos' FishBase source.

Pierre, 2026-11-05: FishBase is "the reference platform for fish, photos well linked to the species; if their licence is
compatible, integrate it, fully". A FishBase photo follows every game photo rule of the iNaturalist ones and never
by-passes Pierre's curation: it enters as a candidate (fish-cand.json, judged on judging/FISH.md, Pierre's Publish), or
as a sheet-only photo for a species of tools/fish_photos.py SHEET (never in a game).

Source: FishBase's own data, never its web pages (no scraping): the table `picturesmain` of the rfishbase snapshot
(huggingface.co/datasets/cboettig/fishbase, v25.04, CC BY-NC, the FishBase team's export for rfishbase and the FishBase
API), one row per FishBase picture with its file name, species, picture type, author, country, locality, coordinates,
life stage, licence field and whether it is the species' main picture. `--fishbase DIR` reads DIR/picturesmain.parquet
and DIR/species.parquet (needs pyarrow, as tools/fish_common.py) and keeps the underwater photos of every game species
in tools/fishbase_src.json (in the repo, one species per line); everything else runs offline from that file. The photos
themselves stay on FishBase (src = www.fishbase.de/images/species/<file>), shown remote like an iNaturalist candidate
(r: 1) and downloaded only when they enter the game (admin plan PR 7). FishBase's robots.txt (2026-11-05) allows every
user agent but AI-training crawlers (Content-Signal: search=yes, ai-train=no, use=reference); fishbase.org sits behind a
browser challenge; no terms-of-use page was found; each photo page states its licence.

The rules (Pierre, 2026-11-05: the same as for iNaturalist photos, tools/fetch_fish.py):
- Live fish only: picture type "underwater photo". Never "photo" (mostly fresh or preserved specimens out of water),
  Randall's tank photos, aquarium or public-aquarium photos (captive), drawings, stamps, radiographs.
- Licence (`lic_of`): only what FishBase states as CC BY-NC 4.0 on the photo page. Its database field `Copyright` is
  "non-commercial use", "free use", "permission required" or empty; the photo pages (checked 2026-11-05 on one photo of
  each) show "CC BY-NC 4.0" for the first three and "ALL RIGHTS RESERVED" for empty. Where the two disagree the stricter
  wins: "non-commercial use", "free use" and the public-domain flag are taken as CC BY-NC 4.0 (the page's licence);
  "permission required" (the field) and empty (all rights reserved) are never taken. So every FishBase photo is
  `lic: "cc-by-nc"`: never share-alike, ND or "usage conditions apply".
- Abroad = the Indo-West Pacific box of tools/fetch_fish.py (IWP), on the photo's coordinates; a photo without
  coordinates is taken only when its country (FishBase C_Code, ISO 3166 numeric) lies wholly inside the box
  (IWP_COUNTRIES). Abroad only for a species confirmed in the Philippines (fish.json present.ph, AGENTS.md rule 6g), as
  every photo from abroad.
- Identification: FishBase's own (its staff place every picture on a species; many come from the authors who described
  the species, e.g. J. E. Randall), taken as given like a Research Grade one. The judging pass never judges the species.
- Reference photo: FishBase's main picture of the species (PicPreferred, the photo its species page shows) is tagged
  `rep: "fishbase"` (judging/FISH.md "Reference photos": easy to identify, so its ease gets a bonus).
- Order and amount: the main picture first, then the nearest (Dauin, the region, the Philippines, abroad), then the
  file name; each photo its own observation; the cap of tools/fetch_fish.py (CAP observations per species, counted as
  it counts them: what Pierre rejected, excluded or sent elsewhere, and the pre-sort's sure rejects, free room). Run
  after tools/fetch_fish.py, so FishBase fills the room iNaturalist leaves (the species with few or no candidates).

Candidate records, as tools/fetch_fish.py's (data.json "cand" shape): f (fish-<species id>-cand-fb-<file stem>), a (the
author, "via FishBase", the licence), lic, o (the photo's FishBase page: its credit and licence), t (FishBase's name of
the photo), own (false), loc (dauin / ph / world), src, r: 1, plus via: "fishbase" (absent = iNaturalist), rep, and st
(the life stage FishBase gives: juvenile, female, male).

    python3 tools/fetch_fishbase.py --fishbase DIR   read the snapshot into tools/fishbase_src.json
    python3 tools/fetch_fishbase.py [--circle 1 --circle 2 --circle 3] [--cap 20] [--only s238,t05] [--plan]
Tests: node --test tests/fishbase.test.js (fixtures and the real tools/fishbase_src.json).
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import fetch_fish as ff  # noqa: E402  the iNaturalist candidates' rules (IWP, tiers, cap, state, species list)
from datajson import dump  # noqa: E402

SRC = ROOT / "tools" / "fishbase_src.json"
SNAPSHOT = "rfishbase snapshot v25.04 (huggingface.co/datasets/cboettig/fishbase), tables picturesmain and species, CC BY-NC (FishBase)"
SITE = "https://www.fishbase.de"
KIND = "underwater photo"  # the only picture type taken: a live fish in the sea
# FishBase Copyright field -> licence: the stricter of the field and the photo page (see the top). Never anything else.
LIC = {"noncommercialuse": "cc-by-nc", "freeuse": "cc-by-nc"}
PH_CODE = "608"
# Countries wholly inside the IWP box (30 S - 30 N, 90 E - 170 E), as FishBase C_Code (ISO 3166 numeric): a photo with
# no coordinates is known to be in the Indo-West Pacific only through one of these. Left out on purpose, as they reach
# outside the box: Australia, Japan, China, India, Fiji, the Maldives, Sri Lanka, the Marshall Islands, Kiribati, the USA.
IWP_COUNTRIES = {
    "608": "Philippines", "360": "Indonesia", "458": "Malaysia", "096": "Brunei", "702": "Singapore", "626": "Timor-Leste",
    "598": "Papua New Guinea", "090": "Solomon Islands", "548": "Vanuatu", "540": "New Caledonia", "585": "Palau",
    "583": "Micronesia", "316": "Guam", "580": "Northern Mariana Islands", "158": "Taiwan", "704": "Viet Nam",
    "764": "Thailand", "116": "Cambodia", "104": "Myanmar",
}
STAGE = {"juvenile": "juvenile", "female": "female", "male": "male"}  # FishBase LifeStage -> st (fetch_fish.py's words)


def lic_of(row):
    """The licence a FishBase photo is taken under, or None (never taken): see the top."""
    if re.sub(r"[^a-z]", "", (row.get("cp") or "").lower()) == "permissionrequired":
        return None
    if row.get("pd"):
        return "cc-by-nc"
    return LIC.get(re.sub(r"[^a-z]", "", (row.get("cp") or "").lower()))


def in_region(row):
    """In the Indo-West Pacific: by its coordinates, or, without them, by a country wholly inside the box."""
    if row.get("ll"):
        return ff.in_iwp(tuple(row["ll"]))
    return (row.get("cc") or "") in IWP_COUNTRIES


def tier(row):
    """dauin, region, ph or world, as tools/fetch_fish.py tier_of (the Philippines by FishBase's country code)."""
    return ff.tier_of({"ll": row.get("ll"), "inph": row.get("cc") == PH_CODE})


def usable(row, present=None):
    """A FishBase photo passes the game photo rules for a species with this fish.json present."""
    if row.get("kind") != KIND or not lic_of(row) or not row.get("n"):
        return False
    if not in_region(row):
        return False
    return tier(row) != "world" or bool((present or {}).get("ph"))  # abroad only for a species confirmed in the Philippines


def ordered(rows, present=None):
    """The usable photos of one species, in the order they are taken: the main picture, the nearest, the file name."""
    T = {t: i for i, t in enumerate((*ff.TIERS, "world"))}
    return sorted((r for r in rows if usable(r, present)), key=lambda r: (not r.get("main"), T[tier(r)], r["n"]))


def author(a):
    """FishBase's "Randall, J.E." as "J.E. Randall"; a name with no comma as it is."""
    m = re.match(r"^\s*([^,]+?)\s*,\s*(.+?)\s*$", a or "")
    return f"{m.group(2)} {m.group(1)}" if m else (a or "").strip()


def page(code, n):
    return f"{SITE}/photos/PicturesSummary.php?ID={code}&what=species&pic={n}"


def record(s, code, row):
    """The candidate record of one FishBase photo for fish.json species s (FishBase species code)."""
    stem = row["n"].rsplit(".", 1)[0]
    r = {"f": f"fish-{s['id']}-cand-fb-{stem}", "a": f"(c) {author(row.get('a'))}, via FishBase, some rights reserved (CC BY-NC 4.0)",
         "lic": lic_of(row), "o": page(code, row["n"]), "t": row.get("t") or s["name"], "own": False,
         "loc": ff.LOC[tier(row)], "src": f"{SITE}/images/species/{row['n']}", "r": 1, "via": "fishbase"}
    if row.get("main"):
        r["rep"] = "fishbase"
    if STAGE.get(row.get("st") or ""):
        r["st"] = STAGE[row["st"]]
    return r


def load_src(path=SRC):
    return json.loads(Path(path).read_text(encoding="utf-8")) if Path(path).exists() else {"species": {}}


def save_src(src, path=SRC):
    """One species per line, so a new snapshot shows as a readable diff."""
    rows = []
    for k, v in src.items():
        if k == "species":
            rows.append(' "species": {\n' + ",\n".join(
                f"  {json.dumps(i)}: {json.dumps(r, ensure_ascii=False, separators=(',', ':'))}" for i, r in sorted(v.items())) + "\n }")
        else:
            rows.append(f" {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}")
    Path(path).write_text("{\n" + ",\n".join(rows) + "\n}\n", encoding="utf-8")


def coord(deg, mins, hemi, neg):
    if deg is None or deg != deg:  # None or NaN
        return None
    v = float(deg) + (float(mins) / 60 if mins is not None and mins == mins else 0)
    return round(-v if (hemi or "").strip().lower() == neg else v, 4)


def from_snapshot(d, fish_path=ROOT / "fish.json"):
    """tools/fishbase_src.json from the snapshot in DIR: the underwater photos of every game species (fish.json species
    with a circle), matched to FishBase by the PDF name, the WoRMS name or a WoRMS synonym, as tools/fish_common.py."""
    import pyarrow.parquet as pq  # only for this step

    d = Path(d)
    fish = json.loads(Path(fish_path).read_text(encoding="utf-8"))
    spt = pq.read_table(d / "species.parquet", columns=["SpecCode", "Genus", "Species"]).to_pylist()
    code = {f"{r['Genus']} {r['Species']}".lower(): int(r["SpecCode"]) for r in spt}
    want = {}
    for s in fish["species"]:
        if not s.get("circle"):
            continue
        for nm in [s["name"], s.get("now")] + list(s.get("syn") or []):
            if nm and nm.lower() in code:
                want[s["id"]] = (code[nm.lower()], nm)
                break
    cols = ["SpecCode", "PicGenus", "PicSpecies", "PicName", "PictureType", "PicType", "LifeStage", "Locality", "C_Code",
            "NorthSouth", "LatDeg", "LatMin", "EastWest", "LongDeg", "LongMin", "AuthName", "Copyright", "PublicDomain", "PicPreferred"]
    by = {}
    for r in pq.read_table(d / "picturesmain.parquet", columns=cols).to_pylist():
        if r["SpecCode"] is None or r["PictureType"] != KIND or not r["PicName"]:
            continue
        by.setdefault(int(r["SpecCode"]), []).append(r)
    out = {}
    for sid, (c, nm) in want.items():
        rows = []
        for r in sorted(by.get(c, []), key=lambda r: r["PicName"]):
            lat, lng = coord(r["LatDeg"], r["LatMin"], r["NorthSouth"], "s"), coord(r["LongDeg"], r["LongMin"], r["EastWest"], "w")
            row = {"n": r["PicName"], "t": f"{r['PicGenus']} {r['PicSpecies']}".strip(), "kind": r["PictureType"],
                   "a": r["AuthName"] or "", "cp": r["Copyright"] or "", "cc": (r["C_Code"] or "").strip()}
            if r["PublicDomain"]:
                row["pd"] = True
            if r["PicPreferred"]:
                row["main"] = True
            if lat is not None and lng is not None:
                row["ll"] = [lat, lng]
            if r["Locality"]:
                row["where"] = r["Locality"]
            if r["LifeStage"] and r["LifeStage"] != "unsexed":
                row["st"] = r["LifeStage"]
            if r["PicType"]:
                row["type"] = r["PicType"]
            rows.append(row)
        out[sid] = {"code": c, "as": nm, "photos": rows}
    src = {"_doc": "FishBase underwater photos of the game species (tools/fetch_fishbase.py --fishbase): per fish.json species id, "
                   "code = FishBase SpecCode, as = the name matched, photos = [{n file, t FishBase name, kind picture type, a author, "
                   "cp Copyright field, pd public domain, main FishBase's main picture, ll [lat, lng], cc C_Code, where locality, "
                   "st life stage, type holotype / paratype}]",
           "snapshot": SNAPSHOT, "species": out}
    save_src(src)
    n = sum(len(v["photos"]) for v in out.values())
    print(f"FishBase: {len(want)} game species matched, {n} underwater photos of {sum(1 for v in out.values() if v['photos'])} species")


def run(args):
    fish = json.loads(Path(args.fish).read_text(encoding="utf-8"))
    src = load_src(args.src).get("species", {})
    cand_path = Path(args.cand)
    have = json.loads(cand_path.read_text(encoding="utf-8")).get("cand", {}) if cand_path.exists() else {}
    cur = json.loads(Path(args.cur).read_text(encoding="utf-8")) if Path(args.cur).exists() else {}
    sug = json.loads(Path(args.suggest).read_text(encoding="utf-8")) if Path(args.suggest).exists() else {}
    gone, _ = ff.state(cur, sug)
    only = set(filter(None, (args.only or "").split(",")))
    plan, added = {}, Counter()
    for s, t in ff.species_list(fish, set(args.circle), only):
        sid = s["id"]
        fb = src.get(sid)
        if not fb:
            continue
        L = have.get(sid, [])
        keep_obs = {p["o"] for p in L if not gone(p["f"])}
        known = {p["f"] for p in L}
        room = args.cap - len(keep_obs)
        take = [r for r in ordered(fb["photos"], s.get("present")) if record(s, fb["code"], r)["f"] not in known][:max(room, 0)]
        if not take:
            continue
        recs = [record(s, fb["code"], r) for r in take]
        plan[sid] = {"name": s["name"], "entry": t["id"], "have": len(keep_obs), "room": room, "add": len(recs),
                     "rep": sum(1 for r in recs if r.get("rep")), "loc": dict(Counter(r["loc"] for r in recs))}
        if args.plan:
            continue
        have.setdefault(sid, []).extend(recs)
        added[sid] = len(recs)
        print(f"{t['name']:<28} {s['name']:<32} +{len(recs)} FishBase ({plan[sid]['loc']}{', main picture' if plan[sid]['rep'] else ''}), "
              f"{len(have[sid])} photos", flush=True)
    if args.plan:
        print(json.dumps({"species": plan}))
        return plan
    if added:
        order = [s["id"] for s in fish["species"]]
        out = {k: have[k] for k in sorted(have, key=lambda k: order.index(k) if k in order else 1e9) if have[k]}
        dump({"v": 1, "cand": out}, str(cand_path))
    print(f"FishBase: +{sum(added.values())} candidates for {len(added)} species")
    return plan


def main(argv=None):
    a = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    a.add_argument("--fishbase", metavar="DIR", help="read the rfishbase snapshot in DIR into tools/fishbase_src.json")
    a.add_argument("--circle", type=int, action="append", help="circle(s) to fill (default 1)")
    a.add_argument("--cap", type=int, default=ff.CAP, help=f"usable observations kept per species (default {ff.CAP})")
    a.add_argument("--only", help="comma-separated species or teaching ids")
    a.add_argument("--plan", action="store_true", help="print what a run would add; write nothing")
    a.add_argument("--fish", default=str(ROOT / "fish.json"))
    a.add_argument("--src", default=str(SRC))
    a.add_argument("--cand", default=str(ROOT / "fish-cand.json"))
    a.add_argument("--cur", default=str(ROOT / "curation.json"))
    a.add_argument("--suggest", default=str(ROOT / "suggest.json"))
    args = a.parse_args(argv)
    if args.fishbase:
        return from_snapshot(args.fishbase, args.fish)
    args.circle = args.circle or [1]
    return run(args)


if __name__ == "__main__":
    main()
