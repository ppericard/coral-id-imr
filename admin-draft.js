// IMR Reef ID: the admin's draft store (Pierre, 2026-11-18: "model B" of the sign-out seal; the design note
// docs/reviews/2026-11-09-admin-signout-seal.md).
// The whole unpublished draft lives in one IndexedDB object store, and every read-modify-write of it is one readwrite
// transaction: a click's write (with the merge of another admin tab's clicks), Sign out's seal, a seal opened at unlock,
// the one-time move from localStorage. The browser runs the readwrite transactions of one store one after another, across
// tabs, and applies each all or nothing, so a seal can no longer be split by another tab's click, seal or unseal: each of
// the six review rounds of #798 found such a split over localStorage, which has no transaction.
// Records (keys of the one store):
//   state     {gen, rev, bid, outs}: gen, the generation, one more at every sign-out (a tab of an older one has every write
//             refused: its token was signed out, or the draft left with another token's seal); rev, the revision of the
//             draft stored; bid, the id of the base stored; outs, {token mark: the generation its last sign-out opened}.
//   draft     {j, rev, seen}: the draft's JSON, its revision (`<tab>.<n>`), and the revision its writer had last seen (the
//             merge base when two tabs clicked: core.js takeTab).
//   base      {j, id}: the published curation the draft was made on.
//   seal:<m>  {m, id, iv, ct, t}: the draft and its base sealed at a sign-out, AES-GCM under a key derived from the token
//             (SHA-256 of 'reefid-admin-draft|' + token); m, the token's mark (a SHA-256 of 'reefid-admin-mark|' + token,
//             never the token). One seal per token: a seal replaces the token's earlier one only if it is still the one
//             read, and an unseal drops only the one it opened.
// crypto.subtle, and any other promise, runs outside a transaction (a transaction ends as soon as its task yields with
// no request pending): a seal is encrypted first, then written by a transaction that checks nothing moved meanwhile (the
// generation, the draft's revision, the seal's id) and goes round again otherwise.
// Loaded by admin.html; tests/admindraft.test.js runs it in Node over a stand-in IndexedDB (tests/fakeidb.js).
(function (root) {
  const STORE = 'draft',
    SEAL = m => 'seal:' + m,
    TRIES = 25;

  function ddbOpen(idb, name) {
    return new Promise((ok, ko) => {
      let r;
      try {
        r = idb.open(name, 1);
      } catch (e) {
        return ko(e);
      }
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ko(r.error || new Error('indexedDB open failed'));
    });
  }
  // One transaction. step(api) runs in it, synchronously, and so does every callback given to api.get: api.get(keys, cb)
  // reads the keys and calls cb({key: value}); api.put(k, v) and api.del(k) write; api.out is what the promise resolves
  // with once the transaction has committed. It rejects when the transaction fails: then nothing of it was written.
  function ddbTx(db, mode, step) {
    return new Promise((ok, ko) => {
      let t,
        err = null;
      try {
        t = db.transaction(STORE, mode);
      } catch (e) {
        return ko(e);
      }
      const s = t.objectStore(STORE),
        fail = e => {
          err = err || e;
          try {
            t.abort();
          } catch (x) {}
        },
        api = {
          out: undefined,
          get(keys, cb) {
            const v = {};
            let left = keys.length;
            const done = () => {
              try {
                cb(v);
              } catch (e) {
                fail(e);
              }
            };
            if (!left) return done();
            keys.forEach(k => {
              const q = s.get(k);
              q.onsuccess = () => {
                v[k] = q.result;
                if (!--left) done();
              };
            });
          },
          put: (k, v) => s.put(v, k),
          del: k => s.delete(k)
        };
      t.oncomplete = () => ok(api.out);
      t.onabort = t.onerror = () => ko(err || t.error || new Error('transaction failed'));
      try {
        step(api);
      } catch (e) {
        fail(e);
      }
    });
  }
  const ddbRead = (db, keys) => ddbTx(db, 'readonly', api => api.get(keys, v => (api.out = v)));

  const b64 = u => {
    let s = '';
    const a = new Uint8Array(u);
    for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
    return btoa(s);
  };
  // The token's key and mark, derived once per unlock.
  async function ddbKeys(token, subtle) {
    const enc = new TextEncoder(),
      h = await subtle.digest('SHA-256', enc.encode('reefid-admin-draft|' + token)),
      m = await subtle.digest('SHA-256', enc.encode('reefid-admin-mark|' + token));
    return {key: await subtle.importKey('raw', h, 'AES-GCM', false, ['encrypt', 'decrypt']), mark: b64(m).slice(0, 22)};
  }
  const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  // A seal of {j: the draft's JSON, b: its base's JSON}, and the opening of one (throws for another token's key).
  async function sealRec(subtle, K, o) {
    const iv = crypto.getRandomValues(new Uint8Array(12)),
      ct = await subtle.encrypt({name: 'AES-GCM', iv}, K.key, new TextEncoder().encode(JSON.stringify(o)));
    return {m: K.mark, id: rid(), iv, ct, t: Date.now()};
  }
  async function openRec(subtle, K, x) {
    const o = JSON.parse(new TextDecoder().decode(await subtle.decrypt({name: 'AES-GCM', iv: x.iv}, K.key, x.ct)));
    if (!o || typeof o.j !== 'string') throw new Error('not a draft');
    return o;
  }

  // One admin tab's side of the store. o:
  //   db                   the open database (ddbOpen)
  //   tab                  this tab's id
  //   subtle               crypto.subtle (the tests hold its encryption and decryption, to open the windows the reviews found)
  //   snap() / draft()     the draft in memory, as JSON and as the object (admin.js snap and DRAFT, kept in step)
  //   saved()              the published curation it is made on (SAVED)
  //   adopt(d)             this tab's draft becomes d (another tab's clicks merged in)
  //   adoptBase(c)         another tab published: c is the new base
  //   merge(shared, mine, other)  two tabs' merge (core.js mergeTabs with admin.js's reconciles): {draft, share, changed}
  //   clean(d, b)          true when draft d holds nothing unpublished over base b
  //   rebase({d, b})       a sealed draft d made on base b, re-based on the published curation (as an unlock does)
  //   post(msg)            tells the other tabs (BroadcastChannel): a hint only, every write checks the store itself
  //   gone(state)          a write was refused: the store was sealed since this tab last wrote (a sign-out in another tab)
  function ddbTab(o) {
    const T = {
      gen: 0, // the generation this tab writes in
      seen: null, // the revision of the stored draft this tab last wrote or took in
      storedJ: null, // the draft that revision holds, as this tab's JSON when the two are the same draft
      bid: null, // the base this tab last wrote or took in
      baseDirty: false, // SAVED changed here (a Publish, a rebase, the start): written with the next draft
      baseN: 0, // how many times it changed: a write clears baseDirty only if no change came after the base it stored
      n: 0,
      revs: {}, // revision → JSON: the drafts this tab wrote or took in (the merge base when another tab writes on one)
      K: null, // {key, mark} of the token, once unlocked
      busy: null,
      again: false,
      lost: false, // the last write failed (storage full, IndexedDB gone): beforeunload warns
      out: null, // the state that refused a write, or this tab's own sign-out: nothing is written any more
      ready: false // load() done: before it, this tab knows no generation and writes nothing (Codex review #1078)
    };
    const keep = (rev, j) => {
      T.revs[rev] = j;
      const k = Object.keys(T.revs);
      if (k.length > 200) k.slice(0, 50).forEach(x => delete T.revs[x]);
    };
    const parsed = rev => (typeof T.revs[rev] === 'string' ? JSON.parse(T.revs[rev]) : null);
    const newRev = () => `${o.tab}.${++T.n}`;
    // Another tab's stored draft taken in, against the draft both last agreed on; the draft in memory may change.
    function takeIn(rec) {
      const m = o.merge(parsed(rec.seen) || o.saved(), o.draft(), JSON.parse(rec.j));
      keep(rec.rev, rec.j);
      T.seen = rec.rev;
      if (m.changed) o.adopt(m.draft);
      // The same draft as stored (nothing of this tab's on top): nothing to write back, whatever its JSON's key order.
      T.storedJ = m.share ? rec.j : o.snap();
      return m;
    }
    // A click's write, and the take-in of another tab's, in one transaction: the state read first; another generation
    // refuses; the draft read only when another tab stored one since (most clicks parse nothing: performance pass,
    // 2026-11-09), the base only when another tab published; then this tab's draft written if the store does not hold it.
    function writeTx() {
      return ddbTx(o.db, 'readwrite', api =>
        api.get(['state'], ({state}) => {
          const S = state || {gen: 0};
          if ((S.gen || 0) !== T.gen) return (api.out = {refused: S});
          const nb = !!S.bid && S.bid !== T.bid && !T.baseDirty,
            nd = !!S.rev && S.rev !== T.seen;
          api.get([...(nb ? ['base'] : []), ...(nd ? ['draft'] : [])], v => {
            if (nb && v.base) {
              T.bid = v.base.id;
              o.adoptBase(JSON.parse(v.base.j));
            }
            const took = nd && v.draft ? takeIn(v.draft) : null,
              j = o.snap();
            if (S.rev && j === T.storedJ && !T.baseDirty && S.bid) return (api.out = {took});
            const rev = newRev(),
              N = {...S, gen: T.gen, rev};
            api.put('draft', {j, rev, seen: S.rev || null});
            let bn = null;
            if (T.baseDirty || !S.bid) {
              N.bid = rid();
              bn = T.baseN;
              api.put('base', {j: JSON.stringify(o.saved()), id: N.bid});
            }
            api.put('state', N);
            api.out = {took, rev, j, bid: N.bid, bn};
          });
        })
      );
    }
    // Writes the draft in memory (and the base when it changed), one write at a time: clicks made while one is on its way
    // go in the next. Resolves once what was in memory at the call is stored (or refused, or failed).
    T.sync = () => {
      if (!T.ready) return Promise.resolve({early: true});
      if (T.out) return Promise.resolve({refused: T.out});
      if (T.busy) {
        T.again = true;
        return T.busy;
      }
      T.busy = (async () => {
        let r;
        do {
          T.again = false;
          try {
            r = await writeTx();
            T.lost = false;
          } catch (e) {
            T.lost = true;
            r = {err: e};
          }
          if (r.rev) {
            keep(r.rev, r.j);
            T.seen = r.rev;
            T.storedJ = r.j;
            T.bid = r.bid;
            // A Publish or rebase made while this write was on its way stays to write (Codex review #1078).
            if (r.bn === T.baseN) T.baseDirty = false;
            o.post({t: 'w'});
          }
          if (r.refused) T.out = r.refused;
        } while (T.again && !r.err && !r.refused);
        T.busy = null;
        if (r.refused) o.gone(r.refused);
        return r;
      })();
      return T.busy;
    };
    T.base = () => {
      T.baseDirty = true;
      T.baseN++;
    };
    // True when this tab's token signed out (in another tab) after this tab last wrote: it must lock.
    T.mine = S => !!T.K && ((S && S.outs) || {})[T.K.mark] > T.gen;
    // What the store holds at the start, the token's seal opened into it: {old, base} (the plain draft and its base, as
    // stored), or {draft} when a seal was opened, join(plain, sealed) being the draft then written ({d, b} each, the
    // plain one null when there is none; join runs in the transaction, on the plain draft as it is then). The seal goes
    // in the same transaction that writes the draft and its base (Codex review #798: a draft kept without its base, or
    // a seal dropped that was not the one opened, lost work), so all of it is written or none.
    T.load = async join => {
      for (let i = 0; i < TRIES; i++) {
        const k = T.K ? SEAL(T.K.mark) : null,
          v = await ddbRead(o.db, ['state', 'draft', 'base', ...(k ? [k] : [])]),
          S = v.state || {gen: 0},
          cur = k && v[k];
        let p = null;
        if (cur)
          try {
            p = await openRec(o.subtle, T.K, cur);
          } catch (e) {} // not openable with this token's key: left as it is
        let r = null,
          failed = null;
        if (p)
          try {
            r = await ddbTx(o.db, 'readwrite', api =>
              api.get(['state', 'draft', 'base', k], x => {
                const S2 = x.state || {gen: 0},
                  c2 = x[k];
                if (!c2 || c2.id !== cur.id) return (api.out = null); // replaced meanwhile (another tab's sign-out): again
                const d = join(x.draft ? {d: JSON.parse(x.draft.j), b: x.base ? JSON.parse(x.base.j) : null} : null, {
                    d: JSON.parse(p.j),
                    b: p.b ? JSON.parse(p.b) : null
                  }),
                  j = JSON.stringify(d),
                  rev = newRev(),
                  bid = rid();
                api.put('draft', {j, rev, seen: x.draft ? x.draft.rev : null});
                api.put('base', {j: JSON.stringify(o.saved()), id: bid});
                api.del(k);
                api.put('state', {...S2, gen: S2.gen || 0, rev, bid});
                api.out = {d, j, rev, bid, gen: S2.gen || 0, plain: !!x.draft};
              })
            );
            if (!r) continue;
          } catch (e) {
            failed = e; // storage full: nothing of it written, the seal stays for the next unlock (or this tab's sign out)
          }
        if (r) {
          T.gen = r.gen;
          keep(r.rev, r.j);
          T.seen = r.rev;
          T.storedJ = r.j;
          T.bid = r.bid;
          T.ready = true;
          return {draft: r.d, plain: r.plain};
        }
        T.gen = S.gen || 0;
        T.ready = true;
        T.bid = (v.base && v.base.id) || null;
        if (v.draft) {
          keep(v.draft.rev, v.draft.j);
          T.seen = v.draft.rev;
          T.storedJ = v.draft.j;
        }
        return {
          old: v.draft ? JSON.parse(v.draft.j) : null,
          base: v.base ? JSON.parse(v.base.j) : null,
          unopened: !!cur,
          failed
        };
      }
      throw new Error('the sealed draft kept changing');
    };
    // Sign out: the draft as stored sealed with the token, the plain draft and its base taken off, and the generation
    // moved on, in one transaction, only if nothing moved since the draft was read (a click of another tab, an Undo, a
    // seal of this token): otherwise it goes round again. A draft with nothing unpublished is no seal: it is only taken
    // off (rule A1: nothing unpublished is ever cleared). A seal of this token left from before (one an unlock could not
    // open) is taken in first, then replaced. Resolves {sealed}; throws when it cannot (no key, storage full).
    T.seal = async () => {
      if (!T.K) throw new Error('no key');
      const k = SEAL(T.K.mark),
        taken = new Set();
      for (let i = 0; i < TRIES; i++) {
        const r = await T.sync();
        // This token signed out in another tab meanwhile: what this tab holds goes into that seal. Another token's sign out
        // only moved the generation on: this tab's draft is written back in it, then sealed (Codex review #1078).
        if (r.refused) {
          if (T.mine(r.refused)) return T.intoSeal();
          await T.carryOn(r.refused);
          continue;
        }
        if (r.err) throw r.err;
        const v = await ddbRead(o.db, ['state', k]),
          S = v.state || {gen: 0},
          old = v[k] || null;
        if ((S.gen || 0) !== T.gen || S.rev !== T.seen) continue;
        if (old && !taken.has(old.id)) {
          taken.add(old.id);
          const p = await openRec(o.subtle, T.K, old).catch(() => null);
          if (p) {
            // re-based on the published curation first, as an unlock does (Codex review #1078)
            const m = o.merge(
              o.saved(),
              o.draft(),
              o.rebase ? o.rebase({d: JSON.parse(p.j), b: p.b ? JSON.parse(p.b) : null}) : JSON.parse(p.j)
            );
            if (m.changed) o.adopt(m.draft);
          }
          continue;
        }
        const j = o.snap(),
          rev = T.seen;
        if (j !== T.storedJ) continue; // a change in memory not stored yet
        const saved = o.saved(),
          rec = o.clean(JSON.parse(j), saved) ? null : await sealRec(o.subtle, T.K, {j, b: JSON.stringify(saved)});
        const done = await ddbTx(o.db, 'readwrite', api =>
          api.get(['state', k], x => {
            const S2 = x.state || {gen: 0},
              c2 = x[k] || null;
            if ((S2.gen || 0) !== T.gen || S2.rev !== rev || (c2 && c2.id) !== (old && old.id) || o.snap() !== j) return (api.out = false);
            api.del('draft');
            api.del('base');
            if (rec) api.put(k, rec);
            else api.del(k);
            const gen = T.gen + 1;
            api.put('state', {gen, rev: null, bid: null, outs: {...(S2.outs || {}), [T.K.mark]: gen}});
            api.out = true;
          })
        );
        if (!done) continue;
        T.gen++;
        T.out = {gen: T.gen};
        o.post({t: 's'});
        return {sealed: !!rec};
      }
      throw new Error('the draft kept changing');
    };
    // This tab's token signed out in another tab. What this tab holds that never reached the store (a click whose write
    // was refused or failed, a note flushed at the lock) goes into the token's seal: the seal opened, this tab's changes
    // merged on it against the draft this tab last stored, sealed again, written only if the seal is still the one read
    // (Codex review #798: a note typed in another tab, two tabs of one token signing out at once). With no seal (a sign
    // out with nothing to seal, or one an unlock opened since), a seal of this tab's draft. Resolves {kept}.
    T.intoSeal = async () => {
      if (!T.K) throw new Error('no key');
      const k = SEAL(T.K.mark);
      for (let i = 0; i < TRIES; i++) {
        const j = o.snap();
        if (j === T.storedJ) return {kept: true}; // all of it was stored before the seal, which holds it
        // Only this tab's changes since it last stored are carried: onto the seal, or with no seal (a sign out with nothing
        // to seal, or one an unlock opened since) onto the plain draft stored now or else the published curation, never
        // this tab's whole draft, which may hold a choice another tab undid since (Codex review #1078).
        const v = await ddbRead(o.db, [k, 'draft']),
          cur = v[k] || null,
          p = cur ? await openRec(o.subtle, T.K, cur) : null,
          onto = p ? JSON.parse(p.j) : v.draft ? JSON.parse(v.draft.j) : o.saved(),
          d = o.merge(parsed(T.seen) || o.saved(), o.draft(), onto).draft,
          rec = await sealRec(o.subtle, T.K, {j: JSON.stringify(d), b: p ? p.b : JSON.stringify(o.saved())});
        const done = await ddbTx(o.db, 'readwrite', api =>
          api.get([k], x => {
            if (((x[k] && x[k].id) || null) !== ((cur && cur.id) || null) || o.snap() !== j) return (api.out = false);
            api.put(k, rec);
            api.out = true;
          })
        );
        if (done) {
          T.storedJ = j;
          return {kept: true};
        }
      }
      throw new Error('the seal kept changing');
    };
    // After another token's sign-out (or when this tab's changes could not be sealed): this tab, still unlocked, writes
    // its draft and its base in the new generation (Codex review #798: its own saved clicks must not leave with the
    // other token's seal).
    T.carryOn = S => {
      T.gen = (S && S.gen) || 0;
      T.out = null;
      T.seen = null;
      T.storedJ = null;
      T.baseDirty = true;
      return T.sync();
    };
    // The one-time move of a draft kept in localStorage before this store (rule W3; admin.js draftMove): {d, b}, merged
    // under a draft already here (another tab moved it, or an admin page of the old version wrote it since).
    T.migrate = ls =>
      ddbTx(o.db, 'readwrite', api =>
        api.get(['state', 'draft'], x => {
          const S = x.state || {gen: 0};
          let d = ls.d;
          if (x.draft) {
            const m = o.merge(ls.b || o.saved(), JSON.parse(x.draft.j), ls.d);
            if (!m.changed) return (api.out = 'same');
            d = m.draft;
          }
          const rev = newRev(),
            N = {...S, gen: S.gen || 0, rev};
          api.put('draft', {j: JSON.stringify(d), rev, seen: x.draft ? x.draft.rev : null});
          if (!x.draft) {
            N.bid = ls.b ? rid() : null;
            if (ls.b) api.put('base', {j: JSON.stringify(ls.b), id: N.bid});
            else api.del('base');
          }
          api.put('state', N);
          api.out = 'moved';
        })
      );
    T.unlock = K => {
      T.K = K;
    };
    return T;
  }

  // The site's ?draft preview (app.js curation): the stored draft, or null (no store, no draft, or a sealed one). Never
  // creates the database.
  function ddbPeek(idb, name) {
    return new Promise(ok => {
      try {
        const r = idb.open(name);
        r.onupgradeneeded = () => r.transaction.abort();
        r.onerror = () => ok(null);
        r.onsuccess = () => {
          const db = r.result;
          ddbRead(db, ['draft'])
            .then(v => ok(v.draft ? JSON.parse(v.draft.j) : null))
            .catch(() => ok(null))
            .finally(() => db.close());
        };
      } catch (e) {
        ok(null);
      }
    });
  }

  const API = {ddbOpen, ddbTx, ddbRead, ddbKeys, ddbTab, ddbPeek, sealRec, openRec, SEAL, STORE};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);
