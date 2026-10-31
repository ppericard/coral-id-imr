# Checks and imports the judging agent's results (judging/out/<Genus>.json, format: judging/schema.json, rules:
# judging/AGENTS.md) as SUGGESTIONS. Pierre's choices (curation.json) are never read for writing, never changed.
#   python3 tools/judging_import.py --check [Genus ...]   check only, write nothing (exit 1 on any error)
#   python3 tools/judging_import.py [--by astra] [Genus ...]   check, then import every genus that passes
# Import writes:
#   suggest.json   quality ratings (kept so tools/photo_quality.py re-runs keep them); per photo: view / genus / multi suggestions; near-duplicates; candidates worth adding
#                  (listed one at a time in admin.html Triage: Accept runs the normal admin action, Dismiss is kept)
#   forms.json     "gf" {f: IMR growth form letter, + 'p' when polyps are extended} (dashed first guess in the admin);
#                  unsure forms also go to "unsure". The legacy Coral Finder key "form" is left untouched.
#   quality.json   "q" {f: 1-3} (dashed first guess in the admin)
#   picks.json     "feat" {genus: {view: [f]}} (used only where Pierre has not picked Featured photos)
# Re-importing a genus replaces that genus's previous suggestions; other genera are kept.
import json, os, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
def load(p, d=None):
    try: return json.load(open(P(p)))
    except FileNotFoundError: return d
def dump(p, o, indent=None):
    with open(P(p), 'w') as fh: json.dump(o, fh, indent=indent, ensure_ascii=False, separators=None if indent else (',', ':')); fh.write('\n')

VIEWS, FIELDS = ('wide', 'medium', 'macro'), {'form', 'polyps', 'quality', 'view', 'genus', 'multi', 'unsure', 'note'}
M = load('judging/manifest.json')
if not M: sys.exit('judging/manifest.json is missing: run python3 tools/judging_manifest.py first.')
GEN, PH = M['genera'], {p['f']: p for p in M['photos']}
# The IMR growth forms (IMR Lecture 6), defined once in forms.json "forms" and copied into the manifest.
FORMS = [x['id'] for x in M.get('forms') or []] + ['x']
if len(FORMS) < 2: sys.exit('No growth forms in the manifest: forms.json "forms" is missing; re-run tools/judging_manifest.py.')

