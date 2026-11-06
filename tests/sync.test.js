// Sync script (tools/sync/Code.gs) against an in-memory sheet: node --test tests/
const block = require('./block.js'); // the block of a browser file a test runs, its markers checked
const test = require('node:test'),
  assert = require('node:assert');
const {loadCodeGs} = require('./gas.js');
// Every reply carries the script's VERSION as v: read from the script, so a version bump edits no test (a number
// pinned here collided between every pair of PRs that bump it).
const SV = Number(
  /const VERSION = (\d+);/.exec(require('fs').readFileSync(require('path').join(__dirname, '..', 'tools', 'sync', 'Code.gs'), 'utf8'))[1]
);

const prog = n => ({'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: n, ko: 0}})});
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
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}), {ok: true, found: false, v: SV});
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
  const data = {'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 1, ko: 0, ps}})};
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
  assert.deepStrictEqual(s.post({rname: 'Ana', rpin: '1234', reports: [rep('r1')]}), {ok: true, rep: true, v: SV});
  s.post({rname: 'Ana', rpin: '1234', reports: [rep('r1'), rep('r2', {why: 'multi', fix: ''})]});
  s.post({rname: 'Bob', rpin: '', reports: [rep('r3', {why: 'bogus'}), rep('r4', {why: 'photo', note: '=HYPERLINK("x")'})]});
  const R = s.sheets.Reports;
  assert.strictEqual(R.getLastRow(), 4, 'r1 once, r2, r4; r3 has no valid reason');
  assert.deepStrictEqual(R.getRange(2, 2, 1, 5).getValues()[0], ['Ana', 1, 'Wrong answer', 'Acropora', 'Montipora']);
  assert.deepStrictEqual(R.getRange(4, 2, 1, 2).getValues()[0], ['Bob', 0]);
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).data, prog(3), 'progress untouched');
  s.post({rname: 'Ana', rpin: '1234', reports: [rep('r5', {why: 'idea', g: '', a: '', fix: '', ph: '', m: 'page', w: 'idkey|form=M'})]});
  assert.deepStrictEqual(
    R.getRange(5, 4, 1, 8)
      .getValues()[0]
      .slice(0, 1)
      .concat(R.getRange(5, 9, 1, 3).getValues()[0]),
    ['Suggestion', 'page', '', 'idkey|form=M']
  );
});

test("v57: a load lists the ids of the player's own verified reports (Q66), never another's or an unverified one", () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(3), summary: {}});
  s.post({name: 'Bob', pin: '5678', data: prog(1), summary: {}});
  assert.ok(!('reps' in s.get({name: 'Ana', pin: '1234'})), 'none yet: no field');
  s.post({rname: 'Ana', rpin: '1234', reports: [rep('r1'), rep('r2', {why: 'photo'})]});
  s.post({rname: 'Ana', rpin: '', reports: [rep('r3')]}); // typed name, not verified
  s.post({rname: 'Bob', rpin: '5678', reports: [rep('r4')]});
  assert.deepStrictEqual(s.get({name: 'ana', pin: '1234'}).reps, ['r1', 'r2']);
  assert.deepStrictEqual(s.get({name: 'Bob', pin: '5678'}).reps, ['r4']);
  assert.strictEqual(s.get({name: 'Ana', pin: '0000'}).reps, undefined, 'a wrong code gets nothing');
});

test('v34: a save from an app that does not know a subject keeps that subject in the saved copy (Codex review #442)', () => {
  const s = loadCodeGs(),
    fish = {'reefid-sync-fish-progress': JSON.stringify({t01: {ok: 10, ko: 2}}), 'reefid-sync-fish-quiz': '{"c2":true}'};
  s.post({name: 'Ana', pin: '1234', data: {...prog(1), ...fish}, summary: {}});
  // An app from before fish saves its whole record, with no fish key: the fish keys stay.
  s.post({name: 'Ana', pin: '1234', data: prog(2), summary: {}});
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).data, {...prog(2), ...fish});
  // A fish-aware app's save is taken as it is: a reset fish progress is an empty record, kept as such.
  s.post({name: 'Ana', pin: '1234', data: {...prog(2), 'reefid-sync-fish-progress': '{}'}, summary: {}});
  assert.deepStrictEqual(JSON.parse(s.get({name: 'Ana', pin: '1234'}).data['reefid-sync-fish-progress']), {});
  // The corals' keys are never kept that way: the saving app owns them.
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}});
  assert.ok(!('reefid-sync-coral-progress' in s.get({name: 'Ana', pin: '1234'}).data));
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
  // v34: a fish report keeps its teaching ids and its photo (Codex review #442: the ids lost their digits).
  s.post({rname: 'Ana', rpin: '1234', reports: [rep('r3', {g: 't01', a: 't05', fix: '', ph: 'fi464458713'})]});
  const f = s.post({readReports: 1, token: 'ghp_write000000000000000000'}).rows.find(r => r[0] === 'r3');
  assert.deepStrictEqual([f[5], f[6], f[10]], ['t01', 't05', 'fi464458713']);
  // v46: a scientific-genus question's units (g:Platax) are kept too (Codex review #526: they were stored empty).
  s.post({rname: 'Ana', rpin: '1234', reports: [rep('r4', {g: 'g:Platax', a: 'g:Chromis', fix: '', ph: 'fi1'})]});
  const gq = s.post({readReports: 1, token: 'ghp_write000000000000000000'}).rows.find(r => r[0] === 'r4');
  assert.deepStrictEqual([gq[5], gq[6]], ['g:Platax', 'g:Chromis']);
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
  assert.strictEqual(r.v, SV);
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
  assert.deepStrictEqual(s.get({name: 'Ana B', pin: '5678'}), {ok: false, error: 'gone', into: 'Ana', v: SV});
  const w = s.post({name: 'Ana B', pin: '5678', data: prog(9), summary: {}, answers: [ans('b2')]});
  assert.strictEqual(w.error, 'gone');
  assert.strictEqual(w.log, true);
  assert.strictEqual(s.post({users: 1, token: TOK}).users.find(x => x.name === 'Ana').answers, 4);
  assert.strictEqual(s.sheets.RAs.getLastRow(), 3, 'no account re-created for Ana B');
  // Someone new may still take the name with another code.
  assert.strictEqual(s.post({name: 'Ana B', pin: '0000', data: prog(1), summary: {}}).ok, true);
});

test("v57: a name taken again after its account was deleted never gets the old account's reports (Codex review #581)", () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}});
  s.post({rname: 'Ana', rpin: '1234', reports: [rep('old1')]});
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).reps, ['old1']);
  assert.strictEqual(s.post({userDelete: 'Ana', token: TOK}).ok, true);
  // The deleted account's own device: 'gone', and never its reports (Pierre, 2026-11-05).
  const g = s.get({name: 'Ana', pin: '1234'});
  assert.deepStrictEqual([g.error, g.reps], ['gone', undefined]);
  s.post({name: 'Ana', pin: '9999', data: prog(1), summary: {}});
  assert.ok(!('reps' in s.get({name: 'Ana', pin: '9999'})), "the old account's report is not the new one's");
  s.post({rname: 'Ana', rpin: '9999', reports: [rep('new1', {t: new Date(Date.now() + 60000).toISOString()})]});
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '9999'}).reps, ['new1']);
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
  assert.deepStrictEqual(s.post({anon: 'abc123xyz0', anonAnswers: [ans('z1'), ans('z2')]}), {ok: true, log: true, v: SV});
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

test('v18: a device that never signed in rates the photos once its answers are clearly above chance', () => {
  const s = loadCodeGs(),
    at = i => new Date(Date.UTC(2026, 10, 1, 0, 0, i)).toISOString(),
    L = Array.from({length: 12}, (_, i) => ans('w' + i, {ph: 'pic-' + i, t: at(i)}));
  s.post({anon: 'device0001', anonAnswers: L.slice(0, 9)});
  assert.deepStrictEqual(s.get({stats: '1'}).photos['pic-0'], [0, 0, 0, 0], 'fewer than TRUST.N answers: no photo moved');
  s.post({anon: 'device0001', anonAnswers: L.slice(9)});
  for (const k of Object.keys(s.cache)) delete s.cache[k]; // stats are cached 10 minutes
  const p = s.get({stats: '1'}).photos['pic-11'];
  assert.ok(p && p[1] > 0 && p[0] < 0, 'without signing in, a real player rates the photos: ' + JSON.stringify(p));
  assert.strictEqual(p[3], 1, 'plain count beside the weighed one (v18): answered once, weighs under 1');
  // Random clicks (wrong every time here) stay out, signed in or not.
  const B = Array.from({length: 12}, (_, i) => ans('b' + i, {ph: 'bot-' + i, ok: 0, a: 'Porites', t: at(20 + i)}));
  s.post({anon: 'clicker001', anonAnswers: B});
  for (const k of Object.keys(s.cache)) delete s.cache[k];
  // v31: a photo nobody rated sits at its genus offset (moved by the real player's answers on the genus above).
  const st = s.get({stats: '1'});
  assert.deepStrictEqual(st.photos['bot-0'], [st.gd.Acropora[0], 0, 0, 0], 'answers at chance move nothing');
});

test('v17: one player whatever the capitalisation of the name (trust and history per photo)', () => {
  const s = loadCodeGs(),
    A = (i, ph) => ans('k' + i, {ph, t: new Date(Date.UTC(2026, 10, 1, 0, 0, i)).toISOString()});
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [0, 1, 2, 3, 4, 5].map(i => A(i, 'pic-' + i))});
  s.post({
    name: 'ana',
    pin: '1234',
    data: prog(2),
    summary: {},
    answers: [6, 7, 8, 9, 10, 11].map(i => A(i, i === 11 ? 'pic-0' : 'pic-' + i))
  });
  const P = s.get({stats: '1'}).photos;
  assert.ok(P['pic-10'][1] > 0, '12 right answers under Ana and ana make one trusted player (6 each would not)');
  assert.strictEqual(P['pic-0'][1], 0.5, 'one history per photo, whatever the spelling: weights 0 (answer 1) and 11/21 (answer 12)');
});

test('v17: every player starts as a beginner (PLAYER0 = -1), not an average player', () => {
  const s = loadCodeGs(),
    T = 'ghp_write000000000000000000';
  s.post({name: 'New', pin: '1234', data: prog(1), summary: {}, answers: [ans('b1', {ok: 0, a: 'Porites'})]});
  const ras = Object.values(s.post({readStats: 1, token: T}).ras);
  assert.strictEqual(ras.length, 1);
  assert.ok(ras[0][0] < -1 && ras[0][0] > -1.5, 'one miss from -1: ' + ras[0][0]);
});

test("v17 anonDelete: admin only, removes the answers of chosen anonymous ids, never a named player's", () => {
  const s = loadCodeGs(),
    T = {token: 'ghp_write000000000000000000'};
  s.post({anon: 'testrun001', anonAnswers: [ans('t1'), ans('t2')]});
  s.post({anon: 'realdev001', anonAnswers: [ans('r1')]});
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [ans('n1')]});
  const rows = s.post({readAnswers: 1, ...T}).rows,
    test = rows[0][0], // the first rows logged are the test run's
    named = rows.find(r => !r[11])[0];
  assert.deepStrictEqual(
    rows.map(r => r[11]),
    [1, 1, 1, 0]
  );
  assert.strictEqual(s.post({anonDelete: [test], token: 'nope'}).error, 'token');
  const r = s.post({anonDelete: [named, test], ...T});
  assert.deepStrictEqual([r.ok, r.answers], [true, 2]);
  assert.deepStrictEqual(
    s.sheets.Answers.rows.slice(1).map(x => x[0]),
    ['~anon realdev001', 'Ana'],
    "only the chosen anonymous id; a named player's answers are never deleted"
  );
});

test('v19 events: anonymous error reports and one-tap answers, logged once, capped, read by admins only', () => {
  const s = loadCodeGs(),
    ev = (id, x) => ({id, t: '2026-11-02T00:00:00Z', av: '159', ua: 'Chrome 140', ...x});
  assert.strictEqual(s.post({dev: 'Not An Id', events: [ev('e1', {k: 'err', msg: 'x'})]}).error, 'input');
  const r = s.post({
    dev: 'dev0000001',
    events: [
      ev('e1', {k: 'err', msg: '=HYPERLINK("x") TypeError: a is undefined', src: 'app.js:120', pg: 'quiz'}),
      ev('e2', {k: 'photo', f: 'acropora-wide-1', pg: 'quiz'}),
      ev('e3', {k: 'pulse', r: 'hard', m: 'quiz', n: 25, rr: 40, lv: -0.8, met: 7}),
      ev('e4', {k: 'nope', msg: 'unknown kind'})
    ]
  });
  assert.deepStrictEqual(r, {ok: true, ev: true, v: SV});
  s.post({dev: 'dev0000001', events: [ev('e1', {k: 'err', msg: 'again'})]});
  const E = s.sheets.Events;
  assert.strictEqual(E.getLastRow(), 4, 'three events, an unknown kind and a resent id are not logged');
  const row = E.getRange(2, 1, 1, 10).getValues()[0];
  assert.ok(!E.rows.flat().some(v => v && v.formula), 'never written as a formula');
  assert.ok(String(row[3]).includes('TypeError'));
  assert.strictEqual(row[1], 'dev0000001');
  assert.deepStrictEqual(JSON.parse(E.getRange(4, 7).getValue()), {r: 'hard', m: 'quiz', n: 25, rr: 40, lv: -0.8, met: 7});
  assert.strictEqual(s.post({readEvents: 1}).error, 'token');
  const a = s.post({readEvents: 1, token: 'ghp_write000000000000000000'});
  assert.deepStrictEqual(
    a.rows.map(x => [x[0], x[3]]),
    [
      ['e3', 'pulse'],
      ['e2', 'photo'],
      ['e1', 'err']
    ],
    'newest first'
  );
  // Caps: 200 per device every 6 hours.
  const many = n => Array.from({length: n}, (_, i) => ev('m' + i + 'x' + n, {k: 'err', msg: 'm'}));
  for (let i = 0; i < 4; i++) assert.strictEqual(s.post({dev: 'flood00001', events: many(50)}).ok, true);
  assert.strictEqual(s.post({dev: 'flood00001', events: many(1)}).error, 'busy');
});

