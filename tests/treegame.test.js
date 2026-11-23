require('./slot.js').testGuard();
// One tree-game builder for every tree subject (docs/reviews/2026-11-19-admin-one-engine.md §5 step 13, Dup-20): the rules of
// the photos in play are tools/fish_game.py's, which tools/seaslug_game.py calls with the sea slugs' own rubric (their tags,
// their keep default) instead of a copy of each: sure (cand_sure), decided (decided_of), a photo Pierre added (add_ok), a
// crop (crop_of), a stale file (photos.stale), and the photos in play and their records themselves (in_play, record), read
// with the subject's part of the curation, its sure rule and its candidate lists in order. The committed outputs of both
// builds are unchanged (tests/fishgame.test.js, tests/seaslug-game.test.js, the --check of each). The sea slugs' write()
// keeps the tree section's hook (REE-12): it writes data/seaslug-tree.json after the repository's own files only.
// node --test tests/treegame.test.js
const test = require('node:test'),
  assert = require('node:assert'),
  path = require('path'),
  {spawnSync} = require('child_process');
const TOOLS = path.join(__dirname, '..', 'tools');
// Runs Python with fish_game as F and seaslug_game as g; the last line printed, as JSON.
const py = body => {
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(TOOLS)})\nimport fish_game as F\nimport seaslug_game as g\n${body}`;
  const r = spawnSync('python3', ['-c', code], {encoding: 'utf8', maxBuffer: 64 << 20});
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout.trim().split('\n').pop());
};

test('sure: the fish rule on the sea slugs rubric: their tags, a judgement with no keep counts as best, never an egg mass', () => {
  const r = py(`
J = {'jt': 'p1g0sl1', 'e': 3}
print(json.dumps({
  'ss': [g.sure(J), g.sure({**J, 'k': 'alt'}), g.sure({**J, 'k': 'dup'}), g.sure({**J, 'egg': True}), g.sure({**J, 'u': ['jt']}),
         g.sure({**J, 'u': ['bb']}), g.sure({**J, 'jt': 'p1g0sl1a'}), g.sure({**J, 'jt': 'p1g0sl1k'}), g.sure({**J, 'e': 6}), g.sure(None)],
  'fish': [F.cand_sure(J), F.cand_sure({**J, 'k': 'best'}), F.cand_sure({**J, 'jt': 'p1g0sl1n'})],
  'sstag': [g.sure({**J, 'jt': 'p1g0sl1n'}), g.sure({**J, 'jt': 'p1n0sl1'})],
  'fishtag': [F.cand_sure({**J, 'k': 'best', 'jt': 'p1n0sl1'})],
  'types': [type(g.sure(J)).__name__, type(g.sure(None)).__name__]}))`);
  assert.deepStrictEqual(r.ss, [true, true, false, false, false, true, false, false, false, false]);
  // the fish's judgements always carry their keep: none counts for nothing
  assert.deepStrictEqual(r.fish, [false, true, false]);
  // the tags are each subject's own: the fish's lighting n is not the sea slugs'
  assert.deepStrictEqual(r.sstag, [false, false]);
  assert.deepStrictEqual(r.fishtag, [true]);
  assert.deepStrictEqual(r.types, ['bool', 'bool']);
});

test('crop and the stale files are the fish rules', () => {
  const r = py(`
print(json.dumps({
  'mine': [g.crop_mine({'crop': {'a': [0, 0, 1, 1]}}, 'a'), g.crop_mine({'crop': {'a': [0.1, 0.2, 0.8, 0.9]}}, 'a'),
           g.crop_mine({'crop': {'a': [0.1, 0.2]}}, 'a'), g.crop_mine({}, 'a')],
  'stale': [g.stale({'cr': None, 'ro': 90}, None, 90), g.stale({'cr': [0.1, 0.1, 0.9, 0.9]}, None, 0), g.stale({'ro': 90}, None, 0),
            g.stale({}, None, 0)]}))`);
  assert.deepStrictEqual(r.mine, [
    [true, null],
    [true, [0.1, 0.2, 0.8, 0.9]],
    [false, null],
    [false, null]
  ]);
  assert.deepStrictEqual(r.stale, [false, true, true, false]);
});

test('what Pierre decided and added reads the same for both builds (decided_of, add_ok)', () => {
  const r = py(`
