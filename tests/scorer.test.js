// One scorer (Pierre, 2026-11-06, Q132; docs/reviews/2026-11-06-engine-coherence-review.md F1, F6; docs/LEARNING.md "One
// scorer"): quiz.js answer and the full replay of the answer log (core.js replayProgress: the sheet's, the admin's, this
// device's own) score an answer through core.js scoreAnswer, and every answer logs what the game scored it with (its
// scoring record sc: photo difficulty, memory, mix-ups, look-alike test, recalls, the hint revealed after it). So the
// replay of a recorded session gives exactly the state the game had, field by field, whatever pooled stats the replay
// holds (the device's stats moved during the session; the sheet's are others again).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const block = require('./block.js');
const C = require('../core.js');

const GEN = {
  A: {look: ['B'], fam: 'F1'},
  B: {look: ['A'], fam: 'F1'},
  C: {look: [], fam: 'F2'},
  D: {look: [], fam: 'F3'},
  E: {look: [], fam: 'F4'}
};
const G = Object.keys(GEN);
const quiz = fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8');
// quiz.js answer's own question, run from its source: what it hands scoreAnswer.
const QSRC = block(quiz, '  const q = scoreIn({', '\n  });\n', {through: true, file: 'quiz.js'});

// A recorded session: the game's side is quiz.js's question (QSRC) with the device's model.js inputs stubbed (photo
// ratings and memory offsets that change during the session, as the device's ?stats=1 cache does), scored by
// core.js scoreAnswer, logged as quiz.js answer logs it (e, th, sc).
function session(seed, n) {
  const r = (a => () => ((a = (a * 16807) % 2147483647), a / 2147483647))(seed),
    pick = L => L[Math.floor(r() * L.length)],
    // A shuffle that draws the same numbers on every engine (a random comparator does not: its calls depend on the sort).
    shuffle = L => {
      const a = L.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    P = {},
    log = [];
  let pdiff = {}, // the device's photo ratings, refreshed now and then
    pmem = [0, -0.4, -1, -1.6],
    pconf = {};
  const st = n => P[n] || (P[n] = {ok: 0, ko: 0, streak: 0});
  for (let i = 0; i < n; i++) {
    if (i % 25 === 0) {
      // A new ?stats=1 reply on the device: other photo ratings, memory offsets and pooled mix-ups.
      pdiff = Object.fromEntries(G.flatMap(g => [0, 1, 2, 3, 4].map(j => [g.toLowerCase() + j, Math.round((r() * 3 - 1.2) * 1e4) / 1e4])));
      pmem = [0, -0.2 - r() * 0.5, -0.8 - r() * 0.5, -1.3 - r() * 0.6];
      pconf = {'A|B': [20 + i, 3 + Math.floor(r() * 8)], 'C|D': [10, Math.floor(r() * 5)]};
    }
    const target = pick(G),
      typed = r() < 0.15,
      k4 = r() < 0.3 ? 2 : 4,
      others = shuffle(G.filter(x => x !== target)),
      choices = typed ? [] : [target, ...others.slice(0, k4 - 1)].sort(),
      th = C.abilityOf(P, target),
      good = r() < 0.6 + 0.1 * Math.tanh(th),
      c = good ? target : typed ? (r() < 0.4 ? '' : pick(others)) : pick(choices.filter(x => x !== target)),
      files = [0, 1, 2, 3, 4].map(j => target.toLowerCase() + j),
      ph = (r() < 0.3 ? [pick(files)] : [files[0], pick(files.slice(1))]).map(f => ({f, view: 'wide'})),
      // A corallites hint, opened or not: left closed, it is revealed after the answer (shown, never recognised).
      hint = r() < 0.5 ? {f: target.toLowerCase() + '-hint' + (i % 3), view: 'macro'} : null,
      opened = hint && r() < 0.5,
      phAll = hint ? [...ph, hint] : ph,
      unseen = hint && !opened ? hint : null,
      warm = r() < 0.3,
      SHOWNQ = warm ? {warm: true, cb: Math.round(r() * 1000) / 1000} : null,
      tm = {rt: r() < 0.9 ? Math.round((2 + r() * 12) * 10) / 10 : undefined},
      k = typed ? Infinity : k4;
    // model.js's inputs on the device now (stubbed): photo ratings, memory, mix-ups (pooled and the player's own),
    // look-alike test, recall.
    const pooled = (t, x) => C.confScore(pconf[t < x ? t + '|' + x : x + '|' + t], GEN[t].look.includes(x) ? C.CONF.LOOK : C.CONF.BASE);
    const env = {
      scoreIn: C.scoreIn,
      target,
      c,
      good,
      k,
      chs: choices,
      seenPh: phAll.filter(p => p !== unseen),
      unseen,
      ph: phAll,
      solo: phAll.length === 1 ? 0.5 : 0,
      warm,
      SHOWNQ,
      tm,
      GX: x => GEN[x],
      photoDiff: (t, p) => pdiff[p.f] || 0,
      famOf: (t, L) =>
        C.memFam(
          L.map(p => (st(t).ps || {})[p.f]),
          pmem
        ),
      confTerm: (t, L, kk) => (kk >= 3 ? Math.max(0, ...L.filter(x => x !== t).map(x => C.confGap(C.pairConf(P, t, x), pooled(t, x)))) : 0),
      pgLook: (t, L) =>
        L.some(x => x !== t && (pooled(t, x) >= C.CONF.TRAP || C.confScore(C.pairConf(P, t, x), pooled(t, x)) >= C.CONF.TRAP)),
      recallAt: () => Math.round((0.5 + r() * 0.5) * 1000) / 1000,
      startP: () => 0,
      rtOn: () => true
    };
    vm.createContext(env);
    st(target);
    const q = vm.runInContext(QSRC + '\nq;', env),
      res = C.scoreAnswer(P, q);
    log.push({
      id: 'a' + i,
      t: new Date(Date.UTC(2026, 10, 7) + i * 60e3).toISOString(),
      g: target,
      a: c,
      ok: good ? 1 : 0,
      m: 'quiz' + (warm ? '|c' : '') + (!typed && k4 < 4 ? '|k' + k4 : '') + (typed ? '|t' : ''),
      ph: env.seenPh.map(p => p.f).join(' '),
      ch: choices.join(' '),
      e: Math.round(100 * res.e) / 100,
      th: res.th0,
      nw: 0,
      ...(typeof tm.rt === 'number' ? {rt: tm.rt} : {}),
      sc: C.scoreLog(q, res)
    });
  }
  return {P, log};
}

// Every field the game keeps, the same in the replay; no genus more or less.
function same(R, P, why) {
  assert.deepStrictEqual(Object.keys(R).sort(), Object.keys(P).sort(), `${why}: the genera`);
  for (const g of Object.keys(P))
    for (const f of Object.keys(P[g]))
      assert.deepStrictEqual(R[g][f], P[g][f], `${why}: ${g}.${f} replayed ${JSON.stringify(R[g][f])}, game ${JSON.stringify(P[g][f])}`);
}

test('quiz.js answer scores through core.js scoreAnswer and logs its scoring record', () => {
  const ans = block(quiz, 'function answer(cur, c, target, ph, cor, unseen, tm = {}) {', '\n}\n', {file: 'quiz.js'});
  assert.ok(ans.includes('const res = scoreAnswer(P, q)'));
  assert.ok(ans.includes('sc: scoreLog(q, res)'));
  assert.ok(ans.includes('e: Math.round(100 * res.e) / 100'));
  // No second scorer: the steps are scoreAnswer's only.
  for (const x of ['eloStep(', 'abilityStep(', 'pgStep(', 'pgMissW(', 'pgMemW(', 'rtAdd(', 'levelSeed('])
    assert.ok(!ans.includes(x), `quiz.js answer calls ${x}`);
  const core = fs.readFileSync(path.join(__dirname, '..', 'core.js'), 'utf8'),
    rp = block(core, '  function replayProgress(rows, o = {}) {', '\n  }\n', {file: 'core.js'});
  assert.ok(rp.includes('scoreAnswer(pl.P, q)'));
  for (const x of ['eloStep(', 'pgStep(', 'pgMissW(', 'pgMemW(', 'rtAdd(', 'levelSeed('])
    assert.ok(!rp.includes(x), `replayProgress calls ${x}`);
});

test('a recorded session replays to the state the game had, field by field, whatever stats the replay holds', () => {
  for (const seed of [3, 11, 29]) {
    const {P, log} = session(seed, 160),
      rows = log.map(a => C.logRow(a, 'me'));
    // The session covers what the scorer takes: comebacks, hints left closed, typed answers, misses on a game genus and
    // "I don't know", 2-choice questions, photos seen again, the mix-ups term and the look-alike test both ways.
    const sc = log.map(a => a.sc);
    assert.ok(sc.some(x => x.r !== undefined) && sc.some(x => x.g !== undefined), 'recalls logged');
    assert.ok(sc.some(x => x.h) && sc.some(x => x.f) && sc.some(x => x.c) && sc.some(x => x.l) && sc.some(x => !x.l));
    assert.ok(log.some(a => /\|t/.test(a.m) && !a.a) && log.some(a => !a.ok && GEN[a.a]));
    // Other pooled stats than any the device held: the replay does not read them for a row with its scoring record.
    for (const o of [{}, {mem: [0, -1, -2, -3], conf: {'A|B': [500, 400]}}]) {
      same(C.replayProgress(rows, {gen: GEN, ...o}).me.P, P, `seed ${seed}, the whole log`);
      // The sheet's replay of the first answers, then this device's on top (sync.js replayAdopt).
      const head = C.replayProgress(rows.slice(0, 70), {gen: GEN, ...o});
      same(C.replayProgress(rows.slice(70), {gen: GEN, ...o, start: head}).me.P, P, `seed ${seed}, going on from a replay`);
    }
    // The sheet's rows carry the record as the cell's JSON (Code.gs rowOf_): the same.
    const cells = rows.map(x => x.map((v, i) => (i === C.LOG_SC && v ? JSON.stringify(v) : v)));
    same(C.replayProgress(cells, {gen: GEN}).me.P, P, `seed ${seed}, the sheet's cells`);
  }
});

test('scoreRec: the logged record, its defaults left out, broken values dropped', () => {
  assert.deepStrictEqual(C.scoreRec({d: 0.12345, f: 0, c: 0, l: 0, r: 1, g: 1}), {d: 0.123});
  assert.deepStrictEqual(C.scoreRec('{"d":-1,"f":-0.4,"c":0.2,"l":1,"r":0.75,"g":0.5,"h":"acropora-macro-1"}'), {
    d: -1,
    f: -0.4,
    c: 0.2,
    l: 1,
    r: 0.75,
    g: 0.5,
    h: 'acropora-macro-1'
  });
  for (const x of [null, '', 'x', '{bad', {}, {d: 'a'}, {d: Infinity}, {d: 99}, [1]])
    assert.strictEqual(C.scoreRec(x), null, JSON.stringify(x));
  assert.deepStrictEqual(C.scoreRec({d: 1, r: 3, g: -1, h: 'a b', f: NaN}), {d: 1});
  // The game scores with the values as they are logged (scoreIn rounds them first).
  const q = C.scoreIn({d0: 0.12345, fam: -0.33333, cf: 0.0004, R: 0.81234});
  assert.deepStrictEqual([q.d0, q.fam, q.cf, q.R, q.Rc], [0.123, -0.333, 0, 0.812, 1]);
});

test('a row logged before the scorer still replays by its logged e (the inversion), as before', () => {
  // The same answer, without its record: the difficulty recovered from e, the weights on the logged th.
  const {log} = session(5, 40),
    plain = log.map(a => {
      const x = {...a};
      delete x.sc;
      return x;
    }),
    R = C.replayProgress(
      plain.map(a => C.logRow(a, 'me')),
      {gen: GEN}
    ).me;
  assert.strictEqual(R.used, plain.filter(a => a.ph).length);
  assert.ok(Object.keys(R.P).every(g => R.P[g].ok + R.P[g].ko >= 0));
});
