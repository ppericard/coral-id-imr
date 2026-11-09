#!/usr/bin/env python3
"""The curated fish game photos (admin plan PR 7): writes fish-game.json, the photos Pierre put in play in the admin's fish
Candidates, downloaded in the four sizes and hosted on Cloudflare R2, which the fish game reads instead of the stopgap
list (fish-photos.json, tools/fish_photos.py) wherever an entry has enough of them (core.js fishPhotos).

In play (Pierre, 2026-11-06, Q180 and Q199: one notion of "in play", every fish photo in play hosted on R2; in_play):
  - Pierre's adds (the admin's rule, core.js fishOn, ported here as fish_on): curation.json fish.add names the photo's
    species, the photo is neither rejected (seen) nor excluded, and its Not this (out), if set, names that same species;
  - the candidates judged sure (suggest.json "fish", cand_sure: autosort.js fishSure's add, one kind of fish) he has not
    decided on, listed with auto: "cand", the pass's proposed crop applied as the auto-sort would write it;
  - the units' reference photos (tools/fish_refs.json) judged sure on the same rubric as a candidate, whatever their
    reference level (tools/fish_judge.json codes after the caps; judged_sure: one kind of fish, in the water; Pierre,
    2026-11-08, Q212: "we bring them in like candidates"), auto: "ref", unless their observation is already in play (rule P4).
  A photo in play by itself leaves play once Pierre rejects, excludes or moves it (by photo id: core.js fishIn, fish_in).
  The top-level "exclude" (photos excluded for good everywhere) is honoured too, by name and by photo id. At most MAX
  downloads a run (--max), the reference photos and the starter entries first; the rest at the next runs.

For each photo in play, from its fish-cand.json record (the original: iNaturalist, or FishBase):
  - downloaded from its original (src: iNaturalist's photo hosts or www.fishbase.de only; FishBase answers 500 at times,
    so its photos are asked up to FB_TRIES times with a pause), Pierre's crop applied (fish.crop [l, t, r, b]; [0, 0, 1, 1]
    = the whole photo), then his rotation (fish.rot {f: 90 | 180 | 270} degrees clockwise: tools/photos.py turn), written in the four sizes by tools/photos.py save() into --out DIR (default r2-upload/,
    gitignored), never into img/: the photos with an online original live on R2 only (Pierre's rule of 2026-11-05). The
    workflow uploads DIR (tools/r2_sync.sh DIR) before it commits fish-game.json, so the list never names a photo R2
    lacks. A photo already downloaded is kept; it is downloaded again when its crop (cr) or rotation (ro) changes, its
    rewrite count iv bumped (the app puts it in the photo's address, app.js ver);
  - listed under its teaching entry (fish.json teach: the level-1 entry whose species list holds the species) as
    {f, o (its observation, or the FishBase photo page; an iNaturalist observation by its id alone), src (the original;
    on iNaturalist, its extension alone when the photo is the record's own: tools/fish_short.py, core.js fishGameRow), a, lic, t, sp (the species it is in play for), loc, own,
    ar, e (fish.ease, else the pass's suggest.json fish e), jt (fish.tags, else the pass's jt), ph (its phase, as the
    admin's autosort.js fishPhase: Pierre's phase and tags first), cr, ro, iv, via, rep}: no r, so the app reads it from R2
    (app.js img) and falls back on src when R2 fails (core.js photoAway).
The tile (Pierre, 2026-11-09, Q321 D4: the square photos of "Find the X" and Matrix): a photo in play whose tags pass the
tile rule (tile_tags: profile or slight oblique, whole, good light, colour loss 0-1, sharp, large or medium, one fish, no
juvenile, camouflage or out-of-water flag) and that carries a fish bounding box (bb, judged with the rubric: tools/
fish_judge.json boxes, else the candidate's suggest.json fish bb; judging/FISH.md "The fish's box") gets a fifth file,
{f}-x.webp, a TILE px square cut from the original around the box (tile_crop: the box plus MARGIN on each side, squared,
kept inside Pierre's crop, then his rotation; a fish longer than the photo's short side keeps its square, the photo's
blurred copy filling past the edge), written next to the four sizes and uploaded with them. It is kept only when the fish
fills at least FILL of the tile and the box is at least RES px wide in the original; the record carries bb and either xc
(the tile's square, fractions of the original: the tile is made) or xn (why not: res, the fish too small in the original;
cut, the box not whole inside Pierre's crop; fill). A photo
already downloaded whose box is new or changed gets its tile alone (the original fetched again, its four files kept).
A photo that fails to download is left out until the next run (printed); one no longer in play leaves the list (its
files stay on R2, unused: nothing is deleted from the bucket). Entries in fish.json order, an entry's photos by its
species order, then the easiest, then by name (never Pierre's own by priority: Q148). One photo per line.

  python3 tools/fish_game.py [--out DIR] [--max N]   download what is new and write fish-game.json (run by tools/fetch_approved.py
                                           --fish in the Candidate photos workflow, after each Publish)
  python3 tools/fish_game.py --rewrite     write fish-game.json again in the current layout (the short form), nothing
                                           downloaded: after a merge that took another copy of it
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
import photos  # noqa: E402  (the four sizes; Pierre's crop and rotation: turn, stale, mark)
import fish_short  # noqa: E402  (the file's short form: o and src)

OUT_FILE = 'fish-game.json'
V = 1
UA = {'User-Agent': 'coral-id-imr/1.0'}
# Only these photo hosts (this runs in a GitHub Action that can write to main; code review 2026-11-01, L8).
HOSTS = ('inaturalist-open-data.s3.amazonaws.com', 'static.inaturalist.org', 'www.fishbase.de', 'www.fishbase.se')
# FishBase's hosts: www.fishbase.se, the mirror the candidates and reference photos name since 2026-11-06 (www.fishbase.de
# answers 500 to browsers), and www.fishbase.de.
FB_HOSTS = ('www.fishbase.de', 'www.fishbase.se')
FB_TRIES, FB_PAUSE = 4, 5.0  # FishBase answers 500 at times: up to 4 tries, 5 s, 10 s, 15 s apart
# core.js FISHPH: an entry plays on its curated photos alone once it has MIN very easy ones (ease EASY or more; tools/
# fish_judge.py WANT and EARLY, Pierre 2026-11-04: at least 5 very easy photos per circle-1 entry), else with the stopgap's.
MIN, EASY = 5, 4
# The average size of one photo's four files on R2 (a sample of 24 iNaturalist photos already there, 2026-11-05:
# 226 + 93 + 32 + 10 KB), for --plan's volume estimate.
KB_PER_PHOTO = 361
# The tile (Pierre, 2026-11-09, Q321 D4): a TILE px square WebP at TILE_Q, the box plus MARGIN of its longer side on each
# side; kept when the box's longer side fills at least FILL of the square and the box is at least RES px wide in the
# original. TILE_KB: the size of one tile file, for --plan (a mean of 15.2 KB over the first 76 tiles, 2026-11-09).
TILE, TILE_Q, TILE_SUF, MARGIN, FILL, RES, TILE_KB = 360, 72, '-x', 0.10, 0.70, 320, 16
FEATHER = 8  # px of the tile over which a photo edge fades into the blurred band past it (tile_write)


def fish_on(F, f, sid):
    """core.js fishOn: photo f is in play for species sid."""
    o = (F.get('out') or {}).get(f)
    return (F.get('add') or {}).get(f) == sid and not (F.get('seen') or {}).get(f) and not (F.get('exclude') or {}).get(f) and (not o or o == sid)


UNDONE_ADD = re.compile(r'^-a')  # autosort.js fish log code: an auto add Pierre undid (fishUndo writes '-' + the code)


def gone_ids(cur):
    """The photo ids (pid) Pierre decided against: rejected (seen), excluded or moved with Not this (out) in his fish
    curation, an automatic add of the auto-sort he undid (its log code '-a...': autosort.js fishUndo, "the photo waits
    for his decision"; Codex review #674), and the top-level exclude (core.js fishGone)."""
    F = (cur or {}).get('fish') or {}
    undone = {f for day in (F.get('auto') or {}).values() for f, c in (day or {}).items() if UNDONE_ADD.match(str(c))}
    return ({pid(f) for k in ('seen', 'exclude', 'out') for f in (F.get(k) or {})} | {pid(f) for f in undone}
            | {pid(f) for f in (cur or {}).get('exclude') or {}})


def fish_in(F, p, gone):
    """core.js fishIn: game record p is in play. Pierre's own add (fish_on), or a photo that entered automatically (auto:
    a candidate judged sure, a reference photo judged sure like one; Pierre, 2026-11-06, Q180 and Q199; 2026-11-08,
    Q212) that he did not reject, exclude or move (gone: gone_ids)."""
    return fish_on(F, p['f'], p.get('sp')) or (bool(p.get('auto')) and pid(p['f']) not in gone)


def pid(f):
    """The photo's identity across lists (core.js fishPid): i<iNaturalist photo id> or b<FishBase file stem> (a candidate
    fish-<species>-cand-fb-<stem> or a reference or sheet photo fb<stem>)."""
    f = str(f)
    m = re.fullmatch(r'fi(\d+)', f) or re.search(r'-cand-(\d+)[cd]?$', f)
    if m:
        return 'i' + m.group(1)
    m = re.search(r'-cand-fb-(.+)$', f) or re.fullmatch(r'fb(.+)', f)  # a FishBase reference or sheet photo: fb<stem>
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


def tile_tags(jt):
    """The tile rule on a photo's tags (Pierre, 2026-11-09, Q321 D4; the matrix study's T1): profile or slight oblique
    (p, o), whole (1), good light (g: a flash on black included; never dim nor the night livery), colour loss 0 or 1,
    sharp (s), large or medium (l, m), one fish (1), and no juvenile, camouflage or out-of-water flag (j, c, a)."""
    jt = jt or ''
    return (bool(TAGS.match(jt)) and jt[0] in 'po' and jt[1] == '1' and jt[2] == 'g' and jt[3] in '01' and jt[4] == 's'
            and jt[5] in 'lm' and jt[6] == '1' and not set(jt[7:]) & set('jca'))


def box_ok(b):
    """A fish box as judged: [left, top, right, bottom] fractions of the original photo, inside it, not empty."""
    return (isinstance(b, list) and len(b) == 4 and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in b)
            and 0 <= b[0] < b[2] <= 1 and 0 <= b[1] < b[3] <= 1)


