'use strict';
require('./slot.js').testGuard();
// tools/checkbudget.js (rule L11; Pierre, Q405 and Q415): the 40-minute cap of the check tools and level 3's gate, on a
// fake clock: no long run.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process');
const CB = require('../tools/checkbudget.js');

// A clock the test moves, and timers it fires by hand.
const fake = () => {
  const c = {t: 1000, timers: []};
  c.now = () => c.t;
  c.setTimer = (fn, ms) => (c.timers.push({fn, ms}), c.timers.length);
  c.clearTimer = id => (c.timers[id - 1].cleared = true);
  c.fire = i => {
    c.timers[i].fn();
  };
  return c;
};
const budgetOf = (min, c) => new CB.Budget(min, {now: c.now, setTimer: c.setTimer, clearTimer: c.clearTimer});

test('--budget: 40 minutes by default, less on request, never more, never nothing', () => {
  assert.strictEqual(CB.MAX_MIN, 40);
  assert.strictEqual(CB.parseBudget(undefined), 40);
  assert.strictEqual(CB.parseBudget('40'), 40);
  assert.strictEqual(CB.parseBudget('12.5'), 12.5);
  for (const bad of ['41', '40.01', '360', '0', '-5', 'x', '', 'Infinity', 'NaN'])
    assert.throws(() => CB.parseBudget(bad), /--budget/, bad);
});

test('the budget counts wall-clock time and arms one timer for what is left', () => {
  const c = fake(),
    b = budgetOf(40, c);
  assert.strictEqual(b.leftMs(), 40 * 60000);
  c.t += 15 * 60000;
  assert.strictEqual(b.elapsedMs(), 15 * 60000);
  assert.strictEqual(b.leftMs(), 25 * 60000);
  assert.strictEqual(b.expired(), false);
  const off = b.arm(() => {});
  assert.strictEqual(c.timers[0].ms, 25 * 60000);
  off();
  assert.ok(c.timers[0].cleared);
  c.t += 25 * 60000;
  assert.strictEqual(b.leftMs(), 0);
  assert.strictEqual(b.expired(), true);
  c.t += 5 * 60000;
  assert.strictEqual(b.leftMs(), 0); // never negative
});

test('the estimate runs in waves of workers, and a calibration scales with the length', () => {
  assert.strictEqual(CB.estimate(40, 4, 30), 300); // 10 waves of 30 s
  assert.strictEqual(CB.estimate(41, 4, 30), 330); // the last, partial wave counts whole
  assert.strictEqual(CB.estimate(0, 4, 30), 0);
  assert.strictEqual(CB.scaled(2, 100, 3000), 60);
  assert.strictEqual(CB.scaled(5, 1000, 1000), 5);
});

// LEARNING.md's level 2 on the rated world: 10 seeds x 4 profiles x 3,000 answers.
const L2 = {P: 4, S: 10, N: 3000, workers: 4, lengthFlag: 'questions'};

test('a plan within the budget goes ahead', () => {
  const c = fake(),
    p = CB.plan({...L2, budget: budgetOf(40, c), jobs: 40, perJobSec: 60, source: 'calibration'});
  assert.strictEqual(p.ok, true);
  assert.strictEqual(p.estSec, 600);
  assert.match(p.text, /estimated 10 min of the 40-minute budget/);
});

test('a plan over the budget is refused, with the options that fit, each of which fits', () => {
  const c = fake(),
    b = budgetOf(40, c),
    perJobSec = 300, // 10 waves x 300 s = 50 min
    p = CB.plan({...L2, budget: b, jobs: 40, perJobSec, source: '--per-job'});
  assert.strictEqual(p.ok, false);
  assert.match(p.text, /Refused/);
  assert.match(p.text, /--seeds 8/);
  assert.match(p.text, /--questions 2400/);
  assert.match(p.text, /--profiles the first 3 of the 4/);
  assert.match(p.text, /never lower them/);
  const left = 40 * 60,
    opts = CB.fitOptions({...L2, perJobSec, leftSec: left});
  const seeds = opts.find(o => o.flag === '--seeds').value,
    n = opts.find(o => o.flag === '--questions').value,
    profiles = Number(/the first (\d+)/.exec(opts.find(o => o.flag === '--profiles').value)[1]);
  assert.ok(CB.estimate(4 * seeds, 4, perJobSec) <= left);
  assert.ok(CB.estimate(4 * seeds + 4, 4, perJobSec) > left); // the most seeds that fit
  assert.ok(CB.estimate(40, 4, CB.scaled(perJobSec, 3000, n)) <= left);
  assert.ok(CB.estimate(profiles * 10, 4, perJobSec) <= left);
});

