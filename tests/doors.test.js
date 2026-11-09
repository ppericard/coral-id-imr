// Home's doors before the data (Pierre, 2026-11-02, ROADMAP "Load order, further steps" (a), reopened 2026-11-09):
// app.js beforeData draws the doors once Home's scripts have run, for a subject whose doors need none of its own files
// (UNITS doorsFirst), and the loading bar for any other page, which asks for its tier at once; homeAgain draws Home again
// once the data is in, keeping the scroll, the open ? help and the focus. home.js viewHome draws its doors without DATA,
// the band empty. The blocks run in a vm with the page stubbed.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'),
  home = fs.readFileSync(path.join(__dirname, '..', 'home.js'), 'utf8');

// A page element: innerHTML, hidden, attributes, and the controls it holds (by the markup's hrefs and buttons).
function el(html = '') {
  const e = {
    innerHTML: html,
    hidden: true,
    attrs: {},
    setAttribute: (k, v) => (e.attrs[k] = v),
    contains: x => !!x && x.inView === e,
    querySelector: s => (s === '.boot' ? (/class="boot"/.test(e.innerHTML) ? {} : null) : null),
    // The same nodes while the markup is the same, new ones once it is drawn again (as the DOM).
    querySelectorAll: () => {
      if (e.last && e.lastHtml === e.innerHTML) return e.last;
      e.lastHtml = e.innerHTML;
      const L = (e.innerHTML.match(/<(a href|button)[^>]*>/g) || []).map((t, i) => ({t, i, inView: e, focused: false}));
      L.forEach(x => (x.focus = () => ((x.focused = true), (ctx.focused = x))));
      e.last = L;
      return L;
    }
  };
  return e;
}
let ctx;
function app({subj = 'coral', hash = '', data = false} = {}) {
  const log = [];
  const $v = el('<div class="boot"><p class="note">Loading…</p><progress id="bootp"></progress><p id="boots"></p></div>');
  ctx = {
    log,
    $v,
    $helpbox: el(),
    $help: el(),
    hash,
    scrollY: 0,
    DATA: data ? {gen: {}} : undefined,
    SUBJ: {id: subj},
    UNITS: {coral: {doorsFirst: true}, fish: {}},
    viewHome: () => (log.push('doors'), ($v.innerHTML = '<a href="#a"><a href="#b"><button>')),
    bootTick: {n: () => 3},
    scrollTo: (x, y) => ((ctx.scrollY = y), log.push('scroll ' + y)),
    document: {getElementById: () => null},
    hashNow: () => ctx.hash,
    pageTier: h => (!h || h === 'home' ? 1 : /^(quiz|genera|progress)/.test(h) ? 2 : 5),
    need: n => (log.push('need ' + n), Promise.resolve()),
    bootMax: n => 10 * n,
    resetHelp: () => (log.push('resetHelp'), (ctx.$helpbox.hidden = true)),
    hdrMetrics: () => {},
    route: () => {
      log.push('route');
      ctx.$v.innerHTML = '<a href="#a"><a href="#b"><button>';
      ctx.$v.last = null; // new nodes
      ctx.$helpbox.hidden = true;
      ctx.scrollY = 0;
    },
    domReady: new Promise(() => {})
  };
  ctx.window = ctx; // the page's global is its window
  ctx.document.activeElement = null;
  vm.createContext(ctx);
  vm.runInContext(
    block(src, 'let EARLY = false,', 'domReady.then(() => DATA || beforeData());', {file: 'app.js'}) +
      '\nthis.M = {beforeData, homeAgain, get EARLY() { return EARLY; }, fail: () => (dataFailed = true)};',
    ctx
  );
  return ctx;
}

test('the corals: Home before the data draws the doors, no loading bar, no tier asked', () => {
  const A = app();
  A.M.beforeData();
  assert.ok(A.M.EARLY);
  assert.deepStrictEqual(A.log, ['resetHelp', 'doors']);
  A.hash = 'home';
  A.M.beforeData();
  assert.ok(A.M.EARLY, '#home is Home too');
});

