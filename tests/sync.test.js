// Sync script (tools/sync/Code.gs) against an in-memory sheet: node --test tests/
const test = require('node:test'),
  assert = require('node:assert');
const {loadCodeGs} = require('./gas.js');

const prog = n => ({'imr-coral-progress': JSON.stringify({Acropora: {ok: n, ko: 0}})});
const ans = (id, extra = {}) => ({
  id,
  t: '2026-11-01T00:00:00Z',
  g: 'Acropora',
  a: 'Acropora',
  ok: 1,
  m: 'quiz',
  ph: 'acropora-1 acropora-2',
  ...extra
});

test('new RA, save and load back, with revision', () => {
  const s = loadCodeGs();
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}), {ok: true, found: false, v: 15});
  const r = s.post({name: 'Ana', pin: '1234', data: prog(3), summary: {}, answers: [ans('a1')]});
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.log, true);
  assert.strictEqual(r.rev, 1);
  const g = s.get({name: 'ana', pin: '1234'});
  assert.strictEqual(g.found, true);
  assert.strictEqual(g.rev, 1);
  assert.deepStrictEqual(g.data, prog(3));
});

test('a stale write is refused but its answers are kept', () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: []});
  const r = s.post({name: 'Ana', pin: '1234', data: prog(2), summary: {}, answers: [ans('b1')], at: 0});
  assert.strictEqual(r.error, 'stale');
  assert.strictEqual(r.log, true);
  assert.strictEqual(r.rev, 1);
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).data, prog(1));
  assert.strictEqual(s.sheets.Answers.getLastRow(), 2);
  assert.strictEqual(s.post({name: 'Ana', pin: '1234', data: prog(2), summary: {}, answers: [ans('b1')], at: 1}).rev, 2);
  assert.strictEqual(s.sheets.Answers.getLastRow(), 2, 'a resent answer is not logged twice');
});

test('older apps (no at) are still accepted', () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}});
  assert.strictEqual(s.post({name: 'Ana', pin: '1234', data: prog(2), summary: {}}).ok, true);
});

test('progress over 50,000 characters is saved in chunks and read back whole', () => {
  const s = loadCodeGs(),
    ps = {};
  for (let i = 0; i < 4000; i++) ps['acropora-cand-' + (100000000 + i)] = [3, 2];
  const data = {'imr-coral-progress': JSON.stringify({Acropora: {ok: 1, ko: 0, ps}})};
  assert.ok(JSON.stringify(data).length > 120000);
  assert.strictEqual(s.post({name: 'Ana', pin: '1234', data, summary: {}, answers: []}).ok, true);
  assert.strictEqual(s.sheets.RAs.getRange(2, 8).getValue(), '@Progress data');
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).data, data);
  // shrinking again clears the leftover chunks
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, at: 1});
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).data, prog(1));
});

test('rows written by v5 (JSON in RAs column H) are read and get revision 0', () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}});
  delete s.sheets['Progress data'];
  const g = s.get({name: 'Ana', pin: '1234'});
  assert.strictEqual(g.rev, 0);
  assert.deepStrictEqual(g.data, prog(1));
});

test('names and answer fields never become formulas', () => {
  const s = loadCodeGs();
  s.post({
    name: '=IMPORTDATA("x")',
    pin: '1234',
    data: prog(1),
    summary: {genera: {Acropora: 'ok'}},
    answers: [ans('c1', {g: '=HYPERLINK("x")', m: '+bad', ph: '=x'})]
  });
  const all = Object.values(s.sheets).flatMap(sh => sh.rows.flat());
  assert.ok(!all.some(v => v && v.formula && !/^=QUERY/.test(v.formula)), 'no formula except the Activity QUERY');
  const row = s.sheets.Answers.getRange(2, 1, 1, 7).getValues()[0];
  assert.strictEqual(row[0], '=IMPORTDATA("x")');
  assert.strictEqual(row[2], '');
  assert.strictEqual(row[5], '');
  assert.strictEqual(row[6], '');
  assert.strictEqual(s.get({name: '=IMPORTDATA("x")', pin: '1234'}).found, true);
});

