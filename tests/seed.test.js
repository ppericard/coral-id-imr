// The seedling 🌱 after the admin's account name (sheet vNEXT; Pierre, 2026-11-09, Q328 corrected: "an icon the others
// are not allowed to have", added on its own, the name unchanged, no step for him): the account the admin page is signed
// in to when it reads the answer log with a valid token becomes the admin's account (Code.gs answers_, adminAcct_: its
// code hash, one at most); its leaderboard rows carry a 4th field 1 and its load reply admin: 1, which the app shows as
// a 🌱 after the name, outside the name's text (core.js markRow, markHtml; progress.js paintBoard; sync.js markSeen).
// A delete, a merge or an archive clears it (rule D7), and no player can type the seedling or a look-alike in a new name
// (core.js reservedName). Made-up names; the in-memory sheet (tests/gas.js), nothing leaves this process (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const {loadCodeGs, madeBefore} = require('./gas.js');
const block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  TOK = 'ghp_write000000000000000000',
  SEED = C.SEED;
const BOARDS = C.SUBJECTS.filter(S => S.board),
  FUNITS = ['f:Damselfishes', 'f:Butterflyfishes'];
const data = () => ({
  [C.subjKey('coral', 'progress')]: JSON.stringify({Acropora: {ok: 3, ko: 0, pg: 0.6}}),
  [C.subjKey('fish', 'progress')]: JSON.stringify({'f:Damselfishes': {ok: 2, ko: 0, pg: 0.5}})
});
// A player's save as the app sends it; extra goes into the summary, more into the data (what a player could try to claim with).
const play = (s, name, pin, extra = {}, more = {}) =>
  s.post({
    name,
    pin,
    data: Object.assign(data(), more),
    summary: {genera: {Acropora: 'mid', Montipora: 'new'}, board: 1, boards: {fish: FUNITS}, ...extra},
    answers: []
  });
const names = s => s.sheets.RAs.rows.slice(1).map(r => r[0]);
// The admin page's read of the answer log, signed in to a player account on that browser (admin.js loadStats).
const adminRead = (s, aname, apin, token = TOK) => s.post({readAnswers: 1, aname, apin, token});
const marked = (s, S) =>
  s
    .get({board: '1', s: S.id})
    .rows.filter(r => r.length > 3)
    .map(r => [r[0], r[3]]);
const loadOf = (s, name, pin) => s.get({name, pin});

test('the seedling and its look-alikes: refused for a new account or an archive name; an account that has one keeps working', () => {
  const {SEED_LOOKALIKES, reservedName} = C;
  assert.ok(SEED_LOOKALIKES.includes(SEED));
  // 🌱 🌿 🪴 ☘ 🍀 🍃, alone, with the emoji variation selector, inside a word or after a name.
  SEED_LOOKALIKES.forEach(e =>
    [e, e + '️', 'Bob ' + e, e + 'Bob', 'B' + e + 'ob', 'Ana B. ' + e + e].forEach(n =>
      assert.strictEqual(reservedName(n), true, JSON.stringify(n))
    )
  );
  // Other emoji, accents and scripts are names like any other.
  ['Ana 🐠', 'Bob 🌸', '🌊 Cy', 'Zoë', 'José 🌴', '李', 'Ana B.', 'Rice 🌾'].forEach(n => assert.strictEqual(reservedName(n), false, n));
  const s = loadCodeGs();
  madeBefore(s, () => assert.ok(play(s, 'Old 🍀', '1111').ok));
  ['🌱', 'Ana 🌱', 'Ana🌿', '☘️ Cy', 'Bob 🍀', '🪴', 'Dee 🍃'].forEach(name =>
    assert.strictEqual(play(s, name, '1234').error, 'reserved', name)
  );
  assert.deepStrictEqual(names(s), ['Old 🍀']);
  // The existing account loads and saves as before.
  assert.strictEqual(s.get({name: 'Old 🍀', pin: '1111'}).found, true);
  assert.ok(play(s, 'Old 🍀', '1111').ok);
  // An archive under a look-alike: refused.
  assert.strictEqual(s.post({userArchive: {from: 'Old 🍀', into: 'Old 🌱 archive'}, token: TOK}).error, 'reserved');
});

