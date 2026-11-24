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
// The fish's names step as app.js declares it (UNITS fish namesStep).
const NAMES = JSON.parse(
  JSON.stringify(
    vm.runInNewContext(
      '({' + block(APP, '    namesStep: {\n      q:', "    // The What I learn card's names rows", {file: 'app.js'}) + '})'
    ).namesStep
  )
);

// autoOf, learnRows, rowOn, learnSet and bonusList as app.js has them, on stub sets: sci (offered, auto the IMR genera for
// an IMR player), sp (auto only, the common-name species).
function run({imr = false, q = {}, sp = true} = {}) {
  const ctx = {
    Q: {...q},
    saved: 0,
    imr,
    SUBJ: {id: 'fish'},
    imrNow: () => ctx.imr,
    saveQ: () => ctx.saved++,
    esc: s => String(s),
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
      namesStep: NAMES,
      learn: [
        {k: 'sp', name: 'Common names', when: () => sp, self: () => true, line: () => ''},
        {k: 'sci', name: 'Scientific names', self: () => ctx.imr, line: () => 'every genus', part: () => 'the IMR genera only'}
      ]
    }
  };
  vm.createContext(ctx);
  vm.runInContext(
    [
      block(APP, 'const namesDecl = ', '\n', {through: 1, file: 'app.js'}),
      block(APP, 'const namesKeys = ', '\n', {through: 1, file: 'app.js'}),
      block(APP, 'const namesFresh = ', '\n', {through: 1, file: 'app.js'}),
      block(APP, 'function namesAsk(c) {', '\n}\n', {through: 1, file: 'app.js'}),
      block(APP, 'function namesSet(id) {', '\n}\n', {through: 1, file: 'app.js'}),
      block(APP, 'const namesOptsHtml = ', '</div>`;\n', {through: 1, file: 'app.js'}),
      'this.namesAsk = namesAsk; this.namesSet = namesSet; this.namesOptsHtml = namesOptsHtml;',
      block(APP, 'const autoOf = ', '\n', {through: 1, file: 'app.js'}),
      block(APP, 'const learnRows = ', '\n', {through: 1, file: 'app.js'}),
      block(APP, 'const rowOn = ', '\n', {through: 1, file: 'app.js'}),
      block(APP, 'const rowState = ', '\n', {through: 1, file: 'app.js'}),
      block(APP, 'function learnSet(k, on) {', '\n}\n', {through: 1, file: 'app.js'}),
      block(APP, 'const bonusCalc = ', '\n', {through: 1, file: 'app.js'}),
      'const bonusList = bonusCalc;', // the view of the state version (app.js stateView): its computation here
      'this.autoOf = autoOf; this.learnRows = learnRows; this.rowOn = rowOn; this.rowState = rowState; this.learnSet = learnSet; this.bonusList = bonusList;'
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
    [false, undefined, undefined, 'off', ['s:one']],
    [false, true, undefined, 'on', ['g:Acanthurus', 's:one']],
    [false, true, true, 'on', ['g:Acanthurus', 's:one']],
    [false, false, undefined, 'off', ['s:one']], // "Not now"
    [true, undefined, undefined, 'part', ['g:Heniochus', 's:one']], // "I'm at IMR": the IMR genera alone, by themselves
    [true, true, undefined, 'on', ['g:Acanthurus', 'g:Heniochus', 's:one']],
    [true, false, undefined, 'part', ['g:Heniochus', 's:one']] // "Not now" or "Close them for now": the IMR genera stay
  ];
  cases.forEach(([imr, sci, sciH, state, pool]) => {
    const q = {};
    if (sci !== undefined) q.sci = sci;
    if (sciH !== undefined) q.sciH = sciH;
    const X = run({imr, q});
    assert.strictEqual(X.rowState(X.row('sci')), state, JSON.stringify({imr, q}));
    assert.strictEqual(X.rowOn(X.row('sci')), state !== 'off');
    assert.strictEqual(X.rowState(X.row('sp')), 'on', 'Common names on by default');
    assert.strictEqual(X.rowOn(X.row('sp')), true, 'Common names on by default');
    assert.deepStrictEqual(X.pool().sort(), pool, JSON.stringify({imr, q}));
  });
});

test('the card: Off stops what the set brings by itself, On brings it back, never by hand early', () => {
  // an IMR player after "Not now": the IMR genera alone (part); On turns every family's on
  const P = run({imr: true, q: {sci: false}});
  P.learnSet('sci', true);
  assert.ok(P.Q.sci === true && P.rowState(P.row('sci')) === 'on' && P.pool().includes('g:Acanthurus'), 'part, then On: all');
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
    rowState: X.rowState,
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
  // an IMR player who never turned the set on: neither button pressed, the line says the IMR genera alone come
  const I = run({imr: true});
  Object.assign(ctx, {rowOn: I.rowOn, rowState: I.rowState, learnRows: I.learnRows});
  const hi = ctx.learnCard();
  assert.match(hi, /the IMR genera only/);
  assert.match(
    hi,
    /data-wil="sci" data-on="1" aria-pressed="false">On<\/button><button type="button" data-wil="sci" data-on="0" aria-pressed="false">/
  );
});

