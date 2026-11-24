require('./slot.js').testGuard();
// Sea-slug candidate photos (tools/fetch_seaslugs.py, data/seaslug-cand.json): the egg filter, the licence filter, one photo
// per observation, the juvenile room of a documented juvenile form, the Philippines before abroad, the record shape of
// data/fish-cand.json. The network is stubbed: the whole script runs on a
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

test("licence and identity: CC0, CC BY, CC BY-NC only; every usable photo of a mixed observation; Pierre's own as the fish's (Q386)", () => {
  const out = J(`${OBS}
it = lambda o: (lambda x: x and [[p[0] for p in x['P']], [p[2] for p in x['P']], x['cls'], x['own']])(usable(o, EGG))
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
    // [photo ids, their licences, class (fetch_fish.lic_class: 0 his own, 1 open, 2 NC; the best photo's), own]
    [[[10], ['cc0'], 1, false], [[10], ['cc-by'], 1, false], [[10], ['cc-by-nc'], 2, false], null, null, null, null, null],
    [[21, 22], ['cc-by-nc', 'cc-by'], 1, false], // the share-alike first photo skipped: the others come, the best licence classes it
    [[30], [null], 0, true], // Pierre's own photo without a licence: usable, as the fish's (fetch_fish.lic_ok)
    [[40], ['cc-by'], 0, true], // his licensed Research Grade photo, marked own
    null, // someone else's Needs ID
    null, // genus level
    [[70], ['cc-by'], 1, false], // abroad in the Indo-West Pacific (Bali)
    null, // abroad outside it (Red Sea)
    [[90], ['cc-by-nc'], 0, true], // his Needs ID observation identified to the species: usable; his own ranks as open
    null, // his Needs ID at the genus: not a species photo
    [[120], ['cc-by'], 0, true], // below the species (a subspecies) counts as the species
    null, // his, annotated Egg: the egg rule holds for him too
    null, // his, annotated Dead
    null, // his abroad outside the Indo-West Pacific
    [[160], ['cc-by'], 0, true], // his abroad inside it
    null // his share-alike photo: never (lic_ok takes his photo without a licence, never a share-alike one)
  ]);
});

test('every photo of an observation: 3 photos take 1 + 0.5 + 0.5 of room, the room cuts the last; a photo is taken once; variety, then licence', () => {
  const out = J(`${OBS}
from collections import Counter
used, kept = set(), Counter()
items = [usable(o, EGG) for o in (ob(1, n=3, u='a'), ob(2, u='a'), ob(3, u='b', lic='cc-by-nc'), ob(4, u='c'))]
first = pick(items, 3, Counter(), used, kept)
# A photo iNaturalist lets two observations share (5's is 4's), and the photos of an observation already taken (1): neither comes again.
again = pick([usable(ob(1, n=3, u='d'), EGG), {**usable(ob(5, u='e'), EGG), 'P': [[40, 'x', 'cc-by', 'a']]}], 5, Counter(), used, kept)
# The room cuts an observation: 4 photos, 2 of room: 1 + 0.5 + 0.5 = 2 for three. One already holding 2 photos brings 1 for 0.5.
cut = pick([usable(ob(6, n=4), EGG)], 2, Counter(), set(), Counter())
more = pick([usable(ob(7, n=3), EGG)], 0.5, Counter(), set(), Counter({'https://www.inaturalist.org/observations/7': 2}))
print(json.dumps([[[o['id'], [p[0] for p in o['P']], o['cost']] for o in first], sorted(used), dict(kept), [o['id'] for o in again],
                  [[[p[0] for p in o['P']], o['cost']] for o in cut], [[[p[0] for p in o['P']], o['cost']] for o in more]]))`);
  // Observers a, b, c once each before a second one of a: at room 3, observation 4 (c), then 1 (a, three photos for 2);
  // a's other observation (2) and b's NC one (3) are left out, the room is spent.
  assert.deepStrictEqual(out[0], [
    [4, [40], 1],
    [1, [10, 11, 12], 2]
  ]);
  assert.deepStrictEqual(out[1], ['10', '11', '12', '40']);
  assert.deepStrictEqual(out[2], {'https://www.inaturalist.org/observations/4': 1, 'https://www.inaturalist.org/observations/1': 3});
  assert.deepStrictEqual(out[3], []);
  assert.deepStrictEqual(out[4], [[[60, 61, 62], 2]]);
  assert.deepStrictEqual(out[5], [[[70], 0.5]]);
  const lic = J(`${OBS}
from collections import Counter
print(json.dumps([o['id'] for o in pick([usable(ob(i, lic=l), EGG) for i, l in ((1, 'cc-by-nc'), (2, 'cc-by-nc'), (3, 'cc0'))], 1, Counter(), set(), Counter())]))`);
  assert.deepStrictEqual(lic, [3], 'among equals in variety, an open licence first (the last tie-break)');
});

test('a pass leaves the photos it did not take to the next one; an observation held by another list brings nothing to a species (Codex review)', () => {
  const out = J(`${OBS}
from collections import Counter
from fetch_fish import Net, API, FIELDS, queries
import tempfile
x = usable(ob(1, n=4), EGG)
kept, used = Counter(), set()
a = pick([x], 1.5, Counter(), used, kept)
b = pick([x], 2, Counter(), used, kept)
d = tempfile.mkdtemp()
c = {API + queries(601)['own'] + '&fields=' + FIELDS: {'total': 0, 'results': []},
     API + queries(601)['ph'] + '&fields=' + FIELDS: {'total': 2, 'results': [ob(5), ob(6)]},
     API + queries(601)['world'] + '&fields=' + FIELDS: {'total': 0, 'results': []}}
json.dump(c, open(d + '/c.json', 'w'))
T = {'candidates': 5, 'max': 7, 'perJuvenileForm': 0}
net = Net(d + '/c.json', offline=True)
got, _ = fill(net, {'name': 'Slugus slugii', 'inat': 601}, [], T, EGG, set(), taken={obs_url(5): 'Slugus'})
print(json.dumps([[[p[0] for p in o['P']] for o in a], [[p[0] for p in o['P']] for o in b], [o['id'] for o in got]]))`);
  assert.deepStrictEqual(out[0], [[10, 11]]);
  assert.deepStrictEqual(out[1], [[12, 13]], 'the two photos the first pass could not fit are still there');
  assert.deepStrictEqual(out[2], [6], 'observation 5 belongs to the genus-level list');
});

test('what frees room is the fish’s: a rejected or excluded candidate, a judged near-duplicate, an egg mass; an unsure or a fish judgement does not', () => {
  const out = J(`${OBS}
from fetch_fish import state
rec = lambda i, k, **x: {'f': f'seaslug-601-cand-{i * 10 + k}', 'o': obs_url(i), **x}
L = [rec(1, 0), rec(1, 1), rec(1, 2), rec(2, 0), rec(3, 0), rec(4, 0), rec(5, 0)]
dup = lambda **x: {'jt': 'd1g0sl1', 'e': 3, 'k': 'dup', **x}
sug = {'seaslug': {'seaslug-601-cand-11': dup(), 'seaslug-601-cand-30': dup(u=1), 'seaslug-601-cand-40': {'jt': 'd1g0sl1', 'e': 3, 'k': 'best'},
                   'seaslug-601-cand-50': {'egg': 1}}, 'fish': {'seaslug-601-cand-12': dup()}}
cur = {'seaslug': {'seen': {'seaslug-601-cand-20': 1}}, 'fish': {'seen': {'seaslug-601-cand-30': 1}}}
gone = Gone(egg_set(sug), state(cur, sug, 'seaslug')[0])
print(json.dumps([[p['f'].rsplit('-', 1)[1] for p in L if p['f'] in gone], held(L), held(L, gone), sorted(kept_of(L, gone).values())]))`);
  assert.deepStrictEqual(
    out[0],
    ['11', '20', '50'],
    'the dup (not an unsure one), the rejected, the egg mass; the fish’s part of either file counts for nothing'
  );
  assert.strictEqual(out[1], 6);
  assert.strictEqual(out[2], 3.5, '1 + 0.5 for observation 1 (its dup out), observations 3 and 4 for 1 each, 5 and 2 nothing');
  assert.deepStrictEqual(out[3], [1, 1, 2]);
});

test('the room counts as the fish’s cap does: an observation’s first photo 1, each further one 0.5, an egg mass nothing', () => {
  const out = J(`${OBS}
rec = lambda i, k, **x: {'f': f'seaslug-601-cand-{i * 10 + k}', 'o': obs_url(i), **x}
L = [rec(1, 0), rec(1, 1), rec(1, 2, st='juvenile'), rec(2, 0, st='juvenile'), rec(3, 0)]
print(json.dumps([held(L), held(L, {'seaslug-601-cand-10'}), held(L, {'seaslug-601-cand-10', 'seaslug-601-cand-11'}),
                  held(L, only=lambda p: p.get('st') == 'juvenile'), dict(kept_of(L, {'seaslug-601-cand-10'})), sorted(stages(L).items())]))`);
  assert.deepStrictEqual(out[0], 4, '1 + 0.5 + 0.5 for observation 1, 1 each for 2 and 3');
  assert.deepStrictEqual(out[1], 3.5, 'its first photo an egg mass: the next one counts 1, the third 0.5');
  assert.deepStrictEqual(out[2], 3);
  assert.deepStrictEqual(out[3], 1.5, 'the weights follow the observation, only the juvenile photos are summed');
  assert.deepStrictEqual(out[4], {
    'https://www.inaturalist.org/observations/1': 2,
    'https://www.inaturalist.org/observations/2': 1,
    'https://www.inaturalist.org/observations/3': 1
  });
  assert.deepStrictEqual(
    out[5],
    [
      [['s', ''], 2],
      [['s', 'juvenile'], 1]
    ],
    'one count per observation, not per photo'
  );
});

test('fetch_seaslugs.py offline: Philippines first, abroad only when short, the juvenile room, data/fish-cand.json fields; a rerun changes nothing', () => {
  const dir = mkTmp('slugcand-');
  const at = x => path.join(dir, x);
  const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'seaslugs.json'), 'utf8')).photoTarget;
  const src = {
    photoTarget: {...T, candidates: 4, perJuvenileForm: 2, juvenile: {'Slugus juvenilis': 'a source'}},
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
# 2 usable observations for 4 places (the one of 3 photos takes 2 of them), the search read to its end, so abroad: Red Sea
# (outside the box) and Bali.
put(queries(601)['ph'], [ob(1, an=[(1, 7)]), ob(2, an=[(22, 30)]), ob(3, lic='cc-by-sa'), ob(4, lic=['cc-by-sa', 'cc-by-nc']), ob(5, n=3)])
put(queries(601)['world'], [ob(20, lic='cc0', ll=(27.9, 34.3), inph=False), ob(21, ll=(-8.5, 115.2), inph=False)])
# 602 (a documented juvenile: 4 + 2): adults in the Philippines, one juvenile there (the phase search finds it too), none
# abroad: one juvenile place stays open, never an adult in it; no general search abroad (the Philippines fill the rest).
put(queries(602)['ph'], [ob(30), ob(31, an=[(1, 8)]), ob(32), ob(33), ob(34), ob(35, an=[(1, 8), (1, 7)])])
put(phase_query('juvenile', [602], 'ph'), [ob(31, an=[(1, 8)], tx=[602, 60])], FIELDS + ',taxon.ancestor_ids')
put(phase_query('juvenile', [602], 'world'), [], FIELDS + ',taxon.ancestor_ids')
# Pierre's own search, asked for every species, full or not: none of his here (his own: the next tests).
put(queries(601)['own'], [])
put(queries(602)['own'], [])
json.dump(c, open(d + '/cache.json', 'w'))`,
    dir
  );
  const run = () =>
    execFileSync(
      'python3',
      ['tools/fetch_seaslugs.py', '--offline', '--src', at('src.json'), '--cand', at('data/cand.json'), '--cache', at('cache.json')],
      {cwd: ROOT, encoding: 'utf8'}
    );
  const log = run();
  const doc = JSON.parse(fs.readFileSync(at('data/cand.json'), 'utf8')),
    C = doc.cand,
    ids = L => [...new Set(L.map(p => +p.o.split('/').pop()))].sort((a, b) => a - b);
  assert.deepStrictEqual(Object.keys(doc), ['v', 'cand']);
  assert.deepStrictEqual(Object.keys(C), ['601', '602'], 'circle 1 only, keyed by iNaturalist taxon id');
  assert.deepStrictEqual(ids(C['601']), [4, 5, 21]);
  // 4: its NC photo (41), not the share-alike one before it; 5: all 3 of its photos; 21 abroad (Bali), not the Red Sea.
  assert.deepStrictEqual(C['601'].map(p => [p.f, p.lic, p.loc]).sort(), [
    ['seaslug-601-cand-210', 'cc-by', 'world'],
    ['seaslug-601-cand-41', 'cc-by-nc', 'dauin'],
    ['seaslug-601-cand-50', 'cc-by', 'dauin'],
    ['seaslug-601-cand-51', 'cc-by', 'dauin'],
    ['seaslug-601-cand-52', 'cc-by', 'dauin']
  ]);
  // 602: the juvenile 31 in its room, 4 adults; 35 (juvenile but egg-annotated) never.
  assert.strictEqual(C['602'].length, 5);
  assert.ok(ids(C['602']).includes(31) && !ids(C['602']).includes(35));
  assert.deepStrictEqual(C['602'].filter(p => p.st === 'juvenile').length, 1);
  assert.match(log, /Slugus juvenilis\s+5 \/ 6 .*short \{"juvenile": 1\}/);
  // The fields of data/fish-cand.json (tools/fetch_fish.py record), st only when annotated.
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
  assert.strictEqual(fs.readFileSync(at('data/cand.json'), 'utf8').split('\n').length, 8);
  // A rerun asks nothing new (--offline) and writes the same file.
  const before = fs.readFileSync(at('data/cand.json'), 'utf8');
  run();
  assert.strictEqual(fs.readFileSync(at('data/cand.json'), 'utf8'), before);
  fs.rmSync(dir, {recursive: true, force: true});
});

