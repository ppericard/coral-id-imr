// Similar names after a mix-up (the name study's question b, docs/reviews/2026-11-05-name-confusion-study.md 5.1 and 6;
// Pierre, 2026-11-14, Q124: the study's recommendations): quiz.js namesAlike (same first letter, or a bigram Dice of 0.4
// or more, the study's own measure), namesDiff (the letters that differ in bold: between the two names' common beginning
// and common ending, letters only, escaped) and namesLine (the feedback's line, each name set as uname sets it), run
// from quiz.js and app.js themselves.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const quiz = read('quiz.js'),
  app = read('app.js');
// Two coral genera (no name: the key is the name) and two fish entries, one a family (upright), one a genus (italics).
const GEN = {
  Pocillopora: {},
  Stylophora: {},
  Favites: {},
  'f:Butterflyfishes': {name: 'Butterflyfishes'},
  'f:Angelfishes': {name: 'Angelfishes'},
  'g:Chromis': {name: 'Chromis', rank: 'genus'},
  'g:Chrysiptera': {name: 'Chrysiptera', rank: 'genus'}
};
const ctx = {GX: n => GEN[n]};
vm.createContext(ctx);
vm.runInContext(
  cut(app, 'const esc = ', '\n', {file: 'app.js'}) +
    cut(app, 'const unameT = ', '\n', {file: 'app.js'}) +
    cut(app, 'const unameIn = ', '\n};\n', {file: 'app.js', through: 1}) +
    cut(app, 'const uname = ', '\n', {file: 'app.js'}) +
    cut(quiz, 'const nameBigrams = ', '// The unit a typed reading m gives', {file: 'quiz.js'}) +
    '\nthis.M = {esc, uname, nameDice, namesAlike, namesDiff, namesLine};',
  ctx
);
const {uname, nameDice, namesAlike, namesDiff, namesLine} = ctx.M;
const dice = (a, b) => {
  const {shared, total} = nameDice(a.toLowerCase(), b.toLowerCase());
  return (2 * shared) / total;
};

test("the bigram Dice is the study's (namestudy/prep.py: lower case, '#' at each end, bigrams with repeats)", () => {
  // Values computed with the study's own Python on the same pairs.
  for (const [a, b, d] of [
    ['Leptoria', 'Leptoseris', 0.6],
    ['Pectinia', 'Pavona', 0.25],
    ['Porites', 'Favites', 0.5],
    ['Fungia', 'Danafungia', 2 / 3],
    ['Acropora', 'Pocillopora', 0.47619047619047616],
    ['Acropora', 'Stylophora', 0.4],
    ['Pachyseris', 'Gardineroseris', 0.38461538461538464],
    ['Merulina', 'Millepora', 0.21052631578947367]
  ])
    assert.ok(Math.abs(dice(a, b) - d) < 1e-12, `${a} / ${b}: ${dice(a, b)}, the study's ${d}`);
  // Repeated bigrams count as often as they occur in both (a multiset).
  assert.deepStrictEqual({...nameDice('aaa', 'aa')}, {shared: 3, total: 7});
});

test('alike: the same first letter, or a Dice of 0.4 or more; never the same name', () => {
  assert.strictEqual(namesAlike('Pectinia', 'Pavona'), true, 'the first letter (Dice 0.25)');
  assert.strictEqual(namesAlike('Merulina', 'Millepora'), true, 'the first letter (Dice 0.21)');
  assert.strictEqual(namesAlike('Porites', 'Favites'), true, 'Dice 0.5');
  assert.strictEqual(namesAlike('Acropora', 'Stylophora'), true, 'Dice exactly 0.4: the threshold is in');
  assert.strictEqual(namesAlike('Pachyseris', 'Gardineroseris'), false, 'Dice 0.385, just under');
  assert.strictEqual(namesAlike('Stylophora', 'Goniopora'), false, 'Dice 0.381');
  assert.strictEqual(namesAlike('Favites', 'Pocillopora'), false);
  assert.strictEqual(namesAlike('Butterflyfishes', 'Angelfishes'), true, 'Dice 0.43: the shared "fishes"');
  assert.strictEqual(namesAlike('Acropora', 'Acropora'), false, 'identical');
  assert.strictEqual(namesAlike('acropora', 'Acropora'), false, 'identical but for a capital');
  assert.strictEqual(namesAlike('', 'Acropora'), false);
});

test('identical names: nothing in bold', () => {
  assert.deepStrictEqual([...namesDiff('Acropora', 'Acropora')], ['Acropora', 'Acropora']);
  assert.deepStrictEqual([...namesDiff('Coral Breams', 'coral breams')], ['Coral Breams', 'coral breams']);
});

test('one letter changed: that letter in bold in each name', () => {
  assert.deepStrictEqual([...namesDiff('Pavona', 'Pavana')], ['Pav<b>o</b>na', 'Pav<b>a</b>na']);
  assert.deepStrictEqual([...namesDiff('Favia', 'Davia')], ['<b>F</b>avia', '<b>D</b>avia'], 'the first letter');
  assert.deepStrictEqual([...namesDiff('Astrea', 'Astrel')], ['Astre<b>a</b>', 'Astre<b>l</b>'], 'the last letter');
});