def tile_crop(bb, W, H, frame=None):
    """(square, why): the tile's square [l, t, r, b] as fractions of the W x H original, cut around the fish's box bb (the
    same fractions), or None and the reason it is refused: "cut" (the box is not whole inside Pierre's crop frame), "res"
    (the box is under RES px wide in the original), "fill" (the fish's longer side fills under FILL of the square). The
    square: the box's longer side plus MARGIN of it on each side (less, down to none, where the frame's short side is
    shorter), centred on the box, then moved back inside the frame. A fish longer than the frame's short side (a field-guide profile across a wide photo) keeps its square: on that axis
    the square reaches past the frame, as little as it can, and tile_write fills what lies outside with the photo's blurred
    copy, as the app frames every photo (app.css .qph::before); its fractions then pass 0 or 1."""
    fx0, fy0, fx1, fy1 = [v * d for v, d in zip(frame or [0, 0, 1, 1], (W, H, W, H))]
    x0, y0, x1, y1 = [v * d for v, d in zip(bb, (W, H, W, H))]
    tol = 0.01 * max(W, H)  # a box judged to the grid may overrun a crop drawn on the same grid by a hair
    if x0 < fx0 - tol or y0 < fy0 - tol or x1 > fx1 + tol or y1 > fy1 + tol:
        return None, 'cut'
    x0, y0, x1, y1 = max(x0, fx0), max(y0, fy0), min(x1, fx1), min(y1, fy1)
    if x1 - x0 < RES:
        return None, 'res'
    long_ = max(x1 - x0, y1 - y0)
    side = long_ * (1 + 2 * MARGIN)
    short, longf = sorted((fx1 - fx0, fy1 - fy0))
    if side > short:  # the margin gives way to the frame's short side, or, for a fish longer than it, to its long side
        side = short if long_ <= short else max(long_, min(side, longf))
    if long_ / side < FILL:
        return None, 'fill'

    def place(c, a, b):
        """The square's start on one axis: centred on the box (c), inside [a, b] when it fits, else covering all of it."""
        lo, hi = (a, b - side) if side <= b - a else (b - side, a)
        return min(max(c - side / 2, lo), hi)
    sx, sy = place((x0 + x1) / 2, fx0, fx1), place((y0 + y1) / 2, fy0, fy1)
    return [round(sx / W, 4), round(sy / H, 4), round((sx + side) / W, 4), round((sy + side) / H, 4)], None