test('a code hash starting with + still matches', () => {
  const s = loadCodeGs();
  // find a name whose hash starts with '+'
  let name = null;
  for (let i = 0; i < 5000 && !name; i++) if (s.ctx.hash_('ra' + i, '1234')[0] === '+') name = 'ra' + i;
  assert.ok(name);
  s.post({name, pin: '1234', data: prog(1), summary: {}});
  assert.strictEqual(s.get({name, pin: '1234'}).found, true);
});

test('five wrong codes block the name for a while', () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}});
  for (let i = 0; i < 5; i++) assert.strictEqual(s.get({name: 'Ana', pin: '000' + i}).error, 'pin');
  assert.strictEqual(s.get({name: 'Ana', pin: '1234'}).error, 'wait');
  assert.strictEqual(s.post({name: 'Ana', pin: '1234', data: prog(2), summary: {}}).error, 'wait');
});

test('anonymous ids use a secret salt; the caller learns its own id with its code', () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {learned: 1}, answers: [ans('d1')]});
  const T = 'ghp_write000000000000000000';
  const a = s.post({readAnswers: 1, token: T});
  const id = a.rows[0][0];
  assert.strictEqual(a.me, undefined);
  assert.ok(s.props.ANON_SALT);
  const pub = require('crypto').createHash('sha256').update('imr-coral-id|anon|ana').digest('base64').slice(0, 8);
  assert.notStrictEqual(id, pub, 'not the old public-salt id');
  assert.strictEqual(s.post({readAnswers: 1, token: T, aname: 'Ana', apin: '1234'}).me, id);
  assert.strictEqual(s.post({readAnswers: 1, token: T, aname: 'Ana', apin: '9999'}).me, undefined);
  assert.ok(a.players[id]);
  assert.ok(s.post({readStats: 1, token: T}).ras[id]);
  // v14: per-player numbers are admin-only (the public leaderboard names players); the public stats keep the photos.
  assert.strictEqual(s.get({answers: '1'}).error, 'token');
  assert.strictEqual(s.post({readAnswers: 1}).error, 'token');
  assert.strictEqual(s.post({readStats: 1, token: 'ghp_readonly0000000000000'}).error, 'token');
  const open = s.get({stats: '1'});
  assert.ok(open.photos && open.conf && !open.ras, 'no per-player ability in public');
});

const rep = (id, extra = {}) => ({
  id,
  t: '2026-11-01T00:00:00Z',
  why: 'wrong',
  g: 'Acropora',
  a: 'Montipora',
  fix: 'Montipora',
  note: 'corallites',
  m: 'quiz',
  ph: 'acropora-1 acropora-2',
  ...extra
});

test('reports: logged once, reporter verified by code, never mistaken for a progress write', () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(3), summary: {}});
  assert.deepStrictEqual(s.post({rname: 'Ana', rpin: '1234', reports: [rep('r1')]}), {ok: true, rep: true, v: 15});
  s.post({rname: 'Ana', rpin: '1234', reports: [rep('r1'), rep('r2', {why: 'multi', fix: ''})]});
  s.post({rname: 'Bob', rpin: '', reports: [rep('r3', {why: 'bogus'}), rep('r4', {why: 'photo', note: '=HYPERLINK("x")'})]});
  const R = s.sheets.Reports;
  assert.strictEqual(R.getLastRow(), 4, 'r1 once, r2, r4; r3 has no valid reason');
  assert.deepStrictEqual(R.getRange(2, 2, 1, 5).getValues()[0], ['Ana', 1, 'Wrong answer', 'Acropora', 'Montipora']);
  assert.deepStrictEqual(R.getRange(4, 2, 1, 2).getValues()[0], ['Bob', 0]);
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).data, prog(3), 'progress untouched');
  s.post({rname: 'Ana', rpin: '1234', reports: [rep('r5', {why: 'idea', g: '', a: '', fix: '', ph: '', m: 'page', w: 'finder|form=M'})]});
  assert.deepStrictEqual(
    R.getRange(5, 4, 1, 8)
      .getValues()[0]
      .slice(0, 1)
      .concat(R.getRange(5, 9, 1, 3).getValues()[0]),
    ['Suggestion', 'page', '', 'finder|form=M']
  );
});

