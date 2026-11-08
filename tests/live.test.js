// A live Players › Activity (Pierre, 2026-11-08: "Les deux"): (1) the sheet's light read (Code.gs live_, POST readLive:
// the Answers tab's last rows and each player's last answer time), which the admin re-reads every minute while Activity
// is open and in view (admin.js liveArm, liveRead, liveMerge); (2) a device not signed in sends its answers about 3 s
// after each answer, as a signed-in player's (sync.js anonSoon), its queue and the sheet's caps unchanged. Nothing leaves
// this process (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const block = require('./block.js');
const C = require('../core.js');
const {loadCodeGs} = require('./gas.js');

const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  TOK = 'ghp_write000000000000000000';
const copy = o => JSON.parse(JSON.stringify(o));
const T = i => new Date(Date.UTC(2026, 10, 8, 6, 0, i)).toISOString();
const ans = (id, i, extra = {}) => ({
  id,
  t: T(i),
  g: 'Acropora',
  a: 'Acropora',
  ok: 1,
  m: 'quiz',
  ph: 'acropora-' + i,
  ch: '',
  e: 0.5,
  ...extra
});
const save = (s, name, L) => s.post({name, pin: '1234', data: {}, summary: {}, answers: L});

// ---- (1) the sheet's light read ----

test('Code.gs readLive: admins only; an empty log gives nothing', () => {
  const s = loadCodeGs();
  assert.strictEqual(s.post({readLive: 1}).error, 'token');
  assert.strictEqual(s.post({readLive: 1, token: 'nope'}).error, 'token');
  assert.deepStrictEqual(copy(s.post({readLive: 1, token: TOK})), {
    ok: true,
    rows: [],
    last: {},
    n: 0,
    k: 0,
    roster: 0,
    v: s.post({readLive: 1, token: TOK}).v
  });
});

test("Code.gs readLive: the tab's last 50 rows as readAnswers serves them, a surprise card's left out", () => {
  const s = loadCodeGs();
  save(
    s,
    'Ana',
    Array.from({length: 60}, (_, i) => ans('a' + i, i))
  );
  assert.ok(s.post({anon: 'abcdefghij', anonAnswers: [ans('b1', 70), ans('b2', 71, {m: 'wink', s: 'fish', rk: 'family'})], av: '1-x'}).log);
  const j = s.post({readLive: 1, token: TOK}),
    full = s.post({readAnswers: 1, token: TOK}).rows;
  assert.deepStrictEqual([j.n, j.k], [62, 50]);
  // The last 50 rows of the tab, the wink among them left out: 49 rows, readAnswers's own last 49.
  assert.strictEqual(j.rows.length, 49);
  assert.deepStrictEqual(copy(j.rows), copy(full.slice(-49)));
  assert.ok(!j.rows.some(r => r[5] === 'wink'));
  // Each player's last answer time, by admin id (no name).
  const ana = full.find(r => r[11] === 0)[0],
    dev = full.find(r => r[11] === 1)[0];
  assert.deepStrictEqual(copy(j.last), {[ana]: Date.parse(T(59)), [dev]: Date.parse(T(70))});
  assert.ok(!JSON.stringify(j).includes('Ana'), 'no name');
});

test("Code.gs readLive: last from the Activity tab's QUERY while it holds the script's formula, else from the columns", () => {
  const s = loadCodeGs();
  save(s, 'Ana', [ans('a1', 1), ans('a2', 2)]);
  save(s, 'Ben', [ans('a3', 3)]);
  const id = n => vm.runInContext(`aid_(${JSON.stringify(n)})`, s.ctx),
    A = s.sheets.Activity;
  assert.ok(A.rows[0][0].formula, 'the script made the tab with its formula');
  // The formula's values as Sheets computes them (the fake sheet has no QUERY engine): name, answers, right, last.
  A.rows.push(['Ana', 2, 2, new Date(T(40))], ['Ben', 1, 1, new Date(T(3))]);
  assert.deepStrictEqual(copy(s.post({readLive: 1, token: TOK}).last), {[id('Ana')]: Date.parse(T(40)), [id('Ben')]: Date.parse(T(3))});
  // A formula edited by hand: the columns.
  A.rows[0][0] = {formula: '=QUERY(Answers!A:B, "select A")'};
  assert.deepStrictEqual(copy(s.post({readLive: 1, token: TOK}).last), {[id('Ana')]: Date.parse(T(2)), [id('Ben')]: Date.parse(T(3))});
});

