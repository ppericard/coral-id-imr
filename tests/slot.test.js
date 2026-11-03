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
      {env: {...process.env, ...env, CI: ''}, stdio: ['ignore', 'pipe', 'pipe']}
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
