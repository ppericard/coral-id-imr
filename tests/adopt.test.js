// The device's side of the full replay (sync.js replayAdopt, signIn, sendAnon; docs/LEARNING.md "Full replay") and the
// learned-based achievements taken back (progress.js achRecheck): the app's own code run in Node on stubs (localStorage,
// the page), against the sync script on an in-memory sheet (tests/gas.js) where it talks to the sheet. Nothing leaves
// this process (AGENTS.md rule 13).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const {loadCodeGs} = require('./gas.js');

const ROOT = path.join(__dirname, '..'),
  DATA = require('../data.json'),
  DJSON = fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8');
// data.json from GitHub, as the script reads it (Code.gs gen_).
const withData = () => ({
  fetch: url => (/\/main\/data\.json$/.test(url) ? {getResponseCode: () => 200, getContentText: () => DJSON} : null)
});

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
// sync.js as the page runs it, with app.js's globals stubbed (store as app.js has it, loadData as progress.js has it).
// sheet: a loadCodeGs() sheet the requests go to (sheetFetch for a signed-in player, fetch for anonymous answers).
function app({ls = {}, P = {}, SYNC = null, sheet = null} = {}) {
  const prog = fs.readFileSync(path.join(ROOT, 'progress.js'), 'utf8'),
    loadData = /const loadData = [\s\S]*?;\n/.exec(prog)[0],
    progData = /const progData = [\s\S]*?\n};\n/.exec(prog)[0],
    sent = [];
  const answer = (u, o) => {
    const url = new URL(String(u)),
      body = o && o.body ? JSON.parse(o.body) : null;
    sent.push(body || Object.fromEntries(url.searchParams));
    const j = sheet ? (body ? sheet.post(body) : sheet.get(Object.fromEntries(url.searchParams))) : {ok: false};
    return Promise.resolve({json: () => JSON.parse(JSON.stringify(j))});
  };
  const ctx = {
    ...C,
    console,
    crypto: require('crypto').webcrypto,
    localStorage: storage(ls),
    sessionStorage: storage(),
    location: {hash: '', reload: () => {}},
    document: {
      addEventListener: () => {},
      getElementById: () => ({}),
      querySelector: () => null,
      querySelectorAll: () => [],
      visibilityState: 'visible'
    },
    window: {addEventListener: () => {}},
    navigator: {onLine: true},
    setInterval: () => 0,
    setTimeout: () => 0,
    clearTimeout: () => {},
    SYNC_URL: 'https://script.google.com/macros/s/test/exec',
    LOCAL: false,
    SYNC,
    DATA,
    P,
    PMEM: undefined,
    PCONF: {},
    ACHK: 'imr-coral-ach',
    sheetFetch: answer,
    fetch: answer,
    mxRecalc: f => f(),
    answersSoFar: () => 0,
    achMerge: () => {},
    route: () => {},
    // What a sync (syncOnce, mergeSaved) touches besides the progress.
    slateGenera: () => [],
    level: () => ['new'],
    progPct: () => 0,
    boardOn: () => true,
    BOARD: 'imr-coral-board',
    boardT: () => 0,
    showBoardSet: () => {},
    INTRO: {KEY: 'imr-coral-intro', OFFER: {KEY: 'imr-coral-intro-offer'}},
    introMerge: () => {},
    introReset: () => {},
    Q: {},
    saveQ: () => {},
    showBon: () => {},
    prog: () => {}
  };
  vm.createContext(ctx);
  vm.runInContext(
    `const store = {get(k, d) { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }, set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }};
     const save = () => store.set('imr-coral-progress', P);\n` +
      loadData +
      progData +
      fs.readFileSync(path.join(ROOT, 'sync.js'), 'utf8') +
      '\nbindSync = () => {};\nthis.A = {replayAdopt, rvApplied, syncGet, syncPush, syncPull, signIn, sendAnon, store, RVK};',
    ctx
  );
  const A = ctx.A;
  A.ctx = ctx;
  A.sent = sent;
  A.count = g => ((ctx.P[g] || {}).ok || 0) + ((ctx.P[g] || {}).ko || 0);
  return A;
}
const T = i => new Date(Date.UTC(2026, 10, 3, 6, 0, i)).toISOString();
const qa = (id, i) => ({
  id,
  t: T(i),
  g: 'Acropora',
  a: i % 4 === 3 ? 'Montipora' : 'Acropora',
  ok: i % 4 === 3 ? 0 : 1,
  m: 'quiz',
  ph: 'acropora-wide-' + (i % 5),
  ch: 'Acropora Montipora Porites Pocillopora',
  e: 0.8,
  th: 1,
  nw: 1
});
const settle = () => new Promise(r => setImmediate(r)).then(() => new Promise(r => setImmediate(r)));

