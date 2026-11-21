require('./slot.js').testGuard();
// The photo a Learn list card shows is the first photo of the sheet it opens, enlargeable there (Pierre, 2026-11-20 06:02,
// «la photo doit être un lien. Vers la fiche»), for every subject: the family sheet's hero and the genus sheet's hero are
// listPhoto (learn.js), the card's own photo (app.js cover).
// node --test tests/learnsheetphoto.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const block = require('./block.js');

const learn = fs.readFileSync(path.join(__dirname, '..', 'learn.js'), 'utf8');

test('listPhoto is the photo the list card shows, null when the id is not a list unit', () => {
  const GEN = {fam1: {coverP: {f: 'list.jpg'}}, 'g:x': {}};
  const ctx = {GX: n => GEN[n], cover: g => g.coverP || {f: 'default.jpg'}};
  vm.createContext(ctx);
  vm.runInContext(
    block(learn, 'const listPhoto = id => {', '\n/* ---------- Fish sheets', {file: 'learn.js'}) + '\nthis.listPhoto = listPhoto;',
    ctx
  );
  assert.deepStrictEqual(ctx.listPhoto('fam1'), {f: 'list.jpg'});
  assert.deepStrictEqual(ctx.listPhoto('g:x'), {f: 'default.jpg'});
  assert.strictEqual(ctx.listPhoto('nobody'), null);
});

test('the family and genus sheets lead with it, in the viewer list first', () => {
  const fam = block(learn, 'function treeFamily(f) {', '\n}\n', {file: 'learn.js'});
  assert.match(fam, /hero = listPhoto\(f\.id\) \|\|/);
  assert.match(fam, /if \(hero\) flat\.push\(hero\)/);
  const gen = block(learn, 'function treeGenus(g) {', '\n}\n', {file: 'learn.js'});
  assert.match(gen, /hero = listPhoto\(g\.id\)/);
  // pushed before the page is drawn, so the hero is the viewer's photo 0 (data-z="0")
  assert.ok(gen.indexOf('if (hero) flat.push(hero)') < gen.indexOf('sheetPage('), 'the hero enters flat before the page');
  assert.match(gen, /heroBtn\(0, g\.name,/);
  assert.match(block(learn, 'const heroBtn = ', '\n', {file: 'learn.js'}), /^const heroBtn = \(i, name, pic\) =>$/);
  assert.match(block(learn, 'const heroBtn = (i, name, pic) =>\n', ';\n', {file: 'learn.js'}), /class="zoom hero-ph" data-z="\$\{i\}"/);
});
