'use strict';
require('./slot.js').testGuard();
// Photos › Photo stats › Taxa (admin-taxa.js): the pure functions that list the taxa out of play and why, on made-up data.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..'),
  {TAXA_WHY, taxaFish, taxaGenera, taxaCounts} = require('../admin-taxa.js');

// Made-up species of a made-up tree: two families (A in circle 1, B with no circle in the draft), one species per case.
const A = {id: 'f:A', name: 'Alphas', circle: 1},
  B = {id: 'f:B', name: 'Betas', circle: 2};
const species = [
  {id: 's1', name: 'Aus one', common: 'First alpha', circle: 1}, // plays, at its target
  {id: 's2', name: 'Aus two', circle: 1}, // plays, under its target
  {id: 's3', name: 'Aus three', circle: 1}, // no photo in play, two candidates waiting
  {id: 's4', name: 'Bus four', circle: 2}, // its family is out in the draft
  {id: 's5', name: 'Cus five', out: 'not confirmed in the Philippines'},
  {id: 's6', name: 'Cus six', out: 'not confirmed near Dauin'},
  {id: 's7', name: 'Cus seven', out: 'family in no circle'},
  {id: 's8', name: 'Cus eight', out: 'not confirmed in the Philippines; family in no circle'},
  {id: 's9', name: 'Cus nine', out: 'taken off by a new rule'}, // a reason this page does not know: shown as written
  {id: 's10', name: 'Cus ten', out: true}, // out, but no text says why
  {id: 's11', name: 'Dus eleven'}, // not out, no family page, no photo count: nothing explains it
  {id: 's12', name: 'Aus twelve', circle: 1, en: 'Twelve slug'} // plays, over its target
];
const unitOf = {s1: A, s2: A, s3: A, s4: B, s12: A};
const rows = {
  s1: {id: 's1', n: 9, obs: 8, tgt: 8, wait: 0},
  s2: {id: 's2', n: 3, obs: 2, tgt: 8, wait: 4},
  s3: {id: 's3', n: 0, obs: 0, tgt: 8, wait: 2},
  s4: {id: 's4', n: 8, obs: 8, tgt: 8, wait: 0},
  s12: {id: 's12', n: 20, obs: 12, tgt: 8, wait: 0}
};
const build = (o = {}) =>
  taxaFish({
    species,
    unitOf,
    circleOf: u => (u.id === 'f:B' ? null : u.circle),
    rows,
    link: (s, u) => (u && !s.out ? '#t/' + s.id : ''),
    ...o
  });
const by = L => Object.fromEntries(L.map(r => [r.id, r]));

