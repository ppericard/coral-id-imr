// The genus wrongly given in the Elo (2026-11-03, docs/LEARNING.md "The genus wrongly given in the Elo"): the app's
// own Elo (model.js abilityStep, run by tools/abilityeval.js on stubs) replayed on a made-up answer log of a strong
// player whose misses fall on look-alikes. The old rule (a: a full miss step on the genus given, at difficulty 0,
// its uncertainty never shrinking) drags every genus the player confuses down; the rule the app now follows (e: no
// step on the genus given, rule 13 kept in the progress) leaves the abilities near the truth and predicts the next
// answer better.
const test = require('node:test');
const assert = require('node:assert');
const {evaluate, kOf} = require('../tools/abilityeval.js');

// A seeded generator (mulberry32), so the log is the same on every run.
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const sig = x => 1 / (1 + Math.exp(-x));
// readAnswers rows [id, time ms, genus shown, answered, right, mode, photos, expected, ability, new, choices]: the app
// logs the expectation it had (ability th0, here a fixed 0) against the photo's difficulty d, which the replay recovers.
function log(truth, n, seed) {
  const r = rng(seed),
    G = ['Acropora', 'Montipora', 'Porites', 'Goniopora', 'Favites', 'Dipsastraea', 'Platygyra', 'Leptoria'],
    pair = g => G[G.indexOf(g) ^ 1], // each genus has one look-alike
    rows = [];
  for (let i = 0; i < n; i++) {
    const t = G[Math.floor(r() * G.length)],
      k = r() < 0.5 ? 2 : 4,
      d = truth - 1 + (r() - 0.5),
      p = 1 / k + (1 - 1 / k) * sig(truth - d),
      ok = r() < p,
      e = 1 / k + (1 - 1 / k) * sig(0 - d);
    rows.push(['p1', 1e12 + i * 1e4, t, ok ? t : pair(t), ok ? 1 : 0, `quiz|k${k}`, 'x', Math.round(e * 1000) / 1000, 0, 1, '']);
  }
  return rows;
}

test('number of choices as the app scored them', () => {
  assert.strictEqual(kOf('quiz|k2', ''), 2);
  assert.strictEqual(kOf('quiz|t', ''), Infinity);
  assert.strictEqual(kOf('quiz-duel|Halomitra|Danafungia', ''), 2);
  assert.strictEqual(kOf('quiz', 'A B C'), 3);
  assert.strictEqual(kOf('quiz', 'A B C D'), 4);
});

test('a strong player: no Elo step on the genus wrongly given keeps the abilities near the truth', () => {
  const truth = 1.5,
    {res, ref} = evaluate(log(truth, 400, 7), {variants: ['a', 'e'], min: 1}),
    a = res.a.per.p1,
    e = res.e.per.p1;
  // The old rule drags the genera down, well below the static fit of the same answers.
  assert.ok(ref.p1.genus - a.genus > 0.4, `old rule ${a.genus.toFixed(2)} vs fit ${ref.p1.genus.toFixed(2)}`);
  assert.ok(Math.abs(e.genus - truth) < Math.abs(a.genus - truth), `e ${e.genus.toFixed(2)}, a ${a.genus.toFixed(2)}`);
  assert.ok(e.genus > a.genus + 0.3, `e ${e.genus.toFixed(2)}, a ${a.genus.toFixed(2)}`);
  // ... and predicts the next answer better.
  assert.ok(res.e.all.ll < res.a.all.ll, `log-loss e ${res.e.all.ll} a ${res.a.all.ll}`);
  // The global level is the same Elo under both rules (only the genus wrongly given changes).
  assert.strictEqual(a.level, e.level);
});

test('a weak player is not over-rated without the step', () => {
  const truth = -0.5,
    {res} = evaluate(log(truth, 300, 11), {variants: ['a', 'e'], min: 1});
  assert.ok(res.e.per.p1.genus < truth + 0.6, `e ${res.e.per.p1.genus.toFixed(2)}`);
  assert.ok(res.e.all.ll <= res.a.all.ll + 0.005, `log-loss e ${res.e.all.ll} a ${res.a.all.ll}`);
});
