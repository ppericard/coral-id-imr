"""Bonus genera in the games (Pierre, 2026-11-01): mark the photos of non-Research-Grade iNaturalist observations.

The extra (non-IMR) genera in data.json "x" were imported from Research Grade observations and from observations
with 2+ agreeing genus IDs (tools/build_extra.py). Games use only Research Grade photos (or Pierre's own) for the
bonus genera, so this script asks iNaturalist for the quality grade of each observation and sets gid: 1 on the
photos of observations that are not Research Grade (same flag as tools/fetch_local.py candidates), removing it
from those that became Research Grade since. It also moves the bonus genera's photos that show several corals (MULTI, picked by eye on 2026-11-01) to
x.gen[g].more, as tools/apply_multi.py does for the slate genera: games skip them; Pierre's curation "single" restores one.
Re-runnable: python3 tools/apply_bonus.py
"""
import json, re
import inat  # the one paced, retried iNaturalist client (rule C7): 200 observations a request, about one a second
from datajson import dump  # the one data.json layout (one genus per line)
from genera import lists  # core.js BENTHIC + BONUS, defined once

MULTI = {'isopora-x-606660716', 'heliopora-x-129398835'}
BONUS = [n for L in lists() for n in L]  # core.js BENTHIC + BONUS (Millepora is a slate genus since 2026-11-02, same photo rule)

d = json.load(open('data.json'))
X = d['x']['gen']
photos = [p for g in BONUS for k in ('views', 'more') for L in X[g].get(k, {}).values() for p in L if 'inaturalist.org/observations/' in p.get('o', '')]
oid = lambda p: re.search(r'(\d+)$', p['o']).group(1)
ids, grade = sorted({oid(p) for p in photos}), {}
for B in inat.chunks(ids, 200):
    for o in inat.get('https://api.inaturalist.org/v1/observations?per_page=200&id=' + ','.join(B))['results']:
        grade[str(o['id'])] = o['quality_grade']
n = 0
for p in photos:
    g = grade.get(oid(p))
    if g is None:
        continue  # observation not returned (deleted or hidden): leave as is
    if g == 'research':
        p.pop('gid', None)
    else:
        p['gid'] = 1; n += 1
for g in BONUS:
    G = X[g]; more = G.get('more', {})
    for v, L in G['views'].items():
        more.setdefault(v, []).extend(p for p in L if p['f'] in MULTI)
        G['views'][v] = [p for p in L if p['f'] not in MULTI]
    more = {v: L for v, L in more.items() if L}
    if more: G['more'] = more
    else: G.pop('more', None)
dump(d, 'data.json')
print(f'{len(ids)} observations checked, {n} photos marked gid (not Research Grade)')