test("signing in to an existing account takes the account's rules version, 0 when its data has none (Codex review #399)", () => {
  // A device that adopted its anonymous replay (rv = RV), then signs in to an account never replayed.
  const a = app({ls: {'imr-coral-rv': String(C.RV)}});
  assert.strictEqual(a.rvApplied(), C.RV);
  a.signIn('Ana', '1234', {found: true, data: {'imr-coral-progress': '{}', 'imr-coral-quiz': '{}'}});
  assert.strictEqual(a.rvApplied(), 0, 'the anonymous marker would stop the account from ever getting its replay');
  a.syncGet();
  assert.strictEqual(a.sent[0].rv, '0', 'the next load asks for the replay');
  // An account replayed on another device brings its own version.
  const b = app({ls: {'imr-coral-rv': '0'}});
  b.signIn('Ana', '1234', {found: true, data: {'imr-coral-progress': '{}', 'imr-coral-rv': String(C.RV)}});
  assert.strictEqual(b.rvApplied(), C.RV);
  // A new account keeps this device's (its progress is the one adopted here, and goes to the new name as it is).
  const c = app({ls: {'imr-coral-rv': String(C.RV)}});
  c.signIn('Ana', '1234', {found: false});
  assert.strictEqual(c.rvApplied(), C.RV);
});

test('a load after a lost reply: the replay covers every queued answer the sheet already logged (Codex review #399)', async () => {
  // 601 answers sent and logged, the reply lost: all still queued here, with one new answer.
  const s = loadCodeGs(withData()),
    L = Array.from({length: 601}, (_, i) => qa('r' + i, i)),
    fresh = qa('r601', 601);
  assert.ok(s.post({name: 'Ana', pin: '1234', data: {'imr-coral-progress': '{}'}, summary: {}, answers: L}).log);
  const SYNC = {name: 'Ana', pin: '1234', log: [...L, fresh]},
    a = app({sheet: s, SYNC});
  const j = await a.syncGet();
  assert.strictEqual(a.sent[0].pt, String(Date.parse(L[0].t)), 'the load says when the queue starts');
  assert.ok(j.replay && j.replay.n === 601 && j.replay.ids.length === 601, JSON.stringify(j).slice(0, 200));
  assert.strictEqual(a.replayAdopt(j.replay, a.ctx.SYNC.log, j.v), true);
  assert.strictEqual(a.count('Acropora'), 602, 'each answer once: the replay of 601, the new one on top (was 703)');
});

test("an anonymous device's replay starts at its progress reset, and its send says where its queue starts (Codex review #399)", async () => {
  const s = loadCodeGs(withData()),
    id = 'abcdefghij',
    before = Array.from({length: 5}, (_, i) => qa('b' + i, i)),
    after = [qa('c1', 20), qa('c2', 21)];
  // Answers sent before a progress reset, then the reset, then two answers queued here.
  assert.ok(s.post({anon: id, anonAnswers: before}).log);
  const a = app({
    sheet: s,
    ls: {'imr-anon-id': JSON.stringify(id), 'imr-anonq': JSON.stringify(after), 'imr-coral-reset': JSON.stringify(T(10))}
  });
  a.sendAnon();
  await settle();
  assert.deepStrictEqual([a.sent[0].reset, a.sent[0].pt], [T(10), Date.parse(T(20))]);
  assert.strictEqual(a.rvApplied(), C.RV, 'the replay was adopted');
  assert.strictEqual(a.count('Acropora'), 2, 'only the answers since the reset (was 7)');
});

// A progress reset on the device, as app.js's Reset progress button makes it.
const resetHere = (a, t) => {
  a.ctx.P = {};
  a.store.set('imr-coral-reset', t);
  a.store.set('imr-coral-progress', {});
};
test('a progress reset while a send is on its way: its replay, from the old cutoff, is not adopted (Codex review #399)', async () => {
  // Anonymous: five answers logged, two more queued here; the player resets while the send carrying them is out.
  const s = loadCodeGs(withData()),
    id = 'abcdefghij',
    before = Array.from({length: 5}, (_, i) => qa('b' + i, i));
  assert.ok(s.post({anon: id, anonAnswers: before}).log);
  let during = null;
  const sheet = {get: q => s.get(q), post: b => (r => (during && during(), (during = null), r))(s.post(b))},
    a = app({sheet, ls: {'imr-anon-id': JSON.stringify(id), 'imr-anonq': JSON.stringify([qa('c1', 20), qa('c2', 21)])}});
  during = () => resetHere(a, T(30));
  a.sendAnon();
  await settle();
  assert.ok(a.sent[0].rv === 0 && !a.sent[0].reset, 'sent before the reset');
  assert.deepStrictEqual([a.count('Acropora'), a.rvApplied()], [0, 0], 'the discarded progress stays out (was 7 and applied)');
  // The next send carries the new reset: its replay starts there and is adopted.
  a.store.set('imr-anonq', [qa('d1', 40)]);
  a.sendAnon();
  await settle();
  assert.deepStrictEqual([a.sent[1].reset, a.count('Acropora'), a.rvApplied()], [T(30), 1, C.RV]);

  // Signed in: the load's replay failed (the sheet's lock was busy), the save's reply brings it, the reset came between.
  const t = loadCodeGs(withData());
  t.post({name: 'Ana', pin: '1234', data: {'imr-coral-progress': '{}'}, summary: {}, answers: before});
  let strip = true;
  const sh = {
      get: q => (r => (strip && delete r.replay, r))(t.get(q)),
      post: b => (r => (during && during(), (during = null), r))(t.post(b))
    },
    d = app({sheet: sh, SYNC: {name: 'Ana', pin: '1234', dirty: true, log: [qa('c1', 20), qa('c2', 21)]}});
  during = () => resetHere(d, T(30));
  await d.syncPush();
  assert.ok(d.sent[1].answers.length === 2 && d.sent[1].rv === 0, 'the save went out before the reset');
  assert.deepStrictEqual([d.count('Acropora'), d.rvApplied()], [0, 0], 'the discarded progress stays out (was 7 and applied)');
  strip = false;
  await d.syncPush();
  assert.deepStrictEqual([d.count('Acropora'), d.rvApplied()], [0, C.RV], 'the next save, with the reset, gets its replay');
});

