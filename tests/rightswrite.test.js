require('./slot.js').testGuard();
// Groups by scope and the one audited write of every rights change (docs/decisions/2026-11-21-groups-by-scope.md, revised
// by docs/decisions/2026-11-26-roles-groups-assignments.md, step 1; Code.gs scopeOf_, rightParse_, rightsOf_,
// groupScope_, can_, rightsWrite_, groupDo_, heirOf_, confirmOk_, auid_, lvTrainer_, lvHost_). A group's rights are at
// the instance or at a list of subjects, never both; a right held at a subject holds there only; a scope the script does
// not know is refused loudly and gives nothing; every write to a rights store goes through rightsWrite_, in one write
// with its Audit rows (Before and After); no change leaves the instance without an admin or a manager. Against the
// in-memory sheet only (rule D1); made-up names.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const {loadCodeGs, confirmed, failAudit} = require('./gas.js');

const TOK = 'ghp_write000000000000000000',
  IMR = 'instance:imr',
  AT_FISH = 'subject:fish',
  AT_CORAL = 'subject:coral',
  AT_SLUG = 'subject:seaslug',
  R = (r, at = IMR) => r + '@' + at;
const RIGHTS = ['platform', 'grant', 'players', 'settings', 'content', 'live', 'cohorts'],
  SCOPES = ['platform', IMR, AT_CORAL, AT_FISH, AT_SLUG];
const MGR = [R('players'), R('settings'), R('grant')];
const save = (s, name, pin = '1234') => assert.ok(s.post({name, pin, data: {}, summary: {}, answers: []}).ok);
const run = (s, js) => vm.runInContext(js, s.ctx);
const copy = o => JSON.parse(JSON.stringify(o));
const rows = (s, tab) =>
  copy(s.sheets[tab] ? s.sheets[tab].rows.slice(1).filter(r => r && r[0]) : []).map(r =>
    r.map(c => (typeof c === 'string' && c[0] === "'" ? c.slice(1) : c))
  );
const audit = s => rows(s, 'Audit').map(r => [r[1], r[2], r[3], r[4], r[5]]); // id, action, scope, result, target
// The same with Before and After.
const full = s => rows(s, 'Audit').map(r => r.slice(1, 8));
const aid = (s, n) => run(s, `aid_(${JSON.stringify(n)})`);
// An account's audit id (Code.gs auid_), read while it exists.
const auid = (s, n) => run(s, `auid_(${JSON.stringify(n)})`);
const can = (s, n, right, scope = IMR) =>
  run(s, `can_({name: ${JSON.stringify(n)}, h: hash_(${JSON.stringify(n)}, '1234'), id: 'x'}, '${right}', '${scope}')`);
// A group made or edited as the admin does it: confirmed when the sheet asks (the grant right given).
const make = (s, n, o = {}, token = TOK) => confirmed(s, {groupMake: {n, ...o}, token});
const join = (s, who, g, on = true, token = TOK) => s.post({userGroup: who, group: g, on, token});
const edit = (s, g, o, token = TOK) => confirmed(s, {groupEdit: g, ...o, token});
const defs = s => s.post({users: 1, token: TOK}).groupDefs;
const deployLog = s => rows(s, 'Deploy log').map(r => String(r[1]));
// caller_ stubbed so the token 'acct:<name>' is that account (its code 1234), as an account caller will be.
const asAccounts = s =>
  run(
    s,
    `caller_ = (c => t => { const m = /^acct:(.+)$/.exec(String(t || '')); return m ? {name: m[1], h: hash_(m[1], '1234'), id: auid_(m[1])} : c(t); })(caller_)`
  );
// The seats as the guard counts them (Code.gs seatsOf_).
const seats = s => copy(run(s, 'seatsOf_(rightsState_())'));
// A Managers group (the full bundle) and an admin: the instance's two seats, held by these accounts.
const seat = (s, managers, admins = managers) => {
  const mg = make(s, 'Managers', {rights: MGR}).group.id;
  managers.forEach(n => assert.strictEqual(join(s, n, mg).n, 1));
  admins.forEach(n => assert.strictEqual(s.post({roleGrant: {account: n, role: 'admin', scope: 'platform'}, token: TOK}).result, 'ok'));
  return mg;
};

test('a scope is the instance or one of its subjects, by its exact id; anything else is refused, never widened', () => {
  const s = loadCodeGs();
  const parse = e => copy(run(s, `rightParse_(${JSON.stringify(e)})`));
  assert.deepStrictEqual(parse(R('players')), ['players', IMR]);
  assert.deepStrictEqual(parse(R('content', AT_FISH)), ['content', AT_FISH]);
  assert.deepStrictEqual(parse(R('live', AT_SLUG)), ['live', AT_SLUG]);
  assert.deepStrictEqual(parse(R('cohorts', AT_CORAL)), ['cohorts', AT_CORAL]);
  [
    'content',
    'content@',
    '@' + AT_FISH,
    'content@subject:',
    'content@subject:whales',
    'content@subject:Fish',
    'content@subject:fish ',
    'content@ subject:fish',
    'content@subject:fish@subject:fish',
    'content@subject:constructor',
    'content@subject:__proto__',
    'content@instance:other',
    'content@platform',
    'content@group:g:12345678',
    'content@fish',
    'Content@' + AT_FISH,
    // Only the Curators' and the Trainers' rights take a subject: never the players, the settings nor the grant.
    R('players', AT_FISH),
    R('settings', AT_FISH),
    R('grant', AT_FISH),
    R('platform', AT_FISH),
    'platform@platform'
  ].forEach(e => assert.strictEqual(parse(e), null, e));
  // The cell's order: RIGHTS', the instance's scope first; an entry it does not take is named by rightsBad_.
  assert.deepStrictEqual(copy(run(s, `rightsOf_('live@subject:fish, content@subject:fish, live@subject:fish, x@y')`)), [
    R('content', AT_FISH),
    R('live', AT_FISH)
  ]);
  assert.deepStrictEqual(copy(run(s, `rightsBad_('live@subject:fish, x@y, players@subject:fish')`)), ['x@y', R('players', AT_FISH)]);
  // A group's one scope: the instance, or a list of subjects (Pierre, 2026-11-26, decision 2), each right at each of them.
  assert.strictEqual(run(s, `groupScope_([])`), '');
  assert.strictEqual(run(s, `groupScope_(['players@instance:imr', 'live@instance:imr'])`), IMR);
  assert.strictEqual(run(s, `groupScope_(['content@subject:fish', 'live@subject:fish'])`), AT_FISH);
  assert.strictEqual(run(s, `groupScope_(['content@subject:fish', 'live@instance:imr'])`), null);
  assert.strictEqual(run(s, `groupScope_(['content@subject:fish', 'content@subject:coral'])`), `${AT_CORAL},${AT_FISH}`);
  assert.strictEqual(
    run(s, `groupScope_(['content@subject:seaslug', 'live@subject:seaslug', 'content@subject:coral', 'live@subject:coral'])`),
    `${AT_CORAL},${AT_SLUG}`,
    'in SUBJECTS order'
  );
  assert.strictEqual(run(s, `groupScope_(['content@subject:fish', 'live@subject:coral'])`), null, 'rights at different subjects');
  assert.strictEqual(
    run(s, `groupScope_(['content@subject:fish', 'live@subject:fish', 'content@subject:coral'])`),
    null,
    'a right missing at one of its subjects'
  );
});

