require('./slot.js').testGuard();
// rule D4: the app never gets ahead of the sheet script. Every gate on the script's version (a constant named
// *_SHEET in the app's own files) is listed here with the feature it turns on: off below its version N, on from N, off
// when a reply carries no version. A new gate fails this test until it is added to the table (test-suite review,
// 2026-11-04: a gate had no test at all). The versions come from the source, so a recalibrated gate needs no edit here.
// The gate floor (core.js MIN_SHEET; architecture review 2026-11-18, R3): a version already confirmed live, below which
// no gate is left (the ratchet below). Deleted with it, each with its old branch: RV_SHEET 28 (the full replay adopted),
// PGD_SHEET 31 (the genus offsets), RT_SHEET 32 (the answer time), START_SHEET 36 (the first-launch prior), RP_SHEET 42
// (the replay in the player list), GROUP_SHEET 48 (the beta groups), DEL_SHEET 55, HELP_SHEET 57, ARCH_SHEET 58,
// SELFDEL_SHEET 58, LOG_SHEET 60 (each answer filed by subject), FMT_SHEET 77, EXPO_SHEET 81, DOM_SHEET 87 (the
// domain-score bar), BOARD_SHEET 95, WINK_SHEET 98, START_ADMIN_SHEET 99, SCORE_SHEET 101, DEV_SHEET 109, LIVE_SHEET
// 110, REPLAYS_SHEET 112, AN_SUBJ_SHEET 113, EXCL_SHEET 115, LIGHT_SHEET 116, FROMHOME_SHEET 124, MARK_SHEET 125, and
// the unnamed ones (core.js PAGES.SHEET 30, admin-analyses.js AN_V 35, the admin's v10 note).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
// name -> {N, file}: every "const X_SHEET = N" in the app's files (the repo root's .js and proto/), as
// tools/sheet_version.py reads them; MIN_SHEET is the floor, not a gate. ANY: also a version written as a number in a
// comma list or an object field ("X_SHEET = N," or "SHEET: N"), so the ratchet sees a gate however it is spelled.
const FILES = [
    ...fs.readdirSync(ROOT).filter(f => f.endsWith('.js')),
    ...fs.readdirSync(path.join(ROOT, 'proto')).map(f => 'proto/' + f)
  ].filter(f => f.endsWith('.js')),
  FOUND = {},
  ANY = [];
for (const f of FILES) {
  const src = read(f);
  for (const m of src.matchAll(/\bconst (?!MIN_SHEET\b)([A-Z][A-Z0-9_]*_SHEET) = (\d+);/g)) FOUND[m[1]] = {N: +m[2], file: f};
  for (const m of src.matchAll(/\b(?!MIN_SHEET\b)([A-Z][A-Z0-9_]*_SHEET\s*=|SHEET:)\s*(\d+)\b/g))
    ANY.push({name: m[1].replace(/\s*=$/, ''), N: +m[2], file: f});
}
const C = require('../core.js'),
  VERSION = Number(/^const VERSION = (\d+);/m.exec(read('tools/sync/Code.gs'))[1]);

// Runs a block of a browser file with these globals; returns the named function.
const fn = (file, from, to, name, ctx) => {
  vm.createContext(ctx);
  vm.runInContext(block(read(file), from, to, {file}) + `\nthis.__f = ${name};`, ctx);
  return ctx.__f;
};

