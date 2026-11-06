// A save that fails (sync.js SAVE, saveFailed, saveRetry; Pierre, 2026-11-05: the red "Not saved" came up "a bit too
// often"): sync.js runs here in Node with app.js's globals stubbed, a clock and timers of its own, the page's visibility
// in the test's hands, and a sheet that fails as the test says, else answers from the sync script on an in-memory sheet
// (tests/gas.js). Nothing leaves this process (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const {loadCodeGs} = require('./gas.js');

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
// fail(url, options, n): what the n-th request (from 0) gets instead of the sheet's answer: an Error to throw (as fetch
// rejects), a reply object to answer, a Promise (the request in the test's hands), or undefined for the sheet's own.
function app({fail = () => undefined} = {}) {
  const sheet = loadCodeGs(),
    sent = [],
    timers = [],
    on = {doc: {}, win: {}};
  let now = Date.UTC(2026, 10, 5, 2, 0, 0),
    seq = 0;
  class D extends Date {
    constructor(...a) {
      a.length ? super(...a) : super(now);
    }
    static now() {
      return now;
    }
  }
  const answer = (u, o) => {
    const url = new URL(String(u)),
      body = o && o.body ? JSON.parse(o.body) : null,
      n = sent.length;
    sent.push(body ? {post: 1, ...body} : {get: 1, ...Object.fromEntries(url.searchParams)});
    const f = fail(u, o, n);
    if (f instanceof Error) return Promise.reject(f);
    if (f && typeof f.then === 'function') return f;
    const j = f || (body ? sheet.post(body) : sheet.get(Object.fromEntries(url.searchParams)));
    return Promise.resolve({status: 200, json: () => JSON.parse(JSON.stringify(j))});
  };
  const doc = {
    visibilityState: 'visible',
    addEventListener: (t, f) => (on.doc[t] = on.doc[t] || []).push(f),
    getElementById: () => ({}),
    querySelector: () => null,
    querySelectorAll: () => []
  };
  const ctx = {
    ...C,
    Date: D,
    console,
    crypto: require('crypto').webcrypto,
    performance: {now: () => 0},
    localStorage: storage(),
    sessionStorage: storage(),
    location: {hash: '#practice/quiz', reload: () => {}},
    hashNow: () => 'quiz', // app.js: the page key on screen
    IS_ADMIN: false,
    showSubj: () => {},
    document: doc,
    window: {addEventListener: (t, f) => (on.win[t] = on.win[t] || []).push(f)},
    navigator: {onLine: true, userAgent: 'Test'},
    setInterval: () => 0,
    setTimeout: (f, ms) => (timers.push({f, ms, at: now + (ms || 0), id: ++seq}), seq),
    clearTimeout: id => {
      const i = timers.findIndex(t => t.id === id);
      if (i >= 0) timers.splice(i, 1);
    },
    AbortController,
    ...require('./subj.stub.js')(),
    SYNC_URL: 'https://script.google.com/macros/s/test/exec',
    LOCAL: false,
    SYNC: {
      name: 'Ana',
      pin: '1234',
      dirty: true,
      rev: 1,
      log: [{id: 'a1', t: new Date(now).toISOString(), g: 'Acropora', a: 'Acropora', ok: 1, m: 'quiz'}]
    },
    DATA,
    P: {},
    PMEM: undefined,
    PCONF: {},
    ACHK: 'reefid-sync-ach',
    sheetFetch: answer,
    fetch: answer,
    mxRecalc: f => f(),
    answersSoFar: () => 0,
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
    prog: () => {},
    GROUPS_KEY: 'reefid-groups',
    subjGroups: () => [],
    subjOpen: () => true,
    syncTimer: 0, // app.js: syncSoon's timer
    loadSent: true // app.js: the visit's load times already sent (sync.js loadSend)
  };
  vm.createContext(ctx);
  const prog = fs.readFileSync(path.join(ROOT, 'progress.js'), 'utf8');
  vm.runInContext(
    `const store = {get(k, d) { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }, set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }};
     const save = () => store.set('reefid-sync-coral-progress', P);\n` +
      /const loadData = [\s\S]*?;\n/.exec(prog)[0] +
      /const progData = [\s\S]*?\n};\n/.exec(prog)[0] +
      fs.readFileSync(path.join(ROOT, 'sync.js'), 'utf8') +
      '\nbindSync = () => {};\nthis.A = {syncPush, store, SAVE, EVQ};',
    ctx
  );
  const A = ctx.A;
  const settle = async () => {
    for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r));
  };
  return {
    ...A,
    ctx,
    sheet,
    sent,
    timers,
    settle,
    // The clock moves to the next timer due among those of the saves (retries, the request limit; not the events' or
    // reports' sends, left alone) and runs it.
    next: async () => {
      timers.sort((a, b) => a.at - b.at);
      const i = timers.findIndex(t => /SYNC\.fail|no answer in/.test(String(t.f)));
      if (i < 0) return null;
      const [t] = timers.splice(i, 1);
      now = Math.max(now, t.at);
      t.f();
      await settle();
      return t;
    },
    timersFor: ms => timers.filter(t => t.ms === ms),
    wait: ms => (now += ms),
    show: v => {
      doc.visibilityState = v;
      (on.doc.visibilitychange || []).forEach(f => f());
    },
    events: () => JSON.parse(JSON.stringify(A.store.get(A.EVQ, []).filter(e => e.k === 'sync'))),
    red: () => ctx.SYNC.err === 'net'
  };
}
const netErr = () => new TypeError('Failed to fetch');

