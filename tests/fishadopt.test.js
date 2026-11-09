// The fish progress replayed by the sheet, adopted by the app (ROADMAP "Fish progress replayed from the answer log";
// Pierre, 2026-11-08, Q298): sync.js replayAdoptS for another subject than the corals, the log the only reference (no floor
// since fish rules version 2: Pierre, 2026-11-09, Q330), under its own rules versions (core.js FISH_RVS), only from the script that replays it under this
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
const {loadCodeGs, bodyOf, madeBefore} = require('./gas.js');

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
      body = o && o.body ? bodyOf(o.body) : null; // a light save unwrapped, as the script reads it
    sent.push(body || Object.fromEntries(url.searchParams));
    const j = sheet ? (body ? sheet.post(body) : sheet.get(Object.fromEntries(url.searchParams))) : {ok: false};
    // A reply that never came (the sheet's stub answers an Error: it may have applied the request all the same).
    if (j instanceof Error) return Promise.reject(j);
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
    navigator: {onLine: true, userAgent: 'Mozilla/5.0 (node test)'},
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

test('the fish replay adopted from the script that replays it: the log alone, no floor, its own rules version, no card', async () => {
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
  // No floor (Q330): the damselfishes' bar is the replay's, lower than the saved one, its answers the log's (9), under
  // the rules version.
  assert.ok(bar(want, 'f:Damselfishes') < bar(today, 'f:Damselfishes'));
  assert.ok(Math.abs(bar(P, 'f:Damselfishes') - bar(want, 'f:Damselfishes')) < 1e-9);
  assert.deepStrictEqual([P['f:Damselfishes'].ok, P['f:Damselfishes'].ko, P['f:Damselfishes'].rv], [6, 3, FRV]);
  // The butterflyfishes (a false alarm, never held here): the replay's, under its rules version.
  assert.strictEqual(P['f:Butterflyfishes'].rv, FRV);
  assert.deepStrictEqual(P['f:Butterflyfishes'].dp, want['f:Butterflyfishes'].dp);
  // No logged answer: its saved answers go (rule D9).
  assert.ok(!P['f:Angelfishes']);
  // The adopted version goes with the next save; the merge baseline is the replay's.
  const last = [...a.sent].reverse().find(b => b.data);
  assert.strictEqual(JSON.parse(last.data['reefid-sync-fish-rv']), FRV);
  assert.deepStrictEqual(a.base()['f:Damselfishes'].ds, P['f:Damselfishes'].ds);
  assert.strictEqual(a.base()['f:Butterflyfishes'].rv, FRV);
  // Told as the fish subject's (progress.js rvNoticeAdd sid), with no card due (Q330: no card for a recalculation).
  assert.deepStrictEqual(
    a.cards.map(c => c.slice(0, 3)),
    [['fish', 0, FRV]]
  );
  assert.deepStrictEqual(C.rvMsgs(0, FRV, false, 'fish'), []);
  // Adopted once: the next sync asks with the version applied and gets nothing more.
  const n = a.cards.length;
  await a.syncPush();
  assert.strictEqual(a.cards.length, n);
  assert.ok(!a.sent.slice(-2).some(b => b.rvs && b.rvs.fish < FRV));
});

