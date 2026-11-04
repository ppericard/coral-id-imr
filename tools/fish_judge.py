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
    12 into DIR/sheets, the material of a judging pass (DIR outside the repository; delete it after).
tools/fish_photos.py calls apply() whenever it rebuilds the photo list, so a rebuild keeps the judgements.
Usage: python3 tools/fish_judge.py [--check] [--sheets DIR]
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "fish_judge.json"
PHOTOS = ROOT / "fish-photos.json"
CODE = re.compile(r"^([pohtd])([01])([gdn])([0-3])([smb])([lms])([1smx])([jca]*)([1-5])$")
EARLY = 4  # very easy (judging/FISH.md): the photos of an entry's first questions (model.js easyFirst)
VARIETY = 3  # model.js PICKD.VARIETY: an entry with fewer very easy photos shows its 3 easiest instead
WANT = 5  # Pierre (2026-11-04, admin decisions): at least 5 very easy photos per circle-1 entry


def cap(code, phase, juv_ok=False):
    """(ease after the caps, tags with the phase flag): judging/FISH.md "Caps". juv_ok: the entry's juveniles are
    distinct and recognisable (fish.json juv "distinct": Spadefish, Sweetlips), so the juvenile flag caps nothing."""
    m = CODE.match(code)
    if not m:
        raise ValueError(f"bad code {code!r}")
    v, w, light, loss, _c, _z, n, fl, e = m.groups()
    fl = fl + ("p" if phase and "p" not in fl else "")
    e = int(e)
    if ("j" in fl and not juv_ok) or n == "x" or loss == "3":
        e = min(e, 2)
    # The phase flag p caps nothing (Pierre, 2026-11-04: a sex or colour phase is a species-level difficulty; an Anthias
    # or a parrotfish is easy to call one at the family level), kept for the species questions and explanation cards.
    if set(fl) & set("ca") or light == "n" or loss == "2" or v in "htd" or w == "0":
        e = min(e, 3)
    return e, code[:7] + fl


def load_src():
    s = json.loads(SRC.read_text(encoding="utf-8"))
    return {f: c for entry in s["photos"].values() for f, c in entry.items()}, s.get("crops", {}), s.get("add", {})


def apply(photos, fish=None):
    """Writes e / jt into the photo objects of photos (teaching id -> list), in place; returns the count judged."""
    fish = fish or json.loads((ROOT / "fish.json").read_text(encoding="utf-8"))
    dim = {t["id"] for t in fish["teach"] if t.get("dimorph")}
    juv = {t["id"] for t in fish["teach"] if t.get("juv") == "distinct"}
    J, C, A = load_src()
    for tid, extra in A.items():
        L = photos.setdefault(tid, [])
        have = {p["o"] for p in L}
        L.extend(dict(p) for p in extra if p["o"] not in have)
    k = 0
    for tid, L in photos.items():
        for p in L:
            for x in ("e", "jt", "c"):
                p.pop(x, None)
            if p["f"] in J:
                p["e"], p["jt"] = cap(J[p["f"]], tid in dim, tid in juv)
                if p["f"] in C:
                    p["c"] = C[p["f"]]
                k += 1
    return k


def write(doc):
    lines = ["{", f'"v":{doc["v"]},', f'"built":{json.dumps(doc["built"])},', f'"stopgap":{json.dumps(doc["stopgap"])},', '"photos":{']
    lines.append(",\n".join(f'"{k}":{json.dumps(v, ensure_ascii=False, separators=(",", ":"))}' for k, v in doc["photos"].items()))
    lines += ["}", "}"]
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


def sheets(out):
    """Downloads the game photos (iNaturalist medium size) and draws contact sheets of 12, as judging/FISH.md says."""
    import urllib.request
    from PIL import Image, ImageDraw, ImageFont
    doc = json.loads(PHOTOS.read_text(encoding="utf-8"))
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
                    urllib.request.urlretrieve(p["src"].replace("/original.", "/medium."), f)
                im = Image.open(f).convert("RGB")
                im.thumbnail((CW, CH))
                cx, cy = (i % COLS) * CW, (i // COLS) * (CH + BAR)
                sheet.paste(im, (cx + (CW - im.width) // 2, cy + BAR + (CH - im.height) // 2))
                d.rectangle([cx, cy, cx + CW - 1, cy + BAR - 1], fill=(255, 255, 210))
                d.text((cx + 4, cy + 3), f"{s + i + 1}  {p.get('t', '')[:34]}", fill=(0, 0, 0), font=font)
                index.append({"sheet": f"{tid}_{s // 12 + 1}", "k": s + i + 1, "f": p["f"], "t": p.get("t")})
            sheet.save(out / "sheets" / f"{tid}_{s // 12 + 1}.jpg", quality=82)
    (out / "index.json").write_text(json.dumps(index, indent=0), encoding="utf-8")
    print(f"{len(index)} photos on {len({i['sheet'] for i in index})} sheets in {out / 'sheets'}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="exit 1 when fish-photos.json is not up to date")
    ap.add_argument("--sheets", type=Path, help="download the photos and draw contact sheets into this folder")
    a = ap.parse_args()
    if a.sheets:
        return sheets(a.sheets)
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
