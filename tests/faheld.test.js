'use strict';
require('./slot.js').testGuard();
// The false-alarm table held for one handler (app.js faHeld, core.js faArm): quiz.js answer, quizPhoto, planNext and
// progress.js achCheck read the bars from one table while they run, and none survives them. The table gives the scan's
// values to the last bit (tests/faof.test.js); here, that a handler arms it, keeps it through a handler inside it and
// through scoreAnswer, and drops it when it ends, a throw included, so a write to P outside a handler (a sync reply, a
// reset) is read as it is.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js'),
  block = require('./block.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const app = read('app.js'),
  quiz = read('quiz.js'),
  progress = read('progress.js');

// faHeld as app.js has it, on a P the test sets (ctx.P), with core.js's table.
function held() {
  const ctx = {faArm: C.faArm, faDisarm: C.faDisarm, P: null};
  vm.createContext(ctx);
  vm.runInContext(block(app, 'const FA_HELD = new Set();', '\n}\n', {through: 1, file: 'app.js'}) + 'this.faHeld = faHeld;', ctx);
  return ctx;
}
// A progress where B is given for A's photo once among two chances: B's false-alarm rate 1/2.
const prog = () => ({A: {ok: 1, ko: 1, off: {B: 2}, conf: {B: 1}}, B: {ok: 2, ko: 0}});
// A write outside scoreAnswer (what a sync merge does to P in place): B given once more for A's photo.
const edit = P => (P.A.conf.B = 2);

test('a handler reads one table, dropped when it ends', () => {
  const ctx = held(),
    P = (ctx.P = prog());
  assert.strictEqual(C.faOf(P, 'B'), 0.5);
  const r = ctx.faHeld(() => {
    assert.strictEqual(C.faOf(P, 'B'), 0.5); // the table built
    edit(P);
    // Still the table: the proof that it is armed (inside a handler, only scoreAnswer writes these fields).
    assert.strictEqual(C.faOf(P, 'B'), 0.5);
    return 'done';
  });
  assert.strictEqual(r, 'done', 'the handler returns what its body returns');
  assert.strictEqual(C.faOf(P, 'B'), 1, 'after the handler: the scan, the edit read');
});

test('a throw in the handler drops the table too', () => {
  const ctx = held(),
    P = (ctx.P = prog());
  assert.throws(
    () =>
      ctx.faHeld(() => {
        C.faOf(P, 'B');
        throw new Error('boom');
      }),
    /boom/
  );
  edit(P);
  assert.strictEqual(C.faOf(P, 'B'), 1);
});

test('a handler inside another keeps the outer table; a P loaded meanwhile is held by its own handler', () => {
  const ctx = held(),
    P = (ctx.P = prog()),
    P2 = prog();
  ctx.faHeld(() => {
    C.faOf(P, 'B');
    ctx.faHeld(() => C.faOf(P, 'B')); // achCheck after an answer
    edit(P);
    assert.strictEqual(C.faOf(P, 'B'), 0.5, 'the outer table survives the inner handler');
    // Another subject's progress for a moment (app.js inSubject), its own handler inside.
    ctx.P = P2;
    ctx.faHeld(() => {
      C.faOf(P2, 'B');
      edit(P2);
      assert.strictEqual(C.faOf(P2, 'B'), 0.5);
    });
    assert.strictEqual(C.faOf(P2, 'B'), 1, 'its table dropped with its handler');
    ctx.P = P;
    assert.strictEqual(C.faOf(P, 'B'), 0.5);
  });
  assert.strictEqual(C.faOf(P, 'B'), 1);
  assert.strictEqual(C.faOf(P2, 'B'), 1);
});

test('values: inside a handler, every read through answers scored is the scan to the last bit (FA_CHECK)', () => {
  const ctx = held(),
    P = (ctx.P = {}),
    U = ['Acropora', 'Montipora', 'Porites', 'Pocillopora', 'f:Damselfishes', 'f:Wrasses', 'f:Gobies'],
    r = (s => () => ((s = (s * 16807) % 2147483647), s / 2147483647))(4242),
    reads = [];
  C.FA_CHECK.on = true;
  try {
    for (let i = 0; i < 300; i++) {
      const fish = r() < 0.5,
        L = U.filter(n => n.startsWith('f:') === fish),
        t = L[Math.floor(r() * L.length)],
        typed = r() < 0.2,
        chs = typed ? [] : [t, ...L.filter(n => n !== t)].slice(0, 3),
        ok = r() < 0.6,
        c = ok ? t : typed ? '' : chs[1];
      // As answer does: bars read before and after the answer is scored, in one handler.
      ctx.faHeld(() => {
        U.forEach(n => reads.push(C.faOf(P, n)));
        C.scoreAnswer(P, {t, c, ok, k: typed ? Infinity : 3, chs, ph: [], cv: !!c, d0: 0, mu: 0, R: 1, Rc: 1, p: 0, timed: false});
        U.forEach(n => reads.push(C.faOf(P, n)));
      });
    }
  } finally {
    C.FA_CHECK.on = false;
  }
  assert.strictEqual(reads.length, 300 * 2 * U.length);
  assert.ok(
    reads.some(v => v > 0),
    'false alarms were read'
  );
});

test('answer, quizPhoto, planNext and achCheck run their whole body inside faHeld', () => {
  const whole = (src, head, file) => {
    const f = block(src, head, '\n}\n', {through: 1, file});
    assert.match(f, /^[^\n]*\{\n(?:\s*\/\/[^\n]*\n)*\s*return faHeld\(\(\) => \{\n/, `${file}: ${head} starts in faHeld`);
    assert.ok(f.endsWith('\n  });\n}\n'), `${file}: ${head} ends with faHeld's body`);
  };
  whole(quiz, 'function answer(cur, c, target, ph, cor, unseen, tm = {}, tap = null) {', 'quiz.js');
  whole(quiz, "function quizPhoto(cur = 'quiz') {", 'quiz.js');
  whole(quiz, 'function planNext(cur) {', 'quiz.js');
  whole(progress, 'function achCheck(silent) {', 'progress.js');
});
