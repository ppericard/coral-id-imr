#!/usr/bin/env python3
"""Measured agent effort of this project's merged PRs, so estimates cite PRs instead of guessing.

  python3 tools/effort.py --table                    medians and 25-75% range of agent time per type and size band
  python3 tools/effort.py --like 1084,1082           the measured times of the cited PRs
  python3 tools/effort.py --estimate TYPE SIZE       measured median and range + the 5 closest PRs to cite
  python3 tools/effort.py --check FILE.md            fails on an effort figure ("3 h", "2-4 agent hours", "days") with no #NNN

Data: the last ~300 merged PRs of ppericard/coral-id-imr, through `gh api` (REST), cached under the user's cache
directory (never in the repository): $XDG_CACHE_HOME/coral-id-imr/effort or ~/.cache/coral-id-imr/effort. A merged
PR's details never change, so each is fetched once; the list of merged PRs is re-read after an hour (or --refresh).

Agent time = the branch's first commit to the head commit's checks going green (the best proxy: the agent is done when
the checks pass; Codex rounds and their fixes fall inside it). Open-to-merge is shown apart: it includes the wait for
the merge train. Types: fix, feature, study, content, engine, sheet, admin, docs, tooling. Size bands from lines
changed: XS <= 20, S <= 100, M <= 400, L <= 1500, XL above.
"""
import argparse
import json
import math
import os
import re
import statistics
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

REPO = 'ppericard/coral-id-imr'
LIMIT = 300
LIST_TTL = 3600
TYPES = ['fix', 'feature', 'study', 'content', 'engine', 'sheet', 'admin', 'docs', 'tooling']
BANDS = [('XS', 20), ('S', 100), ('M', 400), ('L', 1500), ('XL', math.inf)]
BAND_NAMES = [b for b, _ in BANDS]
# The geometric centre of each band, to rank the closest PRs by size (XS and XL get an assumed edge).
BAND_CENTRE = {'XS': 8, 'S': 45, 'M': 200, 'L': 780, 'XL': 3000}

ENGINE_FILES = {'core.js', 'model.js', 'quiz.js'}
DATA_RE = re.compile(r'(^|/)(img|judging|fonts)/|\.(json|txt|csv|webp|avif|jpg|jpeg|png|svg)$')
FIX_TITLE_RE = re.compile(r'\b(fix(es|ed)?|bug|broken|regression|hotfix|never|no longer|stops?|wrong|crash(es)?)\b', re.I)
FIX_LABELS = {'bug', 'fix', 'bugfix'}


# ---------------------------------------------------------------- classification (pure, tested offline)

def file_kind(path):
    """One category per changed file: study, docs, tooling, content, sheet, engine, admin or app."""
    if path.startswith('docs/reviews/'):
        return 'study'
    if path.startswith('docs/') or path in ('AGENTS.md', 'CLAUDE.md', 'README.md', 'LICENSE'):
        return 'docs'
    if path.endswith('Code.gs'):
        return 'sheet'
    if path in ENGINE_FILES or path.startswith('core/'):  # core/: core.js's parts (tools/sync_core.py)
        return 'engine'
    if path.startswith('admin'):
        return 'admin'
    if path.startswith(('tools/', 'tests/', '.github/', '.claude/')):
        return 'data' if DATA_RE.search(path) and path.startswith('tools/') and path.endswith('.json') else 'tooling'
    if path.startswith('proto/') or re.search(r'\.(js|css|html|webmanifest)$', path):
        return 'app'
    if DATA_RE.search(path):
        return 'data'
    return 'app'


def categories(paths):
    """The set of types the files touch (data files count as content), for `--estimate content+tooling`."""
    out = set()
    for p in paths:
        k = file_kind(p)
        out.add('content' if k == 'data' else 'feature' if k == 'app' else k)
    return out


