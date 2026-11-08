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

// One Cache Storage shared by the versions (as a browser keeps it across workers): name -> Map(url -> body). A relative
// URL is the worker's (SITE), as a browser resolves it.
function storage() {
  const all = new Map(),
    key = r => new URL(String(r.url || r), SITE).href;
  const cache = name => {
    const m = all.get(name);
    return {
      match: async r => (m.has(key(r)) ? {ok: true, body: m.get(key(r))} : undefined),
      put: async (r, res) => void m.set(key(r), res.body),
      keys: async () => [...m.keys()].map(url => ({url})),
      delete: async r => m.delete(key(r))
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
// opts.fetch replaces the network (e.g. offline: it fails); opts.wait shortens CACHE_WAIT (ms).
function worker(V, store, net, opts = {}) {
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
    fetch: opts.fetch || (async r => (net.push(String(r.url || r)), res(String(r.url || r)))),
    Response: {error: () => ({ok: false, type: 'error'})},
    location: new URL(SITE + 'sw.js'),
    URL,
    setTimeout,
    clearTimeout,
    MessageChannel: class {},
    console
  };
  vm.createContext(ctx);
  let src = SRC.replace(/const V = '[^']*';/, `const V = '${V}';`);
  if (opts.wait) src = src.replace(/CACHE_WAIT = \d+/, `CACHE_WAIT = ${opts.wait}`);
  vm.runInContext(src, ctx);
  const wait = async e => {
    const L = [];
    on[e.type]({...e, waitUntil: p => L.push(p), respondWith: p => L.push(p)});
    return Promise.all(L);
  };
  return {
    // One fetch event as the browser sends it: its reply (respondWith) and its lifetime (waitUntil), apart.
    dispatch: url => {
      const L = {};
      on.fetch({
        type: 'fetch',
        request: {url, method: 'GET', mode: 'navigate'},
        waitUntil: p => (L.lifetime = p),
        respondWith: p => (L.reply = p)
      });
      return L;
    },
    install: () => wait({type: 'install'}),
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

// net.smoke step 9 (2026-11-04, #496's CI, job 126453879572): the admin page never reached DOMContentLoaded although the
// server had answered its request in 1 ms: the page's reply waited for the worker's copy of it to be written to the shell
// cache, and that write never ended (the old worker writing into the shell cache that the new version's activation was
// replacing). A page's reply never waits for its cache copy; the copy is written in the event's lifetime.
test('a page is answered from the network without waiting for its cache copy to be written', async () => {
  const store = storage(),
    open = store.api.open;
  // Every write into a shell cache never ends.
  store.api.open = async name => {
    const c = await open(name);
    if (name.startsWith('reefid-shell-')) c.put = () => new Promise(() => {});
    return c;
  };
  const w = worker('reefid-shell-v1', store, []);
  await w.activate();
  const L = w.dispatch(SITE + 'admin.html?demo');
  const r = await Promise.race([L.reply, new Promise(ok => setTimeout(() => ok('no reply'), 300))]);
  assert.notStrictEqual(r, 'no reply', 'the page waited for its cache copy');
  assert.strictEqual(r.body, 'body of ' + SITE + 'admin.html?demo');
  assert.ok(L.lifetime, 'the copy is written in the event lifetime');
});

test('a page answered from the network is still kept in the shell cache for the next visit offline', async () => {
  const store = storage(),
    w = worker('reefid-shell-v1', store, []);
  await w.activate();
  const L = w.dispatch(SITE + 'index.html');
  await L.reply;
  await L.lifetime;
  assert.ok(store.all.get('reefid-shell-v1').has(SITE + 'index.html'));
});

// Cache Storage that stops answering (net.smoke 9c, PR #531): a reply waits on it CACHE_WAIT ms at most, then the next
// replies leave it alone for a while. Offline meanwhile, a photo is still found in the photo cache with no time limit,
// under its other address too (Codex review #531: a site photo kept under its R2 address was lost offline).
test('offline while Cache Storage is paused: a photo is found under its twin address', async () => {
  const store = storage(),
    R2 = require('../core.js').PHOTO_BASE.replace(/\/$/, ''),
    f = 'img/acropora-x-1-s.webp';
  (await store.api.open('imr-photos-v1')).put({url: `${R2}/${f}`}, {body: 'the photo'});
  let stall = true;
  const open = store.api.open;
  store.api.open = name => (stall ? new Promise(() => {}) : open(name));
  const w = worker('reefid-shell-v1', store, [], {wait: 30, fetch: async () => Promise.reject(new TypeError('offline'))});
  // A first photo while Cache Storage does not answer: past CACHE_WAIT, Cache Storage is paused.
  w.dispatch(SITE + 'img/other-s.webp');
  await new Promise(ok => setTimeout(ok, 80));
  stall = false;
  const r = await w.dispatch(SITE + f).reply;
  assert.strictEqual(r && r.body, 'the photo');
});

// A new version on the field line (2026-11-05, found while looking for a device left on an old app; ~86 kbit/s at the field
// station): its install took the files of the deploy before from the browser's HTTP cache (GitHub Pages keeps them 10
// minutes), so a new version could hold the old page and run its old code once it took over; and it downloaded the whole
// shell again (about 1 MB), unchanged files included.
test('a new version installs the deployed page, not an HTTP-cached copy, and copies unchanged files from the version it replaces', async () => {
  const store = storage(),
    calls = [],
    fetch = async (r, o) => {
      calls.push([String(r.url || r), (o && o.cache) || 'default']);
      return {
        ok: true,
        status: 200,
        body: 'body of ' + String(r.url || r),
        clone() {
          return this;
        }
      };
    };
  const v1 = worker('reefid-shell-v1', store, [], {fetch});
  await v1.install();
  await v1.activate();
  const shell = calls.map(c => c[0]),
    fixed = u => /[?&]v=/.test(u) || u.startsWith('fonts/');
  assert.ok(shell.length > 20 && shell.some(fixed) && shell.some(u => !fixed(u)), shell.join(' '));
  calls.length = 0;
  const v2 = worker('reefid-shell-v2', store, [], {fetch});
  await v2.install();
  assert.deepStrictEqual(
    calls,
    shell.filter(u => !fixed(u)).map(u => [u, 'no-cache']),
    'only the page, curation.json, the manifest and the icon go to the network, past the HTTP cache'
  );
  await v2.activate();
  assert.deepStrictEqual(
    [...store.all.get('reefid-shell-v2').keys()].sort(),
    shell.map(u => new URL(u, SITE).href).sort(),
    'the new shell holds every file'
  );
  assert.ok(!store.all.has('reefid-shell-v1'));
});

// The Coral Finder book crops left the app (Pierre, 2026-11-08): the activation of the next version deletes the copies a
// phone kept in its photo cache (img/<genus>-cf-<page>-<tag>…, under their R2 or site address), and only those.
test('activation deletes the Coral Finder book crops from the photo cache, and nothing else', async () => {
  const store = storage(),
    net = [],
    R2 = 'https://pub-934250f83b884a4f890497f2027ce251.r2.dev/';
  const ph = await store.api.open('imr-photos-v1');
  const keep = [R2 + 'img/acropora-medium-123-s.webp', SITE + 'img/imrl-p40_i1-m.webp', R2 + 'img/pavona-wide-9-s.webp'],
    gone = [R2 + 'img/acropora-cf-2-00-s.webp', SITE + 'img/lobophyllia-cf-20-g21.webp', R2 + 'img/pavona-cf-30-06-m.webp?c=1'];
  for (const u of [...keep, ...gone]) await ph.put(u, {body: u});
  await worker('reefid-shell-v2', store, net).activate();
  assert.deepStrictEqual([...store.all.get('imr-photos-v1').keys()].sort(), keep.sort());
});
