// The admin's cost per click (performance pass, 2026-11-09): admin.js autoWhen skips the fish part's keeps when a click
// left that part as it was (the same object), and putDraft stores the draft's text joined from snap (draftJson). Checked
// here: no admin script writes into the fish part of the draft in place (each change makes a new one, so the same object
// means the same keeps), the fish edits the admin runs leave their input as it was, and draftJson is the JSON the store
// wrote before.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const A = require('../autosort.js');
const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  CUR = JSON.parse(read('curation.json'));

test('no admin script writes into the fish part of the draft in place', () => {
  const bad = [];
  for (const f of fs.readdirSync(ROOT).filter(x => /^admin.*\.js$/.test(x)))
    read(f)
      .split('\n')
      .forEach((l, i) => {
        if (/^\s*\/\//.test(l)) return;
        if (
          /\bDRAFT\.fish\s*(?:\.\w+|\[[^\]]*\])+\s*(?:=(?!=)|\+\+|--|[+-]=)/.test(l) ||
          /delete\s+DRAFT\.fish\b/.test(l) ||
          /Object\.assign\(\s*DRAFT\.fish\b/.test(l)
        )
          bad.push(`${f}:${i + 1}: ${l.trim()}`);
      });
  assert.deepStrictEqual(bad, []);
});

test('the fish edits the admin runs leave the fish part they are given as it was', () => {
  const F = CUR.fish,
    before = JSON.stringify(F),
    f = Object.keys(F.add || {})[0],
    sid = (F.add || {})[f],
    tid = Object.keys(F.genera || {})[0],
    out = [
      A.fishReject(F, f),
      A.fishExclude(F, f),
      A.fishNotThis(F, f, 's999', sid),
      A.fishSet(F, f, 'ease', 3),
      A.fishSet(F, f, 'tags', A.fishTag((F.tags || {})[f] || 'p1g1sm1', 'j')),
      A.fishSet(F, f, 'phase', 'juvenile'),
      A.fishAdd(F, 'fish-s001-cand-1', 's001', {e: 4}, {f: 'fish-s001-cand-1'}),
      A.fishCover(F, tid, f),
      A.fishOk(F, tid),
      A.fishDrop(F, tid, (F.genera[tid] || {}).cover),
      A.fishMontSet(F, 'f:A|f:B', {v: 'adult'}),
      A.fishUndo(F, f, sid)
    ];
  assert.strictEqual(JSON.stringify(F), before, 'an edit wrote into its input');
  out.forEach((x, i) => assert.ok(x && x !== F, `edit ${i}: a new fish part`));
});

test('draftJson: the JSON of the draft with its _tab, joined from the draft text', () => {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(block(read('admin.js'), 'const draftJson = ', '\n', {file: 'admin.js'}) + '\nthis.draftJson = draftJson;', ctx);
  const tab = {rev: 'ab12.7', seen: 'cd34.2'};
  for (const d of [CUR, {}, {genera: {}}, {2: 'x', genera: {a: 1}, v: 1}, {fish: {add: {'a"b': 's1'}}, note: 'é\n'}]) {
    const s = JSON.stringify(d);
    assert.strictEqual(ctx.draftJson(s, tab), JSON.stringify(Object.assign({}, JSON.parse(s), {_tab: tab})));
  }
  assert.deepStrictEqual(JSON.parse(ctx.draftJson('{}', null)), {_tab: null});
});
