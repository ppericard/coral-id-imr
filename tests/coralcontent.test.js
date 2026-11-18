require('./slot.js').testGuard();
// The sheet overlay's step 8 (docs/reviews/2026-11-14-sheet-overlay-design.md v2): the corals' text slots and
// look-alike pairs at the genus rank (core.js SUBJECTS coral content and structure, genStructure), the ★ rule kept
// under edited pairs (starHold, rule L5), the structure stamp, and the sheet's coral replay under it (Code.gs gen_,
// replay_, stMain_). The edits here are made-up fixtures: the real curation.json holds none.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process'),
  {loadCodeGs} = require('./gas.js');
const C = require('../core.js'),
  ed = require('../admin-content.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  DJSON = src('data.json'),
  D = JSON.parse(DJSON),
  CUR = JSON.parse(src('curation.json')),
  S = C.subjectOf('coral');
// A curation holding the corals' content map c (their part of the curation is the top level).
const cur = c => ({content: c});
const key = C.contentPairKey;
const out = (a, b) => ({[key(a, b)]: {v: null, was: 1, t: 1}});
const add = (a, b, src) => ({[key(a, b)]: {v: 1, was: null, ...(src ? {src} : {}), t: 1}});
const X = D.x.gen;
const recOf = (R, n) => R.gen[n] || R.x.gen[n];
// The starred genera of the real slate (rule L5): on it, not numbered, not an x genus.
const STARS = C.slateOf(D).filter(n => D.gen[n] && !D.gen[n].n && !X[n]);

test('the slots: one rank, the genus, on data.json gen and x.gen; keep slots on every record; nothing edited, nothing changes', () => {
  assert.deepStrictEqual(Object.keys(S.content), ['genus']);
  assert.deepStrictEqual(S.content.genus.at, ['gen', 'x.gen']);
  const N = C.contentNodes(S, D);
  assert.strictEqual(N.size, Object.keys(D.gen).length + Object.keys(X).length);
  assert.strictEqual(N.get('Millepora').at, 'x.gen');
  assert.strictEqual(N.get('Acropora').at, 'gen');
  // each declared slot reads a value of its type, or none; a keep slot is on every slate record (its readers read it so)
  N.forEach((n, id) =>
    S.content.genus.slots
      .filter(sp => !sp.map)
      .forEach(sp => {
        const v = C.contentBase(sp, n.rec);
        assert.ok(v === null || (sp.t === 'list' ? Array.isArray(v) : typeof v === 'string'), `${id} ${sp.k}`);
        if (sp.keep && n.at === 'gen') assert.ok(sp.k in n.rec, `${id} ${sp.k}`);
      })
  );
  // the IMR's own words are marked (their label stays)
  assert.deepStrictEqual(
    S.content.genus.slots.filter(sp => sp.imr).map(sp => sp.k),
    ['mn', 'imr']
  );
  assert.strictEqual(C.contentApply(S, D, {}), D);
  assert.strictEqual(C.contentApply(S, D, CUR), D, 'curation.json on main holds no coral edit');
  assert.strictEqual(C.structStamp(S, D, CUR), '');
  // no circle: a circle slot is never applied, never structure
  assert.ok(!S.structure.circle);
  assert.strictEqual(C.structStamp(S, D, cur({nodes: {Acropora: {circle: {v: 2, was: null, t: 1}}}})), '');
});

test('text slots: applied on a slate and an x genus with their sources; a keep slot hidden stays empty; R untouched', () => {
  const was = D.gen.Acropora.qt,
    c = cur({
      nodes: {
        Acropora: {
          qt: {v: ['Tip one', 'Tip two'], was, src: {t: 'A made-up guide', u: 'https://example.org'}, t: 1},
          crit: {v: null, was: D.gen.Acropora.crit, t: 1},
          sum: {v: null, was: D.gen.Acropora.sum, t: 1},
          'lsrc/Montipora': {v: 'Our words', was: D.gen.Acropora.lsrc.Montipora, t: 1}
        },
        Millepora: {plain: {v: 'Plain words here.', was: X.Millepora.plain, t: 1}}
      }
    }),
    before = JSON.stringify(D),
    A = C.contentApply(S, D, c);
  assert.deepStrictEqual(A.gen.Acropora.qt, ['Tip one', 'Tip two']);
  assert.deepStrictEqual(A.gen.Acropora.esrc, {qt: {t: 'A made-up guide', u: 'https://example.org'}});
  assert.deepStrictEqual(A.gen.Acropora.crit, [], 'crit stays, empty (keep)');
  assert.strictEqual(A.gen.Acropora.sum, '');
  assert.strictEqual(A.gen.Acropora.lsrc.Montipora, 'Our words');
  assert.strictEqual(A.x.gen.Millepora.plain, 'Plain words here.');
  // the other records shared, the base unchanged
  assert.strictEqual(A.gen.Porites, D.gen.Porites);
  assert.strictEqual(A.x.gen.Euphyllia, X.Euphyllia);
  assert.strictEqual(JSON.stringify(D), before);
  // a look-alike line the base lacks is no slot (a new line is a new pair: structure)
  const E = C.contentEntries(S, D, {nodes: {Acropora: {'lsrc/Porites': {v: 'x', was: null, t: 1}}}});
  assert.deepStrictEqual(
    E.map(x => [x.state, x.why]),
    [['orphan', 'slot']]
  );
  // the admin's merged data (x genera in gen too, the same records): the edit lands in both places
  const M = {...D, gen: {...D.gen, ...X}},
    B = C.contentApply(S, M, c);
  assert.strictEqual(B.gen.Millepora, B.x.gen.Millepora);
  assert.strictEqual(B.gen.Millepora.plain, 'Plain words here.');
});

test('pairs: a withdrawn pair leaves both looks and lines, an added one joins both with its source or the editor’s tag', () => {
  // Acropora lists Montipora; Montipora does not list Acropora but carries a line for it
  assert.ok(D.gen.Acropora.look.includes('Montipora') && !D.gen.Montipora.look.includes('Acropora'));
  const A = C.contentApply(
    S,
    D,
    cur({
      pairs: {...out('Acropora', 'Montipora'), ...add('Acropora', 'Porites', {t: 'A made-up guide'}), ...add('Millepora', 'Pocillopora')}
    })
  );
  assert.ok(!A.gen.Acropora.look.includes('Montipora') && !('Montipora' in A.gen.Acropora.lsrc));
  assert.ok(!('Acropora' in A.gen.Montipora.lsrc));
  assert.deepStrictEqual(A.gen.Acropora.look.slice(-1), ['Porites'], "after the base's look-alikes");
  assert.ok(A.gen.Porites.look.includes('Acropora'));
  assert.strictEqual(A.gen.Acropora.lsrc.Porites, 'A made-up guide');
  assert.strictEqual(A.gen.Porites.lsrc.Acropora, 'A made-up guide');
  // a pair across gen and x.gen: both records, the editor's tag as its line (never IMR's or the Coral Finder's words)
  assert.ok(A.x.gen.Millepora.look.includes('Pocillopora') && A.gen.Pocillopora.look.includes('Millepora'));
  assert.strictEqual(A.x.gen.Millepora.lsrc.Pocillopora, C.EDITOR_PAIR);
  // the units the replay reads follow (core.js genLooks: what Code.gs gen_ builds)
  const G = C.genLooks(A);
  assert.ok(!G.Acropora.look.includes('Montipora') && G.Porites.look.includes('Acropora'));
  // the added pair's words are a text slot at once; the withdrawn pair's are orphaned, kept, not applied
  const E = C.contentEntries(S, A, {
    nodes: {Acropora: {'lsrc/Porites': {v: 'w', was: 'A made-up guide', t: 1}, 'lsrc/Montipora': {v: 'x', was: 'y', t: 1}}}
  });
  assert.deepStrictEqual(
    E.map(x => [x.slot, x.state]),
    [
      ['lsrc/Montipora', 'orphan'],
      ['lsrc/Porites', 'fresh']
    ]
  );
});

test('genLooks: the units Code.gs built before step 8 (data.json gen, then x.gen, look names, family)', () => {
  const old = {};
  [D.gen, X].forEach(G =>
    Object.keys(G).forEach(n => {
      if (!old[n]) old[n] = {look: (G[n].look || []).filter(x => typeof x === 'string'), fam: String(G[n].fam || '')};
    })
  );
  assert.deepStrictEqual(C.genLooks(D), old);
});

// ---- The ★ rule (L5) under edited pairs ----

test('L5: withdrawing every pair of each starred genus leaves it a surveyed look-alike to open after, in a lecture group', () => {
  assert.ok(STARS.length >= 5);
  STARS.forEach(n => {
    const mine = Object.keys(C.genLooks(D)).filter(o => o !== n && (D.gen[n].look.includes(o) || (recOf(D, o).look || []).includes(n))),
      c = cur({pairs: Object.assign({}, ...mine.map(o => out(n, o)))}),
      A = C.contentApply(S, D, c),
      held = C.structEntries(S, D, c.content).pairs.filter(x => x.why === 'hold');
    assert.ok(mine.length, n);
    assert.ok(C.starRefs(A, n).length > 0, `${n}: no reference left`);
    assert.ok(C.lectureGroup(A, n) > 0, `${n}: in no group`);
    assert.ok(held.length >= 1, `${n}: nothing held`);
    // each held withdrawal is never applied: its pair is still in force, and the stamp counts the others only
    held.forEach(x => assert.ok(recOf(A, x.a).look.includes(x.b) || recOf(A, x.b).look.includes(x.a), x.key));
  });
  // one look-alike only (Halomitra, Alveopora): its withdrawal held alone, the stamp empty (nothing changes)
  ['Halomitra', 'Alveopora'].forEach(n => {
    const c = cur({pairs: out(n, D.gen[n].look[0])});
    assert.deepStrictEqual(
      C.structEntries(S, D, c.content).pairs.map(x => x.why),
      ['hold']
    );
    assert.strictEqual(C.structStamp(S, D, c), '');
    assert.strictEqual(C.contentApply(S, D, c), D);
  });
});

test('L5: an addition first, so a withdrawal it makes safe applies; two devices’ withdrawals merged: the first in key order kept', () => {
  // Halomitra's only reference withdrawn, with a surveyed look-alike added (Fungia, numbered): applied, shown in its group
  const c = cur({pairs: {...out('Halomitra', 'Herpolitha'), ...add('Fungia', 'Halomitra')}}),
    A = C.contentApply(S, D, c);
  assert.deepStrictEqual(
    C.structEntries(S, D, c.content).pairs.map(x => x.state),
    ['fresh', 'fresh']
  );
  assert.deepStrictEqual(C.starRefs(A, 'Halomitra'), ['Fungia']);
  assert.ok(C.lectureGroup(A, 'Halomitra') > 0);
  // a starred genus with two references in its group: either withdrawal alone applies, both together keep one
  const n = STARS.find(s => C.starRefs(D, s).length >= 2),
    [r1, r2] = C.starRefs(D, n),
    one = C.contentApply(S, D, cur({pairs: out(n, r1)})),
    both = cur({pairs: {...out(n, r2), ...out(n, r1)}}),
    B = C.contentApply(S, D, both),
    first = [key(n, r1), key(n, r2)].sort()[0];
  assert.ok(n, 'a starred genus with two references');
  assert.ok(!C.starRefs(one, n).includes(r1) && C.starRefs(one, n).length);
  assert.ok(C.starRefs(B, n).length > 0);
  const st = C.structEntries(S, D, both.content).pairs;
  // only the withdrawals that would empty its references are held, the earlier keys applied first
  assert.ok(st.find(x => x.key === first).why !== 'hold');
  assert.strictEqual(C.structStamp(S, D, both), C.structStamp(S, D, cur({pairs: {...out(n, r1), ...out(n, r2)}})));
});

test('the admin: a withdrawal the ★ rule would hold has Withdraw off; a held entry is one to check, never applied', () => {
  const Cm = {pairs: out('Halomitra', 'Herpolitha')};
  // its pairs: the one its own look names, and the x genera's that name it (Podabacia, Sandalolitha, Zoopilus)
  const rows = ed.pairRows(S, D, {}, 'Halomitra');
  assert.deepStrictEqual(
    rows.map(r => [r.key, r.v]),
    [
      ['Halomitra|Herpolitha', 1],
      ['Halomitra|Podabacia', 1],
      ['Halomitra|Sandalolitha', 1],
      ['Halomitra|Zoopilus', 1]
    ]
  );
  const P = ed.pairRows(S, D, Cm, 'Halomitra');
  assert.deepStrictEqual(
    P.filter(r => r.e).map(r => [r.key, r.state, r.why, r.v]),
    [['Halomitra|Herpolitha', 'orphan', 'hold', 1]]
  );
  // the x genera's pairs never hold it back (not surveyed: never its reference), its only reference does
  assert.ok(C.structEntries(S, D, {pairs: out('Halomitra', 'Zoopilus')}).pairs[0].state === 'fresh');
  assert.deepStrictEqual(
    ed.sheetTodo(S, D, Cm).map(x => [x.slot, x.why]),
    [['pair:Halomitra|Herpolitha', 'hold']]
  );
  // the corals' sheets: one per genus of gen and x.gen (no SUBJECTS sheets), the genera only
  assert.ok(ed.sheetOwn(D, 'Acropora', S) && ed.sheetOwn(D, 'Millepora', S) && !ed.sheetOwn(D, 'k:1', S));
  // a genus's Sheet rows: its declared slots, a look-alike line per line it holds, named by the other genus
  const L = ed.sheetSlots(S, D, {}, 'Acropora');
  assert.ok(L.some(r => r.slot === 'lsrc/Montipora' && r.name === 'Look-alike: Montipora'));
  assert.ok(L.some(r => r.slot === 'imr' && r.sp.imr));
  // a withdrawn pair's line leaves the Sheet (read with the pairs in force), its edit then listed as never applied
  const W = {pairs: out('Acropora', 'Montipora'), nodes: {Acropora: {'lsrc/Montipora': {v: 'x', was: 'y', t: 1}}}},
    L2 = ed.sheetSlots(S, D, W, 'Acropora');
  assert.deepStrictEqual(
    L2.filter(r => r.slot === 'lsrc/Montipora').map(r => r.state),
    ['orphan']
  );
});

// ---- The stamp and the players' copy ----

test('the stamp: one per pairs in force, the same from the players copy, empty again at the undo', () => {
  const a = C.structStamp(S, D, cur({pairs: out('Acropora', 'Montipora')})),
    b = C.structStamp(S, D, cur({pairs: add('Acropora', 'Porites')}));
  assert.match(a, /^[0-9a-z]+$/);
  assert.ok(a && b && a !== b);
  assert.strictEqual(C.structStamp(S, D, cur({pairs: {}})), '');
  assert.strictEqual(C.structStamp(S, D, cur({pairs: {[key('Acropora', 'Montipora')]: {v: 1, was: 1, t: 1}}})), '');
  // a text edit beside changes nothing
  assert.strictEqual(
    C.structStamp(S, D, cur({pairs: out('Acropora', 'Montipora'), nodes: {Acropora: {plain: {v: 'x', was: 'y', t: 1}}}})),
    a
  );
  const full = {
      ...CUR,
      content: {pairs: {...out('Acropora', 'Montipora'), [key('Acropora', 'Porites')]: {v: 1, was: null, t: 5, by: 'x1'}}}
    },
    slim = JSON.parse(
      execFileSync(
        'python3',
        ['-c', 'import sys, json; sys.path.insert(0, "tools"); import curplay; print(json.dumps(curplay.slim(json.load(sys.stdin))))'],
        {cwd: ROOT, input: JSON.stringify(full), maxBuffer: 1 << 28}
      ).toString()
    );
  assert.ok(C.structStamp(S, D, full));
  assert.strictEqual(C.structStamp(S, D, slim), C.structStamp(S, D, full));
  assert.strictEqual(C.structFp(S, slim), C.structFp(S, full));
  // the fish's stamp never moves with the corals' edits, nor theirs with the fish's
  assert.strictEqual(C.structStamp(C.subjectOf('fish'), JSON.parse(src('fish.json')), full), '');
  // the corals' gate: their own script version, never the fish's
  assert.strictEqual(C.structSheet(S), C.PAIRS_SHEET);
  assert.strictEqual(C.structSheet(C.subjectOf('fish')), C.STRUCT_SHEET);
  assert.ok(C.PAIRS_SHEET > C.STRUCT_SHEET);
});

// ---- The sheet (Code.gs): the coral replay under the pairs in force, keyed by the stamp ----

// GitHub main as the sheet reads it: data.json, and a curation.json the test changes (ok false: unreadable).
function mainFiles() {
  const m = {cur: CUR, ok: true, n: {data: 0, cur: 0}};
  m.fetch = url =>
    /\/main\/data\.json$/.test(url)
      ? (m.n.data++, {getResponseCode: () => 200, getContentText: () => DJSON})
      : /\/main\/curation\.json$/.test(url)
        ? (m.n.cur++, {getResponseCode: () => (m.ok ? 200 : 500), getContentText: () => JSON.stringify(m.cur)})
        : null;
  return m;
}
// Coral answers logged before the scoring record (no sc: the replay rebuilds their look-alike test from its units, where
// a pair counts), with mix-ups between Acropora and Montipora, a declared pair of the same family.
const coralLog = (p, n = 24) =>
  Array.from({length: n}, (_, i) => ({
    id: p + i,
    t: new Date(Date.UTC(2026, 10, 3, 6, 0, i)).toISOString(),
    g: 'Acropora',
    a: i % 4 === 3 ? 'Montipora' : 'Acropora',
    ok: i % 4 === 3 ? 0 : 1,
    m: 'quiz',
    ph: 'acropora-wide-' + (i % 5),
    ch: 'Acropora Montipora Porites Pocillopora',
    e: 0.8,
    th: 1
  }));
const PAIRS = cur({pairs: out('Acropora', 'Montipora')});
const savedUpToDate = {'reefid-sync-coral-progress': '{}', 'reefid-sync-coral-rv': JSON.stringify(C.RV)};
const replayOf = (L, gen) =>
  C.replayProgress(
    L.map(a => C.logRow(a, 'ana')),
    {gen, fmt: {}}
  ).ana.P;

test('the sheet: a coral pair Publish replays a player whose rules are applied, its undo gives the same record back', () => {
  const m = mainFiles(),
    s = loadCodeGs({fetch: m.fetch}),
    L = coralLog('a'),
    st1 = C.structStamp(S, D, PAIRS),
    save = x => s.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: [], rv: C.RV, ...x});
  s.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: L, rv: C.RV});
  // No edit: an app that says the empty stamp gets nothing (no replay at the deploy); an older app (no sts) neither.
  assert.ok(!save({sts: {coral: ''}}).replay);
  assert.ok(!save({}).replay);
  // The Publish: read at once when a device holds the new stamp (stn)…
  m.cur = PAIRS;
  const r1 = save({sts: {coral: ''}, stn: {coral: st1}});
  assert.ok(r1.replay, 'replayed under the new pairs');
  assert.deepStrictEqual([r1.replay.rv, r1.replay.st, r1.replay.n], [C.RV, st1, L.length]);
  const T = s.sheets.Replayed,
    row = Array.from(T.rows[1]);
  assert.ok(String(row[3]).endsWith('~' + st1), 'the stamp in the cache identity');
  // the pair counts: the record is not the base's, and is the one made with the units under the pairs in force
  const r0 = (() => {
    const t = loadCodeGs({fetch: mainFiles().fetch});
    t.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: L, rv: C.RV});
    return t.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: [], rv: 0, sts: {coral: ''}}).replay;
  })();
  assert.ok(r0 && JSON.stringify(r0.rec) !== JSON.stringify(r1.replay.rec), 'the pair moves the bars');
  assert.ok(!('st' in r0));
  // Applied: nothing more; an older app (no stamp said) up to date on the rules: nothing either.
  assert.ok(!save({sts: {coral: st1}}).replay);
  assert.ok(!save({}).replay);
  // The undo (read at the trigger's next run): the stamp empty again, the replay the base's record exactly.
  m.cur = CUR;
  s.ctx.subjStRefresh_();
  const r2 = save({sts: {coral: st1}});
  assert.ok(r2.replay && !('st' in r2.replay));
  assert.deepStrictEqual(r2.replay.rec, r0.rec);
  // a load says it too (st_coral)
  m.cur = PAIRS;
  s.ctx.subjStRefresh_();
  assert.strictEqual(s.get({name: 'Ana', pin: '1234', rv: String(C.RV), st_coral: ''}).replay.st, st1);
  assert.ok(!s.get({name: 'Ana', pin: '1234', rv: String(C.RV), st_coral: st1}).replay);
  // data.json read once per structure (the units under the curation's fingerprint)
  assert.ok(m.n.data <= 3, String(m.n.data));
});

