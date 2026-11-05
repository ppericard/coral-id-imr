// Every read of the sync sheet's photo stats (?stats=1) made by this repository's code carries an app version (av).
// The sheet logs a ?stats=1 read without one as an app from before 2026-11-03 (Code.gs v25 'old'); on 2026-11-05 the
// only 'old' rows came from such reads by the project's own tools and agents, not from players' devices, and sent the
// investigation of an old app version the wrong way (PR #561: tools/brief.py; the admin's read-only page; learnsim
// --stats live). A name that is no build number (av=admin, brief, learnsim, tool) is never taken for a stale app
// either (Code.gs behind_ reads a leading build number only).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');

const ROOT = path.join(__dirname, '..');
const files = execFileSync('git', ['ls-files', '*.js', '*.py', '*.sh', '*.yml', '*.html', '*.md'], {cwd: ROOT, encoding: 'utf8'})
  .split('\n')
  .filter(f => f && !f.startsWith('tests/') && f !== 'tools/sync/Code.gs' && !f.startsWith('docs/archive/'));

// The code part of a line (a // or # comment and prose around it are not a request).
const code = (f, line) => (/\.(md)$/.test(f) ? line : line.replace(/^\s*(\/\/|#).*$/, '').replace(/\s\/\/\s.*$/, ''));

test('every ?stats=1 request in the repository carries av', () => {
  const bad = [];
  for (const f of files) {
    let src;
    try {
      src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    } catch (e) {
      continue; // a sparse checkout leaves some tracked files out
    }
    src.split('\n').forEach((line, i) => {
      const c = code(f, line);
      if (!/\?stats=1/.test(c)) return;
      // Docs: only commands (curl, wget, a URL with the script's address) are requests; a mention in prose is not. Code:
      // only a string that holds it (a docstring's prose is no request).
      if (/\.md$/.test(f) ? !/curl|wget|exec\?stats=1|SYNC_URL>?\?stats=1/.test(c) : !/(['"`])[^'"`]*\?stats=1/.test(c)) return;
      if (/[?&]av=/.test(c)) return;
      // The admin's GET helper adds av=admin to every query it is given (admin.js loadStats get).
      if (f === 'admin.js' && /\bget\('\?stats=1'\)|old\(j, '\?stats=1'\)/.test(c)) return;
      bad.push(`${f}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepStrictEqual(bad, [], 'a ?stats=1 read without av is logged as an old app');
  // The admin's helper really adds it.
  const admin = fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8');
  assert.match(admin, /const get = q =>\s*fetch\(SYNC_URL \+ q \+ '&av=admin'\)/);
});
