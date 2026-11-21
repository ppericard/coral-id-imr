require('./slot.js').testGuard();
// core.js is built from its parts, core/*.js (tools/sync_core.py; architecture review of 2026-11-18, R6, step 4 of its
// migration path): core.js is the parts joined in the tool's PARTS order inside its wrapper, byte for byte, and each part
// parses on its own. An edit made in core.js instead of its part is carried back by --fix; an edit in a part rebuilds
// core.js and its copy in the sheet script. The cases on a throwaway git repository holding copies of the real files.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  vm = require('vm'),
  {spawnSync, execFileSync} = require('child_process');

const ROOT = path.join(__dirname, '..'),
  TOOL = path.join(ROOT, 'tools', 'sync_core.py'),
  GS = 'tools/sync/Code.gs';
const tool = (root, ...a) => spawnSync('python3', [TOOL, '--root', root, ...a], {encoding: 'utf-8'});
const parts = execFileSync('python3', [TOOL, '--list'], {encoding: 'utf-8'}).trim().split('\n');
const read = (root, f) => fs.readFileSync(path.join(root, f), 'utf-8');

test('core.js is its parts joined, byte for byte, and Code.gs holds it (tools/sync_core.py --check)', () => {
  const r = tool(ROOT, '--check');
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const core = read(ROOT, 'core.js'),
    body = parts.map(f => read(ROOT, f)).join('');
  assert.ok(core.includes(body), 'the parts, in order, are core.js between its wrapper lines');
  assert.strictEqual(core.length - body.length, core.indexOf(body) + '})(this);\n'.length, 'nothing but the wrapper around them');
  assert.deepStrictEqual(
    fs.readdirSync(path.join(ROOT, 'core')).sort(),
    parts.map(f => path.basename(f)).sort(),
    'every file of core/ is a part'
  );
});

test('each part parses on its own, as a run of whole statements of the one function', () => {
  for (const f of parts) assert.doesNotThrow(() => new vm.Script('(function (root) {\n' + read(ROOT, f) + '})', {filename: f}), f);
});

test('--where names the part and its line that hold a line of core.js', () => {
  const first = read(ROOT, parts[0]).split('\n').length - 1; // lines of the first part
  assert.strictEqual(tool(ROOT, '--where', '4').stdout.trim(), parts[0] + ':1');
  assert.strictEqual(tool(ROOT, '--where', String(3 + first + 2)).stdout.trim(), parts[1] + ':2');
  assert.match(tool(ROOT, '--where', '1').stdout, /wrapper/);
});

// A throwaway repository with copies of core.js, its parts and Code.gs, committed.
function repo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'coreparts-'));
  const git = (...a) => execFileSync('git', ['-C', d, ...a], {encoding: 'utf-8'});
  for (const f of ['core.js', GS, ...parts]) {
    fs.mkdirSync(path.dirname(path.join(d, f)), {recursive: true});
    fs.copyFileSync(path.join(ROOT, f), path.join(d, f));
  }
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 'T');
  git('add', '-A');
  git('commit', '-q', '-m', 'main');
  const write = (f, s) => fs.writeFileSync(path.join(d, f), s);
  const commit = () => git('commit', '-q', '-am', 'step');
  return {d, git, write, commit, read: f => read(d, f), done: () => fs.rmSync(d, {recursive: true, force: true})};
}

test('--fix: an edit made in core.js is carried back into its part, an edit in a part rebuilds core.js, both at once stops', () => {
  const r = repo();
  try {
    // In core.js, inside the second part: carried back there, and Code.gs takes the new core.js.
    const mark = r.read(parts[1]).split('\n')[0] + '\n';
    r.write('core.js', r.read('core.js').replace(mark, mark + '  // a hand edit\n'));
    const bad = tool(r.d, '--check');
    assert.strictEqual(bad.status, 1, bad.stdout);
    assert.match(bad.stderr, /core\.js is not its parts joined/);
    const fix = tool(r.d, '--fix');
    assert.strictEqual(fix.status, 0, fix.stdout + fix.stderr);
    assert.match(fix.stdout, new RegExp('core\\.js carried back into ' + parts[1]));
    assert.ok(r.read(parts[1]).startsWith(mark + '  // a hand edit\n'));
    assert.strictEqual(r.read(parts[0]), read(ROOT, parts[0]), 'the other part untouched');
    assert.ok(r.read(GS).includes('  // a hand edit\n'), 'Code.gs holds the new core.js');
    assert.strictEqual(tool(r.d, '--check').status, 0);
    r.commit();
    // In a part: core.js is written from the parts.
    r.write(parts[0], r.read(parts[0]) + '  // a part edit\n');
    const fix2 = tool(r.d, '--fix');
    assert.strictEqual(fix2.status, 0, fix2.stdout + fix2.stderr);
    assert.match(fix2.stdout, /core\.js written from its parts/);
    assert.ok(r.read('core.js').includes('  // a part edit\n' + mark));
    assert.strictEqual(tool(r.d, '--check').status, 0);
    r.commit();
    // Both: nothing written, the two ways out named.
    r.write(parts[0], r.read(parts[0]) + '  // in the part\n');
    r.write('core.js', r.read('core.js').replace(mark, mark + '  // in core.js\n'));
    const both = tool(r.d, '--fix');
    assert.strictEqual(both.status, 1, both.stdout);
    assert.match(both.stderr, /both changed since HEAD: .*--cut/);
    assert.ok(!r.read('core.js').includes('// in the part'), 'core.js left as it was');
    // --cut takes core.js whole.
    const c = tool(r.d, '--cut');
    assert.strictEqual(c.status, 0, c.stdout + c.stderr);
    assert.ok(r.read(parts[1]).includes('  // in core.js\n') && !r.read(parts[0]).includes('// in the part'));
    assert.strictEqual(tool(r.d, '--check').status, 0);
  } finally {
    r.done();
  }
});

