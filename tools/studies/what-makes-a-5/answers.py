#!/usr/bin/env python3
"""Reads Pierre's pasted answers (review.html "Copy answers") into a table and a tally per criterion.

  python3 -B -I answers.py answers.txt

A line: n;photo id;marks;typed;A  or  n;photo id;marks;typed;D=C1:word|C8:word;G=grade;N=note
Prints one row per photo (n, id, marks, typed, his grade, the criteria he disagrees with, his words), then per
criterion: how often the pre-judgement marked it ✗, and how often he disagreed with the mark, split by typed 4 / 5.
"""
import json
import sys
from collections import Counter
from pathlib import Path

H = Path(__file__).resolve().parent
rows = {str(r["n"]): r for r in json.loads((H / "set.json").read_text(encoding="utf-8"))["photos"]}
pre = json.loads((H / "prejudge.json").read_text(encoding="utf-8"))
print("n\tid\tmarks\ttyped\this grade\tdisagrees\twords")
dis, seen = Counter(), Counter()
for line in Path(sys.argv[1]).read_text(encoding="utf-8").splitlines():
    p = [x.strip() for x in line.split(";")]
    if len(p) < 5 or p[0] not in rows:
        continue
    n, f, marks, typed = p[:4]
    d, g, note = {}, "", ""
    for x in p[4:]:
        if x.startswith("D="):
            for kv in x[2:].split("|"):
                k, _, w = kv.partition(":")
                if k:
                    d[k] = w
        elif x.startswith("G="):
            g = x[2:]
        elif x.startswith("N="):
            note = x[2:]
    his = g or (marks if not d else "")
    seen[typed] += 1
    for k in d:
        dis[(k, typed)] += 1
    print(f"{n}\t{f}\t{marks}\t{typed}\t{his}\t{','.join(d)}\t{'; '.join(f'{k}:{w}' for k, w in d.items())}{(' | ' + note) if note else ''}")
print("\ncriterion\tmarked no (pre)\tdisagreed, typed 4\tdisagreed, typed 5")
for k in [f"C{i}" for i in range(1, 10)]:
    nos = sum(1 for v in pre.values() if isinstance(v, dict) and v.get(k, ["ok"])[0] == "no")
    print(f"{k}\t{nos} (eye overrides only)\t{dis[(k, '4')]}/{seen['4']}\t{dis[(k, '5')]}/{seen['5']}")
