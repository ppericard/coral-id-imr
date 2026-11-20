require('./slot.js').testGuard();
// The fish draw in big pools (the draw keeps favouring the easy photos strongly whatever the pool size, through a
// per-subject calibration): model.js calU, calSd and drawFloor run in Node on the subject's calibration (core.js
// SUBJECTS calib, calibOf). The corals keep model.js CAL.U and the whole PICKD.FLOOR for every observation, whatever
// their pool; the fish narrow
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
  // CAL.U is the spread of a photo's difficulty around its unit offset (the prior): sd 0.5, variance 0.25, not the
  // width of the Easy / Medium / Hard sets (1) it was set for (docs/decisions/2026-11-20-cal-u.md).
  assert.strictEqual(M.CAL.U, 0.25);
  assert.ok(Math.abs(M.calSd({f: 'new'}) - Math.sqrt(M.PICKD.SIGMA ** 2 + 0.25)) < 1e-12, 'an unanswered photo: sqrt(SIGMA² + 0.25)');
  // The width of the targeting: sqrt(SIGMA² + CAL.U / (1 + answers / CAL.N)).
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
  // The corals' CAL.U is the same spread since their prior became the unit offset (2026-11-20), so the two widths agree;
  // both stay narrower than the targeting before (CAL.U 1).
  assert.ok(M.calSd({f: 'new'}) <= engine('coral').calSd({f: 'new'}), 'no wider than the corals for a photo nobody answered');
  assert.ok(M.calSd({f: 'new'}) < Math.sqrt(M.PICKD.SIGMA ** 2 + 1), 'narrower than the width of before');
  // Up to the pool, the whole floor for each observation; beyond, the floor's total stays that of a pool-sized unit.
  assert.strictEqual(M.drawFloor(20), M.PICKD.FLOOR);
  assert.strictEqual(M.drawFloor(30), M.PICKD.FLOOR);
  [60, 300, 1000].forEach(n => assert.ok(Math.abs(n * M.drawFloor(n) - 30 * M.PICKD.FLOOR) < 1e-12, `${n} observations`));
  // Answers narrow it for both subjects alike: the prior's uncertainty fades as a photo is rated.
  const R = engine('fish', {r: [0, 0, 0, 20]});
  assert.ok(R.calSd({f: 'r'}) < R.calSd({f: 'new'}));
  // photoSet reads calU once per draw and passes it in: the same width as reading it at each photo.
  [{f: 'r'}, {f: 'new'}].forEach(p => assert.strictEqual(R.calSd(p, R.calU()), R.calSd(p), p.f));
});
