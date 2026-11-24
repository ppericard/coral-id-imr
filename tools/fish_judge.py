#!/usr/bin/env python3
"""Fish photo judging (judging/FISH.md): the rubric's code and caps, and the material of a judging pass.

The judgements live in tools/fish_judge.json (one code per photo, e.g. "p1g0sm14": view, whole, light, colour loss,
clarity, size, count, flags, ease 1-5; for some photos a proposed crop [l, t, r, b], curation.json's crop format; the
fish's box; keep, a reference photo judged against its observation's photos). tools/fish_game.py reads them for the
reference photos it puts in play (ref_play: cap, then its judged_sure), tools/judging_fish.py for the candidates (cap).
Until 2026-11-15 this script also wrote them into the stopgap list of fish-photos.json (retired: every fish
photo in play is on R2, fish-game.json). The sea slugs' rubric (judging/SEASLUG.md) is the same code with its own
differences (RUBRICS; cap and with_flag take the subject): tools/judging_fish.py --subject seaslug judges their candidates.
This script:
  - prints the summary of the photos in play (fish-game.json): counts per tag, very easy photos (ease 4-5) per entry,
    circle-1 entries short of them (the circles in force: the content editor's moves in curation.json laid over
    fish.json, tools/fish_inforce.py), the typical-look families (typical_look) with their shares;
  - with --sheets DIR: downloads the photos in play at iNaturalist's medium size (FishBase's whole) into DIR/img and draws
    contact sheets of 12 into DIR/sheets, the material of a judging pass (DIR outside the repository; delete it after);
    --only t28,t47 limits them to some entries, --todo to the photos not judged yet, and each tile carries a 5 x 5 grid
    for the crops; --refs: the units' reference photos (tools/fish_refs.json, tools/fish_refs.py) instead;
  - one judgement per photo (Pierre, 2026-11-15): cand_judgements, one_judgement, one_crops and one_check, the single
    judgement of a photo that is both a reference photo and a candidate (its candidate's judging file; tools/judging_fish.py one);
  - with --boxes DIR: the box pass (judging/FISH.md "The fish's box"): the photos in play (fish-game.json) whose tags pass
    the tile rule (tools/fish_game.py tile_tags) and that have no box yet, the easiest first, one per observation, at most
    --n per entry (--only limits the entries), on sheets of 9 at 420 x 315 px with a 10 x 10 grid; the judge writes each
    fish's box into tools/fish_judge.json boxes. DIR outside the repository; delete it after.
Usage: python3 tools/fish_judge.py [--sheets DIR [--only t28,t47] [--todo] [--refs]] [--boxes DIR [--only ..] [--n N]]
"""
import argparse
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "fish_judge.json"
REFS = ROOT / "tools" / "fish_refs.json"  # the units' reference photos (tools/fish_refs.py)
# The count (7th letter): 1, s, o (other species, no risk of confusion), k (other species one could take for the subject),
# x; m, the older code for other species before the split into o and k, reads as "not sorted yet" (core.js TREE_COUNT),
# never typed in a new judgement (NEW_COUNT, tools/judging_fish.py --check).
# The typed flags: j juvenile, c camouflage, a not a live fish seen in the water (out of the water, a photo of a screen,
# a capture from a video player: judging/FISH.md, 2026-11-19), w a visible watermark or text (Home skips it; it caps
# nothing), in that order.
CODE = re.compile(r"^([pohtd])([01])([gdn])([0-3])([smb])([lms])([1smxok])([jcaw]*)([1-5])$")
FLAGS = "jcaw"
NEW_COUNT = "1sokx"
# The rubrics (judging/FISH.md and judging/SEASLUG.md "Caps"). The sea slugs' code has the fish's seven positions, flags
# and ease, so a code reads the same way wherever it is read (core.js refScore, autosort.js), with their own letters: the
# ventral view v (at most 3, views3), light g or d only, no count m, the flag f (capping nothing). Both rubrics cap a
# partial animal (part4) and the views of views4 at 4, and in a typical-look group (typical_look) the tags of `typical`
# cap nothing; the sea slugs' dorsal view is a good view, so it is not in their views4
# (docs/decisions/2026-11-24-sea-slug-caps-as-the-fish.md). blur2 is the clarity capped at 2: the fish's b
# (docs/decisions/2026-11-19-fish-rubric-gold-set.md), none for the sea slugs. A juvenile (j) caps nothing in either
# rubric (docs/decisions/2026-11-19-fish-juvenile-no-cap.md). No sea slug group is typical-look:
# tools/judging_fish.py passes them no teaching entry.
RUBRICS = {
    "fish": {"code": CODE, "flags": FLAGS, "count": NEW_COUNT, "views3": "", "views4": "htd", "part4": True,
             "blur2": "b", "typical": "0c"},
    "seaslug": {"code": re.compile(r"^([pohtdv])([01])([gd])([0-3])([smb])([lms])([1sokx])([jcawf]*)([1-5])$"),
                "flags": "jcawf", "count": NEW_COUNT, "views3": "v", "views4": "ht", "part4": True, "blur2": "",
                "typical": "0c"},
}


