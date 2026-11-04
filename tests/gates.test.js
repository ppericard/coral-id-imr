// AGENTS.md rule 7a: the app never gets ahead of the sheet script. Every gate on the script's version (a constant named
// *_SHEET in the app's own files) is listed here with the feature it turns on: off below its version N, on from N, off
// when a reply carries no version. A new gate fails this test until it is added to the table (test-suite review,
// 2026-11-04: PGD_SHEET had no test at all). The versions come from the source, so a recalibrated gate needs no edit here.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
// name -> {N, file}: every "const X_SHEET = N" in the app's files (the repo root's .js and proto/).
const FOUND = {};
for (const f of [
  ...fs.readdirSync(ROOT).filter(f => f.endsWith('.js')),
  ...fs.readdirSync(path.join(ROOT, 'proto')).map(f => 'proto/' + f)
])
  if (f.endsWith('.js')) for (const m of read(f).matchAll(/\bconst ([A-Z][A-Z0-9]*_SHEET) = (\d+);/g)) FOUND[m[1]] = {N: +m[2], file: f};

// Runs a block of a browser file with these globals; returns the named function.
const fn = (file, from, to, name, ctx) => {
  vm.createContext(ctx);
  vm.runInContext(block(read(file), from, to, {file}) + `\nthis.__f = ${name};`, ctx);
  return ctx.__f;
};

// gate name -> v => whether the feature it guards is on for a reply of script version v.
const GATES = {
  // The app adopts the sheet's full replay (sync.js replayAdopt) and the admin shows replayed progress: from v28. Checked
  // here on the admin's switch; the app's side runs in tests/pages.smoke.js (replayAdoptCheck at RV_SHEET - 1).
  RV_SHEET: (v, N) => fn('admin.js', 'const replayOn = ', '\n', 'replayOn', {ANS: v === undefined ? {} : {v}, USERS: null, RV_SHEET: N})(),
  // Players takes each player's replayed progress from the player list (admin.js rpOn, Code.gs replayedAll_ rp): from v42;
  // before, it reads every player's saved copy and replays here.
  RP_SHEET: (v, N) => fn('admin.js', 'const rpOn = ', '\n', 'rpOn', {USERS: v === undefined ? {} : {v}, RP_SHEET: N})(),
  // A right answer's progress step weighs its answer time (model.js rtOn): from v32.
  RT_SHEET: (v, N) => fn('model.js', 'const rtOn = ', '\n', 'rtOn', {sheetV: () => v, RT_SHEET: N})(),
  // The first-launch answer's prior on a new genus's start (model.js startP): from v36, which replays it; before, 0.
  START_SHEET: (v, N) =>
    fn('model.js', 'const startP = ', '\n', 'startP', {sheetV: () => v, START_SHEET: N, startV: () => ({p: 0.7})})() !== 0,
  // The genus offsets of the hierarchical photo Elo (model.js gdOf, ?stats=1 gd): from v31; before, every prior is 0.
  PGD_SHEET: (v, N) => {
    const gdOf = fn('model.js', 'const gdOf = ', '\n', 'gdOf', {PGD_SHEET: N});
    return Object.keys(gdOf({...(v === undefined ? {} : {v}), gd: {Acropora: [0.2, 30]}})).length > 0;
  }
};

test('every *_SHEET gate of the app is in the table', () => {
  assert.ok(Object.keys(FOUND).length >= 3, JSON.stringify(FOUND));
  const missing = Object.keys(FOUND).filter(k => !GATES[k]);
  assert.deepStrictEqual(missing, [], `add these gates to tests/gates.test.js: ${JSON.stringify(missing.map(k => FOUND[k]))}`);
  assert.deepStrictEqual(
    Object.keys(GATES).filter(k => !FOUND[k]),
    [],
    'a gate in the table is gone from the source'
  );
});

for (const name of Object.keys(GATES))
  test(`${name}: off below its sheet version, on from it, off with no version`, () => {
    const {N} = FOUND[name] || {};
    assert.ok(N > 1, name);
    assert.strictEqual(GATES[name](N - 1, N), false, `${name} on at v${N - 1}`);
    assert.strictEqual(GATES[name](N, N), true, `${name} off at v${N}`);
    assert.strictEqual(GATES[name](N + 5, N), true, `${name} off at v${N + 5}`);
    assert.strictEqual(GATES[name](undefined, N), false, `${name} on with no version`);
  });
