// Version numbers stamped at deploy (tools/stamp_versions.py) and checked for consistency (tools/check_versions.py), on
// throwaway copies of the site: node --test tests/
const test = require('node:test'),
  assert = require('node:assert'),
  crypto = require('crypto'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process');

const ROOT = path.join(__dirname, '..'),
  STAMP = path.join(ROOT, 'tools', 'stamp_versions.py'),
  CHECK = path.join(ROOT, 'tools', 'check_versions.py');

// What the deploy publishes and the stamper reads: the files at the root, the Lab and the fonts (no photos).
const copy = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-'));
  for (const f of fs.readdirSync(ROOT)) {
    const p = path.join(ROOT, f);
    if (fs.statSync(p).isFile()) fs.copyFileSync(p, path.join(d, f));
  }
  for (const dir of ['proto', 'fonts']) fs.cpSync(path.join(ROOT, dir), path.join(d, dir), {recursive: true});
  // The players' curation, which the deploy writes before the stamps (pages.yml, tools/curplay.py).
  assert.strictEqual(spawnSync('python3', [path.join(ROOT, 'tools', 'curplay.py'), d]).status, 0);
  return d;
};
const run = (tool, ...a) => spawnSync('python3', [tool, ...a], {cwd: ROOT, encoding: 'utf-8'});
const stamp = (d, build = '7') => {
  const r = run(STAMP, d, '--build', build);
  assert.strictEqual(r.status, 0, r.stderr);
  return Object.fromEntries(
    r.stdout
      .trim()
      .split('\n')
      .map(l => l.split('\t'))
  );
};
const read = (d, f) => fs.readFileSync(path.join(d, f), 'utf-8');
const sha = (d, f) =>
  crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(d, f)))
    .digest('hex')
    .slice(0, 10);
const tree = d =>
  Object.fromEntries(
    [
      ...fs.readdirSync(d).filter(f => fs.statSync(path.join(d, f)).isFile()),
      ...fs.readdirSync(path.join(d, 'proto')).map(f => 'proto/' + f)
    ].map(f => [f, read(d, f)])
  );

test('the source is consistent with itself (check_versions, no number to bump)', () => {
  const r = run(CHECK);
  assert.strictEqual(r.status, 0, r.stdout);
});

test('stamped: every ?v= is the hash of the file it names, consistent, idempotent; the build is in the pages', () => {
  const d = copy();
  try {
    const m = stamp(d);
    assert.strictEqual(run(CHECK, '--dir', d).status, 0, run(CHECK, '--dir', d).stdout);
    for (const f of ['app.js', 'core.js', 'data.json', 'quiz.js', 'proto/lab.js']) {
      assert.strictEqual(m[f], sha(d, f), f);
      assert.ok(read(d, 'index.html').includes(`${f}?v=${m[f]}`) || read(d, 'app.js').includes(`${f}?v=${m[f]}`), f + ' referenced');
    }
    // data.json is named by app.js: app.js's hash is of its stamped text.
    assert.ok(read(d, 'app.js').includes(`data.json?v=${m['data.json']}`));
    assert.match(read(d, 'proto/lab.js'), new RegExp(`const LAB_V = '${m.LAB_V}';`));
    assert.ok(read(d, 'sw.js').includes(`proto/\${f}.js?v=${m.LAB_V}\``));
    assert.ok(read(d, 'sw.js').includes(`const V = 'reefid-shell-v${m['sw V']}';`));
    assert.ok(read(d, 'index.html').includes('<meta name="build" content="7">'));
    assert.ok(read(d, 'admin.html').includes('<meta name="build" content="7">'));
    // Stamping a stamped copy changes nothing.
    const before = tree(d);
    stamp(d);
    assert.deepStrictEqual(tree(d), before);
  } finally {
    fs.rmSync(d, {recursive: true, force: true});
  }
});

test('a changed file changes its own ?v= and the cache name V, nothing else; a Lab file LAB_V; an admin file V; a build alone nothing', () => {
  const a = copy(),
    b = copy(),
    c = copy(),
    e = copy();
  try {
    const A = stamp(a);
    fs.appendFileSync(path.join(b, 'tips.js'), '\n// changed\n');
    const B = stamp(b);
    assert.notStrictEqual(B['tips.js'], A['tips.js']);
    assert.notStrictEqual(B['sw V'], A['sw V']);
    for (const f of ['app.js', 'quiz.js', 'core.js', 'data.json']) assert.strictEqual(B[f], A[f], f);
    assert.strictEqual(B.LAB_V, A.LAB_V);
    fs.appendFileSync(path.join(c, 'proto', 'zoom.js'), '\n// changed\n');
    const C = stamp(c);
    assert.notStrictEqual(C.LAB_V, A.LAB_V);
    assert.notStrictEqual(C['sw V'], A['sw V']);
    assert.strictEqual(C['app.js'], A['app.js']);
    // An admin-only change still makes a new worker, the open admin page's signal to reload (Codex review #499).
    fs.appendFileSync(path.join(e, 'admin.js'), '\n// changed\n');
    // Another build number only: the shell is the same, so is its cache name (a deploy never empties it for nothing).
    const E = stamp(e);
    assert.notStrictEqual(E['sw V'], A['sw V']);
    assert.notStrictEqual(E['admin.js'], A['admin.js']);
    assert.strictEqual(E['app.js'], A['app.js']);
    const f = copy();
    try {
      const F = stamp(f, '8');
      assert.strictEqual(F['sw V'], A['sw V']);
      assert.ok(read(f, 'index.html').includes('<meta name="build" content="8">'));
    } finally {
      fs.rmSync(f, {recursive: true, force: true});
    }
  } finally {
    [a, b, c, e].forEach(d => fs.rmSync(d, {recursive: true, force: true}));
  }
});

test('a changed data file changes the hash of the script that names it', () => {
  const a = copy(),
    b = copy();
  try {
    const A = stamp(a);
    const j = JSON.parse(read(b, 'picks.json'));
    fs.writeFileSync(path.join(b, 'picks.json'), JSON.stringify({...j, _test: 1}));
    const B = stamp(b);
    assert.notStrictEqual(B['picks.json'], A['picks.json']);
    assert.notStrictEqual(B['app.js'], A['app.js']);
  } finally {
    [a, b].forEach(d => fs.rmSync(d, {recursive: true, force: true}));
  }
});

test('a reference to no file fails the stamp; references that disagree fail the check', () => {
  const d = copy();
  try {
    fs.writeFileSync(
      path.join(d, 'index.html'),
      read(d, 'index.html').replace('</head>', '<script src="nothere.js?v=1"></script>\n</head>')
    );
    const r = run(STAMP, d);
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /names no file: nothere\.js/);
  } finally {
    fs.rmSync(d, {recursive: true, force: true});
  }
  const e = copy();
  try {
    fs.writeFileSync(path.join(e, 'admin.html'), read(e, 'admin.html').replace(/core\.js\?v=\d+/, 'core.js?v=999'));
    const r = run(CHECK, '--dir', e);
    assert.strictEqual(r.status, 1);
    assert.match(r.stdout, /core\.js: different \?v/);
  } finally {
    fs.rmSync(e, {recursive: true, force: true});
  }
});
