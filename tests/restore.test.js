require('./slot.js').testGuard();
// Restore rehearsal (REE-337; docs/spec/sync.md "Restore rehearsal"): a synthetic cohort built through the sheet
// script's own endpoints on the in-memory sheet (tests/gas.js), backed up in the real format (Code.gs xlsx_, the file
// backup_ uploads), that file read back as an import into a new spreadsheet would read it, and the script started again
// on the restored tabs with the Script Properties a new project would hold. Checks that learner records, groups and
// rights, revocations and deletions come back as they were at the snapshot, that anonymous ids hold with the old
// ANON_SALT, and that returning devices reconnect without duplicates. The tests named "GAP" pin a behaviour the
// rehearsal found wrong or unsafe today (REE-337's findings): they say what happens now, so a fix changes them on purpose.
// Synthetic names and data only; nothing reaches Google, pCloud or a real backup (rules D1, D2).
const test = require('node:test'),
  assert = require('node:assert'),
  vm = require('vm');
const {loadCodeGs} = require('./gas.js');

const TOK = 'ghp_write000000000000000000',
  IMR = 'instance:imr',
  PIN = '1234',
  RIGHTS = ['players', 'settings', 'grant', 'content', 'live', 'cohorts'],
  NAMES = ['Ana', 'Ben', 'Cy', 'Dee', 'Eve', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jo'],
  DEV_A = 'k3v9q0x7mz',
  DEV_B = 'p0p0p0p0p0',
  ANON = 'abcdefghij';
const MANILA = 480; // minutes east of UTC: the manifest's time zone, Asia/Manila (no daylight saving)

// Utilities.formatDate and Session for Asia/Manila (Code.gs backupName_, xlsx_'s serial dates): the two patterns used.
function formatDate(d, tz, pat) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
      .formatToParts(d)
      .map(x => [x.type, x.value])
  );
  return pat
    .replace(/'T'/, 'T')
    .replace(/yyyy|MM|dd|HH|mm|ss/g, t => ({yyyy: p.year, MM: p.month, dd: p.day, HH: p.hour, mm: p.minute, ss: p.second})[t]);
}
const sheet = (props = {}) => {
  const s = loadCodeGs({
    extend: ctx => {
      ctx.Utilities.formatDate = formatDate;
      ctx.Session = {getScriptTimeZone: () => 'Asia/Manila'};
    }
  });
  Object.assign(s.props, props);
  return s;
};
const run = (s, js) => vm.runInContext(js, s.ctx);
const J = JSON.stringify;
const ans = (id, t, extra = {}) => ({
  id,
  t,
  g: 'Acropora',
  a: id.endsWith('3') ? 'Montipora' : 'Acropora',
  ok: id.endsWith('3') ? 0 : 1,
  m: 'quiz',
  ph: 'pic-1',
  ch: 'Acropora Montipora Porites Pocillopora',
  e: 0.5,
  tz: MANILA,
  ...extra
});
const save = (s, name, answers = [], extra = {}) => s.post({name, pin: PIN, data: {}, summary: {}, answers, av: 'drill', ...extra});
const load = (s, name) => s.get({name, pin: PIN, av: 'drill'});
const ids = s => (s.sheets.Answers ? s.sheets.Answers.rows.slice(1).map(r => String(r[7])) : []);
const can = (s, name, right) => run(s, `can_({name: ${J(name)}, h: hash_(${J(name)}, '${PIN}'), id: 'x'}, '${right}', '${IMR}')`);
const admins = s => s.post({roles: 1, token: TOK}).grants.map(g => g.name);
// Every account's rights at the instance and its place on the admin list: what the rights checks answer.
const rightsOf = s =>
  Object.fromEntries(NAMES.map(n => [n, RIGHTS.filter(r => can(s, n, r)).concat(admins(s).includes(n) ? ['admin'] : [])]));