test('a request with an unknown or malformed scope is refused (input), one that is not one scope too (scope); nothing is written', () => {
  const s = loadCodeGs();
  save(s, 'Ana');
  const g = make(s, 'Curators, fish', {rights: [R('content', AT_FISH)]}).group.id;
  const cells = () => JSON.stringify(s.sheets['Group settings'].rows);
  const was = cells();
  [
    ['content@subject:whales'],
    ['content@subject:Fish'],
    [R('players', AT_FISH)],
    [R('grant', AT_CORAL)],
    ['content@' + AT_FISH + ',' + R('live', AT_FISH)],
    [R('content', AT_FISH) + ' ']
  ].forEach(x => {
    assert.strictEqual(make(s, 'X', {rights: x}).error, 'input', JSON.stringify(x));
    assert.strictEqual(edit(s, g, {rights: x}).error, 'input', JSON.stringify(x));
  });
  [
    [R('content', AT_FISH), R('live')],
    [R('content', AT_FISH), R('live', AT_CORAL)],
    [R('live', AT_SLUG), R('players')]
  ].forEach(x => {
    assert.strictEqual(make(s, 'X', {rights: x}).error, 'scope', JSON.stringify(x));
    assert.strictEqual(edit(s, g, {rights: x}).error, 'scope', JSON.stringify(x));
  });
  assert.strictEqual(cells(), was, 'nothing written');
  assert.deepStrictEqual(copy(defs(s).map(d => [d.n, d.rights])), [['Curators, fish', [R('content', AT_FISH)]]]);
  // Every refusal is audited as the request it was (capped refusals aside), by id only.
  assert.ok(audit(s).filter(x => x[1] === 'groupEdit' && x[3] === 'scope').length === 3);
});

test('a right held at a subject holds there only: never at the instance, another subject, nor any other right', () => {
  const s = loadCodeGs();
  ['Ana', 'Ben', 'Cy', 'Dee'].forEach(n => save(s, n));
  const cur = make(s, 'Curators, fish', {rights: [R('content', AT_FISH)]}).group.id,
    tr = make(s, 'Trainers, sea slugs', {rights: [R('live', AT_SLUG), R('cohorts', AT_SLUG)]}).group.id,
    all = make(s, 'Curators', {rights: [R('content')]}).group.id,
    two = make(s, 'Curators, corals and sea slugs', {rights: [R('content', AT_CORAL), R('content', AT_SLUG)]}).group.id;
  join(s, 'Ana', cur);
  join(s, 'Ben', tr);
  join(s, 'Cy', all);
  join(s, 'Dee', two);
  const want = {
    Ana: [R('content', AT_FISH)],
    Ben: [R('live', AT_SLUG), R('cohorts', AT_SLUG)],
    // The instance's right holds at each of its subjects.
    Cy: [R('content'), R('content', AT_CORAL), R('content', AT_FISH), R('content', AT_SLUG)],
    // A list of subjects: at each of them, never at the others nor at the instance.
    Dee: [R('content', AT_CORAL), R('content', AT_SLUG)]
  };
  for (const n of Object.keys(want))
    for (const r of RIGHTS) for (const sc of SCOPES) assert.strictEqual(can(s, n, r, sc), want[n].includes(R(r, sc)), `${n} ${r} ${sc}`);
  // A scope can_ does not know gives nothing, even to a holder at the instance.
  ['subject:whales', 'subject:', 'subject:Fish', 'instance:other', '', 'group:' + all].forEach(sc =>
    assert.ok(!can(s, 'Cy', 'content', sc), sc)
  );
  // The groups' rights as the admin reads them.
  assert.deepStrictEqual(copy(defs(s).map(d => d.rights)), [
    [R('content', AT_FISH)],
    [R('live', AT_SLUG), R('cohorts', AT_SLUG)],
    [R('content')],
    [R('content', AT_CORAL), R('content', AT_SLUG)]
  ]);
});

test('every privileged endpoint refuses a holder of a subject-scoped right; changing a subject group asks the grant right', () => {
  const s = loadCodeGs();
  ['Ana', 'Ben', 'Gus', 'Mia'].forEach(n => save(s, n));
  const cur = make(s, 'Curators, fish', {rights: [R('content', AT_FISH)]}).group.id,
    tr = make(s, 'Trainers, fish', {rights: [R('live', AT_FISH)]}).group.id,
    gr = make(s, 'Granters', {rights: [R('grant')]}).group.id,
    pl = make(s, 'Helpers', {rights: [R('players')]}).group.id;
  join(s, 'Ana', cur);
  join(s, 'Ben', tr);
  join(s, 'Gus', gr);
  join(s, 'Mia', pl);
  asAccounts(s);
  const ana = 'acct:Ana';
  [
    {users: 1},
    {readAnswers: 1},
    {readStats: 1},
    {readLive: 1},
    {readReports: 1},
    {readEvents: 1, pages: 1},
    {readEvents: 1},
    {readAlerts: 1},
    {readInfra: 1},
    {analysesGet: 1},
    {roles: 1},
    {roleGrant: {account: 'Ana', role: 'admin', scope: 'platform'}},
    {groupMake: {n: 'Mine', rights: [R('content', AT_FISH)]}},
    {groupEdit: cur, rights: [R('content', AT_FISH), R('live', AT_FISH)]},
    {groupEdit: cur, n: 'Ours'},
    {groupDrop: tr},
    {userGroup: 'Ben', group: cur, on: true},
    {userGroup: 'Ana', group: cur, on: false},
    {userBoard: 'Ben', hide: true},
    {statsExclude: aid(s, 'Ben'), on: true}
  ].forEach(b => assert.strictEqual(s.post({...b, token: ana}).error, 'token', JSON.stringify(b)));
  // The players right alone: no subject group's members nor rights.
  assert.strictEqual(join(s, 'Ben', cur, true, 'acct:Mia').error, 'token');
  assert.strictEqual(edit(s, cur, {rights: [R('content', AT_FISH), R('live', AT_FISH)]}, 'acct:Mia').error, 'token');
  // The instance's grant reaches its subjects.
  assert.strictEqual(join(s, 'Ben', cur, true, 'acct:Gus').n, 1);
  assert.ok(can(s, 'Ben', 'content', AT_FISH));
  assert.ok(edit(s, cur, {rights: [R('content', AT_FISH), R('live', AT_FISH)]}, 'acct:Gus').ok);
  assert.ok(can(s, 'Ana', 'live', AT_FISH) && !can(s, 'Ana', 'live', AT_CORAL));
  // A group that carries rights is deleted with the grant right only, its rights taken away first, audited.
  assert.strictEqual(join(s, 'Ben', tr, false, 'acct:Gus').n, 1);
  assert.strictEqual(s.post({groupDrop: tr, token: 'acct:Mia'}).error, 'token', 'the players right alone');
  assert.ok(s.post({groupDrop: tr, token: 'acct:Gus'}).ok);
  assert.deepStrictEqual(
    full(s)
      .filter(x => x[4] === tr && x[1] === `rights ${tr}`)
      .map(x => x.slice(2)),
    [
      [AT_FISH, 'ok', tr, '-', R('live', AT_FISH)],
      [AT_FISH, 'ok', tr, R('live', AT_FISH), '-']
    ]
  );
});

