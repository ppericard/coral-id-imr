require('./slot.js').testGuard();
// Rights (enforced by the sync script through one can_() check and an audit log, never by the page; rights are
// separate, the platform admin may give himself an instance's rights and it is logged): Code.gs can_, gate_, the admin
// list (the Roles tab's admin rows), the groups that carry an instance's rights, the Audit tab, Pierre's rights, and what
// a delete, a merge or an archive does to an account's rights (rule D7). The groups' own rules (gates, code hash,
// migration) are in tests/rights.test.js. Against the in-memory sheet only (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const {loadCodeGs} = require('./gas.js');

const TOK = 'ghp_write000000000000000000', // can push: the admin token
  READ = 'ghp_read0000000000000000000'; // a GitHub token that can only read the repository: no admin
const IMR = 'instance:imr';
const save = (s, name, pin = '1234') => s.post({name, pin, data: {}, summary: {}, answers: []});
// A copy out of the script's realm, so deepStrictEqual compares values only. Each cell as Sheets holds it: an id that
// starts with + or - (aid_ is base64) is written through safe_ as '+…, and Sheets keeps the leading apostrophe as a text
// mark, not as the value; the in-memory sheet's appendRow keeps it, so it is taken off here (a CI run's salt hit it).
const rows = (s, tab) =>
  JSON.parse(JSON.stringify(s.sheets[tab] ? s.sheets[tab].rows.slice(1).filter(r => r && r[0]) : [])).map(r =>
    r.map(c => (typeof c === 'string' && c[0] === "'" ? c.slice(1) : c))
  );
const audit = s => rows(s, 'Audit').map(r => ({id: r[1], action: r[2], scope: r[3], result: r[4], target: r[5]}));
const aid = (s, n) => vm.runInContext(`aid_(${JSON.stringify(n)})`, s.ctx);
const run = (s, js) => vm.runInContext(js, s.ctx);
// The admin list: the one role still granted.
const grant = (s, account, role = 'admin', scope = 'platform', token = TOK) => s.post({roleGrant: {account, role, scope}, token});
const revoke = (s, account, role = 'admin', scope = 'platform', token = TOK) => s.post({roleRevoke: {account, role, scope}, token});
// An instance role's rights, through a group named after the role that carries them (made once), the account added.
const RIGHTS_OF = {owner: ['players', 'settings', 'grant'], editor: ['content'], trainer: ['cohorts', 'live']};
const groupOf = (s, role) => {
  const had = s.post({users: 1, token: TOK}).groupDefs.find(d => d.n === role);
  return (had || s.post({groupMake: {n: role, rights: RIGHTS_OF[role].map(r => r + '@' + IMR)}, token: TOK}).group).id;
};
const give = (s, account, role, token = TOK) => s.post({userGroup: account, group: groupOf(s, role), on: true, token});
// The account form can_ takes: a name and its code hash, checked by the caller.
const acct = (s, n, pin = '1234') =>
  run(s, `({name: ${JSON.stringify(n)}, h: hash_(${JSON.stringify(n)}, '${pin}'), id: aid_(${JSON.stringify(n)})})`);
const can = (s, who, right, scope) => run(s, `can_(${JSON.stringify(who)}, '${right}', '${scope}')`);
// No word of any Audit cell is a player's name (an anonymous id is one word of 8 characters, gh:… the token's).
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

