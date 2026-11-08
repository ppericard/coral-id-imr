// Sheet vNEXT (ROADMAP "Security follow-ups", Pierre 2026-11-08): the admin leaves a player or a device not signed in out
// of the statistics (Code.gs sxSet_, statsExclude), and an answer whose photos are of another unit rates no photo
// (photoCheck_, photoAlert_), the answer itself always kept. Against the in-memory sheet (tests/gas.js).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const C = require('../core.js');
const {loadCodeGs} = require('./gas.js');

const TOK = 'ghp_write000000000000000000';
const at = i => new Date(Date.UTC(2026, 10, 1, 0, 0, i)).toISOString();
const ans = (id, extra = {}) => ({id, t: at(0), g: 'Acropora', a: 'Acropora', ok: 1, m: 'quiz', ph: 'acropora-wide-1', ...extra});
// Twelve right answers: clearly above chance (TRUST), so the sender rates the photos.
const run = (k, extra = {}) => Array.from({length: 12}, (_, i) => ans(k + i, {t: at(i), ...extra}));
// The games' photos per unit as pools_ caches them (pool2<subject>: {p: pool, u: parent units}): two coral genera and one
// fish unit.
const POOL = {
  coral: {Acropora: [['acropora-wide-1', 'acropora-medium-1']], Porites: [['porites-wide-9']]},
  fish: {'f:pomacentridae': [['fi123']]}
};
const pools = s => Object.entries(POOL).forEach(([k, v]) => (s.cache['pool2' + k] = JSON.stringify({p: v, u: {}})));
// Stats are cached 10 minutes: drop them (and put the pools back) before reading again.
// How many answers rated a photo (stats_ photos [difficulty, weighed, right, answers]; 0 when none or never shown).
const rated = (st, f) => (st.photos[f] || [0, 0, 0, 0])[3];
const fresh = s => {
  for (const k of Object.keys(s.cache)) delete s.cache[k];
  pools(s);
  return s.post({readStats: 1, token: TOK});
};

test('an excluded player or device rates nothing, keeps their own numbers, and comes back when counted again', () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: run('a')});
  s.post({anon: 'device0001', anonAnswers: run('d', {ph: 'acropora-medium-1'})});
  const id = n => s.ctx.aid_(n);
  let st = fresh(s);
  assert.strictEqual(rated(st, 'acropora-wide-1'), 12);
  assert.strictEqual(rated(st, 'acropora-medium-1'), 12);
  // Admin only, a well-formed id only.
  assert.strictEqual(s.post({statsExclude: id('Ana'), on: true}).error, 'token');
  assert.strictEqual(s.post({statsExclude: '=HYPERLINK(1)', on: true, token: TOK}).error, 'input');
  let r = s.post({statsExclude: id('Ana'), on: true, token: TOK});
  assert.deepStrictEqual(r.excluded, [id('Ana')]);
  r = s.post({statsExclude: id('~anon device0001'), on: true, token: TOK});
  assert.deepStrictEqual(r.excluded.sort(), [id('Ana'), id('~anon device0001')].sort());
  assert.ok(s.props.ROSTER_AT, 'the Analyses report is marked stale (rosterChanged_)');
  st = fresh(s);
  assert.strictEqual(rated(st, 'acropora-wide-1'), 0, "the excluded player's photo is rated by nobody");
  assert.strictEqual(rated(st, 'acropora-medium-1'), 0, "the excluded device's photo too");
  assert.strictEqual(st.skip.excluded, 24);
  assert.ok(st.ras[id('Ana')], 'their own level stays');
  // Their answers stay in the log, served with the list so the Analyses report can leave them out.
  const a = s.post({readAnswers: 1, token: TOK});
  assert.strictEqual(a.rows.length, 24);
  assert.deepStrictEqual(a.excluded.sort(), [id('Ana'), id('~anon device0001')].sort());
  assert.deepStrictEqual(s.post({users: 1, token: TOK}).excluded.sort(), a.excluded.sort(), 'Players gets the list');
  // Twice is once; counted again, they rate the photos again.
  s.post({statsExclude: id('Ana'), on: true, token: TOK});
  assert.strictEqual(s.sheets['Stats excluded'].rows.slice(1).filter(x => x[0]).length, 2);
  s.post({statsExclude: id('Ana'), on: false, token: TOK});
  st = fresh(s);
  assert.strictEqual(rated(st, 'acropora-wide-1'), 12);
  assert.strictEqual(rated(st, 'acropora-medium-1'), 0);
});

