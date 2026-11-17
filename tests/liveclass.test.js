require('./slot.js').testGuard();
// The live mode (sheet vNEXT; Pierre, 2026-11-17, Q393; docs/reviews/2026-11-18-live-mode-design.md): Code.gs lv_ on the
// in-memory sheet (rule D1): the trainer check (d) by the script's roles, never the page; the session's state machine;
// the scoring (b): a right answer plus a speed bonus, timed from the moment the question reached that student; what a
// student is sent (never the right answer before the reveal); the session in the cache only, never a sheet tab; and the
// app's own module (live.js) for its gate (rule D4) and its pure helpers.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const {loadCodeGs} = require('./gas.js');

const ROOT = path.join(__dirname, '..');
const TOK = 'ghp_write000000000000000000';
const IMR = 'instance:imr';
const run = (s, js) => vm.runInContext(js, s.ctx);
const copy = o => JSON.parse(JSON.stringify(o));
const save = (s, name, pin = '1234') => s.post({name, pin, data: {}, summary: {}, answers: []});
const grant = (s, account, role) => s.post({roleGrant: {account, role, scope: IMR}, token: TOK});
// A question as the trainer's page sends it (live.js liveBuild): photos, four choices, the right one's index.
const Q = (k = 1, f = 'acropora-1') => ({
  ph: [{f, u: `img/${f}-m.webp`, v: 'wide'}],
  ch: [
    ['Montipora', 'Montipora'],
    ['Acropora', 'Acropora'],
    ['Porites', 'Porites'],
    ['Pocillopora', 'Pocillopora']
  ],
  k
});
// A sheet with a trainer (Tess, the trainer role), a player with no role (Pat), and the clock under the test's hand.
function setup() {
  const s = loadCodeGs();
  let now = Date.UTC(2026, 10, 18, 2, 0, 0);
  run(s, 'Date.now = () => globalThis.__now();');
  s.ctx.__now = () => now;
  s.tick = ms => (now += ms);
  save(s, 'Tess');
  save(s, 'Pat');
  assert.strictEqual(grant(s, 'Tess', 'trainer').ok, true);
  s.lv = (step, o = {}) => copy(s.post({lv: step, ...o}));
  return s;
}
const start = (s, o = {}) => s.lv('start', {lname: 'Tess', lpin: '1234', s: 'coral', t: 'Group 1', n: 3, lim: 20, ...o});

test('only an account with the trainer role starts a session, checked by the script with its code', () => {
  const s = setup();
  // No role: refused, and one Audit row for the refusal (ids only).
  assert.deepStrictEqual(start(s, {lname: 'Pat'}), {ok: false, error: 'role', v: run(s, 'VERSION')});
  // A wrong code: refused before any role is read, and it counts towards the account's lock (failed_).
  assert.strictEqual(start(s, {lpin: '9999'}).error, 'pin');
  for (let i = 0; i < 5; i++) start(s, {lpin: '9999'});
  assert.strictEqual(start(s).error, 'wait');
  run(s, `CacheService.getScriptCache().remove(failKey_('Tess'))`);
  // No such account, a malformed request, a name / pin pair (a progress save's fields) never taken as the trainer's.
  assert.strictEqual(start(s, {lname: 'Nobody'}).error, 'user');
  assert.strictEqual(s.lv('start', {name: 'Tess', pin: '1234', s: 'coral', n: 3, lim: 20}).error, 'input');
  assert.strictEqual(start(s, {n: 0}).error, 'input');
  assert.strictEqual(start(s, {lim: 500}).error, 'input');
  assert.strictEqual(start(s, {s: 'whales'}).error, 'input');
  // The trainer: a 6-digit code and a key of its own.
  const r = start(s);
  assert.strictEqual(r.ok, true);
  assert.match(r.code, /^\d{6}$/);
  assert.match(r.tk, /^[a-z0-9]{18}$/);
  // Audited: the start and the refusal, by anonymous id, never a name.
  const A = s.sheets.Audit.rows.slice(1).map(x => [x[2], x[3], x[4]]);
  assert.deepStrictEqual(A.slice(-2), [
    ['live start', IMR, 'denied'],
    ['live start', IMR, 'ok']
  ]);
  assert.ok(!JSON.stringify(s.sheets.Audit.rows).includes('Tess'));
  // The right is the trainer role's only: an owner or an editor without it is refused (Q364: rights are separate).
  save(s, 'Owen');
  grant(s, 'Owen', 'owner');
  grant(s, 'Owen', 'editor');
  assert.strictEqual(start(s, {lname: 'Owen'}).error, 'role');
  assert.strictEqual(run(s, `ROLES.DEF.trainer.rights.includes('live')`), true);
});

