require('./slot.js').testGuard();
// Groups that carry an instance's rights (docs/decisions/2026-11-19-groups-carry-rights.md; Code.gs can_, groupDo_,
// usersDo_ userGroup, joinPut_, rightsDrop_, mergePlan_, the rights migration): a group carries rights at the instance,
// a player's rights are the union of their groups', under the membership's code hash; only the grant right changes a
// group's rights or the members of a group that carries rights, one player a call, each change audited; a merge moves
// the groups without rights and drops the others; the one-shot migration turns the Roles tab's instance roles into
// groups, nothing lost. Against the in-memory sheet only (rule D1); made-up names.
const test = require('node:test'),
  assert = require('node:assert'),
  vm = require('vm');
const {loadCodeGs} = require('./gas.js');

const TOK = 'ghp_write000000000000000000',
  IMR = 'instance:imr',
  R = r => r + '@' + IMR;
const save = (s, name, pin = '1234') => assert.ok(s.post({name, pin, data: {}, summary: {}, answers: []}).ok);
const run = (s, js) => vm.runInContext(js, s.ctx);
const copy = o => JSON.parse(JSON.stringify(o));
const rows = (s, tab) =>
  copy(s.sheets[tab] ? s.sheets[tab].rows.slice(1).filter(r => r && r[0]) : []).map(r =>
    r.map(c => (typeof c === 'string' && c[0] === "'" ? c.slice(1) : c))
  );
const audit = s => rows(s, 'Audit').map(r => [r[1], r[2], r[3], r[4], r[5]]); // id, action, scope, result, target
const aid = (s, n) => run(s, `aid_(${JSON.stringify(n)})`);
const can = (s, n, right, pin = '1234', scope = IMR) =>
  run(s, `can_({name: ${JSON.stringify(n)}, h: hash_(${JSON.stringify(n)}, '${pin}'), id: 'x'}, '${right}', '${scope}')`);
const make = (s, n, o = {}, token = TOK) => s.post({groupMake: {n, ...o}, token});
const join = (s, who, g, on = true, token = TOK) => s.post({userGroup: who, group: g, on, token});
const edit = (s, g, o, token = TOK) => s.post({groupEdit: g, ...o, token});
const list = s => s.post({users: 1, token: TOK});
const user = (s, n) => list(s).users.find(u => u.name === n);
// caller_ stubbed so the token 'acct:<name>' is that account (its code 1234), as an account caller will be; the admin
// token stays the token.
const asAccounts = s =>
  run(
    s,
    `caller_ = (c => t => { const m = /^acct:(.+)$/.exec(String(t || '')); return m ? {name: m[1], h: hash_(m[1], '1234'), id: aid_(m[1])} : c(t); })(caller_)`
  );
// The Audit tab's next n row writes fail, as a Sheets service error does.
const failAudit = (s, n = 1) => {
  run(s, 'sheet_(AUDIT.TAB, AUDIT.HEAD)');
  const sh = s.sheets.Audit,
    append = sh.appendRow;
  sh.appendRow = v => {
    if (n-- > 0) throw new Error('Service Spreadsheets timed out while accessing document');
    return append(v);
  };
};
// No name in any Audit cell.
const noName = (s, ...names) => {
  const words = rows(s, 'Audit').flatMap(r =>
    r.slice(1).flatMap(c =>
      String(c)
        .toLowerCase()
        .split(/[\s>()]+/)
    )
  );
  names.forEach(n => assert.ok(!words.includes(n.toLowerCase()), 'no name in the Audit tab: ' + n));
};

