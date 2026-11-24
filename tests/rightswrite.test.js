require('./slot.js').testGuard();
// Groups by scope and the one audited write of every rights change (docs/decisions/2026-11-21-groups-by-scope.md;
// Code.gs scopeOf_, rightParse_, rightsOf_, can_, rightsWrite_, groupDo_, lvTrainer_). A group's rights are at the
// instance or at one subject, never both; a right held at a subject holds there only; a scope the script does not know
// is refused loudly and gives nothing; every write to a rights store goes through rightsWrite_ with its Audit rows.
// Against the in-memory sheet only (rule D1); made-up names.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const {loadCodeGs} = require('./gas.js');

const TOK = 'ghp_write000000000000000000',
  IMR = 'instance:imr',
  FISH = 'subject:fish',
  CORAL = 'subject:coral',
  SLUG = 'subject:seaslug',
  R = (r, at = IMR) => r + '@' + at;
const RIGHTS = ['platform', 'grant', 'players', 'settings', 'content', 'live', 'cohorts'],
  SCOPES = ['platform', IMR, CORAL, FISH, SLUG];
const save = (s, name, pin = '1234') => assert.ok(s.post({name, pin, data: {}, summary: {}, answers: []}).ok);
const run = (s, js) => vm.runInContext(js, s.ctx);
const copy = o => JSON.parse(JSON.stringify(o));
const rows = (s, tab) =>
  copy(s.sheets[tab] ? s.sheets[tab].rows.slice(1).filter(r => r && r[0]) : []).map(r =>
    r.map(c => (typeof c === 'string' && c[0] === "'" ? c.slice(1) : c))
  );
const audit = s => rows(s, 'Audit').map(r => [r[1], r[2], r[3], r[4], r[5]]); // id, action, scope, result, target
const aid = (s, n) => run(s, `aid_(${JSON.stringify(n)})`);
const can = (s, n, right, scope = IMR) =>
  run(s, `can_({name: ${JSON.stringify(n)}, h: hash_(${JSON.stringify(n)}, '1234'), id: 'x'}, '${right}', '${scope}')`);
const make = (s, n, o = {}, token = TOK) => s.post({groupMake: {n, ...o}, token});
const join = (s, who, g, on = true, token = TOK) => s.post({userGroup: who, group: g, on, token});
const edit = (s, g, o, token = TOK) => s.post({groupEdit: g, ...o, token});
const defs = s => s.post({users: 1, token: TOK}).groupDefs;
const deployLog = s => rows(s, 'Deploy log').map(r => String(r[1]));
// caller_ stubbed so the token 'acct:<name>' is that account (its code 1234), as an account caller will be.
const asAccounts = s =>
  run(
    s,
    `caller_ = (c => t => { const m = /^acct:(.+)$/.exec(String(t || '')); return m ? {name: m[1], h: hash_(m[1], '1234'), id: aid_(m[1])} : c(t); })(caller_)`
  );
const failAudit = (s, n = 1) => {
  run(s, 'sheet_(AUDIT.TAB, AUDIT.HEAD)');
  const sh = s.sheets.Audit,
    append = sh.appendRow;
  sh.appendRow = v => {
    if (n-- > 0) throw new Error('Service Spreadsheets timed out while accessing document');
    return append(v);
  };
};

test('a scope is the instance or one of its subjects, by its exact id; anything else is refused, never widened', () => {
  const s = loadCodeGs();
  const parse = e => copy(run(s, `rightParse_(${JSON.stringify(e)})`));
  assert.deepStrictEqual(parse(R('players')), ['players', IMR]);
  assert.deepStrictEqual(parse(R('content', FISH)), ['content', FISH]);
  assert.deepStrictEqual(parse(R('live', SLUG)), ['live', SLUG]);
  assert.deepStrictEqual(parse(R('cohorts', CORAL)), ['cohorts', CORAL]);
  [
    'content',
    'content@',
    '@' + FISH,
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
    'Content@' + FISH,
    // Only the Curators' and the Trainers' rights take a subject: never the players, the settings nor the grant.
    R('players', FISH),
    R('settings', FISH),
    R('grant', FISH),
    R('platform', FISH),
    'platform@platform'
  ].forEach(e => assert.strictEqual(parse(e), null, e));
  // The cell's order: RIGHTS', the instance's scope first; an entry it does not take is named by rightsBad_.
  assert.deepStrictEqual(copy(run(s, `rightsOf_('live@subject:fish, content@subject:fish, live@subject:fish, x@y')`)), [
    R('content', FISH),
    R('live', FISH)
  ]);
  assert.deepStrictEqual(copy(run(s, `rightsBad_('live@subject:fish, x@y, players@subject:fish')`)), ['x@y', R('players', FISH)]);
  assert.strictEqual(run(s, `groupScope_([])`), '');
  assert.strictEqual(run(s, `groupScope_(['content@subject:fish', 'live@subject:fish'])`), FISH);
  assert.strictEqual(run(s, `groupScope_(['content@subject:fish', 'live@instance:imr'])`), null);
  assert.strictEqual(run(s, `groupScope_(['content@subject:fish', 'content@subject:coral'])`), null);
});

