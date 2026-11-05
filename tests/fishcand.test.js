// The fish Candidates swiper (admin plan PR 5a; autosort.js "Fish Candidates", admin-fish.js renderFishCand): the queue
// lists what Pierre has not decided, the thinnest species first, stops at each species' target, keeps the fish
// auto-sort's Checks his to answer; his clicks write the fish part of the draft as the auto-sort does (tags and ease
// beside the add), never "out" (Not this) and never a coral key; his answers to Checks are timed for the agreement.
const test = require('node:test'),
  assert = require('node:assert');
const {
  fishQueue,
  fishPlay,
  fishAdd,
  fishReject,
  fishExclude,
  fishRun,
  fishCompare,
  fishSigs,
  fishStamp,
  fishIdx,
  fishMine,
  fishNotThis,
  fishState,
  fishOn,
  fishPhase,
  fishSet,
  fishTag,
  fishUndo,
  autoCheck
} = require('../autosort.js');
const {merge3} = require('../core.js');

const ids = (() => {
  const out = [];
  for (let i = 2000; out.length < 40; i++) if (!autoCheck(`fish-q-cand-${i}`)) out.push(`fish-q-cand-${i}`);
  return out;
})();
const chkId = (() => {
  for (let i = 2000; ; i++) if (autoCheck(`fish-q-cand-${i}`)) return `fish-q-cand-${i}`;
})();
const ph = (f, o = f, x = {}) => ({f, o, t: 'X', ...x});

test('fishQueue: the thinnest species first, its photos together; best, alt, not judged, dup, then the easiest, whoever took them', () => {
  const cands = {
      s1: [ph(ids[0]), ph(ids[1])],
      s2: [ph(ids[2]), ph(ids[3], ids[3], {own: true}), ph(ids[4]), ph(ids[5]), ph(ids[6])],
      s3: [ph(ids[7])]
    },
    species = {s1: {id: 's1'}, s2: {id: 's2'}, s3: {id: 's3', cs: 1}},
    sug = {
      [ids[2]]: {jt: 'p1g0sm1', e: 5, k: 'dup'},
      [ids[3]]: {jt: 'p1g0sm1', e: 2, k: 'best'},
      [ids[4]]: {jt: 'p1g0sm1r', e: 2, k: 'best'},
      [ids[5]]: {jt: 'p1g0sm1', e: 4, k: 'best'},
      [ids[6]]: {jt: 'p1g0sm1', e: 5, k: 'alt'}
    },
    // s1 has one observation in play out of 8, s3 none out of 12 (a cheatsheet species), s2 none out of 8.
    F = {add: {[ids[1]]: 's1'}};
  const Q = fishQueue(cands, sug, species, F);
  assert.deepStrictEqual(
    Q.map(x => [x.sid, x.p.f]),
    [
      ['s2', ids[5]], // the best photos first, the easiest first
      ['s2', ids[4]], // at equal ease, the reference photo
      ['s2', ids[3]], // Pierre's own: no priority (Pierre, 2026-11-06)
      ['s2', ids[6]], // another angle
      ['s2', ids[2]], // a near-duplicate last (the pass is sure it goes: set aside)
      ['s3', ids[7]],
      ['s1', ids[0]] // 1 of 8 in play: thicker than the two empty species
    ]
  );
  assert.strictEqual(Q.find(x => x.p.f === ids[2]).aside, true);
  assert.deepStrictEqual(
    Q.filter(x => x.sid === 's3').map(x => [x.n, x.target]),
    [[0, 12]]
  );
  assert.ok(!Q.some(x => x.p.f === ids[1]), 'a photo in play is not a candidate');
});

test('fishQueue: what Pierre decided leaves it (in play, rejected, excluded, Not this); an auto decision he undid comes back', () => {
  const cands = {s1: [ph(ids[0]), ph(ids[1]), ph(ids[2]), ph(ids[3]), ph(ids[4])]},
    F = {
      add: {[ids[0]]: 's1'},
      seen: {[ids[1]]: 1},
      exclude: {[ids[2]]: 'excluded'},
      out: {[ids[3]]: 'x'},
      auto: {'2026-11-05': {[ids[4]]: '-at'}}
    };
  const Q = fishQueue(cands, {}, {s1: {}}, F);
  assert.deepStrictEqual(
    Q.map(x => x.p.f),
    [ids[4]]
  );
  assert.strictEqual(Q[0].aside, false);
});

