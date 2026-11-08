#!/usr/bin/env python3
"""The sheet script's VERSION, assigned at merge (Pierre, 2026-11-08, Q305 a; rule D3). Run from the repo root.

    python3 tools/sheet_version.py --check [--base REF] [--main]    # what tools/check_versions.py runs
    python3 tools/sheet_version.py --assign [--date YYYY-MM-DD] [--dry-run]    # the integrator, at merge

A PR that changes tools/sync/Code.gs (a core.js change does too: tools/sync_core.py --fix copies it there) never edits
`const VERSION` nor the header's history line (line 1). It writes its history entry in a file of its own,
tools/sync/changes/<branch>.md (one entry, tools/sync/changes/README.md); where its comments or docs name the new
version they write the placeholder v + NEXT, and a new gate on the script's version (`const X_SHEET = N;` in the app's
files, rule D4) takes main's VERSION + 1. So two open PRs never collide on the number.

--assign (the integrator, on the PR branch once it is up to date with main, right before the merge): VERSION + 1; the
entry goes at the head of the header line (under the day's Manila date) and of ARCHITECTURE.md's version history;
every gate above the old VERSION becomes the new one; every bare placeholder (outside a `code span`) becomes vN; the
changes file is removed. It prints what it changed; the integrator commits it ("Sheet script vN assigned at merge"),
pushes, waits for green and Codex as for any head, and merges.

--check, against the merge-base of HEAD and REF (default origin/main; skipped when git cannot find it):
- always: the header says VERSION N, its first entry is vN, and `const VERSION = N`; each changes file is one entry;
- a PR waiting for its version: exactly one changes file, a Code.gs change, VERSION and the header line as on the base;
- a PR assigned: no changes file, VERSION one above the base's, the header line the base's with one entry folded in,
  ARCHITECTURE.md naming vN, no gate above VERSION, no bare placeholder;
- a PR with no Code.gs change: no changes file, VERSION and the header line untouched, no gate above VERSION;
- --main (main itself, or a merge train about to become main): no changes file left, no gate above VERSION and no bare
  placeholder, whatever the base.
"""
import argparse, os, re, subprocess, sys
from datetime import datetime
from zoneinfo import ZoneInfo

GS = 'tools/sync/Code.gs'
ARCH = 'docs/ARCHITECTURE.md'
CHANGES = 'tools/sync/changes'
TOKEN = 'v' + 'NEXT'  # spelled apart so this file never holds the placeholder itself
HEAD = re.compile(r'^(?P<pre>// .*?  VERSION )(?P<n>\d+) \((?P<date>\d{4}-\d\d-\d\d): (?P<rest>v(?P<first>\d+): .*)$')
CONST = re.compile(r'^const VERSION = (\d+);', re.M)
GATE = re.compile(r'\bconst ([A-Z][A-Z0-9]*_SHEET) = (\d+);')  # as tests/gates.test.js finds them
HISTORY = '- Version history: v2 Answers/Activity tabs; '
BARE = re.compile(r'`[^`\n]*`|\b' + TOKEN + r'\b')  # a code span is skipped whole, so only a bare token matches


def read(p, root='.'):
    return open(os.path.join(root, p), encoding='utf-8').read()


