require('./slot.js').testGuard();
// Photos › Tree, a node's sheet text (admin-content.js; docs/reviews/2026-11-14-sheet-overlay-design.md): the pure
// part. Each node's rows (every declared slot of its rank, a keyed slot once
// per line the base holds, his entry and its state, then what is never applied), which nodes have a sheet in the app, the
// box's text as a slot's value, and the edits to check (stale and orphaned) the bar counts.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const C = require('../core.js'),
  {sheetSlots, sheetOwn, sheetVal, sheetTodo, rowKey, contentShells} = require('../admin-content.js');
const ROOT = path.join(__dirname, '..'),
  F = JSON.parse(fs.readFileSync(path.join(ROOT, 'fish.json'), 'utf8')),
  S = C.SUBJECTS.find(x => x.content && x.pool.files[0] === 'fish.json'),
  T = C.treeSheets(F),
  BF = F.families.find(f => (f.cues || []).length && (f.look || []).length && !f.wink),
  e = (v, was, x = {}) => ({v, was, t: 1, ...x});

test('a family page: every slot of its rank in the declared order, a keyed slot once per line of the base', () => {
  const R = sheetSlots(S, F, {}, BF.id, id => (T.fam[id] || {}).name || id);
  const keyed = R.filter(r => r.key != null);
  assert.deepStrictEqual(
    R.filter(r => r.key == null).map(r => r.slot),
    S.content.family.slots.filter(sp => !sp.rows && !sp.map).map(sp => sp.k)
  );
  assert.deepStrictEqual(
    keyed.filter(r => r.sp.k === 'look').map(r => r.key),
    BF.look.map(([o]) => o)
  );
  assert.strictEqual(R.find(r => r.slot === 'look/' + BF.look[0][0]).name, 'Look-alike: ' + T.fam[BF.look[0][0]].name);
  const cues = R.find(r => r.slot === 'cues');
  assert.deepStrictEqual([cues.base, cues.v, cues.e, cues.state, cues.sp.imr], [BF.cues, BF.cues, null, '', 1]);
  assert.strictEqual(R.find(r => r.slot === 'note').v, null);
  // A genus, a species: their own slots; an id of no node: nothing.
  const G = F.genera.find(g => (g.cues || []).length);
  assert.deepStrictEqual(
    sheetSlots(S, F, {}, G.id).map(r => r.slot),
    ['cues', 'note']
  );
  assert.deepStrictEqual(
    sheetSlots(S, F, {}, F.species[0].id).map(r => r.slot),
    ['note']
  );
  assert.deepStrictEqual(sheetSlots(S, F, {}, 'w:125'), []);
});

test('his entries on the rows: fresh, hidden, stale, absorbed, and what is never applied listed after', () => {
  const lk = BF.look[0][0],
    Cm = {
      nodes: {
        [BF.id]: {
          cues: e(['Mine'], BF.cues, {src: {t: 'S'}}),
          marks: e(null, BF.marks || null),
          life: e(['Mine'], ['A base that is gone']),
          ['look/' + lk]: e(BF.look[0][1], 'old words'),
          ['look/f:Nope']: e('x', null),
          name: e('x', BF.name)
        }
      }
    },
    R = sheetSlots(S, F, Cm, BF.id),
    by = Object.fromEntries(R.map(r => [r.slot, r]));
  assert.deepStrictEqual([by.cues.state, by.cues.v, by.cues.base], ['fresh', ['Mine'], BF.cues]);
  assert.deepStrictEqual([by.marks.state, by.marks.v], ['fresh', null]);
  assert.deepStrictEqual([by.life.state, by.life.v], ['stale', ['Mine']]);
  assert.strictEqual(by['look/' + lk].state, 'absorbed');
  assert.deepStrictEqual(
    R.filter(r => r.state === 'orphan').map(r => [r.slot, r.why]),
    [
      ['look/f:Nope', 'slot'],
      ['name', 'slot']
    ]
  );
  assert.ok(
    R.slice(-2).every(r => r.state === 'orphan'),
    'after the declared slots'
  );
  // An entry under a renamed id (t01 → f:Damselfishes) shows on the new id's page, its stored id kept for Restore.
  const D = sheetSlots(S, F, {nodes: {t01: {note: e('From the old id', null)}}}, 'f:Damselfishes').find(r => r.slot === 'note');
  assert.deepStrictEqual([D.v, D.eid, D.state], ['From the old id', 't01', 'fresh']);
  // Its new id's own entry too: the old one is shadowed, listed after, and each row has a key of its own on the page, so
  // the live row's Restore never reaches the orphan.
  const R2 = sheetSlots(S, F, {nodes: {t01: {note: e('old', null)}, 'f:Damselfishes': {note: e('new', null)}}}, 'f:Damselfishes'),
    N2 = R2.filter(r => r.slot === 'note');
  assert.deepStrictEqual(
    N2.map(r => [r.v === undefined ? r.e.v : r.v, r.eid, r.state]),
    [
      ['new', 'f:Damselfishes', 'fresh'],
      ['old', 't01', 'orphan']
    ]
  );
  assert.strictEqual(new Set(R2.map(rowKey)).size, R2.length);
});

