'use strict';
require('./slot.js').testGuard();
// A level opens in a group (rule L4; docs/LEARNING.md "A level opens in a group"; Pierre, 2026-11-20): a level below the
// subject's base (a fish scientific genus, a species by its common or its scientific name, a sea slug species) opens
// INTRO.START close units together, as first cards, and none of it opens before (model.js lvlNeed, openFresh, openGroup,
// levelTop, each unit within the rank share as before; app.js lvlNext; quiz.js planPhoto, introStart, introShow). On the app's own
// model.js in the rated world's engine (the fish units as the app builds them), and quiz.js planPhoto on stubs.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const RW = require('../tools/ratedworld.js');
const cut = require('./block.js');
const X = RW.fishUnits(),
  QSRC = fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8'),
  // the engine's arrays are of its own realm: compared as arrays of this one
  same = (a, b, m) => assert.deepStrictEqual([...a], b, m);

// The engine on a seed's world, the circle-1 families met (ready, as first cards), nothing below them; F: the functions.
function engine() {
  const {ctx, M} = RW.engine(X, RW.world(X, 3), {app: 'truth'}),
    F = vm.runInContext('({openFresh, openGroup, levelTop, lvlNeed, shareRoom, introAdd, introduced, rankKind, sharesNow})', ctx),
    // a new answer count: the share is computed once per answer (model.js sharesNow)
    tick = () => (ctx.P['~level'] = {ok: ((ctx.P['~level'] || {}).ok || 0) + 1, ko: 0});
  F.introAdd(X.c1, true);
  tick();
  const cand = () => ctx.pool().filter(n => !F.introduced(n) && M.mayOpen(n));
  return {ctx, M, F, tick, cand};
}
const SP = 'species:cn';
// a family of circle 1 with six species or more with a photo, in its order
const fam = X.c1.find(f => X.spl.filter(n => X.gen[n].parent === f && X.gen[n].views.wide.length).length >= 6),
  own = X.spl.filter(n => X.gen[n].parent === fam && X.gen[n].views.wide.length);

// a family of circle 1 with two or three species with a photo
const few = X.c1.find(f => [2, 3].includes(X.spl.filter(n => X.gen[n].parent === f && X.gen[n].views.wide.length).length)),
  fewOwn = X.spl.filter(n => X.gen[n].parent === few && X.gen[n].views.wide.length);

test('a level short of INTRO.START units met: none of it opens before four are ready to open together', () => {
  const {ctx, F, tick, cand} = engine();
  assert.ok(fam && few, 'a family with six species, one with two or three');
  assert.strictEqual(F.lvlNeed('', ctx.pool()), 0, 'the base keeps its own first cards');
  assert.strictEqual(F.lvlNeed(SP, ctx.pool()), 4);
  // No family at Advanced: no species in play, nothing below the families opens.
  same(
    F.openFresh(cand(), ctx.pool()).filter(n => F.rankKind(n)),
    []
  );
  // A family with fewer than four species mastered: they are in play and the share has room for one, but the level
  // needs four: none of it opens.
  ctx.P[few] = {mx: 1};
  tick();
  const list = ctx.pool();
  same(
    list.filter(n => F.rankKind(n) === SP),
    fewOwn
  );
  assert.strictEqual(F.shareRoom(fewOwn[0]), true);
  same(
    F.openFresh(cand(), list).filter(n => F.rankKind(n)),
    []
  );
  // A family with six mastered too: its first four in play (app.js lvlNext), the level may open.
  ctx.P[fam] = {mx: 1};
  tick();
  const l2 = ctx.pool(),
    fresh = F.openFresh(cand(), l2);
  same(fresh.filter(n => F.rankKind(n) === SP).sort(), [...fewOwn, ...own.slice(0, 4)].sort());
  // The group: the unit drawn and the three nearest, its family's own first.
  const g = F.openGroup(own[1], fresh, l2);
  assert.strictEqual(g.length, 4);
  assert.strictEqual(g[0], own[1]);
  same([...g].sort(), own.slice(0, 4).sort(), 'the four of its family in play');
  // Drawn from the small family: its own first, then the others'.
  const g2 = F.openGroup(fewOwn[0], fresh, l2);
  assert.strictEqual(g2.length, 4);
  assert.ok(fewOwn.every(n => g2.includes(n)), String(g2));
  // The base still opens one at a time: a family's group is itself alone.
  same(F.openGroup(X.c1[0], fresh, l2), [X.c1[0]]);
});

test('a group left half-way, or a level an older record met fewer than four times, gets the rest at once; then one at a time', () => {
  const {ctx, F, tick} = engine();
  X.c1.slice(0, 10).forEach(n => (ctx.P[n] = {mx: 1}));
  ctx.P[fam] = {mx: 1};
  tick();
  same(F.levelTop(ctx.pool()), [], 'nothing met in the level: the path opens its group, not a top-up');
  F.introAdd(own.slice(0, 1), true);
  tick();
  const list = ctx.pool(),
    top = F.levelTop(list);
  assert.strictEqual(F.lvlNeed(SP, list), 3);
  assert.strictEqual(top.length, 3);
  assert.ok(
    top.every(n => own.slice(1, 5).includes(n)),
    'the rest from its family’s next ones in play, nearest first: ' + top
  );
  // Four met: the level goes on one unit at a time (the group of a unit is itself), and nothing is topped up.
  F.introAdd(top, true);
  tick();
  const l2 = ctx.pool();
  assert.strictEqual(F.lvlNeed(SP, l2), 0);
  same(F.levelTop(l2), []);
  same(l2.filter(n => n.startsWith('s:') && X.gen[n].parent === fam).sort(), own.slice(0, 5).sort(), 'met and the next one');
  same(F.openGroup(own[5], [own[5]], l2), [own[5]]);
});

