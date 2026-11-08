// The Analyses module (analysis.js), continued: the multiple-testing correction and the verdicts, the report's draws, entangled effects, the mix-up map (the first part, and why it is split: tests/analysis.test.js).
const test = require('node:test'),
  assert = require('node:assert');
const A = require('../analysis.js');
const {near, withTruth, synthMeta} = require('./analysisfix.js');

// A milestone of null effects (est ~ N(0, se), 95% interval est ± 1.96 se), on the analyses' own keys, so the primary ones
// are those analysis.js declares; one strong effect (6 se) in each family.
function fakeMilestone(R, strong) {
  const A2 = {},
    nrm = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R());
  Object.keys(A.PRIMARY).forEach(k => {
    const keys = [...A.PRIMARY[k], 'x1', 'x2', 'x3'];
    A2[k] = {
      effects: keys.map(key => {
        const se = 0.1,
          est = (strong && strong[k + ':' + key]) || nrm() * se;
        return {k: key, est, lo: est - 1.96 * se, hi: est + 1.96 * se, sesoi: 0.25, n: 2000, unit: 'logit', v: 'thin'};
      })
    };
  });
  return {n: 2000, A: A2};
}
test('a null milestone of many effects: few clears after the correction, a strong effect stays clear', () => {
  const R = A.rng(20261105),
    reps = 400,
    strong = {'learn:slope': 0.6, 'rt:x1': 0.6};
  let raw = 0,
    after = 0,
    anyPrimary = 0,
    anyFalse = 0,
    strongKept = 0,
    m = 0;
  for (let r = 0; r < reps; r++) {
    const res = A.correct(fakeMilestone(R, r % 2 ? strong : null)),
      E = Object.entries(res.A).flatMap(([k, a]) => a.effects.map(e => ({k: k + ':' + e.k, e})));
    m = E.length;
    const nul = E.filter(x => !(r % 2 && strong[x.k]));
    raw += nul.filter(x => x.e.p < 0.05).length;
    after += nul.filter(x => x.e.v === 'clear').length;
    if (nul.some(x => x.e.fam === 1 && x.e.v === 'clear')) anyPrimary++;
    if (nul.some(x => x.e.v === 'clear')) anyFalse++;
    if (r % 2) strongKept += E.filter(x => strong[x.k] && x.e.v === 'clear').length;
    const m1 = Object.values(A.PRIMARY).flat().length;
    assert.ok(res.mt.m1 === m1 && res.mt.m2 === m - m1 && m1 >= 10 && m1 <= 15, JSON.stringify(res.mt));
  }
  const per = n => n / reps;
  // printed for the PR: clears per milestone of null effects, before and after
  console.log(
    `null milestone of ${m} effects, ${reps} times: ${per(raw).toFixed(2)} clear at 95% before, ${per(after).toFixed(3)} after; a false clear among the primary effects in ${anyPrimary}, anywhere in ${anyFalse}`
  );
  assert.ok(per(raw) > 1.6 && per(raw) < 2.4, `about 5% of ${m} null effects clear at 95%: ${per(raw)}`);
  assert.ok(per(after) < 0.2, `after the correction: ${per(after)}`);
  assert.ok(anyPrimary / reps <= 0.07, `primary family: a false clear in ${anyPrimary} of ${reps} milestones (Holm: 5%)`);
  assert.ok(anyFalse / reps <= 0.15, `any false clear in ${anyFalse} of ${reps} milestones`);
  assert.strictEqual(strongKept, reps, 'both strong effects (one primary, one exploratory) stay clear in every milestone');
});

test('a correction never turns a 95% non-clear into clear, and a thin effect needs more answers than it has', () => {
  const res = A.correct(fakeMilestone(A.rng(7), {'zoom:x1': 0.35, 'back:slope': 0.25}));
  Object.values(res.A).forEach(a =>
    a.effects.forEach(e => {
      assert.ok(e.pa >= e.p, e.k);
      if (e.v === 'clear') assert.ok(e.lo > 0 || e.hi < 0, e.k);
      if (e.v === 'clear') assert.ok(e.alo > 0 || e.ahi < 0, 'its adjusted interval leaves 0 out too');
      if (e.v !== 'clear') assert.ok(e.alo <= 0 && e.ahi >= 0, e.k);
    })
  );
  const z = res.A.zoom.effects.find(e => e.k === 'x1');
  assert.ok(z.p < 0.05 && z.fam === 2, 'clear at 95% (3.5 se)');
  if (z.v === 'thin') assert.ok(z.need > z.n, `${z.need} answers for ${z.n}: it needs more than it has`);
});

