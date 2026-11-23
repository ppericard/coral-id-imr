'use strict';
require('./slot.js').testGuard();
// @slow: examLooks checked against the version before on rated-world simulation runs of both subjects
// model.js examLooks (the look-alikes in play that the mastery exam's pair coverage reads) finds a unit's look-alikes
// first and reads the units in play (app.js bonusList) only when one of them is off the slate: a speed-up only. It must
// give exactly the list the version that filtered every unit in play gave, in the same order. The reference is a copy
// of that version, kept here as it was. Checked on rated-world runs (fish and corals, with app.js GX and its record
// maps as the app has them: every call the play makes, and the units at checkpoints), on made-up states (records, the
// opt-in sets' switches, cards opened and closed, the IMR answer) and on edge cases.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js'),
  RW = require('../tools/ratedworld.js'),
  block = require('./block.js');

// The version that filtered every unit in play (model.js before), verbatim.
const REF = `n => {
  const on = new Set([...slateGenera(), ...(typeof bonusList === 'function' ? bonusList() : [])]),
    own = (GX(n) || {}).look || [];
  return [...on].filter(x => x !== n && (own.includes(x) || ((GX(x) || {}).look || []).includes(n)));
}`;
// app.js GX, read from app.js: examLooks' index (model.js lookRev) reads the same record maps.
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'),
  GXSRC = block(APP, 'const GX = ', ';\n', {file: 'app.js'}).slice('const GX = '.length);

const rng = seed => () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);

// The app's globals around a rated-world engine (ctx, its records G): the record maps app.js GX reads (DATA.gen,
// DATA.x.gen, TREEU.gen) holding the engine's records, GX itself, and the microtask queue; the reference beside
// examLooks, and a count of the units in play read (bonusList).
function appLike(ctx, G, U) {
  if (U.subject === 'fish') {
    ctx.DATA = {...U.DATA, gen: {}};
    ctx.TREEU = {gen: G};
  } else {
    const X = (U.DATA.x || {}).gen || {},
      part = inX =>
        Object.fromEntries(
          Object.keys(G)
            .filter(n => !!X[n] === inX)
            .map(n => [n, G[n]])
        );
    ctx.DATA = {...U.DATA, gen: part(false), x: {...(U.DATA.x || {}), gen: part(true)}};
    ctx.TREEU = null;
  }
  ctx.GX = vm.runInContext('(' + GXSRC + ')', ctx);
  ctx.queueMicrotask = queueMicrotask;
  const bl = ctx.bonusList,
    n = {bonus: 0};
  ctx.bonusList = () => (n.bonus++, bl());
  return {n, ref: vm.runInContext('(' + REF + ')', ctx), now: vm.runInContext('examLooks', ctx)};
}
// examLooks and the reference on unit n: the same list, in the same order. Returns whether examLooks read bonusList.
function same(A, n, label) {
  const b0 = A.n.bonus,
    a = [...A.now(n)],
    read = A.n.bonus > b0,
    r = [...A.ref(n)];
  assert.deepStrictEqual(a, r, `${label}: examLooks(${n})`);
  return read;
}
// The units checked on a state: the slate, k others drawn by r (the opt-in sets' units, the species), and ids no
// record holds; every unit when k is Infinity.
const sample = (U, G, r, k = Infinity) => {
  const others = Object.keys(G).filter(n => !U.slate.includes(n)),
    pick = k >= others.length ? others : others.filter(() => r() < k / others.length);
  return [...U.slate, ...pick, ...U.slate.slice(0, 3).map(n => n + 'x'), 'g:none', 's:s999', ''];
};
// The checks on one state with the false-alarm table armed (core.js faArm: the same values, faster; nothing written).
function checkAll(A, P, L, label) {
  C.faArm(P);
  try {
    return L.reduce((t, n) => t + (same(A, n, label) ? 0 : 1), 0);
  } finally {
    C.faDisarm(P);
  }
}

