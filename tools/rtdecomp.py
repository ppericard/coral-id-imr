#!/usr/bin/env python3
"""Response time: player, genus and photo (2026-11-04, docs/LEARNING.md "Response time: genus and photo").

Pierre, 2026-11-04: "response time informs on several things at once: the player's knowledge of this genus, the
intrinsic difficulty of the genus, and the intrinsic difficulty of the photo. It's the combination of the three that
makes the time longer or shorter. So we need to see how we can use it in each of these three factors, or not."

Read-only analysis of the file tools/rtprep.js writes (the answer log and the stats served to the app, with each timed
player left out); prints its tables, writes nothing. Players are printed P1, P2... by number of timed answers.

    node tools/rtprep.js answers.json prep.json      (first; keep prep.json outside the repo)
    OMP_NUM_THREADS=1 python3 tools/rtdecomp.py prep.json [--boot 200] [--boot5 30]

(numpy and scipy; OMP_NUM_THREADS=1 matters: the 600 x 600 Cholesky of each likelihood step is 100 times slower when
BLAS threads fight.)

1. Decomposition. log(seconds) = mu + fixed + u_player + a_genus + b_photo (+ c_player x genus + e_player x photo) + eps,
   crossed random effects fitted by REML (Nelder-Mead on the log variances; BLUPs for the effects). The photo is the
   question's first photo (the colony view of a multi-view question). Fixed terms: k2 (2 choices), views (number of
   photos - 1), new (share of the photos new to the player), log(answer number of the player) (practice), then right,
   then the gap th - d (the logged ability minus the question's difficulty, from Expected and Ability). Typed questions
   are left out (slower by design), and so are answers with a photo enlarged (the time spent enlarged is in the
   seconds). Shares of the variance with a parametric bootstrap (the model refitted on data simulated from the fit) and
   with each player left out.
2. Genus: the genus effect against the app's genusDiff (its photo and confusion parts), the pooled miss rate and the miss
   rate beyond Expected; its stability (halves of the players, halves of the time, odd and even answers); and out of
   sample: the genus effect from the other players as a term in a logistic prediction of a player's answers (fitted on
   the other players, the held-out player's own intercept a nuisance), beside genusDiff and the miss rate of the others.
3. Photo: the same for the photo effect against the app's photoDiff and the photo Elo (core.js eloOf), with the photo
   Elo as a covariate of the time, and a cross-player test.
4. Thresholds: reliability of a genus effect over m players and of a photo effect over n answers, from the variance
   components; the photos with 5 or more timed answers a larger log would give (Poisson, effective pool from today's
   repeats).
"""
import argparse
import itertools
import json
import math
import re

import numpy as np
from scipy.linalg import cho_factor, cho_solve
from scipy.optimize import brentq, minimize
from scipy.stats import pearsonr, poisson, spearmanr

ap = argparse.ArgumentParser()
ap.add_argument('prep')
ap.add_argument('--boot', type=int, default=100, help='parametric bootstrap replicates (3 random effects)')
ap.add_argument('--boot5', type=int, default=0, help='replicates for the 5-effect model (slow)')
ap.add_argument('--seed', type=int, default=20261104)
A = ap.parse_args()
RNG = np.random.default_rng(A.seed)
D = json.load(open(A.prep))
PL = D['players']
ANON = {p: 'P%d' % (i + 1) for i, p in enumerate(PL)}
S = D['sets']
SA = S['all']
sig = lambda x: 1 / (1 + np.exp(-x))
logit = lambda p: np.log(p / (1 - p))


def out(*a):
    print(*a, flush=True)


def kOf(mode, ch):
    m = re.search(r'\|k(\d)', mode)
    if m:
        return int(m.group(1))
    if 'duel' in mode or '|d' in mode:
        return 2
    n = len(ch.split())
    return n if 2 <= n < 4 else 4