test('what is left of the budget after the calibration is what the plan is judged against', () => {
  const c = fake(),
    b = budgetOf(40, c);
  c.t += 30 * 60000; // 30 minutes gone, 10 left: the 10 minutes needed fit
  assert.strictEqual(CB.plan({...L2, budget: b, jobs: 40, perJobSec: 60, source: 'calibration'}).ok, true);
  c.t += 1000; // one second less
  assert.strictEqual(CB.plan({...L2, budget: b, jobs: 40, perJobSec: 60, source: 'calibration'}).ok, false);
});

test('a plan that exactly fills what is left fits; one second over does not', () => {
  const c = fake(),
    b = budgetOf(10, c);
  assert.strictEqual(CB.plan({...L2, budget: b, jobs: 40, perJobSec: 60, source: 'x'}).ok, true); // 600 s of 600 s
  assert.strictEqual(CB.plan({...L2, budget: b, jobs: 40, perJobSec: 60.1, source: 'x'}).ok, false);
});

test('no option fits when one job alone is over the budget', () => {
  const c = fake(),
    p = CB.plan({...L2, budget: budgetOf(1, c), jobs: 40, perJobSec: 3600, source: 'x'});
  assert.strictEqual(p.ok, false);
  assert.match(p.text, /--questions \d+/); // a shorter run is the one way
  assert.doesNotMatch(p.text, /--seeds/);
  const none = CB.plan({...L2, budget: budgetOf(1, c), jobs: 40, perJobSec: 3600 * 1e6, source: 'x'});
  assert.match(none.text, /none: even one seed/);
});

test('the pool returns every result when the budget holds, and never arms a cut that fires', async () => {
  const c = fake(),
    b = budgetOf(40, c),
    seen = [];
  const r = await CB.runPool({
    jobs: [1, 2, 3, 4, 5],
    workers: 2,
    budget: b,
    exec: async j => j * 10,
    onResult: x => seen.push(x)
  });
  assert.strictEqual(r.cut, false);
  assert.strictEqual(r.left, 0);
  assert.deepStrictEqual(
    r.results.sort((a, z) => a - z),
    [10, 20, 30, 40, 50]
  );
  assert.strictEqual(seen.length, 5);
  assert.strictEqual(b.cut, false);
  assert.ok(c.timers[0].cleared); // the timer is cancelled at the end
});

test('at the budget the pool stops dispatching, kills what is in flight and returns what it has, marked cut', async () => {
  const c = fake(),
    b = budgetOf(40, c),
    started = [],
    never = [];
  let killed = 0;
  const run = CB.runPool({
    jobs: [1, 2, 3, 4, 5, 6],
    workers: 2,
    budget: b,
    // jobs 1 and 2 finish; 3 and 4 hang until the cut and then fail as a killed browser would
    exec: j =>
      new Promise((ok, ko) => {
        started.push(j);
        if (j <= 2) return ok(j);
        never.push(ko);
      }),
    onCut: async () => {
      killed++;
      never.forEach(ko => ko(new Error('Target closed')));
    }
  });
  await new Promise(ok => setImmediate(ok));
  assert.deepStrictEqual(started, [1, 2, 3, 4]); // the two workers are on 3 and 4, nothing more dispatched
  c.t += 40 * 60000;
  c.fire(0);
  const r = await run;
  assert.strictEqual(b.cut, true);
  assert.strictEqual(killed, 1);
  assert.strictEqual(r.cut, true);
  assert.deepStrictEqual(r.results.sort(), [1, 2]);
  assert.strictEqual(r.left, 4); // 3 and 4 in flight, 5 and 6 never started
  assert.deepStrictEqual(started, [1, 2, 3, 4]);
  const info = CB.cutInfo(b, 6, r.results.length);
  assert.deepStrictEqual(info, {cut: true, budgetMin: 40, elapsedMin: 40, planned: 6, done: 2});
  assert.match(CB.cutBanner(info), /CUT at the 40-minute budget: 2 of 6 runs done/);
});

