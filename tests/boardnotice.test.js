require('./slot.js').testGuard();
// The leaderboard notice never sits over a question's answers or Next (REE-210: on a 390 px phone it covered two of four
// answers and Next for 15 s): progress.js noticeHold decides, from whether the notice is up and whether a question is on
// screen, and boardNotice / boardStep run it at each change of the page (a MutationObserver). progress.js runs here in
// Node: its functions are cut out of the source and given stubs for the page; a change of the page is the test calling
// the observer. Nothing leaves this process (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'progress.js'), 'utf8'),
  notice = /function boardNotice\(\) \{[\s\S]*?\nfunction boardShow\(\) \{[\s\S]*?\n}\n/.exec(src)[0];

// A page: open (a question on screen), the toasts it holds, the observers made, the store.
function page({open = false, told = false} = {}) {
  const toasts = [],
    observers = [],
    saved = {},
    added = [];
  const mk = () => {
    const t = {
      dataset: {},
      isConnected: true,
      remove() {
        t.isConnected = false;
      },
      querySelector: () => ({onclick: null, addEventListener() {}})
    };
    toasts.push(t);
    return t;
  };
  const ctx = {
    SYNC: {name: 'Ana', pin: '1234'},
    SUBJ: {},
    boardLive: () => true,
    noticeLater: () => false,
    toldHas: () => told,
    loadBoard: () => new Promise(() => {}),
    board0: () => null,
    syncSoon: () => {},
    document: {body: {}},
    $v: {querySelector: () => (ctx.open ? {} : null)},
    open,
    esc: s => s,
    hr: () => '#leaderboard',
    appToast: () => mk(),
    toldAdd: (...L) => added.push(...L),
    store: {get: (k, d) => (k in saved ? saved[k] : d), set: (k, v) => (saved[k] = v)},
    setTimeout: () => 0,
    MutationObserver: class {
      constructor(fn) {
        this.fn = fn;
        this.on = true;
        this.targets = [];
        observers.push(this);
      }
      observe(t) {
        this.targets.push(t);
      }
      disconnect() {
        this.on = false;
      }
    }
  };
  vm.createContext(ctx);
  vm.runInContext(notice + '\nthis.boardNotice = boardNotice; this.noticeHold = noticeHold; this.boardStop = boardStop;', ctx);
  // The page changed: the observers still watching run.
  const change = () => observers.filter(o => o.on).forEach(o => o.fn());
  return {ctx, toasts, saved, added, change, observers, live: () => toasts.filter(t => t.isConnected)};
}

test('the timing rule: shown only with no question on screen, taken back when one opens', () => {
  const {noticeHold} = page().ctx;
  assert.strictEqual(noticeHold(false, false), 'show', 'Home, Learn, My progress: shown');
  assert.strictEqual(noticeHold(false, true), 'wait', 'a question open (answered or not): waits');
  assert.strictEqual(noticeHold(true, false), 'keep', 'shown and still no question: stays');
  assert.strictEqual(noticeHold(true, true), 'pull', 'shown when a question opens: taken back');
});

test('a question open: nothing shown, nothing told, however many pages are drawn', () => {
  const p = page({open: true});
  p.ctx.boardNotice();
  for (let i = 0; i < 40; i++) p.change(); // each question drawn, each Next
  assert.strictEqual(p.toasts.length, 0);
  assert.strictEqual(p.saved['reefid-board-told'], undefined, 'not marked told while waiting');
  assert.deepStrictEqual(p.added, []);
  assert.strictEqual(p.observers.filter(o => o.on).length, 1, 'still waiting for a break');
});

test('shown at the first break, marked told only then; a question that opens takes it away at once, due again', () => {
  const p = page({open: true});
  p.ctx.boardNotice();
  p.ctx.open = false; // Home drawn
  p.change();
  assert.strictEqual(p.live().length, 1, 'shown on the first page without a question');
  assert.strictEqual(p.saved['reefid-board-told'], 1);
  p.change();
  assert.strictEqual(p.live().length, 1, 'it stays while there is none');
  p.ctx.open = true; // a question is drawn under it
  p.change();
  assert.strictEqual(p.live().length, 0, 'taken away in the same change, before it is painted');
  assert.strictEqual(p.toasts[0].dataset.off, 1, 'its own told timer does nothing');
  assert.strictEqual(p.saved['reefid-board-told'], 0, 'not told: due again');
  p.change();
  assert.strictEqual(p.toasts.length, 1, 'not shown again over the question');
  p.ctx.open = false;
  p.change();
  assert.strictEqual(p.toasts.length, 2, 'shown again at the next break');
  assert.strictEqual(p.live().length, 1);
});

test('shown at once on a page without a question; a second call while it waits or shows adds nothing', () => {
  const p = page();
  p.ctx.boardNotice();
  assert.strictEqual(p.live().length, 1);
  p.ctx.boardNotice(); // as a later load or a second device's sync would
  p.change();
  assert.strictEqual(p.toasts.length, 1);
  assert.strictEqual(p.observers.length, 1);
  const q = page({open: true});
  q.ctx.boardNotice();
  q.ctx.boardNotice();
  assert.strictEqual(q.observers.length, 1, 'one wait while a question is open');
});

test('closed by the player or gone by itself: the wait ends; told elsewhere, signed out, or a subject without a board: none', () => {
  const p = page();
  p.ctx.boardNotice();
  p.toasts[0].remove(); // ✕, or its 15 s
  p.change();
  assert.strictEqual(p.observers[0].on, false, 'no further watching');
  assert.strictEqual(p.toasts.length, 1, 'never shown a second time');
  const q = page({open: true});
  q.ctx.boardNotice();
  q.ctx.SYNC = null;
  q.change();
  assert.strictEqual(q.observers[0].on, false, 'signed out while waiting');
  const r = page({open: true});
  r.ctx.boardNotice();
  r.ctx.boardLive = () => false;
  r.change();
  assert.strictEqual(r.observers[0].on, false, 'a subject without a leaderboard');
  const s = page({told: true});
  s.ctx.boardNotice();
  assert.strictEqual(s.toasts.length + s.observers.length, 0, 'told on another device of the account');
  const u = page({open: true});
  u.ctx.boardNotice();
  u.ctx.boardStop(); // a switch of subject (toastsOff) while it waits
  u.ctx.open = false;
  u.change();
  assert.strictEqual(u.toasts.length, 0, 'a switch of subject takes the wait away');
});

test('an account made after the leaderboard shipped: the notice without "New:"; an existing one keeps it', () => {
  const run = flag => {
    const p = page();
    if (flag !== undefined) p.saved['reefid-board-new'] = flag;
    let said = '';
    const base = p.ctx.appToast;
    p.ctx.appToast = m => ((said = m), base(m));
    p.ctx.boardNotice();
    return said;
  };
  assert.ok(!/New:/.test(run(1)), 'new account: no "New:"');
  assert.match(run(1), /^🏆 There is a <a .*leaderboard<\/a>\. Your name shows there/);
  assert.match(run(0), /^🏆 New: a /, 'existing account: unchanged');
  assert.match(run(undefined), /^🏆 New: a /, 'no flag: unchanged');
  const sync = fs.readFileSync(path.join(__dirname, '..', 'sync.js'), 'utf8');
  assert.match(sync, /store\.set\('reefid-board-new', j\.found \? 0 : 1\)/, 'signIn sets the flag from j.found');
});

test('the close button of every note is a 44 px target', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'app.css'), 'utf8'),
    b = /\n\.apptoast button \{([^}]*)\}/.exec(css)[1];
  assert.match(b, /width: 44px/);
  assert.match(b, /height: 44px/);
});
