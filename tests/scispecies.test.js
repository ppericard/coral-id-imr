require('./slot.js').testGuard();
// The species by their scientific names, the app's own (docs/reviews/2026-11-18-species-step2-plan.md §5 item 3; the
// sheet's side is tests/scisheet.test.js): the units of each kind from SUBJECTS names (app.js treeGenera X.ssl), their
// parent and the order they open in (sciPlay), the class a question stays in (kindRank), the display schedule (sciShow),
// the typed names and Q394's smaller faults (sciTypeNames, sciPart, quiz.js typeBind part), the mode's suffix and the
// fault's mark in the scoring record, a locked unit taking a live answer's evidence without opening, the gate (rule D4).
// On the real fish.json and seaslug.json; nothing leaves the process.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f)),
  APP = src('app.js'),
  QUIZ = src('quiz.js');
const F = json('fish.json'),
  PH = json('fish-photos.json'),
  GM = C.treeGameRead(json('fish-game.json')),
  CUR = json('curation.json'),
  SF = json('seaslug.json'),
  SG = C.treeGameRead(json('seaslug-game.json'));
const FISH = C.subjectOf('fish'),
  SEA = C.subjectOf('seaslug');

// app.js's own code on stubs: treeGenera, the species' rules (sciPlay, kindOf, kindRank, rankOf, sciShow, sciPart...).
function appOf(subj, X0, Fx, {sheet = 1000, bar = {}, met = new Set()} = {}) {
  const ctx = {
    DOM: {EX: 0.9},
    LV_AT: [0.5, 0.8, 0.85],
    easyCover: C.easyCover,
    treeScoreTree: C.treeScoreTree,
    treeSpUnits: C.treeSpUnits,
    treeGenSets: C.treeGenSets,
    rankWeights: C.rankWeights,
    unitRankOf: C.unitRankOf,
    typeNormAll: C.typeNormAll,
    SUBJ: subj,
    UNITS: {[subj.id]: {norm: C.typeNormAll}},
    sciOn: () => sheet >= 198, // sync.js sciOn: SCI_SHEET
    genScore: n => bar[n] || 0,
    introduced: n => met.has(n),
    photoAny: n => !!(ctx.TREEU.gen[n] && ctx.TREEU.gen[n].views.wide.length),
    Math: Object.create(Math)
  };
  vm.createContext(ctx);
  vm.runInContext(
    [
      block(APP, 'function treeGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}),
      block(APP, 'function sciPlay(', '\n}\n', {through: 1, file: 'app.js'}),
      block(APP, 'const kindOf = n =>', '// The scientific genera in play', {file: 'app.js'}),
      block(APP, 'const rankOf = n => {', '\n};\n', {through: 1, file: 'app.js'}),
      block(APP, 'const sciSpOn = () =>', '// The units in play a species by its scientific name', {file: 'app.js'}),
      'const GX = n => TREEU.gen[n];',
      'this.A = {treeGenera, sciPlay, kindOf, kindRank, rankOf, sciSpAll, sciTypeNames, sciShow, sciPart, SCISHOW};'
    ].join('\n'),
    ctx
  );
  ctx.TREEU = ctx.A.treeGenera(Object.assign(X0, {kinds: subj.names}), Fx);
  return Object.assign(ctx.A, {ctx, X: ctx.TREEU});
}
const fishX0 = () => C.treeGen(F, C.treePhotos(PH.photos, GM.photos, CUR), PH.sheet);
const seaX0 = () => C.treeGen(SF, C.treePhotos(undefined, SG.photos, CUR.seaslug), undefined, C.unitRankOf(SEA));
const A = appOf(FISH, fishX0(), F),
  X = A.X,
  byName = n => F.species.find(s => s.name === n),
  sci = n => C.spUnitId('sci', byName(n).id);

test('SUBJECTS names: the fish both kinds, the sea slugs the scientific names only', () => {
  assert.deepStrictEqual(FISH.names, ['cn', 'sci']);
  assert.deepStrictEqual(SEA.names, ['sci']);
  assert.ok(!C.subjectOf('coral').names, 'the corals: no species units');
});

test('the units: one per species under a genus unit, its genus its parent and start, its own photos, the sheet’s ids', () => {
  const U = C.treeSpUnits(F, X, 'sci');
  assert.deepStrictEqual(
    [...X.ssl],
    U.map(u => u.id)
  );
  assert.ok(X.ssl.length > 600, String(X.ssl.length));
  const g = X.gen[sci('Chromis ternatensis')],
    s = byName('Chromis ternatensis');
  assert.strictEqual(g.id, 'sci:' + s.id);
  assert.strictEqual(g.name, 'Chromis ternatensis');
  assert.strictEqual(g.kind, 'sci');
  assert.strictEqual(g.rank, 'species');
  assert.strictEqual(g.parent, 'g:Chromis');
  assert.strictEqual(g.from, 'g:Chromis');
  assert.strictEqual(g.noex, 1);
  assert.ok(g.views.wide.length && g.views.wide.every(p => p.sp === s.id && !p.gl));
  assert.deepStrictEqual([...g.names], ['Chromis ternatensis']);
  // its common name for the display schedule, its feedback line names its common names
  assert.strictEqual(g.cn, s.cn[0][0]);
  assert.match(g.sum, /^Common names?: /);
  // a species by its common name keeps its own unit, kind cn: the two trees apart
  assert.strictEqual(X.gen['s:' + s.id].kind, 'cn');
  assert.notStrictEqual(A.kindRank('s:' + s.id), A.kindRank(g.id));
  assert.strictEqual(A.rankOf(g.id), 'species', 'the rank logged and the share read the rank alone');
  assert.strictEqual(A.kindRank('g:Chromis'), 'genus');
  // every species with a WoRMS name of its own takes it typed
  const now = F.species.find(x => x.now && x.now !== x.name && X.gen['sci:' + x.id]);
  assert.ok(now && X.gen['sci:' + now.id].names.includes(now.now));
});

test('the sea slugs: the scientific species of every genus, no common-name unit, the genus-level photos the genus’s only', () => {
  const S = appOf(SEA, seaX0(), SF),
    Y = S.X;
  assert.strictEqual(Y.spl.length, 0, 'no common-name branch (names)');
  assert.strictEqual(Y.ssl.length, SF.species.length);
  const gp = Y.gen['sci:xgoniobranchussp5'];
  assert.ok(gp && gp.parent === 'g:Goniobranchus' && gp.src, 'Goniobranchus sp. 5: its key, its parent, its source');
  assert.strictEqual(gp.cn, '', 'no common name under it');
  // a genus-level photo (gl) shows on its genus (and its family), never on a species
  const gl = Object.values(Y.gen).flatMap(g => g.views.wide.filter(p => p.gl).map(p => [g.id, p]));
  assert.ok(gl.some(([id]) => Y.gen[id].rank === 'genus'));
  assert.ok(gl.every(([id]) => Y.gen[id].rank !== 'species'));
  // its typed forms: "Goniobranchus sp. 5", "sp 5", "sp5" (the norm keeps the letters)
  const N = S.sciTypeNames(['sci:xgoniobranchussp5']);
  ['Goniobranchus sp. 5', 'Goniobranchus sp 5', 'goniobranchus sp5'].forEach(t =>
    assert.strictEqual((C.typeMatchIn(N, t, C.typeNormAll) || {}).g, 'sci:xgoniobranchussp5', t)
  );
  // quiz.js typeMatch: its number holds it apart (the norm keeps letters only): sp. 6 or sp. alone read as nothing
  const q = {
    SUBJ: SEA,
    GX: n => Y.gen[n],
    kindRank: S.kindRank,
    typeMatchIn: C.typeMatchIn,
    typeNames: () => S.sciTypeNames(Y.ssl),
    UNITS: {seaslug: {norm: C.typeNormAll}}
  };
  vm.createContext(q);
  vm.runInContext(
    block(QUIZ, 'const typeMatch = (text, rk', '// What a typed text', {file: 'quiz.js'}) + '\nthis.typeMatch = typeMatch;',
    q
  );
  ['Goniobranchus sp. 5', 'goniobranchus sp5'].forEach(t =>
    assert.strictEqual((q.typeMatch(t, 'species:sci') || {}).g, 'sci:xgoniobranchussp5', t)
  );
  ['Goniobranchus sp. 6', 'Goniobranchus sp.'].forEach(t => assert.strictEqual(q.typeMatch(t, 'species:sci'), null, t));
  assert.strictEqual(
    (q.typeMatch('Chromodoris annae', 'species:sci') || {}).g,
    'sci:' + SF.species.find(s => s.name === 'Chromodoris annae').id
  );
});

test('sciPlay: nothing while off or with the genus out of play; from the genus at Advanced, one at a time in its order', () => {
  const g = 'g:Chromis',
    L = X.ssl,
    own = L.filter(n => X.gen[n].parent === g && X.gen[n].views.wide.length),
    order = X.gen[g].species.map(id => 'sci:' + id).filter(n => own.includes(n)),
    met = new Set(),
    bar = {[g]: 0.85},
    up = new Set([g]),
    open = (on = true, u = up) => [
      ...A.sciPlay(
        L,
        n => bar[n] || 0,
        n => met.has(n),
        u,
        on
      )
    ];
  assert.ok(own.length >= 3);
  assert.deepStrictEqual(open(false), []);
  assert.deepStrictEqual(open(true, new Set()), [], 'its genus not in play (the scientific names turned off)');
  assert.deepStrictEqual(open(), [order[0]], "the genus's first species first");
  met.add(order[0]);
  assert.deepStrictEqual(open(), [order[0], order[1]]);
  bar[g] = 0.79;
  assert.deepStrictEqual(open(), [order[0]], 'under Advanced: the species met stay, no new one');
  assert.deepStrictEqual(open(true, new Set()), [], 'a genus out of play: its species met stop being asked (Q402 A)');
  // a threshold of its own (shareAt) wins over Advanced
  X.gen[g].shareAt = 0.7;
  assert.deepStrictEqual(open(), [order[0], order[1]]);
  delete X.gen[g].shareAt;
  // the order a fish genus's species open in is its family's commonness order
  const fam = F.families.find(f => f.id === X.gen[g].parent).species.filter(id => order.includes('sci:' + id));
  assert.deepStrictEqual(
    order.map(n => X.gen[n].sp),
    fam
  );
});

test('the gate (rule D4): before the sheet replays them, no unit of the level, no typed name; the score tree follows', () => {
  const off = appOf(FISH, fishX0(), F, {sheet: 197}),
    on = appOf(FISH, fishX0(), F, {sheet: 198});
  assert.deepStrictEqual([...off.sciSpAll()], []);
  assert.strictEqual(on.sciSpAll().length, on.X.ssl.length);
  // UNITS fish tree: the tree with the scientific species once on (treeSci), treeBoardTree's
  assert.match(APP, /tree: \(\) => \(TREEU \? \(sciSpOn\(\) \? TREEU\.treeSci : spOn\(\) \? TREEU\.treeSp : TREEU\.tree\) : null\)/);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(on.X.treeSci)), JSON.parse(JSON.stringify(C.treeBoardTree(F))));
  // The set's all and the typed names read sciSpAll; the fish's and the sea slugs' sets hold it
  assert.match(APP, /\n  all: \(\) => sciSpAll\(\),\n/);
  assert.match(APP, /\.\.\.sciTypeNames\(sciSpAll\(\)\)/);
  const sea = block(APP, '\n  seaslug: {', '\ntreeAt(SUBJ.id);', {file: 'app.js'});
  assert.match(sea, /sets: \[SCI_SP\]/);
  assert.match(sea, /\.filter\(\(\[, g\]\) => g\.rank !== 'species'\)/, "the sea slugs' genus names never hold a species");
});

