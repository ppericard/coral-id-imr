'use strict';
require('./slot.js').testGuard();
// @slow: the false-alarm counters checked bit for bit against the scan on rated-world runs of every subject
// The false-alarm counters (core.js faOf, faTable, faAdd, faDrop; docs/LEARNING.md "Long runs: the false-alarm
// counters"): a speed-up only. faOf reads a unit's false alarms and offers from two integers kept beside P, made in one
// pass over the records at P's first read and kept by scoreAnswer at each count it adds, and must give exactly what the
// scan gave: the same number to the last bit (Object.is). Checked on logs made up here, cut by every kind of writer that
// replaces or refills P (a load, a merge or an adopted replay refilled in place, a reset), on odd records, and after
// every answer of rated-world runs of the fish, the corals and the sea slugs. The reference is a copy of the scanning
// faOf, kept here as it was; "rebuilt" is a fresh copy of P counted from its records.
const test = require('node:test'),
  assert = require('node:assert');
const C = require('../core.js'),
  RW = require('../tools/ratedworld.js'),
  LP = require('../tools/learnprof.js'),
  seaslugU = require('./seaslugunits.js');

// The scanning faOf (before the counters), verbatim but for LEVEL and rankKey written out.
const LEVEL = '~level';
const rankKey = n => (/^([a-z]+):/.exec(String(n || '')) || [])[1] || '';
function faOfRef(P, n) {
  if (!P || !n) return 0;
  let fa = 0,
    op = Math.max(0, (((P[LEVEL] || {}).tyk || {})[rankKey(n)] || 0) - ((P[n] || {}).ty || 0));
  for (const t in P) {
    if (t === n || t === LEVEL || !P[t]) continue;
    fa += (P[t].conf || {})[n] || 0;
    op += (P[t].off || {})[n] || 0;
  }
  return op > 0 ? Math.min(1, fa / op) : 0;
}

const rng = seed => () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
const copy = P => JSON.parse(JSON.stringify(P));
// Units of every rank the engine names: coral genera (no prefix), fish families f:, scientific genera g:, species s:.
const RANKS = {
  '': ['Acropora', 'Montipora', 'Porites', 'Pocillopora', 'Favites', 'Goniastrea', 'Millepora'],
  f: ['f:Damselfishes', 'f:Angelfishes', 'f:Wrasses', 'f:Gobies', 'f:Butterflyfishes'],
  g: ['g:Chromis', 'g:Pomacentrus', 'g:Halichoeres', 'g:Chaetodon'],
  s: ['s:s001', 's:s002', 's:s003', 's:s004', 's:s005', 's:s006']
};
const ALL = Object.values(RANKS).flat();
// Ids no record holds, or that only the unit itself names: the counters must give the scan's 0 for them too.
const ASK = [...ALL, 'Seriatopora', 'f:Groupers', 'g:none', 's:s999'];
const KS = [2, 3, 4, Infinity];
// One answer as quiz.js hands it to scoreAnswer: on t, among k choices of its rank (typed: none), right or not; a wrong
// answer names another unit of the rank, or nothing ("I don't know", typed only), or now and then t itself (a log row
// whose answer is the unit shown: its own mix-up, which the scan never reads).
function answer(r, rk) {
  const L = RANKS[rk],
    t = L[Math.floor(r() * L.length)],
    k = KS[Math.floor(r() * KS.length)],
    others = L.filter(x => x !== t).sort(() => r() - 0.5),
    chs = isFinite(k) ? [t, ...others.slice(0, k - 1)] : [],
    ok = r() < 0.6,
    c = ok ? t : r() < 0.05 ? t : !isFinite(k) && r() < 0.3 ? '' : isFinite(k) ? chs[1 + Math.floor(r() * (chs.length - 1))] : others[0];
  return {t, c, ok, k, chs, ph: [], cv: !!c && c !== t, d0: r() * 2 - 1, mu: 0, R: 1, Rc: 1, p: 0, timed: false, dom: true};
}
// The answer as the app logs it (quiz.js answer), for a replay: mode |t for a typed one.
const logged = (q, i) => ({
  id: 'a' + i,
  t: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString(),
  g: q.t,
  a: q.c,
  ok: q.ok,
  m: isFinite(q.k) ? 'quiz' : 'quiz|t',
  ph: 'p' + (i % 7) + '.jpg',
  ch: q.chs.join(' '),
  // scored by the game (its scoring record), so the replay scores it on the bar and reads the rates at each miss
  sc: {d: q.d0, m: 0, n: 0}
});
// Every id asked: kept against the reference, and against a copy of P counted afresh (rebuilt).
function same(P, label, ids = ASK) {
  const Q = copy(P);
  for (const n of ids) {
    const a = C.faOf(P, n),
      b = faOfRef(P, n),
      c = C.faOf(Q, n);
    assert.ok(Object.is(a, b) && Object.is(c, b), `${label}: faOf(${n}) kept ${a}, rebuilt ${c}, the scan ${b}`);
  }
}
// P refilled in place with M, as sync.js replayAdoptS and mergeSubject do, the counters dropped as they drop them.
const refill = (P, M) => {
  Object.keys(P).forEach(g => delete P[g]);
  Object.assign(P, M);
  C.faDrop(P);
};

