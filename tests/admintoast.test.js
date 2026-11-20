require('./slot.js').testGuard();
// The admin's toast against a background run (the auto-sorts, admin.js sugRun; Pierre's Publish confirmation must stay
// readable): the fish auto-sort's toast came 8 s after the load and could replace the "Published" toast 0.5 s after it.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8'),
  B = (from, to) => block(src, from, to, {file: 'admin.js'});

// A clock the test moves: setTimeout and Date.now of the page.
function page() {
  const clock = {t: 1e6, timers: [], n: 0},
    el = {},
    ctx = {
      document: {
        querySelector: () => (el.made ? el : null),
        createElement: () => Object.assign(el, {made: true, hidden: true, setAttribute() {}}),
        body: {append() {}}
      },
      Date: {now: () => clock.t},
      setTimeout: (fn, ms) => (clock.timers.push({id: ++clock.n, at: clock.t + ms, fn}), clock.n),
      clearTimeout: id => (clock.timers = clock.timers.filter(x => x.id !== id))
    };
  vm.createContext(ctx);
  vm.runInContext(B('let toastT;', '\n/* ---------- Choices that point'), ctx);
  const advance = ms => {
    const end = clock.t + ms;
    for (;;) {
      const next = clock.timers.filter(x => x.at <= end).sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!next) break;
      clock.timers = clock.timers.filter(x => x !== next);
      clock.t = next.at;
      next.fn();
    }
    clock.t = end;
  };
  const run = code => vm.runInContext(code, ctx);
  return {ctx, el, run, advance, clock};
}

// The toast itself, in its own page: what the admin reads.
const text = P => (P.el.hidden ? '' : P.el.textContent);

test('toast: a background toast 0.5 s after Published waits, Published stays readable, then it shows', () => {
  const P = page();
  P.run(`toast('Published. The public site shows it within a minute or two.')`);
  P.advance(500);
  P.run(`toast('Fish auto-sort: 4 proposed in, 9 taken out by a newer judgement. Publish sends them.', 3500, true)`);
  assert.match(text(P), /^Published/);
  P.advance(3000); // 3.5 s after Published: its own time is over, the hold (4 s) is not
  assert.strictEqual(P.el.textContent, 'Published. The public site shows it within a minute or two.');
  assert.strictEqual(text(P), '', 'it hides after its time, the background one is not shown over the hold');
  P.advance(600);
  assert.match(text(P), /^Fish auto-sort/);
});

test('toast: the newest waiting background toast is the one shown; a toast with no hold shows at once', () => {
  const P = page();
  P.run(`toast('Undone.')`);
  P.run(`toast('first', 3500, true)`);
  P.advance(100);
  P.run(`toast('second', 3500, true)`);
  P.advance(4000);
  assert.strictEqual(text(P), 'second');
  const Q = page();
  Q.run(`toast('Auto-sort: 3 added', 3500, true)`);
  assert.strictEqual(text(Q), 'Auto-sort: 3 added');
  Q.run(`toast('Undone.')`);
  assert.strictEqual(text(Q), 'Undone.', 'an action replaces a background toast at once');
});

test('toast: another action in between moves the waiting background toast back again; none lost', () => {
  const P = page();
  P.run(`toast('Saving…')`);
  P.run(`toast('bg', 3500, true)`);
  P.advance(3000);
  P.run(`toast('Published.')`);
  P.advance(3900);
  assert.strictEqual(P.el.textContent, 'Published.');
  P.advance(200);
  assert.strictEqual(text(P), 'bg');
});

test('toast: a long warning keeps its own time as the hold', () => {
  const P = page();
  P.run(`toast('Signed out in another tab…', 15000)`);
  P.run(`toast('bg', 3500, true)`);
  P.advance(14000);
  assert.strictEqual(P.el.textContent, 'Signed out in another tab…');
  P.advance(1100);
  assert.strictEqual(text(P), 'bg');
});

test('admin.js: the auto-sorts and another tab’s clicks toast in the background, nothing else does', () => {
  const toasts = [...src.matchAll(/toast\([^\n]*?, 3500, true\)/g)].map(m => m[0]);
  assert.strictEqual(toasts.length, 3, toasts.join(' | '));
  assert.ok(toasts.some(t => /autoToast\(ar\)/.test(t)) && toasts.some(t => /fishToast\(R\)/.test(t)));
  assert.ok(toasts.some(t => /another admin tab/.test(t)));
  assert.ok(!/saveDraft\(true\)/.test(src), 'the saves are not special-cased (Undo is untouched here)');
});