test("Pierre's own (Q386, the fish's rule): his Needs ID species photos enter first, on top of a full list, in the target on a new one; --own asks nothing else", () => {
  const dir = mkTmp('slugown-');
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
  fs.writeFileSync(at('data/cand.json'), JSON.stringify({v: 1, cand: {701: [801, 802, 803].map(old)}}));
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
      ['tools/fetch_seaslugs.py', '--offline', '--src', at('src.json'), '--cand', at('data/cand.json'), '--cache', at(cache), ...more],
      {cwd: ROOT, encoding: 'utf8'}
    );
  const ids = L => L.map(p => +p.o.split('/').pop());
  // 1. --own: his search only (the general search of 702 is not in this cache: --offline would stop on it).
  const log = run('cache.json', '--own');
  let C = JSON.parse(fs.readFileSync(at('data/cand.json'), 'utf8')).cand;
  assert.deepStrictEqual(ids(C['701']).sort(), [801, 802, 803, 901, 902, 904], 'on top of the full list, up to max; nothing removed');
  assert.deepStrictEqual(ids(C['702']), [911]);
  const by = Object.fromEntries([...C['701'], ...C['702']].map(p => [+p.o.split('/').pop(), p]));
  assert.strictEqual(by[901].ni, 1, 'his Needs ID observation is marked, as data/fish-cand.json (ni)');
  assert.strictEqual(by[911].ni, 1);
  assert.strictEqual(by[902].ni, undefined, 'his Research Grade one is not');
  assert.strictEqual(by[904].lic, 'own', 'his photo without a licence, as the fish');
  for (const i of [901, 902, 904, 911]) assert.strictEqual(by[i].own, true);
  assert.deepStrictEqual(Object.keys(by[901]), ['f', 'a', 'lic', 'o', 't', 'own', 'loc', 'src', 'r', 'ni']);
  assert.match(log, /Slugus fullus\s+6 \/ 3 .*Pierre's own 4 \(\+3\)/);
  assert.match(log, /Pierre's own added this run: 4/);
  // 2. The normal run: 702's others fill its target of 3 around his one; 701 has no room under its target.
  run('cache2.json');
  C = JSON.parse(fs.readFileSync(at('data/cand.json'), 'utf8')).cand;
  assert.strictEqual(C['702'].length, 3);
  assert.strictEqual(C['702'].filter(p => p.own).length, 1, 'his counts in the target: two others, not three');
  assert.strictEqual(C['701'].length, 6);
  // A rerun writes the same file.
  const before = fs.readFileSync(at('data/cand.json'), 'utf8');
  run('cache2.json');
  assert.strictEqual(fs.readFileSync(at('data/cand.json'), 'utf8'), before);
  fs.rmSync(dir, {recursive: true, force: true});
});

test("Pierre's own come in whatever the room and the ceiling max, every photo (REE-252): a full list takes all of his and no one else's; pick takes his at room 0", () => {
  const out = J(`${OBS}
from collections import Counter
P = 'ppericard'
mk = lambda: [usable(o, EGG) for o in (ob(1), ob(2, u=P, n=3), ob(3, u=P, g='needs_id', n=2), ob(4, u=P, lic=[None]), ob(5))]
r = lambda room: [[o['id'], len(o['P']), o['cost']] for o in pick(mk(), room, Counter(), set(), Counter())]
print(json.dumps([r(0), r(1), sorted(r(4))]))`);
  const his = [
    [2, 3, 2],
    [3, 2, 1.5],
    [4, 1, 1]
  ];
  const mine = L => L.filter(([id]) => [2, 3, 4].includes(id)).sort((a, b) => a[0] - b[0]);
  assert.deepStrictEqual(mine(out[0]), his, 'room 0: all three of his observations, every photo');
  assert.strictEqual(out[0].length, 3, 'and no one else’s');
  assert.deepStrictEqual(mine(out[1]), his);
  assert.strictEqual(out[1].length, 3);
  assert.deepStrictEqual(mine(out[2]), his);
  assert.strictEqual(out[2].length, 3, 'room 4 is spent by his 4.5: nothing left');

  const dir = mkTmp('slugown2-');
  const at = x => path.join(dir, x);
  const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'seaslugs.json'), 'utf8')).photoTarget;
  fs.writeFileSync(
    at('src.json'),
    JSON.stringify({
      photoTarget: {...T, candidates: 2, max: 3, perJuvenileForm: 0, juvenile: {}},
      species: [{name: 'Slugus fullus', inat: 701, circle: 1}]
    })
  );
  const old = i => ({
    f: `seaslug-701-cand-${i * 10}`,
    a: '(c) x',
    lic: 'cc-by',
    o: `https://www.inaturalist.org/observations/${i}`,
    t: 'Slugus fullus',
    own: false,
    loc: 'ph',
    src: 'x',
    r: 1
  });
  // The list is full (2 = its target) and past nothing: his 4 observations (9 photos, 6 of room) go over max (3) all the same.
  fs.writeFileSync(at('data/cand.json'), JSON.stringify({v: 1, cand: {701: [801, 802].map(old)}}));
  py(
    `${OBS}
from fetch_fish import API, FIELDS, queries
d = sys.argv[1]
c = {}
def put(q, obs): c[API + q + '&fields=' + FIELDS] = {'total': len(obs), 'results': obs}
P = 'ppericard'
Q = queries(701)
put(Q['own'], [ob(901, u=P, n=4), ob(902, u=P, n=3), ob(903, u=P, g='needs_id'), ob(904, u=P)])
# Others: not asked at all on a full list (offline would stop on it), and never taken.
put(Q['ph'], [ob(911), ob(912)])
json.dump(c, open(d + '/cache.json', 'w'))`,
    dir
  );
  const run = () =>
    execFileSync(
      'python3',
      ['tools/fetch_seaslugs.py', '--offline', '--src', at('src.json'), '--cand', at('data/cand.json'), '--cache', at('cache.json')],
      {
        cwd: ROOT,
        encoding: 'utf8'
      }
    );
  run();
  const C = JSON.parse(fs.readFileSync(at('data/cand.json'), 'utf8')).cand['701'];
  const ids = C.map(p => +p.o.split('/').pop());
  assert.deepStrictEqual(ids.slice(0, 2), [801, 802], 'nothing removed');
  assert.deepStrictEqual(
    ids.slice(2).sort(),
    [901, 901, 901, 901, 902, 902, 902, 903, 904],
    'every photo of every observation of his, over max (3)'
  );
  assert.ok(!ids.includes(911) && !ids.includes(912), 'no one else’s on a full list');
  const before = fs.readFileSync(at('data/cand.json'), 'utf8');
  run();
  assert.strictEqual(fs.readFileSync(at('data/cand.json'), 'utf8'), before, 'a rerun adds nothing');
  fs.rmSync(dir, {recursive: true, force: true});
});