test('kept by the scorer through made-up logs cut by loads, merges and replays refilled in place, and resets', t => {
  const cuts = {load: 0, merge: 0, adopt: 0, reset: 0};
  let reads = 0,
    above = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const r = rng(seed * 7919),
      rks = Object.keys(RANKS),
      other = {}; // another device's copy of the account, played on its own
    let P = {},
      log = [];
    for (let i = 0; i < 300; i++) {
      const q = answer(r, rks[Math.floor(r() * rks.length)]);
      C.scoreAnswer(P, q);
      log.push(logged(q, i));
      if (r() < 0.3) C.scoreAnswer(other, answer(r, rks[Math.floor(r() * rks.length)]));
      same(P, `seed ${seed}, answer ${i + 1}`);
      reads += ASK.length;
      above += ASK.filter(n => C.faOf(P, n) > 0).length;
      const x = r();
      if (x < 0.02)
        ((P = copy(P)), cuts.load++); // a load or a subject switch: another object
      else if (x < 0.04)
        (refill(P, C.mergeProgress({}, P, copy(other))), cuts.merge++); // another device's copy merged
      else if (x < 0.06) {
        // The sheet's replay of the log adopted (sync.js replayAdoptS): replayedOf of replayProgress, refilled in place.
        const rep = C.replayProgress(
          log.map(a => C.logRow(a, 'p')),
          {gen: {}}
        ).p;
        refill(P, C.replayedOf(rep, P, C.RV));
        cuts.adopt++;
      } else if (x < 0.07) ((P = {}), (log = []), cuts.reset++);
    }
  }
  t.diagnostic(`${reads} reads (${above} above 0); cuts ${JSON.stringify(cuts)}`);
  assert.ok(
    Object.values(cuts).every(n => n > 3),
    'every kind of cut met'
  );
  assert.ok(above > reads / 10, 'false alarms read');
});

test('the replay of a log keeps its counters as it scores: equal to the counters rebuilt and to the scan', () => {
  const r = rng(99),
    rks = Object.keys(RANKS),
    log = [];
  for (let i = 0; i < 600; i++) log.push(logged(answer(r, rks[Math.floor(r() * rks.length)]), i));
  // gen names every unit, so a miss counts against the unit given too (keepsMark reads faOf in the replay).
  const gen = Object.fromEntries(ALL.map(n => [n, {}])),
    rep = C.replayProgress(
      log.map(a => C.logRow(a, 'p')),
      {gen}
    ).p;
  same(rep.P, 'replayed');
  // The same answers scored one by one on a P of the app: the same records, so the same rates.
  const Q = {};
  log.forEach(a =>
    C.scoreAnswer(Q, {
      t: a.g,
      c: a.a,
      ok: a.ok,
      k: a.m === 'quiz' ? 4 : Infinity,
      chs: a.ch.split(' ').filter(Boolean),
      ph: [],
      cv: !a.ok && !!a.a && a.a !== a.g
    })
  );
  for (const n of ASK) assert.ok(Object.is(C.faOf(Q, n), C.faOf(rep.P, n)), `${n}: played ${C.faOf(Q, n)}, replayed ${C.faOf(rep.P, n)}`);
});