def with_flag(code, x, subject="fish"):
    """A judged code (the subject's rubric code) with typed flag x added in the rubric's order, the ease unchanged."""
    R = RUBRICS[subject]
    m = R["code"].match(code)
    if not m:
        raise ValueError(f"bad code {code!r}")
    fl = set(m.group(8)) | {x}
    return code[:7] + "".join(c for c in R["flags"] if c in fl) + m.group(9)


# The phase flag p (judging/FISH.md "Tags"): every photo of a species whose sexes or colour phases look different, by a
# cited source. Two sources, either one enough: the IMR presentation's phase lines (its teaching entry marked dimorph in
# tools/fish_source.json: the Parrotfishes, the Anthias) and the cited phase list tools/fish_phases.json, whose sex or
# ip_tp (initial and terminal phases) verdict is "yes" (docs/decisions/2026-11-20-fish-phases-sourced.md: any solid cited
# source establishes a species' phases; Pierre, 2026-11-20 19:28). A sub-adult alone ("sub") adds no flag: its photo keeps
# the juvenile card's Sub-adult (quiz.js juvCard); a "conflict" adds none either (rule C5: not settled here).
PHASE_LIST = ROOT / "tools" / "fish_phases.json"
PHASE_KINDS = ("sex", "ip_tp")
_PHASE_SP = {}


def phase_species(path=None):
    """{fish.json species id: the verdicts of PHASE_KINDS that say "yes" for it} from the cited phase list, read once per
    path; a species with none is not listed."""
    p = Path(path) if path else PHASE_LIST
    if p not in _PHASE_SP:
        doc = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
        out = {}
        for n, v in doc.items():
            if n.startswith("_") or not isinstance(v, dict) or not v.get("sp"):
                continue
            kinds = tuple(k for k in PHASE_KINDS if v.get(k) == "yes")
            if kinds:
                out[v["sp"]] = kinds
        _PHASE_SP[p] = out
    return _PHASE_SP[p]


def phase_flag(sid, entry=None, path=None):
    """Whether the photos of species sid carry the phase flag p: its teaching entry (fish.json teach) marked dimorph, or
    the cited phase list's sex or ip_tp verdict "yes" for it."""
    return bool((entry or {}).get("dimorph")) or sid in phase_species(path)


EARLY = 4  # very easy (judging/FISH.md): the photos the draw favours at an entry's start (model.js photoSet)
VARIETY = 3  # model.js PICKD.VARIETY: an entry with fewer very easy photos shows its 3 easiest instead
WANT = 5  # at least 5 very easy photos per circle-1 entry
# A reference photo (`rep`: the photo a reference source uses to represent the species, FishBase's main picture or
# iNaturalist's taxon photo) gets the flag r and nothing else: its ease is its judgement's, as on every other route (one
# judgement per photo: docs/decisions/2026-11-19-fish-reference-from-photo.md).