test("a live game is hosted with live at the game's subject: a fish trainer hosts fish, never the corals", () => {
  const s = loadCodeGs();
  ['Tess', 'Ina'].forEach(n => save(s, n));
  join(s, 'Tess', make(s, 'Trainers, fish', {rights: [R('live', AT_FISH)]}).group.id);
  join(s, 'Ina', make(s, 'Trainers', {rights: [R('live')]}).group.id);
  const start = (n, sid) => copy(s.post({lv: 'start', lname: n, lpin: '1234', s: sid, t: 'Group 1', n: 3, lim: 20}));
  assert.strictEqual(start('Tess', 'fish').ok, true);
  assert.strictEqual(start('Tess', 'coral').error, 'role');
  assert.strictEqual(start('Tess', 'whales').error, 'role', 'an unknown subject asks the instance');
  assert.strictEqual(start('Ina', 'fish').ok, true);
  assert.strictEqual(start('Ina', 'coral').ok, true);
  assert.deepStrictEqual(
    audit(s)
      .filter(x => x[1] === 'live start')
      .map(x => [x[0] === auid(s, 'Tess') ? 'Tess' : 'Ina', x[2], x[3]]),
    [
      ['Tess', AT_FISH, 'ok'],
      ['Tess', AT_CORAL, 'denied'],
      ['Tess', IMR, 'denied'],
      ['Ina', AT_FISH, 'ok'],
      ['Ina', AT_CORAL, 'ok']
    ]
  );
});

test('a Rights cell written by hand: an entry the script does not take gives nothing and is logged; a rename keeps the cell', () => {
  const s = loadCodeGs();
  ['Ana', 'Ben'].forEach(n => save(s, n));
  const g = make(s, 'Curators, fish', {rights: [R('content', AT_FISH)]}).group.id,
    h = make(s, 'Mixed', {rights: [R('live', AT_FISH)]}).group.id;
  join(s, 'Ana', g);
  join(s, 'Ben', h);
  const sh = s.sheets['Group settings'];
  sh.rows[1][6] = 'content@subject:fish, players@subject:fish, grant@instance:other, platform@platform';
  sh.rows[2][6] = 'live@subject:fish, content@instance:imr';
  for (const sc of SCOPES) for (const r of ['players', 'grant', 'platform', 'settings']) assert.ok(!can(s, 'Ana', r, sc), `${r} ${sc}`);
  assert.ok(can(s, 'Ana', 'content', AT_FISH) && !can(s, 'Ana', 'content', IMR));
  // A cell mixing scopes: each entry at its own scope, never more.
  assert.ok(can(s, 'Ben', 'live', AT_FISH) && !can(s, 'Ben', 'live', IMR) && !can(s, 'Ben', 'live', AT_CORAL));
  assert.ok(can(s, 'Ben', 'content', AT_CORAL));
  const log = deployLog(s);
  assert.ok(
    log.some(l =>
      l.startsWith(
        `Roles: group ${g}: its Rights cell holds entries that give nothing (players@subject:fish, grant@instance:other, platform@platform)`
      )
    ),
    log.join('\n')
  );
  assert.ok(
    log.some(l => l === `Roles: group ${h}: its Rights cell holds more than one scope`),
    log.join('\n')
  );
  // A rename or a setting never writes the Rights cell.
  assert.ok(edit(s, g, {n: 'Fish curators', board: 1}).ok);
  assert.strictEqual(sh.rows[1][6], 'content@subject:fish, players@subject:fish, grant@instance:other, platform@platform');
  // A rights edit writes the list it takes; the entries that gave nothing are dropped, logged.
  assert.ok(edit(s, g, {rights: [R('content', AT_FISH), R('live', AT_FISH)]}).ok);
  assert.strictEqual(sh.rows[1][6], 'content@subject:fish, live@subject:fish');
  assert.ok(deployLog(s).some(l => l.startsWith(`Roles: rights ${g}: entries that gave nothing dropped from its Rights cell`)));
});

test('the Audit rows say who, what, when, at which scope, about whom, and before and after (two columns)', () => {
  const s = loadCodeGs();
  ['Ana', 'Ben'].forEach(n => save(s, n));
  const g = make(s, 'Trainers, fish', {rights: [R('live', AT_FISH)]}).group.id;
  join(s, 'Ana', g);
  join(s, 'Ben', g);
  assert.ok(edit(s, g, {rights: [R('live', AT_FISH), R('cohorts', AT_FISH)]}).ok);
  assert.ok(edit(s, g, {rights: [R('live', AT_FISH), R('live', AT_SLUG)]}).ok, 'a list of subjects');
  assert.ok(edit(s, g, {rights: [R('live'), R('cohorts')]}).ok, 'a group with members moves to the instance: grant');
  join(s, 'Ben', g, false);
  const [A, B] = [auid(s, 'Ana'), auid(s, 'Ben')];
  assert.match(A, /^u:[A-Za-z0-9]{10}$/, 'an audit id: opaque');
  assert.ok(A !== aid(s, 'Ana') && A !== B);
  const all = rows(s, 'Audit');
  assert.deepStrictEqual(copy(s.sheets.Audit.rows[0]), ['Time', 'Admin id', 'Action', 'Scope', 'Result', 'Target id', 'Before', 'After']);
  assert.ok(
    all.every(r => new Date(r[0]).getTime() > 0),
    'when'
  );
  const by = all[0][1];
  assert.match(by, /^gh:/, 'who: the token by its id');
  const F = R('live', AT_FISH),
    FC = [F, R('cohorts', AT_FISH)].join(','),
    FS = [F, R('live', AT_SLUG)].join(','),
    I = [R('live'), R('cohorts')].join(',');
  assert.deepStrictEqual(
    full(s).filter(x => !/^group|^user/.test(x[1])),
    [
      [by, `rights ${g}`, AT_FISH, 'ok', g, '-', F],
      [by, `join ${g}`, AT_FISH, 'ok', A, '-', F],
      [by, `join ${g}`, AT_FISH, 'ok', B, '-', F],
      [by, `rights ${g}`, AT_FISH, 'ok', g, F, FC],
      [by, `rights (via ${g})`, AT_FISH, 'ok', A, F, FC],
      [by, `rights (via ${g})`, AT_FISH, 'ok', B, F, FC],
      [by, `rights ${g}`, `${AT_FISH},${AT_SLUG}`, 'ok', g, FC, FS],
      [by, `rights (via ${g})`, `${AT_FISH},${AT_SLUG}`, 'ok', A, FC, FS],
      [by, `rights (via ${g})`, `${AT_FISH},${AT_SLUG}`, 'ok', B, FC, FS],
      [by, `rights ${g}`, IMR, 'ok', g, FS, I],
      [by, `rights (via ${g})`, IMR, 'ok', A, FS, I],
      [by, `rights (via ${g})`, IMR, 'ok', B, FS, I],
      [by, `leave ${g}`, IMR, 'ok', B, I, '-']
    ]
  );
  // The rows of a request that is no rights change keep Before and After blank.
  assert.ok(
    full(s)
      .filter(x => /^group|^user/.test(x[1]))
      .every(x => x[5] === '' && x[6] === '')
  );
  assert.ok(!JSON.stringify(s.sheets.Audit.rows).match(/Ana|Ben/), 'ids only, never a name');
});

test('an Audit tab of six columns gains Before and After at its end; its rows stay as they are and the readers still read them', () => {
  const s = loadCodeGs();
  ['Ana', 'Pat'].forEach(n => save(s, n));
  const g = make(s, 'Trainers', {board: 1}).group.id;
  // The tab as an earlier script left it: six columns, a group's rights given by one row per right (right+), its
  // Rights cell written with them.
  const sh = s.sheets.Audit;
  sh.rows.length = 0;
  sh.rows.push(['Time', 'Admin id', 'Action', 'Scope', 'Result', 'Target id']);
  [R('live'), R('cohorts')].forEach(e => sh.rows.push([new Date(), 'gh:old', `right+ ${e}`, IMR, 'ok', g]));
  run(s, `gdefTab_().getRange(gdefRows_().findIndex(r => r[0] === '${g}') + 2, 7).setValue('${R('live')}, ${R('cohorts')}')`);
  const old = copy(sh.rows);
  assert.deepStrictEqual(copy(run(s, `rightsAudited_('${g}')`)), [R('live'), R('cohorts')], 'the old rows read as they were');
  assert.strictEqual(join(s, 'Ana', g).n, 1);
  assert.deepStrictEqual(copy(sh.rows[0]), ['Time', 'Admin id', 'Action', 'Scope', 'Result', 'Target id', 'Before', 'After']);
  assert.deepStrictEqual(copy(sh.rows.slice(1, old.length)), old.slice(1), 'every earlier row as it was');
  assert.deepStrictEqual(full(s).at(-2).slice(1), [`join ${g}`, IMR, 'ok', auid(s, 'Ana'), '-', `${R('live')},${R('cohorts')}`]);
});

