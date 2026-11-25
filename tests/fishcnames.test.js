require('./slot.js').testGuard();
// A species' own list of common names in the curation (Pierre, 2026-11-21, Q444): curation.json <part> cn {species id: [1 to
// 3 names, the main first]}. The reader (core.js treeCnClean, treeCnLay, treeCnApply, run by contentApply, so the game, the
// admin and the sheet's replay read the same names), the fallback to the built names, the invariant that keeps it out of the
// sheet's gates (a list never changes whether a species has a unit), and the admin's write of it (admin-content.js cnRow,
// cnPut) through the draft's merge and Publish. The lists here are made-up fixtures: the real curation.json holds none.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  {execFileSync} = require('child_process'),
  block = require('./block.js');
const C = require('../core.js'),
  {cnRow, cnPut} = require('../admin-content.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  F = read('fish.json'),
  SEA = read('seaslug.json'),
  FSUB = C.subjectOf('fish'),
  SLUG = C.subjectOf('seaslug'),
  norm = C.typeNormAll,
  cur = cn => ({fish: {cn}}),
  names = s => s.cn.map(n => n[0]),
  sp = id => F.species.find(s => s.id === id),
  apply = (cn, S = FSUB, R = F) => C.contentApply(S, R, S === SLUG ? {seaslug: {cn}} : cur(cn));
// A species with two spellings of a name, its IMR name (cni) in the second place of three names, and a regional name (cnr).
const MANY = F.species.find(s => (s.cn || []).length === 3 && Number.isInteger(s.cni) && s.cni > 0),
  ALT = F.species.find(s => (s.cn || []).some(n => n.length > 1) && Number.isInteger(s.cni)),
  REG = F.species.find(s => (s.cnr || []).length && (s.cn || []).length > 1),
  NONE = F.species.filter(s => !(s.cn || []).length);

test('the fixtures: a three-name species with its IMR name not first, one with spellings, one with regional names, and some with no list', () => {
  assert.ok(MANY && ALT && REG);
  assert.ok(NONE.length > 0);
});

test('a clean list: 1 to 3 names, trimmed, each with letters, none twice in the reading of the typed names', () => {
  assert.strictEqual(C.CN_MAX, 3);
  assert.deepStrictEqual(C.treeCnClean(['  Lemon   damsel ']), ['Lemon damsel']);
  assert.deepStrictEqual(C.treeCnClean(['A b', 'C d', 'E f']), ['A b', 'C d', 'E f']);
  [
    undefined,
    null,
    'Lemon damsel',
    [],
    ['a', 'b', 'c', 'd'],
    [''],
    [' '],
    ['x', ''],
    [1],
    ['123'],
    [['a']],
    ['Lemon damsel', 'lemon-damsel'],
    {0: 'a'}
  ].forEach(v => assert.strictEqual(C.treeCnClean(v), null, JSON.stringify(v)));
});

test('a list laid on a species: the order is his, a name that stays keeps its spellings, a new name has none, regional names stay', () => {
  const s = ALT,
    k = s.cn.findIndex(n => n.length > 1),
    kept = s.cn[k],
    r = C.treeCnLay(s, ['A brand new name', kept[0]]);
  assert.deepStrictEqual(r.cn, [['A brand new name'], kept]);
  assert.deepStrictEqual(r.cnr, s.cnr);
  // a spelling of an entry is a name of it: the entry's other spellings follow
  const alt = C.treeCnLay(s, [kept[1]]).cn[0];
  assert.deepStrictEqual(alt, [kept[1], kept[0], ...kept.slice(2)]);
  // the species it was laid on is not touched
  assert.ok(s.cn.every(n => Array.isArray(n)));
  assert.deepStrictEqual(
    names(s),
    F.species.find(x => x.id === s.id).cn.map(n => n[0])
  );
  // a base entry serves one name only
  assert.deepStrictEqual(C.treeCnLay(s, [kept[0], kept[1]]).cn, [kept, [kept[1]]]);
});

test('the IMR name follows its name to its new place and goes when the list drops it; no IMR name stays none', () => {
  const s = MANY,
    imr = s.cn[s.cni][0],
    others = names(s).filter(x => x !== imr);
  assert.strictEqual(C.treeCnLay(s, [imr]).cni, 0);
  assert.strictEqual(C.treeCnLay(s, [...others, imr]).cni, 2);
  assert.strictEqual(C.treeCnLay(s, [imr, ...others]).cni, 0);
  assert.ok(!('cni' in C.treeCnLay(s, others)));
  assert.ok(!('cni' in C.treeCnLay(s, ['A brand new name'])));
  const bare = {...s};
  delete bare.cni;
  assert.ok(!('cni' in C.treeCnLay(bare, names(s))));
});

test('the IMR mark stays on its entry when the list names one of its other spellings', () => {
  const s = F.species.find(x => Number.isInteger(x.cni) && x.cn[x.cni] && x.cn[x.cni].length > 1);
  assert.ok(s, 'a species whose IMR entry has a spelling');
  const e = s.cn[s.cni],
    r = C.treeCnLay(s, ['A different main name', e[1]]);
  assert.strictEqual(r.cni, 1);
  assert.deepStrictEqual(r.cn[1], [e[1], e[0], ...e.slice(2)]);
  assert.strictEqual(C.treeCnLay(s, ['A different main name', e[0]]).cni, 1);
  assert.ok(!('cni' in C.treeCnLay(s, ['A different main name'])));
});

test('the fallback: no entry, an entry that is no clean list, a species the file does not know, a species with no list: the built file itself', () => {
  assert.strictEqual(apply({}), F);
  assert.strictEqual(C.contentApply(FSUB, F, {}), F);
  assert.strictEqual(C.contentApply(FSUB, F, null), F);
  const bad = {[MANY.id]: ['a', 'b', 'c', 'd'], [ALT.id]: [], [REG.id]: 'A name', 's:none': ['Nobody'], __proto__: null};
  assert.strictEqual(apply(bad), F);
  // a list the base already says changes nothing either
  assert.strictEqual(apply({[MANY.id]: names(MANY)}), F);
  // a species with no list stays without, whatever his entry says (a list would give it a progress unit)
  assert.strictEqual(apply(Object.fromEntries(NONE.map(s => [s.id, ['Made up']]))), F);
  // the entry sits in the subject's own part only
  assert.strictEqual(C.contentApply(FSUB, F, {seaslug: {cn: {[MANY.id]: ['Made up']}}}), F);
  assert.strictEqual(C.contentApply(FSUB, F, {cn: {[MANY.id]: ['Made up']}}), F);
  // a subject whose species list no names (the sea slugs) has no use for the key
  const sid = SEA.species[0].id;
  assert.ok(!(SEA.species[0].cn || []).length);
  assert.strictEqual(apply({[sid]: ['Made up']}, SLUG, SEA), SEA);
});

test('a curated list replaces the built one for its species alone, every other record shared; the built file is never changed', () => {
  const before = JSON.stringify(F),
    out = apply({[MANY.id]: ['Made up main', names(MANY)[0]]});
  assert.strictEqual(JSON.stringify(F), before);
  assert.notStrictEqual(out, F);
  assert.deepStrictEqual(names(out.species.find(s => s.id === MANY.id)), ['Made up main', names(MANY)[0]]);
  out.species.forEach((s, i) => s.id === MANY.id || assert.strictEqual(s, F.species[i]));
  ['families', 'genera', 'lookalikes', 'vn'].forEach(k => assert.strictEqual(out[k], F[k]));
  // the text edits and the names are two layers of one apply
  const both = C.contentApply(FSUB, F, {
    fish: {cn: {[MANY.id]: ['Made up main']}, content: {nodes: {'f:Damselfishes': {cues: {v: ['One tip'], was: null, t: 1}}}}}
  });
  assert.deepStrictEqual(both.families.find(f => f.id === 'f:Damselfishes').cues, ['One tip']);
  assert.deepStrictEqual(names(both.species.find(s => s.id === MANY.id)), ['Made up main']);
  // an edit of the structure leaves the names alone, and the names no stamp: the stamp is the structure's
  assert.strictEqual(C.structStamp(FSUB, F, cur({[MANY.id]: ['Made up main']})), '');
});

test('the players read it: the first name shown, the names typed accepted, a name taken out no longer accepted', () => {
  const s = MANY,
    gone = names(s)[0],
    out = apply({[s.id]: ['Quite a new name', ...names(s).slice(1)]}),
    index = R =>
      C.treeNameIndex(R, {})
        .filter(e => e.vr === 'sp' && e.sc && e.sc.includes(s.id))
        .map(e => norm(e.x));
  assert.ok(index(F).includes(norm(gone)));
  assert.ok(!index(out).includes(norm(gone)));
  assert.ok(index(out).includes(norm('Quite a new name')));
  // the app's own readers run on the file in force (TREEF): its species records give the first name
  const ctx = {typeNormAll: C.typeNormAll};
  vm.createContext(ctx);
  vm.runInContext(
    block(
      fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
      '// The curated common names of a fish species',
      '\n// The names a player may type',
      {
        file: 'app.js'
      }
    ) + '\nthis.M = {cnFirst};',
    ctx
  );
  const first = ctx.M.cnFirst,
    got = out.species.find(x => x.id === s.id);
  assert.strictEqual(first(got, false), 'Quite a new name');
  // the player at IMR sees the IMR name first while the list keeps it, else the main name
  assert.strictEqual(first(got, true), s.cn[s.cni][0] === gone ? 'Quite a new name' : s.cn[s.cni][0]);
  const dropped = apply({[s.id]: ['Quite a new name']}).species.find(x => x.id === s.id);
  assert.strictEqual(first(dropped, true), 'Quite a new name');
});

test('the admin’s shared names are read from the file in force: a name given to species of two families is shared in both', () => {
  const {namesRows, namesFams} = require('../admin-content.js'),
    a = F.species.find(s => (s.cn || []).length && s.circle && s.family),
    b = F.species.find(s => (s.cn || []).length && s.circle && s.family && s.family !== a.family),
    out = apply({[a.id]: ['Zzyzx madeup fish'], [b.id]: ['Zzyzx madeup fish']}),
    row = R => namesRows(R, {}).find(r => norm(r.x) === norm('Zzyzx madeup fish'));
  assert.ok(!row(F));
  assert.deepStrictEqual(
    row(out)
      .owners.map(o => o.g)
      .sort(),
    [a.family, b.family].sort()
  );
  assert.ok(namesFams(out, {}).has(a.family) && namesFams(out, {}).has(b.family));
});

test('a list never changes the units: the species level, the score tree and the sheet’s replay are the same with every species curated', () => {
  const all = Object.fromEntries(F.species.filter(s => (s.cn || []).length).map(s => [s.id, [...names(s)].reverse().concat([])])),
    out = apply(all);
  assert.notStrictEqual(out, F);
  assert.ok(F.species.some((s, i) => (s.cn || []).length > 1 && names(s)[0] !== names(out.species[i])[0]));
  // the units are the same ones (each carries its species record, which holds the names)
  const U = R => C.treeSpUnits(R).map(u => ({...u, s: u.s.id}));
  assert.ok(U(F).length > 100);
  assert.deepStrictEqual(U(out), U(F));
  assert.deepStrictEqual(C.treeReplayGen(out), C.treeReplayGen(F));
  const T = R => JSON.parse(JSON.stringify(C.treeScoreTree(C.treeGen(R, {}), R, true, true)));
  assert.deepStrictEqual(T(out), T(F));
  assert.deepStrictEqual(
    out.species.map(s => !!(s.cn || []).length),
    F.species.map(s => !!(s.cn || []).length)
  );
});

test('the admin: a species’ row, one write per Save, a list equal to the built one removes his entry, what he writes is what the game reads', () => {
  const s = MANY,
    r0 = cnRow(F, {}, s.id);
  assert.deepStrictEqual(r0, {base: names(s), v: names(s), imr: s.cni, e: false});
  assert.strictEqual(cnRow(F, {}, NONE[0].id), null);
  assert.strictEqual(cnRow(F, {}, 'nobody'), null);
  assert.strictEqual(cnRow(null, {}, s.id), null);
  // a write: sorted by his order, the input untouched, a new map
  const A = {},
    one = cnPut(A, s.id, ['  Made   up ', names(s)[0]], F);
  assert.deepStrictEqual(A, {});
  assert.deepStrictEqual(one, {[s.id]: ['Made up', names(s)[0]]});
  const r1 = cnRow(F, one, s.id);
  assert.deepStrictEqual(r1.v, ['Made up', names(s)[0]]);
  assert.strictEqual(r1.e, true);
  assert.deepStrictEqual(r1.base, names(s));
  // the box shows what the game reads, the IMR name's place included
  const game = apply(one).species.find(x => x.id === s.id);
  assert.deepStrictEqual(names(game), r1.v);
  assert.strictEqual(game.cni === undefined ? -1 : game.cni, r1.imr);
  // not a clean list: nothing changes; the built list: his entry goes; another species' entry stays
  assert.deepStrictEqual(cnPut(one, s.id, ['a', 'b', 'c', 'd'], F), one);
  assert.deepStrictEqual(cnPut(one, s.id, [], F), one);
  assert.deepStrictEqual(cnPut(one, NONE[0].id, ['Made up'], F), one);
  assert.deepStrictEqual(cnPut(one, s.id, names(s), F), {});
  const two = cnPut(one, ALT.id, ['Another'], F);
  assert.deepStrictEqual(Object.keys(cnPut(two, s.id, names(s), F)), [ALT.id]);
  // a list in the draft that is no clean list shows the built names
  assert.deepStrictEqual(cnRow(F, {[s.id]: ['a', 'b', 'c', 'd']}, s.id), r0);
});

test('Publish: the draft merges onto the published curation species by species, Publish writes the lists sorted, and counts them', () => {
  const root = read('curation.json'),
    base = {...root, fish: {...root.fish}},
    x = MANY.id,
    y = ALT.id,
    z = REG.id;
  delete base.fish.cn;
  // another device published z's list while this draft made x's; both survive, and on the same species mine wins
  const theirs = {...base, fish: {...base.fish, cn: {[z]: ['Theirs'], [y]: ['Theirs too']}}},
    mine = {...base, fish: {...base.fish, cn: {[x]: ['Mine'], [y]: ['Mine too']}}},
    conf = [],
    M = C.merge3(base, mine, theirs, conf);
  assert.deepStrictEqual(M.fish.cn, {[x]: ['Mine'], [y]: ['Mine too'], [z]: ['Theirs']});
  assert.deepStrictEqual(conf, [['fish', 'cn', y]]);
  // a species restored in the draft (its entry gone) is gone after the merge when nobody else changed it
  const pub = {...base, fish: {...base.fish, cn: {[x]: ['Published'], [z]: ['Theirs']}}},
    back = {...base, fish: {...base.fish, cn: {[z]: ['Theirs']}}};
  assert.deepStrictEqual(C.merge3(pub, back, pub).fish.cn, {[z]: ['Theirs']});
  // what Publish writes (admin.js fishOut): the maps sorted by species, nothing for an empty one
  const ctx = {contentOut: C.contentOut};
  vm.createContext(ctx);
  vm.runInContext(
    block(fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8'), 'function fishOut(F) {', '\n}\n', {through: 1, file: 'admin.js'}) +
      ';this.fishOut = fishOut;',
    ctx
  );
  assert.strictEqual(JSON.stringify(ctx.fishOut({cn: {s2: ['B b'], s1: ['A a', 'C c']}})), '{"cn":{"s1":["A a","C c"],"s2":["B b"]}}');
  assert.strictEqual(JSON.stringify(ctx.fishOut({cn: {}})), '{}');
  // the players' copy of the curation (tools/curplay.py) keeps the key, and the app builds the same names from it
  const slim = JSON.parse(
    execFileSync(
      'python3',
      ['-c', 'import sys, json; sys.path.insert(0, "tools"); import curplay; print(json.dumps(curplay.slim(json.load(sys.stdin))))'],
      {cwd: ROOT, input: JSON.stringify({fish: {cn: {[x]: ['Mine'], [z]: ['Theirs']}}}), maxBuffer: 1 << 28}
    ).toString()
  );
  assert.deepStrictEqual(slim.fish.cn, {[x]: ['Mine'], [z]: ['Theirs']});
  assert.deepStrictEqual(C.contentApply(FSUB, F, slim), C.contentApply(FSUB, F, {fish: {cn: {[x]: ['Mine'], [z]: ['Theirs']}}}));
});
