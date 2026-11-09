// Full replay of the answer log (core.js replayProgress, replayedOf; docs/LEARNING.md "Full replay"): the app's progress
// rules (pgRightW, pgMissW, pgMemW, pgStep) run over the sheet's log, in time order. Also tools/memreplay.js on a sample.
const test = require('node:test');
const block = require('./block.js'); // the block of a browser file a test runs, its markers checked
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
  const R = C.replayProgress(rows, {gen: GEN, dom: false});
  const look = R.look.P.A.pg,
    easy = R.easy.P.A.pg;
  assert.strictEqual(look, steps([1, 1, 1, 1, 1], [1, 1, 1, 1, 1]), 'in full against a look-alike, 4 choices, new photos');
  assert.strictEqual(easy, steps([0.5, 0.5, 0.5, 0.5, 0.5], [1, 1, 1, 1, 1]), 'PROG.LOOK among easy choices');
  assert.ok(look > easy);
  // Two plausible choices (|k2) prove less than four.
  const k2 = C.replayProgress(
    [row('k', 0, 'A', 'A', 'x', 'A B')].map(r => ((r[5] = 'quiz|k2'), r)),
    {gen: GEN, dom: false}
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
      {gen: GEN, dom: false}
    ).p,
    hard = C.replayProgress(
      [
        row('p', 0, 'A', 'A', 'a0', 'A B C D'),
        row('p', 1, 'A', 'A', 'a1', 'A B C D'),
        row('p', 2, 'A', 'B', 'a2', 'A B C D', eAt(1, 3)) // a photo 3 units above the player
      ],
      {gen: GEN, dom: false}
    ).p;
  const before = steps([1, 1], [1, 1]),
    // The success aimed for at the player's global level before the miss (core.js aimOf, as quiz.js answer weighs it).
    aim = C.aimOf(
      C.replayProgress([row('p', 0, 'A', 'A', 'a0', 'A B C D'), row('p', 1, 'A', 'A', 'a1', 'A B C D')], {gen: GEN, dom: false}).p.P[
        C.LEVEL
      ].th
    );
  // At the game's target (e logged ≈ 0.80, ability 1 above the photo): in full, against the aim at the player's level.
  assert.ok(Math.abs(at.P.A.pg - C.pgStep(before, false, C.pgMissW(1, 0, 4, 1, aim))) < 2e-4, `${at.P.A.pg}`);
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
  const F = C.replayProgress(fresh, {gen: GEN, mem, dom: false}).p.P.A,
    S = C.replayProgress(same, {gen: GEN, mem, dom: false}).p.P.A,
    off = C.replayProgress(same, {gen: GEN, mem, memory: false, dom: false}).p.P.A;
  assert.ok(S.pg < F.pg, `${S.pg} vs ${F.pg}`);
  assert.strictEqual(off.pg, F.pg, 'the rule before the photo memory: repeats count in full');
  assert.deepStrictEqual(S.ps.same, [6, 6]);
  // The 2nd answer on it: right once before, offset mem[2], weight pgMemW.
  const w = [];
  C.replayProgress(same.slice(0, 2), {gen: GEN, mem, dom: false, onAnswer: (r, x) => w.push(x.w)});
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
    D: {pg: 0.82, ex: {k: 2, v: ['wide'], at: 40}, ok: 9, ko: 0, h: '111111111'}, // no answer in the log: dropped (rule D9)
    '~level': {ok: 5, ko: 1, th: 0.3}
  };
  const G = C.replayedOf(rep, saved),
    L = ['A', 'B', 'C', 'D', 'E'];
  assert.strictEqual(G.A.pg, rep.P.A.pg);
  assert.strictEqual(G.A.mx, saved.A.mx);
  assert.ok(!G.C.mx && G.C.pg === rep.P.C.pg, 'an exam passed under BKT is taken again');
  assert.ok(!G.D, 'its answers in no log: they go (rule D9, Q330)');
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
  // A device that skips several versions with the standard card sees it once, at the last of them (the versions before
  // rules version 9's apology).
  const SV = C.RVS.find(x => x.msg === C.RV_SORRY).v;
  assert.deepStrictEqual(
    C.rvMsgs(0, SV - 1),
    C.RVS.slice(0, SV - 1).filter((x, i) => x.msg && !C.RVS.slice(i + 1, SV - 1).some(y => y.msg === x.msg))
  );
  assert.deepStrictEqual(
    C.rvMsgs(0, SV - 1).map(x => x.v),
    [SV - 1],
    'the versions before the apology have the standard card: one card'
  );
  // The domain-score bar's apology (rules version 9, Pierre 2026-11-06; PR #611's card, Q109): every player whose %
  // moved by a point, its PS from the sheet's Notes tab; in a jump it replaces the standard card (it says more).
  assert.strictEqual(SV, 9);
  assert.deepStrictEqual(
    [C.RV_SORRY.kind, C.RV_SORRY.only, C.RV_SORRY.min, C.RV_SORRY.ps, C.RV_SORRY.down],
    ['apology', 'changed', 1, 'card.rv8.ps', true]
  );
  assert.deepStrictEqual(
    C.rvMsgs(0, SV, true).map(x => x.v),
    [SV - 1],
    'the apology left out: the standard card back'
  );
  assert.match(C.RV_SORRY.pct, /\{from\}%.*\{to\}%/);
  assert.doesNotMatch(C.RV_SORRY.t + C.RV_SORRY.p, /\bbars?\b/i, 'never "bars": players say progress (Pierre)');
  assert.deepStrictEqual(
    C.rvMsgs(0, SV).map(x => x.v),
    [SV],
    'a jump through the apology: the apology alone'
  );
  assert.deepStrictEqual(
    C.rvMsgs(SV - 1, SV).map(x => x.v),
    [SV]
  );
  // Rules version 10 (the log the only reference, Q322, Q330): no card, nor any card of the versions a jump to it skips.
  assert.strictEqual(C.RVS[9].msg, null, 'no card (Pierre, 2026-11-09, Q330)');
  assert.deepStrictEqual(C.rvMsgs(0, 10), [], 'nor a card of a version skipped');
  assert.deepStrictEqual(C.rvMsgs(9, 10), []);
  assert.deepStrictEqual(C.rvMsgs(C.RV, C.RV), []);
});