// A rated-world run of N answers: examLooks checked at every call the play makes (through core.js looksLeft, model.js
// lookLeft), and on a sample of the units every `every` answers.
function played(subject, profile, seed, N, every) {
  const U = RW.unitsOf(subject),
    W = RW.world(U, seed),
    pl = RW.playerOf(U, W, {profile, seed, N, cps: [N]}),
    A = appLike(pl.ctx, pl.G, U),
    ll = pl.ctx.looksLeft,
    r = rng(seed * 104729),
    st = {calls: 0, fast: 0, checked: 0};
  pl.ctx.looksLeft = (P, n, looks) => {
    st.calls++;
    assert.deepStrictEqual([...looks], [...A.ref(n)], `${subject} ${profile} ${seed}: examLooks(${n}) in play`);
    return ll(P, n, looks);
  };
  for (let i = 0; i < N; i++) {
    pl.step(i);
    if ((i + 1) % every) continue;
    const L = sample(U, pl.G, r, 60);
    st.checked += L.length;
    st.fast += checkAll(A, pl.ctx.P, L, `${subject} ${profile} ${seed} after ${i + 1}`);
  }
  pl.ctx.looksLeft = ll;
  return {st, pl, U};
}

// The lecture RA's runs go past the first exam entries (the play reads the exam's look-alikes from about 1,340 answers
// on the fish, 2,000 on the corals, seed 1); the others stay short.
test('rated-world runs, fish and corals: every examLooks call in play and the units every 200 answers, as before', t => {
  for (const [subject, profile, seed, N, calls] of [
    ['fish', 'lectureRA', 1, 1400, true],
    ['fish', 'strongRA', 2, 400, false],
    ['coral', 'lectureRA', 1, 2200, true],
    ['coral', 'strongRA', 3, 600, false]
  ]) {
    const {st, U, pl} = played(subject, profile, seed, N, 200);
    if (calls) assert.ok(st.calls > 0, `${subject}: the play reads the exam's look-alikes`);
    t.diagnostic(`${subject} ${profile} ${N}: ${st.calls} calls in play; ${st.fast} of ${st.checked} checked without the units in play`);
    assert.ok(st.fast > 0 && st.fast < st.checked, `${subject}: both ways taken (${st.fast} of ${st.checked} without the units in play)`);
    assert.ok(Object.keys(pl.ctx.P).length > U.slate.length / 4, `${subject}: a history`);
  }
});

test('made-up states: records, the sets switched, cards opened and closed, the IMR answer; as before', t => {
  for (const subject of ['fish', 'coral']) {
    const U = RW.unitsOf(subject),
      W = RW.world(U, 5),
      e = RW.engine(U, W, {seed: 5}),
      A = appLike(e.ctx, e.G, U),
      all = Object.keys(e.G);
    let fast = 0,
      checked = 0;
    for (let s = 1; s <= 12; s++) {
      const r = rng(s * 7919),
        P = {},
        intro = {};
      // Records from a few units to every one, their progress anywhere on the bar (pg: core.js pgOf), some learned.
      all.forEach(n => {
        if (r() < s / 12) P[n] = {ok: Math.floor(r() * 30), ko: Math.floor(r() * 8), pg: r(), ...(r() < 0.1 ? {mx: 1} : {})};
        if (r() < s / 14) intro[n] = [String(Math.floor(r() * 500)), 0, 0, r() < 0.15 ? 'b' : 'a'];
      });
      e.ctx.P = P;
      e.ctx.store.set(vm.runInContext('INTRO.KEY', e.ctx), intro);
      vm.runInContext('INTROS = null;', e.ctx);
      const q = () => (r() < 0.4 ? true : r() < 0.5 ? false : undefined);
      e.ctx.Q = {[U.setK]: q(), [U.setK + 'O']: r() < 0.2, [U.setK + 'H']: r() < 0.3, ssp: q(), sp: q()};
      e.M.startSet(r() < 0.5 ? 'imr' : 'new', 'tour');
      const L = sample(U, e.G, r, subject === 'fish' ? 80 : Infinity);
      checked += L.length;
      fast += checkAll(A, P, L, `${subject} state ${s}`);
    }
    t.diagnostic(`${subject}: ${fast} of ${checked} checked without the units in play`);
    assert.ok(fast > 0 && fast < checked, `${subject}: both ways taken (${fast} of ${checked} without the units in play)`);
  }
});