test('a session runs lobby, question, reveal, next, end; students get no right answer before the reveal', () => {
  const s = setup(),
    {code, tk} = start(s),
    host = (o = {}) => s.lv('host', {code, tk, ...o});
  assert.strictEqual(host().ph, 'lobby');
  // A wrong key is no trainer.
  assert.strictEqual(s.lv('host', {code, tk: 'x'.repeat(18), act: 'end'}).error, 'input');
  // Three students join; the same nickname twice gets a number.
  const J = ['Mia', 'Leo', 'mia'].map(nick => s.lv('join', {code, nick}));
  assert.deepStrictEqual(
    J.map(j => j.name),
    ['Mia', 'Leo', 'mia 2']
  );
  J.forEach(j => assert.match(j.pk, /^[a-z0-9]{16}$/));
  assert.deepStrictEqual(host().names, ['Mia', 'Leo', 'mia 2']);
  const poll = j => s.lv('poll', {code, pid: j.pid, pk: j.pk}),
    ans = (j, c, qi = 0) => s.lv('answer', {code, pid: j.pid, pk: j.pk, qi, c});
  assert.strictEqual(poll(J[0]).ph, 'lobby');
  // A reveal or an answer before any question: refused.
  assert.strictEqual(host({act: 'rev'}).error, 'phase');
  assert.strictEqual(ans(J[0], 1).error, 'phase');
  // A question that does not fit is refused, nothing changes.
  assert.strictEqual(host({act: 'q', q: {...Q(), k: 7}}).error, 'input');
  assert.strictEqual(host({act: 'q', q: {...Q(), ch: Q().ch.slice(0, 3)}}).error, 'input');
  assert.strictEqual(host({act: 'q', q: {...Q(), ph: [{f: 'a', u: 'javascript:alert(1)'}]}}).error, 'input');
  assert.strictEqual(host({act: 'q', q: {...Q(), ph: [{f: 'a', u: 'https://x.org/a" onerror="b'}]}}).error, 'input');
  assert.strictEqual(host().ph, 'lobby');
  // The first question: the trainer sees its right answer, a student never.
  const h1 = host({act: 'q', q: Q(1)});
  assert.strictEqual(h1.ph, 'q');
  assert.strictEqual(h1.q.k, 1);
  const p1 = poll(J[0]);
  assert.strictEqual(p1.ph, 'q');
  assert.strictEqual(p1.left, 20000);
  assert.deepStrictEqual(p1.q.ch[1], ['Acropora', 'Acropora']);
  assert.ok(!('k' in p1.q) && !('rev' in p1) && !JSON.stringify(p1).includes('"k"'), JSON.stringify(p1));
  // Answers: Mia right after 5 s of her own clock; Leo wrong; one answer each, the second ignored.
  poll(J[1]);
  s.tick(5000);
  assert.deepStrictEqual(ans(J[0], 1), {ok: true, mine: 1, v: run(s, 'VERSION')});
  assert.strictEqual(ans(J[0], 2).mine, 1);
  assert.strictEqual(ans(J[1], 3).ok, true);
  // Still nothing about right or wrong for the students, and the count for the trainer.
  assert.ok(!('rev' in poll(J[0])));
  assert.strictEqual(host().cnt, 2);
  // A key that is not the student's: refused.
  assert.strictEqual(s.lv('answer', {code, pid: J[2].pid, pk: J[0].pk, qi: 0, c: 1}).error, 'input');
  // The reveal: the right choice, each choice's count, own points, the top 5.
  const r1 = host({act: 'rev'});
  assert.deepStrictEqual(r1.rev.d, [0, 1, 0, 1]);
  assert.strictEqual(r1.rev.tot, 2);
  const v = poll(J[0]);
  assert.strictEqual(v.ph, 'rev');
  assert.strictEqual(v.rev.k, 1);
  assert.strictEqual(v.rev.mine, 1);
  assert.strictEqual(v.rev.pts, 175); // 100 + 100 x 15 s left of 20
  assert.strictEqual(v.rank, 1);
  assert.deepStrictEqual(v.top[0], ['Mia', 175, 1]);
  assert.strictEqual(poll(J[1]).rev.pts, 0);
  // Too late once revealed.
  assert.strictEqual(ans(J[2], 1).error, 'phase');
  // Next question, then the last; no fourth one (3 planned).
  assert.strictEqual(host({act: 'q', q: Q(0, 'montipora-2')}).qi, 1);
  assert.strictEqual(host({act: 'q', q: Q(0)}).error, 'phase');
  host({act: 'rev'});
  host({act: 'q', q: Q(2, 'porites-3')});
  host({act: 'rev'});
  assert.strictEqual(host({act: 'q', q: Q()}).error, 'phase');
  const e = host({act: 'end'});
  assert.strictEqual(e.ph, 'end');
  assert.strictEqual(e.hist.length, 3);
  assert.deepStrictEqual(e.hist[0].d, [0, 1, 0, 1]);
  assert.strictEqual(e.hist[0].t, 'Acropora');
  assert.deepStrictEqual(e.stand[0], ['Mia', 175, 1]);
  assert.strictEqual(poll(J[2]).ph, 'end');
  assert.strictEqual(host({act: 'end'}).error, 'phase');
  // No join once ended.
  assert.strictEqual(s.lv('join', {code, nick: 'Zoe'}).error, 'gone');
  // Nothing of it in any sheet tab: the cache only (the Audit row of the start aside).
  const tabs = JSON.stringify(Object.values(s.sheets).map(t => t.rows));
  ['Mia', 'Leo', code].forEach(w => assert.ok(!tabs.includes(w), w));
});

