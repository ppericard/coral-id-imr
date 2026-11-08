#!/usr/bin/env python3
"""Session start brief (governance refonte PR B, Pierre 2026-11-05): where things stand, computed, read-only.

  python3 tools/brief.py           full brief (the integrator runs it at each stop)
  python3 tools/brief.py --short   5 lines at most (the SessionStart hook in .claude/settings.json)
  python3 tools/brief.py --time    one line: Manila time and the Rule 0 window (the UserPromptSubmit hook; offline)
  --at HH:MM                       pretend it is that Manila time (tests)

It prints the Manila time and the Rule 0 window (AGENTS.md Rule 0), the open PRs (checks, the needs-pierre label, age),
the remote branches with commits not in main and no PR (rule W6), the sheet script's VERSION on main against
the live one, the stack items behind their latest stable (tools/stack_check.py --latest, cached for the day), and the open questions for Pierre from docs/STATUS.md; the full brief adds the fish candidates waiting for the judging pass. The hooks run main's reviewed copy
(`git show origin/main:tools/brief.py | python3 -I -`), never the copy of the branch checked out (Codex security
review #561), so the script must also work fed on stdin. Read-only and fast: GitHub through `gh api` (REST
only), the sheet through the same read-only GET the app makes (?stats=1), all at once with a deadline of about 5 s.
Anything missing (no network, no gh, no git remote) is said in one line and skipped. It never prints a secret or a
player's name: from the sheet's reply it reads only the version number.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, wait
from datetime import datetime, timedelta, timezone

# The checkout: next to this file, or, when the hooks feed main's copy on stdin (no file), CLAUDE_PROJECT_DIR.
_HERE = globals().get('__file__', '')
ROOT = (
    os.path.dirname(os.path.dirname(os.path.abspath(_HERE)))
    if _HERE.endswith('.py')
    else os.environ.get('CLAUDE_PROJECT_DIR') or os.getcwd()
)
REPO = 'ppericard/coral-id-imr'
DEADLINE = 5.0  # seconds for every network call together
START = time.monotonic()
MANILA = timezone(timedelta(hours=8))  # Asia/Manila, UTC+8 all year (no daylight saving)


def left():
    return max(0.3, DEADLINE - (time.monotonic() - START))


# --- Rule 0 window -------------------------------------------------------------------------------------------------------
# AGENTS.md Rule 0: before 16:30 a normal day; from 16:30 sharp close what is open with Pierre; from 17:30 quiet hours
# until his next morning (the morning report is written before 05:00, so 00:00-05:00 is still night).


def window(hm):
    m = hm[0] * 60 + hm[1]
    if m < 5 * 60:
        return 'night', 'quiet hours (Rule 0): never solicit Pierre; morning report into docs/STATUS.md before 05:00'
    if m < 16 * 60 + 30:
        return 'day', 'normal working day (Rule 0): nothing different until 16:30'
    if m < 17 * 60 + 30:
        return 'closing', 'close what is open with Pierre (Rule 0): start nothing new that needs him; day ends 17:30'
    return 'quiet', 'quiet hours (Rule 0): never solicit Pierre; park his ideas and questions in docs/STATUS.md'


def time_line(at):
    now = datetime.now(MANILA)
    if at:
        h, m = (int(x) for x in at.split(':'))
        now = now.replace(hour=h, minute=m)
    name, what = window((now.hour, now.minute))
    return 'Manila %s · %s: %s' % (now.strftime('%a %d %b %H:%M'), name, what)


# --- GitHub (gh api, REST) -----------------------------------------------------------------------------------------------


class Soft(Exception):
    pass


def gh(path, lines=False):
    """One REST call through gh; lines=True: every page, one JSON object per array item."""
    args = ['gh', 'api', path] + (['--paginate', '--jq', '.[]'] if lines else [])
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=left())
    except subprocess.TimeoutExpired:
        raise Soft('no answer in time')
    if r.returncode:
        msg = (r.stderr or r.stdout).strip()
        if 'auth login' in msg or 'GH_TOKEN' in msg:
            raise Soft('gh not signed in')
        if 'https://' in msg or 'dial ' in msg or 'connect' in msg:
            raise Soft('no network')
        raise Soft(msg.splitlines()[0][:80] if msg else 'gh failed')
    if lines:
        return [json.loads(l) for l in r.stdout.splitlines() if l.strip()]
    return json.loads(r.stdout or 'null')


def age(iso):
    t = datetime.strptime(iso, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
    s = (datetime.now(timezone.utc) - t).total_seconds()
    if s < 3600:
        return '%dm' % max(0, s // 60)
    if s < 48 * 3600:
        return '%dh' % (s // 3600)
    return '%dd' % (s // 86400)


def summarise(runs):
    """Green only when every check run completed as success, skipped or neutral (a cancelled or stale run never passed)."""
    if not runs:
        return 'no checks'
    going = [r for r in runs if r.get('status') != 'completed']
    done = [r for r in runs if r.get('status') == 'completed']
    bad = [r for r in done if r.get('conclusion') in ('failure', 'timed_out', 'action_required', 'startup_failure')]
    other = [r for r in done if r not in bad and r.get('conclusion') not in ('success', 'skipped', 'neutral')]
    if bad:
        return 'FAILING %d/%d' % (len(bad), len(runs))
    if going:
        return 'running %d/%d' % (len(going), len(runs))
    if other:
        kinds = sorted({str(r.get('conclusion')) for r in other})
        return 'NOT GREEN %d/%d (%s)' % (len(other), len(runs), ', '.join(kinds))
    return 'green'


def checks(pool, sha):
    return summarise(gh('repos/%s/commits/%s/check-runs?per_page=100' % (REPO, sha)).get('check_runs', []))


def prs(pool):
    out = []
    for p in gh('repos/%s/pulls?state=open&per_page=50' % REPO):
        labels = [l['name'] for l in p.get('labels', [])]
        out.append(
            {
                'n': p['number'],
                'title': p['title'],
                'ref': p['head']['ref'],
                'sha': p['head']['sha'],
                'age': age(p['created_at']),
                'pierre': 'needs-pierre' in labels,
                'draft': p.get('draft'),
                'checks': pool.submit(checks, pool, p['head']['sha']),
            }
        )
    return out


def stray(pool, open_refs):
    """Remote branches with commits not in main and no PR on their tip (rule W6)."""

    def one(b):
        ref, sha = b['name'], b['commit']['sha']
        owned = gh('repos/%s/pulls?state=all&per_page=10&head=%s:%s' % (REPO, REPO.split('/')[0], ref))
        if any(p['head']['sha'] == sha for p in owned):
            return None  # its tip is a PR's (merged, closed or open): nothing new since
        ahead = gh('repos/%s/compare/main...%s' % (REPO, sha)).get('ahead_by', 0)
        return ref if ahead else None

    # A merge train's branch (train/*, tools/train.py) never gets a PR: its PRs are merged on their own heads.
    branches = [
        b for b in gh('repos/%s/branches?per_page=100' % REPO, lines=True)
        if b['name'] != 'main' and b['name'] not in open_refs and not b['name'].startswith('train/')
    ]
    return [pool.submit(one, b) for b in branches]


# --- Sheet script version ------------------------------------------------------------------------------------------------


def main_version():
    """VERSION of tools/sync/Code.gs on main (the local origin/main, else the working tree)."""
    src, where = None, 'main'
    try:
        r = subprocess.run(['git', '-C', ROOT, 'show', 'origin/main:tools/sync/Code.gs'], capture_output=True, text=True, timeout=3)
        if r.returncode == 0:
            src = r.stdout
    except (OSError, subprocess.TimeoutExpired):
        pass
    if src is None:
        try:
            src, where = open(os.path.join(ROOT, 'tools/sync/Code.gs'), encoding='utf8').read(), 'this checkout'
        except OSError:
            return None, None
    m = re.search(r'const VERSION = (\d+);', src)
    return (int(m.group(1)) if m else None), where


def sync_url():
    """SYNC_URL from main's app.js (a branch cannot point the brief elsewhere), else from the checkout."""
    src = None
    try:
        r = subprocess.run(['git', '-C', ROOT, 'show', 'origin/main:app.js'], capture_output=True, text=True, timeout=3)
        src = r.stdout if r.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired):
        pass
    try:
        src = src or open(os.path.join(ROOT, 'app.js'), encoding='utf8').read()
    except OSError:
        return None
    m = re.search(r"const SYNC_URL = '([^']+)'", src)
    return m.group(1) if m else None


