require('./slot.js').testGuard();
// The content editor's edits laid over the built file (docs/reviews/2026-11-14-sheet-overlay-design.md v2, step 1):
// curation.json content in each subject's part, {nodes: {node id: {slot: {v, was, src, t,
// by}}}}, applied by one core.js function (contentApply) for the app and the admin. Checked here: the slots each subject
// declares against fish.json; nothing changes while nothing is edited; replace, hide and add; a keyed line edits its words
// only (the pair stays: structure is a later step); what is never applied (orphaned, never dropped); the three states;
// the raw file never changed; the map as published (contentOut); one edit and its Restore (contentSet, contentDrop); two
// devices through merge3.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const F = read('fish.json'),
  CUR = read('curation.json'),
  TREEU = C.SUBJECTS.find(S => S.content && S.pool.files[0] === 'fish.json'),
  fam = id => F.families.find(f => f.id === id),
  // a family with IMR cues and an IMR look-alike line, one with our own apart lines, a genus with IMR cues, a species
  BF = F.families.find(f => (f.cues || []).length && (f.look || []).some(([, t]) => t)),
  AP = F.families.find(f => Object.keys(f.apart || {}).length),
  GN = F.genera.find(g => (g.cues || []).length),
  SP = F.species.find(s => s.family),
  cur = c => ({fish: {content: c}}),
  e = (v, was, x = {}) => ({v, was, t: 1, ...x});

test('the slots: declared per rank of the fish sheets, on records fish.json holds, the free note in a field of its own', () => {
  assert.ok(TREEU, 'a subject declares content slots for fish.json');
  assert.deepStrictEqual(Object.keys(TREEU.content), Object.keys(TREEU.sheets), 'one slot list per sheet rank');
  const N = C.contentNodes(TREEU, F);
  assert.strictEqual(N.size, F.families.length + F.genera.length + F.species.length, 'every family, genus and species is a node');
  Object.values(TREEU.content).forEach(D => {
    assert.ok(Array.isArray(F[D.at]), D.at);
    D.slots.forEach(sp => {
      assert.ok(['text', 'list'].includes(sp.t), sp.k);
      assert.ok(typeof sp.n === 'string' && sp.n, `${sp.k}: its name on the admin's pages`);
      // a field the editor's slot writes that the base never holds: a family's note is a wink's surprise line (treeGen sum)
      if (sp.f) assert.ok(!F[D.at].some(r => sp.f in r), `${D.at} ${sp.f}`);
    });
  });
  // Every base value read through its slot has the slot's type (or none).
  F.families.forEach(f =>
    TREEU.content.family.slots
      .filter(sp => !sp.rows && !sp.map)
      .forEach(sp => {
        const v = C.contentBase(sp, f);
        assert.ok(v === null || (sp.t === 'list' ? Array.isArray(v) : typeof v === 'string'), `${f.id} ${sp.k}`);
      })
  );
  // The corals declare theirs (step 8: tests/coralcontent.test.js).
});

test('nothing edited: the built file itself, for the app and for every subject (players see no change)', () => {
  assert.strictEqual(C.contentApply(TREEU, F, {}), F);
  assert.strictEqual(C.contentApply(TREEU, F, CUR), F, 'curation.json on main holds no edit');
  assert.strictEqual(C.contentApply(TREEU, F, cur({nodes: {}})), F);
  C.SUBJECTS.forEach(S => assert.deepStrictEqual(C.contentOf({}, S), {}));
  // The corals' part is the top level, the fish's under fish (SUBJECTS admin.cur).
  assert.deepStrictEqual(C.contentOf({content: {nodes: {a: {}}}}, C.SUBJECTS[0]), {nodes: {a: {}}});
  assert.deepStrictEqual(C.contentOf({content: {nodes: {a: {}}}}, TREEU), {});
});

