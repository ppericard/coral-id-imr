require('./slot.js').testGuard();
// No photo twice in a few questions (docs/LEARNING.md "No photo twice in a few questions"). A player's 8th and 10th
// answers showed the same Porites photo, a Lobophyllia question between them, both answered right: the photo quiz plans
// up to AHEAD questions ahead (quiz.js planNext), and the 10th was drawn while the 8th was only planned, before either
// was shown, so neither the photo memory (s.ps) nor the colonies held back (s.ro), both written at the answer, held its
// photo back. quiz.js's own planNext,
// planPhoto, planDuel and model.js's own photoSet and examSet run here in Node, the game around them stubbed.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');
const C = require('../core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const model = read('model.js'),
  quiz = read('quiz.js');
const code = [
  cut(model, 'const PICKD = {', '// The next exam question of genus n', {file: 'model.js'}),
  cut(model, 'const PDIFF = {', '\n}\n', {through: 1, file: 'model.js'}),
  cut(model, 'const PMEM0 = memOf();', '\n// Per-format offsets', {file: 'model.js'}),
  cut(model, 'const PFMT0 = ', '\n// Progress saved before the photo memory', {file: 'model.js'}),
  cut(model, 'function wpick(', '\n}\n', {through: 1, file: 'model.js'}),
  cut(model, 'const RECENT = ', '\n', {file: 'model.js'}),
  cut(model, '// The next exam question of genus n', '\n}\n', {through: 1, file: 'model.js'}),
  cut(model, 'const EXAM = {', '\n', {file: 'model.js'}),
  // The planner: the queue (AHEAD, NEXTQ, planNext, takePlan), the photo quiz's and the Duel tab's questions.
  cut(quiz, 'const AHEAD = 3;', 'let SHOWNQ = null;', {file: 'quiz.js'}),
  cut(quiz, "function planPhoto(cur = 'quiz', at = answersSoFar()) {", '\n}\n', {through: 1, file: 'quiz.js'}),
  cut(quiz, 'function planDuel(a, b)', '\n}\n', {through: 1, file: 'quiz.js'})
].join('\n');

// The game: units of nObs observations each (one photo each, the Colony view), all the photos of a unit far harder than
// a beginner's aim but its first one (`${n}0`), at the aim: the draw then favours that one strongly, as an easy Porites
// colony did for a beginner. seq: the units the draw asks, in turn (model.js nextTarget).
function game({units = {Porites: 20, Lobophyllia: 20, Plerogyra: 20, Acropora: 20}, seq = [], seed = 1} = {}) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647,
    M = Object.create(Math);
  M.random = rnd;
  const L = {},
    PSTAT = {};
  Object.entries(units).forEach(([n, k]) => {
    L[n] = Array.from({length: k}, (_, i) => ({f: `${n}${i}`, o: `obs-${n}-${i}`}));
    // [difficulty, answers]: rated by many answers, so the targeting reads them as they are.
    L[n].forEach((p, i) => (PSTAT[p.f] = [i ? 3 : -0.6, 400]));
  });
  const names = Object.keys(units),
    turn = [...seq];
  const ctx = {
    Math: M,
    SUBJ: C.subjectOf('coral'),
    calibOf: C.calibOf,
    unitRankOf: C.unitRankOf,
    refLevel: C.refLevel,
    phaseOf: C.phaseOf,
    varKindOf: C.varKindOf,
    VAR_AT: C.VAR_AT,
    varRamp: C.varRamp,
    VAR_GROUPS: C.VAR_GROUPS,
    varGroup: C.varGroup,
    varUnit: C.varUnit,
    varLeftOf: C.varLeftOf,
    memBucket: C.memBucket,
    aimOf: C.aimOf,
    DOM: C.DOM,
    TARGET_P: C.TARGET_P,
    AIM: C.AIM,
    LEVEL: '~level',
    P: Object.fromEntries(names.map(n => [n, {ok: 1, ko: 0}])),
    PSTAT,
    PGD: {},
    PMEM: [0, -0.45, -1.1, -1.7],
    memOf: C.memOf,
    PFMT: {},
    fmtOff: () => 0,
    GX: n => ({levels: 3, views: {wide: L[n]}}),
    imrFormsOf: () => ['a'],
    gamePics: (n, v) => (v === 'wide' ? L[n] : []),
    gamePhotoOk: () => true,
    isCore: () => false,
    level: () => ['new'],
    rankOf: () => '',
    shaky: () => true,
    recent: () => [],
    ability: () => 0,
    genScore: () => 0,
    LV_AT: [0.5, 0.8, 0.95],
    pick: a => a[Math.floor(rnd() * a.length)],
    mimTrap: (t, ch) => ch, // no look-alike drill
    // The planner's world: the photo quiz with every unit met, no card, no comeback, no duel, no exam, no typed question.
    n: 6,
    answersSoFar: () => ctx.n,
    photoQuiz: cur => cur === 'quiz',
    document: {querySelector: () => null},
    $v: {querySelector: () => ({})}, // a question on screen, not answered yet
    CUSTOM_H: 'practice/custom/play',
    customSel: () => null,
    pool: () => names,
    unlocked: () => names,
    holdEase: () => 0,
    CONTRAST: {P: 0, GAP: 2, Q: 3},
    rustNow: () => {},
    introStart: () => [],
    noOpen: () => true,
    introReady: () => true,
    introduced: () => true,
    cbIn: () => false,
    openRecent: () => [],
    asked: () => true,
    nextTarget: () => turn.shift() || names[0],
    planFind: () => null,
    examReady: () => false,
    recallAt: () => 1,
    trapsFor: () => 0,
    distractors: t => names.filter(n => n !== t).slice(0, 3),
    typedP: () => 0,
    TYPED: {k: Infinity},
    confusable: () => false,
    plausibleK: () => 4,
    confTerm: () => 0,
    cover: () => null,
    uname: n => n,
    shuffle: a => a,
    choiceNames: () => false,
    duelPick: () => ['Porites', 'Lobophyllia'],
    // The preloading: nothing to fetch here.
    img: () => '',
    qsrc: () => '',
    tileSrc: () => '',
    ownPhoto: () => false,
    AWAY: false,
    Image: function () {}
  };
  vm.createContext(ctx);
  vm.runInContext(
    `let SHOWNQ = null, last = null, lastQs = [], rematch = [], twoAt = -Infinity, twoPair = '';\n${code}\n` +
      `this.M = {planNext, takePlan, planDuel, photoSet, examSet, seenAdd, plans: () => { const L = []; for (let x = NEXTQ; x; x = x.next) L.push(x.args); return L; }, show: q => (SHOWNQ = q, seenAdd(q))};`,
    ctx
  );
  return Object.assign(ctx.M, {ctx, L});
}
const obsOf = q => q[4].shown[0].o;

