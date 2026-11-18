"""Q351 batch refit: the declared measures on refit.js's arms output (docs/reviews/2026-11-14-q351-refit.md).

The family of four tests per subject, Holm at 0.05: REFIT against TODAY (next-answer log-loss on the forecast
answers, players' mean, exact sign-flip; the photo-residual slope b2 of P = g + (1-g) R sig(a_format + b1 (x + rho)
- b2 rho), delete-one-player jackknife with today's values and the batch refitted without that player, t), DRIFT
against BASE (log-loss on every scored answer; the slope under 10 earlier answers on the unit, jackknife with eta's
choice redone). Then the descriptive tables, the guardrails, and the whole-log refit against today's values at the end
of the log. Prints only.

    python3 -I tools/studies/q351/refit_stats.py out.json fits.json
"""
import itertools
import json
import sys

import numpy as np
from scipy import stats

D = json.load(open(sys.argv[1]))
FITS = json.load(open(sys.argv[2]))
R = D['rows']
ARMS = ['BASE', 'TODAY', 'REFIT', 'DRIFT']
key = {'BASE': 'base', 'TODAY': 'TODAY', 'REFIT': 'REFIT', 'DRIFT': 'DRIFT'}
pl = np.array([r['p'] for r in R])
y = np.array([r['y'] for r in R], float)
g = np.array([r['g'] for r in R], float)
Rr = np.array([r['R'] for r in R], float)
fmt = np.array([r['fmt'] for r in R])
m = np.array([r['m'] for r in R])
fc = np.array([r['fc'] for r in R])
mi = np.array([r['mi'] for r in R])
X = {a: np.array([r[key[a]][0] for r in R], float) for a in ARMS}
P = {a: np.array([r[key[a]][1] for r in R], float) for a in ARMS}
RHO = {a: np.array([np.nan if r[key[a]][2] is None else r[key[a]][2] for r in R], float) for a in ['BASE', 'TODAY', 'REFIT']}
players = D['players']
playersF = D['playersF']
FMTS = sorted(set(fmt))


def nan(v):
    return np.array([np.nan if z is None else z for z in v], float)


JKD = {q: nan(v) for q, v in D['jkD'].items()}
JKT = {q: {a: (nan([None if z is None else z[0] for z in D['jkT'][q][s]]), nan([None if z is None else z[1] for z in D['jkT'][q][s]])) for a, s in [('TODAY', 'T'), ('REFIT', 'R')]} for q in D['jkT']}


def ll(p, yy):
    p = np.clip(p, 1e-9, 1 - 1e-9)
    return -(yy * np.log(p) + (1 - yy) * np.log(1 - p))


def signflip(d):
    d = np.asarray(d)
    n = len(d)
    obs = abs(d.mean())
    if n <= 16:
        cnt = sum(abs((d * np.array(s)).mean()) >= obs - 1e-12 for s in itertools.product([1, -1], repeat=n))
        return cnt / 2**n
    rng = np.random.default_rng(1)
    s = rng.choice([1, -1], size=(20000, n))
    return float(np.mean(np.abs((s * d).mean(1)) >= obs - 1e-12))


def fitglm(mask, cols):
    """P = g + (1-g) R sig(a_format + sum b_k col_k), one intercept per format; Fisher scoring; returns the b."""
    fs = [f for f in FMTS if (mask & (fmt == f)).sum() > 0]
    idx = {f: i for i, f in enumerate(fs)}
    n = mask.sum()
    Z = np.zeros((n, len(fs) + len(cols)))
    Z[np.arange(n), [idx[f] for f in fmt[mask]]] = 1
    for k, c in enumerate(cols):
        Z[:, len(fs) + k] = c[mask]
    yy, gg, rr = y[mask], g[mask], Rr[mask]
    th = np.zeros(Z.shape[1])
    th[len(fs):] = 1
    for _ in range(100):
        s = 1 / (1 + np.exp(-(Z @ th)))
        p = np.clip(gg + (1 - gg) * rr * s, 1e-9, 1 - 1e-9)
        dp = (1 - gg) * rr * s * (1 - s)
        w = dp / (p * (1 - p))
        step = np.linalg.solve((Z * (dp * w)[:, None]).T @ Z + 1e-6 * np.eye(len(th)), Z.T @ ((yy - p) * w))
        th += step
        if np.max(np.abs(step)) < 1e-8:
            break
    return th[len(fs):]


def slope(mask, x):
    return fitglm(mask, [x])[0]


def b2(mask, x, rho):
    return -fitglm(mask, [x + rho, rho])[1]


