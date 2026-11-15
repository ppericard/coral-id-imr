// Fish Home before fish-game.json (Pierre, 2026-11-09: "Fish Home shown before fish-game.json arrives"; the photos first
// shown on Home may change): app.js fishHome brings fish.json and fish-photos.json, what start-up waits for (UNITS fish
// home); fishLoad brings fish-game.json too, what tier 2 waits for (need), so the quiz and the Learn pages never open
// on the stopgap's photos alone; a device whose service worker holds fish-game.json waits for it at start-up, as before.
// The blocks of app.js run in a vm with the files answered by hand.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function app({cached = false} = {}) {
  const waits = {},
    asked = [],
    builds = [];
  const ctx = {
    json: u => (asked.push(u), new Promise(ok => (waits[u.replace(/\?.*/, '')] = ok))),
    window: {caches: {}},
    caches: {match: u => Promise.resolve(cached && /fish-game\.json/.test(u) ? {} : undefined)},
    domRecalcAll: () => builds.push('recalc'),
    fishGameRead: require('../core.js').fishGameRead // the file's records whole (its short form)
  };
  vm.createContext(ctx);
  // Two tree subjects (app.js UNITS get): the fish, in force, and a second one (the sea slugs' shape: no first photos).
  vm.runInContext(
    "let DATA, FISH = null, FISHP = null, FISHH = null, FISHRAW = null, FISHF = null, FISHST = '', FISHON = false, TREE_AT = 'fish';\n" +
      'const TREE_OF = {};\n' +
      "const UNITS = {fish: {get: {f: () => json('fish.json?v=6'), ph: () => json('fish-photos.json?v=6'), gm: () => json('fish-game.json?v=1')}}," +
      " two: {get: {f: () => json('two.json'), gm: () => json('two-game.json')}}, coral: {}};\n" +
      'const fishBuild = () => (FISH = {at: TREE_AT, gm: Object.keys(FISHRAW.gm.photos).length}, this.builds.push(FISH.gm), FISH);\n' +
      block(src, 'const treeOf = id =>', "// The fish units' photos in easyRank order", {file: 'app.js'}) +
      "\nthis.home = () => treeHome('fish').then(() => fishCached().then(c => c && treeLoad('fish')));" +
      "\nthis.M = {fishHome: () => treeHome('fish'), fishLoad: () => treeLoad('fish'), treeLoad, treeAt, treeOf, get FISHRAW() { return FISHRAW; }, get FISH() { return FISH; }, get AT() { return TREE_AT; }, setData: d => (DATA = d)};",
    Object.assign(ctx, {builds})
  );
  const send = (f, body) => waits[f](body);
  return {ctx, M: ctx.M, asked, builds, send};
}
const FJ = {families: [{id: 'f:A'}]},
  PH = {photos: {t1: [{f: 'fi1'}]}},
  GM = {photos: {t1: [{f: 'fish-s1-cand-2'}]}};
const tick = () => new Promise(ok => setImmediate(ok));
const J = x => JSON.parse(JSON.stringify(x)); // the vm's objects, compared as plain data

test('start-up waits for fish.json and fish-photos.json only; fish-game.json comes with tier 2 and rebuilds the units', async () => {
  const A = app();
  let home = false;
  A.ctx.home().then(() => (home = true));
  await tick();
  assert.deepStrictEqual(A.asked, ['fish.json?v=6', 'fish-photos.json?v=6'], 'start-up asks nothing else');
  A.send('fish.json', FJ);
  A.send('fish-photos.json', PH);
  await tick();
  await tick();
  assert.ok(home, 'Home is not held by fish-game.json');
  assert.strictEqual(Object.keys(A.M.FISHRAW.gm.photos).length, 0, 'the stopgap photos only, until fish-game.json');
  assert.ok(!A.M.FISHRAW.full, 'partial (dataPartial: model.js domRecalcAll waits)');
  // The start-up's build() comes next (data.json in); then tier 2 asks for the rest.
  A.M.setData({gen: {}});
  let full = false;
  A.M.fishLoad().then(() => (full = true));
  await tick();
  assert.deepStrictEqual(
    A.asked,
    ['fish.json?v=6', 'fish-photos.json?v=6', 'fish-game.json?v=1'],
    'fish.json and fish-photos.json not asked again'
  );
  assert.ok(!full, 'tier 2 waits for fish-game.json');
  A.send('fish-game.json', GM);
  await tick();
  await tick();
  assert.ok(full);
  assert.deepStrictEqual(A.M.FISHRAW.gm, GM);
  assert.ok(A.M.FISHRAW.full);
  assert.deepStrictEqual(A.builds, [1, 'recalc'], 'the units built again with the curated photos, then the one-time rebuild');
});

