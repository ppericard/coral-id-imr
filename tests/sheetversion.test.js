require('./slot.js').testGuard();
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
// Since 2026-11-18 (Pierre: "Pourquoi? Juste pourquoi?") line 1 is short and the history lives in tools/sync/HISTORY.md.
const line1 = (n, date) =>
  `// IMR Reef ID: progress sync for the RAs, stored in this Google Sheet. VERSION ${n} (${date}). History: tools/sync/HISTORY.md in the repository.`;
const HIST_TOP = '# Sheet script history\n\nOne entry per version, newest first.\n\n';
const HIST_MD = HIST_TOP + '## v7 (2026-11-08)\n\nseven\n\n## v6 (2026-11-08)\n\nsix\n\n## v5 (2026-11-07)\n\nfive\n';
const BODY = '\n// Setup: paste this file.\nconst VERSION = 7;  // assigned at merge\nfunction doGet(){ return 1; }\n';
const OTHER = {
  'docs/ARCHITECTURE.md': '# Architecture\n\n' + HISTORY + '\n- Endpoints: GET.\n',
  'core.js': 'const OLD_SHEET = 5;\nconst x = 1;\n',
  'tools/sync/changes/README.md': '# Changes\n\nWrite `' + NEXT + '` in a PR.\n'
};
// Main as it is today: the long header of the transition (main's own tool refuses the short one) and HISTORY.md holding
// exactly its entries.
const FILES = {'tools/sync/Code.gs': HEADER + BODY, 'tools/sync/HISTORY.md': HIST_MD, ...OTHER};
// Main once line 1 is short.
const SHORT = {'tools/sync/Code.gs': line1(7, '2026-11-08') + BODY, 'tools/sync/HISTORY.md': HIST_MD, ...OTHER};