test('rule D7: a removed account leaves no row; answers kept anonymously stay out', () => {
  const s = loadCodeGs(),
    id = n => s.ctx.aid_(n);
  s.post({name: 'Ben', pin: '1111', data: {}, summary: {}, answers: run('b')});
  s.post({name: 'Cleo', pin: '2222', data: {}, summary: {}, answers: run('c')});
  s.post({statsExclude: id('Ben'), on: true, token: TOK});
  s.post({statsExclude: id('Cleo'), on: true, token: TOK});
  s.post({userDelete: 'Ben', token: TOK}); // answers kept as "~deleted <id>"
  s.post({userDelete: 'Cleo', answers: true, token: TOK}); // everything goes
  const L = s.post({users: 1, token: TOK}).excluded;
  assert.deepStrictEqual(L, [id('~deleted ' + id('Ben'))]);
  const st = fresh(s);
  assert.strictEqual(rated(st, 'acropora-wide-1'), 0, 'the kept answers still rate nothing');
});

test('an answer whose photos are of another unit is kept, rates no photo, and is flagged once per window', () => {
  const s = loadCodeGs();
  pools(s);
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: run('a')});
  // Porites photos (and a fish photo) logged under Acropora: a bot, or a tampered app.
  s.post({name: 'Bot', pin: '1111', data: {}, summary: {}, answers: run('p', {ph: 'porites-wide-9'})});
  s.post({anon: 'device0002', anonAnswers: run('f', {ph: 'fi123'})});
  const alerts = () => (s.sheets.Alerts ? s.sheets.Alerts.rows.slice(1).map(r => String(r[1])) : []);
  assert.deepStrictEqual(
    alerts().map(x => x.replace(/: \S+ \(/, ': <id> (')),
    ['photos not of the unit shown: <id> (12 of 12 answers)', 'photos not of the unit shown: <id> (12 of 12 answers)']
  );
  assert.ok(!alerts().some(x => /Bot/.test(x)), 'the sender by its admin id, never a name');
  s.post({name: 'Bot', pin: '1111', data: {}, summary: {}, answers: run('q', {ph: 'porites-wide-9'})});
  assert.strictEqual(alerts().length, 2, 'one line per sender and window');
  // Nothing lost: every answer is logged and counts for its player.
  assert.strictEqual(s.post({readAnswers: 1, token: TOK}).rows.length, 48);
  // Photos that are of the unit, by the pool or by their file name (an older app, a photo moved since), or in no pool
  // (unsure), still rate; the bot's never do.
  s.post({name: 'Dio', pin: '3333', data: {}, summary: {}, answers: [...run('x', {ph: 'acropora-wide-77'}), ...run('y', {ph: 'zzz-1'})]});
  const st = fresh(s);
  assert.strictEqual(rated(st, 'acropora-wide-1'), 12);
  assert.strictEqual(rated(st, 'porites-wide-9'), 0);
  assert.strictEqual(rated(st, 'fi123'), 0);
  assert.strictEqual(rated(st, 'acropora-wide-77'), 12, 'named after its genus');
  assert.strictEqual(rated(st, 'zzz-1'), 12, 'in no pool: unsure, never flagged');
  assert.strictEqual(st.skip.photos, 36);
  assert.ok(st.ras[s.ctx.aid_('Bot')], "the bot's answers still give it a level");
});

test('no pool read: nothing is checked, nothing is flagged', () => {
  const s = loadCodeGs();
  s.post({name: 'Bot', pin: '1111', data: {}, summary: {}, answers: run('p', {ph: 'porites-wide-9'})});
  assert.ok(!s.sheets.Alerts, 'no Alerts line without a cached pool');
  const st = s.post({readStats: 1, token: TOK});
  assert.strictEqual(rated(st, 'porites-wide-9'), 12);
  assert.strictEqual(st.skip.photos, 0);
});

