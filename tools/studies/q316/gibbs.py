"""Q316's Gibbs sampler (REE-193; tools/studies/q316/README.md, "The Gibbs sampler"): the same model as fit.py, its
SDs from their posterior instead of the Laplace marginal likelihood, for the levels whose clusters are too small for the
Laplace fit (the photo SD and Q136's tau on today's log). Built only because the refit of 2026-11-25 still could not
reach the photo SD (REE-193's condition); validated on simulated answers with known values before any real run.

Model: fit.py's (build(): the same design, offsets, guess floor, fixed effects with a N(0, 10^2) prior), each random
level's SD with a half-normal prior of scale PRIOR['scale'] (declared below).

One sweep, all exact conditional draws (no tuning):
  1. what the player knew: an answer right is known with probability sig / (sig + (1 - sig) g), else a lucky guess; an
     answer wrong was not known (the guess floor as a latent mixture);
  2. omega ~ Polya-Gamma(1, eta) for each answer (Polson, Scott and Windle 2013), so the logistic likelihood of what was
     known is Gaussian in eta given omega; drawn as the series' first PG_TERMS terms plus the rest's exact mean;
  3. every coefficient at once (fixed effects and every random level) from its Gaussian conditional, by perturbing the
     data and the prior and solving with the design's sparse factorisation (Papandreou and Yuille 2010): one exact joint
     draw, so nested levels (family, genus, species, photo) move together;
  4. each SD twice (the ancillarity-sufficiency interweaving of Yu and Meng 2011): non-centred (the level's effects as
     SD x standard normals, the SD a regression coefficient, Gaussian given omega), then centred (the SD given the
     effects, a one-dimensional slice draw in log SD). The first moves the SD where the data are weak (small clusters),
     the second where they are strong.

Summary: the posterior median and the equal-tailed 90% and 95% credible intervals, after BURN of ITERS sweeps.
The acceptance test is fit.py's (ACCEPT, unchanged): replicates simulated on the real design from the rated world's
values and from the sampler's own medians, each sampled once; a value passes when the mean of its medians is within
0.1 of the truth and its 90% interval covers the truth in at least 15 of 20. Declared before any real run (CHAIN,
PRIOR, CONVERGE below; the README repeats them): the real fit runs CHAIN['chains'] chains from two starts; an SD whose
split R-hat is above CONVERGE['rhat'] or whose effective sample size is under CONVERGE['ess'] is "the measure cannot
tell" (not converged); the real fit is sampled again under the prior scale PRIOR['other']: a median that moves by more
than CONVERGE['prior_shift'] is reported as prior-driven, not as a value.

    python3 tools/studies/q316/gibbs.py fit <export.json> <out.json> [--reps 20] [--budget <minutes>] [--seed 1]
    python3 tools/studies/q316/gibbs.py synth <fish|coral|fish-rich|coral-large> <out.json> [--reps 20] [--budget m]

Read-only: reads its input, writes only its output file (outside the repository for a real export, rule D2), prints
aggregates and P1, P2... labels, never a name. Its own 40-minute clock (rule L11) from when the machine slot is held.
"""
import json
import math
import os
import sys
import time

import numpy as np
from scipy.sparse.linalg import splu
from scipy import sparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fit as Q  # noqa: E402

# ---- Declared before any real run (the README repeats them; tests/q316.test.js checks they agree).
CHAIN = {'iters': 3000, 'burn': 1000, 'chains': 2, 'rep_iters': 1500, 'rep_burn': 500}
PRIOR = {'scale': 1.0, 'other': 0.5}  # half-normal prior scale of every random level's SD; 'other': the prior check
CONVERGE = {'rhat': 1.1, 'ess': 100, 'prior_shift': 0.1}
PG_TERMS = 64
TWO_PI2 = 2.0 * math.pi**2


