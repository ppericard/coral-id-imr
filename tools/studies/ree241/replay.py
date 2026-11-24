"""REE-241 (Q457) L12 replay: the judged ease centred per family (cen) against the scale's middle (unc), at today's
weight 0.3 a point (core.js CALIB.ease), on the real fish answer log.

    python3 -I tools/studies/ree241/replay.py ROWS.json ROOT [raw|adapt|center]

ROWS.json: one row per fish quiz answer with the app's logged prediction, as the REE-85 / REE-240 prep made it from the
pseudonymised Answers tab (kept outside the repo, rule L12): z, the logit of the app's expected success net of guessing,
and share = w x (3 - e) x 0.5, the ease's part of the difficulty the app used then (w its fading weight, e the ease of the
time). Each arm replaces that part: z_arm = z + share - w x (c - e) x 0.3, c = 3 (unc) or the mean judged ease of the
photo's family in today's pool (cen; ROOT's fish.json and fish-game.json, a photo's family its species', as core.js
treeGen and model.js easeMid). The modes, as REE-240's replay (docs/LEARNING.md "The judged ease weight, measured"):
raw, the ability as logged; adapt, the ability moved by the mean change of the difficulties the player met before on
the unit (a first-order stand-in for replaying the Elo); center, each arm's level refitted per player (an intercept).
Scores: next-answer log-loss, cen - unc paired per player (players the unit: the mean of the players' means, a 95% t
interval, an exact sign-flip p), and calibration (observed against expected) by the family's mean ease, where the
centring acts. Read-only.
"""
import collections as C
import itertools
import json
import math
import statistics as st
import sys

rows = json.load(open(sys.argv[1]))
ROOT = sys.argv[2]
MODE = sys.argv[3] if len(sys.argv) > 3 else 'raw'
K0, K, MID = 0.5, 0.3, 3
sig = lambda x: 1 / (1 + math.exp(-x))

F = json.load(open(ROOT + '/fish.json'))
G = json.load(open(ROOT + '/fish-game.json'))['photos']
fam_sp = {s: f['id'] for f in F['families'] for s in f.get('species', [])}
fam_name = {f['name']: f['id'] for f in F['families']}
gfam = {g['id']: g.get('family') for g in F.get('genera', [])}
by_fam = C.defaultdict(list)
seen = set()
for L in G.values():
    for p in L:
        if p['f'] in seen or not p.get('e'):
            continue
        seen.add(p['f'])
        fid = gfam.get(p.get('sp')) if p.get('gl') else fam_sp.get(p.get('sp'))
        if fid:
            by_fam[fid].append(p['e'])
MIDS = {k: st.mean(v) for k, v in by_fam.items()}


def e_used(r):
    return r['e_log'] if (r['pre'] and r['e_log'] is not None and 1 <= r['e_log'] <= 5) else r['e_time']


for r in rows:
    r['fid'] = fam_name.get(r['fam'])
    r['mid'] = MIDS.get(r['fid'], MID)
rows = [r for r in rows if r['fid'] in MIDS]


def part(r, arm):
    c = MID if arm == 'unc' else r['mid']
    return r['w'] * (c - e_used(r)) * K


def zbase(r, arm):
    return r['z'] + r['share'] - part(r, arm)


def build_adapt(arm):
    out, unit, allp = {}, C.defaultdict(list), C.defaultdict(list)
    for r in sorted(rows, key=lambda r: (r['t'], r['row'])):
        dd = part(r, arm) - r['share']  # the change of this answer's difficulty against the logged one
        u = unit[(r['p'], r['unit'])] or allp[r['p']]
        out[r['row']] = sum(u) / len(u) if u else 0.0
        unit[(r['p'], r['unit'])].append(dd)
        allp[r['p']].append(dd)
    return out


def build_center(arm):
    by = C.defaultdict(list)
    for r in rows:
        by[r['p']].append(r)
    off = {}
    for p, L in by.items():
        a = 0.0
        for _ in range(50):
            g1 = h = 0.0
            for r in L:
                s = sig(zbase(r, arm) + a)
                q = min(1 - 1e-9, max(1e-9, r['g'] + (1 - r['g']) * s))
                dq = (1 - r['g']) * s * (1 - s)
                g1 += (r['y'] - q) / (q * (1 - q)) * dq
                h += dq * dq / (q * (1 - q))
            a += g1 / h
        off[p] = a
    return {r['row']: off[r['p']] for r in rows}