// The one-tap question's bank (2026-11-03, core.js PULSEQ) needs no new sheet version: the item id rides in src (Where
// column) and the answer's code in r (Message column), both kept as text since v19; Detail keeps r only for easy / ok /
// hard, as before. What the admin reads back (readEvents) is what the app sent, for every item and code of the bank.
test('v19 events carry the one-tap bank: item id in Where, answer code in Message, as they came', () => {
  const {PULSEQ, PULSE_SHOWN, PULSE_SKIP, PULSE_NONE, pulseScore} = require('../core.js'),
    s = loadCodeGs(),
    // Every answer of every item, and each item's prompt events (shown, Not now, moved on without a tap: 2026-11-03).
    sent = PULSEQ.flatMap(it => [...it.a.map(([r]) => r), PULSE_SHOWN, PULSE_SKIP, PULSE_NONE].map(r => ({q: it.id, r}))),
    events = sent.map((x, i) => ({
      id: 'p' + i,
      t: '2026-11-03T00:00:00Z',
      k: 'pulse',
      r: x.r,
      src: x.q,
      m: i % 2 ? 'quiz-duel' : 'quiz',
      n: 20,
      rr: 70,
      lv: 0.3,
      met: 12,
      av: '200',
      ua: 'Chrome 141'
    }));
  assert.strictEqual(s.post({dev: 'dev0000009', events}).ok, true);
  const rows = s
    .post({readEvents: 1, token: 'ghp_write000000000000000000'})
    .rows.reverse()
    .filter(x => x[3] === 'pulse');
  assert.deepStrictEqual(
    rows.map(x => ({q: x[5], r: x[4]})),
    sent,
    'item and code read back as sent'
  );
  rows.forEach((x, i) => {
    const d = JSON.parse(x[7]);
    assert.strictEqual(d.r, ['easy', 'ok', 'hard'].includes(sent[i].r) ? sent[i].r : '');
    assert.strictEqual(d.m, i % 2 ? 'quiz-duel' : 'quiz');
    assert.strictEqual(d.lv, 0.3);
    const sc = pulseScore(x[5], x[4]);
    if ([PULSE_SHOWN, PULSE_SKIP, PULSE_NONE].includes(x[4])) assert.deepStrictEqual(sc, {d: null, f: null}, 'no answer');
    else assert.ok(sc.d !== null || sc.f !== null, 'scored by the admin');
  });
});

test('v21 load events: load times, the line and the CDN server, nothing else kept', () => {
  const s = loadCodeGs();
  s.post({
    dev: 'dev0000002',
    events: [
      {
        id: 'l1',
        t: '2026-11-02T00:00:00Z',
        k: 'load',
        pg: 'quiz',
        av: '170',
        ua: 'Chrome 140 mobile',
        pop: 'cache-mnl9725-MNL',
        p0: 'home',
        t0: 21.4,
        qo: 30.2,
        q1: 40.5,
        nx: 'quiz',
        bps: 86,
        kb: 512,
        sw: 0,
        sv: 1,
        th: 'light',
        w: 390,
        st: 1,
        extra: 'dropped'
      },
      {id: 'l2', k: 'load', pop: '=cmd()', p0: '=1+1', th: 'pink', t0: 99999}
    ]
  });
  const E = s.sheets.Events;
  assert.strictEqual(E.getRange(2, 4).getValue(), 'cache-mnl9725-MNL');
  assert.deepStrictEqual(JSON.parse(E.getRange(2, 7).getValue()), {
    p0: 'home',
    t0: 21.4,
    qo: 30.2,
    q1: 40.5,
    nx: 'quiz',
    bps: 86,
    kb: 512,
    sw: 0,
    sv: 1,
    th: 'light',
    w: 390,
    st: 1
  });
  assert.strictEqual(E.getRange(3, 4).getValue(), '', 'a server name that is not one is dropped');
  const d = JSON.parse(E.getRange(3, 7).getValue());
  assert.strictEqual(d.p0, '');
  assert.strictEqual(d.th, '');
  assert.strictEqual(d.t0, 3600);
});

test("v30 pages events: cleaned, in their own tab, under the admin's id of the player (never the name)", () => {
  const s = loadCodeGs(),
    T = 'ghp_write000000000000000000',
    pg = (id, x = {}) => ({
      id,
      t: '2026-11-03T10:00:00Z',
      k: 'pages',
      pg: 'quiz',
      av: '190',
      ua: 'Chrome 140 mobile',
      vi: 'visit0001',
      na: 42,
      r: {home: [1, 5], quiz: [2, 300], genus: [2, 40]},
      g: {Acropora: [1, 30, 'quiz', 1], Porites: [1, 10, 'learn', 0]},
      ...x
    });
  // A device not signed in, with answers logged under "~anon devanon001", and a signed-in player Ana.
  s.post({anon: 'devanon001', anonAnswers: [ans('x1')], av: '190'});
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [ans('y1')], av: '190'});
  const A = s.post({readAnswers: 1, token: T}).rows,
    anonAid = A.find(r => r[11] === 1)[0],
    anaAid = s.post({users: 1, token: T}).users.find(u => u.name === 'Ana').id;
  // Anonymous: its answer id becomes the admin's id of its answers.
  const r1 = s.post({
    dev: 'dev0000009',
    eanon: 'devanon001',
    events: [pg('p1', {note: '=cmd()', f: 'https://x/y.jpg'}), {id: 'e1', k: 'err', msg: 'boom'}]
  });
  assert.deepStrictEqual(r1, {ok: true, ev: true, v: SV});
  // Signed in: the name and code, checked; a wrong code, an unknown name or a bad id: no id, still logged.
  s.post({dev: 'dev0000009', ename: 'ana', epin: '1234', events: [pg('p2')]});
  s.post({dev: 'dev0000009', ename: 'Ana', epin: '9999', events: [pg('p3')]});
  s.post({dev: 'dev0000009', ename: 'Nobody', epin: '1234', events: [pg('p4')]});
  s.post({dev: 'dev0000009', eanon: 'NOT AN ID', events: [pg('p5')]});
  s.post({dev: 'dev0000009', events: [pg('p6')]});
  s.post({dev: 'dev0000009', eanon: 'devanon001', events: [pg('p1')]}); // sent again: skipped
  const PG = s.sheets.Pages,
    rows = PG.rows.slice(1);
  assert.deepStrictEqual(
    rows.map(r => [r[9], r[2], r[3]]),
    [
      ['p1', 'pages', anonAid],
      ['p2', 'pages', anaAid],
      ['p3', 'pages', ''],
      ['p4', 'pages', ''],
      ['p5', 'pages', ''],
      ['p6', 'pages', '']
    ]
  );
  assert.ok(anonAid && anaAid && anonAid !== anaAid);
  assert.ok(!PG.rows.flat().some(v => /ana|devanon001|1234/i.test(String(v))), 'neither the name, the code nor the raw answer id is kept');
  assert.deepStrictEqual(JSON.parse(rows[0][6]), {
    r: {home: [1, 5], quiz: [2, 300], genus: [2, 40]},
    g: {Acropora: [1, 30, 'quiz', 1], Porites: [1, 10, 'learn', 0]},
    vi: 'visit0001',
    na: 42
  });
  assert.strictEqual(s.post({dev: 'dev0000009', ename: 'Ana', epin: '1234', events: [{id: 'e2', k: 'err', msg: 'x'}]}).ok, true);
  assert.strictEqual(s.sheets.RAs.rows.length, 2, 'an event never creates an account');
  // The other events stay in Events; a wrong code in an event never throttles the player's own sign-in.
  assert.deepStrictEqual(
    s.sheets.Events.rows.slice(1).map(r => [r[9], r[2]]),
    [
      ['e1', 'err'],
      ['e2', 'err']
    ]
  );
  for (let i = 0; i < 6; i++) s.post({dev: 'dev0000009', ename: 'Ana', epin: '000' + i, events: [pg('q' + i)]});
  assert.strictEqual(s.get({name: 'Ana', pin: '1234', av: '190'}).ok, true);
  // Read by admins: readEvents as before (Events), pages: 1 for the Pages tab, newest first.
  assert.strictEqual(s.post({readEvents: 1, pages: 1}).error, 'token');
  assert.deepStrictEqual(
    s.post({readEvents: 1, token: T}).rows.map(r => r[0]),
    ['e2', 'e1']
  );
  const P = s.post({readEvents: 1, pages: 1, token: T}).rows;
  assert.strictEqual(P.length, 12);
  assert.deepStrictEqual(P[P.length - 1].slice(0, 5), ['p1', Date.parse('2026-11-03T10:00:00Z'), 'dev0000009', 'pages', anonAid]);
});

test("v30 pages events follow the player's answers: sign-in claim, rename, merge, delete, anonDelete (Codex review #423)", () => {
  const s = loadCodeGs(),
    T = 'ghp_write000000000000000000',
    pg = id => ({id, t: '2026-11-03T10:00:00Z', k: 'pages', vi: 'v' + id, na: 1, r: {genus: [1, 5]}, g: {Acropora: [1, 5, 'quiz', 1]}}),
    ids = () => s.sheets.Pages.rows.slice(1).map(r => [r[9], r[3]]),
    aidOf = w => vm.runInContext(`aid_(${JSON.stringify(w)})`, s.ctx),
    users = () => s.post({users: 1, token: T}).users,
    answerIds = () => new Set(s.post({readAnswers: 1, token: T}).rows.map(r => r[0]));
  // Played anonymously (answers and two sheets opened), then signed in as Ana: the answers move to Ana, the sheets too.
  s.post({anon: 'devanon002', anonAnswers: [ans('a1')], av: '190'});
  s.post({dev: 'dev0000011', eanon: 'devanon002', events: [pg('p1'), pg('p2')]});
  s.post({anon: 'devanon003', anonAnswers: [ans('a2')], av: '190'});
  s.post({dev: 'dev0000012', eanon: 'devanon003', events: [pg('p3')]});
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [], anon: 'devanon002', av: '190'});
  const ana = users().find(u => u.name === 'Ana').id;
  assert.deepStrictEqual(
    ids(),
    [
      ['p1', ana],
      ['p2', ana],
      ['p3', aidOf('~anon devanon003')]
    ],
    "the claimed device's sheets join the account, another device's stay apart"
  );
  assert.ok(answerIds().has(ana));
  // Merged into Ben: Ben's now.
  s.post({name: 'Ben', pin: '4321', data: prog(1), summary: {}, answers: [ans('b1')], av: '190'});
  const ben = users().find(u => u.name === 'Ben').id;
  assert.strictEqual(s.post({userMerge: {from: 'Ana', into: 'Ben', data: prog(2)}, token: T}).ok, true);
  assert.deepStrictEqual(ids().slice(0, 2), [
    ['p1', ben],
    ['p2', ben]
  ]);
  // Archived (v58): the archive keeps them.
  assert.strictEqual(s.post({userArchive: {from: 'Ben', into: 'Ben-old'}, token: T}).ok, true);
  const arch = s.post({users: 1, token: T}).archived.find(u => u.name === 'Ben-old').id;
  assert.deepStrictEqual(ids().slice(0, 2), [
    ['p1', arch],
    ['p2', arch]
  ]);
  // Deleted with the answers kept (v55, Pierre Q88): the answers stay under the "~deleted" id, the sheets opened go.
  assert.strictEqual(s.post({userDelete: 'Ben-old', answers: false, token: T}).ok, true);
  const del = aidOf('~deleted ' + arch);
  assert.deepStrictEqual(ids(), [['p3', aidOf('~anon devanon003')]]);
  assert.ok(answerIds().has(del));
  s.post({name: 'Dee', pin: '2222', data: prog(1), summary: {}, answers: [ans('d1')], av: '190'});
  s.post({dev: 'dev0000014', ename: 'Dee', epin: '2222', events: [pg('p5')]});
  const dee = users().find(u => u.name === 'Dee').id;
  assert.strictEqual(s.post({anonDelete: [del, aidOf('~anon devanon003'), dee], token: T}).ok, true);
  assert.deepStrictEqual(ids(), [['p5', dee]], "a named player's sheets are never deleted by anonDelete");
  s.post({userDelete: 'Dee', answers: true, token: T});
  // Deleted with the answers: the sheets go too.
  s.post({name: 'Cid', pin: '1111', data: prog(1), summary: {}, answers: [ans('c1')], av: '190'});
  s.post({dev: 'dev0000013', ename: 'Cid', epin: '1111', events: [pg('p4')]});
  assert.strictEqual(ids().length, 1);
  assert.strictEqual(s.post({userDelete: 'Cid', answers: true, token: T}).ok, true);
  assert.deepStrictEqual(ids(), []);
});

