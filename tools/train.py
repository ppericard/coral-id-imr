#!/usr/bin/env python3
"""The merge train (Pierre, 2026-11-08, Q305 b; rule W26): several ready PRs tested together once, then merged without
bringing each one up to date. The integrator's tool, run from its checkout of the repository.

    python3 tools/train.py --dry-run 801 803 805   # check the PRs and build the train locally; pushes and merges nothing
    python3 tools/train.py 801 803 805             # the real run: in the background, it waits for CI (about 4 min)

In order (GitHub through `gh api`, GET and PUT only; git pushes one new branch, never a force-push; nothing is re-run):
1. Each PR, in the order given: open, based on main, not a draft, no `needs-pierre` label, from this repository, every
   check green on its head, no file left in tools/sync/changes/ (a PR that changes Code.gs gets its VERSION first:
   tools/sheet_version.py --assign on its branch, and that head is green and Codex-clean like any other). The rest of
   the merge contract (Codex findings answered, threads resolved, "Choices I made" empty) is the integrator's to check
   before it names a PR here.
2. Builds the train in a temporary worktree without the photos: origin/main, then each head merged in order. A conflict
   stops it (leave that PR out, or bring it up to date). The sheet rules are checked on it as on main.
3. --dry-run stops here and says what it would do.
4. Pushes the train as a new branch train/<UTC time> and waits for the Checks and Smokes workflows on it (their
   `push: train/*` trigger). Red: nothing is merged; it names the failing jobs (never re-run them, rule W23).
5. Green: squash-merges each PR through the API in order, at the head the train tested, titled "<title> (#N)". Before
   each merge main must be where the train left it (its base, then the previous merge): if a Publish, an Action or
   another merge landed meanwhile, it stops, and the PRs not merged yet go in a new train.
6. Checks that main's tree is the train's: what was tested is what went live. If not, it says so (exit 2): test main
   and fix forward.
Environment: TRAIN_REPO (default ppericard/coral-id-imr), TRAIN_POLL (seconds between two looks at CI, default 20),
TRAIN_WAIT (seconds before giving up on CI, default 1800).
"""
import argparse, json, os, shutil, subprocess, sys, time
from datetime import datetime, timezone

REPO = os.environ.get('TRAIN_REPO', 'ppericard/coral-id-imr')
POLL = float(os.environ.get('TRAIN_POLL', '20'))
WAIT = float(os.environ.get('TRAIN_WAIT', '1800'))
WORKFLOWS = ('Checks', 'Smokes')  # the workflows a train push runs (.github/workflows/checks.yml, smokes.yml)
GREEN = {'success', 'skipped', 'neutral'}
CHANGES = 'tools/sync/changes'


class Stop(Exception):
    pass


def say(*a):
    print(*a, flush=True)


def git(*a, cwd=None):
    r = subprocess.run(['git', *a], cwd=cwd, capture_output=True, text=True)
    if r.returncode:
        raise Stop('git %s: %s' % (' '.join(a[:2]), ((r.stderr or r.stdout).strip().splitlines() or ['failed'])[-1]))
    return r.stdout.strip()


def api(path, method='GET', **fields):
    """gh api on this repository; only GET and PUT are ever sent."""
    assert method in ('GET', 'PUT'), method
    cmd = ['gh', 'api', 'repos/%s/%s' % (REPO, path)]
    if method == 'PUT':
        cmd += ['-X', 'PUT'] + [x for k, v in fields.items() for x in ('-f', '%s=%s' % (k, v))]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise Stop('gh api %s %s: %s' % (method, path, (r.stdout + r.stderr).strip()[:300]))
    return json.loads(r.stdout) if r.stdout.strip() else {}


def main_sha():
    return api('git/ref/heads/main')['object']['sha']


