# For each sampled photo and each size: the reference (the original with Pierre's crop and rotation, scaled as the tools
# scale it; a lecture photo's only source is its 1600 px WebP), today's WebP re-encoded at today's settings from it, and
# AVIF on a fixed quality grid (Pillow 13 / libaom, speed 6, 4:2:0, one thread), each scored against the reference with
# SSIMULACRA2 and SSIM (luma). Plus timings at speeds 8 and 9, and AVIF made from today's 1600 px WebP instead of the
# original (the backfill without re-downloading). One JSON line per photo, resumable.
import sys, os, io, json, time
from multiprocessing import Pool
WT, DATA = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(WT, 'tools'))
import numpy as np
from scipy import ndimage
from PIL import Image
import photos, fish_game
from ssimulacra2 import compute_ssimulacra2 as _s2

GRID = {1600: [30, 40, 50, 60, 70, 80, 90]}
FINE = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90]
OUT = os.path.join(DATA, 'results.jsonl')


def png(a):
    b = io.BytesIO(); a.save(b, 'PNG'); b.seek(0); return b


def s2(ref, dist):
    return round(_s2(png(ref), png(dist)), 3)


def luma(a):
    return np.asarray(a.convert('YCbCr'), dtype=np.float64)[:, :, 0]


def ssim(ref, dist):
    x, y = luma(ref), luma(dist)
    C1, C2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    f = lambda z: ndimage.gaussian_filter(z, 1.5, truncate=3.5)
    mx, my = f(x), f(y)
    sxx, syy, sxy = f(x * x) - mx * mx, f(y * y) - my * my, f(x * y) - mx * my
    m = ((2 * mx * my + C1) * (2 * sxy + C2)) / ((mx * mx + my * my + C1) * (sxx + syy + C2))
    return round(float(m.mean()), 5)


def enc(a, fmt, **kw):
    b = io.BytesIO(); t = time.perf_counter(); a.save(b, fmt, **kw); dt = time.perf_counter() - t
    v = b.getvalue()
    return v, dt, Image.open(io.BytesIO(v)).convert('RGB')


def score(ref, dist):
    return {'s2': s2(ref, dist), 'ssim': ssim(ref, dist)}


def one(x):
    f = x['f']
    lecture = x['group'] == 'coral-lecture'
    if lecture:
        base = Image.open(os.path.join(DATA, 'r2', f + '.webp')).convert('RGB')
        orig = None
    else:
        orig = Image.open(os.path.join(DATA, 'src', f + '.bin')).convert('RGB')
        base = photos.turn(orig, x.get('cr'), x.get('ro'))
    r2_1600 = Image.open(os.path.join(DATA, 'r2', f + '.webp')).convert('RGB')
    res = {'f': f, 'group': x['group'], 'band': x['band'], 'bpp': x['bpp'], 'base': base.size, 'sizes': {}}
    jobs = [(w, q, suf) for w, q, suf in photos.SIZES]
    if x.get('xc') and orig is not None:
        jobs.append((360, fish_game.TILE_Q, '-x'))
    for w, q, suf in jobs:
        if suf == '-x':
            ref = photos.square(orig, x['xc'], x.get('cr') or [0, 0, 1, 1], x.get('ro'), fish_game.TILE, fish_game.FEATHER)
        else:
            ref = base.copy(); ref.thumbnail((w, w))
        v, dt, d = enc(ref, 'WEBP', quality=q, method=5)
        r2b = open(os.path.join(DATA, 'r2', f + suf + '.webp'), 'rb').read()
        row = {'px': ref.size, 'webp': {'q': q, 'bytes': len(v), 't': round(dt, 4), 'same_as_r2': v == r2b, 'r2_bytes': len(r2b), **score(ref, d)}, 'avif': {}}
        for aq in GRID.get(w, FINE):
            v, dt, d = enc(ref, 'AVIF', quality=aq, speed=6, max_threads=1)
            row['avif'][aq] = {'bytes': len(v), 't': round(dt, 4), **score(ref, d)}
        # Faster speeds at two qualities, for the CI time and what they cost in bytes.
        row['fast'] = {}
        for aq in (50, 60):
            for sp in (8, 9):
                v, dt, d = enc(ref, 'AVIF', quality=aq, speed=sp, max_threads=1)
                row['fast'][f'{aq}/{sp}'] = {'bytes': len(v), 't': round(dt, 4), **score(ref, d)}
        # The backfill from today's 1600 px WebP (no re-download), scored against the original's reference.
        if orig is not None and suf in ('-m', '-s', '-t'):
            alt = r2_1600.copy(); alt.thumbnail((w, w))
            if alt.size == ref.size:
                row['from_webp'] = {}
                for aq in (50, 60, 70):
                    v, dt, d = enc(alt, 'AVIF', quality=aq, speed=6, max_threads=1)
                    row['from_webp'][aq] = {'bytes': len(v), **score(ref, d)}
        res['sizes'][suf or '1600'] = row
    return res


if __name__ == '__main__':
    S = json.load(open(os.path.join(DATA, 'sample.json')))
    done = set()
    if os.path.exists(OUT):
        done = {json.loads(l)['f'] for l in open(OUT)}
    todo = [x for x in S if x['f'] not in done]
    n = int(os.environ.get('WORKERS', '3'))
    t0 = time.time()
    with Pool(n) as p, open(OUT, 'a') as fh:
        for i, r in enumerate(p.imap_unordered(one, todo)):
            fh.write(json.dumps(r) + '\n'); fh.flush()
            print(f'{i + 1}/{len(todo)} {r["f"]} {time.time() - t0:.0f}s', flush=True)