test('non-integer counts: scanned, the same numbers in the same order as before', () => {
  const r = rng(424242);
  for (let run = 0; run < 40; run++) {
    const P = {[LEVEL]: {ok: 0, ko: 0, tyk: {'': r() * 7, f: 3.3, s: 0.1}}};
    ALL.forEach(t => {
      if (r() < 0.2) return;
      const s = (P[t] = {ok: 1, ko: 0});
      if (r() < 0.4) s.ty = r() < 0.5 ? 1 : 0.7;
      for (const f of ['conf', 'off']) {
        if (r() < 0.2) continue;
        s[f] = {};
        ALL.forEach(x => r() < 0.5 && (s[f][x] = [0.1, 0.2, 0.3, 1e-17, 3, 1 / 3, -0.5, NaN, 0, -0][Math.floor(r() * 10)]));
      }
    });
    for (const n of ASK) assert.ok(Object.is(C.faOf(P, n), faOfRef(P, n)), `run ${run}: ${n}`);
    // And the scorer on it: its counts added to a record the counters cannot sum, still the scan.
    C.scoreAnswer(P, answer(r, ''));
    for (const n of ASK) assert.ok(Object.is(C.faOf(P, n), faOfRef(P, n)), `run ${run}, scored: ${n}`);
  }
  // Typed chances that are not an integer, the counts integers: that unit scanned, the others counted.
  const P = {A: {ok: 1, ko: 0, off: {B: 3}, conf: {B: 1}}, B: {ok: 1, ko: 0, ty: 0.5}, [LEVEL]: {ok: 2, ko: 0, tyk: {'': 2}}};
  for (const n of ['A', 'B']) assert.ok(Object.is(C.faOf(P, n), faOfRef(P, n)), n);
});

test('records edited by hand: kept until dropped (faDrop), then counted from the records as they are', () => {
  const P = {
    B: {ok: 5, ko: 0},
    A: {ok: 6, ko: 2, off: {B: 6, C: 2}, conf: {B: 2}},
    C: {ok: 3, ko: 1, off: {B: 2}, conf: {}},
    [LEVEL]: {ok: 20, ko: 3, tyk: {'': 4}}
  };
  assert.strictEqual(C.faOf(P, 'B'), 2 / 12);
  // The typed chances are read at each read: no drop needed for them.
  P.B.ty = 3;
  assert.strictEqual(C.faOf(P, 'B'), 2 / 9);
  // Edits of conf, off or the records themselves outside scoreAnswer: not seen until the writer drops the counters.
  P.A.conf.B = 50;
  P.D = {ok: 1, ko: 0, conf: {B: 1}, off: {B: 1}};
  delete P.C;
  assert.strictEqual(C.faOf(P, 'B'), 2 / 9, 'kept: the proof that the counters are read');
  C.faDrop(P);
  same(P, 'edited, dropped');
  // A record replaced as a whole.
  P.A = {ok: 1, ko: 0, off: {B: 2}, conf: {B: 1}};
  C.faDrop(P);
  same(P, 'replaced, dropped');
  // A P replaced by another object has counters of its own.
  const Q = copy(P);
  Q.A.conf.B = 2;
  same(Q, 'another P');
  same(P, 'the first P untouched');
});