// Review of #801 (P2-1; the integrator, 2026-11-09: a left-out device stays left out after sign-in, the admin can count
// the account again): the row follows the device's answers to the name's admin id, with an Alerts line by ids only.
test('a device left out of the statistics stays out once it signs in, under a new or an existing name', () => {
  for (const name of ['NewName', 'Old']) {
    const s = loadCodeGs(),
      id = n => s.ctx.aid_(n);
    if (name === 'Old') s.post({name, pin: '1234', data: {}, summary: {}, answers: run('o', {ph: 'acropora-medium-1'})});
    s.post({anon: 'device0001', anonAnswers: run('d')});
    s.post({statsExclude: id('~anon device0001'), on: true, token: TOK});
    assert.strictEqual(rated(fresh(s), 'acropora-wide-1'), 0);
    const r = s.post({name, pin: '1234', data: {}, summary: {}, answers: [], anon: 'device0001'});
    assert.ok(r.ok, JSON.stringify(r));
    const st = fresh(s);
    assert.strictEqual(rated(st, 'acropora-wide-1'), 0, name + ": the device's answers stay out under the name");
    assert.strictEqual(rated(st, 'acropora-medium-1'), 0, name + ': the whole account is left out');
    assert.deepStrictEqual(s.post({users: 1, token: TOK}).excluded, [id(name)], 'the row moved, none left on the device id');
    const A = s.sheets.Alerts.rows.slice(1).map(x => String(x[1]));
    assert.deepStrictEqual(A, [
      'left out of the statistics: device ' + id('~anon device0001') + ' signed in as ' + id(name) + ', left out too'
    ]);
    assert.ok(!A.some(x => x.includes(name)), 'ids only, never a name');
    // The admin counts the account again: everything rates.
    s.post({statsExclude: id(name), on: false, token: TOK});
    assert.strictEqual(rated(fresh(s), 'acropora-wide-1'), 12);
  }
  // A device never left out: no row, no Alerts line.
  const s = loadCodeGs();
  s.post({anon: 'device0002', anonAnswers: run('d')});
  s.post({name: 'Zed', pin: '1234', data: {}, summary: {}, answers: [], anon: 'device0002'});
  assert.ok(!s.sheets.Alerts);
  assert.deepStrictEqual(s.post({users: 1, token: TOK}).excluded, []);
});

// P2-2: an answer that rates nothing (left out, or its photos flagged as another unit's) gives a photo no genus: the
// served difficulty (genus offset + residual) and the genus offsets stay as the rating answers made them.
test('a left-out or flagged answer moves no photo difficulty and adds no genus offset', () => {
  const base = loadCodeGs();
  base.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: run('a')});
  const want = fresh(base);
  // A left-out player logs Ana's photo under a made-up genus; a trusted player logs it under Porites (flagged 'other').
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: run('a')});
  s.post({name: 'Mal', pin: '1111', data: {}, summary: {}, answers: run('m', {g: 'Zzz', a: 'Zzz', t: at(30)})});
  s.post({statsExclude: s.ctx.aid_('Mal'), on: true, token: TOK});
  s.post({name: 'Tom', pin: '2222', data: {}, summary: {}, answers: run('u', {g: 'Porites', a: 'Porites', t: at(40)})});
  const st = fresh(s);
  assert.strictEqual(st.skip.photos, 12, "Tom's Porites answers are flagged");
  assert.deepStrictEqual(st.photos['acropora-wide-1'], want.photos['acropora-wide-1']);
  assert.ok(!('Zzz' in st.gd), 'no genus offset for the left-out answers');
  assert.deepStrictEqual(Object.keys(st.gd), ['Acropora'], 'Porites rated by no answer: no offset');
});

