// model.js's answer clock (tally; rule D9, docs/reviews/2026-11-09-level-count-checkpoints.md) for a test that runs a
// block of model.js or quiz.js in a vm: the function's own source, to add to the block. It reads the context's
// answersSoFar and keeps its clock on the context's comeback record (CB, cbSave): a test gives both, then can lower the
// answer count and read its checkpoints across the drop.
const fs = require('fs'),
  path = require('path'),
  cut = require('./block.js');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8');

module.exports = () => '\n' + cut(SRC, 'function tally() {', '\n}\n', {through: true, file: 'model.js'});
