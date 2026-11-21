# Which objects of the R2 bucket's img/ nothing uses any more (ROADMAP "Photos out of the repo"; Linear REE-6): READ ONLY.
# It deletes nothing and has no way to: it reads a listing of the bucket (tools/r2_list.sh writes it, rclone lsjson) and
# the repository, and writes a report. Deleting is a separate step Pierre has seen the list for first.
#
#   python3 tools/r2_unused.py --listing r2-listing.json --out r2-unused [--min-age-hours 72] [--label main@abc123]
#                                                       [--root DIR] [--now 2026-11-21T00:00:00Z]
#
# Writes in --out: report.md (the report), unused.tsv (key, bytes, reason: the objects nothing uses), doubtful.tsv (key,
# bytes, reason, detail: the objects kept off that list, with why), report.json (the figures). Exit 1 when the listing holds
# no img/ object (a wrong bucket or key, never a clean bucket); the report is then not written.
#
# What the repository uses (the "want" side, as tools/r2_sync.sh builds it):
#   - the four files of every photo that lives on R2 only (photos.py online(): src and no r), and its tile -x.webp when
#     it has one (photos.py tiles(): xc);
#   - every file name in git's img/ (r2_sync.sh copies them all).
# An object that is none of these is kept off the unused list, never deleted on a guess, when:
#   young              modified less than --min-age-hours ago (approved-photos.yml uploads before it commits data.json)
#   odd-name           under img/ but not <photo><size>.webp
#   restorable-excluded  its photo is in data/excluded.json: the admin's Restore puts the record back and expects the files
#   remote-record      a record names it with r: 1 (still to be downloaded, files may be uploaded ahead)
#   named-<group>      the photo's name appears in a tracked text file: app (code, pages, workflows), judging, curation
#                      (curation.json), data (data/, root json), docs (docs/, tests/, tools/ ...)
# What is left is unused: 'stale-tile' (a -x.webp of a live photo whose record has no tile) or 'orphan' (a photo no record
# and no file of the repository names). Objects outside img/ are counted per prefix, never judged.
import argparse, datetime, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import photos  # noqa: E402  (records, online, tiles: the want side, one definition)

SIZE_SUFFIXES = ('-m', '-s', '-t', '-x')
TEXT_EXT = {'.js', '.mjs', '.cjs', '.json', '.html', '.css', '.md', '.py', '.sh', '.yml', '.yaml', '.txt', '.webmanifest',
            '.svg', '.csv', '.gs'}
SKIP_DIRS = {'.git', 'node_modules', '.claude', '.cache', 'r2-upload', 'r2-unused', 'img'}
GROUPS = ('app', 'judging', 'curation', 'data', 'docs')  # strongest first
REASON_TEXT = {
    'young': 'modified recently: an upload whose data commit may not have landed yet',
    'unknown-age': 'no modification time in the listing',
    'odd-name': 'under img/ but not <photo><size>.webp',
    'restorable-excluded': "its photo is in data/excluded.json: the admin's Restore puts the record back and expects the files",
    'remote-record': 'a record names it with r: 1 (not downloaded yet)',
    'named-app': "the photo's name is in the app's code, pages or workflows",
    'named-judging': "the photo's name is in the judging files",
    'named-curation': "the photo's name is in curation.json",
    'named-data': "the photo's name is in a data file",
    'named-docs': "the photo's name is in docs, tests or tools",
    'stale-tile': 'a tile (-x) of a live photo whose record has no tile',
    'orphan': 'no record and no file of the repository names this photo',
}


def parse_time(s):
    """rclone's ModTime (ISO 8601, nanoseconds, Z) as an aware datetime, None when unreadable."""
    if not isinstance(s, str): return None
    s = re.sub(r'(\.\d{6})\d+', r'\1', s.strip())
    if s.endswith('Z'): s = s[:-1] + '+00:00'
    try:
        t = datetime.datetime.fromisoformat(s)
    except ValueError:
        return None
    return t if t.tzinfo else t.replace(tzinfo=datetime.timezone.utc)