def classify(title, paths, labels=(), changes=None):
    """The type of a PR from its title, the files it changes and its labels. `changes` ({path: lines changed}, optional)
    tells a sheet PR from an engine PR whose Code.gs change is only the copy of core.js (tools/sync_core.py) and the
    VERSION line the integrator assigns."""
    kinds = {file_kind(p) for p in paths}
    if changes and 'sheet' in kinds and 'core.js' in changes:
        gs = sum(v for k, v in changes.items() if k.endswith('Code.gs'))
        if gs - changes['core.js'] <= 6:  # measured: a pure copy is core.js + 4 (the VERSION line and the markers)
            kinds.discard('sheet')
            kinds.add('engine')
    if not kinds:
        kinds = {'docs'}
    labels = {l.lower() for l in labels}
    code = kinds & {'app', 'engine', 'admin', 'sheet', 'tooling'}
    if kinds == {'study'}:
        return 'study'
    if kinds <= {'study', 'docs'}:
        return 'docs'
    if code and (labels & FIX_LABELS or FIX_TITLE_RE.search(title or '')):
        return 'fix'
    if 'sheet' in kinds:
        return 'sheet'
    if 'engine' in kinds:
        return 'engine'
    if 'admin' in kinds and 'app' not in kinds:
        return 'admin'
    if 'app' in kinds:
        return 'feature'
    if 'data' in kinds:
        return 'content'
    if 'admin' in kinds:
        return 'admin'
    return 'tooling'


def size_band(lines):
    for name, top in BANDS:
        if lines <= top:
            return name
    return 'XL'


# ---------------------------------------------------------------- time helpers

def ts(s):
    return datetime.strptime(s, '%Y-%m-%dT%H:%M:%SZ').timestamp()


def fmt(minutes):
    if minutes is None:
        return 'n/a'
    if minutes < 90:
        return '%d min' % round(minutes)
    h = minutes / 60
    return ('%.1f h' % h) if h < 48 else '%.1f d' % (h / 24)


def quartiles(values):
    """(p25, median, p75) of a list of numbers; one value gives it three times."""
    v = sorted(values)
    if len(v) == 1:
        return v[0], v[0], v[0]
    q = statistics.quantiles(v, n=4, method='inclusive')
    return q[0], statistics.median(v), q[2]


# ---------------------------------------------------------------- GitHub (gh api) with a cache

def cache_dir():
    base = os.environ.get('XDG_CACHE_HOME') or os.path.join(os.path.expanduser('~'), '.cache')
    d = os.path.join(base, 'coral-id-imr', 'effort')
    os.makedirs(d, exist_ok=True)
    return d


def write_json(f, obj):
    """Write a cache file atomically: a temporary file of its own for each writer, then a rename."""
    with tempfile.NamedTemporaryFile('w', dir=os.path.dirname(f), prefix=os.path.basename(f) + '.', suffix='.tmp',
                                     delete=False) as out:
        json.dump(obj, out)
    os.replace(out.name, f)


def gh(path):
    last = ''
    for attempt in range(4):
        r = subprocess.run(['gh', 'api', path], capture_output=True, text=True)
        if r.returncode == 0:
            return json.loads(r.stdout)
        last = (r.stderr or r.stdout).strip()
        if '404' in last or '403' in last and 'rate limit' not in last.lower():
            break
        time.sleep(2 * (attempt + 1))
    raise RuntimeError('gh api %s failed: %s' % (path, last[:300]))


def gh_pages(path, per_page=100, max_pages=20):
    out = []
    sep = '&' if '?' in path else '?'
    for page in range(1, max_pages + 1):
        chunk = gh('%s%sper_page=%d&page=%d' % (path, sep, per_page, page))
        out += chunk.get('check_runs', []) if isinstance(chunk, dict) else chunk
        if len(chunk.get('check_runs', []) if isinstance(chunk, dict) else chunk) < per_page:
            break
    return out


