require('./slot.js').testGuard();
// tools/queue: the scripts parse, and none names a session scratchpad or writes into the repo.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process');

const DIR = path.join(__dirname, '..', 'tools', 'queue'),
  files = fs.readdirSync(DIR),
  sh = files.filter(f => f.endsWith('.sh')),
  py = files.filter(f => f.endsWith('.py'));

test('the folder holds the scripts and the Codex template', () => {
  for (const f of ['lib.sh', 'nightq.sh', 'assignver.sh', 'mainver.py', 'codex.md', 'README.md']) assert.ok(files.includes(f), f);
  assert.match(fs.readFileSync(path.join(DIR, 'codex.md'), 'utf8'), /^@codex review/);
});

test('every shell script parses (bash -n)', () => {
  for (const f of sh) {
    const r = spawnSync('bash', ['-n', path.join(DIR, f)], {encoding: 'utf8'});
    assert.strictEqual(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('every Python script compiles', () => {
  const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'queue-pyc-'));
  try {
    for (const f of py) {
      const r = spawnSync('python3', ['-m', 'py_compile', path.join(DIR, f)], {
        encoding: 'utf8',
        env: {...process.env, PYTHONPYCACHEPREFIX: cache}
      });
      assert.strictEqual(r.status, 0, `${f}: ${r.stderr}`);
    }
  } finally {
    fs.rmSync(cache, {recursive: true, force: true});
  }
});

test('no script names a session scratchpad path; state goes to QUEUE_DIR', () => {
  for (const f of [...sh, ...py, 'codex.md', 'README.md']) {
    const t = fs.readFileSync(path.join(DIR, f), 'utf8');
    assert.doesNotMatch(t, /scratchpad|\/tmp\/claude|\/home\/user\//i, f);
  }
  assert.match(fs.readFileSync(path.join(DIR, 'lib.sh'), 'utf8'), /QUEUE_DIR=\$\{QUEUE_DIR:-\$HOME\/\.cache\/reefid-queue\}/);
});

test('the assignver commit names no session', () => {
  const t = fs.readFileSync(path.join(DIR, 'assignver.sh'), 'utf8');
  assert.doesNotMatch(t, /Claude-Session: https|Co-Authored-By: Claude/);
  assert.match(t, /QUEUE_TRAILERS/);
});
