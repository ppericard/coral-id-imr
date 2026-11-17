'use strict';
require('./slot.js').testGuard();
// The admin's Journey and Players bar give a fish player's Progress and Learned as their app shows them (fish admin at
// parity, ROADMAP "Fish admin at parity"; Pierre, 2026-11-08): admin.js progOf replays the player's fish answers with the
// units, variant table and structure the sync sheet's fish replay reads (unitRpl: Code.gs subjRpl_, rplMake_), keeps the
// saved copy's mastery exams as the app does when it adopts that replay (core.js replayAdopted), and gives the % over the
// tree the app scores and the leaderboard ranks by (unitPct: core.js treeScore over app.js UNITS fish tree, Code.gs
// board_). Learned: the families at Instructor over every circle, as My progress counts them. One computation: the
// admin's numbers equal the app's for the same answers and saved copy, under the published curation and under a circle
// edit. Made-up players only (rule D2).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  F = JSON.parse(src('fish.json')),
  PH = JSON.parse(src('fish-photos.json')),
  GM = JSON.parse(src('fish-game.json')),
  CUR = JSON.parse(src('curation.json')),
  S = C.subjectOf('fish'),
  ADM = src('admin.js');

// admin.js's replay units (unitRpl, unitPct) and progOf, in a vm with core.js and the admin state they read stubbed.
function admin(rows, saved, cur) {
  const ctx = {...C, SAVED: cur, ANS: {all: rows, v: 999}, SMEM: null, PROGM: new Map()};
  vm.createContext(ctx);
  vm.runInContext(
    block(ADM, '// replay units: begin', '// replay units: end', {file: 'admin.js'}) +
      block(ADM, 'const statsFor = ', '\n', {through: 1, file: 'admin.js'}) +
      block(ADM, 'function progOf(u, full, S = replayS()) {', '\n}\n', {through: 1, file: 'admin.js'}) +
      `const M0 = unitRpl(S0, F0, PH0, GM0, SAVED);
       var unitsOf = () => M0, replayOn = () => true, rpOn = () => true, replayS = () => S0,
         domReplay = () => ({dom: true}), ofAns = (k, f) => f(), subjRows = L => L,
         savedFor = () => ({P: SAVED0});
       this.M = M0; this.progOf = progOf; this.unitPct = unitPct; this.unitRpl = unitRpl;`,
    Object.assign(ctx, {S0: S, F0: F, PH0: PH, GM0: GM, SAVED0: saved})
  );
  return ctx;
}

