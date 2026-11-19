#!/usr/bin/env python3
"""Every answer reaches its doc (AGENTS.md "Every answer reaches its doc, and the answers ledger"), checked as data.

  python3 tools/answers_check.py           the report: what fails, what is known, what to look at; exit 0
  python3 tools/answers_check.py --check   the same, exit 1 on a failure (tests/docs.test.js runs it)

1. The ledger: every docs/ANSWERS.md entry dated 2026-11-19 or later says where it is applied, "Applied: <doc or #PR>"
   (or "Applied in #N:"), or "no doc change" when it changes no doc. The ledger is append-only: an entry without one is
   closed by a later entry "- **Applied in #N:** …" naming its question number (Q412…) or, unnumbered, its time and
   first three words ("06:50, rule S1's wording"; case and punctuation ignored). Every "#…" after "Applied"
   is a PR number (#1199), never a placeholder (#N, "this PR"). KNOWN lists the entries that were in the ledger before
   this check and say neither, each with why; an entry of KNOWN that no longer matches an open entry fails, so the list
   only shrinks.
2. Waiting versus answered: a question the ledger records as answered (its number in an entry's bold head, the entry not
   saying "Not answered") must not be cited as still waiting. Fails: a docs/ROADMAP.md or docs/reviews/README.md table
   row whose status cell (the last) says "Waiting on Pierre", "for Pierre" or "Open question" and names that number.
   Shown, never failing: a line of a study (docs/reviews/*.md, history that keeps its words) with such a phrase and
   number, and a question of docs/STATUS.md "Questions for Pierre" (the integrator's file).
3. The ROADMAP holds every decision: an entry from 2026-11-19 21:00 on (ROADMAP_SINCE; the head's time) that names a
   ROADMAP item, a row's bold title of three words or more or an inventory ID ("inventory C12"), says after "Applied"
   the ROADMAP or the PR that changed the row (#1234), and never "(to update)" or "(to do)" there. The entries before
   were written before this check; the 2026-11-19 recount applied theirs (Pierre, 2026-11-19 20:45).
Offline, standard library only.
"""
import argparse
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SINCE = '2026-11-19'
APPLIED = re.compile(r'\bApplied(?: in #\d+)?:|\bno doc change\b', re.I)
WAITING = re.compile(r'waiting on pierre|waits? for pierre|for pierre|open question', re.I)
QNUM = re.compile(r'\bQ(\d+)\b')
WORDS = 3  # a closing entry names an unnumbered entry by its time and first three words (needle())
ROADMAP_SINCE = ('2026-11-19', '21:00')  # check 3 reads the entries from this date and head time on
INVENTORY = re.compile(r'\binventory(?: items?)? ([A-Z]\d{1,2})\b', re.I)  # "inventory C12", never "rule P1"
TO_DO = re.compile(r'\([^()]*\bto (?:update|do|add)\b[^()]*\)', re.I)  # "ROADMAP (to update)" is not applied
# Ledger entries of 2026-11-19 written before this check, with neither "Applied:" nor "no doc change". Key: the entry's
# date and the start of its text, as the report prints it. Close one with a later "Applied in #N:" entry naming its Q
# or its time and first words, then delete its line here.
KNOWN = {
    '2026-11-19 06:26. "Commence par essayer': "an instruction for that session's merges; where applied not said",
    '2026-11-19 06:37. "Par du principe': 'the allow-rule habit (INTEGRATOR "Habits"); where applied not said',
    '2026-11-19 06:50, Q407.': 'where applied not said',
    '2026-11-19 06:50, Q410.': 'the names stay; "no doc change" not said',
    '2026-11-19 06:50, Q411.': 'not answered (the entry says so); its follow-up not placed',
    '2026-11-19 06:50 and 06:58, Q416': 'four follow-ups; where each is applied not said',
    '2026-11-19 06:50, the source weight': 'where applied not said (open PR #1195 carries rule P1 into the corals\' code)',
    '2026-11-19 06:59. The rename': 'an answer already given plus a docs pass; where applied not said',
    '2026-11-19 08:53, Q424': 'where applied not said',
    '2026-11-19 08:57, the order of work': 'names AGENTS.md "Questions to Pierre" without "Applied:"',
}


def flat(lines):
    return re.sub(r'\s+', ' ', ' '.join(l.strip() for l in lines)).strip()


