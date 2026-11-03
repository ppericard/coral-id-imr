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
      '\nthis.M = {INTRO, introAdd, introOffer, introReset, holdStep, startOf, startV, startSet, startStep, startDue, startShown, startMerge, startResume: typeof startResume === "function" ? startResume : () => {}};',
    ctx
  );
  const M = ctx.M;
  M.ctx = ctx;
  M.saved = saved;
  // n answers at expectation e, right or not (quiz.js answer -> holdStep -> startStep).
  M.play = (k, e, ok) => {
    for (let i = 0; i < k; i++) {
      ctx.n++;
      M.holdStep(e, ok);
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

test('fallback verdict: nothing before CHOICE.N answers, lo / hi beyond the thresholds, nothing in between', () => {
  const N = CHOICE.N;
  assert.strictEqual(startCheck(N - 1, -N), null, 'not before N answers');
  assert.strictEqual(startCheck(N, 0), null, 'as expected');
  assert.strictEqual(startCheck(N, -(CHOICE.LO + 0.01) * N), 'lo');
  assert.strictEqual(startCheck(N, -(CHOICE.LO - 0.01) * N), null);
  assert.strictEqual(startCheck(N, (CHOICE.HI + 0.01) * N), 'hi');
  assert.strictEqual(startCheck(N, (CHOICE.HI - 0.01) * N), null);
  assert.deepStrictEqual(startNext('know', 'lo'), ['imr', 'new'], 'lower answers, nearest first');
  assert.deepStrictEqual(startNext('new', 'hi'), ['imr', 'know']);
  assert.deepStrictEqual(startNext('new', 'lo'), []);
  assert.deepStrictEqual(startNext('know', 'hi'), []);
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
  // Consistent: the answers meet the expectation.
  const B = model();
  B.startSet('imr', 'tour');
  for (let i = 0; i < CHOICE.N; i++) {
    B.ctx.n++;
    B.holdStep(0.75, i % 4 !== 0); // 75% right where 0.75 was expected
  }
  assert.strictEqual(B.startOf().n, CHOICE.N);
  assert.strictEqual(B.startDue(), null, 'consistent: nothing');
  B.play(30, 0.9, false);
  assert.strictEqual(B.startOf().n, CHOICE.N, 'the window stops at N');
  assert.strictEqual(B.startDue(), null, 'answers after the window do not count');
  // Struggling after "I know corals well": lo, once.
  const L = model();
  L.startSet('know', 'tour');
  L.play(CHOICE.N - 1, 0.85, false);
  assert.strictEqual(L.startDue(), null, 'not before N answers');
  L.play(1, 0.85, false);
  assert.strictEqual(L.startDue(), 'lo');
  L.startShown('lo');
  assert.strictEqual(L.startDue(), null, 'never twice');
  // Changing the answer starts a new window: a new inconsistency, told once more; never twice about the same answer.
  L.startSet('imr', 'fallback');
  assert.strictEqual(L.startOf().n, 0);
  L.play(CHOICE.N, 0.85, false);
  assert.strictEqual(L.startDue(), 'lo', 'still too hard after "IMR course": once more');
  L.startShown('lo');
  assert.strictEqual(L.startDue(), null);
  L.startSet('know', 'fallback');
  L.play(CHOICE.N, 0.85, false);
  assert.strictEqual(L.startDue(), null, '"I know corals well" was told already');
  // Better than said: hi.
  const H = model();
  H.startSet('new', 'tour');
  H.play(CHOICE.N, 0.7, true);
  assert.strictEqual(H.startDue(), 'hi');
  // Inferred (an existing player, never asked): never a card.
  const I = model();
  I.startSet('new', 'inferred');
  I.play(CHOICE.N, 0.6, true);
  assert.strictEqual(I.startDue(), null, 'inferred: no card');
  // Nothing to offer: no card ("I know corals well" and easier; "new", struggling, Coral basics done).
  const K = model();
  K.startSet('know', 'card');
  K.play(CHOICE.N, 0.6, true);
  assert.strictEqual(K.startDue(), null, 'no higher answer');
  const D = model({basics: true});
  D.startSet('new', 'card');
  D.play(CHOICE.N, 0.9, false);
  assert.strictEqual(D.startDue(), null, 'new, basics done: nothing to suggest');
  const E = model({basics: false});
  E.startSet('new', 'card');
  E.play(CHOICE.N, 0.9, false);
  assert.strictEqual(E.startDue(), 'lo', 'new, basics not done: Coral basics');
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
  assert.strictEqual(r.n, 0);
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
