// The admin's badge on the leaderboards (sheet vNEXT; Pierre, 2026-11-09: "a small icon next to my name on the
// leaderboard, a wink at the fact that I'm the admin, an icon the others are not allowed to have"): the accounts the admin
// marks from the admin page (Code.gs users_ userBadge, with the GitHub token) carry a 4th field 1 on their rows of every
// board (board_), kept by code hash in the script's properties (badges_), never from anything a player sends; a delete, a
// merge or an archive drops the mark, so a new account under the name never inherits it (rule D7). The app draws the
// badge outside the name's text (progress.js BADGE_SVG, core.js boardBadge), and a new name holding one of the badge's
// emoji look-alikes is refused as reserved (core.js reservedName). Made-up names; the in-memory sheet (tests/gas.js),
// nothing leaves this process (rule D1).
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
  TOK = 'ghp_write000000000000000000';
const BOARDS = C.SUBJECTS.filter(S => S.board);
const FUNITS = ['f:Damselfishes', 'f:Butterflyfishes'];
const data = () => ({
  [C.subjKey('coral', 'progress')]: JSON.stringify({Acropora: {ok: 3, ko: 0, pg: 0.6}}),
  [C.subjKey('fish', 'progress')]: JSON.stringify({'f:Damselfishes': {ok: 2, ko: 0, pg: 0.5}})
});
// A player's save, as the app sends it; extra goes into the summary (what a player could try to claim with).
const play = (s, name, pin, extra = {}, more = {}) =>
  s.post({
    name,
    pin,
    data: Object.assign(data(), more),
    summary: {genera: {Acropora: 'mid', Montipora: 'new'}, board: 1, boards: {fish: FUNITS}, ...extra},
    answers: []
  });
const board = (s, S) => s.get({board: '1', s: S.id}).rows;
const marked = (s, S) =>
  board(s, S)
    .filter(r => r.length > 3)
    .map(r => [r[0], r[3]]);
const users = s => s.post({users: 1, token: TOK}).users;

test('the badge: only on the account the admin marked, on every board, never settable without the token', () => {
  const s = loadCodeGs();
  ['Ana B.', 'Cy D.', 'Dee E.'].forEach((n, i) => assert.ok(play(s, n, '123' + i).ok, n));
  BOARDS.forEach(S => assert.deepStrictEqual(marked(s, S), [], 'nobody has it at first: ' + S.id));
  // Without the token, or with a wrong one: refused, nothing kept.
  assert.strictEqual(s.post({userBadge: 'Ana B.', on: true}).error, 'token');
  assert.strictEqual(s.post({userBadge: 'Ana B.', on: true, token: 'ghp_wrong00000000000000000'}).error, 'token');
  assert.strictEqual(s.props.BADGES, undefined);
  // A player's own save claims nothing: a badge in the summary, the data or the request is ignored.
  assert.ok(play(s, 'Cy D.', '1231', {badge: 1, admin: 1}, {_badge: '1', 'reefid-sync-badge': '1'}).ok);
  assert.ok(s.post({name: 'Dee E.', pin: '1232', data: data(), summary: {board: 1}, answers: [], userBadge: 'Dee E.', on: true}).error);
  BOARDS.forEach(S => assert.deepStrictEqual(marked(s, S), [], 'still nobody: ' + S.id));
  // The admin marks one account (any capitalisation, as every name): every board shows it at once (caches dropped).
  assert.deepStrictEqual(s.post({userBadge: 'ana b.', on: true, token: TOK}), {ok: true, badge: 1, v: s.post({users: 1, token: TOK}).v});
  BOARDS.forEach(S => {
    assert.deepStrictEqual(marked(s, S), [['Ana B.', 1]], S.id);
    board(s, S)
      .filter(r => r[0] !== 'Ana B.')
      .forEach(r => assert.strictEqual(r.length, 3, r[0]));
  });
  assert.deepStrictEqual(
    users(s)
      .filter(u => u.badge)
      .map(u => u.name),
    ['Ana B.']
  );
  // The mark is not the name: the property holds the code hash only.
  assert.ok(!/Ana/i.test(s.props.BADGES), s.props.BADGES);
  // The marked player's own saves keep it.
  assert.ok(play(s, 'Ana B.', '1230').ok);
  assert.deepStrictEqual(marked(s, BOARDS[0]), [['Ana B.', 1]]);
  // Taken back: gone from every board.
  assert.strictEqual(s.post({userBadge: 'Ana B.', on: false, token: TOK}).badge, 0);
  BOARDS.forEach(S => assert.deepStrictEqual(marked(s, S), [], S.id));
  assert.strictEqual(s.props.BADGES, undefined);
  assert.strictEqual(s.post({userBadge: 'Nobody', on: true, token: TOK}).error, 'user');
});

test('a delete, a merge or an archive drops the mark: a new account under the name never inherits it', () => {
  const s = loadCodeGs();
  ['Ana B.', 'Cy D.', 'Dee E.', 'Eve F.'].forEach((n, i) => assert.ok(play(s, n, '123' + i).ok, n));
  ['Ana B.', 'Cy D.', 'Dee E.'].forEach(n => assert.ok(s.post({userBadge: n, on: true, token: TOK}).ok, n));
  assert.strictEqual(JSON.parse(s.props.BADGES).length, 3);
  // Delete: the mark goes; the name taken again (another code) has none.
  assert.ok(s.post({userDelete: 'Ana B.', token: TOK}).ok);
  // Archive: the mark goes; the archive is on no board and cannot get one.
  assert.ok(s.post({userArchive: {from: 'Cy D.', into: 'Cy-old'}, token: TOK}).ok);
  assert.strictEqual(s.post({userBadge: 'Cy-old', on: true, token: TOK}).error, 'archived');
  // Merge: the merged name's mark goes, the kept name keeps its own (none here).
  assert.ok(s.post({userMerge: {from: 'Dee E.', into: 'Eve F.', data: data()}, token: TOK}).ok);
  assert.strictEqual(s.props.BADGES, undefined, 'nothing left of the three');
  assert.ok(play(s, 'Ana B.', '9999').ok);
  assert.ok(play(s, 'Cy D.', '9998').ok);
  BOARDS.forEach(S => assert.deepStrictEqual(marked(s, S), [], S.id));
  assert.ok(users(s).every(u => !u.badge));
});