def cap(code, phase, rep=None, subject="fish", typical=False):
    """(ease after the caps, tags with the phase and reference flags): judging/FISH.md "Caps" and "Reference photos".
    A juvenile (flag j) caps nothing (Q435). rep: the photo's `rep` (a reference source shows it for the species:
    FishBase's main picture, iNaturalist's taxon photo), which adds the flag r and never changes the ease (one judgement
    per photo, whatever its route in).
    subject: the rubric (RUBRICS), "seaslug" for judging/SEASLUG.md "Caps": a dorsal view caps nothing, strong blur
    neither (blur2), a ventral view at most 3, a partial animal and a head-on or rear view at most 4 as the fish's.
    typical: the photo's family has the typical look (typical_look: buried or camouflaged is how it is seen), so the
    rubric's `typical` tags (the fish's partial 0 and camouflage c) cap nothing (Q456, Pierre, 2026-11-23)."""
    R = RUBRICS[subject]
    m = R["code"].match(code)
    if not m:
        raise ValueError(f"bad code {code!r}")
    v, w, light, loss, clarity, _z, n, fl, e = m.groups()
    fl = fl + ("p" if phase and "p" not in fl else "") + ("r" if rep else "")
    e = int(e)
    free = R["typical"] if typical else ""  # the tags the family's usual look frees (Q456)
    # Strong blur (b: the outline or pattern smeared) is a hard photo, kept in play (judging/FISH.md "Strong blur").
    if n == "x" or loss == "3" or clarity in R["blur2"]:
        e = min(e, 2)
    # The phase flag p caps nothing (a sex or colour phase is a species-level difficulty; an Anthias or a parrotfish is
    # easy to call one at the family level), kept for the species questions and explanation cards.
    # light n is the night livery only (rubric 6: a night or resting colour pattern unlike the day one); a fish lit by a flash or a lamp on a dark background is good light (g) and caps nothing.
    part = w == "0" and "0" not in free
    if set(fl) & (set("ca") - set(free)) or light == "n" or loss == "2" or v in R["views3"] or (part and not R["part4"]):
        e = min(e, 3)
    # A head-on, tail or top view and a partial fish: one step softer (Q458 step 1).
    if v in R["views4"] or (part and R["part4"]):
        e = min(e, 4)
    return e, code[:7] + fl


# The typical look (Q456, Pierre, 2026-11-23 17:20; judging/FISH.md "Caps"): a family whose usual look is buried or
# camouflaged, by a declared rule, never by hand: at least TYPICAL_SHARE of its photos in play tagged partial (whole 0) or
# camouflage (c). The rule of the REE-85 study (docs/reviews/2026-11-23-fish-ease-vs-answers.md "The typical-look
# families"), declared on the photos in play before any answer was read; its pool is the same: the photos fish-game.json
# lists (typical_now), whose tags never depend on the ease, so re-capping never moves the families.
TYPICAL_SHARE = 0.5
_TYPICAL = {}


def typical_shares(fish, recs):
    """{teaching id: (photos tagged partial 0 or camouflage c, photos)} of the level-1 entries (fish.json teach; a species
    counts for its first level-1 entry, as tools/fish_game.py entries) over the photo records recs ({sp, jt})."""
    of = {}
    for t in (fish or {}).get("teach") or []:
        if t.get("level") == 1:
            for s in t.get("species") or []:
                of.setdefault(s, t["id"])
    out = {}
    for r in recs:
        t, jt = of.get(r.get("sp")), str(r.get("jt") or "")
        if t and len(jt) >= 7:
            h, n = out.get(t, (0, 0))
            out[t] = (h + (jt[1] == "0" or "c" in jt[7:]), n + 1)
    return out


def typical_look(fish, recs, share=TYPICAL_SHARE):
    """The teaching ids whose usual look is buried or camouflaged: at least `share` of their photos (recs) tagged partial
    or camouflage (typical_shares)."""
    return {t for t, (h, n) in typical_shares(fish, recs).items() if n and h >= share * n}


def typical_now(root=None):
    """typical_look on the photos in play as fish-game.json lists them, with fish.json's entries, read once per root
    (the repository by default); an empty set with neither file."""
    r = Path(root or ROOT)
    if r not in _TYPICAL:
        import fish_game as G
        fp = r / "fish.json"
        fish = json.loads(fp.read_text(encoding="utf-8")) if fp.exists() else {}
        doc = G.load(str(r), G.OUT_FILE, {"photos": {}}) or {"photos": {}}
        _TYPICAL[r] = typical_look(fish, [p for L in (doc.get("photos") or {}).values() for p in L])
    return _TYPICAL[r]


def load_src():
    s = json.loads(SRC.read_text(encoding="utf-8"))
    return {f: c for entry in s["photos"].values() for f, c in entry.items()}, s.get("crops", {}), s.get("add", {})


