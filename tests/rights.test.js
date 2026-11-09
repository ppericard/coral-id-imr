// The rights tie-break (Pierre, 2026-11-08, Q270: "à qualité égale", CC0 / CC BY and his own photos before CC BY-NC, so
// the stock a later commercial app could use grows; the CC BY-NC photos stay fully usable): core.js licOf, rightsClass,
// rightsRank and their Python copy tools/rights.py, and every order that takes them as its last key before the fixed
// order (docs/rules/photos.md P1, docs/ARCHITECTURE.md "Photo rights"). A tie-break only: never above quality, ease,
// reference look or variety, never a photo left out.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
const C = require('../core.js');
const A = require('../autosort.js');
const ROOT = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const py = (code, input) =>
  JSON.parse(
    execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\n${code}`], {
      cwd: ROOT,
      encoding: 'utf8',
      input,
      maxBuffer: 1 << 28
    })
  );

test('rightsClass: IMR lecture, Coral Finder book, his own (whatever its licence), open (CC0, CC BY), the rest NC', () => {
  const ex = [
    [{imr: true, f: 'imr-p1_i1'}, 'imr', 1],
    [{cf: 1, f: 'acropora-cf-2-00'}, 'book', 1],
    [{own: true, lic: 'cc-by-nc'}, 'own', 0],
    [{own: true, lic: 'cc-by'}, 'own', 0],
    [{lic: 'cc0'}, 'open', 0],
    [{lic: 'CC-BY'}, 'open', 0],
    [{a: '(c) X, some rights reserved (CC BY)'}, 'open', 0],
    [{a: '(c) X, no rights reserved'}, 'open', 0],
    [{lic: 'cc-by-nc'}, 'nc', 1],
    [{a: '(c) X, some rights reserved (CC BY-NC)'}, 'nc', 1],
    [{a: '(c) X, some rights reserved (CC BY-SA)'}, 'nc', 1],
    [{}, 'nc', 1],
    [null, 'nc', 1]
  ];
  ex.forEach(([p, cls, rank]) => {
    assert.strictEqual(C.rightsClass(p), cls, JSON.stringify(p));
    assert.strictEqual(C.rightsRank(p), rank, JSON.stringify(p));
  });
  // Python reads them alike, case by case.
  const P = py(
    `from rights import rights_class, rights_rank\nprint(json.dumps([[rights_class(p), rights_rank(p)] for p in json.load(sys.stdin)]))`,
    JSON.stringify(ex.map(x => x[0]))
  );
  assert.deepStrictEqual(
    P,
    ex.map(([, c, r]) => [c, r])
  );
});

test('licOf, rightsClass: the app (core.js), the admin (presence.js) and Python read every photo record alike', () => {
  const all = [];
  const add = L => (L || []).forEach(p => p && all.push(p));
  const D = read('data.json');
  [...Object.values(D.gen), ...Object.values((D.x || {}).gen || {})].forEach(g => {
    Object.values(g.views || {}).forEach(add);
    Object.values(g.more || {}).forEach(add);
    add(g.book);
  });
  Object.values(D.course || {}).forEach(add);
  Object.values(read('cand.json').cand || {}).forEach(add);
  Object.values(read('fish-cand.json').cand || {}).forEach(add);
  Object.values(C.fishGameRead(read('fish-game.json')).photos || {}).forEach(add);
  Object.values(read('fish-photos.json').photos || {}).forEach(add);
  assert.ok(all.length > 1000, 'photo records read');
  const rec = all.map(p => ({
    ...(p.lic ? {lic: p.lic} : {}),
    a: p.a || '',
    ...(p.own ? {own: true} : {}),
    ...(p.imr ? {imr: true} : {}),
    ...(p.cf ? {cf: 1} : {})
  }));
  const {licence} = require('../presence.js');
  const js = rec.map(p => [C.licOf(p), C.rightsClass(p)]);
  assert.deepStrictEqual(
    rec.map(licence),
    js.map(x => x[0]),
    'presence.js licence is core.js licOf'
  );
  const P = py(
    `from rights import licence, rights_class\nprint(json.dumps([[licence(p), rights_class(p)] for p in json.load(sys.stdin)]))`,
    JSON.stringify(rec)
  );
  assert.deepStrictEqual(P, js);
  // A recorded licence always agrees with its credit line, where the credit names one.
  all.forEach(p => {
    if (p.lic && p.a && C.licOf({a: p.a})) assert.strictEqual(C.licOf({a: p.a}), String(p.lic).toLowerCase(), p.f);
  });
});

test('easyRank: the rights break a tie only, after reference level, ease and refScore, before the hash', () => {
  // Same ease and tags: the open and own photos before the NC ones, whatever the hash says; own and open alike.
  const L = ['n1', 'n2', 'n3', 'o1', 'm1'].map(f => ({
    f,
    e: 4,
    jt: 'p1g1sm1',
    lic: f[0] === 'o' ? 'cc-by' : 'cc-by-nc',
    ...(f[0] === 'm' ? {own: true} : {})
  }));
  const R = C.easyRank(L).map(p => p.f);
  assert.deepStrictEqual(R.slice(0, 2).sort(), ['m1', 'o1']);
  assert.deepStrictEqual(R.slice(2).sort(), ['n1', 'n2', 'n3']);
  // Own and open keep the hash order between them: neither source is boosted over the other (P1, fish).
  const hashOnly = C.easyRank(L.filter(p => p.f[0] !== 'n').map(p => ({...p, lic: 'cc-by-nc', own: false}))).map(p => p.f);
  assert.deepStrictEqual(R.slice(0, 2), hashOnly);
  // Never above quality: an easier NC photo, a more reference-like NC photo, a reference-level NC photo stay first.
  assert.deepStrictEqual(
    C.easyRank([
      {f: 'open', e: 4, lic: 'cc0'},
      {f: 'nc', e: 5, lic: 'cc-by-nc'}
    ]).map(p => p.f),
    ['nc', 'open']
  );
  assert.deepStrictEqual(
    C.easyRank([
      {f: 'open', e: 4, jt: 'o1g1sm1', lic: 'cc0'},
      {f: 'nc', e: 4, jt: 'p1g0sl1', lic: 'cc-by-nc'}
    ]).map(p => p.f),
    ['nc', 'open']
  );
  assert.deepStrictEqual(
    C.easyRank([
      {f: 'open', e: 5, jt: 'o1g1sm1', lic: 'cc0'},
      {f: 'nc', e: 4, jt: 'p1g0sl1', rep: 'inaturalist', lic: 'cc-by-nc'}
    ]).map(p => p.f),
    ['nc', 'open']
  );
  // The players' ratings (a difficulty function) rank before the rights too.
  assert.deepStrictEqual(
    C.easyRank(
      [
        {f: 'open', e: 4, lic: 'cc0'},
        {f: 'nc', e: 4, lic: 'cc-by-nc'}
      ],
      p => (p.f === 'nc' ? -1 : 0)
    ).map(p => p.f),
    ['nc', 'open']
  );
});

test('fishGen: a family cover between equal photos is an open one; an easier NC photo still wins', () => {
  const T = {
    families: [{id: 'f:X', name: 'X', species: ['s1'], circle: 1}],
    species: [{id: 's1', name: 'Xus one'}]
  };
  const ph = (f, e, lic) => ({f, src: 'x', sp: 's1', e, jt: 'p1g1sm1', lic});
  // Every hash order: whichever names the photos carry, the open one leads among equals.
  ['a', 'b', 'c', 'd', 'e'].forEach(x => {
    const G = C.fishGen(T, {t: [ph(x + 'nc1', 4, 'cc-by-nc'), ph(x + 'nc2', 4, 'cc-by-nc'), ph(x + 'open', 4, 'cc-by')]});
    assert.strictEqual(G.gen['f:X'].cover, x + 'open');
  });
  const G = C.fishGen(T, {t: [ph('nc', 5, 'cc-by-nc'), ph('open', 4, 'cc0')]});
  assert.strictEqual(G.gen['f:X'].cover, 'nc');
  // The list the draw reads keeps no licence (model.js photoSet's ties follow it, Codex review #742): the hash order.
  const L = ['a', 'b', 'c', 'd', 'e', 'f'].map((x, i) => ph(x, 4, i % 2 ? 'cc-by' : 'cc-by-nc'));
  const W = C.fishGen(T, {t: L}).gen['f:X'];
  assert.deepStrictEqual(
    W.views.wide.map(p => p.f),
    C.easyRank(L, undefined, false).map(p => p.f)
  );
  assert.strictEqual(W.cover, C.easyCover(L).f);
  assert.strictEqual(C.rightsClass(W.views.wide.find(p => p.f === W.cover)), 'open');
});

test('applySlots: equal quality, an open photo is featured before an NC one; quality and the source order still first', () => {
  const p = (f, lic, x = {}) => ({f, lic, o: 'https://www.inaturalist.org/observations/' + f, ...x});
  const d = {
    gen: {
      G: {
        views: {
          wide: [
            p('nc1', 'cc-by-nc'),
            p('nc2', 'cc-by-nc'),
            p('ncgood', 'cc-by-nc'),
            p('open', 'cc-by'),
            p('own', 'cc-by-nc', {own: true})
          ],
          medium: [],
          macro: []
        }
      }
    },
    course: {}
  };
  C.applySlots(d, {quality: {ncgood: 3}}, {autoq: {}});
  const feat = d.gen.G.sl.wide.feat.map(x => x.f);
  // Pierre's own first (the corals' source order, P1), then the better NC photo (quality), then the open one before
  // the NC ones of the same quality.
  assert.deepStrictEqual(feat, ['own', 'ncgood', 'open']);
  assert.deepStrictEqual(
    d.gen.G.sl.wide.more.map(x => x.f),
    ['nc1', 'nc2']
  );
  // Every photo stays in the games, in the order without the rights (the draw's ties follow it, Codex review #742):
  // the featured of the quality order (own, ncgood, nc1) lead, then the rest by source and quality.
  assert.deepStrictEqual(
    d.gen.G.sl.wide.game.map(x => x.f),
    ['own', 'ncgood', 'nc1', 'nc2', 'open']
  );
});

test('fishRun and fishQueue: between equal candidates, an open licence or his own first; the ease still first', () => {
  const ph = (f, lic, own) => ({f, o: 'obs-' + f, lic, ...(own ? {own: true} : {})});
  const cands = {
    s1: [ph('a-nc', 'cc-by-nc'), ph('b-nc', 'cc-by-nc'), ph('c-open', 'cc-by'), ph('d-own', 'cc-by-nc', true), ph('e-nc5', 'cc-by-nc')]
  };
  const j = e => ({k: 'best', jt: 'p1g1sm1', e});
  const sug = {'a-nc': j(4), 'b-nc': j(4), 'c-open': j(4), 'd-own': j(4), 'e-nc5': j(5)};
  // Room for two observations: the easiest first (an NC photo of ease 5), then an open photo among the equals of ease 4.
  const T = A.FISHT.obs;
  A.FISHT.obs = 2;
  try {
    const {F} = A.fishRun(cands, sug, {s1: {id: 's1'}}, {}, '2026-11-08', true);
    // None of these names is a Check (autoCheck): the easiest, then the first open or own photo of ease 4 (c before d).
    ['a-nc', 'b-nc', 'c-open', 'd-own', 'e-nc5'].forEach(f => assert.strictEqual(A.autoCheck(f), false, f));
    assert.deepStrictEqual(Object.keys(F.add).sort(), ['c-open', 'e-nc5']);
  } finally {
    A.FISHT.obs = T;
  }
  const Q = A.fishQueue(cands, sug, {s1: {id: 's1'}}, {}).map(x => x.p.f);
  assert.strictEqual(Q[0], 'e-nc5');
  assert.deepStrictEqual(Q.slice(1, 3).sort(), ['c-open', 'd-own']);
  assert.deepStrictEqual(Q.slice(3), ['a-nc', 'b-nc']);
});

test('fishOrder and fishCoverOf (the admin): the rights break a tie; his cover pick wins', () => {
  const L = [
    {f: 'a', lic: 'cc-by-nc'},
    {f: 'b', lic: 'cc0'}
  ];
  const j = () => ({e: 4, jt: 'p1g1sm1'});
  assert.deepStrictEqual(
    A.fishOrder(L, {}, 'f:X', 's1', j).rest.map(p => p.f),
    ['b', 'a']
  );
  assert.strictEqual(A.fishCoverOf(L, {}, 'f:X', j).f, 'b');
  assert.strictEqual(A.fishCoverOf(L, {genera: {'f:X': {cover: 'a'}}}, 'f:X', j).f, 'a');
});

test('fetch_local tie_key: Research Grade first, then more votes, then an open or own observation; no votes count, the old order', () => {
  const R = py(`from fetch_local import tie_key
o = lambda v, login='x', g='research': {'user': {'login': login}, 'quality_grade': g, **({} if v is None else {'cached_votes_total': v})}
nc, op = [{'license_code': 'cc-by-nc'}], [{'license_code': 'cc-by-nc'}, {'license_code': 'cc0'}]
print(json.dumps([
  tie_key(o(0), op, 5) < tie_key(o(0), nc, 1),
  tie_key(o(0, 'ppericard'), nc, 5) < tie_key(o(0), nc, 1),
  tie_key(o(2), nc, 1) < tie_key(o(0), op, 5),
  tie_key(o(None), nc, 1) < tie_key(o(None), op, 5),
  # Research Grade before a genus-level or expert ID, whatever the votes or the licence (Codex review #742).
  tie_key(o(0), nc, 1) < tie_key(o(3, g='needs_id'), op, 0),
]))`);
  assert.deepStrictEqual(R, [true, true, true, true, true]);
});

test('fetch_fish lic_class: his own, CC0 / CC BY, NC (select reads it as the last tie-break, Q284)', () => {
  const R = py(`from fetch_fish import lic_class
print(json.dumps([lic_class(l, o) for l, o in [('cc-by-nc', True), ('cc-by', True), (None, True), ('cc0', False), ('cc-by', False), ('cc-by-nc', False), (None, False)]]))`);
  assert.deepStrictEqual(R, [0, 0, 0, 1, 1, 2, 2]);
});

// The rights facet (docs/ROADMAP.md "Rights tagged for a later split", licence study 2026-11-08): presence.js rightsTally,
// rightsBy and speciesOf, which admin.js renderRights (Inbox › Coverage › Rights) and Coverage › Games' summary line read.
// Read-only counts: commercial-ready = own + open.
test('rightsTally: the photos by rights class, each photo once, commercial-ready = own + open', () => {
  const P = require('../presence.js');
  const L = [
    {f: 'a', own: true, lic: 'cc-by-nc'},
    {f: 'b', lic: 'cc0'},
    {f: 'c', a: '(c) X, some rights reserved (CC BY)'},
    {f: 'd', lic: 'cc-by-nc'},
    {f: 'e', a: '(c) X, some rights reserved (CC BY-NC-SA)'},
    {f: 'g', imr: true},
    {f: 'h', cf: 1},
    {f: 'b', lic: 'cc0'}, // the same photo twice counts once
    null
  ];
  assert.deepStrictEqual(P.rightsTally(L), {n: 7, ready: 3, own: 1, open: 2, nc: 2, imr: 1, book: 1});
  assert.deepStrictEqual(P.rightsTally([]), {n: 0, ready: 0, own: 0, open: 0, nc: 0, imr: 0, book: 0});
  assert.deepStrictEqual(P.rightsTally(undefined).n, 0);
  assert.deepStrictEqual(P.RIGHTS, ['own', 'open', 'nc', 'imr', 'book']);
  // Every class rightsClass gives has its count.
  L.filter(Boolean).forEach(p => assert.ok(P.RIGHTS.includes(C.rightsClass(p))));
});

test('rightsBy, speciesOf: per species in the order they first appear, genus-only and unnamed photos left out', () => {
  const P = require('../presence.js');
  assert.strictEqual(P.speciesOf({t: 'Acropora florida'}), 'Acropora florida');
  assert.strictEqual(P.speciesOf({t: 'Porites lobata lobata'}), 'Porites lobata');
  assert.strictEqual(P.speciesOf({t: 'Acropora'}), null);
  assert.strictEqual(P.speciesOf({t: 'Acropora Group A'}), null);
  assert.strictEqual(P.speciesOf({imr: true}), null);
  assert.strictEqual(P.speciesOf(null), null);
  const L = [
    {f: '1', t: 'Acropora florida', lic: 'cc-by-nc'},
    {f: '2', t: 'Acropora', lic: 'cc-by'},
    {f: '3', t: 'Acropora cerealis', own: true},
    {f: '4', t: 'Acropora florida', lic: 'cc-by'},
    {f: '5', imr: true}
  ];
  assert.deepStrictEqual(
    P.rightsBy(L, P.speciesOf).map(([k, T]) => [k, T.n, T.ready, T.nc]),
    [
      ['Acropora florida', 2, 1, 1],
      ['Acropora cerealis', 1, 1, 0]
    ]
  );
});

test("the facet on today's photos: every coral genus and fish species tallied, the classes adding up to the photos", () => {
  const P = require('../presence.js');
  const D = read('data.json');
  // A genus page's photos (admin.js own): its views, the extra photos and the IMR lecture photos (data.json course).
  const coral = [
    ...Object.values(D.gen).flatMap(g => [...Object.values(g.views || {}).flat(), ...Object.values(g.more || {}).flat()]),
    ...Object.values(D.course || {}).flat()
  ];
  const T = P.rightsTally(coral);
  assert.ok(T.n > 200, 'coral photos ' + T.n);
  assert.strictEqual(
    P.RIGHTS.reduce((s, c) => s + T[c], 0),
    T.n
  );
  assert.strictEqual(T.ready, T.own + T.open);
  assert.strictEqual(T.book, 0, 'no Coral Finder book photo since #748 (tests/nobook.test.js)');
  assert.ok(T.own > 0 && T.open > 0 && T.nc > 0 && T.imr > 0, JSON.stringify(T));
  const fish = Object.values(C.fishGameRead(read('fish-game.json')).photos).flat();
  const F = P.rightsTally(fish);
  assert.ok(F.n > 500, 'fish photos ' + F.n);
  assert.strictEqual(F.imr + F.book, 0, 'no IMR slide photo for fish (rule P1)');
  assert.strictEqual(F.own + F.open + F.nc, F.n);
  // Per species, the tallies add up to the whole.
  const S = P.rightsBy(fish, p => p.sp);
  assert.strictEqual(
    S.reduce((s, [, t]) => s + t.n, 0),
    F.n
  );
});
