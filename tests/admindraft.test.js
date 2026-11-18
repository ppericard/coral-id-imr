require('./slot.js').testGuard();
// The admin's draft store (admin-draft.js, model B of the sign-out seal: docs/reviews/2026-11-09-admin-signout-seal.md):
// two or three admin "tabs" over one stand-in IndexedDB (tests/fakeidb.js: transactions one at a time, all or nothing,
// ended by an await), real Web Crypto, and the encryption or decryption held where the six review rounds of #798 found a
// race between tabs. Each of those findings (their Codex thread ids) has its test here.
const test = require('node:test'),
  assert = require('node:assert');
const fakeIDB = require('./fakeidb.js');
const {ddbOpen, ddbTx, ddbRead, ddbKeys, ddbTab, ddbPeek, openRec, SEAL} = require('../admin-draft.js');
const {mergeTabs, merge3, canon} = require('../core.js');

const SAVED0 = {v: 1, genera: {Acropora: {feat: {wide: ['a1']}}}, quality: {p1: 2}};
const clone = o => JSON.parse(JSON.stringify(o));
// A gate: hold(name) makes the next call of that name wait until release(name); .hit resolves when that call came.
function gates() {
  const held = {},
    all = {};
  return {
    hold(n) {
      const h = {};
      h.p = new Promise(x => (h.r = x));
      h.hit = new Promise(x => (h.hitR = x));
      held[n] = all[n] = h;
      return h;
    },
    async pass(n) {
      const h = held[n];
      if (!h) return;
      delete held[n];
      h.hitR();
      await h.p;
    },
    release: n => all[n] && all[n].r()
  };
}
function subtleWith(G) {
  const s = globalThis.crypto.subtle;
  return {
    digest: (...a) => s.digest(...a),
    importKey: (...a) => s.importKey(...a),
    encrypt: async (...a) => {
      await G.pass('encrypt');
      return s.encrypt(...a);
    },
    decrypt: async (...a) => {
      await G.pass('decrypt');
      return s.decrypt(...a);
    }
  };
}
// One admin tab: its draft and base in memory, as admin.js keeps DRAFT and SAVED.
async function tab(idb, id, token, G = gates(), o = {}) {
  const db = await ddbOpen(idb, 'reefid-admin-draft'),
    subtle = subtleWith(G),
    s = {draft: null, saved: clone(o.saved || SAVED0), gone: [], G};
  const T = ddbTab({
    db,
    tab: id,
    subtle,
    snap: () => JSON.stringify(s.draft),
    draft: () => s.draft,
    saved: () => s.saved,
    adopt: d => (s.draft = d),
    adoptBase: c => (s.saved = c),
    merge: (sh, mi, ot) => mergeTabs(sh, mi, ot),
    clean: (d, b) => canon(merge3(b, d, b)) === canon(merge3(b, b, b)),
    post: () => {},
    gone: S => s.gone.push(S),
    ...(o.hooks || {})
  });
  s.T = T;
  s.db = db;
  if (token) T.unlock(await ddbKeys(token, subtle));
  // admin.js start: the token's seal opened, else the plain draft re-based (here: kept as it is), then written.
  const L = await T.load((plain, sealed) => (plain ? mergeTabs(s.saved, plain.d, sealed.d).draft : sealed.d));
  s.L = L;
  s.draft = L.draft || (L.old ? L.old : clone(s.saved));
  if (token) {
    T.base();
    await T.sync();
  }
  s.click = (f, q) => {
    s.draft = {...s.draft, quality: {...(s.draft.quality || {}), [f]: q}};
    return T.sync();
  };
  s.set = (f, q) => {
    s.draft = {...s.draft, quality: {...(s.draft.quality || {}), [f]: q}};
  };
  return s;
}
const store = async idb => {
  const db = await ddbOpen(idb, 'reefid-admin-draft');
  return ddbTx(db, 'readonly', api => api.get(['state', 'draft', 'base'], v => (api.out = v)));
};
const sealOf = async (idb, token) => {
  const db = await ddbOpen(idb, 'reefid-admin-draft'),
    K = await ddbKeys(token, globalThis.crypto.subtle),
    v = await ddbRead(db, [SEAL(K.mark)]);
  return v[SEAL(K.mark)] ? JSON.parse((await openRec(globalThis.crypto.subtle, K, v[SEAL(K.mark)])).j) : null;
};
const q = (s, f) => (s.draft.quality || {})[f];

