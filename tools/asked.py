#!/usr/bin/env python3
"""Was it already asked? Searches Pierre's answers, the rules and the decision records before a question to him.

  python3 tools/asked.py rename domain          entries holding every term (case and accents ignored)
  python3 tools/asked.py --any pikachu thecacera   entries holding any of the terms
  python3 tools/asked.py "source weight" P1     a quoted term is one phrase

Searched, in this order: docs/ANSWERS.md (the ledger), AGENTS.md, docs/rules/*.md, docs/decisions/*.md (newest first;
the index README.md is left out: its rows repeat the records' titles). A hit is one entry: a ledger bullet with its
wrapped lines, a paragraph, a bullet, a table row or a heading, printed with its file:line and the heading above it.
The last line, "searched: … — N hits", goes under the question to Pierre (docs/INTEGRATOR.md "Habits"): it says what
was searched and that nothing answered it. Also searched: docs/ANSWERS.md on the branch of every open PR (gh lists
them, git fetches the refs; an answer is often on a PR not merged yet), a hit naming its PR. Without network that is
skipped with a one-line note (--no-prs skips it). Standard library only; exit 0 whatever the count.
"""
import argparse
import glob
import json
import os
import re
import subprocess
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = ['docs/ANSWERS.md', 'AGENTS.md', 'docs/rules/*.md', 'docs/decisions/*.md']
SKIP = {'docs/decisions/README.md'}


def fold(s):
    """Lower case, accents and typographic quotes folded, so "élève" finds "eleve" and "Pierre’s" finds "pierre's"."""
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.translate(str.maketrans({'’': "'", '‘': "'", '“': '"', '”': '"', '«': '"', '»': '"', ' ': ' '}))
    return re.sub(r'\s+', ' ', s).lower()


def files(root):
    """The files searched, as paths relative to root, in the order of SOURCES (records newest first)."""
    out = []
    for pat in SOURCES:
        found = sorted(glob.glob(os.path.join(root, pat)), reverse=pat.startswith('docs/decisions'))
        for f in found:
            rel = os.path.relpath(f, root).replace(os.sep, '/')
            if rel not in SKIP and rel not in out:
                out.append(rel)
    return out


def entries(text):
    """Splits Markdown into entries: (first line number, heading above, lines). A bullet or a numbered item at the
    margin, a table row and a heading each start an entry; an indented line continues it; a blank line ends it."""
    out, cur, head, fence = [], None, '', False
    for n, line in enumerate(text.split('\n'), 1):
        if line.startswith(('```', '~~~')) or fence:  # a fenced block belongs to the entry it is in
            fence = fence != line.startswith(('```', '~~~'))
            if cur is not None:
                cur[2].append(line)
            continue
        if not line.strip():
            cur = None
            continue
        starts = re.match(r'(#{1,6} |[-*] |\d+\. |\|)', line)
        if line.startswith('#'):
            head = line.lstrip('#').strip()
        if cur is None or starts:
            cur = (n, '' if line.startswith('#') else head, [line])
            out.append(cur)
        else:
            cur[2].append(line)
    return out


def search(root, terms, any_term=False):
    """The hits: (file, line, heading, lines) of every entry holding all the terms (or any, with any_term)."""
    want = [fold(t) for t in terms if t.strip()]
    hits = []
    for rel in files(root):
        with open(os.path.join(root, rel), encoding='utf-8') as f:
            text = f.read()
        for n, head, lines in entries(text):
            flat = fold(' '.join(lines))
            found = [t in flat for t in want]
            if want and (any(found) if any_term else all(found)):
                hits.append((rel, n, head, lines))
    return hits


def open_prs(root):
    """The open PRs as (number, head branch), from gh; None when gh fails or is offline."""
    try:
        # REST, not `gh pr list`: GraphQL is not available from Claude Code sessions
        r = subprocess.run(['gh', 'api', 'repos/{owner}/{repo}/pulls?state=open&per_page=100'],
                           cwd=root, capture_output=True, text=True, timeout=20)
        if r.returncode:
            return None
        return [(p['number'], p['head']['ref']) for p in json.loads(r.stdout)]
    except (OSError, ValueError, KeyError, subprocess.SubprocessError):
        return None