def jk(mask, fn, ps):
    ps = [q for q in ps if (mask & (pl == q)).any()]
    full = fn(mask, None)
    vals = np.array([fn(mask & (pl != q), q) for q in ps])
    n = len(ps)
    return full, np.sqrt((n - 1) / n * np.sum((vals - vals.mean()) ** 2)), n


def tci(full, se, n):
    q = stats.t.ppf(0.975, n - 1)
    return full - q * se, full + q * se


def per_player(mask, vals):
    return np.array([vals[mask & (pl == q)].mean() for q in sorted(set(pl[mask]))])


def lldiff(mask, a, b):
    v = per_player(mask, ll(P[a], y) - ll(P[b], y))
    return v.mean(), signflip(v), len(v), int((v < 0).sum())


ALL = np.ones(len(y), bool)
INF = np.isin(pl, playersF)
FC = fc & INF
E = m < 10
L10 = m >= 10
print(f"{D['subj']}: scored {len(y)}, players {len(players)}; forecast answers of players with 20+ of them {FC.sum()} ({len(playersF)} players: {playersF}); milestones {D['milestones']}")
print('forecast answers per player', {q: int((FC & (pl == q)).sum()) for q in playersF})
print('forecast answers per window', {int(j): int((FC & (mi == j)).sum()) for j in sorted(set(mi[FC]))})

# ---- The family
tests = []
d, p, n, neg = lldiff(FC, 'REFIT', 'TODAY')
tests.append(('REFIT vs TODAY, log-loss (forecast)', p, f'{d:+.4f} per answer (players mean), {neg} of {n} players lower, sign-flip p {p:.4f}'))


def rep(a, q):
    return (X[a], RHO[a]) if q is None else JKT[q][a]


def fb2(mk, q):
    xr, rr_ = rep('REFIT', q)
    xt, rt = rep('TODAY', q)
    return b2(mk, xr, rr_) - b2(mk, xt, rt)


full, se, n = jk(FC, fb2, playersF)
pt = 2 * stats.t.sf(abs(full / se), n - 1)
tests.append(('REFIT vs TODAY, photo-residual slope b2 (forecast)', pt, f'{full:+.3f} (jackknife SE {se:.3f}, {n} players), t p {pt:.4f}'))
d, p, n, neg = lldiff(ALL, 'DRIFT', 'BASE')
tests.append(('DRIFT vs BASE, log-loss (all scored)', p, f'{d:+.4f} per answer (players mean), {neg} of {n} players lower, sign-flip p {p:.4f}'))


def fsd(mk, q):
    xd = X['DRIFT'] if q is None else JKD[q]
    return slope(mk, xd) - slope(mk, X['BASE'])


full, se, n = jk(E, fsd, players)
pt = 2 * stats.t.sf(abs(full / se), n - 1)
tests.append(('DRIFT vs BASE, slope m<10 (all scored)', pt, f'{full:+.3f} (jackknife SE {se:.3f}, {n} players), t p {pt:.4f}'))
order = sorted(range(len(tests)), key=lambda i: tests[i][1])
holm, prev = {}, 0
for r_, i in enumerate(order):
    prev = holm[i] = min(1, max(prev, (len(tests) - r_) * tests[i][1]))
print('\n== The family (Holm over 4)')
for i, (nm, p, txt) in enumerate(tests):
    print(f'  {nm}: {txt}; Holm p {holm[i]:.4f} -> {"shown" if holm[i] < 0.05 else "not shown"}')

# ---- Descriptive
print('\n== Forecast answers (players with 20+), by arm: log-loss per answer, predicted / right, slopes')
for a in ARMS:
    row = f'  {a:6s} ll {ll(P[a][FC], y[FC]).mean():.4f} pred {P[a][FC].mean():.3f} right {y[FC].mean():.3f} slope {slope(FC, X[a]):.2f}'
    for nm, ck in [('m<10', E), ('m>=10', L10)]:
        mk = FC & ck
        if mk.sum() >= 30 and len(set(pl[mk])) >= 3:
            row += f' | {nm} {slope(mk, X[a]):.2f} ({mk.sum()} ans, {len(set(pl[mk]))} pl)'
    print(row)
for a in ['TODAY', 'REFIT', 'DRIFT']:
    for b in ['BASE', 'TODAY']:
        if a == b:
            continue
        dd, pp, nn, ng = lldiff(FC, a, b)
        print(f'  {a} - {b} (forecast): {dd:+.4f}, {ng} of {nn} lower, p {pp:.3f}')
print('  by window (answers, ll BASE / TODAY / REFIT / DRIFT):')
for j in sorted(set(mi[FC])):
    mk = FC & (mi == j)
    print(f'    after milestone {j}: {mk.sum()} ans, {len(set(pl[mk]))} pl: ' + ' / '.join(f'{ll(P[a][mk], y[mk]).mean():.4f}' for a in ARMS))