test('insertions: the letters added in bold, nothing in the shorter name', () => {
  assert.deepStrictEqual([...namesDiff('Astrea', 'Astraea')], ['Astrea', 'Astr<b>a</b>ea']);
  // The common beginning and ending never overlap: a name inside the other (capitals aside) has nothing in bold.
  assert.deepStrictEqual([...namesDiff('Fungia', 'Danafungia')], ['Fungia', '<b>Dana</b>fungia']);
  assert.deepStrictEqual([...namesDiff('Acropora', 'Anacropora')], ['Acropora', 'A<b>na</b>cropora']);
  assert.deepStrictEqual([...namesDiff('Astreopora', 'Astrea')], ['Astre<b>opor</b>a', 'Astrea']);
});

test("different lengths: the part between the common beginning and ending, as the study's Lepto<b>ria</b> / Lepto<b>seris</b>", () => {
  assert.deepStrictEqual([...namesDiff('Leptoria', 'Leptoseris')], ['Lepto<b>ria</b>', 'Lepto<b>seris</b>']);
  assert.deepStrictEqual([...namesDiff('Pectinia', 'Pavona')], ['P<b>ectini</b>a', 'P<b>avon</b>a']);
  assert.deepStrictEqual([...namesDiff('Porites', 'Favites')], ['<b>Por</b>ites', '<b>Fav</b>ites']);
  assert.deepStrictEqual([...namesDiff('Butterflyfishes', 'Angelfishes')], ['<b>Butterfly</b>fishes', '<b>Angel</b>fishes']);
  assert.deepStrictEqual([...namesDiff('Merulina', 'Millepora')], ['M<b>erulin</b>a', 'M<b>illepor</b>a']);
});

test('genus against species, and names of several words: letters only in bold, never a space or a sign', () => {
  assert.deepStrictEqual([...namesDiff('Chromis', 'Chromis viridis')], ['Chromis', 'Chromis <b>viridis</b>']);
  assert.deepStrictEqual(
    [...namesDiff('Chromis xanthura', 'Chromis xanthochira')],
    ['Chromis xanth<b>u</b>ra', 'Chromis xanth<b>ochi</b>ra']
  );
  assert.deepStrictEqual([...namesDiff('Pomacentrus', 'Pomacentrus amboinensis')], ['Pomacentrus', 'Pomacentrus <b>amboinensis</b>']);
  assert.deepStrictEqual([...namesDiff('Chromis', 'Chrysiptera')], ['Chr<b>omis</b>', 'Chr<b>ysiptera</b>']);
  assert.deepStrictEqual([...namesDiff('Coral Breams', 'Cardinalfishes')], ['C<b>oral</b> <b>Bream</b>s', 'C<b>ardinalfishe</b>s']);
  assert.deepStrictEqual(
    [...namesDiff('Eel-tailed catfishes', 'Emperors')],
    ['E<b>el</b>-<b>tailed</b> <b>catfishe</b>s', 'E<b>mperor</b>s']
  );
});

test('HTML in a name is escaped, never markup', () => {
  const [a, b] = namesDiff('A<b>c', 'A&bc');
  assert.strictEqual(a, 'A&lt;<b>b</b>&gt;c');
  assert.strictEqual(b, 'A&amp;<b>b</b>c');
  const [x, y] = namesDiff(`O'Hara "x"`, `O'Hare "x"`);
  assert.strictEqual(x, 'O&#39;Har<b>a</b> &quot;x&quot;');
  assert.strictEqual(y, 'O&#39;Har<b>e</b> &quot;x&quot;');
  assert.ok(!/<(?!\/?b>)/.test(a + b + x + y), 'no tag but <b>');
});

test('the feedback line: the photo first, then the answer, each set as uname sets it; nothing for names not alike', () => {
  assert.strictEqual(
    namesLine('Pocillopora', 'Stylophora'),
    '<p class="vs ndiff">Similar names: <i><b>Pocillop</b>ora</i> / <i><b>Styloph</b>ora</i></p>'
  );
  assert.strictEqual(
    namesLine('f:Butterflyfishes', 'f:Angelfishes'),
    '<p class="vs ndiff">Similar names: <b>Butterfly</b>fishes / <b>Angel</b>fishes</p>',
    'a fish entry upright'
  );
  assert.strictEqual(
    namesLine('g:Chromis', 'g:Chrysiptera'),
    '<p class="vs ndiff">Similar names: <i>Chr<b>omis</b></i> / <i>Chr<b>ysiptera</b></i></p>',
    'a fish genus in italics'
  );
  assert.strictEqual(namesLine('Favites', 'Pocillopora'), '');
  assert.strictEqual(namesLine('Pocillopora', 'Pocillopora'), '');
  // uname unchanged by the helper it now shares.
  assert.strictEqual(uname('Favites'), '<i>Favites</i>');
  assert.strictEqual(uname('f:Angelfishes'), 'Angelfishes');
  assert.strictEqual(uname('g:Chromis'), '<i>Chromis</i>');
});
