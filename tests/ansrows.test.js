require('./slot.js').testGuard();
// The admin's lean answer log (REE-39): the sheet's readAnswers sends its rows column by column when the admin asks for
// it (Code.gs answers_ with lean, core.js rowsPack), and the admin reads them back (admin.js leanOn, leanIn, core.js
// rowsUnpack) into exactly the rows the plain reply holds, the same values and the same JSON, key order included, so
// no page reads anything else. Proved here on made-up logs at today's size and three times it (tests/anslog.js), on a
// fixture with every kind of value a cell or a row can hold, and on the sheet's own reply, hand-edited cells included.
// Nothing reaches the real sheet (rule D1): Code.gs runs on the tests/gas.js stub.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  zlib = require('zlib');
const block = require('./block.js');
const C = require('../core.js');
const {loadCodeGs} = require('./gas.js');
const {synthLog, synthPlayers} = require('./anslog.js');

const TOK = 'ghp_write000000000000000000';
const copy = o => JSON.parse(JSON.stringify(o));
// The round trip as the wire makes it: packed, written as JSON, read, unpacked.
const wire = rows => C.rowsUnpack(copy(C.rowsPack(rows)));
// The rows back exactly as JSON gives them: the same text (key order included) and the same values.
function same(rows, msg) {
  const got = wire(rows);
  assert.strictEqual(JSON.stringify(got), JSON.stringify(rows), msg);
  assert.deepStrictEqual(got, copy(rows), msg);
  return got;
}
// A sheet holding the made-up log, the reply's text kept as the script wrote it.
function sheetOf(rows) {
  const out = {text: null};
  out.s = loadCodeGs({extend: ctx => (ctx.ContentService.createTextOutput = t => ({setMimeType: () => ((out.text = t), JSON.parse(t))}))});
  const ss = out.s.ctx.SpreadsheetApp.getActiveSpreadsheet();
  ss.insertSheet('Answers').rows.push(vm.runInContext('LOG', out.s.ctx).slice(), ...rows);
  ss.insertSheet('RAs').rows.push(vm.runInContext('HEAD', out.s.ctx).slice(), ...synthPlayers(rows));
  out.read = body => (out.s.post({readAnswers: 1, token: TOK, ...body}), out.text);
  return out;
}

