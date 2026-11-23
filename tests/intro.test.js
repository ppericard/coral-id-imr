require('./slot.js').testGuard();
// Open all genera and the card that offers to go back to one at a time (model.js INTRO, introAll, backDue, introBack,
// introMerge; docs/LEARNING.md "First meeting with a genus"): model.js's own code run in Node on stubs (the player's
// record P, the slate, the store).
const test = require('node:test');
const cut = require('./block.js'); // the block of a browser file a test runs, its markers checked
const clock = require('./clock.js'); // model.js's answer clock (tally)
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');

// One clock for every device of a test, a millisecond a call: the decisions' times are in the order they are made.
let CLOCK = 1.8e12;
function model({P = {}, slate = ['A', 'B', 'C', 'D', 'E', 'F']} = {}) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    block = cut(src, '// First meeting with a genus (Pierre', '// Comeback after a break (Pierre');
  const saved = {},
    ctx = {
      ...require('./subj.stub.js')(), // the corals as the current subject
      P,
      LEVEL: '~level',
      CB: {},
      COMEBACK: {KEY: 'reefid-comeback'},
      n: 0,
      Date: {now: () => ++CLOCK},
      slateGenera: () => slate,
      syncSoon: () => {},
      // The first-launch question (core.js CHOICE; model.js startSet and its window, in the same block).
      ...(({CHOICE, startOpt, startVars, startCheck, startNext, startInfer}) => ({
        CHOICE,
        startOpt,
        startVars,
        startCheck,
        startNext,
        startInfer
      }))(require('../core.js')),
      basicsDone: () => false,
      document: {querySelectorAll: () => []},
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))}
    };
  ctx.answersSoFar = () => ctx.n;
  ctx.cbSave = () => {}; // the answer clock's record (model.js tally) kept in CB only
  ctx.drops = 0;
  ctx.dropPlans = () => ctx.drops++; // quiz.js: the questions planned ahead, dropped
  vm.createContext(ctx);
  vm.runInContext(
    block +
      clock() +
      '\nthis.M = {INTRO, introMap, introAdd, introduced, introReady, introLeft, introAll, backOpen, backDue, introBack, introMerge, holdStep, closed, introLive, unlocked, tally};',
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
// A player who met A and B on the first cards and C on a card of its own, then opened all at answer 50 (My progress).
function opened() {
  const P = {A: {ok: 9, ko: 1}, B: {ok: 8, ko: 2}, C: {ok: 3, ko: 1}};
  const M = model({P});
  M.introAdd(['A', 'B'], true);
  M.introAdd(['C'], false);
  M.ctx.n = 50;
  M.introAll('progress');
  return M;
}

// The level's answer count follows the log (rule D9; docs/reviews/2026-11-09-level-count-checkpoints.md): a card's gap
// counts on the answer clock (model.js tally), which never goes down; the answers count stays the card's history.
test('a card gap counts on the answer clock: a count gone down (rule D9) holds no card back', () => {
  const M = model();
  M.ctx.n = 100;
  M.introAdd(['A'], false); // its own card at answer 100
  M.ctx.n = 101;
  assert.strictEqual(M.introReady('A'), false);
  M.ctx.n = 102;
  assert.strictEqual(M.introReady('A'), true);
  M.ctx.n = 40; // the log's count replaces one that counted 62 answers twice
  assert.strictEqual(M.introReady('A'), true, 'ready stays ready');
  M.introAdd(['B'], false);
  assert.deepStrictEqual([M.introMap().B[0], M.introMap().B[4]], [40, 102], 'its history, its mark on the clock');
  M.ctx.n = 41;
  assert.strictEqual(M.introReady('B'), false);
  M.ctx.n = 42;
  assert.strictEqual(M.introReady('B'), true, 'INTRO.GAP answers after its card, as before');
  assert.strictEqual(M.tally(), 104);
});

test('the answer clock: starts at the count (an entry of before reads its count as its mark), goes up with it, never down', () => {
  const M = model();
  M.ctx.store.set(M.INTRO.KEY, {A: [50, 0, 1, 'c']}); // a card kept before the clock
  M.ctx.n = 51;
  assert.strictEqual(M.introReady('A'), false);
  assert.strictEqual(M.tally(), 51);
  M.ctx.n = 52;
  assert.strictEqual(M.introReady('A'), true);
  M.ctx.n = 30;
  assert.strictEqual(M.tally(), 52);
  M.ctx.n = 35; // five answers (or another device's, merged)
  assert.strictEqual(M.tally(), 57);
  // Another device's card brings its mark; one from an app of before, its count.
  M.introMerge(JSON.stringify({B: [33, 0, 2, 'c', 55], C: [34, 0, 3, 'c']}), null);
  assert.strictEqual(
    JSON.stringify([M.introMap().B, M.introMap().C]),
    JSON.stringify([
      [33, 1, 2, 'c', 55],
      [34, 1, 3, 'c']
    ])
  );
});

// The card that offered Open all is gone; Open all itself stays, the same on the first cards and
// in My progress: every genus left opens at once, ready (no card each), recorded with where it came from.
test('Open all from the first cards and from My progress: every genus left at once, ready, its record', () => {
  for (const via of ['card', 'progress']) {
    const M = model();
    M.introAdd(['A', 'B', 'C', 'D'], true); // the first cards
    M.ctx.n = via === 'card' ? 0 : 30;
    M.introAll(via);
    assert.deepStrictEqual(M.introLeft(), [], via);
    assert.ok(
      ['E', 'F'].every(n => M.introduced(n) && M.introReady(n) && M.introMap()[n][3] === 'a'),
      via
    );
    assert.deepStrictEqual((({at, open, via: v, n, h}) => ({at, open, via: v, n, h}))(M.offer()), {at: M.ctx.n, open: 1, via, n: 2, h: 0});
    assert.strictEqual(M.backDue(), false);
  }
});

test('a record from the offer card of before (via offer) is read as any Open all: the back card still comes', () => {
  const M = model({P: {A: {ok: 9, ko: 1}}});
  M.introAdd(['A'], true);
  M.introMerge(JSON.stringify({B: [50, 1, 1, 'a'], C: [50, 1, 1, 'a']}), JSON.stringify({at: 50, open: 1, via: 'offer', t: 1, n: 2, h: 0}));
  assert.strictEqual(M.offer().via, 'offer');
  assert.ok(M.introduced('B') && M.introReady('C'));
  M.play(5, 0.8, false);
  assert.strictEqual(M.backDue(), true);
  assert.deepStrictEqual([...M.introBack(false)].sort(), ['B', 'C']);
});

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
  // D answered right after Open all, E answered wrong, F never asked.
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
  assert.ok(o.open && o.bk === 'one' && o.bn === 3 && o.via === 'progress');
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

// Rule L4: a live game's answers on a unit the path has not opened count as evidence, never opening it (model.js
// introLive, called by live.js liveLog before it records the answer); the path opens it later on its card, with them.
test('a live answer on a unit not opened: it counts and stays closed until its card, the answers kept', () => {
  const P = {A: {ok: 9, ko: 1}, B: {ok: 8, ko: 2}},
    M = model({P});
  M.introAdd(['A', 'B'], true); // the first cards
  M.ctx.n = 10;
  // Live answers on E (never met): the closed mark 'b' with no time, then scored into its record (here: its counts, as
  // the scorer leaves them).
  M.introLive('E');
  P.E = {ok: 2, ko: 1};
  assert.deepStrictEqual([...M.introMap().E], [10, 0, 0, 'b']);
  assert.ok(M.closed('E') && !M.introduced('E') && !M.introReady('E'));
  assert.ok(!M.unlocked(['A', 'B', 'C', 'D', 'E', 'F']).includes('E'), 'not in unlocked(): no other game draws it');
  assert.ok(M.introLeft().includes('E'), 'still among the units the path opens, one at a time');
  // The record adopted from the sheet's replay (its answers rebuilt from the log) does not open it: the mark is in the
  // cards' synced map, not in the record.
  P.E = {ok: 5, ko: 1, th: 0.4};
  assert.ok(!M.introReady('E') && !M.unlocked(['E']).length);
  // Another live answer: no new mark; a unit already met or closed again by "One at a time" is never marked.
  M.ctx.n = 12;
  M.introLive('E');
  assert.strictEqual(M.introMap().E[0], 10);
  M.introLive('A');
  assert.strictEqual(M.introMap().A[3], 's');
  // Its card on the path: open, and ready as any card's unit (INTRO.GAP answers after it: its answers before the card
  // are not the card's question, model.js askedOpen), with the answers it had.
  P.E.at = CLOCK;
  M.introAdd(['E'], false);
  assert.ok(M.introduced('E') && !M.introReady('E'));
  M.ctx.n += 2;
  assert.ok(M.introduced('E') && M.introReady('E') && M.unlocked(['E']).length === 1);
  assert.deepStrictEqual({...P.E, at: 0}, {ok: 5, ko: 1, th: 0.4, at: 0});
});

test('synced: a live mark never closes a unit opened on another device; any opening there opens it here', () => {
  const A = model(),
    B = model();
  A.introAdd(['A'], true);
  B.introAdd(['A'], true);
  // B answered C in a live game (the closed mark with no time); A had shown C's card earlier: A keeps it open, B opens it.
  A.introAdd(['C'], false);
  B.introLive('C');
  A.introMerge(JSON.stringify(B.introMap()), null);
  assert.strictEqual(A.introMap().C[3], 'c');
  assert.ok(A.introduced('C'));
  assert.strictEqual(A.ctx.drops, 0, 'nothing closed');
  B.introMerge(JSON.stringify(A.introMap()), null);
  assert.strictEqual(B.introMap().C[3], 'c');
  assert.ok(B.introduced('C'));
  assert.strictEqual(B.ctx.drops, 1, 'opened here: the planned questions are drawn again');
  // A mark from a device that never met D closes D here too, until a card opens it.
  B.introLive('D');
  A.introMerge(JSON.stringify(B.introMap()), null);
  assert.deepStrictEqual([A.introMap().D[1], A.introMap().D[2], A.introMap().D[3]], [0, 0, 'b']);
  assert.ok(A.closed('D') && !A.introduced('D'));
  // One at a time's own closing (a timed 'b') still closes what it closes: the open-all units of a device (tests above).
  // And Open all on this device opens D with the rest.
  A.introAll('progress');
  assert.ok(A.introduced('D') && A.introMap().D[3] === 'a');
});