// A date of either realm (the script's context makes its own Date).
const isDate = c => Object.prototype.toString.call(c) === '[object Date]';
// Every tab's values as the script reads them (getValues), dates as their time in ms.
const values = s =>
  Object.fromEntries(
    s.ctx.SpreadsheetApp.getActiveSpreadsheet()
      .getSheets()
      .map(sh => {
        const nr = sh.getLastRow(),
          nc = sh.getLastColumn();
        const v = nr && nc ? sh.getRange(1, 1, nr, nc).getValues() : [];
        return [sh.getName(), v.map(r => r.map(c => (isDate(c) ? {date: c.getTime()} : c)))];
      })
  );

// The backup file read back as a spreadsheet import reads it: each worksheet by its name in xl/workbook.xml, a shared
// string as text, t="b" as true/false, the date style (s="1") as a date in the importing spreadsheet's time zone (tz,
// minutes east of UTC: the serial day number holds no zone), any other value a number. Assumed of Google Sheets' import,
// not checked against it (rule W11): local doubles only until a disposable project exists (REE-100 point B).
function readBackup(z, tz = MANILA) {
  const un = t =>
    t
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');
  const sst = [...z.parts['xl/sharedStrings.xml'].matchAll(/<si><t xml:space="preserve">(.*?)<\/t><\/si>/gs)].map(m => un(m[1]));
  const col = L => [...L].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
  const tabs = {};
  for (const m of z.parts['xl/workbook.xml'].matchAll(/<sheet name="([^"]*)" sheetId="(\d+)"/g)) {
    const xml = z.parts['xl/worksheets/sheet' + m[2] + '.xml'],
      rows = [];
    for (const c of xml.matchAll(/<c r="([A-Z]+)(\d+)"(?: t="([sb])")?(?: s="(1)")?><v>([^<]*)<\/v><\/c>/g)) {
      const [, L, R, t, date, v] = c;
      const val = t === 's' ? sst[+v] : t === 'b' ? v === '1' : date ? new Date(Math.round((+v - 25569) * 864e5 - tz * 6e4)) : Number(v);
      (rows[+R - 1] = rows[+R - 1] || [])[col(L)] = val;
    }
    // Every cell the file holds is read: nothing in a form this reader does not know (a formula, an inline string).
    assert.strictEqual((xml.match(/<c /g) || []).length, rows.flat().filter(x => x !== undefined).length, 'every cell of ' + m[1]);
    const w = Math.max(0, ...rows.map(r => (r ? r.length : 0)));
    tabs[un(m[1])] = Array.from(rows, r => Array.from({length: w}, (_, i) => (r && r[i] !== undefined ? r[i] : '')));
  }
  return tabs;
}
// The restore: a new spreadsheet holding the backup's tabs and values, the script installed fresh on it with only the
// Script Properties given (a new Apps Script project holds none: no ANON_SALT, no ONCE_ marks, no ROLES_SEED).
function restore(tabs, props = {}) {
  const s = sheet(props),
    ss = s.ctx.SpreadsheetApp.getActiveSpreadsheet();
  Object.entries(tabs).forEach(([name, rows]) => {
    const sh = ss.insertSheet(name);
    rows.forEach((r, i) => (sh.rows[i] = r.slice()));
  });
  return s;
}