# One judgement per photo. A photo can be met twice:
# as a reference photo (tools/fish_refs.json fi<id> / fb<stem>, its code here in tools/fish_judge.json photos and keep)
# and as a candidate (data/fish-cand.json fish-<species>-cand-<id>, judged in judging/fish/<species>.json). They are one
# photo (tools/fish_game.py pid), so they get one judgement: the candidate's judging file is its single source (it holds
# the whole judgement: code, keep within the observation, phase, unsure), and the reference copy is never read for such
# a photo (one_judgement, tools/fish_game.py inputs). tools/judging_fish.py one copies it onto the reference copies, and
# its --check (tests/onejudgement.test.js) fails on a new divergence.
def cand_judgements(root=ROOT):
    """{pid: {f, sid, code, keep, unsure}} of every candidate judgement (judging/fish/<species>.json), by photo identity
    (tools/fish_game.py pid). A photo judged in two species files keeps both, listed under `also` (one_check reports
    them when they disagree)."""
    import fish_game as G
    out = {}
    d = Path(root) / "judging" / "fish"
    for p in sorted(d.glob("s*.json")) if d.is_dir() else []:
        for f, x in (json.loads(p.read_text(encoding="utf-8")).get("photos") or {}).items():
            if not isinstance(x, dict) or not CODE.match(str(x.get("code", ""))):
                continue
            j = {"f": f, "sid": p.stem, "code": x["code"], "keep": x.get("keep"),
                 "unsure": [u for u in x.get("unsure") or [] if u != "bb"]}  # a doubt on the box only withholds the tile
            if x.get("crop") and list(x["crop"]) != [0, 0, 1, 1]:
                j["crop"] = list(x["crop"])  # its code is read on the photo as cropped (one_crops)
            k = G.pid(f)
            if k in out:
                out[k].setdefault("also", []).append(j)
            else:
                out[k] = j
    return out


def one_judgement(codes, keep, cj):
    """(codes, keep) of the reference photos with the single judgement applied (copies; the inputs stay as they are):
    a reference photo that is also a candidate takes its candidate judgement (cj: cand_judgements), its code and its keep
    (best or alt enters like a candidate, dup stays out), whatever tools/fish_judge.json holds; one whose candidate
    judgement is unsure (a doubt on the code, the keep, the phase or the crop) has no code, so it waits like a photo not
    judged yet (tools/fish_game.py ref_play). codes: {photo: code} (every reference photo's, tools/fish_judge.json
    photos, and the photos of refs that are only candidates: pass them in to have them judged by their candidate's
    judgement); keep: tools/fish_judge.json keep."""
    import fish_game as G
    codes, keep = dict(codes or {}), dict(keep or {})
    for f in list(codes):
        j = cj.get(G.pid(f))
        if not j:
            continue
        if j["unsure"]:
            codes.pop(f)
            continue
        codes[f] = j["code"]
        if j.get("keep") in ("best", "alt", "dup"):
            keep[f] = j["keep"]
    return codes, keep


def one_crops(codes, crops, cj):
    """tools/fish_judge.json crops (a copy) with the single judgement's crop: a reference photo of codes that is also a
    candidate takes its candidate judgement's crop when that gives one (cj: cand_judgements), since a code with a crop is
    read on the photo as cropped (judging/FISH.md "A proposed crop": a crop that takes out a fish one could confuse with
    the subject lets the photo play, Pierre, 2026-11-19, Q430), so the crop goes wherever the code goes. A candidate
    judgement with no crop leaves the reference copy's own (the earlier passes' crops)."""
    import fish_game as G
    out = dict(crops or {})
    for f in codes or {}:
        j = cj.get(G.pid(f))
        if j and j.get("crop"):
            out[f] = j["crop"]
    return out


def one_check(J, cj):
    """The divergences between the two copies of a photo judged twice: [(photo, field, reference copy, candidate copy)],
    field "code" (tools/fish_judge.json photos against judging/fish), "keep" (tools/fish_judge.json keep against the
    candidate's keep, when the reference copy has one), or "twice" (two candidate judgements of one photo that disagree).
    Empty when every photo has one judgement. J: tools/fish_judge.json."""
    import fish_game as G
    out = []
    for m in (J.get("photos") or {}).values():
        for f, c in m.items():
            j = cj.get(G.pid(f))
            if j and c != j["code"]:
                out.append((f, "code", c, j["code"]))
    for f, k in (J.get("keep") or {}).items():
        j = cj.get(G.pid(f))
        if j and j.get("keep") and k != j["keep"]:
            out.append((f, "keep", k, j["keep"]))
    for j in cj.values():
        for o in j.get("also", []):
            if (o["code"], o.get("keep")) != (j["code"], j.get("keep")):
                out.append((j["f"], "twice", f'{o["f"]} {o["code"]} {o.get("keep")}', f'{j["code"]} {j.get("keep")}'))
    return out


