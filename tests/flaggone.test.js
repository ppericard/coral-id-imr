require('./slot.js').testGuard();
// A flag clears itself when its photo leaves play (Pierre, 2026-11-20, docs/decisions/): autosort.js flagGone, the
// predicate behind admin.js flagStale / sweepFlags. The admin's click paths are in tests/admin.smoke.js (To do › Reports).
const test = require('node:test'),
  assert = require('node:assert');
const A = require('../autosort.js');

test('corals: Remove, ×, Not this take the flag with them; a photo in play keeps it', () => {
  const C = {
    genera: {A: {hide: ['a-1']}, B: {out: {'b-1': 'A'}}},
    exclude: {'c-1': 'excluded'}
  };
  // the corals' part is the curation itself
  ['a-1', 'b-1', 'c-1'].forEach(f => assert.strictEqual(A.flagGone(C, C, f, {genus: 'A'}), true, f));
  assert.strictEqual(A.flagGone(C, C, 'd-1', {genus: 'A'}), false);
  const E = {};
  assert.strictEqual(A.flagGone(E, E, 'a-1', {}), false, 'an empty curation');
  assert.strictEqual(A.flagGone(undefined, undefined, 'a-1', {}), false, 'no curation');
});

test('a subject with its own part: out, excluded or rejected (seen), by the photo file or the flag key', () => {
  const C = {fish: {out: {'fish-s1-cand-1': 's2'}, exclude: {'fish-s2-cand-2': 'excluded'}, seen: {'fish-s3-cand-3': 1}}};
  ['fish-s1-cand-1', 'fish-s2-cand-2', 'fish-s3-cand-3'].forEach(file =>
    assert.strictEqual(A.flagGone(C, C.fish, 'i' + file.split('-').pop(), {file}), true, file)
  );
  assert.strictEqual(A.flagGone(C, C.fish, 'i9', {file: 'fish-s9-cand-9'}), false);
  assert.strictEqual(A.flagGone(C, C.fish, 'fish-s3-cand-3', {}), true, 'a flag keyed by the file itself');
  assert.strictEqual(A.flagGone({}, {}, 'i1', {file: 'x'}), false, 'no part yet');
});

test('a Not this naming the species the photo was added under keeps it in play (core.js treePhotoOn)', () => {
  const C = {fish: {add: {'fish-s1-cand-1': 's1', 'fish-s2-cand-2': 's2'}, out: {'fish-s1-cand-1': 's1', 'fish-s2-cand-2': 's9'}}};
  assert.strictEqual(A.flagGone(C, C.fish, 'i1', {file: 'fish-s1-cand-1'}), false, 'corrected and re-added: in play');
  assert.strictEqual(A.flagGone(C, C.fish, 'i2', {file: 'fish-s2-cand-2'}), true, 'sent to another species: gone');
});

test('fixture: a flag on an excluded photo is gone, one on a photo in play stays', () => {
  const C = {
    fish: {
      exclude: {'fish-s1-cand-1': 'excluded'},
      flag: {i1: {file: 'fish-s1-cand-1'}, i2: {file: 'fish-s2-cand-2'}}
    }
  };
  const gone = Object.entries(C.fish.flag)
    .filter(([k, fl]) => A.flagGone(C, C.fish, k, fl))
    .map(x => x[0]);
  assert.deepStrictEqual(gone, ['i1']);
});
