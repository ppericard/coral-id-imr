// Open all genera and the card that offers to go back to one at a time (model.js INTRO, introAll, backDue, introBack,
// introMerge; docs/LEARNING.md "First meeting with a genus"): model.js's own code run in Node on stubs (the player's
// record P, the slate, the store).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');

// One clock for every device of a test, a millisecond a call: the decisions' times are in the order they are made.
let CLOCK = 1.8e12;
function model({P = {}, slate = ['A', 'B', 'C', 'D', 'E', 'F']} = {}) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    block = src.slice(src.indexOf('// First meeting with a genus (Pierre'), src.indexOf('const introSince'));
  const saved = {},
    ctx = {
      P,
      LEVEL: '~level',
      CB: {},
      COMEBACK: {KEY: 'imr-comeback'},
      n: 0,
      Date: {now: () => ++CLOCK},
      slateGenera: () => slate,
      syncSoon: () => {},
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))}
    };
  ctx.answersSoFar = () => ctx.n;
  ctx.drops = 0;
  ctx.dropPlans = () => ctx.drops++; // quiz.js: the questions planned ahead, dropped
  vm.createContext(ctx);
  vm.runInContext(
    block +
      '\nthis.M = {INTRO, introMap, introAdd, introduced, introReady, introLeft, introAll, backOpen, backDue, introBack, introMerge, holdStep, closed};',
    ctx
  );
  const M = ctx.M;
  M.ctx = ctx;
  M.offer = () => ctx.store.get(M.INTRO.OFFER.KEY, null);
  // n answers at expectation e, right or not (the opening hold's record, quiz.js answer -> holdStep).
  M.play = (k, e, ok) => {
    for (let i = 0; i < k; i++) {
      ctx.n++;
      M.holdStep(e, ok);
    }
  };
  return M;
}
// A player who met A and B on the first cards and C on a card of its own, then opened all at answer 50.
function opened() {
  const P = {A: {ok: 9, ko: 1}, B: {ok: 8, ko: 2}, C: {ok: 3, ko: 1}};
  const M = model({P});
  M.introAdd(['A', 'B'], true);
  M.introAdd(['C'], false);
  M.ctx.n = 50;
  M.introAll('offer');
  return M;
}

test('back card: due once the drop since Open all reaches 2 x INTRO.HOLD, never before Open all', () => {
  const M = opened();
  assert.deepStrictEqual([...M.backOpen()].sort(), ['D', 'E', 'F']);
  assert.strictEqual(M.offer().h, 0);
  assert.strictEqual(M.backDue(), false);
  // Each miss at e 0.8 adds 0.8 - 0.1 = 0.7: 4 misses 2.8, not yet; the 5th 3.5.
  M.play(4, 0.8, false);
  assert.strictEqual(M.backDue(), false);
  M.play(1, 0.8, false);
  assert.ok(Math.abs(M.offer().h - 3.5) < 1e-9);
  assert.strictEqual(M.backDue(), true);
  assert.strictEqual(2 * M.INTRO.HOLD, 3); // derived from the opening hold's threshold, no constant of its own
  // Declined offer, or no Open all at all: never.
  const N = model({P: {A: {ok: 1}}});
  N.ctx.store.set(N.INTRO.OFFER.KEY, {at: 50, open: 0, t: 1});
  N.play(20, 0.9, false);
  assert.strictEqual(N.backDue(), false);
});

test('back card: three misses in a row then right answers stay under it (the replayed blip), right answers pay back', () => {
  const M = opened();
  M.play(3, 0.85, false); // 2.25
  assert.strictEqual(M.backDue(), false);
  M.play(10, 0.75, true); // each right answer pays back 0.35
  assert.strictEqual(M.offer().h, 0);
  // A player doing as expected (80% right at e 0.8) never gets it.
  for (let i = 0; i < 40; i++) M.play(1, 0.8, i % 5 !== 0);
  assert.strictEqual(M.backDue(), false);
});

test('Keep them all: nothing closes, the card is never due again, a later Open all keeps the choice', () => {
  const M = opened();
  M.play(6, 0.8, false);
  assert.strictEqual(M.backDue(), true);
  assert.strictEqual(M.introBack(true).length, 0);
  assert.strictEqual(M.offer().bk, 'keep');
  assert.ok(M.offer().bt && M.offer().bat === 56);
  assert.ok(['D', 'E', 'F'].every(M.introduced));
  M.play(20, 0.9, false);
  assert.strictEqual(M.backDue(), false);
  M.introAll('progress');
  assert.strictEqual(M.offer().bk, 'keep');
  assert.strictEqual(M.backDue(), false);
});

