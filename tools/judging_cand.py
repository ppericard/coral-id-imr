# Candidate pass of the judging agent (Pierre, 2026-11-01: "a judging agent that pre-sorts by looking at the zoom level,
# the quality, with the aim of keeping real diversity"; run ON DEMAND, never automatically, over the candidates waiting).
# The agent looks at every candidate photo of a genus (iNaturalist photos waiting in cand.json, whole observations) and
# writes judging/cand/<Genus>.json (rules: judging/BRIEF.md, "Candidate pass"). Suggestions only: the admin swiper
# shows the best photo of each view of each observation first, then the other angles, and near-duplicates, poor photos
# and other genera last. Nothing is deleted or added: Pierre still swipes every photo himself.
#
#   python3 tools/judging_cand.py sheets [Genus ...]   download the photos (judging/cand/img/, not in git) and build one
#                                                      contact sheet per observation (judging/cand/sheets/<Genus>/); prints
#                                                      the list to judge: sheet, tile number -> photo id. The photos of the
#                                                      observation already live or added follow, marked "live" (not to
#                                                      judge: a candidate near-identical to one is a dup, Pierre 2026-11-03)
#   python3 tools/judging_cand.py big <photo id>       download the 1024 px version, for a closer look
#   python3 tools/judging_cand.py detail <photo id>... full-size photo: one sheet per photo, the whole frame and three
#                                                      100% crops (the two sharpest areas, the centre), to judge quality
#                                                      at full size as Pierre does (2026-11-03), and a 10% grid to read
#                                                      a crop box off (judging/cand/detail/)
#   python3 tools/judging_cand.py todo                 genera with candidates not judged yet (also shown in the admin)
#   python3 tools/judging_cand.py --check [Genus ...]  check judging/cand/<Genus>.json, write nothing (exit 1 on error)
#   python3 tools/judging_cand.py [Genus ...]          check, then import every genus that passes into suggest.json "cand"
#
# suggest.json "cand" {photo: {v view, q quality 1-3, k best|alt|dup, g other genus|cmp|exclude, m several corals,
# fm IMR growth form (+ "p" polyps extended), u unsure fields, n note, c suggested crop [l, t, r, b]}}; "by" {genus: {cand: {by, at, n}}}. Read only by
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
# rule C4: the polyps flag only for the Coral Finder "extended by day" genera, never on a macro photo.
POLYPS = {'Alveopora', 'Duncanopsammia', 'Goniopora', 'Heliofungia', 'Plerogyra', 'Tubastraea'}
FIELDS = {'view', 'quality', 'keep', 'form', 'polyps', 'multi', 'genus', 'unsure', 'note', 'crop'}
# Crop calibration (2026-11-03, blind test on 79 of Pierre's crops): the agent's boxes cut about twice as much as his
# (it kept 57% of the area, he keeps about 75%); halving each trim brought the overlap with his box from 0.75 to 0.86.
# The import applies it; re-measure on his corrections (admin) before changing it.
CROP_K = 0.5
X = C.get('exclude', {})

def views(n): return ['wide', 'macro'] if (D['gen'].get(n) or {}).get('levels') == 2 else list(VIEWS)

def cands(n):
    """Candidates still waiting for genus n: iNaturalist photos in cand.json/data.json not added, rejected or excluded."""
    k = (C.get('genera') or {}).get(n, {})
    add, seen = k.get('add') or {}, C.get('seen') or {}
    return [p for p in (D.get('cand') or {}).get(n, []) if not p.get('cf') and p['f'] not in add and p['f'] not in X and f'cand:{p["f"]}' not in seen]

def obs_of(p): return p.get('o') or p['f']