test('a cut needs the pool to return even when the killed jobs never answer (the threads of the rated world)', async () => {
  const c = fake(),
    b = budgetOf(5, c),
    run = CB.runPool({
      jobs: [1, 2, 3],
      workers: 2,
      budget: b,
      exec: j => (j === 1 ? Promise.resolve(1) : new Promise(() => {})),
      onCut: () => {}
    });
  await new Promise(ok => setImmediate(ok));
  c.fire(0);
  const r = await run;
  assert.strictEqual(r.cut, true);
  assert.deepStrictEqual(r.results, [1]);
});

test('an error before the cut is an error, not a cut', async () => {
  const c = fake();
  await assert.rejects(
    CB.runPool({jobs: [1, 2], workers: 1, budget: budgetOf(40, c), exec: async () => Promise.reject(new Error('boom'))}),
    /boom/
  );
});

test('a run that ended in time carries no cut', () => {
  const c = fake();
  assert.strictEqual(CB.cutInfo(budgetOf(40, c), 10, 10), null);
});

test('level 3 is more than 20 seeds, or more than 10,000 answers in the rated world', () => {
  const L = CB.level3Reason;
  assert.strictEqual(L({world: 'rated', seeds: 10, N: 3000}), null);
  assert.strictEqual(L({world: 'rated', seeds: 20, N: 10000}), null); // level 2's ceilings
  assert.match(L({world: 'rated', seeds: 21, N: 3000}), /21 seeds/);
  assert.match(L({world: 'rated', seeds: 10, N: 30000}), /30000 answers/);
  assert.match(L({world: 'app', seeds: 30, N: 300}), /30 seeds/);
  assert.strictEqual(L({world: 'app', seeds: 5, N: 30000}), null); // the app world's horizon is questions, sized by seeds
});

