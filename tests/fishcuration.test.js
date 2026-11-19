require('./slot.js').testGuard();
// The fish curation (curation.json "fish"; autosort.js "Fish curation", admin.js fishAutoRun,
// fishOut): the fish auto-sort proposes the pass's sure judgments up to each species' target, never touches what the admin
// decided (the "Not this" above all: only the admin's click writes it, and a photo marked so is never proposed again), and
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
  fishOwn,
  fishAdd,
  fishReject,
  fishNotThis,
  fishStamp,
  fishSigs,
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
  assert.deepStrictEqual(FISHT, {obs: 8, top: 12, cap: 20, wink: 5}); // wink: tests/winkadmin.test.js
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

test('fishRun: sure adds up to the target, the easiest first whoever took them; rejects; Checks drawn, not applied', () => {
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
  sug[ids[11]] = sure(1); // the admin's own, very hard
  sug[ids[20]] = {...sure(5), ph: 'female', c: [0.1, 0, 0.9, 1]};
  sug[ids[21]] = sure(3, 'alt'); // the same observation: joins it for free
  sug[ids[22]] = sure(4, 'dup');
  sug[chk] = sure(5);
  const {F, R} = fishRun(cands, sug, {s1: {cs: 1}, s2: {}}, {}, '2026-11-04');
  assert.deepStrictEqual(R, {add: 10, back: 0, reject: 1, check: 1, full: 4, off: 0});
  const in2 = Object.keys(F.add).filter(f => F.add[f] === 's2');
  assert.strictEqual(in2.length, 8, 'species s2 filled to its target of 8 observations');
  // The admin's own photo (ease 2) has no priority: it waits behind easier ones.
  assert.ok(!in2.includes(ids[11]), "Pierre's own photo is not forced in");
  const eases = in2.map(f => sug[f].e);
  assert.ok(Math.min(...eases) >= Math.max(...cands.s2.filter(p => !in2.includes(p.f)).map(p => sug[p.f].e)), 'the easiest first');
  assert.deepStrictEqual([F.add[ids[20]], F.add[ids[21]]], ['s1', 's1']);
  assert.deepStrictEqual([F.tags[ids[20]], F.ease[ids[20]], F.phase[ids[20]], F.crop[ids[20]]], ['p1g0sm1', 5, 'female', [0.1, 0, 0.9, 1]]);
  assert.strictEqual(F.seen[ids[22]], 1);
  assert.ok(!(chk in F.add) && F.auto['2026-11-04'][chk] === '?a', 'a Check is logged, not applied');
  assert.strictEqual(F.auto['2026-11-04'][ids[22]], 'r');
  assert.ok(!('out' in F), 'the auto-sort never writes Not this');
  // A second run decides nothing more (all logged), and the full species still waits.
  const again = fishRun(cands, sug, {s1: {cs: 1}, s2: {}}, F, '2026-11-04');
  assert.strictEqual(again.F, F);
  assert.deepStrictEqual(again.R, {add: 0, back: 0, reject: 0, check: 0, full: 4, off: 0});
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
  // Not this wins over an add (the admin's or the auto-sort's): the photo counts as not kept.
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
  assert.deepStrictEqual(r.R, {add: 0, back: 0, reject: 0, check: 1, full: 0, off: 1});
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
  // The admin sets the ease afterwards (the edit goes through fishOwn: the field becomes the admin's).
  const mine = {...fishOwn(F, a, 'ease'), ease: {...F.ease, [a]: 2}},
    U = fishUndo(fishUndo(mine, a, 's1'), b, 's1');
  assert.deepStrictEqual([U.add, U.seen], [{}, {}], 'the add and the reject leave (the maps stay, empty)');
  assert.deepStrictEqual([U.tags, U.phase, U.ease], [{}, {}, {[a]: 2}], 'his ease stays his');
  assert.deepStrictEqual(U.auto[day], {[a]: '-atp', [b]: '-r'});
  assert.strictEqual(fishUndo(U, a, 's1'), U, 'an undone decision is not undone twice');
  const again = fishRun(cands, sug, {}, U, day);
  assert.strictEqual(again.F, U, 'never applied again');
  assert.deepStrictEqual(fishCompare(U), [], 'an undone decision counts in no agreement');
});

