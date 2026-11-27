#!/usr/bin/env python3
"""The merge train (Pierre, 2026-11-08, Q305 b; rule W26): several ready PRs tested together once, then merged without
bringing each one up to date. The integrator's tool, run from its checkout of the repository.

    python3 tools/train.py --dry-run 801 803 805   # check the PRs and build the train locally; pushes and merges nothing
    python3 tools/train.py 801 803 805             # the real run: in the background, it waits for CI (about 4 min)

For one PR, the queue passes `--sha FULL_SHA` to both invocations to keep the head that passed its review gates.

In order (GitHub through `gh api`, GET and PUT only; git pushes one new branch and moves `release`, never a force-push;
nothing is re-run):
1. Each PR, in the order given: open, based on main, not a draft, no `needs-pierre` label, from this repository, every
   check green on its head, no file left in tools/sync/changes/ (a PR that changes Code.gs gets its VERSION first:
   tools/sheet_version.py --assign on its branch, and that head is green and Codex-clean like any other). From PR
   BODY_FROM on, its description too (AGENTS.md "Working mode", "Easy to correct"; Pierre, 2026-11-18):
   "Choices I made" starts with None, and "Players see or play differently?" says No, or gives each change with Pierre's
   words quoted and dated ("Pierre, 2026-11-18: «…»") or marked "integrator's call"; a STATUS handover ("STATUS: …")
   and Dependabot's PRs are exempt. The rest of the merge contract
   (Codex findings answered, threads resolved) is the integrator's to check before it names a PR here.
2. Builds the train in a temporary worktree without the photos: origin/main, then each head merged in order. A conflict
   stops it (leave that PR out, or bring it up to date). The sheet rules are checked on it as on main, by main's copy
   of tools/sheet_version.py: no code from a PR's head runs on the integrator's machine.
   It also classifies the train's whole diff from main (tools/smoke_scope.py, the same rule as the Smokes workflow's
   "browser scope" job; rule W12): a docs-only train runs no browser smoke (Pierre, 2026-11-26, REE-121 (b)), any
   other runs the whole browser matrix (d). From that and the train's own checks.yml and smokes.yml it lists the jobs
   that must succeed: every Checks job (both unit shards), `browser scope`, `answer cost`, and every `smoke (…)` job
   unless the train is docs-only. A workflow file it cannot read stops it before pushing.
   Then, for a train of one PR, tools/train_reuse.py (Pierre, 2026-11-26, REE-121 (a)) looks for the PR's own CI on
   this very tree (GitHub's merge of the same head into the same main commit), obligation by obligation: Checks (all
   three jobs) and `answer cost`; never the browser matrix. It prints one "Reuse audit" line. With TRAIN_REUSE=on, a
   proven obligation is not run again: the branch is named train/<UTC time>-reuse-checks and/or -reuse-cost, the
   workflows skip those jobs on it, and they leave the list of jobs that must succeed. Anything missing, stale,
   cancelled, re-run, partial, from another event or repository, or not read is run as before; so are several PRs.
   `shadow` (the default) decides and logs but runs everything; `off` decides nothing.
3. --dry-run stops here and says what it would do.
4. Rechecks the heads and main, pushes a new branch train/<UTC time> and waits for the Checks and Smokes workflows (their
   `push: train/*` trigger). Red, or an expected job missing or skipped: nothing is merged; it names the jobs (never
   re-run them, rule W23). The branch stays; the weekly "Clean branches and Actions" workflow (.github/workflows/clean.yml)
   deletes it after two days.
5. Green: squash-merges each PR through the API in order, at the head the train tested, titled "<title> (#N)". Before
   each merge main must be where the train left it (its base, then the previous merge): if a Publish, an Action or
   another merge landed meanwhile, it stops, and the PRs not merged yet go in a new train.
6. Checks that main's tree is the train's: what was tested is what went live. If not, it says so (exit 2): test main
   and fix forward.
7. Only then moves the `release` branch to the commit main ended on after the last merge (the one whose tree the train
   tested), creating `release` when it is missing: a plain push, so it can only fast-forward, never a force-push. The
   sheet script (tools/sync/Code.gs `autoUpdate`) installs its code from `release`, not from `main`, so it only ever
   takes code a green train tested (Pierre, 2026-11-18; docs/rules/sheet.md D3). The train is the only thing that
   pushes `release`: nobody else does, by hand or from a workflow. If that push is refused it says so (exit 3): main
   is merged and fine, `release` stays where it was and the next train moves it.
Environment: TRAIN_REPO (default ppericard/coral-id-imr), TRAIN_POLL (seconds between two looks at CI, default 20),
TRAIN_WAIT (seconds before giving up on CI, default 1800), TRAIN_BODY_FROM (the first PR number whose description is
checked, default BODY_FROM), TRAIN_REUSE (off, shadow or on; tools/train_reuse.py), TRAIN_EVIDENCE (a file the
per-obligation evidence of each pushed train is appended to, one JSON line; the queue gives its own).
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile, time
from datetime import datetime, timezone

import smoke_scope  # tools/smoke_scope.py, beside this file in the integrator's checkout of main
import train_reuse  # tools/train_reuse.py, likewise

REPO = os.environ.get('TRAIN_REPO', 'ppericard/coral-id-imr')
POLL = float(os.environ.get('TRAIN_POLL', '20'))
WAIT = float(os.environ.get('TRAIN_WAIT', '1800'))
WORKFLOWS = ('Checks', 'Smokes')  # the workflows a train push runs (.github/workflows/checks.yml, smokes.yml)
GREEN = {'success', 'skipped', 'neutral'}
CHANGES = 'tools/sync/changes'
RELEASE = 'release'  # the branch the sheet script updates itself from; only this train moves it
# PRs opened before the description check was written keep the older template: only later ones are checked.
BODY_FROM = int(os.environ.get('TRAIN_BODY_FROM', '1117'))  # #1117 brought the check
# Pierre's words, quoted and dated: "Pierre, 2026-11-18: «…»" (or "…", “…”), the date and the quote on the same item.
QUOTE = re.compile(r'Pierre\b[^\n]{0,40}?\b20\d\d-\d\d-\d\d\b[^\n]*?(«[^»]+»|"[^"]+"|“[^”]+”)')
CALL = re.compile(r"integrator['’]s call", re.I)


class Stop(Exception):
    pass


def section(body, title):
    """The text under the `## <title>…` heading (comments removed), or None when there is no such heading."""
    body = re.sub(r'<!--.*?-->', '', body or '', flags=re.S)
    m = re.search(r'^##[ \t]+%s[^\n]*\n(.*?)(?=^##[ \t]|\Z)' % re.escape(title), body, re.M | re.S)
    return m.group(1).strip() if m else None


def exempt(p):
    """PRs whose description is not the template's: a STATUS handover (title "STATUS: …", rule W26 sends it through a
    train) and Dependabot's version bumps (rule W9)."""
    return p.get('title', '').startswith('STATUS:') or (p.get('user') or {}).get('login') == 'dependabot[bot]'


