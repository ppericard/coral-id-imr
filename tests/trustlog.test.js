// Trust the log rather than the device (Pierre, 2026-11-09, Q322; core.js logTrusted, replayProgress logFrom,
// replayedOf, replayBase; rules version 10, fish rules version 2): a player whose answers of a subject are all in the log
// takes the replay's record of a unit, and its answer count, also when the saved copy holds more answers there (they
// were counted twice: a save whose reply was lost, then another device's save, PR #824). A player who played a subject
// before its log began keeps the saved copy's larger counts, as before. The fixtures are the patterns found on the real
// sheet on 2026-11-09 (counts only, made-up names): a whole record doubled, small excesses on some units, fish only, and
// the fish answers from before the fish log. Nothing leaves this process (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const C = require('../core.js');
const {page, LIGHT, withData, loadCodeGs} = require('./syncpage.js');

const DATA = require('../data.json'),
  GEN = {...((DATA.x && DATA.x.gen) || {}), ...DATA.gen},
  FGEN = C.fishReplayGen(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish.json'), 'utf8'))),
  CORAL = C.logFromOf('coral'),
  FISH = C.logFromOf('fish'),
  H = C.PRELOG.MS;
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
const replay = (A, gen, logFrom, id = 'ana') =>
  C.replayProgress(
    A.map(a => C.logRow(a, id)),
    {gen, ...(logFrom === undefined ? {} : {logFrom})}
  )[id];
// The saved copy a device holds: the adopted replay, with its counts on some units times k (2: counted twice) or plus d.
const inflate = (P, f) =>
  Object.fromEntries(
    Object.entries(JSON.parse(JSON.stringify(P))).map(([u, r]) => {
      const x = f(u, r);
      return [u, x ? {...r, ok: x[0], ko: x[1]} : r];
    })
  );

test('logTrusted: answers all in the log from an hour after the log began, a subject without a pre-log period always', () => {
  assert.ok(CORAL > 0 && FISH > CORAL, 'the corals and the fish have a log start');
  assert.strictEqual(C.logTrusted(FISH, FISH), false, 'a device in use when the log began');
  assert.strictEqual(C.logTrusted(FISH, FISH + H - 1), false);
  assert.strictEqual(C.logTrusted(FISH, FISH + H), true);
  assert.strictEqual(C.logTrusted(0, 0), true, 'no pre-log period');
  const A = [0, 1, 2].map(i => ans('t' + i, G[i], 1, CORAL + 2 * H + i * 1000));
  assert.strictEqual(replay(A, GEN, CORAL).P[C.LEVEL].lg, 1, 'marked on the replay itself');
  assert.strictEqual(replay(A, GEN, CORAL + 2 * H).P[C.LEVEL].lg, undefined, 'its first answer within the hour');
  assert.strictEqual(replay(A, GEN, 0).P[C.LEVEL].lg, 1, 'a subject logged from its first answer');
  assert.strictEqual(replay(A, GEN).P[C.LEVEL].lg, undefined, 'no logFrom given (a tool, an older script): as before');
  // Since a progress reset: the first answer after it.
  const R = C.replayProgress(
    A.map(a => C.logRow(a, 'ana')),
    {gen: GEN, logFrom: CORAL + 2 * H, since: {ana: CORAL + 2 * H + 500}}
  ).ana;
  assert.strictEqual(R.n, 2);
  assert.strictEqual(R.P[C.LEVEL].lg, undefined, 'the first answer since the reset, within the hour of that log start');
  // Going on from a record (a device's unsent answers on top of the sheet's replay): the record's verdict stays.
  const base = replay(A, GEN, CORAL + 2 * H),
    on = C.replayProgress([C.logRow(ans('t9', G[0], 1, CORAL + 9 * H), 'me')], {gen: GEN, logFrom: CORAL, start: {me: base}}).me;
  assert.strictEqual(on.P[C.LEVEL].lg, undefined, 'not marked by the answers on top');
});

test('a whole record counted twice: the replay of the log wins, every unit and the level, once trusted to the log', () => {
  // 30 answers on 10 genera in half an hour, two days after the coral log began; the saved copy holds each twice.
  const A = Array.from({length: 30}, (_, i) => ans('w' + i, G[i % 10], i % 4 !== 3, CORAL + 48 * H + i * 60000)),
    rep = replay(A, GEN, CORAL),
    once = C.replayedOf(rep, {}, C.RV),
    twice = inflate(once, (u, r) => [2 * (r.ok || 0), 2 * (r.ko || 0)]);
  assert.strictEqual(total(twice), 60);
  const M = C.replayAdopted(rep.P, twice, C.RV, false);
  assert.deepStrictEqual(counts(M), counts(once), 'every unit and the level as in the log');
  assert.strictEqual(total(M), 30);
  assert.strictEqual(n(M[C.LEVEL]), 30, "the level's answer count too");
  // The rule before (no lg on the replay): the saved copy's larger counts kept.
  const old = C.replayAdopted(replay(A, GEN).P, twice, C.RV, false);
  assert.strictEqual(total(old), 60, 'kept twice before');
  // The merge baseline after the adoption is the replay's record, its level's count included.
  const B = C.replayBase(rep.P, M, C.RV, twice);
  assert.strictEqual(n(B[C.LEVEL]), 30);
  assert.strictEqual(total(B), 30);
});

test('small excesses on some units (one to three answers counted twice): corrected, the other units unchanged', () => {
  const A = Array.from({length: 40}, (_, i) => ans('e' + i, G[i % 8], i % 5 !== 0, CORAL + 72 * H + i * 30000)),
    rep = replay(A, GEN, CORAL),
    once = C.replayedOf(rep, {}, C.RV),
    plus = {Acropora: 1, Porites: 3, Fungia: 2},
    saved = inflate(once, (u, r) => (plus[u] ? [(r.ok || 0) + plus[u], r.ko || 0] : null)),
    M = C.replayAdopted(rep.P, saved, C.RV, false);
  assert.strictEqual(total(saved), 46);
  assert.deepStrictEqual(counts(M), counts(once));
  G.slice(0, 8)
    .filter(u => !plus[u])
    .forEach(u => assert.deepStrictEqual(M[u], once[u], u + ': as replayed'));
});

test('fish only: a fish player trusted to the fish log gets the fish replay; one who played fish before its log keeps the extra', () => {
  const A = Array.from({length: 20}, (_, i) => ans('f' + i, FU[i % 5], i % 3 !== 2, FISH + 30 * H + i * 30000, FU)),
    rep = replay(A, FGEN, FISH),
    once = C.replayedOf(rep, {}, C.rvOf('fish')),
    saved = inflate(once, (u, r) => (u === 'f:Damselfishes' || u === 'f:Wrasses' ? [(r.ok || 0) + 2, r.ko || 0] : null));
  assert.strictEqual(rep.P[C.LEVEL].lg, 1);
  assert.deepStrictEqual(counts(C.replayAdopted(rep.P, saved, C.rvOf('fish'), true)), counts(once));
  // Played before the fish log began (the first logged fish answer in the log's first minute, as on 2026-11-06): its 17
  // answers from before are in no log, and the saved copy keeps them (four on each of four families, one on a fifth).
  const B = Array.from({length: 20}, (_, i) => ans('p' + i, FU[i % 5], i % 3 !== 2, FISH + 30000 + i * 60000, FU)),
    pre = replay(B, FGEN, FISH),
    early = C.replayedOf(pre, {}, C.rvOf('fish')),
    extra = {'f:Damselfishes': 4, 'f:Butterflyfishes': 4, 'f:Angelfishes': 4, 'f:Wrasses': 4, 'f:Groupers': 1},
    kept = inflate(early, (u, r) => (extra[u] ? [(r.ok || 0) + extra[u], r.ko || 0] : null));
  assert.strictEqual(pre.P[C.LEVEL].lg, undefined);
  const M = C.replayAdopted(pre.P, kept, C.rvOf('fish'), true);
  assert.strictEqual(total(M), 37, 'the 17 answers from before the log kept');
  FU.forEach(u => assert.strictEqual(n(M[u]), n(kept[u]), u));
});

test('progress from before the coral log: a player whose first logged answer came as the log began keeps the saved counts', () => {
  const A = Array.from({length: 12}, (_, i) => ans('c' + i, G[i % 4], 1, CORAL + 5 * 60000 + i * 60000)),
    rep = replay(A, GEN, CORAL),
    saved = inflate(C.replayedOf(rep, {}, C.RV), (u, r) => [(r.ok || 0) + 5, r.ko || 0]);
  assert.strictEqual(rep.P[C.LEVEL].lg, undefined);
  const M = C.replayAdopted(rep.P, saved, C.RV, false);
  assert.deepStrictEqual(counts(M), counts(saved), 'a replay never loses the answers the log never had');
});

test('property: trusted players end with the log, players from before the log with the larger of the two (400 cases)', () => {
  let seed = 0x5eed;
  const rnd = () => (seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0) / 2 ** 32,
    int = k => Math.floor(rnd() * k);
  for (let k = 0; k < 400; k++) {
    const fish = rnd() < 0.4,
      U = fish ? FU : G,
      gen = fish ? FGEN : GEN,
      from = fish ? FISH : CORAL,
      trusted = rnd() < 0.7,
      t0 = from + (trusted ? H + int(200 * H) : int(H)),
      A = Array.from({length: 3 + int(30)}, (_, i) => ans('q' + k + 'x' + i, U[int(U.length)], rnd() < 0.7, t0 + i * 45000, U)),
      rep = replay(A, gen, from),
      once = C.replayedOf(rep, {}, 1),
      // The saved copy: some units counted twice or more, some behind the log (a device that has not synced them yet).
      saved = inflate(once, (u, r) =>
        u === C.LEVEL
          ? [(r.ok || 0) + int(5), r.ko || 0]
          : rnd() < 0.4
            ? [(r.ok || 0) + 1 + int(4), (r.ko || 0) + int(2)]
            : rnd() < 0.2
              ? [Math.max(0, (r.ok || 0) - 1), r.ko || 0]
              : null
      ),
      M = C.replayAdopted(rep.P, saved, 1, !!fish);
    assert.strictEqual(!!rep.P[C.LEVEL].lg, trusted, `case ${k}: the verdict`);
    Object.keys(once).forEach(u => {
      const want = trusted ? n(once[u]) : Math.max(n(once[u]), n(saved[u]));
      assert.strictEqual(n(M[u]), want, `case ${k} ${trusted ? 'trusted' : 'before the log'}: ${u}`);
    });
    // Adopting the same replay again over the adopted record changes no count.
    assert.deepStrictEqual(counts(C.replayAdopted(rep.P, M, 1, !!fish)), counts(M), `case ${k}: again`);
  }
});

// End to end: the sheet's replay (Code.gs replay_ with the subject's logFrom) adopted by the app (sync.js replayAdoptS)
// of a device whose saved copy holds a whole record twice under rules version 9: once the script replays rules version
// 10, the device takes the log's counts, and its next save puts them on the sheet.
test('a device holding its record twice under the rules before: the next sync takes the log, the save corrects the sheet', async () => {
  for (const v of [LIGHT - 1, LIGHT]) {
    const s = loadCodeGs(withData()),
      A = Array.from({length: 12}, (_, i) => ans('d' + v + 'x' + i, G[i % 4], i % 3 !== 2, CORAL + 48 * H + i * 60000)),
      rep = replay(A, GEN, CORAL),
      twice = inflate(C.replayedOf(rep, {}, C.RV - 1), (u, r) => [2 * (r.ok || 0), 2 * (r.ko || 0)]),
      data = {'reefid-sync-coral-progress': JSON.stringify(twice), 'reefid-sync-coral-rv': JSON.stringify(C.RV - 1)};
    s.post({name: 'Ana', pin: '1234', data, summary: {}, answers: A});
    const D = page(s, {
      v,
      SYNC: {name: 'Ana', pin: '1234', log: [], base: JSON.parse(JSON.stringify(twice)), srv: 1},
      P: JSON.parse(JSON.stringify(twice)),
      ls: {'reefid-sync-coral-progress': JSON.stringify(twice), 'reefid-sync-coral-rv': String(C.RV - 1)}
    });
    assert.strictEqual(total(D.ctx.P), 24);
    await D.syncPush();
    await D.syncPull();
    const saved = JSON.parse(C.keysIn(s.get({name: 'Ana', pin: '1234'}).data)['reefid-sync-coral-progress']);
    assert.deepStrictEqual([D.rvApplied(), total(D.ctx.P), n(D.ctx.P[C.LEVEL]), total(saved)], [C.RV, 12, 12, 12], `v${v}`);
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
