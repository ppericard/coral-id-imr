require('./slot.js').testGuard();
// The infrastructure health (Pierre, 2026-11-18 11:21, "lance 1, 2, 3 et 4"; docs/PAGES.md "Infrastructure health"): the
// hourly check's script (tools/health.py), the brief's infrastructure line (tools/brief.py), the sheet's admin-only read
// (Code.gs readInfra_) and the admin's card (admin.js infraRows). Everything runs on made-up replies (rule D1): the
// Python fixtures (tests/infra.fixtures.py) fake every request, the sheet runs in the in-memory stand-in.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  {execFileSync} = require('child_process'),
  block = require('./block.js'),
  {loadCodeGs} = require('./gas.js');

const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const F = JSON.parse(
  execFileSync('python3', ['-I', path.join(__dirname, 'infra.fixtures.py')], {timeout: 60000, maxBuffer: 1 << 24}).toString()
);
const S = F.S,
  level = (sc, name) => S[sc].results[name][0],
  note = (sc, name) => S[sc].results[name][1];

test('the thresholds: a warning past 70% of a limit, never at 70%, and the same number everywhere', () => {
  assert.strictEqual(F.consts.health_warn, 0.7);
  assert.strictEqual(F.consts.brief_warn, 0.7, "the brief's");
  assert.match(read('admin.js'), /const INFRA = \{WARN: 0\.7, /, "the admin card's");
  assert.deepStrictEqual(F.consts.limits, {cells: 10e6, pages: 1e9, r2: 10e9, slow: 5000});
  // The same limits as the script (Code.gs INFRA.CELLS, TIM.SLOW) and the card (admin.js).
  assert.match(read('tools/sync/Code.gs'), /const INFRA = \{CELLS: 10000000, /);
  assert.match(read('tools/sync/Code.gs'), /SLOW: 5000, /);
  assert.match(read('admin.js'), /\{WARN: 0\.7, SLOW: 5000, BACKUP_DAYS: 8\}/);
  assert.match(read('tools/health.py'), /BACKUP_DAYS = 8/);
  assert.strictEqual(S.ok.items.r2.warn, false, '63%');
  assert.strictEqual(S.r2_exactly_70.items.r2.warn, false, 'exactly 70% is not past it');
  assert.strictEqual(S.r2_warn.items.r2.warn, true, '75%');
  assert.strictEqual(S.r2_warn.ok, true, 'a warning never fails the job');
  assert.strictEqual(S.token_ok.items.cells.warn, true, '81% of the cells');
  assert.strictEqual(S.token_cells_warn.items.cells.pct, 0.74);
});

test('the site check: stamps, data.json, one retry, and what fails', () => {
  assert.strictEqual(S.ok.ok, true);
  assert.strictEqual(level('ok', 'site: index.html'), 'ok');
  assert.match(note('ok', 'site: index.html'), /3 stamped references/);
  assert.strictEqual(S.unstamped.ok, false);
  assert.match(note('unstamped', 'site: index.html'), /unstamped versions: app\.js\?v=212/);
  assert.strictEqual(level('index_down', 'site: index.html'), 'fail');
  assert.strictEqual(S.index_down.calls.filter(c => c.url.endsWith('index.html')).length, 2, 'asked twice before failing');
  assert.strictEqual(level('data_bad', 'site: data.json'), 'fail');
});

// ---- the live build against main (REE-279, option 3) ------------------------------------------------------------------------------
const LIVE = 'site: live build vs main';
// Whether a scenario asked GitHub for exactly this path (an equality, not a substring test of a URL).
const asked = (sc, p) => S[sc].calls.some(c => c.url === 'https://api.github.com/repos/ppericard/coral-id-imr/' + p);
test('the live build against main: the build number is a Deploy Pages run, a commit dated after its start is not live', () => {
  assert.strictEqual(level('ok', LIVE), 'ok');
  assert.match(note('ok', LIVE), /^build 1490 \(run started 04:50Z\) has every commit on main \(by run start\)$/);
  assert.ok(
    asked('ok', 'actions/workflows/pages.yml/runs?branch=main&status=success&per_page=100&page=1'),
    'the successful Deploy Pages runs of main'
  );
  assert.ok(asked('ok', 'commits?sha=main&since=2026-11-18T04:50:00Z&per_page=100'), "main's commits since the live run started");
  assert.strictEqual(level('deploy_edge', LIVE), 'ok', 'dated exactly at the run start: it was there');
  assert.strictEqual(level('deploy_page2', LIVE), 'ok', 'a run past the first 100: the next page is read');
  assert.strictEqual(S.deploy_page2.calls.filter(c => c.url.includes('/pages.yml/runs')).length, 2);
});

test('the live build: waiting past 45 minutes fails and names the commits; inside it is a note; the snapshot keeps them', () => {
  assert.strictEqual(level('deploy_ahead_recent', LIVE), 'notice');
  assert.strictEqual(S.deploy_ahead_recent.ok, true, 'a deploy under way is not a failure');
  assert.match(note('deploy_ahead_recent', LIVE), /^1 commit\(s\) on main since the live build 1490 .*5 min ago.*aaaaaaa Fish judging/);
  assert.strictEqual(level('deploy_ahead_exactly_45', LIVE), 'notice', 'exactly 45 minutes is not past it');
  assert.strictEqual(level('deploy_stale', LIVE), 'fail');
  assert.strictEqual(S.deploy_stale.ok, false, 'the job fails: GitHub e-mails it and the workflow opens the health issue');
  assert.match(
    note('deploy_stale', LIVE),
    /^main is 2 commit\(s\) ahead of the live build 1490 \(run started 03:40Z, by run start\); the oldest has waited 50 min \(limit 45\)/
  );
  assert.match(
    note('deploy_stale', LIVE),
    /ddddddd Photo curation: tile photos; ccccccc Candidate photos/,
    'the commits not live, oldest first'
  );
  assert.doesNotMatch(note('deploy_stale', LIVE), /eeeeeee/, 'a commit dated before the live run started is live');
  assert.match(note('deploy_many', LIVE), /7 commit\(s\) ahead.*commit 4 \(and 2 more\)$/, 'five named, the rest counted');
  assert.deepStrictEqual(
    S.deploy_stale.md.match(/\| site: live build vs main \| FAILED: [^|]*\|/)?.length,
    1,
    'the report the issue is opened from'
  );
  assert.strictEqual(S.ok.md.match(/live build vs main \| ok:/).length, 1);
});

test('the live build: a run that recorded the commit it archived is read by that commit, not by its start time (Codex, #1547)', () => {
  // A commit dated 04:52, after the run's start (04:50) but held by the deploy (its checkout came later): live.
  const k = 'deploy_pub_late_live';
  assert.strictEqual(level(k, LIVE), 'ok');
  assert.match(note(k, LIVE), /^build 1490 \(run started 04:50Z\) has every commit on main \(by commit aaaaaaa\)$/);
  assert.ok(asked(k, 'actions/runs/10490/jobs?per_page=1'), "the run's job");
  assert.ok(asked(k, 'check-runs/777/annotations'), 'its annotations');
  assert.ok(asked(k, `compare/${'a'.repeat(40)}...main?per_page=100`), 'compare');
  assert.ok(!asked(k, 'commits?sha=main&since=2026-11-18T04:50:00Z&per_page=100'), 'the dates are not asked when the commit is known');
  assert.strictEqual(S.deploy_pub_late_live.ok, true);
  // The same commit, two commits of main after it, the oldest 50 minutes old: stale, those two named.
  assert.strictEqual(level('deploy_pub_stale', LIVE), 'fail');
  assert.match(note('deploy_pub_stale', LIVE), /\(run started 04:50Z, by commit aaaaaaa\); the oldest has waited 50 min/);
  assert.match(note('deploy_pub_stale', LIVE), /Not live: 2222222 Photo curation: tile photos; 3333333 Candidate photos: x$/);
  // No recorded commit (an older run, a note that is no SHA, a compare that fails): the dates, said.
  for (const f of ['deploy_pub_compare_404', 'deploy_pub_bad_note', 'deploy_pub_no_note']) {
    assert.strictEqual(level(f, LIVE), 'ok', f);
    assert.match(note(f, LIVE), /\(by run start\)$/, f);
  }
  const wf = read('.github/workflows/pages.yml');
  assert.match(wf, /echo "::notice title=published-source::\$\(git rev-parse HEAD\)"/, 'the deploy records what it archived');
  assert.ok(wf.indexOf('title=published-source') < wf.indexOf('git archive HEAD') + 400, 'in the staging step');
});

test("the live build: every gap on GitHub's side is a note naming the status, never a failure", () => {
  for (const k of ['deploy_runs_403', 'deploy_runs_down', 'deploy_run_missing', 'deploy_commits_500', 'deploy_no_build']) {
    assert.strictEqual(level(k, LIVE), 'notice', k);
    assert.strictEqual(S[k].ok, true, k + ': no failure for what the check cannot see');
    assert.match(note(k, LIVE), /^not read: /, k);
  }
  assert.match(note('deploy_runs_403', LIVE), /HTTP 403.*actions: read/, "the token's missing permission is named");
  assert.match(note('deploy_runs_down', LIVE), /no answer/);
  assert.match(note('deploy_run_missing', LIVE), /build 1490 is not among the latest successful Deploy Pages runs/);
  assert.match(note('deploy_commits_500', LIVE), /HTTP 500/);
  assert.match(note('deploy_no_build', LIVE), /index\.html names no build number/);
  assert.strictEqual(S.deploy_no_build.calls.filter(c => c.url.includes('/pages.yml/')).length, 0, 'no build number: no run is asked');
});

test('the live build: the snapshot carries a small `deploy` entry the brief names the commits from; healthy leaves the line as it was', () => {
  assert.strictEqual(F.B.stale[1], true, 'a look is asked');
  assert.match(
    F.B.stale[0],
    /Health check FAILED .* · Site STALE: 2 commit\(s\) of main not live, the oldest 50 min, live build 1490 \(ddddddd Photo curation: tile photos; ccccccc Candidate photos/
  );
  assert.ok(!F.B.stale[0].includes('\n'), 'one line');
  assert.doesNotMatch(F.B.ahead_recent[0], /STALE/, 'inside the window: nothing in the brief');
  assert.strictEqual(F.B.ahead_recent[1], false);
  assert.doesNotMatch(F.B.healthy[0], /STALE|build/);
  const src = read('tools/health.py');
  assert.match(src, /STALE_MIN = 45/);
  assert.match(src, /DEPLOY_PAGES = 'pages\.yml'/);
});

test('the sheet script check: the public read-only request, its version, behind main', () => {
  const asked = S.ok.calls.filter(c => c.url.includes('?stats=1'));
  assert.deepStrictEqual(
    asked.map(c => [c.url, c.post]),
    [['https://script.google.com/macros/s/FAKE/exec?stats=1&av=health', false]],
    'a GET, with an av that is no build number: the script logs nothing for it (Code.gs behind_, oldApp_)'
  );
  assert.match(note('ok', 'sheet script: answers'), /^v176, /);
  assert.strictEqual(S.sheet_down.calls.filter(c => c.url.includes('?stats=1')).length, 2, 'one retry');
  assert.strictEqual(level('sheet_down', 'sheet script: answers'), 'fail');
  assert.strictEqual(level('sheet_notok', 'sheet script: answers'), 'fail');
  assert.strictEqual(level('sheet_html', 'sheet script: answers'), 'fail', 'an HTML page served with a 200 is no answer');
  assert.strictEqual(S.sheet_html.calls.filter(c => c.url.includes('?stats=1')).length, 2, 'and is tried twice');
  assert.strictEqual(level('sheet_flaky', 'sheet script: answers'), 'ok', 'one bad reply, then a good one: not an outage');
  assert.strictEqual(level('behind_recent', 'sheet script: answers'), 'notice', 'inside the self-update window: a note');
  assert.strictEqual(S.behind_recent.ok, true);
  assert.strictEqual(level('behind_stuck', 'sheet script: answers'), 'fail', 'an hour behind: autoUpdate is stuck');
  assert.strictEqual(S.ok.calls.filter(c => c.url.includes('commits?path=')).length, 0, "main's commit is asked only when behind");
});

test('the sheet script check names the Apps Script version limit when the script reports its count (vers)', () => {
  assert.doesNotMatch(note('ok', 'sheet script: answers'), /version/i, 'no count in the reply: nothing said');
  assert.strictEqual(level('vers_near', 'sheet script: answers'), 'notice', 'near the limit: a note, never a failure');
  assert.strictEqual(S.vers_near.ok, true);
  assert.match(note('vers_near', 'sheet script: answers'), /175 of 200 Apps Script versions kept: delete old versions .*Project history/);
  assert.strictEqual(
    level('vers_full_behind', 'sheet script: answers'),
    'fail',
    'at the limit and behind: failed without waiting the hour'
  );
  assert.match(note('vers_full_behind', 'sheet script: answers'), /behind main \(v176\): Apps Script version limit reached \(200 of 200\)/);
  assert.strictEqual(level('vers_stuck', 'sheet script: answers'), 'fail');
  assert.match(note('vers_stuck', 'sheet script: answers'), /autoUpdate is stuck; 190 of 200 Apps Script versions kept/);
});

test('the backup: not exposed without the token (said, not failed); with it, its age', () => {
  assert.strictEqual(level('ok', 'pCloud backup'), 'notice');
  assert.match(note('ok', 'pCloud backup'), /not exposed without the admin token/);
  assert.strictEqual(S.ok.calls.filter(c => c.post).length, 0, 'no token: no POST to the sheet');
  assert.strictEqual(level('token_ok', 'pCloud backup'), 'ok');
  assert.strictEqual(level('token_backup_old', 'pCloud backup'), 'fail');
  assert.match(note('token_backup_old', 'pCloud backup'), /9 days ago.*failed: result 2000/);
  assert.strictEqual(level('token_backup_never', 'pCloud backup'), 'notice', 'not set up yet: a note, not a failure every hour');
  assert.strictEqual(level('token_refused', 'pCloud backup'), 'notice');
  assert.strictEqual(level('token_old_script', 'pCloud backup'), 'notice', 'a script before readInfra');
  const posts = S.token_ok.calls.filter(c => c.post);
  assert.deepStrictEqual(
    posts.map(c => c.url),
    ['https://script.google.com/macros/s/FAKE/exec'],
    'the token goes only to the sheet script'
  );
});

test('Pages size, R2 by hand, and the numbers only with the token', () => {
  assert.strictEqual(
    S.ok.items.pages.used,
    300001000,
    'the files the deploy keeps (docs/, tools/ are export-ignore), directories not counted'
  );
  assert.strictEqual(S.tree_truncated.items.pages.used, null, 'a truncated tree is no measure');
  assert.strictEqual(S.ok.items.r2.used, 6.3e9);
  assert.match(S.ok.items.r2.note, /^by hand 2026-11-15$/);
  assert.match(S.r2_stale.items.r2.note, /48 days old: measure again/);
  assert.deepStrictEqual(Object.keys(S.ok.items), ['pages', 'r2'], 'no sheet numbers without the admin token');
  assert.deepStrictEqual(Object.keys(S.token_ok.items), ['cells', 'slow', 'pages', 'r2']);
  assert.strictEqual(S.token_ok.items.slow.note, 'read Answers');
  assert.match(S.ok.md, /\| R2 storage \| 6\.30 GB \| 10\.00 GB \| 63 % \| by hand 2026-11-15 \|/);
});

test('no secret in anything it prints, and the issue text holds statuses only', () => {
  for (const [k, v] of Object.entries(S)) assert.deepStrictEqual(v.leaks, [], k + ' leaked a token');
  assert.ok(!/ghp_|ghs_|ADMINTOKEN|Bearer/.test(S.token_ok.md));
});

test("the brief's line: one compact line, a warning past 70%, the failed check said, the sheet numbers pointed to", () => {
  assert.deepStrictEqual(F.B.healthy, [
    'Infra (Health run 1h ago): Pages site 0.30 GB/1.00 GB 30% · R2 storage 6.30 GB/10.00 GB 63% (by hand 2026-11-15) · sheet cells and timings: admin To do > Alerts',
    false
  ]);
  assert.deepStrictEqual(F.B.warn, [
    'Infra (Health run 1h ago): Pages site 0.30 GB/1.00 GB 30% · R2 storage 7.50 GB/10.00 GB 75% WARN (by hand 2026-11-15) · sheet cells and timings: admin To do > Alerts',
    true
  ]);
  assert.match(F.B.token[0], /Sheet cells 7\.40 M\/10\.00 M 74% WARN · Slowest p90 4\.0 s\/5\.0 s 80% WARN \(read Answers\)/);
  assert.ok(!/sheet cells and timings: admin/.test(F.B.token[0]), 'measured: no pointer');
  assert.strictEqual(F.B.token[1], true);
  assert.match(F.B.failed[0], /Health check FAILED/);
  assert.strictEqual(F.B.failed[1], true, 'a failed check asks for a look');
  assert.strictEqual(F.B.exactly_70[1], false);
  assert.match(F.B.truncated[0], /Pages site not read/, 'a tree cut short is "not read", not "by hand"');
  assert.match(F.B.truncated[0], /R2 storage 6\.30 GB/);
  assert.strictEqual(F.B.unread[1], false);
  assert.match(F.B.no_r2[0], /R2 storage to measure by hand \(tools\/infra\.json\)/);
  for (const [k, v] of Object.entries(F.B)) assert.ok(!v[0].includes('\n'), k + ': one line');
});

test("the brief reads the latest completed Health run's `infra` annotation with three REST calls", () => {
  assert.deepStrictEqual(F.R.paths, [
    'repos/ppericard/coral-id-imr/actions/workflows/health.yml/runs?per_page=1&status=completed',
    'repos/ppericard/coral-id-imr/actions/runs/7/jobs?per_page=1',
    'repos/ppericard/coral-id-imr/check-runs/99/annotations'
  ]);
  assert.strictEqual(F.R.same, true);
  assert.strictEqual(F.R.at, '2026-11-18T04:41:00Z');
  assert.strictEqual(F.R.empty, 'no Health run yet');
  const src = read('tools/brief.py');
  assert.match(src, /f_infra = pool\.submit\(infra_read\) if have_gh else None/, 'in the shared 5 s deadline, with the other reads');
  assert.match(src, /' · ' \+ il if ialert/, 'the short brief adds it only when a number warns or the check failed');
});

// ---- the workflow ----------------------------------------------------------------------------------------------------------
test('health.yml: hourly, read-only, no secret passed, one issue at a time', () => {
  const y = read('.github/workflows/health.yml');
  assert.match(y, /cron: '41 \* \* \* \*'/, 'hourly, off the hour and off the Analyses report minute (23)');
  assert.match(y, /permissions:\n {2}contents: read\n {2}issues: write\n/);
  assert.ok(!/secrets\./.test(y.replace(/^#.*$/gm, '')), 'no repository secret is given to the job');
  assert.ok(!/INFRA_TOKEN/.test(y.replace(/^#.*$/gm, '')), 'the admin token is not wired in (an access decision)');
  assert.match(y, /timeout-minutes: 5\n/);
  assert.match(y, /gh issue list --label health --state open/);
  assert.match(y, /gh label create health .*\|\| true/);
  assert.match(y, /runs-on: ubuntu-26\.04/);
  assert.match(y, /python3 tools\/health\.py --md/);
  assert.match(y, /failure\(\) && steps\.check\.outcome == 'failure'/, 'the issue only when the check itself failed');
});

// ---- the sheet's read ---------------------------------------------------------------------------------------------------------
test('readInfra: admin token only, cells of every grid, the Timings summed by weight, the backup line, no name', () => {
  const s = loadCodeGs(),
    T = 'ghp_write000000000000000000',
    run = c => vm.runInContext(c, s.ctx),
    DAY = 864e5,
    ago = d => new Date(Date.now() - d * DAY);
  assert.strictEqual(s.post({readInfra: 1}).error, 'token');
  assert.strictEqual(s.post({readInfra: 1, token: 'ghp_read0000000000000000000'}).error, 'token', 'a read-only token is refused');
  s.post({name: 'Ana Demo', pin: '1234', data: {}, summary: {}});
  const ans = run("sheet_('Answers', ['Id', 'Name', 'Time'])");
  for (let i = 0; i < 12; i++) ans.appendRow(['~anon devicex001', 'Ana Demo', i]);
  const tim = run('sheet_(TIM.TAB, TIM.HEAD)');
  tim.appendRow([ago(1), 'read Answers', 100, 900, 18, 1, 50]);
  tim.appendRow([ago(1), 'read Answers', 9000, 900, 18, 1, 1]);
  tim.appendRow([ago(2), 'save', 2000, '', '', 1, 1]);
  tim.appendRow([ago(2), 'save', 4000, '', '', 1, 1]);
  tim.appendRow([ago(8), 'save', 90000, '', '', 1, 1]); // older than 7 days: left out
  const log = run("sheet_('Deploy log', ['Time', 'Event'])");
  log.appendRow([ago(30), 'pCloud backup: saved reef-id-sheet-2026-10-19.xlsx (upload link; old backups are not pruned)']);
  log.appendRow([ago(5), 'pCloud backup: saved reef-id-sheet-2026-11-13.xlsx (upload link; old backups are not pruned)']);
  log.appendRow([ago(1), 'pCloud backup: weekly trigger made (Sundays, about 02:00 script time)']);
  log.appendRow([ago(0.5), 'pCloud backup: upload of reef-id-sheet-2026-11-17.xlsx to the upload link failed (result 7004)']);
  Object.values(s.sheets).forEach(sh => (sh.maxCols = 26));
  s.sheets.Answers.maxCols = 20;
  const before = JSON.stringify(Object.values(s.sheets).map(sh => sh.rows));
  const r = s.post({readInfra: 1, token: T});
  assert.strictEqual(JSON.stringify(Object.values(s.sheets).map(sh => sh.rows)), before, 'the read writes nothing');
  assert.strictEqual(r.ok, true);
  const sheets = Object.values(s.sheets),
    cells = sheets.reduce((n, sh) => n + sh.getMaxRows() * sh.getMaxColumns(), 0);
  assert.strictEqual(r.cells.total, cells, 'every tab: rows x columns of its grid, not only the filled cells');
  assert.strictEqual(r.cells.limit, 10000000);
  assert.strictEqual(r.cells.tabs, sheets.length);
  assert.ok(
    r.cells.top.length <= 5 && r.cells.top[0][1] * r.cells.top[0][2] >= r.cells.top.at(-1)[1] * r.cells.top.at(-1)[2],
    'the biggest first'
  );
  assert.deepStrictEqual(r.answers, {
    rows: Math.max(0, s.sheets.Answers.getLastRow() - 1),
    cols: s.sheets.Answers.getLastColumn(),
    cells: s.sheets.Answers.getMaxRows() * 20
  });
  assert.deepStrictEqual(
    r.tim.ops,
    [
      {op: 'save', n: 2, p50: 2000, p90: 4000, max: 4000},
      {op: 'read Answers', n: 51, p50: 100, p90: 100, max: 9000}
    ],
    'weighted by the rows, slowest p90 first; a row older than 7 days left out'
  );
  assert.strictEqual(r.backup.last.ok, false, 'the last line is the failed upload');
  assert.match(r.backup.last.text, /failed \(result 7004\)/);
  assert.ok(Math.abs(r.backup.saved - ago(5).getTime()) < 5000, 'the last that saved, not the weekly trigger line');
  assert.ok(!/ana demo|devicex001/i.test(JSON.stringify(r)), 'no name or id in the reply');
  // The reply when nothing was ever measured: empty, not an error.
  const e = loadCodeGs();
  e.ctx.SpreadsheetApp.getActiveSpreadsheet()
    .getSheets()
    .forEach(sh => (sh.maxCols = 26));
  const r0 = e.post({readInfra: 1, token: T});
  assert.strictEqual(r0.ok, true);
  assert.deepStrictEqual(r0.tim.ops, []);
  assert.deepStrictEqual(r0.backup, {saved: null, last: null});
});

// ---- the admin's card ----------------------------------------------------------------------------------------------------------
test("the admin card's rows: the same 70% rule, the backup flagged past 8 days", () => {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(
    block(read('admin.js'), 'const INFRA_SHEET = ', '\nlet INF = null;', {file: 'admin.js'}) +
      '\nthis.f = infraRows; this.on = infraOn; this.pz = infraPagesSize; this.rr = infraRepoRows;',
    ctx
  );
  const NOW = Date.parse('2026-11-18T05:00:00Z'),
    reply = (total, saved, last) => ({
      ok: true,
      v: 999,
      cells: {total, limit: 1e7, tabs: 31, top: []},
      answers: {rows: 41000, cols: 18, cells: 3.9e6},
      tim: {days: 7, ops: [{op: 'read Answers', n: 1200, p50: 1400, p90: 3600, max: 5200}]},
      backup: {saved, last}
    });
  const rows = ctx.f(reply(7e6, NOW - 3 * 864e5, null), NOW);
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(rows.map(r => [r.label, r.text, r.share, r.warn]))), // out of the vm: its Arrays are not ours
    [
      ['Sheet cells', '7.00 M of 10.00 M · 31 tabs', 0.7, false],
      ['Answers tab', '41000 rows × 18 columns · 3.90 M cells', 0.39, false],
      ['p90 read Answers', '3.6 s · 1200 calls, 7 days', 0.72, true],
      ['pCloud backup', 'saved 3 days ago', null, false]
    ]
  );
  assert.strictEqual(ctx.f(reply(7.1e6, NOW - 9 * 864e5, null), NOW)[0].warn, true, 'past 70%');
  assert.strictEqual(ctx.f(reply(1e6, NOW - 9 * 864e5, null), NOW).at(-1).warn, true, 'a backup older than 8 days');
  const none = ctx.f(reply(1e6, null, {at: 1, ok: false, text: 'not configured'}), NOW).at(-1);
  assert.deepStrictEqual([none.text, none.warn], ['not configured', true]);
  assert.strictEqual(ctx.f(reply(1e6, null, null), NOW).at(-1).text, 'none logged');
  // The two rows from GitHub: the tree summed as tools/health.py does (the same fixture tree), R2 from the hand figure.
  const tree = {
    truncated: false,
    tree: [
      {path: 'index.html', type: 'blob', size: 1000},
      {path: 'img/a.webp', type: 'blob', size: 300000000},
      {path: 'img', type: 'tree'},
      {path: 'docs/x.md', type: 'blob', size: 9000000000},
      {path: 'tools/health.py', type: 'blob', size: 20000}
    ]
  };
  const attrs = '* text=auto\n/docs/ export-ignore\n/tools/ export-ignore\n/tests/ export-ignore\n';
  assert.strictEqual(ctx.pz(tree, attrs), S.ok.items.pages.used, 'the same sum as tools/health.py');
  assert.strictEqual(ctx.pz({...tree, truncated: true}, attrs), null);
  assert.strictEqual(ctx.pz(null, attrs), null);
  const rr = (p, h) => JSON.parse(JSON.stringify(ctx.rr(p, h, NOW).map(r => [r.label, r.text, r.share, r.warn])));
  assert.deepStrictEqual(rr(300001000, {r2: {bytes: 6.3e9, at: '2026-11-15'}}), [
    ['Pages site', '0.30 GB of 1.00 GB', 0.300001, false],
    ['R2 storage', '6.30 GB of 10.00 GB · by hand 2026-11-15', 0.63, false]
  ]);
  assert.strictEqual(rr(null, null)[0][1], 'not read');
  assert.strictEqual(rr(null, null)[1][1], 'to measure by hand (tools/infra.json)');
  assert.strictEqual(rr(8e8, {r2: {bytes: 7.5e9, at: '2026-10-01'}})[0][3], true, '80% of Pages');
  assert.deepStrictEqual(rr(0, {r2: {bytes: 7.5e9, at: '2026-10-01'}})[1].slice(1), [
    '7.50 GB of 10.00 GB · by hand 2026-10-01, 48 days old: measure again',
    0.75,
    true
  ]);
  const N = vm.runInContext('INFRA_SHEET', ctx); // main's VERSION + 1 (tools/check_versions.py checks it, rule D3)
  assert.strictEqual(ctx.on({v: N}), true);
  assert.strictEqual(ctx.on({v: N - 1}), false);
  assert.strictEqual(ctx.on(undefined), false);
});
