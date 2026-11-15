// The leaderboard tree kept in chunks, sent only when it changed (Pierre, 2026-11-15, Q375: "ok";
// docs/reviews/2026-11-14-species-step1.md (c) A): Code.gs boardTreePut_, boardTreeGet_, boardUnitsSave_'s bt, boardLog_;
// sync.js TREE_SHEET, boardUnits, treesSeen. The sync script runs on an in-memory sheet (tests/gas.js, whose script
// properties throw over 9 kB as Apps Script's do), the app's own sync code on stubs (tests/syncpage.js): nothing leaves
// this process (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const {page, withData, loadCodeGs} = require('./syncpage.js');

const TREE = Number(/const TREE_SHEET = (\d+);/.exec(fs.readFileSync(path.join(__dirname, '..', 'sync.js'), 'utf8'))[1]);
const K = C.subjectOf('fish').score;
const same = (a, b, m) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), m);
const sumOf = T => C.dataSum({t: JSON.stringify({f: T.f, s: T.s})});
const fish = P => ({
  'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 3, ko: 0}}),
  'reefid-sync-fish-progress': JSON.stringify(P)
});
const keys = s => Object.keys(s.props).filter(k => k.startsWith('BOARD_UNITS_fish@'));
const logRows = s => (s.sheets['Deploy log'] ? s.sheets['Deploy log'].rows.slice(1).map(r => String(r[1])) : []);
const fresh = s => Object.keys(s.cache).forEach(k => delete s.cache[k]);
// A tree of at least `chars` characters, one entry and one unit per species (Q362), as the species level will send.
function bigTree(chars) {
  const f = Array.from({length: 60}, (_, i) => ['f:Family' + i, 1 + (i % 7), 1 + (i % 3)]),
    s = [];
  for (let i = 0; JSON.stringify({f, s}).length < chars; i++)
    s.push([Math.round(1e4 / (1 + i)) / 1e4, 'g:Genus' + (i % 200), '', ['s' + (1000 + i) + ':speciesname' + i], 1 + (i % 3)]);
  return {f, s};
}
const small = {f: [['f:Family0', 3, 1]], s: [[3, 'g:Genus0', '', null, 1]]};
const P = {
  'f:Family0': {ok: 9, ko: 0, mx: 1},
  'g:Genus0': {ok: 9, ko: 0, mx: 1},
  's1000:speciesname0': {ok: 9, ko: 0, mx: 1},
  '~level': {ok: 220, ko: 30, th: 1}
};
const save = (s, boards, name = 'Ana', pin = '1234') =>
  s.post({name, pin, data: fish(P), summary: {board: 1, ...(boards ? {boards} : {})}, answers: []});

test('the sheet: a 30,000-character tree is kept in chunks under the 9 kB limit, read back whole, and ranks the board', () => {
  const s = loadCodeGs(),
    T = bigTree(30000),
    json = JSON.stringify(T),
    sum = sumOf(T);
  assert.ok(json.length >= 30000 && json.length < 30200 && T.s.length < 1500, json.length + ' characters');
  const r = save(s, {fish: T});
  assert.strictEqual(r.ok, true);
  same(r.bt, {fish: sum}, 'the reply names the tree the sheet now holds');
  const n = keys(s).length;
  assert.ok(n >= 4, n + ' chunks');
  assert.strictEqual(s.props.BOARD_UNITS_fish, '@' + n + ' ' + sum, "the subject's key points at them");
  keys(s).forEach(k => assert.ok(s.props[k].length <= 8000 && k.startsWith('BOARD_UNITS_fish@' + sum + '#'), k));
  same(s.ctx.boardUnits_({id: 'fish'}), T, 'read back whole');
  const want = C.treeScore(P, T, K).pct;
  assert.ok(want > 0);
  same(s.get({board: '1', s: 'fish'}).rows, [['Ana', want, 1]], 'the board ranks by treeScore over the whole tree, as My progress');
  // The same tree again writes nothing; a smaller one replaces it, and the big one's chunks go.
  const board = () => JSON.stringify(Object.entries(s.props).filter(([k]) => k.startsWith('BOARD_UNITS_')));
  const before = board();
  same(save(s, {fish: T}).bt, {fish: sum});
  assert.strictEqual(board(), before, 'unchanged');
  same(save(s, {fish: small}).bt, {fish: sumOf(small)});
  same(keys(s), ['BOARD_UNITS_fish@' + sumOf(small) + '#0'], 'one chunk left, the new tree’s');
  same(s.ctx.boardUnits_({id: 'fish'}), small);
  // A save without a tree still says which tree the sheet holds; a list from an app before the score never replaces it.
  same(save(s, null).bt, {fish: sumOf(small)});
  same(save(s, {fish: ['f:Family0', 'f:Family1']}).bt, {fish: sumOf(small)});
  same(s.ctx.boardUnits_({id: 'fish'}), small);
  assert.deepStrictEqual(logRows(s), [], 'nothing logged');
});

