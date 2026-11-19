# The measured block of every game photo (Pierre, 2026-11-19, Q434): contrast, brightness, saturation, colour loss and
# sharpness, computed once by this script (rule L13), on the whole frame and on the fish alone where its box is known.
# They serve the multivariate analyses of the real answers and calibrating and checking the judges; the judge keeps what
# needs a human look (camouflage, whether the subject is obvious, juvenile, ease). Contrast is information about the
# photo's difficulty, never a defect the games correct (Pierre, 2026-11-19 15:01). Spec: docs/spec/data.md
# "measured.json"; decision: docs/decisions/2026-11-19-photo-measured-block.md.
#
#   python3 tools/photo_measure.py                     every game photo of every subject not measured yet (or whose
#                                                      pixels or box changed), downloaded from R2 at 960 px (-m), paced
#   python3 tools/photo_measure.py --subject fish      one subject (GAME below)
#   python3 tools/photo_measure.py --sample 500        the first 500 photos in a fixed hash order (a reproducible sample)
#   python3 tools/photo_measure.py --boxed             the photos with the fish's box only (fish-game.json bb)
#   python3 tools/photo_measure.py --minutes 35       stop cleanly after that long (default 35, rule L11's cap); a rerun
#                                                      resumes where it stopped
#   python3 tools/photo_measure.py --dir D             read <D>/<f>-m.webp instead of R2 (the photo workflow's
#                                                      r2-upload/, a test's fixtures); --out P writes P, not measured.json
#   python3 tools/photo_measure.py --judges            measures nothing: how each measure goes with the judges' tags
#                                                      (light, colour loss, clarity, ease) on the photos measured
#
# Downloads are kept in memory only (nothing written to disk); R2 is asked by WORKERS threads at most RATE requests a
# second. measured.json is written every FLUSH photos and at the end, so a stop loses little.
import argparse, hashlib, io, json, math, os, sys, threading, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import fish_short  # noqa: E402  (fish-game.json's short form)

OUT = os.path.join(ROOT, 'measured.json')
MV = 1  # the method's version: a change to any measure below bumps it, and every photo is measured again
W = 960  # every photo is measured at this long side (its -m file, resampled when smaller): values are comparable
SUF = '-m'
# The game photo files of each subject: the one place a subject is named here (rule S1). A record with r (remote, not
# downloaded yet) has no file on R2 and waits.
GAME = (('coral', 'data.json'), ('fish', 'fish-game.json'), ('seaslug', 'seaslug-game.json'))
WORKERS, RATE, FLUSH = 4, 8.0, 500
SAT_S, SAT_V = 0.25, 0.2  # a "saturated" pixel: HSV saturation and value at least these
WARM = (330.0, 70.0)  # warm hues, red to yellow, in degrees (wrapping through 0)
MIN_SAT = 0.01  # under this share of saturated pixels the warm share is left out (no colour to read)
UA = {'User-Agent': 'coral-id-imr/1.0'}  # R2's public address refuses Python's default user agent
KEYS = ('c', 'sp', 'l', 'sa', 'ss', 'wa', 'sh', 'pk')


# ---------- the measures (pure: an RGB array in [0, 1]) ----------

def lum(a):
    """sRGB luminance on the gamma-encoded values (Rec. 709 weights), as the eye and CSS filters read them."""
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def hsv(a):
    """(hue in degrees, saturation, value) of each pixel."""
    import numpy as np
    mx, mn = a.max(axis=2), a.min(axis=2)
    d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0.0)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    dd = np.maximum(d, 1e-6)
    h = np.where(mx == r, ((g - b) / dd) % 6, np.where(mx == g, (b - r) / dd + 2, (r - g) / dd + 4)) * 60.0
    return np.where(d > 0, h, 0.0), s, mx


def laplacian(y):
    return -4 * y[1:-1, 1:-1] + y[:-2, 1:-1] + y[2:, 1:-1] + y[1:-1, :-2] + y[1:-1, 2:]


