require('./slot.js').testGuard();
// The sea slugs' admin at parity with the fish's: their Candidates (target and genus-level lists), their rubric's tag rows and words (core.js
// SUBJECTS seaslug admin tags; admin.js tagRows, tagWords, tagText), the f flag kept (autosort.js fishTag), their
// sheets' text slots (SUBJECTS seaslug content; core.js contentApply), an edited list keeping its lines' source numbers
// only where a line is kept (core.js contentPut: rule C2), and their admin pages.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const ROOT = path.join(__dirname, '..'),
  rd = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  C = require('../core.js'),
  A = require('../autosort.js'),
  SS = C.SUBJECTS.find(s => s.id === 'seaslug'),
  FI = C.SUBJECTS.find(s => s.id === 'fish');

test('the sea slugs: Candidates, Health and the Tree among their admin pages, their target the game cap', () => {
  ['photos/candidates', 'inbox/todo/health', 'photos/tree/key'].forEach(p => assert.ok(SS.admin.pages.includes(p), p));
  // tools/seaslug_game.py puts the sure photos in play up to photoTarget.gameCap: the Candidates fill up to the same
  assert.strictEqual(SS.admin.target, rd('tools/seaslugs.json').photoTarget.gameCap);
  assert.ok(!FI.admin.target, 'the fish keep their own targets (autosort.js FISHT)');
});

test('fishTarget: a species record marked with its subject target (fishSpecies tgt) takes it, the fish records as before', () => {
  const J = {families: [{id: 'f:A', species: ['s1']}], species: [{id: 's1', cs: 1}, {id: 's2'}]};
  const S = A.fishSpecies(J, 12);
  assert.strictEqual(A.fishTarget(S.s1), 12);
  assert.strictEqual(A.fishTarget(S.s2), 12);
  assert.ok(!('tgt' in J.species[0]), 'the tree itself is not changed');
  const F = A.fishSpecies(J);
  assert.strictEqual(F.s2, J.species[1], 'no target: the same record');
  assert.strictEqual(A.fishTarget(F.s1), A.FISHT.top);
  // The queue stops a species at it: 12 observations in play, the 13th candidate is at target.
  const L = [...Array(13)].map((_, i) => ({f: 'seaslug-1-cand-' + i, o: 'o' + i, t: 'X'})),
    cur = {add: Object.fromEntries(L.slice(0, 12).map(p => [p.f, 's1']))},
    Q = A.fishQueue({s1: L}, {}, S, cur, []);
  assert.strictEqual(Q.length, 1);
  assert.ok(Q[0].full && Q[0].target === 12);
});

test("fishTag keeps the sea slugs' f flag (features hidden) and toggles it, in the rubric order", () => {
  assert.strictEqual(A.fishTag('d1g0sl1f', 'w'), 'd1g0sl1wf');
  assert.strictEqual(A.fishTag('d1g0sl1wf', 'f'), 'd1g0sl1w');
  assert.strictEqual(A.fishTag('d1g0sl1', 'f'), 'd1g0sl1f');
  assert.strictEqual(A.fishTag('d1g0sl1jf', 0, 'v'), 'v1g0sl1jf');
  // the fish's flags as before
  assert.strictEqual(A.fishTag('p1g0sm1jr', 'c'), 'p1g0sm1jcr');
});

