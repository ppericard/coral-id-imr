// The admin's subject switch counts what that subject's To do lists (Pierre, 2026-11-09): the fish switch showed ~1,100,
// mostly the fish auto-sort's Checks, which To do never lists; they keep their own count in Candidates › Checks.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');
const block = require('./block.js');

const src = fs.readFileSync(__dirname + '/../admin.js', 'utf8');
const code = block(src, 'const subjTodo = ', '\n};\n', {through: 1, file: 'admin.js'});

test('the switch counts To do items only: flags and open reports, never the auto-sort Checks', () => {
  let checksRead = 0;
  const ctx = {
    DRAFT: {fish: {flag: {a: 1, b: 1}, pick: {}}},
    repsOpen: () => [1, 2, 3],
    fishIdx: () => {
      checksRead++;
      return {x: {d: {check: 1}}, y: {d: {check: 1}}};
    },
    fishMine: () => false
  };
  vm.createContext(ctx);
  vm.runInContext(code + '\nthis.subjTodo = subjTodo;', ctx);
  assert.strictEqual(ctx.subjTodo({admin: {cur: 'fish'}}, 99), 5);
  assert.strictEqual(checksRead, 0);
  // the corals: their To do count as given
  assert.strictEqual(ctx.subjTodo({admin: {}}, 7), 7);
});