test('a device whose worker holds fish-game.json waits for it at start-up, as before (one build, by start-up)', async () => {
  const A = app({cached: true});
  let home = false;
  A.ctx.home().then(() => (home = true));
  await tick();
  A.send('fish.json', FJ);
  A.send('fish-photos.json', PH);
  await tick();
  await tick();
  assert.ok(!home, 'Home waits for the cached file');
  A.send('fish-game.json', GM);
  await tick();
  await tick();
  assert.ok(home);
  assert.deepStrictEqual(A.M.FISHRAW.gm, GM);
  assert.deepStrictEqual(A.builds, [], 'no build before data.json: start-up builds the units');
});

test('fish.json missing: Home refuses the fish (start-up falls back on the corals), and the next try asks again', async () => {
  const A = app();
  let err = null;
  A.ctx.home().catch(e => (err = e));
  await tick();
  A.send('fish.json', {});
  A.send('fish-photos.json', PH);
  await tick();
  await tick();
  assert.ok(err && /fish data not loaded/.test(err.message));
  A.ctx.home().catch(() => {});
  await tick();
  assert.strictEqual(A.asked.filter(u => /^fish\.json/.test(u)).length, 2);
});

// A second tree subject (the sea slugs, 2026-11-15): its files may come while the fish are in force (setSubject loads
// before it switches); they go into its own state, never into the fish's globals, and its units are made once it comes
// in force (treeAt); the fish's come back as they were.
test('a second tree subject loads into its own state; treeAt swaps the trees in force', async () => {
  const A = app();
  A.M.setData({gen: {}});
  A.M.fishLoad();
  await tick();
  A.send('fish.json', FJ);
  A.send('fish-photos.json', PH);
  A.send('fish-game.json', GM);
  await tick();
  await tick();
  assert.deepStrictEqual(J(A.M.FISH), {at: 'fish', gm: 1});
  let two = null;
  A.M.treeLoad('two').then(x => (two = x));
  await tick();
  assert.deepStrictEqual(A.asked.slice(3), ['two.json', 'two-game.json'], 'its own files, unversioned');
  A.send('two.json', {families: [{id: 'f:B'}]});
  A.send('two-game.json', {photos: {'f:B': [{f: 'x1'}, {f: 'x2'}]}});
  await tick();
  await tick();
  assert.strictEqual(two, null, 'not in force: no units made yet');
  assert.deepStrictEqual(J(A.M.FISH), {at: 'fish', gm: 1}, "the fish's units untouched");
  assert.strictEqual(A.M.FISHRAW.f, FJ);
  A.M.treeAt('two');
  assert.strictEqual(A.M.AT, 'two');
  assert.deepStrictEqual(J(A.M.FISH), {at: 'two', gm: 1}, 'made on coming in force');
  assert.deepStrictEqual(J(A.M.FISHRAW.f), {families: [{id: 'f:B'}]});
  A.M.treeAt('coral');
  assert.strictEqual(A.M.AT, 'two', 'a subject with no tree leaves the one in force');
  A.M.treeAt('fish');
  assert.deepStrictEqual(J(A.M.FISH), {at: 'fish', gm: 1}, "the fish's back, not made again");
  assert.deepStrictEqual(J(A.builds), [1, 'recalc', 1], "the fish's load, its one-time rebuild, then the second's on coming in");
});

// Codex review #820: model.js runs domRecalcAll when it loads, which can be while the fish units are on the stopgap's
// photos only; an old record (s.pg) rebuilt then would keep a bar read from those photos. While dataPartial() holds it
// does nothing; once the whole data is in, it rebuilds the record.
test('domRecalcAll leaves an old record alone while the data is partial, and rebuilds it once whole', () => {
  const msrc = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8');
  let partial = true,
    saved = 0;
  const ctx = {
    SUBJ: {},
    domRules: () => true,
    DATA: {gen: {}},
    dataPartial: () => partial,
    P: {'f:A': {pg: 0.4, ok: 6, ko: 2}},
    LEVEL: '_level',
    GDIFF: {},
    domOn: () => false,
    GX: () => ({}),
    domFromCounts: () => ({dp: 0.7, ds: 0.38}),
    genusDiff: () => 0,
    PICKD: {SINGLE: 0.5},
    save: () => saved++
  };
  vm.createContext(ctx);
  vm.runInContext(block(msrc, 'function domRecalcAll() {', '\n}\n', {through: 1, file: 'model.js'}) + '\nthis.run = domRecalcAll;', ctx);
  assert.strictEqual(ctx.run(), false);
  assert.deepStrictEqual(ctx.P['f:A'], {pg: 0.4, ok: 6, ko: 2}, 'untouched while partial');
  assert.strictEqual(saved, 0);
  partial = false;
  ctx.run();
  assert.deepStrictEqual(ctx.P['f:A'], {ok: 6, ko: 2, dp: 0.7, ds: 0.38}, 'rebuilt once the data is whole');
  assert.strictEqual(saved, 1);
});