// P2-3 and P2-4: the real game pools, read from this checkout as the script reads them from GitHub main, against the
// script cache's 100 KB a value (the fish pool is about 390 KB): cached in parts, so stats_ (which rates the corals'
// answers only) and the write check (every subject's) see the fish photos; a fish answer at the genus or species level
// is checked against its family's photos.
const ROOT = path.join(__dirname, '..');
const site = n => url => {
  const m = /raw\.githubusercontent\.com\/[^/]+\/[^/]+\/main\/(.+)$/.exec(url);
  if (!m || !fs.existsSync(path.join(ROOT, m[1]))) return null;
  n[m[1]] = (n[m[1]] || 0) + 1;
  const t = fs.readFileSync(path.join(ROOT, m[1]), 'utf8');
  return {getResponseCode: () => 200, getContentText: () => t};
};
test('the real pools fit the script cache in parts: fish photos are checked, a fish genus or species by its family', () => {
  const fish = C.SUBJECTS.find(S => S.id === 'fish'),
    FP = C.unitPool(
      fish,
      fish.pool.files.map(f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')))
    );
  assert.ok(JSON.stringify(FP).length > 100 * 1024, 'the fish pool is over one cache value');
  const n = {},
    s = loadCodeGs({fetch: site(n), cacheMax: 100 * 1024}),
    dam = FP['f:Damselfishes'][0][0],
    bfly = FP['f:Butterflyfishes'][0][0],
    F = (k, g, ph, x = {}) => run(k, {g, a: g, ph, s: 'fish', ...x}),
    alerts = () => (s.sheets.Alerts ? s.sheets.Alerts.rows.slice(1).map(x => String(x[1])) : []),
    drop = () =>
      Object.keys(s.cache)
        .filter(k => k.startsWith('stats'))
        .forEach(k => delete s.cache[k]);
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: run('a', {ph: 'imrl-p8_g36'})});
  s.post({name: 'Bot', pin: '3333', data: {}, summary: {}, answers: run('b', {ph: bfly})});
  // stats_ reads the pools (none cached yet): a fish photo under a coral genus rates nothing.
  let st = s.post({readStats: 1, token: TOK});
  assert.strictEqual(rated(st, 'imrl-p8_g36'), 12);
  assert.strictEqual(rated(st, bfly), 0, 'a fish photo under a coral genus rates nothing');
  assert.strictEqual(st.skip.photos, 12);
  // Cached in parts, each under 100 KB: read again without any file fetched.
  assert.match(String(s.cache.pool2fish), /^#\d+$/);
  assert.ok(Number(s.cache.pool2fish.slice(1)) >= 4);
  const before = JSON.stringify(n);
  drop();
  st = s.post({readStats: 1, token: TOK});
  assert.strictEqual(JSON.stringify(n), before, 'no file read again');
  assert.strictEqual(rated(st, bfly), 0);
  // On write, against the cached pools: honest fish answers (the family, a genus and a species of it, an old entry id,
  // t01: the Damselfishes, each with a damselfish photo) are never flagged; a fish photo under a coral genus, or a
  // butterflyfish photo under a damselfish genus, is.
  s.post({
    name: 'Fin',
    pin: '1111',
    data: {},
    summary: {},
    answers: [...F('f', 'f:Damselfishes', dam), ...F('g', 'g:Chromis', dam, {rk: 'genus'})]
  });
  s.post({
    name: 'Gil',
    pin: '2222',
    data: {},
    summary: {},
    answers: [...F('s', 's:Chromis ternatensis', dam, {rk: 'species'}), ...F('o', 't01', dam)]
  });
  assert.deepStrictEqual(alerts(), [], 'no honest fish send is flagged');
  s.post({name: 'Bot2', pin: '5555', data: {}, summary: {}, answers: run('c', {ph: bfly})});
  s.post({name: 'Ivy', pin: '6666', data: {}, summary: {}, answers: F('j', 'g:Chromis', bfly, {rk: 'genus'})});
  assert.deepStrictEqual(alerts(), [
    'photos not of the unit shown: ' + s.ctx.aid_('Bot2') + ' (12 of 12 answers)',
    'photos not of the unit shown: ' + s.ctx.aid_('Ivy') + ' (12 of 12 answers)'
  ]);
  // A part gone from the cache: the pool is read again, never a part taken for the whole.
  delete s.cache['pool2fish#1'];
  drop();
  assert.strictEqual(rated(s.post({readStats: 1, token: TOK}), bfly), 0);
  assert.strictEqual(n['fish-photos.json'], 2);
});

