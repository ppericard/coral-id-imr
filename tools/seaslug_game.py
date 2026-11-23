#!/usr/bin/env python3
"""The sea-slug subject's game data (study docs/reviews/2026-11-15-nudibranch-mode-study.md §9, steps 5 and 6): writes
seaslug.json, the subject's tree, and seaslug-game.json, its photos in play, which the app reads (core.js SUBJECTS
seaslug, app.js UNITS seaslug) as it reads fish.json and fish-game.json (core.js fishGen, app.js fishGenera).

Inputs, all in the repository (no network but --r2's downloads):
  - tools/seaslugs.json (tools/build_seaslugs.py): the species confirmed in the Philippines, their circles (Q377: circle
    1, the 21 stars and the 24 most common other species; circles 2 and 3, the next 60 and 100 by commonness), their
    WoRMS names, commonness, presence and the photo target (photoTarget: start 6, game cap 12, +5 for a documented
    juvenile form; Pierre, 2026-11-15, Q377);
  - data/seaslug-cand.json (tools/fetch_seaslugs.py): the candidate photos, one per observation, by iNaturalist taxon id;
  - data/suggest.json "seaslug" (tools/judging_fish.py --subject seaslug, from judging/seaslug/*.json): the judgements on
    judging/SEASLUG.md's rubric, the caps applied;
  - seaslug-game.json as committed: which photos are already on R2 (their ar, cr, iv), kept as they are;
  - tools/seaslug_groups.json (hand-kept from WoRMS's classification): the taxonomic groups the families sit in, in
    order (Pierre, 2026-11-16: the true nudibranchs, Doridina then Cladobranchia, then the other sea slugs by order);
  - tools/seaslug_names.json (tools/seaslug_names.py): the English common names and nicknames, each with its sources;
  - tools/seaslug_lookalikes_cand.json (tools/seaslug_lookalikes.py): the look-alike survey's literature sets and genus
    pairs, of which the genus look-alikes (genus_looks; Pierre, 2026-11-17, Q390 D);
  - tools/seaslug_cues.json (checked by tools/seaslug_cues.py): the sourced ID marks of genera and families;
  - tools/seaslug_species_marks.json (checked by tools/seaslug_cues.py species_apply): the species' own ID marks, drafts;
  - tools/seaslug_worms.json (tools/seaslug_worms.py, from WoRMS): the reference taxonomy, AphiaID -> {name, rank,
    parent} from the class down, and each genus's WoRMS AphiaID.

seaslug.json, in fish.json's shape so the fish engine reads it unchanged (core.js fishGen, fishTree; app.js fishGenera):
  - families {id f:<family>, name (the scientific name: Q369 (d), scientific names only), circle (its best species'
    circle, as a fish family's), species, genera, look (none: the look-alikes are the genera's, below), cues (none: no IMR content,
    study §8), tgroup (its taxonomic group's number in taxa)}, in the order of their first species (by circle, then by
    commonness rank);
  - taxa {cite, short, groups [{n, title}]}: the taxonomic groups of tools/seaslug_groups.json, which the Learn page
    shows the families under (learn.js viewList); a family in no group fails the build, naming it;
  - genera {id g:<genus>, name, family, circle (its best species'), species, ref (the AphiaID of the WoRMS genus of that
    name, tools/seaslug_worms.json genera), look, dlook, lsrc}: look, the other genera
    a specialist source names as its look-alikes (declared: they stay look-alikes whatever the players answer), dlook,
    those only iNaturalist's identifications show (data look-alikes: the players' answers can drop them), lsrc each
    one's sources [{t, u}] (genus_looks; Pierre, 2026-11-17, Q390 D); apart and apsrc, the declared pairs' tell-apart
    lines and their sources by the other genus's id (tools/seaslug_cues.json apart, seaslug_cues.apart_of), on a genus
    some pair line describes the other genus for;
  - species {id s<iNaturalist taxon id>, name (iNaturalist's, which WoRMS accepts), now (the WoRMS accepted name when it
    differs), ref (the WoRMS AphiaID), inat, circle, family, genus, r (the commonness rank over every group,
    tools/seaslugs.json rank), group (the iNaturalist order: Nudibranchia, Sacoglossa...), star (the stars set, Q369 (c),
    Q377: never the opening order), present {area: distinct Research Grade observers in the subject's area, the
    Philippines (Q369 (b)), what the game's commonness reads (core.js fishGen cm); near, nearU, nearN: rule C8's near
    test and the observers and observations within the instance's radius of Dauin, what the default covers read (app.js
    nearSeen)}, look (the decided look-alike pairs, tools/seaslugs.json lookalikes: the two Spanish dancers, Q377, and
    the two sourced pairs of #1164, Q390 D; docs/decisions/2026-11-21-seaslug-species-pairs.md)};
  - on a family, genus or species some source names in English: en [{n, src, nick, web}], its English common names and
    nicknames, and ensrc {inat, worms, wiki}, where its sources hold it (tools/seaslug_names.json, names_of); the tree's
    own ensrc says when each source was read. Information only (Pierre, 2026-11-17: shown wherever names are shown;
    Q369 (d) stands: never a choice, no common-name branch).
  - on a genus or family tools/seaslug_cues.json gives ID marks: marks, msrc, mby, as a fish genus's (tools/seaslug_cues.py
    apply; study §9 step 7): shown on its sheets and, a genus's, in the quiz feedback; on a species
    tools/seaslug_species_marks.json gives ID marks (agent drafts): marks, msrc, mby and mdraft, as a fish species'
    (seaslug_cues.species_apply), shown on its sheet only.
  - the species of CIRCLES (1, 2 and 3: the circles whose candidates were fetched and judged; a species not judged yet
    is in the tree with no photo, and its photos come in at the next build once its judgements are in data/suggest.json);
  - key null (rule S3: a region with no key has no such rule; no sea-slug key is read yet), no teaching entries, no IMR
    tag;
  - ref {AphiaID: {name, rank, parent}}: the reference taxonomy (WoRMS, as fish.json ref; Pierre, 2026-11-13, Q340: the
    admin's Photos › Tree › Key | WoRMS; 2026-11-17, "on garde WoRMS"), every node from the class (Gastropoda) down to
    the species of the tree and its genera's WoRMS genera, parent null at the root (worms_ref); a species or a genus
    tools/seaslug_worms.json lacks fails the build, naming it (run tools/seaslug_worms.py).

seaslug-game.json, in fish-game.json's record shape (core.js fishPhotos, fishGameRead) under each family id, one photo a
line:
  - the photos in play: a candidate judged sure (fish_game.py cand_sure's rule on the sea slugs' rubric: no unsure
    field, keep best or alt, never dup, never an egg mass, valid tags and ease, a count an automatic route may put in
    play, never out of the water), at most photoTarget.gameCap a species, the easiest first, plus up to
    photoTarget.perJuvenileForm juvenile photos for a species with a documented juvenile form (photoTarget.juvenile);
    a species with fewer than photoTarget.start such photos has none in play (it cannot be played yet). The same rule
    for every circle. Which photos are in play and their records are the fish's (tools/fish_game.py in_play and record,
    with the sea slugs' part of the curation, their sure rule and their lists): never the same photo twice (pid), the
    species' lists read first, by circle and rank, then the genus-level ones, before the cap and start apply (a photo
    in a species' list and a genus-level one plays for the species, or nowhere when that species does not play);
  - Pierre's curation (curation.json seaslug, the sea slugs' part: core.js SUBJECTS seaslug admin.cur; written by the
    admin's Photos › Tree and a report's photo tools, never here: rule A1), as a fish photo follows the fish part
    (tools/fish_game.py in_play, record): a photo he removed (seen), excluded (exclude, or the top-level exclude, by
    name or photo id) or moved with Not this (out) is not in play, nor an automatic add of his he undid, and the next
    sure photo takes its place under the cap; his adds (add {photo: species or genus id}, core.js fishOn) are in play
    whatever their judgement, never trimmed by the cap, named after the species he moved them to; his ease and tags are
    the record's (fish_game.py mine_tags), and a count he set to other species one could take for its subject (k) or
    unclear keeps the photo out (rule P3); his crop (crop, his whole-photo [0, 0, 1, 1] included) replaces the judge's,
    and his rotation (rot) turns the files, both applied when the photo is downloaded for R2 (ro on the record);
  - each record {f, o, src, a, lic, t, sp, gl, loc, own, e, jt, ph, bb, auto: "cand"} (no auto on Pierre's adds), ph
    a fish record's phase (tools/fish_game.py phase: Pierre's phase choice, else the judge's juvenile flag, else the
    source's life stage, st); the cap counts a juvenile by the juvenile flag of its tags (juv); and then either
      r: 1, the photo read from iNaturalist (app.js img), until a run with --r2 has put it on R2; or
      ar, cr, ro, iv and no r: its four files on R2, as a fish game photo (study §9 step 6; tools/fish_game.py
      download: Pierre's crop, else the judge's proposed one, and his rotation applied, tools/photos.py's four sizes),
      read from R2 by the app (app.js img) with the online original (src) as its fallback (core.js photoAway).
    A photo already on R2 (the committed file) keeps its files; one whose crop or rotation changed is listed with its
    old files until a run with --r2 makes them again (its rewrite count iv bumped). A photo that fails to download stays remote.
  - the tile (Pierre, 2026-11-19, Q437: every game mode for every subject; Find the X, one name and four photos): a photo
    whose judgement carries the animal's box (data/suggest.json "seaslug" bb, as fish_game.py box_of reads it) and whose tags
    pass the sea slugs' tile rule (tile_tags here: the fish's plus the dorsal view) carries bb, and its download (or, on R2 already, a run for the
    tile alone) cuts {f}-x.webp with the fish's own cut (fish_game.py tile_crop, tile_write: nothing is copied), the
    record then carrying xc (the tile's square) or xn (why not). A judging file may carry bb (judging/SEASLUG.md "The
    animal's box"; the bulk box pass of 2026-11-20 is imported); a record with a box has its tile (xc) from the next --r2
    run, and the app's Find the X (app.js UNITS tiles) is drawn for the sea slugs as the tiles exist.

The R2 step is off in the Candidate photos workflow until Pierre's go (.github/workflows/approved-photos.yml
SEASLUG_R2): the workflow builds offline (every new photo remote, r: 1) while it is off.

  python3 tools/seaslug_game.py                  build offline (no download) and write both files
  python3 tools/seaslug_game.py --check          build offline and exit 1 when a committed file differs (CI: the judged
                                                 files and the list move, the game data must follow;
                                                 tests/seaslug-game.test.js), but for the species not in
                                                 seaslug-game.json yet whose judgements came since: the workflow builds
                                                 them in after the merge (check)
  python3 tools/seaslug_game.py --plan           print what --r2 would download and the expected R2 volume, by circle;
                                                 writes nothing, downloads nothing
  python3 tools/seaslug_game.py --r2 [--out DIR] [--max N]
                                                 download the photos in play not on R2 yet into DIR (default r2-upload/,
                                                 gitignored; the workflow uploads it with tools/r2_sync.sh DIR before it
                                                 commits) and write both files
"""
import argparse
import concurrent.futures as cf
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from presence import label_confirmed  # noqa: E402  the label rule beside C8
import seaslug_cues  # noqa: E402  the sourced ID marks (study §9 step 7)
import tree_section  # noqa: E402  the subject's tree section (the admin's Tree tab), written with the tree
LIST = os.path.join(ROOT, 'tools', 'seaslugs.json')
GROUPS = os.path.join(ROOT, 'tools', 'seaslug_groups.json')
CAND = os.path.join(ROOT, 'data/seaslug-cand.json')
SUGGEST = os.path.join(ROOT, 'data/suggest.json')
TREE_OUT = os.path.join(ROOT, 'seaslug.json')
GAME_OUT = os.path.join(ROOT, 'seaslug-game.json')
V = 1
# The sea slugs' part of curation.json (core.js SUBJECTS seaslug admin.cur): the admin's choices.
CUR = 'seaslug'
# The circles in the game: those whose candidates were fetched and judged. Circle 4, the rest, has no candidates.
CIRCLES = (1, 2, 3)
# The sea slugs' rubric code without its ease digit, as data/suggest.json keeps it (tools/fish_judge.py RUBRICS "seaslug").
TAGS = re.compile(r'^[pohtdv][01][gd][0-3][smb][lms][1sokx][jcawf]*$')
# The counts an automatic route may put in play (core.js TREE_COUNT.play) are the fish's (tools/fish_game.py PLAY_COUNT): one
# animal, several of its kind, another species that cannot be taken for it (rule P3).
# At most this many downloads a run (--max; the fish's FISH_MAX), circle 1 first.
MAX = int(os.environ.get('SEASLUG_MAX', '5000'))