test('v30 pages events: an app before v30 sends none, and its other events are logged as before', () => {
  const s = loadCodeGs();
  // An app before 2026-11-03's events (no av, no player id) and an unknown kind.
  const r = s.post({
    dev: 'dev0000010',
    events: [
      {id: 'o1', k: 'err', msg: 'x'},
      {id: 'o2', k: 'later', msg: 'y'}
    ]
  });
  assert.deepStrictEqual(r, {ok: true, ev: true, v: SV});
  assert.deepStrictEqual(
    s.sheets.Events.rows.slice(1).map(x => x[9]),
    ['o1']
  );
  assert.strictEqual(s.sheets.Pages, undefined, 'no Pages tab until a pages event arrives');
  assert.deepStrictEqual(s.post({readEvents: 1, pages: 1, token: 'ghp_write000000000000000000'}).rows, []);
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
  assert.strictEqual(b.v, SV);
  assert.deepStrictEqual(b.rows.map(r => r[0]).sort(), ['Ana', 'Ben'], 'Ana B opted out');
  assert.ok(
    b.rows.every(r => r.length === 3 && r[1] === 42 && r[2] === null),
    'name, progress rounded, no level under 200 answers (v15): nothing else'
  );
  assert.ok(!JSON.stringify(b).match(/1234|1111|hash|reefid-sync/), 'no code, hash or progress data');
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

test('board (v20): an admin hides a player from the leaderboard; their own syncs never bring them back', () => {
  const s = seed();
  s.post({name: 'Ana', pin: '1234', data: prog(3), summary: {pct: 41.6, board: 1}, answers: [ans('a3')]});
  s.post({name: 'Ben', pin: '1111', data: prog(1), summary: {pct: 30, board: 1}, answers: [ans('c2')]});
  const ben = () => s.get({board: '1'}).rows.some(r => r[0] === 'Ben');
  assert.ok(ben());
  assert.strictEqual(s.post({userBoard: 'Ben', hide: true}).error, 'token', 'admin only');
  assert.strictEqual(s.post({userBoard: 'Nobody', hide: true, token: TOK}).error, 'user');
  assert.deepStrictEqual(s.post({userBoard: 'ben', hide: true, token: TOK}), {ok: true, board: -1, v: SV});
  assert.ok(!ben(), 'hidden at once (cache cleared)');
  assert.ok(
    s.get({board: '1'}).rows.some(r => r[0] === 'Ana'),
    'the others stay'
  );
  // Ben's app keeps sending board: 1 (his own setting): he stays hidden.
  s.post({name: 'Ben', pin: '1111', data: prog(2), summary: {pct: 35, board: 1}, answers: [ans('c3')]});
  Object.keys(s.cache).forEach(k => delete s.cache[k]);
  assert.ok(!ben(), 'still hidden after his own sync');
  assert.strictEqual(s.post({users: 1, token: TOK}).users.find(u => u.name === 'Ben').board, -1, 'the admin list says so');
  assert.deepStrictEqual(s.post({userBoard: 'Ben', hide: false, token: TOK}), {ok: true, board: 1, v: SV});
  assert.ok(ben(), 'shown again');
});

// v48: beta groups (Pierre, 2026-11-04: fish opens to a group he picks in the admin, not one site-wide switch).
test("groups (v48): the admin adds and removes players of a beta subject's group; the replies carry each player's", () => {
  const s = seed();
  const groups = (n, pin) => s.get({name: n, pin}).groups;
  assert.deepStrictEqual(groups('Ana', '1234'), [], 'in no group: [] (the app closes the beta subject)');
  assert.strictEqual(s.post({userGroup: 'Ana', group: 'fish', on: true}).error, 'token', 'admin only');
  assert.strictEqual(s.post({userGroup: 'Ana', group: 'coral', on: true, token: TOK}).error, 'group', 'a subject in beta only');
  assert.strictEqual(s.post({userGroup: 'Nobody', group: 'fish', on: true, token: TOK}).error, 'user');
  assert.deepStrictEqual(s.post({userGroup: 'ana', group: 'fish', on: true, token: TOK}), {
    ok: true,
    group: 'fish',
    n: 1,
    members: 1,
    v: SV
  });
  assert.strictEqual(s.post({userGroup: 'Ana', group: 'fish', on: true, token: TOK}).n, 0, 'once');
  assert.deepStrictEqual(groups('Ana', '1234'), ['fish'], 'the load reply');
  assert.deepStrictEqual(s.post({name: 'Ana', pin: '1234', data: prog(4), summary: {}, answers: []}).groups, ['fish'], 'the save reply');
  assert.deepStrictEqual(groups('Ben', '1111'), [], 'the others not');
  assert.strictEqual(s.get({name: 'Ana', pin: '9999'}).groups, undefined, 'never with a wrong code');
  // Everyone at once (a list): unknown names skipped, members counted once.
  const all = s.post({userGroup: ['Ana', 'Ana B', 'Ben', 'Nobody', 'ben'], group: 'fish', on: true, token: TOK});
  assert.deepStrictEqual([all.n, all.members], [2, 3]);
  const list = s.post({users: 1, token: TOK}).users;
  assert.deepStrictEqual(
    Object.fromEntries(list.map(u => [u.name, u.groups])),
    {Ana: ['fish'], 'Ana B': ['fish'], Ben: ['fish']},
    'the admin list'
  );
  assert.deepStrictEqual([...s.sheets.Groups.rows[0]], ['Group', 'Name', 'Added']);
  // Out again.
  assert.strictEqual(s.post({userGroup: 'Ben', group: 'fish', on: false, token: TOK}).n, 1);
  assert.deepStrictEqual(groups('Ben', '1111'), []);
  // A merge carries the memberships; an archive (v58) and a delete remove them.
  assert.strictEqual(s.post({userArchive: {from: 'Ana', into: 'Ana-test'}, token: TOK}).ok, true);
  assert.ok(!s.sheets.Groups.rows.some(r => /^Ana(-test)?$/.test(r[1])), 'archived: in no group');
  const m = s.post({userMerge: {from: 'Ana B', into: 'Ben', data: prog(2)}, token: TOK});
  assert.strictEqual(m.ok, true);
  assert.deepStrictEqual(groups('Ben', '1111'), ['fish'], "the merged name's group joins the kept name's");
  assert.ok(!s.sheets.Groups.rows.some(r => r[1] === 'Ana B'), 'the merged name leaves the tab');
  assert.strictEqual(s.post({userDelete: 'Ben', token: TOK}).ok, true);
  assert.ok(!s.sheets.Groups.rows.some(r => r[1] === 'Ben'), 'deleted: out of the group');
  assert.strictEqual(s.post({userGroup: ['Ana-test'], group: 'fish', on: true, token: TOK}).members, 0, 'an archive is never added');
});

// v53: the groups follow SUBJECTS open: 'group' (core.js subjGroup), not the beta label: a subject that opens to all has no
// group (its rows kept in the tab, read again once it is back to 'group').
test("groups (v53): a subject that opens to all has no group, whatever its beta label; back to 'group', its rows count again", () => {
  const s = seed();
  assert.strictEqual(s.post({userGroup: 'Ana', group: 'fish', on: true, token: TOK}).n, 1);
  const open = v => require('vm').runInContext(`CORE_.SUBJECTS.find(S => S.id === 'fish').open = ${JSON.stringify(v)}`, s.ctx);
  open('all');
  assert.ok(require('vm').runInContext("!!CORE_.SUBJECTS.find(S => S.id === 'fish').beta", s.ctx), 'the beta label kept');
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).groups, [], 'no group for a subject open to all');
  assert.strictEqual(s.post({userGroup: 'Ben', group: 'fish', on: true, token: TOK}).error, 'group');
  assert.ok(
    s.sheets.Groups.rows.some(r => r[1] === 'Ana'),
    'the rows stay in the tab'
  );
  open('group');
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).groups, ['fish'], 'back to the group: the same members');
});

test('archive (v58, was rename v20): the record moves to the archive name, out of the leaderboard; the old name starts over', () => {
  const s = seed();
  s.post({name: 'Ana', pin: '1234', data: prog(3), summary: {pct: 41.6, board: 1}, answers: [ans('r1'), ans('r2')]});
  s.post({rname: 'Ana', rpin: '1234', reports: [rep('rr1')]});
  const before = s.sheets.Answers.rows.filter(r => r[0] === 'Ana').length;
  assert.strictEqual(s.post({userArchive: {from: 'Ana', into: 'Ana-test'}}).error, 'token', 'admin only');
  assert.strictEqual(s.post({userArchive: {from: 'Ana', into: 'Ben'}, token: TOK}).error, 'exists');
  const r = s.post({userArchive: {from: 'ana', into: 'Ana-test'}, token: TOK});
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.answers, before);
  assert.strictEqual(s.sheets.Answers.rows.filter(x => x[0] === 'Ana').length, 0, 'no answer left under the old name');
  assert.strictEqual(s.sheets.Reports.rows.filter(x => x[1] === 'Ana-test').length, 1, 'the report follows');
  // The renamed record keeps its progress (an archive, read in the admin: the code hash is tied to the name, so the app
  // does not open it); it is off the leaderboard.
  const old = s.post({userData: 'Ana-test', token: TOK});
  assert.deepStrictEqual(old.data, prog(3));
  Object.keys(s.cache).forEach(k => delete s.cache[k]);
  assert.ok(!s.get({board: '1'}).rows.some(x => x[0] === 'Ana-test'));
  // "Ana" is free: signing in again under it (after signing out on the device) starts an empty account.
  assert.strictEqual(s.get({name: 'Ana', pin: '1234'}).found, false);
  assert.strictEqual(s.post({name: 'Ana', pin: '1234', data: {}, summary: {board: 1}, answers: []}).ok, true);
  const L = s.post({users: 1, token: TOK});
  assert.ok(!L.users.some(u => u.name === 'Ana-test'), 'an archive is not a player');
  assert.deepStrictEqual(
    L.archived.map(a => [a.name, a.answers, a.reports]),
    [['Ana-test', before, 1]]
  );
});

test('archive (v58): names merged into the archived player follow it to the archive', () => {
  const s = seed();
  s.post({name: 'Alias', pin: '4321', data: prog(1), summary: {}, answers: [ans('al1')]});
  const al = s.post({userData: 'Alias', token: TOK}),
    an = s.post({userData: 'Ana', token: TOK});
  assert.strictEqual(s.post({userMerge: {from: 'Alias', into: 'Ana', data: {...an.data}, at: an.rev}, token: TOK}).ok, true, al.ok);
  assert.strictEqual(s.post({userArchive: {from: 'Ana', into: 'Ana-test'}, token: TOK}).ok, true);
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: []}); // Ana starts over
  // A device still signed in as Alias: told it is gone, into the archive, and its answers land there.
  assert.strictEqual(s.get({name: 'Alias', pin: '4321'}).into, 'Ana-test');
  s.post({name: 'Alias', pin: '4321', data: prog(1), summary: {}, answers: [ans('al2')]});
  assert.ok(!s.sheets.Answers.rows.some(r => r[0] === 'Ana' && r[7] === 'al2'), 'never into the new Ana');
  assert.ok(
    s.sheets.Answers.rows.some(r => r[0] === 'Ana-test' && r[7] === 'al2'),
    'into the archive'
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
  const data = A => ({...prog(1), 'reefid-sync-ach': JSON.stringify(A)});
  s.post({name: 'Ana', pin: '1234', data: data({met10: 1, run10: 2, _best: 12}), summary: {}, answers: []});
  s.post({name: 'Ben', pin: '1111', data: data({met10: 3}), summary: {}, answers: []});
  s.post({name: 'Cy', pin: '2222', data: prog(1), summary: {}, answers: []});
  const a = s.get({achs: '1'});
  assert.strictEqual(a.v, SV);
  assert.strictEqual(a.n, 2, 'players with a record');
  assert.deepStrictEqual(a.counts, {met10: 2, run10: 1}, 'no _ fields');
  assert.ok(!JSON.stringify(a).match(/Ana|Ben/), 'no names');
});

test('board (v16): the % is computed from the saved progress with the app formula, the same as core.js pctOf', () => {
  const {pctOf} = require('../core.js');
  const s = loadCodeGs();
  const genera = {Acropora: 'mid', Porites: 'ok', Favites: 'new', Galaxea: 'mid'};
  const P = {
    Acropora: {ok: 8, ko: 2, pg: 0.5},
    Porites: {ok: 20, ko: 1, pg: 0.7, mx: 1},
    Galaxea: {ok: 12, ko: 1, pg: 0.82, ex: {k: 2, v: ['wide'], at: 30}},
    Millepora: {ok: 3, ko: 0, pg: 0.7},
    '~level': {ok: 40, ko: 4, th: 1}
  };
  // The app sent 5%: the sheet's own computation wins.
  s.post({
    name: 'Ana',
    pin: '1234',
    data: {'reefid-sync-coral-progress': JSON.stringify(P)},
    summary: {pct: 5, genera},
    answers: [ans('p1')]
  });
  const want = pctOf(P, Object.keys(genera));
  assert.ok(want > 5);
  assert.strictEqual(s.get({board: '1'}).rows.find(r => r[0] === 'Ana')[1], want);
  // Progress saved before s.pg (BKT's L, or only recent results; learned or not) is recomputed the same way (pgOf).
  const Q = {
    Acropora: {ok: 5, ko: 1, h: '1101111', L: 0.9},
    Porites: {ok: 9, ko: 0, h: '111111111', L: 0.99, mx: 1},
    Galaxea: {ok: 2, ko: 0, h: '11'}
  };
  s.post({name: 'Ben', pin: '1111', data: {'reefid-sync-coral-progress': JSON.stringify(Q)}, summary: {genera}, answers: [ans('q1')]});
  Object.keys(s.cache).forEach(k => delete s.cache[k]);
  assert.strictEqual(s.get({board: '1'}).rows.find(r => r[0] === 'Ben')[1], pctOf(Q, Object.keys(genera)));
});

// model.js's opening hold (INTRO, holdNext, holdStep, holdSync) run in Node on a stub store: the app's own code.
function modelHold(saved = {}) {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'model.js'), 'utf8'),
    intro = /const INTRO = \{[\s\S]*?\n\};\n/.exec(src)[0],
    hold = block(src, 'const HOLDK = ', 'const introSince');
  // The corals' keys (app.js sKey / sDev for the current subject).
  const ctx = {
    store: {get: (k, d) => (k in saved ? saved[k] : d), set: (k, v) => (saved[k] = v)},
    sKey: n => 'reefid-sync-coral-' + n,
    sDev: n => 'reefid-' + n,
    startVars: require('../core.js').startVars, // INTRO.OFFER.AT (core.js CHOICE)
    CHOICE: require('../core.js').CHOICE // INTRO.OFFER.MET (CHOICE.MET)
  };
  require('vm').createContext(ctx);
  require('vm').runInContext(intro + hold + '\nthis.step = holdStep; this.sync = holdSync; this.now = () => HOLDS;', ctx);
  return ctx;
}

test('v23 hold: the sheet replays the opening hold of model.js over the answers in time order, gentle restart left out', () => {
  const s = loadCodeGs(),
    m = modelHold();
  // A run of misses, a recovery, warm answers (|w, never counted), an older row without expected success, an answer
  // logged later than its neighbours, all sent out of order in two batches.
  const R = [1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1];
  const L = R.map((ok, i) => {
    const warm = i >= 12 && i < 16;
    return ans('h' + i, {
      t: new Date(Date.UTC(2026, 10, 1, 8, 0, i === 7 ? 40 : i)).toISOString(),
      ok,
      a: ok ? 'Acropora' : 'Porites',
      m: warm ? 'quiz|w' + (i % 2 ? '|k2' : '') : i % 5 === 4 ? 'quiz|k2' : 'quiz',
      ...(i === 3 ? {} : {e: Math.round((0.55 + ((i * 37) % 41) / 100) * 100) / 100})
    });
  });
  const byTime = L.slice().sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
  byTime.forEach(a => !/\|w/.test(a.m) && m.step(a.e, a.ok));
  const want = m.now();
  assert.ok(want >= 1.5, 'the sequence ends on a hold, so the test means something: ' + want);
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: L.slice(15)});
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: L.slice(0, 15)});
  assert.strictEqual(s.get({name: 'Ana', pin: '1234'}).hold, want);
  // Cached until the player's next answers; their next answer changes it.
  assert.ok('hold:ana' in s.cache);
  s.post({
    name: 'Ana',
    pin: '1234',
    data: prog(1),
    summary: {},
    answers: [ans('h99', {t: '2026-11-01T09:00:00Z', ok: 0, a: 'Porites', e: 0.9})]
  });
  m.step(0.9, 0);
  assert.strictEqual(s.get({name: 'ana', pin: '1234'}).hold, m.now());
  // Another player's answers never count: a player without answers has no hold.
  s.post({name: 'Ben', pin: '1111', data: prog(1), summary: {}, answers: []});
  assert.strictEqual(s.get({name: 'Ben', pin: '1111'}).hold, 0);
  // Only the answers since the last progress reset count (reefid-sync-coral-reset: the app's reset starts the hold over).
  s.post({
    name: 'Ana',
    pin: '1234',
    data: {...prog(0), 'reefid-sync-coral-reset': JSON.stringify('2026-11-01T08:00:20Z')},
    summary: {},
    answers: []
  });
  const m2 = modelHold();
  byTime.filter(a => a.t > '2026-11-01T08:00:20Z' && !/\|w/.test(a.m)).forEach(a => m2.step(a.e, a.ok));
  m2.step(0.9, 0);
  assert.strictEqual(s.get({name: 'Ana', pin: '1234'}).hold, m2.now());
});

