"""Q351 step 2: the declared measures on replay.js's output (docs/reviews/2026-11-14-q351-step2.md).

The family of six tests (each arm against BASE: next-answer log-loss, players' mean, exact sign-flip; the calibration
slope under 10 earlier answers, delete-one-player jackknife, t), Holm at 0.05; the slopes by subset; the guardrails;
the grid points chosen. --sim adds the error against the simulated learner's true chance. Prints only.

    python3 -I tools/studies/q351/stats.py out.json [--sim]
"""
import itertools
import json
import sys

import numpy as np
from scipy import stats

D = json.load(open(sys.argv[1]))
SIM = '--sim' in sys.argv
R = D['rows']
ARMS = ['DAMP', 'GK', 'GKD']
pl = np.array([r['p'] for r in R])
y = np.array([r['y'] for r in R], float)
g = np.array([r['g'] for r in R], float)
Rr = np.array([r['R'] for r in R], float)
fmt = np.array([r['fmt'] for r in R])
m = np.array([r['m'] for r in R])
am = np.array([r['am'] for r in R])
old = np.array([r['old'] for r in R])
X = {'BASE': np.array([r['base'][0] for r in R])}
P = {'BASE': np.array([r['base'][1] for r in R])}
for a in ARMS:
    X[a] = np.array([r[a][0] for r in R])
    P[a] = np.array([r[a][1] for r in R])
PT = np.array([r.get('pT', np.nan) for r in R], float)
players = sorted(set(pl))
FMTS = sorted(set(fmt))


def ll(p, yy):
    p = np.clip(p, 1e-9, 1 - 1e-9)
    return -(yy * np.log(p) + (1 - yy) * np.log(1 - p))


def signflip(d):
    d = np.asarray(d)
    n = len(d)
    obs = abs(d.mean())
    if n <= 16:
        cnt = 0
        tot = 0
        for s in itertools.product([1, -1], repeat=n):
            tot += 1
            cnt += abs((d * np.array(s)).mean()) >= obs - 1e-12
        return cnt / tot
    rng = np.random.default_rng(1)
    s = rng.choice([1, -1], size=(20000, n))
    return float(np.mean(np.abs((s * d).mean(1)) >= obs - 1e-12))


def fit(mask, x):
    """Slope b of P = g + (1-g) R sig(a_f + b x), one intercept per format; Fisher scoring."""
    fs = [f for f in FMTS if (mask & (fmt == f)).sum() > 0]
    idx = {f: i for i, f in enumerate(fs)}
    n = mask.sum()
    Z = np.zeros((n, len(fs) + 1))
    fi = np.array([idx[f] for f in fmt[mask]])
    Z[np.arange(n), fi] = 1
    Z[:, -1] = x[mask]
    yy, gg, rr = y[mask], g[mask], Rr[mask]
    th = np.zeros(len(fs) + 1)
    th[-1] = 1
    for _ in range(100):
        eta = Z @ th
        s = 1 / (1 + np.exp(-eta))
        p = np.clip(gg + (1 - gg) * rr * s, 1e-9, 1 - 1e-9)
        dp = (1 - gg) * rr * s * (1 - s)
        w = dp / (p * (1 - p))
        score = Z.T @ ((yy - p) * w)
        info = (Z * (dp * w)[:, None]).T @ Z + 1e-6 * np.eye(len(th))
        step = np.linalg.solve(info, score)
        th += step
        if np.max(np.abs(step)) < 1e-8:
            break
    return th[-1]


# The arms' log-odds in each delete-one-player replicate (replay.js jkX: the grid choice redone without that player;
# Codex review #883). BASE has no grid, so its replicate keeps X['BASE'].
JKX = {a: {q: np.array([np.nan if v is None else v for v in xs], float) for q, xs in D['jkX'][a].items()} for a in ARMS}


def xrep(a, q):
    return X[a] if q is None or a == 'BASE' else JKX[a][q]


def jk(mask, fn):
    """Delete-one-player jackknife over the players present in the mask: fn(mask, q) with q deleted (None for the
    full data), each replicate with the arms' grid choice redone without q. Returns (full, se, n players)."""
    ps = [q for q in players if (mask & (pl == q)).any()]
    full = fn(mask, None)
    vals = np.array([fn(mask & (pl != q), q) for q in ps])
    n = len(ps)
    se = np.sqrt((n - 1) / n * np.sum((vals - vals.mean()) ** 2))
    return full, se, n


def slope_diff(mask, a):
    full, se, n = jk(mask, lambda mk, q: fit(mk, xrep(a, q)) - fit(mk, X['BASE']))
    t = full / se if se > 0 else np.inf
    return full, se, n, 2 * stats.t.sf(abs(t), n - 1)


def slope_ci(mask, a):
    full, se, n = jk(mask, lambda mk, q: fit(mk, xrep(a, q)))
    q = stats.t.ppf(0.975, n - 1)
    return full, se, n, full - q * se, full + q * se


def per_player(mask, vals):
    return {q: vals[mask & (pl == q)].mean() for q in players if (mask & (pl == q)).any()}


def ll_diff(mask, a):
    d = per_player(mask, ll(P[a], y) - ll(P['BASE'], y))
    v = np.array(list(d.values()))
    return v.mean(), signflip(v), len(v), int((v < 0).sum())


