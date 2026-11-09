'use strict';
// Journey (admin-journey.js): the Cards list in time order (Pierre, 2026-11-05: rows of Nov 4 came before rows of Nov 2),
// the untimed ones after; the start rows say "inferred" once and "Answered again" for the same answer given again; and
// the word beside a unit outside the slate (Pierre, 2026-11-08: the fish genera were labelled "bonus", a coral word,
// although they are the scientific-names step of the game). The blocks are cut with tests/block.js, which fails by name
// when a marker moves.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  block = require('./block.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'admin-journey.js'), 'utf8'),
  cut = (from, to, o = {}) => block(src, from, to, {file: 'admin-journey.js', ...o});
const jOrder = new Function(cut('// jorder: begin', '// jorder: end') + '\nreturn jOrder;')();
const jOffSlate = new Function(cut('// joffslate: begin', '// joffslate: end') + '\nreturn jOffSlate;')();

test('jOrder: timed rows oldest first, untimed rows after in their own order', () => {
  const out = jOrder([
    [400, 'start-nov4'],
    [null, 'one-at-a-time'],
    [100, 'first-nov2'],
    [300, 'fallback'],
    [null, 'not-used'],
    [200, 'declined-nov2']
  ]);
  assert.strictEqual(out, 'first-nov2declined-nov2fallbackstart-nov4one-at-a-timenot-used');
});

test('start rows: inferred said once; the same answer again reads "Answered again"', () => {
  const body = cut('const jStart', '\n};\n');
  assert.ok(/'Answered again'/.test(body), 'the same answer given again');
  assert.ok(!/<b>inferred<\/b>[^`]*`\} · \$\{JSTART\[via\]/.test(body), 'inferred is not followed by JSTART.inferred');
});

test('a fish genus beside a slate of families reads "genus"', () => {
  assert.strictEqual(jOffSlate('g:Abudefduf', new Set(['f:Damselfishes', 'f:Wrasses'])), 'genus');
});
test('a coral bonus genus beside a slate of genera stays "bonus"', () => {
  assert.strictEqual(jOffSlate('Physogyra', new Set(['Acropora', 'Porites'])), 'bonus');
});
test('a family outside the slate of families (another circle) stays "bonus"', () => {
  assert.strictEqual(jOffSlate('f:Batfishes', new Set(['f:Damselfishes'])), 'bonus');
});
