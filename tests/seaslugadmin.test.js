require('./slot.js').testGuard();
// The sea slugs' admin at parity with the fish's (Pierre, 2026-11-17: "Et pour les limaces de mer, toute la partie admin,
// c'est prévu aussi ?"): their Candidates (target and genus-level lists), their rubric's tag rows and words (core.js
// SUBJECTS seaslug admin tags; admin.js tagWords, admin-fish.js tagRows), the f flag kept (autosort.js fishTag), their
// sheets' text slots (SUBJECTS seaslug content; core.js contentApply), an edited list keeping its lines' source numbers
// only where a line is kept (core.js contentPut: rule C2), and their admin pages.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const ROOT = path.join(__dirname, '..'),
  rd = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  C = require('../core.js'),
  A = require('../autosort.js'),
  SS = C.SUBJECTS.find(s => s.id === 'seaslug'),
  FI = C.SUBJECTS.find(s => s.id === 'fish');

test('the sea slugs: Candidates, Health and the Tree among their admin pages, their target the game cap', () => {
  ['photos/candidates', 'inbox/todo/health', 'photos/tree/key'].forEach(p => assert.ok(SS.admin.pages.includes(p), p));
  // tools/seaslug_game.py puts the sure photos in play up to photoTarget.gameCap: the Candidates fill up to the same
  assert.strictEqual(SS.admin.target, rd('tools/seaslugs.json').photoTarget.gameCap);
  assert.ok(!FI.admin.target, 'the fish keep their own targets (autosort.js FISHT)');
});

test('fishTarget: a species record marked with its subject target (fishSpecies tgt) takes it, the fish records as before', () => {
  const J = {families: [{id: 'f:A', species: ['s1']}], species: [{id: 's1', cs: 1}, {id: 's2'}]};
  const S = A.fishSpecies(J, 12);
  assert.strictEqual(A.fishTarget(S.s1), 12);
  assert.strictEqual(A.fishTarget(S.s2), 12);
  assert.ok(!('tgt' in J.species[0]), 'the tree itself is not changed');
  const F = A.fishSpecies(J);
  assert.strictEqual(F.s2, J.species[1], 'no target: the same record');
  assert.strictEqual(A.fishTarget(F.s1), A.FISHT.top);
  // The queue stops a species at it: 12 observations in play, the 13th candidate is at target.
  const L = [...Array(13)].map((_, i) => ({f: 'seaslug-1-cand-' + i, o: 'o' + i, t: 'X'})),
    cur = {add: Object.fromEntries(L.slice(0, 12).map(p => [p.f, 's1']))},
    Q = A.fishQueue({s1: L}, {}, S, cur, []);
  assert.strictEqual(Q.length, 1);
  assert.ok(Q[0].full && Q[0].target === 12);
});

test("fishTag keeps the sea slugs' f flag (features hidden) and toggles it, in the rubric order", () => {
  assert.strictEqual(A.fishTag('d1g0sl1f', 'w'), 'd1g0sl1wf');
  assert.strictEqual(A.fishTag('d1g0sl1wf', 'f'), 'd1g0sl1w');
  assert.strictEqual(A.fishTag('d1g0sl1', 'f'), 'd1g0sl1f');
  assert.strictEqual(A.fishTag('d1g0sl1jf', 0, 'v'), 'v1g0sl1jf');
  // the fish's flags as before
  assert.strictEqual(A.fishTag('p1g0sm1jr', 'c'), 'p1g0sm1jcr');
});

