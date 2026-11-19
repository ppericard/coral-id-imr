require('./slot.js').testGuard();
// Your tricky pairs on My progress (the name study's (f), Q124; docs/decisions/2026-11-19-tricky-pairs.md): progress.js
// trickyPairs picks the pairs a player mixes up most from their own record only (core.js pairConf), and trickyHTML draws
// them, a link to the comparison where the subject has one. Read only: the record is never written. Run on made-up
// answers, with core.js's own pairConf and confScore.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js'),
  C = require('../core.js');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'progress.js'), 'utf8');
const T = (() => {
  const ctx = {pairConf: C.pairConf, confScore: C.confScore, CONF: C.CONF};
  vm.createContext(ctx);
  vm.runInContext(
    block(SRC, '// Your tricky pairs (the name study', '\nfunction quizBoard() {', {file: 'progress.js'}) +
      '\nthis.T = {TRICKY, trickyPairs, trickyHTML};',
    ctx
  );
  return ctx.T;
})();
// The made-up units are plain letters; every one is a unit of the subject unless said otherwise.
const ALL = n => /^[A-Z]$/.test(n);
const pick = (P, units = Object.keys(P), known = ALL, hide) => JSON.parse(JSON.stringify(T.trickyPairs(P, units, known, hide)));

test('trickyPairs: from the player’s own record, both directions, a pair once', () => {
  // A and B: 2 mix-ups each way, offered 6 and 4 times; read from either unit, the pair comes once, a before b.
  const P = {B: {conf: {A: 2}, off: {A: 6}}, A: {conf: {B: 2}, off: {B: 4}}};
  assert.deepStrictEqual(pick(P), [['A', 'B', 4, 10]]);
  assert.deepStrictEqual(C.pairConf(P, 'A', 'B'), [10, 4], 'the same record as core.js pairConf');
});

test('trickyPairs: none below TRICKY.MIN mix-ups, so nothing for a player with only single slips', () => {
  assert.strictEqual(T.TRICKY.MIN, 2);
  const P = {A: {conf: {B: 1, C: 1}, off: {B: 3, C: 9}}, D: {ok: 5, ko: 0}};
  assert.deepStrictEqual(pick(P), [], 'one mix-up is a slip, not a tricky pair');
  assert.deepStrictEqual(pick({}), [], 'a new player: nothing');
  P.C = {conf: {A: 1}};
  assert.deepStrictEqual(pick(P), [['A', 'C', 2, 9]], 'two, one each way, make it tricky');
});

test('trickyPairs: ranked by the own rate shrunk by CONF.W offers; a pair now told apart sinks', () => {
  const P = {
    A: {conf: {B: 2}, off: {B: 2}}, // 2 of 2: 2 / (2 + 8) = 0.2
    C: {conf: {D: 6}, off: {D: 12}}, // 6 of 12: 6 / 20 = 0.3
    E: {conf: {F: 5}, off: {F: 60}}, // 5 of 60: told apart since, 5 / 68 = 0.07
    G: {conf: {H: 3}, off: {H: 22}} // 3 of 22: 3 / 30 = 0.1
  };
  assert.deepStrictEqual(
    pick(P).map(x => x[0] + x[1]),
    ['CD', 'AB', 'GH'],
    'the pair mixed up 6 of 12 leads, two of two follows, 5 of 60 is left out (TRICKY.N 3)'
  );
  assert.strictEqual(T.TRICKY.N, 3);
  // Same rate: more mix-ups first.
  const Q = {A: {conf: {B: 2}, off: {B: 2}}, C: {conf: {D: 4}, off: {D: 12}}};
  assert.deepStrictEqual(
    pick(Q).map(x => x[0] + x[1]),
    ['CD', 'AB'],
    '4 / 20 and 2 / 10 tie at 0.2: the one with more mix-ups first'
  );
  // An old mix-up logged before offers were counted counts as offered once (pairConf).
  assert.deepStrictEqual(pick({A: {conf: {B: 3}}}), [['A', 'B', 3, 3]]);
});

test('trickyPairs: only units of the subject, never a mystery tile, never the unit with itself', () => {
  const P = {A: {conf: {B: 3, Old: 4, A: 5, M: 3}, off: {B: 3}}, M: {conf: {A: 1}}};
  assert.deepStrictEqual(
    pick(P, ['A', 'M'], ALL, n => n === 'M'),
    [['A', 'B', 3, 3]],
    'M is a mystery tile: its pair is not named'
  );
  assert.deepStrictEqual(
    pick(P, ['A', 'M']).map(x => x[0] + x[1]),
    ['AM', 'AB'],
    'without the mask, both; Old is not a unit of the subject'
  );
  assert.deepStrictEqual(pick(P, []), [], 'only the units the board draws are read');
});

test('trickyPairs: read only, the record is never written', () => {
  const P = {A: {ok: 3, ko: 4, conf: {B: 3, C: 2}, off: {B: 5, C: 2}}, B: {conf: {A: 1}}, C: {}};
  const before = JSON.stringify(P);
  const deep = o => (Object.freeze(o), Object.values(o).forEach(v => v && typeof v === 'object' && deep(v)), o);
  assert.doesNotThrow(() => T.trickyPairs(deep(P), Object.keys(P), ALL));
  assert.strictEqual(JSON.stringify(P), before);
});

test('trickyHTML: a link to the comparison where there is one, a plain chip elsewhere, nothing when empty', () => {
  const name = n => `<i>${n}</i>`,
    L = [['A', 'B', 4, 10]];
  const cmp = T.trickyHTML(L, name, (a, b) => `#learn/compare/${a}/${b}`);
  assert.match(cmp, /<h3 class="label">Your tricky pairs<\/h3>/);
  assert.match(
    cmp,
    /<a class="chip" href="#learn\/compare\/A\/B" title="Mixed up 4 times in 10 questions that offered both\. Compare them side by side">/
  );
  assert.match(cmp, /<span><i>A<\/i> ↔ <i>B<\/i> <small>· 4 of 10<\/small><\/span>/, 'one inline box: the spaces stay in the flex chip');
  const plain = T.trickyHTML(L, name, () => '');
  assert.doesNotMatch(plain, /<a |href/, 'no comparison page (fish, sea slugs): no link');
  assert.match(plain, /<span class="chip" title="Mixed up 4 times in 10 questions that offered both">/);
  assert.strictEqual(
    T.trickyHTML([], name, () => ''),
    '',
    'no pair yet: no section'
  );
});

test('the section names no subject: the subject’s words come from SUBJ and uname', () => {
  const code = block(SRC, '// Your tricky pairs (the name study', '\nfunction quizBoard() {', {file: 'progress.js'})
    .split('\n')
    .filter(l => !l.trim().startsWith('//'))
    .join('\n');
  assert.doesNotMatch(code, /\b(coral|corals|genus|genera|fish|seaslug|sea slug|species)\b/i);
});