def tile_write(im, r, out, crop=None):
    """Photo r's tile from its original im (a PIL image), when r carries a box (bb): sets r['xc'] and writes
    out/{f}-x.webp, or sets r['xn'] (tile_crop's reason). Pierre's crop (crop, else r's cr) frames it, his rotation (ro)
    turns it (tools/photos.py square: where the square reaches past the frame, the frame's blurred copy fills it)."""
    r.pop('xc', None)
    r.pop('xn', None)
    if not r.get('bb'):
        return r
    W, H = im.size
    fr = crop or r.get('cr') or [0, 0, 1, 1]
    sq, why = tile_crop(r['bb'], W, H, fr)
    if not sq:
        r['xn'] = why
        return r
    t = photos.square(im, sq, fr, r.get('ro'), TILE, FEATHER)
    t.save(os.path.join(out, r['f'] + TILE_SUF + '.webp'), 'WEBP', quality=TILE_Q, method=5)
    r['xc'] = sq
    return r


def box_of(f, boxes, sug):
    """Photo f's fish box: the rubric's box of a game or reference photo (tools/fish_judge.json boxes), else its candidate
    judgement's (suggest.json fish bb, unless the judge doubted it: unsure bb). None when not judged yet."""
    b = (boxes or {}).get(f)
    if b is None:
        j = (sug or {}).get(f) or {}
        b = j.get('bb') if 'bb' not in (j.get('u') or []) else None
    return list(b) if box_ok(b) else None


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