// Rules version 3 (Codex P1 on #422): the hierarchical photo Elo (sheet v31) adds the genus offset to the expectation the
// photo memory offsets are fitted against, so the offsets the sheet hands replayProgress move, and with them the bars of a
// log with repeated photos. Hence a new rules version, so every player adopted under v1 or v2 is replayed again.
test('RVS v3: the genus offset moves the memory offsets, and the replayed progress with them', () => {
  const rows = [];
  let t = Date.UTC(2026, 10, 3, 6, 0, 0);
  for (let i = 0; i < 60; i++) {
    const g = i % 3 ? 'Acropora' : 'Porites',
      ok = g === 'Acropora' ? (i % 5 ? 1 : 0) : i % 2;
    rows.push([
      'ana',
      (t += 60000),
      g,
      ok ? g : g === 'Acropora' ? 'Porites' : 'Acropora',
      ok,
      'quiz',
      `${g.toLowerCase()}-${i % 4}`,
      0.75,
      0.5,
      null,
      'Acropora Porites Favites Montipora'
    ]);
  }
  // The offsets this log gave before the genus offset (core.js of #399, rules version 1), measured once.
  const before = [0, 0.47, -0.79, -1.66],
    now = C.photoMemOf(rows).mem;
  assert.notDeepStrictEqual(now, before, 'the genus offset changes the memory offsets');
  const pg = mem => C.replayProgress(rows, {mem, dom: false}).ana.P.Acropora.pg;
  assert.notStrictEqual(pg(now), pg(before), 'and the replayed progress');
  const v3 = C.RVS.find(x => x.v === 3);
  assert.ok(v3 && v3.msg === C.RVS.find(x => x.v === 2).msg && C.RV >= 3, 'rules version 3, with the standard card');
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
  // The same steps by hand, in the app's order (quiz.js answer: the mix-ups term on the record before the answer, the
  // offers and the mix-up, the genus shown, the global level, the genus given).
  const P = {},
    st = n => (P[n] = P[n] || {ok: 0, ko: 0, streak: 0}),
    prior = (a, b) =>
      GEN[a].look.includes(b) || GEN[b].look.includes(a) ? C.CONF.LOOK : GEN[a].fam === GEN[b].fam ? C.CONF.FAM : C.CONF.BASE;
  let cfs = 0;
  rows.forEach(r => {
    const t = r[2],
      c = r[3],
      ok = !!r[4],
      s = st(t),
      k = C.kOf(r[5], r[10]),
      chs = r[10].split(' '),
      q = (r[7] - 1 / k) / (1 - 1 / k),
      d = r[8] - Math.log(q / (1 - q)),
      // model.js confTerm with no pooled data (the pooled score is the pair's prior).
      cf =
        k >= 3
          ? Math.max(0, ...chs.filter(n => n !== t && GEN[n]).map(n => C.confGap(C.pairConf(P, t, n), C.confScore(undefined, prior(t, n)))))
          : 0;
    cfs += cf;
    chs.forEach(x => x !== t && ((s.off = s.off || {})[x] = (s.off[x] || 0) + 1));
    if (!ok && c) (s.conf = s.conf || {})[c] = (s.conf[c] || 0) + 1;
    s[ok ? 'ok' : 'ko']++;
    C.eloStep(P, t, s, ok, d + cf, k);
    if (P[C.LEVEL]) P[C.LEVEL][ok ? 'ok' : 'ko']++;
    else P[C.LEVEL] = C.levelSeed(P);
    C.eloStep(P, C.LEVEL, P[C.LEVEL], ok, d + cf, k);
    s.lt = P[C.LEVEL].th; // the genus takes the level after this answer's step (rules version 7, Q137)
    // The genus given: no Elo step (2026-11-03, docs/LEARNING.md "The genus wrongly given in the Elo").
  });
  assert.ok(cfs > 0, 'the mix-up of A with B makes the next question on A harder for this player');
  assert.deepStrictEqual([R.A.th, R.A.vr, R.B.th, R.C.th], [P.A.th, P.A.vr, undefined, P.C.th], 'B, only given wrongly: no ability');
  assert.deepStrictEqual([R[C.LEVEL].ok, R[C.LEVEL].ko, R[C.LEVEL].th, R[C.LEVEL].at], [4, 1, P[C.LEVEL].th, rows[4][1]]);
  assert.deepStrictEqual([R.A.streak, R.B.streak, R.A.at, R.A.du], [2, 0, rows[4][1], 1]);
  assert.strictEqual(C.abilityOf({}, 'A'), 0, 'a genus never answered, no global level: 0');
});

