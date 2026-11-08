// Players › Visits (Pierre, 2026-11-08, Q301-Q304): admin-visits.js visitsOf (the visits of one subject from the Pages
// rows, joined to their load row, who answered and who signed in), devClass (phone, tablet, computer), visitsPick (the
// filters), visitPeriods (per day or week) and visitKpis, on made-up rows.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block');
const src = fs.readFileSync(path.join(__dirname, '..', 'admin-visits.js'), 'utf8'),
  ctx = {};
vm.runInNewContext(
  block(src, '// visits: begin', '// visits: end', {file: 'admin-visits.js'}) +
    '\n;Object.assign(this, {VISITS, devClass, visitsOf, visitsPick, visitPeriods, visitKpis, visitGame});',
  ctx
);
const J = x => JSON.parse(JSON.stringify(x)),
  // The vm's arrays are another realm's: compared as plain data.
  eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m),
  at = (d, h = 10, m = 0) => new Date(2026, 10, d, h, m).getTime(),
  // The page names of the corals' side (core.js pageSubj: a fish page is fish.<page>).
  coral = n => (n.startsWith('fish.') ? null : n),
  fish = n => (n.startsWith('fish.') ? n.slice(5) : null),
  row = (t, dev, id, vi, r, g = {}, ua = 'Chrome 140 mobile') => ({t, dev, id, vi, r, g, ua});

test('devClass: a phone by its browser, a tablet by its window width (Q304), a computer otherwise', () => {
  const {devClass} = ctx;
  assert.strictEqual(devClass('Chrome 140 mobile', [390, 412]), 'phone');
  assert.strictEqual(devClass('Chrome 140 mobile', []), 'phone', 'no width known: its browser');
  assert.strictEqual(devClass('Chrome 140 mobile', [800, 1280]), 'tablet', 'a mobile browser 600 px wide or more');
  assert.strictEqual(devClass('Chrome 140 mobile', [390, 390, 850]), 'phone', 'held sideways once: the median width');
  assert.strictEqual(devClass('Safari 18', [820]), 'tablet', "an iPad's Safari says it is a Mac");
  assert.strictEqual(devClass('Chrome 140', [1440]), 'computer');
  assert.strictEqual(devClass('Chrome 140', [1024]), 'computer');
  assert.strictEqual(devClass('Chrome 140', [500]), 'computer', 'a narrow computer window');
  assert.strictEqual(devClass('Firefox 144', []), 'computer');
  assert.strictEqual(devClass('', null), 'computer');
});

test('visitGame: the Practice pages only (Q302), never the Lab', () => {
  for (const p of ['practice.quiz', 'practice.custom', 'practice.duels', 'practice.memory']) assert.ok(ctx.visitGame(p), p);
  for (const p of ['tools', 'tools.anatomy', 'learn.genus', 'identify.key', 'progress', 'home']) assert.ok(!ctx.visitGame(p), p);
});