// gate name -> v => whether the feature it guards is on for a reply of script version v.
const GATES = {
  // The live mode (live.js liveFrom, LIVE_CH: Q393; Code.gs lv_): a reply of the version that serves it is taken; an older
  // script's reply turns the page into one line ('old'), nothing more sent.
  LIVEGAME_SHEET: (v, N) => fn('live.js', 'const liveFrom = ', '\n', 'liveFrom', {LIVEGAME_SHEET: N})(v === undefined ? {} : {v}),
  // The leaderboard tree sent only when it changed, or the sheet holds another (sync.js treeOn, boardUnits, treesSeen;
  // Code.gs boardTreePut_ keeps it in chunks, bt): from the version that keeps it so; before, with every save
  // (tests/boardtree.test.js runs both). The species units open only from here too (their app PR, rule D4).
  TREE_SHEET: (v, N) => fn('sync.js', 'const treeOn = ', '\n', 'treeOn', {sheetV: () => v, TREE_SHEET: N})(),
  // The fish species level (sync.js speciesOn: its units open and count in the score's tree once the sheet replays them,
  // core.js fishReplayGen; app.js spOn reads it): from the version that lists them, the chunked tree's being lower.
  SPECIES_SHEET: (v, N) =>
    fn('sync.js', 'const speciesOn = ', '\n', 'speciesOn', {
      treeOn: () => (v === undefined ? 0 : v) >= 143,
      sheetV: () => v,
      SPECIES_SHEET: N
    })(),
  // To do › Alerts, the sheet's Alerts tab (admin.js alertsOn, loadAlerts; Code.gs readAlerts_): from the version that
  // serves it; before, an older script answers 'input' and the page names the version it waits for.
  ALERTS_SHEET: (v, N) =>
    fn('admin.js', 'const alertsOn = ', '\n', 'alertsOn', {ALERTS_SHEET: N})({ok: true, rows: [], ...(v === undefined ? {} : {v})}),
  // The content editor's structure (sync.js stOn, app.js structOn; core.js STRUCT_SHEET; Code.gs replays_ sts): the
  // stamps said and a replay under a new one adopted, the circles and pairs laid over the units, from the script that
  // replays under them (tests/fishadopt.test.js, tests/structure.test.js); before, the text slots alone, nothing sent.
  STRUCT_SHEET: (v, N) => {
    // core.js structSheet: a subject's own version (SUBJECTS structure sheet), else STRUCT_SHEET
    const structSheet = S => (S && S.structure && S.structure.sheet ? S.structure.sheet() : N),
      S = {id: 'fish', structure: {}, replayed: {}},
      on = fn('sync.js', 'const stOn = ', '\n', 'stOn', {
        structSheet,
        rpOn: (S, x) => Number(x) >= 0
      })(S, v),
      app = fn('app.js', 'const structOn = ', '\n', 'structOn', {structSheet, sheetV: () => (v === undefined ? 0 : v)})(S);
    assert.strictEqual(on, app, 'the app and the sync agree');
    return on;
  },
  // The corals' look-alike pairs (design note v2, step 8; sync.js stOn, app.js structOn through core.js structSheet, the
  // corals' SUBJECTS structure sheet; Code.gs stMain_, gen_ under the pairs): their stamp said and a replay under a new one
  // adopted, the pairs laid over data.json, from the script that replays the corals under them (tests/coralcontent.test.js);
  // before, the text slots alone, nothing sent.
  PAIRS_SHEET: (v, N) => {
    const structSheet = S => (S && S.structure && S.structure.sheet ? S.structure.sheet() : 146),
      S = {id: 'coral', replay: true, structure: {sheet: () => N}},
      on = fn('sync.js', 'const stOn = ', '\n', 'stOn', {structSheet, rpOn: S => !!S.replay})(S, v),
      app = fn('app.js', 'const structOn = ', '\n', 'structOn', {structSheet, sheetV: () => (v === undefined ? 0 : v)})(S);
    assert.strictEqual(on, app, 'the app and the sync agree');
    return on;
  },
  // The sea slugs' look-alike pairs under the content editor (core.js SUBJECTS seaslug structure sheet; Code.gs subjRpl_
  // over seaslug.json; Pierre, 2026-11-18): the app lays the pairs over its units (app.js structOn) and says their stamp
  // and adopts a replay under a new one (sync.js stOn) from the script that replays the sea slugs under them; before, the
  // text slots alone, nothing sent. The fish and the corals keep their own versions.
  SEASLUGPAIRS_SHEET: (v, N) => {
    const C = require('../core.js'),
      S = C.subjectOf('seaslug');
    assert.strictEqual(C.structSheet(S), N);
    assert.strictEqual(C.structSheet(C.subjectOf('fish')), C.STRUCT_SHEET, "the fish's own version");
    assert.strictEqual(C.structSheet(C.SUBJECTS[0]), C.PAIRS_SHEET, "the corals' own version");
    const rpOn = fn('sync.js', 'const rpOn = ', '\n', 'rpOn', {REPLAYS_SHEET: C.REPLAYS_SHEET}),
      on = fn('sync.js', 'const stOn = ', '\n', 'stOn', {structSheet: C.structSheet, rpOn})(S, v),
      app = fn('app.js', 'const structOn = ', '\n', 'structOn', {structSheet: C.structSheet, sheetV: () => (v === undefined ? 0 : v)})(S);
    assert.strictEqual(on, app, 'the app and the sync agree');
    return on;
  },
  // The sea slugs' beta group (core.js SUBJECTS seaslug sheet; Code.gs groupIds_): the admin's Players page offers it from
  // the script that knows the subject; before, the line that says which version it needs.
  SEASLUG_SHEET: (v, N) =>
    fn('admin.js', 'const groupOn = ', '\n', 'groupOn', {
      subjGroup: S => S.open === 'group',
      USERS: v === undefined ? {} : {v},
      ASUBJ: null
    })({open: 'group', sheet: N}),
  // The staff and cohort boards (progress.js boardScopes; Code.gs board_ staff, cohorts): from v171; before, the one
  // general board as before, whatever the reply carries.
  SCOPES_SHEET: (v, N) =>
    fn('progress.js', 'function boardScopes(', '\nfunction viewBoard', 'boardScopes', {
      SCOPES_SHEET: N,
      myCohort: () => '',
      boardMe: () => -1
    })({ok: true, rows: [['A', 1, null]], staff: [['B', 2, null]], cohorts: [], ...(v === undefined ? {} : {v})}).top.length > 1,
  // The admin's Cohort select and Staff toggle on a player's bar (admin.js cohortOn; Code.gs userGroup cohort, roles_):
  // from v171.
  COHORT_SHEET: (v, N) => fn('admin.js', 'const cohortOn = ', '\n', 'cohortOn', {USERS: v === undefined ? {} : {v}, COHORT_SHEET: N})(),
  // The sea slugs' replay and leaderboard (core.js SUBJECTS seaslug replayed sheet, boardSheet; Code.gs replays_, board_
  // &s=seaslug): the app asks for and adopts their replay (sync.js rpOn) and shows their board (progress.js boardOk,
  // boardLive) from the script that has them; before, the plain merge and no board (an older script answers &s=seaslug
  // with the corals' board). The fish's replay and board keep their own versions.
  SEASLUGRP_SHEET: (v, N) => {
    const SS = C.subjectOf('seaslug'),
      FI = C.subjectOf('fish');
    assert.strictEqual(SS.replayed.sheet, N);
    assert.strictEqual(SS.boardSheet, N);
    const rpOn = fn('sync.js', 'const rpOn = ', '\n', 'rpOn', {}),
      boardV = fn('progress.js', 'const boardV = ', '\n', 'boardV', {}),
      ok = fn('progress.js', 'const boardOk = ', '\n', 'boardOk', {boardV}),
      live = fn('progress.js', 'const boardLive = ', '\n', 'boardLive', {boardV, board0: () => C.SUBJECTS[0], sheetV: () => v}),
      j = {ok: true, rows: [], ...(v === undefined ? {} : {v})};
    if (v !== undefined) assert.strictEqual(rpOn(FI, v), true, "the fish's replay from any script that answers");
    if (v !== undefined) assert.strictEqual(ok(j, false, FI), true, "the fish's board from any script that answers");
    const on = rpOn(SS, v);
    assert.strictEqual(ok(j, false, SS), on, 'the board with the replay');
    assert.strictEqual(live(SS), on, 'the board live with the replay');
    return on;
  },
  // The sea slugs' own pooled statistics (core.js SUBJECTS seaslug stats; Code.gs ?stats=1&s=seaslug, statsSubjects_):
  // the app asks for them (sync.js loadOwnStats) from the script that pools them; before, an older script would answer
  // &s=seaslug with the corals', so nothing is asked (and a reply not naming the sea slugs is never kept:
  // tests/seaslugstats.test.js).
  SEASLUGST_SHEET: (v, N) => {
    const SS = C.subjectOf('seaslug');
    assert.strictEqual(SS.stats, N);
    let asked = '';
    fn('sync.js', 'function loadOwnStats(', '\n// A switch to a subject', 'loadOwnStats', {
      SYNC_URL: 'https://sheet.invalid/exec',
      SUBJ: SS,
      sheetV: () => (v === undefined ? 0 : v),
      appVer: () => 1,
      ownStatsAt: {},
      fetch: u => ((asked = u), new Promise(() => {}))
    })();
    if (asked) assert.match(asked, /[?&]stats=1&s=seaslug&/);
    return !!asked;
  },
  // A Find the X's photo tapped (quiz.js answer pa; Q371): sent from the version that stores it (Code.gs Photo answered),
  // through core.js logOut at both of sync.js's sends; before, the copy sent leaves it out and keeps the rest, the queue
  // untouched (an older script gets exactly what it got before).
  PA_SHEET: v => {
    const {logOut} = C,
      a = {id: 'a1', m: 'quiz|f', a: 'f:Damselfishes', ph: 'fi1', pa: 'fi2'},
      out = logOut(a, v);
    assert.deepStrictEqual(a, {id: 'a1', m: 'quiz|f', a: 'f:Damselfishes', ph: 'fi1', pa: 'fi2'}, 'the queued entry untouched');
    assert.deepStrictEqual({...out, pa: 'fi2'}, a, 'every other field sent as it is');
    const plain = {id: 'a2', m: 'quiz'};
    assert.strictEqual(logOut(plain, v), plain, 'an answer without it is sent as it is');
    return out.pa === 'fi2';
  }
};

