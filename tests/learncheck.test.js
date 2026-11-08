'use strict';
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
  ['after', 'before', 'seeds', 'questions', 'answers', 'primary', 'looks', 'args'].forEach(k =>
    assert.match(Y, new RegExp(`ok ${k} "\\$`), k)
  );
});

test('both arms run the same learnsim options, and learncmp of the version with the change reads them', () => {
  assert.match(Y, /for side in before after; do/);
  assert.match(Y, /node tools\/learnsim\.js --world "\$w" --subject "\$SUBJECT"/);
  assert.match(Y, /node after\/tools\/learncmp\.js "\$out\/\$w-before\.json" "\$out\/\$w-after\.json"/);
});

// Codex review #791: learnsim loads Playwright before it reads --world, so the package is installed for every world
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