test('a small level opens what it has, none waits for good; no room in the share, none of it opens', () => {
  const {ctx, F, tick, cand} = engine();
  ctx.P[few] = {mx: 1};
  tick();
  // A level of as many units in the game as the small family has: it needs them all, and opens them together.
  const rk = ctx.rankUnits;
  ctx.rankUnits = k => (k === SP ? fewOwn : rk(k));
  assert.strictEqual(F.lvlNeed(SP, ctx.pool()), fewOwn.length);
  same(F.openFresh(cand(), ctx.pool()).filter(n => F.rankKind(n) === SP), fewOwn);
  ctx.rankUnits = rk;
  // The share without room (the units met below the families already over the cap): nothing below them opens.
  ctx.P[fam] = {mx: 1};
  tick();
  const S = F.sharesNow();
  S.w[''] = 1e6;
  assert.strictEqual(F.shareRoom(own[0]), false);
  same(
    F.openFresh(cand(), ctx.pool()).filter(n => F.rankKind(n)),
    []
  );
});

// quiz.js planPhoto with the game around it stubbed: the path allows a card; openGroup gives the cards.
function plan({group, need}) {
  const units = ['f:A', 'f:B', 'f:C', 'f:D', 'f:E', 's:1', 's:2', 's:3', 's:4'],
    met = new Set(['f:A', 'f:B', 'f:C', 'f:D', 'f:E']),
    ctx = {
      pool: () => units,
      customSel: () => null,
      CUSTOM_H: 'practice/custom/play',
      holdEase: () => 0,
      CONTRAST: {GAP: 2, P: 0},
      rustNow: () => {},
      introStart: () => [],
      noOpen: () => false,
      introReady: n => met.has(n),
      introduced: n => met.has(n),
      cbIn: () => false,
      comebackOf: () => null,
      introHold: () => false,
      openPace: () => true,
      openRight: () => true,
      mayOpen: () => true,
      openFresh: L => L,
      openChance: () => 1,
      openPick: L => L[0],
      openGroup: () => group,
      lvlNeed: () => need,
      rankKind: n => (n.startsWith('s:') ? 'species' : ''),
      openDue: () => [],
      nextTarget: L => L[0],
      duelPick: () => null,
      planFind: () => null,
      examReady: () => false,
      examSet: () => null,
      trapsFor: () => 3,
      // among the units known (met, or a card shown with the question) of the target's class
      distractors: (t, list, traps, known) => list.filter(n => n !== t && known(n) && ctx.rankKind(n) === ctx.rankKind(t)).slice(0, 3),
      typedP: () => 0,
      TYPED: {k: Infinity},
      confusable: () => true,
      plausibleK: () => 4,
      confTerm: () => 0,
      photoSet: () => ({shown: [{f: 'p'}]}),
      cover: () => null,
      GX: () => ({}),
      mimUnit: () => null,
      mimTrap: (t, ch) => ch,
      choiceNames: () => false,
      SUBJ: {one: 'family'},
      shuffle: L => L,
      Math: Object.assign(Object.create(Math), {random: () => 0})
    };
  vm.createContext(ctx);
  vm.runInContext(
    'let rematch = [], twoAt = -Infinity, twoPair = "", last = "", lastQs = [], SHOWNQ = null, NEXTQ = null;\n' +
      cut(QSRC, "function planPhoto(cur = 'quiz', at = answersSoFar()) {", '\n}\n', {through: 1, file: 'quiz.js'}) +
      '\nthis.planPhoto = planPhoto;',
    ctx
  );
  return ctx.planPhoto('quiz', 10);
}

test('planPhoto: a level’s group shows as first cards, the question on one of them among the group; a single card as before', () => {
  const G = ['s:1', 's:2', 's:3', 's:4'],
    q = plan({group: G, need: 4});
  same([...q.intro], G);
  assert.ok(q.start && q.lvl, 'shown and asked as first cards, waiting as a card of the path does (lvl)');
  assert.ok(G.includes(q[1]), 'the question on one of the group');
  assert.ok(
    [...q[2]].every(n => G.includes(n)),
    'its wrong choices among the group'
  );
  // A unit of a level met four times (or of the base): its card alone, the question on a unit met, as before.
  const one = plan({group: ['s:1'], need: 0});
  same([...one.intro], ['s:1']);
  assert.ok(!one.start && !one.lvl && one[1] !== 's:1');
  // The show-time check and introShow read lvl and the level (quiz.js quizPhoto, introShow).
  assert.ok(QSRC.includes('((!q.start || q.lvl) && (introHold() || !openRight()))'));
  assert.ok(QSRC.includes("const below = kind === 's' && L.some(n => rankKind(n));"));
  assert.ok(QSRC.includes('all: offerAll && !below && introLeft().length > 0'));
});

test('the rated world opens a level as the app does: no question below the families names a unit never opened once its level holds four', () => {
  // A short expert run (a mechanism check, never a rate): every question below the families among choices whose level
  // already holds INTRO.START units met names only units opened (uo 0), its first questions come with its group.
  const r = RW.runOne(X, {profile: 'expert', seed: 1, N: 1500, cps: [1500]});
  const K = r.kinds,
    below = r.expo.map((e, i) => [K[e[0]], r.uo[i]]).filter(([k, u]) => k !== 'family' && u !== null);
  assert.ok(below.length > 20, String(below.length));
  assert.strictEqual(below.filter(([, u]) => u).length, 0, 'a wrong choice named a unit never opened');
});
