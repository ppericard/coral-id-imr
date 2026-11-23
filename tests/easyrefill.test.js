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

// Faved candidates beyond the cap (REE-243): a species short of easy adults may hold BEYOND_PER room per easy adult
// observation it lacks beyond its cap, at most BEYOND_MAX, for faved observations only (beyond_cap, faved).
test('beyond_cap: BEYOND_PER per easy adult missing, at most BEYOND_MAX, net of what the species holds; never a wink', () => {
  const out = J(`R = lambda cap, have: {'cap': cap, 'have': have, 'room': max(0, cap - have)}
t = {'id': 't1', 'species': ['s1']}
w = {'id': 'w1', 'species': ['s1'], 'wink': True}
print(json.dumps([BEYOND_PER, BEYOND_MAX,
    beyond_cap(R(90, 90), t, 2, 12),   # 10 missing: 30, the bound
    beyond_cap(R(90, 90), t, 9, 12),   # 3 missing: 9
    beyond_cap(R(50, 50.5), t, 0, 6),  # over its cap: 18 - 0.5
    beyond_cap(R(30, 10), t, 2, 3),    # room under the cap left: 3 more beyond it
    beyond_cap(R(90, 120), t, 2, 12),  # already holds all of it: 0
    beyond_cap(R(90, 90), t, 12, 12),  # not short: 0
    beyond_cap(R(5, 5), w, 0, 12)]))   # a wink entry's: 0`);
  assert.deepStrictEqual(out, [3, 30, 30, 9, 17.5, 3, 0, 0, 0]);
});

test('beyond the cap: an observation cut by the room under the cap brings its other photos to the beyond pass (Codex #1487)', () => {
  // 1 of room under the cap, 9 beyond, one local faved observation with 10 photos: 1 photo under the cap (a new
  // observation's first photo costs 1), the 9 others beyond it (0.5 each), marked bc in the records.
  const out = J(`${OBS}
o = ob(70, 3)
o['ph'] = [[700 + k, f'https://x/{700 + k}/square.jpg', 'cc-by', '(c) u'] for k in range(10)]
it = usable_obs(o, set(), set())
c = {'s': {'id': 's1'}, 'R': {'room': 1, 'rooms': {}, 'free': 1}, 'n': Counter(), 'near': True, 'held': {}, 'all': {70: it},
     'pools': {it['tier']: [it]}, 'more': {}, 'world': lambda: [], 'pw': {}, 'pmore': {}, 'faves': True, 'beyond': 9}
got = fill(c, set())
rec = [record({'id': 's1'}, x, p) for x in got for p in x['P']]
print(json.dumps([[len(x['P']) for x in got], [bool(x.get('beyond')) for x in got], sum(1 for r in rec if r.get('bc')), len({r['f'] for r in rec})]))`);
  assert.deepStrictEqual(out, [[1, 9], [false, true], 9, 10]);
});

test('beyond the cap: what it took (bc) never eats the room under the cap nor a phase reservation (Codex #1487)', () => {
  // Cap 50, a juvenile phase (PER_PHASE 10 reserved), 40 adults held: room 10, all of it the juveniles'. 20 adults taken
  // beyond the cap leave both as they were, so FishBase or a later run still fills the juveniles; counted as the bonus.
  const out = J(`t = {'id': 't1', 'species': ['s1'], 'phase': ['Juveniles look different']}
s = {'id': 's1'}
rec = lambda i, bc=False: {'f': f'fish-s1-cand-{i}', 'o': f'o{i}', **({'bc': 1} if bc else {})}
L = [rec(i) for i in range(40)] + [rec(i, True) for i in range(40, 60)]
R = species_room(s, t, L, lambda f: False, cap=50)
R0 = species_room(s, t, [{k: v for k, v in p.items() if k != 'bc'} for p in L], lambda f: False, cap=50)
print(json.dumps([[R[k] for k in ('have', 'bonus', 'room', 'rooms')], [R0[k] for k in ('room', 'rooms')],
    beyond_cap(R, t, 2, 12), beyond_cap({**R, 'bonus': 30}, t, 2, 12)]))`);
  assert.deepStrictEqual(out, [
    [40, 20, 10, {juvenile: 10}],
    [0, {juvenile: 0}],
    10, // 30 beyond the cap for 10 easy adults missing, 20 of it taken
    0
  ]);
});

