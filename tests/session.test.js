'use strict';
// Players › Activity › Recent sessions: a session unfolded (Pierre, 2026-11-05: "what the player made of the session").
// admin-journey.js sessionFacts, the facts the summary is drawn from, on made-up rows: [id, time, genus shown, answered,
// right, mode, photos, expected].
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  block = require('./block');
const src = fs.readFileSync(path.join(__dirname, '..', 'admin-journey.js'), 'utf8');
const {sessionFacts, SESS} = new Function(
  block(src, '// sessfacts: begin', '// sessfacts: end', {file: 'admin-journey.js'}) + '\nreturn {sessionFacts, SESS};'
)();
const M = 6e4,
  T = 1e12;
let n = 0;
const row = (t, g, a, ok, mode = 'quiz', ph = '', e = 0.7) => ['p1', T + t * M, g, a, ok, mode, ph || `f${n++}`, e];
const J = x => JSON.parse(JSON.stringify(x));

test('counts, expected, new genera and the gap since the last session', () => {
  const B = [row(-120, 'Acropora', 'Acropora', 1)],
    L = [
      row(0, 'Acropora', 'Acropora', 1, 'quiz', '', 0.8),
      row(1, 'Favia', 'Favites', 0, 'quiz', '', 0.6),
      row(2, 'Porites', 'Porites', 1, 'quiz', '', 0.7),
      row(3, 'Favia', 'Favia', 1, 'quiz', '', 0.9)
    ],
    F = sessionFacts(L, B);
  assert.strictEqual(F.n, 4);
  assert.strictEqual(F.ok, 3);
  assert.ok(Math.abs(F.exp - 0.75) < 1e-9);
  assert.strictEqual(F.gap, 120 * M);
  assert.deepStrictEqual(J(F.met), [
    [1, 'Favia'],
    [2, 'Porites']
  ]);
  assert.strictEqual(sessionFacts(L, []).gap, null, 'first session: no gap');
  assert.strictEqual(F.opened, undefined, 'a device never signed in: no saved copy');
});

test('difficulties: genera missed twice or more, pairs taken twice or more, the hardest photos missed first', () => {
  const D = {easy: -0.5, hard: 1.2, mid: 0.4},
    L = [
      row(0, 'Favia', 'Favites', 0, 'quiz', 'easy'),
      row(1, 'Favia', 'Favites', 0, 'quiz', 'mid hard'),
      row(2, 'Favia', 'Favia', 1),
      row(3, 'Porites', 'Goniopora', 0, 'quiz', 'nodiff'),
      row(4, 'Porites', 'Porites', 1)
    ],
    F = sessionFacts(L, [], {diff: f => (f in D ? D[f] : null)});
  assert.deepStrictEqual(J(F.missed), [['Favia', 2, 3]]);
  assert.deepStrictEqual(J(F.mix), [['Favia', 'Favites', 2]], 'a pair taken once is not a difficulty');
  assert.deepStrictEqual(
    F.photos.map(x => [x.f, x.g, x.a]),
    [
      ['hard', 'Favia', 'Favites'],
      ['easy', 'Favia', 'Favites'],
      ['nodiff', 'Porites', 'Goniopora']
    ],
    'the hardest photo of each missed question, hardest first, unknown difficulty last'
  );
});

test('most improved: a gain of SESS.GAIN or more, biggest first, at most SESS.TOP', () => {
  const L = [row(0, 'Acropora', 'Acropora', 1)],
    F = sessionFacts(L, [], {
      prog: {a: [0.1, 0.5], b: [0.2, 0.21], c: [0.3, 0.6], d: [0, 0.02], e: [0.5, 0.95], f: [0.9, 0.8]}
    });
  assert.deepStrictEqual(
    F.improved.map(x => x[0]),
    ['e', 'a', 'c']
  );
  assert.strictEqual(SESS.TOP, 3);
  const G = sessionFacts(L, [], {prog: {d: [0, 0.02], b: [0.2, 0.21]}});
  assert.deepStrictEqual(
    G.improved.map(x => x[0]),
    ['d'],
    '2 points count, 1 does not'
  );
});

test('runs, the misses at the end, exam and typed questions, the rolling curve', () => {
  const L = [
      ...Array.from({length: 10}, (_, i) => row(i, 'Acropora', 'Acropora', 1, i === 9 ? 'quiz|x' : 'quiz')),
      row(10, 'Favia', '', 0, 'quiz|t'),
      row(11, 'Favia', 'Favia', 1, 'quiz|t'),
      row(12, 'Favia', 'Favites', 0),
      row(13, 'Favia', 'Favites', 0, 'quiz|x'),
      row(14, 'Porites', 'Favia', 0)
    ],
    F = sessionFacts(L, []);
  assert.strictEqual(F.best, 10);
  assert.strictEqual(F.end, 3);
  assert.deepStrictEqual(F.exam, [2, 1]);
  assert.deepStrictEqual(F.typed, [2, 1]);
  assert.strictEqual(F.acc.length, L.length);
  assert.deepStrictEqual(F.acc.slice(0, 4), [null, null, null, null], 'drawn from the 5th answer');
  assert.strictEqual(F.acc[4], 1);
  assert.strictEqual(F.acc[14], 6 / SESS.WIN, 'over the last SESS.WIN answers');
});

test('from the saved copy: cards, the offer and achievements within SESS.EDGE of the answers', () => {
  const L = [row(0, 'Acropora', 'Acropora', 1), row(10, 'Favia', 'Favia', 1)],
    t = m => T + m * M,
    F = sessionFacts(L, [row(-90, 'Porites', 'Porites', 1)], {
      saved: {
        intro: {Acropora: [0, 1, t(-1)], Pavona: [2, 0, t(11)], Porites: [0, 1, t(-91)], Galaxea: [3, 0, t(30)]},
        offer: {at: 2, open: 1, t: t(4)},
        ach: {_v: 2, met10: t(9), run10: t(14), pct5: t(-60), _best: 12}
      }
    });
  assert.deepStrictEqual(F.opened, ['Pavona'], 'a card shown in the session, its genus not asked yet');
  assert.ok(F.offer && F.offer.open);
  assert.deepStrictEqual(F.ach, ['met10', 'run10'], 'in time order, within the edge, no _ keys');
  assert.strictEqual(sessionFacts(L, [], {saved: null}).ach, null, 'null while the saved copy is read');
  assert.strictEqual(sessionFacts(L, [], {saved: {}}).offer, null);
});