test('rowsPack / rowsUnpack: every kind of value comes back as JSON gives it', () => {
  const sc = (o, k) => Object.assign({d: 0.5}, o, k);
  const R = [
    // strings: empty, spaces doubled, leading and trailing, unicode; numbers as text; booleans; -0, NaN, Infinity
    ['id1', 1700000000000, '', '  two  spaces ', 'é ü 字', '1', true, -0, NaN, Infinity, undefined, null, 0.1, 1e-7, 1e21],
    ['id2', 1700000003000, 'a b', 'a  b', ' ', 1, false, 0, -1.5, -Infinity, null, 2, 0.25, 3.14159, -1e21],
    ['id1', 1700000001000, 'a b', 'b a', '', '', null, 12, 0.003, 4, () => 1, Symbol('x'), 0.125, 0, 7]
  ];
  same(R, 'one of everything');
  // a column mostly null, a column all null, a column of objects with keys in each one's own order and a missing one
  const S = Array.from({length: 40}, (_, i) => [
    'p' + (i % 3),
    i % 7 ? null : 'only some',
    null,
    i % 5 ? sc({m: i / 1000, n: -i / 1000}, i % 2 ? {f: 0.1} : {}) : null,
    i % 9 ? null : ['x', 'y'],
    i % 4 ? {l: 1, d: 0.25, m: 1} : {d: 0.25, h: 'corallites', m: 1},
    {constructor: i, toString: 'not a method'}
  ]);
  const got = same(S, 'sparse, empty and object columns');
  assert.deepStrictEqual(Object.keys(got[1][3]), ['d', 'm', 'n', 'f'], 'each object keeps its own key order');
  assert.deepStrictEqual(Object.keys(got[0][5]), ['d', 'h', 'm']);
  assert.strictEqual(Object.getPrototypeOf(got[0][6]), Object.prototype, 'a key named constructor is a plain key');
  // objects that cannot go in an object column go as they are: a __proto__ key, a null value, keys in two orders, an
  // empty object, nested values, a Date
  for (const col of [
    [JSON.parse('{"__proto__": {"x": 1}, "a": 1}'), {a: 2}],
    [{a: null}, {a: 1}],
    [
      {a: 1, b: 2},
      {b: 1, a: 2}
    ],
    [{}, {a: 1}],
    [{a: {b: [1, {c: null}]}}, {a: [NaN]}],
    [new Date(1700000000000), {a: 1}]
  ]) {
    const back = same(
      col.map(x => [x]),
      JSON.stringify(col)
    );
    assert.ok(
      back.every(r => !r[0] || typeof r[0] !== 'object' || Array.isArray(r[0]) || Object.getPrototypeOf(r[0]) === Object.prototype)
    );
  }
  assert.deepStrictEqual(wire([[JSON.parse('{"__proto__": {"x": 1}}')]])[0][0].x, undefined, 'never a prototype');
  // rows of several lengths (an older script, a hole), one row, none
  same(
    [['a', 1], ['b'], ['c', 2, 3], [], [, 'hole']], // eslint-disable-line no-sparse-arrays
    'rows of several lengths'
  );
  same([['only', 0.5, 'one row']], 'one row');
  same([], 'no row');
  // whole numbers that overflow as differences, scaled numbers that are not exact once scaled
  same([[Number.MAX_SAFE_INTEGER], [-Number.MAX_SAFE_INTEGER], [3]], 'large whole numbers');
  same([[0.1 + 0.2], [1 / 3], [123456789.123]], 'numbers no scale makes whole');
  same([[2 ** 60], [1]], 'numbers past the safe integers');
  // not rows: the reply keeps its rows
  assert.strictEqual(C.rowsPack(null), null);
  assert.strictEqual(C.rowsPack([['a'], 'b']), null);
});

test('rowsPack: the spellings it chooses on an answer log, and the rows they stand for', () => {
  const s = sheetOf(synthLog(2000, 3)),
    rows = JSON.parse(s.read({})).rows,
    L = C.rowsPack(rows),
    kind = c => Object.keys(c)[0];
  same(rows, 'the made-up log');
  assert.strictEqual(L.w, 24);
  assert.strictEqual(L.l, undefined, 'rows of one length');
  // the anonymous id, the units, the mode: a dictionary; the time: differences; the photos and the choices: words; the
  // expectation, the ability and the seconds: scaled; the scoring record: one column per key; the rejected tries: sparse
  assert.deepStrictEqual(
    [0, 1, 2, 5, 6, 7, 8, 10, 12, 22, 23].map(j => kind(L.c[j])),
    ['k', 'd', 'k', 'k', 't', 's', 's', 't', 's', 'o', 'p']
  );
  assert.deepStrictEqual([L.c[7].s, L.c[8].s, L.c[12].s], [100, 1000, 10]);
});

test('rowsUnpack: a reply it cannot read throws, never a part of the log', () => {
  const L = C.rowsPack([
    ['a', 1],
    ['b', 2]
  ]);
  assert.throws(() => C.rowsUnpack({...L, f: 2}), /lean/);
  assert.throws(() => C.rowsUnpack({...L, w: 3}), /lean/);
  assert.throws(() => C.rowsUnpack({...L, c: [{q: 1}, L.c[1]]}), /lean/);
  assert.throws(() => C.rowsUnpack({...L, c: [{k: ['a'], i: [0]}, L.c[1]]}), /lean/, 'a column of another length');
  assert.throws(() => C.rowsUnpack(null), /lean/);
});

