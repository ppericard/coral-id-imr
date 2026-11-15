// The sheet script's Timings tab (Code.gs TIM, timStart_, tim_, timEnd_, timTrim_; the storage study of 2026-11-14, step
// 1; Pierre, 2026-11-14, Q352) and its summary (tools/timings.js). Against the in-memory sheet of tests/gas.js only:
// nothing leaves this process (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const {loadCodeGs} = require('./gas.js');
const T = require('../tools/timings.js');

const TOK = 'ghp_write000000000000000000';
const CODE = fs.readFileSync(path.join(__dirname, '..', 'tools', 'sync', 'Code.gs'), 'utf8');
const at = i => new Date(Date.UTC(2026, 10, 14, 6, 0, i)).toISOString();
const ans = (id, i) => ({
  id,
  t: at(i),
  g: 'Acropora',
  a: 'Acropora',
  ok: 1,
  m: 'quiz',
  ph: 'acropora-' + i,
  ch: 'Acropora Porites',
  e: 0.5
});
const save = (s, name, L) => s.post({name, pin: '1234', data: {}, summary: {}, answers: L, dev: 'devabc12345'});
const run = (s, js) => vm.runInContext(js, s.ctx);
// opts: the TIM fields the test sets (EVERY, SLOW, MAX…), after loading with the tab on.
const load = (set = {}, o = {}) => {
  const s = loadCodeGs(Object.assign({timings: true}, o));
  run(s, `Object.assign(TIM, ${JSON.stringify(set)})`);
  return s;
};
// The script itself from GitHub at the same version, so autoUpdate finds itself up to date (nothing else is fetched).
const fetch = url => {
  const u = new URL(url);
  return u.hostname === 'raw.githubusercontent.com' && u.pathname.endsWith('/tools/sync/Code.gs')
    ? {getResponseCode: () => 200, getContentText: () => CODE}
    : null;
};
const tab = s => s.sheets.Timings;
const body = s => (tab(s) ? tab(s).rows.slice(1) : []);
const ops = s => body(s).map(r => r[1]);

test('Code.gs Timings: off in the harness by default, so no other test meets the tab', () => {
  const s = loadCodeGs();
  run(s, 'TIM.EVERY = 1; TIM.SLOW = 0');
  save(s, 'Ana', [ans('a1', 1)]);
  s.get({stats: 1});
  assert.strictEqual(tab(s), undefined);
});

test('Code.gs Timings: a sampled save logs its reads and itself, with a header, the version and the weight', () => {
  const s = load({EVERY: 1, SLOW: 1e9});
  save(s, 'Ana', [ans('a1', 1), ans('a2', 2)]);
  assert.deepStrictEqual([...tab(s).rows[0]], ['Time', 'Op', 'Ms', 'Rows', 'Cols', 'Version', 'Weight']);
  assert.ok(tab(s).rows.length >= 2);
  const v = run(s, 'VERSION');
  // The first save on an empty tab reads no ids (nothing logged yet) and finds no hold rows to read but its own two.
  const L = body(s);
  assert.ok(
    L.some(r => r[1] === 'save'),
    'the save itself: ' + ops(s)
  );
  L.forEach(r => {
    assert.strictEqual(Object.prototype.toString.call(r[0]), '[object Date]');
    assert.strictEqual(typeof r[2], 'number');
    assert.ok(r[2] >= 0);
    assert.strictEqual(r[5], v);
    assert.strictEqual(r[6], 1); // 1 in EVERY = 1: weight 1
  });
  // The second save reads the Id column (2 rows) and the whole tab (the hold): rows and columns as read.
  save(s, 'Ana', [ans('a3', 3)]);
  const ids = body(s)
      .filter(r => r[1] === 'read Answer ids')
      .pop(),
    all = body(s)
      .filter(r => r[1] === 'read Answers')
      .pop(),
    sv = body(s)
      .filter(r => r[1] === 'save')
      .pop();
  assert.deepStrictEqual([ids[3], ids[4]], [2, 1]);
  assert.strictEqual(all[3], 3);
  assert.strictEqual(all[4], run(s, 'LOG.length'));
  assert.strictEqual(sv[3], 3, 'a save row carries the Answers rows it saw');
  assert.strictEqual(sv[4], '');
});