test('fishQueue stops at the target: an observation more is "full", another photo of one in play is not; a Check never is', () => {
  const cands = {s1: []},
    F = {add: {}};
  for (let i = 0; i < 8; i++) {
    cands.s1.push(ph(ids[i], 'obs' + i));
    F.add[ids[i]] = 's1';
  }
  cands.s1.push(ph(ids[20], 'obs3'), ph(ids[21], 'obs99'), ph(chkId, 'obs98'));
  F.auto = {'2026-11-05': {[chkId]: '?a'}};
  const Q = fishQueue(cands, {}, {s1: {id: 's1'}}, F),
    by = Object.fromEntries(Q.map(x => [x.p.f, x]));
  assert.strictEqual(by[ids[20]].full, false, 'another photo of an observation in play adds none');
  assert.strictEqual(by[ids[21]].full, true);
  assert.strictEqual(by[chkId].full, false);
  assert.strictEqual(by[chkId].chk, true);
  assert.strictEqual(fishPlay(cands, F).s1.size, 8);
  // A rejected add frees its observation: the species is under its target again.
  const G = fishReject(F, ids[0]);
  assert.strictEqual(fishPlay(cands, G).s1.size, 7);
  assert.strictEqual(fishQueue(cands, {}, {s1: {}}, G).find(x => x.p.f === ids[21]).full, false);
});

test("fishAdd: in play for its species with the pass's tags, ease, phase and crop where Pierre has none; never out", () => {
  const j = {jt: 'p1g0sm1j', e: 3, k: 'best', ph: 'female', c: [0.1, 0.1, 0.9, 0.9]};
  const F0 = {tags: {[ids[0]]: 'o1g0sm1'}, seen: {[ids[0]]: 1}};
  const F = fishAdd(F0, ids[0], 's7', j);
  assert.strictEqual(F.add[ids[0]], 's7');
  assert.strictEqual(F.tags[ids[0]], 'o1g0sm1', 'a tag he gave stays his');
  assert.strictEqual(F.ease[ids[0]], 3);
  assert.strictEqual(F.phase[ids[0]], 'female');
  assert.deepStrictEqual(F.crop[ids[0]], j.c);
  assert.ok(!(ids[0] in F.seen), 'a photo he had rejected and adds now is no longer rejected');
  assert.strictEqual(fishMine(F, ids[0]), 'add');
  assert.ok(!F.out && !F.auto, 'never Not this, never logged as auto');
  assert.deepStrictEqual(F0, {tags: {[ids[0]]: 'o1g0sm1'}, seen: {[ids[0]]: 1}}, 'the draft given is not changed');
  // Not judged: the add alone.
  assert.deepStrictEqual(fishAdd({}, ids[1], 's7', null), {add: {[ids[1]]: 's7'}});
});

test('fishReject and fishExclude take a photo out of play; Pierre answering a Check is compared, a correction too', () => {
  const cands = {s1: [ph(ids[0]), ph(ids[1]), ph(chkId)]},
    sug = {[ids[0]]: {jt: 'p1g0sm1', e: 4, k: 'best'}, [chkId]: {jt: 'p1g0sm1', e: 4, k: 'best'}};
  let {F} = fishRun(cands, sug, {s1: {}}, {}, '2026-11-05');
  assert.strictEqual(F.add[ids[0]], 's1');
  assert.strictEqual(F.auto['2026-11-05'][chkId], '?a');
  // His answer to the Check (Reject) and his correction of the auto add (Out of play): two disagreements.
  F = fishReject(fishReject(F, chkId), ids[0]);
  assert.ok(!(ids[0] in F.add));
  assert.strictEqual(F.seen[ids[0]], 1);
  const C = fishCompare(F);
  assert.deepStrictEqual(
    C.map(c => [c.f, c.how, c.ok]).sort(),
    [
      [chkId, 'check', false],
      [ids[0], 'fix', false]
    ].sort()
  );
  const X = fishExclude({add: {[ids[1]]: 's1'}}, ids[1]);
  assert.deepStrictEqual(X, {add: {}, exclude: {[ids[1]]: 'excluded'}});
});

