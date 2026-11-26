#!/usr/bin/env python3
"""The night report (Pierre, 2026-11-18): what the agents did between 17:30 and 04:00 Manila, so a quiet night shows.

  python3 tools/night.py                 the last night (17:30 to 04:00 Manila; before 04:00: the night so far)
  python3 tools/night.py --json FILE     the report of a saved snapshot (tests; no network)

Rule 0 ends the quiet period at Pierre's first message after 04:00. The integrator sends the report in French at
that confirmed first message if it has not already been sent. The hook cannot establish either fact. The report's
calculation uses the clock window above.
It lists:
- the PRs merged during the night and their agent time (tools/effort.py's measure: the branch's first commit to its
  head's checks going green), with the total;
- the merge trains run and the red ones (tools/train.py; never re-run, rule W23);
- the PRs opened during the night and still open, with what holds each (needs-pierre, its checks);
- the night queue the integrator wrote in docs/STATUS.md "## Night queue" at 17:30: each item that names no PR (#N) did
  not start, and an item that names one shows that PR's state.
Read-only: GitHub through `gh api` (REST), docs/STATUS.md from the checkout. It never prints a player's name.
"""
import argparse
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

REPO = 'ppericard/coral-id-imr'
MANILA = timezone(timedelta(hours=8))
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
EVENING, MORNING = (17, 30), (4, 0)  # Rule 0's 17:30 and 04:00: his day starts with his first message after 04:00 (2026-11-19)


def window(now):
    """(start, end) of the last night in Manila time: yesterday 17:30 to today 04:00, or to now before 04:00."""
    now = now.astimezone(MANILA)
    today_morning = now.replace(hour=MORNING[0], minute=MORNING[1], second=0, microsecond=0)
    if now < today_morning:
        return (today_morning - timedelta(days=1)).replace(hour=EVENING[0], minute=EVENING[1]), now
    return (today_morning - timedelta(days=1)).replace(hour=EVENING[0], minute=EVENING[1]), today_morning


def parse(iso):
    return datetime.strptime(iso, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)


def hours(minutes):
    return '%d min' % round(minutes) if minutes < 90 else '%.1f h' % (minutes / 60)


def queue(status_text):
    """The bullets of STATUS "## Night queue" (None when there is no such section)."""
    m = re.search(r'^## Night queue\n(.*?)(?=^## |\Z)', status_text or '', re.M | re.S)
    if not m:
        return None
    items, cur = [], None
    for line in m.group(1).splitlines():
        if re.match(r'^\s*(?:[-*]|\d+\.) ', line):
            cur = re.sub(r'^\s*(?:[-*]|\d+\.) ', '', line).strip()
            items.append(cur)
        elif cur is not None and line.strip():
            items[-1] += ' ' + line.strip()
    return [i for i in items if not re.fullmatch(r'(?i)none\.?', i)]


def checks_state(runs):
    """green, running, failing or no checks: the head's check runs."""
    if not runs:
        return 'no checks'
    if any(r.get('status') != 'completed' for r in runs):
        return 'checks running'
    bad = [r for r in runs if r.get('conclusion') not in ('success', 'skipped', 'neutral')]
    return 'FAILING %d/%d' % (len(bad), len(runs)) if bad else 'green'


# REE-346 mitigation (a)4 (the integrator, 2026-11-27): anyone can open a PR on a public repository, and the integrator who
# reads this report holds the merge queue. A PR by anyone but the repository owner or a known agent identity is shown as
# `[outside] by <login>`, never with its title. tools/brief.py holds the same rule (these scripts stand alone).
AGENT_LOGINS = ('chatgpt-codex-connector[bot]', 'claude[bot]', 'github-actions[bot]')
INSIDE = {REPO.split('/')[0].lower(), *AGENT_LOGINS}


def outside(login):
    """True when a PR's author is neither the repository owner nor a known agent identity (nobody known: outside)."""
    return (login or '').lower() not in INSIDE


def shown(entry, limit):
    """A PR entry's title, or `[outside] by <login>` for an outside author. A snapshot saved before authors were
    recorded has no `author` key: its titles stay."""
    if 'author' not in entry or not outside(entry['author']):
        return entry['title'][:limit]
    return '[outside] by %s' % (re.sub(r'[^A-Za-z0-9\[\]-]', '', entry['author'] or '')[:40] or '?')


def report(snap):
    """The report's lines from a snapshot: {start, end, merged: [{n, title, author, agent_min}], trains: [{branch,
    conclusion, failed}], opened: [{n, title, author, why}], queue: [str] | None, prs: {n: state}}. An outside author's
    title is not kept in the snapshot (`title` None)."""
    start, end = datetime.fromisoformat(snap['start']), datetime.fromisoformat(snap['end'])
    out = ['Night %s → %s (Manila)' % (start.strftime('%a %d %b %H:%M'), end.strftime('%a %d %b %H:%M'))]
    merged, opened, trains = snap['merged'], snap['opened'], snap['trains']
    timed = [m['agent_min'] for m in merged if m.get('agent_min') is not None]
    total = (', %s of agent time' % hours(sum(timed))) if timed else ''
    out.append('Merged: %d PR%s%s' % (len(merged), '' if len(merged) == 1 else 's', total))
    for m in merged:
        t = hours(m['agent_min']) if m.get('agent_min') is not None else 'agent time not measured'
        out.append('  #%s %s (%s)' % (m['n'], shown(m, 80), t))
    red = [t for t in trains if t['conclusion'] not in ('success', None)]
    out.append('Trains: %d run, %d red%s' % (len(trains), len(red), ''.join(
        '\n  %s: %s' % (t['branch'], ', '.join(t.get('failed') or [t['conclusion']])) for t in red)))
    out.append('Opened and still open: %d' % len(opened))
    for o in opened:
        out.append('  #%s %s: %s' % (o['n'], shown(o, 70), o['why']))
    q = snap.get('queue')
    if q is None:
        out.append('Night queue: none written in docs/STATUS.md ("## Night queue", written at 17:30)')
    else:
        started = [i for i in q if re.search(r'#\d+', i)]
        out.append('Night queue: %d item%s, %d started' % (len(q), '' if len(q) == 1 else 's', len(started)))
        for i in q:
            nums = re.findall(r'#(\d+)', i)
            state = '; '.join('#%s %s' % (n, snap.get('prs', {}).get(n, 'state unknown')) for n in nums) or 'NOT STARTED'
            out.append('  %s [%s]' % (i[:90], state))
    if not merged and not opened:
        out.append('⚠ Nothing merged and no PR opened during the night.')
    return out


