// The custom quiz's draw (model.js CUSTOM, customOf, customDraw, customChoices; docs/LEARNING.md "Custom quiz"):
// model.js's own code (the wrong choices, distractors, and the custom quiz block) run in Node on a made-up slate of 12
// genera, with core.js's confusion scores. Only selected genera are asked; the choices come from the selection first,
// with the photo quiz's trap rules inside it, and from the other genera in play only when the selection is under 4.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const core = require('../core.js');

// 12 genera: A-D look-alikes of each other (branching), E-F a look-alike pair (massive), G-L easy ones in other forms.
const GEN = {
  A: {look: ['B', 'C'], fam: 'f1', ig: 1, forms: ['B']},
  B: {look: ['A', 'D'], fam: 'f1', ig: 1, forms: ['B']},
  C: {look: ['A'], fam: 'f2', ig: 1, forms: ['B']},
  D: {look: ['B'], fam: 'f2', ig: 2, forms: ['B']},
  E: {look: ['F'], fam: 'f3', ig: 3, forms: ['M']},
  F: {look: ['E'], fam: 'f3', ig: 3, forms: ['M']},
  G: {look: [], fam: 'f4', ig: 4, forms: ['U']},
  H: {look: [], fam: 'f5', ig: 5, forms: ['F']},
  I: {look: [], fam: 'f6', ig: 6, forms: ['E']},
  J: {look: [], fam: 'f7', ig: 7, forms: ['T']},
  K: {look: [], fam: 'f8', ig: 8, forms: ['S']},
  L: {look: [], fam: 'f9', ig: 9, forms: ['U']}
};
const PLAY = Object.keys(GEN);
function model({P = {}, ab = {}} = {}) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    pick = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
  const ctx = {
    P,
    PCONF: {},
    CONF: core.CONF,
    confScore: core.confScore,
    pairConf: core.pairConf,
    GX: n => GEN[n],
    imrFormsOf: n => GEN[n].forms,
    ability: n => ab[n] ?? 0,
    formatAt: a => [Math.min(3, Math.max(0, a / 0.18))], // model.js FORMAT schedule, stubbed (trapsFor's default)
    // app.js helpers
    pick: L => L[Math.floor(Math.random() * L.length)],
    shuffle: L => L.slice().sort(() => Math.random() - 0.5),
    // model.js weight (status and progress), stubbed: a genus not asked yet 10, else 1.
    weight: n => ((P[n] || {}).ok || (P[n] || {}).ko ? 1 : 10)
  };
  vm.createContext(ctx);
  vm.runInContext(
    pick('function wpick', '// Which genus to ask next') +
      pick('const trapsFor = ', '// Once the whole file is in') +
      '\nthis.M = {CUSTOM, customOf, customDraw, customChoices, distractors, confusable, mixEdges, lookEdges, mixClusters};',
    ctx
  );
  // Arrays made in the vm's realm compare unequal to this one's in deepStrictEqual: copied here.
  const M = ctx.M,
    here =
      f =>
      (...a) =>
        (r => (Array.isArray(r) ? [...r] : r))(f(...a));
  // Clusters: plain objects with arrays, copied too.
  const clusters =
    f =>
    (...a) =>
      Array.from(f(...a), c => ({g: [...c.g], w: c.w}));
  return {
    ...M,
    customOf: here(M.customOf),
    customChoices: here(M.customChoices),
    mixEdges: (...a) => Array.from(M.mixEdges(...a), e => [...e]),
    lookEdges: (...a) => Array.from(M.lookEdges(...a), e => [...e]),
    mixClusters: clusters(M.mixClusters)
  };
}
const known = () => true;

test('customOf: the saved genera still in play, in the game order; none under CUSTOM.MIN', () => {
  const M = model();
  assert.strictEqual(M.CUSTOM.MIN, 2);
  assert.deepStrictEqual(M.customOf(['F', 'A', 'Z', 'A'], PLAY), ['A', 'F']);
  assert.strictEqual(M.customOf(['A'], PLAY), null);
  assert.strictEqual(M.customOf(['A', 'Z'], PLAY), null); // Z is not in play (a bonus genus switched off, say)
  assert.strictEqual(M.customOf(null, PLAY), null);
  assert.strictEqual(M.customOf('A,B', PLAY), null);
});