test('a taxon at its target, in a circle, is not listed; every other case is, once', () => {
  const R = by(build());
  assert.ok(!('s1' in R), 'at target: not listed');
  assert.ok(!('s12' in R), 'over target: not listed');
  assert.deepEqual(Object.keys(R).sort(), ['s10', 's11', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9']);
});

test('out reasons come from the recorded text, one per part', () => {
  const R = by(build());
  assert.deepEqual(
    R.s5.why.map(w => w.code),
    ['ph']
  );
  assert.deepEqual(
    R.s6.why.map(w => w.code),
    ['dauin']
  );
  assert.deepEqual(
    R.s7.why.map(w => w.code),
    ['circle']
  );
  assert.deepEqual(
    R.s8.why.map(w => w.code),
    ['ph', 'circle'],
    'a joined reason lists each part'
  );
  assert.ok(R.s5.out && R.s6.out && R.s7.out && R.s8.out);
  assert.equal(R.s5.why[0].text, 'Not confirmed in the Philippines');
  assert.equal(R.s5.why[0].detail, '', 'a recorded text the words already say is not repeated');
  assert.equal(R.s7.why[0].detail, 'family in no circle', 'one that adds to them is kept');
});

test('an unknown out text is shown as written, never mapped to another reason', () => {
  const w = by(build()).s9.why;
  assert.equal(w.length, 1);
  assert.equal(w[0].code, 'recorded');
  assert.equal(w[0].detail, 'taken off by a new rule');
  assert.ok(by(build()).s9.out);
});

test('no text and no field that explains a taxon: "Reason not recorded", never a guess', () => {
  const R = by(build());
  assert.deepEqual(
    R.s10.why.map(w => [w.code, w.text]),
    [['unknown', 'Reason not recorded']],
    'out with no text'
  );
  assert.deepEqual(
    R.s11.why.map(w => w.code),
    ['unknown'],
    'not out, no row, no family'
  );
  assert.ok(R.s10.out && R.s11.out, 'both are out of the game');
});

test("a draft circle of None takes the family's species out, the file's circle notwithstanding", () => {
  const R = by(build());
  assert.deepEqual(
    R.s4.why.map(w => w.code),
    ['circle']
  );
  assert.match(R.s4.why[0].detail, /draft/);
  assert.equal(R.s4.out, true);
  // the same species with the family back in a circle: at its target, so not listed
  assert.ok(!('s4' in by(build({circleOf: u => u.circle}))));
});

test('in the game: no photo in play, then under target, with the numbers the page shows', () => {
  const R = by(build());
  assert.deepEqual(
    R.s3.why.map(w => [w.code, w.detail]),
    [['nophoto', '2 candidates waiting']]
  );
  assert.deepEqual(
    R.s2.why.map(w => [w.code, w.detail]),
    [['under', '2 of 8 observations']]
  );
  assert.equal(R.s3.out, false, 'no photo in play is not out of the game');
  assert.equal(R.s2.out, false, 'under target still plays');
  assert.equal(R.s2.tgt, 8);
  assert.equal(R.s2.obs, 2);
  assert.deepEqual(
    build({rows: {...rows, s3: {...rows.s3, wait: 1}}})
      .find(r => r.id === 's3')
      .why.map(w => w.detail),
    ['1 candidate waiting']
  );
  assert.deepEqual(
    build({rows: {...rows, s3: {...rows.s3, wait: 0}}})
      .find(r => r.id === 's3')
      .why.map(w => w.detail),
    ['']
  );
});

test('a link only where the caller says a page exists; names, common names and families come from the data', () => {
  const R = by(build());
  assert.equal(R.s2.href, '#t/s2');
  assert.equal(R.s5.href, '', 'an out species has no page');
  assert.equal(R.s2.unit, 'Alphas');
  assert.equal(R.s5.unit, '');
  assert.equal(by(build()).s11.common, '');
  assert.equal(by(build({species: [{id: 'x', name: 'X', en: 'Plain slug', out: 'x'}]})).x.common, 'Plain slug');
});

test('the list is ordered: the reasons in the page order (out of the game first), then family, then name', () => {
  const L = build(),
    at = r => TAXA_WHY.findIndex(x => x[0] === r.why[0].code);
  assert.deepEqual(
    L.map(at),
    L.map(at)
      .slice()
      .sort((a, b) => a - b)
  );
  const out = L.map(r => r.out);
  assert.equal(out.indexOf(false), out.lastIndexOf(true) + 1, 'every out taxon before every one that plays');
});

test('counts: each reason lists the taxa that carry it, the empty ones left out, in the page order', () => {
  const C = taxaCounts(build());
  assert.deepEqual(C, [
    ['circle', 'Outside the circles', 3], // s4 (draft), s7, s8
    ['ph', 'Not confirmed in the Philippines', 2], // s5, s8
    ['dauin', 'Not confirmed near Dauin', 1],
    ['recorded', 'Out as recorded', 1],
    ['unknown', 'Reason not recorded', 2],
    ['nophoto', 'No photo in play', 1],
    ['under', 'Under target', 1]
  ]);
  assert.deepEqual(taxaCounts([]), []);
  assert.deepEqual(taxaCounts(null), []);
});

test('nothing in the tree, or nothing wrong in it: an empty list, no error', () => {
  assert.deepEqual(taxaFish({species: []}), []);
  assert.deepEqual(taxaFish({}), []);
  assert.deepEqual(build({species: species.filter(s => s.id === 's1' || s.id === 's12')}), []);
});

test('the corals: a genus the games never ask is Key only, a game genus with no photo in play says so', () => {
  const L = taxaGenera({
    genera: [
      {name: 'Acropora', fam: 'Acroporidae', game: true, n: 40},
      {name: 'Isopora', fam: 'Acroporidae', game: true, n: 0},
      {name: 'Zzz', fam: 'Zzzidae', game: false, n: 7},
      {name: 'Aaa', fam: 'Aaaidae', game: false, n: 0}
    ],
    link: n => '#g/' + n
  });
  assert.deepEqual(
    L.map(r => [r.name, r.why[0].code, r.out]),
    [
      ['Aaa', 'keyonly', true],
      ['Zzz', 'keyonly', true],
      ['Isopora', 'nophoto', false]
    ]
  );
  assert.equal(L[0].href, '#g/Aaa');
  assert.equal(L[0].unit, 'Aaaidae');
  assert.deepEqual(taxaCounts(L), [
    ['keyonly', 'Key only', 2],
    ['nophoto', 'No photo in play', 1]
  ]);
  assert.deepEqual(taxaGenera({genera: []}), []);
});

test('the script is in admin.html after admin.js, the page is the Photo stats view every subject has, and the file writes nothing', () => {
  const html = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8'),
    admin = fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8'),
    src = fs.readFileSync(path.join(ROOT, 'admin-taxa.js'), 'utf8');
  assert.ok(html.indexOf('src="admin.js?') < html.indexOf('src="admin-taxa.js?'), 'admin-taxa.js after admin.js');
  assert.match(admin, /const EVERY = \[[^\]]*'photos\/stats\/taxa'/, 'every subject has the page (no SUBJECTS admin pages entry, core.js)');
  assert.match(admin, /\['taxa', 'Taxa'\]/);
  assert.ok(!/DRAFT\[[^\]]*\]\s*=|saveDraft|store\.set|fetch\(/.test(src), 'read-only: no draft, no storage, no call');
});
