// The learning fixes of 2026-11-04 (docs/LEARNING.md "Opening pace", "Easier questions when a run goes wrong", "Known
// mix-ups", "Look-alikes from the data", "The apology card"): model.js's and quiz.js's own code run in Node on stubs (the
// player's record P, the cards, the store), core.js's pure rules directly.
const test = require('node:test');
const cut = require('./block.js'); // the block of a browser file a test runs, its markers checked
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
// model.js from the progressive path to the comeback: OPEN, openRecent, openPace, the cards (INTRO, introAdd...), the
// opening hold (holdStep, introHold, holdEase), on stubs.
function model({P = {}} = {}) {
  const src = read('model.js'),
    block = cut(src, '// Progressive path (Pierre', 'const introSince');
  const saved = {},
    ctx = {
      ...require('./subj.stub.js')(), // the corals as the current subject
      P,
      LEVEL: '~level',
      n: 0,
      Date,
      PSTAT: {},
      slateGenera: () => Object.keys(P).filter(n => n !== '~level'),
      syncSoon: () => {},
      // The first-launch question (core.js CHOICE; model.js startSet and its window, in the same block).
      ...(({CHOICE, startOpt, startVars, startCheck, startNext, startInfer}) => ({
        CHOICE,
        startOpt,
        startVars,
        startCheck,
        startNext,
        startInfer
      }))(C),
      basicsDone: () => false,
      document: {querySelectorAll: () => []},
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))}
    };
  ctx.answersSoFar = () => ctx.n;
  vm.createContext(ctx);
  vm.runInContext(
    block +
      '\nthis.M = {OPEN, INTRO, openRecent, openPace, introAdd, introMap, introAll, introBack, holdStep, introHold, holdEase, setHold: h => (HOLDS = h)};',
    ctx
  );
  return Object.assign(ctx.M, {ctx});
}

test('opening pace: no new genus while one carded in the window is not asked yet', () => {
  const P = {A: {ok: 5, ko: 0}, B: {ok: 4, ko: 1}, C: {}, D: {}};
  const M = model({P});
  M.ctx.n = 20;
  M.introAdd(['C'], false); // a card at answer 20
  assert.strictEqual(M.openRecent().join(), 'C');
  M.ctx.n = 23;
  assert.strictEqual(M.openPace(), false, 'C carded, not asked: no card');
  // Its question already on screen or planned before this one counts as asked by then.
  assert.strictEqual(M.openPace(23, ['C']), true);
  P.C = {ok: 1, ko: 0};
  assert.strictEqual(M.openPace(), true, 'C asked: the next card may come');
  // A genus carded long ago and never asked no longer holds the cards: OPEN.WIN answers at most.
  M.introAdd(['D'], false);
  assert.strictEqual(M.openPace(), false);
  M.ctx.n = 23 + M.OPEN.WIN;
  assert.strictEqual(M.openPace(), true, 'out of the window');
});

test('opening pace: at most OPEN.MAX genera carded in any OPEN.WIN answers', () => {
  const P = {};
  'ABCDEFG'.split('').forEach(n => (P[n] = {}));
  const M = model({P});
  assert.deepStrictEqual([M.OPEN.MAX, M.OPEN.WIN], [3, 15]);
  // Three cards at answers 10, 13, 16, each genus asked right away.
  ['A', 'B', 'C'].forEach((n, i) => {
    M.ctx.n = 10 + 3 * i;
    M.introAdd([n], false);
    P[n] = {ok: 1, ko: 0};
  });
  M.ctx.n = 19;
  assert.strictEqual(M.openPace(), false, 'three in the window');
  M.ctx.n = 24; // A, carded at answer 10, is still in the window: 24 - 10 < 15
  assert.strictEqual(M.openPace(), false);
  M.ctx.n = 25;
  assert.strictEqual(M.openPace(), true, 'A out of the window: two left');
  assert.strictEqual(M.openPace(19), false, 'counted at the answers count the question will show at');
});

