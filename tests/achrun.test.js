// Runs of right answers and Sharp eye only in the normal photo quiz (Pierre, 2026-11-05, Q82: "only in the normal Quiz"):
// progress.js achAfter run in Node on stubs, as tests/pulse.test.js runs quiz.js. An answer in the custom quiz or the Duel
// tab neither extends nor breaks the run and sets no hard photo; the photo quiz counts (its slipped-in duels are asked
// with cur 'quiz'); the corallites feat counts everywhere; nothing is taken back.
const test = require('node:test');
const assert = require('node:assert');
const cut = require('./block.js');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');

const CUSTOM_H = 'quiz-custom|play',
  NEUTRAL = [CUSTOM_H, 'quiz-duel', 'quiz-duel|Acropora|Montipora']; // the custom quiz, the Duel tab (any pair)
const HARD = {f: 'hard.webp', view: 'colony'}, // at most half of 5+ answers right (PSTAT [elo, n, ok])
  EASY = {f: 'easy.webp', view: 'colony'},
  MACRO = {f: 'macro.webp', view: 'macro'};

function progress(saved = {}) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'progress.js'), 'utf8'),
    block = cut(src, '// After each answer (quiz.js answer; cur,', '\n}\n', {through: 1, file: 'progress.js'});
  const ctx = {
    CUSTOM_H,
    SUBJ: {ach: true},
    PSTAT: {'hard.webp': [0, 10, 3], 'easy.webp': [0, 10, 9]},
    ACHK: 'reefid-sync-ach',
    checks: 0,
    store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))}
  };
  ctx.achCheck = () => ctx.checks++;
  vm.createContext(ctx);
  vm.runInContext(block + '\nthis.T = {achAfter, achRunIn};', ctx);
  const rec = () => ctx.store.get(ctx.ACHK, {});
  return {...ctx.T, ctx, rec};
}

test('the run and Sharp eye: earned in the photo quiz', () => {
  const T = progress();
  for (let i = 0; i < 3; i++) T.achAfter(true, [EASY], 'quiz');
  assert.strictEqual(T.rec()._run, 3, 'three right extend the run');
  assert.strictEqual(T.rec()._best, 3);
  T.achAfter(true, [HARD], 'quiz');
  assert.strictEqual(T.rec()._hard, 1, 'a hard photo alone, right, is Sharp eye');
  T.achAfter(false, [EASY], 'quiz');
  assert.strictEqual(T.rec()._run, 0, 'a miss breaks the run');
  assert.strictEqual(T.rec()._best, 4, 'the best run stays');
});

test('the custom quiz and the Duel tab: an answer neither extends nor breaks the run, and earns no Sharp eye', () => {
  for (const cur of NEUTRAL) {
    const T = progress({'reefid-sync-ach': '{}'}); // a record already there: no start-up recap check
    for (let i = 0; i < 7; i++) T.achAfter(true, [EASY], 'quiz');
    T.achAfter(true, [EASY], cur);
    T.achAfter(true, [HARD], cur);
    assert.strictEqual(T.rec()._run, 7, `${cur}: right answers do not extend the run`);
    assert.strictEqual(T.rec()._best, 7);
    assert.ok(!T.rec()._hard, `${cur}: a hard photo right is not Sharp eye`);
    T.achAfter(false, [EASY], cur);
    assert.strictEqual(T.rec()._run, 7, `${cur}: a miss does not break the run`);
    // Back in the Quiz, the run goes on where it was.
    for (let i = 0; i < 3; i++) T.achAfter(true, [EASY], 'quiz');
    assert.strictEqual(T.rec()._run, 10);
    assert.strictEqual(T.rec()._best, 10, `On a roll (10) reached across a visit to ${cur}`);
    // Every answer still runs the check (other achievements: met, progress, duels…).
    assert.strictEqual(T.ctx.checks, 7 + 3 + 3, 'one check per answer');
  }
});

test('the custom quiz and the Duel tab: other feats as before, and nothing already earned is taken back', () => {
  for (const cur of NEUTRAL) {
    const T = progress({'reefid-sync-ach': JSON.stringify({run25: 1, hard: 2, _run: 4, _best: 30, _hard: 1})});
    T.achAfter(true, [MACRO], cur);
    assert.strictEqual(T.rec()._cor, 1, `${cur}: the corallites feat counts`);
    T.achAfter(false, [EASY], cur);
    const A = T.rec();
    assert.deepStrictEqual([A._run, A._best, A._hard, A.run25, A.hard], [4, 30, 1, 1, 2], `${cur}: record kept as it was`);
  }
});

test('achRunIn: the photo quiz only; quiz.js passes the game to achAfter, a slipped-in duel as the quiz', () => {
  const T = progress();
  assert.strictEqual(T.achRunIn('quiz'), true);
  for (const cur of NEUTRAL) assert.strictEqual(T.achRunIn(cur), false, cur);
  const quiz = fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8');
  assert.match(quiz, /const CUSTOM_H = 'quiz-custom\|play';/, 'the custom quiz hash this test stubs');
  assert.match(quiz, /achAfter\(\s*good,\s*ph\.filter\(p => p !== unseen\),\s*cur\s*\)/, 'answer() passes cur');
  // planPhoto's duel slipped into the photo quiz is asked under the quiz's own cur (so it counts as a Quiz answer).
  assert.match(quiz, /\[cur, t, shuffle\(pair\.slice\(\)\), `Look-alikes: /, 'a slipped-in duel keeps cur');
});
