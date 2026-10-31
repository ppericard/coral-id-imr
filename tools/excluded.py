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
def excluded(f=None, photo_id=None):
    return f in EX or (photo_id is not None and str(photo_id) in IDS) or (f is not None and pid(f) in IDS)
def drop_excluded(d):
    """Removes excluded photos from every photo list in data.json (views, more, course, cand, cmp)."""
    keep = lambda L: [p for p in L if not excluded(p.get('f'))]
    for g in d.get('gen', {}).values():
        for k in ('views', 'more'):
            for v, L in (g.get(k) or {}).items(): g[k][v] = keep(L)
    for k in ('course', 'cand'):
        for g, L in (d.get(k) or {}).items(): d[k][g] = keep(L)
    if 'cmp' in d: d['cmp'] = keep(d['cmp'])
    return d
