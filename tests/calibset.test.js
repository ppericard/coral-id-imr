require('./slot.js').testGuard();
// The coral calibration set (docs/LEARNING.md "The calibration set"; docs/decisions/2026-11-18-coral-calibration-set.md):
// tools/calibset.js chooses the members (eligible photos, counts per genus, one per colony, sticky), app.js loads
// calibration-set.json, and model.js photoSet weighs a member CSET.B times as much while it has fewer than CSET.N answers,
// on a unit the player holds and within one width of the question's target.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const cut = require('./block.js');
const T = require('../tools/calibset.js');
const {engine} = require('./rareease.js');

const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// A small world: genera A (three views), B (two levels), C, and a bonus genus off the slate; n colonies a genus, one
// photo a view each, files <genus>-<view>-<colony>.
const VIEWS = ['wide', 'medium', 'macro'];
function world(n = 20) {
  const raw = {gen: {A: {}, B: {}, C: {}}, x: {gen: {Isopora: {}}}},
    gen = (g, two) => ({
      ...(two ? {levels: 2} : {}),
      sl: Object.fromEntries(
        (two ? ['wide', 'macro'] : VIEWS).map(v => [v, {game: Array.from({length: n}, (_, i) => ({f: `${g}-${v}-${i}`, o: `${g}o${i}`}))}])
      )
    });
  const d = {gen: {A: gen('A'), B: gen('B', true), C: gen('C')}, x: {gen: {Isopora: {x: 1, ...gen('Isopora')}}}};
  return {raw, d};
}
const elig = (W, cur = {}, autoq = {}, forms = {}) => T.eligible(W.d, W.raw, cur, autoq, forms);
const files = E => Object.values(E).flatMap(V => Object.values(V).flatMap(L => L.map(p => p.f)));

test('eligible: the slate genera, the views every question shows, never Poor, several corals or a Colony with no form', () => {
  const W = world(4);
  W.d.gen.A.sl.wide.game[0].multi = 1;
  const cur = {quality: {'A-medium-1': 1, 'A-medium-2': 3}, gf: {'A-wide-2': 'x', 'A-wide-3': 'b'}},
    autoq = {'C-wide-0': 1, 'A-medium-2': 1},
    forms = {gf: {'A-wide-3': 'x', 'C-wide-1': 'xp'}},
    E = elig(W, cur, autoq, forms),
    F = files(E);
  assert.deepStrictEqual(Object.keys(E), ['A', 'B', 'C'], 'the bonus genus is off the slate');
  assert.deepStrictEqual(Object.keys(E.A), ['wide', 'medium'], 'no corallites view for a three-level genus');
  assert.deepStrictEqual(Object.keys(E.B), ['wide', 'macro'], 'a two-level genus: its colony and close-up');
  assert.ok(!F.includes('A-wide-0'), 'several corals');
  assert.ok(!F.includes('A-medium-1'), "Pierre's Poor");
  assert.ok(F.includes('A-medium-2'), "Pierre's rating wins over the automatic one");
  assert.ok(!F.includes('C-wide-0'), 'the automatic Poor');
  assert.ok(!F.includes('A-wide-2'), "Pierre's form not visible");
  assert.ok(F.includes('A-wide-3'), "Pierre's form wins over the guess");
  assert.ok(!F.includes('C-wide-1'), 'the guess: form not visible (the polyps flag aside)');
  // An IMR lecture photo is never automatically Poor (core.js applySlots autoQ).
  W.d.gen.C.sl.medium.game.push({f: 'imrl-p1_i1'});
  assert.ok(files(elig(W, {}, {'imrl-p1_i1': 1})).includes('imrl-p1_i1'));
});

test('build: TARGET members, each genus its share, one per colony, both views, the same set every run', () => {
  const E = elig(world(30)),
    S = T.build(E, null),
    all = Object.values(S).flat();
  assert.strictEqual(all.length, T.TARGET);
  assert.strictEqual(new Set(all).size, all.length);
  // 50 over 3 genera: 16 each, the 2 left to the genera with the most colonies (here all equal: hash order).
  Object.values(S).forEach(L => assert.ok(L.length === 16 || L.length === 17, L.length));
  const col = f => f.split('-').slice(0, 1) + f.split('-')[2];
  assert.strictEqual(new Set(all.map(col)).size, all.length, 'never two members of one colony');
  Object.entries(S).forEach(([g, L]) => {
    const vs = new Set(L.map(f => f.split('-')[1]));
    assert.strictEqual(vs.size, 2, `${g}: both views`);
  });
  assert.deepStrictEqual(T.build(E, null), S, 'deterministic');
});

