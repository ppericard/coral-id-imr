// The fish curation (curation.json "fish", admin plan PR 4; autosort.js "Fish curation", admin.js fishAutoRun,
// fishOut): the fish auto-sort proposes the pass's sure judgments up to each species' target, never touches what Pierre
// decided (his "Not this" above all: only his click writes it, and a photo he marked so is never proposed again), and
// fish edits never touch a coral key, in the draft, in the Publish merge or in the published file.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block');
const {
  FISHT,
  fishTarget,
  fishParse,
  fishIdx,
  fishMine,
  fishCompare,
  fishRun,
  fishUndo,
  fishSure,
  autoCheck,
  autoState
} = require('../autosort.js');
const {merge3} = require('../core.js');

// Candidates: species s1 (a common one, cheatsheet cs: target 12) and s2 (target 8), photo ids never drawn as a Check.
const ids = (() => {
  const out = [];
  for (let i = 1000; out.length < 40; i++) if (!autoCheck(`fish-s-cand-${i}`)) out.push(`fish-s-cand-${i}`);
  return out;
})();
const chk = (() => {
  for (let i = 1000; ; i++) if (autoCheck(`fish-s-cand-${i}`)) return `fish-s-cand-${i}`;
})();
const sure = (e = 4, k = 'best') => ({jt: 'p1g0sm1', e, k});

test('fish targets: 8 observations per species, 12 for the PDF cheatsheet species, at most 20 (Pierre, 2026-11-04)', () => {
  assert.deepStrictEqual(FISHT, {obs: 8, top: 12, cap: 20});
  assert.strictEqual(fishTarget({id: 's1', cs: 3}), 12);
  assert.strictEqual(fishTarget({id: 's2'}), 8);
  assert.strictEqual(fishTarget(undefined), 8);
});

test('fish log codes: a / r, a Check, an undo, a time', () => {
  assert.deepStrictEqual(fishParse('a'), {check: false, undone: false, kind: 'a'});
  assert.deepStrictEqual(fishParse('?r'), {check: true, undone: false, kind: 'r'});
  assert.deepStrictEqual(fishParse('-a@t5a1kq'), {check: false, undone: true, kind: 'a', t: parseInt('t5a1kq', 36)});
  ['aw2B', 'x', '', 'a@'].forEach(c => assert.strictEqual(fishParse(c), null, c));
  const I = fishIdx({auto: {'2026-11-03': {f1: 'a', f2: 'r'}, '2026-11-04': {f1: '-a'}}});
  assert.deepStrictEqual(Object.keys(I).sort(), ['f1', 'f2']);
  assert.strictEqual(I.f1.day, '2026-11-04');
});

test('fishRun: sure adds up to the target, own first then the easiest; rejects; Checks drawn, not applied', () => {
  const cands = {
    s2: ids.slice(0, 12).map((f, i) => ({f, o: `obs${i}`, own: i === 11})),
    s1: [
      {f: ids[20], o: 'obsA'},
      {f: ids[21], o: 'obsA'},
      {f: ids[22], o: 'obsB'},
      {f: chk, o: 'obsC'}
    ]
  };
  const sug = {};
  cands.s2.forEach((p, i) => (sug[p.f] = sure(1 + (i % 5))));
  sug[ids[20]] = {...sure(5), ph: 'female', c: [0.1, 0, 0.9, 1]};
  sug[ids[21]] = sure(3, 'alt'); // the same observation: joins it for free
  sug[ids[22]] = sure(4, 'dup');
  sug[chk] = sure(5);
  const {F, R} = fishRun(cands, sug, {s1: {cs: 1}, s2: {}}, {}, '2026-11-04');
  assert.deepStrictEqual(R, {add: 10, reject: 1, check: 1, full: 4, off: 0});
  const in2 = Object.keys(F.add).filter(f => F.add[f] === 's2');
  assert.strictEqual(in2.length, 8, 'species s2 filled to its target of 8 observations');
  assert.ok(in2.includes(ids[11]), "Pierre's own photo first (rule 7), whatever its ease");
  const eases = in2.filter(f => f !== ids[11]).map(f => sug[f].e);
  assert.ok(Math.min(...eases) >= Math.max(...cands.s2.filter(p => !in2.includes(p.f)).map(p => sug[p.f].e)), 'the easiest next');
  assert.deepStrictEqual([F.add[ids[20]], F.add[ids[21]]], ['s1', 's1']);
  assert.deepStrictEqual([F.tags[ids[20]], F.ease[ids[20]], F.phase[ids[20]], F.crop[ids[20]]], ['p1g0sm1', 5, 'female', [0.1, 0, 0.9, 1]]);
  assert.strictEqual(F.seen[ids[22]], 1);
  assert.ok(!(chk in F.add) && F.auto['2026-11-04'][chk] === '?a', 'a Check is logged, not applied');
  assert.strictEqual(F.auto['2026-11-04'][ids[22]], 'r');
  assert.ok(!('out' in F), 'the auto-sort never writes Not this');
  // A second run decides nothing more (all logged), and the full species still waits.
  const again = fishRun(cands, sug, {s1: {cs: 1}, s2: {}}, F, '2026-11-04');
  assert.strictEqual(again.F, F);
  assert.deepStrictEqual(again.R, {add: 0, reject: 0, check: 0, full: 4, off: 0});
});

