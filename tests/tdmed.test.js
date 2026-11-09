// analysis.js tdFeat keeps each player's log seconds in order as they come (a sorted insert) instead of sorting the whole
// history at every answer (performance pass, 2026-11-09): each answer's z, log seconds minus the player's median over
// their earlier timed answers, is the same as from a sort, here on a made-up log with ties, typed and untimed answers,
// a zero time and, for one player, a negative one (NaN: that player's list is sorted as before).
const test = require('node:test'),
  assert = require('node:assert');
const {tdFeat} = require('../analysis.js');

test('tdFeat: each z is log seconds minus the median of the earlier timed answers, as from a sort', () => {
  let s = 99;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647,
    A = [];
  for (let i = 0; i < 4000; i++) {
    const p = 'p' + Math.floor(rnd() * 6),
      u = rnd();
    A.push({
      p,
      s: u < 0.05 ? null : p === 'p5' && u < 0.06 ? -2 : u < 0.07 ? 0 : u < 0.3 ? 1 + Math.floor(rnd() * 5) : 1 + rnd() * 40,
      typed: rnd() < 0.1,
      ph: ['f' + Math.floor(rnd() * 50)],
      y: rnd() < 0.8 ? 1 : 0,
      z: null
    });
  }
  const R = tdFeat(A),
    L = {};
  let nz = 0,
    nan = 0;
  R.forEach(({a, z}, i) => {
    assert.strictEqual(a, A[i]);
    const h = (L[a.p] = L[a.p] || []),
      timed = a.s != null && !a.typed;
    let want = null;
    if (timed && h.length >= 10) {
      const S = h.slice().sort((x, y) => x - y),
        n = S.length;
      want = Math.log(a.s) - (n % 2 ? S[(n - 1) / 2] : (S[n / 2 - 1] + S[n / 2]) / 2);
    }
    if (Number.isNaN(want)) (assert.ok(Number.isNaN(z), `answer ${i}`), nan++);
    else assert.strictEqual(z, want, `answer ${i}`);
    if (z != null && !Number.isNaN(z)) nz++;
    if (timed) h.push(Math.log(a.s));
  });
  assert.ok(nz > 2000 && nan > 0, `${nz} z, ${nan} NaN`);
});
