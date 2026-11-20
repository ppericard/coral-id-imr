require('./slot.js').testGuard();
// The What I learn card's names rows (app.js learnRows, rowOn, autoOf, learnSet; progress.js learnCard; core.js
// mergeUsers; Pierre, 2026-11-18, Q396, Q400 D, Q401 A, Q402 A, Q404 A): each names row on or off, both off leaving the
// families; "I'm at IMR" means both. A record no switch was tapped on reads as it plays (its pool unchanged); the card's
// Off stops the units a set brings by itself (an IMR player's IMR genera, the species), a card's "Not now" does not; a
// row turned on comes at the usual threshold (no sciH). The rows are declared per subject in one place (rule S1).
// node --test tests/namesrows.test.js
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js'),
  C = require('../core.js');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const APP = read('app.js'),
  PROG = read('progress.js');

// autoOf, learnRows, rowOn, learnSet and bonusList as app.js has them, on stub sets: sci (offered, auto the IMR genera for
// an IMR player), sp (auto only, the common-name species).
function run({imr = false, q = {}, sp = true} = {}) {
  const ctx = {
    Q: {...q},
    saved: 0,
    imr,
    SUBJ: {id: 'fish'},
    SETS: () => ctx.S,
    bonusSet(on, k) {
      ctx.Q[k] = !!on;
      ctx.Q[k + 'T'] = 1;
      ctx.saved++;
    }
  };
  ctx.S = [
    {k: 'sci', units: () => ['g:Acanthurus'], auto: () => (ctx.imr ? ['g:Heniochus'] : [])},
    {k: 'sp', units: () => [], auto: () => ['s:one']}
  ];
  ctx.UNITS = {
    fish: {
      learn: [
        {k: 'sp', name: 'Common names', when: () => sp, self: () => true, line: () => ''},
        {k: 'sci', name: 'Scientific names', self: () => ctx.imr, line: () => ''}
      ]
    }
  };
  vm.createContext(ctx);
  vm.runInContext(
    [
      block(APP, 'const autoOf = ', '\n', {through: 1, file: 'app.js'}),
      block(APP, 'const learnRows = ', '\n', {through: 1, file: 'app.js'}),
      block(APP, 'const rowOn = ', '\n', {through: 1, file: 'app.js'}),
      block(APP, 'function learnSet(k, on) {', '\n}\n', {through: 1, file: 'app.js'}),
      block(APP, 'const bonusList = ', '\n', {through: 1, file: 'app.js'}),
      'this.autoOf = autoOf; this.learnRows = learnRows; this.rowOn = rowOn; this.learnSet = learnSet; this.bonusList = bonusList;'
    ].join('\n'),
    ctx
  );
  ctx.row = k => ctx.learnRows().find(r => r.k === k);
  ctx.pool = () => JSON.parse(JSON.stringify(ctx.bonusList()));
  return ctx;
}

test('a record no switch was tapped on: the rows read as it plays, its pool unchanged', () => {
  // [imr, Q.sci, Q.sciH] -> the Scientific names row, the units in play
  const cases = [
    [false, undefined, undefined, false, ['s:one']],
    [false, true, undefined, true, ['g:Acanthurus', 's:one']],
    [false, true, true, true, ['g:Acanthurus', 's:one']],
    [false, false, undefined, false, ['s:one']], // "Not now"
    [true, undefined, undefined, true, ['g:Heniochus', 's:one']], // "I'm at IMR" means both
    [true, true, undefined, true, ['g:Acanthurus', 'g:Heniochus', 's:one']],
    [true, false, undefined, true, ['g:Heniochus', 's:one']] // "Not now" or "Close them for now": the IMR genera stay
  ];
  cases.forEach(([imr, sci, sciH, on, pool]) => {
    const q = {};
    if (sci !== undefined) q.sci = sci;
    if (sciH !== undefined) q.sciH = sciH;
    const X = run({imr, q});
    assert.strictEqual(X.rowOn(X.row('sci')), on, JSON.stringify({imr, q}));
    assert.strictEqual(X.rowOn(X.row('sp')), true, 'Common names on by default');
    assert.deepStrictEqual(X.pool().sort(), pool, JSON.stringify({imr, q}));
  });
});

