// Photo review › Light proposals (admin-light.js; Pierre, 2026-11-14: "ok pour (a)"): the light re-judge's proposals
// (judging/fish-light-q308.json curation) go into Pierre's fish draft only through Accept (the re-judged tags and ease,
// fishSet) or Keep mine (fish.kept), and a proposal is open only while his tags and ease are still the ones it was made
// against, the photo still his add in play and not kept; never written to curation.json by a tool (rule A1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {
    LIGHT_SET,
    LIGHT_SETS,
    lightSets,
    lightRetired,
    lightOpen,
    lightAccept,
    lightJ,
    lightCovers,
    lightJOf,
    lightKeep,
    lightDiff,
    lightCounts
  } = require('../admin-light.js'),
  {fishRun, fishUndo, autoCheck} = require('../autosort.js'),
  {merge3} = require('../core.js');

const P = [
  {photo: 'fish-s1-cand-1', curated: ['p1n0sl1', 3], rejudged: ['p1g0sl1r', 5]},
  {photo: 'fish-s1-cand-2', curated: ['p1d0sl1', 4], rejudged: ['p1g0sl1', 4]},
  {photo: 'fish-s2-cand-3', curated: ['p1n0sm1j', 2], rejudged: ['p1d0sm1j', 2]}
];
const draft = () => ({
  add: {'fish-s1-cand-1': 's1', 'fish-s1-cand-2': 's1', 'fish-s2-cand-3': 's2'},
  tags: {'fish-s1-cand-1': 'p1n0sl1', 'fish-s1-cand-2': 'p1d0sl1', 'fish-s2-cand-3': 'p1n0sm1j'},
  ease: {'fish-s1-cand-1': 3, 'fish-s1-cand-2': 4, 'fish-s2-cand-3': 2}
});
const open = F => lightOpen(P, F).map(x => x.photo);

test('a proposal accepted into the draft sets its re-judged tags and ease, and is done', () => {
  const F = draft(),
    N = lightAccept(F, P[0]);
  assert.strictEqual(N.tags['fish-s1-cand-1'], 'p1g0sl1r');
  assert.strictEqual(N.ease['fish-s1-cand-1'], 5);
  // nothing else moves, and the draft it came from is untouched (Undo restores it)
  assert.deepStrictEqual({...N.tags, 'fish-s1-cand-1': 'p1n0sl1'}, F.tags);
  assert.strictEqual(F.tags['fish-s1-cand-1'], 'p1n0sl1');
  assert.deepStrictEqual(open(N), ['fish-s1-cand-2', 'fish-s2-cand-3']);
  // Accept all: every open one, in one draft
  assert.deepStrictEqual(open(lightOpen(P, F).reduce(lightAccept, F)), []);
});

// A proposal that tags one of his ★ covers juvenile (#942's Boxfishes): Accept asks whether to keep it as the cover
// (lightCovers names its nodes); kept, the confirmation goes with the tags in one step (Pierre's exception, 2026-11-15:
// autosort.js fishCoverJ); a cover he confirmed already is not asked about again.
test('a proposal that makes his ★ cover a juvenile: its nodes named, the cover kept with the Accept', () => {
  const x = {photo: 'fish-s1-cand-1', curated: ['p1g0sl1', 3], rejudged: ['o1g0sl1j', 4]},
    F = {...draft(), tags: {...draft().tags, 'fish-s1-cand-1': 'p1g0sl1'}, genera: {'f:A': {cover: 'fi1'}, 'g:B': {cover: 'fi2'}}};
  assert.ok(lightJ(x) && !lightJ(P[0]) && !lightJ(P[2]), 'only a proposal that adds the juvenile flag');
  assert.deepStrictEqual(lightCovers(F, x), ['f:A'], 'his cover under the photo’s other name');
  assert.strictEqual(lightJOf([x, ...P], F, 'fi1'), x);
  assert.strictEqual(lightJOf([x, ...P], F, 'fi2'), null);
  const K = lightAccept(F, x, lightCovers(F, x));
  assert.strictEqual(K.tags['fish-s1-cand-1'], 'o1g0sl1j');
  assert.deepStrictEqual(K.genera, {'f:A': {cover: 'fi1', coverJ: 'fi1'}, 'g:B': {cover: 'fi2'}});
  assert.deepStrictEqual(lightAccept(F, x).genera, F.genera, 'not kept: the cover is left as it is (then ignored)');
  assert.deepStrictEqual(lightCovers(K, x), [], 'confirmed: nothing to ask');
  assert.deepStrictEqual(lightCovers({}, x), []);
});

