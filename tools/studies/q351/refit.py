"""Q351 batch refit (docs/reviews/2026-11-14-q351-refit.md): the batch model of the engine's values, fitted on an
answer log at each milestone, without each player in turn (the delete-one-player replicates: the mode refitted under
the variances of the milestone's fit), and on the whole log. About 40 minutes for the corals on four cores.

P = g + (1 - g) R sig(eta),
eta = a_p + u_(p,unit) + b1 log(1 + m) + b2 log(1 + n) - b_unit - mean_photos(kappa ez + r_photo) - s solo
      - mean_photos(mem_bucket) + o_format - c
a, u, b, r normal random effects (zero mean), their variances estimated at the Laplace approximation's fixed point
(EM's: each variance the mean of the squared posterior means plus their posterior variances; reached by MacKay's
update, refitted until no variance moves by 0.1%, at most 200 steps); the rest fixed effects with weak priors (formats
N(0, 3^2), the others N(0, 10^2)). The mode by Fisher scoring; standard errors from the inverse of the
information at the mode, given the variances. ez = 3 - the judged ease (fish), 0 for corals (kappa then left out).
Read-only: reads refit.js's export, writes the fits; prints a line per fit.

    python3 -I tools/studies/q351/refit.py export.json fits.json [--simcheck 20]

--simcheck N: N logs drawn from the whole-log fit on the same rows (the outcome redrawn), each refitted (the mode, under
the whole-log fit's variances); prints the coverage of the 95% intervals of the photo and unit difficulties and the correlation of the
estimates with the values drawn from. Checks the standard errors under the model, not its misspecification.
"""
import json
import sys
import time

import numpy as np
from scipy import sparse
from scipy.sparse.linalg import splu

EX = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
SIM = int(sys.argv[sys.argv.index('--simcheck') + 1]) if '--simcheck' in sys.argv else 0
FISH = EX['fish']
ROWS = EX['rows']


def design(rows):
    """Parameter names and the sparse design of eta (without -c)."""
    P = sorted({r['p'] for r in rows})
    PU = sorted({r['p'] + '|' + r['t'] for r in rows})
    U = sorted({r['t'] for r in rows})
    F = sorted({f for r in rows for f in r['ph']})
    K = sorted({r['fmt'] for r in rows})
    blocks = [('a', P), ('u', PU), ('b', U), ('r', F), ('o', K), ('mem', ['1', '2', '3']), ('fix', ['b1', 'b2', 's'] + (['kappa'] if FISH else []))]
    off = {}
    names = []
    for bn, lst in blocks:
        off[bn] = {k: len(names) + i for i, k in enumerate(lst)}
        names += [(bn, k) for k in lst]
    I, Jc, V = [], [], []

    def add(i, j, v):
        I.append(i)
        Jc.append(j)
        V.append(v)

    for i, r in enumerate(rows):
        add(i, off['a'][r['p']], 1)
        add(i, off['u'][r['p'] + '|' + r['t']], 1)
        add(i, off['fix']['b1'], np.log1p(r['m']))
        add(i, off['fix']['b2'], np.log1p(r['n']))
        add(i, off['b'][r['t']], -1)
        w = 1 / len(r['ph'])
        for f, ez, bk in zip(r['ph'], r['ez'], r['bk']):
            add(i, off['r'][f], -w)
            if bk:
                add(i, off['mem'][str(bk)], -w)
            if FISH and ez:
                add(i, off['fix']['kappa'], -w * ez)
        if r['solo']:
            add(i, off['fix']['s'], -1)
        add(i, off['o'][r['fmt']], 1)
    J = sparse.csr_matrix((V, (I, Jc)), shape=(len(rows), len(names)))
    return names, off, J


RE = ['a', 'u', 'b', 'r']
FIXVAR = {'o': 9.0, 'mem': 9.0, 'fix': 100.0}


