require('./slot.js').testGuard();
// One logged answer, end to end (docs/spec/answer.md; REE-284, the A27/F27 reconciliation's item 2): the written contract
// of an answer checked through the real code of every stage, on synthetic answers and the in-memory sheet (tests/gas.js;
// rule D1, nothing leaves this process). The device's recorder (quiz.js recordAnswer, logAnswer, winkAnswer, run from
// their source, model.js stubbed, core.js's scorer for real), the sender (sync.js syncOnce: logOut on every answer), the
// sheet's intake (Code.gs doPost_, freshAnswers_, logAnswers_), its replay (replay_, core.js replayProgress) and the
// device's adoption (sync.js replayAdoptS, core.js replayAdopted, rule D9). The field table of docs/spec/answer.md is read
// here: a field added to an answer, a column or a replayed field needs its row there. A test named GAP pins today's
// behaviour where the code breaks the written contract (docs/spec/answer.md "Where the code breaks it"): it passes on
// today's code, and is turned round when the gap is closed (a separate PR, after Pierre's answer where one is needed).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const block = require('./block.js');
const C = require('../core.js');
const {loadCodeGs, bodyOf} = require('./gas.js');
const {synthLog} = require('./anslog.js');

const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  QUIZ = read('quiz.js'),
  CODE = read('tools/sync/Code.gs'),
  SPEC = read('docs/spec/answer.md'),
  DATA = require('../data.json'),
  DJSON = read('data.json'),
  CJSON = read('curation.json');
const whole = (src, from, file) => block(src, from, '\n}\n', {through: true, file});
const RECSRC = whole(QUIZ, 'function recordAnswer({', 'quiz.js'),
  LOGSRC = whole(QUIZ, 'function logAnswer(ans) {', 'quiz.js'),
  WINKSRC = whole(QUIZ, 'function winkAnswer(n, id, ids, p, tm) {', 'quiz.js');

// The field table of docs/spec/answer.md ("## The fields"): one row per key of a logged answer, its Answers column, and
// whether the replay reads it. No cell holds a pipe.
const FIELDS = SPEC.slice(SPEC.indexOf('\n## The fields'))
  .split('\n')
  .map(l => /^\| `([a-z]+)` \| ([A-Z][A-Za-z ]+) \| [^|]+ \| [^|]+ \| (yes|no) \|$/.exec(l))
  .filter(Boolean)
  .map(m => ({key: m[1], col: m[2], replayed: m[3] === 'yes'}));
const LOG = vm.runInContext('LOG', loadCodeGs().ctx);

// data.json and curation.json from GitHub main, as the script reads them for the corals' replay (Code.gs gen_, subjRpl_).
const withData = () => ({
  fetch: url =>
    /\/main\/data\.json$/.test(url)
      ? {getResponseCode: () => 200, getContentText: () => DJSON}
      : /\/main\/curation\.json$/.test(url)
        ? {getResponseCode: () => 200, getContentText: () => CJSON}
        : null
});
const copy = o => (o === undefined ? o : JSON.parse(JSON.stringify(o)));
// deepStrictEqual on plain copies: the queues, records and rows are made in other contexts (vm), whose arrays and objects
// have other prototypes.
const eq = (a, b, why) => assert.deepStrictEqual(copy(a), copy(b), why);
const T0 = Date.UTC(2026, 10, 20, 1, 0, 0),
  at = i => new Date(T0 + i * 20e3).toISOString();
const ph = (...f) => f.map(x => ({f: x, view: 'wide'}));

// The device's recorder: quiz.js recordAnswer, logAnswer and winkAnswer from their source, with core.js's scorer, answer
// id and content version for real and model.js / app.js stubbed (as tests/liveclass.test.js recApp). SUBJ: the subject
// on screen; SYNC: the account whose queue (SYNC.log) logAnswer fills; extra: stubs replaced. ctx.P is the device's
// progress of that subject.
const DIFF = {'acropora-wide-1': 0.35, 'porites-wide-2': -0.2, 'pocillopora-wide-3': 0.6},
  GD = {Acropora: 0.1, Porites: -0.05};
