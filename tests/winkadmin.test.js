require('./slot.js').testGuard();
// Surprise-only species in the admin (Pierre, 2026-11-08, docs/ROADMAP.md "Surprise-only species: a few photos in the
// admin"): a species of a wink family (fish.json families wink: met only on the surprise cards) keeps a few really good
// photos, not a whole stock. Its target is TREET.wink (autosort.js treeTarget, through treeSpeciesOf' wink mark), so the
// auto-sort and the Candidates queue stop there, and the Tree shows that many of its photos in play, the rest on demand
// (fishWinkFold: display only, nothing leaves play).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const A = require('../autosort.js');
const {treePid} = require('../core.js');
const {TREET, treeTarget, treeSpeciesOf, fishWinkFold, treeRun, treeQueue, autoCheck} = A;

// Photo names never drawn as a Check (autosort.js autoCheck), so a sure judgment is applied.
const ids = (() => {
  const out = [];
  for (let i = 2000; out.length < 30; i++) if (!autoCheck(`fish-sw-cand-${i}`)) out.push(`fish-sw-cand-${i}`);
  return out;
})();
const sure = (e = 4) => ({jt: 'p1g0sm1', e, k: 'best'});

test('treeTarget: a wink species gets TREET.wink, whatever else it is', () => {
  assert.strictEqual(TREET.wink, 5);
  assert.ok(TREET.wink < TREET.obs, 'fewer than an ordinary species');
  assert.strictEqual(treeTarget({id: 'sw', wink: true}), TREET.wink);
  assert.strictEqual(treeTarget({id: 'sw', wink: true, cs: 2}), TREET.wink, 'the wink mark wins over the cheatsheet');
  assert.strictEqual(treeTarget({id: 's1', cs: 2}), TREET.top);
  assert.strictEqual(treeTarget({id: 's2'}), TREET.obs);
});

test('treeSpeciesOf: only the species of a wink family are marked, the records otherwise as fish.json gives them', () => {
  const J = {
    families: [
      {id: 'f:A', species: ['s1', 's2']},
      {id: 'f:W', wink: {choices: []}, species: ['sw']}
    ],
    species: [{id: 's1', cs: 1}, {id: 's2'}, {id: 'sw', circle: 3}]
  };
  const S = treeSpeciesOf(J);
  assert.deepStrictEqual(Object.keys(S), ['s1', 's2', 'sw']);
  assert.strictEqual(S.s1, J.species[0], 'an ordinary record is the same object');
  assert.deepStrictEqual(S.sw, {id: 'sw', circle: 3, wink: true});
  assert.ok(!('wink' in J.species[2]), 'fish.json itself is not changed');
  assert.deepStrictEqual(treeSpeciesOf(null), {});
});

test('treeSpeciesOf on the real fish.json: every wink family species gets TREET.wink, every other its own target', () => {
  const J = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish.json'), 'utf8')),
    S = treeSpeciesOf(J),
    wk = new Set(J.families.filter(f => f.wink).flatMap(f => f.species));
  assert.ok(wk.size >= 2, 'the surprise cards have species');
  J.species.forEach(x => assert.strictEqual(treeTarget(S[x.id]), wk.has(x.id) ? TREET.wink : x.cs ? TREET.top : TREET.obs, x.id));
  // The other sharks of the same key group are no winks: they keep the ordinary target.
  const g = J.families.find(f => f.wink).group,
    other = J.families.filter(f => f.group === g && !f.wink).flatMap(f => f.species);
  assert.ok(other.length, 'other families in the winks key group');
  other.forEach(s => assert.notStrictEqual(treeTarget(S[s]), TREET.wink, s));
});

test('treeRun: the auto-sort fills a wink species to TREET.wink observations only', () => {
  const cands = {sw: ids.slice(0, 12).map((f, i) => ({f, o: `ow${i}`})), s2: ids.slice(12, 24).map((f, i) => ({f, o: `o2${i}`}))};
  const sug = Object.fromEntries([...cands.sw, ...cands.s2].map(p => [p.f, sure(4)]));
  const {F} = treeRun(cands, sug, {sw: {wink: true}, s2: {}}, {}, '2026-11-15');
  const n = sid => Object.values(F.add).filter(s => s === sid).length;
  assert.strictEqual(n('sw'), TREET.wink);
  assert.strictEqual(n('s2'), TREET.obs, 'an ordinary species still fills to its own target');
});

test('treeQueue: a wink species at TREET.wink observations in play is at target, its other candidates full', () => {
  const inPlay = ids.slice(0, TREET.wink),
    waiting = ids.slice(TREET.wink, TREET.wink + 3),
    cands = {sw: [...inPlay, ...waiting].map((f, i) => ({f, o: `ow${i}`}))},
    F = {add: Object.fromEntries(inPlay.map(f => [f, 'sw']))};
  const Q = treeQueue(cands, {}, {sw: {wink: true}}, F, []);
  assert.strictEqual(Q.length, waiting.length);
  Q.forEach(x => {
    assert.strictEqual(x.target, TREET.wink);
    assert.strictEqual(x.n, TREET.wink);
    assert.ok(x.full, x.p.f);
  });
  // The same candidates for an ordinary species: under its target, not full.
  assert.ok(treeQueue(cands, {}, {sw: {}}, F, []).every(x => !x.full));
});

test('fishWinkFold: featured always shown, the surprise card photos first by photo id, TREET.wink in all, the rest folded', () => {
  const ph = id => ({f: id}),
    feat = [ph('fish-sw-cand-1')],
    rest = ['fi2', 'fi3', 'fi4', 'fi5', 'fi6', 'fi7', 'fi8'].map(ph),
    // the card names its photos as candidates; the game record of the same photo is fi<id> (core.js treePid)
    card = ['fish-sw-cand-7', 'fish-sw-cand-404', 'fish-sw-cand-5'];
  assert.strictEqual(treePid('fish-sw-cand-7'), treePid('fi7'));
  const R = fishWinkFold({feat, rest}, card);
  assert.deepStrictEqual(R.feat, feat);
  assert.deepStrictEqual(
    R.show.map(p => p.f),
    ['fi7', 'fi5', 'fi2', 'fi3'],
    "the card's photos in its order (one not in play skipped), then the page's order"
  );
  assert.strictEqual(R.feat.length + R.show.length, TREET.wink);
  assert.deepStrictEqual(
    R.fold.map(p => p.f),
    ['fi4', 'fi6', 'fi8']
  );
  assert.strictEqual(R.feat.length + R.show.length + R.fold.length, 1 + rest.length, 'every photo kept, none lost');
  // More featured than the fold shows: all of them shown, nothing else.
  const many = ['a', 'b', 'c', 'd', 'e', 'f'].map(ph),
    M = fishWinkFold({feat: many, rest}, card);
  assert.deepStrictEqual([M.feat.length, M.show.length, M.fold.length], [6, 0, rest.length]);
  // Few photos: nothing folded.
  assert.deepStrictEqual(fishWinkFold({feat: [], rest: rest.slice(0, 3)}, []).fold, []);
  assert.deepStrictEqual(fishWinkFold(null, null), {feat: [], show: [], fold: []});
});
