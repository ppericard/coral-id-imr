// An in-memory localStorage for the pages a Playwright tool drives in one long synchronous evaluate (tools/learnsim.js).
// Why (2026-11-08, ROADMAP "learnsim: long runs crash"): learnsim plays every answer of a run inside one page.evaluate,
// so the page's event loop never turns until the run ends. Each answer writes the answer log twice (sync.js LOG0 and
// ANONQ, up to 2,000 answers, about 300,000 characters each), and every localStorage write sends the browser a message
// whose answers (each with the key's old and new value) queue in the renderer until the loop ends: about 1.5 MB of
// native memory an answer, never freed, so the renderer died ("Target crashed") between 2,500 and 4,500 answers. This
// Storage keeps the items in the page's own memory: nothing is sent, so nothing queues.
// It behaves as the browser's for everything the app does: getItem / setItem / removeItem / clear / key / length, the
// values strings, key(i) in the browser's order (sorted by UTF-16 code units, Chromium's map), and the items as the
// object's own enumerable properties (so {...localStorage} and Object.entries(localStorage) give the items, never the
// methods). No quota: window.__lsPeak keeps the most characters (keys and values) it ever held, so a run that came near
// the browser's limit (LS_SAFE) is flagged instead of silently differing from a real browser.
// Installed with ctx.addInitScript(memStorage) before any other init script; tests/memstorage.test.js checks it.
function memStorage(w = typeof window === 'undefined' ? globalThis : window) {
  const m = new Map();
  let size = 0;
  w.__lsPeak = 0;
  const keys = () => [...m.keys()].sort(),
    put = (k, v) => {
      k = String(k);
      v = String(v);
      size += k.length + v.length - (m.has(k) ? k.length + m.get(k).length : 0);
      m.set(k, v);
      if (size > w.__lsPeak) w.__lsPeak = size;
    },
    del = k => {
      k = String(k);
      if (m.has(k)) size -= k.length + m.get(k).length;
      m.delete(k);
    };
  const api = {
    getItem: k => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => put(k, v),
    removeItem: k => del(k),
    clear: () => (m.clear(), (size = 0), undefined),
    key: i => keys()[i] ?? null
  };
  const store = new Proxy(api, {
    get: (o, k) => (k === 'length' ? m.size : k in o ? o[k] : typeof k === 'string' && m.has(k) ? m.get(k) : undefined),
    set: (o, k, v) => (put(k, v), true),
    has: (o, k) => k in o || m.has(String(k)),
    deleteProperty: (o, k) => (del(k), true),
    // An item named as a method (getItem, length) is not an own property, as in the browser (its named properties).
    ownKeys: o => keys().filter(k => !(k in o) && k !== 'length'),
    getOwnPropertyDescriptor: (o, k) =>
      typeof k === 'string' && m.has(k) && !(k in o) && k !== 'length'
        ? {value: m.get(k), writable: true, enumerable: true, configurable: true}
        : undefined
  });
  Object.defineProperty(w, 'localStorage', {value: store, configurable: true});
  return store;
}
// The most characters a run may hold with no doubt that a real browser would have taken every write: browsers allow 5 to
// 10 MiB per origin; 5 MiB at two bytes a character is the lowest bound (learnsim warns above it).
const LS_SAFE = (5 * 1024 * 1024) / 2;
module.exports = {memStorage, LS_SAFE};
