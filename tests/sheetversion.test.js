// The sheet script's VERSION is assigned at merge (Pierre, 2026-11-08, Q305 a; rule D3): tools/sheet_version.py checks a
// PR (one changes file, VERSION and the header line left alone) and main (no changes file left), and --assign folds the
// entry in. Each case runs on a throwaway git repository: main, then a PR branch.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync, execFileSync} = require('child_process');

const ROOT = path.join(__dirname, '..'),
  TOOL = path.join(ROOT, 'tools', 'sheet_version.py'),
  CHECK = path.join(ROOT, 'tools', 'check_versions.py'),
  NEXT = 'v' + 'NEXT'; // spelled apart: this file never holds the placeholder itself

const HEADER =
  '// IMR Reef ID: progress sync for the RAs, stored in this Google Sheet.  VERSION 7 (2026-11-08: v7: seven; v6: six; 2026-11-07: v5: five)';
const HISTORY = '- Version history: v2 Answers/Activity tabs; v7 (2026-11-08) seven; v6 (2026-11-08) six';
const FILES = {
  'tools/sync/Code.gs': HEADER + '\n// Setup: paste this file.\nconst VERSION = 7;  // assigned at merge\nfunction doGet(){ return 1; }\n',
  'docs/ARCHITECTURE.md': '# Architecture\n\n' + HISTORY + '\n- Endpoints: GET.\n',
  'core.js': 'const OLD_SHEET = 5;\nconst x = 1;\n',
  'tools/sync/changes/README.md': '# Changes\n\nWrite `' + NEXT + '` in a PR.\n'
};

// A repository with main as FILES and a branch pr checked out; returns helpers on it.
const repo = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sheetv-'));
  const git = (...a) => execFileSync('git', ['-C', d, ...a], {encoding: 'utf-8'});
  const write = (f, s) => {
    fs.mkdirSync(path.dirname(path.join(d, f)), {recursive: true});
    fs.writeFileSync(path.join(d, f), s);
  };
  const read = f => fs.readFileSync(path.join(d, f), 'utf-8');
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 'T');
  for (const [f, s] of Object.entries(FILES)) write(f, s);
  git('add', '-A');
  git('commit', '-q', '-m', 'main');
  git('checkout', '-q', '-b', 'pr');
  const run = (...a) => spawnSync('python3', [TOOL, ...a], {cwd: d, encoding: 'utf-8'});
  const check = (...a) => run('--check', '--base', 'main', ...a);
  const edit = (f, from, to) => {
    const s = read(f);
    assert.ok(s.includes(from), f + ' holds ' + from);
    write(f, s.replace(from, to));
  };
  const commit = () => {
    git('add', '-A');
    git('commit', '-q', '-m', 'pr');
  };
  return {d, git, write, read, run, check, edit, commit, done: () => fs.rmSync(d, {recursive: true, force: true})};
};
const ok = (r, state) => {
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  if (state) assert.match(r.stdout, state);
};
const fails = (r, why) => {
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, why);
};

test('a PR with no sheet change passes; a Code.gs change without its changes file fails', () => {
  const r = repo();
  try {
    ok(r.check(), /no sheet change/);
    ok(r.check('--main'));
    r.edit('tools/sync/Code.gs', 'return 1;', 'return 2;');
    fails(r.check(), /Code\.gs changed: write its history entry in tools\/sync\/changes/);
  } finally {
    r.done();
  }
});

