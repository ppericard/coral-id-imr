// Fish candidate photos (tools/fetch_fish.py, fish-cand.json, core.js fishState; Pierre, 2026-11-03): sources nearest
// first and abroad only when the Philippines are exhausted, free licences first, Pierre's own species-level observations
// confirmed (AGENTS.md rule 6a), the pre-sort's sure decisions with 1 in 20 checked. Offline fixtures only: nothing here
// asks iNaturalist (the whole script runs on a fixture cache with --offline and --plan). Needs python3.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const {fishCheck, fishVerdict, fishMine, fishAgree, fishState, FISHCHK} = require('../core.js');
const ROOT = path.join(__dirname, '..');
const py = (code, ...args) =>
  execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\nfrom fetch_fish import *\n${code}`, ...args], {
    cwd: ROOT,
    encoding: 'utf8'
  });
const J = (code, ...a) => JSON.parse(py(code, ...a));

// An observation as the cache keeps it (fetch_fish.trim): ll = [lat, lng], inph = in the Philippines.
const OBS = `
def ob(i, lic='cc-by', u=None, g='research', ll=(9.2, 123.3), inph=True, an=(), rk='species', n=1):
    return {'id': i, 'g': g, 'll': list(ll) if ll else None, 'inph': inph, 't': 'Fishus fishii', 'rk': rk, 'u': u or f'user{i}', 'an': [list(a) for a in an],
            'ph': [[i * 10 + k, f'https://inaturalist-open-data.s3.amazonaws.com/photos/{i * 10 + k}/square.jpg', lic, f'(c) u{i}'] for k in range(n)]}
`;

test('licence classes: CC0 / CC BY, then Pierre own, then CC BY-SA, then NC', () => {
  const out = J(
    `print(json.dumps([lic_class('cc0', False), lic_class('cc-by', False), lic_class('cc-by-nc', True), lic_class(None, True), lic_class('cc-by-sa', False), lic_class('cc-by-nc', False), lic_class('cc-by-nc-sa', False), lic_class('cc-by', True)]))`
  );
  assert.deepStrictEqual(out, [0, 0, 1, 1, 2, 3, 3, 0]);
});

test('tiers: within 40 km of Dauin, within 250 km in the Philippines, the rest of the country, abroad', () => {
  const out = J(
    `print(json.dumps([tier_of({'ll': [9.25, 123.3], 'inph': True}), tier_of({'ll': [10.3, 123.9], 'inph': True}), tier_of({'ll': [14.6, 121.0], 'inph': True}), tier_of({'ll': [-8.5, 115.2], 'inph': False}), tier_of({'ll': None, 'inph': True})]))`
  );
  assert.deepStrictEqual(out, ['dauin', 'region', 'ph', 'world', 'ph']);
});

test('usable observations: Research Grade, or Pierre own even Needs ID; no dead fish, no ND, no unlicensed photo of others', () => {
  const out = J(`${OBS}
u = lambda o, used=set(), ex=set(): (lambda x: x and [x['cls'], x['tier'], x['own'], len(x['P']), x['st']])(usable_obs(o, used, ex))
print(json.dumps([
  u(ob(1)),
  u(ob(2, g='needs_id')),                        # someone else's Needs ID: not confirmed
  u(ob(3, u='ppericard', g='needs_id', lic='cc-by-nc')),  # Pierre's species-level Needs ID: confirmed (rule 6a)
  u(ob(4, u='ppericard', lic=None)),             # his own photo without licence: his
  u(ob(5, lic=None)),                            # another observer's photo without licence: never
  u(ob(6, lic='cc-by-nd')),                      # no derivatives: never
  u(ob(7, an=[(17, 19)])),                       # annotated Dead (fish market): never
  u(ob(8, an=[(1, 8), (9, 11)])),                # life stage and sex kept as a hint
  u(ob(9, n=7)),                                 # at most PER_OBS photos
  u(ob(10, n=2), used={'100'}),                  # a photo already a candidate
  u(ob(11, n=1), ex={'110'}),                    # an excluded photo
  u(ob(12, rk='genus')),
]))`);
  assert.deepStrictEqual(out, [
    [0, 'dauin', false, 1, ''],
    null,
    [1, 'dauin', true, 1, ''],
    [1, 'dauin', true, 1, ''],
    null,
    null,
    null,
    [0, 'dauin', false, 1, 'juvenile/male'],
    [0, 'dauin', false, 4, ''],
    [0, 'dauin', false, 1, ''],
    null,
    null
  ]);
});

test('select: free licences first across the Philippines, nearest first within a licence; NC only to fill', () => {
  const out = J(`${OBS}
