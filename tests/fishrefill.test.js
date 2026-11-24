require('./slot.js').testGuard();
// The fish refill's exhaustion memory (tools/fetch_fish.py exhausted, pick_short, load_mem; tools/fish_refill.json;
// REE-278): a part of a species' room is searched to the end only when its searches were read to their end with room
// left that a new observation fits, so none usable is left; the record keeps that room, and room grown since (a judging
// pass or Pierre setting photos aside) makes the species eligible again; a room under one new observation is not open.
// Offline, on fixtures: nothing here asks iNaturalist.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const J = (code, ...args) =>
  JSON.parse(
    execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\nfrom fetch_fish import *\n${code}`, ...args], {
      cwd: ROOT,
      encoding: 'utf8'
    })
  );

test('exhausted: only the parts read to the end with room a new observation fits, with the room left', () => {
  const out =
    J(`P = lambda free, rooms, add, padd, spent, end: {'free': free, 'rooms': rooms, 'add': add, 'phase_add': padd, 'spent': spent, 'end': end}
print(json.dumps([
  # Half a photo of free room (nothing new fits), one more photo of a juvenile observation it held (0.5), the general
  # searches not read to the end (Amphiprion clarkii's case, REE-278).
  exhausted(P(0.5, {'juvenile': 1}, {'world': 1}, {'juvenile': 1}, {'free': 0, 'juvenile': 0.5}, {'free': False, 'juvenile': True})),
  exhausted(P(3, {}, {}, {}, {'free': 0}, {'free': False})),  # got nothing, the search cut short (GEN_PAGES)
  exhausted(P(4, {}, {'ph': 1}, {}, {'free': 1}, {'free': True})),  # read to the end, 3 left
  exhausted(P(1.5, {}, {'ph': 1}, {}, {'free': 1}, {'free': True})),  # read to the end, half a photo left
  exhausted(P(0, {'juvenile': 4}, {'ph': 2}, {'juvenile': 2}, {'free': 0, 'juvenile': 2}, {'free': False, 'juvenile': True})),
  [fits(x) for x in (0, 0.5, 1, 1.5)],
]))`);
  assert.deepStrictEqual(out, [{}, {}, {free: 3}, {}, {juvenile: 2}, [false, false, true, true]]);
});

test('pick_short: a record holds only while its room has not grown; a room under one new observation is not open', () => {
  const out = J(`import datetime
day = datetime.date(2026, 11, 24)
row = lambda **parts: {'cap': 40, 'base': 40, 'room': sum(parts.values()), 'parts': parts, 'easy': 9, 'need': 3, 'unjudged': 0}
rows = {'a': row(free=4.5, juvenile=1), 'b': row(free=4.5), 'c': row(free=3), 'd': row(free=0.5), 'e': row(free=0.5, juvenile=2),
        'f': row(free=2, juvenile=1)}
rec = lambda **room: {'at': '2026-11-20', 'cap': 40, 'room': room}
mem = {'a': {'at': '2026-11-08', 'parts': ['free', 'juvenile']},  # a record without its room
       'b': rec(free=1), 'c': rec(free=3), 'e': rec(juvenile=2), 'f': rec(free=2)}
print(json.dumps(pick_short(rows, mem, day)))`);
  // a: a record without its room holds nothing; b: room grown from 1 to 4.5; f: the juvenile room never searched to the
  // end; c: same room, fresh: skipped; d: half a photo, no new observation fits: neither; e: its only open part, the
  // juvenile room, unchanged: skipped.
  assert.deepStrictEqual(out, [
    ['a', 'b', 'f'],
    ['c', 'e']
  ]);
});

test('refill offline: a search cut short or a half photo of room is not searched to the end; room grown since opens it again', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fishrefill-mem-'));
  fs.mkdirSync(path.join(dir, 'data'));
  const sp = i => ({id: `s${i}`, name: `Fishus ${i}`, inat: 500 + i, circle: 1, present: {}});
  const fish = {species: [1, 2, 3, 4].map(sp), teach: [{id: 't1', name: 'Fishes', circle: 1, species: ['s1', 's2', 's3', 's4']}]};
  const c = (sid, o, k = 0) => ({f: `fish-${sid}-cand-${o * 10 + k}`, o: `https://www.inaturalist.org/observations/${o}`});
  // Cap 3. s1, s2, s3: one observation held, room 2. s4: two observations (2 photos, then 1): 2.5 held, room 0.5.
  const C = {v: 1, cand: {s1: [c('s1', 1)], s2: [c('s2', 2)], s3: [c('s3', 3)], s4: [c('s4', 4), c('s4', 4, 1), c('s4', 9)]}};
  const w = (f, d) => fs.writeFileSync(path.join(dir, f), JSON.stringify(d));
  w('fish.json', fish);
  w('data/fish-cand.json', C);
  w('cur.json', {});
  // s3 holds a record without its room, a day old.
  w('mem.json', {end: {s3: {at: '2026-11-23', parts: ['free']}}});
  execFileSync(
    'python3',
    [
      '-c',
      `import sys, json; sys.path.insert(0, 'tools')
from fetch_fish import *
def ob(i):
    return {'id': i, 'g': 'research', 'll': [9.2, 123.3], 'inph': True, 't': 'Fishus', 'rk': 'species', 'u': f'u{i}', 'an': [],
            'ph': [[i * 10, f'https://inaturalist-open-data.s3.amazonaws.com/photos/{i * 10}/square.jpg', 'cc-by', f'(c) u{i}']]}
c = {}
def put(q, obs, total=None): c[API + q + '&fields=' + FIELDS] = {'total': len(obs) if total is None else total, 'results': obs}
for x in (501, 502, 503, 504):
    Q = queries(x)
    for k in ('own', 'dauin', 'region', 'ph'):
        put(Q[k], [])
put(queries(501)['dauin'], [ob(5)])  # s1: one new observation, the searches read to their end
put(queries(502)['region'], [], total=300)  # s2: nothing usable read, more left unread
json.dump(c, open(sys.argv[1] + '/cache.json', 'w'))`,
      dir
    ],
    {cwd: ROOT}
  );
  const files = ['fish.json', 'data/fish-cand.json', 'cur.json', 'none.json', 'cache.json', 'none.json', 'none.json', 'mem.json'];
  const flags = ['--fish', '--cand', '--cur', '--suggest', '--cache', '--photos', '--fbsrc', '--memory'];
  const argv = flags.flatMap((f, i) => [f, path.join(dir, files[i])]);
  const run = (...a) =>
    execFileSync('python3', ['tools/fetch_fish.py', ...argv, '--refill', '--cap', '3', '--today', '2026-11-24', ...a], {
      cwd: ROOT,
      encoding: 'utf8'
    });
  const plan = () => (P => [P.pick, P.skip])(JSON.parse(run('--plan')));
  assert.deepStrictEqual(plan(), [['s1', 's2', 's3'], []], 'the old record holds nothing; s4 (half a photo) is not open');
  run('--offline');
  const M = JSON.parse(fs.readFileSync(path.join(dir, 'mem.json'), 'utf8'));
  assert.deepStrictEqual(M.end, {
    s1: {at: '2026-11-24', cap: 3, room: {free: 1}}, // read to the end, room 1 left
    s3: {at: '2026-11-24', cap: 3, room: {free: 2}} // read to the end, nothing new
  });
  assert.deepStrictEqual(plan(), [['s2'], ['s1', 's3']], 's2 got nothing but its search was not read to the end');
  // Pierre rejects s1's first candidate: its room grows from 1 to 2, so it is searched again.
  w('cur.json', {fish: {seen: {'fish-s1-cand-10': 1}}});
  assert.deepStrictEqual(plan(), [['s1', 's2'], ['s3']]);
  fs.rmSync(dir, {recursive: true, force: true});
});