def pg1(c, rng, K=PG_TERMS):
    """Polya-Gamma(1, c) draws, one per element of c: the series sum_k Exp(1) / (2 pi^2 ((k - 1/2)^2 + c^2 / (4 pi^2)))
    cut at K terms, plus the exact mean of the terms left out (so the mean is exact: tanh(c/2) / (2c), 1/4 at 0)."""
    c = np.abs(np.asarray(c, float))
    k = (np.arange(1, K + 1) - 0.5) ** 2
    den = k[None, :] + (c[:, None] / (2 * math.pi)) ** 2
    x = (rng.exponential(size=den.shape) / den).sum(axis=1) / TWO_PI2
    head = (1.0 / den).sum(axis=1) / TWO_PI2
    small = c < 1e-6
    exact = np.where(small, 0.25, np.tanh(c / 2) / (2 * np.where(small, 1.0, c)))
    return x + (exact - head)


def _slice_log_sd(S, q, sd, scale, rng, w=1.0, steps=50):
    """One slice draw of log SD given the level's q effects with sum of squares S, under the half-normal(scale) prior:
    log p(u) = -q u - S e^(-2u) / 2 - e^(2u) / (2 scale^2) + u (u = log SD; the last term the change of variable)."""

    def lp(u):
        return -q * u - 0.5 * S * math.exp(-2 * u) - 0.5 * math.exp(2 * u) / scale**2 + u

    u0 = math.log(sd)
    y = lp(u0) - rng.exponential()
    lo = u0 - w * rng.random()
    hi = lo + w
    n = 0
    while lp(lo) > y and n < steps:
        lo -= w
        n += 1
    n = 0
    while lp(hi) > y and n < steps:
        hi += w
        n += 1
    for _ in range(200):
        u = lo + (hi - lo) * rng.random()
        if lp(u) > y:
            return math.exp(u)
        if u < u0:
            lo = u
        else:
            hi = u
    return sd


class Sampler:
    """The sampler on one design (fit.py build()). Works in the design's fill-reducing column order (Ap)."""

    def __init__(self, D, scale=PRIOR['scale']):
        self.D, self.scale = D, scale
        self.A, self.AT, self.order = D['Ap'], D['ApT'], D['order']
        inv = np.argsort(self.order)
        self.inv = inv
        self.nfix = len(D['fixed'])
        self.pos = {}
        for b in D['blocks']:
            idx = inv[np.arange(b['start'], b['start'] + b['q'])]
            self.pos[b['par']] = np.concatenate([self.pos.get(b['par'], np.zeros(0, int)), idx]).astype(int)
        self.Asub = {p: self.A[:, ix].tocsr() for p, ix in self.pos.items()}
        self.fixpos = inv[np.arange(self.nfix)]

    def lam(self, sd):
        L = np.full(self.D['p'], 1.0 / Q.FIX_SD**2)
        for p, ix in self.pos.items():
            L[ix] = 1.0 / sd[p] ** 2
        return L

    def draw_theta(self, om, kap, sd, rng):
        """Every coefficient (in Ap's column order) from N(Q^-1 b, Q^-1), Q = A' diag(om) A + the prior precisions,
        b = A' (kap + om off): Q^-1 applied to b plus A' om^1/2 e1 plus prior^1/2 e2 (e1, e2 standard normals)."""
        A, AT, off = self.A, self.AT, self.D['off']
        L = self.lam(sd)
        Qm = AT @ sparse.diags(om) @ A + sparse.diags(L)
        lu = splu(Qm.tocsc(), permc_spec='NATURAL', diag_pivot_thresh=0, options={'SymmetricMode': True})
        rhs = AT @ (kap + om * off + np.sqrt(om) * rng.standard_normal(len(om))) + np.sqrt(L) * rng.standard_normal(len(L))
        return lu.solve(rhs)

    def run(self, y, iters, burn, rng, sd0=0.3, clock=None, keep_fixed=Q.TESTED_FIXED):
        """One chain on answers y. Returns the SDs' and the tested fixed effects' draws after the burn-in."""
        D, A = self.D, self.A
        g, off = D['g'], D['off']
        n, P = D['n'], D['p']
        sd = {p: float(sd0) for p in self.pos}
        th = np.zeros(P)
        out = {p: [] for p in self.pos}
        fx = {f: [] for f in D['fixed'] if f in keep_fixed}
        fj = {f: int(self.fixpos[D['fixed'].index(f)]) for f in fx}
        for it in range(iters):
            if clock is not None and it % 50 == 0:
                clock.check()
            eta = A @ th - off
            s = 1.0 / (1.0 + np.exp(-np.clip(eta, -35, 35)))
            # 1. known or a lucky guess
            pk = np.where(y > 0, s / np.maximum(s + (1 - s) * g, 1e-300), 0.0)
            k = (rng.random(n) < pk).astype(float)
            kap = k - 0.5
            # 2. Polya-Gamma
            om = pg1(eta, rng)
            # 3. every coefficient at once
            th = self.draw_theta(om, kap, sd, rng)
            eta = A @ th - off
            # 4. each SD: non-centred (Gaussian given omega), then centred (slice in log SD)
            for p, ix in self.pos.items():
                xi = th[ix] / sd[p]
                w = self.Asub[p] @ xi
                r = eta - sd[p] * w
                prec = float(om @ (w * w)) + 1.0 / self.scale**2
                m = float(w @ (kap - om * r)) / prec
                sn = m + rng.standard_normal() / math.sqrt(prec)
                th[ix] = sn * xi
                eta = r + sn * w
                sd[p] = max(abs(sn), 1e-6)
                sd[p] = _slice_log_sd(float(th[ix] @ th[ix]), len(ix), sd[p], self.scale, rng)
            if it >= burn:
                for p in sd:
                    out[p].append(sd[p])
                for f in fx:
                    fx[f].append(float(th[fj[f]]))
        return {'sd': {p: np.array(v) for p, v in out.items()}, 'fixed': {f: np.array(v) for f, v in fx.items()}}


