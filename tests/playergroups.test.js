require('./slot.js').testGuard();
// Player groups ("Staff" is not a role): one group model in place of the beta groups, the one cohort per player and the
// staff (Code.gs groupState_, groupDo_, groupBoards_). A group has a name and two settings, board and beta
// (docs/decisions/2026-11-18-no-apart-groups.md); a player is in any number of groups. Every subject's board reply gives
// the general board, everyone (rows), and each board group's, its members (groups); the migration (ONCE_ groups) makes
// the groups of the older data, nothing lost. Against the in-memory sheet only (rule D1); made-up names.
const test = require('node:test'),
  assert = require('node:assert'),
  vm = require('vm');
const {loadCodeGs} = require('./gas.js');
const C = require('../core.js');

const TOK = 'ghp_write000000000000000000',
  IMR = 'instance:imr';
const GENERA = {Acropora: 'mid', Montipora: 'new', Porites: 'new', Pocillopora: 'new'};
const BOARDS = C.SUBJECTS.filter(S => S.board);
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
const scopes = B => B.groups.map(g => [g.n, names(g.rows)]);
const make = (s, n, o = {}) => s.post({groupMake: {n, ...o}, token: TOK});
const id = (s, n, o) => make(s, n, o).group.id;
const join = (s, who, g, on = true) => s.post({userGroup: who, group: g, on, token: TOK});
const edit = (s, g, o) => s.post({groupEdit: g, ...o, token: TOK});
const run = (s, code) => vm.runInContext(code, s.ctx);
// A grant of the Roles tab as the scripts before the groups carried rights wrote it (the rights migration's data): the
// account's code hash as its RAs row holds it.
const grant = (s, account, role = 'trainer') =>
  run(
    s,
    `(ra => sheet_(ROLES.TAB, ROLES.HEAD).appendRow([${JSON.stringify(account)}, '${role}', '${IMR}', new Date(), String(ra.getRange(find_(ra, ${JSON.stringify(account)}), 7).getValue())]))(sheet_('RAs', HEAD))`
  );
// A subject that opens to a group, set so at runtime (none does today: fish and the sea slugs open to all).
const BETA = 'fish';
const betaOn = s => run(s, `CORE_.SUBJECTS.find(S => S.id === '${BETA}').open = 'group'`);
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

test('no group: the general board as before and no group board, on every subject', () => {
  const s = five();
  BOARDS.forEach(S => {
    const B = board(s, S);
    assert.deepStrictEqual(names(B.rows), ['Ana', 'Ben', 'Cy', 'Dee', 'Eve'], S.id);
    assert.deepStrictEqual(B.groups, [], S.id);
    assert.strictEqual(B.staff, undefined, S.id + ': no staff field (v171) any more');
  });
  const g = s.get({name: 'Ana', pin: '1234'});
  assert.deepStrictEqual([g.groups, g.gids, g.cohort], [[], [], undefined], 'the load reply');
});

