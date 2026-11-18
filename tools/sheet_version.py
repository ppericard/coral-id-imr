#!/usr/bin/env python3
"""The sheet script's VERSION, assigned at merge (Pierre, 2026-11-08, Q305 a; rule D3). Run from the repo root.

    python3 tools/sheet_version.py --check [--base REF] [--main]    # what tools/check_versions.py runs
    python3 tools/sheet_version.py --assign [--date YYYY-MM-DD] [--dry-run]    # the integrator, at merge

A PR that changes tools/sync/Code.gs (a core.js change does too: tools/sync_core.py --fix copies it there) never edits
`const VERSION` nor line 1 (the header) nor tools/sync/HISTORY.md. It writes its history entry in a file of its own,
tools/sync/changes/<branch>.md (one entry, tools/sync/changes/README.md); where its comments or docs name the new
version they write the placeholder v + NEXT, and a new gate on the script's version (`const X_SHEET = N;` in the app's
files, rule D4) takes main's VERSION + 1. So two open PRs never collide on the number.

The history of the versions lives in tools/sync/HISTORY.md (Pierre, 2026-11-18: "Pourquoi? Juste pourquoi?", about a line 1
tens of thousands of characters long in the Apps Script editor): newest first, one `## v<N> (<date>)` heading per version
and its entry under it. Line 1 is short, and only the version and its date change:
`// IMR Reef ID: progress sync for the RAs, stored in this Google Sheet. VERSION <N> (<date>). History: tools/sync/HISTORY.md in the repository.`
The script's self-update reads only `const VERSION = (\\d+);` (autoUpdate), so line 1 and HISTORY.md are for people.
Transition: line 1 used to hold the whole history (`VERSION N (date: vN: entry; vM: entry; …)`); that long header is still
accepted while it stays as it is (main's own copy of this tool, which the merge train runs, refuses the short one), and
HISTORY.md must then hold exactly its entries. The next --assign writes the short line.

--assign (the integrator, on the PR branch once it is up to date with main, right before the merge): VERSION + 1; the
entry goes at the head of HISTORY.md (under the day's Manila date), and nowhere else; line 1 takes the short form for the
new version; every gate the PR adds against REF (and any above the old VERSION) becomes the new
one, main's gates stay as they are; every bare placeholder (outside a `code span`) becomes vN; the changes file is removed.
The base is REF itself (default origin/main), which the branch must hold: merged in, committed or not (a merge stopped on
a conflict, resolved, holds it through MERGE_HEAD), or rebased on. It writes nothing when the branch does not hold REF, a
conflict is unresolved, a rebase or cherry-pick is paused, or the PR changes a gate main already has. It prints what it
changed; the integrator commits it ("Sheet script vN assigned at merge"), pushes, waits for green and Codex as for any
head, and merges.

--check, against the merge-base of HEAD and REF (default origin/main; skipped when git cannot find it):
- always: line 1 is the short form for VERSION N (or, in the transition, the long header, whose entries HISTORY.md then
  holds), HISTORY.md's top entry is vN with line 1's date, its versions go down one entry each, no duplicate and no gap
  (the legacy gaps, LEGACY_GAPS, are the only holes), `const VERSION = N`; each changes file is one entry;
- against a base, in every state: no gate the base already has (at or below its VERSION) changed: a PR adds a gate of
  its own, it never moves main's;
- a PR waiting for its version: exactly one changes file, a Code.gs change, VERSION, line 1 and HISTORY.md's versions as on
  the base, every gate it adds above the base's VERSION (so the feature stays off until the assign);
- a PR assigned: no changes file, VERSION one above the base's, line 1 short, HISTORY.md the base's with one entry for vN
  on top, every gate it adds at vN, none above, no bare placeholder;
- a PR with no Code.gs change: no changes file, VERSION and line 1 untouched, HISTORY.md's versions as on the base, no
  gate above VERSION;
- --main (main itself, or a merge train about to become main): no changes file left, no gate above VERSION and no bare
  placeholder, whatever the base.

Standard library only, one file: the merge train runs main's copy alone (python3 -I, from a temporary folder).
"""
import argparse, os, re, subprocess, sys
from datetime import datetime
from zoneinfo import ZoneInfo