# --- GitHub ------------------------------------------------------------------------------------------------------------


def gh(path):
    r = subprocess.run(['gh', 'api', path], capture_output=True, text=True, timeout=60)
    if r.returncode:
        raise RuntimeError('gh api %s: %s' % (path, (r.stderr or r.stdout).strip()[:200]))
    return json.loads(r.stdout or 'null')


def gh_all(path, key=None, stop=None, pages=20):
    """Every page of a list (path ends with per_page=100): page=N until a short page; `key` picks the list out of an
    object (workflow_runs); `stop(item)` true on a page's last item ends early (lists sorted newest first)."""
    out = []
    for page in range(1, pages + 1):
        got = gh('%s&page=%d' % (path, page))
        got = got.get(key, []) if key else got
        out += got
        if len(got) < 100 or (stop and got and stop(got[-1])):
            return out
    return out


def agent_minutes(n):
    """tools/effort.py's agent time for one merged PR (cached by effort.py), or None."""
    try:
        sys.path.insert(0, HERE)
        import effort
        return effort.record(effort.fetch_raw(int(n)))['agent_min']
    except Exception:
        return None


def snapshot(now):
    start, end = window(now)
    s, e = start.astimezone(timezone.utc), end.astimezone(timezone.utc)
    inside = lambda iso: iso and s <= parse(iso) < e  # noqa: E731
    base = 'repos/%s' % REPO
    # Closed PRs newest-updated first, until one updated before the night (a merge updates the PR).
    closed = gh_all('%s/pulls?state=closed&sort=updated&direction=desc&per_page=100' % base, stop=lambda p: parse(p['updated_at']) < s)
    login = lambda p: (p.get('user') or {}).get('login')  # noqa: E731
    merged = [{'n': p['number'], 'title': None if outside(login(p)) else p['title'], 'author': login(p)}
              for p in closed if inside(p.get('merged_at'))]
    open_prs = gh_all('%s/pulls?state=open&per_page=100' % base)
    span = '%s..%s' % (s.strftime('%Y-%m-%dT%H:%M:%SZ'), e.strftime('%Y-%m-%dT%H:%M:%SZ'))
    runs = gh_all('%s/actions/runs?created=%s&per_page=100' % (base, span), key='workflow_runs')
    with ThreadPoolExecutor(8) as ex:
        for m, t in zip(merged, ex.map(agent_minutes, [m['n'] for m in merged])):
            m['agent_min'] = t
        states = dict(zip([p['number'] for p in open_prs], ex.map(
            lambda p: checks_state(gh('%s/commits/%s/check-runs?per_page=100' % (base, p['head']['sha'])).get('check_runs', [])),
            open_prs)))
    prs = {}
    for p in open_prs:
        held = ['needs-pierre'] if any(l['name'] == 'needs-pierre' for l in p.get('labels', [])) else []
        prs[str(p['number'])] = 'open, ' + ', '.join(held + [states[p['number']]])
    for p in closed:
        prs.setdefault(str(p['number']), 'merged' if p.get('merged_at') else 'closed unmerged')
    opened = [{'n': p['number'], 'title': None if outside(login(p)) else p['title'], 'author': login(p),
               'why': prs[str(p['number'])][len('open, '):]}
              for p in open_prs if inside(p.get('created_at'))]
    trains = {}
    for r in sorted(runs, key=lambda r: r['id']):
        if (r.get('head_branch') or '').startswith('train/') and r.get('event') == 'push':
            t = trains.setdefault(r['head_branch'], {'branch': r['head_branch'], 'conclusion': 'success', 'failed': []})
            if r.get('status') != 'completed':
                t['conclusion'] = None if t['conclusion'] == 'success' else t['conclusion']
            elif r.get('conclusion') not in ('success', 'skipped', 'neutral'):
                t['conclusion'] = 'failure'
                t['failed'].append('%s: %s' % (r['name'], r.get('conclusion')))
    try:
        status = open(os.path.join(ROOT, 'docs', 'STATUS.md'), encoding='utf-8').read()
    except OSError:
        status = ''
    return {'start': start.isoformat(), 'end': end.isoformat(), 'merged': merged, 'trains': list(trains.values()),
            'opened': opened, 'queue': queue(status), 'prs': prs}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--json', metavar='FILE', help='report a saved snapshot instead of asking GitHub (tests)')
    a = ap.parse_args()
    try:
        snap = json.load(open(a.json, encoding='utf-8')) if a.json else snapshot(datetime.now(timezone.utc))
    except Exception as e:
        print('Night report: not built (%s)' % e)
        return 1
    print('\n'.join(report(snap)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
