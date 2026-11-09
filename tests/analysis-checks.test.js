// The Analyses module (analysis.js): Can we trust this model? (the multifactor visualisation study §5 item 8): each
// player left out in turn, the calibration of the predictions, the quantile residuals, the paired log-loss against the
// app's expectation with the players as the unit (tests/analysis.test.js says why the module's tests are split).
const test = require('node:test'),
  assert = require('node:assert');
const A = require('../analysis.js');
const {withTruth, synthMeta} = require('./analysisfix.js');

const run = (patch = {}) => {
  const {photos, meta, look} = synthMeta(),
    pl = Array.from({length: 12}, (_, i) => ['P' + i, ((i % 5) - 2) * 0.4, 600, 0.05 + 0.03 * (i % 6)]);
  return withTruth(patch, () => A.runAll(A.synth({players: pl, photos, look, start: 0, end: 200 * 864e5, seed: 1}), meta, {B: 0}));
};

test('model checks: on the generator’s own log the predictions of players left out are calibrated', () => {
  const r = run();
  ['zoom', 'photo', 'conf', 'learn', 'back', 'sess'].forEach(k => {
    const C = r.A[k].chk;
    assert.ok(C && C.players === 12 && C.cal.length === 5, k);
    assert.strictEqual(
      C.cal.reduce((t, b) => t + b[0], 0),
      C.n,
      k
    );
    // within 6 points in every band (the generator's random photo effects are part of what a new player meets)
    C.cal.forEach(b => assert.ok(Math.abs(b[1] - b[2]) < 0.06, `${k}: ${JSON.stringify(b)}`));
    C.qq.forEach(([p, v]) => assert.ok(Math.abs(v - p) < 0.03, `${k} quantile residuals ${p}: ${v}`));
  });
  // Answer time: its residuals on the normal's quantiles (the generator draws log time normal)
  r.A.rt.chk.qq.forEach(([z, v]) => assert.ok(Math.abs(v - z) < 0.12, `time ${z}: ${v}`));
});

test('model checks: corrections to the app that hold predict new players better than the app; none, no gain', () => {
  // Enlarging: the model is the app's expectation plus enlarging's effect, which the app leaves out. Planted strong
  // (+1.5 on the log-odds, enlarged often), it predicts new players' answers clearly better; with no effect, not.
  const {photos, meta, look} = synthMeta(),
    pl = Array.from({length: 12}, (_, i) => ['P' + i, ((i % 5) - 2) * 0.4, 600, 0.3]),
    ll = zoom =>
      withTruth({zoom}, () => {
        const D = A.prep(A.synth({players: pl, photos, look, start: 0, end: 200 * 864e5, seed: 1}), meta);
        return A.zoom(D, 0, 1).chk.ll;
      }),
    on = ll(1.5),
    off = ll(0);
  assert.ok(on.hi < 0 && on.p < 0.01 && on.players === 12, JSON.stringify(on));
  assert.ok(!(off.hi < 0), JSON.stringify(off));
  // models without the app's offset make no comparison
  assert.strictEqual(run().A.learn.chk.ll, null);
});

test('a player left out weighs nothing in the fit: their predictions are the same whatever they answered', () => {
  const {photos, meta, look} = synthMeta(),
    pl = Array.from({length: 6}, (_, i) => ['P' + i, 0, 300, 0.1]),
    D = A.prep(A.synth({players: pl, photos, look, start: 0, end: 50 * 864e5, seed: 4}), meta),
    flip = D.map(a => (a.p === 'P2' ? Object.assign({}, a, {y: 1 - a.y}) : a)),
    out = R =>
      [
        ...A.predictOut(
          R,
          S => A.lnFit(S).M,
          a => a.g0,
          'P2',
          false
        )
      ].filter(isFinite),
    o1 = out(D),
    o2 = out(flip);
  assert.ok(o1.length > 100);
  o1.forEach((v, i) => assert.ok(Math.abs(v - o2[i]) < 1e-9, `${i}: ${v} ${o2[i]}`));
  // and another player's are not: P2's answers are in their fit
  const o3 = [
      ...A.predictOut(
        D,
        S => A.lnFit(S).M,
        a => a.g0,
        'P3',
        false
      )
    ].filter(isFinite),
    o4 = [
      ...A.predictOut(
        flip,
        S => A.lnFit(S).M,
        a => a.g0,
        'P3',
        false
      )
    ].filter(isFinite);
  assert.ok(o3.some((v, i) => Math.abs(v - o4[i]) > 1e-4));
});

test('signFlip: exact over the sign patterns; the t interval over players', () => {
  assert.strictEqual(A.signFlip([1, 1, 1, 1, 1]), 2 / 32);
  assert.strictEqual(A.signFlip([1, -1, 1, -1]), 1);
  const p = A.signFlip(Array.from({length: 20}, (_, i) => 0.5 + (i % 3)));
  assert.ok(p > 0 && p < 0.001, String(p));
});

test('a player left out: a coefficient only their answers move is not learnt from them (the fast path)', () => {
  // Codex review #831: five players, an indicator only the left-out player has; their success rate 90% or 10%
  const R = A.rng(2),
    rows = rate =>
      Array.from({length: 5}, (_, p) =>
        Array.from({length: 200}, () => ({p: 'P' + p, x: p === 4 ? 1 : 0, y: R() < (p === 4 ? rate : 0.5) ? 1 : 0}))
      ).flat(),
    fit = S =>
      A.glmm(
        S.map(r => r.y),
        S.map(r => [1, r.x]),
        [
          A.factor(
            'player',
            S.map(r => r.p)
          )
        ]
      ),
    out = D => {
      fit(D); // the full fit first, as an analysis does: its warm state is there
      return [...A.predictOut(D, fit, () => 0, 'P4')].filter(isFinite);
    },
    hi = out(rows(0.9)),
    lo = out(rows(0.1));
  assert.ok(Math.abs(hi[0] - lo[0]) < 0.05, `${hi[0]} ${lo[0]}`);
});

test('a player left out: their chance is averaged over the fitted players, not read at the average player', () => {
  // Codex review #831: guess rate 0, the fixed part 1.5, two fitted players at -2 and +2 (the one left out at 0): the mean
  // of their chances, 67.4%, not 81.8% at the average player
  const P = A.predictOut(
    [{p: 'X'}],
    () => ({eta: [1.5], F: [{name: 'player', L: ['A', 'B', 'X'], u: [-2, 2, 0]}]}),
    () => 0,
    'X'
  );
  assert.ok(Math.abs(P[0] - (1 / (1 + Math.exp(0.5)) + 1 / (1 + Math.exp(-3.5))) / 2) < 1e-9, String(P[0]));
});
