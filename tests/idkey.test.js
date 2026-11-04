// The Coral Finder tool became the Coral ID Key (Pierre, 2026-11-04): the name Coral Finder is the book's (R. Kelley,
// BYOGUIDES, 2022; copyrighted), and the app's tool must not look like it. Alpha (AGENTS.md rule 24b): renamed
// everywhere, no old name kept for old links or old app versions; the stored data moves once (core.js migrateIdKey on
// the devices, Code.gs ONCE_ idkey in the sheet). These checks keep it so: node --test tests/
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
const {migrateKeys, migrateIdKey} = require('../core.js');
const {loadCodeGs} = require('./gas.js');

const ROOT = path.join(__dirname, '..');
const tracked = () => execFileSync('git', ['ls-files'], {cwd: ROOT, encoding: 'utf8'}).split('\n').filter(Boolean);
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// Lines that may still name the old identifiers: the one-shot migrations (they must name what they move).
const MIGRATION = /idkey-migration/;
const migrationBlocks = s => s.replace(/\/\/ idkey-migration: begin[\s\S]*?\/\/ idkey-migration: end/g, '');

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
    migrationBlocks(read(f))
      .split('\n')
      .forEach((l, i) => {
        if (MIGRATION.test(l)) return;
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

// A Storage stand-in, as in tests/core.test.js.
const store = (init = {}) => {
  const m = new Map(Object.entries(init));
  return {
    get length() {
      return m.size;
    },
    key: i => [...m.keys()][i] ?? null,
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    dump: () => Object.fromEntries(m)
  };
};

test('the device data moves once to the new names (core.js migrateIdKey)', () => {
  // idkey-migration: begin
  const s = store({
    'reefid-finder-x': 'false',
    'reefid-finder-lay': '"grid"',
    'imr-finder-pv': '"book"', // from before the app's rename: migrateKeys, then migrateIdKey (rename-app: keep)
    'reefid-admin-fcov': '{"set":"x"}',
    'reefid-sync-size': '{"finder":"l","lab-finder":"s","genera":"m"}',
    'reefid-lab-votes': '{"finder":"keep","size":"trim"}',
    'reefid-admin-view': '{"cov":"~fcov","photos":"~cand"}',
    'reefid-admin-sub': '{"todo":"~fcov"}',
    'reefid-sync-coral-progress': '{"Porites":{"ok":3}}'
  });
  migrateKeys(s);
  assert.deepStrictEqual(migrateIdKey(s).sort(), [
    'reefid-admin-kcov',
    'reefid-admin-sub',
    'reefid-admin-view',
    'reefid-idkey-lay',
    'reefid-idkey-pv',
    'reefid-idkey-x',
    'reefid-lab-votes',
    'reefid-sync-size'
  ]);
  assert.deepStrictEqual(s.dump(), {
    'reefid-idkey-x': 'false',
    'reefid-idkey-lay': '"grid"',
    'reefid-idkey-pv': '"book"',
    'reefid-admin-kcov': '{"set":"x"}',
    'reefid-sync-size': '{"genera":"m","idkey":"l","lab-idkey":"s"}',
    'reefid-lab-votes': '{"size":"trim","idkey":"keep"}',
    'reefid-admin-view': '{"cov":"~kcov","photos":"~cand"}',
    'reefid-admin-sub': '{"todo":"~kcov"}',
    'reefid-sync-coral-progress': '{"Porites":{"ok":3}}'
  });
  // Done: a second start changes nothing.
  assert.deepStrictEqual(migrateIdKey(s), []);
  // A value already under the new name wins; the old one goes.
  const b = store({'reefid-finder-x': 'false', 'reefid-idkey-x': 'true', 'reefid-sync-size': '{"finder":"l","idkey":"s"}'});
  migrateIdKey(b);
  assert.deepStrictEqual(b.dump(), {'reefid-idkey-x': 'true', 'reefid-sync-size': '{"idkey":"s"}'});
  // Broken values are left alone; nothing throws.
  const c = store({'reefid-sync-size': 'not json', 'reefid-lab-votes': '[1]'});
  assert.deepStrictEqual(migrateIdKey(c), []);
  // idkey-migration: end
});

test('the sheet moves its logged page names once, by the new script itself, and says so in the Deploy log', () => {
  const CODE = read('tools/sync/Code.gs');
  const google = {
    fetch: url => (url.includes('raw.githubusercontent.com') ? {getResponseCode: () => 200, getContentText: () => CODE} : null)
  };
  const s = loadCodeGs({fetch: google.fetch});
  const tab = (name, head, rows) => {
    const sh = s.ctx.SpreadsheetApp.getActiveSpreadsheet().insertSheet(name);
    sh.appendRow(head);
    rows.forEach(r => sh.appendRow(r));
    return sh;
  };
  const list = name => JSON.parse(new RegExp(`const ${name} = (\\[[^\\]]*\\])`).exec(CODE)[1].replace(/'/g, '"')),
    EVH = list('EVH'),
    REP = list('REP'),
    VERSION = Number(/const VERSION = (\d+);/.exec(CODE)[1]),
    ev = (page, det) => [new Date(), 'dev1', 'pages', 'id', '', page, det, 'v1', 'Chrome', 'e' + Math.random().toString(36).slice(2, 8)];
  // idkey-migration: begin
  const P = tab('Pages', EVH, [
    ev('finder|form=M', '{"r":{"finder":[3,40],"lab-finder":[1,5],"genera":[2,9]},"g":{},"vi":"a1"}'),
    ev('genera', '{"r":{"genera":[1,2]}}')
  ]);
  const E = tab('Events', EVH, [ev('lab-finder', '{"p0":"finder","nx":"quiz"}')]);
  const where = REP.indexOf('Where');
  const R = tab('Reports', REP, [REP.map((h, i) => (i === where ? 'finder|form=M;box=M1' : i === 0 ? new Date() : 'x'))]);
  // idkey-migration: end
  assert.match(s.ctx.autoUpdate(), /^up to date/);
  assert.strictEqual(P.rows[1][5], 'idkey|form=M');
  assert.deepStrictEqual(JSON.parse(P.rows[1][6]).r, {idkey: [3, 40], 'lab-idkey': [1, 5], genera: [2, 9]});
  assert.strictEqual(P.rows[2][6], '{"r":{"genera":[1,2]}}', 'other rows untouched');
  assert.strictEqual(E.rows[1][5], 'lab-idkey');
  assert.deepStrictEqual(JSON.parse(E.rows[1][6]), {p0: 'idkey', nx: 'quiz'});
  assert.strictEqual(R.rows[1][where], 'idkey|form=M;box=M1');
  assert.ok(s.props.ONCE_idkey, 'marked done');
  const log = s.sheets['Deploy log'].rows.slice(1).map(r => String(r[1]));
  assert.deepStrictEqual(log, [`one-shot idkey (v${VERSION}): page names finder → idkey: Pages 2, Events 2, Reports 1 cells`]);
  // Once only: a later run neither rewrites nor logs.
  P.rows[1][5] = 'finder';
  s.ctx.autoUpdate();
  assert.strictEqual(P.rows[1][5], 'finder');
  assert.strictEqual(s.sheets['Deploy log'].rows.length, 2);
});
