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

// A page: {ctx, ls, store, keptGet, keptBy, keptPush, KEPT, KEPT_CHECK}; check: KEPT_CHECK on.
function keptPage({check = false, ls = memStorage(), extra = {}} = {}) {
  const ctx = {localStorage: ls, keyGet: C.keyGet, setTimeout: () => 0, ...extra};
  vm.createContext(ctx);
  vm.runInContext(
    block(read('app.js'), 'const store = {', '\n};\n', {through: 1, file: 'app.js'}) +
      block(read('sync.js'), 'const KEPT = new Map(),', '// Photo difficulty (the pooled Elo', {file: 'sync.js'}) +
      `\nKEPT_CHECK.on = ${check};\nthis.K = {store, keptGet, keptBy, keptPush, KEPT, KEPT_CHECK};`,
    ctx
  );
  return {ctx, ls, ...ctx.K};
}
module.exports = {keptPage, memStorage, read};
