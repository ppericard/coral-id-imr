"""Q316's offline fit (tools/studies/q316/README.md): one difficulty per question as rank offset + family + genus +
species + photo components, players crossed with them, fitted by maximum marginal likelihood under the Laplace
approximation, and its own acceptance test (the estimator's check, declared before any real run).

Model, one answer:
    P(right) = g + (1 - g) sig(eta),   g = 1/k plausible choices (0 typed)
    eta = c + b1 log(1 + earlier answers in the subject) + b2 log(1 + earlier answers on the unit)
          + a_player + d_(player, unit)
          - r_rank - kappa mean_photos(3 - ease)
          - b_family - b_genus - b_species [- c_genus at genus and species rank] - mean_photos(b_photo)
          - off
off: the engine's own memory, mix-up, format and single-view terms (prep.js), an offset, not estimated. a, d, b, c
normal random effects with mean 0 and one SD per level; c, b1, b2, r, kappa fixed effects with a weak N(0, 10^2) prior.
The SDs maximise the Laplace approximation of the marginal likelihood, log-determinant included (lme4's glmer does the
same): L(psi) = log p(y | theta*) - 1/2 theta*' Lambda theta* + 1/2 log|Lambda| - 1/2 log|H|, at the mode theta* of the
penalised likelihood (Fisher scoring), H the observed curvature there (the expected one when the observed is not
positive definite: the guess floor makes the likelihood non-concave), psi = log SD, bounded to [log 0.005, log 5], by
L-BFGS-B. Not the EM fixed point of analysis.js glmm or tools/studies/q351/refit.py: the study's probe saw it drift.

Intervals: Wald on log SD from the numerical curvature of L in psi, all the SDs at once; an SD at its lower bound
(under SD_FLOOR) or without positive curvature gets [0, U], U the one-sided likelihood-ratio bound with the other SDs
held at their estimate. The fixed effects' intervals from H^-1 at the mode.

Acceptance (ACCEPT, declared before any real run): on the design given (the real rows' player, unit, photo, rank, k,
offsets), answers simulated from known values REPS times and refitted; an SD or a rank offset passes when its mean bias
is within BIAS and its 90% interval covers the truth in at least COVER of the REPS. Run twice on the real design, from
the rated world's values and from the fit's own (a parametric bootstrap); a value that fails either is reported "not
estimable on today's log", with no value. If the genus or the species SD fails, the model with one SD shared by the
genus and species levels is tested the same way (the study's fallback).

    python3 tools/studies/q316/fit.py fit <export.json> <out.json> [--reps 20] [--sibling] [--coral-family]
                                      [--half A|B] [--no-accept] [--deadline <epoch s>] [--budget <minutes>]
    python3 tools/studies/q316/fit.py synth <fish|coral|fish-rich|coral-large> <out.json> [--reps 20] [--seed 1]
                                        [--budget m]

fit: the export tools/studies/q316/prep.js writes (kept outside the repository). --half: the players of one half
(prep.js's split) only, for the replay's held-out SDs. --no-accept: the fit alone (the halves, the replay's reference). --sibling (fish, exploratory): the "tell it from its
siblings" genus term. --coral-family (corals, exploratory): the coral families of tools/taxonomy.json as a level.
synth: the study's synthetic designs (no player), the estimator's own check; its figures are in the README.
The clock: one deadline (--deadline, epoch seconds, from tools/studies/q316/run.py) or --budget minutes from the start
(default 40, rule L11); past it the run stops, writes what it has and marks the rest "the measure cannot tell".
Read-only: reads its input, writes only its output file, prints aggregates and P1, P2... labels, never a name.
"""
import json
import math
import os
import sys
import time

import numpy as np
from scipy import sparse
from scipy.optimize import minimize
from scipy.sparse.linalg import splu