test('reports list: only a GitHub token that can write to the repo, checked once', () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}});
  s.post({rname: 'Ana', rpin: '1234', reports: [rep('r1'), rep('r2', {why: 'other'})]});
  assert.strictEqual(s.post({readReports: 1}).error, 'token');
  assert.strictEqual(s.post({readReports: 1, token: 'ghp_readonly0000000000000'}).error, 'token');
  assert.strictEqual(s.post({readReports: 1, token: 'bad_token_0000000000000000'}).error, 'token');
  const a = s.post({readReports: 1, token: 'ghp_write000000000000000000'});
  assert.strictEqual(a.rows.length, 2);
  assert.strictEqual(a.rows[0][0], 'r2', 'newest first');
  assert.deepStrictEqual(a.rows[1].slice(2, 9), ['Ana', 1, 'wrong', 'Acropora', 'Montipora', 'Montipora', 'corallites']);
  assert.strictEqual(a.rows[0][11], '', 'where (v8)');
  const n = s.fetched.length;
  s.post({readReports: 1, token: 'ghp_write000000000000000000'});
  assert.strictEqual(s.fetched.length, n, 'remembered for 10 minutes');
  assert.ok(!JSON.stringify(s.cache).includes('ghp_write'), 'the token itself is never stored');
  assert.strictEqual(s.get({reports: '1', name: 'Ana', pin: '1234'}).found, true, 'no GET for reports');
});

// Admin user management (v11).
const TOK = 'ghp_write000000000000000000';
const seed = () => {
  const s = loadCodeGs();
  s.post({
    name: 'Ana',
    pin: '1234',
    data: prog(3),
    summary: {learned: 1, seen: 2, total: 39},
    answers: [ans('a1'), ans('a2', {ok: 0, a: 'Montipora', m: 'quiz-duel'})]
  });
  s.post({name: 'Ana B', pin: '5678', data: prog(2), summary: {learned: 0, seen: 1, total: 39}, answers: [ans('b1')]});
  s.post({name: 'Ben', pin: '1111', data: prog(1), summary: {}, answers: [ans('c1')]});
  s.post({rname: 'Ana B', rpin: '5678', reports: [{id: 'r1', why: 'photo', t: '2026-11-01T00:00:00Z'}]});
  return s;
};

test('users: admin token only; one row per player with their numbers', () => {
  const s = seed();
  assert.strictEqual(s.post({users: 1}).error, 'token');
  assert.strictEqual(s.post({users: 1, token: 'ghp_readonly0000000000000'}).error, 'token');
  const r = s.post({users: 1, token: TOK});
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.v, 15);
  const ana = r.users.find(u => u.name === 'Ana');
  // v13: the anonymous id of ?answers=1, so the admin can put names on the anonymous stats.
  const a = s.post({readAnswers: 1, token: TOK});
  assert.ok(ana.id && a.rows.some(x => x[0] === ana.id));
  assert.notStrictEqual(ana.id, r.users.find(u => u.name === 'Ana B').id);
  assert.strictEqual(ana.answers, 2);
  assert.strictEqual(ana.right, 1);
  assert.strictEqual(ana.learned, 1);
  assert.strictEqual(ana.days, 1);
  assert.deepStrictEqual(ana.modes, {quiz: [1, 1], 'quiz-duel': [1, 0]});
  assert.deepStrictEqual(ana.mix, [['Acropora', 'Montipora', 1]]);
  assert.strictEqual(r.users.find(u => u.name === 'Ana B').reports, 1);
  assert.strictEqual(s.post({userData: 'ana b', token: TOK}).rev, 1);
});