test('sciShow: with the common name under it below Open Water, alone from Advanced, by a rising chance between', () => {
  const n = sci('Chromis ternatensis'),
    bar = A.ctx.genScore;
  const at = b => {
    A.ctx.genScore = () => b;
    const out = {sc: 0, so: 0};
    for (let i = 0; i < 2000; i++) out[A.sciShow(n)]++;
    return out.so / 2000;
  };
  assert.strictEqual(at(0), 0);
  assert.strictEqual(at(0.49), 0);
  assert.strictEqual(at(0.8), 1);
  assert.strictEqual(at(0.95), 1);
  const mid = at(0.65);
  assert.ok(mid > 0.4 && mid < 0.6, String(mid));
  assert.ok(at(0.75) > at(0.6));
  A.ctx.genScore = bar;
  // a species with no common name, and every sea slug: alone
  const none = F.species.find(s => !(s.cn || []).length && X.gen['sci:' + s.id]);
  assert.ok(none);
  assert.strictEqual(A.sciShow('sci:' + none.id), 'so');
  const S = appOf(SEA, seaX0(), SF);
  assert.strictEqual(S.sciShow('sci:xgoniobranchussp5'), 'so');
});

test('Q394: its common name half a fault, its genus alone a quarter; another species or genus no smaller fault', () => {
  const n = sci('Chromis ternatensis'),
    s = byName('Chromis ternatensis');
  assert.strictEqual(A.sciPart(s.cn[0][0], n), 'cn');
  assert.strictEqual(A.sciPart(s.cn[0][0].toUpperCase(), n), 'cn', 'any case');
  (s.cn || []).flat().forEach(x => assert.strictEqual(A.sciPart(x, n), 'cn', x));
  assert.strictEqual(A.sciPart('Chromis', n), 'g');
  assert.strictEqual(A.sciPart('chromis', n), 'g');
  assert.strictEqual(A.sciPart('Chromis zzzz', n), 'g', 'with a second word no species has');
  assert.strictEqual(A.sciPart('Chromis lunare', n), '', 'a second word a species has: no smaller fault');
  assert.strictEqual(A.sciPart('Dascyllus', n), '', 'another genus');
  const other = F.species.find(x => x.family === s.family && x.id !== s.id && (x.cn || []).length);
  assert.strictEqual(A.sciPart(other.cn[0][0], n), '', "another species' common name");
  assert.strictEqual(A.sciPart('', n), '');
  // what the nudge says of the rest (app.js sciSay): another species' common name, a genus, a family
  const say = vm.runInContext('sciSay', A.ctx);
  assert.strictEqual(say(other.cn[0][0]), 'common');
  assert.strictEqual(say('Dascyllus'), 'genus');
  assert.strictEqual(say('Damselfishes'), 'family');
  assert.strictEqual(say('zzzz'), '');
  // the sea slugs: their English names are information (Q369), their genus alone a quarter
  const S = appOf(SEA, seaX0(), SF),
    an = SF.species.find(x => x.name === 'Chromodoris annae');
  S.ctx.TREEU.sps = Object.fromEntries(SF.species.map(x => [x.id, x]));
  assert.strictEqual(S.sciPart('Chromodoris', 'sci:' + an.id), 'g');
  assert.strictEqual(S.sciPart(an.en[0].n, 'sci:' + an.id), '');
});