def merged_numbers(limit, refresh):
    f = os.path.join(cache_dir(), 'merged-list.json')
    if not refresh and os.path.exists(f) and time.time() - os.path.getmtime(f) < LIST_TTL:
        try:
            data = json.load(open(f))
            if len(data) >= limit:
                return data[:limit]
        except ValueError:
            pass  # a damaged cache file is read again from GitHub
    found = []
    page = 1
    while len(found) < limit and page <= 30:
        chunk = gh('repos/%s/pulls?state=closed&sort=created&direction=desc&per_page=100&page=%d' % (REPO, page))
        if not chunk:
            break
        found += [p['number'] for p in chunk if p.get('merged_at')]
        page += 1
    write_json(f, found)
    return found[:limit]


def fetch_raw(n):
    f = os.path.join(cache_dir(), 'pr-%d.json' % n)
    if os.path.exists(f):
        try:
            return json.load(open(f))
        except ValueError:
            pass
    base = 'repos/%s' % REPO
    pr = gh('%s/pulls/%d' % (base, n))
    raw = {
        'pr': {k: pr.get(k) for k in ('number', 'title', 'created_at', 'merged_at', 'additions', 'deletions',
                                      'changed_files', 'commits')},
        'labels': [l['name'] for l in pr.get('labels', [])],
        'head': pr['head']['sha'],
        'commits': [{'author': c['commit']['author']['date'], 'committer': c['commit']['committer']['date']}
                    for c in gh_pages('%s/pulls/%d/commits' % (base, n))],
        'files': [{'path': x['filename'], 'add': x['additions'], 'del': x['deletions']}
                  for x in gh_pages('%s/pulls/%d/files' % (base, n), max_pages=30)],
        'comments': [{'user': (c.get('user') or {}).get('login', ''), 'at': c['created_at'], 'body': (c.get('body') or '')[:200]}
                     for c in gh_pages('%s/issues/%d/comments' % (base, n))],
        'reviews': [{'user': (r.get('user') or {}).get('login', ''), 'at': r.get('submitted_at')}
                    for r in gh_pages('%s/pulls/%d/reviews' % (base, n))],
        'checks': [{'name': c['name'], 'start': c.get('started_at'), 'end': c.get('completed_at'),
                    'conclusion': c.get('conclusion')}
                   for c in gh_pages('%s/commits/%s/check-runs' % (base, pr['head']['sha']))],
    }
    write_json(f, raw)
    return raw


# ---------------------------------------------------------------- one PR -> one record (pure, tested offline)

CODEX_ASK_RE = re.compile(r'^\s*@codex\s+review\b', re.I)


def codex_rounds(comments, reviews):
    asks = sum(1 for c in comments if CODEX_ASK_RE.match(c.get('body', '')) and 'codex' not in c.get('user', '').lower())
    if asks:
        return asks
    return sum(1 for r in reviews if 'codex' in r.get('user', '').lower())


def green_time(checks, fallback):
    """When the head commit's checks all finished and passed (latest run per name); else the fallback time."""
    latest = {}
    for c in checks:
        if c.get('end') is None:
            continue
        old = latest.get(c['name'])
        if old is None or (c.get('start') or '') >= (old.get('start') or ''):
            latest[c['name']] = c
    runs = [c for c in latest.values() if c.get('conclusion') != 'skipped']
    if runs and all(c.get('conclusion') in ('success', 'neutral') for c in runs):
        return max(ts(c['end']) for c in runs)
    return fallback


def record(raw):
    pr = raw['pr']
    commits = raw['commits']
    paths = [f['path'] for f in raw['files']]
    lines = (pr.get('additions') or 0) + (pr.get('deletions') or 0)
    first = min(ts(c['author']) for c in commits) if commits else ts(pr['created_at'])
    head_at = max(ts(c['committer']) for c in commits) if commits else ts(pr['created_at'])
    green = max(green_time(raw.get('checks', []), head_at), head_at)
    merged = ts(pr['merged_at'])
    return {
        'n': pr['number'],
        'title': pr['title'],
        'type': classify(pr['title'], paths, raw.get('labels', []),
                         {f['path']: f['add'] + f['del'] for f in raw['files']}),
        'cats': sorted(categories(paths)),
        'lines': lines,
        'band': size_band(lines),
        'files': pr.get('changed_files') or len(paths),
        'commits': pr.get('commits') or len(commits),
        'rounds': codex_rounds(raw.get('comments', []), raw.get('reviews', [])),
        'agent_min': max(0.0, (green - first) / 60),
        'wall_min': max(0.0, (merged - ts(pr['created_at'])) / 60),
        'merged': pr['merged_at'][:10],
    }


