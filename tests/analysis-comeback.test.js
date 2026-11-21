require('./slot.js').testGuard();
// The Analyses module (analysis.js), Comeback by genus (ROADMAP "Analyses: next views", the comeback fit against the
// FSRS stability per genus): the stability multiplier κ planted in rusty comeback questions comes back, pooled and by
// genus; at the app's own stabilities it reads 1; too few questions give no estimate. tests/analysis.test.js says why the
// module's tests are split.
const test = require('node:test'),
  assert = require('node:assert');
const A = require('../analysis.js');

const sig = x => 1 / (1 + Math.exp(-x));
// Rusty comeback questions with a scoring record (readAnswers row, index 22: {d, r}): 4 choices (guess rate 0.25), the app's
// recall R and its expectation e = g + (1 - g) R q, answered right with the recall of stability κ times the app's:
// (1 + (R^-2 - 1) / κ)^-0.5 (FSRS.C = -0.5, so R^(1/C) = R^-2). kappa(g) the genus's planted κ.
function rusty(seed, kappa, players = 12, per = 300, genera = 6) {
  const R = A.rng(seed),
    rows = [];
  for (let p = 0; p < players; p++)
    for (let i = 0; i < per; i++) {
      const g = 'Gen' + ((p + i) % genera),
        rec = 0.3 + 0.6 * R(),
        q = sig(1 + 2 * (R() - 0.5)),
        E = Math.round((0.25 + 0.75 * rec * q) * 100) / 100,
        true_ = (1 + (rec ** -2 - 1) / kappa(g)) ** -0.5,
        y = R() < 0.25 + 0.75 * true_ * q ? 1 : 0,
        t = 1e9 + p * 1e8 + i * 9e5 * 8;
      rows.push([
        'p' + p,
        t,
        g,
        y ? g : 'Gen9',
        y,
        'quiz|c|k4',
        'f1',
        E,
        0,
        0,
        g + ' Gen7 Gen8 Gen9',
        0,
        5,
        0,
        null,
        null,
        null,
        '',
        null,
        null,
        null,
        null,
        {d: 0, r: Math.round(rec * 1000) / 1000}
      ]);
    }
  return rows;
}

test('prep reads the recall of a comeback question from its scoring record; none without, none at 1', () => {
  const row = (m, sc) => [
      'p',
      1e9,
      'Gen0',
      'Gen0',
      1,
      m,
      'f1',
      0.7,
      0,
      0,
      'Gen0 Gen1 Gen2 Gen3',
      0,
      5,
      0,
      null,
      null,
      null,
      '',
      null,
      null,
      null,
      null,
      sc
    ],
    D = A.prep([row('quiz|c', {d: 0, r: 0.8}), row('quiz|c', {d: 0}), row('quiz', null), row('quiz|c', {d: 0, r: 1})]);
  assert.deepStrictEqual(
    D.map(a => a.R),
    [0.8, null, null, null]
  );
  assert.strictEqual(A.cbRows(D).length, 1, 'only the question with a recall under 1 is fitted');
});

test('comeback by genus: a planted stability multiplier comes back, pooled and for the one genus that differs', () => {
  // Gen0 forgets four times faster than the app expects, the five others four times slower
  const D = A.prep(rusty(3, g => (g === 'Gen0' ? 0.25 : 4))),
    S = A.backGenus(D, 199, 5);
  assert.strictEqual(S.n, 3600);
  assert.strictEqual(S.players, 12);
  const by = Object.fromEntries(S.g.map(g => [g.k, g]));
  assert.ok(by.Gen0.est < 0.5 && by.Gen0.hi < 1, `Gen0 ${by.Gen0.est} to ${by.Gen0.hi}`);
  ['Gen1', 'Gen2', 'Gen3', 'Gen4', 'Gen5'].forEach(k => assert.ok(by[k].est > 1.5 && by[k].lo > 1, `${k} ${by[k].est} from ${by[k].lo}`));
  assert.strictEqual(S.g[0].k, 'Gen0', 'the genus that forgets most comes first');
  assert.ok(S.lo < S.est && S.est < S.hi && S.lo > 1 && S.hi < 6, `pooled ${S.lo} ${S.est} ${S.hi}`);
});

