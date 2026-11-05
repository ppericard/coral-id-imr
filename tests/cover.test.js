// Proven against the field (core.js COVER, rules version 6; Pierre, 2026-11-05, Q101-Q110; docs/LEARNING.md "Proven
// against the field"): the pair discrimination level, the coverage, the bar, a typed answer's effective set size, the
// exam's entry, the learned marks judged at the replay, the typed offers replayed and merged. Made-up genera only.
const test = require('node:test'),
  assert = require('node:assert'),
  C = require('../core.js');

// T has 7 declared look-alikes (L1-L7, CONF.LOOK) and 7 unrelated genera (U1-U7, CONF.BASE); X is off the field (a bonus
// genus). No pooled data: every pair is at its prior.
const LOOK = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'],
  FAR = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7'],
  GEN = Object.fromEntries([['T', {look: LOOK, fam: 'a'}], ...[...LOOK, ...FAR, 'X'].map(n => [n, {look: [], fam: n}])]),
  SLATE = ['T', ...LOOK, ...FAR],
  F = C.fieldOf(GEN, {}, SLATE);
const near = (a, b, why, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${why}: ${a} vs ${b}`);

test('field rule: a pair level is 0 until the pair met, grows with the offers, a mix-up weighs by how confusable it is', () => {
  const q = F.q('T', 'L1');
  near(q, C.CONF.LOOK, 'a declared look-alike starts at its prior');
  near(F.q('T', 'U1'), C.CONF.BASE, 'an unrelated genus at the base prior');
  assert.strictEqual(C.pairLevel({}, 'T', 'L1', q), 0, 'never met: 0');
  near(C.pairLevel({T: {off: {L1: 2}}}, 'T', 'L1', q), 2 / (2 + C.COVER.W), '2 offers, no mix-up');
  near(C.pairLevel({L1: {off: {T: 2}}}, 'T', 'L1', q), 2 / (2 + C.COVER.W), 'both directions (pairConf)');
  // 10 offers, 1 mix-up: forgivable on a look-alike, damning on a pair nobody confuses.
  near(C.pairLevel({T: {off: {L1: 10}, conf: {L1: 1}}}, 'T', 'L1', q), (10 - 1 / 0.3) / 12, 'look-alike, 1 mix-up in 10');
  assert.strictEqual(C.pairLevel({T: {off: {U1: 10}, conf: {U1: 1}}}, 'T', 'U1', F.q('T', 'U1')), 0, 'unrelated, 1 mix-up in 10');
  // A typed answer's offers (offT) count with the picks' offers.
  near(C.pairLevel({T: {offT: {L1: 1.5}, off: {L1: 0.5}}}, 'T', 'L1', q), 2 / (2 + C.COVER.W), 'typed offers add up');
});

test('field rule: coverage over the field weighed by the pooled scores; unmet genera untested, bonus genera out', () => {
  assert.strictEqual(C.coverageOf({T: {pg: 0.9}}, 'T', F), 0);
  // Every look-alike offered many times, no unrelated genus: the look-alikes' share of the mass.
  const P = {T: {pg: 0.9, off: Object.fromEntries(LOOK.map(n => [n, 1e6]))}},
    share = (7 * C.CONF.LOOK) / (7 * C.CONF.LOOK + 7 * C.CONF.BASE);
  near(C.coverageOf(P, 'T', F), share, 'look-alikes only', 1e-4);
  // A bonus genus offered changes nothing (not in the field), and its own bar has no field rule.
  const Q = JSON.parse(JSON.stringify(P));
  Q.T.off.X = 1e6;
  near(C.coverageOf(Q, 'T', F), C.coverageOf(P, 'T', F), 'bonus genus out of the field');
  assert.strictEqual(C.barOf({X: {pg: C.PROG.M}}, 'X', F), 0.95, 'a genus off the field keeps the bar without the rule');
});

test('field rule: the bar is 0.95 x min(1, pg / M) x coverH(cov); exam steps and the entry only once the coverage reaches C', () => {
  near(C.scoreOf({pg: C.PROG.M}), 0.95, 'without the rule: as before');
  near(C.scoreOf({pg: C.PROG.M}, 0), 0.95 * C.COVER.B, 'nothing proven: B of the bar');
  near(C.scoreOf({pg: C.PROG.M}, C.COVER.C), 0.95, 'coverage C counts in full');
  near(C.scoreOf({pg: C.PROG.M}, 1), 0.95, 'never above');
  near(C.scoreOf({pg: C.PROG.M / 2}, C.COVER.C / 4), 0.95 * 0.5 * (C.COVER.B + (1 - C.COVER.B) * 0.5), 'the square root');
  near(C.scoreOf({pg: C.PROG.M, ex: {k: 2}}, 0.5), 0.95 * C.coverH(0.5), 'no exam step before the entry');
  near(C.scoreOf({pg: C.PROG.M, ex: {k: 2}}, 0.95), 0.97, 'exam steps from the entry');
  assert.strictEqual(C.scoreOf({pg: 0.1, mx: 1}, 0), 1, 'learned: 100%');
  // The exam's entry (the Q105 hook): pg at M and the coverage.
  const P = {T: {pg: C.PROG.M, off: Object.fromEntries([...LOOK, ...FAR].map(n => [n, 1e6]))}};
  assert.ok(C.examEntryOf(P, 'T', F));
  assert.ok(C.examEntryOf({T: {pg: C.PROG.M}}, 'T', null), 'without the rule: pg alone, as before');
  assert.ok(!C.examEntryOf({T: {pg: C.PROG.M}}, 'T', F), 'with it: no coverage, no exam');
  assert.ok(!C.examEntryOf({T: {pg: C.PROG.M - 0.01, off: P.T.off}}, 'T', F), 'pg under M');
  // The global %: the mean of the bars over the list, under the field.
  assert.strictEqual(C.pctOf({T: {pg: C.PROG.M}}, SLATE, F), Math.round((100 * 0.95 * C.COVER.B) / SLATE.length));
  assert.strictEqual(C.pctOf({T: {pg: C.PROG.M}}, SLATE), Math.round(95 / SLATE.length));
});

test('field rule: a typed answer is scored with a similarity-weighted effective set: 8 dissimilar genera small, 8 look-alikes large', () => {
  const far = C.typedK({}, 'T', ['T', ...FAR], F),
    look = C.typedK({}, 'T', ['T', ...LOOK], F);
  assert.strictEqual(far, 2, `8 unrelated genera unlocked: the floor of 2 (${far})`);
  near(look, 8, '8 look-alikes: about 8');
  assert.ok(C.typedK({}, 'T', SLATE, F) > look, 'more unlocked, larger');
  // The player's own record moves the similarity: a pair they never mix up after many offers weighs less.
  assert.ok(C.typedK({T: {off: Object.fromEntries(LOOK.map(n => [n, 40]))}}, 'T', ['T', ...LOOK], F) < look);
  // The guess rate and the choices read back from the log (|ktN), an older typed row none.
  assert.strictEqual(C.guessOf('quiz|t|kt3.5', ''), 1 / 3.5);
  assert.strictEqual(C.guessOf('quiz|t', ''), 0);
  assert.strictEqual(C.kOf('quiz|t|kt3.5', ''), 3.5);
  assert.strictEqual(C.kOf('quiz|t', ''), Infinity);
  assert.strictEqual(C.kOf('quiz|k3', ''), 3, '|kN unchanged');
  // The offers of a right typed answer: each genus of the vocabulary by its similarity, sparse.
  const P = {T: {}};
  C.typedOffers(P, 'T', ['T', 'L1', 'U1', 'L1'], F);
  assert.deepStrictEqual(P.T.offT, {L1: 1, U1: 0.1});
});

test('field rule: the replay rebuilds the typed offers and scores an old typed row with the vocabulary the log knows', () => {
  const t0 = Date.UTC(2026, 10, 6),
    row = (i, g, a, mode, ch = '') => ['p', t0 + i * 1000, g, a, g === a ? 1 : 0, mode, 'f' + i, 0.6, 0.5, 1, ch, null, null];
  const rows = [row(0, 'L1', 'L1', 'quiz', 'L1 T U1 U2'), row(1, 'U1', 'U1', 'quiz', 'U1 T L2 U2'), row(2, 'T', 'T', 'quiz|t')],
    R = C.replayProgress(rows, {gen: GEN}).p.P,
    old = C.replayProgress(rows, {gen: GEN, cover: false}).p.P;
  // The vocabulary: L1 and U1 answered before; L1 a look-alike (about 1), U1 unrelated (about 0.1), a little less as
  // the player's own record (T offered beside both, never mixed up) shrinks their similarity.
  assert.deepStrictEqual(Object.keys(R.T.offT).sort(), ['L1', 'U1']);
  assert.ok(R.T.offT.L1 > 0.8 && R.T.offT.L1 < 1 && R.T.offT.U1 > 0.05 && R.T.offT.U1 < 0.1, JSON.stringify(R.T.offT));
  assert.strictEqual(old.T.offT, undefined, 'the rules before version 6: none');
  assert.notStrictEqual(R.T.pg, old.T.pg, 'the typed answer weighs its effective set size');
  // A typed row logged with |kt: scored with it (the app's own vocabulary).
  const kt = C.replayProgress([...rows.slice(0, 2), row(2, 'T', 'T', 'quiz|t|kt2')], {gen: GEN}).p.P;
  near(kt.T.pg, R.T.pg, 'k 2 logged = the floor of 2 the vocabulary the log knows gives (1 + 0.89 + 0.09)');
  // Two devices' typed offers add up (mergeProgress), and an account merge too (mergeUsers' mergeUserP).
  const B = {T: {ok: 1, ko: 0, offT: {L1: 1}}},
    l = {T: {ok: 2, ko: 0, offT: {L1: 2}}},
    r = {T: {ok: 2, ko: 0, offT: {L1: 1.5}}};
  assert.deepStrictEqual(C.mergeProgress(B, l, r).T.offT, {L1: 2.5});
});

test('field rule: a learned mark passed before it stays only where the replayed state meets the exam entry (Q109)', () => {
  const full = Object.fromEntries([...LOOK, ...FAR].map(n => [n, 1e6])),
    rep = {P: {T: {pg: 0.85, ok: 40, ko: 1, h: '1', u: 40, off: full}, L1: {pg: 0.85, ok: 40, ko: 1, h: '1', u: 40}}},
    saved = {T: {pg: 0.85, ok: 40, ko: 1, mx: 5}, L1: {pg: 0.85, ok: 40, ko: 1, mx: 5}};
  const G = C.replayedOf(rep, saved, C.RV, F);
  assert.ok(G.T.mx && G.T.mf, 'met: kept, and marked so no later replay judges it again');
  assert.ok(!G.L1.mx, 'not met (no coverage): taken away');
  // Without the field (an older sheet): kept as before.
  assert.ok(C.replayedOf(rep, saved, C.RV, null).L1.mx);
  // A mark passed under the rule (mf) is never judged again.
  assert.ok(C.replayedOf(rep, {...saved, L1: {...saved.L1, mf: 1}}, C.RV, F).L1.mx);
});
