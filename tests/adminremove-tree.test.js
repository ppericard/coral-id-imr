'use strict';
require('./slot.js').testGuard();
// The one Remove of the tree subjects (the fish, the sea slugs: REE-44 part 2; Pierre, 2026-11-21 05:48, option A: "un bouton
// remove, là en un clic la photo ne revient jamais, avec un undo juste après, une liste des photos retirées pour en remettre"):
// admin.js treeRemove takes the photo out for good (its part's exclude), out of its family's covers and featured photos,
// clears its flag, one Undo step, the toast with the Undo button; admin-nodephotos.js NODE_PHOTOS.tree lists the removed
// photos under the leaf of their species (a genus-level photo under its genus's leaf, the rest at the first root) and its
// Put back deletes the exclusion: the photo is a candidate again, and the auto-sort leaves it alone.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js'),
  AS = require('../autosort.js'),
  {npTreeExcluded, npUnder} = require('../admin-nodephotos.js');

const ROOT = path.join(__dirname, '..'),
  admin = fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8'),
  np = fs.readFileSync(path.join(ROOT, 'admin-nodephotos.js'), 'utf8'),
  fishSrc = fs.readFileSync(path.join(ROOT, 'admin-fish.js'), 'utf8');

// admin.js treeRemove, run on a draft with the real autosort.js treeExclude and treeDrop.
const remove = (F, fam, f, key, more) => {
  const ctx = {
    DRAFT: {fish: F, flag: key ? {[key]: {genus: 'x'}, other: {genus: 'y'}} : undefined},
    TK: 'fish',
    ASUBJ: {id: 'fish'},
    saves: 0,
    renders: 0,
    toasts: [],
    treeExclude: AS.treeExclude,
    treeDrop: AS.treeDrop,
    flagsOf: D => D.flag || {},
    flagsSet: (D, S, L) => (D.flag = L),
    saveDraft: () => ctx.saves++,
    render: () => ctx.renders++,
    toastUndo: m => ctx.toasts.push(m)
  };
  vm.createContext(ctx);
  vm.runInContext(cut(admin, 'function treeRemove(', '\n}\n', {through: 1, file: 'admin.js'}) + 'this.treeRemove = treeRemove;', ctx);
  ctx.treeRemove(fam, f, key, more);
  return ctx;
};

test('Remove of a photo in play: out for good (exclude), its add, cover and featured place go; one save; the toast carries the Undo', () => {
  const F = {add: {a: 's1', b: 's1'}, genera: {'f:A': {cover: 'a', feat: {s1: ['a', 'b']}}}},
    c = remove(F, 'f:A', 'a');
  assert.deepStrictEqual(c.DRAFT.fish.exclude, {a: 'excluded'});
  assert.deepStrictEqual(c.DRAFT.fish.add, {b: 's1'});
  assert.strictEqual(c.DRAFT.fish.seen, undefined, 'never the reviewed mark the old Remove set');
  assert.strictEqual((c.DRAFT.fish.genera['f:A'] || {}).cover, undefined);
  assert.deepStrictEqual(c.DRAFT.fish.genera['f:A'].feat.s1, ['b']);
  assert.strictEqual(c.saves, 1, 'one draft write: one Undo step');
  assert.deepStrictEqual(c.toasts, ['Removed.']);
  assert.strictEqual(AS.treeKeepOf(c.DRAFT.fish, 'a'), 'reject', 'counts against the auto-sort keep');
});

test('Remove of a flagged photo clears its flag, and only its flag', () => {
  const c = remove({}, 'f:A', 'a', 'a');
  assert.deepStrictEqual(Object.keys(c.DRAFT.flag), ['other']);
});

test('Remove answering a Check: the agent’s answer is read after the Remove and shown beside the Undo', () => {
  let seen = null;
  const c = remove({}, 'f:A', 'a', null, () => {
    seen = 'read';
    return 'Check: the auto-sort said in (differs).';
  });
  assert.strictEqual(seen, 'read');
  assert.deepStrictEqual(c.toasts, ['Removed. Check: the auto-sort said in (differs).']);
});

