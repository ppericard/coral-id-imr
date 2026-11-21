require('./slot.js').testGuard();
// The admin's Look-alikes page, species pairs (REE-46, plan PR 10): the pairs fish.json declares (tools/fish_lookalikes.json,
// every statement sourced: rule C2) as autosort.js speciesPairs reads them, and the players' confusion of a pair
// (speciesPairConf over core.js confusionOf's pooled pairs, at the species units).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const {speciesPairs, speciesPairConf} = require('../autosort.js'),
  {spUnitId} = require('../core.js');
const F = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish.json'), 'utf8'));

test('speciesPairs: every declared pair of fish.json, with its sources and its marks, each cue sourced', () => {
  const P = speciesPairs(F);
  assert.strictEqual(P.length, F.lookalikes.length, 'every pair names species fish.json has');
  assert.ok(P.length >= 7);
  P.forEach(p => {
    assert.ok(p.says.length > 0, p.id + ': a resemblance with its sources');
    assert.ok(p.marks.length > 0, p.id + ': what tells the two apart');
    p.marks.forEach(m => assert.ok(m.sourced && m.src.length > 0 && m.t, p.id + ': every cue sourced (rule C2)'));
    assert.ok(['juvenile', 'all'].includes(p.st.a) && ['juvenile', 'all'].includes(p.st.b), p.id + ': its stages');
  });
});

test('speciesPairs: a pair naming a missing species is left out; marks with no source say so; defaults', () => {
  const F2 = {
    species: [{id: 'a'}, {id: 'b'}],
    lookalikes: [
      {id: 'X1', a: 'a', b: 'b', marks: [{side: 'b', t: 'one', src: [{t: 'S', u: 'https://s'}]}, {t: 'two'}]},
      {id: 'X2', a: 'a', b: 'zzz'},
      {id: 'X3', a: 'a', b: 'a'}
    ]
  };
  const P = speciesPairs(F2);
  assert.deepStrictEqual(
    P.map(p => p.id),
    ['X1']
  );
  assert.deepStrictEqual(P[0].st, {a: 'all', b: 'all'});
  assert.strictEqual(P[0].kind, 'resembles');
  assert.deepStrictEqual(
    P[0].marks.map(m => [m.side, m.sourced]),
    [
      ['b', true],
      ['a', false]
    ]
  );
  assert.deepStrictEqual(speciesPairs(null), []);
});

test('speciesPairConf: the pooled counts over the two species’ units, either order; null when never offered together', () => {
  const p = {a: 's035', b: 's027'},
    key = (x, y) => (x < y ? x + '|' + y : y + '|' + x),
    conf = {
      [key(spUnitId('cn', 's035'), spUnitId('cn', 's027'))]: [10, 3],
      [key(spUnitId('sci', 's027'), spUnitId('sci', 's035'))]: [4, 1],
      'f:A|f:B': [99, 99]
    };
  assert.deepStrictEqual(speciesPairConf(p, conf), [14, 4], 'both species levels, nothing of the families’');
  assert.strictEqual(speciesPairConf(p, {'f:A|f:B': [5, 1]}), null);
  assert.strictEqual(speciesPairConf(p, undefined), null);
});