test("v23 hold: the sheet's sum plus the unconfirmed answers is the hold on every device (model.js holdSync)", () => {
  const all = [0.8, 0.9, 0.7, 0.85, 0.6, 0.9].map((e, i) => ({
      id: 'u' + i,
      t: `2026-11-01T08:00:0${i}Z`,
      e,
      ok: i % 3 === 2 ? 1 : 0,
      m: 'quiz'
    })),
    one = modelHold();
  all.forEach(a => one.step(a.e, a.ok));
  // The sheet has the first four; the last two wait in the device's log: the result is the sum over all six.
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: all.slice(0, 4).map(a => ans(a.id, a))});
  const h = s.get({name: 'Ana', pin: '1234'}).hold,
    saved = {'reefid-hold': 0},
    dev = modelHold(saved);
  dev.sync(h, all.slice(4));
  assert.strictEqual(dev.now(), one.now());
  assert.strictEqual(saved['reefid-hold'], one.now(), 'saved on the device');
  // A device held by answers paid back on another device follows the sheet (the same answers everywhere); a warm
  // answer, or one from before the reset, in the log is not added; an older sheet (no hold) changes nothing.
  const hi = modelHold({'reefid-hold': 9});
  hi.sync(0, []);
  assert.strictEqual(hi.now(), 0);
  const w = modelHold({'reefid-sync-coral-reset': '2026-11-01T08:00:04Z'});
  w.sync(1, [
    {t: '2026-11-01T08:00:03Z', e: 0.9, ok: 0, m: 'quiz'},
    {t: '2026-11-01T08:00:05Z', e: 0.9, ok: 0, m: 'quiz|w|k2'},
    {t: '2026-11-01T08:00:06Z', e: 0.9, ok: 0, m: 'quiz'}
  ]);
  assert.strictEqual(w.now(), 1.8);
  // A comeback answer after a break (|c, since the comeback replaced the gentle restart) counts, with its own e, on the
  // device and on the sheet (hold_ leaves out |w only).
  const c = modelHold();
  c.sync(0, [{t: '2026-11-01T08:00:07Z', e: 0.62, ok: 0, m: 'quiz|c|k2'}]);
  assert.strictEqual(c.now(), 0.52);
  const sc = loadCodeGs();
  sc.post({name: 'Cy', pin: '1234', data: prog(1), summary: {}, answers: [ans('c1', {e: 0.62, ok: 0, m: 'quiz|c|k2'})]});
  assert.strictEqual(sc.get({name: 'Cy', pin: '1234'}).hold, 0.52);
  const old = modelHold({'reefid-hold': 0.5});
  old.sync(undefined, all);
  assert.strictEqual(old.now(), 0.5);
  // A send whose reply was lost: its answers are on the sheet and still in the log; the reply's ids keep them from
  // counting twice (Codex review #370).
  const lost = loadCodeGs();
  lost.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: all.map(a => ans(a.id, a))});
  const r = lost.get({name: 'Ana', pin: '1234'}),
    again = modelHold({'reefid-hold': 0});
  assert.ok(r.holdIds.includes('u5'));
  again.sync(r.hold, all, r.holdIds);
  assert.strictEqual(again.now(), one.now());
});

test("v23 hold: a send of answers older than another device's gets the hold in time order back (Codex review #370)", () => {
  const s = loadCodeGs(),
    at = i => `2026-11-01T08:00:${String(i).padStart(2, '0')}Z`;
  // Device A: 8 right answers; device B, offline before them: 3 misses, sent afterwards.
  s.post({
    name: 'Ana',
    pin: '1234',
    data: prog(1),
    summary: {},
    answers: [...Array(8)].map((_, i) => ans('a' + i, {t: at(10 + i), e: 0.8, ok: 1}))
  });
  const r = s.post({
    name: 'Ana',
    pin: '1234',
    data: prog(1),
    summary: {},
    answers: [0, 1, 2].map(i => ans('b' + i, {t: at(1 + i), e: 0.8, ok: 0, a: 'Montipora'}))
  });
  assert.strictEqual(r.hold, 0, 'three misses, then eight right answers: paid back');
  const dev = modelHold({'reefid-hold': 2.1});
  dev.sync(r.hold, [], r.holdIds);
  assert.strictEqual(dev.now(), 0);
});

test('v23 hold: answers moved to the name (sign-in) count at once', () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: []});
  assert.strictEqual(s.get({name: 'Ana', pin: '1234'}).hold, 0);
  s.post({anon: 'abc123xyz0', anonAnswers: [1, 2, 3].map(i => ans('m' + i, {t: `2026-11-01T08:00:0${i}Z`, ok: 0, a: 'Porites', e: 0.8}))});
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [], anon: 'abc123xyz0'});
  assert.strictEqual(s.get({name: 'Ana', pin: '1234'}).hold, 2.1);
});

test('v23 Answers: Seconds and Enlarged at the end, sanitised; the columns before them never move', () => {
  const s = loadCodeGs(),
    T = 'ghp_write000000000000000000';
  s.post({
    name: 'Ana',
    pin: '1234',
    data: prog(1),
    summary: {},
    answers: [
      ans('t1', {rt: 7.34, zm: 1, e: 0.8, ch: 'Acropora Porites'}),
      ans('t2', {rt: 9999, zm: 0}),
      ans('t3', {rt: -3, zm: 'x'}),
      ans('t4', {rt: '12', zm: true}),
      ans('t5')
    ]
  });
  const A = s.sheets.Answers;
  assert.deepStrictEqual([...A.rows[0].slice(11, 14)], ['Choices', 'Seconds', 'Enlarged']);
  assert.deepStrictEqual(
    A.rows.slice(1).map(r => [r[7], r[8], r[11], r[12], r[13]]),
    [
      ['t1', 0.8, 'Acropora Porites', 7.3, 1],
      ['t2', '', '', 600, 0],
      ['t3', '', '', 0, ''],
      ['t4', '', '', '', 1],
      ['t5', '', '', '', '']
    ]
  );
  // readAnswers: the anonymous flag stays at index 11, seconds and enlarged follow (null when not logged).
  assert.deepStrictEqual(
    s.post({readAnswers: 1, token: T}).rows.map(x => x.slice(10, 14)),
    [
      ['Acropora Porites', 0, 7.3, 1],
      ['', 0, 600, 0],
      ['', 0, 0, null],
      ['', 0, null, 1],
      ['', 0, null, null]
    ]
  );
  // A tab made before v23 gets the two headers; its old rows read as not logged.
  const s2 = loadCodeGs();
  s2.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [ans('o1')]});
  s2.sheets.Answers.rows.forEach(x => (x.length = 12));
  s2.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [ans('o2', {rt: 3, zm: 0})]});
  assert.deepStrictEqual([...s2.sheets.Answers.rows[0].slice(12, 14)], ['Seconds', 'Enlarged']);
  assert.deepStrictEqual(
    s2.post({readAnswers: 1, token: T}).rows.map(x => x.slice(12, 14)),
    [
      [null, null],
      [3, 0]
    ]
  );
  // The players list and the photo stats read as before.
  assert.strictEqual(s.post({users: 1, token: T}).users[0].answers, 5);
  assert.strictEqual(s.get({stats: '1'}).ok, true);
});

test('v44 Answers: the UTC offset at the end, sanitised; readAnswers carries it at index 14', () => {
  // Pierre, 2026-11-04: the time of day at home, for players outside the sheet's time zone (minutes east of UTC).
  const s = loadCodeGs(),
    T = 'ghp_write000000000000000000';
  s.post({
    name: 'Ana',
    pin: '1234',
    data: prog(1),
    summary: {},
    answers: [ans('z1', {tz: 480}), ans('z2', {tz: -300}), ans('z3', {tz: 900}), ans('z4', {tz: '480'}), ans('z5', {tz: 330.5}), ans('z6')]
  });
  const A = s.sheets.Answers;
  assert.deepStrictEqual([...A.rows[0].slice(13, 15)], ['Enlarged', 'UTC offset']);
  assert.deepStrictEqual(
    A.rows.slice(1).map(r => r[14]),
    [480, -300, '', '', '', '']
  );
  assert.deepStrictEqual(
    s.post({readAnswers: 1, token: T}).rows.map(x => x[14]),
    [480, -300, null, null, null, null]
  );
});

test("v59 Answers: a typed answer's raw text and its spelling step at the end, sanitised, logged only", () => {
  // A player's idea, Pierre 2026-11-05: a close typo of the right name is retyped once (quiz.js typeBind); the name
  // study's question g: the raw text of typed answers, so near-misses can be studied.
  const s = loadCodeGs();
  s.post({
    name: 'Ana',
    pin: '1234',
    data: prog(1),
    summary: {},
    answers: [
      ans('y1', {ty: 'Pectinea', tr: 1}),
      ans('y2', {ty: '  pactinia ', tr: 0}),
      ans('y3', {ty: '=HYPERLINK("x")'}),
      ans('y4', {ty: 'a'.repeat(60) + '\u0007', tr: 'yes'}),
      ans('y5', {ty: 42}),
      ans('y6')
    ]
  });
  const A = s.sheets.Answers;
  assert.deepStrictEqual([...A.rows[0].slice(15, 17)], ['Typed', 'Retyped right']);
  assert.deepStrictEqual(
    A.rows.slice(1).map(r => [r[15], r[16]]),
    [
      ['Pectinea', 1],
      ['pactinia', 0],
      ['=HYPERLINK("x")', ''], // stored as text behind the quote prefix (safe_), never a formula
      ['a'.repeat(40), ''],
      ['', ''],
      ['', '']
    ]
  );
});

test('v44 one-shot tz: the rows logged before get +480 in their empty UTC offset cells, once, never over a value', () => {
  // Pierre, 2026-11-04: every answer logged before v44 came from players on Philippine time.
  const CODE = require('fs').readFileSync(require('path').join(__dirname, '..', 'tools', 'sync', 'Code.gs'), 'utf8');
  const s = loadCodeGs({
    fetch: url => (url.includes('raw.githubusercontent.com') ? {getResponseCode: () => 200, getContentText: () => CODE} : null)
  });
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [ans('o1'), ans('o2'), ans('o3')]});
  const A = s.sheets.Answers;
  A.rows.forEach(x => (x.length = 14)); // a tab from before v44: no header, no cells
  A.rows[2][14] = -300; // a value already there stays
  A.rows.splice(3, 0, []); // an empty row between answers stays empty
  // The function itself: fills the empty cells of answer rows only, and a second call finds nothing to fill.
  assert.strictEqual(require('vm').runInContext('ONCE_.tz()', s.ctx), 'UTC offset +480 in 2 empty cells of 4 rows');
  assert.strictEqual(A.rows[0][14], 'UTC offset');
  assert.deepStrictEqual(
    A.rows.slice(1).map(r => r[14]),
    [480, -300, '', 480]
  );
  assert.strictEqual(require('vm').runInContext('ONCE_.tz()', s.ctx), 'UTC offset +480 in 0 empty cells of 4 rows');
  // Run by the new script itself once (autoUpdate, up to date), logged in the Deploy log; never again.
  A.rows[1][14] = '';
  assert.match(s.ctx.autoUpdate(), /^up to date/);
  assert.strictEqual(A.rows[1][14], 480);
  assert.ok(s.props.ONCE_tz, 'marked done');
  const log = () =>
    s.sheets['Deploy log'].rows
      .slice(1)
      .map(r => String(r[1]))
      .filter(l => l.startsWith('one-shot tz'));
  assert.deepStrictEqual(log(), [`one-shot tz (v${SV}): UTC offset +480 in 1 empty cells of 4 rows`]);
  A.rows[1][14] = '';
  s.ctx.autoUpdate();
  assert.strictEqual(A.rows[1][14], '', 'once only');
  assert.strictEqual(log().length, 1);
  assert.deepStrictEqual(
    s.post({readAnswers: 1, token: 'ghp_write000000000000000000'}).rows.map(x => x[14]),
    [null, -300, 480]
  );
});
test('v24: the flood caps count only answers the sheet does not have yet (Codex review #372)', () => {
  const s = loadCodeGs(),
    batch = k => [...Array(100)].map((_, i) => ans('r' + k + 'x' + i)),
    send = L => s.post({anon: 'abcd1234ef', anonAnswers: L});
  for (let k = 0; k < 6; k++) assert.strictEqual(send(batch(k)).log, true);
  // The same 600 again (the app's one-time catch-up): accepted, nothing logged, nothing counted.
  for (let k = 0; k < 6; k++) assert.strictEqual(send(batch(k)).log, true);
  // ...so a new answer is still over the 600 of this window only because of the first 600, not the resend.
  assert.strictEqual(send([ans('brandnew')]).error, 'busy');
  const t = loadCodeGs(),
    sendT = L => t.post({anon: 'abcd1234ef', anonAnswers: L});
  for (let k = 0; k < 5; k++) sendT(batch(k));
  for (let k = 0; k < 5; k++) sendT(batch(k)); // 500 resent: no quota used
  assert.strictEqual(sendT([ans('brandnew')]).log, true, '501st distinct answer still fits');
});

test('v25: a request without av (an app before 2026-11-03) is logged as old, once an hour per sender', () => {
  const s = loadCodeGs(),
    old = () => (s.sheets.Events ? s.sheets.Events.rows.filter(r => r[2] === 'old') : []);
  s.get({stats: '1'});
  s.get({stats: '1'});
  s.get({stats: '1', av: '180'});
  s.post({anon: 'abcd1234ef', anonAnswers: [ans('o1')]});
  s.post({anon: 'abcd1234ef', anonAnswers: [ans('o2')], av: '180'});
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: []});
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [], av: '180'});
  // A load with a made-up name, or a wrong code, logs nothing (Codex review #373); a global cap holds the rest.
  for (let i = 0; i < 20; i++) s.get({name: 'Nobody' + i, pin: '1234'});
  s.get({name: 'Ana', pin: '9999'});
  const m = old().map(r => String(r[3]));
  assert.strictEqual(m.length, 3, m.join(' | '));
  assert.ok(m.some(x => /photo stats/.test(x)) && m.some(x => /~anon abcd1234ef/.test(x)) && m.some(x => /save \(Ana\)/.test(x)));
});

// v50 (Pierre, 2026-11-05: "save failed" too often): an exception thrown out of doGet / doPost made Apps Script answer
// with its HTML error page, which has no CORS header, so the browser reported "Failed to fetch" / "Load failed" although
// the script had answered. Every reply is the script's own JSON now.
test('v50: a script lock held by another request is answered as JSON (lock), never thrown', () => {
  const s = loadCodeGs();
  assert.strictEqual(s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [], av: '300'}).rev, 1);
  s.lock.busy = true;
  const r = s.post({name: 'Ana', pin: '1234', data: prog(2), summary: {}, answers: [ans('l1')], av: '300', at: 1});
  assert.deepStrictEqual([r.ok, r.error, r.log, r.v], [false, 'lock', undefined, SV]);
  assert.strictEqual(s.post({dev: 'dev0000001', events: [{id: 'e1', t: '2026-11-05T00:00:00Z', k: 'err', msg: 'x'}]}).error, 'lock');
  assert.strictEqual(s.post({anon: 'abcd1234ef', anonAnswers: [ans('l2')], av: '300'}).error, 'lock');
  assert.strictEqual(s.post({reports: [{id: 'r1', why: 'other', note: 'n'}], rname: 'Ana', rpin: '1234'}).error, 'lock');
  s.lock.busy = false;
  // Nothing was written: the save sent again goes through, its answer logged once.
  const again = s.post({name: 'Ana', pin: '1234', data: prog(2), summary: {}, answers: [ans('l1')], av: '300', at: 1});
  assert.deepStrictEqual([again.ok, again.log, again.rev], [true, true, 2]);
  assert.strictEqual(s.sheets.Answers.rows.filter(x => x[7] === 'l1').length, 1);
});

