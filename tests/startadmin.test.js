// Change the starting answer (Pierre, 2026-11-08, Q228): the admin's change of a player's first-launch answer for one
// subject (core.js startAdminSet; Code.gs users_ userStart, sheet v99; admin.js startBlock), merged into the player's
// devices by the normal sync (core.js startUnion); the fallback window starts again from it (model.js startStep,
// startDue: the level card is still offered, on the answers given after the change only).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');
const C = require('../core.js');
const {loadCodeGs} = require('./gas.js');
const {startAdminSet, startUnion, startNorm, startKey, subjKey, keyLegacy, startPriorAt, LEVEL} = C;

const T0 = Date.UTC(2026, 10, 5, 2);
// A player who said "I had the IMR coral course" in the tour, then moved to "I know corals well" on the fallback card
// after 40 answers, with a fallback window and a card shown.
const rec = () => ({
  c: 'know',
  t: T0 + 40,
  at: 40,
  via: 'fallback',
  w: [[0.5, 0.25, 1, 1]],
  hd: 1,
  wt: T0 - 5,
  v: 'lo',
  fb: {'imr-hi': [40, T0 + 40]}, // rename-app: keep (a fallback card key: the imr answer, then its direction)
  h: [
    ['imr', 0, T0, 'tour'],
    ['know', 40, T0 + 40, 'fallback']
  ]
});
const data = (r = rec(), n = 75) => ({
  [startKey('coral')]: JSON.stringify(r),
  [subjKey('coral', 'progress')]: JSON.stringify({[LEVEL]: {ok: n - 20, ko: 20, th: 0.3}, Acropora: {ok: 3, ko: 1}}),
  'reefid-sync-settings': '{}',
  _acct: 'abc123'
});
const NOW = T0 + 864e5;

test('startAdminSet appends a choice event via admin: the history kept, the answer in force changed', () => {
  const out = startAdminSet(data(), 'coral', 'imr', NOW),
    s = out.start;
  assert.deepStrictEqual(s.h, [...rec().h, ['imr', 75, NOW, 'admin']], 'every earlier event kept, the new one last');
  assert.deepStrictEqual([s.c, s.t, s.at, s.via], ['imr', NOW, 75, 'admin']);
  assert.deepStrictEqual(s.fb, rec().fb, 'the fallback cards shown stay (once per answer and direction)');
  // The window starts again from the change (Pierre, 2026-11-08, Q228), as an answer given in the app does (startSet).
  assert.deepStrictEqual(s.w, [], 'the window restarts');
  assert.ok(!('v' in s) && !('hd' in s) && !('wt' in s), 'its verdict, hold and epoch were about the former answer');
  assert.deepStrictEqual(JSON.parse(out.data[startKey('coral')]), s);
  assert.strictEqual(out.data._acct, 'abc123', 'the rest of the copy as it was');
  assert.strictEqual(out.data[subjKey('coral', 'progress')], data()[subjKey('coral', 'progress')]);
  // The replay keeps each answer's prior: know before the change, imr from it on.
  assert.strictEqual(startPriorAt(s, NOW - 1), C.startVars('know').p);
  assert.strictEqual(startPriorAt(s, NOW), C.startVars('imr').p);
});

test('the change wins the merge with an older device copy, whichever comes first', () => {
  const s = startAdminSet(data(), 'coral', 'imr', NOW).start,
    dev = startNorm(rec()); // a device that has not synced since
  for (const m of [startUnion(dev, s), startUnion(s, dev)]) {
    assert.strictEqual(m.c, 'imr');
    assert.strictEqual(m.via, 'admin');
    assert.strictEqual(m.h.length, 3, 'one copy of each event');
    assert.deepStrictEqual(m.w, [], "the window of the record holding the answer: the change's, restarted");
  }
  // A device that played on and answered again before the change: its event stays in the history, the change wins.
  const later = startNorm({...rec(), h: [...rec().h, ['know', 60, NOW - 5, 'card']]}),
    m = startUnion(later, s);
  assert.strictEqual(m.c, 'imr');
  assert.strictEqual(m.h.length, 4);
});

