// tests/slot.js: the machine-wide cap on Playwright runs and the SMOKE_ONLY / SMOKE_PART / SMOKE_W selection.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawn} = require('child_process');

// Runs fn with these environment variables (undefined = unset), then puts them back.
const withEnv = async (vars, fn) => {
  const old = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(old)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  }
};
const fresh = () => {
  delete require.cache[require.resolve('./slot.js')];
  return require('./slot.js');
};
const none = {SMOKE_ONLY: undefined, PAGES_ONLY: undefined, SMOKE_PART: undefined, SMOKE_W: undefined};

test('parts: everything by default; SMOKE_ONLY, PAGES_ONLY (older name) and SMOKE_PART pick; a typo fails', async () => {
  const {parts} = fresh(),
    all = ['main', 'overlays', 'tips', 'replay'],
    groups = {main: ['main', 'overlays'], rest: ['tips', 'replay']},
    as = (env, f) => withEnv({...none, ...env}, () => [...f()]);
  assert.deepStrictEqual(await as({}, () => parts(all, groups)), all);
  assert.deepStrictEqual(await as({SMOKE_ONLY: 'tips, replay'}, () => parts(all, groups)), ['tips', 'replay']);
  assert.deepStrictEqual(await as({PAGES_ONLY: 'replay'}, () => parts(all, groups)), ['replay']);
  assert.deepStrictEqual(await as({SMOKE_PART: 'rest'}, () => parts(all, groups)), ['tips', 'replay']);
  await assert.rejects(
    as({SMOKE_ONLY: 'tip'}, () => parts(all, groups)),
    /no part named tip/
  );
  await assert.rejects(
    as({SMOKE_PART: 'other'}, () => parts(all, groups)),
    /no such group/
  );
  // The CI shards cover every part: a part in no group fails every run, the full one too.
  await assert.rejects(
    as({}, () => parts(all, {main: ['main'], rest: ['tips', 'replay']})),
    /leave out overlays/
  );
});

test('widths: the default, or the ones SMOKE_W names in the default order; a width the smoke has not fails', async () => {
  const {widths, partial} = fresh();
  assert.deepStrictEqual(await withEnv(none, () => widths([390, 1280])), [390, 1280]);
  assert.deepStrictEqual(await withEnv({SMOKE_W: '1280,390'}, () => widths([390, 1280])), [390, 1280]);
  assert.deepStrictEqual(await withEnv({SMOKE_W: '390'}, () => widths([390, 1280])), [390]);
  await assert.rejects(
    withEnv({SMOKE_W: '400'}, async () => widths([390, 1280])),
    /400 is not a width/
  );
  assert.strictEqual(partial(['a', 'b'], new Set(['a', 'b']), [390, 1280], [390, 1280]), '');
  assert.match(partial(['a', 'b'], new Set(['b']), [390, 1280], [390]), /partial run: parts b of a, b; widths 390 of 390, 1280/);
});