def body_problems(body):
    """What the PR description lacks for the merge contract (AGENTS.md "Working mode"): [] when it is fine."""
    why = []
    choices = section(body, 'Choices I made')
    if choices is None:
        why.append('its description has no "Choices I made" section (.github/pull_request_template.md)')
    elif not re.match(r'(?i)none\b', choices):
        why.append('"Choices I made" is not None: those choices wait for Pierre')
    sees = section(body, 'Players see')
    if not sees:
        why.append('"Players see or play differently?" is empty: write No, or each change with its source')
    elif not re.match(r'(?i)no\b', sees):
        # One item per list entry (-, *, + or 1. / 1)); a leading "Yes" or "Yes:" alone is no change.
        items = [i for i in re.split(r'\n(?=\s*(?:[-*+]|\d+[.)])\s)', sees) if i.strip() and not re.fullmatch(r'(?i)\s*yes\s*[:.]?\s*', i)]
        bad = [re.sub(r'^\s*(?:[-*+]|\d+[.)])\s*', '', i)[:60] for i in items if not (QUOTE.search(i) or CALL.search(i))]
        if not items:
            why.append('"Players see" says Yes but names no change: give each one with its source')
        elif bad:
            why.append('"Players see" names a change with neither Pierre\'s words quoted and dated nor "integrator\'s call": %s'
                       % '; '.join('"%s…"' % b for b in bad))
    return why


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