# ---------- answers ----------
cnt, ALL = {}, []
for name, t, g, a, ok, mode, ph, e, th, nw, ch, sec, zm in D['rows']:
    cnt[name] = cnt.get(name, 0) + 1
    if name not in PL or '|t' in mode:
        continue
    r = dict(p=name, t=t, g=g, ok=ok, mode=mode, ph=ph.split(), k=kOf(mode, ch), nth=cnt[name], zm=str(zm) == '1',
             sec=float(sec) if sec not in ('', None) else None, nw=float(nw) if nw not in ('', None) else None)
    try:
        e, th = float(e), float(th)
    except (TypeError, ValueError):
        continue
    q = min(0.995, max(0.005, (e - 1 / r['k']) / (1 - 1 / r['k'])))
    r.update(e=e, th=th, gap=logit(q), d=th - logit(q))
    ALL.append(r)
T = [r for r in ALL if r['sec'] is not None and r['ph']]
for r in T:
    r.update(y=math.log(max(0.5, r['sec'])), main=r['ph'][0], nv=len(r['ph']),
             new=(r['nw'] / len(r['ph'])) if r['nw'] is not None else 1.0)
NOZ = [r for r in T if not r['zm']]
out('Timed answers of the %d timed players, not typed: %d (%d with a photo enlarged, left out: %d)' % (
    len(PL), len(T), len(T) - len(NOZ), len(NOZ)))
out('  ' + ', '.join('%s %d (median %.1f s)' % (ANON[p], sum(r['p'] == p for r in NOZ),
                                                 np.median([r['sec'] for r in NOZ if r['p'] == p])) for p in PL))

# ---------- crossed REML ----------
CTRL = {'k2': lambda r: 1.0 * (r['k'] == 2), 'views': lambda r: r['nv'] - 1, 'new': lambda r: r['new'],
        'log n': lambda r: math.log(r['nth'])}
RIGHT = {**CTRL, 'right': lambda r: r['ok']}
FULL = {**RIGHT, 'gap': lambda r: r['gap']}
FIXED = {'controls': CTRL, '+right': RIGHT, '+right+gap': FULL}
G3 = {'player': lambda r: r['p'], 'genus': lambda r: r['g'], 'photo': lambda r: r['main']}
G5 = {**G3, 'player x genus': lambda r: r['p'] + '|' + r['g'], 'player x photo': lambda r: r['p'] + '|' + r['main']}


def design(rows, fixed, groups):
    n = len(rows)
    X = np.column_stack([np.ones(n)] + [np.array([f(r) for r in rows], float) for f in fixed.values()])
    Z, levels = [], []
    for gf in groups.values():
        keys = sorted({gf(r) for r in rows})
        ix = {k: i for i, k in enumerate(keys)}
        M = np.zeros((n, len(keys)))
        for i, r in enumerate(rows):
            M[i, ix[gf(r)]] = 1
        Z.append(M)
        levels.append(keys)
    return X, Z, levels


def reml(y, X, Z, start=None, blup=True):
    """REML with the residual variance profiled out: V = s2 (I + sum g_k Z_k Z_k'), the ratios g_k on a log scale."""
    n, p = X.shape
    ZZ = [Zk @ Zk.T for Zk in Z]

    def parts(lg, full=False):
        H = np.eye(n)
        for gk, M in zip(np.exp(lg), ZZ):
            H = H + gk * M
        cf = cho_factor(H, lower=True)
        W = cho_solve(cf, np.column_stack([X, y]))
        HiX, Hiy = W[:, :p], W[:, p]
        Am = X.T @ HiX
        b = np.linalg.solve(Am, X.T @ Hiy)
        res = y - X @ b
        q = res @ (Hiy - HiX @ b)
        ll = (n - p) * np.log(q) + 2 * np.log(np.diag(cf[0])).sum() + np.linalg.slogdet(Am)[1]
        return ll, b, (cho_solve(cf, np.eye(n)) if full else None), res, Am, q / (n - p)

    x0 = start if start is not None else np.zeros(len(Z))
    o = minimize(lambda lg: parts(np.clip(lg, -12, 6))[0], x0, method='Nelder-Mead',
                 options=dict(xatol=1e-4, fatol=1e-6, maxiter=4000))
    lg = np.clip(o.x, -12, 6)
    ll, b, Hi, res, Am, s2 = parts(lg, blup)
    s = np.append(s2 * np.exp(lg), s2)
    if not blup:
        return dict(s=s, b=b, ll=ll, lv=lg)
    Vi = Hi / s2
    Pm = Vi - Vi @ X @ np.linalg.solve(Am / s2, X.T @ Vi)
    blups = [s[k] * Z[k].T @ Vi @ res for k in range(len(Z))]
    pev = [np.sqrt(np.maximum(0, s[k] - s[k] ** 2 * np.einsum('ij,ji->i', Z[k].T @ Pm, Z[k]))) for k in range(len(Z))]
    return dict(s=s, b=b, se_b=np.sqrt(np.diag(np.linalg.inv(Am / s2))), blups=blups, pev=pev, ll=ll, lv=lg)


