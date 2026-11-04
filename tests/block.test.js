// tests/block.js: the slice of a browser file a unit test runs fails by name when a marker moved or was reworded.
const test = require('node:test'),
  assert = require('node:assert'),
  block = require('./block.js');

test('block: from the first marker to the next end marker after it; a missing, repeated or misplaced marker fails', () => {
  const src = 'x\n// A (Pierre)\nconst a = 1;\n}\nconst end = 2;\n// B\nconst end = 3;\n';
  assert.strictEqual(block(src, '// A (Pierre)', 'const end'), '// A (Pierre)\nconst a = 1;\n}\n');
  assert.strictEqual(block(src, '// A (Pierre)', '\n}\n', {through: true}), '// A (Pierre)\nconst a = 1;\n}\n');
  // The end marker is looked for after the start, not from the top (indexOf from 0 gave an empty or reversed span).
  assert.strictEqual(block(src, '// B', 'const end'), '// B\n');
  assert.throws(
    () => block(src, '// A (Pierre, reworded)', 'const end', {file: 'quiz.js'}),
    /"\/\/ A \(Pierre, reworded\)" not found in quiz\.js/
  );
  assert.throws(() => block(src, 'const end', '\n'), /occurs more than once/);
  assert.throws(() => block(src, '// B', '// A'), /not found after "\/\/ B"/);
});
