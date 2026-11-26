#!/usr/bin/env python3
"""Builds core.js from its parts (core/*.js) and keeps the copy embedded in the sync script (tools/sync/Code.gs) identical
to it. Run from the repo root.

    python3 tools/sync_core.py           # same as --check
    python3 tools/sync_core.py --check   # fails when core.js is not its parts joined, or Code.gs's copy differs (CI)
    python3 tools/sync_core.py --fix     # writes core.js from the parts, or carries a hand edit of core.js back into
                                         # its part (and, in a merge, an edit the merged core.js holds and its parts
                                         # lack); then core.js into Code.gs (adds the block at the end the first time).
                                         # When both could hold the edit, it says so and writes nothing:
    python3 tools/sync_core.py --cut     # carries core.js into the parts whatever changed (the parts' own edits are lost)
    python3 tools/sync_core.py --join    # writes core.js from the parts whatever changed (core.js's own edits are lost)
    python3 tools/sync_core.py --where N # the part, and its line, that holds core.js line N
    python3 tools/sync_core.py --list    # the parts, in order

The parts (architecture review of 2026-11-18, R6; step 4 of its migration path): core.js is one function, so each part
is a slice of its body, in the order PARTS gives, and the wrapper (its first three lines and its last) lives here, so every
part parses on its own. core.js is generated and committed, byte for byte the parts joined: the pages, the service worker,
the deploy's stamps and minifying, the tools and the tests keep loading core.js, and a split moves code without changing a
byte of what the browsers or the sheet run. Write in the part (--where names it); an edit made in core.js instead is
carried back by --fix, which cuts core.js at each part's first line (unique in core.js: --check says so).

Why the copy in Code.gs (Pierre, 2026-11-03: progress is recalculated from the whole answer log by the sheet itself): the
sync script replays each player's answers with the app's own progress engine (core.js replayProgress), so the engine must
be the same file. The script updates itself from GitHub by installing Code.gs alone (autoUpdate), so core.js is copied
into it rather than added as a second file. The copy sits between the BEGIN and END markers, unchanged, inside a function
that gives it a `module` of its own: core.js then exports to module.exports (as in Node) instead of adding its names to the
script's globals, where some (TRUST, PHOTO_W, MEM, PLAYER0) are Code.gs's own constants. Code.gs reaches it as CORE_.
"""
import argparse, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORE = 'core.js'
PARTS_DIR = 'core'
# core.js's parts, in order (core/<name>): each a run of whole statements of the one function's body.
PARTS = [
    'keys.js',  # the app's name (ORG) and the storage keys: their prefixes, the names before the rename, their migration
    'delta.js',  # lighter saves: a player's data as a delta and its checksum (dataDelta, dataPatch, dataSum, hash53); the lean answer log (rowsPack, rowsUnpack)
    'subjects.js',  # the subject registry (SUBJECTS, FISH_RENAMED) and what reads it
    'tree.js',  # the tree subjects' build (treeGen and its helpers), genera by name, renamed unit ids
    'content.js',  # the content editor's edits, the structure (circles, look-alike pairs)
    'merge.js',  # merges: a saved copy's subjects, the curation draft, two admin tabs, two devices, two accounts
    'elo.js',  # who rates the photos (trust), the photos' Elo and memory, the pooled confusions
    'apology.js',  # the apology card, reserved names and the admin mark, the shared admin draft (takeTab)
    'curation.js',  # Pierre's curation applied and the photos per context (applyCuration, applySlots)
    'start.js',  # the global level, the first-launch question, an existing account at sign-in, common first
    'achievements.js',  # the achievement lists, photo contributions, the answers to reports (helped), their merge
    'score.js',  # the former moving average, the domain-score bar
    'photos.js',  # the genera the games play, photos on R2 and out of the repo, a photo's retry
    'typing.js',  # typed answers: their normalising and fuzzy matching
    'ability.js',  # what one answer proves, ability per unit (Elo), response time, the one scorer
    'rules.js',  # the rules versions (RVS), gates on the sheet script's version, answer ids, the content version
    'replay.js',  # the full replay (replayProgress)
    'pages.js',  # pages opened in a visit: what the summary counts, the screen it was sent from
    'routes.js',  # the app's addresses (routeOut, routeIn, page names) and the move from the old ones
    'visits.js',  # the visit summary: page names read back, the tally, its owner, what the sheet keeps
    'pulse.js',  # the one-tap question's bank
    'stats.js',  # quantile and distOf (admin Photo stats)
    'exports.js',  # the exports (CORE): module.exports in Node and the sheet script, the page's globals in a browser
]
# The wrapper around the parts: core.js's first three lines and its last.
OPEN = ("// Pure functions shared by the app (app.js), the admin (admin.js) and the tests (node --test tests/*.test.js).\n"
        "// No DOM, no globals of the app: in the browser they become globals (classic script), in Node module.exports.\n"
        "(function (root) {\n")
