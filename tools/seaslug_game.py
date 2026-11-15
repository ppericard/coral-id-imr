#!/usr/bin/env python3
"""The sea-slug subject's game data (study docs/reviews/2026-11-15-nudibranch-mode-study.md §9, step 5): writes
seaslug.json, the subject's tree, and seaslug-game.json, its photos in play, which the app reads (core.js SUBJECTS
seaslug, app.js UNITS seaslug) as it reads fish.json and fish-game.json (core.js fishGen, app.js fishGenera).

Inputs, all in the repository (no network):
  - tools/seaslugs.json (tools/build_seaslugs.py): the species confirmed in the Philippines, circle 1 (Q377: the 21
    stars and the 24 most common other species), their WoRMS names, commonness, presence and the photo target
    (photoTarget: start 6, game cap 12, +5 for a documented juvenile form; Pierre, 2026-11-15, Q377);
  - seaslug-cand.json (tools/fetch_seaslugs.py): the candidate photos, one per observation, by iNaturalist taxon id;
  - suggest.json "seaslug" (tools/judging_fish.py --subject seaslug, from judging/seaslug/*.json): the judgements on
    judging/SEASLUG.md's rubric, the caps applied.

seaslug.json, in fish.json's shape so the fish engine reads it unchanged (core.js fishGen, fishTree; app.js fishGenera):
  - families {id f:<family>, name (the scientific name: Q369 (d), scientific names only), circle, species, genera,
    look (none sourced yet: study §9 step 8), cues (none: no IMR content, study §8)}, in the order of their most common
    species;
  - genera {id g:<genus>, name, family, circle, species};
  - species {id s<iNaturalist taxon id>, name (iNaturalist's, which WoRMS accepts for every circle-1 species), now (the
    WoRMS accepted name when it differs), ref (the WoRMS AphiaID), inat, circle, family, genus, r (the commonness rank
    over every group, tools/seaslugs.json rank), group (the iNaturalist order: Nudibranchia, Sacoglossa...), star (the
    stars set, Q369 (c), Q377: never the opening order), present {area: distinct Research Grade observers in the
    subject's area, the Philippines (Q369 (b)), what the game's commonness reads (core.js fishGen cm); near, nearU,
    nearN: rule C8's near test and the observers and observations within the instance's radius of Dauin, what the
    default covers read (app.js nearSeen)}, look (the decided look-alike pairs, tools/seaslugs.json lookalikes: the two
    Spanish dancers, for step 8)}. No English name: they are information for the sheets (Q369 (d)), step 7.
  - key null (rule S3: a region with no key has no such rule; no sea-slug key is read yet), no teaching entries, no IMR
    tag. Only circle 1: the later circles have no candidate photos yet.

seaslug-game.json, in fish-game.json's record shape (core.js fishPhotos, fishGameRead) under each family id:
  - the photos in play: a candidate judged sure (fish_game.py cand_sure's rule on the sea slugs' rubric: no unsure
    field, keep best or alt, never dup, never an egg mass, valid tags and ease, a count an automatic route may put in
    play, never out of the water), at most photoTarget.gameCap a species, the easiest first, plus up to
    photoTarget.perJuvenileForm juvenile photos for a species with a documented juvenile form (photoTarget.juvenile);
  - a species with fewer than photoTarget.start such photos has none in play (it cannot be played yet);
  - each record {f, o, src, a, lic, t, sp, loc, own, e, jt, auto: "cand", r: 1}: r 1 because the photos are still read
    from iNaturalist (app.js img) until the R2 step (study §9, step 6) uploads them and drops r, as tools/fish_game.py
    does for the fish. The judge's proposed crop is not applied to a remote photo: the R2 step bakes it.

  python3 tools/seaslug_game.py           write both files
  python3 tools/seaslug_game.py --check   build in memory and exit 1 when a committed file differs (CI: the judged files
                                          and the list move, the game data must follow; tests/seaslug-game.test.js)
"""
import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIST = os.path.join(ROOT, 'tools', 'seaslugs.json')
CAND = os.path.join(ROOT, 'seaslug-cand.json')
SUGGEST = os.path.join(ROOT, 'suggest.json')
TREE_OUT = os.path.join(ROOT, 'seaslug.json')
GAME_OUT = os.path.join(ROOT, 'seaslug-game.json')
V = 1
# The sea slugs' rubric code without its ease digit, as suggest.json keeps it (tools/fish_judge.py RUBRICS "seaslug").
TAGS = re.compile(r'^[pohtdv][01][gd][0-3][smb][lms][1sokx][jcawf]*$')
# The counts an automatic route may put in play (core.js FISH_COUNT.play): one sea slug, several of its kind, another
# species that cannot be taken for it (rule P3).
PLAY_COUNT = '1so'


def load(p):
    with open(p, encoding='utf-8') as fh:
        return json.load(fh)


def sure(j):
    """A judgement that puts its candidate in play by itself (tools/fish_game.py cand_sure, on the sea slugs' rubric)."""
    if not j or j.get('egg') or j.get('u') or j.get('k', 'best') not in ('best', 'alt'):
        return False
    jt, e = j.get('jt') or '', j.get('e')
    return bool(TAGS.match(jt)) and isinstance(e, int) and 1 <= e <= 5 and jt[6] in PLAY_COUNT and 'a' not in jt[7:]


def juv(jt):
    return 'j' in (jt or '')[7:]