test('opening pace: the first cards count, Open all and a genus closed again do not', () => {
  const P = {};
  'ABCDEFGH'.split('').forEach(n => (P[n] = {}));
  const M = model({P});
  M.introAdd(['A', 'B', 'C', 'D'], true); // the first cards, at answer 0
  M.ctx.n = 5;
  assert.strictEqual(M.openRecent().length, 4);
  assert.strictEqual(M.openPace(), false);
  // Open all ('a') and the genera "One at a time" closes ('b') take no place.
  M.ctx.n = 40;
  M.introAll('offer');
  assert.strictEqual(M.openRecent().length, 0);
  assert.strictEqual(M.openPace(), true);
  M.introBack(false);
  assert.strictEqual(M.openRecent().length, 0);
});

test('easier questions while the opening hold is on: smooth from INTRO.HOLD, one logit an answer beyond it', () => {
  const M = model();
  for (const [h, want] of [
    [0, 0],
    [1.4, 0],
    [M.INTRO.HOLD, 0],
    [2, -0.5],
    [3, -1.5],
    [4.31, -2.81]
  ]) {
    M.setHold(h);
    assert.ok(Math.abs(M.holdEase() - want) < 1e-9, `h ${h}: ${M.holdEase()}`);
  }
  // Right answers pay h back, and the ease with it: no cliff when the hold ends.
  M.setHold(1.7);
  M.holdStep(0.9, true); // 1.7 + 0.9 - 1 - 0.1 = 1.5
  assert.strictEqual(M.holdEase(), 0);
  // The format aims lower too: the traps and single views of FORMAT at the eased ability.
  const src = read('model.js'),
    f = {};
  vm.createContext(f);
  vm.runInContext(/const FORMAT = [\s\S]*?\n};\n/.exec(src)[0] + 'this.formatAt = formatAt;', f);
  assert.ok(f.formatAt(0.54 - 0.5)[0] < f.formatAt(0.54)[0], 'fewer traps at the eased ability');
});

test('known mix-ups: core.js confGap, the player own score of the pair over the pooled one, in logits', () => {
  // Nothing of their own, or no more mix-ups than everyone: 0.
  assert.strictEqual(C.confGap(null, 0.2), 0);
  assert.strictEqual(C.confGap([0, 0], 0.2), 0);
  assert.strictEqual(C.confGap([6, 0], 0.2), 0);
  assert.strictEqual(C.confGap([10, 2], 0.2), 0);
  // A pair this player mixes up 5 times in 10 against 23% for everyone: (5 + 8 x 0.23) / 18 = 0.38, 0.72 logits harder.
  const g = C.confGap([10, 5], 0.23),
    lo = p => Math.log(p / (1 - p));
  assert.ok(Math.abs(g - (lo((5 + 8 * 0.23) / 18) - lo(0.23))) < 1e-9, String(g));
  assert.ok(C.confGap([10, 8], 0.23) > g && g > C.confGap([10, 4], 0.23), 'grows with the mix-ups');
});

test('known mix-ups: model.js confTerm, the most over the choices, only with 3 or more plausible choices', () => {
  const src = read('model.js'),
    P = {T: {off: {X: 10, Y: 2}, conf: {X: 5}}, X: {}, Y: {conf: {T: 1}}, Z: {}},
    ctx = {P, confGap: C.confGap, pairConf: C.pairConf, GX: n => n in P, pooledConf: () => 0.2};
  vm.createContext(ctx);
  vm.runInContext(/const confTerm = [\s\S]*?;\n/.exec(src)[0] + 'this.confTerm = confTerm;', ctx);
  const t4 = ctx.confTerm('T', ['T', 'X', 'Y', 'Z'], 4);
  assert.ok(Math.abs(t4 - C.confGap(C.pairConf(P, 'T', 'X'), 0.2)) < 1e-9, 'the most: X');
  assert.ok(t4 > 0.5);
  assert.strictEqual(ctx.confTerm('T', ['T', 'X'], 2), 0, 'a 2-choice contrast question of the pair: none');
  assert.strictEqual(ctx.confTerm('T', ['T', 'Z', 'Y', 'X'], 2), 0, 'easy choices (2 plausible): none');
  assert.strictEqual(ctx.confTerm('T', ['T', 'Z'], 3), 0, 'no mixed-up genus among the choices');
  assert.strictEqual(ctx.confTerm('T', [], Infinity), 0, 'typed: no choices');
});