test('the sheet: an unreadable curation replays no coral progress (never the base in place of the editor’s pairs)', () => {
  const m = mainFiles();
  m.ok = false;
  const s = loadCodeGs({fetch: m.fetch});
  s.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: coralLog('c'), rv: C.RV});
  assert.ok(!s.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: [], rv: 0, sts: {coral: ''}}).replay);
  m.ok = true;
  assert.ok(s.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: [], rv: 0, sts: {coral: ''}}).replay);
});

test('rule D8: the trigger replays under the new pairs a coral player who never reconnects, for the leaderboard', () => {
  const m = mainFiles(),
    s = loadCodeGs({fetch: m.fetch}),
    L = coralLog('d'),
    st1 = C.structStamp(S, D, PAIRS);
  s.post({name: 'Ben', pin: '1234', data: savedUpToDate, summary: {}, answers: L, rv: C.RV});
  const n0 = s.ctx.boardWarm_();
  m.cur = PAIRS;
  s.ctx.subjStRefresh_();
  assert.ok(s.ctx.boardWarm_() >= 1, 'his replay made under the new pairs');
  const row = Array.from(s.sheets.Replayed.rows.find(r => r[0] === 'Ben'));
  assert.deepStrictEqual([row[1], row[2]], [C.RV, L.length]);
  assert.ok(String(row[3]).endsWith('~' + st1));
  assert.strictEqual(n0, 0, 'up to date before: nothing to make');
  // His own app adopted it (its saved data says the stamp): nothing more to make.
  s.post({
    name: 'Ben',
    pin: '1234',
    data: {...savedUpToDate, 'reefid-sync-coral-st': JSON.stringify(st1)},
    summary: {},
    answers: [],
    rv: C.RV
  });
  assert.strictEqual(s.ctx.boardWarm_(), 0);
});

