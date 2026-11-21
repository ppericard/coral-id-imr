require('./slot.js').testGuard();
// When the page gives R2 up (app.js r2Failed, docs/decisions/2026-11-21-r2-given-up-after-three.md; REE-200). With no
// service worker, one R2 file that still failed after its retry used to set AWAY for the whole visit (app.js r2Out), so
// every later photo came from its online original (FishBase for most fish). Now that photo falls back alone, and R2 is
// given up only once R2_OUT different photos failed in a row, no photo loaded from R2 in between. app.js's own block runs
// here in Node, core.js's real photo helpers around it.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');
const C = require('../core.js');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const rule = cut(app, '// When R2 is given up (docs/decisions/', "\ndocument.addEventListener('error'", {file: 'app.js'});

const page = (base = C.PHOTO_BASE) => {
  const ctx = vm.createContext({...C, crops: 0});
  vm.runInContext(
    `let R2 = !!${JSON.stringify(base)}, AWAY = !${JSON.stringify(base)};\nconst cropWatch = () => crops++;\n` +
      rule +
      '\nthis.T = {R2_OUT, r2Failed, r2Loaded, r2Missed, state: () => ({R2, AWAY})};',
    ctx
  );
  return {...ctx.T, crops: () => ctx.crops};
};
const R = C.PHOTO_BASE,
  on = {R2: true, AWAY: false},
  off = {R2: false, AWAY: true};

test('one photo that fails on R2 leaves R2 on; R2_OUT different photos in a row give it up', () => {
  const T = page();
  assert.ok(R && T.R2_OUT >= 2, `PHOTO_BASE ${R}, R2_OUT ${T.R2_OUT}`);
  T.r2Failed(`${R}img/a-s.webp?c=0_0_1_1`);
  assert.deepStrictEqual({...T.state()}, on, 'one failure');
  for (let k = 1; k < T.R2_OUT - 1; k++) T.r2Failed(`${R}img/p${k}-s.webp`);
  assert.deepStrictEqual({...T.state()}, on, `${T.R2_OUT - 1} photos in a row`);
  T.r2Failed(`${R}img/last-m.webp`);
  assert.deepStrictEqual({...T.state()}, off, `${T.R2_OUT} photos in a row`);
  assert.strictEqual(T.crops(), 1, 'the crops drawn from then on (cropWatch)');
});

test('one photo counts once: its sizes, its Find the X tile, its preload then its element', () => {
  const T = page();
  for (const u of [
    `${R}img/a-s.webp`, // the preload (quiz.js pump)
    `${R}img/a-s.webp`, // then its element (app.js away)
    `${R}img/a-m.webp?c=0.1_0_1_1`, // another size (qsrc)
    `${R}img/a-x.webp?x=1_2_3`, // its tile (app.js tileSrc)
    `${R}img/a.webp`,
    `${R}img/b-s.webp`
  ])
    T.r2Failed(u);
  assert.deepStrictEqual({...T.state()}, on, 'two photos only');
  // Each file that failed so is known (not asked from R2 once more), the query left aside; the others are not.
  assert.deepStrictEqual(
    [`${R}img/a-s.webp?c=1`, `${R}img/a-x.webp?x=1_2_3`, `${R}img/c-s.webp`, 'img/a-s.webp', `${R}img/a-t.webp`].map(T.r2Missed),
    [true, true, false, false, false]
  );
});

test('a photo loaded from R2 in between starts the run again; a load from elsewhere does not', () => {
  let k = 0;
  const T = page(),
    run = n => Array.from({length: n}, () => T.r2Failed(`${R}img/r${k++}-s.webp`));
  run(T.R2_OUT - 1);
  T.r2Loaded(`${R}img/ok-s.webp`);
  run(T.R2_OUT - 1);
  assert.deepStrictEqual({...T.state()}, on, 'R2 answered in between');
  // An online original or the site's file is no news of R2.
  T.r2Loaded('https://inaturalist-open-data.s3.amazonaws.com/photos/1/medium.jpg');
  T.r2Loaded('img/ok-s.webp');
  run(1);
  assert.deepStrictEqual({...T.state()}, off, 'a load elsewhere left the run going');
});

test('only an R2 address counts, and R2 switched off (PHOTO_BASE empty) is AWAY from the start', () => {
  const T = page();
  for (let k = 0; k < 5; k++) {
    T.r2Failed(`img/site${k}-s.webp`);
    T.r2Failed(`https://inaturalist-open-data.s3.amazonaws.com/photos/${k}/medium.jpg`);
    T.r2Failed(`https://example.org/${R}img/x${k}-s.webp`);
  }
  assert.deepStrictEqual({...T.state()}, on, 'no R2 address failed');
  const S = page('');
  assert.deepStrictEqual({...S.state()}, off);
});
