# First-pass photo quality for the curation back-office: 3 good, 2 fair, 1 poor (realistic-mode material).
# Measures on each 1600 px WebP: sharpness (variance of the Laplacian), contrast, colour cast (blue/green
# dominance) and pixel size (small sources were upscaled). Ranks combine into one score; the thresholds
# are rough on purpose: Pierre corrects ratings in admin.html (curation.json "quality").
# Usage: python3 tools/photo_quality.py  (from the repo root; writes quality.json)
import json, os
import numpy as np
from PIL import Image

def measure(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    small = im.resize((800, round(800 * h / w)))
    a = np.asarray(small, dtype=np.float32) / 255
    g = a @ np.array([.299, .587, .114], dtype=np.float32)
    lap = -4 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:]
    # Sharpness of the best-focused part: per tile of an 8x8 grid, Laplacian energy relative to the tile's
    # contrast (so a sharp macro with a soft background still scores, and busy texture alone doesn't).
    H, W = lap.shape; t = []
    for i in range(8):
        for j in range(8):
            L = lap[i * H // 8:(i + 1) * H // 8, j * W // 8:(j + 1) * W // 8]; G = g[i * H // 8:(i + 1) * H // 8, j * W // 8:(j + 1) * W // 8]
            if G.std() > .03: t.append(L.var() / (G.var() + 1e-4))
    sharp = float(np.percentile(t, 85)) if t else 0.
    r, gr, b = a[..., 0].mean(), a[..., 1].mean(), a[..., 2].mean()
    cast = max(gr, b) - r  # underwater photos lose red first
    return dict(sharp=sharp, contrast=float(g.std()), cast=float(cast), dark=float(abs(g.mean() - .45)), px=max(w, h))

files = sorted(f[:-5] for f in os.listdir('img') if f.endswith('.webp') and not f.endswith('-s.webp'))
M = {f: measure(f'img/{f}.webp') for f in files}

def rank(key, reverse=False):
    vals = sorted(M, key=lambda f: M[f][key], reverse=reverse)
    return {f: i / (len(vals) - 1) for i, f in enumerate(vals)}

sharp, contrast, cast, dark = rank('sharp'), rank('contrast'), rank('cast', reverse=True), rank('dark', reverse=True)
score = {f: .45 * sharp[f] + .2 * contrast[f] + .2 * cast[f] + .15 * dark[f] - (.25 if M[f]['px'] < 1000 else 0) for f in files}
order = sorted(files, key=lambda f: score[f])
n = len(order)
Q = {f: 1 if i < .2 * n else 2 if i < .55 * n else 3 for i, f in enumerate(order)}
# Ratings from the outside judging agent (suggest.json "quality", tools/judging_import.py) replace the measured ones.
# Ratings Claude gave by eye (tools/quality_eye.json) replace the measured ones too: the measure under-rates macro
# photos, whose shallow depth of field leaves only part of the frame sharp.
if os.path.exists('tools/quality_eye.json'): Q.update({f: q for f, q in json.load(open('tools/quality_eye.json'))['q'].items() if f in Q})
if os.path.exists('suggest.json'): Q.update({f: q for f, q in json.load(open('suggest.json')).get('quality', {}).items() if f in Q})
json.dump({'v': 1, 'q': Q}, open('quality.json', 'w'), separators=(',', ':'), sort_keys=True)
print({k: sum(1 for v in Q.values() if v == k) for k in (1, 2, 3)})