test('a group carries rights: checked, kept in the Rights column in a fixed order; an older tab gains its header cells', () => {
  const s = loadCodeGs();
  save(s, 'Ana');
  // The tabs as the script before wrote them (no Rights, no Code hash), the migrations done.
  run(s, "sheet_('Group settings', ['Group', 'Name', 'Board', 'Apart', 'Beta', 'Added']); sheet_('Groups', ['Group', 'Name', 'Added'])");
  s.props.ONCE_groups = s.props.ONCE_rights = '1';
  const r = make(s, 'Helpers', {rights: [R('grant'), R('players'), R('grant')]});
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepStrictEqual(copy(r.group.rights), [R('players'), R('grant')], 'each once, in the fixed order');
  assert.deepStrictEqual(s.sheets['Group settings'].rows[0].at(-1), 'Rights');
  assert.strictEqual(s.sheets['Group settings'].rows[1][6], 'players@instance:imr, grant@instance:imr');
  assert.deepStrictEqual(join(s, 'Ana', r.group.id).n, 1);
  assert.deepStrictEqual(copy(s.sheets.Groups.rows[0]), ['Group', 'Name', 'Added', 'Code hash']);
  [
    ['platform@platform'],
    ['grant@platform'],
    ['live@instance:other'],
    ['constructor@' + IMR],
    ['__proto__@' + IMR],
    ['live@' + IMR + ', players@' + IMR],
    R('live'),
    [1],
    {0: R('live')}
  ].forEach(x => {
    assert.strictEqual(make(s, 'X', {rights: x}).error, 'input', JSON.stringify(x));
    assert.strictEqual(edit(s, r.group.id, {rights: x}).error, 'input', JSON.stringify(x));
  });
  assert.deepStrictEqual(copy(list(s).groupDefs.map(d => [d.n, d.rights])), [['Helpers', [R('players'), R('grant')]]]);
  // A settings group: no right, its Rights cell empty.
  assert.deepStrictEqual(copy(make(s, 'Staff', {board: 1}).group.rights), []);
  assert.strictEqual(s.sheets['Group settings'].rows[2][6], '');
});

// Ana and Ben play; Mia holds the players right only, Gus the grant right only (each through a group); Staff is a
// settings group with Ana in it, Trainers a group that carries live.
function gates() {
  const s = loadCodeGs();
  ['Ana', 'Ben', 'Mia', 'Gus'].forEach(n => save(s, n));
  const g = {
    staff: make(s, 'Staff', {board: 1}).group.id,
    tr: make(s, 'Trainers', {rights: [R('live')]}).group.id,
    help: make(s, 'Helpers', {rights: [R('players')]}).group.id,
    grant: make(s, 'Granters', {rights: [R('grant')]}).group.id
  };
  join(s, 'Ana', g.staff);
  join(s, 'Mia', g.help);
  join(s, 'Gus', g.grant);
  asAccounts(s);
  return [s, g];
}

