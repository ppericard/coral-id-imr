// The one-time notices wait for the visit's first sync (Pierre, 2026-11-08: a device still holding an old copy of his
// account showed him again the cards and toasts he had seen on another device; sync.js noticeLater, noticesGo, toldAdd,
// toldMerge; core.js TOLD, toldUnion). sync.js runs here in Node with app.js's globals stubbed, the sheet's replies and
// the timers in the test's hands. Nothing leaves this process (rule D1). The cards themselves: tests/pages.smoke.js
// noticesAfterSync.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');

const ROOT = path.join(__dirname, '..'),
  DATA = require('../data.json');

function storage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    key: i => [...m.keys()][i],
    get length() {
      return m.size;
    }
  };
}
const prog = {Acropora: {ok: 1, ko: 0, streak: 1, h: '1'}};
// A signed-in device (SYNC, its copy the one it last loaded: rev 4) or an anonymous one (SYNC null). reply(n, url,
// options): what the n-th request gets, a Promise (fetch's).
function app({SYNC = {name: 'Ana', pin: '1234', srv: 4, base: prog, log: []}, reply, ls = {}} = {}) {
  const appjs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
    groups = /const GROUPS_KEY = [\s\S]*?\nconst subjOpen = .*\n/.exec(appjs)[0],
    prog0 = fs.readFileSync(path.join(ROOT, 'progress.js'), 'utf8'),
    progData = /const progData = [\s\S]*?\n};\n/.exec(prog0)[0],
    loadData = /const loadData = [\s\S]*?;\n/.exec(prog0)[0],
    sent = [],
    timers = [];
  const answer = (u, o) => {
    const n = sent.length;
    sent.push(o && o.body ? JSON.parse(o.body) : {get: 1});
    return reply(n, u, o);
  };
  const ctx = {
    ...C,
    console,
    crypto: require('crypto').webcrypto,
    localStorage: storage({'reefid-sync-coral-progress': JSON.stringify(prog), ...ls}),
    sessionStorage: storage(),
    location: {hash: '', reload: () => {}},
    hashNow: () => '',
    IS_ADMIN: false,
    showSubj: () => {},
    document: {
      addEventListener: () => {},
      getElementById: () => ({}),
      querySelector: () => null,
      querySelectorAll: () => [],
      visibilityState: 'visible'
    },
    window: {addEventListener: () => {}},
    navigator: {onLine: true, userAgent: 'Mozilla/5.0 (node test)'},
    performance: {now: () => 0},
    setInterval: () => 0,
    setTimeout: (f, ms) => timers.push({f, ms}),
    clearTimeout: id => id && timers[id - 1] && (timers[id - 1].f = null),
    ...require('./subj.stub.js')(),
    SYNC_URL: 'https://script.google.com/macros/s/test/exec',
    LOCAL: false,
    SYNC,
    DATA,
    P: JSON.parse(JSON.stringify(prog)),
    PMEM: undefined,
    PCONF: {},
    PFMT: {},
    ACHK: 'reefid-sync-ach',
    sheetFetch: answer,
    fetch: answer,
    mxRecalc: f => f(),
    answersSoFar: () => 1,
    achMerge: () => {},
    route: () => {},
    slateGenera: () => [],
    level: () => ['new'],
    progPct: () => 0,
    boardOn: () => true,
    BOARD: 'reefid-sync-board',
    boardT: () => 0,
    showBoardSet: () => {},
    INTRO: {KEY: 'reefid-sync-coral-intro', OFFER: {KEY: 'reefid-sync-coral-intro-offer'}},
    introMerge: () => {},
    introReset: () => {},
    startMerge: () => {},
    BASICS_KEY: 'reefid-basics',
    Q: {},
    saveQ: () => {},
    showBon: () => {},
    prog: () => {}
  };
  vm.createContext(ctx);
  vm.runInContext(
    `const store = {get(k, d) { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }, set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }};
     const save = () => {};\nlet syncTimer = 0;\n` +
      progData +
      loadData +
      groups +
      fs.readFileSync(path.join(ROOT, 'sync.js'), 'utf8') +
      '\nbindSync = () => {};\nthis.A = {syncPull, noticeLater, noticesReady, toldAdd, toldHas, store, NOTICE};',
    ctx
  );
  // Runs the timers due within ms (in the order set), as the page's clock would.
  ctx.A.run = ms =>
    timers.forEach(t => {
      if (t.f && t.ms <= ms) {
        const f = t.f;
        t.f = null;
        f();
      }
    });
  ctx.A.sent = sent;
  ctx.A.ctx = ctx;
  return ctx.A;
}
const json = j => Promise.resolve({status: 200, json: () => JSON.parse(JSON.stringify(j))});
// The account's saved copy, its revision the one this device last loaded (nothing to merge in the progress); told: the
// notices told on another device.
const loadReply = told => ({
  ok: true,
  found: true,
  rev: 4,
  v: 97,
  data: {'reefid-sync-coral-progress': JSON.stringify(prog), 'reefid-sync-coral-quiz': '{}', 'reefid-sync-told': JSON.stringify(told)}
});
const settle = () => new Promise(r => setImmediate(r)).then(() => new Promise(r => setImmediate(r)));

