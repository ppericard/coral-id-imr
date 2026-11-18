require('./slot.js').testGuard();
// The sea slugs' structure and look-alike lines in the content editor (Pierre, 2026-11-18, on #1061's two open items:
// "Option 2 : on le construit maintenant"):
// - a genus's look-alike line (core.js SUBJECTS seaslug content genus lsrc/<other genus>), a list of sources {t, u}, the
//   slot type srcs, laid over seaslug.json as every text slot (contentApply, the overlay's {v, src, was, t}), kept against
//   a rebuilt base (stale: his stays in force; absorbed), edited in the admin's Sheet box (admin-content.js sheetVal,
//   srcsText);
// - their look-alike pairs between genera (SUBJECTS seaslug structure: srcsStructure), the stamp (structStamp), and the
//   sheet's replay of a sea-slug player under the pairs in force (Code.gs subjRpl_, replays_), as the fish's and the
//   corals' (tests/structure.test.js, tests/coralcontent.test.js). The edits here are made up: the real curation.json holds
//   none (A1: only Pierre's Publish writes it).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js'),
  {loadCodeGs} = require('./gas.js'),
  C = require('../core.js'),
  AC = require('../admin-content.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  SJSON = src('seaslug.json'),
  F = JSON.parse(SJSON),
  CUR = JSON.parse(src('curation.json')),
  S = C.subjectOf('seaslug'),
  plain = x => JSON.parse(JSON.stringify(x));
const gen = (R, id) => R.genera.find(g => g.id === id);
const cur = c => ({seaslug: {content: c}});
// Hypselodoris and Goniobranchus: a declared pair of one family (a Sea Slug Forum fact sheet, Nudi Pixel); Goniobranchus
// and Phyllidiella: one across two families (the phyllidiid mimic); Chromodoris and Nembrotha: a data pair (iNaturalist's
// identifications only, dlook).
const HG = 'g:Goniobranchus|g:Hypselodoris',
  GP = 'g:Goniobranchus|g:Phyllidiella',
  CN = 'g:Chromodoris|g:Nembrotha';

test('the data: the pairs and lines the editor reads are where the build writes them', () => {
  assert.ok(gen(F, 'g:Hypselodoris').look.includes('g:Goniobranchus'));
  assert.ok(gen(F, 'g:Goniobranchus').look.includes('g:Phyllidiella'));
  assert.notStrictEqual(gen(F, 'g:Goniobranchus').family, gen(F, 'g:Phyllidiella').family);
  assert.ok(gen(F, 'g:Chromodoris').dlook.includes('g:Nembrotha') && !(gen(F, 'g:Chromodoris').look || []).includes('g:Nembrotha'));
  // every line a list of sources, the slot's type
  const sp = S.content.genus.slots.find(x => x.k === 'lsrc');
  assert.deepStrictEqual([sp.t, sp.map], ['srcs', 1]);
  F.genera.forEach(g => Object.keys(g.lsrc || {}).forEach(o => assert.ok(C.contentBase(sp, g, o), `${g.id} ${o}`)));
  // nothing edited on main: the built file itself and the empty stamp (the deploy replays nobody)
  assert.strictEqual(C.contentApply(S, F, CUR), F);
  assert.strictEqual(C.structStamp(S, F, CUR), '');
  assert.strictEqual(C.structFp(S, CUR), '');
});

// ---- (a) The look-alike lines ----

test('a look-alike line edited: laid over the built file, its pair kept; hidden, an empty list; never the wrong type', () => {
  const base = gen(F, 'g:Hypselodoris').lsrc['g:Goniobranchus'],
    v = [{t: 'Made-up guide, p. 12', u: 'https://example.org/a'}, {t: 'Made-up forum message'}],
    c = cur({nodes: {'g:Hypselodoris': {'lsrc/g:Goniobranchus': {v, was: base, t: 1}}}}),
    A = C.contentApply(S, F, c),
    H = gen(A, 'g:Hypselodoris');
  assert.deepStrictEqual(H.lsrc['g:Goniobranchus'], v);
  assert.deepStrictEqual(H.look, gen(F, 'g:Hypselodoris').look, 'the pair is structure: unchanged');
  assert.deepStrictEqual(gen(A, 'g:Goniobranchus').lsrc['g:Hypselodoris'], gen(F, 'g:Goniobranchus').lsrc['g:Hypselodoris'], 'one side');
  assert.deepStrictEqual(gen(F, 'g:Hypselodoris').lsrc['g:Goniobranchus'], base, 'the built file is not changed');
  // the text is not structure: no stamp, the replay's units unchanged
  assert.strictEqual(C.structStamp(S, F, c), '');
  assert.deepStrictEqual(S.replayed.gen(A), S.replayed.gen(F));
  // a data pair's line too (its iNaturalist counts)
  const d = C.contentApply(S, F, cur({nodes: {'g:Chromodoris': {'lsrc/g:Nembrotha': {v: [{t: 'Mine'}], was: null, t: 1}}}}));
  assert.deepStrictEqual(gen(d, 'g:Chromodoris').lsrc['g:Nembrotha'], [{t: 'Mine'}]);
  // hidden: the pair keeps an empty list (its readers map it: app.js fishGenera, learn.js fishGenusLooks)
  const h = gen(
    C.contentApply(S, F, cur({nodes: {'g:Hypselodoris': {'lsrc/g:Goniobranchus': {v: null, was: base, t: 1}}}})),
    'g:Hypselodoris'
  );
  assert.deepStrictEqual(h.lsrc['g:Goniobranchus'], []);
  assert.ok(h.look.includes('g:Goniobranchus'));
  // never applied: words where sources go, a source with no words, a pair the base does not hold
  const E = C.contentEntries(S, F, {
    nodes: {
      'g:Hypselodoris': {'lsrc/g:Goniobranchus': {v: ['words'], was: base, t: 1}, 'lsrc/g:Phyllidia': {v: [{t: 'x'}], was: null, t: 1}},
      'g:Goniobranchus': {'lsrc/g:Hypselodoris': {v: [{t: ' ', u: 'https://example.org'}], was: null, t: 1}}
    }
  });
  assert.deepStrictEqual(
    E.map(x => [x.node, x.slot, x.state, x.why]),
    [
      ['g:Goniobranchus', 'lsrc/g:Hypselodoris', 'orphan', 'value'],
      ['g:Hypselodoris', 'lsrc/g:Goniobranchus', 'orphan', 'value'],
      ['g:Hypselodoris', 'lsrc/g:Phyllidia', 'orphan', 'slot']
    ]
  );
});

test('a rebuild keeps his line: stale while the base changed (his in force), absorbed once the base says it', () => {
  const sp = S.content.genus.slots.find(x => x.k === 'lsrc'),
    base = gen(F, 'g:Hypselodoris').lsrc['g:Goniobranchus'],
    v = [{t: 'Made-up guide'}],
    c = cur({nodes: {'g:Hypselodoris': {'lsrc/g:Goniobranchus': {v, was: base, t: 1}}}}),
    rebuilt = plain(F),
    state = R => C.contentEntries(S, R, c.seaslug.content).map(x => x.state);
  assert.deepStrictEqual(state(F), ['fresh']);
  gen(rebuilt, 'g:Hypselodoris').lsrc['g:Goniobranchus'] = [...base, {t: 'A new source of the build', u: 'https://example.org/b'}];
  assert.deepStrictEqual(state(rebuilt), ['stale']);
  assert.deepStrictEqual(gen(C.contentApply(S, rebuilt, c), 'g:Hypselodoris').lsrc['g:Goniobranchus'], v, 'his stays in force (Q359 c)');
  gen(rebuilt, 'g:Hypselodoris').lsrc['g:Goniobranchus'] = v;
  assert.deepStrictEqual(state(rebuilt), ['absorbed']);
  // Keep mine, as the admin writes it: his against the base now, fresh again; the base's value removes the entry
  const k = C.contentSet(
    c.seaslug.content,
    'g:Hypselodoris',
    'lsrc/g:Goniobranchus',
    v,
    C.contentBase(sp, gen(F, 'g:Hypselodoris'), 'g:Goniobranchus'),
    null,
    2
  );
  assert.deepStrictEqual(
    C.contentEntries(S, F, k).map(x => x.state),
    ['fresh']
  );
  assert.deepStrictEqual(C.contentSet(k, 'g:Hypselodoris', 'lsrc/g:Goniobranchus', base, base, null, 3).nodes['g:Hypselodoris'], {});
});

test("the admin's box: one source a line, its words | its link; the base's own lines read back unchanged", () => {
  const sp = S.content.genus.slots.find(x => x.k === 'lsrc');
  F.genera.forEach(g =>
    Object.entries(g.lsrc || {}).forEach(([o, L]) => assert.deepStrictEqual(AC.sheetVal(sp, AC.srcsText(L)), L, `${g.id} ${o}`))
  );
  assert.deepStrictEqual(
    AC.sheetVal(
      sp,
      ' Made-up guide | https://example.org/a \n\n Made-up forum   message\nhttps://example.org/c\nA page https://example.org/d'
    ),
    [
      {t: 'Made-up guide', u: 'https://example.org/a'},
      {t: 'Made-up forum message'},
      {t: 'https://example.org/c', u: 'https://example.org/c'},
      {t: 'A page', u: 'https://example.org/d'}
    ]
  );
  assert.strictEqual(AC.sheetVal(sp, ' \n '), null, 'emptied: hidden');
  // a Save of the box unchanged writes nothing (the base's value removes the entry)
  const g = gen(F, 'g:Hypselodoris'),
    base = C.contentBase(sp, g, 'g:Goniobranchus');
  assert.deepStrictEqual(C.contentSet({}, g.id, 'lsrc/g:Goniobranchus', AC.sheetVal(sp, AC.srcsText(base)), base, null, 1).nodes[g.id], {});
  // the rows of a genus's Sheet box: one line per pair its base holds, declared and data
  const rows = AC.sheetSlots(S, F, {}, 'g:Chromodoris').filter(r => r.sp && r.sp.k === 'lsrc');
  assert.deepStrictEqual(rows.map(r => r.key).sort(), Object.keys(gen(F, 'g:Chromodoris').lsrc).sort());
});

// ---- (b) The structure: the genus pairs ----

test('pairs: a withdrawn pair leaves both genera; an added one joins both, its line the sources, out of the data pairs', () => {
  const c = cur({
      pairs: {
        [GP]: {v: null, was: 1, t: 1},
        [CN]: {v: 1, was: null, src: {t: 'Made-up guide', u: 'https://example.org/a'}, t: 1},
        'g:Doriprismatica|g:Phyllidia': {v: 1, was: null, t: 1}
      }
    }),
    A = C.contentApply(S, F, c);
  // withdrawn: off both looks and lsrc lines
  assert.ok(!gen(A, 'g:Goniobranchus').look.includes('g:Phyllidiella') && !gen(A, 'g:Phyllidiella').look.includes('g:Goniobranchus'));
  assert.ok(!('g:Phyllidiella' in gen(A, 'g:Goniobranchus').lsrc) && !('g:Goniobranchus' in gen(A, 'g:Phyllidiella').lsrc));
  // added from a data pair: declared both ways, out of dlook, its iNaturalist line kept with his source after it
  ['g:Chromodoris', 'g:Nembrotha'].forEach((a, i, L) => {
    const o = L[1 - i];
    assert.ok(gen(A, a).look.includes(o), a);
    assert.ok(!(gen(A, a).dlook || []).includes(o), a);
    assert.deepStrictEqual(gen(A, a).lsrc[o], [...gen(F, a).lsrc[o], {t: 'Made-up guide', u: 'https://example.org/a'}]);
  });
  assert.deepStrictEqual(gen(A, 'g:Chromodoris').dlook, ['g:Phyllidiopsis'], 'its other data pair stays');
  // added with no line and no source: the editor's words as its one source
  assert.deepStrictEqual(gen(A, 'g:Phyllidia').lsrc['g:Doriprismatica'], [{t: 'Added by the content editor'}]);
  // the built file untouched, and the records no pair touches shared
  assert.ok(gen(F, 'g:Goniobranchus').look.includes('g:Phyllidiella') && gen(F, 'g:Chromodoris').dlook.includes('g:Nembrotha'));
  assert.strictEqual(gen(A, 'g:Hexabranchus'), gen(F, 'g:Hexabranchus'));
  // the line of the withdrawn pair: never applied; the added pair's: a slot to fill, read with the pairs in force
  const base = gen(F, 'g:Goniobranchus').lsrc['g:Phyllidiella'],
    E = C.contentEntries(S, A, {nodes: {'g:Goniobranchus': {'lsrc/g:Phyllidiella': {v: [{t: 'x'}], was: base, t: 1}}}});
  assert.deepStrictEqual(
    E.map(x => [x.state, x.why]),
    [['orphan', 'slot']]
  );
  const rows = AC.sheetSlots(S, F, c.seaslug.content, 'g:Phyllidia').filter(r => r.key === 'g:Doriprismatica');
  assert.deepStrictEqual(
    rows.map(r => r.base),
    [[{t: 'Added by the content editor'}]]
  );
  // the admin's pair rows: the base's nine pairs, his three over them
  const P = AC.pairRows(S, F, c.seaslug.content);
  assert.strictEqual(AC.pairRows(S, F, {}).length, 9);
  assert.deepStrictEqual(
    P.filter(r => r.e).map(r => [r.key, r.base, r.v, r.state]),
    [
      [CN, null, 1, 'fresh'],
      ['g:Doriprismatica|g:Phyllidia', null, 1, 'fresh'],
      [GP, 1, null, 'fresh']
    ]
  );
});

test("the replay's units follow the pairs (core.js fishReplayGen at the genus), a family's genera stay each other's", () => {
  const R0 = S.replayed.gen(F),
    c = cur({pairs: {[GP]: {v: null, was: 1, t: 1}, [HG]: {v: null, was: 1, t: 1}, [CN]: {v: 1, was: null, t: 1}}}),
    R1 = S.replayed.gen(C.contentApply(S, F, c));
  assert.ok(R0['g:Goniobranchus'].look.includes('g:Phyllidiella') && !R1['g:Goniobranchus'].look.includes('g:Phyllidiella'));
  assert.ok(!R0['g:Chromodoris'].look.includes('g:Nembrotha') && R1['g:Chromodoris'].look.includes('g:Nembrotha'));
  assert.ok(R1['g:Nembrotha'].look.includes('g:Chromodoris'));
  // Hypselodoris and Goniobranchus: one family, so still look-alikes (traps) once the declared pair is withdrawn
  assert.strictEqual(gen(F, 'g:Hypselodoris').family, gen(F, 'g:Goniobranchus').family);
  assert.ok(R1['g:Hypselodoris'].look.includes('g:Goniobranchus'));
  // the fish's and the corals' structures are their own
  assert.strictEqual(C.structStamp(C.subjectOf('fish'), require('../fish.json'), c), '');
});

test('the stamp: one per structure in force, empty again at the undo, the same from the players copy', () => {
  const a = cur({pairs: {[GP]: {v: null, was: 1, t: 1}}}),
    b = cur({pairs: {[GP]: {v: null, was: 1, t: 5, by: 'x'}}}),
    st = C.structStamp(S, F, a);
  assert.match(st, /^[0-9a-z]+$/);
  assert.strictEqual(C.structStamp(S, F, b), st, 'was, t and by do not count');
  assert.strictEqual(C.structStamp(S, F, cur({pairs: {[GP]: {v: null}}})), st, "the players' copy (v only)");
  assert.notStrictEqual(C.structStamp(S, F, cur({pairs: {[GP]: {v: null, was: 1, t: 1}, [CN]: {v: 1, was: null, t: 1}}})), st);
  assert.strictEqual(C.structStamp(S, F, cur({pairs: {}})), '', 'the undo');
  assert.strictEqual(C.structStamp(S, F, cur({pairs: {[GP]: {v: 1, was: 1, t: 1}}})), '', 'the base value: nothing changes');
  // a pair key that is not two genera in code-point order, or a genus the base lacks: kept, never applied
  const E = C.structEntries(S, F, {pairs: {'g:Phyllidiella|g:Goniobranchus': {v: null}, 'g:Goniobranchus|g:Nope': {v: 1}}});
  assert.deepStrictEqual(
    E.pairs.map(x => [x.key, x.why]),
    [
      ['g:Goniobranchus|g:Nope', 'node'],
      ['g:Phyllidiella|g:Goniobranchus', 'key']
    ]
  );
  assert.strictEqual(C.structApply(S, F, cur({pairs: {'g:Goniobranchus|g:Nope': {v: 1}}})), F);
});

test('the app: before the script that replays under the pairs, the text slots alone (rule D4); app.js fishGenera reads a hidden line', () => {
  const c = cur({
      nodes: {'g:Hypselodoris': {'lsrc/g:Goniobranchus': {v: null, was: gen(F, 'g:Hypselodoris').lsrc['g:Goniobranchus'], t: 1}}},
      pairs: {[GP]: {v: null, was: 1, t: 1}}
    }),
    off = C.contentApply(S, F, c, {structure: false}),
    on = C.contentApply(S, F, c);
  assert.ok(gen(off, 'g:Goniobranchus').look.includes('g:Phyllidiella'), 'the pairs wait for the script');
  assert.deepStrictEqual(gen(off, 'g:Hypselodoris').lsrc['g:Goniobranchus'], [], 'the text slot at once');
  assert.ok(!gen(on, 'g:Goniobranchus').look.includes('g:Phyllidiella'));
  // app.js fishGenera on the units made from it, as the app makes them (fishBuild)
  const ctx = {
    easyCover: C.easyCover,
    fishScoreTree: C.fishScoreTree,
    fishSpUnits: C.fishSpUnits,
    fishGenSets: C.fishGenSets,
    rankWeights: C.rankWeights
  };
  vm.createContext(ctx);
  vm.runInContext(
    block(src('app.js'), 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + '\nthis.fishGenera = fishGenera;',
    ctx
  );
  const GM = C.fishGameRead(JSON.parse(src('seaslug-game.json'))),
    X = C.fishGen(on, C.fishPhotos({}, GM.photos, C.treeCur(S, CUR)), undefined, C.unitRankOf(S));
  ctx.fishGenera(X, on);
  assert.strictEqual(X.gen['g:Hypselodoris'].lsrc['g:Goniobranchus'], '');
  assert.ok(!X.gen['g:Goniobranchus'].decl.includes('g:Phyllidiella'), 'no longer a declared look-alike (duels, groups)');
});

test('the admin: every genus of a subject played at the genus has the boxes, one the app opens as its family included', () => {
  const T = C.fishTree(F);
  assert.notStrictEqual(T.go('g:Hexabranchus'), 'g:Hexabranchus');
  assert.ok(AC.sheetOwn(F, 'g:Hexabranchus', S));
  assert.ok(AC.sheetOwn(F, 'g:Hypselodoris', S));
  // the fish keep theirs: a genus the app sends to its family has none
  const FI = require('../fish.json'),
    TF = C.fishTree(FI),
    g = FI.genera.find(x => TF.go(x.id) !== x.id);
  assert.ok(g && !AC.sheetOwn(FI, g.id, C.subjectOf('fish')));
});

// ---- The sheet (Code.gs): a sea-slug player replayed under the pairs in force, keyed by the stamp (Q363 h A) ----

const SRV = C.rvOf('seaslug');
// GitHub main as the sheet reads it: seaslug.json, and a curation.json the test changes.
function mainFiles() {
  const m = {cur: CUR, n: {f: 0, cur: 0}};
  m.fetch = url =>
    /\/main\/seaslug\.json$/.test(url)
      ? (m.n.f++, {getResponseCode: () => 200, getContentText: () => SJSON})
      : /\/main\/curation\.json$/.test(url)
        ? (m.n.cur++, {getResponseCode: () => 200, getContentText: () => JSON.stringify(m.cur)})
        : null;
  return m;
}
// Sea-slug answers with mix-ups across the pairs, logged with no scoring record.
const slugLog = (p, n = 24) =>
  Array.from({length: n}, (_, i) => {
    const [g, o] = i % 2 ? ['g:Goniobranchus', 'g:Phyllidiella'] : ['g:Chromodoris', 'g:Nembrotha'],
      ok = i % 3 !== 0;
    return {
      id: p + i,
      t: new Date(Date.UTC(2026, 10, 17, 6, 0, i)).toISOString(),
      s: 'seaslug',
      rk: 'genus',
      g,
      a: ok ? g : o,
      ok: ok ? 1 : 0,
      m: 'quiz',
      ph: 'seaslug-' + (100 + (i % 4)),
      ch: [g, o, 'g:Hypselodoris', 'g:Phyllidia'].join(' ')
    };
  });
const PAIRS = cur({pairs: {[GP]: {v: null, was: 1, t: 1}, [CN]: {v: 1, was: null, t: 1}}});
const saved = {
  'reefid-sync-coral-progress': '{}',
  'reefid-sync-coral-rv': JSON.stringify(C.RV),
  'reefid-sync-seaslug-progress': '{}',
  'reefid-sync-seaslug-rv': JSON.stringify(SRV)
};

test('the sheet: a pair Publish replays a sea-slug player under the pairs in force, its undo gives the same record back', () => {
  const m = mainFiles(),
    s = loadCodeGs({fetch: m.fetch}),
    L = slugLog('a'),
    rows = L.map(a => C.logRow(a, 'ana')),
    A = C.contentApply(S, F, PAIRS),
    want0 = C.replayProgress(rows, {gen: S.replayed.gen(F)}).ana.P,
    want1 = C.replayProgress(rows, {gen: S.replayed.gen(A)}).ana.P,
    st1 = C.structStamp(S, F, PAIRS),
    save = x => s.post({name: 'Ana', pin: '1234', data: saved, summary: {}, answers: [], rv: C.RV, rvs: {seaslug: SRV}, ...x});
  s.post({name: 'Ana', pin: '1234', data: saved, summary: {}, answers: L, rv: C.RV});
  assert.ok(st1);
  // the replay's units differ (a pair across families withdrawn, one added); how much the bars move is the replay's
  // (with a scoring record an answer is scored as logged), so the records are compared with core.js's own replay
  assert.notDeepStrictEqual(S.replayed.gen(A), S.replayed.gen(F));
  // no edit: an app that says the empty stamp gets nothing (no replay at the deploy); an older app (no sts) neither
  assert.ok(!save({sts: {seaslug: ''}}).replays);
  assert.ok(!save({}).replays);
  // the Publish, read at once when a device holds the new stamp (stn)
  m.cur = PAIRS;
  const r1 = save({sts: {seaslug: ''}, stn: {seaslug: st1}});
  assert.ok(r1.replays && r1.replays.seaslug, 'replayed under the pairs in force');
  assert.deepStrictEqual([r1.replays.seaslug.rv, r1.replays.seaslug.st, r1.replays.seaslug.n], [SRV, st1, L.length]);
  assert.deepStrictEqual(plain(r1.replays.seaslug.rec), plain(want1));
  assert.ok(String(Array.from(s.sheets['Replayed Sea slugs'].rows[1])[3]).endsWith('~' + st1), 'the stamp in the cache identity');
  assert.ok(!save({sts: {seaslug: st1}}).replays, 'applied: nothing more');
  // the units it replayed with are the pairs in force (on this made-up log the records come out the same either way:
  // observed, the cause not traced; the stamp and the units are what this test holds)
  const U = s.ctx.subjRpl_('seaslug').gen;
  assert.ok(U['g:Chromodoris'].look.includes('g:Nembrotha') && !U['g:Goniobranchus'].look.includes('g:Phyllidiella'));
  // the undo, read at the trigger's next run: the stamp empty again, the first record exactly
  m.cur = CUR;
  s.ctx.subjStRefresh_();
  const r2 = save({sts: {seaslug: st1}});
  assert.ok(r2.replays && !('st' in r2.replays.seaslug));
  assert.deepStrictEqual(plain(r2.replays.seaslug.rec), plain(want0));
  assert.strictEqual(s.ctx.subjRpl_('seaslug').st, '');
  // seaslug.json read once per structure (the units under the curation's fingerprint), the curation at each refresh
  assert.ok(m.n.f <= 3 && m.n.cur >= 2, JSON.stringify(m.n));
});

test('sync.js stNow: each subject says its own stamp, its own tree in force (app.js treeWith), whatever is on screen', () => {
  const stamps = {fish: 'f1', seaslug: 's1'};
  let at = 'seaslug';
  const ctx = {
    UNITS: {fish: {st: () => stamps[at]}, seaslug: {st: () => stamps[at]}, coral: {}},
    treeWith: (id, f) => {
      const was = at;
      at = id;
      try {
        return f();
      } finally {
        at = was;
      }
    }
  };
  vm.createContext(ctx);
  vm.runInContext(block(src('sync.js'), 'const stNow = ', '\n// {sts:', {file: 'sync.js'}) + '\nthis.stNow = stNow;', ctx);
  assert.deepStrictEqual(
    ['fish', 'seaslug', 'coral'].map(id => ctx.stNow({id})),
    ['f1', 's1', '']
  );
  assert.strictEqual(at, 'seaslug', 'the tree on screen back in force');
});
