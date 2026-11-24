#!/usr/bin/env python3
"""Builds review.html: the "what makes a 5" session page (REE-275 (b), REE-8), from set.json (select.py) and
prejudge.json (eye marks). Each photo shows the explicit criteria, each marked from the recorded tags or by eye, the
grade the marks give and the grade the judge typed; Pierre agrees or disagrees per line or for the whole photo.

  python3 -B -I tools/studies/what-makes-a-5/build.py [out.html]   (default: review.html beside it; never committed)
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
S = json.loads((HERE / "set.json").read_text(encoding="utf-8"))
E = json.loads((HERE / "prejudge.json").read_text(encoding="utf-8"))

CRIT = [
    ("C1", "Reference pose",
     "Fish: side view, the flank square to the camera; from above for flatfish and rays. Sea slugs: from above, side or three-quarters, the body extended."),
    ("C2", "Whole animal visible", "In the frame, not hidden by reef, other animals, an overlap or its own folds."),
    ("C3", "Key characters visible",
     "Fish: all fins and the pattern along the flank. Sea slugs: rhinophores, gills or cerata, the mantle pattern."),
    ("C4", "Sharp", "Sharp where the characters are."),
    ("C5", "Size in frame", "Fish: a sixth of the width or more. Sea slugs: a third or more (question (d) of the study may make it a sixth)."),
    ("C6", "Natural colours", "No strong colour loss or cast."),
    ("C7", "Good light on the animal", "Lit evenly; a flash on a dark background counts as good."),
    ("C8", "Background does not hide the outline", "No busy reef in the animal's own tones around it."),
    ("C9", "One subject obvious", "One animal, or a pair or group of it; no other species to confuse."),
]
VIEW = {"p": "side view", "d": "from above", "o": "three-quarters", "h": "head-on", "t": "from behind", "v": "ventral"}


def tag_marks(r):
    jt, fish = r["jt"], r["subject"] == "fish"
    m = {}
    v = jt[0]
    if fish:
        m["C1"] = ("ok" if v == "p" else "no", VIEW.get(v, v))
    else:
        m["C1"] = ("ok" if v in "dpo" else "no", VIEW.get(v, v))
    m["C2"] = ("ok", "whole in the frame") if jt[1] == "1" else ("no", "partial")
    m["C4"] = ("ok", "sharp") if jt[4] == "s" else ("no", {"m": "soft", "b": "blurred"}.get(jt[4], jt[4]))
    big = jt[5] in ("lm" if fish else "l")
    m["C5"] = ("ok" if big else "no", {"l": "a third of the width or more", "m": "a sixth to a third", "s": "under a sixth"}[jt[5]])
    m["C6"] = ("ok", "no colour loss") if jt[3] == "0" else ("no", "colour loss " + jt[3])
    m["C7"] = ("ok", "good light") if jt[2] == "g" else ("no", "dim light")
    m["C9"] = ("ok", "one animal" if jt[6] == "1" else "a pair or group of it") if jt[6] in "1s" else ("no", "count " + jt[6])
    return m


rows = []
for r in S["photos"]:
    n = str(r["n"])
    m = {k: (a, b, "tag") for k, (a, b) in tag_marks(r).items()}
    ex = E.get(n, {})
    for k, v in ex.items():
        if k.startswith("C"):
            t = m.get(k)
            src = f"eye, tag: {t[1]}" if t and t[0] != v[0] else "eye"  # an eye mark that overrules a recorded tag
            m[k] = (v[0], v[1], src)
    for k, _, _ in CRIT:
        m.setdefault(k, ("?", "not checked", "eye"))
    nos = sum(1 for k in m if m[k][0] == "no")
    rows.append(dict(n=r["n"], id=r["f"], subject=r["subject"], unit=r["unitName"], sp=r["sp"], url=r["url"], big=r["big"],
                     obs=r["o"], code=r["jt"] + str(r["typed"]), typed=r["typed"], marks=max(1, 5 - nos),
                     crit=[[k, *m[k]] for k, _, _ in CRIT], note=ex.get("note", "")))

data = json.dumps({"crit": CRIT, "rows": rows}, ensure_ascii=False)
tpl = (HERE / "review.tpl.html").read_text(encoding="utf-8")
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "review.html"  # a built page, never committed
OUT.write_text(tpl.replace("/*DATA*/null", data), encoding="utf-8")
agree = sum(r["marks"] == r["typed"] for r in rows)
print(f"{len(rows)} photos; marks equal the typed grade on {agree}")
for t in (4, 5):
    L = [r for r in rows if r["typed"] == t]
    print(f"typed {t}: {len(L)}; marks give " + ", ".join(f"{g}: {sum(r['marks'] == g for r in L)}" for g in (5, 4, 3, 2, 1)))