def load(p, default=None):
    if default is not None and not os.path.exists(p):
        return default
    with open(p, encoding='utf-8') as fh:
        return json.load(fh)


def genus_looks(cand, genera):
    """The genus look-alikes from the survey's candidates cand (tools/seaslug_lookalikes_cand.json; Pierre, 2026-11-17,
    Q390 D) between the genera of the tree, {genus id: {look, dlook, lsrc}}, both ways:
      - look (declared): two genera whose species a literature set names together (the Sea Slug Forum, Nudi Pixel's
        look-alike index, the papers: tools/seaslug_lookalikes_source.json), its members those rule C6 keeps (the set's
        members, its outside left out); each source {t: the source and the two genera's species it names, u: its page};
      - dlook (data): a genus pair of iNaturalist's identifications (the file's listed pairs, its floor) across two
        families that no set names and with a species pair of the subject under it (not genusOnly: a pair the photos the
        game shows were never mixed up on, a rename or a slip at the genus rank, says nothing of their look); its source
        the counts. A pair inside one family is left out: the family's genera are already each other's look-alikes
        (core.js fishGenUnits).
    The candidates' species pairs are not taken: the species pairs are the decided ones (tools/seaslugs.json lookalikes,
    each species' look; Q377, Q390 D)."""
    gid = {g['name']: g['id'] for g in genera}
    fam = {g['name']: g['family'] for g in genera}
    decl, data = {}, {}
    for s in (cand or {}).get('groups') or []:
        if s.get('kind') != 'literature':
            continue
        by = {}
        for m in s.get('members') or []:
            if m.split()[0] in gid:
                by.setdefault(m.split()[0], []).append(m)
        src = str(s.get('source') or '')
        u = re.search(r'https?://[^\s,)]+', src)
        title = src.split(', http')[0].strip()
        G = sorted(by)
        for i, a in enumerate(G):
            for b in G[i + 1:]:
                decl.setdefault((a, b), []).append({'t': title + ': ' + ', '.join(by[a] + by[b]),
                                                    **({'u': u.group(0)} if u else {})})
    for p in (cand or {}).get('pairs') or []:
        a, b = sorted((p.get('a') or '', p.get('b') or ''))
        if p.get('rank') != 'genus' or p.get('genusOnly') or a not in gid or b not in gid or fam[a] == fam[b] \
                or (a, b) in decl:
            continue
        n = lambda k: (p.get(k) or {}).get('n') or 0
        data[(a, b)] = [{'t': f'iNaturalist identifications, one genus taken for the other: {n("ph")} in the '
                              f'Philippines, {n("world")} worldwide ({cand.get("pulled")})'}]
    out = {}
    for kind, D in (('look', decl), ('dlook', data)):
        for (a, b), S in sorted(D.items()):
            for x, y in ((a, b), (b, a)):
                o = out.setdefault(gid[x], {})
                o.setdefault(kind, []).append(gid[y])
                o.setdefault('lsrc', {})[gid[y]] = S
    return out


