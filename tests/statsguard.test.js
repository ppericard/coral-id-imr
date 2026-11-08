// Sheet vNEXT (ROADMAP "Security follow-ups", Pierre 2026-11-08): the admin leaves a player or a device not signed in out
// of the statistics (Code.gs sxSet_, statsExclude), and an answer whose photos are of another unit rates no photo
// (photoCheck_, photoAlert_), the answer itself always kept. Against the in-memory sheet (tests/gas.js).
const test = require('node:test'),
  assert = require('node:assert');
const {loadCodeGs} = require('./gas.js');

const TOK = 'ghp_write000000000000000000';
const at = i => new Date(Date.UTC(2026, 10, 1, 0, 0, i)).toISOString();
const ans = (id, extra = {}) => ({id, t: at(0), g: 'Acropora', a: 'Acropora', ok: 1, m: 'quiz', ph: 'acropora-wide-1', ...extra});
// Twelve right answers: clearly above chance (TRUST), so the sender rates the photos.
const run = (k, extra = {}) => Array.from({length: 12}, (_, i) => ans(k + i, {t: at(i), ...extra}));
// The games' photos per unit as pools_ caches them (pool1<subject>): two coral genera and one fish unit.
const POOL = {
  coral: {Acropora: [['acropora-wide-1', 'acropora-medium-1']], Porites: [['porites-wide-9']]},
  fish: {'f:pomacentridae': [['fi123']]}
};
const pools = s => Object.entries(POOL).forEach(([k, v]) => (s.cache['pool1' + k] = JSON.stringify(v)));
// Stats are cached 10 minutes: drop them (and put the pools back) before reading again.
// How many answers rated a photo (stats_ photos [difficulty, weighed, right, answers]; 0 when none or never shown).
const rated = (st, f) => (st.photos[f] || [0, 0, 0, 0])[3];
const fresh = s => {
  for (const k of Object.keys(s.cache)) delete s.cache[k];
  pools(s);
  return s.post({readStats: 1, token: TOK});
};

test('an excluded player or device rates nothing, keeps their own numbers, and comes back when counted again', () => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: run('a')});
  s.post({anon: 'device0001', anonAnswers: run('d', {ph: 'acropora-medium-1'})});
  const id = n => s.ctx.aid_(n);
  let st = fresh(s);
  assert.strictEqual(rated(st, 'acropora-wide-1'), 12);
  assert.strictEqual(rated(st, 'acropora-medium-1'), 12);
  // Admin only, a well-formed id only.
  assert.strictEqual(s.post({statsExclude: id('Ana'), on: true}).error, 'token');
  assert.strictEqual(s.post({statsExclude: '=HYPERLINK(1)', on: true, token: TOK}).error, 'input');
  let r = s.post({statsExclude: id('Ana'), on: true, token: TOK});
  assert.deepStrictEqual(r.excluded, [id('Ana')]);
  r = s.post({statsExclude: id('~anon device0001'), on: true, token: TOK});
  assert.deepStrictEqual(r.excluded.sort(), [id('Ana'), id('~anon device0001')].sort());
  assert.ok(s.props.ROSTER_AT, 'the Analyses report is marked stale (rosterChanged_)');
  st = fresh(s);
  assert.strictEqual(rated(st, 'acropora-wide-1'), 0, "the excluded player's photo is rated by nobody");
  assert.strictEqual(rated(st, 'acropora-medium-1'), 0, "the excluded device's photo too");
  assert.strictEqual(st.skip.excluded, 24);
  assert.ok(st.ras[id('Ana')], 'their own level stays');
  // Their answers stay in the log, served with the list so the Analyses report can leave them out.
  const a = s.post({readAnswers: 1, token: TOK});
  assert.strictEqual(a.rows.length, 24);
  assert.deepStrictEqual(a.excluded.sort(), [id('Ana'), id('~anon device0001')].sort());
  assert.deepStrictEqual(s.post({users: 1, token: TOK}).excluded.sort(), a.excluded.sort(), 'Players gets the list');
  // Twice is once; counted again, they rate the photos again.
  s.post({statsExclude: id('Ana'), on: true, token: TOK});
  assert.strictEqual(s.sheets['Stats excluded'].rows.slice(1).filter(x => x[0]).length, 2);
  s.post({statsExclude: id('Ana'), on: false, token: TOK});
  st = fresh(s);
  assert.strictEqual(rated(st, 'acropora-wide-1'), 12);
  assert.strictEqual(rated(st, 'acropora-medium-1'), 0);
});

