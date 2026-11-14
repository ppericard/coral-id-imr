// tests/answer.js, the one way the smokes wait for and answer a question: it knows every answer control the app has, and
// no smoke waits for or clicks one format's answer on its own (a wait for the choice buttons hung 30 s on a typed
// question: #855's first head, the overlays smoke).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..');
const qa = require('./answer.js');

test('answer.js knows every answer control app.js qAnswers opens and closes', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
    m = src.match(/const qAnswers = \(q, on\) => q\.querySelectorAll\('([^']+)'\)/);
  assert.ok(m, 'app.js qAnswers not found (renamed? point tests/answer.test.js at it)');
  const app = m[1].split(',').map(s => s.trim());
  assert.deepStrictEqual(
    [...app].sort(),
    [...qa.CONTROLS].sort(),
    'a new answer control: teach tests/answer.js smokeAnswer and SEL to answer it'
  );
  // SEL waits for an open question with one of them enabled (the typed form's buttons come with its field).
  for (const c of qa.CONTROLS.filter(c => c !== '.tyform button')) assert.ok(qa.SEL.includes(c), `answer.js SEL misses ${c}`);
});

// A smoke line that names a quiz answer control (a choice, a surprise's choice, the typed form, the answers' box) or
// answers with a number key, outside tests/answer.js. A deliberate one (a check of one format on a question that can only
// be that format, a read of the choices, a game that is not a quiz question) says why on its line: "answer.js: <why>".
// Any mention, not only a wait or a click: a wait can be a waitForFunction, or a selector Prettier put on its own line.
const RAW = line =>
  !/answer\.js:/.test(line) &&
  (/#view[^'"`]*(\[data-[cw][\]=]|\.tyform\b|\.tyq\b|\.ans\b)/.test(line) ||
    /dataset\.c\b[^;]*\)\.click\(/.test(line) ||
    /press\(['"][1-9]['"]\)/.test(line));

test('the rule catches the hang it is for', () => {
  assert.ok(RAW("      await p.waitForSelector('#view [data-c]:not([disabled])');"));
  assert.ok(RAW("    await p.click('#view [data-c]');"));
  assert.ok(RAW('        (i % 6 === 5 ? bs.find(b => b.dataset.c !== t) : bs.find(b => b.dataset.c === t)).click();'));
  assert.ok(RAW("    await q.waitForSelector('#view .tyform', {timeout: 15000});"));
  assert.ok(RAW("    await p.waitForFunction(() => document.querySelector('#view [data-c]'));"));
  assert.ok(RAW("        .waitForSelector(\n          '#view .q:not(.done) [data-c]:not([disabled])',".split('\n')[1]));
  assert.ok(RAW("    await p.waitForSelector('#view .ans button');"));
  assert.ok(RAW("    await p.keyboard.press('1');"));
  assert.ok(RAW("      const cs = [...document.querySelectorAll('#view .q:not(.done) [data-c]')].map(x => x.dataset.c);"));
  assert.ok(!RAW("    await q.waitForSelector('#view .tyform', {timeout: 15000}); // answer.js: the Tools game"));
  assert.ok(!RAW('      await qa.ready(p);'));
  assert.ok(!RAW("    await q2.waitForSelector('#view [data-cmpk]', {timeout: 15000});"));
  assert.ok(!RAW('        await p.click(\'#lightbox [data-c="save"]\');'));
});

// The app's smokes (admin.smoke.js has no quiz question: its number keys and [data-c] are the admin's own).
test('no smoke waits for or clicks an answer of one format itself: tests/answer.js does', () => {
  const bad = [];
  for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.smoke.js') && f !== 'admin.smoke.js')) {
    const L = fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n');
    // The marker on the line or on a comment line just above it.
    L.forEach((l, i) => RAW(l) && !(i && /^\s*\/\/.*answer\.js:/.test(L[i - 1])) && bad.push(`${f}:${i + 1}: ${l.trim()}`));
  }
  assert.deepStrictEqual(
    bad,
    [],
    'use tests/answer.js (qa.ready, smokeAnswer), or mark a deliberate one "answer.js: <why>" on or above its line'
  );
});