def sure(j):
    """A judgement that puts its candidate in play by itself (tools/fish_game.py cand_sure, on the sea slugs' rubric): no
    unsure field but the box, whose doubt only withholds the photo's tile (fish_game.unsure; box_of)."""
    import fish_game as FG
    return not (j or {}).get('egg') and FG.cand_sure(j, TAGS, 'best')


def juv(jt):
    """A juvenile for the photo target's cap (kept): the juvenile flag of the tags in force."""
    return 'j' in (jt or '')[7:]


def crop(j):
    """The judge's proposed crop of a sure judgement ([l, t, r, b] fractions of the original), None for the whole photo:
    applied when the photo is downloaded for R2 (judging/SEASLUG.md "Candidates"), as a fish candidate's (tools/fish_game.py
    plan)."""
    c = (j or {}).get('c')
    return list(c) if isinstance(c, list) and len(c) == 4 and list(c) != [0, 0, 1, 1] else None


def tile_tags(jt):
    """The sea slugs' tile rule: the fish's (tools/fish_game.py tile_tags) plus the dorsal view, the sea slugs' commonest good
    one (a dorsal photo is read as a profile one: integrator's call, easy to correct; 2,132 of 3,014 photos pass)."""
    import fish_game as FG
    jt = jt or ''
    return FG.tile_tags('p' + jt[1:] if jt[:1] == 'd' else jt)


