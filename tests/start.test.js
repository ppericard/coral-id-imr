// The first-launch question (Pierre, 2026-11-03; core.js CHOICE, playerStart's prior, startCheck, startNext,
// startInfer; model.js startSet, startStep, startDue, startShown, startMerge, startRestart; docs/LEARNING.md "The
// first-launch question"): the core rules, then model.js's own code run in Node on stubs (as tests/intro.test.js).
const test = require('node:test');
const cut = require('./block.js'); // the block of a browser file a test runs, its markers checked
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const {CHOICE, START, LEVEL, playerStart, startVars, startCheck, startNext, startInfer} = C;

let CLOCK = 1.8e12;
function model({P = {}, slate = ['A', 'B', 'C', 'D', 'E', 'F'], basics = false} = {}) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    block = cut(src, '// First meeting with a genus (Pierre', 'const introSince');
  const saved = {},
    ctx = {
      ...require('./subj.stub.js')(), // the corals as the current subject
      P,
      LEVEL,
      CB: {},
      COMEBACK: {KEY: 'reefid-comeback'},
      n: 0,
      Date: {now: () => ++CLOCK},
      slateGenera: () => slate,
      syncSoon: () => {},
      basicsDue: () => !basics && ctx.SUBJ.pages.includes('basics'), // app.js: the subject's basics module not done yet
      document: {querySelectorAll: () => []},
      ...C,
      ...require('./subj.stub.js')(),
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))}
    };
  ctx.answersSoFar = () => ctx.n;
  ctx.drops = 0;
  ctx.dropPlans = () => ctx.drops++;
  vm.createContext(ctx);
  vm.runInContext(
    block +
      '\nthis.M = {INTRO, introAdd, introOffer, introReset, holdStep, setHold: h => (HOLDS = h), startOf, startV, startSet, startEase, startRestart, startStep, startDue, startShown, startMerge, startResume: typeof startResume === "function" ? startResume : () => {}};',
    ctx
  );
  const M = ctx.M;
  M.ctx = ctx;
  M.saved = saved;
  // n answers on questions of difficulty d with 4 choices, right or not, each the first one on its genus or not, the
  // global level then lv (quiz.js answer -> startStep: the level and the genera met are read from the record).
  M.play = (n, d, ok, first = false, lv) => {
    for (let i = 0; i < n; i++) {
      ctx.n++;
      if (typeof lv === 'number') ctx.P[LEVEL] = {ok: ctx.n, ko: 0, th: lv};
      M.startStep(d, 4, typeof ok === 'function' ? ok(i) : ok, typeof first === 'function' ? first(i) : first);
    }
  };
  return M;
}

test('the question: three answers, in order, each with its variables; "new" is the default player of before', () => {
  assert.deepStrictEqual(
    CHOICE.opts.map(o => o[0]),
    ['new', 'imr', 'know']
  );
  CHOICE.opts.forEach(o => assert.ok(typeof o[1].p === 'number' && typeof o[1].at === 'number', o[0]));
  assert.deepStrictEqual(startVars(), startVars('new'), 'no answer: the default player');
  assert.strictEqual(startVars('new').p, 0, 'new: the level of before');
  assert.strictEqual(startVars('new').at, 50, 'new: the offer when it came before');
  assert.ok(startVars('new').basics && !startVars('imr').basics && !startVars('know').basics, 'Coral basics first for new only');
  assert.ok(startVars('new').p < startVars('imr').p && startVars('imr').p < startVars('know').p);
  assert.ok(startVars('new').at >= startVars('imr').at && startVars('imr').at >= startVars('know').at);
});

test('playerStart: the answers are shrunk towards the level said, not towards 0; p 0 is the rule of before', () => {
  const P = {[LEVEL]: {ok: 8, ko: 2, th: 0.6}};
  // The rule before: W x th x m / (m + N).
  assert.strictEqual(playerStart(P, 'X'), Math.round(START.W * 0.6 * (10 / 20) * 100) / 100);
  assert.strictEqual(playerStart(P, 'X', 0), playerStart(P, 'X'));
  assert.strictEqual(playerStart({}, 'X', 1), START.W, 'no answers: W x p');
  assert.strictEqual(playerStart(P, 'X', 1), Math.round(((START.W * (10 * 0.6 + START.N * 1)) / 20) * 100) / 100);
  // The prior fades as the answers build up.
  const many = {[LEVEL]: {ok: 400, ko: 100, th: 0.2}};
  assert.ok(Math.abs(playerStart(many, 'X', startVars('know').p) - playerStart(many, 'X')) < 0.03);
  assert.strictEqual(playerStart({}, 'X', 9), START.HI, 'clamped');
});

