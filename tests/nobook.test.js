// No Coral Finder book crop anywhere (Pierre, 2026-11-08: the crops of the Coral Finder 2022 book, (c) R. Kelley /
// BYOGUIDES, left the app and the repository; tools/apply_no_book.py). Its page citations ("Coral Finder p. N"), facts
// and look-alike sources stay. curation.json is never rewritten (rule A1): its old references to crops match no photo
// and every step drops them, checked here on the real files.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
const {applyCuration, applySlots, cfCrop} = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  CROP = /^img\/[a-z]+-cf-\d/;

test('cfCrop names a crop id, never another photo', () => {
  assert.ok(cfCrop('acropora-cf-2-00') && cfCrop('lobophyllia-cf-20-g21'));
  ['acropora-medium-123', 'imrl-p40_i1', 'cf-1', 'acropora-cfx-2', '', undefined].forEach(f => assert.ok(!cfCrop(f), String(f)));
});

test('no crop file in the repository (img/<genus>-cf-<page>-<tag>)', () => {
  // The index, so a sparse checkout without img/ checks it too; and what is on disk, when img/ is there.
  const L = execFileSync('git', ['ls-files', 'img/'], {cwd: ROOT, encoding: 'utf8'}).split('\n');
  assert.deepStrictEqual(L.filter(f => CROP.test(f)).slice(0, 5), []);
  const dir = path.join(ROOT, 'img');
  if (fs.existsSync(dir) && !fs.lstatSync(dir).isSymbolicLink())
    assert.deepStrictEqual(
      fs.readdirSync(dir).filter(f => CROP.test('img/' + f)),
      []
    );
});

// curation.json and the players' copy the deploy and the smokes write from it (curation-play.json, tools/curplay.py; Codex
// review #818: a smoke run left it in the checkout) keep Pierre's old references, which the app ignores (core.js cfCrop).
test('no crop record in the data files (every JSON but curation.json and its players copy)', () => {
  const files = [
    ...fs.readdirSync(ROOT).filter(f => f.endsWith('.json') && f !== 'curation.json' && f !== 'curation-play.json'),
    ...fs
      .readdirSync(path.join(ROOT, 'judging'))
      .filter(f => f.endsWith('.json'))
      .map(f => 'judging/' + f)
  ];
  files.forEach(f => {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!/"[a-z]+-cf-\d/.test(s), `${f} names a Coral Finder book crop`);
  });
  const d = read('data.json');
  Object.entries({...d.gen, ...((d.x || {}).gen || {})}).forEach(([n, g]) => assert.ok(!('book' in g), `${n}: a "book" list`));
  [...d.key, ...((d.x || {}).groups || [])].forEach(k => k.leaves.forEach(l => assert.ok(!('ph' in l), `box ${l.id}: crops ("ph")`)));
  // The page citations stay: every box keeps its pages.
  d.key.forEach(k => k.leaves.forEach(l => assert.ok(l.a && l.b, `box ${l.id}: its Coral Finder pages`)));
});

test("curation.json's old crop references match no photo on the site", () => {
  const d = read('data.json'),
    c = read('curation.json');
  applyCuration(d, c);
  applySlots(d, c, {picks: read('picks.json'), autoq: read('quality.json').q || {}});
  Object.entries(d.gen).forEach(([n, g]) => {
    const all = [
      ...Object.values(g.views || {}).flat(),
      ...Object.values(g.more || {}).flat(),
      ...Object.values(g.sl || {}).flatMap(s => [...s.feat, ...s.more, ...s.game, ...s.idkey])
    ];
    all.forEach(p => assert.ok(!cfCrop(p.f) && !p.cf, `${n}: ${p.f}`));
  });
});

test('a crop pinned, added or made the cover in a curation is dropped, the genus keeps its own photos', () => {
  const P = [...Array(4)].map((_, i) => ({f: 'g-wide-' + i, o: 'https://www.inaturalist.org/observations/' + i, a: 'X'}));
  const d = {gen: {G: {views: {wide: P}}}, course: {}};
  const c = {genera: {G: {cover: 'g-cf-2-00', feat: {wide: ['g-cf-2-00', 'g-wide-3']}, add: {'g-cf-2-01': 'wide'}}}};
  applyCuration(d, c);
  applySlots(d, c, {});
  const s = d.gen.G.sl.wide;
  assert.deepStrictEqual(
    s.feat.map(p => p.f),
    ['g-wide-3', 'g-wide-0', 'g-wide-1']
  );
  assert.ok(![...s.feat, ...s.more, ...s.game, ...s.idkey, ...d.gen.G.views.wide].some(p => cfCrop(p.f)));
});

test('no code path reads the book crops any more', () => {
  ['core.js', 'app.js', 'admin.js', 'proto/idkey.js', 'analysis.js'].forEach(f => {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!/\.book\b|\bBOOKON\b|\bbookOn\b|© R\. Kelley/.test(s), `${f} still handles the book's crops`);
  });
});
