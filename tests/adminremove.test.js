'use strict';
require('./slot.js').testGuard();
// admin.js ACT.remove, the one Remove (Pierre, 2026-11-21 05:48, option A: "un bouton remove, là en un clic la photo ne revient
// jamais, avec un undo juste après, une liste des photos retirées pour en remettre"): the photo goes out for good (curation
// exclude, as the old ×), whatever it was: a site photo, a candidate Pierre added, one the auto-sort added, one the old Remove had
// hidden. One Undo step (one edit), the toast carries the Undo button. ACT.unhide only puts back an old Remove's hide entry.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');

const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8'),
  body = cut(src, '  remove: (n, f) => {', '  move: (n, f, v, to) =>', {file: 'admin.js'});

const run = (genus, f, call = 'remove') => {
  const ctx = {
    DRAFT: {genera: {G: genus}},
    QUIET: false,
    toasts: [],
    toastUndo: m => ctx.toasts.push(m),
    clone: o => JSON.parse(JSON.stringify(o)),
    entry: () => ctx.DRAFT.genera.G,
    edit: (n, fn) => {
      const k = ctx.clone(ctx.entry(n));
      fn(k);
      ['feat', 'move', 'add', 'out'].forEach(x => {
        if (k[x] && !Object.keys(k[x]).length) delete k[x]; // as admin.js edit()
      });
      if (k.hide && !k.hide.length) delete k.hide;
      ctx.DRAFT.genera.G = k;
    },
    dropFeat: (k, x) => {
      Object.keys(k.feat || {}).forEach(v => (k.feat[v] = k.feat[v].filter(y => y !== x)));
    }
  };
  vm.createContext(ctx);
  vm.runInContext(`const ACT = {${body}}; this.ACT = ACT;`, ctx);
  ctx.ACT[call]('G', f);
  return {D: JSON.parse(JSON.stringify(ctx.DRAFT)), toasts: ctx.toasts};
};

test('Remove of a site photo excludes it for good, with the toast that carries the Undo', () => {
  const {D, toasts} = run({}, 'p');
  assert.deepStrictEqual(D.exclude, {p: 'excluded'});
  assert.strictEqual(D.genera.G.hide, undefined, 'no hide entry: nothing creates one any more');
  assert.deepStrictEqual(toasts, ['Removed.']);
});

test('Remove on a candidate Pierre added himself: the add goes, the photo is excluded (a Keep disagreement, autosort.js pierreOf)', () => {
  const {D} = run({add: {a: 'wide', b: 'close'}}, 'a');
  assert.deepStrictEqual(D.genera.G.add, {b: 'close'});
  assert.deepStrictEqual(D.exclude, {a: 'excluded'});
  assert.strictEqual(D.seen, undefined);
});

test('Remove takes the photo out of the featured photos and the cover', () => {
  const {D} = run({cover: 'p', feat: {wide: ['p', 'q']}}, 'p');
  assert.strictEqual(D.genera.G.cover, undefined);
  assert.deepStrictEqual(D.genera.G.feat.wide, ['q']);
});

test('Remove of a photo the old Remove hid: its hide entry goes, the photo is listed once (as removed)', () => {
  const {D} = run({hide: ['p', 'z']}, 'p');
  assert.deepStrictEqual(D.genera.G.hide, ['z']);
  assert.deepStrictEqual(D.exclude, {p: 'excluded'});
  const E = run({hide: ['p']}, 'p').D;
  assert.strictEqual(E.genera.G.hide, undefined, 'an emptied list is dropped');
});

test('several Removes in a row (Remove all, QUIET) show no toast of their own: the caller says it once', () => {
  const c = {
    DRAFT: {genera: {G: {}}},
    QUIET: true,
    toasts: [],
    toastUndo: m => c.toasts.push(m),
    clone: o => JSON.parse(JSON.stringify(o)),
    entry: () => c.DRAFT.genera.G,
    edit: () => {},
    dropFeat: () => {}
  };
  vm.createContext(c);
  vm.runInContext(`const ACT = {${body}}; this.ACT = ACT;`, c);
  c.ACT.remove('G', 'p');
  assert.deepStrictEqual(c.toasts, []);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c.DRAFT.exclude)), {p: 'excluded'});
});
