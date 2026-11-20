require('./slot.js').testGuard();
// The picture a player can attach to a report (Pierre, 2026-11-21, Q446; docs/spec/sync.md "Report images"): the sheet
// script keeps it in the "Report images" tab (Code.gs, against the in-memory sheet: rule D1), the app reduces it on the
// device and sends it only when the script is new enough (sync.js, rule D4), and the integrator reads it with
// tools/report_image.js. The reduction itself (a canvas) runs in the page smoke (tests/pages.smoke.js).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  block = require('./block.js');
const {loadCodeGs, makeSheet} = require('./gas.js');
const tool = require('../tools/report_image.js');
const ROOT = path.join(__dirname, '..');
const syncSrc = fs.readFileSync(path.join(ROOT, 'sync.js'), 'utf8');

const prog = n => ({'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: n, ko: 0}})});
const rep = (id, extra = {}) => ({
  id,
  t: '2026-11-21T00:00:00Z',
  why: 'photo',
  g: 'Acropora',
  a: '',
  fix: '',
  note: 'blurry',
  m: 'quiz',
  ph: 'acropora-1',
  ...extra
});
// A JPEG as far as the script checks it: its three header bytes, then n bytes.
const jpeg = (n, fill = 7) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(n, fill)]);
const img = (n, fill) => ({t: 'image/jpeg', d: jpeg(n, fill).toString('base64')});
const TOK = 'ghp_write000000000000000000';
const signedIn = () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}});
  return s;
};
const post = (s, reports, who = {rname: 'Ana', rpin: '1234'}) => s.post({...who, reports});

test('Code.gs: an image is kept in its own tab, in chunks under the cell limit, the report row names it', () => {
  const s = signedIn(),
    size = 100000; // 133,000 characters of base64: three chunks of 45,000
  const r = post(s, [rep('r1', {img: img(size)})]);
  assert.deepStrictEqual([r.ok, r.rep, r.img], [true, true, {r1: 1}]);
  const R = s.sheets.Reports,
    row = R.getRange(2, 1, 1, 13).getValues()[0];
  assert.strictEqual(R.getRange(1, 13, 1, 1).getValues()[0][0], 'Image');
  assert.deepStrictEqual([row[11], row[12]], ['r1', 'r1'], 'Id, then Image: the key of the picture');
  const I = s.sheets['Report images'],
    v = I.getRange(2, 1, 1, 9).getValues()[0];
  assert.deepStrictEqual(I.getRange(1, 1, 1, 5).getValues()[0], ['Id', 'Time', 'Player', 'Type', 'Bytes']);
  assert.deepStrictEqual([v[0], v[3], v[4]], ['r1', 'image/jpeg', size + 4]);
  assert.match(String(v[2]), /^[A-Za-z0-9+/]{8}$/, 'the anonymous id, never the name');
  assert.ok(!JSON.stringify(I.rows).includes('Ana'));
  const parts = v.slice(5).filter(x => x !== '');
  assert.strictEqual(parts.length, 3);
  assert.ok(parts.every(p => p.length <= 45000));
  // The rows as the connector hands them back decode to the same bytes (tools/report_image.js)
  assert.deepStrictEqual(tool.decode(I.getRange(1, 1, 2, 9).getValues(), 'r1'), jpeg(size));
});

test('Code.gs: a chunk that starts with + is kept as text, never a formula (Codex review)', () => {
  const s = signedIn(),
    b = jpeg(60000);
  b[45000 * 0.75] = 0xfa; // the second chunk's first base64 character is '+'
  const d = b.toString('base64');
  assert.strictEqual(d[45000], '+');
  assert.deepStrictEqual(post(s, [rep('p1', {img: {t: 'image/jpeg', d}})]).img, {p1: 1});
  const I = s.sheets['Report images'];
  assert.deepStrictEqual(tool.decode(I.getRange(1, 1, 2, 8).getValues(), 'p1'), b);
});