test('Code.gs Timings: never a name, code, device, answer id or answer content in the tab', () => {
  const s = load({EVERY: 1, SLOW: 0});
  save(s, 'Zorvanka', [ans('qx7731', 1), ans('qx7732', 2)]);
  s.post({anon: 'anondev9876', anonAnswers: [ans('qy8841', 3)], av: '1-x', dev: 'devzz99887'});
  s.get({name: 'Zorvanka', pin: '1234'});
  s.post({readAnswers: 1, token: TOK});
  s.get({stats: 1});
  const txt = JSON.stringify(tab(s).rows);
  [
    'Zorvanka',
    'zorvanka',
    '1234',
    'devabc12345',
    'anondev9876',
    'devzz99887',
    'qx7731',
    'qy8841',
    'Acropora',
    'acropora-1',
    'quiz'
  ].forEach(w => assert.ok(!txt.includes(w), w + ' in ' + txt));
  // Only the fixed operation names.
  const known = [
    'save',
    'anon save',
    'load',
    'stats',
    'admin answers',
    'read Answers',
    'read Answer ids',
    'stats build',
    'read Progress data',
    'board warm',
    'trigger'
  ];
  ops(s).forEach(o => assert.ok(known.includes(o), o));
  for (const o of ['save', 'anon save', 'load', 'stats', 'admin answers', 'read Answers', 'read Answer ids', 'stats build'])
    assert.ok(ops(s).includes(o), o);
});

test('Code.gs Timings: sampled per request, 1 in EVERY at weight EVERY; a slow operation always, at weight 1', () => {
  const s = load({EVERY: 4, SLOW: 1e9});
  save(s, 'Ana', [ans('a1', 1)]);
  run(s, 'Math.random = () => 0.5'); // 0.5 * 4 >= 1: not sampled
  save(s, 'Ana', [ans('a2', 2)]);
  s.get({name: 'Ana', pin: '1234'});
  const before = body(s).length;
  run(s, 'Math.random = () => 0.2'); // 0.2 * 4 < 1: sampled
  save(s, 'Ana', [ans('a3', 3)]);
  const got = body(s).slice(before);
  assert.ok(got.length >= 2, 'the sampled save is logged whole');
  got.forEach(r => assert.strictEqual(r[6], 4));
  assert.strictEqual(body(s).filter(r => r[1] === 'load').length, 0, 'the load in between was not sampled');
  // Not sampled, but slow: logged at weight 1.
  run(s, 'Math.random = () => 0.99; TIM.SLOW = 0');
  const b2 = body(s).length;
  s.get({name: 'Ana', pin: '1234'});
  const slow = body(s).slice(b2);
  assert.ok(slow.some(r => r[1] === 'load'));
  slow.forEach(r => assert.strictEqual(r[6], 1));
  // Neither: nothing written, the tab not even read.
  run(s, 'TIM.SLOW = 1e9');
  const b3 = body(s).length;
  save(s, 'Ana', [ans('a4', 4)]);
  assert.strictEqual(body(s).length, b3);
});

test('Code.gs Timings: only a completed save is a save (an early refusal is not timed as one)', () => {
  const s = load({EVERY: 1, SLOW: 1e9});
  save(s, 'Ana', [ans('a1', 1)]);
  const n = ops(s).filter(o => o === 'save').length;
  assert.strictEqual(s.post({name: 'Ana', pin: '9999', data: {}, summary: {}, answers: []}).error, 'pin');
  assert.strictEqual(s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [], at: 99}).error, 'stale');
  assert.strictEqual(ops(s).filter(o => o === 'save').length, n);
});

test('Code.gs Timings: at most TIM.ROWS rows a request, its own row always among them', () => {
  const s = load({EVERY: 1, SLOW: 1e9, ROWS: 2});
  save(s, 'Ana', [ans('a1', 1)]);
  const b = body(s).length;
  save(s, 'Ana', [ans('a2', 2)]);
  const got = body(s).slice(b);
  assert.strictEqual(got.length, 2);
  assert.strictEqual(got[1][1], 'save');
});

test('Code.gs Timings: a failing tab never breaks or changes a reply', () => {
  const plain = loadCodeGs(),
    s = load({EVERY: 1, SLOW: 0});
  const ss = s.ctx.SpreadsheetApp.getActiveSpreadsheet(),
    ins = ss.insertSheet;
  ss.insertSheet = n => {
    if (n === 'Timings') throw new Error('Service Spreadsheets failed');
    return ins(n);
  };
  const strip = o => {
    const x = JSON.parse(JSON.stringify(o));
    delete x.acct;
    return x;
  };
  const a = [save(plain, 'Ana', [ans('a1', 1)]), save(s, 'Ana', [ans('a1', 1)])];
  assert.deepStrictEqual(strip(a[1]), strip(a[0]));
  assert.strictEqual(tab(s), undefined);
  // The tab there, but every write and read of it throws: the same.
  ss.insertSheet = ins;
  ins('Timings');
  Object.assign(s.sheets.Timings, {
    appendRow() {
      throw new Error('Service Spreadsheets timed out');
    },
    getLastRow() {
      throw new Error('Service Spreadsheets timed out');
    }
  });
  const b = [save(plain, 'Ana', [ans('a2', 2)]), save(s, 'Ana', [ans('a2', 2)])];
  assert.deepStrictEqual(strip(b[1]), strip(b[0]));
  assert.deepStrictEqual(strip(s.get({name: 'Ana', pin: '1234'})).ok, true);
  assert.strictEqual(s.post({anon: 'anondev9876', anonAnswers: [ans('b1', 3)], av: '1-x'}).log, true);
  // tim_ and timEnd_ themselves never throw, whatever they are given.
  run(s, "TIM_.rows = null; tim_('x', NaN); timEnd_(); TIM_ = null; timEnd_(); tim_('x', 0); timStart_(1)");
});