test('Keep mine records the answer in fish.kept: his values stay, the proposal no longer shows', () => {
  const F = draft(),
    N = lightKeep(F, P[1]);
  assert.deepStrictEqual(N.kept, {'fish-s1-cand-2': LIGHT_SET.id});
  assert.deepStrictEqual([N.tags, N.ease], [F.tags, F.ease]);
  assert.deepStrictEqual(open(N), ['fish-s1-cand-1', 'fish-s2-cand-3']);
  // a Keep mine for another proposal set does not answer this one
  assert.deepStrictEqual(open(lightKeep(F, P[1], 'q999')), open(F));
  // the Publish merge carries it key by key (merge3), beside what another device published in the same map
  const pub = merge3({fish: {}}, {fish: N}, {fish: {kept: {'fish-x': LIGHT_SET.id}}});
  assert.deepStrictEqual(pub.fish.kept, {'fish-s1-cand-2': LIGHT_SET.id, 'fish-x': LIGHT_SET.id});
});

test('done detection: re-judged values, a later choice of his, a photo no longer in play', () => {
  const F = draft();
  assert.deepStrictEqual(
    open(F),
    P.map(x => x.photo)
  );
  assert.deepStrictEqual(open({}), []);
  assert.deepStrictEqual(open(undefined), []);
  // already carries the re-judged values (published by an earlier Accept)
  assert.deepStrictEqual(open({...F, tags: {...F.tags, 'fish-s1-cand-2': 'p1g0sl1'}}), ['fish-s1-cand-1', 'fish-s2-cand-3']);
  // he changed the ease since: a newer choice of his, not overwritten by a proposal
  assert.deepStrictEqual(open({...F, ease: {...F.ease, 'fish-s1-cand-1': 4}}), ['fish-s1-cand-2', 'fish-s2-cand-3']);
  // set aside, or marked Not this
  const {['fish-s2-cand-3']: _, ...add} = F.add;
  assert.deepStrictEqual(open({...F, add}), ['fish-s1-cand-1', 'fish-s1-cand-2']);
  assert.deepStrictEqual(open({...F, out: {'fish-s1-cand-1': 'x'}}), ['fish-s1-cand-2', 'fish-s2-cand-3']);
});

test('an Accept on a photo the fish auto-sort put in play makes the fields his (an Undo of the auto decision keeps them)', () => {
  const f = [...Array(50).keys()].map(i => `fish-s9-cand-${i}`).find(x => !autoCheck(x)),
    {F} = fishRun({s9: [{f}]}, {[f]: {jt: 'p1n0sl1', e: 3, k: 'best'}}, {s9: {id: 's9'}}, {}, '2026-11-14', true);
  assert.strictEqual(F.add[f], 's9');
  const x = {photo: f, curated: ['p1n0sl1', 3], rejudged: ['p1g0sl1', 5]};
  assert.deepStrictEqual(lightOpen([x], F).length, 1);
  const N = lightAccept(F, x),
    U = fishUndo(N, f, 's9');
  assert.strictEqual(U.add[f], undefined);
  assert.deepStrictEqual([U.tags[f], U.ease[f]], ['p1g0sl1', 5]);
});

test('what a proposal changes, in words; what Publish counts', () => {
  assert.deepStrictEqual(lightDiff(P[0]), [
    ['Light', 'n night livery', 'g good'],
    ['Reference photo', 'no', 'yes'],
    ['Ease', '3', '5']
  ]);
  assert.deepStrictEqual(lightDiff(P[2]), [['Light', 'n night livery', 'd dim']]);
  const S = draft(),
    D = lightKeep(lightAccept(lightAccept(S, P[0]), P[1]), P[2]);
  assert.deepStrictEqual(lightCounts(P, D, S), {accepted: 2, kept: 1});
  assert.deepStrictEqual(lightCounts(P, D, D), {accepted: 0, kept: 0});
});

