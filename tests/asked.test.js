'use strict';
require('./slot.js').testGuard();
// tools/asked.py: the search run before any question to Pierre, on made-up files in a temporary folder, offline.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const TOOL = path.join(__dirname, '..', 'tools', 'asked.py');

const tree = files => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'asked-'));
  for (const [f, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, f)), {recursive: true});
    fs.writeFileSync(path.join(root, f), text);
  }
  return root;
};
const ROOT = tree({
  'docs/ANSWERS.md': [
    '# Ledger',
    '',
    '## 2026-11-19',
    '',
    '- **06:50, Q901.** The game keeps its élève badge: "ça reste". Applied: the badge rule.',
    '- **06:59.** The rename waits: "Pas maintenant", the domain',
    '  later. Applied: no doc change.',
    ''
  ].join('\n'),
  'AGENTS.md': '# Agents\n\nNothing about badges here.\n',
  'docs/rules/ui.md': '# UI\n\n### U99\n\n**Badges stay.** *Source:* Pierre’s word, 2026-11-19.\n',
  'docs/decisions/README.md': '| 2026-11-19 | [The élève badge stays](2026-11-19-badge.md) | #1 |\n',
  'docs/decisions/2026-11-19-badge.md': '# The élève badge stays\n\nDate: 2026-11-19. PR: #1.\n\n## Decision\n\nThe badge stays.\n',
  'docs/STATUS.md': 'The élève badge, not searched here.\n'
});
test.after(() => fs.rmSync(ROOT, {recursive: true, force: true}));
const run = (...a) => execFileSync('python3', ['-B', TOOL, '--root', ROOT, ...a], {timeout: 5000}).toString();
const last = out => out.trim().split('\n').pop();

test('every term must match, accents and case ignored, and the last line counts the hits', () => {
  const out = run('ELEVE', 'badge');
  assert.match(out, /^docs\/ANSWERS\.md:5 \(2026-11-19\)\n {4}- \*\*06:50, Q901\.\*\*/m, out);
  assert.match(out, /^docs\/decisions\/2026-11-19-badge\.md:1\n/m, out);
  assert.ok(!/README\.md|STATUS\.md/.test(out), 'the decisions index and STATUS are not searched: ' + out);
  assert.strictEqual(
    last(out),
    'searched: docs/ANSWERS.md, AGENTS.md, docs/rules/*.md, docs/decisions/*.md for all of "ELEVE" "badge" — 2 hits'
  );
});

test("a ledger entry's wrapped lines belong to it, a phrase is one term, typographic quotes fold", () => {
  const out = run('rename', 'later');
  assert.match(out, /docs\/ANSWERS\.md:6 .*\n.*The rename waits.*\n.*later\. Applied: no doc change\./, out);
  assert.match(last(run('"pas maintenant"')), /— 1 hit$/);
  assert.match(last(run("pierre's word")), /— 1 hit$/);
});

test('--any takes an entry holding one of the terms; --max limits what is printed, never the count', () => {
  assert.match(last(run('rename', 'nothing')), /— 0 hits$/);
  const out = run('--any', 'rename', 'nothing', '--max', '1');
  assert.match(out, /1 more hits not shown/);
  assert.match(last(out), /for any of "rename" "nothing" — 2 hits$/);
});

// The branch search: a clone of a local bare "origin" holds main's ledger; the branch "feat" (an open PR) holds one more
// answer. No network, no gh (--prs gives the list).
const git = (cwd, ...a) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...a], {cwd, stdio: 'pipe'});
const LEDGER = '# Ledger\n\n- **06:50.** The badge stays: "ça reste".\n';
const withOrigin = () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'asked-git-'));
  const origin = path.join(base, 'origin.git'),
    clone = path.join(base, 'clone');
  git(base, 'init', '-q', '--bare', '-b', 'main', origin);
  git(base, 'clone', '-q', origin, clone);
  fs.mkdirSync(path.join(clone, 'docs'));
  fs.writeFileSync(path.join(clone, 'docs', 'ANSWERS.md'), LEDGER);
  git(clone, 'add', '.');
  git(clone, 'commit', '-q', '-m', 'main');
  git(clone, 'push', '-q', 'origin', 'HEAD:main');
  git(clone, 'checkout', '-q', '-b', 'feat');
  fs.writeFileSync(path.join(clone, 'docs', 'ANSWERS.md'), LEDGER + '- **10:12.** The yacht colour is teal: "teal".\n');
  git(clone, 'commit', '-q', '-am', 'feat');
  git(clone, 'push', '-q', 'origin', 'feat');
  git(clone, 'checkout', '-q', 'main');
  git(clone, 'branch', '-q', '-D', 'feat');
  git(clone, 'update-ref', '-d', 'refs/remotes/origin/feat'); // as if never fetched
  return {base, clone, origin};
};
const runIn = (root, ...a) => execFileSync('python3', ['-B', TOOL, '--root', root, ...a], {timeout: 20000}).toString();

test("an answer only on an open PR's branch is found, with its PR number, once", () => {
  const {base, clone} = withOrigin();
  try {
    assert.match(last(runIn(clone, '--no-prs', 'yacht')), /— 0 hits$/); // main alone does not have it
    const out = runIn(clone, '--prs', '7:feat', 'yacht');
    assert.match(out, /^PR #7 \(feat\) docs\/ANSWERS\.md:4 \(Ledger\)\n {4}- \*\*10:12\.\*\* The yacht colour/m, out);
    assert.match(last(out), /docs\/ANSWERS\.md on 1 open PR branch for all of "yacht" — 1 hit$/);
    // an entry already on main is not repeated from the branch
    assert.match(last(runIn(clone, '--prs', '7:feat', 'badge')), /— 1 hit$/);
  } finally {
    fs.rmSync(base, {recursive: true, force: true});
  }
});

test('offline (the fetch fails): one note, the rest of the search still answers', () => {
  const {base, clone, origin} = withOrigin();
  try {
    fs.rmSync(origin, {recursive: true, force: true});
    const out = runIn(clone, '--prs', '7:feat', 'badge');
    assert.match(out, /^note: the open PRs' branches were not searched/m, out);
    assert.match(last(out), /— 1 hit$/);
    assert.ok(!/open PR branch/.test(last(out)), 'the searched line does not claim the branches: ' + last(out));
  } finally {
    fs.rmSync(base, {recursive: true, force: true});
  }
});