test("Home's link: a tap before progress.js loads still counts, and the link always navigates", () => {
  const HOME = read('home.js');
  // home.js's handler (tier 1) on a stub link, with no progress.js loaded
  const h = {window: {}, $v: {querySelector: () => link}, wil: true},
    link = {};
  vm.createContext(h);
  vm.runInContext(block(HOME, "    const wl = wil && $v.querySelector('.hdwil');", '\n  };\n', {file: 'home.js'}), h);
  assert.strictEqual(typeof link.onclick, 'function');
  assert.strictEqual(link.onclick(), undefined, 'never false: the link to My progress is never cancelled');
  assert.strictEqual(h.window.WIL_ASK, true, 'the intent kept in tier 1');
  // progress.js, loaded later, opens the card once from it
  const X = run(),
    ctx = {SUBJ: {many: 'families'}, WIL_OPEN: false, esc: String, rowOn: X.rowOn, rowState: X.rowState, learnRows: X.learnRows};
  ctx.window = h.window;
  ctx.matchMedia = () => ({matches: false});
  vm.createContext(ctx);
  vm.runInContext(
    block(PROG, 'let WIL_OPEN = false;\n', '\n}\n', {through: 1, file: 'progress.js'}).replace('let WIL_OPEN = false;\n', '') +
      'this.learnCard = learnCard;',
    ctx
  );
  assert.match(ctx.learnCard(), /<details class="wil" id="wil" open>/, 'open on arrival');
  assert.strictEqual(ctx.window.WIL_ASK, false, 'read once');
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

// The names step at the welcome (app.js UNITS namesStep, namesAsk, namesSet; tour.js, quiz.js namesAskShow; Pierre, 2026-11-04).
test('the names step: common names writes nothing, so scientific names are still offered at Advanced', () => {
  const X = run();
  X.namesSet('common');
  assert.deepStrictEqual(X.Q, {}, 'the record as it plays: Q.sci stays unset, the offer (quiz.js bonusOfferDue) comes');
  assert.strictEqual(X.saved, 0);
  assert.deepStrictEqual(X.pool(), ['s:one']);
});

test('the names step: scientific names only, and both', () => {
  const S = run();
  S.namesSet('sci');
  assert.ok(S.Q.sci === true && S.Q.sp === false && S.Q.spO === true && !('sciH' in S.Q) && !('sciO' in S.Q), JSON.stringify(S.Q));
  assert.ok(S.rowOn(S.row('sci')) && !S.rowOn(S.row('sp')));
  assert.deepStrictEqual(S.pool(), ['g:Acanthurus'], 'the genera, no common-name species; never by hand early (Q401 A)');
  const B = run();
  B.namesSet('both');
  assert.ok(B.Q.sci === true && !('sp' in B.Q) && !('sciH' in B.Q), 'common names are on already: nothing written for them');
  assert.deepStrictEqual(B.pool().sort(), ['g:Acanthurus', 's:one']);
});

test('the names step: written only where a row differs, once (the tour holds the answer until it closes)', () => {
  const X = run();
  X.namesSet('both');
  const once = JSON.stringify(X.Q);
  X.namesSet('both');
  assert.strictEqual(JSON.stringify(X.Q), once, 'the same answer again writes nothing');
  // the tour (tour.js close) writes only while no row was set since, so what the step set is never replaced there
  const T = block(read('tour.js'), 'if (OPEN && OPEN.c && OPEN.n === SUBJ.id', '\n', {through: 1, file: 'tour.js'});
  assert.match(T, /namesFresh\(\)/);
  assert.match(T, /!imrNow\(\)/);
  assert.match(T, /namesSet\(OPEN\.c\)/);
});

test('the names step is asked of a new player only, once, when both rows are on offer (rule D4, Q404 A)', () => {
  assert.strictEqual(run().namesAsk('new'), true);
  assert.strictEqual(run().namesAsk('know'), true);
  assert.strictEqual(run().namesAsk('imr'), false, '"I\'m at IMR" has both');
  assert.strictEqual(run({imr: true}).namesAsk('new'), false, 'an answer "I\'m at IMR" given earlier counts');
  assert.strictEqual(run().namesAsk(undefined), false);
  assert.strictEqual(run({sp: false}).namesAsk('new'), false, 'the species level is not on yet: one row, no choice');
  ['sp', 'sci'].forEach(k => {
    assert.strictEqual(run({q: {[k]: false}}).namesAsk('new'), false, 'a player who already chose ' + k + ' keeps it');
    assert.strictEqual(run({q: {[k + 'O']: true}}).namesAsk('new'), false);
  });
});

test('the names step is declared in one place, in the player words, its answers naming only rows that exist', () => {
  assert.deepStrictEqual(
    NAMES.opts.map(o => o.id),
    ['common', 'sci', 'both']
  );
  assert.deepStrictEqual(NAMES.skip, ['imr']);
  // `names` is already a UNITS key, a function (the name index of each subject): the step's key is namesStep, never a second
  // `names` that would silently replace it
  assert.ok(!/^ {4}names: \{/m.test(APP), 'no `names: {` in the UNITS objects');
  assert.strictEqual((APP.match(/^ {4}names: \(\) =>/gm) || []).length, 3, "each subject's name index stays");
  const rows = run()
    .learnRows()
    .map(r => r.k);
  NAMES.opts.forEach(o => Object.keys(o.rows).forEach(k => assert.ok(rows.includes(k), `${o.id} sets a row that exists: ${k}`)));
  assert.doesNotMatch(JSON.stringify(NAMES), /Latin/, '"scientific name", never "Latin"');
  const h = run().namesOptsHtml('both');
  assert.strictEqual((h.match(/data-names="/g) || []).length, 3);
  assert.match(h, /data-names="both" aria-pressed="true"/);
  // tour.js and quiz.js read the declaration and name no subject (rule S1)
  const QUIZ = read('quiz.js'),
    TOUR = read('tour.js');
  const card = block(QUIZ, 'function namesAskShow(c, go) {', '\n}\n', {through: 1, file: 'quiz.js'});
  assert.ok(!/'(fish|coral|seaslug)'/.test(card), 'the card names no subject');
  assert.ok(!/'(fish|coral|seaslug)'/.test(TOUR.slice(TOUR.indexOf('names: {k:'))), 'the tour names no subject');
});
