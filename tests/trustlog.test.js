// The log is the only reference (rule D9; Pierre, 2026-11-09, Q322, Q330; core.js replayedOf, replayBase, replayAdopted;
// rules version 10, fish rules version 2, no card): the replay's record of a unit and its answer count win over the
// device's, also when the device holds more answers there (they were counted twice: a save whose reply was lost, then
// another device's save, PR #824), and a unit the log has no answer on loses the answers the device counts on it. No
// exception for answers played before the log began, no floor. The fixtures are the patterns found on the real sheet on
// 2026-11-09 (counts only, made-up names): a whole record doubled, small excesses on some units, fish only, and the fish
// answers from before the fish log. Nothing leaves this process (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const C = require('../core.js');
const {page, LIGHT, withData, loadCodeGs} = require('./syncpage.js');

const DATA = require('../data.json'),
  GEN = {...((DATA.x && DATA.x.gen) || {}), ...DATA.gen},
  FGEN = C.fishReplayGen(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish.json'), 'utf8'))),
  CORAL = Date.UTC(2026, 10, 1, 9, 47), // the coral log's first answer
  FISH = Date.UTC(2026, 10, 6, 5, 7), // the fish log's first answer (sheet v60)
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
  // The level's answer count is the app's clock (the exam's gaps, the cards met, the openings and the prompts are stored
  // at the count they happened at): it never goes back (Codex review of #840).
  assert.strictEqual(n(M[C.LEVEL]), 60);
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
  const A = Array.from({length: 20}, (_, i) => ans('f' + i, FU[i % 5], i % 3 !== 2, FISH + 30 * H + i * 30000, FU)),
    rep = replay(A, FGEN),
    once = C.replayedOf(rep, {}, C.rvOf('fish')),
    saved = inflate(once, (u, r) => (u === 'f:Damselfishes' || u === 'f:Wrasses' ? [(r.ok || 0) + 2, r.ko || 0] : null));
  assert.deepStrictEqual(counts(C.replayAdopted(rep.P, saved, C.rvOf('fish'))), counts(once));
  // Played before the fish log began (the first logged fish answer in the log's first minute, as on 2026-11-06): its 17
  // answers from before are in no log, so they go (Q330: the log is the only reference), four on each of four families,
  // one on a fifth.
  const B = Array.from({length: 20}, (_, i) => ans('p' + i, FU[i % 5], i % 3 !== 2, FISH + 30000 + i * 60000, FU)),
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
      t0 = (fish ? FISH : CORAL) + int(200 * H),
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
    assert.strictEqual(n(M[C.LEVEL]), Math.max(n(once[C.LEVEL]), n(saved[C.LEVEL])), `case ${k}: the level's count, the app's clock`);
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
  for (const v of [LIGHT - 1, LIGHT]) {
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

// A replay of a rules version newer than the app's own (core.js rvOf) is never adopted: an app that does not know the
// version cannot hold what it brings, and once marked applied it would never take it again (2026-11-09: devices on an
// app from before rules version 9 adopted its replay without the domain-score bar).
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