def judged_sure(jt, e):
    """The rubric's part of a sure judgement, the same for a candidate and a reference photo: valid tags and ease (any
    ease 1-5: the judged ease is the photo's prior difficulty), never an unclear subject (count x) nor a fish out of the
    water (flag a; autosort.js fishSure), and one kind of fish (count 1 or s, never m: rule P3)."""
    jt = jt or ''
    return bool(TAGS.match(jt)) and isinstance(e, int) and 1 <= e <= 5 and jt[6] in '1s' and 'a' not in jt[7:]


def unsure(j):
    """The fields of a judgement the judge doubted that weigh on the photo itself (autosort.js fishUnsure): every unsure
    field but the fish's box, whose doubt only withholds the photo's tile (box_of; Codex review #826)."""
    return [x for x in ((j or {}).get('u') or []) if x != 'bb']


def cand_sure(j):
    """A judged candidate that enters play by itself (suggest.json "fish" {jt, e, k, ph, c, bb, u}; Pierre, 2026-11-06, Q180):
    autosort.js fishSure's add (no unsure field but the box, keep best or alt, never dup) on a sure judgement
    (judged_sure)."""
    if not j or unsure(j) or j.get('k') not in ('best', 'alt'):
        return False
    return judged_sure(j.get('jt'), j.get('e'))


TAGS = re.compile(r'^[pohtd][01][gdn][0-3][smb][lms][1smx][jcapr]*$')  # autosort.js FISH_TAGS


def ref_play(fish, refs, codes):
    """[(species id, reference photo with e and jt)] of the units' reference photos (tools/fish_refs.json, by species)
    judged sure on the candidates' rubric (tools/fish_judge.json codes, the rubric's caps and reference flag: tools/
    fish_judge.py cap; judged_sure), whatever their reference level (Pierre, 2026-11-08, Q212: "we bring them in like
    candidates"; before, only the reference level entered, Q199), in tools/fish_refs.json order. A reference photo has no
    keep or unsure field in its code; the same photo as one already in play stays out, and one on an observation already in
    play enters only once judged against its photos (in_play, keep)."""
    import fish_judge as J
    dim = {t['id'] for t in fish.get('teach') or [] if t.get('dimorph')}
    juv = {t['id']: t.get('juv') for t in fish.get('teach') or []}
    of, _ = entries(fish)
    names = {s['id']: (s.get('name'), s.get('now')) for s in fish.get('species') or []}
    out = []
    for sid, L in (refs or {}).items():
        t = of.get(sid)
        for r in L:
            if not t or r.get('f') not in codes or not r.get('src'):
                continue
            e, jt = J.cap(codes[r['f']], t in dim, J.juv_early(juv.get(t), names.get(sid, ())), r.get('rep'))
            q = {k: v for k, v in r.items() if k != 'for'}
            q.update(e=e, jt=jt)
            if judged_sure(jt, e):
                out.append((sid, q))
    return out


