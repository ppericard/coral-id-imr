// The names a typed text can match, for the tests that sweep every name of fish.json against every other (test-suite
// audit, 2026-11-09): core.js typeMatchIn reads a text against each name with an edit distance (typeDist), so a sweep of
// N texts over N names costs N² distances (80 s in tests/fishcommon.test.js, 35 s in tests/typedrej.test.js).
// near(names)(t) keeps the names that may be within the spelling tolerance of key t, and typeMatchIn on them returns
// exactly what it returns on all of them:
// - a name it drops is more than D edits from t (D: TYPE.tol's largest tolerance, 2), so typeMatchIn's own filter
//   (d <= TYPE.tol(k.length) <= D) drops it too; a name it keeps may still be beyond, and typeMatchIn drops it then;
// - an edit changes a word's length by at most 1 and its letter counts by at most 2 in all (an insertion or a deletion
//   1, a substitution 2, a swap of two neighbours 0), so a name within D edits differs from t by at most D in length
//   and 2D in letter counts: the two bounds near tests, on names bucketed by length once;
// - the names it keeps stay in their order, so typeMatchIn's stable sort, its ties and its {near} come out the same.
// Keys are typeNorm's or typeNormAll's (letters a-z); a key with another sign is always kept, never wrongly dropped.
// The files that use it compare it with typeMatchIn on a sample; on every name of the sweep and four slips of each
// (28,352 texts), the two agreed on all of them (2026-11-09).
const C = require('../core.js');
// The largest tolerance TYPE.tol gives any name (2 today), whatever its shape.
const D = Math.max(...Array.from({length: 200}, (_, n) => C.TYPE.tol(n)), C.TYPE.tol(Infinity));

// A key's letter counts, null for a key with another sign.
const counts = k => {
  const c = new Int16Array(26);
  for (let i = 0; i < k.length; i++) {
    const x = k.charCodeAt(i) - 97;
    if (x < 0 || x > 25) return null;
    c[x]++;
  }
  return c;
};
const apart = (a, b) => {
  let s = 0;
  for (let i = 0; i < 26; i++) s += Math.abs(a[i] - b[i]);
  return s;
};

// names: [{k, ...}] as typeMatchIn takes them (key: how to read an entry's key, for a list of plain strings).
// Returns t => the entries that may be within D edits of key t, in their order in names.
function near(names, key = x => x.k) {
  const byLen = new Map(),
    odd = [];
  names.forEach((x, i) => {
    const k = String(key(x) || ''),
      c = counts(k);
    if (!c) return odd.push(i);
    if (!byLen.has(k.length)) byLen.set(k.length, []);
    byLen.get(k.length).push([i, c]);
  });
  return t => {
    const c = counts(t);
    if (!c) return names;
    const keep = [...odd];
    for (let n = t.length - D; n <= t.length + D; n++) (byLen.get(n) || []).forEach(([i, ci]) => apart(c, ci) <= 2 * D && keep.push(i));
    return keep.sort((a, b) => a - b).map(i => names[i]);
  };
}

// typeMatchIn(names, text, norm), the same answer from the names near the text only.
function matcher(names, norm) {
  const N = near(names);
  return text => C.typeMatchIn(N(norm(text)), text, norm);
}

module.exports = {near, matcher};
