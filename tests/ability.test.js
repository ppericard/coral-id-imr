// The genus wrongly given in the Elo (2026-11-03, docs/LEARNING.md "The genus wrongly given in the Elo"): the app's
// own Elo (model.js abilityStep, run by tools/abilityeval.js on stubs) replayed on a made-up answer log of a strong
// player whose misses fall on look-alikes. The old rule (a: a full miss step on the genus given, at difficulty 0,
// its uncertainty never shrinking) drags every genus the player confuses down; the rule the app now follows (e: no
// step on the genus given, rule 13 kept in the progress) leaves the abilities near the truth and predicts the next
// answer better.
const test = require('node:test');
const assert = require('node:assert');
const {evaluate, kOf} = require('../tools/abilityeval.js');

// A seeded generator (mulberry32), so the log is the same on every run.
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const sig = x => 1 / (1 + Math.exp(-x));
// readAnswers rows [id, time ms, genus shown, answered, right, mode, photos, expected, ability, new, choices]: the app
// logs the expectation it had (ability th0, here a fixed 0) against the photo's difficulty d, which the replay recovers.
function log(truth, n, seed) {
  const r = rng(seed),
    G = ['Acropora', 'Montipora', 'Porites', 'Goniopora', 'Favites', 'Dipsastraea', 'Platygyra', 'Leptoria'],
    pair = g => G[G.indexOf(g) ^ 1], // each genus has one look-alike
    rows = [];
  for (let i = 0; i < n; i++) {
    const t = G[Math.floor(r() * G.length)],
      k = r() < 0.5 ? 2 : 4,
      d = truth - 1 + (r() - 0.5),
      p = 1 / k + (1 - 1 / k) * sig(truth - d),
      ok = r() < p,
      e = 1 / k + (1 - 1 / k) * sig(0 - d);
    rows.push(['p1', 1e12 + i * 1e4, t, ok ? t : pair(t), ok ? 1 : 0, `quiz|k${k}`, 'x', Math.round(e * 1000) / 1000, 0, 1, '']);
  }
  return rows;
}

test('number of choices as the app scored them', () => {
  assert.strictEqual(kOf('quiz|k2', ''), 2);
  assert.strictEqual(kOf('quiz|t', ''), Infinity);
  assert.strictEqual(kOf('quiz-duel|Halomitra|Danafungia', ''), 2);
  assert.strictEqual(kOf('quiz', 'A B C'), 3);
  assert.strictEqual(kOf('quiz', 'A B C D'), 4);
});

test('a strong player: no Elo step on the genus wrongly given keeps the abilities near the truth', () => {
  const truth = 1.5,
    {res, ref} = evaluate(log(truth, 400, 7), {variants: ['a', 'e'], min: 1}),
    a = res.a.per.p1,
    e = res.e.per.p1;
  // The old rule drags the genera down, well below the static fit of the same answers.
  assert.ok(ref.p1.genus - a.genus > 0.4, `old rule ${a.genus.toFixed(2)} vs fit ${ref.p1.genus.toFixed(2)}`);
  assert.ok(Math.abs(e.genus - truth) < Math.abs(a.genus - truth), `e ${e.genus.toFixed(2)}, a ${a.genus.toFixed(2)}`);
  assert.ok(e.genus > a.genus + 0.3, `e ${e.genus.toFixed(2)}, a ${a.genus.toFixed(2)}`);
  // ... and predicts the next answer better.
  assert.ok(res.e.all.ll < res.a.all.ll, `log-loss e ${res.e.all.ll} a ${res.a.all.ll}`);
  // The global level is the same Elo under both rules (only the genus wrongly given changes).
  assert.strictEqual(a.level, e.level);
});

test('a weak player is not over-rated without the step', () => {
  const truth = -0.5,
    {res} = evaluate(log(truth, 300, 11), {variants: ['a', 'e'], min: 1});
  assert.ok(res.e.per.p1.genus < truth + 0.6, `e ${res.e.per.p1.genus.toFixed(2)}`);
  assert.ok(res.e.all.ll <= res.a.all.ll + 0.005, `log-loss e ${res.e.all.ll} a ${res.a.all.ll}`);
});