// The sheet's own replies: at today's size of the log (about 7,700 answers) and three times it. The lean reply holds
// every field of the plain one but rows, and its rows come back as the plain reply's, to the byte.
for (const n of [7700, 23100])
  test(`Code.gs readAnswers lean: ${n} answers, the same rows in about half the bytes`, () => {
    const s = sheetOf(synthLog(n, 7)),
      plainT = s.read({}),
      leanT = s.read({lean: 1}),
      a = JSON.parse(plainT),
      b = JSON.parse(leanT);
    assert.ok(!('rows' in b) && b.lean && b.lean.n === a.rows.length, 'lean in place of rows');
    assert.strictEqual(a.rows.length, n, 'every answer but the surprise cards and the row without a player');
    const R = C.rowsUnpack(b.lean);
    assert.strictEqual(JSON.stringify(R), JSON.stringify(a.rows));
    const {rows, ...restA} = a,
      {lean, ...restB} = b;
    assert.deepStrictEqual(restB, restA, 'the players, roster, excluded ids and version as before');
    // smaller: under half the bytes, under 60% once gzipped
    const gz = t => zlib.gzipSync(t).length;
    assert.ok(leanT.length < 0.5 * plainT.length, `${leanT.length} of ${plainT.length} bytes`);
    assert.ok(gz(leanT) < 0.6 * gz(plainT), `${gz(leanT)} of ${gz(plainT)} bytes gzipped`);
  });

test('Code.gs readAnswers lean: hand-edited cells, a narrow tab, removed accounts and devices come back as the plain reply', () => {
  const s = loadCodeGs(),
    T = i => new Date(Date.UTC(2026, 10, 8, 6, 0, i)).toISOString(),
    ans = (id, i, x = {}) => ({
      id,
      t: T(i),
      g: 'Acropora',
      a: 'Acropora',
      ok: 1,
      m: 'quiz',
      ph: 'acropora-wide-' + i,
      ch: 'Acropora Porites',
      e: 0.5,
      ...x
    }),
    save = (name, L) => assert.ok(s.post({name, pin: '1234', data: {}, summary: {}, answers: L, dev: 'dev0000001'}).ok),
    both = () => {
      const a = s.post({readAnswers: 1, token: TOK, aname: 'Cy', apin: '1234'}),
        b = s.post({readAnswers: 1, token: TOK, aname: 'Cy', apin: '1234', lean: 1});
      assert.ok(b.lean && !('rows' in b));
      assert.strictEqual(JSON.stringify(C.rowsUnpack(copy(b.lean))), JSON.stringify(a.rows));
      assert.strictEqual(b.me, a.me);
      return a.rows;
    };
  // every field the app logs: typed with its spelling step and rejected tries, a fish answer, a Find the X
  save('Ana', [
    ans('a1', 1, {th: 0.512, nw: 1, rt: 12.3, zm: 1, tz: 480, sc: {d: 0.4, m: 0.1, n: -0.2, l: 1, i: 0.05}}),
    ans('a2', 2, {m: 'quiz|t', ty: 'acropra', tr: 1, rj: ['xyz', 'brain coral'], sc: {d: 0.4, t: -0.3, z: 'g', i: 0}}),
    ans('a3', 3, {
      s: 'fish',
      rk: 'family',
      g: 'f:Damselfishes',
      a: 'f:Wrasses',
      ok: 0,
      tn: 'Damselfishes',
      ta: 'Wrasses',
      sp: 'Chromis ternatensis, Dascyllus trimaculatus'
    }),
    ans('a4', 4, {m: 'quiz|f', ph: 'p1 p2 p3 p4', pa: 'p2', tz: -300})
  ]);
  save('Ben', [ans('b1', 5), ans('b2', 6, {e: 0.25})]);
  save('Cy', [ans('c1', 7, {sc: {d: 1, f: 0.2, c: 0.1, r: 0.9, g: 0.8, h: 'corallites', o: 0.3, s: 1.2}})]);
  save('Dee', [ans('d1', 8)]);
  assert.ok(s.post({anon: 'devanon001', anonAnswers: [ans('n1', 9)], av: '1-x'}).log, 'a device not signed in');
  assert.ok(s.post({userDelete: 'Ben', token: TOK}).ok, 'deleted, its answers kept');
  assert.ok(s.post({userArchive: {from: 'Dee', into: 'Dee-old'}, token: TOK}).ok);
  const rows0 = both();
  assert.deepStrictEqual(
    [...new Set(rows0.map(r => r[11]))].sort(),
    [0, 1, 2],
    'a player, a device not signed in, a deleted account and an archive'
  );
  assert.ok(rows0.some(r => r[23]) && rows0.some(r => r[22]) && rows0.some(r => r[17] === 'fish'), 'tries, scoring, fish');
  // cells edited by hand: text in a number column, a broken scoring record and rejected tries, a number as text, a
  // surprise card and a row with no player (left out alike)
  const A = s.sheets.Answers.rows,
    col = n => A[0].indexOf(n);
  A[1][col('Expected')] = 'abc';
  A[1][col('Seconds')] = 'n/a';
  A[2][col('Scoring')] = '{bad';
  A[2][col('Rejected tries')] = '["a", 5, ""]';
  A[3][col('Rejected tries')] = 'not json';
  A[3][col('Answered')] = 12;
  A[4][col('Typed')] = '  spaced  out ';
  A.push(Object.assign([...A[1]], {5: 'wink'}), ['', new Date(), 'Acropora']);
  const rows1 = both();
  assert.strictEqual(rows1[0][7], null, 'text in a number column reads null in both');
  // a tab narrower than the log (an older tab before the next answer adds its columns)
  s.sheets.Answers.maxCols = 20;
  both();
  // one row, then none
  s.sheets.Answers.maxCols = Infinity;
  s.sheets.Answers.rows.splice(2);
  assert.strictEqual(both().length, 1);
  s.sheets.Answers.rows.splice(1);
  assert.deepStrictEqual(both(), []);
});