// Every privileged endpoint today, as the admin page and the Analyses Action send it. Players Ana and Ben exist.
const ENDPOINTS = [
  ['readReports', () => ({readReports: 1})],
  ['readEvents', () => ({readEvents: 1})],
  ['readPages', () => ({readEvents: 1, pages: 1})],
  ['readAlerts', () => ({readAlerts: 1})],
  ['analysesGet', () => ({analysesGet: 1, head: 1})],
  ['analysesPut', () => ({analysesPut: 1, report: JSON.stringify({R: {}, answers: 1, made: 1})})],
  ['readStats', () => ({readStats: 1})],
  ['readAnswers', () => ({readAnswers: 1})],
  ['readLive', () => ({readLive: 1})],
  ['users', () => ({users: 1})],
  ['userData', () => ({userData: 'Ana'})],
  ['userBoard', () => ({userBoard: 'Ana', hide: true})],
  ['userGroup', () => ({userGroup: 'Ana', group: 'g:00000000', on: true})],
  // the groups themselves (tests/playergroups.test.js, tests/rights.test.js)
  ['groupMake', () => ({groupMake: {n: 'RA Test', board: 1}})],
  ['groupEdit', () => ({groupEdit: 'g:00000000', n: 'RA Test 2'})],
  ['groupDrop', () => ({groupDrop: 'g:00000000'})],
  ['userStart', () => ({userStart: 'Ana', s: 'coral', c: 'imr'})],
  ['statsExclude', () => ({statsExclude: 'AbCd1234', on: true})],
  ['anonDelete', () => ({anonDelete: ['AbCd1234']})],
  ['userArchive', () => ({userArchive: {from: 'Ana', into: 'Ana-old'}})],
  ['userDelete', () => ({userDelete: 'Ana', answers: true})],
  ['userMerge', () => ({userMerge: {from: 'Ana', into: 'Ben', data: {}}})],
  ['mergePlan', () => ({mergePlan: {from: 'Ana', into: 'Ben'}})],
  ['roles', () => ({roles: 1})],
  ['roleGrant', () => ({roleGrant: {account: 'Ana', role: 'admin', scope: 'platform'}})],
  ['roleRevoke', () => ({roleRevoke: {account: 'Ana', role: 'admin', scope: 'platform'}})]
];
// The changes: one Audit row each when allowed.
const WRITES = new Set([
  'analysesPut',
  'userBoard',
  'userGroup',
  'groupMake',
  'groupEdit',
  'groupDrop',
  'userStart',
  'statsExclude',
  'anonDelete',
  'userArchive',
  'userDelete',
  'userMerge',
  'roleGrant',
  'roleRevoke'
]);

test('every privileged endpoint: refused without the right (no token, a read-only token), and nothing changes', () => {
  for (const [name, body] of ENDPOINTS)
    for (const token of [undefined, '', 'nope', READ]) {
      const s = loadCodeGs();
      save(s, 'Ana');
      save(s, 'Ben', '5678');
      const before = JSON.stringify(Object.fromEntries(Object.entries(s.sheets).filter(([k]) => k !== 'Audit' && k !== 'Alerts')));
      const out = s.post({...body(), ...(token === undefined ? {} : {token})});
      assert.deepStrictEqual([out.ok, out.error], [false, 'token'], name + ' with ' + token);
      const after = JSON.stringify(Object.fromEntries(Object.entries(s.sheets).filter(([k]) => k !== 'Audit' && k !== 'Alerts')));
      assert.strictEqual(after, before, name + ': nothing written but the refusal');
      const a = audit(s);
      assert.strictEqual(a.length, 1, name + ': the refusal audited');
      assert.deepStrictEqual([a[0].id, a[0].result], ['', 'denied']);
    }
});

test('every privileged endpoint: allowed with the admin token (the platform admin), as today; each change audited', () => {
  for (const [name, body] of ENDPOINTS) {
    const s = loadCodeGs();
    save(s, 'Ana');
    save(s, 'Ben', '5678');
    const out = s.post({...body(), token: TOK});
    assert.notStrictEqual(out.error, 'token', name);
    const a = audit(s);
    if (!WRITES.has(name)) {
      assert.deepStrictEqual(a, [], name + ': a read writes no Audit row');
      continue;
    }
    assert.ok(a.length >= 1, name + ': audited');
    const row = a.find(x => x.action === name || x.action.startsWith(name.replace('role', '').toLowerCase()));
    assert.ok(row, name + ': its own row ' + JSON.stringify(a));
    assert.match(row.id, /^gh:[A-Za-z0-9+/]{8}$/, 'the token by its id, never the token');
    assert.ok(!JSON.stringify(a).includes(TOK), 'the token itself is never written');
    assert.strictEqual(row.scope, /^role/.test(name) ? 'platform' : IMR);
    noName(s, 'Ana', 'Ben');
  }
});