function recorder(SUBJ, SYNC, extra = {}) {
  const P = {},
    zero = () => 0;
  const ctx = {
    console,
    crypto: require('crypto').webcrypto,
    P,
    SUBJ,
    SYNC,
    SYNC_URL: 'https://script.google.com/macros/s/test/exec',
    PICKD: {SINGLE: 0.5},
    GX: n => (n ? {} : null),
    st: n => P[n] || (P[n] = {ok: 0, ko: 0, streak: 0}), // app.js st
    dropPlans() {},
    mxRecalc: f => f(),
    memRecalc() {},
    pmem: zero,
    scoreIn: C.scoreIn,
    scoreAnswer: C.scoreAnswer,
    scoreLog: C.scoreLog,
    contrastQ: C.contrastQ,
    fmtOf: C.fmtOf,
    fmtOff: C.fmtOff,
    pfmt: () => ({}),
    photoDiff: (t, p) => DIFF[p.f] || 0,
    famOf: () => -0.12,
    confTerm: zero,
    pgLook: () => false,
    startP: zero,
    genusDiff: t => GD[t] || 0,
    photoTimeQ: () => undefined, // no photo time term (quiz.js photoTimeQ before RTNET_SHEET)
    varRight() {},
    EXAM: {n: 5},
    TYPED: {exam: 2},
    examPassed: () => false,
    mxKept: () => true,
    speciesShown: () => '',
    rankOf: () => '',
    unitRankOf: C.unitRankOf,
    unitName: () => '',
    answerId: C.answerId,
    // quiz.js cvField (app.js contentVer): the content version of the units in force, made by core.js.
    cvField: () => ({cv: C.contentVersion(SUBJ, {}, ['d1', 'p1'], '')}),
    TYPEDQ_RJ: 10,
    HOLDS: 0,
    holdStep() {},
    startStep() {},
    comebackStep() {},
    answeredAt() {},
    save() {},
    renamedId: C.renamedId,
    WINK_MODE: C.WINK_MODE,
    ...extra
  };
  vm.createContext(ctx);
  vm.runInContext(RECSRC + LOGSRC + WINKSRC, ctx);
  return ctx;
}
const CORAL = () => C.subjectOf('coral');
const CH = ['Acropora', 'Montipora', 'Pocillopora', 'Porites'];
// Three coral answers that carry every field a coral answer can: a right photo-quiz answer with its seconds and a photo
// enlarged, a Find the X miss (the photo tapped, pa), a typed miss (the text, its spelling step, a try refused).
const CORAL_Q = [
  {cur: 'quiz', mq: 'quiz', target: 'Acropora', c: 'Acropora', k: 4, chs: CH, ph: ph('acropora-wide-1'), tm: {rt: 4.2, zm: 1}},
  {
    cur: 'quiz',
    mq: 'quiz|f',
    target: 'Porites',
    c: 'Montipora',
    k: 4,
    chs: CH,
    ph: ph('porites-wide-2'),
    tm: {rt: 7.5},
    tap: {f: 'montipora-wide-9'}
  },
  {
    cur: 'quiz',
    mq: 'quiz|t',
    target: 'Pocillopora',
    c: 'Porites',
    k: Infinity,
    chs: [],
    ph: ph('pocillopora-wide-3'),
    tm: {rt: 11},
    tq: {text: 'porites', sp: {r: 0}, rj: ['pocilopra']}
  }
];
const coralAnswers = (D, from = 0) => CORAL_Q.forEach((q, i) => D.recordAnswer({...q, at: at(from + i)}));
// A fish answer (the names at its rank and the species shown, tn ta sp) and a surprise card's (winkAnswer), in the same
// account's queue: every subject's answers go one way (quiz.js logAnswer).
const FAM = ['f:Damselfishes', 'f:Wrasses', 'f:Gobies', 'f:Blennies'];
function fishAnswers(SYNC) {
  const F = recorder(C.subjectOf('fish'), SYNC, {
    rankOf: () => 'family',
    unitName: n => n.slice(2),
    speciesShown: () => 'Chromis ternatensis'
  });
  F.recordAnswer({cur: 'quiz', mq: 'quiz', target: FAM[0], c: FAM[1], k: 4, chs: FAM, ph: ph('fi100200300'), tm: {rt: 3.1}, at: at(3)});
  F.logAnswer(F.winkAnswer('f:Groupers', 'f:Groupers', ['f:Groupers', ...FAM.slice(1)], {f: 'fi100200301'}, {rt: 2}));
  return F;
}