def fit(rows, fixed, groups=G3, start=None, blup=True):
    X, Z, levels = design(rows, fixed, groups)
    m = reml(np.array([r['y'] for r in rows]), X, Z, start, blup)
    m.update(levels=levels, X=X, names=['mu'] + list(fixed), groups=list(groups))
    return m


def shares(m):
    vf = np.var(m['X'][:, 1:] @ m['b'][1:])
    return np.concatenate([[vf], m['s']]) / (m['s'].sum() + vf)


def effects(m, which):
    i = m['groups'].index(which)
    return dict(zip(m['levels'][i], m['blups'][i])), dict(zip(m['levels'][i], m['pev'][i]))


def fmt_fixed(m):
    return ', '.join('%s %+.3f ± %.3f' % (n, b, s) for n, b, s in zip(m['names'][1:], m['b'][1:], m['se_b'][1:]))


def boot(m, rows, fixed, groups, B):
    X, Z, _ = design(rows, fixed, groups)
    res = []
    for _ in range(B):
        y = X @ m['b'] + sum(Zk @ RNG.normal(0, math.sqrt(s), Zk.shape[1]) for Zk, s in zip(Z, m['s'][:-1])) \
            + RNG.normal(0, math.sqrt(m['s'][-1]), len(rows))
        mm = reml(y, X, Z, m['lv'], False)
        mm['X'] = X
        res.append(np.concatenate([shares(mm), np.sqrt(mm['s'])]))
    return np.array(res)


# ---------- 1. decomposition ----------
out('\n# 1. Decomposition of log(seconds)')
M = {}
for lab, fx in FIXED.items():
    m = M[lab] = fit(NOZ, fx)
    sh = shares(m)
    out('\n## %s: fixed %.3f | player %.3f, genus %.3f, photo %.3f, residual %.3f (sd %s)' % (
        (lab,) + tuple(sh) + (' / '.join('%.3f' % x for x in np.sqrt(m['s'])),)))
    out('   ' + fmt_fixed(m))
    if lab == '+right':
        continue
    if A.boot:
        bs = boot(m, NOZ, fx, G3, A.boot)
        lo, hi = np.percentile(bs, 2.5, 0), np.percentile(bs, 97.5, 0)
        out('   parametric bootstrap (%d), 95%%: ' % A.boot + '; '.join(
            '%s [%.3f, %.3f]' % (c, a, b) for c, a, b in zip(['fixed', 'player', 'genus', 'photo', 'residual'], lo, hi)))
        out('   sd 95%%: genus [%.3f, %.3f], photo [%.3f, %.3f]' % (lo[6], hi[6], lo[7], hi[7]))
    jk = []
    for p in PL:
        mm = fit([r for r in NOZ if r['p'] != p], fx, start=m['lv'], blup=False)
        jk.append(shares(mm))
        out('   without %s: player %.3f, genus %.3f, photo %.3f, residual %.3f' % ((ANON[p],) + tuple(shares(mm)[1:])))
    jk = np.array(jk)
    out('   jackknife se over players: ' + ', '.join('%s %.3f' % (c, x) for c, x in zip(
        ['fixed', 'player', 'genus', 'photo', 'residual'],
        np.sqrt((len(PL) - 1) / len(PL) * ((jk - jk.mean(0)) ** 2).sum(0)))))

out('\n## With the player x genus (the player\'s own knowledge of the genus) and player x photo terms')
M5 = {}
for lab in ['controls', '+right+gap']:
    m = M5[lab] = fit(NOZ, FIXED[lab], G5)
    out('   %s: fixed %.3f | player %.3f, genus %.3f, photo %.3f, player x genus %.3f, player x photo %.3f, residual %.3f' % (
        (lab,) + tuple(shares(m))))
    if A.boot5:
        bs = boot(m, NOZ, FIXED[lab], G5, A.boot5)
        out('     bootstrap (%d), 95%%: ' % A.boot5 + '; '.join('%s [%.3f, %.3f]' % (c, a, b) for c, a, b in zip(
            ['fixed', 'player', 'genus', 'photo', 'player x genus', 'player x photo', 'residual'],
            np.percentile(bs, 2.5, 0), np.percentile(bs, 97.5, 0))))

