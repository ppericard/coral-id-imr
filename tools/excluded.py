# Photos Pierre excluded in admin.html (curation.json "exclude" = {f: reason}). Import scripts skip them so an
# excluded photo never comes back, as a new candidate or under a new name: match on f and on the iNat photo id in f.
import json, os, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
try: EX = json.load(open(f'{R}/curation.json')).get('exclude') or {}
except (OSError, ValueError): EX = {}
def pid(f):
    """iNat photo id: the number after the last '-', ignoring a trailing c or d (crops)."""
    m = re.fullmatch(r'(\d+)[cd]?', str(f).rsplit('-', 1)[-1])
    return m and m.group(1)
IDS = {pid(f) for f in EX} - {None}
# Set aside by the pre-sort (admin.js aside, keep both identical; Pierre 2026-11-03): candidates the judging agent found
# unusable, comparison images, near-duplicates (of another candidate or of a live photo of the observation), photos of
# several corals and Poor photos, with no doubt (judging/BRIEF.md, rules learnt from 85 photos Pierre rejected). They
# are not shown to Pierre, so they do not count as waiting either (Codex review #388: they would fill the caps and stop
# new candidates from being fetched).
try: SUG = json.load(open(f'{R}/suggest.json')).get('cand') or {}
except (OSError, ValueError): SUG = {}
def set_aside(f):
    j = SUG.get(f) or {}
    return (j.get('g') in ('exclude', 'cmp') or j.get('k') == 'dup' or bool(j.get('m')) or j.get('q') == 1) and not j.get('u')
def excluded(f=None, photo_id=None):
    return f in EX or (photo_id is not None and str(photo_id) in IDS) or (f is not None and pid(f) in IDS)
# What a Pierre exclusion removed (drop_excluded), kept so that his Restore (admin Genera › Excluded) brings it back
# (restore_unexcluded; Pierre, 2026-11-06: an un-excluded photo must return by itself). excluded.json = {"photos": {f:
# {"in": "gen" | "x" | "course" | "cand" | "cmp", "g": genus, "k": "views" | "more", "v": view, "i": index, "p": record}}},
# written by tools/fetch_local.py tidy() (the Candidate photos workflow). Seeded from git history by
# tools/apply_excluded_archive.py for the photos removed before it existed.
GONE_PATH = f'{R}/excluded.json'


def _lists(d):
    """Every photo list of data.json with where it is: (place, list)."""
    for where, G in (('gen', d.get('gen') or {}), ('x', (d.get('x') or {}).get('gen') or {})):
        for g, x in G.items():
            for k in ('views', 'more'):
                for v, L in (x.get(k) or {}).items(): yield {'in': where, 'g': g, 'k': k, 'v': v}, L
    for k in ('course', 'cand'):
        for g, L in (d.get(k) or {}).items(): yield {'in': k, 'g': g}, L
    if 'cmp' in d: yield {'in': 'cmp'}, d['cmp']


def drop_excluded(d, gone=None):
    """Removes excluded photos from every photo list in data.json (views, more, course, cand, cmp). A candidate the
    auto-sort excluded (reason 'auto', admin.js autoRun) keeps its entry in the candidate lists (cand.json, which players
    never download): Pierre can undo each auto decision one by one (rule A1), and its Undo brings the candidate
    back only if its genus, source URL and credit are still there (Codex review #400). Excluded, it is never shown nor
    counted as waiting (admin.js rawCands, fetch_local.py waiting). gone (excluded.json "photos"): each record removed is
    kept there with its place, for restore_unexcluded."""
    for at, L in list(_lists(d)):
        out = [p for p in L if excluded(p.get('f')) and not (at['in'] == 'cand' and EX.get(p.get('f')) == 'auto')]
        if not out: continue
        if gone is not None:
            for p in out: gone[p['f']] = {**at, 'i': L.index(p), 'p': p}
        L[:] = [p for p in L if p not in out]
    return d


def files_ok(p, img=None):
    """The site can show photo record p: it has an online original (src: R2, else iNaturalist), or its file is in img/
    (an IMR lecture photo: git is its only backup, and its exclusion removed the files; tools/photos.py, run by the
    workflow, makes the smaller sizes from it)."""
    if p.get('src'): return True
    from photos import IMG
    return os.path.exists(os.path.join(img or IMG, p['f'] + '.webp'))


def restore_unexcluded(d, gone):
    """Puts back, at its place, every photo of gone (excluded.json "photos") that curation.json no longer excludes (Pierre's
    Restore), and forgets it. A view gone since is recreated; a photo already back is only forgotten. A candidate comes
    back marked restored (fetch_local.py drop_share_alike spares it: a share-alike one Pierre restores stays a candidate
    he can add, Codex review #628). Held back, still in gone: a photo the site could not show (files_ok: no online
    original and its file gone from img/, until python3 tools/apply_excluded_archive.py --files brings it back from git
    history: the workflow runs it) and one whose genus left data.json. Returns (restored, held) photo ids."""
    have = {p.get('f') for _, L in _lists(d) for p in L}
    back, held = [], []
    for f, r in sorted(gone.items(), key=lambda x: x[1].get('i', 0)):
        if excluded(f): continue
        if f in have:
            del gone[f]
            continue
        w = r['in']
        G = d['gen'] if w == 'gen' else ((d.get('x') or {}).get('gen') or {}) if w == 'x' else None
        if not files_ok(r['p']) or (G is not None and r['g'] not in G):
            held.append(f)
            continue
        if G is not None: L = G[r['g']].setdefault(r['k'], {}).setdefault(r['v'], [])
        elif w == 'cmp': L = d.setdefault('cmp', [])
        else: L = d.setdefault(w, {}).setdefault(r['g'], [])
        L.insert(min(r.get('i', len(L)), len(L)), {**r['p'], 'restored': 1} if w == 'cand' else r['p'])
        del gone[f]
        back.append(f)
    return back, held


def load_gone(path=None):
    try: return json.load(open(path or GONE_PATH, encoding='utf-8')).get('photos') or {}
    except (OSError, ValueError): return {}


def save_gone(gone, path=None):
    from datajson import dump  # one photo per line (datajson SPLIT)
    dump({'photos': dict(sorted(gone.items()))}, path or GONE_PATH)