// The sea slugs without a species name: the genus-level observations agreed by 2 current
// identifications become candidates of their genus unit (gl), and a species with no name yet (tools/seaslug_informal.json)
// gets its presence (3 observers with its label) and its candidates from the observations carrying its label.
test('agreement: identifications at the genus or below agree, off its line disagree, a coarser one on its line neither', () => {
  const out = J(`
G = {'id': 50, 'ancestor_ids': [1, 2, 3, 50]}
idf = lambda t, anc, cur=True: {'current': cur, 'taxon': {'id': t, 'ancestor_ids': anc}}
o = lambda *ids: {'taxon': G, 'identifications': list(ids)}
print(json.dumps([
  agreement(o(idf(50, [1, 2, 3]), idf(51, [1, 2, 3, 50]))),           # the genus and a species of it
  agreement(o(idf(50, [1, 2, 3]), idf(3, [1, 2]))),                   # a coarser one on its line: neither
  agreement(o(idf(50, [1, 2, 3]), idf(60, [1, 2, 3]))),               # another genus: disagrees
  agreement(o(idf(50, [1, 2, 3]), idf(60, [1, 2, 3], cur=False))),    # withdrawn: not counted
  [agreed(x) for x in ({'rk': 'genus', 'g': 'needs_id', 'ag': 2, 'dg': 0}, {'rk': 'genus', 'g': 'needs_id', 'ag': 1, 'dg': 0},
                       {'rk': 'genus', 'g': 'needs_id', 'ag': 3, 'dg': 1}, {'rk': 'genus', 'g': 'research', 'ag': 1, 'dg': 0},
                       {'rk': 'species', 'g': 'research', 'ag': 2, 'dg': 0})]]))`);
  assert.deepStrictEqual(out, [
    [2, 0],
    [1, 0],
    [1, 1],
    [1, 0],
    [true, false, false, true, false]
  ]);
});