test('replace, hide and add: the edits in force, the raw file untouched, the units and the replay read them', () => {
  const before = JSON.stringify(F),
    lk = BF.look.find(([, t]) => t)[0],
    c = {
      nodes: {
        [BF.id]: {
          cues: e(['Tip one', 'Tip two'], BF.cues, {src: {t: 'A field guide', u: 'https://example.org/guide'}}),
          ['look/' + lk]: e('Words of my own', BF.look.find(([o]) => o === lk)[1], {src: {t: 'A look source'}}),
          marks: e(null, BF.marks || null),
          note: e('A note on the sheet', null)
        },
        [GN.id]: {cues: e(['A genus tip'], GN.cues)},
        [SP.id]: {note: e('A species note', null, {src: {t: 'No link'}})}
      }
    };
  const A = C.contentApply(TREEU, F, cur(c));
  assert.strictEqual(JSON.stringify(F), before, 'fish.json as loaded is never changed');
  const b = A.families.find(f => f.id === BF.id);
  assert.deepStrictEqual(b.cues, ['Tip one', 'Tip two']);
  assert.ok(!('marks' in b), 'hidden');
  assert.strictEqual(b.enote, 'A note on the sheet');
  assert.ok(!('note' in b) || b.note === BF.note, 'the free note never lands in the wink line');
  assert.deepStrictEqual(b.esrc, {cues: {t: 'A field guide', u: 'https://example.org/guide'}, ['look/' + lk]: {t: 'A look source'}});
  // A keyed line: its words change, the line (the pair) stays where it was.
  assert.deepStrictEqual(
    b.look.map(([o]) => o),
    BF.look.map(([o]) => o)
  );
  assert.strictEqual(b.look.find(([o]) => o === lk)[1], 'Words of my own');
  assert.deepStrictEqual(A.genera.find(g => g.id === GN.id).cues, ['A genus tip']);
  assert.strictEqual(A.species.find(s => s.id === SP.id).enote, 'A species note');
  assert.deepStrictEqual(A.species.find(s => s.id === SP.id).esrc, {note: {t: 'No link'}});
  // Records nobody edited are the same objects (only the edited ones are copied).
  assert.strictEqual(
    A.families.find(f => f.id !== BF.id),
    F.families.find(f => f.id !== BF.id)
  );
  assert.strictEqual(A.ref, F.ref);
  // The units read the edits: the family's tips (treeGen qt), its look-alike line; the pairs, the circles and the replay's
  // units are those of the base (text edits never move progress).
  const X = C.treeGen(A, {}),
    X0 = C.treeGen(F, {});
  assert.deepStrictEqual(X.gen[BF.id].qt, ['Tip one', 'Tip two']);
  assert.strictEqual(X.gen[BF.id].lk.find(([o]) => o === lk)[1], 'Words of my own');
  // Their sources go with them into the units (rule C2): the tips' (app.js tipsList shows it wherever
  // the tips are shown), the look-alike line's after its own; none where nothing was edited.
  assert.deepStrictEqual(X.gen[BF.id].qsrc, {t: 'A field guide', u: 'https://example.org/guide'});
  assert.strictEqual(X.gen[BF.id].lsrc[lk], X0.gen[BF.id].lsrc[lk] + '; A look source');
  assert.ok(Object.values(X0.gen).every(g => !('qsrc' in g)));
  assert.deepStrictEqual(
    Object.keys(X0.gen).filter(id => id !== BF.id && JSON.stringify(X.gen[id].lsrc) !== JSON.stringify(X0.gen[id].lsrc)),
    []
  );
  Object.keys(X0.gen).forEach(id => assert.deepStrictEqual([X.gen[id].look, X.gen[id].circle], [X0.gen[id].look, X0.gen[id].circle], id));
  assert.deepStrictEqual(C.treeReplayGen(A), C.treeReplayGen(F));
  assert.deepStrictEqual([X.c1, X.c2, X.c3], [X0.c1, X0.c2, X0.c3]);
});

test('a hidden keyed line keeps its pair: blank words, the line still there', () => {
  const lk = BF.look[0][0],
    ak = Object.keys(AP.apart)[0],
    A = C.contentApply(
      TREEU,
      F,
      cur({nodes: {[BF.id]: {['look/' + lk]: e(null, BF.look[0][1] || null)}, [AP.id]: {['apart/' + ak]: e(null, AP.apart[ak])}}})
    );
  assert.deepStrictEqual(
    A.families.find(f => f.id === BF.id).look.find(([o]) => o === lk),
    [lk, '']
  );
  assert.deepStrictEqual(Object.keys(A.families.find(f => f.id === AP.id).apart), Object.keys(AP.apart));
  assert.strictEqual(A.families.find(f => f.id === AP.id).apart[ak], '');
  assert.deepStrictEqual(C.treeGen(A, {}).gen[BF.id].look, C.treeGen(F, {}).gen[BF.id].look);
});