test('the audit of a change: its result and target by anonymous id, never the name sent', () => {
  const s = loadCodeGs();
  save(s, 'Ana');
  save(s, 'Ben', '5678');
  s.post({userBoard: 'Ana', hide: true, token: TOK});
  s.post({userDelete: 'Nobody', token: TOK});
  s.post({userMerge: {from: 'Ana', into: 'Ben', data: {}}, token: TOK});
  const a = audit(s);
  assert.deepStrictEqual(
    a.map(x => [x.action, x.result, x.target]),
    [
      ['userBoard', 'ok', aid(s, 'Ana')],
      ['userDelete', 'user', aid(s, 'Nobody')],
      ['userMerge', 'ok', aid(s, 'Ana') + ' > ' + aid(s, 'Ben')]
    ]
  );
  assert.ok(
    a.every(x => x.id === a[0].id),
    'one token, one id'
  );
  noName(s, 'Ana', 'Ben', 'Nobody');
});

test('refusals are audited at most 20 times every 6 hours (anyone can send one), then one Alerts line', () => {
  const s = loadCodeGs();
  for (let i = 0; i < 30; i++) s.post({readReports: 1, token: 'nope'});
  assert.strictEqual(audit(s).length, 20);
  assert.strictEqual(rows(s, 'Alerts').filter(r => /auditdeny/.test(r[1])).length, 1);
});

test('a refusal takes no script lock', () => {
  const s = loadCodeGs();
  s.lock.busy = true;
  assert.strictEqual(s.post({userDelete: 'Ana', token: 'nope'}).error, 'token');
  s.lock.busy = false;
  assert.strictEqual(audit(s).length, 1);
});

test("can_: the token passes every right; an account the admin list's and the union of its groups' rights", () => {
  const s = loadCodeGs();
  ['Pat', 'Owen', 'Eda', 'Tia', 'Ana'].forEach(n => save(s, n));
  assert.ok(grant(s, 'Pat').ok);
  assert.ok(give(s, 'Owen', 'owner').ok);
  assert.ok(give(s, 'Eda', 'editor').ok);
  assert.ok(give(s, 'Tia', 'trainer').ok);
  const tok = {token: true, id: 'gh:x'};
  const RIGHTS = ['platform', 'grant', 'players', 'settings', 'content', 'cohorts', 'live'];
  RIGHTS.forEach(r => [IMR, 'platform', 'instance:other'].forEach(sc => assert.ok(can(s, tok, r, sc), 'token ' + r + ' ' + sc)));
  const want = {
    Pat: {platform: ['platform', 'grant'], [IMR]: ['grant'], 'instance:other': ['grant']},
    Owen: {platform: [], [IMR]: ['players', 'settings', 'grant'], 'instance:other': []},
    Eda: {platform: [], [IMR]: ['content'], 'instance:other': []},
    Tia: {platform: [], [IMR]: ['cohorts', 'live'], 'instance:other': []},
    Ana: {platform: [], [IMR]: [], 'instance:other': []}
  };
  for (const n of Object.keys(want))
    for (const sc of Object.keys(want[n]))
      RIGHTS.forEach(r => assert.strictEqual(can(s, acct(s, n), r, sc), want[n][sc].includes(r), `${n} ${r} ${sc}`));
  // The platform admin alone is refused the instance's players and content until a group gives them.
  assert.ok(!can(s, acct(s, 'Pat'), 'players', IMR) && !can(s, acct(s, 'Pat'), 'content', IMR));
  assert.ok(give(s, 'Pat', 'editor').ok);
  assert.ok(can(s, acct(s, 'Pat'), 'content', IMR) && !can(s, acct(s, 'Pat'), 'players', IMR));
  // The union: in two groups, the rights of both.
  assert.ok(give(s, 'Eda', 'trainer').ok);
  assert.ok(can(s, acct(s, 'Eda'), 'content', IMR) && can(s, acct(s, 'Eda'), 'live', IMR) && !can(s, acct(s, 'Eda'), 'players', IMR));
  // A right holds for its account's code hash only, and nobody without a checked code passes.
  assert.ok(!can(s, acct(s, 'Eda', '9999'), 'content', IMR));
  assert.ok(!can(s, acct(s, 'Pat', '9999'), 'grant', 'platform'));
  assert.ok(!can(s, {name: 'Eda'}, 'content', IMR));
  assert.ok(!can(s, null, 'content', IMR));
  // Names Object.prototype has are no right nor scope.
  ['constructor', '__proto__', 'toString'].forEach(r => assert.ok(!can(s, acct(s, 'Owen'), r, IMR) && !can(s, acct(s, 'Owen'), 'players', r), r));
});

