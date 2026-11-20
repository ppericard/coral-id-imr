require('./slot.js').testGuard();
// Photos › Tree, a family's Names box (admin-content.js; Pierre, 2026-11-08, Q313: "Publie, je corrige à l'usage"): the pure
// part. The shared names of the built file with the families each reaches, his state for each (curation.json fish names), the
// write of one choice, and that what the editor writes is what the game reads (core.js treeNameIndex).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const C = require('../core.js'),
  {namesRows, namesFams, namesPut, namesGet} = require('../admin-content.js');
const F = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish.json'), 'utf8')),
  fam = new Map(F.families.map(f => [f.id, f])),
  rowOf = (R, x) => R.find(r => r.x === x);

test('the shared names: the names two families carry, and the kind words, each with its families', () => {
  const R = namesRows(F, {});
  assert.ok(R.length > 0);
  R.forEach(r => {
    assert.ok(r.owners.length > 0, r.x);
    assert.ok(r.owners.length > 1 || r.owners[0].roles.includes('k'), `${r.x}: one family and no kind word`);
    r.owners.forEach(o => {
      assert.ok(fam.has(o.g), `${r.x}: ${o.g}`);
      assert.strictEqual(o.name, fam.get(o.g).name);
      assert.strictEqual(o.v, '');
    });
  });
  // sorted by name, a name once, owners in the book's order
  assert.deepStrictEqual(
    R.map(r => r.x),
    R.map(r => r.x).sort((a, b) => a.localeCompare(b))
  );
  assert.strictEqual(new Set(R.map(r => r.k)).size, R.length);
  const order = new Map(F.families.map((f, i) => [f.id, i]));
  R.forEach(r =>
    assert.deepStrictEqual(
      r.owners.map(o => order.get(o.g)),
      r.owners.map(o => order.get(o.g)).sort((a, b) => a - b)
    )
  );
  // a name two families carry (the breams), a kind word one family carries
  const bream = rowOf(R, 'bream');
  assert.ok(bream && bream.owners.length >= 2 && bream.owners.every(o => o.roles.includes('k')));
  assert.ok(R.some(r => r.owners.length === 1 && r.owners[0].roles.includes('k')));
  // a subject whose built file has no name index has no shared names
  assert.deepStrictEqual(namesRows({...F, vn: undefined}, {}), []);
  assert.deepStrictEqual(namesRows(null, {}), []);
});

test('his state: read for each family, spellings of one name are one, a name added to a family the index does not give it', () => {
  const b = rowOf(namesRows(F, {}), 'bream'),
    [a, c] = b.owners.map(o => o.g),
    cur = {Bream: {[a]: 'off', [c]: 'often', 'no:such:family': 'on'}, 'Zebra Fish': {[a]: 'on'}, junk: {[a]: 'maybe'}};
  const R = namesRows(F, cur),
    b2 = rowOf(R, 'bream');
  assert.deepStrictEqual(
    b2.owners.map(o => [o.g, o.v]),
    [
      [a, 'off'],
      [c, 'often']
    ]
  );
  assert.strictEqual(namesGet(cur, 'bream', a), 'off');
  assert.strictEqual(namesGet(cur, 'BREAM', c), 'often');
  assert.strictEqual(namesGet(cur, 'bream', 'nobody'), '');
  // a name of his own: a row with its family, marked added; an unknown family or a state of no kind never shows
  const z = rowOf(R, 'Zebra Fish');
  assert.deepStrictEqual(
    z.owners.map(o => [o.g, o.v, o.roles]),
    [[a, 'on', ['cur']]]
  );
  assert.ok(!rowOf(R, 'junk'));
  assert.ok(namesFams(F, cur).has(a));
  assert.ok(!namesFams(F, {}).has('no:such:family'));
});

test('one choice: set, replaced, brought back; the key he already has is kept, an emptied name goes, the input is not touched', () => {
  const g = F.families[0].id,
    h = F.families[1].id,
    A = {};
  const one = namesPut(A, 'bream', g, 'off');
  assert.deepStrictEqual(one, {bream: {[g]: 'off'}});
  assert.deepStrictEqual(A, {});
  const two = namesPut(one, 'Bream', h, 'on');
  assert.deepStrictEqual(two, {bream: {[g]: 'off', [h]: 'on'}}, 'same name, same key');
  assert.deepStrictEqual(one, {bream: {[g]: 'off'}});
  assert.deepStrictEqual(namesPut(two, 'bream', g, 'often'), {bream: {[g]: 'often', [h]: 'on'}});
  assert.deepStrictEqual(namesPut(two, 'bream', g, ''), {bream: {[h]: 'on'}});
  assert.deepStrictEqual(namesPut(namesPut(two, 'bream', g, ''), 'bream', h, ''), {});
  assert.deepStrictEqual(namesPut(undefined, 'x', g, 'bad'), {}, 'a state of no kind writes nothing');
  assert.deepStrictEqual(namesPut({other: {[g]: 'on'}}, 'bream', g, 'off'), {other: {[g]: 'on'}, bream: {[g]: 'off'}});
});

test('what the editor writes is what the game reads (core.js treeNameIndex)', () => {
  const b = rowOf(namesRows(F, {}), 'bream'),
    [a, c] = b.owners.map(o => o.g),
    at = (cur, g) => C.treeNameIndex(F, cur).filter(e => C.typeNormAll(e.x) === 'bream' && (e.g === g || e.off === g));
  // as built: both families carry it, scoped to their species
  assert.ok(at({}, a).some(e => e.g === a && e.sc && e.sc.length));
  // Off: the family no longer reads it (and the name stays known); the other family still does
  const off = namesPut({}, 'bream', a, 'off');
  assert.ok(at(off, a).every(e => !e.g) && at(off, a).some(e => e.off === a));
  assert.ok(at(off, c).some(e => e.g === c));
  // Accepted: the whole family (no scope); Often: the same, with the feedback naming the family gently
  const on = at(namesPut({}, 'bream', a, 'on'), a).find(e => e.g === a);
  assert.ok(on && !on.sc && !on.oft);
  const often = at(namesPut({}, 'bream', a, 'often'), a).find(e => e.g === a);
  assert.ok(often && !often.sc && Array.isArray(often.oft));
  // a name of his own, which the index does not give, is read as that family's
  const mine = C.treeNameIndex(F, namesPut({}, 'Zebra Fish', a, 'on')).find(e => C.typeNormAll(e.x) === 'zebrafish');
  assert.ok(mine && mine.g === a);
});

test('the Names box and the Shared names filter are wired into the Tree page, and the draft says it changed', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8');
  assert.match(src, /namesBox\(S, C\.base, sel, tag && tag\.k\)/);
  assert.match(src, /namesBind\(\$v, S, C\.base\)/);
  assert.match(src, /namesFams\(FISHC\.raw, F\.names\)/);
  assert.match(src, /nDiff\(D\.names, V\.names\)/);
});