test('which nodes have a sheet in the app: families but the winks, genera the app opens as themselves, species', () => {
  const wink = F.families.find(f => f.wink),
    lone = F.genera.find(g => T.go(g.id) !== g.id),
    own = F.genera.find(g => T.go(g.id) === g.id);
  assert.ok(sheetOwn(F, BF.id));
  assert.ok(wink, 'a wink family in fish.json');
  assert.ok(!sheetOwn(F, wink.id));
  // nor its species or genera: the app sends them to the families list
  assert.ok(wink.species.length && wink.species.every(s => !sheetOwn(F, s)), wink.species.join(' '));
  assert.ok(wink.genera.every(g => !sheetOwn(F, g)));
  assert.ok(lone && !sheetOwn(F, lone.id), 'a genus sent to its species or family');
  assert.ok(own && sheetOwn(F, own.id));
  assert.ok(sheetOwn(F, Object.keys(T.sp)[0]));
  assert.ok(!sheetOwn(F, 'w:125') && !sheetOwn(F, 'f:Nope'));
});

test('the box as a value: one item per line for a list, one line for a text, empty as hidden', () => {
  const L = {t: 'list'},
    X = {t: 'text'};
  assert.deepStrictEqual(sheetVal(L, ' One \n\n Two\n'), ['One', 'Two']);
  assert.strictEqual(sheetVal(L, ' \n '), null);
  assert.strictEqual(sheetVal(X, ' A  text\n on two lines '), 'A text on two lines');
  assert.strictEqual(sheetVal(X, ''), null);
  [sheetVal(L, 'a\nb'), sheetVal(X, 'a')].forEach(v => assert.ok(C.contentOk(v === null ? L : Array.isArray(v) ? L : X, v)));
});

test('the edits to check: the stale and the orphaned, never the fresh or absorbed', () => {
  const Cm = {
    nodes: {
      [BF.id]: {cues: e(['Mine'], ['gone']), note: e('fresh', null), marks: e(BF.marks, ['x'])},
      'f:Nope': {note: e('x', null)}
    }
  };
  assert.deepStrictEqual(sheetTodo(S, F, Cm), [
    {id: BF.id, node: BF.id, slot: 'cues', state: 'stale'},
    {id: 'f:Nope', node: 'f:Nope', slot: 'note', state: 'orphan', why: 'node'}
  ]);
  assert.deepStrictEqual(sheetTodo(S, F, {}), []);
});

test('a Restore outlives two merges before Publish: the emptied node map put back after each (Codex review #957)', () => {
  // admin.js mergeCur: merge3 then contentShells. Published: BF's tips edited; here, Restore; elsewhere, first an edit of
  // another node, then a note added to BF (two rebases, as Publish's retry after a SHA conflict runs).
  const put = (c0, f) => ({...c0, fish: {...(c0.fish || {}), content: f((c0.fish || {}).content || {})}}),
    merge = (b, m, t) => contentShells(m, C.merge3(b, m, t)),
    other = F.families.find(f => f.id !== BF.id).id,
    base = {v: 1, genera: {}, fish: {content: {nodes: {[BF.id]: {cues: e(['Mine'], BF.cues)}}}}},
    draft = put(base, c => C.contentDrop(c, BF.id, 'cues')),
    P1 = put(base, c => C.contentSet(c, other, 'note', 'elsewhere', null, null, 2)),
    D1 = merge(base, draft, P1);
  assert.deepStrictEqual(D1.fish.content.nodes[BF.id], {}, 'kept, empty, in the draft');
  assert.deepStrictEqual(C.merge3(base, draft, P1).fish.content.nodes[BF.id], undefined, 'merge3 alone drops it');
  const P2 = put(P1, c => C.contentSet(c, BF.id, 'note', 'Theirs later', null, null, 3)),
    D2 = merge(P1, D1, P2);
  assert.strictEqual(D2.fish.content.nodes[BF.id].note.v, 'Theirs later');
  assert.ok(!('cues' in D2.fish.content.nodes[BF.id]), 'the restore stands');
  // The published file leaves it out (contentOut); a draft with no emptied map comes back as merge3 gave it.
  assert.deepStrictEqual(Object.keys(C.contentOut(D1.fish.content).nodes), [other]);
  const plain = C.merge3(base, base, P1);
  assert.strictEqual(contentShells(base, plain), plain);
  // The corals' part is the top level (SUBJECTS admin.cur ''), the same way.
  const cb = {content: {nodes: {Acropora: {imr: e('x', 'y')}}}},
    cd = {content: C.contentDrop(cb.content, 'Acropora', 'imr')};
  assert.deepStrictEqual(contentShells(cd, C.merge3(cb, cd, cb)).content.nodes, {Acropora: {}});
});
