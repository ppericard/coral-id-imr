"""Store each photo's shape (width / height, 2 decimals) as `ar` in data.json.

The quiz lays out its views before the photos load (nothing may move while a photo loads), so it needs their shape
up front to pick side by side or stacked (designer re-review 2026-11-01). Re-runnable: photos without a local file are
skipped and keep no `ar` (the app then assumes 4:3). Run after adding photos: python3 tools/apply_ratios.py
"""
import json, os
from datajson import dump  # the one data.json layout (one genus per line)
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'data.json')
d = json.load(open(P, encoding='utf-8'))
cache, n = {}, [0, 0]

def ratio(f):
    if f not in cache:
        cache[f] = None
        for name in (f + '-s.webp', f + '.webp'):
            p = os.path.join(ROOT, 'img', name)
            if os.path.exists(p):
                w, h = Image.open(p).size
                cache[f] = round(w / h, 2)
                break
    return cache[f]

def walk(x):
    if isinstance(x, dict):
        if isinstance(x.get('f'), str):
            r = ratio(x['f'])
            if r:
                n[0] += x.get('ar') != r
                x['ar'] = r
            else:
                n[1] += 1
        for v in x.values():
            walk(v)
    elif isinstance(x, list):
        for v in x:
            walk(v)

walk(d)
dump(d, P)
print(f'{n[0]} photos updated, {n[1]} without a local file')