test('the notices told: the union of two records, short strings only, sorted (core.js toldUnion)', () => {
  assert.deepStrictEqual(C.toldUnion(['rv:9', 'recalc:a'], ['recalc:a', 'mx:Acropora@1']), ['mx:Acropora@1', 'recalc:a', 'rv:9']);
  assert.deepStrictEqual(C.toldUnion(null, {x: 1}), []);
  assert.deepStrictEqual(C.toldUnion(['', 3, null, 'x'.repeat(C.TOLD.MAX + 1), 'board'], 'board'), ['board']);
  assert.strictEqual(C.TOLD.KEY, 'reefid-sync-told', 'it travels with the account (core.js KEYS.SYNC)');
});

test('two accounts merged by the admin keep the notices told on either (core.js mergeUsers)', () => {
  const m = C.mergeUsers(
    {'reefid-sync-coral-progress': '{}', 'reefid-sync-told': '["recalc:a"]'},
    {'reefid-sync-coral-progress': '{}', 'reefid-sync-told': '["rv:9"]'}
  );
  assert.deepStrictEqual(JSON.parse(m['reefid-sync-told']), ['recalc:a', 'rv:9']);
  assert.ok(!('reefid-sync-told' in C.mergeUsers({'reefid-sync-coral-progress': '{}'}, {})), 'none told: no record made');
});

test("an old copy of the account: the notices wait for the visit's first pull, then see what another device told", async () => {
  let answer;
  const a = app({reply: () => new Promise(r => (answer = r))}),
    seen = [];
  assert.strictEqual(a.noticesReady(), false);
  assert.strictEqual(
    a.noticeLater('recalc', () => seen.push(a.toldHas('recalc:typed-questions-2026-11'))),
    true,
    'signed in: the notice waits'
  );
  a.syncPull();
  await settle();
  assert.deepStrictEqual(seen, [], 'nothing before the reply');
  answer({status: 200, json: () => loadReply(['recalc:typed-questions-2026-11'])});
  await settle();
  assert.deepStrictEqual(seen, [true], 'once, after the merge: told on another device');
  assert.strictEqual(a.noticesReady(), true);
  assert.strictEqual(
    a.noticeLater('recalc', () => {}),
    false,
    'the rest of the visit: at once'
  );
});

test('a notice seen here goes to the account with the next save', async () => {
  const a = app({reply: (n, u, o) => (o && o.body ? json({ok: true, log: true, rev: 5, v: 97}) : json(loadReply([])))});
  await a.syncPull();
  assert.strictEqual(a.toldHas('rv:9'), false);
  assert.strictEqual(a.toldAdd('rv:9'), true);
  assert.strictEqual(a.toldAdd('rv:9'), false, 'once');
  assert.strictEqual(a.ctx.SYNC.dirty, true, 'a save is due');
  a.run(3000); // syncSoon's timer
  await settle();
  const post = a.sent.find(x => x.data);
  assert.deepStrictEqual(JSON.parse(post.data['reefid-sync-told']), ['rv:9']);
});