// Rule D9 (Pierre, 2026-11-09, Q322, Q330): a device holding its fish record twice under fish rules version 1 takes the
// log's counts on every unit at its next sync, and its save puts them on the sheet.
test('a device holding its fish record twice: every unit takes the log, on the device and on the sheet', async () => {
  const s = loadCodeGs(withFiles()),
    want = C.replayedOf(
      {
        P: C.replayProgress(
          F.map(x => C.logRow(x, 'ana')),
          {gen: FGEN}
        ).ana.P
      },
      {},
      FRV - 1
    ),
    twice = Object.fromEntries(Object.entries(want).map(([u, r]) => [u, {...r, ok: 2 * (r.ok || 0), ko: 2 * (r.ko || 0)}])),
    n = x => ((x && x.ok) || 0) + ((x && x.ko) || 0),
    data = {'reefid-sync-fish-progress': JSON.stringify(twice), 'reefid-sync-fish-rv': JSON.stringify(FRV - 1)};
  seed(s, data);
  const a = app({
    sheet: atv(s, SV),
    ls: {...data, 'reefid-sync-coral-rv': String(C.RV)},
    SYNC: {name: 'Ana', pin: '1234', log: [], base: {}, fbase: JSON.parse(JSON.stringify(twice)), srv: 1}
  });
  a.store.set('reefid-sheet-v', SV);
  await a.syncPush();
  await a.syncPull();
  const P = a.fish(),
    saved = JSON.parse(C.keysIn(s.get({name: 'Ana', pin: '1234'}).data)['reefid-sync-fish-progress']);
  assert.strictEqual(a.rvApplied(FS), FRV);
  Object.keys(want).forEach(u => {
    assert.strictEqual(n(P[u]), n(want[u]), u + ': the log on the device');
    assert.strictEqual(n(saved[u]), n(want[u]), u + ': the log on the sheet');
  });
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

test('answers logged from a refused save (SYNC.lg): the replay of every subject is adopted again until a save carries them', () => {
  const s = loadCodeGs(withFiles());
  seed(s, {});
  const a = app({
      sheet: s,
      ls: {'reefid-sync-fish-rv': String(FRV), 'reefid-sync-coral-rv': String(C.RV)},
      SYNC: {name: 'Ana', pin: '1234', log: [], base: {}, lg: 1}
    }),
    j = {...s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [], rvs: {fish: 0}}), v: C.REPLAYS_SHEET};
  assert.strictEqual(j.replays.fish.rv, FRV);
  // The same version again for fish, its baseline lacking the logged answers.
  assert.strictEqual(a.replaysAdopt(j, [], undefined), true);
  const once = JSON.stringify(a.store.get('reefid-sync-fish-progress', {}));
  // The flag holds until a save carries the answers: the saved copy lacks them still, and another device saving over it
  // meanwhile would have them dropped at the next merge (sync.js lgFor).
  assert.ok(a.ctx.SYNC.lg, 'kept until a save');
  assert.strictEqual(a.replaysAdopt(j, [], undefined), true, 'adopted again while it holds');
  assert.strictEqual(JSON.stringify(a.store.get('reefid-sync-fish-progress', {})), once, 'to the same progress');
  delete a.ctx.SYNC.lg; // a save came through (syncOnce)
  assert.strictEqual(a.replaysAdopt(j, [], undefined), false, 'then once per version, as the corals');
});

// Codex review #779: answers logged from a refused save (SYNC.lg) while the fish units are not in yet: the fish replay
// cannot be adopted, and the plain merge counted those answers twice (a baseline of 6, 9 here, a saved replay of 9: 12).
test('a refused save while the fish units are not in: no merge, the replay of the whole log once they are', async () => {
  const s = loadCodeGs(withFiles()),
    rec = C.replayProgress(
      F.map(x => C.logRow(x, 'ana')),
      {gen: FGEN}
    ).ana.P,
    saved = C.replayedOf({P: rec}, {}, FRV), // another device adopted the replay of the 9 and saved it
    base = C.replayedOf(
      {
        P: C.replayProgress(
          F.slice(0, 6).map(x => C.logRow(x, 'ana')),
          {gen: FGEN}
        ).ana.P
      },
      {}
    ),
    here = C.replayedOf({P: rec}, {}); // this device: the 6 of the baseline, then 3 logged by a refused save
  seed(s, {'reefid-sync-fish-progress': JSON.stringify(saved), 'reefid-sync-fish-rv': JSON.stringify(FRV)});
  const n = P => ((P['f:Damselfishes'] || {}).ok || 0) + ((P['f:Damselfishes'] || {}).ko || 0),
    a = app({
      sheet: atv(s),
      ls: {
        'reefid-sync-fish-progress': JSON.stringify(here),
        'reefid-sync-fish-rv': JSON.stringify(FRV),
        'reefid-sync-coral-rv': String(C.RV)
      },
      SYNC: {name: 'Ana', pin: '1234', log: [], base: {}, fbase: base, lg: 1, lgOk: ['coral'], srv: 0}
    });
  a.store.set('reefid-sheet-v', C.REPLAYS_SHEET);
  const gen = a.ctx.UNITS.fish.gen;
  a.ctx.UNITS.fish.gen = () => null; // the fish data not loaded on this device yet
  await a.syncPull();
  assert.strictEqual(n(a.fish()), 9, 'not merged: was 12');
  assert.strictEqual(a.rvApplied(FS), 0, 'the replay of the whole log asked for again');
  a.ctx.UNITS.fish.gen = gen;
  await a.syncPull();
  assert.ok(
    a.sent.some(b => b.rv_fish === '0'),
    'asked once the units are in'
  );
  assert.strictEqual(n(a.fish()), 9);
  assert.strictEqual(a.rvApplied(FS), FRV);
});