test('userMerge: progress written to into, answers and reports relabelled, from removed and refused afterwards', () => {
  const s = seed();
  const merged = prog(5);
  assert.strictEqual(s.post({userMerge: {from: 'Ana B', into: 'Ana', data: merged, at: 0}, token: TOK}).error, 'stale');
  const r = s.post({userMerge: {from: 'Ana B', into: 'Ana', data: merged, at: 1}, token: TOK});
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.answers, 1);
  assert.strictEqual(r.reports, 1);
  assert.strictEqual(r.rev, 2);
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).data, merged);
  const u = s.post({users: 1, token: TOK});
  assert.deepStrictEqual(u.users.map(x => x.name).sort(), ['Ana', 'Ben']);
  assert.strictEqual(u.users.find(x => x.name === 'Ana').answers, 3);
  assert.deepStrictEqual(
    u.removed.map(x => [x.name, x.into]),
    [['Ana B', 'Ana']]
  );
  // The old device of "Ana B": a pull and a send both get 'gone', and its new answers go to Ana.
  assert.deepStrictEqual(s.get({name: 'Ana B', pin: '5678'}), {ok: false, error: 'gone', into: 'Ana', v: 15});
  const w = s.post({name: 'Ana B', pin: '5678', data: prog(9), summary: {}, answers: [ans('b2')]});
  assert.strictEqual(w.error, 'gone');
  assert.strictEqual(w.log, true);
  assert.strictEqual(s.post({users: 1, token: TOK}).users.find(x => x.name === 'Ana').answers, 4);
  assert.strictEqual(s.sheets.RAs.getLastRow(), 3, 'no account re-created for Ana B');
  // Someone new may still take the name with another code.
  assert.strictEqual(s.post({name: 'Ana B', pin: '0000', data: prog(1), summary: {}}).ok, true);
});

test('userDelete: rows gone; answers kept anonymously unless asked; the old code is refused', () => {
  const s = seed();
  const r = s.post({userDelete: 'Ben', token: TOK});
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.answers, 1);
  assert.ok(
    s.sheets.Answers.rows.some(x => /^~deleted /.test(x[0])),
    'answers kept for photo difficulty, without the name'
  );
  assert.ok(!s.sheets.RAs.rows.some(x => x && x[0] === 'Ben'));
  assert.strictEqual(s.get({name: 'Ben', pin: '1111'}).error, 'gone');
  const d = s.post({userDelete: 'Ana B', answers: true, token: TOK});
  assert.strictEqual(d.answers, 1);
  assert.ok(!s.sheets.Answers.rows.some(x => x && /Ana B/.test(x[0])));
  assert.strictEqual(s.post({userDelete: 'Nobody', token: TOK}).error, 'user');
});

test('a duel on a chosen pair keeps its mode (rated as 2 choices)', () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [ans('d1', {m: 'quiz-duel|Acropora|Montipora'})]});
  assert.strictEqual(s.sheets.Answers.getRange(2, 6).getValue(), 'quiz-duel|Acropora|Montipora');
});