test('scoring: a right answer and a speed bonus, timed from when the question reached that student', () => {
  const s = setup();
  const pts = (ok, ms, lim) => run(s, `lvPoints_(${ok}, ${ms}, ${lim})`);
  assert.strictEqual(pts(true, 0, 20000), 200);
  assert.strictEqual(pts(true, 10000, 20000), 150);
  assert.strictEqual(pts(true, 20000, 20000), 100);
  assert.strictEqual(pts(true, 25000, 20000), 100);
  assert.strictEqual(pts(false, 0, 20000), 0);
  const {code, tk} = start(s),
    a = s.lv('join', {code, nick: 'Ann'}),
    b = s.lv('join', {code, nick: 'Ben'});
  s.lv('host', {code, tk, act: 'q', q: Q(1)});
  // Ann's phone polls at once; Ben's only 4 s later: each answers 2 s after the question reached them.
  s.lv('poll', {code, pid: a.pid, pk: a.pk});
  s.tick(2000);
  s.lv('answer', {code, pid: a.pid, pk: a.pk, qi: 0, c: 1});
  s.tick(2000);
  s.lv('poll', {code, pid: b.pid, pk: b.pk});
  s.tick(2000);
  s.lv('answer', {code, pid: b.pid, pk: b.pk, qi: 0, c: 1});
  const st = s.lv('host', {code, tk}).stand;
  assert.strictEqual(st[0][1], st[1][1]);
  assert.strictEqual(st[0][1], 190);
  // Past the time and its grace: refused.
  s.lv('host', {code, tk, act: 'rev'});
  s.lv('host', {code, tk, act: 'q', q: Q(1)});
  s.lv('poll', {code, pid: a.pid, pk: a.pk});
  s.tick(20000 + 3001);
  assert.strictEqual(s.lv('answer', {code, pid: a.pid, pk: a.pk, qi: 1, c: 1}).error, 'phase');
});

test('a student is sent their accepted answers once revealed, a reveal missed or not; never one refused (Codex review #1049)', () => {
  const s = setup(),
    {code, tk} = start(s),
    a = s.lv('join', {code, nick: 'Ann'}),
    poll = (hx = 0) => s.lv('poll', {code, pid: a.pid, pk: a.pk, hx}),
    ans = (qi, c) => s.lv('answer', {code, pid: a.pid, pk: a.pk, qi, c});
  // A subject in beta for a group is never hosted.
  assert.strictEqual(start(s, {s: 'seaslug'}).error, 'input');
  s.lv('host', {code, tk, act: 'q', q: Q(1)});
  poll();
  ans(0, 2);
  // Nothing revealed yet: nothing to log, and no right answer in the reply.
  const p0 = poll();
  assert.strictEqual(p0.hn, 0);
  assert.ok(!('past' in p0));
  // Revealed, then the next question opened before Ann's page polled again: her answer still comes, with its right one.
  s.lv('host', {code, tk, act: 'rev'});
  s.lv('host', {code, tk, act: 'q', q: Q(0, 'montipora-2')});
  const p1 = poll();
  assert.strictEqual(p1.ph, 'q');
  assert.strictEqual(p1.hn, 1);
  assert.deepStrictEqual(p1.past, [
    {qi: 0, t: 'Acropora', c: 'Porites', ch: ['Montipora', 'Acropora', 'Porites', 'Pocillopora'], f: ['acropora-1']}
  ]);
  // Once the page has gone through it (hx), not again.
  assert.ok(!('past' in poll(1)));
  // An answer refused (too late) is never sent as hers.
  s.tick(20000 + 3001);
  assert.strictEqual(ans(1, 0).error, 'phase');
  s.lv('host', {code, tk, act: 'rev'});
  const p2 = poll(1);
  assert.strictEqual(p2.rev.mine, -1);
  assert.strictEqual(p2.hn, 2);
  assert.ok(!('past' in p2));
  // At the end, from the start: only question 0.
  s.lv('host', {code, tk, act: 'end'});
  assert.deepStrictEqual(
    poll().past.map(x => x.qi),
    [0]
  );
});

