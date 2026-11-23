require('./slot.js').testGuard();
// Page activity counts as activity in the admin (REE-237; Pierre, 2026-11-23 16:33 Manila: «Définitivement»): admin.js
// useOf (one player's page summaries: last visit, visits, days, time on screen, pages), useBy (per id), useWords (a
// page name in words) and activeAt (the last activity: an answer, or a visit when later), on made-up summaries.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block');
const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8'),
  ctx = {};
vm.runInNewContext(
  block(src, '// lastuse: begin', '// lastuse: end', {file: 'admin.js'}) + '\n;Object.assign(this, {useWords, useOf, useBy, activeAt});',
  ctx
);
const J = x => JSON.parse(JSON.stringify(x)),
  eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m),
  at = (d, h = 10, m = 0) => new Date(2026, 10, d, h, m).getTime(),
  row = (t, id, vi, r) => ({t, id, vi, r, g: {}});

test('useWords: a page name in words, the Key named "Identify › Key"', () => {
  const {useWords} = ctx;
  assert.strictEqual(useWords('identify.key'), 'Identify › Key');
  assert.strictEqual(useWords('home'), 'Home');
  assert.strictEqual(useWords('learn.look-alikes'), 'Learn › Look-alikes');
  assert.strictEqual(useWords('practice.quiz'), 'Practice › Quiz');
  assert.strictEqual(useWords('leaderboard.achievements'), 'Leaderboard › Achievements');
});

test('useOf: a player who only used the Key is active, with the last visit, the time and the pages', () => {
  const {useOf} = ctx,
    s = useOf([
      row(at(3, 9), 'p1', 'v1', {home: [1, 20], 'identify.key': [2, 400]}),
      // the same visit, sent again after the app was left and opened (one visit id, two rows)
      row(at(3, 10), 'p1', 'v1', {'identify.key': [1, 200]}),
      row(at(5, 14), 'p1', 'v2', {home: [1, 10], 'identify.key': [1, 600], 'learn.genus': [1, 30]}),
      row(at(5, 15), 'p1', 'v3', {'identify.key': [1, 100]})
    ]);
  eq(s, {
    last: at(5, 15),
    visits: 3,
    days: 2,
    secs: 1360,
    pages: [
      {p: 'identify.key', n: 5, s: 1300},
      {p: 'home', n: 2, s: 30},
      {p: 'learn.genus', n: 1, s: 30}
    ]
  });
});

test('useOf: pages tied on time are ordered by times opened, then by name; nothing opened is no activity', () => {
  const {useOf} = ctx;
  eq(
    useOf([row(at(3), 'p1', 'v1', {b: [1, 60], a: [1, 60], c: [3, 60]})]).pages.map(o => o.p),
    ['c', 'a', 'b']
  );
  assert.strictEqual(useOf([]), null, 'no summary');
  assert.strictEqual(useOf([row(at(3), 'p1', 'v1', {})]), null, 'a summary with no page');
  assert.strictEqual(useOf([row(at(3), 'p1', 'v1', {home: [0, 0]})]), null, 'a page still in view that counted nothing');
  eq(useOf([row(at(3), 'p1', 'v1', {home: [0, 0]}), row(at(4), 'p1', 'v2', {home: [1, 5]})]).visits, 1, 'only the visit with activity');
});

test('useOf: a page with only seconds still counts (a page left in view)', () => {
  const s = ctx.useOf([row(at(3), 'p1', 'v1', {'identify.key': [0, 45]})]);
  eq([s.visits, s.secs, s.last], [1, 45, at(3)]);
});

test('useBy: per player id, a summary with no id (a wrong code) and a player with no activity left out', () => {
  const {useBy} = ctx,
    o = useBy([
      row(at(3), 'p1', 'v1', {'identify.key': [1, 100]}),
      row(at(4), 'p2', 'v2', {home: [1, 5]}),
      row(at(4), '', 'v3', {home: [1, 5]}),
      row(at(4), 'p3', 'v4', {})
    ]);
  eq(Object.keys(o).sort(), ['p1', 'p2']);
  assert.strictEqual(o.p1.last, at(3));
});

test('activeAt: the last answer, or the last visit when it is later', () => {
  const {activeAt} = ctx,
    seen = {last: at(5, 15)};
  eq(activeAt(at(5, 9), seen, at(1)), {at: at(5, 15), by: 'visit'}, 'a visit after the last answer');
  eq(activeAt(at(5, 18), seen, at(1)), {at: at(5, 18), by: 'answer'}, 'an answer after the last visit');
  eq(activeAt(0, seen, at(1)), {at: at(5, 15), by: 'visit'}, 'never answered: the visit');
  eq(activeAt(at(5, 15), seen, 0), {at: at(5, 15), by: 'answer'}, 'the same moment: the answer');
  eq(activeAt(at(4), null, at(1)), {at: at(4), by: 'answer'}, 'no visit');
  eq(activeAt(0, null, at(1)), {at: at(1), by: 'answer'}, 'nothing: the list own time, as before');
  eq(activeAt(0, undefined, undefined), {at: 0, by: 'answer'}, 'nothing known');
});
