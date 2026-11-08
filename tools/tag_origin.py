# Tags every iNaturalist photo in data.json with where it was taken: loc = dauin (within 40 km of Dauin),
# ph (elsewhere in the Philippines) or world. Pierre's own photos are all from Dauin. IMR lecture photos
# (course) are left untagged and shown in every mode. Run after the build scripts.
# iNaturalist through tools/inat.py (rule C7): 200 observations a request (iNaturalist's most), about one a second.
import math
import inat
from datajson import load_all, dump_all  # data.json + cand.json (candidates waiting live in cand.json)
d = load_all()
P = [p for g in d['gen'].values() for L in [*g['views'].values(), *(g.get('more') or {}).values()] for p in L]
P += [p for L in (d.get('cand') or {}).values() for p in L]
ids = sorted({p['o'].rsplit('/', 1)[1] for p in P if not p.get('own') and p.get('o')})
where = {}
for B in inat.chunks(ids, 200):
    r = inat.get('https://api.inaturalist.org/v1/observations?per_page=200&id=' + ','.join(B))
    where.update({str(o['id']): o.get('location') for o in r['results']})
def loc(p):
    if p.get('own'): return 'dauin'
    l = where.get(p['o'].rsplit('/', 1)[1])
    if not l: return 'world'
    la, lo = map(float, l.split(','))
    if math.hypot((la - 9.19) * 111, (lo - 123.26) * 109.6) <= 40: return 'dauin'
    return 'ph' if 4.5 <= la <= 21.5 and 116 <= lo <= 127 else 'world'
for p in P: p['loc'] = loc(p)
dump_all(d)
from collections import Counter; print(Counter(p['loc'] for p in P))