test('every *_SHEET gate of the app is in the table', () => {
  assert.ok(Object.keys(FOUND).length >= 3, JSON.stringify(FOUND));
  const missing = Object.keys(FOUND).filter(k => !GATES[k]);
  assert.deepStrictEqual(missing, [], `add these gates to tests/gates.test.js: ${JSON.stringify(missing.map(k => FOUND[k]))}`);
  assert.deepStrictEqual(
    Object.keys(GATES).filter(k => !FOUND[k]),
    [],
    'a gate in the table is gone from the source'
  );
});

for (const name of Object.keys(GATES))
  test(`${name}: off below its sheet version, on from it, off with no version`, () => {
    const {N} = FOUND[name] || {};
    assert.ok(N > 1, name);
    assert.strictEqual(GATES[name](N - 1, N), false, `${name} on at v${N - 1}`);
    assert.strictEqual(GATES[name](N, N), true, `${name} off at v${N}`);
    assert.strictEqual(GATES[name](N + 5, N), true, `${name} off at v${N + 5}`);
    assert.strictEqual(GATES[name](undefined, N), false, `${name} on with no version`);
  });

// The ratchet (architecture review 2026-11-18, R3, step 2): no gate at or below the floor (delete it with its old branch
// when the floor rises), and the floor never above main's VERSION (a PR never edits VERSION, rule D3, so this checkout's
// is main's): it is a version already live, never the one the app is built against.
test('the gate floor: no gate at or below MIN_SHEET, MIN_SHEET at or below VERSION', () => {
  assert.ok(Number.isInteger(C.MIN_SHEET) && C.MIN_SHEET > 0, String(C.MIN_SHEET));
  assert.ok(C.MIN_SHEET <= VERSION, `MIN_SHEET ${C.MIN_SHEET} is above main's VERSION ${VERSION}: set it to a version already live`);
  const low = ANY.filter(g => g.N <= C.MIN_SHEET).map(g => `${g.name} = ${g.N} (${g.file})`);
  assert.deepStrictEqual(low, [], `gates at or below MIN_SHEET ${C.MIN_SHEET}: delete each with its old branch`);
  assert.ok(Object.keys(FOUND).length >= 3 && ANY.length >= Object.keys(FOUND).length, 'the gates are still found');
  // the core.js copy embedded in Code.gs holds the same floor (tools/sync_core.py)
  assert.match(read('tools/sync/Code.gs'), new RegExp(`\\bconst MIN_SHEET = ${C.MIN_SHEET};`));
});