// Codex review of #413: the game genera include Millepora (core.js gameOf), as the app's GX; a sheet export is replayed
// in time order (a stable sort of its text times); the group table takes every group any rule reached.
test('Millepora wrongly given counts as a game genus (the old penalty and the false-alarm marker)', () => {
  const {GAME} = require('../tools/abilityeval.js');
  assert.ok(GAME.has('Millepora'), 'Millepora in the game genera');
  const e = 1 / 4 + 3 / 4 / (1 + Math.exp(-1)),
    row = (i, t, a, ok) => ['p1', 1e12 + i * 1e4, t, a, ok, 'quiz', 'x', e, 0, 1, ''];
  const rows = [row(0, 'Acropora', 'Millepora', 0), row(1, 'Millepora', 'Millepora', 1)],
    {res} = evaluate(rows, {variants: ['a', 'e'], min: 1});
  assert.strictEqual((res.e.groups['after a false alarm'] || {}).n, 1);
  assert.ok(res.a.groups['after a false alarm'].mp < res.e.groups['after a false alarm'].mp, 'the old rule lowered Millepora');
});

test('a sheet export is replayed in time order, ties in the order logged', () => {
  const {normalise} = require('../tools/abilityeval.js');
  const r = (t, g) => ['p1', t, g, g, '1', 'quiz', 'x', 'id', '0.8', '0', '1', ''];
  // An offline device uploaded its older answers (10:01, 10:02) after a newer one (10:05) from another device.
  const n = normalise([r('2026-11-03 10:05', 'C'), r('2026-11-03 10:01', 'A'), r('2026-11-03 10:02', 'B1'), r('2026-11-03 10:02', 'B2')]);
  assert.deepStrictEqual(
    n.map(x => x.t),
    ['A', 'B1', 'B2', 'C']
  );
});

test('the group table takes the union of the groups of every rule', () => {
  const {groupsOf} = require('../tools/abilityeval.js');
  const res = {a: {groups: {k2: {}, 'level>=0.75': {}}}, 'e+L': {groups: {k2: {}, 'level 0-0.75': {}}}};
  assert.deepStrictEqual(groupsOf(res, ['a', 'e+L']), ['k2', 'level 0-0.75', 'level>=0.75']);
});

// Global level and genus (2026-11-03, docs/LEARNING.md "Global level and genus"): model.js's ability, levelMove and
// abilityStep run on stubs, as tests/memory.test.js does.
function appModel() {
  const fs = require('fs'),
    path = require('path'),
    vm = require('vm'),
    C = require('../core.js');
  const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    pick = (a, b) => src.slice(src.indexOf(a), src.indexOf(b)),
    ctx = {P: {}, playerStart: C.playerStart, LEVEL: C.LEVEL, sig: x => 1 / (1 + Math.exp(-x))};
  vm.createContext(ctx);
  vm.runInContext(pick('const ELO =', '// For My progress') + '\nthis.M = {ELO, ability, abilityStep, levelMove};', ctx);
  return ctx;
}

test('a genus moves with the global level since its own last step, weighed by its own uncertainty, both ways', () => {
  const X = appModel(),
    {ability, levelMove, ELO} = X.M,
    L = '~level';
  X.P = {
    [L]: {ok: 100, ko: 20, th: 1.2},
    A: {ok: 3, ko: 0, th: 0.5, lt: 0.6},
    B: {ok: 30, ko: 0, th: 0.5, lt: 0.6},
    C: {ok: 3, ko: 0, th: 0.5}
  };
  // The level rose 0.6 since A's and B's last step: A (3 answers) takes 0.6 / (1 + 3/15) = 0.5, B (30) 0.6 / 3 = 0.2.
  assert.strictEqual(levelMove('A', X.P.A), 0.5);
  assert.strictEqual(ability('A'), 1);
  assert.strictEqual(ability('B'), 0.7);
  // Progress saved before (no lt): its own estimate only; the level itself never moves with itself.
  assert.strictEqual(ability('C'), 0.5);
  assert.strictEqual(ability(L), 1.2);
  // A fall moves it down the same way (a one-way rise was biased upward).
  X.P[L].th = 0;
  assert.strictEqual(ability('A'), 0);
  // Within the Elo's bounds.
  X.P[L].th = 9;
  assert.strictEqual(ability('A'), ELO.hi);
});

