"""REE-241: the opening orders of the two arms side by side (openorder.js --out files of main and of the change).

    python3 -I tools/studies/ree241/ordercmp.py MAIN.json CHANGE.json [N]

Prints, per base unit, the circle, the mean judged ease, the offset, genusDiff in each arm, the mean opening rank in
each arm and its change, and the chance to be among the first 16 openings; the units are sorted by the rank change, the
N that move most each way (default all). Then a summary: how many units move by 2 or more places, and the rank
correlation of the opening order with the units' mean ease and with their offsets, per arm. Read-only.
"""
import json
import sys

A = json.load(open(sys.argv[1]))
B = json.load(open(sys.argv[2]))
N = int(sys.argv[3]) if len(sys.argv) > 3 else 0
U = [n for n in A['units'] if n in B['units']]


def rankdata(v):
    o = sorted(range(len(v)), key=lambda i: v[i])
    r = [0.0] * len(v)
    i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and v[o[j + 1]] == v[o[i]]:
            j += 1
        for k in range(i, j + 1):
            r[o[k]] = (i + j) / 2
        i = j + 1
    return r


def spearman(x, y):
    rx, ry = rankdata(x), rankdata(y)
    n = len(x)
    mx, my = sum(rx) / n, sum(ry) / n
    c = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    v = (sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry)) ** 0.5
    return c / v if v else float('nan')  # a constant (no offsets read): no order to correlate


rows = []
for n in U:
    a, b = A['units'][n], B['units'][n]
    rows.append((b['rank'] - a['rank'], n, a, b))
rows.sort(key=lambda r: r[0])
sel = rows if not N or len(rows) <= 2 * N else rows[:N] + rows[-N:]
print('stats: main %s, change %s; trust main %s, change %s' % (A['stats'], B['stats'], A['trust'], B['trust']))
print('| Unit | Circle | Mean ease | Offset | genusDiff main | genusDiff change | Rank main | Rank change | Moves | First 16: main | change |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for d, n, a, b in sel:
    print('| %s | %s | %s | %+.2f | %+.2f | %+.2f | %.1f | %.1f | %+.1f | %.2f | %.2f |' % (
        a['name'], a['circle'], a['ease'], a['off'], a['gd'], b['gd'], a['rank'], b['rank'], d, a['in16'], b['in16']))
movers = sum(1 for d, *_ in rows if abs(d) >= 2)
ease = [A['units'][n]['ease'] or 0 for n in U]
off = [A['units'][n]['off'] for n in U]
ra = [A['units'][n]['rank'] for n in U]
rb = [B['units'][n]['rank'] for n in U]
print('\nunits %d, moving 2 places or more: %d, the largest move %.1f' % (len(U), movers, max(abs(r[0]) for r in rows)))
print('Spearman of the opening rank with the mean ease: main %+.2f, change %+.2f' % (spearman(ra, ease), spearman(rb, ease)))
print('Spearman of the opening rank with the offset: main %+.2f, change %+.2f' % (spearman(ra, off), spearman(rb, off)))
# within each circle (the gates fix the circles' order)
for c in sorted({A['units'][n]['circle'] for n in U}):
    L = [n for n in U if A['units'][n]['circle'] == c]
    if len(L) < 4:
        continue
    e = [A['units'][n]['ease'] or 0 for n in L]
    print('circle %s (%d units): Spearman rank~ease main %+.2f change %+.2f' % (
        c, len(L), spearman([A['units'][n]['rank'] for n in L], e), spearman([B['units'][n]['rank'] for n in L], e)))