// The right each endpoint asks for, seen through an account caller: caller_ stubbed in the script's context so the
// token 'acct:<name>' is that account (no endpoint takes an account's name and code in production yet).
const asAccounts = s =>
  run(
    s,
    `caller_ = t => { const m = /^acct:(.+)$/.exec(String(t || '')); return m ? {name: m[1], h: hash_(m[1], '1234'), id: aid_(m[1])} : null; }`
  );
test('every privileged endpoint asks its right: the Managers pass, the Curators, the Trainers or the platform admin alone do not', () => {
  const ADMIN_EP = new Set(['roleGrant', 'roleRevoke']);
  for (const [name, body] of ENDPOINTS) {
    const verdict = {};
    for (const who of ['Owen', 'Eda', 'Tia', 'Pat', 'Ana']) {
      const s = loadCodeGs();
      ['Owen', 'Eda', 'Tia', 'Pat', 'Ana', 'Ben'].forEach(n => save(s, n));
      give(s, 'Owen', 'owner');
      give(s, 'Eda', 'editor');
      give(s, 'Tia', 'trainer');
      grant(s, 'Pat');
      asAccounts(s);
      verdict[who] = s.post({...body(), token: 'acct:' + who}).error !== 'token';
    }
    // The players endpoints: the Managers only. The admin list: whoever may grant at the platform (the platform admin);
    // reading it, whoever may grant at the instance too.
    const want = ADMIN_EP.has(name)
      ? {Owen: false, Eda: false, Tia: false, Pat: true, Ana: false}
      : name === 'roles'
        ? {Owen: true, Eda: false, Tia: false, Pat: true, Ana: false}
        : {Owen: true, Eda: false, Tia: false, Pat: false, Ana: false};
    assert.deepStrictEqual(verdict, want, name);
  }
});

test('an account changing its own rights writes (self); a platform admin may give himself an instance group', () => {
  const s = loadCodeGs();
  ['Owen', 'Pat'].forEach(n => save(s, n));
  give(s, 'Owen', 'owner');
  grant(s, 'Pat');
  const cur = groupOf(s, 'editor'),
    to = (who, on, token) => s.post({userGroup: who, group: cur, on, token});
  asAccounts(s);
  assert.strictEqual(to('Owen', true, 'acct:Owen').n, 1);
  assert.strictEqual(to('Pat', true, 'acct:Pat').n, 1, 'grant at every scope: he may');
  assert.strictEqual(grant(s, 'Owen', 'admin', 'platform', 'acct:Owen').error, 'token', 'a Manager grants nothing outside its instance');
  assert.strictEqual(to('Owen', false, 'acct:Owen').n, 1);
  assert.deepStrictEqual(
    audit(s)
      .filter(x => !/^userGroup$/.test(x.action))
      .slice(-4)
      .map(x => [x.id, x.action, x.result, x.target]),
    [
      [aid(s, 'Owen'), `join ${cur} (self)`, 'ok', aid(s, 'Owen')],
      [aid(s, 'Pat'), `join ${cur} (self)`, 'ok', aid(s, 'Pat')],
      [aid(s, 'Owen'), 'grant admin', 'denied', ''],
      [aid(s, 'Owen'), `leave ${cur} (self)`, 'ok', aid(s, 'Owen')]
    ]
  );
  noName(s, 'Owen', 'Pat');
});