test('replayProgress: the genus wrongly given loses progress, gets a miss and its run reset, but its ability does not move', () => {
  // B is answered right twice, then given for a photo of A three times.
  const rows = [row('p', 0, 'B', 'B', 'b0', 'B A C D'), row('p', 1, 'B', 'B', 'b1', 'B A C D')];
  for (let i = 2; i < 5; i++) rows.push(row('p', i, 'A', 'B', 'a' + i, 'A B C D'));
  const before = C.replayProgress(rows.slice(0, 2), {gen: GEN, dom: false}).p.P.B,
    R = C.replayProgress(rows, {gen: GEN, dom: false}).p.P;
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
  assert.deepStrictEqual(C.logRow(a, 'me'), [
    'me',
    Date.parse(a.t),
    'A',
    'B',
    0,
    'quiz|k3',
    'f1 f2',
    0.7,
    0.4,
    1,
    'A B C',
    null,
    null,
    ...Array(9).fill(null), // 13-21: enlarged to species shown, unused by the replay
    null
  ]);
  // The scoring record (core.js scoreRec) at LOG_SC, 22, as in the sheet's readAnswers rows (rules version 6).
  assert.strictEqual(C.LOG_SC, 22);
  assert.deepStrictEqual(C.logRow({...a, sc: {d: 0.5, l: 1}}, 'me')[22], {d: 0.5, l: 1});
  // The seconds to answer (rt) at 12, as in the sheet's readAnswers rows (response time, rules version 4).
  assert.strictEqual(C.logRow({...a, rt: 4.5}, 'me')[12], 4.5);
  assert.deepStrictEqual(C.logRow({id: 'y', t: 'x', g: 'A', a: 'A', ok: 1}, 'me').slice(7), [
    null,
    null,
    null,
    '',
    null,
    null,
    ...Array(9).fill(null), // 13-21
    null
  ]);
});