test("Code.gs readLive: the roster's time moves with a delete, as readAnswers's (Codex review #775)", () => {
  const s = loadCodeGs();
  save(s, 'Ana', [ans('a1', 1)]);
  save(s, 'Ben', [ans('a2', 2)]);
  const r0 = s.post({readLive: 1, token: TOK}).roster;
  assert.strictEqual(r0, s.post({readAnswers: 1, token: TOK}).roster);
  assert.ok(s.post({userDelete: 'Ana', answers: true, token: TOK}).ok);
  const j = s.post({readLive: 1, token: TOK});
  assert.ok(j.roster > r0, JSON.stringify([r0, j.roster]));
  assert.strictEqual(j.roster, s.post({readAnswers: 1, token: TOK}).roster);
});

test("Code.gs readLive: a deleted account's kept answers and an archive have no last answer (rule D7)", () => {
  const s = loadCodeGs();
  save(s, 'Ana', [ans('a1', 1)]);
  save(s, 'Ben', [ans('a2', 2)]);
  save(s, 'Cy', [ans('a3', 3)]);
  assert.ok(s.post({userDelete: 'Ana', token: TOK}).ok);
  assert.ok(s.post({userArchive: {from: 'Ben', into: 'Ben-old'}, token: TOK}).ok);
  const j = s.post({readLive: 1, token: TOK}),
    id = n => vm.runInContext(`aid_(${JSON.stringify(n)})`, s.ctx);
  assert.deepStrictEqual(Object.keys(j.last), [id('Cy')]);
  assert.deepStrictEqual(
    j.rows.map(r => r[11]),
    [2, 2, 0],
    'their rows flagged as readAnswers flags them'
  );
});

test('Code.gs readLive takes no script lock and writes nothing', () => {
  const s = loadCodeGs();
  save(s, 'Ana', [ans('a1', 1)]);
  const before = JSON.stringify(s.sheets);
  s.lock.busy = true;
  assert.strictEqual(s.post({readLive: 1, token: TOK}).ok, true, 'answered while another request holds the lock');
  s.lock.busy = false;
  assert.strictEqual(JSON.stringify(s.sheets), before);
});

// ---- the admin's merge ----

const admin = read('admin.js');
const mergeOf = () => {
  const ctx = {winkRow: C.winkRow};
  vm.createContext(ctx);
  vm.runInContext(block(admin, '// livemerge: begin', '// livemerge: end', {file: 'admin.js'}) + '\nthis.f = liveMerge;', ctx);
  return (all, j, roster) => copy(ctx.f(all, j, roster));
};
// A readAnswers row: [player, time, shown, answered, right, mode, photos, ..., anonymous flag at 11].
const row = (who, t, x = {}) => [who, t, x.g || 'Acropora', 'Acropora', 1, x.m || 'quiz', x.ph || 'p' + t, 0.5, null, null, '', x.f ?? 0];

test('liveMerge: the rows not held are added, in order; nothing new adds nothing', () => {
  const m = mergeOf(),
    all = [row('A', 1), row('A', 2), row('B', 3)],
    j = {ok: true, rows: [row('A', 2), row('B', 3), row('B', 4), row('C', 5, {f: 1})], last: {A: 2, B: 4, C: 5}, n: 5, k: 4};
  assert.deepStrictEqual(m(all, j), {add: [row('B', 4), row('C', 5, {f: 1})]});
  assert.deepStrictEqual(m([...all, row('B', 4), row('C', 5, {f: 1})], j), {add: []});
  // A surprise card's answer is never added (readLive serves none; belt and braces).
  assert.deepStrictEqual(m(all, {...j, rows: [row('B', 3), row('B', 9, {m: C.WINK_MODE})], last: {A: 2, B: 3}}), {add: []});
});