test('v50: an exception (a Sheets service failure, a broken request) is answered as JSON (server), with a short message', () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [], av: '300'});
  const ss = s.ctx.SpreadsheetApp.getActiveSpreadsheet;
  s.ctx.SpreadsheetApp.getActiveSpreadsheet = () => {
    throw new Error('Service Spreadsheets timed out while accessing document with id 1R-L_JqKz9eFF8jvnmPy2g12Zrpn__uWm1Y32kkMfQUE.');
  };
  for (const r of [
    s.post({name: 'Ana', pin: '1234', data: prog(2), summary: {}, answers: [ans('s1')], av: '300', at: 1}),
    s.get({name: 'Ana', pin: '1234', av: '300'})
  ]) {
    assert.deepStrictEqual([r.ok, r.error, r.v], [false, 'server', SV]);
    assert.match(r.msg, /^Service Spreadsheets timed out/);
    assert.ok(!/1R-L_JqKz9eFF8jvnmPy2g12Zrpn__uWm1Y32kkMfQUE/.test(r.msg), 'no long id in the reply: ' + r.msg);
  }
  s.ctx.SpreadsheetApp.getActiveSpreadsheet = ss;
  assert.strictEqual(s.ctx.doPost({postData: {contents: '{"name": "Ana", '}}).error, 'server');
});

// v50 (Pierre, 2026-11-05: a device stayed on an old app version, and the 'old' event had no device): the photo stats
// request carries the app version (av), the anonymous device id (dev) and the minutes the page has been open (up).
test('v50: a device on a replaced app version is logged as old with its device id and version, once in 6 hours', () => {
  const s = loadCodeGs(),
    H = 36e5,
    top = (b, ago) => (s.props.BUILD_TOP = JSON.stringify({b, t: Date.now() - ago})),
    old = () => (s.sheets.Events ? s.sheets.Events.rows.filter(r => r[2] === 'old') : []),
    stats = (av, dev, up) => s.get({stats: '1', av, dev, up: String(up)});
  stats('300-aaaa', 'devnew0001', 0);
  assert.strictEqual(JSON.parse(s.props.BUILD_TOP).b, 300, 'the newest build reported is kept');
  stats('320-bbbb', 'devnew0001', 0);
  assert.strictEqual(JSON.parse(s.props.BUILD_TOP).b, 320);
  stats('300-aaaa', 'devold0001', 45); // replaced a moment ago: the worker is updating it
  assert.strictEqual(old().length, 0);
  top(320, 2 * H);
  stats('300-aaaa', 'devold0002', 3); // just opened on a version replaced 2 h ago: its worker takes over now
  stats('320-bbbb', 'devnew0001', 300); // the newest version, open for hours: fine
  stats('admin', 'devold0004', 300); // the admin page (no build number)
  stats('300-aaaa', 'devold0005', 300); // a page open 5 h on a version replaced 2 h ago: it did not pick up the new one
  assert.strictEqual(old().length, 1, 'only the page left open on the replaced version is logged');
  stats('300-aaaa', 'devold0005', 310); // the same device again: not within 6 hours
  top(320, 25 * H);
  stats('290-cccc', 'devold0003', 0); // replaced a day ago: a device that keeps starting an old version
  s.get({stats: '1', av: '290-cccc', up: '0'}); // no device id: nothing to match, nothing logged
  stats('99999-dddd', 'devbad0001', 0); // a made-up build far ahead of the newest is not taken as the newest
  assert.strictEqual(JSON.parse(s.props.BUILD_TOP).b, 320);
  const L = old();
  assert.deepStrictEqual(
    L.map(r => [r[1], r[7]]),
    [
      ['devold0005', '300-aaaa'],
      ['devold0003', '290-cccc']
    ]
  );
  assert.match(String(L[0][3]), /^app behind: build 300, newest 320 for 2 h, page open 300 min$/);
});

// Codex review #565: a hold computed from an older read of the Answers tab must not be kept in the cache past answers
// logged since (two saves of one account at once: the first read the tab, the second logged and dropped the cache, the
// first then wrote its older hold back, 1.8 instead of 2.7, until the next answer or six hours). The cached hold says
// how many rows the tab had when it was read, and is used only while the tab still has as many.
test('v50: a cached hold read before answers logged since is not reused', () => {
  const s = loadCodeGs(),
    miss = id => ans(id, {a: 'Montipora', ok: 0, e: 0.9});
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [miss('h1')], av: '300'});
  const h1 = s.get({name: 'Ana', pin: '1234', av: '300'}).hold;
  // Two more misses reach the tab while the cache keeps the hold of one (as the interleaving above leaves it).
  const A = s.sheets.Answers;
  ['h2', 'h3'].forEach(id =>
    A.appendRow(['Ana', new Date('2026-11-01T00:00:01Z'), 'Acropora', 'Montipora', 0, 'quiz', 'p', id, 0.9, '', '', '', '', '', ''])
  );
  const h3 = s.get({name: 'Ana', pin: '1234', av: '300'}).hold;
  assert.ok(h3 > h1, `the hold of 3 misses (${h3}) is above the hold of 1 (${h1})`);
});

test('v25: the old-app log is capped for everyone (Codex review #373)', () => {
  const s = loadCodeGs();
  for (let i = 0; i < 400; i++) s.post({anon: 'id' + String(i).padStart(8, '0'), anonAnswers: [ans('c' + i)]});
  assert.ok(s.sheets.Events.rows.filter(r => r[2] === 'old').length <= 300);
});

// Full replay by the sheet (v28, Pierre 2026-11-03: progress recalculated from the whole answer log, automatically): the
// script embeds core.js (tools/sync_core.py) and replays a player's rows when their app applied an older rules version.
const C = require('../core.js'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  {execFileSync} = require('child_process');
const DJSON = fs.readFileSync(path.join(__dirname, '..', 'data.json'), 'utf8'),
  GEN = (d => {
    const out = {};
    [d.gen, d.x.gen].forEach(G => Object.keys(G).forEach(n => out[n] || (out[n] = {look: G[n].look || [], fam: String(G[n].fam || '')})));
    return out;
  })(JSON.parse(DJSON));
// data.json from GitHub, served here (counted); anything else is the default stub.
const withData = (n = {c: 0}) => ({
  n,
  fetch: url => (/\/main\/data\.json$/.test(url) ? (n.c++, {getResponseCode: () => 200, getContentText: () => DJSON}) : null)
});
const qa = (id, i, x = {}) =>
  ans(id, {
    t: new Date(Date.UTC(2026, 10, 3, 6, 0, i)).toISOString(),
    g: 'Acropora',
    a: i % 4 === 3 ? 'Montipora' : 'Acropora',
    ok: i % 4 === 3 ? 0 : 1,
    ph: 'acropora-wide-' + (i % 5),
    ch: 'Acropora Montipora Porites Pocillopora',
    e: 0.8,
    th: 1,
    ...x
  });

test("v28: core.js embedded in Code.gs is the app's core.js, and keeps its names to itself", () => {
  execFileSync('python3', [path.join(__dirname, '..', 'tools', 'sync_core.py'), '--check']);
  const s = loadCodeGs();
  assert.strictEqual(vm.runInContext('CORE_.RV', s.ctx), C.RV);
  assert.strictEqual(vm.runInContext('typeof replayProgress', s.ctx), 'undefined', "no core.js name among the script's globals");
  assert.strictEqual(vm.runInContext('TRUST === CORE_.TRUST', s.ctx), false, 'Code.gs keeps its own constants');
  assert.strictEqual(vm.runInContext('typeof CORE_.replayProgress', s.ctx), 'function');
  // The app and the admin wait for this script version before they rely on the replay (core.js RV_SHEET; rule D4):
  // the script that serves it says so in every reply.
  // (Which version that is, and that the gate holds below it, is tests/gates.test.js's.)
  assert.ok(vm.runInContext('VERSION', s.ctx) >= C.RV_SHEET);
});

test('v28: a player whose app applied an older rules version gets the replay of their log, stored once', () => {
  const f = withData(),
    s = loadCodeGs({fetch: f.fetch}),
    L = Array.from({length: 12}, (_, i) => qa('r' + i, i)),
    data = prog(9);
  s.post({name: 'Ana', pin: '1234', data, summary: {}, answers: L.slice(0, 8)}); // an app that sends no rv: no replay
  assert.ok(!s.sheets.Replayed, 'nothing replayed for an app that cannot adopt it');
  const r = s.post({name: 'Ana', pin: '1234', data, summary: {}, answers: L.slice(8), rv: 0});
  assert.ok(r.ok && r.replay, JSON.stringify(r).slice(0, 200));
  const st = s.get({stats: '1'}),
    want = C.replayProgress(
      L.map(a => C.logRow(a, 'ana')),
      {gen: GEN, mem: st.mem, conf: st.conf}
    ).ana.P;
  assert.deepStrictEqual(r.replay.rec, want, 'the same engine over the same rows');
  assert.deepStrictEqual([r.replay.rv, r.replay.n, r.replay.ids.length], [C.RV, 12, 12]);
  assert.ok(r.replay.rec.Acropora.pg > 0 && typeof r.replay.rec.Acropora.th === 'number' && r.replay.rec['~level'].ok === 9);
  // The Replayed tab: Name, Rules, Rows, Since, Updated, Record.
  const T = s.sheets.Replayed;
  assert.deepStrictEqual([...T.rows[0]], ['Name', 'Rules', 'Rows', 'Since', 'Updated', 'Record']);
  assert.deepStrictEqual(
    Array.from(T.rows.slice(1), x => [x[0], x[1], x[2], x[3]]),
    [['Ana', C.RV, 12, 0]]
  );
  assert.deepStrictEqual(JSON.parse(T.rows[1][5]), want);
  // The player's own copy is never rewritten by the replay.
  const g = s.get({name: 'Ana', pin: '1234', rv: '0'});
  assert.deepStrictEqual(g.data, data);
  assert.deepStrictEqual(g.replay.rec, want);
  // Stored: a second request reuses it (a marker put in the tab comes back), data.json read once (cached).
  T.rows[1][5] = '{"mark":1}';
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234', rv: '0'}).replay.rec, {mark: 1});
  assert.strictEqual(f.n.c, 1);
  // An app that applied this version gets nothing.
  assert.ok(!s.get({name: 'Ana', pin: '1234', rv: String(C.RV)}).replay);
  assert.ok(!s.post({name: 'Ana', pin: '1234', data, summary: {}, answers: [], rv: C.RV}).replay);
  // A newer rules version than the stored one: replayed again.
  T.rows[1][1] = C.RV - 1;
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234', rv: '0'}).replay.rec, want);
  assert.strictEqual(T.rows[1][1], C.RV);
  // New rows since: replayed again over them, still one row in the tab.
  const r2 = s.post({name: 'Ana', pin: '1234', data, summary: {}, answers: [qa('r12', 12), qa('r13', 13)], rv: 0});
  assert.strictEqual(r2.replay.n, 14);
  assert.strictEqual(r2.replay.rec.Acropora.ok + r2.replay.rec.Acropora.ko, 14);
  assert.deepStrictEqual(
    Array.from(T.rows.slice(1), x => [x[0], x[2]]),
    [['Ana', 14]]
  );
  // Still the player's own copy, as saved.
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).data, data);
  const raw = JSON.parse(s.sheets['Progress data'].rows[1].slice(2).join(''));
  assert.ok(raw._acct, 'with its generation (v58)');
  delete raw._acct;
  assert.deepStrictEqual(raw, data);
});

// v42 (Pierre, 2026-11-04: admin pages slow): the player list carries each player's full replay as the admin computed it
// from the answer log and their saved copy (rp: [progress %, learned, the saved copy's %]), so Players makes no call per
// player; the replay record is the Replayed tab's, reused while the player's rows are the same.
test("v42: the player list carries each player's replayed progress, learned and saved %, from the Replayed tab", () => {
  const f = withData(),
    s = loadCodeGs({fetch: f.fetch}),
    L = Array.from({length: 12}, (_, i) => qa('r' + i, i)),
    data = prog(9);
  s.post({name: 'Ana', pin: '1234', data, summary: {}, answers: L});
  s.post({name: 'Ben', pin: '1111', data: prog(1), summary: {}, answers: []});
  const r = s.post({users: 1, token: TOK}),
    st = s.get({stats: '1'}),
    D = JSON.parse(DJSON),
    list = C.slateOf(D),
    P = JSON.parse(data['reefid-sync-coral-progress']),
    rec = C.replayProgress(
      L.map(a => C.logRow(a, 'ana')),
      {gen: GEN, mem: st.mem, conf: st.conf}
    ).ana.P,
    G = C.replayedOf({P: rec}, P);
  const ana = r.users.find(u => u.name === 'Ana');
  assert.deepStrictEqual(ana.rp, [C.pctOf(G, list), C.learnedOf(G, list), C.pctOf(P, list)]);
  assert.ok(ana.rp[0] > 0);
  assert.deepStrictEqual(r.users.find(u => u.name === 'Ben').rp, [C.pctOf(P1(), list), C.learnedOf(P1(), list), C.pctOf(P1(), list)]);
  // Stored in the Replayed tab, one row a player, and reused: a marker put in Ana's record comes back in her %.
  const T = s.sheets.Replayed;
  assert.deepStrictEqual(
    Array.from(T.rows.slice(1), x => [x[0], x[1], x[2]]),
    [
      ['Ana', C.RV, 12],
      ['Ben', C.RV, 0]
    ]
  );
  T.rows[1][5] = JSON.stringify(Object.fromEntries(list.map(g => [g, {pg: 1, ok: 30, ko: 0, h: '1111111111', u: 1}])));
  assert.strictEqual(s.post({users: 1, token: TOK}).users.find(u => u.name === 'Ana').rp[0], 95);
  // A new answer: replayed again, still one row for her.
  s.post({name: 'Ana', pin: '1234', data, summary: {}, answers: [qa('r12', 12)]});
  const again = s.post({users: 1, token: TOK}).users.find(u => u.name === 'Ana');
  assert.strictEqual(T.rows[1][2], 13);
  assert.strictEqual(T.rows.length, 3);
  assert.ok(Array.isArray(again.rp));
  assert.strictEqual(f.n.c, 1, 'data.json read once (cached with the slate)');
  // Without data.json: no rp (the admin reads the saved copies itself, as before v42).
  const s2 = loadCodeGs();
  s2.post({name: 'Ana', pin: '1234', data, summary: {}, answers: L});
  assert.ok(!('rp' in s2.post({users: 1, token: TOK}).users[0]));
});
const P1 = () => JSON.parse(prog(1)['reefid-sync-coral-progress']);

