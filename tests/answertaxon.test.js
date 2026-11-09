// The photo's own species under the verdict, after every answer, right or wrong (Pierre, 2026-11-07 and 2026-11-08, go on
// 2026-11-09): "This photo: Zigzag wrasse · Halichoeres scapularis". app.js photoTaxon (the one taxon of the photos shown,
// finer than the unit asked), taxonLine (the line), fishTaxon and coralTaxon (UNITS taxon), run in a vm on the real
// fish.json, fish-game.json, data.json and cand.json. The line in the real quiz, after the answer and not before:
// tests/fish.smoke.js.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
  F = read('fish.json'),
  GAME = read('fish-game.json').photos,
  D = read('data.json'),
  CAND = read('cand.json').cand,
  R = Object.fromEntries(F.species.map(s => [s.id, s]));

const ctx = {esc: s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c])};
vm.createContext(ctx);
vm.runInContext(
  block(app, 'const cnList = s =>', '\n', {file: 'app.js', through: 1}) +
    block(app, "// The photo's own taxon, said in one short line", '// Every unit of a rank in', {file: 'app.js'}) +
    '\nthis.M = {photoTaxon, taxonLine, fishTaxon, coralTaxon};\n' +
    // The two subjects' UNITS taxon, as app.js has them; SUBJ switched by the tests.
    'var SUBJ = {id: "f"}; var UNITS = {f: {taxon: p => fishTaxon(this.R, p)}, c: {taxon: (p, n) => coralTaxon(p, n)}};\n' +
    'this.use = k => (SUBJ = {id: k});',
  ctx
);
ctx.R = R;
const {photoTaxon, taxonLine, fishTaxon, coralTaxon} = ctx.M,
  line = (L, n) => taxonLine(photoTaxon(L, n)),
  fish = (L, n) => (ctx.use('f'), line(L, n)),
  coral = (L, n) => (ctx.use('c'), line(L, n));

test('a fish photo named to the species: its first curated common name, then its PDF name in italics', () => {
  assert.strictEqual(
    fish([{f: 'x', sp: 's240'}], 'f:Wrasses'),
    '<p class="fbsp">This photo: Zigzag wrasse · <i>Halichoeres scapularis</i></p>'
  );
  // A genus question says it the same way.
  assert.strictEqual(fish([{f: 'x', sp: 's240'}], 'g:Halichoeres'), fish([{f: 'x', sp: 's240'}], 'f:Wrasses'));
  // A name WoRMS has changed: the PDF's, the WoRMS name beside it as the species sheet says it (rule S2).
  assert.strictEqual(
    fish([{f: 'x', sp: 's100'}], 'f:Damselfishes'),
    '<p class="fbsp">This photo: Blackbar chromis · <i>Chromis retrofasciata</i> <small>(now <i>Pycnochromis retrofasciatus</i> in WoRMS)</small></p>'
  );
  // A species no reference names (Q247): the scientific name alone.
  assert.strictEqual(fish([{f: 'x', sp: 's679'}], 'f:Bigeyes'), '<p class="fbsp">This photo: <i>Priacanthus starnesi</i></p>');
});

test('a photo known only to the genus: the most precise rank known, never the unit asked again', () => {
  const g = {id: 'g:Chromis', sci: 'Chromis', common: '', now: '', rank: 'genus'};
  assert.strictEqual(taxonLine(g), '<p class="fbsp">This photo: <i>Chromis</i></p>');
  assert.strictEqual(
    taxonLine({id: 'f:x', sci: 'Labridae', common: 'Wrasses', now: '', rank: 'family'}),
    '<p class="fbsp">This photo: Wrasses · Labridae</p>'
  );
  // The taxon is the unit asked (a genus question on a photo named to that genus): nothing more than the verdict.
  ctx.UNITS.f.taxon = () => g;
  try {
    assert.strictEqual(fish([{f: 'x'}], 'f:Damselfishes'), '<p class="fbsp">This photo: <i>Chromis</i></p>');
    assert.strictEqual(fish([{f: 'x'}], 'g:Chromis'), '');
  } finally {
    ctx.UNITS.f.taxon = p => fishTaxon(R, p);
  }
  // A coral photo named to the genus only: the genus is the answer, nothing extra.
  assert.strictEqual(coral([{f: 'a', t: 'Acropora'}], 'Acropora'), '');
});