test('fallback verdict: at 40 and 60 answers only; "lower" sensitive (80% one-sided, or the hold alone), "higher" at 95% with the first answers as a guard', () => {
  const [A1, A2] = CHOICE.AT,
    {startBand, levelFit, startCheck} = C;
  assert.deepStrictEqual(CHOICE.AT, [40, 60], 'no card before 40 answers (Pierre, 2026-11-04)');
  assert.strictEqual(CHOICE.ZL, 0.84, '"lower": one-sided 80%');
  assert.deepStrictEqual(startBand('new'), [-Infinity, (startVars('new').p + startVars('imr').p) / 2]);
  assert.deepStrictEqual(startBand('imr'), [(startVars('new').p + startVars('imr').p) / 2, (startVars('imr').p + startVars('know').p) / 2]);
  assert.deepStrictEqual(startBand('know'), [(startVars('imr').p + startVars('know').p) / 2, Infinity]);
  // The fitted level rises with the right answers and allows for the difficulty.
  const fit = (r, d) => levelFit(Array.from({length: 10}, (_, i) => [d, 0.25, i < r ? 1 : 0]))[0];
  assert.ok(fit(3, 0) < fit(6, 0) && fit(6, 0) < fit(9, 0));
  assert.ok(fit(6, 1) > fit(6, 0), 'the same answers on harder questions: a higher level');
  // w: [d, g, right, first] on average photos (d 0, 4 choices).
  const W = (n, okF, firstF = () => true) => Array.from({length: n}, (_, i) => [0, 0.25, okF(i) ? 1 : 0, firstF(i) ? 1 : 0]);
  // A beginner who said "know well": one in four right, a global level of -0.5.
  const weak = n => W(n, i => i % 4 === 0);
  assert.strictEqual(startCheck(weak(20), 'know', -0.5, 6, 0), null, 'no card at 20 answers any more');
  assert.strictEqual(startCheck(weak(A1 - 1), 'know', -0.5, 6, 0), null, 'not between checkpoints');
  assert.strictEqual(startCheck(weak(A1), 'know', -0.5, 6, 0), 'lo', 'the global level clearly below the band at 40');
  assert.strictEqual(startCheck(weak(50), 'know', -0.5, 6, 0), null, 'not at 50');
  assert.strictEqual(startCheck(weak(A2), 'know', -0.5, 6, 0), 'lo', 'and at 60');
  assert.strictEqual(startCheck(weak(A2 + 1), 'know', -0.5, 6, 0), null, 'nothing after the last checkpoint');
  assert.strictEqual(startCheck(weak(A1), 'new', -1.5, 6, 0), null, 'nothing below "new"... and no "higher" either');
  // "Lower" reads the global level, not the first answers: first answers all right, the level clearly under the floor.
  const ok = W(A1, () => true);
  assert.strictEqual(startCheck(ok, 'imr', -1, 6, 0), 'lo', 'the global level decides "lower"');
  // One-sided 80%: below the floor at 80% though not at 95% (the former rules: nothing).
  assert.strictEqual(startCheck(ok, 'imr', -0.3, 6, 0), 'lo', 'below the floor with 80% confidence');
  assert.strictEqual(startCheck(ok, 'imr', 0.1, 6, 0), null, 'below the floor, not with 80% confidence: nothing');
  // Poor first answers alone never trigger "lower" (the level inside the band, no hold).
  const firstMiss = W(A1, i => i % 3 === 0);
  assert.ok(levelFit(firstMiss)[0] < startBand('imr')[0], 'first-answer level under the floor');
  assert.strictEqual(startCheck(firstMiss, 'imr', 0.73, 12, 0), null, 'the first answers never trigger "lower"');
  // The opening hold fired in the window is enough, the level in the band or above (a gentle offer: Pierre, 2026-11-04).
  assert.strictEqual(startCheck(ok, 'imr', 0.5, 6, 1), 'lo', 'the hold alone, the level in the band');
  assert.strictEqual(startCheck(ok, 'know', 2, 12, 1), 'lo', 'the hold alone, the level above the floor');
  assert.strictEqual(startCheck(weak(A1), 'new', -1.5, 6, 1), null, '"new" has no floor: never "lower", hold or not');
  // "Higher": OFFER.MET genera met, the global level clearly above the band, the first answers above it too (a guard).
  const strong = W(
    A1,
    () => true,
    i => i % 3 === 0
  );
  assert.strictEqual(startCheck(strong.slice(0, 20), 'new', 2.5, 12, 0), null, 'not at 20');
  assert.strictEqual(startCheck(strong, 'new', 2.5, CHOICE.MET - 1, 0), null, 'not with too few genera met');
  assert.strictEqual(startCheck(strong, 'new', 2.5, CHOICE.MET, 0), 'hi');
  // A player right on the few genera they learned but not on their first answers: not "higher" (the guard).
  const learnt = W(
    A1,
    i => i % 3 !== 0,
    i => i % 3 === 0
  );
  assert.strictEqual(startCheck(learnt, 'new', 2.5, CHOICE.MET, 0), null, 'the first answers guard "higher"');
  assert.strictEqual(startCheck(strong, 'new', 0.2, CHOICE.MET, 0), null, 'the first answers alone never trigger "higher"');
  assert.deepStrictEqual(C.startNext('know', 'lo'), ['imr', 'new'], 'lower answers, nearest first');
  assert.deepStrictEqual(C.startNext('new', 'hi'), ['imr', 'know']);
  assert.deepStrictEqual(C.startNext('new', 'lo'), []);
  assert.deepStrictEqual(C.startNext('know', 'hi'), []);
});

test('inferred for an existing player: the answer whose starting level is nearest the global level', () => {
  const at = th => startInfer({[LEVEL]: {ok: 60, ko: 10, th}});
  assert.strictEqual(startInfer({}), 'new');
  assert.strictEqual(at(-0.8), 'new');
  assert.strictEqual(at(START.W * startVars('imr').p), 'imr');
  assert.strictEqual(at(START.W * startVars('know').p + 1), 'know');
});

test('stored and its variables set: the answer, when, how; the offer to open all comes from its own answer', () => {
  const slate = Array.from({length: 12}, (_, i) => 'G' + i),
    M = model({slate});
  assert.strictEqual(M.startOf(), null);
  assert.deepStrictEqual(M.startV(), startVars('new'));
  M.startSet('bogus', 'tour');
  assert.strictEqual(M.startOf(), null, 'an unknown answer is not stored');
  M.startSet('know', 'tour');
  const o = M.startOf();
  assert.strictEqual(o.c, 'know');
  assert.strictEqual(o.via, 'tour');
  assert.strictEqual(o.at, 0);
  assert.deepStrictEqual(
    o.h.map(x => x[0]),
    ['know']
  );
  assert.ok(M.ctx.drops > 0, 'the questions planned with the old level are dropped');
  assert.deepStrictEqual(M.startV(), startVars('know'));
  // The offer: 10 genera met, a level of 0.5; at the choice's own answer count, never before.
  M.introAdd(slate.slice(0, 10), true, 's');
  M.ctx.P[LEVEL] = {ok: 15, ko: 4, th: 1};
  M.ctx.n = startVars('know').at - 1;
  assert.strictEqual(M.introOffer(), false);
  M.ctx.n = startVars('know').at;
  assert.strictEqual(M.introOffer(), true, 'know: the offer from its at');
  M.startSet('new', 'fallback');
  assert.strictEqual(M.introOffer(), false, 'new: not before 50 answers, as before');
  assert.deepStrictEqual(
    M.startOf().h.map(x => [x[0], x[3]]),
    [
      ['know', 'tour'],
      ['new', 'fallback']
    ]
  );
});

