// The offer to install the app (app.js installDue, installVisit, installIos; Pierre, 2026-11-08: nudge phone players to
// install it on the home screen instead of opening a link in the browser). installDue decides, on its inputs only; the
// card itself, its calm moment on Home and the ⚙ row are in tests/pages.smoke.js (part install).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'),
  ctx = {};
vm.createContext(ctx);
vm.runInContext(
  block(src, 'const INSTALL = ', 'let installEv = null', {file: 'app.js'}) +
    '\nthis.due = installDue; this.visit = installVisit; this.ios = installIos; this.I = INSTALL;',
  ctx
);
const {due, visit, ios, I} = ctx,
  base = {standalone: false, rec: {n: I.VISITS}, way: 'prompt', touch: true, answers: 0};

test('installDue: from the 3rd visit, or a first session of answers, whichever first', () => {
  assert.strictEqual(due(base), true, 'the 3rd visit');
  assert.strictEqual(due({...base, rec: {n: I.VISITS - 1}}), false, 'not on the 2nd visit');
  assert.strictEqual(due({...base, rec: {n: 1}, answers: I.ANSWERS}), true, 'a first session of answers, on the 1st visit');
  assert.strictEqual(due({...base, rec: {n: 1}, answers: I.ANSWERS - 1}), false, 'not before the session is done');
  assert.strictEqual(due({...base, rec: null, answers: 0}), false, 'no record yet: not due');
  assert.strictEqual(I.VISITS, 3);
  assert.strictEqual(I.ANSWERS, 10, 'a full session trail (DESIGN.md "Game session trail": 10 cells)');
});

test('installDue: never again once closed or installed, never in the installed app', () => {
  assert.strictEqual(due({...base, rec: {n: 5, x: 1}}), false, 'closed: never repeated');
  assert.strictEqual(due({...base, rec: {n: 5, in: 1}}), false, 'installed (appinstalled, or opened as the app once)');
  assert.strictEqual(due({...base, standalone: true}), false, 'running installed');
});

test('installDue: on touch screens only, and only with something to offer', () => {
  assert.strictEqual(due({...base, touch: false}), false, 'a mouse: no nudge (the ⚙ row is there)');
  assert.strictEqual(due({...base, way: 'ios'}), true, 'iPhone or iPad Safari: the steps');
  assert.strictEqual(due({...base, way: ''}), false, 'no prompt and not Safari: nothing to offer');
});

test('installVisit: a new visit after 30 minutes away, a reload is none', () => {
  const t = 1e12;
  assert.deepStrictEqual({...visit(null, t)}, {n: 1, t}, 'the first load');
  assert.deepStrictEqual({...visit({n: 1, t}, t + 60000)}, {n: 1, t: t + 60000}, 'a reload a minute later');
  assert.deepStrictEqual({...visit({n: 1, t}, t + I.GAP)}, {n: 2, t: t + I.GAP}, '30 minutes later: a new visit');
  assert.deepStrictEqual({...visit({n: 2, t, x: 5}, t + 2 * I.GAP)}, {n: 3, t: t + 2 * I.GAP, x: 5}, 'the marks are kept');
  assert.deepStrictEqual({...visit({n: 2, t}, t - 1000)}, {n: 3, t: t - 1000}, 'a clock set back: a new visit, never stuck');
  assert.deepStrictEqual({...visit('junk', t)}, {n: 1, t}, 'a broken record starts over');
});

test('installIos: iPhone and iPad Safari only', () => {
  const iphone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
    ipad = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
    crios =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
    fb =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]',
    android = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
  assert.strictEqual(ios(iphone, 5), true, 'iPhone Safari');
  assert.strictEqual(ios(ipad, 5), true, 'iPad Safari (asks for the desktop site: a Mac with a touch screen)');
  assert.strictEqual(ios(ipad, 0), false, 'a Mac: no');
  assert.strictEqual(ios(crios, 5), false, 'Chrome on iPhone: not Safari');
  assert.strictEqual(ios(fb, 5), false, "an app's own browser");
  assert.strictEqual(ios(android, 5), false, 'Android');
});