// Self-update (v11): a higher VERSION on GitHub main replaces the code, makes a version and repoints the web app.
const CODE = require('fs').readFileSync(require('path').join(__dirname, '..', 'tools', 'sync', 'Code.gs'), 'utf8');
const resp = (code, body) => ({
  getResponseCode: () => code,
  getContentText: () => (typeof body === 'string' ? body : JSON.stringify(body))
});
function fakeGoogle(remote) {
  const calls = [];
  return {
    calls,
    fetch: (url, o) => {
      if (url.includes('raw.githubusercontent.com'))
        return url.includes('Code.gs') ? resp(200, remote) : resp(200, '{"timeZone":"Asia/Manila"}');
      if (!url.includes('script.googleapis.com')) return null;
      const m = (o.method || 'get').toLowerCase(),
        p = url.replace(/^.*\/projects\/SCRIPT_ID/, '');
      calls.push(m + ' ' + p + (o.payload ? ' ' + o.payload.slice(0, 80) : ''));
      if (m === 'get' && p === '/content')
        return resp(200, {
          files: [
            {name: 'appsscript', type: 'JSON', source: '{}'},
            {name: 'Code', type: 'SERVER_JS', source: 'old'}
          ]
        });
      if (m === 'post' && p === '/versions') return resp(200, {versionNumber: 7});
      if (m === 'get' && p === '/deployments')
        return resp(200, {
          deployments: [
            {deploymentId: 'HEAD', deploymentConfig: {}},
            {deploymentId: 'WEB', deploymentConfig: {versionNumber: 6}, entryPoints: [{entryPointType: 'WEB_APP'}]}
          ]
        });
      return resp(200, {});
    }
  };
}
test('autoUpdate: same version on GitHub does nothing', () => {
  const g = fakeGoogle(CODE),
    s = loadCodeGs({fetch: g.fetch});
  assert.match(s.ctx.autoUpdate(), /^up to date/);
  assert.deepStrictEqual(g.calls, []);
});
test('autoUpdate: a higher version is installed and the web app deployment repointed', () => {
  const next = CODE.replace(/const VERSION = (\d+);/, (_, v) => `const VERSION = ${Number(v) + 1};`);
  const g = fakeGoogle(next),
    s = loadCodeGs({fetch: g.fetch});
  assert.match(s.ctx.autoUpdate(), /^deployed v/);
  assert.deepStrictEqual(
    g.calls.map(c => c.split(' ').slice(0, 2).join(' ')),
    ['get /content', 'put /content', 'post /versions', 'get /deployments', 'put /deployments/WEB']
  );
  assert.ok(g.calls[1].includes('"name":"appsscript"'));
  assert.ok(g.calls[4].includes('"versionNumber":7'));
  assert.match(String(s.sheets['Deploy log'].rows[1][1]), /^deployed v\d+ as version 7 \(1 web app deployment\)/);
});
test('autoUpdate: never installs a version that would stop the updates', () => {
  const next = CODE.replace(/const VERSION = (\d+);/, (_, v) => `const VERSION = ${Number(v) + 1};`).replace(
    /function autoUpdate\(/g,
    'function gone('
  );
  const g = fakeGoogle(next),
    s = loadCodeGs({fetch: g.fetch});
  assert.strictEqual(s.ctx.autoUpdate(), 'skipped');
  assert.deepStrictEqual(g.calls, []);
});

test('autoUpdate: an interrupted update (code in place, deploy failed) is finished on the next run', () => {
  const next = CODE.replace(/const VERSION = (\d+);/, (_, v) => `const VERSION = ${Number(v) + 1};`);
  // First run: the code goes in, then /versions fails.
  const g = fakeGoogle(next),
    f0 = g.fetch,
    s = loadCodeGs({fetch: (u, o) => (/\/versions$/.test(u) ? resp(503, 'unavailable') : f0(u, o))});
  assert.strictEqual(s.ctx.autoUpdate(), 'error');
  assert.ok(s.props.AUTO_PENDING, 'the pending version is remembered');
  // Next run, by the new code itself (same VERSION as GitHub): it finishes the deployment instead of saying "up to date".
  const g2 = fakeGoogle(CODE),
    s2 = loadCodeGs({fetch: g2.fetch});
  s2.props.AUTO_PENDING = s.props.AUTO_PENDING;
  assert.match(s2.ctx.autoUpdate(), /^deployed v/);
  assert.deepStrictEqual(
    g2.calls.map(c => c.split(' ').slice(0, 2).join(' ')),
    ['post /versions', 'get /deployments', 'put /deployments/WEB']
  );
  assert.strictEqual(s2.props.AUTO_PENDING, undefined);
});

// Anonymous answers (v12).
test('anonymous answers are logged under ~anon <id>, then move to the name at sign-in', () => {
  const s = loadCodeGs();
  assert.deepStrictEqual(s.post({anon: 'abc123xyz0', anonAnswers: [ans('z1'), ans('z2')]}), {ok: true, log: true, v: 15});
  assert.strictEqual(s.post({anon: 'Bad Id!', anonAnswers: [ans('z3')]}).error, 'input');
  assert.deepStrictEqual(
    s.sheets.Answers.rows.slice(1).map(r => r[0]),
    ['~anon abc123xyz0', '~anon abc123xyz0']
  );
  // An existing name with the wrong code moves nothing.
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: []});
  assert.strictEqual(s.post({name: 'Ana', pin: '9999', data: prog(9), summary: {}, answers: [], anon: 'abc123xyz0'}).error, 'pin');
  assert.deepStrictEqual(
    s.sheets.Answers.rows.slice(1).map(r => r[0]),
    ['~anon abc123xyz0', '~anon abc123xyz0']
  );
  const r = s.post({name: 'Ana', pin: '1234', data: prog(2), summary: {}, answers: [ans('z1'), ans('z2'), ans('z4')], anon: 'abc123xyz0'});
  assert.strictEqual(r.ok, true);
  const names = s.sheets.Answers.rows.slice(1).map(x => x[0]);
  assert.deepStrictEqual(names, ['Ana', 'Ana', 'Ana'], 'moved to the name, and the resent answers were not logged twice');
});

