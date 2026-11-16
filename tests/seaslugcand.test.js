require('./slot.js').testGuard();
// Sea-slug candidate photos (tools/fetch_seaslugs.py, seaslug-cand.json; Pierre, 2026-11-15, Q369, Q377 and #970's egg
// rule): the egg filter, the licence filter, one photo per observation, the juvenile room of a documented juvenile form,
// the Philippines before abroad, the record shape of fish-cand.json. The network is stubbed: the whole script runs on a
// fixture cache with --offline (a request not in it stops the run), nothing here asks iNaturalist. Needs python3.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const py = (code, ...args) =>
  execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\nfrom fetch_seaslugs import *\n${code}`, ...args], {
    cwd: ROOT,
    encoding: 'utf8'
  });
const J = (code, ...a) => JSON.parse(py(code, ...a));

// An observation as the cache keeps it (fetch_fish.trim): ll = [lat, lng], inph = in the Philippines; lic: one licence
// per photo (a list) or the same for its n photos.
const OBS = `
EGG = [(1, 7), (22, 30)]
def ob(i, lic='cc-by', u=None, g='research', ll=(9.2, 123.3), inph=True, an=(), rk='species', n=1, tx=None):
    L = lic if isinstance(lic, list) else [lic] * n
    o = {'id': i, 'g': g, 'll': list(ll) if ll else None, 'inph': inph, 't': 'Slugus slugii', 'rk': rk, 'u': u or f'user{i}',
         'an': [list(a) for a in an], 'ph': [[i * 10 + k, f'https://inaturalist-open-data.s3.amazonaws.com/photos/{i * 10 + k}/square.jpg', x, f'(c) u{i}'] for k, x in enumerate(L)]}
    if tx:
        o['tx'] = tx
    return o
`;

test('egg filter: Life Stage: Egg and Evidence of Presence: Egg drop the observation; juveniles, adults and down-voted egg annotations stay', () => {
  const out = J(`${OBS}
from fetch_fish import trim
u = lambda o: bool(usable(o, EGG))
raw = lambda score: {'id': 9, 'quality_grade': 'research', 'location': '9.2,123.3', 'place_ids': [6873], 'taxon': {'name': 'Slugus slugii', 'rank': 'species'}, 'user': {'login': 'x'},
                     'photos': [{'id': 90, 'url': 'https://x/square.jpg', 'license_code': 'cc-by'}],
                     'annotations': [{'controlled_attribute_id': 1, 'controlled_value_id': 7, 'vote_score': score}]}
print(json.dumps([u(ob(1)), u(ob(2, an=[(1, 7)])), u(ob(3, an=[(22, 30)])), u(ob(4, an=[(1, 8)])), u(ob(5, an=[(1, 2)])),
                  u(ob(6, an=[(17, 19)])), u(trim(raw(-1))), u(trim(raw(0))),
                  [list(p) for p in json.load(open('tools/seaslugs.json'))['photoTarget']['exclude']['annotations']]]))`);
  assert.deepStrictEqual(out, [
    true,
    false, // Life Stage: Egg
    false, // Evidence of Presence: Egg
    true, // a juvenile stays
    true,
    false, // annotated Dead, as for the fish
    true, // an egg annotation voted down does not count (trim keeps vote_score >= 0)
    false,
    [
      [1, 7],
      [22, 30]
    ] // the pairs the tool reads, from the photo target
  ]);
});

test("licence and identity: CC0, CC BY, CC BY-NC only; the first usable photo of a mixed observation; Pierre's own as the fish's (Q386)", () => {
  const out = J(`${OBS}