def in_play(cur, cand, sug=None, fish=None, refs=None, codes=None, rkeep=None):
    """[(species id, record, its fish-cand.json species, route)] of every photo in play (Pierre, 2026-11-06, Q180 and
    Q199: one notion of "in play", every route hosted on R2): route None, Pierre's adds (fish_on) that fish-cand.json still
    describes; "cand", the candidates judged sure (cand_sure) he has not decided on (not added, rejected, excluded, moved);
    "ref", the reference photos judged sure like a candidate (ref_play), unless he decided against the same photo. Never
    the same photo twice (pid); a candidate's sure best and alt both enter, as fishSure proposes them. A reference photo
    on an observation already in play (another photo of it) enters too once judged against that observation's photos,
    like a candidate (Pierre, 2026-11-08, Q218: "judge them with the others, see the duplicates, take them out"): keep
    (rkeep: tools/fish_judge.json "keep", {photo: best | alt | dup}) best or alt; one not judged against them yet stays
    out, and a dup stays out whatever comes first. The game draws one observation a question (model.js photoSet), so its photos share one draw."""
    F = (cur or {}).get('fish') or {}
    top = set((cur or {}).get('exclude') or {})
    gone = gone_ids(cur)
    rec = {p['f']: (p, s) for s, L in ((cand or {}).get('cand') or {}).items() for p in L if p.get('f')}
    out, have, obs = [], set(), set()

    def put(sid, p, orig, route):
        out.append((sid, p, orig, route))
        have.add(pid(p['f']))
        obs.add(p.get('o'))
    for f, sid in sorted((F.get('add') or {}).items()):
        if not fish_on(F, f, sid) or f in top or pid(f) in {pid(x) for x in top} or f not in rec or not rec[f][0].get('src'):
            continue
        put(sid, *rec[f], None)
    decided = {f for k in ('add', 'seen', 'exclude', 'out') for f in (F.get(k) or {})}
    for s, L in ((cand or {}).get('cand') or {}).items():
        for p in L:
            f = p.get('f')
            if f and p.get('src') and f not in decided and pid(f) not in gone and pid(f) not in have and cand_sure((sug or {}).get(f)):
                put(s, p, s, 'cand')
    if fish and refs and codes:
        for sid, r in ref_play(fish, refs, codes):
            if pid(r['f']) in gone or pid(r['f']) in have:
                continue  # the same photo: out, always
            if (rkeep or {}).get(r['f']) == 'dup':
                continue  # judged a duplicate of its observation's photos: out, whatever the order (Codex review #715)
            if r.get('o') in obs and (rkeep or {}).get(r['f']) not in ('best', 'alt'):
                continue  # another photo of its observation is in play: in once judged no duplicate of it (Q218)
            put(sid, r, sid, 'ref')
    return out


KEEP = ('f', 'o', 'src', 'a', 'lic', 't')


def record(sid, p, F, sug, orig=None, species=None, route=None):
    """The game record of candidate p in play for species sid (no ar, cr, iv: the download sets them). A photo Pierre moved
    with Not this (orig, its fish-cand.json species, is not sid) is named after its new species (fish.json species: the
    WoRMS accepted name, else the PDF's), never the identification he corrected (Codex review #614). route (in_play):
    "cand" or "ref" for a photo that entered automatically, recorded as auto (core.js fishIn); a reference photo keeps its
    judged e and jt, and from (cover, taxon, fishbase)."""
    if route == 'ref':
        r = {k: p[k] for k in KEEP if k in p}
        r.update(sp=sid, loc=p.get('loc') or 'world', e=int(p['e']), jt=p['jt'], auto='ref')
        for k in ('via', 'rep', 'from', 'own'):
            if p.get(k):
                r[k] = p[k]
        return r
    f, j = p['f'], (sug or {}).get(p['f']) or {}
    r = {k: p[k] for k in KEEP if k in p}
    s = (species or {}).get(sid) or {}
    if orig and orig != sid and (s.get('now') or s.get('name')):
        r['t'] = s.get('now') or s.get('name')
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
    if route:
        r['auto'] = route
    return r


def tier(fish):
    """The download order when a run cannot take every photo (--max): the reference photos first, then the starter
    entries' photos (fish.json start), circle 1's, then the rest (Pierre, 2026-11-06, Q199: starters and reference photos
    first). (record, route) -> a sort key."""
    of, _ = entries(fish)
    start = set(fish.get('start') or [])
    circle = {t['id']: t.get('circle') or 9 for t in fish.get('teach') or []}
    return lambda r, route: (0 if route == 'ref' else 1 if of.get(r['sp']) in start else 2 if circle.get(of.get(r['sp'])) == 1 else 3)