def ledger(text):
    """The entries of the ledger: (date, line, head, text). An entry is a bullet at the margin and its indented lines."""
    out, date, cur = [], '', None
    for n, line in enumerate(text.split('\n'), 1):
        m = re.match(r'## (\d{4}-\d\d-\d\d)\b', line)
        if m:
            date, cur = m.group(1), None
        elif line.startswith('- '):
            cur = [date, n, [line[2:]]]
            out.append(cur)
        elif cur is not None and line.startswith('  ') and line.strip():
            cur[2].append(line)
        else:
            cur = None
    res = []
    for date, n, lines in out:
        text = flat(lines)
        m = re.match(r'\*\*(.+?)\*\*', text)
        res.append((date, n, m.group(1) if m else '', text))
    return res


def words(text):
    """The text as lower-case words, marks and punctuation dropped: "**06:50, rule S1’s wording.**" -> "06:50 rule
    s1's wording"."""
    text = text.lower().replace('’', "'")
    return ' '.join(w.strip("':") for w in re.split(r"[^\w:']+", text) if w.strip("':"))


def needle(text):
    """How a closing entry names an entry: its time (when it starts with one) and its first WORDS words."""
    w = words(text).split()
    return ' '.join(w[: WORDS + 1] if w and re.fullmatch(r'\d\d:\d\d', w[0]) else w[:WORDS])


def label(date, text):
    return '%s %s' % (date, text.replace('**', '')[:40].rstrip())


def answered(entries):
    """Question number -> the line of the ledger entry that answers it."""
    out = {}
    for date, n, head, text in entries:
        if re.search(r'\bnot answered\b', text, re.I):
            continue
        for q in QNUM.findall(head):
            out.setdefault(int(q), n)
    return out


def check_ledger(entries):
    """(failures, known): the entries from SINCE with no place applied, and the bad PR numbers after "Applied"."""
    fails, known, used = [], [], set()
    closers = [(n, t) for d, n, h, t in entries if re.match(r'Applied in #\d+', h)]  # with their line: a closer closes only what precedes it
    for date, n, head, text in entries:
        if date < SINCE:
            continue
        lab = label(date, text)
        m = APPLIED.search(text) or re.search(r'\bapplied\b', head, re.I)  # "**07:59, Q418 applied.** #1171 …"
        if m:
            tail = text[m.start():] if m.re is APPLIED else text
            bad = [r for r in re.findall(r'(?<!\]\()(?<![\w/])#(\w+)', tail) if not re.fullmatch(r'[1-9]\d{0,5}', r)]
            if re.search(r'\bthis PR\b', tail, re.I):
                bad.append('"this PR"')
            if bad:
                fails.append('docs/ANSWERS.md:%d %s…: after "Applied", %s is not a PR number (#1234)' % (n, lab, ', '.join(bad)))
            continue
        qs = QNUM.findall(head)
        start = needle(text)
        if any(
            cn > n and ((qs and all(re.search(r'\bQ%s\b' % q, c) for q in qs)) or ' %s ' % start in ' %s ' % words(c))
            for cn, c in closers
        ):
            continue
        key = next((k for k in KNOWN if lab.startswith(k)), None)
        if key:
            used.add(key)
            known.append('docs/ANSWERS.md:%d %s…: %s' % (n, lab, KNOWN[key]))
            continue
        fails.append(
            'docs/ANSWERS.md:%d %s…: names no "Applied: <doc or #PR>" nor "no doc change"; the ledger is append-only: '
            'add a later entry "- **Applied in #N:** …" naming its Q, or its time and first words "%s"' % (n, lab, needle(text))
        )
    for k in KNOWN:
        if k not in used:
            fails.append('tools/answers_check.py KNOWN "%s": no open ledger entry matches it any more: delete it' % k)
    return fails, known


def roadmap_titles(root):
    """The bold titles of the ROADMAP's rows and bullets with three words or more (a shorter one, "Modules", would match
    ordinary prose)."""
    p = os.path.join(root, 'docs', 'ROADMAP.md')
    if not os.path.exists(p):
        return []
    out = []
    with open(p, encoding='utf-8') as f:
        for line in f:
            m = re.match(r'(?:\| |- )\*\*(.+?)\*\*', line)
            if m:
                t = m.group(1).strip().rstrip(':').strip()
                if len(t.split()) >= 3 and t not in out:
                    out.append(t)
    return out