test('fetch_seaslugs.py --informal --genus-level offline: the label presence, its candidates first, the genus units’ gl candidates', () => {
  const dir = mkTmp('sluggl-');
  const at = x => path.join(dir, x);
  const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'seaslugs.json'), 'utf8')).photoTarget;
  const src = {
    photoTarget: {...T, candidates: 2, max: 30, perJuvenileForm: 0, juvenile: {}},
    species: [
      {name: 'Slugus slugii', genus: 'Slugus', inat: 601, circle: 1},
      {name: 'Limax limacis', genus: 'Limax', inat: 701, circle: 3},
      {name: 'Outus outi', genus: 'Outus', inat: 801, circle: 4}
    ]
  };
  const inf = {
    species: [
      {
        key: 'slugus-sp1',
        name: 'Slugus sp. 1',
        genus: 'Slugus',
        src: 'A 2020',
        cite: 'A',
        field: {id: 5, name: 'Slugus sp. 1?', value: 'Yes'}
      },
      {key: 'limax-sp9', name: 'Limax sp. 9', genus: 'Limax', src: 'B 2021', cite: 'B', field: {id: 6, name: 'Limax sp. 9?', value: 'Yes'}}
    ]
  };
  fs.writeFileSync(at('src.json'), JSON.stringify(src));
  fs.writeFileSync(at('inf.json'), JSON.stringify(inf));
  py(
    `${OBS}
import inat
import urllib.parse as U
from fetch_fish import API, TAXA
from presence import NEAR_AREA
d = sys.argv[1]
INF = json.load(open(d + '/inf.json'))['species']
c = {}
def gl(i, ag=2, dg=0, g='needs_id', tid=60, **k):
    o = ob(i, g=g, rk='genus', **k)
    o.update({'t': {60: 'Slugus', 70: 'Limax'}[tid], 'tid': tid, 'ag': ag, 'dg': dg})
    return o
def put(url, results): c[url] = {'total': len(results), 'results': results}
anc = lambda gid, name: [[1, 'Animalia', 'kingdom'], [gid, name, 'genus']]
# the genus ids: one species of each genus and its ancestors, in one request (by genus name: Limax, then Slugus)
c[TAXA + '701,601?fields=id,ancestors.id,ancestors.name,ancestors.rank'] = {'results': [{'id': 601, 'anc': anc(60, 'Slugus')}, {'id': 701, 'anc': anc(70, 'Limax')}]}
# presence: Slugus sp. 1 by 3 observers (in), Limax sp. 9 by 2 (out: never asked for candidates); 1 near Dauin each
for gid, f, n, u in ((60, INF[0]['field'], 4, 3), (70, INF[1]['field'], 2, 2)):
    for near, nn, nu in ((False, n, u), (True, 1, 1)):
        ff = 'field:' + U.quote(f['name']) + '=' + U.quote(f['value'])
        base = f'taxon_id={gid}&verifiable=true&{ff}&' + (NEAR_AREA if near else 'place_id=6873')
        c[inat.V1 + 'observations?' + base + '&per_page=0'] = {'total': nn}
        c[inat.V1 + 'observations/observers?' + base + '&per_page=1'] = {'total': nu}
# Slugus sp. 1's observations: 3 usable (an egg one and one not agreed left out); 2 taken (its target 2)
put(API + label_query(60, INF[0]['field']) + '&fields=' + GL_FIELDS, [gl(10), gl(11), gl(12), gl(13, an=[(1, 7)]), gl(14, ag=1)])
# genus level, both genera in one search: Slugus 10-12 again (the two the species took never twice), 20 (disagreed),
# 21 share-alike only, 22 abroad, 23 Research Grade with 1 agreeing; Limax 30, 31 (Dead), 32
put(API + gl_query([60, 70]) + '&fields=' + GL_FIELDS,
    [gl(10), gl(11), gl(12), gl(20, dg=1), gl(21, lic='cc-by-sa'), gl(22, inph=False, ll=(-8.5, 115.2)), gl(23, g='research', ag=1),
     gl(30, tid=70), gl(31, tid=70, an=[(17, 19)]), gl(32, tid=70)])
json.dump(c, open(d + '/cache.json', 'w'))`,
    dir
  );
  const run = (...more) =>
    execFileSync(
      'python3',
      [
        'tools/fetch_seaslugs.py',
        '--offline',
        '--src',
        at('src.json'),
        '--informal-src',
        at('inf.json'),
        '--cand',
        at('data/cand.json'),
        '--cache',
        at('cache.json'),
        ...more
      ],
      {cwd: ROOT, encoding: 'utf8'}
    );
  const log = run('--informal', '--genus-level');
  const C = JSON.parse(fs.readFileSync(at('data/cand.json'), 'utf8')).cand,
    ids = L => L.map(p => +p.o.split('/').pop()).sort((a, b) => a - b);
  assert.deepStrictEqual(Object.keys(C), ['slugus-sp1', 'Slugus', 'Limax'], 'the species with no name, then the genera in list order');
  assert.strictEqual(C['slugus-sp1'].length, 2);
  assert.ok(ids(C['slugus-sp1']).every(i => [10, 11, 12].includes(i)));
  assert.ok(C['slugus-sp1'].every(p => !p.gl && p.f.startsWith('seaslug-slugus-sp1-cand-')));
  // Slugus: the one of 10-12 left, then 23 (Research Grade); never 20 (disagreed), 21, 22 or the species' two
  assert.strictEqual(C.Slugus.length, 2);
  assert.ok(ids(C.Slugus).includes(23) && !ids(C.Slugus).some(i => [20, 21, 22].includes(i) || ids(C['slugus-sp1']).includes(i)));
  assert.deepStrictEqual(ids(C.Limax), [30, 32], 'Dead left out');
  for (const p of [...C.Slugus, ...C.Limax]) assert.deepStrictEqual([p.gl, p.f.split('-')[1]], [1, p.t]);
  const I = JSON.parse(fs.readFileSync(at('inf.json'), 'utf8')).species;
  assert.deepStrictEqual(
    I.map(s => s.presence),
    [
      {obs: 4, observers: 3, nearObs: 1, nearObservers: 1, near: false, confirmed: true},
      {obs: 2, observers: 2, nearObs: 1, nearObservers: 1, near: false, confirmed: false}
    ]
  );
  assert.match(log, /Limax sp\. 9: 2 observers .* no candidates/);
  assert.match(log, /genus level: 4 candidates added over 2 of 2 genera/);
  // A rerun adds nothing and writes the same file.
  const before = fs.readFileSync(at('data/cand.json'), 'utf8');
  run('--informal', '--genus-level');
  assert.strictEqual(fs.readFileSync(at('data/cand.json'), 'utf8'), before);
  fs.rmSync(dir, {recursive: true, force: true});
});