test("the admin's account: the one the admin page is signed in to, never from a player or without the token", () => {
  const s = loadCodeGs();
  ['Ana B.', 'Cy D.', 'Dee E.'].forEach((n, i) => assert.ok(play(s, n, '123' + i).ok, n));
  BOARDS.forEach(S => assert.deepStrictEqual(marked(s, S), [], 'nobody at first: ' + S.id));
  // No token, a wrong token, a wrong code: nothing kept.
  assert.strictEqual(adminRead(s, 'Ana B.', '1230', null).error, 'token');
  assert.strictEqual(adminRead(s, 'Ana B.', '1230', 'ghp_wrong00000000000000000').error, 'token');
  assert.ok(adminRead(s, 'Ana B.', '9999').ok);
  assert.strictEqual(s.props.ADMIN_ACCT, undefined);
  // A player's save claims nothing: an admin flag in the summary, the data or the request is ignored.
  assert.ok(play(s, 'Cy D.', '1231', {admin: 1, badge: 1}, {_admin: '1', 'reefid-amark': '1'}).ok);
  assert.strictEqual(
    s.post({name: 'Cy D.', pin: '1231', data: data(), summary: {}, answers: [], readAnswers: 1, aname: 'Cy D.', apin: '1231'}).error,
    'token'
  );
  assert.strictEqual(s.props.ADMIN_ACCT, undefined);
  BOARDS.forEach(S => assert.deepStrictEqual(marked(s, S), [], 'still nobody: ' + S.id));
  // The admin page signed in to Ana's account reads the log: Ana's is the admin's account, by code hash, no name kept.
  const r = adminRead(s, 'ana b.', '1230');
  assert.ok(r.ok && r.me, JSON.stringify(r).slice(0, 200));
  assert.ok(s.props.ADMIN_ACCT && !/Ana/i.test(s.props.ADMIN_ACCT));
  BOARDS.forEach(S => {
    assert.deepStrictEqual(marked(s, S), [['Ana B.', 1]], S.id);
    s.get({board: '1', s: S.id})
      .rows.filter(x => x[0] !== 'Ana B.')
      .forEach(x => assert.strictEqual(x.length, 3, x[0]));
  });
  // The name itself is unchanged everywhere: the RAs row, the board's name field, the load.
  assert.deepStrictEqual(names(s), ['Ana B.', 'Cy D.', 'Dee E.']);
  assert.strictEqual(loadOf(s, 'Ana B.', '1230').admin, 1);
  assert.strictEqual(loadOf(s, 'Cy D.', '1231').admin, undefined);
  // Ana's own saves keep it; another account signed in on the admin page replaces it (one at most).
  assert.ok(play(s, 'Ana B.', '1230').ok);
  assert.deepStrictEqual(marked(s, BOARDS[0]), [['Ana B.', 1]]);
  assert.ok(adminRead(s, 'Dee E.', '1232').ok);
  BOARDS.forEach(S => assert.deepStrictEqual(marked(s, S), [['Dee E.', 1]], S.id));
  assert.strictEqual(loadOf(s, 'Ana B.', '1230').admin, undefined);
});

test("a delete, a merge or an archive of the admin's account clears it: a new account under the name never shows it", () => {
  const s = loadCodeGs();
  ['Ana B.', 'Cy D.', 'Dee E.', 'Eve F.'].forEach((n, i) => assert.ok(play(s, n, '123' + i).ok, n));
  const each = [
    ['Ana B.', '1230', () => s.post({userDelete: 'Ana B.', token: TOK})],
    ['Cy D.', '1231', () => s.post({userArchive: {from: 'Cy D.', into: 'Cy-old'}, token: TOK})],
    ['Dee E.', '1232', () => s.post({userMerge: {from: 'Dee E.', into: 'Eve F.', data: data()}, token: TOK})]
  ];
  each.forEach(([n, pin, drop]) => {
    assert.ok(adminRead(s, n, pin).ok);
    assert.ok(s.props.ADMIN_ACCT, n);
    assert.ok(drop().ok, n);
    assert.strictEqual(s.props.ADMIN_ACCT, undefined, n + ': cleared');
    BOARDS.forEach(S => assert.deepStrictEqual(marked(s, S), [], n + ' ' + S.id));
  });
  // The names taken again (another code): no mark. An archived account never becomes the admin's.
  assert.ok(play(s, 'Ana B.', '9999').ok);
  assert.ok(play(s, 'Cy D.', '9998').ok);
  assert.strictEqual(loadOf(s, 'Ana B.', '9999').admin, undefined);
  assert.ok(adminRead(s, 'Cy-old', '1231').ok);
  assert.strictEqual(s.props.ADMIN_ACCT, undefined);
  BOARDS.forEach(S => assert.deepStrictEqual(marked(s, S), [], S.id));
  // The kept account of the merge becomes the admin's at the admin page's next read, signed in to it.
  assert.ok(adminRead(s, 'Eve F.', '1233').ok);
  assert.deepStrictEqual(marked(s, BOARDS[0]), [['Eve F.', 1]]);
});

