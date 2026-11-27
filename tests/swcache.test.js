require('./slot.js').testGuard();
// sw.js caches: the admin's own files outlive a new app version, kept apart from the shell cache that every deploy
// replaces, so the first admin visit after a deploy does not download them all again. sw.js runs here in a sandbox with an in-memory Cache Storage, two versions one after the other.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const SITE = 'https://example.org/app/';
// The fish datasets the shell lists (sw.js SHELL: fish.json, fish-photos.json, fish-game.json): optional in the install.
const FISH_FILE = /^fish[\w-]*\.json\?v=\d+$/;
const FISH = [...SRC.matchAll(/'(fish[\w-]*\.json\?v=\d+)'/g)].map(m => m[1]);

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
// opts.fetch replaces the network (e.g. offline: it fails); opts.waiting: a newer version waits (registration.waiting).
function worker(V, store, net, opts = {}) {
  const on = {},
    sent = [], // messages to the waiting version
    skips = []; // skipWaiting() calls
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
      skipWaiting: async () => void skips.push(1),
      clients: {claim: async () => {}, matchAll: async () => []},
      registration: {waiting: opts.waiting ? {state: 'installed', postMessage: m => sent.push(m)} : null}
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
  vm.runInContext((opts.src || (s => s))(SRC).replace(/const V = '[^']*';/, `const V = '${V}';`), ctx);
  const wait = async e => {
    const L = [];
    on[e.type]({...e, waitUntil: p => L.push(p), respondWith: p => L.push(p)});
    return Promise.all(L);
  };
  return {
    sent,
    skips,
    message: data => wait({type: 'message', data}),
    // One fetch event as the browser sends it: its reply (respondWith) and its lifetime (waitUntil), apart.
    dispatch: (url, mode = 'navigate') => {
      const L = {};
      on.fetch({
        type: 'fetch',
        request: {url, method: 'GET', mode},
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

// A page's reply never waits for its cache copy; the copy is written in the event's lifetime. A write into the shell
// cache that a new version's activation is replacing may never end, and the page would never load.
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

// Offline, a photo is found in the photo cache under its other address too (a site photo kept under its R2 address);
// one in neither fails, so the page picks its next source.
test('offline: a photo is found under its twin address', async () => {
  const store = storage(),
    R2 = require('../core.js').PHOTO_BASE.replace(/\/$/, ''),
    f = 'img/acropora-x-1-s.webp';
  (await store.api.open('imr-photos-v1')).put({url: `${R2}/${f}`}, {body: 'the photo'});
  const w = worker('reefid-shell-v1', store, [], {fetch: async () => Promise.reject(new TypeError('offline'))});
  const r = await w.dispatch(SITE + f).reply;
  assert.strictEqual(r && r.body, 'the photo');
  const none = await w.dispatch(SITE + 'img/other-s.webp').reply;
  assert.strictEqual(none && none.type, 'error');
});

// A new version on a slow field line: its install takes the page and the unversioned files past the browser's HTTP cache
// (GitHub Pages keeps them 10 minutes), so it never holds the old page and runs its old code once it takes over; and it
// copies the unchanged files from the version it replaces instead of downloading the whole shell again.
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
  assert.ok(!shell.some(u => FISH_FILE.test(u)), 'a first install downloads no fish dataset (REE-339)');
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

// REE-339: the fish datasets (about 938 KB compressed) are optional in the install. A first install of a coral player
// completes, and the worker takes over, when every one of them fails (Y7L's empty-cache fixture: fish-game.json answered
// 503 and the install never activated); none is downloaded for a device that never opened fish; one the device holds is
// carried to the next version, and a newer one is asked for without ever failing the install.
const answer = (u, status = 200) => ({
  ok: status === 200,
  status,
  body: 'body of ' + u,
  clone() {
    return this;
  }
});
const urlOf = r => String(r.url || r),
  isFish = u => FISH_FILE.test(u.replace(SITE, ''));
// The shell files every player needs: SHELL without the optional ones.
const REQUIRED = [...SRC.slice(SRC.indexOf('const SHELL'), SRC.indexOf('];', SRC.indexOf('const SHELL'))).matchAll(/'([\w./?=-]+)'/g)]
  .map(m => m[1])
  .filter(u => (u === './' || u.includes('.')) && !FISH_FILE.test(u)); // (the Lab list's bare names are not files)

test('REE-339: a first install succeeds and takes over when the fish datasets cannot come; the coral shell is all there', async () => {
  assert.strictEqual(FISH.length, 3, FISH.join(' '));
  const store = storage(),
    calls = [],
    fetch = async r => (calls.push(urlOf(r)), answer(urlOf(r), isFish(urlOf(r)) ? 503 : 200));
  const w = worker('reefid-shell-v1', store, [], {fetch});
  await w.install();
  assert.deepStrictEqual(w.skips, [1], 'the install finished and asked to take over');
  await w.activate();
  const kept = [...store.all.get('reefid-shell-v1').keys()].map(u => u.slice(SITE.length));
  for (const u of REQUIRED) assert.ok(kept.includes(u === './' ? '' : u), `the shell holds ${u}`);
  assert.deepStrictEqual(calls.filter(isFish), [], 'a device that never opened fish asks for no fish dataset');
});

test('REE-339: a fish dataset the page fetches when fish is first needed is kept, and reused by the next version without the network', async () => {
  const store = storage(),
    net = [];
  const v1 = worker('reefid-shell-v1', store, net);
  await v1.install();
  await v1.activate();
  net.length = 0;
  for (const f of FISH) await v1.get(SITE + f); // the page, on the first switch to fish
  assert.deepStrictEqual(net.sort(), FISH.map(f => SITE + f).sort(), 'fetched from the network once');
  for (const f of FISH) await v1.get(SITE + f);
  assert.strictEqual(net.length, FISH.length, 'a second visit reads them from the cache');
  const v2 = worker('reefid-shell-v2', store, net);
  net.length = 0;
  await v2.install();
  assert.deepStrictEqual(net.filter(isFish), [], 'the same datasets are copied from the version replaced');
  await v2.activate();
  const kept = [...store.all.get('reefid-shell-v2').keys()].map(u => u.slice(SITE.length));
  for (const f of FISH) assert.ok(kept.includes(f), `${f} carried to the new shell`);
});

test('REE-339: a device that holds fish asks for a newer dataset at install, and a failure never fails the install', async () => {
  const store = storage(),
    v1 = worker('reefid-shell-v1', store, []);
  await v1.install();
  await v1.activate();
  for (const f of FISH) await v1.get(SITE + f);
  const bump = s => s.replace('fish-game.json?v=1', 'fish-game.json?v=2'),
    calls = [];
  // The newer dataset is asked for, and the line is down for it.
  const down = async r => (calls.push(urlOf(r)), answer(urlOf(r), /fish-game/.test(urlOf(r)) ? 503 : 200));
  const v2 = worker('reefid-shell-v2', store, [], {fetch: down, src: bump});
  await v2.install();
  assert.deepStrictEqual(v2.skips, [1], 'the install finished although fish-game.json?v=2 failed');
  assert.ok(
    calls.some(u => u === 'fish-game.json?v=2'),
    'the newer dataset was asked for'
  );
  await v2.activate();
  const kept = [...store.all.get('reefid-shell-v2').keys()].map(u => u.slice(SITE.length));
  assert.ok(kept.includes('fish.json?v=6') && kept.includes('fish-photos.json?v=6'), 'the unchanged datasets were carried over');
  assert.ok(!kept.includes('fish-game.json?v=2'), 'the dataset that failed is not claimed');
  // The line is back: the page's own fetch brings it, kept for the next visit.
  const net = [];
  const up = worker('reefid-shell-v2', store, net, {src: bump});
  await up.get(SITE + 'fish-game.json?v=2');
  await up.get(SITE + 'fish-game.json?v=2');
  assert.deepStrictEqual(net, [SITE + 'fish-game.json?v=2']);
});

// The Coral Finder book crops are out of the app: the activation of the next version deletes the copies a
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

// A page opened while a newer version waits: in Chromium that navigation takes the waiting version over and stops this
// worker with the navigation in it, so a page the worker was answering would never load. Such a navigation is left to the browser (no respondWith); the page's other requests are answered as
// always, and a navigation with no version waiting too.
test('a navigation while a newer version waits is left to the browser; other requests and other times are answered', async () => {
  const net = [];
  const waiting = worker('reefid-shell-v1', storage(), net, {waiting: true});
  for (const page of ['admin.html?demo', 'index.html', ''])
    assert.deepStrictEqual(waiting.dispatch(SITE + page), {}, `${page || 'the root'}: not answered, nothing kept alive`);
  assert.deepStrictEqual(net, [], 'the worker fetched nothing for them');
  assert.ok(waiting.dispatch(SITE + 'curation-play.json', 'cors').reply, 'a request of the page is still answered');
  assert.ok(waiting.dispatch(SITE + 'app.js?v=1', 'no-cors').reply, 'a versioned file too');
  const calm = worker('reefid-shell-v1', storage(), []);
  assert.ok(calm.dispatch(SITE + 'admin.html?demo').reply, 'no version waiting: the page is answered by the worker');
});

// A swap held by Chromium (a request that comes in the instant the old worker is stopped for the swap starts it again,
// and the new version then waits): the old worker asks the waiting version, at each request, to take
// over again, and the waiting version calls skipWaiting() again on that message, and on no other.
test('a worker with a newer version waiting asks it to take over; the waiting version calls skipWaiting() again', async () => {
  const old = worker('reefid-shell-v1', storage(), [], {waiting: true});
  old.dispatch(SITE + 'manifest.webmanifest', 'cors');
  old.dispatch(SITE + 'index.html');
  // (made in the sandbox's realm: compared as JSON)
  assert.strictEqual(
    JSON.stringify(old.sent),
    JSON.stringify([{t: 'reefid-skip'}, {t: 'reefid-skip'}]),
    'one ask per request, navigations included'
  );
  const calm = worker('reefid-shell-v1', storage(), []);
  calm.dispatch(SITE + 'manifest.webmanifest', 'cors');
  const next = worker('reefid-shell-v2', storage(), []);
  await next.message({t: 'other'});
  assert.deepStrictEqual(next.skips, [], 'another message changes nothing');
  await next.message({t: 'reefid-skip'});
  assert.deepStrictEqual(next.skips, [1]);
});
