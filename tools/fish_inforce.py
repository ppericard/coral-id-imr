#!/usr/bin/env python3
"""The fish circles in force, for the agents' photo tools (design note docs/reviews/2026-11-14-sheet-overlay-design.md
v2, section 1 and step 3; Pierre, 2026-11-15, Q359, Q366).

fish.json holds the base: the sources and the IMR instance's layer, resolved at build. The instance's content editor
may move a family to another circle, or to none, in curation.json (fish.content nodes {family id: {circle: {v}}}; only
the admin's draft and Publish write it, rule A1: read here, never written). The photo tools that read the circles
(tools/fetch_fish.py, fetch_fishbase.py, fish_judge.py, fish_refs.py, fish_game.py) read them through in_force, so a
family the editor moves into circle 1 gets circle 1's photo work, and one he takes out of the game gets none. The tools
that write data from fish.json (the build, the names, the taxonomy, FishBase's snapshot) keep reading the base.

in_force is core.js fishStructure's circle part, as core.js structApply hands it the entries (structEntries: a family
of the base, a value among CIRCLES or null, under the id as stored), checked against it on fixture edits by
tests/structure.test.js:
- a family's circle onto the family, its genera, its species and each teaching node holding its species (its families'
  smallest circle in force), start kept to the teaching nodes in circle 1;
- in no circle (null): the family and its genera left out, its species out ('family in no circle', no circle, family
  or genus), a teaching node left with no family in a circle with none, and every look-alike line to it dropped.
The look-alike pairs the editor adds or withdraws are not read here: no photo tool reads them.

    from fish_inforce import in_force    # fish = in_force(fish, curation)
"""
import copy

CIRCLES = (1, 2, 3)  # core.js SUBJECTS fish structure circle of
SLOT = 'circle'  # core.js CIRCLE_SLOT


def circle_edits(fish, cur):
    """{family id: circle or None} of the editor's circle entries that apply and change the base."""
    base = {f['id']: f.get('circle') for f in fish.get('families') or []}
    nodes = (((cur or {}).get('fish') or {}).get('content') or {}).get('nodes') or {}
    out = {}
    for fid in sorted(nodes):
        m = nodes[fid]
        if not isinstance(m, dict) or SLOT not in m or fid not in base:
            continue
        e = m[SLOT]
        if not isinstance(e, dict) or 'v' not in e:
            continue
        v = e['v']
        if not (v is None or (type(v) is int and v in CIRCLES)):
            continue
        if v != base[fid]:
            out[fid] = v
    return out


def in_force(fish, cur):
    """fish.json with the content editor's circles in force (a copy; fish itself when none changes anything)."""
    C = circle_edits(fish, cur)
    if not C:
        return fish
    out = copy.deepcopy(fish)
    base = {f['id']: f.get('circle') for f in fish.get('families') or []}
    now = lambda fid: C[fid] if fid in C else base.get(fid)  # noqa: E731
    gone = {fid for fid in base if now(fid) is None}
    fams = []
    for f in out.get('families') or []:
        if f['id'] in gone:
            continue
        if f['id'] in C:
            f['circle'] = C[f['id']]
        if gone and isinstance(f.get('look'), list):
            look = [y for y in f['look'] if not (isinstance(y, list) and y and y[0] in gone)]
            if len(look) != len(f['look']):
                f['look'] = look
        fams.append(f)
    out['families'] = fams
    out['genera'] = [dict(g, circle=now(g['family'])) if g.get('family') in C else g
                     for g in out.get('genera') or [] if g.get('family') not in gone]
    fam_of = {s['id']: s['family'] for s in fish.get('species') or [] if s.get('family')}
    for s in out.get('species') or []:
        fid = s.get('family')
        if fid not in C:
            continue
        if fid in gone:
            for k in ('circle', 'family', 'genus', 'cmi'):
                s.pop(k, None)
            s['out'] = 'family in no circle'
        else:
            s['circle'] = C[fid]
    for t in out.get('teach') or []:
        fs = {fam_of[i] for i in t.get('species') or [] if i in fam_of}
        if not fs & set(C):
            continue
        cs = [now(fid) for fid in fs if now(fid) is not None]
        if cs:
            t['circle'] = min(cs)
        else:
            t.pop('circle', None)
    if isinstance(fish.get('start'), list):
        tc = {t['id']: t.get('circle') for t in out.get('teach') or []}
        out['start'] = [i for i in fish['start'] if tc.get(i) == 1]
    return out