// The admin's one reader of a subject's declared rubric (admin.js tagRows, tagFlags, tagWords, tagText), run in a vm.
function rubricReader() {
  const ctx = {esc: s => String(s), FISHS: null};
  vm.createContext(ctx);
  vm.runInContext(
    block(fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8'), '// The rubric a subject declares', "// A unit's IMR tag:") +
      ';this.R={tagRows,tagFlags,tagList,tagText};',
    ctx
  );
  return ctx.R;
}
const plain = x => JSON.parse(JSON.stringify(x));

test("tagRows, tagFlags and tagText: the sea slugs' rubric on the Tags rows and in words, the fish's as before", () => {
  const {tagRows, tagFlags, tagList, tagText} = rubricReader(),
    fuTags = (jt, S) => tagText(jt, S),
    fishTagText = (jt, S) => tagText(jt, S, true);
  // the fish: the seven rows, their values and the count's tooltips; the legacy count m and the tools' flags offered by none
  const FR = plain(tagRows(FI));
  assert.deepStrictEqual(
    FR.map(r => [r[0], r[1], r[2].map(x => x[0]).join('')]),
    [
      [0, 'View', 'pohtd'],
      [1, 'Whole', '10'],
      [2, 'Light', 'gdn'],
      [3, 'Colour loss', '0123'],
      [4, 'Clarity', 'smb'],
      [5, 'Size', 'lms'],
      [6, 'Count', '1sokx']
    ]
  );
  assert.deepStrictEqual(FR[6][2][0], ['1', 'One fish', 'One fish (others, if any, tiny and far)']);
  assert.deepStrictEqual(FR[0][2][0], ['p', 'Profile'], 'a value with no tooltip has none');
  assert.deepStrictEqual(
    tagFlags(FI).map(x => x[0]),
    ['j', 'c', 'w']
  );
  assert.deepStrictEqual(
    tagList(FI, 'phase').map(x => x[0]),
    ['', 'subadult', 'intermediate', 'terminal', 'female', 'male']
  );
  const R = tagRows(SS),
    row = i => R.find(r => r[0] === i)[2];
  assert.deepStrictEqual(
    row(0).map(x => x[0]),
    ['d', 'p', 'o', 'h', 't', 'v']
  );
  assert.deepStrictEqual(
    row(2).map(x => x[0]),
    ['g', 'd'],
    'no night livery'
  );
  assert.strictEqual(row(6)[0][1], 'One sea slug');
  assert.ok(/^Several sea slugs of the same species/.test(row(6)[1][2]));
  assert.deepStrictEqual(
    tagFlags(SS).map(x => x[0]),
    ['j', 'c', 'w', 'f']
  );
  // every value the rows offer is one the code accepts (autosort.js FISH_TAGS)
  R.forEach(([i, , o]) =>
    o.forEach(([v]) => assert.ok(A.fishSure({jt: 'p1g0sm1'.slice(0, i) + v + 'p1g0sm1'.slice(i + 1), e: 3, k: 'best'}), v))
  );
  // words: only what makes a photo harder; a dorsal or oblique sea slug says nothing, the fish's "from above" as before
  assert.strictEqual(fuTags('d1g0sl1', SS), '');
  assert.strictEqual(fuTags('o1g0sl1', SS), '');
  assert.strictEqual(fuTags('v1d0sl1f', SS), 'ventral · dim light · features hidden');
  assert.strictEqual(fuTags('d1g0sl1', FI), 'from above');
  assert.strictEqual(fuTags('o1n0sl1c', FI), 'oblique · night livery · camouflage');
  // the Candidates' judged line says every value
  assert.strictEqual(fishTagText('d1g0sl1jf', SS), 'dorsal · large · juvenile · features hidden');
  assert.strictEqual(fishTagText('p1g0sl1', FI), 'profile · large');
});

// Rule S1, docs/reviews/2026-11-19-admin-one-engine.md Dup-9: every tree subject declares its whole rubric in SUBJECTS admin
// tags (core.js treeRubric); the admin has no default of its own to fall back on.
test('every tree subject declares its whole rubric: the seven positions, the flags, the phase row', () => {
  const {tagRows, tagFlags, tagList, tagText} = rubricReader(),
    trees = C.SUBJECTS.filter(S => !S.flat);
  assert.ok(trees.length >= 2 && trees.includes(FI) && trees.includes(SS));
  for (const S of trees) {
    const T = S.admin.tags;
    assert.ok(T, `${S.id}: admin.tags`);
    assert.strictEqual(T.names.length, 7, `${S.id}: a name for each position`);
    for (const k of [0, 1, 2, 3, 4, 5, 6, 'flags', 'phase']) {
      assert.ok(Array.isArray(T[k]) && T[k].length, `${S.id}: admin.tags[${k}]`);
      assert.deepStrictEqual([...new Set(T[k].map(e => e[0]))].length, T[k].length, `${S.id}: ${k} has a value twice`);
      for (const [v, l, w, m] of T[k]) {
        assert.ok(typeof v === 'string' && typeof l === 'string' && (w === undefined || typeof w === 'string'), `${S.id}: ${k} ${v}`);
        assert.ok(
          !m || (typeof m === 'object' && Object.keys(m).every(x => ['tip', 'full', 'said'].includes(x))),
          `${S.id}: ${k} ${v} more`
        );
        // what a button offers has a label
        if (!(m && m.said)) assert.ok(l, `${S.id}: ${k} ${v}: a label`);
      }
    }
    // the rows and flags the admin offers are the declared ones, in order, but the values the tools write alone
    assert.strictEqual(tagRows(S).length, 7);
    assert.ok(tagRows(S).every(([i, n, o]) => n === T.names[i] && o.length === T[i].filter(e => !(e[3] && e[3].said)).length));
    assert.deepStrictEqual(
      plain(tagFlags(S)).map(x => x[0]),
      T.flags.filter(e => !(e[3] && e[3].said)).map(e => e[0])
    );
    // a flag the tools write, said in words, offered by no button (a: out of water or a screen; p, r: the tools')
    for (const k of ['a', 'p', 'r'])
      assert.ok(
        T.flags.some(e => e[0] === k && e[3] && e[3].said),
        `${S.id}: flag ${k}`
      );
    assert.ok(tagList(S, 'phase').length >= 2);
    // every value of the rows is one the game's code accepts (autosort.js FISH_TAGS), as the Tags buttons set it
    tagRows(S).forEach(([i, , o]) =>
      o.forEach(([v]) =>
        assert.ok(A.fishSure({jt: 'p1g0sm1'.slice(0, i) + v + 'p1g0sm1'.slice(i + 1), e: 3, k: 'best'}), `${S.id} ${i}${v}`)
      )
    );
  }
  // the admin reads the declaration alone: a made-up subject's rows, flags and words are its own, whatever the fish's are
  const X = {
    admin: {
      tags: {
        names: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        ...Object.fromEntries(
          [0, 1, 2, 3, 4, 5, 6].map(i => [i, [['z', 'Zed' + i, i === 3 ? 'zeta' : '', {tip: 'tip', full: 'full' + i}]]])
        ),
        flags: [
          ['q', 'Quill', 'quilled'],
          ['t', '', '', {full: 'tool', said: true}]
        ],
        phase: [['', 'None']]
      }
    }
  };
  assert.deepStrictEqual(plain(tagRows(X)[3]), [3, 'D', [['z', 'Zed3', 'tip']]]);
  assert.deepStrictEqual(plain(tagFlags(X)), [['q', 'Quill']]);
  assert.strictEqual(tagText('zzzzzzzq', X), 'zeta · quilled');
  assert.strictEqual(tagText('zzzzzzzqt', X, true), 'full0 · full1 · full2 · full3 · full4 · full5 · full6 · quilled · tool');
  assert.strictEqual(tagText('', X), '');
  assert.deepStrictEqual(plain(tagRows(null)), [], 'a subject with no declaration offers nothing');
});

test("the sea slugs' sheet slots: declared at every rank of their tree, their ID marks and notes editable", () => {
  const R = rd('seaslug.json');
  assert.deepStrictEqual(Object.keys(SS.content), Object.keys(SS.sheets));
  const N = C.contentNodes(SS, R);
  assert.ok(N.has('g:Chromodoris') && N.has('f:Chromodorididae') && N.has('s119434'));
  const g = R.genera.find(x => (x.marks || []).length && x.mby && (x.mby.marks || []).length > 1);
  assert.ok(g, 'a genus with sourced marks');
  // An edit: the first line kept, the second reworded, a new one; laid over by contentApply as the app and the sheet do.
  const v = [g.marks[0], g.marks[1] + ' (reworded)', 'A made-up new line'],
    cur = {seaslug: {content: {nodes: {[g.id]: {marks: {v, was: g.marks, src: {t: 'Made-up source'}}}}}}},
    X = C.contentApply(SS, R, cur),
    G = X.genera.find(x => x.id === g.id);
  assert.deepStrictEqual(G.marks, v);
  assert.deepStrictEqual(G.mby.marks, [g.mby.marks[0], [], []], 'a kept line keeps its numbers, the others none (rule C2)');
  assert.deepStrictEqual(G.esrc, {marks: {t: 'Made-up source'}});
  assert.notStrictEqual(
    R.genera.find(x => x.id === g.id),
    G,
    'the built file is not changed'
  );
  assert.deepStrictEqual(R.genera.find(x => x.id === g.id).mby, g.mby);
  // The note on a species: its enote.
  const Y = C.contentApply(SS, R, {seaslug: {content: {nodes: {s119434: {note: {v: 'A made-up note', was: null}}}}}});
  assert.strictEqual(Y.species.find(x => x.id === 's119434').enote, 'A made-up note');
  // Their structure (the genus look-alike pairs) and their look-alike lines: tests/seaslugstruct.test.js.
  assert.strictEqual(SS.structure.pairs.rank, 'genus');
});

test("fishSure: an egg-mass judgement (the sea slugs' egg rule) is set aside, never added", () => {
  assert.deepStrictEqual(A.fishSure({egg: 1, n: 'a made-up egg ribbon'}), {keep: 'reject', why: 'egg'});
  const L = [{f: 'seaslug-1-cand-1', o: 'o1', t: 'X'}],
    Q = A.fishQueue({s1: L}, {'seaslug-1-cand-1': {egg: 1}}, A.fishSpecies({species: [{id: 's1'}]}, 12), {}, []);
  assert.ok(Q[0].aside, 'shown on demand only, with the set-aside ones');
});