# ---- Declared before any real run (the README repeats them; tests/q316.test.js checks they agree).
ACCEPT = {'reps': 20, 'bias': 0.1, 'cover': 15, 'level': 0.90}
# The estimator's own adequacy, declared before the synthetic runs: a value that fails ACCEPT on the data-rich synthetic
# design (synth fish-rich) is the estimator's fault (the next step would be the study's Gibbs sampler); one that passes
# there and fails at today's size (synth fish, synth coral, the real design) is not estimable on that much data.
# synth coral-large (added after the first figures: large clusters) tells the two apart for the photo SD and tau.
# The rated world's values (tools/ratedworld.js RATED; the study's probe), the first truth of the acceptance test, and
# the synthetic designs' truth. Rank offsets: the probe's +0.4 genus, +0.8 species (the rated world has none).
RATED = {
    'sd': {'player': 0.5, 'pu': 0.3, 'fam': 0.37, 'gen': 0.3, 'sp': 0.3, 'photo': 0.46, 'sib': 0.0, 'gs': 0.3},
    'coral_gen': 0.37,
    'beta': {'c': 0.8, 'r_genus': 0.4, 'r_species': 0.8, 'prac_s': 0.0, 'prac_u': 0.0, 'kappa': 0.5},
}
BUDGET_MIN = 40  # rule L11's cap
SD_LO, SD_HI = 0.005, 5.0
SD_FLOOR = 0.02  # an estimate under it sits at the boundary: one-sided interval
FIX_SD = 10.0
TESTED_FIXED = ('r_genus', 'r_species')  # the fixed effects the acceptance test checks (the study: each rank offset)
LABEL = {
    'player': 'player',
    'pu': 'player x unit (tau, Q136)',
    'fam': 'family',
    'gen': 'genus',
    'sp': 'species',
    'gs': 'genus and species (one shared SD)',
    'sib': 'sibling term c_G (exploratory)',
    'cfam': 'coral family (exploratory)',
    'photo': 'photo',
}
NOT_ESTIMABLE = 'not estimable on today\'s log'
CANNOT_TELL = 'the measure cannot tell'


class Deadline(Exception):
    pass


class Clock:
    """The run's deadline: the one given (run.py's) or budget minutes from now, never past BUDGET_MIN from now (rule
    L11's cap)."""

    def __init__(self, deadline=None, budget=BUDGET_MIN):
        self.t0 = time.time()
        cap = self.t0 + BUDGET_MIN * 60
        self.end = min(deadline if deadline else self.t0 + budget * 60, cap)
        self.cut = False

    def left(self):
        return self.end - time.time()

    def check(self):
        if time.time() > self.end:
            self.cut = True
            raise Deadline()


# ---- The design: fixed columns X and the random factors Z, from the export's rows.
def build(rows, sibling=False, coral_family=False, shared=False):
    """rows: the export's rows ({p, u, rk, F, G, S, ph, ez, g, y, off, np, nu}). Returns the design: A (sparse, fixed
    columns then each factor's levels), the column blocks, and for each factor its SD parameter (shared: genus and
    species one parameter)."""
    n = len(rows)
    ranks = {r['rk'] for r in rows}
    fishlike = any(r.get('S') for r in rows)
    fixed = ['c', 'prac_s', 'prac_u']
    if fishlike and 'family' in ranks:
        fixed += [x for x in ('r_genus', 'r_species') if x[2:] in ranks]
    if any(any(e for e in r.get('ez') or []) for r in rows):
        fixed.append('kappa')
    facs = [('player', lambda r: [(r['p'], 1.0)]), ('pu', lambda r: [(r['p'] + '|' + r['u'], 1.0)])]
    if fishlike or coral_family:
        name = 'fam' if fishlike else 'cfam'
        facs.append((name, lambda r: [(r['F'], -1.0)] if r.get('F') else []))
    facs.append(('gen', lambda r: [(r['G'], -1.0)] if r.get('G') else []))
    if fishlike:
        facs.append(('sp', lambda r: [(r['S'], -1.0)] if r.get('S') else []))
        if sibling:
            facs.append(('sib', lambda r: [(r['G'], -1.0)] if r.get('G') and r['rk'] in ('genus', 'species') else []))
    facs.append(('photo', lambda r: [(f, -1.0 / len(r['ph'])) for f in r['ph']]))
    I, J, V = [], [], []
    for i, r in enumerate(rows):
        ez = r.get('ez') or [0.0]
        vals = {
            'c': 1.0,
            'prac_s': math.log1p(r.get('np', 0)),
            'prac_u': math.log1p(r.get('nu', 0)),
            'r_genus': -1.0 if r['rk'] == 'genus' else 0.0,
            'r_species': -1.0 if r['rk'] == 'species' else 0.0,
            'kappa': -sum(ez) / len(ez),
        }
        for j, f in enumerate(fixed):
            if vals[f]:
                I.append(i)
                J.append(j)
                V.append(vals[f])
    col = len(fixed)
    blocks = []
    for name, of in facs:
        lv = {}
        for i, r in enumerate(rows):
            for key, v in of(r):
                if key not in lv:
                    lv[key] = len(lv)
                I.append(i)
                J.append(col + lv[key])
                V.append(v)
        if lv:
            blocks.append({'name': name, 'start': col, 'q': len(lv), 'levels': list(lv)})
            col += len(lv)
    A = sparse.csr_matrix((V, (I, J)), shape=(n, col))
    # One fill-reducing order for the design (the curvature's pattern never changes): found once by SuperLU's minimum
    # degree on A'A, then every factorisation takes it as it is (6 times faster than ordering each time).
    o = splu((A.T @ A + sparse.identity(col)).tocsc(), permc_spec='MMD_AT_PLUS_A', diag_pivot_thresh=0, options={'SymmetricMode': True})
    order = np.argsort(o.perm_c)
    Ap = A[:, order].tocsr()
    par = []
    for b in blocks:
        p = 'gs' if shared and b['name'] in ('gen', 'sp') else b['name']
        b['par'] = p
        if p not in par:
            par.append(p)
    return {
        'A': A,
        'Ap': Ap,
        'ApT': Ap.T.tocsr(),
        'order': order,
        'fixed': fixed,
        'blocks': blocks,
        'par': par,
        'n': n,
        'p': col,
        'y': np.array([r['y'] for r in rows], float),
        'g': np.array([r['g'] for r in rows], float),
        'off': np.array([r.get('off', 0.0) for r in rows], float),
    }


