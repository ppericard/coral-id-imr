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
    sent = [],
    got = [];
  const answer = (u, o) => {
    const url = new URL(String(u)),
      body = o && o.body ? JSON.parse(o.body) : null;
    sent.push(body || Object.fromEntries(url.searchParams));
    const j = sheet ? (body ? sheet.post(body) : sheet.get(Object.fromEntries(url.searchParams))) : {ok: false};
    got.push(j);
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
    ...require('./subj.stub.js')(), // the corals as the current subject
    SYNC_URL: 'https://script.google.com/macros/s/test/exec',
    LOCAL: false,
    SYNC,
    DATA,
    P,
    PMEM: undefined,
    PCONF: {},
    ACHK: 'reefid-sync-ach',
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
    BOARD: 'reefid-sync-board',
    boardT: () => 0,
    showBoardSet: () => {},
    INTRO: {KEY: 'reefid-sync-coral-intro', OFFER: {KEY: 'reefid-sync-coral-intro-offer'}},
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
     const save = () => store.set('reefid-sync-coral-progress', P);\n` +
      loadData +
      progData +
      fs.readFileSync(path.join(ROOT, 'sync.js'), 'utf8') +
      '\nbindSync = () => {};\nthis.A = {replayAdopt, rvApplied, syncGet, syncPush, syncPull, signIn, sendAnon, store, RVK};',
    ctx
  );
  const A = ctx.A;
  A.ctx = ctx;
  A.sent = sent;
  A.got = got; // the replies, in the order of sent
  A.count = g => ((ctx.P[g] || {}).ok || 0) + ((ctx.P[g] || {}).ko || 0);
  return A;
}
const copy = o => JSON.parse(JSON.stringify(o));
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
  const a = app({ls: {'reefid-sync-coral-rv': String(C.RV)}});
  assert.strictEqual(a.rvApplied(), C.RV);
  a.signIn('Ana', '1234', {found: true, data: {'reefid-sync-coral-progress': '{}', 'reefid-sync-coral-quiz': '{}'}});
  assert.strictEqual(a.rvApplied(), 0, 'the anonymous marker would stop the account from ever getting its replay');
  a.syncGet();
  assert.strictEqual(a.sent[0].rv, '0', 'the next load asks for the replay');
  // An account replayed on another device brings its own version.
  const b = app({ls: {'reefid-sync-coral-rv': '0'}});
  b.signIn('Ana', '1234', {found: true, data: {'reefid-sync-coral-progress': '{}', 'reefid-sync-coral-rv': String(C.RV)}});
  assert.strictEqual(b.rvApplied(), C.RV);
  // A new account keeps this device's (its progress is the one adopted here, and goes to the new name as it is).
  const c = app({ls: {'reefid-sync-coral-rv': String(C.RV)}});
  c.signIn('Ana', '1234', {found: false});
  assert.strictEqual(c.rvApplied(), C.RV);
});

test('a load after a lost reply: the replay covers every queued answer the sheet already logged (Codex review #399)', async () => {
  // 601 answers sent and logged, the reply lost: all still queued here, with one new answer.
  const s = loadCodeGs(withData()),
    L = Array.from({length: 601}, (_, i) => qa('r' + i, i)),
    fresh = qa('r601', 601);
  assert.ok(s.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': '{}'}, summary: {}, answers: L}).log);
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
    ls: {'reefid-anon-id': JSON.stringify(id), 'reefid-anonq': JSON.stringify(after), 'reefid-sync-coral-reset': JSON.stringify(T(10))}
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
  a.store.set('reefid-sync-coral-reset', t);
  a.store.set('reefid-sync-coral-progress', {});
};
test('a progress reset while a send is on its way: its replay, from the old cutoff, is not adopted (Codex review #399)', async () => {
  // Anonymous: five answers logged, two more queued here; the player resets while the send carrying them is out.
  const s = loadCodeGs(withData()),
    id = 'abcdefghij',
    before = Array.from({length: 5}, (_, i) => qa('b' + i, i));
  assert.ok(s.post({anon: id, anonAnswers: before}).log);
  let during = null;
  const sheet = {get: q => s.get(q), post: b => (r => (during && during(), (during = null), r))(s.post(b))},
    a = app({sheet, ls: {'reefid-anon-id': JSON.stringify(id), 'reefid-anonq': JSON.stringify([qa('c1', 20), qa('c2', 21)])}});
  during = () => resetHere(a, T(30));
  a.sendAnon();
  await settle();
  assert.ok(a.sent[0].rv === 0 && !a.sent[0].reset, 'sent before the reset');
  assert.deepStrictEqual([a.count('Acropora'), a.rvApplied()], [0, 0], 'the discarded progress stays out (was 7 and applied)');
  // The next send carries the new reset: its replay starts there and is adopted.
  a.store.set('reefid-anonq', [qa('d1', 40)]);
  a.sendAnon();
  await settle();
  assert.deepStrictEqual([a.sent[1].reset, a.count('Acropora'), a.rvApplied()], [T(30), 1, C.RV]);

  // Signed in: the load's replay failed (the sheet's lock was busy), the save's reply brings it, the reset came between.
  const t = loadCodeGs(withData());
  t.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': '{}'}, summary: {}, answers: before});
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
  s.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': '{}'}, summary: {}, answers: [qa('a0', 0), qa('a1', 1)]});
  const dev = () => app({sheet: s, SYNC: {name: 'Ana', pin: '1234', log: [], base: {}}}),
    A = dev(),
    B = dev();
  await A.syncPull();
  await B.syncPull();
  assert.deepStrictEqual([A.count('Acropora'), B.count('Acropora'), A.rvApplied(), B.rvApplied()], [2, 2, C.RV, C.RV]);
  // A saves its adoption first; its own load before the save still finds the empty copy of the older rules.
  await A.syncPush();
  assert.strictEqual(A.count('Acropora'), 2, 'the older saved copy does not undo the replay');
  assert.strictEqual(JSON.parse(A.sent[2].data['reefid-sync-coral-progress']).Acropora.ok, 2);
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

test('answers saved by a device still on the previous app version, after this one adopted the replay, are kept (Codex review #399)', async () => {
  const s = loadCodeGs(withData());
  s.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': '{}'}, summary: {}, answers: [qa('a0', 0), qa('a1', 1)]});
  const A = app({sheet: s, SYNC: {name: 'Ana', pin: '1234', log: [], base: {}}});
  await A.syncPull();
  await A.syncPush();
  assert.deepStrictEqual([A.count('Acropora'), A.rvApplied()], [2, C.RV]);
  // A device on the app before the replay: it loads A's copy, answers once, saves its merge (no rules version in its
  // data: it does not know the key; no rv in its request).
  // Since the rename to IMR Reef ID, an app from before it saves only the old key names (its own storage), and the
  // renamed app's saves carry a copy under them (core.js withLegacy) that such an app reads.
  // rename-app: keep-begin
  const saved = s.get({name: 'Ana', pin: '1234'}).data,
    Q = JSON.parse(saved['imr-coral-progress']);
  Q.Acropora.ok++;
  Q.Acropora.h += '1';
  const old = Object.fromEntries(Object.entries(saved).filter(([k]) => k.startsWith('imr-coral-')));
  old['imr-coral-progress'] = JSON.stringify(Q);
  delete old['imr-coral-rv'];
  // rename-app: keep-end
  assert.ok(s.post({name: 'Ana', pin: '1234', data: old, summary: {}, answers: [qa('a2', 2)], av: '180'}).ok);
  // A loads it: its copy under older rules is not merged, but A asks for the replay again (rules version back to the
  // copy's, a save due), and the save brings it: three answers, and the sheet's copy keeps them.
  await A.syncPull();
  assert.deepStrictEqual([A.rvApplied(), A.ctx.SYNC.dirty], [0, true]);
  await A.syncPush();
  assert.strictEqual(A.count('Acropora'), 3, "was 2: the older client's answer was dropped, then overwritten");
  assert.strictEqual(A.rvApplied(), C.RV);
  const back = JSON.parse(s.get({name: 'Ana', pin: '1234'}).data['reefid-sync-coral-progress']).Acropora;
  assert.strictEqual(back.ok + back.ko, 3);
});

test('after a recovery from an older client, the saved copy reaches the rules version and the replays stop (Codex review #399)', async () => {
  const s = loadCodeGs(withData());
  s.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': '{}'}, summary: {}, answers: [qa('a0', 0), qa('a1', 1)]});
  const A = app({sheet: s, SYNC: {name: 'Ana', pin: '1234', log: [], base: {}}});
  await A.syncPull();
  await A.syncPush();
  // A device on the app before the replay saves one more answer, with no rules version in its data.
  // Since the rename to IMR Reef ID, an app from before it saves only the old key names (its own storage), and the
  // renamed app's saves carry a copy under them (core.js withLegacy) that such an app reads.
  // rename-app: keep-begin
  const saved = s.get({name: 'Ana', pin: '1234'}).data,
    Q = JSON.parse(saved['imr-coral-progress']);
  Q.Acropora.ok++;
  Q.Acropora.h += '1';
  const old = Object.fromEntries(Object.entries(saved).filter(([k]) => k.startsWith('imr-coral-')));
  old['imr-coral-progress'] = JSON.stringify(Q);
  delete old['imr-coral-rv'];
  // rename-app: keep-end
  assert.ok(s.post({name: 'Ana', pin: '1234', data: old, summary: {}, answers: [qa('a2', 2)], av: '180'}).ok);
  // A recovers it (the replay again), then syncs four more times with nothing new: one save brings its rules version to
  // the saved copy, and no later reply carries a replay (was: the saved copy back to 0 and a full replay at every sync).
  await A.syncPush();
  assert.deepStrictEqual([A.count('Acropora'), A.rvApplied()], [3, C.RV]);
  const from = A.got.length;
  for (let i = 0; i < 4; i++) {
    A.ctx.SYNC.dirty = true;
    await A.syncPush();
  }
  const savedRv = () => JSON.parse(s.get({name: 'Ana', pin: '1234'}).data['reefid-sync-coral-rv'] || '0');
  assert.strictEqual(savedRv(), C.RV, 'the saved copy stayed at rules version 0');
  assert.deepStrictEqual(
    A.got.slice(from).map(j => !!j.replay),
    Array(8).fill(false),
    'a replay sent again at every sync'
  );
  assert.deepStrictEqual([A.count('Acropora'), A.rvApplied()], [3, C.RV]);
  const back = JSON.parse(s.get({name: 'Ana', pin: '1234'}).data['reefid-sync-coral-progress']).Acropora;
  assert.strictEqual(back.ok + back.ko, 3);
});

test('a saved copy of the same rules version but behind the log does not undo the replay adopted here (Codex review #399)', async () => {
  // Two answers adopted and saved (rules version 1) by A; a third logged by a save refused as stale: in the log, not in
  // the saved copy.
  const s = loadCodeGs(withData());
  s.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': '{}'}, summary: {}, answers: [qa('a0', 0), qa('a1', 1)]});
  const A = app({sheet: s, SYNC: {name: 'Ana', pin: '1234', log: [], base: {}}});
  await A.syncPull();
  await A.syncPush();
  const r = s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, at: -1, answers: [qa('a2', 2)]});
  assert.strictEqual(r.error, 'stale');
  // B, never replayed, loads: the replay of the three answers is adopted. Its save must keep them.
  const B = app({sheet: s, SYNC: {name: 'Ana', pin: '1234', log: [], base: {}}});
  await B.syncPull();
  assert.deepStrictEqual([B.count('Acropora'), B.rvApplied()], [3, C.RV]);
  B.ctx.SYNC.dirty = true;
  await B.syncPush();
  await B.syncPush();
  assert.strictEqual(B.count('Acropora'), 3, 'was 2: the copy behind the log took the third answer away');
  const back = JSON.parse(s.get({name: 'Ana', pin: '1234'}).data['reefid-sync-coral-progress']).Acropora;
  assert.strictEqual(back.ok + back.ko, 3);
});

test('the recalculation card compares the progress before the sync, even when the pull brings the recalculated copy (Codex review #399)', async () => {
  // A adopts and saves the replay of 4 answers; B still holds a progress from the former model (95% on Acropora).
  const s = loadCodeGs(withData());
  s.post({
    name: 'Ana',
    pin: '1234',
    data: {'reefid-sync-coral-progress': '{}'},
    summary: {},
    answers: [0, 1, 2, 3].map(i => qa('a' + i, i))
  });
  const A = app({sheet: s, SYNC: {name: 'Ana', pin: '1234', log: [], base: {}}});
  await A.syncPull();
  await A.syncPush();
  const old = {Acropora: {ok: 3, ko: 1, h: '1101', pg: 0.95}},
    B = app({sheet: s, P: copy(old), SYNC: {name: 'Ana', pin: '1234', log: [], base: copy(old)}}),
    seen = [];
  B.ctx.slateGenera = () => ['Acropora'];
  B.ctx.rvNoticeAdd = (from, to, pct) => seen.push([...pct]); // a plain array of this realm
  const before = C.pctOf(old, ['Acropora']);
  await B.syncPull();
  assert.strictEqual(B.rvApplied(), C.RV);
  const after = C.pctOf(B.ctx.P, ['Acropora']);
  assert.notStrictEqual(before, after);
  assert.deepStrictEqual(seen, [[before, after]], 'was [after, after]: no card');
});

test('an anonymous send whose reply comes after signing in to an account: its replay is not adopted (Codex review #399)', async () => {
  const s = loadCodeGs(withData()),
    id = 'abcdefghij',
    acct = {
      'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 15, ko: 5, h: '1111111111', pg: 0.5}}),
      'reefid-sync-coral-quiz': '{}'
    };
  let during = null;
  const sheet = {get: q => s.get(q), post: b => (r => (during && during(), (during = null), r))(s.post(b))},
    a = app({sheet, ls: {'reefid-anon-id': JSON.stringify(id), 'reefid-anonq': JSON.stringify([qa('c1', 20)])}});
  // The player signs in to an existing account while the anonymous send is on its way (signIn then reloads the page).
  during = () => a.signIn('Ana', '1234', {found: true, data: acct});
  a.sendAnon();
  await settle();
  const P = a.store.get('reefid-sync-coral-progress', {});
  assert.strictEqual(P.Acropora.ok + P.Acropora.ko, 20, "the account's progress stays (was 1: the anonymous replay)");
  assert.strictEqual(a.rvApplied(), 0, "the account's rules version stays (its replay must still come)");
  assert.strictEqual(a.store.get('reefid-anonq', null), null, 'no anonymous queue made again');
});

// What every device must end with: the player's answers in the sheet's Answers tab (since their last reset), each once.
const rowsOf = (s, since = '') => s.sheets.Answers.rows.slice(1).filter(r => r[0] === 'Ana' && new Date(r[1]).toISOString() > since).length;
const total = P => Object.keys(P || {}).reduce((t, g) => (g === C.LEVEL ? t : t + (P[g].ok || 0) + (P[g].ko || 0)), 0);
const savedTotal = s => total(JSON.parse(s.get({name: 'Ana', pin: '1234'}).data['reefid-sync-coral-progress'] || '{}'));

test('the merge baseline after an adoption is the shared history: an unsent answer stays on top (Codex review #399)', async () => {
  // Two answers logged and saved under the older rules; A played them and has a third, not sent yet.
  const s = loadCodeGs(withData());
  const old = {Acropora: {ok: 2, ko: 0, h: '11', pg: 0.3}};
  s.post({
    name: 'Ana',
    pin: '1234',
    data: {'reefid-sync-coral-progress': JSON.stringify(old)},
    summary: {},
    answers: [qa('a0', 0), qa('a1', 1)]
  });
  let busy = 1;
  const flaky = {get: q => s.get(q), post: b => (b.name && busy-- > 0 ? {ok: false, error: 'busy'} : s.post(b))},
    A = app({
      sheet: flaky,
      SYNC: {name: 'Ana', pin: '1234', log: [qa('a2', 2)], base: old},
      P: {Acropora: {ok: 3, ko: 0, h: '111', pg: 0.4}}
    }),
    B = app({sheet: s, SYNC: {name: 'Ana', pin: '1234', log: [], base: {}}});
  // A adopts the replay at its load, its save is refused: its answer stays unsent, on top of the replay.
  await A.syncPush();
  assert.deepStrictEqual([A.count('Acropora'), A.ctx.SYNC.log.length], [3, 1]);
  assert.strictEqual(A.ctx.SYNC.base.Acropora.ok + A.ctx.SYNC.base.Acropora.ko, 2, 'the baseline is the replay alone (was 3)');
  // B adopts the replay of the two and saves it; then A syncs, and B again.
  await B.syncPull();
  await B.syncPush();
  await A.syncPush();
  await B.syncPull();
  await B.syncPush();
  assert.strictEqual(rowsOf(s), 3);
  assert.deepStrictEqual([A.count('Acropora'), B.count('Acropora'), savedTotal(s)], [3, 3, 3], 'was 2: the third answer lost');
});

test('an unsent answer is left out of the replay baseline: another device saving the replay of the two keeps it (Codex review #399)', async () => {
  // Codex's scenario: two answers logged (the saved copy, of the older rules, has them), a third on the same genus played
  // here and not sent yet. This device adopts the replay at a load: 3 here, the baseline the 2 of the log (was 3 and 3).
  const s = loadCodeGs(withData()),
    old = {Acropora: {ok: 2, ko: 0, h: '11', pg: 0.3}};
  s.post({
    name: 'Ana',
    pin: '1234',
    data: {'reefid-sync-coral-progress': JSON.stringify(old)},
    summary: {},
    answers: [qa('a0', 0), qa('a1', 1)]
  });
  const A = app({
    sheet: s,
    SYNC: {name: 'Ana', pin: '1234', log: [qa('a2', 2)], base: copy(old)},
    P: {Acropora: {ok: 3, ko: 0, h: '111', pg: 0.4}}
  });
  const j = await A.syncGet();
  assert.ok(A.replayAdopt(j.replay, A.ctx.SYNC.log, j.v));
  const base = A.ctx.SYNC.base.Acropora;
  assert.deepStrictEqual([A.count('Acropora'), base.ok + base.ko], [3, 2], 'the unsent answer went into the baseline');
  // Another device adopts the replay of the two and saves it; then this one syncs: three here, three in the sheet's copy.
  const B = app({sheet: s, SYNC: {name: 'Ana', pin: '1234', log: [], base: {}}});
  await B.syncPull();
  await B.syncPush();
  assert.strictEqual(savedTotal(s), 2);
  await A.syncPush();
  assert.deepStrictEqual([rowsOf(s), A.count('Acropora'), A.ctx.SYNC.log.length, savedTotal(s)], [3, 3, 0, 3], 'was 2: merged down');
  await B.syncPull();
  assert.strictEqual(B.count('Acropora'), 3);
});

test('misses logged after the exam take the learned mark away as the game would, a mere recalculation keeps it (Codex review #399)', async () => {
  // A record learned at answer 30 (30 right answers on new photos: the replayed bar about 0.9; the exam passed then),
  // saved; then answers logged by a save refused as stale (in the log, never in the saved copy). The device adopts the
  // replay.
  const right = Array.from({length: 30}, (_, i) => ({...qa('r' + i, i), a: 'Acropora', ok: 1, ph: 'acropora-wide-' + i})),
    exam = Date.parse(T(30)),
    miss = (i, n) =>
      Array.from({length: n}, (_, j) => ({...qa('m' + i + j, i + j), a: 'Montipora', ok: 0, ph: 'acropora-close-' + (i + j)}));
  const run = async later => {
    const s = loadCodeGs(withData()),
      rec = {Acropora: {ok: 30, ko: 0, h: '1111111111', pg: 0.9, mx: exam}};
    s.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': JSON.stringify(rec)}, summary: {}, answers: right});
    if (later.length) assert.strictEqual(s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, at: -1, answers: later}).error, 'stale');
    const A = app({sheet: s, P: copy(rec), SYNC: {name: 'Ana', pin: '1234', log: [], base: copy(rec)}}),
      why = [];
    A.ctx.mxRecalc = (fn, w) => {
      fn();
      if (!A.ctx.P.Acropora.mx) why.push(w('Acropora'));
    };
    await A.syncPull();
    assert.strictEqual(A.rvApplied(), C.RV);
    return [A.ctx.P.Acropora.mx, why];
  };
  // Lost as in the game (quiz.js answer, mxKept), with the rules card: 10 misses after the exam (was: pg 0.19 and still
  // learned, its exam never coming back), and already two in a row.
  assert.deepStrictEqual(await run(miss(40, 10)), [undefined, ['rules']], '10 misses after the exam');
  assert.deepStrictEqual(await run(miss(40, 2)), [undefined, ['rules']], '2 misses after the exam');
  // Kept: no answer after the exam (a recalculation alone), one miss after it (the game keeps the mark through one), and
  // misses before the exam (the bar was won back before it).
  assert.deepStrictEqual(await run([]), [exam, []], 'no answer after the exam');
  assert.deepStrictEqual(await run(miss(40, 1)), [exam, []], 'one miss after the exam');
  assert.deepStrictEqual(await run(miss(10, 2)), [exam, []], 'two misses before the exam');
});

// A device's learned marks lost in a sync, with the reason mxRecalc gave (the card this device shows).
const watchMarks = A => {
  const lost = [];
  A.ctx.mxRecalc = (fn, w) => {
    const m0 = Object.keys(A.ctx.P).filter(g => A.ctx.P[g] && A.ctx.P[g].mx);
    fn();
    m0.filter(g => !(A.ctx.P[g] || {}).mx).forEach(g => lost.push([g, typeof w === 'function' ? w(g) : w || 'bkt']));
  };
  return lost;
};
const rights = n => Array.from({length: n}, (_, i) => ({...qa('r' + i, i), a: 'Acropora', ok: 1, ph: 'acropora-wide-' + i}));
const misses = (i, n) =>
  Array.from({length: n}, (_, j) => ({...qa('m' + i + j, i + j), a: 'Montipora', ok: 0, ph: 'acropora-close-' + (i + j)}));

test("a learned mark that another device's saved replay revoked is announced on this device too (Codex review #399)", async () => {
  // Learned at answer 30; 10 misses after it logged by a refused save. B adopts the replay (the mark goes, its card)
  // and saves it; A, still on the older rules with the mark, loads that copy.
  const s = loadCodeGs(withData()),
    rec = {Acropora: {ok: 30, ko: 0, h: '1111111111', pg: 0.9, mx: Date.parse(T(30))}};
  s.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': JSON.stringify(rec)}, summary: {}, answers: rights(30)});
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, at: -1, answers: misses(40, 10)});
  const dev = () => app({sheet: s, P: copy(rec), SYNC: {name: 'Ana', pin: '1234', log: [], base: copy(rec)}}),
    B = dev(),
    A = dev(),
    lb = watchMarks(B),
    la = watchMarks(A);
  await B.syncPull();
  B.ctx.SYNC.dirty = true;
  await B.syncPush();
  assert.deepStrictEqual(lb, [['Acropora', 'rules']]);
  assert.strictEqual(JSON.parse(s.get({name: 'Ana', pin: '1234'}).data['reefid-sync-coral-rv']), C.RV);
  await A.syncPull();
  assert.strictEqual(A.ctx.P.Acropora.mx, undefined);
  assert.deepStrictEqual(la, [['Acropora', 'rules']], 'the merge took the mark before mxRecalc saw it: no card here');
});

test('an exam in course ends at a miss logged after it began, as the game ends it (Codex review #399)', async () => {
  // 30 right answers, then an exam begun at answer 25 with 4 questions passed (saved); misses logged by a refused save.
  const run = async (later, ex) => {
    const s = loadCodeGs(withData()),
      rec = {Acropora: {ok: 30, ko: 0, h: '1111111111', pg: 0.9, at: Date.parse(T(29)), ex}};
    s.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': JSON.stringify(rec)}, summary: {}, answers: rights(30)});
    if (later.length) s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, at: -1, answers: later});
    const A = app({sheet: s, P: copy(rec), SYNC: {name: 'Ana', pin: '1234', log: [], base: copy(rec)}});
    await A.syncPull();
    assert.strictEqual(A.rvApplied(), C.RV);
    return (A.ctx.P.Acropora.ex || {}).k;
  };
  const ex = {k: 4, v: ['wide'], at: 28, ts: Date.parse(T(25))},
    old = {k: 4, v: ['wide'], at: 28}; // saved before the exam had its start time: the genus's last answer instead
  assert.strictEqual(await run(misses(40, 1), ex), undefined, 'a miss after the exam began: was still 4 of 5');
  assert.strictEqual(await run(misses(40, 1), old), undefined, 'the same, an exam saved without its start');
  assert.strictEqual(await run([], ex), 4, 'no miss: kept');
  assert.strictEqual(await run(misses(10, 1), ex), 4, 'a miss before the exam began: kept');
});

test('answers queued here older than answers another device logged: no replay adopted until they are in the log (Codex review #399)', async () => {
  // 10 misses logged by another device at answers 100-109; this device, offline, played 20 right answers before them.
  const s = loadCodeGs(withData()),
    later = misses(100, 10);
  s.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': '{}'}, summary: {}, answers: later});
  const mine = rights(20),
    P = {Acropora: {ok: 20, ko: 0, h: '1111111111', pg: 0.9}},
    A = app({sheet: s, P: copy(P), SYNC: {name: 'Ana', pin: '1234', log: mine, base: {}}});
  await A.syncPush();
  await A.syncPull();
  // The chronological replay of the 30: the 20 right answers, then the 10 misses.
  const a = A.ctx.P.Acropora;
  assert.deepStrictEqual([A.ctx.SYNC.log.length, A.rvApplied(), a.ok, a.ko], [0, C.RV, 20, 10]);
  assert.strictEqual(a.h, '0000000000', 'the misses are the latest results (was ten right answers on top)');
  assert.ok(a.pg < 0.5, `pg ${a.pg} (was 0.96)`);
  assert.strictEqual(JSON.parse(s.get({name: 'Ana', pin: '1234'}).data['reefid-sync-coral-progress']).Acropora.h, '0000000000');
});

test("anonymous answers older than the account's own join it at sign-in: the combined replay, in time order (Codex review #399)", async () => {
  for (const sent of [false, true]) {
    // The account: 10 misses, played on another device, replayed and saved under the current rules.
    const s = loadCodeGs(withData()),
      B = app({sheet: s, SYNC: {name: 'Ana', pin: '1234', log: misses(100, 10), base: {}, dirty: true}});
    await B.syncPush();
    await B.syncPush();
    assert.strictEqual(JSON.parse(s.get({name: 'Ana', pin: '1234'}).data['reefid-sync-coral-rv']), C.RV);
    // This device: 20 right answers played earlier without an account (still queued, or already sent anonymously).
    const id = 'abcdefghij',
      mine = rights(20),
      P20 = {Acropora: {ok: 20, ko: 0, h: '1111111111', pg: 0.9}};
    if (sent) assert.ok(s.post({anon: id, anonAnswers: mine}).log);
    const A = app({
      sheet: s,
      P: copy(P20),
      ls: {
        'reefid-log0': JSON.stringify(mine),
        'reefid-anon-id': JSON.stringify(id),
        'reefid-anon-base': '{}',
        'reefid-sync-coral-progress': JSON.stringify(P20)
      }
    });
    A.signIn('Ana', '1234', s.get({name: 'Ana', pin: '1234'}));
    A.ctx.P = A.store.get('reefid-sync-coral-progress', {}); // what the page reloads with
    assert.strictEqual(A.rvApplied(), 0, `${sent ? 'sent' : 'queued'}: the account's version is not this progress's`);
    await A.syncPush();
    await A.syncPull();
    // Replayed in time order: the 20 right answers, then the 10 misses (was pg 0.93 and ten right answers last).
    const a = A.ctx.P.Acropora,
      back = JSON.parse(s.get({name: 'Ana', pin: '1234'}).data['reefid-sync-coral-progress']).Acropora;
    assert.deepStrictEqual([A.rvApplied(), a.ok, a.ko, a.h], [C.RV, 20, 10, '0000000000'], sent ? 'sent' : 'queued');
    assert.ok(a.pg < 0.5, `${sent ? 'sent' : 'queued'}: pg ${a.pg}`);
    assert.deepStrictEqual([back.ok + back.ko, back.h], [30, '0000000000']);
  }
});

test("an answer logged by a refused save, then saved in another device's replay, is counted once (Codex review #399)", async () => {
  // A plays and saves two answers (rules version applied), then a third whose save is refused (logged, not saved).
  const s = loadCodeGs(withData());
  let refuse = false;
  const sheetA = {get: q => s.get(q), post: b => s.post(refuse && b.name ? {...b, at: -1} : b)},
    A = app({sheet: sheetA, SYNC: {name: 'Ana', pin: '1234', log: [qa('a0', 0), qa('a1', 1)], base: {}, dirty: true}});
  await A.syncPush();
  await A.syncPush();
  assert.deepStrictEqual([A.count('Acropora'), A.rvApplied(), savedTotal(s)], [2, C.RV, 2]);
  refuse = true;
  A.ctx.SYNC.log = [qa('a2', 2)];
  A.ctx.P.Acropora.ok++;
  A.ctx.SYNC.dirty = true;
  await A.syncPush();
  refuse = false;
  assert.deepStrictEqual([rowsOf(s), A.count('Acropora'), A.ctx.SYNC.log.length, savedTotal(s)], [3, 3, 0, 2]);
  // B, a new device, adopts the replay of the three and saves it; then A syncs, twice.
  const B = app({sheet: s, SYNC: {name: 'Ana', pin: '1234', log: [], base: {}, dirty: true}});
  await B.syncPush();
  assert.strictEqual(savedTotal(s), 3);
  await A.syncPush();
  await A.syncPush();
  await A.syncPull();
  assert.deepStrictEqual([A.count('Acropora'), savedTotal(s)], [3, 3], "was 4: the logged answer counted again as A's own");
});

test('an admin merge of two replayed accounts brings the replay of both histories in time order (Codex review #399)', async () => {
  // Two accounts of one person, each replayed and saved: 20 older right answers, 10 newer misses.
  const s = loadCodeGs(withData()),
    TOK = 'ghp_write000000000000000000',
    dev = (name, log) => app({sheet: s, SYNC: {name, pin: '1234', log, base: {}, dirty: true}}),
    O = dev('Old', rights(20)),
    A = dev('Ana', misses(100, 10));
  for (const d of [O, A]) {
    await d.syncPush();
    await d.syncPush();
  }
  // The admin merges Old into Ana (admin.js: the two saved copies through core.js mergeUsers, written by the sheet).
  const into = s.post({userData: 'Ana', token: TOK}),
    from = s.post({userData: 'Old', token: TOK});
  assert.ok(s.post({userMerge: {from: 'Old', into: 'Ana', data: C.mergeUsers(from.data, into.data), at: into.rev}, token: TOK}).ok);
  // Ana's device syncs: the 30 answers replayed in time order (was the merged model kept: pg 0.96, ten right last).
  await A.syncPull();
  await A.syncPush();
  await A.syncPull();
  const a = A.ctx.P.Acropora,
    back = JSON.parse(s.get({name: 'Ana', pin: '1234'}).data['reefid-sync-coral-progress']).Acropora;
  assert.deepStrictEqual([a.ok, a.ko, a.h, A.rvApplied()], [20, 10, '0000000000', C.RV]);
  assert.ok(a.pg < 0.5, `pg ${a.pg}`);
  assert.deepStrictEqual([back.ok + back.ko, back.h], [30, '0000000000']);
});

test('property: devices, unsent answers, an older client and a reset in flight: every device ends with the rows of the log', async () => {
  // A small deterministic random generator, so a failure replays the same way.
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const G = ['Acropora', 'Porites', 'Montipora', 'Pocillopora'];
  for (let run = 0; run < 40; run++) {
    const s = loadCodeGs(withData());
    let clock = 0,
      during = null,
      calm = false,
      resetAt = '';
    const tick = () => new Date(Date.UTC(2026, 10, 3, 6, 0, 0) + 1000 * ++clock).toISOString();
    const ans = (id, g, ok) => ({
      id,
      t: tick(),
      g,
      a: ok ? g : G[(G.indexOf(g) + 1) % G.length],
      ok: ok ? 1 : 0,
      m: 'quiz',
      ph: g.toLowerCase() + '-wide-' + Math.floor(rnd() * 5),
      ch: G.join(' '),
      e: 0.8,
      th: 1,
      nw: 1
    });
    // Answers logged before any device here, with the progress write lost.
    const first = Array.from({length: 1 + Math.floor(rnd() * 3)}, (_, i) => ans('f' + run + i, G[i % 4], rnd() < 0.8));
    s.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': '{}'}, summary: {}, answers: first});
    // Two devices on this app; a save may be refused (busy) and a reset may come while a save is on its way.
    const sheetFor = () => ({
      get: q => s.get(q),
      post: b => {
        if (b.name && !calm && rnd() < 0.2) return {ok: false, error: 'busy'};
        const r = s.post(b);
        if (during) (during(), (during = null));
        return r;
      }
    });
    const devs = [0, 1].map(() => app({sheet: sheetFor(), SYNC: {name: 'Ana', pin: '1234', log: [], base: {}}}));
    let n = 0;
    const play = d => {
      const g = G[Math.floor(rnd() * 4)],
        ok = rnd() < 0.75,
        a = ans('d' + run + 'x' + n++, g, ok),
        P = d.ctx.P,
        x = (P[g] = P[g] || {ok: 0, ko: 0, h: ''});
      x[ok ? 'ok' : 'ko']++;
      x.h = ((x.h || '') + (ok ? 1 : 0)).slice(-10);
      d.ctx.SYNC.log = [...(d.ctx.SYNC.log || []), a];
      d.store.set('reefid-sync-coral-progress', P);
    };
    // A device still on the app from before the replay: it loads the saved copy, answers once, saves (no rules version).
    const older = () => {
      const g = G[Math.floor(rnd() * 4)],
        ok = rnd() < 0.75,
        j = s.get({name: 'Ana', pin: '1234'}),
        data = {...(j.data || {})},
        P = JSON.parse(data['reefid-sync-coral-progress'] || '{}'),
        x = (P[g] = P[g] || {ok: 0, ko: 0, h: ''}),
        a = ans('o' + run + 'x' + n++, g, ok);
      x[ok ? 'ok' : 'ko']++;
      x.h = ((x.h || '') + (ok ? 1 : 0)).slice(-10);
      delete data['reefid-sync-coral-rv'];
      data['reefid-sync-coral-progress'] = JSON.stringify(P);
      s.post({name: 'Ana', pin: '1234', data, summary: {}, answers: [a], av: '180'});
    };
    for (let step = 0; step < 25; step++) {
      const x = rnd(),
        d = devs[Math.floor(rnd() * 2)];
      if (x < 0.45) play(d);
      else if (x < 0.7) await d.syncPush();
      else if (x < 0.85) await d.syncPull();
      else if (x < 0.95) older();
      else if (!resetAt) {
        // A reset on device d while its save is on its way.
        during = () => {
          resetAt = tick();
          d.ctx.P = {};
          d.store.set('reefid-sync-coral-reset', resetAt);
          d.store.set('reefid-sync-coral-progress', {});
        };
        play(d);
        await d.syncPush();
      }
    }
    // Every device saves until nothing changes (saves no longer refused), then loads. Saves only: a load between them
    // set the version back to 0, so the next save's load brought the replay and saved the version, which hid the loop
    // (Codex review #399).
    calm = true;
    for (let round = 0; round < 4; round++)
      for (const d of devs) {
        d.ctx.SYNC.dirty = true;
        await d.syncPush();
      }
    for (const d of devs) await d.syncPull();
    const want = rowsOf(s, resetAt);
    devs.forEach((d, i) =>
      assert.strictEqual(total(d.ctx.P), want, `run ${run}: device ${i} counts ${total(d.ctx.P)} answers, the log ${want}`)
    );
    assert.strictEqual(savedTotal(s), want, `run ${run}: the saved copy`);
    // Converged: the saved copy and every device at the rules version, and no more replay in any reply (Codex review #399:
    // the saved version stayed 0 and every save's reply carried the full replay again).
    const savedRv = Number(JSON.parse(s.get({name: 'Ana', pin: '1234'}).data['reefid-sync-coral-rv'] || '0'));
    assert.deepStrictEqual([savedRv, ...devs.map(d => d.rvApplied())], [C.RV, C.RV, C.RV], `run ${run}: the rules versions`);
    // Then saves and loads in any order.
    const from = devs.map(d => d.got.length);
    for (let step = 0; step < 10; step++) {
      const d = devs[Math.floor(rnd() * 2)];
      if (rnd() < 0.6) {
        d.ctx.SYNC.dirty = true;
        await d.syncPush();
      } else await d.syncPull();
    }
    devs.forEach((d, i) => {
      const again = d.got.slice(from[i]).filter(j => j.replay).length;
      assert.strictEqual(again, 0, `run ${run}: device ${i} got the replay again ${again} times after converging`);
      assert.strictEqual(total(d.ctx.P), want, `run ${run}: device ${i} after converging`);
    });
    assert.strictEqual(savedTotal(s), want, `run ${run}: the saved copy after converging`);
  }
});

test('the recalculation card is due only when the progress % moved by 5 points or more, either way (Pierre, 2026-11-03)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'progress.js'), 'utf8'),
    block = src.slice(src.indexOf('const RVN = '), src.indexOf('let rvT = 0;')),
    saved = {},
    ctx = {
      ...C,
      window: {},
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))}
    };
  vm.createContext(ctx);
  vm.runInContext(block + '\nthis.add = rvNoticeAdd;', ctx);
  const due = pct => {
    delete saved['reefid-rv-msg'];
    ctx.add(0, C.RV, pct);
    return ctx.store.get('reefid-rv-msg', {}).due.includes(C.RV);
  };
  assert.deepStrictEqual(
    [
      [60, 60],
      [60, 64],
      [60, 56],
      [60, 65],
      [60, 55],
      [83, 33]
    ].map(due),
    [false, false, false, true, true, true],
    'a card for 5 points or more only'
  );
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
      MXL: {KEY: 'reefid-mx-lost'},
      ACHNEW: 'reefid-ach-new',
      achUnseen: () => [],
      achDot: () => {},
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))}
    };
  ctx.syncSoon = () => ctx.synced++;
  ctx.achSnap = () => ({total: 40, met: 40, q: [30, 20, 10], learned: 0, pct: 60, streak: 0, elo: 0, group: false, bonus: 0});
  vm.createContext(ctx);
  vm.runInContext(block + '\nthis.M = {achRecheck, achMerge, ACHK};', ctx);
  ctx.store.set('reefid-sync-ach', A);
  ctx.store.set('reefid-mx-lost', {ach: 1, due: {Acropora: 1}});
  return {
    ...ctx.M,
    ctx,
    rec: () => ctx.store.get('reefid-sync-ach', null)
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

// Codex review #444: this device's answers replayed on top of an adopted replay follow the rules of the script that sent
// it. Before sheet v32 (core.js RT_SHEET) the answer time weighs nothing, as in the live game (model.js rtOn): the
// replay on top must not weigh it either (AGENTS.md 7a); from v32, it does, as the sheet's own replay would.
test('a replay adopted from a script before v32 replays the pending answers without the answer time (Codex review #444)', () => {
  // 20 right answers on Acropora, timed: fast ones first, slower later, so the weights are far from 1 once there is a median.
  const pending = Array.from({length: 20}, (_, i) => ({...qa('p' + i, i), a: 'Acropora', ok: 1, rt: i < 12 ? 6 : 2.5}));
  const rows = pending.map(a => C.logRow(a, '~me')),
    start = {'~me': {P: {}, n: 0, used: 0, rep: 0}},
    gen = {...DATA.x.gen, ...DATA.gen},
    th = time => C.replayProgress(rows, {gen, conf: {}, start, time})['~me'].P.Acropora.th;
  assert.notStrictEqual(th(true), th(false), 'the time changes the ability on these answers');
  for (const [v, time] of [
    [C.RT_SHEET - 1, false],
    [C.RT_SHEET, true]
  ]) {
    const a = app();
    assert.strictEqual(a.replayAdopt({rv: C.RV, n: 0, rec: {}, ids: []}, pending, v), true);
    assert.strictEqual(a.ctx.P.Acropora.th, th(time), `script v${v}: ability ${a.ctx.P.Acropora.th}`);
  }
});
