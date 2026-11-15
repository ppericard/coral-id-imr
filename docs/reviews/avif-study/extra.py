# JPEG XL and AVIF tune=iq against today's WebP at 480 and 240 px: equal-SSIMULACRA2 saving, and a fixed setting.
import sys, os, json, math, statistics as st
DATA = sys.argv[1]
R = {json.loads(l)['f']: json.loads(l) for l in open(os.path.join(DATA, 'results.jsonl'))}


def pct(xs, p):
    xs = sorted(xs); k = (len(xs) - 1) * p; f = math.floor(k); c = min(f + 1, len(xs) - 1)
    return xs[f] + (xs[c] - xs[f]) * (k - f)


def at(points, target):
    pts = sorted(points, key=lambda t: t[1])
    for (b0, s0), (b1, s1) in zip(pts, pts[1:]):
        if s0 <= target <= s1 and s1 > s0:
            t = (target - s0) / (s1 - s0)
            return math.exp(math.log(b0) + t * (math.log(b1) - math.log(b0)))
    return None


for name, fn, key in (('JPEG XL (libjxl effort 7)', 'jxl.jsonl', 'jxl'), ('AVIF tune=iq', 'tune.jsonl', 'iq')):
    p = os.path.join(DATA, fn)
    if not os.path.exists(p): continue
    L = [json.loads(l) for l in open(p)]
    print('\n##', name, len(L), 'rows')
    for size in ('-s', '-t'):
        rows = [r for r in L if r['size'] == size]
        sv, sva, oog, wb, xb = [], [], 0, 0, 0
        for r in rows:
            web = R[r['f']]['sizes'][size]['webp']; av = R[r['f']]['sizes'][size]['avif']
            x = at([(v['bytes'], v['s2']) for v in r[key].values()], web['s2'])
            a = at([(v['bytes'], v['s2']) for v in av.values()], web['s2'])
            if x is None or a is None: oog += 1; continue
            sv.append(1 - x / web['bytes']); sva.append(1 - a / web['bytes']); wb += web['bytes']; xb += x
        print(f'{size}: n {len(sv)} (out of grid {oog}); saving vs WebP median {st.median(sv) * 100:.0f} % (p25 {pct(sv, .25) * 100:.0f}, p75 {pct(sv, .75) * 100:.0f}, p10 {pct(sv, .1) * 100:.0f}), byte-weighted {(1 - xb / wb) * 100:.0f} %; plain AVIF on the same photos: median {st.median(sva) * 100:.0f} %')
        # A fixed setting: the first (by bytes) whose median score difference is >= 0.
        for k in sorted(rows[0][key], key=lambda k: -float(k) if key == 'jxl' else float(k)):
            d = [r[key][k]['s2'] - R[r['f']]['sizes'][size]['webp']['s2'] for r in rows]
            if st.median(d) >= 0:
                bw = 1 - sum(r[key][k]['bytes'] for r in rows) / sum(R[r['f']]['sizes'][size]['webp']['bytes'] for r in rows)
                print(f'   fixed {key} {k}: median score diff {st.median(d):+.1f}, worse by > 2: {sum(x < -2 for x in d) / len(d) * 100:.0f} %, byte-weighted saving {bw * 100:.0f} %')
                break