# The same read-only GET the app makes for photo statistics (sync.js loadStats), with an app version: without one the
# sync script takes the request for an app before 2026-11-03 and writes an "old" row in its Events tab (Codex review #561).
STATS_QUERY = '?stats=1&av=brief'


def live_version(url):
    # Only the version number is read from the reply.
    with urllib.request.urlopen(url + STATS_QUERY, timeout=left()) as r:
        return json.loads(r.read()).get('v')


# --- Stack (tools/stack_check.py --latest, once a day) -------------------------------------------------------------------
# Pierre, 2026-11-05: the whole stack on the latest stable versions. The brief runs main's reviewed tools/stack_check.py
# (as the hooks run main's brief), at most once a Manila day, within STACK_LIMIT seconds; its result is cached in
# tools/.cache/ (gitignored) and an older cached result is shown when the lookup fails or runs out of time.

STACK_CACHE = os.path.join('tools', '.cache', 'stack-latest.json')
STACK_LIMIT = 3.0  # seconds, git show included
MAIN = 'origin/main'  # where the reviewed tools/stack_check.py and tools/stack.json are read (tests: another ref)


def stack_fresh(c, day, now):
    """Today's result; one with sources not looked up is retried after an hour."""
    return bool(c) and c.get('day') == day and (not c.get('unknown') or now - c.get('t', 0) < 3600)