def summary(x):
    q = np.quantile(x, [0.025, 0.05, 0.5, 0.95, 0.975])
    return {'median': float(q[2]), 'mean': float(np.mean(x)), 'ci90': [float(q[1]), float(q[3])], 'ci95': [float(q[0]), float(q[4])]}


def ess(x):
    """The effective sample size of one chain (Geyer's initial positive sequence on the autocorrelations)."""
    x = np.asarray(x, float)
    n = len(x)
    if n < 4 or np.var(x) == 0:
        return float(n)
    f = np.fft.rfft(x - x.mean(), 2 * n)
    ac = np.fft.irfft(f * np.conj(f))[:n]
    ac /= ac[0]
    s, t = 0.0, 1
    while t + 1 < n:
        pair = ac[t] + ac[t + 1]
        if pair < 0:
            break
        s += pair
        t += 2
    return float(n / (1 + 2 * s))


def split_rhat(chains):
    """Split R-hat (Gelman et al. 2013) over the chains' halves."""
    halves = []
    for c in chains:
        h = len(c) // 2
        halves += [c[:h], c[h : 2 * h]]
    m, n = len(halves), len(halves[0])
    H = np.array(halves)
    W = H.var(axis=1, ddof=1).mean()
    B = n * H.mean(axis=1).var(ddof=1)
    if W == 0:
        return 1.0
    return float(math.sqrt(((n - 1) / n * W + B / n) / W))


def accept(D, truth, reps, rng, clock=None, log=None, scale=PRIOR['scale']):
    """fit.py's acceptance rule with the sampler: reps answer sets simulated from truth, each sampled once (CHAIN's
    rep_iters, rep_burn); per value the mean of the medians, the 90% intervals' coverage, the verdict (fit.py verdict)."""
    S = Sampler(D, scale)
    est = {p: [] for p in S.pos}
    est.update({f: [] for f in D['fixed'] if f in Q.TESTED_FIXED})
    cov = {k: 0 for k in est}
    done, secs = 0, []
    try:
        for r in range(reps):
            y = Q.simulate(D, truth, rng)
            t0 = time.time()
            R = S.run(y, CHAIN['rep_iters'], CHAIN['rep_burn'], rng, clock=clock)
            secs.append(time.time() - t0)
            for k in est:
                x = R['sd'][k] if k in R['sd'] else R['fixed'][k]
                sm = summary(x)
                est[k].append(sm['median'])
                t = truth['sd'][k] if k in truth['sd'] else truth['beta'][k]
                cov[k] += sm['ci90'][0] <= t <= sm['ci90'][1]
            done += 1
            if log:
                log(f'  replicate {done}/{reps}: {secs[-1]:.1f} s')
    except Q.Deadline:
        pass
    vals = {}
    for k, v in est.items():
        t = truth['sd'][k] if k in truth['sd'] else truth['beta'][k]
        vals[k] = Q.verdict(v, t, cov[k], done, reps)
    return {'reps': reps, 'done': done, 'seconds_per_chain': (sum(secs) / len(secs)) if secs else None, 'values': vals}


