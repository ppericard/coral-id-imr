'use strict';
require('./slot.js').testGuard();
// The browser runs the page's classic scripts in ONE shared global scope: two top-level const / let / class of the same
// name, or one of them against a top-level function / var of another script, throw "Identifier 'x' has already been
// declared" and the app never loads. Every other unit test loads one file at a time in its own vm context, so none sees
// it (PR #1092 added a second top-level `boardUnits`: only the browser smokes failed, 13 jobs).
// The scripts are the ones the pages really load, read from index.html (inline scripts first, then the data-tier links
// by tier, the order loadTier() runs them in) and admin.html (its <script src>, in order): no hand-kept list.
// The files are joined in load order and compiled once by V8, which raises the same SyntaxError the browser does.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const file = u => u.replace(/[?#].*$/, '');

// The scripts of a page as [{file}] or [{inline}], in the order the browser runs them.
function scripts(html) {
  const tag = /<script\b([^>]*)>([\s\S]*?)<\/script>|<link\b([^>]*data-tier="(\d+)"[^>]*)>/g;
  const inline = [],
    src = [],
    tiers = [];
  let m;
  while ((m = tag.exec(html))) {
    if (m[3] !== undefined) tiers.push({tier: +m[4], file: file(/href="([^"]+)"/.exec(m[3])[1])});
    else {
      const s = /\bsrc="([^"]+)"/.exec(m[1]);
      if (s) src.push({file: file(s[1])});
      else if (m[2].trim()) inline.push({inline: m[2]});
    }
  }
  // Array.prototype.sort is stable: the document order holds inside a tier.
  const loaded = [...src, ...tiers.sort((a, b) => a.tier - b.tier)];
  return [...inline, ...loaded];
}

// Compile the scripts as one; return null, or the SyntaxError with the file and line it points at.
function clash(list) {
  let code = '',
    line = 1;
  const spans = [];
  for (const s of list) {
    const text = s.inline !== undefined ? s.inline : read(s.file);
    spans.push({name: s.file || '(inline script)', from: line});
    code += text + '\n;\n';
    line += text.split('\n').length + 1;
  }
  try {
    new vm.Script(code, {filename: 'page.js'});
    return null;
  } catch (e) {
    if (!(e instanceof SyntaxError)) throw e;
    const at = /^page\.js:(\d+)/m.exec(e.stack || '');
    const n = at ? +at[1] : 0,
      here = spans.filter(s => s.from <= n).pop();
    // Which other script declares the same name: a hint, the SyntaxError names only the second declaration.
    const id = /Identifier '([^']+)'/.exec(e.message),
      decl = id && new RegExp('^\\s*(?:async\\s+)?(?:const|let|class|var|function\\*?)\\s+' + id[1] + '\\b', 'm'),
      also = id ? list.filter(s => s.file && s.file !== (here && here.name) && decl.test(read(s.file))).map(s => s.file) : [];
    return {message: e.message, file: here ? here.name : '?', line: here ? n - here.from + 1 : n, also};
  }
}

function check(page) {
  const list = scripts(read(page));
  assert.ok(list.filter(s => s.file).length > 5, page + ': the script list is read from the page');
  const bad = clash(list);
  assert.ok(
    !bad,
    bad &&
      page +
        ': ' +
        bad.message +
        ' (' +
        bad.file +
        ' line ' +
        bad.line +
        (bad.also.length ? '; also declared in ' + bad.also.join(', ') : '') +
        '): the page loads its scripts into one global scope, so a top-level name is declared once'
  );
}

test('index.html: no top-level name declared twice across its scripts', () => check('index.html'));
test('admin.html: no top-level name declared twice across its scripts', () => check('admin.html'));

test('the check sees a clash between scripts, whatever the kinds', () => {
  const run = (a, b) => clash([{inline: a}, {inline: b}]);
  assert.ok(run('const x = 1;', 'const x = 2;'));
  assert.ok(run('let x;', 'class x {}'));
  assert.ok(run('function x() {}', 'const x = 1;'));
  assert.ok(run('var x;', 'let x;'));
  assert.strictEqual(run('function x() {}', 'function x() {}'), null);
  assert.strictEqual(run('var x;', 'var x = 1;'), null);
  assert.strictEqual(run('const x = 1;', 'const y = 1; { const x = 2; }'), null);
});