// A repository with main as FILES and a branch pr checked out; returns helpers on it.
const repo = (files = FILES) => {
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
  for (const [f, s] of Object.entries(files)) write(f, s);
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
// Another PR took v8 on main (the long header and HISTORY.md kept in step, as the transition has them); to run on main.
const mainTakesV8 = r => {
  r.edit('tools/sync/Code.gs', 'VERSION 7 (2026-11-08: v7:', 'VERSION 8 (2026-11-08: v8: other; v7:');
  r.edit('tools/sync/Code.gs', 'const VERSION = 7;', 'const VERSION = 8;');
  r.edit('tools/sync/HISTORY.md', '## v7 (', '## v8 (2026-11-08)\n\nother\n\n## v7 (');
  r.edit('docs/ARCHITECTURE.md', 'tabs; v7 (', 'tabs; v8 (2026-11-08) other; v7 (');
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

test('--assign: the next VERSION, the short line 1, the entry in HISTORY.md and ARCHITECTURE, the gates and placeholders set, the file gone', () => {
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
    // The long header of the transition becomes the short line; the entry goes on top of HISTORY.md, code marks kept.
    assert.strictEqual(gs.split('\n')[0], line1(8, '2026-11-09'));
    assert.strictEqual(
      r.read('tools/sync/HISTORY.md'),
      HIST_TOP + '## v8 (2026-11-09)\n\ndoGet answers 2 (`doGet`, Pierre, 2026-11-09)\n\n' + HIST_MD.slice(HIST_TOP.length)
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

// #1053 (v170): its entry held `sp. `, whose backticks the header drops; the space they kept doubled one in the header
// line, which --check then refused ("not the base's with one entry"). --assign and --check now read the entry alike.
test('--assign then --check agree on an entry with a double space or with spaces at the edge of a code span (#1053)', () => {
  const cases = [
    ['digits  after sp. only\n', 'digits after sp. only', 'digits after sp. only'],
    [
      'allowed only after `sp. ` that ends a name\n',
      'allowed only after sp. that ends a name',
      'allowed only after `sp. ` that ends a name'
    ],
    ['` logAnswers_` keeps it;\nas `sp. 5 `.\n', 'logAnswers_ keeps it; as sp. 5', '` logAnswers_` keeps it; as `sp. 5 `']
  ];
  for (const [entry, head, arch] of cases) {
    const r = repo();
    try {
      r.edit('tools/sync/Code.gs', 'return 1;', 'return 2;');
      r.write('tools/sync/changes/claude-x.md', entry);
      r.commit();
      ok(r.check(), /waiting/);
      ok(r.run('--assign', '--base', 'main', '--date', '2026-11-09'));
      assert.strictEqual(r.read('tools/sync/Code.gs').split('\n')[0], line1(8, '2026-11-09'), entry);
      assert.ok(r.read('tools/sync/HISTORY.md').includes(`## v8 (2026-11-09)\n\n${arch}\n\n## v7 (`), entry);
      assert.ok(r.read('docs/ARCHITECTURE.md').includes(`tabs; v8 (2026-11-09) ${arch}; v7 (`), entry);
      ok(r.check(), /assigned: v8/);
      r.commit();
      ok(r.check(), /assigned: v8/);
      ok(r.check('--main'));
    } finally {
      r.done();
    }
  }
});

test('an entry that is only code marks and separators is empty, for --check and --assign', () => {
  const r = repo();
  try {
    r.edit('tools/sync/Code.gs', 'return 1;', 'return 2;');
    r.write('tools/sync/changes/claude-x.md', '` . `;\n');
    fails(r.check(), /claude-x\.md: empty/);
    const a = r.run('--assign', '--base', 'main', '--date', '2026-11-09');
    assert.strictEqual(a.status, 1, a.stdout + a.stderr);
    assert.match(a.stderr, /claude-x\.md is empty/);
    assert.ok(fs.existsSync(path.join(r.d, 'tools/sync/changes/claude-x.md')), 'refused before anything is written');
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
    assert.ok(r.read('tools/sync/Code.gs').startsWith(line1(8, '2026-11-08') + '\n'));
    assert.ok(r.read('tools/sync/HISTORY.md').includes('## v8 (2026-11-08)\n\ndoGet answers 2\n\n## v7 (2026-11-08)'));
    ok(r.check(), /assigned: v8/);
    // Two versions at once is not an assign.
    r.edit('tools/sync/Code.gs', 'VERSION 8 (2026-11-08)', 'VERSION 9 (2026-11-08)');
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
    mainTakesV8(r);
    r.commit();
    r.git('checkout', '-q', 'pr');
    r.git('merge', '-q', '--no-edit', 'main');
    fails(r.check(), /gates this PR adds at or below main's VERSION 8: NEW_SHEET = 8 \(core\.js\): write 9/);
    const a = r.run('--assign', '--base', 'main', '--date', '2026-11-08');
    ok(a, /core\.js: NEW_SHEET 8 -> 9/);
    assert.match(r.read('core.js'), /const OLD_SHEET = 5;\nconst NEW_SHEET = 9;/);
    ok(r.check(), /assigned: v9/);
    r.edit('core.js', 'const NEW_SHEET = 9;', 'const NEW_SHEET = 8;');
    fails(r.check(), /gates this PR adds not at its VERSION 9: NEW_SHEET = 8/);
  } finally {
    r.done();
  }
});

// The PR, branched before main took v8 with a gate of its own (app.js PA_SHEET = 8, as #958 did): its own gate NEW_SHEET
// waits at 8. Returns the repository with the pr branch checked out, main not merged yet.
const behind = () => {
  const r = repo();
  r.write('tools/sync/Code.gs', r.read('tools/sync/Code.gs') + 'function more(){ return 3; }\n');
  r.edit('core.js', 'const x = 1;', 'const NEW_SHEET = 8;\nconst x = 1;');
  r.write('tools/sync/changes/claude-x.md', 'more answers 3\n');
  r.commit();
  r.git('checkout', '-q', 'main');
  mainTakesV8(r);
  r.write('app.js', 'const PA_SHEET = 8;\n');
  r.commit();
  r.git('checkout', '-q', 'pr');
  return r;
};
const assigned = r => {
  assert.match(r.read('app.js'), /^const PA_SHEET = 8;$/m, "main's gate stays at main's number");
  assert.match(r.read('core.js'), /^const NEW_SHEET = 9;$/m, "the PR's own gate takes the new VERSION");
  assert.match(r.read('tools/sync/Code.gs'), /^const VERSION = 9;/m);
};

test("--assign after main was merged in, the merge not committed yet (a conflict resolved): main's gates stay, the PR's own gate is bumped (#952)", () => {
  const r = behind();
  try {
    // The merge stops before its commit, as a conflict does: HEAD is still the branch's old tip, MERGE_HEAD is main.
    r.git('merge', '-q', '--no-commit', '--no-ff', 'main');
    const a = r.run('--assign', '--base', 'main', '--date', '2026-11-08');
    ok(a, /core\.js: NEW_SHEET 8 -> 9/);
    assert.doesNotMatch(a.stdout, /PA_SHEET/);
    assigned(r);
    r.git('add', '-A');
    r.git('commit', '-q', '--no-edit');
    ok(r.check(), /assigned: v9/);
    ok(r.check('--main'));
    // The state #952 was left in: main's gate bumped with the PR's. --check sees it.
    r.edit('app.js', 'const PA_SHEET = 8;', 'const PA_SHEET = 9;');
    fails(r.check(), /gates main already has, at or below its VERSION 8, changed by this PR: PA_SHEET = 9 \(app\.js; main: 8\)/);
  } finally {
    r.done();
  }
});

test('--assign after a committed merge or a rebase on main: the same result', () => {
  for (const how of ['merge', 'rebase']) {
    const r = behind();
    try {
      if (how === 'merge') r.git('merge', '-q', '--no-edit', 'main');
      else r.git('rebase', '-q', 'main');
      fails(r.check(), /at or below main's VERSION 8: NEW_SHEET = 8 \(core\.js\): write 9/);
      const a = r.run('--assign', '--base', 'main', '--date', '2026-11-08');
      ok(a, /core\.js: NEW_SHEET 8 -> 9/);
      assert.doesNotMatch(a.stdout, /PA_SHEET/, how);
      assigned(r);
      ok(r.check(), /assigned: v9/);
    } finally {
      r.done();
    }
  }
});

test('--assign refuses a branch not up to date with main, unresolved conflicts, and a PR that changes a gate main has', () => {
  const r = behind();
  try {
    const old = r.run('--assign', '--base', 'main', '--date', '2026-11-08');
    assert.strictEqual(old.status, 1, old.stdout + old.stderr);
    assert.match(old.stderr, /does not hold main yet: merge main into the branch first/);
    assert.ok(fs.existsSync(path.join(r.d, 'tools/sync/changes/claude-x.md')), 'refused before anything is written');
    // Both sides edit the same line: the merge stops with an unmerged path.
    r.write('core.js', r.read('core.js').replace('const x = 1;', 'const x = 2;'));
    r.commit();
    r.git('checkout', '-q', 'main');
    r.edit('core.js', 'const x = 1;', 'const x = 3;');
    r.commit();
    r.git('checkout', '-q', 'pr');
    assert.strictEqual(spawnSync('git', ['-C', r.d, 'merge', '-q', 'main'], {encoding: 'utf-8'}).status, 1);
    const mid = r.run('--assign', '--base', 'main', '--date', '2026-11-08');
    assert.strictEqual(mid.status, 1, mid.stdout + mid.stderr);
    assert.match(mid.stderr, /unresolved conflicts \(core\.js\)/);
    r.write('core.js', r.read('core.js').replace(/<<<<<<<[^]*?=======\n([^]*?)>>>>>>> main\n/, '$1'));
    r.git('add', '-A');
    r.git('commit', '-q', '--no-edit');
    // A PR that moves main's gate instead of adding its own: --check and --assign both say so.
    r.edit('app.js', 'const PA_SHEET = 8;', 'const PA_SHEET = 9;');
    fails(r.check(), /changed by this PR: PA_SHEET = 9 \(app\.js; main: 8\)/);
    const moved = r.run('--assign', '--base', 'main', '--date', '2026-11-08');
    assert.strictEqual(moved.status, 1, moved.stdout + moved.stderr);
    assert.match(moved.stderr, /PA_SHEET = 9 \(app\.js; main: 8\)/);
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
    mainTakesV8(r);
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
    for (const f of ['tools/sync/Code.gs', 'tools/sync/HISTORY.md', 'docs/ARCHITECTURE.md'])
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
    // Whatever shape line 1 has on main (the long header of the transition, then the short line), the assign leaves the short one.
    assert.strictEqual(r.read('tools/sync/Code.gs').split('\n')[0], line1(v + 1, '2099-01-01'));
    const hist = r.read('tools/sync/HISTORY.md');
    assert.ok(hist.includes(`\n## v${v + 1} (2099-01-01)\n\na comment, nothing it computes changes\n\n## v${v} (`), hist.slice(0, 600));
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

// The gate floor (core.js SHEET_FLOOR; architecture review 2026-11-18, R3): a version already live, set by hand, never a
// gate. A PR that adds or raises it with a Code.gs change is not a gate added at or below main's VERSION, and --assign
// leaves it as written (were it a gate, it would be set to the new VERSION: the build's, not a live one).
test('SHEET_FLOOR is not a gate: --check accepts it, --assign leaves it alone', () => {
  const r = repo();
  try {
    r.edit('core.js', 'const x = 1;', 'const SHEET_FLOOR = 5;\nconst x = 1;');
    r.edit('tools/sync/Code.gs', 'return 1;', 'return 2;');
    r.write('tools/sync/changes/claude-x.md', 'doGet answers 2 (Pierre, 2026-11-09).\n');
    r.commit();
    ok(r.check());
    ok(r.run('--assign', '--base', 'main', '--date', '2026-11-09'));
    assert.match(r.read('core.js'), /^const SHEET_FLOOR = 5;$/m, 'the floor as written');
    assert.match(r.read('tools/sync/Code.gs'), /^const VERSION = 8;/m);
    r.commit();
    ok(r.check('--main'));
    // raised later by a PR of its own, still not a main gate changed
    r.git('checkout', '-q', '-b', 'pr2');
    r.edit('core.js', 'const SHEET_FLOOR = 5;', 'const SHEET_FLOOR = 7;');
    r.commit();
    ok(r.run('--check', '--base', 'pr'));
  } finally {
    r.done();
  }
});

// #1083: an entry that names the new version with the placeholder was written into HISTORY.md with the
// placeholder left in, and --check then refused the assigned tree. Every bare placeholder of the entry becomes vN, in
// HISTORY.md and ARCHITECTURE.md; one in a code span stays as written, as in the code files.
test('--assign sets every bare placeholder in the entry it writes to HISTORY.md and ARCHITECTURE.md (#1083)', () => {
  for (const files of [FILES, SHORT]) {
    const r = repo(files);
    try {
      r.edit('tools/sync/Code.gs', 'return 1;', 'return 2;');
      r.write(
        'tools/sync/changes/claude-x.md',
        `The app sends it only from ${NEXT} (\`CV_SHEET\`); ${NEXT} also reads \`${NEXT}\` as written.\n`
      );
      r.commit();
      ok(r.check(), /waiting/);
      ok(r.run('--assign', '--base', 'main', '--date', '2026-11-09'));
      const hist = r.read('tools/sync/HISTORY.md');
      assert.ok(
        hist.includes(
          `## v8 (2026-11-09)\n\nThe app sends it only from v8 (\`CV_SHEET\`); v8 also reads \`${NEXT}\` as written\n\n## v7 (`
        ),
        hist.slice(0, 400)
      );
      assert.ok(r.read('docs/ARCHITECTURE.md').includes('v8 (2026-11-09) The app sends it only from v8 (`CV_SHEET`); v8 also reads'));
      ok(r.check(), /assigned: v8/);
      r.commit();
      ok(r.check('--main'));
    } finally {
      r.done();
    }
  }
});

// Line 1 short, the history in tools/sync/HISTORY.md (Pierre, 2026-11-18: "Pourquoi? Juste pourquoi?").
test('short line 1: an assign puts the entry on top of HISTORY.md and the next version in line 1; --check accepts it', () => {
  const r = repo(SHORT);
  try {
    ok(r.check(), /no sheet change/);
    ok(r.check('--main'));
    r.edit('tools/sync/Code.gs', 'return 1;', 'return 2;');
    r.write('tools/sync/changes/claude-x.md', 'doGet answers 2 (`doGet`).\n');
    r.commit();
    ok(r.check(), /waiting/);
    ok(r.run('--assign', '--base', 'main', '--date', '2026-11-09'));
    assert.strictEqual(r.read('tools/sync/Code.gs').split('\n')[0], line1(8, '2026-11-09'));
    assert.strictEqual(
      r.read('tools/sync/HISTORY.md'),
      HIST_TOP + '## v8 (2026-11-09)\n\ndoGet answers 2 (`doGet`)\n\n' + HIST_MD.slice(HIST_TOP.length)
    );
    ok(r.check(), /assigned: v8/);
    r.commit();
    ok(r.check('--main'));
    // Nothing but --assign writes an entry: a PR waiting for its version leaves HISTORY.md alone.
    r.git('checkout', '-q', '-b', 'pr2');
    r.edit('tools/sync/Code.gs', 'return 2;', 'return 3;');
    r.write('tools/sync/changes/claude-y.md', 'doGet answers 3\n');
    r.edit('tools/sync/HISTORY.md', '## v8 (', '## v9 (2026-11-09)\n\nmine\n\n## v8 (');
    fails(r.run('--check', '--base', 'pr'), /HISTORY\.md: its entry for the PR is written at merge by --assign/);
  } finally {
    r.done();
  }
});

test('--check refuses a line 1 or a HISTORY.md that is not the short shape: top entry, date, gap, duplicate, wording, missing file', () => {
  const cases = [
    [
      'line 1 with two spaces',
      r => r.edit('tools/sync/Code.gs', 'Google Sheet. VERSION', 'Google Sheet.  VERSION'),
      /line 1 is not "\/\/ IMR Reef ID/
    ],
    ['line 1 without its date', r => r.edit('tools/sync/Code.gs', ' (2026-11-08)', ''), /line 1 is not/],
    ['a top entry that is not VERSION', r => r.edit('tools/sync/HISTORY.md', '## v7 (', '## v8 ('), /its top entry is v8, VERSION is 7/],
    [
      "a date that is not line 1's",
      r => r.edit('tools/sync/HISTORY.md', '## v7 (2026-11-08)', '## v7 (2026-11-09)'),
      /v7 is dated 2026-11-09, line 1 says 2026-11-08/
    ],
    ['a duplicate', r => r.edit('tools/sync/HISTORY.md', '## v6 (', '## v7 ('), /v7 twice/],
    ['a gap', r => r.edit('tools/sync/HISTORY.md', '## v6 (2026-11-08)\n\nsix\n\n', ''), /no entry for v6 between v7 and v5/],
    ['an entry out of order', r => r.edit('tools/sync/HISTORY.md', '## v5 (', '## v8 ('), /v8 above v6: newest first/],
    [
      'an unreadable heading',
      r => r.edit('tools/sync/HISTORY.md', '## v6 (2026-11-08)', '## version 6'),
      /unreadable heading "## version 6"/
    ],
    ['an entry with no text', r => r.edit('tools/sync/HISTORY.md', 'six\n\n', ''), /v6 has no text/],
    ['no HISTORY.md', r => fs.rmSync(path.join(r.d, 'tools/sync/HISTORY.md')), /tools\/sync\/HISTORY\.md is missing/]
  ];
  for (const [what, change, why] of cases) {
    const r = repo(SHORT);
    try {
      ok(r.check());
      change(r);
      fails(r.check(), why);
      fails(r.check('--main'), why);
    } finally {
      r.done();
    }
  }
});

test('the transition: the long header is accepted while HISTORY.md holds exactly its entries; the short line comes with --assign', () => {
  const {'tools/sync/HISTORY.md': _gone, ...before} = FILES; // main before HISTORY.md: line 1 holds the history
  // This PR: HISTORY.md added, Code.gs untouched (main's own tool, which the train runs, refuses a short line 1).
  let r = repo(before);
  try {
    fails(r.check(), /tools\/sync\/HISTORY\.md is missing/);
    r.write('tools/sync/HISTORY.md', HIST_MD);
    ok(r.check(), /no sheet change/);
    ok(r.check('--main'));
    r.edit('tools/sync/HISTORY.md', '## v5 (2026-11-07)\n\nfive\n', '');
    fails(r.check(), /does not hold exactly the entries of line 1/);
    r.write('tools/sync/HISTORY.md', HIST_MD.replace('six', 'sixth'));
    fails(r.check(), /does not hold exactly the entries of line 1/);
  } finally {
    r.done();
  }
  // After it: line 1 still long, HISTORY.md in step. Changing line 1 to the short form without a version is not allowed
  // (it rides the next assign); a version assigned by hand with the long header is refused too.
  r = repo();
  try {
    r.write('tools/sync/Code.gs', r.read('tools/sync/Code.gs').replace(HEADER, line1(7, '2026-11-08')));
    fails(r.check(), /the header's history line changed: leave it to --assign/);
    r.git('checkout', '-q', '--', '.');
    mainTakesV8(r);
    fails(r.check(), /VERSION 8 with the long header: line 1 is the short form once a version is assigned/);
    // An entry added by hand with no new VERSION.
    r.git('checkout', '-q', '--', '.');
    r.edit('tools/sync/HISTORY.md', '## v7 (', '## v8 (2026-11-08)\n\nother\n\n## v7 (');
    fails(r.check(), /an entry added or dropped without a new VERSION/);
  } finally {
    r.done();
  }
  // And a short line 1 back to the long one is refused.
  r = repo(SHORT);
  try {
    r.write('tools/sync/Code.gs', r.read('tools/sync/Code.gs').replace(line1(7, '2026-11-08'), HEADER));
    fails(r.check(), /the header's history line changed/);
  } finally {
    r.done();
  }
});

// Pierre, 2026-11-18: line 1 held the whole history. Everything it held is in HISTORY.md: the old line, frozen as a fixture
// (its length and checksum below), is walked entry by entry, in order, separator by separator, up to its last character.
test('every entry of the old line 1 (v176 and below) is in HISTORY.md, word for word, in order, and nothing else was on that line', () => {
  const old = fs.readFileSync(path.join(__dirname, 'sheet-header-v176.txt'), 'utf-8').replace(/\n$/, '');
  assert.strictEqual(Buffer.byteLength(old), 98093);
  assert.strictEqual(
    require('crypto').createHash('sha256').update(old).digest('hex'),
    'f4dedb54a7a7b70bb01cbd1fb5241c500136baa1fc3d573a95706e601c2a05df'
  );
  const parts = fs.readFileSync(path.join(ROOT, 'tools/sync/HISTORY.md'), 'utf-8').split(/^## (v\d+ \(\d{4}-\d\d-\d\d\)|earlier)$/m);
  const entries = [];
  for (let i = 1; i < parts.length; i += 2)
    entries.push({v: parts[i] === 'earlier' ? null : Number(/^v(\d+)/.exec(parts[i])[1]), text: parts[i + 1].trim()});
  const mig = entries.filter(e => e.v === null || e.v <= 176); // the entries from the old line; newer ones were assigned after it
  assert.strictEqual(mig.length, 165);
  assert.deepStrictEqual([mig[0].v, mig[mig.length - 2].v, mig[mig.length - 1].v], [176, 6, null]);
  const prefix = '// IMR Reef ID: progress sync for the RAs, stored in this Google Sheet.  VERSION 176 (2026-11-18: v176: ';
  assert.ok(old.startsWith(prefix));
  let pos = prefix.length;
  const eat = s => {
    assert.ok(old.startsWith(s, pos), `at ${pos}: ${s.slice(0, 80)}`);
    pos += s.length;
  };
  const sep = /^(?:; |\. )(?:\d{4}-\d\d-\d\d: )?v(\d+)(?: \(\d{4}-\d\d-\d\d\))?: /; // "; v7: ", "; 2026-11-17: v166: ", "; v49 (2026-11-05): ", ". v37: "
  mig.forEach((e, i) => {
    assert.ok(!/\n/.test(e.text), 'one line per entry');
    eat(e.text);
    const next = mig[i + 1];
    if (!next) return;
    if (next.v === null) return eat('; earlier: ');
    const m = sep.exec(old.slice(pos));
    assert.ok(m && Number(m[1]) === next.v, `v${e.v} is followed by v${next.v}: ${old.slice(pos, pos + 40)}`);
    pos += m[0].length;
  });
  assert.strictEqual(old.slice(pos), ')', 'the old line ends with its last entry');
});