Fc = {'add': {'a': 's1', 'b': 's1', 'c': 's1', 'd': 's1'}, 'seen': {'b': 1}, 'exclude': {'x': 1}, 'out': {'d': 's2'}, 'tags': {'c': 'p1g0slk'}}
top = {'e'}
print(json.dumps({
  'decided': sorted(F.decided_of(Fc)),
  'add': [F.add_ok(Fc, f, 's1', top, {}) for f in 'abcd'],
  'elsewhere': F.add_ok(Fc, 'a', 's2', top, {}),
  'top': F.add_ok({'add': {'e': 's1'}}, 'e', 's1', top, {}),
  'topid': F.add_ok({'add': {'s-cand-12': 's1'}}, 's-cand-12', 's1', {'t-cand-12'}, {}),
  'unsorted': F.add_ok({'add': {'a': 's1'}}, 'a', 's1', set(), {'a': {'jt': 'p1g0slm'}})}))`);
  assert.deepStrictEqual(r.decided, ['a', 'b', 'c', 'd', 'x']);
  // a is his; b was rejected (seen); c has his tags with a count of other species one could confuse it with (k: out, rule P3); d moved
  assert.deepStrictEqual(r.add, [true, false, false, false]);
  assert.strictEqual(r.elsewhere, false);
  assert.strictEqual(r.top, false);
  assert.strictEqual(r.topid, false, 'the top-level exclude by photo id');
  assert.strictEqual(r.unsorted, false);
});

test("in_play for every tree subject: the subject's part of the curation, its sure rule, its lists in order, its units", () => {
  const r = py(`
u = lambda f, o: {'f': f, 'src': 'u', 'o': o}
C = {'cand': {'A': [u('x-cand-1', 'o1'), u('x-cand-2', 'o2')], 'B': [u('y-cand-1', 'o1'), u('y-cand-3', 'o3')]}}
S = {f: {'jt': 'd1g0sl1', 'e': 3} for f in ('x-cand-1', 'x-cand-2', 'y-cand-1', 'y-cand-3')}
run = lambda cur, **k: [[s, p['f'], route] for s, p, _, route in F.in_play(cur, C, S, **k)]
FJ = {'p-cand-5': {'jt': 'p1g0sl1', 'e': 3, 'k': 'best'}}
CF = {'cand': {'s5': [u('p-cand-5', 'o5')]}}
fish = lambda tag: [p['f'] for _, p, _, _ in F.in_play({'fish': {'tags': {'p-cand-5': tag}}}, CF, FJ)]
print(json.dumps({
  'slugs': run({}, key='seaslug', sure=g.sure),
  'keys': run({}, key='seaslug', sure=g.sure, keys=['B', 'A']),
  'fishsure': run({}, key='seaslug'),
  'part': run({'fish': {'seen': {'x-cand-1': 1}}, 'seaslug': {'seen': {'x-cand-2': 1}}}, key='seaslug', sure=g.sure),
  'units': run({'seaslug': {'add': {'y-cand-3': 'g:Zz', 'x-cand-2': 's1'}}}, key='seaslug', sure=g.sure, units={'s1'}),
  'other': [fish('p1g0slk'), fish('p1g0slm'), fish('p1g0slo')]}))`);
  // x-cand-1 and y-cand-1 are one photo (pid i1): it plays once, for the first list read
  assert.deepStrictEqual(r.slugs, [
    ['A', 'x-cand-1', 'cand'],
    ['A', 'x-cand-2', 'cand'],
    ['B', 'y-cand-3', 'cand']
  ]);
  assert.deepStrictEqual(r.keys, [
    ['B', 'y-cand-1', 'cand'],
    ['B', 'y-cand-3', 'cand'],
    ['A', 'x-cand-2', 'cand']
  ]);
  // the fish's sure rule by default: a judgement with no keep counts for nothing
  assert.deepStrictEqual(r.fishsure, []);
  // the sea slugs' part is read, never the fish's
  assert.deepStrictEqual(r.part, [
    ['A', 'x-cand-1', 'cand'],
    ['B', 'y-cand-3', 'cand']
  ]);
  // his add to a unit of the subject is in; one to another unit is out, and decided: never in by itself either
  assert.deepStrictEqual(r.units, [
    ['s1', 'x-cand-2', null],
    ['A', 'x-cand-1', 'cand']
  ]);
  // his count of other species one could take for it (k) or not sorted yet (m) keeps a sure candidate out (rule P3)
  assert.deepStrictEqual(r.other, [[], [], ['p-cand-5']]);
});

test('the sea slugs build on in_play and record: one photo once, the species first; his phase; the fields in order', () => {
  const r = py(`
