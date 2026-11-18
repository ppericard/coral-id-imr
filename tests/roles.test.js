require('./slot.js').testGuard();
// Roles step 1 (Pierre, 2026-11-13, Q342-Q349: scoped roles, enforced by the sync script through one can_() check and an
// audit log, never by the page; Q364, 2026-11-15: rights are separate, the platform admin may grant himself a role and the
// grant is logged): Code.gs can_, gate_, the Roles and Audit tabs, the grants of Pierre's account, and what a delete, a
// merge or an archive does to an account's grants (rule D7). Against the in-memory sheet only (rule D1).
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
const grant = (s, account, role, scope, token = TOK) => s.post({roleGrant: {account, role, scope}, token});
const revoke = (s, account, role, scope, token = TOK) => s.post({roleRevoke: {account, role, scope}, token});
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
  // vNEXT: the groups themselves (tests/playergroups.test.js)
  ['groupMake', () => ({groupMake: {n: 'RA Test', board: 1}})],
  ['groupEdit', () => ({groupEdit: 'g:00000000', n: 'RA Test 2'})],
  ['groupDrop', () => ({groupDrop: 'g:00000000'})],
  ['userStart', () => ({userStart: 'Ana', s: 'coral', c: 'imr'})],
  ['statsExclude', () => ({statsExclude: 'AbCd1234', on: true})],
  ['anonDelete', () => ({anonDelete: ['AbCd1234']})],
  ['userArchive', () => ({userArchive: {from: 'Ana', into: 'Ana-old'}})],
  ['userDelete', () => ({userDelete: 'Ana', answers: true})],
  ['userMerge', () => ({userMerge: {from: 'Ana', into: 'Ben', data: {}}})],
  ['roles', () => ({roles: 1})],
  ['roleGrant', () => ({roleGrant: {account: 'Ana', role: 'editor', scope: IMR}})],
  ['roleRevoke', () => ({roleRevoke: {account: 'Ana', role: 'editor', scope: IMR}})]
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
    assert.strictEqual(row.scope, IMR);
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

test('can_: the token passes every right; an account only what its grants give, in their scope (Q342, Q364)', () => {
  const s = loadCodeGs();
  ['Pat', 'Owen', 'Eda', 'Tia', 'Ana'].forEach(n => save(s, n));
  assert.ok(grant(s, 'Pat', 'admin', 'platform').ok);
  assert.ok(grant(s, 'Owen', 'owner', IMR).ok);
  assert.ok(grant(s, 'Eda', 'editor', IMR).ok);
  assert.ok(grant(s, 'Tia', 'trainer', IMR).ok);
  const tok = {token: true, id: 'gh:x'};
  const RIGHTS = ['platform', 'grant', 'players', 'settings', 'content', 'cohorts'];
  RIGHTS.forEach(r => [IMR, 'platform', 'instance:other'].forEach(sc => assert.ok(can(s, tok, r, sc), 'token ' + r + ' ' + sc)));
  const want = {
    Pat: {platform: ['platform', 'grant'], [IMR]: ['grant'], 'instance:other': ['grant']},
    Owen: {platform: [], [IMR]: ['players', 'settings', 'grant'], 'instance:other': []},
    Eda: {platform: [], [IMR]: ['content'], 'instance:other': []},
    Tia: {platform: [], [IMR]: ['cohorts'], 'instance:other': []},
    Ana: {platform: [], [IMR]: [], 'instance:other': []}
  };
  for (const n of Object.keys(want))
    for (const sc of Object.keys(want[n]))
      RIGHTS.forEach(r => assert.strictEqual(can(s, acct(s, n), r, sc), want[n][sc].includes(r), `${n} ${r} ${sc}`));
  // Q364: the platform admin alone is refused the instance's players and content until he holds its roles.
  assert.ok(!can(s, acct(s, 'Pat'), 'players', IMR) && !can(s, acct(s, 'Pat'), 'content', IMR));
  assert.ok(grant(s, 'Pat', 'editor', IMR).ok);
  assert.ok(can(s, acct(s, 'Pat'), 'content', IMR) && !can(s, acct(s, 'Pat'), 'players', IMR));
  // A grant holds for its account's code hash only, and nobody without a checked code passes.
  assert.ok(!can(s, acct(s, 'Eda', '9999'), 'content', IMR));
  assert.ok(!can(s, {name: 'Eda'}, 'content', IMR));
  assert.ok(!can(s, null, 'content', IMR));
});

