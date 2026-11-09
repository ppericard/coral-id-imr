// Reserved account names (Pierre, 2026-11-09): a name holding a member name of Object.prototype (constructor, __proto__,
// toString…) or prototype as one of its words is refused for a new account and an archive name, in the app's sign-in form
// (sync.js, core.js reservedName) and by the sync script (Code.gs doPost_, users_ userArchive: error 'reserved'). An
// account that already has one keeps working, and the script's maps by player have no prototype, so such a player is a
// player like any other (users_, groups, answers_, live_, achs_, replayedAll_; core.js trustOf, eloReplay, playSplit,
// exposureOf). Against the in-memory sheet (tests/gas.js) and sync.js on it (tests/syncpage.js); nothing leaves this
// process (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const {loadCodeGs, madeBefore} = require('./gas.js');
const {page} = require('./syncpage.js');

const TOK = 'ghp_write000000000000000000';
const DJSON = fs.readFileSync(path.join(__dirname, '..', 'data.json'), 'utf8');
const fetch = url => (/\/main\/data\.json$/.test(url) ? {getResponseCode: () => 200, getContentText: () => DJSON} : null);
const prog = n => ({'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: n, ko: 0}})});
const qa = (id, i) => ({
  id,
  t: new Date(Date.UTC(2026, 10, 3, 6, 0, i)).toISOString(),
  g: 'Acropora',
  a: i % 4 === 3 ? 'Montipora' : 'Acropora',
  ok: i % 4 === 3 ? 0 : 1,
  m: 'quiz',
  ph: 'acropora-wide-' + (i % 5),
  ch: 'Acropora Montipora Porites Pocillopora',
  e: 0.8,
  th: 1
});
const run = k => Array.from({length: 14}, (_, i) => qa(k + i, i));
const polluted = s =>
  vm.runInContext('[Object.prototype, Object, Function.prototype, Array.prototype].map(o => Object.keys(o).join()).join("|")', s.ctx);
const clear = s => Object.keys(s.cache).forEach(k => delete s.cache[k]);
const OLD = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf'];

test('reservedName: every member name of Object.prototype and prototype, as a word, in any capitalisation', () => {
  const {RESERVED_NAMES, reservedName} = C;
  // The list Pierre saw covers this engine's Object.prototype (V8: Node and Apps Script alike).
  Object.getOwnPropertyNames(Object.prototype).forEach(w => assert.ok(RESERVED_NAMES.includes(w), w));
  assert.ok(RESERVED_NAMES.includes('__proto__') && RESERVED_NAMES.includes('prototype'));
  RESERVED_NAMES.forEach(w => {
    [w, w.toUpperCase(), w.toLowerCase(), ' ' + w + ' ', 'Bob ' + w, w + ' B.', 'x|' + w, w + ':1', 'a,' + w].forEach(n =>
      assert.strictEqual(reservedName(n), true, n)
    );
  });
  ['Ana B.', 'Anna', 'Constance', 'Proto', 'Constructors', 'valueOfX', 'toStrings', 'Jean-Luc', "O'Neil", '', null, undefined].forEach(n =>
    assert.strictEqual(reservedName(n), false, String(n))
  );
  // The sheet's own word check (Code.gs PROTO_RE, review of #801) refuses no word the list lets through.
  const s = loadCodeGs();
  RESERVED_NAMES.filter(w => w !== 'prototype').forEach(w =>
    assert.strictEqual(vm.runInContext(`protoWord_(${JSON.stringify(w)})`, s.ctx), true, w)
  );
  Object.getOwnPropertyNames(Object.prototype).forEach(w => assert.strictEqual(reservedName(w), true, w));
});

test('the sheet refuses a new account or an archive under a reserved name; an account that has one keeps working', () => {
  const s = loadCodeGs({fetch});
  madeBefore(s, () => assert.ok(s.post({name: 'valueOf', pin: '1234', data: prog(2), summary: {}, answers: run('v')}).ok));
  ['Constructor', '__proto__', 'TOSTRING', 'Bob hasOwnProperty', 'prototype', 'isPrototypeOf B.'].forEach(name => {
    const g0 = s.get({name, pin: '1234'});
    assert.strictEqual(g0.ok && g0.found, false, name + ': no account');
    const r = s.post({name, pin: '1234', data: prog(1), summary: {}, answers: run('n' + name.length), anon: 'device0001'});
    assert.strictEqual(r.error, 'reserved', name);
    assert.strictEqual(r.ok, false);
    assert.ok(!r.log, name + ': its answers are not taken as logged');
  });
  // Nothing written: no account, no answer, no saved progress beyond valueOf's.
  assert.deepStrictEqual(
    s.sheets.RAs.rows.slice(1).map(r => r[0]),
    ['valueOf']
  );
  assert.ok(s.sheets.Answers.rows.slice(1).every(r => r[0] === 'valueOf'));
  assert.deepStrictEqual(s.sheets['Progress data'] ? s.sheets['Progress data'].rows.slice(1).map(r => r[0]) : ['valueOf'], ['valueOf']);
  // Another name still makes an account.
  assert.strictEqual(s.post({name: 'Ana B.', pin: '1234', data: prog(1), summary: {}, answers: []}).ok, true);
  // The account named valueOf: loads, saves (any capitalisation, as every name), and its wrong code is still refused.
  const g = s.get({name: 'VALUEOF', pin: '1234'});
  assert.strictEqual(g.found, true);
  assert.deepStrictEqual(g.data, prog(2));
  assert.deepStrictEqual(g.groups, []);
  const w = s.post({name: 'valueOf', pin: '1234', data: prog(5), summary: {}, answers: [qa('v99', 30)], at: g.rev});
  assert.strictEqual(w.ok, true, JSON.stringify(w));
  assert.strictEqual(w.rev, g.rev + 1);
  assert.deepStrictEqual(s.get({name: 'valueOf', pin: '1234'}).data, prog(5));
  assert.strictEqual(s.post({name: 'valueOf', pin: '9999', data: {}, summary: {}, answers: []}).error, 'pin');
  // The admin's archive: never under a reserved name (nothing moved), always from one.
  ['constructor', 'Archived toString'].forEach(into => {
    assert.strictEqual(s.post({userArchive: {from: 'Ana B.', into}, token: TOK}).error, 'reserved', into);
  });
  assert.deepStrictEqual(
    s.sheets.RAs.rows.slice(1).map(r => r[0]),
    ['valueOf', 'Ana B.']
  );
  const a = s.post({userArchive: {from: 'valueOf', into: 'valueOf-test'}, token: TOK});
  assert.strictEqual(a.ok, true, JSON.stringify(a));
  assert.strictEqual(a.answers, 15);
  assert.strictEqual(polluted(s), '|||');
});

test('players named like Object.prototype members: every admin read, group and count treats them as players', () => {
  const s = loadCodeGs({fetch});
  vm.runInContext("CORE_.SUBJECTS.find(S => S.id === 'fish').open = 'group'", s.ctx);
  assert.ok(s.post({name: 'Ana', pin: '1234', data: prog(3), summary: {pct: 5}, answers: run('ana')}).ok);
  madeBefore(s, () =>
    OLD.forEach((n, j) =>
      assert.ok(
        s.post({
          name: n,
          pin: '1234',
          data: {...prog(j + 1), 'reefid-sync-ach': JSON.stringify({constructor: 1, first: 1})},
          summary: {pct: 10},
          answers: run('p' + j)
        }).ok,
        n
      )
    )
  );
  const all = ['Ana', ...OLD];
  // The loads and their beta groups (groupsOf_: an array, never Object's member).
  OLD.forEach(n => assert.deepStrictEqual(s.get({name: n, pin: '1234'}).groups, [], n));
  // The photo statistics: one rating per player, nothing added to Object.prototype (core.js trustOf, eloReplay).
  clear(s);
  const st = s.post({readStats: 1, token: TOK});
  assert.strictEqual(st.ok, true);
  assert.deepStrictEqual(Object.keys(st.ras).sort(), all.map(n => s.ctx.aid_(n)).sort());
  assert.strictEqual(polluted(s), '|||', 'the stats add nothing to Object');
  // readAnswers and the live view: each row under its player's id (a string), the caller's own id as "me".
  const ra = s.post({readAnswers: 1, token: TOK, aname: 'constructor', apin: '1234'});
  assert.strictEqual(ra.me, s.ctx.aid_('constructor'));
  assert.deepStrictEqual(Object.keys(ra.players).sort(), all.map(n => s.ctx.aid_(n)).sort());
  assert.ok(ra.rows.every(r => typeof r[0] === 'string' && all.some(n => s.ctx.aid_(n) === r[0])));
  all.forEach(n => assert.strictEqual(ra.rows.filter(r => r[0] === s.ctx.aid_(n)).length, 14, n));
  const lv = s.post({readLive: 1, token: TOK});
  assert.ok(lv.rows.every(r => typeof r[0] === 'string'));
  assert.deepStrictEqual(Object.keys(lv.last).sort(), all.map(n => s.ctx.aid_(n)).sort());
  // The player list: every player with their own numbers.
  clear(s);
  const u = s.post({users: 1, token: TOK});
  assert.strictEqual(u.ok, true, JSON.stringify(u).slice(0, 200));
  assert.deepStrictEqual(
    u.users.map(x => x.name),
    all
  );
  u.users.forEach(x => {
    assert.strictEqual(x.answers, 14, x.name);
    assert.strictEqual(x.days, 1, x.name);
    assert.deepStrictEqual(x.recent, [14, 11], x.name);
    assert.deepStrictEqual(x.mix, [['Acropora', 'Montipora', 3]], x.name);
    assert.deepStrictEqual(x.groups, [], x.name);
    assert.ok(Array.isArray(x.rp) && x.rp.length === 3 && x.rp.every(v => typeof v === 'number' && isFinite(v)), x.name);
  });
  // The achievements' shares (achs_): an id a device saved as constructor is counted, as a number.
  clear(s);
  const ac = s.get({achs: '1'});
  assert.strictEqual(ac.n, OLD.length);
  assert.strictEqual(ac.counts.constructor, OLD.length);
  assert.strictEqual(ac.counts.first, OLD.length);
  // Beta groups: added and removed like anyone (groupSet_), seen in the load and the player list.
  OLD.forEach(n => assert.strictEqual(s.post({userGroup: n, group: 'fish', on: true, token: TOK}).n, 1, n));
  OLD.forEach(n => assert.deepStrictEqual(s.get({name: n, pin: '1234'}).groups, ['fish'], n));
  assert.deepStrictEqual(s.get({name: 'Ana', pin: '1234'}).groups, []);
  clear(s);
  assert.deepStrictEqual(
    s.post({users: 1, token: TOK}).users.map(x => [x.name, x.groups]),
    all.map(n => [n, n === 'Ana' ? [] : ['fish']])
  );
  assert.strictEqual(s.post({userGroup: OLD, group: 'fish', on: false, token: TOK}).n, OLD.length);
  OLD.forEach(n => assert.deepStrictEqual(s.get({name: n, pin: '1234'}).groups, [], n));
  // Archive and delete: the list follows.
  assert.ok(s.post({userArchive: {from: 'constructor', into: 'Arch1'}, token: TOK}).ok);
  assert.ok(s.post({userDelete: '__proto__', answers: true, token: TOK}).ok);
  clear(s);
  const u2 = s.post({users: 1, token: TOK});
  assert.deepStrictEqual(
    u2.users.map(x => x.name),
    ['Ana', 'toString', 'hasOwnProperty', 'valueOf']
  );
  assert.deepStrictEqual(
    u2.archived.map(x => [x.name, x.answers]),
    [['Arch1', 14]]
  );
  assert.strictEqual(s.get({name: '__proto__', pin: '1234'}).error, 'gone');
  assert.strictEqual(polluted(s), '|||');
});

test('core.js maps by player: trustOf, playSplit, levelMargin (eloReplay) and exposureOf take a player named __proto__ as any other', () => {
  const rows = (w, n) =>
    Array.from({length: n}, (_, i) => [
      w,
      1e12 + i,
      'Acropora',
      'Acropora',
      1,
      'quiz',
      'acropora-wide-' + (i % 3),
      0.8,
      0,
      0,
      'Acropora Porites Montipora Pocillopora'
    ]);
  const L = [...rows('__proto__', 12), ...rows('constructor', 12), ...rows('ana', 12)];
  const T = C.trustOf(L);
  assert.deepStrictEqual({...T}, {['__proto__']: true, constructor: true, ana: true});
  assert.strictEqual(Object.getPrototypeOf(T), null);
  const ps = C.playSplit(L);
  ['__proto__', 'constructor', 'ana'].forEach(w => assert.deepStrictEqual(ps[w].q, [12, 12], w));
  const m = C.levelMargin(L);
  assert.ok(['__proto__', 'constructor', 'ana'].every(w => Object.prototype.hasOwnProperty.call(m, w) && isFinite(m[w])));
  const E = C.exposureOf(
    L.map(r => r.slice(0, 7)),
    {Acropora: [['acropora-wide-0'], ['acropora-wide-1'], ['acropora-wide-2']]}
  );
  ['__proto__', 'constructor', 'ana'].forEach(w => assert.deepStrictEqual(E[w], E.ana, w));
  assert.strictEqual(Object.keys(Object.prototype).length, 0);
});

test('the app: a save refused as reserved stops and says so; an account that has such a name syncs as before', async () => {
  const s = loadCodeGs({fetch});
  madeBefore(s, () => assert.ok(s.post({name: 'toString', pin: '1234', data: prog(1), summary: {}, answers: []}).ok));
  // An app from before the form refused it signed in under a reserved name: the save is refused, red at once, no retry.
  const A = page(s, {SYNC: {name: 'Constructor', pin: '1234', log: [], base: {}, dirty: true}});
  A.play('c1');
  await A.syncPush();
  assert.strictEqual(A.ctx.SYNC.err, 'reserved');
  assert.strictEqual(s.sheets.RAs.rows.slice(1).length, 1);
  // The existing account: its answers logged, no error.
  const B = page(s, {SYNC: {name: 'toString', pin: '1234', log: [], base: {}}});
  B.play('t1');
  await B.syncPush();
  assert.strictEqual(B.ctx.SYNC.err, undefined);
  assert.ok(s.sheets.Answers.rows.slice(1).some(r => r[0] === 'toString' && r[7] === 't1'));
});