test('the stand-in IndexedDB ends a transaction at an await, as a browser does', async () => {
  const idb = fakeIDB(),
    db = await ddbOpen(idb, 'x');
  let late = null;
  await ddbTx(db, 'readwrite', api =>
    api.get(['a'], () => {
      late = globalThis.crypto.subtle.digest('SHA-256', new Uint8Array(1)).then(() => {
        try {
          api.put('a', 1);
          return 'written';
        } catch (e) {
          return e.name;
        }
      });
    })
  );
  assert.strictEqual(await late, 'TransactionInactiveError');
  assert.strictEqual((await ddbRead(db, ['a'])).a, undefined);
  // and a put that fails (storage full) aborts its whole transaction
  const full = fakeIDB({failPut: k => k === 'b'}),
    d2 = await ddbOpen(full, 'x');
  await assert.rejects(
    ddbTx(d2, 'readwrite', api => {
      api.put('a', 1);
      api.put('b', 2);
    })
  );
  assert.deepStrictEqual(await ddbRead(d2, ['a', 'b']), {a: undefined, b: undefined});
});

test('two tabs keep each other’s clicks, and a click reads no draft when no other tab wrote', async () => {
  const idb = fakeIDB(),
    A = await tab(idb, 'A', 'tok'),
    B = await tab(idb, 'B', 'tok');
  await A.click('p1', 3);
  await B.click('p2', 1); // B takes A's click in, in the same transaction as its own write
  assert.strictEqual(q(B, 'p1'), 3);
  await A.click('p3', 2);
  assert.strictEqual(q(A, 'p2'), 1);
  const v = await store(idb);
  assert.deepStrictEqual(JSON.parse(v.draft.j).quality, {p1: 3, p2: 1, p3: 2});
  // A's next click finds its own revision stored: it reads the state only (no draft parsed)
  let gets = 0;
  const real = A.db.transaction.bind(A.db);
  A.db.transaction = (...a) => {
    const t = real(...a),
      os = t.objectStore();
    const g = os.get;
    os.get = k => (k === 'draft' && gets++, g(k));
    return t;
  };
  await A.click('p4', 3);
  assert.strictEqual(gets, 0);
});

test('Sign out seals the draft: no plain draft or base left, only the same token opens it, and its unlock gets it back', async () => {
  const idb = fakeIDB(),
    A = await tab(idb, 'A', 'tok');
  await A.click('p1', 3);
  assert.deepStrictEqual(await A.T.seal(), {sealed: true});
  const v = await store(idb);
  assert.strictEqual(v.draft, undefined);
  assert.strictEqual(v.base, undefined);
  assert.strictEqual(await ddbPeek(idb, 'reefid-admin-draft'), null); // the site's ?draft preview sees nothing
  assert.strictEqual((await sealOf(idb, 'tok')).quality.p1, 3);
  const other = await tab(idb, 'O', 'another-token');
  assert.strictEqual(q(other, 'p1'), 2); // another token starts from the published curation
  assert.strictEqual(await sealOf(idb, 'another-token'), null);
  const R = await tab(idb, 'R', 'tok');
  assert.strictEqual(q(R, 'p1'), 3);
  assert.ok(R.L.draft);
  assert.strictEqual(await sealOf(idb, 'tok'), null); // opened: dropped
});

test('a tab of the signed-out token cannot write a plain draft back', async () => {
  const idb = fakeIDB(),
    A = await tab(idb, 'A', 'tok'),
    B = await tab(idb, 'B', 'tok');
  await A.click('p1', 3);
  await A.T.seal();
  // B never heard (a frozen tab): its next click is refused, nothing plain is stored, and it is told it was signed out
  const r = await B.click('p2', 1);
  assert.ok(r.refused);
  assert.strictEqual((await store(idb)).draft, undefined);
  assert.strictEqual(B.gone.length, 1);
  assert.ok(B.T.mine(B.gone[0]));
  // a second click is refused too, without asking the store
  assert.ok((await B.click('p3', 1)).refused);
  assert.strictEqual((await store(idb)).draft, undefined);
});

