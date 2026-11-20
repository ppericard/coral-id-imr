#!/usr/bin/env python3
"""Fish candidate pass: the pre-sort of fish-cand.json, on the fish judging rubric (judging/FISH.md).

One fish judging vocabulary (Pierre, 2026-11-04): a candidate is judged on the same visual code as the game photos
(judging/FISH.md "Tags": view, whole, light, colour loss, clarity, size in the frame, count / subject obvious, the
juvenile, camouflage and out-of-water flags, ease 1-5), plus what only a candidate needs: keep (best / alt / dup within
its observation), the IMR phase when the photo shows one, a suggested crop. **Visual criteria only**: the species is the
iNaturalist identification by human experts (Research Grade, or Pierre's own), taken as given; the pass never says
whether a photo shows the right species. Its sure decisions (autosort.js fishSure) go through the admin's auto-sort once
the fish curation exists (admin plan PR 4); nothing here writes curation.json.

    python3 tools/judging_fish.py sheets [id ...]   download the photos (judging/fish/img/, not in git) and build contact
                                                   sheets per species (judging/fish/sheets/<species id>/), 12 tiles at
                                                   most, observation by observation, an observation never split over two
                                                   sheets (one of more than 12 photos fills sheets of its own), so its
                                                   near-duplicates are side by side; prints tile number -> photo,
                                                   observation, iNat annotation; ids = species (s091) or teaching entries
                                                   (t01)
    python3 tools/judging_fish.py big <photo>      the 1024 px version, for a closer look
    python3 tools/judging_fish.py todo             species with candidates not judged yet
    python3 tools/judging_fish.py rep              re-apply the reference flag (fish-cand.json rep) to suggest.json "fish"
    python3 tools/judging_fish.py codes            re-apply the judging files' codes, keep, phase, crop, box, unsure
                                                   fields and notes to the candidates already judged in suggest.json
                                                   "fish" (a re-judge of some photos, e.g. the other species split, Q323;
                                                   the crops that save a photo, Q430), dating the pass of each species
                                                   it changed (the auto-sort's route back reads that date)
    python3 tools/judging_fish.py one [--check]    one judgement per photo (Pierre, 2026-11-15): copy the candidate
                                                   judgement of a photo that is also a reference photo onto its copy in
                                                   tools/fish_judge.json (code and keep); --check lists the divergences
                                                   and exits 1 on any (tests/onejudgement.test.js)
    python3 tools/judging_fish.py watermark [--check]  the watermark pass (judging/fish-watermark.json, Q373): the flag w
                                                   written into each listed photo's single judgement (its candidate file,
                                                   else tools/fish_judge.json); then run codes and one. --check lists
                                                   the listed photos whose code lacks it (exit 1 on any)
    python3 tools/judging_fish.py --check [id ...] check judging/fish/<species id>.json, write nothing (exit 1 on error)
    python3 tools/judging_fish.py [id ...]         check, then import every species that passes into suggest.json "fish"
    --subject seaslug (any command above but rep, one and watermark): the sea slugs' candidates instead (seaslug-cand.json,
                                                   tools/fetch_seaslugs.py), on their rubric (judging/SEASLUG.md:
                                                   tools/fish_judge.py RUBRICS "seaslug"): judging/seaslug/<taxon id>.json,
                                                   imported into suggest.json "seaslug"; ids = iNaturalist taxon ids (the
                                                   keys of seaslug-cand.json) or scientific names; no phase, the animal's box bb as the fish's, keep
                                                   optional (one photo per observation: read as best), and the egg rule
                                                   (#970's filter 2): {"egg": true} and no code excludes an egg-mass photo

judging/fish/<species id>.json = {"photos": {photo: {code, keep, phase, crop, bb, unsure, note}}}; suggest.json "fish"
{photo: {jt, e, k, ph, c, bb, u, n}} (autosort.js fishSure reads it): jt the tags and e the ease after the rubric's caps
(tools/fish_judge.py cap, the same as the game photos' jt and e in fish-photos.json), c the proposed crop, bb the fish's
box (judging/FISH.md "The fish's box": every photo whose code passes the tile rule; tools/fish_game.py cuts its tile); "by" {species: {fish: {by, at, n}}}. Re-importing a species replaces its candidates' entries; the rest is kept.
"""
import datetime
import json
import os
import sys
import urllib.request
from collections import Counter, OrderedDict, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fish_judge import RUBRICS, cap  # noqa: E402  the rubrics' codes and caps, one for game photos and candidates
from fish_game import box_in, box_ok  # noqa: E402  the fish's box, as the tile tool reads it
# A box narrower or shorter than this share of the photo is a mistake, not an animal (the tile needs 320 px of the original).
MIN_BB = 0.02

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)  # noqa: E731