test("fishUndo leaves alone a value Pierre had given before the run, even one equal to the pass's (Codex review #479)", () => {
  const [a] = ids,
    sug = {[a]: {...sure(5), ph: 'male', c: [0.1, 0, 0.9, 1]}},
    day = '2026-11-04',
    before = {tags: {[a]: 'p1g0sm1'}, ease: {[a]: 5}}; // the admin's, the same values the pass gives
  const {F} = fishRun({s1: [{f: a, o: 'oa'}]}, sug, {}, before, day);
  assert.strictEqual(F.auto[day][a], 'apc', 'the run wrote the phase and the crop only');
  const U = fishUndo(F, a, 's1');
  assert.deepStrictEqual([U.tags, U.ease], [before.tags, before.ease], 'his tags and ease stay');
  assert.deepStrictEqual([U.phase, U.crop, U.add], [{}, {}, {}], 'what the run wrote leaves');
  assert.strictEqual(U.auto[day][a], '-apc');
  assert.deepStrictEqual(fishParse('-apc'), {check: false, undone: true, kind: 'a', w: ['phase', 'crop']});
  ['rt', '?at', 'ax'].forEach(c => assert.strictEqual(fishParse(c), null, c));
});

test('fishUndo after a new judging pass, a Not this, a partial edit, a publish (Codex review #479)', () => {
  const [a, b, c] = ids,
    day = '2026-11-04',
    cands = {s1: [a, b, c].map((f, i) => ({f, o: `o${i}`}))},
    sug = Object.fromEntries([a, b, c].map(f => [f, {...sure(5), ph: 'male', c: [0.1, 0, 0.9, 1]}])),
    {F} = fishRun(cands, sug, {}, {}, day);
  // A new judging pass replaced the judgment (ease 2, no phase) or removed it: the Undo takes back what the run wrote,
  // the values it applied (ease 5, the phase, the crop), not the new judgment's.
  const U1 = fishUndo(F, a, 's1');
  assert.deepStrictEqual([a in U1.add, a in U1.tags, a in U1.ease, a in U1.phase, a in U1.crop], [false, false, false, false, false]);
  // The admin sent the photo to another species afterwards (the add names it): that choice stays; the run's fields leave.
  const moved = {...F, add: {...F.add, [b]: 's2'}},
    U2 = fishUndo(moved, b, 's1');
  assert.strictEqual(U2.add[b], 's2');
  assert.ok(!(b in U2.ease));
  // The admin removed the crop by hand first (partial): the Undo removes the rest, nothing fails.
  const part = {...F, crop: {}},
    U3 = fishUndo(part, c, 's1');
  assert.ok(!(c in U3.add) && !(c in U3.tags) && U3.auto[day][c].startsWith('-a'));
  // Published, then undone on this device while another device published another add and ease: the Publish merge keeps
  // theirs and removes only this photo's entries.
  const theirs = {...F, add: {...F.add, x: 's9'}, ease: {...F.ease, x: 3}},
    m = merge3({fish: F}, {fish: U1}, {fish: theirs}).fish;
  assert.deepStrictEqual([m.add.x, m.ease.x, a in m.add, a in m.ease], ['s9', 3, false, false]);
  assert.strictEqual(m.auto[day][a].slice(0, 2), '-a');
  // An unknown species (the candidate gone): the add is not taken.
  assert.strictEqual(fishUndo(F, a, undefined).add[a], 's1');
});

