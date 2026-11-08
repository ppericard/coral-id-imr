// The device on every answer (Pierre, 2026-11-08, Q312: "Oui, cette nuit"): the Answers tab's last column, Device, holds
// the anonymous id of the device that sent the answer (sync.js devId, the Device of its Events and Pages rows), for a
// signed-in player's save and an anonymous send alike; an app before it sends none and its rows are logged as before; no
// reader serves it or counts differently with it; a deleted account's kept answers lose it (rule D7).
const test = require('node:test'),
  assert = require('node:assert'),
  vm = require('vm');
const {loadCodeGs} = require('./gas.js');

const TOK = 'ghp_write000000000000000000',
  DEV = 'k3v9q0x7mz',
  DEV2 = 'p0p0p0p0p0';
const ans = (id, extra = {}) => ({
  id,
  t: `2026-11-01T00:${String(10 + Number(id.slice(1)))}:00Z`,
  g: 'Acropora',
  a: Number(id.slice(1)) % 3 ? 'Acropora' : 'Montipora',
  ok: Number(id.slice(1)) % 3 ? 1 : 0,
  m: 'quiz',
  ph: `pic-${Number(id.slice(1)) % 4}`,
  ch: 'Acropora Montipora Porites Pocillopora',
  e: 0.5,
  ...extra
});
const save = (s, name, L, extra = {}) => s.post({name, pin: '1234', data: {}, summary: {}, answers: L, ...extra});
const devs = s => {
  const R = s.sheets.Answers.rows,
    c = R[0].indexOf('Device');
  return R.slice(1).map(r => [r[0], r[7], r[c] ?? '']);
};

test('Code.gs: Device is the last Answers column; every column before it stays where it was', () => {
  const s = loadCodeGs();
  save(s, 'Ana', [ans('a1')], {dev: DEV});
  const H = s.sheets.Answers.rows[0],
    LOG = vm.runInContext('LOG', s.ctx);
  assert.strictEqual(H.at(-1), 'Device');
  assert.strictEqual(H.length, 25);
  assert.deepStrictEqual(
    [...H.slice(0, 24)],
    [
      'Name',
      'Time',
      'Genus shown',
      'Answered',
      'Right',
      'Mode',
      'Photos',
      'Id',
      'Expected',
      'Ability',
      'New photos',
      'Choices',
      'Seconds',
      'Enlarged',
      'UTC offset',
      'Typed',
      'Retyped right',
      'Subject',
      'Rank',
      'Taxon shown',
      'Taxon answered',
      'Species shown',
      'Scoring',
      'Rejected tries'
    ],
    'never move existing columns'
  );
  assert.deepStrictEqual([...H], [...LOG]);
});

test("Code.gs: a save's and an anonymous send's dev go in each of their rows", () => {
  const s = loadCodeGs();
  save(s, 'Ana', [ans('a1'), ans('a2')], {dev: DEV});
  assert.ok(s.post({anon: 'abcdefghij', anonAnswers: [ans('a3'), ans('a4')], av: '1-x', dev: DEV2}).log);
  assert.deepStrictEqual(devs(s), [
    ['Ana', 'a1', DEV],
    ['Ana', 'a2', DEV],
    ['~anon abcdefghij', 'a3', DEV2],
    ['~anon abcdefghij', 'a4', DEV2]
  ]);
  // Signing in on that device later: its anonymous rows become the name's and keep their device.
  save(s, 'Ben', [ans('a5')], {dev: DEV2, anon: 'abcdefghij'});
  assert.deepStrictEqual(
    devs(s).filter(r => r[0] === 'Ben'),
    [
      ['Ben', 'a3', DEV2],
      ['Ben', 'a4', DEV2],
      ['Ben', 'a5', DEV2]
    ]
  );
});

test("Code.gs: an old app's rows (no dev) are accepted as before, Device blank; anything but an id is blank", () => {
  const s = loadCodeGs();
  assert.strictEqual(save(s, 'Ana', [ans('a1')]).ok, true, 'a save without dev');
  assert.ok(s.post({anon: 'abcdefghij', anonAnswers: [ans('a2')]}).log, 'an anonymous send without dev');
  for (const [i, bad] of ['=SUM(A1)', 'ABCDEFGHIJ', 'short', 'x'.repeat(17), 12345678901, {a: 1}, '+abcdefghij'].entries())
    assert.strictEqual(save(s, 'Ana', [ans('b' + i)], {dev: bad}).ok, true, String(bad));
  assert.deepStrictEqual(
    devs(s).map(r => r[2]),
    Array(9).fill(''),
    'blank, never a formula'
  );
  // A tab made before the column (24 columns): the next answer adds its header, the older rows read blank.
  const t = loadCodeGs();
  save(t, 'Ana', [ans('c1')]);
  t.sheets.Answers.rows[0].length = 24;
  t.sheets.Answers.rows[1].length = 24;
  save(t, 'Ana', [ans('c2')], {dev: DEV});
  assert.strictEqual(t.sheets.Answers.rows[0][24], 'Device');
  assert.deepStrictEqual(
    devs(t).map(r => r[2]),
    ['', DEV]
  );
});