def ready(n, top):
    """The PR's (head sha, title), or the reasons it cannot ride the train."""
    p = api('pulls/%s' % n)
    why = []
    if p.get('state') != 'open':
        why.append('not open (%s)' % p.get('state'))
    if p['base']['ref'] != 'main':
        why.append('based on %s, not main' % p['base']['ref'])
    if p.get('draft'):
        why.append('a draft')
    if any(l['name'] == 'needs-pierre' for l in p.get('labels', [])):
        why.append('labelled needs-pierre: it waits for Pierre')
    if (p['head'].get('repo') or {}).get('full_name') != REPO:
        why.append('from another repository')
    sha = p['head']['sha']
    runs = api('commits/%s/check-runs?per_page=100' % sha).get('check_runs', [])
    if not runs:
        why.append('no checks on its head %s yet' % sha[:7])
    bad = ['%s: %s' % (r['name'], r.get('conclusion') or r['status']) for r in runs if r['status'] != 'completed' or r.get('conclusion') not in GREEN]
    if bad:
        why.append('not green on its head %s (%s)' % (sha[:7], ', '.join(bad)))
    git('fetch', '-q', 'origin', 'refs/pull/%s/head' % n, cwd=top)
    if git('rev-parse', 'FETCH_HEAD', cwd=top) != sha:
        why.append('its fetched head is not %s: it moved, try again' % sha[:7])
    else:
        left = [f for f in git('ls-tree', '-r', '--name-only', sha, '--', CHANGES, cwd=top).split() if not f.endswith('/README.md')]
        if left:
            why.append('still holds %s: assign its sheet VERSION first (tools/sheet_version.py --assign on its branch)' % ', '.join(left))
    return sha, p['title'], why


def build(prs, top, base, wt):
    """The train in the temporary worktree wt: base, then each head merged in order. Returns (train sha, its tree)."""
    os.makedirs(os.path.dirname(wt), exist_ok=True)
    git('worktree', 'add', '-q', '--detach', '--no-checkout', wt, base, cwd=top)
    git('sparse-checkout', 'set', '--no-cone', '/*', '!/img/', cwd=wt)
    git('reset', '-q', '--hard', base, cwd=wt)
    for n, sha, title in prs:
        r = subprocess.run(['git', 'merge', '-q', '--no-ff', '--no-edit', '-m', 'Train: %s (#%s)' % (title, n), sha], cwd=wt, capture_output=True, text=True)
        if r.returncode:
            subprocess.run(['git', 'merge', '--abort'], cwd=wt, capture_output=True)
            raise Stop('#%s conflicts with main and the PRs before it in the train: leave it out, or bring it up to date first' % n)
    if os.path.exists(os.path.join(wt, 'tools', 'sheet_version.py')):
        r = subprocess.run([sys.executable, 'tools/sheet_version.py', '--check', '--main', '--base', base], cwd=wt, capture_output=True, text=True)
        if r.returncode:
            raise Stop('the train breaks the sheet rules (rule D3):\n' + r.stdout.strip())
    return git('rev-parse', 'HEAD', cwd=wt), git('rev-parse', 'HEAD^{tree}', cwd=wt)