// The right each endpoint asks for, seen through an account caller: caller_ stubbed in the script's context so the
// token 'acct:<name>' is that account (no endpoint takes an account's name and code in production yet).
const asAccounts = s =>
  run(
    s,
    `caller_ = t => { const m = /^acct:(.+)$/.exec(String(t || '')); return m ? {name: m[1], h: hash_(m[1], '1234'), id: aid_(m[1])} : null; }`
  );
test('every privileged endpoint asks the right Q342 gives: the owner passes, an editor, a trainer or the platform admin alone do not', () => {
  const ROLES_EP = new Set(['roles', 'roleGrant', 'roleRevoke']);
  for (const [name, body] of ENDPOINTS) {
    const verdict = {};
    for (const who of ['Owen', 'Eda', 'Tia', 'Pat', 'Ana']) {
      const s = loadCodeGs();
      ['Owen', 'Eda', 'Tia', 'Pat', 'Ana', 'Ben'].forEach(n => save(s, n));
      grant(s, 'Owen', 'owner', IMR);
      grant(s, 'Eda', 'editor', IMR);
      grant(s, 'Tia', 'trainer', IMR);
      grant(s, 'Pat', 'admin', 'platform');
      asAccounts(s);
      verdict[who] = s.post({...body(), token: 'acct:' + who}).error !== 'token';
    }
    // The players endpoints: the owner only. The roles: whoever may grant at the instance (its owner, the platform admin).
    const want = ROLES_EP.has(name)
      ? {Owen: true, Eda: false, Tia: false, Pat: true, Ana: false}
      : {Owen: true, Eda: false, Tia: false, Pat: false, Ana: false};
    assert.deepStrictEqual(verdict, want, name);
  }
});

test('an account granting or revoking its own role writes (self); a platform admin may grant himself (Q364)', () => {
  const s = loadCodeGs();
  ['Owen', 'Pat'].forEach(n => save(s, n));
  grant(s, 'Owen', 'owner', IMR);
  grant(s, 'Pat', 'admin', 'platform');
  asAccounts(s);
  assert.strictEqual(grant(s, 'Owen', 'editor', IMR, 'acct:Owen').result, 'ok');
  assert.strictEqual(grant(s, 'Pat', 'editor', IMR, 'acct:Pat').result, 'ok');
  assert.strictEqual(grant(s, 'Owen', 'admin', 'platform', 'acct:Owen').error, 'token', 'an owner grants nothing outside its instance');
  assert.strictEqual(revoke(s, 'Owen', 'editor', IMR, 'acct:Owen').result, 'ok');
  assert.deepStrictEqual(
    audit(s)
      .slice(-4)
      .map(x => [x.id, x.action, x.result, x.target]),
    [
      [aid(s, 'Owen'), 'grant editor (self)', 'ok', aid(s, 'Owen')],
      [aid(s, 'Pat'), 'grant editor (self)', 'ok', aid(s, 'Pat')],
      [aid(s, 'Owen'), 'grant admin', 'denied', ''],
      [aid(s, 'Owen'), 'revoke editor (self)', 'ok', aid(s, 'Owen')]
    ]
  );
  noName(s, 'Owen', 'Pat');
});

