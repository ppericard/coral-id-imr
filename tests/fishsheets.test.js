// The fish sheets (docs/reviews/2026-11-05-fish-sheets-study.md, option B, Pierre 2026-11-06): their addresses in the
// words on screen (core.js SUBJECTS sheets, routeOut, routeIn), a sheet id in its one spelling (sheetIdOf: an old unit id
// renamed since), and the sheet each family, genus or species opens (fishTree go) on the real fish.json.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const C = require('../core.js');
const F = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish.json'), 'utf8'));
const FISH = C.SUBJECTS.find(s => s.sheets),
  CORAL = C.SUBJECTS.find(s => !s.hash);

test('a fish sheet address names its rank: family, genus or species, and back', () => {
  const P = [
    ['g-f:Damselfishes', 'fish/learn/family/Damselfishes'],
    ['g-f:CoralBreams', 'fish/learn/family/CoralBreams'],
    ['g-g:Chromis', 'fish/learn/genus/Chromis'],
    ['g-s:Chromis ternatensis', 'fish/learn/species/Chromis%20ternatensis']
  ];
  for (const [k, h] of P) {
    assert.strictEqual(C.routeOut(k, FISH), h, k);
    const r = C.routeIn('#' + h);
    assert.deepStrictEqual([r.S, r.key], [FISH, k], h);
  }
  // The corals' genus sheet is as it was; a fish word means nothing without the fish prefix, nor a coral word with it.
  assert.strictEqual(C.routeOut('g-Acropora', CORAL), 'learn/genus/Acropora');
  assert.strictEqual(C.routeIn('#learn/genus/Acropora').key, 'g-Acropora');
  assert.strictEqual(C.routeIn('#learn/family/Damselfishes').key, null);
  assert.strictEqual(C.routeIn('#fish/learn/genera').key, null);
  assert.ok(FISH.pages.includes('sheet'));
});

test('sheetIdOf: a sheet id in its one spelling; an id with no sheet prefix is no fish sheet', () => {
  assert.strictEqual(C.sheetIdOf(FISH, 'f:Damselfishes'), 'f:Damselfishes');
  assert.strictEqual(C.sheetIdOf(FISH, 't01'), 'f:Damselfishes', 'an IMR entry id renamed into its family');
  assert.strictEqual(C.sheetIdOf(FISH, 'g:Chromis'), 'g:Chromis');
  assert.strictEqual(C.sheetIdOf(FISH, 's:Chromis ternatensis'), 's:Chromis ternatensis');
  assert.strictEqual(C.sheetIdOf(FISH, 'Acropora'), null);
  assert.strictEqual(C.sheetIdOf(FISH, 'f:'), null);
  assert.strictEqual(C.sheetIdOf(CORAL, 'Acropora'), 'Acropora', 'the corals: any name is a genus sheet');
});

test('fishTree: option B, every family, genus and species reaches a sheet', () => {
  const T = C.fishTree(F);
  assert.strictEqual(Object.keys(T.fam).length, F.families.length);
  assert.strictEqual(T.order.length, F.families.length);
  // The key's order: the group numbers rise, a family with no group last.
  const g = T.order.map(id => T.fam[id].group || 99);
  assert.deepStrictEqual(
    g,
    [...g].sort((a, b) => a - b)
  );
  // A family opens its own sheet.
  assert.strictEqual(T.go('f:Damselfishes'), 'f:Damselfishes');
  // A genus with several species in a family of several genera opens its page.
  assert.strictEqual(T.go('g:Chromis'), 'g:Chromis');
  // A genus with one species opens that species' sheet (Pierre, Q2): Zanclus, Abudefduf.
  assert.strictEqual(T.go('g:Zanclus'), 's:Zanclus cornutus');
  assert.strictEqual(T.go('g:Abudefduf'), 's:Abudefduf vaigiensis');
  // The only genus of a family with several species has no page: the family sheet (the study's recommendation).
  assert.strictEqual(T.go('g:Platax'), 'f:Spadefishes');
  // A species by its id or its sheet id; unknown ids reach nothing.
  assert.strictEqual(T.go('s091'), 's:Chromis ternatensis');
  assert.strictEqual(T.go('s:Chromis ternatensis'), 's:Chromis ternatensis');
  assert.strictEqual(T.spOf('s:Chromis ternatensis').id, 's091');
  for (const x of ['f:Nope', 'g:Nope', 's:Nope', 't01', '']) assert.strictEqual(T.go(x), null, x);
  // Every species of a family is a species of the tree, and every genus reaches a sheet.
  for (const f of F.families) {
    f.species.forEach(id => assert.ok(T.sp[id], `${f.id}: ${id}`));
    f.genera.forEach(id => assert.ok(T.go(id), id));
  }
  // Species left out of the game have no sheet.
  const out = F.species.find(s => s.out);
  if (out) assert.strictEqual(T.go(out.id), null, out.id);
});

