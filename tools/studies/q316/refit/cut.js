// REE-193's refit: the log cut at a moment (the rows logged at or before it), to rerun today's code on the answers an
// earlier fit saw and so tell the data's growth from the code's changes (tools/studies/q316/refit/README.md).
//
//   node tools/studies/q316/refit/cut.js <log.json> <out.json> "YYYY-MM-DD HH:MM"   (Manila time, the tab's clock)
//
// The log is the tab form (pseudonymise.js's output); the out file must be outside the repository (rule D2).
const fs = require('fs');
const {inRepo, timeOf} = require('../prep.js');

const cut = (L, until) => ({values: [L.values[0], ...L.values.slice(1).filter(r => timeOf(r[1]) <= until)]});

module.exports = {cut};

if (require.main === module) {
  const [IN, OUT, AT] = process.argv.slice(2),
    until = timeOf(AT || '');
  if (!IN || !OUT || !isFinite(until)) {
    console.error('usage: node tools/studies/q316/refit/cut.js <log.json> <out.json> "YYYY-MM-DD HH:MM"');
    process.exit(2);
  }
  if (inRepo(OUT)) {
    console.error('cut.js: the log holds per-player rows: write it outside the repository (rule D2).');
    process.exit(2);
  }
  const L = cut(JSON.parse(fs.readFileSync(IN, 'utf8')), until);
  fs.writeFileSync(OUT, JSON.stringify(L));
  console.log(`${L.values.length - 1} answers at or before ${AT} Manila`);
}
