// Sync script (tools/sync/Code.gs) against an in-memory sheet: node --test tests/
const test = require('node:test'), assert = require('node:assert');
const {loadCodeGs} = require('./gas.js');

const prog = n => ({'imr-coral-progress': JSON.stringify({Acropora: {ok: n, ko: 0}})});
const ans = (id, extra = {}) => ({id, t: '2026-11-01T00:00:00Z', g: 'Acropora', a: 'Acropora', ok: 1, m: 'quiz', ph: 'acropora-1 acropora-2', ...extra});

test('new RA, save and load back, with revision', () => {
  const s = loadCodeGs();
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}), {ok: true, found: false, v: 8});
  const r = s.post({name: 'Ana', pin: '1234', data: prog(3), summary: {}, answers: [ans('a1')]});
  assert.strictEqual(r.ok, true); assert.strictEqual(r.log, true); assert.strictEqual(r.rev, 1);
  const g = s.get({name: 'ana', pin: '1234'});
  assert.strictEqual(g.found, true); assert.strictEqual(g.rev, 1); assert.deepStrictEqual(g.data, prog(3));
});

test('a stale write is refused but its answers are kept', () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}, answers: []});
  const r = s.post({name: 'Ana', pin: '1234', data: prog(2), summary: {}, answers: [ans('b1')], at: 0});
  assert.strictEqual(r.error, 'stale'); assert.strictEqual(r.log, true); assert.strictEqual(r.rev, 1);
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
  const s = loadCodeGs(), ps = {};
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
  assert.strictEqual(g.rev, 0); assert.deepStrictEqual(g.data, prog(1));
});

test('names and answer fields never become formulas', () => {
  const s = loadCodeGs();
  s.post({name: '=IMPORTDATA("x")', pin: '1234', data: prog(1), summary: {genera: {Acropora: 'ok'}}, answers: [ans('c1', {g: '=HYPERLINK("x")', m: '+bad', ph: '=x'})]});
  const all = Object.values(s.sheets).flatMap(sh => sh.rows.flat());
  assert.ok(!all.some(v => v && v.formula && !/^=QUERY/.test(v.formula)), 'no formula except the Activity QUERY');
  const row = s.sheets.Answers.getRange(2, 1, 1, 7).getValues()[0];
  assert.strictEqual(row[0], '=IMPORTDATA("x")'); assert.strictEqual(row[2], ''); assert.strictEqual(row[5], ''); assert.strictEqual(row[6], '');
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
  const a = s.get({answers: '1'});
  const id = a.rows[0][0];
  assert.strictEqual(a.me, undefined);
  assert.ok(s.props.ANON_SALT);
  const pub = require('crypto').createHash('sha256').update('imr-coral-id|anon|ana').digest('base64').slice(0, 8);
  assert.notStrictEqual(id, pub, 'not the old public-salt id');
  assert.strictEqual(s.get({answers: '1', name: 'Ana', pin: '1234'}).me, id);
  assert.strictEqual(s.get({answers: '1', name: 'Ana', pin: '9999'}).me, undefined);
  assert.ok(a.players[id]);
  assert.ok(s.get({stats: '1'}).ras[id]);
});

const rep = (id, extra = {}) => ({id, t: '2026-11-01T00:00:00Z', why: 'wrong', g: 'Acropora', a: 'Montipora', fix: 'Montipora', note: 'corallites', m: 'quiz', ph: 'acropora-1 acropora-2', ...extra});

test('reports: logged once, reporter verified by code, never mistaken for a progress write', () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(3), summary: {}});
  assert.deepStrictEqual(s.post({rname: 'Ana', rpin: '1234', reports: [rep('r1')]}), {ok: true, rep: true, v: 8});
  s.post({rname: 'Ana', rpin: '1234', reports: [rep('r1'), rep('r2', {why: 'multi', fix: ''})]});
  s.post({rname: 'Bob', rpin: '', reports: [rep('r3', {why: 'bogus'}), rep('r4', {why: 'photo', note: '=HYPERLINK("x")'})]});
  const R = s.sheets.Reports;
  assert.strictEqual(R.getLastRow(), 4, 'r1 once, r2, r4; r3 has no valid reason');
  assert.deepStrictEqual(R.getRange(2, 2, 1, 5).getValues()[0], ['Ana', 1, 'Wrong answer', 'Acropora', 'Montipora']);
  assert.deepStrictEqual(R.getRange(4, 2, 1, 2).getValues()[0], ['Bob', 0]);
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).data, prog(3), 'progress untouched');
});

test('reports list: only a GitHub token that can write to the repo, checked once', () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: prog(1), summary: {}});
  s.post({rname: 'Ana', rpin: '1234', reports: [rep('r1'), rep('r2', {why: 'other'})]});
  assert.strictEqual(s.post({readReports: 1}).error, 'token');
  assert.strictEqual(s.post({readReports: 1, token: 'ghp_readonly0000000000000'}).error, 'token');
  assert.strictEqual(s.post({readReports: 1, token: 'bad_token_0000000000000000'}).error, 'token');
  const a = s.post({readReports: 1, token: 'ghp_write000000000000000000'});
  assert.strictEqual(a.rows.length, 2); assert.strictEqual(a.rows[0][0], 'r2', 'newest first');
  assert.deepStrictEqual(a.rows[1].slice(2, 9), ['Ana', 1, 'wrong', 'Acropora', 'Montipora', 'Montipora', 'corallites']);
  const n = s.fetched.length; s.post({readReports: 1, token: 'ghp_write000000000000000000'});
  assert.strictEqual(s.fetched.length, n, 'remembered for 10 minutes');
  assert.ok(!JSON.stringify(s.cache).includes('ghp_write'), 'the token itself is never stored');
  assert.strictEqual(s.get({reports: '1', name: 'Ana', pin: '1234'}).found, true, 'no GET for reports');
});
