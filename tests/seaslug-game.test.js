// The sea-slug subject's game data (tools/seaslug_game.py; study docs/reviews/2026-11-15-nudibranch-mode-study.md §9,
// step 5): the tree in fish.json's shape, scientific names only (Q369 d), its commonness over the Philippines (Q369 b),
// the photos in play from the judged candidates under the photo target (Q377), and the committed files as the tool
// writes them from tools/seaslugs.json, seaslug-cand.json and suggest.json "seaslug" (a re-judge must rebuild them).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {spawnSync} = require('child_process'),
  C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  TOOLS = path.join(ROOT, 'tools'),
  json = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const py = body => {
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(TOOLS)})\nimport seaslug_game as g\n${body}`;
  const r = spawnSync('python3', ['-c', code], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

test('the committed seaslug.json and seaslug-game.json are what the tool builds (--check)', () => {
  const r = spawnSync('python3', [path.join(TOOLS, 'seaslug_game.py'), '--check'], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr);
});

// Made-up list: three species of two families, one with a documented juvenile form; the target start 2, cap 2, +1.
const LIST = {
  area: {inatPlace: 6873, name: 'Philippines'},
  centre: {name: 'Dauin'},
  photoTarget: {start: 2, gameCap: 2, perJuvenileForm: 1, juvenile: {'Aa bb': 'documented'}},
  lookalikes: [{pair: ['Aa bb', 'Aa cc']}],
  species: [
    {
      rank: 2,
      name: 'Aa cc',
      inat: 2,
      family: 'Afam',
      genus: 'Aa',
      group: 'Nudibranchia',
      circle: 1,
      observers: 50,
      near: true,
      nearObservers: 3,
      nearObs: 4,
      worms: {aphia: 20, accepted: 'Aa cc'}
    },
    {
      rank: 1,
      name: 'Aa bb',
      inat: 1,
      family: 'Afam',
      genus: 'Aa',
      group: 'Nudibranchia',
      circle: 1,
      star: true,
      observers: 90,
      near: false,
      worms: {aphia: 10, aphiaAcc: 11, accepted: 'Zz bb'}
    },
    {rank: 3, name: 'Bb dd', inat: 3, family: 'Bfam', genus: 'Bb', group: 'Sacoglossa', circle: 1, observers: 9, worms: {}},
    {rank: 4, name: 'Cc ee', inat: 4, family: 'Cfam', genus: 'Cc', group: 'Nudibranchia', circle: 2, observers: 8, worms: {}}
  ]
};
const cand = (id, n) => ({
  f: `seaslug-${id}-cand-${n}`,
  o: `https://www.inaturalist.org/observations/${n}`,
  src: `https://x/${n}.jpg`,
  a: 'A',
  lic: 'cc-by',
  t: 'T',
  loc: 'ph'
});
const CAND = {cand: {1: [1, 2, 3, 4, 5, 6].map(n => cand(1, n)), 2: [7, 8, 9].map(n => cand(2, n)), 3: [10, 11].map(n => cand(3, n))}};
const SUG = {
  'seaslug-1-cand-1': {jt: 'd1g0sl1', e: 5, k: 'best'},
  'seaslug-1-cand-2': {jt: 'o1g0sm1', e: 4},
  'seaslug-1-cand-3': {jt: 'p1g0sl1', e: 3, k: 'best'},
  'seaslug-1-cand-4': {jt: 'd1g0sl1j', e: 2, k: 'best'}, // a juvenile: the documented form's +1
  'seaslug-1-cand-5': {jt: 'd1g0sl1j', e: 1, k: 'best'}, // a second one: beyond the +1
  'seaslug-1-cand-6': {egg: true},
  'seaslug-2-cand-7': {jt: 'd1g0sl1', e: 5, k: 'best', u: ['code'], n: 'unsure'},
  'seaslug-2-cand-8': {jt: 'd1g0slk', e: 4, k: 'best'}, // another species one could take for it (rule P3)
  'seaslug-2-cand-9': {jt: 'v1g0sl1', e: 3, k: 'dup'},
  'seaslug-3-cand-10': {jt: 'd1g0slo', e: 4, k: 'best'},
  'seaslug-3-cand-11': {jt: 'd1g0sl1a', e: 3, k: 'alt'} // out of the water
};

test('the tree: circle 1 only, fish.json shape, scientific names, the area commonness, the decided pair', () => {
  const arg = x => `json.loads(${JSON.stringify(JSON.stringify(x))})`,
    o = py(`print(json.dumps(g.build(${arg(LIST)}, ${arg(CAND)}, ${arg(SUG)})))`);
  const [T, G] = o;
  assert.deepStrictEqual(
    T.families.map(f => [f.id, f.name, f.species, f.genera]),
    [
      ['f:Afam', 'Afam', ['s1', 's2'], ['g:Aa']],
      ['f:Bfam', 'Bfam', ['s3'], ['g:Bb']]
    ],
    'by their most common species; circle 2 left out'
  );
  assert.strictEqual(T.key, null, 'no identification key (rule S3: none for this region yet)');
  assert.deepStrictEqual(T.area, LIST.area);
  const s1 = T.species[0];
  assert.deepStrictEqual(
    [s1.id, s1.name, s1.now, s1.ref, s1.star, s1.look, s1.present],
    ['s1', 'Aa bb', 'Zz bb', 11, true, ['s2'], {area: 90, near: false, nearU: 0, nearN: 0}]
  );
  assert.ok(
    T.species.every(s => !('common' in s) && !('cn' in s)),
    'no English name in the game (Q369 d)'
  );
  // The photos: only sure judgements, cap 2 adults + 1 juvenile for the documented form; a species under start 2: none.
  assert.deepStrictEqual(
    G.photos['f:Afam'].map(p => [p.f.split('-').pop(), p.sp, p.e, p.r, p.auto]),
    [
      ['1', 's1', 5, 1, 'cand'],
      ['2', 's1', 4, 1, 'cand'],
      ['4', 's1', 2, 1, 'cand']
    ],
    'Aa cc has no sure photo (unsure, k, dup): out'
  );
  assert.ok(!G.photos['f:Bfam'], 'one sure photo (o counts, a never): under the start, not played');
});

