'use strict';
require('./slot.js').testGuard();
// The admin's registry under the content editor's structure (fish admin at parity, F15): reports.js repReg reads fish.json
// with the structure and text in force laid over it (core.js contentApply under the published curation), as the app does,
// so Pairs' starts, the Heatmap's slate and the Journey read a look-alike pair or a circle the editor changed. The edits
// are made-up fixtures (never the real curation.json, never the sheet).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..'),
  json = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  C = require('../core.js'),
  {repReg} = require('../reports.js');
const F = json('fish.json'),
  PH = json('fish-photos.json'),
  GM = json('fish-game.json'),
  S = C.subjectOf('fish'),
  rank = C.unitRankOf(S),
  cur = c => ({fish: {content: c}}),
  reg = c => repReg(F, PH, GM, rank, S, c);

test('no edit in force: the registry is the file as it is', () => {
  const base = repReg(F, PH, GM, rank);
  assert.deepStrictEqual(reg(json('curation.json')).slate, base.slate);
  assert.deepStrictEqual(reg({v: 1, genera: {}}).slate, base.slate);
  assert.deepStrictEqual(reg(undefined).slate, base.slate);
});

test('a look-alike pair the editor added or withdrew is in the registry: both sides', () => {
  const base = repReg(F, PH, GM, rank),
    R = reg(
      cur({
        pairs: {
          'f:Parrotfishes|f:Wrasses': {v: null, was: 1, t: 1},
          'f:Damselfishes|f:Wrasses': {v: 1, was: null, t: 1}
        }
      })
    ),
    has = (X, a, b) => X.gen[a].look.includes(b);
  assert.ok(has(base, 'f:Parrotfishes', 'f:Wrasses') && !has(base, 'f:Damselfishes', 'f:Wrasses'), 'the base');
  assert.ok(!has(R, 'f:Parrotfishes', 'f:Wrasses') && !has(R, 'f:Wrasses', 'f:Parrotfishes'));
  assert.ok(has(R, 'f:Damselfishes', 'f:Wrasses') && has(R, 'f:Wrasses', 'f:Damselfishes'));
});

test('a circle the editor changed moves the unit on the slate', () => {
  const OUT = 'f:Spadefishes',
    base = repReg(F, PH, GM, rank),
    R = reg(cur({nodes: {[OUT]: {circle: {v: null, was: 1, t: 1}}}}));
  assert.ok(base.slate.includes(OUT), 'the base has it');
  assert.ok(!R.slate.includes(OUT), 'out of every circle: off the slate');
  // the species of a family in no circle are not asked either
  assert.ok(Object.keys(R.spu).every(id => R.spu[id].family !== OUT));
  assert.ok(Object.keys(base.spu).some(id => base.spu[id].family === OUT));
  // what reports name stays: the family's photos and its page are still there (Codex review #1161)
  assert.deepStrictEqual(Object.keys(R.ph).sort(), Object.keys(base.ph).sort());
  assert.strictEqual(R.fam[OUT], OUT);
});
