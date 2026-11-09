// One page of the app's sync (sync.js as the page runs it, app.js's globals stubbed, Node's own CompressionStream) on the
// sync script on an in-memory sheet (tests/gas.js), every request recorded with its bytes: for tests/lightsave.test.js
// and tools/syncperf.js (bytes and round trips per answer). Nothing leaves this process (rule D1).
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const {loadCodeGs, bodyOf} = require('./gas.js');

const ROOT = path.join(__dirname, '..'),
  DATA = require('../data.json'),
  DJSON = fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'),
  LIGHT = Number(/const LIGHT_SHEET = (\d+);/.exec(fs.readFileSync(path.join(ROOT, 'sync.js'), 'utf8'))[1]);
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
// A page of the app (its own sync.js, a fresh page: its first sync loads) on the sheet s, whose replies say script
// version v (the light saves from LIGHT_SHEET; Code.gs's VERSION is assigned at merge, rule D3). net(kind, body, n): what
// the n-th request gets instead of the sheet's reply (an Error to throw, a reply object), or undefined for the sheet's;
// lost(kind, body, n): the sheet applies it, then the reply never comes.
function page(s, {v = LIGHT, SYNC = null, P = {}, ls = {}, net = () => undefined, lost = () => false, zip = true} = {}) {
  const prog = fs.readFileSync(path.join(ROOT, 'progress.js'), 'utf8'),
    appjs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
    groups = /const GROUPS_KEY = [\s\S]*?\nconst subjOpen = .*\n/.exec(appjs)[0],
    reqs = [];
  const answer = (u, o) => {
    const url = new URL(String(u)),
      post = !!(o && o.body),
      body = post ? bodyOf(o.body) : Object.fromEntries(url.searchParams),
      n = reqs.length,
      r = {kind: post ? 'post' : 'get', body, raw: post ? o.body : '', up: String(u).length + (post ? o.body.length : 0)};
    reqs.push(r);
    const f = net(r.kind, body, n);
    if (f instanceof Error) return Promise.reject(f);
    let j = f || (post ? s.post(JSON.parse(o.body)) : s.get(body));
    j = {...j, v};
    if (!f && lost(r.kind, body, n)) return Promise.reject(new TypeError('Failed to fetch'));
    r.reply = j;
    r.down = JSON.stringify(j).length;
    return Promise.resolve({status: 200, json: () => JSON.parse(JSON.stringify(j))});
  };
  const ctx = {
    ...C,
    console,
    crypto: require('crypto').webcrypto,
    ...(zip ? {CompressionStream, Response, btoa} : {}),
    localStorage: storage({'reefid-sheet-v': String(v), ...ls}),
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
    ...require('./subj.stub.js')(),
    SYNC_URL: 'https://script.google.com/macros/s/test/exec',
    LOCAL: false,
    SYNC,
    DATA,
    P,
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
     const save = () => store.set('reefid-sync-coral-progress', P);\n` +
      /const loadData = [\s\S]*?;\n/.exec(prog)[0] +
      /const progData = [\s\S]*?\n};\n/.exec(prog)[0] +
      groups +
      fs.readFileSync(path.join(ROOT, 'sync.js'), 'utf8') +
      '\nbindSync = () => {};\nthis.A = {syncPush, syncPull, store, rvApplied, saveWait, SAVE_WAIT, setSaveMs: x => (saveMs = x), lightOn};',
    ctx
  );
  const A = ctx.A;
  A.ctx = ctx;
  A.reqs = reqs;
  // One answer played here, as quiz.js answer leaves it: the record moved, the answer queued, a save due.
  A.play = (id, g = 'Acropora', ok = 1, t = T(n++)) => {
    const P = ctx.P,
      x = (P[g] = P[g] || {ok: 0, ko: 0, h: ''});
    x[ok ? 'ok' : 'ko']++;
    x.h = ((x.h || '') + (ok ? 1 : 0)).slice(-10);
    x.at = Date.parse(t); // as the game stamps it: two devices' records of one genus never read the same
    ctx.SYNC.log = [...(ctx.SYNC.log || []), qa(id, g, ok, t)];
    ctx.SYNC.dirty = true;
    A.store.set('reefid-sync-coral-progress', P);
  };
  return A;
}
let n = 0;
const T = i => new Date(Date.UTC(2026, 10, 8, 2, 0, 0) + 1000 * i).toISOString();
const qa = (id, g, ok, t) => ({
  id,
  t,
  g,
  a: ok ? g : g === 'Acropora' ? 'Montipora' : 'Acropora',
  ok: ok ? 1 : 0,
  m: 'quiz',
  ph: g.toLowerCase() + '-wide-1',
  ch: 'Acropora Montipora Porites Pocillopora',
  e: 0.8,
  th: 1,
  nw: 1
});
module.exports = {page, qa, T, LIGHT, DATA, withData, loadCodeGs, storage};