test('comeback by genus: at the app’s own stabilities the multiplier reads 1, its range holding 1', () => {
  const S = A.backGenus(A.prep(rusty(2, () => 1)), 199, 2);
  assert.ok(S.est > 0.8 && S.est < 1.25, `pooled ${S.est}`);
  assert.ok(S.lo < 1 && S.hi > 1, `range ${S.lo} to ${S.hi}`);
  S.g.forEach(g => assert.ok(g.est > 0.5 && g.est < 2, `${g.k} ${g.est}`));
});

test('comeback by genus: a handful of rusty questions gives counts and no estimate; the genera under 5 questions are only counted', () => {
  const few = A.backGenus(A.prep(rusty(5, () => 1, 1, 8, 2)), 0, 1);
  assert.strictEqual(few.n, 8);
  assert.strictEqual(few.est, undefined);
  const S = A.backGenus(A.prep(rusty(5, () => 1, 7, 6, 11)), 0, 1);
  assert.ok(S.n === 42 && S.est > 0, 'pooled with no bootstrap');
  assert.strictEqual(S.lo, null, 'no range without the bootstrap');
  assert.ok(S.other > 0 && S.other + S.g.reduce((s, g) => s + g.n, 0) === 42, `other ${S.other}`);
});

test('cbFit: the likelihood’s maximum, within the range, whatever the answers', () => {
  const rows = A.cbRows(A.prep(rusty(7, g => (g === 'Gen0' ? 3 : 3))));
  const lk = A.cbFit(rows);
  assert.ok(Math.abs(lk - Math.log(3)) < 0.45, `log κ ${lk}`);
  // every answer right: the multiplier goes to the top of the range, not beyond
  const right = rows.map(z => ({...z, y: 1}));
  assert.ok(A.cbFit(right) <= 4 + 1e-9 && A.cbFit(right) > 3);
  // a prior pulls a small genus towards the centre
  const few = rows.slice(0, 6);
  assert.ok(Math.abs(A.cbFit(few, 0, 1)) < Math.abs(A.cbFit(few)) + 1e-9);
});

test('comeback: the stability fit rides the Comeback analysis, a thin log keeping none', () => {
  const rows = rusty(8, () => 1, 8, 80, 6),
    D = A.prep(rows),
    // ordinary answers around the comeback questions, so the forgetting slope can fit
    ord = [];
  for (let p = 0; p < 8; p++)
    for (let i = 0; i < 40; i++) {
      const t = 5e8 + p * 1e8 + i * 3 * 864e5;
      ord.push(['p' + p, t, 'Gen' + (i % 3), 'Gen' + (i % 3), 1, 'quiz', 'f1', 0.8, 0, 0, 'Gen0 Gen1 Gen2 Gen3', 0, 5, 0]);
      ord.push([
        'p' + p,
        t + 864e5,
        'Gen' + (i % 3),
        i % 4 ? 'Gen' + (i % 3) : 'Gen9',
        i % 4 ? 1 : 0,
        'quiz',
        'f1',
        0.8,
        0,
        0,
        'Gen0 Gen1 Gen2 Gen3',
        0,
        5,
        0
      ]);
    }
  const r = A.comeback(A.prep([...rows, ...ord]), 0, 9);
  assert.ok(r.stab && r.stab.n === 640 && r.stab.est > 0, JSON.stringify(r.stab && {n: r.stab.n, est: r.stab.est}));
  void D;
  const t = A.comeback(A.prep(rows.slice(0, 30)), 0, 9);
  assert.ok(t.thin, 'under 100 answers: the Comeback analysis is thin');
});
