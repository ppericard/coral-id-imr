'use strict';
// Journey: the word beside a unit outside the slate (Pierre, 2026-11-08: the fish genera were labelled "bonus", a coral
// word, although they are the scientific-names step of the game).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'admin-journey.js'), 'utf8');
const jOffSlate = new Function(src.slice(src.indexOf('// joffslate: begin'), src.indexOf('// joffslate: end')) + '\nreturn jOffSlate;')();

test('a fish genus beside a slate of families reads "genus"', () => {
  assert.strictEqual(jOffSlate('g:Abudefduf', new Set(['f:Damselfishes', 'f:Wrasses'])), 'genus');
});
test('a coral bonus genus beside a slate of genera stays "bonus"', () => {
  assert.strictEqual(jOffSlate('Physogyra', new Set(['Acropora', 'Porites'])), 'bonus');
});
test('a family outside the slate of families (another circle) stays "bonus"', () => {
  assert.strictEqual(jOffSlate('f:Batfishes', new Set(['f:Damselfishes'])), 'bonus');
});