test('two devices adopt the replay of a log ahead of the saved copy: no answer counted twice (Codex review #399)', async () => {
  // Two answers logged, the progress write lost: the saved copy is empty.
  const s = loadCodeGs(withData());
  s.post({name: 'Ana', pin: '1234', data: {'imr-coral-progress': '{}'}, summary: {}, answers: [qa('a0', 0), qa('a1', 1)]});
  const dev = () => app({sheet: s, SYNC: {name: 'Ana', pin: '1234', log: [], base: {}}}),
    A = dev(),
    B = dev();
  await A.syncPull();
  await B.syncPull();
  assert.deepStrictEqual([A.count('Acropora'), B.count('Acropora'), A.rvApplied(), B.rvApplied()], [2, 2, C.RV, C.RV]);
  // A saves its adoption first; its own load before the save still finds the empty copy of the older rules.
  await A.syncPush();
  assert.strictEqual(A.count('Acropora'), 2, 'the older saved copy does not undo the replay');
  assert.strictEqual(JSON.parse(A.sent[2].data['imr-coral-progress']).Acropora.ok, 2);
  // B loads A's save: the same two answers, not four.
  await B.syncPull();
  assert.strictEqual(B.count('Acropora'), 2, 'was 4');
  // B answers once more, saves; A loads it: three.
  B.ctx.SYNC.log = [qa('a2', 2)];
  B.ctx.P.Acropora.ok++;
  await B.syncPush();
  await A.syncPull();
  assert.deepStrictEqual([B.count('Acropora'), A.count('Acropora')], [3, 3]);
});

// progress.js achRecheck on stubs: the learned mark taken away (MXL.ach), the snapshot of a player with none learned.
function ach(A) {
  const src = fs.readFileSync(path.join(ROOT, 'progress.js'), 'utf8'),
    block = src.slice(src.indexOf('const ACHK = '), src.indexOf('const achList'));
  const saved = {},
    ctx = {
      ...C,
      SYNC: {name: 'Ana'},
      synced: 0,
      MXL: {KEY: 'imr-mx-lost'},
      ACHNEW: 'imr-ach-new',
      achUnseen: () => [],
      achDot: () => {},
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))}
    };
  ctx.syncSoon = () => ctx.synced++;
  ctx.achSnap = () => ({total: 40, met: 40, q: [30, 20, 10], learned: 0, pct: 60, streak: 0, elo: 0, group: false, bonus: 0});
  vm.createContext(ctx);
  vm.runInContext(block + '\nthis.M = {achRecheck, achMerge, ACHK};', ctx);
  ctx.store.set('imr-coral-ach', A);
  ctx.store.set('imr-mx-lost', {ach: 1, due: {Acropora: 1}});
  return {
    ...ctx.M,
    ctx,
    rec: () => ctx.store.get('imr-coral-ach', null)
  };
}

test('achievements taken back: the removals are kept and synced even when this record held none of them (Codex review #399)', () => {
  // achMigrate already dropped learn1 at start-up; the sheet's copy still has it, earned under the former model.
  const a = ach({_v: 2, met10: 10}),
    sheetCopy = {_v: 2, met10: 10, learn1: 20};
  assert.deepStrictEqual(a.achRecheck(), [], 'nothing taken from this record');
  assert.strictEqual(typeof (a.rec()._gone || {}).learn1, 'number', 'the removal is kept');
  assert.strictEqual(a.ctx.synced, 1, 'and synced');
  a.achMerge(JSON.stringify(sheetCopy));
  assert.strictEqual(a.rec().learn1, undefined, "the sheet's stale copy does not bring it back");
  assert.strictEqual(a.rec().met10, 10);
  // Held here: taken back as before.
  const b = ach({_v: 2, met10: 10, learn1: 20});
  assert.deepStrictEqual(b.achRecheck(), ['learn1']);
  assert.strictEqual(b.rec().learn1, undefined);
});
