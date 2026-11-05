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
def drop_excluded(d):
    """Removes excluded photos from every photo list in data.json (views, more, course, cand, cmp). A candidate the
    auto-sort excluded (reason 'auto', admin.js autoRun) keeps its entry in the candidate lists (cand.json, which players
    never download): Pierre can undo each auto decision one by one (rule A1), and its Undo brings the candidate
    back only if its genus, source URL and credit are still there (Codex review #400). Excluded, it is never shown nor
    counted as waiting (admin.js rawCands, fetch_local.py waiting)."""
    keep = lambda L: [p for p in L if not excluded(p.get('f'))]
    keep_cand = lambda L: [p for p in L if not excluded(p.get('f')) or EX.get(p.get('f')) == 'auto']
    for g in [*d.get('gen', {}).values(), *((d.get('x') or {}).get('gen') or {}).values()]:
        for k in ('views', 'more'):
            for v, L in (g.get(k) or {}).items(): g[k][v] = keep(L)
    for k in ('course', 'cand'):
        for g, L in (d.get(k) or {}).items(): d[k][g] = (keep_cand if k == 'cand' else keep)(L)
    if 'cmp' in d: d['cmp'] = keep(d['cmp'])
    return d
