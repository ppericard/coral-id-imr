// Typed fish names, the names study (Pierre, 2026-11-09: the three plain fixes, Q319, Q320): on the real fish.json,
// through quiz.js's own typeBind, typeUnit, typeRead and typeStep on stubs, as the game reads a typed answer.
// - singular and plural are one name ("Grouper" is the Groupers, exactly: no "So close!" step);
// - a name below the family (a species' listed or scientific name, a genus's, a kind word its species carry: core.js
//   fishNameIndex) is read as that family, what it is said after the answer; a word known to be no family's (one
//   species' only) is said so; never a slip of another family (anglerfish was the Angelfishes);
// - Pierre's exceptions (curation.json fish.names): off, on, often;
// - a name several families share (Holocentridae) is right for each of them, and otherwise a wrong answer that counts
//   against the photo's family only (no unit given, as "I don't know" is scored), never "which one? check the spelling";
// - on a genus question, a species' word (razorfish, toby) gets the common-name nudge, not "check the spelling".
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');
const C = require('../core.js');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const quiz = read('quiz.js');
const F = JSON.parse(read('fish.json'));
const X = C.fishGen(F, {}, {});
const sp = new Map(F.species.map(s => [s.id, s]));
// a genus unit per fish.json genus of circle 1, as tests/typedrej.test.js builds them (app.js fishGenera)
F.genera.forEach(G => {
  const L = (G.species || []).map(id => sp.get(id)).filter(s => s && s.circle === 1);
  if (L.length && X.gen[G.family] && X.gen[G.family].circle === 1) X.gen[G.id] = {id: G.id, name: G.name, rank: 'genus', names: [G.name]};
});
const FISH = C.subjectOf('fish');
const NAMES = C.fishTypeNames(X.gen, FISH.typeDrop, C.fishNameIndex(F));
const rankOf = g => (X.gen[g] || {}).rank || '';
const first = x => String(x || '').split(/\s+/)[0];
const OTHER = {
  sci: [...F.genera.map(g => g.name), ...F.species.flatMap(x => [first(x.name), first(x.now)])].filter(Boolean),
  common: [...F.genera.flatMap(g => [g.common, g.imr]), ...F.species.flatMap(x => [x.common, ...(x.cn || []).flat()])].filter(Boolean)
};

function page(names = NAMES) {
  const ctx = {
    SUBJ: FISH,
    DATA: {},
    UNITS: {fish: {names: () => names, norm: C.typeNormAll, typeOther: rk => (rk === 'genus' ? OTHER : null)}},
    rankOf,
    GX: g => X.gen[g],
    typeMatchIn: C.typeMatchIn,
    typeElse: C.typeElse,
    typeVerdict: C.typeVerdict,
    typeDiff: C.typeDiff,
    uname: n => (X.gen[n] || {}).name || n,
    unameT: n => (X.gen[n] || {}).name || n,
    esc: s => String(s),
    inSubject: (id, fn) => fn(),
    matchMedia: () => ({matches: true})
  };
  vm.createContext(ctx);
  vm.runInContext(
    cut(quiz, 'let TYPEDQ = null,', '// S: the subject the form names and reads', {file: 'quiz.js'}) +
      cut(quiz, 'function typeBind(', '\n}\n', {file: 'quiz.js', through: 1}) +
      cut(quiz, '// The unit a typed reading m gives', '// The spelling step', {file: 'quiz.js'}) +
      cut(quiz, 'const typeStep = ', '\n};\n', {file: 'quiz.js', through: 1}) +
      '\nthis.M = {typeBind, typeUnit, typeRead, typeMatch, typeStep};',
    ctx
  );
  return ctx.M;
}
function form() {
  const el = {
    inp: {value: '', disabled: false, focus() {}, select() {}, blur() {}},
    msg: {textContent: '', innerHTML: ''},
    idk: {textContent: "I don't know", onclick: null},
    cls: new Set()
  };
  el.form = {
    querySelector: s => (s === 'input' ? el.inp : s === '.tymsg' ? el.msg : s === '[data-idk]' ? el.idk : null),
    querySelectorAll: () => [],
    classList: {add: c => el.cls.add(c), remove: c => el.cls.delete(c), contains: c => el.cls.has(c)},
    onsubmit: null
  };
  el.type = t => ((el.inp.value = t), el.form.onsubmit({preventDefault() {}}), el.msg.textContent);
  return el;
}
// A family question on t: what typing text gives (the unit answered, the message shown, the texts refused).
function family(text, t, names) {
  const M = page(names),
    f = form();
  let got = null;
  M.typeBind(f.form, (m, x, s, rj) => (got = {m, rj, c: M.typeUnit(m, t)}), FISH, '', 'family', {t});
  const msg = f.type(text);
  return {
    got,
    msg,
    retry: f.cls.has('retry'),
    read: got ? M.typeRead(got.m, text, null, t) : '',
    step: got ? M.typeStep(got.m, text, null, t) : null
  };
}

