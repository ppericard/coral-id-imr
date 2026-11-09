// The seedling 🌱 in the admin's own name (sheet v123; Pierre, 2026-11-09, Q328: "an icon the others are not allowed to
// have"): no player can make a name holding it or one of its look-alikes (core.js reservedName: the sign-up and an archive
// name are refused as reserved); the admin page renames its own account with it or back (Code.gs users_ userSeed, with
// the GitHub token and the account's code), moving the whole record and leaving a Removed row so the account's other
// devices follow; a name it frees can never be taken again (rule D7). Made-up names; the in-memory sheet (tests/gas.js),
// nothing leaves this process (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  vm = require('vm');
const C = require('../core.js');
const {loadCodeGs, madeBefore} = require('./gas.js');

const TOK = 'ghp_write000000000000000000',
  SEED = C.SEED;
const data = n => ({[C.subjKey('coral', 'progress')]: JSON.stringify({Acropora: {ok: n, ko: 0, pg: 0.6}})});
const ans = (id, i) => ({
  id,
  t: new Date(Date.UTC(2026, 10, 3, 6, 0, i)).toISOString(),
  g: 'Acropora',
  a: 'Acropora',
  ok: 1,
  m: 'quiz',
  ph: 'acropora-1'
});
const play = (s, name, pin, n = 3, answers = []) =>
  s.post({name, pin, data: data(n), summary: {genera: {Acropora: 'mid'}, board: 1}, answers});
const names = s => s.sheets.RAs.rows.slice(1).map(r => r[0]);
const seed = (s, aname, apin, on, token = TOK) => s.post({userSeed: on, aname, apin, token});

test('the seedling and its look-alikes: refused for a new account or an archive name; an account that has one keeps working', () => {
  const {SEED_LOOKALIKES, reservedName} = C;
  assert.ok(SEED_LOOKALIKES.includes(SEED));
  // 🌱 🌿 🪴 ☘ 🍀 🍃, alone, with the emoji variation selector, inside a word or after a name.
  SEED_LOOKALIKES.forEach(e =>
    [e, e + '️', 'Bob ' + e, e + 'Bob', 'B' + e + 'ob', 'Ana B. ' + e + e].forEach(n =>
      assert.strictEqual(reservedName(n), true, JSON.stringify(n))
    )
  );
  // Other emoji, accents and scripts are names like any other.
  ['Ana 🐠', 'Bob 🌸', '🌊 Cy', 'Zoë', 'José 🌴', '李', 'Ana B.', 'Rice 🌾'].forEach(n => assert.strictEqual(reservedName(n), false, n));
  const s = loadCodeGs();
  madeBefore(s, () => assert.ok(play(s, 'Old 🍀', '1111').ok));
  ['🌱', 'Ana 🌱', 'Ana🌿', '☘️ Cy', 'Bob 🍀', '🪴', 'Dee 🍃'].forEach(name =>
    assert.strictEqual(play(s, name, '1234').error, 'reserved', name)
  );
  assert.deepStrictEqual(names(s), ['Old 🍀']);
  // The existing account loads and saves as before.
  assert.strictEqual(s.get({name: 'Old 🍀', pin: '1111'}).found, true);
  assert.ok(play(s, 'Old 🍀', '1111').ok);
  // An archive under a look-alike: refused.
  assert.strictEqual(s.post({userArchive: {from: 'Old 🍀', into: 'Old 🌱 archive'}, token: TOK}).error, 'reserved');
});

test('seedName: the seedling after the name, once; back without it', () => {
  assert.strictEqual(C.seedName('Ana B.', true), 'Ana B. ' + SEED);
  assert.strictEqual(C.seedName(' Ana B. ', true), 'Ana B. ' + SEED);
  assert.strictEqual(C.seedName('Ana B. ' + SEED, true), 'Ana B. ' + SEED);
  assert.strictEqual(C.seedName('Ana B. ' + SEED, false), 'Ana B.');
  assert.strictEqual(C.seedName('Ana B.' + SEED + '️', false), 'Ana B.');
  assert.strictEqual(C.seedName('Ana B.', false), 'Ana B.');
});