// Ana (signed in, answered) plays the quiz in one visit and reads a sheet in another, sent in two parts; a device not
// signed in that answered opens the Key; Kai (signed in, never answered) and a device never answered browse; one
// summary has no id (a wrong code); one visit is on the Fish side only, one in both.
const named = new Map([
    ['aidana', 'Ana'],
    ['aidkai', 'Kai']
  ]),
  answered = new Set(['aidana', 'aidanon']),
  ROWS = [
    row(at(2, 9), 'devana', 'aidana', 'v1', {home: [1, 10], 'practice.quiz': [1, 600]}),
    row(at(3, 20), 'devana', 'aidana', 'v2', {home: [1, 5], 'learn.genus': [2, 100]}, {Acropora: [2, 100, 'learn', 1]}),
    row(at(3, 20, 30), 'devana', 'aidana', 'v2', {'learn.genus': [1, 40], progress: [1, 60]}, {Porites: [1, 40, 'progress', 0]}),
    row(at(4, 11), 'devanon', 'aidanon', 'v3', {'identify.key': [1, 300]}, {}, 'Samsung 27 mobile'),
    row(at(5, 14), 'devkai', 'aidkai', 'v4', {'identify.key': [2, 900], 'tools.anatomy': [1, 120]}, {}, 'Chrome 140'),
    row(at(6, 15), 'devipad', 'aidnew', 'v5', {home: [1, 20], 'learn.genera': [1, 60]}, {}, 'Safari 18'),
    row(at(7, 8), 'devx', '', 'v6', {home: [1, 3]}),
    row(at(7, 9), 'devfish', 'aidnew2', 'v7', {'fish.home': [1, 10], 'fish.practice.quiz': [1, 200]}),
    row(at(8, 9), 'devboth', 'aidnew3', 'v8', {home: [1, 10], 'fish.practice.quiz': [1, 200]})
  ],
  LOADS = [
    {t: at(2, 9) - 200e3, dev: 'devana', w: 390, st: 1, p0: 'home'},
    {t: at(3, 20) - 30e3, dev: 'devana', w: 390, st: 0, p0: 'learn.genus'},
    {t: at(5, 14) + 1000, dev: 'devkai', w: 1440, st: 0, p0: 'identify.key'},
    {t: at(6, 15) - 60e3, dev: 'devipad', w: 820, st: 1, p0: 'home'},
    {t: at(1, 15), dev: 'devipad', w: 820, st: 1, p0: 'home'}, // another day: no visit of its own here
    {t: at(4, 11) - 3 * 3600e3, dev: 'devanon', w: 384, st: 0, p0: 'home'} // hours before: not this visit's
  ];
const V = ctx.visitsOf(ROWS, {own: coral, answered, named, loads: LOADS, sheets: true}),
  by = Object.fromEntries(V.map(v => [v.k.split('|')[1], v]));

test('visitsOf: one visit per visitor and visit id, its parts added up, newest first', () => {
  eq(
    V.map(v => v.k),
    ['aidnew3|v8', 'dev:devx|v6', 'aidnew|v5', 'aidkai|v4', 'aidanon|v3', 'aidana|v2', 'aidana|v1'],
    'the Fish-only visit v7 is not on the corals side'
  );
  const v2 = by.v2;
  eq(J(v2.P), {home: [1, 5], 'learn.genus': [3, 140], progress: [1, 60]});
  eq(J(v2.G), {Acropora: [2, 100, 'learn'], Porites: [1, 40, 'progress']});
  assert.strictEqual(v2.s, 205);
  assert.strictEqual(v2.t, at(3, 20), 'its time: its first part');
  assert.strictEqual(v2.last, at(3, 20, 30));
  assert.strictEqual(by['v6'].who, 'dev:devx', 'no id (a wrong code): counted by its device');
});

test('visitsOf: a game is a Practice page of the subject; who answered, who signed in', () => {
  eq(
    V.map(v => [v.k, v.game, v.kind, v.signed, v.name]),
    [
      ['aidnew3|v8', false, 'never', false, ''], // its quiz was the fish one: on the corals side, Home only
      ['dev:devx|v6', false, 'never', false, ''],
      ['aidnew|v5', false, 'never', false, ''],
      ['aidkai|v4', false, 'never', true, 'Kai'], // the Lab is no game; signed in, never answered
      ['aidanon|v3', false, 'anon', false, ''],
      ['aidana|v2', false, 'in', true, 'Ana'],
      ['aidana|v1', true, 'in', true, 'Ana']
    ]
  );
  eq(J(by.v8.P), {home: [1, 10]});
});

test('visitsOf: the load row of the visit gives its first page and installed; the device its class', () => {
  eq(
    V.map(v => [v.k.split('|')[1], v.p0, v.inst, v.cls]),
    [
      ['v8', null, null, 'phone'],
      ['v6', null, null, 'phone'],
      ['v5', 'home', 1, 'tablet'],
      ['v4', 'identify.key', 0, 'computer'],
      ['v3', null, 0, 'phone'], // the device's only load row is from hours before: not joined, the device's habit
      ['v2', 'learn.genus', 0, 'phone'],
      ['v1', 'home', 1, 'phone']
    ]
  );
});