test('look-alikes from the data: core.js dataLook, CONF.N offers and a pooled score of CONF.TRAP', () => {
  assert.deepStrictEqual([C.CONF.N, C.CONF.TRAP], [20, 0.2]);
  const sc = (c, prior) => C.confScore(c, prior);
  // The pair of 2026-11-03: 30 offers, 8 mix-ups, two genera sharing a growth form (prior 0.08): 0.227.
  assert.strictEqual(C.dataLook([30, 8], sc([30, 8], C.CONF.FORM)), true);
  // Enough mix-ups but too few offers.
  assert.strictEqual(C.dataLook([15, 6], sc([15, 6], C.CONF.FORM)), false);
  // Enough offers, not mixed up often enough (34 offers, 7 mix-ups: 0.18).
  assert.strictEqual(C.dataLook([34, 7], sc([34, 7], C.CONF.FORM)), false);
  // At 20 offers two unrelated genera (prior 0.03) need 6 mix-ups.
  assert.strictEqual(C.dataLook([20, 5], sc([20, 5], C.CONF.BASE)), false);
  assert.strictEqual(C.dataLook([20, 6], sc([20, 6], C.CONF.BASE)), true);
  assert.strictEqual(C.dataLook(null, 0.5), false);
});

test('the Duel tab: its photo eased by the opening hold, as every question of the photo quiz but an exam (planDuel)', () => {
  const src = read('quiz.js'),
    calls = [],
    ctx = {
      pool: () => ['A', 'B', 'C'],
      unlocked: () => ['A', 'B', 'C'], // model.js: the genera unlocked, the Duel tab's only source
      GX: n => ({n}),
      photoSet: (...a) => (calls.push(a), {shown: [{f: 'x'}]}),
      duelPick: () => ['A', 'B'],
      pick: L => L[0],
      introduced: () => true,
      cover: () => null,
      uname: n => n,
      ease: 0,
      holdEase: () => ctx.ease
    };
  vm.createContext(ctx);
  vm.runInContext(/function planDuel\(a, b\) \{[\s\S]*?\n\}\n/.exec(src)[0] + 'this.planDuel = planDuel;', ctx);
  for (const [ease, args] of [
    [0, []],
    [-0.8, []],
    [-2.5, ['A', 'B']]
  ]) {
    ctx.ease = ease;
    calls.length = 0;
    const q = ctx.planDuel(...args);
    // The duel's own photo: the last photoSet call (a pair from a link is checked with plain calls first).
    const [t, , shift, k] = calls[calls.length - 1];
    assert.deepStrictEqual([t, shift, k], ['A', ease, 2], `ease ${ease}`);
    assert.strictEqual(q[1], 'A');
  }
});

test('the Duel tab relief card: due after an answer takes the hold across INTRO.HOLD from below, once a run', () => {
  const src = read('quiz.js'),
    ctx = {INTRO: {HOLD: 1.5}, h: 0};
  ctx.introHold = () => ctx.h >= ctx.INTRO.HOLD;
  vm.createContext(ctx);
  vm.runInContext(
    /let DUELRUN = .*\n/.exec(src)[0] +
      /const reliefNote = .*\n/.exec(src)[0] +
      /const reliefDue = .*\n/.exec(src)[0] +
      'this.R = {note: reliefNote, due: reliefDue, run: () => DUELRUN};',
    ctx
  );
  const {note, due, run} = ctx.R;
  const step = (r, h1) => {
    const x = note(r, ctx.h, h1);
    ctx.h = h1;
    return x;
  };
  let r = run();
  assert.deepStrictEqual({...r}, {up: 0, shown: 0}, 'a run starts empty');
  r = step(r, 1.2);
  assert.strictEqual(due(r), false, 'under INTRO.HOLD');
  r = step(r, 1.5);
  assert.strictEqual(due(r), true, 'crossed from below: due');
  // A break it could not take: still due at the next one while the hold is on, not once it is off.
  r = step(r, 1.9);
  assert.strictEqual(due(r), true);
  r = step(r, 1.4);
  assert.strictEqual(due(r), false, 'the hold fell back under INTRO.HOLD');
  r = step(r, 1.6);
  assert.strictEqual(due(r), true, 'crossed again before it showed');
  r = {...r, shown: 1};
  r = step(step(r, 1), 2);
  assert.strictEqual(due(r), false, 'shown: never again in the run');
  // A run that starts with the hold already on: no crossing, no card, whatever the misses.
  ctx.h = 2;
  r = step(step({up: 0, shown: 0}, 2.7), 3.4);
  assert.strictEqual(due(r), false);
});

