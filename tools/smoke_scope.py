#!/usr/bin/env python3
"""Whether a Smokes run needs the browser matrix (rule W12; Pierre, 2026-11-26, REE-121 (b) and (d)).

    python3 tools/smoke_scope.py   # in the "browser scope" job of .github/workflows/smokes.yml

- A merge train's push (refs/heads/train/*, tools/train.py): the browser matrix runs unless the whole change from the
  train's base (the `main` commit it was built on) to the train is docs only. Every path of that diff counts, deletions
  and both sides of a rename included (`git diff-tree --no-renames`). A docs-only train skips the browser matrix (b);
  a code, mixed or unknown one runs all of it (d). Anything this cannot prove (no "Train: …" merge on top, a base not
  on `main`, a missing commit, an empty diff, a git error) is unknown, so the browser matrix runs.
- A pull request: true. smokes.yml keeps the browser matrix off PR heads with the scope job's own `if:` (d); a docs-only
  PR never gets here (its paths-ignore). Dropping that `if:` line is the rollback: every code PR runs the matrix again.
- Anything else (workflow_dispatch, the manual full validation): true.

`answer cost` never depends on this: it runs on every code PR and every train, docs-only trains included.
DOCS is smokes.yml's pull_request paths-ignore, read with GitHub's pattern rules (`*` stops at `/`, `**` does not);
tests/smokeparts.test.js fails when the two lists differ. tools/train.py classifies the same diff with classify() and
refuses a train whose expected jobs did not all run.

Reads GITHUB_EVENT_NAME, GITHUB_REF and GITHUB_SHA; writes browser=true|false to GITHUB_OUTPUT and a line to
GITHUB_STEP_SUMMARY. The workflow fetches the train's first-parent commits and `main` (no file contents) beforehand.
"""
import os, re, subprocess, sys

DOCS = ('docs/**', '*.md', '.github/pull_request_template.md', 'LICENSE')
MAIN = 'refs/remotes/origin/main'
TRAIN_MERGE = 'Train: '  # the subject tools/train.py gives each merge of a train


class Unknown(Exception):
    pass


def _rx(pattern):
    """GitHub's file path pattern as a regular expression: `**` matches anything, `*` anything but `/`. Only those two
    wildcards are supported: any other special character would be read literally by this and not by GitHub."""
    if re.search(r'[?\[\]!+]', pattern):
        raise ValueError('unsupported pattern character in %r' % pattern)
    return re.compile(''.join('.*' if t == '**' else '[^/]*' if t == '*' else re.escape(t) for t in re.split(r'(\*\*|\*)', pattern)) + r'\Z')


DOC_RX = [_rx(p) for p in DOCS]


def is_doc(path):
    return any(r.match(path) for r in DOC_RX)


def classify(paths):
    """(kind, code paths): 'docs' when every path is a doc, 'code' when none is, 'mixed' otherwise, 'unknown' for no path."""
    paths = list(paths)
    if not paths:
        return 'unknown', []
    code = [p for p in paths if not is_doc(p)]
    return ('docs' if not code else 'code' if len(code) == len(paths) else 'mixed'), code


def git(cwd, *a):
    r = subprocess.run(['git', *a], cwd=cwd, capture_output=True, text=True)
    if r.returncode:
        raise Unknown('git %s: %s' % (a[0], ((r.stderr or r.stdout).strip().splitlines() or ['failed'])[-1]))
    return r.stdout


def changed(base, head, cwd=None):
    """Every path that differs between the two commits: added, modified, deleted, both sides of a rename."""
    return [p for p in git(cwd, 'diff-tree', '-r', '-z', '--no-renames', '--name-only', base, head).split('\0') if p]


def train_base(head, cwd=None):
    """The `main` commit a train was built on: down the first parents of its "Train: …" merges."""
    c, merges = head, 0
    while True:
        parents, _, subject = git(cwd, 'log', '-1', '--format=%P%n%s', c).partition('\n')
        parents = parents.split()
        if len(parents) != 2 or not subject.startswith(TRAIN_MERGE):
            break
        c, merges = parents[0], merges + 1
    if not merges:
        raise Unknown('%s is not a train (no "%s…" merge on top)' % (head[:7], TRAIN_MERGE))
    if subprocess.run(['git', 'merge-base', '--is-ancestor', c, MAIN], cwd=cwd, capture_output=True).returncode:
        raise Unknown('its base %s is not on main as fetched' % c[:7])
    return c


def decide(event, ref, head, cwd=None):
    """(browser, why)."""
    if event == 'pull_request':
        return True, 'a pull request head (smokes.yml decides whether this job runs on one)'
    if event != 'push' or not ref.startswith('refs/heads/train/'):
        return True, '%s on %s: the full browser matrix' % (event or 'no event', ref or 'no ref')
    try:
        base = train_base(head, cwd)
        kind, code = classify(changed(base, head, cwd))
    except Exception as e:  # Unknown, or anything unforeseen: never a reason to skip
        return True, 'unknown (%s): the full browser matrix' % e
    if kind == 'docs':
        return False, 'docs-only train on main %s: no browser smoke runs on this tree (rule W12 (b))' % base[:7]
    if kind == 'unknown':
        return True, 'no change from main %s: unknown, the full browser matrix' % base[:7]
    return True, '%s train on main %s (%s%s): the full browser matrix' % (kind, base[:7], ', '.join(code[:3]), ', …' if len(code) > 3 else '')


def main():
    env = os.environ
    browser, why = decide(env.get('GITHUB_EVENT_NAME', ''), env.get('GITHUB_REF', ''), env.get('GITHUB_SHA', 'HEAD'))
    line = 'browser=%s' % ('true' if browser else 'false')
    print('%s: %s' % (line, why), flush=True)
    if env.get('GITHUB_OUTPUT'):
        with open(env['GITHUB_OUTPUT'], 'a', encoding='utf-8') as f:
            f.write(line + '\n')
    if env.get('GITHUB_STEP_SUMMARY'):
        with open(env['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as f:
            f.write('Browser smokes: %s\n' % why)
    return 0


if __name__ == '__main__':
    sys.exit(main())
