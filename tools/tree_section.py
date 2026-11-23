#!/usr/bin/env python3
"""The builds' generic `tree` section: each subject's classification, written once by its build, read by the admin's Tree tab.

Pierre, 2026-11-13 (Q339-Q341, docs/ROADMAP.md "The Tree tab"): the tab works for any subject, "each subject builds its
own tree from its own references". This file is the one place that builds them: the shared helpers (a classification as
nodes {id, name, rank, up, ...}, a reference table hung above a subject's leaves: the Python side of taxtree.js
`ttFromRef`) and, per data shape, the adapter that reads a subject's source file:

- a tree subject (the fish, the sea slugs: fish.json, seaslug.json, one shape): the key's groups, families, genera and
  species in the game (the Key view), WoRMS's ancestors above the same leaves (the WoRMS view, fish.json `ref`);
- a flat subject (the corals: data.json and data/names.json): the IMR lecture groups with their genera (Key), the family
  WoRMS gives each genus (WoRMS).

The section is a file of its own per subject, `data/<subject id>-tree.json` (admin only: players never download it, as
data/names.json and data/fish-cand.json), so nothing of data.json or fish.json changes:

    {"v": 1, "views": {"key": {"nodes": [...]}, "worms": {"nodes": [...], "problems": [...], "at": {...}}}}

A node is taxtree.js's own: {id, name, rank (any word, or none), up (its parent's id in that view, none for a root), ...what
the Tree's rows read (sci, it, unit, sid, imr, imrWith for the tree subjects; genus, grp, num, slate, star for the corals)}.
`problems`: what the build found hanging the leaves on the reference ({id, why}: a leaf with no reference, a parent the table
lacks); the admin adds what taxtree.js ttBuild finds (a duplicate id, a cycle). `at`: for each genus of the Key, the WoRMS
node a genus-level leaf of its own would hang under (the admin adds those leaves at load: they come from the candidates and
the game's photos, not from the sources).

The admin reads the section (admin.js fuTreeOf, fuWormsOf; admin-coraltree.js ctTrees) and never builds a classification
itself; tests/treesection.test.js checks the files against the shared JS functions (autosort.js treeUnitsOf, core.js
lectureGroup, taxtree.js ttFromRef) on the real data.

    python3 tools/tree_section.py                  write every subject's section
    python3 tools/tree_section.py fish seaslug     write these subjects'
    python3 tools/tree_section.py --check          exit 1 when a section is missing or is not what its sources give
                                                   (tests/treesection.test.js runs it: after any change of fish.json,
                                                   seaslug.json, data.json or data/names.json run the tool; build_fish.py,
                                                   build_seaslugs.py and taxonomy.py --names do it themselves)
    python3 tools/tree_section.py --print SUBJECT [SOURCE.json ...]
                                                   the section on stdout, from these files in the sources' place (tests)

A new subject adds its adapter to SUBJECTS below, nothing else (rule S1).
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import genera  # noqa: E402  (core.js BENTHIC, the slate)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = 1


def path_of(subject):
    return os.path.join(ROOT, 'data', subject + '-tree.json')


# ---- the shared helpers -------------------------------------------------------------------------------------------


def from_ref(leaves, ref, id_of, rank_of=lambda r: r):
    """taxtree.js ttFromRef: the nodes of a classification read from a reference table ({key: {name, rank, parent}}: WoRMS's
    AphiaIDs for a marine subject) hung above the subject's leaves. Each leaf keeps its own id and fields, under the parent
    of its reference; each ancestor becomes one node, once, {id: id_of(key), name, rank, up, ref: key}; nodes in the order the
    leaves meet them (a parent before its children). A leaf with no reference of its own but an `at` (the key of the node
    it sits under) hangs there. Returns (nodes, problems), the problems {id, why} as ttFromRef reports them."""
    R = ref or {}
    nodes, problems, made = [], [], set()

    def has(k):
        return k is not None and k != '' and str(k) in R

    def up(k, frm):
        if k is None or k == '':
            return None
        if not has(k):
            problems.append({'id': frm, 'why': 'parent not found: ' + str(k)})
            return None
        walk, x = [], k
        while has(x) and str(x) not in made:
            made.add(str(x))
            walk.append(x)
            x = R[str(x)].get('parent')
        for x in reversed(walk):
            r = R[str(x)]
            p = r.get('parent')
            n = {'id': id_of(x), 'name': r['name'], 'ref': str(x)}
            if r.get('rank') is not None and r.get('rank') != '':
                n['rank'] = rank_of(r['rank'])
            if has(p):
                n['up'] = id_of(p)
            elif p is not None and p != '':
                problems.append({'id': n['id'], 'why': 'parent not found: ' + str(p)})
            nodes.append(n)
        return id_of(k)

    for l in leaves or []:
        n = {k: v for k, v in l.items() if k not in ('up', 'at')}
        ref_of, at = l.get('ref'), l.get('at')
        if (ref_of is None or ref_of == '') and at is not None and at != '':
            p = up(at, l['id'])
            if p is not None:
                n['up'] = p
        elif ref_of is None or ref_of == '':
            problems.append({'id': l['id'], 'why': 'no reference'})
        elif not has(ref_of):
            problems.append({'id': l['id'], 'why': 'reference not found: ' + str(ref_of)})
        else:
            p = up(R[str(ref_of)].get('parent'), l['id'])
            if p is not None:
                n['up'] = p
        nodes.append(n)
    return nodes, problems


def section(key, worms, worms_problems=(), at=None):
    """The section's dict: the Key and WoRMS views. What is wrong in a view's nodes (a duplicate id, a parent not found, a
    cycle) is taxtree.js ttBuild's to report when the admin reads it, as it always was; tests/treesection.test.js holds the
    real data to none."""
    return {
        'v': V,
        'views': {
            'key': {'nodes': key},
            'worms': {'nodes': worms, 'problems': list(worms_problems), **({'at': at} if at else {})},
        },
    }


def _c(v):
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'))


def render(sec):
    """One node per line (two edits to different nodes merge cleanly), compact within a line, keys as built."""
    out = ['{"v":%d,"views":{' % sec['v']]
    names = list(sec['views'])
    for i, name in enumerate(names):
        view = sec['views'][name]
        out.append('%s:{"nodes":[' % _c(name))
        out.append(',\n'.join(_c(n) for n in view['nodes']))
        out.append(']')
        for k, v in view.items():
            if k != 'nodes':
                out.append(',%s:%s' % (_c(k), _c(v)))
        out.append('}' + (',' if i < len(names) - 1 else ''))
    out.append('}}\n')
    return '\n'.join(out)


# ---- a tree subject: the fish, the sea slugs (fish.json's shape) ---------------------------------------------------------

# The ranks of a tree subject's sheets, broadest first (core.js SUBJECTS sheets: the key of the node ids f:, g:, s:);
# tests/treesection.test.js keeps them equal to the subjects'.
RANKS = ('family', 'genus', 'species')


def _tag(x):
    if x is None or x is False:
        return ''
    if isinstance(x, str):
        return x
    if x is True:
        return 'IMR'
    return x.get('name') or 'IMR'


def units(F):
    """autosort.js treeUnitsOf as admin.js fishLoad lays it out: the families {id, name, sci, group, imr, imrWith, genera:
    [{id, name, imr, species}]} in the book's order (the key's group, else the taxonomic group the family sits in, then the
    file's order). A genus's species come from its genus list, else each species' genus, else the species name's first word."""
    sp = {x['id']: x for x in F.get('species') or []}
    GL = F.get('genera') or []
    if isinstance(GL, dict):
        GL = [{'id': k, **v} for k, v in GL.items()]
    G = {g['id']: g for g in GL}

    def g_of(s):
        x = sp.get(s)
        if x:
            return x.get('genus') or 'g:' + str(x.get('name') or '').split(' ')[0]
        return 'g:?'

    out = []
    for i, f in enumerate(F.get('families') or []):
        sids = [s for s in f.get('species') or [] if s in sp]
        gids = []
        for g in [*(f.get('genera') or []), *[g_of(s) for s in sids]]:
            if g not in gids:
                gids.append(g)
        gids = [g for g in gids if any(g_of(s) == g for s in sids) or (G.get(g) and G[g].get('species'))]
        genera_ = []
        for g in gids:
            gr = G.get(g) or {}
            names = gr.get('species') or [s for s in sids if g_of(s) == g]
            genera_.append(
                {'id': g, 'name': gr.get('name') or re.sub(r'^g:', '', g), 'imr': _tag(gr.get('imr')),
                 'species': [s for s in names if s in sids]}
            )
        sci = f.get('sci') or []
        out.append({
            'i': i, 'id': f['id'], 'name': f.get('name') or re.sub(r'^f:', '', str(f['id'])),
            'sci': sci if isinstance(sci, list) else [sci],
            'group': f.get('group'), 'tgroup': f.get('tgroup'),
            'imr': _tag(f.get('imr')), 'imrWith': f.get('imrWith') or '', 'genera': genera_,
        })
    out.sort(key=lambda u: (99 if u['group'] is None else u['group'], u['i']))
    # a family with no key group sits in the taxonomic group of its tree (seaslug.json taxa, each family's tgroup)
    for u in out:
        if u['group'] is None and u['tgroup'] is not None:
            u['group'] = u['tgroup']
    out.sort(key=lambda u: 99 if u['group'] is None else u['group'])
    return out


def tree_key(F, ranks=RANKS):
    """The Key view of a tree subject: each key group (k:<its number>, k:none for a family with none), its families, their
    genera and species in the game (not `out`), as the family's page shows them."""
    sp = {x['id']: x for x in F.get('species') or []}
    groups = {g['n']: g['title'] for g in ((F.get('key') or F.get('taxa') or {}).get('groups') or [])}
    nodes, seen = [], set()
    for u in units(F):
        k = 'k:none' if u['group'] is None else 'k:%s' % u['group']
        if k not in seen:
            seen.add(k)
            nodes.append({'id': k, 'name': 'No key group'} if u['group'] is None
                         else {'id': k, 'name': '%s · %s' % (u['group'], groups.get(u['group']) or ''), 'rank': 'group'})
        n = {'id': u['id'], 'name': u['name'], 'sci': ', '.join(u['sci']), 'rank': ranks[0], 'up': k, 'unit': True}
        if u['imr']:
            n['imr'] = u['imr']
        if u['imrWith']:
            n['imrWith'] = u['imrWith']
        nodes.append(n)
        for g in u['genera']:
            S = [s for s in g['species'] if s in sp and not sp[s].get('out')]
            if not S:
                continue
            n = {'id': g['id'], 'name': g['name'], 'it': True, 'rank': ranks[1], 'up': u['id']}
            if g['imr']:
                n['imr'] = g['imr']
            nodes.append(n)
            for s in S:
                c = sp[s].get('common')
                nodes.append({'id': s, 'name': c or sp[s]['name'], 'sci': sp[s]['name'] if c else '', 'it': not c,
                              'rank': ranks[2], 'up': g['id'], 'sid': s})
    return nodes