GS = 'tools/sync/Code.gs'
CHANGES = 'tools/sync/changes'
HIST = 'tools/sync/HISTORY.md'
TOKEN = 'v' + 'NEXT'  # spelled apart so this file never holds the placeholder itself
LINE1 = '// IMR Reef ID: progress sync for the RAs, stored in this Google Sheet. VERSION %d (%s). History: tools/sync/HISTORY.md in the repository.'
SHORT = re.compile(r'^// IMR Reef ID: progress sync for the RAs, stored in this Google Sheet\. VERSION (?P<n>\d+) \((?P<date>\d{4}-\d\d-\d\d)\)\. History: tools/sync/HISTORY\.md in the repository\.$')
# Between two entries of the long header: "; vN: ", "; DATE: vN: " (a new day), "; vN (DATE): " (v48, v49), ". vN: " (v37).
LSEP = re.compile(r'(?:; |\. )(?:(\d{4}-\d\d-\d\d): )?v(\d+)(?: \((\d{4}-\d\d-\d\d)\))?: ')
ENTRY = re.compile(r'^## (?:v(\d+) \((\d{4}-\d\d-\d\d)\)|earlier)$', re.M)
# The versions the history has no entry for (the long header held none: v43 "was left unused", others were taken by
# branches that merged under other numbers): the only holes --check accepts, nothing above v176 is one.
LEGACY_GAPS = {41, 43, 72, 73, 75, 78, 82}
# The long header of the transition: the whole history on line 1 (two spaces before VERSION).
HEAD = re.compile(r'^(?P<pre>// .*?  VERSION )(?P<n>\d+) \((?P<date>\d{4}-\d\d-\d\d): (?P<rest>v(?P<first>\d+): .*)$')
CONST = re.compile(r'^const VERSION = (\d+);', re.M)
# START_ADMIN_SHEET too (Codex review #757). Never SHEET_FLOOR (core.js): the gate floor, a version already live set by
# hand, never one the assign moves (tests/gates.test.js ratchets it).
GATE = re.compile(r'\bconst (?!SHEET_FLOOR\b)([A-Z][A-Z0-9_]*_SHEET) = (\d+);')
BARE = re.compile(r'`[^`\n]*`|\b' + TOKEN + r'\b')  # a code span is skipped whole, so only a bare token matches


def read(p, root='.'):
    return open(os.path.join(root, p), encoding='utf-8').read()


