// Full replay of the answer log (core.js replayProgress, replayedOf; docs/LEARNING.md "Full replay"): the app's progress
// rules (pgRightW, pgMissW, pgMemW, pgStep) run over the sheet's log, in time order. Also tools/memreplay.js on a sample.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const C = require('../core.js');

// Five genera: A and B declared look-alikes (same family), C, D, E unrelated.
const GEN = {
  A: {look: ['B'], fam: 'F1'},
  B: {look: ['A'], fam: 'F1'},
  C: {look: [], fam: 'F2'},
  D: {look: [], fam: 'F3'},
  E: {look: [], fam: 'F4'}
};
const T0 = Date.UTC(2026, 10, 1); // before the photo memory was logged (core.js MEM_LOGGED)
const sig = x => 1 / (1 + Math.exp(-x));
const eAt = (th, d, k = 4) => Math.round(100 * (1 / k + (1 - 1 / k) * sig(th - d))) / 100;
// A log row as the admin reads it: [id, time, shown, answered, right, mode, photos, e, th, new photos, choices].
const row = (id, i, shown, ans, ph, choices, e = eAt(1, 0), th = 1, t0 = T0) => [
  id,
  t0 + i * 60e3,
  shown,
  ans,
  ans === shown ? 1 : 0,
  'quiz',
  ph,
  e,
  th,
  0,
  choices
];
const steps = (ws, oks) => ws.reduce((g, w, i) => C.pgStep(g, oks[i], w), 0);

test('a right answer against a look-alike weighs more than one among easy choices', () => {
  const rows = [];
  for (let i = 0; i < 5; i++) {
    rows.push(row('look', i, 'A', 'A', 'a' + i, 'A B C D'));
    rows.push(row('easy', i, 'A', 'A', 'a' + i, 'A C D E'));
  }
  const R = C.replayProgress(rows, {gen: GEN});
  const look = R.look.P.A.pg,
    easy = R.easy.P.A.pg;
  assert.strictEqual(look, steps([1, 1, 1, 1, 1], [1, 1, 1, 1, 1]), 'in full against a look-alike, 4 choices, new photos');
  assert.strictEqual(easy, steps([0.5, 0.5, 0.5, 0.5, 0.5], [1, 1, 1, 1, 1]), 'PROG.LOOK among easy choices');
  assert.ok(look > easy);
  // Two plausible choices (|k2) prove less than four.
  const k2 = C.replayProgress(
    [row('k', 0, 'A', 'A', 'x', 'A B')].map(r => ((r[5] = 'quiz|k2'), r)),
    {gen: GEN}
  ).k.P.A.pg;
  assert.ok(Math.abs(k2 - C.pgStep(0, true, C.pgRightW(2, true))) < 1e-9 && k2 < C.pgStep(0, true, 1));
  // Counts, results and photos as the app keeps them.
  assert.deepStrictEqual([R.look.P.A.ok, R.look.P.A.ko, R.look.P.A.h, R.look.P.A.ps.a0], [5, 0, '11111', [1, 1]]);
  assert.deepStrictEqual(R.look.P.A.off, {B: 5, C: 5, D: 5});
  assert.strictEqual(R.look.n, 5);
  assert.strictEqual(R.look.used, 5);
});

test('a miss counts against both genera, less on a photo harder than the player', () => {
  const at = C.replayProgress(
      [row('p', 0, 'A', 'A', 'a0', 'A B C D'), row('p', 1, 'A', 'A', 'a1', 'A B C D'), row('p', 2, 'A', 'B', 'a2', 'A B C D')],
      {gen: GEN}
    ).p,
    hard = C.replayProgress(
      [
        row('p', 0, 'A', 'A', 'a0', 'A B C D'),
        row('p', 1, 'A', 'A', 'a1', 'A B C D'),
        row('p', 2, 'A', 'B', 'a2', 'A B C D', eAt(1, 3)) // a photo 3 units above the player
      ],
      {gen: GEN}
    ).p;
  const before = steps([1, 1], [1, 1]);
  // At the game's target (e logged ≈ 0.80, ability 1 above the photo): in full.
  assert.ok(Math.abs(at.P.A.pg - C.pgStep(before, false, C.pgMissW(1, 0, 4))) < 2e-4, `${at.P.A.pg}`);
  assert.ok(C.pgMissW(1, 0, 4) > 0.99);
  assert.ok(hard.P.A.pg > at.P.A.pg, 'a miss on a hard photo costs less');
  // The genus given instead: a miss (from 0 it stays 0), its last result a 0, the mix-up counted for the genus shown.
  assert.deepStrictEqual([at.P.B.pg, at.P.B.h, at.P.A.conf], [0, '0', {B: 1}]);
  assert.deepStrictEqual([at.P.A.ok, at.P.A.ko, at.P.A.h], [2, 1, '110']);
});