function storage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    key: i => [...m.keys()][i],
    get length() {
      return m.size;
    }
  };
}
// The device's sync code: sync.js as the page runs it, app.js's globals stubbed, talking to the in-memory sheet (as
// tests/adopt.test.js app). sheet: {get, post} (a loadCodeGs() sheet or a wrapper; a post answering an Error is a reply
// that never came). v: the script version every reply says (an older sheet); av: false, a page with no build stamp
// (appVer ''). seen: the device has seen that version in an earlier reply (sync.js SHEETV: the photo statistics at launch,
// an earlier save), else it knows none (sheetV: the floor). extra: globals replaced (rvOf: the rules this app knows).
const VERSION = vm.runInContext('VERSION', loadCodeGs().ctx);
function app({sheet, SYNC = null, P = {}, ls = {}, v, av = true, seen = true, extra = {}} = {}) {
  if (seen) ls = {'reefid-sheet-v': JSON.stringify(v === undefined ? VERSION : v), ...ls};
  const prog = read('progress.js'),
    appjs = read('app.js'),
    groups = /const GROUPS_KEY = [\s\S]*?\nconst subjOpen = .*\n/.exec(appjs)[0],
    loadData = /const loadData = [\s\S]*?;\n/.exec(prog)[0],
    progData = /const progData = [\s\S]*?\n};\n/.exec(prog)[0],
    sent = [],
    got = [];
  const answer = (u, o) => {
    const url = new URL(String(u)),
      body = o && o.body ? bodyOf(o.body) : null;
    sent.push(body || Object.fromEntries(url.searchParams));
    let j = body ? sheet.post(body) : sheet.get(Object.fromEntries(url.searchParams));
    if (j instanceof Error) return (got.push(j), Promise.reject(j));
    if (v !== undefined) j = {...j, v};
    got.push(j);
    return Promise.resolve({json: () => copy(j)});
  };
  const stamp = sel =>
    !av ? null : /^link/.test(sel) ? {href: 'https://x.test/app.js?v=abc1234'} : /^meta/.test(sel) ? {content: '900'} : null;
  const ctx = {
    ...C,
    console,
    crypto: require('crypto').webcrypto,
    localStorage: storage(ls),
    sessionStorage: storage(),
    location: {hash: '', reload() {}},
    hashNow: () => '',
    IS_ADMIN: false,
    showSubj() {},
    document: {
      addEventListener() {},
      getElementById: () => ({}),
      querySelector: stamp,
      querySelectorAll: () => [],
      visibilityState: 'visible'
    },
    window: {addEventListener() {}},
    navigator: {onLine: true, userAgent: 'Mozilla/5.0 (node test)'},
    setInterval: () => 0,
    setTimeout: () => 0,
    clearTimeout() {},
    ...require('./subj.stub.js')(),
    SYNC_URL: 'https://script.google.com/macros/s/test/exec',
    LOCAL: false,
    SYNC,
    DATA,
    P,
    PMEM: undefined,
    PCONF: {},
    PFMT: {},
    ACHK: 'reefid-sync-ach',
    sheetFetch: answer,
    fetch: answer,
    mxRecalc: f => f(),
    answersSoFar: () => 0,
    achMerge() {},
    route() {},
    slateGenera: () => [],
    scaleUnits: () => [],
    level: () => ['new'],
    progPct: () => 0,
    boardOn: () => true,
    BOARD: 'reefid-sync-board',
    boardT: () => 0,
    showBoardSet() {},
    INTRO: {KEY: 'reefid-sync-coral-intro', OFFER: {KEY: 'reefid-sync-coral-intro-offer'}},
    introMerge() {},
    introReset() {},
    startMerge() {},
    BASICS_KEY: 'reefid-basics',
    Q: {},
    saveQ() {},
    showBon() {},
    prog() {},
    ...extra
  };
  vm.createContext(ctx);
  vm.runInContext(
    `const store = {get(k, d) { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }, set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }, drop(k) { localStorage.removeItem(k); }, raw(k, t) { localStorage.setItem(k, t); }};
     const save = () => store.set('reefid-sync-coral-progress', P);\n` +
      loadData +
      progData +
      groups +
      read('sync.js') +
      '\nbindSync = () => {};\nthis.A = {syncPush, syncPull, rvApplied, sheetV, store};',
    ctx
  );
  return Object.assign(ctx.A, {ctx, sent, got});
}
const saves = A => A.sent.filter(b => Array.isArray(b.answers));
const answersTab = s => {
  const [H, ...R] = s.sheets.Answers.rows;
  return {H, R, byId: id => R.find(r => r[H.indexOf('Id')] === id)};
};
// What logAnswers_ writes in a field's column, from the entry sent: blank for a field the entry has none of.
const cellOf = (a, key) => (a[key] === undefined ? '' : key === 'sc' || key === 'rj' ? JSON.stringify(a[key]) : a[key]);
const cellIs = (cell, a, key) => (key === 't' ? new Date(cell).getTime() === Date.parse(a.t) : cell === cellOf(a, key));

