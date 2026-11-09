// The helpers the analysis*.test.js files share (the file was split in three so node --test runs them in parallel
// processes: test-suite audit, 2026-11-09): a tolerance check, the generator with some of its effects switched off, and
// a synthetic slate of 16 genera with their photo features.
const assert = require('node:assert');
const A = require('../analysis.js');
const near = (got, want, tol, what) => assert.ok(Math.abs(got - want) <= tol, `${what}: ${got.toFixed(3)} not within ${tol} of ${want}`);

// The generator with its effects switched off (TRUTH patched for the duration of fn, then put back). Only TRUTH's own
// keys are written (a key it lacks, __proto__ among them, fails at once: no prototype pollution, no silent typo).
const UNSAFE = new Set(['__proto__', 'constructor', 'prototype']);
function withTruth(patch, fn) {
  const save = JSON.parse(JSON.stringify(A.TRUTH));
  const put = (o, p) =>
    Object.keys(p).forEach(k => {
      if (UNSAFE.has(k) || !Object.prototype.hasOwnProperty.call(o, k)) throw new Error(`withTruth: no TRUTH key ${k}`);
      const v = p[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) put(o[k], v);
      else o[k] = v;
    });
  put(A.TRUTH, patch);
  try {
    return fn();
  } finally {
    put(A.TRUTH, save);
  }
}

// 16 genera of 12 photos each (3 views, 3 qualities, sharpness, 3 sources, 4 observations), each with two look-alikes.
function synthMeta() {
  const V = ['wide', 'medium', 'macro'],
    S = ['imr', 'own', 'inat'],
    photos = {},
    meta = {ph: {}},
    look = {};
  for (let g = 0; g < 16; g++) {
    const G = 'Gen' + g;
    photos[G] = [];
    look[G] = ['Gen' + ((g + 1) % 16), 'Gen' + ((g + 3) % 16)];
    for (let k = 0; k < 12; k++) {
      const p = {
        f: `g${g}-${k}`,
        v: V[k % 3],
        q: [3, 2, 1][Math.floor(k / 3) % 3],
        sh: 20 + ((k * 37 + g * 11) % 200),
        src: S[(k + g) % 3],
        o: `o${g}-${Math.floor(k / 3)}`
      };
      photos[G].push(p);
      meta.ph[p.f] = [p.v, p.q, p.sh, p.src];
    }
  }
  return {photos, meta, look};
}

module.exports = {near, withTruth, synthMeta};
