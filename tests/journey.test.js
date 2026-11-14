'use strict';
// Journey (admin-journey.js): the Cards list in time order (Pierre, 2026-11-05: rows of Nov 4 came before rows of Nov 2),
// the untimed ones after; the start rows say "inferred" once and "Answered again" for the same answer given again; and
// the word beside a unit outside the slate (Pierre, 2026-11-08: the fish genera were labelled "bonus", a coral word,
// although they are the scientific-names step of the game). The blocks are cut with tests/block.js, which fails by name
// when a marker moves.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  block = require('./block.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'admin-journey.js'), 'utf8'),
  cut = (from, to, o = {}) => block(src, from, to, {file: 'admin-journey.js', ...o});
const jOrder = new Function(cut('// jorder: begin', '// jorder: end') + '\nreturn jOrder;')();
const jOffSlate = new Function(cut('// joffslate: begin', '// joffslate: end') + '\nreturn jOffSlate;')();

test('jOrder: timed rows oldest first, untimed rows after in their own order', () => {
  const out = jOrder([
    [400, 'start-nov4'],
    [null, 'one-at-a-time'],
    [100, 'first-nov2'],
    [300, 'fallback'],
    [null, 'not-used'],
    [200, 'declined-nov2']
  ]);
  assert.strictEqual(out, 'first-nov2declined-nov2fallbackstart-nov4one-at-a-timenot-used');
});

test('start rows: inferred said once; the same answer again reads "Answered again"', () => {
  const body = cut('const jStart', '\n};\n');
  assert.ok(/'Answered again'/.test(body), 'the same answer given again');
  assert.ok(!/<b>inferred<\/b>[^`]*`\} · \$\{JSTART\[via\]/.test(body), 'inferred is not followed by JSTART.inferred');
});

test('a fish genus beside a slate of families reads "genus"', () => {
  assert.strictEqual(jOffSlate('g:Abudefduf', new Set(['f:Damselfishes', 'f:Wrasses'])), 'genus');
});
test('a coral bonus genus beside a slate of genera stays "bonus"', () => {
  assert.strictEqual(jOffSlate('Physogyra', new Set(['Acropora', 'Porites'])), 'bonus');
});
test('a family outside the slate of families (another circle) stays "bonus"', () => {
  assert.strictEqual(jOffSlate('f:Batfishes', new Set(['f:Damselfishes'])), 'bonus');
});

// Journey details for every subject (fish admin at parity, after #876): the steps of a player's path (jSteps) and the
// Games card by format (jGames), on the real SUBJECTS and made-up rows [id, time, shown, answered, right, mode, photos,
// expected, ability, new photos, choices].
const C = require('../core.js'),
  CORAL = C.SUBJECTS.find(S => !S.sheets),
  FISH = C.SUBJECTS.find(S => S.sheets);
const {jSteps, jStepWords} = new Function(cut('// jsteps: begin', '// jsteps: end') + '\nreturn {jSteps, jStepWords};')();
const {logConds} = new Function(
  'fmtOf',
  'trustOf',
  'CONF',
  block(fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8'), '// answerlog: begin', '// answerlog: end', {file: 'admin.js'}) +
    '\nreturn {logConds};'
)(C.fmtOf, C.trustOf, C.CONF);
const jGames = new Function(cut('// jgames: begin', '// jgames: end') + '\nreturn jGames;')();
let tt = 0;
const jr = (shown, ok = 1, mode = 'quiz', choices = 'a b c d') => ['p1', ++tt, shown, ok ? shown : 'x', ok, mode, 'p', 0.6, 0, 0, choices];

test('jSteps: the first genus question and the first family of each later circle, once each, in answer order', () => {
  const rec = {'f:A': {circle: 1}, 'f:B': {circle: 2}, 'f:C': {circle: 3}, 'f:D': {circle: 2}},
    R = [jr('f:A'), jr('f:B'), jr('f:A'), jr('g:Chromis'), jr('f:D'), jr('f:C'), jr('g:Naso')],
    S = jSteps(R, n => rec[n] || null, FISH);
  assert.deepStrictEqual(
    S.map(([i, k, w, g]) => [i, k, w, g]),
    [
      [1, 'circle', 2, 'f:B'],
      [3, 'rank', 'genus', 'g:Chromis'],
      [5, 'circle', 3, 'f:C']
    ]
  );
  assert.strictEqual(S[0][4], R[1][1], 'the step keeps its answer time');
  assert.deepStrictEqual(S.map(jStepWords), [
    ['Circle 2', 'Circle 2'],
    ['Genus questions', 'Genus'],
    ['Circle 3', 'Circle 3']
  ]);
});
test("jSteps: the subject's own rank and the first circle are no step; the corals have none", () => {
  assert.deepStrictEqual(
    jSteps([jr('f:A'), jr('f:E')], () => ({circle: 1}), FISH),
    []
  );
  assert.deepStrictEqual(
    jSteps([jr('Acropora'), jr('Porites')], () => ({look: []}), CORAL),
    []
  );
  assert.strictEqual(jSteps([jr('g:Chromis')], () => null, FISH).length, 1, 'a unit with no record still counts its rank');
});

test('jGames: the fish formats, the questions on each rank, no Custom quiz or Duel tab row', () => {
  const R = [
      jr('f:A'),
      jr('f:A', 0),
      jr('f:B', 1, 'quiz', 'f:B f:A'), // Again: A or B?
      jr('g:Chromis', 1, 'quiz|t', ''),
      jr('g:Chromis', 0, 'quiz|d|k2'),
      jr('f:A', 1, 'quiz|x')
    ],
    G = jGames(R, FISH, logConds(R, FISH));
  assert.deepStrictEqual(G, [
    ['Quiz', 2, 1],
    ['Again: A or B? (after a mix-up)', 1, 1],
    ['Look-alike duel in the quiz', 1, 0],
    ['Typed (recall)', 1, 1],
    ['Mastery exam', 1, 1],
    ['Family questions', 4, 3],
    ['Genus questions', 2, 1]
  ]);
});
test('jGames: the corals keep their rows, the Duel tab shown at 0, no rank rows', () => {
  const R = [jr('Acropora'), jr('Porites', 0), jr('Porites', 1, 'quiz|s'), jr('Acropora', 1, 'quiz|t', '')],
    G = jGames(R, CORAL, logConds(R, CORAL));
  assert.deepStrictEqual(G, [
    ['Quiz', 3, 2],
    ['Typed (recall)', 1, 1],
    ['Custom quiz (genera picked)', 1, 1],
    ['Look-alike duels (tab)', 0, 0]
  ]);
});