test('who changes a group: players for its settings and the members of a settings group, grant for its rights and the members of a rights group', () => {
  const [s, g] = gates();
  const mia = 'acct:Mia',
    gus = 'acct:Gus';
  // The players right alone.
  assert.strictEqual(join(s, 'Ben', g.staff, true, mia).n, 1);
  assert.strictEqual(join(s, 'Ben', g.tr, true, mia).error, 'token', 'never into a group that carries rights');
  assert.strictEqual(join(s, 'Mia', g.grant, true, mia).error, 'token', 'nor itself into the grant');
  assert.strictEqual(edit(s, g.tr, {n: 'Hosts'}, mia).group.n, 'Hosts', 'a rights group renamed: players');
  assert.strictEqual(edit(s, g.tr, {rights: [R('live'), R('content')]}, mia).error, 'token');
  assert.strictEqual(edit(s, g.staff, {rights: [R('content')]}, mia).error, 'token');
  assert.strictEqual(make(s, 'Curators', {rights: [R('content')]}, mia).error, 'token');
  // The grant right alone.
  assert.strictEqual(join(s, 'Ben', g.tr, true, gus).n, 1);
  assert.ok(can(s, 'Ben', 'live'));
  assert.strictEqual(join(s, 'Ben', g.tr, false, gus).n, 1);
  assert.ok(!can(s, 'Ben', 'live'));
  assert.strictEqual(edit(s, g.tr, {rights: [R('live'), R('cohorts')]}, gus).ok, true, 'a right given: grant');
  assert.strictEqual(edit(s, g.tr, {n: 'Trainers'}, gus).error, 'token', 'a rename: players');
  assert.strictEqual(join(s, 'Ben', g.staff, true, gus).error, 'token');
  assert.strictEqual(make(s, 'Curators', {rights: [R('content')]}, gus).error, 'token', 'a new group: players too');
  // Checked again under the lock: a group that came to carry rights between the gate and the change.
  assert.strictEqual(run(s, `usersDo_({userGroup: 'Ben', group: '${g.tr}', on: true}, caller_('acct:Mia')).error`), 'token');
  // The token: one name a call, never a list; a first right never on a group that has members; a delete only empty.
  assert.strictEqual(join(s, ['Ben'], g.tr).error, 'input');
  assert.strictEqual(join(s, ['Ana', 'Ben'], g.tr, false).error, 'input');
  assert.strictEqual(edit(s, g.staff, {rights: [R('live')]}).error, 'members');
  assert.strictEqual(s.post({groupDrop: g.grant, token: TOK}).error, 'members');
  assert.strictEqual(join(s, 'Nobody', g.tr).error, 'user');
  assert.ok(s.post({userArchive: {from: 'Ben', into: 'Ben-old'}, token: TOK}).ok);
  assert.strictEqual(join(s, 'Ben-old', g.tr).error, 'archived');
  // A right taken away and given again while it still has members: the members' memberships keep their code hash.
  assert.ok(edit(s, g.grant, {rights: []}).ok);
  assert.ok(!can(s, 'Gus', 'grant'));
  assert.strictEqual(edit(s, g.grant, {rights: [R('grant')]}).error, 'members');
  noName(s, 'Ana', 'Ben', 'Mia', 'Gus');
});

test("a membership holds for the account's code hash: a code changed turns its rights off until it is added again", () => {
  const s = loadCodeGs();
  ['Tia', 'Ana'].forEach(n => save(s, n));
  const tr = make(s, 'Trainers', {rights: [R('live')]}).group.id;
  assert.strictEqual(join(s, 'Tia', tr).n, 1);
  assert.ok(can(s, 'Tia', 'live'));
  // Tia's code changed (as the admin's code reset would): the membership stays, its rights off.
  run(s, "(ra => ra.getRange(find_(ra, 'Tia'), 7).setValue(hash_('Tia', '9999')))(sheet_('RAs', HEAD))");
  assert.ok(!can(s, 'Tia', 'live', '9999') && !can(s, 'Tia', 'live'), 'neither code: the old one is no longer the account');
  assert.deepStrictEqual(copy(user(s, 'Tia').roff), [tr]);
  assert.deepStrictEqual(copy(user(s, 'Tia').gids), [tr], 'still a member');
  assert.ok(!JSON.stringify(list(s)).includes(run(s, "hash_('Tia', '9999')")), 'no code hash in any reply');
  // Added again: bound to the code now.
  assert.strictEqual(join(s, 'Tia', tr).n, 1);
  assert.ok(can(s, 'Tia', 'live', '9999'));
  assert.deepStrictEqual(copy(user(s, 'Tia').roff), []);
  assert.strictEqual(join(s, 'Tia', tr).n, 0, 'held');
  assert.strictEqual(rows(s, 'Groups').filter(r => r[1] === 'Tia').length, 1, 'one membership');
  // A settings group's membership holds no code hash.
  const st = make(s, 'Staff', {board: 1}).group.id;
  join(s, 'Ana', st);
  assert.deepStrictEqual(
    rows(s, 'Groups')
      .find(r => r[0] === st)
      .at(3),
    ''
  );
});