SHIFT = {}


def pred(r, arm):
    if arm not in SHIFT:
        SHIFT[arm] = build_adapt(arm) if MODE == 'adapt' else build_center(arm) if MODE == 'center' else {}
    p = r['g'] + (1 - r['g']) * sig(zbase(r, arm) + SHIFT[arm].get(r['row'], 0.0))
    return min(1 - 1e-6, max(1e-6, p))


def ll(r, arm):
    p = pred(r, arm)
    return -math.log(p if r['y'] else 1 - p)


T975 = {1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228}


def paired(sub):
    by = C.defaultdict(list)
    for r in sub:
        by[r['p']].append(ll(r, 'cen') - ll(r, 'unc'))
    d = [sum(v) / len(v) for v in by.values()]
    n = len(d)
    m = sum(d) / n
    if n < 2:
        return m, None, None, None, n, sum(1 for x in d if x < 0)
    sd = math.sqrt(sum((x - m) ** 2 for x in d) / (n - 1))
    h = T975.get(n - 1, 2.0) * sd / math.sqrt(n)
    hits = tot = 0
    for s in itertools.product((1, -1), repeat=n):
        tot += 1
        hits += abs(sum(a * b for a, b in zip(s, d)) / n) >= abs(m) - 1e-15
    return m, m - h, m + h, hits / tot, n, sum(1 for x in d if x < 0)


def calib(sub, arm):
    n = len(sub)
    obs = sum(r['y'] for r in sub) / n
    P = [pred(r, arm) for r in sub]
    var = sum(p * (1 - p) for p in P)
    return n, obs, sum(P) / n, (obs * n - sum(P)) / math.sqrt(var) if var > 0 else 0


ms = sorted(set(r['mid'] for r in rows))
lo_c = sorted(r['mid'] for r in rows)[len(rows) // 3]
hi_c = sorted(r['mid'] for r in rows)[2 * len(rows) // 3]
bands = [
    ('Families judged hardest (mean ease < %.2f)' % lo_c, [r for r in rows if r['mid'] < lo_c]),
    ('Middle third', [r for r in rows if lo_c <= r['mid'] < hi_c]),
    ('Families judged easiest (mean ease >= %.2f)' % hi_c, [r for r in rows if r['mid'] >= hi_c]),
]
print('mode', MODE, 'answers', len(rows), 'players', len({r['p'] for r in rows}), 'families', len({r['fid'] for r in rows}))
print('| Subset | Answers | Log-loss unc | Log-loss cen | cen - unc, mean of players [95% t] | Players better | Sign-flip p |')
for name, sub in [('All', rows), ('Family questions', [r for r in rows if r['rank'] == 'family'])] + bands:
    m, lo, hi, p, n, b = paired(sub)
    lu = sum(ll(r, 'unc') for r in sub) / len(sub)
    lc = sum(ll(r, 'cen') for r in sub) / len(sub)
    iv = '-' if lo is None else '[%+.4f, %+.4f]' % (lo, hi)
    print('| %s | %d | %.4f | %.4f | %+.4f %s | %d of %d | %s |' % (name, len(sub), lu, lc, m, iv, b, n, '-' if p is None else '%.2f' % p))
print()
print('| Families by mean ease | Answers | Observed | Expected unc | z | Expected cen | z |')
for name, sub in [('All', rows)] + bands:
    a, b = calib(sub, 'unc'), calib(sub, 'cen')
    print('| %s | %d | %.3f | %.3f | %+.2f | %.3f | %+.2f |' % (name, a[0], a[1], a[2], a[3], b[2], b[3]))
sh = [abs(part(r, 'cen') - part(r, 'unc')) for r in rows]
print('\nmean |cen - unc| difficulty change per answer: %.3f logit' % (sum(sh) / len(sh)))