def group_of(rel):
    """Which kind of file a tracked path is, for "the photo's name is in ..."."""
    parts = rel.split('/')
    if rel == 'curation.json': return 'curation'
    if parts[0] == 'judging': return 'judging'
    if parts[0] == 'data' or (len(parts) == 1 and rel.endswith('.json')): return 'data'
    if len(parts) == 1 or parts[0] == '.github' or rel.startswith('tools/og/'): return 'app'
    return 'docs'


def repo_view(root=ROOT):
    """What the repository uses and knows: the records' photos, the git img/ file names, the restorable and the remote."""
    recs = photos.records(root)
    img = os.path.join(root, 'img')
    git = set(os.listdir(img)) if os.path.isdir(img) else set()
    try:
        restorable = set(json.load(open(os.path.join(root, 'data', 'excluded.json'), encoding='utf-8')).get('photos') or {})
    except (OSError, ValueError):
        restorable = set()
    # A tile is wanted when r2_sync.sh wants it (photos.tiles) or when the app asks for it (app.js tileSrc: xc and no r).
    tiles = photos.tiles(recs) | {f for f, L in recs.items() if any(p.get('xc') and not p.get('r') for p in L)}
    return {
        'online': photos.online(recs), 'tiles': tiles, 'git': git, 'restorable': restorable,
        'remote': {f for f, L in recs.items() if any(p.get('r') for p in L)}, 'known': set(recs),
    }


def parse_key(name, known):
    """(photo, suffix) of a file name <photo><size>.webp, None when it is not one. A name that is itself a known photo
    wins over a split (a photo whose name ends in -s)."""
    m = re.fullmatch(r'([A-Za-z0-9_-]+)\.webp', name)
    if not m: return None
    base = m.group(1)
    if base in known: return base, ''
    for s in SIZE_SUFFIXES:
        if base.endswith(s) and len(base) > len(s): return base[:-2], s
    return base, ''


def scan_names(root, stems, skip=()):
    """{stem: {group: [first paths]}} for the stems named in a text file of root (a whole-word match: letters,
    digits, - and _ , so a stem is never found inside a longer name). skip: paths (files or folders) this run reads or
    writes, never scanned: the listing names every object of the bucket, so it would name every photo (Codex review #1367)."""
    out = {}
    if not stems: return out
    tok = re.compile(r'[A-Za-z0-9_-]+')
    skip = [os.path.abspath(s) for s in skip]
    for dp, dns, fns in os.walk(root):
        dns[:] = sorted(d for d in dns if d not in SKIP_DIRS and os.path.abspath(os.path.join(dp, d)) not in skip)
        for fn in sorted(fns):
            if os.path.splitext(fn)[1] not in TEXT_EXT: continue
            p = os.path.join(dp, fn)
            if os.path.abspath(p) in skip: continue
            try:
                text = open(p, encoding='utf-8', errors='ignore').read()
            except OSError:
                continue
            rel = os.path.relpath(p, root).replace(os.sep, '/')
            hit = set()
            for t in set(tok.findall(text)):
                if t in stems: hit.add(t)
                for s in SIZE_SUFFIXES:
                    if t.endswith(s) and t[:-2] in stems: hit.add(t[:-2])
            for st in hit:
                L = out.setdefault(st, {}).setdefault(group_of(rel), [])
                if len(L) < 3: L.append(rel)
    return out


