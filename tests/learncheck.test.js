'use strict';
require('./slot.js').testGuard();
// .github/workflows/learncheck.yml (rule L11 tier 2; docs/LEARNING.md "Validating a learning change"): manual dispatch
// only, read-only, and no input reaches a shell command but through env after its check.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const Y = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'learncheck.yml'), 'utf8');

test('the learning check runs by hand only, reads only, and keeps the inputs out of its commands', () => {
  const on = /^on:\n([\s\S]*?)^\S/m.exec(Y)[1];
  assert.deepStrictEqual(
    [...on.matchAll(/^ {2}(\w+):/gm)].map(m => m[1]),
    ['workflow_dispatch']
  );
  assert.match(Y, /^permissions:\n {2}contents: read\n/m);
  assert.doesNotMatch(Y, /contents: write|secrets\./);
  // Every run block: no ${{ ... }} expression (an input there would be pasted into the shell).
  const runs = [...Y.matchAll(/^( +)run: \|\n((?:\1 {2}.*\n|\s*\n)*)/gm)].map(m => m[2]);
  assert.ok(runs.length >= 4, String(runs.length));
  runs.forEach(r => assert.doesNotMatch(r, /\$\{\{/, r.slice(0, 80)));
  // Each free-text input is checked against a pattern before use.
  ['after', 'before', 'subject', 'world', 'seeds', 'questions', 'answers', 'primary', 'looks', 'budget', 'pierre_go', 'args'].forEach(k =>
    assert.match(Y, new RegExp(`ok ${k} "\\$`), k)
  );
});

test('both arms run the same learnsim options, and learncmp of the version with the change reads them', () => {
  assert.match(Y, /for side in before after; do/);
  assert.match(Y, /node tools\/learnsim\.js --world "\$w" --subject "\$SUBJECT"/);
  assert.match(Y, /node after\/tools\/learncmp\.js "\$out\/\$w-before\.json" "\$out\/\$w-after\.json"/);
});

// Learnsim loads Playwright before it reads --world, so the package is installed for every world
// (Chromium for the app world only); and the primary goes to its own world only.
const {execFileSync} = require('child_process'),
  os = require('os');
// The runner's shell for a run block: bash -e -o pipefail (a plain bash -c passes where the runner would stop).
const BASH = ['-e', '-o', 'pipefail', '-c'];
// The constants of the job's env (CAP_MIN, L2_SEEDS, L2_ANSWERS).
const JOBENV = Object.fromEntries([...Y.matchAll(/^ {6}(CAP_MIN|L2_SEEDS|L2_ANSWERS): '(\d+)'/gm)].map(m => [m[1], m[2]]));
const step = name => {
  const i = Y.indexOf(`- name: ${name}`),
    m = /^( +)run: \|\n((?:\1 {2}.*\n|\s*\n)*)/m.exec(Y.slice(i));
  return m[2].replace(new RegExp('^' + m[1] + '  ', 'gm'), '');
};

test('Playwright is installed for every world, Chromium for the app world only', () => {
  const i = Y.indexOf('- name: Install Playwright'),
    block = Y.slice(i, Y.indexOf('\n      - ', i + 1));
  assert.doesNotMatch(block, /^\s+if:/m);
  assert.match(step('Install Playwright'), /npm install .*playwright@/);
  assert.match(step('Install Playwright'), /if \[ "\$WORLD" != rated \]; then npx playwright install --with-deps chromium; fi/);
});

test('the primary is passed to its own world only', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'learncheck-')),
    bin = path.join(dir, 'bin'),
    out = path.join(dir, 'out'),
    log = path.join(dir, 'calls');
  fs.mkdirSync(bin);
  fs.mkdirSync(out);
  ['app', 'rated'].forEach(w => ['before', 'after'].forEach(s => fs.writeFileSync(path.join(out, `${w}-${s}.json`), '{}')));
  fs.writeFileSync(path.join(bin, 'node'), `#!/bin/sh\necho "$@" >> ${log}\n`, {mode: 0o755});
  const run = env => {
    fs.rmSync(log, {force: true});
    execFileSync('bash', [...BASH, step('The paired comparison (tools/learncmp.js of the version with the change)')], {
      env: {
        PATH: `${bin}:${process.env.PATH}`,
        RUNNER_TEMP: dir,
        GITHUB_STEP_SUMMARY: path.join(dir, 'sum'),
        BEFORE: 'main',
        AFTER: 'x',
        SUBJECT: 'fish',
        SEEDS: '10',
        LOOKS: '1',
        ...env
      }
    });
    return fs.readFileSync(log, 'utf8').trim().split('\n');
  };
  let calls = run({WORLD: 'both', PRIMARY_WORLD: 'rated', PRIMARY: 'score@3000:up'});
  assert.strictEqual(calls.length, 2);
  assert.doesNotMatch(calls[0], /--primary/); // app
  assert.match(calls[1], /rated-after\.json --looks 1 --primary score@3000:up$/);
  calls = run({WORLD: 'both', PRIMARY_WORLD: 'app', PRIMARY: 'hard@300:down'});
  assert.match(calls[0], /--primary hard@300:down$/);
  assert.doesNotMatch(calls[1], /--primary/);
  fs.rmSync(path.join(out, 'app-after.json'));
  calls = run({WORLD: 'rated', PRIMARY_WORLD: 'app', PRIMARY: 'score@3000:up'});
  assert.deepStrictEqual(calls.length, 1);
  assert.match(calls[0], /--primary score@3000:up$/);
  fs.rmSync(dir, {recursive: true});
});