test("Pierre's own agreed observations of the genus-level and no-name lists come in whatever the room; --own --informal --genus-level asks his search only (REE-252)", () => {
  const dir = mkTmp('sluggl-own-');
  const at = x => path.join(dir, x);
  const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'seaslugs.json'), 'utf8')).photoTarget;
  fs.writeFileSync(
    at('src.json'),
    JSON.stringify({
      photoTarget: {...T, candidates: 2, max: 30, perJuvenileForm: 0, juvenile: {}},
      species: [
        {name: 'Slugus slugii', genus: 'Slugus', inat: 601, circle: 1},
        {name: 'Limax limacis', genus: 'Limax', inat: 701, circle: 3}
      ]
    })
  );
  const pres = {obs: 4, observers: 3, nearObs: 1, nearObservers: 1, near: false, confirmed: true};
  const inf = {
    species: [
      {
        key: 'slugus-sp1',
        name: 'Slugus sp. 1',
        genus: 'Slugus',
        src: 'A 2020',
        cite: 'A',
        field: {id: 5, name: 'Slugus sp. 1?', value: 'Yes'},
        presence: pres
      }
    ]
  };
  fs.writeFileSync(at('inf.json'), JSON.stringify(inf));
  // The lists 'Slugus' and 'slugus-sp1' are full (2 = their target), held by others' observations 10, 11 and 20, 21.
  const old = (key, i, gl) => ({
    f: `seaslug-${key}-cand-${i * 10}`,
    a: '(c) x',
    lic: 'cc-by',
    o: `https://www.inaturalist.org/observations/${i}`,
    t: key,
    own: false,
    loc: 'ph',
    src: 'x',
    r: 1,
    ...(gl ? {gl: 1} : {})
  });
  fs.writeFileSync(
    at('data/cand.json'),
    JSON.stringify({
      v: 1,
      cand: {Slugus: [10, 11].map(i => old('Slugus', i, true)), 'slugus-sp1': [20, 21].map(i => old('slugus-sp1', i, false))}
    })
  );
  py(
    `${OBS}
from fetch_fish import API, TAXA
d = sys.argv[1]
INF = json.load(open(d + '/inf.json'))['species']
P = 'ppericard'
c = {}
def gl(i, ag=2, dg=0, g='needs_id', tid=60, **k):
    o = ob(i, g=g, rk='genus', **k)
    o.update({'t': {60: 'Slugus', 70: 'Limax'}[tid], 'tid': tid, 'ag': ag, 'dg': dg})
    return o
def put(url, results): c[url] = {'total': len(results), 'results': results}
anc = lambda gid, name: [[1, 'Animalia', 'kingdom'], [gid, name, 'genus']]
c[TAXA + '701,601?fields=id,ancestors.id,ancestors.name,ancestors.rank'] = {'results': [{'id': 601, 'anc': anc(60, 'Slugus')}, {'id': 701, 'anc': anc(70, 'Limax')}]}
c[TAXA + '601?fields=id,ancestors.id,ancestors.name,ancestors.rank'] = {'results': [{'id': 601, 'anc': anc(60, 'Slugus')}]}
# His: 41 (two photos, Needs ID agreed by 2), 42 (not agreed: left out), 43 (Research Grade at the genus), 40 (carries the label).
mine = [gl(41, u=P, n=2), gl(42, u=P, tid=70, ag=1), gl(43, u=P, tid=70, g='research', ag=1)]
put(API + gl_query([60, 70], OWN_ONLY) + '&fields=' + GL_FIELDS, mine)
put(API + label_query(60, INF[0]['field'], OWN_ONLY) + '&fields=' + GL_FIELDS, [gl(40, u=P)])
# The general genus-level search, for the normal run only: his 41 among others; Slugus is full, Limax has room for one.
put(API + gl_query([60, 70]) + '&fields=' + GL_FIELDS, [gl(50), gl(41, u=P, n=2), gl(51), gl(60, tid=70)])
json.dump(c, open(d + '/cache.json', 'w'))`,
    dir
  );
  const run = (...more) =>
    execFileSync(
      'python3',
      [
        'tools/fetch_seaslugs.py',
        '--offline',
        '--src',
        at('src.json'),
        '--informal-src',
        at('inf.json'),
        '--cand',
        at('data/cand.json'),
        '--cache',
        at('cache.json'),
        ...more
      ],
      {cwd: ROOT, encoding: 'utf8'}
    );
  const ids = L => L.map(p => +p.o.split('/').pop());
  const cand = () => JSON.parse(fs.readFileSync(at('data/cand.json'), 'utf8')).cand;
  // 1. A normal genus-level run: the full 'Slugus' list takes his 41 (both photos) and neither 50 nor 51; Limax takes 60 for its room.
  run('--genus-level');
  let C = cand();
  assert.deepStrictEqual(ids(C.Slugus).slice(2).sort(), [41, 41], 'his, whole, on a full list; no one else’s');
  assert.deepStrictEqual(ids(C.Limax), [60]);
  // 2. --own --informal --genus-level: his search only (the general search is not asked again), the presence kept as it is.
  const infBefore = fs.readFileSync(at('inf.json'), 'utf8');
  run('--own', '--informal', '--genus-level');
  C = cand();
  assert.deepStrictEqual(ids(C['slugus-sp1']).slice(2), [40], 'his observation carrying the label, on a full list');
  assert.deepStrictEqual(ids(C.Slugus).slice(2).sort(), [41, 41], '41 is not taken twice');
  assert.deepStrictEqual(ids(C.Limax).sort(), [43, 60], 'his Research Grade genus-level observation; 42 (not agreed) stays out');
  assert.strictEqual(fs.readFileSync(at('inf.json'), 'utf8'), infBefore, 'the presence is not measured again');
  const before = fs.readFileSync(at('data/cand.json'), 'utf8');
  run('--own', '--informal', '--genus-level');
  assert.strictEqual(fs.readFileSync(at('data/cand.json'), 'utf8'), before, 'a rerun adds nothing');
  fs.rmSync(dir, {recursive: true, force: true});
});