test('Code.gs: an anonymous id that starts with + stays text in the Player column, and a merge still finds it (Codex review)', () => {
  const s = loadCodeGs(),
    run = code => require('vm').runInContext(code, s.ctx);
  let name = '',
    other = '';
  for (let i = 0; i < 5000 && !(name && other); i++) {
    const id = run(`aid_('Zed${i}')`);
    if (id.startsWith('+') && !name) name = 'Zed' + i;
    else if (id.startsWith('+') && !other) other = 'Zed' + i;
  }
  assert.ok(name && other, 'two names whose id starts with +');
  assert.deepStrictEqual(post(s, [rep('z1', {img: img(40)})], {rname: name, rpin: ''}).img, {z1: 1});
  const cell = () => s.sheets['Report images'].getRange(2, 3, 1, 1).getValues()[0][0];
  assert.strictEqual(cell(), run(`aid_('${name}')`));
  run(`relabel_('Reports', 2, '${name}', '${other}')`);
  assert.strictEqual(cell(), run(`aid_('${other}')`), 'the merge moved it');
});

test('Code.gs: the image tab grows before a row past its grid; a retried image replaces its row (Codex review)', () => {
  const s = signedIn(),
    I = makeSheet('Report images'),
    grown = [];
  s.sheets['Report images'] = I;
  I.appendRow(['Id', 'Time', 'Player', 'Type', 'Bytes']);
  I.getMaxRows = () => 1; // a grid with no room for a row
  I.insertRowsAfter = (r, n) => grown.push([r, n]);
  assert.deepStrictEqual(post(s, [rep('g1', {img: img(40)})]).img, {g1: 1});
  assert.deepStrictEqual(grown, [[1, 1]]);
  // the same id again (its report was not written the first time): one row, no leftover chunk
  const run = code => require('vm').runInContext(code, s.ctx);
  const big = jpeg(100000).toString('base64'),
    small = jpeg(40).toString('base64');
  run(`repImgPut_('g2', 'Ana', ${JSON.stringify(big)}, 100004)`);
  run(`repImgPut_('g2', 'Ana', ${JSON.stringify(small)}, 44)`);
  const ids = I.getRange(2, 1, I.getLastRow() - 1, 1)
    .getValues()
    .map(r => r[0]);
  assert.deepStrictEqual(ids, ['g1', 'g2']);
  assert.deepStrictEqual(tool.decode(I.getRange(1, 1, 3, 9).getValues(), 'g2'), jpeg(40));
  // a tab that cannot take it: the image is refused, the report is logged, no error
  I.getRange = () => {
    throw new Error('Exception: out of bounds');
  };
  const r = post(s, [rep('g3', {img: img(40)})]);
  assert.deepStrictEqual([r.rep, r.img], [true, {g3: 0}]);
  assert.strictEqual(s.sheets.Reports.getRange(3, 12, 1, 2).getValues()[0][0], 'g3');
  assert.strictEqual(s.sheets.Reports.getRange(3, 13, 1, 1).getValues()[0][0], '', 'no mark of a picture not kept');
});

test('Code.gs: the report is logged, whatever happens to the image', () => {
  const s = signedIn();
  const cases = {
    big: {t: 'image/jpeg', d: jpeg(200000).toString('base64')}, // 200,004 bytes: over the 200,000 cap
    png: {t: 'image/jpeg', d: Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5, 6]).toString('base64')}, // not a JPEG
    type: {t: 'image/png', d: jpeg(50).toString('base64')},
    junk: {t: 'image/jpeg', d: '=== not base64 ==='},
    empty: {t: 'image/jpeg', d: ''}
  };
  Object.entries(cases).forEach(([k, i]) => {
    const r = post(s, [rep(k, {img: i})]);
    assert.strictEqual(r.rep, true, k);
    assert.deepStrictEqual(r.img, {[k]: 0}, k + ' refused');
  });
  assert.ok(!('img' in post(s, [rep('str', {img: 'a string'})])), 'not an image object: ignored');
  assert.strictEqual(s.sheets.Reports.getLastRow(), 7, 'every report logged');
  assert.ok(!s.sheets['Report images'], 'no image kept, no tab made');
  assert.ok(
    !s.sheets.Reports.getRange(2, 13, 6, 1)
      .getValues()
      .some(r => r[0]),
    'no Image key on a refused one'
  );
  // just under the cap is kept
  assert.deepStrictEqual(post(s, [rep('ok1', {img: img(199996)})]).img, {ok1: 1});
});

