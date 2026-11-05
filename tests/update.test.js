// A new version reaching an open page (app.js UPDATED, QOPEN; 2026-11-05: never in the middle of a question): app.js's
// block run in a sandbox, with the page and its service worker stubbed.
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
function page() {
  const on = {},
    swOn = {};
  let reloads = 0;
  const ctx = {
    document: {visibilityState: 'visible', addEventListener: (t, f) => (on[t] = f)},
    location: {reload: () => reloads++},
    navigator: {
      serviceWorker: {
        controller: {},
        getRegistration: async () => null,
        addEventListener: (t, f) => (swOn[t] = f),
        startMessages: () => {}
      }
    },
    curAt: Date.now(),
    curRefresh: () => {},
    appVer: () => '300',
    R2: true,
    setInterval: () => 0,
    Date
  };
  vm.createContext(ctx);
  vm.runInContext(SRC + '\nthis.T = {get UPDATED() { return UPDATED; }, set QOPEN(v) { QOPEN = v; }};', ctx);
  return {T: ctx.T, reloads: () => reloads, back: () => on.visibilitychange(), takeover: () => swOn.controllerchange()};
}

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
