# Fetches candidate photos (iNaturalist, research grade, open licence) that the site doesn't use yet:
# taken near Dauin (40 km), plus elsewhere in the Philippines for genera with few Dauin photos. Writes them to img/ and lists them in data.json "cand" (genus -> photos).
# The app ignores "cand"; Pierre approves candidates in admin.html. Run from the repo root.
import json, os, re, time, urllib.request, concurrent.futures as cf
from PIL import Image
from excluded import excluded, drop_excluded
UA = {'User-Agent': 'coral-id-imr/1.0'}
LIC = 'cc-by,cc-by-nc,cc0,cc-by-sa,cc-by-nc-sa'
SCLERACTINIA = 47532  # iNaturalist taxon for stony corals; guards against homonym genera (e.g. Astrea snails)
DAUIN = 'lat=9.19&lng=123.26&radius=40'
PER_GENUS = 12
PHILIPPINES = 'place_id=6873'
POOR = 9  # fewer Dauin photos (site + candidates) than this: also fetch Philippines candidates
get = lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60))
d = json.load(open('data.json'))
used = {p.get('o') for g in d['gen'].values() for L in [*g['views'].values(), *(g.get('more') or {}).values()] for p in L}
usedp = {re.sub(r'\D', '', p['f'].split('-')[-1]) for g in d['gen'].values() for L in [*g['views'].values(), *(g.get('more') or {}).values()] for p in L}
cand, jobs = d.get('cand') or {}, []
usedp |= {p['f'].split('-')[-1] for L in cand.values() for p in L}
def dauin_n(g):
    x = d['gen'][g]
    return sum(p.get('loc') == 'dauin' or p.get('own') for L in x['views'].values() for p in L) + len(cand.get(g, []))
for g in d['gen']:
    T = [t for t in get(f'https://api.inaturalist.org/v1/taxa?q={g}&rank=genus&per_page=10')['results'] if t['name'] == g and SCLERACTINIA in t.get('ancestor_ids', [])]
    if not T: print('no taxon', g); continue
    for where in (DAUIN, PHILIPPINES):
        if where == PHILIPPINES and dauin_n(g) >= POOR: continue
        obs = get(f'https://api.inaturalist.org/v1/observations?taxon_id={T[0]["id"]}&{where}&quality_grade=research&photos=true&photo_license={LIC}&order_by=votes&per_page=50')['results']
        out = cand.setdefault(g, []); cap = len(out) + PER_GENUS
        for o in obs:
            url = f'https://www.inaturalist.org/observations/{o["id"]}'
            for ph in o['photos']:
                if len(out) >= cap: break
                if str(ph['id']) in usedp or not ph.get('license_code') or excluded(photo_id=ph['id']): continue
                usedp.add(str(ph['id']))
                f = f'{g.lower()}-cand-{ph["id"]}'
                out.append(dict(f=f, a=ph['attribution'], lic=ph['license_code'], o=url, t=o['taxon']['name'], own=o['user']['login'] == 'ppericard', loc='dauin' if where == DAUIN else 'ph', src=ph['url'].replace('square', 'original')))
                jobs.append((out[-1]['src'], f))
        time.sleep(0.5)
    if not cand[g]: del cand[g]
    print(g, len(cand.get(g, [])))
def do(j):
    u, f = j
    if os.path.exists(f'img/{f}.webp'): return
    im = Image.open(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=120)).convert('RGB')
    for w, q, suf in ((1600, 78, ''), (480, 72, '-s')):
        t = im.copy(); t.thumbnail((w, w)); t.save(f'img/{f}{suf}.webp', 'WEBP', quality=q, method=5)
with cf.ThreadPoolExecutor(8) as ex: list(ex.map(do, jobs))
d['cand'] = cand
drop_excluded(d)
json.dump(d, open('data.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('total', sum(map(len, cand.values())))