test("a device's clock ahead: the change still comes last", () => {
  const ahead = {...rec(), h: [...rec().h, ['know', 70, NOW + 5000, 'card']]},
    s = startAdminSet(data(ahead), 'coral', 'new', NOW).start;
  assert.strictEqual(s.t, NOW + 5001);
  assert.strictEqual(startUnion(startNorm(ahead), s).c, 'new');
});

test('the copy under the name from before the rename gets the same record when it holds one', () => {
  const k = startKey('fish'),
    old = keyLegacy(k);
  assert.strictEqual(old, 'imr-coral-fish-start'); // rename-app: keep (the name before the rename, on purpose)
  const fr = {c: 'know', t: T0, at: 0, via: 'tour', h: [['know', 0, T0, 'tour']]},
    d = {[k]: JSON.stringify(fr), [old]: JSON.stringify(fr)},
    out = startAdminSet(d, 'fish', 'imr', NOW);
  assert.strictEqual(out.start.c, 'imr');
  assert.strictEqual(out.start.at, 0, 'no fish progress saved: 0 answers');
  assert.strictEqual(out.data[old], out.data[k]);
  // Only the old name saved (an app from before the rename saved it last): read from it, both written.
  const only = startAdminSet({[old]: JSON.stringify(fr)}, 'fish', 'imr', NOW);
  assert.strictEqual(JSON.parse(only.data[k]).c, 'imr');
  assert.strictEqual(only.data[old], only.data[k]);
  // No old name in the copy: none added.
  assert.ok(!(keyLegacy(startKey('coral')) in startAdminSet(data(), 'coral', 'imr', NOW).data));
});

test('nothing to change: unknown subject or answer, or no answer saved', () => {
  assert.strictEqual(startAdminSet(data(), 'coral', 'expert', NOW), null);
  assert.strictEqual(startAdminSet(data(), 'nope', 'imr', NOW), null);
  assert.strictEqual(startAdminSet({'reefid-sync-settings': '{}'}, 'coral', 'imr', NOW), null);
  assert.strictEqual(startAdminSet({[startKey('coral')]: 'not json'}, 'coral', 'imr', NOW), null);
  assert.strictEqual(startAdminSet(null, 'coral', 'imr', NOW), null);
});

// The sync script against an in-memory sheet (tests/gas.js).
const TOK = 'ghp_write000000000000000000';
const seed = () => {
  const s = loadCodeGs();
  assert.strictEqual(s.post({name: 'Ana', pin: '1234', data: data(), summary: {}}).rev, 1);
  return s;
};

test('userStart: admin token only; the record changed in the saved copy and the revision bumped', () => {
  const s = seed();
  assert.strictEqual(s.post({userStart: 'Ana', s: 'coral', c: 'imr'}).error, 'token');
  assert.strictEqual(s.post({userStart: 'Ana', s: 'coral', c: 'expert', token: TOK}).error, 'input');
  assert.strictEqual(s.post({userStart: 'Ana', s: 'zzz', c: 'imr', token: TOK}).error, 'input');
  assert.strictEqual(s.post({userStart: 'Nobody', s: 'coral', c: 'imr', token: TOK}).error, 'user');
  assert.strictEqual(s.post({userStart: 'Ana', s: 'fish', c: 'imr', token: TOK}).error, 'none', 'no fish answer saved');
  const r = s.post({userStart: 'ana', s: 'coral', c: 'imr', token: TOK});
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.rev, 2);
  assert.deepStrictEqual([r.start.c, r.start.via, r.start.h.length], ['imr', 'admin', 3]);
  const g = s.get({name: 'Ana', pin: '1234'});
  assert.strictEqual(g.rev, 2);
  assert.deepStrictEqual(JSON.parse(g.data[startKey('coral')]), r.start);
  assert.strictEqual(g.data[subjKey('coral', 'progress')], data()[subjKey('coral', 'progress')], 'the progress as it was');
  assert.strictEqual(s.post({userData: 'Ana', token: TOK}).rev, 2);
});

