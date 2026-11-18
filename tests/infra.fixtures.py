"""Fixtures for tests/infra.test.js: tools/health.py and the brief's infrastructure line, run on made-up replies only (no
network: every request goes through a fake `get` or `post`, rule D1). Prints one JSON object, scenario by scenario.

    python3 -I tests/infra.fixtures.py
"""

import json
import os
import sys
import tempfile
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'tools'))
import brief  # noqa: E402
import health  # noqa: E402

SECRET_GH, SECRET_ADMIN = 'ghs_SECRETTOKEN0001', 'ADMINTOKEN-SECRET-0002'
SYNC = 'https://script.google.com/macros/s/FAKE/exec'
NOW = datetime(2026, 11, 18, 5, 0, 0, tzinfo=timezone.utc)
INDEX = (
    '<html><link rel="preload" href="data.json?v=0123abcdef" as="fetch">'
    '<script src="app.js?v=89abcdef01"></script><link href="style.css?v=1122334455" rel="stylesheet"></html>'
)
TREE = {
    'truncated': False,
    'tree': [
        {'path': 'index.html', 'type': 'blob', 'size': 1000},
        {'path': 'img/a.webp', 'type': 'blob', 'size': 300_000_000},
        {'path': 'img', 'type': 'tree'},
        {'path': 'docs/x.md', 'type': 'blob', 'size': 9_000_000_000},
        {'path': 'tools/health.py', 'type': 'blob', 'size': 20000},
    ],
}


def root(r2_at='2026-11-15', r2_bytes=6_300_000_000, version=176):
    d = tempfile.mkdtemp()
    os.makedirs(os.path.join(d, 'tools/sync'))
    open(os.path.join(d, 'app.js'), 'w').write("const SYNC_URL = '%s';\n" % SYNC)
    open(os.path.join(d, 'tools/sync/Code.gs'), 'w').write('const VERSION = %d;\n' % version)
    open(os.path.join(d, '.gitattributes'), 'w').write('* text=auto\n/docs/ export-ignore\n/tools/ export-ignore\n/tests/ export-ignore\n')
    open(os.path.join(d, 'tools/infra.json'), 'w').write(json.dumps({'r2': {'bytes': r2_bytes, 'at': r2_at}}))
    return d


def routes(**over):
    """The answers of a healthy day; a key replaced by a (status, body) or a callable."""
    r = {
        health.SITE + 'index.html': (200, INDEX.encode()),
        health.SITE + 'data.json?v=0123abcdef': (200, b'{"genera": [1]}'),
        SYNC + '?stats=1&av=health': (200, b'{"ok": true, "v": 176}'),
        'https://api.github.com/repos/%s/git/trees/main?recursive=1' % health.REPO: (200, json.dumps(TREE).encode()),
    }
    r.update(over)
    return r


def fake(table, seen):
    def get(url, data=None, headers=None, timeout=15):
        seen.append({'url': url, 'post': data is not None, 'auth': bool(headers and 'Authorization' in headers)})
        v = table.get(url, (404, b''))
        return v(url, data) if callable(v) else v

    return get


def go(table, env=None, rt=None, post_table=None):
    seen = []
    get = fake(table, seen)
    post = fake(post_table if post_table is not None else {}, seen)
    results, items, snap = health.run(get, post, env if env is not None else {'GITHUB_TOKEN': SECRET_GH}, root=rt or root(), now=NOW, pause=0)
    md = health.markdown(results, items)
    out = json.dumps([results, items, snap]) + md
    return {
        'ok': snap['ok'],
        'results': {r['name']: [r['level'], r['note']] for r in results},
        'items': {i['k']: {'used': i.get('used'), 'pct': i.get('pct'), 'warn': i.get('warn'), 'note': i.get('note')} for i in items},
        'calls': seen,
        'leaks': [s for s in (SECRET_GH, SECRET_ADMIN) if s in out],
        'md': md,
        'snap': snap,
    }


def infra_reply(total=8_100_000, saved_days=2, last=None):
    saved = int((NOW.timestamp() - saved_days * 86400) * 1000) if saved_days is not None else None
    return {
        'ok': True,
        'v': 177,
        'cells': {'total': total, 'limit': 10_000_000, 'tabs': 30, 'top': [['Answers', 150000, 26]]},
        'answers': {'rows': 40000, 'cols': 18, 'cells': 3_900_000},
        'tim': {'days': 7, 'ops': [{'op': 'read Answers', 'n': 100, 'p50': 1000, 'p90': 4000, 'max': 6000}]},
        'backup': {'saved': saved, 'last': last or ({'at': saved, 'ok': True, 'text': 'saved reef-id-sheet-2026-11-16.xlsx'} if saved else None)},
    }


def with_token(reply):
    body = json.dumps(reply).encode()
    return {SYNC: lambda url, data: (200, body) if json.loads(data).get('token') == SECRET_ADMIN else (200, b'{"ok": false, "error": "token"}')}