// quiz.js typeBind with a part: a smaller fault is read before the nudges and the spelling step, and is the answer.
function form() {
  const el = {
    inp: {value: '', disabled: false, focus() {}, select() {}, blur() {}},
    msg: {textContent: '', innerHTML: ''},
    idk: {textContent: "I don't know", onclick: null},
    cls: new Set()
  };
  el.form = {
    querySelector: s => (s === 'input' ? el.inp : s === '.tymsg' ? el.msg : s === '[data-idk]' ? el.idk : null),
    querySelectorAll: () => [],
    classList: {add: c => el.cls.add(c), remove: c => el.cls.delete(c), contains: c => el.cls.has(c)},
    onsubmit: null
  };
  el.type = t => ((el.inp.value = t), el.form.onsubmit({preventDefault() {}}), el.msg.textContent);
  return el;
}
test('typeBind: a smaller fault ends the question with its kind; the scientific names read among their own class', () => {
  const t = sci('Chromis ternatensis'),
    names = A.sciTypeNames(X.ssl),
    ctx = {
      SUBJ: FISH,
      DATA: {},
      UNITS: {fish: {names: () => names, norm: C.typeNormAll}},
      kindRank: A.kindRank,
      rankOf: A.rankOf,
      unitRankOf: C.unitRankOf,
      GX: g => X.gen[g],
      typeMatchIn: C.typeMatchIn,
      typeElse: C.typeElse,
      typeVerdict: C.typeVerdict,
      unameT: n => (X.gen[n] || {}).name || n,
      esc: s => String(s),
      inSubject: (id, fn) => fn(),
      matchMedia: () => ({matches: true})
    };
  vm.createContext(ctx);
  vm.runInContext(
    block(QUIZ, 'let TYPEDQ = null,', '// S: the subject the form names and reads', {file: 'quiz.js'}) +
      block(QUIZ, 'function typeBind(', '\n}\n', {file: 'quiz.js', through: 1}) +
      '\nthis.M = {typeBind, typeMatch};',
    ctx
  );
  const part = x => A.sciPart(x, t),
    run = text => {
      const f = form();
      let got = null;
      ctx.M.typeBind(f.form, (m, tx, sp, rj, z) => (got = {m, tx, rj, z}), undefined, A.kindRank(t), 'species', {t, part});
      f.type(text);
      return got;
    };
  assert.deepStrictEqual({...run('Chromis'), rj: []}, {m: null, tx: 'Chromis', rj: [], z: 'g'});
  assert.strictEqual(run('Ternate chromis').z, 'cn');
  assert.strictEqual(run('Chromis ternatensis').m.g, t, 'the right name');
  assert.strictEqual(run('Chromis ternatensis').z, undefined);
  const other = run('Chromis viridis');
  assert.ok(other.m && other.m.g === sci('Chromis viridis') && !other.z, 'another species of its genus: a mix-up, a full miss');
  assert.strictEqual(run('Dascyllus'), null, 'another genus: no answer, the nudge');
  // the scientific names only: a common name never reads as a scientific species, nor the reverse
  assert.strictEqual(ctx.M.typeMatch('Ternate chromis', A.kindRank(t)), null);
});