// The synthetic cohort, up to the snapshot, then what happens on the live sheet after it.
function cohort() {
  const s = sheet();
  const day = d => `2026-11-${String(d).padStart(2, '0')}T01:00:00Z`;
  // Accounts and their answers, two devices, one device not signed in.
  assert.ok(save(s, 'Ana', [ans('a1', day(10)), ans('a2', day(10))], {dev: DEV_A, data: {note: 'n'.repeat(50000)}}).ok);
  NAMES.slice(1, 9).forEach((n, i) =>
    assert.ok(save(s, n, [ans(n.toLowerCase() + '1', day(11 + i)), ans(n.toLowerCase() + '3', day(11 + i))], {dev: DEV_B}).ok)
  );
  assert.ok(s.post({anon: ANON, anonAnswers: [ans('z1', day(12)), ans('z2', day(12))], dev: DEV_A}).log);
  // The roles before the groups (an older script's Roles tab), then the one-shot migrations as autoUpdate runs them:
  // Ana and Ben become members of the Managers group (r:owner), Gus of the Trainers (r:trainer).
  run(
    s,
    `const t = sheet_(ROLES.TAB, ROLES.HEAD);
     [['Ana', 'owner'], ['Ben', 'owner'], ['Gus', 'trainer']].forEach(([n, r]) => t.appendRow([n, r, INST_SCOPE_, new Date('2026-11-01T00:00:00Z'), hash_(n, '${PIN}')]));
     once_(() => {})`
  );
  // Groups with settings that are not the defaults: a cohort with its board, a group that carries the players right.
  const coh = s.post({groupMake: {n: 'Cohort Nov', board: 1}, token: TOK});
  assert.ok(coh.ok, J(coh));
  ['Gus', 'Hal'].forEach(n => assert.ok(s.post({userGroup: n, group: coh.group.id, on: true, token: TOK}).ok));
  const help = s.post({groupMake: {n: 'Helpers', rights: ['players@' + IMR]}, token: TOK});
  assert.ok(help.ok, J(help));
  assert.ok(s.post({userGroup: 'Dee', group: help.group.id, on: true, token: TOK}).ok);
  // The admin list: Cy's account is the admin page's (its first read claims it and seeds Pierre's rights once).
  assert.ok(s.post({readAnswers: 1, token: TOK, aname: 'Cy', apin: PIN}).ok);
  assert.ok(s.post({roleGrant: {account: 'Dee', role: 'admin', scope: 'platform'}, token: TOK}).ok);
  // Revocations before the snapshot: Ben leaves the Managers, Dee leaves the admin list, Cy leaves the Curators.
  assert.strictEqual(s.post({userGroup: 'Ben', group: 'r:owner', on: false, token: TOK}).ok, true);
  assert.strictEqual(s.post({roleRevoke: {account: 'Dee', role: 'admin', scope: 'platform'}, token: TOK}).result, 'ok');
  assert.strictEqual(s.post({userGroup: 'Cy', group: 'r:editor', on: false, token: TOK}).ok, true);
  // Per-player settings: Gus hidden from the leaderboard, Hal left out of the statistics.
  assert.ok(s.post({userBoard: 'Gus', hide: true, token: TOK}).ok);
  assert.ok(s.post({statsExclude: run(s, "aid_('Hal')"), on: true, token: TOK}).ok);
  // Deletions before the snapshot: Eve by the admin keeping her answers (~deleted <id>), Fay by herself, everything.
  assert.ok(s.post({userDelete: 'Eve', answers: false, token: TOK}).ok);
  assert.ok(s.post({selfDelete: 1, dname: 'Fay', dpin: PIN}).deleted);
  // An answer from an app that sends no UTC offset, after the tz one-shot ran.
  assert.ok(save(s, 'Hal', [ans('h9', day(19), {tz: undefined})]).ok);

  // The snapshot: the very file backup_ uploads, and what the live sheet answered then.
  const t0 = Date.now(),
    z = s.ctx.xlsx_('reef-id-sheet-2026-11-22.xlsx'),
    built = Date.now() - t0;
  const snap = {
    z,
    built,
    values: values(s),
    ids: ids(s).sort(),
    rights: rightsOf(s),
    groups: JSON.parse(run(s, 'JSON.stringify(groupState_())')),
    aid: Object.fromEntries(NAMES.concat('~anon ' + ANON).map(n => [n, run(s, `aid_(${J(n)})`)])),
    salt: s.props.ANON_SALT,
    props: {...s.props},
    revBen: run(s, "readData_('Ben', '').rev")
  };

  // After the snapshot: Ivy deletes herself, Ana leaves the Managers, Ben's device A saves (rev + 1, an answer the
  // sheet confirms, so the device drops it from its queue), Jo makes an account.
  assert.ok(s.post({selfDelete: 1, dname: 'Ivy', dpin: PIN}).deleted);
  assert.strictEqual(s.post({userGroup: 'Ana', group: 'r:owner', on: false, token: TOK}).ok, true);
  const after = save(s, 'Ben', [ans('b5', day(23))], {at: snap.revBen, dev: DEV_A, data: {from: 'A'}});
  assert.strictEqual(after.rev, snap.revBen + 1);
  assert.ok(save(s, 'Jo', [ans('j1', day(23))]).ok);
  return {s, snap, revA: after.rev, coh: coh.group.id, help: help.group.id};
}
const C = cohort();
// The restore the runbook asks for: the old ANON_SALT, and the one-shot marks and the seed mark set before the script
// serves (their values are any non-empty text: the script only tests that they are set).
const CARRY = p => Object.fromEntries(Object.entries(p).filter(([k]) => k === 'ANON_SALT' || k === 'ROLES_SEED' || k.startsWith('ONCE_')));
const restored = (props = CARRY(C.snap.props), tz) => restore(readBackup(C.snap.z, tz), props);