def lam_of(D, psi):
    """The prior precisions of every column: fixed 1/FIX_SD^2, a factor's levels 1/SD^2."""
    L = np.full(D['p'], 1.0 / FIX_SD**2)
    sd = dict(zip(D['par'], np.exp(psi)))
    for b in D['blocks']:
        L[b['start'] : b['start'] + b['q']] = 1.0 / sd[b['par']] ** 2
    return L


def _parts(D, th, A=None):
    eta = (D['A'] if A is None else A) @ th - D['off']
    s = 1.0 / (1.0 + np.exp(-np.clip(eta, -35, 35)))
    g = D['g']
    p = np.clip(g + (1 - g) * s, 1e-12, 1 - 1e-12)
    return s, p


def _factor(M):
    # Already in the design's fill-reducing order (build); symmetric mode (diagonal pivots): the pivots are all
    # positive exactly when M is positive definite.
    return splu(M.tocsc(), permc_spec='NATURAL', diag_pivot_thresh=0, options={'SymmetricMode': True})


class Curv:
    """The factorised curvature at the mode, solving in the design's own column order."""

    def __init__(self, D, lu):
        self.lu, self.order = lu, D['order']

    def logdet(self):
        return float(np.sum(np.log(np.abs(self.lu.U.diagonal()))))

    def solve(self, b):
        x = np.empty_like(b)
        x[self.order] = self.lu.solve(b[self.order])
        return x


def mode(D, L, th):
    """The mode of the penalised log-likelihood under the precisions L, by Fisher scoring with step halving, from th.
    Returns th*, the penalised log-likelihood there and the factorised curvature (observed, else expected). Works in
    the design's fill-reducing order (Ap: A's columns permuted)."""
    y, g, A, AT, o = D['y'], D['g'], D['Ap'], D['ApT'], D['order']
    L = L[o]
    th = th[o]

    def pen(t):
        s, p = _parts(D, t, A)
        return float(np.sum(y * np.log(p) + (1 - y) * np.log(1 - p)) - 0.5 * np.sum(L * t * t))

    cur = pen(th)
    for _ in range(100):
        s, p = _parts(D, th, A)
        q = p * (1 - p)
        d1 = (1 - g) * s * (1 - s)
        score = AT @ ((y - p) * d1 / q) - L * th
        lu = _factor(AT @ sparse.diags(d1 * d1 / q) @ A + sparse.diags(L))
        step = lu.solve(score)
        t = 1.0
        while True:
            new = th + t * step
            val = pen(new)
            if val >= cur - 1e-10 or t < 1e-4:
                break
            t /= 2
        # Newton's convergence is quadratic: after a step under 1e-6 the mode is exact to far below what the outer
        # finite differences (1e-4 in log SD) can see.
        th, done = new, np.max(np.abs(t * step)) < 1e-6
        cur = val
        if done:
            break
    s, p = _parts(D, th, A)
    q = p * (1 - p)
    d1 = (1 - g) * s * (1 - s)
    d2 = d1 * (1 - 2 * s)
    u = (y - p) / q
    du = (-q - (y - p) * (1 - 2 * p)) / (q * q)
    wo = -(du * d1 * d1 + u * d2)
    lu = _factor(AT @ sparse.diags(wo) @ A + sparse.diags(L))
    if not np.all(lu.U.diagonal() > 0):
        lu = _factor(AT @ sparse.diags(d1 * d1 / q) @ A + sparse.diags(L))
    out = np.empty_like(th)
    out[o] = th
    return out, cur, Curv(D, lu)