test('v28: the replay counts only the answers after a progress reset, and none without data.json', () => {
  const s = loadCodeGs(withData()),
    L = Array.from({length: 6}, (_, i) => qa('s' + i, i)),
    data = {...prog(2), 'reefid-sync-coral-reset': JSON.stringify(new Date(Date.UTC(2026, 10, 3, 6, 0, 3, 500)).toISOString())};
  const r = s.post({name: 'Ben', pin: '1234', data, summary: {}, answers: L, rv: 0});
  assert.strictEqual(r.replay.n, 2);
  assert.strictEqual(s.sheets.Replayed.rows[1][3], Date.UTC(2026, 10, 3, 6, 0, 3, 500));
  const t = loadCodeGs({fetch: url => (/data\.json/.test(url) ? {getResponseCode: () => 404, getContentText: () => ''} : null)});
  const r2 = t.post({name: 'Ben', pin: '1234', data, summary: {}, answers: L, rv: 0});
  assert.ok(r2.ok && !r2.replay, 'data.json unreadable: no replay, the save goes through');
});

test('v28: a device that never signed in gets its replay with its anonymous answers', () => {
  const s = loadCodeGs(withData()),
    L = Array.from({length: 5}, (_, i) => qa('n' + i, i));
  const r = s.post({anon: 'abcd1234ef', anonAnswers: L, rv: 0});
  assert.ok(r.log && r.replay && r.replay.n === 5 && r.replay.rec.Acropora.ok === 4, JSON.stringify(r).slice(0, 200));
  assert.strictEqual(s.sheets.Replayed.rows[1][0], '~anon abcd1234ef');
  assert.ok(!s.post({anon: 'abcd1234ef', anonAnswers: [qa('n9', 9)]}).replay, 'no rv: none');
});

test('v28: the replay ids cover every row from the oldest answer the device still queues (pt; Codex review #399)', () => {
  const s = loadCodeGs(withData()),
    L = Array.from({length: 601}, (_, i) => qa('p' + i, i)),
    data = prog(1);
  s.post({name: 'Ana', pin: '1234', data, summary: {}, answers: L});
  // An app that sends no pt: the last HOLD.IDS rows, as before.
  const old = s.get({name: 'Ana', pin: '1234', rv: '0'}).replay.ids;
  assert.deepStrictEqual([old.length, old[0], old[499]], [500, 'p101', 'p600']);
  // The device's queue starts at the first answer: every row from there (601), on a load and on a save.
  assert.strictEqual(s.get({name: 'Ana', pin: '1234', rv: '0', pt: String(Date.parse(L[0].t))}).replay.ids.length, 601);
  const r = s.post({name: 'Ana', pin: '1234', data, summary: {}, answers: L.slice(0, 50), rv: 0, pt: Date.parse(L[0].t)});
  assert.strictEqual(r.replay.ids.length, 601);
  // A queue that starts later: from there on, never fewer than the last HOLD.IDS.
  assert.strictEqual(s.get({name: 'Ana', pin: '1234', rv: '0', pt: String(Date.parse(L[590].t))}).replay.ids.length, 500);
  // Anonymous answers too.
  const a = s.post({anon: 'abcd1234ef', anonAnswers: [qa('q1', 1), qa('q2', 2)], rv: 0, pt: Date.parse(qa('q1', 1).t)});
  assert.deepStrictEqual(a.replay.ids, ['q1', 'q2']);
});

test('v28: the hold ids cover every row from the oldest answer the device still queues, as the replay ids (pt; Codex review #399)', () => {
  // 601 answers sent and logged, the reply lost: all still queued on the device.
  const s = loadCodeGs(),
    L = Array.from({length: 601}, (_, i) => qa('h' + i, i)),
    pt = Date.parse(L[0].t),
    one = modelHold();
  L.forEach(a => one.step(a.e, a.ok));
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: L});
  // An app that sends no pt: the last HOLD.IDS rows (and the cache keeps them).
  assert.strictEqual(s.get({name: 'Ana', pin: '1234'}).holdIds.length, 500);
  // A load or a save from the device whose queue starts at the first answer: every row from there, past the cache.
  const r = s.get({name: 'Ana', pin: '1234', pt: String(pt)});
  assert.deepStrictEqual([r.holdIds.length, r.holdIds[0]], [601, 'h0']);
  assert.strictEqual(s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: L.slice(0, 10), pt}).holdIds.length, 601);
  // A queue that starts later: never fewer than the last HOLD.IDS.
  assert.strictEqual(s.get({name: 'Ana', pin: '1234', pt: String(Date.parse(L[590].t))}).holdIds.length, 500);
  // The device adds none of its queued answers again (model.js holdSync): the hold of the 601 answers, once each.
  const dev = modelHold();
  dev.sync(r.hold, L, r.holdIds);
  assert.strictEqual(dev.now(), one.now());
});

test("v28: an anonymous device's replay counts only the answers after its progress reset (reset; Codex review #399)", () => {
  const s = loadCodeGs(withData()),
    L = Array.from({length: 6}, (_, i) => qa('z' + i, i)),
    reset = new Date(Date.UTC(2026, 10, 3, 6, 0, 3, 500)).toISOString();
  s.post({anon: 'abcd1234ef', anonAnswers: L});
  const r = s.post({anon: 'abcd1234ef', anonAnswers: [], rv: 0, reset});
  assert.strictEqual(r.replay.n, 2);
  assert.strictEqual(s.sheets.Replayed.rows[1][3], Date.parse(reset));
  // No reset sent (an app before this): every answer, as before.
  assert.strictEqual(s.post({anon: 'abcd1234ef', anonAnswers: [], rv: 0}).replay.n, 6);
});

// v33 (rename of 2026-11-03, shipped with sheet v33): the app's keys were renamed with the app (IMR Reef ID, core.js LEGACY_KEYS). An app from before the
// rename still saves the old names, the renamed app saves the new ones plus a copy under the old ones (core.js
// withLegacy): the sheet reads the new name first, else the old one. rename-app: keep-begin
test('v33: saved data is read under the new key names or the old ones (progress, reset, achievements)', () => {
  const {pctOf, withLegacy} = require('../core.js');
  const s = loadCodeGs(),
    P = {Acropora: {ok: 8, ko: 2, pg: 0.5, th: 0.4}, Porites: {ok: 20, ko: 1, pg: 0.7, mx: 1, th: 1.2}},
    genera = {Acropora: 'mid', Porites: 'ok', Favites: 'new'},
    oldP = {'imr-coral-progress': JSON.stringify(P)},
    newP = {'reefid-sync-coral-progress': JSON.stringify(P)};
  // The leaderboard %: an old app's save, a renamed app's save, and the renamed app's save with its old-name copy.
  s.post({name: 'Old', pin: '1234', data: oldP, summary: {pct: 1, genera}, answers: [ans('o1')]});
  s.post({name: 'New', pin: '1234', data: newP, summary: {pct: 1, genera}, answers: [ans('n1')]});
  s.post({name: 'Both', pin: '1234', data: withLegacy(newP), summary: {pct: 1, genera}, answers: [ans('b1')]});
  const rows = s.get({board: '1'}).rows,
    want = pctOf(P, Object.keys(genera));
  assert.ok(want > 1);
  ['Old', 'New', 'Both'].forEach(n => assert.strictEqual(rows.find(r => r[0] === n)[1], want, n));
  // Both names with different values (never sent by the app; a guard): the new one wins.
  assert.strictEqual(s.ctx.dataKey_({'imr-coral-progress': 'old', 'reefid-sync-coral-progress': 'new'}, 'progress'), 'new');
  assert.strictEqual(s.ctx.dataKey_({'imr-coral-progress': 'old'}, 'progress'), 'old');
  assert.strictEqual(s.ctx.dataKey_({}, 'progress'), undefined);
  // The abilities for the photo statistics (abilities_), and the last progress reset for the opening hold (resetOf_).
  assert.deepStrictEqual({...s.ctx.abilities_(JSON.stringify(oldP))}, {Acropora: 0.4, Porites: 1.2});
  assert.deepStrictEqual({...s.ctx.abilities_(JSON.stringify(newP))}, {Acropora: 0.4, Porites: 1.2});
  const t = '2026-11-01T08:00:20Z';
  assert.strictEqual(s.ctx.resetOf_({'imr-coral-reset': JSON.stringify(t)}), Date.parse(t));
  assert.strictEqual(s.ctx.resetOf_({'reefid-sync-coral-reset': JSON.stringify(t)}), Date.parse(t));
  assert.strictEqual(s.ctx.resetOf_({}), 0);
  // Achievements: old names, new names, both (new wins: the old copy's extra achievement is not counted).
  const s2 = loadCodeGs();
  s2.post({name: 'Ana', pin: '1234', data: {...oldP, 'imr-coral-ach': JSON.stringify({met10: 1})}, summary: {}, answers: []});
  s2.post({name: 'Ben', pin: '1111', data: {...newP, 'reefid-sync-ach': JSON.stringify({met10: 1, run10: 1})}, summary: {}, answers: []});
  s2.post({
    name: 'Cy',
    pin: '2222',
    data: {...newP, 'reefid-sync-ach': JSON.stringify({met10: 1}), 'imr-coral-ach': JSON.stringify({cor1: 1})},
    summary: {},
    answers: []
  });
  const a = s2.get({achs: '1'});
  assert.strictEqual(a.n, 3);
  assert.deepStrictEqual(a.counts, {met10: 3, run10: 1});
});
// rename-app: keep-end

// Codex review #428 (P2): the Replayed tab's cache is keyed by the first-launch history too (core.js startFp, folded
// into its Since column): a replay made with one history (a stale save) is not reused once the saved history changes.
test('v36: the stored replay is not reused when the first-launch history changes (Codex review #428)', () => {
  const f = withData(),
    s = loadCodeGs({fetch: f.fetch}),
    L = Array.from({length: 12}, (_, i) => qa('r' + i, i)),
    K = C.startKey('coral'),
    rec = c => ({c, t: 1, at: 0, via: 'tour', w: [], fb: {}, h: [[c, 0, 1, 'tour']]}),
    data = c => ({...prog(9), [K]: JSON.stringify(rec(c))});
  const r1 = s.post({name: 'Ana', pin: '1234', data: data('new'), summary: {}, answers: L, rv: 0});
  const st = s.get({stats: '1'}),
    want = c =>
      C.replayProgress(
        L.map(a => C.logRow(a, 'ana')),
        {gen: GEN, mem: st.mem, conf: st.conf, starts: {ana: rec(c)}}
      ).ana.P;
  assert.deepStrictEqual(r1.replay.rec, want('new'));
  assert.notDeepStrictEqual(want('know'), want('new'), 'the prior changes the replay of these answers');
  // The same answers, the history now "know well" (a merged save): replayed again, not the stored "new" replay.
  const r2 = s.post({name: 'Ana', pin: '1234', data: data('know'), summary: {}, answers: [], rv: 0});
  assert.deepStrictEqual(r2.replay.rec, want('know'));
  const T = s.sheets.Replayed;
  assert.strictEqual(T.rows.length, 2, 'still one row');
  assert.strictEqual(String(T.rows[1][3]), '0#' + C.startFp(rec('know')));
  // Unchanged history: the stored replay is reused (a marker put in the tab comes back).
  T.rows[1][5] = '{"mark":1}';
  assert.deepStrictEqual(s.post({name: 'Ana', pin: '1234', data: data('know'), summary: {}, answers: [], rv: 0}).replay.rec, {mark: 1});
});

// v55 (Pierre, 2026-11-05, Q84-Q91): a deleted account leaves nothing in normal operation.
const v55 = () => {
  const s = seed();
  s.post({rname: 'Ben', rpin: '1111', reports: [{id: 'rb1', why: 'photo', t: '2026-11-01T00:00:00Z'}]});
  s.post({dev: 'dev0000021', ename: 'Ben', epin: '1111', events: [{id: 'pg1', k: 'pages', t: Date.now(), av: '190', s: {quiz: [1, 60]}}]});
  // Name mentions in the log tabs: an old app's event names the player, a capped name is named in Alerts.
  require('vm').runInContext(
    "oldApp_('load', 'Ben'); sheet_('Alerts', ['Time', 'Event']).appendRow([new Date(), 'limit reached: n:ben (3000 per 6 h)'])",
    s.ctx
  );
  s.cache.board14 = s.cache.achs15 = s.cache.stats15 = '{}';
  return s;
};
const rplAdd = (s, ...names) =>
  names.forEach(n =>
    require('vm').runInContext(`sheet_(RPL.TAB, RPL.HEAD).appendRow([${JSON.stringify(n)}, 1, 1, 0, new Date(), '{}'])`, s.ctx)
  );
const tabText = (s, tab) => JSON.stringify((s.sheets[tab] || {rows: []}).rows);

test('v55 delete everything: answers, reports, page summaries, name mentions and caches go; only the tombstone stays', () => {
  const s = v55();
  assert.ok(tabText(s, 'Pages').length > 2 && /\(Ben\)/.test(tabText(s, 'Events')));
  const r = s.post({userDelete: 'Ben', answers: true, token: TOK});
  assert.deepStrictEqual([r.ok, r.answers, r.reports], [true, 1, 1]);
  ['RAs', 'Answers', 'Reports', 'Progress data', 'By genus', 'Replayed', 'Events', 'Alerts'].forEach(t =>
    assert.ok(!/\bben\b/i.test(tabText(s, t)), `no "Ben" left in ${t}`)
  );
  assert.strictEqual(s.sheets.Pages.getLastRow(), 1, 'the page summaries are deleted');
  assert.match(tabText(s, 'Events'), /\(~deleted [^)]+\)/);
  assert.match(tabText(s, 'Alerts'), /n:~deleted \S+ \(3000/);
  assert.ok(/Ben/.test(tabText(s, 'Removed')), 'the tombstone stays');
  assert.deepStrictEqual([s.cache.board14, s.cache.achs15, s.cache.stats15], [undefined, undefined, undefined], 'caches cleared');
  assert.strictEqual(s.get({name: 'Ben', pin: '1111'}).error, 'gone');
});

test('v55 delete keeping answers: answers and reports anonymised (Verified 0), flag 2, never a player in stats', () => {
  const s = v55();
  const r = s.post({userDelete: 'Ben', answers: false, token: TOK});
  assert.deepStrictEqual([r.ok, r.answers, r.reports], [true, 1, 1]);
  const rep = s.sheets.Reports.rows.find(x => x && x[11] === 'rb1');
  assert.match(String(rep[1]), /^~deleted /);
  assert.strictEqual(rep[2], 0, 'never verified');
  assert.ok(!/\bben\b/i.test(tabText(s, 'Reports')) && !/\bben\b/i.test(tabText(s, 'Events')));
  assert.strictEqual(s.sheets.Pages.getLastRow(), 1, 'the page summaries are deleted (Q88)');
  const a = s.post({readAnswers: 1, token: TOK}).rows;
  const del = a.filter(x => x[11] === 2);
  assert.strictEqual(del.length, 1, 'the kept answer is flagged 2');
  assert.ok(a.filter(x => x[11] !== 2).every(x => x[11] === 0));
  s.post({anon: 'devanon777', anonAnswers: [ans('z1')], av: '190'});
  assert.strictEqual(s.post({readAnswers: 1, token: TOK}).rows.find(x => x[11] === 1).length, 20, 'a device never signed in stays 1');
  const st = s.post({readStats: 1, token: TOK});
  assert.ok(!(del[0][0] in st.ras), 'no ability for the deleted id');
  assert.ok(Object.keys(st.photos).length > 0, 'its answer still rates the photos');
});