CLOSE = '})(this);\n'
GS = os.path.join('tools', 'sync', 'Code.gs')
HEAD = ("// The app's core.js (progress engine, replayProgress), embedded by tools/sync_core.py: Code.gs reaches it as CORE_.\n"
        "// Its own module object keeps its names out of this script's globals (TRUST, MEM... are Code.gs's own).\n"
        "const CORE_ = (function () { const module = {exports: {}};\n")
BEGIN = '// BEGIN core.js (generated by tools/sync_core.py, do not edit)\n'
END = '// END core.js\n'
TAIL = 'return module.exports; })();\n'


def block(core):
    return HEAD + BEGIN + core + ('' if core.endswith('\n') else '\n') + END + TAIL


def join(parts):
    """core.js from the texts of its parts, in PARTS order."""
    return OPEN + ''.join(parts) + CLOSE


def first_line(text):
    return text.split('\n', 1)[0] + '\n'


def cut(core, parts):
    """core.js's text back into its parts: cut at the first line of each part after the first (as `parts` begin), each
    found exactly once in core.js. Exits with the reason when core.js cannot be cut so."""
    if not core.startswith(OPEN) or not core.endswith(CLOSE):
        sys.exit('✗ core.js: its first three lines and its last are tools/sync_core.py OPEN and CLOSE: change them there')
    body = core[len(OPEN):len(core) - len(CLOSE)]
    lines = body.splitlines(keepends=True)
    at = []
    for name, text in zip(PARTS[1:], parts[1:]):
        line = first_line(text)
        hits = [i for i, l in enumerate(lines) if l == line]
        if len(hits) != 1:
            sys.exit('✗ core.js: the first line of core/%s is found %d times in core.js, so it cannot be cut there: make the'
                     ' change in the part itself' % (name, len(hits)))
        if at and hits[0] <= at[-1]:
            sys.exit('✗ core.js: the first line of core/%s comes before the part ahead of it: make the change in the parts' % name)
        at.append(hits[0])
    bounds = [0] + at + [len(lines)]
    return [''.join(lines[a:b]) for a, b in zip(bounds, bounds[1:])]


def checkout(root):
    """The checkout core.js belongs to: root, or where its core.js links to (the merge queue runs main's tools on a
    shadow root whose files are links into the PR's checkout, tools/queue/lib.sh trusted_root)."""
    return os.path.dirname(os.path.realpath(os.path.join(root, CORE)))


def at_head(rel, root):
    """The file as HEAD has it, or None (no git, no such file)."""
    r = subprocess.run(['git', '-C', checkout(root), 'show', 'HEAD:' + rel], capture_output=True)
    return r.stdout.decode('utf-8') if r.returncode == 0 else None


def merging(root):
    return subprocess.run(['git', '-C', checkout(root), 'rev-parse', '-q', '--verify', 'MERGE_HEAD'],
                          capture_output=True).returncode == 0


def problems(core, parts, root):
    """What --check refuses about core.js and its parts (the copy in Code.gs aside)."""
    out = []
    there = sorted(f for f in os.listdir(os.path.join(root, PARTS_DIR)) if f.endswith('.js'))
    extra = [f for f in there if f not in PARTS]
    if extra:
        out.append('core/%s not in tools/sync_core.py PARTS: core.js would leave it out' % ', core/'.join(extra))
    if core != join(parts):
        out.append('core.js is not its parts joined (core/*.js, tools/sync_core.py PARTS): core.js is generated, write in the'
                   ' part (--where N names the one holding core.js line N); python3 tools/sync_core.py --fix carries an edit'
                   ' made in core.js back into its part')
    else:
        lines = core.splitlines(keepends=True)
        for name, text in zip(PARTS, parts):
            if not text or not text.endswith('\n'):
                out.append('core/%s: a part is whole lines, at least one' % name)
            elif name != PARTS[0] and lines.count(first_line(text)) != 1:
                out.append('core/%s: its first line is not unique in core.js, so --fix could not cut an edit of core.js back'
                           ' there: start the part on a line found once (its own comment)' % name)
    return out