test('fallback: consistent answers, no card; inconsistent, one card per answer and direction, never twice', () => {
  const N = CHOICE.AT[0],
    END = CHOICE.AT[CHOICE.AT.length - 1];
  // Consistent: "IMR course", three in four right on average photos, a level in the band.
  const B = model();
  B.startSet('imr', 'tour');
  B.play(
    END,
    0,
    i => i % 4 !== 0,
    i => i % 2 === 0,
    0.5
  );
  assert.strictEqual(B.startOf().w.length, END);
  assert.strictEqual(B.startDue(), null, 'consistent: nothing');
  B.play(30, 0, false, true, -1.5);
  assert.strictEqual(B.startOf().w.length, END, 'the window stops at the last checkpoint');
  assert.strictEqual(B.startDue(), null, 'answers after the window do not count');
  // Struggling after "I know corals well": lo at 40 answers, once.
  const L = model();
  L.startSet('know', 'tour');
  L.play(N - 1, 0, i => i % 4 === 0, true, -0.5);
  assert.strictEqual(L.startDue(), null, 'not before 40 answers');
  L.play(1, 0, false, true, -0.5);
  assert.strictEqual(L.startDue(), 'lo');
  const before = JSON.stringify(L.ctx.P);
  L.startShown('lo'); // shown, then "No thanks, I know the basics" (quiz.js startFbShow: nothing else)
  assert.strictEqual(L.startDue(), null, 'never twice');
  assert.strictEqual(L.startOf().c, 'know', '"No thanks" keeps the answer');
  assert.strictEqual(JSON.stringify(L.ctx.P), before, 'and the progress');
  L.play(CHOICE.AT[1] - N, 0, i => i % 4 === 0, true, -0.5);
  assert.strictEqual(L.startDue(), null, 'the same direction never comes back on the same answer, at 60 either');
  // Changing the answer starts a new window: a new inconsistency, told once more; never twice about the same answer.
  L.startSet('imr', 'fallback');
  assert.strictEqual(L.startOf().w.length, 0);
  L.setHold(2); // the opening hold on (model.js introHold): the eased questions hide the misses
  L.play(N, 0, i => i % 6 === 0, true, -0.5);
  assert.strictEqual(L.startDue(), 'lo', 'still too hard after "IMR course": once more, with the opening hold fired');
  L.startShown('lo');
  assert.strictEqual(L.startDue(), null);
  L.startSet('know', 'fallback');
  L.play(N, 0, false, true, -1);
  assert.strictEqual(L.startDue(), null, '"I know corals well" was told already');
  // Better than said: hi, at 40 answers with OFFER.MET genera met (the record reads slateGenera and introduced).
  const H = model({slate: Array.from({length: 12}, (_, i) => 'G' + i)});
  H.introAdd(H.ctx.slateGenera(), true, 's');
  H.startSet('new', 'tour');
  H.play(20, 0.5, true, i => i % 2 === 0, 2.5);
  assert.strictEqual(H.startDue(), null, 'not at 20');
  H.play(N - 20, 0.5, true, i => i % 2 === 0, 2.5);
  assert.strictEqual(H.startDue(), 'hi');
  // After a move up on a fallback card, never a card back down (and the other way round); further up is still possible.
  const U = model({slate: Array.from({length: 12}, (_, i) => 'G' + i)});
  U.introAdd(U.ctx.slateGenera(), true, 's');
  U.startSet('new', 'tour');
  U.startSet('imr', 'fallback');
  U.setHold(2);
  U.play(N, 0, i => i % 6 === 0, true, -0.5);
  assert.strictEqual(U.startOf().v, 'lo', 'the verdict is "lower"');
  assert.strictEqual(U.startDue(), null, 'but not right after moving up on its card');
  U.startSet('know', 'fallback');
  U.startSet('imr', 'fallback');
  U.setHold(0); // the opening hold off: it alone would say "lower" (still possible after moving down)
  U.play(N, 0.5, true, i => i % 2 === 0, 2.5);
  assert.strictEqual(U.startOf().v, 'hi', 'the verdict is "higher"');
  assert.strictEqual(U.startDue(), null, 'and not back up after moving down');
  // Inferred (an existing player, never asked): never a card.
  const I = model({slate: Array.from({length: 12}, (_, i) => 'G' + i)});
  I.introAdd(I.ctx.slateGenera(), true, 's');
  I.startSet('new', 'inferred');
  I.play(N, 0.5, true, true, 2.5);
  assert.strictEqual(I.startDue(), null, 'inferred: no card');
  // Nothing to offer: no card ("I know corals well" and easier; "new", struggling, Coral basics done).
  const D = model({basics: true});
  D.startSet('new', 'card');
  D.play(N, 2, false, true, -1.5);
  assert.strictEqual(D.startDue(), null, 'new, basics done: nothing to suggest');
  const E = model({basics: false});
  E.startSet('new', 'card');
  E.play(N, 2, false, true, -1.5);
  assert.strictEqual(E.startDue(), null, 'new: nothing below its band either (the band has no floor)');
});

