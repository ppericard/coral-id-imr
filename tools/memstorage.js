// An in-memory localStorage for the pages a Playwright tool drives in one long synchronous evaluate (tools/learnsim.js).
// Why (2026-11-08, ROADMAP "learnsim: long runs crash"): learnsim plays every answer of a run inside one page.evaluate,
// so the page's event loop never turns until the run ends. Each answer writes the answer log twice (sync.js LOG0 and
// ANONQ, up to 2,000 answers, about 290,000 characters each), and every localStorage write goes through the browser,
// whose traffic back queues in the renderer until the loop ends: measured, 1.5 MB of native memory an answer (3.6 MB
// once the logs are full), never freed, the V8 heap flat, until the renderer died ("Target crashed") near 3,500 answers.
// This Storage keeps the items in the page's own memory: no traffic, nothing queued (0.1 MB an answer left).
// It behaves as the browser's for everything the app does: getItem / setItem / removeItem / clear / key / length, the
// values strings, key(i) over every key in a fixed order (sorted; Chromium's own is its hash map's, which nothing in the
// app or the tools depends on: core.js travelData collects the keys into an object), and the items as the
// object's own enumerable properties (so {...localStorage} and Object.entries(localStorage) give the items, never the
// methods), and the browser's quota: a write that would take it past LS_QUOTA characters (keys and values) throws
// QuotaExceededError and changes nothing, as Chromium does (measured 2026-11-08 on the Playwright Chromium the tools use:
// 5,242,880 characters, 10 MiB at two bytes a character). window.__lsPeak keeps the most characters it ever held.
// Installed with ctx.addInitScript(memStorage) before any other init script; tests/memstorage.test.js checks it.
function memStorage(w = typeof window === 'undefined' ? globalThis : window) {
  const QUOTA = 5242880, // LS_QUOTA below (this function runs alone in the page)
    m = new Map();
  let size = 0;
  w.__lsPeak = 0;
  const keys = () => [...m.keys()].sort(),
    put = (k, v) => {
      k = String(k);
      v = String(v);
      const next = size + k.length + v.length - (m.has(k) ? k.length + m.get(k).length : 0);
      if (next > QUOTA)
        throw typeof DOMException === 'function'
          ? new DOMException('localStorage quota exceeded', 'QuotaExceededError')
          : Object.assign(new Error('localStorage quota exceeded'), {name: 'QuotaExceededError'});
      size = next;
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
// Chromium's localStorage quota per origin, in characters of keys and values.
const LS_QUOTA = 5242880;
module.exports = {memStorage, LS_QUOTA};