test('answer: the mode says the display (|sc, |so) before |kN; the scoring record marks a smaller fault on a miss only', () => {
  const mq = block(QUIZ, '  const mq =\n', ';\n', {through: 1, file: 'quiz.js'}) + 'mq;',
    mode = o =>
      vm.runInContext(
        mq,
        vm.createContext({
          modeBase: cur => cur,
          photoQuiz: cur => cur === 'quiz',
          AUTOD: false,
          FINDX: false,
          warm: false,
          k: 4,
          nc: 4,
          tq: null,
          sci: null,
          exq: false,
          cur: 'quiz',
          ph: [],
          ...o
        })
      );
  assert.strictEqual(mode({}), 'quiz');
  assert.strictEqual(mode({sci: {v: 'sc'}}), 'quiz|sc');
  assert.strictEqual(mode({sci: {v: 'so'}, k: 2}), 'quiz|so|k2');
  assert.strictEqual(C.fmtOf('quiz|sc', 4), 'k4');
  assert.strictEqual(C.fmtOf('quiz|so|k2', 4), 'k2');
  assert.ok(!/^quiz\|s(\||$)/.test('quiz|so'), 'never read as the custom quiz');
  assert.ok(/^[A-Za-z0-9:|-]*$/.test('quiz|so|k2'), "the sheet's mode pattern (Code.gs logAnswers_ M)");
  // The scorer's inputs (quiz.js recordAnswer): z on a miss only, logged in the scoring record
  const QSRC = block(QUIZ, '  const q = scoreIn({', '\n  });\n', {through: true, file: 'quiz.js'});
  assert.match(QSRC, /\.\.\.\(!good && tq && tq\.z \? \{z: tq\.z\} : \{\}\),/);
  const q = C.scoreIn({t: 'sci:s091', c: '', ok: false, k: Infinity, chs: [], d0: 0.3, ph: ['p'], z: 'g'});
  assert.strictEqual(C.scoreLog(q, {look: false}).z, 'g');
  assert.strictEqual(C.partOf(q), C.PART.g);
  assert.strictEqual(C.partOf({...q, ok: true}), 1, 'never on a right answer');
});