// ROADMAP "A save whose reply is lost, then another device's save" (found 2026-11-08), on the fish side: the sheet wrote
// the save, its reply never came, another device saved over it; the plain merge counted the lost save's answers twice.
// Its fate unknown (SYNC.lg, sync.js fateUnknown), the fish replay of the log counts each answer once by its id, from
// the script that replays fish (REPLAYS_SHEET) as with the light saves (today's script).
test('fish: a save whose reply never came, then another device saved over it: its answers count once', async () => {
  for (const v of [C.REPLAYS_SHEET, SV]) {
    const s = loadCodeGs(withFiles());
    let lose = false;
    const sheet = {
        get: q => ({...s.get(q), v}),
        post: b => {
          const r = {...s.post(b), v};
          return lose && b.name && !(lose = false) ? new TypeError('Failed to fetch') : r;
        }
      },
      dev = () => {
        const a = app({sheet, ls: {'reefid-subject': JSON.stringify('fish')}, SYNC: {name: 'Ana', pin: '1234', log: [], base: {}}});
        a.ctx.SUBJ = FS; // on the fish side
        a.ctx.P = {};
        a.store.set('reefid-sheet-v', v);
        return a;
      },
      play = (a, i) => {
        const x = fa('l' + i, i),
          r = (a.ctx.P[x.g] = a.ctx.P[x.g] || {ok: 0, ko: 0, h: ''});
        r[x.ok ? 'ok' : 'ko']++;
        r.h = (r.h + x.ok).slice(-10);
        a.ctx.SYNC.log = [...a.ctx.SYNC.log, x];
        a.ctx.SYNC.dirty = true;
        a.store.set('reefid-sync-fish-progress', a.ctx.P);
      },
      n = P => Object.keys(P).reduce((t, u) => (u === '~level' ? t : t + (P[u].ok || 0) + (P[u].ko || 0)), 0),
      rows = () => s.sheets.Answers.rows.slice(1).filter(r => r[0] === 'Ana').length,
      saved = () => n(JSON.parse(C.keysIn(s.get({name: 'Ana', pin: '1234'}).data)['reefid-sync-fish-progress'] || '{}')),
      A = dev(),
      B = dev();
    play(A, 0);
    await A.syncPush();
    await B.syncPull();
    play(A, 1);
    play(A, 2);
    lose = true;
    await A.syncPush();
    assert.ok(!lose && rows() === 3 && A.ctx.SYNC.log.length === 2, `v${v}: logged and written, the reply lost`);
    await B.syncPull(); // the other device loads the copy the lost save wrote
    play(B, 3);
    await B.syncPush(); // and saves over it
    play(A, 4);
    await A.syncPush();
    await A.syncPull();
    await B.syncPull();
    assert.deepStrictEqual(
      [rows(), n(A.fish()), n(B.fish()), saved(), A.ctx.SYNC.log.length, !!A.ctx.SYNC.lg],
      [5, 5, 5, 5, 0, false],
      `v${v}: every answer once`
    );
    assert.strictEqual(A.rvApplied(FS), FRV, `v${v}: the fish replay adopted`);
  }
});

