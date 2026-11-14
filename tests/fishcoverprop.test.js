// Photo review › Cover proposals (admin-covers.js; Pierre, 2026-11-14 after Q339 (b), #864: "Si tu as mieux fait moi des
// propositions"): where his ★ Cover of a family or a genus differs from the default cover rule's pick, the rule's photo is
// proposed beside his; Accept sets it as his cover in the draft (one Undo step), Keep mine records the pair in fish.kept;
// a proposal is done once answered, once his cover changed, or once the rule agrees; never written to curation.json by a
// tool (rule A1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {
    coverKey,
    coverProposal,
    coverOpen,
    coverAccept,
    coverKeep,
    coverKeptN,
    coverWhy,
    nodeCover,
    nodeCoverWhy
  } = require('../admin-covers.js'),
  {lightOpen, lightKeep} = require('../admin-light.js'),
  {fishCover, fishCoverOf, fishLeafCover, fishWaiting} = require('../autosort.js'),
  {merge3} = require('../core.js');

// Family f:A, genus g:B (species s1, s2); s2 seen by more observers around the centre. Every photo an adult reference
// photo (ease 4, rep) but fi9, a juvenile of s1.
const L = [
  {f: 'fi1', sp: 's1', rep: true},
  {f: 'fi2', sp: 's1', rep: true},
  {f: 'fi3', sp: 's2', rep: true},
  {f: 'fi4', sp: 's2', rep: true},
  {f: 'fi9', sp: 's1', rep: true, ph: 'juvenile'}
];
const J = {
    fi1: {e: 4, jt: 'p1g0sl1'},
    fi2: {e: 4, jt: 'p1g0sl1'},
    fi3: {e: 4, jt: 'p1g0sl1'},
    fi4: {e: 5, jt: 'p1g0sl1'},
    fi9: {e: 5, jt: 'p1g0sl1j'}
  },
  j = f => J[f] || null;
const SEEN = {s1: [2, 5], s2: [9, 30]},
  seen =
    (S = SEEN) =>
    sid =>
      S[sid] || [0, 0];
const prop = (F, id = 'f:A', S) => coverProposal(id, L, F, j, seen(S));
const draft = () => ({genera: {'f:A': {cover: 'fi1', feat: {s1: ['fi2']}}, 'g:B': {cover: 'fi4'}}});
// Each test's list: a family and a genus node on the same photos, as admin-covers.js coverList gives them.
const list = (F, S) => ['f:A', 'g:B'].map(id => prop(F, id, S)).filter(Boolean);
const deepFreeze = o => (Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)), Object.freeze(o));

