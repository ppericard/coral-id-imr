// The fish progress replayed by the sheet, adopted by the app (ROADMAP "Fish progress replayed from the answer log";
// Pierre, 2026-11-08, Q298, Q310): sync.js replayAdoptS for another subject than the corals, with today's bars as a floor
// (core.js replayFloor), under its own rules versions (core.js FISH_RVS), only from the script that replays it under this
// app's rules (core.js REPLAYS_SHEET; rule D4).
// The app's own sync.js run in Node on stubs, against the sync script on an in-memory sheet (tests/gas.js); nothing
// leaves this process (rule D1). The harness is tests/adopt.test.js's, with a subject switch (inSubject) that really
// switches: SUBJ, its progress P and its keys.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const {loadCodeGs} = require('./gas.js');

const ROOT = path.join(__dirname, '..'),
  DATA = require('../data.json'),
  DJSON = fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'),
  FJSON = fs.readFileSync(path.join(ROOT, 'fish.json'), 'utf8'),
  FGEN = C.fishReplayGen(JSON.parse(FJSON)),
  FS = C.subjectOf('fish'),
  SV = Number(/const VERSION = (\d+);/.exec(fs.readFileSync(path.join(ROOT, 'tools', 'sync', 'Code.gs'), 'utf8'))[1]);