test('joins: a nickname of plain text, at most 40 a session, a session older than 6 hours is gone', () => {
  const s = setup(),
    {code, tk} = start(s);
  assert.strictEqual(s.lv('join', {code, nick: '  '}).error, 'input');
  assert.strictEqual(s.lv('join', {code: '12345', nick: 'A'}).error, 'input');
  assert.strictEqual(s.lv('join', {code: code === '999999' ? '999998' : '999999', nick: 'A'}).error, 'gone');
  assert.strictEqual(s.lv('join', {code, nick: '<b>Kim</b>\u0007 '}).name, 'bKim/b');
  for (let i = 0; i < 39; i++) assert.strictEqual(s.lv('join', {code, nick: 'P' + i}).ok, true);
  assert.strictEqual(s.lv('join', {code, nick: 'Late'}).error, 'full');
  // The script lock held by a save: the join answers 'lock' (the app tries again), nothing written.
  const {code: c2} = start(s);
  s.lock.busy = true;
  assert.strictEqual(s.lv('join', {code: c2, nick: 'Max'}).error, 'lock');
  s.lock.busy = false;
  s.tick(6 * 3600e3 + 1);
  assert.strictEqual(s.lv('host', {code, tk}).error, 'gone');
  // An unknown step, and no session code: input.
  assert.strictEqual(s.lv('dance').error, 'input');
  assert.strictEqual(s.lv('poll', {code: 'abc', pid: 'x', pk: 'y'}).error, 'gone');
});

// The app's module (live.js): its gate on the script's version (rule D4) and the pure helpers its screens use.
function liveModule() {
  const src = fs.readFileSync(path.join(ROOT, 'live.js'), 'utf8'),
    ctx = {console, Math, Date, JSON};
  vm.createContext(ctx);
  const pure = /\/\/ pure: begin[\s\S]*?\/\/ pure: end/.exec(src);
  assert.ok(pure, 'live.js keeps its pure helpers between "// pure: begin" and "// pure: end"');
  vm.runInContext(pure[0] + '\nthis.X = {LIVEGAME_SHEET, liveCode, liveShares, liveMissed};', ctx);
  return ctx.X;
}
test('live.js: the gate is main’s script version + 1 or more; codes, shares and the most-missed questions', () => {
  const X = liveModule();
  const v = Number(/const VERSION = (\d+);/.exec(fs.readFileSync(path.join(ROOT, 'tools/sync/Code.gs'), 'utf8'))[1]);
  assert.ok(X.LIVEGAME_SHEET > 161 && X.LIVEGAME_SHEET <= v + 1, `LIVEGAME_SHEET ${X.LIVEGAME_SHEET}, VERSION ${v}`);
  assert.strictEqual(X.liveCode(' 123 456 '), '123456');
  assert.strictEqual(X.liveCode('12345'), '');
  assert.deepStrictEqual(X.liveShares([3, 1, 0, 4], 8), [38, 13, 0, 50]);
  assert.deepStrictEqual(X.liveShares([0, 0, 0, 0], 0), [0, 0, 0, 0]);
  const hist = [
    {qi: 0, t: 'Acropora', k: 1, d: [2, 6, 0, 0], n: 8, ch: ['Montipora', 'Acropora', 'Porites', 'Pocillopora']},
    {qi: 1, t: 'Favites', k: 0, d: [2, 5, 0, 1], n: 8, ch: ['Favites', 'Dipsastraea', 'Porites', 'Goniastrea']},
    {qi: 2, t: 'Porites', k: 2, d: [0, 0, 8, 0], n: 8, ch: ['Montipora', 'Acropora', 'Porites', 'Pocillopora']}
  ];
  const M = X.liveMissed(hist);
  assert.deepStrictEqual(
    M.map(m => [m.t, m.pct, m.wrong]),
    [
      ['Favites', 25, 'Dipsastraea'],
      ['Acropora', 75, 'Montipora']
    ]
  );
});
