require('./slot.js').testGuard();
// Surprise-only species at 5 photos in the game data (ROADMAP "Photos per species"): the whale shark and the thresher
// sharks, met only on the surprise cards, keep their 5 best photos in fish-game.json (tools/fish_game.py wink_trim),
// the admin's covers, featured photos and own adds and the surprise card's photos always among them; the candidate
// tools stop at 5 for them (tools/fetch_fish.py WINK_CAP: species_room for the refill and FishBase, --topup skips
// them). The admin's side is tests/winkadmin.test.js. Offline: fixtures, and the repository's own files for the real
// data.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const {FISHT} = require('../autosort.js');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..');
const py = (code, ...args) =>
  execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\n${code}`, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 << 20
  });
const J = (code, ...a) => JSON.parse(py(code, ...a));
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

test('one number: fish_game.py WINK_KEEP, fetch_fish.py WINK_CAP and autosort.js FISHT.wink', () => {
  const [keep, cap] = J('import fish_game, fetch_fish\nprint(json.dumps([fish_game.WINK_KEEP, fetch_fish.WINK_CAP]))');
  assert.strictEqual(keep, FISHT.wink);
  assert.strictEqual(cap, FISHT.wink);
});

// A wink world: sw (the surprise card's species) and s1 (an ordinary one), each record as tools/fish_game.py record()
// writes it.
const rec = (sp, i, {o, ...k} = {}) => ({
  f: `fish-${sp}-cand-${i}`,
  o: `https://www.inaturalist.org/observations/${o || i}`,
  sp,
  e: 3,
  jt: 'p1g0sm1',
  lic: 'cc-by',
  ...k
});
const FISH = {
  families: [
    {id: 'f:W', species: ['sw'], wink: {photos: ['fish-sw-cand-11', 'fi12']}},
    {id: 'f:A', species: ['s1']}
  ],
  teach: [
    {id: 't1', level: 1, circle: 1, species: ['s1']},
    {id: 'tw', level: 1, circle: 3, species: ['sw'], wink: {photos: ['fish-sw-cand-11', 'fi12']}}
  ],
  species: [{id: 's1'}, {id: 'sw'}]
};
const trim = (recs, cur) =>
  J(
    `import fish_game as G\nprint(json.dumps([r['f'] for r in G.wink_trim(json.loads(sys.argv[1]), json.loads(sys.argv[2]), json.loads(sys.argv[3]))]))`,
    JSON.stringify(recs),
    JSON.stringify(FISH),
    JSON.stringify(cur)
  );