def wait_green(sha):
    """Waits for the Checks and Smokes runs of the train's push; returns the failing jobs (empty: green)."""
    end = time.time() + WAIT
    while True:
        runs = {}
        for r in sorted(api('actions/runs?head_sha=%s&event=push&per_page=50' % sha).get('workflow_runs', []), key=lambda r: r['id']):
            runs[r['name']] = r  # the latest run of each workflow
        if all(w in runs and runs[w]['status'] == 'completed' for w in WORKFLOWS):
            break
        if time.time() > end:
            raise Stop('CI on the train is not finished after %d min (%s): nothing merged' % (WAIT // 60, ', '.join('%s %s' % (w, runs[w]['status'] if w in runs else 'not started') for w in WORKFLOWS)))
        time.sleep(POLL)
    bad = []
    for w in WORKFLOWS:
        if runs[w].get('conclusion') not in GREEN:
            jobs = api('actions/runs/%s/jobs?per_page=100' % runs[w]['id']).get('jobs', [])
            bad += ['%s › %s: %s' % (w, j['name'], j.get('conclusion')) for j in jobs if j.get('conclusion') not in GREEN] or ['%s: %s' % (w, runs[w].get('conclusion'))]
    return bad


def merge(n, sha, title, expect):
    """Squash-merges one PR at the tested head, main being where the train left it; returns main's new sha."""
    for attempt in range(3):
        now = main_sha()
        if now != expect:
            raise Stop('main moved to %s before #%s (a Publish, an Action or another merge landed): stop here' % (now[:7], n))
        if api('pulls/%s' % n)['head']['sha'] != sha:
            raise Stop('#%s got a new head since the train was built: not merged' % n)
        try:
            return api('pulls/%s/merge' % n, 'PUT', merge_method='squash', sha=sha, commit_title='%s (#%s)' % (title, n))['sha']
        except Stop as e:
            if attempt == 2 or 'Base branch was modified' not in str(e):
                raise
            time.sleep(POLL)


def run(numbers, dry):
    top = git('rev-parse', '--show-toplevel')
    git('fetch', '-q', 'origin', 'main', cwd=top)
    base = git('rev-parse', 'origin/main', cwd=top)
    prs, refused = [], []
    for n in numbers:
        sha, title, why = ready(n, top)
        prs.append((n, sha, title))
        refused += ['#%s: %s' % (n, w) for w in why]
    if refused:
        raise Stop('not ready, nothing built:\n  ' + '\n  '.join(refused))
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
    wt, branch = os.path.join(top, '.claude', 'worktrees', 'train-' + stamp), 'train/' + stamp
    try:
        train, tree = build(prs, top, base, wt)
        say('Train on main %s: %s' % (base[:7], ', '.join('#%s %s' % (n, sha[:7]) for n, sha, _ in prs)))
        say('Train %s, tree %s' % (train[:7], tree[:7]))
        if dry:
            say('Dry run: would push %s, wait for %s on it, then squash-merge %s in this order and compare main\'s tree.'
                % (branch, ' and '.join(WORKFLOWS), ', '.join('#%s' % n for n, _, _ in prs)))
            return 0
        git('push', '-q', 'origin', 'HEAD:refs/heads/' + branch, cwd=wt)
        say('Pushed %s; waiting for %s.' % (branch, ' and '.join(WORKFLOWS)))
    finally:
        subprocess.run(['git', 'worktree', 'remove', '--force', wt], cwd=top, capture_output=True)
        shutil.rmtree(wt, ignore_errors=True)
        subprocess.run(['git', 'worktree', 'prune'], cwd=top, capture_output=True)
    bad = wait_green(train)
    if bad:
        raise Stop('the train is red, nothing merged. Never re-run it (rule W23): find the PR the failing job points to, leave it out, run a new train.\n  ' + '\n  '.join(bad))
    say('Train green.')
    expect, done = base, []
    try:
        for n, sha, title in prs:
            expect = merge(n, sha, title, expect)
            done.append(n)
            say('Merged #%s as %s' % (n, expect[:7]))
    except Stop as e:
        rest = [n for n, _, _ in prs if n not in done]
        raise Stop('%s\n  merged: %s; not merged: %s (a new train for them)' % (e, ', '.join('#' + n for n in done) or 'none', ', '.join('#' + n for n in rest)))
    got = api('git/commits/%s' % expect)['tree']['sha']
    if got != tree:
        say('✗ main %s has tree %s, the train tested %s: test main now and fix forward.' % (expect[:7], got[:7], tree[:7]))
        return 2
    say('main %s: its tree is the train\'s, what was tested is what went live.' % expect[:7])
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('prs', nargs='+', help='the PR numbers, in merge order')
    ap.add_argument('--dry-run', action='store_true', help='check and build locally; push and merge nothing')
    a = ap.parse_args()
    if not all(p.isdigit() for p in a.prs):
        ap.error('PR numbers only')
    try:
        return run(a.prs, a.dry_run)
    except Stop as e:
        say('✗ %s' % e)
        return 1


if __name__ == '__main__':
    sys.exit(main())
