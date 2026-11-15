// Photo review › By difficulty on the fish side (fish admin at parity): the fish photos ranked by their answers alone
// (admin.js diffByAnswers over photoAnswers, as fish Health counts them), since the sheet rates the corals' photos only;
// the page among the fish admin's pages, after the fish review views.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// The ranking and the counting it reads, run from admin.js.
const run = code => {
  const src = read('admin.js'),
    ctx = {};
  vm.runInNewContext(
    [
      block(src, 'function photoAnswers(R, known) {', '\n}\n', {file: 'admin.js', through: true}),
      block(src, 'function diffByAnswers(PH, min, order) {', '\n}\n', {file: 'admin.js', through: true}),
      code
    ].join('\n'),
    ctx
  );
  return JSON.parse(JSON.stringify(ctx.r));
};

test('diffByAnswers: the lowest share right first (Hardest), the highest first (Easiest), more answers first on a tie', () => {
  const PH = {a: {n: 4, ok: 1}, b: {n: 2, ok: 0}, c: {n: 6, ok: 0}, d: {n: 3, ok: 3}, e: {n: 1, ok: 1}, f: {n: 2, ok: 2}};
  const r = run(`this.r = [
    diffByAnswers(${JSON.stringify(PH)}, 1, 'hard').map(o => o.f),
    diffByAnswers(${JSON.stringify(PH)}, 1, 'easy').map(o => o.f),
    diffByAnswers(${JSON.stringify(PH)}, 3, 'hard').map(o => [o.f, o.n, o.ok, o.r]),
    diffByAnswers(null, 1, 'hard')
  ];`);
  assert.deepStrictEqual(r[0], ['c', 'b', 'a', 'd', 'f', 'e'], '0% with 6 answers before 0% with 2');
  assert.deepStrictEqual(r[1], ['d', 'f', 'e', 'a', 'c', 'b'], '100% with 3 answers first');
  assert.deepStrictEqual(
    r[2],
    [
      ['c', 6, 0, 0],
      ['a', 4, 1, 0.25],
      ['d', 3, 3, 1]
    ],
    'at least 3 answers'
  );
  assert.deepStrictEqual(r[3], []);
});

test('By difficulty counts as Health does: every answer that showed the photo, once each, the known photos only', () => {
  // rows [player, time, unit, answered, right, mode, photos]: a family question and a genus question showing p1
  const R = [
    ['a', 1, 'f:Pomacentridae', 'f:Labridae', 0, 'quiz', 'p1 p2'],
    ['b', 2, 'g:Chromis', 'g:Chromis', 1, 'quiz', 'p1'],
    ['b', 3, 'f:Pomacentridae', 'f:Pomacentridae', 1, 'quiz', 'p1 p1 x9']
  ];
  const r = run(`this.r = diffByAnswers(photoAnswers(${JSON.stringify(R)}, f => f !== 'x9'), 1, 'hard');`);
  assert.deepStrictEqual(
    r.map(o => [o.f, o.n, o.ok]),
    [
      ['p2', 1, 0],
      ['p1', 3, 2]
    ]
  );
});

test('the fish admin has By difficulty; the fish Photo review still opens on Ease (its views first)', () => {
  const fish = C.subjectOf('fish').admin.pages;
  assert.ok(fish.includes('photos/review/by-difficulty'));
  const src = read('admin.js'),
    order = ["['quality', 'Quality']", "['growth-form', 'Growth form']", "['ease', 'Ease'", "['by-difficulty', 'By difficulty']"].map(x =>
      src.indexOf(x)
    );
  assert.ok(order.every(i => i > 0) && order.every((i, k) => !k || i > order[k - 1]), JSON.stringify(order));
  // the fish side's own page and help, the corals' left as they were
  assert.match(src, /'photos\/review\/by-difficulty'\) return ASUBJ\.sheets \? renderFishDiff\(\) : renderDiff\(\)/);
  assert.match(src, /'photos\/review\/by-difficulty': ASUBJ\.sheets \? 'fishdiff' : 'diff'/);
});
