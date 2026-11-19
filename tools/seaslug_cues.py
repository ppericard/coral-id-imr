#!/usr/bin/env python3
"""The sea slugs' sourced ID marks (study docs/reviews/2026-11-15-nudibranch-mode-study.md §9, step 7; Pierre, 2026-11-17:
complete what is missing for the nudibranchs): checks tools/seaslug_cues.json and lays its marks on the tree that
tools/seaslug_game.py builds, as fish.json's genus marks (tools/build_fish.py genus_marks) so the fish engine shows them
unchanged: on a genus or a family, marks (1 to 3 visible features), msrc (each source once, {t, u}: the source's t, then
where in it) and mby ({marks: [[msrc indexes] per mark]}). It also lays the declared genus pairs' tell-apart lines
(the key apart, apart_of) as apart and apsrc on the genera, and checks the reasons of the pairs left without one (apartNone).

The build stops on anything else (rules C2, C3, C6): a line without a source or with a source not in src, a source not
https, a mark with a number (a count is never a photo cue), a line too long for a tip, a species named that is not one
of its genus's game species, a genus or family not in the tree, marks and a reason in none together, a circle-1 genus
with neither, or a source never used.

  python3 tools/seaslug_cues.py      check tools/seaslug_cues.json against seaslug.json and print what it covers
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUES = os.path.join(ROOT, 'tools', 'seaslug_cues.json')
KEYS = {'about', 'src', 'families', 'genera', 'none', 'apart', 'apartNone'}
LONGEST = 80  # a mark's length at most, as a fish genus mark's (rule C3: short and simple)


class CueError(SystemExit):
    pass


def bad(why):
    raise CueError('tools/seaslug_cues.json: ' + why)


def line_of(name, m, src, used, species=None, genus=None):
    """(words, [{t, u}] its sources) of one line m = [words, refs], checked. species: the game species' names of a genus
    (rule C6: a species named in a line, as "G. kuniei", is one of them), None for a family (no species may be named)."""
    if not (isinstance(m, list) and len(m) == 2):
        bad(f'{name}: a line is [words, sources]')
    text, rr = m
    if not isinstance(text, str) or not text.strip() or len(text) > LONGEST or text != ' '.join(text.split()):
        bad(f"{name}: '{text}': a line of at most {LONGEST} characters")
    if re.search(r'\d', text):
        bad(f"{name}: '{text}': a line with a number (a count is never a photo cue)")
    eps = {s.split()[1] for s in species or [] if len(s.split()) > 1}
    for ini, ep in re.findall(r'\b([A-Z])\. ([a-z]+)', text):
        if genus is None or ini != genus[0] or ep not in eps:
            bad(f"{name}: '{ini}. {ep}' is not one of its game species (rule C6)")
    if not rr:
        bad(f"{name}: '{text}' has no source")
    out = []
    for q in rr:
        if not (isinstance(q, list) and len(q) == 2 and q[0] in src and isinstance(q[1], str) and q[1].strip()):
            bad(f"{name}: '{text}': a source is [a key of src, where in it]")
        s = src[q[0]]
        if not s.get('t') or not str(s.get('u', '')).startswith('https://'):
            bad(f'src {q[0]}: t and an https u')
        used.add(q[0])
        e = {'t': f"{s['t']}, {q[1]}", 'u': s['u']}
        if e not in out:
            out.append(e)
    return text, out


def marks_of(name, x, src, used, species=None, genus=None):
    """{marks, msrc, mby} of one genus or family entry x (line_of checks each mark)."""
    if not isinstance(x, dict) or set(x) - {'marks'}:
        bad(f'{name}: the key marks only')
    marks = x.get('marks') or []
    if not marks or len(marks) > 3:
        bad(f'{name}: 1 to 3 marks')
    msrc, by = [], []
    for m in marks:
        _, S = line_of(name, m, src, used, species, genus)
        for e in S:
            if e not in msrc:
                msrc.append(e)
        by.append([msrc.index(e) for e in S])
    return {'marks': [m[0] for m in marks], 'msrc': msrc, 'mby': {'marks': by}}


def apart_of(apart, gens, src, used, names):
    """Lays the genus pairs' tell-apart lines (the key apart: {"A|B": {A: line, B: line}}, one side or both) on gens:
    each side's words describe its own genus and go on the OTHER genus's record, as the fish's apart, apart {other id: "A: words"} and apsrc {other id: [{t, u}]}, which the quiz
    feedback's decisive line reads (app.js fishGenera ap, apsrc; quiz.js pairText). Only for a declared pair (each genus
    in the other's look: tools/seaslug_game.py genus_looks). Returns the pairs laid."""
    done = []
    for key, P in (apart or {}).items():
        ab = key.split('|')
        if len(ab) != 2 or ab != sorted(ab):
            bad(f'apart {key}: "A|B" in A-Z order')
        ga, gb = ('g:' + n for n in ab)
        if ga not in gens or gb not in gens:
            bad(f'apart {key}: a genus not in the tree')
        if gb not in (gens[ga].get('look') or []) or ga not in (gens[gb].get('look') or []):
            bad(f'apart {key}: not a declared genus pair (look)')
        if not isinstance(P, dict) or not P or set(P) - set(ab):
            bad(f'apart {key}: a line for one or both of its genera')
        for x, m in P.items():
            gx = 'g:' + x
            gy = gb if gx == ga else ga
            text, S = line_of(f'apart {key} {x}', m, src, used, names.get(gx, []), x)
            gens[gy].setdefault('apart', {})[gx] = f'{x}: {text}'
            gens[gy].setdefault('apsrc', {})[gx] = S
        done.append(key)
    return done


