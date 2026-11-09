// The admin's Undo steps kept across a reload (admin.js keepHist, histJson; performance pass, 2026-11-09): as many of
// the latest steps as the tab's sessionStorage holds (HIST_ROOM characters), joined from each step encoded once. A
// draft of 1.3 million characters made 60 steps 80 million, encoded at every click and always refused by the storage.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(
  block(src, 'const HKEY = ', '\nconst keepHist', {file: 'admin.js'}).replace("SK('reefid-admin-undo')", "'k'") +
    '\nthis.M = {histJson, HIST_ROOM};',
  ctx
);
const {histJson, HIST_ROOM} = ctx.M;
const draft = (i, n = 20) => JSON.stringify({genera: {['G' + i]: {feat: Array.from({length: n}, (_, k) => `p"${i}-${k}\\`)}}, v: 1});

test('histJson: the same record as JSON.stringify while every step fits, the last 60 of each', () => {
  for (const [nh, nf] of [
    [0, 0],
    [3, 0],
    [0, 5],
    [70, 65],
    [12, 61]
  ]) {
    const H = Array.from({length: nh}, (_, i) => draft(i)),
      F = Array.from({length: nf}, (_, i) => draft(100 + i)),
      now = draft(999);
    assert.strictEqual(histJson(now, H, F), JSON.stringify({snap: now, hist: H.slice(-60), fut: F.slice(-60)}), `${nh} / ${nf}`);
    assert.deepStrictEqual(JSON.parse(histJson(now, H, F)), {snap: now, hist: H.slice(-60), fut: F.slice(-60)});
  }
  assert.strictEqual(histJson(null, [], []), JSON.stringify({snap: null, hist: [], fut: []}));
});

test('histJson: a big draft keeps the latest steps that fit, never more than the room', () => {
  const big = i => draft(i, 40000), // about 600,000 characters each, quotes and backslashes escaped twice over
    H = Array.from({length: 30}, (_, i) => big(i)),
    F = Array.from({length: 4}, (_, i) => big(50 + i)),
    now = big(99),
    s = histJson(now, H, F),
    r = JSON.parse(s);
  assert.ok(s.length <= HIST_ROOM, `${s.length} characters`);
  assert.strictEqual(r.snap, now);
  assert.ok(r.hist.length >= 2, `${r.hist.length} steps kept`);
  // the latest undo steps, in order, then the latest redo steps that still fit
  assert.deepStrictEqual(r.hist, H.slice(-r.hist.length));
  assert.deepStrictEqual(r.fut, F.slice(F.length - r.fut.length));
  // a room too small for the draft itself: the draft alone, no step
  assert.deepStrictEqual(JSON.parse(histJson(now, H, F, 1000)), {snap: now, hist: [], fut: []});
});