test('a change whose Audit rows cannot be written is taken back: nothing changed, an error; its retry makes it with its rows', () => {
  const s = loadCodeGs();
  ['Ana', 'Pat', 'Zed'].forEach(n => save(s, n));
  seat(s, ['Zed']);
  const g = make(s, 'Trainers, fish', {rights: [R('live', AT_FISH)]}).group.id;
  join(s, 'Ana', g);
  failAudit(s);
  assert.strictEqual(join(s, 'Ana', g, false).error, 'server');
  assert.ok(can(s, 'Ana', 'live', AT_FISH), 'the right still held: no change without its row');
  assert.ok(deployLog(s).some(l => l.startsWith(`Roles: rights change taken back, its Audit rows not written (leave ${g}): Service`)));
  assert.strictEqual(join(s, 'Ana', g, false).n, 1, 'its retry: ok');
  assert.strictEqual(join(s, 'Ana', g, false).n, 0, 'then none');
  assert.deepStrictEqual(
    audit(s)
      .filter(x => x[1] === `leave ${g}`)
      .map(x => x[3]),
    ['ok', 'none']
  );
  assert.strictEqual(s.post({roleGrant: {account: 'Pat', role: 'admin', scope: 'platform'}, token: TOK}).result, 'ok');
  failAudit(s);
  assert.strictEqual(s.post({roleRevoke: {account: 'Pat', role: 'admin', scope: 'platform'}, token: TOK}).error, 'server');
  assert.ok(can(s, 'Pat', 'grant', 'platform'), 'still an admin');
  assert.strictEqual(s.post({roleRevoke: {account: 'Pat', role: 'admin', scope: 'platform'}, token: TOK}).result, 'ok');
  assert.strictEqual(s.post({roleRevoke: {account: 'Pat', role: 'admin', scope: 'platform'}, token: TOK}).result, 'none');
  // A delete whose rights rows fail stops before anything of the account goes; its retry makes it.
  join(s, 'Ana', g);
  failAudit(s);
  assert.ok(!s.post({userDelete: 'Ana', token: TOK}).ok);
  assert.ok(
    rows(s, 'RAs').some(r => r[0] === 'Ana'),
    'the account is still there'
  );
  assert.ok(can(s, 'Ana', 'live', AT_FISH), 'its right too');
  const A = auid(s, 'Ana');
  assert.ok(s.post({userDelete: 'Ana', token: TOK}).ok);
  assert.deepStrictEqual(
    audit(s)
      .filter(x => x[1] === `leave ${g} (account removed)`)
      .map(x => [x[3], x[4]]),
    [['ok', A]]
  );
});

test('a merge or an archive whose rights rows fail changes nothing; its retry makes it', () => {
  const s = loadCodeGs();
  ['Ben', 'Mia', 'Cy'].forEach(n => save(s, n));
  const g = make(s, 'Trainers, fish', {rights: [R('live', AT_FISH)]}).group.id,
    st = make(s, 'Staff', {board: 1}).group.id;
  ['Ben', 'Cy'].forEach(n => (join(s, n, g), join(s, n, st)));
  const inStaff = n => rows(s, 'Groups').some(r => r[0] === st && r[1] === n);
  const [B, C] = [auid(s, 'Ben'), auid(s, 'Cy')];
  failAudit(s);
  assert.ok(!s.post({userMerge: {from: 'Ben', into: 'Mia', data: {}}, token: TOK}).ok);
  assert.ok(
    rows(s, 'RAs').some(r => r[0] === 'Ben'),
    'the merged name is still there'
  );
  assert.ok(!inStaff('Mia'), 'the kept name joined none of its groups');
  assert.ok(can(s, 'Ben', 'live', AT_FISH) && !can(s, 'Mia', 'live', AT_FISH), 'nothing changed, never moved');
  assert.ok(s.post({userMerge: {from: 'Ben', into: 'Mia', data: {}}, token: TOK}).ok);
  assert.ok(inStaff('Mia') && !rows(s, 'RAs').some(r => r[0] === 'Ben'));
  assert.ok(!can(s, 'Mia', 'live', AT_FISH));
  failAudit(s);
  assert.ok(!s.post({userArchive: {from: 'Cy', into: 'Cy-old'}, token: TOK}).ok);
  assert.ok(
    rows(s, 'RAs').some(r => r[0] === 'Cy'),
    'not archived'
  );
  assert.ok(can(s, 'Cy', 'live', AT_FISH));
  assert.ok(s.post({userArchive: {from: 'Cy', into: 'Cy-old'}, token: TOK}).ok);
  assert.ok(!can(s, 'Cy', 'live', AT_FISH));
  assert.deepStrictEqual(
    audit(s)
      .filter(x => x[1] === `leave ${g} (account removed)`)
      .map(x => [x[3], x[4]]),
    [
      ['ok', B],
      ['ok', C]
    ]
  );
});