def git(*a, root='.'):
    r = subprocess.run(['git', '-C', root, *a], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def header(src):
    """(N, date, the whole line 1, long match) of a Code.gs source; the match is None for the short line (the long header of
    the transition has one); None when line 1 is neither."""
    line = src.split('\n', 1)[0]
    s = SHORT.match(line)
    if s:
        return int(s.group('n')), s.group('date'), line, None
    m = HEAD.match(line)
    return (int(m.group('n')), m.group('date'), line, m) if m else None


def legacy(line):
    """The entries of a long header, newest first: [(N or None, date, text)]; the last, (None, None, text), is the
    "earlier:" tail. The date is the day line 1 gives (the one of its group, or its own)."""
    m = HEAD.match(line)
    body = line[len(m.group('pre')) + len(m.group('n')) + 2:]  # after "VERSION N ("
    tail = ''
    i = body.rfind('; earlier: ')
    if i >= 0:
        body, tail = body[:i], body[i + len('; earlier: '):-1]
    else:
        body = body[:-1]
    date, out, pos, cur = m.group('date'), [], len(m.group('date')) + 2, int(m.group('first'))
    body = body[pos:]
    pos = len('v%d: ' % cur)
    while True:
        nxt = next((s for s in LSEP.finditer(body, pos) if int(s.group(2)) < cur), None)
        if not nxt:
            out.append((cur, date, body[pos:]))
            break
        out.append((cur, date, body[pos : nxt.start()]))
        date = nxt.group(1) or nxt.group(3) or date
        cur, pos = int(nxt.group(2)), nxt.end()
    if tail:
        out.append((None, None, tail))
    return out


def hist_parse(text):
    """HISTORY.md as [(N or None, date, text)], newest first, and the lines it cannot read. A heading is `## vN (date)`,
    or `## earlier` for the one entry before the numbering; an entry is the lines under it, joined."""
    heads = [m for m in ENTRY.finditer(text)]
    bad = [l for l in text.split('\n') if l.startswith('## ') and not ENTRY.match(l)]
    out = []
    for k, m in enumerate(heads):
        end = heads[k + 1].start() if k + 1 < len(heads) else len(text)
        out.append((int(m.group(1)) if m.group(1) else None, m.group(2), ' '.join(text[m.end() : end].split())))
    return out, bad


def version(src):
    m = CONST.search(src)
    return int(m.group(1)) if m else None


def flat(entry, md=True):
    """One line, no trailing separator; for the header (md=False), code marks dropped. The marks go before the spaces are
    collapsed, so flat(flat(e, False), False) == flat(e, False) (a span such as `sp. ` left two spaces in v170's header,
    which --check then refused). HISTORY.md keeps the marks (md=True)."""
    s = entry if md else entry.replace('`', '')
    return re.sub(r'\s+', ' ', s).strip().rstrip(' .;')


def fold(text, n, date, entry):
    """HISTORY.md with vN's entry on top (above the first entry; the entry as the changes file has it, one line, code marks kept)."""
    m = ENTRY.search(text)
    i = m.start() if m else len(text)
    return text[:i] + '## v%d (%s)\n\n%s\n\n' % (n, date, flat(entry)) + text[i:]


def unfold(entries, base_entries):
    """The entry text on top of entries (hist_parse of HISTORY.md), when they are base_entries with exactly one entry
    for the next version added at the head; else None."""
    if not entries or not base_entries or entries[0][0] is None or base_entries[0][0] is None or entries[0][0] != base_entries[0][0] + 1:
        return None
    key = lambda es: [(v, t) for v, _, t in es]
    return entries[0][2] if key(entries[1:]) == key(base_entries) else None


def entries_of(src, hist):
    """The history of a tree: HISTORY.md's entries; its long header's, when it has no HISTORY.md yet (a base before it)."""
    if hist is not None:
        return hist_parse(hist)[0]
    h = header(src)
    return legacy(h[2]) if h and h[3] else None


def hist_problems(h, v, hist):
    """What breaks the HISTORY.md rules for a tree whose line 1 is h, VERSION v, HISTORY.md hist (None: missing)."""
    if hist is None:
        return ['%s is missing: the history of the versions lives there (rule D3)' % HIST]
    es, bad = hist_parse(hist)
    errs = ['%s: unreadable heading "%s": `## v<N> (YYYY-MM-DD)`, or `## earlier` last' % (HIST, b) for b in bad]
    nums = [e[0] for e in es]
    if not es or nums[0] != v:
        errs.append('%s: its top entry is %s, VERSION is %d: --assign writes it' % (HIST, 'v%s' % nums[0] if es and nums[0] else 'missing', v))
    elif es[0][1] != h[1]:
        errs.append('%s: v%d is dated %s, line 1 says %s' % (HIST, v, es[0][1], h[1]))
    for i, (n, d, t) in enumerate(es):
        if not t:
            errs.append('%s: %s has no text' % (HIST, 'v%d' % n if n else 'earlier'))
        if n is None and i != len(es) - 1:
            errs.append('%s: "earlier" is the last entry' % HIST)
    nums = [n for n in nums if n is not None]
    for a, b in zip(nums, nums[1:]):
        if a == b:
            errs.append('%s: v%d twice' % (HIST, a))
        elif a < b:
            errs.append('%s: v%d above v%d: newest first' % (HIST, b, a))
        else:
            hole = sorted(set(range(b + 1, a)) - LEGACY_GAPS)
            if hole:
                errs.append('%s: no entry for %s between v%d and v%d' % (HIST, ', '.join('v%d' % x for x in hole), a, b))
    if not h[3]:
        return errs
    old = legacy(h[2])  # the long header of the transition: HISTORY.md holds exactly its entries
    if [(n, t) for n, _, t in es] != [(n, t) for n, _, t in old]:
        errs.append('%s does not hold exactly the entries of line 1 of %s (the long header of the transition): nothing may be lost' % (HIST, GS))
    return errs


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


def gates_at(ref, root='.'):
    """gates() as they are in commit ref (the base)."""
    out = {}
    names = (git('ls-tree', '--name-only', ref, '--', '.', 'proto/', root=root) or '').split()
    for f in sorted(x for x in names if x.endswith('.js') and x.count('/') <= 1 and (x.startswith('proto/') or '/' not in x)):
        for m in GATE.finditer(git('show', '%s:%s' % (ref, f), root=root) or ''):
            out[m.group(1)] = (int(m.group(2)), f)
    return out


def own(root='.', base=None):
    """The gates this branch adds or changes against base: {name: (N, file, base's N or None when it adds it)}."""
    if base is None:
        return {}
    was = {k: n for k, (n, _) in gates_at(base, root).items()}
    return {k: (n, f, was.get(k)) for k, (n, f) in gates(root).items() if was.get(k) != n}


def added(mine):
    """The gates of own() the branch adds (main has no such gate): {name: (N, file)}."""
    return {k: (n, f) for k, (n, f, w) in mine.items() if w is None}


def changed(mine, bv):
    """The gates of own() main already has at or below its VERSION bv, which the branch changes: sorted lines."""
    return sorted('%s = %d (%s; main: %d)' % (k, n, f, w) for k, (n, f, w) in mine.items() if w is not None and w <= bv)


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


def assign_base(ref, root='.'):
    """The base --assign compares with: ref itself, once the tree being assigned holds it. That tree is HEAD, or HEAD with
    MERGE_HEAD when a merge waits for its commit (a conflict resolved): HEAD alone is then still the branch's old tip, and
    its merge-base with ref an old main, whose missing gates looked added by the PR (#952). Exits when ref is not held,
    a conflict is unresolved, or a rebase or cherry-pick is paused."""
    tip = git('rev-parse', '--verify', '-q', ref + '^{commit}', root=root)
    if not tip:
        sys.exit('✗ --assign needs the base (%s) to find the gates this PR adds: git fetch origin main' % ref)
    tip = tip.strip()
    for p in ('rebase-merge', 'rebase-apply', 'CHERRY_PICK_HEAD', 'REVERT_HEAD'):
        where = (git('rev-parse', '--git-path', p, root=root) or '').strip()
        if where and os.path.exists(os.path.join(root, where)):
            sys.exit('✗ --assign: a rebase, cherry-pick or revert is paused (%s): finish it first' % p)
    unmerged = sorted(set(line.split('\t', 1)[1] for line in (git('ls-files', '-u', root=root) or '').splitlines() if '\t' in line))
    if unmerged:
        sys.exit('✗ --assign: unresolved conflicts (%s): resolve them first' % ', '.join(unmerged))
    heads = ['HEAD']
    if git('rev-parse', '--verify', '-q', 'MERGE_HEAD', root=root):
        heads.append('MERGE_HEAD')
    if not any(git('merge-base', '--is-ancestor', tip, h, root=root) is not None for h in heads):
        sys.exit('✗ --assign: the branch does not hold %s yet: merge %s into the branch first (git merge %s)' % (ref, ref, ref))
    return tip


def problems(root='.', base=None, main=False):
    """What breaks the rules above, as a list of lines (empty: OK), and one line saying which state the tree is in."""
    errs = []
    src = read(GS, root)
    h, v = header(src), version(src)
    if not h:
        return ['%s: line 1 is not "%s"' % (GS, (LINE1 % (0, 'YYYY-MM-DD')).replace('VERSION 0', 'VERSION N'))], 'broken'
    if v is None:
        return ['%s: no "const VERSION = N;" line' % GS], 'broken'
    if h[0] != v or (h[3] and int(h[3].group('first')) != v):
        errs.append('%s: the header says VERSION %d, its first entry v%s, the constant %d: all three must agree' % (GS, h[0], h[3].group('first') if h[3] else v, v))
    hist = read(HIST, root) if os.path.exists(os.path.join(root, HIST)) else None
    errs += hist_problems(h, v, hist)
    files = changes(root)
    for f in files:
        txt = read(os.path.join(CHANGES, f), root)
        if not f.endswith('.md'):
            errs.append('%s/%s: a changes file is <branch>.md' % (CHANGES, f))
        if not flat(txt, md=False):
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
    bhist = git('show', '%s:%s' % (base, HIST), root=root)  # None: the base has no HISTORY.md yet (its line 1 holds the history)
    bents = entries_of(bsrc, bhist) if bh else None
    if bh is None or bv is None or bents is None:
        return errs + ['%s of the base %s has no header or no VERSION: nothing to compare with' % (GS, base[:10])], 'broken'
    edited = bsrc != src
    ents = hist_parse(hist)[0] if hist is not None else []
    # Only --assign adds an entry: with the base's VERSION the versions HISTORY.md names are the base's (the words may be mended).
    hist_moved = [n for n, _, _ in ents] != [n for n, _, _ in bents]
    mine = own(root, base)
    moved = changed(mine, bv)
    if moved:
        errs.append('gates main already has, at or below its VERSION %d, changed by this PR: %s: put main\'s number back; a feature'
                    ' that needs a newer script adds a gate of its own (rule D4)' % (bv, ', '.join(moved)))
    if len(files) > 1:
        errs.append('%d changes files (%s): one per PR (one PR = one sheet version)' % (len(files), ', '.join(files)))
    if files:
        state = 'waiting for its version at merge (%s)' % files[0]
        if not edited:
            errs.append('%s/%s but no change to %s: remove the changes file' % (CHANGES, files[0], GS))
        if v != bv or h[2] != bh[2]:
            errs.append('%s: VERSION %d and the header line are assigned at merge: keep the base\'s (VERSION %d)' % (GS, v, bv))
        if hist_moved:
            errs.append('%s: its entry for the PR is written at merge by --assign: keep the base\'s versions' % HIST)
        low =sorted('%s = %d (%s)' % (k, n, f) for k, (n, f) in added(mine).items() if n <= bv)
        if low:
            errs.append('gates this PR adds at or below main\'s VERSION %d: %s: write %d (--assign sets the real one; rule D4)' % (bv, ', '.join(low), bv + 1))
        return errs, state
    if v == bv:
        if h[2] != bh[2]:
            errs.append('%s: the header\'s history line changed: leave it to --assign and write tools/sync/changes/<branch>.md' % GS)
        if hist_moved:
            errs.append('%s: an entry added or dropped without a new VERSION: --assign writes it at merge, from tools/sync/changes/<branch>.md' % HIST)
        if edited:
            errs.append('%s changed: write its history entry in tools/sync/changes/<branch>.md and leave VERSION alone (assigned at merge, rule D3)' % GS)
        if high and not main:
            errs.append('gates above VERSION %d: %s: a gate waits for a Code.gs change (rule D4)' % (v, ', '.join(high)))
        if left and not main:
            errs.append('the placeholder %s in %s, but no sheet change to assign' % (TOKEN, ', '.join(sorted(left))))
        return errs, 'no sheet change'
    if v == bv + 1:
        if h[3]:
            errs.append('%s: VERSION %d with the long header: line 1 is the short form once a version is assigned (python3 tools/sheet_version.py --assign)' % (GS, v))
        if unfold(ents, bents) is None:
            errs.append('%s: VERSION %d, but it is not the base\'s history with one entry for v%d on top: use --assign' % (HIST, v, v))
        if high and not main:
            errs.append('gates above VERSION %d: %s' % (v, ', '.join(high)))
        off = sorted('%s = %d (%s)' % (k, n, f) for k, (n, f) in added(mine).items() if n != v)
        if off:
            errs.append('gates this PR adds not at its VERSION %d: %s: use --assign' % (v, ', '.join(off)))
        if left and not main:
            errs.append('the placeholder %s left in %s' % (TOKEN, ', '.join(sorted(left))))
        return errs, 'assigned: v%d' % v
    errs.append('%s: VERSION went from %d to %d: only --assign changes it, by one, at merge' % (GS, bv, v))
    return errs, 'broken'


def assign(root='.', date=None, dry=False, base=None):
    """Fold the one changes file into Code.gs and HISTORY.md; returns the lines saying what changed."""
    files = changes(root)
    if len(files) != 1:
        sys.exit('✗ --assign needs exactly one file in %s, found %d%s' % (CHANGES, len(files), (': ' + ', '.join(files)) if files else ''))
    path = os.path.join(CHANGES, files[0])
    entry = read(path, root)
    if not flat(entry, md=False):
        sys.exit('✗ %s is empty' % path)
    src = read(GS, root)
    h, old = header(src), version(src)
    if not h or old is None or h[0] != old:
        sys.exit('✗ %s: the header and the constant disagree: fix them first (--check)' % GS)
    n = old + 1
    # The entry itself may name the new version with the placeholder (#1083): it is written into HISTORY.md with every
    # bare placeholder set to vN, as in the code files (a code span stays as written).
    entry = BARE.sub(lambda m: 'v%d' % n if m.group(0) == TOKEN else m.group(0), entry)
    date = date or datetime.now(ZoneInfo('Asia/Manila')).strftime('%Y-%m-%d')
    hist = read(HIST, root) if os.path.exists(os.path.join(root, HIST)) else None
    bad = hist_problems(h, old, hist)
    if bad:
        sys.exit('✗ %s must be consistent before an entry is added (--check):\n  %s' % (HIST, '\n  '.join(bad)))
    new_hist = fold(hist, n, date, entry)
    line = LINE1 % (n, date)  # also turns the long header of the transition into the short line
    new = line + src[len(h[2]):]
    new = CONST.sub('const VERSION = %d;' % n, new, count=1)
    edits = {GS: new, HIST: new_hist}
    said = ['%s: VERSION %d -> %d, line 1 (%s)' % (GS, old, n, date), '%s: entry v%d (%s) on top' % (HIST, n, date)]
    every = own(root, base)
    moved = changed(every, old)
    if moved:
        sys.exit('✗ gates main already has, changed by this PR: %s: put main\'s number back, a feature that needs a newer'
                 ' script adds a gate of its own (rule D4)' % ', '.join(moved))
    mine = added(every)  # what the PR adds, even at a number main has reached since (Codex review #757)
    for k, (gn, f) in sorted(gates(root).items()):
        if gn > old or (k in mine and gn != n):
            body = edits.get(f, read(f, root))
            edits[f] = re.sub(r'\bconst %s = \d+;' % k, 'const %s = %d;' % (k, n), body)
            said.append('%s: %s %d -> %d' % (f, k, gn, n))
    for f, k in sorted(bare(root).items()):
        body = edits.get(f, read(f, root))
        edits[f] = BARE.sub(lambda m: 'v%d' % n if m.group(0) == TOKEN else m.group(0), body)
        said.append('%s: %d x %s -> v%d' % (f, k, TOKEN, n))
    if 'core.js' in edits and GS in edits:
        # Code.gs embeds core.js (tools/sync_core.py): its copy takes the edited gates too (Codex review #757).
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from sync_core import HEAD as C_HEAD, BEGIN as C_BEGIN, END as C_END, TAIL as C_TAIL, block
        gs = edits[GS]
        i = gs.find(C_HEAD + C_BEGIN)
        j = gs.find(C_END + C_TAIL, i) if i >= 0 else -1
        if j >= 0:
            edits[GS] = gs[:i] + block(edits['core.js']) + gs[j + len(C_END + C_TAIL):]
            said.append('%s: its embedded core.js copied again' % GS)
    said.append('%s: removed' % path)
    # Line 1 and the history are the ones --check reads back (unfold): never write ones it would refuse.
    nh = header(edits[GS])
    if nh is None or nh[3] or nh[:2] != (n, date) or hist_problems(nh, n, edits[HIST]) or unfold(hist_parse(edits[HIST])[0], hist_parse(hist)[0]) is None:
        sys.exit('✗ %s, %s: what --assign writes is not what --check accepts: nothing written' % (GS, HIST))
    if not dry:
        for f, body in edits.items():
            open(os.path.join(root, f), 'w', encoding='utf-8').write(body)
        os.remove(os.path.join(root, path))
    return n, said


def day(s):
    if not re.fullmatch(r'\d{4}-\d\d-\d\d', s):
        raise argparse.ArgumentTypeError('a day is YYYY-MM-DD')
    datetime.strptime(s, '%Y-%m-%d')
    return s


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--check', action='store_true', help='check the rules (tools/check_versions.py runs it)')
    g.add_argument('--assign', action='store_true', help='the integrator, at merge: assign the next VERSION')
    ap.add_argument('--base', default='origin/main', help='--check: compare with the merge-base of HEAD and this ref; --assign: with this ref, which the branch must hold')
    ap.add_argument('--main', action='store_true', help='--check: this tree is main or a merge train: no changes file left')
    ap.add_argument('--date', type=day, help='--assign: the day of the header entry, YYYY-MM-DD (default: today in Manila)')
    ap.add_argument('--dry-run', action='store_true', help='--assign: say what would change, write nothing')
    a = ap.parse_args()
    if a.assign:
        base = assign_base(a.base)
        n, said = assign(date=a.date, dry=a.dry_run, base=base)
        for s in said:
            print(('would change ' if a.dry_run else '') + s)
        if not a.dry_run:
            print('\nNext: git add -A %s %s %s (and the files above), commit "Sheet script v%d assigned at merge", push,'
                  ' then merge once green and Codex-clean (docs/INTEGRATOR.md).' % (GS, HIST, CHANGES, n))
        return 0
    errs, state = problems(base=base_of(a.base), main=a.main)
    for e in errs:
        print('✗', e)
    print('Sheet script:', state if not errs else 'see above (docs/rules/sheet.md D3)')
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main())
