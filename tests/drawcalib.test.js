// The fish draw in big pools (Pierre, 2026-11-06 15:33, Q186: the draw keeps favouring the easy photos strongly
// whatever the pool size, through a per-subject calibration; the corals unchanged): model.js calU, calSd and drawFloor
// run in Node on the subject's calibration (core.js SUBJECTS calib, calibOf). The corals keep model.js CAL.U and the
// whole PICKD.FLOOR for every observation, whatever their pool, so their draw is the one before Q186; the fish narrow
// an unanswered photo's targeting (u) and share the floor over a pool of observations. tools/fish_draw_sim.js simulates
// the effect in the real app (docs/LEARNING.md "The fish draw in big pools").
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');
const C = require('../core.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8');

function engine(subject, PSTAT = {}) {
  const ctx = {SUBJ: C.subjectOf(subject), calibOf: C.calibOf, DOM: C.DOM, PSTAT, Math};
  vm.createContext(ctx);
  const pick = cut(src, 'const PICKD = {', '\n', {file: 'model.js'}),
    cal = cut(src, 'const CAL = {', 'function photoSet', {file: 'model.js'});
  vm.runInContext(`const TARGET_P = 0.8, AIM = 0;\n${pick}\n${cal}\nthis.M = {PICKD, CAL, calU, calSd, drawFloor, nAnswers};`, ctx);
  return ctx.M;
}

test('corals: the draw as before Q186 (CAL.U, the whole floor for every observation, whatever the pool)', () => {
  const M = engine('coral', {a: [0, 4], b: [0, 0, 0, 10]});
  assert.ok(!('u' in C.calibOf(C.subjectOf('coral'))), 'no u for the corals');
  assert.strictEqual(C.calibOf(C.subjectOf('coral')).pool, Infinity);
  assert.strictEqual(M.calU(), M.CAL.U);
  // The width the targeting had before: sqrt(SIGMA² + CAL.U / (1 + answers / CAL.N)).
  [{f: 'new'}, {f: 'a'}, {f: 'b'}].forEach(p =>
    assert.strictEqual(M.calSd(p), Math.sqrt(M.PICKD.SIGMA ** 2 + M.CAL.U / (1 + M.nAnswers(p) / M.CAL.N)), p.f)
  );
  [1, 3, 20, 60, 400, 5000].forEach(n => assert.strictEqual(M.drawFloor(n), M.PICKD.FLOOR, `${n} observations`));
});

test('fish: a narrower targeting for unanswered photos, the floor shared over the pool (Q186)', () => {
  const cal = C.calibOf(C.subjectOf('fish')),
    M = engine('fish');
  assert.deepStrictEqual([cal.u, cal.pool], [0.25, 30]);
  assert.strictEqual(M.calU(), 0.25);
  assert.ok(M.calSd({f: 'new'}) < engine('coral').calSd({f: 'new'}), 'narrower than the corals for a photo nobody answered');
  // Up to the pool, the whole floor for each observation; beyond, the floor's total stays that of a pool-sized unit.
  assert.strictEqual(M.drawFloor(20), M.PICKD.FLOOR);
  assert.strictEqual(M.drawFloor(30), M.PICKD.FLOOR);
  [60, 300, 1000].forEach(n => assert.ok(Math.abs(n * M.drawFloor(n) - 30 * M.PICKD.FLOOR) < 1e-12, `${n} observations`));
  // Answers narrow it for both subjects alike: the prior's uncertainty fades as a photo is rated.
  const R = engine('fish', {r: [0, 0, 0, 20]});
  assert.ok(R.calSd({f: 'r'}) < R.calSd({f: 'new'}));
});
