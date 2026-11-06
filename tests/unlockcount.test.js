// The units unlocked on My progress (Pierre, 2026-11-05: "30/40 genera unlocked"): progress.js unlockN / unlockText run in
// Node on stubs, as tests/achrun.test.js runs achAfter. The count is the subject's units opened on the path (model.js
// introduced: a card, an answer, Open all; a unit closed again by "One at a time" does not count) out of every unit its
// progress counts (slateGenera), in the subject's own word (SUBJECTS many): one code path for every subject (rule S1).
const test = require('node:test');
const assert = require('node:assert');
const cut = require('./block.js');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'progress.js'), 'utf8');

function run(subject, slate, open) {
  const block = cut(SRC, '// The units unlocked (Pierre, 2026-11-05', '\n};\n', {through: 1, file: 'progress.js'});
  const ctx = {SUBJ: C.subjectOf(subject), slateGenera: () => slate, introduced: n => open.includes(n)};
  vm.createContext(ctx);
  vm.runInContext(block + '\nthis.T = {unlockN, unlockText};', ctx);
  return ctx.T;
}

test('corals: the genera opened out of the slate, in words', () => {
  const slate = ['Acropora', 'Montipora', 'Porites', 'Millepora'],
    T = run('coral', slate, ['Acropora', 'Millepora', 'Fungia']); // Fungia is not on this slate: not counted
  assert.deepStrictEqual([...T.unlockN()], [2, 4]);
  assert.strictEqual(T.unlockText(), '2/4 genera unlocked');
  assert.strictEqual(T.unlockText(slate, true), '<b>2</b>/4 genera unlocked', 'the count in bold on the card');
});

test("fish: the same code, the subject's own unit word and slate", () => {
  const slate = ['f1', 'f2', 'f3'],
    T = run('fish', slate, ['f3']);
  assert.strictEqual(T.unlockText(), `1/3 ${C.subjectOf('fish').many} unlocked`);
  assert.match(T.unlockText(), /families unlocked$/);
});

test('none and all opened', () => {
  assert.strictEqual(run('coral', ['A', 'B'], []).unlockText(), '0/2 genera unlocked');
  assert.strictEqual(run('coral', ['A', 'B'], ['B', 'A']).unlockText(), '2/2 genera unlocked');
});

test('the card and the header pill read the count; no subject named', () => {
  const badge = cut(SRC, 'function badge(', '\n}\n', {through: 1, file: 'progress.js'}),
    pill = cut(SRC, 'function showProg(', '\n}\n', {through: 1, file: 'progress.js'});
  assert.match(badge, /class="pbunl">\$\{unlockText\(slateGenera\(\), true\)\}/, 'the card shows it under the name');
  assert.match(pill, /unlockText\(n\)/, "the pill's tooltip says it");
  const code = cut(SRC, '// The units unlocked (Pierre, 2026-11-05', '\n};\n', {through: 1})
    .split('\n')
    .filter(l => !l.trim().startsWith('//'))
    .join('\n');
  assert.doesNotMatch(code, /\b(coral|fish|genera|families)\b/i, 'the unit word comes from SUBJECTS');
});