test('offline or a failed load: the notices show at once after the failure, from this device', async () => {
  const a = app({reply: () => Promise.reject(new TypeError('Failed to fetch'))}),
    seen = [];
  a.noticeLater('recalc', () => seen.push(1));
  await a.syncPull();
  await settle();
  assert.deepStrictEqual(seen, [1]);
});

test('a line so slow the load has not come: the notices show after NOTICE.WAIT', async () => {
  const a = app({reply: () => new Promise(() => {})}),
    seen = [];
  a.noticeLater('recalc', () => seen.push(1));
  a.syncPull();
  await settle();
  a.run(a.NOTICE.WAIT - 1);
  assert.deepStrictEqual(seen, []);
  a.run(a.NOTICE.WAIT);
  assert.deepStrictEqual(seen, [1]);
  assert.ok(a.NOTICE.WAIT >= 10000 && a.NOTICE.WAIT <= 30000, 'long enough for a load on a slow line, short enough to be told');
});

test('not signed in: nothing waits, as before', () => {
  const a = app({SYNC: null, reply: () => new Promise(() => {})});
  assert.strictEqual(a.noticesReady(), true);
  assert.strictEqual(
    a.noticeLater('recalc', () => {}),
    false
  );
});

test('not signed in: nothing is told to an account', () => {
  const a = app({SYNC: null, reply: () => new Promise(() => {}), ls: {'reefid-sync-told': '["recalc:a"]'}});
  assert.strictEqual(a.toldHas('recalc:a'), false, "the cards' device marks decide, as before");
  assert.strictEqual(a.toldAdd('rv:9'), false);
});

// progress.js toldSeed on stubs: the marks this device holds go to the account signed in the first time this version runs.
function seed(SYNC, ls) {
  const src = fs.readFileSync(path.join(ROOT, 'progress.js'), 'utf8'),
    fn = /const SEEDK = [\s\S]*?\nfunction toldSeed\(\) \{[\s\S]*?\n\}\n/.exec(src)[0],
    saved = {...ls},
    added = [],
    ctx = {
      ...C,
      SYNC,
      RECALC: {KEY: 'reefid-recalc', L: [{id: 'a'}, {id: 'b'}]},
      RVN: {KEY: 'reefid-rv-msg'},
      MXL: {KEY: 'reefid-mx-lost'},
      SORRYK: {KEY: 'reefid-sorry'},
      HELLO: {KEY: 'hello-'},
      mxTok: (n, mx) => `mx:${n}@${mx}`,
      toldAdd: (...L) => added.push(...L),
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))}
    };
  vm.createContext(ctx);
  vm.runInContext(fn + '\nthis.toldSeed = toldSeed;', ctx);
  return {seed: () => ctx.toldSeed(), added, saved};
}
test("the device's own marks go to the account signed in when this version first runs, never to a later one (Codex review #736)", () => {
  const ls = {
    'reefid-recalc': '"b"',
    'reefid-rv-msg': JSON.stringify({told: [9]}),
    'reefid-mx-lost': JSON.stringify({told: {Acropora: 111}}),
    'reefid-sorry': '1',
    'reefid-fish-hello-all': '5',
    'reefid-fish-hello-group': '"met"',
    'reefid-board-told': '1'
  };
  const a = seed({name: 'Ana'}, ls);
  a.seed();
  assert.deepStrictEqual(a.added, ['recalc:b', 'rv:9', 'mx:Acropora@111', 'sorry', 'hello:fish-all', 'board']);
  a.seed();
  assert.strictEqual(a.added.length, 6, 'once per device');
  // Signed out when the version came: the marks stay this device's, and the next account to sign in never takes them.
  const b = seed(null, ls);
  b.seed();
  b.seed.call(null);
  const c = seed({name: 'Bea'}, b.saved);
  c.seed();
  assert.deepStrictEqual([b.added, c.added], [[], []]);
});
