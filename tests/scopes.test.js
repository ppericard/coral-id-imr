require('./slot.js').testGuard();
// Staff and cohort leaderboards (sheet v171; Pierre, 2026-11-17: "le staff aurait un leaderboard permanent, et chaque
// nouvelle cohorte aurait un leaderboard indépendant ... sans polluer le top du leaderboard des étudiants"): every
// subject's board reply splits its one ranking (Code.gs board_) into the general board without the staff (rows), the
// staff's (the trainer role, roles step 1: staff) and each cohort's (the admin's cohorts in the Groups tab: cohorts),
// all by the same order; the cache follows a cohort change and a trainer grant or revoke. Against the in-memory sheet
// only (rule D1); made-up names.
const test = require('node:test'),
  assert = require('node:assert'),
  vm = require('vm');
const {loadCodeGs} = require('./gas.js');
const C = require('../core.js');

const TOK = 'ghp_write000000000000000000',
  IMR = 'instance:imr',
  NOV = 'RA November 2026',
  DEC = 'RA December 2026';
const GENERA = {Acropora: 'mid', Montipora: 'new', Porites: 'new', Pocillopora: 'new'};
const BOARDS = C.SUBJECTS.filter(S => S.board),
  BETA = (C.SUBJECTS.find(C.subjGroup) || {}).id; // a subject that opens to a group (its beta group)
// A player whose saved progress in every subject with a board is n right answers on one unit (their % grows with n).
function save(s, name, n, pin = '1234', extra = {}) {
  const data = Object.fromEntries(
    BOARDS.map(S => [
      C.subjKey(S.id, 'progress'),
      JSON.stringify({[S.id === 'coral' ? 'Acropora' : 'f:Damselfishes']: {ok: n, ko: 0, pg: n / 40}})
    ])
  );
  const r = s.post({
    name,
    pin,
    data,
    summary: {genera: GENERA, board: 1, boards: {fish: ['f:Damselfishes', 'f:Wrasses']}, ...extra},
    answers: []
  });
  assert.ok(r.ok, JSON.stringify(r).slice(0, 200));
  return r;
}
const board = (s, S = BOARDS[0]) => s.get({board: '1', s: S.id});
const names = L => L.map(r => r[0]);
const cohort = (s, who, c, on = true) => s.post({userGroup: who, cohort: c, on, token: TOK});
const grant = (s, account, role = 'trainer') => s.post({roleGrant: {account, role, scope: IMR}, token: TOK});
const revoke = (s, account, role = 'trainer') => s.post({roleRevoke: {account, role, scope: IMR}, token: TOK});
// Five players, Ana first and Eve last by progress.
function five() {
  const s = loadCodeGs();
  [
    ['Ana', 30],
    ['Ben', 24],
    ['Cy', 18],
    ['Dee', 12],
    ['Eve', 6]
  ].forEach(([n, k]) => save(s, n, k));
  return s;
}

test('no staff and no cohort: the general board as before, an empty staff board, no cohort', () => {
  const s = five();
  BOARDS.forEach(S => {
    const B = board(s, S);
    assert.deepStrictEqual(names(B.rows), ['Ana', 'Ben', 'Cy', 'Dee', 'Eve'], S.id);
    assert.deepStrictEqual([B.staff, B.cohorts], [[], []], S.id);
  });
});

test('the staff (the trainer role) leave the general board for their own, ranked the same way, on every subject', () => {
  const s = five();
  const before = board(s).rows;
  assert.strictEqual(grant(s, 'Ben').result, 'ok');
  assert.strictEqual(grant(s, 'Dee').result, 'ok');
  assert.strictEqual(grant(s, 'Cy', 'editor').result, 'ok'); // another role: not staff
  BOARDS.forEach(S => {
    const B = board(s, S);
    assert.deepStrictEqual(names(B.rows), ['Ana', 'Cy', 'Eve'], S.id + ': the general board without the staff');
    assert.deepStrictEqual(names(B.staff), ['Ben', 'Dee'], S.id + ': the staff board');
  });
  // The same rows, the same values: a filter over one ranking (rule D8: one computation).
  const B = board(s);
  assert.deepStrictEqual(
    [...B.rows, ...B.staff].sort((a, b) => (a[0] < b[0] ? -1 : 1)),
    before.slice().sort((a, b) => (a[0] < b[0] ? -1 : 1))
  );
  // Revoked: back on the general board at once (the cache dropped).
  assert.strictEqual(revoke(s, 'Ben').result, 'ok');
  assert.deepStrictEqual(names(board(s).rows), ['Ana', 'Ben', 'Cy', 'Eve']);
  assert.deepStrictEqual(names(board(s).staff), ['Dee']);
});