def load(limit=LIMIT, refresh=False):
    nums = merged_numbers(limit, refresh)
    with ThreadPoolExecutor(8) as ex:
        raws = list(ex.map(fetch_raw, nums))
    return sorted((record(r) for r in raws), key=lambda r: r['n'])


# ---------------------------------------------------------------- outputs

def span(values):
    lo, med, hi = quartiles(values)
    return '%s (%s - %s)' % (fmt(med), fmt(lo), fmt(hi))


def cmd_table(recs):
    print('Agent time of %d merged PRs (%s to %s): median (25-75%% range), n; first commit to green checks.' %
          (len(recs), recs[0]['merged'], recs[-1]['merged']))
    print()
    print('%-9s %-5s %4s  %-28s %-12s' % ('type', 'size', 'n', 'agent time: median (25-75%)', 'open-merge'))
    for t in TYPES:
        rows = [r for r in recs if r['type'] == t]
        if not rows:
            continue
        for b in BAND_NAMES:
            sub = [r for r in rows if r['band'] == b]
            if sub:
                print('%-9s %-5s %4d  %-28s %-12s' % (t, b, len(sub), span([r['agent_min'] for r in sub]),
                                                      fmt(statistics.median(r['wall_min'] for r in sub))))
        print('%-9s %-5s %4d  %-28s %-12s' % (t, 'all', len(rows), span([r['agent_min'] for r in rows]),
                                              fmt(statistics.median(r['wall_min'] for r in rows))))
        print()
    print('%-9s %-5s %4d  %-28s %-12s' % ('all', 'all', len(recs), span([r['agent_min'] for r in recs]),
                                          fmt(statistics.median(r['wall_min'] for r in recs))))
    print()
    print('Size bands, lines changed: ' + ', '.join('%s <= %s' % (b, 'inf' if t == math.inf else t) for b, t in BANDS))
    print('Medians by band, all types: ' + '; '.join(
        '%s %s (n=%d)' % (b, fmt(statistics.median(r['agent_min'] for r in recs if r['band'] == b)),
                          sum(1 for r in recs if r['band'] == b))
        for b in BAND_NAMES if any(r['band'] == b for r in recs)))


def cmd_like(recs, nums):
    by = {r['n']: r for r in recs}
    got = []
    print('%-6s %-9s %-4s %6s %5s %7s %6s %9s %10s  %s' %
          ('PR', 'type', 'size', 'lines', 'files', 'commits', 'codex', 'agent', 'open-merge', 'title'))
    for n in nums:
        r = by.get(n)
        if not r:
            print('#%-5d not among the %d merged PRs read (open, closed unmerged, or older)' % (n, len(recs)))
            continue
        got.append(r)
        print('#%-5d %-9s %-4s %6d %5d %7d %6d %9s %10s  %s' %
              (n, r['type'], r['band'], r['lines'], r['files'], r['commits'], r['rounds'], fmt(r['agent_min']),
               fmt(r['wall_min']), r['title'][:60]))
    if len(got) > 1:
        print('\nTogether: agent time %s' % span([r['agent_min'] for r in got]))


def matches(rec, type_spec):
    if '+' not in type_spec:
        return rec['type'] == type_spec
    return set(type_spec.split('+')) <= set(rec['cats']) | {rec['type']}