test('edge cases: a look on the slate only, a slate unit no map holds, a look that is not a list, maps replaced or edited', async () => {
  const U = RW.unitsOf('coral'),
    e = RW.engine(U, RW.world(U, 1), {seed: 1}),
    A = appLike(e.ctx, e.G, U),
    ctx = e.ctx,
    sl = U.slate,
    [a, b, c] = sl,
    check = label => sample(U, e.G, null).forEach(n => same(A, n, label)),
    // a record replaced (a new build of the map: the app makes DATA and TREEU anew, never edits them in place)
    put = (n, rec) => (ctx.DATA = {...ctx.DATA, gen: {...ctx.DATA.gen, [n]: rec}});
  assert.ok(sl.length > 3);
  check('as built');
  // A unit that lists itself and an id no record holds; a look-alike declared on one side only.
  put(a, {...ctx.DATA.gen[a], look: [a, b, 'Nowhere', ...ctx.DATA.gen[a].look]});
  put(c, {...ctx.DATA.gen[c], look: ctx.DATA.gen[c].look.filter(x => x !== a)});
  check('one-sided and self looks');
  // A look edited in place, in a later task: the index is made again (model.js lookRev, once per task).
  await new Promise(setImmediate);
  ctx.DATA.gen[c].look = [...ctx.DATA.gen[c].look, b];
  await new Promise(setImmediate);
  check('a look edited in place, in a later task');
  // A bonus genus listing a slate genus: read through the units in play once its set is on.
  const bon = U.extra[0];
  ctx.DATA = {
    ...ctx.DATA,
    x: {...ctx.DATA.x, gen: {...ctx.DATA.x.gen, [bon]: {...ctx.DATA.x.gen[bon], look: [...ctx.DATA.x.gen[bon].look, c]}}}
  };
  ctx.Q = {[U.setK]: true};
  check('a bonus genus naming a slate genus, the set on');
  assert.ok(A.now(c).includes(bon), 'the bonus genus counts once its set is on');
  ctx.Q = {[U.setK]: false};
  check('the set off');
  // Every look-alike of a slate genus on the slate: the units in play are not read.
  const onSlate = sl.find(
    n => A.ref(n).length && A.ref(n).every(x => sl.includes(x)) && !U.extra.some(x => (ctx.GX(x).look || []).includes(n))
  );
  assert.ok(onSlate && same(A, onSlate, 'on the slate only') === false, 'look-alikes all on the slate: the units in play are not read');
  // A look that is not a list: no index, every unit in play read, the same answer as before (a string's includes).
  put(b, {...ctx.DATA.gen[b], look: `${a} ${c}`});
  check('a look that is a string');
  assert.ok(same(A, a, 'no index'), 'no index: the units in play are read');
  put(b, {...ctx.DATA.gen[b], look: [a, c]});
  // A slate unit no map holds but GX finds (a record outside the maps): every unit in play read.
  const {[b]: gone, ...rest} = ctx.DATA.gen;
  ctx.DATA = {...ctx.DATA, gen: rest};
  ctx.GX = (G => n => (n === b ? {...gone, look: [a]} : G(n)))(ctx.GX);
  check('a slate unit outside the maps');
  assert.ok(same(A, c, 'outside the maps'), 'a slate unit outside the maps: the units in play are read');
  // Outside the app (no TREEU: the rated world, a test's stubs, with a GX of their own): every unit in play read.
  vm.runInContext('delete globalThis.TREEU;', ctx);
  ctx.GX = n => e.G[n];
  check('no TREEU');
  assert.ok(same(A, onSlate, 'no TREEU'), 'no TREEU: the units in play are read');
});
