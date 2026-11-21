'use strict';
require('./slot.js').testGuard();
// tools/brief.py says whether the local origin/main ref is the remote's main (REE-180, the integrator continuity study E.2):
// an old ref with a newer remote is said and never called current; an unreachable remote is "remote freshness unknown" and
// the hook still exits 0; local work and the ref itself are never touched. "origin" is a local bare repository (or a socket
// that never answers), never the network (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  net = require('net'),
  os = require('os'),
  path = require('path'),
  {execFileSync, spawn, spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..'),
  FIX = 'git fetch origin +refs/heads/main:refs/remotes/origin/main';

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 't',
  GIT_AUTHOR_EMAIL: 't@example.com',
  GIT_COMMITTER_NAME: 't',
  GIT_COMMITTER_EMAIL: 't@example.com'
};
const git = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], {env: gitEnv, encoding: 'utf-8'}).trim();

// An origin with one commit on main, a clone that has fetched it (so origin/main exists, with a reflog), and `advance()`
// that adds a commit to the origin behind the clone's back.
function setup() {
  const top = fs.mkdtempSync(path.join(os.tmpdir(), 'fresh-')),
    src = path.join(top, 'src'),
    origin = path.join(top, 'origin.git'),
    clone = path.join(top, 'clone');
  fs.mkdirSync(src);
  git(src, 'init', '-q', '-b', 'main');
  fs.mkdirSync(path.join(src, 'docs'));
  fs.writeFileSync(path.join(src, 'AGENTS.md'), '# AGENTS.md\n');
  fs.writeFileSync(path.join(src, 'docs', 'STATUS.md'), '# STATUS\n');
  git(src, 'add', '.');
  git(src, 'commit', '-q', '-m', 'one');
  execFileSync('git', ['clone', '-q', '--bare', src, origin]);
  execFileSync('git', ['clone', '-q', 'file://' + origin, clone], {env: gitEnv});
  // `date`: the new commit's date (a commit made days before the fetch that brings it).
  const advance = date => {
    fs.appendFileSync(path.join(src, 'AGENTS.md'), 'more\n');
    execFileSync('git', ['-C', src, 'commit', '-q', '-am', 'next'], {
      env: date ? {...gitEnv, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date} : gitEnv
    });
    git(src, 'push', '-q', origin, 'main');
    return git(src, 'rev-parse', 'HEAD');
  };
  return {top, origin, clone, advance, first: git(clone, 'rev-parse', 'refs/remotes/origin/main')};
}

// The environment of a hook: no network, no gh (rule D1).
const envOf = clone => ({
  ...process.env,
  CLAUDE_PROJECT_DIR: clone,
  HTTPS_PROXY: 'http://127.0.0.1:9',
  https_proxy: 'http://127.0.0.1:9',
  http_proxy: '',
  HTTP_PROXY: '',
  PATH: '/usr/bin:/bin'
});

