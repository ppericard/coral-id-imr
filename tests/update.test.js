// A new version reaching an open page (app.js UPDATED, swCheck, verCheck, QOPEN; Pierre, 2026-11-05: a device stayed two
// days on an old app): app.js's block run in a sandbox, with the page, its service worker (or none) and the deployed
// page stubbed.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const block = require('./block.js');

const SRC = block(
  fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'),
  '// New versions (Pierre, 2026-11-02',
  '// The service worker is registered once',
  {file: 'app.js'}
);
// build: this page's <meta name="build"> (none: a copy never deployed); sw: a controlling worker, none, or no support;
// deployed: the build of the page the site serves now.
function page({build = 300, sw = 'none', deployed = 301} = {}) {
  const on = {},
    fetched = [],
    swOn = {};
  let reloads = 0;
  const doc = {
    visibilityState: 'visible',
    querySelector: s => (s === 'meta[name="build"]' && build ? {content: String(build)} : null),
    addEventListener: (t, f) => (on[t] = f)
  };
  const ctx = {
    document: doc,
    location: {reload: () => reloads++},
    navigator:
      sw === 'unsupported'
        ? {}
        : {
            serviceWorker: {
              controller: sw === 'controls' ? {} : null,
              getRegistration: async () => null,
              addEventListener: (t, f) => (swOn[t] = f),
              startMessages: () => {}
            }
          },
    fetch: async (u, o) => (
      fetched.push([u, o]),
      {ok: true, text: async () => `<meta charset="utf-8">\n<meta name="build" content="${deployed}">\n`}
    ),
    curAt: Date.now(),
    curRefresh: () => {},
    appVer: () => String(build),
    R2: true,
    setInterval: () => 0,
    Date,
    Number
  };
  vm.createContext(ctx);
  vm.runInContext(SRC + '\nthis.T = {swCheck, get UPDATED() { return UPDATED; }, set QOPEN(v) { QOPEN = v; }};', ctx);
  const settle = () => new Promise(r => setImmediate(r)).then(() => new Promise(r => setImmediate(r)));
  return {
    T: ctx.T,
    fetched,
    reloads: () => reloads,
    settle,
    back: () => on.visibilitychange(),
    takeover: () => swOn.controllerchange && swOn.controllerchange()
  };
}

test('a page no service worker controls learns of a new deploy from the page itself, and reloads at the next calm moment', async () => {
  for (const sw of ['none', 'unsupported']) {
    const p = page({sw});
    p.T.swCheck();
    await p.settle();
    assert.deepStrictEqual(
      p.fetched.map(([u, o]) => [u, o.cache]),
      [['./', 'no-store']],
      sw
    );
    assert.strictEqual(p.T.UPDATED, true, `${sw}: a newer build deployed is a new version`);
    p.T.QOPEN = true; // back to the app with a question waiting for its answer: not now
    p.back();
    assert.strictEqual(p.reloads(), 0, 'reloaded in the middle of a question');
    p.T.QOPEN = false; // answered (or another page): the next return reloads
    p.back();
    assert.strictEqual(p.reloads(), 1);
  }
});

test('the same build, a controlling worker or a copy never deployed: nothing changes', async () => {
  const same = page({deployed: 300});
  same.T.swCheck();
  await same.settle();
  assert.strictEqual(same.T.UPDATED, false);
  for (const o of [{sw: 'controls'}, {build: 0}]) {
    const p = page(o);
    p.T.swCheck();
    await p.settle();
    assert.deepStrictEqual([p.fetched.length, p.T.UPDATED], [0, false], JSON.stringify(o));
  }
});

test('a takeover by a new worker waits for the answer too when the page comes back into view', () => {
  const p = page({sw: 'controls'});
  p.takeover();
  assert.strictEqual(p.T.UPDATED, true);
  p.T.QOPEN = true;
  p.back();
  assert.strictEqual(p.reloads(), 0, 'reloaded in the middle of a question');
  p.T.QOPEN = false;
  p.back();
  assert.strictEqual(p.reloads(), 1);
});
