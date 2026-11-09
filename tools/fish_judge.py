#!/usr/bin/env python3
"""Fish photo judging (judging/FISH.md): writes the judged ease of every fish game photo into fish-photos.json.

Fish answers are not logged to the sheet yet, so no player answer rates a fish photo. Until they are, an agent (or a
person) looks at every game photo and judges it on the rubric of judging/FISH.md; the judgements live in
tools/fish_judge.json (one code per photo, e.g. "p1g0sm14": view, whole, light, colour loss, clarity, size, count, flags,
ease 1-5) and, for some photos, a proposed crop [l, t, r, b] (fractions, curation.json's crop format).
This script:
  - applies them to fish-photos.json: each judged photo gets `e` (its ease after the rubric's caps) and `jt` (its tags,
    with the phase flag `p` added for the entries fish.json marks `dimorph`), and `c` its proposed crop when it has one
    (a proposal for the admin, like a coral candidate's suggest.json `c`: the app never applies it); a photo no longer
    judged loses all three;
  - adds the photos the judging pass picked for entries short of very easy photos (`add`: research-grade iNaturalist
    candidates of fish-cand.json, same licence rules), each once (one photo per observation), at the end of its list;
  - prints the summary: counts per tag, very easy photos (ease 4-5) per entry, entries short of them;
  - with --sheets DIR: downloads every game photo at iNaturalist's medium size into DIR/img and draws contact sheets of
    12 into DIR/sheets, the material of a judging pass (DIR outside the repository; delete it after); --only t28,t47
    limits them to some entries, --todo to the photos not judged yet, and each tile carries a 5 x 5 grid for the crops.
tools/fish_photos.py calls apply() whenever it rebuilds the photo list, so a rebuild keeps the judgements.
  - adds the units' reference photos (tools/fish_refs.json, tools/fish_refs.py) to their entries once judged; --sheets
    DIR --refs draws the sheets of those photos (with --todo: the ones not judged yet).
  - with --boxes DIR: the box pass (judging/FISH.md "The fish's box"): the photos in play (fish-game.json) whose tags pass
    the tile rule (tools/fish_game.py tile_tags) and that have no box yet, the easiest first, one per observation, at most
    --n per entry (--only limits the entries), on sheets of 9 at 420 x 315 px with a 10 x 10 grid; the judge writes each
    fish's box into tools/fish_judge.json boxes. DIR outside the repository; delete it after.
Usage: python3 tools/fish_judge.py [--check] [--sheets DIR [--only t28,t47] [--todo] [--refs]] [--boxes DIR [--only ..] [--n N]]
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "fish_judge.json"
REFS = ROOT / "tools" / "fish_refs.json"  # the units' reference photos (tools/fish_refs.py)
PHOTOS = ROOT / "fish-photos.json"
CODE = re.compile(r"^([pohtd])([01])([gdn])([0-3])([smb])([lms])([1smx])([jca]*)([1-5])$")
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


def load_keep():
    """tools/fish_judge.json "keep": {reference photo id: best | alt | dup}, judged against the photos of its observation
    in play (Pierre, 2026-11-08, Q218; tools/fish_game.py in_play)."""
    return json.loads(SRC.read_text(encoding="utf-8")).get("keep") or {}


def add_refs(photos, J, added=(), fish=None, dup=frozenset()):
    """The reference photos (tools/fish_refs.json) into their entries' game photos, in place. A photo already in the game
    takes the rep tag only (rtag marks a tag set here), and stays whatever its level (Codex review #660: a game photo is
    never removed for being a reference photo). A new one joins at the end once judged (J; apply then keeps it only at the
    reference level, ref_level), unless its observation is already in the game (one photo per observation, rule P4: the
    game photo stays). core.js easyRank orders the list. A rerun gives the same file: a joined photo tools/fish_refs.json
    no longer lists leaves, a tag it no longer lists goes. dup: the reference photos judged duplicates of their
    observation's photos (load_keep): never joined, and one that joined leaves (Codex review #715); a game photo of its own
    stays."""
    R = load_refs(fish)
    want = {r["f"]: r for L in R.values() for r in L}
    for tid in list(photos):
        photos[tid] = [p for p in photos[tid] if not p.get("from") or (p["f"] in want and p["f"] not in dup)]
        for p in photos[tid]:
            if p.get("rtag") and p["f"] not in want:
                p.pop("rep", None)
                p.pop("rtag", None)
    for tid, L0 in R.items():
        L = photos.setdefault(tid, [])
        for r in L0:
            have = next((p for p in L if p["f"] == r["f"]), None)
            if have:
                if have.get("from"):
                    have.update({k: v for k, v in r.items() if k != "for"})
                elif r.get("rep") and have.get("rep") != r["rep"]:
                    have.update(rep=r["rep"], rtag=1)
            elif r["f"] in J and r["f"] not in dup and not any(p["o"] == r["o"] for p in L):
                L.append({k: v for k, v in r.items() if k != "for"})


LOOK = re.compile(r"^p1g0s[lm][1s]$")


def ref_level(p):
    """core.js refLevel: a reference source's photo (rep) judged very easy (4-5), or any photo judged 5 with the reference
    look (profile, whole, good light, true colours, sharp, large or medium, one fish or a school; no j, c or a); in both
    cases one kind of fish (count 1 or s)."""
    e, jt = p.get("e") or 0, p.get("jt") or ""
    # Never a photo with other kinds of fish (count m) or an unclear subject (x), whatever its source (rule P3: one
    # species per game photo; Codex review #660).
    if len(jt) < 7 or jt[6] not in "1s":
        return False
    return (e >= EARLY and bool(p.get("rep"))) or (e == 5 and bool(LOOK.match(jt[:7])) and not set(jt[7:]) & set("jca"))


def apply(photos, fish=None):
    """Writes e / jt into the photo objects of photos (teaching id -> list), in place; returns the count judged."""
    fish = fish or json.loads((ROOT / "fish.json").read_text(encoding="utf-8"))
    dim = {t["id"] for t in fish["teach"] if t.get("dimorph")}
    juv = {t["id"]: t.get("juv") for t in fish["teach"]}
    sp = {s["id"]: (s.get("name"), s.get("now")) for s in fish.get("species", [])}
    J, C, A = load_src()
    for tid, extra in A.items():
        L = photos.setdefault(tid, [])
        have = {p["o"] for p in L}
        L.extend(dict(p) for p in extra if p["o"] not in have)
    add_refs(photos, J, {p["f"] for L in A.values() for p in L}, fish, {f for f, k in load_keep().items() if k == "dup"})
    k = 0
    for tid, L in photos.items():
        for p in L:
            for x in ("e", "jt", "c"):
                p.pop(x, None)
            if p["f"] in J:
                p["e"], p["jt"] = cap(J[p["f"]], tid in dim, juv_early(juv.get(tid), sp.get(p.get("sp"), ())), p.get("rep"))
                if p["f"] in C:
                    p["c"] = C[p["f"]]
                k += 1
    # In this stopgap list a reference photo plays only at the reference level (Pierre, 2026-11-06: "take every photo that
    # passes the rules and is judged reference-level"); one judged lower stays out of it. On R2 (fish-game.json) every
    # reference photo judged sure like a candidate is in play, whatever its level (Pierre, 2026-11-08, Q212; tools/
    # fish_game.py ref_play).
    for tid in photos:
        photos[tid] = [p for p in photos[tid] if not p.get("from") or ref_level(p)]
    return k


def write(doc):
    """fish-photos.json, the one writer (tools/fish_photos.py uses it too): one entry per line under "photos" (the game
    photos), then one species per line under "sheet" (the sheet-only photos, tools/fish_photos.py SHEET), kept as they are."""
    dump = lambda v: json.dumps(v, ensure_ascii=False, separators=(",", ":"))  # noqa: E731
    sheet = doc.get("sheet") or {}
    lines = ["{", f'"v":{doc["v"]},', f'"built":{json.dumps(doc["built"])},', f'"stopgap":{json.dumps(doc["stopgap"])},', '"photos":{']
    lines.append(",\n".join(f'"{k}":{dump(v)}' for k, v in doc["photos"].items()))
    lines.append("}," if sheet else "}")
    if sheet:
        lines += ['"sheet":{', ",\n".join(f'"{k}":{dump(v)}' for k, v in sheet.items()), "}"]
    lines.append("}")
    PHOTOS.write_text("\n".join(lines) + "\n", encoding="utf-8")


def summary(doc, fish):
    names = {t["id"]: (t["name"], t.get("circle"), bool(t.get("wink"))) for t in fish["teach"] if t.get("level") == 1}
    allp = [p for L in doc["photos"].values() for p in L]
    judged = [p for p in allp if "e" in p]
    print(f"judged: {len(judged)} of {len(allp)} game photos")
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
    doc = json.loads(PHOTOS.read_text(encoding="utf-8"))
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
                    req = urllib.request.Request(p["src"].replace("/original.", "/medium."), headers={"User-Agent": "coral-id-imr/1.0"})
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
    game = json.loads((ROOT / "fish-game.json").read_text(encoding="utf-8")).get("photos") or {}
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
    ap.add_argument("--check", action="store_true", help="exit 1 when fish-photos.json is not up to date")
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
    fish = json.loads((ROOT / "fish.json").read_text(encoding="utf-8"))
    doc = json.loads(PHOTOS.read_text(encoding="utf-8"))
    before = json.dumps(doc, sort_keys=True)
    apply(doc["photos"], fish)
    if a.check:
        if json.dumps(doc, sort_keys=True) != before:
            sys.exit("fish-photos.json does not hold the current judgements: run python3 tools/fish_judge.py")
        print("fish-photos.json holds the current judgements")
    else:
        write(doc)
    summary(doc, fish)


if __name__ == "__main__":
    main()