test('a code hash that starts with + or - is read back as written, on every path (setValues and appendRow)', () => {
  const s = loadCodeGs();
  let n = '';
  for (let i = 0; i < 2000 && !n; i++) if (/^[+-]/.test(run(s, `hash_('p${i}', '1234')`))) n = 'p' + i;
  assert.ok(n, 'a name whose hash starts with + or -');
  save(s, n);
  const tr = make(s, 'Trainers', {rights: [R('live')]}).group.id;
  assert.strictEqual(join(s, n, tr).n, 1);
  assert.ok(can(s, n, 'live'));
  assert.strictEqual(s.post({roleGrant: {account: n, role: 'admin', scope: 'platform'}, token: TOK}).result, 'ok');
  assert.ok(can(s, n, 'grant', '1234', 'platform'), 'the admin list (appendRow keeps the text mark)');
  assert.deepStrictEqual(copy(user(s, n).roff), []);
});

test("the Audit rows of a rights change: join and leave, a group's right given or taken and one row per member, never a name", () => {
  const s = loadCodeGs();
  ['Tia', 'Ana', 'Ben'].forEach(n => save(s, n));
  const tr = make(s, 'Trainers', {rights: [R('live')]}).group.id;
  join(s, 'Tia', tr);
  join(s, 'Ana', tr);
  join(s, 'Ben', tr, false);
  const n0 = audit(s).length;
  assert.ok(edit(s, tr, {rights: [R('cohorts'), R('live'), R('content')]}).ok);
  assert.ok(edit(s, tr, {rights: [R('cohorts'), R('content')]}).ok);
  const [T, A] = [aid(s, 'Tia'), aid(s, 'Ana')];
  const by = audit(s)[0][0];
  assert.deepStrictEqual(
    audit(s).filter(x => /^(join|leave|right[+-]|grant|revoke) /.test(x[1])),
    [
      [by, `right+ ${R('live')}`, IMR, 'ok', tr],
      [by, `join ${tr}`, IMR, 'ok', T],
      [by, `join ${tr}`, IMR, 'ok', A],
      [by, `leave ${tr}`, IMR, 'none', aid(s, 'Ben')],
      [by, `right+ ${R('content')}`, IMR, 'ok', tr],
      [by, `grant content (via ${tr})`, IMR, 'ok', T],
      [by, `grant content (via ${tr})`, IMR, 'ok', A],
      [by, `right+ ${R('cohorts')}`, IMR, 'ok', tr],
      [by, `grant cohorts (via ${tr})`, IMR, 'ok', T],
      [by, `grant cohorts (via ${tr})`, IMR, 'ok', A],
      [by, `right- ${R('live')}`, IMR, 'ok', tr],
      [by, `revoke live (via ${tr})`, IMR, 'ok', T],
      [by, `revoke live (via ${tr})`, IMR, 'ok', A]
    ]
  );
  assert.deepStrictEqual(
    audit(s)
      .slice(n0)
      .filter(x => x[1] === 'groupEdit')
      .map(x => x[3]),
    ['ok', 'ok'],
    'and the edit itself'
  );
  // A membership written without its row (the Audit tab failing) answers an error; its retry writes the row.
  failAudit(s);
  assert.strictEqual(join(s, 'Ben', tr).error, 'server');
  assert.ok(rows(s, 'Groups').some(r => r[1] === 'Ben'));
  assert.strictEqual(join(s, 'Ben', tr).n, 1, 'its retry: ok');
  assert.strictEqual(join(s, 'Ben', tr).n, 0, 'then held');
  assert.deepStrictEqual(
    audit(s)
      .filter(x => x[1] === `join ${tr}` && x[4] === aid(s, 'Ben'))
      .map(x => x[3]),
    ['ok', 'held']
  );
  noName(s, 'Tia', 'Ana', 'Ben');
});