it = lambda *a, **k: usable_obs(ob(*a, **k), set(), set())
pools = {'dauin': [it(1, 'cc-by-nc'), it(2, 'cc-by'), it(3, 'cc-by-nc', u='ppericard')], 'region': [it(4, 'cc0', ll=(10.3, 123.9))], 'ph': [it(5, 'cc-by', ll=(14.6, 121.0)), it(6, 'cc-by-sa', ll=(14.6, 121.0))]}
W = lambda: [{**it(7, 'cc0', ll=(-8.5, 115.2), inph=False), 'tier': 'world'}]
print(json.dumps([[o['id'] for o in select(pools, r, {}, None, W)] for r in (3, 5, 6, 9)]))`);
  assert.deepStrictEqual(out, [
    [2, 4, 5], // CC BY Dauin, CC0 region, CC BY Luzon: the free ones, nearest first
    [2, 4, 5, 3, 6], // then Pierre's own, then CC BY-SA
    [2, 4, 5, 3, 6, 1], // NC only to fill the gap
    [2, 4, 5, 3, 6, 1, 7] // the Philippines exhausted: abroad, whatever the room left
  ]);
});

test('select: abroad never while a Philippine search has more than it read, and never fetched when not needed', () => {
  const out = J(`${OBS}
it = lambda *a, **k: usable_obs(ob(*a, **k), set(), set())
asked = []
def W():
    asked.append(1)
    return [{**it(7, ll=(-8.5, 115.2), inph=False), 'tier': 'world'}]
pools = {'dauin': [it(1)]}
a = [o['id'] for o in select(pools, 5, {'ph': True}, None, W)]
b = [o['id'] for o in select(pools, 1, {}, None, W)]
n1 = len(asked)
c = [o['id'] for o in select(pools, 5, {}, None, W)]
print(json.dumps([a, b, n1, c, len(asked)]))`);
  assert.deepStrictEqual(out, [[1], [1], 0, [1, 7], 1]);
});

test('select: variety, the least represented observer and life stage first', () => {
  const out = J(`${OBS}
it = lambda *a, **k: usable_obs(ob(*a, **k), set(), set())
pools = {'dauin': [it(1, u='a'), it(2, u='a'), it(3, u='a', an=[(1, 8)]), it(4, u='b'), it(5, u='c')]}
a = sorted(o['u'] for o in select(pools, 3, {}))
pools = {'dauin': [it(1, u='a'), it(2, u='b'), it(3, u='c', an=[(1, 8)])]}
from collections import Counter
n = Counter({('s', ''): 5})
print(json.dumps([a, [o['id'] for o in select(pools, 1, {}, n)]]))`);
  assert.deepStrictEqual(out[0], ['a', 'b', 'c']);
  assert.deepStrictEqual(out[1], [3]); // the juvenile, when adults are already plenty
});

test('species of the game: circle 1 in teaching order, out species and other circles left out, --only by species or entry', () => {
  const fish = {
    species: [
      {id: 's1', name: 'A a', inat: 1, circle: 1},
      {id: 's2', name: 'A b', inat: 2, out: 'not confirmed in the Philippines on iNaturalist'},
      {id: 's3', name: 'B a', inat: 3, circle: 1},
      {id: 's4', name: 'C a', inat: 4, circle: 3}
    ],
    teach: [
      {id: 't1', circle: 1, species: ['s3', 's1', 's2']},
      {id: 't2', circle: 3, species: ['s4']}
    ]
  };
  const out = J(
    `f = json.loads(sys.argv[1]); L = lambda c, o=(): [s['id'] for s, t in species_list(f, c, set(o))]\nprint(json.dumps([L({1}), L({1, 3}), L({1}, ['t1']), L({1}, ['s1'])]))`,
    JSON.stringify(fish)
  );
  assert.deepStrictEqual(out, [['s3', 's1'], ['s3', 's1', 's4'], ['s3', 's1'], ['s1']]);
});

test('room: what Pierre rejected, excluded or sent elsewhere and what the pre-sort set aside for sure frees it', () => {
  const out = J(`