def load(p, d=None):
    try:
        return json.load(open(P(p), encoding="utf-8"))
    except FileNotFoundError:
        return d


# The subjects this pass judges (use() switches; fish by default). Each: its candidates, its judging files, its rubric
# (tools/fish_judge.py RUBRICS), the fields a judgement may hold, its phases, and the keep a judgement without one reads
# (None: keep is required). Sea slugs (Pierre, 2026-11-15, Q369, Q377): one photo per observation (tools/fetch_seaslugs.py),
# so keep reads best; no phase (rule C2: no presentation names one); the animal's box bb as the fish's, for the Find the X
# tile (Pierre, 2026-11-19, Q437: judging/SEASLUG.md "The animal's box"); egg, #970's filter 2 (judging/SEASLUG.md "Egg masses").
SUBJECTS = {
    "fish": {"dir": os.path.join("judging", "fish"), "cand": "fish-cand.json", "doc": "judging/FISH.md", "eg": "p1g0sm14",
             "fields": {"code", "keep", "phase", "crop", "bb", "unsure", "note"}, "keep": None},
    "seaslug": {"dir": os.path.join("judging", "seaslug"), "cand": "seaslug-cand.json", "doc": "judging/SEASLUG.md",
                "eg": "d1g0sl15", "fields": {"code", "keep", "crop", "bb", "egg", "unsure", "note"}, "keep": "best"},
}
SUBJECT = "fish"
CFG = SUBJECTS[SUBJECT]
JDIR = CFG["dir"]
CODE = RUBRICS[SUBJECT]["code"]
NEW_COUNT = RUBRICS[SUBJECT]["count"]
FISH = load("fish.json", {"species": [], "teach": []})
SP = {s["id"]: s for s in FISH["species"]}
CAND = (load("fish-cand.json", {}) or {}).get("cand", {})
CUR = (load("curation.json", {}) or {}).get("fish") or {}
TEACH = {t["id"]: t for t in FISH["teach"]}
# The teaching entry of each species (its first level-1 entry): its dimorph flag, which adds the phase flag.
ENTRY = {}
for _t in FISH["teach"]:
    if _t.get("level") == 1:
        for _s in _t.get("species") or []:
            ENTRY.setdefault(_s, _t)
# The sex and colour phases the IMR fish presentation names (fish.json teach "phase"), when the photo shows one; a
# juvenile is the code's j flag, an adult needs no tag. Never another category (rule C2).
PHASES = ("subadult", "intermediate", "terminal", "female", "male")
KEEP = ("best", "alt", "dup")
FIELDS = CFG["fields"]