// The species level's own tree (core.js fishScoreTree with the species on, one unit per species: s:s091): the sheet keeps
// it, reads it back whole and ranks the board by treeScore over it, the species' common names counted.
test('the sheet: the species level’s tree, on the real fish.json, is kept, read back and ranks the board', () => {
  const s = loadCodeGs(),
    F = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish.json'), 'utf8')),
    T = C.fishScoreTree(C.fishGen(F, {}), F, true),
    units = T.s.flatMap(e => e[3] || []);
  assert.ok(units.length > 600 && units.every(u => /^s:s\d+$/.test(u)), units.length + ' species units');
  const r = save(s, {fish: T});
  assert.strictEqual(r.ok, true);
  same(r.bt, {fish: sumOf(T)});
  same(s.ctx.boardUnits_({id: 'fish'}), T, 'read back whole');
  assert.deepStrictEqual(logRows(s), [], 'nothing refused');
  // a player with a family learned and a species at Advanced: the board's % is My progress's, the species counted
  const Q = {[T.f[0][0]]: {ok: 9, ko: 0, mx: 1}, [units[0]]: {ok: 9, ko: 0, mx: 1}, '~level': {ok: 220, ko: 30, th: 1}},
    want = C.treeScore(Q, T, K).pct;
  assert.ok(want > C.treeScore({[T.f[0][0]]: Q[T.f[0][0]]}, T, K).pct);
  s.post({name: 'Bea', pin: '1234', data: fish(Q), summary: {board: 1, boards: {fish: T}}, answers: []});
  assert.ok(s.get({board: '1', s: 'fish'}).rows.some(x => x[0] === 'Bea' && x[1] === want));
});

test('the sheet: a tree an older script kept as one JSON text is read as before, and a new tree replaces it', () => {
  const s = loadCodeGs();
  s.props.BOARD_UNITS_fish = JSON.stringify(small);
  same(s.ctx.boardUnits_({id: 'fish'}), small);
  same(save(s, null).bt, {fish: sumOf(small)}, 'its checksum, as if kept in chunks');
  same(save(s, {fish: ['f:Family0']}).bt, {fish: sumOf(small)}, 'a list never replaces it');
  same(s.get({board: '1', s: 'fish'}).rows, [['Ana', C.treeScore(P, small, K).pct, 1]]);
  const T = bigTree(20000);
  same(save(s, {fish: T}).bt, {fish: sumOf(T)});
  assert.match(s.props.BOARD_UNITS_fish, /^@\d+ /);
  same(s.ctx.boardUnits_({id: 'fish'}), T);
});