test('Code.gs: a report without an image answers as before; an image of a report logged already is not stored twice', () => {
  const s = signedIn();
  assert.deepStrictEqual(Object.keys(post(s, [rep('r1')])).sort(), ['ok', 'rep', 'v']);
  assert.ok(!('img' in post(s, [rep('r2')])));
  post(s, [rep('r3', {img: img(50)})]);
  const again = post(s, [rep('r3', {img: img(60, 9)})]);
  assert.deepStrictEqual(again.img, undefined, 'a resent report: nothing new to keep');
  assert.strictEqual(s.sheets['Report images'].getLastRow(), 2);
  assert.strictEqual(s.sheets.Reports.getLastRow(), 4);
});

test('Code.gs: a Reports tab made before the Image column gets its header at the first image, its rows untouched', () => {
  const s = loadCodeGs();
  s.sheets.Reports = makeSheet('Reports');
  const old = [
    'Time',
    'Reporter',
    'Verified',
    'Reason',
    'Expected',
    'Answered',
    'Suggested genus',
    'Note',
    'Mode',
    'Photos',
    'Where',
    'Id'
  ];
  s.sheets.Reports.appendRow(old);
  s.sheets.Reports.appendRow([new Date(), 'Bob', 0, 'Bad photo', '', '', '', '', 'quiz', '', '', 'old1']);
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}});
  post(s, [rep('r1')]);
  assert.strictEqual(s.sheets.Reports.getRange(1, 13, 1, 1).getValues()[0][0], '', 'no image: the header waits');
  post(s, [rep('r2', {img: img(50)})]);
  assert.strictEqual(s.sheets.Reports.getRange(1, 13, 1, 1).getValues()[0][0], 'Image');
  assert.deepStrictEqual(
    s.sheets.Reports.getRange(2, 12, 3, 2)
      .getValues()
      .map(r => r.map(String)),
    [
      ['old1', ''],
      ['r1', ''],
      ['r2', 'r2']
    ]
  );
  // the readers of the Id column still find it
  assert.deepStrictEqual(
    s.post({readReports: 1, token: TOK}).rows.map(r => r[0]),
    ['r2', 'r1', 'old1']
  );
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).reps, ['r1', 'r2']);
});

test('Code.gs: flood caps: six images per player in 6 hours, 120 in all', () => {
  const s = signedIn();
  const ok = Array.from({length: 8}, (_, i) => post(s, [rep('p' + i, {img: img(30)})]).img['p' + i]);
  assert.deepStrictEqual(ok, [1, 1, 1, 1, 1, 1, 0, 0]);
  assert.strictEqual(s.sheets.Reports.getLastRow(), 9, 'the reports are all logged');
  assert.strictEqual(s.sheets['Report images'].getLastRow(), 7);
});

test('Code.gs: an anonymous reporter (no name) can send one too, under no player id', () => {
  const s = loadCodeGs();
  const r = post(s, [rep('a1', {img: img(40)})], {rname: 'Typed Name', rpin: ''});
  assert.deepStrictEqual(r.img, {a1: 1});
  assert.strictEqual(s.sheets['Report images'].getRange(2, 3, 1, 1).getValues()[0][0].length, 8);
  const none = post(s, [rep('a2', {img: img(40)})], {rname: '', rpin: ''});
  assert.deepStrictEqual(none.img, {a2: 1});
  assert.strictEqual(s.sheets['Report images'].getRange(3, 3, 1, 1).getValues()[0][0], '', 'no name: no player');
});