test('a synthetic log with no effect but two: the correction keeps the two, and the null ones are rarely clear', () => {
  const NULL = {
    rt: {right: 0, typed: 0.4, enl: 0, two: 0, sdPlayer: 0, sdGenus: 0, sdPhoto: 0},
    ph: {medium: 0, macro: 0, fair: 0, poor: 0, sharp: 0, own: 0, inat: 0, alone: 0, sdPhoto: 0},
    learn: {afterMiss: 0, again: 0},
    fmt: {k2: [0.5, 0], typed: [0, 0], again: [0.5, 0]},
    zoom: 0,
    back: 0,
    sess: {wrong: 0, streak: 0}
  };
  const {photos, meta, look} = synthMeta(),
    pl = Array.from({length: 12}, (_, i) => ['P' + i, 0, 450, 0.1]);
  const r = withTruth(NULL, () => A.runAll(A.synth({players: pl, photos, look, start: 0, end: 200 * 864e5, seed: 5}), meta, {B: 0}));
  const E = Object.entries(r.A).flatMap(([k, a]) => (a.effects || []).filter(e => e.fam).map(e => ({k: k + ':' + e.k, e})));
  // the learning slope (practice works) and typed answers taking longer stay in the generator: both must stay clear; the
  // generator's genera differ in difficulty (photo: SD genus), so pairs of genera differ in mix-ups (SD pair): not null
  // The spreads (SD) are left out of the count: an SD's estimate never reaches 0, so a spread that is really 0 reads clear
  // with or without a correction (pOf); that is a limit of the SD's interval, not of the correction.
  // Typed answers in Learning curves are tested as right answers against the choice questions' (correct): with no guess
  // floor they are truly right less often, so that effect is not null either.
  const kept = ['learn:slope', 'rt:typed'],
    nul = E.filter(x => !kept.includes(x.k) && x.k !== 'learn:typed' && !x.e.sd),
    before = nul.filter(x => x.e.p < 0.05).map(x => x.k),
    after = nul.filter(x => x.e.v === 'clear').map(x => x.k);
  console.log(
    `null synthetic log, ${nul.length} null effects tested: ${before.length} clear at 95% before (${before.join(', ')}), ${after.length} after (${after.join(', ')})`
  );
  kept.forEach(k => assert.strictEqual(E.find(x => x.k === k).e.v, 'clear', k));
  assert.ok(after.length <= 1 && after.length <= before.length, `${after.length} null effects clear after the correction`);
  assert.ok(!nul.some(x => x.e.fam === 1 && x.e.v === 'clear'), 'no null primary effect is clear');
});

test('report: 999 draws by default for the latest milestone, fewer for the history, none beyond the cap', () => {
  assert.strictEqual(A.BOOT, 999);
  const {photos, meta, look} = synthMeta(),
    pl = Array.from({length: 6}, (_, i) => ['P' + i, 0.3 * i - 0.8, 520, 0.1]),
    rows = A.synth({players: pl, photos, look, start: 0, end: 200 * 864e5, seed: 3});
  assert.ok(rows.length >= 3000, String(rows.length));
  // B 2 and Bh 1, three distinct budgets at the fewest fits (each draw is a whole refit)
  const rep = A.report(rows.slice(0, 3000), meta, null, {B: 2, Bh: 1, hcap: 2000, seed: 1});
  assert.deepStrictEqual(
    rep.M.map(M => rep.R[M].B),
    [0, 1, 2],
    'latest 2, then 1 for the 2000 answers that fit under the cap, 0 beyond'
  );
  assert.ok(rep.R[3000].mt.m1 > 0 && rep.R[3000].mt.m2 > 0, 'every milestone is corrected');
  // Recompute here's live look at all the answers takes the latest's draws too; the round milestones keep their budget
  // (the newest round thousand is still "the latest" for the history's cap), reused from the stored report
  assert.ok(rows.length > 3000 && rows.length < 4000, String(rows.length));
  const lv = A.report(rows, meta, rep, {B: 2, Bh: 1, hcap: 2000, seed: 1, live: 1});
  assert.deepStrictEqual(lv.M, [1000, 2000, 3000, rows.length]);
  assert.deepStrictEqual(
    lv.M.map(M => lv.R[M].B),
    [0, 1, 2, 2]
  );
  assert.strictEqual(lv.R[3000], rep.R[3000], 'the newest milestone reused');
  // the same draws for the same answers (seeded): the latest milestone computed again on its own, as report runs it
  // (a whole second report refitted the two earlier milestones too, for nothing)
  const again = A.runAll(
    rows.slice(0, 3000).sort((a, b) => a[1] - b[1]),
    meta,
    {M: 3000, B: 2, seed: 1}
  );
  assert.deepStrictEqual(again.A.rt.effects, rep.R[3000].A.rt.effects);
  // the browser's quicker interval (normal, from the draws' spread) stays within the draws' range (3 draws: a spread;
  // on fewer answers, 1000, no effect is bootstrapped and the check would hold on nothing)
  const se = A.runAll(rows.slice(0, 3000), meta, {B: 3, bse: true, seed: 1});
  assert.strictEqual(se.bse, 1);
  const boot = se.A.rt.effects.filter(e => e.boot);
  assert.ok(boot.length > 0, 'some effects bootstrapped');
  boot.forEach(e => assert.ok(e.lo <= e.est && e.est <= e.hi, e.k));
});