test('a group: made with a name and settings; its name unique, 40 characters at most; the admin token only, audited', () => {
  const s = five();
  const r = make(s, '  RA   November 2026 ', {board: true});
  assert.ok(r.ok);
  assert.match(r.group.id, /^g:[0-9a-f]{8}$/);
  assert.deepStrictEqual({...r.group, id: 0, at: 0}, {id: 0, n: 'RA November 2026', board: 1, beta: '', at: 0, rights: []});
  ['', '   ', 'x'.repeat(41), 'a\u0007b'].forEach(n => assert.strictEqual(make(s, n).error, 'name', JSON.stringify(n)));
  assert.strictEqual(make(s, 'ra NOVEMBER 2026').error, 'exists', 'another group has that name, case aside');
  assert.strictEqual(make(s, 'Beta', {beta: 'coral'}).error, 'beta', 'beta: only a subject that opens to a group');
  assert.strictEqual(s.post({groupMake: {n: 'X'}}).error, 'token');
  assert.strictEqual(make(s, '=1+1').group.n, '=1+1', 'kept as text');
  const F = s.sheets['Group settings'].formats;
  assert.deepStrictEqual([F['2,2'], F['3,2']], ['@', '@'], 'every Name cell plain text first: "November 2026" stays text, never a date');
  assert.strictEqual(s.sheets['Group settings'].rows[2][1], '=1+1', 'never a formula in the sheet (the quote prefix, not read back)');
  const L = s.post({users: 1, token: TOK});
  assert.deepStrictEqual(
    L.groupDefs.map(d => [d.n, d.board, d.apart, d.beta]),
    [
      ['RA November 2026', 1, undefined, ''],
      ['=1+1', 0, undefined, '']
    ]
  );
  const A = s.sheets.Audit.rows.slice(1).map(x => [x[2], x[4]]);
  assert.ok(
    A.some(x => x[0] === 'groupMake' && x[1] === 'ok'),
    'audited'
  );
  assert.ok(
    A.some(x => x[0] === 'groupMake' && x[1] === 'exists'),
    'a refusal audited too'
  );
});

test('a player in any number of groups: every reply says which; the boards follow their groups', () => {
  const s = five();
  const nov = id(s, 'RA November 2026', {board: 1}),
    dec = id(s, 'RA December 2026', {board: 1}),
    club = id(s, 'Night dive club'); // no board
  assert.deepStrictEqual([join(s, ['Ana', 'Cy', 'Eve'], nov).members, join(s, ['Ana', 'Dee'], dec).members], [3, 2]);
  assert.strictEqual(join(s, ['Ana', 'Ben'], club).n, 2);
  assert.strictEqual(join(s, 'Ana', nov).n, 0, 'once');
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).gids, [nov, dec, club], 'the load reply');
  assert.deepStrictEqual(save(s, 'Ana', 31).gids, [nov, dec, club], 'the save reply');
  assert.deepStrictEqual(s.post({users: 1, token: TOK}).users.find(u => u.name === 'Ana').gids, [nov, dec, club], 'the player list');
  BOARDS.forEach(S => {
    const B = board(s, S);
    assert.deepStrictEqual(
      scopes(B),
      [
        ['RA December 2026', ['Ana', 'Dee']],
        ['RA November 2026', ['Ana', 'Cy', 'Eve']]
      ],
      S.id + ': each board group, the newest first; a group with no board has none'
    );
    assert.deepStrictEqual(
      B.groups[1].rows,
      B.rows.filter(x => ['Ana', 'Cy', 'Eve'].includes(x[0])),
      S.id + ': the general order'
    );
    assert.deepStrictEqual(names(B.rows), ['Ana', 'Ben', 'Cy', 'Dee', 'Eve'], S.id + ': members stay on the general board');
  });
  assert.strictEqual(join(s, 'Nobody', nov).error, 'user');
  assert.strictEqual(join(s, 'Ana', 'g:00000000').error, 'group');
});

test('no apart: the general board shows everyone, each group board all its members; an old apart is ignored', () => {
  const s = five();
  betaOn(s);
  const staff = id(s, 'Staff', {board: 1, apart: 1}),
    nov = id(s, 'RA November 2026', {board: 1}),
    beta = id(s, 'Beta testers', {beta: BETA});
  join(s, ['Ana', 'Ben', 'Cy'], nov);
  join(s, ['Ben', 'Dee'], staff);
  join(s, 'Ben', beta);
  BOARDS.forEach(S => {
    const B = board(s, S);
    assert.deepStrictEqual(names(B.rows), ['Ana', 'Ben', 'Cy', 'Dee', 'Eve'], S.id + ': everyone on the general board');
    assert.deepStrictEqual(
      scopes(B),
      [
        ['RA November 2026', ['Ana', 'Ben', 'Cy']],
        ['Staff', ['Ben', 'Dee']]
      ],
      S.id + ': Ben on both of his groups’ boards'
    );
  });
  assert.strictEqual(s.sheets['Group settings'].rows[1][3], 0, 'the Apart column written 0');
  // A row an older script wrote with Apart 1 (its staff) changes nothing.
  s.sheets['Group settings'].rows[1][3] = 1;
  run(s, 'boardsDrop_()');
  assert.deepStrictEqual(names(board(s).rows), ['Ana', 'Ben', 'Cy', 'Dee', 'Eve']);
  assert.strictEqual(s.post({users: 1, token: TOK}).groupDefs[0].apart, undefined, 'not served');
  const ben = s.get({name: 'Ben', pin: '1234'});
  assert.deepStrictEqual([ben.gids, ben.groups], [[nov, staff, beta], [BETA]]);
});