test('the proposals list: his cover in force beside the rule’s pick, with its species and why', () => {
  const F = draft(),
    x = prop(F);
  // the rule: the most seen species with a reference photo (s2), its easiest reference photo (fi4, ease 5)
  assert.deepStrictEqual(
    [x.id, x.his.f, x.hisLeaf, x.rule.f, x.leaf, x.seen, x.ref, x.mine],
    ['f:A', 'fi1', 's1', 'fi4', 's2', [9, 30], true, false]
  );
  // his genus cover is the rule's pick already: no proposal
  assert.deepStrictEqual(
    list(F).map(y => y.id),
    ['f:A']
  );
  assert.strictEqual(fishCoverOf(L, F, 'f:A', j, seen()).f, 'fi1', 'his cover stays the one in force');
  // a node with no cover of his: the default already applies there
  assert.strictEqual(prop({}), null);
  assert.strictEqual(prop(undefined), null);
  assert.strictEqual(coverProposal('f:A', [], F, j, seen()), null);
  // his cover out of play or on a juvenile is not in force: the default applies, nothing to propose
  assert.strictEqual(prop({genera: {'f:A': {cover: 'gone'}}}), null);
  assert.strictEqual(prop({genera: {'f:A': {cover: 'fi9'}}}), null);
  assert.strictEqual(prop({genera: {'f:A': {cover: 'fi3'}}, phase: {fi3: 'juvenile'}}), null);
  // the same photo under another name (its candidate copy, core.js fishPid) is the same pick
  assert.strictEqual(
    coverProposal('f:A', [...L, {f: 'fish-s2-cand-4', sp: 's2', rep: true}], {genera: {'f:A': {cover: 'fish-s2-cand-4'}}}, j, seen()),
    null
  );
  // his ★ cover of the rule's species leads the rule's pick
  const m = prop({...F, genera: {...F.genera, s2: {cover: 'fi3'}}});
  assert.deepStrictEqual([m.rule.f, m.mine], ['fi3', true]);
  // why, in a line (the centre named from fish.json)
  assert.strictEqual(coverWhy(x, 'Dauin'), 'Most seen near Dauin: 9 observers');
  assert.strictEqual(coverWhy({...m, seen: [1, 1]}, 'Dauin'), 'Most seen near Dauin: 1 observer · your ★ species cover');
  assert.strictEqual(coverWhy({seen: [0, 0], ref: false}, 'Dauin'), 'None seen near Dauin: the easiest · no reference photo');
  assert.strictEqual(coverWhy({seen: [3, 4], ref: true}), 'Most seen near the centre: 3 observers');
});

test('Accept sets the rule’s photo as his cover in the draft (one new draft: Undo restores the old), and is done', () => {
  const F = deepFreeze(draft()),
    x = prop(F),
    N = coverAccept(F, x);
  assert.strictEqual(N.genera['f:A'].cover, 'fi4');
  // nothing else moves (his featured photos stay), and the draft it came from is untouched: the admin's Undo step
  // (saveDraft's snapshot) gives it back whole
  assert.deepStrictEqual(N.genera['f:A'].feat, {s1: ['fi2']});
  assert.deepStrictEqual(N.genera['g:B'], F.genera['g:B']);
  assert.strictEqual(F.genera['f:A'].cover, 'fi1');
  assert.deepStrictEqual(list(N), []);
  assert.deepStrictEqual(
    list(F).map(y => y.id),
    ['f:A']
  );
  // Accept sets, never toggles: twice is still the rule's photo (★ Cover's second click would take it off)
  assert.strictEqual(coverAccept(N, x).genera['f:A'].cover, 'fi4');
  assert.strictEqual(fishCover(N, 'f:A', 'fi4').genera['f:A'].cover, undefined);
  // Accept all: every open one, in one draft (one Undo step)
  const F2 = {genera: {'f:A': {cover: 'fi1'}, 'g:B': {cover: 'fi2'}}},
    O = coverOpen(list(F2), F2);
  assert.strictEqual(O.length, 2);
  const N2 = O.reduce(coverAccept, F2);
  assert.deepStrictEqual([N2.genera['f:A'].cover, N2.genera['g:B'].cover], ['fi4', 'fi4']);
  assert.deepStrictEqual(coverOpen(list(N2), N2), []);
});

