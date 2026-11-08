'use strict';
// tools/ratedworld.js (rule L11; docs/LEARNING.md "Validating a learning change", "The two worlds"): the rated world's
// distributions, the app told the truth, and a short run in the shape tools/learncmp.js reads.
const test = require('node:test'),
  assert = require('node:assert');
const RW = require('../tools/ratedworld.js'),
  L = require('../tools/learncmp.js');
const X = RW.fishUnits(),
  mean = v => v.reduce((a, x) => a + x, 0) / v.length,
  sd = v => Math.sqrt(v.reduce((a, x) => a + (x - mean(v)) ** 2, 0) / (v.length - 1));

test('the fish units as the app builds them: three circles of families, the scientific genera with their family', () => {
  assert.ok(X.c1.length > 20 && X.sci.length > 50, `${X.c1.length} ${X.sci.length}`);
  X.sci.forEach(g => assert.ok(X.gen[X.gen[g].parent], g));
});

test('the world of a seed: the distributions LEARNING.md states, the same world for the same seed', () => {
  const W = RW.world(X, 1),
    e = Object.values(W.eps);
  assert.deepStrictEqual(RW.world(X, 1).mu, W.mu);
  assert.ok(Math.abs(mean(e)) < 0.03 && Math.abs(sd(e) - RW.RATED.EPS) < 0.03, `${mean(e)} ${sd(e)}`);
  const fams = [...X.c1, ...X.c2, ...X.c3].map(n => W.mu[n] - ((X.gen[n].look || []).length ? RW.RATED.LOOK : 0));
  assert.ok(Math.abs(sd(fams) - RW.RATED.FAM) < 0.12, String(sd(fams)));
  // Judged ease: 1 to 5, easier photos (lower eps) judged easier.
  const F = Object.keys(W.eps),
    lo = F.filter(f => W.eps[f] < -0.5).map(f => W.ease[f]),
    hi = F.filter(f => W.eps[f] > 0.5).map(f => W.ease[f]);
  assert.ok(Object.values(W.ease).every(x => x >= 1 && x <= 5));
  assert.ok(mean(lo) > 3.8 && mean(hi) < 2.2, `${mean(lo)} ${mean(hi)}`);
  // Heavy tails: 15% of the photos 1.5 harder; t3 keeps the spread.
  const T = Object.values(RW.world(X, 1, 'tail').eps),
    t3 = Object.values(RW.world(X, 1, 't3').eps);
  assert.ok(Math.abs(mean(T) - 0.15 * 1.5) < 0.04, String(mean(T)));
  assert.ok(Math.abs(sd(t3) - RW.RATED.EPS) < 0.08, String(sd(t3)));
  // The players' offsets.
  const pi = Array.from({length: 60}, (_, s) => RW.world(X, s + 1).pi);
  assert.ok(Math.abs(sd(pi) - RW.RATED.PI) < 0.15, String(sd(pi)));
});

test('told the truth, the app reads every photo and unit as the world has them; on its own, the judged ease alone', () => {
  const W = RW.world(X, 2),
    {ctx, M, G} = RW.engine(X, W, {app: 'truth'}),
    n = X.c1[0],
    p = G[n].views.wide[0];
  assert.ok(Math.abs(ctx.photoDiff(n, p) - (W.mu[n] + W.eps[p.f])) < 1e-12);
  assert.ok(Math.abs(M.genusDiff(n) - W.mu[n]) < 0.006, `${M.genusDiff(n)} ${W.mu[n]}`);
  const own = RW.engine(X, W, {app: 'own'});
  assert.ok(Math.abs(own.ctx.photoDiff(n, p) - (3 - p.e) * 0.5) < 1e-9);
});

test('a run: the same seed gives the same run, and learncmp reads every measure from it', () => {
  const a = RW.runOne(X, {profile: 'lectureRA', seed: 3, N: 120, cps: [100, 120]}),
    b = RW.runOne(X, {profile: 'lectureRA', seed: 3, N: 120, cps: [100, 120]});
  assert.deepStrictEqual(a.rows, b.rows);
  assert.strictEqual(a.rows.length, 2);
  const r = a.rows[0];
  ['dStar', 'met', 'right', 'plateau'].forEach(k => assert.ok(typeof r[k] === 'number', k));
  assert.ok(r.score.pct >= 0 && r.kinds.family.met === r.met, JSON.stringify(r.kinds));
  assert.strictEqual(a.preOW.length, 120);
  ['know', 'over', 'met', 'hard', 'score', 'unitsOW', 'plateau', 'perPhoto'].forEach(m =>
    assert.ok(L.MEASURES[m].get(a, L.MEASURES[m].kind === 'run' ? 'run' : 100) !== undefined, m)
  );
  assert.ok(L.MEASURES.know.get(a, 100) === r.dStar);
  // The lecture RA knows circle 1 (tools/learnprof.js).
  assert.deepStrictEqual(a.knows.sort(), X.c1.slice().sort());
});

