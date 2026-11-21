require('./slot.js').testGuard();
// A species of another family picked counts against both families (docs/FISH_PATH.md "Questions and choices at the
// species level", rule L2; fish rules version 6): core.js entryMiss through scoreAnswer, in the game and in the sheet's
// replay (replayProgress). The photo's family takes a miss in its bar, its recent results and its run; the family given,
// rule L2's unit given (recent results, run); neither ability, answer count nor mix-up moves. A pick inside the same
// family, a right answer, a scientific species or a family not met yet leave the families as they were.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const C = require('../core.js');
const dup = x => JSON.parse(JSON.stringify(x));

// Two families met, each with answers on its own questions (the domain-score bar), and the level.
const base = () => {
  const P = {};
  for (let i = 0; i < 16; i++) {
    const t = i % 2 ? 'f:A' : 'f:B';
    C.scoreAnswer(P, {t, c: t, ok: i % 7 !== 3, k: 4, chs: ['f:A', 'f:B'], ph: ['p' + i], cv: false, d0: 0, mu: 0});
  }
  return P;
};
// A common-name species question as quiz.js recordAnswer hands it to the scorer: from and cfrom, the families the
// species shown and the species given start from (treeSpUnits from).
const sq = (t, c, o = {}) => ({
  t,
  c,
  ok: t === c,
  k: 4,
  chs: [t, c, 's:a9', 's:b9'],
  ph: ['x1'],
  cv: true,
  d0: 0.2,
  mu: 0,
  from: o.from || 'f:A',
  ...(t !== c ? {cfrom: o.cfrom || 'f:B'} : {}),
  ...o
});
const fields = s => ({th: s.th, ok: s.ok, ko: s.ko, conf: s.conf, off: s.off, ps: s.ps});

test('another family picked: the photo family takes a miss in its bar, both families in their recent results and run', () => {
  const P = base(),
    A0 = dup(P['f:A']),
    B0 = dup(P['f:B']);
  P['f:A'].streak = 3;
  P['f:B'].streak = 2;
  const out = C.scoreAnswer(P, sq('s:a1', 's:b1'));
  assert.deepStrictEqual(out.up, ['f:A', 'f:B']);
  const A = P['f:A'],
    B = P['f:B'];
  // the photo's family: a miss in its bar's posterior, its stored bar never up; recent results, run
  assert.notDeepStrictEqual(A.dp, A0.dp);
  assert.ok(A.ds <= A0.ds);
  assert.strictEqual(A.h, (A0.h + '0').slice(-10));
  assert.strictEqual(A.streak, 0);
  // the family given: rule L2's unit given, its bar under the domain score untouched
  assert.deepStrictEqual(B.dp, B0.dp);
  assert.strictEqual(B.ds, B0.ds);
  assert.strictEqual(B.h, (B0.h + '0').slice(-10));
  assert.strictEqual(B.streak, 0);
  // the entries keep their own questions: no ability step, no answer counted, no offer nor mix-up recorded
  assert.deepStrictEqual(fields(A), fields(A0));
  assert.deepStrictEqual(fields(B), fields(B0));
  // the species: as before (the species shown a miss, the species given a false alarm)
  assert.strictEqual(P['s:a1'].ko, 1);
  assert.strictEqual(P['s:b1'].h, '0');
});

test('the families are untouched by a pick inside the family, a right answer, a family not met, a scientific species', () => {
  const cases = [
    ['inside the same family', P => C.scoreAnswer(P, sq('s:a1', 's:a2', {cfrom: 'f:A'}))],
    ['a right answer', P => C.scoreAnswer(P, sq('s:a1', 's:a1'))],
    ['the family given not met', P => C.scoreAnswer(P, sq('s:a1', 's:c1', {cfrom: 'f:C'}))],
    [
      'the scientific species (their tree hangs from the genera)',
      P => C.scoreAnswer(P, sq('sci:a1', 'sci:b1', {from: 'g:A1', cfrom: 'g:B1'}))
    ],
    ['scientific species with families as from', P => C.scoreAnswer(P, sq('sci:a1', 'sci:b1'))],
    ['"I don\'t know"', P => C.scoreAnswer(P, {...sq('s:a1', ''), ok: false, cv: false})]
  ];
  cases.forEach(([why, run]) => {
    const P = base(),
      A0 = dup(P['f:A']),
      B0 = dup(P['f:B']);
    const out = run(P);
    assert.deepStrictEqual(out.up, [], why);
    assert.deepStrictEqual(P['f:A'], A0, why);
    assert.deepStrictEqual(P['f:B'], B0, why);
    assert.ok(!P['f:C'], why);
  });
});