test('fishStamp: the time of his answer goes into the log code of the photo he just answered, only that one', () => {
  const F0 = {auto: {'2026-11-05': {[chkId]: '?a', [ids[0]]: 'at'}}, add: {[ids[0]]: 's1'}};
  const before = fishSigs(F0);
  assert.deepStrictEqual(before, {});
  const F1 = fishAdd(F0, chkId, 's1', null);
  const A = fishStamp(F1, before, 1762300000);
  assert.strictEqual(A['2026-11-05'][chkId], '?a@' + (1762300000).toString(36));
  assert.strictEqual(A['2026-11-05'][ids[0]], 'at');
  assert.strictEqual(fishIdx({...F1, auto: A})[chkId].d.t, 1762300000);
  // Nothing new answered: nothing to stamp.
  assert.strictEqual(fishStamp(F1, fishSigs(F1), 1762300100), null);
});

test('fish Candidates clicks never touch a coral key, through the Publish merge', () => {
  const base = {genera: {Acropora: {add: {c1: 'wide'}}}, seen: {'cand:c2': 1}, fish: {add: {[ids[0]]: 's1'}}};
  let fish = fishAdd(base.fish, ids[1], 's1', {jt: 'p1g0sm1', e: 4, k: 'best'});
  fish = fishReject(fish, ids[0]);
  fish = fishExclude(fish, ids[2]);
  const draft = {...base, fish};
  const out = merge3(base, draft, base);
  assert.deepStrictEqual(out.genera, base.genera);
  assert.deepStrictEqual(out.seen, base.seen);
  assert.strictEqual(out.fish.add[ids[1]], 's1');
  assert.ok(!(ids[0] in out.fish.add));
  assert.strictEqual(out.fish.seen[ids[0]], 1);
  assert.strictEqual(out.fish.exclude[ids[2]], 'excluded');
  assert.ok(!out.fish.out);
});

test("Not this (5b): the photo waits as the other species' candidate, marked from; Add puts it in play there; never proposed again", () => {
  const cands = {s1: [ph(ids[0]), ph(ids[1])], s2: [ph(ids[2])]},
    sug = {[ids[0]]: {jt: 'p1g0sm1', e: 4, k: 'best'}};
  let {F} = fishRun(cands, sug, {s1: {}, s2: {}}, {}, '2026-11-05');
  assert.strictEqual(F.add[ids[0]], 's1');
  F = fishNotThis(F, ids[0], 's2', 's1');
  assert.deepStrictEqual(F.out, {[ids[0]]: 's2'});
  assert.ok(!(ids[0] in F.add), 'its add on the wrong species goes');
  assert.deepStrictEqual(fishState(F, ids[0], 's1'), {sid: 's2', st: null});
  assert.strictEqual(fishMine(F, ids[0]), 'reject', 'against the auto add on its first species: a correction');
  assert.deepStrictEqual(
    fishCompare(F).map(c => [c.f, c.how, c.ok]),
    [[ids[0], 'fix', false]]
  );
  let Q = fishQueue(cands, sug, {s1: {}, s2: {}}, F);
  const m = Q.find(x => x.p.f === ids[0]);
  assert.strictEqual(m.sid, 's2');
  assert.strictEqual(m.from, 's1');
  F = fishAdd(F, ids[0], 's2', sug[ids[0]]);
  assert.ok(fishOn(F, ids[0], 's2'));
  assert.strictEqual(fishPlay(cands, F).s2.size, 1);
  assert.ok(!fishPlay(cands, F).s1, 'nothing in play on its first species');
  assert.ok(!fishQueue(cands, sug, {s1: {}, s2: {}}, F).some(x => x.p.f === ids[0]));
  // The auto-sort never proposes it again, an Undo of its first decision leaves the move alone.
  assert.strictEqual(fishRun(cands, sug, {s1: {}, s2: {}}, F, '2026-11-06').F, F);
  const U = fishUndo(F, ids[0], 's1');
  assert.strictEqual(U.out[ids[0]], 's2');
  assert.strictEqual(U.add[ids[0]], 's2');
  // Back to its first species: the mark goes, it waits there again; "x": gone from every species.
  const B = fishNotThis(fishNotThis({}, ids[1], 's2', 's1'), ids[1], 's1', 's1');
  assert.deepStrictEqual(fishState(B, ids[1], 's1'), {sid: 's1', st: null});
  assert.deepStrictEqual(B.out, {});
  const X = fishNotThis({add: {[ids[1]]: 's1'}, seen: {}}, ids[1], 'x', 's1');
  assert.strictEqual(fishState(X, ids[1], 's1').st, 'gone');
  assert.ok(!fishQueue(cands, {}, {}, X).some(x => x.p.f === ids[1]));
  // An add that names another species than the out (a stale add) is not in play.
  assert.ok(!fishOn({add: {[ids[1]]: 's1'}, out: {[ids[1]]: 's2'}}, ids[1], 's1'));
});