// The ceiling of 30 for the very variable genera (photoTarget.maxGenera: Chromodoris, Phyllidia), a photo target per
// species (docs/reviews/2026-11-15-seaslug-list.md 5.3): their species have the ceiling as their target, never above it.
test('the photo target: 30 for a species of a very variable genus (maxGenera), 20 for the others, never above max', () => {
  const out = J(`
T = json.load(open('tools/seaslugs.json'))['photoTarget']
J = {**T, 'juvenile': {'Chromodoris juvenilis': 'a source', 'Slugus juvenilis': 'a source'}}
print(json.dumps([T['maxGenera'], target({'name': 'Chromodoris annae', 'genus': 'Chromodoris'}, T),
                  target({'name': 'Phyllidia ocellata', 'genus': 'Phyllidia'}, T),
                  target({'name': 'Nembrotha kubaryana', 'genus': 'Nembrotha'}, T),
                  target({'name': 'Chromodoris juvenilis', 'genus': 'Chromodoris'}, J),
                  target({'name': 'Slugus juvenilis', 'genus': 'Slugus'}, J),
                  target({'name': 'Phyllidiella pustulosa', 'genus': 'Phyllidiella'}, T),
                  target({'name': 'No genus'}, T),
                  [gl_target(g, T) for g in ('Chromodoris', 'Phyllidia', 'Phyllidiella')],
                  # the egg refill's genus-level jobs take the same target (Codex review #1048)
                  'gl_target(g, T), "gl"' in __import__('inspect').getsource(run)]))`);
  assert.deepStrictEqual(out, [
    ['Chromodoris', 'Phyllidia'],
    [30, 0],
    [30, 0],
    [20, 0],
    [30, 5], // the ceiling holds; its 5 juvenile places inside it
    [25, 5],
    [20, 0], // a genus of the same family, not listed
    [20, 0],
    [30, 30, 20], // a genus's genus-level list: the ceiling for a very variable genus too (gl_target)
    true
  ]);
});

// The egg rule's filter 2: a candidate judged an egg mass frees its place, and an observation whose every candidate is one
// brings its next usable photos, asked again by id (eggs_back), as they are now.
test('egg masses: the observation of an egg-only candidate brings its next usable photos, within the target; the egg one counts nothing', () => {
  const out = J(`${OBS}
from collections import Counter
from fetch_fish import Net
import tempfile, os
d = tempfile.mkdtemp()
def sp(i, tid=601, **k):  # as trim_id keeps it: the taxon's line in tx, the agreement
    o = ob(i, n=3, tx=[tid, 60, 1], **k)
    o.update({'tid': tid, 'ag': 1, 'dg': 0})
    return o
def gen(i, **k):
    o = ob(i, n=2, rk='genus', g='research', **k)
    o.update({'t': 'Slugus', 'tid': 60, 'ag': 0, 'dg': 0})
    return o
rec = lambda key, i, k=0, **x: {'f': f'seaslug-{key}-cand-{i * 10 + k}', 'o': obs_url(i), **x}
# species 601: 1 an egg mass (its next photo 11), 2 an egg mass whose other photos are share-alike, 3 an egg mass
# re-identified since as another species, 4 a normal candidate, 5 an egg mass whose observation already has another
# candidate (not egg-only); genus Slugus: 7 an egg mass (next photo 71); species 602 full without its egg mass
# (target 1): its 8 never asked
L601 = [rec(601, 1), rec(601, 2), rec(601, 3), rec(601, 4), rec(601, 5), rec(601, 5, 1)]
LG = [rec('Slugus', 7, gl=1)]
L602 = [rec(602, 8), rec(602, 9)]
egg = {'seaslug-601-cand-10', 'seaslug-601-cand-20', 'seaslug-601-cand-30', 'seaslug-601-cand-50', 'seaslug-Slugus-cand-70',
       'seaslug-602-cand-80'}
used = {p['f'].rsplit('-', 1)[-1] for L in (L601, LG, L602) for p in L}
# never captive, as every search (Codex review #1046)
assert 'captive=false' in egg_query([1])
# asked once, every observation with an egg-mass candidate in these lists (5 and 8 included: the same set on a rerun)
c = {egg_query([1, 2, 3, 5, 7, 8]): {'results': [sp(1), sp(2, lic=['cc-by', 'cc-by-sa', 'cc-by-nc-sa']), sp(3, tid=699), sp(5),
                                              gen(7), sp(8, tid=602)]}}
json.dump(c, open(d + '/c.json', 'w'))
net = Net(d + '/c.json', offline=True)
jobs = [('601', L601, 5, 'sp', 'Slugus', None), ('Slugus', LG, 20, 'gl', 'Slugus', None), ('602', L602, 1, 'sp', 'Slugus', None)]
got = eggs_back(net, jobs, egg, EGG, used)
again = eggs_back(net, jobs, egg, EGG, used)
print(json.dumps([{k: [[r['f'], r['o'].rsplit('/', 1)[-1], r.get('gl')] for r in v] for k, v in got.items()}, again,
                  [held(L601, egg), held(LG, egg), held(L602, egg)], egg_only(L601, egg), sorted(egg_set(
                  {'seaslug': {'a': {'egg': 1}, 'b': {'jt': 'x', 'e': 3}, 'c': 'bad'}, 'fish': {'d': {'egg': 1}}}))]))`);
  assert.deepStrictEqual(out[0], {
    // its next usable photos, 1 + 0.5 of the room; 2 (share-alike only) and 3 (another species) none
    601: [
      ['seaslug-601-cand-11', '1', null],
      ['seaslug-601-cand-12', '1', null]
    ],
    Slugus: [['seaslug-Slugus-cand-71', '7', 1]]
  });
  assert.deepStrictEqual(out[1], {}, 'a rerun brings nothing: the observation has its photos now');
  assert.deepStrictEqual(out[2], [3.5, 1, 1], 'the egg masses count against nothing (601: 4 and 5 for 1 each, the new 11 and 12 for 1.5)');
  assert.deepStrictEqual(
    out[3],
    ['https://www.inaturalist.org/observations/2', 'https://www.inaturalist.org/observations/3'],
    'after the run: 2 and 3 still egg-only'
  );
  assert.deepStrictEqual(out[4], ['a'], 'the sea slugs’ egg judgements only');
});