test('settings: rename, board on and off, beta; every change reaches the boards at once', () => {
  const s = five();
  betaOn(s);
  const g = id(s, 'Staff', {board: 1});
  join(s, ['Ben', 'Dee'], g);
  assert.deepStrictEqual(scopes(board(s)), [['Staff', ['Ben', 'Dee']]]);
  assert.strictEqual(edit(s, g, {apart: true}).group.apart, undefined, 'apart ignored');
  assert.deepStrictEqual(names(board(s).rows), ['Ana', 'Ben', 'Cy', 'Dee', 'Eve']);
  assert.strictEqual(edit(s, g, {n: 'Crew'}).group.n, 'Crew');
  assert.deepStrictEqual(scopes(board(s)), [['Crew', ['Ben', 'Dee']]], 'renamed: same id, same members');
  assert.strictEqual(edit(s, g, {board: false}).group.board, 0);
  assert.deepStrictEqual(board(s).groups, []);
  assert.strictEqual(edit(s, g, {beta: BETA}).group.beta, BETA);
  assert.deepStrictEqual(s.get({name: 'Ben', pin: '1234'}).groups, [BETA], 'its members get the subject');
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).groups, [], 'the others not');
  assert.strictEqual(edit(s, g, {beta: 'coral'}).error, 'beta');
  // The subject opened to all: the setting stays, opens nothing (no subject in group mode), and can still be cleared.
  run(s, `CORE_.SUBJECTS.find(S => S.id === '${BETA}').open = 'all'`);
  assert.deepStrictEqual(s.get({name: 'Ben', pin: '1234'}).groups, []);
  assert.strictEqual(edit(s, g, {n: 'Crew 2'}).group.beta, BETA, 'kept while it is changed otherwise');
  assert.strictEqual(edit(s, g, {beta: ''}).group.beta, '');
  assert.strictEqual(edit(s, 'g:00000000', {n: 'X'}).error, 'group');
  assert.strictEqual(make(s, 'Other').ok, true);
  assert.strictEqual(edit(s, g, {n: 'other'}).error, 'exists');
});

test('delete: only an empty group; Remove all first', () => {
  const s = five();
  const g = id(s, 'Old', {board: 1});
  join(s, ['Ana', 'Ben'], g);
  assert.strictEqual(s.post({groupDrop: g, token: TOK}).error, 'members');
  assert.strictEqual(join(s, ['Ana', 'Ben'], g, false).n, 2);
  const r = s.post({groupDrop: g, token: TOK});
  assert.deepStrictEqual([r.ok, r.group], [true, g]);
  assert.deepStrictEqual(s.post({users: 1, token: TOK}).groupDefs, []);
  assert.deepStrictEqual(board(s).groups, []);
  assert.strictEqual(s.post({groupDrop: g, token: TOK}).error, 'group');
});

