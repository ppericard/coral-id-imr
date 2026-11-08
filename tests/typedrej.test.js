// Typed answers (Pierre, 2026-11-08, Q237): every text the form refuses before the answer is logged with it ("c'est
// essentiel. Et c'est vrai pour tout le jeu, partout": quiz.js typeBind rj, answer rj, Code.gs v100 Rejected tries), and
// on a genus question a common name or a family name is told so, with a nudge that gives nothing away (core.js
// typeElse, quiz.js typeKind, typeKindMsg): never a scientific name, the same whatever the photo's genus.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');
const C = require('../core.js');
const {loadCodeGs} = require('./gas.js');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const quiz = read('quiz.js');
const F = JSON.parse(read('fish.json'));
const TOK = 'ghp_write000000000000000000';

// The fish names as the game reads them: the families (core.js fishGen) and a genus unit per fish.json genus whose
// species are in circle 1 (as app.js fishGenera: its PDF name and its species' accepted genera, never a common name).
const X = C.fishGen(F, {}, {});
const sp = new Map(F.species.map(s => [s.id, s]));
F.genera.forEach(G => {
  const L = (G.species || []).map(id => sp.get(id)).filter(s => s && s.circle === 1);
  if (L.length && X.gen[G.family] && X.gen[G.family].circle === 1)
    X.gen[G.id] = {
      id: G.id,
      name: G.name,
      rank: 'genus',
      names: [G.name, ...new Set(L.map(s => (s.now || '').split(/\s+/)[0]).filter(x => x && x !== G.name))]
    };
});
const FISH = C.subjectOf('fish');
const NAMES = C.fishTypeNames(X.gen, FISH.typeDrop);
const rankOf = g => (X.gen[g] || {}).rank || '';
const first = x => String(x || '').split(/\s+/)[0];
// The fish UNITS' lists (app.js typeOther) on fish.json.
const OTHER = {
  sci: [...F.genera.map(g => g.name), ...F.species.flatMap(x => [first(x.name), first(x.now)])].filter(Boolean),
  common: [...F.genera.flatMap(g => [g.common, g.imr]), ...F.species.map(x => x.common)].filter(Boolean)
};
const SCI = [...new Set(OTHER.sci)];
const kindOf = text =>
  C.typeElse(
    text,
    NAMES.filter(o => rankOf(o.g) !== 'genus'),
    {...OTHER, rank: g => rankOf(g) || FISH.rank, own: g => (X.gen[g] || {}).imrName},
    C.typeNormAll
  );
// quiz.js's nudge, its typeKind and typeBind on stubs: a fake form, the fish subject, a genus question.
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
function page(subj = 'fish') {
  const S = C.subjectOf(subj);
  const ctx = {
    SUBJ: S,
    DATA: {},
    UNITS: {
      fish: {names: () => NAMES, norm: C.typeNormAll, typeOther: rk => (rk === 'genus' ? OTHER : null)},
      coral: {names: () => [], norm: C.typeNorm}
    },
    rankOf,
    GX: g => X.gen[g],
    typeMatchIn: C.typeMatchIn,
    typeElse: C.typeElse,
    typeVerdict: C.typeVerdict,
    unameT: n => (X.gen[n] || {}).name || n,
    esc: s => String(s),
    inSubject: (id, fn) => fn(),
    matchMedia: () => ({matches: true})
  };
  vm.createContext(ctx);
  vm.runInContext(
    cut(quiz, 'let TYPEDQ = null,', '// S: the subject the form names and reads', {file: 'quiz.js'}) +
      cut(quiz, 'function typeBind(', '\n}\n', {file: 'quiz.js', through: 1}) +
      '\nthis.M = {typeKind, typeKindMsg, typeBind, TYPEDQ_RJ};',
    ctx
  );
  return ctx.M;
}

test('typeElse: a family name, a common name, or nothing (the spelling message as before)', () => {
  assert.strictEqual(kindOf('Damselfishes'), 'family');
  assert.strictEqual(kindOf('damselfish'), 'family');
  assert.strictEqual(kindOf('Pomacentridae'), 'family', "a family's scientific name is its own");
  assert.strictEqual(kindOf('Moorish idol'), 'family');
  assert.strictEqual(kindOf('Anemonefish'), 'common', 'an IMR tag');
  assert.strictEqual(kindOf('Anemonefishes'), 'common', "a genus's common name");
  assert.strictEqual(kindOf('Clownfish'), 'common', 'a name in common use');
  assert.strictEqual(kindOf('Bannerfish'), 'common');
  assert.strictEqual(kindOf('Ternate chromis'), 'common', "a species' common name");
  assert.strictEqual(kindOf('xyzfish'), '');
  assert.strictEqual(kindOf(''), '');
  // A scientific genus name, in the game or not, is never a common name: the spelling message as before.
  for (const g of SCI) assert.strictEqual(kindOf(g), '', g);
  // Every name of every family reads as something (never the spelling message), and as no genus.
  for (const o of NAMES.filter(o => rankOf(o.g) !== 'genus' && !SCI.some(s => C.typeNormAll(s) === o.k))) {
    const t = o.old || X.gen[o.g].name;
    assert.ok(['family', 'common'].includes(kindOf(t)), `${t}: ${kindOf(t)}`);
  }
});

