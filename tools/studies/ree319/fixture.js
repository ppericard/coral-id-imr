// REE-319's controls on a fixed synthetic unit, through the app's own reserveOf (core.js) and this study's signals
// (overlap.js). Exits non-zero when a control fails. Read-only, no data file read.
//
//   node tools/studies/ree319/fixture.js
//
// One unit of 45 specimens, each with a wide and a macro file (the issue's reproduced condition), for a fixed player id:
//   1. same specimen identifier on both files: no reserved specimen has a sibling left in practice;
//   2. the identifier left out (the filename fallback): the reserved files' siblings stay in practice (the known failure);
//   3. one file per specimen, no identifier (a valid unique-file case): no sibling anywhere, all clean;
//   4. distinct specimens that share a generic source page as o (a FishBase page): reserveOf keeps them under one key,
//      so they are never split across the pools (conservative), and no signal pairs them under another key.
const assert = require('assert'),
  path = require('path');
const C = require(path.join(__dirname, '..', '..', '..', 'core.js'));
const {photosOf, index, partners} = require('./overlap.js');

const ID = 'ree319-fixture';
const spec = i => 'spec' + String(i).padStart(2, '0');
const unit = photos =>({gen: {Testgenus: {views: {wide: photos.filter(p => p.v === 'wide'), macro: photos.filter(p => p.v === 'macro')}}}});
const two = withO =>
  Array.from({length: 45}, (_, i) =>
    ['wide', 'macro'].map(v => ({f: `testgenus-${v}-${spec(i)}`, v, s: spec(i), ...(withO ? {o: 'https://www.inaturalist.org/observations/' + (1000 + i)} : {})}))
  ).flat();
// held specimens with a file of the same specimen in practice (truth: the fixture's s)
function crossings(L) {
  const X = unit(L),
    R = C.reserveOf(X, ID),
    key = p => 'Testgenus ' + C.treeObs(p),
    held = L.filter(p => R.has(key(p))),
    prac = L.filter(p => !R.has(key(p))),
    H = new Set(held.map(p => p.s)),
    cross = [...H].filter(s => prac.some(p => p.s === s));
  return {held: H.size, cross: cross.length, R};
}

const a = crossings(two(true));
assert.ok(a.held > 0, 'case 1 holds specimens');
assert.strictEqual(a.cross, 0, 'case 1: no reserved specimen with a practice sibling');
const b = crossings(two(false));
assert.ok(b.held > 0 && b.cross === b.held, `case 2: every reserved specimen keeps a practice sibling (${b.cross}/${b.held})`);
const c = crossings(Array.from({length: 45}, (_, i) => ({f: `testgenus-wide-${spec(i)}`, v: 'wide', s: spec(i)})));
assert.ok(c.held > 0 && c.cross === 0, 'case 3: unique files, no sibling');
// case 4: 40 distinct specimens with their own ids, plus 2 distinct specimens on one generic page
const L4 = [
  ...Array.from({length: 40}, (_, i) => ({f: `testgenus-wide-${spec(i)}`, v: 'wide', s: spec(i), o: 'https://www.inaturalist.org/observations/' + (5000 + i)})),
  {f: 'testgenus-wide-fb1', v: 'wide', s: 'fbA', o: 'https://www.fishbase.se/photos/thumbnailssummary.php?Genus=Testgenus'},
  {f: 'testgenus-wide-fb2', v: 'wide', s: 'fbB', o: 'https://www.fishbase.se/photos/thumbnailssummary.php?Genus=Testgenus'}
];
const X4 = unit(L4),
  P4 = photosOf(X4),
  by4 = index(P4),
  fb = P4.filter(r => /fb\d$/.test(r.f));
assert.strictEqual(new Set(fb.map(r => r.key)).size, 1, 'case 4: one key for the shared page (never split across pools)');
assert.strictEqual(fb[0].idType, 'page');
// with nothing reserved, the page signal finds no partner under another key (the same key is one observation)
assert.strictEqual(partners(by4, fb[0], 'page', new Set()).length, 0, 'case 4: no partner under another key');
console.log(
  `fixture ok: case 1 held ${a.held}, crossing ${a.cross}; case 2 held ${b.held}, crossing ${b.cross}; case 3 held ${c.held}, crossing ${c.cross}; case 4 one key for the shared page`
);
