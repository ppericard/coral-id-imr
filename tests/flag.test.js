// The admin's "Bad photo" flag, one brick for every subject (flag.js; app.js UNITS photo; admin.js importFlags):
// - a photo's name: the data-f its page puts on its <img> (remote photos: an iNaturalist URL names no photo), else its
//   file under img/;
// - its identity from the subject's data, the current subject first: a coral photo by its genus and view, a fish photo by
//   its photo id (core.js fishPid: one photo under its stopgap, candidate and reference names), its unit (the entry before
//   a scientific genus), species and view;
// - the admin's import: each flag into its subject's part of curation.json, a fish flag never under a coral key.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js'),
  C = require('../core.js'),
  {flagFile, flagWho} = require('../flag.js');

const ROOT = path.join(__dirname, '..'),
  app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
  admin = fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8');
const [CORAL, FISH] = C.SUBJECTS;
// app.js UNITS photo of each subject, run on made-up data.
const unitsOf = ctx => {
  const end = '\n      return null;\n    },\n',
    coral = block(app, "    species: () => '',\n", end, {through: 1, file: 'app.js'}),
    fish = block(app, '    species: p => (FISH && FISH.spn', end, {through: 1, file: 'app.js'});
  vm.createContext(ctx);
  vm.runInContext(`this.U = {${CORAL.id}: {${coral}}, ${FISH.id}: {${fish}}};`, ctx);
  return ctx.U;
};
const ph = (f, extra) => ({f, ...extra});
const DATA = {
  gen: {
    Acropora: {views: {wide: [ph('acropora-wide-1')], medium: [], macro: []}, more: {macro: [ph('acropora-macro-9')]}},
    Porites: {views: {wide: [], medium: [ph('porites-medium-2')], macro: []}}
  },
  course: {Porites: [{f: 'porites-imr-3', v: 'macro'}]}
};
const FISHD = {
  gen: {
    // a scientific genus listed first: the entry wins all the same
    'g:Chromis': {id: 'g:Chromis', rank: 'genus', views: {wide: [ph('fi123', {sp: 's091'})]}},
    t01: {id: 't01', views: {wide: [ph('fi123', {sp: 's091'}), ph('fbabc', {sp: 's066'})]}}
  }
};
const U = unitsOf({DATA, VIEWS: [['wide'], ['medium'], ['macro']], FISH: FISHD, fishPid: C.fishPid});

test('flag: a photo is named by its data-f, else by its file under img/', () => {
  assert.strictEqual(
    flagFile({dataset: {f: 'fi123'}, src: 'https://inaturalist-open-data.s3.amazonaws.com/photos/123/medium.jpg'}),
    'fi123'
  );
  assert.strictEqual(flagFile({dataset: {}, currentSrc: 'https://r2.example/img/acropora-wide-1-s.webp?v=2'}), 'acropora-wide-1');
  assert.strictEqual(flagFile({dataset: {}, src: 'img/porites-medium-2.webp'}), 'porites-medium-2');
  assert.strictEqual(flagFile({dataset: {}, src: 'https://inaturalist-open-data.s3.amazonaws.com/photos/123/medium.jpg'}), null);
});

test('flag: a coral photo by its genus and view, as before', () => {
  const S = C.SUBJECTS;
  assert.deepStrictEqual(flagWho('acropora-wide-1', CORAL, S, U), {s: CORAL.id, id: 'acropora-wide-1', genus: 'Acropora', view: 'wide'});
  assert.deepStrictEqual(flagWho('acropora-macro-9', CORAL, S, U), {s: CORAL.id, id: 'acropora-macro-9', genus: 'Acropora', view: 'macro'});
  assert.deepStrictEqual(flagWho('porites-imr-3', CORAL, S, U), {s: CORAL.id, id: 'porites-imr-3', genus: 'Porites', view: 'macro'});
  // seen while the fish are on screen: still a coral photo
  assert.strictEqual(flagWho('porites-medium-2', FISH, S, U).s, CORAL.id);
  assert.strictEqual(flagWho('nowhere-1', CORAL, S, U), null);
});

