# Run after tools/archive/make_site.py (original build), from the repo root: python3 tools/apply_multi.py
# 1. recrop.txt: crops img/<f>.webp to img/<f>c.webp (+ -m, -s: tools/photos.py) and points data.json at the crop.
# 2. multi.txt: moves multi-coral field photos from gen[g].views to gen[g].more (genus sheets only),
#    and flags multi-coral lecture photos with multi:true (course quiz skips them).
import json, os
from datajson import dump  # the one data.json layout (one genus per line)
from PIL import Image
import photos  # the three photo sizes
rows = lambda fn: [l.split() for l in open('tools/' + fn) if l.strip() and not l.startswith('#')]
d = json.load(open('data.json'))
crop = {r[0]: tuple(map(int, r[1:])) for r in rows('recrop.txt')}
multi = {r[0] for r in rows('multi.txt')}
for f, box in crop.items():
    if not os.path.exists(f'img/{f}c.webp'):
        im = Image.open(f'img/{f}.webp').convert('RGB').crop(box)
        photos.save(im, f + 'c')
for g, G in d['gen'].items():
    more = G.get('more', {})
    for v, L in G['views'].items():
        for p in L:
            if p['f'] in crop: p['f'] += 'c'
        more.setdefault(v, []).extend(p for p in L if p['f'] in multi)
        G['views'][v] = [p for p in L if p['f'] not in multi]
    more = {v: L for v, L in more.items() if L}
    if more: G['more'] = more
    else: G.pop('more', None)
    if G.get('cover') in crop: G['cover'] += 'c'
    assert G.get('cover') not in multi, g
for L in d['course'].values():
    for p in L:
        if p['f'] in multi: p['multi'] = True
dump(d, 'data.json')