test('fetch_seaslugs.py --genus-level offline: an egg-only candidate’s observation keeps its place with its next photo, first; the target counts the rest', () => {
  const dir = mkTmp('slugegg-');
  const at = x => path.join(dir, x);
  const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'seaslugs.json'), 'utf8')).photoTarget;
  fs.writeFileSync(
    at('src.json'),
    JSON.stringify({
      photoTarget: {...T, candidates: 2, max: 30, perJuvenileForm: 0, juvenile: {}},
      species: [{name: 'Slugus slugii', genus: 'Slugus', inat: 601, circle: 1}]
    })
  );
  fs.writeFileSync(at('inf.json'), JSON.stringify({species: []}));
  const old = [
    {
      f: 'seaslug-Slugus-cand-100',
      a: '(c) u10',
      lic: 'cc-by',
      o: 'https://www.inaturalist.org/observations/10',
      t: 'Slugus',
      own: false,
      loc: 'dauin',
      src: 'x',
      r: 1,
      gl: 1
    },
    {
      f: 'seaslug-Slugus-cand-110',
      a: '(c) u11',
      lic: 'cc-by',
      o: 'https://www.inaturalist.org/observations/11',
      t: 'Slugus',
      own: false,
      loc: 'dauin',
      src: 'x',
      r: 1,
      gl: 1
    }
  ];
  fs.writeFileSync(at('data/cand.json'), JSON.stringify({v: 1, cand: {Slugus: old}}));
  fs.writeFileSync(at('sug.json'), JSON.stringify({seaslug: {'seaslug-Slugus-cand-100': {egg: 1, n: 'an egg rosette'}}}));
  py(
    `${OBS}
from fetch_fish import API, TAXA
d = sys.argv[1]
def gl(i, n=1):
    o = ob(i, g='research', rk='genus', n=n)
    o.update({'t': 'Slugus', 'tid': 60, 'ag': 0, 'dg': 0})
    return o
anc = [[1, 'Animalia', 'kingdom'], [60, 'Slugus', 'genus']]
c = {TAXA + '601?fields=id,ancestors.id,ancestors.name,ancestors.rank': {'results': [{'id': 601, 'anc': anc}]},
     egg_query([10]): {'results': [gl(10, n=3)]},
     API + gl_query([60]) + '&fields=' + GL_FIELDS: {'total': 4, 'results': [gl(10, n=3), gl(11), gl(12), gl(13)]}}
json.dump(c, open(d + '/cache.json', 'w'))`,
    dir
  );
  const args = ['tools/fetch_seaslugs.py', '--offline', '--genus-level', '--src', at('src.json'), '--informal-src', at('inf.json')];
  const run = () =>
    execFileSync('python3', [...args, '--cand', at('data/cand.json'), '--cache', at('cache.json'), '--suggest', at('sug.json')], {
      cwd: ROOT,
      encoding: 'utf8'
    });
  const log = run();
  const L = JSON.parse(fs.readFileSync(at('data/cand.json'), 'utf8')).cand.Slugus;
  // 100 (the egg mass) stays, 110 stays, 101 (observation 10's next photo) takes the freed place: the target of 2 is
  // full again without a new observation; 12 and 13 wait.
  assert.deepStrictEqual(
    L.map(p => p.f),
    ['seaslug-Slugus-cand-100', 'seaslug-Slugus-cand-110', 'seaslug-Slugus-cand-101']
  );
  assert.deepStrictEqual([L[2].o, L[2].gl], ['https://www.inaturalist.org/observations/10', 1]);
  assert.match(log, /egg masses: 1 observations brought their next photos \(Slugus 1\)/);
  assert.match(log, /Slugus\s+2 \/ 2 \(\+0;/);
  const before = fs.readFileSync(at('data/cand.json'), 'utf8');
  run();
  assert.strictEqual(fs.readFileSync(at('data/cand.json'), 'utf8'), before, 'a rerun changes nothing');
  fs.rmSync(dir, {recursive: true, force: true});
});

// A species with no name (tools/seaslug_informal.json) is its label: an egg-only observation of its list
// brings its next photo only while it still carries that label as label_query asks it.
test('egg masses of a species with no name: the next photo only while its observation still carries the label', () => {
  const out = J(`${OBS}
from fetch_fish import Net
import tempfile
d = tempfile.mkdtemp()
F = {'id': 5, 'name': 'Slugus sp. 1?', 'value': 'Yes'}
def gen(i, of):
    o = ob(i, n=2, rk='genus', g='research')
    o.update({'t': 'Slugus', 'tid': 60, 'ag': 0, 'dg': 0, 'of': of})
    return o
rec = lambda i: {'f': f'seaslug-slugus-sp1-cand-{i * 10}', 'o': obs_url(i)}
# 1 still labelled (by its field id, the value's case aside), 2 labelled by the name alone, 3 its label changed to
# another species with no name, 4 its label removed, 5 the same field set to No
L = [rec(i) for i in (1, 2, 3, 4, 5)]
egg = {p['f'] for p in L}
c = {egg_query([1, 2, 3, 4, 5]): {'results': [gen(1, [[5, 'Slugus sp. 1?', 'yes']]), gen(2, [[None, 'Slugus sp. 1?', 'Yes']]),
                                             gen(3, [[6, 'Slugus sp. 2?', 'Yes']]), gen(4, []), gen(5, [[5, 'Slugus sp. 1?', 'No']])]}}
json.dump(c, open(d + '/c.json', 'w'))
used = {p['f'].rsplit('-', 1)[-1] for p in L}
got = eggs_back(Net(d + '/c.json', offline=True), [('slugus-sp1', L, 20, 'inf', 'Slugus', F)], egg, EGG, used)
print(json.dumps([[r['f'], 'gl' in r] for r in got.get('slugus-sp1', [])]))`);
  assert.deepStrictEqual(out, [
    ['seaslug-slugus-sp1-cand-11', false],
    ['seaslug-slugus-sp1-cand-21', false]
  ]);
});

test('trim_id keeps the observation fields; labelled reads them; egg_query asks for them', () => {
  const out = J(`
o = trim_id({'id': 9, 'quality_grade': 'research', 'taxon': {'id': 60, 'name': 'Slugus', 'rank': 'genus'},
             'ofvs': [{'field_id': 5, 'name': 'Slugus sp. 1?', 'value': 'Yes', 'datatype': 'text'}]})
F = {'id': 5, 'name': 'Slugus sp. 1?', 'value': 'Yes'}
print(json.dumps([o['of'], labelled(o, F), labelled(o, {**F, 'value': 'No'}), labelled({**o, 'of': []}, F),
                  'ofvs.value' in egg_query([9]) and 'ofvs.field_id' in egg_query([9])]))`);
  assert.deepStrictEqual(out, [[[5, 'Slugus sp. 1?', 'Yes']], true, false, false, true]);
});