test('the backup holds every tab and every value as the sheet held it at the snapshot', t => {
  const tabs = readBackup(C.snap.z),
    s = restore(tabs);
  assert.deepStrictEqual(Object.keys(tabs), Object.keys(C.snap.values), 'every tab, by its own name');
  assert.deepStrictEqual(values(s), C.snap.values, 'every value, typed as before (text, numbers, true/false, dates to the ms)');
  // The longest cell of each tab: past 32,767 characters (Excel's cell limit), an import may cut it (not checked).
  const long = Object.entries(tabs)
    .map(([n, rows]) => [n, Math.max(0, ...rows.flat().map(c => (typeof c === 'string' ? c.length : 0)))])
    .filter(([, n]) => n > 32767)
    .map(([n]) => n);
  assert.deepStrictEqual(long.sort(), ['Progress data'], 'a player progress of 50,000 characters: one 45,000-character chunk');
  t.diagnostic(`backup built in ${C.snap.built} ms; ${C.snap.ids.length} answers; tabs: ${Object.keys(tabs).join(', ')}`);
});

test('restored with the old ANON_SALT and the one-shot marks: answers, ids, groups, rights and removals as at the snapshot', t => {
  const t0 = Date.now(),
    s = restored(),
    took = Date.now() - t0;
  assert.deepStrictEqual(ids(s).sort(), C.snap.ids, 'the answer ids, none from after the snapshot');
  NAMES.concat('~anon ' + ANON).forEach(n => assert.strictEqual(run(s, `aid_(${J(n)})`), C.snap.aid[n], 'anonymous id of ' + n));
  assert.deepStrictEqual(rightsOf(s), C.snap.rights, 'every right and the admin list');
  assert.deepStrictEqual(C.snap.rights.Ben, [], 'Ben revoked from the Managers before the snapshot: still revoked');
  assert.deepStrictEqual(C.snap.rights.Dee, ['players'], 'Dee off the admin list, a Helper still');
  assert.deepStrictEqual(C.snap.rights.Cy, ['players', 'settings', 'grant', 'admin'], 'Cy: Managers and admin, off the Curators');
  // Deleted before the snapshot: a returning device is told so, nothing of the account is back.
  ['Eve', 'Fay'].forEach(n => assert.strictEqual(load(s, n).error, 'gone', n));
  assert.strictEqual(save(s, 'Fay', [ans('f7', '2026-11-24T00:00:00Z')]).error, 'gone');
  assert.ok(!ids(s).includes('f7'), "a deleted account's device logs nothing");
  const who = id => s.sheets.Answers.rows.find(r => r[7] === id)[0];
  assert.strictEqual(who('eve1'), '~deleted ' + C.snap.aid.Eve, "Eve's kept answers under the same id");
  assert.ok(!ids(s).includes('fay1'), "Fay's answers gone with her");
  const named = n =>
    Object.entries(values(s))
      .filter(([tab]) => tab !== 'Removed') // the tombstone that answers 'gone' (rule D7)
      .filter(([, rows]) => rows.flat().some(c => typeof c === 'string' && new RegExp('\\b' + n + '\\b', 'i').test(c)))
      .map(([tab]) => tab);
  ['Eve', 'Fay'].forEach(n => assert.deepStrictEqual(named(n), [], n + "'s name in no tab but Removed"));
  // Per-player settings: hidden stays hidden, left out stays left out, group settings as they were.
  assert.strictEqual(s.sheets.RAs.rows.find(r => r[0] === 'Gus')[9], -1);
  assert.ok(run(s, `sxSet_().has(aid_('Hal'))`), 'Hal still left out of the statistics');
  const g = JSON.parse(run(s, 'JSON.stringify(groupState_())'));
  assert.deepStrictEqual(g, C.snap.groups, 'every group, its settings, rights and members');
  assert.deepStrictEqual(
    g.defs.map(d => [d.n, d.board, d.rights.join()]),
    [
      ['Staff', 1, ''],
      ['Managers', 0, 'players@instance:imr,settings@instance:imr,grant@instance:imr'],
      ['Trainers', 0, 'live@instance:imr,cohorts@instance:imr'],
      ['Cohort Nov', 1, ''],
      ['Helpers', 0, 'players@instance:imr'],
      ['Curators', 0, 'content@instance:imr']
    ],
    'the groups the migrations made from the old roles, then the groups made since'
  );
  // The one-shots, marked done, change nothing when autoUpdate runs them.
  const before = values(s);
  run(s, 'once_(() => {})');
  assert.deepStrictEqual(values(s), before);
  // The seed mark carried: the admin page's first read signed in to the admin account gives back nothing it had left.
  assert.ok(s.post({readAnswers: 1, token: TOK, aname: 'Cy', apin: PIN}).ok);
  assert.ok(!can(s, 'Cy', 'content'), 'Cy stays off the Curators');
  t.diagnostic(`restored in ${took} ms (local double: Google's import, the redeploy and the app's SYNC_URL are not timed here)`);
});