class Laplace:
    """The Laplace marginal log-likelihood of the SDs, its mode warm-started from the last evaluation."""

    def __init__(self, D, clock=None):
        self.D, self.clock, self.th, self.evals = D, clock, np.zeros(D['p']), 0

    def __call__(self, psi):
        if self.clock:
            self.clock.check()
        self.evals += 1
        L = lam_of(self.D, psi)
        th, pen, cv = mode(self.D, L, self.th.copy())
        self.th = th
        self.last = (th, cv)
        return pen + 0.5 * float(np.sum(np.log(L))) - 0.5 * cv.logdet()


def _hess(f, x, h=1e-3):
    m = len(x)
    H = np.zeros((m, m))
    f0 = f(x)
    for i in range(m):
        for j in range(i, m):
            if i == j:
                e = np.zeros(m)
                e[i] = h
                H[i, i] = (f(x + e) - 2 * f0 + f(x - e)) / h**2
            else:
                ei, ej = np.zeros(m), np.zeros(m)
                ei[i], ej[j] = h, h
                H[i, j] = H[j, i] = (f(x + ei + ej) - f(x + ei - ej) - f(x - ei + ej) + f(x - ei - ej)) / (4 * h * h)
    return H


def zq(level):
    """The two-sided normal quantile of a central interval at level (0.90: 1.645, 0.95: 1.960)."""
    return {0.90: 1.6448536269514722, 0.95: 1.959963984540054}[level]


def fit(D, clock=None, levels=(0.90, 0.95), start=None):
    """Maximum Laplace marginal likelihood. Returns {sd: {par: [est, {level: [lo, hi]}]}, fixed: {name: [est, se,
    {level: [lo, hi]}]}, loglik, evals, seconds, effects}."""
    t0 = time.time()
    F = Laplace(D, clock)
    m = len(D['par'])
    lo, hi = math.log(SD_LO), math.log(SD_HI)
    x0 = np.array(start if start is not None else [math.log(0.3)] * m)
    res = minimize(lambda x: -F(x), x0, method='L-BFGS-B', bounds=[(lo, hi)] * m, options={'maxiter': 200, 'eps': 1e-4})
    psi = res.x
    best = F(psi)
    # Wald intervals on log SD, every SD at once; the ones at the boundary or without curvature: one-sided LR.
    inner = [i for i in range(m) if math.exp(psi[i]) >= SD_FLOOR]
    cov = None
    if inner:
        sub = lambda z: -F(np.array([z[inner.index(i)] if i in inner else psi[i] for i in range(m)]))  # noqa: E731
        Hs = _hess(sub, psi[inner])
        try:
            C = np.linalg.inv(Hs)
            if np.all(np.diag(C) > 0) and np.all(np.linalg.eigvalsh((Hs + Hs.T) / 2) > 0):
                cov = C
        except np.linalg.LinAlgError:
            cov = None
    sd = {}
    for i, name in enumerate(D['par']):
        est = math.exp(psi[i])
        iv = {}
        for lev in levels:
            if cov is not None and i in inner and cov[inner.index(i), inner.index(i)] > 0:
                se = math.sqrt(cov[inner.index(i), inner.index(i)])
                iv[lev] = [math.exp(psi[i] - zq(lev) * se), math.exp(psi[i] + zq(lev) * se)]
            else:
                iv[lev] = [0.0, _lr_upper(F, psi, i, best, zq(lev) ** 2 / 2)]
        sd[name] = [est, iv]
    F(psi)
    th, lu = F.last
    fixed = {}
    q = len(D['fixed'])
    for j, name in enumerate(D['fixed']):
        e = np.zeros(D['p'])
        e[j] = 1.0
        var = float(lu.solve(e)[j])
        se = math.sqrt(max(var, 0.0))
        fixed[name] = [float(th[j]), se, {lev: [float(th[j]) - zq(lev) * se, float(th[j]) + zq(lev) * se] for lev in levels}]
    eff = {b['name']: dict(zip(b['levels'], th[b['start'] : b['start'] + b['q']].tolist())) for b in D['blocks']}
    return {
        'sd': sd,
        'fixed': fixed,
        'loglik': best,
        'evals': F.evals,
        'seconds': time.time() - t0,
        'converged': bool(res.success),
        'effects': eff,
        'cov_psi': None if cov is None else {'pars': [D['par'][i] for i in inner], 'cov': cov.tolist()},
        'q': q,
    }