def check_roadmap(entries, titles):
    """Failures: the entries from ROADMAP_SINCE that name a ROADMAP item and do not say the ROADMAP or a PR after
    "Applied"."""
    fails = []
    for date, n, head, text in entries:
        t = re.match(r'(\d\d:\d\d)\b', head)
        if (date, t.group(1) if t else '') < ROADMAP_SINCE:
            continue
        low = text.lower()
        named = [x for x in titles if re.search(r'(?<!\w)%s(?!\w)' % re.escape(x.lower()), low)]
        named += ['inventory ' + i for i in INVENTORY.findall(text)]
        if not named:
            continue
        m = APPLIED.search(text)
        tail = text[m.start():] if m else ''
        if tail and re.search(r'\bROADMAP\b|#\d+', tail) and not TO_DO.search(tail):
            continue
        fails.append(
            'docs/ANSWERS.md:%d %s…: names the ROADMAP item %s; after "Applied" name the ROADMAP or the PR that changed '
            'its row (#1234), never "(to update)"' % (n, label(date, text), ', '.join('"%s"' % x for x in named[:3]))
        )
    return fails


def rows(path, rel):
    """Table rows with a waiting status cell (the last): (rel, line, status)."""
    out = []
    with open(path, encoding='utf-8') as f:
        for n, line in enumerate(f, 1):
            if not line.startswith('|'):
                continue
            cells = [c.strip() for c in re.split(r'(?<!\\)\|', line.strip())[1:-1]]
            if cells and WAITING.search(cells[-1]):
                out.append((rel, n, cells[-1]))
    return out


def waiting_qs(s, done):
    """The answered question numbers cited beside a waiting phrase: within 40 characters of it, in its ";" clause (a
    status cell also lists what was answered and built: "built: … (#642, Q133); (b) for Pierre")."""
    out = []
    for clause in s.split(';'):
        for m in WAITING.finditer(clause):
            for q in QNUM.findall(clause[max(0, m.start() - 40) : m.end() + 40]):
                if int(q) in done and q not in out:
                    out.append(q)
    return out


def check_waiting(root, done):
    """(failures, warnings): answered questions still cited as waiting."""
    fails, warns = [], []
    cite = lambda qs: ', '.join('Q%s (docs/ANSWERS.md:%d)' % (q, done[int(q)]) for q in qs)
    for rel in ('docs/ROADMAP.md', 'docs/reviews/README.md'):
        p = os.path.join(root, rel)
        if not os.path.exists(p):
            continue
        for rel_, n, status in rows(p, rel):
            qs = waiting_qs(status, done)
            if qs:
                fails.append('%s:%d: its status "%s" waits on %s, answered: update the status' % (rel_, n, status[:80], cite(qs)))
    for p in sorted(glob.glob(os.path.join(root, 'docs', 'reviews', '*.md'))):
        rel = os.path.relpath(p, root).replace(os.sep, '/')
        if rel == 'docs/reviews/README.md':
            continue
        with open(p, encoding='utf-8') as f:
            for n, line in enumerate(f, 1):
                if WAITING.search(line):
                    qs = waiting_qs(line, done)
                    if qs:
                        warns.append('%s:%d: says it waits on Pierre and names %s, answered' % (rel, n, cite(qs)))
    p = os.path.join(root, 'docs', 'STATUS.md')
    if os.path.exists(p):
        text = open(p, encoding='utf-8').read()
        sec = re.search(r'^## Questions for Pierre\n(.*?)(?=^## )', text, re.M | re.S)
        if sec:
            start = text[: sec.start(1)].count('\n') + 1
            for i, line in enumerate(sec.group(1).split('\n')):
                m = re.match(r'- \*\*Q(\d+)', line)
                if m and int(m.group(1)) in done:
                    warns.append('docs/STATUS.md:%d: Q%s is listed open, answered (docs/ANSWERS.md:%d)' % (start + i, m.group(1), done[int(m.group(1))]))
    return fails, warns


def main(argv=None):
    ap = argparse.ArgumentParser(description='Every answer of Pierre reaches its doc: the ledger checked as data.')
    ap.add_argument('--check', action='store_true', help='exit 1 on a failure')
    ap.add_argument('--root', default=ROOT, help=argparse.SUPPRESS)
    ap.add_argument('--known', help=argparse.SUPPRESS)  # the tests' own KNOWN, as JSON
    a = ap.parse_args(argv)
    if a.known is not None:
        KNOWN.clear()
        KNOWN.update(json.loads(a.known))
    with open(os.path.join(a.root, 'docs', 'ANSWERS.md'), encoding='utf-8') as f:
        entries = ledger(f.read())
    f1, known = check_ledger(entries)
    f2, warns = check_waiting(a.root, answered(entries))
    fails = f1 + f2 + check_roadmap(entries, roadmap_titles(a.root))
    for title, items in (('FAIL', fails), ('known', known), ('look', warns)):
        for s in items:
            print('%-5s %s' % (title, s))
    print('answers check: %d failing, %d known (KNOWN), %d to look at' % (len(fails), len(known), len(warns)))
    return 1 if a.check and fails else 0


if __name__ == '__main__':
    sys.exit(main())