test('the sheet: a malformed tree or chunk is refused, the board keeps or drops it, and a line goes to the Deploy log once', () => {
  const s = loadCodeGs(),
    T = bigTree(30000),
    sum = sumOf(T);
  save(s, {fish: T});
  // Sent: one malformed species entry deep in the tree (a formula-like unit), or a tree over the cap.
  const bad = JSON.parse(JSON.stringify(T));
  bad.s[400][3] = ['=SUM(A1)'];
  same(save(s, {fish: bad}).bt, {fish: sum}, 'refused: the sheet still holds the tree it had');
  same(save(s, {fish: bad}).bt, {fish: sum});
  same(s.ctx.boardUnits_({id: 'fish'}), T, 'kept');
  assert.deepStrictEqual(
    logRows(s),
    ['Leaderboard (fish): a tree sent was refused (species entry 400 malformed); the board keeps the one it holds'],
    'logged once, not with every save'
  );
  save(s, {fish: bigTree(51000)});
  assert.match(logRows(s)[1], /^Leaderboard \(fish\): a tree sent was refused \(\d+ characters \(at most 50000\)\)/);
  same(s.ctx.boardUnits_({id: 'fish'}), T);
  // Kept: a chunk altered by hand. The board reads no tree (no %, as before any was sent), and says why in the log.
  const k1 = 'BOARD_UNITS_fish@' + sum + '#1',
    good = s.props[k1];
  s.props[k1] = '{"f":[],"s":[[1,"=SUM(A1)","",null,1]]}';
  fresh(s);
  same(s.get({board: '1', s: 'fish'}).rows, [['Ana', null, 1]]);
  assert.match(logRows(s)[2], /^Leaderboard \(fish\): the kept tree cannot be read \(chunk 1 malformed\)/);
  s.props[k1] = good.replace('"g:', '"g:X');
  fresh(s);
  assert.strictEqual(s.ctx.boardUnits_({id: 'fish'}).length, 0);
  assert.match(logRows(s)[3], /cannot be read \(checksum differs\)/, 'well formed, but not the tree the key names');
  delete s.props[k1];
  assert.strictEqual(s.ctx.boardUnits_({id: 'fish'}).length, 0);
  assert.match(logRows(s)[4], /cannot be read \(a chunk missing\)/);
  assert.strictEqual(logRows(s).length, 5);
  // An app sends the same tree again (its key still names it): the save writes it again, whole, a chunk gone or altered.
  same(save(s, {fish: T}).bt, {fish: sum});
  same(s.ctx.boardUnits_({id: 'fish'}), T);
  s.props[k1] = '{"f":[],"s":[[1,"=SUM(A1)","",null,1]]}';
  same(save(s, {fish: T}).bt, {fish: sum});
  same(s.ctx.boardUnits_({id: 'fish'}), T);
  assert.strictEqual(s.props[k1], good);
});

test('the sheet: a tree replaced while the board reads it is read whole, the new one; a failed step is logged and its reply has no bt', () => {
  const s = loadCodeGs(),
    A = bigTree(20000),
    B = bigTree(25000);
  save(s, {fish: A});
  // The first chunk read of A's lets a save of B in (board_ takes no lock): A's chunks are gone when the read goes on.
  const props = s.ctx.PropertiesService.getScriptProperties();
  let raced = false;
  s.ctx.PropertiesService = {
    getScriptProperties: () => ({
      ...props,
      getProperty: k => {
        const v = props.getProperty(k);
        if (!raced && k.startsWith('BOARD_UNITS_fish@' + sumOf(A) + '#'))
          ((raced = true), s.ctx.boardTreePut_({id: 'fish'}, JSON.stringify(B)));
        return v;
      }
    })
  };
  same(s.ctx.boardUnits_({id: 'fish'}), B);
  assert.ok(raced);
  s.ctx.PropertiesService = {getScriptProperties: () => props};
  assert.deepStrictEqual(logRows(s), []);
  // The leaderboard step throws: the save goes through, logged, and its reply carries no bt (the app sends again).
  vm.runInContext('boardUnitsSave_ = () => { throw new Error("quota") }', s.ctx);
  const r = save(s, {fish: A});
  assert.ok(r.ok && !('bt' in r));
  same(logRows(s), ['Leaderboard (save): the leaderboard step failed: quota']);
});