test('the report: two questions planned ahead on one unit, one apart, never show the same colony', () => {
  // A question on screen (Plerogyra), the queue behind it Porites, Lobophyllia, Porites. In the app the queue is topped
  // up one question at a time (her 10th was added while her 7th was on screen, the 8th and 9th already queued); here it
  // is filled at once: either way the second Porites is drawn while the first is only planned. On main the two Porites
  // draws favoured the colony at the aim, drawn independently: the same one in 10 of these 40 sessions (and the Duel
  // tab's next duel in 9 of 40, below).
  let same = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const G = game({seq: ['Porites', 'Lobophyllia', 'Porites'], seed});
    G.show(G.takePlan('quiz') || ['quiz', 'Plerogyra', ['Plerogyra', 'Porites', 'Lobophyllia', 'Acropora'], '', G.photoSet('Plerogyra')]);
    G.planNext('quiz');
    const Q = G.plans();
    assert.strictEqual(Q.map(q => q[1]).join(), 'Porites,Lobophyllia,Porites', 'the three questions planned');
    if (obsOf(Q[0]) === obsOf(Q[2])) same++;
  }
  assert.strictEqual(same, 0, `${same} of 40 sessions showed one Porites colony twice, one question apart`);
});

test('a question shown, then the next ones planned and shown: no colony twice within RECENT questions', () => {
  // One unit asked at every question (the worst case, e.g. a custom quiz on one genus): the 10 questions of the window show
  // 10 different colonies, the easy one first; then the window lets the oldest back.
  const G = game({units: {Porites: 12, Acropora: 4, Lobophyllia: 4, Plerogyra: 4}, seq: Array(30).fill('Porites')}),
    shown = [];
  for (let i = 0; i < 24; i++) {
    G.ctx.n = i;
    const q = G.takePlan('quiz') || G.plans()[0] || ['quiz', 'Porites', ['Porites', 'Acropora', 'x', 'y'], '', G.photoSet('Porites')];
    G.show(q);
    shown.push(obsOf(q));
    G.planNext('quiz');
    assert.strictEqual(G.plans().length, 3, 'AHEAD questions planned');
  }
  for (let i = 0; i < shown.length; i++)
    for (let j = Math.max(0, i - 9); j < i; j++) assert.notStrictEqual(shown[i], shown[j], `questions ${j + 1} and ${i + 1}`);
});