test('a singular is the family itself: answered at once, right, no spelling step', () => {
  for (const [text, t] of [
    ['seahorse', 'f:Seahorses'],
    ['moray', 'f:Morays'],
    ['grouper', 'f:Groupers'],
    ['pipefish', 'f:Pipefishes']
  ]) {
    const r = family(text, t);
    assert.deepStrictEqual([text, r.got && r.got.c, r.retry, r.read], [text, t, false, '']);
  }
});

test('a name below the family: right as its family, said what it is; a word of one species only: said so', () => {
  for (const [text, t, read] of [
    ['anglerfish', 'f:Frogfishes', '“anglerfish” is a name of some Frogfishes.'],
    ['firefish', 'f:Lionfishes', '“firefish” is a name of some Lionfishes.'],
    ['toby', 'f:Puffers', '“toby” is a name of some Puffers.'],
    ['spinefoot', 'f:Rabbitfishes', '“spinefoot” is a name of some Rabbitfishes.'],
    ['Peacock razorfish', 'f:Wrasses', '“Peacock razorfish” is one of the Wrasses.'],
    ['Iniistius pavo', 'f:Wrasses', '“Iniistius pavo” is one of the Wrasses.'],
    ['Iniistius', 'f:Wrasses', '“Iniistius” is a genus of the Wrasses.']
  ]) {
    const r = family(text, t);
    assert.deepStrictEqual([text, r.got && r.got.c, r.read, r.msg], [text, t, read, '']);
  }
  // on another family: that family, a wrong answer as any other name of it (rule L2), said what it is
  const w = family('Peacock razorfish', 'f:Pipefishes');
  assert.strictEqual(w.got.c, 'f:Wrasses');
  assert.strictEqual(w.read, '“Peacock razorfish” is one of the Wrasses.');
  for (const text of ['tuskfish', 'goldie']) {
    const r = family(text, 'f:Wrasses');
    assert.strictEqual(r.got, null, text); // no answer yet
    assert.strictEqual(r.msg, `“${text}” is a name some fish species go by: this question needs the family.`);
  }
  // dart stays the Dartfishes' own short form (a jack's "Smallspotted dart" is one species' name)
  assert.strictEqual(family('dart', 'f:Jacks').got.c, 'f:Dartfishes');
});

test('razorfish: right on the Shrimpfishes and on the Wrasses, explained; on a pipefish wrong, no unit given (Q319)', () => {
  const s = family('razorfish', 'f:Shrimpfishes');
  assert.strictEqual(s.got.c, 'f:Shrimpfishes');
  assert.strictEqual(s.read, '“razorfish” is a name of the Shrimpfishes. It is also used for some Wrasses.');
  const w = family('Razorfish', 'f:Wrasses');
  assert.strictEqual(w.got.c, 'f:Wrasses');
  assert.strictEqual(w.read, '“Razorfish” is a name of some Wrasses. It is also used for the Shrimpfishes.');
  const p = family('razorfish', 'f:Pipefishes');
  assert.strictEqual(p.got.c, '');
  assert.strictEqual(p.read, '“razorfish” names the Shrimpfishes and some Wrasses.');
  // goby: the Gobies' own name, and some dartfishes'
  assert.strictEqual(family('goby', 'f:Gobies').read, '“goby” is also used for some Dartfishes.');
  assert.strictEqual(family('goby', 'f:Dartfishes').read, '“goby” is a name of some Dartfishes. It is also used for the Gobies.');
  assert.strictEqual(family('bream', 'f:Emperors').got.c, 'f:Emperors');
});