def _genus_ref(F, gid):
    """The WoRMS node of a genus of the tree: its own reference, else the WoRMS genus above the first of its species with a
    reference; '' for none."""
    G = {g['id']: g for g in F.get('genera') or []}
    sp = {x['id']: x for x in F.get('species') or []}
    R = F.get('ref') or {}
    g = G.get(gid) or {}
    if g.get('ref') is not None:
        return g['ref']
    for s in g.get('species') or []:
        x = (sp.get(s) or {}).get('ref')
        while x is not None and str(x) in R:
            if str(R[str(x)].get('rank')).lower() == 'genus':
                return x
            x = R[str(x)].get('parent')
    return ''


def tree_worms(F, key, ranks=RANKS):
    """The WoRMS view: fish.json `ref` (WoRMS's AphiaIDs, each {name, rank, parent}) above the Key's leaves in the Key's
    order, any depth, the rank's word in lower case; a taxon is w:<AphiaID>, a leaf keeps its own id. A leaf with no
    reference sits under its genus's WoRMS node. Returns (nodes, problems, at): at, for each genus of the Key, the node a
    genus-level leaf of its own would hang under."""
    sp = {x['id']: x for x in F.get('species') or []}
    leaves = []
    for n in key:
        if 'sid' not in n:
            continue
        s = sp[n['sid']]
        leaf = {'id': n['id'], 'name': n['name'], 'sci': n['sci'], 'rank': n['rank'], 'it': bool(n.get('it')), 'sid': n['sid']}
        if 'ref' in s:
            leaf['ref'] = s['ref']
        if s.get('ref') is None or s.get('ref') == '':
            leaf['at'] = _genus_ref(F, s.get('genus'))
        leaves.append(leaf)
    nodes, problems = from_ref(leaves, F.get('ref') or {}, lambda k: 'w:%s' % k, lambda r: str(r).lower())
    for n in nodes:
        if n.get('ref') and 'sid' not in n and n.get('rank') == 'genus':
            n['it'] = True
    ids = {n['id'] for n in nodes}
    at = {}
    for n in key:
        if n.get('rank') != ranks[1] or 'sid' in n or 'unit' in n:
            continue
        r = _genus_ref(F, n['id'])
        if r != '' and 'w:%s' % r in ids:
            at[n['id']] = 'w:%s' % r
    return nodes, problems, at


