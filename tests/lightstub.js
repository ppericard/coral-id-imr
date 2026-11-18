// Every smoke's page (tests/calm.js adds it to each context first): a test's sheet stub (window.SHEET_STUB, app.js
// sheetFetch; rule D1) reads a save as the sync script reads it. The app saves light (sync.js syncOnce: the lighter saves,
// sheet v116, below the gate floor core.js MIN_SHEET): the body wrapped ({lt} or {z}, gzipped), and right after a load
// only what changed since the copy it loaded (dz). Here the body is unwrapped and the delta laid over the copy the stub's
// last load reply served (core.js dataPatch, as Code.gs lightData_ does), so a stub written for whole saves still gets
// one: {name, pin, data, answers, ...}. Nothing else changes: the stub's replies go to the app as they are.
(() => {
  let stub = null,
    held = null; // the data of the stub's last load reply that found the account, under the app's key names (keysIn)
  const gunzip = async z => {
    const b = Uint8Array.from(atob(z), c => c.charCodeAt(0));
    return new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  };
  const unwrap = async raw => {
    let b;
    try {
      b = JSON.parse(raw);
    } catch (e) {
      return raw;
    }
    if (!b || typeof b !== 'object') return raw;
    if (typeof b.z === 'string') b = JSON.parse(await gunzip(b.z));
    else if (b.lt && typeof b.lt === 'object') b = b.lt;
    else return raw;
    if (b.dz && held && typeof dataPatch === 'function') {
      const d = dataPatch(held, b.dz);
      if (d) {
        b.data = d;
        delete b.dz;
      }
    }
    return JSON.stringify(b);
  };
  // The copy a load reply served (read from a copy of the reply, the app's own left untouched).
  const keep = async r => {
    if (!r || typeof r.json !== 'function') return r;
    const own = typeof r.clone === 'function',
      p = (own ? r.clone() : r).json(),
      j = await p.catch(() => null);
    if (j && j.ok && j.found && j.data && typeof j.data === 'object') held = typeof keysIn === 'function' ? keysIn(j.data) : j.data;
    return own ? r : {status: r.status, ok: r.ok, json: () => p};
  };
  const wrapped = async (u, o) => keep(await stub(u, o && typeof o.body === 'string' ? {...o, body: await unwrap(o.body)} : o));
  Object.defineProperty(window, 'SHEET_STUB', {
    configurable: true,
    get: () => (typeof stub === 'function' ? wrapped : stub),
    set: f => (stub = f)
  });
})();
