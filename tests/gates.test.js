require('./slot.js').testGuard();
// rule D4: the app never gets ahead of the sheet script. Every gate on the script's version (a constant named
// *_SHEET in the app's own files) is listed here with the feature it turns on: off below its version N, on from N, off
// when a reply carries no version. A new gate fails this test until it is added to the table (test-suite review,
// 2026-11-04: PGD_SHEET had no test at all). The versions come from the source, so a recalibrated gate needs no edit here.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
// name -> {N, file}: every "const X_SHEET = N" in the app's files (the repo root's .js and proto/).
const FOUND = {};
for (const f of [
  ...fs.readdirSync(ROOT).filter(f => f.endsWith('.js')),
  ...fs.readdirSync(path.join(ROOT, 'proto')).map(f => 'proto/' + f)
])
  if (f.endsWith('.js')) for (const m of read(f).matchAll(/\bconst ([A-Z][A-Z0-9]*_SHEET) = (\d+);/g)) FOUND[m[1]] = {N: +m[2], file: f};

// Runs a block of a browser file with these globals; returns the named function.
const fn = (file, from, to, name, ctx) => {
  vm.createContext(ctx);
  vm.runInContext(block(read(file), from, to, {file}) + `\nthis.__f = ${name};`, ctx);
  return ctx.__f;
};

