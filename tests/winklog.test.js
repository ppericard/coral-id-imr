// A surprise card's answer (quiz.js winkShow, winkAnswer; Pierre, 2026-11-08: "il faut l'enregistrer bien sûr") is
// logged like every other answer, marked by its mode (core.js WINK_MODE), and no reader of the log counts it: the app's
// own readers of its queue, core.js subjRows / subjEntries (the admin's pages, the analyses, the evaluation tools), the
// sheet's readers (Code.gs replayed_: hold, replay, photo ratings, confusions, the player list; answers_: readAnswers;
// the Activity tab), and the admin's rows of every subject (ANS.all).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');
const C = require('../core.js');
const {loadCodeGs} = require('./gas.js');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const quiz = read('quiz.js');
const WALE = 'f:WhaleSharks';
const TOK = 'ghp_write000000000000000000';

// quiz.js's winkAnswer and logAnswer on stubs: the fish subject, the device's storage, signed in (SYNC) or not.
function page({signedIn = false} = {}) {
  const saved = {},
    ctx = {
      SUBJ: C.subjectOf('fish'),
      WINK_MODE: C.WINK_MODE,
      renamedId: C.renamedId,
      rankOf: () => '',
      unitName: n => ({[WALE]: 'Whale Sharks', 'f:Damselfishes': 'Damselfishes'})[n] || '',
      speciesShown: L => (L.length ? 'Rhincodon typus' : ''),
      SYNC: signedIn ? {name: 'P1', log: []} : null,
      SYNC_URL: 'https://example.invalid/exec', // never fetched: logAnswer only queues
      LOG0: 'reefid-log0',
      ANONQ: 'reefid-anonq',
      anon: 0,
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))}
    };
  ctx.anonSoon = () => ctx.anon++;
  vm.createContext(ctx);
  vm.runInContext(
    cut(quiz, 'function logAnswer(', '\n}\n', {file: 'quiz.js', through: 1}) +
      cut(quiz, 'function winkAnswer(', '\n}\n', {file: 'quiz.js', through: 1}) +
      '\nthis.M = {logAnswer, winkAnswer};',
    ctx
  );
  return {ctx, saved, ...ctx.M};
}
const PH = {f: 'fish-s400-cand-452166632'};
const CH = [WALE, 't01', 't20', 't46'];

test('a wink answer: one entry, marked, with what was shown and answered, nothing scored', () => {
  const pg = page(),
    a = pg.winkAnswer(WALE, 't01', CH, PH, {rt: 3.4, zm: 1});
  assert.strictEqual(a.m, 'wink');
  assert.strictEqual(a.m, C.WINK_MODE);
  assert.strictEqual(a.g, WALE);
  assert.strictEqual(a.a, 'f:Damselfishes', 'the absurd choice t01 under its family id (core.js renamedId)');
  assert.strictEqual(a.ok, 0);
  assert.strictEqual(a.ph, PH.f);
  assert.strictEqual(a.ch, CH.map(x => C.renamedId(C.subjectOf('fish'), x)).join(' '));
  assert.ok(!a.ch.split(' ').some(x => /^t\d/.test(x)), 'no old entry id: ' + a.ch);
  assert.strictEqual(a.s, 'fish');
  assert.strictEqual(a.rk, C.subjectOf('fish').rank);
  assert.strictEqual(a.tn, 'Whale Sharks');
  assert.strictEqual(a.ta, 'Damselfishes');
  assert.strictEqual(a.sp, 'Rhincodon typus');
  assert.strictEqual(a.rt, 3.4);
  assert.strictEqual(a.zm, 1);
  assert.strictEqual(typeof a.tz, 'number');
  assert.match(a.id, /^[a-z0-9]+$/);
  for (const k of ['e', 'th', 'nw', 'sc', 'ty', 'tr']) assert.ok(!(k in a), `nothing scored: no ${k}`);
  assert.strictEqual(pg.winkAnswer(WALE, WALE, CH, PH, {rt: null, zm: 0}).ok, 1, 'the right one');
  assert.ok(!('rt' in pg.winkAnswer(WALE, WALE, CH, PH, {rt: null, zm: 0})), 'no seconds when the photo never came in');
});

