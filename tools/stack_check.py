#!/usr/bin/env python3
"""The technology stack's pins (tools/stack.json): consistent with the repository, and how far behind the latest stable.

  python3 tools/stack_check.py --check      offline and fast (CI, Checks job): every pin in the repository files equals
                                            the version in tools/stack.json; exit 1 and one line per mismatch otherwise
  python3 tools/stack_check.py --latest     looks each item up at its source (nodejs.org, endoflife.date, the npm
                                            registry, PyPI, rclone.org, the runner-images README, Hugging Face, GitHub
                                            docs, the Apps Script sunset page, the iNaturalist API) and prints one table
                                            of what is behind; informational, always exit 0
    --all                                   every item in the table, not only the ones behind or not looked up
    --json                                  the result as JSON (tools/brief.py reads it)
    --timeout S                             seconds for every lookup together (default 20)
    --git-ref REF                           read tools/stack.json from REF (the brief: origin/main, main's reviewed copy)
  --root DIR                                the repository (default: next to this file, else the current directory)

Pierre, 2026-11-05: the whole stack stays on the latest stable versions (AGENTS.md rule 27b). Standard library only. A
lookup that fails (no network, a page that changed) is reported as "unknown" with its reason, never a crash. The hosts
are fixed here; tools/stack.json only names a kind and its parameters (a package, a dataset).
"""

import argparse
import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

_HERE = globals().get('__file__', '')
DEFAULT_ROOT = Path(_HERE).resolve().parent.parent if _HERE.endswith('.py') else Path.cwd()
STACK = 'tools/stack.json'
VER = r'(\w+(?:[.+\-]\w+)*)'  # a version as written: 26, 3.12, 1.64.1, v25.04, ubuntu-latest, V8 (no trailing dot)
UA = 'coral-id-imr stack_check (+https://github.com/ppericard/coral-id-imr)'


# --- --check: the pins in the repository equal tools/stack.json ----------------------------------------------------------


def load(root, ref=None):
    if ref:
        r = subprocess.run(['git', '-C', str(root), 'show', '%s:%s' % (ref, STACK)], capture_output=True, text=True, timeout=5)
        if r.returncode:
            raise ValueError('not in %s' % ref)
        return json.loads(r.stdout)
    return json.loads((Path(root) / STACK).read_text(encoding='utf8'))


def pattern_re(pattern):
    """A pin's pattern as a regex: the text literally, {v} the version (captured)."""
    head, sep, tail = pattern.partition('{v}')
    if not sep or '{v}' in tail:
        raise ValueError('a pattern holds {v} exactly once: %r' % pattern)
    return re.compile(re.escape(head) + VER + re.escape(tail))


def files_of(root, globs):
    out = []
    for g in globs:
        out += [p for p in sorted(Path(root).glob(g)) if p.is_file() and p not in out]
    return out


def check_pin(root, item, pin):
    """Problems (strings) for one pin of one item."""
    probs = []
    where = ', '.join(pin['files'])
    files = files_of(root, pin['files'])
    if not files:
        return [] if pin.get('optional') else ['%s: %s not found' % (item['id'], where)]
    if 'pattern' in pin:
        rx, ok = pattern_re(pin['pattern']), {item['version'], *pin.get('also', [])}
        n = 0
        for f in files:
            for i, line in enumerate(f.read_text(encoding='utf8', errors='replace').splitlines(), 1):
                for m in rx.finditer(line):
                    n += 1
                    if m.group(1) not in ok:
                        probs.append(
                            '%s: %s:%d has %s, tools/stack.json says %s'
                            % (item['id'], f.relative_to(root).as_posix(), i, m.group(1), item['version'])
                        )
        if n < pin.get('min', 1):
            probs.append('%s: %r found %d times in %s, at least %d expected' % (item['id'], pin['pattern'], n, where, pin.get('min', 1)))
    elif 'contains' in pin:
        if not any(pin['contains'] in f.read_text(encoding='utf8', errors='replace') for f in files):
            probs.append('%s: %r not in %s (the pin moved? update tools/stack.json)' % (item['id'], pin['contains'], where))
    elif 'lacks' in pin:
        for f in files:
            if pin['lacks'] in f.read_text(encoding='utf8', errors='replace'):
                probs.append('%s: %s now holds %r: turn this pin into a pattern' % (item['id'], f.relative_to(root).as_posix(), pin['lacks']))
    else:
        probs.append('%s: a pin needs pattern, contains or lacks' % item['id'])
    return probs