// The app's fish units and score tree (app.js fishGenera over fishGen, its UNITS fish tree with the species level on).
function appTree(A) {
  const ctx = {
    DOM: {EX: 0.9},
    easyCover: C.easyCover,
    fishScoreTree: C.fishScoreTree,
    fishSpUnits: C.fishSpUnits,
    fishGenSets: C.fishGenSets,
    rankWeights: C.rankWeights
  };
  vm.createContext(ctx);
  vm.runInContext(
    block(src('app.js'), 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + '\nthis.fishGenera = fishGenera;',
    ctx
  );
  const X = C.fishGen(A, {});
  return {tree: ctx.fishGenera(X, A).treeSp, slate: [...X.c1, ...X.c2, ...X.c3]};
}

const LEARN = 'f:Soldierfishes';
// A made-up player's fish answers on families, scientific genera and species units (the replay's units), with mix-ups
// among look-alikes, as the sheet logs them.
function log(A, who) {
  const G = C.fishReplayGen(A),
    U = Object.keys(G).sort(),
    out = [];
  let x = 11;
  const rnd = () => (x = (x * 48271) % 2147483647) / 2147483647;
  for (let i = 0; i < 760; i++) {
    // mostly a few families and their genera and species, so some bars climb; at the end a run of right answers on
    // LEARN, the family the saved copy has learned (one with no variant photos: its mark stays, Q391 b)
    const pool =
        i >= 700 ? [LEARN] : i % 3 ? U.filter(u => /^f:(Damsel|Butterfly|Surgeon|Wrasse)/.test(u) || /^g:(Chromis|Chaetodon)/.test(u)) : U,
      g = pool[Math.floor(rnd() * pool.length)],
      L = G[g].look.filter(o => G[o]),
      alt = U.filter(o => o !== g && o.slice(0, 2) === g.slice(0, 2)),
      wrong = L.length && rnd() < 0.6 ? L[Math.floor(rnd() * L.length)] : alt[Math.floor(rnd() * alt.length)],
      ok = i >= 700 || rnd() < 0.8;
    out.push(
      C.logRow(
        {
          t: new Date(Date.UTC(2026, 10, 9, 6, 0, 0) + i * 61000).toISOString(),
          g,
          a: ok ? g : wrong,
          ok: ok ? 1 : 0,
          m: 'quiz|c',
          ph: 'fx' + (i % 40),
          ch: [g, wrong, ...alt.filter(o => o !== wrong).slice(0, 2)].join(' '),
          e: 0.7,
          th: 1
        },
        who
      )
    );
  }
  return out;
}

const cur = c => ({...CUR, fish: {...(CUR.fish || {}), content: c}});
const circ = (v, was = 1) => ({circle: {v, was, t: 1}});
// A circle edit: the Spadefishes off the game, a circle-3 family into circle 1.
const IN = F.families.find(f => f.circle === 3 && !f.wink).id,
  MOVES = {nodes: {'f:Spadefishes': circ(null), [IN]: circ(1, 3)}};

[
  ['the published curation', CUR],
  ['a circle edit', cur(MOVES)]
].forEach(([what, c]) =>
  test(`a fish player's Progress and Learned in the admin are their app's (${what})`, () => {
    const A = C.contentApply(S, F, c),
      rows = log(A, 'aid1'),
      // the saved copy: LEARN learned (its mastery exam passed on the device), a stale bar elsewhere
      saved = {[LEARN]: {ok: 60, ko: 0, ds: 0.9, mx: Date.UTC(2026, 10, 9, 20)}, 'f:Wrasses': {ok: 1, ko: 0, ds: 0.1}},
      // the app: the sheet's replay (Code.gs rplMake_: its units and variant table under the structure in force), adopted
      // over the saved copy (sync.js replayAdoptS), scored over the app's tree (model.js headPct)
      rec = C.replayProgress(rows, {gen: C.fishReplayGen(A), vars: S.replayed.vars(A, [F, PH, GM, c], S)}).aid1.P,
      P = C.replayAdopted(rec, saved),
      app = appTree(A),
      appPct = C.treeScore(P, app.tree, S.score).pct,
      appLearned = C.learnedOf(P, app.slate);
    const X = admin(rows, saved, c),
      pg = X.progOf({id: 'aid1', name: 'Ana Demo', learned: 0}, true, S);
    // (made in the vms' realms: compared as JSON)
    assert.strictEqual(JSON.stringify(X.M.tree), JSON.stringify(app.tree), "the admin's tree is the app's");
    assert.strictEqual(JSON.stringify(X.M.slate), JSON.stringify(app.slate), "the admin's slate is the app's");
    assert.ok(appPct > 0 && appLearned > 0, 'the fixture moves the score and learns a family');
    assert.strictEqual(pg.pct, appPct, 'Progress: the fish % the app shows');
    assert.strictEqual(pg.learned, appLearned, 'Learned: the families learned, as My progress counts them');
    assert.strictEqual(pg.total, app.slate.length);
    // the leaderboard's % for the same player (Code.gs board_: treeScore over the tree the sheet makes)
    assert.strictEqual(C.treeScore(P, C.fishBoardTree(A), S.score).pct, pg.pct);
    // the saved copy's own %, by the same computation (↻ saved)
    assert.strictEqual(pg.saved.pct, C.treeScore(saved, app.tree, S.score).pct);
    // the families' mean the admin showed before is another number
    assert.notStrictEqual(C.pctOf(pg.G, app.slate), pg.pct);
    assert.strictEqual(X.unitPct(S, X.M, P), appPct);
  })
);

test('unitRpl: only a subject the sheet replays from its own answers; one with no tree scores over its slate', () => {
  const X = admin([], {}, CUR);
  assert.strictEqual(X.unitRpl({...S, replayed: undefined}, F, PH, GM, CUR), null);
  assert.strictEqual(X.unitRpl(C.subjectOf('coral'), F, PH, GM, CUR), null, 'the corals: their own replay (data.json)');
  assert.strictEqual(X.unitRpl(S, null, PH, GM, CUR), null, 'its file not read yet');
  const M = X.unitRpl({...S, score: null}, F, PH, GM, CUR),
    P = {[M.slate[0]]: {ok: 9, ko: 0, mx: 1}};
  assert.strictEqual(M.tree, null);
  assert.strictEqual(X.unitPct({...S, score: null}, M, P), C.pctOf(P, M.slate));
});

test('a subject the sheet replays with no global score (the sea slugs): its replay units, its % over its genera', () => {
  const T = C.SUBJECTS.find(x => !x.replay && x.replayed && !x.score && x.admin && x.admin.files);
  if (!T) return; // none on this branch
  const f = JSON.parse(src(T.admin.files.f)),
    A = C.contentApply(T, f, CUR),
    X = admin([], {}, CUR),
    M = X.unitRpl(T, f, null, null, CUR),
    G = C.fishGen(A, {}, undefined, C.unitRankOf(T));
  assert.strictEqual(JSON.stringify(M.rgen), JSON.stringify(T.replayed.gen(A)), "the sheet's replay units");
  assert.strictEqual(JSON.stringify(M.slate), JSON.stringify([...G.c1, ...G.c2, ...G.c3]), 'the app slate (its genera)');
  assert.strictEqual(M.tree, null);
  const P = {[M.slate[0]]: {ok: 9, ko: 0, ds: 0.9, mx: 1}, [M.slate[1]]: {ok: 3, ko: 1, ds: 0.4}};
  assert.strictEqual(X.unitPct(T, M, P), C.pctOf(P, M.slate), "its headline %: the genera's mean, as its app's progPct");
});