test('The tile and the swiper call the one Remove; no corner ×, no second exclusion route', () => {
  const bind = cut(admin, 'function bindFishTiles(', '\n}\n', {through: 1, file: 'admin.js'}),
    tile = cut(admin, 'function fishTile(', '\n}\n', {through: 1, file: 'admin.js'});
  assert.match(bind, /a === 'remove'\) return treeRemove\(/);
  assert.doesNotMatch(bind, /a === 'exclude'/);
  assert.doesNotMatch(tile, /adm-x|data-fu="exclude"/);
  const ex = cut(fishSrc, '    exclude(Q, c) {', '\n    },', {file: 'admin-fish.js'});
  assert.match(ex, /treeRemove\(/);
});

// npTreeExcluded: each removed photo with its record and its species.
test('npTreeExcluded: a candidate under its species, a game-only photo under the game’s, Not this’s species first, unknown with none', () => {
  const F = {exclude: {a: 'excluded', g: 'excluded', m: 'excluded', x: 'excluded', z: 'excluded'}, out: {m: 's9', x: 'x'}},
    byF = {a: {f: 'a', sid: 's1', src: 'u'}, m: {f: 'm', sid: 's1'}, x: {f: 'x', sid: 's2'}},
    plays = [{f: 'g', sp: 's3'}];
  const L = Object.fromEntries(npTreeExcluded(F, byF, plays).map(it => [it.f, it]));
  assert.strictEqual(L.a.sid, 's1');
  assert.strictEqual(L.g.sid, 's3');
  assert.strictEqual(L.g.p.f, 'g');
  assert.strictEqual(L.m.sid, 's9', 'moved with Not this then removed: listed under the species it was sent to');
  assert.strictEqual(L.x.sid, 's2', 'Not this to no game species: its first species');
  assert.deepStrictEqual(L.z, {f: 'z', p: null, sid: ''});
  assert.deepStrictEqual(npTreeExcluded({}, byF, plays), []);
});

// NODE_PHOTOS.tree, its browser part run with stubs: the leaves of a small tree (two species, a genus-level leaf).
const adapter = F => {
  const T = {
    roots: ['f:A'],
    node: new Map([
      ['f:A', {}],
      ['g:1', {}],
      ['s1', {sid: 's1'}],
      ['s2', {sid: 's2'}],
      ['gl:g:1', {sid: 'g:1', gl: true}]
    ]),
    kids: new Map([
      ['f:A', ['g:1']],
      ['g:1', ['s1', 's2', 'gl:g:1']],
      ['s1', []],
      ['s2', []],
      ['gl:g:1', []]
    ])
  };
  const under = (T, x) => [x, ...T.kids.get(x).flatMap(k => under(T, k))];
  const ctx = {
    DRAFT: {fish: F},
    TK: 'fish',
    FISHC: {byF: {a: {f: 'a', sid: 's1', src: 'u'}, b: {f: 'b', sid: 'g:1', gl: 1}, c: {f: 'c', sid: 's7'}}, plays: []},
    npTreeExcluded,
    npUnder,
    ttLeaves: (T, x) => under(T, x).filter(y => !T.kids.get(y).length),
    leafSid: (T, x) => (T.node.get(x) || {}).sid || x,
    crSrc: () => 'src="t"',
    fuP: p => p,
    esc: s => String(s),
    tvHref: x => '#' + x,
    fuName: s => s,
    fishSrcTag: () => '',
    fishZoom: () => {},
    edits: 0,
    fishEdit: fn => {
      ctx.edits++;
      ctx.DRAFT.fish = fn(ctx.DRAFT.fish);
    }
  };
  vm.createContext(ctx);
  vm.runInContext(
    `const NODE_PHOTOS = {${cut(np, '  tree: {', '\n};\nconst npOf', {file: 'admin-nodephotos.js'})}}; this.A = NODE_PHOTOS.tree;`,
    ctx
  );
  return {A: ctx.A, T, ctx};
};

test('The Removed list of a tree subject: each photo under its species’ leaf, a genus-level one under its genus’s, the rest at the first root', () => {
  const {A, T} = adapter({exclude: {a: 'excluded', b: 'excluded', c: 'excluded'}});
  assert.deepStrictEqual(
    A.excluded(['s1'], T).map(it => it.f),
    ['a']
  );
  assert.deepStrictEqual(
    A.excluded(['gl:g:1'], T).map(it => it.f),
    ['b']
  );
  assert.deepStrictEqual(
    A.excluded(['s1', 's2', 'gl:g:1'], T).map(it => [it.f, it.unit]),
    [
      ['a', 's1'],
      ['b', 'gl:g:1']
    ]
  );
  assert.deepStrictEqual(
    A.orphans(T).map(it => it.f),
    ['c'],
    'a species off the tree: at the first root'
  );
  assert.match(A.orphanT, /species/);
  // a photo no loaded file holds (a removed reference photo once published): its iNaturalist photo, from its id
  const {A: A2, T: T2} = adapter({exclude: {fi296664069: 'excluded'}}),
    [g] = A2.orphans(T2);
  assert.strictEqual(g.inat, '296664069');
  assert.match(g.thumb, /photos\/296664069\/small\.jpg/);
  assert.match(g.cap, /species not known here/);
  assert.strictEqual(A.removed, null, 'no second list: the old Remove was a reviewed mark, as ✕ Reject');
});

test('Put back deletes the exclusion, one Undo step; the photo is a candidate again and the auto-sort leaves it alone', () => {
  const F0 = {add: {a: 's1'}, auto: {'2026-11-20': {a: 'a'}}},
    removed = remove(F0, 'f:A', 'a').DRAFT.fish,
    {A, T, ctx} = adapter(removed),
    it = A.excluded(['s1'], T)[0];
  A.restore(it);
  const F = JSON.parse(JSON.stringify(ctx.DRAFT.fish)); // out of the vm's realm
  assert.strictEqual(ctx.edits, 1);
  assert.deepStrictEqual(F.exclude, {});
  assert.strictEqual(F.add.a, undefined, 'back as a candidate, not in play');
  const cands = {s1: [{f: 'a', o: 'o1'}]},
    sug = {a: {k: 'best', e: 5, jt: 'p1g1sso'}},
    species = {s1: {tgt: 8}};
  assert.deepStrictEqual(
    AS.treeQueue(cands, sug, species, F, []).map(x => x.p.f),
    ['a'],
    'in the Candidates queue again'
  );
  const run = AS.treeRun(cands, sug, species, F, '2026-11-22');
  assert.strictEqual((run.F.add || {}).a, undefined, 'the auto-sort, which logged it, never adds it again by itself');
});