test('the opt-out, an admin hide and an archive hold on every group board', () => {
  const s = five();
  save(s, 'Fay', 20, '1234', {board: 0}); // opted out
  const nov = id(s, 'Nov', {board: 1}),
    staff = id(s, 'Staff', {board: 1, apart: 1});
  join(s, ['Ana', 'Ben', 'Fay'], nov);
  join(s, ['Cy', 'Dee'], staff);
  s.post({userBoard: 'Ben', hide: true, token: TOK});
  s.post({userBoard: 'Dee', hide: true, token: TOK});
  const B = board(s);
  assert.deepStrictEqual(scopes(B), [
    ['Staff', ['Cy']],
    ['Nov', ['Ana']]
  ]);
  assert.ok(!names(B.rows).includes('Fay'));
});

test('settings and rights apart: a settings group gives no right, a rights group without a board puts nobody on one', () => {
  const s = five();
  const staff = id(s, 'Staff', {board: 1, apart: 1}),
    roles = () => (s.sheets.Roles ? s.sheets.Roles.rows.length : 0),
    n = roles(),
    live = who => run(s, `can_({name: '${who}', h: hash_('${who}', '1234'), id: 'x'}, 'live', '${IMR}')`);
  join(s, 'Ben', staff);
  assert.strictEqual(live('Ben'), false, 'the staff board gives no right');
  join(s, 'Ben', staff, false);
  assert.strictEqual(roles(), n, 'no Roles row written');
  const tr = id(s, 'Trainers', {rights: ['live@' + IMR]});
  assert.strictEqual(join(s, 'Cy', tr).n, 1);
  assert.strictEqual(live('Cy'), true);
  assert.deepStrictEqual(names(board(s).rows), ['Ana', 'Ben', 'Cy', 'Dee', 'Eve'], 'the trainer stays on the general board');
  assert.deepStrictEqual(scopes(board(s)), [['Staff', []]]);
});

test('rule D7: a merge joins every group of the merged name to the kept one; a delete and an archive leave every group', () => {
  const s = five();
  const a = id(s, 'A', {board: 1}),
    b = id(s, 'B', {board: 1, apart: 1}),
    c = id(s, 'C', {board: 1});
  join(s, ['Ana'], a);
  join(s, ['Ana', 'Ben'], b);
  join(s, ['Ben', 'Cy'], c);
  board(s); // cached
  assert.ok(s.post({userMerge: {from: 'Ana', into: 'Cy', data: {}}, token: TOK}).ok);
  assert.deepStrictEqual(s.get({name: 'Cy', pin: '1234'}).gids, [c, a, b], "Cy keeps hers and takes Ana's");
  const M = board(s);
  assert.ok(!names(M.rows).includes('Ana') && !M.groups.some(g => names(g.rows).includes('Ana')), 'the cache followed: Ana is on no board');
  assert.ok(s.post({userDelete: 'Ben', answers: true, token: TOK}).ok);
  assert.ok(s.post({userArchive: {from: 'Cy', into: 'Cy-old'}, token: TOK}).ok);
  assert.deepStrictEqual(s.sheets.Groups.rows.slice(1), [], 'nobody left in any group');
  assert.deepStrictEqual(
    scopes(board(s)),
    [
      ['C', []],
      ['B', []],
      ['A', []]
    ],
    'the groups stay, empty'
  );
});

