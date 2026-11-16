require('./slot.js').testGuard();
// The sea-slug literature watch (tools/seaslug_lit.py; Pierre, 2026-11-17: new names come from the literature): the
// WoRMS and iNaturalist replies it reads, and the look lists it derives, on made-up data with a stubbed network (nothing
// leaves the machine); and tools/seaslug_lit.json derives as written.
const test = require('node:test'),
  assert = require('node:assert'),
  path = require('path'),
  {spawnSync} = require('child_process');
const TOOLS = path.join(__dirname, '..', 'tools');
const py = body => {
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(TOOLS)})\nimport seaslug_lit as L\n${body}`;
  const r = spawnSync('python3', ['-c', code], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

test('the year of an authority', () => {
  const o = py(
    `print(json.dumps([L.year(a) for a in ['(Gosliner & Behrens, 2018)', 'Pease, 1866', 'Soong & Gosliner, 2022', None, 'Bergh']]))`
  );
  assert.deepStrictEqual(o, [2018, 1866, 2022, null, null]);
});

test('fetch: genus children paged and a subgenus opened, new species with their description, iNaturalist batched', () => {
  const o = py(`
asked = []
def rec(i, name, auth, status='accepted', valid=None, rank='Species', fam='Fa', genus='Aa'):
    return {'AphiaID': i, 'scientificname': name, 'authority': auth, 'status': status, 'valid_name': valid or name,
            'valid_AphiaID': i if not valid else 2, 'rank': rank, 'family': fam, 'genus': genus, 'class': 'Gastropoda'}
def get(url):
    asked.append(url.split('/rest/')[-1].split('/v1/')[-1].split('?')[0])
    if 'AphiaRecordsByAphiaIDs' in url:
        return [rec(1, 'Aa bb', 'X, 1900')]
    if 'AphiaRecordsByNames' in url and 'Aa' in url and 'Species' not in url:
        if 'scientificnames[]=Aa&' in url:
            return [[rec(10, 'Aa', 'X, 1800', rank='Genus'), {**rec(11, 'Aa', 'Y', rank='Genus'), 'class': 'Insecta'}]]
        return [[]]
    if 'AphiaChildrenByAphiaID/10' in url:
        off = int(url.split('offset=')[1])
        if off == 1:
            return [rec(100 + k, f'Aa s{k}', 'Z, 1950') for k in range(49)] + [rec(20, 'Aa (Sub)', 'W', rank='Subgenus')]
        return [rec(2, 'Aa nova', '(Lee & Kim, 2021)'), rec(3, 'Aa vetus', 'Old, 2019', status='unaccepted', valid='Aa nova')]
    if 'AphiaChildrenByAphiaID/20' in url:
        return [rec(4, 'Aa sub', 'Q, 2020')]
    if 'AphiaSourcesByAphiaID/1' in url and url.endswith('/1'):
        return [{'use': 'original description', 'reference': 'X (1900). Old.', 'doi': None},
                {'use': 'status source', 'reference': 'Rev, A. & B. (2023). A revision. J. 1: 2.', 'doi': '10/x'}]
    if 'AphiaSourcesByAphiaID/2' in url:
        return [{'use': 'original description', 'reference': 'Lee, A. & Kim, B. (2021). New Aa. Zootaxa 1: 1-9.', 'doi': '10/y'}]
    if 'AphiaSourcesByAphiaID' in url:
        return []
    if 'AphiaRecordsByNames' in url:
        return [[]]
    if 'species_counts' in url:
        if 'verifiable=true' in url:
            return {'total_results': 2, 'results': [{'taxon': {'id': 7, 'name': 'Aa vetus', 'rank': 'species'}, 'count': 9},
                                                    {'taxon': {'id': 8, 'name': 'Aa sub', 'rank': 'species'}, 'count': 1}]}
        if 'quality_grade=research' in url and 'place_id' in url:
            return {'total_results': 2, 'results': [{'taxon': {'id': 7, 'name': 'Aa vetus', 'rank': 'species'}, 'count': 4},
                                                    {'taxon': {'id': 71, 'name': 'Aa vetus minor', 'rank': 'subspecies'}, 'count': 1}]}
        return {'total_results': 0, 'results': []}
    if '/observers' in url:
        return {'total_results': 3}
    raise SystemExit('unexpected ' + url)
