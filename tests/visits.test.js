// Players › Visits (Pierre, 2026-11-08, Q301-Q304; one page for every subject, 2026-11-09): admin-visits.js visitsOf (the
// visits from the Pages rows, each marked with its subjects, joined to their load row, who answered and who signed in),
// devClass (phone, tablet, computer), visitsPick (the filters, Subject among them), visitPeriods (per day or week) and
// visitKpis, on made-up rows.
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
    '\n;Object.assign(this, {VISITS, devClass, visitsOf, visitSubj, visitorSubj, visitsPick, visitPeriods, visitKpis, visitGame});',
  ctx
);
const J = x => JSON.parse(JSON.stringify(x)),
  // The vm's arrays are another realm's: compared as plain data.
  eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m),
  at = (d, h = 10, m = 0) => new Date(2026, 10, d, h, m).getTime(),
  // A page name's subject and page (core.js pageSubj: a fish page is fish.<page>).
  split = n => (n.startsWith('fish.') ? ['fish', n.slice(5)] : ['coral', n]),
  ORDER = ['coral', 'fish'],
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
    row(
      at(3, 20, 30),
      'devana',
      'aidana',
      'v2',
      {'learn.genus': [5, 140], progress: [1, 60]},
      {Porites: [1, 40, 'progress', 0], Acropora: [4, 100, 'quiz', 1]}
    ),
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
    {t: at(5, 14) + 500, dev: 'devkai', w: 1440, st: 0, p0: 'identify.key'},
    {t: at(6, 15) - 60e3, dev: 'devipad', w: 820, st: 1, p0: 'home'},
    {t: at(1, 15), dev: 'devipad', w: 820, st: 1, p0: 'home'}, // another day: no visit of its own here
    {t: at(4, 11) - 3 * 3600e3, dev: 'devanon', w: 384, st: 0, p0: 'home'} // hours before: not this visit's
  ];
const V = ctx.visitsOf(ROWS, {split, order: ORDER, answered, named, loads: LOADS, sheets: 'coral'}),
  by = Object.fromEntries(V.map(v => [v.k.split('|')[1], v]));

test('visitsOf: one visit per visitor and visit id, every subject, its parts added up, newest first', () => {
  eq(
    V.map(v => v.k),
    ['aidnew3|v8', 'aidnew2|v7', 'dev:devx|v6', 'aidnew|v5', 'aidkai|v4', 'aidanon|v3', 'aidana|v2', 'aidana|v1'],
    'the Fish-only visit v7 is listed too, once'
  );
  const v2 = by.v2;
  eq(J(v2.P), {home: [1, 5], 'learn.genus': [7, 240], progress: [1, 60]});
  // Each summary says how it reached a sheet: the parts' counts are kept per source (Codex review #777).
  eq(J(v2.G), {Acropora: [6, 200, {learn: 2, quiz: 4}], Porites: [1, 40, {progress: 1}]});
  assert.strictEqual(v2.s, 305);
  assert.strictEqual(v2.t, at(3, 20), 'its time: its first part');
  assert.strictEqual(v2.last, at(3, 20, 30));
  assert.strictEqual(by['v6'].who, 'dev:devx', 'no id (a wrong code): counted by its device');
});

test('visitsOf: each visit marked with the subjects it opened (Corals, Fish, both), counted once', () => {
  eq(
    V.map(v => [v.k.split('|')[1], v.subj]),
    [
      ['v8', ['coral', 'fish']],
      ['v7', ['fish']],
      ['v6', ['coral']],
      ['v5', ['coral']],
      ['v4', ['coral']],
      ['v3', ['coral']],
      ['v2', ['coral']],
      ['v1', ['coral']]
    ]
  );
  // The visit in both: every page, each under its logged name; its time the sum; and as each subject sees it.
  eq(J(by.v8.P), {home: [1, 10], 'fish.practice.quiz': [1, 200]});
  assert.strictEqual(by.v8.s, 210);
  eq(J(by.v8.on), {
    coral: {P: {home: [1, 10]}, G: {}, s: 10, game: false},
    fish: {P: {'fish.practice.quiz': [1, 200]}, G: {}, s: 200, game: true}
  });
  // The genus sheets are the corals' (data.json's genera): on their side only.
  eq(J(by.v2.on.coral.G), J(by.v2.G));
  // The order given wins over the order met; a name split leaves out is not counted.
  const W = ctx.visitsOf([row(at(9), 'devo', 'aido', 'o1', {'fish.home': [1, 5], home: [1, 5], junk: [1, 99]})], {
    split: n => (n === 'junk' ? null : split(n)),
    order: ORDER
  });
  eq(W[0].subj, ['coral', 'fish']);
  assert.strictEqual(W[0].s, 10);
});

