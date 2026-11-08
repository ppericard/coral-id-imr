// A new version reaching an open page (app.js UPDATED, QOPEN; 2026-11-05: never in the middle of a question): app.js's
// block run in a sandbox, with the page and its service worker stubbed. A page no service worker controls reads the
// deployed page's build number instead (newBuild, buildCheck).
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
// sw: false, a browser without service workers; controller: null, one that does not control the page; build: the
// running page's <meta name="build"> (null: none); deployed: the page the server now serves.
function page({sw = true, controller = {}, build = '7', deployed = '<meta name="build" content="7">'} = {}) {
  const on = {},
    swOn = {},
    asked = [];
  let reloads = 0;
  const ctx = {
    document: {
      visibilityState: 'visible',
      addEventListener: (t, f) => (on[t] = f),
      querySelector: q => (q === 'meta[name="build"]' && build !== null ? {content: build} : null)
    },
    location: {reload: () => reloads++, pathname: '/coral-id-imr/'},
    navigator: sw
      ? {
          serviceWorker: {
            controller,
            getRegistration: async () => null,
            addEventListener: (t, f) => (swOn[t] = f),
            startMessages: () => {}
          }
        }
      : {},
    fetch: async (u, o) => (asked.push([u, o]), {ok: true, text: async () => deployed}),
    curAt: Date.now(),
    curRefresh: () => {},
    appVer: () => '300',
    R2: true,
    setInterval: () => 0,
    Date
  };
  vm.createContext(ctx);
  vm.runInContext(SRC + '\nthis.T = {get UPDATED() { return UPDATED; }, set QOPEN(v) { QOPEN = v; }, newBuild, swCheck};', ctx);
  return {
    T: ctx.T,
    asked,
    reloads: () => reloads,
    back: () => on.visibilitychange(),
    takeover: () => swOn.controllerchange()
  };
}
const settle = () => new Promise(ok => setImmediate(ok));

test('a new version taken over in the background waits for the answer when the page comes back into view', () => {
  const p = page();
  p.takeover();
  assert.strictEqual(p.T.UPDATED, true);
  p.T.QOPEN = true; // back to the app with a question waiting for its answer: not now
  p.back();
  assert.strictEqual(p.reloads(), 0, 'reloaded in the middle of a question');
  p.T.QOPEN = false; // answered (or another page): the next return reloads
  p.back();
  assert.strictEqual(p.reloads(), 1);
});

test('newBuild: only a newer deployed build is a new version', () => {
  const {newBuild} = page().T,
    at = n => `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="build" content="${n}">\n`;
  assert.strictEqual(newBuild('41', at(42)), true);
  assert.strictEqual(newBuild('41', at(41)), false, 'the same build');
  assert.strictEqual(newBuild('41', at(40)), false, "an older page from a host's cache");
  assert.strictEqual(newBuild('9', at(10)), true, 'compared as numbers, not text');
  assert.strictEqual(newBuild('41', '<html><head></head>'), false, 'a deployed page without a build');
  assert.strictEqual(newBuild('', at(42)), false, 'a running page without a build');
  assert.strictEqual(newBuild('41', ''), false, 'no answer');
});

test('a page no service worker controls takes a newer deployed build as a takeover, and waits for the answer', async () => {
  for (const o of [{sw: false}, {controller: null}]) {
    const p = page({...o, build: '7', deployed: '<meta name="build" content="8">'});
    p.T.swCheck();
    await settle();
    // JSON: the options object comes from the sandbox's realm.
    assert.strictEqual(JSON.stringify(p.asked), '[["/coral-id-imr/",{"cache":"no-store"}]]', 'the page itself, past the browser cache');
    assert.strictEqual(p.T.UPDATED, true);
    p.T.QOPEN = true;
    p.back();
    assert.strictEqual(p.reloads(), 0, 'reloaded in the middle of a question');
    p.T.QOPEN = false;
    p.back();
    assert.strictEqual(p.reloads(), 1);
  }
});

test('the deployed build is not read when nothing would change', async () => {
  const same = page({sw: false});
  same.T.swCheck();
  await settle();
  assert.strictEqual(same.asked.length, 1);
  assert.strictEqual(same.T.UPDATED, false, 'the same build');
  const ctl = page({deployed: '<meta name="build" content="8">'});
  ctl.T.swCheck();
  await settle();
  assert.strictEqual(ctl.asked.length, 0, 'a page a service worker controls: the worker brings new versions');
  const local = page({sw: false, build: null, deployed: '<meta name="build" content="8">'});
  local.T.swCheck();
  await settle();
  assert.strictEqual(local.asked.length, 0, 'a copy never deployed');
});