def _lr_upper(F, psi, i, best, drop):
    """The SD above the estimate where L, the other SDs held, falls by drop (z^2 / 2 of the central interval's level:
    90% 1.35, 95% 1.92); SD_HI when it never does."""
    lo, hi = psi[i], math.log(SD_HI)

    def at(z):
        x = psi.copy()
        x[i] = z
        return best - F(x)

    if at(hi) < drop:
        return SD_HI
    for _ in range(12):  # the bracket is at most 7 wide in log SD: 12 halvings put U within 0.2%
        mid = (lo + hi) / 2
        if at(mid) < drop:
            lo = mid
        else:
            hi = mid
    return math.exp(hi)


# ---- Simulation from known values on a design (the acceptance test), and the study's synthetic designs.
def truth_rated(D, subject):
    sd = {p: (RATED['coral_gen'] if p == 'gen' and subject == 'coral' else RATED['sd'].get(p, 0.3)) for p in D['par']}
    if 'cfam' in sd:
        sd['cfam'] = 0.3
    return {'sd': sd, 'beta': {f: RATED['beta'][f] for f in D['fixed']}}


def truth_fit(D, F):
    return {'sd': {p: F['sd'][p][0] for p in D['par']}, 'beta': {f: F['fixed'][f][0] for f in D['fixed']}}


def simulate(D, truth, rng):
    th = np.zeros(D['p'])
    for j, f in enumerate(D['fixed']):
        th[j] = truth['beta'][f]
    for b in D['blocks']:
        th[b['start'] : b['start'] + b['q']] = rng.normal(0.0, truth['sd'][b['par']], b['q'])
    s, p = _parts(D, th)
    return (rng.random(D['n']) < p).astype(float)


def accept(D, truth, reps, rng, clock=None, log=None):
    """The acceptance test: reps answer sets simulated from truth on design D, each refitted. Per tested value: mean
    bias, 90% coverage, pass. Stops at the deadline (the replicates done are kept, the verdict is "the measure cannot
    tell" when fewer than reps finished)."""
    est = {p: [] for p in D['par']}
    est.update({f: [] for f in D['fixed'] if f in TESTED_FIXED})
    cov = {k: 0 for k in est}
    done = 0
    y0 = D['y']
    secs = []
    try:
        for r in range(reps):
            D['y'] = simulate(D, truth, rng)
            F = fit(D, clock, levels=(ACCEPT['level'],))
            secs.append(F['seconds'])
            for p in D['par']:
                e, iv = F['sd'][p]
                est[p].append(e)
                lo, hi = iv[ACCEPT['level']]
                cov[p] += lo <= truth['sd'][p] <= hi
            for f in est:
                if f in F['fixed']:
                    e, se, iv = F['fixed'][f]
                    est[f].append(e)
                    lo, hi = iv[ACCEPT['level']]
                    cov[f] += lo <= truth['beta'][f] <= hi
            done += 1
            if log:
                log(f'  replicate {done}/{reps}: {F["seconds"]:.1f} s')
    except Deadline:
        pass
    finally:
        D['y'] = y0
    out = {}
    for k, v in est.items():
        t = truth['sd'][k] if k in truth['sd'] else truth['beta'][k]
        out[k] = verdict(v, t, cov[k], done, reps)
    return {'reps': reps, 'done': done, 'seconds_per_fit': (sum(secs) / len(secs)) if secs else None, 'values': out}


def verdict(est, true, covered, done, reps):
    """ACCEPT's rule on one value: passes when |mean bias| <= bias and the 90% interval covered the truth in >= cover of
    the reps; fewer replicates than reps finished (the deadline): the measure cannot tell."""
    if done < reps:
        return {'truth': true, 'done': done, 'verdict': CANNOT_TELL}
    bias = float(np.mean(est) - true)
    ok = abs(bias) <= ACCEPT['bias'] and covered >= ACCEPT['cover']
    return {
        'truth': true,
        'mean': float(np.mean(est)),
        'bias': bias,
        'sd_of_estimates': float(np.std(est, ddof=1)) if len(est) > 1 else 0.0,
        'covered': int(covered),
        'done': done,
        'verdict': 'pass' if ok else 'fail',
    }