test('a wink answer takes the normal answer path: the account queue, or LOG0 and the anonymous queue', () => {
  const out = page(),
    a0 = out.winkAnswer(WALE, WALE, CH, PH, {rt: 2, zm: 0}),
    a = JSON.parse(JSON.stringify(a0)); // as stored (a UTC device's offset -0 is 0)
  out.logAnswer(a0);
  assert.deepStrictEqual(JSON.parse(out.saved['reefid-log0']), [a]);
  assert.deepStrictEqual(JSON.parse(out.saved['reefid-anonq']), [a]);
  assert.strictEqual(out.ctx.anon, 1, 'the anonymous send is planned');
  const inn = page({signedIn: true}),
    b = inn.winkAnswer(WALE, 't20', CH, PH, {rt: 2, zm: 0});
  inn.logAnswer(b);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(inn.ctx.SYNC.log)), [JSON.parse(JSON.stringify(b))]);
  assert.strictEqual(inn.saved['reefid-log0'], undefined);
  // The game's answers go the same way (quiz.js answer), and winkShow logs its answer once, at the choice.
  assert.match(cut(quiz, 'function answer(', '\nfunction ', {file: 'quiz.js'}), /\n {2}logAnswer\(ans\);\n/);
  const show = cut(quiz, 'function winkShow(', '\n}\n', {file: 'quiz.js', through: 1});
  assert.strictEqual(show.match(/logAnswer\(/g).length, 1);
  assert.match(
    show,
    /if \(done\) return;\n\s+done = true;\n\s+const good = id === n;\n\s+const tm = \{rt: qclockRead\(\), zm: QCLOCK\.zm\},\n\s+ids = ch\.map\(\(\[x\]\) => x\);\n\s+logAnswer\(winkAnswer\(/,
    'after the once-only guard'
  );
});

test('core: the marker, the subject readers and the send gate', () => {
  const wk = {s: 'fish', m: 'wink', g: WALE},
    fq = {s: 'fish', m: 'quiz', g: 'f:Damselfishes'},
    cq = {m: 'quiz', g: 'Acropora'};
  assert.strictEqual(C.winkEntry(wk), true);
  assert.strictEqual(C.winkEntry(fq), false);
  assert.strictEqual(C.winkEntry(null), false);
  // Answer-log rows: the mode at index LOG_MODE (5) in the sheet's readAnswers rows, its tab rows and logRow's.
  const row = a => Object.assign(C.logRow(a, 'p1'), {[C.LOG_SUBJ]: a.s || ''}); // the subject as readAnswers gives it
  assert.strictEqual(C.LOG_MODE, 5);
  assert.strictEqual(row(wk)[C.LOG_MODE], 'wink');
  assert.strictEqual(C.winkRow(row(wk)), true);
  assert.strictEqual(C.winkRow(row(fq)), false);
  assert.deepStrictEqual(C.subjEntries([wk, fq, cq], 'fish'), [fq], 'never in its subject');
  assert.deepStrictEqual(C.subjEntries([{...wk, s: ''}, cq]), [cq], 'never in the replayed one either');
  assert.deepStrictEqual(C.subjRows([wk, fq, cq].map(row), 'fish'), [row(fq)]);
  assert.deepStrictEqual(C.subjRows([{...wk, s: ''}, cq].map(row)), [row(cq)]);
  // Sent only to a sheet whose readers leave it out (rule D4), whatever else the sheet takes.
  assert.strictEqual(C.WINK_SHEET, 98);
  assert.strictEqual(C.logOk(wk, 97), false);
  assert.strictEqual(C.logOk(wk, undefined), false);
  assert.strictEqual(C.logOk(wk, 98), true);
  assert.strictEqual(C.logOk(cq, 0), true, 'the other answers as before');
  assert.strictEqual(C.logOk(fq, 60), true);
  assert.strictEqual(C.logOk(fq, 59), false);
  const SV = Number(/const VERSION = (\d+);/.exec(read('tools/sync/Code.gs'))[1]);
  assert.ok(SV >= C.WINK_SHEET, 'the script that leaves them out is the one in the repository');
});

// The sheet: the same player's answers with and without a surprise card's, which every reader must give alike. The
// wink is put in the corals too (an answer with no subject is a coral one), so the mode alone has to keep it out.
const coral = (id, g, a, ph, t) => ({id, t, g, a, ok: g === a ? 1 : 0, m: 'quiz', ph, ch: 'Acropora Montipora Porites Favia', e: 0.6});
const GAME = Array.from({length: 14}, (_, i) =>
  coral(
    'q' + i,
    ['Acropora', 'Montipora', 'Porites'][i % 3],
    i % 4 ? ['Acropora', 'Montipora', 'Porites'][i % 3] : 'Favia',
    `pic-${i % 5}`,
    `2026-11-01T00:${String(10 + i)}:00Z`
  )
);
const WINKS = [
  {
    id: 'w1',
    t: '2026-11-01T00:30:00Z',
    g: WALE,
    a: 'f:Damselfishes',
    ok: 0,
    m: 'wink',
    ph: 'pic-1',
    ch: `${WALE} f:Damselfishes`,
    s: 'fish'
  },
  {id: 'w2', t: '2026-11-01T00:31:00Z', g: 'Acropora', a: 'Montipora', ok: 0, m: 'wink', ph: 'pic-0', ch: 'Acropora Montipora'}
];
function sheet(winks) {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [...GAME.slice(0, 7), ...(winks ? WINKS : [])]});
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: GAME.slice(7), at: 1});
  s.post({anon: 'device0001', anonAnswers: winks ? [{...WINKS[0], id: 'w3'}] : []});
  return s;
}

