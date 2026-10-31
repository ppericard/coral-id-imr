# Applies tools/covers.txt to data.json: sets gen[g].cover, checking the photo is one of the genus's view photos.
import json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(f'{R}/data.json'))
for l in open(f'{R}/tools/covers.txt'):
    l = l.split('#')[0].split()
    if not l: continue
    g, f = l
    assert any(p['f'] == f for v in d['gen'][g]['views'].values() for p in v), (g, f)
    d['gen'][g]['cover'] = f
json.dump(d, open(f'{R}/data.json', 'w'), ensure_ascii=False, separators=(',', ':'))
