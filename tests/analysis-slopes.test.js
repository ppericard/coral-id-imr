// The Analyses module (analysis.js): random practice slopes in Learning (each player's and genus's own), the per-genus
// learning curves and the player profiles' learning slope (the multifactor visualisation study §5 item 7; ROADMAP
// "Analyses: next views", per-genus learning slopes). Planted slopes recovered (tests/analysis.test.js says why the
// module's tests are split).
const test = require('node:test'),
  assert = require('node:assert');
const A = require('../analysis.js');
const {withTruth, synthMeta} = require('./analysisfix.js');

test('glmm: a random slope (factor weights) gives back its planted spread beside a random level', () => {
  const R = A.rng(5),
    nrm = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R()),
    y = [],
    X = [],
    k = [],
    w = [];
  for (let g = 0; g < 30; g++) {
    const a = nrm() * 0.5,
      b = 0.5 + nrm() * 0.3;
    for (let i = 0; i < 300; i++) {
      const x = R() * 4 - 2;
      y.push(R() < 1 / (1 + Math.exp(-(a + b * x))) ? 1 : 0);
      X.push([1, x]);
      k.push('g' + g);
      w.push(x);
    }
  }
  const F = [A.factor('g', k), A.factor('g slope', k, w)],
    M = A.glmm(y, X, F, {});
  assert.ok(Math.abs(Math.sqrt(F[1].tau2) - 0.3) < 0.08, `slope SD ${Math.sqrt(F[1].tau2)}`);
  assert.ok(Math.abs(Math.sqrt(F[0].tau2) - 0.5) < 0.15, `level SD ${Math.sqrt(F[0].tau2)}`);
  assert.ok(Math.abs(M.b[1] - 0.5) < 0.15, `common slope ${M.b[1]}`);
});

// 16 players of 900 answers, a level above the fixture's so answers sit away from the guess floor
const log = (seed, flat = 0, own = () => 0) => {
  const {photos, meta, look} = synthMeta(),
    pl = Array.from({length: 16}, (_, i) => ['P' + i, 1 + ((i % 5) - 2) * 0.4, 900, 0.05, own(i)]);
  return {
    pl,
    D: withTruth({learn: {flatG: flat}}, () => A.prep(A.synth({players: pl, photos, look, start: 0, end: 200 * 864e5, seed}), meta))
  };
};

test('per-genus learning curves: genera planted flat get the lowest slopes and a clear spread; without them, little', () => {
  const on = A.learning(log(1, 4).D, 0, 1),
    off = A.learning(log(1, 0).D, 0, 1),
    sd = r => r.effects.find(e => e.k === 'sd_gslope'),
    sl = r => Object.fromEntries(r.gcurve.g.map(g => [g.k, g.sl[0]])),
    S = sl(on),
    low = Object.keys(S)
      .sort((a, b) => S[a] - S[b])
      .slice(0, 4)
      .sort();
  assert.deepStrictEqual(low, ['Gen0', 'Gen1', 'Gen2', 'Gen3'], JSON.stringify(S));
  ['Gen0', 'Gen1', 'Gen2', 'Gen3'].forEach(g => assert.ok(S[g] < 0.3, `${g} ${S[g]}`));
  assert.ok(sd(on).v === 'clear' && sd(on).est > 0.12 && sd(off).est < 0.06, `${sd(on).est} ${sd(off).est}`);
  // each genus: its bins add up to its answers; sorted by its chance today, lowest first; a flat genus needs more answers
  on.gcurve.g.forEach(g =>
    assert.strictEqual(
      g.b.reduce((t, b) => t + b[1], 0),
      g.n,
      g.k
    )
  );
  assert.ok(on.gcurve.g.every((g, i, L) => !i || L[i - 1].at <= g.at));
  const need = Object.fromEntries(on.genus.map(g => [g.k, g.est]));
  assert.ok(need.Gen0 > need.Gen9 && need.Gen1 > need.Gen9, JSON.stringify(need));
  // nothing flagged flat without a planted one
  assert.ok(off.gcurve.g.every(g => !g.flat));
});

test('player profiles: the learning slope follows each player’s planted own slope', () => {
  const own = i => 0.4 * (((i * 7) % 16) / 15 - 0.5) * Math.sqrt(12),
    {pl, D} = log(2, 0, own),
    pr = A.profiles(D, 0, 1),
    f = A.PROF_F.findIndex(x => x[0] === 'slope'),
    est = pl.map(([id]) => pr.who.find(w => w.k === id).v[f]),
    tru = pl.map(x => x[4]),
    m = L => L.reduce((s, v) => s + v, 0) / L.length,
    c = (a, b) => {
      const ma = m(a),
        mb = m(b);
      return m(a.map((v, i) => (v - ma) * (b[i] - mb))) / Math.sqrt(m(a.map(v => (v - ma) ** 2)) * m(b.map(v => (v - mb) ** 2)));
    };
  assert.ok(c(est, tru) > 0.8, `correlation ${c(est, tru)}: ${est.map(v => v.toFixed(2))}`);
  const r = A.learning(D, 0, 1).effects.find(e => e.k === 'sd_pslope');
  assert.ok(r.v === 'clear' && Math.abs(r.est - 0.4) < 0.15, JSON.stringify(r));
});

test('plainOf: the spread of the learning slope reads as the gain from twice as many answers', () => {
  const P = A.plainOf('learn', {k: 'sd_gslope', sd: true, est: 0.3, lo: 0.2, hi: 0.4, v: 'clear'}, {typ: {p: 0.75, g: 0.25}, b1: 0.5});
  assert.ok(/a typical genus gains between \+\d+ points and \+\d+ points of right answers from twice as many answers/.test(P.text), P.text);
  assert.strictEqual(P.tone, 'info');
});