test('a save that fails once and comes through on its retry never shows Not saved, and is reported as recovered', async () => {
  const a = app({fail: (u, o, n) => (n === 0 ? netErr() : undefined)});
  a.syncPush();
  await a.settle();
  assert.strictEqual(a.red(), false, 'one failed try showed Not saved at once');
  assert.ok(a.ctx.SYNC.log.length === 1 && a.ctx.SYNC.dirty, 'the answer waits on the device');
  const r = a.timersFor(a.SAVE.RETRY[0] * 1000);
  assert.strictEqual(r.length, 1, 'no retry was planned: the save waited for the next answer or visit');
  while (a.ctx.SYNC.dirty && (await a.next()));
  assert.strictEqual(a.red(), false);
  assert.deepStrictEqual([a.ctx.SYNC.log.length, a.ctx.SYNC.dirty, a.ctx.SYNC.fail], [0, undefined, undefined]);
  assert.strictEqual(a.sheet.sheets.Answers.rows.filter(x => x[7] === 'a1').length, 1, 'logged once');
  const E = a.events();
  assert.deepStrictEqual(
    E.map(e => e.msg),
    ['save recovered: Failed to fetch']
  );
  assert.match(E[0].src, /^load · no reply · 0\.0 s · try 1 · 0 s · 0 hidden · saved after 5 s$/);
});

test('a save cut by the app going to the background is tried again when the app comes back, never counted', async () => {
  let cut;
  const a = app({fail: (u, o, n) => (n === 0 ? new Promise((ok, no) => (cut = no)) : undefined)});
  a.syncPush();
  await a.settle();
  a.show('hidden'); // the player leaves the app while the save runs; the phone stops the request
  cut(new TypeError('Load failed'));
  await a.settle();
  assert.strictEqual(a.red(), false);
  assert.deepStrictEqual([a.ctx.SYNC.fail.n, a.ctx.SYNC.fail.hid], [0, 1]);
  assert.strictEqual(a.timersFor(a.SAVE.RETRY[0] * 1000).length, 0, 'no retry while hidden: it would be cut too');
  a.wait(10000); // back within 30 s of the last pull: the waiting save goes all the same
  a.show('visible');
  await a.settle();
  assert.deepStrictEqual([a.ctx.SYNC.log.length, a.ctx.SYNC.fail, a.red()], [0, undefined, false]);
  assert.deepStrictEqual(a.events(), [], 'a try cut by the background is not a failure');
});

test('saving that keeps failing shows Not saved after 3 tries over a minute, the answers kept, with one event saying what happened', async () => {
  const a = app({fail: () => netErr()});
  a.syncPush();
  await a.settle();
  const seen = [];
  for (let k = 0; k < 6; k++) {
    seen.push([a.ctx.SYNC.fail.n, a.red()]);
    const t = (await a.next()) || {};
    assert.strictEqual(t.ms, a.SAVE.RETRY[k] * 1000, `retry ${k + 1} after ${a.SAVE.RETRY[k]} s`);
  }
  // Tries at 0, 5, 15, 35, 75 s: red at the first failure past a minute, the 5th (3 tries alone stayed under a minute).
  assert.deepStrictEqual(seen, [
    [1, false],
    [2, false],
    [3, false],
    [4, false],
    [5, true],
    [6, true]
  ]);
  assert.strictEqual(a.ctx.SYNC.log.length, 1, 'the answer is still queued');
  const E = a.events();
  assert.strictEqual(E.length, 1, 'one event a visit: ' + JSON.stringify(E));
  assert.strictEqual(E[0].msg, 'save failed: Failed to fetch');
  assert.match(E[0].src, /^load · no reply · 0\.0 s · try 5 · 75 s · 0 hidden$/);
});

test('the sheet busy or failing (lock, server: sheet v50) is a passing failure, tried again; a refused code is red at once', async () => {
  const a = app({fail: (u, o, n) => (n === 1 ? {ok: false, error: 'lock', v: 50} : undefined)});
  a.syncPush();
  await a.settle();
  assert.strictEqual(a.red(), false, 'lock showed Not saved at once');
  while (a.ctx.SYNC.dirty && (await a.next()));
  assert.deepStrictEqual([a.ctx.SYNC.log.length, a.red()], [0, false]);
  assert.deepStrictEqual(
    a.events().map(e => e.msg),
    ['save recovered: sheet said lock']
  );
  assert.match(a.events()[0].src, /^save · http 200 · /);
  const b = app({fail: () => ({ok: false, error: 'pin', v: 50})});
  b.syncPush();
  await b.settle();
  assert.deepStrictEqual([b.ctx.SYNC.err, b.timers.filter(t => /SYNC\.fail/.test(String(t.f))).length], ['pin', 0], 'no retry');
});

test('a request that never answers fails after SAVE.TIMEOUT, and the next save is not held behind it', async () => {
  const a = app({fail: (u, o, n) => (n === 0 ? new Promise(() => {}) : undefined)});
  a.syncPush();
  await a.settle();
  assert.strictEqual(a.timersFor(a.SAVE.TIMEOUT).length, 1, 'the request has no time limit');
  await a.next(); // SAVE.TIMEOUT later
  assert.match(a.ctx.SYNC.fail.why, /^no answer in 90 s$/);
  while (a.ctx.SYNC.dirty && (await a.next()));
  assert.deepStrictEqual([a.ctx.SYNC.log.length, a.red()], [0, false]);
});

test('leaving the app sends a save still waiting for its timer', async () => {
  const a = app();
  a.show('hidden');
  await a.settle();
  assert.ok(
    a.sent.some(r => r.post && r.name === 'Ana'),
    'the save waited for its 3 s timer while the page was being left'
  );
});