def real_fit(D, rng, clock, log, scale=PRIOR['scale'], chains=CHAIN['chains']):
    """The real answers, CHAIN['chains'] chains (starting SDs 0.3 and 1.0), pooled; R-hat and ESS per value."""
    S = Sampler(D, scale)
    runs = []
    for c in range(chains):
        t0 = time.time()
        runs.append(S.run(D['y'], CHAIN['iters'], CHAIN['burn'], rng, sd0=(0.3, 1.0)[c % 2], clock=clock))
        log(f'  chain {c + 1}/{chains}: {time.time() - t0:.1f} s')
    out = {}
    keys = list(runs[0]['sd']) + list(runs[0]['fixed'])
    for k in keys:
        ch = [R['sd'][k] if k in R['sd'] else R['fixed'][k] for R in runs]
        sm = summary(np.concatenate(ch))
        sm['rhat'] = split_rhat(ch) if len(ch) > 1 else None
        sm['ess'] = float(sum(ess(c) for c in ch))
        sm['converged'] = (sm['rhat'] is None or sm['rhat'] <= CONVERGE['rhat']) and sm['ess'] >= CONVERGE['ess']
        out[k] = sm
    return out


def truth_own(D, F):
    beta = {f: Q.RATED['beta'].get(f, 0.0) for f in D['fixed']}
    for f in D['fixed']:
        if f in F:
            beta[f] = F[f]['median']
    return {'sd': {p: F[p]['median'] for p in D['par']}, 'beta': beta}


def report(F, A1, A2, Fo):
    """Each value: its median and 95% interval when it converged, passed both acceptance tests and did not move by more
    than CONVERGE['prior_shift'] under the other prior; otherwise why not."""
    out = {}
    for k in F:
        if k not in A1['values']:
            continue
        v1, v2 = A1['values'][k]['verdict'], A2['values'][k]['verdict'] if A2 else Q.CANNOT_TELL
        if Q.CANNOT_TELL in (v1, v2):
            out[k] = {'verdict': Q.CANNOT_TELL}
        elif not (v1 == v2 == 'pass'):
            out[k] = {'verdict': Q.NOT_ESTIMABLE}
        elif not F[k]['converged']:
            out[k] = {'verdict': Q.CANNOT_TELL + ' (not converged)'}
        elif Fo is None or k not in Fo:
            out[k] = {'verdict': Q.CANNOT_TELL + ' (prior check not run)'}
        elif abs(Fo[k]['median'] - F[k]['median']) > CONVERGE['prior_shift']:
            out[k] = {'verdict': 'prior-driven', 'shift': Fo[k]['median'] - F[k]['median']}
        else:
            out[k] = {'verdict': 'pass', 'value': F[k]['median'], 'ci95': F[k]['ci95']}
    return out


def run_real(ex, args, clock, log):
    subject = ex['subject']
    rows = [r for r in ex['rows'] if r.get('use')]
    rng = np.random.default_rng(args.get('seed', 1))
    reps = args.get('reps', Q.ACCEPT['reps'])
    out = {'subject': subject, 'answers': len(rows), 'players': len({r['p'] for r in rows}), 'accept_rule': Q.ACCEPT,
           'chain': CHAIN, 'prior': PRIOR, 'converge': CONVERGE, 'cut': False, 'steps': []}
    try:
        D = Q.build(rows, sibling=args.get('sibling'))
        log(f'{subject}: {len(rows)} answers, {out["players"]} players; levels ' + ', '.join(f'{b["name"]} {b["q"]}' for b in D['blocks']))
        F = real_fit(D, rng, clock, log)
        out['fit'] = F
        out['steps'].append('fit')
        log('  posterior medians (no verdict yet): ' + ', '.join(f'{Q.LABEL.get(k, k)} {v["median"]:.2f} (R-hat {v["rhat"]:.2f}, ESS {v["ess"]:.0f})' for k, v in F.items()))
        A1 = accept(D, Q.truth_rated(D, subject), reps, rng, clock, log)
        out['accept_rated'] = A1
        out['steps'].append('accept_rated')
        A2 = accept(D, truth_own(D, F), reps, rng, clock, log)
        out['accept_own'] = A2
        out['steps'].append('accept_own')
        Fo = real_fit(D, rng, clock, log, scale=PRIOR['other'], chains=1)
        out['fit_other_prior'] = Fo
        out['steps'].append('prior_check')
    except Q.Deadline:
        out['cut'] = True
        log(f'  stopped at the deadline ({Q.BUDGET_MIN} minutes, rule L11): what is done is kept; the rest: {Q.CANNOT_TELL}')
    if 'accept_rated' in out:
        out['report'] = report(out['fit'], out['accept_rated'], out.get('accept_own'), out.get('fit_other_prior'))
    return out