test('One at a time: every genus opened at once closes, answered or not; the others and every answer stay', () => {
  const M = opened();
  // D answered right since Open all, E answered wrong, F never asked.
  M.ctx.P.D = {ok: 2, ko: 1, th: 0.4};
  M.ctx.P.E = {ok: 0, ko: 2};
  M.play(6, 0.8, false);
  const before = JSON.stringify(M.ctx.P);
  assert.deepStrictEqual([...M.introBack(false)].sort(), ['D', 'E', 'F']);
  assert.strictEqual(JSON.stringify(M.ctx.P), before); // progress, ability and answers untouched
  for (const n of ['D', 'E', 'F']) {
    assert.strictEqual(M.introduced(n), false, n); // the mark wins over the answers given
    assert.strictEqual(M.introReady(n), false, n);
  }
  for (const n of ['A', 'B', 'C']) assert.ok(M.introduced(n) && M.introReady(n), n);
  assert.deepStrictEqual([...M.introLeft()].sort(), ['D', 'E', 'F']); // back in the queue; My progress offers Open all again
  const o = M.offer();
  assert.ok(o.open && o.bk === 'one' && o.bn === 3 && o.via === 'offer');
  assert.strictEqual(M.backDue(), false);
  // Its card opens a genus again (quiz.js introShow -> introAdd), with the progress it had.
  M.ctx.n++;
  M.introAdd(['D'], false);
  assert.ok(M.introduced('D') && M.introReady('D'));
  assert.strictEqual(M.ctx.P.D.th, 0.4);
  assert.ok(!M.introduced('E'));
  // Open all from My progress opens the rest at once; the card stays answered.
  M.introAll('progress');
  assert.ok(['E', 'F'].every(M.introduced));
  assert.strictEqual(M.offer().bk, 'one');
  assert.strictEqual(M.backDue(), false);
});

test('synced: a genus closed on one device closes here, a card shown since reopens it; the latest decision wins', () => {
  const A = opened(),
    B = opened();
  // Device A goes back to one at a time; device B, still with all open, pulls A's record.
  A.play(6, 0.8, false);
  const t0 = CLOCK;
  A.introBack(false);
  B.introMerge(JSON.stringify(A.introMap()), JSON.stringify(A.offer()));
  assert.ok(['D', 'E', 'F'].every(n => !B.introduced(n)));
  assert.strictEqual(B.ctx.drops, 1, 'closing genera from another device drops the questions planned ahead');
  assert.strictEqual(B.offer().bk, 'one');
  assert.strictEqual(B.backDue(), false);
  // B shows D's card later: A pulls it and D is open on A too; E stays closed (A's mark is newer than B's 'a').
  const m = JSON.parse(JSON.stringify(B.introMap()));
  m.D = [60, 0, t0 + 1000, 'c'];
  A.introMerge(JSON.stringify(m), JSON.stringify(B.offer()));
  assert.ok(A.introduced('D') && !A.introduced('E'));
  // An older map with E opened at once does not undo the mark.
  A.introMerge(JSON.stringify({E: [50, 1, t0 - 1000, 'a']}), null);
  assert.ok(!A.introduced('E'));
  // A keep on another device, older than the "one" here, does not replace it.
  A.introMerge(null, JSON.stringify({...A.offer(), bk: 'keep', bt: t0 - 5000}));
  assert.strictEqual(A.offer().bk, 'one');
});

test('synced: a reopening that arrives before an older closing is kept (Codex review #398: a, then c, then b)', () => {
  const C = opened(),
    t = C.introMap().E[2];
  // This device still has E opened at once (a); another device's reopening card (c, later) arrives, then a delayed
  // closing (b) older than that reopening: E stays open.
  C.introMerge(JSON.stringify({E: [60, 0, t + 300, 'c']}), null);
  assert.ok(C.introduced('E'));
  C.introMerge(JSON.stringify({E: [55, 0, t + 200, 'b']}), null);
  assert.ok(C.introduced('E'));
  assert.strictEqual(C.ctx.drops, 0, 'nothing closed, the planned questions stay');
  // A closing newer than the reopening still closes it.
  C.introMerge(JSON.stringify({E: [70, 0, t + 400, 'b']}), null);
  assert.ok(!C.introduced('E'));
});
