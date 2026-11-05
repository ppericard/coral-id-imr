# Objective photo metrics for the auto-sort (Pierre, 2026-11-03: "objective metrics to break ties"): sharpness, size and
# colour cast of every photo, measured the same way on the site's photos and on the candidates. Used ONLY as tie-breakers
# and sanity flags next to the judging pass and Pierre's own eye (admin.js autoPlan, metFlag), never to decide alone.
#
#   python3 tools/photo_metrics.py             live photos (<f>-m.webp, 960 px: img/, or a copy from R2 kept in
#                                              tools/.cache/r2/ for the photos that live there only) and every iNaturalist candidate
#                                              waiting (its "large" file, 1024 px, resized to 960 px; downloaded once
#                                              into ~/.cache/coral-id-imr/metrics/, outside the repo)
#   python3 tools/photo_metrics.py --live      live photos only (no iNaturalist download)
#   python3 tools/photo_metrics.py --cand      candidates only
#   python3 tools/photo_metrics.py --calib     how each metric ranks the photos Pierre rated (curation.json quality)
#
# Writes metrics.json {"m": {f: [sharp, peak, px, cast]}} (admin only: players never download it); an existing entry is
# kept unless the photo is measured again, so a partial run adds to the file.
#   sharp  variance of the Laplacian of the grey image at 960 px on the long side, x 10^4 (the classic focus measure;
#          the whole frame, so blue water or a soft background lowers it)
#   peak   the same on the sharpest part: 85th percentile, over a 8 x 8 grid, of each tile's Laplacian variance over
#          its contrast (Pierre's method: look at the sharpest part of the coral at 100%; tools/photo_quality.py's measure)
#   px     long side in px of the largest file measured (1600 for a live photo, at most 1024 for a candidate): a value
#          under 1000 means the original is that small (judging/BRIEF.md: "under 1000 px ... Poor")
#   cast   colour cast in %: (max - min) of the mean R, G, B over their mean (0 = neutral grey world; underwater
#          photos lose red first)
import json, os, sys, io, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import numpy as np
from PIL import Image, ImageOps
from datajson import load_all
import photos

OUT = os.path.join(ROOT, 'metrics.json')
CACHE = os.path.join(os.path.expanduser('~'), '.cache', 'coral-id-imr', 'metrics')
W = 960


def measure(im, px):
    im = ImageOps.exif_transpose(im).convert('RGB')
    im.thumbnail((W, W))
    a = np.asarray(im, dtype=np.float32) / 255
    g = a @ np.array([.299, .587, .114], dtype=np.float32)
    lap = -4 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:]
    H, Wd = lap.shape
    t = []
    for i in range(8):
        for j in range(8):
            L = lap[i * H // 8:(i + 1) * H // 8, j * Wd // 8:(j + 1) * Wd // 8]
            G = g[i * H // 8:(i + 1) * H // 8, j * Wd // 8:(j + 1) * Wd // 8]
            if G.std() > .03: t.append(L.var() / (G.var() + 1e-4))
    m = a.reshape(-1, 3).mean(0)
    return [round(float(lap.var()) * 1e4, 1), round(float(np.percentile(t, 85)) if t else 0., 3), int(px),
            round(float((m.max() - m.min()) / (m.mean() + 1e-6)) * 100, 1)]


def live(f):
    with Image.open(photos.path(f)) as b: px = max(b.size)
    return measure(Image.open(photos.path(f, '-m')), px)


def cand(p):
    """The candidate's iNat "large" file, kept in the cache at 960 px (what is measured; about 150 KB) with its size."""
    out, side = os.path.join(CACHE, p['f'] + '.jpg'), os.path.join(CACHE, p['f'] + '.px')
    if not (os.path.exists(out) and os.path.getsize(out) and os.path.exists(side)):
        u = p['src'].replace('/original.', '/large.')
        req = urllib.request.Request(u, headers={'User-Agent': 'coral-id-imr photo_metrics'})
        with urllib.request.urlopen(req, timeout=60) as r: b = r.read()
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(b))).convert('RGB')
        px = max(im.size)
        im.thumbnail((W, W))
        os.makedirs(CACHE, exist_ok=True)
        im.save(out, quality=85)
        open(side, 'w').write(str(px))
    return measure(Image.open(out), int(open(side).read()))


def load():
    try: return json.load(open(OUT))
    except FileNotFoundError: return {}


def calib():
    """How well each metric orders the photos Pierre rated: AUC of Good vs the rest and of Poor vs the rest."""
    M, Q = load().get('m', {}), json.load(open(os.path.join(ROOT, 'curation.json'))).get('quality', {})
    R = [(Q[f], M[f]) for f in Q if f in M]
    print(f'{len(R)} photos rated by Pierre with metrics')
    def auc(pos, neg):
        if not pos or not neg: return float('nan')
        return sum((a > b) + .5 * (a == b) for a in pos for b in neg) / (len(pos) * len(neg))
    for k, name in enumerate(['sharp', 'peak', 'px', 'cast']):
        good = auc([m[k] for q, m in R if q == 3], [m[k] for q, m in R if q < 3])
        poor = auc([m[k] for q, m in R if q > 1], [m[k] for q, m in R if q == 1])
        med = {q: sorted(m[k] for qq, m in R if qq == q) for q in (1, 2, 3)}
        print(f'{name:6} AUC Good vs rest {good:.2f}, Fair+Good vs Poor {poor:.2f}; medians Poor/Fair/Good ' +
              ' / '.join(f'{L[len(L) // 2] if L else "-"} (n {len(L)})' for L in (med[1], med[2], med[3])))


if __name__ == '__main__':
    a = sys.argv[1:]
    import slot; slot.guard('tools/photo_metrics.py')  # one heavy run at a time on the machine (rule W24)
    if '--calib' in a: calib(); sys.exit(0)
    S = load()
    M = S.get('m', {})
    if '--cand' not in a:
        fs = photos.every()  # in img/ or on R2 only
        for i, f in enumerate(fs):
            try: M[f] = live(f)
            except Exception as e: print(f'{f}: {e}')
        print(f'{len(fs)} live photos measured')
    if '--live' not in a:
        D = load_all()
        L = [p for g in (D.get('cand') or {}).values() for p in g if p.get('r') and p.get('src') and not p.get('cf')]
        def one(p):
            try: return p['f'], cand(p)
            except Exception as e: return p['f'], str(e)
        n = 0
        with ThreadPoolExecutor(8) as ex:
            for f, m in ex.map(one, L):
                if isinstance(m, str): print(f'{f}: {m}')
                else: M[f] = m; n += 1
        print(f'{n} of {len(L)} candidates measured')
    S = {'v': 1, 'note': 'Objective photo metrics (tools/photo_metrics.py): [sharp, peak, px, cast]. Tie-breakers and sanity '
                         'flags for the auto-sort only, never a decision alone. Admin only.', 'm': dict(sorted(M.items()))}
    with open(OUT, 'w') as fh:  # one photo per line: two runs on different photos merge cleanly
        fh.write('{"v":1,"note":' + json.dumps(S['note']) + ',"m":{\n')
        fh.write(',\n'.join(json.dumps(f) + ':' + json.dumps(m, separators=(',', ':')) for f, m in S['m'].items()))
        fh.write('\n}}\n')
    print(f'metrics.json: {len(M)} photos')