test("level 3 runs only with Pierre's go on a GitHub runner; anywhere else it prints the dispatch command", () => {
  const base = {reason: '40 seeds', subject: 'fish', world: 'rated', seeds: 40, N: 30000};
  assert.strictEqual(CB.level3Gate({...base, reason: null, go: '', runner: false}), null); // not level 3
  const local = CB.level3Gate({...base, go: 'Q999, 2026-11-20', runner: false});
  assert.match(local, /never runs on this machine/);
  assert.match(local, /gh workflow run learncheck\.yml .*-f world=rated -f seeds=40 -f answers=30000 .*-f pierre_go=/);
  assert.match(CB.level3Gate({...base, go: '', runner: false}), /gh workflow run/); // the go does not move it here
  assert.match(CB.level3Gate({...base, go: '', runner: true}), /needs Pierre's explicit go/);
  assert.match(CB.level3Gate({...base, go: '   ', runner: true}), /needs Pierre's explicit go/);
  assert.strictEqual(CB.level3Gate({...base, go: 'Q999, 2026-11-20', runner: true}), null);
  const app = CB.level3Gate({...base, world: 'app', seeds: 30, N: 300, go: '', runner: false});
  assert.match(app, /-f world=app -f seeds=30 -f questions=300/);
});

// The tool itself, without any run: its refusals come before the slot, the browser and the clock.
const LEARNSIM = path.join(__dirname, '..', 'tools', 'learnsim.js'),
  tool = (args, env = {}) => {
    const e = {...process.env, GITHUB_ACTIONS: '', ...env};
    delete e.NODE_TEST_CONTEXT; // the child is not a test runner
    return spawnSync(process.execPath, [LEARNSIM, ...args], {encoding: 'utf8', env: e, timeout: 120000});
  };
// A machine slot of its own for a run that takes one (as tests/slotguard.test.js does): one slot in dir, the load gate
// off, outside the slot of the runner that started this test, so a busy machine never makes the test wait.
const sandbox = dir => {
  const stub = path.join(dir, 'calm-load.js');
  fs.writeFileSync(stub, "require('os').loadavg = () => [0, 0, 0];\n");
  const env = {
    GITHUB_ACTIONS: '',
    CI: '',
    SMOKE_SLOT_DIR: path.join(dir, 'slots'),
    SMOKE_SLOTS: '1',
    SMOKE_SLOT_POLL: '50',
    NODE_OPTIONS: '--require ' + stub,
    REEFID_SLOT: '',
    REEFID_SLOT_WRAP: '',
    SLOT_MIN_FREE_GB: '0'
  };
  return env;
};
let hasPlaywright = true;
try {
  require.resolve('playwright');
} catch (e) {
  hasPlaywright = false;
}

test(
  'learnsim refuses level 3 on this machine, and without the go on a runner, and a budget over 40',
  {skip: !hasPlaywright && 'playwright is not installed'},
  () => {
    let r = tool(['--world', 'rated', '--seeds', '40', '--questions', '30000']);
    assert.strictEqual(r.status, 2);
    assert.match(r.stderr, /never runs on this machine/);
    assert.match(r.stderr, /gh workflow run learncheck\.yml/);
    r = tool(['--world', 'rated', '--seeds', '40', '--questions', '30000', '--pierre-go', 'Q999, 2026-11-20']);
    assert.strictEqual(r.status, 2); // the go alone is not enough off a runner
    assert.match(r.stderr, /never runs on this machine/);
    r = tool(['--world', 'app', '--seeds', '30'], {GITHUB_ACTIONS: 'true'});
    assert.strictEqual(r.status, 2);
    assert.match(r.stderr, /needs Pierre's explicit go/);
    r = tool(['--world', 'rated', '--budget', '41']);
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /never runs more than 40 minutes/);
  }
);

test(
  'the rated world refuses a plan over the budget before it runs, and a cut leaves its mark in --out',
  {skip: !hasPlaywright && 'playwright is not installed'},
  () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkbudget-')),
      out = path.join(dir, 'cut.json');
    // 100 s a job over 40 jobs on 1 worker: 4,000 s, over the 2-minute budget: refused, nothing run, no file
    let r = tool([
      '--world',
      'rated',
      '--subject',
      'fish',
      '--seeds',
      '10',
      '--profiles',
      'beginner,expert,strongRA,lectureRA',
      '--questions',
      '3000',
      '--workers',
      '1',
      '--budget',
      '2',
      '--per-job',
      '100',
      '--out',
      out
    ]);
    assert.strictEqual(r.status, 2, r.stderr);
    assert.match(r.stderr, /Refused/);
    assert.match(r.stderr, /Options that would fit/);
    assert.ok(!fs.existsSync(out));
    // a budget of 3 s with jobs far longer: cut, with what it has, marked in the file and the printout
    r = tool(
      [
        '--world',
        'rated',
        '--subject',
        'fish',
        '--seeds',
        '4',
        '--profiles',
        'beginner,expert',
        '--questions',
        '10000',
        '--workers',
        '2',
        '--budget',
        '0.05',
        '--per-job',
        '0.1',
        '--out',
        out
      ],
      sandbox(dir)
    );
    assert.ok(r.status === 0 || r.status === 3, r.stderr);
    assert.match(r.stdout, /CUT at the 0\.05-minute budget/);
    if (r.status === 0) {
      const f = JSON.parse(fs.readFileSync(out, 'utf8'));
      assert.strictEqual(f.cut.cut, true);
      assert.strictEqual(f.cut.planned, 8);
      assert.ok(f.cut.done < 8);
      assert.strictEqual(f.budgetMin, 0.05);
    }
    fs.rmSync(dir, {recursive: true});
  }
);