def git(*a, root='.'):
    r = subprocess.run(['git', '-C', root, *a], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def header(src):
    """(N, date, the whole line 1, its match) of a Code.gs source; None when line 1 is not a header."""
    line = src.split('\n', 1)[0]
    m = HEAD.match(line)
    return (int(m.group('n')), m.group('date'), line, m) if m else None


def version(src):
    m = CONST.search(src)
    return int(m.group(1)) if m else None


def flat(entry, md=True):
    """One line, no trailing separator; for the header (md=False), code marks dropped."""
    s = re.sub(r'\s+', ' ', entry).strip().rstrip('.;').strip()
    return s if md else s.replace('`', '')


def fold(line, n, date, entry):
    """Line 1 with vN's entry at its head: under the first date when it is the same day, else under a new date."""
    m = HEAD.match(line)
    tail = m.group('rest') if m.group('date') == date else m.group('date') + ': ' + m.group('rest')
    return '%s%d (%s: v%d: %s; %s' % (m.group('pre'), n, date, n, flat(entry, md=False), tail)


def unfold(line, base_line):
    """The entry line 1 holds above base_line's, when line is base_line with exactly one entry folded in; else None."""
    h, b = header(line), header(base_line)
    if not h or not b or h[0] != b[0] + 1:
        return None
    start = '%s%d (%s: v%d: ' % (h[3].group('pre'), h[0], h[1], h[0])
    if not line.startswith(start):
        return None
    body = line[len(start):]
    for sep in ('; v%d: ' % b[0], '; %s: v%d: ' % (b[1], b[0])):
        for m in re.finditer(re.escape(sep), body):
            if m.start() > 0 and fold(base_line, h[0], h[1], body[: m.start()]) == line:
                return body[: m.start()]
    return None


def changes(root='.'):
    d = os.path.join(root, CHANGES)
    if not os.path.isdir(d):
        return []
    return sorted(f for f in os.listdir(d) if f != 'README.md' and not f.startswith('.'))


def gates(root='.'):
    """{name: (N, file)} of every gate on the script's version in the app's files (the root's .js and proto/)."""
    out = {}
    files = [f for f in os.listdir(root) if f.endswith('.js')]
    if os.path.isdir(os.path.join(root, 'proto')):
        files += ['proto/' + f for f in os.listdir(os.path.join(root, 'proto')) if f.endswith('.js')]
    for f in sorted(files):
        for m in GATE.finditer(read(f, root)):
            out[m.group(1)] = (int(m.group(2)), f)
    return out


def bare(root='.'):
    """{file: count} of the bare placeholders in the files git knows (tracked or new, not ignored)."""
    out = git('grep', '-l', '-I', '-w', '--untracked', '-e', TOKEN, root=root) or ''
    found = {}
    for f in out.split():
        k = sum(1 for m in BARE.finditer(read(f, root)) if m.group(0) == TOKEN)
        if k:
            found[f] = k
    return found


def base_of(ref, root='.'):
    """The merge-base of HEAD and ref, or None when git cannot tell (no such ref, a shallow clone without it)."""
    if not git('rev-parse', '--verify', '-q', ref + '^{commit}', root=root):
        return None
    mb = git('merge-base', 'HEAD', ref, root=root)
    return mb.strip() if mb else None


def problems(root='.', base=None, main=False):
    """What breaks the rules above, as a list of lines (empty: OK), and one line saying which state the tree is in."""
    errs = []
    src = read(GS, root)
    h, v = header(src), version(src)
    if not h:
        return ['%s: line 1 is not "// …  VERSION N (YYYY-MM-DD: vN: …"' % GS], 'broken'
    if v is None:
        return ['%s: no "const VERSION = N;" line' % GS], 'broken'
    if h[0] != v or int(h[3].group('first')) != v:
        errs.append('%s: the header says VERSION %d, its first entry v%s, the constant %d: all three must agree' % (GS, h[0], h[3].group('first'), v))
    files = changes(root)
    for f in files:
        txt = read(os.path.join(CHANGES, f), root)
        if not f.endswith('.md'):
            errs.append('%s/%s: a changes file is <branch>.md' % (CHANGES, f))
        if not flat(txt):
            errs.append('%s/%s: empty: write the history entry (what the script now does, why, Pierre and the date)' % (CHANGES, f))
        elif re.match(r'v\d+\b|' + TOKEN + r'\b', flat(txt)):
            errs.append('%s/%s: the entry starts with a version: leave it out, --assign writes vN' % (CHANGES, f))
    high = sorted('%s = %d (%s)' % (k, n, f) for k, (n, f) in gates(root).items() if n > v)
    left = bare(root)
    if main:
        if files:
            errs.append('changes files left: %s: assign them before the merge (python3 tools/sheet_version.py --assign)' % ', '.join(files))
        if high:
            errs.append('gates above VERSION %d: %s (--assign sets them)' % (v, ', '.join(high)))
        if left:
            errs.append('the placeholder %s left in %s (--assign replaces it)' % (TOKEN, ', '.join(sorted(left))))
    if base is None:
        if len(files) > 1:
            errs.append('%d changes files (%s): one per PR' % (len(files), ', '.join(files)))
        return errs, 'no base to compare with: consistency only'
    bsrc = git('show', '%s:%s' % (base, GS), root=root)
    if bsrc is None:
        return errs + ['%s is not in the base %s' % (GS, base[:10])], 'broken'
    bh, bv = header(bsrc), version(bsrc)
    changed = bsrc != src
    if len(files) > 1:
        errs.append('%d changes files (%s): one per PR (one PR = one sheet version)' % (len(files), ', '.join(files)))
    if files:
        state = 'waiting for its version at merge (%s)' % files[0]
        if not changed:
            errs.append('%s/%s but no change to %s: remove the changes file' % (CHANGES, files[0], GS))
        if v != bv or h[2] != bh[2]:
            errs.append('%s: VERSION %d and the header line are assigned at merge: keep the base\'s (VERSION %d)' % (GS, v, bv))
        return errs, state
    if v == bv:
        if h[2] != bh[2]:
            errs.append('%s: the header\'s history line changed: leave it to --assign and write tools/sync/changes/<branch>.md' % GS)
        if changed:
            errs.append('%s changed: write its history entry in tools/sync/changes/<branch>.md and leave VERSION alone (assigned at merge, rule D3)' % GS)
        if high and not main:
            errs.append('gates above VERSION %d: %s: a gate waits for a Code.gs change (rule D4)' % (v, ', '.join(high)))
        if left and not main:
            errs.append('the placeholder %s in %s, but no sheet change to assign' % (TOKEN, ', '.join(sorted(left))))
        return errs, 'no sheet change'
    if v == bv + 1:
        if unfold(h[2], bh[2]) is None:
            errs.append('%s: VERSION %d, but the header line is not the base\'s with one entry for v%d: use --assign' % (GS, v, v))
        if '; v%d (' % v not in read(ARCH, root):
            errs.append('%s: its version history does not name v%d: use --assign' % (ARCH, v))
        if high and not main:
            errs.append('gates above VERSION %d: %s' % (v, ', '.join(high)))
        if left and not main:
            errs.append('the placeholder %s left in %s' % (TOKEN, ', '.join(sorted(left))))
        return errs, 'assigned: v%d' % v
    errs.append('%s: VERSION went from %d to %d: only --assign changes it, by one, at merge' % (GS, bv, v))
    return errs, 'broken'


def assign(root='.', date=None, dry=False):
    """Fold the one changes file into Code.gs and ARCHITECTURE.md; returns the lines saying what changed."""
    files = changes(root)
    if len(files) != 1:
        sys.exit('✗ --assign needs exactly one file in %s, found %d%s' % (CHANGES, len(files), (': ' + ', '.join(files)) if files else ''))
    path = os.path.join(CHANGES, files[0])
    entry = read(path, root)
    if not flat(entry):
        sys.exit('✗ %s is empty' % path)
    src = read(GS, root)
    h, old = header(src), version(src)
    if not h or old is None or h[0] != old:
        sys.exit('✗ %s: the header and the constant disagree: fix them first (--check)' % GS)
    n = old + 1
    date = date or datetime.now(ZoneInfo('Asia/Manila')).strftime('%Y-%m-%d')
    line = fold(h[2], n, date, entry)
    new = line + src[len(h[2]):]
    new = CONST.sub('const VERSION = %d;' % n, new, count=1)
    arch = read(ARCH, root)
    if HISTORY not in arch:
        sys.exit('✗ %s: the line starting "%s" is missing' % (ARCH, HISTORY.strip()))
    arch = arch.replace(HISTORY, '%sv%d (%s) %s; ' % (HISTORY, n, date, flat(entry)), 1)
    edits = {GS: new, ARCH: arch}
    said = ['%s: VERSION %d -> %d, header entry v%d (%s)' % (GS, old, n, n, date), '%s: version history v%d' % (ARCH, n)]
    for k, (gn, f) in sorted(gates(root).items()):
        if gn > old:
            body = edits.get(f, read(f, root))
            edits[f] = re.sub(r'\bconst %s = \d+;' % k, 'const %s = %d;' % (k, n), body)
            said.append('%s: %s %d -> %d' % (f, k, gn, n))
    for f, k in sorted(bare(root).items()):
        body = edits.get(f, read(f, root))
        edits[f] = BARE.sub(lambda m: 'v%d' % n if m.group(0) == TOKEN else m.group(0), body)
        said.append('%s: %d x %s -> v%d' % (f, k, TOKEN, n))
    said.append('%s: removed' % path)
    if not dry:
        for f, body in edits.items():
            open(os.path.join(root, f), 'w', encoding='utf-8').write(body)
        os.remove(os.path.join(root, path))
    return n, said


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--check', action='store_true', help='check the rules (tools/check_versions.py runs it)')
    g.add_argument('--assign', action='store_true', help='the integrator, at merge: assign the next VERSION')
    ap.add_argument('--base', default='origin/main', help='--check: compare with the merge-base of HEAD and this ref')
    ap.add_argument('--main', action='store_true', help='--check: this tree is main or a merge train: no changes file left')
    ap.add_argument('--date', help='--assign: the day of the header entry (default: today in Manila)')
    ap.add_argument('--dry-run', action='store_true', help='--assign: say what would change, write nothing')
    a = ap.parse_args()
    if a.assign:
        n, said = assign(date=a.date, dry=a.dry_run)
        for s in said:
            print(('would change ' if a.dry_run else '') + s)
        if not a.dry_run:
            print('\nNext: git add -A %s %s %s (and the files above), commit "Sheet script v%d assigned at merge", push,'
                  ' then merge once green and Codex-clean (docs/INTEGRATOR.md).' % (GS, ARCH, CHANGES, n))
        return 0
    errs, state = problems(base=base_of(a.base), main=a.main)
    for e in errs:
        print('✗', e)
    print('Sheet script:', state if not errs else 'see above (docs/rules/sheet.md D3)')
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main())