test('rule D7: a removed account leaves no row; answers kept anonymously stay out', () => {
  const s = loadCodeGs(),
    id = n => s.ctx.aid_(n);
  s.post({name: 'Ben', pin: '1111', data: {}, summary: {}, answers: run('b')});
  s.post({name: 'Cleo', pin: '2222', data: {}, summary: {}, answers: run('c')});
  s.post({statsExclude: id('Ben'), on: true, token: TOK});
  s.post({statsExclude: id('Cleo'), on: true, token: TOK});
  s.post({userDelete: 'Ben', token: TOK}); // answers kept as "~deleted <id>"
  s.post({userDelete: 'Cleo', answers: true, token: TOK}); // everything goes
  const L = s.post({users: 1, token: TOK}).excluded;
  assert.deepStrictEqual(L, [id('~deleted ' + id('Ben'))]);
  const st = fresh(s);
  assert.strictEqual(rated(st, 'acropora-wide-1'), 0, 'the kept answers still rate nothing');
});

test('an answer whose photos are of another unit is kept, rates no photo, and is flagged once per window', () => {
  const s = loadCodeGs();
  pools(s);
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: run('a')});
  // Porites photos (and a fish photo) logged under Acropora: a bot, or a tampered app.
  s.post({name: 'Bot', pin: '1111', data: {}, summary: {}, answers: run('p', {ph: 'porites-wide-9'})});
  s.post({anon: 'device0002', anonAnswers: run('f', {ph: 'fi123'})});
  const alerts = () => (s.sheets.Alerts ? s.sheets.Alerts.rows.slice(1).map(r => String(r[1])) : []);
  assert.deepStrictEqual(
    alerts().map(x => x.replace(/: \S+ \(/, ': <id> (')),
    ['photos not of the unit shown: <id> (12 of 12 answers)', 'photos not of the unit shown: <id> (12 of 12 answers)']
  );
  assert.ok(!alerts().some(x => /Bot/.test(x)), 'the sender by its admin id, never a name');
  s.post({name: 'Bot', pin: '1111', data: {}, summary: {}, answers: run('q', {ph: 'porites-wide-9'})});
  assert.strictEqual(alerts().length, 2, 'one line per sender and window');
  // Nothing lost: every answer is logged and counts for its player.
  assert.strictEqual(s.post({readAnswers: 1, token: TOK}).rows.length, 48);
  // Photos that are of the unit, by the pool or by their file name (an older app, a photo moved since), or in no pool
  // (unsure), still rate; the bot's never do.
  s.post({name: 'Dio', pin: '3333', data: {}, summary: {}, answers: [...run('x', {ph: 'acropora-wide-77'}), ...run('y', {ph: 'zzz-1'})]});
  const st = fresh(s);
  assert.strictEqual(rated(st, 'acropora-wide-1'), 12);
  assert.strictEqual(rated(st, 'porites-wide-9'), 0);
  assert.strictEqual(rated(st, 'fi123'), 0);
  assert.strictEqual(rated(st, 'acropora-wide-77'), 12, 'named after its genus');
  assert.strictEqual(rated(st, 'zzz-1'), 12, 'in no pool: unsure, never flagged');
  assert.strictEqual(st.skip.photos, 36);
  assert.ok(st.ras[s.ctx.aid_('Bot')], "the bot's answers still give it a level");
});

test('no pool read: nothing is checked, nothing is flagged', () => {
  const s = loadCodeGs();
  s.post({name: 'Bot', pin: '1111', data: {}, summary: {}, answers: run('p', {ph: 'porites-wide-9'})});
  assert.ok(!s.sheets.Alerts, 'no Alerts line without a cached pool');
  const st = s.post({readStats: 1, token: TOK});
  assert.strictEqual(rated(st, 'porites-wide-9'), 12);
  assert.strictEqual(st.skip.photos, 0);
});
