require('./slot.js').testGuard();
// The fish read their own pooled statistics in the app: core.js SUBJECTS fish stats makes the app ask
// for ?stats=1&s=fish (sync.js loadOwnStats) and join the reply to the corals' (model.js statsJoin), from the script
// version that ships this (FISHST_SHEET, rule D4). The fish's photo memory and format offsets stay the prior and none, and
// their replay reads no pooled number. Against the in-memory sheet (tests/gas.js): nothing reaches the real one (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js'),
  C = require('../core.js');
const {loadCodeGs} = require('./gas.js');

const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f)),
  plain = x => JSON.parse(JSON.stringify(x));
const FISH = C.subjectOf('fish');
const RAW = /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/main\/([\w.-]+\.json)$/;
const sheet = () =>
  loadCodeGs({
    fetch: url => {
      const m = RAW.exec(url);
      return m && fs.existsSync(path.join(ROOT, m[1])) ? {getResponseCode: () => 200, getContentText: () => src(m[1])} : null;
    }
  });
const at = i => new Date(Date.UTC(2026, 10, 10, 0, 0, i)).toISOString();
const FP = C.unitPool(FISH, FISH.pool.files.map(json));
const CH = ['f:Damselfishes', 'f:Wrasses', 'f:Butterflyfishes', 'f:Angelfishes'];
// Right answers on one family, four choices each, clearly above chance so their players are trusted.
const fish = k =>
  Array.from({length: 14}, (_, i) => ({
    id: (k + i).toLowerCase(),
    t: at(i * 40),
    ok: 1,
    m: 'quiz',
    g: CH[0],
    a: CH[0],
    ph: FP[CH[0]][i % 4][0],
    ch: CH.join(' '),
    s: 'fish',
    rk: 'family'
  }));

// The app's side: the part of sync.js and model.js that asks for, keeps and joins a subject's own statistics.
function app(sheetVersion, reply) {
  const M = src('model.js'),
    S = src('sync.js'),
    kept = {
      'reefid-photo-stats': {
        v: 160,
        photos: {'acropora-wide-1': [0.3, 12, 9, 12]},
        conf: {'Acropora|Montipora': [40, 9]},
        gd: {Acropora: [0.2, 30]}
      }
    },
    asked = [],
    c = vm.createContext({
      SUBJECTS: C.SUBJECTS,
      SUBJ: FISH,
      SYNC_URL: 'https://sheet.invalid/exec',
      sheetV: () => sheetVersion,
      PTIME_SHEET: C.PTIME_SHEET,
      appVer: () => 1,
      rankPhotos: () => {},
      store: {get: (k, d) => (k in kept ? plain(kept[k]) : d), set: (k, v) => (kept[k] = plain(v))},
      sheetFetch: u => (asked.push(u), Promise.resolve({json: () => reply})) // app.js: every request to the sheet
    });
  vm.runInContext(
    [
      'let PSTAT = {}, PCONF = {}, PGD = {}, GDIFF = {};',
      block(M, 'const gdOf = ', '\n', {through: 1, file: 'model.js'}),
      block(M, 'const OWN_STATS = ', '\n// The domain-score bar', {file: 'model.js'}),
      block(S, 'const ownStatsAt = {};', '\n// A switch to a subject', {file: 'sync.js'}),
      'this.M = {loadOwnStats, get: () => ({PSTAT, PCONF, PGD})};'
    ].join('\n'),
    c
  );
  return {M: c.M, asked, kept};
}
const tick = () => new Promise(r => setImmediate(r));

test('the app reads the fish’s own statistics from the script that serves this: kept, joined to the corals’, nothing else moves', async () => {
  const V = FISH.stats,
    s = sheet();
  assert.strictEqual(V, C.FISHST_SHEET);
  ['Ana', 'Ben'].forEach((n, j) => s.post({name: n, pin: '123' + j, data: {}, summary: {}, answers: fish(n + 'f')}));
  const reply = {...s.get({stats: '1', s: 'fish', av: '1'}), v: V};
  assert.strictEqual(reply.s, 'fish');
  assert.ok(Object.keys(reply.photos).length && Object.keys(reply.gd).includes(CH[0]), 'the family rated at the rank asked');

  let A = app(V, reply);
  const coral0 = plain(A.M.get());
  A.M.loadOwnStats();
  await tick();
  await tick();
  assert.strictEqual(A.asked.length, 1);
  assert.match(A.asked[0], /\?stats=1&s=fish&av=1$/);
  assert.strictEqual(A.kept['reefid-photo-stats-fish'].s, 'fish');
  const J = plain(A.M.get());
  Object.keys(reply.photos).forEach(f => assert.deepStrictEqual(J.PSTAT[f], reply.photos[f], f));
  assert.deepStrictEqual(J.PGD[CH[0]], reply.gd[CH[0]]);
  Object.keys(reply.conf).forEach(p => assert.deepStrictEqual(J.PCONF[p], reply.conf[p], p));
  Object.keys(coral0).forEach(k =>
    Object.entries(coral0[k]).forEach(([x, v]) => assert.deepStrictEqual(J[k][x], v, `${k} ${x}: the corals' as before`))
  );
  // the fish's reply carries photo memory and format offsets too: neither is kept (the prior and none, model.js pmem, pfmt)
  assert.ok(!('mem' in A.kept['reefid-photo-stats-fish']) && !('fmt' in A.kept['reefid-photo-stats-fish']));

  // an older script (before FISHST_SHEET): nothing asked, nothing kept
  A = app(V - 1, reply);
  A.M.loadOwnStats();
  await tick();
  assert.strictEqual(A.asked.length, 0);
  assert.ok(!('reefid-photo-stats-fish' in A.kept));
  // a reply that does not name the fish (a script that answers with the corals'), or from an older one: not kept
  for (const r of [
    {...reply, s: undefined},
    {...reply, s: 'coral'},
    {...reply, s: 'seaslug'},
    {...reply, v: V - 1}
  ]) {
    A = app(V, r);
    A.M.loadOwnStats();
    await tick();
    await tick();
    assert.strictEqual(A.asked.length, 1);
    assert.ok(!('reefid-photo-stats-fish' in A.kept), JSON.stringify({s: r.s, v: r.v}));
  }
});

