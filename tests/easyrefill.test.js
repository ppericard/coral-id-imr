require('./slot.js').testGuard();
// The refill aimed at easy photos (docs/decisions/2026-11-23-easy-refill-faves.md): a species short of easy
// adults (fewer easy adult observations, tools/fetch_fish.py easy_obs, than easy_need: EASY_FAMILY shared over its
// family's species) takes iNaturalist's most-faved observations first in a refill (select faves, the faves_count kept
// as fv by trim), its searches read on; every other species keeps the neutral order (Q284). Offline, on fixtures:
// nothing here asks iNaturalist.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const py = (code, ...args) =>
  execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\nfrom fetch_fish import *\n${code}`, ...args], {
    cwd: ROOT,
    encoding: 'utf8'
  });
const J = (code, ...a) => JSON.parse(py(code, ...a));

// An observation as the cache keeps it (fetch_fish.trim), with its faves (fv) when it has any.
const OBS = `
def ob(i, fv=0, u=None, ll=(9.2, 123.3), inph=True, lic='cc-by'):
    o = {'id': i, 'g': 'research', 'll': list(ll), 'inph': inph, 't': 'Fishus fishii', 'rk': 'species', 'u': u or f'user{i}', 'an': [],
         'ph': [[i * 10, f'https://inaturalist-open-data.s3.amazonaws.com/photos/{i * 10}/square.jpg', lic, f'(c) u{i}']]}
    if fv:
        o['fv'] = fv
    return o
`;

test('easy_need: 12 easy adults a family, shared over its species as the family floor is, at least EASY_NEED', () => {
  const out = J(`t = lambda n: {'id': 't', 'species': [f's{i}' for i in range(n)]}
print(json.dumps([EASY_FAMILY, EASY_NEED, [easy_need(t(n)) for n in (1, 2, 3, 4, 5, 13)], easy_need({'id': 't0'}), easy_need(None)]))`);
  assert.deepStrictEqual(out, [12, 3, [12, 6, 4, 3, 3, 3], 3, 3]);
});

test('trim keeps the faves as fv, only when there are some; FIELDS asks for them', () => {
  const out =
    J(`o = lambda f: {'id': 1, 'quality_grade': 'research', 'taxon': {'name': 'X', 'rank': 'species'}, 'photos': [], **({'faves_count': f} if f is not None else {})}
print(json.dumps([trim(o(3)).get('fv'), 'fv' in trim(o(0)), 'fv' in trim(o(None)), 'faves_count' in FIELDS.split(',')]))`);
  assert.deepStrictEqual(out, [3, false, false, true]);
});

test('select faves: the most-faved first within each bucket; Pierre own first and the buckets hold; neutral otherwise', () => {
  const out = J(`${OBS}
def pools():
    it = lambda o, tier=None: {**usable_obs(o, set(), set()), **({'tier': tier} if tier else {})}
    return {'dauin': [it(ob(i, fv)) for i, fv in ((1, 0), (2, 5), (3, 1), (4, 9), (5, 0))],
            'ph': [it(ob(6, 50, ll=(14.6, 121.0)))],
            'region': [it(ob(7, 0, u='ppericard'))]}
W = lambda: [{**usable_obs(ob(8, 99, ll=(-8.5, 115.2), inph=False), set(), set()), 'tier': 'world'}]
ids = lambda L: [o['id'] for o in L]
neutral = ids(select(pools(), 4, {}, None, W))
faved = ids(select(pools(), 4, {}, None, W, faves=True))
near = ids(select(pools(), 4, {}, None, W, anywhere=True, faves=True))
hashed = [o['id'] for o in sorted(pools()['dauin'], key=lambda o: o['h'])][:3]
print(json.dumps([neutral, faved, near, hashed]))`);
  const [neutral, faved, near, hashed] = out;
  // Pierre's own (7) first in every order; then the nearest bucket, most-faved first: 4 (9), 2 (5), 3 (1).
  assert.deepStrictEqual(faved, [7, 4, 2, 3]);
  // Confirmed near Dauin: every place at once, so the most-faved anywhere (8 abroad: 99, 6 in the Philippines: 50).
  assert.deepStrictEqual(near, [7, 8, 6, 4]);
  // The neutral order: the fixed hash order, whatever the faves.
  assert.deepStrictEqual(neutral, [7, ...hashed]);
  assert.notDeepStrictEqual(neutral, faved, 'the fixture tells the two orders apart');
});

test('shortness: short of easy adults against easy_need, so a one-species family with 3 easy adults stays short', () => {
  const out = J(`s = {'id': 's1'}
