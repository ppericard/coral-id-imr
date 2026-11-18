#!/usr/bin/env python3
"""The hourly health check and the infrastructure numbers (.github/workflows/health.yml; docs/PAGES.md "Infrastructure
health"; Pierre, 2026-11-18 11:21, "lance 1, 2, 3 et 4").

    python3 tools/health.py [--md FILE]

Checks, each read-only and with no name, code or secret in anything it prints (a public repository's Actions log is public):

1. the live site answers: index.html (200, every `file.js?v=` stamped with 10 hex: an unstamped `?v=N` means the deploy's
   stamping did not run) and the data.json its preload names, with that stamp (200, JSON, not empty);
2. the sync sheet script answers the app's own public read-only request (`?stats=1&av=health`: an av that is no build
   number, so the script logs nothing for it) with ok and its `v`; behind `main`'s VERSION is a notice inside the
   self-update window (BEHIND_MIN after the Code.gs commit) and a failure after it (the 15-minute `autoUpdate` is stuck);
3. the weekly pCloud backup: nothing public tells when it last ran (the Deploy log is read only with the admin token), so
   without INFRA_TOKEN the line says so and passes; with it, `readInfra` says when the last backup saved, and one older
   than BACKUP_DAYS fails. The workflow does not pass the token (an access decision for Pierre: docs/PAGES.md).

The infrastructure numbers (what to watch before the platform outgrows its free tiers), in the run's summary and, as one
`::notice title=infra::{json}` annotation, for `tools/brief.py` to read: the published site's size against GitHub Pages' 1 GB
(the tracked files of `main` the deploy does not leave out: `.gitattributes` export-ignore; before minifying), R2's storage
against its 10 GB free tier (no token that can read it exists in CI: the figure is `tools/infra.json`, measured by hand), and,
with INFRA_TOKEN only, the spreadsheet's cells against Google's 10 million and the slowest 90th percentile of the Timings tab
against 5 s. A number past WARN (70 %) of its limit is a warning, never a failure.

Exit 1 when a check failed (the job fails, which GitHub e-mails; the workflow opens an issue if none is open). Stdlib only.
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = 'ppericard/coral-id-imr'
SITE = 'https://ppericard.github.io/coral-id-imr/'
WARN = 0.70  # a warning past 70 % of a limit (the same in tools/brief.py and admin.js)
# The limits: GitHub Pages' published site 1 GB, Cloudflare R2's free tier 10 GB (both taken as 10^9 bytes a GB, the less
# generous reading), Google Sheets' 10 million cells a spreadsheet (the lower of the two figures the docs give: to
# confirm against Google's current limits page), and the Timings tab's 5 s (Code.gs
# TIM.SLOW: an operation the script keeps whole whenever it is that slow; our own budget, not a platform quota).
LIMITS = {'cells': 10_000_000, 'pages': 10**9, 'r2': 10 * 10**9, 'slow': 5000}
BACKUP_DAYS = 8  # the backup is weekly (Sundays about 02:00 Manila)
BEHIND_MIN = 60  # the script updates itself every 15 minutes: an hour behind main is stuck
INFRA_STALE_DAYS = 30  # the hand-measured R2 figure is old after a month
HEX10 = re.compile(r'^[0-9a-f]{10}$')
REF = re.compile(r'(?<![\w./-])([\w][\w./-]*\.(?:js|css|json))\?v=([0-9a-z]+)(?![\w])')


def level(used, limit):
    """(share of the limit, whether it is past WARN)."""
    p = used / limit if limit else 0.0
    return p, p > WARN


def human(unit, n):
    if unit == 'bytes':
        return '%.2f GB' % (n / 1e9) if n >= 1e8 else '%.0f MB' % (n / 1e6)
    if unit == 'cells':
        return '%.2f M' % (n / 1e6) if n >= 1e5 else '%d' % n
    return '%.1f s' % (n / 1000)  # ms


# --- HTTP, injectable: every check takes `get`/`post`, so the tests run on fixtures and never reach the network ---------------


def http(url, data=None, headers=None, timeout=15):
    """(status, body bytes); (0, error name) when nothing answered. Follows redirects (Apps Script answers through one)."""
    req = urllib.request.Request(url, data=data, headers=dict({'User-Agent': 'reefid-health-check'}, **(headers or {})))
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b''
    except Exception as e:  # noqa: BLE001 (DNS, timeout, TLS: all one answer)
        return 0, type(e).__name__.encode()


def twice(get, url, pause=3, good=None, **kw):
    """One more try after a pause when the first reply is not `good(status, body)` (default: HTTP 200): a hiccup, or an HTML
    error page Apps Script serves with a 200, is not an outage."""
    good = good or (lambda s, b: s == 200)
    s, b = get(url, **kw)
    if not good(s, b):
        time.sleep(pause)
        s, b = get(url, **kw)
    return s, b


def json_ok(s, b):
    try:
        return s == 200 and bool(json.loads(b))
    except ValueError:
        return False


def sheet_ok(s, b):
    """The script's reply is JSON with ok (a login or error page served with a 200 is not)."""
    try:
        j = json.loads(b) if s == 200 else None
    except ValueError:
        return False
    return isinstance(j, dict) and bool(j.get('ok'))


