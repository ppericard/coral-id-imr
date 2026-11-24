'use strict';
require('./slot.js').testGuard();
// The photo draw's data per unit (model.js drawPhotos, a view of the data version: app.js dataViewBy; docs/spec/model.md
// "The state version and its views"): the photos each view of a unit may show and each photo's values that depend on the
// data alone (photoDiff, calSd, calBonus, setBonus, refLevel, its variant kind and its mimicry entry), read once per draw
// by photoSet and varOf. A speed-up only: every draw must be the draw of the code before, the same photos from the same
// random numbers. The reference is that code, kept here as it was (its comments left out, its names …0), beside the new
// one in one page: model.js's draw with app.js's versions and views, the game around it stubbed on made-up units of every
// shape (three views or two levels, growth form "x" in the colony slot, refused photos, rated and unrated photos,
// reference-level photos, juveniles of the three classes and colour phases, mimicry entries on a family the genus hangs
// from, a calibration set). Between draws, the writers: the player's records (stateBump('rec')), the units met, the
// photo statistics, the calibration set and the subject's calibration (stateBump()). VIEW_CHECK off and on. Then the
// mutation: a data write bumped as the player's own is caught, by VIEW_CHECK and by the reference.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js'),
  C = require('../core.js'),
  {memStorage} = require('./kept.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  MODEL = src('model.js'),
  APP = src('app.js');
const MODEL_CODE = [
  cut(MODEL, 'const PICKD = {', '// The next exam question of genus n', {file: 'model.js'}),
  cut(MODEL, 'const PDIFF = {', '\n}\n', {through: 1, file: 'model.js'}),
  cut(MODEL, 'const PMEM0 = memOf();', '\n// Per-format offsets', {file: 'model.js'}),
  cut(MODEL, 'const PFMT0 = ', '\n// Progress saved before the photo memory', {file: 'model.js'}),
  cut(MODEL, 'function wpick(', '\n}\n', {through: 1, file: 'model.js'}),
  cut(MODEL, 'const RECENT = ', '\n', {file: 'model.js'})
].join('\n');
const BUMP = "const stateBump = rec => void (STATE_V++, rec === 'rec' || DATA_V++);";
const APP_CODE = cut(APP, 'let STATE_V = 0;', 'const store = {', {file: 'app.js'});

// The draw before the data view (model.js photoSet and varOf), verbatim but for the names and the comment lines.
const REF = `function photoSet0(n, skip, shift = 0, k = 4, f = '', keep = null) {
  const g = GX(n),
    two = g.levels === 2,
    need = two ? ['wide', 'macro'] : ['wide', 'medium', 'macro'];
  const shownV = two ? ['wide', 'macro'] : ['wide', 'medium'];
  const oneForm = imrFormsOf(n).length === 1,
    ok = v => p => v !== 'wide' || p.form !== 'x' || oneForm;
  const gameOk = p => gamePhotoOk(n, p);
  const pics = (v, all = false) =>
    [...gamePics(n, v), ...(two && v === 'macro' ? gamePics(n, 'medium') : [])]
      .filter(ok(v))
      .filter(gameOk)
      .filter(p => p.f !== skip && (all || !keep || keep(p)));
  const held = level(n)[0] !== 'new' && !shaky(n),
    calQ = !shift && held && Math.random() < CAL.RATE,
    single = calQ || Math.random() < singleP(n, shift),
    s = P[n] || {},
    ro = s.ro || [],
    cal = calibOf(SUBJ),
    calu = cal.u ?? CAL.U,
    lean = cal.early * (PDIFF.W / (PDIFF.W + (s.ok || 0) + (s.ko || 0))),
    tgt = ability(n) + shift - aimOff(k, fmtOff(pfmt(), f)) - (single ? PICKD.SINGLE : 0) - lean,
    pm = pmem();
  const V = varOf0(
    n,
    need.flatMap(v => pics(v, true))
  );
  const h = [...recent(n).slice(-5)],
    hot = h.length ? h.filter(x => x === '1').length / h.length : 0.5;
  let hardF = 1,
    hard = () => 0;
  const w = (p, off = 0) => {
    const x = (photoDiff(n, p) + off - tgt) / calSd(p, calu),
      k = mem[p.o || p.f];
    let r = Math.exp((-x * x) / 2) * calBonus(p) * (held && Math.abs(x) <= 1 ? setBonus(p) : 1);
    if (!k) r *= (1 + 1.5 * hot) * (refLevel(p) ? cal.ref : 1);
    else r *= Math.exp(pm[memBucket(k)]);
    if (V.on) r *= V.f(p);
    return hardF < 1 ? r * (1 - hard(p) * (1 - hardF)) : r;
  };
  const obs = {};
  need.forEach(v =>
    pics(v).forEach(p => {
      const k = p.o || p.f;
      (obs[k] = obs[k] || {})[v] = (obs[k][v] || []).concat([p]);
    })
  );
  const keys = Object.keys(obs);
  if (!keys.length && skip) return photoSet0(n); // the card's photo was its only one
  const vObs = V.on ? Object.fromEntries(keys.map(k => [k, Math.min(1, Math.max(...Object.values(obs[k]).flat().map(V.f)))])) : null;
  const phMul = k => (V.on ? vObs[k] : 1);
  const mem = colonyMem(obs, s.ps || {});
  const phs = Object.fromEntries(keys.map(k => [k, Object.values(obs[k]).flat()]));
  const score = k => {
    const o = obs[k],
      vs = (single ? need : shownV).filter(v => o[v]);
    if (!vs.length) return 0;
    const nv = need.filter(v => o[v]).length,
      off = !single && nv === 1 ? PICKD.SINGLE : 0,
      cov = nv / need.length;
    const m = vs.reduce((t, v) => t + Math.max(...o[v].map(p => w(p, off))), 0) / vs.length;
    return m * (calQ ? 1 : cov) * (ro.includes(k) ? 0.15 : 1);
  };
  const sc = Object.fromEntries(keys.map(k => [k, score(k)]));
  const ph = k => phs[k],
    ease = L =>
      L.map(p => p.e || 0)
        .filter(Boolean)
        .sort((a, b) => b - a),
    es = ease(keys.flatMap(ph)),
    rare = es.length > 0 && rareOn(n) && genScore(n) + 1e-9 < LV_AT[0],
    hs = {};
  if (rare) {
    const eo = ease(keys.filter(k => sc[k] > 0 && phMul(k) >= 1).map(k => ({e: Math.max(0, ...ease(ph(k).filter(p => V.f(p) >= 1)))}))),
      hardOf = rareHard(eo.length ? eo : es),
      sum = (L, f = () => 1) => L.reduce((t, p) => t + w(p) * f(p), 0);
    hard = p => (p.e > 0 ? hardOf(p.e) : 0);
    keys.forEach(k => {
      const t = sum(ph(k));
      hs[k] = t ? sum(ph(k), hard) / t : 0;
    });
  }
  if (calQ && keys.some(k => sc[k] > 0 && !mem[k])) {
    const keep = rare && !keys.some(k => sc[k] > 0 && !mem[k] && hs[k] < 1);
    keys.forEach(k => mem[k] && !(keep && hs[k] < 1) && (sc[k] = 0));
  }
  const live = keys.filter(k => sc[k] > 0),
    fresh = new Set(leastRecent(live, k => phs[k])),
    whole = k => !(rare && hs[k] >= 1) && phMul(k) >= 1;
  if (live.some(whole) && ![...fresh].some(whole)) leastRecent(live.filter(whole), k => phs[k]).forEach(k => fresh.add(k));
  live.forEach(k => fresh.has(k) || (sc[k] = 0));
  const top = Math.max(0, ...Object.values(sc));
  keys
    .filter(k => sc[k] > 0)
    .sort((a, b) => sc[b] - sc[a])
    .slice(0, PICKD.VARIETY)
    .forEach(k => {
      if (!ro.includes(k)) sc[k] = Math.max(sc[k], 0.5 * top * phMul(k));
    });
  const floor = drawFloor(keys.length);
  keys.forEach(k => {
    if (sc[k] > 0) sc[k] = Math.max(sc[k], floor * top * phMul(k));
  });
  if (rare) {
    hardF = rareCap(keys, sc, k => hs[k]);
    if (hardF < 1) keys.forEach(k => (sc[k] *= 1 - hs[k] + hardF * hs[k]));
  }
  const o = top ? obs[wpick(keys, k => sc[k])] : keys.length ? obs[pick(keys)] : {};
  const one = v => {
    const L = o[v] || [];
    return L.length ? {...wpick(L, w), view: v} : null;
  };
  const lab = v => (two && v === 'macro' ? 'close' : v);
  const has = need.filter(v => (o[v] || []).length);
  if (single || has.length === 1) {
    const v = !has.length ? null : calQ ? wpick(has, x => Math.max(...o[x].map(p => w(p) * calBonus(p) ** 2))) : pick(has);
    if (v) {
      const p = one(v);
      return {shown: [{...p, view: lab(v)}], hint: null, reveal: has.filter(x => x !== v).map(x => ({...pick(o[x]), view: lab(x)}))};
    }
    return {shown: [], hint: null};
  }
  if (two) {
    const m = one('macro');
    return {shown: [one('wide'), m && {...m, view: 'close'}].filter(Boolean), hint: null};
  }
  return {shown: [one('wide'), one('medium')].filter(Boolean), hint: one('macro')};
}
function varOf0(n, L) {
  const juv = (GX(varHome(n)) || {}).juv,
    F = {},
    ML = (GX(varHome(n)) || {}).mim,
    MF = new Map(),
    kind = p => varKindOf(p, juv),
    f0 = p => {
      const m = ML ? mimIn(ML, p) : null;
      if (m && !m.m.includes(n)) {
        if (!MF.has(m)) MF.set(m, varRamp(genScore(n), mimAt(m, n)));
        return MF.get(m);
      }
      const v = kind(p);
      if (!v) return 1;
      if (!(v in F)) F[v] = varRamp(genScore(n), varAtOf(n, v));
      return F[v];
    };
  const on = L.some(p => f0(p) < 1) && new Set(L.filter(p => f0(p) >= 1).map(p => p.o || p.f)).size >= PICKD.VARIETY;
  return {on, kind, f: on ? f0 : () => 1};
}`;

const rng = seed => () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
const pickOf = (r, L) => L[Math.floor(r() * L.length)];

// Made-up units of every shape (r: the generator). F: a fish family with juvenile classes and mimicry entries; g:F1 and
// g:F2 its genera (their home is F, rankOf 'genus'); C3: a coral of three views with growth forms, x among them; C2: a
// two-level genus whose close-ups sit in medium; B: a bonus genus (x) some of whose photos gamePhotoOk refuses.
function unitsOf(r) {
  let i = 0;
  const photo = (o, extra = {}) => {
    const f = 'p' + i++,
      p = {f, o: o === null ? undefined : o, e: r() < 0.85 ? 1 + Math.floor(r() * 5) : 0, ...extra};
    if (r() < 0.3) p.jt = pickOf(r, ['p1g0sl1', 'p1g0sms', 'p2g1sl1', 'p1g0sl1j', 'p1g0sl1c', 'p1g0sm1a']);
    if (r() < 0.1) p.gid = 'g' + i;
    if (r() < 0.1) p.own = true;
    return p;
  };
  const fishPics = (n, obs) => {
    const L = [];
    for (let k = 0; k < obs; k++) {
      const o = n + 'o' + k,
        x = r(),
        extra =
          x < 0.15
            ? {ph: 'juvenile', t: pickOf(r, ['Early sp', 'Late sp', 'Other sp', 'Early sp a'])}
            : x < 0.22
              ? {ph: 'male'}
              : x < 0.3
                ? {sp: pickOf(r, ['mimA', 'mimB']), ph: r() < 0.5 ? 'juvenile' : undefined}
                : {};
      for (let j = 0; j < 1 + Math.floor(r() * 2); j++) L.push(photo(r() < 0.05 ? null : o, extra));
    }
    return L;
  };
  const coralPics = (n, obs, views) => {
    const V = Object.fromEntries(views.map(v => [v, []]));
    for (let k = 0; k < obs; k++)
      for (const v of views) if (r() < 0.75) V[v].push(photo(n + 'o' + k, {form: pickOf(r, ['x', 'b', 'm', 'e'])}));
    return V;
  };
  const mim = [
    {sp: 'mimA', st: 'all', u: ['F'], m: ['M1'], fb: 'M1', pair: {id: 'pa', b: 'mimA'}},
    {sp: 'mimB', st: 'juvenile', u: ['F'], m: ['M2', 'g:F1'], fb: 'M2', pair: {id: 'pb', b: 'mimB'}}
  ];
  const U = {
    F: {levels: 3, views: {wide: fishPics('F', 40)}, juv: {cls: '', early: ['Early sp'], late: ['Late sp']}, mim, forms: ['a']},
    'g:F1': {levels: 3, parent: 'F', views: {wide: fishPics('g:F1', 14)}},
    'g:F2': {levels: 3, parent: 'F', views: {wide: fishPics('g:F2', 4)}, varAt: {j: [0.2, 0.4]}},
    C3: {levels: 3, views: coralPics('C3', 18, ['wide', 'medium', 'macro'])},
    C2: {levels: 2, views: coralPics('C2', 10, ['wide', 'medium', 'macro'])},
    B: {levels: 3, x: true, views: coralPics('B', 8, ['wide', 'medium'])},
    M1: {levels: 3, views: {wide: fishPics('M1', 3)}},
    M2: {levels: 3, views: {wide: fishPics('M2', 3)}}
  };
  return U;
}

// The page: app.js's versions (STATE_V, DATA_V, stateBump, the views), model.js's draw, the reference. check: VIEW_CHECK
// on. mutate: a change to app.js's block. The stubs are the parameters of a function around the code (tests/rareease.js).
function page(subject, seed, check, mutate = s => s) {
  const r = rng(seed),
    U = unitsOf(r);
  let s = 1;
  const M = Object.create(Math);
  M.random = () => ((s = (s * 16807) % 2147483647), s / 2147483647);
  const SUBJ = C.subjectOf(subject),
    box = {cal: C.calibOf(SUBJ)},
    later = [],
    MET = new Set(),
    refused = new Set(Object.values(U.B.views).flatMap(L => L.filter((p, i) => i % 3 === 0).map(p => p.f)));
  const app = mutate(APP_CODE);
  assert.ok(APP_CODE.includes(BUMP), 'app.js stateBump as the mutation expects it');
  const stubs = {
    Math: M,
    window: {VIEW_CHECK_ON: check},
    localStorage: memStorage(),
    setTimeout: f => later.push(f),
    SUBJECTS: C.SUBJECTS,
    subjKey: C.subjKey,
    startKey: C.startKey,
    keyGet: C.keyGet,
    keyRename: C.keyRename,
    SUBJ,
    calibOf: S => (S === SUBJ ? box.cal : C.calibOf(S)),
    unitRankOf: C.unitRankOf,
    refLevel: C.refLevel,
    phaseOf: C.phaseOf,
    varKindOf: C.varKindOf,
    VAR_AT: C.VAR_AT,
    varRamp: C.varRamp,
    memBucket: C.memBucket,
    aimOf: C.aimOf,
    DOM: C.DOM,
    TARGET_P: C.TARGET_P,
    AIM: C.AIM,
    LEVEL: '_level',
    P: {},
    PSTAT: {},
    PTM: {},
    ptimeOff: C.ptimeOff,
    PGD: {},
    PMEM: [0, -0.45, -1.1, -1.7],
    memOf: C.memOf,
    PFMT: {},
    fmtOff: (F, f) => (f === 'duel' ? 0.3 : 0),
    GX: n => U[n],
    introduced: n => MET.has(n),
    imrFormsOf: n => U[n].forms || (n === 'C3' ? ['b', 'm'] : ['b']),
    gamePics: (n, v) => U[n].views[v] || [],
    gamePhotoOk: (n, p) => !refused.has(p.f),
    level: n => [(P0(n) || {}).lv || 'new'],
    rankOf: n => (n.startsWith('g:') ? 'genus' : ''),
    shaky: n => !!(P0(n) || {}).sh,
    recent: n => String((P0(n) || {}).h || '').split(''),
    ability: n => (P0(n) || {}).th || 0,
    genScore: n => (P0(n) || {}).sc || 0,
    LV_AT: [0.5, 0.8, 0.95],
    pick: a => a[Math.floor(M.random() * a.length)]
  };
  // P0: a record of the page's P (the object the code's P names), set once the page is made.
  let P0 = () => null;
  const ctx = vm.createContext({...stubs}),
    names = Object.keys(stubs),
    make = vm.runInContext(
      `(function (${names.join(', ')}) {\n${app}\n${MODEL_CODE}\n${REF}\n` +
        `const set = (k, v) => k === 'PSTAT' ? (PSTAT = v) : k === 'PGD' ? (PGD = v) : k === 'PTM' ? (PTM = v) : k === 'CALSET' ? (CALSET = v) : null;\n` +
        `return {photoSet, photoSet0, varOf, varOf0, drawPhotos, stateBump, seenAdd, set, P, ver: () => STATE_V, dver: () => DATA_V};\n})`,
      ctx
    );
  const T = make(...names.map(k => stubs[k]));
  P0 = n => T.P[n];
  return {T, U, MET, box, later, seed: v => (s = v), rnd: () => s, r};
}

// The writers between two draws, as the app has them.
function write(pg, r) {
  const {T, U, MET, box} = pg,
    units = Object.keys(U),
    x = r();
  if (x < 0.45) {
    const n = pickOf(r, units),
      s = (T.P[n] = T.P[n] || {}),
      L = Object.values(U[n].views).flat();
    s.ok = (s.ok || 0) + Math.floor(r() * 3);
    s.ko = (s.ko || 0) + Math.floor(r() * 2);
    s.th = r() * 3 - 0.5;
    s.sc = r();
    s.lv = pickOf(r, ['new', 'weak', 'mid', 'good']);
    s.sh = r() < 0.2;
    s.h = Array.from({length: 1 + Math.floor(r() * 8)}, () => (r() < 0.7 ? '1' : '0')).join('');
    s.ps = s.ps || {};
    for (let j = 0; j < 3; j++) {
      const p = pickOf(r, L);
      if (p) s.ps[p.f] = [1 + Math.floor(r() * 3), Math.floor(r() * 2)];
    }
    if (r() < 0.3) s.ro = L.slice(0, 2).map(p => p.o || p.f);
    T.stateBump('rec');
    return 'record';
  }
  if (x < 0.55) {
    MET.add(pickOf(r, ['M1', 'M2', 'g:F1', 'F']));
    T.stateBump('rec');
    return 'met';
  }
  if (x < 0.7) {
    const all = Object.values(U).flatMap(u => Object.values(u.views).flat()),
      ps = {},
      gd = {},
      tm = {};
    all.forEach(p => {
      if (r() < 0.6)
        ps[p.f] = [
          r() * 3 - 1.5,
          Math.floor(r() * 40),
          Math.floor(r() * 30),
          ...(r() < 0.5 ? [Math.floor(r() * 50)] : []),
          ...(r() < 0.2 ? [pickOf(r, Object.keys(U))] : [])
        ];
      if (r() < 0.1) tm[p.f] = [r() - 0.5, r() * 0.3, Math.floor(r() * 30)];
    });
    Object.keys(U).forEach(n => r() < 0.7 && (gd[n] = [r() * 2 - 1, 50]));
    T.set('PSTAT', ps);
    T.set('PGD', gd);
    T.set('PTM', tm);
    T.stateBump();
    return 'stats';
  }
  if (x < 0.8) {
    const all = Object.entries(U).flatMap(([n, u]) =>
      Object.values(u.views)
        .flat()
        .map(p => [n, p.f])
    );
    T.set('CALSET', {
      [pg.subject]: Object.fromEntries(Object.keys(U).map(n => [n, all.filter(([m]) => m === n && r() < 0.3).map(([, f]) => f)]))
    });
    T.stateBump();
    return 'calset';
  }
  if (x < 0.85) {
    box.cal = {...box.cal, u: r() < 0.5 ? r() * 2 : undefined, ref: 1 + Math.floor(r() * 3), early: r() * 0.6};
    T.stateBump();
    return 'calib';
  }
  return 'none';
}

// One draw of each kind on unit n, the reference first then the new code, from the same random numbers: the same photos
// and the same numbers drawn.
function draws(pg, r, n, label) {
  const {T, U} = pg,
    L = Object.values(U[n].views).flat(),
    args = [
      [n, null, 0, 4, 'k4'],
      [n, pickOf(r, L) ? pickOf(r, L).f : null, 0.4, 2, 'again'],
      [n, null, Math.log(0.6), 2, 'duel', p => (p.e || 0) >= 2],
      [n, null, 0, Infinity, 'typed'],
      [n, (L[0] || {}).f, 0, 4, 'find', p => p === L[0]]
    ];
  let calls = 0;
  for (const a of args) {
    const s0 = 1 + Math.floor(r() * 2147483645);
    pg.seed(s0);
    const want = T.photoSet0(...a),
      s1 = pg.rnd();
    pg.seed(s0);
    const got = T.photoSet(...a);
    assert.deepStrictEqual(got, want, `${label}: photoSet(${n}, ${a[4]})`);
    assert.strictEqual(pg.rnd(), s1, `${label}: photoSet(${n}, ${a[4]}) drew the same random numbers`);
    if (got.shown[0]) T.seenAdd([null, n, [], '', got]);
    calls++;
  }
  // varOf on the unit's photos with the draw's data, and on a list that holds photos of no draw (the exam's reserve).
  const D = T.drawPhotos(n).d,
    Ls = [
      [...D.keys()],
      [...D.keys()]
        .filter(() => r() < 0.5)
        .concat([
          {f: 'held1', o: 'h1', ph: 'juvenile', t: 'Late sp'},
          {f: 'held2', sp: 'mimA'}
        ])
    ];
  for (const Lx of Ls) {
    const a = T.varOf0(n, Lx),
      b = T.varOf(n, Lx, D);
    assert.strictEqual(b.on, a.on, `${label}: varOf(${n}).on`);
    assert.deepStrictEqual(Lx.map(b.f), Lx.map(a.f), `${label}: varOf(${n}).f`);
    assert.deepStrictEqual(Lx.map(b.kind), Lx.map(a.kind), `${label}: varOf(${n}).kind`);
  }
  return calls;
}

function run(subject, seed, check, N) {
  const pg = page(subject, seed, check);
  pg.subject = subject;
  const r = rng(seed * 31 + (check ? 7 : 0)),
    ops = {},
    units = Object.keys(pg.U);
  let calls = 0,
    on = 0;
  const v0 = pg.T.dver();
  for (let i = 0; i < N; i++) {
    const op = write(pg, r);
    ops[op] = (ops[op] || 0) + 1;
    const n = pickOf(r, units);
    calls += draws(pg, r, n, `${subject} ${seed} step ${i} after ${op}${check ? ', VIEW_CHECK' : ''}`);
    if (pg.T.varOf(n, [...pg.T.drawPhotos(n).d.keys()], pg.T.drawPhotos(n).d).on) on++;
  }
  assert.deepStrictEqual(pg.later, [], 'no VIEW_CHECK difference thrown later');
  return {calls, ops, on, data: pg.T.dver() - v0};
}

test('photoSet and varOf with the draw’s data view give the draws of the code before, VIEW_CHECK off and on', t => {
  for (const check of [false, true])
    for (const [subject, seed] of [
      ['fish', 1],
      ['coral', 2],
      ['seaslug', 3],
      ['fish', 4]
    ]) {
      const st = run(subject, seed, check, 120);
      t.diagnostic(
        `${subject} seed ${seed}${check ? ' VIEW_CHECK' : ''}: ${st.calls} draws, variants held back on ${st.on} units drawn, ${st.data} data versions, writes ${JSON.stringify(st.ops)}`
      );
      assert.ok(st.ops.stats > 3 && st.ops.calset > 3 && st.ops.record > 20, 'every writer ran');
      assert.ok(st.on > 0, 'some draws held a variant back');
    }
});

test('a data view per unit: computed once per data version, kept across the player’s bumps', () => {
  const pg = page('fish', 5, false),
    {T} = pg,
    a = T.drawPhotos('F');
  assert.strictEqual(T.drawPhotos('F'), a, 'read again: the same value');
  T.stateBump('rec');
  assert.strictEqual(T.drawPhotos('F'), a, 'the player’s bump keeps it');
  T.stateBump();
  assert.notStrictEqual(T.drawPhotos('F'), a, 'a data bump makes it again');
  assert.ok(a.d.size > 30 && a.pics.wide.length === a.d.size, 'the family’s photos, one entry each');
  assert.deepStrictEqual(Object.keys(T.drawPhotos('C2').pics), ['wide', 'macro'], 'a two-level genus: its two views');
});

test('mutation: the photo statistics written with the player’s bump alone are caught, by VIEW_CHECK and by the reference', () => {
  for (const check of [false, true]) {
    const pg = page('fish', 6, check),
      {T, U} = pg,
      r = rng(66);
    let caught = '';
    for (let i = 0; i < 200 && !caught; i++) {
      const n = pickOf(r, Object.keys(U)),
        L = Object.values(U[n].views).flat();
      T.drawPhotos(n); // kept for this data version
      // the statistics change, bumped as if the player's own record
      T.set('PSTAT', Object.fromEntries(L.map(p => [p.f, [r() * 4 - 2, 40, 30, 40]])));
      T.stateBump('rec');
      try {
        const s0 = 1 + Math.floor(r() * 1e9);
        pg.seed(s0);
        const want = T.photoSet0(n, null, 0, 4, 'k4');
        pg.seed(s0);
        const got = T.photoSet(n, null, 0, 4, 'k4');
        if (JSON.stringify(got) !== JSON.stringify(want)) caught = `a draw differs after ${i + 1} writes`;
      } catch (e) {
        if (!/data view drawPhotos: the value kept differs/.test(e.message)) throw e;
        caught = e.message;
      }
    }
    pg.later.length = 0;
    assert.ok(caught, `caught${check ? ', VIEW_CHECK' : ''}`);
    if (check) assert.match(caught, /data view drawPhotos/, 'VIEW_CHECK throws');
  }
});