test('a request with an unknown or malformed scope is refused (input), one that mixes scopes too (scope); nothing is written', () => {
  const s = loadCodeGs();
  save(s, 'Ana');
  const g = make(s, 'Curators, fish', {rights: [R('content', FISH)]}).group.id;
  const cells = () => JSON.stringify(s.sheets['Group settings'].rows);
  const was = cells();
  [
    ['content@subject:whales'],
    ['content@subject:Fish'],
    [R('players', FISH)],
    [R('grant', CORAL)],
    ['content@' + FISH + ',' + R('live', FISH)],
    [R('content', FISH) + ' ']
  ].forEach(x => {
    assert.strictEqual(make(s, 'X', {rights: x}).error, 'input', JSON.stringify(x));
    assert.strictEqual(edit(s, g, {rights: x}).error, 'input', JSON.stringify(x));
  });
  [
    [R('content', FISH), R('live')],
    [R('content', FISH), R('content', CORAL)],
    [R('live', SLUG), R('players')]
  ].forEach(x => {
    assert.strictEqual(make(s, 'X', {rights: x}).error, 'scope', JSON.stringify(x));
    assert.strictEqual(edit(s, g, {rights: x}).error, 'scope', JSON.stringify(x));
  });
  assert.strictEqual(cells(), was, 'nothing written');
  assert.deepStrictEqual(copy(defs(s).map(d => [d.n, d.rights])), [['Curators, fish', [R('content', FISH)]]]);
  // Every refusal is audited as the request it was (capped refusals aside), by id only.
  assert.ok(audit(s).filter(x => x[1] === 'groupEdit' && x[3] === 'scope').length === 3);
});

test('a right held at a subject holds there only: never at the instance, another subject, nor any other right', () => {
  const s = loadCodeGs();
  ['Ana', 'Ben', 'Cy', 'Dee'].forEach(n => save(s, n));
  const cur = make(s, 'Curators, fish', {rights: [R('content', FISH)]}).group.id,
    tr = make(s, 'Trainers, sea slugs', {rights: [R('live', SLUG), R('cohorts', SLUG)]}).group.id,
    all = make(s, 'Curators', {rights: [R('content')]}).group.id;
  join(s, 'Ana', cur);
  join(s, 'Ben', tr);
  join(s, 'Cy', all);
  const want = {
    Ana: [R('content', FISH)],
    Ben: [R('live', SLUG), R('cohorts', SLUG)],
    // The instance's right holds at each of its subjects.
    Cy: [R('content'), R('content', CORAL), R('content', FISH), R('content', SLUG)],
    Dee: []
  };
  for (const n of Object.keys(want))
    for (const r of RIGHTS) for (const sc of SCOPES) assert.strictEqual(can(s, n, r, sc), want[n].includes(R(r, sc)), `${n} ${r} ${sc}`);
  // A scope can_ does not know gives nothing, even to a holder at the instance.
  ['subject:whales', 'subject:', 'subject:Fish', 'instance:other', '', 'group:' + all].forEach(sc =>
    assert.ok(!can(s, 'Cy', 'content', sc), sc)
  );
  // The groups' rights as the admin reads them.
  assert.deepStrictEqual(copy(defs(s).map(d => d.rights)), [[R('content', FISH)], [R('live', SLUG), R('cohorts', SLUG)], [R('content')]]);
});

