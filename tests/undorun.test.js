require('./slot.js').testGuard();
// The admin's Undo and Redo against an auto-sort run that lands after his clicks (admin.js saveDraft, saveRun, layRun,
// step; docs/decisions/2026-11-21-undo-background-run.md): the run is laid onto every Undo and Redo step, a map his click
// made keeps the run's entries when that click is undone, and the startup import of the site's flags is not his action.
// The three holes Codex found in #1348's first attempt are the three tests below.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8');

// A fresh admin page: the draft, its Undo state, the save functions and Undo/Redo, with the page's side effects stubbed.
function page(draft) {
  const ctx = {JSON, Object, Set, Array, Date};
  vm.createContext(ctx);
  vm.runInContext(
    `let TOKEN = 't', DRAFT = ${JSON.stringify(draft)}, HIST = [], FUT = [], snap = JSON.stringify(DRAFT), ASIG = null, ASIG_OF = null, draftAt = null;
     const memoReset = () => {}, sweepFlags = () => {}, autoWhen = () => {}, putDraft = () => {}, keepHist = () => {},
       render = () => {}, toast = () => {};\n` +
      block(src, 'let ACTED = false;', '\nlet draftLost = false,', {file: 'admin.js'}) +
      '\n' +
      block(src, 'function step(from, to, msg) {', '\n}\n', {through: true, file: 'admin.js'}) +
      `\nconst undo = () => step(HIST, FUT, ['', '']), redo = () => step(FUT, HIST, ['', '']);
       this.M = {
         click: f => { f(DRAFT); saveDraft(); },
         run: f => { f(DRAFT); saveRun(); },
         flags: f => { f(DRAFT); saveDraft(true); },
         undo, redo,
         draft: () => JSON.parse(JSON.stringify(DRAFT)),
         steps: () => JSON.stringify([HIST.length, FUT.length])
       };`,
    ctx
  );
  return ctx.M;
}
const seen = D => ((D.fish || {}).seen = (D.fish || {}).seen || {});

test('a run that lands after two clicks stays through both Undo steps and both Redo steps (Codex #1348: every step)', () => {
  const M = page({genera: {}, fish: {add: {}}});
  M.click(D => (D.fish.add.a = 'colony'));
  M.click(D => (D.fish.add.b = 'colony'));
  M.run(D => {
    D.fish.add.r = 'colony';
    D.fish.auto = {d1: {r: 'a1'}};
  });
  assert.strictEqual(M.steps(), '[2,0]', 'the run is no step of its own');
  M.undo();
  assert.deepStrictEqual(Object.keys(M.draft().fish.add).sort(), ['a', 'r'], 'the first Undo takes back b, not the run');
  M.undo();
  assert.deepStrictEqual(Object.keys(M.draft().fish.add), ['r'], 'the second Undo takes back a; the run stays');
  assert.deepStrictEqual(M.draft().fish.auto, {d1: {r: 'a1'}}, 'and its log');
  // A run landing while two Redo steps wait: both carry it.
  const N = page({genera: {}, fish: {add: {}}});
  N.click(D => (D.fish.add.a = 'colony'));
  N.click(D => (D.fish.add.b = 'colony'));
  N.undo();
  N.undo();
  N.run(D => (D.fish.add.r = 'colony'));
  N.redo();
  N.redo();
  assert.deepStrictEqual(Object.keys(N.draft().fish.add).sort(), ['a', 'b', 'r'], 'the second Redo keeps the run');
});

test("a map the admin's click made: undoing that click keeps the run's entries in it (Codex #1348: absent parent maps)", () => {
  const M = page({genera: {}, fish: {}});
  M.click(D => (seen(D).x = 1)); // his rejection makes fish.seen
  M.run(D => {
    seen(D).r = 1; // the run's rejection, in the map his click made
    D.fish.auto = {d1: {r: 'r1'}};
  });
  M.undo();
  assert.deepStrictEqual(M.draft().fish.seen, {r: 1}, "his rejection goes, the run's stays");
  assert.deepStrictEqual(M.draft().fish.auto, {d1: {r: 'r1'}}, 'with its log, so the photo it logged keeps its decision');
  M.redo();
  assert.deepStrictEqual(M.draft().fish.seen, {x: 1, r: 1});
});

test("the startup import of the site's flags is not the admin's action: the run after it is still one Undo step (Codex #1348)", () => {
  const M = page({genera: {}, fish: {add: {}}});
  M.flags(D => (D.flag = {p1: {genus: 'G'}}));
  M.run(D => (D.fish.add.r = 'colony'));
  assert.strictEqual(M.steps(), '[2,0]', 'the import and the run, one step each');
  M.undo();
  assert.ok(!M.draft().fish.add.r, 'Undo takes the run back, as at any load');
  assert.deepStrictEqual(M.draft().flag, {p1: {genus: 'G'}}, 'the imported flags stay');
});

test('a value the admin set in a step stays his: the run never writes over it in an Undo or Redo step', () => {
  const M = page({genera: {}, fish: {add: {}}});
  M.click(D => (D.fish.add.a = 'colony'));
  M.undo(); // a = colony waits as a Redo step
  M.run(D => (D.fish.add.a = 'side')); // the run decides a in the draft without it
  M.redo();
  assert.strictEqual(M.draft().fish.add.a, 'colony', "his click's value, not the run's");
});

test('a whole photo decision: an Add undone, then the run rejects that photo; Redo brings his Add back alone (Codex #1408)', () => {
  const M = page({genera: {}, fish: {add: {}}});
  M.click(D => (D.fish.add.f = 'colony'));
  M.undo(); // his Add waits as a Redo step
  M.run(D => {
    seen(D).f = 1; // the run rejects f in the draft without his Add
    D.fish.auto = {d1: {f: 'r1'}};
    D.fish.add.g = 'colony'; // and decides another photo
  });
  M.redo();
  const D = M.draft();
  assert.strictEqual(D.fish.add.f, 'colony', 'his Add');
  assert.ok(!(D.fish.seen || {}).f, "not the run's rejection beside it (a rejection would win over the Add)");
  assert.ok(!((D.fish.auto || {}).d1 || {}).f, 'nor its log line for f');
  assert.strictEqual(D.fish.add.g, 'colony', "the run's other photo is laid as usual");
  // A coral rejection under its check key (CK: 'cand:' + photo) counts as the same photo.
  const C = page({genera: {G: {add: {}}}});
  C.click(D => (D.genera.G.add.p = 'colony'));
  C.undo();
  C.run(D => {
    D.seen = {'cand:p': 1};
    D.auto = {d1: {p: 'r1'}}; // the run's log line for p (autoRun)
  });
  C.redo();
  assert.ok(!(C.draft().seen || {})['cand:p'], 'his Add of p stays alone');
});