test('the field table of docs/spec/answer.md names every key the producers build, every column the sheet writes, and what the replay reads', () => {
  const keys = FIELDS.map(f => f.key);
  assert.ok(keys.length >= 20, 'the table is read: ' + keys.join(' '));
  assert.strictEqual(new Set(keys).size, keys.length, 'a key once');
  // The Answers columns: the table's, and the two a send gives every row (the account's name, the device's id: Code.gs
  // logAnswers_ name, dev), in Code.gs LOG; none left out.
  eq([...FIELDS.map(f => f.col), 'Name', 'Device'].sort(), [...LOG].sort());
  // Code.gs logAnswers_ reads exactly the table's keys from an entry (the rest of an entry is never stored).
  const intake = whole(CODE, 'function logAnswers_(name, answers, seen0, dev){', 'Code.gs');
  eq([...new Set(intake.match(/\ba\.[a-z]+\b/g).map(x => x.slice(2)))].sort(), [...keys].sort());
  // The replay reads (core.js logRow, the device's own rows; Code.gs rowOf_ reads the same columns) the rows marked yes.
  const replayed = [
    ...new Set(
      C.logRow
        .toString()
        .match(/\ba\.[a-z]+\b/g)
        .map(x => x.slice(2))
    )
  ].sort();
  eq(
    replayed,
    FIELDS.filter(f => f.replayed)
      .map(f => f.key)
      .sort()
  );
  // The producers build only keys of the table, and between them every one (the fish answer gives tn, ta, sp).
  const SYNC = {name: 'Ana', pin: '1234', log: []};
  coralAnswers(recorder(CORAL(), SYNC));
  fishAnswers(SYNC);
  const built = new Set(SYNC.log.flatMap(a => Object.keys(a)));
  eq(
    [...built].filter(k => !keys.includes(k)),
    [],
    'keys outside the table'
  );
  eq(
    keys.filter(k => !built.has(k)),
    [],
    'keys these synthetic answers do not exercise'
  );
  // The fields a version gate trims (core.js logOut below every gate), named in the contract with their gates.
  const full = Object.assign({}, ...SYNC.log);
  const trimmed = Object.keys(full).filter(k => !(k in C.logOut(full, 0)));
  eq(trimmed.sort(), ['cv', 'pa']);
  for (const [k, g] of [
    ['pa', 'PA_SHEET'],
    ['cv', 'CV_SHEET']
  ])
    assert.ok(SPEC.includes('`' + k + '` from `' + g + '` (' + C[g] + ')'), `docs/spec/answer.md names ${k}'s gate ${g} ${C[g]}`);
});