test('Coral basics on the "lower" card: the start variables one band down, silently; the answer given stays', () => {
  const N = CHOICE.AT[0],
    M = model({slate: Array.from({length: 12}, (_, i) => 'G' + i)});
  M.introAdd(M.ctx.slateGenera(), true, 's');
  M.startSet('know', 'tour');
  M.setHold(2);
  M.play(N, 0, i => i % 4 === 0, true, 0.5);
  assert.strictEqual(M.startDue(), 'lo');
  M.startShown('lo');
  M.startEase();
  const o = M.startOf();
  assert.strictEqual(o.c, 'know', 'the answer given is never relabelled');
  assert.deepStrictEqual(
    o.h.filter(x => x[3] !== 'ease').map(x => x[0]),
    ['know'],
    'nor added to the answers given'
  );
  assert.deepStrictEqual(o.h[o.h.length - 1].slice(3), ['ease', 'know', o.t], 'an ease event in the history, bound to the choice it eased');
  assert.strictEqual(o.ease[0], 'imr');
  assert.deepStrictEqual(M.startV(), startVars('imr'), "the IMR course's prior and open-all offer");
  // The replay (core.js startPriorAt) takes the band below from its time on.
  assert.strictEqual(C.startPriorAt(o, o.ease[2] - 1), startVars('know').p);
  assert.strictEqual(C.startPriorAt(o, o.ease[2]), startVars('imr').p);
  // No reversal: no "higher" card after it.
  const H = model({slate: Array.from({length: 12}, (_, i) => 'G' + i)});
  H.introAdd(H.ctx.slateGenera(), true, 's');
  H.startSet('imr', 'tour');
  H.startEase();
  assert.deepStrictEqual(H.startV(), startVars('new'));
  H.play(N, 0.5, true, i => i % 2 === 0, 2.5);
  assert.strictEqual(H.startOf().v, 'hi');
  assert.strictEqual(H.startDue(), null, 'never "higher" after the silent move down');
  // A new answer given drops it.
  M.startSet('imr', 'card');
  assert.strictEqual(M.startOf().ease, undefined);
  // Coral basics done: no "lower" card at all (it is the Coral basics offer).
  const D = model({basics: true});
  D.startSet('know', 'tour');
  D.setHold(2);
  D.play(N, 0, false, true, -1);
  assert.strictEqual(D.startOf().v, 'lo');
  assert.strictEqual(D.startDue(), null);
});

// Codex review #428 (P2): the silent ease taken on one device survives a merge with the other device's same answer and
// longer window; the questions planned ahead are dropped when the start variables in force change.
test('synced: the ease is merged by its own time, and a change of the variables in force drops the plans', () => {
  const N = CHOICE.AT[0],
    A = model(),
    B = model();
  A.startSet('know', 'tour');
  const rec = A.startOf();
  B.ctx.store.set(C.startKey('coral'), rec); // the same answer on both devices
  A.play(N, 0, false, true, 0.5); // the longer window on A
  B.startEase(); // Coral basics taken on B
  const drops = A.ctx.drops;
  A.startMerge(JSON.stringify(B.startOf()));
  assert.strictEqual(A.startOf().w.length, N, "A's longer window kept");
  assert.deepStrictEqual(A.startOf().ease, B.startOf().ease, "B's ease kept");
  assert.deepStrictEqual(A.startV(), startVars('imr'));
  assert.ok(A.ctx.drops > drops, 'the plans dropped: the variables in force changed');
  // Merged back the other way: B keeps its ease and takes A's longer window.
  B.startMerge(JSON.stringify(A.startOf()));
  assert.strictEqual(B.startOf().w.length, N);
  assert.deepStrictEqual(B.startOf().ease, A.startOf().ease);
  // No change in force: no drop.
  const d2 = A.ctx.drops;
  A.startMerge(JSON.stringify(A.startOf()));
  assert.strictEqual(A.ctx.drops, d2);
});

// Codex review #428 (P2): after a progress reset the window restarts; the account's record saved before the reset (the
// same answer, a longer window) must not bring the old window back, or the new run never reaches its checkpoints.
test('synced: a window saved before a progress reset never wins over the new one', () => {
  const N = CHOICE.AT[0],
    A = model();
  A.startSet('know', 'tour');
  A.play(N, 0, true, true, 0.5);
  const saved = JSON.stringify(A.startOf()); // the account's copy, before the reset
  A.startRestart();
  assert.strictEqual(A.startOf().w.length, 0);
  A.startMerge(saved);
  assert.strictEqual(A.startOf().w.length, 0, 'the pre-reset window is not restored');
  A.play(N, 0, false, true, -0.5);
  assert.strictEqual(A.startOf().w.length, N, 'the new run reaches its checkpoint');
  assert.strictEqual(A.startOf().v, 'lo');
  // The post-reset record reaches another device that still holds the old window: the new window wins there too.
  const B = model();
  B.ctx.store.set(C.startKey('coral'), JSON.parse(saved));
  B.startMerge(JSON.stringify(A.startOf()));
  assert.strictEqual(B.startOf().w.length, N);
  assert.strictEqual(B.startOf().wt, A.startOf().wt);
});

// Codex review #428 (P2): a progress reset made on another device and adopted here (sync.js mergeSubject) keeps the
// window that device has counted since its reset (merged first by startMerge) and takes the reset's time as its epoch,
// never a newer one: else the empty window would win back on the device that made the reset.
test('synced: a remote progress reset keeps the window counted since it, with its epoch', () => {
  const A = model(),
    B = model();
  A.startSet('know', 'tour');
  B.ctx.store.set(C.startKey('coral'), A.startOf()); // the same answer on both devices
  B.play(30, 0, true, true, 0.5); // B's window before A's reset
  A.introReset(); // a reset made on A
  const wt = A.startOf().wt,
    rr = Date.parse(new Date(wt).toISOString()); // the reset time the sheet carries (sync.js reefid-sync-coral-reset)
  A.play(39, 0, true, true, 0.5); // 39 answers since the reset
  B.startMerge(JSON.stringify(A.startOf())); // B syncs: A's record first (sync.js mergeSavedIn)...
  B.introReset(rr); // ...then A's newer reset (mergeSubject, rr > lr)
  assert.strictEqual(B.startOf().w.length, 39, 'the window A counted since its reset is kept');
  assert.strictEqual(B.startOf().wt, wt, "with A's epoch, not a newer one");
  A.startMerge(JSON.stringify(B.startOf()));
  assert.strictEqual(A.startOf().w.length, 39, 'nothing emptied back on A');
  // From a device without the epoch (an older app): the window restarts, from the reset's time.
  const D = model();
  D.startSet('know', 'tour');
  D.play(30, 0, true, true, 0.5);
  const at = D.startOf().t + 1000;
  D.introReset(at);
  assert.strictEqual(D.startOf().w.length, 0);
  assert.strictEqual(D.startOf().wt, at);
  // A reset made here always starts a new epoch.
  D.play(5, 0, true, true, 0.5);
  D.introReset();
  assert.ok(D.startOf().wt > at && D.startOf().w.length === 0);
});