def peak(y, lap, n=8):
    """The sharpest part, independent of contrast: the 85th percentile over an n x n grid of each tile's Laplacian
    variance over its luminance variance (tools/photo_metrics.py peak), tiles with some contrast only."""
    import numpy as np
    H, Wd = lap.shape
    t = []
    for i in range(n):
        for j in range(n):
            L = lap[i * H // n:(i + 1) * H // n, j * Wd // n:(j + 1) * Wd // n]
            G = y[1 + i * H // n:1 + (i + 1) * H // n, 1 + j * Wd // n:1 + (j + 1) * Wd // n]
            if L.size > 4 and G.std() > .03:
                t.append(L.var() / (G.var() + 1e-4))
    return float(np.percentile(t, 85)) if t else 0.0


def block(a):
    """The measured values of an RGB array a (H x W x 3, floats in [0, 1]); see docs/spec/data.md "measured.json"."""
    import numpy as np
    y = lum(a)
    p2, p98 = np.percentile(y, [2, 98])
    h, s, v = hsv(a)
    sat = (s >= SAT_S) & (v >= SAT_V)
    ns = int(sat.sum())
    lap = laplacian(y)
    out = {'c': round(float(y.std()), 3), 'sp': round(float(p98 - p2), 3), 'l': round(float(y.mean()), 3),
           'sa': round(float(s.mean()), 3), 'ss': round(ns / y.size, 3)}
    if ns >= MIN_SAT * y.size:
        hw = h[sat]
        out['wa'] = round(float(((hw >= WARM[0]) | (hw < WARM[1])).mean()), 3)
    out['sh'] = round(float(lap.var()) * 1e4, 1) if lap.size else 0.0
    out['pk'] = round(peak(y, lap, 8 if min(y.shape) >= 160 else 4), 3)
    return out


def box_in(bb, rec):
    """The fish's box bb ([l, t, r, b], fractions of the original) in the measured file's frame: the file is cut by
    Pierre's crop (cr) first; None when the photo is turned (ro), or the box falls (mostly) outside the crop."""
    if not bb or rec.get('ro'):
        return None
    f = rec.get('cr') or [0, 0, 1, 1]
    fw, fh = f[2] - f[0], f[3] - f[1]
    if fw <= 0 or fh <= 0:
        return None
    m = [(bb[0] - f[0]) / fw, (bb[1] - f[1]) / fh, (bb[2] - f[0]) / fw, (bb[3] - f[1]) / fh]
    c = [max(0.0, m[0]), max(0.0, m[1]), min(1.0, m[2]), min(1.0, m[3])]
    if c[2] - c[0] < 0.02 or c[3] - c[1] < 0.02:
        return None
    if (c[2] - c[0]) * (c[3] - c[1]) < 0.7 * (m[2] - m[0]) * (m[3] - m[1]):
        return None  # the crop cuts more than 30% of the box: not the fish alone any more
    return c


def measure(im, bb=None):
    """The block of a PIL image: resampled to W on its long side, then the whole frame; b, the box's part, when given."""
    import numpy as np
    from PIL import Image, ImageOps
    im = ImageOps.exif_transpose(im).convert('RGB')
    px = max(im.size)
    if px != W:
        k = W / px
        im = im.resize((max(1, round(im.size[0] * k)), max(1, round(im.size[1] * k))), Image.BICUBIC)
    a = np.asarray(im, dtype=np.float32) / 255
    out = block(a)
    out['px'] = px
    if bb:
        H, Wd = a.shape[:2]
        x0, y0 = int(bb[0] * Wd), int(bb[1] * H)
        x1, y1 = max(int(math.ceil(bb[2] * Wd)), x0 + 3), max(int(math.ceil(bb[3] * H)), y0 + 3)
        out['b'] = block(a[y0:y1, x0:x1])
    return out


# ---------- the photos ----------

def tag(rec):
    """What decides the pixels and the box measured: the crop, the rewrite count, the rotation, the box. '' for none."""
    t = [rec.get(k) for k in ('cr', 'iv', 'ro', 'bb')]
    if not any(t):
        return ''
    return hashlib.sha1(json.dumps(t, separators=(',', ':')).encode()).hexdigest()[:6]


def game_photos(root=ROOT, subjects=None):
    """{f: (subject, record)} of every downloaded game photo of the subjects' game files (GAME)."""
    out = {}
    for subj, fn in GAME:
        if subjects and subj not in subjects:
            continue
        p = os.path.join(root, fn)
        if not os.path.exists(p):
            continue
        d = json.load(open(p, encoding='utf-8'))
        d = fish_short.full_doc(d) if fn == 'fish-game.json' else d

        def walk(o):
            if isinstance(o, list):
                for x in o: walk(x)
            elif isinstance(o, dict):
                if isinstance(o.get('f'), str) and not o.get('r') and 'use' not in o:
                    out.setdefault(o['f'], (subj, o))
                for v in o.values():
                    if isinstance(v, (dict, list)): walk(v)
        walk(d.get('photos', d) if fn != 'data.json' else d)
    return out


def load(path=OUT):
    try:
        d = json.load(open(path, encoding='utf-8'))
    except FileNotFoundError:
        return {}
    return d.get('ms', {}) if d.get('mv') == MV else {}  # another method: measure everything again


def dump(ms, path=OUT):
    """One photo per line, sorted: two runs on different photos merge cleanly."""
    head = {'v': 1, 'mv': MV, 'w': W, 'size': SUF,
            'about': 'Measured photo values (tools/photo_measure.py; docs/spec/data.md "measured.json"): c RMS contrast, '
                     'sp 2-98% spread, l mean luminance, sa mean saturation, ss saturated share, wa warm share of the '
                     'saturated pixels, sh Laplacian variance x1e4, pk sharpest part; px the file\'s long side; b the '
                     'same on the fish\'s box; h the crop/box tag. Admin and tools only.'}
    tmp = path + '.part'
    with open(tmp, 'w', encoding='utf-8') as fh:
        fh.write('{' + ','.join(f'{json.dumps(k)}:{json.dumps(v)}' for k, v in head.items()) + ',"ms":{\n')
        fh.write(',\n'.join(json.dumps(f) + ':' + json.dumps(m, separators=(',', ':')) for f, m in sorted(ms.items())))
        fh.write('\n}}\n')
    os.replace(tmp, path)


def todo(photos, ms):
    """The photos to measure: not measured, or measured on other pixels or another box."""
    return [f for f, (_, r) in photos.items() if f not in ms or ms[f].get('h', '') != tag(r)]


def hash_order(fs):
    return sorted(fs, key=lambda f: hashlib.sha1(f.encode()).hexdigest())


class Pace:
    """At most rate calls a second across threads."""
    def __init__(self, rate):
        self.gap, self.next, self.lock = 1.0 / rate, 0.0, threading.Lock()

    def wait(self):
        with self.lock:
            now = time.monotonic()
            t = max(now, self.next)
            self.next = t + self.gap
        if t > now:
            time.sleep(t - now)


def fetch(f, base, src_dir, pace):
    from PIL import Image
    if src_dir:
        return Image.open(os.path.join(src_dir, f + SUF + '.webp'))
    pace.wait()
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(f'{base}img/{f}{SUF}.webp', headers=UA), timeout=60) as r:
                return Image.open(io.BytesIO(r.read()))
        except Exception:
            if i == 2:
                raise
            time.sleep(2 * (i + 1))


def one(f, rec, base, src_dir, pace):
    bb = box_in(rec.get('bb'), rec) if rec.get('bb') else None
    m = measure(fetch(f, base, src_dir, pace), bb)
    t = tag(rec)
    if t:
        m['h'] = t
    return m


def plan(a):
    """(photos, measured so far, the photos to measure in hash order)."""
    photos = game_photos(a.root, a.subject)
    if a.boxed:
        photos = {f: v for f, v in photos.items() if v[1].get('bb')}
    ms = load(a.out)
    fs = todo(photos, ms)
    if a.sample:  # the first N photos of the fixed hash order over every subject, those of them not measured yet
        pick = set(hash_order(game_photos(a.root))[:a.sample])
        fs = [f for f in fs if f in pick]
    if a.only:
        fs = [f for f in a.only.split(',') if f in photos]
    return photos, ms, hash_order(fs)


def run(a):
    photos, ms, fs = plan(a)
    if fs and not a.dir:  # one heavy run at a time on the machine (rule W24): the tool runs again in the slot
        import slot; slot.guard('tools/photo_measure.py')
    print(f'{len(photos)} game photos, {len(fs)} to measure')
    if not fs:
        return 0
    import photos as P
    base = '' if a.dir else P.photo_base()
    pace, t0, done, fail, n = Pace(RATE), time.monotonic(), 0, 0, 0
    stop = t0 + a.minutes * 60
    with ThreadPoolExecutor(WORKERS) as ex:
        for i in range(0, len(fs), FLUSH):
            if time.monotonic() > stop:
                print(f'stopped at the {a.minutes}-minute budget; run again to resume')
                break
            chunk = fs[i:i + FLUSH]

            def job(f):
                try:
                    return f, one(f, photos[f][1], base, a.dir, pace)
                except Exception as e:
                    return f, f'{type(e).__name__}: {e}'
            for f, m in ex.map(job, chunk):
                if isinstance(m, str):
                    fail += 1
                    if fail <= 20: print(f'{f}: {m}')
                else:
                    ms[f] = m
                    done += 1
            dump(ms, a.out)
            n += len(chunk)
            print(f'{n}/{len(fs)} ({done} measured, {fail} failed, {time.monotonic() - t0:.0f} s)')
    print(f'measured.json: {len(ms)} photos ({done} measured now, {fail} failed)')
    return 0


# ---------- --judges: the measures against the judges' tags ----------

def ranks(x):
    o = sorted(range(len(x)), key=lambda i: x[i])
    r = [0.0] * len(x)
    i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and x[o[j + 1]] == x[o[i]]:
            j += 1
        for k in range(i, j + 1):
            r[o[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def spearman(x, y):
    if len(x) < 3:
        return float('nan')
    rx, ry = ranks(x), ranks(y)
    mx, my = sum(rx) / len(rx), sum(ry) / len(ry)
    sxy = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    sx = math.sqrt(sum((a - mx) ** 2 for a in rx))
    sy = math.sqrt(sum((b - my) ** 2 for b in ry))
    return sxy / (sx * sy) if sx and sy else float('nan')


def auc(pos, neg):
    """P(a value of pos > one of neg), ties half: how well the measure separates two judged levels (0.5 = not at all)."""
    if not pos or not neg:
        return float('nan')
    allv = sorted([(v, 1) for v in pos] + [(v, 0) for v in neg])
    r = ranks([v for v, _ in allv])
    rp = sum(rk for rk, (_, p) in zip(r, allv) if p)
    return (rp - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg))


# The judges' tags read as an order, the better level highest (judging/FISH.md, judging/SEASLUG.md: the same seven
# positions); the fish's night livery n is a pattern, not the light, and is left out
ORD = {2: ('light', {'g': 1, 'd': 0}), 3: ('colour loss', {'0': 3, '1': 2, '2': 1, '3': 0}),
       4: ('clarity', {'s': 2, 'm': 1, 'b': 0})}


def judges(a):
    photos, ms = game_photos(a.root, a.subject), load(a.out)
    if a.sample:  # the photos of the run's --sample N (the hash order over every subject), not the --boxed ones
        pick = set(hash_order(game_photos(a.root))[:a.sample])
        ms = {f: m for f, m in ms.items() if f in pick}
    rows = [(photos[f][0], photos[f][1], ms[f]) for f in ms if f in photos and photos[f][1].get('jt')]
    print(f'{len(rows)} measured photos with a judge code (descriptive only: photos of one observation or species are '
          f'not independent; the judges of the first fish pass saw a machine colour hint)')
    pairs = [(2, 'c'), (2, 'sp'), (2, 'l'), (3, 'wa'), (3, 'sa'), (4, 'sh'), (4, 'pk')]
    for where in ('', 'b'):
        R = [(r, m[where] if where else m) for _, r, m in rows if not where or where in m]
        if not R:
            continue
        print(f'\n{"the fish box" if where else "whole frame"} (n {len(R)})')
        for pos, k in pairs:
            name, order = ORD[pos]
            xs = [(order[r['jt'][pos]], m[k]) for r, m in R if len(r['jt']) > pos and r['jt'][pos] in order and k in m]
            if len(xs) < 3:
                continue
            lv, tg = sorted({x for x, _ in xs}), {v: t for t, v in order.items()}
            med = ', '.join(f'{tg[lvl]}: {sorted(v for x, v in xs if x == lvl)[len([1 for x, _ in xs if x == lvl]) // 2]} '
                            f'(n {sum(1 for x, _ in xs if x == lvl)})' for lvl in lv)
            hi, lo = [v for x, v in xs if x == lv[-1]], [v for x, v in xs if x != lv[-1]]
            print(f'  {name:12} vs {k:3} rho {spearman([x for x, _ in xs], [v for _, v in xs]):+.2f}, AUC best level '
                  f'vs rest {auc(hi, lo):.2f}; medians by level {med}')
        es = [(float(r.get('e')), m) for r, m in R if r.get('e')]
        for k in KEYS:
            xs = [(e, m[k]) for e, m in es if k in m]
            if len(xs) >= 3:
                print(f'  ease         vs {k:3} rho {spearman([e for e, _ in xs], [v for _, v in xs]):+.2f} (n {len(xs)})')
    return 0


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--subject', action='append', choices=[s for s, _ in GAME])
    p.add_argument('--sample', type=int, default=0)
    p.add_argument('--only', default='')
    p.add_argument('--minutes', type=float, default=35)
    p.add_argument('--dir', default='')
    p.add_argument('--out', default=OUT)
    p.add_argument('--root', default=ROOT)  # where the game files are read (a test's fixture)
    p.add_argument('--boxed', action='store_true')
    p.add_argument('--judges', action='store_true')
    a = p.parse_args(argv)
    return judges(a) if a.judges else run(a)


if __name__ == '__main__':
    sys.exit(main())