// A photo shared by a family unit and one of its genera (a genus question shows its family's photos) is rated under the
// last unit that rated it: the sheet names that unit beside the photo's total (Code.gs statsOut_, core.js eloOf), and
// model.js photoDiff swaps its offset for the one of the unit asked, so a genus answer never sets a family question's
// difficulty (Codex review #1148).
test('a photo rated last at the genus rank keeps the family’s own offset in a family question', () => {
  const s = sheet(),
    P = FP[CH[0]][0][0],
    G = 'g:Dascyllus',
    GCH = [G, 'g:Pomacentrus', 'g:Chromis', 'g:Abudefduf'],
    // missed at the genus rank, on the same photo, after the right family answers
    genus = k =>
      Array.from({length: 8}, (_, i) => ({
        id: (k + 'g' + i).toLowerCase(),
        t: at(1000 + i * 40),
        ok: 0,
        m: 'quiz',
        g: G,
        a: GCH[1 + (i % 3)],
        ph: P,
        ch: GCH.join(' '),
        s: 'fish',
        rk: 'genus'
      }));
  ['Ana', 'Ben', 'Cy'].forEach((n, j) =>
    s.post({name: n, pin: '123' + j, data: {}, summary: {}, answers: [...fish(n + 'f'), ...genus(n)]})
  );
  const reply = s.get({stats: '1', s: 'fish', av: '1'}),
    o = reply.photos[P];
  assert.ok(reply.gd[CH[0]] && reply.gd[G], 'both units rated');
  assert.strictEqual(o[4], G, 'the photo is rated last under the genus');
  assert.ok(reply.gd[G][0] - reply.gd[CH[0]][0] > 0.3, 'the genus offset is clearly the higher');
  const c = vm.createContext({SUBJ: FISH, calibOf: C.calibOf, PGD: reply.gd, PSTAT: reply.photos, PTM: {}, ptimeOff: C.ptimeOff});
  vm.runInContext(block(src('model.js'), 'const PDIFF = {', '\n}\n', {through: 1, file: 'model.js'}) + '\nthis.photoDiff = photoDiff;', c);
  const own = o[0] - reply.gd[G][0] + reply.gd[CH[0]][0],
    blend = (d, prior) => (o[1] * d + 5 * prior) / (o[1] + 5);
  assert.ok(Math.abs(c.photoDiff(CH[0], {f: P}) - blend(own, reply.gd[CH[0]][0])) < 1e-9, 'the family question: its own offset');
  assert.ok(Math.abs(c.photoDiff(G, {f: P}) - blend(o[0], reply.gd[G][0])) < 1e-9, 'the genus question: the total as served');
  // a reply from a script before the unit was served (four elements): the total as before
  c.PSTAT = {[P]: o.slice(0, 4)};
  assert.ok(Math.abs(c.photoDiff(CH[0], {f: P}) - blend(o[0], reply.gd[CH[0]][0])) < 1e-9);
  // the app's copy of the replay serves the same fifth element (core.js eloOf against Code.gs stats_: tests/core.test.js)
});

// The sheet replays a fish answer from the scoring record it carries (core.js replayProgress, Q132), whatever pooled
// statistics it is given, so the statistics the app now scores with never part the device's record from the sheet's.
test('a fish answer with its scoring record replays the same under any pooled statistics', () => {
  const gen = Object.fromEntries(CH.map(f => [f, {fam: 'x'}])),
    row = (i, sc, miss) => {
      const r = new Array(C.LOG_SC + 1).fill(null);
      Object.assign(r, {
        0: 'p1',
        1: Date.UTC(2026, 10, 10) + i * 60000,
        2: CH[0],
        3: miss ? CH[1] : CH[0],
        4: miss ? 0 : 1,
        5: 'quiz',
        6: 'fi1',
        7: 0.7,
        8: 0.2,
        10: CH.join(' ')
      });
      r[C.LOG_SC] = sc;
      return r;
    },
    // three right answers, then two misses on the family given instead (a look-alike test logged with each)
    rows = [0, 1, 2, 3, 4].map(i => row(i, {d: 0.4 + i / 10, m: 0.1, n: 0.2, ...(i > 2 ? {l: 1, c: 0.1} : {})}, i > 2)),
    pair = CH[0] + '|' + CH[1],
    a = C.replayProgress(rows, {gen}),
    b = C.replayProgress(rows, {
      gen,
      conf: {[pair]: [60, 30], [CH[0] + '|' + CH[2]]: [40, 20]},
      gd: {[CH[0]]: [-0.9, 100], [CH[1]]: [0.8, 90]}
    });
  assert.strictEqual(a.p1.used, 5, 'every row replayed');
  assert.ok(a.p1.P[CH[0]].ko === 2 && a.p1.P[CH[1]], 'the misses counted against both families (rule L2)');
  assert.deepStrictEqual(plain(b), plain(a));
});