test('the admin draws no “new since the previous milestone” count', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'admin-analyses.js'), 'utf8');
  assert.ok(!/newly|'#New'|Clear since the previous milestone/.test(src), 'a milestone is another look at the same log, not a new finding');
  assert.ok(/B: 199, Bh: 0, bse: 1/.test(src), 'Recompute here: 199 draws, normal intervals');
  // rule A2 (Codex review #588): the method stays behind the admin "?", not on the page
  assert.ok(!/class="note">Each milestone/.test(src), 'no explanatory text on the page');
});

// Codex review #588: a bootstrap draw that leaves out every answer with a feature cannot estimate it; the warm start
// must not hand back the full fit's value as if it were a draw.
test('a warm-started draw without a feature gives no value for it (not the full fit’s)', () => {
  const R = A.rng(3),
    D = [];
  for (let p = 0; p < 6; p++)
    for (let i = 0; i < 80; i++) {
      const f = p === 0 && i % 2 ? 1 : 0;
      D.push({p: 'P' + p, f, y: R() < A.ntail(-(0.3 + 0.8 * f)) ? 1 : 0});
    }
  const fit = S =>
    A.glmm(
      S.map(a => a.y),
      S.map(a => [1, a.f]),
      [
        A.factor(
          'player',
          S.map(a => a.p)
        )
      ]
    );
  fit(D); // the full fit: the warm start of the draws
  const seen = [];
  A.boot(
    D,
    S => {
      const m = fit(S);
      seen.push([S.some(a => a.f), m.b[1]]);
      return {f: m.b[1]};
    },
    40,
    9
  );
  const without = seen.filter(x => !x[0]);
  assert.ok(without.length > 0, 'some draws leave player 0 out');
  without.forEach(x => assert.ok(!isFinite(x[1]), `a draw without the feature returned ${x[1]}`));
  assert.ok(seen.filter(x => x[0]).every(x => isFinite(x[1])));
});

// Codex review #588: an effect smaller than its sesoi, unresolved after the correction, never says fewer answers than
// it has would settle it.
test('answers needed after the correction: never fewer than the answers already in', () => {
  const res = {
    n: 1000,
    A: Object.fromEntries(
      Object.entries(A.PRIMARY).map(([k, keys]) => [
        k,
        {effects: keys.map(key => ({k: key, est: 0, lo: -0.2, hi: 0.2, sesoi: 0.25, n: 1000, unit: 'logit', v: 'margin'}))}
      ])
    )
  };
  res.A.learn.effects[0] = {k: 'slope', est: 0.15, lo: 0.0324, hi: 0.2676, sesoi: 0.25, n: 1000, unit: 'logit', v: 'clear'};
  const e = A.correct(res).A.learn.effects[0];
  assert.strictEqual(e.v, 'thin');
  assert.ok(e.need > 1000, `${e.need} answers for an effect unresolved with 1000`);
});