test('one answer end to end: built, queued, sent, logged, replayed and adopted with the same fields and the same id', async () => {
  const s = loadCodeGs(withData()),
    SYNC = {name: 'Ana', pin: '1234', log: []},
    D = recorder(CORAL(), SYNC);
  coralAnswers(D);
  fishAnswers(SYNC);
  // Built and queued: each answer once, its attempt id made on the device (core.js answerId: 16 characters).
  const queue = copy(SYNC.log),
    ids = queue.map(a => a.id);
  assert.strictEqual(queue.length, 5);
  assert.strictEqual(new Set(ids).size, 5);
  ids.forEach(id => assert.match(id, /^[a-z0-9]{16}$/));
  queue.forEach(a => assert.match(a.cv, /^c[a-z0-9]{1,15}$/));
  const before = copy(D.P);
  // Sent: the save carries the queue as it is (this sheet is past every gate), the app's version, the rules version it
  // applied (0 on a new device) and the device's id.
  const A = app({sheet: s, SYNC, P: D.P});
  await A.syncPush();
  const [body] = saves(A);
  eq(body.answers, queue);
  assert.match(body.av, /^900-abc1234$/);
  assert.strictEqual(body.rv, 0);
  assert.match(body.dev, /^[a-z0-9]{8,16}$/);
  // Logged: one row per answer, each field in its column (the table), the account's name and the device's id in each.
  const {H, R, byId} = answersTab(s);
  eq(H, [...LOG]);
  assert.strictEqual(R.length, 5);
  for (const a of queue) {
    const r = byId(a.id);
    assert.ok(r, 'logged: ' + a.id);
    assert.strictEqual(r[H.indexOf('Name')], 'Ana');
    assert.strictEqual(r[H.indexOf('Device')], body.dev);
    for (const f of FIELDS) assert.ok(cellIs(r[H.indexOf(f.col)], a, f.key), `${a.m} ${f.key}: ${JSON.stringify(r[H.indexOf(f.col)])}`);
  }
  // Acknowledged: the reply says log, and the queue is empty.
  const reply = A.got.find(j => j && j.log);
  assert.strictEqual(reply.v, VERSION, 'every reply says the script version');
  eq(SYNC.log, []);
  // Replayed: the reply to a save that applied rules 0 carries the corals' replay under the sheet's rules version, over
  // the corals' answers only (the fish answer is the fish replay's, the surprise card nobody's), ids included.
  assert.strictEqual(reply.replay.rv, C.rvOf('coral'));
  assert.strictEqual(reply.replay.n, 3);
  eq([...reply.replay.ids].sort(), ids.slice(0, 3).sort());
  // Adopted (rule D9): the version marked applied, and the device's state is the replay's: every field the device's
  // record holds is the same after the adoption, no unit more or less; the adoption adds its marks (pm, rv) and the
  // time of the unit's last answer (at, model.js answeredAt, stubbed here).
  assert.strictEqual(A.rvApplied(), C.RV);
  eq(Object.keys(D.P).sort(), Object.keys(before).sort());
  // Lost: only u, the scorer's count of answers that moved a unit's bar, which the replay keeps for itself (core.js
  // replayedOf reads it, REPLAYED leaves it out; nothing on the device reads it). Added: the adoption's marks (pm, rv),
  // the time of the last answer (at: model.js answeredAt, stubbed here) and an empty photo record on a unit only named.
  for (const g of Object.keys(before)) {
    const lost = Object.keys(before[g]).filter(f => JSON.stringify(D.P[g][f]) !== JSON.stringify(before[g][f])),
      added = Object.keys(D.P[g]).filter(f => !(f in before[g]));
    eq(lost, 'u' in before[g] ? ['u'] : [], `${g}: fields changed by the adoption`);
    assert.ok(
      added.every(f => ['at', 'pm', 'rv', 'ps'].includes(f)),
      `${g}: added ${added}`
    );
    if (added.includes('ps')) eq(D.P[g].ps, {}, g);
  }
});