// The floor as the app reads it: sync.js sheetV is never below MIN_SHEET, also before any reply (a new device, an offline
// first launch: nothing stored), and a newer reply's version is kept as it is. Every gate left stays off until a reply
// says its version.
test('sheetV: MIN_SHEET before any reply or over an older stored one, the stored version above it', () => {
  const mem = {},
    sheetV = fn('sync.js', 'const sheetV = ', '\n', 'sheetV', {
      MIN_SHEET: C.MIN_SHEET,
      SHEETV: 'reefid-sheet-v',
      store: {get: (k, d) => (k in mem ? mem[k] : d)}
    });
  assert.strictEqual(sheetV(), C.MIN_SHEET, 'no reply yet');
  for (const k of Object.keys(FOUND)) assert.ok(FOUND[k].N > sheetV(), `${k} on before any reply`);
  mem['reefid-sheet-v'] = 0;
  assert.strictEqual(sheetV(), C.MIN_SHEET, 'a stored 0');
  mem['reefid-sheet-v'] = C.MIN_SHEET - 40;
  assert.strictEqual(sheetV(), C.MIN_SHEET, 'a stored version below the floor');
  mem['reefid-sheet-v'] = C.MIN_SHEET + 7;
  assert.strictEqual(sheetV(), C.MIN_SHEET + 7, 'a newer one as it is');
});
