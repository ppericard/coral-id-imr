# Downloads the candidate photos Pierre added in admin.html (curation.json genera[g].add) that are still remote
# (data.json cand entries with r: 1, shown straight from iNaturalist until then), as img/{f}.webp (1600 px),
# img/{f}-m.webp (960 px) and img/{f}-s.webp (480 px) (tools/photos.py), then drops their r flag. Pierre's crop (curation.json "crop" {f: [l, t, r, b]} fractions)
# is applied on the way, from the original; a photo already downloaded is redone when its crop changes (data.json "cr").
# Site photos (not candidates) are recropped from their original the same way when Pierre crops them (Triage, genus page).
# Run from the repo root; the GitHub Action .github/workflows/approved-photos.yml runs it after every curation.json
# publish and commits the result. Option --all-remote-unused deletes the local files of candidates nobody added.
import json, os, sys, urllib.request, urllib.parse, concurrent.futures as cf
from datajson import load_all, dump_all  # data.json + cand.json (candidates waiting live in cand.json)
from PIL import Image
import photos  # the three photo sizes
UA = {'User-Agent': 'coral-id-imr/1.0'}
d = load_all()
cur = json.load(open('curation.json'))
added = {f for g in (cur.get('genera') or {}).values() for f in (g.get('add') or {})}
excl = set(cur.get('exclude') or {})
CROP = cur.get('crop') or {}
todo = [p for L in (d.get('cand') or {}).values() for p in L if p['f'] in added and p['f'] not in excl and p.get('src') and (p.get('r') or p.get('cr') != CROP.get(p['f']))]
# Site photos (genus views and "more") get Pierre's crop too, redone from their original when it changes.
todo += [p for g in [*d['gen'].values(), *((d.get('x') or {}).get('gen') or {}).values()] for L in [*g['views'].values(), *(g.get('more') or {}).values()] for p in L
         if p['f'] not in excl and p.get('src') and p.get('cr') != CROP.get(p['f'])]
# Only iNaturalist photo hosts (code review 2026-11-01, L8): this runs in a GitHub Action that can write to main.
HOSTS = ('inaturalist-open-data.s3.amazonaws.com', 'static.inaturalist.org')
def get(p):
    host = urllib.parse.urlsplit(p['src']).hostname or ''
    if not p['src'].startswith('https://') or host not in HOSTS: raise ValueError(f"{p['f']}: not an iNaturalist photo URL: {p['src'][:80]}")
    im = Image.open(urllib.request.urlopen(urllib.request.Request(p['src'], headers=UA), timeout=120)).convert('RGB')
    c = CROP.get(p['f'])
    if c: W, H = im.size; im = im.crop((round(c[0] * W), round(c[1] * H), round(c[2] * W), round(c[3] * H)))
    photos.save(im, p['f'])
    return p
done = 0
with cf.ThreadPoolExecutor(6) as ex:
    for fut in cf.as_completed([ex.submit(get, p) for p in todo]):
        try:
            p = fut.result(); done += 1
            # A rewrite of a file already on the site (recrop, crop removed) bumps iv: the app puts it in the photo URL.
            if not p.pop('r', None): p['iv'] = p.get('iv', 0) + 1
            if CROP.get(p['f']): p['cr'] = CROP[p['f']]
            else: p.pop('cr', None)
        except Exception as e: print('failed:', e)
gone = 0
if '--all-remote-unused' in sys.argv:
    for L in (d.get('cand') or {}).values():
        for p in L:
            if p['f'] in added or p.get('r') or not p.get('src'): continue
            photos.remove(p['f'])
            p['r'] = 1; gone += 1
if done or gone: dump_all(d)
print(f'downloaded {done}, made remote {gone}')