test('fishRun never touches what Pierre decided: his Not this above all, his rejects, exclusions, adds and tags', () => {
  const [a, b, c, d, e] = ids;
  const cands = {s1: [a, b, c, d, e].map((f, i) => ({f, o: `o${i}`}))},
    sug = Object.fromEntries([a, b, c, d, e].map(f => [f, sure(5)])),
    mine = {out: {[a]: 'x'}, seen: {[b]: 1}, exclude: {[c]: 'blurred'}, add: {[d]: 's1'}, tags: {[e]: 'o1g0sm1'}, ease: {[e]: 2}};
  const {F, R} = fishRun(cands, sug, {}, mine, '2026-11-04');
  assert.deepStrictEqual(R.add, 1);
  assert.deepStrictEqual(Object.keys(F.auto['2026-11-04']), [e], 'only the undecided photo');
  assert.deepStrictEqual([F.out, F.seen, F.exclude], [mine.out, mine.seen, mine.exclude]);
  assert.deepStrictEqual([F.tags[e], F.ease[e]], ['o1g0sm1', 2], 'his tags and ease stay his');
  assert.ok(!(a in F.add), 'a photo he marked Not this is never proposed again');
  // Not this wins over an add (his or the auto-sort's): the photo counts as not kept.
  assert.strictEqual(fishMine({add: {[a]: 's1'}, out: {[a]: 's2'}}, a), 'reject');
});

test('fish agreement: answered Checks and corrections count; under 90% the fish auto-sort is off, Checks go on', () => {
  const day = '2026-11-04',
    auto = {},
    F = {auto: {[day]: auto}, add: {}, seen: {}, out: {}};
  ids.slice(0, 10).forEach((f, i) => {
    auto[f] = i < 8 ? '?a' : 'a';
    if (i < 6)
      F.add[f] = 's1'; // agrees with 6 Checks
    else if (i < 8)
      F.seen[f] = 1; // disagrees with 2
    else F.out[f] = 's2'; // Not this on 2 applied adds: corrections
  });
  const C = fishCompare(F);
  assert.strictEqual(C.length, 10);
  assert.strictEqual(C.filter(x => x.ok).length, 6);
  const S = autoState(C).keep;
  assert.ok(!S.on && S.n === 10, 'keep off at 60%');
  const cands = {
      s1: [
        {f: ids[30], o: 'z'},
        {f: chk, o: 'y'}
      ]
    },
    sug = {[ids[30]]: sure(5), [chk]: sure(5)},
    r = fishRun(cands, sug, {}, F, day, S.on);
  assert.deepStrictEqual(r.R, {add: 0, reject: 0, check: 1, full: 0, off: 1});
});

test('fish edits never touch coral keys: the Publish merge and the published file', () => {
  const base = {v: 1, genera: {Acropora: {cover: 'a1'}}, quality: {q1: 2}, fish: {add: {f1: 's1'}}},
    mine = {...base, fish: {add: {f1: 's1', f2: 's1'}, out: {f3: 'x'}}},
    theirs = {...base, genera: {Acropora: {cover: 'a2'}}, quality: {q1: 3}, fish: {add: {f1: 's1'}, seen: {f4: 1}}};
  const m = merge3(base, mine, theirs);
  assert.deepStrictEqual(m.genera, theirs.genera);
  assert.deepStrictEqual(m.quality, theirs.quality);
  assert.deepStrictEqual(m.fish, {add: {f1: 's1', f2: 's1'}, out: {f3: 'x'}, seen: {f4: 1}});
  // fishRun returns the fish part only: whatever it decides, a coral draft stays as it was.
  const coral = {genera: {Acropora: {cover: 'a1'}}, quality: {q1: 2}, seen: {'cand:x': 1}},
    snap = JSON.stringify(coral);
  fishRun({s1: [{f: ids[0], o: 'o'}]}, {[ids[0]]: sure(5)}, {}, coral.fish, '2026-11-04');
  assert.strictEqual(JSON.stringify(coral), snap);
  // admin.js fishOut: what Publish writes under "fish": sorted maps, empty ones and empty days left out.
  const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8'),
    ctx = {};
  vm.runInNewContext(block(src, 'function fishOut(F) {', '\n}\n', {through: 1, file: 'admin.js'}) + ';this.fishOut = fishOut;', ctx);
  assert.deepStrictEqual(
    JSON.stringify(ctx.fishOut({seen: {}, add: {b: 's1', a: 's2'}, auto: {d2: {}, d1: {y: 'a', x: 'r'}}, tags: {a: null}})),
    JSON.stringify({add: {a: 's2', b: 's1'}, auto: {d1: {x: 'r', y: 'a'}}})
  );
  assert.strictEqual(JSON.stringify(ctx.fishOut(undefined)), '{}');
});

test('fishUndo: one fish auto decision taken back, never applied again; a value Pierre changed since stays his', () => {
  const [a, b] = ids,
    cands = {
      s1: [
        {f: a, o: 'oa'},
        {f: b, o: 'ob'}
      ]
    },
    sug = {[a]: {...sure(5), ph: 'male'}, [b]: sure(4, 'dup')},
    day = '2026-11-04';
  const {F} = fishRun(cands, sug, {}, {}, day);
  assert.deepStrictEqual([F.add[a], F.seen[b]], ['s1', 1]);
  const mine = {...F, ease: {...F.ease, [a]: 2}}, // Pierre changed the ease since
    U = fishUndo(fishUndo(mine, a, fishSure(sug[a])), b, fishSure(sug[b]));
  assert.ok(!U.add && !U.seen, 'the add and the reject leave');
  assert.deepStrictEqual([U.tags, U.phase, U.ease], [undefined, undefined, {[a]: 2}], 'his ease stays his');
  assert.deepStrictEqual(U.auto[day], {[a]: '-a', [b]: '-r'});
  assert.strictEqual(fishUndo(U, a, fishSure(sug[a])), U, 'an undone decision is not undone twice');
  const again = fishRun(cands, sug, {}, U, day);
  assert.strictEqual(again.F, U, 'never applied again');
  assert.deepStrictEqual(fishCompare(U), [], 'an undone decision counts in no agreement');
});