test('photo repeats: a right answer on a photo already right counts only what memory does not explain', () => {
  const mem = [0, -0.44, -1.1, -1.7],
    fresh = [],
    same = [];
  for (let i = 0; i < 6; i++) {
    fresh.push(row('p', i, 'A', 'A', 'n' + i, 'A B C D'));
    same.push(row('p', i, 'A', 'A', 'same', 'A B C D'));
  }
  const F = C.replayProgress(fresh, {gen: GEN, mem}).p.P.A,
    S = C.replayProgress(same, {gen: GEN, mem}).p.P.A,
    off = C.replayProgress(same, {gen: GEN, mem, memory: false}).p.P.A;
  assert.ok(S.pg < F.pg, `${S.pg} vs ${F.pg}`);
  assert.strictEqual(off.pg, F.pg, 'the rule before the photo memory: repeats count in full');
  assert.deepStrictEqual(S.ps.same, [6, 6]);
  // The 2nd answer on it: right once before, offset mem[2], weight pgMemW.
  const w = [];
  C.replayProgress(same.slice(0, 2), {gen: GEN, mem, onAnswer: (r, x) => w.push(x.w)});
  assert.strictEqual(w[0], 1);
  assert.ok(Math.abs(w[1] - C.pgMemW(1, 0, mem[2], 4)) < 0.01, `${w}`);
});

test('since the photo memory the logged expectation includes it: the replay takes it out again', () => {
  const mem = [0, -0.44, -1.1, -1.7],
    L = C.MEM_LOGGED + 3600e3,
    d = [];
  // The same two answers on one photo, logged before (e without memory) and after (e with the memory of the right answer).
  C.replayProgress([row('a', 0, 'A', 'A', 'f', 'A B C D'), row('a', 1, 'A', 'A', 'f', 'A B C D')], {
    gen: GEN,
    mem,
    onAnswer: (r, x) => d.push(['before', x.d])
  });
  C.replayProgress([row('b', 0, 'A', 'A', 'f', 'A B C D', eAt(1, 0), 1, L), row('b', 1, 'A', 'A', 'f', 'A B C D', eAt(1, mem[2]), 1, L)], {
    gen: GEN,
    mem,
    onAnswer: (r, x) => d.push(['after', x.d])
  });
  assert.ok(Math.abs(d[1][1] - d[3][1]) < 0.05, JSON.stringify(d));
});

test('a progress reset: only the answers after it', () => {
  const rows = [row('p', 0, 'A', 'A', 'a0', 'A B C D'), row('p', 1, 'A', 'A', 'a1', 'A B C D'), row('p', 2, 'C', 'C', 'c0', 'C D E A')];
  const R = C.replayProgress(rows, {gen: GEN, since: {p: rows[1][1]}}).p;
  assert.deepStrictEqual(Object.keys(R.P), ['C', C.LEVEL]);
  assert.strictEqual(R.n, 1);
});

