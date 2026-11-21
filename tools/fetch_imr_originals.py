"""Makes the Corals of the World originals of the IMR lecture photos (ROADMAP "IMR lecture photos never upscaled; the
Corals of the World captures replaced by their originals", Pierre, 2026-11-18, "C12 A+D").

The 86 lecture photos traced to Corals of the World (tools/imr_sources.json, found "original") are screenshots of that
site's pictures. Each original is downloaded once from the species page's picture (source.image), cut and turned as the
lecture framed it (tools/imr_frames.json: cr, ro; rule: the crop first, then the turn, tools/photos.py turn), and written in
the four sizes (tools/photos.py save) under the same file name, so curation and the players' records keep their key.
The files go to --out DIR (default r2-upload/, gitignored), never to img/: the photo has an online original, so it lives
on R2 only; .github/workflows/reefid-originals.yml uploads that folder (tools/r2_sync.sh DIR).

Pierre's Crop on a lecture photo (curation.json crop, rot; ROADMAP, REE-60) replaces the lecture's framing for that photo
(tools/photos.py lecture_frame), here and in tools/fetch_approved.py, which remakes a photo when its framing changes: a
run of this tool never puts the lecture's framing back over his crop.

One request every 2 seconds, a generic User-Agent, public pages only (rule C7's spirit; the site's terms allow
non-commercial use with the citation the credit gives). A download is kept in --cache DIR (default tools/.cache/cotw,
gitignored) and never fetched twice. A picture whose size is not the one tools/imr_frames.json recorded (cut as the lecture
framed it) stops that photo: the site changed it, and neither the lecture's crop nor Pierre's, drawn on the original he saw,
would fit.

    python3 tools/fetch_imr_originals.py                 # download, cut, write into r2-upload/
    python3 tools/fetch_imr_originals.py --plan          # offline: what it would fetch
    python3 tools/fetch_imr_originals.py --out DIR --cache DIR
"""
import json, os, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import photos  # noqa: E402

SRC = os.path.join(ROOT, 'tools', 'imr_sources.json')
FRAMES = os.path.join(ROOT, 'tools', 'imr_frames.json')
CUR = os.path.join(ROOT, 'curation.json')
HOST = 'www.coralsoftheworld.org'
UA = {'User-Agent': 'photo-fetch/1.0 (training app; paced)'}
PAUSE = 2.0
DEFAULT_CACHE = os.path.join(ROOT, 'tools', '.cache', 'cotw')
_last = [0.0]  # when the last request went out: one every PAUSE seconds, whoever asks


def plan():
    """[(photo, picture address, cr, ro, px)] for every photo in tools/imr_frames.json, in file-name order."""
    S = json.load(open(SRC))['photos']
    F = json.load(open(FRAMES))['photos']
    out = []
    for f in sorted(F):
        s = (S.get(f) or {}).get('source')
        if not s or S[f].get('found') != 'original':
            raise SystemExit(f'{f}: in tools/imr_frames.json but not traced to an original in tools/imr_sources.json')
        u = urllib.parse.urlsplit(s['image'])
        if u.scheme != 'https' or u.hostname != HOST:
            raise SystemExit(f"{f}: not a {HOST} picture address: {s['image']}")
        out.append((f, s['image'], F[f].get('cr'), F[f].get('ro', 0), F[f]['px']))
    return out


def download(url, cache=DEFAULT_CACHE):
    """The path of the picture at url in cache, downloaded once (three tries, one request every PAUSE seconds); None when
    it could not be fetched. url must be a https picture of HOST (plan checks the records', this the address itself)."""
    u = urllib.parse.urlsplit(url)
    if u.scheme != 'https' or u.hostname != HOST:
        raise ValueError(f'not a {HOST} picture address: {url[:80]}')
    os.makedirs(cache, exist_ok=True)
    path = os.path.join(cache, os.path.basename(u.path))
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        return path
    for attempt in range(3):
        time.sleep(max(0.0, PAUSE - (time.time() - _last[0])))
        _last[0] = time.time()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                data = r.read()
            open(path, 'wb').write(data)
            return path
        except Exception as e:
            print(f'{url}: attempt {attempt + 1}: {e}', file=sys.stderr)
    return None


def make(f, url, cr, ro, px, crop, rot, cache, out):
    """Writes the four sizes of lecture photo f into out, from its original at url, framed as photos.lecture_frame says (crop
    and rot: curation.json's maps, None for none). Returns (the shape ar of the 480 px file, the framing's crop and rotation),
    or (None, why) when the picture could not be fetched or is no longer the one the lecture's framing was matched on."""
    from PIL import Image
    path = download(url, cache)
    if not path:
        return None, f'{f}: could not download {url}'
    im = Image.open(path).convert('RGB')
    cut = photos.turn(im, cr, ro)
    if list(cut.size) != list(px):
        return None, f'{f}: the picture is {im.size}, the cut is {cut.size}, tools/imr_frames.json says {px}'
    c, r = photos.lecture_frame(f, cr, ro, crop, rot)
    return photos.write(im, f, out, c, r), (c, r)


def main():
    args = sys.argv[1:]
    todo = plan()
    out = args[args.index('--out') + 1] if '--out' in args else os.path.join(ROOT, 'r2-upload')
    cache = args[args.index('--cache') + 1] if '--cache' in args else DEFAULT_CACHE
    if '--plan' in args:
        urls = sorted({u for _, u, *_ in todo})
        print(f'{len(todo)} photos from {len(urls)} pictures of {HOST}; about {len(urls) * PAUSE:.0f} s at one request every {PAUSE:.0f} s')
        return
    import slot
    slot.guard('tools/fetch_imr_originals.py')
    cur = json.load(open(CUR)) if os.path.exists(CUR) else {}
    os.makedirs(out, exist_ok=True)
    bad = []
    for f, url, cr, ro, px in todo:
        ar, why = make(f, url, cr, ro, px, cur.get('crop'), cur.get('rot'), cache, out)
        if ar is None:
            bad.append(why)
    if bad:
        print('\n'.join(bad), file=sys.stderr)
        sys.exit(1)
    print(f'{len(todo)} lecture photos written into {out}/ (upload: tools/r2_sync.sh {out})')


if __name__ == '__main__':
    main()
