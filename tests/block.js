// The part of a browser file a unit test runs (test-suite review, 2026-11-04). Many tests take a block of app.js,
// quiz.js, model.js… between two markers (a comment or a declaration) and run it in a vm; with src.slice(src.indexOf(a),
// src.indexOf(b)), a reworded comment or a moved function made indexOf return -1 and the test ran the wrong span, or
// nothing, silently. block() fails at once, naming the marker:
//   block(src, from, to)                 from the start of `from` to the start of the first `to` after it
//   block(src, from, to, {through: 1})   ... to the end of that `to` (e.g. to the end of a function: '\n}\n')
// `from` must occur exactly once in src (a marker that also appears elsewhere would take the first one: make it longer).
module.exports = function block(src, from, to, {through = false, file = 'the source'} = {}) {
  const i = src.indexOf(from);
  if (i < 0) throw new Error(`block: ${JSON.stringify(from)} not found in ${file}`);
  if (src.indexOf(from, i + 1) >= 0) throw new Error(`block: ${JSON.stringify(from)} occurs more than once in ${file}`);
  const j = src.indexOf(to, i + from.length);
  if (j < 0) throw new Error(`block: ${JSON.stringify(to)} not found after ${JSON.stringify(from)} in ${file}`);
  return src.slice(i, through ? j + to.length : j);
};