def classify(listing, view, named, now, min_age_hours=72):
    """Every object of the listing as {key, size, state, reason, detail}; state is used, unused, doubtful or outside.
    named: scan_names' answer for the photos of the objects that nothing wants."""
    out = []
    known = view['known'] | view['online'] | view['restorable'] | view['remote']
    for o in listing:
        if o.get('IsDir'): continue
        key = o.get('Path') or o.get('Name') or ''
        size = int(o.get('Size') or 0)
        r = {'key': key, 'size': size, 'state': None, 'reason': None, 'detail': ''}
        out.append(r)
        if not key.startswith('img/') or '/' in key[4:]:
            r['state'], r['reason'] = ('outside', 'outside-img') if not key.startswith('img/') else ('doubtful', 'odd-name')
            continue
        name = key[4:]
        pk = parse_key(name, known)
        if name in view['git']:
            r['state'], r['reason'] = 'used', 'in-git'
            continue
        if not pk:
            r['state'], r['reason'] = 'doubtful', 'odd-name'
            continue
        stem, suf = pk
        r['stem'] = stem
        if stem in view['online'] and (suf != '-x' or stem in view['tiles']):
            r['state'], r['reason'] = 'used', 'wanted'
            continue
        t = parse_time(o.get('ModTime'))
        if t is None:
            r['state'], r['reason'] = 'doubtful', 'unknown-age'
            continue
        age = (now - t).total_seconds() / 3600
        if age < min_age_hours:
            r['state'], r['reason'], r['detail'] = 'doubtful', 'young', f'{age:.1f} h old'
            continue
        if stem in view['online']:
            r['state'], r['reason'] = 'unused', 'stale-tile'
            continue
        if stem in view['restorable']:
            r['state'], r['reason'] = 'doubtful', 'restorable-excluded'
            continue
        if stem in view['remote']:
            r['state'], r['reason'] = 'doubtful', 'remote-record'
            continue
        g = named.get(stem)
        if g:
            top = next(x for x in GROUPS if x in g)
            r['state'], r['reason'], r['detail'] = 'doubtful', 'named-' + top, ', '.join(g[top])
            continue
        r['state'], r['reason'] = 'unused', 'orphan'
    return out


def missing_wanted(listing, view):
    """The files the repository wants on R2 (as tools/r2_sync.sh) that the listing lacks."""
    have = {(o.get('Path') or '') for o in listing}
    want = set()
    for f in view['online']:
        want.update(f'img/{f}{s}.webp' for s in ('',) + SIZE_SUFFIXES[:3])
    want.update(f'img/{f}-x.webp' for f in view['tiles'])
    want.update(f'img/{n}' for n in view['git'] if n.endswith('.webp'))
    return sorted(want - have)


def mib(n):
    return f'{n / 1048576:.1f} MiB'


def prefix_of(r):
    """Top-level folder of a key, and for img/ the leading letters of the photo's name (the genus, fish, seaslug, imr...)."""
    k = r['key']
    top = k.split('/', 1)[0] + '/' if '/' in k else '(bucket root)'
    m = re.match(r'[A-Za-z]+', k[4:]) if k.startswith('img/') else None
    return top, (m.group(0).lower() if m else '(other)') if k.startswith('img/') else ''


def tally(rows, keyf):
    t = {}
    for r in rows:
        k = keyf(r)
        a = t.setdefault(k, {'objects': 0, 'bytes': 0, 'used': 0, 'unused': 0, 'doubtful': 0, 'outside': 0})
        a['objects'] += 1
        a['bytes'] += r['size']
        a[r['state']] += 1
    return t


def summary(rows):
    """The figures: totals per state, per reason, per prefix."""
    by = {}
    for r in rows:
        a = by.setdefault((r['state'], r['reason']), [0, 0])
        a[0] += 1
        a[1] += r['size']
    return {
        'objects': len(rows), 'bytes': sum(r['size'] for r in rows),
        'by_state': {s: {'objects': sum(v[0] for (a, _), v in by.items() if a == s),
                         'bytes': sum(v[1] for (a, _), v in by.items() if a == s)} for s in ('used', 'unused', 'doubtful', 'outside')},
        'by_reason': {f'{s}/{r}': {'objects': v[0], 'bytes': v[1]} for (s, r), v in sorted(by.items())},
        'by_top_prefix': tally(rows, lambda r: prefix_of(r)[0]),
        'by_img_prefix': tally([r for r in rows if r['key'].startswith('img/')], lambda r: prefix_of(r)[1]),
    }