// Codex review #428 (P2): only a coral progress reset restarts the coral window (a fish reset, made here or adopted).
test('a fish progress reset leaves the coral fallback window as it is', () => {
  const M = model();
  M.startSet('know', 'tour');
  M.play(30, 0, true, true, 0.5);
  const o = M.startOf();
  M.ctx.SUBJ = C.subjectOf('fish');
  M.introReset();
  M.introReset(Date.now() + 1000);
  M.ctx.SUBJ = C.subjectOf('coral');
  assert.deepStrictEqual(M.startOf(), o, 'window and epoch unchanged');
  M.introReset();
  assert.strictEqual(M.startOf().w.length, 0, 'a coral reset restarts it');
});

// Codex review #428 (P2): an existing player who answers the welcome question on a new device before signing in: the
// newer local answer wins, but the account's earlier answers stay in the history, so the replay (core.js startPriorAt)
// keeps their priors for the answers played under them.
test('synced: both histories of answers are merged, oldest first, whichever answer wins', () => {
  const T1 = Date.now() - 100000,
    acct = {c: 'imr', t: T1, at: 0, via: 'tour', w: [], fb: {}, h: [['imr', 0, T1, 'tour']]},
    B = model();
  B.startSet('know', 'tour'); // the new device, later
  const T2 = B.startOf().t;
  B.startMerge(JSON.stringify(acct));
  const o = B.startOf();
  assert.strictEqual(o.c, 'know', 'the latest answer wins');
  assert.deepStrictEqual(
    o.h.map(x => [x[0], x[2]]),
    [
      ['imr', T1],
      ['know', T2]
    ]
  );
  assert.strictEqual(C.startPriorAt(o, T1 + 1), startVars('imr').p, 'the answers between the two keep the IMR prior');
  assert.strictEqual(C.startPriorAt(o, T2), startVars('know').p);
  // The other way (the account's device gets the new answer): the same history, no duplicate on a second merge.
  const A = model();
  A.ctx.store.set(C.startKey('coral'), acct);
  A.startMerge(JSON.stringify(o));
  A.startMerge(JSON.stringify(o));
  assert.deepStrictEqual(A.startOf().h, o.h);
  // A record of an older app, without h: its own answer counts.
  const D = model();
  D.startSet('know', 'tour');
  D.startMerge(JSON.stringify({c: 'imr', t: T1, at: 3, via: 'card'}));
  assert.deepStrictEqual(
    D.startOf().h.map(x => x[0]),
    ['imr', 'know']
  );
});

// Codex review #428 (P2): an ease taken under an earlier answer stays in force for the answers played under it when a
// newer answer from another device wins (an event in the history, core.js startEvents), and never applies to that newer
// answer.
test("synced: an earlier answer's ease keeps its prior when a newer answer wins", () => {
  // Before the event list: the ease as a field of the record (8359b24), and as an event since.
  const old = {c: 'know', t: 100, at: 0, via: 'tour', w: [], fb: {}, h: [['know', 0, 100, 'tour']], ease: ['imr', 40, 200]},
    now = C.startNorm({
      ...old,
      h: [
        ['know', 0, 100, 'tour'],
        ['imr', 40, 200, 'ease', 'know']
      ]
    });
  delete now.ease;
  for (const acct of [old, now]) {
    const B = model();
    B.startSet('new', 'tour'); // a new device, later, before signing in
    const T3 = B.startOf().t;
    B.startMerge(JSON.stringify(acct));
    const o = B.startOf();
    assert.strictEqual(o.c, 'new');
    assert.strictEqual(o.ease, undefined, 'the ease of "know" never applies to "new"');
    assert.strictEqual(C.startPriorAt(o, 150), startVars('know').p);
    assert.strictEqual(C.startPriorAt(o, 250), startVars('imr').p, 'between the ease and the newer answer: the eased prior');
    assert.strictEqual(C.startPriorAt(o, T3), startVars('new').p);
  }
});

// The event list merges the same whichever way round (Codex review #428): two devices' histories from a common start,
// each adding answers and eases at random times; union(A, B) and union(B, A) hold the same events, the same current
// answer and ease, and give the same prior at every time.
test('synced: merging A into B and B into A gives the same history and the same priors (property)', () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647),
    pick = a => a[Math.floor(rnd() * a.length)],
    opts = CHOICE.opts.map(o => o[0]);
  for (let run = 0; run < 200; run++) {
    const base = [[pick(opts), 0, 1000, 'tour']],
      dev = () => {
        let h = [...base],
          t = 1000;
        for (let k = Math.floor(rnd() * 4); k > 0; k--) {
          t += 1 + Math.floor(rnd() * 50);
          const cur = C.startStateAt(C.startEventsOf({h}), Infinity).ch[0],
            down = C.startNext(cur, 'lo')[0];
          h = [...h, rnd() < 0.5 && down ? [down, k, t, 'ease', cur] : [pick(opts), k, t, pick(['card', 'fallback'])]];
        }
        return C.startNorm({h, w: [], fb: {}});
      },
      A = dev(),
      B = dev(),
      AB = C.startUnion(A, B),
      BA = C.startUnion(B, A);
    assert.deepStrictEqual(AB.h, BA.h, `run ${run}: the same events`);
    assert.deepStrictEqual([AB.c, AB.t, AB.ease], [BA.c, BA.t, BA.ease], `run ${run}: the same answer and ease`);
    assert.deepStrictEqual(C.startUnion(AB, A).h, AB.h, `run ${run}: merging again adds nothing`);
    for (let t = 999; t <= 1250; t++) assert.strictEqual(C.startPriorAt(AB, t), C.startPriorAt(BA, t), `run ${run}: prior at ${t}`);
  }
});

