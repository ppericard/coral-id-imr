"""Puts the Corals of the World originals of the IMR lecture photos into the records (ROADMAP "IMR lecture photos never
upscaled; the Corals of the World captures replaced by their originals", Pierre, 2026-11-18, "C12 A+D").

For each photo of tools/imr_frames.json (the lecture photos traced to Corals of the World, tools/imr_sources.json), on its
`course` record in data.json and in data/excluded.json (a photo Pierre excluded keeps it, as tools/apply_imr_sources.py does):
  src  the original picture's address on coralsoftheworld.org (an online original: the photo now lives on R2 only, its
       files made by tools/fetch_imr_originals.py, and when R2 fails the app reads the original from there);
  cr   how the lecture framed it, ro its turn (absent when none), as the admin's crop and rotation (tools/photos.py turn);
  ar   its new shape (width / height of its 480 px file);
  iv   +1, so the app asks R2 for the new files (a week of browser cache holds the screenshot under the same name).
`imr: true`, `a` and `pg` (the credit, tools/apply_imr_sources.py) stay as they are: the file name never changes, so the
curation and the players' records keep their key. With --files, the old screenshots leave img/ (git keeps them in its
history): `tools/photos.py --check` fails on a photo with an online original in img/.
Idempotent: a record that already has the address is left as it is.

    python3 tools/apply_imr_originals.py           # write
    python3 tools/apply_imr_originals.py --check   # exit 1 when a file differs from what it would write
    python3 tools/apply_imr_originals.py --files   # also remove the screenshots from img/
"""
import json, os, sys
from datajson import load, dump, dumps
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import photos  # noqa: E402
from apply_imr_sources import records  # noqa: E402

SRC = os.path.join(ROOT, 'tools', 'imr_sources.json')
FRAMES = os.path.join(ROOT, 'tools', 'imr_frames.json')
GONE = os.path.join(ROOT, 'data/excluded.json')


def shape(px):
    """ar of a photo cut to px (width, height): the 480 px file's width / height, as photos.write measures it."""
    im = Image.new('1', tuple(px))
    im.thumbnail((480, 480))
    return round(im.size[0] / im.size[1], 2)


def apply(d, X, S, F):
    """d: data.json; X: data/excluded.json (or None); S: imr_sources.json photos; F: imr_frames.json photos. Returns the files done."""
    done = set()
    for p in records(d, X):
        f = p.get('f')
        if f not in F:
            continue
        url = S[f]['source']['image']
        if p.get('src') != url:
            p['iv'] = p.get('iv', 0) + 1
        p['src'] = url
        photos.mark(p, F[f].get('cr'), F[f].get('ro', 0))
        p['ar'] = shape(F[f]['px'])
        done.add(f)
    return done


def main():
    S = json.load(open(SRC))['photos']
    F = json.load(open(FRAMES))['photos']
    d = load()
    X = load(GONE) if os.path.exists(GONE) else None
    before = (dumps(d), X and dumps(X))
    done = apply(d, X, S, F)
    missing = sorted(set(F) - done)
    if missing:
        sys.exit('in neither data.json course nor data/excluded.json: ' + ', '.join(missing))
    if '--check' in sys.argv:
        ok = (dumps(d), X and dumps(X)) == before
        sys.exit(0 if ok else 'the lecture originals are not applied (python3 tools/apply_imr_originals.py)')
    dump(d)
    if X is not None:
        dump(X, GONE)
    gone = 0
    if '--files' in sys.argv:
        for f in sorted(done):
            if any(os.path.exists(os.path.join(photos.IMG, f + s + '.webp')) for s in photos.SUFFIXES):
                photos.remove(f)
                gone += 1
    print(f'{len(done)} IMR lecture photos given their Corals of the World original; {gone} screenshots removed from img/')


if __name__ == '__main__':
    main()