LIVE = None
def live(o):
    """Photos of observation o already live (data.json views, any genus) or added from the candidates (curation add):
    on the observation's sheet so that a candidate near-identical to one of them is marked dup (rule R1, 2026-11-03)."""
    global LIVE
    if LIVE is None:
        LIVE = defaultdict(dict)
        for n, g in D['gen'].items():
            for k in ('views', 'more'):
                for v, L in (g.get(k) or {}).items():
                    for p in L:
                        if p.get('o') and p['f'] not in X: LIVE[p['o']].setdefault(p['f'], (p, v))
            add = ((C.get('genera') or {}).get(n) or {}).get('add') or {}
            for p in (D.get('cand') or {}).get(n, []):
                if p['f'] in add and p.get('o') and p['f'] not in X: LIVE[p['o']].setdefault(p['f'], (p, add[p['f']] or p.get('vg') or '?'))
    return list(LIVE.get(o, {}).values())

def groups(n):
    G = OrderedDict()
    for p in cands(n): G.setdefault(obs_of(p), []).append(p)
    return G

def url(p, size):
    s = p.get('src') or ''
    return s.replace('/original.', f'/{size}.') if p.get('r') else None

def fetch(p, size='medium'):
    out = P('judging', 'cand', 'img', f'{p["f"]}{ {"large": "-l", "original": "-o"}.get(size, "")}.jpg')
    if os.path.exists(out) and os.path.getsize(out): return out
    os.makedirs(os.path.dirname(out), exist_ok=True)
    u = url(p, size)
    if not u and not os.path.exists(P('img', f'{p["f"]}.webp')) and p.get('src'):  # an added photo not downloaded here
        u = p['src'].replace('/original.', f'/{size}.')
    if u:
        with urllib.request.urlopen(u, timeout=60) as r: b = r.read()
        open(out, 'wb').write(b)
    else:  # a local photo (img/<f>.webp)
        from PIL import Image
        Image.open(P('img', f'{p["f"]}.webp')).convert('RGB').save(out, quality=88)
    return out

def sheet(n, o, L, nlive=0):
    """One contact sheet per observation: tiles 1, 2, 3... (at most 3 per row), each 440 px high; the last nlive tiles
    are photos already live or added, marked "live" instead of a number."""
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
            if k > len(L) - nlive:
                d.rectangle([x, y * (H + GAP), x + 104, y * (H + GAP) + 52], fill=(200, 0, 0))
                d.text((x + 10, y * (H + GAP) + 4), 'live', fill=(255, 255, 255), font=font)
            else:
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
            Lv = live(o)
            s = sheet(n, o, L + [p for p, _ in Lv], len(Lv))
            print(f'{s}  {o}')
            for i, p in enumerate(L, 1):
                print(f'  {i} {p["f"]}  ({p.get("loc", "")}{", iNat label " + p["t"] if p.get("t") and p.get("t") != n else ""})')
            for p, v in Lv: print(f'  live {p["f"]}  ({v})')

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
            E.append(f'{at}: polyps only for {", ".join(sorted(POLYPS))}, never on a macro photo (rule C4): omit it')
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
        c = x.get('crop')
        if c is not None and not (isinstance(c, list) and len(c) == 4 and all(isinstance(v, (int, float)) for v in c) and 0 <= c[0] < c[2] <= 1 and 0 <= c[1] < c[3] <= 1):
            E.append(f'{at}: crop must be [left, top, right, bottom] fractions of the photo, 0 <= left < right <= 1, 0 <= top < bottom <= 1')
    missing = [f for f in mine if f not in J]
    if missing: E.append(f'{n}: {len(missing)} candidate(s) not judged yet, e.g. {missing[:3]}')
    # Exactly one "best" per observation and view among the candidates that show this genus; none only when every one of
    # them is a dup and the observation has photos already live or added (a near-duplicate of a live photo, rule R1).
    grp = defaultdict(list)
    for f, x in J.items():
        if f in mine and isinstance(x, dict) and not x.get('genus') and x.get('view') in vs: grp[(obs_of(mine[f]), x['view'])].append(f)
    for k, L in grp.items():
        b = best.get(k, [])
        if not b and live(k[0]) and all(J[f].get('keep') == 'dup' for f in L): continue
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
            c = x.get('crop')
            if c and c != [0, 0, 1, 1]:
                l, t, r, b = c  # calibrated toward Pierre's crops (CROP_K): each trim kept at CROP_K of its size
                c = [round(l * CROP_K, 3), round(t * CROP_K, 3), round(1 - (1 - r) * CROP_K, 3), round(1 - (1 - b) * CROP_K, 3)]
                if (c[2] - c[0]) * (c[3] - c[1]) < 0.97: e['c'] = c  # a trim of a few % is no crop
            Sc[f] = e
        S['by'].setdefault(n, {})['cand'] = {'by': BY, 'at': stamp, 'n': len(j['photos'])}
    S['cand'] = dict(sorted(Sc.items()))
    with open(P('suggest.json'), 'w') as fh: json.dump(S, fh, indent=1, ensure_ascii=False); fh.write('\n')
    print(f'Imported {len(ok)} genus file(s): {len(S["cand"])} candidates judged in suggest.json "cand".')
    sys.exit(1 if bad else 0)

