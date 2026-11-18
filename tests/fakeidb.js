// A stand-in for IndexedDB, enough for admin-draft.js in Node (tests/admindraft.test.js): every "tab" opening a name gets
// the same database; a transaction sees and writes a staged copy committed all or nothing; transactions run one at a time
// in the order they were created (across tabs, as the browser runs the readwrite ones of one store); each request
// completes in a later task (setImmediate); and, as in a browser, a transaction is active only in the task that created
// it and in its requests' callbacks: it commits as soon as one returns with no request pending, and a request made after
// that (after an await) throws TransactionInactiveError. So a test that awaits crypto inside a transaction fails here as
// it would in Chromium. failPut(key, value) → true makes that put fail (storage full): its transaction aborts.
function fakeIDB({failPut} = {}) {
  const dbs = {},
    queue = [];
  let running = null;
  const later = f => setImmediate(f);
  const next = () => {
    if (running || !queue.length) return;
    running = queue.shift();
    running._start();
  };
  const err = (name, msg) => Object.assign(new Error(msg || name), {name});
  function makeDb(rec) {
    return {
      createObjectStore(n) {
        rec.stores[n] = new Map();
      },
      close() {},
      transaction(store, mode = 'readonly') {
        if (!rec.stores[store]) throw err('NotFoundError', 'no store ' + store);
        let active = true,
          done = false,
          started = false,
          staged = null;
        const pending = [];
        const t = {oncomplete: null, onerror: null, onabort: null, error: null};
        later(() => (active = false)); // the creating task is over
        const finish = ok => {
          if (done) return;
          done = true;
          active = false;
          if (ok) rec.stores[store] = staged;
          later(() => {
            if (ok) t.oncomplete && t.oncomplete({target: t});
            else t.onabort && t.onabort({target: t});
            running = null;
            next();
          });
        };
        const pump = () => {
          if (done) return;
          if (!pending.length) return finish(true);
          const q = pending.shift();
          later(() => {
            if (done) return;
            let v,
              bad = null;
            try {
              v = q.run();
            } catch (e) {
              bad = e;
            }
            active = true;
            try {
              if (bad) {
                q.req.error = bad;
                t.error = bad;
                q.req.onerror && q.req.onerror({target: q.req});
                t.onerror && t.onerror({target: t});
                return finish(false);
              }
              q.req.result = v;
              q.req.onsuccess && q.req.onsuccess({target: q.req});
            } finally {
              active = false;
            }
            pump();
          });
        };
        const request = run => {
          if (done || !active) throw err('TransactionInactiveError', 'the transaction is not active');
          const req = {result: undefined, error: null, onsuccess: null, onerror: null};
          pending.push({req, run});
          return req;
        };
        const os = {
          get: k => request(() => (staged.has(k) ? structuredClone(staged.get(k)) : undefined)),
          put(v, k) {
            if (mode !== 'readwrite') throw err('ReadOnlyError');
            const c = structuredClone(v);
            return request(() => {
              if (failPut && failPut(k, c)) throw err('QuotaExceededError', 'full');
              staged.set(k, c);
              return k;
            });
          },
          delete(k) {
            if (mode !== 'readwrite') throw err('ReadOnlyError');
            return request(() => staged.delete(k));
          }
        };
        t.objectStore = () => os;
        t.abort = () => {
          if (done) throw err('InvalidStateError');
          finish(false);
        };
        t._start = () => {
          started = true;
          staged = new Map(rec.stores[store]);
          // Nothing asked in the creating task: it commits at once.
          later(() => (pending.length || active ? pump() : finish(true)));
        };
        queue.push(t);
        later(next);
        return t;
      }
    };
  }
  return {
    open(name, version) {
      const r = {result: null, error: null, transaction: null, onsuccess: null, onerror: null, onupgradeneeded: null};
      later(() => {
        const fresh = !dbs[name];
        const rec = fresh ? {stores: {}} : dbs[name];
        r.result = makeDb(rec);
        if (fresh) {
          let aborted = false;
          r.transaction = {abort: () => (aborted = true)};
          r.onupgradeneeded && r.onupgradeneeded({target: r});
          if (aborted) {
            r.error = err('AbortError');
            return r.onerror && r.onerror({target: r});
          }
          dbs[name] = rec;
        }
        r.onsuccess && r.onsuccess({target: r});
      });
      return r;
    },
    dbs
  };
}
module.exports = fakeIDB;
