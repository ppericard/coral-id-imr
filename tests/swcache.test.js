// sw.js caches (admin speed, 2026-11-04): the admin's own files outlive a new app version. Before, they went into the
// shell cache, which every deploy replaces, so the first admin visit after each deploy downloaded them all again (about
// 240 kB gzipped). sw.js runs here in a sandbox with an in-memory Cache Storage, two versions one after the other.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const SITE = 'https://example.org/app/';

// One Cache Storage shared by the versions (as a browser keeps it across workers): name -> Map(url -> body).
function storage() {
  const all = new Map();
  const cache = name => {
    const m = all.get(name);
    return {
      match: async r => (m.has(String(r.url || r)) ? {ok: true, body: m.get(String(r.url || r))} : undefined),
      put: async (r, res) => void m.set(String(r.url || r), res.body),
      keys: async () => [...m.keys()].map(url => ({url})),
      delete: async r => m.delete(String(r.url || r))
    };
  };
  return {
    all,
    api: {
      open: async name => (all.has(name) || all.set(name, new Map()), cache(name)),
      keys: async () => [...all.keys()],
      delete: async name => all.delete(name),
      match: async r => {
        for (const name of all.keys()) {
          const hit = await cache(name).match(r);
          if (hit) return hit;
        }
      }
    }
  };
}

// A worker of sw.js whose shell cache is named V: its handlers, and the requests it sent to the network.
function worker(V, store, net) {
  const on = {};
  const res = url => ({
    ok: true,
    status: 200,
    body: 'body of ' + url,
    clone() {
      return this;
    }
  });
  const ctx = {
    self: {
      addEventListener: (t, f) => (on[t] = f),
      skipWaiting: async () => {},
      clients: {claim: async () => {}, matchAll: async () => []}
    },
    caches: store.api,
    fetch: async r => (net.push(String(r.url || r)), res(String(r.url || r))),
    location: new URL(SITE + 'sw.js'),
    URL,
    setTimeout,
    clearTimeout,
    MessageChannel: class {},
    console
  };
  vm.createContext(ctx);
  vm.runInContext(SRC.replace(/const V = '[^']*';/, `const V = '${V}';`), ctx);
  const wait = async e => {
    const L = [];
    on[e.type]({...e, waitUntil: p => L.push(p), respondWith: p => L.push(p)});
    return Promise.all(L);
  };
  return {
    activate: () => wait({type: 'activate'}),
    get: async url => {
      const [r] = await wait({type: 'fetch', request: {url, method: 'GET', mode: 'cors'}});
      await new Promise(ok => setTimeout(ok, 10)); // the put that follows the reply
      return r;
    }
  };
}

test('the admin files outlive a new version; the app shell files do not; a new ?v= replaces the older entry', async () => {
  const store = storage(),
    net = [];
  const v1 = worker('reefid-shell-v1', store, net);
  await v1.activate();
  for (const f of ['admin.js?v=160', 'admin.css?v=89', 'admin-journey.js?v=20', 'autosort.js?v=2', 'analysis.js?v=2', 'app.js?v=209'])
    await v1.get(SITE + f);
  assert.strictEqual(net.length, 6);
  // A deploy: a new worker, a new shell cache name; activation drops the old shell cache.
  const v2 = worker('reefid-shell-v2', store, net);
  await v2.activate();
  net.length = 0;
  for (const f of ['admin.js?v=160', 'admin.css?v=89', 'admin-journey.js?v=20', 'autosort.js?v=2', 'analysis.js?v=2'])
    await v2.get(SITE + f);
  assert.deepStrictEqual(net, [], 'the admin files come from the cache after a new version');
  await v2.get(SITE + 'app.js?v=209');
  assert.deepStrictEqual(net, [SITE + 'app.js?v=209'], 'an app file not in the shell list is fetched again (its cache went)');
  // admin.js changed: the new ?v= is fetched once, and replaces the older entry.
  net.length = 0;
  await v2.get(SITE + 'admin.js?v=161');
  await v2.get(SITE + 'admin.js?v=161');
  assert.deepStrictEqual(net, [SITE + 'admin.js?v=161']);
  const admin = [...store.all.values()].flatMap(m => [...m.keys()]).filter(u => /\/admin\.js\?/.test(u));
  assert.deepStrictEqual(admin, [SITE + 'admin.js?v=161']);
});