def apply(cues, fams, gens, species):
    """Lays tools/seaslug_cues.json cues on the tree being built: fams and gens, {id: record} (f:<family>, g:<genus>);
    species, the tree's species records (a genus's game species, for rule C6). Returns (genera with marks, genera in
    none)."""
    if not cues:
        return [], []
    if set(cues) - KEYS:
        bad('keys ' + ', '.join(sorted(KEYS)) + ' only')
    src, used = cues.get('src') or {}, set()
    none = cues.get('none') or {}
    names = {}
    for s in species:
        names.setdefault(s['genus'], []).append(s['name'])
    for n, x in (cues.get('families') or {}).items():
        f = fams.get('f:' + n)
        if not f:
            bad(f'family {n} is not in the tree')
        f.update(marks_of(n, x, src, used))
    done = []
    for n, x in (cues.get('genera') or {}).items():
        g = gens.get('g:' + n)
        if not g:
            bad(f'genus {n} is not in the tree')
        if n in none:
            bad(f'{n}: both marks and a reason in none')
        g.update(marks_of(n, x, src, used, names.get(g['id'], []), n))
        done.append(n)
    for n, why in none.items():
        if 'g:' + n not in gens:
            bad(f'none {n}: not a genus of the tree')
        if not str(why).strip():
            bad(f'none {n}: a reason')
    miss = [g['name'] for g in gens.values() if g['circle'] == 1 and g['name'] not in done and g['name'] not in none]
    if miss:
        bad('circle-1 genera with neither marks nor a reason in none: ' + ', '.join(miss))
    apart_of(cues.get('apart'), gens, src, used, names)
    for key, why in (cues.get('apartNone') or {}).items():
        ab = key.split('|')
        if key in (cues.get('apart') or {}) or len(ab) != 2 or any('g:' + n not in gens for n in ab):
            bad(f'apartNone {key}: a genus pair of the tree with no line in apart')
        if not str(why).strip():
            bad(f'apartNone {key}: a reason')
    if cues.get('apart') is not None or cues.get('apartNone') is not None:
        decl = {'|'.join(sorted((g['name'], gens[o]['name']))) for g in gens.values() for o in g.get('look') or []
                if o in gens}
        left = sorted(decl - set(cues.get('apart') or {}) - set(cues.get('apartNone') or {}))
        if left:
            bad('declared genus pairs in neither apart nor apartNone: ' + ', '.join(left))
    if set(src) - used:
        bad('sources never used: ' + ', '.join(sorted(set(src) - used)))
    return done, list(none)


SPKEYS = {'about', 'draft', 'src', 'species', 'none'}


