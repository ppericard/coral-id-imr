// Lighter saves on slow lines (sync.js LIGHT_SHEET, syncOnce, sdSeen, sdSaved, lightBody, syncSoon; Code.gs doPost_,
// load_, lightData_, hold_; core.js dataDelta, dataPatch, dataSum; docs/ROADMAP.md "Lighter saves on slow lines"): the
// app's own sync code run in Node on stubs (tests/syncpage.js), against the sync script on an in-memory sheet
// (tests/gas.js), with Node's own CompressionStream. Nothing leaves this process (rule D1). The merge guarantees are the
// classic flow's: no answer lost or counted twice across devices, the replay, the hold, archived and removed accounts, an
// older app on the same account.
const test = require('node:test'),
  assert = require('node:assert'),
  zlib = require('zlib');
const C = require('../core.js');
const {page, qa, T, LIGHT, DATA, withData, loadCodeGs} = require('./syncpage.js');

const TOK = 'ghp_write000000000000000000'; // an admin's token, as tests/gas.js answers it
const acct = () => ({name: 'Ana', pin: '1234', log: [], base: {}});
const rowsOf = s => (s.sheets.Answers ? s.sheets.Answers.rows : [[]]).slice(1).filter(r => r[0] === 'Ana').length;
const total = P => Object.keys(P || {}).reduce((t, g) => (g === C.LEVEL ? t : t + (P[g].ok || 0) + (P[g].ko || 0)), 0);
const saved = s => C.keysIn(s.get({name: 'Ana', pin: '1234'}).data);
const savedTotal = s => total(JSON.parse(saved(s)['reefid-sync-coral-progress'] || '{}'));
// Progress on every genus (played before signing in), so the whole data is a few KB.
const bigP = () =>
  Object.fromEntries(
    Object.keys(DATA.gen).map((g, i) => [
      g,
      {ok: i % 5, ko: i % 3, h: '101', ps: {[g.toLowerCase() + '-wide-' + i]: [2, 1], [g.toLowerCase() + '-close-' + i]: [1, 1]}}
    ])
  );
const kinds = (A, from = 0) => A.reqs.slice(from).map(r => r.kind);

