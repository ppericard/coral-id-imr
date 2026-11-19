'use strict';
require('./slot.js').testGuard();
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

// A measure that is null in every run (corals: no judged ease; a file without preOW) is not measured,
// never held; a profile with no valid pair at a measured checkpoint is named as not measured.
test('a guardrail with no valid pair is not measured, and says so', () => {
  const strip = F => ({...F, runs: F.runs.map(r => ({...r, preOW: []}))}),
    R = L.compare(strip(before), strip(after));
  assert.strictEqual(R.guardrails.find(g => g.m === 'hard').measured, false);
  assert.match(L.report(R), /Not measured by these files: [^\n]*Share under ease 4 before Open Water/);
  // One profile without it: the checkpoint is measured, that profile's cell is listed.
  const half = F => ({...F, runs: F.runs.map(r => (r.profile === 'expert' ? {...r, preOW: []} : r))}),
    R2 = L.compare(half(before), half(after)),
    out = L.report(R2);
  assert.deepStrictEqual(
    R2.guardrails.find(g => g.m === 'hard').at[0].per.map(x => x.verdict),
    ['held', 'not measured']
  );
  assert.match(out, /Share under ease 4 before Open Water at 300 for expert/);
  assert.doesNotMatch(out, /^Every guardrail measured is held\.$/m);
});

test('the files must say their subject, or --subject does', () => {
  const b = {...before, subject: undefined},
    a = {...after, subject: undefined};
  assert.throws(() => L.compare(b, a), /subject/);
  assert.strictEqual(L.compare(b, a, {subject: 'coral'}).subject, 'coral');
});

