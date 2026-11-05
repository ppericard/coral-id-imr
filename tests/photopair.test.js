// learn.js photoPair: the photo of the other genus shown side by side (the quiz's mix-up montage "Your answer, same view",
// quiz.js; the Look-alikes montages). Same growth form first, then nearest the front, then nearest zoom level. A player's
// report (2026-11-04): a plate Turbinaria answered Echinopora was shown a branching Echinopora, because only the first 6
// Echinopora photos were searched. The function runs in Node, as tests/pairs.test.js does.
const test = require('node:test');
const assert = require('node:assert');
const block = require('./block.js');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'learn.js'), 'utf8'),
  ctx = {};
vm.createContext(ctx);
vm.runInContext(block(src, 'const ZOOM = {', '\n}\n', {through: 1, file: 'learn.js'}) + '\nthis.f = photoPair;', ctx);
// [...]: a list made in the vm's realm is copied into this one, so deepStrictEqual compares values only.
const photoPair = (...a) => [...ctx.f(...a)];
const ph = (f, form, view) => ({f, form, view});

test('a same-form photo beyond the first 6 is chosen (the Turbinaria / Echinopora report)', () => {
  const shown = ph('turbinaria', 'F', 'wide');
  const echinopora = [...'BBEBBEBB']
    .map((form, i) => ph('e' + i, form, 'wide'))
    .concat(ph('plate', 'F', 'wide'), ph('plate2', 'F', 'wide'));
  const [a, b] = photoPair([shown], echinopora, shown);
  assert.strictEqual(a, shown);
  assert.strictEqual(b.f, 'plate', 'the first plate photo, not a branching one from the front');
});

test('same form first, then nearest the front, then nearest zoom level', () => {
  const shown = ph('s', 'M', 'medium');
  // two same-form photos: the one nearer the front wins
  assert.strictEqual(photoPair([shown], [ph('b0', 'B'), ph('m1', 'M'), ph('m2', 'M')], shown)[1].f, 'm1');
  // a same-form photo at a farther zoom level still beats a front photo of another form
  const all = [ph('b0', 'B', 'medium'), ph('m1', 'M', 'wide')];
  assert.strictEqual(photoPair([shown], all, shown)[1].f, 'm1');
  // same form and same place: the nearer zoom level
  assert.strictEqual(photoPair([ph('a', 'M', 'wide'), ph('a2', 'M', 'macro')], [ph('w', 'M', 'wide')])[0].f, 'a');
});

test('no same form: the front photo, as before; "x" (form not visible) matches nothing', () => {
  const shown = ph('s', 'x', 'macro');
  const L = [ph('b0', 'B'), ph('x1', 'x'), ...Array.from({length: 10}, (_, i) => ph('x' + (i + 2), 'x'))];
  assert.strictEqual(photoPair([shown], L, shown)[1].f, 'b0');
  const none = {f: 'n'};
  assert.strictEqual(photoPair([none], [ph('b0', 'B'), ph('m1', 'M')], none)[1].f, 'b0');
  // two lists with no same form: the pair nearest the front of both
  const [a, b] = photoPair([ph('a0', 'B'), ph('a1', 'E')], [ph('b0', 'M'), ph('b1', 'S')]);
  assert.deepStrictEqual([a.f, b.f], ['a0', 'b0']);
  assert.deepStrictEqual(photoPair([], []), []);
});

test('both lists are searched for the same form', () => {
  const A = [...'BBBBBBBB'].map((form, i) => ph('a' + i, form)).concat(ph('aF', 'F'));
  const B = [...'EEEEEEEE'].map((form, i) => ph('b' + i, form)).concat(ph('bF', 'F'));
  assert.deepStrictEqual(
    photoPair(A, B).map(p => p.f),
    ['aF', 'bF']
  );
});