test('customDraw: only selected genera are asked, each of them, those not asked yet first', () => {
  const M = model({P: {A: {ok: 3, ko: 1}, E: {ok: 2, ko: 0}}}),
    sel = ['A', 'E', 'H'],
    n = {};
  for (let i = 0; i < 3000; i++) {
    const t = M.customDraw(sel);
    n[t] = (n[t] || 0) + 1;
  }
  assert.deepStrictEqual(Object.keys(n).sort(), sel);
  assert.ok(n.H > n.A && n.H > n.E, JSON.stringify(n)); // H never asked: weight 10 against 1
});

test('customChoices: a selection of 4 or more gives 3 choices from it alone, at every trap level', () => {
  const M = model(),
    sel = ['A', 'B', 'C', 'D', 'G'];
  for (const traps of [0, 1, 2, 3])
    for (let i = 0; i < 50; i++) {
      const c = M.customChoices('A', sel, PLAY, traps, known);
      assert.strictEqual(new Set(c).size, 3, c.join());
      assert.ok(!c.includes('A'));
      assert.ok(
        c.every(n => sel.includes(n)),
        `traps ${traps}: ${c.join()}`
      );
    }
});

test('customChoices: the trap rules work inside the selection (a look-alike group drills itself)', () => {
  const M = model(),
    sel = ['A', 'B', 'C', 'G', 'H', 'I', 'J'];
  // At 0 traps the easy choices come first (no look-alike when enough other genera are picked)...
  for (let i = 0; i < 50; i++) assert.ok(!M.customChoices('A', sel, PLAY, 0, known).some(n => M.confusable('A', n)));
  // ...at 2 traps both look-alikes picked are there.
  for (let i = 0; i < 50; i++) {
    const c = M.customChoices('A', sel, PLAY, 2, known);
    assert.deepStrictEqual(c.filter(n => M.confusable('A', n)).sort(), ['B', 'C'], c.join());
  }
  // A selection of look-alikes only: its own look-alikes even at 0 traps (nothing easier was picked).
  const look = ['A', 'B', 'C', 'D'];
  for (let i = 0; i < 20; i++) assert.deepStrictEqual(M.customChoices('A', look, PLAY, 0, known).sort(), ['B', 'C', 'D']);
});

test('customChoices: under 4 genera picked, the selection first, topped up from the other genera in play', () => {
  const M = model();
  for (const traps of [0, 1, 2, 3])
    for (let i = 0; i < 50; i++) {
      const two = M.customChoices('E', ['E', 'F'], PLAY, traps, known);
      assert.strictEqual(new Set(two).size, 3);
      assert.strictEqual(two[0], 'F'); // the other genus picked, always
      assert.ok(!two.includes('E') && two.every(n => PLAY.includes(n)));
      const three = M.customChoices('A', ['A', 'G', 'B'], PLAY, traps, known);
      assert.deepStrictEqual(three.slice(0, 2).sort(), ['B', 'G'], three.join());
      assert.strictEqual(new Set(three).size, 3);
      assert.ok(!three.includes('A'));
    }
  // The top-up brings the traps the selection could not give: at 3 traps, A with G picked gets two of its look-alikes in
  // the 2 places left; at 0 traps, easy genera of other forms (never a look-alike of A).
  for (let i = 0; i < 50; i++) {
    const hard = M.customChoices('A', ['A', 'G'], PLAY, 3, known);
    assert.strictEqual(hard.filter(n => M.confusable('A', n)).length, 2, hard.join());
    const easy = M.customChoices('A', ['A', 'G'], PLAY, 0, known);
    assert.ok(!easy.some(n => M.confusable('A', n)), easy.join());
  }
});

// Logged quiz|s… (quiz.js answer), the sheet stores and rates a custom-quiz answer as any photo-quiz answer, with no
// new script version (AGENTS.md 7a): the sheet's guess_ and the admin's guessOf read |kN at the end and |t anywhere,
// the mode split keeps quiz.
test('quiz|s modes: rated like the photo quiz by the sheet (Code.gs guess_) and the admin (core.js guessOf)', () => {
  const gs = fs.readFileSync(path.join(__dirname, '..', 'tools', 'sync', 'Code.gs'), 'utf8'),
    guess_ = vm.runInNewContext('(' + /const guess_ = (\([\s\S]*?\n\});/.exec(gs)[1].replace(/;$/, '') + ')');
  const four = 'A B C D',
    two = 'A B';
  for (const [plain, custom, ch] of [
    ['quiz', 'quiz|s', four],
    ['quiz|k3', 'quiz|s|k3', four],
    ['quiz|k2', 'quiz|s|k2', two],
    ['quiz|d|k2', 'quiz|s|d|k2', two],
    ['quiz|c|k3', 'quiz|s|c|k3', four],
    ['quiz|t', 'quiz|s|t', ''],
    ['quiz|t|x', 'quiz|s|t|x', ''],
    ['quiz|x', 'quiz|s|x', four],
    ['quiz', 'quiz|s', two]
  ]) {
    assert.strictEqual(guess_(custom, ch), guess_(plain, ch), custom);
    assert.strictEqual(core.guessOf(custom, ch), core.guessOf(plain, ch), custom);
    assert.strictEqual(custom.split('|')[0], 'quiz'); // the sheet's per-player modes (readUsers)
  }
  // ... and its opening hold counts them (only |w is left out).
  assert.ok(!/\|w(\||$)/.test('quiz|s|c|k3'));
});

