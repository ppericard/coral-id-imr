# Tags every iNaturalist photo in data.json with where it was taken: loc = dauin (within 40 km of Dauin),
# ph (elsewhere in the Philippines) or world. Pierre's own photos are all from Dauin. IMR lecture photos
# (course) are left untagged and shown in every mode. Run after the build scripts.
import json, math, urllib.request
d = json.load(open('data.json'))
P = [p for g in d['gen'].values() for L in [*g['views'].values(), *(g.get('more') or {}).values()] for p in L]
P += [p for L in (d.get('cand') or {}).values() for p in L]
ids = sorted({p['o'].rsplit('/', 1)[1] for p in P if not p.get('own') and p.get('o')})
where = {}
for i in range(0, len(ids), 100):
    r = json.load(urllib.request.urlopen(urllib.request.Request('https://api.inaturalist.org/v1/observations?per_page=100&id=' + ','.join(ids[i:i + 100]), headers={'User-Agent': 'coral-id-imr/1.0'}), timeout=60))
    where.update({str(o['id']): o.get('location') for o in r['results']})
def loc(p):
    if p.get('own'): return 'dauin'
    l = where.get(p['o'].rsplit('/', 1)[1])
    if not l: return 'world'
    la, lo = map(float, l.split(','))
    if math.hypot((la - 9.19) * 111, (lo - 123.26) * 109.6) <= 40: return 'dauin'
    return 'ph' if 4.5 <= la <= 21.5 and 116 <= lo <= 127 else 'world'
for p in P: p['loc'] = loc(p)
json.dump(d, open('data.json', 'w'), ensure_ascii=False, separators=(',', ':'))
from collections import Counter; print(Counter(p['loc'] for p in P))
