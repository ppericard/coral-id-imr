require('./slot.js').testGuard();
// Photos › Tree, the node pages' photo curation shared by every subject's tree (admin-nodephotos.js; the former corals'
// Photos › Genera tab, folded into the Tree, Pierre 2026-11-19): the pure part, which unit an excluded photo belongs to,
// and the tags that count the units with something taken off the site or excluded (admin-coraltree.js ctFilters).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const {npExcluded, npUnder} = require('../admin-nodephotos.js'),
  {ctFilters} = require('../admin-coraltree.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

test('npExcluded: a photo data.json still holds belongs to its record’s unit', () => {
  const L = npExcluded({'a-1': 'excluded'}, {'a-1': {genus: 'Acropora', f: 'a-1'}}, ['Acropora'], {});
  assert.deepStrictEqual(L, [{f: 'a-1', p: {genus: 'Acropora', f: 'a-1'}, unit: 'Acropora', gone: false}]);
});

test('npExcluded: a photo gone from data.json takes its unit from its file name, and its iNaturalist id for a thumbnail', () => {
  const [a, b, c] = npExcluded(
    {'acropora-12345678': 'excluded', 'porites-9': 'excluded', 'unknownus-12345': 'excluded'},
    {},
    ['Acropora', 'Porites'],
    {}
  );
  assert.strictEqual(a.unit, 'Acropora');
  assert.strictEqual(a.inat, '12345678');
  assert.ok(a.gone && !a.lecture);
  assert.strictEqual(b.unit, 'Porites');
  assert.strictEqual(b.inat, undefined); // fewer than 5 digits: not an iNaturalist photo id
  assert.strictEqual(c.unit, ''); // no unit has it any more
  assert.ok(!c.lecture);
});

test('npExcluded: an IMR lecture photo takes its genus and slide from another photo of the same lecture page', () => {
  const course = {Stylophora: [{f: 'imrl-p10_g42', slide: 7}], Porites: [{f: 'imrl-p11_i1', slide: 9}]};
  const [a, b] = npExcluded({'imrl-p10_i7': 'excluded', 'imrl-p55_i2': 'excluded'}, {}, ['Stylophora'], course);
  assert.strictEqual(a.unit, 'Stylophora');
  assert.strictEqual(a.slide, 7);
  assert.ok(!a.lecture);
  // a page no longer in the course: no unit, said to be a lecture photo
  assert.strictEqual(b.unit, '');
  assert.ok(b.lecture);
});

test('npExcluded: on the real data, every excluded photo is listed once, and the ones with no unit are the exception', () => {
  const cur = read('curation.json'),
    d = read('data.json'),
    names = Object.keys({...d.gen, ...((d.x || {}).gen || {})}), // as the admin holds it: the x genera merged into gen
    L = npExcluded(cur.exclude, {}, names, d.course);
  assert.strictEqual(L.length, Object.keys(cur.exclude || {}).length);
  assert.strictEqual(new Set(L.map(x => x.f)).size, L.length);
  // every one named by its file name finds its genus; a lecture photo of a page the course no longer has is the one kind left over
  const lost = L.filter(x => !x.unit);
  assert.ok(
    lost.every(x => x.lecture),
    JSON.stringify(lost.map(x => x.f))
  );
});

test('npUnder: the items of the given units, in their own order', () => {
  const L = [
    {f: 'a', unit: 'X'},
    {f: 'b', unit: 'Y'},
    {f: 'c', unit: 'X'},
    {f: 'd', unit: ''}
  ];
  assert.deepStrictEqual(
    npUnder(L, ['X']).map(x => x.f),
    ['a', 'c']
  );
  assert.deepStrictEqual(npUnder(L, []), []);
  assert.deepStrictEqual(
    npUnder(L, ['']).map(x => x.f),
    ['d']
  );
});

test('the Tree’s tags: Removed photos and Excluded photos come with the counts the adapter gives, and only then', () => {
  const d = read('data.json');
  Object.assign(d.gen, d.x.gen);
  assert.ok(!ctFilters(d, {}).some(x => x.k === 'removed' || x.k === 'excluded'));
  const F = ctFilters(d, {removed: n => (n === 'Acropora' ? 2 : 0), excluded: n => (n === 'Porites' ? 1 : 0)}),
    node = id => ({id, genus: id}),
    rm = F.find(x => x.k === 'removed'),
    ex = F.find(x => x.k === 'excluded');
  assert.ok(rm && ex);
  assert.ok(rm.on(node('Acropora')) && !rm.on(node('Porites')));
  assert.ok(ex.on(node('Porites')) && !ex.on(node('Acropora')));
  // a group is no genus: never carries the tag itself (its leaves do)
  assert.ok(!rm.on({id: 'k:1'}));
});