test('v55 merge clears the caches and moves name mentions to the name it joined', () => {
  const s = v55();
  const m = s.post({userMerge: {from: 'Ben', into: 'Ana', data: prog(4)}, token: TOK});
  assert.strictEqual(m.ok, true);
  assert.deepStrictEqual([s.cache.board14, s.cache.achs15, s.cache.stats15], [undefined, undefined, undefined]);
  assert.match(tabText(s, 'Events'), /\(Ana\)/);
  assert.ok(!/\(Ben\)/.test(tabText(s, 'Events')));
});

test('v55 a removed sender: merged reports go to the name it joined, deleted ones to no name, never verified', () => {
  const s = seed();
  s.post({userMerge: {from: 'Ana B', into: 'Ana', data: prog(4)}, token: TOK});
  s.post({userDelete: 'Ben', answers: true, token: TOK});
  s.post({rname: 'Ana B', rpin: '5678', reports: [{id: 'rm1', why: 'photo'}]});
  s.post({rname: 'Ben', rpin: '1111', reports: [{id: 'rd1', why: 'photo'}]});
  const row = id => s.sheets.Reports.rows.find(x => x && x[11] === id);
  assert.deepStrictEqual([row('rm1')[1], row('rm1')[2]], ['Ana', 1]);
  assert.deepStrictEqual([row('rd1')[1], row('rd1')[2]], ['', 0]);
  // Someone new under the deleted name with another code: their reports are theirs, the old device's still go nowhere.
  s.post({name: 'Ben', pin: '9999', data: prog(1), summary: {}});
  s.post({rname: 'Ben', rpin: '1111', reports: [{id: 'rd2', why: 'photo'}]});
  s.post({rname: 'Ben', rpin: '9999', reports: [{id: 'rn1', why: 'photo'}]});
  assert.deepStrictEqual([row('rd2')[1], row('rd2')[2]], ['', 0]);
  assert.deepStrictEqual([row('rn1')[1], row('rn1')[2]], ['Ben', 1]);
});

test('v55 Replayed: a device row goes when its answers are claimed or deleted', () => {
  const s = loadCodeGs(),
    rpl = () => s.sheets.Replayed.rows.slice(1).map(r => String(r[0]));
  // Two anonymous devices with their full replay record (replay_ writes it when an app with older rules asks).
  s.post({anon: 'devanon101', anonAnswers: [ans('x1')], av: '190'});
  s.post({anon: 'devanon102', anonAnswers: [ans('x2')], av: '190'});
  rplAdd(s, '~anon devanon101', '~anon devanon102');
  assert.deepStrictEqual(rpl(), ['~anon devanon101', '~anon devanon102']);
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [], anon: 'devanon101', av: '190'});
  assert.ok(!rpl().includes('~anon devanon101'), 'claimed at sign-in');
  const id = require('vm').runInContext("aid_('~anon devanon102')", s.ctx);
  s.post({anonDelete: [id], token: TOK});
  assert.ok(!rpl().includes('~anon devanon102'), 'deleted with its answers');
});

test('v55 analyses head: a report stored before the last delete or merge is stale', () => {
  const s = seed(),
    rep = JSON.stringify({R: {}, answers: 4, made: 1, AV: 1});
  assert.strictEqual(s.post({analysesPut: 1, report: rep, token: TOK}).ok, true);
  const t0 = JSON.parse(s.sheets.Analyses.rows[1][1]).at;
  assert.strictEqual(s.post({analysesGet: 1, head: 1, token: TOK}).stale, false);
  s.props.ROSTER_AT = String(t0 + 1);
  assert.strictEqual(s.post({analysesGet: 1, head: 1, token: TOK}).stale, true);
  s.props.ROSTER_AT = '0';
  s.post({userDelete: 'Ben', answers: true, token: TOK});
  assert.ok(Number(s.props.ROSTER_AT) >= t0, 'a delete marks the roster changed');
});

test('v55 one-shot removedcleanup: orphan Replayed rows and reports of accounts deleted outright, counts logged', () => {
  const s = seed(),
    vm = require('vm');
  s.post({anon: 'devanon201', anonAnswers: [ans('y1')], av: '190'});
  s.post({anon: 'devanon202', anonAnswers: [ans('y2')], av: '190'});
  rplAdd(s, '~anon devanon201', '~anon devanon202');
  // Before v55: a device's answers claimed without its Replayed row, and an account deleted with its report kept.
  s.sheets.Answers.rows.forEach(r => r[0] === '~anon devanon201' && (r[0] = 'Ana'));
  vm.runInContext(
    "['RAs', DATA_TAB, 'By genus'].forEach(t => dropRows_(t, 'Ana B')); sheet_('Removed', REMOVED).appendRow(['Ana B', 'h', '', new Date()])",
    s.ctx
  );
  // A merged name's report (Into set) and a live player's are kept.
  vm.runInContext("sheet_('Removed', REMOVED).appendRow(['Old', 'h', 'Ana', new Date()])", s.ctx);
  s.post({rname: 'Ben', rpin: '1111', reports: [{id: 'rk1', why: 'photo'}]});
  s.sheets.Reports.rows.push([new Date('2026-11-01'), 'Old', 1, 'Bad photo', '', '', '', '', '', '', '', 'rk2']);
  assert.strictEqual(
    vm.runInContext('ONCE_.removedcleanup()', s.ctx),
    'Replayed 1 orphan row of devices with no answer left, Reports 1 row of accounts deleted outright'
  );
  assert.deepStrictEqual(
    s.sheets.Replayed.rows.slice(1).map(r => r[0]),
    ['~anon devanon202']
  );
  assert.deepStrictEqual(
    s.sheets.Reports.rows
      .slice(1)
      .filter(r => r && r[11])
      .map(r => r[11]),
    ['rk1', 'rk2']
  );
  assert.strictEqual(
    vm.runInContext('ONCE_.removedcleanup()', s.ctx),
    'Replayed 0 orphan rows of devices with no answer left, Reports 0 rows of accounts deleted outright'
  );
});

test('v55 (Codex review #600): a name merged into an account deleted later points nowhere; a removal during an analysis run leaves it stale', () => {
  const s = seed();
  s.post({userMerge: {from: 'Ana B', into: 'Ben', data: prog(2)}, token: TOK});
  s.post({userDelete: 'Ben', answers: true, token: TOK});
  assert.deepStrictEqual(s.get({name: 'Ana B', pin: '5678'}), {ok: false, error: 'gone', into: '', v: SV});
  s.post({rname: 'Ana B', rpin: '5678', reports: [{id: 'rz1', why: 'photo'}]});
  const row = s.sheets.Reports.rows.find(x => x && x[11] === 'rz1');
  assert.deepStrictEqual([row[1], row[2]], ['', 0]);
  // The Analyses job reads the answers (with the roster), an account is removed, then the job stores its report.
  const a = s.post({readAnswers: 1, token: TOK});
  assert.ok(a.roster > 0);
  s.props.ROSTER_AT = String(a.roster + 1000);
  assert.strictEqual(s.post({analysesPut: 1, report: JSON.stringify({R: {}, answers: 1, AV: 1}), roster: a.roster, token: TOK}).ok, true);
  assert.strictEqual(s.post({analysesGet: 1, head: 1, token: TOK}).stale, true);
});

test('v55 (Codex reviews #600, #603): successive merges redirect the older tombstones; a roster snapshot of 0 is kept', () => {
  const s = seed();
  s.post({userMerge: {from: 'Ana B', into: 'Ana', data: prog(2)}, token: TOK});
  s.post({userMerge: {from: 'Ana', into: 'Ben', data: prog(3)}, token: TOK});
  assert.strictEqual(s.get({name: 'Ana B', pin: '5678'}).into, 'Ben', 'A → B → C: A points to C');
  s.post({rname: 'Ana B', rpin: '5678', reports: [{id: 'rc1', why: 'photo'}]});
  const row = s.sheets.Reports.rows.find(x => x && x[11] === 'rc1');
  assert.deepStrictEqual([row[1], row[2]], ['Ben', 1]);
  // The first removal ever happens while the Analyses job computes: its snapshot (0) is older.
  const t = loadCodeGs();
  t.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [ans('q1')]});
  const a = t.post({readAnswers: 1, token: TOK});
  assert.strictEqual(a.roster, 0);
  t.post({name: 'Cid', pin: '1111', data: prog(1), summary: {}, answers: []});
  t.post({userDelete: 'Cid', answers: true, token: TOK});
  assert.strictEqual(t.post({analysesPut: 1, report: JSON.stringify({R: {}, answers: 1, AV: 1}), roster: a.roster, token: TOK}).ok, true);
  assert.strictEqual(t.post({analysesGet: 1, head: 1, token: TOK}).stale, true);
});

test('v55 (Codex review #600): a removed account whose name is throttled still never gets its name on a report', () => {
  const s = seed(),
    vm = require('vm');
  s.post({userDelete: 'Ben', answers: true, token: TOK});
  vm.runInContext("for (let i = 0; i < 10; i++) failed_('Ben')", s.ctx);
  assert.ok(vm.runInContext("blocked_('Ben')", s.ctx), 'the name is throttled');
  s.post({rname: 'Ben', rpin: '1111', reports: [{id: 'rt1', why: 'photo'}]});
  const row = s.sheets.Reports.rows.find(x => x && x[11] === 'rt1');
  assert.deepStrictEqual([row[1], row[2]], ['', 0]);
});

test('v58 archive: Board -2, out of every normal reader; its answers flagged 2 and in no ability; merge refused, delete allowed', () => {
  const s = seed();
  s.post({
    name: 'Ana',
    pin: '1234',
    data: {...prog(3), 'reefid-sync-ach': JSON.stringify({q1: 1})},
    summary: {board: 1},
    answers: [ans('x1')]
  });
  assert.strictEqual(s.post({userArchive: {from: 'Ana', into: 'Ana-old'}, token: TOK}).ok, true);
  const row = s.sheets.RAs.rows.find(r => r && r[0] === 'Ana-old');
  assert.strictEqual(row[9], -2, 'Board -2');
  Object.keys(s.cache).forEach(k => delete s.cache[k]);
  assert.ok(!s.get({board: '1'}).rows.some(r => r[0] === 'Ana-old'), 'off the leaderboard');
  assert.strictEqual(s.get({achs: '1'}).n, 0, 'no achievement share');
  const a = s.post({readAnswers: 1, token: TOK}),
    id = s.post({users: 1, token: TOK}).archived[0].id;
  assert.ok(!(id in a.players), 'not a player in readAnswers');
  assert.ok(a.rows.filter(r => r[0] === id).every(r => r[11] === 2) && a.rows.some(r => r[0] === id), 'its answers flagged 2');
  assert.ok(!(id in s.post({readStats: 1, token: TOK}).ras), 'no ability');
  assert.strictEqual(s.post({userMerge: {from: 'Ana-old', into: 'Ben', data: prog(1)}, token: TOK}).error, 'archived');
  assert.strictEqual(s.post({userMerge: {from: 'Ben', into: 'Ana-old', data: prog(1)}, token: TOK}).error, 'archived');
  assert.strictEqual(s.post({userBoard: 'Ana-old', hide: false, token: TOK}).error, 'archived');
  assert.strictEqual(s.post({userArchive: {from: 'Ana-old', into: 'Ana-older'}, token: TOK}).error, 'archived');
  // The Inbox learns an archive's reports from readReports itself (verified 2; Codex review #603).
  s.post({rname: 'Ben', rpin: '1111', reports: [{id: 'rv1', why: 'photo'}]});
  s.sheets.Reports.rows.push([new Date(), 'Ana-old', 1, 'Bad photo', '', '', '', '', '', '', '', 'rv2']);
  const rr = s.post({readReports: 1, token: TOK}).rows;
  assert.deepStrictEqual([rr.find(r => r[0] === 'rv2')[3], rr.find(r => r[0] === 'rv1')[3]], [2, 1]);
  // The old name answers found: false (the app's archived path, sync.js), and a delete still takes the archive.
  assert.strictEqual(s.get({name: 'Ana', pin: '1234'}).found, false);
  assert.strictEqual(s.post({userDelete: 'Ana-old', answers: true, token: TOK}).ok, true);
  assert.strictEqual(s.post({users: 1, token: TOK}).archived.length, 0);
});

test('v58 selfDelete: the code checked, everything deleted, the tombstone written, capped; never a progress write', () => {
  const s = seed();
  s.post({rname: 'Ben', rpin: '1111', reports: [{id: 'rs1', why: 'photo'}]});
  assert.strictEqual(s.post({selfDelete: 1, name: 'Ben', pin: '1111'}).error, 'input', 'name / pin are never read');
  assert.strictEqual(s.post({selfDelete: 1, dname: 'Ben', dpin: '0000'}).error, 'pin');
  assert.strictEqual(s.post({selfDelete: 1, dname: 'Nobody', dpin: '0000'}).error, 'user');
  const r = s.post({selfDelete: 1, dname: 'ben', dpin: '1111', av: '190'});
  assert.deepStrictEqual([r.ok, r.deleted, r.answers, r.reports], [true, true, 1, 1]);
  ['RAs', 'Answers', 'Reports', 'Progress data', 'By genus'].forEach(t => assert.ok(!/\bben\b/i.test(tabText(s, t)), t));
  assert.ok(/Ben/.test(tabText(s, 'Removed')));
  assert.strictEqual(s.get({name: 'Ben', pin: '1111'}).error, 'gone');
  // A retry after a lost reply: already deleted.
  assert.strictEqual(s.post({selfDelete: 1, dname: 'Ben', dpin: '1111'}).deleted, true);
  // Capped: 3 tries per name every 6 hours (this is Ben's 4th).
  assert.strictEqual(s.post({selfDelete: 1, dname: 'Ben', dpin: '1111'}).error, 'busy');
  // An archive is the trainer's, never deleted here.
  s.post({userArchive: {from: 'Ana', into: 'Ana-old'}, token: TOK});
  assert.strictEqual(s.post({selfDelete: 1, dname: 'Ana-old', dpin: '1234'}).error, 'pin');
});

test('v58 (Codex review #603): a self-deletion of a name merged meanwhile deletes nothing and says gone; archived page summaries are in no normal read', () => {
  const s = seed();
  s.post({userMerge: {from: 'Ana B', into: 'Ana', data: prog(4)}, token: TOK});
  assert.deepStrictEqual(s.post({selfDelete: 1, dname: 'Ana B', dpin: '5678'}), {ok: false, error: 'gone', into: 'Ana', v: SV});
  assert.ok(
    s.post({users: 1, token: TOK}).users.some(u => u.name === 'Ana'),
    'the joined account is kept'
  );
  s.post({dev: 'dev0000031', ename: 'Ben', epin: '1111', events: [{id: 'pa1', k: 'pages', t: Date.now(), av: '190', s: {quiz: [1, 60]}}]});
  assert.strictEqual(s.post({readEvents: 1, pages: 1, token: TOK}).rows.length, 1);
  s.post({userArchive: {from: 'Ben', into: 'Ben-old'}, token: TOK});
  assert.strictEqual(s.post({readEvents: 1, pages: 1, token: TOK}).rows.length, 0, 'not read by the normal views');
  assert.strictEqual(s.sheets.Pages.getLastRow(), 2, 'kept in the tab');
});