test('roleGrant and roleRevoke: the admin list only; checked input, live accounts only, held once, each audited', () => {
  const s = loadCodeGs();
  save(s, 'Ana');
  assert.strictEqual(grant(s, 'Ana', 'boss', IMR).error, 'input', 'an unknown role');
  assert.strictEqual(grant(s, 'Ana', 'admin', IMR).error, 'input', 'the platform admin at an instance');
  ['owner', 'editor', 'trainer'].forEach(r => assert.strictEqual(grant(s, 'Ana', r, IMR).error, 'input', r + ": an instance's rights are its groups'"));
  assert.strictEqual(grant(s, 'Ana', 'editor', 'platform').error, 'input', 'an editor of the platform');
  // Names Object.prototype has are no role (Code.gs roleDef_), wherever they are asked.
  ['constructor', 'toString', '__proto__', 'hasOwnProperty'].forEach(r => {
    assert.strictEqual(grant(s, 'Ana', r, IMR).error, 'input', r);
    assert.strictEqual(grant(s, 'Ana', r, 'platform').error, 'input', r);
  });
  assert.strictEqual(grant(s, 'Nobody').error, 'user');
  assert.deepStrictEqual(grant(s, 'ana'), {ok: true, result: 'ok', v: grant(s, 'Ana').v});
  assert.strictEqual(grant(s, 'Ana').result, 'held');
  assert.deepStrictEqual(
    rows(s, 'Roles').map(r => r.slice(0, 3)),
    [['Ana', 'admin', 'platform']],
    'the account as the RAs tab spells it, once'
  );
  // The list: the admin rows only (the record of the roles before the groups is not the admin list).
  run(s, "sheet_(ROLES.TAB, ROLES.HEAD).appendRow(['Ana', 'owner', 'instance:imr', new Date(), 'x'])");
  const list = s.post({roles: 1, token: TOK});
  assert.deepStrictEqual(
    list.grants.map(g => [g.name, g.id, g.role, g.scope]),
    [['Ana', aid(s, 'Ana'), 'admin', 'platform']]
  );
  assert.strictEqual(revoke(s, 'Ana').result, 'ok');
  assert.strictEqual(revoke(s, 'Ana').result, 'none');
  assert.deepStrictEqual(
    rows(s, 'Roles').map(r => r[1]),
    ['owner']
  );
  assert.strictEqual(s.post({userArchive: {from: 'Ana', into: 'Ana-old'}, token: TOK}).ok, true);
  assert.strictEqual(grant(s, 'Ana-old').error, 'archived', 'an archive holds no right');
  assert.deepStrictEqual(
    audit(s)
      .filter(x => /^(grant|revoke)/.test(x.action))
      .map(x => [x.action, x.scope, x.result, x.target]),
    [
      ['grant admin', 'platform', 'user', aid(s, 'Nobody')],
      ['grant admin', 'platform', 'ok', aid(s, 'Ana')],
      ['grant admin', 'platform', 'held', aid(s, 'Ana')],
      ['grant admin', 'platform', 'held', aid(s, 'Ana')],
      ['revoke admin', 'platform', 'ok', aid(s, 'Ana')],
      ['revoke admin', 'platform', 'none', aid(s, 'Ana')],
      ['grant admin', 'platform', 'archived', aid(s, 'Ana-old')]
    ]
  );
  noName(s, 'Ana', 'Nobody');
});

// The rights of an account by its groups' names: [group name, ...] (the users list's gids against its groupDefs).
const groupsOf = (s, n) => {
  const L = s.post({users: 1, token: TOK}),
    u = L.users.find(x => x.name === n);
  return u.gids.map(g => L.groupDefs.find(d => d.id === g).n);
};

test("Pierre's rights: once, to the admin's account, as self-grants by the token: the admin list, the Managers and the Curators", () => {
  const s = loadCodeGs();
  save(s, 'Pat');
  save(s, 'Ana');
  assert.ok(s.post({readAnswers: 1, token: TOK}).ok);
  assert.deepStrictEqual(rows(s, 'Roles'), [], 'no account signed in on the admin page: nothing granted');
  assert.ok(s.post({readAnswers: 1, token: TOK, aname: 'Pat', apin: '0000'}).ok);
  assert.deepStrictEqual(rows(s, 'Roles'), [], 'a wrong code: nothing granted');
  assert.ok(s.post({readAnswers: 1, token: TOK, aname: 'Pat', apin: '1234'}).ok);
  assert.deepStrictEqual(
    rows(s, 'Roles').map(r => r.slice(0, 3)),
    [['Pat', 'admin', 'platform']]
  );
  assert.deepStrictEqual(groupsOf(s, 'Pat'), ['Managers', 'Curators']);
  assert.deepStrictEqual(
    audit(s).map(x => [x.action, x.scope, x.result, x.target]),
    [
      ['grant admin (self)', 'platform', 'ok', aid(s, 'Pat')],
      ['join r:owner (self)', IMR, 'ok', aid(s, 'Pat')],
      ['join r:editor (self)', IMR, 'ok', aid(s, 'Pat')]
    ]
  );
  const p = acct(s, 'Pat');
  assert.ok(can(s, p, 'platform', 'platform') && can(s, p, 'players', IMR) && can(s, p, 'content', IMR));
  // Never again: not twice, not after a leave, not to another account signed in later.
  s.post({readAnswers: 1, token: TOK, aname: 'Pat', apin: '1234'});
  assert.strictEqual(rows(s, 'Roles').length, 1);
  assert.strictEqual(s.post({userGroup: 'Pat', group: 'r:editor', on: false, token: TOK}).n, 1);
  assert.match(audit(s).at(-2).action, /^leave r:editor \(self\)$/, "the admin's account's own: self");
  s.post({readAnswers: 1, token: TOK, aname: 'Pat', apin: '1234'});
  s.post({readAnswers: 1, token: TOK, aname: 'Ana', apin: '1234'});
  assert.deepStrictEqual(groupsOf(s, 'Pat'), ['Managers']);
  assert.deepStrictEqual(groupsOf(s, 'Ana'), []);
  noName(s, 'Pat', 'Ana');
});