test('the guard: no change takes the last admin or the last manager away; it stops, nothing written but its row', () => {
  const s = loadCodeGs();
  ['Pat', 'Ana', 'Ben', 'Max'].forEach(n => save(s, n));
  // Max holds the manager's seat alone, Ben the admin's.
  const mg = seat(s, ['Max'], ['Ben']);
  assert.deepStrictEqual(seats(s), {admin: 1, manager: 1});
  const tabs = () => JSON.stringify([s.sheets.Roles.rows, s.sheets.Groups.rows, s.sheets['Group settings'].rows, s.sheets.RAs.rows]);
  const before = tabs();
  const [M, B] = [auid(s, 'Max'), auid(s, 'Ben')];
  const stop = (label, r, seat) => (assert.deepStrictEqual(copy(r), {ok: false, error: 'last', seat, v: r.v}, label), label);
  stop('revoke admin', s.post({roleRevoke: {account: 'Ben', role: 'admin', scope: 'platform'}, token: TOK}), 'admin');
  stop('leave', join(s, 'Max', mg, false), 'manager');
  stop('the bundle edited', edit(s, mg, {rights: [R('players'), R('settings')]}), 'manager');
  stop('delete', s.post({userDelete: 'Max', token: TOK}), 'manager');
  stop('merge', s.post({userMerge: {from: 'Max', into: 'Ana', data: {}}, token: TOK}), 'manager');
  stop('archive', s.post({userArchive: {from: 'Ben', into: 'Ben-old'}, token: TOK}), 'admin');
  assert.strictEqual(tabs(), before, 'nothing written');
  assert.deepStrictEqual(
    full(s)
      .filter(x => x[3] === 'last')
      .map(x => x.slice(1)),
    [
      ['revoke admin', 'platform', 'last', B, 'admins 1', 'admins 0'],
      [`leave ${mg}`, IMR, 'last', M, 'managers 1', 'managers 0'],
      [`rights ${mg}`, IMR, 'last', mg, 'managers 1', 'managers 0'],
      ['remove (account removed)', IMR, 'last', M, 'managers 1', 'managers 0'],
      ['remove (account removed)', IMR, 'last', M, 'managers 1', 'managers 0'],
      ['remove (account removed)', 'platform', 'last', B, 'admins 1', 'admins 0']
    ]
  );
  // One account holding both: its removal empties both.
  join(s, 'Ben', mg);
  assert.strictEqual(join(s, 'Max', mg, false).n, 1);
  assert.strictEqual(s.post({userDelete: 'Ben', token: TOK}).seat, 'admin,manager');
  // A manager counts only with the full bundle, under its code: Ana with players and settings alone is none.
  const ps = make(s, 'Helpers', {rights: [R('players'), R('settings')]}).group.id;
  join(s, 'Ana', ps);
  assert.deepStrictEqual(seats(s), {admin: 1, manager: 1});
  // With a second holder, each goes; then the last one stops again (1 + 1 is the hard minimum).
  join(s, 'Pat', mg);
  assert.strictEqual(s.post({roleGrant: {account: 'Pat', role: 'admin', scope: 'platform'}, token: TOK}).result, 'ok');
  assert.deepStrictEqual(seats(s), {admin: 2, manager: 2});
  assert.strictEqual(join(s, 'Ben', mg, false).n, 1);
  assert.strictEqual(s.post({roleRevoke: {account: 'Ben', role: 'admin', scope: 'platform'}, token: TOK}).result, 'ok');
  assert.strictEqual(join(s, 'Pat', mg, false).error, 'last');
  // An admin on the list holds the grant: with players and settings, it counts as a manager.
  join(s, 'Pat', ps);
  assert.strictEqual(join(s, 'Pat', mg, false).n, 1, 'Pat stays a manager through Helpers and the admin list');
  assert.deepStrictEqual(seats(s), {admin: 1, manager: 1});
  // A code changed: no longer a holder (it cannot be stopped: nothing is written).
  run(s, `sheet_('RAs', HEAD).getRange(find_(sheet_('RAs', HEAD), 'Pat'), 7).setValue(hash_('Pat', '9999'))`);
  assert.deepStrictEqual(seats(s), {admin: 0, manager: 0});
  // A seat already empty stops nothing that does not lower it; the token is no holder.
  const s2 = loadCodeGs();
  save(s2, 'Ana');
  const t = make(s2, 'Trainers', {rights: [R('live')]}).group.id;
  assert.deepStrictEqual(seats(s2), {admin: 0, manager: 0});
  assert.strictEqual(join(s2, 'Ana', t).n, 1);
  assert.strictEqual(join(s2, 'Ana', t, false).n, 1);
});

test('a handover: the seat given to a successor in the same write, confirmed against the exact state previewed', () => {
  const s = loadCodeGs();
  let now = Date.UTC(2026, 10, 27, 1, 0, 0);
  run(s, 'Date.now = () => globalThis.__now();');
  s.ctx.__now = () => now;
  ['Pat', 'Ana', 'Ben'].forEach(n => save(s, n));
  const mg = seat(s, ['Pat']);
  const leave = o => s.post({userGroup: 'Pat', group: mg, on: false, token: TOK, ...o});
  // Named, the successor is shown with the confirmation to send back.
  const c = leave({heir: 'Ana'});
  assert.strictEqual(c.error, 'confirm');
  assert.strictEqual(c.heir, auid(s, 'Ana'));
  assert.match(c.confirm, /^\d{13}\.[A-Za-z0-9]{24}$/);
  assert.strictEqual(leave({heir: 'Nobody'}).error, 'user');
  // Bound to the request: another successor, another change or another caller asks again.
  assert.strictEqual(leave({heir: 'Ben', confirm: c.confirm}).error, 'confirm');
  assert.strictEqual(s.post({userDelete: 'Pat', token: TOK, heir: 'Ana', confirm: c.confirm}).error, 'confirm');
  assert.strictEqual(leave({heir: 'Ana', confirm: c.confirm.replace(/.$/, x => (x === 'a' ? 'b' : 'a'))}).error, 'confirm');
  // Bound to the state: a member added since asks for a new preview.
  const t = make(s, 'Trainers', {rights: [R('live')]}).group.id;
  assert.strictEqual(join(s, 'Ben', t).n, 1);
  assert.strictEqual(leave({heir: 'Ana', confirm: c.confirm}).error, 'confirm', 'the state changed');
  // And to a short time.
  const c2 = leave({heir: 'Ana'});
  now += 5 * 60e3 + 1;
  assert.strictEqual(leave({heir: 'Ana', confirm: c2.confirm}).error, 'confirm', 'expired');
  const c3 = leave({heir: 'Ana'});
  const r = leave({heir: 'Ana', confirm: c3.confirm});
  assert.strictEqual(r.n, 1, JSON.stringify(r));
  assert.deepStrictEqual(seats(s), {admin: 1, manager: 1});
  assert.ok(can(s, 'Ana', 'grant') && can(s, 'Ana', 'players') && !can(s, 'Pat', 'players'));
  const [P, A] = [auid(s, 'Pat'), auid(s, 'Ana')],
    M = MGR.join(',');
  assert.deepStrictEqual(
    full(s)
      .filter(x => /handover|^leave/.test(x[1]))
      .map(x => x.slice(1)),
    [
      [`join ${mg} (handover)`, IMR, 'ok', A, '-', M],
      [`leave ${mg}`, IMR, 'ok', P, `${M},admin@platform`, 'admin@platform']
    ]
  );
  // The admin's seat the same way; a successor that leaves the seat empty still (the account itself) is refused.
  const rv = o => s.post({roleRevoke: {account: 'Pat', role: 'admin', scope: 'platform'}, token: TOK, ...o});
  const self = rv({heir: 'Pat'});
  assert.strictEqual(rv({heir: 'Pat', confirm: self.confirm}).error, 'heir');
  const c4 = rv({heir: 'Ben'});
  assert.strictEqual(rv({heir: 'Ben', confirm: c4.confirm}).result, 'ok');
  assert.ok(can(s, 'Ben', 'platform', 'platform') && !can(s, 'Pat', 'platform', 'platform'));
  assert.deepStrictEqual(
    full(s)
      .filter(x => /admin/.test(x[1]) && x[3] !== 'last')
      .slice(-2)
      .map(x => x.slice(1, 5)),
    [
      ['grant admin (handover)', 'platform', 'ok', auid(s, 'Ben')],
      ['revoke admin', 'platform', 'ok', P]
    ]
  );
  assert.deepStrictEqual(
    full(s)
      .filter(x => x[3] === 'heir')
      .map(x => x.slice(1)),
    [['revoke admin', 'platform', 'heir', P, 'admins 1', 'admins 0']]
  );
});