// A measure name with a digit (learncmp's c3) is a valid primary; anything else stays refused.
// The first step on its own: {ok, err} (the ::error:: line) for the inputs of a dispatch, the defaults being a valid one.
const checkInputs = env => {
  try {
    execFileSync('bash', [...BASH, step('Check the inputs')], {
      env: {
        PATH: process.env.PATH,
        AFTER: 'x',
        BEFORE: 'main',
        SUBJECT: 'fish',
        WORLD: 'both',
        SEEDS: '10',
        QUESTIONS: '300',
        ANSWERS: '3000',
        PRIMARY: '',
        LOOKS: '1',
        BUDGET: '',
        PIERRE_GO: '',
        ARGS: '',
        ...JOBENV,
        ...env
      },
      stdio: 'pipe'
    });
    return {ok: true, err: ''};
  } catch (e) {
    return {ok: false, err: String(e.stdout)};
  }
};
test('the input check takes every learncmp measure as the primary, and refuses the rest', () => {
  const check = env => checkInputs(env).ok;
  const L = require('../tools/learncmp.js');
  Object.keys(L.MEASURES).forEach(m => assert.ok(check({PRIMARY: `${m}@${L.MEASURES[m].kind === 'run' ? 'run' : 300}:down`}), m));
  assert.ok(check({PRIMARY: 'c3@run:down'}));
  assert.ok(check({PRIMARY: ''}));
  ['c3@run:down;id', '3c@run:up', 'score@x:up', 'score@300:sideways'].forEach(p => assert.ok(!check({PRIMARY: p}), p));
});

// ---- The cap (rule L11; Pierre, Q405 2026-11-18 and Q415 2026-11-19): a shared deadline, the level-3 go in the first step.
const CB = require('../tools/checkbudget.js'),
  CMP = require('../tools/learncmp.js');

test("the workflow's cap constants are the tool's, and the dispatch command names declared inputs", () => {
  assert.strictEqual(Number(JOBENV.CAP_MIN), CB.MAX_MIN);
  assert.strictEqual(Number(JOBENV.L2_SEEDS), CB.LEVEL2.seeds);
  assert.strictEqual(Number(JOBENV.L2_ANSWERS), CB.LEVEL2.answers);
  const inputs = [...Y.matchAll(/^ {6}(\w+):\n {8}description/gm)].map(m => m[1]);
  ['budget', 'pierre_go'].forEach(k => assert.ok(inputs.includes(k), k));
  ['app', 'rated'].forEach(world => {
    const named = [...CB.dispatchCommand({subject: 'fish', world, seeds: 30, N: 5000}).matchAll(/ -f (\w+)=/g)].map(m => m[1]);
    assert.ok(named.includes('pierre_go') && named.length >= 7, named.join());
    named.forEach(k => assert.ok(inputs.includes(k), k));
  });
  assert.ok(Number(/timeout-minutes: (\d+)/.exec(Y)[1]) <= 90); // not the 360 it was: the compute is CAP_MIN of it
});

