// model.js's answer clock (tally, with clockMarks and clockSync; rule D9, docs/reviews/2026-11-09-level-count-checkpoints.md)
// for a test that runs a block of model.js or quiz.js in a vm: the functions' own source, to add to the block. It reads
// the context's answersSoFar and keeps its clock on the context's comeback record (CB, cbSave): a test gives both, then
// can lower the answer count and read its checkpoints across the drop. The synced marks it starts at (clockMarks) are
// read from the context's P (with LEVEL), introMap and winkSeen, when the context has them.
const fs = require('fs'),
  path = require('path'),
  cut = require('./block.js');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8');

module.exports = () =>
  '\n' + cut(SRC, 'function tally() {', 'if (m > c) ((CB.c = m), cbSave());\n  return CB.c;\n}\n', {through: true, file: 'model.js'});
