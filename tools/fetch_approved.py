# Downloads the candidate photos Pierre added in admin.html (curation.json genera[g].add) that are still remote
# (data.json cand entries with r: 1, shown straight from iNaturalist until then), as img/{f}.webp (1600 px) and
# img/{f}-s.webp (480 px), then drops their r flag. Run from the repo root; the GitHub Action
# .github/workflows/approved-photos.yml runs it after every curation.json publish and commits the result.
# Option --all-remote-unused deletes the local files of candidates nobody added (they become remote again).
import json, os, sys, urllib.request, concurrent.futures as cf
from PIL import Image
UA = {'User-Agent': 'coral-id-imr/1.0'}
d = json.load(open('data.json'))
cur = json.load(open('curation.json'))
added = {f for g in (cur.get('genera') or {}).values() for f in (g.get('add') or {})}
excl = set(cur.get('exclude') or {})
todo = [p for L in (d.get('cand') or {}).values() for p in L if p.get('r') and p['f'] in added and p['f'] not in excl]
def get(p):
    im = Image.open(urllib.request.urlopen(urllib.request.Request(p['src'], headers=UA), timeout=120)).convert('RGB')
    for w, q, suf in ((1600, 78, ''), (480, 72, '-s')):
        t = im.copy(); t.thumbnail((w, w)); t.save(f"img/{p['f']}{suf}.webp", 'WEBP', quality=q, method=5)
    return p
done = 0
with cf.ThreadPoolExecutor(6) as ex:
    for fut in cf.as_completed([ex.submit(get, p) for p in todo]):
        try: fut.result().pop('r'); done += 1
        except Exception as e: print('failed:', e)
gone = 0
if '--all-remote-unused' in sys.argv:
    for L in (d.get('cand') or {}).values():
        for p in L:
            if p['f'] in added or p.get('r') or not p.get('src'): continue
            for suf in ('', '-s'):
                if os.path.exists(f"img/{p['f']}{suf}.webp"): os.remove(f"img/{p['f']}{suf}.webp")
            p['r'] = 1; gone += 1
if done or gone: json.dump(d, open('data.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'downloaded {done}, made remote {gone}')