// Codex review #428 (P2): the history keeps every event (no cap at 10): the replay needs the earliest answers' prior.
test('the history keeps every event: the earliest answers keep their prior', () => {
  const h = Array.from({length: 11}, (_, i) => ['know', i, 100 * (i + 1), i ? 'card' : 'tour']),
    o = C.startNorm({h, w: [], fb: {}});
  assert.strictEqual(o.h.length, 11);
  assert.strictEqual(C.startPriorAt(o, 150), startVars('know').p, 'between the 1st and the 2nd event');
  assert.strictEqual(C.startPriorAt(C.startUnion(o, {h: [['imr', 0, 50, 'tour']], w: [], fb: {}}), 150), startVars('know').p);
  assert.ok(C.START_CAP >= 200, 'only a safety bound');
});

// The union is lossless (Codex review #428): three devices each build their own history (answers, often the same answer
// given independently on several devices, and eases bound to the device's answer in force); merged in any order, the
// prior at every time is the one computed straight from the definition over all events, nothing is dropped, and the
// union is commutative and associative.
test('synced: the union of histories is lossless, commutative and associative (property)', () => {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647),
    opts = CHOICE.opts.map(o => o[0]),
    pick = a => a[Math.floor(rnd() * a.length)],
    // The prior at t from the definition: the last answer at or before t, or the band below it while the latest event
    // after it is an ease bound to that very answer event (same answer and time; a choice before an ease at one time).
    ref = (ev, t) => {
      let c = null,
        e = null;
      ev.filter(x => x[2] <= t)
        .sort((a, b) => a[2] - b[2] || (a[3] === 'ease') - (b[3] === 'ease'))
        .forEach(x => (x[3] === 'ease' ? c && x[4] === c[0] && x[5] === c[2] && (e = x[0]) : ((c = x), (e = null))));
      return e ? startVars(e).p : c ? startVars(c[0]).p : 0;
    };
  for (let run = 0; run < 100; run++) {
    const devs = [0, 1, 2].map(d => {
      const h = [];
      let t = 1000 + d,
        cur = null;
      for (let k = 0; k < 6 + Math.floor(rnd() * 20); k++) {
        t += 3 * (1 + Math.floor(rnd() * 20)); // distinct times across devices (offset d): one order whatever the merge
        const down = cur && C.startNext(cur[0], 'lo')[0];
        if (cur && down && rnd() < 0.3) h.push([down, k, t, 'ease', cur[0], cur[2]]);
        else h.push((cur = [rnd() < 0.5 ? 'know' : pick(opts), k, t, pick(['tour', 'card', 'fallback'])]));
      }
      return h;
    });
    const all = devs.flat(),
      R = devs.map(h => C.startNorm({h, w: [], fb: {}})),
      U = C.startUnion(C.startUnion(R[0], R[1]), R[2]),
      V = C.startUnion(R[2], C.startUnion(R[1], R[0])),
      W = C.startUnion(R[0], C.startUnion(R[1], R[2]));
    assert.deepStrictEqual(U.h, V.h, `run ${run}: commutative`);
    assert.deepStrictEqual(U.h, W.h, `run ${run}: associative`);
    assert.strictEqual(U.h.length, all.length, `run ${run}: nothing dropped`);
    const end = Math.max(...all.map(x => x[2]));
    for (let q = 990; q <= end + 5; q++) assert.strictEqual(C.startPriorAt(U, q), ref(all, q), `run ${run}: prior at ${q}`);
  }
});

// Codex review #428 (P2): an ease applies only to the choice event it eased, not to an independent choice of the same
// answer from another device (know@100 eased at 300, merged with know@200: "know" again from 200 on).
test('synced: an ease applies only to the choice event it eased', () => {
  const A = C.startNorm({
      h: [
        ['know', 0, 100, 'tour'],
        ['imr', 5, 300, 'ease', 'know', 100]
      ],
      w: [],
      fb: {}
    }),
    B = C.startNorm({h: [['know', 0, 200, 'card']], w: [], fb: {}});
  for (const U of [C.startUnion(A, B), C.startUnion(B, A)]) {
    assert.strictEqual(C.startPriorAt(U, 150), startVars('know').p);
    assert.strictEqual(C.startPriorAt(U, 350), startVars('know').p, 'the ease of know@100 does not ease know@200');
    assert.strictEqual(U.ease, undefined);
  }
  // An ease written before the binding: bound to the latest choice of its answer at or before it, in its own record.
  const old = C.startNorm({
    h: [
      ['know', 0, 100, 'tour'],
      ['imr', 5, 300, 'ease', 'know']
    ],
    w: [],
    fb: {}
  });
  assert.strictEqual(old.h[1][5], 100);
  assert.strictEqual(C.startPriorAt(C.startUnion(old, B), 350), startVars('know').p);
  assert.strictEqual(C.startPriorAt(old, 350), startVars('imr').p, 'alone, it still eases its own answer');
});

