require('./slot.js').testGuard();
// A unit answered before its card (a live game's answers on a unit the path has not opened, rule L4: model.js introLive;
// or the answers before a card that reopens a unit One at a time closed): the readers that wait for a card's own
// question read model.js askedOpen (an answer at or after the card), not asked (any answer). openPace, openDue and
// introReady are in tests/pace.test.js; here the app's own: the fish circle 2's gate (app.js treeGate), the parts opened
// by choice (app.js openOf: a closed mark opens no part), and the other "every unit asked" readers (the bonus offer,
// the all-met card). model.js's and app.js's own code run in Node on stubs.
const test = require('node:test');
const cut = require('./block.js');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let CLOCK = 1.8e12;
// model.js's cards (INTRO, introAdd, introLive, askedOpen...) with app.js's treeGate, openOf and openShut on them. c1: the
// fish circle 1; c2: a circle-2 family; c3: the circle-3 part, opened by choice (UNITS opens), its key 'c3'.
function app({P = {}, c1 = ['A', 'B'], c2 = ['M'], c3 = ['X', 'Y']} = {}) {
  const model = cut(read('model.js'), '// First meeting with a genus (Pierre', '// Comeback after a break (Pierre', {file: 'model.js'}),
    src = read('app.js'),
    gate = cut(src, 'const treeGate = n => {', '\n};\n', {through: 1, file: 'app.js'}),
    open = cut(src, 'const openOf = (S, full) => {', '// ⚙ Bonus genera On / Off', {file: 'app.js'});
  const saved = {},
    circle = Object.fromEntries([...c1.map(n => [n, 1]), ...c2.map(n => [n, 2]), ...c3.map(n => [n, 3])]),
    ctx = {
      ...require('./subj.stub.js')(),
      P,
      LEVEL: '~level',
      CB: {},
      COMEBACK: {KEY: 'reefid-comeback'},
      n: 0,
      Date: {now: () => (CLOCK += 1000)},
      slateGenera: () => [...c1, ...c2, ...c3],
      syncSoon: () => {},
      ...(({CHOICE, startOpt, startVars, startCheck, startNext, startInfer}) => ({
        CHOICE,
        startOpt,
        startVars,
        startCheck,
        startNext,
        startInfer
      }))(C),
      basicsDone: () => false,
      document: {querySelectorAll: () => []},
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))},
      GX: n => (n in circle ? {circle: circle[n]} : null),
      TREEU: {c1},
      treeC3: () => true,
      openState: C.openState,
      Q: {},
      opensNow: () => [{k: 'c3', units: () => c3, due: () => true}],
      bonusSet: (on, k) => (ctx.Q[k] = !!on) // app.js bonusSet, as openNo calls it
    };
  ctx.answersSoFar = () => ctx.n;
  ctx.cbSave = () => {}; // the answer clock's record (model.js tally) kept in CB only
  vm.createContext(ctx);
  vm.runInContext(
    model +
      require('./clock.js')() +
      gate +
      open +
      '\nthis.M = {INTRO, introMap, introAdd, introLive, asked, askedOpen, introduced, treeGate, openOf, openShut, openOfferDue, openNo, tally, clockSync};',
    ctx
  );
  return Object.assign(ctx.M, {ctx});
}

test('fish circle 2: every circle-1 family asked since its card, not only answered before it in a live game', () => {
  const P = {},
    M = app({P});
  // A, B answered in a live game before the path opened them: closed, circle 2 shut.
  M.introLive('A');
  M.introLive('B');
  P.A = {ok: 2, ko: 0, at: CLOCK};
  P.B = {ok: 1, ko: 1, at: CLOCK};
  assert.ok(M.asked('A') && !M.introduced('A') && !M.treeGate('M'));
  // Their cards (the first cards): met, but their questions are still to come, so circle 2 waits for them.
  M.introAdd(['A', 'B'], true);
  assert.ok(M.introduced('A') && M.introduced('B'));
  assert.strictEqual(M.treeGate('M'), false, 'circle 2 waits for the cards’ questions');
  P.A.at = CLOCK + 1;
  assert.strictEqual(M.treeGate('M'), false, 'B still to be asked');
  P.B.at = CLOCK + 1;
  assert.strictEqual(M.treeGate('M'), true);
  assert.strictEqual(M.treeGate('A'), true, 'circle 1 always');
});