test('the committed files read through the fish engine: families, scientific genera, photos from iNaturalist', () => {
  const F = json('seaslug.json'),
    GM = C.fishGameRead(json('seaslug-game.json')),
    S = C.subjectOf('seaslug');
  assert.strictEqual(S.id, 'seaslug');
  const X = C.fishGen(F, C.fishPhotos({}, GM.photos, C.treeCur(S, json('curation.json'))));
  assert.strictEqual(X.c1.length, F.families.length);
  assert.deepStrictEqual(X.c2.concat(X.c3, X.winks), []);
  assert.ok(
    X.c1.every(n => X.gen[n].name === n.slice(2)),
    'a family is named by its scientific name'
  );
  const played = X.c1.filter(n => X.gen[n].views.wide.length);
  assert.ok(played.length >= 5, played.join());
  played.forEach(n => X.gen[n].views.wide.forEach(p => assert.ok(p.r === 1 && /^https:\/\/inaturalist-open-data\./.test(p.src), p.f)));
  // Every species with photos has at least the start, at most the cap (+ the documented juvenile form's places).
  const T = json('tools/seaslugs.json').photoTarget,
    by = {};
  Object.values(GM.photos)
    .flat()
    .forEach(p => (by[p.sp] = (by[p.sp] || 0) + 1));
  Object.entries(by).forEach(([sp, n]) => assert.ok(n >= T.start && n <= T.gameCap + T.perJuvenileForm, `${sp}: ${n}`));
  // The commonness is the area's (Q369 b): the Chromodorididae, most observed in the Philippines, lead.
  assert.ok(X.gen['f:Chromodorididae'].cm >= Math.max(...X.c1.map(n => X.gen[n].cm)));
});

// The fish tools' sure rule (autosort.js fishSure, FISH_TAGS; its copies tools/fetch_fish.py sure_add, tools/fish_game.py
// TAGS) reads the sea slugs' codes too: their view v and flag f (judging/SEASLUG.md) never set a sure photo aside (#987,
// the integrator's review). The fish's rubric never writes v or f, so no fish judgement is read differently.
test('a sure sea-slug code with f or v is kept by the sure rule; the fish judgements never carry either', () => {
  const {fishSure} = require('../autosort.js');
  ['d1g0sl1f', 'v1g0sl1', 'p1g0sm1jf', 'o1g0slo'].forEach(jt =>
    assert.strictEqual((fishSure({jt, e: 3, k: 'best'}) || {}).keep, 'add', jt)
  );
  const py2 = body => {
    const r = spawnSync('python3', ['-c', `import json, sys\nsys.path.insert(0, ${JSON.stringify(TOOLS)})\n${body}`], {encoding: 'utf8'});
    assert.strictEqual(r.status, 0, r.stderr);
    return JSON.parse(r.stdout);
  };
  assert.deepStrictEqual(
    py2(`import fetch_fish as a, fish_game as b
print(json.dumps([[a.sure_add({'jt': x, 'e': 3, 'k': 'best'}), b.cand_sure({'jt': x, 'e': 3, 'k': 'best'})] for x in ['d1g0sl1f', 'v1g0sl1']]))`),
    [
      [true, true],
      [true, true]
    ]
  );
  // Every fish judgement: the fish rubric's views and flags only, so the wider pattern changes no fish decision.
  const fish = Object.values(json('suggest.json').fish || {}).filter(j => j && j.jt);
  assert.ok(fish.length > 1000, String(fish.length));
  const bad = fish.filter(j => j.jt[0] === 'v' || j.jt.slice(7).includes('f')).map(j => j.jt);
  assert.deepStrictEqual(bad, []);
});

// The licence refresh and each Publish rewrite seaslug-cand.json and suggest.json: the photos workflow builds the game
// data again after them and commits it (Codex review #987), so a photo whose licence changed leaves the game too.
test('the photos workflow builds the sea-slug game data again and commits it', () => {
  const W = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'approved-photos.yml'), 'utf8'),
    at = s => W.indexOf(s);
  assert.ok(at('python tools/seaslug_game.py') > at('python tools/licences.py --others'), 'after the licence refresh');
  assert.ok(/git add [^\n]*seaslug-cand\.json seaslug\.json seaslug-game\.json/.test(W), 'staged');
  assert.ok(W.includes('seaslug\\.json|seaslug-game\\.json'), 'allowed in the commit job');
});
