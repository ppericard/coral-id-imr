# Candidate pass of the judging agent (Pierre, 2026-11-01: "a judging agent that pre-sorts by looking at the zoom level,
# the quality, with the aim of keeping real diversity"; run ON DEMAND, never automatically, over the candidates waiting).
# The agent looks at every candidate photo of a genus (iNaturalist photos waiting in cand.json, whole observations) and
# writes judging/cand/<Genus>.json (rules: judging/AGENTS.md, "Candidate pass"). Suggestions only: the admin swiper
# shows the best photo of each view of each observation first, then the other angles, and near-duplicates, poor photos
# and other genera last. Nothing is deleted or added: Pierre still swipes every photo himself.
#
#   python3 tools/judging_cand.py sheets [Genus ...]   download the photos (judging/cand/img/, not in git) and build one
#                                                      contact sheet per observation (judging/cand/sheets/<Genus>/); prints
#                                                      the list to judge: sheet, tile number -> photo id
#   python3 tools/judging_cand.py big <photo id>       download the 1024 px version, for a closer look
#   python3 tools/judging_cand.py todo                 genera with candidates not judged yet (also shown in the admin)
#   python3 tools/judging_cand.py --check [Genus ...]  check judging/cand/<Genus>.json, write nothing (exit 1 on error)
#   python3 tools/judging_cand.py [Genus ...]          check, then import every genus that passes into suggest.json "cand"
#
# suggest.json "cand" {photo: {v view, q quality 1-3, k best|alt|dup, g other genus|cmp|exclude, m several corals,
# fm IMR growth form (+ "p" polyps extended), u unsure fields, n note}}; "by" {genus: {cand: {by, at, n}}}. Read only by
# admin.html (players never download it). Re-importing a genus replaces its candidates' entries; the rest is kept.
import json, os, sys, datetime, urllib.request, io
from collections import defaultdict, OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
sys.path.insert(0, P('tools'))
from datajson import load_all

def load(p, d=None):
    try: return json.load(open(P(p)))
    except FileNotFoundError: return d

D, C = load_all(), load('curation.json', {})
# The Coral Finder's extra genera (data.json x: at Dauin, not on the IMR list) have candidates too, as in admin.js.
D['gen'] = {**D['gen'], **((D.get('x') or {}).get('gen') or {})}
FORMS = [x['id'] for x in load('forms.json', {}).get('forms', [])] + ['x']
VIEWS = ('wide', 'medium', 'macro')
KEEP = ('best', 'alt', 'dup')
# AGENTS.md rule 4: the polyps flag only for the Coral Finder "extended by day" genera, never on a macro photo.
POLYPS = {'Alveopora', 'Duncanopsammia', 'Goniopora', 'Heliofungia', 'Plerogyra', 'Tubastraea'}
FIELDS = {'view', 'quality', 'keep', 'form', 'polyps', 'multi', 'genus', 'unsure', 'note'}
X = C.get('exclude', {})

def views(n): return ['wide', 'macro'] if (D['gen'].get(n) or {}).get('levels') == 2 else list(VIEWS)

def cands(n):
    """Candidates still waiting for genus n: iNaturalist photos in cand.json/data.json not added, rejected or excluded."""
    k = (C.get('genera') or {}).get(n, {})
    add, seen = k.get('add') or {}, C.get('seen') or {}
    return [p for p in (D.get('cand') or {}).get(n, []) if not p.get('cf') and p['f'] not in add and p['f'] not in X and f'cand:{p["f"]}' not in seen]

def obs_of(p): return p.get('o') or p['f']

def groups(n):
    G = OrderedDict()
    for p in cands(n): G.setdefault(obs_of(p), []).append(p)
    return G

def url(p, size):
    s = p.get('src') or ''
    return s.replace('/original.', f'/{size}.') if p.get('r') else None

def fetch(p, size='medium'):
    out = P('judging', 'cand', 'img', f'{p["f"]}{"-l" if size == "large" else ""}.jpg')
    if os.path.exists(out) and os.path.getsize(out): return out
    os.makedirs(os.path.dirname(out), exist_ok=True)
    u = url(p, size)
    if u:
        with urllib.request.urlopen(u, timeout=60) as r: b = r.read()
        open(out, 'wb').write(b)
    else:  # a local photo (img/<f>.webp)
        from PIL import Image
        Image.open(P('img', f'{p["f"]}.webp')).convert('RGB').save(out, quality=88)
    return out