test('returning devices reconnect: their queues logged once, a resend adds nothing, a stale device merges', () => {
  const s = restored();
  // Ben's device A saved rev N+1 after the snapshot and still queues b6; the sheet is back at rev N.
  const r1 = save(s, 'Ben', [ans('b6', '2026-11-24T00:00:00Z'), ans('ben1', '2026-11-11T01:00:00Z')], {at: C.revA, dev: DEV_A});
  assert.strictEqual(r1.error, 'stale', 'another revision: the app pulls and merges');
  assert.strictEqual(r1.rev, C.snap.revBen);
  assert.ok(r1.log && ids(s).includes('b6'), 'its queued answer logged with the stale reply');
  const r2 = save(s, 'Ben', [ans('b6', '2026-11-24T00:00:00Z')], {at: C.snap.revBen, dev: DEV_A});
  assert.strictEqual(r2.ok, true);
  assert.ok(s.post({anon: ANON, anonAnswers: [ans('z1', '2026-11-12T01:00:00Z'), ans('z3', '2026-11-24T00:00:00Z')], dev: DEV_A}).log);
  const all = ids(s);
  assert.strictEqual(all.length, new Set(all).size, 'no answer twice');
  assert.deepStrictEqual(all.sort(), C.snap.ids.concat('b6', 'z3').sort());
  assert.ok(!all.includes('b5'), 'b5, confirmed after the snapshot and dropped from the queue (sync.js), is lost');
});

