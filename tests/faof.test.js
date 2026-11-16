'use strict';
require('./slot.js').testGuard();
// The false-alarm table (core.js faArm, faOf; 2026-11-15): a speed-up only. With the table armed, faOf answers every unit
// from one pass over the records instead of a scan per unit, and must give exactly what the scan gave: the same number to
// the last bit (Object.is), on logs made up here and on rated-world runs. The reference is a copy of faOf as it was before
// the table, kept here as it was.
const test = require('node:test'),
  assert = require('node:assert');
const C = require('../core.js'),
  RW = require('../tools/ratedworld.js');

// faOf before the table (core.js of 2026-11-15, main d0af3c19), verbatim but for LEVEL and rankKey written out.
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
// Units of every rank the engine names: coral genera (no prefix), fish families f:, scientific genera g:, species s:.
const RANKS = {
  '': ['Acropora', 'Montipora', 'Porites', 'Pocillopora', 'Favites', 'Goniastrea', 'Millepora'],
  f: ['f:Damselfishes', 'f:Angelfishes', 'f:Wrasses', 'f:Gobies', 'f:Butterflyfishes'],
  g: ['g:Chromis', 'g:Pomacentrus', 'g:Halichoeres', 'g:Chaetodon'],
  s: ['s:s001', 's:s002', 's:s003', 's:s004', 's:s005', 's:s006']
};
const ALL = Object.values(RANKS).flat();
// Ids no record holds, or that only the unit itself names: the table must give the scan's 0 for them too.
const ASK = [...ALL, 'Seriatopora', 'f:Groupers', 'g:none', 's:s999'];
const KS = [2, 3, 4, Infinity];
// One answer as quiz.js hands it to scoreAnswer: on t, among k choices of its rank (typed: none), right or not; a wrong
// answer names another unit of the rank, or nothing ("I don't know", typed only).
function answer(r, rk) {
  const L = RANKS[rk],
    t = L[Math.floor(r() * L.length)],
    k = KS[Math.floor(r() * KS.length)],
    others = L.filter(x => x !== t).sort(() => r() - 0.5),
    chs = isFinite(k) ? [t, ...others.slice(0, k - 1)] : [],
    ok = r() < 0.6,
    c = ok ? t : !isFinite(k) && r() < 0.3 ? '' : isFinite(k) ? chs[1 + Math.floor(r() * (chs.length - 1))] : others[0];
  return {t, c, ok, k, chs, ph: [], cv: !!c, d0: r() * 2 - 1, mu: 0, R: 1, Rc: 1, p: 0, timed: false, dom: true};
}
// Every id asked, the table against the reference.
function same(P, label) {
  for (const n of ASK) {
    const a = C.faOf(P, n),
      b = faOfRef(P, n);
    assert.ok(Object.is(a, b), `${label}: faOf(${n}) ${a}, before the table ${b}`);
  }
}

test('armed, after each answer of made-up logs (every rank, typed questions, mix-ups): the scan to the last bit', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const r = rng(seed * 7919),
      P = {},
      rks = Object.keys(RANKS);
    C.faArm(P);
    for (let i = 0; i < 250; i++) {
      C.scoreAnswer(P, answer(r, rks[Math.floor(r() * rks.length)]));
      same(P, `seed ${seed}, answer ${i + 1}`);
    }
    C.faDisarm(P);
    same(P, `seed ${seed}, disarmed`);
  }
});

test('non-integer counts: each unit sums the same numbers in the same order as the scan', () => {
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
    C.faArm(P);
    same(P, `run ${run}`);
    C.faDisarm(P);
  }
});

test('records edited by hand: unarmed, the scan; armed again, the table rebuilt from the records as they are', () => {
  const P = {
    B: {ok: 5, ko: 0},
    A: {ok: 6, ko: 2, off: {B: 6, C: 2}, conf: {B: 2}},
    C: {ok: 3, ko: 1, off: {B: 2}, conf: {}},
    [LEVEL]: {ok: 20, ko: 3, tyk: {'': 4}}
  };
  C.faArm(P);
  assert.strictEqual(C.faOf(P, 'B'), 2 / 12);
  // Edits outside scoreAnswer: the caller arms again (the contract of faArm).
  P.B.ty = 3;
  C.faArm(P);
  assert.strictEqual(C.faOf(P, 'B'), 2 / 9);
  P.A.conf.B = 50;
  P.D = {ok: 1, ko: 0, conf: {B: 1}, off: {B: 1}};
  delete P.C;
  C.faArm(P);
  same(P, 'edited');
  // A record replaced as a whole, and a P replaced: the new P is not armed and scans.
  P.A = {ok: 1, ko: 0, off: {B: 2.5}, conf: {B: 0.5}};
  C.faArm(P);
  same(P, 'replaced');
  const Q = JSON.parse(JSON.stringify(P));
  same(Q, 'new P');
  C.faDisarm(P);
});