def plan(fish, cur, cand, sug, prev, refs=None, codes=None, crops=None, limit=None, rkeep=None, boxes=None):
    """(todo, keep, wait): the records to download [(record, crop, iv)], the ones already downloaded with the right crop
    {f: record}, and how many more are in play than this run takes (limit: at most that many downloads, tier order).
    prev: the current fish-game.json; refs, codes, crops: tools/fish_refs.json photos and tools/fish_judge.json codes and
    proposed crops (the reference route). A crop: Pierre's, else the pass's proposal for a photo that entered
    automatically (as the auto-sort writes it into his draft: judging/FISH.md "What a sure judgement does").
    boxes: tools/fish_judge.json boxes (box_of). A photo whose tags pass the tile rule and that has a box carries it (bb):
    one to download makes its tile with its four files; one kept whose tile was made (xc) or refused (xn) from the same box
    keeps that; one kept with a new or changed box waits for its tile alone (bb, no xc nor xn: run makes it), within what
    is left of limit after the downloads (the rest lose bb and count in wait, for the next runs)."""
    F = (cur or {}).get('fish') or {}
    old = {p['f']: p for L in ((prev or {}).get('photos') or {}).values() for p in L if p.get('f')}
    species = {s['id']: s for s in (fish or {}).get('species') or []}
    todo, keep = [], {}
    for sid, p, orig, route in in_play(cur, cand, sug, fish, refs, codes, rkeep):
        r, c, o = record(sid, p, F, sug, orig, species, route), crop_of(F, p['f']), old.get(p['f'])
        mine = p['f'] in (F.get('crop') or {})  # Pierre's crop, his full-photo [0, 0, 1, 1] included (Codex review #674)
        if not mine and route == 'cand':
            c = ((sug or {}).get(p['f']) or {}).get('c')
        if not mine and route == 'ref':
            c = (crops or {}).get(p['f'])
        c = list(c) if c and list(c) != [0, 0, 1, 1] else None
        # Pierre's rotation only (the pass proposes none), on the record: download() turns the photo by it.
        photos.mark(r, None, (F.get('rot') or {}).get(p['f']))
        bb = box_of(p['f'], boxes, sug) if tile_tags(r.get('jt')) else None
        if bb:
            r['bb'] = bb
        if o and o.get('src') == r.get('src') and not photos.stale(o, c, r.get('ro')) and o.get('ar'):
            r['ar'] = o['ar']
            if c:
                r['cr'] = c
            if o.get('iv'):
                r['iv'] = o['iv']
            if bb and o.get('bb') == bb:
                for k in ('xc', 'xn'):
                    if k in o:
                        r[k] = o[k]
            keep[p['f']] = r
        else:
            todo.append((r, c, (o.get('iv', 0) + 1) if o else 0, route))
    key = tier(fish or {})
    todo.sort(key=lambda x: key(x[0], x[3]))
    wait = max(0, len(todo) - limit) if limit is not None else 0
    tiles = sorted((r for r in keep.values() if r.get('bb') and not ('xc' in r or 'xn' in r)), key=lambda r: (key(r, r.get('auto')), r['f']))
    room = max(0, limit - len(todo)) if limit is not None else len(tiles)
    for r in tiles[room:]:
        r.pop('bb')  # its tile at a later run
    return [x[:3] for x in todo[:limit]], keep, wait + max(0, len(tiles) - room)


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
    # Each record in the short form (tools/fish_short.py: o and src without their common prefixes; Pierre, 2026-11-09).
    ents = [f'{c(t)}:[\n' + ',\n'.join(c(fish_short.short(p)) for p in L) + '\n]' for t, L in d['photos'].items()]
    return '{' + ',\n'.join(head + ['"photos":{' + (('\n' + ',\n'.join(ents) + '\n') if ents else '') + '}']) + '}\n'