def build_tree_subject(F, ranks=RANKS):
    key = tree_key(F, ranks)
    worms, problems, at = tree_worms(F, key, ranks)
    return section(key, worms, problems, at)


# ---- a flat subject: the corals (data.json and data/names.json) ----------------------------------------------------------


def _slate(d):
    X = (d.get('x') or {}).get('gen') or {}
    benthic = genera.lists()[0]
    return [n for n in d['gen'] if n not in X] + [n for n in benthic if n in X]


def lecture_group(d, n):
    """core.js lectureGroup: the IMR lecture group the app shows a genus in (0 for none): its own, else, for a starred genus,
    the group most of its look-alikes are in (the first listed on a tie), rule L5."""
    G = d['gen']
    g = G.get(n)
    X = (d.get('x') or {}).get('gen') or {}
    if not g or n in X:
        return 0
    if g.get('ig'):
        return g['ig']
    L = [b for b in g.get('look') or [] if G.get(b) and G[b].get('ig')]
    c = {}
    for b in L:
        c[G[b]['ig']] = c.get(G[b]['ig'], 0) + 1
    best = G[L[0]]['ig'] if L else 0
    for b in L:
        if c[G[b]['ig']] > c[best]:
            best = G[b]['ig']
    return best or 0


def coral_leaves(d):
    """The genera of both views in the Key's order: the IMR lecture groups in their order, in each the numbered genera by
    their number, then the ★ genera in data.json's order; then the genera in no group, the slate's first (Millepora), then
    A-Z. d: data.json with its x genera merged into gen (d.x kept: the admin's copy, core.js xGen)."""
    G = d['gen']
    X = (d.get('x') or {}).get('gen') or {}
    slate = set(_slate(d))
    names = list(G)
    grp = {n: lecture_group(d, n) or 0 for n in names}
    order = {n: (G[n]['n'] if G[n].get('n') else 1000 + i) for i, n in enumerate(names)}
    none = sorted([n for n in names if not grp[n]], key=lambda n: (n not in slate, n.casefold()))
    rows = []
    for x in d.get('imrg') or []:
        rows += [(n, x) for n in sorted([n for n in names if grp[n] == x['n']], key=lambda n: order[n])]
    rows += [(n, None) for n in none]
    return [{'id': n, 'name': n, 'it': True, 'rank': 'genus', 'genus': n, 'grp': x['n'] if x else 0, 'num': G[n].get('n') or 0,
             'slate': n in slate, 'star': n in slate and not G[n].get('n') and n not in X} for n, x in rows]


