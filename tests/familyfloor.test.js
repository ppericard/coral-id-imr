require('./slot.js').testGuard();
// More candidate photos for the families the game covers with few species (REE-189; Pierre, 2026-11-21 18:12): the
// species of such a family share at least FAMILY_FLOOR photos (tools/fetch_fish.py family_cap, through species_room);
// the refill's exhaustion record holds only under a cap at least the species' cap now (pick_short); an easy photo
// counts as an easy observation only for an adult (easy_obs: the draw holds a juvenile or a phase back before Open
// Water, model.js varOf, RARE). Offline, on fixtures.
const test = require('node:test'),
  assert = require('node:assert'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const J = (code, ...args) =>
  JSON.parse(
    execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\nimport fetch_fish as ff\n${code}`, ...args], {
      cwd: ROOT,
      encoding: 'utf8'
    })
  );

test('family_cap: a family with few species holds FAMILY_FLOOR photos, shared over its species', () => {
  const out = J(`s = {'id': 's1'}
t = lambda n, **k: {'id': 't1', 'species': [f's{i}' for i in range(1, n + 1)], **k}
L = lambda n: [{'f': f'fish-s1-cand-{i}', 'o': f'o{i}'} for i in range(n)]
g = lambda f: False
R = lambda x, n=0, c=None: [ff.species_room(s, x, L(n), g, cap=c)[k] for k in ('cap', 'base', 'room')]
print(json.dumps([ff.FAMILY_FLOOR, R(t(1), 40), R(t(2)), R(t(3)), R(t(5)), R(t(1), 2, 4), R(t(1, wink={})), R({'id': 't0'})]))`);
  assert.deepStrictEqual(out, [
    90,
    [90, 30, 50], // one species: the whole floor, its own cap of 30 its base
    [45, 30, 45], // two species: 45 each
    [30, 30, 30], // three species: 30 each already makes 90, the cap of Q36 holds
    [30, 30, 30],
    [4, 4, 2], // a fixed cap (--cap) holds
    [5, 5, 5], // a surprise-only species keeps WINK_CAP
    [30, 30, 30] // an entry listing no species keeps its cap
  ]);
  // A species whose own cap (its phases) is larger than its share keeps it.
  assert.strictEqual(J(`print(json.dumps(ff.family_cap(60, {'species': ['a', 'b']})))`), 60);
});

test('pick_short: an exhaustion record made under a smaller cap does not hold; one under the same cap does', () => {
  const out = J(`import datetime
day = datetime.date(2026, 11, 21)
row = lambda cap, base: {'cap': cap, 'base': base, 'room': 10, 'parts': {'free': 10}, 'easy': 0, 'unjudged': 0}
rows = {'a': row(90, 30), 'b': row(30, 30), 'c': row(90, 30), 'd': row(90, 30)}
mem = {k: {'at': '2026-11-20', 'room': {'free': 10}} for k in rows}
mem['c']['cap'] = 90  # searched to the end under the raised cap: holds
mem['d']['cap'] = 40  # under a smaller one: does not
print(json.dumps(ff.pick_short(rows, mem, day)))`);
  assert.deepStrictEqual(out, [
    ['a', 'd'],
    ['b', 'c']
  ]);
});

test('easy_obs: a juvenile or a phase is no easy observation, an adult is', () => {
  const out =
    J(`L = [{'f': 'fish-s1-cand-1', 'o': 'o1'}, {'f': 'fish-s1-cand-2', 'o': 'o2'}, {'f': 'fish-s1-cand-3', 'o': 'o3', 'st': 'juvenile'},
     {'f': 'fish-s1-cand-4', 'o': 'o4'}, {'f': 'fish-s1-cand-5', 'o': 'o5'}]
sug = {'fish-s1-cand-1': {'jt': 'p1g0sm1', 'e': 5, 'k': 'best'}, 'fish-s1-cand-2': {'jt': 'p1g0sm1j', 'e': 4, 'k': 'best'},
       'fish-s1-cand-3': {'jt': 'p1g0sm1', 'e': 4, 'k': 'best'}, 'fish-s1-cand-4': {'jt': 'p1g0sm1', 'e': 4, 'k': 'best', 'ph': 'male'},
       'fish-s1-cand-5': {'jt': 'p1g0sm1', 'e': 3, 'k': 'best'}}
F = {'add': {'fish-s1-cand-5': 's1'}, 'ease': {'fish-s1-cand-5': 4}}
game = [{'f': 'g1', 'o': 'og1', 'e': 5, 'jt': 'p1g0sl1'}, {'f': 'g2', 'o': 'og2', 'e': 4, 'jt': 'p1g1sl1j'}]
print(json.dumps(ff.easy_obs('s1', L, F, sug, game, lambda f: False)))`);
  // The adults: candidate 1 (a sure add at 5), candidate 5 (Pierre's add, his ease 4) and game photo g1. Not the
  // juvenile by its tag (2) or by its source's life stage (3), the male phase (4), the juvenile game photo (g2).
  assert.strictEqual(out, 3);
});