test('a locked scientific species takes a live answer as evidence without opening (rule L4, model.js introLive)', () => {
  const model = block(src('model.js'), '// First meeting with a genus (Pierre', '// Comeback after a break (Pierre', {file: 'model.js'}),
    saved = {},
    P = {},
    ctx = {
      ...require('./subj.stub.js')(),
      P,
      LEVEL: '~level',
      CB: {},
      COMEBACK: {KEY: 'reefid-comeback'},
      n: 0,
      Date: {now: () => 1.8e12},
      slateGenera: () => [],
      syncSoon: () => {},
      ...(({CHOICE, startOpt, startVars, startCheck, startNext, startInfer}) => ({
        CHOICE,
        startOpt,
        startVars,
        startCheck,
        startNext,
        startInfer
      }))(C),
      basicsDone: () => false,
      document: {querySelectorAll: () => []},
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))},
      GX: n => X.gen[n],
      TREEU: X,
      Q: {}
    };
  ctx.answersSoFar = () => ctx.n;
  vm.createContext(ctx);
  vm.runInContext(model + '\nthis.M = {introLive, introduced, asked, closed, introAdd};', ctx);
  const M = ctx.M,
    g = 'g:Chromis',
    own = X.ssl.filter(n => X.gen[n].parent === g && X.gen[n].views.wide.length),
    first = own[0];
  M.introLive(first);
  P[first] = {ok: 1, ko: 0, at: 1.8e12};
  assert.ok(M.asked(first) && M.closed(first) && !M.introduced(first), 'its answers kept, not opened');
  // not in play while its genus is under Advanced; offered on its card once the genus is there, its answers kept
  const play = b => [...A.sciPlay(X.ssl, n => (n === g ? b : 0), M.introduced, new Set([g]), true)];
  assert.deepStrictEqual(play(0.5), []);
  assert.deepStrictEqual(play(0.85), [first], 'the next one, through its card (the usual opening)');
  M.introAdd([first]);
  assert.ok(M.introduced(first) && P[first].ok === 1);
});

