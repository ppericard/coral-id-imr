require('./slot.js').testGuard();
// The sheet overlay's step 3 (docs/reviews/2026-11-14-sheet-overlay-design.md v2; Pierre, 2026-11-15, Q359, Q363 h A,
// Q366): the content editor's circles and look-alike pairs in the apply (core.js structApply, fishStructure), the
// structure stamp (structStamp), the sheet's replay under the structure in force (Code.gs subjRpl_, replay_, replays_,
// boardRpl_), and the photo tools' circles in force (tools/fish_inforce.py). The edits here are made up (fixtures): the
// real curation.json holds none, and no admin page writes one yet (step 4).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  {execFileSync} = require('child_process'),
  block = require('./block.js'),
  {loadCodeGs} = require('./gas.js');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  FJSON = src('fish.json'),
  F = JSON.parse(FJSON),
  CUR = JSON.parse(src('curation.json')),
  S = C.subjectOf('fish');
const fam = (R, id) => R.families.find(f => f.id === id);
const ids = L => L.map(x => x.id);
// A curation holding fish content map c.
const cur = c => ({fish: {content: c}});
const circ = (v, was = 1) => ({circle: {v, was, t: 1}});
// The edits the tests make: Soapfishes (circle 1, with the Groupers under one teaching node, t13) to circle 3; the
// Spadefishes (circle 1, a teaching node of their own) to no circle; a circle-3 family into circle 1.
const C3 = 'f:Soapfishes',
  OUT = 'f:Spadefishes',
  IN = F.families.find(f => f.circle === 3 && !f.wink).id;
const MOVES = {nodes: {[C3]: circ(3), [OUT]: circ(null), [IN]: circ(1, 3)}};
// The words a text slot carries (no structure): a family's ID tips and a look-alike line reworded.
const TEXT = {
  nodes: {
    'f:Damselfishes': {cues: {v: ['Small, continuous dorsal fin'], was: fam(F, 'f:Damselfishes').cues, t: 1}},
    'f:Parrotfishes': {'look/f:Wrasses': {v: 'Wrasse: no beak', was: 'Wrasse: thick lips, no visible teeth', t: 1}}
  }
};

// ---- The apply ----

test('no structure edit: the built file itself, the stamp empty, the replay units unchanged (text edits included)', () => {
  assert.strictEqual(C.contentApply(S, F, CUR), F);
  assert.strictEqual(C.structStamp(S, F, CUR), '');
  assert.strictEqual(C.structFp(S, CUR), '');
  const T = C.contentApply(S, F, cur(TEXT));
  assert.notStrictEqual(T, F);
  assert.strictEqual(C.structStamp(S, F, cur(TEXT)), '');
  assert.strictEqual(C.structFp(S, cur(TEXT)), '');
  assert.deepStrictEqual(C.fishReplayGen(T), C.fishReplayGen(F));
  // An entry the base already says (absorbed: a circle equal to the base, a pair the base declares in one direction
  // only, f:MoorishIdol → f:Butterflyfishes) changes nothing, nor the stamp.
  const same = cur({nodes: {'f:Damselfishes': circ(1)}, pairs: {'f:Butterflyfishes|f:MoorishIdol': {v: 1, was: 1, t: 1}}});
  assert.strictEqual(C.contentApply(S, F, same), F);
  assert.strictEqual(C.structStamp(S, F, same), '');
  assert.notStrictEqual(C.structFp(S, same), '', 'the cache key sees the entries');
});

test("a circle edit writes the family, its genera, its species and its teaching nodes; start keeps circle 1's", () => {
  const A = C.contentApply(S, F, cur(MOVES));
  // into circle 3: the family, every genus and species of it; the teaching node it shares with the Groupers keeps
  // circle 1 (its families' smallest), and the Groupers are untouched
  assert.strictEqual(fam(A, C3).circle, 3);
  assert.ok(A.genera.filter(g => g.family === C3).every(g => g.circle === 3));
  assert.ok(A.species.filter(s => s.family === C3).length > 0);
  assert.ok(A.species.filter(s => s.family === C3).every(s => s.circle === 3));
  assert.strictEqual(A.teach.find(t => t.id === 't13').circle, 1);
  assert.strictEqual(fam(A, 'f:Groupers'), fam(F, 'f:Groupers'), 'a record no edit touches is shared');
  // into circle 1: its genera and species too, its teaching node too
  assert.strictEqual(fam(A, IN).circle, 1);
  assert.ok(A.genera.filter(g => g.family === IN).every(g => g.circle === 1));
  assert.ok(A.species.filter(s => s.family === IN).every(s => s.circle === 1));
  const tIn = F.teach.find(t => (t.species || []).some(id => (F.species.find(s => s.id === id) || {}).family === IN));
  assert.strictEqual(A.teach.find(t => t.id === tIn.id).circle, 1);
  // start: the starter core stays the circle-1 entries; one moved out leaves it
  assert.deepStrictEqual(A.start, F.start);
  const B = C.contentApply(S, F, cur({nodes: {'f:Butterflyfishes': circ(2)}}));
  assert.deepStrictEqual(
    B.start,
    F.start.filter(id => id !== 't02')
  );
  // the base never changes (a new object)
  assert.strictEqual(fam(F, C3).circle, 1);
});

