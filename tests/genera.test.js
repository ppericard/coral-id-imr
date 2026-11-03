// The game genera, defined once (core.js BENTHIC, BONUS, slateOf, gameOf; Pierre, 2026-11-03: no genus-specific case),
// and the candidate refill for the Finder-only genera (tools/fetch_local.py, offline: tools/genera.py reads the lists
// from core.js; finder_need, room and --plan never ask iNaturalist). Needs python3, like the other checks.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
const {BENTHIC, BONUS, slateOf, gameOf, CAP, lectureGroup, starRefs, starWaits} = require('../core.js');
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
  // B, 2 levels in data.json: its macro photos are its close-ups; its medium ones stay apart (admin.js viewOf merges
  // them into Colony only for a genus switched to 2 levels by curation; Codex review #390): wide 1; macro 3.
  assert.deepStrictEqual(out.Bviews, ['wide', 'macro']);
  assert.strictEqual(out.B, 5 + 5);
  assert.strictEqual(out.Blv3, 5 + 5, 'curation lv 3: Colony and Close-up (medium)');
  assert.strictEqual(out.full, 0, 'enough colonies: nothing to refill');
  // Game genus: the source cap only; Finder-only: also no more than its need over all sources.
  assert.deepStrictEqual(out.room, [12, 1, -2, 0]);
});

test('fetch_local colonies: a photo sent to another genus ("Not this genus") leaves it and joins the other (Codex review #390)', () => {
  const r = JSON.parse(
    py(`import importlib.util
sys.argv = ['x']
s = importlib.util.spec_from_file_location('fl', 'tools/fetch_local.py'); fl = importlib.util.module_from_spec(s); s.loader.exec_module(fl)
G = {'A': {'views': {'wide': [{'f': 'a1', 'o': 'o1'}, {'f': 'a2', 'o': 'o2'}]}}, 'B': {'views': {'wide': [{'f': 'b1', 'o': 'o3'}]}}}
cur = {'genera': {'A': {'out': {'a2': 'B'}}}}
print(json.dumps([fl.colonies('A', G, {}, cur), fl.colonies('B', G, {}, cur), fl.colonies('B', G, {}, {**cur, 'use': {'b1': 'ref'}})]))`)
  );
  assert.deepStrictEqual(r, [{wide: 1}, {wide: 2}, {wide: 1}], 'a sheet-only colony (use ref) no longer counts, as admin.js gamePool');
});

test('fetch_local colonies: the views and the growth-form rule of admin.js viewOf / gamePool (Codex review #390)', () => {
  const r = JSON.parse(
    py(`import importlib.util
sys.argv = ['x']
s = importlib.util.spec_from_file_location('fl', 'tools/fetch_local.py'); fl = importlib.util.module_from_spec(s); s.loader.exec_module(fl)
fl.FORMS, fl.SUG = {}, {}
o = lambda f: {'f': f, 'o': f}
G = {'C': {'views': {'wide': [o('c1'), o('c2'), o('c3')], 'medium': [o('c4')], 'macro': [o('c5')]}}}
gf = {'gf': {'c1': 'B', 'c2': 'xn', 'c3': 'E'}}
print(json.dumps([fl.colonies('C', G, {}, {'genera': {'C': {'lv': 2}}}), fl.colonies('C', G, {}, gf), fl.colonies('C', G, {}, {'gf': {'c1': 'B', 'c2': 'x'}})]))`)
  );
  // Switched to 2 levels by curation: medium joins Colony.
  assert.deepStrictEqual(r[0], {wide: 4, macro: 1});
  // Growth form not visible ('x'): out of Colony when the genus has several forms, in when it has one.
  assert.deepStrictEqual(r[1], {wide: 2, medium: 1, macro: 1});
  assert.deepStrictEqual(r[2], {wide: 3, medium: 1, macro: 1});
});