// Codex review #779: the floor is the sheet's, so every device of the account adopts the same record. A second device
// that never adopted it, its progress as the account's before the replay, keeps its bars when it pulls the first one's
// save (it was taken to the other device's lower record and its rules version, and floored no more).
test("a second device pulls the first one's adopted fish replay: the same record, nothing counted twice", async () => {
  const s = loadCodeGs(withFiles());
  seed(s, {'reefid-sync-fish-progress': JSON.stringify(today)});
  const dev = () =>
      app({
        sheet: atv(s),
        ls: {'reefid-sync-fish-progress': JSON.stringify(today), 'reefid-sync-coral-rv': String(C.RV)},
        SYNC: {name: 'Ana', pin: '1234', log: [], base: {}, fbase: JSON.parse(JSON.stringify(today)), srv: 1}
      }),
    A = dev(),
    B = dev(),
    n = (P, u) => ((P[u] || {}).ok || 0) + ((P[u] || {}).ko || 0);
  await A.syncPush();
  B.store.set('reefid-sheet-v', C.REPLAYS_SHEET);
  await B.syncPull();
  assert.deepStrictEqual(B.fish()['f:Damselfishes'], A.fish()['f:Damselfishes'], 'the same record on both');
  assert.strictEqual(n(B.fish(), 'f:Damselfishes'), 9);
  // B answers nothing more, A saves again, B pulls: still 9 (the shared baseline is the replay).
  await A.syncPush();
  await B.syncPull();
  assert.strictEqual(n(B.fish(), 'f:Damselfishes'), 9);
});

// Codex review #779: a refused save's answers, all logged, recovered by the replay: the shared baseline must be the
// replay's record (its 9 answers), or another device's save of the same replay adds them again (a baseline of 6, 9
// here: 12). A higher saved bar is not kept (no floor, Q330).
test('a refused save recovered by the replay: the baseline takes the replay, nothing counted twice', async () => {
  const s = loadCodeGs(withFiles()),
    six = C.replayedOf(
      {
        P: C.replayProgress(
          F.slice(0, 6).map(x => C.logRow(x, 'ana')),
          {gen: FGEN}
        ).ana.P
      },
      {}
    ),
    nine = C.replayedOf(
      {
        P: C.replayProgress(
          F.map(x => C.logRow(x, 'ana')),
          {gen: FGEN}
        ).ana.P
      },
      {}
    ),
    n = P => ((P['f:Damselfishes'] || {}).ok || 0) + ((P['f:Damselfishes'] || {}).ko || 0);
  // The saved copy: the 6 of the baseline (the save of the 3 more was refused; they are logged), today's high bar on it.
  const savedHigh = {...six, 'f:Damselfishes': {...six['f:Damselfishes'], ds: 0.9}};
  seed(s, {'reefid-sync-fish-progress': JSON.stringify(savedHigh)});
  const here = {...nine, 'f:Damselfishes': {...nine['f:Damselfishes'], ds: 0.9}},
    a = app({
      sheet: atv(s),
      ls: {'reefid-sync-fish-progress': JSON.stringify(here), 'reefid-sync-coral-rv': String(C.RV)},
      SYNC: {name: 'Ana', pin: '1234', log: [], base: {}, fbase: savedHigh, lg: 1, lgOk: ['coral'], srv: 0}
    });
  a.store.set('reefid-sheet-v', C.REPLAYS_SHEET);
  await a.syncPull();
  assert.strictEqual(a.rvApplied(FS), FRV, 'recovered by the replay');
  assert.strictEqual(n(a.fish()), 9);
  assert.strictEqual(n(a.base()), 9, 'the baseline counts the logged answers (was 6)');
  assert.ok(bar(a.fish(), 'f:Damselfishes') < bar(savedHigh, 'f:Damselfishes'), "the replay's bar: no floor");
  // Another device saves the same replay; this one pulls: 9, not 12.
  s.post({
    name: 'Ana',
    pin: '1234',
    data: {
      'reefid-sync-coral-progress': '{}',
      'reefid-sync-fish-progress': JSON.stringify(a.fish()),
      'reefid-sync-fish-rv': JSON.stringify(FRV)
    },
    summary: {},
    answers: []
  });
  await a.syncPull();
  assert.strictEqual(n(a.fish()), 9);
});