def cmd_estimate(recs, type_spec, band):
    pool = [r for r in recs if matches(r, type_spec)]
    exact = [r for r in pool if r['band'] == band]
    if not pool:
        print('No merged PR of type %s in the %d read.' % (type_spec, len(recs)))
        return 1
    centre = math.log(BAND_CENTRE[band])
    closest = sorted(pool, key=lambda r: (abs(math.log(max(r['lines'], 1)) - centre), -r['n']))[:5]
    print('Estimate for type %s, size %s (%s lines): measured agent time, first commit to green checks.' %
          (type_spec, band, {'XS': '<= 20', 'S': '21-100', 'M': '101-400', 'L': '401-1500', 'XL': '> 1500'}[band]))
    if len(exact) >= 3:
        print('  same type and size (n=%d): median %s, range %s - %s (25-75%%)' %
              ((len(exact), fmt(quartiles([r['agent_min'] for r in exact])[1])) +
               tuple(fmt(x) for x in (quartiles([r['agent_min'] for r in exact])[0],
                                      quartiles([r['agent_min'] for r in exact])[2]))))
    else:
        print('  only %d PR(s) of this type and size: using the 5 closest of the type instead' % len(exact))
    lo, med, hi = quartiles([r['agent_min'] for r in closest])
    print('  5 closest %s PRs by size (n=%d): median %s, range %s - %s' % (type_spec, len(closest), fmt(med), fmt(lo), fmt(hi)))
    print()
    print('  %-6s %-4s %6s %7s %6s %9s %10s  %s' % ('PR', 'size', 'lines', 'commits', 'codex', 'agent', 'open-merge', 'title'))
    for r in closest:
        print('  #%-5d %-4s %6d %7d %6d %9s %10s  %s' % (r['n'], r['band'], r['lines'], r['commits'], r['rounds'],
                                                         fmt(r['agent_min']), fmt(r['wall_min']), r['title'][:60]))
    refs = ', '.join('#%d' % r['n'] for r in sorted(closest, key=lambda r: r['n']))
    print()
    print('To cite: comparable to %s: median %s (range %s-%s).' % (refs, fmt(med), fmt(lo), fmt(hi)))
    print('(the line cites the 5 PRs listed; the same-type-and-size group above is the wider sample)')
    return 0


# ---------------------------------------------------------------- --check: effort figures need PR references

NUM = r'\d+(?:[.,]\d+)?'
FIGURE_RES = [
    # 2-4 agent hours, 50-140 h, 1 to 2 days
    re.compile(r'(?<![\w.#])%s\s*(?:-|–|—|to)\s*%s\s*(?:agent[- ])?(?:hours?|hrs?|h|days?|d|weeks?)\b' % (NUM, NUM), re.I),
    # 3 h, 3.5 hours, 2 agent days, 4 hours of agent
    re.compile(r'(?<![\w.#])%s\s*(?:agent[- ])?(?:hours?|hrs?|h|days?|d|weeks?)\b' % NUM, re.I),
    # 30 min, 20-40 minutes, 30 agent minutes (the tool's own output says "N min")
    re.compile(r'(?<![\w.#])%s\s*(?:(?:-|\u2013|\u2014|to)\s*%s\s*)?(?:agent[- ])?(?:minutes?|mins?)\b' % (NUM, NUM), re.I),
    # agent-day(s), agent day(s), agent-hour(s), agent-week(s)
    re.compile(r'\bagent[- ](?:days?|hours?|weeks?|minutes?)\b', re.I),
    # a few days, several weeks, one or two days
    re.compile(r'\b(?:a few|several|couple of|one or two|two or three)\s+(?:agent[- ])?(?:days?|weeks?|hours?)\b', re.I),
]
REF_RE = re.compile(r'(?<![\w&#])#\d{1,6}\b')
EFFORT_OK_RE = re.compile(r'<!--\s*effort-ok\b')
BULLET_RE = re.compile(r'^(\s*)(?:[-*+]|\d+[.)])\s+')
FENCE_RE = re.compile(r'^\s*(```|~~~)')


