require('./slot.js').testGuard();
// Rarely under ease 4 before Open Water (no wall: a photo under ease 4 may come, but rarely; model.js RARE, rareCap): model.js photoSet runs in Node on a unit whose pool is dominated by hard
// photos, as the fish starter families are (about two thirds of their photos under ease 4, and many more observations
// than a pool-sized unit). Before Open Water the photos under ease 4 make at most about RARE.SHARE of the draws, whatever
// their number; they still come (no wall); past Open Water they come back; a photo with no judged ease (the corals) is
// never held back; only the units of the subject's own rank are capped, the fish families. docs/LEARNING.md
// "Rarely under ease 4 before Open Water". The checks are in three files that run in parallel (this one,
// rareease-mixed.test.js, rareease-rank.test.js), on one harness (tests/rareease.js).
const test = require('node:test'),
  assert = require('node:assert');
const {engine, pool, share, DRAWS} = require('./rareease.js');

test('before Open Water, a pool dominated by hard photos: those under ease 4 come rarely, never walled off', () => {
  const L = pool(),
    E = engine('fish', L),
    r = share(E, L);
  assert.ok(r <= E.RARE.SHARE + 0.03, `under ease 4: ${(100 * r).toFixed(1)}% of the draws (at most about ${100 * E.RARE.SHARE}%)`);
  assert.ok(r > 0.02, `no wall: under ease 4 still drawn (${(100 * r).toFixed(1)}%)`);
  // The same at the start (no answer yet, ability 0): the cap only lowers the hard share, never raises it.
  const F = engine('fish', L, {th: 0, ok: 0, score: 0});
  assert.ok(share(F, L) <= F.RARE.SHARE + 0.03);
});

test('a family with few easy photos: its few easiest count as the easy ones', () => {
  // 2 photos at ease 3, 10 at ease 2, the rest at ease 1: the RARE.FEW (12) easiest reach ease 2, so the ease-1 photos
  // are held.
  const L = [
    {f: 'a', o: 'a', e: 3},
    {f: 'b', o: 'b', e: 3}
  ];
  for (let i = 0; i < 60; i++) L.push({f: `h${i}`, o: `h${i}`, e: i < 10 ? 2 : 1});
  const E = engine('fish', L),
    e = Object.fromEntries(L.map(p => [p.f, p.e]));
  let one = 0,
    tot = 0;
  for (let i = 0; i < DRAWS.CAP; i++) E.photoSet('u', null, 0, 4, 'k4').shown.forEach(x => ((tot += 1), (one += e[x.f] === 1 ? 1 : 0)));
  assert.ok(one / tot <= E.RARE.SHARE + 0.03, `ease 1: ${((100 * one) / tot).toFixed(1)}%`);
  assert.ok(one > 0, 'still drawn');
});

test('the few easiest are observations the draw can show: a held-back juvenile and a second photo count for nothing', () => {
  // A one-species family as a remora's was (REE-189): two easy adults (a at ease 5, b at 4, b's observation with a second
  // photo at 4), an easy juvenile its bar still holds back, the rest of its adults at ease 3. Counted by photo, the third
  // easiest was the juvenile or b's second photo (ease 4), so ease 3 was "hard" and the two adults took about 90% of
  // the questions, however often they had been seen (both seen 3 times, right: the photo memory could not help); a player
  // saw one photo 3 times in 14 minutes. By observation at full weight the easiest after the adults are at ease 3: the
  // adults share the draw with ease-3 ones, and ease 1-2 stays rare.
  const L = [
    {f: 'a', o: 'a', e: 5},
    {f: 'b', o: 'b', e: 4},
    {f: 'b2', o: 'b', e: 4},
    {f: 'j', o: 'j', e: 4, ph: 'juvenile'}
  ];
  for (let i = 0; i < 20; i++) L.push({f: `m${i}`, o: `m${i}`, e: 3});
  for (let i = 0; i < 20; i++) L.push({f: `h${i}`, o: `h${i}`, e: 1 + (i % 2)});
  const E = engine('fish', L, {th: 2.2, score: 0.3, ok: 6, ps: {a: [3, 3], b: [3, 3]}}),
    e = Object.fromEntries(L.map(p => [p.f, p.e]));
  let ab = 0,
    three = 0,
    low = 0,
    juv = 0,
    tot = 0;
  for (let i = 0; i < DRAWS.CAP; i++)
    E.photoSet('u', null, 0, 4, 'k4').shown.forEach(x => {
      tot++;
      if (x.o === 'a' || x.o === 'b') ab++;
      if (e[x.f] === 3) three++;
      if (e[x.f] < 3) low++;
      if (x.f === 'j') juv++;
    });
  assert.ok(ab / tot < 0.3, `the two easy adults: ${((100 * ab) / tot).toFixed(1)}% of the draws`);
  assert.ok(three / tot > 0.6, `ease 3: ${((100 * three) / tot).toFixed(1)}%`);
  assert.ok(low / tot <= E.RARE.SHARE + 0.03, `ease 1-2 still rare: ${((100 * low) / tot).toFixed(1)}%`);
  assert.strictEqual(juv, 0, 'the juvenile still waits for its ramp');
});

test('rareCap: the hard photos weigh at most the share, whatever their number', () => {
  const E = engine('fish', pool());
  for (const nh of [5, 50, 500, 5000]) {
    const keys = ['e1', 'e2', ...Array.from({length: nh}, (_, i) => `h${i}`)],
      sc = Object.fromEntries(keys.map(k => [k, k[0] === 'e' ? 1 : 0.6])),
      f = E.rareCap(keys, sc, k => k[0] === 'h'),
      mh = nh * 0.6 * f;
    assert.ok(mh / (mh + 2) <= E.RARE.SHARE + 1e-9, `${nh} hard observations: ${mh / (mh + 2)}`);
  }
  // Already rare, or nothing easy to draw: unchanged.
  assert.strictEqual(
    E.rareCap(['e', 'h'], {e: 1, h: 0.05}, k => k === 'h'),
    1
  );
  assert.strictEqual(
    E.rareCap(['h1', 'h2'], {h1: 1, h2: 1}, () => true),
    1
  );
});