def sheet(n, o, L):
    """One contact sheet per observation: tiles 1, 2, 3... (at most 3 per row), each 440 px high."""
    from PIL import Image, ImageDraw, ImageFont
    H, GAP = 440, 8
    ims = []
    for p in L:
        try: im = Image.open(fetch(p)).convert('RGB')
        except Exception as e:
            print(f'  could not load {p["f"]}: {e}'); im = Image.new('RGB', (H, H), (90, 90, 90))
        ims.append(im.resize((max(1, round(im.width * H / im.height)), H)))
    rows = [ims[i:i + 3] for i in range(0, len(ims), 3)]
    W = max(sum(i.width for i in r) + GAP * (len(r) - 1) for r in rows)
    S = Image.new('RGB', (W, len(rows) * H + GAP * (len(rows) - 1)), (255, 255, 255))
    d = ImageDraw.Draw(S)
    try: font = ImageFont.truetype('DejaVuSans-Bold.ttf', 40)
    except OSError: font = ImageFont.load_default()
    k = 0
    for y, r in enumerate(rows):
        x = 0
        for im in r:
            k += 1
            S.paste(im, (x, y * (H + GAP)))
            d.rectangle([x, y * (H + GAP), x + 54, y * (H + GAP) + 52], fill=(0, 0, 0))
            d.text((x + 14, y * (H + GAP) + 4), str(k), fill=(255, 255, 0), font=font)
            x += im.width + GAP
    out = P('judging', 'cand', 'sheets', n, f'{o.rsplit("/", 1)[-1]}.jpg')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    S.save(out, quality=85)
    return os.path.relpath(out, ROOT)

def cmd_sheets(names):
    for n in names:
        G = groups(n)
        if not G: continue
        print(f'## {n}: {sum(len(L) for L in G.values())} photos in {len(G)} observations; views {views(n)}')
        for o, L in G.items():
            s = sheet(n, o, L)
            print(f'{s}  {o}')
            for i, p in enumerate(L, 1):
                print(f'  {i} {p["f"]}  ({p.get("loc", "")}{", iNat label " + p["t"] if p.get("t") and p.get("t") != n else ""})')

def check(n):
    E, W = [], []
    j = load(f'judging/cand/{n}.json')
    if j is None: return [f'{n}: no judging/cand/{n}.json'], W, None
    if not isinstance(j, dict) or not isinstance(j.get('photos'), dict): return [f'{n}: must be {{"genus": ..., "photos": {{photo id: judgment}}}}'], W, None
    if set(j) - {'genus', 'photos'}: E.append(f'{n}: unknown top-level keys {sorted(set(j) - {"genus", "photos"})}')
    if j.get('genus') != n: E.append(f'{n}: "genus" must be "{n}" (the file name)')
    mine = {p['f']: p for p in cands(n)}
    J, vs = j['photos'], views(n)
    best = defaultdict(list)
    for f, x in J.items():
        at = f'{n}/{f}'
        if f not in mine: E.append(f'{at}: not a candidate waiting for {n} (typo, or already added, rejected or excluded)'); continue
        if not isinstance(x, dict): E.append(f'{at}: must be an object'); continue
        if set(x) - FIELDS: E.append(f'{at}: unknown fields {sorted(set(x) - FIELDS)}')
        if x.get('view') not in vs: E.append(f'{at}: view must be one of {vs}' + (' (two-view genus: no medium)' if x.get('view') == 'medium' else ''))
        if x.get('quality') not in (1, 2, 3): E.append(f'{at}: quality must be 1, 2 or 3')
        if x.get('form') not in FORMS: E.append(f'{at}: form must be ONE of {" ".join(FORMS)}, not {x.get("form")!r}')
        for b in ('polyps', 'multi'):
            if b in x and x[b] is not True: E.append(f'{at}: {b} is true or omitted')
        if x.get('polyps') and (n not in POLYPS or x.get('view') == 'macro'):
            E.append(f'{at}: polyps only for {", ".join(sorted(POLYPS))}, never on a macro photo (AGENTS.md rule 4): omit it')
        g = x.get('genus')
        if g is not None:
            if g == n: E.append(f'{at}: omit "genus" when the photo shows {n}')
            elif g not in D['gen'] and g not in ('cmp', 'exclude'): E.append(f'{at}: genus {g!r} is not on the IMR list (another listed genus, "cmp" or "exclude")')
            if 'keep' in x: E.append(f'{at}: omit "keep" when "genus" is set')
        elif x.get('keep') not in KEEP: E.append(f'{at}: keep must be one of {KEEP}')
        elif x['keep'] == 'best': best[(obs_of(mine[f]), x.get('view'))].append(f)
        u = x.get('unsure', [])
        if not isinstance(u, list) or set(u) - {'form', 'polyps', 'quality', 'view', 'genus', 'multi', 'keep'}: E.append(f'{at}: unsure must be a list of field names')
        if (g or u) and not x.get('note'): E.append(f'{at}: note required when genus is set or unsure is not empty')
        if len(x.get('note', '')) > 140: E.append(f'{at}: note longer than 140 characters')
    missing = [f for f in mine if f not in J]
    if missing: E.append(f'{n}: {len(missing)} candidate(s) not judged yet, e.g. {missing[:3]}')
    # Exactly one "best" per observation and view among the photos that show this genus.
    grp = defaultdict(list)
    for f, x in J.items():
        if f in mine and isinstance(x, dict) and not x.get('genus') and x.get('view') in vs: grp[(obs_of(mine[f]), x['view'])].append(f)
    for k, L in grp.items():
        b = best.get(k, [])
        if len(b) != 1: E.append(f'{n}: observation {k[0]}, view {k[1]}: {len(b)} photos marked best ({", ".join(b) or "none"}); exactly one: {", ".join(L)}')
    return E, W, j