test('Keep mine records the pair in fish.kept: his cover stays, the pair never comes back; another pick of the rule may', () => {
  const F = deepFreeze(draft()),
    x = prop(F),
    N = coverKeep(F, x);
  assert.deepStrictEqual(N.kept, {'f:A': 'cover:i1>i4'});
  assert.strictEqual(coverKey(x), 'cover:i1>i4');
  assert.deepStrictEqual(N.genera, F.genera);
  assert.deepStrictEqual(coverOpen(list(N), N), []);
  const S3 = {s1: [0, 0], s2: [0, 0], s3: [20, 50]},
    L3 = [...L, {f: 'fi7', sp: 's3', rep: true}],
    J3 = f => (f === 'fi7' ? {e: 4, jt: 'p1g0sl1'} : j(f)),
    z = coverProposal('f:A', L3, N, J3, seen(S3));
  assert.deepStrictEqual([z.rule.f, coverOpen([z], N).length], ['fi7', 1], 'the rule now on another photo: it comes back');
  // the Publish merge carries it key by key (merge3), beside a light re-judge's Keep mine in the same map
  const pub = merge3({fish: {}}, {fish: N}, {fish: {kept: {'fish-s1-cand-9': 'q308'}}});
  assert.deepStrictEqual(pub.fish.kept, {'f:A': 'cover:i1>i4', 'fish-s1-cand-9': 'q308'});
  // the two kinds of answers never answer each other
  const P = [{photo: 'fi1', curated: ['p1g0sl1', 4], rejudged: ['p1d0sl1', 4]}],
    FL = {add: {fi1: 's1'}, tags: {fi1: 'p1g0sl1'}, ease: {fi1: 4}};
  assert.strictEqual(lightOpen(P, coverKeep(FL, x)).length, 1);
  assert.strictEqual(coverOpen([x], lightKeep(F, {photo: 'f:A'}, 'q308')).length, 1);
  // what Publish counts: the Keep mine answers new since the published file, not the light ones
  assert.strictEqual(coverKeptN(N, F), 1);
  assert.strictEqual(coverKeptN(N, N), 0);
  assert.strictEqual(coverKeptN(lightKeep(N, {photo: 'fi1'}), F), 1);
  assert.strictEqual(coverKeptN(undefined, undefined), 0);
});

test('done detection: answered, his cover changed since, the rule agrees; Undo brings it back', () => {
  const F = draft(),
    x = prop(F),
    open = (D, S) => coverOpen(list(D, S), D).map(y => `${y.id} ${y.his.f}>${y.rule.f}`);
  assert.deepStrictEqual(open(F), ['f:A fi1>fi4']);
  // answered: Accept or Keep mine
  assert.deepStrictEqual(open(coverAccept(F, x)), []);
  assert.deepStrictEqual(open(coverKeep(F, x)), []);
  // his cover changed since: that proposal is gone; his new cover to the rule's own photo leaves none
  assert.deepStrictEqual(open(fishCover(F, 'f:A', 'fi4')), []);
  // his cover taken off: the default applies, nothing to propose
  assert.deepStrictEqual(open(fishCover(F, 'f:A', 'fi1')), []);
  // a new cover of his that still differs is a new pair (the earlier one is done)
  assert.deepStrictEqual(open(fishCover(coverKeep(F, x), 'f:A', 'fi3')), ['f:A fi3>fi4']);
  // the rule agrees: the presence moved his species ahead (s1: its easiest reference photo is his fi1); the genus's cover
  // of his (fi4) is now the one that differs, a new proposal
  const S = {s1: [12, 40], s2: [9, 30]};
  assert.strictEqual(prop(F, 'f:A', S), null);
  assert.deepStrictEqual(open(F, S), ['g:B fi4>fi1']);
  // Undo: the admin restores the draft before the click (saveDraft's snapshot), and the proposal is open again
  const snap = JSON.stringify(F),
    after = coverAccept(JSON.parse(snap), x);
  assert.deepStrictEqual(open(after), []);
  assert.deepStrictEqual(open(JSON.parse(snap)), ['f:A fi1>fi4']);
});

