#!/usr/bin/env python3
"""Was it already asked? Searches Pierre's answers, the rules and the decision records before a question to him.

  python3 tools/asked.py rename domain          entries holding every term (case and accents ignored)
  python3 tools/asked.py --any pikachu thecacera   entries holding any of the terms
  python3 tools/asked.py "source weight" P1     a quoted term is one phrase

Searched, in this order: docs/ANSWERS.md (the ledger), AGENTS.md, docs/rules/*.md, docs/decisions/*.md (newest first;
the index README.md is left out: its rows repeat the records' titles). A hit is one entry: a ledger bullet with its
wrapped lines, a paragraph, a bullet, a table row or a heading, printed with its file:line and the heading above it.
The last line, "searched: … — N hits", goes under the question to Pierre (docs/INTEGRATOR.md "Habits"): it says what
was searched and that nothing answered it. Offline, standard library only; exit 0 whatever the count.
"""
import argparse
import glob
import os
import re
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


def main(argv=None):
    ap = argparse.ArgumentParser(description='Search the answers ledger, the rules and the decision records.')
    ap.add_argument('terms', nargs='+', help='words or "a phrase"; every one must be in the entry (or any, --any)')
    ap.add_argument('--any', action='store_true', help='an entry holding any of the terms is a hit')
    ap.add_argument('--max', type=int, default=30, help='hits printed in full (default 30; 0: all); all are counted')
    ap.add_argument('--root', default=ROOT, help=argparse.SUPPRESS)
    a = ap.parse_args(argv)
    hits = search(a.root, a.terms, a.any)
    shown = hits if a.max <= 0 else hits[: a.max]
    for rel, n, head, lines in shown:
        print('%s:%d%s' % (rel, n, ' (%s)' % head if head else ''))
        for line in lines:
            print('    ' + line.strip())
    if len(shown) < len(hits):
        print('… %d more hits not shown (narrow the terms, or --max 0)' % (len(hits) - len(shown)))
    terms = ' '.join('"%s"' % t for t in a.terms)
    mode = 'any of' if a.any else 'all of'
    print('searched: %s for %s %s — %d hit%s' % (', '.join(SOURCES), mode, terms, len(hits), '' if len(hits) == 1 else 's'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