def fit(rows, warm=None, tol=1e-3, maxem=200, fixvar=False):
    """fixvar: keep warm's variances (the delete-one-player replicates and the simulated logs: the mode refitted
    under the variances of the fit on all the answers)."""
    names, off, J = design(rows)
    y = np.array([r['y'] for r in rows], float)
    g = np.array([r['g'] for r in rows], float)
    R = np.array([r['R'] for r in rows], float)
    c = np.array([r['c'] for r in rows], float)
    blk = np.array([n[0] for n in names])
    var = dict(warm['var']) if warm else {'a': 1.0, 'u': 0.5, 'b': 0.5, 'r': 0.5}
    th = np.zeros(len(names))
    if warm:
        wv = warm['theta']
        for i, n in enumerate(names):
            th[i] = wv.get(n[0] + ':' + n[1], 0.0)

    def prec():
        return np.array([1 / var[b] if b in var else 1 / FIXVAR[b] for b in blk])

    JT = J.T.tocsr()

    def mode(L, eps):
        """Fisher scoring to the mode under the precisions L; returns the factorised information at it."""
        for it in range(200):
            eta = J @ th - c
            s = 1 / (1 + np.exp(-eta))
            p = np.clip(g + (1 - g) * R * s, 1e-9, 1 - 1e-9)
            dp = (1 - g) * R * s * (1 - s)
            w = dp * dp / (p * (1 - p))
            score = JT @ ((y - p) * dp / (p * (1 - p))) - L * th
            H = (JT @ sparse.diags(w) @ J + sparse.diags(L)).tocsc()
            lu = splu(H)
            step = lu.solve(score)
            mx = np.max(np.abs(step))
            if mx > 2:
                step *= 2 / mx
            th[:] += step
            if mx < eps:
                break
        return splu((JT @ sparse.diags(w) @ J + sparse.diags(L)).tocsc())

    def inv(lu):
        return lu.solve(np.eye(len(names)))

    em = -1
    for em in range(0 if fixvar else maxem):
        V = inv(mode(prec(), 1e-5))
        dv = np.diag(V)
        new = {}
        for b in RE:
            # The fixed point of the Laplace approximation's marginal likelihood, by MacKay's update (the same fixed
            # point as EM's sigma^2 = mean(theta^2 + v), reached in far fewer steps): sigma^2 = sum(theta^2) / gamma,
            # gamma = sum(1 - v / sigma^2), the effective number of effects the answers determine.
            mk = blk == b
            gam = float(np.sum(1 - dv[mk] / var[b]))
            new[b] = max(1e-4, float(np.sum(th[mk] ** 2)) / gam) if gam > 0.5 else max(1e-4, float(np.mean(th[mk] ** 2 + dv[mk])))
        ch = max(abs(new[b] - var[b]) / var[b] for b in RE)
        var = new
        if ch < tol:
            break
    # The final mode under the final variances, and its covariance.
    V = inv(mode(prec(), 1e-7))
    o = off
    kap = th[o['fix']['kappa']] if FISH else 0.0
    ki = o['fix']['kappa'] if FISH else None
    ezOf = {}
    for r in rows:
        for f, ez in zip(r['ph'], r['ez']):
            ezOf[f] = ez
    unitOf = {}
    for r in rows:
        for f in r['ph']:
            unitOf[f] = r['t']
    out = {
        'n': len(rows),
        'players': len(o['a']),
        'em': em + 1,
        'var': var,
        'b': {k: [float(th[i]), float(np.sqrt(V[i, i]))] for k, i in o['b'].items()},
        'o': {k: float(th[i]) for k, i in o['o'].items()},
        'mem': [0.0] + [float(th[o['mem'][k]]) for k in ['1', '2', '3']],
        's': float(th[o['fix']['s']]),
        'b1': float(th[o['fix']['b1']]),
        'b2': float(th[o['fix']['b2']]),
        'kappa': float(kap),
        'a': {k: float(th[i]) for k, i in o['a'].items()},
        'u': {k: float(th[i]) for k, i in o['u'].items()},
        'theta': {n[0] + ':' + n[1]: float(th[i]) for i, n in enumerate(names)},
    }
    rr = {}
    for f, i in o['r'].items():
        ez = ezOf.get(f, 0)
        bi = o['b'][unitOf[f]]
        own = th[i] + kap * ez
        vown = V[i, i] + (ez * ez * V[ki, ki] + 2 * ez * V[i, ki] if FISH else 0)
        tot = V[i, i] + V[bi, bi] + 2 * V[i, bi] + (ez * ez * V[ki, ki] + 2 * ez * (V[i, ki] + V[bi, ki]) if FISH else 0)
        rr[f] = [float(own), float(np.sqrt(max(vown, 0))), float(np.sqrt(max(tot, 0)))]
    out['r'] = rr
    return out


