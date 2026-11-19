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
