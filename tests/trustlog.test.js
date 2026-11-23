require('./slot.js').testGuard();
// The log is the only reference (rule D9; core.js replayedOf, replayBase, replayAdopted; rules version 10, fish rules
// version 2, no card): the replay's record of a unit and its answer count win over the device's, also when the device
// holds more answers there (counted twice: a save whose reply was lost, then another device's save), and a unit the log
// has no answer on loses the answers the device counts on it. No exception for answers played before the log began, no
// floor. The fixtures are patterns found on the real sheet (counts only, made-up names): a whole record doubled, small
// excesses on some units, fish only, and the fish answers from before the fish log. Nothing leaves this process
// (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const {page, SV, withData, loadCodeGs} = require('./syncpage.js');
const clockSrc = require('./clock.js');

const DATA = require('../data.json'),
  GEN = {...((DATA.x && DATA.x.gen) || {}), ...DATA.gen},
  FGEN = C.treeReplayGen(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish.json'), 'utf8'))),
  CORAL = Date.UTC(2026, 10, 1, 9, 47), // the coral log's first answer
  TREEU = Date.UTC(2026, 10, 6, 5, 7), // the fish log's first answer
  H = 3600000;
const G = ['Acropora', 'Porites', 'Montipora', 'Pocillopora', 'Favites', 'Fungia', 'Goniopora', 'Turbinaria', 'Pavona', 'Galaxea'];
const FU = ['f:Damselfishes', 'f:Butterflyfishes', 'f:Angelfishes', 'f:Wrasses', 'f:Groupers'];
// A replayable answer (the app's log entry: photos, choices, e and th), at time t (ms).
const ans = (id, g, ok, t, units = G) => ({
  id,
  t: new Date(t).toISOString(),
  g,
  a: ok ? g : units[(units.indexOf(g) + 1) % units.length],
  ok: ok ? 1 : 0,
  m: 'quiz',
  ph: g.toLowerCase().replace(/[^a-z]/g, '') + '-wide-' + (id.length % 3),
  ch: units.slice(0, 4).join(' '),
  e: 0.7,
  th: 0.5,
  nw: 1,
  ...(units === FU ? {s: 'fish', rk: 'family', sc: {d: 0, r: 1}} : {})
});
const n = x => ((x && x.ok) || 0) + ((x && x.ko) || 0);
const counts = P => Object.fromEntries(Object.keys(P).map(u => [u, n(P[u])]));
const total = P => Object.keys(P).reduce((t, u) => (u === C.LEVEL ? t : t + n(P[u])), 0);
const replay = (A, gen, id = 'ana') =>
  C.replayProgress(
    A.map(a => C.logRow(a, id)),
    {gen}
  )[id];
// The saved copy a device holds: the adopted replay, with its counts on some units changed by f (null: as it is).
const inflate = (P, f) =>
  Object.fromEntries(
    Object.entries(JSON.parse(JSON.stringify(P))).map(([u, r]) => {
      const x = f(u, r);
      return [u, x ? {...r, ok: x[0], ko: x[1]} : r];
    })
  );

test('a whole record counted twice: the replay of the log wins, every unit and the level', () => {
  // 30 answers on 10 genera in half an hour, two days after the coral log began; the saved copy holds each twice.
  const A = Array.from({length: 30}, (_, i) => ans('w' + i, G[i % 10], i % 4 !== 3, CORAL + 48 * H + i * 60000)),
    rep = replay(A, GEN),
    once = C.replayedOf(rep, {}, C.RV),
    twice = inflate(once, (u, r) => [2 * (r.ok || 0), 2 * (r.ko || 0)]);
  assert.strictEqual(total(twice), 60);
  const M = C.replayAdopted(rep.P, twice, C.RV);
  G.slice(0, 10).forEach(u => assert.strictEqual(n(M[u]), n(once[u]), u + ': as in the log'));
  assert.strictEqual(total(M), 30);
  // The level's answer count is the log's too (rules version 15; the app's checkpoints count on their own answer clock,
  // model.js tally), and its ability.
  assert.strictEqual(n(M[C.LEVEL]), 30);
  assert.strictEqual(M[C.LEVEL].th, rep.P[C.LEVEL].th, "the replay's ability");
  // The merge baseline after the adoption is the replay's record.
  const B = C.replayBase(rep.P, M, C.RV, twice);
  assert.strictEqual(total(B), 30);
});

test('small excesses on some units (one to three answers counted twice): corrected, the other units unchanged', () => {
  const A = Array.from({length: 40}, (_, i) => ans('e' + i, G[i % 8], i % 5 !== 0, CORAL + 72 * H + i * 30000)),
    rep = replay(A, GEN),
    once = C.replayedOf(rep, {}, C.RV),
    plus = {Acropora: 1, Porites: 3, Fungia: 2},
    saved = inflate(once, (u, r) => (plus[u] ? [(r.ok || 0) + plus[u], r.ko || 0] : null)),
    M = C.replayAdopted(rep.P, saved, C.RV);
  assert.strictEqual(total(saved), 46);
  assert.deepStrictEqual(counts(M), counts(once));
  G.slice(0, 8)
    .filter(u => !plus[u])
    .forEach(u => assert.deepStrictEqual(M[u], once[u], u + ': as replayed'));
});

test('fish only: the fish replay wins, the answers from before the fish log dropped, no floor', () => {
  const A = Array.from({length: 20}, (_, i) => ans('f' + i, FU[i % 5], i % 3 !== 2, TREEU + 30 * H + i * 30000, FU)),
    rep = replay(A, FGEN),
    once = C.replayedOf(rep, {}, C.rvOf('fish')),
    saved = inflate(once, (u, r) => (u === 'f:Damselfishes' || u === 'f:Wrasses' ? [(r.ok || 0) + 2, r.ko || 0] : null));
  assert.deepStrictEqual(counts(C.replayAdopted(rep.P, saved, C.rvOf('fish'))), counts(once));
  // Played before the fish log began (the first logged fish answer in the log's first minute): its 17 answers from
  // before are in no log, so they go (the log is the only reference), four on each of four families, one on a fifth.
  const B = Array.from({length: 20}, (_, i) => ans('p' + i, FU[i % 5], i % 3 !== 2, TREEU + 30000 + i * 60000, FU)),
    pre = replay(B, FGEN),
    early = C.replayedOf(pre, {}, C.rvOf('fish')),
    extra = {'f:Damselfishes': 4, 'f:Butterflyfishes': 4, 'f:Angelfishes': 4, 'f:Wrasses': 4, 'f:Groupers': 1},
    kept = inflate(early, (u, r) => (extra[u] ? [(r.ok || 0) + extra[u], r.ko || 0] : null)),
    M = C.replayAdopted(pre.P, kept, C.rvOf('fish'));
  assert.strictEqual(total(kept), 37);
  assert.strictEqual(total(M), 20, 'the 17 answers from before the log dropped');
  // No floor: a saved bar higher than the log's comes down (the unit's bar is the replay's).
  const high = JSON.parse(JSON.stringify(early));
  high['f:Damselfishes'].ds = 0.99;
  assert.strictEqual(C.replayAdopted(pre.P, high, C.rvOf('fish'))['f:Damselfishes'].ds, early['f:Damselfishes'].ds);
  assert.ok(!('floor' in (C.subjectOf('fish').replayed || {})), 'no subject is replayed with a floor');
});

test('a unit the log has no answer on: its answers on the device go; a unit with none stays as it is', () => {
  const A = Array.from({length: 6}, (_, i) => ans('u' + i, G[i % 2], 1, CORAL + 48 * H + i * 60000)),
    rep = replay(A, GEN),
    saved = {
      ...C.replayedOf(rep, {}, C.RV),
      Pavona: {ok: 3, ko: 1, h: '1101'}, // answers in no log
      Galaxea: {ok: 0, ko: 0, h: ''} // a record with no answer
    },
    M = C.replayAdopted(rep.P, saved, C.RV);
  assert.ok(!('Pavona' in M), 'answers in no log: dropped');
  assert.deepStrictEqual(M.Galaxea, saved.Galaxea, 'no answer either: kept');
  assert.strictEqual(total(M), 6);
});

// A player with no answer in the log at all (an empty replay) keeps no unit with answers and no
// ability; the level, as a unit, goes when it counts answers (rules version 15), stays when it counts none.
test('an empty replay: every unit with answers goes, the level with its count and ability too', () => {
  const M = C.replayAdopted({}, {'~level': {ok: 17, ko: 0, th: 2, vr: 0.1}, Acropora: {ok: 17, ko: 0, h: '11111'}}, 2);
  assert.ok(!M.Acropora);
  assert.ok(!(C.LEVEL in M), 'its 17 answers in no log: dropped');
  const Z = C.replayAdopted({}, {'~level': {ok: 0, ko: 0, th: 2, h: ''}}, 2);
  assert.deepStrictEqual(Z[C.LEVEL], {ok: 0, ko: 0, h: ''}, 'no answer either: kept, none of the log fields');
});

// When the sheet sent no level (an empty log), the device's unsent answers are replayed on top (sync.js replayAdoptS):
// the record adopted holds them alone, the merge baseline none of the shared copy's answers (in no log), and the next
// merge with a device that adopted the same replay counts each answer once.
test('an empty replay with an unsent answer: the baseline keeps no level, the next merge counts each answer once', () => {
  const shared = {'~level': {ok: 3, ko: 0, th: 1}},
    here = {'~level': {ok: 4, ko: 0, th: 1}, Acropora: {ok: 1, ko: 0, h: '1'}}, // one answer not sent yet
    mine = replay([ans('e0', 'Acropora', 1, CORAL + 48 * H)], GEN).P, // replayed on top of the empty replay
    M = C.replayAdopted(mine, here, 2),
    B = C.replayBase({}, M, 2, shared);
  assert.strictEqual(n(M[C.LEVEL]), 1, 'the unsent answer only');
  assert.ok(!B[C.LEVEL], "no baseline level: the shared copy's 3 answers are in no log");
  // Another device adopted the same replay, then saved one answer of its own.
  const there = replay([ans('e1', 'Porites', 1, CORAL + 49 * H)], GEN).P,
    merged = C.mergeProgress(B, M, there);
  assert.strictEqual(n(merged[C.LEVEL]), 2, 'every answer once');
});

// A unit whose shared answers are not in the log is discarded from the merge baseline
// too, so this device's unsent answer on it survives the next merge with a device that already adopted.
test("a unit absent from the log: no baseline record, this device's unsent answer survives the next merge", () => {
  const rec = {'~level': {ok: 1, ko: 0, th: 1}, Porites: {ok: 1, ko: 0, h: '1'}},
    shared = {'~level': {ok: 3, ko: 0, th: 1}, Acropora: {ok: 3, ko: 0, h: '111'}},
    M = {...C.replayAdopted(rec, shared, 2), Acropora: {ok: 1, ko: 0, h: '1'}}, // the unsent answer put back on top
    B = C.replayBase(rec, M, 2, shared);
  assert.ok(!B.Acropora, 'no baseline for a unit the log has no answer on');
  const R = C.replayAdopted(rec, shared, 2), // another device already adopted: no Acropora
    merged = C.mergeProgress(B, M, R);
  assert.strictEqual(n(merged.Acropora), 1, 'the unsent answer is kept once');
});

// The level as one rule: over a doubled save every progress field of the level (ability,
// typed opportunities, answer times) and its answer count are the log's, in the record adopted and in its merge baseline
// (rules version 15; the checkpoints count on their own answer clock, model.js tally).
test("the level over a doubled save: the log's ability, typed opportunities, times and count", () => {
  const rec = {'~level': {ok: 10, ko: 0, th: 1, vr: 0.2, tyk: {f: 10}, rt: {n: 10, s: 30}}, Acropora: {ok: 5, ko: 0, h: '11111', ty: 5}},
    saved = {
      '~level': {ok: 20, ko: 0, th: 2, vr: 0.1, lt: 5, tyk: {f: 20}, rt: {n: 20, s: 60}},
      Acropora: {ok: 10, ko: 0, h: '1111111111', ty: 10}
    },
    M = C.replayedOf({P: rec}, saved, 2),
    B = C.replayBase(rec, M, 2, saved);
  for (const L of [M[C.LEVEL], B[C.LEVEL]]) {
    assert.deepStrictEqual([L.th, L.vr, L.lt, L.tyk, L.rt], [1, 0.2, undefined, {f: 10}, {n: 10, s: 30}]);
    assert.strictEqual(n(L), 10, "the count: the log's");
  }
});

// An empty log, the same rule: no level in the record adopted nor in its baseline, so two devices' new typed answers
// both survive the next merge, and none of the old save's answers, typed opportunities or times.
test('an empty log: no level in the baseline, no answers, typed opportunities or times from the old save', () => {
  const shared = {'~level': {ok: 20, ko: 0, th: 1, tyk: {f: 20}, rt: {n: 20, s: 60}}},
    M = C.replayedOf({P: {}}, shared, 2),
    B = C.replayBase({}, M, 2, shared);
  assert.ok(!M[C.LEVEL] && !B[C.LEVEL]);
  const here = {...M, '~level': {ok: 1, ko: 0, tyk: {f: 1}}},
    there = {...M, '~level': {ok: 1, ko: 0, tyk: {f: 1}}},
    merged = C.mergeProgress(B, here, there);
  assert.deepStrictEqual(merged[C.LEVEL].tyk, {f: 2}, "both devices' typed opportunities");
  assert.strictEqual(n(merged[C.LEVEL]), 2);
});

test('progress from before the coral log: dropped as any answer the log does not have', () => {
  const A = Array.from({length: 12}, (_, i) => ans('c' + i, G[i % 4], 1, CORAL + 5 * 60000 + i * 60000)),
    rep = replay(A, GEN),
    saved = inflate(C.replayedOf(rep, {}, C.RV), (u, r) => (u === C.LEVEL ? null : [(r.ok || 0) + 5, r.ko || 0])),
    M = C.replayAdopted(rep.P, saved, C.RV);
  assert.strictEqual(total(saved), 32);
  assert.strictEqual(total(M), 12);
});

test('property: every adoption ends with the log, whatever the saved copy holds (400 cases)', () => {
  let seed = 0x5eed;
  const rnd = () => (seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0) / 2 ** 32,
    int = k => Math.floor(rnd() * k);
  for (let k = 0; k < 400; k++) {
    const fish = rnd() < 0.4,
      U = fish ? FU : G,
      gen = fish ? FGEN : GEN,
      t0 = (fish ? TREEU : CORAL) + int(200 * H),
      A = Array.from({length: 3 + int(30)}, (_, i) => ans('q' + k + 'x' + i, U[int(U.length)], rnd() < 0.7, t0 + i * 45000, U)),
      rep = replay(A, gen),
      once = C.replayedOf(rep, {}, 1),
      // The saved copy: some units counted twice or more, some behind the log, some the log has no answer on.
      saved = inflate(once, (u, r) =>
        u === C.LEVEL
          ? [(r.ok || 0) + int(5), r.ko || 0]
          : rnd() < 0.4
            ? [(r.ok || 0) + 1 + int(4), (r.ko || 0) + int(2)]
            : rnd() < 0.2
              ? [Math.max(0, (r.ok || 0) - 1), r.ko || 0]
              : null
      ),
      extra = U.filter(u => !once[u] && rnd() < 0.3);
    extra.forEach(u => (saved[u] = {ok: 1 + int(3), ko: int(2), h: '1'}));
    const M = C.replayAdopted(rep.P, saved, 1);
    Object.keys(once)
      .filter(u => u !== C.LEVEL)
      .forEach(u => assert.strictEqual(n(M[u]), n(once[u]), `case ${k}: ${u}`));
    assert.strictEqual(n(M[C.LEVEL]), n(once[C.LEVEL]), `case ${k}: the level's count, the log's`);
    assert.strictEqual(n(M[C.LEVEL]), A.length, `case ${k}: the level counts every answer of the log once`);
    extra.forEach(u => assert.ok(!(u in M), `case ${k}: ${u} in no log, dropped`));
    assert.strictEqual(total(M), A.length, `case ${k}: every answer of the log once`);
    // Adopting the same replay again over the adopted record changes no count.
    assert.deepStrictEqual(counts(C.replayAdopted(rep.P, M, 1)), counts(M), `case ${k}: again`);
  }
});

// End to end: the sheet's replay (Code.gs replay_) adopted by the app (sync.js replayAdoptS) of a device whose saved copy
// holds a whole record twice under rules version 9: once the script replays rules version 10, the device's own progress
// takes the log's counts on every unit, its unsent answer on top, its next save puts them on the sheet, and no card.
test('a device holding its record twice under the rules before: the next sync takes the log, its unsent answer on top, no card', async () => {
  for (const v of [SV]) {
    const s = loadCodeGs(withData()),
      A = Array.from({length: 12}, (_, i) => ans('d' + v + 'x' + i, G[i % 4], i % 3 !== 2, CORAL + 48 * H + i * 60000)),
      rep = replay(A, GEN),
      twice = inflate(C.replayedOf(rep, {}, C.RV - 1), (u, r) => [2 * (r.ok || 0), 2 * (r.ko || 0)]),
      data = {'reefid-sync-coral-progress': JSON.stringify(twice), 'reefid-sync-coral-rv': JSON.stringify(C.RV - 1)};
    s.post({name: 'Ana', pin: '1234', data, summary: {}, answers: A});
    const D = page(s, {
      v,
      SYNC: {name: 'Ana', pin: '1234', log: [], base: JSON.parse(JSON.stringify(twice)), srv: 1},
      P: JSON.parse(JSON.stringify(twice)),
      ls: {'reefid-sync-coral-progress': JSON.stringify(twice), 'reefid-sync-coral-rv': String(C.RV - 1)}
    });
    let cards = 0;
    D.ctx.rvNoticeAdd = (from, to) => (cards += C.rvMsgs(from, to).length);
    assert.strictEqual(total(D.ctx.P), 24);
    // One answer played here, not sent yet: counted on top of the replay, never lost.
    D.play('d' + v + 'new', 'Pavona', 1, new Date(CORAL + 49 * H).toISOString());
    await D.syncPush();
    await D.syncPull();
    const saved = JSON.parse(C.keysIn(s.get({name: 'Ana', pin: '1234'}).data)['reefid-sync-coral-progress']);
    assert.deepStrictEqual([D.rvApplied(), total(D.ctx.P), total(saved), D.ctx.SYNC.log.length], [C.RV, 13, 13, 0], `v${v}`);
    G.slice(0, 4).forEach(u => assert.strictEqual(n(D.ctx.P[u]), n(rep.P[u]), `v${v} ${u}: the log's`));
    assert.strictEqual(n(D.ctx.P.Pavona), 1, `v${v}: the unsent answer kept`);
    assert.strictEqual(cards, 0, `v${v}: no card (Q330)`);
  }
});

// The answer clock across a sync (model.js tally, its own source; sync.js clockTick): the device counts its 12 logged
// answers twice (24 on the level). other: the copy another device saved, under rules version r. clock: the clock as an
// earlier visit left it ([c, n]; null: not started). Returns the page after one pull, its level's count and its clock.
// fresh: a device that holds nothing of the account yet (no progress, no clock), loading it. play: answers counted on the
// level right after the pull, before anything reads the clock.
async function clockSync(other, r, clock, mine = 0, {fresh = false, play = 0} = {}) {
  const s = loadCodeGs(withData()),
    A = Array.from({length: 12}, (_, i) => ans('k' + i, G[i % 4], i % 3 !== 2, CORAL + 48 * H + i * 60000)),
    rep = replay(A, GEN),
    twice = inflate(C.replayedOf(rep, {}, C.RV - 1), (u, x) => [2 * (x.ok || 0), 2 * (x.ko || 0)]),
    rv = JSON.stringify(C.RV - 1);
  // This device's last save (revision 1), then the other device's (revision 2) with its answers in the log.
  s.post({
    name: 'Ana',
    pin: '1234',
    data: {'reefid-sync-coral-progress': JSON.stringify(twice), 'reefid-sync-coral-rv': rv},
    summary: {},
    answers: A
  });
  const O = other(twice, rep);
  s.post({
    name: 'Ana',
    pin: '1234',
    at: 1,
    data: {'reefid-sync-coral-progress': JSON.stringify(O.P), 'reefid-sync-coral-rv': JSON.stringify(r)},
    summary: {},
    answers: O.A
  });
  const here = fresh ? {} : inflate(twice, (u, x) => (u === C.LEVEL ? [(x.ok || 0) + mine, x.ko || 0] : null)),
    D = page(s, {
      SYNC: {name: 'Ana', pin: '1234', log: [], base: fresh ? {} : JSON.parse(JSON.stringify(twice)), srv: fresh ? 0 : 1},
      P: JSON.parse(JSON.stringify(here)),
      ls: fresh ? {} : {'reefid-sync-coral-progress': JSON.stringify(here), 'reefid-sync-coral-rv': rv}
    });
  vm.runInContext(`var CB = ${JSON.stringify(clock ? {c: clock[0], n: clock[1]} : {})}; var cbSave = () => {};` + clockSrc(), D.ctx);
  D.ctx.answersSoFar = () => n(D.ctx.P[C.LEVEL]);
  D.ctx.SYNC.dirty = false;
  await D.syncPull();
  const count = n(D.ctx.P[C.LEVEL]);
  if (play) D.ctx.P[C.LEVEL].ok += play;
  return {D, count, clock: D.ctx.tally(), rv: D.rvApplied()};
}

test("one sync: another device's answers merged raise the level's count, the log's count lowers it; the clock keeps both", async () => {
  // The other device played 4 more answers on top of the shared copy (28 on its level), logged: the log holds 16.
  const four = Array.from({length: 4}, (_, i) => ans('m' + i, 'Pavona', 1, CORAL + 50 * H + i * 60000)),
    R = await clockSync(
      twice => ({P: {...twice, Pavona: {ok: 4, ko: 0, h: '1111'}, '~level': {...twice[C.LEVEL], ok: twice[C.LEVEL].ok + 4}}, A: four}),
      C.RV - 1,
      null
    );
  assert.strictEqual(R.rv, C.RV, 'the replay adopted');
  assert.strictEqual(R.count, 16, "the level's count: the log's 16 answers");
  assert.strictEqual(R.clock, 28, 'the clock: the 24 counted here, then the 4 merged, never down');
});

test("one sync: a copy whose count another device's adoption lowered, merged, then the replay: the clock loses none of this device's answers", async () => {
  // The other device adopted rules version RV and saved: the log's 12 on its level. This device last ticked its clock at
  // 20 and has counted 4 answers since (24, then 2 more played: 26, those 2 not in the shared copy nor the log here).
  const R = await clockSync((twice, rep) => ({P: C.replayedOf(rep, twice, C.RV), A: []}), C.RV, [20, 20], 2);
  assert.strictEqual(R.rv, C.RV);
  assert.strictEqual(R.count, 12, "the log's 12 (the 2 played here are not in the queue: the replay holds none of them)");
  assert.strictEqual(R.clock, 26, 'the clock: 20, then the 6 counted here since, ticked before the merge lowered the count');
});

test("a device whose clock starts at the sync: it starts at the count before the log's replaces it", async () => {
  const R = await clockSync((twice, rep) => ({P: C.replayedOf(rep, twice, C.RV), A: []}), C.RV, null);
  assert.deepStrictEqual([R.count, R.clock], [12, 24]);
  // The next answer moves the clock on by one from there.
  R.D.ctx.P[C.LEVEL].ok++;
  assert.strictEqual(R.D.ctx.tally(), 25);
});

// Codex, #1497: an answer counted right after the replay lowered the count, before anything read the clock, counts on
// it (the lowered count is the clock's baseline at once, sync.js clockTick after the install).
test('an answer right after the sync, before the clock is read: it counts on the clock', async () => {
  const four = Array.from({length: 4}, (_, i) => ans('m' + i, 'Pavona', 1, CORAL + 50 * H + i * 60000)),
    R = await clockSync(
      twice => ({P: {...twice, Pavona: {ok: 4, ko: 0, h: '1111'}, '~level': {...twice[C.LEVEL], ok: twice[C.LEVEL].ok + 4}}, A: four}),
      C.RV - 1,
      null,
      0,
      {play: 1}
    );
  assert.deepStrictEqual([R.count, R.clock], [16, 29], 'the 28 before, then this answer');
});

// Codex, #1497: a mark synced from a device whose clock is ahead (it counted doubles the log took away) is never ahead
// of this device's clock: a new device's clock starts at the latest synced mark (model.js clockMarks), and a clock
// behind one after a merge moves up to it (clockSync), so an exam synced in course waits its gap, not the difference.
const exAhead = (twice, rep) => {
  const P = C.replayedOf(rep, twice, C.RV),
    u = Object.keys(P).find(g => g !== C.LEVEL && C.afterBkt(P[g]));
  // An exam in course on the other device, its last question at its clock 23 (it counted 24 before the log's 12).
  P[u].ex = {k: 1, t: 0, v: [], ts: CORAL + 60 * H, at: 23};
  return {P, A: []};
};
test('a new device loading an exam in course from a device whose clock is ahead: its clock starts at that mark', async () => {
  const R = await clockSync(exAhead, C.RV, null, 0, {fresh: true});
  assert.strictEqual(R.count, 12);
  const u = Object.keys(R.D.ctx.P).find(g => (R.D.ctx.P[g] || {}).ex);
  assert.ok(u, 'the exam in course came with the copy');
  assert.strictEqual(R.clock, 23, 'the clock at the mark: the exam gap counts from now, not after 11 more answers');
});
test('a device whose clock is behind a synced mark after the merge: it moves up to it', async () => {
  const R = await clockSync(exAhead, C.RV, [10, 24]);
  assert.strictEqual(R.clock, 23, 'its own 10, moved up to the mark');
  const S = await clockSync(exAhead, C.RV, [30, 24]);
  assert.strictEqual(S.clock, 30, 'a clock ahead of every mark stays');
});

// A replay of a rules version newer than the app's own (core.js rvOf) is never adopted: an app that does not know the
// version cannot hold what it brings, and once marked applied it would never take it again (an app from before rules
// version 9 would adopt its replay without the domain-score bar).
test('a replay of a rules version the app does not know yet: not adopted, the version not marked applied', async () => {
  const s = loadCodeGs(withData()),
    A = [0, 1, 2].map(i => ans('n' + i, G[i], 1, CORAL + 48 * H + i * 60000));
  s.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': '{}'}, summary: {}, answers: A});
  const D = page(s, {
    SYNC: {name: 'Ana', pin: '1234', log: [], base: {}, srv: 1},
    net: (k, b) => {
      if (k !== 'get') return undefined;
      const j = s.get(b);
      return {...j, replay: {...(j.replay || {rec: {}, ids: [], n: 0}), rv: C.RV + 1}};
    }
  });
  D.ctx.SYNC.dirty = false;
  await D.syncPull();
  assert.strictEqual(D.rvApplied(), 0, 'a newer version than this app knows: not taken');
});

test('no card for a recalculation any more (Q330): rules version 10 and fish rules version 2 have none, nor a jump to them', () => {
  assert.strictEqual(C.RVS.find(x => x.v === 10).msg, null);
  assert.strictEqual(C.rvsOf('fish').find(x => x.v === 2).msg, null);
  assert.deepStrictEqual(C.rvMsgs(0, 10), [], "not even rules version 9's apology in the jump");
  assert.deepStrictEqual(C.rvMsgs(9, 10), []);
  assert.deepStrictEqual(C.rvMsgs(0, 2, false, 'fish'), []);
});