test('userStart then a device mid-sync: stale, it merges the sheet copy and saves the new answer', () => {
  const s = seed();
  assert.strictEqual(s.post({userStart: 'Ana', s: 'coral', c: 'imr', token: TOK}).ok, true);
  // The device read revision 1 before the change and sends its own copy (the former answer): refused.
  const mine = data();
  assert.strictEqual(s.post({name: 'Ana', pin: '1234', data: mine, summary: {}, at: 1}).error, 'stale');
  // It reads the sheet again and merges (sync.js mergeSaved -> model.js startMerge -> core.js startUnion), then saves.
  const g = s.get({name: 'Ana', pin: '1234'}),
    k = startKey('coral'),
    merged = startUnion(JSON.parse(mine[k]), JSON.parse(g.data[k]));
  assert.strictEqual(merged.c, 'imr');
  assert.strictEqual(s.post({name: 'Ana', pin: '1234', data: {...mine, [k]: JSON.stringify(merged)}, summary: {}, at: g.rev}).ok, true);
  assert.strictEqual(JSON.parse(s.get({name: 'Ana', pin: '1234'}).data[k]).c, 'imr');
});

test('userStart: an archived record is read-only', () => {
  const s = seed();
  assert.strictEqual(s.post({userArchive: {from: 'Ana', into: 'Ana-test'}, token: TOK}).ok, true);
  assert.strictEqual(s.post({userStart: 'Ana-test', s: 'coral', c: 'imr', token: TOK}).error, 'archived');
});

// model.js startStep and startDue, run in Node on stubs (as tests/start.test.js): an answer set in the admin gets the
// normal fallback card (Pierre, 2026-11-08, Q228: "if the player then turns out much better than I thought, the level
// card must still be offered"), counted on the answers given after the change only.
test('the fallback window restarts at the change, and the level card still comes from the answers after it', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    block = cut(src, '// First meeting with a genus (Pierre', 'const introSince'),
    saved = {},
    ctx = {
      ...require('./subj.stub.js')(),
      P: {},
      LEVEL,
      CB: {},
      COMEBACK: {KEY: 'reefid-comeback'},
      n: 0,
      Date: {now: () => NOW},
      slateGenera: () => ['A', 'B'],
      syncSoon: () => {},
      basicsDue: () => true,
      dropPlans: () => {},
      document: {querySelectorAll: () => []},
      ...C,
      ...require('./subj.stub.js')(),
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))}
    };
  ctx.answersSoFar = () => ctx.n;
  vm.createContext(ctx);
  vm.runInContext(block + '\nthis.M = {startOf, startStep, startDue};', ctx);
  const M = ctx.M,
    k = startKey('coral'),
    // n answers on questions of difficulty 0, a quarter right, the global level -0.5: clearly harder than "know" says.
    play = n => {
      for (let i = 0; i < n; i++) {
        ctx.n++;
        ctx.P[LEVEL] = {ok: ctx.n, ko: 0, th: -0.5};
        M.startStep(0, 4, i % 4 === 0, true);
      }
    },
    N = C.CHOICE.AT[0];
  // "I had the IMR coral course" given in the tour, 39 answers in its window.
  saved[k] = JSON.stringify({c: 'imr', t: T0, at: 0, via: 'tour', w: [], fb: {}, h: [['imr', 0, T0, 'tour']]});
  play(N - 1);
  assert.strictEqual(M.startOf().w.length, N - 1);
  // Pierre changes it to "I know corals well": the window restarts, so the next answer is no checkpoint.
  const d = {[k]: saved[k], [subjKey('coral', 'progress')]: JSON.stringify({[LEVEL]: {ok: ctx.n, ko: 0}})};
  saved[k] = startAdminSet(d, 'coral', 'know', NOW).data[k];
  assert.strictEqual(M.startOf().via, 'admin');
  play(1);
  assert.strictEqual(M.startOf().w.length, 1);
  assert.strictEqual(M.startDue(), null, 'no card from the answers given under the former answer');
  play(N - 2);
  assert.strictEqual(M.startDue(), null, 'not before 40 answers after the change');
  play(1);
  assert.strictEqual(M.startDue(), 'lo', 'the level card at 40 answers after the change, as for an answer given in the app');
});