// The Audit tab's next n row writes fail, as a Sheets service error does (a grant written, then its Audit row failing:
// the error must never be swallowed).
const failAudit = (s, n = 1) => {
  run(s, 'sheet_(AUDIT.TAB, AUDIT.HEAD)');
  const sh = s.sheets.Audit,
    append = sh.appendRow;
  sh.appendRow = v => {
    if (n-- > 0) throw new Error('Service Spreadsheets timed out while accessing document');
    return append(v);
  };
};
const deployLog = s => rows(s, 'Deploy log').map(r => String(r[1]));

test('a seed that fails after a grant is written is finished by its retry: the rights, one ok Audit row each, the failure logged', () => {
  const s = loadCodeGs();
  save(s, 'Pat');
  failAudit(s);
  assert.ok(s.post({readAnswers: 1, token: TOK, aname: 'Pat', apin: '1234'}).ok, "never the reader's error");
  assert.deepStrictEqual(
    rows(s, 'Roles').map(r => r.slice(0, 3)),
    [['Pat', 'admin', 'platform']],
    'the first grant written, then the seed stopped'
  );
  assert.deepStrictEqual(audit(s), []);
  assert.strictEqual(s.props.ROLES_SEED, undefined, 'not marked done');
  const log = deployLog(s);
  assert.ok(
    log.some(l => /^Roles: Audit row not written \(grant admin \(self\), platform, ok\): Service Spreadsheets/.test(l)),
    log.join('\n')
  );
  assert.ok(
    log.some(l => /^Roles: seed failed, tried again at the next read: grant admin: its Audit row was not written/.test(l)),
    log.join('\n')
  );
  // The next read: the admin grant held without its row gets its "ok" (never "held"), the memberships are written.
  assert.ok(s.post({readAnswers: 1, token: TOK, aname: 'Pat', apin: '1234'}).ok);
  s.post({readAnswers: 1, token: TOK, aname: 'Pat', apin: '1234'});
  assert.deepStrictEqual(rows(s, 'Roles').length, 1);
  assert.deepStrictEqual(groupsOf(s, 'Pat'), ['Managers', 'Curators']);
  assert.deepStrictEqual(
    audit(s).map(x => [x.action, x.scope, x.result, x.target]),
    [
      ['grant admin (self)', 'platform', 'ok', aid(s, 'Pat')],
      ['join r:owner (self)', IMR, 'ok', aid(s, 'Pat')],
      ['join r:editor (self)', IMR, 'ok', aid(s, 'Pat')]
    ]
  );
  assert.ok(s.props.ROLES_SEED, 'marked done once every right has its row');
  noName(s, 'Pat');
  assert.ok(!deployLog(s).some(l => /pat/i.test(l)), 'no name in the Deploy log');
});

test('an Audit row that cannot be written is logged; a grant without its row answers an error and its retry audits it', () => {
  const s = loadCodeGs();
  save(s, 'Ana');
  failAudit(s);
  const r = grant(s, 'Ana');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, 'server');
  assert.deepStrictEqual(audit(s), []);
  assert.ok(deployLog(s).some(l => /^Roles: Audit row not written \(grant admin, platform, ok\)/.test(l)));
  assert.strictEqual(grant(s, 'Ana').result, 'ok', 'the retry writes the row the first try left out');
  assert.strictEqual(grant(s, 'Ana').result, 'held');
  // Granted again after a revoke: its last ok row is the revoke, so a held grant with no row since gets its ok.
  assert.strictEqual(revoke(s, 'Ana').result, 'ok');
  failAudit(s);
  assert.strictEqual(grant(s, 'Ana').ok, false);
  assert.strictEqual(grant(s, 'Ana').result, 'ok');
  assert.deepStrictEqual(
    audit(s).map(x => [x.action, x.result]),
    [
      ['grant admin', 'ok'],
      ['grant admin', 'held'],
      ['revoke admin', 'ok'],
      ['grant admin', 'ok']
    ]
  );
  assert.strictEqual(rows(s, 'Roles').length, 1);
  // A refusal whose row fails is logged too, never thrown: the request answers as it would with the row written.
  failAudit(s);
  assert.strictEqual(s.post({readReports: 1, token: READ}).error, 'token');
  assert.ok(deployLog(s).some(l => /^Roles: Audit row not written \(readReports, instance:imr, denied\)/.test(l)));
  noName(s, 'Ana');
});

