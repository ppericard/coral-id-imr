#!/usr/bin/env python3
"""The coral slate pairs' "tell them apart" lines (Pierre, 2026-11-18, the feedback sheet study's question (d): "ok pour
les 6 recommandations"; docs/decisions/2026-11-18-tellapart-lines.md): lays tools/coral_apart.json on data.json, as the
fish's undeclared pairs' lines (fish.json apart) reach the quiz feedback's one decisive line (quiz.js fbLine, pairLine).

tools/coral_apart.json, hand-kept: {about, src, pairs, none}.
  - src {key: {t, u?}}: each source, t its name (u its public page when it has one).
  - pairs {"A|B": {A: [words, [[src key, where in it], ...]], B: [...]}}: for a declared slate pair (the slate as
    core.js slateOf counts it: data.json gen, and Millepora from x.gen; each genus in the other's look), the feature
    that tells each genus from the other, in our own words, each side with its sources (rule C2). One side may be left
    out when no source read gives the other genus's feature; never a side guessed. Never a line made by comparing the
    Coral Finder trait tags (rule C3); tests/booktext.test.js keeps book text out of them.
  - none {"A|B": why}: a declared slate pair left without a line, and why (the quiz feedback then shows the first ID tip).
Each side's words describe that genus; data.json gets them on the OTHER genus's record, as the fish's apart: rec[B].ap[A]
= "A: <A's words>", rec[B].apsrc[A] = "<its sources>", so the feedback after a mix-up of A and B reads "A: ... · B: ..."
(quiz.js pairText). A number is allowed: IMR's own deciding cue is sometimes one (Alveopora 12 tentacles, Goniopora 24).

The script stops on anything else: a pair that is not a declared slate pair or is in both pairs and none, a declared
pair in neither, a side that is not one of its two genera, a line without a source or with a source not in src, a line
too long, a source never used.

  python3 tools/apply_coral_apart.py           write data.json ap and apsrc from tools/coral_apart.json
  python3 tools/apply_coral_apart.py --check   exit 1 when data.json differs from tools/coral_apart.json
  python3 tools/apply_coral_apart.py --list    print the slate pairs, with and without a line, and what the data says
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from datajson import load, dump, PATH  # noqa: E402  the one data.json layout
from genera import lists  # noqa: E402  core.js BENTHIC: the slate genera kept in data.json x.gen (slateOf)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'coral_apart.json')
LONGEST = 64  # one side's words at most (rule C3: short, read at a glance; the sheet shows both sides on a phone)


class ApartError(SystemExit):
    pass


def bad(why):
    raise ApartError('tools/coral_apart.json: ' + why)


def slate(d):
    """{genus: its data.json record} for every slate genus (core.js slateOf)."""
    X = (d.get('x') or {}).get('gen') or {}
    out = {g: r for g, r in d['gen'].items() if g not in X}
    out.update({g: X[g] for g in lists()[0] if g in X})
    return out


def slate_pairs(G):
    """Every declared pair of two slate genera, (a, b) sorted, once."""
    out = set()
    for a, g in G.items():
        for b in g.get('look') or []:
            if b in G and b != a:
                out.add(tuple(sorted((a, b))))
    return sorted(out)


def lines(A, G):
    """{genus: {other: (line, source)}} from tools/coral_apart.json A, checked against the slate records G."""
    src, used = A.get('src') or {}, set()
    for k, s in src.items():
        if not isinstance(s, dict) or not str(s.get('t', '')).strip() or set(s) - {'t', 'u'}:
            bad(f'src {k}: {{t, u?}}')
        if 'u' in s and not str(s['u']).startswith('https://'):
            bad(f'src {k}: u must be https')
    pairs = set(slate_pairs(G))
    P0, N0 = A.get('pairs') or {}, A.get('none') or {}
    for key in list(P0) + list(N0):
        ab = key.split('|')
        if len(ab) != 2 or tuple(sorted(ab)) != tuple(ab) or tuple(ab) not in pairs:
            bad(f'{key}: not a declared slate pair written "A|B" in A-Z order')
    both = set(P0) & set(N0)
    if both:
        bad('in pairs and in none: ' + ', '.join(sorted(both)))
    left = sorted(f'{a}|{b}' for a, b in pairs if f'{a}|{b}' not in P0 and f'{a}|{b}' not in N0)
    if left:
        bad('declared slate pairs in neither pairs nor none: ' + ', '.join(left))
    for key, why in N0.items():
        if not str(why).strip():
            bad(f'none {key}: a reason')
    out, long = {}, []
    for key, P in P0.items():
        ab = key.split('|')
        if not isinstance(P, dict) or not P or set(P) - set(ab):
            bad(f'{key}: one entry for one or both of its genera')
        for x, m in P.items():
            y = ab[1] if x == ab[0] else ab[0]
            if not (isinstance(m, list) and len(m) == 2 and isinstance(m[0], str)):
                bad(f'{key} {x}: [words, sources]')
            text, rr = m
            if not text.strip() or text != ' '.join(text.split()):
                bad(f"{key} {x}: '{text}': one line of words")
            if len(text) > LONGEST:
                long.append(f"{key} {x} ({len(text)})")
            if not rr:
                bad(f"{key} {x}: '{text}' has no source")
            S = []
            for q in rr:
                if not (isinstance(q, list) and len(q) == 2 and q[0] in src and isinstance(q[1], str) and q[1].strip()):
                    bad(f"{key} {x}: a source is [a key of src, where in it]")
                used.add(q[0])
                t = f"{src[q[0]]['t']}, {q[1]}"
                if t not in S:
                    S.append(t)
            out.setdefault(y, {})[x] = (f'{x}: {text}', '; '.join(S))
    if long:
        bad(f'lines over {LONGEST} characters: ' + ', '.join(long))
    if set(src) - used:
        bad('sources never used: ' + ', '.join(sorted(set(src) - used)))
    return out


def applied(d, A):
    """data.json d with every slate genus's ap and apsrc from A (none: the keys left out)."""
    G = slate(d)
    L = lines(A, G)
    for g, rec in G.items():
        rec.pop('ap', None)
        rec.pop('apsrc', None)
        if g in L:
            rec['ap'] = {o: L[g][o][0] for o in sorted(L[g])}
            rec['apsrc'] = {o: L[g][o][1] for o in sorted(L[g])}
    return d


