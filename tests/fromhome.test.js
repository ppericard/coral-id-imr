// The first page opened from Home in a visit (ROADMAP "Load order, further steps" (c)): app.js fromHome, called by
// route() before it draws a page, sends one 'fromhome' event a visit, the first time a Home it drew is left for another
// page, only once the sheet script has the kind (rule D4); the welcome tour's own steps are not the player's choice.
// The block runs in a vm with route()'s state stubbed.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function app({v = 999} = {}) {
  const sent = [],
    c = {
      sent,
      tour: false,
      now: 1000,
      routeFrom: '',
      HAVE: 1,
      SUBJ: {pv: ''},
      performance: {now: () => c.now},
      document: {getElementById: id => (id === 'tour' && c.tour ? {} : null)},
      sheetV: () => v,
      pageName: h => h,
      ev: (k, o) => sent.push([k, JSON.parse(JSON.stringify(o))]) // out of the vm's realm, for deepStrictEqual
    };
  vm.createContext(c);
  vm.runInContext(
    block(src, 'const FROMHOME_SHEET = ', '\nfunction route() {', {file: 'app.js'}) +
      '\nthis.fromHome = fromHome; this.homeDrawn = () => { if (!HOME_AT) HOME_AT = performance.now(); };' +
      '\nthis.GATE = FROMHOME_SHEET;',
    c
  );
  return c;
}

test('Home drawn, then the quiz: one event, its page, the seconds on Home, the tier wait; never twice a visit', () => {
  const A = app();
  A.homeDrawn();
  A.now = 13500;
  A.fromHome('quiz', 2);
  assert.deepStrictEqual(A.sent, [['fromhome', {to: 'quiz', s: 12.5, w: 1, tr: 0}]]);
  A.routeFrom = 'home';
  A.fromHome('genera', 2);
  assert.strictEqual(A.sent.length, 1, 'once a visit');
});

test('nothing while Home was never drawn, from another page, or towards Home', () => {
  const A = app();
  A.fromHome('quiz', 2); // a link straight to the quiz: Home never drawn
  A.homeDrawn();
  A.routeFrom = 'genera';
  A.fromHome('quiz', 2);
  A.routeFrom = 'home';
  A.fromHome('home', 1);
  A.fromHome('', 1);
  assert.deepStrictEqual(A.sent, []);
  A.HAVE = 2;
  A.fromHome('progress', 2);
  assert.deepStrictEqual(A.sent, [['fromhome', {to: 'progress', s: 0, w: 0, tr: 0}]], 'its tier in: no wait');
});

test("the tour's steps are skipped, and the page after it says the tour ran", () => {
  const A = app();
  A.homeDrawn();
  A.tour = true;
  A.fromHome('quiz', 2);
  assert.deepStrictEqual(A.sent, []);
  A.tour = false;
  A.fromHome('quiz', 2);
  assert.strictEqual(A.sent[0][1].tr, 1);
});

test('an older sheet script: nothing sent (rule D4), and nothing later in the visit either', () => {
  const A = app({v: 120});
  assert.ok(A.GATE > 120);
  A.homeDrawn();
  A.fromHome('quiz', 2);
  assert.deepStrictEqual(A.sent, []);
});