test('roleGrant and roleRevoke: checked input, live accounts only, held once, each audited', () => {
  const s = loadCodeGs();
  save(s, 'Ana');
  assert.strictEqual(grant(s, 'Ana', 'boss', IMR).error, 'input', 'an unknown role');
  assert.strictEqual(grant(s, 'Ana', 'admin', IMR).error, 'input', 'the platform admin at an instance');
  assert.strictEqual(grant(s, 'Ana', 'editor', 'platform').error, 'input', 'an editor of the platform');
  assert.strictEqual(grant(s, 'Ana', 'editor', 'instance:other').error, 'input', 'an instance this sheet does not serve');
  // Names Object.prototype has are no role (Code.gs roleDef_), wherever they are asked.
  ['constructor', 'toString', '__proto__', 'hasOwnProperty'].forEach(r => {
    assert.strictEqual(grant(s, 'Ana', r, IMR).error, 'input', r);
    assert.strictEqual(grant(s, 'Ana', r, 'platform').error, 'input', r);
  });
  assert.strictEqual(grant(s, 'Nobody', 'editor', IMR).error, 'user');
  assert.deepStrictEqual(grant(s, 'ana', 'editor', IMR), {ok: true, result: 'ok', v: grant(s, 'Ana', 'editor', IMR).v});
  assert.strictEqual(grant(s, 'Ana', 'editor', IMR).result, 'held');
  assert.deepStrictEqual(
    rows(s, 'Roles').map(r => r.slice(0, 3)),
    [['Ana', 'editor', IMR]],
    'the account as the RAs tab spells it, once'
  );
  const list = s.post({roles: 1, token: TOK});
  assert.deepStrictEqual(
    list.grants.map(g => [g.name, g.id, g.role, g.scope]),
    [['Ana', aid(s, 'Ana'), 'editor', IMR]]
  );
  assert.strictEqual(revoke(s, 'Ana', 'editor', IMR).result, 'ok');
  assert.strictEqual(revoke(s, 'Ana', 'editor', IMR).result, 'none');
  assert.deepStrictEqual(rows(s, 'Roles'), []);
  assert.strictEqual(s.post({userArchive: {from: 'Ana', into: 'Ana-old'}, token: TOK}).ok, true);
  assert.strictEqual(grant(s, 'Ana-old', 'editor', IMR).error, 'archived', 'an archive holds no role');
  assert.deepStrictEqual(
    audit(s)
      .filter(x => /^(grant|revoke)/.test(x.action))
      .map(x => [x.action, x.scope, x.result, x.target]),
    [
      ['grant editor', IMR, 'user', aid(s, 'Nobody')],
      ['grant editor', IMR, 'ok', aid(s, 'Ana')],
      ['grant editor', IMR, 'held', aid(s, 'Ana')],
      ['grant editor', IMR, 'held', aid(s, 'Ana')],
      ['revoke editor', IMR, 'ok', aid(s, 'Ana')],
      ['revoke editor', IMR, 'none', aid(s, 'Ana')],
      ['grant editor', IMR, 'archived', aid(s, 'Ana-old')]
    ]
  );
  noName(s, 'Ana', 'Nobody');
});

test("Pierre's grants: once, to the admin's account, as self-grants by the token (Q364)", () => {
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
    [
      ['Pat', 'admin', 'platform'],
      ['Pat', 'owner', IMR],
      ['Pat', 'editor', IMR]
    ]
  );
  assert.deepStrictEqual(
    audit(s).map(x => [x.action, x.scope, x.result, x.target]),
    [
      ['grant admin (self)', 'platform', 'ok', aid(s, 'Pat')],
      ['grant owner (self)', IMR, 'ok', aid(s, 'Pat')],
      ['grant editor (self)', IMR, 'ok', aid(s, 'Pat')]
    ]
  );
  const p = acct(s, 'Pat');
  assert.ok(can(s, p, 'platform', 'platform') && can(s, p, 'players', IMR) && can(s, p, 'content', IMR));
  // Never again: not twice, not after a revoke, not to another account signed in later.
  s.post({readAnswers: 1, token: TOK, aname: 'Pat', apin: '1234'});
  assert.strictEqual(rows(s, 'Roles').length, 3);
  assert.strictEqual(revoke(s, 'Pat', 'editor', IMR).result, 'ok');
  assert.match(audit(s).at(-1).action, /^revoke editor \(self\)$/, "the admin's account's own role: self");
  s.post({readAnswers: 1, token: TOK, aname: 'Pat', apin: '1234'});
  s.post({readAnswers: 1, token: TOK, aname: 'Ana', apin: '1234'});
  assert.deepStrictEqual(
    rows(s, 'Roles').map(r => r[0] + ' ' + r[1]),
    ['Pat admin', 'Pat owner']
  );
  noName(s, 'Pat', 'Ana');
});

// The Audit tab's next n row writes fail, as a Sheets service error does (the seed of 2026-11-16 on the real sheet wrote
// the admin grant, then failed before its Audit row, and the error was swallowed).
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

