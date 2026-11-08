'use strict';
// .github/workflows/learncheck.yml (rule L11 tier 2; docs/LEARNING.md "Validating a learning change"): manual dispatch
// only, read-only, and no input reaches a shell command but through env after its check.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const Y = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'learncheck.yml'), 'utf8');

test('the learning check runs by hand only, reads only, and keeps the inputs out of its commands', () => {
  const on = /^on:\n([\s\S]*?)^\S/m.exec(Y)[1];
  assert.deepStrictEqual(
    [...on.matchAll(/^ {2}(\w+):/gm)].map(m => m[1]),
    ['workflow_dispatch']
  );
  assert.match(Y, /^permissions:\n {2}contents: read\n/m);
  assert.doesNotMatch(Y, /contents: write|secrets\./);
  // Every run block: no ${{ ... }} expression (an input there would be pasted into the shell).
  const runs = [...Y.matchAll(/^( +)run: \|\n((?:\1 {2}.*\n|\s*\n)*)/gm)].map(m => m[2]);
  assert.ok(runs.length >= 4, String(runs.length));
  runs.forEach(r => assert.doesNotMatch(r, /\$\{\{/, r.slice(0, 80)));
  // Each free-text input is checked against a pattern before use.
  ['after', 'before', 'seeds', 'questions', 'answers', 'primary', 'looks', 'args'].forEach(k =>
    assert.match(Y, new RegExp(`ok ${k} "\\$`), k)
  );
});

test('both arms run the same learnsim options, and learncmp of the version with the change reads them', () => {
  assert.match(Y, /for side in before after; do/);
  assert.match(Y, /node tools\/learnsim\.js --world "\$w" --subject "\$SUBJECT"/);
  assert.match(Y, /node after\/tools\/learncmp\.js "\$out\/\$w-before\.json" "\$out\/\$w-after\.json"/);
});