// The app's board (progress.js paintBoard): the 🌱 after the admin's name element, outside its text, only on the marked
// row of a script that sends the mark; every name escaped. A DOM stub: the list's HTML is read as written.
const paint = (rows, v) => {
  const box = {innerHTML: '', querySelector: () => null};
  const ctx = {
    document: {getElementById: id => (id === 'board' ? box : null)},
    hashNow: () => 'board',
    SYNC: null,
    P: {},
    LEVEL: '~level',
    ELO_MIN: 200,
    boardOn: () => true,
    eloLine: () => '',
    eloScore: x => Math.round(x),
    esc: t => String(t).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]),
    markRow: C.markRow,
    markHtml: C.markHtml,
    SUBJ: {},
    innerHeight: 800
  };
  vm.createContext(ctx);
  const src = read('progress.js');
  vm.runInContext(
    block(src, 'const boardMe = ', '\n', {file: 'progress.js'}) +
      '\n' +
      block(src, 'function paintBoard(', '\n}\n', {through: 1, file: 'progress.js'}) +
      '\nthis.paintBoard = paintBoard;',
    ctx
  );
  ctx.paintBoard({rows, v}, ctx.SUBJ);
  return box.innerHTML;
};

test("the app shows the 🌱 after the admin's name, outside its text, from a script that sends it; names escaped", () => {
  const rows = [
    ['Ana B.', 80, 1.2, 1],
    ['<img src=x onerror=alert(1)>', 70, null],
    ['Cy & "D"', 60, null, 0]
  ];
  const html = paint(rows, C.MARK_SHEET),
    mark = C.markHtml();
  assert.strictEqual(mark, `<span class="amark" role="img" title="Admin" aria-label="Admin">${SEED}</span>`);
  const li = html.match(/<li[^>]*>.*?<\/li>/g);
  assert.strictEqual(li.length, 3);
  assert.ok(li[0].includes('<b class="bname">Ana B.</b>' + mark + '</span>'), li[0]);
  assert.ok(li[1].includes('<b class="bname">&lt;img src=x onerror=alert(1)&gt;</b></span>') && !li[1].includes('<img'), li[1]);
  assert.ok(li[2].includes('<b class="bname">Cy &amp; &quot;D&quot;</b></span>') && !li[2].includes(SEED), li[2]);
  assert.strictEqual(html.split(SEED).length - 1, 1, 'one mark');
  (html.match(/<b class="bname">.*?<\/b>/g) || []).forEach(b => assert.ok(!b.includes(SEED), b));
  [undefined, C.MARK_SHEET - 1].forEach(v => assert.ok(!paint(rows, v).includes(SEED), String(v)));
});

test('the account line: the mark from a load reply of a script that knows the admin, for that account only', () => {
  const mem = {},
    ctx = {store: {get: (k, d) => (k in mem ? mem[k] : d), set: (k, v) => (mem[k] = v)}, MARK_SHEET: C.MARK_SHEET, SYNC: {name: 'Ana B.'}};
  vm.createContext(ctx);
  const src = read('sync.js');
  vm.runInContext(
    block(src, 'const MARK_KEY = ', '\n// The ids of this player', {file: 'sync.js'}) +
      '\nthis.markSeen = markSeen; this.markMine = markMine;',
    ctx
  );
  const {markSeen, markMine} = ctx;
  markSeen({ok: true, found: true, admin: 1, v: C.MARK_SHEET - 1}, 'Ana B.');
  assert.strictEqual(markMine(), false, 'an older script');
  markSeen({ok: true, found: true, admin: 1, v: C.MARK_SHEET}, 'Ana B.');
  assert.strictEqual(markMine(), true);
  markSeen({ok: true, log: true, v: C.MARK_SHEET}, 'Ana B.');
  assert.strictEqual(markMine(), true, 'a save reply changes nothing');
  ctx.SYNC = {name: 'Cy D.'};
  assert.strictEqual(markMine(), false, 'another account on this device');
  ctx.SYNC = {name: 'ana b.'};
  markSeen({ok: true, found: true, v: C.MARK_SHEET}, 'ana b.');
  assert.strictEqual(markMine(), false, "no longer the admin's");
  ctx.SYNC = null;
  assert.strictEqual(markMine(), false);
});