test('GAP: a deletion and a revocation made after the snapshot are undone by the restore', () => {
  const s = restored();
  assert.strictEqual(load(s, 'Ivy').found, true, 'Ivy deleted herself after the snapshot: her account is back');
  assert.ok(ids(s).includes('ivy1'), 'and her answers');
  assert.ok(can(s, 'Ana', 'players'), 'Ana left the Managers after the snapshot: her right is back');
  assert.strictEqual(load(s, 'Jo').found, false, 'an account made after it is gone; its device makes it again at its next save');
});

test('GAP: a revision number is reused after the restore, so a stale device overwrites without merging', () => {
  const s = restored();
  // Device B knew rev N (the snapshot's) and saves first; device A, which saved rev N+1 before the restore, comes next.
  assert.strictEqual(save(s, 'Ben', [], {at: C.snap.revBen, dev: DEV_B, data: {from: 'B'}}).rev, C.revA);
  const a = save(s, 'Ben', [], {at: C.revA, dev: DEV_A, data: {from: 'A'}});
  assert.strictEqual(a.ok, true, 'A is taken as up to date (its revision is the sheet number again)');
  assert.strictEqual(JSON.parse(run(s, "readData_('Ben', '').json")).from, 'A', "B's write is overwritten, never merged");
});

test('GAP: without the one-shot marks, every group loses its rights until they run, then a revoked right comes back', () => {
  const s = restored({ANON_SALT: C.snap.salt});
  // Until autoUpdate runs the one-shots again: the groups as read from the Groups tab alone (groupsBefore_), no rights.
  const none = Object.fromEntries(NAMES.map(n => [n, n === 'Cy' ? ['grant', 'admin'] : []]));
  assert.deepStrictEqual(rightsOf(s), none, 'only the admin list still gives a right');
  assert.ok(
    JSON.parse(run(s, 'JSON.stringify(groupState_())')).defs.some(d => d.n === 'r:owner'),
    'a group named by its id'
  );
  run(s, 'once_(() => {})');
  // The rights migration reads the Roles tab's rows from before the groups again: Ben, who left the Managers before
  // the snapshot, is written back into them.
  assert.deepStrictEqual(rightsOf(s), {...C.snap.rights, Ben: ['players', 'settings', 'grant']});
  assert.ok(s.sheets.Groups.rows.some(r => r[0] === 'r:owner' && r[1] === 'Ben'));
  // The tz one-shot runs again: an answer an app sent without its UTC offset gets +480.
  assert.strictEqual(s.sheets.Answers.rows.find(r => r[7] === 'h9')[14], 480);
});

test('GAP: without the seed mark, the admin page signed in to the admin account gives back the rights it had left', () => {
  const s = restored({...CARRY(C.snap.props), ROLES_SEED: undefined});
  delete s.props.ROLES_SEED;
  assert.ok(!can(s, 'Cy', 'content'), 'Cy left the Curators before the snapshot');
  assert.ok(s.post({readAnswers: 1, token: TOK, aname: 'Cy', apin: PIN}).ok);
  assert.ok(can(s, 'Cy', 'content'), 'its first read seeds the Curators membership again');
});

test('GAP: without the old ANON_SALT, every anonymous id changes and a player left out of the statistics is counted', () => {
  const s = restored({...CARRY(C.snap.props), ANON_SALT: undefined});
  delete s.props.ANON_SALT;
  NAMES.forEach(n => assert.notStrictEqual(run(s, `aid_(${J(n)})`), C.snap.aid[n], n));
  assert.ok(!run(s, `sxSet_().has(aid_('Hal'))`), 'Hal no longer left out');
});

test('GAP: imported into a spreadsheet whose time zone is not Manila, every date moves', () => {
  const s = restored(undefined, 0);
  const t = id => s.sheets.Answers.rows.find(r => r[7] === id)[1].getTime(),
    t0 = C.snap.values.Answers.find(r => r[7] === 'a1')[1].date;
  assert.strictEqual(t('a1') - t0, 8 * 36e5, 'eight hours later in a UTC spreadsheet');
});