test('a resend after a lost reply is logged once; the acknowledgement drops from the queue only what that send carried', async () => {
  const s = loadCodeGs(withData()),
    SYNC = {name: 'Ana', pin: '1234', log: []},
    D = recorder(CORAL(), SYNC);
  coralAnswers(D);
  const first = SYNC.log.map(a => a.id);
  // The sheet logs the first save, its reply never comes; the next answer is given while the resend is on its way.
  let lose = true,
    during = null;
  const sheet = {
    get: q => s.get(q),
    post: b => {
      const r = s.post(b);
      if (during) (during(), (during = null));
      if (lose && b.answers) return ((lose = false), new Error('reply lost'));
      return r;
    }
  };
  const A = app({sheet, SYNC, P: D.P});
  await A.syncPush();
  assert.strictEqual(answersTab(s).R.length, 3, 'logged');
  eq(
    SYNC.log.map(a => a.id),
    first,
    'kept: the device does not know'
  );
  // The resend's reply acknowledges what it carried: the answer given meanwhile stays queued, and goes with the next save
  // (here at once: the reply brought the replay the device asked for, adopted, then saved again).
  during = () => D.recordAnswer({...CORAL_Q[0], at: at(9)});
  await A.syncPush();
  const [, resend, next] = saves(A);
  eq(
    resend.answers.map(a => a.id),
    first,
    'sent again as they are'
  );
  assert.strictEqual(next.answers.length, 1);
  const x = next.answers[0];
  assert.ok(!first.includes(x.id), 'the answer given during the resend, in the save after it');
  eq(
    answersTab(s).R.map(r => r[7]),
    [...first, x.id],
    'nothing logged twice'
  );
  eq(SYNC.log, []);
  // An id twice in one send, an id sent again by an anonymous send of the same device: logged once (Code.gs newIds_).
  const y = {...x, id: C.answerId()};
  assert.ok(s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [y, y], av: '900-x'}).log);
  assert.ok(s.post({anon: 'abcdefghij', anonAnswers: [x, y], av: '900-x'}).log);
  const {R, H} = answersTab(s);
  assert.strictEqual(R.length, 5);
  assert.strictEqual(R.filter(r => r[H.indexOf('Id')] === y.id).length, 1);
  assert.strictEqual(R.filter(r => r[H.indexOf('Name')] === '~anon abcdefghij').length, 0);
});

test('an older sheet: the copy sent leaves out the fields above its version, the queue keeps them; the script keeps only the fields it knows', async () => {
  for (const [v, out] of [
    [C.CV_SHEET - 1, ['cv']],
    [C.PA_SHEET - 1, ['cv', 'pa']]
  ]) {
    const s = loadCodeGs(withData()),
      SYNC = {name: 'Ana', pin: '1234', log: []};
    coralAnswers(recorder(CORAL(), SYNC));
    const queue = copy(SYNC.log),
      A = app({sheet: s, SYNC, v});
    await A.syncPush();
    assert.strictEqual(A.sheetV(), Math.max(v, C.SHEET_FLOOR));
    const [body] = saves(A);
    const drop = a => Object.fromEntries(Object.entries(a).filter(([k]) => !out.includes(k)));
    eq(body.answers, queue.map(drop), `v ${v}`);
    assert.ok(queue.some(a => a.pa) && queue.every(a => a.cv), 'the queue held them until the sheet confirmed');
    const {H, byId} = answersTab(s);
    for (const a of queue) {
      assert.strictEqual(byId(a.id)[H.indexOf('Content version')], '');
      assert.strictEqual(byId(a.id)[H.indexOf('Photo answered')], out.includes('pa') ? '' : a.pa || '');
    }
  }
  // A field this script does not know (an app ahead of it), and one its scoring record does not: the same row as without.
  const SYNC = {name: 'Ana', pin: '1234', log: []};
  coralAnswers(recorder(CORAL(), SYNC));
  const [a] = SYNC.log,
    row = e => {
      const s = loadCodeGs();
      s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [e], av: '900-x'});
      return answersTab(s).byId(a.id);
    };
  eq(row({...a, zz: 'later', sc: {...a.sc, q9: 1}}), row(a));
});