test('nothing when the photo is not known for sure', () => {
  // No species, an unknown species, no photo.
  assert.strictEqual(fish([{f: 'x'}], 'f:Wrasses'), '');
  assert.strictEqual(fish([{f: 'x', sp: 's999999'}], 'f:Wrasses'), '');
  assert.strictEqual(fish([], 'f:Wrasses'), '');
  assert.strictEqual(fishTaxon(null, {sp: 's240'}), null);
  assert.strictEqual(taxonLine(null), '');
  // Several photos (one observation, rule P4) that do not all name the same species: nothing.
  assert.strictEqual(fish([{f: 'x', sp: 's240'}, {f: 'y'}], 'f:Wrasses'), '');
  assert.strictEqual(
    fish(
      [
        {f: 'x', sp: 's240'},
        {f: 'y', sp: 's100'}
      ],
      'f:Wrasses'
    ),
    ''
  );
  // A coral species that is not Research Grade (gid: Needs ID) and not Pierre's: never a name that could be wrong.
  assert.strictEqual(coral([{f: 'a', t: 'Acropora subglabra', gid: 1}], 'Acropora'), '');
  // Pierre's own named to the species stays usable, even Needs ID (rule S2).
  assert.strictEqual(
    coral([{f: 'a', t: 'Acropora subglabra', gid: 1, own: true}], 'Acropora'),
    '<p class="fbsp">This photo: <i>Acropora subglabra</i></p>'
  );
  // A photo Pierre moved to another genus keeps its iNaturalist name: it would contradict the verdict, so nothing.
  assert.strictEqual(coral([{f: 'a', t: 'Favites pentagona'}], 'Dipsastraea'), '');
});

test('corals: the species of the photos shown when every one names it, otherwise nothing extra', () => {
  const v = n => [
    {f: n + '1', t: 'Acropora subglabra', o: 'u'},
    {f: n + '2', t: 'Acropora subglabra', o: 'u'}
  ];
  assert.strictEqual(coral(v('a'), 'Acropora'), '<p class="fbsp">This photo: <i>Acropora subglabra</i></p>');
  // An IMR lecture photo (no taxon), or a view of the question without a species: nothing.
  assert.strictEqual(coral([{f: 'imr-p12_i8', imr: true}], 'Acropora'), '');
  assert.strictEqual(coral([...v('a'), {f: 'a3', t: 'Acropora'}], 'Acropora'), '');
  assert.strictEqual(coralTaxon({t: 'Acropora subglabra'}, 'Acropora').common, '');
});

test('the real data: every fish game photo says its species; a coral photo its species only inside its own genus', () => {
  let n = 0;
  Object.values(GAME).forEach(L =>
    L.forEach(p => {
      const s = R[p.sp],
        t = fishTaxon(R, p);
      assert.ok(t && t.sci === s.name && t.common === ((s.cn || [])[0] || [''])[0], `${p.f}: ${JSON.stringify(t)}`);
      // The name the line gives is the one the species sheet shows (rule S2), never iNaturalist's own (t).
      assert.ok(!s.now || s.now === s.name || t.now === s.now, `${p.f}: its WoRMS name`);
      n++;
    })
  );
  assert.ok(n > 10000, `${n} fish game photos`);
  let said = 0;
  const all = [
    ...Object.entries(D.gen).flatMap(([g, x]) => Object.values(x.views || {}).flatMap(L => L.map(p => [g, p]))),
    ...Object.entries(CAND).flatMap(([g, L]) => L.map(p => [g, p]))
  ];
  all.forEach(([g, p]) => {
    const t = coralTaxon(p, g);
    if (!t) return assert.ok(!/\s/.test(p.t) || (p.gid && !p.own), `${p.f}: a sure species not said`);
    said++;
    assert.ok(t.sci.split(' ')[0] === g && (p.own || !p.gid), `${p.f}: ${t.sci} under ${g}`);
  });
  assert.ok(said > 100, `${said} coral photos say their species`);
});