net = L.Net(get=get)
ours = [{'name': 'Aa bb', 'genus': 'Aa', 'family': 'Fa', 'worms': {'aphia': 1}}]
raw = L.fetch(net, ours, {'since': 2018, 'named': []}, [5, 6], log=lambda m: None)
print(json.dumps({'raw': raw, 'asked': asked}))
`);
  const {raw, asked} = o;
  assert.deepStrictEqual(raw.ours['Aa bb'].sources, [[2023, 'status source', 'Rev, A. & B. (2023). A revision. J. 1: 2.', '10/x']]);
  assert.strictEqual(raw.genera.Aa.aphia, 10, 'the gastropod genus, not the insect homonym');
  assert.strictEqual(raw.genera.Aa.species, 51, '49 + nova + sub (accepted species, the subgenus opened)');
  assert.deepStrictEqual(
    raw.new.map(c => [c.name, c.year, c.alt]),
    [
      ['Aa nova', 2021, ['Aa vetus']],
      ['Aa sub', 2020, []]
    ]
  );
  assert.deepStrictEqual(raw.new[0].description, ['Lee, A. & Kim, B. (2021). New Aa. Zootaxa 1: 1-9.', '10/y']);
  assert.deepStrictEqual(raw.inat['Aa vetus'], {id: 7, rg: 5, ver: 9, near: 0, obsPh: 3, obsNear: null});
  assert.deepStrictEqual(raw.inat['Aa sub'], {id: 8, rg: 0, ver: 1, near: 0, obsPh: null, obsNear: null});
  assert.strictEqual(asked.filter(u => u === 'observations/species_counts').length, 3, 'three queries for every root at once');
  assert.strictEqual(asked.filter(u => u === 'observations/observers').length, 1, 'observers only where the count can reach 3');
});

test('derive: renames, placements, genera, new species by rule C8, revisions, named labels', () => {
  const o = py(`
raw = {'since': 2018,
  'ours': {'Aa bb': {'status': 'accepted', 'valid': 'Aa bb', 'family': 'Fa', 'genus': 'Aa', 'sources': []},
           'Aa cc': {'status': 'unaccepted', 'valid': 'Bb cc', 'family': 'Fb', 'genus': 'Bb',
                     'sources': [[2023, 'status source', 'Rev (2023)', None]]}},
  'genera': {'Aa': {'status': 'accepted', 'valid': 'Aa'}, 'Cc': {'status': 'unaccepted', 'valid': 'Aa'}},
  'new': [
    {'name': 'Aa one', 'authority': 'L, 2021', 'searched': 'Aa', 'alt': [], 'description': ['L (2021). One.', None]},
    {'name': 'Aa two', 'authority': 'L, 2022', 'searched': 'Aa', 'alt': ['Aa old'], 'description': None},
    {'name': 'Aa three', 'authority': 'L, 2023', 'searched': 'Aa', 'alt': [], 'description': None},
    {'name': 'Aa four', 'authority': 'L, 2024', 'searched': 'Aa', 'alt': [], 'description': None},
    {'name': 'Aa bb', 'authority': 'L, 2019', 'searched': 'Aa', 'alt': [], 'description': None}],
  'named': {'Aa two': {'status': 'accepted', 'valid': 'Aa two'}},
  'inat': {'Aa one': {'rg': 6, 'ver': 8, 'obsPh': 4, 'obsNear': None, 'near': 0, 'id': 1},
           'Aa old': {'rg': 2, 'ver': 5, 'obsPh': None, 'obsNear': 2, 'near': 2, 'id': 2},
           'Aa three': {'rg': 0, 'ver': 3, 'obsPh': None, 'obsNear': None, 'near': 0, 'id': 3},
           'Aa bb': {'rg': 9, 'ver': 9, 'obsPh': 5, 'obsNear': None, 'near': 0, 'id': 4}}}