test('Codex 4507952650: a change of another tab of the token that never reached the store is sealed when it locks', async () => {
  for (const how of ['pending', 'failed']) {
    let full = false;
    const idb = fakeIDB({failPut: k => full && k === 'draft'}),
      A = await tab(idb, 'A', 'tok'),
      B = await tab(idb, 'B', 'tok');
    await A.click('p1', 3);
    await B.T.sync();
    if (how === 'pending')
      B.set('p9', 1); // a note typed in the last 0.8 s, flushed at the lock
    else {
      full = true;
      assert.ok((await B.click('p9', 1)).err); // its write failed (draftLost)
      full = false;
    }
    await A.T.seal();
    assert.ok((await B.T.sync()).refused);
    assert.deepStrictEqual(await B.T.intoSeal(), {kept: true});
    const s = await sealOf(idb, 'tok');
    assert.strictEqual(s.quality.p1, 3, how);
    assert.strictEqual(s.quality.p9, 1, how);
    assert.strictEqual((await store(idb)).draft, undefined, how);
  }
});

test('Codex 4507952650, two tabs locking at once: each one’s change goes into the one seal', async () => {
  const idb = fakeIDB(),
    GB = gates(),
    A = await tab(idb, 'A', 'tok'),
    B = await tab(idb, 'B', 'tok', GB),
    C = await tab(idb, 'C', 'tok');
  await A.click('p1', 3);
  await A.T.seal();
  B.set('p2', 1);
  C.set('p3', 1);
  assert.ok((await B.T.sync()).refused && (await C.T.sync()).refused);
  const h = GB.hold('encrypt'),
    pb = B.T.intoSeal(); // B's seal held while C seals its own change in
  await h.hit;
  await C.T.intoSeal();
  GB.release('encrypt');
  await pb;
  const s = await sealOf(idb, 'tok');
  assert.deepStrictEqual([s.quality.p1, s.quality.p2, s.quality.p3], [3, 1, 1]);
});

test('Codex 4507952652: opening a seal never drops another token’s seal written meanwhile', async () => {
  const idb = fakeIDB(),
    Y = await tab(idb, 'Y', 'tok-y');
  await Y.click('p1', 3);
  await Y.T.seal();
  // Y unlocks again; its decryption is held while X, another token, signs out with its own draft
  const G = gates(),
    hold = G.hold('decrypt'),
    Y2p = tab(idb, 'Y2', 'tok-y', G);
  await hold.hit;
  const X = await tab(idb, 'X', 'tok-x');
  await X.click('p2', 1);
  await X.T.seal();
  G.release('decrypt');
  const Y2 = await Y2p;
  assert.strictEqual(q(Y2, 'p1'), 3);
  assert.strictEqual((await sealOf(idb, 'tok-x')).quality.p2, 1);
});

test('Codex 4508298725: a change made while the seal is encrypted goes into the seal', async () => {
  const idb = fakeIDB(),
    G = gates(),
    A = await tab(idb, 'A', 'tok', G);
  await A.click('p1', 3);
  const h = G.hold('encrypt'),
    p = A.T.seal();
  await h.hit;
  A.set('p7', 1); // a note reaching the draft while the seal is encrypted
  G.release('encrypt');
  await p;
  const s = await sealOf(idb, 'tok');
  assert.strictEqual(s.quality.p7, 1);
  assert.strictEqual((await store(idb)).draft, undefined);
});

test('Codex 4508298733: a tab of another token keeps what it saved when this one signs out', async () => {
  const idb = fakeIDB(),
    A = await tab(idb, 'A', 'tok-a'),
    B = await tab(idb, 'B', 'tok-b');
  await B.click('p5', 1);
  await A.T.sync();
  await A.T.seal();
  const r = await B.T.sync();
  assert.ok(r.refused);
  assert.ok(!B.T.mine(r.refused)); // not its token: it carries on
  await B.T.carryOn(r.refused);
  const v = await store(idb);
  assert.strictEqual(JSON.parse(v.draft.j).quality.p5, 1);
  assert.ok(v.base);
  const B2 = await tab(idb, 'B2', 'tok-b');
  assert.strictEqual(q(B2, 'p5'), 1);
  // and its next clicks are written
  await B.click('p6', 3);
  assert.strictEqual(JSON.parse((await store(idb)).draft.j).quality.p6, 3);
});

