'use strict';
require('./slot.js').testGuard();
// The Answer log's and the Pairs' readings for any subject (fish admin at parity with the corals, Pierre 2026-11-08):
// admin.js logConds, pairPrior, fishUnitRec and noChoiceMixups (between `// answerlog: begin` / `end`). Made-up rows,
// the sheet's readAnswers shape: [id, time, shown, answered, right, mode, photos, expected, ability, new photos, choices].
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  block = require('./block');
const ROOT = path.join(__dirname, '..'),
  C = require('../core.js');
const {logConds, pairPrior, fishUnitRec, noChoiceMixups, typedText} = new Function(
  'fmtOf',
  'trustOf',
  'CONF',
  block(fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8'), '// answerlog: begin', '// answerlog: end', {file: 'admin.js'}) +
    '\nreturn {logConds, pairPrior, fishUnitRec, noChoiceMixups, typedText};'
)(C.fmtOf, C.trustOf, C.CONF);
const CORAL = C.SUBJECTS.find(S => !S.sheets),
  FISH = C.SUBJECTS.find(S => S.sheets);
let t = 0;
const row = (id, shown, answered, ok, mode = 'quiz', photos = 'p1', choices = '') => [
  id,
  t++,
  shown,
  answered,
  ok ? 1 : 0,
  mode,
  photos,
  0.7,
  0,
  0,
  choices
];
const conds = (R, S) => Object.fromEntries(logConds(R, S).map(([k, n, ok]) => [k, [n, ok]]));

test('logConds: a coral log reads as before, the corallites from its last view', () => {
  const R = [
    row('a', 'Favia', 'Favia', 1, 'quiz', 'favia-wide-1'),
    row('a', 'Favia', 'Favites', 0, 'quiz', 'favia-wide-1 favia-macro-2'),
    row('b', 'Porites', 'Porites', 1, 'quiz-duel', 'porites-medium-1')
  ];
  assert.deepStrictEqual(logConds(R, CORAL), [
    ['Quiz', 2, 1],
    ['Duel', 1, 1],
    ['Single view', 2, 2],
    ['All views', 1, 0],
    ['With corallites', 1, 0],
    ['Without corallites', 2, 2]
  ]);
});

test('logConds: fish answers by rank and, once one is typed, typed against picked; no view rows', () => {
  const R = [
    row('a', 'f:Damselfishes', 'f:Damselfishes', 1),
    row('a', 'f:Damselfishes', 'f:Wrasses', 0),
    row('a', 'g:Chromis', 'g:Chromis', 1, 'quiz|t'),
    row('b', 'g:Amphiprion', '', 0, 'quiz|k3|t')
  ];
  const c = conds(R, FISH);
  assert.deepStrictEqual(c, {
    Quiz: [4, 2],
    'Family questions': [2, 1],
    'Genus questions': [2, 1],
    Typed: [2, 1],
    'From choices': [2, 1]
  });
  assert.ok(!('Single view' in c) && !('Duel' in c), 'one view: no view rows; no duel answered: no Duel row');
  assert.ok(!('Typed' in conds(R.slice(0, 2), FISH)), 'nothing typed: no typed rows');
});

// The fish data as fishAdmin reads them: gen holds the families (core.js fishGen records: look, fam their line, forms their
// group of the identification key), fam maps every family, genus and species sheet id to its family, spu each species
// unit to its family and the other species units of it (core.js fishSpUnits).
const FA = {
  gen: {
    'f:Damselfishes': {look: ['f:Cardinalfishes'], fam: 'Pomacentridae', forms: ['g17']},
    'f:Cardinalfishes': {look: ['f:Damselfishes'], fam: 'Apogonidae', forms: ['g16']},
    'f:Wrasses': {look: [], fam: 'Labridae', forms: ['g17']},
    'f:Gobies': {look: [], fam: 'Gobiidae', forms: ['g20']}
  },
  fam: {
    'f:Damselfishes': 'f:Damselfishes',
    'f:Cardinalfishes': 'f:Cardinalfishes',
    'f:Wrasses': 'f:Wrasses',
    'f:Gobies': 'f:Gobies',
    'g:Chromis': 'f:Damselfishes',
    'g:Amphiprion': 'f:Damselfishes',
    'g:Thalassoma': 'f:Wrasses',
    'g:Valenciennea': 'f:Gobies',
    's:Chromis viridis': 'f:Damselfishes'
  },
  spu: {
    's:s091': {family: 'f:Damselfishes', look: ['s:s084']},
    's:s084': {family: 'f:Damselfishes', look: ['s:s091']},
    's:s201': {family: 'f:Wrasses', look: []},
    's:s301': {family: 'f:Gobies', look: []}
  }
};
const prior = (a, b) => pairPrior(a, b, fishUnitRec(FA, a, 'g:'), fishUnitRec(FA, b, 'g:'))[0];

test('pairPrior with fishUnitRec: declared families, two genera of one family, else Other', () => {
  assert.strictEqual(prior('f:Damselfishes', 'f:Cardinalfishes'), 'Look-alike', 'declared both ways');
  assert.strictEqual(prior('f:Damselfishes', 'f:Gobies'), 'Other');
  assert.strictEqual(prior('g:Chromis', 'g:Amphiprion'), 'Look-alike', 'two genera of one family, as the game declares them');
  assert.strictEqual(prior('g:Chromis', 'g:Valenciennea'), 'Other', 'genera of two families in two key groups');
  assert.deepStrictEqual(fishUnitRec(FA, 'g:Chromis', 'g:').look, ['g:Amphiprion'], 'its siblings only, never a species sheet id');
  assert.deepStrictEqual(fishUnitRec(FA, 'g:Unknown', 'g:'), {look: [], fam: '', forms: []}, 'a unit the data do not know');
  assert.deepStrictEqual(fishUnitRec(null, 'f:Damselfishes', 'g:'), {look: [], fam: '', forms: []}, 'before the fish data are read');
});

test('pairPrior with fishUnitRec: two families of one key group start as the game starts them (model.js confPrior FORM)', () => {
  // the game: a shared "growth form" (app.js imrFormsOf: a fish unit's forms, its family's key group) above Other
  assert.deepStrictEqual(
    pairPrior('f:Damselfishes', 'f:Wrasses', fishUnitRec(FA, 'f:Damselfishes', 'g:'), fishUnitRec(FA, 'f:Wrasses', 'g:')),
    ['Key group', C.CONF.FORM]
  );
  assert.strictEqual(prior('g:Chromis', 'g:Thalassoma'), 'Key group', "their genera take their families' group");
  assert.strictEqual(prior('s:s091', 's:s201'), 'Key group', 'so do their species');
  // a declared look-alike stays one whatever the groups (Cardinalfishes in another group)
  assert.strictEqual(prior('f:Cardinalfishes', 'f:Damselfishes'), 'Look-alike');
});

test('fishUnitRec: a species unit, the other species units of its family as the game declares them (core.js fishSpUnits)', () => {
  assert.strictEqual(prior('s:s091', 's:s084'), 'Look-alike', 'two species of one family');
  assert.strictEqual(prior('s:s084', 's:s301'), 'Other', 'species of two families in two key groups');
  assert.deepStrictEqual(fishUnitRec(FA, 's:s091', 'g:'), {look: ['s:s084'], fam: 'Pomacentridae', forms: ['g17']});
  assert.deepStrictEqual(fishUnitRec(FA, 's:s999', 'g:'), {look: [], fam: '', forms: []}, 'a species unit the data do not know');
});

test('pairPrior: the coral records as before (look-alike, family, other) with their rates', () => {
  const G = {
    Favia: {look: ['Dipsastraea'], fam: 'Merulinidae'},
    Dipsastraea: {look: [], fam: 'Merulinidae'},
    Favites: {look: [], fam: 'Merulinidae'}
  };
  const P = (a, b) => pairPrior(a, b, G[a] || {look: []}, G[b] || {look: []});
  assert.deepStrictEqual(P('Dipsastraea', 'Favia'), ['Look-alike', C.CONF.LOOK]);
  assert.deepStrictEqual(P('Favites', 'Dipsastraea'), ['Family', C.CONF.FAM]);
  assert.deepStrictEqual(P('Favites', 'Porites'), ['Other', C.CONF.BASE]);
});

test('noChoiceMixups: typed mix-ups apart from those logged before v10, trusted players only, as confusionOf', () => {
  // a trusted player: 12 right answers out of 12 four-choice questions, then the mix-ups
  const R = [...Array(12)].map(() =>
    row('a', 'f:Damselfishes', 'f:Damselfishes', 1, 'quiz', 'p1', 'f:Damselfishes f:Wrasses f:Gobies f:Blennies')
  );
  R.push(
    row('a', 'g:Chromis', 'g:Amphiprion', 0, 'quiz|t'), // typed: no choices
    row('a', 'g:Chromis', 'g:Amphiprion', 0, 'quiz|t'),
    row('a', 'g:Chromis', '', 0, 'quiz|t'), // "I don't know": no unit given
    row('a', 'f:Wrasses', 'f:Damselfishes', 0, 'quiz'), // before v10: no choices logged
    row('a', 'f:Wrasses', 'f:Gobies', 0, 'quiz', 'p1', 'f:Wrasses f:Gobies') // with its choices: a pair, not here
  );
  // an untrusted player (too few answers)
  R.push(row('z', 'g:Chromis', 'g:Thalassoma', 0, 'quiz|t'));
  const M = noChoiceMixups(R);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(M)), {typed: {'g:Chromis|g:Amphiprion': 2}, old: {'f:Wrasses|f:Damselfishes': 1}});
  // together they are confusionOf's old, which counts both alike
  const all = C.confusionOf(R).old;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(all)), {'g:Chromis|g:Amphiprion': 2, 'f:Wrasses|f:Damselfishes': 1});
  // and the typed mix-ups count in the pooled pairs too, as offered once and mixed up each (core.js confAdd)
  assert.deepStrictEqual(C.confusionOf(R).pair['g:Amphiprion|g:Chromis'], [2, 2]);
});