cur = {'exclude': {'acropora-cand-55': 'x'}, 'fish': {'add': {'a': 1, 'e': 1}, 'seen': {'b': 1}, 'exclude': {'fish-s1-cand-77': 'excluded'}, 'out': {'c': 'x'}}}
sug = {'fish': {'d': {'g': 'exclude', 'n': 'market'}, 'e': {'k': 'dup'}, 'f': {'k': 'dup', 'u': ['keep'], 'n': '?'}, 'g': {'m': 1}, 'h': {'k': 'best'}}}
gone, excl = state(cur, sug)
print(json.dumps([[x for x in 'abcdefgh' if gone(x)], sorted(excl)]))`);
  assert.deepStrictEqual(out, [
    ['b', 'c', 'd', 'g'],
    ['55', '77']
  ]);
});

test('core.js: the pass decides only when sure; python sure_out is its "out"', () => {
  const J0 = [
    null,
    {k: 'best', q: 1},
    {k: 'alt', c: 'blue'},
    {k: 'dup'},
    {g: 'exclude'},
    {g: 'not'},
    {g: 's123'},
    {k: 'best', m: 1},
    {k: 'best', u: ['phase']},
    {g: 'exclude', u: ['species']}
  ];
  const v = J0.map(fishVerdict);
  assert.deepStrictEqual(v, [null, 'in', 'in', 'out', 'out', 'out', 'out', 'out', null, null]);
  const pyv = J(`print(json.dumps([sure_out(j) for j in json.loads(sys.argv[1])]))`, JSON.stringify(J0));
  assert.deepStrictEqual(
    pyv,
    v.map(x => x === 'out')
  );
});

test('core.js: 1 candidate in 20 is a check; Pierre decides first; auto off per decision when agreement drops', () => {
  const fs0 = Array.from({length: 2000}, (_, i) => `fish-s1-cand-${1000 + i}`),
    n = fs0.filter(fishCheck).length;
  assert.ok(Math.abs(n / fs0.length - 1 / FISHCHK.EVERY) < 0.015, `check share ${n / fs0.length}`);
  const chk = fs0.find(fishCheck),
    auto = fs0.find(f => !fishCheck(f));
  assert.strictEqual(fishState(auto, {k: 'best'}, {}), 'auto-in');
  assert.strictEqual(fishState(auto, {k: 'dup'}, {}), 'auto-out');
  assert.strictEqual(fishState(chk, {k: 'best'}, {}), 'check');
  assert.strictEqual(fishState(auto, {k: 'best', u: ['quality']}, {}), 'queue');
  assert.strictEqual(fishState(auto, null, {}), 'queue');
  assert.strictEqual(fishState(auto, {k: 'best'}, {seen: {[auto]: 1}}), 'out');
  assert.strictEqual(fishState(auto, {g: 'not'}, {add: {[auto]: 1}}), 'in');
  assert.strictEqual(fishState(auto, {k: 'best'}, {}, {in: false, out: true}), 'queue');
  assert.strictEqual(fishMine('x', {exclude: {x: 'excluded'}, add: {x: 1}}), 'out');
  // Agreement: 10 'in' decisions of the pass, Pierre rejected 2 of them: 80% < 90%, auto-in off; 'out' too few to judge.
  const S = {},
    F = {add: {}, seen: {}};
  fs0.slice(0, 10).forEach((f, i) => {
    S[f] = {k: 'best'};
    (i < 2 ? F.seen : F.add)[f] = 1;
  });
  fs0.slice(10, 13).forEach(f => {
    S[f] = {g: 'exclude'};
    F.add[f] = 1;
  });
  const A = fishAgree(fs0, S, F);
  assert.deepStrictEqual(
    [A.in, A.out, A.auto],
    [
      {n: 10, ok: 8},
      {n: 3, ok: 0},
      {in: false, out: true}
    ]
  );
});

test('fetch_fish.py offline on a fixture cache: tiers, licences, presence, record shape; --plan writes nothing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fishphotos-'));
  const fish = {
    species: [
      {id: 's1', name: 'Fishus fishii', inat: 501, circle: 1, present: {dauin: 3, dauinNI: 0, ph: true, own: 1}},
      {id: 's2', name: 'Fishus rarus', inat: 502, circle: 1, present: {dauin: 0, dauinNI: 1, ph: true}},
      {id: 's3', name: 'Fishus nowhere', inat: 503, out: 'not confirmed in the Philippines on iNaturalist', present: {ph: false}}
    ],
    teach: [{id: 't1', name: 'Fishes', circle: 1, species: ['s1', 's2', 's3']}]
  };
  fs.writeFileSync(path.join(dir, 'fish.json'), JSON.stringify(fish));
  fs.writeFileSync(path.join(dir, 'cur.json'), JSON.stringify({fish: {exclude: {'fish-s1-cand-9990': 'excluded'}}}));
  // The cache: s1 has Dauin NC, a free one in Luzon, Pierre's own Needs ID; s2 has one Philippine photo, so abroad fills.
  py(
    `${OBS}
