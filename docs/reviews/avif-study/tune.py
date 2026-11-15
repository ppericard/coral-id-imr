# libaom's still-image tuning (tune=iq) at 480 and 240 px on every other field photo: the same grid as measure.py.
import sys, os, io, json
WT, DATA = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(WT, 'tools'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import photos
from PIL import Image
from measure import s2, ssim, FINE
R = {json.loads(l)['f']: json.loads(l) for l in open(os.path.join(DATA, 'results.jsonl'))}
S = [x for x in json.load(open(os.path.join(DATA, 'sample.json'))) if x['group'] != 'coral-lecture' and x['f'] in R][::2]
out = open(os.path.join(DATA, 'tune.jsonl'), 'w')
for x in S:
    base = photos.turn(Image.open(os.path.join(DATA, 'src', x['f'] + '.bin')).convert('RGB'), x.get('cr'), x.get('ro'))
    for w, suf in ((480, '-s'), (240, '-t')):
        ref = base.copy(); ref.thumbnail((w, w))
        row = {'f': x['f'], 'size': suf, 'iq': {}}
        for q in FINE:
            b = io.BytesIO(); ref.save(b, 'AVIF', quality=q, speed=6, max_threads=1, advanced={'tune': 'iq'})
            d = Image.open(io.BytesIO(b.getvalue())).convert('RGB')
            row['iq'][q] = {'bytes': len(b.getvalue()), 's2': s2(ref, d), 'ssim': ssim(ref, d)}
        out.write(json.dumps(row) + '\n'); out.flush()
print('done', len(S))