test('wink_trim: the 5 best of a surprise-only species, his picks and the card photos always; other species untouched', () => {
  const recs = [
    // the card's photos (fish.json wink photos): 11 by name, 12 by photo id (fish-sw-cand-12 is the reference photo fi12)
    rec('sw', 11, {e: 1}),
    rec('sw', 12, {e: 2}),
    // the auto-sort's adds (log code a...): not his picks
    rec('sw', 21, {e: 2}),
    rec('sw', 22, {e: 2}),
    // the best: a reference-level photo, then the easiest; 32 shares 31's observation
    rec('sw', 30, {e: 4, rep: 'inaturalist', jt: 'p1g0sl1r'}),
    rec('sw', 31, {e: 5}),
    rec('sw', 32, {e: 5, o: 31}),
    rec('sw', 33, {e: 4}),
    rec('sw', 34, {e: 4}),
    // his own add (no auto log code), a hard one
    rec('sw', 40, {e: 1}),
    rec('s1', 50),
    rec('s1', 51)
  ];
  const cur = {
    fish: {
      add: {'fish-sw-cand-21': 'sw', 'fish-sw-cand-22': 'sw', 'fish-sw-cand-40': 'sw'},
      auto: {'2026-11-05': {'fish-sw-cand-21': 'ate', 'fish-sw-cand-22': 'ate@k9'}}
    }
  };
  // 11, 12 (the card), 40 (his add), then 30 (reference level), 31 (ease 5); 32 (31's observation) waits behind 33, 34.
  assert.deepStrictEqual(trim(recs, cur), [
    'fish-sw-cand-11',
    'fish-sw-cand-12',
    'fish-sw-cand-30',
    'fish-sw-cand-31',
    'fish-sw-cand-40',
    'fish-s1-cand-50',
    'fish-s1-cand-51'
  ]);
  // His cover (at any rank) and his featured photos too, by photo id: then more than 5, all kept.
  const cur2 = {
    fish: {
      ...cur.fish,
      genera: {'f:W': {cover: 'fi33', feat: {sw: ['fish-sw-cand-34', 'fish-sw-cand-21']}}, sw: {cover: 'fish-sw-cand-22'}}
    }
  };
  assert.deepStrictEqual(
    trim(recs, cur2),
    [
      'fish-sw-cand-11',
      'fish-sw-cand-12',
      'fish-sw-cand-21',
      'fish-sw-cand-22',
      'fish-sw-cand-33',
      'fish-sw-cand-34',
      'fish-sw-cand-40',
      'fish-s1-cand-50',
      'fish-s1-cand-51'
    ],
    'every pick of his and every card photo, whatever their number'
  );
  // Few photos: all kept; observations already held only once the new ones run out.
  assert.deepStrictEqual(trim([rec('sw', 31, {e: 5}), rec('sw', 32, {e: 5, o: 31}), rec('sw', 60, {e: 1})], {}), [
    'fish-sw-cand-31',
    'fish-sw-cand-32',
    'fish-sw-cand-60'
  ]);
  assert.deepStrictEqual(
    trim([31, 32, 33, 34, 35, 36].map(i => rec('sw', i, {o: 1, e: i === 36 ? 5 : 3})).concat([rec('sw', 70, {e: 1})]), {}),
    ['fish-sw-cand-31', 'fish-sw-cand-32', 'fish-sw-cand-33', 'fish-sw-cand-36', 'fish-sw-cand-70'],
    'one photo per observation first (the admin counts observations against FISHT.wink), then the best of the rest'
  );
});

test('species_room: a surprise-only species holds WINK_CAP whatever its cap; --topup and the refill leave it alone', () => {
  const out = J(`import fetch_fish as ff
s, t, tw = {'id': 'sw'}, {'id': 't1'}, {'id': 'tw', 'wink': {}}
L = lambda n: [{'f': f'fish-sw-cand-{i}', 'o': f'o{i}'} for i in range(n)]
g = lambda f: False
print(json.dumps([[ff.species_room(s, x, L(n), g, cap=c)[k] for k in ('cap', 'room')] for x, n, c in ((tw, 2, None), (tw, 9, None), (tw, 2, 40), (tw, 2, 3), (t, 2, None))]))`);
  assert.deepStrictEqual(out, [
    [5, 3],
    [5, 0],
    [5, 3],
    [3, 1], // a smaller fixed cap (--cap) holds
    [30, 28] // an ordinary species: cap_of
  ]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'winkstock-'));
  const fish = {
    species: [
      {id: 'sw', name: 'Fishus wink', inat: 601, circle: 3, present: {ph: true}},
      {id: 's1', name: 'Fishus fishii', inat: 501, circle: 3, present: {ph: true}}
    ],
    teach: [
      {id: 'tw', name: 'Wink', circle: 3, species: ['sw'], wink: {photos: []}},
      {id: 't1', name: 'Fishes', circle: 3, species: ['s1']}
    ]
  };
  const r = (sp, i, k) => ({
    f: `fish-${sp}-cand-${i * 10 + k}`,
    a: '(c) u',
    lic: 'cc-by',
    o: `https://www.inaturalist.org/observations/${i}`,
    t: 'Fishus',
    own: false,
    loc: 'ph',
    src: 'x',
    r: 1
  });
  // sw: 8 photos, 2 of them an observation of the old limit of 4 photos (--topup would ask it again); s1: one photo.
  const cand = {v: 1, cand: {sw: [0, 1, 2, 3].map(k => r('sw', 5, k)).concat([6, 7, 8, 9].map(i => r('sw', i, 0))), s1: [r('s1', 3, 0)]}};
  fs.writeFileSync(path.join(dir, 'fish.json'), JSON.stringify(fish));
  fs.writeFileSync(path.join(dir, 'fish-cand.json'), JSON.stringify(cand));
  fs.writeFileSync(path.join(dir, 'cache.json'), '{}');
  const argv = [
    ['--fish', 'fish.json'],
    ['--cand', 'fish-cand.json'],
    ['--cur', 'none.json'],
    ['--suggest', 'none.json'],
    ['--photos', 'none-photos.json'],
    ['--fbsrc', 'none-fb.json'],
    ['--cache', 'cache.json'],
    ['--memory', 'refill.json']
  ].flatMap(([f, x]) => [f, path.join(dir, x)]);
  const run = (...a) => execFileSync('python3', ['tools/fetch_fish.py', ...argv, '--circle', '3', ...a], {cwd: ROOT, encoding: 'utf8'});
  // --offline fails on any request not cached: an empty cache proves nothing was asked for sw.
  assert.match(run('--topup', '--offline'), /topup: 0 observations/);
  assert.deepStrictEqual(read(path.relative(ROOT, path.join(dir, 'fish-cand.json'))), cand, 'nothing added');
  const P = JSON.parse(run('--refill', '--plan', '--today', '2026-11-15').trim().split('\n').pop());
  assert.deepStrictEqual(P.pick, ['s1'], 'the refill picks the ordinary species only');
  assert.ok(P.short.sw ? P.short.sw.room <= 0 : true, 'sw has no room');
  fs.rmSync(dir, {recursive: true, force: true});
});