// Codex review #588: typed answers are read as right answers against the choice questions' (another guess floor), so
// they are tested and corrected on that contrast, not on the recognition coefficient against 0.
test('typed answers: the verdict shown is the corrected test of the contrast shown', () => {
  const se = 0.1,
    mk = (k, est) => ({k, est, lo: est - 1.96 * se, hi: est + 1.96 * se, sesoi: 0.25, n: 2000, unit: 'logit', v: 'thin'}),
    run = est => {
      const res = {
        n: 2000,
        A: {
          learn: {typ: {p: 0.75, g: 0.25, s: 6}, effects: [mk('typed', est)]},
          rt: {effects: Array.from({length: 20}, (_, i) => mk('x' + i, 1.645 * se))}
        }
      };
      A.correct(res);
      const e = res.A.learn.effects[0];
      return {e, P: A.plainOf('learn', e, res.A.learn)};
    };
  const c0 = Math.log(0.75 / 0.25) - Math.log(2); // the coefficient at which typed answers are right as often: log 1.5
  let r = run(0.15);
  assert.notStrictEqual(r.P.v, 'clear', 'p 0.1 on the contrast shown, not clear');
  near(r.e.nul, c0, 1e-6, 'tested against equal right answers');
  r = run(c0 + 0.6);
  assert.strictEqual(r.P.v, 'clear');
  assert.strictEqual(r.e.v, 'clear');
  r = run(c0);
  assert.notStrictEqual(r.P.v, 'clear', 'as many right answers: no clear effect, whatever the recognition coefficient');
});

// Codex review #588 (3rd pass): an adjusted p capped at 1 no longer gives the level the effect faces; the answers needed
// must still reach a verdict when its interval shrinks as 1/sqrt(n).
test('answers needed after the correction reach a verdict, even when the adjusted p is capped at 1', () => {
  const build = eff => ({
    n: 1000,
    A: Object.fromEntries(
      Object.entries(A.PRIMARY).map(([k, keys]) => [
        k,
        {effects: keys.map(key => ({k: key, est: 0, lo: -0.2, hi: 0.2, sesoi: 0.25, n: 1000, unit: 'logit', v: 'margin'}))}
      ])
    )
  });
  const base = {k: 'slope', est: 0.4, lo: -0.7624, hi: 1.5624, sesoi: 0.25, n: 1000, unit: 'logit', v: 'thin'};
  const r1 = build();
  r1.A.learn.effects[0] = {...base};
  const e = A.correct(r1).A.learn.effects[0];
  assert.strictEqual(e.v, 'thin');
  const f = Math.sqrt(1000 / e.need),
    r2 = build();
  r2.A.learn.effects[0] = {...base, lo: 0.4 - 1.1624 * f, hi: 0.4 + 1.1624 * f, n: e.need};
  const e2 = A.correct(r2).A.learn.effects[0];
  assert.notStrictEqual(e2.v, 'thin', `${e.need} answers: still undecided (adjusted p ${e2.pa})`);
});

// Codex review #591: Recompute here on an empty log (no milestone and, with 0 answers, no live point) gives a report with
// no point at all; the page treats it as no report ("No report yet"), never reading a milestone that is not there.
test('admin: a report without any point counts as no report', () => {
  const vm = require('vm'),
    src = require('fs').readFileSync(require('path').join(__dirname, '..', 'admin-analyses.js'), 'utf8'),
    ctx = vm.createContext({ANALYSIS: A, store: {get: (k, d) => d, set() {}}, HELP: {}, addEventListener() {}});
  vm.runInContext(src, ctx);
  const empty = A.report([], {ph: {}}, null, {B: 0, live: 1});
  assert.deepStrictEqual([empty.M, empty.live], [[], undefined]);
  ctx.EMPTY = empty;
  assert.strictEqual(vm.runInContext("ANREP = {st: 'ok', rep: EMPTY}; anRep()", ctx), null, 'stored');
  assert.strictEqual(
    vm.runInContext("AN.src = 'local'; ANLOC = {rep: EMPTY}; ANREP = {st: 'none', rep: null}; anRep()", ctx),
    null,
    'this tab'
  );
  const one = {M: [1000], R: {1000: {A: {}}}, answers: 1200};
  ctx.ONE = one;
  assert.strictEqual(vm.runInContext('ANLOC = {rep: ONE}; anRep()', ctx), one);
});