def cmd_import(names, only_check):
    names = names or sorted(x[:-5] for x in os.listdir(P('judging', 'cand')) if x.endswith('.json')) if os.path.isdir(P('judging', 'cand')) else names
    bad_names = [n for n in names if n not in D['gen']]
    if bad_names: sys.exit(f'Unknown genus: {bad_names}')
    if not names: sys.exit('Nothing in judging/cand/ yet.')
    ok, bad = {}, []
    for n in names:
        E, W, j = check(n)
        for w in W: print('warning:', w)
        for e in E: print('ERROR:', e)
        (bad.append(n) if E else ok.__setitem__(n, j))
    print(f'{len(ok)} genus file(s) pass, {len(bad)} fail{": " + ", ".join(bad) if bad else ""}.')
    if only_check or not ok: sys.exit(1 if bad else 0)
    S = load('suggest.json', {}) or {}
    S.setdefault('v', 1); S.setdefault('by', {})
    for k in ('photo', 'quality', 'add'): S.setdefault(k, {})
    S.setdefault('dup', [])
    S.setdefault('note', 'Suggestions from an outside judging agent, imported by tools/judging_import.py and tools/judging_cand.py. '
                 'Shown in admin.html; Pierre accepts or dismisses. Never edit by hand.')
    Sc = S.setdefault('cand', {})
    stamp = datetime.date.today().isoformat()
    for n, j in ok.items():
        for p in (D.get('cand') or {}).get(n, []): Sc.pop(p['f'], None)
        for f, x in j['photos'].items():
            e = {'v': x['view'], 'q': x['quality']}
            if x.get('genus'): e['g'] = x['genus']
            else: e['k'] = x['keep']
            if x.get('multi'): e['m'] = 1
            e['fm'] = x['form'] + ('p' if x.get('polyps') else '')
            if x.get('unsure'): e['u'] = sorted(x['unsure'])
            if x.get('note'): e['n'] = x['note']
            Sc[f] = e
        S['by'].setdefault(n, {})['cand'] = {'by': BY, 'at': stamp, 'n': len(j['photos'])}
    S['cand'] = dict(sorted(Sc.items()))
    with open(P('suggest.json'), 'w') as fh: json.dump(S, fh, indent=1, ensure_ascii=False); fh.write('\n')
    print(f'Imported {len(ok)} genus file(s): {len(S["cand"])} candidates judged in suggest.json "cand".')
    sys.exit(1 if bad else 0)

def cmd_todo():
    Sc = (load('suggest.json', {}) or {}).get('cand', {})
    T = [(n, sum(1 for p in cands(n) if p['f'] not in Sc), len(cands(n))) for n in D['gen']]
    T = [t for t in T if t[1]]
    for n, a, b in T: print(f'{n}: {a} of {b} not judged')
    print(f'{sum(t[1] for t in T)} candidates not judged in {len(T)} genera.')

if __name__ == '__main__':
    a = sys.argv[1:]
    BY = a[a.index('--by') + 1] if '--by' in a else 'claude'
    rest = [x for x in a if not x.startswith('--') and x != BY]
    if rest[:1] == ['sheets']: cmd_sheets(rest[1:] or [n for n in D['gen'] if cands(n)])
    elif rest[:1] == ['big']:
        p = next((p for L in (D.get('cand') or {}).values() for p in L if p['f'] == rest[1]), None)
        print(os.path.relpath(fetch(p, 'large'), ROOT) if p else f'Unknown candidate {rest[1]}')
    elif rest[:1] == ['todo']: cmd_todo()
    else: cmd_import(rest, '--check' in a)