test('a file cut by the budget is marked in the report (rule L11, tools/checkbudget.js)', () => {
  const cut = {cut: true, budgetMin: 40, elapsedMin: 40, planned: 20, done: 14},
    R = L.compare(before, {...after, cut}),
    text = L.report(R);
  assert.deepStrictEqual(R.cut, [{side: 'after', ...cut}]);
  assert.match(text, /\*\*CUT \(after\): the run stopped at its 40-minute budget with 14 of 20 runs\.\*\*/);
  assert.deepStrictEqual(L.compare(before, after).cut, []);
  // an arm stopped with no run at all (the workflow's timeout): reported, and a declared primary is not read
  const none = {subject: 'fish', runs: [], cut: {...cut, planned: 0, done: 0}},
    N = L.compare(none, none, {primary: {at: ['hard', 300], dir: 'down'}});
  assert.strictEqual(N.pairs, 0);
  assert.strictEqual(N.primary, null);
  assert.strictEqual(N.cut.length, 2);
  assert.doesNotMatch(L.report(L.compare(before, after)), /CUT/);
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

// The levels, the score and the photo exposure learnsim writes (rows kinds, score, plateau; the run's owAt, kinds, c3,
// expo, preOW).
test('the levels, the score, the plateau and the photo exposure read from a run', () => {
  const run = {
    rows: [
      {
        q: 100,
        kinds: {family: {ow: 3, adv: 1}, genus: {ow: 2, adv: 0}, bonus: {ow: 5, adv: 5}},
        score: {pct: 12, entries: 0.3, credit: 0.01},
        plateau: 7
      },
      {q: 300, kinds: {family: {ow: 9, adv: 4}}, score: {pct: 20}, plateau: 11}
    ],
    owAt: {A: 40, B: 25, X: 3},
    kinds: {A: 'family', B: 'genus', X: 'bonus'},
    c3: {offer: 250, met: 260},
    expo: [
      ['A', 'o1', 'p1'],
      ['A', 'o2', 'p2'],
      ['B', 'o1', 'p1'],
      ['B', 'o3', 'p3', 'p4']
    ],
    preOW: [
      [1, 5],
      [0, 3],
      [1, 2],
      [0, 0]
    ]
  };
  assert.strictEqual(L.levels(run, 100, 'ow'), 5);
  assert.strictEqual(L.levels(run, 100, 'adv'), 1);
  assert.strictEqual(L.levels(run, 200, 'ow'), null);
  assert.strictEqual(L.firstOW(run), 25);
  assert.strictEqual(L.firstOW({owAt: {}}), null);
  assert.strictEqual(L.MEASURES.score.get(run, 300), 20);
  assert.strictEqual(L.MEASURES.entries.get(run, 100), 0.3);
  assert.strictEqual(L.MEASURES.plateau.get(run, 'run'), 11);
  assert.strictEqual(L.MEASURES.c3.get(run, 'run'), 260);
  assert.strictEqual(L.hardAnswers(run, 4), 2);
  assert.strictEqual(L.hardAnswers({preOW: [[1, 0]]}, 1), null);
  close(L.perPhoto(run, 4), 5 / 4);
  close(L.perPhoto(run, 2), 1);
  // No photo twice in a few questions (model.js SEENQ): a question whose colony, or one of whose photos, came in the
  // NEAR - 1 questions before it.
  assert.strictEqual(L.NEAR, 10);
  const ex = ['A', 'c1', 'p1'],
    near = {expo: [ex, ['B', 'c2', 'p2'], ex, ['A', 'c3', 'p4', 'p1'], ...Array(9).fill(['B', 'c9', 'p9']), ['A', 'c1', 'p1']]};
  close(L.nearRep(near, 2), 0);
  close(L.nearRep(near, 4), 2 / 4); // the same colony two questions apart; a photo of it in another colony
  close(L.nearRep(near, 13), (2 + 8) / 13); // the copies of c9, one apart
  close(L.nearRep(near, 14), (2 + 8) / 14); // c1 again 11 questions later: out of the window
  assert.strictEqual(L.nearRep({expo: []}, 5), null);
  // The share on the scientific genera: answers 1..cp on kind genus, a fish run only (its slate is families).
  close(L.genShare(run, 4), 2 / 4);
  close(L.MEASURES.genShare.get(run, 2), 0);
  assert.strictEqual(L.genShare({kinds: {A: 'genus', X: 'bonus'}, expo: [['A', 'o', 'p']]}, 1), null, 'the corals: not measured');
  // Every guardrail of LEARNING.md's table has a measure.
  L.GUARDRAILS.forEach(g => assert.ok(L.MEASURES[g.m].get, g.m));
});

// The population measures (the rated world's sheet mode): one value per seed, an exact sign-flip over the seeds.
test('population measures: the primary over the seeds, the rating error', () => {
  const pop = (s, err) => ({
      seed: s,
      at: [{q: 300, err, errW: err, corr: 0.5, gdErr: 0.2}],
      rho: 0.25
    }),
    base = {subject: 'coral', world: 'rated', seeds: 6, questions: 300, checkpoints: [300], runs: []},
    B = {...base, pop: [1, 2, 3, 4, 5, 6].map(s => pop(s, 0.6))},
    A = {...base, pop: [1, 2, 3, 4, 5, 6].map(s => pop(s, 0.6 - 0.01 * s))},
    R = L.compare(B, A, {primary: {at: L.parseAt('rateErr@300'), dir: 'down'}});
  assert.ok(R.primary.pop && R.primary.n === 6 && R.primary.way === 6);
  close(R.primary.p, 2 / 64);
  assert.strictEqual(R.primary.clear, true);
  close(R.pops.rateErr[0].d, -0.035);
  assert.strictEqual(R.pops.rateCorr[0].d, 0);
  const up = L.compare(B, A, {primary: {at: L.parseAt('rateErr@300'), dir: 'up'}});
  assert.strictEqual(up.primary.clear, false, 'against the declared direction: no claim');
  assert.match(L.report(R), /one value per seed/);
});

// After a break (learnsim --breaks; the comeback's tolerance): the break measures read per break name,
// a primary on one of them, and the report's table of every break both files took.
test('break measures: the comeback and the questions after it, per break, a primary on them', () => {
  const brk = (b, len, ok) => ({
    brk: b,
    cbLen: len,
    cbOk: ok,
    held: Math.max(10, len),
    after: 20,
    afterOk: 16,
    holdAfter: 0,
    opens: [3, 20]
  });
  const mk = shorter => ({
    subject: 'coral',
    seeds: 5,
    seed0: 0,
    questions: 300,
    checkpoints: [300],
    learnerKind: 'item',
    runs: ['beginner', 'expert'].flatMap(p =>
      [1, 2, 3, 4, 5].map(s => ({
        profile: p,
        seed: s,
        rows: [{q: 300, knowSlate: 0.5, met: 20}],
        breaks: [brk('1d', shorter ? s : s + 2, shorter ? s : s + 1), brk('1w', 40 + s, 30)]
      }))
    )
  });
  const B = mk(false),
    A = mk(true);
  assert.deepStrictEqual(L.parseAt('cbLen@1d'), ['cbLen', '1d']);
  assert.deepStrictEqual(L.parseAt('afterRight@1mo'), ['afterRight', '1mo']);
  assert.throws(() => L.parseAt('cbLen@300'), /break's name/);
  assert.throws(() => L.parseAt('know@1d'), /break's name/);
  const run = B.runs[0];
  assert.strictEqual(L.MEASURES.cbLen.get(run, '1d'), 3);
  close(L.MEASURES.cbRight.get(run, '1d'), 200 / 3);
  assert.strictEqual(L.MEASURES.cbLong.get(run, '1w'), 1);
  assert.strictEqual(L.MEASURES.cbLong.get(run, '1d'), 0);
  assert.strictEqual(L.MEASURES.open15.get(run, '1d'), 1);
  close(L.MEASURES.afterRight.get(run, '1d'), 80);
  assert.strictEqual(L.MEASURES.cbLen.get(run, '3d'), null, 'a break the run did not take');
  assert.strictEqual(L.MEASURES.cbRight.get({breaks: [brk('1d', 0, 0)]}, '1d'), null, 'no comeback: no right %');
  // A break that reached learnsim's cap of 200 questions has a cut window after the comeback; its
  // counts over that window are no pair.
  const capped = {breaks: [{brk: '1mo', cbLen: 200, cbOk: 150, held: 200, after: 0, afterOk: 0, holdAfter: 0, opens: []}]},
    short = {breaks: [{brk: '1mo', cbLen: 190, cbOk: 150, held: 190, after: 10, afterOk: 8, holdAfter: 1, opens: [2]}]};
  assert.strictEqual(L.MEASURES.open15.get(capped, '1mo'), null);
  assert.strictEqual(L.MEASURES.holdAfter.get(capped, '1mo'), null);
  assert.strictEqual(L.MEASURES.afterRight.get(capped, '1mo'), null);
  assert.strictEqual(L.MEASURES.open15.get(short, '1mo'), null);
  assert.strictEqual(L.MEASURES.holdAfter.get(short, '1mo'), null);
  close(L.MEASURES.afterRight.get(short, '1mo'), 80);
  // 2 questions shorter in each of the 10 pairs: exact p 2 / 2^10.
  const R = L.compare(B, A, {primary: {at: L.parseAt('cbLen@1d'), dir: 'down'}});
  assert.ok(R.primary.clear);
  close(R.primary.p, 2 / 1024, 1e-12);
  assert.deepStrictEqual(
    R.breaks.map(x => x.brk),
    ['1d', '1w']
  );
  const len = R.breaks[0].ms.find(x => x.m === 'cbLen').per[0];
  close(len.d, -2);
  assert.ok(len.lo <= len.d && len.hi >= len.d);
  assert.strictEqual(R.breaks[1].ms.find(x => x.m === 'cbLen').per[0].d, 0);
  const out = L.report(R);
  assert.match(out, /\*\*After a break\*\*/);
  assert.match(out, /\| Comeback questions after the break \| 5\.0 -> 3\.0, -2\.0 \[/);
  // The first session's guardrails are read too.
  assert.strictEqual(R.guardrails.find(g => g.m === 'know').at[0].per[0].verdict, 'held');
});
