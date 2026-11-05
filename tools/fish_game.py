#!/usr/bin/env python3
"""The curated fish game photos (admin plan PR 7): writes fish-game.json, the photos Pierre put in play in the admin's fish
Candidates, downloaded in the four sizes and hosted on Cloudflare R2, which the fish game reads instead of the stopgap
list (fish-photos.json, tools/fish_photos.py) wherever an entry has enough of them (core.js fishPhotos).

In play (the admin's rule, core.js fishOn, ported here as fish_on): curation.json fish.add names the photo's species, the
photo is neither rejected (seen) nor excluded, and its Not this (out), if set, names that same species. The top-level
"exclude" (photos excluded for good everywhere) is honoured too, by name and by iNaturalist photo id.

For each photo in play, from its fish-cand.json record (the original: iNaturalist, or FishBase):
  - downloaded from its original (src: iNaturalist's photo hosts or www.fishbase.de only; FishBase answers 500 at times,
    so its photos are asked up to FB_TRIES times with a pause), Pierre's crop applied (fish.crop [l, t, r, b]; [0, 0, 1, 1]
    = the whole photo), written in the four sizes by tools/photos.py save() into --out DIR (default r2-upload/,
    gitignored), never into img/: the photos with an online original live on R2 only (Pierre's rule of 2026-11-05). The
    workflow uploads DIR (tools/r2_sync.sh DIR) before it commits fish-game.json, so the list never names a photo R2
    lacks. A photo already downloaded is kept; it is downloaded again when its crop changes (cr), its rewrite count iv
    bumped (the app puts both in the photo's address, app.js ver);
  - listed under its teaching entry (fish.json teach: the level-1 entry whose species list holds the species) as
    {f, o (its observation, or the FishBase photo page), src, a, lic, t, sp (the species it is in play for), loc, own,
    ar, e (fish.ease, else the pass's suggest.json fish e), jt (fish.tags, else the pass's jt), ph (its phase, as the
    admin's autosort.js fishPhase: Pierre's phase and tags first), cr, iv, via, rep}: no r, so the app reads it from R2
    (app.js img) and falls back on src when R2 fails (core.js photoAway).
A photo that fails to download is left out until the next run (printed); one no longer in play leaves the list (its
files stay on R2, unused: nothing is deleted from the bucket). Entries in fish.json order, an entry's photos by its
species order, then the easiest, then by name (never Pierre's own by priority: Q148). One photo per line.

  python3 tools/fish_game.py [--out DIR]   download what is new and write fish-game.json (run by tools/fetch_approved.py
                                           --fish in the Candidate photos workflow, after each Publish)
  python3 tools/fish_game.py --plan        print what a run would download, the expected R2 volume, and the entries that
                                           would still use the stopgap; writes nothing, downloads nothing
"""
import argparse
import concurrent.futures as cf
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from fetch_fish import PHASE_WORD, PHASES  # noqa: E402  (the phase words, as autosort.js FPHW)

OUT_FILE = 'fish-game.json'
V = 1
UA = {'User-Agent': 'coral-id-imr/1.0'}
# Only these photo hosts (this runs in a GitHub Action that can write to main; code review 2026-11-01, L8).
HOSTS = ('inaturalist-open-data.s3.amazonaws.com', 'static.inaturalist.org', 'www.fishbase.de')
FB_HOST = 'www.fishbase.de'
FB_TRIES, FB_PAUSE = 4, 5.0  # FishBase answers 500 at times: up to 4 tries, 5 s, 10 s, 15 s apart
# core.js FISHPH: an entry plays on its curated photos alone once it has MIN very easy ones (ease EASY or more; tools/
# fish_judge.py WANT and EARLY, Pierre 2026-11-04: at least 5 very easy photos per circle-1 entry), else with the stopgap's.
MIN, EASY = 5, 4
# The average size of one photo's four files on R2 (a sample of 24 iNaturalist photos already there, 2026-11-05:
# 226 + 93 + 32 + 10 KB), for --plan's volume estimate.
KB_PER_PHOTO = 361


def fish_on(F, f, sid):
    """core.js fishOn: photo f is in play for species sid."""
    o = (F.get('out') or {}).get(f)
    return (F.get('add') or {}).get(f) == sid and not (F.get('seen') or {}).get(f) and not (F.get('exclude') or {}).get(f) and (not o or o == sid)


def pid(f):
    """The photo's identity across lists (core.js fishPid): i<iNaturalist photo id> or b<FishBase file stem>."""
    f = str(f)
    m = re.fullmatch(r'fi(\d+)', f) or re.search(r'-cand-(\d+)[cd]?$', f)
    if m:
        return 'i' + m.group(1)
    m = re.search(r'-cand-fb-(.+)$', f)
    return 'b' + m.group(1) if m else f