test('Code.gs (rule D7): an image goes with its report: account deleted with everything, or its answers kept', () => {
  // 1. "delete everything": the reports go, and their images
  let s = signedIn();
  s.post({name: 'Ben', pin: '5678', data: prog(1), summary: {}});
  post(s, [rep('a1', {img: img(40)}), rep('a2')]);
  post(s, [rep('b1', {img: img(40, 9)})], {rname: 'Ben', rpin: '5678'});
  assert.strictEqual(s.sheets['Report images'].getLastRow(), 3);
  assert.strictEqual(s.post({dname: 'Ana', dpin: '1234', selfDelete: 1}).deleted, true);
  const left = s.sheets['Report images'].getRange(2, 1, 1, 1).getValues();
  assert.deepStrictEqual([s.sheets['Report images'].getLastRow(), left[0][0]], [2, 'b1'], "Ana's image went, Ben's stays");
  // 2. the admin's "delete, keep answers": the report stays (anonymised), its image goes, its mark too
  s = signedIn();
  post(s, [rep('c1', {img: img(40)}), rep('c2')]);
  assert.strictEqual(s.post({userDelete: 'Ana', token: TOK}).ok, true);
  assert.ok(s.sheets['Report images'].getLastRow() < 2, 'the picture of a kept report goes with the account');
  assert.strictEqual(s.sheets.Reports.getLastRow(), 3, 'the reports stay');
  assert.ok(
    !s.sheets.Reports.getRange(2, 13, 2, 1)
      .getValues()
      .some(r => r[0]),
    'no mark of a picture that is gone'
  );
  assert.ok(
    s.sheets.Reports.getRange(2, 2, 2, 2)
      .getValues()
      .every(r => String(r[0]).startsWith('~deleted ') && r[1] === 0)
  );
});

test('Code.gs (rule D7): a merge moves the images to the name they joined, no old anonymous id left', () => {
  const s = signedIn();
  post(s, [rep('m1', {img: img(40)})]);
  const cell = () => s.sheets['Report images'].getRange(2, 3, 1, 1).getValues()[0][0],
    before = cell();
  assert.ok(before);
  // the admin's merge into an archive: tests/sync.test.js "userMerge" drives it; here the report rename it calls
  require('vm').runInContext("relabel_('Reports', 2, 'Ana', 'Ana2')", s.ctx);
  assert.notStrictEqual(cell(), before);
  assert.strictEqual(cell(), require('vm').runInContext("aid_('Ana2')", s.ctx));
});

test('tools/report_image.js: lists, decodes with its checks, names the range to clear', () => {
  const b = jpeg(100000),
    t = b.toString('base64'),
    rows = [
      ['Id', 'Time', 'Player', 'Type', 'Bytes'],
      ['x1', '2026-11-21', 'abcd1234', 'image/jpeg', b.length, t.slice(0, 45000), t.slice(45000, 90000), t.slice(90000)],
      ['x2', '2026-11-21', '', 'image/jpeg', 8, jpeg(4).toString('base64')]
    ];
  assert.deepStrictEqual(tool.decode(rows, 'x1'), b);
  assert.deepStrictEqual(tool.decode({values: rows}.values, 'x2'), jpeg(4));
  assert.deepStrictEqual(
    tool.images(tool.rowsOf({values: rows})).map(x => [x.id, x.row, x.bytes]),
    [
      ['x1', 2, b.length],
      ['x2', 3, 8]
    ]
  );
  assert.deepStrictEqual(tool.clearRanges(rows, 'x1'), ["'Report images'!A2:H2"]);
  assert.deepStrictEqual(tool.clearRanges(rows, 'x2'), ["'Report images'!A3:F3"]);
  assert.throws(() => tool.decode(rows, 'nope'), /no image/);
  const lost = rows.map(r => r.slice()); // a chunk missing
  lost[1].splice(6, 1);
  assert.throws(() => tool.decode(lost, 'x1'), /chunk is missing/);
  const png = [['Id'], ['p', 't', '', 'image/jpeg', 0, Buffer.from([1, 2, 3, 4, 5]).toString('base64')]];
  assert.throws(() => tool.decode(png, 'p'), /not a JPEG/);
  assert.throws(() => tool.rowsOf({}), /no array/);
});

