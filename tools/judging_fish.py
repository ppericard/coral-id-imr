#!/usr/bin/env python3
"""Fish candidate pass of the judging agent: the pre-sort of fish-cand.json (judging/AGENTS.md "Fish candidate pass").

The coral candidate pass (tools/judging_cand.py) adapted to fish (Pierre, 2026-11-03; tags settled 2026-11-04). Per
photo: the framing (whole fish, part of it, a school), the phase (a tag, never a section), the quality, the colour loss
(none / slight / strong / monochrome), best / alt / dup within its observation, several species, not this species or
unusable, and a suggested crop. Poor photos are NOT set aside: they stand in for SVS video frames (EventMeasure
identifications are made on video frames), so the pass tags quality and keeps a spread. Its sure decisions
(autosort.js fishSure) are meant to apply by themselves through the admin's auto-sort, with 1 candidate in 20 shown to
Pierre as a Check (autoCheck), once the fish Candidates page exists (admin plan PR 5); nothing here writes
curation.json.

    python3 tools/judging_fish.py sheets [id ...]   download the photos (judging/fish/img/, not in git) and build contact
                                                   sheets per species (judging/fish/sheets/<species id>/), 12 tiles each,
                                                   observation by observation; prints tile number -> photo, observation,
                                                   iNat annotation; ids = species (s091) or teaching entries (t01)
    python3 tools/judging_fish.py big <photo>      the 1024 px version, for a closer look
    python3 tools/judging_fish.py todo             species with candidates not judged yet
    python3 tools/judging_fish.py --check [id ...] check judging/fish/<species id>.json, write nothing (exit 1 on error)
    python3 tools/judging_fish.py [id ...]         check, then import every species that passes into suggest.json "fish"

judging/fish/<species id>.json = {"species": id, "photos": {photo: {view, phase, quality, loss, keep, species, multi,
crop, unsure, note}}}; suggest.json "fish" {photo: {v, ph, q, cl, k, g, m, c, u, n}} (autosort.js fishSure reads it;
cl omitted when no colour loss, c a crop [l, t, r, b] as the coral pass's), "by" {species: {fish: {by, at, n}}}.
Re-importing a species replaces its candidates' entries; the rest is kept.
"""
import datetime
import json
import os
import sys
import urllib.request
from collections import OrderedDict, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)  # noqa: E731


def load(p, d=None):
    try:
        return json.load(open(P(p), encoding="utf-8"))
    except FileNotFoundError:
        return d


FISH = load("fish.json", {"species": [], "teach": []})
SP = {s["id"]: s for s in FISH["species"]}
CAND = (load("fish-cand.json", {}) or {}).get("cand", {})
CUR = (load("curation.json", {}) or {}).get("fish") or {}
VIEWS = ("whole", "part", "school")
# Phases named in the IMR fish presentation (fish.json teach "phase": juveniles, sub-adults, adults, males, females,
# intermediate and terminal phases); "unknown" when the photo cannot tell. Never another category (AGENTS.md rule 2).
PHASES = ("juvenile", "subadult", "adult", "intermediate", "terminal", "female", "male", "unknown")
# Colour loss (Pierre, 2026-11-04: the "cast" is a level of colour loss, whatever its hue): how much of the fish's own
# colours the water or the light took away.
LOSS = ("none", "slight", "strong", "monochrome")
KEEP = ("best", "alt", "dup")
FIELDS = {"view", "phase", "quality", "loss", "keep", "species", "multi", "crop", "unsure", "note"}
# Crop calibration, as tools/judging_cand.py CROP_K (measured on 79 of Pierre's coral crops, 2026-11-03: the agent cut
# about twice as much as he does; halving each trim brought the overlap from 0.75 to 0.86). Re-measure on his first fish
# crops before changing it.
CROP_K = 0.5


def ids(args):
    """Species ids from species or teaching ids (all species with candidates when none)."""
    if not args:
        return [s for s in CAND if CAND[s]]
    T = {t["id"]: t for t in FISH["teach"]}
    out = []
    for a in args:
        out += [s for s in (T[a].get("species") or []) if s in CAND] if a in T else [a]
    return out


def cands(sid):
    """Candidates still waiting for Pierre's decision (not added, rejected, excluded or sent elsewhere)."""
    done = {**(CUR.get("add") or {}), **(CUR.get("seen") or {}), **(CUR.get("exclude") or {}), **(CUR.get("out") or {})}
    return [p for p in CAND.get(sid, []) if p["f"] not in done]


