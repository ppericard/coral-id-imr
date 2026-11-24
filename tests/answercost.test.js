require('./slot.js').testGuard();
// The work of one answer has a budget (REE-265 step 0, docs/reviews/2026-11-24-incremental-engine-state.md): the calls
// per answer, the storage read and written per answer, counted on a simulated player's saved state by
// tools/answercost.js, may not pass the ceilings of tools/answercost-budget.json. The ceilings are today's measured
// counts times a margin, to be tightened as each step of the plan lands. The states checked here are the small ones, so
// the run fits the fast tier; the heavy state (fish, 3,000 answers) is an opt-in command, never part of a routine check
// (REE-265 question c is open). The count needs Chromium: where Playwright is not installed (the unit job of CI) only the
// parts that need no browser run.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process');
const A = require('../tools/answercost.js');

const ROOT = path.join(__dirname, '..'),
  BUDGET = path.join(ROOT, 'tools', 'answercost-budget.json'),
  TOOL = path.join(ROOT, 'tools', 'answercost.js'),
  // The routine states: small enough for the fast tier (a state is made once, then kept).
  FAST = 'fish:50,fish:500';
let hasPlaywright = true;
try {
  require.resolve('playwright');
} catch (e) {
  hasPlaywright = false;
}

// A row as the tool writes it (the numbers are made up).
const row = (state, over = {}) => ({
  state,
  size: {records: 11, play: 69, tree: 1625, conf: 4, off: 61},
  namedCalls: 1000,
  store: {getCalls: 50, getChars: 4000, setCalls: 10, setChars: 900},
  watch: {'introduced@model.js': 20, 'scoreOf@core.js': 30.5, 'scoreOf@app.js': 10, 'faOf@core.js': 3},
  ...over
});

test('states are subject:answers, fish or coral', () => {
  assert.deepStrictEqual(A.parseStates('fish:50,coral:3000'), [
    {name: 'fish:50', subject: 'fish', answers: 50},
    {name: 'coral:3000', subject: 'coral', answers: 3000}
  ]);
  for (const bad of ['fish', 'fish:0', 'seaslug:50', 'fish:x', 'fish:50:1']) assert.throws(() => A.parseStates(bad), /bad state/, bad);
  assert.deepStrictEqual(
    A.parseStates(A.STUDY).map(s => s.name),
    ['fish:50', 'fish:3000', 'coral:3000'],
    "the study's three states are the default"
  );
});

test('counts are flattened: a function named in two files is added up', () => {
  const m = A.metrics(row('fish:50'));
  assert.strictEqual(m.namedCalls, 1000);
  assert.strictEqual(m.getChars, 4000);
  assert.strictEqual(m['fn:scoreOf'], 40.5);
  assert.strictEqual(m['fn:introduced'], 20);
});

test('a ceiling is the count times the margin, two significant digits up, never below the floor', () => {
  assert.strictEqual(A.roundUp(318432), 320000);
  assert.strictEqual(A.roundUp(8.74e6 * 1.25), 11000000);
  assert.strictEqual(A.roundUp(41), 41);
  assert.strictEqual(A.roundUp(0), 0);
  const c = A.ceilings(row('fish:50'), 1.25);
  assert.strictEqual(c.namedCalls, 1300, '1,000 x 1.25 = 1,250, up to two digits');
  assert.strictEqual(c['fn:scoreOf'], A.FLOOR, '50.6 calls: the floor');
  assert.strictEqual(c['fn:lvlNext'], A.FLOOR, 'a function the state does not call today may call a few');
  assert.ok(c.getChars >= 5000);
  const two = A.ceilings([row('fish:50'), row('fish:50', {namedCalls: 2000, store: {getCalls: 1, getChars: 1, setCalls: 1, setChars: 1}})], 1.25);
  assert.strictEqual(two.namedCalls, 2500, 'several runs of a state: the largest count counts');
  assert.ok(two.getChars >= 5000, 'in each count, not in one run');
});

test('over() names each count past its ceiling, and only for a state the budget has', () => {
  const budget = {states: {'fish:50': {namedCalls: 1000, getChars: 3999, 'fn:introduced': 20, 'fn:lvlNext': 100}}};
  assert.deepStrictEqual(
    A.over(row('fish:50'), budget).map(b => b.metric),
    ['getChars'],
    'at the ceiling is within it; a function that is not called is 0'
  );
  const b = A.over(row('fish:50', {namedCalls: 1001}), budget);
  assert.deepStrictEqual(
    b.map(x => [x.metric, x.value, x.ceiling]),
    [
      ['namedCalls', 1001, 1000],
      ['getChars', 4000, 3999]
    ]
  );
  assert.deepStrictEqual(A.over(row('fish:51'), budget), [], 'no ceilings for the state: nothing checked');
  assert.deepStrictEqual(A.over(row('fish:50'), null), []);
});