test('floods are capped: per anonymous id, and the first refusal goes to the Alerts tab', () => {
  const s = loadCodeGs(),
    many = n => Array.from({length: n}, (_, i) => ans('f' + Math.random().toString(36).slice(2, 8) + i));
  for (let i = 0; i < 6; i++) assert.strictEqual(s.post({anon: 'flooder001', anonAnswers: many(100)}).ok, true);
  assert.strictEqual(s.post({anon: 'flooder001', anonAnswers: many(10)}).error, 'busy');
  assert.strictEqual(s.post({anon: 'flooder001', anonAnswers: many(10)}).error, 'busy');
  assert.strictEqual(s.sheets.Alerts.rows.length, 2, 'one alert line (plus the header), not one per refusal');
  assert.match(String(s.sheets.Alerts.rows[1][1]), /limit reached: a:flooder001/);
  assert.strictEqual(s.post({anon: 'someoneelse', anonAnswers: many(5)}).ok, true, 'other players are not blocked');
});

test('new accounts are capped per 6 hours', () => {
  const s = loadCodeGs();
  for (let i = 0; i < 40; i++) assert.strictEqual(s.post({name: 'P' + i, pin: '1234', data: prog(1), summary: {}}).ok, true);
  assert.strictEqual(s.post({name: 'P40', pin: '1234', data: prog(1), summary: {}}).error, 'busy');
  assert.strictEqual(s.post({name: 'P1', pin: '1234', data: prog(2), summary: {}}).ok, true, 'existing accounts still sync');
});

test('anonymous answers also move to a brand-new account at its first sync', () => {
  const s = loadCodeGs();
  s.post({anon: 'newplayer1', anonAnswers: [ans('y1')]});
  assert.strictEqual(
    s.post({name: 'Ben', pin: '1111', data: prog(1), summary: {}, answers: [ans('y1'), ans('y2')], anon: 'newplayer1'}).ok,
    true
  );
  assert.deepStrictEqual(
    s.sheets.Answers.rows.slice(1).map(r => r[0]),
    ['Ben', 'Ben']
  );
});