test('a subject whose doors need its own files (fish) keeps the start-up bar', () => {
  const A = app({subj: 'fish'}),
    was = A.$v.innerHTML;
  A.M.beforeData();
  assert.ok(!A.M.EARLY);
  assert.deepStrictEqual(A.log, [], 'no doors, no tier');
  assert.strictEqual(A.$v.innerHTML, was, 'the start-up bar and its slow-line note stay');
});

test('a page tapped on the early doors: the loading bar again, its tier asked at once; back to Home, the doors', () => {
  const A = app();
  A.M.beforeData();
  A.hash = 'quiz';
  A.M.beforeData();
  assert.ok(!A.M.EARLY);
  assert.ok(A.log.includes('need 2'), 'the quiz tier is asked for now');
  assert.match(A.$v.innerHTML, /class="boot"[\s\S]*max="20" value="3"/, 'the bar, sized for tier 2, at the steps so far');
  A.hash = '';
  A.M.beforeData();
  assert.ok(A.M.EARLY);
  assert.strictEqual(A.log.filter(x => x === 'doors').length, 2);
});

test('a link straight to a page before the data: the start-up bar stays, its maximum raised for the tier', () => {
  const A = app({hash: 'lab'});
  A.M.beforeData();
  assert.ok(A.log.includes('need 5'));
  assert.match(A.$v.innerHTML, /id="boots"/, 'the start-up bar, its slow-line note included');
});

test('after "Could not load the data", nothing is drawn over the message', () => {
  const A = app();
  A.M.fail();
  A.$v.innerHTML = '<p class="warn">Could not load the data.</p>';
  A.M.beforeData();
  assert.deepStrictEqual(A.log, []);
  assert.match(A.$v.innerHTML, /Could not load/);
});

test('the data in over the early doors: Home drawn again, the scroll, the open help and the focus kept', () => {
  const A = app();
  A.M.beforeData();
  A.scrollY = 240;
  A.$helpbox.hidden = false;
  const L = A.$v.querySelectorAll();
  A.document.activeElement = L[1];
  A.M.homeAgain();
  assert.ok(!A.M.EARLY);
  assert.ok(A.log.includes('route'));
  assert.strictEqual(A.scrollY, 240, 'the scroll kept');
  assert.strictEqual(A.$helpbox.hidden, false, 'the help still open');
  assert.strictEqual(A.$help.attrs['aria-expanded'], 'true');
  assert.strictEqual(A.focused && A.focused.i, 1, 'the same control has the focus');
});

test('the data in, the address sent elsewhere by route(): nothing restored', () => {
  const A = app();
  A.M.beforeData();
  A.scrollY = 240;
  A.route = () => ((A.hash = 'genera'), (A.scrollY = 0));
  A.M.homeAgain();
  assert.strictEqual(A.scrollY, 0);
});

test('home.js viewHome without DATA: the corals doors, the band empty', () => {
  const out = {};
  const c = {
    window: {},
    document: {documentElement: {dataset: {}}},
    DATA: undefined,
    $v: out,
    subjMine: () => [{id: 'coral'}, {id: 'fish'}],
    subjBtns: () => '<button data-subj="coral">',
    P: {},
    LEVEL: 'genus',
    store: {get: (k, d) => d},
    startKey: () => 'k',
    basicsDue: () => true,
    CHOICE: {ASK: 20},
    SUBJ: {id: 'coral', many: 'genera'},
    UNITS: {coral: {identify: 'idkey'}},
    GX: () => {
      throw new Error('GX read before the data');
    },
    slateGenera: () => {
      throw new Error('slateGenera read before the data');
    },
    shuffle: a => a,
    esc: s => s,
    hr: k => '#' + k,
    photoUrl: u => u,
    saver: () => false,
    ORG: {short: 'IMR'}
  };
  vm.createContext(c);
  vm.runInContext(home, c);
  c.window.viewHome();
  const h = out.innerHTML;
  assert.match(h, /class="hdoors"/);
  assert.match(h, /<span class="hdtiles"><\/span>/, 'the band empty');
  assert.match(h, /Identify a coral/);
  assert.match(h, /data-subj="coral"/, 'the subject row as once the data is in');
  assert.match(h, /New to corals\?/, 'the basics line, from the device alone');
});
