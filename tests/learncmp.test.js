'use strict';
// tools/learncmp.js (rule L11; docs/LEARNING.md "Validating a learning change"): the paired comparison of two learnsim
// --out files, on fixed inputs.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const L = require('../tools/learncmp.js');

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

// A learnsim --out file: profiles x seeds runs, rows at the checkpoints from row(profile, seed, q), preOW from pre(...).
function file({subject = 'fish', profiles = ['beginner', 'expert'], seeds = 5, cps = [100, 300], row, pre = () => []}) {
  const runs = [];
  profiles.forEach((p, pi) => {
    for (let s = 1; s <= seeds; s++) runs.push({profile: p, seed: s, rows: cps.map(q => ({q, ...row(pi, s, q)})), preOW: pre(pi, s)});
  });
  return {subject, seeds, seed0: 0, questions: Math.max(...cps), checkpoints: cps, learnerKind: 'item', runs};
}

test('the paired bound: a one-sided paired t on n - 1 degrees of freedom, on the side of harm', () => {
  // d = 1..5: mean 3, sd sqrt(2.5), se sqrt(0.5); t(0.90, 4) = 1.533206.
  const p = L.paired([0, 0, 0, 0, 0], [1, 2, 3, 4, 5], -1, 0.9);
  assert.strictEqual(p.n, 5);
  close(p.d, 3);
  close(p.bound, 3 - 1.533206 * Math.sqrt(0.5), 1e-5);
  close(L.paired([0, 0, 0, 0, 0], [1, 2, 3, 4, 5], 1, 0.9).bound, 3 + 1.533206 * Math.sqrt(0.5), 1e-5);
  // Two looks: the bound at 95%, t(0.95, 4) = 2.131847.
  close(L.paired([0, 0, 0, 0, 0], [1, 2, 3, 4, 5], -1, 0.95).bound, 3 - 2.131847 * Math.sqrt(0.5), 1e-5);
  // Missing values drop their pair; the correlation of before and after.
  const q = L.paired([1, 2, 3, null], [2, 4, 6, 1], 1);
  assert.strictEqual(q.n, 3);
  close(q.r, 1);
});

test('verdicts: held inside the margin, breached when the mean crosses it, unclear between', () => {
  const v = (d, bound, harm = -1) => L.verdict({n: 5, d, bound}, harm, 0.02);
  assert.strictEqual(v(-0.001, -0.015), 'held');
  assert.strictEqual(v(-0.01, -0.03), 'unclear');
  assert.strictEqual(v(-0.03, -0.05), 'breached');
  assert.strictEqual(v(0.01, 0.015, 1), 'held');
  assert.strictEqual(v(0.01, 0.025, 1), 'unclear');
  assert.strictEqual(L.verdict({n: 1, d: 0, bound: NaN}, -1, 0.02), 'unclear');
  assert.strictEqual(L.verdict({n: 0}, -1, 0.02), 'not measured');
});

test('margins: the larger of the absolute and the relative one; the corals keep 2 genera met', () => {
  const met = L.GUARDRAILS.find(g => g.m === 'met'),
    first = L.GUARDRAILS.find(g => g.m === 'firstOW');
  assert.strictEqual(L.marginOf(met, 30, 'fish'), 2);
  close(L.marginOf(met, 60, 'fish'), 3);
  assert.strictEqual(L.marginOf(met, 60, 'coral'), 2);
  assert.strictEqual(L.marginOf(first, 30, 'fish'), 10);
  close(L.marginOf(first, 60, 'fish'), 12);
});

test('the stratified sign-flip: exact up to 20 pairs, scale-free per profile, seeded draws above', () => {
  // 20 pairs all down: the two most extreme patterns of 2^20.
  const all = Array.from({length: 20}, (_, i) => ({profile: 'p' + (i % 4), d: -(1 + (i % 3))}));
  const s = L.stratSignFlip(all);
  assert.ok(s.exact);
  close(s.p, 2 / 2 ** 20, 1e-12);
  assert.ok(s.T < 0);
  // A profile's differences scaled by 1000 change nothing (standardised by its root mean square).
  const mixed = [1, -0.5, 2, 1.5, 0.3, 0.2, -0.1, 0.4, 0.6, 0.1].map((d, i) => ({profile: i < 5 ? 'a' : 'b', d}));
  const big = mixed.map(x => (x.profile === 'a' ? {...x, d: x.d * 1000} : x));
  close(L.stratSignFlip(mixed).p, L.stratSignFlip(big).p, 1e-12);
  // 40 pairs: 100,000 seeded draws, the same p every time.
  const forty = Array.from({length: 40}, (_, i) => ({profile: 'p' + (i % 4), d: i % 5 ? 1 : -1}));
  const a = L.stratSignFlip(forty),
    b = L.stratSignFlip(forty);
  assert.ok(!a.exact && a.draws === 100000);
  assert.strictEqual(a.p, b.p);
  // A profile with no difference at all adds nothing.
  assert.strictEqual(
    L.stratSignFlip([
      {profile: 'x', d: 0},
      {profile: 'x', d: 0}
    ]).T,
    0
  );
});

