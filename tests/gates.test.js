require('./slot.js').testGuard();
// rule D4: the app never gets ahead of the sheet script. Every gate on the script's version (a constant named
// *_SHEET in the app's own files) is listed here with the feature it turns on: off below its version N, on from N, off
// when a reply carries no version. A new gate fails this test until it is added to the table, so no gate goes untested.
// The versions come from the source, so a recalibrated gate needs no edit here. The gate floor (core.js SHEET_FLOOR): a
// version already confirmed live, below which no gate is left (the ratchet below).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
// name -> {N, file}: every "const X_SHEET = N" in the app's files (the repo root's .js and proto/), as
// tools/sheet_version.py reads them; SHEET_FLOOR is the floor, not a gate. ANY: also a version written as a number in a
// comma list or an object field ("X_SHEET = N," or "SHEET: N"), so the ratchet sees a gate however it is spelled.
const FILES = [
    ...fs.readdirSync(ROOT).filter(f => f.endsWith('.js')),
    ...fs.readdirSync(path.join(ROOT, 'proto')).map(f => 'proto/' + f)
  ].filter(f => f.endsWith('.js')),
  FOUND = {},
  ANY = [];
for (const f of FILES) {
  const src = read(f);
  for (const m of src.matchAll(/\bconst (?!SHEET_FLOOR\b)([A-Z][A-Z0-9_]*_SHEET) = (\d+);/g)) FOUND[m[1]] = {N: +m[2], file: f};
  for (const m of src.matchAll(/\b(?!SHEET_FLOOR\b)([A-Z][A-Z0-9_]*_SHEET\s*=|SHEET:)\s*(\d+)\b/g))
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
  // The live mode (live.js liveFrom, LIVE_CH; Code.gs lv_): a reply of the version that serves it is taken; an older
  // script's reply turns the page into one line ('old'), nothing more sent.
  LIVEGAME_SHEET: (v, N) => fn('live.js', 'const liveFrom = ', '\n', 'liveFrom', {LIVEGAME_SHEET: N})(v === undefined ? {} : {v}),
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
  // The picture input of the report dialog (sync.js repImgOn, reportDialog; Code.gs logReports_ keeps it in the Report
  // images tab): offered from the version that keeps it; before, the dialog as it was (tests/reportimage.test.js).
  REPIMG_SHEET: (v, N) => fn('sync.js', 'const repImgOn = ', '\n', 'repImgOn', {sheetV: () => v, REPIMG_SHEET: N})(),
  // The leaderboard tree sent only when it changed, or the sheet holds another (sync.js treeOn, boardUnits, treesSeen;
  // Code.gs boardTreePut_ keeps it in chunks, bt): from the version that keeps it so; before, with every save
  // (tests/boardtree.test.js runs both). The species units open only from here too (their app PR, rule D4).
  TREE_SHEET: (v, N) => fn('sync.js', 'const treeOn = ', '\n', 'treeOn', {sheetV: () => v, TREE_SHEET: N})(),
  // The corals' one scale in the save summary (sync.js scaleSent, syncSummary genera and pct; rule L6): the slate then
  // the bonus genera, from the script that widens the "By genus" grid before writing them (Code.gs; an older one fails
  // the save of a summary wider than the tab); before, the slate's, as before (tests/sync.test.js runs the script side).
  SCALE_SHEET: (v, N) => {
    const L = fn('sync.js', 'const scaleSent = ', '\n', 'scaleSent', {
      sheetV: () => v,
      SCALE_SHEET: N,
      slateGenera: () => ['Acropora'],
      scaleUnits: () => ['Acropora', 'Isopora']
    })();
    return L.length === 2;
  },
  // The fish species level (sync.js speciesOn: its units open and count in the score's tree once the sheet replays them,
  // core.js treeReplayGen; app.js spOn reads it): from the version that lists them, the chunked tree's being lower.
  SPECIES_SHEET: (v, N) =>
    fn('sync.js', 'const speciesOn = ', '\n', 'speciesOn', {
      treeOn: () => (v === undefined ? 0 : v) >= 143,
      sheetV: () => v,
      SPECIES_SHEET: N
    })(),
  // The scientific genera of circles 2 and 3 (sync.js generaOn: they open and count among the genera a question offers
  // once the sheet replays them, core.js treeGenSets; app.js sciNow reads it): from the version that holds them.
  GENERA_SHEET: (v, N) => fn('sync.js', 'const generaOn = ', '\n', 'generaOn', {sheetV: () => v, GENERA_SHEET: N})(),
  // The species by their scientific names, fish and sea slugs (sync.js sciOn: they open and count once the sheet replays
  // them, a smaller fault included, core.js treeReplayGen, PART; its app PR reads it): from the version that replays them.
  SCI_SHEET: (v, N) => fn('sync.js', 'const sciOn = ', '\n', 'sciOn', {sheetV: () => v, SCI_SHEET: N})(),
  // Each subject's own opening hold (sync.js holdOf, holdAdopt; Code.gs holdsInto_ holds): from the version whose light
  // replies carry it; before, the replay subject's alone from hold and holdIds, the others keeping the device's.
  HOLDS_SHEET: (v, N) => {
    const holdOf = fn('sync.js', 'const holdsOn = ', "\n// The sheet's opening hold of subject S", 'holdOf', {HOLDS_SHEET: N}),
      R = C.SUBJECTS.find(S => S.replay),
      O = C.SUBJECTS.find(S => !S.replay),
      j = {v, hold: 0.4, holdIds: ['a'], holds: {[R.id]: {h: 0.4, ids: ['a']}, [O.id]: {h: 2, ids: ['b']}}},
      on = holdOf(j, O);
    assert.strictEqual(holdOf(j, R).h, 0.4, "the replay subject's, either way");
    assert.strictEqual(holdOf({...j, holds: undefined}, O), null, 'no holds in the reply: the device keeps its own');
    if (on) assert.strictEqual(on.h, 2, "the subject's own");
    return !!on;
  },
  // To do › Alerts, the sheet's Alerts tab (admin.js alertsOn, loadAlerts; Code.gs readAlerts_): from the version that
  // serves it; before, an older script answers 'input' and the page names the version it waits for.
  ALERTS_SHEET: (v, N) =>
    fn('admin.js', 'const alertsOn = ', '\n', 'alertsOn', {ALERTS_SHEET: N})({ok: true, rows: [], ...(v === undefined ? {} : {v})}),
  // To do › Alerts, the infrastructure card above the list (admin.js infraOn, loadInfra; Code.gs readInfra_; docs/PAGES.md
  // "Infrastructure health"): from the version that serves it; before, an older script answers 'input' and the card shows
  // the repository's numbers alone, silently (tests/infra.test.js runs the card's numbers).
  INFRA_SHEET: (v, N) =>
    fn('admin.js', 'const infraOn = ', '\n', 'infraOn', {INFRA_SHEET: N})({ok: true, cells: {}, ...(v === undefined ? {} : {v})}),
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
  // The corals' look-alike pairs (sync.js stOn, app.js structOn through core.js structSheet, the corals' SUBJECTS
  // structure sheet; Code.gs stMain_, gen_ under the pairs): their stamp said and a replay under a new one adopted, the
  // pairs laid over data.json, from the script that replays the corals under them (tests/coralcontent.test.js); before,
  // the text slots alone, nothing sent.
  PAIRS_SHEET: (v, N) => {
    const structSheet = S => (S && S.structure && S.structure.sheet ? S.structure.sheet() : 146),
      S = {id: 'coral', replay: true, structure: {sheet: () => N}},
      on = fn('sync.js', 'const stOn = ', '\n', 'stOn', {structSheet, rpOn: S => !!S.replay})(S, v),
      app = fn('app.js', 'const structOn = ', '\n', 'structOn', {structSheet, sheetV: () => (v === undefined ? 0 : v)})(S);
    assert.strictEqual(on, app, 'the app and the sync agree');
    return on;
  },
  // The sea slugs' look-alike pairs under the content editor (core.js SUBJECTS seaslug structure sheet; Code.gs subjRpl_
  // over seaslug.json): the app lays the pairs over its units (app.js structOn) and says their stamp
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
      ASUBJ: null,
      groupsOn: () => false
    })({open: 'group', sheet: N}),
  // The staff and cohort boards (progress.js boardScopes; Code.gs board_ staff, cohorts): from the version that serves
  // them; before, the one general board, whatever the reply carries.
  SCOPES_SHEET: (v, N) =>
    fn('progress.js', 'function boardScopes(', '\nfunction viewBoard', 'boardScopes', {
      SCOPES_SHEET: N,
      GROUPS_SHEET: Infinity,
      myCohort: () => '',
      boardMe: () => -1
    })({ok: true, rows: [['A', 1, null]], staff: [['B', 2, null]], cohorts: [], ...(v === undefined ? {} : {v})}).top.length > 1,
  // The player groups' boards (progress.js boardScopes; Code.gs board_ groups): from the version that serves them, the
  // player's own groups' boards first, then All players; before, whatever the reply carries.
  GROUPS_SHEET: (v, N) =>
    fn('progress.js', 'function boardScopes(', '\nfunction viewBoard', 'boardScopes', {
      SCOPES_SHEET: Infinity,
      GROUPS_SHEET: N,
      myGroups: () => ['g:1'],
      myCohort: () => '',
      boardMe: () => -1
    })({ok: true, rows: [['A', 1, null]], groups: [{id: 'g:1', n: 'G', rows: [['B', 2, null]]}], ...(v === undefined ? {} : {v})}).top
      .length > 1,
  // The admin's Cohort select on a player's bar (admin.js cohortOn; Code.gs userGroup cohort): from the version that
  // keeps it, until the player groups (GROUPADM_SHEET) take its place.
  COHORT_SHEET: (v, N) =>
    fn('admin.js', 'const cohortOn = ', '\n', 'cohortOn', {USERS: v === undefined ? {} : {v}, COHORT_SHEET: N, groupsOn: () => false})(),
  // The player groups in the admin (admin.js groupsOn: a player's groups as chips, Players › Groups; Code.gs userGroup,
  // groupMake, groupEdit, groupDrop): from the version that has them; before, the beta group and the cohort.
  GROUPADM_SHEET: (v, N) => fn('admin.js', 'const groupsOn = ', '\n', 'groupsOn', {USERS: v === undefined ? {} : {v}, GROUPADM_SHEET: N})(),
  // Groups that carry rights in the admin (admin.js rightsOn: a group's Rights row, the key, the confirm, rights off, the
  // merge warning from mergePlan, the admin list; Code.gs groupDo_ rights, roff, mergePlan_, roles_): from the version
  // that serves them; before, the Groups page as it was.
  RIGHTSADM_SHEET: (v, N) =>
    fn('admin.js', 'const rightsOn = ', '\n', 'rightsOn', {USERS: v === undefined ? {} : {v}, RIGHTSADM_SHEET: N})(),
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
  // The fish's own pooled statistics (core.js SUBJECTS fish stats; Code.gs ?stats=1&s=fish): asked for only from the script
  // version that this change ships in, as the sea slugs' (tests/fishstats.test.js keeps and joins the reply).
  FISHST_SHEET: (v, N) => {
    const FI = C.subjectOf('fish');
    assert.strictEqual(FI.stats, N);
    let asked = '';
    fn('sync.js', 'function loadOwnStats(', '\n// A switch to a subject', 'loadOwnStats', {
      SYNC_URL: 'https://sheet.invalid/exec',
      SUBJ: FI,
      sheetV: () => (v === undefined ? 0 : v),
      appVer: () => 1,
      ownStatsAt: {},
      fetch: u => ((asked = u), new Promise(() => {}))
    })();
    if (asked) assert.match(asked, /[?&]stats=1&s=fish&/);
    return !!asked;
  },
  // A Find the X's photo tapped (quiz.js answer pa): sent from the version that stores it (Code.gs Photo answered),
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
  },
  // An answer's content version (quiz.js and live.js cv, app.js contentVer; ROADMAP "Content versions and duplicate-safe
  // answers"): sent from the version that stores it (Code.gs Content version), through core.js logOut at both of sync.js's
  // sends; before, the copy sent leaves it out and keeps the rest, the queue untouched.
  CV_SHEET: v => {
    const {logOut} = require('../core.js'),
      a = {id: 'a1', m: 'quiz', ph: 'p1', cv: 'c1x2y3z'},
      out = logOut(a, v);
    assert.deepStrictEqual(a, {id: 'a1', m: 'quiz', ph: 'p1', cv: 'c1x2y3z'}, 'the queued entry untouched');
    assert.deepStrictEqual({...out, cv: 'c1x2y3z'}, a, 'every other field sent as it is');
    const plain = {id: 'a2', m: 'quiz'};
    assert.strictEqual(logOut(plain, v), plain, 'an answer without it is sent as it is');
    return out.cv === 'c1x2y3z';
  },
  // The photos' time terms (core.js PTIME, ptimeInto: a photo's 6th to 8th numbers in ?stats=1; model.js ptmOf): read from
  // a reply of the version that serves them; before, none, so every photo's difficulty stays as it was.
  PTIME_SHEET: (v, N) => {
    const ptmOf = fn('model.js', 'const ptmOf = ', '\nfunction statsJoin', 'ptmOf', {PTIME_SHEET: N}),
      tm = ptmOf({a: [0.1, 4, 3, 4, 'Acropora', 0.2, 0, 1.1], b: [0.3, 2, 1, 2, 'Acropora']}, v);
    assert.ok(!('b' in tm), 'a photo without a term has none');
    return 'a' in tm && JSON.stringify(tm.a) === '[0.2,0,1.1]';
  },
  // The player's time net of the photo's (quiz.js ptNetOn, photoTimeQ; core.js rtWeight ti, scoreRec i, rules version
  // 13): from the script whose replay nets it the same way and keeps the term; before, no term (undefined): the answer
  // weighs and is logged as before.
  RTNET_SHEET: (v, N) => {
    const q = fn('quiz.js', 'const ptNetOn = ', '\n// One answer recorder', 'photoTimeQ', {
      sheetV: () => (v === undefined ? 0 : v),
      RTNET_SHEET: N,
      ptimeQ: C.ptimeQ,
      PTM: {a: [0.4, 0, 1], b: [0.2, 0.1, 2]}
    })([{f: 'a'}, {f: 'b'}, {f: 'c'}]);
    assert.ok(q === undefined || Math.abs(q - 0.2) < 1e-9, String(q));
    return q !== undefined;
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

// The ratchet: no gate at or below the floor (delete it with its old branch
// when the floor rises), and the floor never above main's VERSION (a PR never edits VERSION, rule D3, so this checkout's
// is main's): it is a version already live, never the one the app is built against.
test('the gate floor: no gate at or below SHEET_FLOOR, SHEET_FLOOR at or below VERSION', () => {
  assert.ok(Number.isInteger(C.SHEET_FLOOR) && C.SHEET_FLOOR > 0, String(C.SHEET_FLOOR));
  assert.ok(C.SHEET_FLOOR <= VERSION, `SHEET_FLOOR ${C.SHEET_FLOOR} is above main's VERSION ${VERSION}: set it to a version already live`);
  const low = ANY.filter(g => g.N <= C.SHEET_FLOOR).map(g => `${g.name} = ${g.N} (${g.file})`);
  assert.deepStrictEqual(low, [], `gates at or below SHEET_FLOOR ${C.SHEET_FLOOR}: delete each with its old branch`);
  assert.ok(Object.keys(FOUND).length >= 3 && ANY.length >= Object.keys(FOUND).length, 'the gates are still found');
  // the core.js copy embedded in Code.gs holds the same floor (tools/sync_core.py)
  assert.match(read('tools/sync/Code.gs'), new RegExp(`\\bconst SHEET_FLOOR = ${C.SHEET_FLOOR};`));
});

// The floor as the app reads it: sync.js sheetV is never below SHEET_FLOOR, also before any reply (a new device, an offline
// first launch: nothing stored), and a newer reply's version is kept as it is. Every gate left stays off until a reply
// says its version.
test('sheetV: SHEET_FLOOR before any reply or over an older stored one, the stored version above it', () => {
  const mem = {},
    sheetV = fn('sync.js', 'const sheetV = ', '\n', 'sheetV', {
      SHEET_FLOOR: C.SHEET_FLOOR,
      SHEETV: 'reefid-sheet-v',
      store: {get: (k, d) => (k in mem ? mem[k] : d)}
    });
  assert.strictEqual(sheetV(), C.SHEET_FLOOR, 'no reply yet');
  for (const k of Object.keys(FOUND)) assert.ok(FOUND[k].N > sheetV(), `${k} on before any reply`);
  mem['reefid-sheet-v'] = 0;
  assert.strictEqual(sheetV(), C.SHEET_FLOOR, 'a stored 0');
  mem['reefid-sheet-v'] = C.SHEET_FLOOR - 40;
  assert.strictEqual(sheetV(), C.SHEET_FLOOR, 'a stored version below the floor');
  mem['reefid-sheet-v'] = C.SHEET_FLOOR + 7;
  assert.strictEqual(sheetV(), C.SHEET_FLOOR + 7, 'a newer one as it is');
});