test('a nested slot: the juveniles note replaced, added where the base has none, hidden', () => {
  const J = F.families.find(f => f.juv && f.juv.note),
    N = F.families.find(f => !f.juv),
    A = C.contentApply(
      TREEU,
      F,
      cur({nodes: {[J.id]: {'juv.note': e('New juvenile words', J.juv.note)}, [N.id]: {'juv.note': e('Added', null)}}})
    );
  const j = A.families.find(f => f.id === J.id).juv;
  assert.strictEqual(j.note, 'New juvenile words');
  assert.deepStrictEqual(j.src, J.juv.src, 'the rest of the record stays');
  assert.deepStrictEqual(A.families.find(f => f.id === N.id).juv, {note: 'Added'});
  const H = C.contentApply(TREEU, F, cur({nodes: {[J.id]: {'juv.note': e(null, J.juv.note)}}}));
  assert.ok(!('note' in H.families.find(f => f.id === J.id).juv));
  assert.strictEqual(fam(J.id).juv.note, J.juv.note, 'never in place');
});

test('never applied, always listed (orphaned): unknown node, undeclared slot, a line the base lacks, a wrong type, an old id shadowed', () => {
  const c = {
    nodes: {
      'f:NoSuchFamily': {note: e('x', null)},
      [BF.id]: {
        name: e('A new name', BF.name), // names are not editable
        ['look/f:NoSuchFamily']: e('x', null), // a new line would be a new pair: structure, a later step
        ['apart/' + BF.look[0][0]]: e('x', null), // apart lines only where the base has one
        cues: e('one string, not a list', BF.cues),
        marks: e(['', '  '], BF.marks),
        life: 'not an entry'
      },
      [GN.id]: {phase: e(['x'], null)}, // a family slot, not a genus one
      // fish entries renamed (SUBJECTS renamed, core.js renamedId): t01 is f:Damselfishes
      t01: {note: e('From the old id', null)}
    }
  };
  const L = C.contentEntries(TREEU, F, c),
    why = Object.fromEntries(L.map(x => [x.id + ' ' + x.slot, x.why || x.state]));
  assert.deepStrictEqual(why, {
    'f:NoSuchFamily note': 'node',
    [BF.id + ' name']: 'slot',
    [BF.id + ' look/f:NoSuchFamily']: 'slot',
    [BF.id + ' apart/' + BF.look[0][0]]: 'slot',
    [BF.id + ' cues']: 'value',
    [BF.id + ' marks']: 'value',
    [BF.id + ' life']: 'value',
    [GN.id + ' phase']: 'slot',
    't01 note': 'fresh'
  });
  assert.strictEqual(L.find(x => x.id === 't01').node, 'f:Damselfishes');
  const A = C.contentApply(TREEU, F, cur(c));
  assert.strictEqual(A.families.find(f => f.id === 'f:Damselfishes').enote, 'From the old id');
  assert.deepStrictEqual(
    A.families.find(f => f.id === BF.id),
    fam(BF.id),
    'nothing orphaned applied'
  );
  // Its new id's own entry wins; the old id's is shadowed, kept and listed.
  const L2 = C.contentEntries(TREEU, F, {nodes: {t01: {note: e('old', null)}, 'f:Damselfishes': {note: e('new', null)}}});
  assert.deepStrictEqual(
    L2.map(x => [x.id, x.state, x.why || '']),
    [
      ['f:Damselfishes', 'fresh', ''],
      ['t01', 'orphan', 'shadow']
    ]
  );
  assert.strictEqual(
    C.contentApply(TREEU, F, cur({nodes: {t01: {note: e('old', null)}, 'f:Damselfishes': {note: e('new', null)}}})).families.find(
      f => f.id === 'f:Damselfishes'
    ).enote,
    'new'
  );
});