test('a unit with every colony in the window: the one shown longest ago', () => {
  const G = game({units: {Porites: 3, Acropora: 4}});
  ['Porites1', 'Porites0', 'Porites2'].forEach(f => G.seenAdd(['quiz', 'Porites', [], '', {shown: [G.L.Porites.find(p => p.f === f)]}]));
  for (let i = 0; i < 20; i++) assert.strictEqual(G.photoSet('Porites').shown[0].f, 'Porites1');
  // A unit of one colony still shows it.
  const H = game({units: {Porites: 1, Acropora: 4}});
  H.seenAdd(['quiz', 'Porites', [], '', {shown: [H.L.Porites[0]]}]);
  assert.strictEqual(H.photoSet('Porites').shown[0].f, 'Porites0');
});

test('a colony counts by its observation and by its file, and Find the X counts its four tiles', () => {
  const G = game({units: {Porites: 2, Acropora: 4}});
  // Another photo of the same observation shown: the observation waits.
  G.seenAdd(['quiz', 'Porites', [], '', {shown: [{f: 'other-photo', o: 'obs-Porites-0'}]}]);
  for (let i = 0; i < 20; i++) assert.strictEqual(G.photoSet('Porites').shown[0].f, 'Porites1');
  const H = game({units: {Porites: 2, Acropora: 4}});
  H.seenAdd([
    'quiz',
    'Acropora',
    [],
    '',
    {
      shown: [],
      find: [
        {n: 'Porites', p: H.L.Porites[0]},
        {n: 'Acropora', p: H.L.Acropora[0]}
      ]
    }
  ]);
  for (let i = 0; i < 20; i++) assert.strictEqual(H.photoSet('Porites').shown[0].f, 'Porites1');
  // A question drawn again on screen (its page redrawn) counts once.
  const q = ['quiz', 'Acropora', [], '', {shown: [H.L.Acropora[1]]}];
  H.seenAdd(q);
  H.seenAdd(q);
  assert.strictEqual(vm.runInContext('SEENQ.length', H.ctx), 2);
});

test('only the last RECENT questions count', () => {
  const G = game({units: {Porites: 2, Acropora: 12}});
  G.seenAdd(['quiz', 'Porites', [], '', {shown: [G.L.Porites[0]]}]);
  for (let i = 0; i < 9; i++) G.seenAdd(['quiz', 'Acropora', [], '', {shown: [G.L.Acropora[i]]}]);
  for (let i = 0; i < 20; i++) assert.strictEqual(G.photoSet('Porites').shown[0].f, 'Porites1', 'in the window');
  G.seenAdd(['quiz', 'Acropora', [], '', {shown: [G.L.Acropora[9]]}]);
  const back = Array.from({length: 40}, () => G.photoSet('Porites').shown[0].f);
  assert.ok(back.includes('Porites0'), 'out of the window: drawn again');
});

test('the Duel tab: the duel planned while one is on screen never shows its colony again', () => {
  let same = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const G = game({seed});
    G.ctx.photoQuiz = () => false;
    G.ctx.duelPick = () => ['Porites', 'Porites'];
    const q = G.planDuel();
    G.show(q);
    G.planNext('quiz-duel');
    const [nx] = G.plans();
    if (obsOf(nx) === obsOf(q)) same++;
  }
  assert.strictEqual(same, 0);
});