test('every privileged endpoint refuses a holder of a subject-scoped right; changing a subject group asks the grant right', () => {
  const s = loadCodeGs();
  ['Ana', 'Ben', 'Gus', 'Mia'].forEach(n => save(s, n));
  const cur = make(s, 'Curators, fish', {rights: [R('content', FISH)]}).group.id,
    tr = make(s, 'Trainers, fish', {rights: [R('live', FISH)]}).group.id,
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
    {groupMake: {n: 'Mine', rights: [R('content', FISH)]}},
    {groupEdit: cur, rights: [R('content', FISH), R('live', FISH)]},
    {groupEdit: cur, n: 'Ours'},
    {groupDrop: tr},
    {userGroup: 'Ben', group: cur, on: true},
    {userGroup: 'Ana', group: cur, on: false},
    {userBoard: 'Ben', hide: true},
    {statsExclude: aid(s, 'Ben'), on: true}
  ].forEach(b => assert.strictEqual(s.post({...b, token: ana}).error, 'token', JSON.stringify(b)));
  // The players right alone: no subject group's members nor rights.
  assert.strictEqual(join(s, 'Ben', cur, true, 'acct:Mia').error, 'token');
  assert.strictEqual(edit(s, cur, {rights: [R('content', FISH), R('live', FISH)]}, 'acct:Mia').error, 'token');
  // The instance's grant reaches its subjects.
  assert.strictEqual(join(s, 'Ben', cur, true, 'acct:Gus').n, 1);
  assert.ok(can(s, 'Ben', 'content', FISH));
  assert.ok(edit(s, cur, {rights: [R('content', FISH), R('live', FISH)]}, 'acct:Gus').ok);
  assert.ok(can(s, 'Ana', 'live', FISH) && !can(s, 'Ana', 'live', CORAL));
  // A group that carries rights is deleted with the grant right only, its rights taken away first, audited.
  assert.strictEqual(join(s, 'Ben', tr, false, 'acct:Gus').n, 1);
  assert.strictEqual(s.post({groupDrop: tr, token: 'acct:Mia'}).error, 'token', 'the players right alone');
  assert.ok(s.post({groupDrop: tr, token: 'acct:Gus'}).ok);
  assert.deepStrictEqual(
    audit(s)
      .filter(x => x[4] === tr && /^(rights|right[+-]) /.test(x[1]))
      .map(x => x.slice(1, 4)),
    [
      [`rights - > ${R('live', FISH)}`, FISH, 'ok'],
      [`right+ ${R('live', FISH)}`, FISH, 'ok'],
      [`rights ${R('live', FISH)} > -`, FISH, 'ok'],
      [`right- ${R('live', FISH)}`, FISH, 'ok']
    ]
  );
});

test("a live game is hosted with live at the game's subject: a fish trainer hosts fish, never the corals", () => {
  const s = loadCodeGs();
  ['Tess', 'Ina'].forEach(n => save(s, n));
  join(s, 'Tess', make(s, 'Trainers, fish', {rights: [R('live', FISH)]}).group.id);
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
      .map(x => [x[0] === aid(s, 'Tess') ? 'Tess' : 'Ina', x[2], x[3]]),
    [
      ['Tess', FISH, 'ok'],
      ['Tess', CORAL, 'denied'],
      ['Tess', IMR, 'denied'],
      ['Ina', FISH, 'ok'],
      ['Ina', CORAL, 'ok']
    ]
  );
});

test('a Rights cell written by hand: an entry the script does not take gives nothing and is logged; a rename keeps the cell', () => {
  const s = loadCodeGs();
  ['Ana', 'Ben'].forEach(n => save(s, n));
  const g = make(s, 'Curators, fish', {rights: [R('content', FISH)]}).group.id,
    h = make(s, 'Mixed', {rights: [R('live', FISH)]}).group.id;
  join(s, 'Ana', g);
  join(s, 'Ben', h);
  const sh = s.sheets['Group settings'];
  sh.rows[1][6] = 'content@subject:fish, players@subject:fish, grant@instance:other, platform@platform';
  sh.rows[2][6] = 'live@subject:fish, content@instance:imr';
  for (const sc of SCOPES) for (const r of ['players', 'grant', 'platform', 'settings']) assert.ok(!can(s, 'Ana', r, sc), `${r} ${sc}`);
  assert.ok(can(s, 'Ana', 'content', FISH) && !can(s, 'Ana', 'content', IMR));
  // A cell mixing scopes: each entry at its own scope, never more.
  assert.ok(can(s, 'Ben', 'live', FISH) && !can(s, 'Ben', 'live', IMR) && !can(s, 'Ben', 'live', CORAL));
  assert.ok(can(s, 'Ben', 'content', CORAL));
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
  assert.ok(edit(s, g, {rights: [R('content', FISH), R('live', FISH)]}).ok);
  assert.strictEqual(sh.rows[1][6], 'content@subject:fish, live@subject:fish');
  assert.ok(deployLog(s).some(l => l.startsWith(`Roles: rights ${g}: entries that gave nothing dropped from its Rights cell`)));
});