ALL = np.ones(len(y), bool)
E = m < 10
L10 = m >= 10
out = {}
print(f"answers {len(y)}, players {len(players)}, excluded {D['excluded']}")
print('answers per player', {q: int((pl == q).sum()) for q in players})
print('players with 200+ answers', sum((pl == q).sum() >= 200 for q in players))
print('m<10: answers %d players %d; m>=10: answers %d players %d' % (E.sum(), len(set(pl[E])), L10.sum(), len(set(pl[L10]))))
print('m>=10 answers per player', {q: int((L10 & (pl == q)).sum()) for q in players if (L10 & (pl == q)).any()})

print('\n== BASE descriptive')
for name, mk in [('all', ALL), ('old 2047', old), ('new', ~old)]:
    if not mk.any():
        continue
    print(
        f"  {name}: n {mk.sum()}, log-loss/answer {ll(P['BASE'][mk], y[mk]).mean():.4f}, pred {P['BASE'][mk].mean():.3f} right {y[mk].mean():.3f}, "
        f"slope all {fit(mk, X['BASE']):.2f}, m<10 {fit(mk & E, X['BASE']):.2f}, m>=10 {fit(mk & L10, X['BASE']) if (mk & L10).any() else float('nan'):.2f}"
    )

print('\n== The family (Holm over 6)')
tests = []
for a in ARMS:
    d, p, n, neg = ll_diff(ALL, a)
    tests.append((f'{a} log-loss', p, f'{d:+.4f} per answer (player mean), {neg}/{n} players lower, sign-flip p {p:.4f}'))
    sd, se, n2, p2 = slope_diff(E, a)
    tests.append((f'{a} slope m<10', p2, f'{sd:+.3f} (jackknife SE {se:.3f}, {n2} players), t p {p2:.4f}'))
order = sorted(range(len(tests)), key=lambda i: tests[i][1])
holm = {}
prev = 0
for r, i in enumerate(order):
    adj = min(1, max(prev, (len(tests) - r) * tests[i][1]))
    prev = adj
    holm[i] = adj
for i, (nm, p, txt) in enumerate(tests):
    print(f'  {nm}: {txt}; Holm p {holm[i]:.4f} -> {"shown" if holm[i] < 0.05 else "not shown"}')

print('\n== Slopes and log-loss by arm and subset (descriptive)')
for name, mk in [('all', ALL), ('old 2047', old), ('new', ~old)]:
    if not mk.any():
        continue
    for a in ['BASE'] + ARMS:
        row = f'  {name:8s} {a:5s} ll {ll(P[a][mk], y[mk]).mean():.4f}'
        if a != 'BASE':
            d, p, n, neg = ll_diff(mk, a)
            row += f' (diff {d:+.4f}, {neg}/{n} lower, p {p:.3f})'
        for cn, ck in [('m<10', E), ('m>=10', L10)]:
            mk2 = mk & ck
            if mk2.sum() < 30 or len(set(pl[mk2])) < 3:
                row += f' | {cn} n/a'
                continue
            b, se, n, lo, hi = slope_ci(mk2, a)
            row += f' | {cn} {b:.2f} [{lo:.2f}, {hi:.2f}] ({mk2.sum()} ans, {n} pl)'
        print(row)

print('\n== Guardrails')
for a in ['BASE'] + ARMS:
    b, se, n, lo, hi = slope_ci(L10, a)
    meets = hi >= 0.8 and lo <= 1.25
    print(f'  {a} slope m>=10 {b:.2f} [{lo:.2f}, {hi:.2f}] meets [0.8,1.25]: {meets}')
for f in FMTS:
    mk = fmt == f
    if mk.sum() < 100:
        continue
    row = f'  format {f} ({mk.sum()}): right {y[mk].mean():.3f}'
    for a in ['BASE'] + ARMS:
        row += f' | {a} {P[a][mk].mean():.3f} ({P[a][mk].mean() - y[mk].mean():+.3f})'
    print(row)
mk = am & E
for a in ['BASE'] + ARMS:
    d = per_player(mk, y - P[a])
    v = np.array(list(d.values()))
    print(f'  after a miss, m<10 ({mk.sum()} answers, {len(v)} players): {a} pred {P[a][mk].mean():.3f} right {y[mk].mean():.3f}, per-player gap {v.mean():+.3f}')
mk = (~am) & (m > 0) & E
for a in ['BASE'] + ARMS:
    d = per_player(mk, y - P[a])
    v = np.array(list(d.values()))
    print(f'  after a right answer, m<10 ({mk.sum()} answers): {a} per-player gap {v.mean():+.3f}')

print('\n== Grid points chosen (LOPO folds)')
for a in ARMS:
    ch = D['chosen'][a]
    keys = sorted(set(json.dumps(v, sort_keys=True) for v in ch.values()))
    print(f'  {a}: {len(keys)} distinct; overall best {D["bestAll"][a]}')
    for k in keys:
        print('    ', k, 'folds', sum(json.dumps(v, sort_keys=True) == k for v in ch.values()))

if SIM:
    print('\n== Simulated: against the true chance')
    for a in ['BASE'] + ARMS:
        mse = np.mean((P[a] - PT) ** 2)
        print(f'  {a}: MSE vs true {mse:.4f}; m<10 {np.mean((P[a][E] - PT[E]) ** 2):.4f}; m>=10 {np.mean((P[a][L10] - PT[L10]) ** 2):.4f}; mean pred {P[a].mean():.3f} true {np.nanmean(PT):.3f} right {y.mean():.3f}')