test('a record still under the moving average takes a miss on the photo shown, both families', () => {
  const P = base();
  ['f:A', 'f:B'].forEach(n => {
    delete P[n].dp;
    delete P[n].ds;
    P[n].pg = 0.6;
  });
  C.scoreAnswer(P, {...sq('s:a1', 's:b1'), dom: false});
  assert.ok(P['f:A'].pg < 0.6);
  assert.ok(P['f:B'].pg < 0.6);
});

// The sheet's replay on the real fish.json (core.js treeReplayGen): the families as the game leaves them, and the lx, lm
// of the game's exam and learned mark.
const F = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish.json'), 'utf8')),
  GEN = C.treeReplayGen(F),
  sid = n => 's:' + F.species.find(s => s.name === n).id,
  T = i => new Date(Date.UTC(2026, 10, 21, 0, i)).toISOString(),
  ans = (i, g, a, ch) => ({
    id: 'a' + i,
    t: T(i),
    s: 'fish',
    g,
    a,
    ok: g === a ? 1 : 0,
    m: 'quiz',
    ph: 'p' + i,
    ch: ch.join(' '),
    sc: {d: 0.1}
  });

test('replay: a species of another family picked counts against both families, as the game scores it', () => {
  const A = sid('Forcipiger flavissimus'),
    W = sid('Thalassoma lunare'),
    B = sid('Chaetodon kleinii'),
    fams = ['f:Butterflyfishes', 'f:Wrasses'],
    L = [];
  for (let i = 0; i < 12; i++) L.push(ans(i, fams[i % 2], fams[i % 2], fams));
  const before = C.replayProgress(
    L.map(a => C.logRow(a, 'p1')),
    {gen: GEN}
  ).p1.P;
  L.push(ans(20, A, W, [A, W, B]));
  const R = C.replayProgress(
    L.map(a => C.logRow(a, 'p1')),
    {gen: GEN}
  ).p1.P;
  assert.strictEqual(GEN[A].from, 'f:Butterflyfishes');
  assert.strictEqual(GEN[W].from, 'f:Wrasses');
  fams.forEach(n => {
    assert.strictEqual(R[n].h, (before[n].h + '0').slice(-10), n);
    assert.strictEqual(R[n].streak, 0, n);
    assert.strictEqual(R[n].th, before[n].th, n);
    assert.strictEqual(R[n].ko, before[n].ko, n);
    assert.strictEqual(R[n].lx, Date.parse(T(20)), n);
  });
  assert.ok(R['f:Butterflyfishes'].ds <= before['f:Butterflyfishes'].ds);
  assert.strictEqual(R['f:Wrasses'].ds, before['f:Wrasses'].ds);
  // a pick inside the family: the families as before (only the species)
  const L2 = L.slice(0, 12).concat([ans(20, A, B, [A, W, B])]),
    S = C.replayProgress(
      L2.map(a => C.logRow(a, 'p1')),
      {gen: GEN}
    ).p1.P;
  fams.forEach(n => assert.deepStrictEqual({...S[n], at: 0}, {...before[n], at: 0}, n));
});

test('fish rules version 6 replays every fish player; the corals and the sea slugs keep theirs', () => {
  const v = C.rvOf('fish'),
    last = C.rvsOf('fish').slice(-1)[0];
  assert.strictEqual(v, 6);
  assert.strictEqual(last.msg, null);
  assert.match(last.why, /both families/);
  assert.strictEqual(C.rvOf('seaslug'), 2);
});