test("Code.gs: a merged name's answers go to the name it joined with their device", () => {
  const s = loadCodeGs();
  save(s, 'Ana', [ans('a1')], {dev: DEV});
  save(s, 'Ben', [ans('a2')], {dev: DEV2});
  const d = s.post({userData: 'Ben', token: TOK});
  assert.strictEqual(s.post({userMerge: {from: 'Ana', into: 'Ben', data: d.data, at: d.rev}, token: TOK}).ok, true);
  assert.deepStrictEqual(
    devs(s).map(r => [r[0], r[2]]),
    [
      ['Ben', DEV],
      ['Ben', DEV2]
    ]
  );
  // Ana's device, still signed in with the merged name: its answers go to Ben, with its id.
  const r = save(s, 'Ana', [ans('a3')], {dev: DEV});
  assert.strictEqual(r.error, 'gone');
  assert.deepStrictEqual(devs(s).at(-1), ['Ben', 'a3', DEV]);
});

test("Code.gs: a deleted account's kept answers lead back to no device (rule D7); deleted with them, gone", () => {
  const s = loadCodeGs();
  save(s, 'Ana', [ans('a1'), ans('a2')], {dev: DEV});
  save(s, 'Ben', [ans('a3')], {dev: DEV2});
  assert.ok(s.post({anon: 'abcdefghij', anonAnswers: [ans('a4')], dev: DEV}).log);
  assert.strictEqual(s.post({userDelete: 'Ana', token: TOK}).answers, 2);
  assert.deepStrictEqual(
    devs(s).map(r => [r[0].replace(/^~deleted .*/, '~deleted'), r[1], r[2]]),
    [
      ['~deleted', 'a1', ''],
      ['~deleted', 'a2', ''],
      ['Ben', 'a3', DEV2],
      ['~anon abcdefghij', 'a4', DEV]
    ],
    "only the deleted account's rows are blanked"
  );
  assert.strictEqual(s.post({userDelete: 'Ben', answers: true, token: TOK}).answers, 1);
  assert.ok(!devs(s).some(r => r[2] === DEV2));
});

test('Code.gs: no reader serves the device or counts differently with it', () => {
  const sheet = dev => {
    const s = loadCodeGs(),
      L = Array.from({length: 14}, (_, i) => ans('a' + i));
    save(s, 'Ana', L.slice(0, 10), dev ? {dev: DEV} : {});
    s.post({anon: 'abcdefghij', anonAnswers: L.slice(10), ...(dev ? {dev: DEV2} : {})});
    return s;
  };
  const a = sheet(false),
    b = sheet(true),
    run = (s, x) => vm.runInContext(x, s.ctx);
  assert.ok(devs(b).every(r => r[2]) && devs(a).every(r => !r[2]));
  const ra = a.post({readAnswers: 1, token: TOK}).rows,
    rb = b.post({readAnswers: 1, token: TOK}).rows;
  assert.deepStrictEqual(
    rb.map(r => r.slice(1)),
    ra.map(r => r.slice(1))
  );
  assert.ok(!JSON.stringify(rb).includes(DEV) && !JSON.stringify(rb).includes(DEV2), 'readAnswers serves no device');
  assert.deepStrictEqual(b.get({stats: '1'}), a.get({stats: '1'}));
  assert.deepStrictEqual(b.post({readStats: 1, token: TOK}).photos, a.post({readStats: 1, token: TOK}).photos);
  assert.deepStrictEqual(b.get({name: 'Ana', pin: '1234'}).hold, a.get({name: 'Ana', pin: '1234'}).hold);
  assert.strictEqual(run(b, 'answerRows_().length'), run(a, 'answerRows_().length'));
  const ua = a.post({users: 1, token: TOK}).users[0],
    ub = b.post({users: 1, token: TOK}).users[0];
  for (const k of ['answers', 'right', 'days', 'modes', 'recent', 'mix']) assert.deepStrictEqual(ub[k], ua[k], k);
});