// --topup: the sea slugs' counterpart of the fish's. Every observation among the candidates (a species', a genus-level
// list's, a species with no name's) is asked again by id, and its other usable photos come, never blocking.
test('fetch_seaslugs.py --topup offline: every list’s observations bring their other photos; gone, re-identified or moved ones nothing; a rerun adds nothing', () => {
  const dir = mkTmp('slugtop-');
  const at = x => path.join(dir, x);
  const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'seaslugs.json'), 'utf8')).photoTarget;
  fs.writeFileSync(
    at('src.json'),
    JSON.stringify({photoTarget: {...T, candidates: 2}, species: [{name: 'Slugus slugii', genus: 'Slugus', inat: 601, circle: 1}]})
  );
  const F = {id: 5, name: 'Slugus sp. 1?', value: 'Yes'};
  fs.writeFileSync(at('inf.json'), JSON.stringify({species: [{key: 'slugus-sp1', name: 'Slugus sp. 1', genus: 'Slugus', field: F}]}));
  const rec = (key, i, x = {}) => ({
    f: `seaslug-${key}-cand-${i * 10}`,
    a: `(c) u${i}`,
    lic: 'cc-by',
    o: `https://www.inaturalist.org/observations/${i}`,
    t: 'Slugus slugii',
    own: false,
    loc: 'dauin',
    src: 'x',
    r: 1,
    ...x
  });
  // The species 601 is full (target 2) with 5 candidates: a topup goes over the target, nothing is removed.
  fs.writeFileSync(
    at('data/cand.json'),
    JSON.stringify({
      v: 1,
      cand: {
        601: [1, 2, 3, 4, 5].map(i => rec(601, i)),
        Slugus: [rec('Slugus', 7, {gl: 1, t: 'Slugus'})],
        'slugus-sp1': [rec('slugus-sp1', 8, {t: 'Slugus'})]
      }
    })
  );
  fs.writeFileSync(at('cur.json'), JSON.stringify({seaslug: {out: {'seaslug-601-cand-50': 'x'}}}));
  py(
    `${OBS}
d = sys.argv[1]
def sp(i, tid=601, **k):  # as trim_id keeps it
    o = ob(i, tx=[tid, 60, 1], **k)
    o.update({'tid': tid, 'ag': 1, 'dg': 0})
    return o
def gen(i, of=(), **k):
    o = ob(i, rk='genus', g='research', **k)
    o.update({'t': 'Slugus', 'tid': 60, 'ag': 0, 'dg': 0, 'of': [list(x) for x in of]})
    return o
# asked: 1-4, 7, 8 (5 has a photo Pierre moved: not asked). 1: 3 photos (2 more), 2: one photo (complete), 3 re-identified
# as another species, 4 not returned (deleted since), 7 a genus-level one with a second photo, 8 labelled, a second photo.
c = {egg_query([1, 2, 3, 4, 7, 8]): {'results': [sp(1, n=3), sp(2), sp(3, tid=699, n=2), gen(7, n=2), gen(8, [(5, 'Slugus sp. 1?', 'Yes')], n=2)]}}
json.dump(c, open(d + '/cache.json', 'w'))`,
    dir
  );
  const run = (...more) =>
    execFileSync(
      'python3',
      [
        'tools/fetch_seaslugs.py',
        '--offline',
        '--topup',
        '--src',
        at('src.json'),
        '--informal-src',
        at('inf.json'),
        '--cand',
        at('data/cand.json'),
        '--cache',
        at('cache.json'),
        '--cur',
        at('cur.json'),
        ...more
      ],
      {cwd: ROOT, encoding: 'utf8'}
    );
  const log = run();
  const C = JSON.parse(fs.readFileSync(at('data/cand.json'), 'utf8')).cand;
  assert.deepStrictEqual(
    C['601'].map(p => p.f),
    [10, 20, 30, 40, 50].map(i => `seaslug-601-cand-${i}`).concat(['seaslug-601-cand-11', 'seaslug-601-cand-12']),
    'observation 1 brings its 2 other photos, appended; 2 is complete, 3 re-identified, 4 gone, 5 moved'
  );
  assert.deepStrictEqual(
    C.Slugus.map(p => [p.f, p.gl]),
    [
      ['seaslug-Slugus-cand-70', 1],
      ['seaslug-Slugus-cand-71', 1]
    ]
  );
  assert.deepStrictEqual(
    C['slugus-sp1'].map(p => [p.f, p.gl]),
    [
      ['seaslug-slugus-sp1-cand-80', undefined],
      ['seaslug-slugus-sp1-cand-81', undefined]
    ]
  );
  const added = C['601'][5];
  assert.deepStrictEqual(
    [added.o, added.lic, added.loc, added.r, added.a, Object.keys(added).filter(k => k !== 'st')],
    ['https://www.inaturalist.org/observations/1', 'cc-by', 'dauin', 1, '(c) u1', ['f', 'a', 'lic', 'o', 't', 'own', 'loc', 'src', 'r']]
  );
  assert.match(
    log,
    /topup: 6 observations asked again \(0 requests\), 5 returned, 1 gone since; 3 brought 4 more photos \(2 of species, 1 genus-level, 1 of species with no name\); 1 had every photo already, 1 no longer usable/
  );
  // A rerun asks nothing and adds nothing (the file is the same).
  const before = fs.readFileSync(at('data/cand.json'), 'utf8');
  assert.match(
    run(),
    /topup: 6 observations asked again \(0 requests\), 5 returned, 1 gone since; 0 brought 0 more photos .*4 had every photo already, 1 no longer usable/
  );
  assert.strictEqual(fs.readFileSync(at('data/cand.json'), 'utf8'), before);
  fs.rmSync(dir, {recursive: true, force: true});
});

test('fetch_seaslugs.py --topup stops before asking when it would take more than the allowed requests (rule C7)', () => {
  const dir = mkTmp('slugtopmax-');
  const at = x => path.join(dir, x);
  const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'seaslugs.json'), 'utf8')).photoTarget;
  fs.writeFileSync(at('src.json'), JSON.stringify({photoTarget: T, species: []}));
  fs.writeFileSync(at('inf.json'), JSON.stringify({species: []}));
  // 8,201 observations: 42 requests of 200; the limit is 40 (about 26 for the 5,200 there are).
  const L = Array.from({length: 8201}, (_, k) => ({
    f: `seaslug-601-cand-${k + 1}0`,
    o: `https://www.inaturalist.org/observations/${k + 1}`
  }));
  fs.writeFileSync(at('data/cand.json'), JSON.stringify({v: 1, cand: {601: L}}));
  let err = '';
  try {
    execFileSync(
      'python3',
      [
        'tools/fetch_seaslugs.py',
        '--offline',
        '--topup',
        '--src',
        at('src.json'),
        '--informal-src',
        at('inf.json'),
        '--cand',
        at('data/cand.json'),
        '--cache',
        at('cache.json'),
        '--cur',
        at('cur.json')
      ],
      {cwd: ROOT, encoding: 'utf8', stdio: 'pipe'}
    );
  } catch (e) {
    err = String(e.stderr);
  }
  assert.match(err, /8201 observations would take 42 requests, more than the 40 allowed/);
  fs.rmSync(dir, {recursive: true, force: true});
});

// A temporary tree as the repository has it: the tools' and the admin's data live in data/.
function mkTmp(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(d, 'data'));
  return d;
}