// The app (sync.js) on the sheet: UNITS fish as app.js builds it, its tree given.
const acct = () => ({name: 'Ana', pin: '1234', log: [], base: {}});
function app(s, v, tree) {
  const A = page(s, {v, SYNC: acct()});
  A.ctx.UNITS = {fish: {tree: () => A.tree, slate: () => ['f:Family0']}};
  A.tree = tree;
  // One answer and its sync: the boards of each save it made (the first sync's save adopts the log's replay, then saves
  // again at once: sync.js syncOnce), and whether each carried the fish tree.
  A.turn = async id => {
    const from = A.reqs.length;
    A.play(id);
    await A.syncPush();
    const b = A.reqs
      .slice(from)
      .filter(r => r.kind === 'post' && r.body.summary)
      .map(r => r.body.summary.boards || {});
    assert.ok(b.length, 'a save');
    b.forEach(x => assert.ok(!x.fish || !Array.isArray(x.fish), 'never a list instead of the tree'));
    return Object.assign(b, {fish: b.map(x => !!x.fish)});
  };
  return A;
}
const only1st = b => b.fish[0] && !b.fish.slice(1).some(Boolean);
const none = b => !b.fish.some(Boolean);

test('the app, from TREE_SHEET: the tree goes with one save, then again only once it changed or the sheet holds another', async () => {
  const s = loadCodeGs(withData()),
    T = bigTree(30000),
    A = app(s, TREE, T);
  const b1 = await A.turn('b1');
  assert.ok(only1st(b1), String(b1.fish));
  same(b1[0].fish, T, 'the first save carries it');
  assert.ok(none(await A.turn('b2')), 'unchanged: left out of boards');
  same(A.store.get('reefid-board-trees', null), {fish: {h: sumOf(T), t: sumOf(T)}});
  // Another app sends its own (an app from before TREE_SHEET does with every save): the next reply says so, and the save
  // after it sends this device's tree again.
  save(s, {fish: small}, 'Ben', '1111');
  assert.ok(none(await A.turn('b3')));
  assert.ok(only1st(await A.turn('b4')), 'sent again once the sheet held another tree');
  same(s.ctx.boardUnits_({id: 'fish'}), T);
  // A changed tree (new content) goes with the next save.
  A.tree = bigTree(31000);
  const b5 = await A.turn('b5');
  assert.ok(only1st(b5));
  same(b5[0].fish, A.tree);
  same(s.ctx.boardUnits_({id: 'fish'}), A.tree);
});

test('the app, from TREE_SHEET: a tree the sheet refused is not sent again until it changes; a reply without bt sends it again', async () => {
  const s = loadCodeGs(withData()),
    bad = bigTree(20000);
  bad.s[7][3] = ['=SUM(A1)'];
  const A = app(s, TREE, bad);
  assert.ok(only1st(await A.turn('c1')));
  assert.ok(none(await A.turn('c2')), 'refused once, not sent again');
  same(A.store.get('reefid-board-trees', null), {fish: {h: sumOf(bad), t: ''}});
  assert.strictEqual(logRows(s).length, 1);
  // A good tree, and a sheet whose leaderboard step failed (no bt): sent again with the next save.
  A.tree = bigTree(20000);
  vm.runInContext('globalThis.__save = boardUnitsSave_; boardUnitsSave_ = () => { throw new Error("quota") }', s.ctx);
  assert.ok(only1st(await A.turn('c3')));
  vm.runInContext('boardUnitsSave_ = globalThis.__save', s.ctx);
  assert.ok(only1st(await A.turn('c4')), 'no bt in the reply: sent again');
  assert.ok(none(await A.turn('c5')));
  same(s.ctx.boardUnits_({id: 'fish'}), A.tree);
});

test('the app, before TREE_SHEET: the tree goes with every save, as before, and nothing is kept on the device', async () => {
  const s = loadCodeGs(withData()),
    T = bigTree(8000),
    A = app(s, TREE - 1, T);
  for (const id of ['d1', 'd2', 'd3']) {
    const b = await A.turn(id);
    b.forEach(x => same(x.fish, T));
  }
  assert.strictEqual(A.store.get('reefid-board-trees', null), null);
});
