require('./slot.js').testGuard();
// The Lab's course words (REE-294, REE-34's last part; docs/reviews/2026-11-25-imr-layer-round-3.md section 2). The Lab pages
// write the course's words from core.js ORG, and the IMR edition reads exactly what it read when they were typed: each
// sentence is asserted here as it was, then again with another organisation's words, where it must follow them. The
// lecture sentences with their citation stay literal (tests/orgwords.test.js KEEP), except the glossary's four, which
// proto/anatomy.js reads from data.json terms.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  {ORG} = require('../core.js');
// Another organisation's words: every one of them differs, and none holds the letters IMR.
const FORK = Object.fromEntries(Object.keys(ORG).map(k => [k, 'ZZ ' + k]));

// A Lab module's own module-level fields (its blurb, its lede), run alone with the words given.
function mod(file, org, extra = {}) {
  const added = [],
    ctx = {ORG: org, LAB: {add: m => added.push(m)}, ...extra};
  vm.runInNewContext(read(file), ctx);
  assert.strictEqual(added.length, 1, `${file}: one Lab module`);
  return added[0];
}
// A block of a Lab file run alone, its value read back.
const run = (file, from, to, expr, ctx) => vm.runInNewContext(block(read(file), from, to, {through: 1, file}) + `\n;${expr}`, ctx);

test('Lab words: the Coral ID Key, the map and the Fish ID Key say what they said, and follow ORG', () => {
  const idkey = mod('proto/idkey.js', ORG),
    map = mod('proto/map.js', ORG),
    fk = mod('proto/fishkey.js', ORG);
  assert.strictEqual(
    idkey.blurb,
    'Start from whatever you can see, in any order: growth form, corallites or IMR lecture group. The shortlist updates at once, with all local photos.'
  );
  assert.strictEqual(map.blurb, 'A radial map of the genera, regrouped live by family, IMR lecture group, wall type or corallite size.');
  assert.strictEqual(
    fk.blurb,
    'Every species of the IMR reference PDF, by identification group, family and genus, with the names to pick in EventMeasure.'
  );
  assert.strictEqual(
    fk.lede,
    'Find the name to pick in EventMeasure: type any name, or open a family. Names are those of the IMR reference PDF, with WoRMS beside them when it differs.'
  );
  const F = {idkey: mod('proto/idkey.js', FORK), map: mod('proto/map.js', FORK), fk: mod('proto/fishkey.js', FORK)};
  for (const t of [F.idkey.blurb, F.map.blurb, F.fk.blurb, F.fk.lede]) assert.ok(!/IMR/.test(t) && /ZZ /.test(t), t);
  assert.match(F.idkey.blurb, /corallites or ZZ lecture group\./);
  assert.match(F.map.blurb, /by family, ZZ lecture group, wall/);
  assert.match(F.fk.blurb, /Every species of the ZZ short reference PDF/);
});

test('Lab words: the Coral ID Key and the cards, spot and basics lines say what they said, and follow ORG', () => {
  // The tag of a genus that is not on the list (proto/idkey.js xtag).
  const G = {A: {x: {nonscl: true}}, B: {x: {}}},
    tag = org => run('proto/idkey.js', 'const xtag = ', '\n', 'xtag', {ORG: org, G});
  assert.strictEqual(tag(ORG)('A'), 'Not on IMR list · not a hard coral');
  assert.strictEqual(tag(ORG)('B'), 'Not on IMR list');
  assert.strictEqual(tag(FORK)('B'), 'Not on ZZ list');
  // Spot the feature's question about the lecture's features.
  const Q = org => run('proto/spot.js', 'const Q = {', '};', 'Q', {ORG: org});
  assert.strictEqual(Q(ORG).feat, 'Which feature (IMR lecture or Coral Finder book) does this genus show?');
  assert.strictEqual(Q(FORK).feat, 'Which feature (ZZ lecture or Coral Finder book) does this genus show?');
  // The pages say the course's words wherever they are drawn: no "IMR" is typed in the code of the changed lines.
  assert.match(read('proto/cards.js'), /Not on the \$\{ORG\.short\} coral list, but common at Dauin/);
  assert.match(read('proto/basics.js'), /The \$\{ORG\.course\} uses 7 growth forms: tap one/);
  assert.match(read('proto/basics.js'), /aria-label="The 7 \$\{ORG\.short\} growth forms"/);
  assert.match(read('proto/basics.js'), /<small>\$\{ORG\.lectureRef\}\$\{formSlide\(fid\)/);
});

test('Lab words: Corallite anatomy reads the glossary for the sentences it repeats, and reads as before', () => {
  const DATA = JSON.parse(read('data.json')),
    termLine = vm.runInNewContext(
      block(read('proto/anatomy.js'), 'const termLine = ', '  const CON = [', {file: 'proto/anatomy.js'}) + ';termLine',
      {DATA}
    );
  assert.strictEqual(termLine('Wall'), 'The corallite wall separates septa from costae, and corallite from corallite (IMR Lecture 6).');
  assert.strictEqual(termLine('Septa'), 'Vertical blades inside the coral’s cup-like corallite (IMR Lecture 6).');
  assert.strictEqual(termLine('Costae'), 'When septa cross the wall of the corallite they become costae (IMR Lecture 6).');
  assert.strictEqual(termLine('Coenosteum'), 'Space between separate walls (IMR Lecture 6).');
  // A glossary that moves to another lecture takes the Lab's citation with it; a missing term draws nothing.
  const other = {terms: [['Wall', 'A wall.', 'ZZ Lecture 2, slide 13']]},
    t2 = vm.runInNewContext(
      block(read('proto/anatomy.js'), 'const termLine = ', '  const CON = [', {file: 'proto/anatomy.js'}) + ';termLine',
      {DATA: other}
    );
  assert.strictEqual(t2('Wall'), 'A wall (ZZ Lecture 2).');
  assert.strictEqual(t2('Septa'), '');
  // The concepts read it lazily (the data is not in when the file loads), and the IMR words that follow come from ORG.
  const src = read('proto/anatomy.js');
  for (const t of ['Wall', 'Septa', 'Costae', 'Coenosteum'])
    assert.match(src, new RegExp(`get def\\(\\) \\{\\s+return [^;]*termLine\\('${t}'\\)`), `${t} reads the glossary`);
  assert.match(src, /Recognising its structure is one of the \$\{ORG\.short\} ID tips\./);
  for (const [id, want] of [
    ['meandroid', 'IMR group 5 · meandroid'],
    ['hydno', 'Coral Finder term · IMR: conical mounds'],
    ['solitary', 'IMR group 8 · free-living']
  ]) {
    const re = new RegExp(`id: '${id}',\\s+name: '[^']+',\\s+tech: \`([^\`]+)\``),
      m = src.match(re);
    assert.ok(m, id);
    assert.strictEqual(vm.runInNewContext('`' + m[1] + '`', {ORG}), want);
    assert.strictEqual(vm.runInNewContext('`' + m[1] + '`', {ORG: FORK}).includes('IMR'), false);
  }
});