def opener(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()


def fetch(src, get=opener, pause=FB_PAUSE, tries=FB_TRIES):
    """The original's bytes, from an allowed host only; FishBase asked again after a pause when it fails."""
    host = urllib.parse.urlsplit(src).hostname or ''
    if not src.startswith('https://') or host not in HOSTS:
        raise ValueError(f'not an iNaturalist or FishBase photo URL: {src[:80]}')
    n = tries if host in FB_HOSTS else 1
    for k in range(n):
        try:
            return get(src)
        except (urllib.error.URLError, OSError) as e:
            if k == n - 1:
                raise
            print(f'retry {k + 1} in {pause * (k + 1):.0f} s: {src} ({e})')
            time.sleep(pause * (k + 1))


def original(r, get=opener, pause=FB_PAUSE):
    from PIL import Image
    return Image.open(io.BytesIO(fetch(r['src'], get, pause))).convert('RGB')


def download(r, c, out, get=opener, pause=FB_PAUSE):
    """Writes photo r's four files into out (Pierre's crop c, then his rotation r['ro'], applied) and sets its shape ar;
    its tile too when it carries a box (tile_write)."""
    im = original(r, get, pause)
    r['ar'] = photos.write(im, r['f'], out, c, r.get('ro'))  # the shape, as tools/apply_ratios.py measures it
    return tile_write(im, r, out, c)


def tile_only(r, out, get=opener, pause=FB_PAUSE):
    """The tile alone of a photo already downloaded (its box is new or changed): its four files stay as they are."""
    return tile_write(original(r, get, pause), r, out)


def load(root, name, default=None):
    """A JSON file of root; fish-game.json with its records whole (fish_short.full_doc: either form)."""
    p = os.path.join(root, name)
    d = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else default
    return fish_short.full_doc(d) if name == OUT_FILE else d


def inputs(root=ROOT):
    """(fish, curation, candidates, their judgements, reference photos, reference codes, reference crops, reference keeps):
    what plan reads."""
    fish, cur = load(root, 'fish.json'), load(root, 'curation.json', {})
    cand, sug = load(root, 'fish-cand.json', {'cand': {}}), (load(root, 'suggest.json', {}) or {}).get('fish') or {}
    refs = (load(root, os.path.join('tools', 'fish_refs.json'), {}) or {}).get('photos') or {}
    J = load(root, os.path.join('tools', 'fish_judge.json'), {}) or {}
    codes = {f: c for m in (J.get('photos') or {}).values() for f, c in m.items()}
    return fish, cur, cand, sug, refs, codes, J.get('crops') or {}, J.get('keep') or {}


def boxes_in(root=ROOT):
    """tools/fish_judge.json boxes: {photo: [l, t, r, b]}, the fish's box of a photo already judged (judging/FISH.md)."""
    return (load(root, os.path.join('tools', 'fish_judge.json'), {}) or {}).get('boxes') or {}


# At most this many downloads a run (the Candidate photos workflow; FISH_MAX or --max overrides): about 8,300 photos were in
# play on 2026-11-06 (Q180, Q199), and the workflow's run of that day took 9 minutes for Pierre's 3,822 (about 7 a
# second); past it, the rest come at the next runs, the reference photos and the starters first.
MAX = int(os.environ.get('FISH_MAX', '5000'))


def run(out='r2-upload', root=ROOT, get=opener, pause=FB_PAUSE, workers=6, write=True, limit=None):
    """Downloads what is new into out (at most limit photos, MAX by default) and writes fish-game.json; returns
    (downloaded, failed, listed, waiting)."""
    fish, cur, cand, sug, refs, codes, crops, rkeep = inputs(root)
    prev = load(root, OUT_FILE, {'photos': {}})
    todo, keep, wait = plan(fish, cur, cand, sug, prev, refs, codes, crops, MAX if limit is None else limit, rkeep, boxes_in(root))
    os.makedirs(out, exist_ok=True)
    done, failed = 0, []
    # FishBase one at a time, after the rest (it is the host that fails under load).
    fb = [x for x in todo if (urllib.parse.urlsplit(x[0]['src']).hostname or '') in FB_HOSTS]
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
    # The tiles of photos already downloaded whose box is new or changed (plan: bb, no xc nor xn); one that fails loses
    # bb, so the next run tries again.
    # FishBase's one at a time, after the rest, as the downloads above (Codex review #826).
    tl = [r for r in keep.values() if r.get('bb') and not ('xc' in r or 'xn' in r)]
    tfb = [r for r in tl if (urllib.parse.urlsplit(r['src']).hostname or '') in FB_HOSTS]

    def tile_failed(r, e):
        r.pop('bb', None)
        print('tile failed:', r['f'], e)
    with cf.ThreadPoolExecutor(workers) as ex:
        futs = {ex.submit(tile_only, r, out, get, pause): r for r in tl if r not in tfb}
        for fut in cf.as_completed(futs):
            try:
                fut.result()
            except Exception as e:
                tile_failed(futs[fut], e)
    for r in tfb:
        try:
            tile_only(r, out, get, pause)
        except Exception as e:
            tile_failed(r, e)
    d = doc(fish, keep)
    if d['photos'] == (prev or {}).get('photos') and (prev or {}).get('built'):
        d['built'] = prev['built']  # nothing changed: the same bytes, no commit
    if write:
        text = dumps(d)
        p = os.path.join(root, OUT_FILE)
        if not os.path.exists(p) or open(p, encoding='utf-8').read() != text:
            open(p, 'w', encoding='utf-8').write(text)
    return done, failed, sum(len(L) for L in d['photos'].values()), wait


def stopgap_entries(fish, game_photos):
    """The level-1 entries that would still play with the stopgap's photos (fewer than MIN very easy curated ones)."""
    _, order = entries(fish)
    return [t for t in order if sum(1 for p in game_photos.get(t, []) if (p.get('e') or 0) >= EASY) < MIN]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--out', default='r2-upload')
    ap.add_argument('--plan', action='store_true')
    ap.add_argument('--rewrite', action='store_true')
    ap.add_argument('--max', type=int, default=MAX, help='at most this many downloads in this run (FISH_MAX)')
    a = ap.parse_args()
    if a.rewrite:
        d = load(ROOT, OUT_FILE)
        with open(os.path.join(ROOT, OUT_FILE), 'w', encoding='utf-8') as fh:
            fh.write(dumps(d))
        print(f'{OUT_FILE} written again ({sum(len(L) for L in d["photos"].values())} photos)')
        return
    if a.plan:
        fish, cur, cand, sug, refs, codes, crops, rkeep = inputs(ROOT)
        todo, keep, _ = plan(fish, cur, cand, sug, load(ROOT, OUT_FILE, {'photos': {}}), refs, codes, crops, rkeep=rkeep, boxes=boxes_in(ROOT))
        allr = {**keep, **{r['f']: r for r, _, _ in todo}}
        d = doc(fish, allr)
        fb = sum(1 for r, _, _ in todo if r.get('via') == 'fishbase')
        how = {k: sum(1 for r in allr.values() if r.get('auto') == k) for k in ('cand', 'ref')}
        print(f'in play: {len(allr)} photos over {len({r["sp"] for r in allr.values()})} species (Pierre\'s adds '
              f'{len(allr) - how["cand"] - how["ref"]}, candidates judged sure {how["cand"]}, reference photos {how["ref"]}); '
              f'to download: {len(todo)} ({fb} from FishBase), {len(todo) * 4} files, about {len(todo) * KB_PER_PHOTO / 1024:.0f} MB '
              f'(the whole list: about {len(allr) * KB_PER_PHOTO / 1024:.0f} MB on R2); at most {a.max} a run: '
              f'{-(-len(todo) // a.max) if todo else 0} run(s), the reference photos and the starters first')
        tl = sum(1 for r in keep.values() if r.get('bb') and not ('xc' in r or 'xn' in r))
        tw = sum(1 for r, _, _ in todo if r.get('bb'))
        made = sum(1 for r in keep.values() if 'xc' in r)
        print(f'tiles ({TILE} px squares, {TILE_SUF}.webp): {made} made, {sum(1 for r in keep.values() if "xn" in r)} refused; '
              f'to make: {tl} alone (the original fetched again) and {tw} with their download, about '
              f'{(tl + tw) * TILE_KB / 1024:.1f} MB; {sum(1 for r in allr.values() if tile_tags(r.get("jt")) and not r.get("bb"))} '
              'photos pass the tile tags but wait for a box (judging/FISH.md "The fish\'s box")')
        st = stopgap_entries(fish, d['photos'])
        print(f'entries still with the stopgap photos (fewer than {MIN} very easy curated ones): {len(st)}: ' + ', '.join(st))
        return
    import slot
    slot.guard('tools/fish_game.py')  # one heavy run at a time on the machine (rule W24)
    done, failed, n, wait = run(a.out, limit=a.max)
    print(f'fish: downloaded {done} into {a.out}/ (upload: tools/r2_sync.sh {a.out}), {len(failed)} failed; {n} photos in {OUT_FILE}'
          + (f'; {wait} more wait for the next run' if wait else ''))


if __name__ == '__main__':
    main()