test("the table is the study's, one line a state", () => {
  const t = A.table([row('fish:50', {namedCalls: 319464})]).split('\n');
  assert.strictEqual(t.length, 3);
  assert.match(t[0], /^\| State \| U \| V \| T \| R \| Calls per answer/);
  assert.match(t[2], /^\| fish:50 \| 11 \| 69 \| 1,625 \| 65 \| 319,464 \| 20 \| 41 \| 50 \(4,000\) \| 900 \|$/);
});

test('--write-budget writes the ceilings of the states measured and keeps the others', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'answercost-test-')),
    f = path.join(dir, 'budget.json');
  try {
    fs.writeFileSync(f, JSON.stringify({about: 'kept', margin: 2, states: {'coral:3000': {namedCalls: 77}}}));
    A.writeBudget(f, [row('fish:50')], 1.25);
    const b = JSON.parse(fs.readFileSync(f, 'utf8'));
    assert.strictEqual(b.about, 'kept');
    assert.strictEqual(b.margin, 1.25);
    assert.deepStrictEqual(Object.keys(b.states), ['coral:3000', 'fish:50']);
    assert.strictEqual(b.states['coral:3000'].namedCalls, 77);
    assert.strictEqual(b.states['fish:50'].namedCalls, 1300);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test("the budget file: the study's states and the routine ones have ceilings, each a positive number of a known count", () => {
  const b = JSON.parse(fs.readFileSync(BUDGET, 'utf8')),
    known = new Set([...A.BUDGETED, ...A.BUDGETED_FN.map(f => 'fn:' + f)]);
  assert.ok(b.margin >= 1, 'the margin is stated');
  assert.ok(b.about && /REE-265/.test(b.about), 'the file says what it is');
  for (const s of [...A.parseStates(A.STUDY), ...A.parseStates(FAST)]) {
    assert.ok(b.states[s.name], `${s.name} has ceilings`);
    for (const k of known) assert.ok(b.states[s.name][k] > 0, `${s.name} ${k}`);
  }
  for (const [s, c] of Object.entries(b.states))
    for (const [k, v] of Object.entries(c)) {
      assert.ok(known.has(k), `${s}: ${k} is no count the tool checks`);
      assert.ok(Number.isFinite(v) && v > 0, `${s} ${k}`);
    }
});

test('no routine check holds a heavy state: fish under 1,000 answers, corals under 1,500 (REE-265 question c)', () => {
  for (const s of A.parseStates(FAST)) assert.ok(s.answers < (s.subject === 'fish' ? 1000 : 1500), `${s.name} is heavy`);
});

test(
  'one answer on the routine states costs no more than the budget',
  {skip: !hasPlaywright && 'playwright is not installed', timeout: 900000},
  () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'answercost-test-')),
      out = path.join(dir, 'counts.json');
    try {
      const r = spawnSync(process.execPath, [TOOL, '--states', FAST, '--budget', BUDGET, '--out', out], {
        encoding: 'utf8',
        maxBuffer: 1 << 26
      });
      assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`.slice(-3000));
      assert.match(r.stdout, /Within budget/);
      const rows = JSON.parse(fs.readFileSync(out, 'utf8'));
      assert.deepStrictEqual(
        rows.map(x => x.state),
        FAST.split(',')
      );
      for (const x of rows) {
        assert.ok(x.answers >= 6, `${x.state}: ${x.answers} answers played`);
        assert.deepStrictEqual(x.errs, [], `${x.state}: page errors`);
        assert.strictEqual(x.size.subj, x.state.split(':')[0]);
      }
      // The same counts against ceilings a fifth lower fail, naming the count: the check can fail.
      const tight = {states: Object.fromEntries(rows.map(x => [x.state, {namedCalls: Math.floor(x.namedCalls * 0.8)}]))},
        bad = rows.flatMap(x => A.over(x, tight));
      assert.deepStrictEqual(
        bad.map(x => x.metric),
        FAST.split(',').map(() => 'namedCalls')
      );
    } finally {
      fs.rmSync(dir, {recursive: true, force: true});
    }
  }
);