def listing(d, A):
    G = slate(d)
    have, none = A.get('pairs') or {}, A.get('none') or {}
    for a, b in slate_pairs(G):
        k = f'{a}|{b}'
        print(('LINE ' if k in have else 'NONE ' if k in none else 'TODO ') + k)
        print('   lsrc:', (G[a].get('lsrc') or {}).get(b) or (G[b].get('lsrc') or {}).get(a) or '')
        for x in (a, b):
            g = G[x]
            print(f'   {x} qt:', ' | '.join(g.get('qt') or []))
            print(f'   {x} sum:', g.get('sum') or '')
            print(f'   {x} crit:', ' | '.join(g.get('crit') or []))
            print(f'   {x} imr:', ' | '.join(str(i) for i in (g.get('imr') or [])))
    for g in sorted(G):
        print(f"   {g}: IMR Lecture 6 slides {G[g].get('sl') or []}, Coral Finder pages {G[g].get('pages') or []}")
    n = len(slate_pairs(G))
    print(f'{len(have)} of {n} slate pairs with a line, {len(none)} without')


def main():
    A = json.load(open(SRC, encoding='utf-8')) if os.path.exists(SRC) else {}
    d = load(PATH)
    if '--list' in sys.argv[1:]:
        return listing(d, A)
    before = json.dumps(d, ensure_ascii=False, sort_keys=True)
    d = applied(d, A)
    same = json.dumps(d, ensure_ascii=False, sort_keys=True) == before
    if '--check' in sys.argv[1:]:
        if not same:
            sys.exit('data.json ap/apsrc differ from tools/coral_apart.json: run python3 tools/apply_coral_apart.py')
        print('data.json ap/apsrc as tools/coral_apart.json gives them')
        return
    dump(d, PATH)
    print('data.json', 'unchanged' if same else 'written', f"({len(A.get('pairs') or {})} pairs with a line)")


if __name__ == '__main__':
    try:
        main()
    except ApartError as e:
        sys.exit(str(e))