test('Codex 4508810836: two tabs of one token signing out at once leave one seal with both tabs’ clicks, and nothing comes back later', async () => {
  const idb = fakeIDB(),
    GA = gates(),
    GB = gates(),
    A = await tab(idb, 'A', 'tok', GA),
    B = await tab(idb, 'B', 'tok', GB);
  await A.click('p1', 3);
  await B.click('p2', 1);
  await A.T.sync();
  A.set('p3', 3); // each with a change of its own not stored yet
  B.set('p4', 1);
  const ha = GA.hold('encrypt'),
    hb = GB.hold('encrypt'),
    pa = A.T.seal(),
    pb = B.T.seal();
  await Promise.all([ha.hit, hb.hit]);
  GA.release('encrypt');
  GB.release('encrypt');
  await Promise.all([pa, pb]);
  const s = await sealOf(idb, 'tok');
  assert.deepStrictEqual([s.quality.p1, s.quality.p2, s.quality.p3, s.quality.p4], [3, 1, 3, 1]);
  // the next unlock opens it; a Publish makes p3 published, then a sign-out with nothing to publish: no seal is left to
  // bring an obsolete choice back
  const C = await tab(idb, 'C', 'tok');
  assert.strictEqual(q(C, 'p3'), 3);
  C.saved = clone(C.draft);
  C.T.base();
  await C.T.sync();
  assert.deepStrictEqual(await C.T.seal(), {sealed: false});
  assert.strictEqual(await sealOf(idb, 'tok'), null);
});

test('Codex 4509175967: an Undo and a sign out in another tab while this one encrypts: the choice undone never comes back', async () => {
  const idb = fakeIDB(),
    GA = gates(),
    A = await tab(idb, 'A', 'tok', GA),
    B = await tab(idb, 'B', 'tok');
  await B.click('p1', 3);
  await A.T.sync(); // A holds the rating
  assert.strictEqual(q(A, 'p1'), 3);
  const h = GA.hold('encrypt'),
    pa = A.T.seal();
  await h.hit;
  B.draft = clone(B.saved); // B undoes it
  await B.T.sync();
  assert.deepStrictEqual(await B.T.seal(), {sealed: false}); // nothing left to publish: no seal
  GA.release('encrypt');
  await pa;
  assert.strictEqual(await sealOf(idb, 'tok'), null);
  const C = await tab(idb, 'C', 'tok');
  assert.strictEqual(q(C, 'p1'), 2);
});

test('Codex 4509175969: a seal replaced while it is opened: the newer one is opened, nothing of it lost', async () => {
  const idb = fakeIDB(),
    A = await tab(idb, 'A', 'tok'),
    B = await tab(idb, 'B', 'tok');
  await A.click('p1', 3);
  await B.T.sync();
  await A.T.seal();
  // C unlocks (decryption held) while B, which missed the sign out, seals a click of its own into the token's seal
  const G = gates(),
    h = G.hold('decrypt'),
    Cp = tab(idb, 'C', 'tok', G);
  await h.hit;
  assert.ok((await B.click('p8', 1)).refused);
  await B.T.intoSeal();
  G.release('decrypt');
  const C = await Cp;
  assert.strictEqual(q(C, 'p1'), 3);
  assert.strictEqual(q(C, 'p8'), 1);
  assert.strictEqual(await sealOf(idb, 'tok'), null);
});

test('Codex 4509429142: a clean sign out never clears a click another tab saved meanwhile', async () => {
  const idb = fakeIDB(),
    B = await tab(idb, 'B', 'tok');
  let A;
  // A sees nothing to publish; right then (before its sign out's transaction) B saves a click
  A = await tab(idb, 'A', 'tok', gates(), {
    hooks: {
      clean: (d, b) => {
        const c = canon(merge3(b, d, b)) === canon(merge3(b, b, b));
        if (c && !B.done) {
          B.done = true;
          B.click('p6', 1);
        }
        return c;
      }
    }
  });
  await A.T.seal();
  assert.strictEqual((await sealOf(idb, 'tok')).quality.p6, 1);
  assert.strictEqual((await store(idb)).draft, undefined);
});