def res(name, ok, note, level_='ok'):
    return {'name': name, 'ok': ok, 'note': note, 'level': level_ if ok else 'fail'}


# --- 1. the site ---------------------------------------------------------------------------------------------------------


def check_site(get, base=SITE, pause=3):
    out = []
    s, b = twice(get, base + 'index.html', pause, lambda s, b: s == 200 and b'?v=' in b)
    if s != 200:
        return [res('site: index.html', False, 'HTTP %s' % s if s else 'no answer (%s)' % b.decode('ascii', 'replace')[:40])]
    html = b.decode('utf8', 'replace')
    refs = REF.findall(html)
    bad = sorted({'%s?v=%s' % r for r in refs if not HEX10.match(r[1])})
    if not refs:
        out.append(res('site: index.html', False, 'no versioned file in it'))
    elif bad:
        out.append(res('site: index.html', False, 'unstamped versions: ' + ', '.join(bad[:3])))
    else:
        out.append(res('site: index.html', True, '200, %d stamped references' % len(refs)))
    data = [r for r in refs if r[0] == 'data.json']
    if not data:
        out.append(res('site: data.json', False, 'index.html no longer names data.json'))
        return out
    s, b = twice(get, '%sdata.json?v=%s' % (base, data[0][1]), pause, json_ok)
    try:
        j = json.loads(b) if s == 200 else None
    except ValueError:
        j = None
    out.append(
        res('site: data.json', bool(j), '200, %d bytes' % len(b) if j else ('HTTP %s' % s if s != 200 else 'not JSON or empty'))
    )
    return out


# --- 2. the sheet script -------------------------------------------------------------------------------------------------


def main_version(root=ROOT):
    try:
        m = re.search(r'^const VERSION = (\d+);', open(os.path.join(root, 'tools/sync/Code.gs'), encoding='utf8').read(), re.M)
    except OSError:
        return None
    return int(m.group(1)) if m else None


def sync_url(root=ROOT):
    try:
        m = re.search(r"const SYNC_URL = '([^']+)'", open(os.path.join(root, 'app.js'), encoding='utf8').read())
    except OSError:
        return None
    return m.group(1) if m else None


def check_sheet(get, url, v_main, age_of, pause=3):
    """The public read the app makes. age_of(): minutes since main's Code.gs last changed (None: not known), asked only when behind."""
    if not url:
        return res('sheet script: answers', False, 'SYNC_URL not found in app.js'), None
    t0 = time.monotonic()
    s, b = twice(get, url + '?stats=1&av=health', pause, sheet_ok, timeout=20)
    ms = round((time.monotonic() - t0) * 1000)
    try:
        j = json.loads(b) if s == 200 else None
    except ValueError:
        j = None
    v = j.get('v') if isinstance(j, dict) else None
    if not (isinstance(j, dict) and j.get('ok') and isinstance(v, int)):
        return res('sheet script: answers', False, 'HTTP %s, no ok reply with a version' % s if s else 'no answer'), None
    note = 'v%d, %.1f s' % (v, ms / 1000)
    if v_main and v < v_main:
        age_min = age_of()
        if age_min is not None and age_min > BEHIND_MIN:
            return res('sheet script: answers', False, '%s, behind main (v%d) for %d min: autoUpdate is stuck' % (note, v_main, age_min)), v
        note += ', behind main (v%d): updating itself (about 15 min)' % v_main
        return res('sheet script: answers', True, note, 'notice'), v
    return res('sheet script: answers', True, note), v


# --- 3. the backup, and the admin-only numbers ----------------------------------------------------------------------------