test('Code.gs readAnswers without lean: rows as before (tools/analyses.js, an older admin)', () => {
  const s = sheetOf(synthLog(300, 5)),
    j = JSON.parse(s.read({}));
  assert.ok(Array.isArray(j.rows) && !('lean' in j));
  assert.ok(j.rows.every(r => r.length === 24));
  // lean: 0 is no request for it
  assert.ok(Array.isArray(JSON.parse(s.read({lean: 0})).rows));
});

// The admin's side (admin.js leanOn, leanIn): a lean reply is read from LEAN_SHEET only; its rows come back in place.
test('admin.js leanIn: the lean rows read back from LEAN_SHEET, an older reply as it is, an unreadable one as no rows', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8'),
    ctx = {rowsUnpack: C.rowsUnpack};
  vm.createContext(ctx);
  vm.runInContext(
    block(src, 'const LEAN_SHEET = ', '// ratingsOnly', {file: 'admin.js'}) + '\nthis.leanIn = leanIn; this.N = LEAN_SHEET;',
    ctx
  );
  const N = ctx.N,
    rows = [
      ['id1', 1, 'Acropora', 'Acropora', 1],
      ['id2', 2, 'Porites', 'Acropora', 0]
    ],
    lean = copy(C.rowsPack(rows));
  const j = {ok: true, v: N, lean, players: {}};
  ctx.leanIn(j);
  assert.deepStrictEqual(copy(j), {ok: true, v: N, rows, players: {}});
  // an older script's reply: its rows as they are
  const o = {ok: true, v: N - 1, rows};
  ctx.leanIn(o);
  assert.deepStrictEqual(o, {ok: true, v: N - 1, rows});
  // a reply it cannot read: no rows (error 'lean': the pages show no log), never a part of it
  const bad = {ok: true, v: N, lean: {...lean, f: 99}};
  ctx.leanIn(bad);
  assert.strictEqual(bad.rows, null);
  assert.strictEqual(bad.error, 'lean');
  assert.ok(!('lean' in bad));
  // the request asks for it
  assert.match(src, /post\(\{readAnswers: 1, lean: 1,/);
});
