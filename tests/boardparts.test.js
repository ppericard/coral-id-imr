require('./slot.js').testGuard();
// My progress, where the units of the opt-in sets show (Pierre, 2026-11-18, Q404 A, Q402 A; the bug: a fish player at IMR with
// scientific names off saw ~17 "?" tiles after the 65 families, one tooltipped "A family you have not met yet", for
// scientific genera in play). progress.js boardParts and mystT run in Node on stubs, as tests/mystery.test.js and
// tests/unlockcount.test.js: the families' grid holds the units at the slate's own rank only; every other set has its own
// section, shown once it is on or has a unit met, its units not met (the "?" tiles) only while it is on; a "?" says its own
// rank; one code path for every subject (rule S1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js'),
  C = require('../core.js');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'progress.js'), 'utf8');

// The units: families f1 f2 (the slate), a bonus genus at the slate's rank b1 (the corals' way), scientific genera g1 g2 g3
// (rank 'genus' on a fish), species s1.
const REC = {f1: {}, f2: {}, b1: {}, g1: {rank: 'genus'}, g2: {rank: 'genus'}, g3: {rank: 'genus'}, s1: {rank: 'species'}};
const SETS = [
  {k: 'bon', name: 'Bonus', all: () => ['b1']},
  {k: 'sci', name: 'Scientific names', all: () => ['g1', 'g2', 'g3']},
  {k: 'sp', name: 'Species', all: () => ['s1']}
];

function run(subject = 'fish', ctx0 = {}) {
  const code = block(SRC, '// The tooltip of a masked tile names', '// Header progress pill', {file: 'progress.js'}),
    ctx = {
      SUBJ: C.subjectOf(subject),
      GX: n => REC[n],
      SETS: () => SETS,
      Q: {},
      rankOf: n => (REC[n].rank ? REC[n].rank : ''),
      asked: n => (ctx0.met || []).includes(n),
      introMap: () => ({}),
      setOf: n => SETS.find(S => S.all().includes(n)) || null,
      ...(ctx0.Q ? {Q: ctx0.Q} : {})
    };
  vm.createContext(ctx);
  vm.runInContext(code + '\nthis.T = {boardParts, boardUnits, mystT};', ctx);
  return ctx.T;
}
const names = x => x.sections.map(s => [s.S.k, s.L]);

test('the grid holds the units at the slate rank; the others never, whatever the sets say', () => {
  const T = run('fish', {Q: {sci: true}}),
    x = T.boardParts(['b1', 'g1', 'g2', 's1']);
  assert.deepStrictEqual(x.grid, ['b1'], 'a bonus unit at the slate’s own rank keeps its place after the slate');
  assert.ok(!x.sections.some(s => s.L.includes('b1')), 'and is in no section');
});

test('the scientific tree off: its units show nowhere as not met (Q402 A), its met ones in its section', () => {
  const T = run('fish', {Q: {}}),
    off = T.boardParts(['g1', 'g2', 'g3']);
  assert.deepStrictEqual(off.grid, [], 'no scientific genus in the families grid');
  assert.deepStrictEqual(off.sections, [], 'no section, so no "?" tile: nothing met');
  const met = run('fish', {Q: {}, met: ['g2']}).boardParts([]);
  assert.deepStrictEqual(
    names(met),
    [['sci', ['g2']]],
    'the one met stays shown, in play or not: a level that is off keeps its progress (Q402 A)'
  );
  assert.strictEqual(met.sections[0].on, false);
});

test('the scientific tree on: every unit in play, in its own section, apart from the species', () => {
  const T = run('fish', {Q: {sci: true}}),
    x = T.boardParts(['g1', 'g2', 'g3', 's1']);
  assert.deepStrictEqual(x.grid, []);
  assert.deepStrictEqual(names(x), [['sci', ['g1', 'g2', 'g3']]], 'the species, a set that is not on and with none met: no section');
  assert.strictEqual(x.sections[0].on, true);
  const both = run('fish', {Q: {sci: true}, met: ['s1']}).boardParts(['g1', 's1']);
  assert.deepStrictEqual(
    names(both),
    [
      ['sci', ['g1']],
      ['sp', ['s1']]
    ],
    'two trees, two sections, never mixed'
  );
});

test('every tile the board draws has its level and step: a unit kept in a section while its set is off included (Codex #1092)', () => {
  const T = run('fish', {Q: {}, met: ['g2']}),
    list = ['f1', 'f2'],
    BA = [],
    x = T.boardParts(BA);
  assert.deepStrictEqual(names(x), [['sci', ['g2']]], 'g2 is kept in a section although it is not in play');
  const units = T.boardUnits(list, BA, x.sections);
  for (const n of [...list, ...BA, ...x.sections.flatMap(s => s.L), ...x.grid]) assert.ok(units.includes(n), n + ' gets a level and a step');
  assert.strictEqual([...new Set(units)].length, units.length, 'each unit once');
  const qb = block(SRC, 'function quizBoard() {', '\n}\n', {through: 1, file: 'progress.js'});
  assert.match(qb, /lv = Object\.fromEntries\(shown\.map/, 'the levels are built from every drawn unit');
  assert.match(qb, /st = Object\.fromEntries\(shown\.map/, 'and so are the steps');
  assert.match(qb, /shown = boardUnits\(list, BA, SECT\)/);
});

test('a masked tile names its own unit’s rank, whatever the subject', () => {
  const T = run('fish');
  assert.strictEqual(T.mystT('f1'), 'A family you have not met yet', 'a fish family');
  assert.strictEqual(T.mystT('g1'), 'A genus you have not met yet', 'a scientific genus is not "a family"');
  assert.strictEqual(T.mystT('s1'), 'A species you have not met yet');
  assert.strictEqual(run('coral').mystT('f1'), 'A genus you have not met yet', 'the corals: the subject’s unit word');
  assert.strictEqual(run('seaslug').mystT('f1'), 'A genus you have not met yet', 'the sea slugs: their genera are their units');
});

test('quizBoard: the grid, its sections and the badge read the same slate; no subject named', () => {
  const qb = block(SRC, 'function quizBoard() {', '\n}\n', {through: 1, file: 'progress.js'});
  assert.match(qb, /\{grid: BO, sections: SECT\} = boardParts\(BA\)/, 'the bonus list goes through boardParts');
  assert.doesNotMatch(
    qb,
    /\[\.\.\.list, \.\.\.BA\]\.map\(n => tile|\[\.\.\.list, \.\.\.bonusList\(\)\]\.map\(tile\)/,
    'the photo wall never takes the whole bonus list'
  );
  assert.match(qb, /\[\.\.\.list, \.\.\.BO\]\.map\(n => tile\(n\)\)/, 'the photo wall: the slate, then the bonus at its rank');
  const code = block(SRC, '// The tooltip of a masked tile names', '// Header progress pill', {file: 'progress.js'})
    .split('\n')
    .filter(l => !l.trim().startsWith('//'))
    .join('\n');
  assert.doesNotMatch(code, /\b(coral|fish|seaslug|scientific|species)\b/i, 'the rule names no subject and no set: SETS does');
});