def phase(p, f, F, j):
    """autosort.js fishPhase: Pierre's phase and tags first, then the pass's phase, its juvenile flag, else the source's."""
    mine = f in (F.get('phase') or {}) or f in (F.get('tags') or {})
    ph = F['phase'][f] if f in (F.get('phase') or {}) else (j or {}).get('ph')
    jt = (F.get('tags') or {}).get(f) or (j or {}).get('jt') or ''
    if PHASE_WORD.get(ph):
        return PHASE_WORD[ph]
    if 'j' in jt[7:]:
        return 'juvenile'
    if mine:
        return ''
    got = {PHASE_WORD[w] for w in (p.get('st') or '').split('/') if w in PHASE_WORD}
    return next((x for x in PHASES if x in got), '')


def crop_of(F, f):
    c = (F.get('crop') or {}).get(f)
    return list(c) if c and list(c) != [0, 0, 1, 1] else None


def entries(fish):
    """{species id: teaching id} of the level-1 entries, and their order."""
    of, order = {}, []
    for t in fish.get('teach') or []:
        if t.get('level') != 1:
            continue
        order.append(t['id'])
        for s in t.get('species') or []:
            of.setdefault(s, t['id'])
    return of, order


def in_play(cur, cand):
    """[(species id, candidate record)] of every photo in play that fish-cand.json still describes."""
    F = (cur or {}).get('fish') or {}
    top = set((cur or {}).get('exclude') or {})
    top_ids = {pid(f) for f in top}
    rec = {p['f']: p for L in (cand.get('cand') or {}).values() for p in L if p.get('f')}
    out = []
    for f, sid in sorted((F.get('add') or {}).items()):
        if not fish_on(F, f, sid) or f in top or pid(f) in top_ids or f not in rec or not rec[f].get('src'):
            continue
        out.append((sid, rec[f]))
    return out


KEEP = ('f', 'o', 'src', 'a', 'lic', 't')


def record(sid, p, F, sug):
    """The game record of candidate p in play for species sid (no ar, cr, iv: the download sets them)."""
    f, j = p['f'], (sug or {}).get(p['f']) or {}
    r = {k: p[k] for k in KEEP if k in p}
    r.update(sp=sid, loc=p.get('loc') or 'world')
    if p.get('own'):
        r['own'] = True
    e = (F.get('ease') or {}).get(f, j.get('e'))
    jt = (F.get('tags') or {}).get(f, j.get('jt'))
    if e:
        r['e'] = int(e)
    if jt:
        r['jt'] = jt
    ph = phase(p, f, F, j)
    if ph:
        r['ph'] = ph
    for k in ('via', 'rep'):
        if p.get(k):
            r[k] = p[k]
    return r


def plan(fish, cur, cand, sug, prev):
    """(todo, keep): the records to download [(record, crop, iv)] and the ones already downloaded with the right crop,
    {f: record}. prev: the current fish-game.json."""
    F = (cur or {}).get('fish') or {}
    old = {p['f']: p for L in ((prev or {}).get('photos') or {}).values() for p in L if p.get('f')}
    todo, keep = [], {}
    for sid, p in in_play(cur, cand):
        r, c, o = record(sid, p, F, sug), crop_of(F, p['f']), old.get(p['f'])
        if o and o.get('src') == r.get('src') and o.get('cr') == c and o.get('ar'):
            r['ar'] = o['ar']
            if c:
                r['cr'] = c
            if o.get('iv'):
                r['iv'] = o['iv']
            keep[p['f']] = r
        else:
            todo.append((r, c, (o.get('iv', 0) + 1) if o else 0))
    return todo, keep


def doc(fish, recs, built=None):
    """fish-game.json from the downloaded records {f: record}: by teaching entry, in order (see the top)."""
    of, order = entries(fish)
    sp_rank = {s: i for t in fish.get('teach') or [] for i, s in enumerate(t.get('species') or [])}
    by = {}
    for r in recs.values():
        t = of.get(r['sp'])
        if t:
            by.setdefault(t, []).append(r)
    photos = {t: sorted(by[t], key=lambda r: (sp_rank.get(r['sp'], 1e9), -(r.get('e') or 0), r['f']))
              for t in order if t in by}
    return {'v': V, 'built': built or date.today().isoformat(),
            'about': 'the fish photos Pierre put in play, hosted on R2 (tools/fish_game.py; core.js fishPhotos)', 'photos': photos}


def dumps(d):
    """One top-level key per line, one photo per line (a Publish changes a few lines, not the file)."""
    c = lambda v: json.dumps(v, ensure_ascii=False, separators=(',', ':'))
    head = [f'{c(k)}:{c(v)}' for k, v in d.items() if k != 'photos']
    ents = [f'{c(t)}:[\n' + ',\n'.join(c(p) for p in L) + '\n]' for t, L in d['photos'].items()]
    return '{' + ',\n'.join(head + ['"photos":{' + (('\n' + ',\n'.join(ents) + '\n') if ents else '') + '}']) + '}\n'