// Codex review #779: another device saves fish answers under no fish rules version (it never adopted it): this one,
// which adopted the fish replay, takes its version back to 0 (mergeSubject) and must ask for the replay again at once,
// as for the corals (syncPull: syncSoon when a rules version went back).
test('a saved copy without the fish rules version: the fish replay asked for again at once', async () => {
  const s = loadCodeGs(withFiles());
  seed(s, {'reefid-sync-fish-progress': JSON.stringify(today)});
  const a = app({
    sheet: atv(s),
    ls: {'reefid-sync-fish-progress': JSON.stringify(today), 'reefid-sync-coral-rv': String(C.RV)},
    SYNC: {name: 'Ana', pin: '1234', log: [], base: {}, fbase: JSON.parse(JSON.stringify(today)), srv: 1}
  });
  await a.syncPush();
  assert.strictEqual(a.rvApplied(FS), FRV);
  // Another device's save of its fish progress under no fish rules version (it never adopted the fish replay), with the
  // corals' version as this one's.
  s.post({
    name: 'Ana',
    pin: '1234',
    data: {
      'reefid-sync-coral-progress': '{}',
      'reefid-sync-coral-rv': JSON.stringify(C.RV),
      'reefid-sync-fish-progress': JSON.stringify(today),
      'reefid-sync-fish-rv': '0'
    },
    summary: {},
    answers: [fa('f9', 9)]
  });
  a.ctx.SYNC.dirty = false;
  await a.syncPull();
  assert.strictEqual(a.rvApplied(FS), 0, 'its version back');
  assert.strictEqual(a.rvApplied(), C.RV, "the corals' unchanged");
  assert.strictEqual(a.ctx.SYNC.dirty, true, 'a save scheduled: it brings the replay again');
});

// Rule D9 (Pierre, 2026-11-09, Q322, Q330): a fish player's saved answers from before the fish log (30 saved, 20 logged) are
// in no log: the adoption takes the log's counts, its level's too, with no floor.
test("a device with more answers than the log (played before the fish log): the log's counts and level, no floor (Q330)", async () => {
  const s = loadCodeGs(withFiles()),
    dp = C.domFromCounts({ok: 6, ko: 0, h: '111111'}, 0.5, 4, 0).dp,
    high = {
      'f:Damselfishes': {ok: 6, ko: 0, h: '111111', u: 6, dp, ds: 0.9},
      'f:Wrasses': {ok: 2, ko: 0, h: '11', u: 2, dp, ds: 0.3, conf: {'f:Damselfishes': 2}, off: {'f:Damselfishes': 2}},
      '~level': {ok: 30, ko: 0, th: 1, tyk: {f: 10}}
    },
    typed = Array.from({length: 10}, (_, i) => ({...fa('t' + i, i), m: 'quiz|t', a: 'f:Damselfishes', ok: 1, ch: ''})),
    other = Array.from({length: 10}, (_, i) => ({
      ...fa('o' + i, 20 + i),
      g: 'f:Angelfishes',
      a: 'f:Angelfishes',
      ok: 1,
      ch: 'f:Angelfishes f:Butterflyfishes f:Groupers f:Snappers'
    }));
  s.post({
    name: 'Ana',
    pin: '1234',
    data: {'reefid-sync-coral-progress': '{}', 'reefid-sync-fish-progress': JSON.stringify(high)},
    summary: {},
    answers: [...typed, ...other]
  });
  const a = app({
    sheet: atv(s),
    ls: {'reefid-sync-fish-progress': JSON.stringify(high), 'reefid-sync-coral-rv': String(C.RV)},
    SYNC: {name: 'Ana', pin: '1234', log: [], base: {}, fbase: JSON.parse(JSON.stringify(high)), srv: 1}
  });
  await a.syncPush();
  assert.strictEqual(a.rvApplied(FS), FRV);
  const P = a.fish(),
    n = x => ((x && x.ok) || 0) + ((x && x.ko) || 0);
  assert.strictEqual(n(P['~level']), 20, "the log's 20 answers, not the 30 saved (rule D9)");
  assert.strictEqual(n(P['f:Damselfishes']), 10, "the log's 10 typed answers");
  assert.ok(!P['f:Wrasses'], 'a unit the log has no answer on: its saved answers go');
  assert.deepStrictEqual(a.base()['~level'].ok, P['~level'].ok, 'the same in the shared baseline');
});