test("the genus's own step takes the level's move in and marks the level it was taken against", () => {
  const X = appModel(),
    {ability, abilityStep} = X.M,
    L = '~level';
  X.P = {[L]: {ok: 50, ko: 10, th: 1}, A: {ok: 4, ko: 1, th: 0.2, lt: 0}};
  const before = ability('A');
  X.P.A.ok++;
  abilityStep('A', X.P.A, true, 0, 4);
  assert.strictEqual(X.P.A.lt, 1);
  assert.ok(X.P.A.th > before, `${X.P.A.th} after ${before}`);
  assert.strictEqual(ability('A'), X.P.A.th, 'no move left once taken in');
});

test('small steps of the global level add up instead of being rounded away (Codex review #415)', () => {
  const X = appModel(),
    {abilityStep} = X.M,
    L = '~level';
  X.P = {[L]: {ok: 1500, ko: 0, th: 1, vr: 0}};
  for (let i = 0; i < 1000; i++) {
    X.P[L].ok++;
    abilityStep(L, X.P[L], true, 0, 4);
  }
  assert.ok(X.P[L].th > 1.05, `the level stayed at ${X.P[L].th} after 1000 right answers`);
});

test("the global level's step has no floor: it settles as its answers build up", () => {
  const X = appModel(),
    {abilityStep, ELO} = X.M,
    L = '~level';
  // 600 answers, predictable (vr 0): a genus still steps by about kmin, the level by about kmax / (1 + 600/15).
  X.P = {[L]: {ok: 500, ko: 100, th: 1, vr: 0}, A: {ok: 500, ko: 100, th: 1, vr: 0}};
  abilityStep(L, X.P[L], false, 0, 4);
  abilityStep('A', X.P.A, false, 0, 4);
  const dL = 1 - X.P[L].th,
    dA = 1 - X.P.A.th;
  assert.ok(dL < dA / 2, `level step ${dL}, genus step ${dA}`);
  assert.ok(dA >= ELO.kmin * 0.5, `genus step ${dA}`);
});

test('the level a genus was stepped against travels with its ability between devices, not between accounts', () => {
  const {mergeProgress, mergeUsers} = require('../core.js');
  const B = {A: {ok: 2, ko: 0, th: 0.3, lt: 0.1}},
    P = {A: {ok: 3, ko: 0, th: 0.5, lt: 0.4}},
    R = {A: {ok: 2, ko: 0, th: 0.3, lt: 0.1}};
  const m = mergeProgress(B, P, R);
  assert.strictEqual(m.A.th, 0.5);
  assert.strictEqual(m.A.lt, 0.4);
  const u = mergeUsers(
    {'imr-coral-progress': JSON.stringify({A: {ok: 9, ko: 1, th: 1, lt: 0.8}})},
    {'imr-coral-progress': JSON.stringify({A: {ok: 1, ko: 0, th: 0, lt: 0}})}
  );
  const prog = JSON.parse(u['imr-coral-progress']);
  assert.strictEqual(prog.A.th, 1);
  assert.strictEqual(prog.A.lt, undefined);
});

// Beginners and experts (2026-11-03, docs/LEARNING.md "Beginners and experts"): the success aimed for follows the global
// level, 85% up to 0.5, 75% from 1.5, a straight line between, flat outside; the photo's aim (aimOff) follows it.
test('the success aimed for follows the global level, with no cliff', () => {
  const fs = require('fs'),
    path = require('path'),
    vm = require('vm');
  const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    pick = (a, b) => src.slice(src.indexOf(a), src.indexOf(b)),
    ctx = {P: {}, LEVEL: '~level'};
  vm.createContext(ctx);
  vm.runInContext(pick('const PICKD =', '// The schedule of the format') + '\nthis.M = {aimP, aimOff, PICKD};', ctx);
  const at = L => ((ctx.P = {'~level': {th: L}}), ctx.M.aimP()),
    near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
  near(at(-1), 0.85);
  near(at(0.5), 0.85);
  near(at(1), 0.8);
  near(at(1.5), 0.75);
  near(at(3), 0.75);
  ctx.P = {};
  near(ctx.M.aimP(), 0.85, 'a new player is aimed at 85%');
  // Continuous: no step anywhere between.
  for (let L = -1; L < 3; L += 0.01) assert.ok(Math.abs(at(L + 0.01) - at(L)) <= 0.001 + 1e-9, `step at ${L}`);
  // The photo is aimed further below the ability for a beginner (easier) than for a strong player.
  ctx.P = {'~level': {th: 0}};
  const easy = ctx.M.aimOff(4);
  ctx.P = {'~level': {th: 2}};
  assert.ok(easy > ctx.M.aimOff(4) + 0.5, `${easy} vs ${ctx.M.aimOff(4)}`);
});