test("tagRows, tagFlags and tagWords: the sea slugs' rubric on the Tags rows and in words, the fish's unchanged", () => {
  const adm = fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8'),
    fis = fs.readFileSync(path.join(ROOT, 'admin-fish.js'), 'utf8'),
    ctx = {esc: s => String(s), FISHS: null};
  vm.createContext(ctx);
  vm.runInContext(
    block(adm, '// The rubric\'s tags in words (judging/FISH.md "Tags")', "// A unit's IMR tag:") +
      block(fis, '// The rubric\'s code in words (judging/FISH.md "Tags")', "// Pierre's values on a photo") +
      ';this.R={tagRows,tagFlags,fuTags,fishTagText,FROWS,FFLAGS_MINE};',
    ctx
  );
  const {tagRows, tagFlags, fuTags, fishTagText, FROWS, FFLAGS_MINE} = ctx.R;
  // the fish: the rows as they were, and the count's words
  assert.deepStrictEqual(JSON.parse(JSON.stringify(tagRows(FI))), JSON.parse(JSON.stringify(FROWS)));
  assert.strictEqual(tagFlags(FI), FFLAGS_MINE);
  const R = tagRows(SS),
    row = i => R.find(r => r[0] === i)[2];
  assert.deepStrictEqual(
    row(0).map(x => x[0]),
    ['d', 'p', 'o', 'h', 't', 'v']
  );
  assert.deepStrictEqual(
    row(2).map(x => x[0]),
    ['g', 'd'],
    'no night livery'
  );
  assert.strictEqual(row(6)[0][1], 'One sea slug');
  assert.ok(/^Several sea slugs of the same species/.test(row(6)[1][2]));
  assert.deepStrictEqual(
    tagFlags(SS).map(x => x[0]),
    ['j', 'c', 'w', 'f']
  );
  // every value the rows offer is one the code accepts (autosort.js FISH_TAGS)
  R.forEach(([i, , o]) =>
    o.forEach(([v]) => assert.ok(A.fishSure({jt: 'p1g0sm1'.slice(0, i) + v + 'p1g0sm1'.slice(i + 1), e: 3, k: 'best'}), v))
  );
  // words: only what makes a photo harder; a dorsal or oblique sea slug says nothing, the fish's "from above" as before
  assert.strictEqual(fuTags('d1g0sl1', SS), '');
  assert.strictEqual(fuTags('o1g0sl1', SS), '');
  assert.strictEqual(fuTags('v1d0sl1f', SS), 'ventral · dim light · features hidden');
  assert.strictEqual(fuTags('d1g0sl1', FI), 'from above');
  assert.strictEqual(fuTags('o1n0sl1c', FI), 'oblique · night livery · camouflage');
  // the Candidates' judged line says every value
  assert.strictEqual(fishTagText('d1g0sl1jf', SS), 'dorsal · large · juvenile · features hidden');
  assert.strictEqual(fishTagText('p1g0sl1', FI), 'profile · large');
});

test("the sea slugs' sheet slots: declared at every rank of their tree, their ID marks and notes editable", () => {
  const R = rd('seaslug.json');
  assert.deepStrictEqual(Object.keys(SS.content), Object.keys(SS.sheets));
  const N = C.contentNodes(SS, R);
  assert.ok(N.has('g:Chromodoris') && N.has('f:Chromodorididae') && N.has('s119434'));
  const g = R.genera.find(x => (x.marks || []).length && x.mby && (x.mby.marks || []).length > 1);
  assert.ok(g, 'a genus with sourced marks');
  // An edit: the first line kept, the second reworded, a new one; laid over by contentApply as the app and the sheet do.
  const v = [g.marks[0], g.marks[1] + ' (reworded)', 'A made-up new line'],
    cur = {seaslug: {content: {nodes: {[g.id]: {marks: {v, was: g.marks, src: {t: 'Made-up source'}}}}}}},
    X = C.contentApply(SS, R, cur),
    G = X.genera.find(x => x.id === g.id);
  assert.deepStrictEqual(G.marks, v);
  assert.deepStrictEqual(G.mby.marks, [g.mby.marks[0], [], []], 'a kept line keeps its numbers, the others none (rule C2)');
  assert.deepStrictEqual(G.esrc, {marks: {t: 'Made-up source'}});
  assert.notStrictEqual(
    R.genera.find(x => x.id === g.id),
    G,
    'the built file is not changed'
  );
  assert.deepStrictEqual(R.genera.find(x => x.id === g.id).mby, g.mby);
  // The note on a species: its enote.
  const Y = C.contentApply(SS, R, {seaslug: {content: {nodes: {s119434: {note: {v: 'A made-up note', was: null}}}}}});
  assert.strictEqual(Y.species.find(x => x.id === 's119434').enote, 'A made-up note');
  // No structure: the genus look-alikes stay the build's (no replay change, rule D4).
  assert.ok(!SS.structure);
  assert.strictEqual(C.structApply(SS, R, {seaslug: {content: {pairs: {'g:Chromodoris|g:Phyllidia': {v: 1}}}}}), R);
});
