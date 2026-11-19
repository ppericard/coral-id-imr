require('./slot.js').testGuard();
// The sea slugs' own answer statistics (Pierre, 2026-11-17: "Tu peux compléter tout ce qui manque pour les
// nudibranches?"): core.js SUBJECTS seaslug pool (its game photos, its genera the units) makes the sheet pool its answers
// as the fish's (Code.gs statsSubjects_: ?stats=1&s=seaslug, the reply naming its subject), and SUBJECTS seaslug stats
// makes the app read them (sync.js loadOwnStats, model.js statsJoin), so a data look-alike seeded from iNaturalist
// (model.js dataSeed, Q390 D) is dropped once the players tell the pair apart. The corals' and the fish's statistics are
// as before. Against the in-memory sheet (tests/gas.js): nothing reaches the real one (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js'),
  C = require('../core.js');
const {loadCodeGs} = require('./gas.js');

const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f)),
  plain = x => JSON.parse(JSON.stringify(x));
const SEA = C.subjectOf('seaslug'),
  TREEU = C.subjectOf('fish'),
  filesOf = S => S.pool.files.map(json);

test("the sea slugs' pool: their genera as the game plays them, from their own files and their own curation part", () => {
  assert.deepStrictEqual(plain(SEA.pool), {
    files: ['seaslug.json', 'seaslug-game.json', 'curation.json'],
    of: 'entries',
    as: ['f', 'gm', 'cur']
  });
  const F = filesOf(SEA),
    P = C.unitPool(SEA, F),
    T = F[0],
    genOf = new Map(T.genera.flatMap(g => g.species.map(s => [s, g.id])));
  // the units: genera only (the families are structure), each a genus of the tree; the photos of the app's units
  const X = C.treeGen(T, C.treePhotos({}, C.treeGameRead(F[1]).photos, C.treeCur(SEA, F[2])), undefined, C.unitRankOf(SEA));
  const want = Object.values(X.gen).filter(g => g.rank === 'genus' && g.views.wide.length);
  assert.deepStrictEqual(Object.keys(P).sort(), want.map(g => g.id).sort());
  assert.ok(Object.keys(P).length > 40 && Object.keys(P).every(u => u.startsWith('g:')));
  want.forEach(g => assert.deepStrictEqual(P[g.id].flat().sort(), [...new Set(g.views.wide.map(p => p.f))].sort(), g.id));
  // a photo's genus is its species' (or, agreed at the genus only, its own: gl)
  const recs = Object.values(C.treeGameRead(F[1]).photos).flat(),
    byF = new Map(recs.map(p => [p.f, p]));
  Object.entries(P).forEach(([u, L]) =>
    L.flat().forEach(f => {
      const p = byF.get(f);
      assert.strictEqual(p.gl ? p.sp : genOf.get(p.sp), u, f);
    })
  );
  // Pierre's curation: the sea slugs' own part applies (an excluded photo leaves), never the fish's part
  const f = P['g:Chromodoris'][0][0],
    cur = F[2],
    off = C.unitPool(SEA, [T, F[1], {...cur, seaslug: {...(cur.seaslug || {}), exclude: {[f]: 1}}}]),
    fishOnly = C.unitPool(SEA, [T, F[1], {...cur, fish: {...(cur.fish || {}), exclude: {[f]: 1}}}]);
  assert.ok(!off['g:Chromodoris'].flat().includes(f), 'its own part excludes it');
  assert.deepStrictEqual(fishOnly, P, "the fish's part is not the sea slugs'");
  // the fish's pool built as before: its families, from its four files
  assert.deepStrictEqual(TREEU.pool.as, ['f', 'ph', 'gm', 'cur']);
  assert.ok(Object.keys(C.unitPool(TREEU, filesOf(TREEU))).every(u => u.startsWith('f:')));
});

// The site's files the sheet reads from GitHub main (Code.gs pools_, subjGen_): this checkout's.
const RAW = /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/main\/([\w.-]+\.json)$/;
const sheet = () =>
  loadCodeGs({
    fetch: url => {
      const m = RAW.exec(url);
      return m && fs.existsSync(path.join(ROOT, m[1])) ? {getResponseCode: () => 200, getContentText: () => src(m[1])} : null;
    }
  });
const at = i => new Date(Date.UTC(2026, 10, 10, 0, 0, i)).toISOString();
// Right answers on one unit of a subject, four choices each: clearly above chance, so their players are trusted.
const SP = C.unitPool(SEA, filesOf(SEA)),
  FP = C.unitPool(TREEU, filesOf(TREEU)),
  PAIR = ['g:Chromodoris', 'g:Nembrotha'];
const answers = (k, n, o) => Array.from({length: n}, (_, i) => ({id: (k + i).toLowerCase(), t: at(i * 40), ok: 1, m: 'quiz', ...o(i)}));
const coral = k =>
  answers(k, 14, i => ({g: 'Acropora', a: 'Acropora', ph: 'acropora-wide-' + (i % 3), ch: 'Acropora Montipora Porites Pavona'}));