def stack_refresh(path, day):
    t0 = time.monotonic()
    r = subprocess.run(['git', '-C', ROOT, 'show', MAIN + ':tools/stack_check.py'], capture_output=True, text=True, timeout=STACK_LIMIT)
    if r.returncode:
        raise Soft('not on main')
    rest = STACK_LIMIT - (time.monotonic() - t0)
    args = [sys.executable, '-I', '-', '--latest', '--json', '--git-ref', MAIN, '--root', ROOT, '--timeout', '%.1f' % max(0.3, rest - 0.5)]
    try:
        out = subprocess.run(args, input=r.stdout, capture_output=True, text=True, timeout=max(0.5, rest))
    except subprocess.TimeoutExpired:
        raise Soft('no answer in %g s' % STACK_LIMIT)
    c = json.loads(out.stdout)
    c = {'day': day, 't': time.time(), 'outdated': c['outdated'], 'unknown': c['unknown'], 'checked': c['checked']}
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = '%s.%d' % (path, os.getpid())
    with open(tmp, 'w', encoding='utf8') as f:
        json.dump(c, f)
    os.replace(tmp, path)
    return c


def stack_get():
    """(result or None, why it is not today's or None). Never raises: the hook must not fail."""
    path, day = os.path.join(ROOT, STACK_CACHE), datetime.now(MANILA).date().isoformat()
    try:
        with open(path, encoding='utf8') as f:
            c = json.load(f)
    except (OSError, ValueError):
        c = None
    if stack_fresh(c, day, time.time()):
        return c, None
    try:
        return stack_refresh(path, day), None
    except Soft as e:
        return c, str(e)
    except Exception as e:  # no git, no network, JSON: the cached result if any
        return c, type(e).__name__


def stack_line(c, why):
    if not c and why == 'not on main':
        return None  # before tools/stack_check.py reaches main: nothing to say
    if not c:
        return 'Stack: not checked (%s): python3 tools/stack_check.py --latest' % (why or 'no result')
    n, u = c.get('outdated', []), c.get('unknown', [])
    s = 'Stack: %d outdated%s' % (len(n), ': ' + ', '.join(n) if n else '')
    s += ', %d not looked up' % len(u) if u else ''
    s += ' [as of %s: %s]' % (c.get('day', '?'), why) if why else ''
    return s + ' (python3 tools/stack_check.py --latest)'


# --- docs/STATUS.md ------------------------------------------------------------------------------------------------------


def questions():
    try:
        text = open(os.path.join(ROOT, 'docs/STATUS.md'), encoding='utf8').read()
    except OSError:
        return None, None, None
    sec = re.search(r'^## Questions for Pierre\n(.*?)(?=^## |\Z)', text, re.M | re.S)
    body = sec.group(1) if sec else ''
    n = len(re.findall(r'^- \*\*Q\d+', body, re.M))
    last = re.search(r'Last question number: Q(\d+)', text)
    checked = re.search(r'^Last checked: reports and events: (.+)$', text, re.M)
    return n, (int(last.group(1)) if last else None), (checked.group(1).strip() if checked else None)


def fish_todo():
    """(photos, species) of the fish candidates waiting for the judging pass: not decided by Pierre (curation.json fish
    add, seen, exclude, out) and not judged (suggest.json fish), as tools/judging_fish.py todo counts them; the automatic
    refill (tools/fetch_fish.py --refill, Q171) brings new ones after each Publish. None when a file is missing."""
    try:
        rd = lambda f: json.load(open(os.path.join(ROOT, f), encoding='utf8'))  # noqa: E731
        cand, cur, sug = rd('fish-cand.json').get('cand') or {}, rd('curation.json').get('fish') or {}, rd('suggest.json').get('fish') or {}
    except (OSError, ValueError):
        return None
    done = set().union(*(cur.get(k) or {} for k in ('add', 'seen', 'exclude', 'out')), sug)
    n = {sid: sum(1 for p in L if p.get('f') not in done) for sid, L in cand.items()}
    return sum(n.values()), sum(1 for v in n.values() if v)


# --- Output --------------------------------------------------------------------------------------------------------------


def result(f):
    """(value, None) or (None, reason) for a future, within the deadline."""
    try:
        return f.result(timeout=left()), None
    except Soft as e:
        return None, str(e)
    except OSError:  # URLError, timeouts, refused connections
        return None, 'no network'
    except Exception as e:  # JSON, anything else: soft
        return None, type(e).__name__


