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
  ['after', 'before', 'seeds', 'questions', 'answers', 'primary', 'looks', 'args', 'pierre_go', 'budget'].forEach(k =>
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
    execFileSync('bash', ['-c', step('The paired comparison (tools/learncmp.js of the version with the change)')], {
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
test('the input check takes every learncmp measure as the primary, and refuses the rest', () => {
  const check = env =>
    (() => {
      try {
        execFileSync('bash', ['-c', step('Check the inputs')], {
          env: {
            PATH: process.env.PATH,
            AFTER: 'x',
            BEFORE: 'main',
            SEEDS: '10',
            QUESTIONS: '300',
            ANSWERS: '3000',
            LOOKS: '1',
            ARGS: '',
            ...env
          },
          stdio: 'pipe'
        });
        return true;
      } catch (e) {
        return false;
      }
    })();
  const L = require('../tools/learncmp.js');
  Object.keys(L.MEASURES).forEach(m => assert.ok(check({PRIMARY: `${m}@${L.MEASURES[m].kind === 'run' ? 'run' : 300}:down`}), m));
  assert.ok(check({PRIMARY: 'c3@run:down'}));
  assert.ok(check({PRIMARY: ''}));
  ['c3@run:down;id', '3c@run:up', 'score@x:up', 'score@300:sideways'].forEach(p => assert.ok(!check({PRIMARY: p}), p));
  // The budget input: 1 to 40 minutes or empty (learnsim itself refuses more).
  ['', '1', '10', '40'].forEach(b => assert.ok(check({PRIMARY: '', BUDGET: b}), b));
  ['0', '41', '100', '1.5', 'x'].forEach(b => assert.ok(!check({PRIMARY: '', BUDGET: b}), b));
});

// The budget is enforced from outside the compared checkout (an older `before` ignores --budget): `timeout` ends an arm,
// exit 124 marks it cut with no runs, any other failure still fails the step.
test('an arm stopped by timeout is marked cut, and another failure stays a failure', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'learncheck-cut-')),
    bin = path.join(dir, 'bin'),
    out = path.join(dir, 'out'),
    seen = path.join(dir, 'timeout-args');
  ['bin', 'before', 'after'].forEach(d => fs.mkdirSync(path.join(dir, d)));
  fs.writeFileSync(path.join(bin, 'timeout'), `#!/bin/sh\necho "$1" >> ${seen}\nexit \${STUB_RC:-0}\n`, {mode: 0o755});
  const run = rc =>
    execFileSync('bash', ['-e', '-c', step('Both arms, the same seeds')], {
      cwd: dir,
      stdio: 'pipe',
      env: {
        PATH: `${bin}:${process.env.PATH}`,
        RUNNER_TEMP: dir,
        STUB_RC: String(rc),
        WORLD: 'rated',
        SUBJECT: 'fish',
        SEEDS: '10',
        QUESTIONS: '300',
        ANSWERS: '3000',
        BUDGET: '',
        ARGS: '',
        PIERRE_GO: ''
      }
    });
  run(124);
  for (const side of ['before', 'after']) {
    const f = JSON.parse(fs.readFileSync(path.join(out, `rated-${side}.json`), 'utf8'));
    assert.strictEqual(f.cut.cut, true, side);
    assert.strictEqual(f.cut.budgetMin, 20); // one world: 20 minutes a run
    assert.deepStrictEqual(f.runs, []);
  }
  assert.deepStrictEqual(fs.readFileSync(seen, 'utf8').trim().split('\n'), ['1320', '1320']); // 20 minutes and 2 more
  assert.throws(() => run(1));
  run(0); // a run that ended in time is no cut
  fs.rmSync(dir, {recursive: true});
});