test('the three states: fresh, stale when the base changed since, absorbed when the base says the same; players keep his text', () => {
  const st = (v, was, base) => C.contentState({v, was}, base);
  assert.strictEqual(st(['mine'], ['old'], ['old']), 'fresh');
  assert.strictEqual(st(['mine'], ['old'], ['new']), 'stale');
  assert.strictEqual(st(['mine'], ['old'], ['mine']), 'absorbed');
  assert.strictEqual(st('added', null, null), 'fresh', 'an add over an empty slot');
  assert.strictEqual(st('added', null, 'the base filled it'), 'stale');
  assert.strictEqual(st(null, 'hidden', null), 'absorbed', 'a hide over a slot the base emptied since');
  // A base that moved after the edit (the build changed the tips): stale, and the editor's text still in force.
  const F2 = {...F, families: F.families.map(f => (f.id === BF.id ? {...f, cues: ['A rebuilt tip']} : f))},
    c = {nodes: {[BF.id]: {cues: e(['Mine'], BF.cues)}}};
  const [x] = C.contentEntries(TREEU, F2, c);
  assert.strictEqual(x.state, 'stale');
  assert.deepStrictEqual(x.base, ['A rebuilt tip']);
  assert.deepStrictEqual(C.contentApply(TREEU, F2, cur(c)).families.find(f => f.id === BF.id).cues, ['Mine']);
  assert.strictEqual(C.contentEntries(TREEU, F, c)[0].state, 'fresh');
});

test('the players copy: the apply reads v and src only (no was, t or by)', () => {
  const c = {nodes: {[BF.id]: {cues: e(['Mine'], ['x'], {src: {t: 'S'}, by: 'p1'}), note: e('N', null)}}},
    slim = {nodes: {[BF.id]: {cues: {v: ['Mine'], src: {t: 'S'}}, note: {v: 'N'}}}};
  assert.deepStrictEqual(C.contentApply(TREEU, F, cur(slim)), C.contentApply(TREEU, F, cur(c)));
  // A source with no words is no source.
  assert.ok(
    !C.contentApply(TREEU, F, cur({nodes: {[BF.id]: {note: e('N', null, {src: {t: ' ', u: 'https://x'}})}}})).families.find(
      f => f.id === BF.id
    ).esrc
  );
});

test('the map as published: sorted, entries in the format order, empty maps left out', () => {
  const out = C.contentOut({
    pairs: {},
    nodes: {
      'g:B': {note: {t: 2, v: 'b', was: null}},
      'f:A': {cues: {by: 'p1', t: 1, src: {t: 'S'}, was: ['x'], v: ['y']}, marks: {v: null, was: ['m'], t: 3}},
      'f:Empty': {}
    }
  });
  assert.strictEqual(
    JSON.stringify(out),
    JSON.stringify({
      nodes: {
        'f:A': {cues: {v: ['y'], was: ['x'], src: {t: 'S'}, t: 1, by: 'p1'}, marks: {v: null, was: ['m'], t: 3}},
        'g:B': {note: {v: 'b', was: null, t: 2}}
      }
    })
  );
  assert.deepStrictEqual(C.contentOut({nodes: {'f:A': {}}}), {});
  assert.deepStrictEqual(C.contentOut(undefined), {});
});

test('one edit and its Restore: new maps, the original kept in was, an emptied map kept for the merge', () => {
  const c0 = {},
    c1 = C.contentSet(c0, BF.id, 'cues', ['Mine'], BF.cues, {t: 'S', u: ''}, 5);
  assert.deepStrictEqual(c0, {}, 'never in place');
  assert.deepStrictEqual(c1, {nodes: {[BF.id]: {cues: {v: ['Mine'], was: BF.cues, src: {t: 'S'}, t: 5}}}});
  const c2 = C.contentSet(c1, BF.id, 'note', 'N', null, null, 6);
  assert.deepStrictEqual(Object.keys(c2.nodes[BF.id]), ['cues', 'note']);
  assert.deepStrictEqual(c1.nodes[BF.id], {cues: {v: ['Mine'], was: BF.cues, src: {t: 'S'}, t: 5}}, 'the earlier step unchanged (Undo)');
  // Restore: the entry goes, the node's map stays (empty) in the draft, and the published map leaves it out.
  const r = C.contentDrop(C.contentDrop(c2, BF.id, 'cues'), BF.id, 'note');
  assert.deepStrictEqual(r, {nodes: {[BF.id]: {}}});
  assert.deepStrictEqual(C.contentOut(r), {});
  // Saving the base's own value is a Restore.
  assert.deepStrictEqual(C.contentSet(c1, BF.id, 'cues', BF.cues.slice(), BF.cues, null, 7), {nodes: {[BF.id]: {}}});
  assert.strictEqual(C.contentApply(TREEU, F, cur(r)), F);
});

