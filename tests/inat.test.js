// The one iNaturalist client of the tools (tools/inat.py; rule C7: about one request a second, batched, a User-Agent,
// paced retries) and the batched requests that replaced many small ones (PR "Review every iNaturalist tool for
// batching", Pierre's ROADMAP row of 2026-11-04): each batched answer is the same as the one-taxon requests it replaces,
// in fewer requests. Everything offline: a stubbed opener, or the made-up iNaturalist of tests/inatstub.py
// (tests/inat_check.py runs each case).
const test = require('node:test'),
  assert = require('node:assert'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const run = c =>
  JSON.parse(execFileSync('python3', [path.join(__dirname, 'inat_check.py'), c], {cwd: ROOT, encoding: 'utf8', timeout: 300000}));

test('inat.py paces each host: 1 s between iNaturalist requests, 0.3 s between WoRMS ones, none once the time has passed', () => {
  const R = run('pace');
  assert.deepStrictEqual(R.slept, [1, 0.3]);
  assert.deepStrictEqual(R.later, []);
  assert.deepStrictEqual(R.calls, {'api.inaturalist.org': 3, 'www.marinespecies.org': 2});
  // A polite User-Agent naming the project, no personal address or account.
  assert.deepStrictEqual(R.ua.length, 1);
  assert.match(R.ua[0], /^coral-id-imr\/[\d.]+ \(IMR Reef ID\)$/);
});

test('inat.py retries 429, 5xx, network errors and cut replies after a pause (Retry-After when given), never another 4xx', () => {
  const R = run('retry');
  assert.deepStrictEqual(R.r429, {ok: {a: 1}, calls: 3, waits: [5, 7]});
  assert.deepStrictEqual(R.r503, {ok: {b: 2}, calls: 2, waits: [5]});
  assert.deepStrictEqual(R.reset, {ok: {c: 3}, calls: 2, waits: [5]});
  assert.deepStrictEqual(R.oserror, {ok: {c: 4}, calls: 2, waits: [5]});
  assert.deepStrictEqual(R.cut, {ok: {d: 4}, calls: 2, waits: [5]});
  assert.deepStrictEqual(R.long, {ok: {e: 5}, calls: 2, waits: [300]}, 'a Retry-After is cut to RETRY_MAX');
  assert.deepStrictEqual(R.r404, {raised: 404, calls: 1, waits: []});
  assert.deepStrictEqual(R.r400, {raised: 400, calls: 1, waits: []});
  assert.deepStrictEqual(R.missing, {ok: null, calls: 1, waits: []});
  assert.deepStrictEqual(R.empty, {ok: null, calls: 1, waits: []});
  assert.deepStrictEqual(R.gaveup, {raised: 429, calls: 6, waits: [5, 15, 30, 60, 120]});
});

test('inat.py leaf_counts and observer_counts: what each taxon alone answers, in a few requests', () => {
  const R = run('counts');
  // species_counts counts leaf taxa: exact for a species without an observed subspecies, null (asked alone) for one with.
  for (const [t, n] of Object.entries(R.leaf)) if (n !== null) assert.strictEqual(n, R.alone[t], t);
  assert.ok(Object.values(R.leaf).includes(null), 'the made-up world has species with a subspecies');
  for (const [t, n] of Object.entries(R.est)) assert.ok(n <= R.alone[t], t + ': the estimate is a lower bound');
  assert.strictEqual(R.leaf_calls, 1);
  assert.deepStrictEqual(R.batched, R.users);
  assert.deepStrictEqual(R.obs_calls, {'v2/observations': 3}, '14 observers requests read as 3 pages of observations');
  // A batch that holds more than its estimate said: each taxon on its own, still right.
  assert.deepStrictEqual(R.low, R.users);
  assert.deepStrictEqual(R.low_calls, {'v2/observations': 1, 'v1/observations/observers': 14});
});

test('fetch_fish.py: the general searches batched over the species give the same candidates in fewer requests; a rerun is offline', () => {
  const R = run('fetch_fish');
  assert.ok(JSON.parse(R.alone.cand).cand.s000, 'the run took candidates');
  assert.strictEqual(R.batched.cand, R.alone.cand);
  assert.strictEqual(R.batched.again, R.batched.cand);
  assert.strictEqual(R.alone.again, R.alone.cand);
  assert.ok(R.batched.n < R.alone.n / 2, `${R.batched.n} requests batched, ${R.alone.n} alone`);
});

test('presence.py species_presence_many: every genus at once gives what one genus at a time gives', () => {
  const R = run('presence');
  assert.deepStrictEqual(R.batched.res, R.alone.res);
  assert.ok(Object.values(R.alone.res).some(g => Object.values(g).some(s => s.by.includes('observers'))));
  assert.ok(R.batched.n < R.alone.n / 2, `${R.batched.n} requests batched, ${R.alone.n} alone`);
});

test('build_fish.py presence_prefetch: the presence of every species as each species alone gives it; offline from the cache', () => {
  const R = run('build_fish');
  assert.deepStrictEqual(R.batched.res, R.alone.res);
  assert.deepStrictEqual(R.batched.offline, R.alone.res);
  assert.deepStrictEqual(R.alone.offline, R.alone.res);
  assert.ok(R.batched.n < R.alone.n / 3, `${R.batched.n} requests batched, ${R.alone.n} alone`);
});

test('fish_commonness.py fetch: the observers of every entry counted together as each alone gives them', () => {
  const R = run('commonness');
  assert.deepStrictEqual(R.batched.rows, R.alone.rows);
  assert.ok(R.batched.n < R.alone.n / 2, `${R.batched.n} requests batched, ${R.alone.n} alone`);
});