test('liveMerge: the whole log again when the window misses rows, a row changed player, or a last answer is not held', () => {
  const m = mergeOf(),
    all = [row('A', 1), row('A', 2)];
  // 60 answers came in between: none of the window's 50 rows is held, the tab has more.
  const W = Array.from({length: 50}, (_, i) => row('B', 100 + i));
  assert.deepStrictEqual(m(all, {rows: W, last: {}, n: 62, k: 50}), {full: true});
  // The whole tab fits in the window: every row there, the new ones added.
  assert.deepStrictEqual(m([], {rows: [row('B', 5)], last: {B: 5}, n: 1, k: 1}), {add: [row('B', 5)]});
  // Answers claimed at sign-in (or renamed, merged): a held row under another player id.
  assert.deepStrictEqual(m([row('~anon', 1), row('~anon', 2)], {rows: [row('N', 2), row('N', 3)], last: {N: 3}, n: 3, k: 3}), {full: true});
  // A player's last answer later than every row held of them, outside the window (or a second later at most: rounding).
  assert.deepStrictEqual(m(all, {rows: [row('A', 2)], last: {A: 2, D: 9000}, n: 60, k: 50}), {full: true});
  assert.deepStrictEqual(m(all, {rows: [row('A', 2)], last: {A: 900}, n: 60, k: 50}), {add: []});
  // A deleted account's or an archive's rows (flag 2) never stand for a player's last answer.
  assert.deepStrictEqual(m([row('X', 5000, {f: 2})], {rows: [row('X', 5000, {f: 2})], last: {X: 5000}, n: 1, k: 1}), {full: true});
  // A last answer earlier than the one held (an answer deleted since): nothing to read.
  assert.deepStrictEqual(m(all, {rows: [row('A', 2)], last: {A: 1}, n: 2, k: 2}), {add: []});
});

test('liveMerge: a deleted, merged or archived account never stays in the log held (rule D7; Codex review #775)', () => {
  const m = mergeOf(),
    all = [row('A', 1), row('A', 2), row('B', 3)],
    j = {rows: [row('B', 3)], last: {A: 2, B: 3}, n: 60, k: 50};
  assert.deepStrictEqual(m(all, j), {add: []});
  // An account left normal operation since the log held was read (Code.gs rosterAt_), whatever the window shows.
  assert.deepStrictEqual(m(all, {...j, roster: 5000}, 4000), {full: true});
  assert.deepStrictEqual(m(all, {...j, roster: 4000}, 4000), {add: []});
  assert.deepStrictEqual(m(all, {...j, roster: 4000}), {full: true}, 'a log read with no roster');
  // A held player with no last answer any more (their answers deleted, renamed or claimed), out of the window.
  assert.deepStrictEqual(m(all, {...j, last: {B: 3}}), {full: true});
  // A deleted account's kept answers (flag 2) are no player: their absence from last asks nothing.
  assert.deepStrictEqual(m([...all, row('~d', 0, {f: 2})], j), {add: []});
});

// ---- the admin's timer ----

