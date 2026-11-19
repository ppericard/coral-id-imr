require('./slot.js').testGuard();
// A flag clears itself when its photo leaves play (Pierre, 2026-11-20, docs/decisions/): autosort.js flagGone, the
// predicate behind admin.js flagStale / sweepFlags. The admin's click paths are in tests/admin.smoke.js (To do › Reports).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const A = require('../autosort.js');
const CUR = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'curation.json'), 'utf8'));

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

test('the published curation: every fish flag on an excluded photo (by file) is gone, the others stay', () => {
  const F = CUR.fish.flag,
    ex = Object.entries(F)
      .filter(([, fl]) => (CUR.fish.exclude || {})[fl.file])
      .map(x => x[0]),
    gone = Object.entries(F)
      .filter(([k, fl]) => A.flagGone(CUR, CUR.fish, k, fl))
      .map(x => x[0]);
  assert.ok(ex.length, 'the published curation holds flags on excluded photos (the gap this closes)');
  ex.forEach(k => assert.ok(gone.includes(k), k));
  assert.ok(gone.length < Object.keys(F).length, 'a flag on a photo still in play is kept');
});