// Codex review #779: this device's unsent typed answer goes on top of the replay in its own progress, never into the
// shared baseline (a merge with another device's copy of the replay would take it away from the denominator).
test("an unsent typed answer at adoption: its typed opportunity in this device's progress only, not the baseline", () => {
  const s = loadCodeGs(withFiles());
  seed(s, {'reefid-sync-fish-progress': JSON.stringify(today)});
  const a = app({sheet: atv(s), SYNC: {name: 'Ana', pin: '1234', log: [], base: {}, fbase: {}, srv: 1}}),
    j = {...s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [], rvs: {fish: 0}}), v: C.REPLAYS_SHEET},
    mine = {...fa('u1', 50), m: 'quiz|t', a: 'f:Damselfishes', ok: 1, ch: ''};
  assert.ok(!((j.replays.fish.rec['~level'] || {}).tyk || {}).f, 'the replay has no typed answer');
  assert.strictEqual(a.replaysAdopt(j, [mine], undefined), true);
  assert.ok(((a.fish()['~level'] || {}).tyk || {}).f >= 1, "in this device's progress");
  assert.ok(!((a.base()['~level'] || {}).tyk || {}).f, 'not in the shared baseline');
});

// Production, 2026-11-09: no fish player was ever replayed. Their apps asked at every sync, but the sheet's "Replayed Fish"
// tab stood empty, without its header, and the script failed on it before storing or sending the replay (Code.gs
// sheet_, find_). End to end at today's script (its own VERSION: light saves on), for a player who plays fish only, on
// the fish side, named like an Object property (Codex review #810): asked, made, stored, adopted, told once.
test("today's script with an empty Replayed Fish tab: a fish-only player's replay asked, stored, adopted", async () => {
  for (const nm of ['Ana', 'constructor']) {
    const s = loadCodeGs(withFiles());
    // An account from before the refusal of reserved names (tests/gas.js madeBefore).
    madeBefore(s, () =>
      s.post({name: nm, pin: '1234', data: {'reefid-sync-fish-progress': JSON.stringify(today)}, summary: {}, answers: F})
    );
    s.ctx.SpreadsheetApp.getActiveSpreadsheet().insertSheet('Replayed Fish'); // as on the real sheet: empty, no header
    const a = app({
      sheet: s,
      ls: {'reefid-sync-fish-progress': JSON.stringify(today), 'reefid-subject': JSON.stringify('fish')},
      SYNC: {name: nm, pin: '1234', log: [], base: {}, fbase: JSON.parse(JSON.stringify(today)), srv: 1}
    });
    a.ctx.SUBJ = FS; // on the fish side
    a.ctx.P = JSON.parse(JSON.stringify(today));
    await a.syncPush();
    assert.strictEqual(a.store.get('reefid-sheet-v'), SV, "today's script");
    assert.ok(
      a.sent.some(b => b.light && b.rvs && b.rvs.fish === 0),
      nm + ': asked with a light save'
    );
    const T = s.sheets['Replayed Fish'];
    assert.deepStrictEqual(
      Array.from(T.rows.slice(1), x => [x[0], x[1], x[2]]),
      [[nm, FRV, 9]],
      nm + ': stored'
    );
    assert.strictEqual(a.rvApplied(FS), FRV, nm + ': adopted');
    const P = a.fish();
    assert.deepStrictEqual([P['f:Damselfishes'].ok, P['f:Damselfishes'].ko, P['f:Damselfishes'].rv], [6, 3, FRV]);
    assert.ok(bar(P, 'f:Damselfishes') < bar(today, 'f:Damselfishes'), nm + ": the replay's bar, no floor (Q330)");
    assert.deepStrictEqual(
      a.cards.map(c => c.slice(0, 3)),
      [['fish', 0, FRV]],
      nm + ': told once, no card due'
    );
    assert.deepStrictEqual(C.rvMsgs(0, FRV, false, 'fish'), []);
    await a.syncPush();
    assert.strictEqual(a.cards.length, 1, nm + ': once');
    assert.strictEqual(JSON.parse(s.get({name: nm, pin: '1234'}).data['reefid-sync-fish-rv']), FRV, nm + ': saved');
  }
});