def coral_key(d):
    """The Key's nodes: each IMR lecture group that holds a genus (k:<its number>, rank group, its lecture line as its name),
    k:none (no rank) for the genera in no group, and the genera under them."""
    nodes, seen = [], set()
    for l in coral_leaves(d):
        k = 'k:%s' % l['grp'] if l['grp'] else 'k:none'
        if k not in seen:
            seen.add(k)
            x = next((y for y in d.get('imrg') or [] if y['n'] == l['grp']), None)
            nodes.append({'id': k, 'name': '%s · %s' % (x['n'], x['t']), 'rank': 'group'} if x else {'id': k, 'name': 'No IMR group'})
        nodes.append({**l, 'up': k})
    return nodes


def coral_worms(d, W):
    """The family WoRMS files each genus under (data/names.json coral worms {genus: {id, fam}}, which tools/taxonomy.py
    writes): a family is wf:<name> (the repo holds no family AphiaID), a genus its own id; a genus the extract lacks is a
    problem, never placed."""
    R = {}
    for n, w in (W or {}).items():
        if not w or not w.get('id') or not w.get('fam'):
            continue
        R['wf:' + w['fam']] = {'name': w['fam'], 'rank': 'family', 'parent': None}
        R[str(w['id'])] = {'name': n, 'rank': 'genus', 'parent': 'wf:' + w['fam']}
    leaves = [{**l, 'ref': str(W[l['id']]['id']) if W and W.get(l['id']) and W[l['id']].get('id') else None} for l in coral_leaves(d)]
    return from_ref(leaves, R, lambda k: str(k))