// admin.js's live block run on stubs: the page (cur), its visibility, the clock (timers run by hand), the sheet replies.
function liveAdmin({v = Number(/const LIVE_SHEET = (\d+);/.exec(admin)[1]), rows = [row('A', 1)], reply} = {}) {
  const timers = [],
    calls = [],
    ctx = {
      winkRow: C.winkRow,
      subjRows: R => R.filter(r => r[17] == null || r[17] === 'coral'),
      cur: 'players/activity',
      TOKEN: 'tok',
      SYNC_URL: 'https://script.google.com/macros/s/test/exec',
      USERS: {users: [{id: 'A', name: 'Ana'}]},
      ANS: {ok: true, v, rows, all: rows, players: {}, at: 0},
      renders: 0,
      reads: 0,
      users: 0,
      render: () => ctx.renders++,
      loadStats: () => (ctx.reads++, ctx.fullFails ? (ctx.ANS = {old: true, rows: []}) : 0, Promise.resolve()),
      PSAVED: {},
      cleared: 0,
      savedClear: () => ctx.cleared++,
      loadUsers: () => (ctx.users++, ctx.usersFail ? (ctx.USERS = {err: 'Offline'}) : 0, Promise.resolve()),
      Date: {now: () => ctx.now},
      now: 1e6,
      document: {visibilityState: 'visible', on: {}, addEventListener: (k, f) => (ctx.document.on[k] = f)},
      setTimeout: (f, ms) => (timers.push({f, at: ctx.now + ms, id: timers.length + 1}), timers.length),
      clearTimeout: id => {
        const t = timers.find(x => x.id === id);
        if (t) t.done = true;
      },
      fetch: (u, o) => {
        calls.push(JSON.parse(o.body));
        const j = typeof reply === 'function' ? reply(calls.length) : reply || {ok: true, rows: [], last: {}, n: 1, k: 1};
        return Promise.resolve({json: () => Promise.resolve(j)});
      }
    };
  ctx.ANS.at = ctx.now;
  vm.createContext(ctx);
  vm.runInContext(
    'const SHEET_READS = {}, SHEET_GEN = {};\n' +
      block(admin, 'function sheetRead(k, go) {', '\nfunction sheetAgain(', {file: 'admin.js'}) +
      block(admin, 'const LIVE_SHEET = ', "document.addEventListener('visibilitychange', liveArm);", {file: 'admin.js', through: 1}) +
      '\nthis.L = {liveArm, liveRead, LIVE_READ};',
    ctx
  );
  const pending = () => timers.filter(t => !t.done);
  // Moves the clock on by ms, running the timers due (and the replies they wait for).
  const tick = async ms => {
    ctx.now += ms;
    for (let t; (t = pending().find(x => x.at <= ctx.now));) {
      t.done = true;
      await t.f();
      await new Promise(r => setImmediate(r));
    }
  };
  return {ctx, calls, pending, tick, L: ctx.L};
}

test('Activity: a light read every minute while open and in view; none hidden; at once back in view after a minute', async () => {
  const a = liveAdmin();
  a.L.liveArm();
  assert.strictEqual(a.pending().length, 1);
  assert.strictEqual(a.pending()[0].at - a.ctx.now, 60000, 'a minute after the log was read');
  await a.tick(59000);
  assert.strictEqual(a.calls.length, 0);
  await a.tick(1000);
  assert.deepStrictEqual(a.calls, [{readLive: 1, token: 'tok'}]);
  assert.strictEqual(a.ctx.renders, 1, 'drawn again ("as of", who is playing now)');
  a.L.liveArm(); // the render's bindStats arms the next one
  await a.tick(60000);
  assert.strictEqual(a.calls.length, 2);
  // Hidden: the timer stops, nothing is read.
  a.L.liveArm();
  a.ctx.document.visibilityState = 'hidden';
  a.ctx.document.on.visibilitychange();
  assert.strictEqual(a.pending().length, 0);
  await a.tick(300000);
  assert.strictEqual(a.calls.length, 2);
  // Back in view five minutes later: at once.
  a.ctx.document.visibilityState = 'visible';
  a.ctx.document.on.visibilitychange();
  await a.tick(0);
  assert.strictEqual(a.calls.length, 3);
  // Another page: no read.
  a.ctx.cur = 'players/list';
  a.L.liveArm();
  await a.tick(120000);
  assert.strictEqual(a.calls.length, 3);
});

test('Activity: no light read before LIVE_SHEET, without the token or while the whole log is read', async () => {
  for (const [label, prep] of [
    ['an older script', a => (a.ctx.ANS.v -= 1)],
    ['no reply version', a => delete a.ctx.ANS.v],
    ['no token', a => (a.ctx.TOKEN = null)],
    ['an old log', a => (a.ctx.ANS = {old: true, v: 999, rows: []})]
  ]) {
    const a = liveAdmin();
    prep(a);
    a.L.liveArm();
    await a.tick(600000);
    assert.strictEqual(a.calls.length, 0, label);
  }
});