test('core.js: a delta rebuilds the data it was made from, its checksum blind to key order, and a wrong base fails', () => {
  const base = {
      'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 1, ko: 0, h: '1'}, Porites: {ok: 2, ko: 1, ps: {a: [1, 1]}}}),
      'reefid-sync-board': '1',
      'reefid-sync-gone': '"x"'
    },
    now = {
      'reefid-sync-coral-progress': JSON.stringify({
        Acropora: {ok: 2, ko: 0, h: '11'},
        Porites: {ok: 2, ko: 1, ps: {a: [1, 1]}},
        Favia: {ok: 1}
      }),
      'reefid-sync-board': '0',
      'reefid-sync-new': '{"t":1}'
    },
    dz = C.dataDelta(base, now);
  assert.deepStrictEqual(Object.keys(dz).sort(), [
    'reefid-sync-board',
    'reefid-sync-coral-progress',
    'reefid-sync-gone',
    'reefid-sync-new'
  ]);
  assert.strictEqual(dz['reefid-sync-gone'], null);
  assert.deepStrictEqual(Object.keys(dz['reefid-sync-coral-progress'].p), ['Acropora', 'Favia'], 'only the records that changed');
  const back = C.dataPatch(base, dz);
  assert.strictEqual(C.dataSum(back), C.dataSum(now));
  const shuffled = {
    'reefid-sync-new': '{"t":1}',
    'reefid-sync-board': '0',
    'reefid-sync-coral-progress': JSON.stringify({
      Favia: {ok: 1},
      Porites: {ps: {a: [1, 1]}, ko: 1, ok: 2},
      Acropora: {h: '11', ko: 0, ok: 2}
    })
  };
  assert.strictEqual(C.dataSum(shuffled), C.dataSum(now), 'the same data in another key order');
  assert.ok(C.sameText(shuffled['reefid-sync-coral-progress'], now['reefid-sync-coral-progress']));
  assert.notStrictEqual(C.dataSum({...now, 'reefid-sync-board': '1'}), C.dataSum(now));
  const other = {...base, 'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 5}})};
  assert.notStrictEqual(C.dataSum(C.dataPatch(other, dz)), C.dataSum(now), 'a delta on another copy does not give the data');
  assert.strictEqual(C.dataPatch({'reefid-sync-coral-progress': '"text"'}, dz), null, 'a patch on a key that is no object');
});

test('the sheet: a light save rebuilds the copy from a delta, adds the old names, says its checksum; a delta that does not fit writes and logs nothing', () => {
  const s = loadCodeGs(),
    X = {'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 1, ko: 0}}), 'reefid-sync-board': '1'},
    r = s.post({lt: {light: 1, name: 'Ana', pin: '1234', data: X, summary: {}, answers: []}});
  assert.deepStrictEqual([r.ok, r.rev, r.sum], [true, 1, C.dataSum(X)]);
  const raw = s.get({name: 'Ana', pin: '1234'}).data;
  assert.strictEqual(
    raw[C.keyLegacy('reefid-sync-coral-progress')],
    X['reefid-sync-coral-progress'],
    'the old name, for an app before the rename'
  );
  const X2 = {...X, 'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 2, ko: 0}, Porites: {ok: 0, ko: 1}})},
    dz = C.dataDelta(X, X2),
    a1 = qa('d1', 'Acropora', 1, T(1));
  const bad = s.post({lt: {light: 1, name: 'Ana', pin: '1234', dz, sum: C.dataSum(X), at: 1, summary: {}, answers: [a1]}});
  assert.deepStrictEqual([bad.ok, bad.error, bad.log], [false, 'delta', undefined]);
  assert.strictEqual(rowsOf(s), 0, 'nothing logged: the answers go again with the whole data');
  const z = zlib.gzipSync(JSON.stringify({light: 1, name: 'Ana', pin: '1234', dz, sum: C.dataSum(X2), at: 1, summary: {}, answers: [a1]}));
  const ok = s.post({z: z.toString('base64')});
  assert.deepStrictEqual([ok.ok, ok.rev, ok.sum, rowsOf(s)], [true, 2, C.dataSum(X2), 1]);
  assert.strictEqual(C.dataSum(saved(s)), C.dataSum(X2));
  assert.deepStrictEqual(s.post({z: 'bm90IGd6aXA='}), {ok: false, error: 'zip', v: ok.v}, 'a body it cannot read');
  // A delta against an older revision is never applied: stale before anything is logged (the answers go again with the
  // save that follows), with the load of the copy there (a light save only).
  const st = s.post({
    lt: {light: 1, name: 'Ana', pin: '1234', dz, sum: C.dataSum(X2), at: 1, summary: {}, answers: [qa('d2', 'Porites', 0, T(2))]}
  });
  assert.deepStrictEqual([st.ok, st.error, st.log, st.found, st.rev, rowsOf(s)], [false, 'stale', undefined, true, 2, 1]);
  assert.strictEqual(C.dataSum(C.keysIn(st.data)), C.dataSum(X2), 'the copy another device wrote');
  assert.ok(typeof st.hold === 'number' && Array.isArray(st.holdIds));
  const old = s.post({name: 'Ana', pin: '1234', data: C.withLegacy(X2), summary: {}, answers: [], at: 1});
  assert.deepStrictEqual(old, {ok: false, error: 'stale', log: true, rev: 2, v: old.v}, 'an app before v116: the reply it always had');
});

test('the sheet: a stale light save reads its own row before the lock goes, so an admin delete then never sends another player’s copy', () => {
  const s = loadCodeGs(),
    mine = {'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 1, ko: 0}})},
    other = {'reefid-sync-coral-progress': JSON.stringify({Porites: {ok: 99, ko: 0}})};
  s.post({name: 'Ana', pin: '1234', data: mine, summary: {}, answers: []});
  s.post({name: 'Ana', pin: '1234', data: mine, summary: {}, answers: [], at: 1});
  s.post({name: 'Ben', pin: '5678', data: other, summary: {}, answers: []});
  // The moment the stale save lets the lock go, the admin deletes Ana: the rows below hers move up.
  let race = true;
  s.lock.onRelease = () => race && ((race = false), assert.ok(s.post({userDelete: 'Ana', token: TOK}).ok));
  const st = s.post({lt: {light: 1, name: 'Ana', pin: '1234', data: mine, at: 1, summary: {}, answers: []}});
  assert.strictEqual(race, false, 'the delete ran in the window');
  assert.strictEqual(st.error, 'stale');
  assert.ok(!/Porites/.test(JSON.stringify(st.data || {})), 'another player’s copy: ' + JSON.stringify(st.data));
});

test('the sheet: a refused delta counts nothing toward the answer cap; the whole save that follows counts its answers once', () => {
  const s = loadCodeGs(),
    X = {'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 1, ko: 0}})},
    cap = () => Number(Object.entries(s.cache).find(([k]) => /^cap:n:ana:\d+$/.test(k))?.[1] || 0);
  s.post({lt: {light: 1, name: 'Ana', pin: '1234', data: X, summary: {}, answers: []}});
  const A = [1, 2, 3].map(i => qa('c' + i, 'Acropora', 1, T(i))),
    X2 = {'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 4, ko: 0}})};
  const bad = s.post({lt: {light: 1, name: 'Ana', pin: '1234', dz: C.dataDelta(X, X2), sum: 'wrong', at: 1, summary: {}, answers: A}});
  assert.deepStrictEqual([bad.error, cap(), rowsOf(s)], ['delta', 0, 0]);
  const ok = s.post({lt: {light: 1, name: 'Ana', pin: '1234', data: X2, at: 1, summary: {}, answers: A}});
  assert.deepStrictEqual([ok.ok, cap(), rowsOf(s)], [true, 3, 3]);
});

test('the sheet: a load of the copy the device already holds comes back without it; the light hold names only the answers from pt', () => {
  const s = loadCodeGs(),
    A = Array.from({length: 30}, (_, i) => qa('h' + i, 'Acropora', i % 3, T(i)));
  s.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': '{}'}, summary: {}, answers: A});
  const full = s.get({name: 'Ana', pin: '1234'});
  assert.ok(full.data && !full.same && full.holdIds.length === 30, 'an app before v116: the copy and the last ids');
  const same = s.get({name: 'Ana', pin: '1234', have: '1', light: '1'});
  assert.deepStrictEqual([same.same, 'data' in same, same.rev, same.hold], [1, false, 1, full.hold]);
  assert.deepStrictEqual(same.holdIds, [], 'nothing queued: no ids');
  const pt = s.get({name: 'Ana', pin: '1234', light: '1', pt: String(Date.parse(T(27)))});
  assert.deepStrictEqual(pt.holdIds, ['h26', 'h27', 'h28', 'h29'], 'from pt, a second before it');
  assert.ok(s.get({name: 'Ana', pin: '1234', have: '0'}).data, 'another revision: the copy');
});

test('one device: after the visit’s first sync, each answer is one save, of what changed only, gzipped; the copy saved is the device’s', async () => {
  // A device with progress on many genera already (played before signing in), so the whole data is a few KB.
  const big = bigP(),
    s = loadCodeGs(withData()),
    A = page(s, {SYNC: acct(), P: big});
  A.store.set('reefid-sync-coral-progress', big);
  for (let i = 0; i < 6; i++) A.play('a' + i, i % 2 ? 'Porites' : 'Acropora', i !== 3);
  await A.syncPush(); // the visit's first sync: a load (the replay of the log comes with the save's reply), then a save
  assert.deepStrictEqual(kinds(A).slice(0, 2), ['get', 'post']);
  assert.ok(/^\{"z":/.test(A.reqs[1].raw) && A.reqs[1].body.data, 'the whole data, gzipped: a new account');
  const from = A.reqs.length;
  for (let i = 6; i < 12; i++) {
    A.play('a' + i, ['Acropora', 'Porites', 'Montipora'][i % 3], i % 4 !== 0);
    await A.syncPush();
  }
  assert.deepStrictEqual(kinds(A, from), new Array(6).fill('post'), 'one request per answer, no load');
  A.reqs.slice(from).forEach(r => {
    assert.ok(r.body.dz && !r.body.data && r.body.light === 1, 'a delta');
    assert.ok(!JSON.stringify(r.body.dz).includes(C.keyLegacy('reefid-sync-coral-progress')), 'no old names: the sheet adds them');
    assert.ok(r.reply.ok && r.reply.sum, JSON.stringify(r.reply));
  });
  A.reqs.slice(from).forEach(r => assert.ok(r.raw.length < 1500, 'a delta is short: ' + r.raw.length));
  const all = total(A.ctx.P);
  assert.deepStrictEqual([rowsOf(s), savedTotal(s)], [12, all]);
  assert.strictEqual(C.dataSum(saved(s)), C.dataSum(A.ctx.SYNC.sd.d), 'the copy this device holds is the sheet’s');
  assert.strictEqual(A.ctx.SYNC.log.length, 0);
  // A new page (a reload): its first sync loads, and the copy it holds comes back as same, without the data.
  const B = page(s, {
    SYNC: A.ctx.SYNC,
    P: A.ctx.P,
    ls: Object.fromEntries(
      [...Array(A.ctx.localStorage.length)].map((_, i) => [
        A.ctx.localStorage.key(i),
        A.ctx.localStorage.getItem(A.ctx.localStorage.key(i))
      ])
    )
  });
  await B.syncPull();
  assert.deepStrictEqual([kinds(B), B.reqs[0].reply.same, 'data' in B.reqs[0].reply], [['get'], 1, false]);
  assert.strictEqual(total(B.ctx.P), all);
});

test('two devices: a save after the other device wrote is answered stale with the load, merged, saved again: two requests, nothing lost', async () => {
  const s = loadCodeGs(withData()),
    A = page(s, {SYNC: acct()}),
    B = page(s, {SYNC: acct()});
  await A.syncPull();
  await B.syncPull();
  for (let i = 0; i < 8; i++) {
    const D = i % 2 ? B : A,
      from = D.reqs.length;
    D.play('t' + i, i % 3 ? 'Porites' : 'Acropora', i % 4 !== 1);
    await D.syncPush();
    if (i >= 2) {
      const k = kinds(D, from);
      assert.deepStrictEqual(k.slice(0, 2), ['post', 'post'], `turn ${i}: ${k}`);
      assert.strictEqual(D.reqs[from].reply.error, 'stale');
      assert.ok(D.reqs[from].reply.data || D.reqs[from].reply.found === true, 'the load came with it');
    }
  }
  await A.syncPull();
  await B.syncPull();
  assert.deepStrictEqual([rowsOf(s), total(A.ctx.P), total(B.ctx.P), savedTotal(s)], [8, 8, 8, 8]);
});

test('before LIGHT_SHEET the sync is the one it always was: a load, then the whole data with its old names, never wrapped', async () => {
  const s = loadCodeGs(withData()),
    A = page(s, {v: LIGHT - 1, SYNC: acct()});
  for (let i = 0; i < 3; i++) {
    A.play('o' + i);
    await A.syncPush();
  }
  const k = kinds(A);
  assert.ok(k.length >= 6 && k.every((x, i) => x === (i % 2 ? 'post' : 'get')), 'a load before every save: ' + k);
  A.reqs
    .filter(r => r.kind === 'post')
    .forEach(r => {
      const o = JSON.parse(r.raw);
      assert.ok(o.name === 'Ana' && o.data && !o.lt && !o.z && !o.light && !o.dz, 'a classic save');
      assert.ok(C.keyLegacy('reefid-sync-coral-progress') in o.data, 'with the old names');
    });
  A.reqs.filter(r => r.kind === 'get').forEach(r => assert.ok(!('have' in r.body) && !('light' in r.body)));
  assert.deepStrictEqual([rowsOf(s), total(A.ctx.P)], [3, 3]);
});

test('a script that cannot read the gzip, or a delta that does not fit: the same sync goes again, nothing lost', async () => {
  const s = loadCodeGs(withData());
  let zipped = 0;
  const P = bigP(),
    A = page(s, {
      SYNC: acct(),
      P,
      net: (k, b, n) => (k === 'post' && /^\{"z"/.test(A.reqs[n].raw) && !zipped++ ? {ok: false, error: 'zip'} : undefined)
    });
  A.store.set('reefid-sync-coral-progress', P);
  A.play('z0');
  await A.syncPush();
  for (let i = 1; i < 4; i++) {
    A.play('z' + i, 'Porites');
    await A.syncPush();
  }
  assert.strictEqual(zipped, 1);
  assert.strictEqual(A.ctx.SYNC.nz, LIGHT, 'no gzip until the script changes');
  assert.ok(A.reqs.slice(-1).every(r => /^\{"lt":/.test(r.raw)));
  // A copy held here that is not the sheet's (made up): its delta is refused, the copy loaded again, saved in full.
  const from = A.reqs.length;
  A.play('z9', 'Montipora', 0);
  A.ctx.SYNC.sd.d = {...A.ctx.SYNC.sd.d, 'reefid-sync-coral-progress': JSON.stringify(A.ctx.P)}; // as if the sheet had this answer
  await A.syncPush();
  assert.deepStrictEqual(kinds(A, from).slice(0, 3), ['post', 'get', 'post']);
  assert.strictEqual(A.reqs[from].reply.error, 'delta');
  assert.ok(A.reqs[from + 2].body.data && !A.reqs[from + 2].body.dz, 'then the whole data');
  assert.strictEqual(A.ctx.SYNC.nd, LIGHT, 'and no delta until the script changes: never a loop of refused ones');
  assert.deepStrictEqual([rowsOf(s), savedTotal(s), A.ctx.SYNC.log.length], [5, total(A.ctx.P), 0]);
});

test('an account archived or removed between two light saves: the save says so, nothing re-created', async () => {
  const s = loadCodeGs(withData()),
    A = page(s, {SYNC: acct()});
  A.play('r0');
  await A.syncPush();
  A.play('r1');
  await A.syncPush();
  assert.ok(A.ctx.SYNC.acct && A.ctx.SYNC.sd, 'a light device');
  assert.ok(s.post({userArchive: {from: 'Ana', into: 'Ana-old'}, token: TOK}).ok);
  A.play('r2');
  await A.syncPush();
  assert.strictEqual(A.ctx.SYNC.err, 'archived');
  assert.ok(!s.get({name: 'Ana', pin: '1234'}).found, 'the name not re-created');
  const s2 = loadCodeGs(withData()),
    B = page(s2, {SYNC: acct()});
  B.play('g0');
  await B.syncPush();
  assert.ok(s2.post({userDelete: 'Ana', token: TOK}).ok);
  B.play('g1');
  await B.syncPush();
  assert.strictEqual(B.ctx.SYNC.err, 'gone');
});

test('a save whose reply never came, though the sheet wrote it: the next sync loads, finds it, counts it once', async () => {
  for (const v of [LIGHT - 1, LIGHT]) {
    const s = loadCodeGs(withData());
    let lose = -1;
    const A = page(s, {v, SYNC: acct(), lost: (k, b, n) => n === lose});
    A.play('l0');
    await A.syncPush();
    A.play('l1', 'Porites');
    lose = A.reqs.length + (v >= LIGHT ? 0 : 1); // the save (light: no load before it)
    await A.syncPush();
    assert.ok(A.ctx.SYNC.fail && A.ctx.SYNC.log.length === 1, `v${v}: the answer waits, its fate unknown here`);
    const from = A.reqs.length;
    A.play('l2', 'Montipora', 0);
    await A.syncPush();
    assert.strictEqual(A.reqs[from].kind, 'get', `v${v}: a load first, to find what the lost save did`);
    await A.syncPull();
    assert.deepStrictEqual([rowsOf(s), total(A.ctx.P), savedTotal(s), A.ctx.SYNC.log.length], [3, 3, 3, 0], `v${v}`);
  }
});

test('a slow line: the next save waits longer, counted from the first change; a fast line keeps 3 s', () => {
  const s = loadCodeGs(),
    A = page(s, {SYNC: acct()});
  assert.strictEqual(A.saveWait(), A.SAVE_WAIT.MS);
  A.setSaveMs(A.SAVE_WAIT.SLOW + 1000);
  assert.strictEqual(A.saveWait(), 2 * (A.SAVE_WAIT.SLOW + 1000));
  A.setSaveMs(60000);
  assert.strictEqual(A.saveWait(), A.SAVE_WAIT.MAX);
  const B = page(s, {v: LIGHT - 1, SYNC: acct()});
  B.setSaveMs(60000);
  assert.strictEqual(B.saveWait(), B.SAVE_WAIT.MS, 'before LIGHT_SHEET: as ever');
});

test('property: light devices, a classic one, an older app, refusals and failed requests: every device ends with the rows of the log', async () => {
  let seed = 11;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const G = ['Acropora', 'Porites', 'Montipora', 'Pocillopora'];
  for (let run = 0; run < 30; run++) {
    const s = loadCodeGs(withData());
    let calm = false,
      k = 0;
    // A save refused (busy) or a request that never reached the sheet (the line). Not a reply lost after the sheet wrote
    // (below, one device): two devices then can count an answer twice, in the classic flow as in the light one.
    const chaos = {
      net: kind =>
        !calm && kind === 'post' && rnd() < 0.12
          ? {ok: false, error: 'busy'}
          : !calm && rnd() < 0.06
            ? new TypeError('Failed to fetch')
            : undefined
    };
    const devs = [page(s, {SYNC: acct(), ...chaos}), page(s, {SYNC: acct(), ...chaos}), page(s, {v: LIGHT - 1, SYNC: acct(), ...chaos})];
    // An app from before the light saves and the replay: it loads the copy, answers once, saves the whole of it.
    const older = () => {
      const j = s.get({name: 'Ana', pin: '1234'}),
        data = C.keysIn(j.data || {}),
        P = JSON.parse(data['reefid-sync-coral-progress'] || '{}'),
        g = G[Math.floor(rnd() * 4)],
        ok = rnd() < 0.75,
        x = (P[g] = P[g] || {ok: 0, ko: 0, h: ''});
      x[ok ? 'ok' : 'ko']++;
      delete data['reefid-sync-coral-rv'];
      data['reefid-sync-coral-progress'] = JSON.stringify(P);
      s.post({
        name: 'Ana',
        pin: '1234',
        data: C.withLegacy(data),
        summary: {},
        answers: [qa('o' + run + 'x' + k++, g, ok, T(1000 + run * 100 + k))],
        av: '180',
        ...(j.rev ? {at: j.rev} : {})
      });
    };
    for (let step = 0; step < 30; step++) {
      const x = rnd(),
        d = devs[Math.floor(rnd() * devs.length)];
      if (x < 0.5) d.play('p' + run + 'x' + k++, G[Math.floor(rnd() * 4)], rnd() < 0.75, T(1000 + run * 100 + k));
      else if (x < 0.8) await d.syncPush();
      else if (x < 0.92) await d.syncPull();
      else older();
    }
    calm = true;
    for (let round = 0; round < 4; round++)
      for (const d of devs) {
        d.ctx.SYNC.dirty = true;
        await d.syncPush();
      }
    for (const d of devs) await d.syncPull();
    const want = rowsOf(s);
    devs.forEach((d, i) => {
      assert.strictEqual(d.ctx.SYNC.log.length, 0, `run ${run}: device ${i} still queues answers`);
      assert.strictEqual(total(d.ctx.P), want, `run ${run}: device ${i} counts ${total(d.ctx.P)}, the log ${want}`);
    });
    assert.strictEqual(savedTotal(s), want, `run ${run}: the saved copy`);
    const light = devs.slice(0, 2);
    light.forEach((d, i) =>
      assert.ok(
        d.reqs.some(r => r.body.dz),
        `run ${run}: device ${i} never sent a delta`
      )
    );
  }
});
