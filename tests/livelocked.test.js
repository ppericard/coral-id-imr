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
    open = cut(src, 'const openOf = (S, full) => {', '// What My progress offers to open', {file: 'app.js'});
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
      fishC3: () => true,
      openState: C.openState,
      Q: {},
      opensNow: () => [{k: 'c3', units: () => c3, due: () => true}]
    };
  ctx.answersSoFar = () => ctx.n;
  vm.createContext(ctx);
  vm.runInContext(
    model + gate + open + '\nthis.M = {INTRO, introMap, introAdd, introLive, asked, askedOpen, introduced, treeGate, openOf, openShut};',
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
