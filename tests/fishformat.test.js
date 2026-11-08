// The per-format offsets of the subject in play (model.js pfmt; Pierre, 2026-11-09): the sheet's PFMT (?stats=1 fmt) is
// fitted on the corals' answers only (Code.gs stats_ reads the replayed subject's rows), so a fish answer is aimed and
// scored with every format at 0 (the app's own expectation before any fit), never with a coral offset; the corals keep
// PFMT, the very object, so their outcomes are the ones before. The same leak as the photo memory's (#790,
// tests/fishmemory.test.js), fixed the same way. model.js and quiz.js run in a vm; the draw through tests/rareease.js.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');
const C = require('../core.js');
const {engine} = require('./rareease.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const model = read('model.js'),
  quiz = read('quiz.js');
// The live sheet's offsets of 2026-11-09 (?stats=1 fmt, fitted on the corals' answers).
const CORAL = {
  k4: [0.15, 1306],
  k3: [1.23, 108],
  k2: [1.11, 721],
  again: [0.29, 411],
  duel: [0.3, 204],
  qduel: [0.02, 92],
  typed: [-0.42, 64]
};
// An object whose every read of a format throws: a code path that reads a coral offset fails the test.
const untouchable = () =>
  new Proxy(JSON.parse(JSON.stringify(CORAL)), {
    get(t, k) {
      if (typeof k === 'string' && k in CORAL) throw new Error(`a coral offset read: PFMT.${k}`);
      return t[k];
    }
  });
// An object that counts its format reads (the corals must read the sheet's offsets).
const counted = () => {
  const n = {reads: 0};
  n.F = new Proxy(JSON.parse(JSON.stringify(CORAL)), {
    get(t, k) {
      if (typeof k === 'string' && k in CORAL) n.reads++;
      return t[k];
    }
  });
  return n;
};
// model.js pfmt for a subject, with the sheet's PFMT set to F.
function pfmtOf(subject, F) {
  const ctx = {SUBJ: C.subjectOf(subject), PFMT: F};
  vm.createContext(ctx);
  vm.runInContext(
    [cut(model, 'const PFMT0 = ', '\n// Progress saved before the photo memory', {file: 'model.js'}), 'this.M = {pfmt, PFMT0};'].join('\n'),
    ctx
  );
  return ctx.M;
}
// quiz.js answer's own question (what it hands core.js scoreAnswer), run from its source with model.js stubbed, its pfmt
// the subject's; mode and chs as the game builds them.
const QSRC = cut(quiz, '  const q = scoreIn({', '\n  });\n', {through: true, file: 'quiz.js'});
function question(subject, F, {mode, chs, k}) {
  const {pfmt} = pfmtOf(subject, F),
    ph = [{f: 'u-1', view: 'wide'}];
  const env = {
    scoreIn: C.scoreIn,
    target: 'u',
    c: 'u',
    good: true,
    k,
    chs,
    seenPh: ph,
    unseen: null,
    ph,
    solo: 0.5,
    warm: false,
    SHOWNQ: null,
    tm: {rt: 4},
    GX: () => ({}),
    photoDiff: () => 0.2,
    famOf: () => 0,
    confTerm: () => 0,
    pgLook: () => false,
    recallAt: () => 1,
    startP: () => 0,
    rtOn: () => true,
    mq: mode,
    fmtOf: C.fmtOf,
    fmtOff: C.fmtOff,
    pfmt,
    domRules: () => true,
    genusDiff: () => 0
  };
  vm.createContext(env);
  return vm.runInContext(QSRC + '\nq;', env);
}
// The formats a question can have (core.js fmtOf): 2 plausible among 4, 4 plausible, Again, typed.
const FORMATS = [
  {mode: 'quiz|k2', chs: ['u', 'a', 'b', 'c'], k: 2, f: 'k2'},
  {mode: 'quiz', chs: ['u', 'a', 'b', 'c'], k: 4, f: 'k4'},
  {mode: 'quiz', chs: ['u', 'a'], k: 2, f: 'again'},
  {mode: 'quiz|t', chs: [], k: Infinity, f: 'typed'}
];

test('fish: the expectation and the scoring record take no format offset, never a coral one', () => {
  const M = pfmtOf('fish', untouchable());
  assert.strictEqual(M.pfmt(), M.PFMT0);
  FORMATS.forEach(F => {
    const q = question('fish', untouchable(), F),
      P = {},
      res = C.scoreAnswer(P, q),
      sc = C.scoreLog(q, res);
    assert.strictEqual(q.df, 0, `${F.f}: df`);
    assert.strictEqual(q.dt, 0, `${F.f}: dt`);
    // The record logs no offset (o and t are left out at 0), so the replay scores it with none.
    assert.ok(!('o' in sc) && !('t' in sc), `${F.f}: ${JSON.stringify(sc)}`);
    // The ability step is the one with no offsets served at all (an older sheet).
    const P0 = {};
    C.scoreAnswer(P0, question('fish', {}, F));
    assert.deepStrictEqual(P, P0, `${F.f}: the step with no offsets`);
  });
});

test('fish: the draw aims its photo with no format offset, never a coral one', () => {
  const L = Array.from({length: 12}, (_, i) => ({f: `p${i}`, o: `o${i}`, e: 1 + (i % 5)}));
  const E = engine('fish', L, {PFMT: untouchable(), fmtOff: C.fmtOff}),
    E0 = engine('fish', L, {PFMT: {}, fmtOff: C.fmtOff});
  ['k4', 'k3', 'k2', 'again', 'typed'].forEach(f => {
    for (let i = 0; i < 100; i++) {
      const k = f === 'typed' ? Infinity : f === 'k4' ? 4 : f === 'k3' ? 3 : 2;
      assert.strictEqual(JSON.stringify(E.photoSet('u', null, 0, k, f)), JSON.stringify(E0.photoSet('u', null, 0, k, f)), f);
    }
  });
});

test("corals unchanged: the sheet's offsets themselves, in the expectation, the record and the draw", () => {
  const {pfmt} = pfmtOf('coral', CORAL);
  assert.strictEqual(pfmt(), CORAL, 'the very PFMT object');
  FORMATS.forEach(F => {
    const q = question('coral', CORAL, F),
      sc = C.scoreLog(q, C.scoreAnswer({}, q));
    assert.strictEqual(q.df, CORAL[F.f][0], `${F.f}: df`);
    assert.strictEqual(q.dt, CORAL.typed[0], `${F.f}: dt`);
    assert.strictEqual(sc.t, CORAL.typed[0], `${F.f}: logged t`);
    if (CORAL[F.f][0]) assert.strictEqual(sc.o, CORAL[F.f][0], `${F.f}: logged o`);
  });
  // The draw: the aim reads the sheet's offsets, and they move it (a k2 photo aimed harder than with none).
  // Photos rated from -2 to +2 (PSTAT: [rating, answers]), so the aim picks among them.
  const L = Array.from({length: 40}, (_, i) => ({f: `p${i}`, o: `o${i}`})),
    PSTAT = Object.fromEntries(L.map((p, i) => [p.f, [-2 + i / 10, 50]])),
    n = counted(),
    A = engine('coral', L, {PFMT: n.F, fmtOff: C.fmtOff, PSTAT}),
    A0 = engine('coral', L, {PFMT: {}, fmtOff: C.fmtOff, PSTAT});
  let moved = 0;
  for (let i = 0; i < 100; i++)
    if (JSON.stringify(A.photoSet('u', null, 0, 2, 'k2')) !== JSON.stringify(A0.photoSet('u', null, 0, 2, 'k2'))) moved++;
  assert.ok(n.reads > 0, 'the coral draw reads the sheet offsets');
  assert.ok(moved > 0, 'and they move the aim');
});

test('the game reads the per-format offsets only through pfmt (every browser file but the admin)', () => {
  // The admin keeps its own copy (admin.js SFMT, statsFor: the replayed subject only).
  const files = fs.readdirSync(path.join(__dirname, '..')).filter(f => /\.js$/.test(f) && !/^admin/.test(f) && f !== 'sw.js');
  const uses = files.flatMap(f =>
    read(f)
      .split('\n')
      .filter(l => !/^\s*\/\//.test(l) && /\bPFMT\b/.test(l))
      .map(l => `${f}: ${l.trim()}`)
  );
  assert.deepStrictEqual(uses.sort(), [
    'model.js: const pfmt = () => (SUBJ.replay ? PFMT : PFMT0);',
    "model.js: let PFMT = fmtsOf(store.get('reefid-photo-stats', {}));",
    // The device's replay on top of the sheet's: the offsets only for the subject the sheet rates (S.replay), else none.
    'sync.js: PFMT = fmtsOf(j); // per-format offsets (sheet v77, core.js fmtOffsetsOf); none from an older sheet',
    "sync.js: st = S.replay ? {mem: PMEM, conf: PCONF, fmt: Number(v) >= FMT_SHEET ? PFMT : {}, gd: typeof PGD === 'object' ? PGD : {}} : {},"
  ]);
  // quiz.js scores with the subject's offsets.
  assert.match(quiz, /df: fmtOff\(pfmt\(\), fmtOf\(mq, chs\.length\)\)/);
  assert.match(quiz, /dt: fmtOff\(pfmt\(\), 'typed'\)/);
  assert.match(model, /aimOff\(k, fmtOff\(pfmt\(\), f\)\)/);
});

// No fish rules version for this change: it picks the offsets future fish answers are aimed and scored with, and moves no
// saved progress. Every fish answer since the scorer (#632) is logged with its scoring record (sc: its format offsets o
// and t), and the replay reads them as logged; a fish row logged without one takes the replay's fmt, which is none for a
// subject the sheet does not rate (Code.gs replay_ st = {}, sync.js st = {}): already the prudent value. So a fish replay
// rebuilds the same records whatever offsets it is served, the corals' or none, and a fish answer scored under the leak
// (o 0.15, t -0.42) keeps the step it had.
test('saved fish progress does not move: the replay reads the logged format offsets', () => {
  const fam = ['f:Damselfishes', 'f:Wrasses', 'f:Gobies', 'f:Blennies'];
  const rows = Array.from({length: 48}, (_, i) => {
    const g = fam[i % 2],
      ok = i % 5 !== 0,
      F = FORMATS[i % FORMATS.length],
      chs = F.f === 'again' ? [g, fam[2]] : F.f === 'typed' ? [] : [g, ...fam.filter(x => x !== g).slice(0, 3)],
      // Half the log scored under the leak (the corals' offsets of the day in o and t), half after the fix (none).
      leak = i < 24,
      sc = {d: 0.3 + (i % 4) / 5, m: 0.1, ...(leak && CORAL[F.f][0] ? {o: CORAL[F.f][0]} : {}), ...(leak ? {t: CORAL.typed[0]} : {})};
    return [
      'p',
      i,
      g,
      ok ? g : F.f === 'typed' ? '' : chs.find(x => x !== g),
      ok ? 1 : 0,
      F.mode,
      `${g}-${i % 3}`,
      null,
      null,
      0,
      chs.join(' '),
      null,
      5,
      ...new Array(C.LOG_SC - 13).fill(null),
      sc
    ];
  });
  const gen = Object.fromEntries(fam.map(g => [g, {}])),
    P = fmt => JSON.stringify(C.replayProgress(rows, {gen, ...(fmt ? {fmt} : {})}).p.P);
  assert.strictEqual(P(CORAL), P({}));
  assert.strictEqual(P(untouchable()), P(null), 'a replay with a fmt that throws on read: never read');
  // The logged offsets are what it scores with: the same log with them stripped replays to other records.
  const stripped = rows.map(r => {
    const x = r.slice(),
      sc = {...x[C.LOG_SC]};
    delete sc.o;
    delete sc.t;
    x[C.LOG_SC] = sc;
    return x;
  });
  assert.notStrictEqual(JSON.stringify(C.replayProgress(stripped, {gen}).p.P), P(null), 'the replay reads o and t as logged');
});