def table(head, rows):
    return '\n'.join(['| ' + ' | '.join(head) + ' |', '|' + '---|' * len(head)] + ['| ' + ' | '.join(map(str, r)) + ' |' for r in rows])


def render(rows, summ, missing, label, now, min_age_hours, listed_at=None):
    """The report, as Markdown."""
    L = ['# R2 unused files (read-only listing)', '',
         f'Repository state: {label or "unknown"}. Report made {now:%Y-%m-%d %H:%M} UTC. Objects younger than {min_age_hours} h are kept off the unused list.',
         '**Nothing was deleted or changed: this run only lists.**', '', '## Totals', '']
    st = summ['by_state']
    L.append(table(['State', 'Objects', 'Size'], [(s, st[s]['objects'], mib(st[s]['bytes'])) for s in ('used', 'unused', 'doubtful', 'outside')]
                   + [('all', summ['objects'], mib(summ['bytes']))]))
    L += ['', '## Unused: nothing in the repository uses these (the list to show Pierre)', '']
    un = sorted((r for r in rows if r['state'] == 'unused'), key=lambda r: (-r['size'], r['key']))
    if not un:
        L.append('None.')
    else:
        for reason in ('orphan', 'stale-tile'):
            part = [r for r in un if r['reason'] == reason]
            if part:
                L += [f'- **{reason}**: {len(part)} objects, {mib(sum(r["size"] for r in part))}. {REASON_TEXT[reason]}.']
        L += ['', 'The 30 largest (all of them in `unused.tsv`):', '',
              table(['Object', 'Bytes', 'Why'], [(r['key'], r['size'], r['reason']) for r in un[:30]])]
    L += ['', '## Doubtful: kept off the unused list', '']
    db = [r for r in rows if r['state'] == 'doubtful']
    if not db:
        L.append('None.')
    else:
        reasons = {}
        for r in db: reasons.setdefault(r['reason'], []).append(r)
        L.append(table(['Why kept', 'Objects', 'Size', 'Meaning'],
                       [(k, len(v), mib(sum(x['size'] for x in v)), REASON_TEXT.get(k, '')) for k, v in sorted(reasons.items(), key=lambda kv: -sum(x['size'] for x in kv[1]))]))
        L += ['', 'Examples (all in `doubtful.tsv`):', '']
        for k, v in sorted(reasons.items()):
            L.append(f'- **{k}**: ' + ', '.join(f'`{x["key"]}`' + (f' ({x["detail"]})' if x['detail'] else '') for x in sorted(v, key=lambda x: x['key'])[:5]))
    L += ['', '## Per top-level prefix', '']
    tp = summ['by_top_prefix']
    L.append(table(['Prefix', 'Objects', 'Size', 'Used', 'Unused', 'Doubtful'],
                   [(k, v['objects'], mib(v['bytes']), v['used'], v['unused'], v['doubtful']) for k, v in sorted(tp.items(), key=lambda kv: -kv[1]['bytes'])]))
    L += ['', '## Inside img/ by the leading letters of the name (genus, fish, seaslug, imr ...), the 40 largest', '']
    ip = summ['by_img_prefix']
    L.append(table(['Name starts with', 'Objects', 'Size', 'Used', 'Unused', 'Doubtful'],
                   [(k, v['objects'], mib(v['bytes']), v['used'], v['unused'], v['doubtful']) for k, v in sorted(ip.items(), key=lambda kv: (-kv[1]['bytes'], kv[0]))[:40]]))
    if len(ip) > 40:
        L.append(f'\n{len(ip) - 40} smaller prefixes are in `report.json`.')
    L += ['', '## Sanity check', '']
    if missing:
        L.append(f'{len(missing)} file(s) the repository wants on R2 are absent from the listing (tools/r2_sync.sh would fail on them): '
                 + ', '.join(f'`{m}`' for m in missing[:10]) + ('' if len(missing) <= 10 else ' ...'))
    else:
        L.append('Every file the repository wants on R2 is in the listing.')
    return '\n'.join(L) + '\n'