test('E = bar - D* over the units met, and the share under ease 4 before Open Water', () => {
  close(L.overOf({gs: {A: 0.5, B: 0.9}, ds: {A: 0.4, B: 0.6}}), 0.2);
  assert.strictEqual(L.overOf(null), null);
  // Under Open Water: 4 questions, 1 under ease 4, 1 with no judged ease (never hard); past Open Water ignored.
  const run = {
    preOW: [
      [1, 5],
      [1, 3],
      [1, 0],
      [0, 1],
      [1, 4],
      [1, 2]
    ]
  };
  close(L.hardShare(run, 5), 1 / 4);
  close(L.hardShare(run, 6), 2 / 5);
  // The corals: no judged ease anywhere.
  assert.strictEqual(
    L.hardShare(
      {
        preOW: [
          [1, 0],
          [0, 0]
        ]
      },
      2
    ),
    null
  );
});

// Before and after: the after file loses 0.01 of knowledge everywhere at 300 (held), the expert 2.5 units met at 100
// (breached), and its share under ease 4 falls in every pair (the primary).
const before = file({
    row: (p, s, q) => ({knowSlate: 0.5 + 0.01 * s + 0.1 * p, met: 20 + s + (q === 300 ? 9 : 0), f: {gs: {A: 0.6}, ds: {A: 0.5}}}),
    pre: (p, s) => Array.from({length: 300}, (_, i) => [1, i % 3 === 0 ? 2 : 5])
  }),
  after = file({
    row: (p, s, q) => ({
      knowSlate: 0.49 + 0.01 * s + 0.1 * p + (s % 2 ? 0.002 : -0.002),
      met: 20 + s + (q === 300 ? 9 : 0) - (p === 1 && q === 100 ? 2.5 : 0),
      f: {gs: {A: 0.6}, ds: {A: 0.5}}
    }),
    pre: (p, s) => Array.from({length: 300}, (_, i) => [1, i % (10 + s) === 0 ? 2 : 5])
  });

test('compare: the guardrails at the checkpoints both files reach, the primary pooled then per profile', () => {
  const R = L.compare(before, after, {primary: {at: ['hard', 300], dir: 'down'}});
  assert.strictEqual(R.pairs, 10);
  assert.deepStrictEqual(R.profiles, ['beginner', 'expert']);
  const G = m => R.guardrails.find(g => g.m === m);
  assert.deepStrictEqual(
    G('know').at.map(a => a.cp),
    [300]
  );
  assert.deepStrictEqual(
    G('know').at[0].per.map(x => x.verdict),
    ['held', 'held']
  );
  const met100 = G('met').at.find(a => a.cp === 100).per;
  assert.deepStrictEqual(
    met100.map(x => x.verdict),
    ['held', 'breached']
  );
  assert.strictEqual(G('score').measured, false);
  assert.strictEqual(G('over').at[0].per[0].verdict, 'held');
  // The primary: down in 10 of 10 pairs, exact p 2 / 2^10; per profile tested (Holm) since the pooled one is clear.
  const P = R.primary;
  assert.ok(P.clear && P.exact);
  close(P.p, 2 / 1024, 1e-12);
  assert.strictEqual(P.way, 10);
  P.per.forEach(x => assert.ok(x.holm !== null && x.clear, JSON.stringify(x)));
  // The other way: significant against the declared direction, never clear, and no per-profile test.
  const U = L.compare(before, after, {primary: {at: ['hard', 300], dir: 'up'}}).primary;
  assert.ok(!U.clear && U.p <= 0.05);
  U.per.forEach(x => assert.strictEqual(x.holm, null));
});

test('a declared cost replaces the margin; looks tighten the bound and the primary', () => {
  const R = L.compare(before, after, {costs: {'met@100': -3}});
  const per = R.guardrails.find(g => g.m === 'met').at.find(a => a.cp === 100).per;
  assert.deepStrictEqual(
    per.map(x => [x.cost, x.verdict]),
    [
      [true, 'held'],
      [true, 'held']
    ]
  );
  const R2 = L.compare(before, after, {looks: 2});
  close(R2.conf, 0.95);
  close(R2.alpha, 0.025);
});

test('the files must say their subject, or --subject does', () => {
  const b = {...before, subject: undefined},
    a = {...after, subject: undefined};
  assert.throws(() => L.compare(b, a), /subject/);
  assert.strictEqual(L.compare(b, a, {subject: 'coral'}).subject, 'coral');
});

test('the command line prints the Markdown report', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'learncmp-')),
    fb = path.join(dir, 'b.json'),
    fa = path.join(dir, 'a.json'),
    fj = path.join(dir, 'r.json');
  fs.writeFileSync(fb, JSON.stringify(before));
  fs.writeFileSync(fa, JSON.stringify(after));
  const out = execFileSync(process.execPath, [
    path.join(__dirname, '..', 'tools', 'learncmp.js'),
    fb,
    fa,
    '--primary',
    'hard@300:down',
    '--json',
    fj
  ]).toString();
  assert.match(out, /\*\*Primary: Share under ease 4 before Open Water, hard@300, down\*\*/);
  assert.match(out, /\*\*clear \(down\)\*\*/);
  assert.match(out, /Not held: met@100 expert: breached/);
  assert.match(out, /Not measured by these files: The global score as shown/);
  assert.strictEqual(JSON.parse(fs.readFileSync(fj, 'utf8')).pairs, 10);
  assert.match(
    execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', 'learncmp.js'), '--list']).toString(),
    /met .*corals: 2/
  );
  fs.rmSync(dir, {recursive: true});
});