def on_r2(o):
    """A committed record whose four files are on R2: downloaded (no r) and measured (ar)."""
    return bool(o) and not o.get('r') and bool(o.get('ar'))


def stale(o, c, ro=0):
    """Whether a photo's files on R2 lack its crop c or its rotation ro (Pierre's, curation.json seaslug rot: tools/photos.py
    stale, the fish's rule)."""
    import photos
    return photos.stale(o, c, ro)


def part(cur):
    """Pierre's part of curation.json for the sea slugs (core.js SUBJECTS seaslug admin.cur), {} without one."""
    P = (cur or {}).get(CUR)
    return P if isinstance(P, dict) else {}


def crop_mine(F, f):
    """(set, crop): whether Pierre cropped photo f (his full-photo [0, 0, 1, 1] included: the judge's crop then never
    applies, as tools/fish_game.py plan reads his), and the crop the files are made with (None for the whole photo)."""
    import fish_game as FG
    c = (F.get('crop') or {}).get(f)
    if not (isinstance(c, list) and len(c) == 4):
        return False, None
    return True, FG.crop_of(F, f)


def taxa(groups, fams):
    """The tree's taxonomic groups (tools/seaslug_groups.json; Pierre, 2026-11-16: the families in logical taxonomic
    groups, the true nudibranchs apart from the other sea slugs): {cite, short, groups [{n, title}]} and each family's
    group number {family name: n}, in the file's order, for the families of the tree fams. A family of the tree in no
    group, or in two, fails the build, naming it (as the fish's key, rule S3: a published classification, never ours)."""
    if not groups:
        return None, {}
    of, out = {}, []
    for i, g in enumerate(groups['groups'], 1):
        out.append({'n': i, 'title': g['title']})
        for f in g['families']:
            if f in of:
                raise SystemExit(f'seaslug_game: family {f} in two groups of tools/seaslug_groups.json')
            of[f] = i
    miss = [f for f in fams if f not in of]
    if miss:
        raise SystemExit('seaslug_game: no group in tools/seaslug_groups.json for ' + ', '.join(miss))
    return {'cite': groups['cite'], 'short': groups['short'], 'groups': out}, of


def names_of(N):
    """{(rank, name): {en, ensrc}} from tools/seaslug_names.json N (tools/seaslug_names.py): each taxon's English common
    names and nicknames, [{n, src, nick, web}] (Pierre, 2026-11-17: information wherever names are shown, never a choice:
    Q369 (d) stands), and where its sources hold it, ensrc {inat: taxon id, worms: AphiaID, wiki: article title}; none
    for a taxon no source names."""
    out = {}
    for t in (N or {}).get('taxa') or []:
        if not t.get('names'):
            continue
        W = (t.get('raw') or {}).get('wiki') or {}
        src = {k: v for k, v in (('inat', t.get('inat')), ('worms', t.get('worms')),
                                 ('wiki', W.get('title') if W.get('kind') in ('own', 'named') else None)) if v}
        out[(t['rank'], t['name'])] = {'en': t['names'], 'ensrc': src}
    return out


def worms_ref(W, species, genera):
    """seaslug.json ref from tools/seaslug_worms.json W: {AphiaID: {name, rank, parent}} for every node above (and at)
    the species' refs and the genera's, in AphiaID order (as fish.json ref). A ref W lacks fails the build, naming it."""
    N, need, miss = (W or {}).get('nodes') or {}, set(), []
    for what, aid in [(s['name'], s.get('ref')) for s in species] + [(g['name'], g.get('ref')) for g in genera]:
        if aid is None:
            continue
        if str(aid) not in N:
            miss.append(f'{what} ({aid})')
        a = str(aid)
        while a is not None and a in N and a not in need:
            need.add(a)
            a = None if N[a]['parent'] is None else str(N[a]['parent'])
    if miss:
        raise SystemExit('seaslug_game: not in tools/seaslug_worms.json (run python3 tools/seaslug_worms.py): ' + ', '.join(miss))
    return {k: {'name': N[k]['name'], 'rank': N[k]['rank'], 'parent': N[k]['parent']} for k in sorted(need, key=int)}