def build_coral(d, names):
    d = {**d, 'gen': {**d['gen'], **((d.get('x') or {}).get('gen') or {})}}
    key = coral_key(d)
    worms, problems = coral_worms(d, ((names or {}).get('coral') or {}).get('worms'))
    return section(key, worms, problems)


# ---- the subjects --------------------------------------------------------------------------------------------------------

# Each subject: the source files its tree is built from (relative to the repository), and the adapter that builds it from
# them, parsed, in that order.
SUBJECTS = {
    'fish': (('fish.json',), build_tree_subject),
    'seaslug': (('seaslug.json',), build_tree_subject),
    'coral': (('data.json', 'data/names.json'), build_coral),
}


def build(subject, paths=None):
    """The subject's section (a dict) from its sources, or from the files `paths` in their place (tests: made-up data)."""
    rels, adapter = SUBJECTS[subject]
    paths = paths or [os.path.join(ROOT, r) for r in rels]
    return adapter(*[json.load(open(p, encoding='utf-8')) for p in paths])


def write(subject):
    """Write the subject's section from its sources; True when the file changed."""
    text = render(build(subject))
    p = path_of(subject)
    old = open(p, encoding='utf-8').read() if os.path.exists(p) else None
    if old != text:
        with open(p, 'w', encoding='utf-8') as f:
            f.write(text)
    return old != text


def stale(subject):
    """Why the subject's section is not what its sources give (None when it is)."""
    p = path_of(subject)
    if not os.path.exists(p):
        return 'missing'
    return None if open(p, encoding='utf-8').read() == render(build(subject)) else 'not what its sources give'


def main(argv):
    if argv[:1] == ['--print']:  # --print SUBJECT [SOURCE.json ...]: the section on stdout, from these files (tests)
        if len(argv) < 2 or argv[1] not in SUBJECTS:
            sys.exit('tree_section: --print needs a subject (%s)' % ', '.join(SUBJECTS))
        sys.stdout.write(render(build(argv[1], argv[2:] or None)))
        return 0
    check = '--check' in argv
    subjects = [a for a in argv if not a.startswith('-')] or list(SUBJECTS)
    unknown = [s for s in subjects if s not in SUBJECTS]
    if unknown:
        sys.exit('tree_section: unknown subject %s (known: %s)' % (', '.join(unknown), ', '.join(SUBJECTS)))
    if check:
        bad = [(s, stale(s)) for s in subjects if stale(s)]
        for s, why in bad:
            print('data/%s-tree.json: %s; run python3 tools/tree_section.py %s' % (s, why, s), file=sys.stderr)
        return 1 if bad else 0
    for s in subjects:
        print('data/%s-tree.json: %s' % (s, 'written' if write(s) else 'unchanged'))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
