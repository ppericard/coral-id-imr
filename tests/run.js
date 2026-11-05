// A full unit-test run under the machine slot (tests/slot.js; Pierre, 2026-11-05: "the automatic lock of the unit tests";
// rule W24): several agent sessions share one machine, and a full run is as heavy as a smoke.
//   node tests/run.js                              every tests/*.test.js, once a slot is free
//   node tests/run.js --test-name-pattern=merge    node --test options pass through
//   node tests/run.js tests/a.test.js tests/b.test.js
// One file stays unlocked, for the fast loop: node --test tests/x.test.js. On CI (CI set) it runs at once.
const fs = require('fs'),
  path = require('path');

// The node arguments: --test, the options given, then the files given or every tests/*.test.js (relative to the cwd).
function args(argv) {
  const files = argv.filter(a => !a.startsWith('-')),
    all = fs
      .readdirSync(__dirname)
      .filter(f => f.endsWith('.test.js'))
      .sort()
      .map(f => path.relative(process.cwd(), path.join(__dirname, f)));
  return ['--test', ...argv, ...(files.length ? [] : all)];
}

module.exports = args;
if (require.main === module) require('./slot.js').run(process.execPath, args(process.argv.slice(2)), 'tests/run.js');
