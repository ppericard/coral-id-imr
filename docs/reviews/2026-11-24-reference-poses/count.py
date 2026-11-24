#!/usr/bin/env python3
"""Counts for docs/reviews/2026-11-24-reference-poses.md (REE-275), from the recorded codes only: nothing is judged.

  python3 -B docs/reviews/2026-11-24-reference-poses/count.py

Reads fish-game.json and seaslug-game.json (the photos in play: tags `jt` and ease `e` after the caps), the typed
codes (fish: the candidate judging files judging/fish/*.json, else tools/fish_judge.json; sea slugs:
judging/seaslug/*.json), fish.json (the level-1 entries) and tools/seaslugs.json (family -> group). The corals have
no judged ease, so nothing is counted for them. Prints the tables the note quotes.
"""
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools"))
import fish_game as G  # noqa: E402
import fish_judge as FJ  # noqa: E402


def read(p):
    return json.loads((ROOT / p).read_text(encoding="utf-8"))


def ref_tags(jt, view, sizes):
    """The reference look of core.js refLevel with view `view` and the sizes allowed: whole, good light, no colour
    loss, sharp, one kind (count 1 or s), no j, c or a flag."""
    return (jt[0] == view and jt[1:5] == "1g0s" and jt[5] in sizes and jt[6] in "1s"
            and not set(jt[7:]) & set("jca"))


def dist(xs):
    c = Counter(xs)
    return " ".join(f"{k}:{c[k]}" for k in sorted(c, key=str))


def fish():
    print("== FISH (fish-game.json, photos in play) ==")
    game = G.load(str(ROOT), G.OUT_FILE, {"photos": {}})["photos"]
    names = {t["id"]: t["name"] for t in read("fish.json")["teach"] if t.get("level") == 1}
    cj = FJ.cand_judgements(ROOT)
    J = read("tools/fish_judge.json")
    refc = {f: c for m in (J.get("photos") or {}).values() for f, c in m.items()}

    def typed(p):
        j = cj.get(G.pid(p["f"]))
        c = j["code"] if j else refc.get(p["f"])
        return int(c[-1]) if c and c[-1].isdigit() else None

    recs = [(t, p) for t, L in game.items() for p in L if p.get("jt") and "e" in p]
    print(f"photos judged in play: {len(recs)}; ease: {dist(p['e'] for _, p in recs)}")
    five = [p for _, p in recs if p["e"] == 5]
    print(f"ease 5: {len(five)}; with w {sum('w' in p['jt'][7:] for p in five)}, j {sum('j' in p['jt'][7:] for p in five)},"
          f" p {sum('p' in p['jt'][7:] for p in five)}; count s {sum(p['jt'][6] == 's' for p in five)};"
          f" size m {sum(p['jt'][5] == 'm' for p in five)}; view {dist(p['jt'][0] for p in five)}")
    print(f"views of all: {dist(p['jt'][0] for _, p in recs)}")
    for v in "pdoht":
        R = [p for _, p in recs if ref_tags(p["jt"], v, "lm")]
        print(f"reference look with view {v}: {len(R)}; ease now {dist(p['e'] for p in R)};"
              f" typed {dist(typed(p) for p in R)}")
    print("entries by share of view d (at least 20%), with their reference-look d photos:")
    for t, L in game.items():
        L = [p for p in L if p.get("jt") and "e" in p]
        d = [p for p in L if p["jt"][0] == "d"]
        if L and len(d) >= 0.2 * len(L):
            R = [p for p in d if ref_tags(p["jt"], "d", "lm")]
            print(f"  {t} {names.get(t, '?')}: {len(d)}/{len(L)} = {len(d) / len(L):.0%} d; reference-look d {len(R)},"
                  f" ease now {dist(p['e'] for p in R)}, typed {dist(typed(p) for p in R)}")
    R = [p for _, p in recs if ref_tags(p["jt"], "p", "lm")]
    print(f"profile reference look below 5: {sum(p['e'] < 5 for p in R)} (typed 4: {sum(typed(p) == 4 for p in R)},"
          f" unknown typed: {sum(typed(p) is None for p in R)})")


def seaslugs():
    print("== SEA SLUGS (seaslug-game.json, photos in play) ==")
    game = read("seaslug-game.json")["photos"]
    # the group (the order, or Sacoglossa, which WoRMS ranks above order) of each family
    order = {s["family"]: s["group"] for s in read("tools/seaslugs.json")["species"] if s.get("family")}
    codes = {}
    for p in (ROOT / "judging" / "seaslug").glob("*.json"):
        for f, x in (json.loads(p.read_text(encoding="utf-8")).get("photos") or {}).items():
            if isinstance(x, dict) and x.get("code"):
                codes[f] = x["code"]

    def typed(p):
        c = codes.get(p["f"])
        return int(c[-1]) if c and c[-1].isdigit() else None

    recs = [(k, p) for k, L in game.items() for p in L if p.get("jt") and "e" in p]
    print(f"photos judged in play: {len(recs)}; ease: {dist(p['e'] for _, p in recs)}")
    five = [p for _, p in recs if p["e"] == 5]
    print(f"ease 5: {len(five)}; view {dist(p['jt'][0] for p in five)}; size {dist(p['jt'][5] for p in five)};"
          f" with w {sum('w' in p['jt'][7:] for p in five)}, j {sum('j' in p['jt'][7:] for p in five)}")
    for v in "dpo":
        for sz in "lm":
            R = [p for _, p in recs if ref_tags(p["jt"], v, sz) and "f" not in p["jt"][7:]]
            print(f"reference look, view {v}, size {sz}, no f: {len(R)}; ease now {dist(p['e'] for p in R)};"
                  f" typed {dist(typed(p) for p in R)}")
    R = [p for _, p in recs if any(ref_tags(p["jt"], v, "l") for v in "dpo") and "f" in p["jt"][7:]]
    print(f"reference look (d, p or o, size l) with f: {len(R)}; ease now {dist(p['e'] for p in R)}")
    by = {}
    for k, p in recs:
        fam = k.split(":", 1)[1] if k.startswith("f:") else k
        by.setdefault(order.get(fam) or "?", []).append(p)
    print("views by order (all photos in play; ease-5 photos):")
    for o, L in sorted(by.items()):
        print(f"  {o}: {len(L)} photos, views {dist(p['jt'][0] for p in L)}; ease 5: {sum(p['e'] == 5 for p in L)},"
              f" views {dist(p['jt'][0] for p in L if p['e'] == 5)}")


if __name__ == "__main__":
    fish()
    seaslugs()