def synth_rows(kind, rng):
    """The study's synthetic designs (q316 study §2A, the probe): fish-like (65 families of 2 genera of 2-3 species, 8
    photos each; 3,000 answers of 10 players; 80% family, 15% genus, 5% species rank; 4 choices 60%, else 2), its
    data-rich version (12,000 answers of 20 players, the probe's larger design), coral-like (40 units, 25 photos each; 4,000 answers of 15
    players). A few players hold most answers (share 1/i), as in the real log. Fish photos get an ease 1-5."""
    rows = []
    if kind in ('coral', 'coral-large'):
        # coral-large (added after the first figures): 10 units of 4 photos, so about 100 answers per photo and 27 per
        # player x unit; it tells the estimator's bias from too few answers per photo and per player x unit
        nu_, nph = (10, 4) if kind == 'coral-large' else (40, 25)
        units = [(f'u{u}', [f'u{u}p{i}' for i in range(nph)]) for u in range(nu_)]
        nans, npl = 4000, 15
    else:
        nans, npl = (12000, 20) if kind == 'fish-rich' else (3000, 10)
        tax = []
        for f in range(65):
            for gi in range(2):
                G = f'g{f}_{gi}'
                for s in range(2 + int(rng.random() * 2)):
                    S = f'{G}_s{s}'
                    tax.append((f'f{f}', G, S, [f'{S}p{i}' for i in range(8)]))
        ease = {ph: int(rng.integers(1, 6)) for t in tax for ph in t[3]}
    share = np.array([1.0 / (i + 1) for i in range(npl)])
    share /= share.sum()
    seen_s, seen_u = {}, {}
    for _ in range(nans):
        p = f'P{int(rng.choice(npl, p=share)) + 1}'
        k = 4 if rng.random() < 0.6 else 2
        if kind in ('coral', 'coral-large'):
            u, phs = units[int(rng.integers(len(units)))]
            ph = phs[int(rng.integers(len(phs)))]
            row = {'p': p, 'u': u, 'rk': 'genus', 'F': None, 'G': u, 'S': None, 'ph': [ph], 'ez': [0.0]}
        else:
            F, G, S, phs = tax[int(rng.integers(len(tax)))]
            ph = phs[int(rng.integers(len(phs)))]
            x = rng.random()
            rk = 'family' if x < 0.8 else 'genus' if x < 0.95 else 'species'
            u = {'family': 'f:' + F, 'genus': 'g:' + G, 'species': 's:' + S}[rk]
            row = {'p': p, 'u': u, 'rk': rk, 'F': F, 'G': G, 'S': S, 'ph': [ph], 'ez': [3.0 - ease[ph]]}
        row.update({'g': 1.0 / k, 'y': 0, 'off': 0.0, 'np': seen_s.get(p, 0), 'nu': seen_u.get(p + '|' + row['u'], 0)})
        seen_s[p] = seen_s.get(p, 0) + 1
        seen_u[p + '|' + row['u']] = seen_u.get(p + '|' + row['u'], 0) + 1
        rows.append(row)
    return rows


# ---- The real export: the fit, the acceptance test from the rated world and from the fit, the fallback, the shares.
def shares(F, keys, rng, draws=2000):
    """The share of the item variance of each level (family, genus, species, photo), with a 95% interval from draws of
    log SD ~ N(estimate, its covariance). Only when every key has a Wald covariance."""
    cp = F.get('cov_psi')
    if not cp or not all(k in cp['pars'] for k in keys):
        return None
    idx = [cp['pars'].index(k) for k in keys]
    mu = np.log([F['sd'][k][0] for k in keys])
    C = np.array(cp['cov'])[np.ix_(idx, idx)]
    z = np.exp(2 * rng.multivariate_normal(mu, C, draws))
    sh = z / z.sum(axis=1, keepdims=True)
    pt = np.exp(2 * mu) / np.exp(2 * mu).sum()
    return {k: [float(pt[i]), [float(np.quantile(sh[:, i], 0.025)), float(np.quantile(sh[:, i], 0.975))]] for i, k in enumerate(keys)}


