// Property test of the progress merges (test-suite review, 2026-11-04: double counting is the costliest sync bug, and
// the unit tests checked hand-picked records). Random records, seeded so a failure replays:
// - core.js mergeProgress(B, L, R), two devices that each answered since their common base B: every count (right, wrong,
//   mix-ups, offers, answer times, photos seen) is the base plus both devices' own answers, never fewer, never twice;
//   the same whichever device merges; and merging again what is already merged adds nothing.
// - core.js mergeUsers(A, B), two accounts of one person merged in the admin: their answers are different answers, so
//   every count is the sum, in either order, and an empty account adds nothing.
const test = require('node:test'),
  assert = require('node:assert'),
  {mergeProgress, mergeUsers} = require('../core.js');

const R = (() => {
  // A small seeded generator of our own (core.js may have none to export under that name).
  let s = 0x2f6b;
  return () => (s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0) / 2 ** 32;
})();
const int = n => Math.floor(R() * n),
  G = ['Acropora', 'Porites', 'Pocillopora', 'Montipora', 'Favites'],
  F = ['a1', 'a2', 'b1', 'b2', 'c1'];
// Answers on a few genera: counts, mix-ups, offers, answer-time buckets, photos seen [shown, right].
const answers = () => {
  const P = {};
  G.filter(() => R() < 0.7).forEach(g => {
    const r = {ok: int(6), ko: int(4)},
      bag = () => Object.fromEntries(G.filter(x => x !== g && R() < 0.4).map(x => [x, 1 + int(3)]));
    if (!(r.ok + r.ko)) r.ok = 1;
    r.conf = bag();
    r.off = bag();
    r.rt = Object.fromEntries(['5', '12', '30'].filter(() => R() < 0.5).map(k => [k, 1 + int(4)]));
    r.ps = Object.fromEntries(F.filter(() => R() < 0.4).map(f => [f, (n => [n, int(n + 1)])(1 + int(3))]));
    P[g] = r;
  });
  return P;
};
// a + b, record by record (what two sets of answers on top of each other count).
const plus = (a, b) => {
  const out = JSON.parse(JSON.stringify(a));
  Object.entries(b).forEach(([g, r]) => {
    const o = (out[g] = out[g] || {ok: 0, ko: 0});
    o.ok += r.ok;
    o.ko += r.ko;
    ['conf', 'off', 'rt'].forEach(f => {
      o[f] = o[f] || {};
      Object.entries(r[f] || {}).forEach(([k, n]) => (o[f][k] = (o[f][k] || 0) + n));
    });
    o.ps = o.ps || {};
    Object.entries(r.ps || {}).forEach(([k, [s, ok]]) => (o.ps[k] = [(o.ps[k] || [0, 0])[0] + s, (o.ps[k] || [0, 0])[1] + ok]));
  });
  return out;
};
// The counts of a progress record set, in one comparable shape (empty bags left out, as the merges leave them).
const counts = P =>
  Object.fromEntries(
    Object.keys(P)
      .sort()
      .map(g => {
        const r = P[g],
          bag = x =>
            Object.fromEntries(
              Object.entries(x || {})
                .filter(([, n]) => n)
                .sort()
            ),
          ps = Object.fromEntries(
            Object.entries(r.ps || {})
              .filter(([, v]) => v[0] || v[1])
              .sort()
          );
        return [g, {ok: r.ok || 0, ko: r.ko || 0, conf: bag(r.conf), off: bag(r.off), rt: bag(r.rt), ps}];
      })
  );

test('mergeProgress: two devices add up exactly, in either order, and a merge merged again adds nothing (300 cases)', () => {
  for (let k = 0; k < 300; k++) {
    const B = answers(),
      L = plus(B, answers()), // this device: the base and its own answers since
      Rm = plus(B, answers()), // the other device, the same
      want = counts(plus(plus(B, minus(L, B)), minus(Rm, B))),
      M = mergeProgress(B, L, Rm);
    assert.deepStrictEqual(counts(M), want, `case ${k}: not the base plus both devices' answers`);
    assert.deepStrictEqual(counts(mergeProgress(B, Rm, L)), want, `case ${k}: depends on which device merges`);
    // Synced again with nothing new: the other side now holds M too (base M), or still R with M built on it (base R).
    assert.deepStrictEqual(counts(mergeProgress(M, M, M)), want, `case ${k}: merged again, counts moved`);
    assert.deepStrictEqual(counts(mergeProgress(Rm, M, Rm)), want, `case ${k}: M pushed onto R again, counts moved`);
  }
});

test('mergeUsers: two accounts add up, in either order; an empty account adds nothing (300 cases)', () => {
  const K = 'reefid-sync-coral-progress',
    data = P => ({[K]: JSON.stringify(P)}),
    got = d => counts(JSON.parse(d[K]));
  for (let k = 0; k < 300; k++) {
    const A = answers(),
      B = answers(),
      want = counts(plus(A, B));
    assert.deepStrictEqual(got(mergeUsers(data(A), data(B))), want, `case ${k}: not the sum`);
    assert.deepStrictEqual(got(mergeUsers(data(B), data(A))), want, `case ${k}: depends on the order`);
    assert.deepStrictEqual(got(mergeUsers({}, data(A))), counts(A), `case ${k}: an empty account changed the counts`);
  }
});

// b - a for answers built as a + something (the something).
function minus(b, a) {
  const out = {};
  Object.entries(b).forEach(([g, r]) => {
    const x = a[g] || {ok: 0, ko: 0},
      o = {ok: r.ok - x.ok, ko: r.ko - x.ko};
    ['conf', 'off', 'rt'].forEach(f => {
      o[f] = {};
      Object.entries(r[f] || {}).forEach(([k, n]) => {
        const d = n - ((x[f] || {})[k] || 0);
        if (d) o[f][k] = d;
      });
    });
    o.ps = {};
    Object.entries(r.ps || {}).forEach(([k, v]) => {
      const y = (x.ps || {})[k] || [0, 0];
      if (v[0] - y[0] || v[1] - y[1]) o.ps[k] = [v[0] - y[0], v[1] - y[1]];
    });
    if (o.ok || o.ko || Object.keys(o.ps).length || ['conf', 'off', 'rt'].some(f => Object.keys(o[f]).length)) out[g] = o;
  });
  return out;
}