test('the sheet logs a wink answer as one Answers row, Mode wink', () => {
  const s = sheet(true),
    tab = s.sheets.Answers.rows,
    head = tab[0],
    col = n => head.indexOf(n),
    w = tab.filter(r => r[col('Mode')] === 'wink');
  assert.strictEqual(w.length, 3);
  const [r] = w;
  assert.strictEqual(r[col('Name')], 'Ana');
  assert.strictEqual(r[col('Genus shown')], WALE);
  assert.strictEqual(r[col('Answered')], 'f:Damselfishes');
  assert.strictEqual(r[col('Right')], 0);
  assert.strictEqual(r[col('Photos')], 'pic-1');
  assert.strictEqual(r[col('Id')], 'w1');
  assert.strictEqual(r[col('Subject')], 'fish');
  assert.strictEqual(r[col('Expected')], '', 'nothing scored');
  assert.strictEqual(r[col('Scoring')], '');
  // Sent again after a lost reply: not logged twice.
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [WINKS[0]], at: 2});
  assert.strictEqual(s.sheets.Answers.rows.filter(x => x[col('Id')] === 'w1').length, 1);
});

test("no reader of the sheet counts it: readAnswers, the player list, photo ratings, confusions, hold, the replay's rows", () => {
  const a = sheet(false),
    b = sheet(true),
    run = (s, x) => vm.runInContext(x, s.ctx);
  assert.strictEqual(b.sheets.Answers.getLastRow(), a.sheets.Answers.getLastRow() + 3, 'logged');
  // readAnswers (answers_): served to no admin page, analysis or tool.
  const ra = b.post({readAnswers: 1, token: TOK}).rows;
  assert.ok(!ra.some(r => C.winkRow(r) || ['w1', 'w2', 'w3'].includes(r[7])));
  assert.deepStrictEqual(
    ra.map(r => r.slice(1)),
    a.post({readAnswers: 1, token: TOK}).rows.map(r => r.slice(1))
  );
  // The rows the hold, the replay, the photo ratings and the confusions read (answerRows_ through replayed_).
  assert.strictEqual(run(b, 'answerRows_().length'), run(a, 'answerRows_().length'));
  assert.strictEqual(run(b, "replayed_(['Ana', new Date(), 'Acropora', 'Montipora', 0, 'wink'])"), false);
  // Photo ratings and confusions, public and admin.
  assert.deepStrictEqual(b.get({stats: '1'}), a.get({stats: '1'}));
  const sa = a.post({readStats: 1, token: TOK}),
    sb = b.post({readStats: 1, token: TOK});
  assert.deepStrictEqual(Object.values(sb.ras), Object.values(sa.ras));
  assert.deepStrictEqual(sb.photos, sa.photos);
  // The opening hold in a load reply.
  assert.deepStrictEqual(b.get({name: 'Ana', pin: '1234'}).hold, a.get({name: 'Ana', pin: '1234'}).hold);
  // The player list: answers, right, days, modes, mix-ups, recent, photo exposure.
  const ua = a.post({users: 1, token: TOK}).users.find(u => u.name === 'Ana'),
    ub = b.post({users: 1, token: TOK}).users.find(u => u.name === 'Ana');
  for (const k of ['answers', 'right', 'first', 'last', 'days', 'modes', 'recent', 'mix', 'ex']) assert.deepStrictEqual(ub[k], ua[k], k);
  assert.ok(!('wink' in ub.modes));
  // Deleting the account takes its wink rows too (rule D7).
  assert.strictEqual(b.post({userDelete: 'Ana', all: 1, token: TOK}).ok, true);
  assert.ok(!b.sheets.Answers.rows.slice(1).some(r => r[0] === 'Ana'));
});