test("the admin's own account gets the seedling: token and code checked, the whole record moves, its devices follow", () => {
  const s = loadCodeGs();
  assert.ok(play(s, 'Ana B.', '1234', 3, [ans('a1', 1), ans('a2', 2)]).ok);
  assert.ok(play(s, 'Cy D.', '5678').ok);
  assert.ok(s.post({reports: [{id: 'r1', t: 1, why: 'wrong', g: 'Acropora'}], rname: 'Ana B.', rpin: '1234'}).ok);
  // Refused: no token, a wrong token, a wrong code, an unknown name, no code; nothing changes.
  assert.strictEqual(seed(s, 'Ana B.', '1234', true, null).error, 'token');
  assert.strictEqual(seed(s, 'Ana B.', '1234', true, 'ghp_wrong00000000000000000').error, 'token');
  assert.strictEqual(seed(s, 'Ana B.', '9999', true).error, 'pin');
  assert.strictEqual(seed(s, 'Nobody', '1234', true).error, 'user');
  assert.strictEqual(seed(s, 'Ana B.', '', true).error, 'input');
  assert.strictEqual(seed(s, 'Ana B.', '1234', false).error, 'same');
  // A player's own save can never make it: the name is refused at sign-up (above), and a save carrying userSeed without
  // the token is the admin's request, refused.
  assert.strictEqual(
    s.post({name: 'Cy D.', pin: '5678', data: data(1), summary: {}, answers: [], userSeed: true, aname: 'Cy D.', apin: '5678'}).error,
    'token'
  );
  assert.deepStrictEqual(names(s), ['Ana B.', 'Cy D.']);
  // Each subject's replay record (its first replay's floor reference among it; Codex review #835), kept as it is.
  const tabs = vm.runInContext('rplTabs_()', s.ctx);
  assert.ok(tabs.length >= 2, tabs.join());
  tabs.forEach(t =>
    vm.runInContext(
      `sheet_(${JSON.stringify(t)}, RPL.HEAD).appendRow(['Ana B.', 7, 2, 0, 0, '{"F":1}']); sheet_(${JSON.stringify(t)}, RPL.HEAD).appendRow(['Cy D.', 7, 0, 0, 0, '{}'])`,
      s.ctx
    )
  );
  // Given: the record moves whole under the new name, with the same code.
  const r = seed(s, 'ana b.', '1234', true);
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.strictEqual(r.name, 'Ana B. ' + SEED);
  assert.deepStrictEqual(names(s), ['Ana B. ' + SEED, 'Cy D.']);
  const ld = s.get({name: 'Ana B. ' + SEED, pin: '1234'});
  assert.strictEqual(ld.found, true);
  assert.deepStrictEqual(JSON.parse(ld.data[C.subjKey('coral', 'progress')]), {Acropora: {ok: 3, ko: 0, pg: 0.6}});
  assert.ok(s.sheets.Answers.rows.slice(1).every(x => x[0] === 'Ana B. ' + SEED || x[0] !== 'Ana B.'));
  assert.strictEqual(s.sheets.Answers.rows.slice(1).filter(x => x[0] === 'Ana B. ' + SEED).length, 2);
  assert.ok(s.sheets.Reports.rows.slice(1).every(x => x[1] !== 'Ana B.'));
  assert.strictEqual(s.get({name: 'Ana B. ' + SEED, pin: '0000'}).error, 'pin');
  tabs.forEach(t =>
    assert.deepStrictEqual(
      s.sheets[t].rows.slice(1).map(x => [x[0], x[5]]),
      [
        ['Ana B. ' + SEED, '{"F":1}'],
        ['Cy D.', '{}']
      ],
      t
    )
  );
  // The board and the player list show the new name.
  assert.deepStrictEqual(
    s.get({board: '1'}).rows.map(x => x[0]),
    ['Ana B. ' + SEED, 'Cy D.']
  );
  assert.deepStrictEqual(
    s
      .post({users: 1, token: TOK})
      .users.map(u => u.name)
      .sort(),
    ['Ana B. ' + SEED, 'Cy D.']
  );
  // Another device still signed in under the old name: told to sign in under the new one; its answers follow it.
  const g = s.get({name: 'Ana B.', pin: '1234'});
  assert.deepStrictEqual([g.error, g.into], ['gone', 'Ana B. ' + SEED]);
  const sv = play(s, 'Ana B.', '1234', 4, [ans('a3', 3)]);
  assert.deepStrictEqual([sv.error, sv.into], ['gone', 'Ana B. ' + SEED]);
  assert.strictEqual(s.sheets.Answers.rows.slice(1).filter(x => x[0] === 'Ana B. ' + SEED).length, 3);
  // Nobody else takes it: the name exists (another code is refused), and once given back, deleted or archived, the
  // sign-up refuses it.
  assert.strictEqual(play(s, 'Ana B. ' + SEED, '4321').error, 'pin');
  // Taken back (Remove): the old name is live again, with its code; its earlier Removed row is gone.
  const back = seed(s, 'Ana B. ' + SEED, '1234', false);
  assert.deepStrictEqual([back.ok, back.name], [true, 'Ana B.']);
  assert.strictEqual(s.get({name: 'Ana B.', pin: '1234'}).found, true);
  assert.ok(play(s, 'Ana B.', '1234').ok);
  assert.deepStrictEqual(
    s.sheets.Removed.rows.slice(1).map(x => [x[0], x[2]]),
    [['Ana B. ' + SEED, 'Ana B.']]
  );
  assert.strictEqual(play(s, 'Ana B. ' + SEED, '4321').error, 'reserved', 'a seedling name freed is never taken again');
  // Errors: a name taken, too long.
  assert.ok(play(s, 'Eve F.', '2222').ok);
  assert.ok(madeBefore(s, () => play(s, 'Eve F. ' + SEED, '3333')).ok);
  assert.strictEqual(seed(s, 'Eve F.', '2222', true).error, 'exists');
  const long = 'L'.repeat(39);
  assert.ok(play(s, long, '2222').ok);
  assert.strictEqual(seed(s, long, '2222', true).error, 'long');
});

test('a seedling name freed by a delete, a merge or an archive can never be taken again', () => {
  const s = loadCodeGs();
  ['Ana B.', 'Cy D.', 'Dee E.', 'Eve F.'].forEach((n, i) => {
    assert.ok(play(s, n, '123' + i).ok, n);
    if (n !== 'Eve F.') assert.ok(seed(s, n, '123' + i, true).ok, n);
  });
  assert.ok(s.post({userDelete: 'Ana B. ' + SEED, token: TOK}).ok);
  assert.ok(s.post({userArchive: {from: 'Cy D. ' + SEED, into: 'Cy-old'}, token: TOK}).ok);
  assert.ok(s.post({userMerge: {from: 'Dee E. ' + SEED, into: 'Eve F.', data: data(1)}, token: TOK}).ok);
  ['Ana B. ' + SEED, 'Cy D. ' + SEED, 'Dee E. ' + SEED].forEach(n => assert.strictEqual(play(s, n, '9999').error, 'reserved', n));
  // An archive cannot be given one either (its code no longer opens it).
  assert.ok(!seed(s, 'Cy-old', '1231', true).ok);
});