def build(L, cand, sug, prev=None, groups=None, inf=None, names=None, looks=None, cur=None, cues=None, worms=None,
          spmarks=None):
    """(seaslug.json, seaslug-game.json, todo) from the list L, the candidates, the judgements and the committed
    seaslug-game.json prev: todo [(record, crop, iv, rotation)], the photos in play whose files R2 lacks or holds with
    another crop or rotation, circle 1 first (the records are in the game file: a run with --r2 completes them as it downloads). groups:
    tools/seaslug_groups.json, each family's taxonomic group (taxa), none without it. inf: tools/seaslug_informal.json,
    the species with no name yet. names: tools/seaslug_names.json, the English names each family, genus and species
    carries (en, ensrc: names_of), none without it (a species with no name yet has none). looks:
    tools/seaslug_lookalikes_cand.json, the genus look-alikes (genus_looks), none without it. cur: curation.json, whose
    sea-slug part (part: Pierre's admin choices) the photos in play follow, as a fish photo follows the fish part
    (tools/fish_game.py in_play, record): what he removed, excluded or moved leaves, his adds enter, his crop, rotation,
    ease and tags are the record's. cues: tools/seaslug_cues.json, the sourced ID marks (seaslug_cues.apply), none
    without it. worms: tools/seaslug_worms.json, the reference taxonomy (ref, each genus's ref: worms_ref), none without
    it. spmarks: tools/seaslug_species_marks.json, the species' sourced ID marks (seaslug_cues.species_apply), none
    without it."""
    import fish_game as FG
    F = part(cur)
    V_ = names_of(names)
    vn = lambda rank, name: V_.get((rank, name)) or {}
    T = L.get('photoTarget') or {}
    start, cap, plus = T['start'], T['gameCap'], T.get('perJuvenileForm', 0)
    documented = set(T.get('juvenile') or {})
    sp = sorted((s for s in L['species'] if s.get('circle') in CIRCLES), key=lambda s: (s['circle'], s['rank']))
    sid = {s['name']: 's%d' % s['inat'] for s in sp}
    pairs = [p['pair'] for p in L.get('lookalikes') or [] if all(n in sid for n in p['pair'])]
    fams, gens, species = {}, {}, []
    for s in sp:
        fid, gid, i, c = 'f:' + s['family'], 'g:' + s['genus'], sid[s['name']], s['circle']
        f = fams.setdefault(fid, {'id': fid, 'name': s['family'], 'circle': c, 'species': [], 'genera': [], 'look': [],
                                  **vn('family', s['family'])})
        f['species'].append(i)
        if gid not in f['genera']:
            f['genera'].append(gid)
        gref = ((worms or {}).get('genera') or {}).get(s['genus'])
        gens.setdefault(gid, {'id': gid, 'name': s['genus'], 'family': fid, 'circle': c, 'species': [],
                              **({'ref': gref} if gref else {}), **vn('genus', s['genus'])})['species'].append(i)
        w = s.get('worms') or {}
        look = [sid[o] for p in pairs if s['name'] in p for o in p if o != s['name']]
        species.append({
            'id': i,
            'name': s['name'],
            **({'now': w['accepted']} if w.get('accepted') and w['accepted'] != s['name'] else {}),
            **({'ref': w.get('aphiaAcc') or w['aphia']} if w.get('aphiaAcc') or w.get('aphia') else {}),
            'inat': s['inat'],
            'circle': c,
            'family': fid,
            'genus': gid,
            'r': s['rank'],
            'group': s['group'],
            **({'star': True} if s.get('star') else {}),
            'present': {'area': s['observers'], 'near': bool(s.get('near')), 'nearU': s.get('nearObservers', 0),
                        'nearN': s.get('nearObs', 0)},
            **({'look': look} if look else {}),
            **vn('species', s['name']),
        })
    # The species with no name yet (tools/seaslug_informal.json; rule C8): a species of its genus, present by its label
    # (tools/presence.py label_confirmed), only when its genus is in the tree; while the species are not units, a sheet, whose photos play for its genus. Its record: id x:<key>, no inat nor WoRMS ref, src (its
    # source, shown in small type beside its name: never a guide's number), cite and doi (the paper), field (the
    # iNaturalist observation field that marks it), inf 1; circle its genus's (it never moves a genus), r the rank its
    # label's observers would give it among the listed species (between two of them), present from the label's counts.
    extra = []
    for s in (inf or {}).get('species') or []:
        P, gid = s.get('presence') or {}, 'g:' + s['genus']
        if gid not in gens or not label_confirmed(P.get('observers')):
            continue
        G, i = gens[gid], 'x:' + s['key']
        G['species'].append(i)
        fams[G['family']]['species'].append(i)
        kin = next(x for x in sp if x['genus'] == s['genus'])
        species.append({
            'id': i,
            'name': s['name'],
            'inf': 1,
            'src': s['src'],
            'cite': s['cite'],
            **({'doi': s['doi']} if s.get('doi') else {}),
            'field': s['field']['id'],
            'circle': G['circle'],
            'family': G['family'],
            'genus': gid,
            'r': sum(1 for x in L['species'] if x.get('observers', 0) > P['observers']) + 0.5,
            'group': kin['group'],
            'present': {'area': P['observers'], 'near': bool(P.get('near')), 'nearU': P.get('nearObservers', 0),
                        'nearN': P.get('nearObs', 0)},
        })
        extra.append((s['key'], s['name']))
    for k, o in genus_looks(looks, list(gens.values())).items():
        gens[k].update(o)
    tx, tof = taxa(groups, [f['name'] for f in fams.values()])
    for f in fams.values():
        if f['name'] in tof:
            f['tgroup'] = tof[f['name']]
    seaslug_cues.apply(cues, fams, gens, species)
    seaslug_cues.species_apply(spmarks, species)
    tree = {
        'v': V,
        'about': 'the sea-slug subject\'s tree (tools/seaslug_game.py from tools/seaslugs.json; core.js fishGen reads it)',
        'area': L.get('area'),
        'centre': L.get('centre'),
        'start': [],
        'key': None,
        **({'taxa': tx} if tx else {}),
        # the English names' sources and when each was read (tools/seaslug_names.json pulled, guides)
        **({'ensrc': {**{k: v for k, v in (names.get('pulled') or {}).items() if v},
                      **({'guide': [{'t': g['t'], 'read': g.get('read')} for g in names.get('guides') or []]}
                         if names.get('guides') else {})}} if V_ else {}),
        'teach': [],
        'families': list(fams.values()),
        'genera': list(gens.values()),
        'species': species,
        'vn': [],
        'ref': worms_ref(worms, species, gens.values()) if worms else {},
    }
    old = {p['f']: p for P in ((prev or {}).get('photos') or {}).values() for p in P if isinstance(p, dict) and p.get('f')}
    byname = {s['name']: s for s in species}
    photos, todo = {}, []

    def rec(p, unit, orig, route):
        """The game record of candidate p in play for unit (a species id, or a genus id for a genus-level photo, gl): the
        fish's (tools/fish_game.py record: Pierre's ease, tags and phase over the judgement, auto for a photo that entered
        by itself, a photo he moved to another unit named after it), with the sea slugs' own fields: gl, the animal's box
        for the Find the X tile (the fish's rule and cut, tools/fish_game.py tile_tags, tile_crop: a judgement carrying one,
        judging/SEASLUG.md "The animal's box", on a photo whose tags pass the tile rule), and r: 1 until the photo is on R2
        (place). The fields in the committed file's order."""
        r = FG.record(unit, p, F, sug, orig, units, route)
        bb = FG.box_of(p['f'], None, sug) if tile_tags(r.get('jt')) else None
        out = {}
        for k, v in r.items():
            if k != 'auto':
                out[k] = v
            if k == 'sp' and unit in gens:
                out['gl'] = 1
        return {**out, **({'bb': bb} if bb else {}), **({'auto': r['auto']} if 'auto' in r else {}), 'r': 1}

    def kept(L1, documented_juvenile):
        """The photos in play of one list: Pierre's adds always (as a fish add), then at most cap adults with them, the
        easiest first, then the juveniles (perJuvenileForm for a documented juvenile form, else what the cap leaves). A
        juvenile: the juvenile flag of the record's tags (juv)."""
        order = lambda p: (-(p.get('e') or 0), p['f'])  # noqa: E731
        his = sorted((p for p in L1 if 'auto' not in p), key=order)
        room = max(0, cap - sum(1 for p in his if not juv(p.get('jt'))))
        auto = [p for p in L1 if 'auto' in p]
        adults = sorted((p for p in auto if not juv(p['jt'])), key=order)[:room]
        young = sorted((p for p in auto if juv(p['jt'])), key=order)
        return his + adults + (young[:plus] if documented_juvenile else young[:max(0, room - len(adults))])

    def place(keep, fid):
        for r in keep:
            his, c = crop_mine(F, r['f'])
            c = c if his else crop(sug.get(r['f']))
            ro, o = (F.get('rot') or {}).get(r['f']) or 0, old.get(r['f'])
            if on_r2(o) and o.get('src') == r['src']:
                # on R2: its files as they are (its crop, rotation, shape and rewrite count); made again when the admin's
                # crop or rotation, or the judge's crop, changed
                del r['r']
                r.update({k: o[k] for k in ('ar', 'cr', 'ro', 'iv') if k in o})
                if r.get('bb') and o.get('bb') == r['bb']:
                    r.update({k: o[k] for k in ('xc', 'xn') if k in o})  # its tile, made (xc) or refused (xn) from this box
                if stale(o, c, ro):
                    todo.append((r, c, o.get('iv', 0) + 1, ro))
                elif r.get('bb') and not ('xc' in r or 'xn' in r):
                    todo.append((r, c, o.get('iv', 0), ro, True))  # a new or changed box: its tile alone, the four files stay
            else:
                todo.append((r, c, o.get('iv', 0) + 1 if on_r2(o) else 0, ro))
        photos.setdefault(fid, []).extend(keep)

    # The photos in play, the fish's rule (tools/fish_game.py in_play) on the sea slugs' part of the curation and rubric:
    # the admin's adds (curation.json seaslug add {photo: unit}: core.js treePhotoOn, tools/fish_game.py fish_on), a candidate
    # he put in play for a species, or for a genus (a genus-level photo), there whatever its judgement, never one excluded
    # for good nor one whose count in force is other species one could take for its subject (rule P3); and the sure photos
    # he has not decided on (not added, removed, excluded nor moved, by photo id too). Never the same photo twice: the
    # species' lists are read first, by circle and rank, then the genus-level ones. By unit, as records.
    sp_of = {s['id']: s for s in species}
    # The units a photo plays for, by the name a moved photo takes (record): the sea slugs' own name, iNaturalist's, which
    # their candidates and sheets carry, never the WoRMS accepted name a fish record takes (now).
    units = {u: {'name': x['name']} for u, x in {**sp_of, **gens}.items()}
    # each candidate's own unit, by its list's key (an iNaturalist taxon id, a genus name, an informal species' key)
    key_unit = {**{str(s['inat']): sid[s['name']] for s in sp}, **{k: 'x:' + k for k, _ in extra},
                **{G['name']: gid for gid, G in gens.items()}}
    lists = [str(s['inat']) for s in sp] + [k for k, _ in extra] + [G['name'] for G in gens.values()]
    play = {}
    for unit, p, orig, route in FG.in_play(cur, cand, sug, key=CUR, sure=sure, keys=lists, units=set(units)):
        u = unit if route is None else key_unit[unit]
        play.setdefault(u, []).append(rec(p, u, key_unit.get(orig, orig), route))

    for key, name in [(str(s['inat']), s['name']) for s in sp] + extra:
        me = byname[name]
        keep = kept(play.get(me['id']) or [], name in documented)
        if len(keep) >= start:
            place(keep, me['family'])
    # The genus units' genus-level photos (tools/fetch_seaslugs.py --genus-level): the sure
    # ones of each genus, sp its genus id and gl 1 (core.js treeGenUnits plays them for the genus, never for a species),
    # at most cap, the easiest first; in play once the genus's photos in play, its species' and these, reach start.
    for gid, G in gens.items():
        keep = kept(play.get(gid) or [], False)
        mine = sum(1 for p in photos.get(G['family']) or [] if p['sp'] in G['species'])
        if keep and len(keep) + mine >= start:
            place(keep, G['family'])
    game = {
        'v': V,
        'about': 'the sea-slug photos in play, on R2 once downloaded, else read from iNaturalist (r: 1) '
                 '(tools/seaslug_game.py; core.js fishPhotos)',
        'photos': photos,
    }
    return tree, game, todo