def use(subject):
    """Points the pass at a subject of SUBJECTS: its candidates, species, judging files, rubric and fields. Sea slugs:
    seaslug-cand.json keyed by iNaturalist taxon id, the species of tools/seaslugs.json, no teaching entry (no phase, no
    juvenile class), their own curation.json key (none yet), never the fish's."""
    global SUBJECT, CFG, JDIR, CODE, NEW_COUNT, SP, CAND, CUR, TEACH, ENTRY, FIELDS
    if subject not in SUBJECTS:
        sys.exit(f"Unknown subject {subject!r}: one of {', '.join(SUBJECTS)}")
    SUBJECT, CFG = subject, SUBJECTS[subject]
    JDIR, FIELDS = CFG["dir"], CFG["fields"]
    CODE, NEW_COUNT = RUBRICS[subject]["code"], RUBRICS[subject]["count"]
    CAND = (load(CFG["cand"], {}) or {}).get("cand", {})
    CUR = (load("curation.json", {}) or {}).get(subject) or {}
    if subject == "fish":
        SP = {s["id"]: s for s in FISH["species"]}
        TEACH = {t["id"]: t for t in FISH["teach"]}
        ENTRY = {s: t for t in reversed(FISH["teach"]) if t.get("level") == 1 for s in t.get("species") or []}
    else:
        src = load(os.path.join("tools", "seaslugs.json"), {"species": []}) or {"species": []}
        SP = {str(s["inat"]): {"id": str(s["inat"]), "name": s["name"]} for s in src.get("species", []) if s.get("inat")}
        # The species with no name yet (tools/seaslug_informal.json, Q389 (2)) by their key, and the genus units'
        # genus-level candidates (tools/fetch_seaslugs.py --genus-level, Q389 (1)) by their genus's name: the same rubric,
        # each list its own judging file (judging/seaslug/<key>.json).
        inf = load(os.path.join("tools", "seaslug_informal.json"), {"species": []}) or {"species": []}
        SP.update({s["key"]: {"id": s["key"], "name": s["name"]} for s in inf.get("species", [])})
        gen = dict.fromkeys(s.get("genus") for s in src.get("species", []) if s.get("genus"))
        SP.update({g: {"id": g, "name": g + " (genus level)"} for g in gen})
        TEACH, ENTRY = {}, {}


def ids(args):
    """Species ids from species or teaching ids (all species with candidates when none); a scientific name gives its
    species (a sea slug's id is its iNaturalist taxon id)."""
    if not args:
        return [s for s in CAND if CAND[s]]
    T = TEACH
    names = {s.get("name"): k for k, s in SP.items()}
    out = []
    for a in args:
        out += [s for s in (T[a].get("species") or []) if s in CAND] if a in T else [a if a in SP or a not in names else names[a]]
    return out


def cands(sid):
    """Candidates still waiting for Pierre's decision (not added, rejected, excluded or sent elsewhere)."""
    done = {**(CUR.get("add") or {}), **(CUR.get("seen") or {}), **(CUR.get("exclude") or {}), **(CUR.get("out") or {})}
    return [p for p in CAND.get(sid, []) if p["f"] not in done]


def added(sid):
    """{observation: [its photos Pierre added to species sid]}: an observation whose other photos come later (every photo
    of an observation is a candidate since Pierre, 2026-11-08) already has a photo in play, its best so far. They are
    shown first on its sheet as context, never judged again (Codex review #715)."""
    A = CUR.get("add") or {}
    out = OrderedDict()
    for p in CAND.get(sid, []):
        if A.get(p["f"]) == sid:
            out.setdefault(p["o"], []).append(p)
    return out


def groups(sid):
    """The contact sheets' groups of species sid, observation by observation: (context, waiting) per observation with a
    photo waiting, context being the photos of it Pierre already added (added)."""
    A, G = added(sid), OrderedDict()
    for p in cands(sid):
        G.setdefault(p["o"], []).append(p)
    return [(A.get(o, []), L) for o, L in G.items()]