def ready(n, top, expected_sha=None):
    """The PR's (head sha, title), or the reasons it cannot ride the train."""
    p = api('pulls/%s' % n)
    sha = p['head']['sha']
    if expected_sha is not None and sha != expected_sha:
        raise Stop('#%s head moved since its gates passed (%s -> %s): nothing built' % (n, expected_sha[:7], sha[:7]))
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
    if int(n) >= BODY_FROM and not exempt(p):
        why += body_problems(p.get('body'))
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
    """The train in the temporary worktree wt: base, then each head merged in order. Returns (train sha, its tree,
    whether main's sheet check ran on it: the train-mode `--main` check, which tools/train_reuse.py counts on)."""
    os.makedirs(os.path.dirname(wt), exist_ok=True)
    git('worktree', 'add', '-q', '--detach', '--no-checkout', wt, base, cwd=top)
    git('sparse-checkout', 'set', '--no-cone', '/*', '!/img/', cwd=wt)
    git('reset', '-q', '--hard', base, cwd=wt)
    for n, sha, title in prs:
        r = subprocess.run(['git', 'merge', '-q', '--no-ff', '--no-edit', '-m', 'Train: %s (#%s)' % (title, n), sha], cwd=wt, capture_output=True, text=True)
        if r.returncode:
            subprocess.run(['git', 'merge', '--abort'], cwd=wt, capture_output=True)
            raise Stop('#%s conflicts with main and the PRs before it in the train: leave it out, or bring it up to date first' % n)
    # The sheet check runs main's reviewed copy of the validator, never the one the PRs bring (Codex security review
    # #757: a head's code would run with the credentials that push and merge); the train is only its data. -I: no module
    # from the train or the current folder is imported.
    tool = subprocess.run(['git', 'show', '%s:tools/sheet_version.py' % base], cwd=top, capture_output=True, text=True)
    if tool.returncode == 0:
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, 'sheet_version.py')
            open(path, 'w', encoding='utf-8').write(tool.stdout)
            r = subprocess.run([sys.executable, '-I', path, '--check', '--main', '--base', base], cwd=wt, capture_output=True, text=True)
        if r.returncode:
            raise Stop('the train breaks the sheet rules (rule D3):\n' + r.stdout.strip())
    return git('rev-parse', 'HEAD', cwd=wt), git('rev-parse', 'HEAD^{tree}', cwd=wt), tool.returncode == 0


def expected_jobs(top, base, train):
    """(kind, {workflow: [the jobs that must succeed on this train]}): kind is smoke_scope's for the whole diff from base
    (docs, code, mixed or unknown; only docs drops the browser jobs). The jobs are read from the train's own workflow
    files (data only, nothing of the train runs), by the names the Actions API gives: tests/smokeparts.test.js holds the
    workflow files to them."""
    try:
        kind, _ = smoke_scope.classify(smoke_scope.changed(base, train, top))
    except smoke_scope.Unknown:
        kind = 'unknown'
    docs = kind == 'docs'

    def part(f, start, end):
        src = subprocess.run(['git', 'show', '%s:%s' % (train, f)], cwd=top, capture_output=True, text=True).stdout
        return src.split(start, 1)[1].split(end, 1)[0] if start in src else ''

    names = re.findall(r'\n\s+- name: (.+)', part('.github/workflows/smokes.yml', '\n  smoke:\n', '\n    steps:'))
    shards = re.search(r'^\s+shard: \[([\d, ]+)\][ \t]*$', part('.github/workflows/checks.yml', '\n  unit:\n', '\n    steps:'), re.M)
    if not names or not shards:
        raise Stop('cannot read the jobs this train must run from its smokes.yml and checks.yml: nothing pushed')
    ks = [k.strip() for k in shards.group(1).split(',')]
    want = {'Checks': ['checks'] + ['unit tests (%s/%d)' % (k, len(ks)) for k in ks],
            'Smokes': ['browser scope', 'answer cost'] + ([] if docs else ['smoke (%s)' % n.strip() for n in names])}
    return kind, want


def wait_green(sha, want):
    """Waits for the Checks and Smokes runs of the train's push; returns the failing jobs and the expected jobs that did
    not succeed (empty: green)."""
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
        jobs = api('actions/runs/%s/jobs?per_page=100' % runs[w]['id']).get('jobs', [])
        if runs[w].get('conclusion') not in GREEN:
            bad += ['%s › %s: %s' % (w, j['name'], j.get('conclusion')) for j in jobs if j.get('conclusion') not in GREEN] or ['%s: %s' % (w, runs[w].get('conclusion'))]
            continue
        # Green is not enough: a skipped or absent job is never a pass (REE-121: a browser job skipped on a code train,
        # a unit shard or answer cost missing).
        got = {j['name']: j.get('conclusion') for j in jobs}
        bad += ['%s › %s: %s' % (w, n, got.get(n) or 'did not run') for n in want[w] if got.get(n) != 'success']
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


def move_release(top, sha):
    """Moves `release` to sha (main's commit after the last merge, whose tree the train tested): creates it when missing,
    else a fast-forward. A plain push, never forced; the remote refuses anything but a fast-forward. Returns what it did."""
    git('fetch', '-q', 'origin', 'main', cwd=top)  # sha is on main: have its objects here to push it
    git('cat-file', '-e', sha + '^{commit}', cwd=top)
    old = git('ls-remote', 'origin', 'refs/heads/' + RELEASE, cwd=top).split()
    old = old[0] if old else ''
    if old == sha:
        return '%s is already at %s.' % (RELEASE, sha[:7])
    git('push', '-q', 'origin', '%s:refs/heads/%s' % (sha, RELEASE), cwd=top)
    return '%s %s: the sheet script takes its code from here.' % (RELEASE, 'moved %s -> %s' % (old[:7], sha[:7]) if old else 'created at ' + sha[:7])


