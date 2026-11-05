// Fish candidate photos (tools/fetch_fish.py, fish-cand.json, tools/judging_fish.py, autosort.js fishSure; Pierre,
// 2026-11-03, settled 2026-11-04): sources nearest first and abroad only when the Philippines are exhausted, free licences
// first, Pierre's own species-level observations confirmed (AGENTS.md rule 6a), the pre-sort's sure decisions, the
// stricter "confirmed near Dauin" rule (tools/build_fish.py near_dauin). Offline fixtures only: nothing here
// asks iNaturalist (the whole script runs on a fixture cache with --offline and --plan). Needs python3.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const {fishSure, autoCheck, AUTO} = require('../autosort.js');
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

test('licences: Pierre own first whatever its licence, then CC0 / CC BY, then NC; never share-alike or ND', () => {
  const out = J(
    `print(json.dumps([[lic_class('cc0', False), lic_class('cc-by', False), lic_class('cc-by-nc', True), lic_class(None, True), lic_class('cc-by', True), lic_class('cc-by-nc', False)], [lic_ok(x, False) for x in ('cc0', 'cc-by', 'cc-by-nc', 'cc-by-sa', 'cc-by-nc-sa', 'cc-by-nd', 'cc-by-nc-nd', None)], [lic_ok(None, True), lic_ok('cc-by-sa', True)]]))`
  );
  assert.deepStrictEqual(out, [
    [1, 1, 0, 0, 0, 2],
    [true, true, true, false, false, false, false, false],
    [true, false]
  ]);
});

test('tiers: within 40 km of Dauin, within 250 km in the Philippines, the rest of the country, abroad', () => {
  const out = J(
    `print(json.dumps([tier_of({'ll': [9.25, 123.3], 'inph': True}), tier_of({'ll': [10.3, 123.9], 'inph': True}), tier_of({'ll': [14.6, 121.0], 'inph': True}), tier_of({'ll': [-8.5, 115.2], 'inph': False}), tier_of({'ll': None, 'inph': True})]))`
  );
  assert.deepStrictEqual(out, ['dauin', 'region', 'ph', 'world', 'ph']);
});

test('abroad = the Indo-West Pacific only (Pierre: regional colour forms): Red Sea, Hawaii, Maldives, Fiji dropped, Pierre own too', () => {
  const out = J(`${OBS}
pts = {'Red Sea': (27.9, 34.3), 'Hawaii': (20.8, -156.3), 'Maldives': (4.2, 73.5), 'Fiji': (-17.7, 178.1), 'Bali': (-8.5, 115.2),
       'Okinawa': (26.3, 127.8), 'Great Barrier Reef': (-16.9, 145.8), 'Raja Ampat': (-0.5, 130.5), 'Andaman Sea': (7.9, 98.3)}
u = lambda ll, **k: bool(usable_obs(ob(1, ll=ll, inph=False, **k), set(), set()))
print(json.dumps([{k: u(v) for k, v in pts.items()}, u(pts['Red Sea'], u='ppericard'), u(pts['Bali'], u='ppericard'), u(None),
                  'swlat=-30&swlng=90&nelat=30&nelng=170' in queries(1)['world'], 'swlat' in queries(1)['ph']]))`);
  assert.deepStrictEqual(out, [
    {
      'Red Sea': false,
      Hawaii: false,
      Maldives: false,
      Fiji: false,
      Bali: true,
      Okinawa: true,
      'Great Barrier Reef': true,
      'Raja Ampat': true,
      'Andaman Sea': true
    },
    false, // Pierre's own in the Red Sea: dropped too
    true,
    false, // abroad without coordinates: not known to be in the region
    true, // the search abroad asks for the box
    false // the Philippine ones do not need it
  ]);
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
  u(ob(13, lic='cc-by-nc-nd')),                  # NC and no derivatives: never (8 such photos came in once)
  u(ob(14, lic='cc-by-sa')),                     # share-alike: never (Pierre: it would block a commercial reuse)
  u(ob(15, lic='cc-by-nc-sa')),
]))`);
  assert.deepStrictEqual(out, [
    [1, 'dauin', false, 1, ''],
    null,
    [0, 'dauin', true, 1, ''],
    [0, 'dauin', true, 1, ''],
    null,
    null,
    null,
    [1, 'dauin', false, 1, 'juvenile/male'],
    [1, 'dauin', false, 4, ''],
    [1, 'dauin', false, 1, ''],
    null,
    null,
    null,
    null,
    null
  ]);
});

test('select, a species not confirmed near Dauin: Pierre own first, then free licences across the Philippines nearest first, NC to fill, abroad last', () => {
  const out = J(`${OBS}
it = lambda *a, **k: usable_obs(ob(*a, **k), set(), set())
pools = {'dauin': [it(1, 'cc-by-nc'), it(2, 'cc-by'), it(3, 'cc-by-nc', u='ppericard')], 'region': [it(4, 'cc0', ll=(10.3, 123.9))], 'ph': [it(5, 'cc-by', ll=(14.6, 121.0)), it(6, 'cc-by-nc', ll=(14.6, 121.0))],
         'world': [it(8, 'cc-by-nc', u='ppericard', ll=(-8.5, 115.2), inph=False)]}