def run_real(ex, args, clock, log):
    subject = ex['subject']
    rows = [r for r in ex['rows'] if r.get('use')]  # trusted answers with photos and a known taxon (prep.js)
    if args.get('half'):
        rows = [r for r in rows if r.get('half') == args['half']]
    rng = np.random.default_rng(args.get('seed', 1))
    out = {
        'subject': subject,
        'answers': len(rows),
        'players': len({r['p'] for r in rows}),
        'half': args.get('half'),
        'accept_rule': ACCEPT,
        'cut': False,
        'steps': [],
    }
    try:
        D = build(rows, sibling=args.get('sibling'), coral_family=args.get('coral_family'))
        log(f'{subject}: {len(rows)} answers, {out["players"]} players; levels ' + ', '.join(f'{b["name"]} {b["q"]}' for b in D['blocks']))
        F = fit(D, clock)
        out['fit'] = strip(F)
        out['steps'].append('fit')
        log(f'  fit: {F["seconds"]:.1f} s, {F["evals"]} evaluations')
        if args.get('no_accept'):
            return out
        reps = args.get('reps', ACCEPT['reps'])
        A1 = accept(D, truth_rated(D, subject), reps, rng, clock, log)
        out['accept_rated'] = A1
        out['steps'].append('accept_rated')
        A2 = accept(D, truth_fit(D, F), reps, rng, clock, log)
        out['accept_own'] = A2
        out['steps'].append('accept_own')
        out['report'] = report(F, A1, A2)
        fails = [k for k in ('gen', 'sp') if k in D['par'] and out['report'][k]['verdict'] != 'pass']
        if fails:
            log('  genus or species not estimable: the shared genus + species SD (the fallback)')
            D2 = build(rows, sibling=args.get('sibling'), coral_family=args.get('coral_family'), shared=True)
            F2 = fit(D2, clock)
            out['fit_shared'] = strip(F2)
            B1 = accept(D2, truth_rated(D2, subject), reps, rng, clock, log)
            B2 = accept(D2, truth_fit(D2, F2), reps, rng, clock, log)
            out['accept_shared'] = {'rated': B1, 'own': B2}
            out['report_shared'] = report(F2, B1, B2)
            out['steps'].append('shared')
        keys = [k for k in ('fam', 'gen', 'sp', 'photo') if k in D['par']]
        if keys and all(out['report'][k]['verdict'] == 'pass' for k in keys):
            out['shares'] = shares(F, keys, rng)
    except Deadline:
        out['cut'] = True
        log(f'  stopped at the deadline ({BUDGET_MIN} minutes, rule L11): what is done is kept; the rest: {CANNOT_TELL}')
    return out


def strip(F):
    """A fit as written: the SDs, the fixed effects and the unit-level effects (no photo or player-unit ones)."""
    keep = {k: v for k, v in F['effects'].items() if k in ('fam', 'gen', 'sp', 'sib', 'cfam')}
    return {
        'sd': {k: [v[0], {str(lv): iv for lv, iv in v[1].items()}] for k, v in F['sd'].items()},
        'fixed': {k: [v[0], v[1], {str(lv): iv for lv, iv in v[2].items()}] for k, v in F['fixed'].items()},
        'loglik': F['loglik'],
        'evals': F['evals'],
        'seconds': F['seconds'],
        'converged': F['converged'],
        'effects': keep,
        'cov_psi': F.get('cov_psi'),
    }


def report(F, A1, A2):
    """Each tested value with its 95% interval, or "not estimable on today's log" when it failed the acceptance test
    from either truth; the measure cannot tell when a test did not finish."""
    out = {}
    for k in list(F['sd']) + [f for f in F['fixed'] if f in TESTED_FIXED]:
        v1, v2 = A1['values'][k]['verdict'], A2['values'][k]['verdict']
        if CANNOT_TELL in (v1, v2):
            out[k] = {'verdict': CANNOT_TELL}
        elif v1 == v2 == 'pass':
            est = F['sd'][k] if k in F['sd'] else [F['fixed'][k][0], F['fixed'][k][2]]
            out[k] = {'verdict': 'pass', 'value': est[0], 'ci95': est[1][0.95]}
        else:
            out[k] = {'verdict': NOT_ESTIMABLE}
    return out


