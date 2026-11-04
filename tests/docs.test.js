'use strict';
// Docs that every PR touches must not conflict between open PRs (Pierre, 2026-11-04: "we lose a huge amount of time
// resolving conflicts"): no running "done" list that every PR appends to (AGENTS.md "How to ship a change", rule 9).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('no running "done" list in the living docs', () => {
  for (const f of ['docs/ROADMAP.md', 'docs/ARCHITECTURE.md', 'AGENTS.md', 'README.md'])
    assert.ok(!/^#+ .*\b(Done|Shipped|Changelog)\b/im.test(read(f)), f + ': a done / shipped / changelog section');
});

test('the archived done list stays frozen', () => {
  const h = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, 'docs/archive/DONE-until-2026-11-04.md')))
    .digest('hex');
  assert.strictEqual(
    h,
    '375cfea3cce712f5fe16a183d6e9b693c941b40fe758693077b12c6f1132c87e',
    'docs/archive/DONE-until-2026-11-04.md is frozen: never add to or edit it'
  );
});

// Codex review #502: since #499 the deploy stamps the version numbers; no doc may tell a PR to bump them by hand or to
// run the retired check_versions.py flags (--fix, --base, --no-base).
test('the docs never tell a PR to bump version numbers by hand', () => {
  for (const f of ['docs/ARCHITECTURE.md', 'AGENTS.md', 'README.md', 'docs/HANDOVER.md'])
    assert.ok(!/check_versions\.py --fix|--no-base|`--fix` bumps|so bump `\?v=`/.test(read(f)), f + ': a manual version bump');
});