it = lambda o: (lambda x: x and [x['p'][0], x['p'][2], x['cls'], x['own']])(usable(o, EGG))
P = 'ppericard'
print(json.dumps([[it(ob(1, lic=x)) for x in ('cc0', 'cc-by', 'cc-by-nc', 'cc-by-sa', 'cc-by-nc-sa', 'cc-by-nd', 'cc-by-nc-nd', None)],
                  it(ob(2, lic=['cc-by-sa', 'cc-by-nc', 'cc-by'])), it(ob(3, lic=[None], u=P)), it(ob(4, u=P)),
                  it(ob(5, g='needs_id')), it(ob(6, rk='genus')),
                  it(ob(7, ll=(-8.5, 115.2), inph=False)), it(ob(8, ll=(27.9, 34.3), inph=False)),
                  it(ob(9, g='needs_id', u=P, lic='cc-by-nc')), it(ob(11, g='needs_id', u=P, rk='genus')),
                  it(ob(12, g='needs_id', u=P, rk='subspecies')), it(ob(13, g='needs_id', u=P, an=[(1, 7)])),
                  it(ob(14, g='needs_id', u=P, an=[(17, 19)])), it(ob(15, g='needs_id', u=P, ll=(27.9, 34.3), inph=False)),
                  it(ob(16, g='needs_id', u=P, ll=(-8.5, 115.2), inph=False)), it(ob(17, u=P, lic='cc-by-sa'))]))`);
  assert.deepStrictEqual(out, [
    [[10, 'cc0', 0, false], [10, 'cc-by', 0, false], [10, 'cc-by-nc', 1, false], null, null, null, null, null],
    [21, 'cc-by-nc', 1, false], // the share-alike first photo skipped: the next usable one
    [30, null, 0, true], // Pierre's own photo without a licence: usable, as the fish's (fetch_fish.lic_ok)
    [40, 'cc-by', 0, true], // his licensed Research Grade photo, marked own
    null, // someone else's Needs ID
    null, // genus level
    [70, 'cc-by', 0, false], // abroad in the Indo-West Pacific (Bali)
    null, // abroad outside it (Red Sea)
    [90, 'cc-by-nc', 0, true], // his Needs ID observation identified to the species: usable (Q386); his own ranks as open
    null, // his Needs ID at the genus: not a species photo
    [120, 'cc-by', 0, true], // below the species (a subspecies) counts as the species
    null, // his, annotated Egg: the egg rule holds for him too
    null, // his, annotated Dead
    null, // his abroad outside the Indo-West Pacific
    [160, 'cc-by', 0, true], // his abroad inside it
    null // his share-alike photo: never (lic_ok takes his photo without a licence, never a share-alike one)
  ]);
});

test('one photo per observation: an observation of 3 photos gives one candidate; a photo or an observation is taken once; variety, then licence', () => {
  const out = J(`${OBS}
from collections import Counter
used, taken = set(), set()
items = [usable(o, EGG) for o in (ob(1, n=3, u='a'), ob(2, u='a'), ob(3, u='b', lic='cc-by-nc'), ob(4, u='c'))]
first = pick(items, 3, Counter(), used, taken)
# A photo iNaturalist lets two observations share (5's is 4's), and an observation already taken (1): neither comes again.
again = pick([usable(ob(1, n=3, u='d'), EGG), {**usable(ob(5, u='e'), EGG), 'p': [40, 'x', 'cc-by', 'a']}], 5, Counter(), used, taken)
print(json.dumps([[o['id'] for o in first], [o['p'][0] for o in first], sorted(taken), [o['id'] for o in again]]))`);
  // Observers a, b, c once each before a second one of a: at room 3, a's other observation (2, after 1 in the fixed hash
  // order) is left out, and b's NC one (3) still comes before it.
  assert.deepStrictEqual(out[0].sort(), [1, 3, 4]);
  assert.deepStrictEqual(out[1].sort(), [10, 30, 40]); // observation 1: its first photo only
  assert.deepStrictEqual(out[2].length, 3);
  assert.deepStrictEqual(out[3], []);
  const lic = J(`${OBS}
from collections import Counter
print(json.dumps([o['id'] for o in pick([usable(ob(i, lic=l), EGG) for i, l in ((1, 'cc-by-nc'), (2, 'cc-by-nc'), (3, 'cc0'))], 1, Counter(), set(), set())]))`);
  assert.deepStrictEqual(lic, [3], 'among equals in variety, an open licence first (the last tie-break)');
});

test('fetch_seaslugs.py offline: Philippines first, abroad only when short, the juvenile room, fish-cand.json fields; a rerun changes nothing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slugcand-'));
  const at = x => path.join(dir, x);
  const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'seaslugs.json'), 'utf8')).photoTarget;
  const src = {
    photoTarget: {...T, candidates: 3, perJuvenileForm: 2, juvenile: {'Slugus juvenilis': 'a source'}},
    species: [
      {name: 'Slugus slugii', inat: 601, circle: 1},
      {name: 'Slugus juvenilis', inat: 602, circle: 1},
      {name: 'Slugus later', inat: 603, circle: 2}
    ]
  };
  fs.writeFileSync(at('src.json'), JSON.stringify(src));
  py(
    `${OBS}