test('the repository: each surprise-only species keeps at most 5 photos in play, its card photos and his cover among them', () => {
  const fish = read('fish.json'),
    cur = read('curation.json'),
    game = C.treeGameRead(read('fish-game.json')).photos,
    first = read('fish-photos.json').photos,
    G = (cur.fish || {}).genera || {};
  const winks = fish.teach.filter(t => t.wink);
  assert.ok(winks.length >= 2, 'the whale shark and the thresher sharks');
  for (const t of winks) {
    const L = game[t.id] || [],
      have = new Set(L.map(p => C.treePid(p.f)));
    const card = (t.wink.photos || []).map(C.treePid),
      fam = fish.families.find(f => f.wink && (f.species || []).some(s => t.species.includes(s))),
      cover = fam && G[fam.id] && G[fam.id].cover;
    const kept = new Set([...card, ...(cover ? [C.treePid(cover)] : [])]);
    assert.ok(L.length >= 1, `${t.id}: photos in play`);
    assert.ok(L.length <= Math.max(FISHT.wink, kept.size), `${t.id}: ${L.length} photos in play`);
    // The surprise card (quiz.js winkPhoto) draws from its chosen photos still in play, else the cover: every one is.
    card.forEach(id => assert.ok(have.has(id), `${t.id}: the card's photo ${id} is in play`));
    if (cover) assert.ok(have.has(C.treePid(cover)), `${t.id}: Pierre's cover is in play`);
    assert.ok(new Set(L.map(p => p.o)).size >= Math.min(FISHT.wink, L.length), `${t.id}: one photo per observation`);
    // fish-photos.json's first photos are fish-game.json's.
    (first[t.id] || []).forEach(p => assert.ok(have.has(C.treePid(p.f)), `${t.id}: first photo ${p.f} in play`));
  }
});

test('the repository: fish_game.py, offline, keeps exactly the surprise-only photos fish-game.json lists', () => {
  const out = J(`import fish_game as G
fish, cur, cand, sug, refs, codes, crops, rkeep = G.inputs(G.ROOT)
prev = G.load(G.ROOT, G.OUT_FILE, {'photos': {}})
todo, keep, _ = G.plan(fish, cur, cand, sug, prev, refs, codes, crops, 0, rkeep, G.boxes_in(G.ROOT))
W = G.wink_species(fish)
print(json.dumps({'keep': sorted(f for f, r in keep.items() if r['sp'] in W), 'todo': sorted(r['f'] for r, _, _ in todo if r['sp'] in W)}))`);
  const game = C.treeGameRead(read('fish-game.json')).photos,
    W = new Set(
      read('fish.json')
        .teach.filter(t => t.wink)
        .flatMap(t => t.species)
    ),
    listed = Object.values(game)
      .flat()
      .filter(p => W.has(p.sp))
      .map(p => p.f)
      .sort();
  assert.deepStrictEqual(out.todo, [], 'nothing of theirs to download');
  assert.deepStrictEqual(out.keep, listed);
});
