// Photo memory in the app (model.js pgMemW, pgMissW; core.js MEM; docs/LEARNING.md "Photo memory"): model.js's own
// functions run in Node on stubs, as tests/comeback.test.js does.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const {MEM, memFam} = require('../core.js');

function model() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    pick = (a, b) => src.slice(src.indexOf(a), src.indexOf(b)),
    ctx = {PICKD: {TARGET_OFF: 1}, sig: x => 1 / (1 + Math.exp(-x))};
  vm.createContext(ctx);
  vm.runInContext(pick('function pgMissW', 'const knownP') + '\nthis.M = {pgMissW, pgMemW};', ctx);
  return ctx.M;
}
const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) < t, `${a} vs ${b}`);
// The offsets estimated offline from the first ~550 real photo-quiz answers (docs/LEARNING.md), and the prior.
const EST = [0, -0.44, -1.1, -1.7];

test('a right answer on a new photo keeps its full weight; on a known one, only what memory does not explain', () => {
  const {pgMemW} = model();
  for (const k of [2, 3, 4]) for (const th of [-1, 0, 1, 2.5]) assert.strictEqual(pgMemW(th, 0, 0, k), 1, 'new photo');
  assert.strictEqual(pgMemW(1, 0, 0.3, 4), 1, 'never more than 1 (a memory that made a photo harder)');
  // At the game's target (ability 1 above the photo), 4 choices: the chance on the photo new over the chance with memory.
  const w = EST.map(m => pgMemW(1, 0, m, 4));
  near(w[1], 0.932);
  near(w[2], 0.869);
  near(w[3], 0.838);
  // The share memory explains is larger where the photo is harder for the player (memory lifts a low chance more).
  assert.ok(pgMemW(-1, 0, -1.1, 4) < w[2]);
  assert.ok(w[0] > w[1] && w[1] > w[2] && w[2] > w[3], `${w}`);
  // The mean offset of a question's photos: a colony right twice beside a close-up never shown weighs in between.
  const mix = pgMemW(1, 0, memFam([[3, 2], undefined], EST), 4);
  assert.ok(mix < 1 && mix > w[3], `${mix}`);
  // The prior (older sheet): shown never right and right once both -0.5.
  near(pgMemW(1, 0, MEM.PRIOR[2], 4), 0.925);
  // In a comeback (recall R < 1) the same ratio, on the recall-adjusted chances.
  assert.ok(pgMemW(1, 0, -1.1, 4, 0.8) < 1 && pgMemW(1, 0, -1.1, 4, 0.8) > 0);
});

test('a miss on a known photo weighs the chance the player had with their memory: in full at the target', () => {
  const {pgMissW} = model();
  // A photo 2 units above the target: a miss on it new counts 0.57; the same photo known, more, up to 1.
  const hard = th => pgMissW(th, 2, 4);
  near(hard(1), 0.564);
  assert.ok(pgMissW(1, 2 + EST[1], 4) > hard(1));
  assert.ok(pgMissW(1, 2 + EST[3], 4) > pgMissW(1, 2 + EST[1], 4));
  near(pgMissW(1, 2 + EST[3], 4), 0.941);
  assert.strictEqual(pgMissW(1, 0 + EST[2], 4), 1, 'at the target, known or not, a miss counts in full');
});
