// The sheet's backup to pCloud (Code.gs backup_, xlsx_; sheet v139, Pierre 2026-11-15; docs/BACKUP.md): run against the
// in-memory sheet (tests/gas.js) with UrlFetchApp stubbed, so nothing reaches Google or pCloud (rule D1). Checks the file's
// name, the requests' shape (the token only in the Authorization header, only to pCloud's two hosts), that the token is
// never logged or returned, the paths without a token or an authorisation, the region fallback, the retention, and the
// .xlsx's parts.
const test = require('node:test'),
  assert = require('node:assert');
const {loadCodeGs} = require('./gas.js');

const TOKEN = 'pcloud-SECRET-token-1234567890';
// Utilities.formatDate and Session as Apps Script has them (the manifest's time zone, Asia/Manila), for these tests only.
function formatDate(d, tz, pat) {
  const z = /^GMT([+-]\d+)$/.exec(tz);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: z ? 'Etc/GMT' + (z[1][0] === '+' ? '-' : '+') + Math.abs(+z[1]) : tz,
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
  const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
  return pat
    .replace(/'([^']*)'/g, '\u0001$1\u0001')
    .split('\u0001')
    .map((s, i) =>
      i % 2
        ? s
        : s.replace(
            /yyyy|MM|dd|HH|mm|ss|SSS/g,
            t => ({yyyy: p.year, MM: p.month, dd: p.day, HH: p.hour, mm: p.minute, ss: p.second, SSS: ms})[t]
          )
    )
    .join('');
}
const extend = more => ctx => {
  ctx.Utilities.formatDate = formatDate;
  ctx.Session = {getScriptTimeZone: () => 'Asia/Manila'};
  if (more) more(ctx);
};
const ok = o => ({getResponseCode: () => 200, getContentText: () => JSON.stringify(o)});
// A pCloud stand-in: answers each method, records every request (url, options).
function pcloud({hostOk = ['api.pcloud.com'], contents = [], upload = null, list = null, del = () => 0} = {}) {
  const calls = [];
  const fetch = (url, o) => {
    const u = new URL(url),
      m = u.pathname.slice(1),
      q = Object.fromEntries(u.searchParams);
    calls.push({url, host: u.host, method: m, q, o});
    if (!/pcloud\.com$/.test(u.host)) return null;
    if (!hostOk.includes(u.host)) return ok({result: 2000, error: 'Log in failed.'});
    if (m === 'createfolderifnotexists') return ok({result: 0, metadata: {folderid: q.name === 'IMR' ? 111 : 222, name: q.name}});
    if (m === 'uploadfile') return ok(upload || {result: 0, fileids: [999], metadata: [{fileid: 999, name: q.filename, size: 1887437}]});
    if (m === 'listfolder') return ok(list || {result: 0, metadata: {folderid: 222, contents}});
    if (m === 'deletefile') return ok({result: del(q.fileid), metadata: {isdeleted: true}});
    return ok({result: 1000});
  };
  return {calls, fetch};
}
function load({props = {}, fetch, more, tabs = true} = {}) {
  const s = loadCodeGs({fetch, extend: extend(more)});
  Object.assign(s.props, props);
  if (tabs) {
    const ra = s.ctx.SpreadsheetApp.getActiveSpreadsheet().insertSheet('RAs');
    ra.appendRow(['Name', 'Hash', 'Created']);
    ra.appendRow(['P1', 'abc123', new Date('2026-11-15T01:02:03.004Z')]);
  }
  return s;
}
const run = (s, f = 'backupWeekly') => s.ctx[f]();
const deployLog = s => (s.sheets['Deploy log'] ? s.sheets['Deploy log'].rows.slice(1).map(r => r[1]) : []);
// Everything the script could have shown or kept: the sheet's cells, the return value, the toasts, every URL.
const everywhere = (s, ret, calls) =>
  JSON.stringify(Object.values(s.sheets).map(sh => sh.rows)) + String(ret) + JSON.stringify(s.toasts) + calls.map(c => c.url).join(' ');

test('the file name is the day in the script time zone (Asia/Manila)', () => {
  const s = load();
  assert.strictEqual(s.ctx.backupName_(new Date('2026-11-15T17:30:00Z')), 'reef-id-sheet-2026-11-16.xlsx');
  assert.strictEqual(s.ctx.backupName_(new Date('2026-01-04T03:00:00Z')), 'reef-id-sheet-2026-01-04.xlsx');
  assert.match(s.ctx.backupName_(new Date()), /^reef-id-sheet-\d{4}-\d{2}-\d{2}\.xlsx$/);
});