def where(n, parts):
    """(part name, its line) of core.js line n, or None for the wrapper's lines."""
    k = n - OPEN.count('\n')
    if k < 1:
        return None
    for name, text in zip(PARTS, parts):
        c = text.count('\n')
        if k <= c:
            return name, k
        k -= c
    return None


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--check', action='store_true')
    g.add_argument('--fix', action='store_true')
    g.add_argument('--cut', action='store_true')
    g.add_argument('--join', action='store_true')
    g.add_argument('--where', type=int, metavar='N')
    g.add_argument('--list', action='store_true')
    ap.add_argument('--root', default=ROOT, help=argparse.SUPPRESS)
    a = ap.parse_args()
    root = a.root
    path = lambda rel: os.path.join(root, rel)
    if a.list:
        print('\n'.join(PARTS_DIR + '/' + p for p in PARTS))
        return
    read = lambda rel: open(path(rel), encoding='utf-8').read()
    parts = [read(os.path.join(PARTS_DIR, p)) for p in PARTS]
    core = read(CORE)
    if a.where is not None:
        w = where(a.where, parts)
        print('core/%s:%d' % w if w else 'core.js line %d is the wrapper: tools/sync_core.py OPEN or CLOSE' % a.where)
        return
    write = a.fix or a.cut or a.join
    if write and core != join(parts):
        # Which side holds the edit, against HEAD: never guessed when both could (nothing is overwritten silently).
        rels = [PARTS_DIR + '/' + p for p in PARTS]
        head_core, head_parts = at_head(CORE, root), [at_head(r, root) for r in rels]
        core_edited, parts_edited = core != head_core, parts != head_parts
        head_ok = head_core is not None and None not in head_parts and join(head_parts) == head_core
        # A merge: each side kept core.js and its parts in step (--check), so the merged core.js holds both sides'
        # edits, and the parts may lack one that a side made in core.js alone (a branch from before the parts): carried
        # back into them.
        if a.cut or (not a.join and core_edited and (not parts_edited or merging(root))):
            if any(l.startswith(('<<<<<<< ', '>>>>>>> ')) for l in core.splitlines()):
                sys.exit('✗ core.js holds conflict markers: settle them first')
            new = cut(core, parts)
            for r, old, text in zip(rels, parts, new):
                if text != old:
                    open(path(r), 'w', encoding='utf-8').write(text)
                    print('core.js carried back into %s' % r)
            parts = new
        elif a.join or (not core_edited and head_ok):
            core = join(parts)
            open(path(CORE), 'w', encoding='utf-8').write(core)
            print('core.js written from its parts')
        elif not core_edited:
            sys.exit('✗ core.js and its parts already disagree in the last commit (git diff HEAD~1 -- core.js core/ shows'
                     ' which you changed): python3 tools/sync_core.py --join writes core.js from the parts (an edit made'
                     ' in core.js is lost), --cut writes the parts from core.js (an edit made in a part is lost)')
        else:
            sys.exit('✗ core.js and its parts both changed since HEAD: python3 tools/sync_core.py --cut carries core.js'
                     ' into the parts (their own edits are lost), --join writes core.js from the parts (its own edits are'
                     ' lost)')
    bad = problems(core, parts, root)
    if bad:
        sys.exit('✗ ' + '\n✗ '.join(bad))
    gs = read(GS)
    want = block(core)
    i = gs.find(HEAD + BEGIN)
    if i < 0:
        new = gs.rstrip('\n') + '\n\n' + want
    else:
        j = gs.find(END + TAIL, i)
        if j < 0:
            sys.exit('tools/sync/Code.gs: the END core.js marker is missing; run with --fix after removing the broken block')
        new = gs[:i] + want + gs[j + len(END + TAIL):]
    if new == gs:
        print('core.js is its parts joined; core.js in Code.gs: OK')
        return
    if write:
        open(path(GS), 'w', encoding='utf-8').write(new)
        print('core.js copied into tools/sync/Code.gs: add its entry in tools/sync/changes/<branch>.md, never VERSION (rule D3)')
        return
    sys.exit('✗ tools/sync/Code.gs does not hold the current core.js: run python3 tools/sync_core.py --fix and add tools/sync/changes/<branch>.md (rule D3)')


if __name__ == '__main__':
    main()