def dump(o):
    return json.dumps(o, ensure_ascii=False, indent=1) + '\n'


def dump_game(g):
    """seaslug-game.json one photo per line, as fish-game.json (a re-judge shows as the lines it changes)."""
    j = lambda x: json.dumps(x, ensure_ascii=False, separators=(',', ':'))
    units = ',\n'.join(j(k) + ':[\n' + ',\n'.join(j(p) for p in L) + ']' for k, L in g['photos'].items())
    return '{' + ',\n'.join(j(k) + ':' + j(v) for k, v in g.items() if k != 'photos') + ',\n"photos":{\n' + units + '}}\n'


def check(tree, game, tree_text, game_text):
    """(the files out of date, the species waiting) for --check, from the build and the committed texts (None: missing).
    seaslug.json must be the build; seaslug-game.json too, but for the species with no photo in it yet whose judgements
    have come since (circle 3's last part, a species judged later): the Candidate photos workflow, which a change of
    data/suggest.json starts, builds them in at its run after the merge, so a judging PR needs no rebuild of its own. A species
    already in play must match the build (a re-judge of it rebuilds the file in its PR)."""
    bad = [] if tree_text == dump(tree) else ['seaslug.json']
    try:
        have = {p.get('sp') for L in json.loads(game_text)['photos'].values() for p in L}
    except (TypeError, ValueError, KeyError, AttributeError):
        have = set()
    wait = sorted({p['sp'] for L in game['photos'].values() for p in L} - have)
    G = {**game, 'photos': {}}
    for k, L in game['photos'].items():
        L = [p for p in L if p['sp'] not in wait]
        if L:
            G['photos'][k] = L
    if dump_game(G) != game_text:
        bad.append('seaslug-game.json')
    return bad, wait