test('a value over the cache limit is put in parts and read back whole; a lost part reads as missing', () => {
  const s = loadCodeGs({cacheMax: 100 * 1024}),
    c = s.ctx.CacheService.getScriptCache(),
    v = 'é'.repeat(31999) + '\u{1F41F}' + 'x'.repeat(70000);
  s.ctx.cacheBigPut_(c, 'big', v, 60);
  assert.strictEqual(s.cache.big, '#4');
  assert.strictEqual(s.ctx.cacheBigGet_(c, 'big'), v, 'a character on a cut stays whole');
  s.ctx.cacheBigPut_(c, 'small', '{"a":1}', 60);
  assert.strictEqual(s.ctx.cacheBigGet_(c, 'small'), '{"a":1}');
  delete s.cache['big#2'];
  assert.strictEqual(s.ctx.cacheBigGet_(c, 'big'), null);
});

// Review 2 of #801 (P1): a photo or unit named like a member of Object.prototype (constructor, __proto__, toString) is
// refused when logged (word_), and one already in the log is an entry like any other in stats_ (maps with no
// prototype): the stats are served, nothing is NaN, nothing is added to Object.prototype.
const vm = require('vm');
test('photo and unit ids like constructor or __proto__: refused when logged, harmless in the log', () => {
  const bad = ['constructor', '__proto__', 'toString', 'hasOwnProperty'];
  const s = loadCodeGs({fetch: site({}), cacheMax: 100 * 1024});
  pools(s);
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: run('a')});
  const L = bad.flatMap((ph, j) => [
    ans('z' + j, {t: at(20 + j), ph}),
    ans('y' + j, {t: at(30 + j), g: ph, a: ph}),
    ans('x' + j, {t: at(40 + j), ph: 'acropora-wide-1 ' + ph})
  ]);
  assert.ok(s.post({anon: 'device0009', anonAnswers: [...run('d'), ...L]}).ok);
  const rows = s.sheets.Answers.rows.slice(1),
    of = id => rows.find(r => r[7] === id);
  bad.forEach((w, j) => {
    assert.strictEqual(of('z' + j)[6], '', w + ': refused as a photo');
    assert.strictEqual(of('y' + j)[2], '', w + ': refused as a unit');
    assert.strictEqual(of('x' + j)[6], '', w + ': refused among other photos');
  });
  // Rows logged before the fix: put in the tab as they were.
  bad.forEach((w, j) => {
    const r = of('a' + j).slice();
    r[6] = w;
    r[7] = 'old' + j;
    rows.push(r);
    const g = of('a' + (j + 4)).slice();
    g[2] = g[3] = w;
    g[7] = 'oldg' + j;
    rows.push(g);
  });
  s.sheets.Answers.rows.push(...rows.slice(-2 * bad.length));
  const clean = o => JSON.stringify(o, (k, v) => (typeof v === 'number' && !isFinite(v) ? 'NaN' : v));
  for (const k of Object.keys(s.cache)) if (k.startsWith('stats')) delete s.cache[k];
  const st = s.post({readStats: 1, token: TOK});
  assert.strictEqual(st.ok, true, JSON.stringify(st).slice(0, 200));
  assert.ok(!/null|NaN/.test(clean({photos: st.photos, gd: st.gd, ras: st.ras, mem: st.mem})), clean(st.gd));
  assert.strictEqual(rated(st, 'acropora-wide-1'), 24);
  for (const k of Object.keys(s.cache)) if (k.startsWith('stats')) delete s.cache[k];
  assert.strictEqual(s.get({stats: '1'}).ok, true, 'the public stats');
  assert.strictEqual(s.post({users: 1, token: TOK}).ok, true, 'the player list');
  assert.ok(s.get({name: 'Ana', pin: '1234', rv: '0'}).replay, 'the replay of the log');
  assert.strictEqual(vm.runInContext('Object.keys(Object.prototype).join()', s.ctx), '', 'Object.prototype untouched');
  assert.strictEqual(vm.runInContext('typeof ({}).constructor', s.ctx), 'function');
  // The write check on a pool cached: no throw hides an Alerts line (the bot's Porites photos under Acropora).
  s.post({
    name: 'Bot',
    pin: '1111',
    data: {},
    summary: {},
    answers: [...run('p', {ph: 'porites-wide-9'}), ans('pz', {t: at(50), ph: 'constructor'})]
  });
  assert.deepStrictEqual(
    s.sheets.Alerts.rows.slice(1).map(x => String(x[1])),
    [
      // the device's answers whose unit was refused keep their Acropora photo under no unit
      'photos not of the unit shown: ' + s.ctx.aid_('~anon device0009') + ' (4 of 24 answers)',
      'photos not of the unit shown: ' + s.ctx.aid_('Bot') + ' (12 of 13 answers)'
    ]
  );
  // photoCheck_ itself, given such ids, answers without throwing.
  const idx = s.ctx.photoIdx_(true);
  bad.forEach(w => {
    assert.strictEqual(s.ctx.photoCheck_(idx, 'coral', 'Acropora', [w]), 'unknown');
    assert.strictEqual(s.ctx.photoCheck_(idx, 'fish', w, ['porites-wide-9']), 'other');
    assert.strictEqual(s.ctx.photoCheck_(idx, w, 'Acropora', [w]), 'unknown');
  });
});