test("Pierre's exceptions (curation.json fish.names): off, on, often", () => {
  const N = C.fishTypeNames(
    X.gen,
    FISH.typeDrop,
    C.fishNameIndex(F, {
      razorfish: {'f:Wrasses': 'off', 'f:Shrimpfishes': 'often'},
      Tuskfish: {'f:Wrasses': 'on'},
      'sea pig': {'f:Wrasses': 'on'}
    })
  );
  const r = family('razorfish', 'f:Shrimpfishes', N);
  assert.strictEqual(r.got.c, 'f:Shrimpfishes');
  assert.strictEqual(JSON.stringify(r.step), JSON.stringify({oft: ['Shrimpfishes', 'razorfish']})); // "✓ Yes, it's Shrimpfishes (often called razorfish)"
  assert.strictEqual(family('razorfish', 'f:Wrasses', N).got.c, 'f:Shrimpfishes'); // no longer the Wrasses'
  assert.strictEqual(family('tuskfish', 'f:Wrasses', N).got.c, 'f:Wrasses'); // a known word given to a family
  assert.strictEqual(family('sea pig', 'f:Wrasses', N).got.c, 'f:Wrasses'); // a name added
  assert.strictEqual(family('sea pig', 'f:Wrasses', N).read, '“sea pig” is a name of the Wrasses.');
});

test('a name several families share: right for each, explained; on another family, wrong with no unit given (Q319)', () => {
  const r = family('Holocentridae', 'f:Soldierfishes');
  assert.strictEqual(r.got.c, 'f:Soldierfishes');
  assert.strictEqual(r.read, '“Holocentridae” is also used for the Squirrelfishes.');
  const s = family('Syngnathidae', 'f:Seahorses');
  assert.strictEqual(s.got.c, 'f:Seahorses');
  assert.strictEqual(s.read, '“Syngnathidae” is also used for the Pipefishes.');
  const w = family('Serranidae', 'f:Wrasses');
  assert.strictEqual(w.got.c, ''); // no unit: counts against the Wrasses only, no mix-up (quiz.js answer)
  assert.ok(w.got.m.shared);
  assert.strictEqual(w.read, '“Serranidae” names the Groupers, the Soapfishes and the Anthias.');
  assert.strictEqual(w.msg, ''); // an answer, not a "which one?"
});

test('"which one? check the spelling" only for a slip between two names', () => {
  const r = family('pilefishes', 'f:Pipefishes');
  assert.strictEqual(r.got, null);
  assert.match(r.msg, /^Close to .* which one\? Check the spelling\.$/);
});

test('a genus question: a species word or name gets the common-name nudge, never "check the spelling"', () => {
  const kind = t =>
    C.typeElse(
      t,
      NAMES.filter(o => rankOf(o.g) !== 'genus'),
      {...OTHER, rank: g => rankOf(g) || FISH.rank, own: g => (X.gen[g] || {}).imrName},
      C.typeNormAll
    );
  ['razorfish', 'toby', 'anglerfish', 'Peacock razorfish', 'tuskfish', 'hogfish'].forEach(t => assert.strictEqual(kind(t), 'common', t));
  assert.strictEqual(kind('Holocentridae'), 'family');
  assert.strictEqual(kind('goby'), 'family'); // the Gobies' singular (and some dartfishes')
  assert.strictEqual(kind('Iniistius pavo'), ''); // a scientific name: the spelling message as before
});