test("missing phases first (5b): a phase none of the species' photos in play shows comes first in its species", () => {
  const cands = {s1: [ph(ids[0]), ph(ids[1], ids[1], {st: 'juvenile'}), ph(ids[2]), ph(ids[3])]},
    sug = {
      [ids[0]]: {jt: 'p1g0sm1', e: 5, k: 'best'},
      [ids[2]]: {jt: 'p1g0sm1', e: 4, k: 'best', ph: 'terminal'},
      [ids[3]]: {jt: 'p1g0sm1', e: 3, k: 'best', ph: 'female'}
    };
  // In play: a female (ids[3]).
  const F = {add: {[ids[3]]: 's1'}};
  const Q = fishQueue(cands, sug, {s1: {}}, F);
  assert.deepStrictEqual(
    Q.map(x => [x.p.f, x.ph, x.nph]),
    [
      [ids[2], 'male', true], // terminal phase: the pass's tag, a new phase, the easier of the two
      [ids[1], 'juvenile', true], // juvenile: the source's life stage, not judged
      [ids[0], '', false]
    ]
  );
  // Pierre's values win over the pass's and the source's: his tags without j and no phase make it an adult.
  assert.strictEqual(fishPhase(cands.s1[1], null, {tags: {[ids[1]]: 'p1g0sm1'}}), '');
  assert.strictEqual(fishPhase(cands.s1[0], sug[ids[0]], {tags: {[ids[0]]: 'p1g0sm1j'}}), 'juvenile');
  assert.strictEqual(fishPhase(cands.s1[2], sug[ids[2]], {phase: {[ids[2]]: ''}}), '');
});

test("fishSet and fishTag (5b): Pierre's tag, ease, phase or crop; a field the auto-sort wrote becomes his", () => {
  const cands = {s1: [ph(ids[0])]},
    sug = {[ids[0]]: {jt: 'p1g0sm1r', e: 4, k: 'best'}};
  let {F} = fishRun(cands, sug, {s1: {}}, {}, '2026-11-05');
  assert.strictEqual(F.auto['2026-11-05'][ids[0]], 'ate');
  F = fishSet(F, ids[0], 'tags', fishTag(F.tags[ids[0]], 2, 'n'));
  assert.strictEqual(F.tags[ids[0]], 'p1n0sm1r');
  assert.strictEqual(F.auto['2026-11-05'][ids[0]], 'ae', 'its tags are his now: an Undo leaves them');
  F = fishSet(F, ids[0], 'ease', 2);
  assert.strictEqual(F.auto['2026-11-05'][ids[0]], 'a');
  const U = fishUndo(F, ids[0], 's1');
  assert.strictEqual(U.tags[ids[0]], 'p1n0sm1r');
  assert.strictEqual(U.ease[ids[0]], 2);
  assert.ok(!(ids[0] in U.add));
  // Flags: toggled, kept in the rubric's order with the tool's own; a bad code starts from a plain profile one.
  assert.strictEqual(fishTag('p1g0sm1r', 'j'), 'p1g0sm1jr');
  assert.strictEqual(fishTag('p1g0sm1jcr', 'j'), 'p1g0sm1cr');
  assert.strictEqual(fishTag('', 6, 'x'), 'p1g0smx');
  assert.strictEqual(fishTag('o1g1ssm', 3, '3'), 'o1g3ssm');
  // null takes his value off.
  assert.ok(!(ids[0] in fishSet(F, ids[0], 'phase', null).phase));
  assert.strictEqual(fishSet({}, ids[0], 'phase', '').phase[ids[0]], '');
});

test("fishRun counts a photo moved with Not this and added to its new species toward that species' target (Codex review #602)", () => {
  const cands = {s1: [ph(ids[30], 'm1')], s2: []},
    sug = {};
  for (let i = 0; i < 9; i++) {
    cands.s2.push(ph(ids[i], 'o' + i));
    sug[ids[i]] = {jt: 'p1g0sm1', e: 4, k: 'best'};
  }
  let F = fishAdd(fishNotThis({}, ids[30], 's2', 's1'), ids[30], 's2', null);
  const {F: G, R} = fishRun(cands, sug, {s1: {}, s2: {}}, F, '2026-11-05');
  assert.strictEqual(fishPlay(cands, G).s2.size, 8, 'the target, the moved observation included');
  assert.strictEqual(R.add, 7);
  assert.strictEqual(R.full, 2);
});