test('a PR waiting for its version: one changes file, VERSION and the header line left alone; main may hold none', () => {
  const r = repo();
  try {
    r.edit('tools/sync/Code.gs', 'return 1;', 'return 2;');
    r.write('tools/sync/changes/claude-x.md', 'doGet answers 2 (Pierre, 2026-11-08)\n');
    ok(r.check(), /waiting for its version at merge \(claude-x\.md\)/);
    r.commit();
    ok(r.check(), /waiting/);
    fails(r.check('--main'), /changes files left: claude-x\.md/);
    // A new gate above main's VERSION and the placeholder in a comment are fine while it waits.
    r.edit('core.js', 'const x = 1;', 'const NEW_SHEET = 8;\nconst x = 1;');
    r.edit('tools/sync/Code.gs', '// Setup:', `// Answers 2 (${NEXT}).\n// Setup:`);
    ok(r.check(), /waiting/);
    fails(r.check('--main'), /gates above VERSION 7: NEW_SHEET = 8 \(core\.js\)[\s\S]*placeholder vN[E]XT left in tools\/sync\/Code\.gs/);
  } finally {
    r.done();
  }
});

test('a PR that edits VERSION or the header line itself, or carries two changes files, or one with no Code.gs change, fails', () => {
  const r = repo();
  try {
    r.write('tools/sync/changes/claude-x.md', 'an entry\n');
    fails(r.check(), /but no change to tools\/sync\/Code\.gs: remove the changes file/);
    r.edit('tools/sync/Code.gs', 'return 1;', 'return 2;');
    r.write('tools/sync/changes/claude-y.md', 'another entry\n');
    fails(r.check(), /2 changes files \(claude-x\.md, claude-y\.md\): one per PR/);
    fs.rmSync(path.join(r.d, 'tools/sync/changes/claude-y.md'));
    r.edit('tools/sync/Code.gs', 'const VERSION = 7;', 'const VERSION = 8;');
    r.edit('tools/sync/Code.gs', 'VERSION 7 (2026-11-08: v7:', 'VERSION 8 (2026-11-08: v8: mine; v7:');
    fails(r.check(), /VERSION 8 and the header line are assigned at merge: keep the base's \(VERSION 7\)/);
    fs.rmSync(path.join(r.d, 'tools/sync/changes/claude-x.md'));
    // Bumped by hand with no changes file: the header has its entry, but ARCHITECTURE.md was not folded by --assign.
    fails(r.check(), /docs\/ARCHITECTURE\.md: its version history does not name v8: use --assign/);
    r.edit('tools/sync/Code.gs', 'const VERSION = 8;', 'const VERSION = 9;');
    fails(r.check(), /the header says VERSION 8, its first entry v8, the constant 9/);
  } finally {
    r.done();
  }
});

test('a changes file holds one entry with no version number', () => {
  const r = repo();
  try {
    r.edit('tools/sync/Code.gs', 'return 1;', 'return 2;');
    r.write('tools/sync/changes/claude-x.md', '\n  \n');
    fails(r.check(), /claude-x\.md: empty/);
    r.write('tools/sync/changes/claude-x.md', 'v8: doGet answers 2\n');
    fails(r.check(), /starts with a version/);
    r.write('tools/sync/changes/claude-x.txt', 'doGet answers 2\n');
    fs.rmSync(path.join(r.d, 'tools/sync/changes/claude-x.md'));
    fails(r.check(), /claude-x\.txt: a changes file is <branch>\.md/);
  } finally {
    r.done();
  }
});

test('--assign: the next VERSION, the entry in the header (new day) and ARCHITECTURE, the gates and placeholders set, the file gone', () => {
  const r = repo();
  try {
    r.edit('tools/sync/Code.gs', 'return 1;', 'return 2;');
    r.edit('tools/sync/Code.gs', '// Setup:', `// Answers 2 (${NEXT}, Pierre).\n// Setup:`);
    r.edit('core.js', 'const x = 1;', 'const NEW_SHEET = 8;\nconst x = 1;');
    r.write('docs/notes.md', `Since ${NEXT} the reply is 2; the token \`${NEXT}\` is kept in a code span.\n`);
    r.write('tools/sync/changes/claude-x.md', 'doGet answers 2 (`doGet`,\n Pierre, 2026-11-09).\n');
    r.commit();
    const dry = r.run('--assign', '--base', 'main', '--dry-run', '--date', '2026-11-09');
    ok(dry, /would change tools\/sync\/Code\.gs: VERSION 7 -> 8/);
    assert.ok(fs.existsSync(path.join(r.d, 'tools/sync/changes/claude-x.md')), 'a dry run writes nothing');
    const a = r.run('--assign', '--base', 'main', '--date', '2026-11-09');
    ok(a, /core\.js: NEW_SHEET 8 -> 8[\s\S]*tools\/sync\/changes\/claude-x\.md: removed/);
    const gs = r.read('tools/sync/Code.gs');
    assert.strictEqual(
      gs.split('\n')[0],
      '// IMR Reef ID: progress sync for the RAs, stored in this Google Sheet.  VERSION 8 (2026-11-09: v8: doGet answers 2 (doGet, Pierre, 2026-11-09); 2026-11-08: v7: seven; v6: six; 2026-11-07: v5: five)'
    );
    assert.match(gs, /^const VERSION = 8; {2}\/\/ assigned at merge$/m);
    assert.match(gs, /\/\/ Answers 2 \(v8, Pierre\)\./);
    assert.ok(
      r
        .read('docs/ARCHITECTURE.md')
        .includes('Answers/Activity tabs; v8 (2026-11-09) doGet answers 2 (`doGet`, Pierre, 2026-11-09); v7 (2026-11-08) seven')
    );
    assert.match(r.read('core.js'), /const OLD_SHEET = 5;\nconst NEW_SHEET = 8;/);
    assert.strictEqual(r.read('docs/notes.md'), `Since v8 the reply is 2; the token \`${NEXT}\` is kept in a code span.\n`);
    assert.ok(!fs.existsSync(path.join(r.d, 'tools/sync/changes/claude-x.md')));
    assert.ok(fs.existsSync(path.join(r.d, 'tools/sync/changes/README.md')), 'the README stays');
    ok(r.check(), /assigned: v8/);
    r.commit();
    ok(r.check(), /assigned: v8/);
    ok(r.check('--main'));
    // An assigned PR whose gate is above the new VERSION (written by hand after the assign) fails.
    r.edit('core.js', 'const NEW_SHEET = 8;', 'const NEW_SHEET = 9;');
    fails(r.check(), /gates above VERSION 8: NEW_SHEET = 9/);
  } finally {
    r.done();
  }
});

test('--assign on the same day goes under that day; it needs exactly one changes file', () => {
  const r = repo();
  try {
    r.edit('tools/sync/Code.gs', 'return 1;', 'return 2;');
    const none = r.run('--assign', '--base', 'main');
    assert.strictEqual(none.status, 1);
    assert.match(none.stderr, /needs exactly one file in tools\/sync\/changes, found 0/);
    r.write('tools/sync/changes/claude-x.md', 'doGet answers 2\n');
    // A day that is not YYYY-MM-DD would break the header line: refused before anything is written.
    for (const bad of ['2026-13-01', '8 Nov']) assert.strictEqual(r.run('--assign', '--base', 'main', '--date', bad).status, 2, bad);
    assert.ok(fs.existsSync(path.join(r.d, 'tools/sync/changes/claude-x.md')));
    ok(r.run('--assign', '--base', 'main', '--date', '2026-11-08'));
    assert.ok(
      r
        .read('tools/sync/Code.gs')
        .startsWith(HEADER.replace('VERSION 7 (2026-11-08: v7:', 'VERSION 8 (2026-11-08: v8: doGet answers 2; v7:'))
    );
    ok(r.check(), /assigned: v8/);
    // Two versions at once is not an assign.
    r.edit('tools/sync/Code.gs', 'VERSION 8 (2026-11-08: v8:', 'VERSION 9 (2026-11-08: v9: more; v8:');
    r.edit('tools/sync/Code.gs', 'const VERSION = 8;', 'const VERSION = 9;');
    fails(r.check(), /VERSION went from 7 to 9: only --assign changes it, by one/);
  } finally {
    r.done();
  }
});

test('a gate the PR adds gets the assigned version even after main reached its provisional number (Codex review #757)', () => {
  const r = repo();
  try {
    r.write('tools/sync/Code.gs', r.read('tools/sync/Code.gs') + 'function more(){ return 3; }\n');
    r.edit('core.js', 'const x = 1;', 'const NEW_SHEET = 8;\nconst x = 1;');
    r.write('tools/sync/changes/claude-x.md', 'doGet answers 2\n');
    r.commit();
    ok(r.check(), /waiting/);
    // Meanwhile another PR took v8 on main.
    r.git('checkout', '-q', 'main');
    r.edit('tools/sync/Code.gs', 'VERSION 7 (2026-11-08: v7:', 'VERSION 8 (2026-11-08: v8: other; v7:');
    r.edit('tools/sync/Code.gs', 'const VERSION = 7;', 'const VERSION = 8;');
    r.edit('docs/ARCHITECTURE.md', 'tabs; v7 (', 'tabs; v8 (2026-11-08) other; v7 (');
    r.commit();
    r.git('checkout', '-q', 'pr');
    r.git('merge', '-q', '--no-edit', 'main');
    fails(r.check(), /gates this PR adds or changes at or below main's VERSION 8: NEW_SHEET = 8 \(core\.js\): write 9/);
    const a = r.run('--assign', '--base', 'main', '--date', '2026-11-08');
    ok(a, /core\.js: NEW_SHEET 8 -> 9/);
    assert.match(r.read('core.js'), /const OLD_SHEET = 5;\nconst NEW_SHEET = 9;/);
    ok(r.check(), /assigned: v9/);
    r.edit('core.js', 'const NEW_SHEET = 9;', 'const NEW_SHEET = 8;');
    fails(r.check(), /gates this PR adds or changes not at its VERSION 9: NEW_SHEET = 8/);
  } finally {
    r.done();
  }
});

test('--assign: a gate named with several words, and the copy of core.js embedded in Code.gs, get the version too (Codex review #757)', () => {
  const r = repo();
  // tools/sync_core.py's markers, as it writes them.
  const embed = core =>
    "// The app's core.js (progress engine, replayProgress), embedded by tools/sync_core.py: Code.gs reaches it as CORE_.\n" +
    "// Its own module object keeps its names out of this script's globals (TRUST, MEM... are Code.gs's own).\n" +
    'const CORE_ = (function () { const module = {exports: {}};\n' +
    '// BEGIN core.js (generated by tools/sync_core.py, do not edit)\n' +
    core +
    '// END core.js\nreturn module.exports; })();\n';
  try {
    r.edit('core.js', 'const x = 1;', 'const NEW_ADMIN_SHEET = 8;\nconst x = 1;');
    r.write('tools/sync/Code.gs', r.read('tools/sync/Code.gs') + '\n' + embed(r.read('core.js')));
    r.write('tools/sync/changes/claude-x.md', 'the embedded core.js gains a gate\n');
    ok(r.check(), /waiting/);
    r.commit();
    ok(
      r.run('--assign', '--base', 'main', '--date', '2026-11-08'),
      /core\.js: NEW_ADMIN_SHEET 8 -> 8[\s\S]*embedded core\.js copied again/
    );
    // Main took v8 in between: the gate becomes 9 in core.js and in its copy.
    r.git('checkout', '-q', '--', '.');
    r.git('clean', '-fdq');
    r.git('checkout', '-q', 'main');
    r.edit('tools/sync/Code.gs', 'VERSION 7 (2026-11-08: v7:', 'VERSION 8 (2026-11-08: v8: other; v7:');
    r.edit('tools/sync/Code.gs', 'const VERSION = 7;', 'const VERSION = 8;');
    r.edit('docs/ARCHITECTURE.md', 'tabs; v7 (', 'tabs; v8 (2026-11-08) other; v7 (');
    r.commit();
    r.git('checkout', '-q', 'pr');
    r.git('merge', '-q', '--no-edit', 'main');
    fails(r.check(), /NEW_ADMIN_SHEET = 8 \(core\.js\): write 9/);
    ok(r.run('--assign', '--base', 'main', '--date', '2026-11-08'), /NEW_ADMIN_SHEET 8 -> 9/);
    const gs = r.read('tools/sync/Code.gs');
    assert.ok(gs.endsWith(embed(r.read('core.js'))), 'the embedded copy is core.js as assigned');
    assert.match(gs, /const NEW_ADMIN_SHEET = 9;/);
    ok(r.check(), /assigned: v9/);
  } finally {
    r.done();
  }
});

test('a gate above VERSION or a placeholder with no sheet change fails', () => {
  const r = repo();
  try {
    r.edit('core.js', 'const x = 1;', 'const NEW_SHEET = 8;\nconst x = 1;');
    fails(r.check(), /gates above VERSION 7: NEW_SHEET = 8 \(core\.js\): a gate waits for a Code\.gs change/);
    r.edit('core.js', 'const NEW_SHEET = 8;', 'const NEW_SHEET = 7;');
    ok(r.check());
    r.write('docs/notes.md', `From ${NEXT} on.\n`);
    fails(r.check(), /the placeholder vN[E]XT in docs\/notes\.md, but no sheet change to assign/);
  } finally {
    r.done();
  }
});

test('the real Code.gs header and ARCHITECTURE.md history take an --assign, which --check then accepts', () => {
  const r = repo();
  try {
    // As main holds them: a PR branch's own placeholders (its sheet change waiting for its version) are not main's.
    const mark = new RegExp('\\b' + NEXT + '\\b', 'g');
    for (const f of ['tools/sync/Code.gs', 'docs/ARCHITECTURE.md'])
      r.write(f, fs.readFileSync(path.join(ROOT, f), 'utf-8').replace(mark, 'the next version'));
    r.git('add', '-A');
    r.git('commit', '-q', '-m', 'real files');
    r.git('branch', '-f', 'main', 'HEAD');
    const v = Number(/^const VERSION = (\d+);/m.exec(r.read('tools/sync/Code.gs'))[1]);
    ok(r.check(), /no sheet change/);
    r.edit('tools/sync/Code.gs', 'function json_(o){', '// A comment.\nfunction json_(o){');
    r.write('tools/sync/changes/claude-x.md', 'a comment, nothing it computes changes\n');
    ok(r.check(), /waiting/);
    ok(r.run('--assign', '--base', 'main', '--date', '2099-01-01'));
    const line = r.read('tools/sync/Code.gs').split('\n')[0];
    assert.ok(line.includes(`VERSION ${v + 1} (2099-01-01: v${v + 1}: a comment, nothing it computes changes; 20`), line.slice(0, 200));
    ok(r.check(), new RegExp('assigned: v' + (v + 1)));
  } finally {
    r.done();
  }
});

test('check_versions.py runs the sheet check on the source, never on a stamped copy (--dir)', () => {
  const r = spawnSync('python3', [CHECK], {cwd: ROOT, encoding: 'utf-8'});
  assert.strictEqual(r.status, 0, r.stdout);
  assert.match(r.stdout, /^Sheet script: /m);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sheetv-dir-'));
  try {
    for (const f of fs.readdirSync(ROOT))
      if (fs.statSync(path.join(ROOT, f)).isFile()) fs.copyFileSync(path.join(ROOT, f), path.join(d, f));
    fs.cpSync(path.join(ROOT, 'proto'), path.join(d, 'proto'), {recursive: true});
    const s = spawnSync('python3', [CHECK, '--dir', d], {cwd: ROOT, encoding: 'utf-8'});
    assert.strictEqual(s.status, 0, s.stdout);
    assert.ok(!/Sheet script/.test(s.stdout), s.stdout);
  } finally {
    fs.rmSync(d, {recursive: true, force: true});
  }
});
