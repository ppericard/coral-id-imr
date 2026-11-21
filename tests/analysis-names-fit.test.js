require('./slot.js').testGuard();
// @slow: Confusions fitted with the shared common-name word on synthetic logs
// The Analyses module (analysis.js), Confusions with a common-name modifier shared with the option (the name-confusion
// study's (h), Q124). A pull planted on options sharing a word comes back, clear and positive, with the declared look-alikes
// and the genus as controls (without them the effect reads negative: the pairs that share a word are never the look-alikes);
// with none planted it does not read clear; without the tree file's names the model is the one it was.
const test = require('node:test'),
  assert = require('node:assert');
const A = require('../analysis.js');
const {withTruth, synthMeta} = require('./analysisfix.js');

// 16 genera standing for species units; those of one 4th (i % 4) share a word, each also has a word of its own; the
// synthetic look-alikes are the declared ones. gone: the units from 12 up have no common name (not in meta.mod).
function setup(seed, pull, gone = 99) {
  const {photos, meta, look} = synthMeta(),
    mod = {},
    share = {},
    has = i => i < gone;
  for (let i = 0; i < 16; i++)
    if (has(i)) mod['Gen' + i] = {w: ['w' + (i % 4), 'x' + i], g: null, l: look['Gen' + i].filter(x => has(+x.slice(3)))};
  for (let i = 0; i < 16; i++)
    share['Gen' + i] = [...Array(16).keys()].filter(j => j !== i && j % 4 === i % 4 && has(j)).map(j => 'Gen' + j);
  const pl = Array.from({length: 10}, (_, i) => ['P' + i, 1 + ((i % 5) - 2) * 0.4, 700, 0.05]),
    rows = withTruth({mod: pull}, () => A.synth({players: pl, photos, look, share, start: 0, end: 200 * 864e5, seed}));
  return {rows, meta: {...meta, mod}, plain: meta};
}
const effect = (S, withMod = true) => {
  const m = withMod ? S.meta : S.plain;
  return A.confusions(A.prep(S.rows, m), 0, 1, m);
};

test('a pull planted on options sharing a common-name word comes back clear and positive; none planted, not clear', () => {
  const on = effect(setup(1, 2)).effects.find(e => e.k === 'mod'),
    off = effect(setup(1, 0)).effects.find(e => e.k === 'mod');
  assert.ok(on.est > 0.8 && on.lo > 0.4, `planted ${on.est} [${on.lo}, ${on.hi}]`);
  assert.ok(off.lo < 0 && off.hi > 0, `none planted ${off.est} [${off.lo}, ${off.hi}]`);
  assert.strictEqual(on.unit, 'logit');
  assert.ok(on.label.includes('common-name'));
});

test('units with no common name among the others: the same effect, the "both have one" column beside it', () => {
  const e = effect(setup(1, 2, 12)).effects.find(x => x.k === 'mod');
  assert.ok(e.est > 0.7 && e.lo > 0.3, `${e.est} [${e.lo}, ${e.hi}]`);
});

// families, genera and species asked by their common name only (no scientific-name species): every species option is a
// "both asked by name" one, so the names' fit must neither lose the rank effect nor change any other result
function setupRanks(seed, pull) {
  const {photos, meta} = synthMeta(),
    name = i => (i < 4 ? 'f:F' + i : i < 8 ? 'g:G' + (i - 4) : 's:s' + (i - 8)),
    P = {},
    L = {},
    mod = {},
    share = {};
  for (let i = 0; i < 16; i++) {
    P[name(i)] = photos['Gen' + i];
    const [lo, n] = i < 4 ? [0, 4] : i < 8 ? [4, 4] : [8, 8],
      j = i - lo;
    L[name(i)] = [lo + ((j + 1) % n), lo + ((j + 3) % n)].map(name);
  }
  for (let j = 0; j < 8; j++) {
    mod['s:s' + j] = {w: ['w' + (j % 4), 'x' + j], wi: ['w' + (j % 4), 'x' + j], g: null, l: L['s:s' + j]};
    share['s:s' + j] = ['s:s' + ((j + 4) % 8)];
  }
  const pl = Array.from({length: 10}, (_, i) => ['P' + i, 1 + ((i % 5) - 2) * 0.4, 700, 0.05]),
    rows = withTruth({mod: pull}, () =>
      A.synth({players: pl, photos: P, look: L, share, rk: {genus: [0.3, 0], species: [0.6, 0]}, start: 0, end: 200 * 864e5, seed})
    );
  return {rows, meta: {...meta, rk: 'family', mod}, plain: {...meta, rk: 'family'}};
}

test('with ranks and only common-name species: the rank effect and every other result are those of the model without names', () => {
  const S = setupRanks(1, 3),
    a = effect(S),
    b = effect(S, false),
    same = k => [a, b].map(r => r.effects.find(e => e.k === k));
  const m = a.effects.find(e => e.k === 'mod');
  assert.ok(m && m.est > 0.5 && m.lo > 0.2, `${m && m.est} [${m && m.lo}, ${m && m.hi}]`);
  ['rk_species', 'rk_genus', 'sd_pair', 'sd_player'].forEach(k => {
    const [x, y] = same(k);
    assert.ok(x && y && x.est === y.est && x.lo === y.lo && x.hi === y.hi, `${k} ${JSON.stringify([x && x.est, y && y.est])}`);
  });
  assert.deepStrictEqual(a.pairs, b.pairs, 'the pairs most mixed up read the fit as it always was');
  assert.deepStrictEqual(a.map, b.map, 'so does the mix-up map');
});

test('without the tree file’s names there is no such effect and the other effects are the same', () => {
  const S = setup(1, 2),
    a = effect(S, false),
    b = effect(S, true);
  assert.ok(!a.effects.some(e => e.k === 'mod'));
  assert.deepStrictEqual(
    a.effects.map(e => e.k),
    b.effects.filter(e => e.k !== 'mod').map(e => e.k)
  );
});

test('the report takes the names from its meta: a different list of names refits the milestones', () => {
  const S = setup(2, 2),
    rows = S.rows.slice(0, 1200),
    r1 = A.report(rows, S.meta, null, {B: 0}),
    r2 = A.report(rows, {...S.meta, mod: {}}, r1, {B: 0}),
    r3 = A.report(rows, S.meta, r1, {B: 0});
  assert.notStrictEqual(r2.R[1000], r1.R[1000], 'other names: refitted');
  assert.strictEqual(r3.R[1000], r1.R[1000], 'the same names: reused');
});