L = [{'f': f'fish-s1-cand-{i}', 'o': f'o{i}'} for i in range(3)]
sug = {f'fish-s1-cand-{i}': {'jt': 'p1g0sm1', 'e': 5, 'k': 'best'} for i in range(3)}
t = lambda n: {'id': 't1', 'species': ['s1'] + [f'x{i}' for i in range(n - 1)]}
r = lambda n: shortness(s, t(n), L, lambda f: False, {}, sug, cap=3)
print(json.dumps([[r(n)[k] for k in ('easy', 'need', 'room', 'short')] for n in (1, 4)]))`);
  assert.deepStrictEqual(out, [
    [3, 12, 0, true], // one species: 3 easy adults of 12, short (at its cap: listed, nothing to refill)
    [3, 3, 0, false] // four species: 3 is enough
  ]);
});

test('refill offline on a fixture cache: the species short of easy adults takes the most-faved first, reading on; the other keeps the neutral order', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'easyrefill-'));
  fs.mkdirSync(path.join(dir, 'data'));
  const fish = {
    species: [
      {id: 's1', name: 'Fishus fishii', inat: 501, circle: 1, present: {ph: true, near: true}},
      {id: 's2', name: 'Fishus vulgaris', inat: 502, circle: 1, present: {ph: true, near: true}}
    ],
    teach: [
      {id: 't1', name: 'Lone fishes', circle: 1, species: ['s1']},
      {id: 't2', name: 'Many fishes', circle: 1, species: ['s2', 's3', 's4', 's5']}
    ]
  };
  // s2 holds 3 easy adults (the pre-sort's sure adds at ease 5): enough for a four-species family. Cap 5: room 2.
  const rec = i => ({f: `fish-s2-cand-${i * 10}`, o: `https://www.inaturalist.org/observations/${i}`, r: 1});
  const sug = {fish: Object.fromEntries([1, 2, 3].map(i => [`fish-s2-cand-${i * 10}`, {jt: 'p1g0sm1', e: 5, k: 'best'}]))};
  const w = (f, d) => fs.writeFileSync(path.join(dir, f), JSON.stringify(d));
  w('fish.json', fish);
  w('data/fish-cand.json', {v: 1, cand: {s2: [1, 2, 3].map(rec)}});
  w('cur.json', {});
  w('sug.json', sug);
  const exp = J(
    `${OBS}
d = sys.argv[1]
c = {}
def put(q, obs, total=None): c[API + q + '&fields=' + FIELDS] = {'total': len(obs) if total is None else total, 'results': obs}
Q = queries(501)
put(Q['own'], [])
# s1: 6 observations on the first page (enough for its room of 5), 2 more, the most faved, on the next.
put(Q['dauin'], [ob(i, fv) for i, fv in ((60, 0), (59, 2), (58, 0), (57, 1), (56, 0), (55, 0))], total=8)
put(Q['dauin'] + '&id_below=55', [ob(54, 7), ob(53, 3)])
for k in ('region', 'ph', 'world'):
    put(Q[k], [])
Q = queries(502)
put(Q['own'], [])
B = [ob(i, fv) for i, fv in ((160, 0), (159, 4), (158, 0), (157, 8), (156, 0), (155, 0))]
put(Q['dauin'], B, total=300)  # the first page is enough: the neutral order never reads on
for k in ('region', 'ph', 'world'):
    put(Q[k], [])
json.dump(c, open(d + '/cache.json', 'w'))
print(json.dumps(sorted(str(o['id']) for o in sorted(B, key=lambda o: hord(o['id']))[:2])))`,
    dir
  );
  const args = ['fish.json', 'data/fish-cand.json', 'cur.json', 'sug.json', 'cache.json', 'none.json', 'none.json', 'mem.json'];
  const flags = ['--fish', '--cand', '--cur', '--suggest', '--cache', '--photos', '--fbsrc', '--memory'];
  const argv = flags.flatMap((f, i) => [f, path.join(dir, args[i])]);
  const run = (...a) =>
    execFileSync('python3', ['tools/fetch_fish.py', ...argv, '--refill', '--cap', '5', '--today', '2026-11-23', ...a], {
      cwd: ROOT,
      encoding: 'utf8'
    });
  const P = JSON.parse(run('--plan'));
  assert.deepStrictEqual([P.short.s1.need, P.short.s1.easy, P.short.s2.need, P.short.s2.easy], [12, 0, 3, 3]);
  run('--offline');
  const got = JSON.parse(fs.readFileSync(path.join(dir, 'data/fish-cand.json'), 'utf8')).cand;
  const ids = L => L.map(p => p.o.split('/').pop());
  // s1, short of easy adults: the five most faved of the whole search, the second page included (54: 7, 53: 3).
  // The fifth, among equal faves (none), by the neutral order.
  assert.deepStrictEqual(ids(got.s1).slice(0, 4), ['54', '53', '59', '57']);
  assert.strictEqual(got.s1.length, 5);
  assert.ok(['60', '58', '56', '55'].includes(ids(got.s1)[4]));
  // s2, not short of easy adults: its 3 candidates, then 2 in the neutral (hash) order, not the faved 157 and 159.
  assert.deepStrictEqual(ids(got.s2).slice(0, 3), ['1', '2', '3']);
  assert.deepStrictEqual(ids(got.s2).slice(3).sort(), exp);
  assert.notDeepStrictEqual(exp, ['157', '159'], 'the fixture tells the two orders apart');
  fs.rmSync(dir, {recursive: true, force: true});
});