test('v58 (Codex review #603): each account has a generation (_acct) its saves keep; a name taken again after an archive gets another', () => {
  const s = seed(),
    acct = (n, pin) => s.get({name: n, pin}).acct;
  const a1 = acct('Ana', '1234');
  assert.ok(/^[0-9a-f]{12}$/.test(a1));
  s.post({name: 'Ana', pin: '1234', data: prog(5), summary: {}, at: 1});
  assert.strictEqual(acct('Ana', '1234'), a1, 'kept by a save that does not send it');
  s.post({userArchive: {from: 'Ana', into: 'Ana-old'}, token: TOK});
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}});
  assert.ok(acct('Ana', '1234') && acct('Ana', '1234') !== a1, 'a new generation');
  // A merge keeps the kept account's generation.
  const ben = acct('Ben', '1111');
  s.post({userMerge: {from: 'Ana B', into: 'Ben', data: {...prog(2), _acct: 'zzz'}}, token: TOK});
  assert.strictEqual(acct('Ben', '1111'), ben);
});

test('v58 (Codex review #603): a self-deletion from a device of another generation deletes nothing; an archive keeps its page summaries for its Journey', () => {
  const s = seed();
  const old = s.get({name: 'Ana', pin: '1234'}).acct;
  s.post({dev: 'dev0000041', ename: 'Ana', epin: '1234', events: [{id: 'pj1', k: 'pages', t: Date.now(), av: '190', s: {quiz: [1, 60]}}]});
  s.post({userArchive: {from: 'Ana', into: 'Ana-old'}, token: TOK});
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [ans('n1')]});
  assert.deepStrictEqual(s.post({selfDelete: 1, dname: 'Ana', dpin: '1234', dacct: old}), {ok: false, error: 'archived', v: SV});
  assert.ok(
    s.post({users: 1, token: TOK}).users.some(u => u.name === 'Ana'),
    'the fresh account is kept'
  );
  const ev = s.post({readEvents: 1, pages: 1, token: TOK});
  assert.deepStrictEqual([ev.rows.length, ev.arch.length], [0, 1]);
  // The fresh account's own device (its generation) deletes it.
  const now = s.get({name: 'Ana', pin: '1234'}).acct;
  assert.strictEqual(s.post({selfDelete: 1, dname: 'Ana', dpin: '1234', dacct: now}).deleted, true);
});

test('v58 (Codex review #603): archiving moves the name mentions in the log tabs, so deleting the archive leaves none', () => {
  const s = v55();
  s.post({userArchive: {from: 'Ben', into: 'Ben-old'}, token: TOK});
  assert.ok(!/\(Ben\)/.test(tabText(s, 'Events')) && /\(Ben-old\)/.test(tabText(s, 'Events')), 'Events names the archive');
  assert.match(tabText(s, 'Alerts'), /n:Ben-old \(3000/);
  s.post({userDelete: 'Ben-old', answers: true, token: TOK});
  ['Events', 'Alerts'].forEach(t => assert.ok(!/\bben\b/i.test(tabText(s, t)), `no "Ben" left in ${t}`));
});

test('v58 (Codex review #603): a report queued under an archived record never lands on the name taken again', () => {
  const s = seed();
  const old = s.get({name: 'Ana', pin: '1234'}).acct;
  s.post({userArchive: {from: 'Ana', into: 'Ana-old'}, token: TOK});
  // Sent while the name has no account: no reporter, never verified.
  s.post({rname: 'Ana', rpin: '1234', racct: old, reports: [rep('qa1')]});
  // The name taken again with the same code: a report of the old generation is not the new account's.
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [ans('n1')]});
  s.post({rname: 'Ana', rpin: '1234', racct: old, reports: [rep('qa2')]});
  const now = s.get({name: 'Ana', pin: '1234'}).acct;
  assert.notStrictEqual(now, old);
  s.post({rname: 'Ana', rpin: '1234', racct: now, reports: [rep('qa3')]});
  const row = id => s.sheets.Reports.rows.find(x => x && x[11] === id);
  assert.deepStrictEqual(
    ['qa1', 'qa2', 'qa3'].map(id => [row(id)[1], row(id)[2]]),
    [
      ['', 0],
      ['', 0],
      ['Ana', 1]
    ]
  );
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).reps, ['qa3'], 'only its own report thanked');
  assert.strictEqual(s.post({users: 1, token: TOK}).users.find(u => u.name === 'Ana').reports, 1);
});

test('v58 (Codex review #603): a save of another generation is refused under the lock, nothing logged or written', () => {
  const s = seed();
  const old = s.get({name: 'Ana', pin: '1234'}).acct;
  s.post({userArchive: {from: 'Ana', into: 'Ana-old'}, token: TOK});
  // Archived between the device's load and its save: the name has no account now.
  assert.deepStrictEqual(s.post({name: 'Ana', pin: '1234', acct: old, data: prog(9), summary: {}, answers: [ans('g1')], at: 1}), {
    ok: false,
    error: 'archived',
    v: SV
  });
  // Taken again with the same code meanwhile: the old device's save is refused too.
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [ans('n1')]});
  const now = s.get({name: 'Ana', pin: '1234'}).acct;
  assert.strictEqual(
    s.post({name: 'Ana', pin: '1234', acct: old, data: prog(9), summary: {}, answers: [ans('g2')], at: 1}).error,
    'archived'
  );
  const ids = s.sheets.Answers.rows.map(r => r[7]).join(); // the Id column
  assert.ok(!/g1|g2/.test(ids), 'no answer of the old generation logged');
  assert.notDeepStrictEqual(s.get({name: 'Ana', pin: '1234'}).data['reefid-sync-coral-progress'], prog(9)['reefid-sync-coral-progress']);
  // Its own generation saves as before.
  assert.strictEqual(s.post({name: 'Ana', pin: '1234', acct: now, data: prog(2), summary: {}, answers: [ans('n2')]}).ok, true);
});

test('v58 (Codex review #603): page summaries of another generation are filed under no player', () => {
  const s = seed();
  const old = s.get({name: 'Ana', pin: '1234'}).acct;
  s.post({userArchive: {from: 'Ana', into: 'Ana-old'}, token: TOK});
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [ans('n1')]});
  const now = s.get({name: 'Ana', pin: '1234'}).acct;
  const pg = id => ({id, k: 'pages', t: Date.now(), av: '190', s: {quiz: [1, 60]}});
  s.post({dev: 'dev0000051', ename: 'Ana', epin: '1234', eacct: old, events: [pg('po1')]});
  s.post({dev: 'dev0000051', ename: 'Ana', epin: '1234', eacct: now, events: [pg('po2')]});
  const P = s.sheets.Pages.rows.slice(1);
  assert.strictEqual(P.length, 2);
  const who = id => P.find(r => JSON.stringify(r).includes(id))[3];
  assert.strictEqual(who('po1'), '', 'the old generation: no player');
  assert.notStrictEqual(who('po2'), '', 'its own generation: the player');
});

test("v58 (Codex review #603): a save's reply carries the account generation, so the creating device knows it at once", () => {
  const s = loadCodeGs();
  const r = s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [ans('c1')]});
  assert.strictEqual(typeof r.acct, 'string');
  assert.strictEqual(r.acct, s.get({name: 'Ana', pin: '1234'}).acct);
  assert.strictEqual(s.post({name: 'Ana', pin: '1234', acct: r.acct, data: prog(2), summary: {}, answers: []}).acct, r.acct);
});

test('v58 (Codex review #603): a report of another generation has no reporter whatever its code (another code, throttled)', () => {
  const s = seed();
  const old = s.get({name: 'Ana', pin: '1234'}).acct;
  s.post({userArchive: {from: 'Ana', into: 'Ana-old'}, token: TOK});
  s.post({name: 'Ana', pin: '5678', data: prog(1), summary: {}, answers: [ans('n1')]});
  s.post({rname: 'Ana', rpin: '1234', racct: old, reports: [rep('qb1')]});
  // Throttled: wrong codes for the name, then the old device's report.
  for (let k = 0; k < 6; k++) s.get({name: 'Ana', pin: '000' + k});
  s.post({rname: 'Ana', rpin: '1234', racct: old, reports: [rep('qb2')]});
  const row = id => s.sheets.Reports.rows.find(x => x && x[11] === id);
  assert.deepStrictEqual(
    ['qb1', 'qb2'].map(id => [row(id)[1], row(id)[2]]),
    [
      ['', 0],
      ['', 0]
    ]
  );
  assert.strictEqual(s.post({users: 1, token: TOK}).users.find(u => u.name === 'Ana').reports, 0);
});

// v60 (Pierre, 2026-11-06: fish answers logged from the very first second; the sheet records an answer at any taxonomic
// level): five columns at the end of Answers, and only the replayed subject's rows (the corals') feed what the script
// computes, so a fish answer never moves a coral number.
const fishAns = (id, extra = {}) =>
  ans(id, {
    g: 't01',
    a: 't05',
    ok: 0,
    ph: 'fi464458713',
    ch: 't01 t05 t09 g:Chromis',
    s: 'fish',
    rk: 'family',
    tn: 'Damselfish',
    ta: 'Moorish Idol',
    sp: 'Pomacentrus moluccensis',
    ...extra
  });
test('v60 Answers: Subject, Rank, Taxon shown, Taxon answered, Species shown; readAnswers serves them at 17-21, after v59's Typed and Retyped right at 15-16', () => {
  const s = loadCodeGs(),
    T = 'ghp_write000000000000000000';
  s.post({
    name: 'Ana',
    pin: '1234',
    data: prog(1),
    summary: {},
    answers: [
      ans('f1'), // an app from before v60: no subject, a coral genus answer
      ans('f2', {s: 'coral', rk: 'genus', ty: 'Acropra', tr: 1}),
      fishAns('f3'),
      fishAns('f4', {g: 'g:Chromis', a: 'g:Dascyllus', rk: 'genus', tn: 'Chromis', ta: 'Dascyllus', m: 'quiz-duel|g:Chromis|g:Dascyllus'}),
      fishAns('f5', {s: '=x', rk: 'Bad rank', tn: '=HYPERLINK("x")', sp: '+1'})
    ]
  });
  const A = s.sheets.Answers;
  assert.deepStrictEqual([...A.rows[0].slice(15)], ['Typed', 'Retyped right', 'Subject', 'Rank', 'Taxon shown', 'Taxon answered', 'Species shown']);
  const R = A.rows.slice(1);
  assert.deepStrictEqual(R[0].slice(17), ['coral', 'genus', '', '', '']);
  assert.deepStrictEqual(R[1].slice(15), ['Acropra', 1, 'coral', 'genus', '', '', '']);
  assert.deepStrictEqual(R[2].slice(17), ['fish', 'family', 'Damselfish', 'Moorish Idol', 'Pomacentrus moluccensis']);
  assert.deepStrictEqual([R[2][2], R[2][3], R[2][11]], ['t01', 't05', 't01 t05 t09 g:Chromis'], 'the units as the app asks them');
  assert.deepStrictEqual(
    [R[3][2], R[3][3], R[3][5], R[3][18], R[3][19]],
    ['g:Chromis', 'g:Dascyllus', 'quiz-duel|g:Chromis|g:Dascyllus', 'genus', 'Chromis']
  );
  // Nothing that is not a subject id, a rank word or a name is stored (no formula either).
  assert.deepStrictEqual(R[4].slice(17, 20), ['coral', 'genus', '']);
  assert.strictEqual(R[4][21], '');
  const rows = s.post({readAnswers: 1, token: T}).rows;
  assert.ok(rows.every(r => r.length === 22));
  assert.deepStrictEqual([rows[0].slice(15, 17), rows[1].slice(15, 17)], [['', null], ['Acropra', 1]], 'v59 Typed and Retyped right at 15-16');
  assert.deepStrictEqual(
    rows.map(r => r.slice(17, 20)),
    [
      ['coral', 'genus', ''],
      ['coral', 'genus', ''],
      ['fish', 'family', 'Damselfish'],
      ['fish', 'genus', 'Chromis'],
      ['coral', 'genus', '']
    ]
  );
  assert.strictEqual(rows[2][21], 'Pomacentrus moluccensis');
});

test('v60: a tab from before v60 (15 columns, no cells beyond) reads the new fields as the default subject', () => {
  const s = loadCodeGs(),
    T = 'ghp_write000000000000000000';
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [ans('o1'), ans('o2')]});
  const A = s.sheets.Answers;
  A.rows.forEach(x => (x.length = 15));
  A.getMaxColumns = () => 15; // the real grid: a read past it throws
  const get = A.getRange;
  A.getRange = (r, c, nr, nc) => {
    if (c + (nc || 1) - 1 > A.getMaxColumns()) throw new Error('The coordinates of the range are outside the dimensions of the sheet.');
    return get(r, c, nr, nc);
  };
  A.insertColumnsAfter = (at, n) => (A.getMaxColumns = () => at + n);
  assert.deepStrictEqual(
    s.post({readAnswers: 1, token: T}).rows.map(r => r.slice(15)),
    [
      ['', null, 'coral', 'genus', '', '', ''],
      ['', null, 'coral', 'genus', '', '', '']
    ]
  );
  assert.strictEqual(s.get({stats: '1'}).ok, true);
  // The next answer logged adds the columns and their header.
  s.post({name: 'Ana', pin: '1234', data: prog(2), summary: {}, answers: [fishAns('o3')], at: 1});
  assert.strictEqual(A.rows[0][17], 'Subject');
  assert.strictEqual(A.rows[3][17], 'fish');
});

test('v60: fish rows move no coral number: photo ratings, offsets, confusions, hold, replay, the admin list', () => {
  const T = 'ghp_write000000000000000000',
    coral = [...Array(30)].map((_, i) =>
      ans('c' + i, {ok: i % 3 ? 1 : 0, a: i % 3 ? 'Acropora' : 'Montipora', ch: 'Acropora Montipora', e: 0.6, th: 0})
    );
  const run = withFish => {
    const s = loadCodeGs(withData());
    const fish = withFish
      ? [...Array(40)].map((_, i) => fishAns('x' + i, {ph: 'acropora-1 fi' + i, ok: i % 2, e: 0.9, ch: 'Acropora Montipora t01'}))
      : [];
    s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: [...coral, ...fish]});
    s.post({name: 'Bea', pin: '1234', data: prog(1), summary: {}, answers: coral.map(a => ({...a, id: 'b' + a.id}))});
    const st = s.get({stats: '1'}),
      u = s.post({users: 1, token: T}).users.find(x => x.name === 'Ana'),
      g = s.get({name: 'Ana', pin: '1234', rv: 0});
    return {
      photos: st.photos,
      conf: st.conf,
      mem: st.mem,
      gd: st.gd,
      hold: g.hold,
      n: g.replay && g.replay.n,
      answers: u.answers,
      mix: u.mix
    };
  };
  const a = run(false),
    b = run(true);
  assert.deepStrictEqual(b, a);
  assert.strictEqual(a.n, 30, 'the replay counts the coral rows only');
});
