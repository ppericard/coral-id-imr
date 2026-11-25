"""Checks of tools/studies/q316/gibbs.py (tests/q316.test.js runs it; numpy and scipy). Made-up answers only. Prints one
JSON line:
- pg: Polya-Gamma(1, c) draws' mean and variance against the exact ones, at c = 0 and c = 2;
- joint: the joint coefficient draw's mean and variances against the dense Gaussian conditional on a small design;
- gen: a strongly identified planted design (30 genera of SD 1.0, 3,000 answers): the genus SD's median and 95% interval;
- photo: large photo clusters (40 photos of SD 0.6, 4,000 answers): the photo SD's median and 95% interval;
- diag: R-hat and ESS on independent draws (about 1 and about n).
"""
import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools', 'studies', 'q316'))
import fit as Q  # noqa: E402
import gibbs as G  # noqa: E402
from q316fit_check import small_rows  # noqa: E402


def pg_check(rng):
    out = []
    for c in (0.0, 2.0):
        x = G.pg1(np.full(200000, c), rng)
        mean = 0.25 if c == 0 else math.tanh(c / 2) / (2 * c)
        var = 1 / 24 if c == 0 else (math.sinh(c) - c) / (4 * c**3 * math.cosh(c / 2) ** 2)
        out.append([float(x.mean() / mean), float(x.var() / var)])
    return out


def joint_check(rng):
    D = Q.build(small_rows(rng, 120))
    S = G.Sampler(D)
    n = D['n']
    om = G.pg1(rng.normal(0, 1, n), rng)
    kap = rng.integers(0, 2, n) - 0.5
    sd = {p: 0.7 for p in S.pos}
    A = S.A.toarray()
    L = S.lam(sd)
    Qd = A.T @ (A * om[:, None]) + np.diag(L)
    C = np.linalg.inv(Qd)
    mu = C @ (A.T @ (kap + om * D['off']))
    X = np.array([S.draw_theta(om, kap, sd, rng) for _ in range(4000)])
    se = np.sqrt(np.diag(C) / len(X))
    return {'z': float(np.max(np.abs(X.mean(0) - mu) / se)), 'var': [float(np.min(X.var(0) / np.diag(C))), float(np.max(X.var(0) / np.diag(C)))]}


def planted(rng, kind):
    rows = []
    if kind == 'gen':
        for i in range(3000):
            u = f'u{int(rng.integers(30))}'
            rows.append({'p': f'P{int(rng.integers(20)) + 1}', 'u': u, 'rk': 'genus', 'F': None, 'G': u, 'S': None,
                         'ph': [f'{u}p{int(rng.integers(10))}'], 'ez': [0.0], 'g': 0.25, 'y': 0, 'off': 0.0, 'np': 0, 'nu': 0})
        truth = {'sd': {'player': 0.5, 'pu': 0.1, 'gen': 1.0, 'photo': 0.2}, 'beta': {'c': 0.8, 'prac_s': 0, 'prac_u': 0}}
    else:
        for i in range(4000):
            u = f'u{int(rng.integers(10))}'
            rows.append({'p': f'P{int(rng.integers(10)) + 1}', 'u': u, 'rk': 'genus', 'F': None, 'G': u, 'S': None,
                         'ph': [f'{u}p{int(rng.integers(4))}'], 'ez': [0.0], 'g': 0.25, 'y': 0, 'off': 0.0, 'np': 0, 'nu': 0})
        truth = {'sd': {'player': 0.5, 'pu': 0.1, 'gen': 0.4, 'photo': 0.6}, 'beta': {'c': 0.8, 'prac_s': 0, 'prac_u': 0}}
    D = Q.build(rows)
    D['y'] = Q.simulate(D, truth, rng)
    R = G.Sampler(D).run(D['y'], 500, 200, rng)
    sm = G.summary(R['sd'][kind])
    return [sm['median'], sm['ci95']]


def main():
    rng = np.random.default_rng(11)
    x = rng.normal(size=(2, 2000))
    print(json.dumps({'pg': pg_check(rng), 'joint': joint_check(rng), 'gen': planted(rng, 'gen'), 'photo': planted(rng, 'photo'),
                      'diag': [G.split_rhat(list(x)), G.ess(x[0])], 'chain': G.CHAIN, 'prior': G.PRIOR, 'converge': G.CONVERGE}))


if __name__ == '__main__':
    main()