test('no token: nothing is fetched, one line says not configured', () => {
  const pc = pcloud();
  const s = load({fetch: pc.fetch});
  const m = run(s);
  assert.match(m, /not configured \(no PCLOUD_TOKEN/);
  assert.strictEqual(pc.calls.length, 0);
  assert.deepStrictEqual(deployLog(s), [m]);
});

test('a PCLOUD_HOST that is not one of pCloud API hosts: the token is sent nowhere', () => {
  for (const host of ['evil.example.com', 'api.pcloud.com.evil.com', 'my.pcloud.com']) {
    const pc = pcloud();
    const s = load({fetch: pc.fetch, props: {PCLOUD_TOKEN: TOKEN, PCLOUD_HOST: host}});
    assert.match(run(s), /not configured \(PCLOUD_HOST must be/);
    assert.strictEqual(pc.calls.length, 0, host);
  }
  const pc = pcloud();
  const s = load({fetch: pc.fetch, props: {PCLOUD_TOKEN: TOKEN, PCLOUD_FOLDER_ID: '12; drop'}});
  assert.match(run(s), /PCLOUD_FOLDER_ID must be/);
  assert.strictEqual(pc.calls.length, 0);
});

test('the requests: folders, then a multipart upload; the token only in the Authorization header', () => {
  const pc = pcloud();
  const s = load({fetch: pc.fetch, props: {PCLOUD_TOKEN: TOKEN}});
  const m = run(s);
  assert.match(m, /^pCloud backup: saved reef-id-sheet-\d{4}-\d{2}-\d{2}\.xlsx \(1\.8 MB\)$/);
  assert.deepStrictEqual(
    pc.calls.map(c => [c.host, c.method, c.q]),
    [
      ['api.pcloud.com', 'createfolderifnotexists', {folderid: '0', name: 'IMR'}],
      ['api.pcloud.com', 'createfolderifnotexists', {folderid: '111', name: 'reef-id-sheet-backups'}],
      ['api.pcloud.com', 'uploadfile', {folderid: '222', filename: s.ctx.backupName_(new Date()), nopartial: '1'}],
      ['api.pcloud.com', 'listfolder', {folderid: '222'}]
    ]
  );
  pc.calls.forEach(c => {
    assert.ok(c.url.startsWith('https://api.pcloud.com/'), c.url);
    assert.deepStrictEqual({...c.o.headers}, {Authorization: 'Bearer ' + TOKEN});
    assert.strictEqual(c.o.muteHttpExceptions, true);
  });
  const up = pc.calls[2].o;
  assert.strictEqual(up.method, 'post');
  assert.deepStrictEqual(Object.keys(up.payload), ['file']);
  assert.strictEqual(up.payload.file.name, s.ctx.backupName_(new Date()));
  assert.strictEqual(up.payload.file.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.ok(!everywhere(s, m, pc.calls).includes(TOKEN));
  assert.deepStrictEqual(deployLog(s), [m]);
});

test('a folder id in PCLOUD_FOLDER_ID: the backup folder is made inside it', () => {
  const pc = pcloud();
  const s = load({fetch: pc.fetch, props: {PCLOUD_TOKEN: TOKEN, PCLOUD_FOLDER_ID: '12345678901'}});
  assert.match(run(s), /saved/);
  assert.deepStrictEqual(pc.calls[0].q, {folderid: '12345678901', name: 'reef-id-sheet-backups'});
  assert.strictEqual(pc.calls[1].method, 'uploadfile');
  assert.strictEqual(pc.calls[1].q.folderid, '222');
});

test('region: a token the US host refuses is tried on the EU host, and the rest goes there', () => {
  const pc = pcloud({hostOk: ['eapi.pcloud.com']});
  const s = load({fetch: pc.fetch, props: {PCLOUD_TOKEN: TOKEN}});
  assert.match(run(s), /saved/);
  assert.deepStrictEqual(
    pc.calls.map(c => c.host),
    ['api.pcloud.com', 'eapi.pcloud.com', 'eapi.pcloud.com', 'eapi.pcloud.com', 'eapi.pcloud.com']
  );
  // PCLOUD_HOST set: only that host, no fallback.
  const pc2 = pcloud({hostOk: ['eapi.pcloud.com']});
  const s2 = load({fetch: pc2.fetch, props: {PCLOUD_TOKEN: TOKEN, PCLOUD_HOST: 'API.pcloud.com'}});
  const m2 = run(s2);
  assert.match(m2, /pCloud refused the token or the folder \(result 2000\)/);
  assert.deepStrictEqual(
    pc2.calls.map(c => c.host),
    ['api.pcloud.com']
  );
  // Refused on both: one line with the numeric result only.
  const pc3 = pcloud({hostOk: []});
  const s3 = load({fetch: pc3.fetch, props: {PCLOUD_TOKEN: TOKEN}});
  const m3 = run(s3);
  assert.match(m3, /result 2000\); check PCLOUD_TOKEN/);
  assert.ok(!/Log in failed/.test(m3));
  assert.ok(!everywhere(s3, m3, pc3.calls).includes(TOKEN));
});

test('missing authorisation: an exception that names the token is logged without it, nothing else breaks', () => {
  const msg =
    'You do not have permission to call UrlFetchApp.fetch with ' +
    TOKEN +
    '. Required permissions: https://www.googleapis.com/auth/script.external_request';
  const s = load({
    props: {PCLOUD_TOKEN: TOKEN},
    fetch: url => {
      if (/pcloud/.test(url)) throw new Error(msg);
    }
  });
  const m = run(s);
  assert.match(m, /^pCloud backup: needs authorisation \(docs\/BACKUP\.md\): You do not have permission/);
  assert.ok(m.includes('[token]'));
  assert.ok(!everywhere(s, m, []).includes(TOKEN));
  // The rest of the script still answers (a load of an unknown name).
  assert.strictEqual(typeof s.get({name: 'x', pin: 'ab'}).v, 'number');
});

test('missing authorisation to read the spreadsheet: logged, no pCloud call', () => {
  const pc = pcloud();
  const s = load({
    fetch: pc.fetch,
    props: {PCLOUD_TOKEN: TOKEN},
    tabs: false,
    more: ctx => {
      const ss = ctx.SpreadsheetApp.getActiveSpreadsheet();
      ss.getSheets = () => {
        throw new Error('Authorization is required to perform that action.');
      };
    }
  });
  assert.match(run(s), /needs authorisation/);
  assert.strictEqual(pc.calls.length, 0);
});

test('a failure of anything else is one line, never thrown', () => {
  const s = load({
    props: {PCLOUD_TOKEN: TOKEN},
    fetch: url => {
      if (/pcloud/.test(url)) throw new Error('Address unavailable: https://api.pcloud.com/createfolderifnotexists');
    }
  });
  assert.match(run(s), /^pCloud backup: failed: Address unavailable/);
});

test('a failed upload deletes nothing and lists nothing', () => {
  for (const upload of [
    {result: 2008, error: 'Over quota.'},
    {result: 0, metadata: [{fileid: 9, size: 0}]}
  ]) {
    const pc = pcloud({upload});
    const s = load({fetch: pc.fetch, props: {PCLOUD_TOKEN: TOKEN}});
    assert.match(run(s), /upload of reef-id-sheet-.* failed/);
    assert.deepStrictEqual(
      pc.calls.map(c => c.method),
      ['createfolderifnotexists', 'createfolderifnotexists', 'uploadfile']
    );
  }
});

test('retention: the 12 newest backups kept, older ones deleted; nothing else is touched', () => {
  const day = i => new Date(Date.UTC(2026, 7, 1) + i * 7 * 864e5).toISOString().slice(0, 10);
  const backups = Array.from({length: 14}, (_, i) => ({fileid: 100 + i, name: 'reef-id-sheet-' + day(i) + '.xlsx', isfolder: false}));
  const others = [
    {fileid: 50, name: 'reef-id-sheet-2020-01-01.xlsx.bak', isfolder: false},
    {fileid: 51, name: 'my manual export.xlsx', isfolder: false},
    {folderid: 52, name: 'reef-id-sheet-2019-01-01.xlsx', isfolder: true},
    {fileid: 53, name: 'Reef-id-sheet-2019-01-01.xlsx', isfolder: false}
  ];
  // The new upload (999) is in the listing too: 14 + 1 = 15, so the 3 oldest go.
  const contents = [...others, ...backups, {fileid: 999, name: 'reef-id-sheet-2099-01-01.xlsx', isfolder: false}].reverse();
  const pc = pcloud({contents});
  const s = load({fetch: pc.fetch, props: {PCLOUD_TOKEN: TOKEN}});
  const m = run(s);
  assert.match(m, /, 3 older backups deleted$/);
  const deleted = pc.calls.filter(c => c.method === 'deletefile').map(c => c.q.fileid);
  assert.deepStrictEqual(deleted, ['102', '101', '100']);
  // A delete pCloud refuses is counted, not hidden.
  const pc2 = pcloud({contents, del: id => (id === '101' ? 2009 : 0)});
  assert.match(run(load({fetch: pc2.fetch, props: {PCLOUD_TOKEN: TOKEN}})), /, 2 older backups deleted, 1 could not be deleted$/);
  // 12 or fewer backups: nothing deleted.
  const pc3 = pcloud({contents: backups.slice(0, 11)});
  assert.match(run(load({fetch: pc3.fetch, props: {PCLOUD_TOKEN: TOKEN}})), /\(1\.8 MB\)$/);
  assert.ok(!pc3.calls.some(c => c.method === 'deletefile'));
  // The listing fails: nothing deleted, said so.
  const pc4 = pcloud({list: {result: 2005, error: 'Directory does not exist.'}});
  assert.match(run(load({fetch: pc4.fetch, props: {PCLOUD_TOKEN: TOKEN}})), /old backups not checked \(result 2005\)$/);
  assert.ok(!pc4.calls.some(c => c.method === 'deletefile'));
});

test('the .xlsx: one worksheet per tab, values typed, text never a formula, long cells whole', () => {
  const s = load();
  const ss = s.ctx.SpreadsheetApp.getActiveSpreadsheet();
  const an = ss.insertSheet('Answers');
  const long = 'x'.repeat(45000);
  an.appendRow(['Time', 'Who', 'Right', 'Ms', 'Note', 'Off']);
  an.appendRow([new Date('2026-11-15T00:00:00Z'), 'P2 <&> "q"', true, 1234.5, "=HYPERLINK('x')", '+480']);
  an.appendRow(['', long, false, 0, 'a\u0001b', -0.25]);
  an.appendRow(['', 'P2 <&> "q"']);
  ss.insertSheet('Odd: [name]/?*');
  ss.insertSheet('Empty');
  const z = s.ctx.xlsx_('reef-id-sheet-2026-11-15.xlsx');
  assert.strictEqual(z.name, 'reef-id-sheet-2026-11-15.xlsx');
  assert.strictEqual(z.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.deepStrictEqual(Object.keys(z.parts), [
    '[Content_Types].xml',
    '_rels/.rels',
    'xl/workbook.xml',
    'xl/_rels/workbook.xml.rels',
    'xl/sharedStrings.xml',
    'xl/styles.xml',
    'xl/worksheets/sheet1.xml',
    'xl/worksheets/sheet2.xml',
    'xl/worksheets/sheet3.xml',
    'xl/worksheets/sheet4.xml'
  ]);
  assert.ok(
    z.parts['xl/workbook.xml'].includes('<sheet name="RAs" sheetId="1" r:id="rId1"/><sheet name="Answers" sheetId="2" r:id="rId2"/>')
  );
  assert.ok(z.parts['xl/workbook.xml'].includes('<sheet name="Odd_ _name____" sheetId="3" r:id="rId3"/>'));
  const a = z.parts['xl/worksheets/sheet2.xml'];
  // 2026-11-15 08:00 Manila = 46341 + 1/3.
  assert.match(a, /<c r="A2" s="1"><v>46341\.3333333333\d*<\/v><\/c>/);
  // A text cell is a shared string (t="s"): its index in xl/sharedStrings.xml, each text once.
  const sst = [...z.parts['xl/sharedStrings.xml'].matchAll(/<si><t xml:space="preserve">(.*?)<\/t><\/si>/gs)].map(m => m[1]);
  const text = ref => {
    const m = new RegExp('<c r="' + ref + '" t="s"><v>(\\d+)</v></c>').exec(a);
    return m && sst[+m[1]];
  };
  assert.strictEqual(text('B2'), 'P2 &lt;&amp;&gt; &quot;q&quot;');
  assert.ok(a.includes('<c r="C2" t="b"><v>1</v></c>'));
  assert.ok(a.includes('<c r="D2"><v>1234.5</v></c>'));
  assert.strictEqual(text('E2'), "=HYPERLINK('x')");
  assert.strictEqual(text('F2'), '+480');
  assert.ok(!a.includes('<c r="A3"'), 'an empty cell is left out');
  assert.strictEqual(text('B3'), long);
  assert.strictEqual(text('E3'), 'ab', 'a control character is dropped');
  assert.ok(a.includes('<c r="F3"><v>-0.25</v></c>'));
  assert.strictEqual(new Set(sst).size, sst.length, 'each text is stored once');
  assert.strictEqual(a.match(/<c r="B4" t="s"><v>(\d+)<\/v>/)[1], a.match(/<c r="B2" t="s"><v>(\d+)<\/v>/)[1]);
  assert.match(z.parts['xl/sharedStrings.xml'], new RegExp('uniqueCount="' + sst.length + '"'));
  assert.strictEqual(z.parts['xl/worksheets/sheet4.xml'].match(/<sheetData>(.*)<\/sheetData>/)[1], '');
  const rels = z.parts['xl/_rels/workbook.xml.rels'];
  assert.ok(rels.includes('Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"'));
  assert.ok(rels.includes('Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings"'));
  assert.ok(z.parts['[Content_Types].xml'].includes('<Override PartName="/xl/sharedStrings.xml"'));
  // Column letters past Z.
  const w = ss.insertSheet('Wide');
  w.appendRow(Array.from({length: 28}, (_, i) => i));
  const z2 = s.ctx.xlsx_('x.xlsx');
  assert.match(z2.parts['xl/worksheets/sheet5.xml'], /<c r="Z1"><v>25<\/v><\/c><c r="AA1"><v>26<\/v><\/c><c r="AB1"><v>27<\/v><\/c>/);
});

test('scale: 20,000 answer rows, one time zone lookup per hour of the log, each repeated text stored once', () => {
  let calls = 0;
  const s = load({
    tabs: false,
    more: ctx => {
      const f = ctx.Utilities.formatDate;
      ctx.Utilities.formatDate = (...a) => (calls++, f(...a));
    }
  });
  const an = s.ctx.SpreadsheetApp.getActiveSpreadsheet().insertSheet('Answers');
  const t0 = Date.UTC(2026, 10, 1);
  for (let i = 0; i < 20000; i++)
    an.rows.push(['P' + (i % 40), new Date(t0 + i * 9e3), ['Acropora', 'Porites', 'Favites'][i % 3], 'Porites', i % 2, 'quiz', 'id' + i]);
  const t = Date.now();
  const z = s.ctx.xlsx_('x.xlsx');
  assert.ok(Date.now() - t < 15000, 'built in ' + (Date.now() - t) + ' ms');
  assert.strictEqual(calls, 50, '20,000 rows 9 s apart span 50 hours');
  const sst = z.parts['xl/sharedStrings.xml'].match(/<si>/g).length;
  assert.strictEqual(sst, 40 + 3 + 1 + 20000, 'names, units, the mode and the unique ids, once each');
  // The last row (no header here: row 20000 is answer 19999): its time in Manila (UTC+8) as a serial day.
  const last = +/<c r="B20000" s="1"><v>([\d.]+)<\/v><\/c>/.exec(z.parts['xl/worksheets/sheet1.xml'])[1];
  assert.ok(Math.abs(last - ((t0 + 19999 * 9e3 + 8 * 36e5) / 864e5 + 25569)) < 1e-9, String(last));
});

test('the menu, the weekly trigger made once, and Back up now', () => {
  const pc = pcloud();
  const s = load({fetch: pc.fetch, props: {PCLOUD_TOKEN: TOKEN}});
  s.ctx.onOpen();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s.menus)), [
    {name: 'Reef ID', items: [{name: 'Back up to pCloud now', functionName: 'backupNow'}]}
  ]);
  assert.strictEqual(typeof s.ctx[s.menus[0].items[0].functionName], 'function');
  const m = s.ctx.backupNow();
  assert.match(m, /saved/);
  assert.deepStrictEqual(
    s.triggers.map(t => [t.handler, t.weekDay, t.hour]),
    [['backupWeekly', 'SUNDAY', 2]]
  );
  assert.strictEqual(s.toasts.length, 1);
  assert.strictEqual(s.toasts[0].msg, m);
  s.ctx.backupNow();
  assert.strictEqual(s.ctx.installBackup(), 'the weekly trigger is already there');
  assert.strictEqual(s.triggers.length, 1);
  assert.ok(!everywhere(s, m, pc.calls).includes(TOKEN));
  // A menu that cannot be added never throws (onOpen runs at every opening of the sheet).
  const s2 = load({
    more: ctx =>
      (ctx.SpreadsheetApp.getActiveSpreadsheet().addMenu = () => {
        throw new Error('no');
      })
  });
  assert.doesNotThrow(() => s2.ctx.onOpen());
});

test('no manifest scope is added (a new scope is expected to stop the web app and the trigger until authorised)', () => {
  const man = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'tools', 'sync', 'appsscript.json'), 'utf8'));
  assert.deepStrictEqual(man.oauthScopes, [
    'https://www.googleapis.com/auth/spreadsheets.currentonly',
    'https://www.googleapis.com/auth/script.external_request',
    'https://www.googleapis.com/auth/script.scriptapp',
    'https://www.googleapis.com/auth/script.projects',
    'https://www.googleapis.com/auth/script.deployments'
  ]);
});
