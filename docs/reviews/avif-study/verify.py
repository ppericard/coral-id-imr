# Does the rebuild from the original reproduce today's R2 files? Re-encode each size at today's settings and compare.
import sys, os, json, io
WT, DATA = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(WT, 'tools'))
import photos, fish_game
from PIL import Image
S = json.load(open(os.path.join(DATA, 'sample.json')))
same = diff = 0
rows = []
for x in S:
    sp = os.path.join(DATA, 'src', x['f'] + '.bin')
    if not os.path.exists(sp):
        continue
    im = Image.open(sp).convert('RGB')
    t = photos.turn(im, x.get('cr'), x.get('ro'))
    out = {'f': x['f'], 'orig': im.size}
    for w, q, suf in photos.SIZES:
        a = t.copy(); a.thumbnail((w, w))
        b = io.BytesIO(); a.save(b, 'WEBP', quality=q, method=5)
        r2 = open(os.path.join(DATA, 'r2', x['f'] + suf + '.webp'), 'rb').read()
        ok = b.getvalue() == r2
        same += ok; diff += not ok
        out[suf or '1600'] = 'same' if ok else f'{len(b.getvalue())} vs {len(r2)} {a.size} vs {Image.open(io.BytesIO(r2)).size}'
    if x.get('xc'):
        tt = photos.square(im, x['xc'], x.get('cr') or [0, 0, 1, 1], x.get('ro'), fish_game.TILE, fish_game.FEATHER)
        b = io.BytesIO(); tt.save(b, 'WEBP', quality=fish_game.TILE_Q, method=5)
        r2 = open(os.path.join(DATA, 'r2', x['f'] + '-x.webp'), 'rb').read()
        ok = b.getvalue() == r2
        same += ok; diff += not ok
        out['-x'] = 'same' if ok else f'{len(b.getvalue())} vs {len(r2)}'
    rows.append(out)
for r in rows:
    if any(v != 'same' for k, v in r.items() if k not in ('f', 'orig')):
        print(r)
print('files identical', same, 'different', diff, 'photos', len(rows))