test('the sheet: the replay is the app’s own under the pairs in force (genLooks over contentApply)', () => {
  const L = coralLog('e'),
    m = mainFiles(),
    s = loadCodeGs({fetch: m.fetch});
  m.cur = PAIRS;
  s.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: L, rv: C.RV});
  const r = s.post({name: 'Ana', pin: '1234', data: savedUpToDate, summary: {}, answers: [], rv: 0, sts: {coral: ''}}).replay,
    want = replayOf(L, C.genLooks(C.contentApply(S, D, PAIRS))),
    base = replayOf(L, C.genLooks(D));
  assert.ok(JSON.stringify(want) !== JSON.stringify(base), 'the pair moves the record');
  assert.deepStrictEqual(r.rec.Acropora.ok, want.Acropora.ok);
  assert.deepStrictEqual(Object.keys(r.rec).sort(), Object.keys(want).sort());
});

// Rule C2 under the editor's coral edits: an edited slot's source travels with it wherever the slot
// is shown with an attribution of its own. The criteria are cited by the source he gave, the Coral Finder pages only for
// the book's own text (app.js critRef: the genus sheet, the quiz's answer, the Coral ID Key); his summary's, mnemonic's
// and look-alike line's sources with them; a bonus genus's reworded tips lose the Coral Finder label (tipsLabel).
test('C2: an edited coral slot shows its own source, never the Coral Finder’s or nothing, in the quiz’s answer and the sheets', () => {
  const vm = require('vm'),
    block = require('./block.js'),
    APP = src('app.js'),
    LEARN = src('learn.js'),
    QUIZ = src('quiz.js'),
    G = D.gen.Acropora,
    xg = Object.keys(X).find(n => (X[n].qt || []).length && (X[n].pages || []).length),
    A = C.contentApply(
      S,
      D,
      cur({
        nodes: {
          Acropora: {
            crit: {v: ['Made-up criterion'], was: G.crit, src: {t: 'A made-up key', u: 'https://example.org/key'}, t: 1},
            sum: {v: 'Made-up summary', was: G.sum, src: {t: 'A made-up summary source'}, t: 1},
            mn: {v: 'Made-up mnemonic', was: G.mn, src: {t: 'A made-up course'}, t: 1},
            'lsrc/Anacropora': {v: 'Made-up line', was: G.lsrc.Anacropora, src: {t: 'A made-up line source'}, t: 1}
          },
          [xg]: {qt: {v: ['Made-up tip'], was: X[xg].qt, src: {t: 'A made-up tip source'}, t: 1}}
        }
      })
    );
  assert.ok(xg, 'a bonus genus with tips and pages');
  // as app.js build does: an edited tip's source read by tipsList
  [A.gen, A.x.gen].forEach(M => Object.values(M).forEach(g => g.esrc && g.esrc.qt && (g.qsrc = g.esrc.qt)));
  const ctx = {
    DATA: A,
    TREEU: null,
    namesLine: () => '',
    uname: n => `<i>${n}</i>`,
    unameT: n => n,
    hr: x => '#' + x,
    vernFirst: () => '',
    altName: s => s,
    isBonus: () => false,
    setOf: () => ({}),
    sheetTab: () => '',
    isBenthic: () => false,
    credit: () => '',
    againLeft: () => false,
    fbLine: () => '', // the sheet's one line (quiz.js fbLine; tests/fbsheet.test.js)
    taxonLine: () => ''
  };
  vm.createContext(ctx);
  vm.runInContext(
    [
      block(APP, 'const esc = s =>', '\n// Page keyboard handlers', {file: 'app.js'}),
      'const gloss = x => esc(x), glossAll = L => L.map(esc);',
      block(APP, 'const GX = n =>', '\n', {file: 'app.js'}),
      block(APP, '// A source the content editor gave with an edit', '// A name as IMR writes it', {file: 'app.js'}),
      block(APP, 'const tipsLabel = g =>', "'ID tips (IMR)');\n", {through: 1, file: 'app.js'}),
      block(LEARN, 'const srcA = x =>', '\n', {file: 'learn.js'}),
      block(LEARN, 'const esrcOf = (r, k) =>', 'const treeNote', {file: 'learn.js'}),
      block(LEARN, 'const lsrcOf = (a, b) =>', 'const isClassic', {file: 'learn.js'}),
      block(QUIZ, 'function fbBody(', '\n}\n', {through: 1, file: 'quiz.js'}),
      'Object.assign(this, {fbBody, critRef, tipsList, tipsLabel, lsrcEsrc});'
    ].join('\n'),
    ctx
  );
  const tref = h => (h.match(/<p class="tref">(.*?)<\/p>/) || [])[1];
  // the quiz's answer: the edited criteria by their source (a link), the summary and mnemonic with theirs
  const fb = ctx.fbBody('Acropora', 'Acropora', true, false, false, [], '', null, null);
  assert.strictEqual(tref(fb), '<a href="https://example.org/key" target="_blank" rel="noopener">A made-up key</a>');
  assert.ok(!/Coral Finder p\./.test(fb), 'no Coral Finder page for the editor’s criteria');
  assert.match(fb, /Made-up summary <small class="esrc">\(A made-up summary source\)<\/small>/);
  assert.match(fb, /Made-up mnemonic <small class="esrc">\(A made-up course\)<\/small>/);
  // an unedited genus: the book's pages
  const P = D.gen.Porites;
  assert.strictEqual(
    tref(ctx.fbBody('Porites', 'Porites', true, false, false, [], '', null, null)),
    `Coral Finder p. ${P.pages.join(', ')}`
  );
  assert.strictEqual(ctx.critRef(A.gen.Porites), `Coral Finder p. ${P.pages.join(', ')}`);
  assert.strictEqual(ctx.critRef(A.gen.Acropora, false), 'A made-up key');
  // criteria hidden (keep: []): no empty list, no reference
  const H = C.contentApply(S, D, cur({nodes: {Porites: {crit: {v: null, was: P.crit, t: 1}}}}));
  ctx.DATA = H;
  assert.strictEqual(tref(ctx.fbBody('Porites', 'Porites', true, false, false, [], '', null, null)), undefined);
  ctx.DATA = A;
  // a bonus genus's reworded tips: no Coral Finder label, their source under them; its other tips keep the book's label
  const xr = A.x.gen[xg];
  assert.strictEqual(ctx.tipsLabel(xr), 'ID tips');
  assert.match(ctx.tipsList(xr), /<p class="note esrc">Source: A made-up tip source<\/p>/);
  const xo = Object.keys(X).find(n => n !== xg && (X[n].pages || []).length);
  assert.strictEqual(ctx.tipsLabel(A.x.gen[xo]), `ID tips (Coral Finder p. ${X[xo].pages.join(', ')})`);
  // a summary shown as the tips (no tips of its own) with its source
  assert.strictEqual(ctx.tipsList({sum: 'S', esrc: {sum: {t: 'Src'}}}), '<p class="keyid">S <small class="esrc">(Src)</small></p>');
  // the Look-alikes deck's line: the edited line's source, from whichever side holds it
  assert.strictEqual(ctx.lsrcEsrc('Acropora', 'Anacropora'), '; A made-up line source');
  assert.strictEqual(ctx.lsrcEsrc('Anacropora', 'Acropora'), D.gen.Anacropora.lsrc.Acropora ? '' : '; A made-up line source');
  assert.strictEqual(ctx.lsrcEsrc('Pocillopora', 'Stylophora'), '');
  // the genus sheet and the Coral ID Key cite the criteria through critRef, the deck's line with its source
  assert.match(block(LEARN, 'const cfList =', '\n', {file: 'learn.js'}), /<span class="pg">\$\{critRef\(g\)\}<\/span>/);
  assert.match(LEARN, /\$\{srcTag\(m\.src\)\}\$\{esc\(m\.es\)\}/);
  assert.match(src('proto/idkey.js'), /Criteria <small>· \$\{critRef\(g, false\)\}<\/small>/);
  // the side-by-side comparison too (learn.js viewCompare)
  assert.match(
    block(LEARN, 'function viewCompare(a, b) {', '\n}\n', {file: 'learn.js'}),
    /<p class="note">\$\{critRef\(g\)\}<\/p><\/details>/
  );
  ['quiz.js', 'proto/idkey.js'].forEach(f => assert.ok(!src(f).includes('Coral Finder p. ${g.pages'), `${f}: a hard-coded criteria page`));
});
