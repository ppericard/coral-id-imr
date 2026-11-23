require('./slot.js').testGuard();
// Rarely under ease 4 before Open Water, continued: the floor of the rotation (model.js RARE.FEW, rareHard). A unit
// with few easy observations rotates its RARE.FEW easiest observations' worth before Open Water, those at the last ease
// taken sharing what is left, so adding an easy photo never takes the rotation over a cliff (REE-197: with a bar on the
// third easiest that took every observation at its ease, a family with 2 easy adults rotated its 12 observations at
// ease 3 or more, and one with 3 easy adults only those 3). The harness and the other checks: tests/rareease.js and
// tests/rareease.test.js.
const test = require('node:test'),
  assert = require('node:assert');
const {engine, DRAWS} = require('./rareease.js');

// A thin family: nEasy easy adults (ease 5, then 4), an easy juvenile its bar still holds back, m3 observations at
// ease 3 and low under it (ease 1-2), extra photos appended.
const family = (nEasy, m3, low, extra = []) => {
  const L = [];
  for (let i = 0; i < nEasy; i++) L.push({f: `a${i}`, o: `a${i}`, e: i ? 4 : 5});
  L.push({f: 'j', o: 'j', e: 4, ph: 'juvenile'});
  for (let i = 0; i < m3; i++) L.push({f: `m${i}`, o: `m${i}`, e: 3});
  for (let i = 0; i < low; i++) L.push({f: `h${i}`, o: `h${i}`, e: 1 + (i % 2)});
  return L.concat(extra);
};
// The draws of a player under Open Water: each observation's share and each ease's; the most drawn observation; the
// effective number of observations in rotation (1 / the sum of the squared shares: N for N drawn alike).
const draws = (L, N, opt = {}) => {
  const E = engine('fish', L, {th: 2.2, score: 0.3, ok: 6, ...opt}),
    e = Object.fromEntries(L.map(p => [p.f, p.e])),
    by = {},
    ease = {};
  let tot = 0;
  for (let i = 0; i < N; i++)
    E.photoSet('u', null, 0, 4, 'k4').shown.forEach(x => {
      tot++;
      by[x.o] = (by[x.o] || 0) + 1;
      ease[e[x.f]] = (ease[e[x.f]] || 0) + 1;
    });
  const sh = Object.values(by).map(k => k / tot);
  return {E, by, top: Math.max(...sh), eff: 1 / sh.reduce((t, s) => t + s * s, 0), ease: k => (ease[k] || 0) / tot};
};

test('rareHard: the rotation holds the RARE.FEW easiest observations, and an easy one added never shrinks it', () => {
  const {rareHard, RARE} = engine('fish', family(2, 20, 15));
  // The rotation's weight: each observation (by its easiest photo's ease) counts for its easy part, 1 - how hard.
  const rotated = eo => {
    const s = [...eo].sort((a, b) => b - a),
      h = rareHard(s);
    return s.reduce((t, e) => t + 1 - h(e), 0);
  };
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let t = 0; t < 300; t++) {
    const n = 1 + Math.floor(rnd() * 40),
      eo = Array.from({length: n}, () => 1 + Math.floor(rnd() * 5)),
      easyN = eo.filter(e => e >= RARE.E).length,
      r0 = rotated(eo);
    assert.ok(Math.abs(r0 - Math.max(Math.min(RARE.FEW, n), easyN)) < 1e-9, `${n} observations, ${easyN} easy: ${r0} rotated`);
    const add = [...eo, 4 + Math.floor(rnd() * 2)],
      i = Math.floor(rnd() * n),
      up = eo.map((e, j) => (j === i && e < 5 ? e + 1 : e));
    assert.ok(rotated(add) >= r0 - 1e-9, `an easy observation added: ${r0} -> ${rotated(add)}`);
    assert.ok(rotated(up) >= r0 - 1e-9, `an ease raised: ${r0} -> ${rotated(up)}`);
  }
  // Two easy adults, 20 at ease 3: the 20 share the 10 places left, each half easy; ease 1-2 is hard.
  const h = rareHard([5, 4, ...Array(20).fill(3), 2, 1]);
  assert.deepStrictEqual([5, 4, 3, 2, 1].map(h), [0, 0, 0.5, 1, 1]);
});

test('adding easy adults to a thin family never takes its draw over a cliff before Open Water', () => {
  // 20 observations at ease 3 and 15 under, as tests/rareease.js measured the cliff (REE-189): with a bar on the third
  // easiest, 2 easy adults rotated about 25 observations and 3 only those 3, the most drawn at 34%. Now every count
  // keeps at least the rotation of 12 easy adults (the rule unchanged from there), and no observation takes a large
  // share; ease 1-2 still comes, rarely.
  const at = {};
  for (const nEasy of [0, 2, 3, 4, 8, 12, 16]) at[nEasy] = draws(family(nEasy, 20, 15), 600);
  for (const [nEasy, d] of Object.entries(at)) {
    assert.ok(
      d.eff >= 0.9 * at[12].eff,
      `${nEasy} easy adults: ${d.eff.toFixed(1)} observations in rotation, ${at[12].eff.toFixed(1)} with 12`
    );
    assert.ok(d.eff >= d.E.RARE.FEW, `${nEasy} easy adults: ${d.eff.toFixed(1)} observations in rotation`);
    assert.ok(d.top < 0.15, `${nEasy} easy adults: the most drawn observation at ${(100 * d.top).toFixed(1)}%`);
    assert.ok(d.ease(1) + d.ease(2) > 0, `${nEasy} easy adults: ease 1-2 still drawn`);
  }
});

test("the RA's case: a third easy adult judged for a family like Remoras keeps its rotation (REE-197)", () => {
  // Remoras today: 2 easy adults (one observation with a second photo), an easy juvenile held back, 10 observations at
  // ease 3, the rest under: 12 rotate before Open Water. A third easy adult took it to 3 on a bar at the third easiest.
  for (const third of [false, true]) {
    const L = family(2, 10, 26, [{f: 'a1b', o: 'a1', e: 4}, ...(third ? [{f: 'c', o: 'c', e: 4}] : [])]),
      {E, eff, top, by, ease} = draws(L, DRAWS.CAP);
    assert.ok(eff >= E.RARE.FEW, `${third ? 3 : 2} easy adults: ${eff.toFixed(1)} observations in rotation`);
    assert.ok(top < 0.15, `the most drawn observation: ${(100 * top).toFixed(1)}%`);
    assert.ok(ease(1) + ease(2) <= E.RARE.SHARE + 0.03, `ease 1-2 still rare: ${(100 * (ease(1) + ease(2))).toFixed(1)}%`);
    assert.ok(!by.j, 'the juvenile still waits for its ramp');
  }
});

test('exploration questions with every easy observation seen: under the bar still within the cap', () => {
  // A unit held (calibration questions draw among the observations never seen) whose 3 easy adults were all seen and
  // answered right twice; the 20 at ease 3 share the 9 places left, unseen: ease 1-2 stays within the cap.
  const L = family(3, 20, 15),
    ps = Object.fromEntries(['a0', 'a1', 'a2'].map(f => [f, [2, 2]])),
    {E, ease} = draws(L, DRAWS.CAP, {lv: 'mid', ps}),
    low = ease(1) + ease(2);
  assert.ok(low <= E.RARE.SHARE + 0.03, `ease 1-2: ${(100 * low).toFixed(1)}%`);
  assert.ok(low > 0, 'no wall: still drawn');
});