W = lambda: [{**it(7, 'cc0', ll=(-8.5, 115.2), inph=False), 'tier': 'world'}]
print(json.dumps([[o['id'] for o in select(pools, r, {}, None, W)] for r in (1, 2, 5, 7, 9)]))`);
  assert.deepStrictEqual(out, [
    [3], // Pierre's own first, whatever its licence
    [3, 8], // his own abroad too
    [3, 8, 2, 4, 5], // then CC BY Dauin, CC0 region, CC BY Luzon: the free ones, nearest first
    [3, 8, 2, 4, 5, 1, 6], // NC only to fill, nearest first
    [3, 8, 2, 4, 5, 1, 6, 7] // the Philippines exhausted: abroad
  ]);
});

test('select, a species confirmed near Dauin: Pierre own first, then from anywhere by licence, not by distance', () => {
  const out = J(`${OBS}
it = lambda *a, **k: usable_obs(ob(*a, **k), set(), set())
pools = {'dauin': [it(1, 'cc-by-nc'), it(3, 'cc-by-nc', u='ppericard')], 'ph': [it(5, 'cc-by-nc', ll=(14.6, 121.0))]}
W = lambda: [{**it(7, 'cc0', ll=(-8.5, 115.2), inph=False), 'tier': 'world'}]
print(json.dumps([[o['id'] for o in select(pools, r, {'ph': True}, None, W, anywhere=True)] for r in (2, 4)]))`);
  // The CC0 photo from abroad comes before the NC ones from Dauin, even while the Philippines have more.
  assert.deepStrictEqual(out[0], [3, 7]);
  assert.deepStrictEqual(out[1].slice(0, 2), [3, 7]);
  assert.deepStrictEqual(out[1].slice(2).sort(), [1, 5]);
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
sug = {'fish': {'d': {'jt': 'p1g0sm1a', 'e': 3, 'k': 'best'}, 'e': {'k': 'dup'}, 'f': {'k': 'dup', 'u': ['keep'], 'n': '?'}, 'g': {'jt': 'p1g0smx', 'e': 1, 'k': 'best'}, 'h': {'jt': 'p1g0sm1', 'e': 5, 'k': 'best'}}}
gone, excl = state(cur, sug)
print(json.dumps([[x for x in 'abcdefgh' if gone(x)], sorted(excl)]))`);
  assert.deepStrictEqual(out, [
    ['b', 'c', 'd', 'g'],
    ['55', '77']
  ]);
});

test('autosort.js fishSure: one visual vocabulary, sure decisions only; hard photos go in; python sure_out is its rejects', () => {
  // suggest.json "fish": jt the rubric's tags after the caps (judging/FISH.md), e the ease, k best / alt / dup.
  const J0 = [
    null,
    {jt: 'p1g0sm1', e: 5, k: 'best'},
    {jt: 'o1d3bs1', e: 1, k: 'alt', ph: 'terminal'}, // monochrome, blurred, small: hard, still in (SVS video frames)
    {jt: 'p1g0sl1j', e: 2, k: 'best', c: [0.1, 0, 0.9, 1]},
    {jt: 'p1g0sm1', e: 4, k: 'dup'},
    {jt: 'p1g0smx', e: 1, k: 'best'}, // which fish is asked about?
    {jt: 'p1g0sm1a', e: 3, k: 'best'}, // out of the water
    {jt: 'p1g0sm1', e: 4, k: 'best', u: ['code'], n: '?'},
    {jt: 'p1g0sm1', k: 'best'}, // no ease
    {jt: 'bad', e: 3, k: 'best'},
    {g: 's123', k: 'best'} // the old "not this species" field: never read (the species is the experts' identification)
  ];
  const S = J0.map(fishSure);
  assert.deepStrictEqual(S, [
    null,
    {keep: 'add', tags: 'p1g0sm1', ease: 5, phase: null, crop: null},
    {keep: 'add', tags: 'o1d3bs1', ease: 1, phase: 'terminal', crop: null},
    {keep: 'add', tags: 'p1g0sl1j', ease: 2, phase: null, crop: [0.1, 0, 0.9, 1]},
    {keep: 'reject', why: 'dup'},
    {keep: 'reject', why: 'unclear'},
    {keep: 'reject', why: 'out of water'},
    null,
    null,
    null,
    null
  ]);
  // fetch_fish.py frees the room of what the pass sets aside for sure: exactly fishSure's rejects.
  const pyv = J(`print(json.dumps([sure_out(j) for j in json.loads(sys.argv[1])]))`, JSON.stringify(J0));
  assert.deepStrictEqual(
    pyv,
    S.map(x => !!x && x.keep === 'reject')
  );
  // The Checks: the coral sampler, 1 candidate in AUTO.every, the same for fish ids.
  const fs0 = Array.from({length: 2000}, (_, i) => `fish-s1-cand-${1000 + i}`),
    n = fs0.filter(autoCheck).length;
  assert.ok(Math.abs(n / fs0.length - 1 / AUTO.every) < 0.015, `check share ${n / fs0.length}`);
});

