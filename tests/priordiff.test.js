require('./slot.js').testGuard();
// Photo review › By difficulty shows each photo's prior beside its answers (REE-62, plan PR 9): the difficulty the app
// starts the photo at before any answer (autosort.js photoPrior, as model.js photoDiff), read for a tree subject (fish, sea
// slugs) from its judged ease and its unit's offset in the subject's own ratings (admin.js treePrior), for the corals from
// the genus offset alone (genusPrior).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block');
const C = require('../core.js'),
  {photoPrior, PRIOR_MID} = require('../autosort.js');
const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('photoPrior: the unit offset plus (3 - ease) x the calibration of one step; the offset alone without an ease', () => {
  assert.strictEqual(photoPrior(3, 0.4, 0.5), 0.4, 'a middling photo sits at its unit');
  assert.strictEqual(photoPrior(5, 0, 0.5), -1, 'very easy: below its unit');
  assert.strictEqual(photoPrior(1, 0.25, 0.5), 1.25, 'hard: above');
  assert.strictEqual(photoPrior(4, undefined, 0.5), -0.5, 'no offset read: the ease alone');
  assert.strictEqual(photoPrior(null, 0.7, 0.5), 0.7, 'no ease (the corals): the offset alone');
  assert.strictEqual(photoPrior(0, 0.7, 0.5), 0.7, 'ease 0 is none');
  assert.strictEqual(photoPrior(null, undefined, 0.5), null, 'nothing to start from');
  // centred on its unit's mean ease (model.js easeMid)
  assert.strictEqual(photoPrior(4, 0.4, 0.5, 4), 0.4, 'at its unit’s mean: at its unit');
  assert.strictEqual(photoPrior(3, 0, 0.5, 2), -0.5, 'easier than its unit’s mean: below its unit');
  assert.strictEqual(photoPrior(3, 0, 0.5, undefined), 0, 'no mean given: the scale’s middle');
});

test('photoPrior follows model.js photoDiff: PRIOR_MID is PDIFF.MID, the centre easeMid and the step the subject’s calib.ease', () => {
  assert.strictEqual(PRIOR_MID, +/const PDIFF = \{[^}]*MID: (\d+)/.exec(read('model.js'))[1]);
  assert.match(
    read('model.js'),
    /\(du \? du\.gd : gdOff\(n\)\) \+ \(p\.e \? \(\(du \? du\.mid : easeMid\(n\)\) - p\.e\) \* \(du \? du\.ease : calibOf\(SUBJ\)\.ease\) : 0\)/
  );
  assert.match(read('model.js'), /EMID\.set\(g, L\.length \? L\.reduce\(\(t, p\) => t \+ p\.e, 0\) \/ L\.length : PDIFF\.MID\)/);
  // the same reads, once for a unit's photos (drawPhotosCalc)
  assert.match(
    read('model.js'),
    /const photoDiffOf = n => \(\{gd: gdOff\(n\), mid: easeMid\(n\), ease: calibOf\(SUBJ\)\.ease, tm0: ptimeOff\(undefined, PDIFF\.W\)\}\);/
  );
});