// Review 2 of #801 (P3-1): a sign-in send refused (stale) or not saved moves neither the device's answers nor its
// exclusion: no name that gets no account is left out; the retry, saved, moves both.
test('a refused sign-in moves no exclusion; the saved retry does', () => {
  const s = loadCodeGs(),
    id = n => s.ctx.aid_(n);
  s.post({anon: 'device0001', anonAnswers: run('d')});
  s.post({statsExclude: id('~anon device0001'), on: true, token: TOK});
  const r = s.post({name: 'Maria', pin: '9999', data: {}, summary: {}, answers: [], anon: 'device0001', at: 5});
  assert.strictEqual(r.error, 'stale');
  assert.ok(!s.sheets.RAs || s.sheets.RAs.rows.slice(1).every(x => !x[0]), 'no account');
  assert.deepStrictEqual(s.post({users: 1, token: TOK}).excluded, [id('~anon device0001')]);
  assert.ok(
    s.sheets.Answers.rows.slice(1).every(x => x[0] === '~anon device0001'),
    'the answers stay with the device'
  );
  assert.ok(!s.sheets.Alerts);
  // The app sends the id again with its retry: saved, both move.
  assert.ok(s.post({name: 'Maria', pin: '9999', data: {}, summary: {}, answers: [], anon: 'device0001'}).ok);
  assert.deepStrictEqual(s.post({users: 1, token: TOK}).excluded, [id('Maria')]);
  assert.ok(s.sheets.Answers.rows.slice(1).every(x => x[0] === 'Maria'));
});

// Review 2 of #801 (P3-2): nothing is fetched under the script lock: a replay (doGet rv, a save's, an anonymous send's)
// computes stats_ against the cached pools only; the public stats, which hold no lock, read and cache them.
test('a replay under the script lock fetches no photo pool when cold; the public stats warm it', () => {
  const n = {},
    s = loadCodeGs({fetch: site(n), cacheMax: 100 * 1024}),
    pool = () => Object.keys(n).filter(f => /^fish|curation/.test(f));
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: run('a', {ph: 'imrl-p8_g36'}), rv: 0});
  s.get({name: 'Ana', pin: '1234', rv: '0'});
  s.post({anon: 'device0003', anonAnswers: run('d'), rv: 0});
  assert.ok(n['data.json'] >= 1, 'the replays ran (their genera read): ' + JSON.stringify(n));
  assert.deepStrictEqual(pool(), [], 'no pool file read under the lock: ' + JSON.stringify(n));
  assert.ok(!s.cache.pool2fish && !s.cache.pool2coral);
  for (const k of Object.keys(s.cache)) if (k.startsWith('stats')) delete s.cache[k];
  assert.strictEqual(s.get({stats: '1'}).ok, true);
  assert.match(String(s.cache.pool2fish), /^#\d+$/, 'the public stats cached the pools');
  assert.ok(n['fish-photos.json'] === 1 && n['curation.json'] >= 1);
});