from fetch_fish import API, FIELDS, queries, phase_query
d = sys.argv[1]
c = {}
def put(q, obs, f=FIELDS): c[API + q + '&fields=' + f] = {'total': len(obs), 'results': obs}
# 601: in the Philippines two egg observations, a share-alike one, a mixed one (share-alike then NC) and one of 3 photos:
# 2 usable for 3 places, the search read to its end, so abroad: Red Sea (outside the box) and Bali.
put(queries(601)['ph'], [ob(1, an=[(1, 7)]), ob(2, an=[(22, 30)]), ob(3, lic='cc-by-sa'), ob(4, lic=['cc-by-sa', 'cc-by-nc']), ob(5, n=3)])
put(queries(601)['world'], [ob(20, lic='cc0', ll=(27.9, 34.3), inph=False), ob(21, ll=(-8.5, 115.2), inph=False)])
# 602 (a documented juvenile: 3 + 2): adults in the Philippines, one juvenile there (the phase search finds it too), none
# abroad: one juvenile place stays open, never an adult in it; no general search abroad (the Philippines fill the rest).
put(queries(602)['ph'], [ob(30), ob(31, an=[(1, 8)]), ob(32), ob(33), ob(34), ob(35, an=[(1, 8), (1, 7)])])
put(phase_query('juvenile', [602], 'ph'), [ob(31, an=[(1, 8)], tx=[602, 60])], FIELDS + ',taxon.ancestor_ids')
put(phase_query('juvenile', [602], 'world'), [], FIELDS + ',taxon.ancestor_ids')
# Pierre's own search, asked for every species with room for his: none here (his own: the next test).
put(queries(601)['own'], [])
put(queries(602)['own'], [])
json.dump(c, open(d + '/cache.json', 'w'))`,
    dir
  );
  const run = () =>
    execFileSync(
      'python3',
      ['tools/fetch_seaslugs.py', '--offline', '--src', at('src.json'), '--cand', at('cand.json'), '--cache', at('cache.json')],
      {cwd: ROOT, encoding: 'utf8'}
    );
  const log = run();
  const doc = JSON.parse(fs.readFileSync(at('cand.json'), 'utf8')),
    C = doc.cand,
    ids = L => L.map(p => +p.o.split('/').pop()).sort((a, b) => a - b);
  assert.deepStrictEqual(Object.keys(doc), ['v', 'cand']);
  assert.deepStrictEqual(Object.keys(C), ['601', '602'], 'circle 1 only, keyed by iNaturalist taxon id');
  assert.deepStrictEqual(ids(C['601']), [4, 5, 21]);
  // 4: its NC photo (41), not the share-alike one before it; 5: the first of its 3 photos; 21 abroad (Bali), not the Red Sea.
  assert.deepStrictEqual(C['601'].map(p => [p.f, p.lic, p.loc]).sort(), [
    ['seaslug-601-cand-210', 'cc-by', 'world'],
    ['seaslug-601-cand-41', 'cc-by-nc', 'dauin'],
    ['seaslug-601-cand-50', 'cc-by', 'dauin']
  ]);
  // 602: the juvenile 31 in its room, 3 adults; 35 (juvenile but egg-annotated) never.
  assert.strictEqual(C['602'].length, 4);
  assert.ok(ids(C['602']).includes(31) && !ids(C['602']).includes(35));
  assert.deepStrictEqual(C['602'].filter(p => p.st === 'juvenile').length, 1);
  assert.match(log, /Slugus juvenilis\s+4 \/ 5 .*short \{"juvenile": 1\}/);
  // The fields of fish-cand.json (tools/fetch_fish.py record), st only when annotated.
  const FIELDS = ['f', 'a', 'lic', 'o', 't', 'own', 'loc', 'src', 'r'];
  for (const p of [...C['601'], ...C['602']]) {
    assert.deepStrictEqual(
      Object.keys(p).filter(k => k !== 'st'),
      FIELDS
    );
    assert.match(p.src, /\/original\.jpg$/);
    assert.strictEqual(p.r, 1);
  }
  // The file layout: one species per line (tools/datajson.py).
  assert.strictEqual(fs.readFileSync(at('cand.json'), 'utf8').split('\n').length, 8);
  // A rerun asks nothing new (--offline) and writes the same file.
  const before = fs.readFileSync(at('cand.json'), 'utf8');
  run();
  assert.strictEqual(fs.readFileSync(at('cand.json'), 'utf8'), before);
  fs.rmSync(dir, {recursive: true, force: true});
});

test("Pierre's own (Q386, the fish's rule): his Needs ID species photos enter first, on top of a full list up to max, in the target on a new one; --own asks nothing else", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slugown-'));
  const at = x => path.join(dir, x);
  const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'seaslugs.json'), 'utf8')).photoTarget;
  const src = {
    photoTarget: {...T, candidates: 3, max: 7, perJuvenileForm: 0, juvenile: {}},
    species: [
      {name: 'Slugus fullus', inat: 701, circle: 1},
      {name: 'Slugus novus', inat: 702, circle: 1}
    ]
  };
  fs.writeFileSync(at('src.json'), JSON.stringify(src));
  // 701 is already full (3 = its target), filled before the rule: one of them his own Research Grade observation (803).
  const old = i => ({
    f: `seaslug-701-cand-${i * 10}`,
    a: '(c) x',
    lic: 'cc-by',
    o: `https://www.inaturalist.org/observations/${i}`,
    t: 'Slugus fullus',
    own: i === 803,
    loc: 'ph',
    src: 'x',
    r: 1
  });
  fs.writeFileSync(at('cand.json'), JSON.stringify({v: 1, cand: {701: [801, 802, 803].map(old)}}));
  py(
    `${OBS}
from fetch_fish import API, FIELDS, queries
d = sys.argv[1]
c = {}
def put(q, obs): c[API + q + '&fields=' + FIELDS] = {'total': len(obs), 'results': obs}
P = 'ppericard'
# 701, his search: Needs ID at the species (taken, ni), Research Grade (taken), Needs ID at the genus (no), a photo
# without a licence (taken, lic "own"), annotated Egg (no), already a candidate (803: never twice).
put(queries(701)['own'], [ob(901, u=P, g='needs_id'), ob(902, u=P), ob(903, u=P, g='needs_id', rk='genus'),
                          ob(904, u=P, g='needs_id', lic=[None]), ob(905, u=P, g='needs_id', an=[(1, 7)]), ob(803, u=P)])
# 702, a new list: one of his Needs ID, then the others fill the target of 3 (his count in it).
put(queries(702)['own'], [ob(911, u=P, g='needs_id')])
json.dump(c, open(d + '/cache.json', 'w'))
# The general search of 702, for the second run only: the --own run must not ask it.
c2 = dict(c)
c2[API + queries(702)['ph'] + '&fields=' + FIELDS] = {'total': 3, 'results': [ob(921), ob(922), ob(923)]}
json.dump(c2, open(d + '/cache2.json', 'w'))`,
    dir
  );
  const run = (cache, ...more) =>
    execFileSync(
      'python3',
      ['tools/fetch_seaslugs.py', '--offline', '--src', at('src.json'), '--cand', at('cand.json'), '--cache', at(cache), ...more],
      {cwd: ROOT, encoding: 'utf8'}
    );
  const ids = L => L.map(p => +p.o.split('/').pop());
  // 1. --own: his search only (the general search of 702 is not in this cache: --offline would stop on it).
  const log = run('cache.json', '--own');
  let C = JSON.parse(fs.readFileSync(at('cand.json'), 'utf8')).cand;
  assert.deepStrictEqual(ids(C['701']).sort(), [801, 802, 803, 901, 902, 904], 'on top of the full list, up to max; nothing removed');
  assert.deepStrictEqual(ids(C['702']), [911]);
  const by = Object.fromEntries([...C['701'], ...C['702']].map(p => [+p.o.split('/').pop(), p]));
  assert.strictEqual(by[901].ni, 1, 'his Needs ID observation is marked, as fish-cand.json (ni)');
  assert.strictEqual(by[911].ni, 1);
  assert.strictEqual(by[902].ni, undefined, 'his Research Grade one is not');
  assert.strictEqual(by[904].lic, 'own', 'his photo without a licence, as the fish');
  for (const i of [901, 902, 904, 911]) assert.strictEqual(by[i].own, true);
  assert.deepStrictEqual(Object.keys(by[901]), ['f', 'a', 'lic', 'o', 't', 'own', 'loc', 'src', 'r', 'ni']);
  assert.match(log, /Slugus fullus\s+6 \/ 3 .*Pierre's own 4 \(\+3\)/);
  assert.match(log, /Pierre's own added this run: 4/);
  // 2. The normal run: 702's others fill its target of 3 around his one; 701 has no room under its target.
  run('cache2.json');
  C = JSON.parse(fs.readFileSync(at('cand.json'), 'utf8')).cand;
  assert.strictEqual(C['702'].length, 3);
  assert.strictEqual(C['702'].filter(p => p.own).length, 1, 'his counts in the target: two others, not three');
  assert.strictEqual(C['701'].length, 6);
  // A rerun writes the same file.
  const before = fs.readFileSync(at('cand.json'), 'utf8');
  run('cache2.json');
  assert.strictEqual(fs.readFileSync(at('cand.json'), 'utf8'), before);
  fs.rmSync(dir, {recursive: true, force: true});
});
