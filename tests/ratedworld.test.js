'use strict';
require('./slot.js').testGuard();
// tools/ratedworld.js (rule L11; docs/LEARNING.md "Validating a learning change", "The two worlds"): the rated world's
// distributions, the app told the truth, and a short run in the shape tools/learncmp.js reads.
const test = require('node:test'),
  assert = require('node:assert');
const RW = require('../tools/ratedworld.js'),
  L = require('../tools/learncmp.js');
const X = RW.fishUnits(),
  mean = v => v.reduce((a, x) => a + x, 0) / v.length,
  sd = v => {
    // the mean once, not at each value (that is quadratic: 7 s on the world's 5,000 photos)
    const m = mean(v);
    return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1));
  };

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
  // The players' offsets (piOf: the world's pi, without building 60 worlds).
  assert.strictEqual(W.pi, RW.piOf(1));
  assert.strictEqual(RW.world(X, 7).pi, RW.piOf(7));
  const pi = Array.from({length: 60}, (_, s) => RW.piOf(s + 1));
  assert.ok(Math.abs(sd(pi) - RW.RATED.PI) < 0.15, String(sd(pi)));
});

// Units added (the genera of circles 2 and 3) never move another draw: each genus and species on a stream of
// its own, so two versions of the app with other units play the same photos and the same other units (the arms pair).
test('the world of a seed: a genus or species added or taken away moves no other draw', () => {
  const U = RW.unitsOf('fish'),
    half = U.extra.filter((n, i) => i % 2),
    W = RW.world(U, 2),
    W0 = RW.world({...U, extra: half, sp: U.sp.slice(0, 100)}, 2);
  assert.deepStrictEqual(W0.eps, W.eps);
  assert.deepStrictEqual(W0.ease, W.ease);
  Object.keys(W0.mu).forEach(n => assert.strictEqual(W0.mu[n], W.mu[n], n));
  // a genus's own offset around its family's, as RATED states
  const off = U.extra.map(n => W.mu[n] - W.mu[U.rec(n).parent] - ((U.rec(n).look || []).length ? RW.RATED.SIB : 0));
  assert.ok(Math.abs(sd(off) - RW.RATED.SUB) < 0.05 && Math.abs(mean(off)) < 0.06, `${mean(off)} ${sd(off)}`);
});

// The species level: the species units as the app builds them, drawn after everything else so a world
// without them is the same; a species opens only once its family is at Advanced, in its family's order; its record names
// the family it starts from (core.js abilityOf from, passed to scoreAnswer as quiz.js answer does).
test('the species units: the worlds of before unchanged, opened from their family’s Advanced, in its order', () => {
  const U = RW.unitsOf('fish'),
    W = RW.world(U, 4),
    W0 = RW.world({...U, sp: []}, 4);
  assert.ok(U.sp.length > 600);
  assert.deepStrictEqual(W.eps, W0.eps);
  Object.keys(W0.mu).forEach(n => assert.strictEqual(W.mu[n], W0.mu[n], n));
  U.sp.forEach(n => assert.ok(n in W.mu && X.gen[n].from === X.gen[n].parent, n));
  // 1,200 answers: the rank share (model.js SHARE) keeps the species out until some of the families are at Advanced. The
  // first species comes after a few hundred answers, varying widely by seed: a mechanism check, never a rate.
  const r = RW.runOne(X, {profile: 'expert', seed: 1, N: 1200, cps: [1200]}),
    first = {};
  r.expo.forEach((e, i) => r.kinds[e[0]] === 'species' && !(e[0] in first) && (first[e[0]] = i + 1));
  assert.ok(Object.keys(first).length >= 1, 'no species asked in 1,200 answers');
  Object.entries(first).forEach(([n, i]) => {
    const p = X.gen[n].parent,
      own = U.sp.filter(o => X.gen[o].parent === p && X.gen[o].views.wide.length);
    assert.ok(r.advAt[p] && r.advAt[p] < i, `${n} at ${i}, its family at Advanced at ${r.advAt[p]}`);
    // the earlier species of its family (with a photo) were met before it
    own.slice(0, own.indexOf(n)).forEach(o => assert.ok(o in first && first[o] < i, `${o} before ${n}`));
  });
  assert.strictEqual(r.kinds[U.sp[0]], 'species');
});