test('a merge moves the groups without rights and drops the others, audited; mergePlan says so before, writing nothing', () => {
  const s = loadCodeGs();
  ['Ana', 'Ben', 'Cy'].forEach(n => save(s, n));
  const st = make(s, 'Staff', {board: 1}).group.id,
    beta = make(s, 'Nov', {board: 1}).group.id,
    tr = make(s, 'Trainers', {rights: [R('live')]}).group.id,
    mg = make(s, 'Managers', {rights: [R('players'), R('grant')]}).group.id;
  join(s, 'Ana', st);
  join(s, 'Ana', beta);
  join(s, 'Ben', beta);
  join(s, 'Ana', tr);
  join(s, 'Ben', mg);
  assert.strictEqual(s.post({roleGrant: {account: 'Ana', role: 'admin', scope: 'platform'}, token: TOK}).result, 'ok');
  const before = JSON.stringify(s.sheets);
  assert.deepStrictEqual(copy(s.post({mergePlan: {from: 'Ana', into: 'Ben'}, token: TOK})), {
    ok: true,
    join: [st],
    drop: [tr],
    admin: 1,
    v: run(s, 'VERSION')
  });
  assert.strictEqual(JSON.stringify(s.sheets), before, 'a read: nothing written, not even an Audit row');
  assert.strictEqual(s.post({mergePlan: {from: 'Ana', into: 'ana'}, token: TOK}).error, 'user');
  assert.strictEqual(s.post({mergePlan: {from: 'Ana', into: 'Nobody'}, token: TOK}).error, 'user');
  const m = s.post({userMerge: {from: 'Ana', into: 'Ben', data: {}}, token: TOK});
  assert.deepStrictEqual(copy([m.ok, m.join, m.drop, m.admin]), [true, [st], [tr], 1]);
  assert.deepStrictEqual(copy(user(s, 'Ben').gids).sort(), [st, beta, mg].sort(), "Ben keeps his own and takes Ana's settings groups");
  assert.ok(!can(s, 'Ben', 'live') && !can(s, 'Ben', 'grant', '1234', 'platform'), 'never her rights');
  assert.ok(can(s, 'Ben', 'players'), 'his own stay');
  assert.deepStrictEqual(
    audit(s)
      .filter(x => /account removed/.test(x[1]))
      .map(x => [x[1], x[4]]),
    [
      [`leave ${tr} (account removed)`, aid(s, 'Ana')],
      ['revoke admin (account removed)', aid(s, 'Ana')]
    ]
  );
  assert.ok(s.post({userArchive: {from: 'Cy', into: 'Cy-old'}, token: TOK}).ok);
  assert.strictEqual(s.post({mergePlan: {from: 'Cy-old', into: 'Ben'}, token: TOK}).error, 'archived');
  noName(s, 'Ana', 'Ben', 'Cy');
});

// The data of a script whose instance roles were in the Roles tab: Pat the admin, owner and editor; Eda an editor;
// Ben and Dee trainers; Fay's trainer grant given to another code (her name taken again); Zed's grant left by an
// account that is not there any more; a group named "Trainers" made by hand since the groups came.
const legacy = (s, n, role, h) =>
  run(
    s,
    `(ra => sheet_(ROLES.TAB, ROLES.HEAD).appendRow([${JSON.stringify(n)}, '${role}', '${role === 'admin' ? 'platform' : IMR}', new Date('2026-11-10T00:00:00Z'), ${
      h ? JSON.stringify(h) : `String(ra.getRange(find_(ra, ${JSON.stringify(n)}), 7).getValue())`
    }]))(sheet_('RAs', HEAD))`
  );
function before() {
  const s = loadCodeGs();
  ['Pat', 'Eda', 'Ben', 'Dee', 'Ana'].forEach(n => save(s, n));
  save(s, 'Fay', '9999');
  legacy(s, 'Pat', 'admin');
  legacy(s, 'Pat', 'owner');
  legacy(s, 'Pat', 'editor');
  legacy(s, 'Eda', 'editor');
  legacy(s, 'Ben', 'trainer');
  legacy(s, 'Dee', 'trainer');
  legacy(s, 'Fay', 'trainer', 'another-hash');
  legacy(s, 'Zed', 'trainer', 'zed-hash');
  s.props.ONCE_groups = '1';
  run(s, "gdefPut_(sheet_(GDEF.TAB, GDEF.HEAD), 2, {id: 'g:12345678', n: 'trainers', board: 1, beta: '', at: Date.now(), rights: []})");
  return s;
}
const view = s => {
  const L = list(s);
  return {
    defs: copy(L.groupDefs.map(d => [d.id, d.n, d.rights])),
    gids: Object.fromEntries(L.users.map(u => [u.name, copy(u.gids)])),
    roff: Object.fromEntries(L.users.filter(u => u.roff.length).map(u => [u.name, copy(u.roff)])),
    rights: ['Pat', 'Eda', 'Ben', 'Fay', 'Ana'].map(n =>
      ['players', 'content', 'live'].filter(r => can(s, n, r, n === 'Fay' ? '9999' : '1234'))
    ),
    admin: can(s, 'Pat', 'grant', '1234', 'platform')
  };
};