test('fetch_local --plan: a waiting candidate of a view that has its colonies holds no room (Codex review #390)', () => {
  // Finder-only A: Colony full (6 colonies), Close-up 5 of 6. One candidate waits, guessed Colony: the admin hides it
  // (full cell), so it must not use the one place Close-up still needs.
  const r = JSON.parse(
    py(`import importlib.util, io, contextlib
sys.argv = ['x', '--plan']
s = importlib.util.spec_from_file_location('fl', 'tools/fetch_local.py'); fl = importlib.util.module_from_spec(s); s.loader.exec_module(fl)
o = lambda f, obs, v=None: dict(f=f, o=obs, own=False, loc='dauin', **({'vg': v} if v else {}))
G = {'A': {'views': {'wide': [o(f'w{i}', f'w{i}') for i in range(6)], 'medium': [o(f'm{i}', f'm{i}') for i in range(5)]}}}
def run(c):
    fl.load_all = lambda: {'gen': {}, 'x': {'gen': G}, 'cand': {'A': c}}
    fl.finder_only = lambda d: ['A']
    fl.open = lambda *a, **k: io.StringIO('{}')
    fl.excluded = lambda *a, **k: False
    fl.set_aside = lambda f: False
    fl.SUG = {}
    out = io.StringIO()
    with contextlib.redirect_stdout(out): fl.main()
    return json.loads(out.getvalue())['A']
print(json.dumps([run([o('c1', 'c1', 'wide')]), run([o('c1', 'c1', 'medium')]), run([o('c1', 'c1')])]))`)
  );
  assert.deepStrictEqual(r[0], {finder: true, need: 1, dauin: 1, ph: 1}, "a full view's candidate holds no room");
  assert.deepStrictEqual(r[1], {finder: true, need: 1, dauin: 0, ph: 0}, 'a candidate of the view that lacks one does');
  assert.deepStrictEqual(r[2], {finder: true, need: 1, dauin: 0, ph: 0}, 'no guessed view: it may fill the gap, it counts');
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

// The starred genera open after the genera their card compares them to (Pierre, 2026-11-03; core.js starRefs, starWaits,
// model.js weighted; docs/LEARNING.md "Starred genera after their reference").
test('starRefs: every starred genus of the real data has the surveyed references its card names; no other genus has any', () => {
  const slate = slateOf(RAW),
    star = slate.filter(n => RAW.gen[n] && !RAW.gen[n].n);
  assert.ok(star.length > 0);
  star.forEach(n => {
    const R = starRefs(RAW, n);
    assert.ok(R.length > 0, `${n}: no reference`);
    R.forEach(r => {
      assert.ok(RAW.gen[r].n > 0, `${n}: reference ${r} is not a surveyed genus`);
      assert.ok(RAW.gen[n].look.includes(r), `${n}: reference ${r} is not one of its look-alikes`);
      assert.strictEqual(RAW.gen[r].ig, lectureGroup(RAW, n), `${n}: reference ${r} outside its lecture group`);
    });
  });
  slate.filter(n => !star.includes(n)).forEach(n => assert.deepStrictEqual(starRefs(RAW, n), [], n));
  BONUS.forEach(n => assert.deepStrictEqual(starRefs(RAW, n), [], n));
  // The card's example: Duncanopsammia ("Like Turbinaria, but corallites about 6 mm") waits for Turbinaria.
  assert.ok(starRefs(RAW, 'Duncanopsammia').includes('Turbinaria'));
});

test('starWaits: a starred genus is not eligible before its references are met, is after; a missing reference never blocks', () => {
  const D = {
      gen: {
        S: {n: 0, ig: 0, look: ['R1', 'R2', 'O']}, // starred, shown in group 1 (two look-alikes there)
        R1: {n: 1, ig: 1, look: ['S']},
        R2: {n: 2, ig: 1, look: []},
        O: {n: 3, ig: 2, look: []},
        T: {n: 0, ig: 1, look: ['S', 'U']}, // starred, looks like another starred genus (S) and a genus missing from the data
        V: {n: 0, ig: 0, look: ['W']} // starred, its only look-alike not on the slate
      },
      x: {gen: {W: {look: []}}}
    },
    list = Object.keys(D.gen);
  assert.deepStrictEqual(starRefs(D, 'S'), ['R1', 'R2']);
  const met = M => n => M.includes(n);
  assert.strictEqual(starWaits(D, 'S', list, met([])), true, 'no reference met: waits');
  assert.strictEqual(starWaits(D, 'S', list, met(['R1'])), true, 'one of two references met: still waits');
  assert.strictEqual(starWaits(D, 'S', list, met(['R1', 'R2'])), false, 'every reference met: eligible');
  assert.strictEqual(starWaits(D, 'S', ['S', 'R1'], met(['R1'])), false, 'a reference not in the list never holds it back');
  assert.strictEqual(starWaits(D, 'S', ['S'], met([])), false, 'no reference in the list: eligible');
  // Never a starred genus as a reference (no cycle), nor a genus missing from the data or off the slate.
  assert.deepStrictEqual(starRefs(D, 'T'), []);
  assert.strictEqual(starWaits(D, 'T', list, met([])), false);
  assert.deepStrictEqual(starRefs(D, 'V'), []);
  // A reference never waits itself; nor does a genus unknown to the data.
  ['R1', 'R2', 'O', 'W', 'Z'].forEach(n => assert.strictEqual(starWaits(D, n, list, met([])), false, n));
});