// brief.freshness(clone) and fresh_line() of it, as JSON, from the checkout's own brief.py (a function under test).
const PROBE = [
  'import json, sys',
  'sys.path.insert(0, "tools")',
  'import brief',
  'if len(sys.argv) > 2: brief.LS_LIMIT = float(sys.argv[2])',
  'f = brief.freshness(sys.argv[1])',
  'print(json.dumps({"f": f, "short": brief.fresh_line(f, True), "full": brief.fresh_line(f, False)}))'
].join('\n');
const probe = (clone, limit) => {
  const r = spawnSync('python3', ['-B', '-c', PROBE, clone, ...(limit ? [String(limit)] : [])], {
    cwd: ROOT,
    env: envOf(clone),
    encoding: 'utf-8',
    timeout: 20000
  });
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

// The hook's way: main's copy fed on stdin in isolated mode, from the checkout's directory.
const hook = clone => {
  const r = spawnSync('python3', ['-I', '-', '--short'], {
    input: fs.readFileSync(path.join(ROOT, 'tools', 'brief.py'), 'utf-8'),
    env: envOf(clone),
    cwd: '/',
    encoding: 'utf-8',
    timeout: 20000
  });
  assert.strictEqual(r.status, 0, 'the hook never fails on the network: ' + r.stderr);
  return r.stdout.trim().split('\n');
};

test('local origin/main is the remote main: said so, with the sha', () => {
  const s = setup();
  const {f, short, full} = probe(s.clone);
  assert.strictEqual(f.remote, s.first);
  assert.strictEqual(f.local, s.first);
  assert.strictEqual(f.why, null);
  assert.ok(short.includes(s.first.slice(0, 7)) && /= remote main/.test(short), short);
  assert.match(full, /^Remote freshness: local origin\/main \w{7} = remote main/);
  assert.ok(!/⚠/.test(short + full));
});

test('an old local ref with a newer remote is never called current: both shas, the stale wording, the fix', () => {
  const s = setup();
  const newer = s.advance();
  const {f, short, full} = probe(s.clone);
  assert.strictEqual(f.local, s.first);
  assert.strictEqual(f.remote, newer);
  assert.strictEqual(f.behind, null, 'the remote commit is not in this clone: no count to give');
  for (const t of [short, full]) {
    assert.ok(t.startsWith('⚠ local origin/main ' + s.first.slice(0, 7) + ' differs from remote main ' + newer.slice(0, 7)), t);
    assert.ok(t.endsWith(FIX), t);
    assert.ok(!/= remote main|up to date|current/.test(t), t);
  }
  // With the objects here (fetched by URL: the ref stays where it was) the commits are counted.
  git(s.clone, 'fetch', '-q', 'file://' + s.origin, 'refs/heads/main');
  assert.strictEqual(git(s.clone, 'rev-parse', 'refs/remotes/origin/main'), s.first, 'the ref did not move');
  const c = probe(s.clone);
  assert.strictEqual(c.f.behind, 1);
  assert.match(c.short, /^⚠ local origin\/main \w{7} 1 commit behind remote main \w{7}/);
  s.advance();
  git(s.clone, 'fetch', '-q', 'file://' + s.origin, 'refs/heads/main');
  assert.match(probe(s.clone).short, / 2 commits behind /);
  // A ref a fetch moved has a reflog: when it last moved is said.
  git(s.clone, 'fetch', '-q', 'origin', '+refs/heads/main:refs/remotes/origin/main');
  assert.match(probe(s.clone).short, /^origin\/main \w{7} = remote main$/);
  assert.match(probe(s.clone).full, /ref last moved \d+[mhd] ago$/);
});

// Codex, #1363: the reflog's own time, never the date of the commit a fetch brought (%ct of a reflog entry is the commit's).
test('a ref a fetch just moved to an old commit moved minutes ago, not days', () => {
  const s = setup();
  const old = s.advance('2020-01-01T00:00:00Z');
  git(s.clone, 'fetch', '-q', 'origin', '+refs/heads/main:refs/remotes/origin/main');
  const {f, full} = probe(s.clone);
  assert.strictEqual(f.local, old);
  assert.ok(Math.abs(f.moved - Date.now() / 1000) < 120, 'moved: ' + f.moved);
  assert.match(full, /= remote main .*; ref last moved [0-2]m ago$/);
});

test('remote unavailable: "remote freshness unknown", the local ref and when it moved, exit 0', () => {
  const s = setup();
  git(s.clone, 'remote', 'set-url', 'origin', path.join(s.top, 'gone.git'));
  const {f, short, full} = probe(s.clone);
  assert.strictEqual(f.remote, null);
  assert.ok(f.why, 'the reason is kept');
  for (const t of [short, full]) {
    // A fresh clone has no reflog for the ref: the age of its commit stands in (a fetched ref: "ref last moved ...").
    assert.match(
      t,
      /^remote freshness unknown \(.+\): local origin\/main \w{7}, (ref last moved \d+[mhd] ago|no ref reflog, its commit is \d+[mhd] old)$/
    );
    assert.ok(t.includes(s.first.slice(0, 7)));
    assert.ok(!/= remote main|up to date|current/.test(t), t);
  }
  const out = hook(s.clone);
  assert.ok(out.length <= 5, '--short: 5 lines at most');
  assert.match(out[0], /^Manila .* · remote freshness unknown \(/, 'on the time line, which the cut never drops');
});

test('a remote that never answers is cut at the limit, not waited for', async () => {
  const s = setup();
  const server = net.createServer(sock => sock.on('error', () => {}));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try {
    git(s.clone, 'remote', 'set-url', 'origin', 'http://127.0.0.1:' + server.address().port + '/x.git');
    const t = Date.now();
    const out = await new Promise(resolve => {
      const p = spawn('python3', ['-B', '-c', PROBE, s.clone, '0.7'], {cwd: ROOT, env: envOf(s.clone)});
      let stdout = '';
      p.stdout.on('data', b => (stdout += b));
      p.on('close', status => resolve({status, stdout}));
    });
    assert.strictEqual(out.status, 0);
    assert.ok(Date.now() - t < 5000, 'bounded: ' + (Date.now() - t) + ' ms');
    const {f, short} = JSON.parse(out.stdout);
    assert.match(f.why, /^no answer in 0\.7 s$/);
    assert.match(short, /^remote freshness unknown \(no answer in 0\.7 s\)/);
  } finally {
    server.close();
  }
});

// The hook with the real limit: an origin that never answers costs the 3 s limit, inside the brief's 5 s deadline.
test('the hook with an origin that never answers still ends in time, exit 0, freshness unknown on the time line', async () => {
  const s = setup();
  const server = net.createServer(sock => sock.on('error', () => {}));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try {
    git(s.clone, 'remote', 'set-url', 'origin', 'http://127.0.0.1:' + server.address().port + '/x.git');
    const t = Date.now();
    const out = await new Promise(resolve => {
      const p = spawn('python3', ['-I', '-', '--short'], {cwd: '/', env: envOf(s.clone)});
      let stdout = '';
      p.stdout.on('data', b => (stdout += b));
      p.on('close', status => resolve({status, stdout}));
      p.stdin.end(fs.readFileSync(path.join(ROOT, 'tools', 'brief.py'), 'utf-8'));
    });
    assert.strictEqual(out.status, 0);
    assert.ok(Date.now() - t < 8000, 'bounded: ' + (Date.now() - t) + ' ms');
    const lines = out.stdout.trim().split('\n');
    assert.ok(lines.length <= 5);
    assert.match(lines[0], /^Manila .* · remote freshness unknown \(no answer in [23](\.\d)? s\)/);
  } finally {
    server.close();
  }
});

test('the brief changes nothing: uncommitted work, the index, HEAD and the ref are as they were', () => {
  const s = setup();
  s.advance();
  const file = path.join(s.clone, 'AGENTS.md'),
    staged = path.join(s.clone, 'docs', 'STATUS.md'),
    loose = path.join(s.clone, 'notes.txt');
  fs.appendFileSync(file, 'my local edit\n');
  fs.appendFileSync(staged, 'staged edit\n');
  git(s.clone, 'add', 'docs/STATUS.md');
  fs.writeFileSync(loose, 'untracked\n');
  const snap = () => ({
    status: git(s.clone, 'status', '--porcelain'),
    head: git(s.clone, 'rev-parse', 'HEAD'),
    ref: git(s.clone, 'rev-parse', 'refs/remotes/origin/main'),
    files: [file, staged, loose].map(f => fs.readFileSync(f, 'utf-8')),
    diff: git(s.clone, 'diff', 'HEAD'),
    refs: git(s.clone, 'for-each-ref')
  });
  const before = snap();
  const out = hook(s.clone);
  assert.deepStrictEqual(snap(), before);
  assert.ok(out.length <= 5, '--short: 5 lines at most');
  assert.match(out[0], /⚠ local origin\/main \w{7} differs from remote main \w{7}/, 'the hook says the ref is old');
  assert.ok(out[0].includes(FIX));
  assert.ok(!fs.existsSync(path.join(s.clone, '.git', 'FETCH_HEAD')), 'nothing was fetched');
});

test('--time (the UserPromptSubmit hook) stays offline: no freshness check', () => {
  const src = fs.readFileSync(path.join(ROOT, 'tools', 'brief.py'), 'utf-8');
  const main = src.slice(src.indexOf('def main():'));
  assert.ok(main.indexOf('freshness') === -1 && main.indexOf('if a.time:') < main.indexOf('brief(a.short'), 'main(): --time returns first');
  assert.ok(!/ls_remote_main|freshness\(/.test(src.slice(src.indexOf('def time_line'), src.indexOf('def night_due'))), 'time_line');
});
