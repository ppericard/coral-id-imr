"""REE-193's exploratory cross-check (docs/reviews/2026-11-25-q316-refit.md, "One scale, two estimators"): answers
simulated on the real design from the Gibbs sampler's medians, then fitted by the Laplace fit, to see whether the
Laplace fit's known shrinkage explains the gap between the two fits on the real answers. Not a declared test.

    python3 tools/studies/q316/refit/crosscheck.py <export.json> <gibbs-out.json> <reps> [--seed 5]

Read-only: reads the export (prep.js) and gibbs.py's output, both outside the repository; prints aggregates only.
"""
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..'))
import fit as Q  # noqa: E402


def main(argv):
    pos = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or argv[i - 1] != '--seed')]
    if len(pos) != 3:
        print(__doc__.strip().split('\n\n')[1], file=sys.stderr)
        return 2
    seed = int(argv[argv.index('--seed') + 1]) if '--seed' in argv else 5
    import slot  # noqa: E402

    slot.guard('tools/studies/q316/refit/crosscheck.py')  # heavy: one run at a time on the machine (rule W24)
    with open(pos[0]) as f:
        ex = json.load(f)
    with open(pos[1]) as f:
        G = json.load(f)['fit']
    D = Q.build([r for r in ex['rows'] if r.get('use')])
    truth = {'sd': {p: G[p]['median'] for p in D['par']}, 'beta': {f: G[f]['median'] for f in D['fixed']}}
    rng = np.random.default_rng(seed)
    res = {k: [] for k in list(D['par']) + list(D['fixed'])}
    for _ in range(int(pos[2])):
        D['y'] = Q.simulate(D, truth, rng)
        F = Q.fit(D, levels=(0.95,))
        for p in D['par']:
            res[p].append(F['sd'][p][0])
        for f in D['fixed']:
            res[f].append(F['fixed'][f][0])
    tv = lambda k: truth['sd'][k] if k in truth['sd'] else truth['beta'][k]  # noqa: E731
    print(json.dumps({k: {'truth': round(tv(k), 2), 'laplace_mean': round(float(np.mean(v)), 2), 'laplace_sd': round(float(np.std(v)), 2)} for k, v in res.items()}))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