test('the Audit rows say who, what, when, at which scope, about whom, and before and after', () => {
  const s = loadCodeGs();
  ['Ana', 'Ben'].forEach(n => save(s, n));
  const g = make(s, 'Trainers, fish', {rights: [R('live', FISH)]}).group.id;
  join(s, 'Ana', g);
  join(s, 'Ben', g);
  assert.ok(edit(s, g, {rights: [R('live', FISH), R('cohorts', FISH)]}).ok);
  assert.ok(edit(s, g, {rights: [R('live'), R('cohorts')]}).ok, 'a group with members moves to the instance: grant');
  join(s, 'Ben', g, false);
  const [A, B] = [aid(s, 'Ana'), aid(s, 'Ben')];
  const all = rows(s, 'Audit');
  assert.ok(
    all.every(r => new Date(r[0]).getTime() > 0),
    'when'
  );
  const by = all[0][1];
  assert.match(by, /^gh:/, 'who: the token by its id');
  assert.deepStrictEqual(
    audit(s).filter(x => !/^group|^user/.test(x[1])),
    [
      [by, `rights - > ${R('live', FISH)}`, FISH, 'ok', g],
      [by, `right+ ${R('live', FISH)}`, FISH, 'ok', g],
      [by, `join ${g}`, FISH, 'ok', A],
      [by, `join ${g}`, FISH, 'ok', B],
      [by, `rights ${R('live', FISH)} > ${R('live', FISH)},${R('cohorts', FISH)}`, FISH, 'ok', g],
      [by, `grant cohorts (via ${g})`, FISH, 'ok', A],
      [by, `grant cohorts (via ${g})`, FISH, 'ok', B],
      [by, `right+ ${R('cohorts', FISH)}`, FISH, 'ok', g],
      [by, `rights ${R('live', FISH)},${R('cohorts', FISH)} > ${R('live')},${R('cohorts')}`, IMR, 'ok', g],
      [by, `grant live (via ${g})`, IMR, 'ok', A],
      [by, `grant live (via ${g})`, IMR, 'ok', B],
      [by, `right+ ${R('live')}`, IMR, 'ok', g],
      [by, `grant cohorts (via ${g})`, IMR, 'ok', A],
      [by, `grant cohorts (via ${g})`, IMR, 'ok', B],
      [by, `right+ ${R('cohorts')}`, IMR, 'ok', g],
      [by, `revoke live (via ${g})`, FISH, 'ok', A],
      [by, `revoke live (via ${g})`, FISH, 'ok', B],
      [by, `right- ${R('live', FISH)}`, FISH, 'ok', g],
      [by, `revoke cohorts (via ${g})`, FISH, 'ok', A],
      [by, `revoke cohorts (via ${g})`, FISH, 'ok', B],
      [by, `right- ${R('cohorts', FISH)}`, FISH, 'ok', g],
      [by, `leave ${g}`, IMR, 'ok', B]
    ]
  );
  assert.ok(!JSON.stringify(s.sheets.Audit.rows).match(/Ana|Ben/), 'ids only, never a name');
});