test('replayedOf: the replayed bars with the saved exams, not one passed under the former model', () => {
  const rep = C.replayProgress([row('p', 0, 'A', 'A', 'a0', 'A B C D'), row('p', 1, 'C', 'C', 'c0', 'C D E A')], {gen: GEN}).p;
  const saved = {
    A: {pg: 0.9, mx: 1762000000000, ok: 1, ko: 0, h: '1'}, // learned since 2026-11-02: kept
    C: {L: 0.97, mx: 1, ok: 1, ko: 0, h: '1'}, // learned under BKT: dropped
    D: {pg: 0.82, ex: {k: 2, v: ['wide'], at: 40}, ok: 9, ko: 0, h: '111111111'}, // no answer in the log: its own bar, its exam
    '~level': {ok: 5, ko: 1, th: 0.3}
  };
  const G = C.replayedOf(rep, saved),
    L = ['A', 'B', 'C', 'D', 'E'];
  assert.strictEqual(G.A.pg, rep.P.A.pg);
  assert.strictEqual(G.A.mx, saved.A.mx);
  assert.ok(!G.C.mx && G.C.pg === rep.P.C.pg, 'an exam passed under BKT is taken again');
  assert.deepStrictEqual([G.D.pg, G.D.ex], [0.82, saved.D.ex]);
  assert.deepStrictEqual([G[C.LEVEL].ok, G[C.LEVEL].ko], [5, 1], 'the larger answer count of the two');
  assert.strictEqual(G[C.LEVEL].th, rep.P[C.LEVEL].th, 'the replayed global level');
  assert.strictEqual(C.learnedOf(G, L), 1);
  assert.strictEqual(C.learnedOf(saved, L), 2);
  assert.ok(C.pctOf(G, L) < C.pctOf(saved, L));
});

test('tools/memreplay.js prints the replay of a sample log', () => {
  const rows = [];
  for (let i = 0; i < 12; i++)
    rows.push(
      row(
        'p1',
        i,
        i % 2 ? 'Acropora' : 'Montipora',
        i % 5 ? (i % 2 ? 'Acropora' : 'Montipora') : 'Porites',
        'ph' + (i % 4),
        'Acropora Montipora Porites Pocillopora'
      )
    );
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'memreplay-')),
    f = path.join(dir, 'answers.json');
  fs.writeFileSync(f, JSON.stringify({rows}));
  const out = execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', 'memreplay.js'), f, '--min', '3'], {encoding: 'utf8'});
  fs.rmSync(dir, {recursive: true});
  assert.match(out, /12 answers, 1 players/);
  assert.match(out, /p1: 12 answers \(12 replayed\), \d+% on a photo already shown; mean bar over the 3 genera answered \d+% -> \d+%/);
  assert.match(out, /Acropora\s+6 answers {2}bar \d+% -> \d+% \(silent recalculation \d+%\)/);
});