test("the badge's emoji look-alikes: refused for a new account or an archive name; an account that has one keeps working", () => {
  const {BADGE_LOOKALIKES, reservedName} = C;
  // 🌱 🌿 🪴 ☘ 🍀 🍃, alone, with the emoji variation selector, inside a word or after a name.
  BADGE_LOOKALIKES.forEach(e =>
    [e, e + '️', 'Bob ' + e, e + 'Bob', 'B' + e + 'ob', 'Ana B. ' + e + e].forEach(n =>
      assert.strictEqual(reservedName(n), true, JSON.stringify(n))
    )
  );
  // Other emoji, accents and scripts are names like any other.
  ['Ana 🐠', 'Bob 🌸', '🌊 Cy', 'Zoë', 'José 🌴', '李', 'Ana B.'].forEach(n => assert.strictEqual(reservedName(n), false, n));
  const s = loadCodeGs();
  madeBefore(s, () => assert.ok(play(s, 'Old 🌱', '1111').ok));
  ['🌱', 'Ana 🌱', 'Ana🌿', '☘️ Cy', 'Bob 🍀', '🪴', 'Dee 🍃'].forEach(name => {
    const r = play(s, name, '1234');
    assert.strictEqual(r.error, 'reserved', name);
  });
  assert.deepStrictEqual(
    s.sheets.RAs.rows.slice(1).map(r => r[0]),
    ['Old 🌱']
  );
  // The existing account loads and saves as before, but its seedling is text in its name, never the badge.
  assert.strictEqual(s.get({name: 'Old 🌱', pin: '1111'}).found, true);
  assert.ok(play(s, 'Old 🌱', '1111').ok);
  assert.deepStrictEqual(
    board(s, BOARDS[0]).map(r => r.length),
    [3]
  );
  // An archive under a look-alike: refused.
  assert.strictEqual(s.post({userArchive: {from: 'Old 🌱', into: 'Old 🍀 archive'}, token: TOK}).error, 'reserved');
});

// The app's board (progress.js paintBoard): the badge is drawn after the name's element, outside its text, only on a
// marked row of a script that sends the mark; every name is escaped. A DOM stub: the list's HTML is read as written.
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
    esc: C.esc || (t => String(t).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c])),
    boardBadge: C.boardBadge,
    SUBJ: {},
    innerHeight: 800,
    boardSubj: () => ({})
  };
  vm.createContext(ctx);
  const src = read('progress.js');
  vm.runInContext(block(src, 'const BADGE_SVG = ', '\n', {file: 'progress.js'}) + '\nthis.BADGE_SVG = BADGE_SVG;', ctx);
  vm.runInContext(
    block(src, 'const boardMe = ', '\n', {file: 'progress.js'}) +
      '\n' +
      block(src, 'function paintBoard(', '\n}\n', {through: 1, file: 'progress.js'}) +
      '\nthis.paintBoard = paintBoard;',
    ctx
  );
  ctx.paintBoard({rows, v}, ctx.SUBJ);
  return {html: box.innerHTML, svg: ctx.BADGE_SVG};
};

test('the app draws the badge outside the name, on marked rows from a script that sends the mark; names escaped', () => {
  const rows = [
    ['Ana B.', 80, 1.2, 1],
    ['<img src=x onerror=alert(1)> 🌱', 70, null],
    ['Cy & "D"', 60, null, 0]
  ];
  const {html, svg} = paint(rows, C.BADGE_SHEET);
  assert.match(svg, /^<svg class="badm"[^>]* role="img" aria-label="Admin"><title>Admin<\/title>/);
  assert.ok(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(svg), 'the badge is a drawing, no emoji or text glyph');
  const li = html.match(/<li[^>]*>.*?<\/li>/g);
  assert.strictEqual(li.length, 3);
  // Row 1: the name's own element, closed, then the drawing.
  assert.ok(li[0].includes('<b class="bname">Ana B.</b>' + svg), li[0]);
  // Row 2: a seedling typed into a name stays inside the name's element; no drawing; the markup is escaped.
  assert.ok(li[1].includes('<b class="bname">&lt;img src=x onerror=alert(1)&gt; 🌱</b></span>'), li[1]);
  assert.ok(!li[1].includes('<svg') && !li[1].includes('<img'), li[1]);
  assert.ok(li[2].includes('<b class="bname">Cy &amp; &quot;D&quot;</b></span>') && !li[2].includes('<svg'), li[2]);
  // Exactly one drawing, never inside a name's element.
  assert.strictEqual(html.split('<svg').length - 1, 1);
  (html.match(/<b class="bname">.*?<\/b>/g) || []).forEach(b => assert.ok(!b.includes('<svg'), b));
  // An older script (no version, or below the gate): no badge, a 4th field or not.
  [undefined, C.BADGE_SHEET - 1].forEach(v => assert.ok(!paint(rows, v).html.includes('<svg'), String(v)));
});
