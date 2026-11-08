// The fish progress replayed by the sheet (ROADMAP "Fish progress replayed from the answer log"; Pierre, 2026-11-08):
// the units the replay reads (core.js fishReplayGen, built by Code.gs from fish.json alone) are the app's (core.js
// fishGen and app.js fishGenera over fish.json and its photos): the same units, look-alikes and family lines.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f));
const F = json('fish.json'),
  PH = json('fish-photos.json'),
  GM = json('fish-game.json'),
  CUR = json('curation.json');
const ctx = {DOM: {EX: 0.9}, easyCover: C.easyCover, fishScoreTree: C.fishScoreTree, rankWeights: C.rankWeights};
vm.createContext(ctx);
vm.runInContext(
  block(src('app.js'), 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + '\nthis.fishGenera = fishGenera;',
  ctx
);

test("fishReplayGen: the app's fish units, their look-alikes and family lines, from fish.json alone", () => {
  const X = ctx.fishGenera(C.fishGen(F, C.fishPhotos(PH.photos, GM.photos, CUR, F), PH.sheet), F),
    want = Object.fromEntries(Object.values(X.gen).map(g => [g.id, {look: [...g.look], fam: g.fam}])),
    got = C.fishReplayGen(F);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(got)), JSON.parse(JSON.stringify(want)));
  assert.ok(Object.keys(got).some(id => id.startsWith('g:')) && Object.keys(got).some(id => id.startsWith('f:')));
});

test('fishReplayGen: nothing from an empty fish.json', () => {
  assert.deepStrictEqual(C.fishReplayGen({}), {});
  assert.deepStrictEqual(C.fishReplayGen(null), {});
});

test('the subjects the sheet replays besides the corals: fish, with its own rules versions', () => {
  assert.deepStrictEqual(C.replayedSubjects(), ['fish']);
  assert.strictEqual(C.replaySubject(), 'coral');
  assert.ok(C.rvOf('fish') >= 1 && C.rvsOf('fish') !== C.RVS && C.rvOf('coral') === C.RV);
  assert.ok(C.REPLAYS_SHEET > C.SCORE_SHEET);
  assert.strictEqual(C.subjectOf('fish').replayed.floor, true);
});

// The floor of the first fish replay (Pierre, 2026-11-08, Q310: "today's bar as a floor, nobody goes back").
test("replayFloor: a unit's bar never below this device's before its first replay; a replayed unit is the replay's", () => {
  const dom = (ok, ko) => C.domFromCounts({ok, ko, h: '1'.repeat(Math.min(ok, 10))}, 0.5, 4, 0),
    rec = (ok, ko, x = {}) => ({ok, ko, h: '', ...dom(ok, ko), ...x}),
    P = {
      a: rec(12, 0), // today high, the replay lower: kept
      b: rec(2, 1), // today low, the replay higher: the replay's
      c: rec(12, 0, {rv: 9}), // already from a replay: the replay's even lower
      d: rec(3, 0), // no replayed record: kept
      '~level': {ok: 17, ko: 1, th: 1.5}
    },
    M = {
      a: rec(4, 3, {rv: 10}),
      b: rec(9, 0, {rv: 10}),
      c: rec(4, 3, {rv: 10}),
      e: rec(5, 0, {rv: 10}),
      '~level': {ok: 17, ko: 1, th: 0.9, rv: 10}
    },
    out = C.replayFloor(M, P),
    s = (X, n) => C.scoreOf(X[n], X, n);
  assert.ok(s(M, 'a') < s(P, 'a') && s(M, 'b') > s(P, 'b'));
  assert.deepStrictEqual(out.a, P.a);
  assert.notStrictEqual(out.a, P.a, 'a copy');
  assert.deepStrictEqual(out.b, M.b);
  assert.deepStrictEqual(out.c, M.c, 'a unit once replayed follows the replay');
  assert.deepStrictEqual(out.d, P.d);
  assert.deepStrictEqual(out.e, M.e);
  assert.deepStrictEqual(out['~level'], M['~level'], 'the level is the replay’s');
  assert.deepStrictEqual(C.replayFloor(M, {}), M);
  assert.deepStrictEqual(C.replayFloor(M, null), M);
});

test('replayFloor: on random records no unit of the device goes down, nor the fish headline', () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647,
    X = ctx.fishGenera(C.fishGen(F, C.fishPhotos(PH.photos, GM.photos, CUR, F), PH.sheet), F),
    units = [...X.c1, ...X.c2].slice(0, 30),
    K = C.SUBJECTS.find(S => S.id === 'fish').score,
    // with offers and mix-ups on the other units (off, conf: their false alarms, faOf; Codex review #779)
    rec = () => {
      const ok = Math.floor(rnd() * 20),
        ko = Math.floor(rnd() * 8),
        off = {},
        conf = {};
      units.forEach(n => {
        if (rnd() < 0.2) {
          off[n] = 1 + Math.floor(rnd() * 6);
          if (rnd() < 0.5) conf[n] = Math.floor(rnd() * off[n]);
        }
      });
      return {ok, ko, h: '', off, conf, ...C.domFromCounts({ok, ko, h: ''}, rnd() - 0.5, 4, 0)};
    };
  for (let k = 0; k < 80; k++) {
    const P = {},
      M = {};
    units.forEach(n => {
      if (rnd() < 0.7) P[n] = rec();
      if (rnd() < 0.7) M[n] = {...rec(), rv: C.RV};
    });
    const out = C.replayFloor(M, P);
    units.forEach(n => P[n] && assert.ok(C.scoreOf(out[n], out, n) >= C.scoreOf(P[n], P, n) - 1e-9, n));
    assert.ok(C.treeScore(out, X.tree, K).pct >= C.treeScore(P, X.tree, K).pct);
  }
});

// Codex review #779: a unit's bar reads the other units' false alarms on it (faOf), so restoring its record alone may
// leave it lower beside a replayed record that counts mix-ups on it.
test('replayFloor: a unit kept is not lowered by the false alarms of a replayed record', () => {
  const ds = (v, x = {}) => ({ok: 6, ko: 0, h: '111111', dp: [0], ds: v, ...x}),
    s = (X, n) => C.scoreOf(X[n], X, n),
    P = {A: ds(0.8), B: ds(0.5)},
    M = {A: ds(0.5, {rv: 1}), B: ds(0.7, {rv: 1, off: {A: 10}, conf: {A: 2}})};
  // The device holds B: B comes back as the device holds it, and A reads its bar of today.
  let out = C.replayFloor(M, P);
  assert.ok(s(out, 'A') >= s(P, 'A') - 1e-9, `A ${s(out, 'A')} vs ${s(P, 'A')}`);
  assert.deepStrictEqual(out.B, P.B);
  // The device has no B (its mix-ups only in the log): the device's progress as it is, whole.
  out = C.replayFloor(M, {A: P.A});
  assert.deepStrictEqual(out, {A: P.A});
  assert.ok(s(out, 'A') >= s(P, 'A') - 1e-9);
});