def main():
    S = {}
    S['ok'] = go(routes())
    S['unstamped'] = go(routes(**{health.SITE + 'index.html': (200, INDEX.replace('app.js?v=89abcdef01', 'app.js?v=212').encode())}))
    S['index_down'] = go(routes(**{health.SITE + 'index.html': (503, b'')}))
    S['data_bad'] = go(routes(**{health.SITE + 'data.json?v=0123abcdef': (200, b'<html>')}))
    S['sheet_down'] = go(routes(**{SYNC + '?stats=1&av=health': (0, b'URLError')}))
    S['sheet_notok'] = go(routes(**{SYNC + '?stats=1&av=health': (200, b'{"ok": false, "error": "server"}')}))
    behind = routes(**{SYNC + '?stats=1&av=health': (200, b'{"ok": true, "v": 175}')})
    commits = 'https://api.github.com/repos/%s/commits?path=tools/sync/Code.gs&per_page=1' % health.REPO
    behind[commits] = (200, json.dumps([{'commit': {'committer': {'date': '2026-11-18T04:50:00Z'}}}]).encode())
    S['behind_recent'] = go(behind)
    old = dict(behind)
    old[commits] = (200, json.dumps([{'commit': {'committer': {'date': '2026-11-18T03:00:00Z'}}}]).encode())
    S['behind_stuck'] = go(old)
    S['tree_truncated'] = go(routes(**{'https://api.github.com/repos/%s/git/trees/main?recursive=1' % health.REPO: (200, b'{"truncated": true, "tree": []}')}))
    S['r2_warn'] = go(routes(), rt=root(r2_bytes=7_500_000_000))
    S['r2_exactly_70'] = go(routes(), rt=root(r2_bytes=7_000_000_000))
    S['r2_stale'] = go(routes(), rt=root(r2_at='2026-10-01'))
    S['token_ok'] = go(routes(), env={'GITHUB_TOKEN': SECRET_GH, 'INFRA_TOKEN': SECRET_ADMIN}, post_table=with_token(infra_reply()))
    S['token_cells_warn'] = go(routes(), env={'INFRA_TOKEN': SECRET_ADMIN}, post_table=with_token(infra_reply(total=7_400_000)))
    S['token_backup_old'] = go(routes(), env={'INFRA_TOKEN': SECRET_ADMIN}, post_table=with_token(infra_reply(saved_days=9, last={'at': 0, 'ok': False, 'text': 'failed: result 2000'})))
    S['token_backup_never'] = go(routes(), env={'INFRA_TOKEN': SECRET_ADMIN}, post_table=with_token(infra_reply(saved_days=None, last={'at': 1, 'ok': False, 'text': 'not configured'})))
    S['token_refused'] = go(routes(), env={'INFRA_TOKEN': 'wrong'}, post_table=with_token(infra_reply()))
    S['token_old_script'] = go(routes(), env={'INFRA_TOKEN': SECRET_ADMIN}, post_table={SYNC: (200, b'{"ok": false, "error": "input", "v": 176}')})

    # The brief's line, from the snapshots above and from hand-made ones.
    line = lambda snap, ago=None: list(brief.infra_line(snap, ago))  # noqa: E731
    B = {
        'healthy': line(S['ok']['snap'], '1h'),
        'warn': line(S['r2_warn']['snap'], '1h'),
        'token': line(S['token_cells_warn']['snap'], '2h'),
        'failed': line(S['sheet_down']['snap'], '0m'),
        'unread': line({'ok': True, 'items': []}),
        'exactly_70': line(S['r2_exactly_70']['snap']),
    }

    # infra_read: the latest completed run, its first job, the annotation titled infra.
    paths = []

    def fake_gh(path, lines=False):
        paths.append(path)
        if 'workflows/health.yml/runs' in path:
            return {'workflow_runs': [{'id': 7, 'created_at': '2026-11-18T04:41:00Z'}]}
        if '/actions/runs/7/jobs' in path:
            return {'jobs': [{'id': 99}]}
        if '/check-runs/99/annotations' in path:
            return [{'title': 'other', 'message': 'x'}, {'title': 'infra', 'message': json.dumps(S['ok']['snap'])}]
        raise brief.Soft('unexpected ' + path)

    brief.gh = fake_gh
    snap, at = brief.infra_read()
    R = {'paths': paths, 'at': at, 'same': snap == S['ok']['snap']}
    brief.gh = lambda path, lines=False: {'workflow_runs': []}
    try:
        brief.infra_read()
        R['empty'] = 'no error'
    except brief.Soft as e:
        R['empty'] = str(e)
    S2 = {k: {kk: vv for kk, vv in v.items() if kk not in ('snap',)} for k, v in S.items()}
    print(json.dumps({'S': S2, 'B': B, 'R': R, 'consts': {'health_warn': health.WARN, 'brief_warn': brief.INFRA_WARN, 'limits': health.LIMITS}}))


main()