def check(root, stack):
    probs, seen, n = [], set(), 0
    for item in stack.get('items', []):
        for k in ('id', 'name', 'version', 'pins', 'latest', 'lookup'):
            if k not in item:
                probs.append('%s: field %s missing' % (item.get('id', '?'), k))
        if item.get('id') in seen:
            probs.append('%s: listed twice' % item['id'])
        seen.add(item.get('id'))
        if item.get('latest', {}).get('kind') not in KINDS:
            probs.append('%s: unknown latest kind %r' % (item.get('id'), item.get('latest', {}).get('kind')))
        for pin in item.get('pins', []):
            n += 1
            try:
                probs += check_pin(root, item, pin)
            except (ValueError, KeyError) as e:
                probs.append('%s: bad pin (%s)' % (item.get('id'), e))
    return probs, len(seen), n


# --- --latest: look each item up ------------------------------------------------------------------------------------------


class Lookup:
    def __init__(self, deadline):
        self.end = time.monotonic() + deadline

    def get(self, url, accept='application/json'):
        left = self.end - time.monotonic()
        if left <= 0.2:
            raise TimeoutError('out of time')
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': accept})
        with urllib.request.urlopen(req, timeout=left) as r:
            return r.read().decode('utf8', errors='replace')

    def json(self, url):
        return json.loads(self.get(url))

    def status(self, url):
        try:
            self.get(url)
            return 200
        except urllib.error.HTTPError as e:
            e.close()
            return e.code


def vtuple(s):
    return tuple(int(x) for x in re.findall(r'\d+', str(s)))


def node_lts(lk, spec):
    rel = lk.json('https://nodejs.org/dist/index.json')
    lts = [r for r in rel if r.get('lts')]
    top = max(lts, key=lambda r: vtuple(r['version']))
    return str(vtuple(top['version'])[0]), '%s, LTS "%s"' % (top['version'], top['lts'])


def endoflife(lk, spec):
    today = date.today().isoformat()
    rows = [r for r in lk.json('https://endoflife.date/api/%s.json' % spec['product']) if str(r.get('releaseDate', '9')) <= today]
    top = max(rows, key=lambda r: vtuple(r['cycle']))
    return str(top['cycle']), '%s (%s)' % (top.get('latest', ''), top.get('latestReleaseDate', ''))


def npm(lk, spec):
    tags = lk.json('https://registry.npmjs.org/-/package/%s/dist-tags' % spec['package'])
    latest, note = tags['latest'], ''
    nxt = tags.get('next')
    if nxt and vtuple(nxt)[:1] > vtuple(latest)[:1]:
        note = 'next major in pre-release: %s' % nxt
    return latest, note


def pypi(lk, spec):
    info = lk.json('https://pypi.org/pypi/%s/json' % spec['package'])['info']
    return info['version'], ''


def rclone(lk, spec):
    m = re.search(r'v(\d+\.\d+\.\d+)', lk.get('https://downloads.rclone.org/version.txt', 'text/plain'))
    if not m:
        raise ValueError('version.txt changed')
    return m.group(1), ''