// The route back (Pierre, 2026-11-19, Q438): a photo the run set aside (log r) comes back into his draft when a judgement
// made since is a sure add (a crop that saves it, Q430), logged b, undoable; never a photo he decided himself.
const old = '2026-11-12',
  today = '2026-11-20',
  saved = {jt: 'p1g0sl1', e: 4, k: 'best', c: [0.2, 0.1, 0.8, 0.9]},
  aside = f => ({seen: {[f]: 1}, auto: {[old]: {[f]: 'r'}}}),
  judged = d => () => d;

test('fish log codes: b brought back, with the fields it wrote; never a Check', () => {
  assert.deepStrictEqual(fishParse('btec'), {check: false, undone: false, kind: 'b', w: ['tags', 'ease', 'crop']});
  assert.deepStrictEqual(fishParse('-b'), {check: false, undone: true, kind: 'b'});
  ['?b', '?bt', 'bx', 'rc'].forEach(c => assert.strictEqual(fishParse(c), null, c));
});

test('fishRun brings back a photo it set aside once a newer judgement is a sure add: in, cropped, logged b', () => {
  const [a] = ids,
    cands = {s1: [{f: a, o: 'oa'}]},
    {F, R} = fishRun(cands, {[a]: saved}, {}, aside(a), today, true, judged('2026-11-19'));
  assert.deepStrictEqual(R, {add: 0, back: 1, reject: 0, check: 0, full: 0, off: 0});
  assert.deepStrictEqual([F.add[a], a in F.seen, F.tags[a], F.ease[a], F.crop[a]], ['s1', false, 'p1g0sl1', 4, saved.c]);
  assert.strictEqual(F.auto[today][a], 'btec');
  assert.strictEqual(F.auto[old][a], 'r', 'the earlier reject stays in the log');
  assert.strictEqual(fishMine(F, a), 'add');
  // Judged the same day as the reject: a judgement of that day may come after it.
  assert.strictEqual(fishRun(cands, {[a]: saved}, {}, aside(a), today, true, judged(old)).R.back, 1);
  // Logged, so never taken again; and the auto-sort off (its keep agreement): nothing applied.
  assert.strictEqual(fishRun(cands, {[a]: saved}, {}, F, today, true, judged('2026-11-19')).F, F);
  const off = fishRun(cands, {[a]: saved}, {}, aside(a), today, false, judged('2026-11-19'));
  assert.deepStrictEqual([off.F.seen, off.R.off, off.R.back], [{[a]: 1}, 1, 0]);
});

test('fishRun never brings back a photo with no newer sure judgement, nor one Pierre decided himself', () => {
  const [a] = ids,
    cands = {s1: [{f: a, o: 'oa'}]},
    run = (F, sug = {[a]: saved}, at = judged('2026-11-19')) => fishRun(cands, sug, {}, F, today, true, at),
    none = (F, why, sug, at) => {
      const r = run(F, sug, at);
      assert.strictEqual(r.F, F, why);
      assert.strictEqual(r.R.back, 0, why);
    };
  none(aside(a), 'judged before the reject', undefined, judged('2026-11-10'));
  none(aside(a), 'no judgement date', undefined, null);
  none(aside(a), 'still other species one could take for it', {[a]: {...saved, jt: 'p1g0slk'}});
  none(aside(a), 'unsure', {[a]: {...saved, u: ['crop'], n: 'a sliver'}});
  none(aside(a), 'a near-duplicate', {[a]: {...saved, k: 'dup'}});
  none({seen: {[a]: 1}, auto: {[old]: {[a]: '?r'}}}, 'a Check he answered');
  none({seen: {[a]: 1}, auto: {[old]: {[a]: '-r'}}}, 'a reject he undid, then rejected himself');
  none({seen: {[a]: 1}, auto: {[old]: {[a]: 'r@t5a1kq'}}}, 'a reject he corrected, then rejected again');
  none({seen: {[a]: 1}}, 'his own reject (no log)');
  none({...aside(a), exclude: {[a]: 'blurred'}}, 'excluded');
  none({...aside(a), out: {[a]: 'x'}}, 'Not this');
  none({...aside(a), add: {[a]: 's1'}}, 'added');
  none({...aside(a), tags: {[a]: 'p1g0slk'}}, 'his tags');
  none({...aside(a), crop: {[a]: [0, 0, 1, 1]}}, 'his crop (Full photo)');
});