test('the family sheets lines (tools/fish_sheets.json): families of fish.json, each line sourced, built into fish.json', () => {
  const S = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'fish_sheets.json'), 'utf8')).families,
    by = Object.fromEntries(F.families.map(f => [f.id, f]));
  assert.ok(Object.keys(S).length >= 28, 'every circle-1 family');
  for (const [id, x] of Object.entries(S)) {
    assert.ok(by[id], `${id}: not a family of fish.json`);
    assert.ok((x.marks || []).length + (x.life || []).length, `${id}: no line`);
    assert.ok((x.src || []).length && x.src.every(s => s.t && /^https:\/\//.test(s.u)), `${id}: every family lists its sources`);
    Object.keys(x.apart || {}).forEach(o => assert.ok(by[o] && o !== id, `${id}: apart ${o}`));
    [...(x.marks || []), ...(x.life || []), ...Object.values(x.apart || {})].forEach(t =>
      assert.ok(typeof t === 'string' && t.length && t.length <= 160 && !/\s$/.test(t), `${id}: ${t}`)
    );
    // built into fish.json as they are (python3 tools/build_fish.py --regroup)
    assert.deepStrictEqual(by[id].marks || [], x.marks || [], `${id} marks in fish.json`);
    assert.deepStrictEqual(by[id].life || [], x.life || [], `${id} life in fish.json`);
    assert.deepStrictEqual(by[id].msrc, x.src, `${id} sources in fish.json`);
  }
});

test('size and depth facts (tools/fish_facts.json): Reef Life Survey, else FishBase, each with its source, built into fish.json', () => {
  const X = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'fish_facts.json'), 'utf8')),
    sp = Object.fromEntries(F.species.map(s => [s.id, s]));
  for (const [id, x] of Object.entries(X)) {
    assert.ok(sp[id], id);
    if (x.len != null) {
      assert.ok(x.len > 0 && x.len < 2000 && ['rls', 'fishbase'].includes(x.lsrc), `${id} size`);
      assert.ok(x.lsrc !== 'rls' || x.rls, `${id}: its Reef Life Survey page`);
      assert.ok(x.lsrc !== 'fishbase' || x.fb, `${id}: its FishBase page`);
      assert.strictEqual(sp[id].size.len, x.len, `${id} size in fish.json`);
      assert.ok(/^https:\/\/(reeflifesurvey\.com|www\.fishbase\.se)\//.test(sp[id].size.src.u), id);
    }
    if (x.dep) {
      assert.ok(
        x.dep.length === 2 && x.dep[1] > 0 && (x.dep[0] === null || x.dep[0] <= x.dep[1]) && ['rls', 'fishbase'].includes(x.dsrc),
        `${id} depth`
      );
      assert.deepStrictEqual(sp[id].depth.m, x.dep, `${id} depth in fish.json`);
    }
  }
  // Reef Life Survey first: FishBase only where it gives nothing.
  assert.ok(Object.values(X).some(x => x.lsrc === 'rls'));
});