def download_all(todo, out, get=None, pause=None, workers=6):
    """Downloads each (record, crop, iv, rotation) of todo into out with the fish's pipeline (tools/fish_game.py download: an
    iNaturalist photo host only, the crop applied, tools/photos.py's four sizes, the shape ar), the record then marked on
    R2 (no r; cr, iv). A photo that fails keeps its record as it was (remote, or its older files on R2), for the next
    run. Returns (downloaded, failed)."""
    import fish_game as FG
    get = get or FG.opener
    pause = FG.FB_PAUSE if pause is None else pause
    os.makedirs(out, exist_ok=True)

    def one(x):
        r, c, iv, ro = x[:4]
        if len(x) > 4:  # the tile alone (a new or changed box), its record already on R2: cr and ro as they are
            q = {k: v for k, v in r.items() if k not in ('xc', 'xn')}
            FG.tile_only(q, out, get, pause)
            return q, c, iv
        q = {k: v for k, v in r.items() if k not in ('r', 'ar', 'cr', 'ro', 'iv', 'xc', 'xn')}
        if ro:
            q['ro'] = ro
        FG.download(q, c, out, get, pause)
        return q, c, iv
    done, failed = 0, []
    with cf.ThreadPoolExecutor(workers) as ex:
        futs = {ex.submit(one, x): x for x in todo}
        for fut in cf.as_completed(futs):
            r = futs[fut][0]
            try:
                q, c, iv = fut.result()
            except Exception as e:
                failed.append(r['f'])
                print('failed:', r['f'], e)
                continue
            if len(futs[fut]) == 4:
                for k in ('r', 'cr', 'ro', 'iv'):
                    r.pop(k, None)
                r['ar'] = q['ar']
                if c:
                    r['cr'] = c
                if q.get('ro'):
                    r['ro'] = q['ro']
                if iv:
                    r['iv'] = iv
            for k in ('xc', 'xn'):
                r.pop(k, None)
                if k in q:
                    r[k] = q[k]  # its tile, made (xc) or refused (xn: tools/fish_game.py tile_crop)
            done += 1
    return done, failed