test('visitsOf: the Fish side has its own pages, in its words; no genus sheets when they are not its', () => {
  const F = ctx.visitsOf(ROWS, {own: fish, answered, named, loads: LOADS, sheets: false});
  eq(
    F.map(v => [v.k, v.game, J(v.P)]),
    [
      ['aidnew3|v8', true, {'practice.quiz': [1, 200]}],
      ['aidnew2|v7', true, {home: [1, 10], 'practice.quiz': [1, 200]}]
    ]
  );
  const C = ctx.visitsOf(ROWS, {own: coral, answered, named, loads: LOADS, sheets: false});
  assert.ok(C.every(v => !Object.keys(v.G).length));
});

test('visitsPick: period, visits without a game (Q303) or all, who, device', () => {
  const now = at(8, 12),
    P = f => ctx.visitsPick(V, {per: '30', vis: 'nogame', who: 'all', dev: 'all', ...f}, now),
    ks = L => L.map(v => v.k.split('|')[1]);
  eq(ks(P({}).rows), ['v8', 'v6', 'v5', 'v4', 'v3', 'v2']);
  eq(ks(P({}).all), ['v8', 'v6', 'v5', 'v4', 'v3', 'v2', 'v1']);
  eq(ks(P({vis: 'all'}).rows), ['v8', 'v6', 'v5', 'v4', 'v3', 'v2', 'v1']);
  eq(ks(P({per: '3'}).rows), ['v8', 'v6', 'v5', 'v4'], 'the last 3 days: from 5 November 12:00');
  assert.strictEqual(P({per: '3'}).since, now - 3 * 864e5);
  assert.strictEqual(P({per: 'all'}).since, at(2, 9), 'All: from the first visit');
  eq(ks(P({who: 'in', vis: 'all'}).rows), ['v2', 'v1']);
  eq(ks(P({who: 'anon'}).rows), ['v3']);
  eq(ks(P({who: 'never'}).rows), ['v8', 'v6', 'v5', 'v4']);
  eq(ks(P({dev: 'tablet'}).rows), ['v5']);
  eq(ks(P({dev: 'computer'}).rows), ['v4']);
  eq(ks(P({dev: 'phone'}).rows), ['v8', 'v6', 'v3', 'v2']);
});

test('visitKpis: visits of how many, visitors, never answered, median visit, on a phone', () => {
  const P = ctx.visitsPick(V, {per: '30', vis: 'nogame', who: 'all', dev: 'all'}, at(8, 12));
  eq(J(ctx.visitKpis(P)), {n: 6, of: 7, visitors: 6, never: 4, med: 205, phone: 4});
});

test('visitPeriods: per day or week (from Monday), gaps filled, with and without a game, visitors', () => {
  const now = at(8, 12),
    P = ctx.visitsPick(V, {per: 'all', vis: 'all', who: 'all', dev: 'all'}, now),
    D = ctx.visitPeriods(P.all, P.since, now, 'day');
  eq(
    D.map(b => [b.k, b.ng, b.g, b.who.size, b.whoNg.size]),
    [
      ['2026-11-02', 0, 1, 1, 0],
      ['2026-11-03', 1, 0, 1, 1],
      ['2026-11-04', 1, 0, 1, 1],
      ['2026-11-05', 1, 0, 1, 1],
      ['2026-11-06', 1, 0, 1, 1],
      ['2026-11-07', 1, 0, 1, 1],
      ['2026-11-08', 1, 0, 1, 1]
    ]
  );
  const W = ctx.visitPeriods(P.all, P.since, now, 'week');
  // Monday 2 to Sunday 8 November: one week.
  eq(
    W.map(b => [b.k, b.ng, b.g, b.who.size]),
    [['2026-11-02', 6, 1, 6]]
  );
  eq(
    ctx.visitPeriods(P.all, P.since, at(10, 12), 'week').map(b => b.k),
    ['2026-11-02', '2026-11-09'],
    'the week from Monday 9 November, empty'
  );
  assert.strictEqual(ctx.visitPeriods([], at(1), at(1) + 100 * 864e5, 'day').length, ctx.VISITS.MAX, 'the last periods only');
});
