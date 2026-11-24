// sync.js's storage read once (keptGet, keptBy, keptPush; REE-263) in a vm for the unit tests, with app.js's own store
// over the same in-memory Storage (core.js keyGet: a key still under its old name is read too). The Storage can be made
// to throw (blocked storage, a full one on writes), and another tab's write is a raw setItem on it.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js'),
  block = require('./block.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function memStorage() {
  const m = new Map(),
    s = {
      fail: false, // every access throws (storage blocked)
      full: false, // every write throws (quota)
      getItem: k => {
        if (s.fail) throw new Error('blocked');
        return m.has(String(k)) ? m.get(String(k)) : null;
      },
      setItem: (k, v) => {
        if (s.fail || s.full) throw new Error('QuotaExceededError');
        m.set(String(k), String(v));
      },
      removeItem: k => {
        if (s.fail) throw new Error('blocked');
        m.delete(String(k));
      },
      get length() {
        return m.size;
      },
      key: i => [...m.keys()][i] ?? null,
      raw: m
    };
  return s;
}

// A page: {ctx, ls, store, keptGet, keptBy, keptPush, KEPT, KEPT_CHECK, endTask, reads}; check: KEPT_CHECK on.
// tasks: the page's tasks as the browser runs them (app.js freshNow queues the end of a task with queueMicrotask; here
// endTask() ends it), so a kept read trusts its task's comparison; without, there is no queueMicrotask and every read
// compares. reads(): the storage reads made so far, by key.
function keptPage({check = false, tasks = false, ls = memStorage(), extra = {}} = {}) {
  const queued = [],
    reads = new Map(),
    get = ls.getItem;
  ls.getItem = k => (reads.set(String(k), (reads.get(String(k)) || 0) + 1), get(k));
  // store.set bumps the state version for an input's key (app.js STATE_KEYS, stateBump): no input here, no view.
  const ctx = {
    localStorage: ls,
    keyGet: C.keyGet,
    keyRename: C.keyRename,
    setTimeout: () => 0,
    STATE_KEYS: new Set(),
    STATE_LIVE: [],
    stateBump: () => {},
    ...(tasks ? {queueMicrotask: f => queued.push(f)} : {}),
    ...extra
  };
  vm.createContext(ctx);
  vm.runInContext(
    block(read('app.js'), 'let FRESH_T = 0,', '// Two inputs are read from storage', {file: 'app.js'}) +
      block(read('app.js'), 'const store = {', '\n};\n', {through: 1, file: 'app.js'}) +
      block(read('sync.js'), "// Without app.js's task marks", '// Photo difficulty (the pooled Elo', {file: 'sync.js'}) +
      `\nKEPT_CHECK.on = ${check};\nthis.K = {store, keptGet, keptBy, keptPush, KEPT, KEPT_CHECK, KEPT_FRESH, storeWrote};`,
    ctx
  );
  const endTask = () => queued.splice(0).forEach(f => f());
  return {ctx, ls, endTask, reads: k => reads.get(k) || 0, ...ctx.K};
}
module.exports = {keptPage, memStorage, read};