// The migration (ONCE_ groups, rule W3): the data of a script without player groups, written as that script wrote it.
function before() {
  const s = five();
  save(s, 'Fay', 3, '9999');
  run(s, "sheet_('Groups', GROUPS.HEAD)");
  const G = s.sheets.Groups;
  [
    ['fish', 'Ana', '2026-11-04T00:00:00Z'],
    ['fish', 'Dee', '2026-11-05T00:00:00Z'],
    ['cohort:RA October 2026', 'Cy', '2026-11-10T00:00:00Z'],
    ['cohort:RA November 2026', 'Ana', '2026-11-17T00:00:00Z'],
    ['cohort:RA November 2026', 'Eve', '2026-11-17T01:00:00Z']
  ].forEach(r => G.rows.push([r[0], r[1], new Date(r[2])]));
  // The staff: Ben and Dee hold trainer; Fay's grant was given to another code (a name taken again): not staff.
  grant(s, 'Ben');
  grant(s, 'Dee');
  grant(s, 'Fay');
  s.sheets.Roles.rows.slice(1).forEach(r => r[0] === 'Fay' && (r[4] = 'another-hash'));
  // The rights migration, which comes after this one, has its own tests (tests/rights.test.js): marked done here.
  s.props.ONCE_rights = '1';
  Object.keys(s.cache).forEach(k => delete s.cache[k]);
  return s;
}
const view = s => {
  Object.keys(s.cache).forEach(k => delete s.cache[k]);
  const B = board(s),
    L = s.post({users: 1, token: TOK});
  return {
    rows: names(B.rows),
    boards: scopes(B),
    defs: L.groupDefs.map(d => [d.id, d.n, d.board, d.beta]),
    gids: Object.fromEntries(L.users.map(u => [u.name, u.gids])),
    beta: ['Ana', 'Ben', 'Dee'].map(n => s.get({name: n, pin: '1234'}).groups)
  };
};

test('the migration: beta groups, cohorts and the staff become groups, nothing lost; the readers say the same before it', () => {
  const s = before();
  betaOn(s);
  const want = {
    rows: ['Ana', 'Ben', 'Cy', 'Dee', 'Eve', 'Fay'], // everyone, the staff included
    // the newest first: the staff's by their first grant (today, in this test), a cohort's by its first row
    boards: [
      ['Staff', ['Ben', 'Dee']],
      ['RA November 2026', ['Ana', 'Eve']],
      ['RA October 2026', ['Cy']]
    ],
    defs: [
      ['staff', 'Staff', 1, ''],
      ['fish', C.subjectOf('fish').name + ' beta', 0, 'fish'],
      ['cohort:RA October 2026', 'RA October 2026', 1, ''],
      ['cohort:RA November 2026', 'RA November 2026', 1, '']
    ],
    gids: {
      Ana: ['fish', 'cohort:RA November 2026'],
      Ben: ['staff'],
      Cy: ['cohort:RA October 2026'],
      Dee: ['fish', 'staff'],
      Eve: ['cohort:RA November 2026'],
      Fay: []
    },
    beta: [['fish'], [], ['fish']]
  };
  const rows0 = s.sheets.Groups.rows.map(r => r.slice());
  assert.deepStrictEqual(view(s), want, 'before the migration: read from the data before');
  assert.ok(!s.sheets['Group settings'], 'nothing written by a read');
  const m = run(s, 'ONCE_.groups()');
  assert.match(m, /^4 groups set from the Groups tab and the trainers \(1 beta, 2 cohort, the staff\), 2 staff members added$/);
  assert.deepStrictEqual(view(s), want, 'after: the same');
  assert.deepStrictEqual(s.sheets.Groups.rows.slice(0, rows0.length), rows0, "the Groups tab's rows untouched");
  assert.deepStrictEqual(
    s.sheets.Groups.rows.slice(rows0.length).map(r => r.slice(0, 2)),
    [
      ['staff', 'Ben'],
      ['staff', 'Dee']
    ],
    'only the staff added'
  );
  assert.strictEqual(run(s, 'ONCE_.groups()'), 'already made by a change to the groups', 'once');
  // The trainers keep their role, and its right through the Trainers group the rights migration makes after it.
  assert.strictEqual(s.sheets.Roles.rows.filter(r => r[1] === 'trainer').length, 3);
  delete s.props.ONCE_rights;
  run(s, 'ONCE_.rights()');
  const h = run(s, "(ra => String(ra.getRange(find_(ra, 'Ben'), 7).getValue()))(sheet_('RAs', HEAD))");
  assert.strictEqual(run(s, `can_({name: 'Ben', h: ${JSON.stringify(h)}, id: 'x'}, 'live', '${IMR}')`), true);
});

