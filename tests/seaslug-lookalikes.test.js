require('./slot.js').testGuard();
// The sea slugs' look-alike candidates, from the look-alikes and confusion groups already published
// (tools/seaslug_lookalikes.py): the parsing of the replies, the build's rules (rules C6, C8: a partner in the subject
// or confirmed in the Philippines, the others apart; the floors; the literature, WoRMS and text sources; the
// iNaturalist groups) on made-up data with a stubbed network, the committed file as the tool builds it, and only its
// genus pairs in the game, through tools/seaslug_game.py genus_looks (the decided pairs stay in tools/seaslugs.json
// lookalikes).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..'),
  TOOLS = path.join(ROOT, 'tools');
const py = body => {
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(TOOLS)})\nimport seaslug_lookalikes as m\n${body}`;
  const r = spawnSync('python3', ['-c', code], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

test('genera: the species parents batched 30 a request, a subgenus climbed to its genus', () => {
  const o = py(`
asked = []
T = {i: {'id': i, 'rank': 'species', 'parent_id': 900 if i == 5 else 800} for i in range(1, 41)}
T[800] = {'id': 800, 'rank': 'genus', 'name': 'Aa'}
T[900] = {'id': 900, 'rank': 'subgenus', 'parent_id': 901, 'name': 'Aa (Sub)'}
T[901] = {'id': 901, 'rank': 'genus', 'name': 'Bb'}
def get(url):
    ids = [int(x) for x in url.split('/taxa/')[1].split(',')]
    asked.append(len(ids))
    return {'results': [T[i] for i in ids]}
print(json.dumps({'g': m.genus_ids(get, range(1, 41)), 'asked': asked}))
`);
  assert.deepStrictEqual(o.g, {Aa: 800, Bb: 901});
  assert.deepStrictEqual(o.asked, [30, 10, 2, 1], 'the species by 30, then the parents, then the subgenus’s parent');
});

test('similar species: in the Philippines or worldwide, the counts and the partners', () => {
  const o = py(`
urls = []
def get(url):
    urls.append(url)
    return {'results': [{'count': 4, 'taxon': {'id': 7, 'name': 'Aa bb', 'rank': 'species', 'ancestor_ids': [1, 47113, 7]}},
                        {'count': 1, 'taxon': {}}]}
rows, taxa = m.similar(get, 5, 6873)
rows2, _ = m.similar(get, 5)
print(json.dumps({'rows': rows, 'taxa': {str(k): v for k, v in taxa.items()}, 'urls': [u.split('/v1/')[1] for u in urls],
                  'root': m.root_of({'id': 7, 'ancestor_ids': [1, 47113]}, {'Nudibranchia': 47113}),
                  'none': m.root_of({'id': 8, 'ancestor_ids': [1, 2]}, {'Nudibranchia': 47113})}))
`);
  assert.deepStrictEqual(o.rows, [[7, 4]]);
  assert.deepStrictEqual(o.taxa['7'], ['Aa bb', 'species', [1, 47113, 7]]);
  assert.deepStrictEqual(o.urls, [
    'identifications/similar_species?taxon_id=5&place_id=6873',
    'identifications/similar_species?taxon_id=5'
  ]);
  assert.strictEqual(o.root, 'Nudibranchia');
  assert.strictEqual(o.none, null);
});

test('the text sources: the comparing sentences only, up to the reference lists', () => {
  const o = py(`
w = "Aa bbb is blue.<ref>X</ref> It is similar to {{tl|x}} [[Aa ccc|A. ccc]] but has&nbsp;spots. It eats sponges.\\n" \\
    "==References==\\n* Aa ddd resembles Aa bbb, 1999."
print(json.dumps({'s': m.sentences(m.plain_wiki(w)), 'g': m.sentences('Remarks. This differs from Bb eee in its gills. Body ovate.')}))
`);
  assert.deepStrictEqual(o.s, ['It is similar to A. ccc but has spots.']);
  assert.deepStrictEqual(o.g, ['This differs from Bb eee in its gills.']);
});

const WORLD = `
L = {'species': [
  {'name': 'Aa one', 'inat': 1, 'genus': 'Aa', 'family': 'F1'},
  {'name': 'Aa two', 'inat': 2, 'genus': 'Aa', 'family': 'F1'},
  {'name': 'Bb three', 'inat': 3, 'genus': 'Bb', 'family': 'F2'},
  {'name': 'Cc four', 'inat': 4, 'genus': 'Cc', 'family': 'F2', 'syn': ['Dd four']},
  {'name': 'Ee five', 'inat': 5, 'genus': 'Ee', 'family': 'F3'}]}
tree = {'species': [{'name': 'Aa one', 'inat': 1, 'ref': 101}, {'name': 'Aa two', 'inat': 2, 'ref': 102},
                    {'name': 'Bb three', 'inat': 3, 'ref': 103}],
        'genera': [{'name': 'Aa'}, {'name': 'Bb'}]}