L = {'area': {}, 'centre': {}, 'photoTarget': {'start': 1, 'gameCap': 4},
     'species': [{'rank': 1, 'name': 'Aa bb', 'inat': 1, 'family': 'Afam', 'genus': 'Aa', 'group': 'Nudibranchia',
                  'circle': 1, 'observers': 9, 'worms': {}}]}
c = lambda k, n, **x: {'f': f'seaslug-{k}-cand-{n}', 'o': f'o{n}', 'src': f'u{n}', 'a': 'A', 'lic': 'cc-by', 't': 'T',
                       'loc': 'ph', **x}
C = {'cand': {'1': [c(1, 1), c(1, 2), c(1, 4, st='juvenile')], 'Aa': [c('Aa', 1, gl=1), c('Aa', 3, gl=1), c('Aa', 5, gl=1)]}}
S = {p['f']: {'jt': 'd1g0sl1', 'e': 3} for L1 in C['cand'].values() for p in L1}
cur = {'seaslug': {'phase': {'seaslug-1-cand-2': 'juvenile'}, 'add': {'seaslug-Aa-cand-5': 's1'}}}
t, gm, _ = g.build(L, C, S, cur=cur)
print(json.dumps({'recs': [[p['f'], p['sp'], p['t'], p.get('ph'), list(p)] for p in gm['photos']['f:Afam']]}))`);
  const order = ['f', 'o', 'src', 'a', 'lic', 't', 'sp', 'loc', 'e', 'jt'];
  assert.deepStrictEqual(r.recs, [
    // his add of a genus-level photo to the species: named after it, no auto
    ['seaslug-Aa-cand-5', 's1', 'Aa bb', null, [...order, 'r']],
    ['seaslug-1-cand-1', 's1', 'T', null, [...order, 'auto', 'r']],
    ['seaslug-1-cand-2', 's1', 'T', 'juvenile', [...order, 'ph', 'auto', 'r']], // his phase
    ['seaslug-1-cand-4', 's1', 'T', 'juvenile', [...order, 'ph', 'auto', 'r']], // the source's stage
    // the genus list's copy of cand 1 (the same photo) is out: the species' list is read first
    ['seaslug-Aa-cand-3', 'g:Aa', 'T', null, ['f', 'o', 'src', 'a', 'lic', 't', 'sp', 'gl', 'loc', 'e', 'jt', 'auto', 'r']]
  ]);
});

test("write: the repository's own files are followed by the tree section (REE-12); another root gets the two files only", () => {
  const r = py(`
import os, tempfile
calls = []
g.tree_section.write = lambda s: calls.append(s)
d = tempfile.mkdtemp()
tree, game = {'v': 1}, {'v': 1, 'photos': {}}
g.write(d, tree, game)
other = list(calls)
files = sorted(os.listdir(d))
g.ROOT = d
g.write(d, tree, game)
print(json.dumps({'other': other, 'files': files, 'own': calls}))`);
  assert.deepStrictEqual(r.other, []);
  assert.deepStrictEqual(r.files, ['seaslug-game.json', 'seaslug.json']);
  assert.deepStrictEqual(r.own, ['seaslug']);
});
