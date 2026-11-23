require('./slot.js').testGuard();
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

// A slot file whose record is not complete yet (another process publishing it) is a live holder,
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

// A dead holder's slot is taken back and linked in the same pass: a pass that stalls (a loaded CI runner's disk or CPU) for
// longer than the caller's timeout still ends with the slot, never with null after the reaping (the flake of the test
// above: it timed out with the freed slot in front of it). The stall is a busy wait where a pass begins (the disk check).
test('slot: a dead holder is taken back and replaced in one pass, however long that pass lasts', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slot-test-')),
    env = {CI: undefined, SMOKE_SLOT_DIR: dir, SMOKE_SLOTS: '1', SMOKE_SLOT_POLL: '100'},
    f = path.join(dir, 'slot0'),
    statfs = fs.statfsSync,
    la = os.loadavg;
  try {
    fs.writeFileSync(f, '999999999 1 someone 2026-01-01T00:00:00Z old\n'); // a holder that is gone
    let stalled = false;
    fs.statfsSync = (...a) => {
      if (!stalled) {
        stalled = true;
        for (const t = Date.now(); Date.now() - t < 400;); // a stall of 4 times the timeout, before the first try
      }
      return statfs(...a);
    };
    os.loadavg = () => [0, 0, 0];
    const free = await withEnv(env, () => fresh()('t', {timeout: 100}));
    assert.ok(free, 'the slot of the dead holder is ours although the pass outlasted the timeout');
    assert.ok(stalled, 'the stall happened');
    assert.match(fs.readFileSync(f, 'utf8'), new RegExp(`^${process.pid} \\S+ \\S+ \\S+ t\\n$`));
    free();
    assert.deepStrictEqual(fs.readdirSync(dir), []);
  } finally {
    fs.statfsSync = statfs;
    os.loadavg = la;
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

// Six processes racing for one slot never hold it two at a time.
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

// Rule W24: full unit-test runs and heavy tools take the same
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

test('tests/run.js: the fast tier is every tests/*.test.js but the slow ones; --all runs them too; options pass through; files given replace the default', () => {
  const args = require('./run.js'),
    all = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')),
    slow = args.slowFiles(),
    names = a =>
      a
        .slice(1)
        .map(f => path.basename(f))
        .sort();
  assert.ok(slow.length > 0 && slow.every(f => all.includes(f)), 'some tests are tagged // @slow');
  const def = args([]);
  assert.strictEqual(def[0], '--test');
  assert.deepStrictEqual(names(def), all.filter(f => !slow.includes(f)).sort());
  assert.ok(def.slice(1).every(f => fs.existsSync(path.resolve(f))));
  // --all is ours, not node's: every file, no flag passed on
  const every = args(['--all']);
  assert.deepStrictEqual(names(every), all.slice().sort());
  assert.ok(!every.includes('--all'));
  assert.deepStrictEqual(args(['--test-name-pattern=merge', '--all']).slice(0, 2), ['--test', '--test-name-pattern=merge']);
  assert.deepStrictEqual(args(['--test-name-pattern=merge']).slice(0, 2), ['--test', '--test-name-pattern=merge']);
  assert.strictEqual(args(['--test-name-pattern=merge']).length, def.length + 1);
  assert.deepStrictEqual(args(['tests/a.test.js', 'tests/b.test.js']), ['--test', 'tests/a.test.js', 'tests/b.test.js']);
  // a slow file named is run, with or without --all
  assert.deepStrictEqual(args(['tests/' + slow[0]]), ['--test', 'tests/' + slow[0]]);
});

test('a slow test carries `// @slow: <why>` right after the slot guard, and nothing else is tagged', () => {
  const {slowFiles} = require('./run.js'),
    tagged = slowFiles();
  for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js'))) {
    const lines = fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n'),
      at = lines[0] === "'use strict';" ? 2 : 1, // the guard's line, then the tag
      has = /^\/\/ @slow: \S/.test(lines[at] || '');
    assert.strictEqual(has, tagged.includes(f), `${f}: the tag is \`// @slow: <what it runs>\` on the line after the slot guard`);
    assert.ok(!lines.some((l, i) => i !== at && /^\/\/ @slow\b/.test(l)), `${f}: one @slow line, right after the guard`);
  }
});

test('CI and the merge train run every test file, tagged slow or not (rule W14)', () => {
  const root = path.join(__dirname, '..'),
    // CI runs the glob itself, so no tag can leave a file out of it
    wf = fs.readFileSync(path.join(root, '.github', 'workflows', 'checks.yml'), 'utf8');
  assert.match(wf, /node --test --test-shard="\$SHARD\/2" tests\/\*\.test\.js/, 'the unit shards run every tests/*.test.js, tagged or not');
  assert.doesNotMatch(wf, /tests\/run\.js/, 'CI never goes through the fast tier');
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
    js: [
      'analyses',
      'abilityeval',
      'fallbackeval',
      'realcheck',
      'memreplay',
      'studies/q316/checks',
      'studies/q316/replay2b',
      'studies/sharefree/arm'
    ],
    py: [
      'photo_metrics',
      'photo_quality',
      'find_dups',
      'photos',
      'judging_cand',
      'judging_fish',
      'fish_judge',
      'fetch_approved',
      'studies/q316/fit',
      'studies/q316/run'
    ]
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

// A guarded tool killed by its original PID takes its run down with it (the wrapper and the worker),
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

// The disk is checked again when the slot is given, not only before the wait.
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

// An option's value given as the next argument is not a test file (taken for one, it would keep the default list out).
test('tests/run.js: a space-separated option value is not taken for a file', () => {
  const args = require('./run.js'),
    n = args([]).length - 1; // the fast tier's files
  assert.strictEqual(args(['--test-name-pattern', 'parts:']).length, n + 3);
  assert.strictEqual(args(['--test-reporter', 'spec']).length, n + 3);
  assert.deepStrictEqual(args(['--test-reporter', 'spec', 'tests/a.test.js']), ['--test', '--test-reporter', 'spec', 'tests/a.test.js']);
});

// The queue (REE-206): waiters are served in arrival order, whatever their poll rate; a dead waiter's ticket is skipped.
// (The tests above, with no ticket in the directory but their own, show a queue of one changes nothing.)
const tickets = env => (fs.existsSync(env.SMOKE_SLOT_DIR) ? fs.readdirSync(env.SMOKE_SLOT_DIR).filter(n => n.startsWith('ticket-')) : []);
const until = async (ok, what, ms = 10e3) => {
  for (const t = Date.now(); !ok(); await new Promise(r => setTimeout(r, 20)))
    if (Date.now() - t > ms) throw new Error('timed out waiting for ' + what);
};
// The processes the queue tests start, killed when each test ends (a failed test never leaves one waiting).
const spawned = [],
  reapAll = () => spawned.splice(0).forEach(p => p.exitCode === null && p.signalCode === null && p.kill('SIGKILL'));
// A process that holds the only slot until its stdin closes.
const holding = env => {
  const h = spawn(
    process.execPath,
    [
      '-e',
      `require(${JSON.stringify(SLOT)})('holder').then(() => { console.log('held'); process.stdin.resume(); process.stdin.on('end', () => process.exit(0)); });`
    ],
    {env, stdio: ['pipe', 'pipe', 'inherit']}
  );
  spawned.push(h);
  return new Promise(r => h.stdout.once('data', () => r(h)));
};
// A waiter that logs its name once it holds the slot, keeps it a moment, then ends (giving it back).
const waiter = (env, name, log, poll) => {
  const w = spawn(
    process.execPath,
    [
      '-e',
      `require(${JSON.stringify(SLOT)})(${JSON.stringify(name)}).then(() => {
         require('fs').appendFileSync(${JSON.stringify(log)}, ${JSON.stringify(name + '\n')});
         setTimeout(() => process.exit(0), 150);
       });`
    ],
    {env: {...env, SMOKE_SLOT_POLL: String(poll)}, stdio: 'ignore'}
  );
  spawned.push(w);
  return w;
};

test('slot: three waiters get the slot in arrival order, the fastest poller last', async () => {
  const {dir, env, slots} = sandbox(),
    log = path.join(dir, 'log');
  try {
    const holder = await holding(env),
      kids = [];
    // A polls slowest and C fastest: without the queue, C would take the freed slot first.
    for (const [name, poll, n] of [
      ['A', 300, 1],
      ['B', 100, 2],
      ['C', 20, 3]
    ]) {
      kids.push(waiter(env, name, log, poll));
      await until(() => tickets(env).length === n, `${name}'s ticket`);
    }
    holder.stdin.end();
    await Promise.all(kids.map(k => new Promise(r => k.on('exit', r))));
    assert.deepStrictEqual(fs.readFileSync(log, 'utf8').trim().split('\n'), ['A', 'B', 'C']);
    assert.deepStrictEqual(slots(), [], 'every slot and ticket given back');
  } finally {
    reapAll();
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test("slot: a dead waiter's ticket is skipped and taken back; a live older one keeps its turn", async () => {
  const {dir, env, slots} = sandbox(),
    S = env.SMOKE_SLOT_DIR,
    la = os.loadavg,
    take = ms =>
      withEnv({CI: undefined, SMOKE_SLOT_DIR: S, SMOKE_SLOTS: '1', SMOKE_SLOT_POLL: '50', SLOT_MIN_FREE_GB: '0'}, () =>
        fresh()('t', {timeout: ms})
      );
  fs.mkdirSync(S, {recursive: true});
  os.loadavg = () => [0, 0, 0];
  try {
    const old = path.join(S, 'ticket-00000000000001-0999999999-aaaaaaaa');
    fs.writeFileSync(old, '999999999 1 someone 2026-01-01T00:00:00Z gone\n'); // a waiter that is gone
    const free = await take(3000);
    assert.ok(free, 'the dead ticket does not hold the queue');
    assert.ok(!fs.existsSync(old), 'and it is taken back');
    free();
    assert.deepStrictEqual(slots(), []);
    // A live waiter's older ticket (this test process's own record) keeps the free slot for it.
    const stat = fs.existsSync('/proc/self/stat') ? fs.readFileSync('/proc/self/stat', 'utf8').split(') ').pop().split(' ')[19] : '-';
    fs.writeFileSync(old, `${process.pid} ${stat} someone 2026-01-01T00:00:00Z alive\n`);
    assert.strictEqual(await take(300), null, 'a later waiter waits behind a live older ticket');
    assert.deepStrictEqual(slots(), [path.basename(old)], 'the later waiter dropped its own ticket when it gave up');
  } finally {
    os.loadavg = la;
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('slot: when the oldest waiter dies while waiting, the next one gets the slot (no deadlock)', async () => {
  const {dir, env, slots} = sandbox(),
    log = path.join(dir, 'log');
  try {
    const holder = await holding(env),
      a = waiter(env, 'A', log, 50);
    await until(() => tickets(env).length === 1, "A's ticket");
    const b = waiter(env, 'B', log, 50);
    await until(() => tickets(env).length === 2, "B's ticket");
    a.kill('SIGKILL');
    await new Promise(r => a.on('exit', r));
    holder.stdin.end();
    await new Promise(r => b.on('exit', r));
    assert.deepStrictEqual(fs.readFileSync(log, 'utf8').trim().split('\n'), ['B']);
    assert.deepStrictEqual(slots(), [], "A's ticket taken back, B's slot given back");
  } finally {
    reapAll();
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test("slot: a holder's children never queue, even behind an older live ticket (nested holders, REEFID_SLOT)", async () => {
  const {dir, env, slots} = sandbox();
  try {
    const code = `const fs = require('fs'), path = require('path'), slot = require(${JSON.stringify(SLOT)});
      const S = process.env.SMOKE_SLOT_DIR, t = path.join(S, 'ticket-00000000000001-0000000001-aaaaaaaa');
      const st = fs.existsSync('/proc/self/stat') ? fs.readFileSync('/proc/self/stat', 'utf8').split(') ').pop().split(' ')[19] : '-';
      fs.writeFileSync(t, process.pid + ' ' + st + ' someone 2026-01-01T00:00:00Z older\\n');
      slot('inner', {timeout: 300}).then(free => {
        const names = fs.readdirSync(S).filter(n => n.startsWith('ticket-'));
        fs.unlinkSync(t);
        console.log(JSON.stringify({nested: !!free, names}));
      });`;
    const r = await exec(process.execPath, [SLOT, '--name', 'outer', '--', process.execPath, '-e', code], env),
      o = JSON.parse(r.out);
    assert.strictEqual(r.code, 0);
    assert.ok(o.nested, 'the nested slot() resolves at once');
    assert.deepStrictEqual(o.names, ['ticket-00000000000001-0000000001-aaaaaaaa'], 'and takes no ticket');
    assert.deepStrictEqual(slots(), []);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

// No queue without a usable directory: a slots path that is a file runs the command without a slot, as before.
test('node tests/slot.js -- cmd: a slots directory that cannot be used runs the command without a slot, never waits', async () => {
  const {dir, env} = sandbox(),
    file = path.join(dir, 'not-a-dir');
  fs.writeFileSync(file, '');
  try {
    const r = await exec(process.execPath, [SLOT, '--', process.execPath, '-e', "console.log('ran')"], {...env, SMOKE_SLOT_DIR: file});
    assert.deepStrictEqual([r.code, r.out.trim()], [0, 'ran']);
    assert.match(r.err, /running without one/);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

// REE-212: what killed takers left (`.hold-<pid>`, `.new-*`) is removed once its process is gone; live ones are kept.
test('slot: sweep() removes dead .hold-<pid> locks and .new-* temp files, keeps live ones, in a temp directory only', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slot-sweep-')),
    S = path.join(dir, 's'),
    stat = fs.existsSync('/proc/self/stat') ? fs.readFileSync('/proc/self/stat', 'utf8').split(') ').pop().split(' ')[19] : '-',
    live = `${process.pid} ${stat} someone 2026-01-01T00:00:00Z alive\n`,
    dead = '999999999 1 someone 2026-01-01T00:00:00Z gone\n',
    put = (n, text) => fs.writeFileSync(path.join(S, n), text),
    has = n => fs.existsSync(path.join(S, n));
  fs.mkdirSync(S);
  try {
    put('.hold-999999999', dead);
    put('.hold-' + process.pid, live);
    put('.new-999999999-hold-abc', dead);
    put('.new-999999999-0-abc', ''); // a taker killed before it wrote anything
    put('.new-' + process.pid + '-hold-abc', live);
    put('slot0', live); // a slot is never the sweep's business
    put('ticket-00000000000001-0999999999-aaaaaaaa', dead); // nor a ticket (the queue skips those)
    put('stranger.txt', 'not ours');
    fs.mkdirSync(path.join(S, '.hold-999999997.reap')); // a crashed reaper's directory, recent: left for now
    const old = new Date(Date.now() - 15 * 60e3);
    fs.mkdirSync(path.join(S, '.hold-1.reap'));
    fs.utimesSync(path.join(S, '.hold-1.reap'), old, old);
    // A live PID's temp file left for minutes is a reused PID's: taken back.
    put('.new-' + process.pid + '-old-abc', live);
    fs.utimesSync(path.join(S, '.new-' + process.pid + '-old-abc'), old, old);
    await withEnv({CI: undefined, SMOKE_SLOT_DIR: S}, async () => fresh().sweep());
    assert.deepStrictEqual(fs.readdirSync(S).sort(), [
      '.hold-' + process.pid,
      '.hold-999999997.reap',
      '.new-' + process.pid + '-hold-abc',
      'slot0',
      'stranger.txt',
      'ticket-00000000000001-0999999999-aaaaaaaa'
    ]);
    // A directory that is missing, or a file, is tolerated.
    await withEnv({SMOKE_SLOT_DIR: path.join(dir, 'missing')}, async () => fresh().sweep());
    await withEnv({SMOKE_SLOT_DIR: path.join(S, 'stranger.txt')}, async () => fresh().sweep());
    // slot() sweeps on its way in, and still takes the slot.
    put('.hold-999999998', dead);
    fs.unlinkSync(path.join(S, 'slot0')); // the live record above held the only slot
    const la = os.loadavg;
    os.loadavg = () => [0, 0, 0];
    try {
      const free = await withEnv({CI: undefined, SMOKE_SLOT_DIR: S, SMOKE_SLOTS: '1', SLOT_MIN_FREE_GB: '0'}, () =>
        fresh()('t', {timeout: 3000})
      );
      assert.ok(free, 'the slot is taken');
      assert.ok(!has('.hold-999999998'), 'and the dead lock is gone');
      assert.ok(has('.hold-' + process.pid), 'a live one stays');
      free();
    } finally {
      os.loadavg = la;
    }
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