test('synced: the latest answer wins, the cards shown on either device count; a progress reset keeps the answer', () => {
  const A = model(),
    B = model();
  A.startSet('imr', 'tour');
  B.startSet('know', 'card'); // later
  B.startShown('hi');
  A.startMerge(JSON.stringify(B.startOf()));
  assert.strictEqual(A.startOf().c, 'know', 'the later answer');
  A.startShown('lo');
  B.startMerge(JSON.stringify(A.startOf()));
  assert.deepStrictEqual(Object.keys(B.startOf().fb).sort(), ['know-hi', 'know-lo'], 'both cards counted');
  const old = {...A.startOf(), c: 'new', t: 1, fb: {}};
  A.startMerge(JSON.stringify(old));
  assert.strictEqual(A.startOf().c, 'know', 'an older answer never wins');
  A.startMerge('{bad json');
  A.startMerge(JSON.stringify({c: 'bogus', t: 9e15}));
  assert.strictEqual(A.startOf().c, 'know', 'broken records are ignored');
  // Reset: the answer stays, the window starts again from 0 answers.
  A.ctx.n = 40;
  A.introReset();
  A.ctx.n = 0;
  const r = A.startOf();
  assert.strictEqual(r.c, 'know');
  assert.deepStrictEqual(r.w, []);
  assert.strictEqual(r.at, 0);
  assert.ok(r.fb['know-lo'] && r.fb['know-hi'], 'the cards shown stay shown');
});

// Codex review of #428, P2 4457104006: on a shared device, signing out leaves the next player nothing of the last one's,
// Coral basics included (its completion would hide the next beginner's offers and block their achievement).
test('sign-out clears the first-launch answer and Coral basics with the progress', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'sync.js'), 'utf8'),
    // sync.js signOutClear (2026-11-05: Sign out and deleting one's own account clear the device the same way)
    i = src.indexOf('function signOutClear('),
    list = src.slice(i, src.indexOf('].forEach', i));
  assert.ok(i > 0, 'signOutClear found');
  assert.match(src, /const signOff = \(\) => \{\s*signOutClear\(\);/, 'Sign out clears through it');
  // Every subject's record (reefid-sync-<subject>-start, core.js startKey) goes with that subject's other keys.
  assert.match(list, /\[[^\]]*'start'[^\]]*\]\.map\(k => subjKey\(S\.id, k\)\)/);
  assert.match(list, /\bBASICS_KEY\b/);
});

// Codex review of #428, P2 4457104032: a glossary popup gives the same link before and after the Tools tier is in
// (Coral basics' step, Corallite anatomy's card, the Words list, or none), from one table in app.js.
test('glossary links to Coral basics: one mapping, the same before the Tools tier loads', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'),
    a = src.indexOf('const BASICS_WORDS'),
    b = src.indexOf('function showGloss');
  assert.ok(a > 0 && b > a, 'BASICS_WORDS and basicsHref in app.js, before showGloss');
  const ctx = {window: {}};
  vm.createContext(ctx);
  vm.runInContext(src.slice(a, b) + '\nthis.H = basicsHref;', ctx);
  assert.strictEqual(ctx.H('Septa'), 'basics|septa');
  assert.strictEqual(ctx.H('Coenosteum'), 'basics|walls|separate');
  assert.strictEqual(ctx.H('Columella'), 'lab-anatomy|con|columella', 'an anatomy word: its Corallite anatomy card');
  assert.strictEqual(ctx.H('Paliform lobes'), 'lab-anatomy|con|pali');
  assert.strictEqual(ctx.H('Verrucae'), 'basics|words', 'a word with no step: the Words list');
  assert.strictEqual(ctx.H('Solitary'), '', 'not a Coral basics word: no link');
});

// Codex review of #428, P2 4457104023: another device's answer arriving while the question card waits must not resume
// the quiz before the rest of the saved progress is merged (sync.js mergeSaved calls startResume once it is done).
test("another device's answer: the waiting question card resumes only after the merge, not inside it", () => {
  const M = model();
  let resumed = 0;
  M.ctx.document = {querySelectorAll: () => [{ulDone: () => resumed++}]};
  const B = model();
  B.startSet('imr', 'tour');
  M.startMerge(JSON.stringify(B.startOf()));
  assert.strictEqual(M.startOf().c, 'imr');
  assert.strictEqual(resumed, 0, 'not inside startMerge');
  M.startResume();
  assert.strictEqual(resumed, 1, 'startResume, once the merge is done');
  const N = model();
  let r2 = 0;
  N.ctx.document = {querySelectorAll: () => [{ulDone: () => r2++}]};
  N.startResume();
  assert.strictEqual(r2, 0, 'no answer yet: the card stays');
});

// The full replay (core.js replayProgress, the sheet's replay_ and the app's own replay of its unsent answers) steps the
// ability with the first-launch answer in force at each answer, as the app does (startPriorAt; RVS v3).
test('replay: the prior of the first-launch answer in force at each answer, as the app steps it', () => {
  const rec = {
    c: 'new',
    t: 5000,
    h: [
      ['know', 0, 1000, 'tour'],
      ['new', 20, 5000, 'fallback']
    ]
  };
  assert.strictEqual(C.startPriorAt(rec, 500), 0, 'before any answer: the default player');
  assert.strictEqual(C.startPriorAt(rec, 1000), startVars('know').p);
  assert.strictEqual(C.startPriorAt(rec, 4999), startVars('know').p);
  assert.strictEqual(C.startPriorAt(rec, 6000), startVars('new').p, 'after the change');
  assert.strictEqual(C.startPriorAt(null, 6000), 0);
  assert.strictEqual(C.startPriorAt({c: 'imr', t: 100}, 200), startVars('imr').p, 'a record without its history');
  assert.strictEqual(C.startPriorAt({c: 'bogus', t: 1, h: [['bogus', 0, 1]]}, 200), 0);
  // Two answers on genera never answered, after "I know corals well": the replay's abilities are the app's steps from
  // W x p, not from 0.
  const GEN = {A: {look: [], fam: 'x'}, B: {look: [], fam: 'y'}, C: {look: [], fam: 'z'}, D: {look: [], fam: 'w'}};
  const T = i => new Date(2000 + i * 1000).toISOString(),
    rows = [
      C.logRow({t: T(0), g: 'A', a: 'A', ok: 1, m: 'quiz', ph: 'a0', e: 0.8, th: 0, nw: 1, ch: 'A B C D'}, 'p'),
      C.logRow({t: T(1), g: 'B', a: 'C', ok: 0, m: 'quiz', ph: 'b0', e: 0.8, th: 0, nw: 1, ch: 'A B C D'}, 'p')
    ],
    plain = C.replayProgress(rows, {gen: GEN}).p.P,
    said = C.replayProgress(rows, {gen: GEN, starts: {p: {c: 'know', t: 1000, h: [['know', 0, 1000, 'tour']]}}}).p.P;
  // The app's own steps on the same answers (quiz.js answer: core.js scoreAnswer with the prior p).
  const app = {},
    p = startVars('know').p,
    step = (g, ok, d) => C.scoreAnswer(app, {t: g, c: ok ? g : 'C', ok, k: 4, chs: [], ph: [], d0: d, p, timed: false});
  const dOf = (e, th) => th - Math.log((e - 0.25) / 0.75 / (1 - (e - 0.25) / 0.75));
  step('A', true, dOf(0.8, 0));
  step('B', false, dOf(0.8, 0));
  assert.strictEqual(said.A.th, app.A.th, 'genus A as the app stepped it');
  assert.strictEqual(said.B.th, app.B.th, 'genus B as the app stepped it');
  assert.ok(said.A.th > plain.A.th, 'the prior lifts the start of a genus never answered');
  assert.notStrictEqual(said[C.LEVEL].th, plain[C.LEVEL].th);
});