test('a trainer grant to another code hash (a name taken again) is no staff', () => {
  const s = five();
  grant(s, 'Ben');
  const T = s.sheets.Roles;
  T.rows.slice(1).forEach(r => r[0] === 'Ben' && (r[4] = 'another-hash'));
  Object.keys(s.cache).forEach(k => /^board14/.test(k) && delete s.cache[k]);
  assert.deepStrictEqual(board(s).staff, []);
  assert.ok(names(board(s).rows).includes('Ben'));
});

test('cohorts: made by their first member, ranked by the same %, the staff never on them, the newest first', () => {
  const s = five();
  const r = cohort(s, ['Ana', 'Cy', 'Eve'], NOV);
  assert.deepStrictEqual([r.ok, r.cohort, r.n, r.members], [true, NOV, 3, 3]);
  assert.strictEqual(cohort(s, 'Dee', DEC).members, 1);
  grant(s, 'Eve');
  BOARDS.forEach(S => {
    const B = board(s, S);
    assert.deepStrictEqual(
      B.cohorts.map(c => [c.n, names(c.rows)]),
      [
        [DEC, ['Dee']],
        [NOV, ['Ana', 'Cy']]
      ],
      S.id + ': the newest cohort first, the trainer Eve on none'
    );
    // A cohort's rows are the general board's, in its order.
    const g = B.rows.filter(x => ['Ana', 'Cy'].includes(x[0]));
    assert.deepStrictEqual(B.cohorts[1].rows, g, S.id);
    assert.deepStrictEqual(names(B.rows), ['Ana', 'Ben', 'Cy', 'Dee'], S.id + ': cohort members stay on the general board');
    assert.deepStrictEqual(names(B.staff), ['Eve'], S.id);
  });
  // The Groups tab: a cohort row is its display name after cohort:, the beta groups untouched.
  assert.ok(s.sheets.Groups.rows.slice(1).every(x => String(x[0]).startsWith('cohort:')));
});

test('one cohort per player: added to another, a player leaves the first; removed, a cohort with no member is gone', () => {
  const s = five();
  cohort(s, ['Ana', 'Ben'], NOV);
  board(s); // cached
  const r = cohort(s, 'Ana', DEC);
  assert.deepStrictEqual([r.n, r.members], [1, 1]);
  let B = board(s);
  assert.deepStrictEqual(
    B.cohorts.map(c => [c.n, names(c.rows)]),
    [
      [DEC, ['Ana']],
      [NOV, ['Ben']]
    ],
    'the cache followed'
  );
  assert.strictEqual(cohort(s, 'Ben', NOV, false).n, 1);
  B = board(s);
  assert.deepStrictEqual(
    B.cohorts.map(c => c.n),
    [DEC]
  );
  // Adding a member twice changes nothing.
  assert.strictEqual(cohort(s, 'Ana', DEC).n, 0);
});

test('the opt-out, an admin hide and an archive hold on the staff and cohort boards', () => {
  const s = five();
  save(s, 'Fay', 20, '1234', {board: 0}); // opted out
  cohort(s, ['Ana', 'Ben', 'Fay'], NOV);
  grant(s, 'Cy');
  grant(s, 'Dee');
  s.post({userBoard: 'Ben', hide: true, token: TOK});
  s.post({userBoard: 'Dee', hide: true, token: TOK});
  const B = board(s);
  assert.deepStrictEqual(names(B.cohorts[0].rows), ['Ana']);
  assert.deepStrictEqual(names(B.staff), ['Cy']);
  assert.ok(!names(B.rows).includes('Fay'));
});

test('a cohort name: free text, trimmed, 40 characters at most; refused when empty or with a control character', () => {
  const s = five();
  ['', '   ', 'x'.repeat(41), 'a\u0007b'].forEach(n => assert.strictEqual(cohort(s, 'Ana', n).error, 'group', JSON.stringify(n)));
  assert.strictEqual(cohort(s, 'Ana', '  RA   Nov  ').cohort, 'RA Nov');
  assert.strictEqual(cohort(s, 'Ana', '=1+1').cohort, '=1+1', 'kept as text: the cell starts with cohort:');
  assert.strictEqual(cohort(s, 'Nobody', NOV).error, 'user');
  assert.strictEqual(s.post({userGroup: 'Ana', cohort: NOV, on: true}).error, 'token', 'admin only');
});