test('Code.gs Timings: past twice TIM.MAX rows (a trigger that stopped trimming) nothing more is written', () => {
  const s = load({EVERY: 1, SLOW: 1e9, MAX: 3});
  save(s, 'Ana', [ans('a1', 1)]);
  for (let i = 0; i < 10; i++) tab(s).appendRow([new Date(), 'save', 1, 1, '', 1, 1]);
  const n = tab(s).rows.length;
  save(s, 'Ana', [ans('a2', 2)]);
  assert.strictEqual(tab(s).rows.length, n);
});

test('Code.gs Timings: past TIM.MAX rows the trigger deletes the oldest, back to TIM.KEEP of it, the rest as logged', () => {
  const s = load({EVERY: 0, EVERY_TRIGGER: 0, SLOW: 1e9, SLOW_TRIGGER: 1e9, MAX: 12, KEEP: 0.75}, {fetch});
  run(s, "sheet_('Timings', TIM.HEAD)");
  const op = i => (i % 2 ? 'admin answers' : 'read Answers');
  for (let i = 0; i < 14; i++) tab(s).appendRow([new Date(Date.UTC(2026, 10, 1 + i)), op(i), 100 + i, i, 1, 129, i === 0 ? 1 : 50]);
  // At or under TIM.MAX: nothing trimmed.
  run(s, 'TIM.MAX = 14');
  assert.strictEqual(run(s, 'timTrim_()'), 0);
  assert.strictEqual(body(s).length, 14);
  // 14 rows over 12: the 5 oldest deleted, back to 9 (3/4 of 12); the kept rows as they were logged, weights unchanged.
  run(s, 'TIM.MAX = 12');
  assert.match(s.ctx.autoUpdate(), /^up to date/);
  assert.deepStrictEqual(
    body(s).map(r => [r[1], r[2], r[6]]),
    [5, 6, 7, 8, 9, 10, 11, 12, 13].map(i => [op(i), 100 + i, 50])
  );
  assert.strictEqual(tab(s).rows[0][1], 'Op', 'the header stays');
  // A trim that fails leaves the run's answer as it was.
  tab(s).deleteRows = () => {
    throw new Error('Service Spreadsheets failed');
  };
  for (let i = 0; i < 5; i++) tab(s).appendRow([new Date(), 'x', 1, '', '', 129, 1]);
  assert.match(s.ctx.autoUpdate(), /^up to date/);
  assert.strictEqual(body(s).length, 14);
});

test('Code.gs Timings: a sampled trigger run is logged as trigger, at the trigger weight', () => {
  const s = load({EVERY_TRIGGER: 1, SLOW_TRIGGER: 1e9}, {fetch});
  save(s, 'Ana', [ans('a1', 1)]);
  assert.match(s.ctx.autoUpdate(), /^up to date/);
  const tr = body(s).filter(r => r[1] === 'trigger');
  assert.strictEqual(tr.length, 1);
  assert.strictEqual(tr[0][6], 1);
  assert.ok(ops(s).includes('board warm'));
});

// ---- tools/timings.js ----

test('timings.js parseTime: the forms an export gives', () => {
  const ms = Date.UTC(2026, 10, 12, 20, 35, 7);
  assert.strictEqual(T.parseTime('2026-11-12 20:35:07'), ms);
  assert.strictEqual(T.parseTime('2026-11-12 20:35'), ms - 7000);
  assert.strictEqual(T.parseTime('2026-11-12T20:35:07Z'), ms);
  assert.strictEqual(T.parseTime('2026-11-12T20:35:07.000Z'), ms);
  assert.strictEqual(T.parseTime('11/12/2026 20:35:07'), ms);
  assert.strictEqual(T.parseTime(new Date(ms)), ms);
  assert.strictEqual(T.parseTime(ms), ms);
  assert.strictEqual(T.parseTime(String(ms)), ms);
  // A Sheets serial day number (days since 1899-12-30).
  assert.strictEqual(T.parseTime(25569 + ms / 864e5), ms);
  assert.ok(Number.isNaN(T.parseTime('')));
  assert.ok(Number.isNaN(T.parseTime('soon')));
});