// Rules versions: the first-launch prior moves the progress, so it has its version, with the standard card.
test('rules version: the first-launch prior has its RVS entry, with RV_CARD', () => {
  const x = C.RVS.find(v => /first-launch/i.test(v.why));
  assert.ok(x, 'an RVS entry for the first-launch prior');
  assert.strictEqual(x.msg, C.RV_CARD);
  assert.strictEqual(C.RV, C.RVS[C.RVS.length - 1].v);
});

// The fish welcome question (Pierre, 2026-11-04; docs/FISH_PATH.md): each subject asks its own question, in its own
// words (SUBJECTS start: the same answers, in the same order), kept in its own record (startKey): the coral answer stays
// the corals', the fish one sets the fish starting values, its window counts fish answers, and a subject without a basics
// module (no Fish basics yet) has no "lower" card and no basics offer.
test('per subject: the fish welcome question, its own record, window and cards', () => {
  ['coral', 'fish'].forEach(id => {
    const S = C.subjectOf(id);
    assert.ok(S.start && S.start.q, `${id}: a question`);
    assert.deepStrictEqual(
      Object.keys(S.start.opts),
      CHOICE.opts.map(o => o[0]),
      `${id}: the answers of CHOICE, in order`
    );
    CHOICE.opts.forEach(([c]) => assert.ok(C.startText(id, c)[0] && C.startText(id, c)[1], `${id} ${c}: words`));
  });
  assert.strictEqual(C.subjectOf('fish').start.q, 'How well do you know reef fish?');
  assert.deepStrictEqual(
    CHOICE.opts.map(([c]) => C.startText('fish', c)[0]),
    ['I’m new to reef fish', 'I’m at IMR (Research Assistant programme)', 'I know reef fish well'],
    "Pierre's three answers"
  );
  assert.strictEqual(C.startText('fish', 'nope'), null);
  assert.strictEqual(C.startKey('fish'), 'reefid-sync-fish-start');
  assert.strictEqual(C.startKey('coral'), 'reefid-sync-coral-start', 'the corals keep their key');
  const M = model();
  M.startSet('know', 'tour');
  assert.deepStrictEqual(M.startV(), startVars('know'), "corals: the answer's prior");
  M.ctx.SUBJ = C.subjectOf('fish');
  assert.strictEqual(M.startOf(), null, "fish: not answered yet (the coral answer is the corals' own)");
  assert.deepStrictEqual(M.startV(), startVars('new'), 'fish, no answer: the default player');
  M.startSet('imr', 'card');
  assert.deepStrictEqual(M.startV(), startVars('imr'), "fish: its own answer's prior");
  assert.strictEqual(M.saved[C.startKey('fish')] && JSON.parse(M.saved[C.startKey('fish')]).c, 'imr');
  assert.strictEqual(JSON.parse(M.saved[C.startKey('coral')]).c, 'know', 'the coral answer untouched');
  // The window counts the fish answers in the fish record only; a "lower" verdict has no card (no Fish basics).
  M.setHold(2);
  M.play(CHOICE.AT[0], 0, false, true, -1);
  assert.strictEqual(M.startOf().w.length, CHOICE.AT[0], 'fish: its own window');
  assert.strictEqual(M.startOf().v, 'lo');
  assert.strictEqual(M.startDue(), null, 'no Fish basics: no "lower" card');
  M.ctx.SUBJ = C.subjectOf('coral');
  assert.deepStrictEqual(M.startV(), startVars('know'), 'back on the corals: their answer');
  assert.strictEqual((M.startOf().w || []).length, 0, 'the coral window untouched by fish answers');
  // A record from another device merges into its own subject's record, whichever subject is on screen.
  const B = model();
  B.ctx.SUBJ = C.subjectOf('fish');
  B.startSet('know', 'card');
  const drops = M.ctx.drops;
  M.startMerge(JSON.stringify(B.startOf()), 'fish');
  assert.strictEqual(M.startOf().c, 'know', 'still the coral record on screen');
  assert.strictEqual(JSON.parse(M.saved[C.startKey('fish')]).c, 'know', 'the fish record merged: the latest answer');
  assert.strictEqual(M.ctx.drops, drops, "another subject's record: the plans on screen stay");
  assert.ok(C.subjectOf('coral').pages.includes('basics') && !C.subjectOf('fish').pages.includes('basics'), 'Coral basics: corals only');
});