test('in no circle: the family and its genera left out, its species out, look-alike lines to it dropped', () => {
  const A = C.contentApply(S, F, cur({nodes: {'f:Angelfishes': circ(null), [OUT]: circ(null)}}));
  [OUT, 'f:Angelfishes'].forEach(id => {
    assert.ok(!fam(A, id));
    assert.ok(!A.genera.some(g => g.family === id));
    const sp = F.species.filter(s => s.family === id).map(s => A.species.find(x => x.id === s.id));
    assert.ok(sp.length && sp.every(s => s.out === 'family in no circle' && !s.circle && !s.family && !s.genus));
  });
  // the Butterflyfishes' look-alike line to the Angelfishes goes (a pair with one side gone is not applied)
  assert.ok(fam(F, 'f:Butterflyfishes').look.some(y => y[0] === 'f:Angelfishes'));
  assert.ok(!fam(A, 'f:Butterflyfishes').look.some(y => y[0] === 'f:Angelfishes'));
  // a teaching node with no family left in a circle has none; start loses it
  assert.ok(!('circle' in A.teach.find(t => t.id === 't03')));
  assert.ok(!A.start.includes('t03'));
  // Every reader of the units takes it: the units, the replay's units, the typed names (core.js fishNameIndex), the
  // app's scientific genera (app.js fishGenera).
  const X = C.fishGen(A, {});
  assert.ok(!X.gen['f:Angelfishes'] && ![...X.c1, ...X.c2, ...X.c3].includes('f:Angelfishes'));
  const G = C.fishReplayGen(A);
  assert.ok(!G['f:Angelfishes'] && !G['f:Butterflyfishes'].look.includes('f:Angelfishes'));
  assert.ok(!C.fishNameIndex(A, {}).some(e => e.g === 'f:Angelfishes'));
  const ctx = {DOM: {EX: 0.9}, easyCover: C.easyCover, fishScoreTree: C.fishScoreTree, rankWeights: C.rankWeights};
  vm.createContext(ctx);
  vm.runInContext(
    block(src('app.js'), 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + '\nthis.fishGenera = fishGenera;',
    ctx
  );
  const U = ctx.fishGenera(C.fishGen(A, {}), A);
  assert.ok(!Object.values(U.gen).some(u => u.parent === 'f:Angelfishes'));
  assert.ok(Object.values(U.gen).some(u => u.parent === 'f:Butterflyfishes'));
});

test("in no circle: the family's photos leave the game, never lent to the other family of its teaching node", () => {
  // t13 (Groupers) holds the Soapfishes' species too: a photo listed under it went to its species' family.
  const PH = JSON.parse(src('fish-photos.json')),
    GM = C.fishGameRead(JSON.parse(src('fish-game.json'))),
    photos = C.fishPhotos(PH.photos, GM.photos, CUR),
    soap = new Set(fam(F, C3).species),
    X0 = C.fishGen(F, photos, PH.sheet);
  assert.ok(X0.gen[C3].views.wide.length > 0, 'the base shows them');
  const X = C.fishGen(C.contentApply(S, F, cur({nodes: {[C3]: circ(null)}})), photos, PH.sheet);
  assert.ok(!X.gen[C3]);
  assert.ok(Object.values(X.gen).every(u => u.views.wide.every(p => !soap.has(p.sp))));
  assert.deepStrictEqual(
    X.gen['f:Groupers'].views.wide.map(p => p.f),
    X0.gen['f:Groupers'].views.wide.map(p => p.f)
  );
});

test('pairs: a withdrawn pair leaves both sides, an added one joins both with its source, its words in the text slot', () => {
  const P = {
      'f:Parrotfishes|f:Wrasses': {v: null, was: 1, t: 1},
      'f:Butterflyfishes|f:MoorishIdol': {v: null, was: 1, t: 1},
      'f:Damselfishes|f:Wrasses': {v: 1, was: null, src: {t: 'An instructor', u: 'https://example.org'}, t: 1},
      'f:Goatfishes|f:Wrasses': {v: 1, was: null, t: 1}
    },
    A = C.contentApply(S, F, cur({nodes: {'f:Damselfishes': {'look/f:Wrasses': {v: 'Wrasse: long body', was: null, t: 1}}}, pairs: P})),
    has = (id, o) => (fam(A, id).look || []).some(y => y[0] === o);
  assert.ok(!has('f:Parrotfishes', 'f:Wrasses') && !has('f:Wrasses', 'f:Parrotfishes'));
  assert.ok(!has('f:MoorishIdol', 'f:Butterflyfishes'), 'a pair the base declares one way only, withdrawn');
  assert.ok(has('f:Damselfishes', 'f:Wrasses') && has('f:Wrasses', 'f:Damselfishes'));
  assert.deepStrictEqual(
    fam(A, 'f:Damselfishes').look.find(y => y[0] === 'f:Wrasses'),
    ['f:Wrasses', 'Wrasse: long body'],
    'the words land on the line added'
  );
  assert.deepStrictEqual(
    fam(A, 'f:Wrasses').look.find(y => y[0] === 'f:Damselfishes'),
    ['f:Damselfishes', '']
  );
  assert.strictEqual(fam(A, 'f:Damselfishes').lsrc['f:Wrasses'], 'An instructor');
  assert.strictEqual(fam(A, 'f:Goatfishes').lsrc['f:Wrasses'], C.EDITOR_PAIR, 'never the IMR presentation');
  // the lines the base had keep their source (lsrc made from the base's own when it had none)
  assert.strictEqual(fam(A, 'f:Wrasses').lsrc['f:Parrotfishes'], C.fishGen(F, {}).gen['f:Wrasses'].lsrc['f:Parrotfishes']);
  // the units read them: a pair declared both ways, the old ones gone
  const G = C.fishReplayGen(A);
  assert.ok(G['f:Damselfishes'].look.includes('f:Wrasses') && G['f:Wrasses'].look.includes('f:Damselfishes'));
  assert.ok(!G['f:Parrotfishes'].look.includes('f:Wrasses'));
  // a withdrawn pair's words (a text slot) are orphaned, kept and not applied; restored with the pair
  const W = cur({
    nodes: {'f:Parrotfishes': {'look/f:Wrasses': {v: 'x', was: 'y', t: 1}}},
    pairs: {'f:Parrotfishes|f:Wrasses': {v: null, was: 1, t: 1}}
  });
  assert.ok(!(fam(C.contentApply(S, F, W), 'f:Parrotfishes').look || []).some(y => y[0] === 'f:Wrasses'));
  const back = cur({nodes: W.fish.content.nodes});
  assert.deepStrictEqual(
    fam(C.contentApply(S, F, back), 'f:Parrotfishes').look.find(y => y[0] === 'f:Wrasses'),
    ['f:Wrasses', 'x']
  );
});

test('orphans: a node the base lacks, a circle not declared, a bad pair key or value: kept, never applied', () => {
  const c = {
      nodes: {
        'f:Nope': circ(1),
        'f:Damselfishes': circ(4),
        'g:Chromis': circ(2), // not a rank that carries a circle
        'f:Wrasses': {circle: {v: '2', was: 1}}
      },
      pairs: {
        'f:Wrasses|f:Damselfishes': {v: 1, was: null}, // not in code-point order
        'f:Damselfishes|f:Nope': {v: 1, was: null},
        'f:Damselfishes|f:Goatfishes': {v: 2, was: null},
        'f:Damselfishes': {v: 1, was: null}
      }
    },
    E = C.structEntries(S, F, c);
  assert.deepStrictEqual(
    E.circles.map(x => [x.id, x.state, x.why]),
    [
      ['f:Damselfishes', 'orphan', 'value'],
      ['f:Nope', 'orphan', 'node'],
      ['f:Wrasses', 'orphan', 'value'],
      ['g:Chromis', 'orphan', 'node']
    ]
  );
  assert.deepStrictEqual(
    E.pairs.map(x => [x.key, x.why]),
    [
      ['f:Damselfishes', 'key'],
      ['f:Damselfishes|f:Goatfishes', 'value'],
      ['f:Damselfishes|f:Nope', 'node'],
      ['f:Wrasses|f:Damselfishes', 'key']
    ]
  );
  assert.strictEqual(C.contentApply(S, F, cur(c)), F, 'nothing applied');
  assert.strictEqual(C.structStamp(S, F, cur(c)), '');
  // The circle slot is never a text slot: the admin's text editor lists no orphan for it (core.js contentEntries).
  assert.deepStrictEqual(C.contentEntries(S, F, {nodes: {'f:Damselfishes': circ(2)}}), []);
  // A stale entry (the base moved since) still applies (Q359 c: the editor's value until he answers it).
  const st = C.structEntries(S, F, {nodes: {'f:Damselfishes': {circle: {v: 2, was: 3}}}}).circles[0];
  assert.strictEqual(st.state, 'stale');
  assert.strictEqual(fam(C.contentApply(S, F, cur({nodes: {'f:Damselfishes': {circle: {v: 2, was: 3}}}})), 'f:Damselfishes').circle, 2);
  // A subject with no structure declared (the corals): nothing applies, the stamp is empty.
  const K = C.subjectOf('coral');
  assert.ok(!K.structure);
  assert.strictEqual(C.structStamp(K, {}, {content: {nodes: {Acropora: circ(2)}}}), '');
});

// ---- The stamp ----

test('the stamp: one per structure in force, the same from the players copy, empty again at the undo', () => {
  const a = C.structStamp(S, F, cur(MOVES)),
    b = C.structStamp(S, F, cur({pairs: {'f:Parrotfishes|f:Wrasses': {v: null, was: 1, t: 1}}}));
  assert.match(a, /^[0-9a-z]+$/);
  assert.ok(a && b && a !== b);
  // the same structure reached by other entries (a text slot beside, another t, a source): the same stamp
  assert.strictEqual(C.structStamp(S, F, cur({...TEXT, nodes: {...TEXT.nodes, ...MOVES.nodes}})), a);
  // undone (the entries removed, or set back to the base): empty again
  assert.strictEqual(C.structStamp(S, F, cur({nodes: {[C3]: {}, [OUT]: {}, [IN]: {}}})), '');
  assert.strictEqual(C.structStamp(S, F, cur({nodes: {[C3]: circ(1), [OUT]: circ(1), [IN]: circ(3, 3)}})), '');
  // the app's players copy (tools/curplay.py: v and src only) gives the sheet's stamp (curation.json, whole)
  const full = {...CUR, fish: {...CUR.fish, content: {...MOVES, pairs: {'f:Damselfishes|f:Wrasses': {v: 1, was: null, t: 5, by: 'x1'}}}}},
    slim = JSON.parse(
      execFileSync(
        'python3',
        ['-c', 'import sys, json; sys.path.insert(0, "tools"); import curplay; print(json.dumps(curplay.slim(json.load(sys.stdin))))'],
        {
          cwd: ROOT,
          input: JSON.stringify(full),
          maxBuffer: 1 << 28
        }
      ).toString()
    );
  assert.ok(C.structStamp(S, F, full));
  assert.strictEqual(C.structStamp(S, F, slim), C.structStamp(S, F, full));
  assert.strictEqual(C.structFp(S, slim), C.structFp(S, full));
});

// ---- The check plan (rule L11): the real structure replayed with no edit gives the same progress ----

// A made-up fish log over every circle-1 family and its scientific genera, mix-ups with their look-alikes among them.
function fixtureLog(R) {
  const G = C.fishReplayGen(R),
    U = Object.keys(G).sort(),
    out = [];
  let x = 7;
  const rnd = () => (x = (x * 48271) % 2147483647) / 2147483647;
  for (let i = 0; i < 600; i++) {
    const g = U[Math.floor(rnd() * U.length)],
      L = G[g].look.filter(o => G[o]),
      pool = U.filter(o => o !== g && o.slice(0, 2) === g.slice(0, 2)),
      wrong = L.length && rnd() < 0.6 ? L[Math.floor(rnd() * L.length)] : pool[Math.floor(rnd() * pool.length)],
      ok = rnd() < 0.7,
      ch = [g, wrong, ...pool.filter(o => o !== wrong).slice(0, 2)];
    out.push({
      id: 'x' + i,
      t: new Date(Date.UTC(2026, 10, 7, 6, 0, 0) + i * 61000).toISOString(),
      s: 'fish',
      rk: g.startsWith('g:') ? 'genus' : 'family',
      g,
      a: ok ? g : wrong,
      ok: ok ? 1 : 0,
      m: 'quiz|c',
      ph: 'fx' + (i % 50),
      ch: ch.join(' '),
      e: 0.8,
      th: 1,
      sc: {d: 0, r: 1}
    });
  }
  return out;
}
const replayOf = (L, gen) =>
  C.replayProgress(
    L.map(a => C.logRow(a, 'p1')),
    {gen}
  ).p1.P;

test('L11: the fixture log replayed under the real structure with no edit gives the same progress, bit for bit', () => {
  const L = fixtureLog(F),
    base = replayOf(L, C.fishReplayGen(F));
  assert.ok(Object.keys(base).length > 20);
  [CUR, cur(TEXT), cur({nodes: {'f:Damselfishes': circ(1)}, pairs: {'f:Butterflyfishes|f:MoorishIdol': {v: 1, was: 1}}})].forEach(c =>
    assert.deepStrictEqual(replayOf(L, C.fishReplayGen(C.contentApply(S, F, c))), base)
  );
  // Pairs alone move no record today: every fish answer carries its scoring record (quiz.js, Q132), which the replay
  // scores as the game did (core.js replayProgress sc), look-alike flag included. A circle edit does: a unit that leaves
  // the units (a family in no circle, the genera of a family out of circle 1) is no longer counted as the unit wrongly
  // given (rule L2's second unit). Its undo gives the same progress back.
  const P = cur({pairs: {'f:Parrotfishes|f:Wrasses': {v: null, was: 1}, 'f:Emperors|f:Snappers': {v: null, was: 1}}});
  assert.deepStrictEqual(replayOf(L, C.fishReplayGen(C.contentApply(S, F, P))), base);
  assert.notDeepStrictEqual(replayOf(L, C.fishReplayGen(C.contentApply(S, F, cur(MOVES)))), base);
  assert.deepStrictEqual(replayOf(L, C.fishReplayGen(C.contentApply(S, F, cur({nodes: {[C3]: {}, [OUT]: {}, [IN]: {}}})))), base);
});

// ---- The photo tools (tools/fish_inforce.py): the circles in force, as core.js applies them ----

test("tools/fish_inforce.py: the circles in force, the apply's own (family, genera, species, teaching nodes, start)", () => {
  const py = c =>
      JSON.parse(
        execFileSync(
          'python3',
          [
            '-c',
            'import sys, json; sys.path.insert(0, "tools"); import fish_inforce as f; d = json.load(sys.stdin); print(json.dumps(f.in_force(d["fish"], d["cur"])))'
          ],
          {cwd: ROOT, input: JSON.stringify({fish: F, cur: c}), maxBuffer: 1 << 28}
        ).toString()
      ),
    pick = R => ({
      families: R.families.map(f => [f.id, f.circle, (f.look || []).map(y => y[0])]),
      genera: R.genera.map(g => [g.id, g.circle]),
      species: R.species.map(s => [s.id, s.circle, s.family, s.genus, s.out]),
      teach: R.teach.map(t => [t.id, t.circle]),
      start: R.start
    });
  [
    cur(MOVES),
    cur({nodes: {'f:Angelfishes': circ(null), 'f:Butterflyfishes': circ(2), 'f:Nope': circ(1), 'f:Wrasses': circ(5)}}),
    cur({nodes: {'f:Groupers': circ(3), [C3]: circ(null)}}),
    CUR
  ].forEach(c =>
    assert.deepStrictEqual(JSON.parse(JSON.stringify(pick(py(c)))), JSON.parse(JSON.stringify(pick(C.contentApply(S, F, c)))))
  );
  // nothing to apply: fish.json itself
  assert.deepStrictEqual(ids(py(CUR).families), ids(F.families));
});

// ---- The sheet (Code.gs): the replay under the structure in force, keyed by the stamp (Q363 h A) ----

const FRV = C.rvOf('fish');
// GitHub main as the sheet reads it: fish.json, and a curation.json the test changes (ok false: unreadable).
function mainFiles() {
  const m = {cur: CUR, ok: true, n: {fish: 0, cur: 0}};
  m.fetch = url =>
    /\/main\/fish\.json$/.test(url)
      ? (m.n.fish++, {getResponseCode: () => 200, getContentText: () => FJSON})
      : /\/main\/curation\.json$/.test(url)
        ? (m.n.cur++, {getResponseCode: () => (m.ok ? 200 : 500), getContentText: () => JSON.stringify(m.cur)})
        : null;
  return m;
}
// Fish answers with mix-ups inside the declared pairs (the parrotfishes and wrasses, the snappers and emperors).
const fishLog = (p, n = 24) =>
  Array.from({length: n}, (_, i) => {
    const [g, o] = i % 2 ? ['f:Parrotfishes', 'f:Wrasses'] : ['f:Snappers', 'f:Emperors'],
      ok = i % 3 !== 0;
    return {
      id: p + i,
      t: new Date(Date.UTC(2026, 10, 7, 6, 0, i)).toISOString(),
      s: 'fish',
      rk: 'family',
      g,
      a: ok ? g : o,
      ok: ok ? 1 : 0,
      m: 'quiz|c',
      ph: 'fi' + (100 + (i % 4)),
      ch: [g, o, 'f:Damselfishes', 'f:Angelfishes'].join(' '),
      e: 0.8,
      th: 1,
      sc: {d: 0, r: 1}
    };
  });
// A structure Publish: the two pairs withdrawn, and the wrasses (a unit the log gives wrongly) taken out of the game, so
// the replay's records move (the pairs alone move none: the L11 test above).
const PAIRS = cur({
  nodes: {'f:Wrasses': circ(null)},
  pairs: {'f:Parrotfishes|f:Wrasses': {v: null, was: 1, t: 1}, 'f:Emperors|f:Snappers': {v: null, was: 1, t: 1}}
});
const savedUpToDate = {
  'reefid-sync-coral-progress': '{}',
  'reefid-sync-coral-rv': JSON.stringify(C.RV),
  'reefid-sync-fish-progress': '{}',
  'reefid-sync-fish-rv': JSON.stringify(FRV)
};

test('the sheet: a structure Publish replays a player whose rules are applied, its undo gives the same record back', () => {
  const m = mainFiles(),
    s = loadCodeGs({fetch: m.fetch}),
    L = fishLog('a'),
    want0 = C.replayProgress(
      L.map(a => C.logRow(a, 'ana')),
      {gen: C.fishReplayGen(F)}
    ).ana.P,
    want1 = C.replayProgress(
      L.map(a => C.logRow(a, 'ana')),
      {gen: C.fishReplayGen(C.contentApply(S, F, PAIRS))}
    ).ana.P,
    st1 = C.structStamp(S, F, PAIRS),
    save = x => s.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: [], rv: C.RV, rvs: {fish: FRV}, ...x});
  s.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: L, rv: C.RV});
  assert.ok(st1 && JSON.stringify(want1) !== JSON.stringify(want0), 'the pairs move the bars');
  // No edit: an app that says the empty stamp gets nothing (no replay at the deploy); an older app (no sts) neither.
  assert.ok(!save({sts: {fish: ''}}).replays);
  assert.ok(!save({}).replays);
  // The Publish: read at the next trigger run, or at once when a device holds the new stamp (stn)…
  m.cur = PAIRS;
  const r1 = save({sts: {fish: ''}, stn: {fish: st1}});
  assert.ok(r1.replays && r1.replays.fish, 'replayed under the new structure');
  assert.deepStrictEqual([r1.replays.fish.rv, r1.replays.fish.st, r1.replays.fish.n], [FRV, st1, L.length]);
  assert.deepStrictEqual(r1.replays.fish.rec, want1);
  const T = s.sheets['Replayed Fish'],
    row = Array.from(T.rows[1]);
  assert.ok(String(row[3]).endsWith('~' + st1), 'the stamp in the cache identity, no new column');
  assert.deepStrictEqual(Array.from(T.rows[0]), ['Name', 'Rules', 'Rows', 'Since', 'Updated', 'Record']);
  // Applied: nothing more; a device still on the old stamp: the same record, from the tab.
  assert.ok(!save({sts: {fish: st1}}).replays);
  assert.deepStrictEqual(save({sts: {fish: ''}}).replays.fish.rec, want1);
  // The undo (read at the trigger's next run): the stamp empty again, the replay the first record exactly.
  m.cur = CUR;
  s.ctx.subjStRefresh_();
  const r2 = save({sts: {fish: st1}});
  assert.ok(r2.replays && !('st' in r2.replays.fish));
  assert.deepStrictEqual(r2.replays.fish.rec, want0);
  assert.strictEqual(String(Array.from(T.rows[1])[3]).indexOf('~'), -1, 'the row back as a row from before');
  // fish.json read once per structure (the units under the curation's fingerprint), the curation at each refresh.
  assert.ok(m.n.fish <= 3 && m.n.cur >= 2);
});