m = fit(NOZ, {**RIGHT, 'th': lambda r: r['th'], 'd': lambda r: r['d']})
out('\n## Ability and difficulty apart (+right, th and d for the gap): ' + fmt_fixed(m))
LAM_D = m['b'][m['names'].index('d')]


def r2(rows, fixed):
    y = np.array([r['y'] for r in rows])
    X, _, _ = design(rows, fixed, {})
    b = np.linalg.lstsq(X, y, rcond=None)[0]
    return 1 - np.var(y - X @ b) / np.var(y)


out('## Plain regressions (no random effects), R2 of log(seconds): right %.3f, gap %.3f, right + gap %.3f, controls %.3f, all %.3f' % (
    r2(NOZ, {'right': RIGHT['right']}), r2(NOZ, {'gap': FULL['gap']}),
    r2(NOZ, {'right': RIGHT['right'], 'gap': FULL['gap']}), r2(NOZ, CTRL), r2(NOZ, FULL)))

# ---------- 2. genus ----------
out('\n# 2. Genus')
GD = SA['gd']
gd_conf = {g: SA['openconf'] * max(0, SA['cf'][g] - SA['conftrap']) for g in GD}
gd_photo = {g: GD[g] - gd_conf[g] for g in GD}
# pooled miss rate and miss beyond Expected: every scored answer, not typed, of the players with 20 answers or more
# (test accounts, a name with "test" in it, left out)
cntp = {}
for r in D['rows']:
    cntp[r[0]] = cntp.get(r[0], 0) + 1


def pooled(skip=None):
    n, ko, ex = {}, {}, {}
    for r in D['rows']:
        if cntp[r[0]] < 20 or 'test' in r[0] or r[0] == skip or '|t' in r[5]:
            continue
        n[r[2]] = n.get(r[2], 0) + 1
        ko[r[2]] = ko.get(r[2], 0) + 1 - r[4]
        try:
            ex[r[2]] = ex.get(r[2], 0) + float(r[7]) - r[4]
        except (TypeError, ValueError):
            pass
    return n, ko, ex


ng, ko, ex = pooled()
MISS = {g: ko[g] / ng[g] for g in ng}
EXC = {g: ex.get(g, 0) / ng[g] for g in ng}
nT = {}
for r in NOZ:
    nT[r['g']] = nT.get(r['g'], 0) + 1


def corr(a, b, keys):
    x, y = [a[k] for k in keys], [b[k] for k in keys]
    return '%+.2f (rank %+.2f)' % (pearsonr(x, y)[0], spearmanr(x, y)[0])


for lab, m in M.items():
    a, pev = effects(m, 'genus')
    gs = [g for g in a if g in GD and g in MISS]
    big = [g for g in gs if nT[g] >= 10]
    rel = np.mean([1 - pev[g] ** 2 / m['s'][1] for g in gs]) if m['s'][1] > 1e-6 else 0
    out('## genus effect, %s: sd %.3f, mean reliability %.2f; correlation over %d genera | the %d with 10 timed or more' % (
        lab, math.sqrt(m['s'][1]), rel, len(gs), len(big)))
    for nm, ys in [('genusDiff', GD), ('  its photo part', gd_photo), ('  its confusion part', gd_conf),
                   ('pooled miss rate', MISS), ('miss beyond Expected', EXC)]:
        out('   %-22s %s | %s' % (nm, corr(a, ys, gs), corr(a, ys, big)))
gs = [g for g in GD if g in MISS and g in nT]
out('## genusDiff against the pooled miss rate: %s; against the miss beyond Expected: %s' % (corr(GD, MISS, gs), corr(GD, EXC, gs)))
a0, _ = effects(M['controls'], 'genus')
srt = sorted(a0.items(), key=lambda x: x[1])
for nm, part in [('fastest', srt[:6]), ('slowest', srt[-6:])]:
    out('   %s: ' % nm + ', '.join('%s %+.2f (%d timed, genusDiff %+.2f, miss %.2f)' % (
        g, x, nT[g], GD.get(g, 0), MISS.get(g, 0)) for g, x in part))