test('judging_fish.py: the rubric code of judging/FISH.md, its caps, keep, phase and crop; never a species judgement', () => {
  const out = J(
    `import judging_fish as JF
JF.SP = {'s1': {'id': 's1', 'name': 'Fishus fishii'}}
JF.ENTRY = {'s1': {'id': 't1', 'dimorph': True, 'juv': {'cls': 'C'}}}
JF.CUR = {'seen': {'fish-s1-cand-30': 1}}
JF.CAND = {'s1': [{'f': f'fish-s1-cand-{i}', 'o': f'obs{i // 20}'} for i in (10, 11, 20, 30)]}
files = {
  'good': {'photos': {'fish-s1-cand-10': {'code': 'p1g0sm1j5', 'keep': 'best', 'phase': 'female'},
                      'fish-s1-cand-11': {'code': 'o1g2sm14', 'keep': 'alt', 'crop': [0.2, 0.1, 0.8, 0.9]},
                      'fish-s1-cand-20': {'code': 'p1g0sl15', 'keep': 'best', 'unsure': ['crop'], 'note': 'tail cut?'}}},
  'bad': {'species': 's1', 'photos': {'fish-s1-cand-10': {'code': 'p1g0sm19', 'keep': 'best', 'phase': 'adult', 'crop': [0.5, 0, 0.4, 1]},
                                       'fish-s1-cand-11': {'code': 'p1g0sm14', 'keep': 'best', 'species': 'not', 'quality': 2},
                                       'fish-s1-cand-30': {'code': 'p1g0sm14', 'keep': 'best'}}},
}
JF.load = lambda p, d=None: files[mode] if p.startswith('judging/fish/') else d
mode = 'good'; E1, j = JF.check('s1')
mode = 'bad'; E2, _ = JF.check('s1')
print(json.dumps([E1, [JF.entry('s1', x) for x in j['photos'].values()], E2]))`
  );
  const [E1, entries, E2] = out;
  assert.deepStrictEqual(E1, []);
  // The caps of tools/fish_judge.py: a juvenile of a class-C entry at most 2, strong colour loss at most 3; the phase
  // flag p of a dimorph entry added, capping nothing.
  assert.deepStrictEqual(entries, [
    {jt: 'p1g0sm1jp', e: 2, k: 'best', ph: 'female'},
    {jt: 'o1g2sm1p', e: 3, k: 'alt', c: [0.2, 0.1, 0.8, 0.9]}, // the crop as proposed, as the game photos'
    {jt: 'p1g0sl1p', e: 5, k: 'best', u: ['crop'], n: 'tail cut?'}
  ]);
  const bad = E2.join('\n');
  assert.match(bad, /unknown top-level keys \['species'\]/);
  assert.match(bad, /code must follow judging\/FISH.md/);
  assert.match(bad, /phase is one of/);
  assert.match(bad, /crop must be \[left, top, right, bottom\]/);
  assert.match(bad, /unknown fields \['quality', 'species'\]/); // no species judgement, no old fields (rule 24b)
  assert.match(bad, /fish-s1-cand-30: not a candidate waiting/); // Pierre rejected it
  assert.match(bad, /1 candidate\(s\) not judged yet/);
  assert.match(bad, /2 photos marked best/);
});

test('confirmed near Dauin (build_fish near_dauin): 2+ Research Grade observers or the IMR list; one observer is not enough, Pierre included', () => {
  const out = J(
    `from build_fish import near_dauin\nprint(json.dumps([near_dauin(1), near_dauin(0), near_dauin(2), near_dauin(2, True), near_dauin(1, True)]))`
  );
  // A single Research Grade observation (one observer) no longer opens the whole region (Pierre, 2026-11-03); since
  // 2026-11-04 Pierre is one observer like anyone (AGENTS.md rule 6g): his own observation there is no reason by itself.
  // The reasons are recorded (present.nearBy).
  assert.deepStrictEqual(out, [[], [], ['observers'], ['observers', 'imr'], ['imr']]);
  // fish.json: every species has near, nearBy and dauinU (their agreement with the rule: tests/fish.test.js).
  const F = JSON.parse(fs.readFileSync(path.join(ROOT, 'fish.json'), 'utf8'));
  F.species.forEach(s => {
    const p = s.present || {};
    if (!s.inat) return;
    assert.ok(typeof p.near === 'boolean' && Array.isArray(p.nearBy) && Number.isInteger(p.dauinU), `${s.id} has near, nearBy, dauinU`);
  });
});

test('select: a photo shared by several observations is taken once; an observation left without a photo takes no room', () => {
  const out = J(`${OBS}
it = lambda *a, **k: usable_obs(ob(*a, **k), set(), set())
a, b, c = it(1, u='a', n=2), it(2, u='b'), it(3, u='c')
b['P'] = [a['P'][0]]                 # 2 holds only a photo of 1
c['P'] = [a['P'][1], c['P'][0]]      # 3 shares one photo of 1 and has one of its own
claimed = {'999'}
from collections import Counter
T = select({'dauin': [a, b, c]}, 2, {}, Counter({('u', 'b'): 1, ('u', 'c'): 1}), claimed=claimed)
print(json.dumps([[o['id'] for o in T], [[p[0] for p in o['P']] for o in T], sorted(claimed)]))`);
  // 1 first (its observer has none yet) with both its photos; 2, left with none, is skipped without taking the second
  // slot; 3 keeps only its own photo.
  assert.deepStrictEqual(out[0].sort(), [1, 3]);
  assert.deepStrictEqual(out[1].flat().sort(), [10, 11, 30]);
  assert.deepStrictEqual(out[2], ['10', '11', '30', '999']);
});

test('fish-cand.json: every candidate photo once (one photo can belong to several iNaturalist observations)', () => {
  const C = JSON.parse(fs.readFileSync(path.join(ROOT, 'fish-cand.json'), 'utf8')).cand,
    ids = Object.values(C).flatMap(L => L.map(p => p.f.split('-').pop())),
    dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  assert.deepStrictEqual(dup, []);
});