test('typedText: the typed near-misses as typed and the spelling steps, trusted players only', () => {
  // the readAnswers row with the typed text (15) and the spelling step (16): 1 retyped exactly, 0 not, null none
  const ty = (id, shown, answered, ok, text, sp = null, m = 'quiz|t') => {
    const r = row(id, shown, answered, ok, m);
    r[15] = text;
    r[16] = sp;
    return r;
  };
  const R = [...Array(12)].map(() => row('a', 'Porites', 'Porites', 1, 'quiz', 'p1', 'Porites Favites Montipora Pavona'));
  R.push(
    ty('a', 'Pocillopora', 'Pocillopora', 1, 'Pocillopora'), // exact: no near-miss
    ty('a', 'Pocillopora', 'Pocillopora', 1, 'Pocilopora ', 1), // a typo, retyped exactly
    ty('a', 'Pocillopora', 'Pocillopora', 1, 'pocilopora', 1, 'quiz|t|x'), // the same typo, in the exam
    ty('a', 'Seriatopora', 'Seriatopora', 1, 'Seriatpora', 0), // a typo, not retyped exactly
    ty('a', 'Stylophora', 'Seriatopora', 0, 'Seriatopora'), // another unit's name
    ty('a', 'Stylophora', '', 0, ''), // "I don't know"
    row('a', 'Pavona', 'Porites', 0, 'quiz', 'p1', 'Pavona Porites Favites Montipora'), // not typed
    ty('z', 'Galaxea', 'Goniopora', 0, 'Goniopora') // untrusted
  );
  const T = typedText(R);
  assert.strictEqual(T.n, 6);
  assert.deepStrictEqual(T.step, [3, 2]);
  assert.deepStrictEqual(T.near, [
    ['Pocillopora', 'pocilopora', 'Pocillopora', 1, 2],
    ['Seriatopora', 'seriatpora', 'Seriatopora', 0, 1],
    ['Stylophora', 'seriatopora', 'Seriatopora', null, 1]
  ]);
  assert.deepStrictEqual(typedText(R.slice(0, 12)), {n: 0, step: [0, 0], near: []}, 'nothing typed');
  // A removed account's answers (anonymous flag 2: deleted or archived) never show, its text nor its steps (rule D7).
  const gone = R.map(r => (r[0] === 'a' && C.TYPED_RE.test(r[5]) ? Object.assign([...r], {11: 2}) : r));
  assert.deepStrictEqual(typedText(gone), {n: 0, step: [0, 0], near: []}, 'a removed account');
});