const withFiles = () => ({
  fetch: url =>
    /\/main\/data\.json$/.test(url)
      ? {getResponseCode: () => 200, getContentText: () => DJSON}
      : /\/main\/fish\.json$/.test(url)
        ? {getResponseCode: () => 200, getContentText: () => FJSON}
        : null
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
function app({ls = {}, SYNC = null, sheet = null} = {}) {
  const prog = fs.readFileSync(path.join(ROOT, 'progress.js'), 'utf8'),
    appjs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
    groups = /const GROUPS_KEY = [\s\S]*?\nconst subjOpen = .*\n/.exec(appjs)[0],
    loadData = /const loadData = [\s\S]*?;\n/.exec(prog)[0],
    progData = /const progData = [\s\S]*?\n};\n/.exec(prog)[0],
    sent = [],
    cards = [];
  const answer = (u, o) => {
    const url = new URL(String(u)),
      body = o && o.body ? JSON.parse(o.body) : null;
    sent.push(body || Object.fromEntries(url.searchParams));
    const j = sheet ? (body ? sheet.post(body) : sheet.get(Object.fromEntries(url.searchParams))) : {ok: false};
    return Promise.resolve({json: () => JSON.parse(JSON.stringify(j))});
  };
  const ls0 = storage(ls),
    get = (k, d) => (ls0.getItem(k) === null ? d : JSON.parse(ls0.getItem(k)));
  let ctx = null;
  ctx = {
    ...C,
    console,
    crypto: require('crypto').webcrypto,
    localStorage: ls0,
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
    navigator: {onLine: true},
    setInterval: () => 0,
    setTimeout: () => 0,
    clearTimeout: () => {},
    SUBJ: C.subjectOf('coral'),
    SUBJECTS: C.SUBJECTS,
    sKey: name => C.subjKey(ctx.SUBJ.id, name),
    sDev: name => C.subjDev(ctx.SUBJ.id, name),
    // The subject switch as app.js runs it: the subject, its progress (P) and its keys, back afterwards.
    inSubject: (id, fn) => {
      const S = C.subjectOf(id);
      if (S === ctx.SUBJ) return fn();
      const was = ctx.SUBJ,
        wasP = ctx.P;
      ls0.setItem(C.subjKey(was.id, 'progress'), JSON.stringify(wasP));
      ctx.SUBJ = S;
      ctx.P = get(C.subjKey(id, 'progress'), {}) || {};
      try {
        return fn();
      } finally {
        ls0.setItem(C.subjKey(id, 'progress'), JSON.stringify(ctx.P));
        ctx.SUBJ = was;
        ctx.P = wasP;
      }
    },
    SUBJ_VISIT: 0,
    SYNC_URL: 'https://script.google.com/macros/s/test/exec',
    LOCAL: false,
    SYNC,
    DATA,
    P: get('reefid-sync-coral-progress', {}) || {},
    UNITS: {coral: {slate: () => []}, fish: {slate: () => [], gen: () => FGEN}},
    PMEM: undefined,
    PCONF: {},
    PFMT: {},
    ACHK: 'reefid-sync-ach',
    sheetFetch: answer,
    fetch: answer,
    mxRecalc: f => f(),
    answersSoFar: () => 0,
    achMerge: () => {},
    route: () => {},
    rvNoticeAdd: (from, to, pct) => cards.push([ctx.SUBJ.id, from, to, pct]),
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
     const save = () => store.set(subjKey(SUBJ.id, 'progress'), P);\n` +
      loadData +
      progData +
      groups +
      fs.readFileSync(path.join(ROOT, 'sync.js'), 'utf8') +
      '\nbindSync = () => {};\nthis.A = {replayAdopt, replaysAdopt, rvApplied, rvKey, syncGet, syncPush, syncPull, store};',
    ctx
  );
  const A = ctx.A;
  A.ctx = ctx;
  A.sent = sent;
  A.cards = cards;
  // Out of the vm's realm (plain objects), for deepStrictEqual.
  A.fish = () => JSON.parse(JSON.stringify(ctx.SUBJ === FS ? ctx.P : get(C.subjKey('fish', 'progress'), {})));
  A.base = () => JSON.parse(JSON.stringify(ctx.SYNC.fbase || {}));
  return A;
}
const T = i => new Date(Date.UTC(2026, 10, 7, 6, 0, i)).toISOString();
// Fish answers as the app logs them (quiz.js answer: subject, rank, scoring record), 1 in 3 a mix-up with the butterflyfishes.
const fa = (id, i) => ({
  id,
  t: T(i),
  s: 'fish',
  rk: 'family',
  g: 'f:Damselfishes',
  a: i % 3 === 2 ? 'f:Butterflyfishes' : 'f:Damselfishes',
  ok: i % 3 === 2 ? 0 : 1,
  m: 'quiz|c',
  ph: 'fi' + (100 + (i % 4)),
  ch: 'f:Damselfishes f:Butterflyfishes f:Angelfishes f:Wrasses',
  e: 0.8,
  th: 1,
  sc: {d: 0, r: 1}
});
const F = Array.from({length: 9}, (_, i) => fa('f' + i, i));
// The fish record a device holds today: the damselfishes under the former moving average far above what the 9 answers
// replay to, a family with no logged answer, a level.
const today = {
  'f:Damselfishes': {ok: 6, ko: 0, h: '111111', pg: 0.9},
  'f:Angelfishes': {ok: 2, ko: 0, h: '11', pg: 0.3},
  '~level': {ok: 8, ko: 0, th: 1.2}
};
const bar = (P, n) => C.scoreOf(P[n], P, n);
// The in-memory sheet's replies as the script that replays fish says them (its VERSION is assigned at merge).
const atv = (s, v = C.REPLAYS_SHEET) => ({get: q => ({...s.get(q), v}), post: b => ({...s.post(b), v})}),
  FRV = C.rvOf('fish');
const seed = (s, data) => s.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': '{}', ...data}, summary: {}, answers: F});

test("the fish replay adopted from the script that replays it: today's bars a floor, the rest replayed, its own rules version", async () => {
  const s = loadCodeGs(withFiles()),
    data = {'reefid-sync-fish-progress': JSON.stringify(today)};
  seed(s, data);
  const a = app({
    sheet: atv(s),
    ls: {'reefid-sync-fish-progress': JSON.stringify(today), 'reefid-sync-coral-rv': String(C.RV)},
    SYNC: {name: 'Ana', pin: '1234', log: [], base: {}, fbase: JSON.parse(JSON.stringify(today)), srv: 1}
  });
  await a.syncPush(); // the first load says the script's version (sheetV), the save asks for the fish replay
  assert.ok(
    a.sent.some(b => b.rvs && b.rvs.fish === 0),
    'asked with its own rules version'
  );
  const P = a.fish(),
    want = C.replayProgress(
      F.map(x => C.logRow(x, 'ana')),
      {gen: FGEN}
    ).ana.P;
  assert.strictEqual(a.rvApplied(FS), FRV, 'its own rules version');
  assert.strictEqual(a.rvApplied(), C.RV, "the corals' untouched");
  assert.ok(!a.sent.some(b => (b.rv !== undefined && Number(b.rv) < C.RV) || b.rv === '0'), 'no coral replay asked for');
  // The floor: the damselfishes' bar stays (the replayed one is lower), as the device held it, no rules version.
  assert.ok(bar(want, 'f:Damselfishes') < bar(today, 'f:Damselfishes'));
  assert.deepStrictEqual(P['f:Damselfishes'], today['f:Damselfishes']);
  // The butterflyfishes (a false alarm, never held here): the replay's, under its rules version.
  assert.strictEqual(P['f:Butterflyfishes'].rv, FRV);
  assert.deepStrictEqual(P['f:Butterflyfishes'].dp, want['f:Butterflyfishes'].dp);
  // No logged answer: kept as it was.
  assert.deepStrictEqual(P['f:Angelfishes'], today['f:Angelfishes']);
  // No bar went down.
  Object.keys(today).forEach(n => n !== '~level' && assert.ok(bar(P, n) >= bar(today, n) - 1e-9, n));
  // The adopted version goes with the next save; the merge baseline is the replay's for the units taken from it.
  const last = [...a.sent].reverse().find(b => b.data);
  assert.strictEqual(JSON.parse(last.data['reefid-sync-fish-rv']), FRV);
  assert.deepStrictEqual(a.base()['f:Damselfishes'], today['f:Damselfishes']);
  assert.strictEqual(a.base()['f:Butterflyfishes'].rv, FRV);
  // Its card: the fish rules versions from none, told as the fish subject's (progress.js rvNoticeAdd sid).
  assert.deepStrictEqual(
    a.cards.map(c => c.slice(0, 3)),
    [['fish', 0, FRV]]
  );
  // Adopted once: the next sync asks with the version applied and gets nothing more.
  const n = a.cards.length;
  await a.syncPush();
  assert.strictEqual(a.cards.length, n);
  assert.ok(!a.sent.slice(-2).some(b => b.rvs && b.rvs.fish < FRV));
});

test('an older script (before REPLAYS_SHEET): no fish replay asked for or adopted, the fish progress as before', async () => {
  const s = loadCodeGs(withFiles());
  seed(s, {'reefid-sync-fish-progress': JSON.stringify(today)});
  // The script's replies say an older version, with a fish replay in them all the same.
  const old = C.REPLAYS_SHEET - 1,
    sh = {
      get: q => ({...s.get({...q, rv_fish: '0'}), v: old}),
      post: b => ({...s.post({...b, rvs: {fish: 0}}), v: old})
    },
    a = app({
      sheet: sh,
      ls: {'reefid-sync-fish-progress': JSON.stringify(today), 'reefid-sync-coral-rv': String(C.RV)},
      SYNC: {name: 'Ana', pin: '1234', log: [], base: {}, fbase: JSON.parse(JSON.stringify(today)), srv: 1}
    });
  await a.syncPush();
  assert.ok(!a.sent.some(b => b.rvs || b.rv_fish !== undefined), 'nothing asked');
  assert.strictEqual(a.rvApplied(FS), 0);
  assert.deepStrictEqual(a.fish(), today);
  assert.deepStrictEqual(a.cards, []);
  // The same reply from the script that replays fish: adopted.
  assert.strictEqual(
    a.replaysAdopt(
      {...s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [], rvs: {fish: 0}}), v: C.REPLAYS_SHEET},
      [],
      undefined
    ),
    true
  );
  assert.strictEqual(a.rvApplied(FS), FRV);
});

test('a fish reset made on this device while the save was on its way: its replay is not adopted (the cutoff)', () => {
  const s = loadCodeGs(withFiles());
  seed(s, {});
  const a = app({sheet: s, ls: {'reefid-sync-fish-reset': JSON.stringify(T(30))}, SYNC: {name: 'Ana', pin: '1234', log: [], base: {}}}),
    j = {...s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [], rvs: {fish: 0}}), v: C.REPLAYS_SHEET};
  assert.ok(j.replays && j.replays.fish);
  assert.strictEqual(a.replaysAdopt(j, [], {fish: ''}), false, 'sent before the reset');
  assert.strictEqual(a.rvApplied(FS), 0);
  assert.strictEqual(a.replaysAdopt(j, [], {fish: T(30)}), true);
});

test('answers logged from a refused save (SYNC.lg): the flag holds for fish until its own replay is adopted', () => {
  const s = loadCodeGs(withFiles());
  seed(s, {});
  const a = app({
      sheet: s,
      ls: {'reefid-sync-fish-rv': String(FRV), 'reefid-sync-coral-rv': String(C.RV)},
      SYNC: {name: 'Ana', pin: '1234', log: [], base: {}, lg: 1, lgOk: ['coral']}
    }),
    j = {...s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [], rvs: {fish: 0}}), v: C.REPLAYS_SHEET};
  assert.strictEqual(j.replays.fish.rv, FRV);
  // The corals' replay already adopted: the same version again for fish, its baseline lacking the logged answers.
  assert.strictEqual(a.replaysAdopt(j, [], undefined), true);
  assert.ok(!a.ctx.SYNC.lg && !a.ctx.SYNC.lgOk, 'cleared once every subject replayed has its own');
  assert.strictEqual(a.replaysAdopt(j, [], undefined), false, 'then once per version, as the corals');
});