test('a leave or a revoke saved without its Audit row answers an error; its retry writes that row', () => {
  const s = loadCodeGs();
  ['Ana', 'Pat'].forEach(n => save(s, n));
  const g = make(s, 'Trainers, fish', {rights: [R('live', FISH)]}).group.id;
  join(s, 'Ana', g);
  failAudit(s);
  assert.strictEqual(join(s, 'Ana', g, false).error, 'server');
  assert.ok(!can(s, 'Ana', 'live', FISH), 'the right is gone at once');
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
  assert.ok(!can(s, 'Pat', 'grant', 'platform'));
  assert.strictEqual(s.post({roleRevoke: {account: 'Pat', role: 'admin', scope: 'platform'}, token: TOK}).result, 'ok');
  assert.strictEqual(s.post({roleRevoke: {account: 'Pat', role: 'admin', scope: 'platform'}, token: TOK}).result, 'none');
  // A delete whose rights row fails stops before anything else of the account goes; its retry finishes it.
  join(s, 'Ana', g);
  failAudit(s);
  assert.ok(!s.post({userDelete: 'Ana', token: TOK}).ok);
  assert.ok(
    rows(s, 'RAs').some(r => r[0] === 'Ana'),
    'the account is still there'
  );
  assert.ok(!can(s, 'Ana', 'live', FISH), 'its right gone');
  assert.ok(s.post({userDelete: 'Ana', token: TOK}).ok);
  assert.deepStrictEqual(
    audit(s)
      .filter(x => x[1] === `leave ${g} (account removed)`)
      .map(x => x[3]),
    ['ok']
  );
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
      ids0 = Object.fromEntries(Object.keys(h0).map(k => [k, aid(s, k)]));
    f();
    const h1 = held(s),
      g1 = groupRights(s),
      A = audit(s).slice(n0);
    for (const k of new Set([...Object.keys(h0), ...Object.keys(h1)])) {
      const a = JSON.stringify(h0[k] || []),
        b = JSON.stringify(h1[k] || []);
      if (a === b) continue;
      const id = ids0[k] || aid(s, k);
      assert.ok(
        A.some(x => x[4] === id && x[3] === 'ok' && /^(join|leave|grant|revoke) /.test(x[1])),
        `${label}: ${k}'s rights changed (${a} > ${b}) without its Audit row`
      );
    }
    for (const g of new Set([...Object.keys(g0), ...Object.keys(g1)])) {
      const a = (g0[g] || []).join(','),
        b = (g1[g] || []).join(',');
      if (a === b) continue;
      assert.ok(
        A.some(x => x[4] === g && x[1] === `rights ${a || '-'} > ${b || '-'}` && x[3] === 'ok') || /^r:/.test(g),
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
    ['make fish curators', () => (g.cur = ok(make(s, 'Curators, fish', {rights: [R('content', FISH)]})).group)],
    ['make fish trainers', () => (g.tr = ok(make(s, 'Trainers, fish', {rights: [R('live', FISH)]})).group)],
    ['make granters', () => (g.gr = ok(make(s, 'Granters', {rights: [R('grant')]})).group)],
    ['make staff', () => (g.st = ok(make(s, 'Staff', {board: 1})).group)],
    ['make solo', () => (g.solo = ok(make(s, 'Solo', {rights: [R('content', CORAL)]})).group)],
    ['join Ana', () => ok(join(s, 'Ana', g.cur.id))],
    ['join Ben', () => ok(join(s, 'Ben', g.tr.id))],
    ['join Cy', () => ok(join(s, 'Cy', g.tr.id))],
    ['join Gus', () => ok(join(s, 'Gus', g.gr.id))],
    ['join Dee to staff', () => ok(join(s, ['Dee', 'Mia', 'Zoe'], g.st.id))],
    ['Gus joins Dee', () => ok(join(s, 'Dee', g.cur.id, true, 'acct:Gus'))],
    ['Gus joins himself', () => ok(join(s, 'Gus', g.tr.id, true, 'acct:Gus'))],
    ['refused: a list', () => assert.strictEqual(join(s, ['Mia'], g.cur.id).error, 'input')],
    ['refused: mixed', () => assert.strictEqual(edit(s, g.tr.id, {rights: [R('live', FISH), R('cohorts')]}).error, 'scope')],
    ['refused: no grant', () => assert.strictEqual(join(s, 'Mia', g.cur.id, true, 'acct:Ana').error, 'token')],
    ['add a right', () => ok(edit(s, g.tr.id, {rights: [R('live', FISH), R('cohorts', FISH)]}))],
    ['to the instance', () => ok(edit(s, g.tr.id, {rights: [R('live')]}, 'acct:Gus'))],
    ['back to fish', () => ok(edit(s, g.tr.id, {rights: [R('live', FISH)]}))],
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
  assert.ok(can(s, 'Eda', 'content') && can(s, 'Ben', 'live', FISH));
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
    ['rightsWrite_']
  );
});

test('groupSet_ refuses a group that carries rights, whoever calls it', () => {
  const s = loadCodeGs();
  save(s, 'Ana');
  const g = make(s, 'Trainers, fish', {rights: [R('live', FISH)]}).group.id;
  assert.throws(() => run(s, `groupSet_(sheet_('RAs', HEAD), ['Ana'], '${g}', true)`), /a group that carries rights/);
  assert.ok(!can(s, 'Ana', 'live', FISH));
});
