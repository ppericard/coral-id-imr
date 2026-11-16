require('./slot.js').testGuard();
// The Coral Finder tool became the Coral ID Key (Pierre, 2026-11-04): the name Coral Finder is the book's (R. Kelley,
// BYOGUIDES, 2022; copyrighted), and the app's tool must not look like it. Alpha (rule W3): renamed
// everywhere, no old name kept for old links or old app versions. The stored data moved once (the devices' one-shot and
// the sheet's, both removed on 2026-11-15 once every device had run it). These checks keep it so: node --test tests/
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');

const ROOT = path.join(__dirname, '..');
const tracked = () => execFileSync('git', ['ls-files'], {cwd: ROOT, encoding: 'utf8'}).split('\n').filter(Boolean);
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('no identifier of the tool keeps the old name (routes, files, keys, classes, functions)', () => {
  // Code only: data files hold the book's citations ("Coral Finder p. 63"), dated records keep their words, and the
  // judging package's coral_finder is the book's criteria. The book's own name ("Coral Finder", the slide's quote
  // "CoralFinder") is allowed; any other "finder" (#finder, proto/finder.js, reefid-finder-*, finder_only, Finder-only,
  // a .fd* class of the tool, fcov) is not.
  const code = tracked().filter(
    f =>
      /\.(js|css|html|py|gs|yml|sh|webmanifest)$/.test(f) && !/^(img|tools\/archive|judging|docs)\//.test(f) && f !== 'tests/idkey.test.js'
  );
  assert.ok(code.includes('proto/idkey.js') && !tracked().includes('proto/finder.js'), 'proto/finder.js is proto/idkey.js');
  const bad = [];
  code.forEach(f =>
    read(f)
      .split('\n')
      .forEach((l, i) => {
        const t = l.replace(/Coral Finder|CoralFinder|coral_finder/g, '');
        if (/finder|\bfcov/i.test(t) || /(?<![\w-])fd(?!rop)[a-z][\w-]*/.test(t)) bad.push(`${f}:${i + 1}: ${l.trim().slice(0, 120)}`);
      })
  );
  assert.deepStrictEqual(bad, []);
});

test('players and the admin see "Coral Finder" only for the book (a page, the 2022 book, its photos, terms or text)', () => {
  // Every string of the app's and the admin's code (comments left out) that says Coral Finder names the book: a page
  // citation (Coral Finder p. 63), the book itself (Coral Finder 2022, the Coral Finder book…), the source pill of a
  // look-alike pair (<b>Coral Finder</b> p. 63), the book's terms or text. The tool is the Coral ID Key.
  const BOOK = /^Coral Finder( p\b| 2022| book| term| text|<\/b>| \/)/;
  const files = tracked().filter(f => /\.(js|html|webmanifest)$/.test(f) && !/^(tests|tools|judging|docs|img)\//.test(f));
  const bad = [];
  files.forEach(f => {
    const s = read(f).replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
    s.split('\n').forEach((l, i) => {
      if (/^\s*(\/\/|<!--)/.test(l)) return;
      const c = l.replace(/\s\/\/\s.*$/, '');
      for (const m of c.matchAll(/Coral Finder/g))
        if (!BOOK.test(c.slice(m.index))) bad.push(`${f}:${i + 1}: ${c.slice(m.index, m.index + 50)}`);
    });
  });
  assert.deepStrictEqual(bad, []);
  const name = [read('index.html'), read('tools/og/og.html'), read('manifest.webmanifest')].join('\n');
  assert.ok(!/Coral Finder/.test(name), 'the page title, social card and manifest do not name the book');
});
