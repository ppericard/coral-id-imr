#!/usr/bin/env python3
"""Fish photo judging (judging/FISH.md): the rubric's code and caps, and the material of a judging pass.

The judgements live in tools/fish_judge.json (one code per photo, e.g. "p1g0sm14": view, whole, light, colour loss,
clarity, size, count, flags, ease 1-5; for some photos a proposed crop [l, t, r, b], curation.json's crop format; the
fish's box; keep, a reference photo judged against its observation's photos). tools/fish_game.py reads them for the
reference photos it puts in play (ref_play: cap, then its judged_sure), tools/judging_fish.py for the candidates (cap,
juv_early). Until 2026-11-15 this script also wrote them into the stopgap list of fish-photos.json (retired: every fish
photo in play is on R2, fish-game.json).
This script:
  - prints the summary of the photos in play (fish-game.json): counts per tag, very easy photos (ease 4-5) per entry,
    circle-1 entries short of them;
  - with --sheets DIR: downloads the photos in play at iNaturalist's medium size (FishBase's whole) into DIR/img and draws
    contact sheets of 12 into DIR/sheets, the material of a judging pass (DIR outside the repository; delete it after);
    --only t28,t47 limits them to some entries, --todo to the photos not judged yet, and each tile carries a 5 x 5 grid
    for the crops; --refs: the units' reference photos (tools/fish_refs.json, tools/fish_refs.py) instead;
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
# x; m, the code for other species before Pierre's split (2026-11-09, Q323), stays readable as "not sorted yet" (core.js
# FISH_COUNT), never typed in a new judgement (NEW_COUNT, tools/judging_fish.py --check).
CODE = re.compile(r"^([pohtd])([01])([gdn])([0-3])([smb])([lms])([1smxok])([jca]*)([1-5])$")
NEW_COUNT = "1sokx"
EARLY = 4  # very easy (judging/FISH.md): the photos the draw favours at an entry's start (model.js photoSet)
VARIETY = 3  # model.js PICKD.VARIETY: an entry with fewer very easy photos shows its 3 easiest instead
WANT = 5  # Pierre (2026-11-04, admin decisions): at least 5 very easy photos per circle-1 entry
# A reference photo (`rep`: the photo a reference source uses to represent the species, FishBase's main picture or
# iNaturalist's taxon photo; Pierre, 2026-11-05: "such photos are easy to identify, so they should come early in the quiz
# for a beginner") is one ease point easier than its visual code says, the caps applied after (a juvenile or a fish in its
# night livery stays capped). One point lifts a medium photo (3) into the very easy ones (4-5).
REP_BONUS = 1


def cap(code, phase, juv_ok=False, rep=None):
    """(ease after the caps, tags with the phase and reference flags): judging/FISH.md "Caps" and "Reference photos".
    juv_ok: the photo's juveniles show early (juv_early: its entry's class A, or its species in the entry's early list), so
    the juvenile flag caps nothing. rep: the photo's `rep` (a reference source shows it for the species: FishBase's main
    picture, iNaturalist's taxon photo), which adds the flag r and REP_BONUS to the ease, the caps applied after it."""
    m = CODE.match(code)
    if not m:
        raise ValueError(f"bad code {code!r}")
    v, w, light, loss, _c, _z, n, fl, e = m.groups()
    fl = fl + ("p" if phase and "p" not in fl else "") + ("r" if rep else "")
    e = min(5, int(e) + (REP_BONUS if rep else 0))
    if ("j" in fl and not juv_ok) or n == "x" or loss == "3":
        e = min(e, 2)
    # The phase flag p caps nothing (Pierre, 2026-11-04: a sex or colour phase is a species-level difficulty; an Anthias
    # or a parrotfish is easy to call one at the family level), kept for the species questions and explanation cards.
    # light n is the night livery only (rubric 6, Pierre, 2026-11-08, Q308: a night or resting colour pattern unlike the
    # day one); a fish lit by a flash or a lamp on a dark background is good light (g) and caps nothing.
    if set(fl) & set("ca") or light == "n" or loss == "2" or v in "htd" or w == "0":
        e = min(e, 3)
    return e, code[:7] + fl


def juv_early(juv, names):
    """True when a juvenile of these species names (its fish.json name and WoRMS name) is judged without the juvenile
    cap: the entry's juv class is A, or a name is, or is in, a genus or species of its early list (fish.json juv,
    from tools/fish_source.json: the juvenile classes of 2026-11-04). Everything else keeps the cap."""
    if not isinstance(juv, dict):
        return False
    if juv.get("cls") == "A":
        return True
    return any(n == x or n.startswith(x + " ") for x in juv.get("early", []) for n in names if n)


def load_src():
    s = json.loads(SRC.read_text(encoding="utf-8"))
    return {f: c for entry in s["photos"].values() for f, c in entry.items()}, s.get("crops", {}), s.get("add", {})


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


def sheets(out, only=(), todo=False, refs=False):
    """Downloads the game photos (iNaturalist medium size) and draws contact sheets of 12, as judging/FISH.md says: only
    the entries `only` names (all when empty), only the photos not judged yet with `todo`. A 5 x 5 grid over each photo
    reads the crop fractions to a tenth (judging/FISH.md "A proposed crop")."""
    import time
    import urllib.request
    from PIL import Image, ImageDraw, ImageFont
    doc = game()
    J = load_src()[0] if todo else {}
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
    have no box yet (tools/fish_judge.json boxes, a candidate's suggest.json bb), the easiest first, then by name, one per
    observation, at most n per entry, in fish.json order."""
    import fish_game as G
    game = G.load(str(ROOT), G.OUT_FILE, {}).get("photos") or {}  # its records whole (tools/fish_short.py)
    boxes = G.boxes_in(str(ROOT))
    sug = (json.loads((ROOT / "suggest.json").read_text(encoding="utf-8")) or {}).get("fish") or {}
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
    summary(game(), json.loads((ROOT / "fish.json").read_text(encoding="utf-8")))


if __name__ == "__main__":
    main()