test('Codex 4510374178: opening a seal writes the draft, its base and drops the seal all or nothing', async () => {
  let full = false;
  const idb = fakeIDB({failPut: k => full && k === 'base'}),
    A = await tab(idb, 'A', 'tok');
  await A.click('p1', 1);
  await A.T.seal();
  full = true;
  const B = await tab(idb, 'B', 'tok'); // its base cannot be written: nothing is, the seal stays
  full = false;
  assert.ok(B.L.failed);
  assert.strictEqual((await sealOf(idb, 'tok')).quality.p1, 1);
  assert.strictEqual((await store(idb)).base && JSON.parse((await store(idb)).draft.j).quality.p1, undefined);
  const C = await tab(idb, 'C', 'tok');
  assert.strictEqual(q(C, 'p1'), 1);
  assert.strictEqual(await sealOf(idb, 'tok'), null);
  const v = await store(idb);
  assert.ok(v.draft && v.base);
});

test('a second Sign out while the first seals leaves one seal and loses nothing', async () => {
  const idb = fakeIDB(),
    G = gates(),
    A = await tab(idb, 'A', 'tok', G);
  await A.click('p1', 3);
  const h = G.hold('encrypt'),
    p1 = A.T.seal();
  await h.hit;
  const p2 = A.T.seal();
  G.release('encrypt');
  await Promise.all([p1, p2]);
  assert.strictEqual((await sealOf(idb, 'tok')).quality.p1, 3);
  assert.strictEqual((await store(idb)).draft, undefined);
});

test('a seal of the token left from before is taken into the next sign out, never lost', async () => {
  const idb = fakeIDB(),
    A = await tab(idb, 'A', 'tok'),
    B = await tab(idb, 'B', 'tok');
  await A.click('p1', 3);
  await B.T.sync();
  await A.T.seal();
  const C = await tab(idb, 'C', 'tok'); // unlocks again: the seal opened into the plain draft
  // B missed it all: its click is refused and sealed into a new seal of the token, beside C's open session
  assert.ok((await B.click('p2', 1)).refused);
  await B.T.intoSeal();
  await C.click('p3', 3);
  await C.T.seal();
  const s = await sealOf(idb, 'tok');
  assert.deepStrictEqual([s.quality.p1, s.quality.p2, s.quality.p3], [3, 1, 3]);
});

test('the one-time move from localStorage: once, merged under a draft already stored, nothing lost', async () => {
  const idb = fakeIDB(),
    A = await tab(idb, 'A', null);
  A.T.unlock(await ddbKeys('tok', globalThis.crypto.subtle));
  const ls = {d: {...clone(SAVED0), quality: {p1: 3}}, b: clone(SAVED0)};
  assert.strictEqual(await A.T.migrate(ls), 'moved');
  let v = await store(idb);
  assert.strictEqual(JSON.parse(v.draft.j).quality.p1, 3);
  assert.deepStrictEqual(JSON.parse(v.base.j), SAVED0);
  // a second tab moving the same copy at the same moment changes nothing; an old page's later write is merged under
  assert.strictEqual(await A.T.migrate(ls), 'same');
  assert.strictEqual(await A.T.migrate({d: {...clone(SAVED0), quality: {p1: 3, p2: 1}}, b: clone(SAVED0)}), 'moved');
  v = await store(idb);
  assert.deepStrictEqual(JSON.parse(v.draft.j).quality, {p1: 3, p2: 1});
  // a failed move writes nothing (admin.js keeps the localStorage keys then, for the next start)
  const full = fakeIDB({failPut: () => true}),
    F = await tab(full, 'F', null);
  await assert.rejects(F.T.migrate(ls));
  assert.strictEqual((await store(full)).draft, undefined);
});

test('the ?draft preview reads the stored draft and never creates the database', async () => {
  const idb = fakeIDB();
  assert.strictEqual(await ddbPeek(idb, 'reefid-admin-draft'), null);
  assert.deepStrictEqual(Object.keys(idb.dbs), []);
  const A = await tab(idb, 'A', 'tok');
  await A.click('p1', 3);
  assert.strictEqual((await ddbPeek(idb, 'reefid-admin-draft')).quality.p1, 3);
});
