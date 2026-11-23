require('./slot.js').testGuard();
// Home, My progress and the custom quiz read what differs between subjects from the subject's UNITS entry, never from the
// shape of its data or from the corals' data.json (docs/reviews/2026-11-19-admin-one-engine.md §5 step 11, Dup-16 and Dup-17,
// rule S1): `named` (the units have names of their own: the tree subjects', from TREE_UNITS) is what Home's band and words
// follow, `group(k)` (a unit group of the subject's teaching by its number: the corals' IMR lecture groups) is what the
// Groups view of My progress and the custom quiz's first view read.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  {SUBJECTS} = require('../core.js'),
  APP = src('app.js'),
  HOME = src('home.js'),
  code = s =>
    s
      .split('\n')
      .filter(l => !/^\s*\/\//.test(l))
      .join('\n');

// The UNITS entry of each subject, by the order SUBJECTS lists them (the corals first), as the text of its object.
const UNITS = block(APP, '\nconst UNITS = {', '\n};\n', {file: 'app.js'}),
  entries = UNITS.split(/\n {2}(?=[a-z]+: \{\n)/).slice(1),
  entry = id => entries.find(e => e.startsWith(id + ': {')) || assert.fail(`no UNITS entry for ${id}`);

test('named is declared once, in the members the tree subjects start from, and no entry of the corals says it', () => {
  const tree = block(APP, 'const TREE_UNITS = {', '\n};\n', {file: 'app.js'});
  assert.match(tree, /\n {2}named: true,/);
  assert.strictEqual((APP.match(/\bnamed: true\b/g) || []).length, 1, 'one declaration');
  SUBJECTS.forEach(S => {
    const e = entry(S.id);
    assert.strictEqual(/\.\.\.TREE_UNITS,/.test(e), !S.flat, `${S.id}: a tree subject starts from TREE_UNITS, a flat one does not`);
    assert.doesNotMatch(e, /\bnamed:/, `${S.id}: not declared one by one`);
  });
  // the comment above UNITS says what it means
  assert.match(
    block(APP, "// What each subject's units are, UNITS[id]", '\n\n', {file: 'app.js'}),
    /\n\/\/ {3}named {7}true where the units have names/
  );
});

test("group(k) is the corals' IMR groups, declared by every subject whose My progress has a Groups view", () => {
  const withGroups = SUBJECTS.filter(S => (S.progress || []).includes('groups'));
  assert.ok(withGroups.length >= 1 && withGroups.every(S => S.flat), "the Groups view is the corals'");
  withGroups.forEach(S => assert.match(entry(S.id), /\n {4}group: k => DATA\.imrg\.find\(x => x\.n === k\),/, S.id));
  SUBJECTS.filter(S => !(S.progress || []).includes('groups')).forEach(S => assert.doesNotMatch(entry(S.id), /\n {4}group:/, S.id));
  assert.match(
    block(APP, "// What each subject's units are, UNITS[id]", '\n\n', {file: 'app.js'}),
    /\n\/\/ {3}group\(k\) {4}a unit group of the subject/
  );
});

test("Home asks the subject's UNITS entry, not the shape of its data; its band and words follow `named`", () => {
  const home = code(HOME);
  assert.doesNotMatch(home, /GX\(slateGenera\(\)\[0\]\)/, "no test of the first unit's data");
  assert.match(home, /named = !!DATA && !!UNITS\[SUBJ\.id\]\.named,/);
  assert.doesNotMatch(home, /\bfish\b[^'"\n]*[?&]/, 'the old flag is gone');
  // every place that told the fish from the corals follows `named`: the band, the art, the door, the lede and the three lines
  assert.strictEqual((home.match(/\bnamed \?/g) || []).length, 4, 'W.need, W.before, W.learn, W.practice');
  assert.match(home, /const tiles = named\n/);
  assert.match(home, /: named\n {8}\? `\n {8}<section class="hdoor identify">/, 'the Identify door');
  assert.match(home, /fp = key && named &&/);
  // the corals' band reads its genus through the one door GX, as the others do
  assert.match(home, /const ph = \(n, v\) => \{\n {4}const g = GX\(n\);/);
});

test('My progress and the custom quiz read the group through UNITS, not data.json', () => {
  for (const f of ['progress.js', 'quiz.js']) assert.doesNotMatch(code(src(f)), /\bDATA\.imrg\b/, f);
  assert.match(code(src('progress.js')), /const gr = UNITS\[SUBJ\.id\]\.group\(k\),/);
  assert.match(code(src('quiz.js')), /const gr = UNITS\[SUBJ\.id\]\.group\(k\),/);
});