def runner_images(lk, spec):
    """The newest x64 Ubuntu image and the one ubuntu-latest points to, from the runner-images README table."""
    md = lk.get('https://raw.githubusercontent.com/actions/runner-images/main/README.md', 'text/plain')
    rows = re.findall(r'^\| Ubuntu (\d+\.\d+)<br>[^|]*\| x64 \| ([^|]+)\|', md, re.M)
    if not rows:
        raise ValueError('README table changed')
    newest = max(rows, key=lambda r: vtuple(r[0]))[0]
    latest_is = next((v for v, labels in rows if '`ubuntu-latest`' in labels), '?')
    return 'ubuntu-' + newest, 'ubuntu-latest is %s' % latest_is


def hf_tree(lk, spec):
    tree = lk.json('https://huggingface.co/api/datasets/%s/tree/main/%s' % (spec['repo'], spec['path']))
    dirs = [t['path'].rsplit('/', 1)[-1] for t in tree if t.get('type') == 'directory']
    return max(dirs, key=vtuple), ''


def github_api(lk, spec):
    """Supported REST versions and their end of support, from the GitHub docs page."""
    page = lk.get('https://docs.github.com/en/rest/about-the-rest-api/api-versions', 'text/html')
    text = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', page)))
    m = re.search(r'API version End of support date (.*?)(?: You can also| Back to top|$)', text)
    if not m:
        raise ValueError('versions table changed')
    rows = re.findall(r'(\d{4}-\d\d-\d\d) (Not yet scheduled|\w+ \d+, \d{4})', m.group(1))
    if not rows:
        raise ValueError('versions table changed')
    newest = max(rows)[0]
    return newest, 'supported: ' + ', '.join('%s (%s)' % (v, 'no end yet' if e.startswith('Not') else 'to ' + e) for v, e in sorted(rows, reverse=True))


def inat_api(lk, spec):
    """The highest vN of api.inaturalist.org that answers (a probe on one taxon)."""
    top = 0
    for n in range(1, 6):
        if lk.status('https://api.inaturalist.org/v%d/taxa/47218?fields=id' % n) == 200:
            top = n
        elif top:
            break
    if not top:
        raise ValueError('no version answered')
    return 'v%d' % top, ''