test('the Duel tab relief card: back from its comparison, the same run goes on; any other way, a new one', () => {
  const src = read('quiz.js'),
    events = [],
    ctx = {
      hash: '',
      session: {n: 7},
      ev: (k, o) => events.push(o.r),
      takePlan: () => null,
      planDuel: (a, b) => ['quiz-duel|' + a + '|' + b, a, [a, b], '', {}],
      question: () => {},
      introduced: () => true,
      starRefs: () => [],
      introShow: () => {},
      DATA: {}
    };
  ctx.hashNow = () => ctx.hash;
  vm.createContext(ctx);
  vm.runInContext(
    /let DUELRUN = .*\n/.exec(src)[0] +
      /let DUELBACK = null;\n/.exec(src)[0] +
      /const duelBackFor = .*\n/.exec(src)[0] +
      /const duelBackKeep = .*\n/.exec(src)[0] +
      /function quizDuel\(a, b, fresh = true, from = ''\) \{[\s\S]*?\n\}\n/.exec(src)[0] +
      'this.D = {quizDuel, keep: duelBackKeep, backFor: duelBackFor, run: () => DUELRUN, set: (r, b) => ((DUELRUN = r), (DUELBACK = b))};',
    ctx
  );
  const D = ctx.D,
    duel = 'quiz-duel|A|B',
    cmp = 'cmp-A|B',
    shownRun = {up: 1, shown: 1};
  // Compare them from the card: the comparison has its way back; the duel opened from it is the same run, logged.
  D.set(shownRun, {h: duel, cmp, run: shownRun, d: 3});
  D.keep(cmp);
  assert.ok(D.backFor(cmp), 'the comparison opened from the card');
  ctx.hash = duel;
  D.keep(duel);
  D.quizDuel('A', 'B', true, cmp);
  assert.strictEqual(D.run(), shownRun, 'the same run');
  assert.deepStrictEqual(events, ['back']);
  assert.strictEqual(D.backFor(cmp), null, 'used once');
  // Next in the run: nothing changes.
  D.quizDuel('A', 'B', false, duel);
  assert.strictEqual(D.run(), shownRun);
  // Another page in between: the way back is dropped, the duel opened again is a new run.
  D.set(shownRun, {h: duel, cmp, run: shownRun, d: 3});
  D.keep('genera');
  assert.strictEqual(D.backFor(cmp), null);
  D.quizDuel('A', 'B', true, 'genera');
  assert.deepStrictEqual({...D.run()}, {up: 0, shown: 0});
  // The duel opened fresh from anywhere else than its comparison: a new run, nothing logged.
  D.set(shownRun, {h: duel, cmp, run: shownRun, d: 3});
  D.quizDuel('A', 'B', true, 'home');
  assert.deepStrictEqual({...D.run()}, {up: 0, shown: 0});
  assert.deepStrictEqual(events, ['back']);
});

test('the Again queue: up to CONTRAST.Q pairs, oldest first, none pushed out by a newer one, none twice', () => {
  const src = read('quiz.js'),
    ctx = {};
  vm.createContext(ctx);
  vm.runInContext(
    /const CONTRAST = .*\n/.exec(src)[0] +
      'let rematch = null;\n' +
      /const rematchAdd = [\s\S]*?\n};\n/.exec(src)[0] +
      'this.Q = {CONTRAST, add: rematchAdd, q: () => rematch};',
    ctx
  );
  const {add, q, CONTRAST} = ctx.Q;
  // CONTRAST.Q pairs fill it (whatever Q is), a pair already waiting is not queued twice, one more waits.
  const pairs = Array.from({length: CONTRAST.Q + 1}, (_, i) => ['P' + i, 'Q' + i]);
  assert.ok(CONTRAST.Q >= 2, String(CONTRAST.Q));
  assert.strictEqual(add(pairs[0], 10), true);
  assert.strictEqual(add(pairs[0].slice().reverse(), 11), true, 'already waiting: still coming, not queued twice');
  pairs.slice(1, -1).forEach((p, i) => assert.strictEqual(add(p, 12 + i), true));
  assert.strictEqual(add(pairs[CONTRAST.Q], 50), false, 'full: the newest waits for its next miss');
  assert.strictEqual(
    q()
      .map(r => r.pair.join('|') + '@' + r.at)
      .join(' '),
    pairs
      .slice(0, -1)
      .map((p, i) => p.join('|') + '@' + (i ? 11 + i : 10))
      .join(' ')
  );
});