test('a node page’s cover and why (Photos › Tree): his ★, else the rule on a node with leaves, else a leaf’s first adult', () => {
  const F = draft();
  // a family: his ★ in force
  let c = nodeCover('f:A', L, F, j, false, seen());
  assert.deepStrictEqual([c.p.f, c.by, c.rule, c.juv, c.gone], ['fi1', 'mine', null, false, false]);
  assert.strictEqual(nodeCoverWhy(c, 'Dauin'), 'Your ★ cover');
  // no pick: the rule, with its why
  c = nodeCover('f:A', L, {}, j, false, seen());
  assert.deepStrictEqual([c.p.f, c.by, c.rule.leaf], ['fi4', 'rule', 's2']);
  assert.strictEqual(nodeCoverWhy(c, 'Dauin'), 'Default: Most seen near Dauin: 9 observers');
  // his pick on a juvenile, or out of play: the rule, and the bar says why his is not shown
  c = nodeCover('f:A', L, {genera: {'f:A': {cover: 'fi9'}}}, j, false, seen());
  assert.deepStrictEqual([c.p.f, c.by, c.juv, c.gone], ['fi4', 'rule', true, false]);
  assert.strictEqual(nodeCoverWhy(c, 'Dauin'), 'Default: Most seen near Dauin: 9 observers · your ★ is a juvenile: ignored');
  c = nodeCover('g:B', L, {genera: {'g:B': {cover: 'gone'}}}, j, false, seen());
  assert.deepStrictEqual([c.by, c.gone], ['rule', true]);
  assert.match(nodeCoverWhy(c, 'Dauin'), /your ★ is out of play$/);
  // a leaf (a species): his ★ while in play and adult, else its first adult photo in the page's order (featured first);
  // never the rule (it picks among a node's leaves)
  const S1 = [L[4], L[1], L[0]];
  assert.strictEqual(fishLeafCover(S1, {}, 's1', j).f, 'fi2');
  assert.strictEqual(fishLeafCover(S1, {genera: {s1: {cover: 'fi1'}}}, 's1', j).f, 'fi1');
  assert.strictEqual(fishLeafCover(S1, {genera: {s1: {cover: 'fi9'}}}, 's1', j).f, 'fi2');
  assert.strictEqual(fishLeafCover([L[4]], {}, 's1', j).f, 'fi9', 'juveniles only: the first one');
  assert.strictEqual(fishLeafCover([], {}, 's1', j), null);
  c = nodeCover('s1', S1, {genera: {s1: {cover: 'fi1'}}}, j, true);
  assert.deepStrictEqual([c.p.f, c.by, c.rule], ['fi1', 'mine', null]);
  c = nodeCover('s1', S1, {genera: {s1: {cover: 'fi9'}}}, j, true);
  assert.deepStrictEqual([c.p.f, c.by, c.juv], ['fi2', 'first', true]);
  assert.strictEqual(nodeCoverWhy(c), 'Default: its first photo (featured, then the easiest) · your ★ is a juvenile: ignored');
  // no photo at all
  c = nodeCover('s9', [], {}, j, true);
  assert.deepStrictEqual([c.p, c.by], [null, '']);
  assert.strictEqual(nodeCoverWhy(c), 'No photo in play');
});

test('a node page’s candidates waiting: by the species they wait in now, never one in play, rejected or gone', () => {
  const cand = {s1: [{f: 'c1'}, {f: 'c2'}, {f: 'c3'}, {f: 'c4'}, {f: 'c5'}], s2: [{f: 'c6'}]},
    F = {add: {c1: 's1'}, seen: {c2: 1}, exclude: {c3: 1}, out: {c4: 's2', c6: 'x'}},
    W = fishWaiting(cand, F);
  assert.deepStrictEqual(Object.fromEntries(Object.entries(W).map(([k, L]) => [k, L.map(p => p.f)])), {s1: ['c5'], s2: ['c4']});
  assert.deepStrictEqual(Object.keys(fishWaiting(cand, undefined)), ['s1', 's2']);
  assert.deepStrictEqual(fishWaiting(undefined, F), {});
});

test('the players’ copy leaves the answers out; the view is wired in the admin', () => {
  const root = path.join(__dirname, '..'),
    rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  assert.match(rd('tools/curplay.py'), /FISH_DROP = \([^)]*'kept'/);
  assert.match(rd('admin.html'), /<script src="admin-covers\.js\?v=\d+"><\/script>/);
  assert.match(rd('admin.js'), /'cover-proposals',\s*'Cover proposals',/);
});
