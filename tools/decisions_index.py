#!/usr/bin/env python3
"""The index of docs/decisions/README.md, written from the records themselves.

  python3 tools/decisions_index.py          prints the index's rows
  python3 tools/decisions_index.py --check  fails when README.md's index is not what the records give (docs test)
  python3 tools/decisions_index.py --fix    rewrites README.md's index from the records

A row is | date | [title](file) | #PR |: the title is the record's first line, the date and the PR its "Date: … PR: #N"
line (docs/decisions/README.md "What a record holds"). Rows are sorted by date, newest first, then by file name, so a
PR's new row lands at its topic's place in its day's block, not at the top where every other PR of the day adds
one: two PRs collide only when their topics sort next to each other. A conflict in the index is never hand-merged:
merge main, then run --fix. Offline, standard library only.
"""
import argparse
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEADER = '| Date | Record | PR |\n|---|---|---|\n'
NAME = re.compile(r'^\d{4}-\d\d-\d\d-[a-z0-9]+(-[a-z0-9]+)*\.md$')


def records(folder):
    """(date, file, title, pr) of every record; raises SystemExit naming a record without its title or its line."""
    out, bad = [], []
    for f in sorted(os.listdir(folder)):
        if f == 'README.md' or not f.endswith('.md'):
            continue
        with open(os.path.join(folder, f), encoding='utf-8') as fh:
            text = fh.read()
        title = re.match(r'# (.+)', text)
        head = re.search(r'^Date: (\d{4}-\d\d-\d\d)\b.*?\bPR: #(\d+)', text, re.M | re.S)
        if not NAME.match(f) or not title or not head:
            bad.append(f)
            continue
        out.append((head.group(1), f, title.group(1).strip(), head.group(2)))
    if bad:
        raise SystemExit('docs/decisions: no "# title" first line or "Date: YYYY-MM-DD. PR: #N." line, or a bad name: %s' % ', '.join(bad))
    return out


def table(recs):
    rows = sorted(recs, key=lambda r: r[1])  # by file name, then (stable) by date, newest first
    rows.sort(key=lambda r: r[0], reverse=True)
    return ''.join('| %s | [%s](%s) | #%s |\n' % (d, t.replace('|', '\\|'), f, pr) for d, f, t, pr in rows)


def split(readme):
    """README.md as (before the rows, the rows, after them). The rows include a merge's conflict markers, so --fix
    rewrites a conflicted index whole."""
    i = readme.find(HEADER)
    if i < 0:
        raise SystemExit('docs/decisions/README.md: the index header "| Date | Record | PR |" and its rule line are missing')
    start = i + len(HEADER)
    m = re.compile(r'(?:(?:\||<{7}|={7}|>{7})[^\n]*\n)*').match(readme, start)
    return readme[:start], readme[start : m.end()], readme[m.end() :]


def main(argv=None):
    ap = argparse.ArgumentParser(description="docs/decisions/README.md's index, from the records.")
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--check', action='store_true', help='exit 1 when the index differs from the records')
    g.add_argument('--fix', action='store_true', help='rewrite the index from the records')
    ap.add_argument('--root', default=ROOT, help=argparse.SUPPRESS)
    a = ap.parse_args(argv)
    folder = os.path.join(a.root, 'docs', 'decisions')
    want = table(records(folder))
    if not (a.check or a.fix):
        sys.stdout.write(want)
        return 0
    path = os.path.join(folder, 'README.md')
    with open(path, encoding='utf-8') as f:
        readme = f.read()
    before, rows, after = split(readme)
    if rows == want:
        return 0
    if a.fix:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(before + want + after)
        print('docs/decisions/README.md: index rewritten (%d rows)' % want.count('\n'))
        return 0
    have, need = rows.splitlines(), want.splitlines()
    k = next((i for i in range(max(len(have), len(need))) if i >= len(have) or i >= len(need) or have[i] != need[i]), 0)
    print('docs/decisions/README.md: the index is not what the records give; run python3 tools/decisions_index.py --fix')
    print('  first difference at row %d:' % (k + 1))
    print('  index:   %s' % (have[k] if k < len(have) else '(no row)'))
    print('  records: %s' % (need[k] if k < len(need) else '(no row)'))
    return 1


if __name__ == '__main__':
    sys.exit(main())