d = sys.argv[1]
c = {}
def put(q, obs, total=None): c[API + q + '&fields=' + FIELDS] = {'total': len(obs) if total is None else total, 'results': obs}
Q = queries(501)
put(Q['own'], [ob(1, u='ppericard', g='needs_id', lic='cc-by-nc')])
put(Q['dauin'], [ob(2, lic='cc-by-nc'), ob(3, lic='cc-by-nc', n=2), ob(999, lic='cc-by')])
put(Q['region'], [ob(2, lic='cc-by-nc'), ob(3, lic='cc-by-nc', n=2), ob(999, lic='cc-by')])
put(Q['ph'], [ob(2, lic='cc-by-nc'), ob(3, lic='cc-by-nc', n=2), ob(999, lic='cc-by'), ob(4, lic='cc-by', ll=(14.6, 121.0))])
Q = queries(502)
put(Q['dauin'], [])
put(Q['region'], [])
put(Q['ph'], [ob(5, lic='cc0', ll=(14.6, 121.0))])
put(Q['world'], [ob(6, lic='cc-by-nc', ll=(-8.5, 115.2), inph=False), ob(7, lic='cc-by', ll=(-8.5, 115.2), inph=False)])
json.dump(c, open(d + '/cache.json', 'w'))`,
    dir
  );
  const args = [
    '--fish',
    path.join(dir, 'fish.json'),
    '--cand',
    path.join(dir, 'fish-cand.json'),
    '--cur',
    path.join(dir, 'cur.json'),
    '--suggest',
    path.join(dir, 'none.json'),
    '--cache',
    path.join(dir, 'cache.json'),
    '--cap',
    '3'
  ];
  const run = (...a) => execFileSync('python3', ['tools/fetch_fish.py', ...args, ...a], {cwd: ROOT, encoding: 'utf8'});
  const plan = JSON.parse(run('--plan'));
  assert.strictEqual(plan.missing, 0);
  assert.deepStrictEqual(plan.species.s1.add, {ph: 1, dauin: 2}); // the free Luzon one, Pierre's own, then one NC
  assert.deepStrictEqual(plan.species.s2.add, {ph: 1, world: 2}); // the Philippines exhausted: abroad, CC BY first
  assert.ok(!plan.species.s3, 'a species out of the game gets nothing');
  assert.ok(!fs.existsSync(path.join(dir, 'fish-cand.json')), '--plan writes nothing');
  run('--offline');
  const C = JSON.parse(fs.readFileSync(path.join(dir, 'fish-cand.json'), 'utf8'));
  assert.strictEqual(C.v, 1);
  assert.deepStrictEqual(Object.keys(C.cand), ['s1', 's2']);
  const s1 = C.cand.s1;
  assert.deepStrictEqual(
    s1.map(p => [p.o.split('/').pop(), p.lic, p.loc, p.own]),
    [
      ['4', 'cc-by', 'ph', false],
      ['1', 'cc-by-nc', 'dauin', true],
      // one NC observation of the two (fixed hash order), with all its photos
      ['3', 'cc-by-nc', 'dauin', false],
      ['3', 'cc-by-nc', 'dauin', false]
    ]
  );
  assert.strictEqual(s1[1].ni, 1, "Pierre's Needs ID observation is marked, and kept (rule 6a)");
  assert.deepStrictEqual(Object.keys(s1[0]), ['f', 'a', 'lic', 'o', 't', 'own', 'loc', 'src', 'r']);
  assert.match(s1[0].f, /^fish-s1-cand-40$/);
  assert.match(s1[0].src, /\/photos\/40\/original\.jpg$/);
  assert.ok(!JSON.stringify(C).includes('9990'), 'an excluded photo never comes back');
  assert.deepStrictEqual(
    C.cand.s2.map(p => [p.lic, p.loc]),
    [
      ['cc0', 'ph'],
      ['cc-by', 'world'],
      ['cc-by-nc', 'world']
    ]
  );
  // A rerun keeps what is there and adds nothing (the cap counts usable observations); one species per line.
  run('--offline');
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(dir, 'fish-cand.json'), 'utf8')), C);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'fish-cand.json'), 'utf8').split('\n').length, 8);
  fs.rmSync(dir, {recursive: true, force: true});
});
