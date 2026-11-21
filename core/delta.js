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