def branch_hits(root, terms, any_term, prs, seen):
    """Hits in docs/ANSWERS.md on the branch of each open PR (origin/<head>), fetched in one call: (pr, branch, line,
    heading, lines), leaving out entries already in `seen` (the ledger on main). A PR's answer is not on main yet."""
    want = [fold(t) for t in terms if t.strip()]
    refs = ['+refs/heads/%s:refs/remotes/origin/%s' % (b, b) for _, b in prs]
    if refs:
        r = subprocess.run(['git', 'fetch', '-q', '--no-tags', 'origin'] + refs, cwd=root, capture_output=True, timeout=60)
        if r.returncode:
            raise OSError('git fetch failed')
    hits = []
    for n, b in prs:
        r = subprocess.run(['git', 'show', 'origin/%s:docs/ANSWERS.md' % b], cwd=root, capture_output=True, text=True)
        if r.returncode:
            continue
        for ln, head, lines in entries(r.stdout):
            flat = fold(' '.join(lines))
            found = [t in flat for t in want]
            if want and (any(found) if any_term else all(found)) and flat not in seen:
                seen.add(flat)
                hits.append((n, b, ln, head, lines))
    return hits


def main(argv=None):
    ap = argparse.ArgumentParser(description='Search the answers ledger, the rules and the decision records.')
    ap.add_argument('terms', nargs='+', help='words or "a phrase"; every one must be in the entry (or any, --any)')
    ap.add_argument('--any', action='store_true', help='an entry holding any of the terms is a hit')
    ap.add_argument('--max', type=int, default=30, help='hits printed in full (default 30; 0: all); all are counted')
    ap.add_argument('--root', default=ROOT, help=argparse.SUPPRESS)
    ap.add_argument('--prs', help=argparse.SUPPRESS)  # tests: "number:branch,…" instead of asking gh
    ap.add_argument('--no-prs', action='store_true', help="leave out the open PRs' branches (offline, faster)")
    a = ap.parse_args(argv)
    hits = search(a.root, a.terms, a.any)
    note = ''
    if not a.no_prs and os.path.exists(os.path.join(a.root, '.git')):
        if a.prs is not None:
            prs = [tuple(p.split(':', 1)) for p in a.prs.split(',') if ':' in p]
        else:
            prs = open_prs(a.root)
        try:
            if prs is None:
                raise OSError('gh')
            with open(os.path.join(a.root, SOURCES[0]), encoding='utf-8') as f:
                seen = {fold(' '.join(lines)) for _, _, lines in entries(f.read())}
            hits += [('PR #%s (%s) docs/ANSWERS.md' % (n, b), ln, head, lines)
                     for n, b, ln, head, lines in branch_hits(a.root, a.terms, a.any, prs, seen)]
            note = ', docs/ANSWERS.md on %d open PR branch%s' % (len(prs), '' if len(prs) == 1 else 'es')
        except (OSError, subprocess.SubprocessError):
            print("note: the open PRs' branches were not searched (offline, or gh or git failed): "
                  "an answer only on a PR is missed")
    shown = hits if a.max <= 0 else hits[: a.max]
    for rel, n, head, lines in shown:
        print('%s:%d%s' % (rel, n, ' (%s)' % head if head else ''))
        for line in lines:
            print('    ' + line.strip())
    if len(shown) < len(hits):
        print('… %d more hits not shown (narrow the terms, or --max 0)' % (len(hits) - len(shown)))
    terms = ' '.join('"%s"' % t for t in a.terms)
    mode = 'any of' if a.any else 'all of'
    print('searched: %s%s for %s %s — %d hit%s' % (', '.join(SOURCES), note, mode, terms, len(hits), '' if len(hits) == 1 else 's'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
