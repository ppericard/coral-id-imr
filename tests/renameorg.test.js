'use strict';
require('./slot.js').testGuard();
// tools/rename_app.py writes the organisation's bare words (ORG.short, ORG.name) into the static pages, as it writes the
// app's name (rule W21). Run on a throwaway copy of the pages, so the real files never change.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const PAGES = ['index.html', 'privacy.html', 'admin.html', 'tools/og/og.html'];
const read = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8');

// A throwaway git repository holding the tool, core.js (with ORG replaced when `org` is given) and the pages.
function copy(org) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'renameorg-'));
  for (const f of ['tools/rename_app.py', 'core.js', ...PAGES]) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), {recursive: true});
    let s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (f === 'core.js' && org) s = s.replace(/const ORG = \{[^}]*\}/, 'const ORG = ' + org);
    fs.writeFileSync(path.join(dir, f), s);
  }
  execFileSync('git', ['init', '-q'], {cwd: dir});
  execFileSync('git', ['add', '.'], {cwd: dir});
  return dir;
}
const run = (dir, ...args) => execFileSync('python3', ['tools/rename_app.py', ...args], {cwd: dir, encoding: 'utf8'});

test('with the IMR edition, the pages already say what ORG says: nothing to write', () => {
  const dir = copy();
  try {
    assert.match(run(dir, '--check'), /nothing left/);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('a fork changes ORG once and the pages follow, whole words only, then a second run changes nothing', () => {
  const dir = copy("{short: 'ABC', name: 'Acme & Co', app: 'ABC Reef ID', appShort: 'Reef ID'}");
  try {
    const before = PAGES.map(f => read(dir, f));
    const old = ['--from', 'IMR Reef ID', '--from-short', 'IMR', '--from-name', 'Institute for Marine Research'];
    assert.throws(() => run(dir, '--check'), 'the pages still carry the earlier organisation');
    run(dir, ...old);
    const after = PAGES.map(f => read(dir, f));
    const [index, privacy] = after;
    assert.match(index, /from the ABC survey lists/);
    assert.match(index, /not on the ABC list/);
    assert.match(index, /aria-label="Non-ABC genera"/);
    assert.match(privacy, /the Acme &amp; Co \(ABC\), Dauin/);
    assert.match(privacy, /ABC's trainers/);
    for (const [i, f] of PAGES.entries()) {
      assert.doesNotMatch(after[i], /\bIMR\b/, f + ' still says IMR');
      assert.doesNotMatch(after[i], /Institute for Marine Research/, f);
      assert.notStrictEqual(after[i], before[i], f + ' was not written');
    }
    assert.match(run(dir, '--check'), /nothing left/);
    assert.match(run(dir, ...old), /nothing to do/);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
