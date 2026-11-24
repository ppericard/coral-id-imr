'use strict';
require('./slot.js').testGuard();
// The false-alarm counters' life (core.js faOf, faDrop; docs/LEARNING.md "Long runs: the false-alarm counters"): they
// live with the object P in memory, made at its first read, kept by scoreAnswer across answers and handlers, dropped
// only by a writer that refills P in place (sync.js, after an adopted replay or a merge), and never written into P, so
// nothing more is saved, sent or merged. Their values are the scan's to the last bit (tests/faof.test.js); here, when
// they are made, kept and dropped, and that the app holds no table of its own any more (app.js faHeld is gone).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const C = require('../core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

// A progress where B is given for A's photo once among two chances: B's false-alarm rate 1/2.
const prog = () => ({A: {ok: 1, ko: 1, off: {B: 2}, conf: {B: 1}}, B: {ok: 2, ko: 0}});
// A write outside scoreAnswer (what a sync merge does to P in place): B given once more for A's photo.
const edit = P => (P.A.conf.B = 2);
const miss = (t, c, chs) => ({t, c, ok: false, k: chs.length, chs, ph: [], cv: true, d0: 0, mu: 0});

test('made at the first read, kept through answers, dropped by faDrop: an edit by hand is read only after the drop', () => {
  const P = prog();
  assert.strictEqual(C.faOf(P, 'B'), 0.5);
  edit(P);
  assert.strictEqual(C.faOf(P, 'B'), 0.5, 'kept: the edit is not read (the proof that the counters are)');
  // Answers keep them: A mixed up with B once more among A, B (B offered once more): (1 + 1) / (2 + 1).
  C.scoreAnswer(P, miss('A', 'B', ['A', 'B']));
  assert.strictEqual(C.faOf(P, 'B'), 2 / 3, 'the answer counted on the kept counters');
  C.faDrop(P);
  assert.strictEqual(C.faOf(P, 'B'), 1, 'dropped: counted again from the records, the edit read');
});

test('every P its own counters: another object (a load, a reset, another subject) is counted from its records', () => {
  const P = prog(),
    P2 = prog();
  C.faOf(P, 'B');
  edit(P2);
  assert.strictEqual(C.faOf(P2, 'B'), 1, 'another P: its own records');
  assert.strictEqual(C.faOf(P, 'B'), 0.5, 'the first P untouched');
  C.scoreAnswer(P2, miss('A', 'B', ['A', 'B']));
  assert.strictEqual(C.faOf(P, 'B'), 0.5);
  assert.strictEqual(C.faOf(P2, 'B'), 1);
  assert.strictEqual(C.faOf(JSON.parse(JSON.stringify(P)), 'B'), 0.5, 'a copy loaded');
});

test('nothing is written into P: the saved text is the same with the counters read as without', () => {
  const play = reads => {
    const P = {},
      U = ['A', 'B', 'C', 'D'],
      r = (s => () => ((s = (s * 16807) % 2147483647), s / 2147483647))(77);
    for (let i = 0; i < 200; i++) {
      const t = U[Math.floor(r() * 4)],
        chs = [t, ...U.filter(n => n !== t).slice(0, 2)],
        ok = r() < 0.6;
      if (reads) U.forEach(n => C.faOf(P, n));
      C.scoreAnswer(P, {t, c: ok ? t : chs[1], ok, k: 3, chs, ph: [], cv: !ok, d0: 0, mu: 0});
      if (reads) U.forEach(n => C.faOf(P, n));
    }
    return P;
  };
  const a = play(false),
    b = play(true);
  assert.strictEqual(JSON.stringify(b), JSON.stringify(a));
  assert.ok(
    Object.values(b).every(s => Object.keys(s).every(k => !/^fa|^op$/.test(k))),
    'no field of the counters on a record'
  );
});

test('sync.js drops them at each refill of P in place; the app holds no false-alarm table of its own', () => {
  const sync = read('sync.js'),
    refills = sync.split('Object.assign(P, M);').length - 1;
  assert.ok(refills >= 2, 'the two refills found (an adopted replay, a merge)');
  assert.strictEqual(sync.split(/Object\.assign\(P, M\);\n\s*faDrop\(P\);/).length - 1, refills, 'each refill followed by faDrop(P)');
  for (const f of ['app.js', 'quiz.js', 'progress.js', 'model.js', 'sync.js', 'core.js'])
    assert.ok(!/\bfa(Held|Arm|Disarm)\b/.test(read(f)), `${f}: no table held by hand (faHeld, faArm, faDisarm)`);
});

test('values: every read through answers scored is the scan to the last bit (FA_CHECK)', () => {
  const P = {},
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
      // As answer does: bars read before and after the answer is scored.
      U.forEach(n => reads.push(C.faOf(P, n)));
      C.scoreAnswer(P, {t, c, ok, k: typed ? Infinity : 3, chs, ph: [], cv: !!c, d0: 0, mu: 0, R: 1, Rc: 1, p: 0, timed: false});
      U.forEach(n => reads.push(C.faOf(P, n)));
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
