require('./slot.js').testGuard();
// A ratchet on the unit tests that cut app source out by text markers with tests/block.js instead of importing it
// (REE-352; the architecture audits of 2026-11-27: a harmless move or reformat breaks such a test, and a seam cannot be cut
// without rewriting it). The count of test files that require block may only fall: a new test imports what it runs
// (core.js and the modules that export their functions); a PR that moves a test off block() lowers BLOCK_USERS to the new
// count, in the same PR, and the test fails until it does (so the room left cannot be spent by a new block() user).
// tests/block.test.js, which tests block itself, and this file are not counted.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path');

// The files of tests/ (the *.test.js and their helpers kept.js, clock.js, rareease.js...) that require ./block or
// ./block.js, counted at 0189d979 (REE-352): 174 with block.test.js, 173 without it.
const BLOCK_USERS = 173;

// block.js's own test and this file say the word without using it.
const EXEMPT = new Set(['block.test.js', 'blockratchet.test.js']),
  // require('./block'), require("./block.js"), however it is bound (a const, an alias, called at once).
  USES = /require\(\s*['"]\.\/block(?:\.js)?['"]\s*\)/;

const users = (dir = __dirname) =>
  fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.js') && !EXEMPT.has(f))
    .filter(f => USES.test(fs.readFileSync(path.join(dir, f), 'utf8')))
    .sort();

test('users() lists the files that require block, and only those', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blockratchet-'));
  try {
    fs.writeFileSync(path.join(dir, 'a.test.js'), "const block = require('./block.js');\n");
    fs.writeFileSync(path.join(dir, 'b.test.js'), "const x = require('./block')(s, 'a', 'b');\n");
    fs.writeFileSync(path.join(dir, 'c.test.js'), "const C = require('../core.js');\n");
    fs.writeFileSync(path.join(dir, 'block.test.js'), "const block = require('./block.js');\n");
    assert.deepStrictEqual(users(dir), ['a.test.js', 'b.test.js']);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('the pattern finds every way a test requires block', () => {
  for (const s of [
    "const block = require('./block.js');",
    "  cut = require('./block');",
    'const b = require("./block.js");',
    "const x = require('./block.js')(src, 'a', 'b');",
    "require( './block' )"
  ])
    assert.ok(USES.test(s), s);
  for (const s of ["require('./block.test.js')", "require('./blocked.js')", "require('../block.js')", '// ./block.js'])
    assert.ok(!USES.test(s), s);
});

test('REE-352: no new test cuts source with block(); the count only falls, lowered with each conversion', () => {
  const now = users();
  assert.ok(
    now.length <= BLOCK_USERS,
    `${now.length} test files require block, ${BLOCK_USERS} allowed: import what the test runs (core.js, or the module ` +
      `that exports it) instead of cutting it out by markers. List the users with ` +
      `\`grep -l "require('./block" tests/*.js\` and compare with main.`
  );
  assert.strictEqual(
    now.length,
    BLOCK_USERS,
    `${BLOCK_USERS - now.length} test file(s) moved off block(): lower BLOCK_USERS in tests/blockratchet.test.js to ${now.length}`
  );
});