def run(numbers, dry, expected_sha=None):
    top = git('rev-parse', '--show-toplevel')
    git('fetch', '-q', 'origin', 'main', cwd=top)
    base = git('rev-parse', 'origin/main', cwd=top)
    prs, refused = [], []
    for n in numbers:
        sha, title, why = ready(n, top, expected_sha)
        prs.append((n, sha, title))
        refused += ['#%s: %s' % (n, w) for w in why]
    if refused:
        raise Stop('not ready, nothing built:\n  ' + '\n  '.join(refused))
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
    wt, branch = os.path.join(top, '.claude', 'worktrees', 'train-' + stamp), 'train/' + stamp
    try:
        train, tree, sheet_checked = build(prs, top, base, wt)
        say('Train on main %s: %s' % (base[:7], ', '.join('#%s %s' % (n, sha[:7]) for n, sha, _ in prs)))
        say('Train %s, tree %s' % (train[:7], tree[:7]))
        kind, want = expected_jobs(top, base, train)
        if kind == 'docs':
            say('Docs-only train (rule W12): no browser smoke runs on tree %s; Checks and answer cost do.' % tree[:7])
        else:
            say('%s train: the whole browser matrix (%d jobs) runs on it.' % (kind.capitalize(), len(want['Smokes']) - 2))
        # REE-121 (a): the PR's own CI on this very tree, obligation by obligation; what is not proven runs here.
        plan = train_reuse.decide(api, git, repo=REPO, top=top, prs=prs, base=base, train=train, tree=tree, want=want,
                                  sheet_checked=sheet_checked)
        say(plan.audit())
        want, branch = plan.want(want), branch + plan.suffix()
        if dry:
            say('Dry run: would push %s, wait for %s on it, then squash-merge %s in this order, compare main\'s tree and move %s to the commit main ends on.'
                % (branch, ' and '.join(WORKFLOWS), ', '.join('#%s' % n for n, _, _ in prs), RELEASE))
            return 0
        for n, sha, _ in prs:
            if api('pulls/%s' % n)['head']['sha'] != sha:
                raise Stop('#%s head moved while building the train: nothing pushed' % n)
        now = main_sha()
        if now != base:
            raise Stop('main moved to %s while building the train: nothing pushed' % now[:7])
        git('push', '-q', 'origin', 'HEAD:refs/heads/' + branch, cwd=wt)
        say('Pushed %s; waiting for %s.' % (branch, ' and '.join(WORKFLOWS)))
        try:
            plan.write(os.environ.get('TRAIN_EVIDENCE'), branch=branch, at=stamp, kind=kind)
        except OSError as e:
            say('Reuse evidence not written (%s): the audit line above holds the decision.' % e)
    finally:
        subprocess.run(['git', 'worktree', 'remove', '--force', wt], cwd=top, capture_output=True)
        shutil.rmtree(wt, ignore_errors=True)
        subprocess.run(['git', 'worktree', 'prune'], cwd=top, capture_output=True)
    bad = wait_green(train, want)
    shadow = plan.shadow_check(bad)
    if shadow:
        say(shadow)
    if bad:
        raise Stop('the train is red or incomplete, nothing merged. Never re-run it (rule W23): find the PR the failing job points to, leave it out, run a new train; a job that did not run is a workflow fault, not a pass.\n  ' + '\n  '.join(bad))
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
    try:
        say(move_release(top, expect))
    except Stop as e:
        say('✗ %s not moved (%s). main is merged and fine; %s stays where it was: the next train moves it, or ask why the push was refused.' % (RELEASE, e, RELEASE))
        return 3
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('prs', nargs='+', help='the PR numbers, in merge order')
    ap.add_argument('--dry-run', action='store_true', help='check and build locally; push and merge nothing')
    ap.add_argument('--sha', help='only accept this full, previously reviewed head SHA (one PR)')
    a = ap.parse_args()
    if not all(p.isdigit() for p in a.prs):
        ap.error('PR numbers only')
    if a.sha is not None and (len(a.prs) != 1 or not re.fullmatch(r'[0-9a-f]{40}', a.sha)):
        ap.error('--sha takes a full 40-character Git SHA and exactly one PR')
    try:
        return run(a.prs, a.dry_run, a.sha)
    except Stop as e:
        say('✗ %s' % e)
        return 1


if __name__ == '__main__':
    sys.exit(main())
