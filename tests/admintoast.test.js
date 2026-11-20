require('./slot.js').testGuard();
// The admin's toast and Undo against a background run (the auto-sorts, admin.js sugRun; Pierre's Publish confirmation must
// stay readable, his Undo must take back his own click): the fish auto-sort's toast came 8 s after the load and could replace
// the "Published" toast 0.5 s after it, and its save, landing between a pick and Undo, was the step Undo took back.
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
    shown = [],
    ctx = {
      document: {
        querySelector: () => (el.made ? el : null),
        createElement: () => Object.assign(el, {made: true, hidden: true, setAttribute() {}}),
        body: {append() {}}
      },
      Date: {now: () => clock.t},
      setTimeout: (fn, ms) => (clock.timers.push({id: ++clock.n, at: clock.t + ms, fn}), clock.n),
      clearTimeout: id => (clock.timers = clock.timers.filter(x => x.id !== id)),
      memoReset() {},
      sweepFlags() {},
      autoWhen() {},
      putDraft() {},
      keepHist() {},
      render() {},
      TOKEN: false,
      merge3: require('../core.js').merge3,
      toast: (m, ms, bg) => shown.push([m, !!bg])
    };
  vm.createContext(ctx);
  const toastCode = B('let toastT;', '\n/* ---------- Choices that point');
  vm.runInContext(toastCode, ctx);
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
  return {ctx, el, run, advance, clock, shown};
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

// The Undo steps: the real saveDraft, bgSink and step, a draft as small as the test needs.
function stack() {
  const P = page();
  P.ctx.toast = (m, ms, bg) => P.shown.push(m);
  P.run(B('let HIST = [],', '\n// The Undo steps survive'));
  P.run(B('const layRun = ', '\nlet draftLost'));
  P.run(B('function step(from, to, msg) {', '\n// When the admin answers a Check'));
  P.run(`
    let ASIG = null, ASIG_OF = null; // (autoWhen's, stubbed)
    const undo = () => step(HIST, FUT, ['Nothing to undo.', 'Undone.']),
      redo = () => step(FUT, HIST, ['Nothing to redo.', 'Redone.']);
    DRAFT = {genera: {}};
    snap = JSON.stringify(DRAFT);
    const pick = (f, v) => { DRAFT.quality = {...(DRAFT.quality || {}), [f]: v}; saveDraft(); };
    const auto = f => { DRAFT.auto = {...(DRAFT.auto || {}), d: {...((DRAFT.auto || {}).d || {}), [f]: 'r'}}; DRAFT.seen = {...(DRAFT.seen || {}), [f]: 1}; saveDraft(true); };
  `);
  return P;
}
const J = (P, code) => JSON.parse(P.run(`JSON.stringify(${code})`));

test('Undo: a background run landing between a pick and Undo: Undo takes back the pick, the run stays', () => {
  const P = stack();
  P.run(`pick('p1', 'Good')`);
  P.run(`auto('c1')`); // the sync auto-sort
  P.run(`auto('c2')`); // the fish auto-sort
  assert.strictEqual(P.run('HIST.length'), 1, 'the runs are no steps of his stack');
  P.run('undo()');
  const d = J(P, 'DRAFT');
  assert.strictEqual(d.quality, undefined, 'his pick is taken back');
  assert.deepStrictEqual(Object.keys(d.auto.d).sort(), ['c1', 'c2'], 'the runs stay');
  assert.deepStrictEqual(Object.keys(d.seen).sort(), ['c1', 'c2']);
  P.run('redo()');
  const r = J(P, 'DRAFT');
  assert.deepStrictEqual(r.quality, {p1: 'Good'}, 'Redo brings the pick back');
  assert.deepStrictEqual(Object.keys(r.auto.d).sort(), ['c1', 'c2'], 'with the runs');
});

test('Undo: a run landing after an Undo does not wipe Redo', () => {
  const P = stack();
  P.run(`pick('p1', 'Good')`);
  P.run('undo()');
  assert.strictEqual(P.run('FUT.length'), 1);
  P.run(`auto('c1')`);
  assert.strictEqual(P.run('FUT.length'), 1, 'Redo kept');
  assert.strictEqual(P.run('HIST.length'), 0);
  P.run('redo()');
  const d = J(P, 'DRAFT');
  assert.deepStrictEqual(d.quality, {p1: 'Good'});
  assert.deepStrictEqual(Object.keys(d.auto.d), ['c1']);
});

test('Undo: a pick made after the runs is undone first, then the earlier one, the runs always stay', () => {
  const P = stack();
  P.run(`pick('p1', 'Good')`);
  P.run(`auto('c1')`);
  P.run(`pick('p2', 'Fair')`);
  P.run('undo()');
  assert.deepStrictEqual(J(P, 'DRAFT.quality'), {p1: 'Good'});
  P.run('undo()');
  const d = J(P, 'DRAFT');
  assert.strictEqual(d.quality, undefined);
  assert.deepStrictEqual(Object.keys(d.auto.d), ['c1']);
});

test('Undo: a run before his first click is one Undo step, as it was (the whole run at load)', () => {
  const P = stack();
  P.run(`auto('c1')`);
  assert.strictEqual(P.run('HIST.length'), 1);
  P.run(`pick('p1', 'Good')`);
  P.run('undo()');
  assert.deepStrictEqual(Object.keys(J(P, 'DRAFT.auto.d')), ['c1']);
  P.run('undo()');
  assert.strictEqual(J(P, 'DRAFT').auto, undefined, 'the run is the step below his click');
});

test('Undo: a value he changed in the step Undo leads to stays his when a run lands', () => {
  const P = stack();
  P.run(`pick('p1', 'Good')`);
  P.run(`pick('p1', 'Poor')`);
  P.run(`auto('c1')`);
  P.run('undo()');
  assert.deepStrictEqual(J(P, 'DRAFT.quality'), {p1: 'Good'});
});

test("Undo: a map his click made holds the run's entries after Undo (Codex, #1348)", () => {
  const P = stack();
  // his pick creates the map, the run then adds an entry to the same map, Undo takes his entry only
  P.run(`DRAFT.crop = {p1: 'c1'}; saveDraft();`);
  P.run(`DRAFT.crop = {...DRAFT.crop, c9: 'auto'}; saveDraft(true);`);
  P.run('undo()');
  assert.deepStrictEqual(J(P, 'DRAFT.crop'), {c9: 'auto'});
  P.run('redo()');
  assert.deepStrictEqual(J(P, 'DRAFT.crop'), {p1: 'c1', c9: 'auto'});
});

test('Undo: a key the run removes leaves the step Undo leads to too', () => {
  const P = stack();
  P.run(`DRAFT.seen = {a: 1, b: 1}; saveDraft();`);
  P.run(`pick('p1', 'Good')`);
  P.run(`delete DRAFT.seen.a; saveDraft(true);`);
  P.run('undo()');
  assert.deepStrictEqual(J(P, 'DRAFT.seen'), {b: 1});
});

test('admin.js: the auto-sorts save and toast in the background, nothing else does', () => {
  const calls = [...src.matchAll(/saveDraft\(true\)/g)].length,
    toasts = [...src.matchAll(/toast\([^\n]*?, 3500, true\)/g)].map(m => m[0]);
  assert.strictEqual(calls, 2, 'autoRun and fishAutoRun');
  assert.strictEqual(toasts.length, 3, toasts.join(' | '));
  assert.ok(toasts.some(t => /autoToast\(ar\)/.test(t)) && toasts.some(t => /fishToast\(R\)/.test(t)));
  assert.ok(toasts.some(t => /another admin tab/.test(t)));
});
