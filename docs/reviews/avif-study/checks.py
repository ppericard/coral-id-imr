# Checks asked in review: monotonic scores, the 240 px metric (a 240 px crop of 480 px), and the 30 non-identical files.
import sys, os, io, json
WT, DATA = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(WT, 'tools'))
import photos
from PIL import Image
from ssimulacra2 import compute_ssimulacra2 as _s2
R = [json.loads(l) for l in open(os.path.join(DATA, 'results.jsonl'))]
S = {x['f']: x for x in json.load(open(os.path.join(DATA, 'sample.json')))}
steps = bad = 0
for r in R:
    for s, row in r['sizes'].items():
        pts = sorted(((int(q), v['s2']) for q, v in row['avif'].items()))
        for (q0, a), (q1, b) in zip(pts, pts[1:]):
            steps += 1; bad += b < a
print('monotonic: non-increasing steps', bad, 'of', steps)


def png(a):
    b = io.BytesIO(); a.save(b, 'PNG'); b.seek(0); return b


def s2(a, b): return _s2(png(a), png(b))


# 240 px crops of the 480 px reference and its WebP, against the 240 px file's own score.
xs = [r for r in R if r['group'] != 'coral-lecture'][::4]
out = []
for r in xs:
    x = S[r['f']]
    base = photos.turn(Image.open(os.path.join(DATA, 'src', x['f'] + '.bin')).convert('RGB'), x.get('cr'), x.get('ro'))
    ref = base.copy(); ref.thumbnail((480, 480))
    b = io.BytesIO(); ref.save(b, 'WEBP', quality=72, method=5); d = Image.open(io.BytesIO(b.getvalue())).convert('RGB')
    w, h = ref.size; box = ((w - 240) // 2, (h - min(h, 240)) // 2, (w - 240) // 2 + 240, (h - min(h, 240)) // 2 + min(h, 240))
    out.append((round(s2(ref.crop(box), d.crop(box)), 1), r['sizes']['-s']['webp']['s2'], r['sizes']['-t']['webp']['s2']))
import statistics as st
print('480 crop to 240: median', st.median(o[0] for o in out), '| whole 480', st.median(o[1] for o in out), '| 240 file', st.median(o[2] for o in out), 'n', len(out))
# The 26 coral -m/-t files: made from the R2 1600 px file?
same = tot = 0
for r in R:
    x = S[r['f']]
    if r['group'] != 'coral-field': continue
    for suf, w, q in (('-m', 960, 72), ('-t', 240, 70)):
        if r['sizes'][suf]['webp']['same_as_r2']: continue
        im = Image.open(os.path.join(DATA, 'r2', x['f'] + '.webp')).convert('RGB'); im.thumbnail((w, w))
        b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=5)
        tot += 1; same += b.getvalue() == open(os.path.join(DATA, 'r2', x['f'] + suf + '.webp'), 'rb').read()
print('non-identical coral -m/-t files rebuilt from the R2 1600 px file:', same, 'identical of', tot)
print('non-identical by group/size:', [(r['f'], s) for r in R if r['group'] != 'coral-lecture' for s, row in r['sizes'].items() if not row['webp']['same_as_r2']][:40])