test('beyond the cap: a species with room only beyond its cap is in the batched prefetch; one at its cap with none is not (Codex #1487, rule C7)', () => {
  // s1: at its cap (5), short of easy adults (room beyond it); s2: room under the cap; s3: a wink entry's, at its cap
  // (no room beyond it). The prefetch is recorded, not run: nothing is asked (a --plan run reads the cache only).
  const out = J(`import argparse, contextlib, io, os, tempfile
import fetch_fish
seen = []
fetch_fish.prefetch = lambda net, taxa, kinds: seen.append(sorted(taxa)) or 0
d = tempfile.mkdtemp()
w = lambda f, x: open(os.path.join(d, f), 'w').write(json.dumps(x))
sp = lambda i: {'id': f's{i}', 'name': f'Fishus s{i}', 'inat': 500 + i, 'circle': 1, 'present': {'ph': True, 'near': True}}
w('fish.json', {'species': [sp(1), sp(2), sp(3)], 'teach': [{'id': 't1', 'name': 'A', 'circle': 1, 'species': ['s1']},
    {'id': 't2', 'name': 'B', 'circle': 1, 'species': ['s2']}, {'id': 't3', 'name': 'C', 'circle': 1, 'species': ['s3'], 'wink': True}]})
rec = lambda s, i: {'f': f'fish-{s}-cand-{i}', 'o': f'https://www.inaturalist.org/observations/{i}', 'r': 1}
w('cand.json', {'v': 1, 'cand': {'s1': [rec('s1', i) for i in range(1, 6)], 's2': [rec('s2', 10)], 's3': [rec('s3', i) for i in range(20, 25)]}})
a = argparse.Namespace(fish=os.path.join(d, 'fish.json'), cand=os.path.join(d, 'cand.json'), cur=os.path.join(d, 'none.json'),
    suggest=os.path.join(d, 'none.json'), fbsrc=os.path.join(d, 'none.json'), photos=os.path.join(d, 'none.json'),
    cache=os.path.join(d, 'cache.json'), offline=False, refresh=False, plan=True, only='', deep=True, rep=False, circle=[1], cap=5)
with contextlib.redirect_stdout(io.StringIO()):
    P = fetch_fish.run(a)
print(json.dumps([seen, [[P[s][k] for k in ('room', 'beyond')] for s in ('s1', 's2', 's3')]]))`);
  assert.deepStrictEqual(out, [
    [[501, 502]],
    [
      [0, 30],
      [4, 30],
      [0, 0]
    ]
  ]);
});

test('faved: faves > 0 and not annotated juvenile', () => {
  const out =
    J(`print(json.dumps([faved({'fv': 2, 'st': ''}), faved({'fv': 2, 'st': 'adult/male'}), faved({'fv': 2, 'st': 'adult/juvenile'}),
    faved({'fv': 0, 'st': ''}), faved({'st': 'adult'})]))`);
  assert.deepStrictEqual(out, [true, true, false, false, false]);
});

test('pick_short: a species at its cap with room beyond it is picked; a fresh "free" record covers "faves" only with free room for an observation', () => {
  const out = J(`import datetime
r = {'cap': 90, 'base': 30, 'room': 0, 'beyond': 30, 'parts': {'faves': 30}, 'easy': 2, 'need': 12, 'unjudged': 60}
r2 = {**r, 'room': 2, 'parts': {'free': 2, 'faves': 30}}
d = datetime.date(2026, 11, 23)
free = {'s1': {'at': '2026-11-21', 'cap': 90, 'parts': ['free']}}
# 10.5 of room, 10 of it kept for the juveniles: 0.5 free, too little for a new observation (Codex #1487).
r3 = {**r, 'room': 10.5, 'parts': {'free': 0.5, 'juvenile': 10, 'faves': 30}}
both = {'s1': {'at': '2026-11-21', 'cap': 90, 'parts': ['free', 'juvenile']}}
print(json.dumps([pick_short({'s1': r}, {}, d), pick_short({'s1': {**r, 'beyond': 0, 'parts': {}}}, {}, d),
    pick_short({'s1': r2}, free, d), pick_short({'s1': r}, free, d), pick_short({'s1': {**r2, 'room': 0.5, 'parts': {'free': 0.5, 'faves': 30}}}, free, d),
    pick_short({'s1': r}, {'s1': {'at': '2026-11-21', 'cap': 90, 'parts': ['juvenile']}}, d),
    pick_short({'s1': r3}, both, d), pick_short({'s1': {**r3, 'parts': {'free': 1, 'juvenile': 10, 'faves': 30}}}, both, d)]))`);
  assert.deepStrictEqual(out, [
    [['s1'], []],
    [[], []],
    [[], ['s1']], // room 2: its searches read to the end took every usable observation, faved ones included
    [['s1'], []], // at its cap, or under 1 of room: the end only says nothing more fitted under the cap
    [['s1'], []],
    [['s1'], []],
    [['s1'], []], // room 10.5 but 0.5 free (the rest the juveniles'): the free part's end says nothing of the faves
    [[], ['s1']] // 1 free: room for a new observation, so the end covers the faves
  ]);
});

