// tools/game_forms.js: the growth-form guesses for game photos with no form (AGENTS.md rule 4), written into forms.json.
// Its writer keeps the layout of tools/judging_import.py, and --apply checks each guess by the judging brief's
// growth-form pass (judging/AGENTS.md) and never covers a form Pierre gave (curation.json gf, rule 8).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const {dumpForms, apply, formless} = require('../tools/game_forms.js');

test('forms.json is written back byte for byte (the layout tools/judging_import.py writes)', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'forms.json'), 'utf8');
  assert.strictEqual(dumpForms(JSON.parse(text)), text);
  const F = {note: 'é "q"', forms: [{id: 'B', slide: 4}], gf: Object.fromEntries(Array.from({length: 21}, (_, i) => ['f' + i, 'B']))};
  assert.strictEqual(dumpForms(F).split('\n')[0], '{"note":"é \\"q\\"",');
  assert.ok(dumpForms(F).includes('"forms":[{"id": "B", "slide": 4}],\n"gf":{\n"f0":"B",\n"f1":"B",'));
});

const games = {
  a: {f: 'a', genus: 'Turbinaria', view: 'wide'},
  b: {f: 'b', genus: 'Goniopora', view: 'wide'},
  c: {f: 'c', genus: 'Goniopora', view: 'macro'},
  d: {f: 'd', genus: 'Echinopora', view: 'medium'}
};
const forms = {forms: 'BETUMSF'.split('').map(id => ({id})), gf: {b: 'p', z: 'M'}, gunsure: ['z']};

test('--apply writes the guesses (polyps as "p", the unsure ones in gunsure); entries already there keep their place', () => {
  const r = apply(
    {photos: {a: {form: 'F'}, b: {form: 'M', polyps: true, unsure: ['form'], note: 'Massive or submassive'}, c: {form: 'x'}}},
    games,
    {},
    forms
  );
  assert.deepStrictEqual(r.errors, []);
  assert.deepStrictEqual(r.gf, {b: 'Mp', z: 'M', a: 'F', c: 'x'});
  assert.deepStrictEqual(Object.keys(r.gf), ['b', 'z', 'a', 'c']);
  assert.deepStrictEqual(r.gunsure, ['b', 'z']);
  assert.deepStrictEqual(
    formless(games, {}, {gf: r.gf}).map(p => p.f),
    ['d']
  );
});

test('--apply refuses what the judging brief refuses, and a photo whose form Pierre gave', () => {
  const bad = J => apply({photos: J}, games, {gf: {d: 'B'}}, forms).errors;
  assert.match(bad({a: {form: 'Q'}})[0], /form must be ONE of/);
  assert.match(bad({a: {form: 'F', polyps: true}})[0], /polyps only for/); // Turbinaria
  assert.match(bad({c: {form: 'x', polyps: true}})[0], /never on a macro photo/);
  assert.match(bad({a: {form: 'F', unsure: ['form']}})[0], /note required/);
  assert.match(bad({d: {form: 'F'}})[0], /Pierre gave/);
  assert.match(bad({nope: {form: 'F'}})[0], /not a game photo/);
  assert.match(bad({a: {form: 'F', view: 'wide'}})[0], /unknown fields/);
});

test('a polyps flag alone ("p") is not a growth form', () => {
  assert.deepStrictEqual(
    formless(games, {gf: {a: 'n'}}, {gf: {b: 'p', c: 'x', d: 'Bp'}}).map(p => p.f),
    ['a', 'b']
  );
});