test('the sheet: a device saying a stamp it does not hold makes it read the curation again, at most once a minute', () => {
  const m = mainFiles(),
    s = loadCodeGs({fetch: m.fetch}),
    st1 = C.structStamp(S, F, PAIRS);
  s.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: fishLog('b'), rv: C.RV});
  const save = x => s.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: [], rv: C.RV, rvs: {fish: FRV}, ...x});
  assert.ok(!save({sts: {fish: ''}}).replays);
  const n0 = m.n.cur;
  m.cur = PAIRS;
  assert.ok(!save({sts: {fish: ''}}).replays, 'the cached curation: no replay yet');
  assert.strictEqual(m.n.cur, n0);
  assert.strictEqual(save({sts: {fish: ''}, stn: {fish: st1}}).replays.fish.st, st1);
  assert.strictEqual(m.n.cur, n0 + 1);
  // the same again within the minute: no second read
  save({sts: {fish: st1}, stn: {fish: 'other'}});
  assert.strictEqual(m.n.cur, n0 + 1);
  // a load says it too (st_fish, sn_fish)
  const g = s.get({name: 'Ana', pin: '1234', rv: String(C.RV), rv_fish: String(FRV), st_fish: ''});
  assert.strictEqual(g.replays.fish.st, st1);
  assert.ok(!s.get({name: 'Ana', pin: '1234', rv: String(C.RV), rv_fish: String(FRV), st_fish: st1}).replays);
});