test('the nudge: the kind of name and what the question needs, never a scientific name', () => {
  const M = page();
  assert.strictEqual(
    M.typeKindMsg('Anemonefish', 'common', 'genus'),
    "“Anemonefish” is a common name: this question needs a genus's scientific name."
  );
  assert.strictEqual(
    M.typeKindMsg('Damselfishes', 'family', 'genus'),
    "“Damselfishes” is a family: this question needs a genus's scientific name."
  );
  // Over every name a player could type that gets one: with the player's own text taken out, no scientific genus or
  // family name of the game (nor any of fish.json) in it.
  const words = new Set([...SCI, ...F.families.flatMap(f => f.sci || [])].map(x => x.toLowerCase()));
  const texts = [...new Set([...NAMES.filter(o => rankOf(o.g) !== 'genus').map(o => o.old || X.gen[o.g].name), ...OTHER.common])];
  let n = 0;
  for (const t of texts) {
    const k = M.typeKind(t, 'genus');
    if (!k) continue;
    n++;
    const rest = M.typeKindMsg(t, k, 'genus').replace(`“${t}”`, '');
    const hit = rest
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(w => words.has(w));
    assert.deepStrictEqual(hit, [], `${t}: ${rest}`);
  }
  assert.ok(n > 50, `${n} names checked`);
});

test('typeBind: the same nudge whatever the genus asked; the refused texts handed with the answer, in order', () => {
  const M = page(),
    say = {};
  for (const t of ['g:Amphiprion', 'g:Chromis']) {
    const f = form();
    let got = null;
    M.typeBind(f.form, (m, text, sp, rj) => (got = {m, text, rj}), undefined, 'genus', 'genus', {t});
    say[t] = [f.type('Anemonefish'), f.type('Damselfishes'), f.type('xyzfish')];
    assert.strictEqual(got, null, 'none of them is an answer');
    f.type(X.gen[t].name);
    assert.strictEqual(got.m.g, t);
    assert.deepStrictEqual([...got.rj], ['Anemonefish', 'Damselfishes', 'xyzfish']);
  }
  assert.deepStrictEqual(say['g:Amphiprion'], say['g:Chromis'], 'nothing says which genus the photo is');
  assert.deepStrictEqual(say['g:Amphiprion'], [
    "“Anemonefish” is a common name: this question needs a genus's scientific name.",
    "“Damselfishes” is a family: this question needs a genus's scientific name.",
    '“xyzfish” is not a genus in the game: check the spelling.'
  ]);
  // "I don't know" after refused texts: they go with it; the spelling step's retype is no refused text.
  const f = form();
  let got = null;
  M.typeBind(f.form, (m, text, sp, rj) => (got = {m, rj}), undefined, 'genus', 'genus', {t: 'g:Amphiprion'});
  f.type('qqqqq');
  f.type('Amphiprian');
  f.type('Amphiprion');
  assert.deepStrictEqual([...got.rj], ['qqqqq']);
  const g = form();
  M.typeBind(g.form, (m, text, sp, rj) => (got = {m, rj}), undefined, 'genus', 'genus', {t: 'g:Amphiprion'});
  g.type('zzzzz');
  g.idk.onclick();
  assert.strictEqual(got.m, null);
  assert.deepStrictEqual([...got.rj], ['zzzzz']);
  // At most TYPEDQ_RJ, each cut to 40 characters.
  const h = form();
  M.typeBind(h.form, (m, text, sp, rj) => (got = {m, rj}), undefined, 'genus', 'genus', {t: 'g:Amphiprion'});
  for (let i = 0; i < 15; i++) h.type('nothing at all here ' + 'x'.repeat(40) + i);
  h.idk.onclick();
  assert.strictEqual(got.rj.length, M.TYPEDQ_RJ);
  assert.ok(got.rj.every(x => x.length === 40));
});