test('flag: a fish photo by its photo id, its entry, species and view', () => {
  const S = C.SUBJECTS;
  assert.deepStrictEqual(flagWho('fi123', FISH, S, U), {s: FISH.id, id: 'i123', file: 'fi123', unit: 't01', sp: 's091', view: 'wide'});
  // a FishBase candidate's name finds its reference copy, under the one photo id
  assert.deepStrictEqual(flagWho('fish-s066-cand-fb-abc', FISH, S, U), {
    s: FISH.id,
    id: 'babc',
    file: 'fbabc',
    unit: 't01',
    sp: 's066',
    view: 'wide'
  });
  // fish data not loaded yet: nobody knows the photo (flag.js then keeps its name)
  const Uz = unitsOf({DATA, VIEWS: [['wide']], FISH: null, fishPid: C.fishPid});
  assert.strictEqual(flagWho('fi123', FISH, S, Uz), null);
});

test('admin: each flag goes to its subject, a fish flag never under a coral key', () => {
  let saved = 0,
    stored = [
      {f: 'acropora-wide-1', genus: 'Acropora', view: 'wide', where: 'quiz · level 2', at: 't1'}, // before subjects: corals
      {f: 'porites-medium-2', s: CORAL.id, genus: 'Porites', view: 'medium', where: 'learn/genera', at: 't2'},
      {f: 'i123', s: FISH.id, file: 'fi123', unit: 't01', sp: 's091', view: 'wide', where: 'fish/practice/quiz · level 1', at: 't3'},
      {f: 'i123', s: FISH.id, file: 'fish-s091-cand-123', unit: 't01', where: 'again', at: 't4'}, // the same photo again
      {f: 'old-flag', genus: 'Porites', at: 't0'} // already in the draft
    ];
  const ctx = {
    DRAFT: {flag: {'old-flag': {genus: 'Porites', at: 'x'}}, fish: {add: {'fish-s091-cand-1': 's091'}}},
    store: {get: () => stored, set: (k, v) => k === 'reefid-photo-flags' && (stored = v)},
    saveDraft: () => saved++,
    subjectOf: C.subjectOf,
    ASUBJ: CORAL
  };
  vm.createContext(ctx);
  vm.runInContext(
    block(admin, 'const flagsOf = ', '\n// Excluded photos', {file: 'admin.js'}) +
      ';this.importFlags = importFlags; this.flagsOf = flagsOf;',
    ctx
  );
  assert.strictEqual(ctx.importFlags(), 3);
  assert.strictEqual(saved, 1);
  assert.strictEqual(stored, null, 'the browser list is emptied');
  const D = JSON.parse(JSON.stringify(ctx.DRAFT)); // out of the vm's realm
  assert.deepStrictEqual(Object.keys(D.flag).sort(), ['acropora-wide-1', 'old-flag', 'porites-medium-2']);
  assert.deepStrictEqual(D.flag['acropora-wide-1'], {genus: 'Acropora', view: 'wide', where: 'quiz · level 2', at: 't1'});
  assert.deepStrictEqual(D.flag['old-flag'], {genus: 'Porites', at: 'x'}, 'a flag already there is kept');
  assert.deepStrictEqual(D.fish.flag, {
    i123: {file: 'fi123', unit: 't01', sp: 's091', view: 'wide', where: 'fish/practice/quiz · level 1', at: 't3'}
  });
  assert.deepStrictEqual(D.fish.add, {'fish-s091-cand-1': 's091'}, 'the rest of the fish curation kept');
  assert.ok(!Object.keys(D).some(k => k !== 'flag' && k !== 'fish'), 'no other key written');
  assert.deepStrictEqual(Object.keys(ctx.flagsOf(D, FISH)), ['i123']);
});