def apps_script_sunset(lk, spec):
    """The features on the sunset table that name something the script uses (spec watch); the runtime stays if none."""
    page = lk.get('https://developers.google.com/apps-script/guides/support/sunset', 'text/html')
    t = re.search(r'<table.*?</table>', page, re.S)
    if not t:
        raise ValueError('sunset table not found')
    feats = []
    for tr in re.findall(r'<tr>(.*?)</tr>', t.group(0), re.S):
        cell = re.search(r'<td[^>]*>(.*?)</td>', tr, re.S)
        if cell:
            feats.append(re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', cell.group(1)))).strip())
    hit = sorted({w for w in spec.get('watch', []) for f in feats if re.search(r'\b%s\b' % re.escape(w), f)})
    if hit:
        return 'sunset: ' + ', '.join(hit), 'on the sunset page'
    return None, '%d features on the sunset page, none of ours' % len(feats)


KINDS = {
    'node-lts': node_lts,
    'endoflife': endoflife,
    'npm': npm,
    'pypi': pypi,
    'rclone': rclone,
    'runner-images': runner_images,
    'hf-tree': hf_tree,
    'github-api': github_api,
    'inat-api': inat_api,
    'apps-script-sunset': apps_script_sunset,
}


def compare(version, latest, how):
    """current, outdated or ahead; how: major | minor | exact (numbers compared, as many parts as the pin has for major/minor)."""
    if latest is None or latest == version:
        return 'current'
    a, b = vtuple(version), vtuple(latest)
    if not a or not b:
        return 'current' if version == latest else 'outdated'
    if how == 'major':
        a, b = a[:1], b[:1]
    elif how == 'minor':
        a, b = a[:2], b[:2]
    return 'current' if a == b else ('outdated' if a < b else 'ahead')


def one(lk, item):
    spec = item['latest']
    row = {'id': item['id'], 'name': item['name'], 'version': item['version'], 'lookup': item.get('lookup', '')}
    try:
        latest, note = KINDS[spec['kind']](lk, spec)
    except Exception as e:  # network, a page that changed, anything: reported, never raised
        reason = getattr(e, 'reason', None) or e
        row.update(status='unknown', latest='?', note='%s: %s' % (type(e).__name__, str(reason)[:80]))
        return row
    if item['version'] == 'ubuntu-latest' and spec['kind'] == 'runner-images':
        # A floating label: behind when it still points to an older image than the newest (it moves by itself, slowly).
        pointed = note.rsplit(' ', 1)[-1]
        row.update(status='current' if 'ubuntu-' + pointed == latest else 'floating', latest=latest, note=note)
        return row
    row.update(status=compare(item['version'], latest, spec.get('compare', 'exact')), latest=latest or item['version'], note=note)
    if latest and latest.startswith('sunset: '):
        row['status'] = 'outdated'
    return row


def latest(stack, timeout):
    lk = Lookup(timeout)
    items = stack.get('items', [])
    with ThreadPoolExecutor(max_workers=max(1, len(items))) as pool:
        return list(pool.map(lambda it: one(lk, it), items))


def table(rows):
    heads = ('item', 'repo', 'latest', 'status', 'note')
    data = [(r['id'], r['version'], r['latest'], r['status'], r['note']) for r in rows]
    w = [max(len(str(x)) for x in col) for col in zip(heads, *data)]
    w[-1] = 0
    fmt = lambda row: '  '.join(str(x).ljust(n) for x, n in zip(row, w)).rstrip()
    return '\n'.join([fmt(heads)] + [fmt(r) for r in data])


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument('--check', action='store_true', help='offline: the pins in the repository equal tools/stack.json')
    mode.add_argument('--latest', action='store_true', help='look each item up at its source (informational, exit 0)')
    ap.add_argument('--all', action='store_true', help='--latest: every item, not only those behind')
    ap.add_argument('--json', action='store_true', help='--latest: JSON output')
    ap.add_argument('--timeout', type=float, default=20.0, help='--latest: seconds for every lookup together')
    ap.add_argument('--git-ref', metavar='REF', help='--latest: read tools/stack.json from this git ref (e.g. origin/main)')
    ap.add_argument('--root', default=str(DEFAULT_ROOT), help='the repository root')
    a = ap.parse_args()
    root = Path(a.root).resolve()

    if a.check:
        try:
            stack = load(root)
        except (OSError, ValueError) as e:
            print('%s: %s' % (STACK, e))
            return 1
        probs, n_items, n_pins = check(root, stack)
        for p in probs:
            print(p)
        print('%s: %d items, %d pins: %s' % (STACK, n_items, n_pins, '%d problem(s)' % len(probs) if probs else 'consistent'))
        return 1 if probs else 0

    try:
        stack = load(root, a.git_ref)
    except (OSError, ValueError, subprocess.SubprocessError) as e:
        print('stack check: %s not read (%s)' % (STACK, e))
        return 0
    rows = latest(stack, a.timeout)
    behind = [r for r in rows if r['status'] in ('outdated', 'floating')]
    unknown = [r for r in rows if r['status'] == 'unknown']
    if a.json:
        print(json.dumps({'checked': len(rows), 'outdated': [r['id'] for r in behind], 'unknown': [r['id'] for r in unknown], 'items': rows}))
        return 0
    shown = rows if a.all else behind + unknown
    if shown:
        print(table(shown))
    print(
        'Stack: %d items, %d behind%s, %d not looked up%s'
        % (
            len(rows),
            len(behind),
            ' (%s)' % ', '.join(r['id'] for r in behind) if behind else '',
            len(unknown),
            ' (%s)' % ', '.join(r['id'] for r in unknown) if unknown else '',
        )
    )
    return 0


if __name__ == '__main__':
    sys.exit(main())