/* ---------- Structure views (the multifactor visualisation study of 2026-11-05; Pierre's Q70-Q77) ---------- */
test('entOf: two entangled conditions read as hard to tell apart, an independent one does not', () => {
  const R = A.rng(5),
    nrm = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R()),
    y = [],
    X = [],
    kp = [];
  for (let i = 0; i < 4000; i++) {
    const a = nrm(),
      b = a + 0.25 * nrm(), // planted: b follows a closely
      c = nrm(); // independent
    X.push([1, a, b, c]);
    kp.push('p' + (i % 20));
    y.push(0.5 * a + 0.5 * b + 0.3 * c + nrm());
  }
  const M = A.lmm(y, X, [A.factor('player', kp)]),
    E = A.entOf(M.V, X, [null, 'a', 'b', 'c']);
  assert.deepStrictEqual(E.k, ['a', 'b', 'c']);
  assert.ok(E.r[1][0] < -0.9, `estimates of a and b: r = ${E.r[1][0]}`);
  assert.ok(E.x[1][0] > 0.9, `conditions a and b: r = ${E.x[1][0]}`);
  assert.ok(E.vif[0] > 5 && E.vif[1] > 5, `VIF of a and b: ${E.vif}`);
  assert.ok(E.vif[2] < 1.2 && Math.abs(E.r[2][0]) < 0.15 && Math.abs(E.x[2][1]) < 0.15, `c stays apart: ${JSON.stringify(E)}`);
  // an effect reported with the opposite sign (a difficulty) flips its correlations with the others, not its VIF
  const F = A.entOf(M.V, X, [null, 'a', 'b', 'c'], [1, -1, 1, 1]);
  assert.strictEqual(F.r[1][0], -E.r[1][0]);
  assert.strictEqual(F.x[1][0], E.x[1][0]);
  assert.deepStrictEqual(F.vif, E.vif);
  // a condition that never varies is left out; fewer than two effects: nothing to compare
  assert.deepStrictEqual(
    A.entOf(
      M.V,
      X.map(x => [x[0], x[1], 0, x[3]]),
      [null, 'a', 'b', 'c']
    ).k,
    ['a', 'c']
  );
  assert.strictEqual(A.entOf(M.V, X, [null, 'a', null, null]), null);
});

test('hclust: planted groups come back, each a block in the leaf order; cutTree splits them', () => {
  // three groups of points on a line, far apart: average linkage and Ward find them
  const pts = [0, 0.1, 0.25, 5, 5.2, 5.1, 10, 10.3, 9.9, 10.1],
    D = pts.map(a => pts.map(b => Math.abs(a - b))),
    D2 = D.map(r => r.map(v => v * v));
  for (const [T, h] of [
    [A.hclust(D), 2],
    [A.hclust(D2, 'ward'), 3]
  ]) {
    assert.strictEqual(T.m.length, pts.length - 1);
    assert.deepStrictEqual(
      [...T.order].sort((a, b) => a - b),
      pts.map((_, i) => i)
    );
    assert.ok(
      T.m.every((x, k) => !k || x[2] >= T.m[k - 1][2] - 1e-9),
      'heights never fall (monotone linkage)'
    );
    const G = A.cutTree(T, pts.length, h).map(L => L.slice().sort((a, b) => a - b));
    assert.deepStrictEqual(
      G.slice().sort((a, b) => a[0] - b[0]),
      [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8, 9]
      ]
    );
    // each group sits together in the leaf order
    G.forEach(L => {
      const at = L.map(i => T.order.indexOf(i)).sort((a, b) => a - b);
      assert.strictEqual(at[at.length - 1] - at[0], L.length - 1, 'contiguous: ' + L);
    });
  }
  assert.deepStrictEqual(A.hclust([[0]]), {m: [], order: [0]});
});

// A made-up log of 4-choice questions on 12 genera in 3 planted families: a wrong answer goes to a genus of the same family
// `w` times as often as to another genus offered (w = 1: no structure).
const mixLog = (w, seed) => {
  const R = A.rng(seed),
    G = ['A', 'B', 'C'].flatMap(f => [0, 1, 2, 3].map(i => f + i)),
    fam = g => g[0],
    rows = [];
  let t = 0;
  for (let p = 0; p < 8; p++)
    for (let i = 0; i < 700; i++) {
      const g = G[Math.floor(R() * G.length)],
        ch = [g];
      // two choices from its family when there are, one from elsewhere
      while (ch.length < 4) {
        const same = R() < 0.5,
          L = G.filter(x => !ch.includes(x) && (fam(x) === fam(g)) === same);
        ch.push(L[Math.floor(R() * L.length)]);
      }
      const right = R() < 0.7,
        wr = ch.slice(1).map(x => (fam(x) === fam(g) ? w : 1));
      let r = R() * wr.reduce((s, x) => s + x, 0);
      const ans = right ? g : ch.slice(1).find((x, k) => (r -= wr[k]) < 0) || ch[3];
      rows.push(['p' + p, (t += 60e3), g, ans, right ? 1 : 0, 'quiz', 'f' + g, 0.7, 0, 0, A.shuffle(ch, R).join(' '), 0, 5, 0]);
    }
  return rows;
};