// Public leaderboard (v14).
test('board: signed-in players by progress then level; opted-out players and their codes never shown', () => {
  const s = seed();
  s.post({name: 'Ana', pin: '1234', data: prog(3), summary: {learned: 2, seen: 3, total: 39, pct: 41.6, board: 1}, answers: [ans('a3')]});
  s.post({name: 'Ana B', pin: '5678', data: prog(2), summary: {learned: 1, seen: 1, total: 39, pct: 12, board: 0}, answers: []});
  s.post({name: 'Ben', pin: '1111', data: prog(1), summary: {pct: 41.6}, answers: [ans('c2')]});
  const b = s.get({board: '1'});
  assert.strictEqual(b.ok, true);
  assert.strictEqual(b.v, 15);
  assert.deepStrictEqual(b.rows.map(r => r[0]).sort(), ['Ana', 'Ben'], 'Ana B opted out');
  assert.ok(
    b.rows.every(r => r.length === 3 && r[1] === 42 && r[2] === null),
    'name, progress rounded, no level under 200 answers (v15): nothing else'
  );
  assert.ok(!JSON.stringify(b).match(/1234|1111|hash|imr-coral/), 'no code, hash or progress data');
  // An app that sends no board value (older) keeps the saved choice: Ana B stays off.
  s.post({name: 'Ana B', pin: '5678', data: prog(2), summary: {learned: 1, seen: 1, total: 39}, answers: [ans('b2')]});
  // Cached 5 minutes, then the opt-out is seen.
  s.post({name: 'Ben', pin: '1111', data: prog(1), summary: {pct: 41.6, board: 0}, answers: []});
  assert.strictEqual(s.get({board: '1'}).rows.length, 2, 'cached');
  Object.keys(s.cache).forEach(k => delete s.cache[k]);
  assert.deepStrictEqual(
    s.get({board: '1'}).rows.map(r => r[0]),
    ['Ana']
  );
});

test('board: a player saved before v14 ranks by learned / total until their next sync', () => {
  const s = seed();
  const ra = s.sheets.RAs;
  assert.ok(ra, 'RAs tab');
  // Simulate a v13 row: no Progress, no Board.
  const rows = ra.rows;
  const r = rows.find(x => x[0] === 'Ana');
  r[8] = '';
  r[9] = '';
  Object.keys(s.cache).forEach(k => delete s.cache[k]);
  const ana = s.get({board: '1'}).rows.find(x => x[0] === 'Ana');
  assert.strictEqual(ana[1], Math.round((100 * 1) / 39), 'learned 1 of 39');
});

test('board: the level shows from 200 answers; equal progress ranks by level', () => {
  const s = seed();
  const many = (p, n) => Array.from({length: n}, (_, i) => ans(p + i, {ok: i % 4 ? 1 : 0}));
  s.post({name: 'Ana', pin: '1234', data: prog(3), summary: {pct: 50}, answers: many('x', 200)});
  s.post({name: 'Ben', pin: '1111', data: prog(1), summary: {pct: 50}, answers: many('y', 120)});
  const b = s.get({board: '1'}).rows;
  const ana = b.find(r => r[0] === 'Ana'),
    ben = b.find(r => r[0] === 'Ben');
  assert.strictEqual(typeof ana[2], 'number', 'Ana: 202 answers');
  assert.strictEqual(ben[2], null, 'Ben: 122 answers, no level yet');
  assert.strictEqual(b[0][0], 'Ana', 'a level ranks above none at equal progress');
});

test('achs: how many signed-in players hold each achievement; counts only', () => {
  const s = loadCodeGs();
  const data = A => ({...prog(1), 'imr-coral-ach': JSON.stringify(A)});
  s.post({name: 'Ana', pin: '1234', data: data({met10: 1, run10: 2, _best: 12}), summary: {}, answers: []});
  s.post({name: 'Ben', pin: '1111', data: data({met10: 3}), summary: {}, answers: []});
  s.post({name: 'Cy', pin: '2222', data: prog(1), summary: {}, answers: []});
  const a = s.get({achs: '1'});
  assert.strictEqual(a.v, 15);
  assert.strictEqual(a.n, 2, 'players with a record');
  assert.deepStrictEqual(a.counts, {met10: 2, run10: 1}, 'no _ fields');
  assert.ok(!JSON.stringify(a).match(/Ana|Ben/), 'no names');
});