def fetch(p, size="medium"):
    out = P(JDIR, "img", f"{p['f']}{'-l' if size == 'large' else ''}.jpg")
    if os.path.exists(out) and os.path.getsize(out):
        return out
    os.makedirs(os.path.dirname(out), exist_ok=True)
    u = p["src"].replace("/original.", f"/{size}.")
    req = urllib.request.Request(u, headers={"User-Agent": "coral-id-imr/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        open(out, "wb").write(r.read())
    return out


TILES = 12  # photos per contact sheet at most


def ticks(im):
    """Tick marks every tenth of the photo on its four edges (longer at the half), to read the fish's box (bb) to half a
    tenth without a grid over the fish (judging/FISH.md "The fish's box")."""
    from PIL import ImageDraw
    d = ImageDraw.Draw(im)
    W, H = im.size
    for k in range(1, 10):
        n = 16 if k == 5 else 9
        x, y = round(W * k / 10), round(H * k / 10)
        for a, b in (((x, 0), (x, n)), ((x, H - 1 - n), (x, H - 1)), ((0, y), (n, y)), ((W - 1 - n, y), (W - 1, y))):
            d.line([a, b], fill=(0, 0, 0), width=3)
            d.line([a, b], fill=(255, 255, 255), width=1)
    return im


def pack(groups, size=TILES):
    """The contact sheets of a species: its observations' photos (groups, one list per observation, in order) in sheets of
    at most `size`, an observation never split over two sheets: one that does not fit in what is left of a sheet starts the
    next; one of more than `size` photos (every photo of an observation is a candidate since Pierre, 2026-11-08) fills
    sheets of its own. Its photos side by side are what lets the judge mark the near-duplicates (keep dup)."""
    out = []
    for g in groups:
        if out and len(out[-1]) + len(g) <= size:
            out[-1] += g
            continue
        out += [list(g[i:i + size]) for i in range(0, len(g), size)]
    return out


def sheet(sid, k, L, start=0):
    """One contact sheet of up to 12 photos (4 per row), each 360 px high, numbered from start + 1."""
    from PIL import Image, ImageDraw, ImageFont
    H, GAP = 360, 8
    ims = []
    for p in L:
        try:
            im = Image.open(fetch(p)).convert("RGB")
        except Exception as e:  # noqa: BLE001
            print(f"  could not load {p['f']}: {e}")
            im = Image.new("RGB", (H, H), (90, 90, 90))
        ims.append(ticks(im.resize((max(1, round(im.width * H / im.height)), H))))
    rows = [ims[i:i + 4] for i in range(0, len(ims), 4)]
    W = max(sum(i.width for i in r) + GAP * (len(r) - 1) for r in rows)
    S = Image.new("RGB", (W, len(rows) * H + GAP * (len(rows) - 1)), (255, 255, 255))
    d = ImageDraw.Draw(S)
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 34)
    except OSError:
        font = ImageFont.load_default()
    n = start
    for y, r in enumerate(rows):
        x = 0
        for im in r:
            n += 1
            S.paste(im, (x, y * (H + GAP)))
            d.rectangle([x, y * (H + GAP), x + 58, y * (H + GAP) + 46], fill=(0, 0, 0))
            d.text((x + 8, y * (H + GAP) + 4), str(n), fill=(255, 255, 0), font=font)
            x += im.width + GAP
    out = P(JDIR, "sheets", sid, f"{k + 1}.jpg")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    S.save(out, quality=85)
    return os.path.relpath(out, ROOT)


def cmd_sheets(names):
    for sid in names:
        G = groups(sid)
        if not G:
            continue
        s = SP.get(sid, {})
        ctx = {p["f"] for c, _ in G for p in c}
        L = [p for c, w in G for p in c + w]  # observation by observation, what Pierre added first
        print(f"## {sid} {s.get('name')} ({s.get('common', '')}): {len(L) - len(ctx)} photos to judge in {len(G)} observations"
              f"{f', {len(ctx)} added by Pierre shown as context' if ctx else ''}")
        n = 0
        for k, S in enumerate(pack([c + w for c, w in G])):
            print(sheet(sid, k, S, n))
            n += len(S)
        for i, p in enumerate(L, 1):
            extra = [p.get("loc", ""), p.get("lic", "")] + (["own"] if p.get("own") else []) + ([f"iNat: {p['st']}"] if p.get("st") else [])
            if p["f"] in ctx:
                extra.append("added by Pierre: context, not to judge")
            print(f"  {i} {p['f']}  obs {p['o'].rsplit('/', 1)[-1]}  ({', '.join(x for x in extra if x)})")


def check(sid):
    E = []
    jd = JDIR.replace(os.sep, "/")
    j = load(f"{jd}/{sid}.json")
    if j is None:
        return [f"{sid}: no {jd}/{sid}.json"], None
    if not isinstance(j, dict) or not isinstance(j.get("photos"), dict):
        return [f'{sid}: must be {{"photos": {{photo: judgment}}}}'], None
    if set(j) - {"photos"}:
        E.append(f"{sid}: unknown top-level keys {sorted(set(j) - {'photos'})}")
    mine = {p["f"]: p for p in cands(sid)}
    # A candidate Pierre has decided on since its judgement (added, rejected, excluded, moved) stays in the file as
    # judged: not checked again, imported unchanged, and its best still counts for its observation.
    decided = {p["f"]: p for p in CAND.get(sid, []) if p["f"] not in mine}
    best, new = defaultdict(list), Counter()  # new: the bests among the photos still waiting
    for f, x in j["photos"].items():
        at = f"{sid}/{f}"
        if f in decided:
            if isinstance(x, dict) and not x.get("egg") and x.get("keep", CFG["keep"]) == "best":
                best[decided[f]["o"]].append(f)
            continue
        if f not in mine:
            E.append(f"{at}: not a candidate of {sid}")
            continue
        if not isinstance(x, dict):
            E.append(f"{at}: must be an object")
            continue
        if set(x) - FIELDS:
            E.append(f"{at}: unknown fields {sorted(set(x) - FIELDS)}")
        if "egg" in x and "egg" in FIELDS:
            # The egg rule (#970's filter 2, judging/SEASLUG.md "Egg masses"): an egg mass with no whole animal
            # recognisable, or a photo that cannot be told apart from one, is excluded: no code, no keep, no doubt.
            if x["egg"] is not True or set(x) - {"egg", "note"}:
                E.append(f"{at}: an egg-mass photo is {{\"egg\": true}} (a note at most): no code, keep, crop or unsure")
            if len(x.get("note", "")) > 140:
                E.append(f"{at}: note longer than 140 characters")
            continue
        if not CODE.match(str(x.get("code", ""))):
            E.append(f"{at}: code must follow {CFG['doc']} \"Tags\" (e.g. {CFG['eg']}), not {x.get('code')!r}")
        elif str(x["code"])[6] not in NEW_COUNT:
            E.append(f"{at}: count m is the code before the split (Q323): o (other species, no risk of confusion) or k "
                     "(other species one could take for the subject)")
        k = x.get("keep", CFG["keep"])
        if k not in KEEP:
            E.append(f"{at}: keep must be one of {KEEP}")
        elif k == "best":
            best[mine[f]["o"]].append(f)
            new[mine[f]["o"]] += 1
        if "phase" in x and x["phase"] not in PHASES:
            E.append(f"{at}: phase is one of {PHASES}, or omitted")
        u = x.get("unsure", [])
        if not isinstance(u, list) or set(u) - (FIELDS - {"unsure", "note", "egg"}):
            E.append(f"{at}: unsure must be a list of field names")
        elif u and not x.get("note"):
            E.append(f"{at}: note required when unsure is not empty")
        if len(x.get("note", "")) > 140:
            E.append(f"{at}: note longer than 140 characters")
        c = x.get("crop")
        c_ok = c is not None and box_ok(c)
        if c is not None and not c_ok:
            E.append(f"{at}: crop must be [left, top, right, bottom] fractions of the photo, 0 <= left < right <= 1, "
                     "0 <= top < bottom <= 1")
        b = x.get("bb")
        if b is not None and not box_ok(b):
            E.append(f"{at}: bb must be the animal's box [left, top, right, bottom], fractions of the photo, 0 <= left < right <= 1, "
                     "0 <= top < bottom <= 1")
        elif b is not None and min(b[2] - b[0], b[3] - b[1]) < MIN_BB:
            E.append(f"{at}: bb is under {MIN_BB:.0%} of the photo's width or height: that is a speck, not an animal's box")
        elif b is not None and c_ok and not box_in(b, c):
            # The code is read on the photo as cropped (judging/FISH.md "A proposed crop"): the crop keeps the fish whole.
            E.append(f"{at}: the crop cuts the animal's box bb: a crop keeps the whole animal (judging/FISH.md \"A proposed crop\")")
    missing = [f for f in mine if f not in j["photos"]]
    if missing:
        E.append(f"{sid}: {len(missing)} candidate(s) not judged yet, e.g. {missing[:3]}")
    # An observation whose photos are all egg masses has no best: it leaves (the egg rule).
    obs = {mine[f]["o"] for f, x in j["photos"].items() if f in mine and isinstance(x, dict) and not x.get("egg")}
    A = added(sid)
    for o in sorted(obs):
        nb = new[o] if o in A else len(best.get(o, []))  # Pierre's add is its best so far: a new one may beat it
        if o in A and nb > 1:
            E.append(f"{sid}: observation {o}: {nb} photos marked best; at most one (Pierre added one of its photos)")
        elif o not in A and nb != 1:
            E.append(f"{sid}: observation {o}: {nb} photos marked best; exactly one")
    return E, j


def entry(sid, x, rep=None):
    """A judging file's record -> suggest.json "fish" (autosort.js fishSure): the tags and ease after the rubric's caps
    (tools/fish_judge.py cap: the phase flag for a dimorph entry, and the reference flag r, which leaves the ease as
    judged, for a candidate whose fish-cand.json record carries `rep`; a juvenile caps nothing). A sea slug's: its
    rubric's caps (no entry: no phase), keep best when the judgement names none, and an egg-mass
    photo as {egg: 1} (the egg rule: never in play)."""
    if x.get("egg"):
        return {"egg": 1, **({"n": x["note"]} if x.get("note") else {})}
    t = ENTRY.get(sid) or {}
    ease, tags = cap(x["code"], bool(t.get("dimorph")), rep, subject=SUBJECT)
    e = {"jt": tags, "e": ease, "k": x.get("keep", CFG["keep"])}
    if x.get("phase"):
        e["ph"] = x["phase"]
    if x.get("crop") and x["crop"] != [0, 0, 1, 1]:
        e["c"] = x["crop"]  # a proposal, as the game photos' (judging/FISH.md "A proposed crop")
    if x.get("bb"):
        e["bb"] = x["bb"]  # the fish's box, for its tile (judging/FISH.md "The fish's box")
    if x.get("unsure"):
        e["u"] = sorted(x["unsure"])
    if x.get("note"):
        e["n"] = x["note"]
    return e


def cmd_import(names, only_check, by):
    if not names and os.path.isdir(P(JDIR)):
        names = sorted(x[:-5] for x in os.listdir(P(JDIR)) if x.endswith(".json"))
    if not names:
        sys.exit(f"Nothing in {JDIR.replace(os.sep, '/')}/ yet.")
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
    Sf = S.setdefault(SUBJECT, {})
    stamp = datetime.date.today().isoformat()
    for sid, j in ok.items():
        for p in CAND.get(sid, []):
            Sf.pop(p["f"], None)
        rep = {p["f"]: p.get("rep") for p in CAND.get(sid, [])}
        for f, x in j["photos"].items():
            Sf[f] = entry(sid, x, rep.get(f))
        S["by"].setdefault(sid, {})[SUBJECT] = {"by": by, "at": stamp, "n": len(j["photos"])}
    S[SUBJECT] = dict(sorted(Sf.items()))
    with open(P("suggest.json"), "w", encoding="utf-8") as fh:
        json.dump(S, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print(f'Imported {len(ok)} species file(s): {len(S[SUBJECT])} {SUBJECT} candidates judged in suggest.json "{SUBJECT}".')
    sys.exit(1 if bad else 0)


def cmd_rep(fields=("jt", "e"), stamp=False):
    """Re-applies the reference flag (fish-cand.json `rep`, tools/fetch_fish.py --rep, tools/fetch_fishbase.py) to the
    judged candidates of suggest.json "fish", from their codes in judging/fish/<species>.json: a candidate tagged since its
    judgement gets the flag r, one no longer tagged loses it, and the ease is the judgement's either way (no reference
    ease point). Only those entries change.
    fields ("codes": also u and n, the crop c and the fish's box bb): re-applies a re-judge of some photos' codes, crops,
    unsure fields and notes (the other species split of 2026-11-09, Q323; the crops that save a photo, Q430) to the
    candidates already judged, without the whole species' --check (a species may hold new candidates not judged yet,
    which the import refuses); waiting or decided alike. A re-judge (stamp) dates the pass of each species it changed
    ("by" {species: {fish: {at}}}, as the import does): the auto-sort's route back reads it (autosort.js sortBack: a photo
    it set aside comes back only on a judgement made since). The subject's (use): suggest.json "seaslug" and
    judging/seaslug/ for the sea slugs, whose codes also re-apply the egg rule."""
    S = load("suggest.json", {}) or {}
    Sf = S.get(SUBJECT) or {}
    n, changed = 0, set()
    for sid, L in CAND.items():
        j = load(f"{JDIR.replace(os.sep, '/')}/{sid}.json")
        if not j:
            continue
        for p in L:
            x, old = (j.get("photos") or {}).get(p["f"]), Sf.get(p["f"])
            if not x or not old or not (CODE.match(str(x.get("code", ""))) or (x.get("egg") is True and "egg" in FIELDS)):
                continue
            new = entry(sid, x, p.get("rep"))
            if any(new.get(k) != old.get(k) for k in fields):
                for k in fields:
                    if k in new:
                        old[k] = new[k]
                    else:
                        old.pop(k, None)
                n += 1
                changed.add(sid)
    if stamp:
        today = datetime.date.today().isoformat()
        for sid in changed:
            b = S.setdefault("by", {}).setdefault(sid, {}).setdefault(SUBJECT, {"by": globals().get("BY", "claude"), "n": 0})
            b["at"] = today
    with open(P("suggest.json"), "w", encoding="utf-8") as fh:
        json.dump(S, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    what = "Reference flag" if fields == ("jt", "e") else "Codes, crops, keep, phase, unsure fields and notes"
    print(f"{what} re-applied: {n} judged candidates changed in suggest.json \"{SUBJECT}\""
          + (f", the pass of {len(changed)} species dated {today}." if stamp and changed else "."))


def one_fix(text, D):
    """tools/fish_judge.json's text with each divergence D (fish_judge.py one_check: code and keep) set to the candidate
    copy, in place: the file keeps its layout (one entry per line), only those values change."""
    import re
    for f, field, old, new in D:
        if field not in ("code", "keep"):
            continue
        pat = re.compile(r'("%s":\s*)"%s"' % (re.escape(f), re.escape(old)))
        text, n = pat.subn(lambda m: m.group(1) + json.dumps(new), text, count=1)
        if n != 1:
            raise SystemExit(f"tools/fish_judge.json: {f} {field} {old!r} not found")
    return text


def cmd_one(only_check, root=None):
    """One judgement per photo (Pierre, 2026-11-15; tools/fish_judge.py one_judgement): the candidate judgement
    (judging/fish/<species>.json) is the single source of a photo judged both as a reference photo and as a candidate.
    --check lists every divergence of tools/fish_judge.json from it (exit 1); without it, copies the candidate's code
    and keep onto the reference copies. A photo judged in two species files that disagree is reported, never settled.
    root: the repository (a test's made-up one)."""
    from fish_judge import cand_judgements, one_check
    root = root or ROOT
    src = os.path.join(root, "tools", "fish_judge.json")
    text = open(src, encoding="utf-8").read()
    D = one_check(json.loads(text), cand_judgements(root))
    for f, field, a, b in D:
        print(f"{'DIVERGES' if only_check else 'copied'}: {f} {field}: tools/fish_judge.json {a!r}, judging/fish {b!r}")
    twice = [d for d in D if d[1] == "twice"]
    if only_check:
        print(f"{len(D)} divergence(s) between the two copies of a photo judged twice"
              + (": python3 tools/judging_fish.py one copies the candidate judgement onto the reference copy" if D else "."))
        sys.exit(1 if D else 0)
    if len(D) > len(twice):
        with open(src, "w", encoding="utf-8") as fh:
            fh.write(one_fix(text, D))
    print(f"{len(D) - len(twice)} reference cop{'y' if len(D) - len(twice) == 1 else 'ies'} set to the candidate judgement"
          + (f"; {len(twice)} photo(s) judged twice as candidates, to settle by hand" if twice else "."))
    sys.exit(1 if twice else 0)


WATERMARK = os.path.join("judging", "fish-watermark.json")


def watermark_fix(root=None, only_check=False):
    """The watermark pass (Pierre, 2026-11-15, Q373; judging/FISH.md "Watermark"): every photo of
    judging/fish-watermark.json "photos" ({photo: what the judge saw}) gets the flag w in its single judgement (one
    judgement per photo): its candidate file judging/fish/<species>.json when it has one, else its code in
    tools/fish_judge.json "photos". The files keep their layout: only those codes change, in place. Returns [(photo,
    file, old code, new code)] of the codes that lacked it (with only_check, nothing is written). A listed photo with no
    judgement anywhere is an error."""
    import re
    from fish_judge import cand_judgements, with_flag
    import fish_game as G
    root = root or ROOT
    marks = (json.load(open(os.path.join(root, WATERMARK), encoding="utf-8")).get("photos") or {})
    cj = cand_judgements(root)
    jpath = os.path.join(root, "tools", "fish_judge.json")
    jtext = open(jpath, encoding="utf-8").read()
    J = json.loads(jtext)
    ref = {f: c for m in (J.get("photos") or {}).values() for f, c in m.items()}
    out, texts = [], {}
    for f in sorted(marks):
        j = cj.get(G.pid(f))
        if j:
            path, old, key = os.path.join(root, "judging", "fish", j["sid"] + ".json"), j["code"], j["f"]
            pat = r'("%s":\s*\{\s*"code":\s*)"%s"' % (re.escape(key), re.escape(old))
        elif f in ref:
            path, old, key = jpath, ref[f], f
            pat = r'("%s":\s*)"%s"' % (re.escape(key), re.escape(old))
        else:
            raise SystemExit(f"{WATERMARK}: {f} has no judgement (judge it first)")
        new = with_flag(old, "w")
        if new == old:
            continue
        out.append((f, os.path.relpath(path, root), old, new))
        if only_check:
            continue
        text = texts.get(path) or (jtext if path == jpath else open(path, encoding="utf-8").read())
        text, n = re.subn(pat, lambda m: m.group(1) + json.dumps(new), text, count=1)
        if n != 1:
            raise SystemExit(f"{os.path.relpath(path, root)}: {key} {old!r} not found")
        texts[path] = text
    for path, text in texts.items():
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(text)
    return out


def cmd_watermark(only_check):
    D = watermark_fix(only_check=only_check)
    for f, path, a, b in D:
        print(f"{'LACKS w' if only_check else 'flagged'}: {f} in {path}: {a} -> {b}")
    if only_check:
        print(f"{len(D)} listed photo(s) whose judgement lacks the watermark flag"
              + (": python3 tools/judging_fish.py watermark" if D else "."))
        sys.exit(1 if D else 0)
    print(f"{len(D)} code(s) flagged w; now python3 tools/judging_fish.py codes, then one.")


def cmd_todo():
    Sf = (load("suggest.json", {}) or {}).get(SUBJECT, {})
    T = [(sid, sum(1 for p in cands(sid) if p["f"] not in Sf), len(cands(sid))) for sid in CAND]
    T = [t for t in T if t[1]]
    for sid, a, b in T:
        print(f"{sid} {SP.get(sid, {}).get('name')}: {a} of {b} not judged")
    print(f"{sum(t[1] for t in T)} {SUBJECT} candidates not judged in {len(T)} species.")


def args(a):
    """(rest, by, subject) of the command line: the values of --by and --subject are theirs, never a species id."""
    val = {k: a[a.index(k) + 1] for k in ("--by", "--subject") if k in a and a.index(k) + 1 < len(a)}
    taken = {a.index(k) + 1 for k in val}
    rest = [x for i, x in enumerate(a) if not x.startswith("--") and i not in taken]
    return rest, val.get("--by", "claude"), val.get("--subject", "fish")


if __name__ == "__main__":
    a = sys.argv[1:]
    rest, BY, subj = args(a)
    if subj != "fish":
        if rest[:1] and rest[0] in ("rep", "one", "watermark"):
            sys.exit(f"{rest[0]}: the fish only (reference photos, the one-judgement copies and the watermark list are theirs)")
        use(subj)
    if rest[:1] == ["sheets"]:
        import slot

        slot.guard("tools/judging_fish.py")  # one heavy run at a time on the machine (rule W24)
        cmd_sheets(ids(rest[1:]))
    elif rest[:1] == ["big"]:
        p = next((p for L in CAND.values() for p in L if p["f"] == rest[1]), None)
        print(os.path.relpath(fetch(p, "large"), ROOT) if p else f"Unknown candidate {rest[1]}")
    elif rest[:1] == ["todo"]:
        cmd_todo()
    elif rest[:1] == ["rep"]:
        cmd_rep()
    elif rest[:1] == ["codes"]:
        cmd_rep(("jt", "e", "k", "ph", "c", "bb", "u", "n", "egg"), stamp=True)
    elif rest[:1] == ["one"]:
        cmd_one("--check" in a)
    elif rest[:1] == ["watermark"]:
        cmd_watermark("--check" in a)
    else:
        cmd_import(ids(rest) if rest else [], "--check" in a, BY)
