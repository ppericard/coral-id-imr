# The four files of every site photo (Pierre, 2026-11-01: lighter photos for the slow connections common in the
# Philippines), long side in px, WebP:
#   img/{f}.webp     1600 px  enlarged view, big or dense screens
#   img/{f}-m.webp    960 px  game and sheet photos on phones and laptops
#   img/{f}-s.webp    480 px  cards, the backdrop while the bigger file loads, data saver
#   img/{f}-t.webp    240 px  thumbnails (home band, progress tiles, look-alike pairs, tips)
# The app picks the smallest file that covers each photo's box (app.js `fit`, `srcset`). Every tool that writes photos
# uses save().
#
# Where they live (Photos out of the repo, Pierre's rule of 2026-11-05; docs/ROADMAP.md, docs/ARCHITECTURE.md "Photos"):
# the app reads every photo from the Cloudflare R2 bucket (core.js PHOTO_BASE, same img/ paths). git keeps only the
# photos with no other backup (IMR lecture photos, Coral Finder book scans, page art): a photo whose record has an online
# original (src: iNaturalist, Pierre's own iNaturalist photos, FishBase) and is downloaded (no r) lives on R2 only
# (online()); tools/fetch_approved.py uploads it there, never to img/, and tools/r2_sync.sh never deletes from the bucket.
# A tool that reads a photo's pixels opens path(f, size): the file in img/, or a copy from R2 kept in tools/.cache/r2/.
#
#   python3 tools/photos.py             writes the missing 960, 480 and 240 px files of img/ from the 1600 px ones
#   python3 tools/photos.py --check     fails if a photo of img/ lacks one of its sizes, a photo with no online original
#                                       is missing from img/, or a photo with one is in img/ (CI)
#   python3 tools/photos.py --r2-list   the photos that live on R2 only, one per line (tools/r2_sync.sh checks the
#                                       bucket has their four files)
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'img')
SIZES = ((1600, 78, ''), (960, 72, '-m'), (480, 72, '-s'), (240, 70, '-t'))
SUFFIXES = tuple(s for _, _, s in SIZES)
# The files that hold photo records (dicts with f): the game and sheet photos, the candidates waiting, the fish photos.
DATA = ('data.json', 'cand.json', 'fish-photos.json')
CACHE = os.path.join(ROOT, 'tools', '.cache', 'r2')  # gitignored
UA = {'User-Agent': 'coral-id-imr/1.0'}  # R2's public address refuses Python's default user agent


def save(im, f, folder=IMG):
    """Writes the four sizes of photo f (a PIL image, any size) as folder/{f}{suffix}.webp."""
    im = im.convert('RGB')
    for w, q, suf in SIZES:
        t = im.copy()
        t.thumbnail((w, w))
        t.save(os.path.join(folder, f'{f}{suf}.webp'), 'WEBP', quality=q, method=5)


def remove(f, folder=IMG):
    for suf in SUFFIXES:
        p = os.path.join(folder, f'{f}{suf}.webp')
        if os.path.exists(p):
            os.remove(p)


def photos(folder=IMG):
    """Names of the photos in img/: a 1600 px file next to its 480 px one (other images in img/ are page art)."""
    names = set(os.listdir(folder)) if os.path.isdir(folder) else set()
    return sorted(n[:-5] for n in names if n.endswith('.webp') and not n.endswith(('-s.webp', '-m.webp', '-t.webp')) and n[:-5] + '-s.webp' in names)


def photo_base(root=ROOT):
    """core.js PHOTO_BASE, the R2 bucket's public address (the one place it is written)."""
    return re.search(r"const PHOTO_BASE = '([^']*)'", open(os.path.join(root, 'core.js'), encoding='utf-8').read()).group(1)


def records(root=ROOT, files=DATA):
    """Every photo record of the data files: {f: [record, ...]} (a name can be listed in several places)."""
    out = {}

    def walk(o):
        if isinstance(o, list):
            for x in o: walk(x)
        elif isinstance(o, dict):
            if isinstance(o.get('f'), str): out.setdefault(o['f'], []).append(o)
            for v in o.values():
                if isinstance(v, (dict, list)): walk(v)
    for fn in files:
        p = os.path.join(root, fn)
        if os.path.exists(p): walk(json.load(open(p, encoding='utf-8')))
    return out