test("a subject's beta group and a cohort live side by side in the Groups tab", {skip: !BETA && 'no subject in beta'}, () => {
  const s = five();
  assert.ok(s.post({userGroup: 'Ana', group: BETA, on: true, token: TOK}).ok);
  cohort(s, 'Ana', NOV);
  const g = s.get({name: 'Ana', pin: '1234'});
  assert.deepStrictEqual([g.groups, g.cohort], [[BETA], NOV], 'the load reply: the beta groups, the cohort apart');
  assert.strictEqual(save(s, 'Ana', 31).cohort, NOV, 'the save reply too');
  assert.strictEqual(s.get({name: 'Ben', pin: '1234'}).cohort, '', 'in none');
  const U = s.post({users: 1, token: TOK}).users;
  const ana = U.find(u => u.name === 'Ana');
  assert.deepStrictEqual([ana.groups, ana.cohort, ana.staff], [[BETA], NOV, undefined]);
  grant(s, 'Ben');
  assert.strictEqual(s.post({users: 1, token: TOK}).users.find(u => u.name === 'Ben').staff, 1, 'the player list marks the staff');
  // Out of the beta: the cohort stays.
  s.post({userGroup: 'Ana', group: BETA, on: false, token: TOK});
  assert.strictEqual(s.get({name: 'Ana', pin: '1234'}).cohort, NOV);
});

test('a merge keeps the kept name its cohort; a delete and an archive leave every cohort', () => {
  const s = five();
  cohort(s, 'Ana', NOV);
  cohort(s, 'Ben', DEC);
  cohort(s, 'Cy', DEC);
  assert.ok(s.post({userMerge: {from: 'Ana', into: 'Ben', data: {}}, token: TOK}).ok);
  assert.strictEqual(s.get({name: 'Ben', pin: '1234'}).cohort, DEC, "Ben keeps his; Ana's is gone");
  assert.deepStrictEqual(
    board(s).cohorts.map(c => c.n),
    [DEC]
  );
  // into in no cohort: the merged name's joins it.
  cohort(s, 'Dee', NOV);
  assert.ok(s.post({userMerge: {from: 'Dee', into: 'Eve', data: {}}, token: TOK}).ok);
  assert.strictEqual(s.get({name: 'Eve', pin: '1234'}).cohort, NOV);
  assert.ok(s.post({userDelete: 'Cy', answers: true, token: TOK}).ok);
  assert.ok(s.post({userArchive: {from: 'Eve', into: 'Eve-old'}, token: TOK}).ok);
  assert.deepStrictEqual(
    board(s).cohorts.map(c => c.n),
    [DEC]
  );
  assert.strictEqual(s.get({name: 'Ben', pin: '1234'}).cohort, DEC);
  assert.ok(!s.sheets.Groups.rows.slice(1).some(r => ['cy', 'eve', 'eve-old', 'dee', 'ana'].includes(String(r[1]).toLowerCase())));
});

test('the board cache: one entry per subject holds every scope; served from it until a change drops it', () => {
  const s = five();
  cohort(s, 'Ana', NOV);
  grant(s, 'Eve');
  const B = board(s);
  const key = vm.runInContext('boardCache_(CORE_.SUBJECTS.find(S => S.board))', s.ctx);
  const hit = JSON.parse(s.cache[key]);
  assert.deepStrictEqual([hit.rows, hit.staff, hit.cohorts], JSON.parse(JSON.stringify([B.rows, B.staff, B.cohorts])));
  // A save does not drop it (5 minutes, as before): a player's new % shows at the next computation.
  save(s, 'Ben', 39);
  assert.deepStrictEqual(names(board(s).rows), names(B.rows));
  // A beta group change does not move a board, but drops nothing it should keep either; a cohort or a role does.
  ['cohort', 'grant', 'revoke'].forEach(how => {
    board(s);
    assert.ok(s.cache[key], how + ': cached');
    if (how === 'cohort') cohort(s, 'Cy', NOV);
    else if (how === 'grant') grant(s, 'Dee');
    else revoke(s, 'Dee');
    assert.ok(!s.cache[key], how + ': every board dropped');
  });
});