test('scoreAnswer on an armed P: the table emptied, every count it writes read after it', () => {
  const P = {};
  C.faArm(P);
  C.scoreAnswer(P, answer(rng(5), 'f'));
  same(P, 'first');
  // A typed miss on a family names another family: its chances come from the typed questions (tyk) and the ty it wrote.
  C.scoreAnswer(P, {t: 'f:Damselfishes', c: 'f:Angelfishes', ok: false, k: Infinity, chs: [], cv: true, d0: 0, mu: 0});
  assert.ok(C.faOf(P, 'f:Angelfishes') > 0);
  same(P, 'typed');
  // A scoreAnswer that throws leaves the table armed and empty (finally), so the next read is from the records.
  assert.throws(() => C.scoreAnswer(P, null));
  P['f:Wrasses'] = {ok: 1, ko: 0, conf: {'f:Angelfishes': 4}};
  C.faArm(P);
  same(P, 'after a throw');
  C.faDisarm(P);
});

test('odd records are scanned: not a plain object, a count that is not a number, ids Object.prototype holds', () => {
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
    P => (P.C.conf = Object.assign(Object.create({B: 5}), {C: 1})),
    P => (P.C.conf = Object.assign(Object.create(null), {B: 2})),
    P => (P.C = 'C'),
    P => (P.C = null),
    P => (P.toString = {ok: 1, ko: 0, conf: {B: 1}}),
    P => (P.A.conf.constructor = 2)
  ];
  cases.forEach((edit, i) => {
    const P = base();
    edit(P);
    C.faArm(P);
    for (const n of ['A', 'B', 'C', 'constructor', 'toString', '__proto__', 'hasOwnProperty', 'length', '0'])
      assert.ok(Object.is(C.faOf(P, n), faOfRef(P, n)), `case ${i}: ${n}: ${C.faOf(P, n)} against ${faOfRef(P, n)}`);
    C.faDisarm(P);
  });
  // No P, no id: 0 as before.
  assert.strictEqual(C.faOf(null, 'A'), 0);
  assert.strictEqual(C.faOf(base(), ''), 0);
});

test('FA_CHECK: a table that disagreed with the scan would throw', () => {
  const P = {A: {ok: 1, ko: 0, conf: {B: 1}, off: {B: 1}}, B: {ok: 1, ko: 0}};
  C.FA_CHECK.on = true;
  try {
    C.faArm(P);
    assert.strictEqual(C.faOf(P, 'B'), 1);
    // Written past scoreAnswer while armed (outside the contract): the check catches the stale table.
    P.A.off.B = 4;
    assert.throws(() => C.faOf(P, 'B'), /faOf: the table gives 1 for B, the scan 0.25/);
  } finally {
    C.FA_CHECK.on = false;
    C.faDisarm(P);
  }
});

// The rated world arms the table for each answer (tools/ratedworld.js step): the same run with it and without it, every
// read checked against the scan (FA_CHECK) on the way.
test('rated world, fish and corals: the same runs with the table as without it, every read checked against the scan', () => {
  const runs = (subject, profile, seed, N) => {
    const o = {subject, profile, seed, N, cps: [N / 2, N], keep: true},
      arm = C.faArm;
    let plain;
    C.faArm = () => {};
    try {
      plain = RW.runOne(null, o);
    } finally {
      C.faArm = arm;
    }
    C.FA_CHECK.on = true;
    try {
      return [plain, RW.runOne(null, o)];
    } finally {
      C.FA_CHECK.on = false;
    }
  };
  for (const [subject, profile, seed, N] of [
    ['fish', 'strongRA', 3, 200],
    ['fish', 'beginner', 5, 120],
    ['coral', 'lectureRA', 2, 160]
  ]) {
    const [a, b] = runs(subject, profile, seed, N);
    assert.deepStrictEqual(b, a, `${subject} ${profile} seed ${seed}`);
    const mixed = Object.values(b.P).filter(s => s && s.conf && Object.keys(s.conf).length);
    assert.ok(mixed.length, `${subject}: mix-ups to read`);
  }
});