def check(n):
    """Returns (errors, warnings, judgments or None) for genus n."""
    E, W = [], []
    j = load(f'judging/out/{n}.json')
    if j is None: return [f'{n}: no judging/out/{n}.json'], W, None
    if not isinstance(j, dict): return [f'{n}: the file must hold one JSON object'], W, None
    extra = set(j) - {'genus', 'photos', 'duplicates', 'featured', 'add'}
    if extra: E.append(f'{n}: unknown top-level keys {sorted(extra)}')
    if j.get('genus') != n: E.append(f'{n}: "genus" must be "{n}" (the file name)')
    mine = [f for f, p in PH.items() if p['genus'] == n]
    J = j.get('photos') or {}
    if not isinstance(J, dict): return E + [f'{n}: "photos" must be an object {{photo id: judgment}}'], W, None
    views = GEN[n]['views']
    for f, x in J.items():
        p, at = PH.get(f), f'{n}/{f}'
        if not p: E.append(f'{at}: not in the manifest (typo, or an excluded photo)'); continue
        if p['genus'] != n: E.append(f'{at}: belongs to {p["genus"]} in the manifest; judge it in that file'); continue
        if not isinstance(x, dict): E.append(f'{at}: must be an object'); continue
        bad = set(x) - FIELDS
        if bad: E.append(f'{at}: unknown fields {sorted(bad)}')
        if 'form' in x and x['form'] not in FORMS: E.append(f'{at}: form must be ONE of {" ".join(FORMS)}, not {x["form"]!r}')
        if 'polyps' in x and x['polyps'] is not True: E.append(f'{at}: polyps is true or omitted')
        if 'form' not in x and p['source'] != 'book' and 'form' not in p.get('pierre', {}): E.append(f'{at}: form missing')
        if x.get('quality') not in (1, 2, 3) and 'quality' not in p.get('pierre', {}): E.append(f'{at}: quality must be 1, 2 or 3')
        if x.get('view') not in views: E.append(f'{at}: view must be one of {views}' + (' (two-view genus: no medium)' if len(views) == 2 and x.get('view') == 'medium' else ''))
        g = x.get('genus')
        if g is not None:
            if g == n: E.append(f'{at}: omit "genus" when the photo shows {n}')
            elif g not in GEN and g not in ('cmp', 'exclude'): E.append(f'{at}: genus {g!r} is not on the IMR list (use another listed genus, "cmp" or "exclude")')
            if p['source'] == 'imr' and g not in ('exclude', None): E.append(f'{at}: IMR lecture photos keep the genus IMR gives them; put a note with unsure ["genus"] instead')
        if 'multi' in x and x['multi'] is not True: E.append(f'{at}: multi is true or omitted')
        u = x.get('unsure', [])
        if not isinstance(u, list) or set(u) - {'form', 'polyps', 'quality', 'view', 'genus', 'multi'}: E.append(f'{at}: unsure must be a list of field names')
        if (g or u) and not x.get('note'): E.append(f'{at}: note required when genus is set or unsure is not empty')
        if len(x.get('note', '')) > 140: E.append(f'{at}: note longer than 140 characters')
    missing = [f for f in mine if f not in J]
    if missing: E.append(f'{n}: {len(missing)} photo(s) not judged yet, e.g. {missing[:3]}')
    vw = lambda f: (J.get(f) or {}).get('view') or PH[f]['view']
    live = lambda f: PH[f]['status'] == 'live'
    for i, dup in enumerate(j.get('duplicates') or []):
        S = [dup.get('keep'), *dup.get('drop', [])]
        if not all(f in PH and PH[f]['genus'] == n for f in S): E.append(f'{n}: duplicates[{i}] lists photos not in {n}'); continue
        if len(set(S)) != len(S): E.append(f'{n}: duplicates[{i}] repeats a photo')
        if any(PH[f]['source'] == 'imr' for f in dup['drop']) and PH[dup['keep']]['source'] != 'imr': E.append(f'{n}: duplicates[{i}] drops an IMR photo for a non-IMR one (IMR first)')
    for v, L in (j.get('featured') or {}).items():
        if v not in views: E.append(f'{n}: featured.{v}: not a view of this genus'); continue
        if len(L) > 3 or len(set(L)) != len(L): E.append(f'{n}: featured.{v}: at most 3 distinct photos')
        for f in L:
            p = PH.get(f)
            if not p or p['genus'] != n: E.append(f'{n}: featured.{v}: {f} is not a photo of {n}'); continue
            if p['source'] == 'book': E.append(f'{n}: featured.{v}: {f} is a Coral Finder book photo (never featured)')
            if not live(f) and f not in (j.get('add') or []): E.append(f'{n}: featured.{v}: {f} is a candidate not listed in "add"')
            if vw(f) != v: E.append(f'{n}: featured.{v}: {f} is judged as view {vw(f)}')
            if p.get('multi') or (J.get(f) or {}).get('multi'): E.append(f'{n}: featured.{v}: {f} shows several corals')
            if p['status'] == 'hidden': E.append(f'{n}: featured.{v}: {f} is hidden by Pierre')
            if any(f in d.get('drop', []) for d in j.get('duplicates') or []): E.append(f'{n}: featured.{v}: {f} is listed as a duplicate to drop')
        q = lambda f: (J.get(f) or {}).get('quality') or PH[f].get('pierre', {}).get('quality') or 2
        for tier in ('imr', 'pierre'):
            good = [f for f in PH if PH[f]['genus'] == n and live(f) and PH[f]['source'] == tier and vw(f) == v and q(f) == 3
                    and not PH[f].get('multi') and not (J.get(f) or {}).get('multi') and f not in L]
            lower = [f for f in L if f in PH and PH[f]['source'] not in ('imr', 'pierre')[:('imr', 'pierre').index(tier) + 1]]
            if good and lower: W.append(f'{n}: featured.{v}: picks {lower[0]} ({PH[lower[0]]["source"]}) while Good {tier} photo {good[0]} is left out (IMR first, then Pierre)')
    for f in j.get('add') or []:
        p = PH.get(f)
        if not p or p['genus'] != n: E.append(f'{n}: add: {f} is not a photo of {n}')
        elif p['status'] != 'candidate': E.append(f'{n}: add: {f} is not a candidate')
        elif (J.get(f) or {}).get('genus'): E.append(f'{n}: add: {f} is judged as another genus or excluded')
    return E, W, j

