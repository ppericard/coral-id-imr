// A full unit-test run under the machine slot (tests/slot.js; Pierre, 2026-11-05: "the automatic lock of the unit tests";
// rule W24): several agent sessions share one machine, and a full run is as heavy as a smoke.
//   node tests/run.js                              the fast tier: every tests/*.test.js but the slow ones (rule W14), once a slot is free
//   node tests/run.js --all                        every tests/*.test.js, the slow statistical tests too (what CI and the merge train run)
//   node tests/run.js --test-name-pattern=merge    node --test options pass through
//   node tests/run.js tests/a.test.js tests/b.test.js   the files given, slow or not
// A test file is slow when a line of its first lines is `// @slow: <what it simulates>` (Pierre, 2026-11-19, Q414: the
// slow statistical tests out of the fast tier): a simulation or a fit that takes many seconds of CPU alone.
// One file stays unlocked, for the fast loop: node --test tests/x.test.js. On CI (CI set) it runs at once.
const fs = require('fs'),
  path = require('path');

// The marker a slow test file carries among its first lines (after the slot guard, tests/slotguard.test.js).
const SLOW = /^\/\/ @slow\b/m,
  HEAD = 1024;

// Is this test file tagged slow? (Reads the file's first HEAD bytes.)
function isSlow(file) {
  const fd = fs.openSync(file, 'r'),
    buf = Buffer.alloc(HEAD);
  try {
    return SLOW.test(buf.toString('utf8', 0, fs.readSync(fd, buf, 0, HEAD, 0)));
  } finally {
    fs.closeSync(fd);
  }
}

// The node arguments: --test, the options given (--all is ours, not node's), then the files given or every tests/*.test.js
// (relative to the cwd; the slow ones only with --all).
// A file is a script name, a glob or an existing path: an option's value given as the next argument
// (--test-name-pattern merge) is none of them.
function args(argv) {
  const every = argv.includes('--all'),
    rest = argv.filter(a => a !== '--all'),
    files = rest.filter(a => !a.startsWith('-') && (/\.[cm]?[jt]s$/.test(a) || a.includes('*') || fs.existsSync(a))),
    all = fs
      .readdirSync(__dirname)
      .filter(f => f.endsWith('.test.js'))
      .sort()
      .filter(f => every || !isSlow(path.join(__dirname, f)))
      .map(f => path.relative(process.cwd(), path.join(__dirname, f)));
  return ['--test', ...rest, ...(files.length ? [] : all)];
}

// The slow files (tagged), sorted: what the default run leaves out.
const slowFiles = () =>
  fs
    .readdirSync(__dirname)
    .filter(f => f.endsWith('.test.js') && isSlow(path.join(__dirname, f)))
    .sort();

module.exports = args;
module.exports.slowFiles = slowFiles;
if (require.main === module) {
  const argv = process.argv.slice(2),
    left = argv.includes('--all') || argv.some(a => /\.[cm]?[jt]s$/.test(a) && !a.startsWith('-')) ? [] : slowFiles();
  if (left.length)
    console.error(`tests/run.js: the fast tier; ${left.length} slow tests left out (${left.join(', ')}); --all runs them (CI does)`);
  require('./slot.js').run(process.execPath, args(argv), 'tests/run.js');
}
