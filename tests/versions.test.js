// tools/check_versions.py --fix in a throwaway repository: node --test tests/
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync, spawnSync} = require('child_process');

const ROOT = path.join(__dirname, '..'),
  TOOL = path.join(ROOT, 'tools', 'check_versions.py'),
  FILES = ['index.html', 'admin.html', 'app.js', 'sw.js', 'proto/lab.js'];

// A copy of the files the tool reads, committed: the base the tool compares with.
const repo = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'versions-'));
  fs.mkdirSync(path.join(d, 'proto'));
  for (const f of FILES) fs.copyFileSync(path.join(ROOT, f), path.join(d, f));
  const git = (...a) => execFileSync('git', a, {cwd: d, stdio: 'pipe'});
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  return d;
};
const run = (d, ...a) => spawnSync('python3', [TOOL, '--base', 'HEAD', ...a], {cwd: d, encoding: 'utf-8'});
const swLab = d => +fs.readFileSync(path.join(d, 'sw.js'), 'utf-8').match(/`proto\/\$\{f\}\.js\?v=(\d+)`/)[1];

// A sw.js conflict resolved by taking main's copy leaves LAB_V already above the base and the sw.js Lab list on the
// older number: --fix only reported it ("sw.js Lab files use v=X, LAB_V is Y") and never rewrote the list
// (coordinator, 2026-11-04).
test('--fix moves the sw.js Lab list to a LAB_V already above the base', () => {
  const d = repo();
  try {
    const lab = path.join(d, 'proto', 'lab.js'),
      v = +fs.readFileSync(lab, 'utf-8').match(/const LAB_V = (\d+);/)[1];
    fs.writeFileSync(lab, fs.readFileSync(lab, 'utf-8').replace(/const LAB_V = \d+;/, `const LAB_V = ${v + 1};`));
    assert.match(run(d).stdout, /sw\.js Lab files use v=\d+, LAB_V is \d+/);
    run(d, '--fix');
    assert.strictEqual(swLab(d), v + 1);
    const again = run(d);
    assert.strictEqual(again.status, 0, again.stdout);
  } finally {
    fs.rmSync(d, {recursive: true, force: true});
  }
});