test('fetch_fish.py offline on a fixture cache: tiers, licences, presence, record shape; --plan writes nothing', () => {
  // The cap counts photos (Pierre, 2026-11-05, Q36); --cap 3 here: one fixed cap for every species. Up to 4 photos per observation.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fishphotos-'));
  const fish = {
    species: [
      {id: 's1', name: 'Fishus fishii', inat: 501, circle: 1, present: {dauin: 3, dauinNI: 0, ph: true, own: 1, dauinU: 2, near: true}},
      {id: 's2', name: 'Fishus rarus', inat: 502, circle: 1, present: {dauin: 0, dauinNI: 1, ph: true}},
      {id: 's3', name: 'Fishus nowhere', inat: 503, out: 'not confirmed in the Philippines on iNaturalist', present: {ph: false}},
      // Seen once near Dauin, by a single observer: not confirmed there (Pierre), so the Philippines come first.
      {id: 's4', name: 'Fishus solus', inat: 504, circle: 1, present: {dauin: 1, dauinNI: 0, ph: true, dauinU: 1, near: false}}
    ],
    teach: [{id: 't1', name: 'Fishes', circle: 1, species: ['s1', 's2', 's3', 's4']}]
  };
  fs.writeFileSync(path.join(dir, 'fish.json'), JSON.stringify(fish));
  fs.writeFileSync(path.join(dir, 'cur.json'), JSON.stringify({fish: {exclude: {'fish-s1-cand-9990': 'excluded'}}}));
  // The cache: s1 (confirmed near Dauin) has Dauin NC, a free one in Luzon, a CC0 one and a share-alike one abroad, and
  // Pierre's own Needs ID; s2 (not seen near Dauin) has one Philippine photo, so abroad fills.
  py(
    `${OBS}
d = sys.argv[1]
c = {}
def put(q, obs, total=None): c[API + q + '&fields=' + FIELDS] = {'total': len(obs) if total is None else total, 'results': obs}
Q = queries(501)
put(Q['own'], [ob(1, u='ppericard', g='needs_id', lic='cc-by-nc')])
put(Q['dauin'], [ob(2, lic='cc-by-nc'), ob(3, lic='cc-by-nc', n=2), ob(999, lic='cc-by')])
put(Q['region'], [ob(2, lic='cc-by-nc'), ob(3, lic='cc-by-nc', n=2), ob(999, lic='cc-by')])
put(Q['ph'], [ob(2, lic='cc-by-nc'), ob(3, lic='cc-by-nc', n=2), ob(999, lic='cc-by'), ob(4, lic='cc-by', ll=(14.6, 121.0)), ob(12, lic='cc-by-sa', ll=(14.6, 121.0))], total=50)
put(Q['world'], [ob(10, lic='cc0', ll=(-8.5, 115.2), inph=False), ob(11, lic='cc-by-sa', ll=(-8.5, 115.2), inph=False), ob(13, lic='cc0', ll=(27.9, 34.3), inph=False), ob(14, lic='cc0', ll=(20.8, -156.3), inph=False)])
Q = queries(502)
put(Q['own'], [])
put(Q['dauin'], [])
put(Q['region'], [])
put(Q['ph'], [ob(5, lic='cc0', ll=(14.6, 121.0))])
# 8 shares 7's photo (iNaturalist lets one photo belong to several observations): never taken twice, and 8, left with
# no photo of its own, takes no room (Codex review #463).
put(Q['world'], [ob(6, lic='cc-by-nc', ll=(-8.5, 115.2), inph=False), ob(7, lic='cc-by', ll=(-8.5, 115.2), inph=False),
                 {**ob(8, lic='cc-by', ll=(-8.5, 115.2), inph=False), 'ph': ob(7, lic='cc-by')['ph']}])
Q = queries(504)
# Pierre's own, though fish.json does not count any for s4 yet (present.own is from the last build): still asked and
# taken first (Codex review #463).
put(Q['own'], [ob(23, u='ppericard', lic='cc-by', ll=(14.6, 121.0))])
put(Q['dauin'], [ob(20, lic='cc-by-nc')])
put(Q['region'], [ob(20, lic='cc-by-nc')])
put(Q['ph'], [ob(20, lic='cc-by-nc'), ob(21, lic='cc-by', ll=(14.6, 121.0))])
put(Q['world'], [ob(22, lic='cc0', ll=(-8.5, 115.2), inph=False)])
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
  assert.deepStrictEqual(plan.species.s1.add, {dauin: 1, ph: 1, world: 1}); // Pierre's own, then the free ones from anywhere
  assert.deepStrictEqual(plan.species.s2.add, {ph: 1, world: 2}); // the Philippines exhausted: abroad, CC BY first
  assert.ok(!plan.species.s3, 'a species out of the game gets nothing');
  assert.ok(!fs.existsSync(path.join(dir, 'fish-cand.json')), '--plan writes nothing');
  run('--offline');
  const C = JSON.parse(fs.readFileSync(path.join(dir, 'fish-cand.json'), 'utf8'));
  assert.strictEqual(C.v, 1);
  assert.deepStrictEqual(Object.keys(C.cand), ['s1', 's2', 's4']);
  // Not confirmed near Dauin: Pierre's own first (found though fish.json counted none), then the Philippines (CC BY
  // Luzon, then NC Dauin); the CC0 one abroad would come only once they are exhausted and room is left.
  assert.deepStrictEqual(
    C.cand.s4.map(p => p.o.split('/').pop()),
    ['23', '21', '20']
  );
  assert.strictEqual(C.cand.s4[0].own, true);
  const s1 = C.cand.s1,
    row = p => [p.o.split('/').pop(), p.lic, p.loc, p.own];
  // Pierre's own first (NC, Needs ID); then CC BY from Luzon and CC0 from abroad before the NC ones of Dauin, which the
  // Philippines still have more of; never the share-alike ones.
  assert.deepStrictEqual(row(s1[0]), ['1', 'cc-by-nc', 'dauin', true]);
  assert.deepStrictEqual(s1.slice(1).map(row).sort(), [
    ['10', 'cc0', 'world', false],
    ['4', 'cc-by', 'ph', false]
  ]);
  assert.strictEqual(s1[0].ni, 1, "Pierre's Needs ID observation is marked, and kept (rule 6a)");
  const p4 = s1.find(p => p.o.endsWith('/4'));
  assert.deepStrictEqual(Object.keys(p4), ['f', 'a', 'lic', 'o', 't', 'own', 'loc', 'src', 'r']);
  assert.match(p4.f, /^fish-s1-cand-40$/);
  assert.match(p4.src, /\/photos\/40\/original\.jpg$/);
  assert.ok(!/-sa"/.test(JSON.stringify(C)), 'no share-alike photo');
  assert.ok(!/cand-1[34]0"/.test(JSON.stringify(C)), 'no CC0 photo from the Red Sea or Hawaii (outside the Indo-West Pacific)');
  assert.ok(!JSON.stringify(C).includes('9990'), 'an excluded photo never comes back');
  const fsAll = Object.values(C.cand).flatMap(L => L.map(p => p.f));
  assert.strictEqual(new Set(fsAll).size, fsAll.length, 'a photo shared by two observations is a candidate once');
  assert.ok(!C.cand.s2.some(p => p.o.endsWith('/8')), 'an observation left with no photo of its own takes no room');
  assert.deepStrictEqual(
    C.cand.s2.map(p => [p.lic, p.loc]),
    [
      ['cc0', 'ph'],
      ['cc-by', 'world'],
      ['cc-by-nc', 'world']
    ]
  );
  // A rerun keeps what is there and adds nothing (the cap counts usable photos); one species per line.
  run('--offline');
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(dir, 'fish-cand.json'), 'utf8')), C);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'fish-cand.json'), 'utf8').split('\n').length, 9);
  fs.rmSync(dir, {recursive: true, force: true});
});

// The fish candidate cap (Pierre, 2026-11-05, Q36): 30 photos for a stable species, +10 per extra phase (juvenile,
// intermediate phase, male or terminal phase, female) as the judging tags and the sources record them, at most 60; the
// search fills each phase. tools/fetch_fish.py cap_of, species_phases, phase_room, species_room, phase_obs, fill.
test('cap per species (Q36): stable 30, +10 per extra phase, at most 60', () => {
  const out = J(
    `print(json.dumps([BASE_CAP, PER_PHASE, MAX_CAP, PER_OBS, list(PHASES), cap_of([]), cap_of(['juvenile']), cap_of({'juvenile': ['imr'], 'male': ['inat:2']}), cap_of(['juvenile', 'intermediate', 'male']), cap_of(PHASES), cap_of(['adult', 'juvenile', 'juvenile'])]))`
  );
  assert.deepStrictEqual(out, [
    30,
    10,
    60,
    4,
    ['juvenile', 'intermediate', 'male', 'female'],
    30, // stable
    40, // one extra phase
    50,
    60,
    60, // four extra phases: 70, held at 60
    40 // "adult" is no extra phase; a phase counts once
  ]);
});

test('room per phase (Q36): each extra phase aims at 10 photos of its own, the rest free; a short room is shared out', () => {
  const out = J(`from collections import Counter
print(json.dumps([
  phase_room({}, 30, Counter({'': 20})),
  phase_room({'juvenile': 1}, 40, Counter({'': 20, 'juvenile': 3})),
  phase_room(PHASES, 60, Counter({'': 20})),
  phase_room({'juvenile': 1, 'male': 1}, 50, Counter({'': 45})),
  phase_room({'juvenile': 1}, 40, Counter({'': 50})),
  phase_room({'juvenile': 1}, 40, Counter({'': 10, 'juvenile': 14})),
]))`);
  assert.deepStrictEqual(out, [
    {room: 10, rooms: {}, free: 10}, // a stable species: all free
    {room: 17, rooms: {juvenile: 7}, free: 10}, // 3 juveniles held: 7 more of them first
    {room: 40, rooms: {juvenile: 10, intermediate: 10, male: 10, female: 10}, free: 0},
    {room: 5, rooms: {juvenile: 3, male: 2}, free: 0}, // shared out one photo at a time
    {room: 0, rooms: {juvenile: 0}, free: 0}, // over the cap (an older run): nothing removed, nothing added
    {room: 16, rooms: {juvenile: 0}, free: 16} // the phase already has its 10
  ]);
});

test('phases (Q36): IMR phase lines, dimorph, juvenile classes, judging tags, 2+ iNaturalist annotations, FishBase labels', () => {
  const out = J(`
parrot = {'phase': ['Males colourful, females dark or dull', 'Intermediate and terminal phases look different'], 'dimorph': True, 'juv': {'cls': 'B'}}
sweet = {'phase': ['Juvenile, sub-adult and adult look different']}
mixed = {'juv': {'cls': 'mixed', 'early': ['Dascyllus'], 'late': ['Coris gaimard']}}
plain = {'juv': {'cls': 'C'}}
sp = lambda n, **k: {'id': 's1', 'name': n, **k}
c = lambda i, **k: {'f': f'fish-s1-cand-{i}', 'o': f'https://www.inaturalist.org/observations/{i}', **k}
cands = [c(1), c(2, st='male'), c(3, st='adult/female'), c(4, st='female'), c(5, st='juvenile'), c(6, st='juvenile'),
         c(7, st='female', via='fishbase')]
sug = {'fish-s1-cand-1': {'jt': 'p1g0sm1j3', 'e': 3, 'k': 'best'}}
fb = [{'n': 'a.jpg', 'st': 'terminal phase'}, {'n': 'b.jpg', 'st': 'egg'}, {'n': 'c.jpg'}]
print(json.dumps([
  species_phases(sp('Scarus a'), parrot),
  species_phases(sp('Plectorhinchus a'), sweet),
  [species_phases(sp(n), mixed) for n in ('Dascyllus aruanus', 'Chromis viridis', 'Coris gaimard', 'Coris aygula')],
  species_phases(sp('Fishus a'), plain),
  species_phases(sp('Fishus a'), plain, cands, sug, fb=fb),
  species_phases(sp('Fishus a'), plain, cands, sug, fb=fb, moved={'fish-s1-cand-5', 'fish-s1-cand-1'}),
  species_phases(sp('Fishus a'), plain, game=[{'jt': 'p1g0sm1j2'}, {'jt': 'p1g0sm14'}]),
  [photo_phase({'st': 'adult/male'}), photo_phase({'st': 'female/juvenile'}), photo_phase({'st': 'adult'}), photo_phase({}, {'jt': 'p1g0sm1j3'}),
   photo_phase({'st': 'male'}, {'ph': 'subadult'}), photo_phase({'jt': 'p1g0sm1j3'}), photo_phase({'st': 'terminal'}), photo_phase({'st': 'initial'})],
]))`);
  assert.deepStrictEqual(out[0], {juvenile: ['juv'], intermediate: ['imr'], male: ['imr'], female: ['imr']}); // Parrotfish: 60
  assert.deepStrictEqual(out[1], {juvenile: ['imr'], intermediate: ['imr']}); // Sweetlips: sub-adult = intermediate phase
  assert.deepStrictEqual(out[2], [{juvenile: ['juv']}, {}, {juvenile: ['juv']}, {}]); // only the genera or species named
  assert.deepStrictEqual(out[3], {}); // class C: no written phase
  // One judged juvenile, two iNaturalist "juvenile" and two "female" observations (one "male" is not enough), FishBase's
  // terminal phase; FishBase candidates are counted from its rows, never twice.
  assert.deepStrictEqual(out[4], {juvenile: ['judged', 'inat:2'], male: ['fishbase:1'], female: ['inat:2']});
  // Photos Pierre sent to another species record nothing here.
  assert.deepStrictEqual(out[5], {male: ['fishbase:1'], female: ['inat:2']});
  assert.deepStrictEqual(out[6], {juvenile: ['judged']}); // a game photo's juvenile flag
  assert.deepStrictEqual(out[7], ['male', 'juvenile', '', 'juvenile', 'intermediate', 'juvenile', 'male', 'intermediate']);
});

test('phase searches (Q36, rule 6f): several species in one request, paged by id, an observation to its species', () => {
  const out = J(`${OBS}
calls = []
class N:
    def get(self, q, fields=FIELDS):
        calls.append([q, fields])
        if 'id_above' not in q:
            return {'total': 3, 'results': [{**ob(1), 'tx': [11, 501]}, {**ob(2), 'tx': [502]}]}
        return {'total': 1, 'results': [{**ob(3), 'tx': [999, 501]}, {**ob(4), 'tx': [777]}]}
got, more = phase_obs(N(), 'juvenile', [502, 501, 501], 'ph')
a = [{k: [o['id'] for o in v] for k, v in got.items()}, more, len(calls)]
q = calls[0][0]
b = ['taxon_id=501,502&term_id=1&term_value_id=8' in q, 'place_id=6873' in q, 'quality_grade=research' in q, 'id_above=2' in calls[1][0],
     calls[0][1].endswith(',taxon.ancestor_ids'), 'not_in_place=6873' in phase_query('male', [1], 'world'), 'swlat=-30' in phase_query('female', [1], 'world'),
     'term_id=9&term_value_id=11' in phase_query('male', [1], 'ph'), 'term_id=9&term_value_id=10' in phase_query('female', [1], 'ph')]
calls.clear()
class E:
    def get(self, q, fields=FIELDS):
        calls.append(q)
        return {'total': 0, 'results': []}
phase_obs(E(), 'juvenile', range(1, 26), 'ph')
class P:  # a --plan run, the reply not cached
    def get(self, q, fields=FIELDS):
        return None
print(json.dumps([a, b, len(calls), phase_obs(P(), 'male', [5], 'ph')]))`);
  assert.deepStrictEqual(out[0], [{501: [1, 3], 502: [2]}, {501: false, 502: false}, 2]); // a subspecies (11, 999) to its species
  assert.deepStrictEqual(out[1], [true, true, true, true, true, true, true, true, true]);
  assert.strictEqual(out[2], 2, '25 species: two requests of 20 and 5');
  assert.deepStrictEqual(out[3], [{5: []}, {5: true}], 'not cached: nothing found, and the Philippines not known to be exhausted');
});

test('fetch_fish.py with phases (Q36): the juvenile room filled with juveniles first, abroad when the Philippines run out, never adults in their place; --plan offline', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fishphase-'));
  const fish = {
    species: [
      {id: 's1', name: 'Fishus fishii', inat: 501, circle: 1, present: {ph: true}},
      {id: 's2', name: 'Fishus stabilis', inat: 502, circle: 1, present: {ph: true}}
    ],
    teach: [
      {id: 't1', name: 'Juvenile fishes', circle: 1, phase: ['Juveniles look very different from adults'], species: ['s1']},
      {id: 't2', name: 'Stable fishes', circle: 1, species: ['s2']}
    ]
  };
  // s1 keeps 25 adult photos and 1 juvenile (iNaturalist annotation); s2 keeps 28.
  const cand = (sid, n, k = {}) =>
    Array.from({length: n}, (_, i) => ({
      f: `fish-${sid}-cand-${7000 + i}`,
      o: `https://www.inaturalist.org/observations/${sid}-${i}`,
      ...k
    }));
  const C0 = {
    v: 1,
    cand: {
      s1: [...cand('s1', 25), {f: 'fish-s1-cand-8000', o: 'https://www.inaturalist.org/observations/s1-j', st: 'juvenile'}],
      s2: cand('s2', 28)
    }
  };
  const w = (f, d) => fs.writeFileSync(path.join(dir, f), JSON.stringify(d));
  w('fish.json', fish);
  w('fish-cand.json', C0);
  py(
    `${OBS}
d = sys.argv[1]
c = {}
def put(q, obs, total=None, fields=FIELDS): c[API + q + '&fields=' + fields] = {'total': len(obs) if total is None else total, 'results': obs}
Q = queries(501)
put(Q['own'], [])
adults = [ob(i) for i in range(1, 13)]
put(Q['dauin'], adults)
put(Q['region'], adults)
put(Q['ph'], adults, total=500)  # more in the Philippines: no general search abroad
J = (1, 8)
put(phase_query('juvenile', [501], 'ph'), [{**ob(i, an=[J], ll=(14.6, 121.0)), 'tx': [501]} for i in (21, 22, 23)], fields=FIELDS + ',taxon.ancestor_ids')
put(phase_query('juvenile', [501], 'world'), [{**ob(i, an=[J], ll=(-8.5, 115.2), inph=False), 'tx': [501]} for i in (31, 32)] +
    [{**ob(33, an=[J], ll=(27.9, 34.3), inph=False), 'tx': [501]}], fields=FIELDS + ',taxon.ancestor_ids')  # the Red Sea: never
json.dump(c, open(d + '/cache.json', 'w'))`,
    dir
  );
  const args = ['fish.json', 'fish-cand.json', 'cur.json', 'none.json', 'cache.json', 'none.json', 'none.json'];
  const flags = ['--fish', '--cand', '--cur', '--suggest', '--cache', '--photos', '--fbsrc'];
  const argv = flags.flatMap((f, i) => [f, path.join(dir, args[i])]);
  const run = (...a) => execFileSync('python3', ['tools/fetch_fish.py', ...argv, ...a], {cwd: ROOT, encoding: 'utf8'});
  const plan = JSON.parse(run('--plan'));
  assert.deepStrictEqual(plan.caps, {30: 1, 40: 1});
  const pick = v => [v.cap, v.phases, v.have, v.held, v.room, v.rooms, v.free];
  assert.deepStrictEqual(pick(plan.species.s1), [40, {juvenile: ['imr']}, 26, {juvenile: 1}, 14, {juvenile: 9}, 5]);
  assert.deepStrictEqual(plan.species.s1.add, {dauin: 5, ph: 3, world: 2});
  assert.deepStrictEqual(plan.species.s1.phase_add, {juvenile: 5});
  // s2 is not in the cache: its cap and room are still planned, offline.
  assert.deepStrictEqual(pick(plan.species.s2), [30, {}, 28, {}, 2, {}, 2]);
  assert.strictEqual(plan.species.s2.cached, false);
  assert.ok(plan.missing > 0);
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(dir, 'fish-cand.json'), 'utf8')), C0, '--plan writes nothing');
  run('--offline', '--only', 's1');
  const L = JSON.parse(fs.readFileSync(path.join(dir, 'fish-cand.json'), 'utf8')).cand.s1.slice(26);
  // The 3 Philippine juveniles, then 2 from abroad (the Indo-West Pacific only), then 5 adults for the free room; the 4
  // juvenile places left stay open (a FishBase juvenile or a later run), never filled with adults.
  // (Within one source the order is the neutral hash order.)
  const rows = a => a.map(p => [p.o.split('/').pop(), p.st || '', p.loc]).sort();
  assert.strictEqual(L.length, 10);
  assert.deepStrictEqual(rows(L.slice(0, 3)), [
    ['21', 'juvenile', 'ph'],
    ['22', 'juvenile', 'ph'],
    ['23', 'juvenile', 'ph']
  ]);
  assert.deepStrictEqual(rows(L.slice(3, 5)), [
    ['31', 'juvenile', 'world'],
    ['32', 'juvenile', 'world']
  ]);
  assert.ok(rows(L.slice(5)).every(([id, st, loc]) => +id <= 12 && st === '' && loc === 'dauin'));
  const again = JSON.parse(run('--plan', '--only', 's1')).species.s1;
  // The juveniles brought in now record the phase too (6 annotated observations).
  assert.deepStrictEqual(pick(again), [40, {juvenile: ['imr', 'inat:6']}, 36, {juvenile: 6}, 4, {juvenile: 4}, 0]);
  fs.rmSync(dir, {recursive: true, force: true});
});