test('build: one each for every genus first, the rest to the genera with the most eligible colonies', () => {
  const W = world(30);
  // A has the most colonies; B the fewest
  W.d.gen.B.sl.wide.game = W.d.gen.B.sl.wide.game.slice(0, 3);
  W.d.gen.B.sl.macro.game = W.d.gen.B.sl.macro.game.slice(0, 3);
  W.d.gen.A.sl.wide.game.push(...Array.from({length: 10}, (_, i) => ({f: `A-wide-x${i}`, o: `Aox${i}`})));
  const Q = T.quotas(elig(W));
  assert.strictEqual(Q.B, 3, 'never more than its colonies');
  assert.strictEqual(Q.A + Q.B + Q.C, T.TARGET);
  assert.ok(Q.A >= Q.C);
});

test('build: sticky; a member gone from play is replaced in its genus, the others stay', () => {
  const W = world(30),
    S = T.build(elig(W), null),
    gone = S.A[0];
  W.d.gen.A.sl.wide.game = W.d.gen.A.sl.wide.game.filter(p => p.f !== gone);
  W.d.gen.A.sl.medium.game = W.d.gen.A.sl.medium.game.filter(p => p.f !== gone);
  const S2 = T.build(elig(W), S);
  assert.ok(!S2.A.includes(gone));
  assert.strictEqual(S2.A.length, S.A.length, 'A topped up');
  assert.strictEqual(S2.A.filter(f => S.A.includes(f)).length, S.A.length - 1, 'every other member of A kept');
  assert.deepStrictEqual([S2.B, S2.C], [S.B, S.C]);
  // New photos in play never displace a member, even when their genus takes one of the extra places.
  W.d.gen.C.sl.wide.game.unshift(...Array.from({length: 20}, (_, i) => ({f: `C-wide-n${i}`, o: `Con${i}`})));
  const S3 = T.build(elig(W), S2);
  Object.entries(S2).forEach(([g, M]) => M.forEach(f => assert.ok(S3[g].includes(f), f)));
});

test('the real file: its rule, slate genera only, unique members, about TARGET', () => {
  const J = JSON.parse(read(T.OUT)),
    slate = new Set(C.slateOf(JSON.parse(read('data.json')))),
    all = Object.values(J[T.SUBJECT]).flat();
  assert.deepStrictEqual(J.rule, T.RULE);
  assert.strictEqual(J.v, 1);
  Object.keys(J[T.SUBJECT]).forEach(g => assert.ok(slate.has(g), g));
  assert.strictEqual(new Set(all).size, all.length);
  // TARGET, a few more once a genus's count fell with its members kept (sticky).
  assert.ok(all.length > 0 && all.length <= T.TARGET + 10, String(all.length));
  // The file's own layout (render): what the tool writes back.
  assert.strictEqual(read(T.OUT), T.render(J));
});

// model.js's calibration-set code run in Node (the block from CAL to photoSet, as tests/drawcalib.test.js runs it).
function setEngine(subject, PSTAT = {}, calset = {}) {
  const ctx = {SUBJ: C.subjectOf(subject), calibOf: C.calibOf, DOM: C.DOM, PSTAT, Math};
  vm.createContext(ctx);
  const pick = cut(read('model.js'), 'const PICKD = {', '\n', {file: 'model.js'}),
    cal = cut(read('model.js'), 'const CAL = {', 'function photoSet', {file: 'model.js'});
  vm.runInContext(
    `const TARGET_P = 0.8, AIM = 0;\n${pick}\n${cal}\nCALSET = ${JSON.stringify(calset)};\nthis.M = {CSET, setBonus, setFiles};`,
    ctx
  );
  return ctx.M;
}

