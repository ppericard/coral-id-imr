"""REE-241: when each unit opens and reaches Open Water in the app world, main against the change (tools/learnsim.js
--out files of the two arms, the same seeds).

    python3 -I tools/studies/ree241/metcmp.py BEFORE.json AFTER.json [N]

Per base unit (the subject's slate: the fish families, the sea slug genera; rank '' in the runs' metAt), over every
(profile, seed) run: the share of runs that met it within the run, the median question it was met at (runs that met
it), and the share of runs where it reached Open Water. Sorted by the change in the share met, then in the median question met; the N that move most
each way (default 12). Then the units met by question 50 and 100, mean over runs, for each arm. Read-only.
"""
import json
import statistics as st
import sys

A = json.load(open(sys.argv[1]))
B = json.load(open(sys.argv[2]))
N = int(sys.argv[3]) if len(sys.argv) > 3 else 12
key = lambda r: (r['profile'], r['seed'])
RA = {key(r): r for r in A['runs']}
RB = {key(r): r for r in B['runs']}
K = sorted(set(RA) & set(RB))
units = sorted({u for k in K for u in list(RA[k]['metAt']) + list(RB[k]['metAt']) if not u.startswith(('g:', 's:', 'sci:')) or A['subject'] == 'seaslug'})


def stat(R, u):
    met = [R[k]['metAt'][u] for k in K if u in R[k]['metAt']]
    ow = sum(1 for k in K if u in (R[k].get('owAt') or {}))
    return len(met) / len(K), (st.median(met) if met else None), ow / len(K)


rows = []
for u in units:
    a, b = stat(RA, u), stat(RB, u)
    dm = (b[1] - a[1]) if a[1] is not None and b[1] is not None else 0
    rows.append(((b[0] - a[0]), -dm, u, a, b))
rows.sort()
rows = [(d, u, a, b) for d, _, u, a, b in rows]
sel = rows if len(rows) <= 2 * N else rows[:N] + rows[-N:]
fmt = lambda x: '-' if x is None else '%g' % x
print('%d paired runs (%s)' % (len(K), ', '.join(sorted({k[0] for k in K}))))
print('| Unit | Met: main | change | Median question met: main | change | Open Water: main | change |')
print('| --- | --- | --- | --- | --- | --- | --- |')
for d, u, a, b in sel:
    print('| %s | %.2f | %.2f | %s | %s | %.2f | %.2f |' % (u, a[0], b[0], fmt(a[1]), fmt(b[1]), a[2], b[2]))
for q in (50, 100, 300):
    ma = st.mean(sum(1 for v in RA[k]['metAt'].values() if v <= q) for k in K)
    mb = st.mean(sum(1 for v in RB[k]['metAt'].values() if v <= q) for k in K)
    print('units of every rank met by question %d: main %.1f, change %.1f' % (q, ma, mb))