test('the apology card: only to a player who felt it (20 answers in the window, a clear shortfall), once, until UNTIL', () => {
  const {FROM, UNTIL, N, H, CARDS} = C.SORRY;
  assert.strictEqual(FROM, Date.parse('2026-11-03T11:34:11Z'), '#408 merged');
  assert.deepStrictEqual([N, H, CARDS], [20, 3, 4]);
  const first = Date.parse('2026-11-04T02:00:00Z'),
    now = first + 1000,
    inW = k => new Date(Date.parse('2026-11-03T13:00:00Z') + k * 20000).toISOString(),
    before = k => new Date(Date.parse('2026-11-03T08:00:00Z') + k * 20000).toISOString(),
    log = (n, at = inW) => Array.from({length: n}, (_, k) => ({t: at(k), ok: 1, e: 0.8}));
  // Signed out: the device keeps every answer. 25 in the window, the hold's sum at 3.5 then: due.
  const felt = C.sorryOf({log: log(25), cards: {}, total: 60, h: 3.5, first});
  assert.deepStrictEqual({...felt}, {n: 25, h: 3.5, c: 0});
  assert.strictEqual(C.sorryDue({felt, now, shown: 0}), true);
  assert.strictEqual(C.sorryDue({felt, now, shown: now - 5}), false, 'shown once');
  assert.strictEqual(C.sorryDue({felt, now: UNTIL, shown: 0}), false, 'too late');
  // A single answer in the window, however it went; answers before the window only; a run at the expected success.
  assert.strictEqual(C.sorryFelt(C.sorryOf({log: log(1), cards: {}, total: 1, h: 0.7, first})), false);
  assert.strictEqual(C.sorryFelt(C.sorryOf({log: log(40, before), cards: {}, total: 40, h: 4, first})), false);
  assert.strictEqual(C.sorryFelt(C.sorryOf({log: log(40), cards: {}, total: 40, h: 1.2, first})), false);
  // Cards kept from before their times were (no time): they say nothing about the window.
  assert.strictEqual(C.sorryOf({log: log(25, before), cards: {A: [0, 1], B: [0, 1]}, total: 25, h: 3.5, first}).n, 0);
  // Signed in: the answers sent are no longer on the device; counted from the last card before the window. The strong
  // player of 2026-11-03: 46 answers since the card at 184, 7 cards in 16 answers in the window, the hold at 3.22.
  const t = s => Date.parse('2026-11-03T' + s + 'Z'),
    cards = {A: [0, 1, t('02:29:00'), 's'], B: [184, 0, t('04:46:00'), 'c']};
  [199, 202, 204, 206, 208, 211, 215].forEach((a, i) => (cards['N' + i] = [a, 0, t('12:59:00') + i * 30000, 'c']));
  const strong = C.sorryOf({log: [], cards, total: 230, h: 3.22, first});
  assert.deepStrictEqual({...strong}, {n: 46, h: 3.22, c: 6});
  assert.strictEqual(C.sorryFelt(strong), true);
  // Many cards at once and some shortfall (half of H) is enough; many cards and no shortfall is not.
  assert.strictEqual(C.sorryFelt({...strong, h: 1.6}), true);
  assert.strictEqual(C.sorryFelt({...strong, h: 0.4}), false);
  assert.strictEqual(C.sorryFelt({n: 31, h: 4.31, c: 0}), true, 'the second run: 31 answers, the hold at 4.31');
  assert.strictEqual(C.sorryFelt({n: 12, h: 4.31, c: 0}), false, 'too few answers in the window');
});