def inputs(root=ROOT):
    j = lambda n, d=None: load(os.path.join(root, n), d)
    return (j(os.path.join('tools', 'seaslugs.json')), j('data/seaslug-cand.json'), (j('data/suggest.json') or {}).get('seaslug') or {},
            j('seaslug-game.json', {'photos': {}}), j(os.path.join('tools', 'seaslug_groups.json'), {}) or None,
            j(os.path.join('tools', 'seaslug_informal.json'), {}) or None,
            j(os.path.join('tools', 'seaslug_names.json'), {}) or None,
            j(os.path.join('tools', 'seaslug_lookalikes_cand.json'), {}) or None, j('curation.json', {}),
            j(os.path.join('tools', 'seaslug_cues.json'), {}) or None,
            j(os.path.join('tools', 'seaslug_worms.json'), {}) or None,
            j(os.path.join('tools', 'seaslug_species_marks.json'), {}) or None)


def write(root, tree, game):
    for n, s in (('seaslug.json', dump(tree)), ('seaslug-game.json', dump_game(game))):
        p = os.path.join(root, n)
        if not os.path.exists(p) or open(p, encoding='utf-8').read() != s:
            with open(p, 'w', encoding='utf-8') as fh:
                fh.write(s)
    if os.path.realpath(root) == os.path.realpath(ROOT):  # the repository's own: its tree section (the admin's Tree tab) follows
        tree_section.write('seaslug')


def run(out='r2-upload', root=ROOT, get=None, pause=None, workers=6, limit=None):
    """The R2 step: builds, downloads what R2 lacks (at most limit, MAX by default; circle 1 first) and writes both files.
    Returns (downloaded, failed, listed, waiting)."""
    tree, game, todo = build(*inputs(root))
    n = MAX if limit is None else limit
    done, failed = download_all(todo[:n], out, get, pause, workers)
    write(root, tree, game)
    return done, failed, sum(len(L) for L in game['photos'].values()), max(0, len(todo) - n)


def plan_text(tree, game, todo, n=MAX):
    """What --r2 would do, by circle (the circle of the species each photo is in play for)."""
    import fish_game as FG
    circle = {s['id']: s['circle'] for s in tree['species']}
    allr = [p for L in game['photos'].values() for p in L]
    lines = []
    for c in CIRCLES + (None,):
        on = [p for p in allr if c is None or circle.get(p['sp']) == c]
        td = [x[0] for x in todo if c is None or circle.get(x[0]['sp']) == c]
        tl = sum(1 for x in todo if len(x) > 4 and (c is None or circle.get(x[0]['sp']) == c))  # tiles alone: one file
        sp = {p['sp'] for p in on}
        tot = len([s for s in tree['species'] if c is None or s['circle'] == c])
        name = f'circle {c}' if c else 'all'
        lines.append(f'{name}: {len(on)} photos in play over {len(sp)} of {tot} species, {len(on) - len([p for p in on if p.get("r")])} '
                     f'on R2; to download: {len(td)} ({(len(td) - tl) * 4 + tl} files, about {len(td) * FG.KB_PER_PHOTO / 1024:.0f} MB)')
    lines.append(f'R2 after the run: about {len(allr) * FG.KB_PER_PHOTO / 1024:.0f} MB for the sea slugs '
                 f'({FG.KB_PER_PHOTO} KB a photo, the fish\'s mean over four sizes); at most {n} a run: '
                 f'{-(-len(todo) // n) if todo else 0} run(s), circle 1 first')
    return '\n'.join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--check', action='store_true', help='exit 1 when a committed file differs from a fresh build')
    ap.add_argument('--plan', action='store_true', help='print what --r2 would download; writes nothing')
    ap.add_argument('--r2', action='store_true', help='download the photos in play R2 lacks into --out')
    ap.add_argument('--out', default='r2-upload')
    ap.add_argument('--max', type=int, default=MAX, help='at most this many downloads in this run (SEASLUG_MAX)')
    a = ap.parse_args()
    tree, game, todo = build(*inputs())
    if a.check:
        text = lambda p: open(p, encoding='utf-8').read() if os.path.exists(p) else None
        bad, wait = check(tree, game, text(TREE_OUT), text(GAME_OUT))
        if bad:
            print('seaslug_game: out of date, run python3 tools/seaslug_game.py: ' + ', '.join(bad), file=sys.stderr)
            sys.exit(1)
        if wait:
            print(f'seaslug_game: {len(wait)} species judged since, not in seaslug-game.json yet (the Candidate photos '
                  'workflow builds them in after the merge): ' + ', '.join(wait))
        return
    if a.plan:
        print(plan_text(tree, game, todo, a.max))
        return
    if a.r2:
        import slot
        slot.guard('tools/seaslug_game.py')  # one heavy run at a time on the machine (rule W24)
        done, failed, n, wait = run(a.out, limit=a.max)
        print(f'sea slugs: downloaded {done} into {a.out}/ (upload: tools/r2_sync.sh {a.out}), {len(failed)} failed; '
              f'{n} photos in seaslug-game.json' + (f'; {wait} more wait for the next run' if wait else ''))
        return
    write(ROOT, tree, game)
    n = sum(len(x) for x in game['photos'].values())
    sp = len({p['sp'] for x in game['photos'].values() for p in x})
    print(f'seaslug.json: {len(tree["families"])} families, {len(tree["genera"])} genera, {len(tree["species"])} species; '
          f'seaslug-game.json: {n} photos in play, {sp} species playable, {len(todo)} not on R2 yet')


if __name__ == '__main__':
    main()