test("a player's own delete is never trapped: a standby takes the seat over; with none, the seat stays empty, said", () => {
  const s = loadCodeGs();
  ['Pat', 'Ana', 'Ben'].forEach(n => save(s, n));
  const mg = seat(s, ['Pat']);
  const sb = (n, scope, on = true) => s.post({[on ? 'roleGrant' : 'roleRevoke']: {account: n, role: 'standby', scope}, token: TOK});
  assert.strictEqual(sb('Ana', IMR).result, 'ok');
  assert.strictEqual(sb('Ana', IMR).result, 'held');
  assert.strictEqual(sb('Ben', 'platform').result, 'ok');
  assert.strictEqual(sb('Ben', 'instance:other').error, 'input');
  assert.ok(!can(s, 'Ana', 'players') && !can(s, 'Ben', 'grant', 'platform'), 'a standby holds no right');
  assert.deepStrictEqual(
    s.post({roles: 1, token: TOK}).grants.map(g => [g.name, g.role, g.scope]),
    [
      ['Pat', 'admin', 'platform'],
      ['Ana', 'standby', IMR],
      ['Ben', 'standby', 'platform']
    ]
  );
  const [P, A, B] = [auid(s, 'Pat'), auid(s, 'Ana'), auid(s, 'Ben')];
  assert.ok(s.post({selfDelete: 1, dname: 'Pat', dpin: '1234'}).ok, 'never stopped');
  assert.deepStrictEqual(seats(s), {admin: 1, manager: 1});
  assert.ok(can(s, 'Ana', 'players') && can(s, 'Ben', 'platform', 'platform'));
  assert.deepStrictEqual(
    rows(s, 'Roles').map(r => [r[0], r[1]]),
    [['Ben', 'admin']],
    'the standbys used'
  );
  assert.deepStrictEqual(
    full(s)
      .filter(x => /\((standby|account removed)\)/.test(x[1]))
      .map(x => [x[0] === P ? 'Pat' : x[0], ...x.slice(1, 5)]),
    [
      ['Pat', 'grant admin (standby)', 'platform', 'ok', B],
      ['Pat', 'standby admin off (standby)', 'platform', 'ok', B],
      ['Pat', `join ${mg} (standby)`, IMR, 'ok', A],
      ['Pat', 'standby manager off (standby)', IMR, 'ok', A],
      ['Pat', `leave ${mg} (account removed)`, IMR, 'ok', P],
      ['Pat', 'revoke admin (account removed)', 'platform', 'ok', P]
    ]
  );
  // With no standby left: the delete goes through, the seats stay empty, a row and a Deploy log line say so.
  const s2 = loadCodeGs();
  save(s2, 'Pat');
  seat(s2, ['Pat']);
  const P2 = auid(s2, 'Pat');
  assert.ok(s2.post({selfDelete: 1, dname: 'Pat', dpin: '1234'}).ok);
  assert.deepStrictEqual(seats(s2), {admin: 0, manager: 0});
  assert.deepStrictEqual(
    full(s2)
      .filter(x => x[3] === 'vacant')
      .map(x => x.slice(1)),
    [
      ['seat admin empty (self)', 'platform', 'vacant', P2, 'admins 1', 'admins 0'],
      ['seat manager empty (self)', IMR, 'vacant', P2, 'managers 1', 'managers 0']
    ]
  );
  assert.ok(deployLog(s2).some(l => /admin and manager seat left empty by a player's own delete, with no standby/.test(l)));
  // The token still gives them back (the way back is never stored in a tab).
  save(s2, 'Ana');
  assert.strictEqual(s2.post({roleGrant: {account: 'Ana', role: 'admin', scope: 'platform'}, token: TOK}).result, 'ok');
});

test('the grant right is given to a group only by a confirmed request of its own, bound to the state previewed', () => {
  const s = loadCodeGs();
  ['Ana', 'Ben'].forEach(n => save(s, n));
  // A new group: with its making, confirmed (it has no member yet).
  const mk = s.post({groupMake: {n: 'Granters', rights: [R('grant')]}, token: TOK});
  assert.deepStrictEqual([mk.error, mk.members], ['confirm', 0]);
  assert.ok(!defs(s).length, 'nothing made before the confirmation');
  const tr = make(s, 'Trainers', {rights: [R('live')]}).group.id;
  join(s, 'Ana', tr);
  join(s, 'Ben', tr);
  // An existing group: an edit that changes nothing else.
  assert.strictEqual(s.post({groupEdit: tr, rights: [R('live'), R('grant'), R('content')], token: TOK}).error, 'separate');
  assert.strictEqual(s.post({groupEdit: tr, rights: [R('grant')], token: TOK}).error, 'separate', 'live taken away with it');
  assert.strictEqual(s.post({groupEdit: tr, rights: [R('live'), R('grant')], n: 'Hosts', token: TOK}).error, 'separate');
  const c = s.post({groupEdit: tr, rights: [R('live'), R('grant')], token: TOK});
  assert.deepStrictEqual([c.error, c.members], ['confirm', 2]);
  assert.ok(!can(s, 'Ana', 'grant'));
  // Bound to the state: a member gone since asks again.
  join(s, 'Ben', tr, false);
  const c2 = s.post({groupEdit: tr, rights: [R('live'), R('grant')], token: TOK, confirm: c.confirm});
  assert.deepStrictEqual([c2.error, c2.members], ['confirm', 1]);
  assert.ok(s.post({groupEdit: tr, rights: [R('live'), R('grant')], token: TOK, confirm: c2.confirm}).ok);
  assert.ok(can(s, 'Ana', 'grant'));
  // Taking it away asks nothing more.
  assert.ok(s.post({groupEdit: tr, rights: [R('live')], token: TOK}).ok);
});

test("a live game's host is checked again at each question and reveal: a right taken since ends the game", () => {
  const s = loadCodeGs();
  ['Tess', 'Pat'].forEach(n => save(s, n));
  const g = make(s, 'Trainers, corals', {rights: [R('live', AT_CORAL)]}).group.id;
  join(s, 'Tess', g);
  const lv = (step, o = {}) => copy(s.post({lv: step, ...o}));
  const st = lv('start', {lname: 'Tess', lpin: '1234', s: 'coral', t: 'Group 1', n: 3, lim: 20});
  assert.ok(st.ok);
  const me = lv('join', {code: st.code, nick: 'Pat'});
  const Q = {
    ph: [{f: 'acropora-1', u: 'img/acropora-1-m.webp', v: 'wide'}],
    ch: [
      ['Montipora', 'Montipora'],
      ['Acropora', 'Acropora'],
      ['Porites', 'Porites'],
      ['Pocillopora', 'Pocillopora']
    ],
    k: 1
  };
  assert.ok(lv('host', {code: st.code, tk: st.tk, act: 'q', q: Q}).ok, 'the first question, the right held');
  join(s, 'Tess', g, false);
  assert.strictEqual(lv('host', {code: st.code, tk: st.tk, act: 'rev'}).error, 'role');
  assert.strictEqual(lv('poll', {code: st.code, pid: me.pid, pk: me.pk}).ph, 'end', 'its students see it ended');
  assert.strictEqual(lv('host', {code: st.code, tk: st.tk, act: 'q', q: Q}).error, 'role');
  assert.deepStrictEqual(
    audit(s)
      .filter(x => /^live/.test(x[1]))
      .map(x => [x[1], x[2], x[3]]),
    [
      ['live start', AT_CORAL, 'ok'],
      ['live rev', AT_CORAL, 'denied'],
      ['live q', AT_CORAL, 'denied']
    ]
  );
  // A code changed since: no longer the host's account either.
  join(s, 'Tess', g);
  const st2 = lv('start', {lname: 'Tess', lpin: '1234', s: 'coral', t: 'Group 2', n: 3, lim: 20});
  run(s, `sheet_('RAs', HEAD).getRange(find_(sheet_('RAs', HEAD), 'Tess'), 7).setValue(hash_('Tess', '9999'))`);
  assert.strictEqual(lv('host', {code: st2.code, tk: st2.tk, act: 'q', q: Q}).error, 'role');
});

// Every write to a rights store, and whether rightsWrite_ is on its stack: the Roles tab's rows, the Group settings
// tab's Rights cells, the Groups tab's rows of a group that carries rights and its Code hash cells.
function trace(s) {
  run(s, 'sheet_(ROLES.TAB, ROLES.HEAD); gdefTab_(); groupsTab_(); sheet_(AUDIT.TAB, AUDIT.HEAD)');
  const out = [];
  const via = () => {
    const L = Error.stackTraceLimit;
    Error.stackTraceLimit = Infinity;
    const st = new Error().stack;
    Error.stackTraceLimit = L;
    return /\brightsWrite_\b/.test(st);
  };
  const filled = x => String(x ?? '').trim() !== '';
  const rightsG = () =>
    new Set(
      s.sheets['Group settings'].rows
        .slice(1)
        .filter(r => r && filled(r[6]))
        .map(r => String(r[0]))
    );
  const hits = {
    Roles: {row: r => r > 1, cells: r => r > 1},
    'Group settings': {row: (r, v) => r > 1 && filled(v[6]), cells: (r, c, v) => r > 1 && c <= 7 && c + v.length - 1 >= 7},
    Groups: {
      row: (r, v) => r > 1 && (rightsG().has(String(v[0])) || filled(v[3])),
      cells: (r, c, v, sh) =>
        r > 1 &&
        ((c <= 4 && c + v.length - 1 >= 4 && filled(v[4 - c])) || rightsG().has(String(c === 1 ? v[0] : (sh.rows[r - 1] || [])[0])))
    }
  };
  Object.entries(hits).forEach(([tab, hit]) => {
    const sh = s.sheets[tab],
      app = sh.appendRow,
      del = sh.deleteRow,
      dels = sh.deleteRows,
      gr = sh.getRange;
    const note = (what, yes) => yes && out.push([tab, what, via()]);
    sh.appendRow = v => (note('append', hit.row(sh.getLastRow() + 1, v)), app(v));
    sh.deleteRow = r => (note('delete', hit.row(r, sh.rows[r - 1] || [])), del(r));
    sh.deleteRows = (r, n) => {
      for (let i = 0; i < n; i++) note('delete', hit.row(r + i, sh.rows[r + i - 1] || []));
      return dels(r, n);
    };
    sh.getRange = (r, c, nr, nc) => {
      const g = gr(r, c, nr, nc),
        set = g.setValues;
      g.setValues = vals => (
        note(
          'set',
          vals.some((v, i) => hit.cells(r + i, c, v, sh))
        ),
        set(vals)
      );
      return g;
    };
  });
  return out;
}
// Who holds which right at which scope, as can_ answers, for every account of the RAs tab (archives hold none).
const held = s =>
  JSON.parse(
    run(
      s,
      `(() => { const ra = sheet_('RAs', HEAD), v = ra.getLastRow() > 1 ? ra.getRange(2, 1, ra.getLastRow() - 1, HEAD.length).getValues() : [], o = {};
        v.forEach(r => { const who = {name: String(r[0]), h: String(r[6]), id: 'x'};
          o[lc_(r[0])] = ${JSON.stringify(RIGHTS)}.flatMap(x => ${JSON.stringify(SCOPES)}.filter(sc => can_(who, x, sc)).map(sc => x + '@' + sc)); });
        return JSON.stringify(o); })()`
    )
  );
const groupRights = s =>
  Object.fromEntries(rows(s, 'Group settings').map(r => [String(r[0]), copy(run(s, `rightsOf_(${JSON.stringify(String(r[6] ?? ''))})`))]));
// Runs each step and checks it: whoever's rights changed has an 'ok' Audit row of that step about them, and so has each
// group whose rights changed.
function steps(s, L) {
  for (const [label, f] of L) {
    const h0 = held(s),
      g0 = groupRights(s),
      n0 = rows(s, 'Audit').length,
      ids0 = Object.fromEntries(Object.keys(h0).map(k => [k, auid(s, k)]));
    f();
    const h1 = held(s),
      g1 = groupRights(s),
      A = full(s).slice(n0);
    for (const k of new Set([...Object.keys(h0), ...Object.keys(h1)])) {
      const a = JSON.stringify(h0[k] || []),
        b = JSON.stringify(h1[k] || []);
      if (a === b) continue;
      const id = ids0[k] || auid(s, k);
      assert.ok(
        A.some(x => x[4] === id && x[3] === 'ok' && /^(join|leave|grant|revoke|rights \(via) /.test(x[1]) && x[5] !== x[6]),
        `${label}: ${k}'s rights changed (${a} > ${b}) without its Audit row`
      );
    }
    for (const g of new Set([...Object.keys(g0), ...Object.keys(g1)])) {
      const a = (g0[g] || []).join(','),
        b = (g1[g] || []).join(',');
      if (a === b) continue;
      assert.ok(
        A.some(x => x[4] === g && x[1] === `rights ${g}` && x[5] === (a || '-') && x[6] === (b || '-') && x[3] === 'ok') || /^r:/.test(g),
        `${label}: group ${g}'s rights changed (${a} > ${b}) without its 'rights' row`
      );
    }
  }
}

test('no rights change bypasses the one write: every request, every write traced, every change audited', () => {
  const s = loadCodeGs();
  ['Ana', 'Ben', 'Cy', 'Dee', 'Gus', 'Mia', 'Pat', 'Zoe'].forEach(n => save(s, n));
  const out = trace(s);
  const g = {};
  const ok = r => (assert.ok(r && r.ok, JSON.stringify(r)), r);
  asAccounts(s);
  steps(s, [
    ['seed', () => ok(s.post({readAnswers: 1, token: TOK, aname: 'Pat', apin: '1234'}))],
    ['make fish curators', () => (g.cur = ok(make(s, 'Curators, fish', {rights: [R('content', AT_FISH)]})).group)],
    ['make fish trainers', () => (g.tr = ok(make(s, 'Trainers, fish', {rights: [R('live', AT_FISH)]})).group)],
    ['make granters', () => (g.gr = ok(make(s, 'Granters', {rights: [R('grant')]})).group)],
    ['make staff', () => (g.st = ok(make(s, 'Staff', {board: 1})).group)],
    ['make solo', () => (g.solo = ok(make(s, 'Solo', {rights: [R('content', AT_CORAL)]})).group)],
    ['join Ana', () => ok(join(s, 'Ana', g.cur.id))],
    ['join Ben', () => ok(join(s, 'Ben', g.tr.id))],
    ['join Cy', () => ok(join(s, 'Cy', g.tr.id))],
    ['join Gus', () => ok(join(s, 'Gus', g.gr.id))],
    ['join Dee to staff', () => ok(join(s, ['Dee', 'Mia', 'Zoe'], g.st.id))],
    ['Gus joins Dee', () => ok(join(s, 'Dee', g.cur.id, true, 'acct:Gus'))],
    ['Gus joins himself', () => ok(join(s, 'Gus', g.tr.id, true, 'acct:Gus'))],
    ['refused: a list', () => assert.strictEqual(join(s, ['Mia'], g.cur.id).error, 'input')],
    ['refused: mixed', () => assert.strictEqual(edit(s, g.tr.id, {rights: [R('live', AT_FISH), R('cohorts')]}).error, 'scope')],
    ['refused: no grant', () => assert.strictEqual(join(s, 'Mia', g.cur.id, true, 'acct:Ana').error, 'token')],
    ['add a right', () => ok(edit(s, g.tr.id, {rights: [R('live', AT_FISH), R('cohorts', AT_FISH)]}))],
    ['to the instance', () => ok(edit(s, g.tr.id, {rights: [R('live')]}, 'acct:Gus'))],
    ['back to fish', () => ok(edit(s, g.tr.id, {rights: [R('live', AT_FISH)]}))],
    ['rename', () => ok(edit(s, g.cur.id, {n: 'Fish curators', board: 1}))],
    ['leave', () => ok(join(s, 'Cy', g.tr.id, false))],
    ['drop a rights group', () => ok(s.post({groupDrop: g.solo.id, token: TOK}))],
    ['admin on', () => ok(s.post({roleGrant: {account: 'Mia', role: 'admin', scope: 'platform'}, token: TOK}))],
    ['admin off', () => ok(s.post({roleRevoke: {account: 'Mia', role: 'admin', scope: 'platform'}, token: TOK}))],
    ['admin on again', () => ok(s.post({roleGrant: {account: 'Zoe', role: 'admin', scope: 'platform'}, token: TOK}))],
    ['merge', () => ok(s.post({userMerge: {from: 'Ben', into: 'Mia', data: {}}, token: TOK}))],
    ['archive', () => ok(s.post({userArchive: {from: 'Dee', into: 'Dee-old'}, token: TOK}))],
    ['delete', () => ok(s.post({userDelete: 'Zoe', token: TOK}))],
    ['self-delete', () => ok(s.post({selfDelete: 1, dname: 'Gus', dpin: '1234'}))],
    ['last right taken', () => ok(edit(s, g.cur.id, {rights: []}))]
  ]);
  assert.ok(out.length >= 20, 'writes to the rights stores were seen: ' + out.length);
  assert.deepStrictEqual(
    out.filter(x => !x[2]),
    [],
    'every write to a rights store went through rightsWrite_'
  );
});

test('the migration from the roles writes through the one write too', () => {
  const s = loadCodeGs();
  ['Pat', 'Eda', 'Ben'].forEach(n => save(s, n));
  const out = trace(s);
  const legacy = (n, role) =>
    run(
      s,
      `(ra => sheet_(ROLES.TAB, ROLES.HEAD).appendRow([${JSON.stringify(n)}, '${role}', '${role === 'admin' ? 'platform' : IMR}', new Date('2026-11-10T00:00:00Z'), String(ra.getRange(find_(ra, ${JSON.stringify(n)}), 7).getValue())]))(sheet_('RAs', HEAD))`
    );
  // The rows written as an earlier script did (by hand here): not traced.
  out.length = 0;
  legacy('Pat', 'admin');
  legacy('Eda', 'editor');
  legacy('Ben', 'trainer');
  out.length = 0;
  s.props.ONCE_groups = '1';
  steps(s, [['the migration', () => run(s, 'ONCE_.rights()')]]);
  assert.ok(out.length >= 4, String(out.length));
  assert.deepStrictEqual(
    out.filter(x => !x[2]),
    []
  );
  assert.ok(can(s, 'Eda', 'content') && can(s, 'Ben', 'live', AT_FISH));
});

// The next write of a tab's range that pred(row, col) picks throws once, as a Sheets service error does.
const failWrite = (s, tab, pred) => {
  const sh = s.sheets[tab],
    gr = sh.getRange;
  let n = 1;
  sh.getRange = (r, c, nr, nc) => {
    const g = gr(r, c, nr, nc),
      set = g.setValues;
    g.setValues = vals => {
      if (pred(r, c) && n-- > 0) throw new Error('Service Spreadsheets timed out while accessing document');
      return set(vals);
    };
    return g;
  };
};

test("a role group whose Rights cell could not be written is given its rights at the retry (the migration, Pierre's seed)", () => {
  const s = loadCodeGs();
  ['Pat', 'Eda'].forEach(n => save(s, n));
  run(
    s,
    "(ra => sheet_(ROLES.TAB, ROLES.HEAD).appendRow(['Eda', 'editor', 'instance:imr', new Date('2026-11-10T00:00:00Z'), String(ra.getRange(find_(ra, 'Eda'), 7).getValue())]))(sheet_('RAs', HEAD))"
  );
  s.props.ONCE_groups = '1';
  run(s, 'gdefTab_()');
  failWrite(s, 'Group settings', (r, c) => c === 7);
  assert.throws(() => run(s, 'ONCE_.rights()'), /it could not be written; nothing changed/);
  assert.ok(!s.props.ONCE_rights);
  assert.match(run(s, 'ONCE_.rights()'), /^0 groups made from the roles \(\), 1 membership added/);
  assert.ok(can(s, 'Eda', 'content'));
  // The seed: its Managers group made, its Rights cell not written; the next read finishes it.
  failWrite(s, 'Group settings', (r, c) => c === 7);
  s.post({readAnswers: 1, token: TOK, aname: 'Pat', apin: '1234'});
  assert.ok(!s.props.ROLES_SEED, 'not marked done');
  assert.ok(s.post({readAnswers: 1, token: TOK, aname: 'Pat', apin: '1234'}).ok);
  assert.ok(s.props.ROLES_SEED);
  assert.ok(can(s, 'Pat', 'players') && can(s, 'Pat', 'content'));
});

test("a merge whose groups' copy fails keeps the merged name's groups for its retry", () => {
  const s = loadCodeGs();
  ['Ben', 'Mia'].forEach(n => save(s, n));
  const g = make(s, 'Trainers, fish', {rights: [R('live', AT_FISH)]}).group.id,
    st = make(s, 'Staff', {board: 1}).group.id;
  join(s, 'Ben', g);
  join(s, 'Ben', st);
  failWrite(s, 'Groups', (r, c) => c === 1);
  assert.ok(!s.post({userMerge: {from: 'Ben', into: 'Mia', data: {}}, token: TOK}).ok);
  assert.ok(!can(s, 'Ben', 'live', AT_FISH), 'its rights gone first');
  assert.ok(
    rows(s, 'Groups').some(r => r[0] === st && r[1] === 'Ben'),
    'its groups without rights kept'
  );
  assert.ok(s.post({userMerge: {from: 'Ben', into: 'Mia', data: {}}, token: TOK}).ok);
  assert.ok(
    rows(s, 'Groups').some(r => r[0] === st && r[1] === 'Mia'),
    'the kept name joined them'
  );
  assert.ok(!can(s, 'Mia', 'live', AT_FISH), 'never its rights');
});

test('only rightsWrite_ writes the Roles tab or reaches the Groups tab for a write (the source, a tripwire)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'tools', 'sync', 'Code.gs'), 'utf8');
  // Each top-level function's name and body.
  const fns = [...src.matchAll(/^(?:function (\w+)\(|const (\w+) = )/gm)].map((m, i, a) => ({
    name: m[1] || m[2],
    body: src.slice(m.index, i + 1 < a.length ? a[i + 1].index : src.length)
  }));
  const writes = /\.(appendRow|deleteRow|deleteRows|setValue|setValues|insertRow)\(/;
  const roles = fns.filter(f => /ROLES\.TAB/.test(f.body) && writes.test(f.body)).map(f => f.name);
  assert.deepStrictEqual(roles, ['rightsWrite_'], 'the Roles tab');
  const groups = fns.filter(f => /groupsTab_\(\)|GROUPS\.TAB/.test(f.body) && writes.test(f.body)).map(f => f.name);
  assert.deepStrictEqual(groups, ['rightsWrite_', 'groupSet_'], 'the Groups tab (groupSet_ refuses a group that carries rights)');
  // The Rights cell: column 7 of the Group settings tab, written by rightsWrite_ alone; gdefPut_ writes the six before.
  assert.match(fns.find(f => f.name === 'gdefPut_').body, /GDEF\.HEAD\.length - 1/);
  assert.deepStrictEqual(
    fns.filter(f => /getRange\([^)]*, 7\)\.setValue/.test(f.body)).map(f => f.name),
    [],
    'no other code writes column 7 of a tab'
  );
  assert.match(fns.find(f => f.name === 'rightsWrite_').body, /set\(GDEF\.TAB, [^;]*, 7, /, 'rightsWrite_ writes the Rights cell');
});

test('groupSet_ refuses a group that carries rights, whoever calls it', () => {
  const s = loadCodeGs();
  save(s, 'Ana');
  const g = make(s, 'Trainers, fish', {rights: [R('live', AT_FISH)]}).group.id;
  assert.throws(() => run(s, `groupSet_(sheet_('RAs', HEAD), ['Ana'], '${g}', true)`), /a group that carries rights/);
  assert.ok(!can(s, 'Ana', 'live', AT_FISH));
});
