'use strict';
// Journey › Cards: the list in time order (Pierre, 2026-11-05: rows of Nov 4 came before rows of Nov 2), the untimed
// ones after; and the start rows say "inferred" once and "Answered again" for the same answer given again.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'admin-journey.js'), 'utf8');
const jOrder = new Function(src.slice(src.indexOf('// jorder: begin'), src.indexOf('// jorder: end')) + '\nreturn jOrder;')();

test('jOrder: timed rows oldest first, untimed rows after in their own order', () => {
  const out = jOrder([
    [400, 'start-nov4'],
    [null, 'one-at-a-time'],
    [100, 'first-nov2'],
    [300, 'fallback'],
    [null, 'not-used'],
    [200, 'declined-nov2']
  ]);
  assert.strictEqual(out, 'first-nov2declined-nov2fallbackstart-nov4one-at-a-timenot-used');
});

test('start rows: inferred said once; the same answer again reads "Answered again"', () => {
  const body = src.slice(src.indexOf('const jStart'), src.indexOf('\n};\n', src.indexOf('const jStart')));
  assert.ok(/'Answered again'/.test(body), 'the same answer given again');
  assert.ok(!/<b>inferred<\/b>[^`]*`\} · \$\{JSTART\[via\]/.test(body), 'inferred is not followed by JSTART.inferred');
});