// The judged ease's weight (docs/decisions/2026-11-23-judged-ease-weight.md): the shared calibration's 0.3 logit a point,
// which the subjects with a judged ease read today (none sets its own), where the app reads it: model.js photoDiff (a
// photo nobody answered), centred on its unit's mean ease (docs/decisions/2026-11-26-judged-ease-within-unit.md); a
// unit's difficulty, genusDiff, is its offset alone.
test('the judged ease weighs the shared 0.3 a point in the fish’s and the sea slugs’ priors, as model.js photoDiff and genusDiff read it', () => {
  assert.strictEqual(C.CALIB.ease, 0.3);
  const w = C.CALIB.ease;
  ['fish', 'seaslug'].forEach(id => assert.strictEqual(C.calibOf(C.subjectOf(id)).ease, w, id));
  const src = read('model.js'),
    engine = id => {
      const photos = [{f: 'a', e: 5}, {f: 'b', e: 1}, {f: 'c', e: 4}, {f: 'u'}],
        ctx = {
          SUBJ: C.subjectOf(id),
          calibOf: C.calibOf,
          PGD: {fam: [0.2, 30]},
          PSTAT: {},
          PTM: {},
          ptimeOff: C.ptimeOff,
          VIEWS: [['w']],
          gamePics: () => photos,
          heldOf: () => [],
          GX: () => ({})
        };
      vm.runInNewContext(
        [
          block(src, 'const PDIFF = {', '\n}\n', {through: 1, file: 'model.js'}),
          block(src, 'let GDIFF = {};', '\n};\n', {through: 1, file: 'model.js'}),
          'this.photoDiff = photoDiff; this.genusDiff = genusDiff;'
        ].join('\n'),
        ctx
      );
      return ctx;
    };
  const F = engine('fish'),
    S = engine('seaslug'),
    near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m}: ${a} against ${b}`);
  [
    [F, 'fish'],
    [S, 'sea slugs']
  ].forEach(([M, s]) => {
    // its judged photos' mean ease (5, 1, 4): 10/3, the centre; w a point either side of it
    near(M.photoDiff('fam', {f: 'a', e: 5}), 0.2 + (10 / 3 - 5) * w, `${s}, ease 5`);
    near(M.photoDiff('fam', {f: 'b', e: 1}), 0.2 + (10 / 3 - 1) * w, `${s}, ease 1`);
    near(M.photoDiff('fam', {f: 'b', e: 1}) - M.photoDiff('fam', {f: 'a', e: 5}), 4 * w, `${s}, 4 points apart`);
    near(M.photoDiff('fam', {f: 'u'}), 0.2, `${s}, no judged ease: the offset`);
    // the unit: its offset alone, whatever its photos' ease
    near(M.genusDiff('fam'), 0.2, `${s} unit`);
  });
});

// The new prior, one rule for every subject (rule S1; docs/decisions/2026-11-26-judged-ease-within-unit.md): a photo's
// prior = its unit's offset + (the unit's mean judged ease - its ease) x the shared weight, run from model.js on made-up
// units of the fish, the sea slugs and the corals: the unit's mean, a unit with one judged photo, a unit with none.
const unitEngine = (id, U, PGD) => {
  const ctx = {
    SUBJ: C.subjectOf(id),
    calibOf: C.calibOf,
    PGD,
    PSTAT: {},
    PTM: {},
    ptimeOff: C.ptimeOff,
    VIEWS: [['wide'], ['medium'], ['macro']],
    gamePics: (n, v) => (U[n] || {views: {}}).views[v] || [],
    heldOf: C.heldOf,
    GX: n => U[n]
  };
  const src = read('model.js');
  vm.runInNewContext(
    [
      block(src, 'const PDIFF = {', '\n}\n', {through: 1, file: 'model.js'}),
      block(src, 'let GDIFF = {};', '\n};\n', {through: 1, file: 'model.js'}),
      'this.photoDiff = photoDiff; this.photoDiffOf = photoDiffOf; this.genusDiff = genusDiff; this.easeMid = easeMid;'
    ].join('\n'),
    ctx
  );
  return ctx;
};
test('the judged ease within its unit: the unit’s mean, one photo, none, for the fish, the sea slugs and the corals', () => {
  const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m}: ${a} against ${b}`);
  ['fish', 'seaslug', 'coral'].forEach(id => {
    const w = C.calibOf(C.subjectOf(id)).ease,
      a = {f: 'a', e: 5},
      b = {f: 'b', e: 2},
      c = {f: 'c', e: 2},
      h = {f: 'h', e: 4},
      one = {f: 'o', e: 1},
      U = {
        // a unit with judged photos over two views and the reserve: its mean (5 + 2 + 2 + 4) / 4 = 3.25
        many: {views: {wide: [a, b], medium: [c]}, held: {wide: [h]}},
        // one judged photo, one not
        solo: {views: {wide: [one, {f: 'x'}]}},
        // no judged ease (the corals' photos)
        none: {views: {wide: [{f: 'y'}, {f: 'z'}]}}
      },
      M = unitEngine(id, U, {many: [0.5, 40], solo: [-0.2, 10], none: [0.8, 30]});
    assert.strictEqual(w, 0.3, `${id}: the shared weight`);
    near(M.easeMid('many'), 3.25, `${id}: the unit’s mean, its reserve included`);
    near(M.photoDiff('many', a), 0.5 + (3.25 - 5) * w, `${id}: easier than its unit’s mean, below its offset`);
    near(M.photoDiff('many', b), 0.5 + (3.25 - 2) * w, `${id}: harder, above`);
    const mean = [a, b, c, h].reduce((t, p) => t + M.photoDiff('many', p), 0) / 4;
    near(mean, 0.5, `${id}: the prior’s mean over the unit is its offset`);
    near(M.photoDiff('solo', one), -0.2, `${id}: a unit with one judged photo: that photo at the offset, its ease 1 or not`);
    near(M.photoDiff('solo', {f: 'x'}), -0.2, `${id}: its photo with no ease: the offset`);
    near(M.easeMid('none'), 3, `${id}: no judged photo: the scale’s middle`);
    near(M.photoDiff('none', {f: 'y'}), 0.8, `${id}: no judged ease: the offset alone`);
    assert.deepStrictEqual(['many', 'solo', 'none'].map(M.genusDiff), [0.5, -0.2, 0.8], `${id}: genusDiff, the offset alone`);
    // the reads made once for the unit (drawPhotosCalc) give the same, to the bit
    [a, b, c, h].forEach(p => assert.strictEqual(M.photoDiff('many', p, M.photoDiffOf('many')), M.photoDiff('many', p), `${id} ${p.f}`));
  });
});

