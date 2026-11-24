require('./slot.js').testGuard();
// The work of one answer has a budget (REE-265 step 0, docs/reviews/2026-11-24-incremental-engine-state.md; REE-274): the
// calls per answer, the storage read and written per answer, counted on a simulated player's saved state by
// tools/answercost.js, may not pass the ceilings of tools/answercost-budget.json. The budget holds every subject (fish,
// corals, sea slugs) at 50, 500 and 3,000 answers. The counts need Chromium and minutes, so none is made here (Pierre,
// 2026-11-24 14:06: «une à deux minutes x le nombre de vérifications x le nombre d'agents par jour, ça monte très très
// vite»): this file holds the pure parts only, in the agents' fast tier, and CI's "answer cost" job
// (.github/workflows/smokes.yml) makes every count and fails on one over its ceiling. By hand, for work on speed:
//   SMOKE_SLOTS=1 node tests/slot.js --name answercost -- node tools/answercost.js --budget tools/answercost-budget.json
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path');
const A = require('../tools/answercost.js');

const ROOT = path.join(__dirname, '..'),
  BUDGET = path.join(ROOT, 'tools', 'answercost-budget.json'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// A row as the tool writes it (the numbers are made up).
const row = (state, over = {}) => ({
  state,
  size: {records: 11, play: 69, tree: 1625, conf: 4, off: 61},
  namedCalls: 1000,
  store: {getCalls: 50, getChars: 4000, setCalls: 10, setChars: 900},
  watch: {'introduced@model.js': 20, 'scoreOf@core.js': 30.5, 'scoreOf@app.js': 10, 'faOf@core.js': 3},
  ...over
});

test('states are subject:answers, fish, coral or seaslug', () => {
  assert.deepStrictEqual(A.parseStates('fish:50,coral:3000,seaslug:500'), [
    {name: 'fish:50', subject: 'fish', answers: 50},
    {name: 'coral:3000', subject: 'coral', answers: 3000},
    {name: 'seaslug:500', subject: 'seaslug', answers: 500}
  ]);
  for (const bad of ['fish', 'fish:0', 'goby:50', 'sea:50', 'fish:x', 'fish:50:1'])
    assert.throws(() => A.parseStates(bad), /bad state/, bad);
  assert.deepStrictEqual(A.SUBJECTS, ['fish', 'coral', 'seaslug'], 'every subject the app has');
  assert.deepStrictEqual(A.HISTORIES, [50, 500, 3000], 'a short history, a medium one and a long one');
  assert.deepStrictEqual(
    A.parseStates(A.STATES).map(s => s.name),
    ['fish:50', 'fish:500', 'fish:3000', 'coral:50', 'coral:500', 'coral:3000', 'seaslug:50', 'seaslug:500', 'seaslug:3000'],
    'the default is every subject at every history'
  );
});

test('the subjects are the app’s own (core.js SUBJECTS), none left out (rule S1)', () => {
  const C = require('../core.js'),
    ids = C.SUBJECTS.map(S => S.id).sort();
  assert.deepStrictEqual([...A.SUBJECTS].sort(), ids, `answercost measures ${A.SUBJECTS}; the app has ${ids}`);
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
  const two = A.ceilings(
    [row('fish:50'), row('fish:50', {namedCalls: 2000, store: {getCalls: 1, getChars: 1, setCalls: 1, setChars: 1}})],
    1.25
  );
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

test('the verdict fails on one count over its ceiling and names the state and the count', () => {
  const budget = {states: {'seaslug:500': {namedCalls: 1000, getChars: 4000}, 'coral:50': {namedCalls: 1000}}};
  const ok = A.verdict([row('seaslug:500'), row('coral:50')], budget, 'b.json');
  assert.deepStrictEqual(ok.bad, []);
  assert.match(ok.lines.join('\n'), /Within budget \(b\.json\): seaslug:500, coral:50\./);
  assert.deepStrictEqual(ok.annotations, []);
  const v = A.verdict([row('seaslug:500', {namedCalls: 1234}), row('coral:50')], budget, 'b.json');
  assert.deepStrictEqual(
    v.bad.map(b => [b.state, b.metric]),
    [['seaslug:500', 'namedCalls']]
  );
  const out = v.lines.join('\n');
  assert.match(out, /OVER BUDGET seaslug:500: namedCalls 1,234 per answer, ceiling 1,000/);
  assert.match(out, /1 count over the budget of b\.json/);
  assert.doesNotMatch(out, /Within budget/);
  assert.deepStrictEqual(v.annotations, [
    '::error title=Answer cost over budget::seaslug:500: namedCalls 1,234 per answer, ceiling 1,000 (b.json)'
  ]);
  // The same counts against ceilings a fifth lower fail: the check can fail, on every state.
  const rows = [row('fish:50'), row('coral:500'), row('seaslug:3000')],
    tight = {states: Object.fromEntries(rows.map(x => [x.state, {namedCalls: Math.floor(x.namedCalls * 0.8)}]))};
  assert.deepStrictEqual(
    A.verdict(rows, tight, 't.json').bad.map(b => b.state),
    rows.map(x => x.state)
  );
  assert.match(A.verdict([row('fish:7')], budget, 'b.json').lines.join('\n'), /No ceiling for fish:7 in b\.json: not checked/);
});

test('the players are made on a pinned commit of the app, in a folder of their own', () => {
  assert.match(A.PLAYERS_AT, /^[0-9a-f]{40}$/, 'a full commit');
  assert.ok(A.cacheDir('/x').endsWith(`${A.GEN}-${A.PLAYERS_AT.slice(0, 7)}`), 'a pin never reuses the players of another');
  // learnsim serves the app from the pinned tree, and answercost hands it that tree.
  assert.match(read('tools/learnsim.js'), /path\.resolve\(process\.argv\[i \+ 1\]\) : ROOT/);
  assert.match(read('tools/answercost.js'), /\.\.\.\['--root', app\]/);
});

test('the page holds the state’s history: the warm-up answers played before the read are counted in', () => {
  assert.ok(!A.historyOff(52, 50, 2), 'the default warm-up');
  assert.ok(!A.historyOff(70, 50, 20), 'a longer warm-up (--warm 20) is no reason to reject a state loaded right');
  assert.ok(!A.historyOff(3020, 3000, 2), '5% of a long history is tolerated');
  assert.ok(A.historyOff(5, 50, 2), 'a history lost');
  assert.ok(A.historyOff(70, 50, 2), 'the warm-up is not a history of 20 more');
  assert.ok(A.historyOff(NaN, 50, 2), 'no history read');
  assert.ok(A.historyOff(3400, 3000, 2));
});

test("the table is the study's, one line a state", () => {
  const t = A.table([row('fish:50', {namedCalls: 319464})]).split('\n');
  assert.strictEqual(t.length, 3);
  assert.match(t[0], /^\| State \| U \| V \| T \| R \| Calls per answer/);
  assert.match(t[2], /^\| fish:50 \| 11 \| 69 \| 1,625 \| 65 \| 0\.32 M \| 20 \| 41 \| 50 \(4,000\) \| 900 \|$/);
});

test('several seeds: one row a state and seed, the seed named in the table, the ceiling the largest count', () => {
  const rows = [1, 2, 3].map(seed => ({...row('seaslug:500', {namedCalls: 1000 * seed}), seed})),
    t = A.table(rows).split('\n');
  assert.strictEqual(t.length, 5);
  assert.match(t[2], /^\| seaslug:500 \(seed 1\) \|/);
  assert.match(t[4], /^\| seaslug:500 \(seed 3\) \|/);
  assert.strictEqual(A.ceilings(rows, 1.25).namedCalls, 3800, 'seed 3: 3,000 x 1.25 = 3,750, up to two digits');
  assert.match(A.table([{...row('fish:50'), seed: 1}]), /^\| State[^\n]*\n[^\n]*\n\| fish:50 \| 11/, 'one seed: the state alone');
  assert.deepStrictEqual(
    A.verdict(rows, {states: {'seaslug:500': {namedCalls: 2500}}}, 'b').bad.map(b => [b.state, b.value]),
    [['seaslug:500', 3000]],
    'a count of any seed over the ceiling fails'
  );
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

test('the budget file: every subject at every history has ceilings, each a positive number of a known count', () => {
  const b = JSON.parse(fs.readFileSync(BUDGET, 'utf8')),
    known = new Set([...A.BUDGETED, ...A.BUDGETED_FN.map(f => 'fn:' + f)]);
  assert.ok(b.margin >= 1, 'the margin is stated');
  assert.ok(b.about && /REE-265/.test(b.about) && /REE-274/.test(b.about), 'the file says what it is');
  for (const s of A.parseStates(A.STATES)) {
    assert.ok(b.states[s.name], `${s.name} has ceilings`);
    for (const k of known) assert.ok(b.states[s.name][k] > 0, `${s.name} ${k}`);
  }
  assert.deepStrictEqual(
    Object.keys(b.states).sort(),
    A.parseStates(A.STATES)
      .map(s => s.name)
      .sort(),
    'no state the tool does not measure'
  );
  for (const [s, c] of Object.entries(b.states))
    for (const [k, v] of Object.entries(c)) {
      assert.ok(known.has(k), `${s}: ${k} is no count the tool checks`);
      assert.ok(Number.isFinite(v) && v > 0, `${s} ${k}`);
    }
});

test('the states are made one run a subject, side by side, and only the ones the cache lacks', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'answercost-test-')),
    states = A.parseStates('fish:50,coral:500,seaslug:3000');
  try {
    // Every state in the cache: nothing is made (a made state would start learnsim and Chromium).
    for (const s of states) fs.writeFileSync(A.stateFile(dir, s), '{}');
    const files = await A.ensureStates(states, dir, false, 3);
    assert.deepStrictEqual(
      files,
      states.map(s => A.stateFile(dir, s))
    );
    assert.deepStrictEqual(fs.readdirSync(dir).sort(), files.map(f => path.basename(f)).sort(), 'nothing was made, nothing left behind');
    // A state given as a file is that file.
    assert.deepStrictEqual(await A.ensureStates([{name: 'x', file: '/a/x.json'}], dir, false, 1), ['/a/x.json']);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('pool runs at most par at once, keeps the order, and fails when one fails', async () => {
  let now = 0,
    peak = 0;
  const out = await A.pool([5, 1, 4, 2, 3], 2, async n => {
    peak = Math.max(peak, ++now);
    await new Promise(ok => setTimeout(ok, n));
    now--;
    return n * 10;
  });
  assert.deepStrictEqual(out, [50, 10, 40, 20, 30]);
  assert.strictEqual(peak, 2);
  await assert.rejects(
    A.pool([1, 2], 2, async n => {
      if (n === 2) throw new Error('boom');
    }),
    /boom/
  );
  assert.deepStrictEqual(await A.pool([], 3, async () => 1), []);
});

test('no unit test counts an answer: the browser counts are CI’s answer cost job, not the agents’ fast tier', () => {
  // This file holds pure parts only: no Chromium, no child process, no Playwright.
  // (The part above the reading of the workflow files: those name Playwright and Chromium as text.)
  const own = read('tests/answercost.test.js')
      .split('const section = ')[0]
      .replace(/^\s*\/\/.*$/gm, ''),
    heavy = new RegExp(['play' + 'wright', 'spa' + 'wn', 'child_' + 'process', 'exec' + 'File', 'chrom' + 'ium'].join('|'));
  assert.doesNotMatch(own, heavy);
  // Nothing else in tests/*.test.js runs the tool either (a run of the tool is the heavy command, the CI job).
  const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js') && f !== 'answercost.test.js');
  for (const f of files) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(src, /tools[\\/'", ]+answercost\.js/, `${f} runs tools/answercost.js`);
  }
});

// CI: the job.
const section = (src, name) => {
  const at = src.indexOf(`\n  ${name}:\n`);
  assert.ok(at >= 0, `no job ${name}`);
  const rest = src.slice(at + 1),
    end = rest.slice(2).search(/\n {2}\S[^\n]*:\n/);
  return end < 0 ? rest : rest.slice(0, end + 2);
};

test('CI runs every count in one job of the smokes workflow, side by side with the smokes, against the budget', () => {
  const yml = read('.github/workflows/smokes.yml'),
    job = section(yml, 'answercost'),
    smoke = section(yml, 'smoke');
  assert.match(job, /\n {4}name: answer cost\n/);
  assert.doesNotMatch(job, /\n {4}needs:/, 'it waits for no smoke');
  assert.doesNotMatch(job, /\n {4}strategy:/, 'one job, not a matrix');
  assert.match(
    job,
    /\n {8}run: NODE_PATH="\$RUNNER_TEMP\/pw\/node_modules" node tools\/answercost\.js --budget tools\/answercost-budget\.json\n/
  );
  assert.doesNotMatch(job, /--states|--n /, 'every state of the budget, none chosen');
  // The same runner, node, Playwright and Chromium cache as the smokes.
  const same = re => assert.strictEqual((job.match(re) || [])[0], (smoke.match(re) || [])[0], String(re));
  for (const re of [
    /runs-on: [^\n]+/,
    /node-version: '\d+'/,
    /playwright@[\d.]+/,
    /key: ms-playwright-[^\n]+/,
    /npx playwright install chromium/
  ])
    same(re);
  assert.match(yml, /\n {2}push:\n {4}branches: \['train\/\*'\]\n/, 'a train runs it too, as the smokes');
  assert.doesNotMatch(read('.github/workflows/checks.yml'), /answercost/, 'not in the checks: no docs-only PR and no unit job runs it');
});