const fish = k =>
  answers(k, 14, i => ({
    g: 'f:Damselfishes',
    a: 'f:Damselfishes',
    ph: FP['f:Damselfishes'][i % 4][0],
    ch: 'f:Damselfishes f:Wrasses f:Butterflyfishes f:Angelfishes',
    s: 'fish',
    rk: 'family'
  }));
// On Chromodoris beside Nembrotha (a pair only iNaturalist's identifications show: seaslug.json dlook), never mixed up.
const slug = k =>
  answers(k, 15, i => ({
    g: PAIR[0],
    a: PAIR[0],
    ph: SP[PAIR[0]][i % SP[PAIR[0]].length][0],
    ch: [...PAIR, 'g:Hypselodoris', 'g:Phyllidia'].join(' '),
    s: 'seaslug',
    rk: 'genus'
  }));
const PUB = ['ok', 'photos', 'conf', 'mem', 'memn', 'gd', 'fmt'];
const pub = o => plain(Object.fromEntries(PUB.map(k => [k, o[k]])));

test('?stats=1&s=seaslug: the sea slugs’ own statistics, the reply naming them; the corals’ and the fish’s as before', () => {
  const play = (s, withSlugs) =>
    ['Ana', 'Ben'].forEach((n, j) =>
      s.post({
        name: n,
        pin: '123' + j,
        data: {},
        summary: {},
        answers: [...coral(n + 'c'), ...fish(n + 'f'), ...(withSlugs ? slug(n + 's') : [])]
      })
    );
  const a = sheet(),
    b = sheet();
  play(a, true);
  play(b, false);
  const ss = a.get({stats: '1', s: 'seaslug', av: '1'});
  assert.strictEqual(ss.ok, true);
  assert.strictEqual(ss.s, 'seaslug', 'the reply names its subject');
  assert.ok(Object.keys(ss.photos).length && Object.keys(ss.photos).every(f => f.startsWith('seaslug-')), 'sea slug photos only');
  // every trusted answer rated its photos (photoCheck_ against the sea slugs' pool: their own genus)
  assert.strictEqual(
    Object.values(ss.photos).reduce((t, p) => t + p[3], 0),
    30
  );
  assert.deepStrictEqual(ss.conf[PAIR.join('|')], [30, 0], 'offered together 30 times, never mixed up');
  assert.ok(Object.keys(ss.conf).every(k => k.split('|').every(u => u.startsWith('g:'))));
  assert.ok(ss.gd[PAIR[0]] && !ss.gd.Acropora && !ss.gd['f:Damselfishes']);
  // the corals' and the fish's: what they were without the sea slug answers, each naming its own subject
  const c1 = a.get({stats: '1', av: '1'}),
    f1 = a.get({stats: '1', s: 'fish', av: '1'});
  assert.strictEqual(c1.s, 'coral');
  assert.strictEqual(f1.s, 'fish');
  assert.deepStrictEqual(pub(c1), pub(b.get({stats: '1', av: '1'})));
  assert.deepStrictEqual(pub(f1), pub(b.get({stats: '1', s: 'fish', av: '1'})));
  assert.ok(!Object.keys(c1.photos).some(f => f.startsWith('seaslug-')));
  // its own tab, cursor and caches, as the fish's (statsTab_, statsProp_, statsCacheKey_)
  const run = x => vm.runInContext(x, a.ctx);
  assert.deepStrictEqual(plain(run('statsSubjects_()')), ['coral', 'fish', 'seaslug']);
  assert.strictEqual(run("statsTab_('seaslug')"), 'Stats Sea slugs');
  assert.strictEqual(run("statsProp_('seaslug')"), 'STATS_FOLD_seaslug');
  // the pools cached in parts, the sea slugs' too (pool3seaslug: about 110 KB)
  assert.match(String(a.cache.pool3seaslug), /^#\d+$/);
});

// The app's side: sync.js loadOwnStats asks for the sea slugs' statistics and keeps a reply naming them, model.js
// statsJoin joins them to the corals', and the data look-alike the players tell apart is dropped (isDataLook).
function app(sheetVersion, reply) {
  const M = src('model.js'),
    S = src('sync.js'),
    T = json('seaslug.json'),
    X = C.treeGen(T, C.treePhotos({}, C.treeGameRead(json('seaslug-game.json')).photos, null), undefined, C.unitRankOf(SEA)),
    G = vm.createContext({
      easyCover: C.easyCover,
      treeScoreTree: C.treeScoreTree,
      treeSpUnits: C.treeSpUnits,
      treeGenSets: C.treeGenSets,
      rankWeights: C.rankWeights
    });
  vm.runInContext(
    block(src('app.js'), 'function treeGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + '\nthis.treeGenera = treeGenera;',
    G
  );
  G.treeGenera(X, T);
  const kept = {
      'reefid-photo-stats': {
        v: 160,
        photos: {'acropora-wide-1': [0.3, 12, 9, 12]},
        conf: {'Acropora|Montipora': [40, 9]},
        gd: {Acropora: [0.2, 30]}
      }
    },
    asked = [],
    c = vm.createContext({
      SUBJECTS: C.SUBJECTS,
      SUBJ: SEA,
      SYNC_URL: 'https://sheet.invalid/exec',
      CONF: C.CONF,
      confScore: C.confScore,
      dataLook: C.dataLook,
      GX: n => X.gen[n],
      imrFormsOf: () => [],
      slateGenera: () => [...X.c1, ...X.c2, ...X.c3],
      bonusList: () => [],
      sheetV: () => sheetVersion,
      appVer: () => 1,
      rankPhotos: () => {},
      store: {get: (k, d) => (k in kept ? plain(kept[k]) : d), set: (k, v) => (kept[k] = plain(v))},
      fetch: u => (asked.push(u), Promise.resolve({json: () => reply}))
    });
  vm.runInContext(
    [
      'let PSTAT = {}, PCONF = {}, PGD = {}, GDIFF = {};',
      block(M, 'const gdOf = ', '\n', {through: 1, file: 'model.js'}),
      block(M, 'const OWN_STATS = ', '\n// The domain-score bar', {file: 'model.js'}),
      block(M, 'const isLook = (t, n) =>', '\nfunction confOf', {file: 'model.js'}),
      block(M, 'const isDataLook = (a, b) =>', "// A choice's label", {file: 'model.js'}),
      block(S, 'const ownStatsAt = {};', '\n// A switch to a subject', {file: 'sync.js'}),
      'this.M = {isDataLook, loadOwnStats, get: () => ({PSTAT, PCONF, PGD})};'
    ].join('\n'),
    c
  );
  return {M: c.M, asked, kept};
}
const tick = () => new Promise(r => setImmediate(r));

test('the app reads the sea slugs’ own statistics from the script that pools them: a seeded look-alike told apart drops', async () => {
  const [a, b] = PAIR,
    V = SEA.stats,
    s = sheet();
  ['Ana', 'Ben'].forEach((n, j) => s.post({name: n, pin: '123' + j, data: {}, summary: {}, answers: slug(n + 's')}));
  // the reply of the script this change ships in (its VERSION is assigned at merge: SEASLUGST_SHEET)
  const reply = {...s.get({stats: '1', s: 'seaslug', av: '1'}), v: V};
  assert.strictEqual(V, C.SEASLUGST_SHEET);
  // before: a seed of the subject's data, on the declared prior (no answer of theirs pooled)
  let A = app(V, reply);
  assert.ok(A.M.isDataLook(a, b), 'a data look-alike from the start');
  const coral0 = plain(A.M.get());
  // the reply kept, joined to the corals': the pair told apart, the seed dropped; the corals' numbers as they were
  A.M.loadOwnStats();
  await tick();
  await tick();
  assert.strictEqual(A.asked.length, 1);
  assert.match(A.asked[0], /\?stats=1&s=seaslug&av=1$/);
  assert.strictEqual(A.kept['reefid-photo-stats-seaslug'].s, 'seaslug');
  assert.ok(!A.M.isDataLook(a, b), 'dropped once the players tell them apart');
  const J = plain(A.M.get());
  assert.deepStrictEqual(J.PCONF[PAIR.join('|')], [30, 0]);
  Object.keys(coral0).forEach(k =>
    Object.entries(coral0[k]).forEach(([x, v]) => assert.deepStrictEqual(J[k][x], v, `${k} ${x}: the corals' as before`))
  );
  assert.ok(Object.keys(J.PSTAT).some(f => f.startsWith('seaslug-')) && J.PGD[a]);
  // an older script (before SEASLUGST_SHEET): nothing asked, the seed stays
  A = app(V - 1, reply);
  A.M.loadOwnStats();
  await tick();
  assert.strictEqual(A.asked.length, 0);
  assert.ok(A.M.isDataLook(a, b));
  // a reply that does not name the sea slugs (a script that answers with the corals'), or from an older one: not kept
  for (const r of [
    {...reply, s: undefined},
    {...reply, s: 'coral'},
    {...reply, v: V - 1}
  ]) {
    A = app(V, r);
    A.M.loadOwnStats();
    await tick();
    await tick();
    assert.strictEqual(A.asked.length, 1);
    assert.ok(!('reefid-photo-stats-seaslug' in A.kept) && A.M.isDataLook(a, b), JSON.stringify({s: r.s, v: r.v}));
  }
  // the fish read theirs from a version of their own (tests/fishstats.test.js), never the sea slugs'
  assert.ok(TREEU.pool && TREEU.stats > SEA.stats);
});