test('a part opened by choice: a closed mark (a live answer on one of its units) opens nothing; a card does', () => {
  const P = {},
    M = app({P});
  assert.ok(M.openShut('X') && !M.openOf({k: 'c3', units: () => ['X', 'Y']}).on);
  // X answered in a live game: its closed mark is in the cards' map, the part stays shut (never asked: openState's met).
  M.introLive('X');
  P.X = {ok: 0, ko: 1, at: CLOCK};
  assert.strictEqual(M.openShut('X'), true, 'a live answer never opens the part (rule L4)');
  assert.strictEqual(M.openShut('Y'), true);
  // A unit of it once opened on a card (an older record, the part never asked): on, as before.
  M.introAdd(['Y'], false);
  assert.strictEqual(M.openShut('X'), false);
});

// A part's "Not now" on the answer clock (model.js tally; rule D9, docs/reviews/2026-11-09-level-count-checkpoints.md):
// the offer comes back once, OPEN_AGAIN answers after it, whatever the level's count does meanwhile.
test('a part opened by choice: a count that goes down after "Not now" never delays the second ask', () => {
  const M = app();
  M.ctx.n = 300;
  assert.strictEqual((M.openOfferDue() || {}).k, 'c3', 'the card at its gate');
  M.openNo('c3');
  assert.strictEqual(M.openOfferDue(), null, 'not asked again at once');
  M.ctx.n = 250; // the log's count adopted, 50 answers counted twice dropped
  M.tally(); // sync.js clockTick, right after the adoption
  M.ctx.n = 449;
  assert.strictEqual(M.openOfferDue(), null, '199 answers since the "Not now"');
  M.ctx.n = 450;
  assert.strictEqual((M.openOfferDue() || {}).k, 'c3', '200 answers since the "Not now": asked once more');
  M.openNo('c3');
  M.ctx.n = 5000;
  assert.strictEqual(M.openOfferDue(), null, 'then never');
});

test('a part opened by choice: a "Not now" synced from a device whose clock is ahead', () => {
  // The other device said "Not now" at its clock 400; this one's count is the log's 100 (sync.js mergeSubject brings the
  // choice in with its mark, then clockSeen).
  const said = {c3: false, c3T: 1, c3N: 1, c3A: 400},
    M = app();
  M.ctx.n = 100;
  assert.strictEqual(M.tally(), 100);
  Object.assign(M.ctx.Q, said);
  assert.strictEqual(M.clockSync(), 400, 'the clock moves up to the mark');
  M.ctx.n = 299;
  assert.strictEqual(M.openOfferDue(), null, '199 answers since');
  M.ctx.n = 300;
  assert.strictEqual((M.openOfferDue() || {}).k, 'c3', 'asked once more 200 answers after it, not 500');
  // A clock that starts after the mark came in (a new device, a sign-in) starts at it.
  const N = app();
  Object.assign(N.ctx.Q, said);
  N.ctx.n = 100;
  assert.strictEqual(N.tally(), 400, 'a new clock starts at the mark');
});

// Live answers on units not opened count: a coral rules version (rule D5), with no card (rule D6).
test('a rules version for the live answers on units not opened, with no card', () => {
  const e = C.RVS.find(x => /Live answers on units not opened count/.test(x.why));
  assert.ok(e && e.v === 12 && e.msg === null);
});

// The other readers of "every unit met and asked" take the same predicate: the bonus genera's offer (app.js UNITS
// corals sets due) and the all-met card (quiz.js allMetDue), as treeGate above.
test("every reader of 'met and asked' reads askedOpen", () => {
  const app = read('app.js'),
    quiz = read('quiz.js');
  assert.match(app, /due: \(\) => slateGenera\(\)\.every\(n => askedOpen\(n\) && introduced\(n\)\)/);
  assert.match(quiz, /allMetNone\(pool\(\), introduced, askedOpen, mayOpen\)/);
  for (const [f, s] of [
    ['app.js', app],
    ['quiz.js', quiz]
  ])
    assert.doesNotMatch(s, /[^.\w]asked\(\w+\) && introduced\(/, `${f}: a card's question read from any answer`);
});
