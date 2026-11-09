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
    domRecalcAll: () => builds.push('recalc')
  };
  vm.createContext(ctx);
  vm.runInContext(
    'let DATA, FISH = null, FISHP = null, FISHH = null, FISHRAW = null;\n' +
      'const fishBuild = () => (FISH = {gm: Object.keys(FISHRAW.gm.photos).length}, this.builds.push(FISH.gm), FISH);\n' +
      block(src, 'const fishHome = () =>', "// The fish units' photos in easyRank order", {file: 'app.js'}) +
      '\nthis.home = () => fishHome().then(() => fishCached().then(c => c && fishLoad()));' +
      '\nthis.M = {fishHome, fishLoad, get FISHRAW() { return FISHRAW; }, get FISH() { return FISH; }, setData: d => (DATA = d)};',
    Object.assign(ctx, {builds})
  );
  const send = (f, body) => waits[f](body);
  return {ctx, M: ctx.M, asked, builds, send};
}
const FJ = {families: [{id: 'f:A'}]},
  PH = {photos: {t1: [{f: 'fi1'}]}},
  GM = {photos: {t1: [{f: 'fish-s1-cand-2'}]}};
const tick = () => new Promise(ok => setImmediate(ok));

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
  assert.deepStrictEqual(A.builds, [1, 'recalc'], 'the units built again with the curated photos');
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