def read_infra(post, url, token):
    """The sheet's readInfra (admin token; sheet v180), the reply or None. The token goes only in the request's body."""
    s, b = post(url, data=json.dumps({'readInfra': 1, 'token': token}).encode(), timeout=30)
    try:
        j = json.loads(b) if s == 200 else None
    except ValueError:
        j = None
    return j if isinstance(j, dict) else None


def check_backup(infra, now=None):
    """infra: the readInfra reply, None (no token) or {} (asked, no usable reply)."""
    if infra is None:
        return res('pCloud backup', True, 'not exposed without the admin token: admin To do > Alerts shows it (nothing public says when it ran)', 'notice')
    if not infra.get('ok') or 'backup' not in infra:
        return res('pCloud backup', True, 'not read (the script has no readInfra yet, or refused the token)', 'notice')
    now = now or time.time()
    bk = infra['backup']
    if bk.get('saved'):
        days = (now - bk['saved'] / 1000) / 86400
        if days > BACKUP_DAYS:
            last = (bk.get('last') or {}).get('text', '')
            return res('pCloud backup', False, 'last saved %d days ago (weekly); last line: %s' % (days, last[:100]))
        return res('pCloud backup', True, 'saved %.1f days ago' % days)
    last = bk.get('last')
    if not last:
        return res('pCloud backup', True, 'no backup line in the Deploy log: not set up yet?', 'notice')
    if 'not configured' in last.get('text', ''):
        return res('pCloud backup', True, 'not configured', 'notice')
    return res('pCloud backup', False, 'never saved; last line: %s' % last.get('text', '')[:100])


# --- the infrastructure numbers --------------------------------------------------------------------------------------------


def exports_ignored(root=ROOT):
    """The paths .gitattributes leaves out of the published site (export-ignore), as (dirs with a trailing /, files)."""
    d, f = [], []
    try:
        lines = open(os.path.join(root, '.gitattributes'), encoding='utf8').read().splitlines()
    except OSError:
        return [], []
    for ln in lines:
        p = ln.split()
        if len(p) >= 2 and 'export-ignore' in p[1:] and p[0].startswith('/'):
            (d if p[0].endswith('/') else f).append(p[0][1:])
    return d, f


def pages_size(tree, ignored):
    """The published site's size from git's tree of main: the blobs the deploy does not leave out (the build then minifies the
    scripts, so the real figure is a little smaller)."""
    dirs, files = ignored
    return sum(
        e.get('size', 0)
        for e in tree
        if e.get('type') == 'blob' and not any(e['path'].startswith(x) for x in dirs) and e['path'] not in files
    )


