// Typed fish names, the three plain fixes of the names study (Pierre, 2026-11-09; Q319 for a shared name): on the real
// fish.json, through quiz.js's own typeBind, typeUnit and typeRead on stubs, as the game reads a typed answer.
// - singular and plural are one name ("Grouper" is the Groupers, exactly: no "So close!" step);
// - a name the game knows that is no family's (a species' name, a word of one: core.js fishKnownNames) is said so, never
//   read as a slip of another family (anglerfish was the Angelfishes);
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
const NAMES = C.fishTypeNames(X.gen, FISH.typeDrop, C.fishKnownNames(F));
const rankOf = g => (X.gen[g] || {}).rank || '';
const first = x => String(x || '').split(/\s+/)[0];
const OTHER = {
  sci: [...F.genera.map(g => g.name), ...F.species.flatMap(x => [first(x.name), first(x.now)])].filter(Boolean),
  common: [...F.genera.flatMap(g => [g.common, g.imr]), ...F.species.flatMap(x => [x.common, ...(x.cn || []).flat()])].filter(Boolean)
};

function page() {
  const ctx = {
    SUBJ: FISH,
    DATA: {},
    UNITS: {fish: {names: () => NAMES, norm: C.typeNormAll, typeOther: rk => (rk === 'genus' ? OTHER : null)}},
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
      '\nthis.M = {typeBind, typeUnit, typeRead, typeMatch};',
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
function family(text, t) {
  const M = page(),
    f = form();
  let got = null;
  M.typeBind(f.form, (m, x, s, rj) => (got = {m, rj, c: M.typeUnit(m, t)}), FISH, '', 'family', {t});
  const msg = f.type(text);
  return {got, msg, retry: f.cls.has('retry'), read: got ? M.typeRead(got.m, text, null, t) : ''};
}

test('a singular is the family itself: answered at once, right, no spelling step', () => {
  for (const [text, t] of [
    ['seahorse', 'f:Seahorses'],
    ['moray', 'f:Morays'],
    ['grouper', 'f:Groupers'],
    ['goby', 'f:Gobies'],
    ['pipefish', 'f:Pipefishes']
  ]) {
    const r = family(text, t);
    assert.deepStrictEqual([text, r.got && r.got.c, r.retry, r.read], [text, t, false, '']);
  }
});

// Codex review #834: a scientific name is never read in an English number: its slip keeps the spelling step.
test('a scientific name has no plural or singular: "Zebrasomas", "Amphiprions", "Halichoere" are slips', () => {
  const m = (t, rk) =>
    C.typeMatchIn(
      NAMES.filter(o => rankOf(o.g) === rk),
      t,
      C.typeNormAll
    );
  for (const [t, g, rk] of [
    ['Zebrasomas', 'g:Zebrasoma', 'genus'],
    ['Amphiprions', 'g:Amphiprion', 'genus'],
    ['Halichoere', 'g:Halichoeres', 'genus'],
    ['Amphiprions', 'f:Damselfishes', ''],
    ['Pomacentridaes', 'f:Damselfishes', '']
  ])
    assert.deepStrictEqual([t, m(t, rk).g, C.typeVerdict(m(t, rk), g)], [t, g, 'close']);
  assert.strictEqual(C.typeVerdict(m('Grouper', ''), 'f:Groupers'), 'exact'); // a common name keeps both numbers
});

test('a species name or a word of one: said so, never read as another family', () => {
  for (const text of ['anglerfish', 'tuskfish', 'firefish', 'goldie']) {
    const r = family(text, 'f:Frogfishes');
    assert.strictEqual(r.got, null, text); // no answer yet
    assert.strictEqual(r.msg, `“${text}” is a name some fish species go by: this question needs the family.`);
  }
  const r = family('Peacock razorfish', 'f:Wrasses');
  assert.strictEqual(r.got, null);
  assert.strictEqual(r.msg, "“Peacock razorfish” is a species' name: this question needs its family.");
  // dart stays the Dartfishes' own short form
  assert.strictEqual(family('dart', 'f:Jacks').got.c, 'f:Dartfishes');
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
  ['razorfish', 'toby', 'anglerfish', 'Peacock razorfish'].forEach(t => assert.strictEqual(kind(t), 'common', t));
  assert.strictEqual(kind('Holocentridae'), 'family');
  assert.strictEqual(kind('goby'), 'family'); // the Gobies' singular
});
