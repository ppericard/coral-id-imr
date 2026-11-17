require('./slot.js').testGuard();
// A Find the X's photo tapped in the log (Pierre, 2026-11-15, Q371: "ok pour A"): the Answers tab's last column, Photo
// answered, holds the file stem of the photo the player tapped (quiz.js answer pa), so the species taken for another
// family can be read from it (fish-game.json); checked as Photos; blank for any other answer and the rows logged
// before; sent only from PA_SHEET (core.js logOut, sync.js, rule D4); information only: no score, replay or reader
// reads it. Every check runs on the in-memory sheet (tests/gas.js, rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const {loadCodeGs} = require('./gas.js');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const TOK = 'ghp_write000000000000000000';
const FAM = ['f:Damselfishes', 'f:Angelfishes', 'f:Butterflyfishes', 'f:Wrasses'];
// A fish Find the X answer as quiz.js answer logs it: the unit's own tile in ph, the four units in ch, the unit of the
// photo tapped in a, the photo tapped in pa.
const fx = (id, extra = {}) => {
  const i = Number(id.slice(1)),
    a = FAM[i % 4];
  return {
    id,
    t: `2026-11-15T01:${String(10 + i).padStart(2, '0')}:00Z`,
    g: FAM[0],
    a,
    ok: a === FAM[0] ? 1 : 0,
    m: 'quiz|f',
    ph: 'fi100',
    ch: FAM.join(' '),
    e: 0.5,
    s: 'fish',
    rk: 'family',
    pa: a === FAM[0] ? 'fi100' : 'fi' + (200 + i),
    ...extra
  };
};
const quiz = (id, extra = {}) => ({...fx(id), m: 'quiz', ch: FAM.join(' '), ...extra, pa: undefined});
const save = (s, name, L, extra = {}) => s.post({name, pin: '1234', data: {}, summary: {}, answers: L, ...extra});
const col = s => s.sheets.Answers.rows[0].indexOf('Photo answered');
const pas = s => s.sheets.Answers.rows.slice(1).map(r => [r[7], r[col(s)] ?? '']);

test('Code.gs: Photo answered is the last Answers column, after Device; every column before it stays where it was', () => {
  const s = loadCodeGs();
  save(s, 'Ana', [fx('a1')]);
  const H = s.sheets.Answers.rows[0],
    LOG = vm.runInContext('LOG', s.ctx);
  assert.deepStrictEqual([...H], [...LOG]);
  assert.strictEqual(H.at(-1), 'Photo answered');
  assert.strictEqual(H.length, 26);
  assert.strictEqual(H[24], 'Device');
  assert.strictEqual(LOG.indexOf('Photos'), 6, 'Photos never moves');
});

test("Code.gs: a Find the X answer stores the photo tapped, a save's and an anonymous send's alike, right answers too", () => {
  const s = loadCodeGs();
  assert.strictEqual(save(s, 'Ana', [fx('a1'), fx('a4')]).ok, true);
  assert.ok(s.post({anon: 'abcdefghij', anonAnswers: [fx('a2'), fx('a3')], av: '1-x'}).log);
  assert.deepStrictEqual(pas(s), [
    ['a1', 'fi201'],
    ['a4', 'fi100'],
    ['a2', 'fi202'],
    ['a3', 'fi203']
  ]);
  // The rest of the row as before: the unit of the photo tapped in Answered, the unit's own photo in Photos.
  const R = s.sheets.Answers.rows,
    H = R[0],
    r = R[1];
  assert.deepStrictEqual(
    [r[H.indexOf('Answered')], r[H.indexOf('Photos')], r[H.indexOf('Mode')], r[H.indexOf('Subject')]],
    ['f:Angelfishes', 'fi100', 'quiz|f', 'fish']
  );
  // A sign-in later: the anonymous rows become the name's and keep their photo tapped.
  save(s, 'Ben', [fx('a5')], {anon: 'abcdefghij'});
  assert.deepStrictEqual(
    pas(s).filter(([id]) => ['a2', 'a3', 'a5'].includes(id)),
    [
      ['a2', 'fi202'],
      ['a3', 'fi203'],
      ['a5', 'fi205']
    ]
  );
  assert.ok(s.sheets.Answers.rows.slice(1).every(x => x[0] !== '~anon abcdefghij'));
});

test('Code.gs: a malformed photo tapped is blank, never a formula; an overlong one is cut to 400 as Photos', () => {
  const s = loadCodeGs();
  const bad = ['=SUM(A1)', '+fi1', 'fi1;fi2', 'fi1\nfi2', 'fi<1>', '__proto__', 'constructor', {f: 'fi1'}, 12345, null, ''];
  bad.forEach((pa, i) => assert.strictEqual(save(s, 'Ana', [fx('b' + i, {pa})]).ok, true, String(pa)));
  const long = 'fi' + '9'.repeat(500);
  save(s, 'Ana', [fx('c1', {pa: long})]);
  const got = pas(s).map(r => r[1]);
  assert.deepStrictEqual(
    got.slice(0, bad.length),
    bad.map(x => (x === 12345 ? '12345' : '')),
    'blank (a number reads as its digits, as Photos)'
  );
  assert.strictEqual(got.at(-1), long.slice(0, 400));
  assert.ok(!s.sheets.Answers.rows.flat().some(v => v && typeof v === 'object' && v.formula), 'no formula anywhere');
});

