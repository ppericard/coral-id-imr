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
  assert.deepStrictEqual(Object.keys(R.P), ['C']);
  assert.strictEqual(R.n, 1);
});

test('replayedOf: the replayed bars with the saved exams, not one passed under the former model', () => {
  const rep = C.replayProgress([row('p', 0, 'A', 'A', 'a0', 'A B C D'), row('p', 1, 'C', 'C', 'c0', 'C D E A')], {gen: GEN}).p;
  const saved = {
    A: {pg: 0.9, mx: 1762000000000, ok: 30, ko: 1, h: '1111111111'}, // learned since 2026-11-02: kept
    C: {L: 0.97, mx: 1, ok: 12, ko: 0, h: '1111111111'}, // learned under BKT: dropped
    D: {pg: 0.82, ex: {k: 2, v: ['wide'], at: 40}, ok: 9, ko: 0, h: '111111111'}, // no answer in the log: its own bar, its exam
    '~level': {ok: 5, ko: 1, th: 0.3}
  };
  const G = C.replayedOf(rep, saved),
    L = ['A', 'B', 'C', 'D', 'E'];
  assert.strictEqual(G.A.pg, rep.P.A.pg);
  assert.strictEqual(G.A.mx, saved.A.mx);
  assert.ok(!G.C.mx && G.C.pg === rep.P.C.pg, 'an exam passed under BKT is taken again');
  assert.deepStrictEqual([G.D.pg, G.D.ex], [0.82, saved.D.ex]);
  assert.ok(!('~level' in G));
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