test('the proposals files: Pierre’s adds, curated -> re-judged, each a change; curation.json untouched by tools', () => {
  LIGHT_SETS.forEach(s => proposalsFile(s));
  assert.deepStrictEqual(LIGHT_SETS[0], LIGHT_SET);
  assert.strictEqual(new Set(LIGHT_SETS.map(s => s.id)).size, LIGHT_SETS.length);
  assert.ok(
    LIGHT_SETS.every(s => s.id === LIGHT_SET.id || s.title),
    'a later set has the heading of its section'
  );
});

function proposalsFile(s) {
  const J = JSON.parse(fs.readFileSync(path.join(__dirname, '..', s.file), 'utf8')),
    C = J.curation;
  assert.ok(Array.isArray(C) && C.length > 0);
  const code = /^[pohtd][01][gdn][0-3][smb][lms][1smxok][jcawpr]*$/;
  C.forEach(x => {
    assert.match(x.photo, /^fish-s\d+-/);
    [x.curated, x.rejudged].forEach(([t, e]) => {
      assert.match(t, code);
      assert.ok(Number.isInteger(e) && e >= 1 && e <= 5);
    });
    assert.ok(lightDiff(x).length > 0, x.photo);
    // never a move to a retired code (count m, before 2026-11-09): fish-s050-cand-79944621 was one, its count kept as his
    assert.ok(!lightRetired(x), `${x.photo}: ${x.curated[0]} -> ${x.rejudged[0]}`);
  });
  assert.ok(lightRetired({curated: ['p1n0sms', 3], rejudged: ['p1g0smm', 3]}));
  assert.ok(!lightRetired({curated: ['p1n0smm', 2], rejudged: ['p1g0smm', 2]})); // his own m, unchanged: kept as his
  assert.strictEqual(new Set(C.map(x => x.photo)).size, C.length);
  // the curplay copy leaves the answers out (players never read them)
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'tools', 'curplay.py'), 'utf8'), /FISH_DROP = \([^)]*'kept'/);
}

// One judgement per photo (Pierre, 2026-11-15): a second set of proposals (judging/fish-one-judgement.json), read beside
// the light re-judge's; each proposal carries its set, a Keep mine records that set, and a photo in two sets shows the
// later set's proposal only, so answering it never reopens the earlier one.
test('several proposal sets: each proposal answered in its own set, a photo proposed twice shows the later one', () => {
  const later = LIGHT_SETS[1].id,
    Q = [
      {photo: 'fish-s1-cand-2', curated: ['p1d0sl1', 4], rejudged: ['p1d0sl1j', 2]},
      {photo: 'fish-s9-cand-9', curated: ['p1g0sl1', 4], rejudged: ['p1g0sl1', 5]}
    ],
    L = lightSets([P, Q]);
  assert.deepStrictEqual(
    L.map(x => [x.photo, x.set, x.rejudged[1]]),
    [
      ['fish-s1-cand-1', LIGHT_SET.id, 5],
      ['fish-s1-cand-2', later, 2],
      ['fish-s2-cand-3', LIGHT_SET.id, 2],
      ['fish-s9-cand-9', later, 5]
    ]
  );
  const F = draft();
  assert.deepStrictEqual(
    lightOpen(L, F).map(x => x.photo),
    ['fish-s1-cand-1', 'fish-s1-cand-2', 'fish-s2-cand-3']
  );
  // Keep mine on the later set's proposal: recorded as that set, the photo's proposal done, the others still open.
  const K = lightKeep(F, L[1]);
  assert.deepStrictEqual(K.kept, {'fish-s1-cand-2': later});
  assert.deepStrictEqual(
    lightOpen(L, K).map(x => x.photo),
    ['fish-s1-cand-1', 'fish-s2-cand-3']
  );
  // A Keep mine of the light re-judge does not answer another set's proposal of the same photo.
  assert.strictEqual(lightOpen(L, lightKeep(F, L[1], LIGHT_SET.id)).length, 3);
  // Publish's counts, each in its own set.
  assert.deepStrictEqual(lightCounts(L, lightAccept(K, L[0]), F), {accepted: 1, kept: 1});
  // A photo the draft holds with the re-judged values from another route (the auto-sort's add of a photo not in the
  // published file) is no answer to its proposal.
  const G = {add: {'fish-s9-cand-9': 's9'}, tags: {'fish-s9-cand-9': 'p1g0sl1'}, ease: {'fish-s9-cand-9': 5}};
  assert.deepStrictEqual(lightCounts(L, G, {}), {accepted: 0, kept: 0});
});
