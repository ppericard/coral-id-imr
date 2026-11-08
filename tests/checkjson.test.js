'use strict';
// tools/check_json.py (repo hygiene audit, 2026-11-08): every JSON file git tracks parses, checked on every pull request
// and by Deploy Pages before it publishes, so a broken bot or Publish commit to main fails the deploy and the last good
// site stays live.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const yml = f => fs.readFileSync(path.join(ROOT, '.github', 'workflows', f), 'utf8');

test('check_json.py names a broken file and passes the good ones', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkjson-'));
  try {
    fs.writeFileSync(path.join(dir, 'good.json'), '{"a": [1, 2]}\n');
    fs.writeFileSync(path.join(dir, 'bad.json'), '{"a": [1, 2}\n');
    fs.writeFileSync(path.join(dir, 'empty.json'), '');
    const out = execFileSync(
      'python3',
      [
        '-c',
        'import json, sys; sys.path.insert(0, sys.argv[1]); import check_json; print(json.dumps(check_json.bad_files(sys.argv[2:])))',
        path.join(ROOT, 'tools'),
        ...['good.json', 'bad.json', 'empty.json'].map(f => path.join(dir, f))
      ],
      {encoding: 'utf8'}
    );
    const bad = JSON.parse(out).map(b => path.basename(b.split(':')[0]));
    assert.deepStrictEqual(bad, ['bad.json', 'empty.json']);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('every JSON file tracked today parses', () => {
  execFileSync('python3', [path.join(ROOT, 'tools', 'check_json.py')], {encoding: 'utf8'});
});

test('Deploy Pages checks the data before it uploads, and Checks parses every JSON and checks tools/*.js', () => {
  const pages = yml('pages.yml'),
    up = pages.indexOf('actions/upload-pages-artifact');
  for (const cmd of ['python3 tools/check_json.py', 'python3 tools/datajson.py --check']) {
    const at = pages.indexOf(cmd);
    assert.ok(at > 0 && at < up, 'pages.yml: "' + cmd + '" must run before the upload');
  }
  const checks = yml('checks.yml');
  assert.match(checks, /python3 tools\/check_json\.py/, 'checks.yml: the JSON parse covers every tracked file');
  assert.match(checks, /for f in [^\n]*\btools\/\*\.js\b[^\n]*; do node --check/, 'checks.yml: node --check covers tools/*.js');
});