def online(recs=None):
    """The photos that live on R2 only: downloaded (no r) and with an online original (src)."""
    recs = records() if recs is None else recs
    return {f for f, L in recs.items() if any(p.get('src') and not p.get('r') for p in L)}


def gitonly(recs=None):
    """The photos whose only copy outside R2 is git: downloaded, with no online original (IMR, Coral Finder book)."""
    recs = records() if recs is None else recs
    return {f for f, L in recs.items() if not any(p.get('src') or p.get('r') for p in L)}


def every(folder=IMG, recs=None):
    """Every site photo, in img/ or on R2 only (what the photo tools measure: tools/photo_quality.py, photo_metrics.py)."""
    return sorted(set(photos(folder)) | online(recs))


def url(f, suf=''):
    """Photo f's file on R2, at a size ('', '-m', '-s', '-t')."""
    return f'{photo_base()}img/{f}{suf}.webp'


_RECS = None


def path(f, suf='', folder=IMG):
    """A local path to photo f's file at a size: img/ when it is there, else a copy downloaded from R2 into
    tools/.cache/r2/ once (named after the photo's crop and rewrite count, data.json cr / iv, so a recropped photo is
    fetched again)."""
    p = os.path.join(folder, f'{f}{suf}.webp')
    if os.path.exists(p): return p
    global _RECS
    _RECS = records() if _RECS is None else _RECS
    r = next((x for x in _RECS.get(f, []) if x.get('cr') or x.get('iv')), {})
    tag = '_'.join(map(str, r.get('cr') or [])) + (f'.{r["iv"]}' if r.get('iv') else '')
    c = os.path.join(CACHE, f'{f}{suf}{"." + tag if tag else ""}.webp')
    if not (os.path.exists(c) and os.path.getsize(c)):
        import urllib.request
        os.makedirs(CACHE, exist_ok=True)
        with urllib.request.urlopen(urllib.request.Request(url(f, suf), headers=UA), timeout=60) as resp: b = resp.read()
        with open(c + '.part', 'wb') as fh: fh.write(b)
        os.replace(c + '.part', c)
    return c


def check(folder=IMG, recs=None):
    """What is wrong with img/ (a list of messages, empty when all is well)."""
    recs = records() if recs is None else recs
    names = set(os.listdir(folder)) if os.path.isdir(folder) else set()
    bad = []
    miss = [f + suf for f in photos(folder) for suf in SUFFIXES[1:] if f + suf + '.webp' not in names]
    if miss: bad.append(f'{len(miss)} photo file(s) missing (run python3 tools/photos.py): ' + ', '.join(miss[:10]))
    # git is the only backup of these: they never leave img/ (Pierre, 2026-11-05).
    gone = sorted(f + suf for f in gitonly(recs) for suf in SUFFIXES if f + suf + '.webp' not in names)
    if gone: bad.append(f'{len(gone)} file(s) of photos with no online original missing from img/ (git is their only backup): ' + ', '.join(gone[:10]))
    # A photo with an online original lives on R2 only (Photos out of the repo, step 2): never back in img/.
    back = sorted(f for f in online(recs) if any(f + suf + '.webp' in names for suf in SUFFIXES))
    if back: bad.append(f'{len(back)} photo(s) with an online original in img/: they live on R2 only (tools/r2_move.py --apply): ' + ', '.join(back[:10]))
    return bad


if __name__ == '__main__':
    if '--r2-list' in sys.argv:
        print('\n'.join(sorted(online())))
        sys.exit(0)
    if '--check' in sys.argv:
        bad = check()
        if bad:
            print('\n'.join(bad))
            sys.exit(1)
        print(f'Photo sizes OK: {len(photos())} photos in img/, each in ' + ', '.join(str(w) for w, _, _ in SIZES) + f' px; {len(online())} photos with an online original live on R2')
        sys.exit(0)
    todo = [(f, size) for f in photos() for size in SIZES[1:] if not os.path.exists(os.path.join(IMG, f + size[2] + '.webp'))]
    if todo:
        import slot; slot.guard('tools/photos.py')  # one heavy run at a time on the machine (rule W24)
    from PIL import Image  # only to write: --check runs without Pillow
    for f, (w, q, suf) in todo:
        im = Image.open(os.path.join(IMG, f + '.webp')).convert('RGB')
        im.thumbnail((w, w))
        im.save(os.path.join(IMG, f + suf + '.webp'), 'WEBP', quality=q, method=5)
    print(f'wrote {len(todo)} file(s)')