test('the migration: a change to the groups before it makes it first, once; once_ then finds it done', () => {
  const s = before();
  const g = make(s, 'RA December 2026', {board: 1}).group.id;
  assert.ok(run(s, "!!PropertiesService.getScriptProperties().getProperty('ONCE_groups')"), 'made by the change');
  assert.strictEqual(s.sheets['Group settings'].rows.length, 1 + 5);
  join(s, 'Fay', g);
  run(s, 'once_(() => {})');
  assert.strictEqual(s.sheets['Group settings'].rows.length, 1 + 5, 'not made twice');
  assert.strictEqual(s.sheets.Groups.rows.filter(r => r[0] === 'staff').length, 2);
  assert.deepStrictEqual(view(s).boards[0], ['RA December 2026', ['Fay']]);
});

test('the migration: two cohorts whose names differ by case only both stay; a setting changes alone, a rename to the other is refused', () => {
  const s = before();
  s.sheets.Groups.rows.push(['cohort:ra october 2026', 'Fay', new Date('2026-11-11T00:00:00Z')]);
  run(s, 'ONCE_.groups()');
  const defs = s.post({users: 1, token: TOK}).groupDefs.filter(d => /october/i.test(d.n));
  assert.deepStrictEqual(
    defs.map(d => d.n),
    ['RA October 2026', 'ra october 2026']
  );
  assert.strictEqual(edit(s, defs[1].id, {board: 0}).group.board, 0, 'not refused as a name taken');
  assert.strictEqual(edit(s, defs[1].id, {n: 'RA OCTOBER 2026'}).error, 'exists');
});

test('the migration tried again after a failure part way: nothing made twice', () => {
  const s = before();
  // A try that wrote the settings rows and failed before the staff's memberships and its mark.
  const add = run(s, 'groupsBefore_().defs');
  run(s, `(sh => ${JSON.stringify(add)}.forEach(d => gdefPut_(sh, sh.getLastRow() + 1, d)))(sheet_(GDEF.TAB, GDEF.HEAD))`);
  assert.ok(!run(s, 'groupsMigrated_()'));
  assert.match(run(s, 'ONCE_.groups()'), /^0 groups set .*, 2 staff members added$/);
  assert.strictEqual(s.sheets['Group settings'].rows.length, 1 + 4);
  assert.strictEqual(run(s, 'ONCE_.groups()'), 'already made by a change to the groups');
  assert.strictEqual(s.sheets.Groups.rows.filter(r => r[0] === 'staff').length, 2);
});

test('the migration marked done on a sheet with nothing to migrate: no group', () => {
  const s = five();
  run(s, 'Object.keys(ONCE_)').forEach(k => (s.props['ONCE_' + k] = '1'));
  assert.deepStrictEqual(board(s).groups, []);
  assert.deepStrictEqual(s.post({users: 1, token: TOK}).groupDefs, []);
});

test('the board cache: one entry per subject holds every scope; a membership or a setting drops it, a save or a role does not', () => {
  const s = five();
  const g = id(s, 'Nov', {board: 1});
  join(s, 'Ana', g);
  const B = board(s);
  const key = vm.runInContext('boardCache_(CORE_.SUBJECTS.find(S => S.board))', s.ctx);
  const hit = JSON.parse(s.cache[key]);
  assert.deepStrictEqual([hit.rows, hit.groups], JSON.parse(JSON.stringify([B.rows, B.groups])));
  save(s, 'Ben', 39);
  assert.deepStrictEqual(names(board(s).rows), names(B.rows), 'served from the cache');
  [() => join(s, 'Cy', g), () => edit(s, g, {board: 0}), () => make(s, 'New'), () => s.post({roleGrant: {account: 'Dee', role: 'admin', scope: 'platform'}, token: TOK})].forEach((f, i) => {
    board(s);
    assert.ok(s.cache[key], i + ': cached');
    f();
    assert.strictEqual(!s.cache[key], i < 3, i + (i < 3 ? ': every board dropped' : ': a role moves no board'));
  });
});
