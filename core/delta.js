  // Lighter saves (docs/ARCHITECTURE.md "Lighter saves on slow lines"; sync.js syncOnce, Code.gs doPost_): a
  // device that knows the saved copy at the revision it saves against sends only what changed since (dataDelta), and the
  // sheet rebuilds the whole copy from its own (dataPatch), keeping it only if it is exactly the copy the device holds
  // (dataSum, checked by both sides on the same spelling). A player's data is {key: the JSON text of its value}.
  const plain = o => !!o && typeof o === 'object' && !Array.isArray(o);
  const jsonOf = s => {
    if (typeof s !== 'string') return undefined;
    try {
      return JSON.parse(s);
    } catch (e) {
      return undefined;
    }
  };
  // A key's value in one spelling whatever the order of its keys: its JSON read and spelled with every object's keys sorted
  // (canon, below), a text that is not JSON as it is.
  const valCanon = s => {
    const v = jsonOf(s);
    return v === undefined ? 's' + String(s) : 'j' + canon(v);
  };
  // Two texts of one key that say the same (a copy the sheet rebuilt from a delta spells its keys in its own order).
  const sameText = (a, b) => a === b || (typeof a === 'string' && typeof b === 'string' && valCanon(a) === valCanon(b));
  // The checksum of a player's data: a 53-bit hash of every key and its value's canon (cyrb53), with its length.
  function dataSum(d) {
    const t = Object.keys(d || {})
      .sort()
      .map(k => JSON.stringify(k) + '=' + valCanon(d[k]))
      .join('\u0000');
    return hash53(t) + '.' + t.length.toString(36);
  }
  // A 53-bit hash of text t (cyrb53), in base 36.
  function hash53(t) {
    let h1 = 0xdeadbeef,
      h2 = 0x41c6ce57;
    for (let i = 0; i < t.length; i++) {
      const c = t.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  // What changed from base to now, key by key: null for a key gone, the new text for a key replaced, and for a key whose
  // value is an object on both sides (a subject's progress: one record per unit), {p: the entries changed, d: the ones
  // gone} when that is shorter than the text itself.
  function dataDelta(base, now) {
    const out = {};
    base = base || {};
    now = now || {};
    Object.keys(base).forEach(k => !(k in now) && (out[k] = null));
    Object.keys(now).forEach(k => {
      if (base[k] === now[k]) return;
      const a = jsonOf(base[k]),
        b = jsonOf(now[k]);
      if (plain(a) && plain(b)) {
        const p = {},
          d = Object.keys(a).filter(u => !(u in b));
        Object.keys(b).forEach(u => JSON.stringify(a[u]) !== JSON.stringify(b[u]) && (p[u] = b[u]));
        const o = d.length ? {p, d} : {p};
        if (JSON.stringify(o).length < String(now[k]).length) return void (out[k] = o);
      }
      out[k] = now[k];
    });
    return out;
  }
  // base with delta applied (dataDelta); null when the delta does not fit it (a patch on a key that is not an object).
  function dataPatch(base, delta) {
    const out = {...(base || {})};
    if (!plain(delta)) return null;
    for (const k of Object.keys(delta)) {
      const x = delta[k];
      if (x === null) delete out[k];
      else if (typeof x === 'string') out[k] = x;
      else if (plain(x) && plain(x.p) && (x.d === undefined || Array.isArray(x.d))) {
        const v = jsonOf(out[k]);
        if (!plain(v) || Object.keys(x.p).includes('__proto__')) return null;
        (x.d || []).forEach(u => delete v[String(u)]);
        Object.keys(x.p).forEach(u => (v[u] = x.p[u]));
        out[k] = JSON.stringify(v);
      } else return null;
    }
    return out;
  }

  // The answer log's lean reply (docs/spec/sync.md "The lean answer log"; Code.gs answers_ with lean, admin.js leanOn):
  // the rows of the admin's readAnswers, column by column, each column in the shortest of a few spellings, so the reply
  // is about half the bytes and the admin gets back exactly the rows JSON would have given it (rowsUnpack). Generic: no
  // column is named, so a column added to the rows needs nothing here. A column is one of
  //   {p: gaps, v: column}    mostly null: the gaps between the values that are not null, then those values;
  //   {d: deltas}             whole numbers, none null, as the difference from the one before (the times);
  //   {s: 10|100|1000, r}     numbers (or null) that are whole once times s (seconds, expectations, abilities);
  //   {k: values, i: indexes} few distinct values (names, ids, units, modes), the most frequent first;
  //   {t: words, l: column, i: indexes}   texts of space-separated words (photos, choices): l each text's word count;
  //   {o: keys, c: [column]}  objects of plain values (the scoring record): one column per key, null where absent;
  //   {r: values}             anything else, as it is.
  // rowsPack(rows) → {f: 1, n, w, c: [column], l?: column of the row lengths when they differ}, null when the rows are
  // not arrays (the reply then keeps its rows).
  const LEAN_F = 1;
  const leanCell = x =>
    x === undefined || typeof x === 'function' || typeof x === 'symbol' || (typeof x === 'number' && !isFinite(x)) ? null : x === 0 ? 0 : x;
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  // The kept keys of an object as JSON writes it: its own keys whose value is written; null when the object cannot go in
  // an object column (no key left, a null value that would read as absent, a __proto__ key).
  const leanKeys = o => {
    const K = Object.keys(o).filter(k => {
      const v = o[k];
      return v !== undefined && typeof v !== 'function' && typeof v !== 'symbol';
    });
    return K.length && !K.includes('__proto__') && K.every(k => leanCell(o[k]) !== null) ? K : null;
  };
  // Values by how often they come, the most frequent first, and each one's index: {k, i}.
  function leanDict(V) {
    const C = new Map();
    for (const x of V) C.set(x, (C.get(x) || 0) + 1);
    const k = [...C.keys()].sort((a, b) => C.get(b) - C.get(a)),
      ix = new Map(k.map((x, j) => [x, j])),
      i = new Array(V.length);
    for (let j = 0; j < V.length; j++) i[j] = ix.get(V[j]);
    return {k, i};
  }
  function leanCol(V0) {
    const n = V0.length,
      V = new Array(n);
    let nul = 0,
      num = true,
      int = true,
      prim = true,
      str = true,
      space = false;
    for (let j = 0; j < n; j++) {
      const x = (V[j] = leanCell(V0[j]));
      if (x === null) {
        nul++;
        str = false;
        continue;
      }
      const t = typeof x;
      if (t !== 'number') num = int = false;
      else if (int && !Number.isSafeInteger(x)) int = false;
      if (t !== 'string') str = false;
      else if (!space && x.indexOf(' ') >= 0) space = true;
      if (t === 'object') prim = false;
    }
    if (nul * 2 > n) {
      const p = [],
        P = [];
      let last = -1;
      for (let j = 0; j < n; j++) if (V[j] !== null) (p.push(j - last - 1), P.push(V[j]), (last = j));
      return {p, v: leanCol(P)};
    }
    if (num && int) {
      if (!nul && n > 1) {
        const D = new Array(n);
        D[0] = V[0];
        for (let j = 1; j < n; j++) D[j] = V[j] - V[j - 1];
        if (D.every(Number.isSafeInteger) && JSON.stringify(D).length < 0.8 * JSON.stringify(V).length) return {d: D};
      }
      return {r: V};
    }
    if (num) {
      for (const s of [10, 100, 1000]) {
        const R = new Array(n);
        let j = 0;
        for (; j < n; j++) {
          const x = V[j];
          if (x === null) R[j] = null;
          else if (!Number.isSafeInteger((R[j] = Math.round(x * s))) || R[j] / s !== x) break;
        }
        if (j === n) return {s, r: R};
      }
      return {r: V};
    }
    if (prim) {
      const D = leanDict(V);
      // Texts too many to list whole (photos, choices) go word by word when that lists fewer.
      if (str && space && D.k.length >= 256) {
        const l = new Array(n),
          F = [];
        for (let j = 0; j < n; j++) {
          const W = V[j].split(' ');
          l[j] = W.length;
          for (const w of W) F.push(w);
        }
        const T = leanDict(F);
        if (T.k.length < D.k.length) return {t: T.k, l: leanCol(l), i: T.i};
      }
      return D.k.length * 2 <= n || D.k.length < 64 ? D : {r: V};
    }
    const KS = V.map(x => (x === null ? [] : plain(x) ? leanKeys(x) : null)),
      o = KS.every(Boolean) ? leanOrder(KS) : null;
    return o ? {o, c: o.map(k => leanCol(V.map(x => (x !== null && own(x, k) ? x[k] : null))))} : {r: V};
  }
  // One order of the keys that keeps each object's own (so every object comes back with its keys in its order), the
  // first seen first where nothing decides; null when the objects disagree (an object column is then not used).
  function leanOrder(KS) {
    const seen = [],
      after = new Map(),
      before = new Map();
    KS.forEach(K =>
      K.forEach((k, i) => {
        if (!after.has(k)) (seen.push(k), after.set(k, new Set()), before.set(k, 0));
        const p = K[i - 1];
        if (i && !after.get(p).has(k)) (after.get(p).add(k), before.set(k, before.get(k) + 1));
      })
    );
    const o = [];
    for (let left = seen.slice(); left.length;) {
      const k = left.find(x => !before.get(x));
      if (k === undefined) return null;
      o.push(k);
      left.splice(left.indexOf(k), 1);
      after.get(k).forEach(x => before.set(x, before.get(x) - 1));
    }
    return o;
  }
  function rowsPack(rows) {
    if (!Array.isArray(rows) || !rows.every(Array.isArray)) return null;
    const n = rows.length,
      w = rows.reduce((m, r) => Math.max(m, r.length), 0),
      out = {f: LEAN_F, n, w, c: []};
    for (let j = 0; j < w; j++) out.c.push(leanCol(rows.map(r => (j < r.length ? r[j] : null))));
    if (rows.some(r => r.length !== w)) out.l = leanCol(rows.map(r => r.length));
    return out;
  }
  // One column back (rowsPack), n values; throws on a spelling it does not know.
  function leanOut(c, n) {
    if (!plain(c)) throw new Error('lean column');
    if (c.p) {
      const out = new Array(n).fill(null),
        P = leanOut(c.v, c.p.length);
      let i = -1;
      for (let j = 0; j < c.p.length; j++) out[(i += c.p[j] + 1)] = P[j];
      return out;
    }
    if (c.d) {
      let a = 0;
      return c.d.map(x => (a += x));
    }
    if (c.s) return c.r.map(x => (x === null ? null : x / c.s));
    if (c.r) return c.r;
    if (c.t) {
      const L = leanOut(c.l, n),
        out = new Array(n);
      let k = 0;
      for (let i = 0; i < n; i++) {
        let s = c.t[c.i[k++]];
        for (let j = 1; j < L[i]; j++) s += ' ' + c.t[c.i[k++]];
        out[i] = s;
      }
      return out;
    }
    if (c.k) return c.i.map(x => c.k[x]);
    if (c.o) {
      const S = c.c.map(x => leanOut(x, n)),
        out = new Array(n);
      for (let i = 0; i < n; i++) {
        let o = null;
        for (let j = 0; j < c.o.length; j++) if (S[j][i] !== null) (o = o || {})[c.o[j]] = S[j][i];
        out[i] = o;
      }
      return out;
    }
    throw new Error('lean column');
  }
  // The rows of a lean reply (rowsPack), exactly as JSON would have given them; throws on a reply it cannot read (another
  // spelling version f, a column of another length).
  function rowsUnpack(L) {
    if (!plain(L) || L.f !== LEAN_F || !Array.isArray(L.c) || L.c.length !== L.w) throw new Error('lean reply');
    const n = L.n,
      C = L.c.map(c => leanOut(c, n)),
      ln = L.l ? leanOut(L.l, n) : null,
      rows = new Array(n);
    if (C.some(c => c.length !== n)) throw new Error('lean reply');
    for (let i = 0; i < n; i++) {
      const w = ln ? ln[i] : L.w,
        r = new Array(w);
      for (let j = 0; j < w; j++) r[j] = C[j][i];
      rows[i] = r;
    }
    return rows;
  }