source = {'floor': {'ph': 2, 'world': 3}, 'groupFloor': {'ph': 3, 'world': 10},
          'sets': [{'id': 'paper', 'rank': 'species', 'members': ['Aa two', 'Bb three', 'Xx out', 'Dd four'], 'source': 'A paper',
                    'quote': 'they look alike', 'read': 'abstract'}]}
P = {'pulled': '2026-11-17', 'place': 6873, 'genera': {'Aa': 10, 'Bb': 11},
     'obs': {'ph': {'1': 100, '2': 50, '3': 20, '10': 150, '11': 20}, 'world': {'1': 200, '2': 100, '3': 40, '10': 300, '11': 40}},
     'similar': {'ph': {'1': [[2, 5], [4, 3], [99, 4]], '2': [[1, 5]], '3': [[4, 1]], '10': [[11, 2], [12, 4]], '11': [[10, 2]]},
                 'world': {'1': [[2, 9], [3, 4], [98, 6]], '2': [[1, 9]], '3': [[1, 4]], '10': [], '11': []}},
     'taxa': {'1': ['Aa one', 'species', 'Nudibranchia'], '2': ['Aa two', 'species', 'Nudibranchia'],
              '3': ['Bb three', 'species', 'Nudibranchia'], '4': ['Cc four', 'species', 'Nudibranchia'],
              '10': ['Aa', 'genus', 'Nudibranchia'], '11': ['Bb', 'genus', 'Nudibranchia'], '12': ['Ee', 'genus', 'Nudibranchia'],
              '98': ['Ww snail', 'species', None], '99': ['Zz nine', 'species', 'Nudibranchia']},
     'worms': {'101': [['additional source', 'Rudman, W. B. (1982). The Aa colour groups. A journal.', 'doi:1']],
               '102': [['basis of record', 'Rudman, W. B. (1982). The Aa colour groups. A journal.', 'doi:1']],
               '103': [['additional source', 'Someone (2001). A list of sea slugs.', None]]},
     'wiki': {'Aa one': ['It is similar to A. two but differs in its gills.', 'Bb three is similar in colour to C. four.',
                         'The radula of A. two is similar.'],
              'Bb three': ['It resembles Bb nine.']},
     'gbif': {'Bb three': [['A paper on slugs', 'discussion', 'It differs from Cc four in its gills.']]}}
C = m.build(L, tree, source, P)
pairs = {p['rank'] + ':' + p['a'] + '|' + p['b']: p for p in C['pairs']}
`;

test('build: partners kept in the subject or confirmed (rules C6, C8), the others apart with why; counts, shares, rates', () => {
  const o = py(WORLD + 'print(json.dumps({"pairs": pairs, "others": C["others"], "order": [p["a"] + "|" + p["b"] for p in C["pairs"]]}))');
  const p = o.pairs['species:Aa one|Aa two'];
  assert.deepStrictEqual(p.ph, {n: 5, share: [0.417, 1], rate: [0.05, 0.1]}, 'share of each side’s confusions, rate per observation');
  assert.deepStrictEqual(p.world.n, 9);
  assert.deepStrictEqual([p.crossGenus, p.crossFamily, p.kept], [false, false, ['subject', 'subject']]);
  assert.deepStrictEqual(p.text, [{src: 'Wikipedia', of: 'Aa one', quote: 'It is similar to A. two but differs in its gills.'}]);
  const c = o.pairs['species:Aa one|Cc four'];
  assert.deepStrictEqual(
    [c.ph.n, c.ph.share[1], c.kept, c.crossFamily],
    [3, null, ['subject', 'confirmed'], true],
    'a partner confirmed but not in the subject is kept; its side was not asked'
  );
  assert.ok(
    !o.pairs['species:Bb three|Cc four'] || o.pairs['species:Bb three|Cc four'].text,
    'under the floor, only a text source keeps a pair'
  );
  assert.deepStrictEqual(
    o.pairs['species:Bb three|Cc four'].text.map(t => [t.src, t.of]),
    [
      ['Wikipedia', 'Aa one'],
      ['GBIF', 'Bb three']
    ],
    'a sentence in one species’ text that compares two others pairs those two, not the first'
  );
  assert.ok(!c.text, 'nor the species whose text it is');
  assert.deepStrictEqual(
    o.others.map(x => [x.taxon, x.partner, x.ph, x.world, x.why]),
    [
      ['Aa one', 'Zz nine', 4, 0, 'a sea slug not confirmed in the Philippines (rule C8)'],
      ['Aa one', 'Ww snail', 0, 6, 'not a sea slug'],
      ['Bb three', 'Bb nine', 0, 0, 'a sea slug not confirmed in the Philippines (rule C8)']
    ]
  );
  assert.deepStrictEqual(o.order.slice(0, 3), ['Aa one|Aa two', 'Aa|Ee', 'Aa one|Cc four'], 'the strongest first');
});

// A species of the tree with no name yet (seaslug.json inf, x: ids) has no iNaturalist
// taxon: the build leaves it out of the iNaturalist parts and gives the same candidates.
test('build: a tree species with no iNaturalist taxon (a species with no name yet) changes nothing', () => {
  const o = py(
    WORLD +
      `tree2 = {**tree, 'species': tree['species'] + [{'id': 'x:aa-sp1', 'name': 'Aa sp. 1', 'inf': 1}]}