// The app's half (sync.js).
const app = () => {
  const code = block(syncSrc, 'const REPIMG_SHEET = ', '// The picked file as a JPEG', {file: 'sync.js'});
  return new Function('sheetV', code + '; return {REPIMG_SHEET, repImgOn, REPIMG, repImgSize, repImgPend, repBatch};');
};

test('sync.js (rule D4): the picture input waits for the script version it needs', () => {
  const {REPIMG_SHEET} = app()(() => 0);
  assert.ok(Number.isInteger(REPIMG_SHEET) && REPIMG_SHEET > 0);
  let v = REPIMG_SHEET - 1;
  const {repImgOn} = app()(() => v);
  assert.strictEqual(repImgOn(), false, 'an older script: no input, the dialog as before');
  v = REPIMG_SHEET;
  assert.strictEqual(repImgOn(), true);
  assert.ok(/repImgOn\(\)\s*\? `<div class="repf repimg">/.test(syncSrc), 'the dialog draws the input only through the gate');
  assert.ok(/const REPIMG_SHEET = \d+;/.test(syncSrc));
});

test('sync.js: the reduction targets about 800 px on the long side, never enlarged, then smaller until it fits the cap', () => {
  const {REPIMG, repImgSize} = app()(() => 0);
  assert.deepStrictEqual(REPIMG.STEPS[0], [800, 0.6]);
  assert.ok(
    REPIMG.STEPS.every(([m, q], i, a) => !i || (m < a[i - 1][0] && q < a[i - 1][1])),
    'each step smaller'
  );
  assert.ok(REPIMG.MAX < 200000, "under the script's cap");
  assert.deepStrictEqual(repImgSize(4000, 3000, 800), [800, 600]);
  assert.deepStrictEqual(repImgSize(1170, 2532, 800), [370, 800], 'a phone screenshot');
  assert.deepStrictEqual(repImgSize(500, 300, 800), [500, 300], 'a small one is not enlarged');
  assert.deepStrictEqual(repImgSize(10000, 1, 800), [800, 1], 'never a zero side');
});

test('sync.js: a report with a picture goes alone in its request, the others as before; the queue holds no picture', () => {
  const {repBatch} = app()(() => 0);
  const q = (id, who = 'Ana') => ({id, rn: who, rp: '1234', ra: 'g1', why: 'photo'});
  const pend = {r3: {t: 'image/jpeg', d: 'QUJD'}};
  const L = [q('r1'), q('r2'), q('r3'), q('r4')];
  let b = repBatch(L, pend);
  assert.deepStrictEqual(
    b.batch.map(x => x.id),
    ['r1', 'r2'],
    'the batch stops before the picture'
  );
  assert.ok(b.reports.every(x => !('img' in x) && !('rn' in x) && !('rp' in x) && !('ra' in x)));
  b = repBatch(L.slice(2), pend);
  assert.deepStrictEqual(
    b.batch.map(x => x.id),
    ['r3']
  );
  assert.deepStrictEqual(b.reports, [{id: 'r3', why: 'photo', img: {t: 'image/jpeg', d: 'QUJD'}}]);
  // no picture waiting: the batch is the first 50 of one sender, as before
  b = repBatch([...Array.from({length: 60}, (_, i) => q('s' + i)), q('o1', 'Bob')], {});
  assert.strictEqual(b.batch.length, 50);
  assert.ok(b.batch.every(x => x.rn === 'Ana'));
  // the queue itself never stores the picture: the dialog writes the report without it and the picture goes to repImgPend
  const sub = block(syncSrc, "store.set('reefid-reports', [...store.get('reefid-reports', []), {...who, ...r}]", '// Offline, the report', {
    file: 'sync.js'
  });
  assert.ok(!/img|pic/.test(sub), 'the queued report is the text alone');
  assert.ok(/repImgPend\[r\.id\] = /.test(syncSrc));
  assert.ok(/navigator\.onLine === false \|\| !SYNC_URL/.test(syncSrc), 'offline: no picture kept for later');
});