test('replayedOf: what the app takes from the replay and what it keeps from its own copy', () => {
  const rep = C.replayProgress(
    [row('p', 0, 'A', 'A', 'a0', 'A B C D'), row('p', 1, 'A', 'A', 'a1', 'A B C D'), row('p', 2, 'C', 'C', 'c0', 'C D E A')],
    {gen: GEN}
  ).p;
  const saved = {
    A: {pg: 0.3, ok: 2, ko: 0, h: '11', th: 0.1, ps: {zz: [9, 9]}, dd: 2, dl: 20400, ro: ['o1'], cor: 1, mx: 5, at: 1, pm: 1},
    C: {pg: 0.5, ok: 4, ko: 0, h: '1111', ex: {k: 1, v: ['wide'], at: 3}}, // more answers than the log: the log's (rule D9)
    E: {L: 0.9, mx: 1, ok: 1, ko: 0, h: '1'}, // not in the log, learned under the former model: the mark goes
    '~level': {ok: 2, ko: 0, th: 0.2, at: 5}
  };
  const G = C.replayedOf(rep, saved, 3);
  ['pg', 'ok', 'ko', 'h', 'off', 'th', 'vr', 'streak'].forEach(f => assert.deepStrictEqual(G.A[f], rep.P.A[f], f));
  assert.deepStrictEqual(G.A.ps, {...rep.P.A.ps, zz: [9, 9]}, 'the photos seen: the replay with the saved ones it lacks');
  assert.deepStrictEqual([G.A.dd, G.A.dl, G.A.ro, G.A.cor, G.A.mx, G.A.pm, G.A.rv], [2, 20400, ['o1'], 1, 5, 1, 3]);
  assert.strictEqual(G.A.at, rep.P.A.at);
  assert.ok(!('u' in G.A) && !('L' in G.A));
  assert.deepStrictEqual([G.C.ok, G.C.ko, G.C.pg, G.C.rv], [rep.P.C.ok, rep.P.C.ko, rep.P.C.pg, 3], "the log's record, fewer answers");
  assert.ok(!G.E, 'not in the log: its answer goes');
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
// below is quiz.js answer step by step, with model.js's own TYPED, pgWeight, ability, abilityStep and aimP (run from its
// source): the ability (th, vr), the level it was stepped against (lt) and the global level as the game steps them
// (Calibration step 2, #415: a genus moves with the global level; the miss weighed against the aim at the player's
// level), the replay the same.
test('typed answers: the replay of the log rebuilds the progress the app scored live, its abilities (th, lt) included', () => {
  const vm = require('vm'),
    src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    cut = (a, b) => block(src, a, b, {through: true}),
    // The pooled score of a pair with no pooled data: its prior (the replay's: look-alikes, family; these genera share no
    // IMR growth form, so model.js pooledConf gives the same).
    prior = (a, b) =>
      GEN[a].look.includes(b) || GEN[b].look.includes(a) ? C.CONF.LOOK : GEN[a].fam === GEN[b].fam ? C.CONF.FAM : C.CONF.BASE,
    M = {
      ...C,
      GX: n => GEN[n],
      pooledConf: (a, b) => C.confScore(undefined, prior(a, b)),
      confusable: (t, n) => GEN[t].look.includes(n),
      startV: () => C.startVars(), // the first-launch answer: none here, the default player's prior
      startS: () => C.subjectOf('coral'), // the subject on screen (model.js): the corals, whose answers the sheet replays
      P: {}
    };
  vm.createContext(M);
  vm.runInContext(
    cut('const TYPED = {', '\n};') +
      '\n' +
      cut('const pgLook = ', ';\n') +
      cut('function pgWeight(t, chs, k) {', '\n}') +
      '\n' +
      cut('const aimP = ', ';\n') +
      cut('const startP = ', ';\n') +
      cut('const ability = ', ';\n') +
      'const abilityStep = (n, s, good, d, k, w = 1) => eloStep(P, n, s, good, d, k, w, startP());\n' +
      cut('const confTerm = ', ';\n') +
      '\nthis.T = {TYPED, pgWeight, aimP, ability, abilityStep, confTerm};',
    M
  );
  const {TYPED, pgWeight, aimP, ability, abilityStep, confTerm} = M.T,
    EXAM = {n: 5};
  assert.strictEqual(TYPED.k, Infinity);
  assert.strictEqual(pgWeight('A', [], TYPED.k), 1, 'a typed right answer counts in full');
  const mem = [0, -0.44, -1.1, -1.7],
    t0 = C.CF_LOGGED + 3600e3, // the logged e includes the photo memory and the mix-ups term, as today's app logs it
    // The app's record: A near its exam with 3 exam questions passed, B and C met, the global level.
    P0 = {
      A: {pg: C.PROG.M + 0.01, ok: 30, ko: 2, h: '1111111111', th: 2, ps: {}, streak: 6, ex: {k: 3, v: ['wide'], at: 40}},
      B: {pg: 0.4, ok: 6, ko: 3, h: '110101101', th: 0.3, ps: {}, streak: 0},
      C: {pg: 0.6, ok: 9, ko: 2, h: '11011111', th: 1, ps: {}, streak: 3},
      [C.LEVEL]: {ok: 47, ko: 7, th: 1.4}
    },
    P = (M.P = JSON.parse(JSON.stringify(P0))),
    log = [],
    cfs = [],
    sig1 = x => 1 / (1 + Math.exp(-x)),
    logit = p => Math.log(p / (1 - p)),
    st = n => (P[n] = P[n] || {ok: 0, ko: 0, h: '', streak: 0});
  // One answer as quiz.js answer scores it: genus t shown on photos ph, answered c ('' = I don't know), typed or with
  // the 4 choices chs, an exam question or not; p the chance the player had (the question's difficulty is set from it,
  // so the e logged with 2 decimals is exact and the comparison below can be strict).
  const answer = (t, c, ph, {typed = false, chs = [], exam = false, p = 0.7} = {}) => {
    const good = c === t,
      s = st(t),
      k = typed ? TYPED.k : 4,
      // Known mix-ups (model.js confTerm), on the record before this answer, as quiz.js answer scores it.
      cf = confTerm(t, chs, k);
    cfs.push(cf);
    chs.forEach(x => x !== t && ((s.off = s.off || {})[x] = (s.off[x] || 0) + 1));
    if (good) (s.ok++, s.streak++);
    else {
      s.ko++;
      s.streak = 0;
      if (c) (s.conf = s.conf || {})[c] = (s.conf[c] || 0) + 1;
    }
    const th0 = ability(t),
      fam = C.memFam(
        ph.map(f => (s.ps || {})[f]),
        mem
      ),
      x = k === 4 ? logit((p - 0.25) / 0.75) : logit(p),
      dm = th0 - x,
      d0 = dm - fam - cf;
    s.pg = C.pgStep(C.pgOf(s), good, good ? pgWeight(t, chs, k) * C.pgMemW(th0, d0, fam, k) : C.pgMissW(th0, dm, k, 1, aimP()));
    abilityStep(t, s, good, dm, k);
    if (P[C.LEVEL]) P[C.LEVEL][good ? 'ok' : 'ko']++;
    else P[C.LEVEL] = C.levelSeed(P);
    abilityStep(C.LEVEL, P[C.LEVEL], good, dm, k);
    s.lt = P[C.LEVEL].th; // the genus takes the level after this answer's step (rules version 7, Q137)
    ph.forEach(f => {
      const y = ((s.ps = s.ps || {})[f] = s.ps[f] || [0, 0]);
      y[0]++;
      if (good) y[1]++;
    });
    s.h = (s.h + (good ? 1 : 0)).slice(-10);
    if (!good && GEN[c]) {
      const w = st(c);
      w.pg = C.pgStep(C.pgOf(w), false, C.pgMissW(ability(c), d0, k, 1, aimP()));
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
      for (const f of ['pg', 'th', 'lt', 'vr'])
        assert.ok(Math.abs(G[n][f] - P[n][f]) < 1e-9, `${why}: ${n}.${f} ${G[n][f]} vs app ${P[n][f]}`);
      assert.ok(Math.abs(C.abilityOf(G, n) - ability(n)) < 1e-9, `${why}: ${n} ability with the level's move`);
    }
    for (const f of ['th', 'vr']) assert.ok(Math.abs(G[C.LEVEL][f] - P[C.LEVEL][f]) < 1e-9, `${why}: level ${f}`);
    assert.deepStrictEqual([G[C.LEVEL].ok, G[C.LEVEL].ko], [P[C.LEVEL].ok, P[C.LEVEL].ko]);
  };
  // The aim at this level is not the 0.8 reference, and the level has moved since the genera's own steps: both matter.
  assert.ok(Math.abs(aimP() - 0.8) > 0.02);
  answer('C', 'C', ['c1'], {typed: true, p: 0.6}); // typed, right, a new photo: in full, no guess rate
  assert.ok(Math.abs(P.C.pg - C.pgStep(P0.C.pg, true, 1)) < 1e-12);
  answer('C', 'C', ['c1'], {typed: true, p: 0.8}); // the same photo again: only what memory does not explain
  answer('B', '', ['b1'], {typed: true, p: 0.75}); // "I don't know": a miss for B only
  answer('B', 'C', ['b2'], {typed: true, p: 0.7}); // B typed as C: against both, C by its own ability
  answer('C', 'C', ['c2'], {chs: ['C', 'D', 'E', 'A'], p: 0.85}); // a pick among 4 easy choices, between typed ones
  answer('A', 'A', ['a1'], {exam: true, chs: ['A', 'B', 'C', 'D'], p: 0.6}); // the 4th exam question, picked
  // B among 4 choices with C, after B was typed as C: a known mix-up, the question harder for this player (confTerm);
  // a right answer, then a miss on the same pair.
  answer('B', 'B', ['b3'], {chs: ['B', 'C', 'D', 'E'], p: 0.6});
  answer('B', 'C', ['b4'], {chs: ['B', 'C', 'D', 'E'], p: 0.65});
  assert.ok(
    cfs.slice(-2).every(x => x > 0),
    `the mix-ups term on B: ${cfs.slice(-2)}`
  );
  answer('A', 'A', ['a2'], {exam: true, typed: true, p: 0.55}); // 5 right, 1 typed: not passed, 99% at most
  assert.deepStrictEqual([P.A.ex.k, P.A.ex.t, !!P.A.mx], [5, 1, false]);
  // Every genus answered was stepped against the level (lt), and the level moved after (levelMove).
  assert.ok(['A', 'B', 'C'].every(n => typeof P[n].lt === 'number') && C.levelMove(P, 'B', P.B) !== 0);
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
    [Infinity, Infinity, Infinity, Infinity, 4, 4, 4, 4, Infinity, Infinity]
  );
  assert.strictEqual(C.guessOf('quiz|t|x', ''), 0);
});

test("replayBase: the shared history only, never this device's unsent answers (Codex review #399)", () => {
  const rec = C.replayProgress([row('p', 0, 'A', 'A', 'a0', 'A B C D'), row('p', 1, 'A', 'A', 'a1', 'A B C D')], {gen: GEN}).p.P,
    // This device: the two answers, a third not sent yet, a photo shown once more than the log says (a hint revealed),
    // and a genus the log does not have (its answers go, rule D9: in neither the progress nor the baseline).
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
  assert.ok(!M.E && !base.E, 'a genus the log lacks: gone from both');
  assert.strictEqual(base.A.pg, rec.A.pg);
  assert.strictEqual(base[C.LEVEL].ok, 2);
});

// Response time (rules version 4, 2026-11-04; core.js RTIME, rtWeight, rtAdd; docs/LEARNING.md "Response time"): the
// app weighs a right answer's two ability steps by its seconds against the player's earlier timed answers, kept in the
// global level's record (P[LEVEL].rt); the sheet's replay of the log, which reads the same seconds, rebuilds the same
// abilities and the same record, from scratch or going on from an earlier replay.
test('response time: the replay of the log rebuilds the abilities the app stepped live with the seconds, and its time record', () => {
  const vm = require('vm'),
    src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    quiz = fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8'),
    cut = (a, b) => block(src, a, b, {through: true});
  // quiz.js answer scores through core.js scoreAnswer with its seconds, the time weighing only once the sheet replays it
  // (scoreAnswer steps the genus shown and the level with the same weight, then records the time).
  assert.ok(quiz.includes('sec: tm.rt,') && quiz.includes('timed: rtOn()') && quiz.includes('scoreAnswer(P, q)'));
  const live = sheet => {
    // No first-launch answer: the default prior; the corals on screen (model.js startS).
    const M = {...C, P: {}, sheetV: () => sheet, startV: () => C.startVars(), startS: () => C.subjectOf('coral')};
    vm.createContext(M);
    vm.runInContext(
      cut('const startP = ', ';\n') +
        cut('const ability = ', ';\n') +
        'const abilityStep = (n, s, good, d, k, w = 1) => eloStep(P, n, s, good, d, k, w, startP());\n' +
        cut('const rtOn = ', ';\n') +
        '\nthis.T = {ability, abilityStep, rtOn};',
      M
    );
    const {ability, abilityStep, rtOn} = M.T,
      P = M.P,
      log = [],
      ws = [],
      r = (a => () => ((a = (a * 16807) % 2147483647), a / 2147483647))(7),
      G = ['A', 'B', 'C', 'D'],
      sig1 = x => 1 / (1 + Math.exp(-x)),
      logit = p => Math.log(p / (1 - p));
    for (let i = 0; i < 80; i++) {
      const t = G[Math.floor(r() * 4)],
        typed = i % 9 === 4, // typed: its seconds are left out (slower by design)
        other = G[(G.indexOf(t) + 1 + Math.floor(r() * 3)) % 4],
        k = typed ? Infinity : 2,
        p = Math.round((typed ? 0.4 + 0.5 * r() : 0.55 + 0.4 * r()) * 100) / 100,
        good = r() < p,
        // Seconds as the app logs them (tenths); none on some answers (a clock that never started).
        rt = i % 13 === 6 ? undefined : Math.round(Math.exp(1.8 - (good ? 0.4 : 0) + 0.7 * (r() + r() - 1)) * 10) / 10,
        s = (P[t] = P[t] || {ok: 0, ko: 0}),
        th0 = ability(t),
        dm = th0 - (typed ? logit(p) : logit((p - 0.5) / 0.5));
      s[good ? 'ok' : 'ko']++;
      const rw = rtOn() ? C.rtWeight(P[C.LEVEL], rt, k, good) : 1;
      ws.push(rw);
      abilityStep(t, s, good, dm, k, rw);
      if (P[C.LEVEL]) P[C.LEVEL][good ? 'ok' : 'ko']++;
      else P[C.LEVEL] = C.levelSeed(P);
      abilityStep(C.LEVEL, P[C.LEVEL], good, dm, k, rw);
      s.lt = P[C.LEVEL].th; // the genus takes the level after this answer's step (rules version 7, Q137)
      C.rtAdd(P[C.LEVEL], rt, k);
      log.push({
        id: 'a' + i,
        t: new Date(T0 + i * 60e3).toISOString(),
        g: t,
        a: good ? t : typed ? '' : other,
        ok: good ? 1 : 0,
        m: typed ? 'quiz|t' : 'quiz|k2',
        ph: t.toLowerCase() + i,
        ch: typed ? '' : [t, other].join(' '),
        e: Math.round(100 * (typed ? sig1(th0 - dm) : 0.5 + 0.5 * sig1(th0 - dm))) / 100,
        th: th0,
        nw: 1,
        ...(rt === undefined ? {} : {rt})
      });
    }
    return {P, log, ws};
  };
  const same = (R, P, why, rt = true) => {
    for (const n of ['A', 'B', 'C', 'D'])
      for (const f of ['th', 'vr', 'lt']) assert.ok(Math.abs(R[n][f] - P[n][f]) < 1e-9, `${why}: ${n}.${f} ${R[n][f]} vs app ${P[n][f]}`);
    for (const f of ['th', 'vr']) assert.ok(Math.abs(R[C.LEVEL][f] - P[C.LEVEL][f]) < 1e-9, `${why}: level ${f}`);
    assert.deepStrictEqual([R[C.LEVEL].ok, R[C.LEVEL].ko], [P[C.LEVEL].ok, P[C.LEVEL].ko], why);
    if (rt) assert.deepStrictEqual(R[C.LEVEL].rt, P[C.LEVEL].rt, why);
  };
  // Script v32 or later: the app weighs its steps by the time.
  const on = live(C.RT_SHEET),
    rows = on.log.map(a => C.logRow(a, 'me'));
  assert.ok(on.ws.filter(w => w !== 1).length > 20, 'many right answers weighed by their time');
  assert.ok(on.ws.some(w => w === C.RTIME.HI) && on.ws.some(w => w === C.RTIME.LO) && on.ws.some(w => w > 1 && w < C.RTIME.HI));
  assert.ok(
    on.ws.slice(0, C.RTIME.MIN).every(w => w === 1),
    'the first timed answers: no median yet'
  );
  // Typed answers and answers without seconds are not counted in the record.
  const n = Object.values(on.P[C.LEVEL].rt).reduce((a, x) => a + x, 0);
  assert.strictEqual(n, on.log.filter(a => a.rt !== undefined && !/\|t/.test(a.m)).length);
  same(C.replayProgress(rows, {gen: GEN}).me.P, on.P, 'the whole log');
  // The sheet's replay of the first answers, then this device's on top (sync.js replayAdopt).
  const head = C.replayProgress(rows.slice(0, 50), {gen: GEN});
  same(C.replayProgress(rows.slice(50), {gen: GEN, start: head}).me.P, on.P, 'going on from a replay');
  // What the app adopts keeps the replay's time record (replayedOf), and the merge baseline too (replayBase).
  const rep = C.replayProgress(rows, {gen: GEN}).me;
  assert.deepStrictEqual(C.replayedOf(rep, {}, C.RV)[C.LEVEL].rt, on.P[C.LEVEL].rt);
  assert.deepStrictEqual(C.replayBase(rep.P, C.replayedOf(rep, {}, C.RV), C.RV, {})[C.LEVEL].rt, on.P[C.LEVEL].rt);
  // An older script (rule D4): the app does exactly what it did before, every weight 1, the replay without time.
  const off = live(C.RT_SHEET - 1);
  assert.ok(off.ws.every(w => w === 1));
  // (The app still records the times, which the replay without time leaves out.)
  same(
    C.replayProgress(
      off.log.map(a => C.logRow(a, 'me')),
      {gen: GEN, time: false}
    ).me.P,
    off.P,
    'before the script replays the time',
    false
  );
  assert.deepStrictEqual(off.P[C.LEVEL].rt, on.P[C.LEVEL].rt, 'the times are recorded either way');
  assert.notStrictEqual(off.P[C.LEVEL].th, on.P[C.LEVEL].th);
});

// rtMedian keeps the record's sorted keys beside it (admin speed, 2026-11-04): the same medians as sorting them each time,
// through a long record built answer by answer, a record changed outside rtAdd, and a copy of it.
test('response time: the median with the kept sorted keys equals the median sorted afresh', () => {
  const ref = rt => {
    const ks = Object.keys(rt || {})
        .map(Number)
        .filter(x => x > 0 && rt[x] > 0)
        .sort((a, b) => a - b),
      n = ks.reduce((t, x) => t + rt[x], 0);
    if (n < C.RTIME.MIN) return null;
    const at = i => {
      let c = 0;
      for (const x of ks) if ((c += rt[x]) > i) return Math.log(x / 10);
    };
    return n % 2 ? at((n - 1) / 2) : (at(n / 2 - 1) + at(n / 2)) / 2;
  };
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const G = {};
  for (let i = 0; i < 3000; i++) {
    C.rtAdd(G, Math.round((1 + rnd() * rnd() * 40) * 10) / 10, 4);
    if (i % 7 === 0) assert.strictEqual(C.rtMedian(G.rt), ref(G.rt), `answer ${i}`);
    if (i === 1500) G.rt[999] = 40; // a key added outside rtAdd
    if (i === 2000) G.rt[999] = 0; // a count set to 0
  }
  const copy = JSON.parse(JSON.stringify(G.rt));
  assert.strictEqual(C.rtMedian(copy), ref(G.rt));
  assert.strictEqual(C.rtMedian(undefined), null);
  assert.strictEqual(C.rtMedian({}), null);
});

test('response time: the median of the earlier times, the weight, and the record two devices add up', () => {
  const G = {};
  [4.5, 5, 6, 3.2, 8, 5, 4.1, 7.7, 5, 6.3].forEach(x => {
    assert.strictEqual(C.rtMedian(G.rt), null, 'fewer than RTIME.MIN timed answers: no median');
    assert.strictEqual(C.rtWeight(G, 2, 4, true), 1);
    C.rtAdd(G, x, 4);
  });
  C.rtAdd(G, 9, Infinity); // typed: not counted
  C.rtAdd(G, undefined, 4); // no seconds
  C.rtAdd(G, 0, 4); // a clock at 0
  assert.deepStrictEqual(G.rt, {32: 1, 41: 1, 45: 1, 50: 3, 60: 1, 63: 1, 77: 1, 80: 1});
  // Ten times: the mean of the 5th and 6th (5 and 5) in logs.
  assert.strictEqual(C.rtMedian(G.rt), Math.log(5));
  C.rtAdd(G, 6, 4);
  assert.strictEqual(C.rtMedian(G.rt), Math.log(5), 'eleven: the 6th');
  C.rtAdd(G, 6.3, 4);
  assert.strictEqual(C.rtMedian(G.rt), (Math.log(5) + Math.log(6)) / 2);
  const m = C.rtMedian(G.rt),
    w = x => Math.min(1.5, Math.max(0.5, 1 - C.RTIME.K * (Math.log(x) - m)));
  assert.strictEqual(C.rtWeight(G, 5.4, 4, true), w(5.4));
  assert.strictEqual(C.rtWeight(G, 2, 4, true), C.RTIME.HI, 'much faster: the most');
  assert.strictEqual(C.rtWeight(G, 30, 4, true), C.RTIME.LO, 'much slower: the least');
  assert.strictEqual(C.rtWeight(G, 2, 4, false), 1, 'a miss: unchanged');
  assert.strictEqual(C.rtWeight(G, 2, Infinity, true), 1, 'typed: unchanged');
  assert.strictEqual(C.rtWeight(G, null, 4, true), 1, 'no seconds: unchanged');
  // Two devices (mergeProgress): the times each added since the shared copy add up, as the answer counts.
  const B = {[C.LEVEL]: {ok: 3, ko: 0, th: 0.2, rt: {50: 2, 60: 1}}},
    P = {[C.LEVEL]: {ok: 4, ko: 0, th: 0.3, rt: {50: 2, 60: 1, 45: 1}}},
    R = {[C.LEVEL]: {ok: 4, ko: 1, th: 0.1, rt: {50: 3, 60: 1, 70: 1}}};
  assert.deepStrictEqual(C.mergeProgress(B, P, R)[C.LEVEL].rt, {50: 3, 60: 1, 70: 1, 45: 1});
});

// Codex review #428 (P1): the live game applies the first-launch prior only once the sync script replays it (core.js
// START_SHEET, model.js startP): before, a genus never answered starts as the default player's, as the sheet replays it.
test('the first-launch prior in the live ability only from sheet v36 (Codex review #428)', () => {
  const vm = require('vm'),
    src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    cut = (a, b) => block(src, a, b, {through: true});
  const at = (sheet, S = C.subjectOf('coral')) => {
    const M = {...C, P: {[C.LEVEL]: {ok: 10, ko: 2, th: 0.4}}, sheetV: () => sheet, startV: () => C.startVars('know'), startS: () => S};
    vm.createContext(M);
    vm.runInContext(cut('const startP = ', ';\n') + cut('const ability = ', ';\n') + '\nthis.T = {ability};', M);
    return M.T.ability('Pocillopora');
  };
  const P = {[C.LEVEL]: {ok: 10, ko: 2, th: 0.4}};
  assert.strictEqual(at(C.START_SHEET - 1), C.playerStart(P, 'Pocillopora', 0), 'before v36: the default prior');
  assert.strictEqual(at(C.START_SHEET), C.playerStart(P, 'Pocillopora', C.startVars('know').p), "from v36: the answer's");
  assert.notStrictEqual(at(C.START_SHEET - 1), at(C.START_SHEET));
  // A subject whose answers are not logged (fish) is never replayed: its welcome answer's prior applies at once.
  assert.strictEqual(at(C.START_SHEET - 1, C.subjectOf('fish')), at(C.START_SHEET), 'fish: the prior with any sheet');
});

// Per-format offsets (Pierre, 2026-11-06, Q138; core.js fmtOf, fmtOffsetsOf, fmtOff; rules version 6).
test('fmtOffsetsOf: a format right more often than its guess rate explains gets a positive offset, from trusted answers', () => {
  const rows = [];
  // Two trusted players: 4-choice questions as expected (80% right at e 0.8), 2-of-4-plausible ones right 95% of the
  // time where the app expected 70%, typed ones right 50% at e 0.8.
  for (const id of ['p1', 'p2'])
    for (let i = 0; i < 40; i++) {
      rows.push([id, T0 + i * 3, 'A', i % 5 ? 'A' : 'B', i % 5 ? 1 : 0, 'quiz', 'a-1', 0.8, 1, 0, 'A B C D']);
      rows.push([id, T0 + i * 3 + 1, 'A', i % 20 ? 'A' : 'B', i % 20 ? 1 : 0, 'quiz|k2', 'a-2', 0.7, 1, 0, 'A B C D']);
      if (i < 15) rows.push([id, T0 + i * 3 + 2, 'A', i % 2 ? 'A' : '', i % 2, 'quiz|t', 'a-3', 0.8, 1, 0, '']);
    }
  // A player at chance (never trusted): their misses on 2-choice questions move nothing.
  for (let i = 0; i < 40; i++) rows.push(['bot', T0 + 500 + i, 'A', 'B', 0, 'quiz|k2', 'a-2', 0.7, 1, 0, 'A B C D']);
  const F = C.fmtOffsetsOf(rows);
  assert.ok(Math.abs(F.k4[0]) < 0.15, JSON.stringify(F));
  assert.ok(F.k2[0] > 1, 'easier than 1 in 2 explains: ' + JSON.stringify(F));
  assert.strictEqual(F.k2[1], 80, 'the trusted answers only');
  assert.ok(F.typed[0] < -0.5, 'typed: harder than the app thought');
  // The prior N(0, FMT.SD^2) keeps a format near 0 on few answers; under FMT.N answers, no offset served.
  const few = rows.filter(r => r[5] !== 'quiz|k2' || r[1] % 3 === 1).filter((r, i) => r[5] !== 'quiz|k2' || i % 4 === 0);
  const Ff = C.fmtOffsetsOf(few);
  assert.ok(!Ff.k2 || Ff.k2[1] >= C.FMT.N, JSON.stringify(Ff));
  assert.ok(!C.fmtOffsetsOf(rows.filter(r => r[5] !== 'quiz|t')).typed);
  assert.strictEqual(C.fmtOff(F, 'k2'), F.k2[0]);
  assert.strictEqual(C.fmtOff(F, 'exam'), 0);
  assert.strictEqual(C.fmtOff(null, 'k2'), 0);
  // Read only from a sheet that serves and replays them (rule D4).
  assert.deepStrictEqual(C.fmtsOf({v: C.FMT_SHEET - 1, fmt: F}), {});
  assert.deepStrictEqual(C.fmtsOf({v: C.FMT_SHEET, fmt: F}), F);
});

test('replayProgress with the format offsets: a right 2-choice answer the format explains raises the ability less', () => {
  const rows = [];
  for (let i = 0; i < 12; i++) {
    const r = row('p', i, 'A', i % 4 ? 'A' : 'C', 'a-' + i, 'A C', eAt(1, 0.5, 2), 1);
    r[5] = 'quiz|k2';
    rows.push(r);
  }
  const th = o => C.replayProgress(rows, {gen: GEN, ...o}).p.P.A.th,
    lv = o => C.replayProgress(rows, {gen: GEN, ...o}).p.P[C.LEVEL].th;
  // No offsets (an older sheet), or none for this format: exactly as before.
  assert.strictEqual(th({fmt: {}}), th({}));
  assert.strictEqual(th({fmt: {k4: [0.5, 100]}}), th({}));
  // An offset of +1 on Again questions (2 choices shown): each right answer was expected more, so it moves less, and
  // each miss more; the global level the same way.
  assert.ok(th({fmt: {again: [1, 100]}}) < th({}), [th({fmt: {again: [1, 100]}}), th({})].join(' '));
  assert.ok(lv({fmt: {again: [1, 100]}}) < lv({}));
  // The domain-score bar takes the offset too (rules version 9, Q146): the right answers the format explains prove less.
  const ds = o => C.replayProgress(rows, {gen: GEN, ...o}).p.P.A.ds;
  assert.ok(ds({fmt: {again: [1, 100]}}) < ds({}), [ds({fmt: {again: [1, 100]}}), ds({})].join(' '));
  // The moving average (a record of the former rules, dom: false) replays the same as before: the offsets are not its.
  assert.strictEqual(
    C.replayProgress(rows, {gen: GEN, dom: false, fmt: {again: [1, 100]}}).p.P.A.pg,
    C.replayProgress(rows, {gen: GEN, dom: false}).p.P.A.pg
  );
});

test('the format offset is scored by scoreAnswer, logged in the scoring record (o) and replayed as logged, not from fmt', () => {
  // scoreRec keeps o (3 decimals), drops it at 0; scoreIn rounds df as logged.
  assert.deepStrictEqual(C.scoreRec({d: 0.5, o: 1.14159}), {d: 0.5, o: 1.142});
  assert.deepStrictEqual(C.scoreRec({d: 0.5, o: 0}), {d: 0.5});
  const q0 = {t: 'A', c: 'A', ok: true, k: 2, chs: ['A', 'C'], ph: ['a-1'], d0: 0.5, fam: 0, cf: 0, p: 0, timed: false};
  const qi = C.scoreIn({...q0, df: 1.14159});
  assert.strictEqual(qi.df, 1.142);
  // The offset takes the ability steps' expectation only: the genus and the level move less on a right answer the format
  // explains, the progress weight and the logged e stay as without it.
  const P1 = {},
    P0 = {},
    r1 = C.scoreAnswer(P1, qi),
    r0 = C.scoreAnswer(P0, C.scoreIn(q0));
  assert.ok(P1.A.th < P0.A.th && P1[C.LEVEL].th < P0[C.LEVEL].th, [P1.A.th, P0.A.th].join(' '));
  assert.deepStrictEqual([r1.e, r1.w, P1.A.pg], [r0.e, r0.w, P0.A.pg]);
  assert.deepStrictEqual(C.scoreLog(qi, r1).o, 1.142);
  assert.strictEqual(C.scoreLog(C.scoreIn(q0), r0).o, undefined);
  // The replay: a row with a scoring record replays its logged o whatever fmt says now (Q132: what the game scored).
  const rows = [];
  for (let i = 0; i < 8; i++) {
    const r = row('p', i, 'A', i % 4 ? 'A' : 'C', 'a-' + i, 'A C', eAt(1, 0.5, 2), 1);
    r[5] = 'quiz|k2';
    while (r.length < C.LOG_SC) r.push(null);
    r[C.LOG_SC] = C.scoreRec({d: 0.5, o: i < 4 ? 1 : 0});
    rows.push(r);
  }
  const th = o => C.replayProgress(rows, {gen: GEN, ...o}).p.P.A.th;
  assert.strictEqual(th({fmt: {again: [3, 100]}}), th({}), 'fmt is not read for a row with a scoring record');
  const none = rows.map(r => [...r.slice(0, C.LOG_SC), C.scoreRec({d: 0.5})]);
  assert.ok(th({}) !== C.replayProgress(none, {gen: GEN}).p.P.A.th, 'the logged offsets move the replay');
});

test('Code.gs serves the same per-format offsets as core.js fmtOffsetsOf (?stats=1 fmt, v77)', () => {
  const {loadCodeGs} = require('./gas.js');
  const s = loadCodeGs();
  let n = 0;
  for (const who of ['Ana', 'Ben'])
    for (let i = 0; i < 40; i++)
      s.post({
        name: who,
        pin: '1234',
        data: {},
        summary: {},
        answers: [
          {
            id: 'f' + n++,
            t: new Date(Date.UTC(2026, 10, 6, 0, 0, n)).toISOString(),
            g: 'Acropora',
            a: i % 6 ? 'Acropora' : 'Porites',
            ok: i % 6 ? 1 : 0,
            m: ['quiz', 'quiz|k2', 'quiz-duel|Acropora|Porites', 'quiz|t'][i % 4],
            ch: i % 4 === 3 ? '' : i % 4 === 2 ? 'Acropora Porites' : 'Acropora Porites Favites Montipora',
            ph: 'acropora-' + (i % 3),
            e: [0.8, 0.7, 0.75, 0.8][i % 4],
            th: 1
          }
        ]
      });
  const rows = s.post({readAnswers: 1, token: 'ghp_write000000000000000000'}).rows,
    st = s.get({stats: '1'});
  assert.deepStrictEqual(st.fmt, C.fmtOffsetsOf(rows));
  assert.deepStrictEqual(Object.keys(st.fmt).sort(), ['duel', 'k2', 'k4', 'typed']);
});
