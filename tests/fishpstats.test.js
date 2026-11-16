require('./slot.js').testGuard();
// Photo stats › Overview on the fish side (fish admin at parity): one page for every subject (admin.js renderPstats,
// pstatsHtml), each subject's numbers in one shape (pstatsCoral, pstatsFish); the fish answers per photo from the answer
// log alone, as By difficulty and Health count them, a photo under its candidate id and its game id counted once
// (answersBy over photoAnswers, by core.js fishPid); the page among the fish admin's pages, its Difficulty not.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const run = code => {
  const src = read('admin.js'),
    ctx = {fishPid: C.fishPid};
  vm.runInNewContext(
    [
      block(src, 'function photoAnswers(R, known) {', '\n}\n', {file: 'admin.js', through: true}),
      block(src, 'function answersBy(PH, key) {', '\n}\n', {file: 'admin.js', through: true}),
      block(src, 'const PSTATS_BANDS = [', '.length]);\n', {file: 'admin.js', through: true}),
      code
    ].join('\n'),
    ctx
  );
  return JSON.parse(JSON.stringify(ctx.r));
};

test('answersBy: a fish photo answered under its candidate id and its game id is one photo, its players merged', () => {
  // rows [player, time, unit, answered, right, mode, photos]
  const R = [
    ['a', 1, 'f:Damselfishes', 'f:Damselfishes', 1, 'quiz', 'fi123'],
    ['b', 2, 'f:Damselfishes', 'f:Wrasses', 0, 'quiz', 'fish-s084-cand-123'],
    ['a', 3, 'g:Chromis', 'g:Chromis', 0, 'quiz', 'fish-s084-cand-123 fi9'],
    ['c', 4, 'f:Wrasses', 'f:Wrasses', 1, 'quiz', 'fbNevio_u0']
  ];
  const r = run(`this.r = answersBy(photoAnswers(${JSON.stringify(R)}), fishPid);`);
  assert.deepStrictEqual(Object.keys(r).sort(), ['bNevio_u0', 'i123', 'i9']);
  assert.deepStrictEqual(r.i123, {n: 3, ok: 1, by: {a: [2, 1], b: [1, 0]}});
  assert.deepStrictEqual(r.i9, {n: 1, ok: 0, by: {a: [1, 0]}});
  assert.deepStrictEqual(r.bNevio_u0, {n: 1, ok: 1, by: {c: [1, 1]}});
  assert.deepStrictEqual(run('this.r = answersBy(null, fishPid);'), {});
});

test('pstatsBands: every photo in one band of answers, none included', () => {
  const r = run('this.r = pstatsBands([0, 0, 1, 2, 3, 9, 10, 29, 30, 120]);');
  assert.deepStrictEqual(r, [
    ['None', 2],
    ['1–2', 2],
    ['3–9', 2],
    ['10–29', 2],
    ['30+', 2]
  ]);
});

test('the fish admin has Photo stats › Overview, drawn by the one page renderer in its own words; not Difficulty', () => {
  const fish = C.subjectOf('fish');
  assert.ok(fish.admin.pages.includes('photos/stats/overview'));
  assert.ok(!fish.admin.pages.some(p => p.startsWith('photos/stats/') && p !== 'photos/stats/overview'));
  // its words come from its data: unit names, observations, origins, circles
  assert.ok(fish.one && fish.many && fish.admin.obs && fish.admin.origins.length && fish.structure.circle.of.length);
  const src = read('admin.js');
  assert.match(src, /M = S\.sheets \? pstatsFish\(S, here\) : pstatsCoral\(here\);\n {2}if \(M\) \$v\.innerHTML = pstatsHtml\(M\);/);
  assert.match(src, /'photos\/stats\/overview': ASUBJ\.sheets \? 'fishpstats' : 'pstats'/);
  // the fish page's cards name no coral word and no photo difficulty
  const fn = block(src, 'function pstatsFish(S, here) {', '\n}\n', {file: 'admin.js', through: true});
  assert.doesNotMatch(fn, /genusHref|recBadge|STATS\[|#photos\/stats\/difficulty/);
});