test('scoreAnswer keeps the counters at every count it writes; one that throws drops them', () => {
  const P = {};
  C.scoreAnswer(P, answer(rng(5), 'f'));
  same(P, 'first');
  // A typed miss on a family names another family: its chances come from the typed questions (tyk) and the ty it wrote.
  C.scoreAnswer(P, {t: 'f:Damselfishes', c: 'f:Angelfishes', ok: false, k: Infinity, chs: [], cv: true, d0: 0, mu: 0});
  assert.ok(C.faOf(P, 'f:Angelfishes') > 0);
  same(P, 'typed');
  // An offer of the unit shown beside itself and a mix-up with itself: never in the scan, never in the counters.
  C.scoreAnswer(P, {t: 'f:Wrasses', c: 'f:Wrasses', ok: false, k: 3, chs: ['f:Wrasses', 'f:Wrasses', 'f:Gobies'], cv: false, d0: 0, mu: 0});
  same(P, 'its own id');
  // A step that throws after a count was written: the counters dropped, the next read counts the records.
  // (ph not a list: the photos' loop throws, after the offers and the mix-up are counted)
  assert.throws(() =>
    C.scoreAnswer(P, {t: 'f:Gobies', c: 'f:Wrasses', ok: false, k: 3, chs: ['f:Gobies', 'f:Wrasses'], d0: 0, mu: 0, ph: 5})
  );
  P['f:Wrasses'].conf = {...P['f:Wrasses'].conf, 'f:Angelfishes': 4};
  same(P, 'after a throw');
});

test('odd records are scanned: not a plain object, a count that is not a safe integer, ids Object.prototype holds', () => {
  const base = () => ({
    A: {ok: 1, ko: 0, conf: {B: 1}, off: {B: 2, C: 1}},
    C: {ok: 1, ko: 0, conf: {B: 1}, off: {B: 1}},
    [LEVEL]: {ok: 2, ko: 0, tyk: {'': 1}}
  });
  const cases = [
    P => (P.C.conf = ['B']),
    P => (P.C.conf = 'B'),
    P => (P.C.conf = 3),
    P => (P.C.off = {B: '2'}),
    P => (P.C.off = {B: true}),
    P => (P.C.off = {B: 2 ** 53}),
    P => (P.C.off = {B: Infinity}),
    P => (P.C.conf = Object.assign(Object.create({B: 5}), {C: 1})),
    P => (P.C.conf = Object.assign(Object.create(null), {B: 2})),
    P => (P.C = 'C'),
    P => (P.C = null),
    P => (P.toString = {ok: 1, ko: 0, conf: {B: 1}}),
    P => (P.A.conf.constructor = 2)
  ];
  const ids = ['A', 'B', 'C', 'constructor', 'toString', '__proto__', 'hasOwnProperty', 'length', '0'];
  cases.forEach((edit, i) => {
    const P = base();
    edit(P);
    for (const n of ids) assert.ok(Object.is(C.faOf(P, n), faOfRef(P, n)), `case ${i}: ${n}: ${C.faOf(P, n)} against ${faOfRef(P, n)}`);
    // The scorer writing an id Object.prototype holds, or past a safe integer: the counters dropped, then scanned.
    const Q = base();
    C.faOf(Q, 'B');
    C.scoreAnswer(Q, {t: 'A', c: 'constructor', ok: false, k: 3, chs: ['A', 'toString', 'B'], d0: 0, mu: 0});
    for (const n of ids) assert.ok(Object.is(C.faOf(Q, n), faOfRef(Q, n)), `case ${i}, scored: ${n}`);
  });
  const P = base();
  C.faOf(P, 'B');
  P.A.off.B = Number.MAX_SAFE_INTEGER;
  C.faDrop(P);
  assert.ok(Object.is(C.faOf(P, 'B'), faOfRef(P, 'B')), 'a safe integer, counted');
  C.scoreAnswer(P, {t: 'A', c: 'B', ok: false, k: 3, chs: ['A', 'B', 'C'], d0: 0, mu: 0});
  for (const n of ['A', 'B', 'C']) assert.ok(Object.is(C.faOf(P, n), faOfRef(P, n)), `past a safe integer: ${n}`);
  // No P, no id: 0 as before.
  assert.strictEqual(C.faOf(null, 'A'), 0);
  assert.strictEqual(C.faOf(base(), ''), 0);
});