def api(get, path, token=None):
    h = {'Accept': 'application/vnd.github+json'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    s, b = get('https://api.github.com/' + path, headers=h)
    try:
        return json.loads(b) if s == 200 else None
    except ValueError:
        return None


def code_gs_age_min(get, token, now=None):
    j = api(get, 'repos/%s/commits?path=tools/sync/Code.gs&per_page=1' % REPO, token)
    try:
        t = datetime.strptime(j[0]['commit']['committer']['date'], '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
    except (TypeError, KeyError, IndexError, ValueError):
        return None
    return int(((now or datetime.now(timezone.utc)) - t).total_seconds() // 60)


def r2_item(hand, today):
    """R2 has no reading in CI: the figure measured by hand (tools/infra.json), with its date, stale after a month."""
    r = (hand or {}).get('r2') or {}
    if not isinstance(r.get('bytes'), (int, float)):
        return {'k': 'r2', 'label': 'R2 storage', 'unit': 'bytes', 'limit': LIMITS['r2'], 'used': None, 'note': 'to measure by hand (tools/infra.json)'}
    note = 'by hand %s' % r.get('at', '?')
    try:
        age = (today - datetime.strptime(r['at'], '%Y-%m-%d').date()).days
        if age > INFRA_STALE_DAYS:
            note += ', %d days old: measure again' % age
    except (KeyError, ValueError):
        note += ', date unknown'
    return {'k': 'r2', 'label': 'R2 storage', 'unit': 'bytes', 'limit': LIMITS['r2'], 'used': r['bytes'], 'note': note}


def items_of(pages, hand, infra, today):
    out = []
    if infra and infra.get('ok') and isinstance(infra.get('cells'), dict):
        out.append({'k': 'cells', 'label': 'Sheet cells', 'unit': 'cells', 'limit': infra['cells'].get('limit') or LIMITS['cells'], 'used': infra['cells'].get('total'), 'note': ''})
        ops = (infra.get('tim') or {}).get('ops') or []
        if ops:
            out.append({'k': 'slow', 'label': 'Slowest p90', 'unit': 'ms', 'limit': LIMITS['slow'], 'used': ops[0].get('p90'), 'note': str(ops[0].get('op', ''))[:30]})
    out.append({'k': 'pages', 'label': 'Pages site', 'unit': 'bytes', 'limit': LIMITS['pages'], 'used': pages, 'note': 'tracked files, before minifying' if pages is not None else 'not read'})
    out.append(r2_item(hand, today))
    for it in out:
        if isinstance(it['used'], (int, float)):
            it['pct'], it['warn'] = level(it['used'], it['limit'])
    return out


# --- the run ----------------------------------------------------------------------------------------------------------------


def snapshot(results, items, now):
    return {'at': now.strftime('%Y-%m-%dT%H:%M:%SZ'), 'ok': all(r['ok'] for r in results), 'items': items}


def markdown(results, items):
    L = ['## Health', '', '| Check | Result |', '|---|---|']
    for r in results:
        L.append('| %s | %s: %s |' % (r['name'], {'ok': 'ok', 'notice': 'note', 'fail': 'FAILED'}[r['level']], r['note']))
    L += ['', '## Infrastructure (warning past %d %% of a limit)' % round(WARN * 100), '', '| Number | Used | Limit | Share | |', '|---|---|---|---|---|']
    for i in items:
        u = i.get('used')
        if u is None:
            L.append('| %s | not measured | %s | | %s |' % (i['label'], human(i['unit'], i['limit']), i['note']))
        else:
            L.append('| %s | %s | %s | %.0f %% | %s%s |' % (i['label'], human(i['unit'], u), human(i['unit'], i['limit']), i['pct'] * 100, 'WARNING ' if i['warn'] else '', i['note']))
    return '\n'.join(L) + '\n'


def esc(s):
    """A workflow command's message: % and line breaks escaped."""
    return s.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')


def run(get, post, env, root=ROOT, today=None, now=None, pause=3):
    """(results, items, snapshot): every check at once, none able to stop the others."""
    now = now or datetime.now(timezone.utc)
    today = today or now.date()
    gh, itok = env.get('GITHUB_TOKEN'), env.get('INFRA_TOKEN')
    url, vm = sync_url(root), main_version(root)
    try:
        hand = json.load(open(os.path.join(root, 'tools/infra.json'), encoding='utf8'))
    except (OSError, ValueError):
        hand = None

    def sheet():
        return check_sheet(get, url, vm, lambda: code_gs_age_min(get, gh, now), pause)

    def tree():
        j = api(get, 'repos/%s/git/trees/main?recursive=1' % REPO, gh)
        return pages_size(j['tree'], exports_ignored(root)) if j and not j.get('truncated') else None

    def infra():
        return read_infra(post, url, itok) if itok and url else None

    with ThreadPoolExecutor(max_workers=4) as pool:
        f = {'site': pool.submit(check_site, get, SITE, pause), 'sheet': pool.submit(sheet), 'tree': pool.submit(tree), 'infra': pool.submit(infra)}
        got = {}
        for k, fut in f.items():
            try:
                got[k] = fut.result(timeout=90)
            except Exception as e:  # noqa: BLE001 (one check must not stop the others)
                got[k] = [res('health: ' + k, False, type(e).__name__)] if k == 'site' else ((res('sheet script: answers', False, type(e).__name__), None) if k == 'sheet' else None)
    sheet_res = got['sheet'][0]
    infra_reply = got['infra'] if itok else None
    if itok and infra_reply is None:
        infra_reply = {}
    results = got['site'] + [sheet_res, check_backup(infra_reply, now.timestamp())]
    items = items_of(got['tree'], hand, got['infra'] if isinstance(got['infra'], dict) else None, today)
    return results, items, snapshot(results, items, now)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--md', help='also write the report (Markdown) to this file: the workflow opens its issue from it')
    a = ap.parse_args()
    results, items, snap = run(http, http, os.environ)
    md = markdown(results, items)
    print(md)
    if a.md:
        open(a.md, 'w', encoding='utf8').write(md)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf8').write(md)
    for r in results:
        if not r['ok']:
            print('::error title=%s::%s' % (esc(r['name']), esc(r['note'])))
    for i in items:
        if i.get('warn'):
            print('::warning title=%s::%.0f %% of the limit' % (esc(i['label']), i['pct'] * 100))
    print('::notice title=infra::' + esc(json.dumps(snap, separators=(',', ':'))))
    sys.exit(0 if snap['ok'] else 1)


if __name__ == '__main__':
    main()
