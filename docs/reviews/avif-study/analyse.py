# The numbers of the study from results.jsonl (+ bucket.json for the storage).
import sys, os, json, math, statistics as st
DATA = sys.argv[1]
R = [json.loads(l) for l in open(os.path.join(DATA, 'results.jsonl'))]
B = json.load(open(os.path.join(DATA, 'bucket.json')))
SIZES = ['1600', '-m', '-s', '-t', '-x']
NAME = {'1600': '1600 px', '-m': '960 px (-m)', '-s': '480 px (-s)', '-t': '240 px (-t)', '-x': '360 px tile (-x)'}


def pct(xs, p):
    xs = sorted(xs)
    if not xs: return float('nan')
    k = (len(xs) - 1) * p
    f = math.floor(k); c = min(f + 1, len(xs) - 1)
    return xs[f] + (xs[c] - xs[f]) * (k - f)


def at_score(row, key):
    """AVIF bytes at the WebP's score (key s2 or ssim), log-bytes linear between the grid points that bracket it; None
    when the WebP's score is outside the AVIF grid's range."""
    target = row['webp'][key]
    pts = sorted(((int(q), v) for q, v in row['avif'].items()), key=lambda t: t[0])
    for (q0, a), (q1, b) in zip(pts, pts[1:]):
        lo, hi = a[key], b[key]
        if lo <= target <= hi and hi > lo:
            t = (target - lo) / (hi - lo)
            return math.exp(math.log(a['bytes']) + t * (math.log(b['bytes']) - math.log(a['bytes'])))
    return None


def rows(size, keep=lambda r: True):
    out = []
    for r in R:
        row = r['sizes'].get(size)
        if not row or not keep(r): continue
        if size == '1600' and r['group'] == 'coral-lecture': continue  # second-generation reference: reported apart
        out.append((r, row))
    return out


def saving_table(key, keep=lambda r: True, label=''):
    print(f'\n## Equal-quality saving, {key} {label}')
    print('| size | n | out of grid | median | p25-p75 | p10-p90 | byte-weighted | WebP score median |')
    for s in SIZES:
        L = rows(s, keep)
        sv, wb, ab, oog, sc = [], 0, 0, 0, []
        for r, row in L:
            a = at_score(row, key)
            if a is None: oog += 1; continue
            sv.append(1 - a / row['webp']['bytes']); wb += row['webp']['bytes']; ab += a; sc.append(row['webp'][key])
        if not sv: continue
        f = lambda v: f'{v * 100:.0f} %'
        print(f'| {NAME[s]} | {len(sv)} | {oog} | {f(st.median(sv))} | {f(pct(sv, .25))} to {f(pct(sv, .75))} | {f(pct(sv, .1))} to {f(pct(sv, .9))} | {f(1 - ab / wb)} | {st.median(sc):.3f} |')


saving_table('s2')
saving_table('ssim')
for g in ('coral-field', 'coral-lecture', 'fish'):
    saving_table('s2', lambda r, g=g: r['group'] == g, g)
for b in ('plain', 'middle', 'busy'):
    saving_table('s2', lambda r, b=b: r['band'] == b, 'band ' + b)
# Lecture 1600 apart
L = [(r, r['sizes']['1600']) for r in R if r['group'] == 'coral-lecture']
sv = [1 - a / row['webp']['bytes'] for r, row in L if (a := at_score(row, 's2'))]
print('\nlecture 1600 (second generation), s2 saving median', f'{st.median(sv) * 100:.0f} %' if sv else '-', 'n', len(sv))

print('\n## Fixed AVIF quality per size: score difference (AVIF - WebP, SSIMULACRA2) and bytes')
print('| size | AVIF q | median score diff | share worse by > 2 | byte-weighted saving | median saving | enc s median |')
FIX = {}
for s in SIZES:
    L = rows(s)
    if not L: continue
    qs = sorted({int(q) for _, row in L for q in row['avif']})
    best = None
    for q in qs:
        d = [row['avif'][str(q)]['s2'] - row['webp']['s2'] for _, row in L]
        wb = sum(row['webp']['bytes'] for _, row in L); ab = sum(row['avif'][str(q)]['bytes'] for _, row in L)
        ms = st.median([1 - row['avif'][str(q)]['bytes'] / row['webp']['bytes'] for _, row in L])
        tt = st.median([row['avif'][str(q)]['t'] for _, row in L])
        worse = sum(x < -2 for x in d) / len(d)
        if best is None and st.median(d) >= 0: best = q
        print(f'| {NAME[s]} | {q} | {st.median(d):+.1f} | {worse * 100:.0f} % | {(1 - ab / wb) * 100:.0f} % | {ms * 100:.0f} % | {tt:.3f} |')
    FIX[s] = best
print('lowest q with median score diff >= 0:', FIX)

