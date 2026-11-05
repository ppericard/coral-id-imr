// app.js imrFormsOf: the IMR growth forms a genus takes, from its classified photos (one photo Pierre or the first guess
// is sure of, or two unsure guesses), which the quiz's easy wrong choices use (rule L7: genera sharing no
// growth form). forms.json "gunsure" (the guesses to double-check) is a list; it was read as an object, so every unsure
// guess counted as sure (found on PR #577). The loader, applyForms and imrFormsOf run in Node on stubs.
const test = require('node:test');
const assert = require('node:assert');
const block = require('./block.js');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
async function setup(formsJson, cur, photos) {
  const ctx = {
    getR: () => Promise.resolve(formsJson),
    okJson: j => j,
    softFail: () => () => ({}),
    DATA: {key: [], gen: {G: {views: {wide: photos}}}, course: {}},
    CFMAP: {}
  };
  ctx.GX = n => ctx.DATA.gen[n];
  vm.createContext(ctx);
  vm.runInContext(
    'let FORMS;\n' +
      block(src, 'const forms = () =>', 'const json = u =>', {file: 'app.js'}) +
      block(src, 'function applyForms(d, c) {', '\n}\n', {through: 1, file: 'app.js'}) +
      block(src, 'const imrFormsOf = n => {', '\n};\n', {through: 1, file: 'app.js'}) +
      '\nthis.load = async () => { FORMS = await forms(); }; this.applyForms = applyForms; this.imrFormsOf = imrFormsOf;',
    ctx
  );
  await ctx.load();
  ctx.applyForms(ctx.DATA, cur);
  return n => [...ctx.imrFormsOf(n)].sort();
}

test('one unsure guess does not make a form; one sure guess, two unsure ones or Pierre’s choice do', async () => {
  const photos = [{f: 'u1'}, {f: 'b1'}, {f: 's1'}, {f: 's2'}, {f: 'p1'}];
  const of = await setup({gf: {u1: 'M', b1: 'B', s1: 'S', s2: 'Sp', p1: 'F'}, gunsure: ['u1', 's1', 's2', 'p1']}, {gf: {p1: 'F'}}, photos);
  // M: one unsure guess only (out); B: one sure guess; S: two unsure guesses; F: unsure guess Pierre confirmed
  assert.deepStrictEqual(of('G'), ['B', 'F', 'S']);
});

test('without gunsure every guess is sure', async () => {
  const of = await setup({gf: {a: 'M', b: 'x'}}, {}, [{f: 'a'}, {f: 'b'}]);
  assert.deepStrictEqual(of('G'), ['M']);
});