test('firstName: the first word of the sign-in name, capitalised; nothing usable gives ""', () => {
  for (const [n, want] of [
    ['Ana Lopez', 'Ana'],
    ['Ana B.', 'Ana'],
    ['Ana B', 'Ana'],
    ['Ana', 'Ana'],
    ['  ana   maria  ', 'Ana'],
    ['élodie', 'Élodie'],
    ["O'Neil Smith", "O'Neil"],
    ['Jean-Luc', 'Jean-Luc'],
    ['', ''],
    [undefined, ''],
    ['   ', ''],
    ['~a8x', ''],
    ['123', '']
  ])
    assert.strictEqual(C.firstName(n), want, JSON.stringify(n));
});

test('the apology card: greeted by the first word of the sign-in name, else "Hi!"; when said in the player own day', () => {
  assert.strictEqual(C.sorryHi('Ana'), 'Hi Ana!');
  assert.strictEqual(C.sorryHi('  ana Maria Lopez '), 'Hi Ana!');
  assert.strictEqual(C.sorryHi('~a8x'), 'Hi!');
  assert.strictEqual(C.sorryHi(''), 'Hi!');
  assert.strictEqual(C.sorryHi(undefined), 'Hi!');
  const manila = -480; // getTimezoneOffset in Manila (UTC+8): the window opened at 19:34 there
  const next = C.sorryText('Ana', Date.parse('2026-11-04T03:00:00Z'), manila);
  assert.strictEqual(next.t, 'Hi Ana! Sorry about your last run.');
  assert.strictEqual(
    next.p,
    "Yesterday evening we adjusted how the app picks your questions, and some of it wasn't right yet: too many new genera came at once, and the questions didn't get easier after misses. It's fixed now. Sorry for the rough ride!"
  );
  assert.match(C.sorryText('', Date.parse('2026-11-03T15:00:00Z'), manila).p, /^This evening we adjusted/);
  assert.match(C.sorryText('', Date.parse('2026-11-06T03:00:00Z'), manila).p, /^On 3 November we adjusted/);
  assert.match(C.sorryText('', Date.parse('2026-11-04T03:00:00Z'), 0).p, /^Yesterday morning we adjusted/);
});

// One genus difficulty (Pierre, 2026-11-06, Q133; docs/LEARNING.md "One genus difficulty"): genusDiff is the sheet's genus
// offset (PGD, ?stats=1 gd), plus the mean judged-ease prior of a unit's judged photos (the fish); never the mean of its
// photos' ratings (adding or curating out a photo moved it) nor a confusion term (the misses counted twice).
test('genusDiff: the genus offset, whatever photos the genus has; the judged-ease prior for judged photos', () => {
  const src = read('model.js'),
    views = {
      A: [{f: 'a1'}, {f: 'a2'}],
      B: [{f: 'b1'}],
      F: [
        {f: 'f1', e: 5},
        {f: 'f2', e: 2}
      ]
    },
    ctx = {
      VIEWS: [['wide']],
      gamePics: n => views[n] || [],
      PGD: {A: [-0.54, 80], B: [0.9, 12]},
      PDIFF: {W: 5, EASE: 0.5, MID: 3},
      // A photo rating far from its genus and a pooled mix-up the old rule counted: neither is read.
      PSTAT: {a1: [3, 50, 10]},
      pooledConf: () => 0.9
    };
  vm.createContext(ctx);
  vm.runInContext(
    cut(src, 'let GDIFF = {};', '\n};\n', {through: true}) + '\nthis.genusDiff = genusDiff; this.clear = () => (GDIFF = {});',
    ctx
  );
  assert.deepStrictEqual(['A', 'B', 'C'].map(ctx.genusDiff), [-0.54, 0.9, 0]);
  // A new photo, and a photo curated out: the same.
  views.A.push({f: 'a3'});
  views.B = [];
  ctx.clear();
  assert.deepStrictEqual(['A', 'B'].map(ctx.genusDiff), [-0.54, 0.9]);
  // Judged photos (ease 5 and 2): their priors (3 - 5) x 0.5 and (3 - 2) x 0.5, on top of a genus offset of 0.
  assert.strictEqual(ctx.genusDiff('F'), -0.25);
  assert.ok(!/OPEN\.CONF|pooledConf/.test(cut(src, 'const genusDiff = ', '\n};\n', {through: true})));
});