test('two devices: Publish merges slot by slot (merge3), the same slot on both is a conflict where mine wins', () => {
  const base = {v: 1, genera: {}, fish: {content: {nodes: {[BF.id]: {cues: e(['Base edit'], BF.cues)}}}}},
    put = (C0, f) => ({...C0, fish: {...C0.fish, content: f(C0.fish.content)}}),
    mine = put(base, c => C.contentSet(c, BF.id, 'note', 'Mine', null, null, 2)),
    theirs = put(base, c => C.contentSet(c, BF.id, 'marks', ['Theirs'], BF.marks || null, null, 3)),
    conf = [],
    M = C.merge3(base, mine, theirs, conf);
  assert.deepStrictEqual(Object.keys(M.fish.content.nodes[BF.id]).sort(), ['cues', 'marks', 'note']);
  assert.deepStrictEqual(conf, []);
  // The same slot edited on both: one conflict named, mine in force.
  const m2 = put(base, c => C.contentSet(c, BF.id, 'cues', ['Mine'], BF.cues, null, 4)),
    t2 = put(base, c => C.contentSet(c, BF.id, 'cues', ['Theirs'], BF.cues, null, 5)),
    conf2 = [],
    M2 = C.merge3(base, m2, t2, conf2);
  assert.deepStrictEqual(M2.fish.content.nodes[BF.id].cues, m2.fish.content.nodes[BF.id].cues, 'mine, whole');
  assert.deepStrictEqual(conf2, [['fish', 'content', 'nodes', BF.id, 'cues']]);
  // A slot never edited, hidden here and reworded there: one conflict, my hide whole, never mixed
  // with their words; the other way round, my words whole.
  const m4 = put(base, c => C.contentSet(c, BF.id, 'life', null, BF.life || null, null, 7)),
    t4 = put(base, c => C.contentSet(c, BF.id, 'life', ['Their words'], BF.life || null, null, 8)),
    conf4 = [];
  assert.deepStrictEqual(C.merge3(base, m4, t4, conf4).fish.content.nodes[BF.id].life, m4.fish.content.nodes[BF.id].life);
  assert.deepStrictEqual(conf4, [['fish', 'content', 'nodes', BF.id, 'life']]);
  assert.deepStrictEqual(C.merge3(base, t4, m4).fish.content.nodes[BF.id].life, t4.fish.content.nodes[BF.id].life);
  // The pairs' entries merge whole too (the same format; their editor is a later step).
  const pb = {content: {pairs: {}}},
    pm = {content: {pairs: {'a|b': {v: null, was: 1, t: 1}}}},
    pt = {content: {pairs: {'a|b': {v: 1, was: null, src: {t: 'S'}, t: 2}}}};
  assert.deepStrictEqual(C.merge3(pb, pm, pt).content.pairs['a|b'], pm.content.pairs['a|b']);
  // Elsewhere objects still merge key by key (a coral genus's choices).
  assert.deepStrictEqual(C.merge3({genera: {A: {}}}, {genera: {A: {cover: 'x'}}}, {genera: {A: {ok: 1}}}).genera.A, {cover: 'x', ok: 1});
  // A Restore here while the other device adds a slot to the same node: the restore stands and their slot stays (the
  // node's map kept, empty, in the draft).
  const r = put(base, c => C.contentDrop(c, BF.id, 'cues')),
    t3 = put(base, c => C.contentSet(c, BF.id, 'note', 'Theirs', null, null, 6)),
    M3 = C.merge3(base, r, t3);
  assert.deepStrictEqual(Object.keys(M3.fish.content.nodes[BF.id]), ['note']);
});