test('the card: Off stops what the set brings by itself, On brings it back, never by hand early', () => {
  const X = run({imr: true});
  X.learnSet('sci', false);
  assert.ok(X.Q.sci === false && X.Q.sciO === true && !X.rowOn(X.row('sci')));
  assert.deepStrictEqual(X.pool(), ['s:one'], "an IMR player's IMR genera stop too (Q404 A)");
  X.learnSet('sci', true);
  assert.ok(X.Q.sci === true && !('sciO' in X.Q) && !X.Q.sciH && X.rowOn(X.row('sci')), 'on: no sciH (Q401 A)');
  assert.deepStrictEqual(X.pool().sort(), ['g:Acanthurus', 'g:Heniochus', 's:one']);
  X.learnSet('sp', false);
  assert.ok(X.Q.sp === false && X.Q.spO === true && !X.rowOn(X.row('sp')));
  X.learnSet('sci', false);
  assert.deepStrictEqual(X.pool(), [], 'both rows off: the families only, allowed (Q404 A)');
  X.learnSet('sp', true);
  assert.deepStrictEqual(X.pool(), ['s:one']);
});

test('a row shows only once its level is on (rule D4)', () => {
  assert.deepStrictEqual(
    run({sp: false})
      .learnRows()
      .map(r => r.k),
    ['sci']
  );
});

test('the rows are declared per subject in UNITS learn, the sets they switch synced (SUBJECTS optin), no subject named', () => {
  const learn = block(APP, "    // The What I learn card's names rows", '    // The milestone', {file: 'app.js'});
  assert.match(learn, /k: 'sp'/);
  assert.match(learn, /k: 'sci'/);
  assert.match(block(APP, "    // The What I learn card's one names row", '    sciCard:', {file: 'app.js'}), /k: 'ssp'/);
  ['sp', 'sci'].forEach(k => assert.ok(C.subjectOf('fish').optin.includes(k), 'fish optin ' + k));
  assert.ok(C.subjectOf('seaslug').optin.includes('ssp'), 'seaslug optin ssp');
  assert.deepStrictEqual(C.subjectOf('coral').optin, ['bon'], 'the corals: no names row');
  const card = block(PROG, 'function learnCard(', '\n}\n', {through: 1, file: 'progress.js'});
  assert.ok(!/'(fish|coral|seaslug)'/.test(card), 'the card names no subject (rule S1)');
});

test('the card: a base row, one switch per names row, a phone summary line', () => {
  const X = run({imr: false, q: {sci: true}});
  const ctx = {
    SUBJ: {many: 'families'},
    WIL_OPEN: false,
    esc: s => String(s),
    rowOn: X.rowOn,
    learnRows: X.learnRows,
    matchMedia: () => ({matches: false})
  };
  vm.createContext(ctx);
  vm.runInContext(
    block(PROG, 'let WIL_OPEN = false;\n', '\n}\n', {through: 1, file: 'progress.js'}).replace('let WIL_OPEN = false;\n', '') +
      'this.learnCard = learnCard;',
    ctx
  );
  const h = ctx.learnCard();
  assert.match(h, /<details class="wil" id="wil">/, 'closed on a phone');
  assert.match(h, /<summary><b>What I learn<\/b><span>Families, common names, scientific names<\/span><\/summary>/);
  assert.match(h, /<b>Families<\/b><small>Always on<\/small>/);
  assert.strictEqual((h.match(/data-wil="/g) || []).length, 4, 'On and Off for each of the two rows');
  assert.match(ctx.learnCard(X.learnRows(), true), /<details class="wil" id="wil" open>/, 'open from Home or on desktop');
  X.learnSet('sp', false);
  X.learnSet('sci', false);
  assert.match(ctx.learnCard(), /<span>Families only<\/span>/);
  assert.match(ctx.learnCard(), /wilrow off/);
  assert.strictEqual(ctx.learnCard([]), '', 'no card for a subject without a names row');
});

test('mergeUsers: a row turned off stays off only where both accounts have it off', () => {
  const k = C.subjKey('fish', 'quiz'),
    m = (a, b) => {
      const A = a ? {[k]: JSON.stringify(a)} : {},
        B = b ? {[k]: JSON.stringify(b)} : {};
      return JSON.parse(C.mergeUsers(A, B)[k]);
    };
  const off = {sp: false, spT: 2, spO: true};
  assert.ok(m(off, {}).spO === undefined && m({}, off).spO === undefined, 'on by default on the other account: on');
  assert.ok(m(off, off).spO === true && m(off, off).sp === false, 'off on both: off');
  assert.ok(m(off, null).spO === true, 'only one account played the subject: its choice');
  assert.ok(m(off, {sp: true}).sp === true && m(off, {sp: true}).spO === undefined, 'on on either: on');
});