def load_refs(fish=None):
    """tools/fish_refs.json photos (kept by species) as teaching id -> reference photo objects, each under the level-1
    entry that holds its species (FishBase's too: Pierre, 2026-11-06, FishBase enters automatically when its licence
    allows)."""
    if not REFS.exists():
        return {}
    fish = fish or json.loads((ROOT / "fish.json").read_text(encoding="utf-8"))
    home = {}
    for t in fish["teach"]:
        if t.get("level") == 1:
            for sid in t.get("species", []):
                home.setdefault(sid, t["id"])
    out = {}
    for sid, L in json.loads(REFS.read_text(encoding="utf-8")).get("photos", {}).items():
        if sid in home:
            out.setdefault(home[sid], []).extend(L)
    return out


def game():
    """fish-game.json, the photos in play, every record whole (tools/fish_game.py load)."""
    import fish_game as G
    return G.load(str(ROOT), G.OUT_FILE, {"photos": {}})


def summary(doc, fish):
    names = {t["id"]: (t["name"], t.get("circle"), bool(t.get("wink"))) for t in fish["teach"] if t.get("level") == 1}
    allp = [p for L in doc["photos"].values() for p in L]
    judged = [p for p in allp if "e" in p and p.get("jt")]
    print(f"judged: {len(judged)} of {len(allp)} photos in play")
    pos = ["view", "whole", "light", "colour loss", "clarity", "size", "count"]
    for i, t in enumerate(pos):
        print(f"  {t}: " + ", ".join(f"{k} {v}" for k, v in sorted(Counter(p['jt'][i] for p in judged).items())))
    fl = Counter(c for p in judged for c in p["jt"][7:])
    print("  flags: " + ", ".join(f"{k} {v}" for k, v in sorted(fl.items())))
    print("  ease: " + ", ".join(f"{k} {v}" for k, v in sorted(Counter(p['e'] for p in judged).items())))
    print(f"  crops proposed: {sum(1 for p in judged if 'c' in p)}")
    print("very easy photos (ease >= 4) per entry, circle 1 first:")
    short = []
    for tid, L in sorted(doc["photos"].items(), key=lambda kv: (names.get(kv[0], ("", 9))[1] or 9, kv[0])):
        J = [p for p in L if "e" in p]
        if not J:
            continue
        ve = sum(1 for p in J if p["e"] >= EARLY)
        nm, c, w = names.get(tid, ("?", 0, False))
        print(f"  {tid} {nm} (circle {c}{', wink' if w else ''}): {ve} of {len(J)}; mean ease {sum(p['e'] for p in J) / len(J):.2f}")
        if ve < WANT and c == 1:
            short.append(f"{tid} {nm} ({ve})")
    print("circle-1 entries with fewer than %d very easy photos (better photos needed): %s" % (WANT, ", ".join(short) or "none"))
    # The typical-look families (Q456): partial and camouflage cap nothing there.
    sh = typical_shares(fish, allp)
    top = sorted(sh, key=lambda t: -sh[t][0] / sh[t][1])
    print(f"typical-look families (at least {TYPICAL_SHARE:.0%} of the photos in play partial or camouflaged): "
          + ", ".join(f"{t} {names.get(t, ('?',))[0]} ({sh[t][0] / sh[t][1]:.0%})" for t in top
                      if sh[t][0] >= TYPICAL_SHARE * sh[t][1]))