def table(out, log):
    rep = out.get('report') or {}
    if not rep and out.get('fit'):
        log('  fit only, no acceptance test (no value here is reported as estimated): ' + ', '.join(f'{LABEL.get(k, k)} {v[0]:.2f}' for k, v in out['fit']['sd'].items()))
    for k, v in rep.items():
        name = LABEL.get(k, k)
        if v['verdict'] == 'pass':
            log(f'  {name}: {v["value"]:.2f} (95% {v["ci95"][0]:.2f} to {v["ci95"][1]:.2f})')
        else:
            log(f'  {name}: {v["verdict"]}')
    for k, v in (out.get('report_shared') or {}).items():
        if k == 'gs':
            log(f'  {LABEL[k]}: ' + (f'{v["value"]:.2f} (95% {v["ci95"][0]:.2f} to {v["ci95"][1]:.2f})' if v['verdict'] == 'pass' else v['verdict']))


def run_synth(kind, args, clock, log):
    rng = np.random.default_rng(args.get('seed', 1))
    rows = synth_rows(kind, rng)
    D = build(rows)
    subject = 'fish' if kind.startswith('fish') else 'coral'
    tr = truth_rated(D, subject)
    log(f'{kind}: {len(rows)} answers; levels ' + ', '.join(f'{b["name"]} {b["q"]}' for b in D['blocks']))
    out = {'design': kind, 'answers': len(rows), 'truth': tr, 'accept_rule': ACCEPT, 'cut': False}
    try:
        out['accept'] = accept(D, tr, args.get('reps', ACCEPT['reps']), rng, clock, log)
    except Deadline:
        out['cut'] = True
    out['cut'] = out['cut'] or clock.cut
    return out


def outside_repo(path):
    root = os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
    p = os.path.realpath(os.path.abspath(path))
    return not (p == root or p.startswith(root + os.sep))


def parse(argv):
    a = {'pos': []}
    i = 0
    while i < len(argv):
        x = argv[i]
        if x in ('--reps', '--seed'):
            a[x[2:]] = int(argv[i + 1])
            i += 2
        elif x in ('--deadline', '--budget'):
            a[x[2:]] = float(argv[i + 1])
            i += 2
        elif x == '--half':
            a['half'] = argv[i + 1]
            i += 2
        elif x in ('--sibling', '--coral-family', '--no-accept'):
            a[x[2:].replace('-', '_')] = True
            i += 1
        else:
            a['pos'].append(x)
            i += 1
    return a


SYNTH = ('fish', 'coral', 'fish-rich', 'coral-large')
USAGE = 'usage: fit.py fit <export.json> <out.json> [options] | fit.py synth <' + '|'.join(SYNTH) + '> <out.json> [options]'


def main(argv):
    a = parse(argv)
    pos = a['pos']
    if len(pos) != 3 or pos[0] not in ('fit', 'synth') or (pos[0] == 'synth' and pos[1] not in SYNTH):
        print(USAGE, file=sys.stderr)
        return 2
    if pos[0] == 'fit' and not outside_repo(pos[2]):
        print('fit.py: the output holds results per player label; write it outside the repository (rule D2).', file=sys.stderr)
        return 2
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
    import slot  # noqa: E402

    slot.guard('tools/studies/q316/fit.py')  # one heavy run at a time on the machine (rule W24)
    clock = Clock(a.get('deadline'), a.get('budget', BUDGET_MIN))
    log = lambda s: print(s, flush=True)  # noqa: E731
    log('Declared before running: ' + json.dumps(ACCEPT) + f'; stop at {BUDGET_MIN} minutes (rule L11)')
    if pos[0] == 'synth':
        out = run_synth(pos[1], a, clock, log)
        A = out.get('accept') or {'values': {}}
        for k, v in A['values'].items():
            if 'mean' in v:
                log(f'  {LABEL.get(k, k)}: truth {v["truth"]:.2f}, mean {v["mean"]:.2f} (bias {v["bias"]:+.2f}), '
                    f'90% covered {v["covered"]}/{v["done"]}: {v["verdict"]}')
            else:
                log(f'  {LABEL.get(k, k)}: {v["verdict"]}')
    else:
        with open(pos[1]) as f:
            ex = json.load(f)
        out = run_real(ex, a, clock, log)
        table(out, log)
    out['cut'] = out['cut'] or clock.cut
    out['minutes'] = (time.time() - clock.t0) / 60
    with open(pos[2], 'w') as f:
        json.dump(out, f)
    log(f'{"Cut at the deadline. " if out["cut"] else ""}{out["minutes"]:.1f} minutes; written {os.path.basename(pos[2])}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
