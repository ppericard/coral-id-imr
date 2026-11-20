'use strict';
require('./slot.js').testGuard();
// admin.js ACT.hide on a photo added by hand (a candidate Pierre added, then removed): the add goes and the photo is
// marked rejected (curation.json seen {'cand:f': 1}), as for an auto-added one, so it does not come back in the
// Candidates queue and the auto-sort (rejected(), autoIdx) does not add it again.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');

const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8'),
  body = cut(src, '  hide: (n, f) =>', '  move: (n, f, v, to) =>', {file: 'admin.js'});

const run = (genus, f, flag) => {
  const ctx = {
    DRAFT: {genera: {G: genus}, ...(flag ? {flag} : {})},
    CK: x => 'cand:' + x,
    clone: o => JSON.parse(JSON.stringify(o)),
    entry: () => ctx.DRAFT.genera.G,
    edit: (n, fn) => {
      const k = ctx.clone(ctx.entry(n));
      fn(k);
      ctx.DRAFT.genera.G = k;
    },
    dropFeat: () => {},
    aApplied: () => undefined,
    // the flag the removal clears (admin.js flagsOf / flagsSet on the corals' part, the curation itself)
    ADM0: {},
    flagsOf: C => C.flag || {},
    flagsSet: (C, S, F) => (C.flag = F)
  };
  vm.createContext(ctx);
  vm.runInContext(`const ACT = {${body}}; this.ACT = ACT;`, ctx);
  ctx.ACT.hide('G', f);
  return JSON.parse(JSON.stringify(ctx.DRAFT));
};

test('Remove on a candidate Pierre added himself: the add goes and the photo is marked rejected', () => {
  const D = run({add: {a: 'wide', b: 'close'}}, 'a');
  assert.deepStrictEqual(D.genera.G.add, {b: 'close'});
  assert.deepStrictEqual(D.seen, {'cand:a': 1});
});

test('Remove on an added candidate clears its flag, and only its flag', () => {
  const D = run({add: {a: 'wide'}}, 'a', {a: {genus: 'G'}, z: {genus: 'G'}});
  assert.deepStrictEqual(Object.keys(D.flag), ['z']);
});

test('a plain removal of a site photo marks nothing', () => {
  const D = run({add: {a: 'wide'}}, 'a');
  assert.deepStrictEqual(D.genera.G.add, {}); // edit() prunes the empty map in the real admin
  const E = run({}, 'p');
  assert.deepStrictEqual(E.genera.G.hide, ['p']);
  assert.strictEqual(E.seen, undefined);
});