test('the judged ease within its unit: a photo shared by a family and its genus is centred on the unit asked', () => {
  const p = {f: 'p', e: 4},
    U = {
      fam: {views: {wide: [p, {f: 'q', e: 2}, {f: 'r', e: 3}]}},
      'g:G': {views: {wide: [p, {f: 's', e: 5}]}}
    },
    M = unitEngine('fish', U, {fam: [0.1, 50], 'g:G': [0.6, 20]}),
    w = C.CALIB.ease;
  assert.ok(Math.abs(M.photoDiff('fam', p) - (0.1 + (3 - 4) * w)) < 1e-9, 'asked as the family: among the family’s photos');
  assert.ok(Math.abs(M.photoDiff('g:G', p) - (0.6 + (4.5 - 4) * w)) < 1e-9, 'asked as the genus: among the genus’s');
});

// A unit's mean judged ease is kept for the data version (app.js DATA_V; docs/spec/model.md "The state version and its
// views"), as its difficulty is: a tree's new photos (treeBuild, treePull bump it) make it again, a read in the same
// version is the memo's. Where model.js runs without app.js (no DATA_V: the tools), the memo holds per unit record, and a
// data build, which makes the records again, makes it again.
test('easeMid follows the data version: a tree’s new photos move it, the memo holds within a version', () => {
  const src = read('model.js'),
    engine = withVersion => {
      const io = {photos: [{f: 'a', e: 5}], reads: 0, rec: {}},
        ctx = {
          SUBJ: C.subjectOf('fish'),
          calibOf: C.calibOf,
          PGD: {fam: [0.2, 30]},
          VIEWS: [['w']],
          gamePics: () => (io.reads++, io.photos),
          heldOf: () => [],
          GX: () => io.rec
        };
      vm.runInNewContext(
        [
          withVersion ? 'var DATA_V = 0;' : '',
          block(src, 'const PDIFF = {', '\n}\n', {through: 1, file: 'model.js'}),
          block(src, 'let GDIFF = {};', '\n};\n', {through: 1, file: 'model.js'}),
          'this.easeMid = easeMid; this.genusDiff = genusDiff;',
          withVersion ? 'this.bump = () => DATA_V++;' : ''
        ].join('\n'),
        ctx
      );
      return {ctx, io};
    };
  const {ctx: A, io: a} = engine(true);
  assert.strictEqual(A.easeMid('fam'), 5, 'its judged photo');
  a.photos = [
    {f: 'a', e: 5},
    {f: 'b', e: 1}
  ];
  assert.strictEqual(A.easeMid('fam'), 5, 'the same data version: the memo');
  assert.strictEqual(a.reads, 1, 'read from the memo, the photos not read again');
  A.bump(); // the tree's new photos built (app.js treeBuild, treePull: stateBump)
  assert.strictEqual(A.easeMid('fam'), 3, 'a new data version: made again on the photos in force');
  assert.strictEqual(A.genusDiff('fam'), 0.2, 'the unit’s difficulty: its offset, whatever its photos');
  const {ctx: B, io: b} = engine(false);
  assert.strictEqual(B.easeMid('fam'), 5);
  b.photos = a.photos;
  assert.strictEqual(B.easeMid('fam'), 5, 'without DATA_V: the memo, per unit record');
  b.rec = {}; // a data build makes the records again
  assert.strictEqual(B.easeMid('fam'), 3, 'a new record: made again');
});

// treePrior and the prior's caption line, run from admin.js.
const run = code => {
  const src = read('admin.js'),
    ctx = {calibOf: C.calibOf, photoPrior, rawNum: d => String(d), recBadge: (d, o) => `[${d.toFixed(2)}|${o.more}]`};
  vm.runInNewContext(
    [
      block(src, 'function treePrior(S, ease, own, unit, mid) {', '\n}\n', {file: 'admin.js', through: true}),
      block(src, 'function treeEaseMids(R, easeOf, inPlay = () => true) {', '\n}\n', {file: 'admin.js', through: true}),
      block(src, 'function priorHnum(P) {', '\n}\n', {file: 'admin.js', through: true}),
      code
    ].join('\n'),
    ctx
  );
  return JSON.parse(JSON.stringify(ctx.r));
};

