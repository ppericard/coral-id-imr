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
});

test('photoPrior follows model.js photoDiff: PRIOR_MID is PDIFF.MID and the step is the subject’s calib.ease', () => {
  assert.strictEqual(PRIOR_MID, +/const PDIFF = \{[^}]*MID: (\d+)/.exec(read('model.js'))[1]);
  assert.match(read('model.js'), /gdOff\(n\) \+ \(p\.e \? \(PDIFF\.MID - p\.e\) \* calibOf\(SUBJ\)\.ease : 0\)/);
});

// The judged ease's weight (docs/decisions/2026-11-23-judged-ease-weight.md): the shared calibration's 0.3 logit a point,
// which the subjects with a judged ease read today (none sets its own), where the app reads it: model.js photoDiff (a
// photo nobody answered) and genusDiff (a unit's difficulty: its offset plus its judged photos' mean prior).
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
    near(M.photoDiff('fam', {f: 'a', e: 5}), 0.2 - 2 * w, `${s}, ease 5`);
    near(M.photoDiff('fam', {f: 'b', e: 1}), 0.2 + 2 * w, `${s}, ease 1`);
    near(M.photoDiff('fam', {f: 'u'}), 0.2, `${s}, no judged ease: the offset`);
    // the unit: its offset plus the mean prior of its judged photos (ease 5, 1, 4: mean 3 − e = −1/3), rounded to 0.01
    near(M.genusDiff('fam'), Math.round((0.2 - w / 3) * 100) / 100, `${s} unit`);
  });
});

// A unit's difficulty is kept for the data version (app.js DATA_V; docs/spec/model.md "The state version and its views"):
// a tree's new photos (treeBuild, treePull bump it) make it again, a read in the same version is the memo's. Where
// model.js runs without app.js (no DATA_V: the tools), the memo holds until it is cleared by hand.
test('genusDiff follows the data version: a tree’s new photos move it, the memo holds within a version', () => {
  const src = read('model.js'),
    w = C.CALIB.ease,
    MID = +/const PDIFF = \{[^}]*MID: (\d+)/.exec(src)[1],
    exp = es => Math.round((0.2 + es.reduce((t, e) => t + (MID - e) * w, 0) / es.length) * 100) / 100,
    engine = withVersion => {
      const io = {photos: [{f: 'a', e: 5}], reads: 0},
        ctx = {
          SUBJ: C.subjectOf('fish'),
          calibOf: C.calibOf,
          PGD: {fam: [0.2, 30]},
          VIEWS: [['w']],
          gamePics: () => (io.reads++, io.photos),
          heldOf: () => [],
          GX: () => ({})
        };
      vm.runInNewContext(
        [
          block(src, 'const PDIFF = {', '\n}\n', {through: 1, file: 'model.js'}),
          withVersion ? 'var DATA_V = 0;' : '',
          block(src, 'let GDIFF = {};', '\n};\n', {through: 1, file: 'model.js'}),
          'this.genusDiff = genusDiff; this.clear = () => (GDIFF = {});',
          withVersion ? 'this.bump = () => DATA_V++;' : ''
        ].join('\n'),
        ctx
      );
      return {ctx, io};
    };
  const {ctx: A, io: a} = engine(true);
  assert.strictEqual(A.genusDiff('fam'), exp([5]), 'its judged photo');
  a.photos = [
    {f: 'a', e: 5},
    {f: 'b', e: 1}
  ];
  assert.strictEqual(A.genusDiff('fam'), exp([5]), 'the same data version: the memo');
  assert.strictEqual(a.reads, 1, 'read from the memo, the photos not read again');
  A.bump(); // the tree's new photos built (app.js treeBuild, treePull: stateBump)
  assert.strictEqual(A.genusDiff('fam'), exp([5, 1]), 'a new data version: made again on the photos in force');
  assert.notStrictEqual(exp([5, 1]), exp([5]), 'the case tells the two apart');
  const {ctx: B, io: b} = engine(false);
  assert.strictEqual(B.genusDiff('fam'), exp([5]));
  b.photos = a.photos;
  assert.strictEqual(B.genusDiff('fam'), exp([5]), 'without DATA_V: the memo until cleared');
  B.clear();
  assert.strictEqual(B.genusDiff('fam'), exp([5, 1]), 'cleared by hand: made again');
});

// treePrior and the prior's caption line, run from admin.js.
const run = code => {
  const src = read('admin.js'),
    ctx = {calibOf: C.calibOf, photoPrior, rawNum: d => String(d), recBadge: (d, o) => `[${d.toFixed(2)}|${o.more}]`};
  vm.runInNewContext(
    [
      block(src, 'function treePrior(S, ease, own, unit) {', '\n}\n', {file: 'admin.js', through: true}),
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

test('priorHnum: the caption line names the ease and says in its title what it lacked', () => {
  const r = run(
    `this.r = [priorHnum(null), priorHnum({d: -0.5, ease: 4, off: 0.4}), priorHnum({d: -0.5, ease: 4, off: null}), priorHnum({d: 0.4, ease: null, off: 0.4})];`
  );
  assert.strictEqual(r[0], '');
  assert.match(r[1], /^<span class="adm-hnum adm-hprior">prior \[-0\.50\|judged ease 4 of 5, unit offset 0\.4\] · ease 4<\/span>$/);
  assert.match(r[2], /unit offset not read/);
  assert.match(r[3], /no judged ease, unit offset 0\.4\]<\/span>$/);
});