test("rule D7: a deleted, self-deleted, merged or archived account's rights go; its Audit rows keep only its id", () => {
  const cases = [
    ['delete', s => s.post({userDelete: 'Eda', answers: false, token: TOK})],
    ['delete everything', s => s.post({userDelete: 'Eda', answers: true, token: TOK})],
    ['self-delete', s => s.post({selfDelete: 1, dname: 'Eda', dpin: '1234'})],
    ['merge', s => s.post({userMerge: {from: 'Eda', into: 'Ben', data: {}}, token: TOK})],
    ['archive', s => s.post({userArchive: {from: 'Eda', into: 'Eda-old'}, token: TOK})]
  ];
  for (const [how, f] of cases) {
    const s = loadCodeGs();
    save(s, 'Eda');
    save(s, 'Ben', '5678');
    give(s, 'Eda', 'editor');
    give(s, 'Eda', 'owner');
    grant(s, 'Eda');
    give(s, 'Ben', 'trainer');
    const id = aid(s, 'Eda'),
      [ed, ow, tr] = ['editor', 'owner', 'trainer'].map(r => groupOf(s, r));
    assert.ok(f(s).ok, how);
    assert.deepStrictEqual(rows(s, 'Roles'), [], how + ': off the admin list');
    assert.deepStrictEqual(
      rows(s, 'Groups').map(r => [r[0], r[1]]),
      [[tr, 'Ben']],
      how + ": its memberships gone, never moved (a merge's into keeps only its own)"
    );
    const drops = audit(s).filter(x => /account removed/.test(x.action));
    assert.deepStrictEqual(
      drops.map(x => [x.action, x.scope, x.target]).sort(),
      [
        [`leave ${ed} (account removed)`, IMR, id],
        [`leave ${ow} (account removed)`, IMR, id],
        ['revoke admin (account removed)', 'platform', id]
      ].sort(),
      how
    );
    if (how === 'self-delete')
      assert.ok(
        drops.every(x => x.id === id),
        'the player deleted it'
      );
    else
      assert.ok(
        drops.every(x => /^gh:/.test(x.id)),
        'the admin did'
      );
    noName(s, 'Eda', 'Ben');
    // The name taken again (by anyone, with any code): the new account holds nothing.
    if (how !== 'merge') {
      save(s, 'Eda', '4321');
      const e = acct(s, 'Eda', '4321');
      assert.ok(!can(s, e, 'content', IMR) && !can(s, e, 'players', IMR) && !can(s, e, 'grant', 'platform'), how);
    } else assert.ok(!can(s, acct(s, 'Ben', '5678'), 'content', IMR), 'into gets none of its rights');
  }
});

test('one gate: the GitHub check is reached through caller_ only, and every privileged endpoint calls gate_', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'tools', 'sync', 'Code.gs'), 'utf8');
  const code = src.replace(/\/\/[^\n]*/g, '');
  assert.deepStrictEqual([...code.matchAll(/isAdmin_\(/g)].length, 2, 'isAdmin_( appears only in its definition and in caller_');
  assert.match(code, /function caller_\(token\)\{\s*const t = String\(token \|\| ''\);\s*return isAdmin_\(t\)/);
  ['reports_', 'readEvents_', 'readAlerts_', 'analyses_', 'users_', 'roles_'].forEach(f => {
    const body = code.slice(code.indexOf('function ' + f + '('), code.indexOf('\nfunction ', code.indexOf('function ' + f + '(') + 1));
    assert.match(body, /gate_\(/, f);
  });
});
