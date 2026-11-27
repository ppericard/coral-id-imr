#!/usr/bin/env python3
"""Whether a CodeQL run analyses its commit (Pierre, 2026-11-26 and 2026-11-27, REE-121 (c)).

    python3 tools/codeql_scope.py   # in the "CodeQL scope" job of .github/workflows/codeql.yml

- A pull request: the change is GitHub's merge commit (the run's commit, checked out at depth 2) against its first
  parent, `main` as it was merged; its second parent must be the PR's head (PR_HEAD), or the change is unknown.
- A push to `main`: the change from the commit before the push (BEFORE, fetched without file contents) to the pushed one.
- The weekly run, a manual dispatch, anything else: the full analysis.

The commit is left unanalysed only when every path of its change matches EXEMPT (deletions and both sides of a rename
count: `git diff-tree --no-renames`) and none is in NEVER. EXEMPT is an explicit list of docs and data, validated
against the repository's files by tests/codeql.test.js: no wildcard but in a path with a fixed extension, never a whole
directory, never every Markdown, JSON or image file wherever it is. A workflow or action, executable source, a
dependency or configuration file, a mixed change, an empty, unknown or unreadable diff: analysed. The Analyze jobs then
show as skipped (never as a success) and nothing is uploaded for that commit; this job's notice says why.

Reads GITHUB_EVENT_NAME, GITHUB_REF, GITHUB_SHA, BEFORE and PR_HEAD; writes analyze=true|false to GITHUB_OUTPUT and a
line to GITHUB_STEP_SUMMARY. Shares the path patterns and the diff with tools/smoke_scope.py.
"""
import os, re, subprocess, sys

from smoke_scope import Unknown, _rx, changed, git

EXEMPT = (
    # Markdown docs: the root's, docs/ and the PR template. Never docs/ as a whole: its studies hold .py, .js and .sh.
    '*.md',
    'docs/**.md',
    '.github/pull_request_template.md',
    'LICENSE',
    # The photo judgements and their briefs.
    'judging/**.json',
    'judging/*.md',
    # The content data the app reads, written by Publish, the Candidate photos workflow and content PRs.
    'data/*.json',
    'img/*.webp',
    'data.json',
    'curation.json',
    'fish-game.json',
    'fish-photos.json',
    'seaslug.json',
    'seaslug-game.json',
    'tools/fish_refs.json',
    'tools/fish_refill.json',
)
# Always analysed, whatever EXEMPT says: what a CodeQL extractor reads for these languages (actions, JavaScript and
# TypeScript with HTML, YAML and the JSON it reads as configuration, Python), shell, Apps Script, and dependency files.
NEVER = re.compile(
    r'(\A|/)\.github/(workflows|actions)/|(\A|/)action\.ya?ml\Z'
    r'|\.([cm]?[jt]sx?|vue|html?|xhtml?|py[iw]?|ya?ml|raml|xml|gs|sh)\Z'
    r'|(\A|/)(package(-lock)?\.json|tsconfig[^/]*\.json|\.eslintrc[^/]*|codeql-[^/]*\.json|requirements[^/]*\.txt)\Z'
)
EXEMPT_RX = [_rx(p) for p in EXEMPT]
ZERO = re.compile(r'0{40}\Z')


def is_exempt(path):
    return not NEVER.search(path) and any(r.match(path) for r in EXEMPT_RX)


def classify(paths):
    """(analyze, the paths that need it): an empty change is unknown, so analysed."""
    paths = list(paths)
    rest = [p for p in paths if not is_exempt(p)]
    return (not paths or bool(rest)), rest


def have(sha, cwd=None):
    return subprocess.run(['git', 'cat-file', '-e', sha + '^{commit}'], cwd=cwd, capture_output=True).returncode == 0


def change(event, ref, sha, before='', pr_head='', cwd=None):
    """(base, paths) of the run's change, or None for the full analysis; Unknown when it cannot be read."""
    if event == 'pull_request':
        parents = git(cwd, 'log', '-1', '--format=%P', sha).split()
        if len(parents) != 2:
            raise Unknown('%s is not a merge commit' % sha[:7])
        if not pr_head or parents[1] != pr_head:
            raise Unknown("the merge's second parent %s is not the PR head %s" % (parents[1][:7], (pr_head or '?')[:7]))
        return parents[0], changed(parents[0], sha, cwd)
    if event == 'push' and ref == 'refs/heads/main':
        if not re.fullmatch(r'[0-9a-f]{40}', before or '') or ZERO.match(before):
            raise Unknown('no commit before the push (%r)' % (before or ''))
        if not have(before, cwd):
            git(cwd, 'fetch', '-q', '--no-tags', '--filter=blob:none', '--depth=1', 'origin', before)
        return before, changed(before, sha, cwd)
    return None


def decide(event, ref, sha, before='', pr_head='', cwd=None):
    """(analyze, why)."""
    try:
        got = change(event, ref, sha, before, pr_head, cwd)
    except Exception as e:  # Unknown, or anything unforeseen: never a reason to skip
        return True, 'unknown change (%s): the full analysis' % e
    if got is None:
        return True, '%s on %s: the full analysis' % (event or 'no event', ref or 'no ref')
    base, paths = got
    analyze, rest = classify(paths)
    if not paths:
        return True, 'no change from %s: unknown, the full analysis' % base[:7]
    if not analyze:
        return False, 'docs or data only, %d path(s) from %s (tools/codeql_scope.py EXEMPT): not analysed, nothing uploaded' % (len(paths), base[:7])
    return True, '%d of %d path(s) from %s need it (%s%s): the full analysis' % (
        len(rest), len(paths), base[:7], ', '.join(rest[:3]), ', …' if len(rest) > 3 else '')


def main():
    env = os.environ
    analyze, why = decide(env.get('GITHUB_EVENT_NAME', ''), env.get('GITHUB_REF', ''), env.get('GITHUB_SHA', 'HEAD'),
                          env.get('BEFORE', ''), env.get('PR_HEAD', ''))
    line = 'analyze=%s' % ('true' if analyze else 'false')
    print('%s: %s' % (line, why), flush=True)
    if not analyze:
        print('::notice title=CodeQL not run::%s' % why, flush=True)
    if env.get('GITHUB_OUTPUT'):
        with open(env['GITHUB_OUTPUT'], 'a', encoding='utf-8') as f:
            f.write(line + '\n')
    if env.get('GITHUB_STEP_SUMMARY'):
        with open(env['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as f:
            f.write('CodeQL: %s\n' % why)
    return 0


if __name__ == '__main__':
    sys.exit(main())
