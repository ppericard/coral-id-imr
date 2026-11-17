#!/usr/bin/env python3
"""The sea slugs' sourced ID marks (study docs/reviews/2026-11-15-nudibranch-mode-study.md §9, step 7; Pierre, 2026-11-17:
complete what is missing for the nudibranchs): checks tools/seaslug_cues.json and lays its marks on the tree that
tools/seaslug_game.py builds, as fish.json's genus marks (tools/build_fish.py genus_marks) so the fish engine shows them
unchanged: on a genus or a family, marks (1 to 3 visible features), msrc (each source once, {t, u}: the source's t, then
where in it) and mby ({marks: [[msrc indexes] per mark]}).

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
KEYS = {'about', 'src', 'families', 'genera', 'none'}
LONGEST = 80  # a mark's length at most, as a fish genus mark's (rule C3: short and simple)


class CueError(SystemExit):
    pass


def bad(why):
    raise CueError('tools/seaslug_cues.json: ' + why)


def marks_of(name, x, src, used, species=None, genus=None):
    """{marks, msrc, mby} of one genus or family entry x. species: the game species' names of a genus (rule C6: a species
    named in a mark, as "G. kuniei", is one of them), None for a family (no species may be named there)."""
    if not isinstance(x, dict) or set(x) - {'marks'}:
        bad(f'{name}: the key marks only')
    marks = x.get('marks') or []
    if not marks or len(marks) > 3:
        bad(f'{name}: 1 to 3 marks')
    eps = {s.split()[1] for s in species or [] if len(s.split()) > 1}
    msrc, by = [], []
    for m in marks:
        if not (isinstance(m, list) and len(m) == 2):
            bad(f'{name}: a mark is [words, sources]')
        text, rr = m
        if not isinstance(text, str) or not text.strip() or len(text) > LONGEST or text != ' '.join(text.split()):
            bad(f"{name}: '{text}': a line of at most {LONGEST} characters")
        if re.search(r'\d', text):
            bad(f"{name}: '{text}': a mark with a number (a count is never a photo cue)")
        for ini, ep in re.findall(r'\b([A-Z])\. ([a-z]+)', text):
            if genus is None or ini != genus[0] or ep not in eps:
                bad(f"{name}: '{ini}. {ep}' is not one of its game species (rule C6)")
        if not rr:
            bad(f"{name}: '{text}' has no source")
        ix = []
        for q in rr:
            if not (isinstance(q, list) and len(q) == 2 and q[0] in src and isinstance(q[1], str) and q[1].strip()):
                bad(f"{name}: '{text}': a source is [a key of src, where in it]")
            s = src[q[0]]
            if not s.get('t') or not str(s.get('u', '')).startswith('https://'):
                bad(f'src {q[0]}: t and an https u')
            used.add(q[0])
            e = {'t': f"{s['t']}, {q[1]}", 'u': s['u']}
            if e not in msrc:
                msrc.append(e)
            ix.append(msrc.index(e))
        by.append(ix)
    return {'marks': [m[0] for m in marks], 'msrc': msrc, 'mby': {'marks': by}}


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
    if set(src) - used:
        bad('sources never used: ' + ', '.join(sorted(set(src) - used)))
    return done, list(none)


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
          f"in none: {len(none)}; families with marks: {len(cues.get('families') or {})}; sources: {len(cues['src'])}")


if __name__ == '__main__':
    try:
        main()
    except CueError as e:
        sys.exit(str(e))