test('treePrior: a fish photo’s prior from its ease in force and its family’s offset; none and old ratings leave the ease alone', () => {
  const S = C.SUBJECTS.fish,
    own = {gd: {'fam:a': [0.4, 12]}, photos: {}, v: 189},
    r = run(`this.r = [
      treePrior(${JSON.stringify(S)}, 4, ${JSON.stringify(own)}, 'fam:a'),
      treePrior(${JSON.stringify(S)}, 4, ${JSON.stringify(own)}, 'fam:other'),
      treePrior(${JSON.stringify(S)}, 4, undefined, 'fam:a'),
      treePrior(${JSON.stringify(S)}, 4, {old: true, err: 'script'}, 'fam:a'),
      treePrior(${JSON.stringify(S)}, null, undefined, 'fam:a'),
      treePrior(${JSON.stringify(S)}, null, ${JSON.stringify(own)}, 'fam:a')
    ];`),
    ce = C.calibOf(S).ease;
  assert.deepStrictEqual(r[0], {d: 0.4 - ce, ease: 4, off: 0.4});
  assert.deepStrictEqual(r[1], {d: -ce, ease: 4, off: null}, 'a family with no offset yet');
  assert.deepStrictEqual(r[2], {d: -ce, ease: 4, off: null}, 'ratings not read yet');
  assert.deepStrictEqual(r[3], {d: -ce, ease: 4, off: null}, 'script too old');
  assert.strictEqual(r[4], null);
  assert.deepStrictEqual(r[5], {d: 0.4, ease: null, off: 0.4}, 'no judged ease: the offset');
});

test('treeEaseMids and treePrior: a photo’s prior centred on its unit’s mean ease in force, a genus’s on its own photos', () => {
  const S = C.SUBJECTS.seaslug,
    R = {
      gen: {
        'f:A': {views: {wide: [{f: 'a'}, {f: 'b'}, {f: 'c'}, {f: 'u'}]}},
        'g:A1': {views: {wide: [{f: 'a'}, {f: 'b'}], medium: [{f: 'a'}]}},
        'g:A2': {views: {wide: [{f: 'c'}, {f: 'u'}]}},
        'f:N': {views: {wide: [{f: 'u'}]}}
      }
    },
    ease = {a: 5, b: 4, c: 2},
    own = {gd: {'g:A1': [0.4, 12]}, photos: {}, v: 189},
    r = run(`const M = treeEaseMids(${JSON.stringify(R)}, f => (${JSON.stringify(ease)})[f] || null);
      this.r = [M, treePrior(${JSON.stringify(S)}, 5, ${JSON.stringify(own)}, 'g:A1', M['g:A1']),
        treeEaseMids(${JSON.stringify(R)}, f => (${JSON.stringify(ease)})[f] || null, f => f !== 'a')];`),
    ce = C.calibOf(S).ease;
  assert.deepStrictEqual(
    r[0],
    {'f:A': 11 / 3, 'g:A1': 4.5, 'g:A2': 2},
    'each unit’s own photos, a photo in two views once; a photo with no ease left out, a unit with none has no mean'
  );
  assert.ok(Math.abs(r[1].d - (0.4 - 0.5 * ce)) < 1e-9, 'ease 5 in a genus whose mean is 4.5: half a point below its unit');
  assert.deepStrictEqual(r[2], {'f:A': 3, 'g:A1': 4, 'g:A2': 2}, 'a photo out of play (removed, Not this) left out of the mean');
  // A unit the editor took out of the file in force: not in R.gen, its photos still filed under it in R.ph (the file as
  // built): centred on those.
  const R2 = {gen: R.gen, ph: {k: {entry: 'f:Out'}, l: {entry: 'f:Out'}, a: {entry: 'g:A1'}}},
    r2 = run(`this.r = treeEaseMids(${JSON.stringify(R2)}, f => (${JSON.stringify({...ease, k: 5, l: 2})})[f] || null);`);
  assert.deepStrictEqual(r2, {'f:A': 11 / 3, 'g:A1': 4.5, 'g:A2': 2, 'f:Out': 3.5}, 'a unit out of the file in force');
});

test('priorHnum: the caption line names the ease and says in its title what it lacked', () => {
  const r = run(
    `this.r = [priorHnum(null), priorHnum({d: -0.5, ease: 4, off: 0.4}), priorHnum({d: -0.5, ease: 4, off: null}), priorHnum({d: 0.4, ease: null, off: 0.4})];`
  );
  assert.strictEqual(r[0], '');
  assert.match(r[1], /^<span class="adm-hnum adm-hprior">prior \[-0\.50\|judged ease 4 of 5, unit offset 0\.4\] · ease 4<\/span>$/);
  assert.match(r[2], /unit offset not read/);
  assert.match(r[3], /no judged ease, unit offset 0\.4\]<\/span>$/);
});
