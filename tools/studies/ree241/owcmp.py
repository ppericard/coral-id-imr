"""REE-241: which units a profile reaches Open Water on by question Q, main against the change (learnsim --out files,
the same seeds), with each unit's mean judged ease from an openorder.js --out file of the change.

    python3 -I tools/studies/ree241/owcmp.py BEFORE.json AFTER.json ORDER.json PROFILE [Q]

Prints the units whose share of runs at Open Water by question Q (default 300) differs most, and the change in units
at Open Water by question Q among the units judged easier than 3 on average and the others. Read-only.
"""
import json
import sys

A, B, O = (json.load(open(f)) for f in sys.argv[1:4])
PROF = sys.argv[4]
Q = int(sys.argv[5]) if len(sys.argv) > 5 else 300
ease = {n: u['ease'] for n, u in O['units'].items()}
ra = {r['seed']: r for r in A['runs'] if r['profile'] == PROF}
rb = {r['seed']: r for r in B['runs'] if r['profile'] == PROF}
K = sorted(set(ra) & set(rb))
ow = lambda r, n: n in (r.get('owAt') or {}) and r['owAt'][n] <= Q
units = sorted({n for k in K for n in list((ra[k].get('owAt') or {})) + list((rb[k].get('owAt') or {}))})
rows = sorted(((sum(ow(rb[k], n) for k in K) - sum(ow(ra[k], n) for k in K)) / len(K), n) for n in units)
print('%s, %d seeds, Open Water by question %d' % (PROF, len(K), Q))
for d, n in rows[:8] + rows[-8:]:
    print('  %-24s ease %s  share main %.2f -> change %.2f' % (n, ease.get(n), sum(ow(ra[k], n) for k in K) / len(K), sum(ow(rb[k], n) for k in K) / len(K)))
for name, keep in (('mean ease < 3', lambda e: e is not None and e < 3), ('mean ease >= 3', lambda e: e is not None and e >= 3)):
    L = [n for n in units if keep(ease.get(n))]
    a = sum(ow(ra[k], n) for k in K for n in L) / len(K)
    b = sum(ow(rb[k], n) for k in K for n in L) / len(K)
    print('units %s: %.1f -> %.1f at Open Water a run' % (name, a, b))