test('the sheet: an unreadable curation replays nothing (never the base in place of the editor’s structure)', () => {
  const m = mainFiles();
  m.ok = false;
  const s = loadCodeGs({fetch: m.fetch});
  s.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: fishLog('c'), rv: C.RV});
  const r = s.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: [], rv: C.RV, rvs: {fish: 0}, sts: {fish: ''}});
  assert.ok(!r.replays, 'no fish replay, even behind the rules');
  assert.strictEqual(m.n.fish, 0);
  m.ok = true;
  assert.ok(
    s.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: [], rv: C.RV, rvs: {fish: 0}, sts: {fish: ''}}).replays
      .fish
  );
});

test('rule D8: the trigger replays under the new structure a player who never reconnects, for the leaderboard', () => {
  const m = mainFiles(),
    s = loadCodeGs({fetch: m.fetch}),
    L = fishLog('d'),
    st1 = C.structStamp(S, F, PAIRS);
  s.post({name: 'Ben', pin: '1234', data: savedUpToDate, summary: {}, answers: L, rv: C.RV});
  assert.strictEqual(s.ctx.boardWarm_(), 0, 'up to date: nothing to make');
  m.cur = PAIRS;
  s.ctx.subjStRefresh_();
  assert.strictEqual(s.ctx.boardWarm_(), 1, 'his replay made under the new structure');
  const T = s.sheets['Replayed Fish'],
    row = Array.from(T.rows[1]);
  assert.deepStrictEqual([row[0], row[1], row[2]], ['Ben', FRV, L.length]);
  assert.ok(String(row[3]).endsWith('~' + st1));
  assert.deepStrictEqual(
    JSON.parse(row.slice(5).join('')),
    C.replayProgress(
      L.map(a => C.logRow(a, 'ben')),
      {gen: C.fishReplayGen(C.contentApply(S, F, PAIRS))}
    ).ben.P
  );
  assert.strictEqual(s.ctx.boardWarm_(), 0, 'made once');
  // His own app adopted it (its saved data says the stamp): nothing more to make.
  s.post({
    name: 'Ben',
    pin: '1234',
    data: {...savedUpToDate, 'reefid-sync-fish-st': JSON.stringify(st1)},
    summary: {},
    answers: [],
    rv: C.RV
  });
  assert.strictEqual(s.ctx.boardWarm_(), 0);
});

