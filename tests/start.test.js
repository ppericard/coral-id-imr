// The first-launch question (Pierre, 2026-11-03; core.js CHOICE, playerStart's prior, startCheck, startNext,
// startInfer; model.js startSet, startStep, startDue, startShown, startMerge, startRestart; docs/LEARNING.md "The
// first-launch question"): the core rules, then model.js's own code run in Node on stubs (as tests/intro.test.js).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const {CHOICE, START, LEVEL, playerStart, startVars, startCheck, startNext, startInfer} = C;

let CLOCK = 1.8e12;
function model({P = {}, slate = ['A', 'B', 'C', 'D', 'E', 'F'], basics = false} = {}) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    block = src.slice(src.indexOf('// First meeting with a genus (Pierre'), src.indexOf('const introSince'));
  const saved = {},
    ctx = {
      P,
      LEVEL,
      CB: {},
      COMEBACK: {KEY: 'imr-comeback'},
      n: 0,
      Date: {now: () => ++CLOCK},
      slateGenera: () => slate,
      syncSoon: () => {},
      basicsDone: () => basics,
      document: {querySelectorAll: () => []},
      ...C,
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))}
    };
  ctx.answersSoFar = () => ctx.n;
  ctx.drops = 0;
  ctx.dropPlans = () => ctx.drops++;
  vm.createContext(ctx);
  vm.runInContext(
    block +
      '\nthis.M = {INTRO, introAdd, introOffer, introReset, holdStep, setHold: h => (HOLDS = h), startOf, startV, startSet, startStep, startDue, startShown, startMerge, startResume: typeof startResume === "function" ? startResume : () => {}};',
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
  CHOICE.opts.forEach(o => assert.ok(o[1] && o[2] && typeof o[3].p === 'number' && typeof o[3].at === 'number', o[0]));
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

test('fallback verdict: at N, 2 N and 3 N answers; the first answers on each genus against the band, the global level for "higher"', () => {
  const N = CHOICE.N,
    {startBand, levelFit, startCheck} = C;
  assert.deepStrictEqual(startBand('new'), [-Infinity, (startVars('new').p + startVars('imr').p) / 2]);
  assert.deepStrictEqual(startBand('imr'), [(startVars('new').p + startVars('imr').p) / 2, (startVars('imr').p + startVars('know').p) / 2]);
  assert.deepStrictEqual(startBand('know'), [(startVars('imr').p + startVars('know').p) / 2, Infinity]);
  // The fitted level rises with the right answers and allows for the difficulty.
  const fit = (r, d) => levelFit(Array.from({length: 10}, (_, i) => [d, 0.25, i < r ? 1 : 0]))[0];
  assert.ok(fit(3, 0) < fit(6, 0) && fit(6, 0) < fit(9, 0));
  assert.ok(fit(6, 1) > fit(6, 0), 'the same answers on harder questions: a higher level');
  // w: [d, g, right, first]; a beginner who said "know well": first answers half wrong on average photos.
  const W = (n, okF, firstF = () => true) => Array.from({length: n}, (_, i) => [0, 0.25, okF(i) ? 1 : 0, firstF(i) ? 1 : 0]);
  const weak = W(N, i => i % 3 === 0);
  assert.strictEqual(startCheck(weak.slice(0, N - 1), 'know', 0.2, 6, 0), null, 'not between checkpoints');
  assert.strictEqual(startCheck(weak, 'know', 0.2, 6, 0), 'lo', 'clearly below the band');
  assert.strictEqual(startCheck(weak, 'new', -1, 6, 0), null, 'nothing below "new"... and no "higher" either');
  // Half right on first answers: not confidently below "know well" alone, below it with the opening hold fired.
  const half = W(N, i => i % 2 === 0);
  assert.strictEqual(startCheck(half, 'imr', 0.5, 6, 0), null);
  assert.strictEqual(startCheck(half, 'imr', 0.5, 6, 1), 'lo', 'the opening hold fired in the window');
  assert.strictEqual(startCheck(half, 'imr', 3, 6, 1), null, 'not with a global level clearly above the floor');
  // "Higher": only from 2 N answers, OFFER.MET genera met, the global level clearly above the band and the first answers too.
  const strong = W(
    2 * N,
    () => true,
    i => i % 3 === 0
  );
  assert.strictEqual(startCheck(strong.slice(0, N), 'new', 2.5, 12, 0), null, 'not at N');
  assert.strictEqual(startCheck(strong, 'new', 2.5, CHOICE.MET - 1, 0), null, 'not with too few genera met');
  assert.strictEqual(startCheck(strong, 'new', 2.5, CHOICE.MET, 0), 'hi');
  // A player right on the few genera they learned but not on their first answers: not "higher".
  const learnt = W(
    2 * N,
    i => i % 3 !== 0,
    i => i % 3 === 0
  );
  assert.strictEqual(startCheck(learnt, 'new', 2.5, CHOICE.MET, 0), null, 'first answers decide too');
  assert.strictEqual(startCheck(strong, 'new', 0.2, CHOICE.MET, 0), null, 'the global level decides too');
  assert.strictEqual(
    startCheck(
      W(3 * N + 1, () => true),
      'new',
      2.5,
      12,
      0
    ),
    null,
    'nothing after 3 N'
  );
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
  const N = CHOICE.N;
  // Consistent: "IMR course", three in four right on average photos, a level in the band.
  const B = model();
  B.startSet('imr', 'tour');
  B.play(
    3 * N,
    0,
    i => i % 4 !== 0,
    i => i % 2 === 0,
    0.5
  );
  assert.strictEqual(B.startOf().w.length, 3 * N);
  assert.strictEqual(B.startDue(), null, 'consistent: nothing');
  B.play(30, 0, false, true, -1.5);
  assert.strictEqual(B.startOf().w.length, 3 * N, 'the window stops at 3 N');
  assert.strictEqual(B.startDue(), null, 'answers after the window do not count');
  // Struggling after "I know corals well": lo at N, once.
  const L = model();
  L.startSet('know', 'tour');
  L.play(N - 1, 0, i => i % 4 === 0, true, 0.3);
  assert.strictEqual(L.startDue(), null, 'not before N answers');
  L.play(1, 0, false, true, 0.3);
  assert.strictEqual(L.startDue(), 'lo');
  L.startShown('lo');
  assert.strictEqual(L.startDue(), null, 'never twice');
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
  // Better than said: hi, from 2 N answers with OFFER.MET genera met (the record reads slateGenera and introduced).
  const H = model({slate: Array.from({length: 12}, (_, i) => 'G' + i)});
  H.introAdd(H.ctx.slateGenera(), true, 's');
  H.startSet('new', 'tour');
  H.play(N, 0.5, true, i => i % 2 === 0, 2.5);
  assert.strictEqual(H.startDue(), null, 'not at N');
  H.play(N, 0.5, true, i => i % 2 === 0, 2.5);
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
  U.play(2 * N, 0.5, true, i => i % 2 === 0, 2.5);
  assert.strictEqual(U.startDue(), null, 'and not back up after moving down');
  // Inferred (an existing player, never asked): never a card.
  const I = model({slate: Array.from({length: 12}, (_, i) => 'G' + i)});
  I.introAdd(I.ctx.slateGenera(), true, 's');
  I.startSet('new', 'inferred');
  I.play(2 * N, 0.5, true, true, 2.5);
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
    i = src.indexOf('const signOff = () => {'),
    list = src.slice(i, src.indexOf('].forEach', i));
  assert.ok(i > 0, 'signOff found');
  assert.match(list, /\bCHOICE\.KEY\b/);
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
  assert.strictEqual(ctx.H('Septa'), '#basics|septa');
  assert.strictEqual(ctx.H('Coenosteum'), '#basics|walls|separate');
  assert.strictEqual(ctx.H('Columella'), '#lab-anatomy|con|columella', 'an anatomy word: its Corallite anatomy card');
  assert.strictEqual(ctx.H('Paliform lobes'), '#lab-anatomy|con|pali');
  assert.strictEqual(ctx.H('Verrucae'), '#basics|words', 'a word with no step: the Words list');
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
  // The app's own steps on the same answers (model.js ability / abilityStep = core.js abilityOf / eloStep with p).
  const app = {},
    p = startVars('know').p,
    step = (g, ok, d) => {
      const s = (app[g] = app[g] || {ok: 0, ko: 0});
      s[ok ? 'ok' : 'ko']++;
      C.eloStep(app, g, s, ok, d, 4, p);
      if (app[C.LEVEL]) app[C.LEVEL][ok ? 'ok' : 'ko']++;
      else app[C.LEVEL] = C.levelSeed(app);
      C.eloStep(app, C.LEVEL, app[C.LEVEL], ok, d, 4, p);
    };
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
