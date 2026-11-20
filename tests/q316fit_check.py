"""Checks of tools/studies/q316/fit.py (tests/q316.test.js runs it; numpy and scipy, tools/requirements.txt). Made-up
answers only. Prints one JSON line:
- laplace: the sparse Laplace objective (fill-reducing order, symmetric LU) against the same objective computed densely
  (Newton to the mode, numpy's slogdet) on a small planted design, at two sets of SDs; the largest gap.
- recovery: a strongly identified planted design (30 genera of SD 1.0 asked 3,000 times): the genus SD found.
- rule: ACCEPT's verdict on made-up replicate figures (pass, bias too large, coverage too low, deadline).
- deadline: a fit given a deadline already past stops and says so.
"""
import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools', 'studies', 'q316'))
import fit as Q  # noqa: E402


def dense_laplace(D, psi):
    A = D['A'].toarray()
    L = Q.lam_of(D, psi)
    y, g, off = D['y'], D['g'], D['off']
    th = np.zeros(D['p'])
    for _ in range(200):
        eta = A @ th - off
        s = 1 / (1 + np.exp(-eta))
        p = g + (1 - g) * s
        q = p * (1 - p)
        d1 = (1 - g) * s * (1 - s)
        score = A.T @ ((y - p) * d1 / q) - L * th
        H = A.T @ (A * (d1 * d1 / q)[:, None]) + np.diag(L)
        step = np.linalg.solve(H, score)
        th = th + step
        if np.max(np.abs(step)) < 1e-12:
            break
    eta = A @ th - off
    s = 1 / (1 + np.exp(-eta))
    p = g + (1 - g) * s
    q = p * (1 - p)
    d1 = (1 - g) * s * (1 - s)
    d2 = d1 * (1 - 2 * s)
    u = (y - p) / q
    du = (-q - (y - p) * (1 - 2 * p)) / (q * q)
    Ho = A.T @ (A * (-(du * d1 * d1 + u * d2))[:, None]) + np.diag(L)
    if np.any(np.linalg.eigvalsh(Ho) <= 0):
        Ho = A.T @ (A * (d1 * d1 / q)[:, None]) + np.diag(L)
    pen = np.sum(y * np.log(p) + (1 - y) * np.log(1 - p)) - 0.5 * np.sum(L * th * th)
    return pen + 0.5 * np.sum(np.log(L)) - 0.5 * np.linalg.slogdet(Ho)[1]


def small_rows(rng, n=400):
    rows = []
    for i in range(n):
        f = int(rng.integers(4))
        G = f'g{f}_{int(rng.integers(2))}'
        S = f'{G}_s{int(rng.integers(2))}'
        rk = ['family', 'genus', 'species'][int(rng.choice(3, p=[0.6, 0.3, 0.1]))]
        u = {'family': 'f:' + str(f), 'genus': 'g:' + G, 'species': 's:' + S}[rk]
        ph = [f'{S}p{int(rng.integers(3))}' for _ in range(1 + int(rng.random() < 0.2))]
        k = 4 if rng.random() < 0.6 else 2
        rows.append({'p': f'P{int(rng.integers(5)) + 1}', 'u': u, 'rk': rk, 'F': f'f{f}', 'G': G, 'S': S, 'ph': ph,
                     'ez': [float(rng.integers(-2, 3)) for _ in ph], 'g': 1 / k, 'y': 0, 'off': float(rng.normal(0, 0.2)),
                     'np': i // 5, 'nu': int(rng.integers(4))})
    return rows


def main():
    rng = np.random.default_rng(7)
    D = Q.build(small_rows(rng))
    D['y'] = Q.simulate(D, Q.truth_rated(D, 'fish'), rng)
    gap = 0.0
    for sd in (0.4, 1.3):
        psi = np.log(np.full(len(D['par']), sd))
        gap = max(gap, abs(Q.Laplace(D)(psi) - dense_laplace(D, psi)))
    # recovery: 30 genera, SD 1.0, 3,000 answers of 20 players, 10 photos per genus (SD 0.2)
    rows = []
    for i in range(3000):
        G = f'u{int(rng.integers(30))}'
        rows.append({'p': f'P{int(rng.integers(20)) + 1}', 'u': G, 'rk': 'genus', 'F': None, 'G': G, 'S': None,
                     'ph': [f'{G}p{int(rng.integers(10))}'], 'ez': [0.0], 'g': 0.25, 'y': 0, 'off': 0.0, 'np': 0, 'nu': 0})
    R = Q.build(rows)
    R['y'] = Q.simulate(R, {'sd': {'player': 0.5, 'pu': 0.1, 'gen': 1.0, 'photo': 0.2}, 'beta': {'c': 0.8, 'prac_s': 0, 'prac_u': 0}}, rng)
    F = Q.fit(R, levels=(0.95,))
    gen = F['sd']['gen']
    rule = {
        'pass': Q.verdict([0.30, 0.32, 0.28] * 6 + [0.3, 0.3], 0.3, 18, 20, 20)['verdict'],
        'bias': Q.verdict([0.45] * 20, 0.3, 20, 20, 20)['verdict'],
        'cover': Q.verdict([0.3] * 20, 0.3, 14, 20, 20)['verdict'],
        'short': Q.verdict([0.3] * 12, 0.3, 12, 12, 20)['verdict'],
    }
    clock = Q.Clock(deadline=1.0)
    try:
        Q.fit(R, clock)
        stopped = False
    except Q.Deadline:
        stopped = clock.cut
    # rule L11's cap: no clock past 40 minutes, whatever budget or deadline is asked
    import run as RUN  # noqa: E402

    long = Q.Clock(budget=90)
    far = Q.Clock(deadline=long.t0 + 5 * 3600)
    cap = {'fit': max(long.end - long.t0, far.end - far.t0) <= 40 * 60 + 1, 'short': Q.Clock(budget=5).end - long.t0 < 5 * 60 + 1,
           'run': [RUN.budget_of(['--budget', '60']), RUN.budget_of(['--budget', '10']), RUN.budget_of([])]}
    print(json.dumps({'laplace': gap, 'gen': [gen[0], gen[1][0.95]], 'rule': rule, 'deadline': stopped, 'cap': cap,
                      'accept': Q.ACCEPT, 'budget': Q.BUDGET_MIN, 'evals': F['evals'], 'finite': math.isfinite(F['loglik'])}))


if __name__ == '__main__':
    main()