test('a device that sends no av: its answers are logged as any; the sheet notes an old app; no rv, no replay', () => {
  const SYNC = {name: 'Ana', pin: '1234', log: []};
  coralAnswers(recorder(CORAL(), SYNC));
  const [a, b, c] = SYNC.log,
    s = loadCodeGs(withData()),
    olds = () => (s.sheets.Events ? s.sheets.Events.rows.slice(1).filter(r => r[2] === 'old') : []).map(r => r[3]);
  // A save and an anonymous send as an app before 2026-11-03 makes them: no av, no rv.
  const j = s.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': '{}'}, summary: {}, answers: [a]});
  assert.ok(j.ok && j.log);
  assert.ok(!('replay' in j), 'an app that says no rules version cannot adopt a replay: none');
  assert.ok(s.post({anon: 'abcdefghij', anonAnswers: [b]}).log);
  const {H, byId} = answersTab(s);
  for (const x of [a, b]) for (const f of FIELDS) assert.ok(cellIs(byId(x.id)[H.indexOf(f.col)], x, f.key), `${f.key}`);
  assert.strictEqual(byId(b.id)[0], '~anon abcdefghij');
  eq(olds(), ['app before 2026-11-03: save (Ana)', 'app before 2026-11-03: anonymous answers (~anon abcdefghij)']);
  // With a rules version and still no av: the replay comes (av is not read by the intake or the replay).
  const k = s.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': '{}'}, summary: {}, answers: [c], rv: 0});
  assert.strictEqual(k.replay.rv, C.rvOf('coral'));
  assert.strictEqual(k.replay.n, 2, "the name's two coral answers (the anonymous one is the device's)");
});

test('a long-offline queue reaches a newer sheet: logged once in its own time, replayed in time order, adopted only under rules this app knows', async () => {
  // Device B logs three answers first; device A, offline, had answered three before them (an earlier t).
  const s = loadCodeGs(withData()),
    late = loadCodeGs(withData()),
    QA = {name: 'Ana', pin: '1234', log: []},
    QB = {name: 'Ana', pin: '1234', log: []},
    DA = recorder(CORAL(), QA),
    DB = recorder(CORAL(), QB);
  coralAnswers(DA, 0);
  coralAnswers(DB, 30);
  const offline = copy(QA.log),
    online = copy(QB.log),
    save = (sh, L) => sh.post({name: 'Ana', pin: '1234', data: {'reefid-sync-coral-progress': '{}'}, summary: {}, answers: L, av: '900-x'});
  assert.ok(save(s, online).log);
  // A's app knows one rules version less than the sheet replays with (a sheet updated while A was away).
  const behind = id => C.rvOf(id) - 1,
    A = app({sheet: s, SYNC: QA, P: DA.P, extra: {rvOf: behind}});
  await A.syncPush();
  const {H, R} = answersTab(s);
  eq(
    R.map(r => r[H.indexOf('Id')]),
    [...online, ...offline].map(a => a.id),
    'each once, after the rows already there'
  );
  R.slice(3).forEach((r, i) => assert.strictEqual(new Date(r[1]).getTime(), Date.parse(offline[i].t), 'its own time, not the send'));
  eq(QA.log, [], 'acknowledged');
  const reply = A.got.find(j => j && j.log && j.replay);
  assert.strictEqual(reply.replay.rv, C.rvOf('coral'));
  assert.strictEqual(A.rvApplied(), 0, 'rules newer than the app knows: not adopted, not marked applied');
  // The replay is in time order whatever order the answers reached the tab: the same as a tab that got them in order.
  save(late, offline);
  save(late, online);
  const load = sh => sh.get({name: 'Ana', pin: '1234', rv: '0', av: '900-x'}).replay;
  eq(load(s).rec, load(late).rec);
  assert.strictEqual(load(s).n, 6);
  // The same device once its app knows the sheet's rules: adopted, the log's six answers its state (rule D9).
  const A2 = app({sheet: s, SYNC: QA, P: DA.P});
  await A2.syncPush();
  assert.strictEqual(A2.rvApplied(), C.RV);
  const n = g => (DA.P[g].ok || 0) + (DA.P[g].ko || 0);
  eq(['Acropora', 'Porites', 'Pocillopora'].map(n), [2, 2, 2]);
});

