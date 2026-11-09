# Downloads the candidate photos Pierre added in admin.html (curation.json genera[g].add) that are still remote
# (data.json cand entries with r: 1, shown straight from iNaturalist until then), in their four sizes (tools/photos.py:
# {f}.webp 1600 px, {f}-m.webp 960 px, {f}-s.webp 480 px, {f}-t.webp 240 px), then drops their r flag and stores their
# shape (ar, as tools/apply_ratios.py). Pierre's crop (curation.json "crop" {f: [l, t, r, b]} fractions) and rotation
# ("rot" {f: 90 | 180 | 270} degrees clockwise) are applied on the way, from the original, the crop first then the turn
# (tools/photos.py turn); a photo already downloaded is redone when either changes (data.json "cr", "ro").
# Site photos (not candidates) are redone from their original the same way when Pierre crops or turns them (genus page).
# Every photo it downloads has an online original (src), so it lives on Cloudflare R2 only (Photos out of the repo,
# Pierre's rule of 2026-11-05): the files are written to --out DIR (default r2-upload/, gitignored), never to img/, and
# the workflow uploads that folder to R2 (tools/r2_sync.sh DIR) before it commits data.json, so data.json never names a
# photo R2 lacks. Run from the repo root; the GitHub Action .github/workflows/approved-photos.yml runs it after every
# curation.json publish (with --games, below). Option --all-remote-unused makes the candidates nobody added remote again
# (r: 1; their files stay on R2, unused: nothing is deleted from the bucket).
import json, os, sys, urllib.request, urllib.parse, concurrent.futures as cf
from datajson import load_all, dump_all  # data.json + cand.json (candidates waiting live in cand.json)
from PIL import Image
import photos  # the four photo sizes
import slot
slot.guard('tools/fetch_approved.py')  # one heavy run at a time on the machine (rule W24)
from genera import game_genera  # the game genera, as core.js gameOf
UA = {'User-Agent': 'coral-id-imr/1.0'}
d = load_all()
cur = json.load(open('curation.json'))
added = {f for g in (cur.get('genera') or {}).values() for f in (g.get('add') or {})}
excl = set(cur.get('exclude') or {})
CROP = cur.get('crop') or {}
ROT = cur.get('rot') or {}
redo = lambda p: photos.stale(p, CROP.get(p['f']), ROT.get(p['f']))
todo = [p for L in (d.get('cand') or {}).values() for p in L if p['f'] in added and p['f'] not in excl and p.get('src') and (p.get('r') or redo(p))]
# Site photos (genus views and "more") get Pierre's crop and rotation too, redone from their original when one changes.
todo += [p for g in [*d['gen'].values(), *((d.get('x') or {}).get('gen') or {}).values()] for L in [*g['views'].values(), *(g.get('more') or {}).values()] for p in L
         if p['f'] not in excl and p.get('src') and redo(p)]
# The genera off the IMR list that the games use (Millepora and the bonus genera: core.js BENTHIC + BONUS, read through
# tools/genera.py, rule L6) were imported as remote photos (r: 1, tools/build_extra.py), shown straight from iNaturalist.
# --games downloads them like the others, so they are mirrored to R2 too (Photos out of the repo, step 2, 2026-11-03);
# their credit fields stay as they are. The other extra Dauin genera of data.json "x" (Coral ID Key only) stay remote.
GAMES = [g for g in game_genera(d) if g in ((d.get('x') or {}).get('gen') or {})]
if '--games' in sys.argv:
    seen = {id(p) for p in todo}
    todo += [p for g in GAMES for L in [*d['x']['gen'][g]['views'].values(), *(d['x']['gen'][g].get('more') or {}).values()] for p in L
             if p.get('r') and p['f'] not in excl and p.get('src') and id(p) not in seen]
# Only iNaturalist photo hosts (code review 2026-11-01, L8): this runs in a GitHub Action that can write to main.
HOSTS = ('inaturalist-open-data.s3.amazonaws.com', 'static.inaturalist.org')
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else 'r2-upload'
os.makedirs(OUT, exist_ok=True)
def get(p):
    host = urllib.parse.urlsplit(p['src']).hostname or ''
    if not p['src'].startswith('https://') or host not in HOSTS: raise ValueError(f"{p['f']}: not an iNaturalist photo URL: {p['src'][:80]}")
    im = Image.open(urllib.request.urlopen(urllib.request.Request(p['src'], headers=UA), timeout=120)).convert('RGB')
    # The shape from the 480 px file, as tools/apply_ratios.py measures it (it only sees the files in img/).
    p['ar'] = photos.write(im, p['f'], OUT, CROP.get(p['f']), ROT.get(p['f']))
    return p
done = 0
with cf.ThreadPoolExecutor(6) as ex:
    for fut in cf.as_completed([ex.submit(get, p) for p in todo]):
        try:
            p = fut.result(); done += 1
            # A rewrite of a file already on the site (recrop, crop removed, turned) bumps iv: the app puts it in the
            # photo URL.
            if not p.pop('r', None): p['iv'] = p.get('iv', 0) + 1
            photos.mark(p, CROP.get(p['f']), ROT.get(p['f']))
        except Exception as e: print('failed:', e)
gone = 0
if '--all-remote-unused' in sys.argv:
    for L in (d.get('cand') or {}).values():
        for p in L:
            if p['f'] in added or p.get('r') or not p.get('src'): continue
            photos.remove(p['f'])  # a copy left in img/ from before the move to R2
            p['r'] = 1; gone += 1
if done or gone: dump_all(d)
print(f'downloaded {done} into {OUT}/ (upload: tools/r2_sync.sh {OUT}), made remote {gone}')
# --fish (admin plan PR 7): the fish photos Pierre put in play (curation.json fish, core.js fishOn), from iNaturalist or
# FishBase, into the same folder, and fish-game.json, which the fish game reads (tools/fish_game.py).
if '--fish' in sys.argv:
    import fish_game
    fish_done, fish_failed, fish_n, fish_wait = fish_game.run(OUT)
    print(f'fish: downloaded {fish_done} into {OUT}/, {len(fish_failed)} failed; {fish_n} photos in fish-game.json'
          + (f'; {fish_wait} more wait for the next run (tools/fish_game.py MAX)' if fish_wait else ''))