test('Activity: the answers given since are added; a gap reads the whole log in the background; a new player the list', async () => {
  const a = liveAdmin({reply: () => ({ok: true, rows: [row('A', 1), row('A', 7)], last: {A: 7}, n: 2, k: 2})});
  await a.L.liveRead();
  await new Promise(r => setImmediate(r));
  assert.deepStrictEqual(copy(a.ctx.ANS.all), [row('A', 1), row('A', 7)]);
  assert.deepStrictEqual(copy(a.ctx.ANS.rows), [row('A', 1), row('A', 7)]);
  assert.strictEqual(a.ctx.ANS.at, a.ctx.now, '"as of" the light read');
  assert.deepStrictEqual([a.ctx.reads, a.ctx.users], [0, 0]);
  // A gap: the whole log again, the page kept (no ANS dropped before the new one is in).
  const b = liveAdmin({reply: () => ({ok: true, rows: [row('B', 50)], last: {B: 50}, n: 80, k: 50})}),
    held = b.ctx.ANS;
  await b.L.liveRead();
  await new Promise(r => setImmediate(r));
  assert.deepStrictEqual([b.ctx.reads, b.ctx.users], [1, 1], 'the whole log and the player list (Codex review #775)');
  assert.strictEqual(b.ctx.ANS, held, 'shown until the whole log is in');
  // The whole log read but not the player list (after a delete or an archive): the list is asked again at each light
  // read until it is in, though nothing else calls for it (Codex review #775).
  const ul = liveAdmin({
    reply: n =>
      n === 1 ? {ok: true, rows: [row('B', 50)], last: {B: 50}, n: 80, k: 50} : {ok: true, rows: [row('A', 1)], last: {A: 1}, n: 1, k: 1}
  });
  ul.ctx.usersFail = true;
  await ul.L.liveRead();
  await new Promise(r => setImmediate(r));
  assert.strictEqual(ul.ctx.users, 1);
  ul.ctx.usersFail = false;
  for (const want of [2, 2]) {
    ul.ctx.now += 60000;
    await ul.L.liveRead();
    await new Promise(r => setImmediate(r));
    assert.strictEqual(ul.ctx.users, want, 'asked again once, then no more once it is in');
  }
  // The whole log could not be read (offline, an error): the log held stays, the next light read in a minute.
  const e = liveAdmin({reply: () => ({ok: true, rows: [row('B', 50)], last: {B: 50}, n: 80, k: 50})}),
    he = e.ctx.ANS;
  e.ctx.fullFails = true;
  await e.L.liveRead();
  await new Promise(r => setImmediate(r));
  assert.strictEqual(e.ctx.ANS, he, 'not replaced by an unreadable log');
  e.L.liveArm();
  assert.strictEqual(e.pending().at(-1).at - e.ctx.now, 60000, 'and the timer still runs');
  // An unfolded session's saved copy follows its player's new answers (Codex review #775).
  const f = liveAdmin({reply: () => ({ok: true, rows: [row('A', 1), row('A', 9)], last: {A: 9}, n: 2, k: 2})});
  f.ctx.PSAVED.Ana = {by: {}};
  await f.L.liveRead();
  await new Promise(r => setImmediate(r));
  assert.strictEqual(f.ctx.cleared, 1);
  // A signed-in player the list does not know yet (a new account): the player list is read again.
  const c = liveAdmin({reply: () => ({ok: true, rows: [row('A', 1), row('N', 8)], last: {A: 1, N: 8}, n: 2, k: 2})});
  await c.L.liveRead();
  await new Promise(r => setImmediate(r));
  assert.strictEqual(c.ctx.users, 1);
  // The list could not be read (offline): the last good one kept, and asked again at the next light read, though it
  // brings no new answer, until it holds the new player (Codex review #775).
  const g = liveAdmin({reply: () => ({ok: true, rows: [row('A', 1), row('N', 8)], last: {A: 1, N: 8}, n: 2, k: 2})}),
    U0 = g.ctx.USERS;
  g.ctx.usersFail = true;
  await g.L.liveRead();
  await new Promise(r => setImmediate(r));
  assert.deepStrictEqual([g.ctx.users, g.ctx.USERS === U0], [1, true]);
  g.ctx.usersFail = false;
  g.ctx.now += 60000;
  await g.L.liveRead();
  await new Promise(r => setImmediate(r));
  assert.strictEqual(g.ctx.users, 2, 'asked again with no new answer');
  // A failed read keeps the log and waits a minute.
  const d = liveAdmin({reply: () => ({ok: false, error: 'server'})}),
    h = d.ctx.ANS;
  await d.L.liveRead();
  await new Promise(r => setImmediate(r));
  assert.strictEqual(d.ctx.ANS, h);
  assert.strictEqual(d.pending()[0].at - d.ctx.now, 60000);
});