print('\n== Photo-residual slope b2 (forecast; 95% jackknife interval)')
for a in ['BASE', 'TODAY', 'REFIT']:
    mk = FC & np.isfinite(RHO[a])
    if a == 'BASE':
        full, se, n = jk(mk, lambda k, q: b2(k, X['BASE'], RHO['BASE']), playersF)
    else:
        full, se, n = jk(mk, lambda k, q, a=a: b2(k, *rep(a, q)), playersF)
    lo, hi = tci(full, se, n)
    print(f'  {a}: b2 {full:.2f} [{lo:.2f}, {hi:.2f}], rest b1 {fitglm(mk, [X[a] + RHO[a], RHO[a]])[0]:.2f}; spread of rho {np.nanstd(RHO[a][mk]):.3f}')

print('  per player, REFIT - TODAY on the forecast answers:', {str(q): round(float(v), 4) for q, v in zip(sorted(set(pl[FC])), per_player(FC, ll(P['REFIT'], y) - ll(P['TODAY'], y)))})
# Exploratory (after looking): BASE's photo-residual slope on every scored answer of every player, rho the residual
# today's sheet served (reconstructed), and for a subject the sheet does not rate (no unit offset served) the logged
# difficulty itself less the single-photo term.
mk = np.isfinite(RHO['BASE'])
full, se, n = jk(mk, lambda k, q: b2(k, X['BASE'], RHO['BASE']), players)
lo, hi = tci(full, se, n)
print(f'  exploratory, BASE b2 on every scored answer ({mk.sum()} ans, {n} pl), rho reconstructed: {full:.2f} [{lo:.2f}, {hi:.2f}]')
if 'd0' in R[0] and all(u[1] is None for u in D['end']['units']):
    rl = np.array([r['d0'] - 0.5 * r['solo'] for r in R], float)
    full, se, n = jk(ALL, lambda k, q: b2(k, X['BASE'], rl), players)
    lo, hi = tci(full, se, n)
    print(f'  exploratory, BASE b2 on every scored answer, rho the logged difficulty less the single-photo term: {full:.2f} [{lo:.2f}, {hi:.2f}] (sd of rho {rl.std():.3f})')

print('\n== DRIFT')
ch = D['chosen']
print('  grid', D['eta'], 'overall best', D['bestAll'], 'folds', {e: sum(v == e for v in ch.values()) for e in sorted(set(ch.values()))})
for a in ['BASE', 'DRIFT']:
    row = f'  {a}: all ll {ll(P[a], y).mean():.4f} pred {P[a].mean():.3f} right {y.mean():.3f}'
    for nm, ck in [('m<10', E), ('m>=10', L10)]:
        if a == 'BASE':
            full, se, n = jk(ck, lambda k, q: slope(k, X['BASE']), players)
        else:
            full, se, n = jk(ck, lambda k, q: slope(k, X['DRIFT'] if q is None else JKD[q]), players)
        lo, hi = tci(full, se, n)
        row += f' | {nm} {full:.2f} [{lo:.2f}, {hi:.2f}] ({ck.sum()} ans, {n} pl)'
    print(row)
old = np.array([r['old'] for r in R])
for nm, mk in [('the diagnosis 2,047', old), ('later', ~old)]:
    if mk.any() and len(set(pl[mk])) >= 3:
        dd, pp, nn, ng = lldiff(mk, 'DRIFT', 'BASE')
        print(f'  {nm}: {mk.sum()} ans, DRIFT - BASE {dd:+.4f}, {ng} of {nn} lower, p {pp:.3f}')

print('\n== Guardrails')
for f in FMTS:
    mk = FC & (fmt == f)
    if mk.sum() < 100:
        continue
    gt, gr = P['TODAY'][mk].mean() - y[mk].mean(), P['REFIT'][mk].mean() - y[mk].mean()

    # The guardrail read with its interval (rule L11): d = |REFIT's gap| - |TODAY's gap|, its
    # delete-one-player jackknife (each replicate's arms as replayed without that player), held when the one-sided 90%
    # upper bound is at most 0.02, breached when the lower bound is above it, unclear otherwise.
    def gapd(k, q, mk=mk):
        if q is None:
            pr, pt = P['REFIT'], P['TODAY']
        else:
            pr = g + (1 - g) * Rr / (1 + np.exp(-JKT[q]['REFIT'][0]))
            pt = g + (1 - g) * Rr / (1 + np.exp(-JKT[q]['TODAY'][0]))
        return abs(pr[k].mean() - y[k].mean()) - abs(pt[k].mean() - y[k].mean())

    full, se, n = jk(mk, gapd, playersF)
    tq = stats.t.ppf(0.9, n - 1)
    lo, hi = full - tq * se, full + tq * se
    verdict = 'held' if hi <= 0.02 else 'breached' if lo > 0.02 else 'unclear'
    print(f'  format {f} ({mk.sum()} forecast, {n} players): right {y[mk].mean():.3f}, BASE {P["BASE"][mk].mean() - y[mk].mean():+.3f}, TODAY {gt:+.3f}, REFIT {gr:+.3f}; '
          f'|REFIT| - |TODAY| {full:+.3f}, one-sided 90% [{lo:+.3f}, {hi:+.3f}] -> {verdict}; DRIFT {P["DRIFT"][mk].mean() - y[mk].mean():+.3f}')