test('visitsOf: a game is a Practice page of any subject; who answered, who signed in', () => {
  eq(
    V.map(v => [v.k, v.game, v.kind, v.signed, v.name]),
    [
      ['aidnew3|v8', true, 'never', false, ''], // its quiz was the fish one: a game all the same
      ['aidnew2|v7', true, 'never', false, ''],
      ['dev:devx|v6', false, 'never', false, ''],
      ['aidnew|v5', false, 'never', false, ''],
      ['aidkai|v4', false, 'never', true, 'Kai'], // the Lab is no game; signed in, never answered
      ['aidanon|v3', false, 'anon', false, ''],
      ['aidana|v2', false, 'in', true, 'Ana'],
      ['aidana|v1', true, 'in', true, 'Ana']
    ]
  );
});

test('visitsOf: the load row of the visit gives its first page and installed; the device its class', () => {
  eq(
    V.map(v => [v.k.split('|')[1], v.p0, v.inst, v.cls]),
    [
      ['v8', null, null, 'phone'],
      ['v7', null, null, 'phone'],
      ['v6', null, null, 'phone'],
      ['v5', 'home', 1, 'tablet'],
      ['v4', 'identify.key', 0, 'computer'],
      ['v3', null, 0, 'phone'], // the device's only load row is from hours before: not joined, the device's habit
      ['v2', 'learn.genus', 0, 'phone'],
      ['v1', 'home', 1, 'phone']
    ]
  );
});

test('visitSubj: one subject, its visits only, each as it sees it, still marked with every subject', () => {
  const F = ctx.visitSubj(V, 'fish');
  eq(
    F.map(v => [v.k, v.game, J(v.P), v.s, v.subj]),
    [
      ['aidnew3|v8', true, {'fish.practice.quiz': [1, 200]}, 200, ['coral', 'fish']],
      ['aidnew2|v7', true, {'fish.home': [1, 10], 'fish.practice.quiz': [1, 200]}, 210, ['fish']]
    ]
  );
  assert.ok(
    F.every(v => !Object.keys(v.G).length),
    'no genus sheets on the Fish side'
  );
  const C = ctx.visitSubj(V, 'coral');
  eq(
    C.map(v => v.k.split('|')[1]),
    ['v8', 'v6', 'v5', 'v4', 'v3', 'v2', 'v1']
  );
  eq(J(C[0].P), {home: [1, 10]});
  assert.strictEqual(C[0].game, false, "on the corals' side the fish quiz is no game of theirs");
  eq(J(C.find(v => v.k === 'aidana|v2').G), J(by.v2.G), "the genus sheets on the corals' side");
  assert.strictEqual(ctx.visitSubj(V, 'all'), V, 'All: every visit as it is');
  assert.strictEqual(by.v8.P.home[0], 1, 'the visits themselves untouched');
  assert.ok(by.v8.game);
});

test('visitsPick: subject (all by default), period, visits without a game (Q303) or all, who, device', () => {
  const now = at(8, 12),
    P = f => ctx.visitsPick(V, {subj: 'all', per: '30', vis: 'nogame', who: 'all', dev: 'all', ...f}, now),
    ks = L => L.map(v => v.k.split('|')[1]);
  eq(ks(P({}).rows), ['v6', 'v5', 'v4', 'v3', 'v2']);
  eq(ks(P({}).all), ['v8', 'v7', 'v6', 'v5', 'v4', 'v3', 'v2', 'v1']);
  eq(ks(P({subj: undefined}).all), ks(P({}).all), 'no subject given: every subject');
  eq(ks(P({vis: 'all'}).rows), ['v8', 'v7', 'v6', 'v5', 'v4', 'v3', 'v2', 'v1']);
  // One subject: its visits, a game of its own or not (v8's fish quiz is no coral game).
  eq(ks(P({subj: 'coral'}).rows), ['v8', 'v6', 'v5', 'v4', 'v3', 'v2']);
  eq(ks(P({subj: 'coral'}).all), ['v8', 'v6', 'v5', 'v4', 'v3', 'v2', 'v1']);
  eq(ks(P({subj: 'fish'}).rows), []);
  eq(ks(P({subj: 'fish', vis: 'all'}).rows), ['v8', 'v7']);
  assert.strictEqual(P({subj: 'fish', per: 'all'}).since, at(7, 9), "All: from the subject's first visit");
  eq(ks(P({subj: 'fish', vis: 'all', who: 'never', dev: 'phone'}).rows), ['v8', 'v7'], 'with the other filters');
  eq(ks(P({per: '3', vis: 'all'}).rows), ['v8', 'v7', 'v6', 'v5', 'v4'], 'the last 3 days: from 5 November 12:00');
  assert.strictEqual(P({per: '3'}).since, now - 3 * 864e5);
  assert.strictEqual(P({per: 'all'}).since, at(2, 9), 'All: from the first visit');
  eq(ks(P({who: 'in', vis: 'all'}).rows), ['v2', 'v1']);
  eq(ks(P({who: 'anon'}).rows), ['v3']);
  eq(ks(P({who: 'never'}).rows), ['v6', 'v5', 'v4']);
  eq(ks(P({dev: 'tablet'}).rows), ['v5']);
  eq(ks(P({dev: 'computer'}).rows), ['v4']);
  eq(ks(P({dev: 'phone'}).rows), ['v6', 'v3', 'v2']);
});

