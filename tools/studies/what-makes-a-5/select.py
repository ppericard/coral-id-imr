#!/usr/bin/env python3
"""Draws the comparison set for the "what makes a 5" session (REE-275 question (b), REE-8), from the recorded codes only.

  python3 -B -I tools/studies/what-makes-a-5/select.py . <out.json>   (on main at 48ecf361 it gives set.json)

Same population as docs/reviews/2026-11-24-reference-poses/count.py (PR #1538): photos in play whose tags read the
reference look. Group A: typed 4 and in play at 4. Group B (anchors): typed 5 and in play at 5, same tag filter.
Fish: profile `p`, size l or m (the study's 1,416); plus a few `d` photos of Soles and Rays (the from-above pose, typed
under the cap at 4). Sea slugs: views d, p, o, size l, no `f` (the study's 341). Left out in both groups: watermark
`w`, Pierre's own ease or tags (curation.json, rule A1), a candidate judged on a crop, records not on R2 (r: 1).
Corals: no ease, nothing drawn. Seeded, stratified, one photo per family or genus where possible; nobody looked at a
photo to choose it.
"""
import json
import random
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2])
sys.path.insert(0, str(ROOT / "tools"))
import fish_game as G  # noqa: E402
import fish_judge as FJ  # noqa: E402

SEED = 20261124
rng = random.Random(SEED)


def read(p):
    return json.loads((ROOT / p).read_text(encoding="utf-8"))


def ref_tags(jt, views, sizes):
    return (jt[0] in views and jt[1:5] == "1g0s" and jt[5] in sizes and jt[6] in "1s"
            and not set(jt[7:]) & set("jcaw"))


def pick(pool, n, strata, unit):
    """n photos: round-robin over the strata (sorted), one per unit (family or genus) until the units run out."""
    by = {}
    for x in pool:
        by.setdefault(strata(x), []).append(x)
    for L in by.values():
        rng.shuffle(L)
    keys = sorted(by)
    out, seen = [], set()
    while len(out) < n and any(by.values()):
        for k in keys:
            if len(out) >= n:
                break
            L = by[k]
            if not L:
                continue
            i = next((i for i, x in enumerate(L) if unit(x) not in seen), 0)  # a repeated unit only once none is new
            x = L.pop(i)
            seen.add(unit(x))
            out.append(x)
    return out


def fish():
    game = G.load(str(ROOT), G.OUT_FILE, {"photos": {}})["photos"]
    names = {t["id"]: t["name"] for t in read("fish.json")["teach"] if t.get("level") == 1}
    cj = FJ.cand_judgements(ROOT)
    J = read("tools/fish_judge.json")
    refc = {f: c for m in (J.get("photos") or {}).values() for f, c in m.items()}
    cur = read("curation.json").get("fish") or {}
    mine = {G.pid(k) for sec in ("ease", "tags", "add") for k in (cur.get(sec) or {})}

    def typed(p):
        j = cj.get(G.pid(p["f"]))
        c = j["code"] if j else refc.get(p["f"])
        return (int(c[-1]) if c and c[-1].isdigit() else None), (j or {}).get("crop")

    recs = []
    for t, L in game.items():
        for p in L:
            if not p.get("jt") or "e" not in p or p.get("r") or G.pid(p["f"]) in mine:
                continue
            ty, crop = typed(p)
            if crop:
                continue
            recs.append(dict(subject="fish", unit=t, unitName=names.get(t, t), f=p["f"], sp=p.get("t"), jt=p["jt"],
                             e=p["e"], typed=ty, o=p.get("o"), lic=p.get("lic")))
    prof = [r for r in recs if ref_tags(r["jt"], "p", "lm")]
    flat = [r for r in recs if ref_tags(r["jt"], "d", "lm") and r["unitName"] in ("Soles", "Rays")]
    A = [r for r in prof if r["typed"] == 4 and r["e"] == 4]
    B = [r for r in prof if r["typed"] == 5 and r["e"] == 5]
    Af = [r for r in flat if r["typed"] == 4 and r["e"] == 4]
    print(f"fish profile pool: typed-4 {len(A)}, typed-5 {len(B)}; Soles/Rays from above typed 4: {len(Af)}")
    st = lambda r: (r["jt"][5], r["jt"][6])  # noqa: E731
    a = pick(A, 13, st, lambda r: r["unit"])
    af = pick(Af, 3, lambda r: r["unitName"], lambda r: r["unit"])
    b = pick(B, 8, st, lambda r: r["unit"])
    return [dict(r, group="4") for r in a + af] + [dict(r, group="5") for r in b]


def seaslugs():
    game = read("seaslug-game.json")["photos"]
    codes = {}
    for p in (ROOT / "judging" / "seaslug").glob("*.json"):
        for f, x in (json.loads(p.read_text(encoding="utf-8")).get("photos") or {}).items():
            if isinstance(x, dict) and x.get("code"):
                codes[f] = (x["code"], x.get("crop"))
    recs = []
    for k, L in game.items():
        for p in L:
            if not p.get("jt") or "e" not in p or p.get("r"):
                continue
            c, crop = codes.get(p["f"], (None, None))
            if crop and list(crop) != [0, 0, 1, 1]:
                continue
            ty = int(c[-1]) if c and c[-1].isdigit() else None
            recs.append(dict(subject="seaslug", unit=k, unitName=k.split(":", 1)[-1], f=p["f"], sp=p.get("t"),
                             jt=p["jt"], e=p["e"], typed=ty, o=p.get("o"), lic=p.get("lic"), genus=(p.get("t") or "?").split()[0]))
    pool = [r for r in recs if ref_tags(r["jt"], "dpo", "l") and "f" not in r["jt"][7:]]
    A = [r for r in pool if r["typed"] == 4 and r["e"] == 4]
    B = [r for r in pool if r["typed"] == 5 and r["e"] == 5]
    print(f"sea slug pool: typed-4 {len(A)}, typed-5 {len(B)}")
    st = lambda r: r["jt"][0]  # noqa: E731
    a = pick(A, 15, st, lambda r: r["genus"])
    b = pick(B, 7, st, lambda r: r["genus"])
    return [dict(r, group="4") for r in a] + [dict(r, group="5") for r in b]


if __name__ == "__main__":
    S = fish() + seaslugs()
    rng.shuffle(S)
    import photos as P
    for i, r in enumerate(S, 1):
        r["n"] = i
        r["url"] = P.url(r["f"], "-m")
        r["big"] = P.url(r["f"])
    OUT.write_text(json.dumps({"seed": SEED, "photos": S}, ensure_ascii=False, indent=1), encoding="utf-8")
    from collections import Counter
    print(Counter((r["subject"], r["group"]) for r in S))
    print(Counter((r["subject"], r["group"], r["jt"][0], r["jt"][5], r["jt"][6]) for r in S))