test('the migration: each instance role a group with its rights, each grant a membership under its code hash, nothing lost; the readers say the same before it', () => {
  const s = before();
  const want = {
    defs: [
      ['g:12345678', 'trainers', []],
      ['r:owner', 'Managers', [R('players'), R('settings'), R('grant')]],
      ['r:editor', 'Curators', [R('content')]],
      ['r:trainer', 'Trainers (rights)', [R('live'), R('cohorts')]]
    ],
    gids: {Pat: ['r:owner', 'r:editor'], Eda: ['r:editor'], Ben: ['r:trainer'], Dee: ['r:trainer'], Ana: [], Fay: ['r:trainer']},
    roff: {Fay: ['r:trainer']},
    rights: [['players', 'content'], ['content'], ['live'], [], []],
    admin: true
  };
  const roles0 = rows(s, 'Roles'),
    gs0 = JSON.stringify(s.sheets['Group settings'].rows);
  assert.deepStrictEqual(view(s), want, 'before the migration: read from the Roles tab');
  assert.strictEqual(JSON.stringify(s.sheets['Group settings'].rows), gs0, 'nothing written by a read');
  assert.ok(!s.sheets.Groups && !s.sheets.Audit);
  const m = run(s, 'ONCE_.rights()');
  assert.strictEqual(
    m,
    '3 groups made from the roles (Managers, Curators, Trainers (rights)), 6 memberships added, 1 with an old code hash (no right), 1 grant of accounts no longer live left in the Roles tab'
  );
  assert.deepStrictEqual(view(s), want, 'after: the same');
  assert.deepStrictEqual(rows(s, 'Roles'), roles0, 'the Roles tab kept as it was: the admin list and the record');
  assert.deepStrictEqual(
    rows(s, 'Groups').map(r => [r[0], r[1], new Date(r[2]).toISOString()]),
    [
      ['r:owner', 'Pat', '2026-11-10T00:00:00.000Z'],
      ['r:editor', 'Pat', '2026-11-10T00:00:00.000Z'],
      ['r:editor', 'Eda', '2026-11-10T00:00:00.000Z'],
      ['r:trainer', 'Ben', '2026-11-10T00:00:00.000Z'],
      ['r:trainer', 'Dee', '2026-11-10T00:00:00.000Z'],
      ['r:trainer', 'Fay', '2026-11-10T00:00:00.000Z']
    ]
  );
  assert.strictEqual(rows(s, 'Groups').find(r => r[1] === 'Fay')[3], 'another-hash', 'its old hash kept: rights off, nothing lost');
  assert.deepStrictEqual(
    audit(s).map(x => [x[0], x[1], x[3]]),
    [
      ['script', 'join r:owner (migration)', 'ok'],
      ['script', 'join r:editor (migration)', 'ok'],
      ['script', 'join r:editor (migration)', 'ok'],
      ['script', 'join r:trainer (migration)', 'ok'],
      ['script', 'join r:trainer (migration)', 'ok'],
      ['script', 'join r:trainer (migration)', 'ok']
    ]
  );
  assert.strictEqual(run(s, 'ONCE_.rights()'), 'already made by a change to the groups', 'once');
  noName(s, 'Pat', 'Eda', 'Ben', 'Dee', 'Fay', 'Zed');
  // A live game starts with the Trainers group's right as it did with the role.
  assert.strictEqual(s.post({lv: 'start', lname: 'Ben', lpin: '1234', s: 'coral', t: 'x', n: 3, lim: 20}).ok, true);
});