test('Activity: a reply that comes after ↻ (a new log read) is dropped', async () => {
  let go;
  const a = liveAdmin();
  a.ctx.fetch = () => new Promise(r => (go = r));
  const p = a.L.liveRead();
  await new Promise(r => setImmediate(r));
  const fresh = {ok: true, v: a.ctx.ANS.v, rows: [], all: [], players: {}, at: a.ctx.now};
  a.ctx.ANS = fresh; // ↻: sheetAgain, then the new log
  go({json: () => Promise.resolve({ok: true, rows: [row('Z', 9)], last: {Z: 9}, n: 1, k: 1})});
  await p;
  assert.strictEqual(a.ctx.ANS, fresh);
  assert.deepStrictEqual(copy(a.ctx.ANS.all), []);
});

// ---- (2) a device not signed in sends about 3 s after each answer ----

const sync = read('sync.js');
function anonApp(q = []) {
  const timers = [],
    ctx = {
      sent: 0,
      store: {get: (k, d) => (k === 'reefid-anonq' ? q : d)},
      ANONQ: 'reefid-anonq',
      logOk: () => true,
      sheetV: () => 108,
      setTimeout: (f, ms) => (timers.push({f, ms}), timers.length),
      clearTimeout: id => id && (timers[id - 1].cleared = true)
    };
  vm.createContext(ctx);
  vm.runInContext(
    'let anonTimer = 0;\nconst sendAnon = () => sent++;\n' +
      block(sync, 'const ANON_SEND = ', '\nfunction sendAnon(', {file: 'sync.js'}) +
      '\nthis.A = {anonSoon, ANON_SEND};',
    ctx
  );
  return {ctx, timers, A: ctx.A};
}

test('sync.js anonSoon: one send about 3 s after each answer, whatever the queue holds; answers in a row share one', () => {
  assert.strictEqual(anonApp().A.ANON_SEND.MS, 3000);
  for (const n of [1, 9, 10, 40]) {
    const a = anonApp(Array.from({length: n}, (_, i) => ({id: 'q' + i})));
    a.A.anonSoon();
    assert.deepStrictEqual(
      a.timers.map(t => t.ms),
      [3000],
      `${n} queued: no batch of 10 any more`
    );
  }
  // Two answers within 3 s: the first timer is replaced, one request.
  const a = anonApp([{id: 'q1'}]);
  a.A.anonSoon();
  a.A.anonSoon();
  assert.deepStrictEqual(
    a.timers.map(t => [t.ms, !!t.cleared]),
    [
      [3000, true],
      [3000, false]
    ]
  );
});

test("sync.js: a device not signed in sends each answer on its own, and the sheet's caps still hold", async () => {
  // The send itself (sendAnon) as before: the queue, at most 100 a request, a refused send kept for the next answer.
  const s = loadCodeGs();
  for (let i = 0; i < 5; i++) assert.ok(s.post({anon: 'abcdefghij', anonAnswers: [ans('c' + i, i)], av: '1-x'}).log);
  assert.strictEqual(s.sheets.Answers.getLastRow(), 6, 'five requests, five rows');
  // 600 answers per device every 6 hours, counted by answer, not by request: one a request reaches it as 10 a request did.
  const t = loadCodeGs();
  let last;
  for (let i = 0; i < 601; i++) last = t.post({anon: 'abcdefghij', anonAnswers: [ans('d' + i, i % 50)], av: '1-x'});
  assert.strictEqual(last.error, 'busy');
  assert.strictEqual(t.sheets.Answers.getLastRow(), 601);
  // The anonymous queue and its retry are unchanged: the sending code still keeps what a refused send carried.
  assert.match(block(sync, 'function sendAnon(', '\n}\n', {file: 'sync.js', through: 1}), /if \(!j \|\| !j\.log\) return ev\('sync'/);
});