test('the corals: the slate and the bonus genera as the app builds them, a run with its kinds', () => {
  const U = RW.unitsOf('coral');
  assert.strictEqual(U.slate.length, 40);
  assert.ok(U.slate.includes('Millepora') && U.extra.length > 0);
  assert.ok(U.views('Acropora').wide.length > 0 && U.views('Acropora').medium.length > 0);
  const W = RW.world(U, 1),
    g = U.slate.map(n => W.mu[n]);
  assert.ok(Math.abs(sd(g) - RW.RATED.CORAL_GD) < 0.15, String(sd(g)));
  const W37 = RW.world(U, 1, 'normal', {coralSd: 0.37}),
    g37 = U.slate.map(n => W37.mu[n]);
  assert.ok(Math.abs(sd(g37) / sd(g) - 0.37 / RW.RATED.CORAL_GD) < 1e-9);
  const a = RW.runOne(null, {subject: 'coral', profile: 'strongRA', seed: 2, N: 100, cps: [100]});
  assert.deepStrictEqual(Object.keys(a.rows[0].kinds).sort(), ['bonus', 'genus']);
  assert.strictEqual(a.rows[0].score.entries, undefined); // no global score: the units' mean
  assert.ok(a.knows.length >= 24 && a.knows.length < 30, String(a.knows.length));
});

test('the item learner: its gain depends on the answer; the count learner learns the same whatever the answer', () => {
  const run = learner => RW.runOne(null, {subject: 'fish', profile: 'beginner', seed: 4, N: 150, cps: [150], learner});
  const c = run('count'),
    i = run('item');
  // Same world, same first answers' draws: the two learners part only through what they learn.
  assert.strictEqual(c.pi, i.pi);
  assert.notDeepStrictEqual(c.rows[0].knowSlate, i.rows[0].knowSlate);
  assert.strictEqual(RW.ITEM.MISS, 1.5);
  assert.strictEqual(RW.ITEM.PICKED, 0.5);
});

// Codex review #787: the question as quiz.js planPhoto builds it (k from the traps, the hold's ease and the mix-ups in the
// photo's aim), and the recent observations quiz.js answer records.
test('the question: every choice counts from 2 traps, the hold and the mix-ups aim the photo lower', () => {
  const calls = {},
    M = {
      examReady: () => false,
      holdEase: () => -0.5,
      trapsFor: (t, e) => ((calls.trapsEase = e), calls.traps),
      distractors: () => ['b', 'c', 'd'],
      typedP: () => 0,
      plausibleK: () => 2,
      confTerm: () => 0.2,
      introduced: () => true,
      TYPED: {k: Infinity},
      photoSet: (t, skip, shift, k, f) => ((calls.photo = {skip, shift, k, f}), {shown: [{f: 'p'}]})
    },
    ctx = {shuffle: a => a, Math: {random: () => 0.5}},
    G = {a: {cover: 'cov.webp'}};
  calls.traps = 3;
  let q = RW.question(M, ctx, G, 'a', {list: ['a', 'b', 'c', 'd'], cards: ['a'], start: true});
  assert.strictEqual(q.k, 4);
  assert.deepStrictEqual(calls.photo, {skip: 'cov.webp', shift: -0.7, k: 4, f: 'k4'});
  assert.strictEqual(calls.trapsEase, -0.5);
  calls.traps = 1;
  q = RW.question(M, ctx, G, 'a', {list: ['a', 'b', 'c', 'd']});
  assert.strictEqual(q.k, 2);
  assert.deepStrictEqual(calls.photo, {skip: null, shift: -0.7, k: 2, f: 'k2'});
  // On the real engine: a unit known well (3 traps) is asked among 4 choices with k 4.
  const W = RW.world(X, 5),
    {ctx: c2, M: M2, G: G2} = RW.engine(X, W),
    t = X.c1[0];
  X.c1.slice(0, 8).forEach(n => (c2.P[n] = {ok: 20, ko: 0, h: '1111111111', th: 2.5}));
  const q2 = RW.question(M2, c2, G2, t, {list: X.c1.slice(0, 8)});
  assert.ok(M2.trapsFor(t, 0) >= 2);
  assert.strictEqual(q2.k, q2.chs.length);
  assert.strictEqual(q2.chs.length, 4);
});

test('the last two observations shown are recorded, as photoSet reads them', () => {
  const s = {};
  [{o: 'A'}, {o: 'B'}, {o: 'A'}, {f: 'x'}].forEach(p => RW.noteRecent(s, [p]));
  assert.deepStrictEqual(s.ro, ['A', 'x']);
  const run = RW.runOne(X, {profile: 'expert', seed: 6, N: 60, cps: [60], keep: true});
  const ro = Object.values(run.P).filter(x => x && Array.isArray(x.ro));
  assert.ok(ro.length > 3 && ro.every(x => x.ro.length <= 2), String(ro.length));
});

// Codex review #789: the judge reads only the photos the game may ask, and a typed miss may name any unit of the rank.
test('D* over the game photos only; a typed miss on a slate genus may name a bonus genus', () => {
  const U = RW.unitsOf('coral'),
    {ctx, G} = RW.engine(U, RW.world(U, 1)),
    all = [...new Set(['wide', 'medium', 'macro'].flatMap(v => G.Millepora.views[v] || []))],
    ok = RW.judgePhotos(ctx, G, 'Millepora');
  assert.ok(ok.length > 0 && ok.length < all.length, `${ok.length} of ${all.length}`);
  ok.forEach(p => assert.ok(ctx.gamePhotoOk('Millepora', p)));
  const b = U.extra[0],
    o = RW.typedOthers(G, ['Acropora', 'Porites', b], 'Acropora', () => true);
  assert.deepStrictEqual(o, ['Porites', b]);
  const F = RW.unitsOf('fish'),
    g = F.extra[0],
    fo = RW.typedOthers(RW.engine(F, RW.world(F, 1)).G, [F.slate[0], F.slate[1], g], F.slate[0], () => true);
  assert.deepStrictEqual(fo, [F.slate[1]]); // a family's typed miss names a family, never a genus
});