ours = [{'name': 'Aa bb', 'family': 'Fa', 'genus': 'Aa'}, {'name': 'Aa cc', 'family': 'Fa', 'genus': 'Aa'},
        {'name': 'Aa dd', 'family': 'Fa', 'genus': 'Aa'}]
src = {'named': [{'label': 'Aa sp. 3 (a guide)', 'name': 'Aa two'}],
       'labels': [{'label': 'Aa sp. 3', 'observers': 5}, {'label': 'Aa sp. 30', 'observers': 4}],
       'ignoreSources': [{'ref': 'A guide (2020)'}]}
raw['ours']['Aa bb']['sources'] = [[2020, 'additional source', 'A guide (2020). Sea slugs.', None],
                                   [2021, 'context source (CoRMS)', 'A list (2021).', None]]
d = L.derive(raw, ours, src)
print(json.dumps([d, L.derive(raw, ours, src) == d]))
`);
  const [d, again] = o;
  const L = d.look;
  assert.deepStrictEqual(L.rename, [
    {name: 'Aa cc', status: 'unaccepted', valid: 'Bb cc'},
    {name: 'Aa dd', status: 'not pulled', valid: null}
  ]);
  assert.deepStrictEqual(L.placement, [{name: 'Aa cc', ours: ['Fa', 'Aa'], worms: ['Fb', 'Bb']}]);
  assert.deepStrictEqual(L.genus, [{genus: 'Cc', status: 'unaccepted', valid: 'Aa'}]);
  assert.deepStrictEqual(L.revised, [{name: 'Aa cc', papers: ['Rev (2023)']}], 'an ignored guide and a context list are left out');
  assert.deepStrictEqual(
    L.add.map(e => [e.name, e.by, e.observers]),
    [
      ['Aa one', ['observers'], 4],
      ['Aa two', ['near'], null]
    ],
    '3 observers in the Philippines, or 2 near the centre (rule C8); an old name counts for the new one'
  );
  assert.strictEqual(L.add[1].inat, 'Aa old');
  assert.deepStrictEqual(
    L.watch.map(e => [e.name, e.by, e.ver]),
    [['Aa three', [], 3]]
  );
  assert.deepStrictEqual(
    L.inList.map(e => e.as),
    ['Aa bb']
  );
  assert.deepStrictEqual(L.named, [
    {label: 'Aa sp. 3 (a guide)', name: 'Aa two', worms: 'accepted', valid: 'Aa two', held: false, rg: 2, ver: 5, by: ['near']}
  ]);
  assert.deepStrictEqual(L.unnamed, [{label: 'Aa sp. 30', observers: 4}], 'a label with a named entry leaves the list');
  assert.strictEqual(d.counts.elsewhere, 1, 'Aa four: no observation in the Philippines, only counted');
  assert.ok(again, 'the derive stage is deterministic');
});

test('tools/seaslug_lit.json derives as written (seaslug_lit.py --check, offline)', () => {
  const r = spawnSync('python3', [path.join(TOOLS, 'seaslug_lit.py'), '--check'], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, (r.stdout || '') + (r.stderr || ''));
});

test('tools/seaslug_lit.json holds no observer id and no personal field', () => {
  const d = require('../tools/seaslug_lit.json');
  const s = JSON.stringify(d);
  for (const k of ['"user"', '"users"', '"login"', '"user_id"']) assert.ok(!s.includes(k), k);
  for (const r of Object.values(d.raw.inat)) assert.deepStrictEqual(Object.keys(r).sort(), ['id', 'near', 'obsNear', 'obsPh', 'rg', 'ver']);
});