def sheets(out, only=(), todo=False, refs=False):
    """Downloads the game photos (iNaturalist medium size) and draws contact sheets of 12, as judging/FISH.md says: only
    the entries `only` names (all when empty), only the photos not judged yet with `todo`. A 5 x 5 grid over each photo
    reads the crop fractions to a tenth (judging/FISH.md "A proposed crop")."""
    import time
    import urllib.request
    from PIL import Image, ImageDraw, ImageFont
    doc = game()
    J = load_src()[0] if todo else {}
    if todo:  # a photo judged as a candidate is judged (one judgement per photo: one_judgement)
        import fish_game as G
        cj = cand_judgements()
        J = {**J, **{p["f"]: 1 for L in load_refs().values() for p in L if G.pid(p["f"]) in cj}}
    if refs:  # the reference photos of tools/fish_refs.json instead of the game photos
        doc["photos"] = load_refs()
    doc["photos"] = {t: [p for p in L if p["f"] not in J] for t, L in doc["photos"].items() if not only or t in only}
    (out / "img").mkdir(parents=True, exist_ok=True)
    (out / "sheets").mkdir(parents=True, exist_ok=True)
    CW, CH, BAR, COLS, ROWS = 300, 225, 20, 4, 3
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
    except OSError:
        font = ImageFont.load_default()
    index = []
    for tid, L in doc["photos"].items():
        for s in range(0, len(L), COLS * ROWS):
            sheet = Image.new("RGB", (CW * COLS, (CH + BAR) * ROWS), (40, 40, 40))
            d = ImageDraw.Draw(sheet)
            for i, p in enumerate(L[s:s + COLS * ROWS]):
                f = out / "img" / f"{p['f']}.jpg"
                if not f.exists():
                    req = urllib.request.Request(p["src"].replace("/original.", "/medium."), headers={"User-Agent": "coral-id-imr/1.0"})  # FishBase's: whole
                    with urllib.request.urlopen(req, timeout=60) as r:
                        f.write_bytes(r.read())
                    time.sleep(0.5)  # gentle on iNaturalist's photo host
                im = Image.open(f).convert("RGB")
                im.thumbnail((CW, CH))
                cx, cy = (i % COLS) * CW, (i // COLS) * (CH + BAR)
                x0, y0 = cx + (CW - im.width) // 2, cy + BAR + (CH - im.height) // 2
                sheet.paste(im, (x0, y0))
                for k in range(1, 5):  # the 5 x 5 crop grid
                    d.line([x0 + im.width * k // 5, y0, x0 + im.width * k // 5, y0 + im.height - 1], fill=(255, 255, 255))
                    d.line([x0, y0 + im.height * k // 5, x0 + im.width - 1, y0 + im.height * k // 5], fill=(255, 255, 255))
                d.rectangle([cx, cy, cx + CW - 1, cy + BAR - 1], fill=(255, 255, 210))
                d.text((cx + 4, cy + 3), f"{s + i + 1}  {p.get('t', '')[:34]}", fill=(0, 0, 0), font=font)
                index.append({"sheet": f"{tid}_{s // 12 + 1}", "k": s + i + 1, "f": p["f"], "t": p.get("t")})
            sheet.save(out / "sheets" / f"{tid}_{s // 12 + 1}.jpg", quality=82)
    (out / "index.json").write_text(json.dumps(index, indent=0), encoding="utf-8")
    print(f"{len(index)} photos on {len({i['sheet'] for i in index})} sheets in {out / 'sheets'}")


def box_todo(only=(), n=None):
    """{teaching id: [records]} of the box pass: the photos in play (fish-game.json) whose tags pass the tile rule and that
    have no box yet (tools/fish_judge.json boxes, a candidate's data/suggest.json bb), the easiest first, then by name, one per
    observation, at most n per entry, in fish.json order."""
    import fish_game as G
    game = G.load(str(ROOT), G.OUT_FILE, {}).get("photos") or {}  # its records whole (tools/fish_short.py)
    boxes = G.boxes_in(str(ROOT))
    sug = (json.loads((ROOT / "data/suggest.json").read_text(encoding="utf-8")) or {}).get("fish") or {}
    out = {}
    for tid, L in game.items():
        if only and tid not in only:
            continue
        seen, got = set(), []
        for p in sorted(L, key=lambda p: (-(p.get("e") or 0), p["f"])):
            if not G.tile_tags(p.get("jt")) or G.box_of(p["f"], boxes, sug) or p.get("o") in seen:
                continue
            seen.add(p.get("o"))
            got.append(p)
        if got:
            out[tid] = got[:n] if n else got
    return out


def box_sheets(out, only=(), n=None):
    """The box pass's contact sheets: 9 photos a sheet (3 x 3), each at 420 x 315 px from iNaturalist's medium size (500
    px; FishBase's own file), a 10 x 10 grid over it labelled 0-10 on its edges, so the box reads to half a tenth."""
    import time
    import urllib.request
    from PIL import Image, ImageDraw, ImageFont
    todo = box_todo(only, n)
    (out / "img").mkdir(parents=True, exist_ok=True)
    (out / "sheets").mkdir(parents=True, exist_ok=True)
    CW, CH, BAR, COLS, ROWS, PAD = 420, 315, 22, 3, 3, 16
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
    except OSError:
        font = ImageFont.load_default()
    index = []
    flat = [(tid, p) for tid, L in todo.items() for p in L]
    for s in range(0, len(flat), COLS * ROWS):
        sheet = Image.new("RGB", ((CW + 2 * PAD) * COLS, (CH + BAR + 2 * PAD) * ROWS), (40, 40, 40))
        d = ImageDraw.Draw(sheet)
        for i, (tid, p) in enumerate(flat[s:s + COLS * ROWS]):
            f = out / "img" / f"{p['f']}.jpg"
            if not f.exists():
                u = p["src"].replace("/original.", "/medium.")
                with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "coral-id-imr/1.0"}), timeout=60) as r:
                    f.write_bytes(r.read())
                time.sleep(0.5)  # gentle on iNaturalist's photo host
            im = Image.open(f).convert("RGB")
            im.thumbnail((CW, CH))
            cx, cy = (i % COLS) * (CW + 2 * PAD), (i // COLS) * (CH + BAR + 2 * PAD)
            x0, y0 = cx + PAD + (CW - im.width) // 2, cy + BAR + PAD + (CH - im.height) // 2
            sheet.paste(im, (x0, y0))
            for k in range(11):  # the 10 x 10 grid, labelled on the edges
                gx, gy = x0 + round((im.width - 1) * k / 10), y0 + round((im.height - 1) * k / 10)
                c = (255, 255, 0) if k == 5 else (255, 255, 255)
                d.line([gx, y0, gx, y0 + im.height - 1], fill=c)
                d.line([x0, gy, x0 + im.width - 1, gy], fill=c)
                d.text((gx - 3, y0 - 14), str(k), fill=(255, 255, 255), font=font)
                d.text((x0 - 14, gy - 7), str(k), fill=(255, 255, 255), font=font)
            d.rectangle([cx, cy, cx + CW + 2 * PAD - 1, cy + BAR - 1], fill=(255, 255, 210))
            d.text((cx + 4, cy + 4), f"{s + i + 1}  {tid}  {p.get('t', '')[:40]}", fill=(0, 0, 0), font=font)
            index.append({"sheet": f"box_{s // 9 + 1}", "k": s + i + 1, "tid": tid, "f": p["f"], "t": p.get("t"), "jt": p.get("jt")})
        sheet.save(out / "sheets" / f"box_{s // 9 + 1}.jpg", quality=85)
    (out / "index.json").write_text(json.dumps(index, indent=0), encoding="utf-8")
    print(f"{len(index)} photos to box on {len({i['sheet'] for i in index})} sheets in {out / 'sheets'}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sheets", type=Path, help="download the photos and draw contact sheets into this folder")
    ap.add_argument("--only", default="", help="with --sheets: these entries only (comma-separated teaching ids)")
    ap.add_argument("--todo", action="store_true", help="with --sheets: only the photos not judged yet")
    ap.add_argument("--refs", action="store_true", help="with --sheets: the reference photos of tools/fish_refs.json")
    ap.add_argument("--boxes", type=Path, help="the box pass: sheets of the photos in play that wait for a fish box")
    ap.add_argument("--n", type=int, help="with --boxes: at most this many photos per entry")
    a = ap.parse_args()
    if a.boxes:
        import slot

        slot.guard("tools/fish_judge.py")  # one heavy run at a time on the machine (rule W24)
        return box_sheets(a.boxes, set(filter(None, a.only.split(","))), a.n)
    if a.sheets:
        import slot

        slot.guard("tools/fish_judge.py")  # one heavy run at a time on the machine (rule W24)
        return sheets(a.sheets, set(filter(None, a.only.split(","))), a.todo, a.refs)
    summary(game(), fish_now())


def fish_now():
    """fish.json with the circles in force (the content editor's moves in curation.json: tools/fish_inforce.py)."""
    from fish_inforce import in_force
    cur = ROOT / "curation.json"
    return in_force(json.loads((ROOT / "fish.json").read_text(encoding="utf-8")),
                    json.loads(cur.read_text(encoding="utf-8")) if cur.exists() else {})


if __name__ == "__main__":
    main()