test('mix-up map: planted families of mix-ups come back as blocks; no family from noise', () => {
  const r = A.confusions(A.prep(mixLog(6, 3)), 0, 1),
    m = r.map;
  assert.ok(m && m.g.length === 12, JSON.stringify(m && m.g));
  const F = m.fam.map(L => L.map(i => m.g[i]).sort());
  assert.deepStrictEqual(
    F.slice().sort((a, b) => a[0].localeCompare(b[0])),
    [
      ['A0', 'A1', 'A2', 'A3'],
      ['B0', 'B1', 'B2', 'B3'],
      ['C0', 'C1', 'C2', 'C3']
    ]
  );
  m.fam.forEach(L => assert.strictEqual(Math.max(...L) - Math.min(...L), L.length - 1, 'a family is a block on the diagonal'));
  // every merge points at leaves in display order or earlier merges; the cells are in display order and their rates shrunk
  m.m.forEach(([a, b], k) => [a, b].forEach(x => assert.ok(x < 12 + k, 'merge ' + k)));
  assert.ok(
    m.cells.every(([i, j, off, mix, sr]) => i !== j && off >= mix && sr > 0 && sr < 1),
    'cells: shown, answered, offers, mix-ups, rate'
  );
  const inFam = m.cells.filter(c => m.g[c[0]][0] === m.g[c[1]][0]),
    outFam = m.cells.filter(c => m.g[c[0]][0] !== m.g[c[1]][0]),
    avg = L => L.reduce((s, c) => s + c[4], 0) / L.length;
  assert.ok(avg(inFam) > 2 * avg(outFam), `rates within families ${avg(inFam)} against across ${avg(outFam)}`);
  m.across.forEach(([i, j]) => assert.notStrictEqual(m.g[i][0], m.g[j][0], 'across = between two families'));
  // the same log with wrong answers spread evenly: no pair clearly above a typical one, so no family
  const flat = A.confusions(A.prep(mixLog(1, 3)), 0, 1).map;
  assert.ok(flat && flat.fam.length === 0, JSON.stringify(flat && flat.fam));
});

test('synthetic log: each analysis reports its entangled effects on its own keys; the report carries them', () => {
  const fs = require('fs'),
    data = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'data.json'))),
    rows = A.demoLog(data, Date.UTC(2026, 10, 1)),
    r = A.runAll(rows, {ph: A.photoMeta(data)}, {B: 0});
  for (const k of ['rt', 'zoom', 'photo', 'fmt', 'conf', 'learn', 'sess']) {
    const a = r.A[k],
      E = a.ent;
    assert.ok(E && E.k.length >= 2, k);
    const keys = new Set(a.effects.map(e => e.k));
    E.k.forEach(x => assert.ok(keys.has(x), `${k}: ${x} is one of its effects`));
    assert.strictEqual(E.r.length, E.k.length);
    E.r.forEach((row, i) => (assert.strictEqual(row.length, i), row.forEach(v => assert.ok(v == null || Math.abs(v) <= 1.0001, k))));
  }
  // Formats: a guess rate and its difficulty are estimated together (known to trade off); two formats are independent
  const f = r.A.fmt.ent;
  assert.ok(f.r[1][0] != null && f.r[2][0] === null && !f.x, JSON.stringify(f));
  // the demo plays look-alikes as mix-ups (synth TRUTH.mix): the map finds families, each pair of genera of a family
  // linked through the genus sheets' look-alikes
  const m = r.A.conf.map,
    look = g => (data.gen[g] && data.gen[g].look) || [];
  assert.ok(m.fam.length >= 3, JSON.stringify(m.fam));
  m.fam.forEach(L => {
    const N = L.map(i => m.g[i]);
    assert.ok(
      N.every(a => N.some(b => b !== a && (look(a).includes(b) || look(b).includes(a)))),
      'each genus of a family has a look-alike in it: ' + N
    );
  });
});