test('visitKpis: visits of how many, visitors, never answered, median visit, on a phone', () => {
  const P = ctx.visitsPick(V, {per: '30', vis: 'nogame', who: 'all', dev: 'all'}, at(8, 12));
  eq(J(ctx.visitKpis(P)), {n: 5, of: 8, visitors: 5, never: 3, med: 300, phone: 3});
  // On the corals alone, the visit in both counts with its coral pages (Home, 10 s), no game of theirs.
  const C = ctx.visitsPick(V, {subj: 'coral', per: '30', vis: 'nogame', who: 'all', dev: 'all'}, at(8, 12));
  eq(J(ctx.visitKpis(C)), {n: 6, of: 7, visitors: 6, never: 4, med: 300, phone: 4});
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
      ['2026-11-07', 1, 1, 2, 1], // v6, and v7 on the Fish side with its quiz
      ['2026-11-08', 0, 1, 1, 0] // v8: its fish quiz is a game
    ]
  );
  const W = ctx.visitPeriods(P.all, P.since, now, 'week');
  // Monday 2 to Sunday 8 November: one week.
  eq(
    W.map(b => [b.k, b.ng, b.g, b.who.size]),
    [['2026-11-02', 5, 3, 7]]
  );
  eq(
    ctx.visitPeriods(P.all, P.since, at(10, 12), 'week').map(b => b.k),
    ['2026-11-02', '2026-11-09'],
    'the week from Monday 9 November, empty'
  );
  assert.strictEqual(ctx.visitPeriods([], at(1), at(1) + 100 * 864e5, 'day').length, ctx.VISITS.MAX, 'the last periods only');
});

// Codex review #777: a visit left at 10:10 and a new one opened 30 s later on the same device; the second one's load row
// (10:10:30) is never the first one's, whose own load row came at 10:03 (sync.js sends the load row before the summary).
test("visitsOf: a load row sent after a visit's first summary is the next visit's", () => {
  const R = [
      row(at(9, 10, 10), 'devq', 'aidq', 'w1', {home: [1, 60], 'identify.key': [1, 360]}),
      row(at(9, 10, 20), 'devq', 'aidq', 'w2', {'learn.genera': [1, 500]})
    ],
    L = [
      {t: at(9, 10, 3), dev: 'devq', w: 390, st: 0, p0: 'home'},
      {t: at(9, 10, 10) + 30e3, dev: 'devq', w: 390, st: 1, p0: 'learn.genera'}
    ],
    W = ctx.visitsOf(R, {split, loads: L});
  eq(
    W.map(v => [v.k, v.p0, v.inst]),
    [
      ['aidq|w2', 'learn.genera', 1],
      ['aidq|w1', 'home', 0]
    ]
  );
});

// Codex review #836: a visitor's Journey link names its subject: the one filtered, else the one of most of their time.
test("visitorSubj: the visitor's Journey on the subject filtered, else the subject they spent most time on", () => {
  const {visitorSubj} = ctx;
  assert.strictEqual(visitorSubj([by.v7], 'all', ORDER), 'fish', 'a fish-only visitor: their fish Journey');
  assert.strictEqual(visitorSubj([by.v8], 'all', ORDER), 'fish', 'in both: 200 s of fish, 10 s of corals');
  assert.strictEqual(visitorSubj([by.v1, by.v2], 'all', ORDER), 'coral');
  assert.strictEqual(visitorSubj([by.v8], 'coral', ORDER), 'coral', 'the subject filtered wins');
  assert.strictEqual(visitorSubj([by.v1], 'fish', ORDER), 'fish');
  const tie = ctx.visitsOf([row(at(9), 'devt', 'aidt', 't1', {'fish.home': [1, 5], home: [1, 5]})], {split, order: ORDER});
  assert.strictEqual(visitorSubj(tie, 'all', ORDER), 'coral', 'a tie: the first subject');
  assert.strictEqual(visitorSubj([], 'all', ORDER), 'coral', 'no visit: the first subject');
});