# ---- The whole-log refit against today's values at the end of the log
F = FITS['full']
EN = D['end']
print(f"\n== The whole-log refit ({F['n']} answers, {F['players']} players) against today's values at the end of the log")
print('  variances', {k: round(v, 3) for k, v in F['var'].items()}, f"practice b1 {F['b1']:.3f} (unit), b2 {F['b2']:.3f} (subject), kappa {F['kappa']:.3f}, EM {F['em']}")


def cmp(name, t, r, se=None):
    t, r = np.asarray(t, float), np.asarray(r, float)
    tc, rc = t - t.mean(), r - r.mean()
    out = f'  {name}: {len(t)}; sd today {t.std():.3f}, refit {r.std():.3f}'
    if t.std() > 0:
        out += f'; correlation {np.corrcoef(t, r)[0, 1]:.2f} (Spearman {stats.spearmanr(t, r)[0]:.2f}); slope of today on the refit {np.polyfit(rc, tc, 1)[0]:.2f}'
    if se is not None:
        z = (tc - rc) / np.asarray(se, float)
        out += f'; |today - refit| > 2 SE: {np.mean(np.abs(z) > 2):.0%}, median |z| {np.median(np.abs(z)):.2f}'
    print(out)


us = [u for u in EN['units'] if u[0] in F['b']]
served = [u for u in us if u[1] is not None]
if served:
    cmp('units with an offset served', [u[1] for u in served], [F['b'][u[0]][0] for u in served], [F['b'][u[0]][1] for u in served])
else:
    print('  units: no offset served today (0 for every unit)')
bu = np.array([F['b'][u[0]][0] for u in us])
print(f"  units in the refit: {len(us)}; sd of the offsets {bu.std():.3f}, median standard error {np.median([F['b'][u[0]][1] for u in us]):.3f}")
ph = [x for x in EN['photos'] if x[0] in F['r'] and x[1] in F['b']]
tot = lambda x: F['b'][x[1]][0] + F['r'][x[0]][0]
cmp('photos (difficulty)', [x[2] for x in ph], [tot(x) for x in ph], [F['r'][x[0]][2] for x in ph])
cmp('photos (own part)', [x[3] for x in ph], [F['r'][x[0]][0] for x in ph], [F['r'][x[0]][1] for x in ph])
for lo_, hi_ in [(0, 3), (3, 10), (10, 1e9)]:
    sub = [x for x in ph if lo_ <= x[5] < hi_]
    if len(sub) >= 10:
        cmp(f'photos with {lo_}-{hi_ if hi_ < 1e9 else "more"} answers', [x[2] for x in sub], [tot(x) for x in sub], [F['r'][x[0]][2] for x in sub])
se_ph = np.array([F['r'][x[0]][2] for x in ph])
print(f'  photo standard errors (unit + own): median {np.median(se_ph):.2f}, 10th {np.percentile(se_ph, 10):.2f}, 90th {np.percentile(se_ph, 90):.2f}')
o4 = F['o'].get('k4', 0)
print('  format offsets relative to 4 choices, today / refit:', {f: (round((EN['fmt'].get(f) or [0])[0] - (EN['fmt'].get('k4') or [0])[0], 2), round(F['o'][f] - o4, 2)) for f in F['o']})
print('  memory offsets (new, shown never right, right once, right 2+), today / refit:', EN['mem'], [round(v, 2) for v in F['mem']])
print(f"  a photo alone: today {EN['solo']}, refit {F['s']:.2f}")
tA, rA = [], []
for q, v in EN['abilities'].items():
    for u, (th, cnt) in v['u'].items():
        k = q + '|' + u
        if q in F['a'] and k in F['u']:
            tA.append(th)
            rA.append(F['a'][q] + F['u'][k] + F['b1'] * np.log1p(cnt) + F['b2'] * np.log1p(v['n']))
cmp('abilities (player x unit, at the end)', tA, rA)