// ---- The leaderboard's score tree under the structure (design note v2, step 4; Codex review #977) ----

test("fishBoardTree is the app's own score tree (app.js UNITS tree), with and without a structure edit", () => {
  const ctx = {DOM: {EX: 0.9}, easyCover: C.easyCover, fishScoreTree: C.fishScoreTree, rankWeights: C.rankWeights};
  vm.createContext(ctx);
  vm.runInContext(
    block(src('app.js'), 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + '\nthis.fishGenera = fishGenera;',
    ctx
  );
  [CUR, cur(MOVES), PAIRS].forEach(c => {
    const A = C.contentApply(S, F, c);
    assert.deepStrictEqual(C.fishBoardTree(A), ctx.fishGenera(C.fishGen(A, {}), A).tree);
  });
  // the subject's own declaration, which the sheet reads (no subject named there: rule S1)
  assert.deepStrictEqual(S.replayed.tree(F), C.fishBoardTree(F));
  // a circle Publish moves the tree: the family taken off the game leaves it, the one moved changes circle
  const T0 = C.fishBoardTree(F),
    T1 = C.fishBoardTree(C.contentApply(S, F, cur(MOVES)));
  assert.ok(T0.f.some(x => x[0] === OUT) && !T1.f.some(x => x[0] === OUT));
  assert.deepStrictEqual([T0.f.find(x => x[0] === C3)[2], T1.f.find(x => x[0] === C3)[2]], [1, 3]);
});

test('rule D8: the board ranks by the tree the sheet makes under the structure in force, with no device saving', () => {
  const m = mainFiles(),
    s = loadCodeGs({fetch: m.fetch}),
    K = S.score,
    T0 = C.fishBoardTree(F),
    T1 = C.fishBoardTree(C.contentApply(S, F, cur(MOVES))),
    // the Spadefishes mastered (taken off the game by the Publish), a little on two other families
    P = {[OUT]: {ok: 9, ko: 0, mx: 1}, 'f:Damselfishes': {ok: 3, ko: 1}, [C3]: {ok: 4, ko: 0}, '~level': {ok: 220, ko: 30, th: 1}},
    data = {...savedUpToDate, 'reefid-sync-fish-progress': JSON.stringify(P)},
    save = T => s.post({name: 'Ana', pin: '1234', data, summary: {board: 1, boards: {fish: T}}, answers: [], rv: C.RV}),
    board = () => {
      Object.keys(s.cache)
        .filter(k => k.startsWith('board14'))
        .forEach(k => delete s.cache[k]);
      return s.get({board: '1', s: 'fish'}).rows.find(r => r[0] === 'Ana')[1];
    },
    p0 = C.treeScore(P, T0, K).pct,
    p1 = C.treeScore(P, T1, K).pct;
  assert.notStrictEqual(p0, p1, 'the Publish moves her %');
  // The tree an app sent, as before, until the sheet holds its own (nothing read yet: the board never fetches).
  assert.strictEqual(save(T0).ok, true);
  assert.strictEqual(board(), p0);
  s.ctx.subjStRefresh_();
  assert.strictEqual(board(), p0, "the base's structure: the same tree");
  // The Publish, read by the 15-minute trigger: the board moves with no device saving.
  m.cur = cur(MOVES);
  s.ctx.subjStRefresh_();
  assert.strictEqual(board(), p1);
  // A device still on the old units sends its tree: the board keeps the structure in force.
  save(T0);
  assert.strictEqual(board(), p1);
  // The undo: back to the base's tree.
  m.cur = CUR;
  s.ctx.subjStRefresh_();
  assert.strictEqual(board(), p0);
  // The sheet's tree not cached (evicted): the apps' tree, as before; made again at the next read.
  Object.keys(s.cache)
    .filter(k => k.startsWith('stree1:'))
    .forEach(k => delete s.cache[k]);
  save(T1);
  assert.strictEqual(board(), p1, 'the tree the app sent last');
  const n1 = m.n.fish;
  s.ctx.subjStRefresh_();
  assert.strictEqual(board(), p0);
  assert.strictEqual(m.n.fish, n1 + 1, 'fish.json read once to make it again');
  // A tree the sheet could not make or refused is kept as 0: no tree of its own (the apps'), and fish.json is not read
  // again at every call for it.
  Object.keys(s.cache)
    .filter(k => k.startsWith('stree1:'))
    .forEach(k => (s.cache[k] = '0'));
  s.ctx.subjStRefresh_();
  s.ctx.subjStRefresh_();
  assert.strictEqual(m.n.fish, n1 + 1);
  assert.strictEqual(board(), p1, 'the tree the app sent last');
});
