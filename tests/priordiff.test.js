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
  // centred on its family's mean ease (model.js easeMid)
  assert.strictEqual(photoPrior(4, 0.4, 0.5, 4), 0.4, 'at its family’s mean: at its unit');
  assert.strictEqual(photoPrior(3, 0, 0.5, 2), -0.5, 'easier than its family’s mean: below its unit');
  assert.strictEqual(photoPrior(3, 0, 0.5, undefined), 0, 'no mean given: the scale’s middle');
});

test('photoPrior follows model.js photoDiff: PRIOR_MID is PDIFF.MID, the centre easeMid and the step the subject’s calib.ease', () => {
  assert.strictEqual(PRIOR_MID, +/const PDIFF = \{[^}]*MID: (\d+)/.exec(read('model.js'))[1]);
  assert.match(read('model.js'), /gdOff\(n\) \+ \(p\.e \? \(easeMid\(n\) - p\.e\) \* calibOf\(SUBJ\)\.ease : 0\)/);
  assert.match(read('model.js'), /EFAM\.set\(g, L\.length \? L\.reduce\(\(t, p\) => t \+ p\.e, 0\) \/ L\.length : PDIFF\.MID\)/);
});

// The judged ease's weight (docs/decisions/2026-11-23-judged-ease-weight.md): the shared calibration's 0.3 logit a point,
// which the subjects with a judged ease read today (none sets its own), where the app reads it: model.js photoDiff (a
// photo nobody answered) and genusDiff (a unit's difficulty: its offset plus its judged photos' mean prior), both centred
// on the family's mean ease (a unit with no parent is its own family, so its mean prior is 0).
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
    // the unit, a family: its offset alone, whatever its photos' ease
    near(M.genusDiff('fam'), 0.2, `${s} unit`);
  });
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

test('treeEaseMids and treePrior: a photo’s prior centred on its family’s mean ease in force, a genus’s photos on their family’s', () => {
  const S = C.SUBJECTS.seaslug,
    R = {
      fam: {'f:A': 'f:A', 'g:A1': 'f:A', 'g:A2': 'f:A'},
      ph: {a: {entry: 'g:A1'}, b: {entry: 'g:A1'}, c: {entry: 'g:A2'}, d: {entry: 'f:B'}, u: {entry: 'g:A2'}}
    },
    ease = {a: 5, b: 4, c: 3, d: 2},
    own = {gd: {'g:A1': [0.4, 12]}, photos: {}, v: 189},
    r = run(`const M = treeEaseMids(${JSON.stringify(R)}, f => (${JSON.stringify(ease)})[f] || null);
      this.r = [M, treePrior(${JSON.stringify(S)}, 5, ${JSON.stringify(own)}, 'g:A1', M['f:A']),
        treeEaseMids(${JSON.stringify(R)}, f => (${JSON.stringify(ease)})[f] || null, f => f !== 'a')];`),
    ce = C.calibOf(S).ease;
  assert.deepStrictEqual(r[0], {'f:A': 4, 'f:B': 2}, 'the family’s photos, its genera’s included; a photo with no ease left out');
  assert.ok(Math.abs(r[1].d - (0.4 - ce)) < 1e-9, 'ease 5 in a family whose mean is 4: one point below its unit');
  assert.deepStrictEqual(r[2], {'f:A': 3.5, 'f:B': 2}, 'a photo out of play (removed, Not this) left out of the mean');
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