test('a species by its scientific name opens its species sheet: its address and back, both subjects', () => {
  [
    [FISH, F, sci('Chromis ternatensis'), 'Chromis ternatensis'],
    [SEA, SF, 'sci:xgoniobranchussp5', 'Goniobranchus sp. 5']
  ].forEach(([S, Fx, n, name]) => {
    const out = C.routeOut('g-' + n, S);
    assert.match(out, /learn\/species\//, out);
    const back = C.routeIn('#' + out).key; // g-<the sheet id>, learn.js treeGo reads it after g-
    assert.ok(back.startsWith('g-'), back);
    assert.strictEqual(C.treeSheets(Fx).go(C.sheetIdOf(S, back.slice(2))), 's:' + name, back);
  });
  // through app.js hr: sheetIdOf owns a sci unit for its subject (its species sheet's id), never the corals'
  [
    [FISH, sci('Chromis ternatensis')],
    [SEA, 'sci:xgoniobranchussp5']
  ].forEach(([S, n]) => {
    const id = C.sheetIdOf(S, n);
    assert.strictEqual(id, 's:' + n);
    assert.match(C.routeOut('g-' + id, S), /learn\/species\/sci/);
  });
  // a common-name unit's address is as before
  assert.match(C.routeOut('g-' + C.spUnitId('cn', byName('Chromis ternatensis').id), FISH), /learn\/species\/s091$/);
});

test('the achievements: fspsci1, fboth25, fdauin20 on the scientific bars at Advanced, fpct70 on the score', () => {
  const A2 = id => C.FISH_ACH.find(a => a.id === id),
    snap = o => ({sets: {}, setsAdv: {}, both: 0, top: null, pct: 0, ...o});
  assert.ok(['fspsci1', 'fboth25', 'fdauin20', 'fpct70'].every(A2), 'built');
  assert.ok(!A2('fpct100'), 'fpct100 waits for the ultimate exam (Q395)');
  assert.ok(!A2('fspsci1').test(snap({})) && A2('fspsci1').test(snap({setsAdv: {ssp: 1}})));
  assert.ok(!A2('fboth25').test(snap({both: 24})) && A2('fboth25').test(snap({both: 25})));
  assert.ok(!A2('fdauin20').test(snap({top: {total: 0, adv: 0}})), 'none while the level is off');
  assert.ok(!A2('fdauin20').test(snap({top: {total: 20, adv: 19}})) && A2('fdauin20').test(snap({top: {total: 20, adv: 20}})));
  assert.ok(!A2('fpct70').test(snap({pct: 69})) && A2('fpct70').test(snap({pct: 70})));
  // progress.js achBoth: a species counts once both its units are at Advanced; one kind asked: 0
  const step = {'s:a': 3, 'sci:a': 3, 's:b': 3, 'sci:b': 2, 'sci:c': 4},
    rec = {
      's:a': {kind: 'cn', sp: 'a'},
      'sci:a': {kind: 'sci', sp: 'a'},
      's:b': {kind: 'cn', sp: 'b'},
      'sci:b': {kind: 'sci', sp: 'b'},
      'sci:c': {kind: 'sci', sp: 'c'}
    },
    c = {GX: n => rec[n], lvStep: n => step[n] || 0};
  vm.createContext(c);
  vm.runInContext(
    block(src('progress.js'), 'const achBoth = ', '\n};\n', {through: 1, file: 'progress.js'}) + '\nthis.achBoth = achBoth;',
    c
  );
  const sets = [{all: () => ['s:a', 's:b']}, {all: () => ['sci:a', 'sci:b', 'sci:c']}];
  assert.strictEqual(c.achBoth(sets, ['cn', 'sci']), 1);
  assert.strictEqual(c.achBoth(sets, ['sci']), 0);
  // UNITS fish top: Dauin's top 20 of circle 1 by their scientific names, the most seen near Dauin first
  A.ctx.TREEU.sps = Object.fromEntries(F.species.map(s => [s.id, s]));
  const top = [...vm.runInContext('sciTop', A.ctx)(X.ssl, 20)],
    sp = top.map(n => F.species.find(s => s.id === X.gen[n].sp));
  assert.strictEqual(top.length, 20);
  assert.ok(sp.every(s => s.circle === 1));
  const d = s => (s.present || {}).dauinU || 0;
  assert.ok(sp.every((s, i) => !i || d(sp[i - 1]) >= d(s)));
  const rest = X.ssl
    .filter(n => !top.includes(n))
    .map(n => F.species.find(s => s.id === X.gen[n].sp))
    .filter(s => s.circle === 1);
  assert.ok(rest.every(s => d(s) <= d(sp[19])));
});