test('the mastery exam never asks a photo shown or planned in the window while another is left', () => {
  const G = game({units: {Porites: 4, Acropora: 4}});
  // Porites2 is the hardest: the exam's pick among the photos never shown. Planned just before, it is not in s.ps yet.
  G.ctx.PSTAT.Porites2 = [5, 400];
  assert.strictEqual(G.examSet('Porites').shown[0].f, 'Porites2');
  G.seenAdd(['quiz', 'Porites', [], '', {shown: [G.L.Porites[2]]}]);
  for (let i = 0; i < 10; i++) assert.notStrictEqual(G.examSet('Porites').shown[0].f, 'Porites2');
});

// The window never leaves only the colonies the draw holds back (model.js photoSet, whole): before Open Water the hard
// ones (RARE), the variants not released yet (V). tests/rareease.js's harness: one fish family, one photo an observation.
const RE = require('./rareease.js');
const shownQ = f => ['quiz', 'u', [], '', {shown: [{f, o: f}]}];
test('before Open Water: every easy photo in the window, the one shown longest ago, never a hard one for it', () => {
  const L = [
    {f: 'e0', o: 'e0', e: 4},
    {f: 'e1', o: 'e1', e: 5},
    {f: 'e2', o: 'e2', e: 4}
  ];
  for (let i = 0; i < 60; i++) L.push({f: `h${i}`, o: `h${i}`, e: 1 + (i % 3)});
  const E = RE.engine('fish', L, {score: 0.2});
  ['e1', 'e0', 'e2'].forEach(f => E.seenAdd(shownQ(f)));
  let hard = 0,
    e1 = 0;
  const N = 600;
  for (let i = 0; i < N; i++) {
    const f = E.photoSet('u', null, 0, 4, 'k4').shown[0].f;
    if (f[0] === 'h') hard++;
    if (f === 'e1') e1++;
  }
  assert.ok(hard / N <= E.RARE.SHARE + 0.03, `under ease 4: ${hard} of ${N}`);
  assert.strictEqual(e1 + hard, N, 'the easy photo shown longest ago, the others in the window wait');
});
test('the variants on their ramp: every adult photo in the window, the one shown longest ago stays beside them', () => {
  // Between Open Water and Advanced (score 0.65) a class C juvenile weighs part of an adult photo (model.js varOf): with
  // every adult in the window and none kept, only juveniles would be left to draw.
  const L = [0, 1, 2].map(i => ({f: `a${i}`, o: `a${i}`, e: 4, t: 'Xus a'}));
  for (let i = 0; i < 20; i++) L.push({f: `j${i}`, o: `j${i}`, e: 4, t: 'Xus a', ph: 'juvenile'});
  const E = RE.engine('fish', L, {score: 0.65, juv: {cls: 'C'}});
  ['a2', 'a0', 'a1'].forEach(f => E.seenAdd(shownQ(f)));
  const D = Array.from({length: 600}, () => E.photoSet('u', null, 0, 4, 'k4').shown[0].f),
    adult = D.filter(f => f[0] === 'a');
  assert.ok(adult.length > 0 && adult.every(f => f === 'a2'), 'the adult shown longest ago, the two others wait');
  // One adult of three left: about a third of the adults' share with no window (158 of 600 measured); none without it.
  assert.ok(adult.length > 30, `the juveniles stay on their ramp: the adult ${adult.length} of 600`);
});

// The wiring the tests above stand in for (G.show): every question shown goes into the window, the live game's too.
test('the window is fed where a question shows: quiz.js question(), live.js liveBuild()', () => {
  const q = cut(quiz, 'function question(cur, target, choices, prompt, set, kq) {', '\n  const ph = set.shown', {file: 'quiz.js'});
  assert.ok(q.includes('seenAdd([cur, target, choices, prompt, set]);'), 'question() records its photos');
  const live = cut(read('live.js'), 'function liveBuild(t) {', '\n}\n', {through: 1, file: 'live.js'});
  assert.ok(/seenAdd\(\['live', t, ch, '', set\]\);\s*return \{ph/.test(live), 'liveBuild records the photos it sends');
});