def brief(short, at):
    lines = [time_line(at)]
    pool = ThreadPoolExecutor(max_workers=16)
    have_gh = shutil.which('gh') is not None
    url = sync_url()
    f_prs = pool.submit(prs, pool) if have_gh else None
    f_live = pool.submit(live_version, url) if url else None
    f_stack = pool.submit(stack_get)
    v_main, v_where = main_version()
    q_open, q_last, checked = questions()

    # GitHub: PRs, then the branches (the open PRs' heads are skipped)
    pr_list, gh_err = (None, 'gh not found') if not have_gh else result(f_prs)
    strays, stray_err = None, None
    if pr_list is not None:
        f_br = pool.submit(stray, pool, {p['ref'] for p in pr_list})
        futs, stray_err = result(f_br)
        if futs is not None:
            got = [result(f) for f in futs]
            errs = [e for _, e in got if e]
            strays = [v for v, _ in got if v]
            if errs:
                stray_err = 'partial (%d not checked: %s)' % (len(errs), errs[0])
    if pr_list is None:
        lines.append('GitHub: skipped (%s): no PRs or branches listed.' % gh_err)
    else:
        for p in pr_list:
            c, e = result(p['checks'])
            p['checks'] = c or ('checks ?' if e else '')
        if short:
            bits = ['#%d %s%s' % (p['n'], p['checks'], ', needs-pierre' if p['pierre'] else '') for p in pr_list]
            lines.append('PRs: %d open%s' % (len(pr_list), (': ' + '; '.join(bits)) if bits else ''))
        else:
            lines.append('Open PRs: %d' % len(pr_list))
            for p in pr_list:
                tags = [p['checks'], p['age']] + (['needs-pierre'] if p['pierre'] else []) + (['draft'] if p['draft'] else [])
                lines.append('  #%d %s [%s]' % (p['n'], p['title'][:70], ', '.join(t for t in tags if t)))
        if strays is None:
            lines.append('Branches without a PR: not checked (%s).' % stray_err)
        else:
            names = [re.sub(r'^claude/', '', b) for b in strays] if short else strays
            s = ', '.join(names) if names else 'none'
            lines.append('Branches with work and no PR (rule W6): %s%s' % (s, ' [%s]' % stray_err if stray_err else ''))

    # Sheet script
    if f_live is None:
        live, live_err = None, 'SYNC_URL not found in app.js'
    else:
        live, live_err = result(f_live)
    vm = 'v%s on %s' % (v_main, v_where) if v_main else 'VERSION not found'
    vl = 'live v%s' % live if live is not None else 'live v unknown (%s)' % live_err
    warn = ''
    if v_main and live is not None and live < v_main:
        warn = ': behind (it updates itself about 15 min after a merge; see the sheet\'s Deploy log)'
    sheet = 'Sheet script: %s · %s%s' % (vm, vl, warn)

    # Stack: its own line in the full brief; in the short one (5 lines) after the sheet script, only when something is due
    got, err = result(f_stack)
    st = stack_line(*(got if got else (None, err)))
    if not short:
        lines += [sheet] + ([st] if st else [])
    elif st and got and got[0] and (got[0].get('outdated') or got[1]):
        lines.append(sheet + ' · ' + st)
    else:
        lines.append(sheet)

    # Questions
    # The players' reports and the app's events live in the sheet, which only the agent's connector reads (AGENTS.md
    # "Working mode", reports and events): remind of the check, with when it was last done.
    remind = 'reports and events last checked %s: read them (sheet tabs Reports, Events; Sheets connector)' % (checked or 'never')
    if q_open is None:
        lines.append('Questions for Pierre: docs/STATUS.md not found · ' + remind)
    else:
        q = 'Questions for Pierre: %d open, last number Q%s (docs/STATUS.md)' % (q_open, q_last if q_last is not None else '?')
        lines += [q + ' · ' + remind] if short else [q, 'Players: ' + remind]
    ft = None if short else fish_todo()
    if ft and ft[0]:
        lines.append('Fish candidates waiting for the judging pass: %d in %d species (python3 tools/judging_fish.py todo)' % ft)
    pool.shutdown(wait=False, cancel_futures=True)
    return lines[:5] if short else lines


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--short', action='store_true', help='5 lines at most')
    ap.add_argument('--time', action='store_true', help='one line: Manila time and the Rule 0 window (offline)')
    ap.add_argument('--at', metavar='HH:MM', help='pretend it is this Manila time (tests)')
    a = ap.parse_args()
    if a.at and not re.fullmatch(r'([01]\d|2[0-3]):[0-5]\d', a.at):
        ap.error('--at takes HH:MM')
    if a.time:
        print(time_line(a.at))
        return
    print('\n'.join(brief(a.short, a.at)))
    sys.stdout.flush()
    os._exit(0)  # do not wait for calls past the deadline


if __name__ == '__main__':
    main()
