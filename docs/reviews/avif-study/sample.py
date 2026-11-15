# Pick the stratified sample (coral field, coral lecture, fish; busy / middle / plain by the 480 px WebP's bits per pixel)
# and download what it needs: the original (iNaturalist / FishBase, paced) and today's R2 WebP files.
import sys, os, json, random, time, urllib.request, urllib.parse
WT, DATA = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(WT, 'tools'))
os.chdir(WT)
import photos
from PIL import Image
HOSTS = ('inaturalist-open-data.s3.amazonaws.com', 'static.inaturalist.org', 'www.fishbase.se', 'fishbase.se', 'www.fishbase.us')
B = json.load(open(os.path.join(DATA, 'bucket.json')))['heads']
recs = photos.records()
random.seed(20261115)


def rec(f):
    L = recs.get(f, [])
    return next((x for x in L if x.get('src') and not x.get('r')), L[0] if L else {})


def bpp(f, sbytes):
    ar = rec(f).get('ar') or 1.5
    w, h = (480, 480 / ar) if ar >= 1 else (480 * ar, 480)
    return sbytes * 8 / (w * h)


def tertiles(group, n, have_tile=None):
    L = [(bpp(f, v['-s']), f) for f, v in B[group].items()]
    L.sort()
    k = len(L) // 3
    out = []
    for i, part in enumerate((L[:k], L[k:2 * k], L[2 * k:])):
        pick = random.sample(part, n // 3 + (1 if i < n % 3 else 0))
        out += [(f, ['plain', 'middle', 'busy'][i], b) for b, f in pick]
    return out


S = []
for f, band, b in tertiles('coral', 33):
    S.append({'f': f, 'group': 'coral-field', 'band': band, 'bpp': round(b, 3)})
fish = tertiles('fish', 36)
for f, band, b in fish:
    S.append({'f': f, 'group': 'fish', 'band': band, 'bpp': round(b, 3)})
# Fish with a tile: 15 more, from the tile sample (their bands from their own 480 px file, HEADed below if needed).
tl = random.sample([f for f in B['tile'] if f not in {x['f'] for x in S}], 15)
for f in tl:
    S.append({'f': f, 'group': 'fish', 'band': None, 'bpp': None, 'tile_pick': 1})
# Lecture photos: from img/ (their only copy besides git), by their 480 px file's bits per pixel.
lec = []
for f in photos.photos():
    if not f.startswith('imr'):
        continue
    im = Image.open(os.path.join(photos.IMG, f + '-s.webp'))
    lec.append((os.path.getsize(os.path.join(photos.IMG, f + '-s.webp')) * 8 / (im.width * im.height), f))
lec.sort()
k = len(lec) // 3
for i, part in enumerate((lec[:k], lec[k:2 * k], lec[2 * k:])):
    for b, f in random.sample(part, 6 if i < 2 else 7):
        S.append({'f': f, 'group': 'coral-lecture', 'band': ['plain', 'middle', 'busy'][i], 'bpp': round(b, 3)})

os.makedirs(os.path.join(DATA, 'src'), exist_ok=True)
os.makedirs(os.path.join(DATA, 'r2'), exist_ok=True)


def get(u, ua=photos.UA):
    return urllib.request.urlopen(urllib.request.Request(u, headers=ua), timeout=120).read()


for x in S:
    r = rec(x['f'])
    x.update({k: r.get(k) for k in ('src', 'cr', 'ro', 'xc', 'ar', 'iv') if r.get(k) is not None})
    sufs = list(photos.SUFFIXES) + (['-x'] if r.get('xc') else [])
    for s in sufs:
        p = os.path.join(DATA, 'r2', x['f'] + s + '.webp')
        lp = os.path.join(photos.IMG, x['f'] + s + '.webp')
        if os.path.exists(p):
            continue
        b = open(lp, 'rb').read() if os.path.exists(lp) else get(photos.url(x['f'], s))
        open(p, 'wb').write(b)
    src = r.get('src')
    if src:
        host = urllib.parse.urlsplit(src).hostname or ''
        sp = os.path.join(DATA, 'src', x['f'] + '.bin')
        if host not in HOSTS:
            x['src_err'] = 'host ' + host
        elif not os.path.exists(sp):
            try:
                open(sp, 'wb').write(get(src))
            except Exception as e:
                x['src_err'] = str(e)[:120]
            time.sleep(1.1)  # rule C7's pace
    if x['band'] is None:
        b = os.path.getsize(os.path.join(DATA, 'r2', x['f'] + '-s.webp'))
        im = Image.open(os.path.join(DATA, 'r2', x['f'] + '-s.webp'))
        x['bpp'] = round(b * 8 / (im.width * im.height), 3)
json.dump(S, open(os.path.join(DATA, 'sample.json'), 'w'), indent=1)
from collections import Counter
print(len(S), Counter((x['group'], x['band']) for x in S), 'tiles', sum(1 for x in S if x.get('xc')), 'src errors', [x.get('src_err') for x in S if x.get('src_err')])