test('refill offline: a species at its cap, short of easy adults, takes faved adults beyond it, most-faved first; nothing else', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'beyondcap-'));
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
  // Both at the cap (5), with no easy adult: s1 needs 12 (one species), s2 needs 3 (four species).
  const rec = (s, i) => ({f: `fish-${s}-cand-${i * 10}`, o: `https://www.inaturalist.org/observations/${i}`, r: 1});
  const w = (f, d) => fs.writeFileSync(path.join(dir, f), JSON.stringify(d));
  w('fish.json', fish);
  w('data/fish-cand.json', {v: 1, cand: {s1: [1, 2, 3, 4, 5].map(i => rec('s1', i)), s2: [6, 7, 8, 9, 10].map(i => rec('s2', i))}});
  w('cur.json', {});
  w('sug.json', {});
  py(
    `${OBS}
d = sys.argv[1]
c = {}
def put(q, obs, total=None): c[API + q + '&fields=' + FIELDS] = {'total': len(obs) if total is None else total, 'results': obs}
juv = ob(57, 20)
juv['an'] = [[1, 8]]
for tid, base in ((501, 0), (502, 100)):
    Q = queries(tid)
    put(Q['own'], [])
    put(Q['dauin'], [ob(base + 60, 0), ob(base + 59, 2), ob(base + 58, 0), {**juv, 'id': base + 57, 'ph': [[(base + 57) * 10] + juv['ph'][0][1:]]},
                     ob(base + 56, 0), ob(base + 54, 7), ob(base + 53, 1), ob(base + 52, 4)])
    for k in ('region', 'ph', 'world'):
        put(Q[k], [])
json.dump(c, open(d + '/cache.json', 'w'))`,
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
  assert.deepStrictEqual([P.short.s1.room, P.short.s1.beyond, P.short.s2.room, P.short.s2.beyond], [0, 30, 0, 9]);
  assert.deepStrictEqual(P.pick, ['s1', 's2']);
  assert.deepStrictEqual(P.at_cap, []);
  run('--offline');
  const got = JSON.parse(fs.readFileSync(path.join(dir, 'data/fish-cand.json'), 'utf8')).cand;
  const ids = L => L.map(p => p.o.split('/').pop());
  // s1: its 5 kept, then every faved adult, most-faved first (54: 7, 52: 4, 59: 2, 53: 1); not the faved juvenile
  // (57: 20) nor any unfaved one, though 30 of room beyond the cap was open.
  assert.deepStrictEqual(ids(got.s1), ['1', '2', '3', '4', '5', '54', '52', '59', '53']);
  // s2: 9 of room beyond (3 missing x 3): its 4 faved adults (1 room each), from its own search.
  assert.deepStrictEqual(ids(got.s2), ['6', '7', '8', '9', '10', '154', '152', '159', '153']);
  // Searched to the end with room beyond the cap left: "faves" is remembered, so the next refill skips them.
  const mem = JSON.parse(fs.readFileSync(path.join(dir, 'mem.json'), 'utf8')).end;
  assert.deepStrictEqual([mem.s1.parts, mem.s2.parts], [['faves'], ['faves']]);
  const again = JSON.parse(run('--plan'));
  assert.deepStrictEqual([again.pick, again.skip], [[], ['s1', 's2']]);
  fs.rmSync(dir, {recursive: true, force: true});
});