// The rank share (model.js SHARE): the units hanging from the families (their scientific genera
// and species) take at most m^POW of the drawn questions, m the share of the families in play at their threshold, and
// one more opens only while their share of the draw is under it. On the app's own model.js, in the rated world's engine.
test('the rank share: the cap from the families at Advanced, the draw scaled to it, the openings held at it', () => {
  const vm = require('vm'),
    {ctx, M} = RW.engine(X, RW.world(X, 3), {app: 'truth'}),
    S = vm.runInContext('({SHARE, sharesNow, shareW, shareRoom})', ctx),
    inPlay = X.c1, // circle 2 waits for every circle-1 family asked, circle 3 for a yes
    fam = inPlay[0],
    spOf = X.spl.filter(n => X.gen[n].parent === fam),
    gen = X.sci.find(n => X.gen[n].parent === fam),
    // a new answer count: the share is computed once per answer
    tick = () => (ctx.P['~level'] = {ok: ((ctx.P['~level'] || {}).ok || 0) + 1, ko: 0});
  assert.strictEqual(S.SHARE.POW, 2);
  assert.ok(spOf.length > 1 && gen);
  // No family at Advanced: no unit hanging from one in play (spPlay, sciOpen), and the cap 0: nothing hanging from them
  // opens or is drawn beside a family.
  ctx.Q.sci = true;
  tick();
  assert.strictEqual(S.sharesNow().cap[''] || 0, 0);
  assert.strictEqual(S.shareRoom(spOf[0]), false);
  assert.strictEqual(S.shareRoom(fam), true); // a family hangs from nothing: never held
  // Half the families in play mastered: cap 0.25; a family and three species of weight 1 each: the species 0.25 together.
  inPlay.slice(0, Math.floor(inPlay.length / 2)).forEach(n => (ctx.P[n] = {mx: 1}));
  tick();
  const m = Math.floor(inPlay.length / 2) / inPlay.length,
    c = S.sharesNow().cap[''];
  assert.ok(Math.abs(c - m * m) < 1e-12, `${c} ${m}`);
  const w = S.shareW([fam, ...spOf.slice(0, 2), gen], [1, 1, 1, 1]);
  assert.ok(Math.abs((w[1] + w[2] + w[3]) / (w[0] + w[1] + w[2] + w[3]) - c) < 1e-12, String(w));
  assert.strictEqual(w[0], 1);
  // already under the cap: unchanged
  assert.deepStrictEqual(S.shareW([fam, inPlay[1], spOf[0]], [1, 1, 0.1]), [1, 1, 0.1]);
  // nothing met hangs from the families yet: room for one
  assert.strictEqual(S.shareRoom(spOf[0]), true);
  // Every family in play mastered: the cap is 1, nothing is scaled.
  inPlay.forEach(n => (ctx.P[n] = {mx: 1}));
  tick();
  assert.strictEqual(S.sharesNow().cap[''], 1);
  assert.deepStrictEqual(S.shareW([fam, spOf[0]], [0.2, 1]), [0.2, 1]);
  assert.strictEqual(S.shareRoom(spOf[1]), true);
  // A unit's own threshold (shareAt, its data: a level or a unit whose juveniles come early): only the first family
  // mastered, the next ones with a threshold of 0 count at once, the others wait for their Advanced.
  inPlay.forEach(n => delete ctx.P[n]);
  ctx.P[fam] = {mx: 1};
  const k = 5,
    G = vm.runInContext('GX', ctx);
  inPlay.slice(1, 1 + k).forEach(n => (G(n).shareAt = 0));
  tick();
  assert.ok(Math.abs(S.sharesNow().cap[''] - ((1 + k) / inPlay.length) ** 2) < 1e-12);
  inPlay.slice(1, 1 + k).forEach(n => delete G(n).shareAt);
  assert.ok(M.LV_AT[1] === 0.8);
});

// The corals: no unit hangs from another, so the draw keeps its own weights (the same weights, not a copy scaled).
test('the rank share: a list where nothing hangs from another is drawn as before', () => {
  const vm = require('vm'),
    U = RW.unitsOf('coral'),
    {ctx} = RW.engine(U, RW.world(U, 1), {app: 'truth'}),
    S = vm.runInContext('({shareW})', ctx),
    ws = [0.5, 1, 0.2];
  assert.strictEqual(S.shareW(U.slate.slice(0, 3), ws), ws);
});

// A unit whose parent is no unit of the game hangs from nothing (the sea slugs' genera, the units of their circles, name a
// family that is only their structure): never held, even with no unit of its parent's rank mastered.
test('the rank share: a unit whose parent is not a unit of the game is never held', () => {
  const vm = require('vm'),
    {ctx} = RW.engine(X, RW.world(X, 5), {app: 'truth'}),
    S = vm.runInContext('({sharesNow, shareW, shareRoom})', ctx),
    G = vm.runInContext('GX', ctx),
    [a, b] = X.c1;
  G(a).parent = 'f:NotAUnit';
  G(b).parent = 'f:NotAUnit';
  ctx.P['~level'] = {ok: 1, ko: 0};
  assert.strictEqual(S.sharesNow().lv.get(a), null);
  assert.strictEqual(S.shareRoom(a), true);
  assert.deepStrictEqual(S.shareW([a, b, X.c1[2]], [1, 1, 1]), [1, 1, 1]);
  delete G(a).parent;
  delete G(b).parent;
});