def fetch(p, size="medium"):
    out = P("judging", "fish", "img", f"{p['f']}{'-l' if size == 'large' else ''}.jpg")
    if os.path.exists(out) and os.path.getsize(out):
        return out
    os.makedirs(os.path.dirname(out), exist_ok=True)
    u = p["src"].replace("/original.", f"/{size}.")
    req = urllib.request.Request(u, headers={"User-Agent": "coral-id-imr/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        open(out, "wb").write(r.read())
    return out


def sheet(sid, k, L):
    """One contact sheet of up to 12 photos (4 per row), each 360 px high, numbered from 1."""
    from PIL import Image, ImageDraw, ImageFont
    H, GAP = 360, 8
    ims = []
    for p in L:
        try:
            im = Image.open(fetch(p)).convert("RGB")
        except Exception as e:  # noqa: BLE001
            print(f"  could not load {p['f']}: {e}")
            im = Image.new("RGB", (H, H), (90, 90, 90))
        ims.append(im.resize((max(1, round(im.width * H / im.height)), H)))
    rows = [ims[i:i + 4] for i in range(0, len(ims), 4)]
    W = max(sum(i.width for i in r) + GAP * (len(r) - 1) for r in rows)
    S = Image.new("RGB", (W, len(rows) * H + GAP * (len(rows) - 1)), (255, 255, 255))
    d = ImageDraw.Draw(S)
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 34)
    except OSError:
        font = ImageFont.load_default()
    n = 12 * k
    for y, r in enumerate(rows):
        x = 0
        for im in r:
            n += 1
            S.paste(im, (x, y * (H + GAP)))
            d.rectangle([x, y * (H + GAP), x + 58, y * (H + GAP) + 46], fill=(0, 0, 0))
            d.text((x + 8, y * (H + GAP) + 4), str(n), fill=(255, 255, 0), font=font)
            x += im.width + GAP
    out = P("judging", "fish", "sheets", sid, f"{k + 1}.jpg")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    S.save(out, quality=85)
    return os.path.relpath(out, ROOT)


def cmd_sheets(names):
    for sid in names:
        L = cands(sid)
        if not L:
            continue
        s = SP.get(sid, {})
        G = OrderedDict()
        for p in L:
            G.setdefault(p["o"], []).append(p)
        L = [p for g in G.values() for p in g]  # observation by observation
        print(f"## {sid} {s.get('name')} ({s.get('common', '')}): {len(L)} photos in {len(G)} observations")
        for k in range(0, len(L), 12):
            print(sheet(sid, k // 12, L[k:k + 12]))
        for i, p in enumerate(L, 1):
            extra = [p.get("loc", ""), p.get("lic", "")] + (["own"] if p.get("own") else []) + ([f"iNat: {p['st']}"] if p.get("st") else [])
            print(f"  {i} {p['f']}  obs {p['o'].rsplit('/', 1)[-1]}  ({', '.join(x for x in extra if x)})")


def check(sid):
    E = []
    j = load(f"judging/fish/{sid}.json")
    if j is None:
        return [f"{sid}: no judging/fish/{sid}.json"], None
    if not isinstance(j, dict) or not isinstance(j.get("photos"), dict):
        return [f'{sid}: must be {{"species": ..., "photos": {{photo: judgment}}}}'], None
    if set(j) - {"species", "photos"}:
        E.append(f"{sid}: unknown top-level keys {sorted(set(j) - {'species', 'photos'})}")
    if j.get("species") != sid:
        E.append(f'{sid}: "species" must be "{sid}" (the file name)')
    mine = {p["f"]: p for p in cands(sid)}
    best = defaultdict(list)
    for f, x in j["photos"].items():
        at = f"{sid}/{f}"
        if f not in mine:
            E.append(f"{at}: not a candidate waiting for {sid}")
            continue
        if not isinstance(x, dict):
            E.append(f"{at}: must be an object")
            continue
        if set(x) - FIELDS:
            E.append(f"{at}: unknown fields {sorted(set(x) - FIELDS)}")
        g = x.get("species")
        if g is not None:
            if g == sid:
                E.append(f'{at}: omit "species" when the photo shows {sid}')
            elif g not in ("exclude", "not") and g not in SP:
                E.append(f'{at}: species must be "exclude", "not" or a species id of fish.json, not {g!r}')
            if "keep" in x:
                E.append(f'{at}: omit "keep" when "species" is set')
            if not x.get("note"):
                E.append(f'{at}: note required when "species" is set')
        else:
            if x.get("view") not in VIEWS:
                E.append(f"{at}: view must be one of {VIEWS}")
            if x.get("phase") not in PHASES:
                E.append(f"{at}: phase must be one of {PHASES}")
            if x.get("quality") not in (1, 2, 3):
                E.append(f"{at}: quality must be 1, 2 or 3")
            if x.get("loss") not in LOSS:
                E.append(f"{at}: loss must be one of {LOSS}")
            if x.get("keep") not in KEEP:
                E.append(f"{at}: keep must be one of {KEEP}")
            elif x["keep"] == "best":
                best[mine[f]["o"]].append(f)
        if "multi" in x and x["multi"] is not True:
            E.append(f"{at}: multi is true or omitted")
        u = x.get("unsure", [])
        if not isinstance(u, list) or set(u) - (FIELDS - {"unsure", "note"}):
            E.append(f"{at}: unsure must be a list of field names")
        elif u and not x.get("note"):
            E.append(f"{at}: note required when unsure is not empty")
        if len(x.get("note", "")) > 140:
            E.append(f"{at}: note longer than 140 characters")
        c = x.get("crop")
        if c is not None and not (isinstance(c, list) and len(c) == 4 and all(isinstance(v, (int, float)) for v in c)
                                  and 0 <= c[0] < c[2] <= 1 and 0 <= c[1] < c[3] <= 1):
            E.append(f"{at}: crop must be [left, top, right, bottom] fractions of the photo, 0 <= left < right <= 1, "
                     "0 <= top < bottom <= 1")
    missing = [f for f in mine if f not in j["photos"]]
    if missing:
        E.append(f"{sid}: {len(missing)} candidate(s) not judged yet, e.g. {missing[:3]}")
    obs = {mine[f]["o"] for f, x in j["photos"].items() if f in mine and isinstance(x, dict) and not x.get("species")}
    for o in obs:
        if len(best.get(o, [])) != 1:
            E.append(f"{sid}: observation {o}: {len(best.get(o, []))} photos marked best; exactly one")
    return E, j


def entry(x):
    """judging file fields -> suggest.json "fish" short keys (autosort.js fishSure)."""
    e = {}
    if x.get("species"):
        e["g"] = x["species"]
    else:
        e.update(v=x["view"], ph=x["phase"], q=x["quality"], k=x["keep"])
        if x.get("loss", "none") != "none":
            e["cl"] = x["loss"]
    c = x.get("crop")
    if c and c != [0, 0, 1, 1]:
        l, t, r, b = c  # calibrated toward Pierre's crops (CROP_K): each trim kept at CROP_K of its size
        c = [round(l * CROP_K, 3), round(t * CROP_K, 3), round(1 - (1 - r) * CROP_K, 3), round(1 - (1 - b) * CROP_K, 3)]
        if (c[2] - c[0]) * (c[3] - c[1]) < 0.97:  # a trim of a few % is no crop
            e["c"] = c
    if x.get("multi"):
        e["m"] = 1
    if x.get("unsure"):
        e["u"] = sorted(x["unsure"])
    if x.get("note"):
        e["n"] = x["note"]
    return e


def cmd_import(names, only_check, by):
    if not names and os.path.isdir(P("judging", "fish")):
        names = sorted(x[:-5] for x in os.listdir(P("judging", "fish")) if x.endswith(".json"))
    if not names:
        sys.exit("Nothing in judging/fish/ yet.")
    ok, bad = {}, []
    for sid in names:
        E, j = check(sid)
        for e in E:
            print("ERROR:", e)
        (bad.append(sid) if E else ok.__setitem__(sid, j))
    print(f"{len(ok)} species file(s) pass, {len(bad)} fail{': ' + ', '.join(bad) if bad else ''}.")
    if only_check or not ok:
        sys.exit(1 if bad else 0)
    S = load("suggest.json", {}) or {}
    S.setdefault("by", {})
    Sf = S.setdefault("fish", {})
    stamp = datetime.date.today().isoformat()
    for sid, j in ok.items():
        for p in CAND.get(sid, []):
            Sf.pop(p["f"], None)
        for f, x in j["photos"].items():
            Sf[f] = entry(x)
        S["by"].setdefault(sid, {})["fish"] = {"by": by, "at": stamp, "n": len(j["photos"])}
    S["fish"] = dict(sorted(Sf.items()))
    with open(P("suggest.json"), "w", encoding="utf-8") as fh:
        json.dump(S, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print(f'Imported {len(ok)} species file(s): {len(S["fish"])} fish candidates judged in suggest.json "fish".')
    sys.exit(1 if bad else 0)


def cmd_todo():
    Sf = (load("suggest.json", {}) or {}).get("fish", {})
    T = [(sid, sum(1 for p in cands(sid) if p["f"] not in Sf), len(cands(sid))) for sid in CAND]
    T = [t for t in T if t[1]]
    for sid, a, b in T:
        print(f"{sid} {SP.get(sid, {}).get('name')}: {a} of {b} not judged")
    print(f"{sum(t[1] for t in T)} fish candidates not judged in {len(T)} species.")


if __name__ == "__main__":
    a = sys.argv[1:]
    BY = a[a.index("--by") + 1] if "--by" in a else "claude"
    rest = [x for x in a if not x.startswith("--") and x != BY]
    if rest[:1] == ["sheets"]:
        cmd_sheets(ids(rest[1:]))
    elif rest[:1] == ["big"]:
        p = next((p for L in CAND.values() for p in L if p["f"] == rest[1]), None)
        print(os.path.relpath(fetch(p, "large"), ROOT) if p else f"Unknown candidate {rest[1]}")
    elif rest[:1] == ["todo"]:
        cmd_todo()
    else:
        cmd_import(ids(rest) if rest else [], "--check" in a, BY)