test('level 3 needs the go in the first step, as the tool defines it, before any checkout is read', () => {
  const GO = 'Q512, 2026-11-20';
  for (const world of ['app', 'rated', 'both'])
    for (const seeds of [1, 10, 20, 21, 40, 99])
      for (const answers of [1000, 3000, 10000, 10001, 30000]) {
        // The tool's own reading, per run of the check: the app world's run holds seeds only (N is questions).
        const l3 =
            (world !== 'rated' && CB.level3Reason({world: 'app', seeds, N: 300})) ||
            (world !== 'app' && CB.level3Reason({world: 'rated', seeds, N: answers})) ||
            null,
          env = {WORLD: world, SEEDS: String(seeds), ANSWERS: String(answers)},
          r = checkInputs(env);
        assert.strictEqual(r.ok, !l3, `${world} ${seeds} ${answers}: ${l3}`);
        if (l3) {
          assert.match(r.err, /level 3 .* needs Pierre's explicit go/);
          assert.ok(checkInputs({...env, PIERRE_GO: GO}).ok, `${world} ${seeds} ${answers} with the go`);
        }
      }
  assert.ok(!checkInputs({SEEDS: '40', PIERRE_GO: '   '}).ok); // blanks are no reference
  assert.ok(!checkInputs({SEEDS: '40', PIERRE_GO: 'Q512; id'}).ok);
  // First step, before either checkout is read.
  assert.ok(Y.indexOf('- name: Check the inputs') < Y.indexOf('actions/checkout'));
});

test('an explicit budget is checked against the runs of the check, and the args cannot set what the workflow sets', () => {
  [
    ['both', '10', true],
    ['both', '11', false],
    ['rated', '20', true],
    ['app', '21', false],
    ['app', '1', true],
    ['both', '0', false],
    ['both', '05', false],
    ['rated', '41', false]
  ].forEach(([world, budget, ok]) => assert.strictEqual(checkInputs({WORLD: world, BUDGET: budget}).ok, ok, `${world} ${budget}`));
  assert.match(checkInputs({WORLD: 'both', BUDGET: '11'}).err, /over the 40-minute cap/);
  assert.ok(checkInputs({BUDGET: ''}).ok);
  [
    '--seeds 40',
    '--questions 9',
    '--budget 40',
    '--per-job 5',
    '--pierre-go x',
    '--world app',
    '--subject coral',
    '--out x',
    '--dist tail --seeds=40'
  ].forEach(a => assert.ok(!checkInputs({ARGS: a}).ok, a));
  ['--profiles beginner,expert --dist tail', '--seed0 3', ''].forEach(a => assert.ok(checkInputs({ARGS: a}).ok, a));
});

// The arms step on a fake clock: `date` reads a file, a stub `timeout` logs "clock args", moves the clock and answers as
// the next line of `modes` says (hit: the limit reached, killed; ok:S: S seconds then a file; cut3, cut3nofile: the
// tool's own cut; anything else: exit 1). No long run.
function arms(env, modes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'learncheck-arms-')),
    bin = path.join(dir, 'bin'),
    w = (f, s, mode) => fs.writeFileSync(path.join(dir, f), s, mode ? {mode} : undefined);
  fs.mkdirSync(bin);
  ['before', 'after', 'out'].forEach(d => fs.mkdirSync(path.join(dir, d)));
  w('clock', '1000');
  w('modes', modes.join('\n') + '\n');
  fs.writeFileSync(path.join(bin, 'date'), `#!/bin/sh\ncat ${dir}/clock\n`, {mode: 0o755});
  fs.writeFileSync(
    path.join(bin, 'timeout'),
    `#!/bin/sh
D=${dir}
n=$(cat $D/n 2>/dev/null || echo 0); n=$((n + 1)); echo $n > $D/n
c=$(cat $D/clock)
echo "$c $@" >> $D/calls
limit=$2
for a; do out=$a; done
mode=$(head -n $n $D/modes | tail -n 1)
case $mode in
  hit) echo $((c + limit + 20)) > $D/clock; exit 124;;
  ok:*) echo $((c + \${mode#ok:})) > $D/clock; echo '{"runs":[1]}' > "$out"; exit 0;;
  cut3) echo $((c + limit)) > $D/clock; echo '{"cut":{},"runs":[]}' > "$out"; exit 3;;
  cut3nofile) echo $((c + limit)) > $D/clock; exit 3;;
  *) exit 1;;
esac
`,
    {mode: 0o755}
  );
  let status = 0,
    stdout = '';
  try {
    stdout = execFileSync('bash', [...BASH, step('Both arms, the same seeds')], {
      cwd: dir,
      env: {
        PATH: `${bin}:${process.env.PATH}`,
        RUNNER_TEMP: dir,
        SUBJECT: 'fish',
        WORLD: 'both',
        SEEDS: '10',
        QUESTIONS: '300',
        ANSWERS: '3000',
        BUDGET: '',
        PIERRE_GO: '',
        ARGS: '',
        ...JOBENV,
        ...env
      },
      stdio: 'pipe'
    }).toString();
  } catch (e) {
    status = e.status;
    stdout = String(e.stdout);
  }
  const calls = fs.existsSync(path.join(dir, 'calls')) ? fs.readFileSync(path.join(dir, 'calls'), 'utf8').trim().split('\n') : [],
    files = Object.fromEntries(
      fs.readdirSync(path.join(dir, 'out')).map(f => [f, JSON.parse(fs.readFileSync(path.join(dir, 'out', f), 'utf8'))])
    ),
    clock = Number(fs.readFileSync(path.join(dir, 'clock'), 'utf8'));
  fs.rmSync(dir, {recursive: true});
  return {
    status,
    stdout,
    files,
    clock,
    calls: calls.map(l => ({
      clock: Number(l.split(' ')[0]),
      limit: Number(l.split(' ')[2]),
      budget: Number(/--budget (\d+)/.exec(l)[1]),
      line: l
    }))
  };
}