test('GAP: a queue past 2,000 answers drops its oldest, never sent (quiz.js logAnswer; the offline guarantee is open)', () => {
  const SYNC = {name: 'Ana', pin: '1234', log: []},
    D = recorder(CORAL(), SYNC);
  for (let i = 0; i < 2001; i++) D.logAnswer({id: 'q' + i, t: at(i), g: 'Acropora', a: 'Acropora', ok: 1, m: 'quiz'});
  assert.strictEqual(SYNC.log.length, 2000);
  assert.strictEqual(SYNC.log[0].id, 'q1', 'q0 is gone from the device before the sheet had it');
});

test('GAP: a save before the device has seen any reply say its version leaves out pa and cv for good, though the sheet stores them', async () => {
  // A new device whose photo statistics' reply (sync.js loadStats, sheetSeen) has not come: sheetV is the floor, and the
  // load before the save is not read for the version. The acknowledgement then drops the entries that held them.
  const s = loadCodeGs(withData()),
    SYNC = {name: 'Ana', pin: '1234', log: []};
  coralAnswers(recorder(CORAL(), SYNC));
  const queue = copy(SYNC.log),
    A = app({sheet: s, SYNC, seen: false});
  await A.syncPush();
  const [body] = saves(A);
  assert.ok(
    body.answers.every(a => !('cv' in a) && !('pa' in a)),
    'trimmed at the floor'
  );
  assert.ok(queue.some(a => a.pa) && queue.every(a => a.cv));
  eq(SYNC.log, [], 'acknowledged: the queue held the only copy');
  const {H, R} = answersTab(s);
  eq(
    R.map(r => [r[H.indexOf('Photo answered')], r[H.indexOf('Content version')]]),
    queue.map(() => ['', ''])
  );
  assert.strictEqual(A.sheetV(), VERSION, 'the save reply teaches the version, too late for these');
});

test('GAP: an answer whose id the sheet refuses is acknowledged, leaves the queue and is never logged', async () => {
  const s = loadCodeGs(withData()),
    SYNC = {name: 'Ana', pin: '1234', log: []};
  coralAnswers(recorder(CORAL(), SYNC));
  const [a, b, c] = SYNC.log;
  SYNC.log = [a, {...b, id: 'Not-An-Id'}, (({id, ...x}) => x)(c)];
  const A = app({sheet: s, SYNC});
  await A.syncPush();
  eq(SYNC.log, [], 'all three dropped from the queue');
  eq(
    answersTab(s).R.map(r => r[7]),
    [a.id],
    'only the one with a valid id logged'
  );
});

test('GAP: the replay counts a row twice when the log holds its id twice (only the intake keeps ids unique)', () => {
  const SYNC = {name: 'Ana', pin: '1234', log: []};
  coralAnswers(recorder(CORAL(), SYNC));
  const row = C.logRow(SYNC.log[0], 'me'),
    once = C.replayProgress([row], {gen: DATA.gen}).me.P.Acropora,
    twice = C.replayProgress([row, [...row]], {gen: DATA.gen}).me.P.Acropora;
  assert.strictEqual(once.ok, 1);
  assert.strictEqual(twice.ok, 2);
});

test('GAP: tests/anslog.js writes an Answered the sheet never writes ("I don\'t know"; logAnswers_ writes it blank)', () => {
  const rows = synthLog(3000, 1),
    i = LOG.indexOf('Answered');
  assert.ok(
    rows.some(r => r[i] === "I don't know"),
    'the fixture writes it'
  );
  const SYNC = {name: 'Ana', pin: '1234', log: []};
  coralAnswers(recorder(CORAL(), SYNC));
  const s = loadCodeGs(),
    a = {...SYNC.log[2], a: "I don't know"};
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [a], av: '900-x'});
  assert.strictEqual(answersTab(s).byId(a.id)[i], '');
});
