# The three files of every site photo (Pierre, 2026-11-01: lighter photos for the slow connections common in the
# Philippines), long side in px, WebP:
#   img/{f}.webp     1600 px  enlarged view, big or dense screens
#   img/{f}-m.webp    960 px  game and sheet photos on phones and laptops
#   img/{f}-s.webp    480 px  cards, the backdrop while the bigger file loads, data saver
#   img/{f}-t.webp    240 px  thumbnails (home band, progress tiles, look-alike pairs, tips)
# The app picks the smallest file that covers each photo's box (app.js `fit`, `srcset`). Every tool that writes photos
# uses save().
#   python3 tools/photos.py           writes the missing 960 and 240 px files from the 1600 px ones
#   python3 tools/photos.py --check   fails if a photo lacks one of its sizes (CI)
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'img')
SIZES = ((1600, 78, ''), (960, 72, '-m'), (480, 72, '-s'), (240, 70, '-t'))
SUFFIXES = tuple(s for _, _, s in SIZES)


def save(im, f, folder=IMG):
    """Writes the three sizes of photo f (a PIL image, any size) as folder/{f}{suffix}.webp."""
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
    """Names of the site photos: a 1600 px file next to its 480 px one (other images in img/ are page art)."""
    names = set(os.listdir(folder))
    return sorted(n[:-5] for n in names if n.endswith('.webp') and not n.endswith(('-s.webp', '-m.webp', '-t.webp')) and n[:-5] + '-s.webp' in names)


if __name__ == '__main__':
    todo = [(f, size) for f in photos() for size in SIZES[1:] if not os.path.exists(os.path.join(IMG, f + size[2] + '.webp'))]
    if '--check' in sys.argv:
        if todo:
            print(f'{len(todo)} photo file(s) missing (run python3 tools/photos.py): ' + ', '.join(f + suf for f, (_, _, suf) in todo[:10]))
            sys.exit(1)
        print(f'Photo sizes OK: {len(photos())} photos, each in ' + ', '.join(str(w) for w, _, _ in SIZES) + ' px')
        sys.exit(0)
    from PIL import Image  # only to write: --check runs without Pillow
    for f, (w, q, suf) in todo:
        im = Image.open(os.path.join(IMG, f + '.webp')).convert('RGB')
        im.thumbnail((w, w))
        im.save(os.path.join(IMG, f + suf + '.webp'), 'WEBP', quality=q, method=5)
    print(f'wrote {len(todo)} file(s)')