test("Pierre's own reject of a photo the run had set aside is his: the route back never takes it for the run's", () => {
  const [a] = ids,
    cands = {s1: [{f: a, o: 'oa'}]},
    at = judged('2026-11-19');
  // Not this, then back to its species: the photo waits as a candidate, its log still the run's 'r'; his Reject then.
  const moved = fishNotThis(fishNotThis(aside(a), a, 's2', 's1'), a, 's1', 's1'),
    R1 = fishReject(moved, a);
  assert.strictEqual(R1.auto[old][a], '-r');
  assert.strictEqual(fishRun(cands, {[a]: saved}, {}, R1, today, true, at).R.back, 0);
  // His Add then his Reject: the Add is a correction, timed (fishStamp), and the Reject marks it his.
  const A1 = fishAdd(aside(a), a, 's1', saved),
    T = {...A1, auto: fishStamp(A1, fishSigs(aside(a)), 1763600000)},
    R2 = fishReject(T, a);
  assert.match(R2.auto[old][a], /^r@/);
  assert.strictEqual(fishRun(cands, {[a]: saved}, {}, R2, today, true, at).R.back, 0);
  // A photo the run never logged: his Reject writes nothing in the log.
  assert.ok(!('auto' in fishReject({}, a)));
});

test('fishRun brings back at target as a candidate; Undo sets aside again; b counts as in for the agreement', () => {
  const [a, b, c] = ids,
    at = judged('2026-11-19'),
    full = {s1: {tgt: 1}},
    cands = {
      s1: [
        {f: a, o: 'oa'},
        {f: b, o: 'ob'}
      ]
    },
    F0 = {...aside(b), add: {[a]: 's1'}};
  // Its species at its target: no add, the photo waits as a candidate (the game plays a sure candidate by itself).
  const {F, R} = fishRun(cands, {[b]: saved}, full, F0, today, true, at);
  assert.deepStrictEqual([R.back, R.full, b in F.add, b in F.seen, b in (F.crop || {})], [1, 0, false, false, false]);
  assert.strictEqual(F.auto[today][b], 'b');
  assert.strictEqual(fishUndo(F, b, 's1').seen[b], 1, 'Undo sets it aside again');
  // With room: in; Undo takes the add and its fields off and sets it aside again, logged undone, never brought back.
  const G = fishRun({s1: [{f: c, o: 'oc'}]}, {[c]: saved}, {}, aside(c), today, true, at).F,
    U = fishUndo(G, c, 's1');
  assert.deepStrictEqual([c in U.add, c in U.tags, c in U.ease, c in U.crop, U.seen[c]], [false, false, false, false, 1]);
  assert.strictEqual(U.auto[today][c], '-btec');
  assert.strictEqual(fishRun({s1: [{f: c, o: 'oc'}]}, {[c]: saved}, {}, U, today, true, at).F, U);
  assert.deepStrictEqual(fishCompare(U), [], 'an undone decision counts in no agreement');
  // Pierre rejects a photo brought back: a correction of an in.
  const X = fishReject(G, c);
  assert.deepStrictEqual(
    fishCompare(X).map(x => [x.f, x.a, x.p, x.how]),
    [[c, 'add', 'reject', 'fix']]
  );
  // He changes the crop it wrote: his own, so an Undo leaves it.
  const O = {...fishOwn(G, c, 'crop'), crop: {...G.crop, [c]: [0, 0, 1, 1]}};
  assert.deepStrictEqual(fishUndo(O, c, 's1').crop[c], [0, 0, 1, 1]);
});