test('Code.gs: any other answer and an app before it log it blank; a tab made before reads its older rows unchanged', () => {
  const s = loadCodeGs();
  save(s, 'Ana', [quiz('a0'), {...fx('a1'), pa: undefined}, {...fx('a2'), m: 'quiz', pa: undefined}]);
  assert.deepStrictEqual(
    pas(s).map(r => r[1]),
    ['', '', '']
  );
  // A tab made before the column (25 columns, Device last): the next answer adds its header, the older rows read blank,
  // every value they held where it was.
  const t = loadCodeGs();
  save(t, 'Ana', [fx('a1'), quiz('a2')]);
  const A = t.sheets.Answers.rows;
  A.forEach(r => (r.length = 25));
  const before = A.slice(1).map(r => [...r]),
    rows0 = t.post({readAnswers: 1, token: TOK}).rows;
  save(t, 'Ana', [fx('a3')]);
  assert.strictEqual(A[0][25], 'Photo answered');
  assert.deepStrictEqual(
    A.slice(1, 3).map(r => r.slice(0, 25)),
    before
  );
  assert.deepStrictEqual(
    pas(t).map(r => r[1]),
    ['', '', 'fi203']
  );
  assert.deepStrictEqual(t.post({readAnswers: 1, token: TOK}).rows.slice(0, 2), rows0, 'the older rows read as before');
});

test('Code.gs: information only: no reader serves it, nothing the script computes changes with it', () => {
  const sheet = withPa => {
    const s = loadCodeGs(),
      L = Array.from({length: 12}, (_, i) => fx('a' + i)).map(a => (withPa ? a : {...a, pa: undefined}));
    save(s, 'Ana', L.slice(0, 8));
    s.post({anon: 'abcdefghij', anonAnswers: L.slice(8)});
    return s;
  };
  const a = sheet(false),
    b = sheet(true);
  assert.ok(pas(b).every(r => r[1]) && pas(a).every(r => !r[1]));
  const ra = a.post({readAnswers: 1, token: TOK}).rows,
    rb = b.post({readAnswers: 1, token: TOK}).rows;
  assert.deepStrictEqual(
    rb.map(r => r.slice(1)),
    ra.map(r => r.slice(1))
  );
  assert.ok(!JSON.stringify(rb).includes('fi201'), 'readAnswers serves no photo tapped');
  assert.deepStrictEqual(b.get({stats: '1', s: 'fish'}), a.get({stats: '1', s: 'fish'}));
  assert.deepStrictEqual(b.get({name: 'Ana', pin: '1234'}).hold, a.get({name: 'Ana', pin: '1234'}).hold);
  const ua = a.post({users: 1, token: TOK}).users[0],
    ub = b.post({users: 1, token: TOK}).users[0];
  for (const k of ['answers', 'right', 'days', 'modes', 'recent', 'mix']) assert.deepStrictEqual(ub[k], ua[k], k);
  // The replay reads the log through core.js logRow, which carries no photo tapped: the same rows, the same state.
  const L = Array.from({length: 12}, (_, i) => fx('a' + i));
  assert.deepStrictEqual(
    L.map(x => C.logRow(x, 'me')),
    L.map(x => C.logRow({...x, pa: undefined}, 'me'))
  );
});

test('the app: quiz.js logs the tile tapped as pa, only for a Find the X; sync.js sends every answer through logOut', () => {
  const quiz = read('quiz.js'),
    sync = read('sync.js');
  // go(): the photo of the tile whose unit was given (the four units are distinct), null for any other question.
  assert.ok(quiz.includes('const tap = fx ? (fx.find(x => x.n === c) || {}).p : null;'));
  assert.ok(/answer\(cur, c, target, [^\n]*, tm, tap\);/.test(quiz));
  assert.ok(quiz.includes('function answer(cur, c, target, ph, cor, unseen, tm = {}, tap = null) {'));
  assert.ok(quiz.includes('...(tap && tap.f ? {pa: tap.f} : {})'));
  // Both sends: a save's answers and an anonymous batch; nothing else in sync.js sends answers.
  assert.ok(sync.includes('answers: log.map(a => logOut(a, sheetV())),'));
  assert.ok(sync.includes('anonAnswers: batch.map(a => logOut(a, sheetV())),'));
  assert.strictEqual((sync.match(/^\s+(answers|anonAnswers): /gm) || []).length, 2);
  // Below PA_SHEET the copy sent has no pa; from it, the entry as it is.
  const a = fx('a1');
  assert.ok(!('pa' in C.logOut(a, C.PA_SHEET - 1)) && !('pa' in C.logOut(a, 0)));
  assert.strictEqual(C.logOut(a, C.PA_SHEET), a);
  assert.strictEqual(a.pa, 'fi201', 'the queue keeps it');
});