def cmd_detail(fs):
    """Full-size look (Pierre, 2026-11-03: "I open the photo large and look at how sharp it is"): per photo, a sheet with
    the whole frame (10% grid, to read a crop box off) and three 100% crops: the two sharpest areas and the centre."""
    from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageStat
    Image.MAX_IMAGE_PIXELS = 300_000_000
    for f in fs:
        p = next((p for L in (D.get('cand') or {}).values() for p in L if p['f'] == f), None)
        if not p: print(f'Unknown candidate {f}'); continue
        im = ImageOps.exif_transpose(Image.open(fetch(p, 'original'))).convert('RGB')
        W, H = im.size
        T = 400 if min(W, H) > 1200 else 256
        edges = im.convert('L').filter(ImageFilter.FIND_EDGES)
        tiles = sorted(((ImageStat.Stat(edges.crop((x, y, x + T, y + T))).mean[0], x, y)
                        for y in range(0, max(1, H - T), T // 2) for x in range(0, max(1, W - T), T // 2)), reverse=True)
        picks = []
        for v, x, y in tiles:
            if all(abs(x - a) > T or abs(y - b) > T for _, a, b in picks): picks.append((v, x, y))
            if len(picks) == 2: break
        picks.append((0, W // 2 - T // 2, H // 2 - T // 2))
        ov = im.copy(); ov.thumbnail((1200, 700)); s = ov.width / W
        d = ImageDraw.Draw(ov)
        for k in range(1, 10):
            d.line([(ov.width * k // 10, 0), (ov.width * k // 10, ov.height)], fill=(255, 0, 255))
            d.line([(0, ov.height * k // 10), (ov.width, ov.height * k // 10)], fill=(255, 0, 255))
        for (_, x, y), col in zip(picks, [(255, 0, 0), (0, 255, 0), (255, 255, 0)]):
            d.rectangle([x * s, y * s, (x + T) * s, (y + T) * s], outline=col, width=2)
        S = Image.new('RGB', (max(ov.width, 3 * T + 20), ov.height + 10 + T), (30, 30, 30))
        S.paste(ov, (0, 0))
        for k, (_, x, y) in enumerate(picks): S.paste(im.crop((x, y, x + T, y + T)), (k * (T + 10), ov.height + 10))
        out = P('judging', 'cand', 'detail', f'{f}.jpg')
        os.makedirs(os.path.dirname(out), exist_ok=True)
        S.save(out, quality=88)
        print(os.path.relpath(out, ROOT), f'{W}x{H}')

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
    if rest[:1] in (['sheets'], ['detail']):
        import slot; slot.guard('tools/judging_cand.py')  # one heavy run at a time on the machine (rule W24)
    if rest[:1] == ['sheets']: cmd_sheets(rest[1:] or [n for n in D['gen'] if cands(n)])
    elif rest[:1] == ['big']:
        p = next((p for L in (D.get('cand') or {}).values() for p in L if p['f'] == rest[1]), None)
        print(os.path.relpath(fetch(p, 'large'), ROOT) if p else f'Unknown candidate {rest[1]}')
    elif rest[:1] == ['detail']: cmd_detail(rest[1:])
    elif rest[:1] == ['todo']: cmd_todo()
    else: cmd_import(rest, '--check' in a)