test('the runs of a check share one deadline: all four at their limit still end within 40 minutes', () => {
  const R = arms({}, ['hit', 'hit', 'hit', 'hit']),
    deadline = 1000 + 40 * 60;
  assert.strictEqual(R.status, 0);
  assert.strictEqual(R.calls.length, 4);
  // Each run's hard limit, kill grace included, fits in what is left of the deadline set before the first run.
  R.calls.forEach(c => assert.ok(c.clock + c.limit + 20 <= deadline, c.line));
  assert.ok(R.clock <= deadline, `${R.clock - 1000} s`);
  R.calls.forEach(c => assert.ok(c.budget * 60 < c.limit)); // learnsim's own stop comes first
  assert.deepStrictEqual(
    R.calls.map(c => c.budget),
    [10, 10, 10, 6]
  ); // the equal share, less where the deadline is nearer
  assert.deepStrictEqual(Object.keys(R.files).sort(), ['app-after.json', 'app-before.json', 'rated-after.json', 'rated-before.json']);
  Object.values(R.files).forEach(f => {
    assert.strictEqual(f.cut.cut, true);
    assert.deepStrictEqual(f.runs, []);
    assert.strictEqual(f.subject, 'fish');
  });
  // One world is two runs of 20 minutes.
  assert.deepStrictEqual(
    arms({WORLD: 'rated'}, ['ok:60', 'ok:60']).calls.map(c => c.budget),
    [20, 20]
  );
});

