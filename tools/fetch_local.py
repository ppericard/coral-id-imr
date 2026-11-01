# Fetches candidate photos (iNaturalist, open licence) that the site doesn't use yet: taken near Dauin (40 km), plus
# elsewhere in the Philippines for genera with few Dauin photos. Accepted IDs: Research Grade, or a genus-level community
# ID (Needs ID, at least 2 identifications agreeing on the genus or below: iNat needs 2+ IDs for a community taxon).
# Caps (Pierre, 2026-10-31, so the pile to sort stays small): at most DAUIN_CAP Dauin candidates waiting per genus,
# Philippines ones only while the genus has fewer than POOR Dauin photos, at most PH_CAP waiting; 2 photos per observation.
# Only waiting candidates count, so a re-run (GitHub Action after each publish) refills what Pierre sorted. Lists them in data.json "cand".
# The app ignores "cand"; Pierre approves candidates in admin.html. Run from the repo root.
# New candidates are NOT downloaded (r: 1 = shown straight from iNaturalist, from src): only the ones Pierre adds are,
# by tools/fetch_approved.py (GitHub Action on each curation.json publish), so the repo never stores rejected photos.
import json, re, sys, time, urllib.request
from datajson import dump  # the one data.json layout (one genus per line)
from collections import Counter
from excluded import excluded, drop_excluded
UA = {'User-Agent': 'coral-id-imr/1.0'}
LIC = 'cc-by,cc-by-nc,cc0,cc-by-sa,cc-by-nc-sa'
SCLERACTINIA = 47532  # iNaturalist taxon for stony corals; guards against homonym genera (e.g. Astrea snails)
DAUIN = 'lat=9.19&lng=123.26&radius=40'
DAUIN_CAP, PH_CAP, PER_OBS = 15, 6, 2
PHILIPPINES = 'place_id=6873'
POOR = 15  # fewer Dauin photos (site + candidates) than this: also fetch Philippines candidates
get = lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60))
d = json.load(open('data.json'))
# The Coral Finder's extra genera (data.json x, tools/build_extra.py) get candidates too; the three that are not
# stony corals (fire, blue, organ pipe coral) are matched as animals instead of under Scleractinia.
GEN = {**d['gen'], **((d.get('x') or {}).get('gen') or {})}
NONSCL = {n for n, g in GEN.items() if (g.get('x') or {}).get('nonscl')}
ONLY = set(sys.argv[1:])
used = {p.get('o') for g in GEN.values() for L in [*g['views'].values(), *(g.get('more') or {}).values()] for p in L}
usedp = {re.sub(r'\D', '', p['f'].split('-')[-1]) for g in GEN.values() for L in [*g['views'].values(), *(g.get('more') or {}).values()] for p in L}
cand = d.get("cand") or {}
usedp |= {p['f'].split('-')[-1] for L in cand.values() for p in L}
# Needs ID observation whose community taxon is this genus or below it, with most identifications agreeing.
def genus_ok(o, tid):
    t = o.get('taxon') or {}
    return bool(o.get('community_taxon_id')) and o.get('identifications_most_agree') and o['community_taxon_id'] == t.get('id') and (t.get('id') == tid or tid in (t.get('ancestor_ids') or []))
# Pierre's decisions on candidates (curation.json): added, rejected (seen 'cand:f'), sent to another genus, excluded.
CUR = json.load(open('curation.json'))
ADDED = {f for k in (CUR.get('genera') or {}).values() for f in (k.get('add') or {})}
GONE = {f for k in (CUR.get('genera') or {}).values() for f in (k.get('out') or {})} | {k[5:] for k in (CUR.get('seen') or {}) if k.startswith('cand:')}
# Candidates still waiting for Pierre: the caps count only these, so each run refills what he has sorted.
waiting = lambda p: p['f'] not in ADDED and p['f'] not in GONE and not excluded(p['f'])
def dauin_n(g):
    x = GEN[g]
    return sum(p.get('loc') == 'dauin' or p.get('own') for L in x['views'].values() for p in L) + sum(p.get('loc') == 'dauin' and p['f'] not in GONE and not excluded(p['f']) for p in cand.get(g, []))
for g in GEN:
    if ONLY and g not in ONLY: continue
    T = [t for t in get(f'https://api.inaturalist.org/v1/taxa?q={g}&rank=genus&per_page=10')['results'] if t['name'] == g and (SCLERACTINIA in t.get('ancestor_ids', []) or (g in NONSCL and t.get('iconic_taxon_name') == 'Animalia'))]
    if not T: print('no taxon', g); continue
    for where in (DAUIN, PHILIPPINES):
        if where == PHILIPPINES and dauin_n(g) >= POOR: continue
        loc = 'dauin' if where == DAUIN else 'ph'
        out = cand.setdefault(g, []); cap = len(out) + (DAUIN_CAP if loc == 'dauin' else PH_CAP) - sum(p.get('loc') == loc and waiting(p) for p in out)
        if cap <= len(out): continue
        obs = get(f'https://api.inaturalist.org/v1/observations?taxon_id={T[0]["id"]}&{where}&quality_grade=research,needs_id&photos=true&photo_license={LIC}&order_by=votes&per_page=200')['results']
        # Research Grade first, then genus-level community IDs (votes order within each).
        obs = [o for o in obs if o['quality_grade'] == 'research'] + [o for o in obs if o['quality_grade'] == 'needs_id' and genus_ok(o, T[0]['id'])]
        # Shortlist that varies (Pierre): pick one by one the photo whose species, observation, observer and zoom
        # (an observation's first photo is usually the colony, its last a close-up) are least represented so far.
        pool = []
        for rank, o in enumerate(obs):
            P = [ph for ph in o['photos'] if ph.get('license_code') and str(ph['id']) not in usedp and not excluded(photo_id=ph['id'])]
            for slot, ph in enumerate(([P[0], P[-1]] if len(P) > 1 else P)[:PER_OBS]): pool.append((o, ph, slot, rank))
        n = Counter()
        for p in out: n['t', p.get('t')] += 1; n['o', p.get('o')] += 1
        while pool and len(out) < cap:
            o, ph, slot, rank = min(pool, key=lambda x: (n['o', f'https://www.inaturalist.org/observations/{x[0]["id"]}'], n['t', x[0]['taxon']['name']], n['u', x[0]['user']['login']], n['s', x[2]], x[3]))
            pool = [x for x in pool if x[1]['id'] != ph['id']]
            url = f'https://www.inaturalist.org/observations/{o["id"]}'
            n['o', url] += 1; n['t', o['taxon']['name']] += 1; n['u', o['user']['login']] += 1; n['s', slot] += 1
            usedp.add(str(ph['id']))
            f = f'{g.lower()}-cand-{ph["id"]}'
            out.append(dict(f=f, a=ph['attribution'], lic=ph['license_code'], o=url, t=o['taxon']['name'], own=o['user']['login'] == 'ppericard', loc=loc, src=ph['url'].replace('square', 'original'), r=1, **({} if o['quality_grade'] == 'research' else {'gid': 1})))
        time.sleep(0.5)
    if not cand[g]: del cand[g]
    print(g, len(cand.get(g, [])))
d['cand'] = cand
drop_excluded(d)
dump(d, 'data.json')
print('total', sum(map(len, cand.values())))