def run_synth(kind, args, clock, log):
    rng = np.random.default_rng(args.get('seed', 1))
    rows = Q.synth_rows(kind, rng)
    D = Q.build(rows)
    subject = 'fish' if kind.startswith('fish') else 'coral'
    tr = Q.truth_rated(D, subject)
    log(f'{kind}: {len(rows)} answers; levels ' + ', '.join(f'{b["name"]} {b["q"]}' for b in D['blocks']))
    out = {'design': kind, 'answers': len(rows), 'truth': tr, 'accept_rule': Q.ACCEPT, 'chain': CHAIN, 'prior': PRIOR, 'cut': False}
    out['accept'] = accept(D, tr, args.get('reps', Q.ACCEPT['reps']), rng, clock, log)
    out['cut'] = clock.cut
    return out


USAGE = 'usage: gibbs.py fit <export.json> <out.json> [options] | gibbs.py synth <' + '|'.join(Q.SYNTH) + '> <out.json> [options]'


def main(argv):
    a = Q.parse(argv)
    pos = a['pos']
    if len(pos) != 3 or pos[0] not in ('fit', 'synth') or (pos[0] == 'synth' and pos[1] not in Q.SYNTH):
        print(USAGE, file=sys.stderr)
        return 2
    if pos[0] == 'fit' and not Q.outside_repo(pos[2]):
        print('gibbs.py: the output holds results per player label; write it outside the repository (rule D2).', file=sys.stderr)
        return 2
    sys.path.insert(0, os.path.join(HERE, '..', '..'))
    import slot  # noqa: E402

    slot.guard('tools/studies/q316/gibbs.py')  # one heavy run at a time on the machine (rule W24)
    clock = Q.Clock(a.get('deadline'), a.get('budget', Q.BUDGET_MIN))
    log = lambda s: print(s, flush=True)  # noqa: E731
    log('Declared before running: ' + json.dumps({'accept': Q.ACCEPT, 'chain': CHAIN, 'prior': PRIOR, 'converge': CONVERGE}) + f'; stop at {Q.BUDGET_MIN} minutes (rule L11)')
    if pos[0] == 'synth':
        out = run_synth(pos[1], a, clock, log)
        for k, v in out['accept']['values'].items():
            log(f'  {Q.LABEL.get(k, k)}: ' + (f'truth {v["truth"]:.2f}, mean {v["mean"]:.2f} (bias {v["bias"]:+.2f}), 90% covered {v["covered"]}/{v["done"]}: {v["verdict"]}' if 'mean' in v else v['verdict']))
    else:
        with open(pos[1]) as f:
            ex = json.load(f)
        out = run_real(ex, a, clock, log)
        for k, v in (out.get('report') or {}).items():
            log(f'  {Q.LABEL.get(k, k)}: ' + (f'{v["value"]:.2f} (95% {v["ci95"][0]:.2f} to {v["ci95"][1]:.2f})' if v['verdict'] == 'pass' else v['verdict']))
    out['cut'] = out['cut'] or clock.cut
    out['minutes'] = (time.time() - clock.t0) / 60
    with open(pos[2], 'w') as f:
        json.dump(out, f)
    log(f'{"Cut at the deadline. " if out["cut"] else ""}{out["minutes"]:.1f} minutes; written {os.path.basename(pos[2])}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