test('FA_CHECK: counters that disagreed with the scan would throw (a refill without its drop)', () => {
  const P = {A: {ok: 1, ko: 0, conf: {B: 1}, off: {B: 1}}, B: {ok: 1, ko: 0}};
  C.FA_CHECK.on = true;
  try {
    assert.strictEqual(C.faOf(P, 'B'), 1);
    // Refilled in place with no faDrop (outside the contract): the check catches the counters gone stale.
    const M = copy(P);
    M.A.off.B = 4;
    Object.keys(P).forEach(g => delete P[g]);
    Object.assign(P, M);
    assert.throws(() => C.faOf(P, 'B'), /faOf: the counters give 1 for B, the scan 0.25/);
    C.faDrop(P);
    assert.strictEqual(C.faOf(P, 'B'), 0.25);
  } finally {
    C.FA_CHECK.on = false;
  }
});

// A rated-world run (tools/ratedworld.js: model.js whole on the world's units, the records P as the play makes them):
// after every answer every unit's rate, kept against the scan and against the rebuilt; now and then P loaded again (a
// copy) or refilled in place with a copy of itself, the counters dropped. FA_CHECK on: every read the run makes itself
// (the planner's bars, the exam's entry, the learned mark) is checked against the scan on the way, and the run's
// records are those of the same run with FA_CHECK off.
function played(U, profile, seed, N, st) {
  const ids = P => [...new Set([...U.slate, ...U.extra, ...(U.sp || []), ...(U.ssp || []), ...Object.keys(P), 'g:none', 's:s999'])];
  const run = check => {
    const W = RW.world(U, seed),
      pl = RW.playerOf(U, W, {profile, seed, N, cps: [N], keep: true, beyond: U.subject === 'seaslug' ? 'yes' : ''}),
      r = rng(seed * 31 + 7);
    C.FA_CHECK.on = check;
    try {
      for (let i = 0; i < N; i++) {
        pl.step(i);
        const x = r();
        if (x < 0.02) pl.ctx.P = copy(pl.ctx.P);
        else if (x < 0.04) refill(pl.ctx.P, copy(pl.ctx.P));
        if (!check) continue;
        const L = ids(pl.ctx.P);
        same(pl.ctx.P, `${U.subject} ${profile} ${seed} after ${i + 1}`, L);
        st.reads += L.length;
        st.above += L.filter(n => C.faOf(pl.ctx.P, n) > 0).length;
      }
    } finally {
      C.FA_CHECK.on = false;
    }
    return pl.ctx.P;
  };
  const a = run(false),
    b = run(true);
  assert.deepStrictEqual(b, a, `${U.subject} ${profile} seed ${seed}: the same records with every read checked`);
  st.records = Math.max(st.records, Object.keys(b).length);
}

test('rated-world runs of every subject: after every answer, every unit kept = rebuilt = the scan', t => {
  const st = {reads: 0, above: 0, records: 0},
    U = seaslugU(),
    profOf = LP.profOf;
  for (const [sub, profile, seed, N] of [
    ['fish', 'strongRA', 3, 300],
    ['fish', 'beginner', 5, 150],
    ['coral', 'lectureRA', 2, 300]
  ])
    played(RW.unitsOf(sub), profile, seed, N, st);
  // The sea slugs have no learner profile of their own (tools/learnprof.js): the corals' part of the profile plays them,
  // a learner only; the engine is the sea slugs' (their subject, units and rules), as tests/levelview.test.js does.
  LP.profOf = (n, s) => profOf(n, s === 'seaslug' ? 'coral' : s);
  try {
    played(U, 'lectureRA', 4, 300, st);
  } finally {
    LP.profOf = profOf;
  }
  t.diagnostic(`${st.reads} reads, ${st.above} above 0; up to ${st.records} records`);
  assert.ok(st.above > 1000, 'false alarms read');
});