test("an explicit budget is the share; the go and the args reach both arms; a run that overruns takes the next one's time, never past the cap", () => {
  const R = arms({WORLD: 'rated', BUDGET: '5', PIERRE_GO: 'Q512', ARGS: '--dist tail'}, ['ok:100', 'ok:100']);
  assert.deepStrictEqual(
    R.calls.map(c => c.budget),
    [5, 5]
  );
  R.calls.forEach(c => {
    assert.match(
      c.line,
      /--world rated --subject fish --seeds 10 --questions 3000 --workers 4 --budget 5 --pierre-go Q512 --dist tail --out /
    );
    assert.strictEqual(c.limit, 5 * 60 + 30);
  });
  assert.deepStrictEqual(Object.keys(R.files).sort(), ['rated-after.json', 'rated-before.json']);
  assert.deepStrictEqual(R.files['rated-before.json'], {runs: [1]}); // a finished run's own file is kept, no stub
  assert.doesNotMatch(arms({WORLD: 'app'}, ['ok:1', 'ok:1']).calls[0].line, /--pierre-go/);
  // The first run overran to 39 minutes 50: the three after it are not launched, each leaves a stub.
  const O = arms({}, ['ok:2390', 'ok:1', 'ok:1', 'ok:1']);
  assert.strictEqual(O.calls.length, 1);
  assert.strictEqual(O.status, 0);
  assert.match(O.stdout, /under 2 minutes left of the 40-minute cap/);
  ['app-after.json', 'rated-before.json', 'rated-after.json'].forEach(f =>
    assert.deepStrictEqual(O.files[f].cut, {cut: true, budgetMin: 0, planned: 0, done: 0})
  );
});

test("each exit of a run is handled: the tool's own cut and a killed run go on, any other failure stops", () => {
  const R = arms({}, ['cut3', 'cut3nofile', 'hit', 'ok:10']);
  assert.strictEqual(R.status, 0);
  assert.deepStrictEqual(R.files['app-before.json'], {cut: {}, runs: []}); // the tool's own file kept
  assert.strictEqual(R.files['app-after.json'].cut.cut, true); // 3 without a file: a stub
  assert.strictEqual(R.files['rated-before.json'].cut.cut, true); // killed (124): a stub
  assert.deepStrictEqual(R.files['rated-after.json'], {runs: [1]});
  assert.match(R.stdout, /app world, before: cut at its 10-minute budget \(exit 3\)/);
  // Exit 2 (a refusal: the plan over the budget, level 3 without the go) and any other failure fail the step.
  const F = arms({}, ['ok:10', 'fail', 'ok:10', 'ok:10']);
  assert.strictEqual(F.status, 1);
  assert.strictEqual(F.calls.length, 2);
  assert.match(F.stdout, /app world, after: learnsim failed \(exit 1\)/);
});

test('the stubs the workflow writes are read by learncmp for every primary, population ones included', () => {
  const stubs = arms({}, ['hit', 'hit', 'hit', 'hit']).files,
    real = {
      subject: 'fish',
      questions: 300,
      checkpoints: [300],
      runs: [{profile: 'beginner', seed: 1, rows: [{q: 300, met: 1}], preOW: []}]
    },
    empty = stubs['app-after.json'];
  assert.ok(Object.keys(CMP.MEASURES).some(m => CMP.MEASURES[m].kind === 'pop'));
  Object.keys(CMP.MEASURES).forEach(m => {
    const k = CMP.MEASURES[m].kind,
      at = CMP.parseAt(`${m}@${k === 'run' ? 'run' : k === 'break' ? '1d' : 300}`);
    [
      ['before', empty, real],
      ['after', real, empty],
      ['before and after', empty, stubs['app-before.json']]
    ].forEach(([sides, B, A]) => {
      const R = CMP.compare(B, A, {primary: {at, dir: 'down'}});
      assert.strictEqual(R.primary, null, `${m} ${sides}`);
      assert.strictEqual(R.primarySkipped.m, m);
      assert.strictEqual(R.primarySkipped.sides.join(' and '), sides);
      assert.strictEqual(R.cut.length, sides === 'before and after' ? 2 : 1);
      assert.match(CMP.report(R), /not read: the .* arm was cut before any run finished/);
    });
  });
});
