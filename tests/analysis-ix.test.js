// The Analyses module (analysis.js), the later views of the multifactor visualisation study (docs/reviews/
// 2026-11-05-multifactor-viz-study.md §5): interactions (does one effect depend on another?). Synthetic logs with planted
// effects, recovered; without them, nothing (tests/analysis.test.js says why the module's tests are split).
const test = require('node:test'),
  assert = require('node:assert');
const A = require('../analysis.js');
const {withTruth, synthMeta} = require('./analysisfix.js');

test('chi2q and chi2inv: the textbook chi-square quantiles', () => {
  // qchisq(0.95, k) in R for k = 1, 2, 3, 10, 18; and its tails
  [
    [1, 3.841459],
    [2, 5.991465],
    [3, 7.814728],
    [10, 18.307038],
    [18, 28.869299]
  ].forEach(([k, x]) => {
    assert.ok(Math.abs(A.chi2q(x, k) - 0.05) < 1e-6, `k ${k}: ${A.chi2q(x, k)}`);
    assert.ok(Math.abs(A.chi2inv(0.05, k) - x) < 1e-4, `k ${k}: ${A.chi2inv(0.05, k)}`);
  });
  // exact forms: 2 degrees of freedom, exp(-x / 2); 1, both normal tails at sqrt(x)
  [0.5, 3, 30].forEach(x => {
    assert.ok(Math.abs(A.chi2q(x, 2) / Math.exp(-x / 2) - 1) < 1e-9, `k 2, x ${x}`);
    assert.ok(Math.abs(A.chi2q(x, 1) / (2 * A.ntail(Math.sqrt(x))) - 1) < 1e-9, `k 1, x ${x}`);
  });
  assert.strictEqual(A.chi2q(0, 3), 1);
});

// A slate with more answers than the shared fixture: 16 players of 700 answers, so that a planted interaction stands out.
const log = (seed, n = 700) => {
  const {photos, meta, look} = synthMeta(),
    pl = Array.from({length: 16}, (_, i) => ['P' + i, ((i % 5) - 2) * 0.3, n, 0.15 + 0.03 * (i % 6)]);
  return A.prep(A.synth({players: pl, photos, look, start: 0, end: 200 * 864e5, seed}), meta);
};
const zd = D => D.filter(a => a.z != null && a.x != null);

test('interactions: enlarging × view, pair × view, format × practice planted come back; without them, none reads clear', () => {
  const on = withTruth({ix: {zoomMacro: -1.5, pairMacro: -3, typedSlope: -0.6}, mix: 8}, () => log(5)),
    off = withTruth({mix: 8}, () => log(5));
  const zOn = A.zoomIx(zd(on), 0, 1),
    zOff = A.zoomIx(zd(off), 0, 1),
    cOn = A.confIx(on, 0, 1),
    cOff = A.confIx(off, 0, 1),
    lOn = A.lnIx(on, 0, 1),
    lOff = A.lnIx(off, 0, 1);
  // enlarging hurts on corallites only: the corallite level's change is the lowest, and the test is below 1%
  assert.ok(zOn.p0 < 0.01, `zoom × view planted: p ${zOn.p0}`);
  const d = k => zOn.lv.find(l => l.k === k).d[0];
  assert.ok(d('macro') < d('wide') - 0.8 && d('wide') > 0, JSON.stringify(zOn.lv.map(l => [l.k, l.d])));
  assert.ok(zOff.p0 > 0.01, `zoom × view null: p ${zOff.p0}`);
  // on corallites a miss on an even-numbered genus no longer goes to its look-alike: those pairs' corallite level drops
  assert.ok(cOn.p0 < 0.01, `pair × view planted: p ${cOn.p0}`);
  // Gen0 and its look-alike Gen1: on corallites a miss on Gen0 goes to Gen1 far less often than on a colony
  const lv = (P, w) => P.v.find(x => x[0] === w)[3],
    g01 = cOn.pairs.find(p => p.k === 'Gen0|Gen1');
  assert.ok(g01 && lv(g01, 'macro') < lv(g01, 'wide') - 1, JSON.stringify(g01));
  assert.ok(cOff.p0 > 0.01, `pair × view null: p ${cOff.p0}`);
  // typed answers learn slower: their curve rises less from 0 to 32 answers than four choices'
  assert.ok(lOn.p0 < 0.001, `format × practice planted: p ${lOn.p0}`);
  const rise = k => {
    const L = lOn.lv.find(l => l.k === k).pts;
    return L[L.length - 1][1] - L[0][1];
  };
  assert.ok(rise('typed') < rise('four') - 1, `rises ${rise('typed')} ${rise('four')}`);
  assert.ok(lOff.p0 > 0.01, `format × practice null: p ${lOff.p0}`);
});

test('interactions: one exploratory test each in the correction; a clear one reads clear, the margin and the answers needed', () => {
  const t = {k: 'view', ix: 1, df: 3, W: 30, p0: 1e-6, n: 4000, sesoi: 0.25, b: [0.1, -1, 0], se: [0.1, 0.2, 0.1], inm: 0},
    m = {k: 'pairview', ix: 1, df: 2, W: 0.5, p0: 0.78, n: 4000, sesoi: 0.25, b: [0.02, -0.03], se: [0.05, 0.05], inm: 1},
    w = {k: 'fmtpractice', ix: 1, df: 2, W: 2, p0: 0.37, n: 4000, sesoi: 0.25, b: [0.2, -0.3], se: [0.3, 0.3], inm: 0},
    res = A.correct({A: {zoom: {effects: [], ix: [t]}, conf: {effects: [], ix: [m]}, learn: {effects: [], ix: [w]}}});
  assert.deepStrictEqual(res.mt, {m1: 0, m2: 3, a: 0.05, q: 0.05});
  assert.ok(t.fam === 2 && t.v === 'clear' && t.pa < 0.05, JSON.stringify(t));
  assert.ok(m.v === 'margin', JSON.stringify(m));
  assert.ok(w.v === 'thin' && w.need > 4000, JSON.stringify(w));
  // the larger p of the model's and the bootstrap's: a test the draws make wider is not clear
  const M = {
      b: [0, 0.5, 0.5],
      V: [
        [1, 0, 0],
        [0, 0.01, 0],
        [0, 0, 0.01]
      ]
    },
    narrow = A.ixTest('x', M, [1, 2], null, 1000),
    wide = A.ixTest(
      'x',
      M,
      [1, 2],
      Array.from({length: 199}, (_, i) => [0.5 + Math.sin(i) * 2, 0.5 + Math.cos(i * 1.7) * 2]),
      1000
    );
  assert.ok(narrow.p0 < 1e-6 && wide.p0 > 0.05 && wide.draws === 199, `${narrow.p0} ${wide.p0}`);
});

test('interactions: none for a subject whose photos have one view (the fish); the report runs them in every analysis', () => {
  const D = log(2, 300).map(a => Object.assign(a, {qv: null}));
  assert.strictEqual(A.zoomIx(zd(D), 0, 1), null);
  assert.strictEqual(A.confIx(D, 0, 1), null);
  assert.ok(A.lnIx(D, 0, 1), 'format × practice needs no view');
});