// Sheet-only photos (tools/fish_photos.py sheet_ok, sheet_pick, sheet_photo; Pierre, 2026-11-05: "if they don't pass
// the game rules, we don't keep them"): a sheet photo passes every game photo rule (licence CC0 / CC BY / CC BY-NC or
// Pierre's own; Research Grade or Pierre's own identified to the species; the Indo-West Pacific box; never captive or
// Dead), checked on the observation that holds it; the cover first, then the taxon's photos, then the observations.
test('sheet-only photos: the game photo rules on the observation; the cover first, then the taxon photos, then observations', () => {
  const out = execFileSync(
    'python3',
    [
      '-c',
      `import sys, json; sys.path.insert(0, 'tools')
from fish_photos import sheet_ok, sheet_pick, sheet_photo
ph = lambda i, lic='cc-by-nc': {'id': i, 'license_code': lic, 'attribution': f'(c) u{i}', 'url': f'https://inaturalist-open-data.s3.amazonaws.com/photos/{i}/square.jpg', 'original_dimensions': {'width': 4, 'height': 3}}
def ob(i, *P, g='research', ll='4.6,118.86', u='x', tx=5, rk='species', cap=False, an=(), t='Fishus a'):
    return {'id': i, 'quality_grade': g, 'taxon': {'id': tx, 'name': t, 'rank': rk}, 'location': ll, 'place_ids': [], 'captive': cap,
            'annotations': [{'controlled_attribute_id': a, 'controlled_value_id': b, 'vote_score': 1} for a, b in an], 'user': {'login': u}, 'photos': list(P)}
ok = lambda p, o: sheet_ok(p, o, 5)
rules = [
  ok(ph(1), ob(10, ph(1))),                          # Research Grade, CC BY-NC, Sabah
  ok(ph(1), ob(10, ph(1), ll='3.98,72.78')),         # the Maldives: outside the Indo-West Pacific box
  ok(ph(1), ob(10, ph(1), ll='26.99,33.91')),        # the Red Sea
  ok(ph(1), ob(10, ph(1), ll=None)),                 # no coordinates
  ok(ph(1), ob(10, ph(1), g='needs_id')),            # Needs ID
  ok(ph(1, None), ob(10, ph(1, None), g='needs_id', u='ppericard')),  # Pierre's own: any licence, Needs ID at the species
  ok(ph(1), ob(10, ph(1), g='needs_id', u='ppericard', rk='genus', tx=4)),  # Pierre's own at the genus: no
  ok(ph(1, 'cc-by-nc-sa'), ob(10, ph(1, 'cc-by-nc-sa'))),  # share-alike
  ok(ph(1, 'cc-by-nd'), ob(10, ph(1, 'cc-by-nd'))),  # ND
  ok(ph(1), ob(10, ph(1), cap=True)),                # captive
  ok(ph(1), ob(10, ph(1), an=[(17, 19)])),           # annotated Dead
  ok(ph(1), ob(10, ph(1), tx=6)),                    # another species
  ok(ph(1), None),                                   # no observation found for the photo
]
pick = lambda t, O: (lambda r: r and [r[0]['id'], r[1]['id'], r[2]])(sheet_pick(t, O))
picks = [
  pick({'id': 5, 'default_photo': ph(1), 'taxon_photos': [{'photo': ph(2)}]}, [ob(10, ph(1)), ob(11, ph(2))]),
  pick({'id': 5, 'default_photo': ph(1), 'taxon_photos': [{'photo': ph(2)}]}, [ob(10, ph(1), ll='3.98,72.78'), ob(11, ph(2))]),
  pick({'id': 5, 'default_photo': ph(1)}, [ob(10, ph(1), g='needs_id'), ob(12, ph(3, 'cc-by-nd'), ph(4, 'cc0')), ob(13, ph(5), u='ppericard')]),
  pick({'id': 5, 'default_photo': ph(1, 'cc-by-sa')}, [ob(10, ph(1, 'cc-by-sa')), ob(11, ph(2), ll='26.99,33.91')]),
]
s = {'id': 's105', 'name': 'Fishus b', 'now': 'Fishus a'}
p = sheet_photo(s, {'id': 5, 'name': 'Fishus a', 'default_photo': ph(7)}, [ob(12, ph(7))], {'Fishus a', 'Fishus b'})
print(json.dumps([rules, picks, p]))`
    ],
    {cwd: ROOT, encoding: 'utf8'}
  );
  const [rules, picks, p] = JSON.parse(out);
  assert.deepStrictEqual(rules, [true, false, false, false, false, true, false, false, false, false, false, false, false]);
  assert.deepStrictEqual(picks[0], [1, 10, 'cover'], 'the cover when it passes the rules');
  assert.deepStrictEqual(picks[1], [2, 11, 'taxon'], 'a cover from outside the box: the next taxon photo that passes');
  assert.deepStrictEqual(picks[2], [5, 13, 'obs'], 'then the observations, Pierre’s own first');
  assert.strictEqual(picks[3], null, 'nothing passes: no photo');
  assert.strictEqual(p.use, 'ref');
  assert.strictEqual(p.f, 'fi7');
  assert.strictEqual(p.o, 'https://www.inaturalist.org/observations/12');
  assert.match(p.src, /\/photos\/7\/original\.jpg$/);
  assert.strictEqual(p.note, 'Filed under Fishus a on iNaturalist, which lumps the two species (as WoRMS does).');
});
