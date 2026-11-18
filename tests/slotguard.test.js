require('./slot.js').testGuard();
// The automatic lock of the unit tests (rule W24): every
// tests/*.test.js starts with `require('./slot.js').testGuard();`, which in a several-file `node --test` run takes the
// machine slot for the runner, so even a bare `node --test tests/*.test.js` waits its turn. A single file stays unlocked.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawn} = require('child_process');

const GUARD = "require('./slot.js').testGuard();",
  SLOT = require.resolve('./slot.js');

test('every tests/*.test.js starts with the slot guard (first line, or right after a "use strict")', () => {
  const bad = fs
    .readdirSync(__dirname)
    .filter(f => f.endsWith('.test.js'))
    .filter(f => {
      const lines = fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n');
      return !(lines[0] === GUARD || (lines[0] === "'use strict';" && lines[1] === GUARD));
    });
  assert.deepStrictEqual(bad, [], `add ${GUARD} as the first line of: ${bad.join(', ')} (rule W24)`);
});

// A sandbox of its own: slots in a temp directory, one slot, the load gate off, outside any slot of the run that started
// this test, and outside this test's own runner (NODE_TEST_CONTEXT, or the child would not be a runner).
const sandbox = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slotguard-test-')),
    stub = path.join(dir, 'calm-load.js');
  fs.writeFileSync(stub, "require('os').loadavg = () => [0, 0, 0];\n");
  for (const n of ['a', 'b'])
    fs.writeFileSync(
      path.join(dir, n + '.test.js'),
      `require(${JSON.stringify(SLOT)}).testGuard(); console.log('ran ${n}', !!process.env.REEFID_SLOT);\n`
    );
  const env = {
    ...process.env,
    CI: '',
    SMOKE_SLOT_DIR: path.join(dir, 's'),
    SMOKE_SLOTS: '1',
    SMOKE_SLOT_POLL: '50',
    NODE_OPTIONS: '--require ' + stub,
    REEFID_SLOT: '',
    REEFID_SLOT_WRAP: '',
    SLOT_MIN_FREE_GB: '0'
  };
  delete env.NODE_TEST_CONTEXT;
  return {dir, env};
};
const exec = (args, env, cwd) =>
  new Promise(r => {
    const c = spawn(process.execPath, args, {env, cwd, stdio: ['ignore', 'pipe', 'pipe']});
    let out = '',
      err = '';
    c.stdout.on('data', d => (out += d));
    c.stderr.on('data', d => (err += d));
    c.on('exit', code => r({code, out, err}));
  });

test("node --test with several files waits for the slot, one file does not, and the files run in the runner's slot", async t => {
  if (!fs.existsSync('/proc/self/stat')) return t.skip('the guard needs /proc (Linux)');
  const {dir, env} = sandbox();
  try {
    // Another live process holds the only slot.
    const holder = spawn(
      process.execPath,
      [
        '-e',
        `require(${JSON.stringify(SLOT)})('holder').then(() => { console.log('held'); process.stdin.resume(); process.stdin.on('end', () => process.exit(0)); });`
      ],
      {env, stdio: ['pipe', 'pipe', 'inherit']}
    );
    await new Promise(r => holder.stdout.once('data', r));
    const one = await exec(['--test', 'a.test.js'], env, dir);
    assert.match(one.out, /ran a false/, 'a single file runs at once, outside any slot');
    const several = exec(['--test', 'a.test.js', 'b.test.js'], env, dir);
    let done = false;
    several.then(() => (done = true));
    await new Promise(r => setTimeout(r, 800));
    assert.ok(!done, 'several files wait while the only slot is held');
    holder.stdin.end();
    const r = await several;
    assert.strictEqual(r.code, 0);
    assert.match(r.out, /ran a true/, 'a file runs in the slot taken for the runner (its children never wait for it)');
    assert.match(r.out, /ran b true/);
    assert.match(r.err + r.out, /waiting for a smoke slot \(1 on this machine/);
    // Both files ran in one slot, given back when the runner ended (taken back as dead on the next look).
    const left = fs.existsSync(env.SMOKE_SLOT_DIR) ? fs.readdirSync(env.SMOKE_SLOT_DIR) : [];
    assert.ok(left.length <= 1, "at most the dead runner's slot is left: " + left);
    // node tests/run.js style: inside a holder's tree (REEFID_SLOT of a live slot) nothing waits, no deadlock.
    fs.rmSync(env.SMOKE_SLOT_DIR, {recursive: true, force: true});
    const outer = await exec([SLOT, '--', process.execPath, '--test', 'a.test.js', 'b.test.js'], env, dir);
    assert.strictEqual(outer.code, 0);
    assert.match(outer.out, /ran a true/);
    assert.doesNotMatch(outer.err + outer.out, /waiting for a smoke slot/);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

// The value of a reporter or import option is not a test file, so it never makes a several-file run a single-file one.
test('testFiles: the files a node --test command names, option values excluded', () => {
  const {testFiles} = require('./slot.js');
  assert.deepStrictEqual(testFiles(['a.test.js']), ['a.test.js']);
  assert.deepStrictEqual(testFiles(['a.test.js', 'b.test.js']), ['a.test.js', 'b.test.js']);
  assert.deepStrictEqual(testFiles(['--test-reporter', 'spec', '--test-reporter-destination', 'report.log']), []);
  assert.deepStrictEqual(testFiles(['--import', './x.js', '--test-name-pattern', 'merge', 'tests/']), []);
  assert.deepStrictEqual(testFiles(['--test-name-pattern=merge', 'tests/*.test.js']), ['tests/*.test.js']);
});

// Files racing for one runner take one slot between them, and another run's slot is never touched.
test('two files racing for one runner end with one slot, with two slots free', async t => {
  if (!fs.existsSync('/proc/self/stat')) return t.skip('the guard needs /proc (Linux)');
  const {dir, env} = sandbox();
  try {
    env.SMOKE_SLOTS = '2';
    const runner = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 5000)'], {stdio: 'ignore'}),
      hold = () => exec([SLOT, '--name', 'racer', '--hold', String(runner.pid)], env, dir);
    const rs = await Promise.all([hold(), hold(), hold()]);
    assert.deepStrictEqual(
      rs.map(r => r.code),
      [0, 0, 0]
    );
    const mine = fs.readdirSync(env.SMOKE_SLOT_DIR).filter(n => /^slot\d+$/.test(n));
    assert.deepStrictEqual(mine.length, 1, 'one slot for the runner: ' + mine);
    assert.ok(!fs.readdirSync(env.SMOKE_SLOT_DIR).some(n => n.startsWith('.hold-')), 'the lock is given back');
    runner.kill();
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