def species_apply(x, species):
    """Lays tools/seaslug_species_marks.json (x; agent drafts until Pierre validates them) on the tree's species records:
    marks (1 to 3), msrc (each source once, {t, u}: never the quote), mby ({marks: [[msrc indexes] per mark]}) and mdraft
    (1 while x says draft), as a fish species' (tools/build_fish.py species_marks). Every species of the tree has marks or
    a reason in none. Stops on anything else (rules C2, C3, C6): a mark without a source or without the page's words it
    rests on, a mark with a number, a line too long, a species named that is not one of its genus's game species, an
    unused source. Returns (species with marks, species in none)."""
    for s in species:
        for k in ('marks', 'msrc', 'mby', 'mdraft'):
            s.pop(k, None)
    if not x:
        return [], []

    def sbad(why):
        raise CueError('tools/seaslug_species_marks.json: ' + why)

    if set(x) - SPKEYS:
        sbad('keys ' + ', '.join(sorted(SPKEYS)) + ' only')
    S, used = x.get('src') or {}, set()
    byname = {s['name']: s for s in species}
    names = {}
    for s in species:
        names.setdefault(s['genus'], []).append(s['name'])
    sp, none = x.get('species') or {}, x.get('none') or {}
    for name, r in sp.items():
        s = byname.get(name)
        if not s:
            sbad(f'{name}: not a species of the tree')
        if name in none:
            sbad(f'{name}: both marks and a reason in none')
        if not isinstance(r, dict) or set(r) - {'marks'}:
            sbad(f'{name}: the key marks only')
        marks = r.get('marks') or []
        if not 1 <= len(marks) <= 3 or any(not (isinstance(m, list) and len(m) == 2) for m in marks):
            sbad(f'{name}: 1 to 3 marks, each [words, sources]')
        g = name.split()[0]
        msrc, by = [], []
        for t, rr in marks:
            if not isinstance(t, str) or not t.strip() or len(t) > LONGEST or t != ' '.join(t.split()):
                sbad(f"{name}: '{t}': a line of at most {LONGEST} characters")
            if re.search(r'\d', t):
                sbad(f"{name}: '{t}': a mark with a number (a count is never a photo cue)")
            for ini, ep in re.findall(r'\b([A-Z])\. ([a-z]+)', t):
                if ini != g[0] or f'{g} {ep}' not in names.get(s['genus'], []):
                    sbad(f"{name}: '{ini}. {ep}' is not a game species of {g} (rule C6)")
            for full in re.findall(r'\b[A-Z][a-z]+ [a-z]+', t):
                if full in byname and full not in names.get(s['genus'], []):
                    sbad(f"{name}: '{full}' is not a game species of {g} (rule C6)")
            if not rr:
                sbad(f"{name}: '{t}' has no source")
            ix = []
            for q in rr:
                if not (isinstance(q, list) and len(q) == 2 and q[0] in S and isinstance(q[1], str) and q[1].strip()):
                    sbad(f"{name}: '{t}': a source is [a key of src, the page's words it rests on]")
                e = S[q[0]]
                if not str(e.get('t', '')).strip() or not str(e.get('u', '')).startswith('https://'):
                    sbad(f'src {q[0]}: t and an https u')
                used.add(q[0])
                e = {'t': e['t'], 'u': e['u']}
                if e not in msrc:
                    msrc.append(e)
                if msrc.index(e) not in ix:
                    ix.append(msrc.index(e))
            by.append(ix)
        s['marks'], s['msrc'], s['mby'] = [m[0] for m in marks], msrc, {'marks': by}
        if x.get('draft'):
            s['mdraft'] = 1
    for name, why in none.items():
        if name not in byname or not isinstance(why, str) or not why.strip():
            sbad(f'none {name}: a species of the tree and its reason')
    lost = sorted(n for n in byname if n not in sp and n not in none)
    if lost:
        sbad('species with neither marks nor a reason in none: ' + ', '.join(lost))
    if set(S) - used:
        sbad('sources never used: ' + ', '.join(sorted(set(S) - used)))
    return list(sp), list(none)


def main():
    with open(CUES, encoding='utf-8') as fh:
        cues = json.load(fh)
    with open(os.path.join(ROOT, 'seaslug.json'), encoding='utf-8') as fh:
        tree = json.load(fh)
    fams = {f['id']: dict(f) for f in tree['families']}
    gens = {g['id']: dict(g) for g in tree['genera']}
    done, none = apply(cues, fams, gens, tree['species'])
    by = {}
    for g in gens.values():
        by.setdefault(g['circle'], [0, 0])[1] += 1
        if g['name'] in done:
            by[g['circle']][0] += 1
    print(f"genera with marks: {len(done)} ({', '.join(f'circle {c}: {a} of {b}' for c, (a, b) in sorted(by.items()))}); "
          f"in none: {len(none)}; families with marks: {len(cues.get('families') or {})}; sources: {len(cues['src'])}; "
          f"genus pairs with a tell-apart line: {len(cues.get('apart') or {})}, without: {len(cues.get('apartNone') or {})}")


if __name__ == '__main__':
    try:
        main()
    except CueError as e:
        sys.exit(str(e))
