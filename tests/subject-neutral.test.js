// Rule S1 (docs/rules/subjects.md): a subject differs only by a field of core.js SUBJECTS or a function of app.js UNITS; the engine
// works on the current subject and never tests which one it is (test-suite review, 2026-11-04: nothing held it). In the
// app's and the admin's files, outside the SUBJECTS list of core.js: no subject id or name as a string literal ('coral',
// 'fish', 'Corals'...), no comparison of a subject's id with a literal, and no test of the subject by its place in
// SUBJECTS (SUBJ === SUBJECTS[k]) but the ones listed below, each with its reason.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  FILES = [
    ...fs.readdirSync(ROOT).filter(f => f.endsWith('.js')),
    ...fs.readdirSync(path.join(ROOT, 'proto')).map(f => 'proto/' + f)
  ].filter(f => f.endsWith('.js')),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const core = read('core.js'),
  SUBJECTS = block(core, 'const SUBJECTS = [', '\n  ];', {through: true, file: 'core.js'}),
  ids = [...SUBJECTS.matchAll(/\bid: '([^']+)'/g)].map(m => m[1]),
  names = [...SUBJECTS.matchAll(/\bname: '([^']+)'/g)].map(m => m[1]),
  words = [...new Set([...ids, ...names, ...ids.map(s => s + 's')])];
// The exceptions, each with its reason: [file, the line's text, the docs/ROADMAP.md row that removes it (if any)]. An
// entry whose line is gone fails (the exception went: drop it), and so does one whose ROADMAP row is gone (the row was
// done or dropped without the code): an exception never outlives its reason.
const ALLOWED = [
  // The recalculations announced so far were the corals' (the first subject): their pop-up is shown in that subject.
  ['progress.js', 'if (SUBJ !== SUBJECTS[0]) return inSubject(SUBJECTS[0].id, recalcNotice);']
];
const allowed = (f, line) => ALLOWED.some(([af, l]) => af === f && line.includes(l));

test('rule S1: every exception still exists, with its ROADMAP row', () => {
  const roadmap = fs.readFileSync(path.join(ROOT, 'docs', 'ROADMAP.md'), 'utf8');
  for (const [f, line, row] of ALLOWED) {
    assert.ok(read(f).includes(line), `stale exception, its line is gone from ${f}: drop it from ALLOWED (${line})`);
    if (row)
      assert.ok(roadmap.includes(row), `the exception in ${f} names the ROADMAP row "${row}", which is gone: fix the code or the row`);
  }
});

test('rule S1: the engine never names nor tests a subject', () => {
  assert.ok(ids.length >= 2 && ids.includes('coral'), JSON.stringify(ids));
  const lit = new RegExp(`(['"\`])(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\1`),
    bad = [];
  for (const f of FILES) {
    const src = f === 'core.js' ? core.replace(SUBJECTS, '') : read(f);
    src.split('\n').forEach((line, i) => {
      const at = `${f}:${i + 1}: ${line.trim()}`;
      if (allowed(f, line) || /^\s*(\/\/|\/?\*)/.test(line)) return; // comment lines may name a subject
      if (lit.test(line)) bad.push('subject literal ' + at);
      if (/\bSUBJ(?:\.id)?\s*[!=]==?\s*['"`]|['"`][^'"`]*['"`]\s*[!=]==?\s*SUBJ\.id\b|\bSUBJ\.id\s*[!=]==?\s*[A-Z_]+\.SUBJ\b/.test(line))
        bad.push('subject id compared ' + at);
      if (
        /\bSUBJ\s*[!=]==?\s*SUBJECTS\[|\bSUBJECTS\[[^\]]+\]\s*[!=]==?\s*SUBJ\b/.test(line) &&
        !ALLOWED.some(([af, l]) => af === f && line.includes(l))
      )
        bad.push('subject tested by its place ' + at);
    });
  }
  assert.deepStrictEqual(bad, []);
});