test('setBonus: CSET.B for a member under CSET.N answers, then 1; 1 for any other photo or subject', () => {
  const set = {coral: {Acropora: ['m1', 'm2']}},
    M = setEngine('coral', {m1: [0, 5, 5, 19], m2: [0, 5, 5, 20]}, set);
  assert.strictEqual(M.CSET.N, T.GOAL, 'the app and the tool count to the same goal');
  assert.strictEqual(M.setBonus({f: 'm1'}), M.CSET.B);
  assert.strictEqual(M.setBonus({f: 'm2'}), 1, 'rated: no more bonus');
  assert.strictEqual(M.setBonus({f: 'other'}), 1);
  assert.strictEqual(M.setBonus({f: 'm3'}), 1);
  assert.strictEqual(setEngine('coral', {}, set).setBonus({f: 'm2'}), M.CSET.B, 'no answer yet');
  assert.strictEqual(setEngine('fish', {}, set).setBonus({f: 'm1'}), 1, 'another subject: its own set, none here');
  assert.strictEqual(setEngine('coral', {}, {}).setBonus({f: 'm1'}), 1, 'no file: as before');
});

// photoSet itself (tests/rareease.js engine: one unit u, its photos L, one view): the members' share of the draws.
const L = Array.from({length: 10}, (_, i) => ({f: `p${i}`, o: `o${i}`}));
const rated = (n, extra = {}) => ({...Object.fromEntries(L.map(p => [p.f, [0, 20, 20, 20]])), ...extra, p0: [0, 20, 20, n]});
const draws = (o, N = 1500) => {
  const E = engine('coral', L, o);
  return Array.from({length: N}, () => E.photoSet('u', null, 0, 4, 'k4').shown[0].f);
};
const shareOf = (D, f) => D.filter(x => x === f).length / D.length;

test('photoSet: a member under its goal comes about CSET.B times as often, on a unit the player holds', () => {
  const set = {coral: {u: ['p0']}},
    held = {lv: 'met', th: 1.2},
    base = shareOf(draws({...held, PSTAT: rated(19)}), 'p0'),
    on = shareOf(draws({...held, PSTAT: rated(19), calset: set}), 'p0');
  // 10 photos alike: 1 in 10 without the set, 2 in 11 with it.
  assert.ok(Math.abs(base - 0.1) < 0.03, String(base));
  assert.ok(Math.abs(on - 2 / 11) < 0.035, String(on));
});

test('photoSet: draws as before with no set, at the goal, on a unit not held, or for a photo far from the target', () => {
  const set = {coral: {u: ['p0']}},
    held = {lv: 'met', th: 1.2},
    same = (o, why) => assert.deepStrictEqual(draws({...o, calset: set}, 400), draws(o, 400), why);
  assert.deepStrictEqual(draws({...held, PSTAT: rated(19), calset: {}}, 400), draws({...held, PSTAT: rated(19)}, 400), 'an empty set');
  same({...held, PSTAT: rated(20)}, 'the member at its goal');
  same({lv: 'new', th: 1.2, PSTAT: rated(19)}, 'a unit met for the first time');
  // p0 rated far harder than the question's target (about 1.2 - 1: more than one width away).
  same({...held, PSTAT: {...rated(19), p0: [4, 400, 400, 19]}}, 'a member the targeting leaves aside');
});

test('wired: app.js loads the file with the quiz tier, sw.js keeps it offline, photoSet reads the factor', () => {
  const app = read('app.js'),
    sw = read('sw.js'),
    model = read('model.js');
  assert.match(app, /json\('calibration-set\.json\?v=\d+'\)/);
  assert.match(cut(app, '2: ([f, q, k, cs]) => {', '\n  },', {file: 'app.js'}), /CALSET = cs \|\| \{\};/);
  assert.match(cut(sw, 'const SHELL = [', '];', {file: 'sw.js'}), /'calibration-set\.json\?v=\d+'/);
  // the factor of each photo is kept in the draw's data (drawPhotos sb), which photoSet applies under the same condition
  assert.match(cut(model, 'const drawPhotosCalc = ', '\n};\n', {file: 'model.js'}), /sb: setBonus\(p\)/);
  assert.match(cut(model, 'function photoSet(', '\n}\n', {file: 'model.js'}), /held && Math\.abs\(x\) <= 1 \? e\.sb : 1/);
});
