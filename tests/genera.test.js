// The game genera, defined once (core.js BENTHIC, BONUS, slateOf, gameOf; Pierre, 2026-11-03: no genus-specific case),
// and the candidate refill for the Finder-only genera (tools/fetch_local.py, offline: tools/genera.py reads the lists
// from core.js; finder_need, room and --plan never ask iNaturalist). Needs python3, like the other checks.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
const {BENTHIC, BONUS, slateOf, gameOf, CAP} = require('../core.js');
const ROOT = path.join(__dirname, '..');
const RAW = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const py = (code, ...args) =>
  execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\n${code}`, ...args], {cwd: ROOT, encoding: 'utf8'});

test('slateOf / gameOf: the slate, then Millepora (BENTHIC), then the bonus genera; the same on the admin merged copy', () => {
  const X = RAW.x.gen,
    slate = slateOf(RAW),
    game = gameOf(RAW);
  assert.deepStrictEqual(slate, [...Object.keys(RAW.gen), ...BENTHIC.filter(n => X[n])]);
  assert.deepStrictEqual(game, [...slate, ...BONUS.filter(n => X[n])]);
  assert.ok(slate.includes('Millepora') && !slate.includes('Isopora') && game.includes('Isopora'));
  // admin.js merges data.json "x" into DATA.gen: the lists stay the same.
  const merged = {...RAW, gen: {...RAW.gen, ...X}};
  assert.deepStrictEqual(slateOf(merged), slate);
  assert.deepStrictEqual(gameOf(merged), game);
  // A list genus missing from the data is left out; no data, no genus.
  assert.deepStrictEqual(gameOf({gen: {A: {}}, x: {gen: {Isopora: {}, Z: {}}}}), ['A', 'Isopora']);
  assert.deepStrictEqual(slateOf({}), []);
});

test('tools/genera.py reads the same lists and CAP.sheet from core.js', () => {
  const out = JSON.parse(
    py(
      `from genera import game_genera, finder_only, cap_sheet, lists\nfrom datajson import load\nd = load()\nprint(json.dumps([game_genera(d), finder_only(d), cap_sheet(), lists()]))`
    )
  );
  assert.deepStrictEqual(out[0], gameOf(RAW));
  assert.deepStrictEqual(
    out[1],
    Object.keys(RAW.x.gen).filter(n => !gameOf(RAW).includes(n))
  );
  assert.strictEqual(out[2], CAP.sheet);
  assert.deepStrictEqual(out[3], [BENTHIC, BONUS]);
});

test('fetch_local finder_need: colonies a Finder-only genus lacks in Colony and Close-up, as curated', () => {
  const out = JSON.parse(
    py(`
from fetch_local import finder_need, room, kept_views
o = lambda f, obs, **k: dict(f=f, o=obs, **k)
G = {
  'A': {'views': {'wide': [o('a1', 1), o('a2', 1), o('a3', 2), o('a4', 3, multi=1)], 'medium': [o('a5', 4)], 'macro': [o('a6', 5), o('a7', 6)]}},
  'B': {'levels': 2, 'views': {'wide': [o('b1', 1)], 'medium': [o('b2', 2)], 'macro': [o('b3', 3)]}},
}
cand = {'A': [o('c1', 7), o('c2', 8)], 'Z': [o('c3', 9)]}
cur = {'genera': {'A': {'hide': ['a3'], 'move': {'a6': 'medium'}, 'add': {'c1': 'wide', 'c3': 'medium'}}}}
print(json.dumps({
  'A': finder_need('A', G, cand, cur, cap=6),
  'Aviews': kept_views('A', G, cur),
  'Aex': finder_need('A', G, cand, cur, excl=lambda f: f == 'c1', cap=6),
  'B': finder_need('B', G, cand, cur, cap=6),
  'Bviews': kept_views('B', G, cur),
  'Blv3': finder_need('B', G, cand, {'genera': {'B': {'lv': 3}}}, cap=6),
  'full': finder_need('A', G, cand, cur, cap=2),
  'room': [room(15, 3), room(15, 3, 2, 1), room(6, 0, 4, 6), room(15, 3, 0, 0)],
}))`)
  );
  // A: wide = colonies 1 (a1, a2) and 7 (c1 added; a3 hidden, a4 several corals) = 2; medium = 4, 5 (a6 moved), 9 (c3
  // added from another genus's list) = 3; macro (Corallites) does not count: (6 - 2) + (6 - 3).
  assert.deepStrictEqual(out.Aviews, ['wide', 'medium']);
  assert.strictEqual(out.A, 7);
  assert.strictEqual(out.Aex, 8, 'an excluded photo is no colony');
  // B, 2 levels: its macro photos are its close-ups, its medium ones join Colony: wide 1, 2; macro 3.
  assert.deepStrictEqual(out.Bviews, ['wide', 'macro']);
  assert.strictEqual(out.B, 4 + 5);
  assert.strictEqual(out.Blv3, 5 + 5, 'curation lv 3: Colony and Close-up (medium)');
  assert.strictEqual(out.full, 0, 'enough colonies: nothing to refill');
  // Game genus: the source cap only; Finder-only: also no more than its need over all sources.
  assert.deepStrictEqual(out.room, [12, 1, -2, 0]);
});

test('fetch_local --plan on the real data: game genera keep their caps, a Finder-only genus refills only what it lacks', () => {
  const P = JSON.parse(execFileSync('python3', ['tools/fetch_local.py', '--plan'], {cwd: ROOT, encoding: 'utf8'}));
  const game = new Set(gameOf(RAW));
  assert.deepStrictEqual(Object.keys(P).sort(), [...Object.keys(RAW.gen), ...Object.keys(RAW.x.gen)].sort());
  Object.entries(P).forEach(([g, r]) => {
    assert.strictEqual(r.finder, !game.has(g), g);
    if (game.has(g)) assert.strictEqual(r.need, null, g);
    else {
      assert.ok(Number.isInteger(r.need) && r.need >= 0, g);
      assert.ok(r.dauin <= r.need && r.ph <= r.need, `${g}: refills more than it lacks`);
    }
  });
});
