# Photos out of the repo, step 2 (Pierre's rule, 2026-11-05; docs/ROADMAP.md "Photos out of the repo"): the photos with
# an online original (src: iNaturalist, Pierre's own iNaturalist photos, FishBase) leave img/ and live on R2 only; git
# keeps the ones with no other backup (IMR lecture photos, Coral Finder book scans, page art).
#
#   python3 tools/r2_move.py            the list: what leaves img/ and what stays, counts by kind, owner and genus, size
#   python3 tools/r2_move.py --verify   also checks every file that would leave is on R2, byte for byte (HEAD on the
#                                       bucket's public address: its ETag is the file's MD5)
#   python3 tools/r2_move.py --apply    verifies, then deletes from img/ the files R2 holds identically (never one it
#                                       lacks or holds differently: those stay and are listed, and the run fails)
#   --files PATH                        with --verify: writes the img/ paths R2 holds identically to PATH, one per line
#                                       (for git rm in a sparse checkout, where img/ is not on disk; the files are read
#                                       from --img DIR, a full checkout's img/)
# Re-runnable: a photo with an online original that came back to img/ by some old path leaves again.
import collections, concurrent.futures as cf, hashlib, json, os, re, sys, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import photos

arg = lambda k: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else None
IMG = arg('--img') or photos.IMG


def kinds():
    """{f: (kind, genus, own)} for every photo of img/ with an online original, from where data.json lists it."""
    d = json.load(open(os.path.join(photos.ROOT, 'data.json'), encoding='utf-8'))
    out = {}

    def add(L, kind, g):
        for p in L:
            if p.get('src') and not p.get('r'): out.setdefault(p['f'], (kind, g, bool(p.get('own'))))
    for g, G in d['gen'].items():
        for s in ('views', 'more'):
            for L in (G.get(s) or {}).values(): add(L, 'site photo of a slate genus', g)
    for g, L in (d.get('cand') or {}).items(): add(L, 'candidate Pierre added', g)
    for g, G in ((d.get('x') or {}).get('gen') or {}).items():
        for s in ('views', 'more'):
            for L in (G.get(s) or {}).values(): add(L, 'genus off the IMR list (Millepora, bonus genera)', g)
    return out


def files(f):
    return [f + s + '.webp' for s in photos.SUFFIXES if os.path.exists(os.path.join(IMG, f + s + '.webp'))]


def size(names):
    return sum(os.path.getsize(os.path.join(IMG, n)) for f in names for n in files(f))


def on_r2(n):
    """True when R2 holds file n of img/ byte for byte; else why not."""
    md5 = hashlib.md5(open(os.path.join(IMG, n), 'rb').read()).hexdigest()
    err = ''
    for _ in range(3):
        try:
            req = urllib.request.Request(photos.photo_base() + 'img/' + n, method='HEAD', headers=photos.UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                return True if r.headers.get('ETag', '').strip('"') == md5 else 'different on R2'
        except urllib.error.HTTPError as e:
            if e.code == 404: return 'missing on R2'
            err = f'HTTP {e.code}'
        except Exception as e:
            err = str(e)
    return err


if __name__ == '__main__':
    recs = photos.records()
    here = {re.sub(r'(-[tsm])?\.webp$', '', n) for n in os.listdir(IMG) if n.endswith('.webp')}  # page art too
    leave = sorted(here & photos.online(recs))
    stay = sorted(here - set(leave))
    K = kinds()
    mb = lambda b: f'{b / 1e6:.1f} MB'
    print(f'Leave img/ (online original, on R2): {len(leave)} photos, {sum(len(files(f)) for f in leave)} files, {mb(size(leave))}')
    by = collections.Counter(K.get(f, ('other', '?', False))[0] for f in leave)
    for k, n in by.most_common(): print(f'  {k}: {n}')
    own = sum(1 for f in leave if K.get(f, ('', '', False))[2])
    print(f'  Pierre\'s own iNaturalist photos: {own}; other iNaturalist observers: {len(leave) - own}')
    G = collections.Counter(K.get(f, ('', '?', False))[1] for f in leave)
    print('  by genus: ' + ', '.join(f'{g} {n}' for g, n in sorted(G.items())))

    def skind(f):
        L = recs.get(f) or []
        if any(p.get('cf') for p in L): return 'Coral Finder book scan'
        if any(p.get('imr') for p in L): return 'IMR lecture photo'
        if not L and f.startswith('imr'): return 'IMR lecture photo (no record, named in curation.json)'
        return 'page art' if not L and not any(c.isdigit() for c in f) else 'no record (named in curation.json only)'
    print(f'Stay in img/ (no online original): {len(stay)} photos, {sum(len(files(f)) for f in stay)} files, {mb(size(stay))}')
    for k, n in collections.Counter(map(skind, stay)).most_common(): print(f'  {k}: {n}')
    if '--verify' not in sys.argv and '--apply' not in sys.argv: sys.exit(0)
    todo = [n for f in leave for n in files(f)]
    bad = {}
    with cf.ThreadPoolExecutor(16) as ex:
        for n, ok in zip(todo, ex.map(on_r2, todo)):
            if ok is not True: bad[n] = ok
    print(f'R2: {len(todo) - len(bad)} of {len(todo)} files held byte for byte' + ''.join(f'\n  {n}: {why}' for n, why in sorted(bad.items())[:50]))
    held = [f for f in leave if not any(n in bad for n in files(f))]
    if arg('--files'):
        with open(arg('--files'), 'w') as fh: fh.write(''.join(f'img/{n}\n' for f in held for n in files(f)))
    if '--apply' in sys.argv:
        freed = size(held)
        for f in held: photos.remove(f, IMG)
        print(f'removed from img/: {len(held)} photos ({mb(freed)}); kept for want of an identical copy on R2: {len(leave) - len(held)}')
    sys.exit(1 if bad else 0)