// gate name -> v => whether the feature it guards is on for a reply of script version v.
const GATES = {
  // The app adopts the sheet's full replay (sync.js replayAdopt) and the admin shows replayed progress: from v28. Checked
  // here on the admin's switch; the app's side runs in tests/pages.smoke.js (replayAdoptCheck at RV_SHEET - 1).
  RV_SHEET: (v, N) => fn('admin.js', 'const replayOn = ', '\n', 'replayOn', {ANS: v === undefined ? {} : {v}, USERS: null, RV_SHEET: N})(),
  // Players takes each player's replayed progress from the player list (admin.js rpOn, Code.gs replayedAll_ rp): from v42;
  // before, it reads every player's saved copy and replays here.
  RP_SHEET: (v, N) => fn('admin.js', 'const rpOn = ', '\n', 'rpOn', {USERS: v === undefined ? {} : {v}, RP_SHEET: N})(),
  // The beta group's column, row toggle and Add all on the Players page of a subject that opens to a group (admin.js
  // groupOn, core.js subjGroup): from v48, which keeps the group (Code.gs groupSet_); before, a note says what it needs.
  GROUP_SHEET: (v, N) =>
    fn('admin.js', 'const groupOn = ', '\n', 'groupOn', {
      ASUBJ: {beta: {}, open: 'group'},
      subjGroup: require('../core.js').subjGroup,
      USERS: v === undefined ? {} : {v},
      GROUP_SHEET: N
    })(),
  // Players › Delete…'s two choices (admin.js delOn, Code.gs deleteAccount_): from v55, which deletes or anonymises the
  // account's reports, page summaries and log mentions; before, they are disabled with a note.
  DEL_SHEET: (v, N) => fn('admin.js', 'const delOn = ', '\n', 'delOn', {USERS: v === undefined ? {} : {v}, DEL_SHEET: N})(),
  // Deleting one's own account (sync.js selfDelOn, #about/delete-account; Code.gs selfDelete_): from v58; before, a note.
  SELFDEL_SHEET: (v, N) => fn('sync.js', 'const selfDelOn = ', '\n', 'selfDelOn', {sheetV: () => v, SELFDEL_SHEET: N})(),
  // Activity's light read every minute while it is open and in view (admin.js liveOn, liveArm; Code.gs live_ readLive):
  // from the version that serves it; before, ↻ by hand only.
  LIVE_SHEET: (v, N) => fn('admin.js', 'const liveOn = ', '\n', 'liveOn', {ANS: v === undefined ? {} : {v}, LIVE_SHEET: N})(),
  // The live mode (live.js liveFrom, LIVE_CH: Q393; Code.gs lv_): a reply of the version that serves it is taken; an older
  // script's reply turns the page into one line ('old'), nothing more sent.
  LIVEGAME_SHEET: (v, N) => fn('live.js', 'const liveFrom = ', '\n', 'liveFrom', {LIVEGAME_SHEET: N})(v === undefined ? {} : {v}),
  // The device's id on every answer it sends (sync.js devField, the save's and the anonymous send's dev; Code.gs
  // logAnswers_ Device; Q312): from the version that writes it; before, nothing more is sent.
  DEV_SHEET: (v, N) => {
    const f = fn('sync.js', 'const devField = ', '\n', 'devField', {
      devOn: () => (v === undefined ? 0 : v) >= N,
      devId: () => 'abcdefghij'
    });
    const on = fn('sync.js', 'const devOn = ', '\n', 'devOn', {sheetV: () => (v === undefined ? 0 : v), DEV_SHEET: N})();
    assert.strictEqual(JSON.stringify(f()), JSON.stringify(on ? {dev: 'abcdefghij'} : {}));
    return on;
  },
  // The lighter saves (sync.js lightOn: a save without a load before it when the device holds the saved copy, its delta,
  // gzip and the stale reply's load; Code.gs doPost_ light, load_ have): from the version that serves them; before, a
  // load then the whole data, as ever (tests/lightsave.test.js runs both).
  // The first page opened from Home, one 'fromhome' event a visit (app.js fromHome): from the version that keeps the kind.
  FROMHOME_SHEET: (v, N) =>
    fn('app.js', 'const fromHomeOn = ', '\n', 'fromHomeOn', {sheetV: () => (v === undefined ? 0 : v), FROMHOME_SHEET: N})(),
  LIGHT_SHEET: (v, N) => fn('sync.js', 'const lightOn = ', '\n', 'lightOn', {sheetV: () => v, LIGHT_SHEET: N})(),
  // The screen in each pages-opened summary (sync.js viewportOn, pagesScreen; core.js viewportOf, pagesClean): from the
  // version whose pagesClean keeps it; before, the summary as it was (tests/pages.test.js pagesSend runs both).
  VIEWPORT_SHEET: (v, N) => {
    const on = fn('sync.js', 'const viewportOn = ', '\n', 'viewportOn', {sheetV: () => v, VIEWPORT_SHEET: N})();
    const sent = fn('sync.js', 'const pagesScreen = ', '\nfunction pagesSend', 'pagesScreen', {
      viewportOn: () => on,
      viewportOf: require('../core.js').viewportOf,
      window: {innerWidth: 360, innerHeight: 800, devicePixelRatio: 3}
    })();
    assert.strictEqual('vp' in sent, on, 'the screen is sent exactly when the gate is on');
    return on;
  },
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
  // Players' Photos and Spread columns, each player's photo exposure (admin.js expoOn, Code.gs exposure_ ex): from v81;
  // before, the columns stay away.
  EXPO_SHEET: (v, N) => fn('admin.js', 'const expoOn = ', '\n', 'expoOn', {USERS: v === undefined ? {} : {v}, EXPO_SHEET: N})(),
  // To do › Alerts, the sheet's Alerts tab (admin.js alertsOn, loadAlerts; Code.gs readAlerts_): from the version that
  // serves it; before, an older script answers 'input' and the page names the version it waits for.
  ALERTS_SHEET: (v, N) =>
    fn('admin.js', 'const alertsOn = ', '\n', 'alertsOn', {ALERTS_SHEET: N})({ok: true, rows: [], ...(v === undefined ? {} : {v})}),
  // Players › Archive… (admin.js archOn, Code.gs userArchive) and the Archived fold: from v58; before, the button is off.
  ARCH_SHEET: (v, N) => fn('admin.js', 'const archOn = ', '\n', 'archOn', {USERS: v === undefined ? {} : {v}, ARCH_SHEET: N})(),
  // Players' Leave out / Count again (sheet v115, statsExclude).
  // The admin's mark after the admin's account name (core.js markRow, Code.gs board_): from the script that sends it;
  // before, no row shows it, a 4th field or not. The account line follows the same gate (sync.js markSeen).
  MARK_SHEET: v => {
    const {markRow} = require('../core.js');
    assert.strictEqual(markRow(['Ana', 50, null], v), false, 'a row of three fields never has it');
    assert.strictEqual(markRow(['Ana', 50, null, 0], v), false);
    return markRow(['Ana', 50, null, 1], v);
  },
  EXCL_SHEET: (v, N) => fn('admin.js', 'const exclOn = ', '\n', 'exclOn', {USERS: v === undefined ? {} : {v}, EXCL_SHEET: N})(),
  // A right answer's progress step weighs its answer time (model.js rtOn): from v32.
  RT_SHEET: (v, N) => fn('model.js', 'const rtOn = ', '\n', 'rtOn', {sheetV: () => v, RT_SHEET: N})(),
  // The first-launch answer's prior on a new genus's start (model.js startP): from v36, which replays it; before, 0. On
  // the corals, the subject the sheet replays (a subject it does not replay, fish, has no replay to wait for).
  START_SHEET: (v, N) =>
    fn('model.js', 'const startP = ', '\n', 'startP', {
      sheetV: () => v,
      START_SHEET: N,
      startV: () => ({p: 0.7}),
      startS: () => ({replay: true})
    })() !== 0,
  // A subject's global score (model.js scoreOn: the headline, the rules on it and the tree sent to the sheet; core.js
  // treeScore): from v101, which ranks the leaderboard by it; before, the families' mean.
  // The other subjects' replays, fish (sync.js rpOn, core.js REPLAYS_SHEET; Code.gs replays_): asked for and adopted
  // from the script that replays them under their own rules versions; before, fish merges as it did.
  REPLAYS_SHEET: (v, N) => fn('sync.js', 'const rpOn = ', '\n', 'rpOn', {REPLAYS_SHEET: N})({id: 'fish', replay: false, replayed: {}}, v),
  // The content editor's structure (sync.js stOn, app.js structOn; core.js STRUCT_SHEET; Code.gs replays_ sts): the
  // stamps said and a replay under a new one adopted, the circles and pairs laid over the units, from the script that
  // replays under them (tests/fishadopt.test.js, tests/structure.test.js); before, the text slots alone, nothing sent.
  STRUCT_SHEET: (v, N) => {
    // core.js structSheet: a subject's own version (SUBJECTS structure sheet), else STRUCT_SHEET
    const structSheet = S => (S && S.structure && S.structure.sheet ? S.structure.sheet() : N),
      S = {id: 'fish', structure: {}, replayed: {}},
      on = fn('sync.js', 'const stOn = ', '\n', 'stOn', {
        structSheet,
        rpOn: (S, x) => Number(x) >= 112
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
      GROUP_SHEET: 48,
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
    const C = require('../core.js'),
      SS = C.subjectOf('seaslug'),
      FI = C.subjectOf('fish');
    assert.strictEqual(SS.replayed.sheet, N);
    assert.strictEqual(SS.boardSheet, N);
    const rpOn = fn('sync.js', 'const rpOn = ', '\n', 'rpOn', {REPLAYS_SHEET: C.REPLAYS_SHEET}),
      boardV = fn('progress.js', 'const boardV = ', '\n', 'boardV', {BOARD_SHEET: 95}),
      ok = fn('progress.js', 'const boardOk = ', '\n', 'boardOk', {boardV}),
      live = fn('progress.js', 'const boardLive = ', '\n', 'boardLive', {boardV, board0: () => C.SUBJECTS[0], sheetV: () => v}),
      j = {ok: true, rows: [], ...(v === undefined ? {} : {v})};
    if (v !== undefined && v >= C.REPLAYS_SHEET) assert.strictEqual(rpOn(FI, v), true, "the fish's replay from its own version");
    if (v !== undefined && v >= 95) assert.strictEqual(ok(j, false, FI), true, "the fish's board from its own version");
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
    const SS = require('../core.js').subjectOf('seaslug');
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
  SCORE_SHEET: (v, N) => fn('model.js', 'const scoreOn = ', '\n', 'scoreOn', {SUBJ: {score: {}}, sheetV: () => v, SCORE_SHEET: N})(),
  // The ids of the player's own reports in a load reply (sync.js repsSeen, Code.gs repsOf_ reps), for "Your feedback
  // helped" (Q66): from v57; before, only the ids the device kept itself.
  HELP_SHEET: (v, N) => {
    let got = null;
    fn('sync.js', 'function repsSeen(', '\nfunction sheetSeen', 'repsSeen', {HELP_SHEET: N, achReps: ids => (got = ids)})({
      ...(v === undefined ? {} : {v}),
      reps: ['r1']
    });
    return !!got;
  },
  // The answers of a subject the sheet does not replay (fish) are sent (sync.js syncOnce, sendAnon, through core.js logOk):
  // from v60, which files each answer under its subject; before, they stay queued (an older script would file them as
  // coral answers). The replayed subject's answers are always sent.
  LOG_SHEET: (v, N) => {
    const logOk = fn('core.js', 'const logOk = ', '\n', 'logOk', {
      LOG_SHEET: N,
      WINK_SHEET: 98,
      winkEntry: a => a.m === 'wink',
      ansSubject: a => a.s || 'coral',
      replaySubject: () => 'coral'
    });
    assert.strictEqual(logOk({s: 'coral'}, v), true, 'a coral answer is always sent');
    assert.strictEqual(logOk({}, v), true, 'an answer without a subject is a coral one');
    return logOk({s: 'fish'}, v);
  },
  // A surprise card's answer (quiz.js winkAnswer, Mode wink; sent through core.js logOk): from v98, whose readers leave
  // it out (Code.gs replayed_, answers_, the Activity tab); before, it stays queued (an older script would count it as a
  // fish answer). The other answers as their own gate says (a coral one always, a fish one from LOG_SHEET).
  WINK_SHEET: (v, N) => {
    const logOk = fn('core.js', 'const logOk = ', '\n', 'logOk', {
      LOG_SHEET: 60,
      WINK_SHEET: N,
      winkEntry: a => a.m === 'wink',
      ansSubject: a => a.s || 'coral',
      replaySubject: () => 'coral'
    });
    assert.strictEqual(logOk({s: 'coral', m: 'quiz'}, v), true, 'a coral answer is always sent');
    assert.strictEqual(logOk({s: 'fish', m: 'quiz'}, v), Number(v) >= 60, 'a fish answer from LOG_SHEET');
    return logOk({s: 'fish', m: 'wink'}, v) && logOk({m: 'wink'}, v);
  },
  // A Find the X's photo tapped (quiz.js answer pa; Q371): sent from the version that stores it (Code.gs Photo answered),
  // through core.js logOut at both of sync.js's sends; before, the copy sent leaves it out and keeps the rest, the queue
  // untouched (an older script gets exactly what it got before).
  PA_SHEET: v => {
    const {logOut} = require('../core.js'),
      a = {id: 'a1', m: 'quiz|f', a: 'f:Damselfishes', ph: 'fi1', pa: 'fi2'},
      out = logOut(a, v);
    assert.deepStrictEqual(a, {id: 'a1', m: 'quiz|f', a: 'f:Damselfishes', ph: 'fi1', pa: 'fi2'}, 'the queued entry untouched');
    assert.deepStrictEqual({...out, pa: 'fi2'}, a, 'every other field sent as it is');
    const plain = {id: 'a2', m: 'quiz'};
    assert.strictEqual(logOut(plain, v), plain, 'an answer without it is sent as it is');
    return out.pa === 'fi2';
  },
  // The domain-score bar (core.js DOM, rules version 9) for a genus first answered in the game (model.js domRules): from
  // v87, which replays it; before, the moving average s.pg. On the corals, the subject the sheet replays (fish: at once).
  DOM_SHEET: (v, N) => fn('model.js', 'const domRules = ', '\n', 'domRules', {sheetV: () => v, DOM_SHEET: N, SUBJ: {replay: true}})(),
  // Another subject's leaderboard (progress.js boardOk, Code.gs board_ &s=<id>): from v95; an older script answers with
  // the first subject's board, never shown as another's. The first subject's board is shown from any script.
  BOARD_SHEET: (v, N) => {
    const ok = fn('progress.js', 'const boardOk = ', '\n', 'boardOk', {
        BOARD_SHEET: N,
        boardV: fn('progress.js', 'const boardV = ', '\n', 'boardV', {BOARD_SHEET: N})
      }),
      j = {ok: true, rows: [], ...(v === undefined ? {} : {v})};
    assert.strictEqual(ok(j, true), true, "the first subject's board from any script");
    return ok(j, false);
  },
  // The genus offsets of the hierarchical photo Elo (model.js gdOf, ?stats=1 gd): from v31; before, every prior is 0.
  // The per-format offsets (core.js fmtsOf, ?stats=1 fmt; Q138): from the version that serves them and replays with them;
  // before, every offset is 0 (the app's PFMT, the admin's SFMT, the device's replay on top of the sheet's).
  FMT_SHEET: v => Object.keys(require('../core.js').fmtsOf({...(v === undefined ? {} : {v}), fmt: {k2: [1, 30]}})).length > 0,
  PGD_SHEET: (v, N) => {
    const gdOf = fn('model.js', 'const gdOf = ', '\n', 'gdOf', {PGD_SHEET: N});
    return Object.keys(gdOf({...(v === undefined ? {} : {v}), gd: {Acropora: [0.2, 30]}})).length > 0;
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