test('timings.js rowsOf: the connector JSON and a CSV, header and blank rows dropped', () => {
  const head = ['Time', 'Op', 'Ms', 'Rows', 'Cols', 'Version', 'Weight'];
  const vals = [
    head,
    ['2026-11-12 20:35:07', 'save', '812', '5668', '', '130', '50'],
    ['2026-11-12 20:36:00', 'read Answers', '420', '5668', '25', '130', '1'],
    ['', '', '']
  ];
  const a = T.rowsOf(JSON.stringify({range: 'Timings!A1:G', values: vals})),
    b = T.rowsOf(vals.map(r => r.map(x => (/,/.test(x) ? `"${x}"` : x)).join(',')).join('\r\n'));
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a.length, 2);
  assert.deepStrictEqual(a[0], {t: Date.UTC(2026, 10, 12, 20, 35, 7), op: 'save', ms: 812, rows: 5668, cols: null, v: 130, w: 50});
  assert.strictEqual(a[1].cols, 25);
  assert.deepStrictEqual(T.parseCsv('a,"b,c","d""e"\n1,2'), [
    ['a', 'b,c', 'd"e'],
    ['1', '2']
  ]);
});

test('timings.js summary: weighted counts, median, p90, max; the trend by day; the quota lines', () => {
  const day = (d, h = 0) => Date.UTC(2026, 10, d, h);
  const R = [];
  // Day 1: nine fast saves at weight 50, one slow at weight 1.
  for (let i = 0; i < 9; i++) R.push({t: day(1, i), op: 'save', ms: 100 + i, rows: 1000, cols: null, v: 130, w: 50});
  R.push({t: day(1, 10), op: 'save', ms: 9000, rows: 1000, cols: null, v: 130, w: 1});
  // Day 2: slower, more rows.
  for (let i = 0; i < 4; i++) R.push({t: day(2, i), op: 'save', ms: 300, rows: 2000, cols: null, v: 131, w: 50});
  // Triggers: two runs logged at weight 16 over the span, 30 s each.
  R.push({t: day(1, 1), op: 'trigger', ms: 30000, rows: null, cols: null, v: 130, w: 16});
  R.push({t: day(2, 23), op: 'trigger', ms: 30000, rows: null, cols: null, v: 131, w: 16});
  const S = T.summary(R);
  assert.strictEqual(S.by, 'day');
  assert.deepStrictEqual(S.versions, [130, 131]);
  const s = S.ops.save;
  assert.deepStrictEqual([s.logged, s.calls], [14, 9 * 50 + 1 + 4 * 50]);
  // Weighted: the slow save stands for 1 call in 651, so neither the median nor the p90 is it.
  assert.strictEqual(s.median, 106);
  assert.strictEqual(s.p90, 300);
  assert.strictEqual(s.max, 9000);
  assert.strictEqual(s.maxRows, 2000);
  const tr = S.trend.filter(x => x.op === 'save');
  assert.deepStrictEqual(
    tr.map(x => [x.at, x.calls, x.median, x.maxRows]),
    [
      ['2026-11-01', 451, 104, 1000],
      ['2026-11-02', 200, 300, 2000]
    ]
  );
  // 2 × 16 × 30 s over 1.96 days.
  assert.strictEqual(S.quota.triggerMinDay, Math.round(((2 * 16 * 30000) / 60000 / ((day(2, 23) - day(1, 0)) / 864e5)) * 10) / 10);
  assert.strictEqual(S.quota.slowest.ms, 30000);
  assert.strictEqual(S.quota.fetches, 'not measured');
  assert.match(T.text(S), /save\s+14\s+651\s+106\s+300\s+9000\s+2000/);
  // Past 45 days, by week (Mondays).
  const W = T.summary([
    {t: day(2), op: 'save', ms: 1, rows: 1, cols: null, v: 1, w: 1},
    {t: Date.UTC(2027, 0, 20), op: 'save', ms: 1, rows: 1, cols: null, v: 1, w: 1}
  ]);
  assert.strictEqual(W.by, 'week');
  assert.deepStrictEqual(
    W.trend.map(x => x.at),
    ['2026-11-02', '2027-01-18']
  );
  assert.deepStrictEqual(T.summary([]).ops, {});
});