for lab in ['controls', '+right+gap']:
    m = fit(NOZ, {**FIXED[lab], 'genusDiff': lambda r: GD.get(r['g'], 0.0)})
    out('## %s + genusDiff as a covariate of time: %+.3f ± %.3f; genus sd %.3f (without it %.3f)' % (
        lab, m['b'][-1], m['se_b'][-1], math.sqrt(m['s'][1]), math.sqrt(M[lab]['s'][1])))


def halves_r(A_, B_, fx, minn):
    ma, mb = fit(A_, fx), fit(B_, fx)
    xa, xb = effects(ma, 'genus')[0], effects(mb, 'genus')[0]
    na, nb = {}, {}
    for r in A_:
        na[r['g']] = na.get(r['g'], 0) + 1
    for r in B_:
        nb[r['g']] = nb.get(r['g'], 0) + 1
    gg = [g for g in xa if g in xb and na[g] >= minn and nb[g] >= minn]
    va, vb = [xa[g] for g in gg], [xb[g] for g in gg]
    if len(gg) < 5 or np.std(va) < 1e-9 or np.std(vb) < 1e-9:
        return None
    return pearsonr(va, vb)[0], len(gg)


out('## Stability of the genus effect (correlation of the two halves\' effects)')
for lab in ['controls', '+right+gap']:
    fx = FIXED[lab]
    o = [halves_r([r for r in NOZ if r['p'] in c], [r for r in NOZ if r['p'] not in c], fx, 5)
         for c in itertools.combinations(PL, 2)]
    o = [x for x in o if x]
    out('   %s, players in two groups (every 2 v 3 split, genera with 5 timed in both): mean %+.2f, range [%+.2f, %+.2f] over %d-%d genera' % (
        lab, np.mean([x[0] for x in o]), min(x[0] for x in o), max(x[0] for x in o), min(x[1] for x in o), max(x[1] for x in o)))
    for nm, cut in [('first / second half of each player\'s answers', lambda L: (L[:len(L) // 2], L[len(L) // 2:])),
                    ('odd / even answers of each player', lambda L: (L[0::2], L[1::2]))]:
        h1, h2 = [], []
        for p in PL:
            a_, b_ = cut(sorted([r for r in NOZ if r['p'] == p], key=lambda r: r['t']))
            h1 += a_
            h2 += b_
        o = halves_r(h1, h2, fx, 3)
        out('   %s, %s: %s' % (lab, nm, '%+.2f over %d genera' % o if o else 'too few'))


# out of sample
def nll(y, p):
    return -(y * np.log(p) + (1 - y) * np.log(1 - p))


def predict(rows, feats, off, c, b):
    g = np.array([1 / r['k'] for r in rows])
    z = np.array([off(r) for r in rows]) + c
    if feats:
        z = z + np.array([[r[f] for f in feats] for r in rows]) @ b
    return np.clip(g + (1 - g) * sig(z), 1e-6, 1 - 1e-6)


def fitlog(rows, feats, off):
    ps = sorted({r['p'] for r in rows})
    pi = np.array([ps.index(r['p']) for r in rows])
    y = np.array([r['ok'] for r in rows])

    def f(w):
        return nll(y, predict(rows, feats, off, w[pi], w[len(ps):])).sum() + 1e-3 * (w[len(ps):] @ w[len(ps):])
    return minimize(f, np.zeros(len(ps) + len(feats)), method='L-BFGS-B').x[len(ps):]


OFFS = {'the player\'s level only': lambda r: 0.0, 'the app\'s expectation (logged)': lambda r: r['gap']}


def cv(rows, models, offname):
    """Each player predicted with coefficients fitted on the other players (their own features left them out too)."""
    off, res = OFFS[offname], {}
    for name, feats in models.items():
        ll, coefs = np.zeros(len(rows)), []
        for p in PL:
            b = fitlog([r for r in rows if r['p'] != p], feats, off)
            coefs.append(b)
            idx = [i for i, r in enumerate(rows) if r['p'] == p]
            te = [rows[i] for i in idx]
            y = np.array([r['ok'] for r in te])
            cp = minimize(lambda w: nll(y, predict(te, feats, off, w[0], b)).sum(), [0.0], method='L-BFGS-B').x[0]
            ll[idx] = nll(y, predict(te, feats, off, cp, b))
        res[name] = (ll, np.mean(coefs, 0) if feats else [])
    return res


def show(rows, res, pairs):
    base = res['base'][0]
    out('     base log-loss %.4f (%d answers)' % (base.mean(), len(base)))
    for name, (ll, b) in res.items():
        if name == 'base':
            continue
        d = ll - base
        per = ' '.join('%s %+.1f' % (ANON[p], 1e3 * d[[i for i, r in enumerate(rows) if r['p'] == p]].mean()) for p in PL)
        out('     %-9s %+.2f ± %.2f x 1e-3 | coefficients %s | %s' % (
            name, 1e3 * d.mean(), 1e3 * d.std() / math.sqrt(len(d)), ' '.join('%+.2f' % x for x in b), per))
    for x, y_ in pairs:
        d = res[x][0] - res[y_][0]
        out('     %s against %s: %+.2f ± %.2f x 1e-3' % (x, y_, 1e3 * d.mean(), 1e3 * d.std() / math.sqrt(len(d))))


SC = ALL  # every scored answer of the timed players with Expected logged, timed or not, not typed
for p in PL:
    rest = [r for r in NOZ if r['p'] != p]
    a0 = effects(fit(rest, CTRL), 'genus')[0]
    a2 = effects(fit(rest, FULL), 'genus')[0]
    gd = S['-' + p]['gd']
    n_, k_, _ = pooled(skip=p)
    tot = sum(k_.values()) / sum(n_.values())
    for r in SC:
        if r['p'] == p:
            r.update(x_gd=gd.get(r['g'], 0.0), x_a0=a0.get(r['g'], 0.0), x_a2=a2.get(r['g'], 0.0),
                     x_miss=logit((k_.get(r['g'], 0) + 5 * tot) / (n_.get(r['g'], 0) + 5)))
GM = {'base': [], '+gd': ['x_gd'], '+a0': ['x_a0'], '+gd+a0': ['x_gd', 'x_a0'], '+a2': ['x_a2'],
      '+gd+a2': ['x_gd', 'x_a2'], '+miss': ['x_miss'], '+miss+a0': ['x_miss', 'x_a0']}
out('## Out of sample (log-loss difference per answer against the base; gd = genusDiff, miss = logit of the pooled miss rate'
    ' shrunk with 5 answers, a0 / a2 = the genus time effect, controls / +right+gap, all three from the other players)')
for offname in OFFS:
    out('   offset: %s' % offname)
    show(SC, cv(SC, GM, offname), [('+gd+a0', '+gd'), ('+gd+a2', '+gd'), ('+miss+a0', '+miss')])
seen, FM = set(), []
for r in sorted(SC, key=lambda r: (r['p'], r['t'])):
    if (r['p'], r['g']) not in seen:
        seen.add((r['p'], r['g']))
        FM.append(r)
out('   first answer of each player on each genus only (what the opening order is about):')
show(FM, cv(FM, {k: GM[k] for k in ['base', '+gd', '+a0', '+gd+a0', '+miss', '+miss+a0']}, 'the player\'s level only'),
     [('+gd+a0', '+gd')])

# ---------- 3. photo ----------
out('\n# 3. Photo (the question\'s first photo)')
nP, plP = {}, {}
for r in NOZ:
    nP[r['main']] = nP.get(r['main'], 0) + 1
    plP.setdefault(r['main'], set()).add(r['p'])
out('## %d photos; timed answers: 2 or more %d, 3 or more %d, 5 or more %d; 2 players or more %d, 3 or more %d' % (
    len(nP), sum(v >= 2 for v in nP.values()), sum(v >= 3 for v in nP.values()), sum(v >= 5 for v in nP.values()),
    sum(len(v) >= 2 for v in plP.values()), sum(len(v) >= 3 for v in plP.values())))
PD, PE = SA['pd'], SA['photos']
ELO = {f: v[0] for f, v in PE.items()}
PMISS = {f: 1 - v[2] / v[1] for f, v in PE.items() if v[1] > 0}
for lab, m in M.items():
    b, pev = effects(m, 'photo')
    for mn in [1, 2, 3]:
        fs = [f for f in b if nP[f] >= mn and f in PD and f in PMISS]
        out('   %s, photos with %d timed or more (%d, mean reliability %.2f): with photoDiff %s, Elo %s, miss rate %s' % (
            lab, mn, len(fs), np.mean([1 - pev[f] ** 2 / m['s'][2] for f in fs]), corr(b, PD, fs), corr(b, ELO, fs),
            corr(b, PMISS, fs)))
for lab in ['controls', '+right']:
    for key, src in [('photoDiff', PD), ('photo Elo', ELO)]:
        m = fit(NOZ, {**FIXED[lab], key: lambda r, src=src: src.get(r['main'], 0.0)})
        out('## %s + %s as a covariate of time: %+.3f ± %.3f per unit; photo sd %.3f (without it %.3f)' % (
            lab, key, m['b'][-1], m['se_b'][-1], math.sqrt(m['s'][2]), math.sqrt(M[lab]['s'][2])))
for p in PL:
    rest = [r for r in NOZ if r['p'] != p]
    b0 = effects(fit(rest, CTRL), 'photo')[0]
    b1 = effects(fit(rest, RIGHT), 'photo')[0]
    no = {}
    for r in rest:
        no[r['main']] = no.get(r['main'], 0) + 1
    pdl = S['-' + p]['pd']
    for r in SC:
        if r['p'] == p:
            f = r['ph'][0] if r['ph'] else ''
            r.update(x_b0=b0.get(f, 0.0), x_b1=b1.get(f, 0.0), x_pd=pdl.get(f, 0.0), n_other=no.get(f, 0))
PS = [r for r in SC if r['n_other'] >= 1]
out('## Cross-player: answers on a photo another player answered with a time: %d (%s)' % (
    len(PS), ', '.join('%s %d' % (ANON[p], sum(r['p'] == p for r in PS)) for p in PL)))
PM = {'base': [], '+pd': ['x_pd'], '+b0': ['x_b0'], '+pd+b0': ['x_pd', 'x_b0'], '+b1': ['x_b1'], '+pd+b1': ['x_pd', 'x_b1']}
for offname in OFFS:
    out('   offset: %s (pd = photoDiff, b0 / b1 = the photo time effect, controls / +right, from the other players)' % offname)
    show(PS, cv(PS, PM, offname), [('+pd+b0', '+pd'), ('+pd+b1', '+pd')])

# ---------- 4. thresholds ----------
out('\n# 4. How much data')
m5 = M5['controls']
s = dict(zip(m5['groups'] + ['resid'], m5['s']))
out('## Reliability of a genus time effect over m players with n timed answers each on it (5-effect model, controls: '
    'genus sd %.3f, player x genus %.3f, residual %.3f)' % (math.sqrt(s['genus']), math.sqrt(s['player x genus']), math.sqrt(s['resid'])))
for n in [3, 5, 10]:
    out('   n %2d: ' % n + ', '.join('m %d: %.2f' % (mm, s['genus'] / (s['genus'] + s['player x genus'] / mm + s['resid'] / (mm * n)))
                                   for mm in [5, 10, 15, 20, 30]))
s3 = M['+right']['s']
out('## Reliability of a photo time effect over n timed answers (+right: photo sd %.3f, residual %.3f): ' % (
    math.sqrt(s3[2]), math.sqrt(s3[3])) + ', '.join('n %d: %.2f' % (n, s3[2] / (s3[2] + s3[3] / n)) for n in [1, 2, 3, 5, 10, 20]))
out('   time per logit of the question\'s difficulty d (from section 1): %+.3f' % LAM_D)
n_, dist = len(NOZ), len(nP)
Peff = brentq(lambda P: P * (1 - math.exp(-n_ / P)) - dist, dist + 1, 1e7)
out('## Photos with 5 timed answers or more for a given number of timed answers (Poisson; effective pool %.0f photos from '
    'today\'s %d answers on %d photos; the app has %d game photos)' % (Peff, n_, dist, len(PD)))
for P in [Peff, len(PD)]:
    out('   pool %4.0f: ' % P + ', '.join('%d: %.0f' % (t, P * poisson.sf(4, t / P)) for t in [1000, 2000, 3000, 4000, 6000]))