// The sheet's full replay, adopted by the app (2026-11-03): the rules versions, the complete record, going on from a replay.
test('RVS: one entry per rules version, RV the last; messages of the versions skipped', () => {
  assert.ok(C.RVS.length >= 1);
  C.RVS.forEach((x, i) => {
    assert.strictEqual(x.v, i + 1, 'versions numbered 1, 2, 3...');
    assert.match(x.at, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(typeof x.why === 'string' && x.why.length > 10);
    assert.ok(x.msg === null || (typeof x.msg.t === 'string' && typeof x.msg.p === 'string'), 'msg: null or {t, p}');
    if (x.msg && x.msg.only) assert.strictEqual(x.msg.only, 'changed', 'only: the one condition progress.js rvNoticeAdd knows');
    if (x.msg && x.msg.min !== undefined) assert.ok(x.msg.min >= 0, 'min: points of progress %');
  });
  // The standard card every version takes (Pierre, 2026-11-03): only to the players whose % moves by 5 points or more.
  assert.deepStrictEqual([C.RV_CARD.only, C.RV_CARD.min], ['changed', 5]);
  assert.match(C.RV_CARD.p, /\{from\}%.*\{to\}%/);
  assert.strictEqual(C.RV, C.RVS[C.RVS.length - 1].v);
  // The first version (the full replay itself): a card only for the players whose progress % it moved, with the two %
  // (Pierre, 2026-11-03).
  assert.strictEqual(C.RVS[0].msg, C.RV_CARD);
  assert.deepStrictEqual(
    C.rvMsgs(0, C.RV),
    C.RVS.filter(x => x.msg)
  );
  assert.deepStrictEqual(C.rvMsgs(C.RV, C.RV), []);
});

test('replayProgress: the ability, the run, the global level and the times, as quiz.js answer keeps them', () => {
  const rows = [
    row('p', 0, 'A', 'A', 'a0', 'A B C D'),
    row('p', 1, 'A', 'B', 'a1', 'A B C D'),
    row('p', 2, 'A', 'A', 'a2', 'A B C D'),
    row('p', 3, 'C', 'C', 'c0', 'C D E A'),
    [...row('p', 4, 'A', 'A', 'a3', 'A B'), ...[]].map((x, i) => (i === 5 ? 'quiz-duel' : x))
  ];
  const R = C.replayProgress(rows, {gen: GEN}).p.P;
  // The same steps by hand, in the app's order (quiz.js answer: the genus shown, the global level, the genus given).
  const P = {},
    st = n => (P[n] = P[n] || {ok: 0, ko: 0, streak: 0});
  rows.forEach(r => {
    const t = r[2],
      ok = !!r[4],
      s = st(t),
      k = C.kOf(r[5], r[10]),
      q = (r[7] - 1 / k) / (1 - 1 / k),
      d = r[8] - Math.log(q / (1 - q));
    s[ok ? 'ok' : 'ko']++;
    C.eloStep(P, t, s, ok, d, k);
    if (P[C.LEVEL]) P[C.LEVEL][ok ? 'ok' : 'ko']++;
    else P[C.LEVEL] = C.levelSeed(P);
    C.eloStep(P, C.LEVEL, P[C.LEVEL], ok, d, k);
    // The genus given: no Elo step (2026-11-03, docs/LEARNING.md "The genus wrongly given in the Elo").
  });
  assert.deepStrictEqual([R.A.th, R.A.vr, R.B.th, R.C.th], [P.A.th, P.A.vr, undefined, P.C.th], 'B, only given wrongly: no ability');
  assert.deepStrictEqual([R[C.LEVEL].ok, R[C.LEVEL].ko, R[C.LEVEL].th, R[C.LEVEL].at], [4, 1, P[C.LEVEL].th, rows[4][1]]);
  assert.deepStrictEqual([R.A.streak, R.B.streak, R.A.at, R.A.du], [2, 0, rows[4][1], 1]);
  assert.strictEqual(C.abilityOf({}, 'A'), 0, 'a genus never answered, no global level: 0');
});

test('replayProgress: the genus wrongly given loses progress, gets a miss and its run reset, but its ability does not move', () => {
  // B is answered right twice, then given for a photo of A three times.
  const rows = [row('p', 0, 'B', 'B', 'b0', 'B A C D'), row('p', 1, 'B', 'B', 'b1', 'B A C D')];
  for (let i = 2; i < 5; i++) rows.push(row('p', i, 'A', 'B', 'a' + i, 'A B C D'));
  const before = C.replayProgress(rows.slice(0, 2), {gen: GEN}).p.P.B,
    R = C.replayProgress(rows, {gen: GEN}).p.P;
  assert.deepStrictEqual([R.B.th, R.B.vr], [before.th, before.vr], 'the Elo of the genus given is left alone');
  assert.ok(R.B.pg < before.pg, `its progress drops (${before.pg} -> ${R.B.pg})`);
  assert.deepStrictEqual([R.B.h, R.B.streak, R.B.ok, R.B.ko, R.B.u], ['11000', 0, 2, 0, 5]);
  assert.ok(R.A.th < 1 && R.A.ko === 3, 'the genus shown takes the misses in its Elo');
});

test("replayProgress goes on from a replay: the sheet's, then this device's answers on top, as one replay", () => {
  const rows = [];
  for (let i = 0; i < 9; i++) rows.push(row('p', i, i % 3 ? 'A' : 'C', i % 4 ? (i % 3 ? 'A' : 'C') : 'B', 'f' + (i % 4), 'A B C D'));
  const all = C.replayProgress(rows, {gen: GEN}).p,
    head = C.replayProgress(rows.slice(0, 6), {gen: GEN}),
    frozen = JSON.stringify(head),
    on = C.replayProgress(rows.slice(6), {gen: GEN, start: head}).p;
  assert.deepStrictEqual(on.P, all.P);
  assert.strictEqual(JSON.stringify(head), frozen, 'the start is copied, never changed');
  // The app's own log entry as a row (sync.js replayAdopt).
  const a = {
    id: 'x1',
    t: '2026-11-03T08:00:00.000Z',
    g: 'A',
    a: 'B',
    ok: 0,
    m: 'quiz|k3',
    ph: 'f1 f2',
    e: 0.7,
    th: 0.4,
    nw: 1,
    ch: 'A B C'
  };
  assert.deepStrictEqual(C.logRow(a, 'me'), ['me', Date.parse(a.t), 'A', 'B', 0, 'quiz|k3', 'f1 f2', 0.7, 0.4, 1, 'A B C']);
  assert.deepStrictEqual(C.logRow({id: 'y', t: 'x', g: 'A', a: 'A', ok: 1}, 'me').slice(7), [null, null, null, '']);
});

test('replayedOf: what the app takes from the replay and what it keeps from its own copy', () => {
  const rep = C.replayProgress(
    [row('p', 0, 'A', 'A', 'a0', 'A B C D'), row('p', 1, 'A', 'A', 'a1', 'A B C D'), row('p', 2, 'C', 'C', 'c0', 'C D E A')],
    {gen: GEN}
  ).p;
  const saved = {
    A: {pg: 0.3, ok: 2, ko: 0, h: '11', th: 0.1, ps: {zz: [9, 9]}, dd: 2, dl: 20400, ro: ['o1'], cor: 1, mx: 5, at: 1, pm: 1},
    C: {pg: 0.5, ok: 4, ko: 0, h: '1111', ex: {k: 1, v: ['wide'], at: 3}}, // more answers than the log: kept as it is
    E: {L: 0.9, mx: 1, ok: 1, ko: 0, h: '1'}, // not in the log, learned under the former model: the mark goes
    '~level': {ok: 2, ko: 0, th: 0.2, at: 5}
  };
  const G = C.replayedOf(rep, saved, 3);
  ['pg', 'ok', 'ko', 'h', 'off', 'th', 'vr', 'streak'].forEach(f => assert.deepStrictEqual(G.A[f], rep.P.A[f], f));
  assert.deepStrictEqual(G.A.ps, {...rep.P.A.ps, zz: [9, 9]}, 'the photos seen: the replay with the saved ones it lacks');
  assert.deepStrictEqual([G.A.dd, G.A.dl, G.A.ro, G.A.cor, G.A.mx, G.A.pm, G.A.rv], [2, 20400, ['o1'], 1, 5, 1, 3]);
  assert.strictEqual(G.A.at, rep.P.A.at);
  assert.ok(!('u' in G.A) && !('L' in G.A));
  assert.deepStrictEqual(G.C, saved.C, 'the log has fewer answers on it: the saved record');
  assert.ok(G.C !== saved.C);
  assert.deepStrictEqual(G.E, {L: 0.9, ok: 1, ko: 0, h: '1'});
  assert.deepStrictEqual(
    [G[C.LEVEL].ok, G[C.LEVEL].ko, G[C.LEVEL].th, G[C.LEVEL].at, G[C.LEVEL].rv],
    [3, 0, rep.P[C.LEVEL].th, rep.P[C.LEVEL].at, 3]
  );
});

test('replayedOf keeps the photos shown that the log leaves out: a corallites hint revealed after the answer (Codex review #399)', () => {
  // quiz.js answer counts every photo of the question as shown (s.ps), the corallites hint revealed after the answer
  // too, but logs only the photos seen when answering (ph without it).
  const rep = C.replayProgress([row('p', 0, 'A', 'A', 'a0', 'A B C D'), row('p', 1, 'A', 'A', 'a0', 'A B C D')], {gen: GEN}).p,
    saved = {A: {pg: 0.2, ok: 2, ko: 0, h: '11', ps: {a0: [1, 1], 'a-mac': [1, 0]}}},
    G = C.replayedOf(rep, saved, 1);
  assert.deepStrictEqual(rep.P.A.ps, {a0: [2, 2]});
  assert.deepStrictEqual(G.A.ps, {a0: [2, 2], 'a-mac': [1, 0]}, 'the hint stays seen: never a new photo for the mastery exam');
  assert.strictEqual(G.A.ok, 2);
});

test('mergeProgress: a record adopted from the replay wins over the copy of the same answers, not over new ones', () => {
  const B = {A: {ok: 2, ko: 0, h: '11', pg: 0.2, th: 0.1}},
    P = {A: {ok: 2, ko: 0, h: '11', pg: 0.25, th: 0.3, pm: 1, rv: 1}},
    same = C.mergeProgress(B, P, JSON.parse(JSON.stringify(B))),
    moved = C.mergeProgress(B, P, {A: {ok: 3, ko: 0, h: '111', pg: 0.3, th: 0.2}});
  assert.deepStrictEqual([same.A.pg, same.A.th, same.A.rv], [0.25, 0.3, 1]);
  assert.deepStrictEqual([moved.A.pg, moved.A.ok, moved.A.rv], [0.3, 3, undefined]);
});

// Typed answers (2026-11-03; model.js TYPED, quiz.js answer): the player types the genus, logged quiz|t (quiz|t|x in the
// mastery exam) with no choices, the genus read as the answer ('' for "I don't know"). The app scores them with no guess
// rate (TYPED.k infinite) and a right one in full; the replay must rebuild the same record from the log. The app's side
// below is quiz.js answer step by step, with model.js's own TYPED and pgWeight (run from its source).
test('typed answers: the replay of the log rebuilds the progress the app scored live', () => {
  const vm = require('vm'),
    src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    cut = (a, b) => src.slice(src.indexOf(a), src.indexOf(b, src.indexOf(a)) + b.length),
    M = {GX: n => GEN[n], pooledConf: () => 0, confusable: (t, n) => GEN[t].look.includes(n), CONF: C.CONF, PROG: C.PROG};
  M.pgRightW = C.pgRightW;
  vm.createContext(M);
  vm.runInContext(
    cut('const TYPED = {', '\n};') + '\n' + cut('function pgWeight(t, chs, k) {', '\n}') + '\nthis.T = {TYPED, pgWeight};',
    M
  );
  const {TYPED, pgWeight} = M.T,
    EXAM = {n: 5};
  assert.strictEqual(TYPED.k, Infinity);
  assert.strictEqual(pgWeight('A', [], TYPED.k), 1, 'a typed right answer counts in full');
  const mem = [0, -0.44, -1.1, -1.7],
    t0 = C.MEM_LOGGED + 3600e3, // the logged e includes the photo memory
    // The app's record: A near its exam with 3 exam questions passed, B and C met, the global level.
    P0 = {
      A: {pg: C.PROG.M + 0.01, ok: 30, ko: 2, h: '1111111111', th: 2, ps: {}, streak: 6, ex: {k: 3, v: ['wide'], at: 40}},
      B: {pg: 0.4, ok: 6, ko: 3, h: '110101101', th: 0.3, ps: {}, streak: 0},
      C: {pg: 0.6, ok: 9, ko: 2, h: '11011111', th: 1, ps: {}, streak: 3},
      [C.LEVEL]: {ok: 47, ko: 7, th: 1.4}
    },
    P = JSON.parse(JSON.stringify(P0)),
    log = [],
    sig1 = x => 1 / (1 + Math.exp(-x)),
    logit = p => Math.log(p / (1 - p)),
    st = n => (P[n] = P[n] || {ok: 0, ko: 0, h: '', streak: 0});
  // One answer as quiz.js answer scores it: genus t shown on photos ph, answered c ('' = I don't know), typed or with
  // the 4 choices chs, an exam question or not; p the chance the player had (the question's difficulty is set from it,
  // so the e logged with 2 decimals is exact and the comparison below can be strict).
  const answer = (t, c, ph, {typed = false, chs = [], exam = false, p = 0.7} = {}) => {
    const good = c === t,
      s = st(t);
    chs.forEach(x => x !== t && ((s.off = s.off || {})[x] = (s.off[x] || 0) + 1));
    if (good) (s.ok++, s.streak++);
    else {
      s.ko++;
      s.streak = 0;
      if (c) (s.conf = s.conf || {})[c] = (s.conf[c] || 0) + 1;
    }
    const k = typed ? TYPED.k : 4,
      th0 = C.abilityOf(P, t),
      fam = C.memFam(
        ph.map(f => (s.ps || {})[f]),
        mem
      ),
      x = k === 4 ? logit((p - 0.25) / 0.75) : logit(p),
      dm = th0 - x,
      d0 = dm - fam;
    s.pg = C.pgStep(C.pgOf(s), good, good ? pgWeight(t, chs, k) * C.pgMemW(th0, d0, fam, k) : C.pgMissW(th0, dm, k));
    C.eloStep(P, t, s, good, dm, k);
    if (P[C.LEVEL]) P[C.LEVEL][good ? 'ok' : 'ko']++;
    else P[C.LEVEL] = C.levelSeed(P);
    C.eloStep(P, C.LEVEL, P[C.LEVEL], good, dm, k);
    ph.forEach(f => {
      const y = ((s.ps = s.ps || {})[f] = s.ps[f] || [0, 0]);
      y[0]++;
      if (good) y[1]++;
    });
    s.h = (s.h + (good ? 1 : 0)).slice(-10);
    if (!good && GEN[c]) {
      const w = st(c);
      w.pg = C.pgStep(C.pgOf(w), false, C.pgMissW(C.abilityOf(P, c), d0, k));
      w.h = (w.h + '0').slice(-10);
      w.streak = 0;
    }
    if (!good) delete s.ex;
    else if (exam) {
      const ex = s.ex || {k: 0, v: []};
      ex.k = Math.min(EXAM.n, ex.k + 1);
      ex.t = (ex.t || 0) + (typed ? 1 : 0);
      if (ex.k >= EXAM.n && ex.t >= TYPED.exam) {
        s.mx = t0 + log.length;
        delete s.ex;
      } else s.ex = ex;
    }
    if (!good && GEN[c] && P[c]) delete P[c].ex;
    log.push({
      id: 'a' + log.length,
      t: new Date(t0 + log.length * 60e3).toISOString(),
      g: t,
      a: c,
      ok: good ? 1 : 0,
      m: 'quiz' + (typed ? '|t' : '') + (exam ? '|x' : ''),
      ph: ph.join(' '),
      ch: chs.join(' '),
      e: Math.round(100 * (1 / k + (1 - 1 / k) * sig1(th0 - dm))) / 100,
      th: th0,
      nw: ph.filter(f => !(P0[t].ps || {})[f]).length
    });
  };
  // The replay of this device's log on top of the record it started from (sync.js replayAdopt), adopted as the app
  // would (replayedOf: the exam from the app's own copy).
  const replay = () => {
    const rep = C.replayProgress(
      log.map(a => C.logRow(a, 'me')),
      {gen: GEN, mem, start: {me: {P: P0, n: 0, used: 0, rep: 0}}}
    ).me;
    return C.replayedOf(rep, P, 1);
  };
  const same = (G, why) => {
    for (const n of ['A', 'B', 'C']) {
      for (const f of ['ok', 'ko', 'h', 'ps', 'off', 'conf', 'streak']) assert.deepStrictEqual(G[n][f], P[n][f], `${why}: ${n}.${f}`);
      for (const f of ['pg', 'th', 'vr']) assert.ok(Math.abs(G[n][f] - P[n][f]) < 1e-9, `${why}: ${n}.${f} ${G[n][f]} vs app ${P[n][f]}`);
    }
    for (const f of ['th', 'vr']) assert.ok(Math.abs(G[C.LEVEL][f] - P[C.LEVEL][f]) < 1e-9, `${why}: level ${f}`);
    assert.deepStrictEqual([G[C.LEVEL].ok, G[C.LEVEL].ko], [P[C.LEVEL].ok, P[C.LEVEL].ko]);
  };
  answer('C', 'C', ['c1'], {typed: true, p: 0.6}); // typed, right, a new photo: in full, no guess rate
  assert.ok(Math.abs(P.C.pg - C.pgStep(P0.C.pg, true, 1)) < 1e-12);
  answer('C', 'C', ['c1'], {typed: true, p: 0.8}); // the same photo again: only what memory does not explain
  answer('B', '', ['b1'], {typed: true, p: 0.75}); // "I don't know": a miss for B only
  answer('B', 'C', ['b2'], {typed: true, p: 0.7}); // B typed as C: against both, C by its own ability
  answer('C', 'C', ['c2'], {chs: ['C', 'D', 'E', 'A'], p: 0.85}); // a pick among 4 easy choices, between typed ones
  answer('A', 'A', ['a1'], {exam: true, chs: ['A', 'B', 'C', 'D'], p: 0.6}); // the 4th exam question, picked
  answer('A', 'A', ['a2'], {exam: true, typed: true, p: 0.55}); // 5 right, 1 typed: not passed, 99% at most
  assert.deepStrictEqual([P.A.ex.k, P.A.ex.t, !!P.A.mx], [5, 1, false]);
  let G = replay();
  same(G, 'exam waiting for its 2nd typed answer');
  assert.deepStrictEqual([G.A.ex.k, G.A.ex.t, G.A.mx], [5, 1, undefined]);
  assert.strictEqual(C.scoreOf(G.A), 0.99, 'scoreOf: at most 4 of the 5 exam steps before the exam is passed');
  answer('A', 'A', ['a3'], {exam: true, typed: true, p: 0.5}); // TYPED.exam typed right answers: learned
  assert.ok(P.A.mx && !P.A.ex);
  G = replay();
  same(G, 'exam passed');
  assert.deepStrictEqual([G.A.mx, G.A.ex, C.scoreOf(G.A)], [P.A.mx, undefined, 1]);
  // Read with the choices of a pick (k 4, look-alike rule), a typed right answer would have counted half (PROG.LOOK)
  // and its expectation would have had a 1/4 floor: the replay reads |t as the app scored it.
  assert.deepStrictEqual(
    log.map(a => C.kOf(a.m, a.ch)),
    [Infinity, Infinity, Infinity, Infinity, 4, 4, Infinity, Infinity]
  );
  assert.strictEqual(C.guessOf('quiz|t|x', ''), 0);
});

test("replayBase: the shared history only, never this device's unsent answers (Codex review #399)", () => {
  const rec = C.replayProgress([row('p', 0, 'A', 'A', 'a0', 'A B C D'), row('p', 1, 'A', 'A', 'a1', 'A B C D')], {gen: GEN}).p.P,
    // This device: the two answers, a third not sent yet, a photo shown once more than the log says (a hint revealed),
    // and a genus the log does not have.
    before = {A: {ok: 3, ko: 0, h: '111', pg: 0.4, ps: {a0: [2, 1], a1: [1, 1], a9: [1, 1]}}, E: {ok: 4, ko: 0, h: '1111', pg: 0.5}},
    R = C.replayProgress(
      [row('p', 0, 'A', 'A', 'a0', 'A B C D'), row('p', 1, 'A', 'A', 'a1', 'A B C D'), row('p', 2, 'A', 'A', 'a9', 'A B C D')],
      {gen: GEN}
    ).p.P,
    M = C.replayedOf({P: R}, before, 1),
    B = {A: {ok: 2, ko: 0, h: '11', ps: {a0: [2, 1]}}, E: {ok: 4, ko: 0, h: '1111', pg: 0.5}},
    base = C.replayBase(rec, M, 1, B);
  assert.deepStrictEqual([M.A.ok, base.A.ok], [3, 2], 'the unsent answer is in the progress, not in the baseline');
  assert.deepStrictEqual(base.A.ps, {a0: [2, 1], a1: [1, 1]}, "per photo the larger of the replay's and the shared copy's");
  assert.deepStrictEqual(base.E, B.E, 'a genus the log lacks: the shared copy');
  assert.strictEqual(base.A.pg, rec.A.pg);
  assert.strictEqual(base[C.LEVEL].ok, 2);
});