def write_all(out, rows, summ, missing, label, now, min_age_hours):
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, 'report.md'), 'w', encoding='utf-8') as f:
        f.write(render(rows, summ, missing, label, now, min_age_hours))
    with open(os.path.join(out, 'unused.tsv'), 'w', encoding='utf-8') as f:
        for r in sorted((r for r in rows if r['state'] == 'unused'), key=lambda r: r['key']):
            f.write(f'{r["key"]}\t{r["size"]}\t{r["reason"]}\n')
    with open(os.path.join(out, 'doubtful.tsv'), 'w', encoding='utf-8') as f:
        for r in sorted((r for r in rows if r['state'] == 'doubtful'), key=lambda r: r['key']):
            f.write(f'{r["key"]}\t{r["size"]}\t{r["reason"]}\t{r["detail"]}\n')
    with open(os.path.join(out, 'report.json'), 'w', encoding='utf-8') as f:
        json.dump({**summ, 'label': label, 'made': f'{now:%Y-%m-%dT%H:%M:%SZ}', 'min_age_hours': min_age_hours,
                   'missing_wanted': len(missing)}, f, indent=1, sort_keys=True)
        f.write('\n')


def analyse(listing, root=ROOT, now=None, min_age_hours=72, skip=()):
    """The whole comparison: (rows, summary, missing) for a listing and a repository checkout; skip: files and folders
    of this run (the listing, the output) that the text scan leaves out."""
    now = now or datetime.datetime.now(datetime.timezone.utc)
    view = repo_view(root)
    # Only the photos of objects nothing wants need the (slower) text scan.
    first = classify(listing, view, {}, now, min_age_hours)
    need = {r['stem'] for r in first if r['state'] == 'unused' and r['reason'] == 'orphan' and 'stem' in r}
    rows = classify(listing, view, scan_names(root, need, skip), now, min_age_hours)
    return rows, summary(rows), missing_wanted(listing, view)


def main(argv=None):
    ap = argparse.ArgumentParser(description='Compare an R2 listing with what the repository uses (read only).')
    ap.add_argument('--listing', required=True, help='rclone lsjson -R output of the bucket')
    ap.add_argument('--out', required=True, help='folder for report.md, unused.tsv, doubtful.tsv, report.json')
    ap.add_argument('--root', default=ROOT)
    ap.add_argument('--min-age-hours', type=float, default=72)
    ap.add_argument('--label', default='')
    ap.add_argument('--now', default='', help='the report time (tests)')
    a = ap.parse_args(argv)
    now = parse_time(a.now) if a.now else datetime.datetime.now(datetime.timezone.utc)
    try:
        listing = json.load(open(a.listing, encoding='utf-8'))
    except (OSError, ValueError) as e:
        print(f'cannot read the listing: {e}', file=sys.stderr)
        return 1
    if not isinstance(listing, list) or not any(str(o.get('Path', '')).startswith('img/') for o in listing if isinstance(o, dict)):
        print('the listing holds no img/ object: wrong bucket or key? no report written', file=sys.stderr)
        return 1
    rows, summ, missing = analyse(listing, a.root, now, a.min_age_hours, skip=(a.listing, a.out))
    write_all(a.out, rows, summ, missing, a.label, now, a.min_age_hours)
    st = summ['by_state']
    print(f'{summ["objects"]} objects ({mib(summ["bytes"])}): ' + ', '.join(f'{s} {st[s]["objects"]} ({mib(st[s]["bytes"])})' for s in st)
          + f'; {len(missing)} wanted file(s) absent from the listing')
    return 0


if __name__ == '__main__':
    sys.exit(main())
