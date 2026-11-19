'use strict';
require('./slot.js').testGuard();
// tools/decisions_index.py: the decisions index written from the records, on made-up records in a temporary folder.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process');
const TOOL = path.join(__dirname, '..', 'tools', 'decisions_index.py');
const roots = [];
test.after(() => roots.forEach(r => fs.rmSync(r, {recursive: true, force: true})));

const record = (title, date, pr) => `# ${title}\n\nDate: ${date}. PR: #${pr}. Rules or docs touched: none.\n\n## Decision\n\nYes.\n`;
const HEAD = '# Decision records\n\n## Index\n\nNewest day first.\n\n| Date | Record | PR |\n|---|---|---|\n';
const TAIL = '\nOlder decisions are elsewhere.\n';
const tree = (rows, extra = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'decisions-'));
  roots.push(root);
  const dir = path.join(root, 'docs', 'decisions');
  fs.mkdirSync(dir, {recursive: true});
  const files = {
    '2026-11-18-zeta.md': record('Zeta: the older one', '2026-11-18', 12),
    '2026-11-19-beta.md': record('Beta: a | in the title', '2026-11-19', 30),
    '2026-11-19-alpha.md': record('Alpha: first by name', '2026-11-19', 31),
    ...extra
  };
  for (const [f, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), text);
  fs.writeFileSync(path.join(dir, 'README.md'), HEAD + rows + TAIL);
  return root;
};
const run = (root, ...a) => spawnSync('python3', ['-B', TOOL, '--root', root, ...a], {encoding: 'utf8', timeout: 5000});
const readme = root => fs.readFileSync(path.join(root, 'docs', 'decisions', 'README.md'), 'utf8');
const WANT = [
  '| 2026-11-19 | [Alpha: first by name](2026-11-19-alpha.md) | #31 |',
  '| 2026-11-19 | [Beta: a \\| in the title](2026-11-19-beta.md) | #30 |',
  '| 2026-11-18 | [Zeta: the older one](2026-11-18-zeta.md) | #12 |'
].join('\n');

test('rows: newest day first, then by file name; a | in a title escaped; --fix is idempotent', () => {
  const root = tree('| 2026-11-19 | [Old](2026-11-19-beta.md) | #30 |\n');
  assert.strictEqual(run(root).stdout.trim(), WANT);
  const bad = run(root, '--check');
  assert.strictEqual(bad.status, 1);
  assert.match(
    bad.stdout,
    /run python3 tools\/decisions_index\.py --fix\n {2}first difference at row 1:\n {2}index: {3}\| 2026-11-19 \| \[Old\]/
  );
  assert.match(bad.stdout, /records: \| 2026-11-19 \| \[Alpha: first by name\]/);
  assert.strictEqual(run(root, '--fix').status, 0);
  const once = readme(root);
  assert.strictEqual(once, HEAD + WANT + '\n' + TAIL);
  assert.strictEqual(run(root, '--check').status, 0);
  run(root, '--fix');
  assert.strictEqual(readme(root), once);
});

test("--fix rewrites a merge's conflicted index whole, markers included", () => {
  const conflicted = [
    '<<<<<<< HEAD',
    '| 2026-11-19 | [Alpha: first by name](2026-11-19-alpha.md) | #31 |',
    '=======',
    '| 2026-11-19 | [Beta: a \\| in the title](2026-11-19-beta.md) | #30 |',
    '>>>>>>> origin/main',
    '| 2026-11-18 | [Zeta: the older one](2026-11-18-zeta.md) | #12 |',
    ''
  ].join('\n');
  const root = tree(conflicted);
  assert.strictEqual(run(root, '--check').status, 1);
  run(root, '--fix');
  assert.strictEqual(readme(root), HEAD + WANT + '\n' + TAIL);
});

// The index is whole in README.md: the split index's OLDER.md (a branch from before it was retired may bring it back
// in a merge) is never read as a record; --check fails while it exists and --fix deletes it.
test('the whole index is in README.md; a retired OLDER.md fails --check and --fix deletes it', () => {
  const older = '# Older decision records\n\n| Date | Record | PR |\n|---|---|---|\n| 2026-11-18 | [Zeta](2026-11-18-zeta.md) | #12 |\n';
  const root = tree('', {'OLDER.md': older});
  const file = path.join(root, 'docs', 'decisions', 'OLDER.md');
  assert.strictEqual(run(root).stdout.trim(), WANT, 'OLDER.md is not a record');
  const bad = run(root, '--check');
  assert.strictEqual(bad.status, 1);
  assert.match(bad.stdout, /OLDER\.md is retired.*--fix/);
  assert.strictEqual(run(root, '--fix').status, 0);
  assert.ok(!fs.existsSync(file), 'OLDER.md deleted');
  assert.strictEqual(readme(root), HEAD + WANT + '\n' + TAIL);
  assert.strictEqual(run(root, '--check').status, 0);
});

test('a record without its "Date: … PR: #N." line is named, and nothing is written', () => {
  const root = tree('', {'2026-11-19-gamma.md': '# Gamma\n\nNo date line.\n'});
  const r = run(root, '--fix');
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /2026-11-19-gamma\.md/);
  assert.strictEqual(readme(root), HEAD + TAIL);
});