def _units(lines):
    """Group lines into units: a bullet with its continuation lines, a table row or any other single line."""
    unit_of = [None] * len(lines)
    i = 0
    in_fence = False
    while i < len(lines):
        ln = lines[i]
        if FENCE_RE.match(ln):
            in_fence = not in_fence
            unit_of[i] = (i, i, True)
            i += 1
            continue
        if in_fence:
            unit_of[i] = (i, i, True)
            i += 1
            continue
        m = BULLET_RE.match(ln)
        if m:
            indent = len(m.group(1))
            j = i + 1
            while j < len(lines):
                nxt = lines[j]
                if not nxt.strip() or FENCE_RE.match(nxt):
                    break
                nm = BULLET_RE.match(nxt)
                if nm and len(nm.group(1)) <= indent:
                    break
                if re.match(r'^\s*(#{1,6}\s|\|)', nxt) and len(nxt) - len(nxt.lstrip()) <= indent:
                    break
                j += 1
            for k in range(i, j):
                unit_of[k] = (i, j - 1, False)
            i = j
            continue
        unit_of[i] = (i, i, False)
        i += 1
    return unit_of


def find_figures(text):
    """Every effort figure with its line number and whether its line or bullet cites a PR (#NNN):
    a list of (line number, figure text, has_reference). Code blocks are skipped; `<!-- effort-ok: why -->` on the
    line or bullet accepts a figure that is not an estimate (a retention period, a date)."""
    lines = text.split('\n')
    units = _units(lines)
    out = []
    for i, ln in enumerate(lines):
        start, end, fenced = units[i]
        if fenced:
            continue
        body = ln
        seen = []
        for rx in FIGURE_RES:
            for m in rx.finditer(body):
                if not any(m.start() < e and s < m.end() for s, e in seen):
                    seen.append((m.start(), m.end()))
        for s, e in sorted(seen):
            block = '\n'.join(lines[start:end + 1])
            ok = bool(REF_RE.search(block)) or bool(EFFORT_OK_RE.search(block))
            out.append((i + 1, body[s:e], ok))
    return out


def cmd_check(path):
    text = open(path, encoding='utf-8').read()
    bad = [(n, f) for n, f, ok in find_figures(text) if not ok]
    for n, f in bad:
        print('%s:%d: effort figure "%s" has no PR reference (#NNN) on its line or bullet; '
              'get one with: python3 tools/effort.py --estimate TYPE SIZE' % (path, n, f))
    if bad:
        print('%d effort figure(s) without references in %s' % (len(bad), path))
        return 1
    print('%s: every effort figure cites PRs' % path)
    return 0


# ---------------------------------------------------------------- main

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--table', action='store_true', help='median and 25-75%% range of agent time per type and size band')
    g.add_argument('--like', metavar='N1,N2', help='measured times of the cited PRs')
    g.add_argument('--estimate', nargs=2, metavar=('TYPE', 'SIZE'),
                   help='type (%s; a+b for PRs touching both, e.g. content+tooling) and size (%s)' %
                        (', '.join(TYPES), ', '.join(BAND_NAMES)))
    g.add_argument('--check', metavar='FILE.md', help='fail on an effort figure with no #NNN on its line or bullet')
    ap.add_argument('--limit', type=int, default=LIMIT, help='how many merged PRs to read (default %d)' % LIMIT)
    ap.add_argument('--refresh', action='store_true', help='re-read the list of merged PRs now')
    a = ap.parse_args(argv)
    if a.check:
        return cmd_check(a.check)
    if a.estimate:
        t, s = a.estimate[0].lower(), a.estimate[1].upper()
        if s not in BAND_NAMES or any(x not in TYPES for x in t.split('+')):
            ap.error('TYPE is one of %s (a+b allowed), SIZE one of %s' % (', '.join(TYPES), ', '.join(BAND_NAMES)))
    recs = load(a.limit, a.refresh)
    if not recs:
        print('no merged PRs read', file=sys.stderr)
        return 1
    if a.table:
        cmd_table(recs)
    elif a.like:
        cmd_like(recs, [int(x.lstrip('#')) for x in a.like.split(',') if x.strip()])
    else:
        return cmd_estimate(recs, t, s)
    return 0


if __name__ == '__main__':
    sys.exit(main())
