"""Q351 step 2, exploratory breakdowns (docs/reviews/2026-11-14-q351-step2.md, "Exploratory, after looking").

BASE's calibration slope by day and by the pooled earlier answers on the photo, the gap after a miss by subset, and
the newer answers split by the players present in the first days or not. Reads replay.js's output; prints only.

    python3 -I tools/studies/q351/expl.py out-coral.json
"""
import collections
import datetime
import os
import sys

import numpy as np

sys.argv = [sys.argv[0], sys.argv[1]]
# stats.py's loading and helpers (everything before its measures), from beside this file.
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'stats.py')).read().split("ALL = np.ones")[0])
at = np.array([r['at'] for r in R])
day = np.array([datetime.datetime.fromtimestamp(t / 1000 + 8 * 3600, datetime.UTC).strftime('%m-%d') for t in at])
order = np.argsort(at, kind='stable')
seen = collections.Counter()
pe = np.zeros(len(R), int)
for i in order:
    ph = R[i]['ph']
    pe[i] = min(seen[f] for f in ph) if ph else 0
    for f in ph:
        seen[f] += 1
print('BASE slope by day (answers, players, pred, right, slope):')
for d in sorted(set(day)):
    mk = day == d
    if mk.sum() < 60:
        print(' ', d, mk.sum(), 'too few')
        continue
    print(f'  {d}: {mk.sum()} ans, {len(set(pl[mk]))} pl, pred {P["BASE"][mk].mean():.3f} right {y[mk].mean():.3f}, slope {fit(mk, X["BASE"]):.2f}, m<10 {fit(mk & (m < 10), X["BASE"]):.2f}')
print('BASE slope by pooled earlier answers on the photo:')
for nm, mk in [('photo <3', pe < 3), ('photo 3+', pe >= 3)]:
    for sn, sk in [('old', old), ('new', ~old)]:
        k = mk & sk
        if k.sum() < 50:
            continue
        b, se, n, lo, hi = slope_ci(k, 'BASE')
        print(f'  {nm} {sn}: {k.sum()} ans {n} pl, slope {b:.2f} [{lo:.2f}, {hi:.2f}]; m<10 {fit(k & (m < 10), X["BASE"]):.2f}')
print('after a miss, m<10, by subset (per-player gap right - predicted):')
for sn, sk in [('old', old), ('new', ~old)]:
    for a in ['BASE', 'GK', 'GKD']:
        mk = am & (m < 10) & sk
        v = np.array(list(per_player(mk, y - P[a]).values()))
        print(f'  {sn} {a}: {mk.sum()} ans {len(v)} pl, pred {P[a][mk].mean():.3f} right {y[mk].mean():.3f}, gap {v.mean():+.3f}')
both = set(pl[old]) & set(pl[~old])
only = set(pl[~old]) - set(pl[old])
print('players in both subsets:', sorted(both), 'new only:', sorted(only))
for grp, ps in [('in both', both), ('new only', only)]:
    mk = (~old) & np.isin(pl, list(ps)) & (m < 10)
    print(f'  new subset m<10, players {grp}: {mk.sum()} ans, slope {fit(mk, X["BASE"]):.2f}')