test("slot: at most SMOKE_SLOTS holders, a dead holder's slot is taken back, given back at exit; no-op on CI", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slot-test-')),
    env = {CI: undefined, SMOKE_SLOT_DIR: dir, SMOKE_SLOTS: '1'};
  try {
    // On CI nothing is written.
    await withEnv({...env, CI: 'true'}, async () => (await fresh()('t'))());
    assert.deepStrictEqual(fs.readdirSync(dir), []);
    // A slot held by a process that is gone (a PID that cannot exist) is taken back at once.
    fs.writeFileSync(path.join(dir, 'slot0'), '999999999 1 someone 2026-01-01T00:00:00Z old\n');
    const free = await withEnv(env, async () => {
      const os2 = require('os'),
        la = os2.loadavg;
      os2.loadavg = () => [0, 0, 0]; // the machine running the tests may be busy: the load gate is not what is tested here
      try {
        return await fresh()('t1');
      } finally {
        os2.loadavg = la;
      }
    });
    assert.match(fs.readFileSync(path.join(dir, 'slot0'), 'utf8'), new RegExp(`^${process.pid} \\S+ \\S+ \\S+ t1\\n$`));
    // A second process waits while this one holds the only slot, and gets it once it is given back.
    const child = spawn(
      process.execPath,
      [
        '-e',
        `require('os').loadavg = () => [0, 0, 0];
         require(${JSON.stringify(require.resolve('./slot.js'))})('t2').then(() => console.log('got'));`
      ],
      // REEFID_SLOT '': a separate process, not a child running in this test's slot (rule W24)
      {env: {...process.env, ...env, CI: '', REEFID_SLOT: ''}, stdio: ['ignore', 'pipe', 'pipe']}
    );
    let out = '',
      err = '';
    child.stdout.on('data', d => (out += d));
    child.stderr.on('data', d => (err += d));
    await new Promise(r => setTimeout(r, 800));
    assert.strictEqual(out, '', 'the second process waits');
    assert.match(err, /waiting for a smoke slot \(1 on this machine/);
    free();
    assert.ok(!fs.existsSync(path.join(dir, 'slot0')) || !fs.readFileSync(path.join(dir, 'slot0'), 'utf8').startsWith(process.pid + ' '));
    const code = await new Promise(r => child.on('exit', r));
    assert.strictEqual(code, 0);
    assert.strictEqual(out.trim(), 'got');
    assert.deepStrictEqual(fs.readdirSync(dir), [], 'the second process gave its slot back when it ended');
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

// Codex review #450: a slot file whose record is not complete yet (another process publishing it) is a live holder,
// never a dead one: taking it back let two holders run Chromium at once. Only a record left incomplete for a minute
// (a crash with an older version mid-write) is taken back. And a record whose PID now belongs to another process (Linux:
// another start time) is a dead holder.
test('slot: an incomplete record is not taken back while recent; a reused PID is', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slot-test-')),
    env = {CI: undefined, SMOKE_SLOT_DIR: dir, SMOKE_SLOTS: '1', SMOKE_SLOT_POLL: '100'},
    f = path.join(dir, 'slot0'),
    take = ms =>
      withEnv(env, async () => {
        const os2 = require('os'),
          la = os2.loadavg;
        os2.loadavg = () => [0, 0, 0];
        try {
          return await fresh()('t', {timeout: ms});
        } finally {
          os2.loadavg = la;
        }
      });
  try {
    for (const rec of ['', String(process.pid)]) {
      fs.writeFileSync(f, rec);
      assert.strictEqual(await take(1500), null, `a recent incomplete record ${JSON.stringify(rec)} is not taken back`);
      assert.strictEqual(fs.readFileSync(f, 'utf8'), rec);
    }
    const old = new Date(Date.now() - 5 * 60e3);
    fs.utimesSync(f, old, old);
    const free = await take(3000);
    assert.ok(free, 'an incomplete record left for minutes is taken back');
    free();
    if (fs.existsSync('/proc/self/stat')) {
      fs.writeFileSync(f, `${process.pid} 1 someone 2026-01-01T00:00:00Z old\n`); // this PID, another start time
      const free2 = await take(3000);
      assert.ok(free2, 'a record whose PID was reused is taken back');
      free2();
    }
    assert.deepStrictEqual(fs.readdirSync(dir), []);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

// Codex review #450: six processes racing for one slot never hold it two at a time.
test('slot: one holder at a time when six processes race for the only slot', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slot-test-')),
    log = path.join(dir, 'log'),
    env = {...process.env, CI: '', SMOKE_SLOT_DIR: path.join(dir, 's'), SMOKE_SLOTS: '1', SMOKE_SLOT_POLL: '20'};
  try {
    const code = `require('os').loadavg = () => [0, 0, 0];
      const fs = require('fs');
      require(${JSON.stringify(require.resolve('./slot.js'))})('race').then(async () => {
        fs.appendFileSync(${JSON.stringify(log)}, '+\\n');
        await new Promise(r => setTimeout(r, 100));
        fs.appendFileSync(${JSON.stringify(log)}, '-\\n');
      });`;
    await Promise.all(
      Array.from({length: 6}, () => new Promise(r => spawn(process.execPath, ['-e', code], {env, stdio: 'ignore'}).on('exit', r)))
    );
    let now = 0,
      most = 0;
    const ev = fs.readFileSync(log, 'utf8').trim().split('\n');
    ev.forEach(e => (most = Math.max(most, (now += e === '+' ? 1 : -1))));
    assert.deepStrictEqual([ev.length, most], [12, 1]);
    assert.deepStrictEqual(fs.readdirSync(path.join(dir, 's')), [], 'every slot given back, no file left over');
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

// Rule W24 (Pierre, 2026-11-05: "the automatic lock of the unit tests"): full unit-test runs and heavy tools take the same
// slots. Children run with the load gate off (NODE_OPTIONS preloads a stub: the machine running the tests may be busy)
// and outside any slot of the run that started the tests (REEFID_SLOT '').
const SLOT = require.resolve('./slot.js');
const sandbox = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slot-test-')),
    stub = path.join(dir, 'calm-load.js');
  fs.writeFileSync(stub, "require('os').loadavg = () => [0, 0, 0];\n");
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
  return {dir, env, slots: () => (fs.existsSync(env.SMOKE_SLOT_DIR) ? fs.readdirSync(env.SMOKE_SLOT_DIR) : [])};
};
const exec = (cmd, args, env) =>
  new Promise(r => {
    const c = spawn(cmd, args, {env, stdio: ['ignore', 'pipe', 'pipe']});
    let out = '',
      err = '';
    c.stdout.on('data', d => (out += d));
    c.stderr.on('data', d => (err += d));
    c.on('exit', code => r({code, out, err}));
  });

test('node tests/slot.js -- cmd: cmd runs in the slot and its code passes through; slot() and guard() inside it do not wait', async () => {
  const {dir, env, slots} = sandbox();
  try {
    const code = `const fs = require('fs'), slot = require(${JSON.stringify(SLOT)});
      const rec = fs.readFileSync(require('path').join(process.env.SMOKE_SLOT_DIR, 'slot0'), 'utf8');
      slot.guard('inner tool'); // run directly by the wrapper: returns at once
      slot('inner smoke', {timeout: 300}).then(free => {
        console.log(JSON.stringify({rec, held: process.env.REEFID_SLOT, wrap: process.env.REEFID_SLOT_WRAP, ppid: process.ppid, nested: !!free}));
        process.exit(3);
      });`;
    const r = await exec(process.execPath, [SLOT, '--name', 'outer', '--', process.execPath, '-e', code], env),
      o = JSON.parse(r.out);
    assert.strictEqual(r.code, 3, "the command's exit code passes through");
    assert.ok(o.nested, "a slot() inside the holder's tree resolves at once (no deadlock on the only slot)");
    assert.strictEqual(o.wrap, String(o.ppid));
    assert.ok(o.held && o.rec.startsWith(o.held + ' ') && / outer\n$/.test(o.rec), "the slot is held under the wrapper's id");
    assert.deepStrictEqual(slots(), [], 'given back when the command ends');
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test("node tests/slot.js -- cmd: waits while another process holds the only slot; a dead holder's slot is taken back", async () => {
  const {dir, env, slots} = sandbox();
  try {
    // Another live process holds the only slot (it prints once it has it, then waits for stdin to close).
    const holder = spawn(
      process.execPath,
      [
        '-e',
        `require(${JSON.stringify(SLOT)})('holder').then(() => { console.log('held'); process.stdin.resume(); process.stdin.on('end', () => process.exit(0)); });`
      ],
      {env, stdio: ['pipe', 'pipe', 'inherit']}
    );
    await new Promise(r => holder.stdout.once('data', r));
    const wait = exec(process.execPath, [SLOT, '--', process.execPath, '-e', "console.log('ran')"], env);
    let done = false;
    wait.then(() => (done = true));
    await new Promise(r => setTimeout(r, 700));
    assert.ok(!done, 'the command waits while the slot is held');
    holder.stdin.end();
    const r = await wait;
    assert.deepStrictEqual([r.code, r.out.trim()], [0, 'ran']);
    assert.match(r.err, /waiting for a smoke slot \(1 on this machine/);
    // A slot left by a process that is gone is taken back at once.
    fs.writeFileSync(path.join(env.SMOKE_SLOT_DIR, 'slot0'), '999999999 1 someone 2026-01-01T00:00:00Z old\n');
    const r2 = await exec(process.execPath, [SLOT, '--', process.execPath, '-e', "console.log('ran')"], env);
    assert.deepStrictEqual([r2.code, r2.out.trim(), slots()], [0, 'ran', []]);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('guard(): a heavy tool re-runs itself in a slot, once, with its arguments and exit code; on CI it runs as it is', async () => {
  const {dir, env, slots} = sandbox(),
    js = path.join(dir, 'tool.js'),
    py = path.join(dir, 'tool.py');
  fs.writeFileSync(
    js,
    `require(${JSON.stringify(SLOT)}).guard('tool.js');
     console.log(JSON.stringify({slot: process.env.REEFID_SLOT || '', args: process.argv.slice(2)}));
     process.exit(5);\n`
  );
  fs.writeFileSync(
    py,
    `import json, os, sys\nsys.path.insert(0, ${JSON.stringify(path.join(__dirname, '..', 'tools'))})\nimport slot\nslot.guard('tool.py')\n` +
      `print(json.dumps({'slot': os.environ.get('REEFID_SLOT', ''), 'args': sys.argv[1:]}))\nsys.exit(5)\n`
  );
  try {
    for (const [cmd, file] of [
      [process.execPath, js],
      ['python3', py]
    ]) {
      const ci = await exec(cmd, [file, 'a', 'b c'], {...env, CI: 'true'});
      assert.strictEqual(ci.code, 5);
      assert.deepStrictEqual(JSON.parse(ci.out), {slot: '', args: ['a', 'b c']}, file + ': on CI, no slot and no re-run');
      assert.deepStrictEqual(slots(), [], file + ': on CI nothing is written');
      const r = await exec(cmd, [file, 'a', 'b c'], env),
        lines = r.out.trim().split('\n');
      assert.strictEqual(r.code, 5, file + ': the exit code passes through');
      assert.strictEqual(lines.length, 1, file + ': the tool runs once (the outer process only waits)');
      const o = JSON.parse(lines[0]);
      assert.deepStrictEqual(o.args, ['a', 'b c']);
      assert.match(o.slot, /^\d+ \S+$/, file + ': it ran in a slot');
      assert.deepStrictEqual(slots(), [], file + ': the slot is given back');
      // Inside a holder's process tree (a full unit-test run, a smoke), the tool runs at once, in that slot.
      const inner = await exec(
        process.execPath,
        [
          SLOT,
          '--',
          process.execPath,
          '-e',
          `process.exit(require('child_process').spawnSync(${JSON.stringify(cmd)}, ${JSON.stringify([file, 'x'])}, {stdio: 'inherit'}).status)`
        ],
        env
      );
      assert.strictEqual(inner.code, 5, file + ': nested run');
      assert.doesNotMatch(inner.err, /waiting/, file + ": nested, it never waits for its own run's slot");
    }
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('tests/run.js: a full run is every tests/*.test.js under --test; options pass through; files given replace the default', () => {
  const args = require('./run.js'),
    all = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js'));
  const def = args([]);
  assert.strictEqual(def[0], '--test');
  assert.deepStrictEqual(
    def
      .slice(1)
      .map(f => path.basename(f))
      .sort(),
    all.sort()
  );
  assert.ok(def.slice(1).every(f => fs.existsSync(path.resolve(f))));
  assert.deepStrictEqual(args(['--test-name-pattern=merge']).slice(0, 2), ['--test', '--test-name-pattern=merge']);
  assert.strictEqual(args(['--test-name-pattern=merge']).length, all.length + 2);
  assert.deepStrictEqual(args(['tests/a.test.js', 'tests/b.test.js']), ['--test', 'tests/a.test.js', 'tests/b.test.js']);
});

test('every Playwright launch in tests/ and tools/ takes the slot; the heavy tools are guarded (rule W24)', () => {
  const ROOT = path.join(__dirname, '..'),
    files = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, {withFileTypes: true})) {
      if (['node_modules', 'archive', '.cache'].includes(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.[cm]?js$/.test(e.name)) files.push(p);
    }
  };
  walk(path.join(ROOT, 'tests'));
  walk(path.join(ROOT, 'tools'));
  const code = f =>
      fs
        .readFileSync(f, 'utf8')
        .split('\n')
        .filter(l => !/^\s*\/\//.test(l))
        .join('\n'),
    LAUNCH = /\b(?:chromium|firefox|webkit)\.launch(?:PersistentContext|Server)?\s*\(/,
    bad = [];
  for (const f of files) {
    const src = code(f),
      rel = path.relative(ROOT, f);
    if (!LAUNCH.test(src)) continue;
    if (rel === path.join('tests', 'calm.js')) {
      // calm.js hands every smoke a chromium whose launch takes the slot first.
      if (!/await slot\(.*\);\s*return calm\(await pw\.chromium\.launch/.test(src)) bad.push(rel + ': launch does not take the slot first');
      continue;
    }
    const viaCalm = /require\(['"]\.\/calm(?:\.js)?['"]\)/.test(src),
      takes = /require\(['"][./]*(?:tests\/)?slot(?:\.js)?['"]\)(?:\(|[\s\S]*\bslot\()/.test(src);
    if (!viaCalm && !takes) bad.push(rel + ': launches a browser without tests/slot.js');
  }
  assert.deepStrictEqual(bad, []);
  const guarded = {
    js: ['analyses', 'abilityeval', 'fallbackeval', 'realcheck', 'memreplay'],
    py: ['photo_metrics', 'photo_quality', 'find_dups', 'photos', 'judging_cand', 'judging_fish', 'fish_judge', 'fetch_approved']
  };
  for (const [ext, L] of Object.entries(guarded))
    for (const t of L)
      assert.match(
        fs.readFileSync(path.join(ROOT, 'tools', t + '.' + ext), 'utf8'),
        /\bslot(?:\.js'\))?\)?\.guard\(/,
        `tools/${t}.${ext} is guarded`
      );
});

test('the load budget is twice the cores; below 5 GB of free disk a heavy run refuses, with what to clean (rule W24)', async () => {
  const S = fresh(),
    {dir, env, slots} = sandbox();
  assert.strictEqual(S.maxLoad(), 2 * (os.cpus().length || 1));
  assert.strictEqual(S.MIN_FREE_GB, 5);
  try {
    // A load between the cores and twice the cores: the slot is given at once.
    const free = await withEnv({CI: undefined, SMOKE_SLOT_DIR: env.SMOKE_SLOT_DIR, SMOKE_SLOTS: '1', SLOT_MIN_FREE_GB: '0'}, async () => {
      const la = os.loadavg;
      os.loadavg = () => [1.5 * (os.cpus().length || 1), 0, 0];
      try {
        return await fresh()('busy', {timeout: 500});
      } finally {
        os.loadavg = la;
      }
    });
    assert.ok(free, 'a load under twice the cores does not wait');
    free();
    // Above twice the cores it waits.
    const wait = await withEnv(
      {CI: undefined, SMOKE_SLOT_DIR: env.SMOKE_SLOT_DIR, SMOKE_SLOTS: '1', SLOT_MIN_FREE_GB: '0', SMOKE_SLOT_POLL: '50'},
      async () => {
        const la = os.loadavg;
        os.loadavg = () => [2.5 * (os.cpus().length || 1), 0, 0];
        try {
          return await fresh()('overloaded', {timeout: 300});
        } finally {
          os.loadavg = la;
        }
      }
    );
    assert.strictEqual(wait, null, 'a load above twice the cores waits');
    assert.ok(S.diskOk(dir, 0).ok);
    const low = S.diskOk(dir, 1e9);
    assert.ok(!low.ok && low.free > 0 && low.min === 1e9);
    const r = await exec(process.execPath, [SLOT, '--', process.execPath, '-e', "console.log('ran')"], {
      ...env,
      SLOT_MIN_FREE_GB: '1000000000'
    });
    assert.strictEqual(r.code, 1);
    assert.strictEqual(r.out, '', 'the command never runs');
    assert.match(r.err, /refused: .* GB free .* under the 1000000000 GB a heavy run needs .*Clean up behind you/);
    assert.deepStrictEqual(slots(), []);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

// Codex review #608: a guarded tool killed by its original PID takes its run down with it (the wrapper and the worker),
// and the slot is given back: a cancelled analysis never keeps running and holding the slot.
test('guard(): SIGTERM to the guarded tool stops the run it started and gives the slot back', async () => {
  const {dir, env, slots} = sandbox(),
    js = path.join(dir, 'long.js'),
    pidf = path.join(dir, 'worker.pid');
  fs.writeFileSync(
    js,
    `require(${JSON.stringify(SLOT)}).guard('long.js');
     require('fs').writeFileSync(${JSON.stringify(pidf)}, String(process.pid));
     setTimeout(() => {}, 60e3);\n`
  );
  const alive = pid => {
    try {
      process.kill(pid, 0);
      return true;
    } catch (e) {
      return false;
    }
  };
  try {
    const outer = spawn(process.execPath, [js], {env, stdio: 'ignore'});
    const t0 = Date.now();
    while (!fs.existsSync(pidf) && Date.now() - t0 < 10e3) await new Promise(r => setTimeout(r, 50));
    const worker = +fs.readFileSync(pidf, 'utf8');
    assert.deepStrictEqual(slots(), ['slot0']);
    outer.kill('SIGTERM');
    const t1 = Date.now();
    while ((alive(worker) || slots().length) && Date.now() - t1 < 8e3) await new Promise(r => setTimeout(r, 100));
    assert.ok(!alive(worker), 'the worker stopped');
    assert.deepStrictEqual(slots(), [], 'the slot is given back');
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

// Codex review #608: the disk is checked again when the slot is given, not only before the wait.
test('slot: a run that waited refuses if the disk filled up meanwhile', async () => {
  const {dir, env, slots} = sandbox();
  try {
    const holder = spawn(
      process.execPath,
      [
        '-e',
        `require(${JSON.stringify(SLOT)})('holder').then(() => { console.log('held'); process.stdin.resume(); process.stdin.on('end', () => process.exit(0)); });`
      ],
      {env, stdio: ['pipe', 'pipe', 'inherit']}
    );
    await new Promise(r => holder.stdout.once('data', r));
    const waiter = exec(
      process.execPath,
      [
        '-e',
        `setTimeout(() => (process.env.SLOT_MIN_FREE_GB = '1e9'), 300); require(${JSON.stringify(SLOT)})('waiter').then(() => console.log('started'));`
      ],
      env
    );
    await new Promise(r => setTimeout(r, 600));
    holder.stdin.end();
    const r = await waiter;
    assert.strictEqual(r.out, '', 'the run never starts');
    assert.strictEqual(r.code, 1);
    assert.match(r.err, /refused: /);
    await new Promise(r => setTimeout(r, 200));
    assert.deepStrictEqual(slots(), []);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

// Codex review #608: an option's value given as the next argument is not a test file (it kept the default list out).
test('tests/run.js: a space-separated option value is not taken for a file', () => {
  const args = require('./run.js'),
    n = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).length;
  assert.strictEqual(args(['--test-name-pattern', 'parts:']).length, n + 3);
  assert.strictEqual(args(['--test-reporter', 'spec']).length, n + 3);
  assert.deepStrictEqual(args(['--test-reporter', 'spec', 'tests/a.test.js']), ['--test', '--test-reporter', 'spec', 'tests/a.test.js']);
});