// Codex review #415: the level bands come from one reference level, whatever the model replayed (--model) or the rule
// (+L): two models whose levels step differently put the same answers in each band.
test('the level bands are the same answers whatever the model or the rule', () => {
  const fs = require('fs'),
    os = require('os'),
    path = require('path'),
    E = require('../tools/abilityeval.js');
  const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    floored = src.replace('Math.max(n === LEVEL ? 0 : ELO.kmin,', 'Math.max(ELO.kmin,'),
    file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'abilityeval-')), 'model.js');
  assert.notStrictEqual(floored, src, 'the level step is found');
  fs.writeFileSync(file, floored);
  const rows = log(1.2, 300, 5),
    L = res => res.scored.map(o => o.L);
  E.useModel(path.join(__dirname, '..', 'model.js'));
  const a = E.evaluate(rows, {variants: ['e', 'e+L'], min: 1}).res;
  E.useModel(file);
  const b = E.evaluate(rows, {variants: ['e'], min: 1}).res;
  E.useModel(path.join(__dirname, '..', 'model.js'));
  assert.deepStrictEqual(L(a.e), L(b.e));
  assert.deepStrictEqual(L(a['e+L']), L(a.e));
  // ... while the two models' own levels do differ.
  assert.notDeepStrictEqual(
    a.e.scored.map(o => o.pl),
    b.e.scored.map(o => o.pl)
  );
});

// Codex review #425: the known mix-ups' term in the replay. Rows with choices, misses on the look-alike, so the term is
// not zero.
function logCh(n, seed, t0) {
  const G = ['Acropora', 'Montipora', 'Porites', 'Goniopora', 'Favites', 'Dipsastraea', 'Platygyra', 'Leptoria'],
    r = rng(seed),
    pair = g => G[G.indexOf(g) ^ 1];
  return log(0.8, n, seed).map((row, i) => {
    const t = row[2],
      ch = [t, pair(t), ...G.filter(g => g !== t && g !== pair(t)).slice(0, 2)].join(' ');
    return [row[0], t0 + i * 1e4, t, row[3], row[4], 'quiz', row[6], Math.round((1 / 4 + (3 / 4) * sig(r() - 1)) * 1000) / 1000, 0, 1, ch];
  });
}

test('the level bands hold the same answers with or without the known mix-ups term', () => {
  const {res} = evaluate(logCh(300, 9, 1e12), {variants: ['e', 'e+X+M'], min: 1});
  assert.ok(res['e+X+M'].per.p1 && res['e+X+M'].scored.some(o => o.cf > 0), 'the term is not zero on these answers');
  assert.deepStrictEqual(
    res['e+X+M'].scored.map(o => o.L),
    res.e.scored.map(o => o.L)
  );
});

test("an answer logged with the app's own mix-ups term does not count it twice", () => {
  // The same expectations logged before the release (no term in e) under rule e, and after it (the app's term in e)
  // under rule e+X+M (the app's rule): the term recovered from the log is the rule's own, so the replays agree.
  const before = evaluate(logCh(300, 9, 1e12), {variants: ['e'], min: 1}).res.e.scored,
    after = evaluate(logCh(300, 9, Date.parse('2027-01-01T00:00:00Z')), {variants: ['e+X+M'], min: 1}).res['e+X+M'].scored;
  assert.ok(
    after.some(o => o.cf > 0),
    'the term is not zero on these answers'
  );
  assert.deepStrictEqual(
    after.map(o => Math.round(o.p * 1e9)),
    before.map(o => Math.round(o.p * 1e9))
  );
});