// The scientific genera put in the families' phase (app.js shareFree): an IMR player's IMR genera and the set turned on
// by hand early are never held by the share.
test('the rank share leaves alone an IMR player’s IMR genera and the scientific names turned on by hand early', () => {
  const vm = require('vm'),
    {ctx, M} = RW.engine(X, RW.world(X, 3), {app: 'truth'}),
    S = vm.runInContext('({sharesNow, shareW, shareRoom})', ctx),
    fam = 'f:Damselfishes',
    imr = 'g:Chromis',
    other = X.sci.find(n => X.gen[n].parent === fam && !X.gen[n].imrg),
    tick = () => (ctx.P['~level'] = {ok: ((ctx.P['~level'] || {}).ok || 0) + 1, ko: 0});
  assert.ok(X.gen[imr].imrg && other);
  // The family mastered, alone of its circle: the cap is (1 / circle 1)^2, small.
  ctx.P[fam] = {mx: 1};
  ctx.Q.sci = true;
  tick();
  const c = S.sharesNow().cap[''];
  assert.ok(c > 0 && c < 0.01, String(c));
  // Not an IMR player: both genera are held to the cap.
  const w0 = S.shareW([X.c1[1], imr, other], [1, 1, 1]);
  assert.ok(w0[1] < 0.01 && w0[2] < 0.01, String(w0));
  // An IMR player: the IMR genus is free, the other still held.
  M.startSet('imr', 'tour');
  tick();
  assert.ok(S.sharesNow().free.has(imr) && !S.sharesNow().free.has(other));
  const w1 = S.shareW([X.c1[1], imr, other], [1, 1, 1]);
  assert.strictEqual(w1[1], 1);
  assert.ok(w1[2] < 0.01, String(w1));
  assert.strictEqual(S.shareRoom(imr), true);
  // Turned on by hand early: every genus of the set in play is free.
  ctx.Q.sciH = true;
  tick();
  assert.ok(S.sharesNow().free.has(other));
  assert.deepStrictEqual(S.shareW([X.c1[1], imr, other], [1, 1, 1]), [1, 1, 1]);
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

// The question as quiz.js planPhoto builds it (k from the traps, the hold's ease and the mix-ups in the
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
      photoSet: (t, skip, shift, k, f) => ((calls.photo = {skip, shift, k, f}), {shown: [{f: 'p'}]}),
      seenAdd: q => (calls.seen = q[4].shown[0].f) // shown: the session's window (model.js SEENQ)
    },
    ctx = {shuffle: a => a, Math: {random: () => 0.5}},
    G = {a: {cover: 'cov.webp'}};
  calls.traps = 3;
  let q = RW.question(M, ctx, G, 'a', {list: ['a', 'b', 'c', 'd'], cards: ['a'], start: true});
  assert.strictEqual(q.k, 4);
  assert.deepStrictEqual(calls.photo, {skip: 'cov.webp', shift: -0.7, k: 4, f: 'k4'});
  assert.strictEqual(calls.seen, 'p');
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

// Rule L4 (--live): live answers on units the path has not opened count and open nothing; once the path cards such a
// unit, its question comes as any card's (model.js openDue, askedOpen): not before INTRO.GAP answers, then first.
test("live answers before a unit's card: its card's question comes as any card's, INTRO.GAP answers after it", () => {
  const U = RW.unitsOf('coral'),
    pl = RW.playerOf(U, RW.world(U, 1), {profile: 'beginner', seed: 1, N: 60, cps: [60]}),
    {M, ctx} = pl,
    closedNow = () => Object.keys(ctx.P).filter(n => n !== '~level' && M.asked(n) && (M.introMap()[n] || [])[3] === 'b');
  pl.liveRun(8);
  assert.ok(closedNow().length >= 5, 'answered live, closed: ' + closedNow().length);
  assert.ok(closedNow().every(n => !M.introduced(n) && !M.introReady(n)));
  // The first cards and their questions, until no card's question is left to come.
  let i = 0;
  const left = () => M.openRecent().some(n => !M.askedOpen(n));
  for (; i < 40 && (i < 6 || left()); i++) pl.step(i);
  assert.ok(!left(), 'the cards asked');
  const u = closedNow()[0],
    g = M.INTRO.GAP;
  assert.ok(u, 'a unit answered live still closed');
  M.introAdd([u], false); // its card on the path
  assert.ok(M.asked(u) && !M.askedOpen(u) && !M.introReady(u) && !M.openPace());
  for (let j = 0; j < g; j++) assert.notStrictEqual(pl.step(i++).t, u, 'not asked before INTRO.GAP answers');
  assert.strictEqual(pl.step(i++).t, u, "then its card's question first");
  assert.ok(M.askedOpen(u));
  // --liveoff: the same answers, recorded nowhere (Codex review #1234).
  const off = RW.playerOf(U, RW.world(U, 1), {profile: 'beginner', seed: 1, N: 60, cps: [60]});
  off.liveRun(8, true);
  assert.ok(
    off.result().live.n === 8 && off.result().live.rec === 0 && !Object.keys(off.ctx.P).some(n => n !== '~level' && off.M.asked(n))
  );
});

// The judge reads only the photos the game may ask, and a typed miss may name any unit of the rank.
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

// --app sheet: the sheet's photo Elo replayed on a population's own log and served to every player.
test('the sheet mode: a population logs its answers with seconds, the ratings it serves are learned from them', () => {
  const U = RW.unitsOf('coral'),
    W = RW.world(U, 3),
    TW = RW.timeWorld(U, W, 3, 'rho25'),
    T0 = RW.timeWorld(U, W, 3, 'rho0');
  assert.ok(Math.abs(TW.rho - RW.RT.RHO) < 0.08, `beta against d ${TW.rho}`);
  assert.ok(Math.abs(T0.rho) < 0.08, `unrelated ${T0.rho}`);
  assert.ok(RW.timeWorld(U, W, 3, 'fast').rho > 0.1, 'fast photos easy: positively related overall');
  assert.throws(() => RW.timeWorld(U, W, 3, 'nope'));
  const q = {ph: [Object.keys(TW.beta)[0]], ok: 1, typed: false};
  assert.strictEqual(RW.secOf(TW, 3, 0, 7, q), RW.secOf(TW, 3, 0, 7, q), 'the same answer, the same seconds');
  // The knowledge-gap term (--gap): a question the learner knows better (a larger true logit) is answered faster;
  // without it (gap 0) the seconds are unchanged, the noise drawn the same.
  const TG = RW.timeWorld(U, W, 3, 'rho25', {gap: -0.22});
  assert.strictEqual(TG.gap, -0.22);
  assert.ok(RW.secOf(TG, 3, 0, 7, {...q, gap: 3}) < RW.secOf(TG, 3, 0, 7, {...q, gap: -1}));
  assert.strictEqual(RW.secOf(TW, 3, 0, 7, {...q, gap: 3}), RW.secOf(TW, 3, 0, 7, q), 'gap 0: unchanged');
  assert.ok(
    Math.abs(Math.log(RW.secOf(TG, 3, 0, 7, {...q, gap: 2}) / RW.secOf(TG, 3, 0, 7, q)) + 0.44) < 0.06,
    'a 2-logit gap: 0.44 log faster'
  );
  const o = {subject: 'coral', seed: 3, N: 30, cps: [30], profiles: ['beginner', 'expert'], every: 10},
    a = RW.runPop(null, o),
    b = RW.runPop(null, o),
    c = RW.runPop(null, {...o, times: 'rho0', gap: -0.22});
  assert.deepStrictEqual(a, b, 'the same seed, the same population');
  assert.strictEqual(a.runs.length, 2);
  assert.deepStrictEqual(
    a.runs.map(r => r.profile),
    ['beginner', 'expert']
  );
  assert.strictEqual(a.pop.answers, 60);
  assert.throws(() => RW.runPop(null, {...o, subject: 'fish'}), /corals only/, 'a fish photo has two true difficulties');
  assert.strictEqual(c.pop.gap, -0.22);
  const at = a.pop.at[0];
  assert.ok(at.q === 30 && at.photos > 10 && at.err > 0 && at.gdErr > 0, JSON.stringify(at));
  // The sheet's rating reads no seconds: the times' case and gap leave the answers as they are.
  assert.deepStrictEqual(
    c.runs.map(r => r.expo),
    a.runs.map(r => r.expo)
  );
  // The ratings served: the sheet's replay (core.js eloOf, genusOffsetsOf, photoMemOf).
  const log = [['p1', 1, 'Acropora', 'Acropora', 1, 'quiz|k4', 'x', null, null, null, 'Acropora Porites', 0, 3, 0]],
    s = RW.sheetStats(log);
  assert.ok(s.photos.x && 'Acropora' in s.gd && s.mem.length === 4);
  // learncmp reads the population measures, one value per seed.
  const F = r => ({subject: 'coral', world: 'rated', seeds: 1, questions: 30, checkpoints: [30], runs: r.runs, pop: [r.pop]}),
    R = L.compare(F(a), F(c), {primary: {at: L.parseAt('rateErr@30'), dir: 'down'}});
  assert.ok(R.primary.pop && R.primary.n === 1);
  assert.ok(R.pops.rateErr[0].n === 1);
  assert.match(L.report(R), /The sheet's photo ratings/);
});