print('\n## WebP today: reproduced from the original, byte for byte')
same = sum(1 for r in R for s, row in r['sizes'].items() if row['webp']['same_as_r2'] and r['group'] != 'coral-lecture')
tot = sum(1 for r in R for s, row in r['sizes'].items() if r['group'] != 'coral-lecture')
print(same, 'of', tot, 'files (non-lecture)')
print('bases smaller than 1600 px:', sum(1 for r in R if max(r['base']) < 1600), 'smaller than 960:', sum(1 for r in R if max(r['base']) < 960))

print('\n## Encode time per photo, all four sizes, one thread (s)')
for q in sorted(set(FIX.values()) | {50, 60}):
    if q is None: continue
    T = [sum(r['sizes'][s]['avif'].get(str(q), {}).get('t', 0) for s in ('1600', '-m', '-s', '-t')) for r in R if '1600' in r['sizes'] and str(q) in r['sizes']['1600']['avif']]
    if T: print(f'speed 6 q{q}: median {st.median(T):.2f}, p90 {pct(T, .9):.2f}, n {len(T)}')
Tf = [sum(r['sizes'][s]['avif'][str(FIX[s])]['t'] for s in ('1600', '-m', '-s', '-t') if FIX.get(s) and str(FIX[s]) in r['sizes'][s]['avif']) for r in R]
print(f'speed 6 at the fixed q per size: median {st.median(Tf):.2f} s, p90 {pct(Tf, .9):.2f} s, mean {st.mean(Tf):.2f} s')
for k in ('50/8', '50/9', '60/8', '60/9'):
    T = [sum(r['sizes'][s]['fast'][k]['t'] for s in ('1600', '-m', '-s', '-t')) for r in R]
    q = k.split('/')[0]
    d = [r['sizes'][s]['fast'][k]['s2'] - r['sizes'][s]['avif'][q]['s2'] for r in R for s in ('-s', '-t') if q in r['sizes'][s]['avif']]
    bb = [r['sizes'][s]['fast'][k]['bytes'] / r['sizes'][s]['avif'][q]['bytes'] - 1 for r in R for s in ('-s', '-t') if q in r['sizes'][s]['avif']]
    print(f'speed {k}: per photo median {st.median(T):.2f} s; vs speed 6 at 480/240: score {st.median(d):+.2f}, bytes {st.median(bb) * 100:+.1f} %')
Tw = [sum(r['sizes'][s]['webp']['t'] for s in ('1600', '-m', '-s', '-t')) for r in R]
print(f'WebP today (method 5): per photo median {st.median(Tw):.2f} s')

print('\n## Backfill from today\'s 1600 px WebP instead of the original (score loss, s2)')
for s in ('-m', '-s', '-t'):
    for q in ('50', '60', '70'):
        d = [r['sizes'][s]['from_webp'][q]['s2'] - r['sizes'][s]['avif'][q]['s2'] for r in R if r['sizes'].get(s, {}).get('from_webp')]
        if d: print(f'{NAME[s]} q{q}: median {st.median(d):+.2f}, p10 {pct(d, .1):+.2f}, n {len(d)}')

# Storage: today's mean bytes per size (HEAD sample) x counts, times the AVIF/WebP byte ratio at the fixed q.
print('\n## Storage')
N = B['n']; H = B['heads']
ratio = {}
for s in SIZES:
    L = rows(s)
    q = FIX.get(s)
    if not L or q is None: continue
    ratio[s] = sum(row['avif'][str(q)]['bytes'] for _, row in L) / sum(row['webp']['bytes'] for _, row in L)
print('AVIF/WebP byte ratio at fixed q:', {s: round(v, 3) for s, v in ratio.items()})
add = {}
for s, key in (('1600', ''), ('-m', '-m'), ('-s', '-s'), ('-t', '-t')):
    tot = 0
    for g in ('coral', 'fish'):
        F = list(H[g].values())
        tot += sum(x[key] for x in F) / len(F) * N[g]
    add[s] = tot * ratio.get(s, 1)
    print(f'{NAME[s]}: WebP today {tot / 1e9:.2f} GB, AVIF copies +{add[s] / 1e9:.2f} GB')
tm = sum(x['-x'] for x in H['tile'].values()) / len(H['tile']) * N['tiles']
print(f'tiles: WebP {tm / 1e6:.1f} MB, AVIF +{tm * ratio.get("-x", 1) / 1e6:.1f} MB')
print(f'all four sizes + tiles: +{(sum(add.values()) + tm * ratio.get("-x", 1)) / 1e9:.2f} GB; 480+240+tiles only: +{(add["-s"] + add["-t"] + tm * ratio.get("-x", 1)) / 1e9:.2f} GB; files per photo +4 or +2')

# Seconds on the line for a question's photo(s) at 480 and 960 px.
print('\n## Time on the line, one photo (median bytes)')
for s in ('-s', '-m', '-t'):
    L = rows(s)
    w = st.median([row['webp']['bytes'] for _, row in L]); a = st.median([row['avif'][str(FIX[s])]['bytes'] for _, row in L])
    for kb in (86, 729, 6703):
        print(f'{NAME[s]} at {kb} kbit/s: WebP {w * 8 / kb / 1000:.2f} s, AVIF {a * 8 / kb / 1000:.2f} s')