test('a family question, and the corals: the spelling message as before (no common-name nudge)', () => {
  const M = page();
  assert.strictEqual(M.typeKind('Amphiprion', ''), '');
  assert.strictEqual(M.typeKind('Anemonefish', ''), '');
  const f = form();
  M.typeBind(f.form, () => {}, undefined, '', 'family', {t: 'f:Damselfishes'});
  assert.strictEqual(f.type('xyzfish'), '“xyzfish” is not a family in the game: check the spelling.');
  const Co = page('coral');
  assert.strictEqual(Co.typeKind('brain coral', ''), '');
});

test('answer logs the refused texts (rj) with a typed answer, nothing when there were none', () => {
  const a = cut(quiz, 'function answer(', '\nfunction ', {file: 'quiz.js'});
  assert.match(a, /\.\.\.\(tq && tq\.rj && tq\.rj\.length \? \{rj: tq\.rj\.slice\(0, TYPEDQ_RJ\)\} : \{\}\),/);
  assert.match(quiz, /\(m, text, sp, rj\) => \{\n\s+Object\.assign\(TYPEDQ \|\| \{\}, \{m, text, sp, rj\}\);/);
});

// The sheet: the same answers with and without refused texts give every reader the same numbers.
const ans = (id, extra = {}) => ({
  id,
  t: `2026-11-01T00:${String(10 + Number(id.slice(1)))}:00Z`,
  g: 'Acropora',
  a: Number(id.slice(1)) % 3 ? 'Acropora' : 'Montipora',
  ok: Number(id.slice(1)) % 3 ? 1 : 0,
  m: 'quiz|t',
  ph: `pic-${Number(id.slice(1)) % 4}`,
  ch: '',
  e: 0.5,
  ty: 'acropora',
  ...extra
});
function sheet(rj) {
  const s = loadCodeGs();
  const L = Array.from({length: 14}, (_, i) => ans('a' + i, rj && i % 2 ? {rj: ['xyzcoral', 'brain coral']} : {}));
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: L});
  return s;
}

test('Code.gs v100: Rejected tries, a JSON list, cleaned and capped; blank when none', () => {
  const s = loadCodeGs(),
    col = n => s.sheets.Answers.rows[0].indexOf(n);
  s.post({
    name: 'Ana',
    pin: '1234',
    data: {},
    summary: {},
    answers: [
      ans('a1', {rj: ['xyzcoral', ' brain\u0007 coral ', '=SUM(A1)', 'y'.repeat(60), 5, '', ...Array(12).fill('more')]}),
      ans('a2'),
      ans('a3', {rj: 'not a list'})
    ]
  });
  assert.strictEqual(s.sheets.Answers.rows[0].at(-1), 'Rejected tries');
  const R = s.sheets.Answers.rows.slice(1).map(r => r[col('Rejected tries')]),
    L = JSON.parse(R[0]);
  assert.deepStrictEqual(L.slice(0, 4), ['xyzcoral', 'brain coral', '=SUM(A1)', 'y'.repeat(40)]);
  assert.strictEqual(L.length, 10);
  assert.ok(typeof R[0] === 'string' && R[0][0] === '[', 'a list, never read as a formula');
  assert.deepStrictEqual(R.slice(1), ['', '']);
  // The columns before it are where they were.
  assert.deepStrictEqual(s.sheets.Answers.rows[0].slice(0, 23), vm.runInContext('LOG', s.ctx).slice(0, 23));
  assert.strictEqual(col('Scoring'), 22);
});

test('Code.gs: no reader counts differently with refused texts logged', () => {
  const a = sheet(false),
    b = sheet(true),
    run = (s, x) => vm.runInContext(x, s.ctx);
  assert.ok(b.sheets.Answers.rows.slice(1).some(r => r.at(-1)));
  assert.deepStrictEqual(
    b.post({readAnswers: 1, token: TOK}).rows.map(r => r.slice(1)),
    a.post({readAnswers: 1, token: TOK}).rows.map(r => r.slice(1))
  );
  assert.deepStrictEqual(b.get({stats: '1'}), a.get({stats: '1'}));
  assert.deepStrictEqual(b.post({readStats: 1, token: TOK}).photos, a.post({readStats: 1, token: TOK}).photos);
  assert.deepStrictEqual(b.get({name: 'Ana', pin: '1234'}).hold, a.get({name: 'Ana', pin: '1234'}).hold);
  assert.strictEqual(run(b, 'answerRows_().length'), run(a, 'answerRows_().length'));
  const ua = a.post({users: 1, token: TOK}).users[0],
    ub = b.post({users: 1, token: TOK}).users[0];
  for (const k of ['answers', 'right', 'days', 'modes', 'recent', 'mix']) assert.deepStrictEqual(ub[k], ua[k], k);
});