def build(L, cand, sug):
    """(seaslug.json, seaslug-game.json) from the list L, the candidates and the judgements."""
    T = L.get('photoTarget') or {}
    start, cap, plus = T['start'], T['gameCap'], T.get('perJuvenileForm', 0)
    documented = set(T.get('juvenile') or {})
    sp1 = sorted((s for s in L['species'] if s.get('circle') == 1), key=lambda s: s['rank'])
    sid = {s['name']: 's%d' % s['inat'] for s in sp1}
    pairs = [p['pair'] for p in L.get('lookalikes') or [] if all(n in sid for n in p['pair'])]
    fams, gens, species = {}, {}, []
    for s in sp1:
        fid, gid, i = 'f:' + s['family'], 'g:' + s['genus'], sid[s['name']]
        f = fams.setdefault(fid, {'id': fid, 'name': s['family'], 'circle': 1, 'species': [], 'genera': [], 'look': []})
        f['species'].append(i)
        if gid not in f['genera']:
            f['genera'].append(gid)
        gens.setdefault(gid, {'id': gid, 'name': s['genus'], 'family': fid, 'circle': 1, 'species': []})['species'].append(i)
        w = s.get('worms') or {}
        look = [sid[o] for p in pairs if s['name'] in p for o in p if o != s['name']]
        species.append({
            'id': i,
            'name': s['name'],
            **({'now': w['accepted']} if w.get('accepted') and w['accepted'] != s['name'] else {}),
            **({'ref': w['aphiaAcc'] or w['aphia']} if w.get('aphiaAcc') or w.get('aphia') else {}),
            'inat': s['inat'],
            'circle': 1,
            'family': fid,
            'genus': gid,
            'r': s['rank'],
            'group': s['group'],
            **({'star': True} if s.get('star') else {}),
            'present': {'area': s['observers'], 'near': bool(s.get('near')), 'nearU': s.get('nearObservers', 0),
                        'nearN': s.get('nearObs', 0)},
            **({'look': look} if look else {}),
        })
    tree = {
        'v': V,
        'about': 'the sea-slug subject\'s tree (tools/seaslug_game.py from tools/seaslugs.json; core.js fishGen reads it)',
        'area': L.get('area'),
        'centre': L.get('centre'),
        'start': [],
        'key': None,
        'teach': [],
        'families': list(fams.values()),
        'genera': list(gens.values()),
        'species': species,
        'vn': [],
        'ref': {},
    }
    byname = {s['name']: s for s in species}
    photos = {}
    for s in sp1:
        me = byname[s['name']]
        L1 = []
        for p in (cand.get('cand') or {}).get(str(s['inat'])) or []:
            j = sug.get(p.get('f'))
            if sure(j):
                L1.append({'f': p['f'], 'o': p['o'], 'src': p['src'], 'a': p['a'], 'lic': p['lic'], 't': p['t'],
                           'sp': me['id'], 'loc': p.get('loc'), **({'own': True} if p.get('own') else {}),
                           'e': j['e'], 'jt': j['jt'], 'auto': 'cand', 'r': 1})
        order = lambda p: (-p['e'], p['f'])
        adults = sorted((p for p in L1 if not juv(p['jt'])), key=order)[:cap]
        young = sorted((p for p in L1 if juv(p['jt'])), key=order)
        young = young[:plus] if s['name'] in documented else young[:max(0, cap - len(adults))]
        keep = adults + young
        if len(keep) >= start:
            photos.setdefault(me['family'], []).extend(keep)
    game = {
        'v': V,
        'about': 'the sea-slug photos in play, read from iNaturalist until the R2 step (tools/seaslug_game.py; core.js fishPhotos)',
        'photos': photos,
    }
    return tree, game


def dump(o):
    return json.dumps(o, ensure_ascii=False, indent=1) + '\n'


def dump_game(g):
    """seaslug-game.json one photo per line, as fish-game.json (a re-judge shows as the lines it changes)."""
    j = lambda x: json.dumps(x, ensure_ascii=False, separators=(',', ':'))
    units = ',\n'.join(j(k) + ':[\n' + ',\n'.join(j(p) for p in L) + ']' for k, L in g['photos'].items())
    return '{' + ',\n'.join(j(k) + ':' + j(v) for k, v in g.items() if k != 'photos') + ',\n"photos":{\n' + units + '}}\n'


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--check', action='store_true', help='exit 1 when a committed file differs from a fresh build')
    a = ap.parse_args()
    tree, game = build(load(LIST), load(CAND), load(SUGGEST).get('seaslug') or {})
    out = [(TREE_OUT, dump(tree)), (GAME_OUT, dump_game(game))]
    if a.check:
        bad = [os.path.basename(p) for p, s in out if not os.path.exists(p) or open(p, encoding='utf-8').read() != s]
        if bad:
            print('seaslug_game: out of date, run python3 tools/seaslug_game.py: ' + ', '.join(bad), file=sys.stderr)
            sys.exit(1)
        return
    for p, s in out:
        with open(p, 'w', encoding='utf-8') as fh:
            fh.write(s)
    n = sum(len(x) for x in game['photos'].values())
    sp = len({p['sp'] for x in game['photos'].values() for p in x})
    print(f'seaslug.json: {len(tree["families"])} families, {len(tree["genera"])} genera, {len(tree["species"])} species; '
          f'seaslug-game.json: {n} photos in play, {sp} species playable')


if __name__ == '__main__':
    main()