def opener(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()


def fetch(src, get=opener, pause=FB_PAUSE, tries=FB_TRIES):
    """The original's bytes, from an allowed host only; FishBase asked again after a pause when it fails."""
    host = urllib.parse.urlsplit(src).hostname or ''
    if not src.startswith('https://') or host not in HOSTS:
        raise ValueError(f'not an iNaturalist or FishBase photo URL: {src[:80]}')
    n = tries if host == FB_HOST else 1
    for k in range(n):
        try:
            return get(src)
        except (urllib.error.URLError, OSError) as e:
            if k == n - 1:
                raise
            print(f'retry {k + 1} in {pause * (k + 1):.0f} s: {src} ({e})')
            time.sleep(pause * (k + 1))


def download(r, c, out, get=opener, pause=FB_PAUSE):
    """Writes photo r's four files into out (Pierre's crop c applied) and sets its shape ar."""
    from PIL import Image
    import photos
    im = Image.open(io.BytesIO(fetch(r['src'], get, pause))).convert('RGB')
    if c:
        W, H = im.size
        im = im.crop((round(c[0] * W), round(c[1] * H), round(c[2] * W), round(c[3] * H)))
    photos.save(im, r['f'], out)
    w, h = Image.open(os.path.join(out, r['f'] + '-s.webp')).size  # the shape, as tools/apply_ratios.py measures it
    r['ar'] = round(w / h, 2)
    return r


def load(root, name, default=None):
    p = os.path.join(root, name)
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else default


def run(out='r2-upload', root=ROOT, get=opener, pause=FB_PAUSE, workers=6, write=True):
    """Downloads what is new into out and writes fish-game.json; returns (downloaded, failed, listed)."""
    fish, cur = load(root, 'fish.json'), load(root, 'curation.json', {})
    cand, sug = load(root, 'fish-cand.json', {'cand': {}}), (load(root, 'suggest.json', {}) or {}).get('fish') or {}
    prev = load(root, OUT_FILE, {'photos': {}})
    todo, keep = plan(fish, cur, cand, sug, prev)
    os.makedirs(out, exist_ok=True)
    done, failed = 0, []
    # FishBase one at a time, after the rest (it is the host that fails under load).
    fb = [x for x in todo if (urllib.parse.urlsplit(x[0]['src']).hostname or '') == FB_HOST]
    rest = [x for x in todo if x not in fb]

    def one(x):
        r, c, iv = x
        download(r, c, out, get, pause)
        if c:
            r['cr'] = c
        if iv:
            r['iv'] = iv
        return r
    with cf.ThreadPoolExecutor(workers) as ex:
        futs = {ex.submit(one, x): x for x in rest}
        for fut in cf.as_completed(futs):
            try:
                r = fut.result()
                keep[r['f']] = r
                done += 1
            except Exception as e:
                failed.append(futs[fut][0]['f'])
                print('failed:', futs[fut][0]['f'], e)
    for x in fb:
        try:
            r = one(x)
            keep[r['f']] = r
            done += 1
        except Exception as e:
            failed.append(x[0]['f'])
            print('failed:', x[0]['f'], e)
    d = doc(fish, keep)
    if d['photos'] == (prev or {}).get('photos') and (prev or {}).get('built'):
        d['built'] = prev['built']  # nothing changed: the same bytes, no commit
    if write:
        text = dumps(d)
        p = os.path.join(root, OUT_FILE)
        if not os.path.exists(p) or open(p, encoding='utf-8').read() != text:
            open(p, 'w', encoding='utf-8').write(text)
    return done, failed, sum(len(L) for L in d['photos'].values())


def stopgap_entries(fish, game_photos):
    """The level-1 entries that would still play with the stopgap's photos (fewer than MIN very easy curated ones)."""
    _, order = entries(fish)
    return [t for t in order if sum(1 for p in game_photos.get(t, []) if (p.get('e') or 0) >= EASY) < MIN]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--out', default='r2-upload')
    ap.add_argument('--plan', action='store_true')
    a = ap.parse_args()
    if a.plan:
        fish, cur = load(ROOT, 'fish.json'), load(ROOT, 'curation.json', {})
        cand, sug = load(ROOT, 'fish-cand.json', {'cand': {}}), (load(ROOT, 'suggest.json', {}) or {}).get('fish') or {}
        todo, keep = plan(fish, cur, cand, sug, load(ROOT, OUT_FILE, {'photos': {}}))
        allr = {**keep, **{r['f']: r for r, _, _ in todo}}
        d = doc(fish, allr)
        fb = sum(1 for r, _, _ in todo if r.get('via') == 'fishbase')
        print(f'in play: {len(allr)} photos over {len({r["sp"] for r in allr.values()})} species; '
              f'to download: {len(todo)} ({fb} from FishBase), {len(todo) * 4} files, about {len(todo) * KB_PER_PHOTO / 1024:.0f} MB '
              f'(the whole list: about {len(allr) * KB_PER_PHOTO / 1024:.0f} MB on R2)')
        st = stopgap_entries(fish, d['photos'])
        print(f'entries still with the stopgap photos (fewer than {MIN} very easy curated ones): {len(st)}: ' + ', '.join(st))
        return
    import slot
    slot.guard('tools/fish_game.py')  # one heavy run at a time on the machine (rule W24)
    done, failed, n = run(a.out)
    print(f'fish: downloaded {done} into {a.out}/ (upload: tools/r2_sync.sh {a.out}), {len(failed)} failed; {n} photos in {OUT_FILE}')


if __name__ == '__main__':
    main()