def strip(F):
    return {k: v for k, v in F.items() if k != 'theta'}


t0 = time.time()
fits = {}
incl = EX['incl']
for M in EX['milestones']:
    j, cut, tr = M['j'], M['s'], set(M['trusted'])
    rows = [r for r in ROWS if r['s'] < cut and r['p'] in tr]
    F = fit(rows)
    fits[str(j)] = F
    print(f"milestone {j} ({cut}): {F['n']} answers, {F['players']} players, EM {F['em']}, var {json.dumps({k: round(v, 3) for k, v in F['var'].items()})}, "
          f"b1 {F['b1']:.3f} b2 {F['b2']:.3f} s {F['s']:.2f} kappa {F['kappa']:.2f} ({time.time() - t0:.0f} s)", flush=True)
    for q in incl:
        rq = [r for r in rows if r['p'] != q]
        if len(rq) == len(rows):
            fits[f'{j}|{q}'] = F
            continue
        fits[f'{j}|{q}'] = fit(rq, warm=F, fixvar=True)
    print(f'  replicates done ({time.time() - t0:.0f} s)', flush=True)
tr = set(EX['full']['trusted'])
rows = [r for r in ROWS if r['p'] in tr]
F = fit(rows)
fits['full'] = F
print(f"full: {F['n']} answers, {F['players']} players, EM {F['em']}, var {json.dumps({k: round(v, 3) for k, v in F['var'].items()})}, "
      f"b1 {F['b1']:.3f} b2 {F['b2']:.3f} s {F['s']:.2f} kappa {F['kappa']:.2f}, mem {[round(x, 2) for x in F['mem']]}, o {json.dumps({k: round(v, 2) for k, v in F['o'].items()})}")
json.dump({k: strip(v) for k, v in fits.items()}, open(OUT, 'w'))

if SIM:
    rng = np.random.default_rng(351)
    names, off, J = design(rows)
    th = np.array([F['theta'][n[0] + ':' + n[1]] for n in names])
    g = np.array([r['g'] for r in rows], float)
    R = np.array([r['R'] for r in rows], float)
    c = np.array([r['c'] for r in rows], float)
    eta = J @ th - c
    p = g + (1 - g) * R / (1 + np.exp(-eta))
    truthB = F['b']
    truthR = F['r']
    covB, covT, corT, corB = [], [], [], []
    unitOf_f = {f: r['t'] for r in rows for f in r['ph']}
    for k in range(SIM):
        ys = (rng.random(len(rows)) < p).astype(int)
        rs = [dict(r, y=int(v)) for r, v in zip(rows, ys)]
        S = fit(rs, warm=F, fixvar=True)
        bs = [u for u in truthB if u in S['b']]
        covB.append(np.mean([abs(S['b'][u][0] - truthB[u][0]) <= 1.96 * S['b'][u][1] for u in bs]))
        fs = [f for f in truthR if f in S['r']]
        tot = lambda X, f: X['b'][unitOf_f[f]][0] + X['r'][f][0]
        covT.append(np.mean([abs(tot(S, f) - tot(F, f)) <= 1.96 * S['r'][f][2] for f in fs]))
        corT.append(np.corrcoef([tot(S, f) for f in fs], [tot(F, f) for f in fs])[0, 1])
        corB.append(np.corrcoef([S['b'][u][0] for u in bs], [truthB[u][0] for u in bs])[0, 1])
        print(f'  sim {k + 1}: coverage units {covB[-1]:.3f}, photos {covT[-1]:.3f}; correlation photos {corT[-1]:.3f}, units {corB[-1]:.3f}', flush=True)
    print(f'simcheck {SIM} logs: 95% coverage units {np.mean(covB):.3f}, photos (unit + own) {np.mean(covT):.3f}; correlation with the values drawn from: photos {np.mean(corT):.3f}, units {np.mean(corB):.3f}')