test('a seed that fails after a grant is written is finished by its retry: the grant, one ok Audit row each, the failure logged', () => {
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
  // The next read: the admin grant held without its row gets its "ok" (never "held"), the others are written.
  assert.ok(s.post({readAnswers: 1, token: TOK, aname: 'Pat', apin: '1234'}).ok);
  s.post({readAnswers: 1, token: TOK, aname: 'Pat', apin: '1234'});
  assert.deepStrictEqual(
    rows(s, 'Roles').map(r => r.slice(0, 3)),
    [
      ['Pat', 'admin', 'platform'],
      ['Pat', 'owner', IMR],
      ['Pat', 'editor', IMR]
    ]
  );
  assert.deepStrictEqual(
    audit(s).map(x => [x.action, x.scope, x.result, x.target]),
    [
      ['grant admin (self)', 'platform', 'ok', aid(s, 'Pat')],
      ['grant owner (self)', IMR, 'ok', aid(s, 'Pat')],
      ['grant editor (self)', IMR, 'ok', aid(s, 'Pat')]
    ]
  );
  assert.ok(s.props.ROLES_SEED, 'marked done once every grant has its row');
  noName(s, 'Pat');
  assert.ok(!deployLog(s).some(l => /pat/i.test(l)), 'no name in the Deploy log');
});

test('an Audit row that cannot be written is logged; a grant without its row answers an error and its retry audits it', () => {
  const s = loadCodeGs();
  save(s, 'Ana');
  failAudit(s);
  const r = grant(s, 'Ana', 'editor', IMR);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, 'server');
  assert.deepStrictEqual(audit(s), []);
  assert.ok(deployLog(s).some(l => /^Roles: Audit row not written \(grant editor, instance:imr, ok\)/.test(l)));
  assert.strictEqual(grant(s, 'Ana', 'editor', IMR).result, 'ok', 'the retry writes the row the first try left out');
  assert.strictEqual(grant(s, 'Ana', 'editor', IMR).result, 'held');
  // Granted again after a revoke: its last ok row is the revoke, so a held grant with no row since gets its ok.
  assert.strictEqual(revoke(s, 'Ana', 'editor', IMR).result, 'ok');
  failAudit(s);
  assert.strictEqual(grant(s, 'Ana', 'editor', IMR).ok, false);
  assert.strictEqual(grant(s, 'Ana', 'editor', IMR).result, 'ok');
  assert.deepStrictEqual(
    audit(s).map(x => [x.action, x.result]),
    [
      ['grant editor', 'ok'],
      ['grant editor', 'held'],
      ['revoke editor', 'ok'],
      ['grant editor', 'ok']
    ]
  );
  assert.strictEqual(rows(s, 'Roles').length, 1);
  // A refusal whose row fails is logged too, never thrown: the request answers as before.
  failAudit(s);
  assert.strictEqual(s.post({readReports: 1, token: READ}).error, 'token');
  assert.ok(deployLog(s).some(l => /^Roles: Audit row not written \(readReports, instance:imr, denied\)/.test(l)));
  noName(s, 'Ana');
});

test("rule D7: a deleted, self-deleted, merged or archived account's grants go; its Audit rows keep only its id", () => {
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
    grant(s, 'Eda', 'editor', IMR);
    grant(s, 'Eda', 'owner', IMR);
    grant(s, 'Ben', 'trainer', IMR);
    const id = aid(s, 'Eda');
    assert.ok(f(s).ok, how);
    assert.deepStrictEqual(
      rows(s, 'Roles').map(r => r.slice(0, 3)),
      [['Ben', 'trainer', IMR]],
      how + ": its grants gone, never moved (a merge's into keeps only its own)"
    );
    const drops = audit(s).filter(x => /account removed/.test(x.action));
    assert.deepStrictEqual(
      drops.map(x => [x.action, x.target]).sort(),
      [
        ['revoke editor (account removed)', id],
        ['revoke owner (account removed)', id]
      ],
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
      assert.ok(!can(s, acct(s, 'Eda', '4321'), 'content', IMR) && !can(s, acct(s, 'Eda', '4321'), 'players', IMR), how);
    }
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