test('--fix after a commit that left core.js and its parts apart: nothing guessed, --join or --cut says which', () => {
  const r = repo();
  try {
    r.write(parts[0], r.read(parts[0]) + '  // a part edit, committed without --fix\n');
    r.commit();
    const f = tool(r.d, '--fix');
    assert.strictEqual(f.status, 1, f.stdout);
    assert.match(f.stderr, /already disagree in the last commit.*--join writes core\.js from the parts/);
    const j = tool(r.d, '--join');
    assert.strictEqual(j.status, 0, j.stdout + j.stderr);
    assert.ok(r.read('core.js').includes('  // a part edit, committed without --fix\n'));
    assert.strictEqual(tool(r.d, '--check').status, 0);
  } finally {
    r.done();
  }
});

test('--fix in a merge: an edit a branch made in core.js alone (a branch from before the parts) is carried into its part', () => {
  const r = repo();
  try {
    const mark = r.read(parts[1]).split('\n')[0] + '\n';
    r.git('checkout', '-q', '-b', 'old');
    r.write('core.js', r.read('core.js').replace(mark, mark + '  // the branch, in core.js\n'));
    r.commit();
    r.git('checkout', '-q', 'main');
    r.write(parts[0], '  // main, in its part\n' + r.read(parts[0]));
    assert.strictEqual(tool(r.d, '--fix').status, 0);
    r.commit();
    r.git('checkout', '-q', 'old');
    r.git('merge', '-q', '--no-ff', '--no-commit', 'main');
    const f = tool(r.d, '--fix');
    assert.strictEqual(f.status, 0, f.stdout + f.stderr);
    assert.match(f.stdout, new RegExp('core\\.js carried back into ' + parts[1]));
    assert.ok(r.read(parts[0]).startsWith('  // main, in its part\n'), "main's edit kept");
    assert.ok(r.read(parts[1]).includes(mark + '  // the branch, in core.js\n'), "the branch's edit in its part");
    assert.strictEqual(tool(r.d, '--check').status, 0);
  } finally {
    r.done();
  }
});

test('--check refuses a file of core/ outside PARTS, a part whose first line is not unique, and an edit of the wrapper', () => {
  const r = repo();
  try {
    r.write('core/extra.js', '  const x = 1;\n');
    assert.match(tool(r.d, '--check').stderr, /core\/extra\.js not in tools\/sync_core\.py PARTS/);
    fs.rmSync(path.join(r.d, 'core/extra.js'));
    // The second part's first line also ends the first part: core.js could not be cut there.
    const mark = r.read(parts[1]).split('\n')[0] + '\n';
    r.write(parts[0], r.read(parts[0]) + mark);
    const dup = tool(r.d, '--fix');
    assert.strictEqual(dup.status, 1, dup.stdout);
    assert.match(dup.stderr, /first line is not unique in core\.js/);
    assert.match(tool(r.d, '--check').stderr, /first line is not unique in core\.js/);
    r.git('checkout', '-q', '--', '.');
    // The wrapper lives in the tool: an edit of core.js's first line cannot be carried back.
    r.write('core.js', r.read('core.js').replace('(function (root) {', '(function (root, x) {'));
    const w = tool(r.d, '--fix');
    assert.strictEqual(w.status, 1, w.stdout);
    assert.match(w.stderr, /OPEN and CLOSE: change them there/);
  } finally {
    r.done();
  }
});