print(json.dumps(m.build(L, tree2, source, P) == C))`
  );
  assert.strictEqual(o, true);
});

test('build: genus pairs, asked directly and summed from their species pairs', () => {
  const o = py(WORLD + 'print(json.dumps(pairs))');
  const g = o['genus:Aa|Bb'];
  assert.deepStrictEqual([g.ph.n, g.genus], [2, {ph: 0, world: 4, pairs: 1}]);
  assert.deepStrictEqual(o['genus:Aa|Cc'].genus, {ph: 3, world: 0, pairs: 1});
  assert.deepStrictEqual([o['genus:Aa|Cc'].kept, o['genus:Aa|Cc'].crossFamily], [['subject', 'confirmed'], true]);
  assert.ok(!g.genusOnly && !o['genus:Aa|Cc'].genusOnly);
  assert.deepStrictEqual(
    [o['genus:Aa|Ee'].ph.n, o['genus:Aa|Ee'].genusOnly, o['genus:Aa|Ee'].kept],
    [4, true, ['subject', 'confirmed']],
    'a genus pair with no species pair of the subject under it is marked'
  );
});

test('build: literature and WoRMS sets, the iNaturalist groups', () => {
  const o = py(WORLD + 'print(json.dumps({"groups": C["groups"], "lit": pairs["species:Aa two|Bb three"], "counts": C["counts"]}))');
  const [lit, worms, nat] = o.groups;
  assert.deepStrictEqual(
    [lit.kind, lit.members, lit.outside, lit.as, lit.quote],
    ['literature', ['Aa two', 'Bb three', 'Cc four'], ['Xx out'], {'Dd four': 'Cc four'}, 'they look alike'],
    'a synonym the source uses is read as the list’s name'
  );
  assert.deepStrictEqual([worms.kind, worms.id, worms.members], ['worms', 'worms:Rudman1982:colour-groups', ['Aa one', 'Aa two']]);
  assert.match(worms.source, /colour groups\. A journal\. doi:1$/);
  assert.deepStrictEqual([nat.kind, nat.members, nat.edges, nat.families], ['inat', ['Aa one', 'Aa two', 'Cc four'], 2, ['F1', 'F2']]);
  assert.deepStrictEqual(o.lit.lit, ['paper'], 'a pair only a set holds is listed, with the set');
  assert.ok(!o.lit.ph && !o.lit.world);
  assert.deepStrictEqual(o.counts.groups, {literature: 1, worms: 1, inat: 1});
});

test('the pull: written one taxon a line and read back; a partial pull keeps the other parts', () => {
  const o = py(
    WORLD +
      `
P2 = dict(P, requests={'api.inaturalist.org': 3}, wormsGenera={'Aa': 5})
back = m.read_pull(json.loads(m.dump_pull(P2)))
def get(url):
    raise AssertionError('no network for the parts not asked')
keep = m.pull(get, tree, source, parts=[], prev=back)
print(json.dumps({'same': back == P2, 'lines': len(m.dump_pull(P2).splitlines()), 'kept': keep['similar'] == P['similar']}))
`
  );
  assert.ok(o.same, 'dump_pull then read_pull gives the pull back');
  assert.ok(o.kept);
  assert.ok(o.lines > 20);
});

test('the committed tools/seaslug_lookalikes_cand.json is what the tool builds (--check)', () => {
  const r = spawnSync('python3', [path.join(TOOLS, 'seaslug_lookalikes.py'), '--check'], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr);
});

test('the app never reads them; the game build takes their genus pairs (Q390 D); the decided pairs stay where they were', () => {
  const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const f of ['app.js', 'core.js', 'learn.js', 'quiz.js', 'admin.js', 'tools/build_seaslugs.py'])
    assert.ok(!read(f).includes('seaslug_lookalikes'), f);
  // tools/seaslug_game.py genus_looks (tests/seaslug-looks.test.js)
  assert.ok(read('tools/seaslug_game.py').includes("'seaslug_lookalikes_cand.json'"));
  const C = JSON.parse(read('tools/seaslug_lookalikes_cand.json'));
  // every species of the tree with an iNaturalist taxon (a species with no name yet has none)
  assert.ok(C.pairs.length > 0 && C.counts.asked.species === JSON.parse(read('seaslug.json')).species.filter(s => s.inat).length);
});