test('the migration: made by the first change before it, once; once_ then finds it done', () => {
  const s = before();
  const st = make(s, 'Staff', {board: 1}).group.id;
  assert.ok(s.props.ONCE_rights, 'made by the change');
  assert.deepStrictEqual(
    rows(s, 'Deploy log').map(r => r[1]),
    [
      `one-shot rights (v${run(s, 'VERSION')}): 3 groups made from the roles (Managers, Curators, Trainers (rights)), 6 memberships added, 1 with an old code hash (no right), 1 grant of accounts no longer live left in the Roles tab`
    ],
    'its Deploy log line, as once_ writes it'
  );
  assert.strictEqual(s.sheets['Group settings'].rows.length, 1 + 5);
  join(s, 'Ana', st);
  run(s, 'once_(() => {})');
  assert.strictEqual(s.sheets['Group settings'].rows.length, 1 + 5, 'not made twice');
  assert.strictEqual(rows(s, 'Groups').filter(r => /^r:/.test(r[0])).length, 6);
  assert.strictEqual(audit(s).filter(x => /\(migration\)$/.test(x[1])).length, 6);
});

test('the migration tried again after its Audit tab failed part way: nothing made twice, every membership audited once', () => {
  const s = before();
  failAudit(s);
  assert.throws(() => run(s, 'ONCE_.rights()'), /its Audit row was not written/);
  assert.ok(!s.props.ONCE_rights, 'not marked done');
  assert.strictEqual(rows(s, 'Groups').length, 6, 'the memberships written');
  assert.match(run(s, 'ONCE_.rights()'), /^0 groups made from the roles \(\), 0 memberships added/);
  assert.strictEqual(rows(s, 'Groups').length, 6);
  assert.strictEqual(s.sheets['Group settings'].rows.length, 1 + 4);
  assert.strictEqual(audit(s).filter(x => /\(migration\)$/.test(x[1])).length, 6);
});

test('an account deleted before the migration ran: its roles are made its groups first, then dropped, each audited', () => {
  const s = before();
  assert.ok(s.post({userDelete: 'Eda', answers: true, token: TOK}).ok);
  assert.ok(!rows(s, 'Roles').some(r => r[0] === 'Eda'));
  assert.ok(!rows(s, 'Groups').some(r => r[1] === 'Eda'));
  assert.deepStrictEqual(
    audit(s)
      .filter(x => x[4] === aid(s, 'Eda'))
      .map(x => x[1]),
    ['join r:editor (migration)', 'leave r:editor (account removed)', 'userDelete']
  );
  // Pat, deleted after: his place on the admin list goes too.
  assert.ok(s.post({userDelete: 'Pat', token: TOK}).ok);
  assert.ok(!rows(s, 'Roles').some(r => r[0] === 'Pat'));
  assert.deepStrictEqual(
    audit(s)
      .filter(x => x[4] === aid(s, 'Pat') && /account removed/.test(x[1]))
      .map(x => x[1])
      .sort(),
    ['leave r:editor (account removed)', 'leave r:owner (account removed)', 'revoke admin (account removed)']
  );
  noName(s, 'Eda', 'Pat');
});

test("the seed's groups follow the migration's names, and a group of that name made by hand keeps it", () => {
  const s = loadCodeGs();
  save(s, 'Pat');
  make(s, 'Managers', {board: 1});
  assert.ok(s.post({readAnswers: 1, token: TOK, aname: 'Pat', apin: '1234'}).ok);
  assert.deepStrictEqual(copy(list(s).groupDefs.map(d => [d.id.replace(/^g:.*/, 'g:'), d.n])), [
    ['g:', 'Managers'],
    ['r:owner', 'Managers (rights)'],
    ['r:editor', 'Curators']
  ]);
  assert.ok(can(s, 'Pat', 'players') && can(s, 'Pat', 'content') && can(s, 'Pat', 'platform', '1234', 'platform'));
});
