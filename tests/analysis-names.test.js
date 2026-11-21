require('./slot.js').testGuard();
// The Analyses module (analysis.js), common-name modifiers (the name-confusion study's (h), Q124, docs/reviews/
// 2026-11-05-name-confusion-study.md §4 and §6): the modifier words of a common name, what the tree file gives of its species
// units, and the options' flags in the per-offer rows of Confusions. The fit itself is in analysis-names-fit.test.js.
const test = require('node:test'),
  assert = require('node:assert');
const A = require('../analysis.js');

test('modWords: the words before the head noun, a hyphenated word as its parts, no eponym, no short or stop word', () => {
  assert.deepStrictEqual(A.modWords('Yellowtail damsel'), ['yellowtail']);
  assert.deepStrictEqual(A.modWords('Three-lined wrasse'), ['three', 'lined']);
  assert.deepStrictEqual(A.modWords('Bicolor cleaner wrasse'), ['bicolor', 'cleaner']);
  assert.deepStrictEqual(A.modWords('Blue-green chromis'), ['blue', 'green']);
  assert.deepStrictEqual(A.modWords('Bleeker’s damsel'), [], 'a possessive is a person, not a feature');
  assert.deepStrictEqual(A.modWords("Randall's blue-spot goby"), ['blue', 'spot']);
  assert.deepStrictEqual(A.modWords('Chromis'), [], 'a name of one word has none');
  assert.deepStrictEqual(A.modWords('Black-spot and white-spot damsel'), ['black', 'spot', 'white'], 'a stop word and a repeat go');
  assert.deepStrictEqual(A.modWords('Lined (banded) wrasse'), ['lined'], 'a bracket is not part of the name');
  assert.deepStrictEqual(A.modWords(null), []);
  assert.deepStrictEqual(A.modWords('Ocellated ID wrasse'), ['ocellated'], 'a word of 2 letters or fewer goes');
});

test('modMeta: the species units asked by their common name, with their genus and the declared look-alikes both ways', () => {
  const F = {
    species: [
      {id: 's1', common: 'Yellowtail damsel', genus: 'g:Amblyglyphidodon'},
      {id: 's2', common: 'Yellowtail coris', genus: 'g:Coris'},
      {id: 's3', common: 'Lined wrasse', genus: 'g:Coris'},
      {id: 's4', common: '', genus: 'g:Coris'},
      {id: 's5'}
    ],
    lookalikes: [
      {id: 'M1', a: 's2', b: 's3'},
      {id: 'M2', a: 's1', b: 's4'},
      {id: 'M3', a: 's1', b: 'nope'}
    ]
  };
  assert.deepStrictEqual(A.modMeta(F), {
    's:s1': {w: ['yellowtail'], g: 'g:Amblyglyphidodon', l: []},
    's:s2': {w: ['yellowtail'], g: 'g:Coris', l: ['s:s3']},
    's:s3': {w: ['lined'], g: 'g:Coris', l: ['s:s2']}
  });
  assert.deepStrictEqual(A.modMeta(null), {});
  assert.deepStrictEqual(A.modMeta({}), {});
});

test('confRows: each option offered carries whether it shares a word, a genus, a look-alike; an option with no common name carries none', () => {
  const MOD = A.modMeta({
      species: [
        {id: 'a', common: 'Yellowtail damsel', genus: 'g:X'},
        {id: 'b', common: 'Yellowtail wrasse', genus: 'g:Y'},
        {id: 'c', common: 'Lined wrasse', genus: 'g:X'},
        {id: 'd', common: 'Pale wrasse', genus: 'g:Z'}
      ],
      lookalikes: [{a: 'a', b: 'd'}]
    }),
    row = (g, ans, ch) => ['p', 1e9, g, ans, ans === g ? 1 : 0, 'quiz', 'f1', 0.7, 0, 0, ch, 0, 5, 0],
    D = A.prep([row('s:a', 's:b', 's:a s:b s:c s:d'), row('s:a', 's:a', 's:a s:b s:c f:Other')]),
    E = A.confRows(D, MOD),
    by = Object.fromEntries(E.map((e, i) => [i + ':' + e.to, e]));
  // 3 options besides the right one, twice
  assert.strictEqual(E.length, 6);
  assert.deepStrictEqual(
    ['0:s:b', '1:s:c', '2:s:d'].map(k => [by[k].mo, by[k].mod, by[k].sg, by[k].lk]),
    [
      [1, 1, 0, 0],
      [1, 0, 1, 0],
      [1, 0, 0, 1]
    ]
  );
  // an option that is not a species unit asked by its common name: not applicable
  assert.strictEqual(by['5:f:Other'].mo, undefined);
  assert.strictEqual(by['5:f:Other'].mod, undefined);
  // without the tree file's names: no flag at all
  assert.ok(A.confRows(D).every(e => e.mo === undefined && e.mod === undefined));
});