def main():
    a = sys.argv[1:]
    only_check = '--check' in a
    by = a[a.index('--by') + 1] if '--by' in a else 'astra'
    names = [x for x in a if not x.startswith('--') and x != by] or [n for n in GEN if os.path.exists(P('judging', 'out', f'{n}.json'))]
    unknown = [n for n in names if n not in GEN]
    if unknown: sys.exit(f'Unknown genus: {unknown}')
    if not names: sys.exit('Nothing in judging/out/ yet.')
    ok, bad = {}, []
    for n in names:
        E, W, j = check(n)
        for w in W: print('warning:', w)
        for e in E: print('ERROR:', e)
        if E: bad.append(n)
        else: ok[n] = j
    done = sum(1 for n in GEN if os.path.exists(P('judging', 'out', f'{n}.json')))
    print(f'{len(ok)} genus file(s) pass, {len(bad)} fail{": " + ", ".join(bad) if bad else ""}. {done}/{len(GEN)} genera have a file.')
    if only_check or not ok: sys.exit(1 if bad else 0)
    imp(ok, by)
    sys.exit(1 if bad else 0)

def imp(ok, by):
    S = load('suggest.json', {}) or {}
    S = {'v': 1, 'note': 'Suggestions from an outside judging agent, imported by tools/judging_import.py. Shown in admin.html Triage; '
         'Pierre accepts (normal admin action) or dismisses (curation.json "seen"). Never edit by hand.',
         'by': S.get('by', {}), 'photo': S.get('photo', {}), 'quality': S.get('quality', {}), 'dup': S.get('dup', []), 'add': S.get('add', {})}
    F = load('forms.json', {}); Q = load('quality.json', {}); K = load('picks.json', {'v': 1, 'feat': {}})
    F.setdefault('gf', {}); Q.setdefault('q', {}); K.setdefault('feat', {})
    unsure = set(F.get('unsure', []))
    stamp = datetime.date.today().isoformat()
    for n, j in ok.items():
        mine = {f for f, p in PH.items() if p['genus'] == n}
        for k in ('photo', 'quality'):
            for f in list(S[k]):
                if f in mine: del S[k][f]
        S['dup'] = [x for x in S['dup'] if x.get('genus') != n]
        S['add'].pop(n, None)
        for f, x in j['photos'].items():
            p, me, u = PH[f], PH[f].get('pierre', {}), set(x.get('unsure', []))
            if 'form' in x and 'form' not in me:
                F['gf'][f] = x['form'] + ('p' if x.get('polyps') else '')
                (unsure.add if 'form' in u else unsure.discard)(f)
            if 'quality' in x and 'quality' not in me: Q['q'][f] = S['quality'][f] = x['quality']
            s = {}
            if x['view'] != p['view'] and p['status'] == 'live': s['view'] = x['view']
            if x.get('genus') and 'genus' not in me and not me.get('hidden'): s['genus'] = x['genus']
            if x.get('multi') and not p.get('multi'): s['multi'] = True
            if s:
                s['from'] = n
                if u & set(s): s['unsure'] = sorted(u & set(s))
                if x.get('note'): s['note'] = x['note']
                S['photo'][f] = s
        for d in j.get('duplicates') or []:
            S['dup'].append({'genus': n, 'keep': d['keep'], 'f': d['drop'], **({'note': d['note']} if d.get('note') else {})})
        add = {f: j['photos'][f]['view'] for f in j.get('add') or []}
        if add: S['add'][n] = add
        feat = {v: L for v, L in (j.get('featured') or {}).items() if L}
        if feat: K['feat'][n] = feat
        else: K['feat'].pop(n, None)
        S['by'][n] = {'by': by, 'at': stamp}
    S['photo'] = dict(sorted(S['photo'].items())); S['quality'] = dict(sorted(S['quality'].items()))
    if unsure: F['unsure'] = sorted(unsure)
    else: F.pop('unsure', None)
    F['gf'] = dict(sorted(F['gf'].items())); Q['q'] = dict(sorted(Q['q'].items()))
    dump('suggest.json', S, 1); dump('quality.json', Q); dump('picks.json', K)
    # forms.json: big {photo: value} maps one entry per line (readable diffs), every other key on one line.
    big = lambda v: isinstance(v, dict) and len(v) > 20 and all(isinstance(y, str) for y in v.values())
    with open(P('forms.json'), 'w') as fh:
        fh.write('{' + ',\n'.join(f'{json.dumps(k)}:' + ('{\n' + ',\n'.join(f'{json.dumps(a)}:{json.dumps(b)}' for a, b in v.items()) + '\n}' if big(v) else json.dumps(v, ensure_ascii=False)) for k, v in F.items()) + '}\n')
    print(f'Imported {len(ok)} genus file(s): {len(S["photo"])} photo suggestions, {len(S["dup"])} duplicate sets, '
          f'{sum(len(v) for v in S["add"].values())} candidates to add in suggest.json; forms.json, quality.json and picks.json updated.')

if __name__ == '__main__':
    main()