test('the Activity tab counts no wink answer: its formula leaves them out, the old one replaced once, a hand edit kept', () => {
  const s = loadCodeGs(),
    run = x => vm.runInContext(x, s.ctx),
    f = () => s.sheets.Activity.rows[0][0].formula;
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [GAME[0]]});
  assert.strictEqual(f(), run('ACTIVITY'), 'a new tab: the formula without them');
  assert.match(
    f(),
    /^=QUERY\(Answers!A:F, "select A, count\(E\), sum\(E\), max\(B\) where A is not null and \(F is null or F <> 'wink'\) group by A/
  );
  // A tab made before v98 keeps its formula until a wink answer comes, then takes the new one.
  s.sheets.Activity.rows[0][0] = {formula: run('ACTIVITY_V1')};
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [GAME[1]], at: 1});
  assert.strictEqual(f(), run('ACTIVITY_V1'), 'no wink: untouched');
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [WINKS[0]], at: 2});
  assert.strictEqual(f(), run('ACTIVITY'), 'replaced at the first wink answer');
  // A formula Pierre wrote himself is his.
  s.sheets.Activity.rows[0][0] = {formula: '=QUERY(Answers!A:B, "select A")'};
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [{...WINKS[0], id: 'w9'}], at: 3});
  assert.strictEqual(f(), '=QUERY(Answers!A:B, "select A")');
});

test("the app's and the admin's other readers of the raw log leave it out", () => {
  // The admin: ANS.all (every subject's rows: last answer, anonymous devices' counts) and ANS.rows (core.js subjRows).
  assert.match(read('admin.js'), /ANS\.all = ANS\.rows\.filter\(r => !winkRow\(r\)\);\n\s+ANS\.rows = subjRows\(ANS\.all\);/);
  // The app: the "answers waiting" count, the "the N answers played on this device" note, the tips' seed counts.
  assert.match(read('app.js'), /const n = \(SYNC\.log \|\| \[\]\)\.filter\(a => !winkEntry\(a\)\)\.length;/);
  assert.match(read('sync.js'), /mine = store\.get\(LOG0, \[\]\)\.filter\(a => !winkEntry\(a\)\)\.length;/);
  assert.match(quiz, /seed = \(\(SYNC && SYNC\.log\) \|\| store\.get\(LOG0, \[\]\)\)\.filter\(a => !winkEntry\(a\)\);/);
  // The evaluation tools read the log through core.js subjRows (tools/abilityeval.js normalise, used by the others).
  const {normalise} = require('../tools/abilityeval.js');
  const rows = [
    ['p1', 1, 'Acropora', 'Acropora', 1, 'quiz', 'pic-1'],
    ['p1', 2, 'Acropora', 'Montipora', 0, 'wink', 'pic-1']
  ];
  assert.strictEqual(normalise(rows).length, 1);
  for (const f of ['tools/analyses.js', 'tools/fallbackeval.js', 'tools/memreplay.js', 'tools/realcheck.js', 'tools/rtprep.js'])
    assert.match(read(f), /C\.subjRows\(/, f);
});