// "My mix-ups" (quiz.js viewCustom, model.js mixEdges, lookEdges, mixClusters; Pierre, 2026-11-03): the genera a player
// confuses, in clusters, most confused first.
test('mixEdges: the pairs the player mixed up, both ways, among the genera in play only', () => {
  const M = model({P: {A: {conf: {B: 3, Z: 9}}, B: {conf: {A: 2}}, E: {conf: {F: 1}}, G: {conf: {}}}});
  assert.deepStrictEqual(M.mixEdges(PLAY), [
    ['A', 'B', 5],
    ['E', 'F', 1]
  ]);
  assert.deepStrictEqual(M.mixEdges(['A', 'C', 'E']), []);
});

test('mixClusters: heaviest pairs first, a genus joins its partner up to CUSTOM.CLUSTER, clusters never merge', () => {
  const M = model();
  // A-B 5, B-C 3, E-F 4, C-E 2 (C and E already in two clusters: no merge), G-H 1, zero weights ignored.
  const C = M.mixClusters([
    ['A', 'B', 5],
    ['B', 'C', 3],
    ['E', 'F', 4],
    ['C', 'E', 2],
    ['G', 'H', 1],
    ['I', 'J', 0]
  ]);
  assert.deepStrictEqual(C, [
    {g: ['A', 'B', 'C'], w: 8},
    {g: ['E', 'F'], w: 4},
    {g: ['G', 'H'], w: 1}
  ]);
  // The weight counts every edge inside the final cluster, also one met before its genus could join (Codex review #417):
  // AD is skipped while D pairs with only A, D joins later through E, and AD counts: 45, not 37.
  const W = M.mixClusters([
    ['A', 'B', 10],
    ['A', 'C', 9],
    ['A', 'D', 8],
    ['C', 'E', 7],
    ['D', 'E', 6],
    ['A', 'E', 5]
  ]);
  assert.deepStrictEqual(
    W.map(c => [[...c.g].sort().join(''), c.w]),
    [['ABCDE', 45]]
  );
  // A pair inside one cluster adds to its weight; a full cluster takes no one (cap 3 here): D stays out, then pairs with L.
  // A genus paired with fewer than half a cluster's genera stays out: a chain A-B-C-D-E-F makes two clusters.
  const D = M.mixClusters(
    [
      ['A', 'B', 5],
      ['B', 'C', 4],
      ['A', 'C', 3],
      ['C', 'D', 2],
      ['D', 'L', 1]
    ],
    3
  );
  assert.deepStrictEqual(D, [
    {g: ['A', 'B', 'C'], w: 12},
    {g: ['D', 'L'], w: 1}
  ]);
  const chain = M.mixClusters([
    ['A', 'B', 5],
    ['B', 'C', 4],
    ['C', 'D', 3],
    ['D', 'E', 2],
    ['E', 'F', 1]
  ]);
  assert.deepStrictEqual(chain, [
    {g: ['A', 'B', 'C'], w: 9},
    {g: ['D', 'E', 'F'], w: 3}
  ]);
  assert.strictEqual(M.CUSTOM.CLUSTER, 6);
  assert.deepStrictEqual(M.mixClusters([]), []);
});

test('lookEdges: the declared look-alikes (both ways) for a player with no mix-up, in clusters of genera alike', () => {
  const M = model(),
    E = M.lookEdges(PLAY);
  assert.deepStrictEqual(E.map(e => e[0] + e[1]).sort(), ['AB', 'AC', 'BD', 'EF']);
  assert.ok(E.every(e => e[2] > 0));
  const C = M.mixClusters(E);
  // A-B, A-C: A, B, C; D's only look-alike, B, is a third of that cluster: D stays out (no chain through B).
  assert.deepStrictEqual(C.map(c => c.g.slice().sort().join('')).sort(), ['ABC', 'EF']);
  assert.ok(C.every(c => c.g.every(n => PLAY.includes(n))));
});
