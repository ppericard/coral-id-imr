// The work of one answer, counted: how many times each named function of the app runs per answer, and how much the
// device's storage is read and written, on a simulated player's saved state (REE-265 step 0; the study is
// docs/reviews/2026-11-24-incremental-engine-state.md, section 1). Work counts, not timings: they do not move with the
// machine's load, so a ceiling on them can fail a check. Offline: reads and serves the repository's files, sends nothing
// (rule D1), the player is signed out, no photo is served.
//
//   node tools/answercost.js                                  every subject at three histories: fish, corals and sea slugs at
//                                                             50, 500 and 3,000 answers (STATES; CI's "answer cost" job runs this)
//   node tools/answercost.js --states fish:50,fish:500        other states (subject:answers, subject fish|coral|seaslug)
//   node tools/answercost.js --dump A.json,B.json             saved states made earlier (tools/learnsim.js --dump)
//   node tools/answercost.js --budget tools/answercost-budget.json   fail (exit 1) when a count passes its ceiling
//   node tools/answercost.js --write-budget FILE [--margin 1.25] [--also A.json,B.json]   write the measured counts (the
//                                                             largest, with the --out files of other runs), times the
//                                                             margin, as the ceilings of FILE (the states measured replace theirs)
//   [--n 8] [--warm 2] [--seed 1|1,2,3|off] [--clock 30|SECONDS|off] [--out counts.json] [--cache DIR] [--regen]
//   [--par N]   N states made or counted at once (N browsers; default 1, 3 on CI, where the run is the whole machine's)
//   [--data-now]   the data (.json files) of the tree under test, not of the pinned tree (to see what a refill changes)
//   [--repeat N]   each state and seed counted N times and the runs compared (exit 1 when the questions asked or the calls an
//                  answer differ): the check that a count repeats; by hand, after a change to how the page is started
//   [--trace]      where each random number is drawn (the tick, the callers, the value) and the page's state at the restart, in --out
//
// A state is made once by tools/learnsim.js (profile lectureRA, seed 1, the page's own answers; the sea slugs play the
// fish part of the profile, the same engine) and kept in the cache (REEFID_ANSWERCOST_CACHE, else reefid-answercost in
// the temporary directory, shared by every worktree). The missing states of a subject are made by one run to the longest
// of them, which saves each of the others on its way: the nine states of STATES take about 2 minutes 15 s on a quiet 4-core
// machine (three runs side by side, fish 3,000 the longest), 5 to 14 minutes when other agents load it, counting them 40 s
// at --par 3. The page plays --warm answers it does not count, then --n it does (three right, one wrong, in the page's own mix of
// formats), each through the tap, the feedback, the deferred planning, Next and its top-up. V8's precise coverage counts
// the invocations of every named function of the app's files (anonymous callbacks are left out, so the true totals are
// higher), divided by the answers counted; localStorage getItem and setItem are wrapped to count calls and characters (the text read or written, however the app parses it). The page's
// Math.random is seeded (--seed off: not) and the seed changes the questions drawn, so the counts of a state move with the
// seed (fish 3,000 answers: 0.3 to 0.4 M calls over seeds 1 to 3), and a ceiling is the largest over three seeds times a
// margin. With the seed fixed a count is repeatable (REE-281): the page's clock is virtual (Date and performance.now stand
// still between the tool's ticks, 4 s of thinking and 6 s of pause an answer), the random numbers start over from the seed
// at each tick, every photo is the same 1 x 1 picture served at once, the page boots on About, which draws no question (a
// question the boot draws is kept and shown again by the quiz, with the photos and the planner's memory it left, and which
// one the boot draws depends on the order the script tiers load in), is at rest (every tier set up, the photos planned ahead
// in, the idle tasks run) before the plans are dropped, the numbers start from the seed and the quiz opens, and the
// data (.json) is the pinned tree's, so
// neither the machine's load, nor the order of an idle task, nor a photo that fails, nor a bot's refill of the data moves it
// (the same fish:50 counted 133,183 calls an answer twice and 183,144 the third time before). The page's clock starts --clock
// seconds (30) after the state's last answer, so the player is in the middle of a session whenever the file is played: a
// gap of several hours since the last answer starts a comeback (model.js rustNow), which draws from fewer units and costs
// less (fish 50 answers: 0.36 M calls an answer after a gap of hours, 0.51 M inside a session). --clock off: the machine's
// clock, so the file's age decides (and the run is not repeatable).
//
// Heavy (rule W24): it takes the machine slot before it starts Chromium. No routine local check runs it (Pierre,
// 2026-11-24 14:06: a minute or two a check, times the checks, times the agents, climbs very fast): the unit tests
// (tests/answercost.test.js) hold only its pure parts, and every count against the budget runs in CI's "answer cost" job
// (.github/workflows/smokes.yml), in parallel with the smokes. By hand, for an agent working on speed:
//   SMOKE_SLOTS=1 node tests/slot.js --name answercost -- node tools/answercost.js --budget tools/answercost-budget.json
'use strict';
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  http = require('http'),
  {spawn, spawnSync} = require('child_process');

const ROOT = path.join(__dirname, '..');
// The files whose functions are counted (the app's scripts).
const FILES = /\/(core|model|app|quiz|progress|sync|idtips|live)\.js/;
// The functions read by name in the study, by the name V8 infers (the same name in two files is added up).
const WATCH = [
  'answer', 'recordAnswer', 'scoreAnswer', 'scoreStep', 'planNext', 'planPhoto', 'quizPhoto', 'route', 'showProg', 'achCheck', 'achSnap',
  'faOf', 'faScan', 'faTable', 'scoreOf', 'barOf', 'examOpen', 'genScore', 'lvStep', 'level', 'shaky', 'ability', 'abilityOf', 'drawW', 'weight', 'weighted',
  'examOn', 'examReady', 'examLooks', 'lookRev', 'lookLeft', 'looksLeft', 'matesLeft', 'groupsNow', 'groupsOfRank',
  'bonusList', 'pool', 'cbPlay', 'sciUp', 'autoOf',
  // the units in play, the tree's score and the levels are views of the state version (app.js stateView): their readers
  // are closures V8 cannot name, so the computations are counted (bonusCalc, headScoreCalc, lvStepCalc…) and the reads
  // (stateNow, once per read of a view)
  'bonusCalc', 'poolCalc', 'sciUpCalc', 'shareFreeCalc', 'sciNowCalc', 'headScoreCalc', 'lvTableCalc', 'lvStepCalc', 'lvSteps', 'stateNow', 'spPlay', 'sciPlay', 'sciOpen', 'sciNow', 'lvlNext', 'shareFree', 'sharesNow', 'unlocked',
  'introduced', 'closed', 'asked', 'askedOpen', 'introReady', 'introMap', 'mayOpen', 'treeGate', 'treeC3', 'photoAny', 'GX',
  'headScore', 'headPct', 'progPct', 'treeScore', 'pctOf', 'rustNow', 'recallAt', 'stability', 'genusDiff', 'photoDiff', 'photoSet',
  'typeNames', 'treeTypeNames', 'typeDist', 'typeMatchIn', 'imrSaid', 'startV', 'sheetV', 'tipsLoad', 'get', 'set', 'logAnswer', 'save', 'syncSoon',
  'rtMedian', 'domUpdate', 'domScore', 'shownAll', 'varLeft', 'distractors', 'trapsFor', 'confOf', 'pairConf', 'confusable', 'answersSoFar', 'tally'
];
// The states the budget holds: every subject at a short history, a medium one and a long one (REE-274: the app's
// optimisations are for every subject, so every subject is measured; the fish alone are the heaviest, not the target). And what a
// budget holds by default (--write-budget): the total, the storage and the functions whose count grew with the state in
// the study.
const SUBJECTS = ['fish', 'coral', 'seaslug'];
const HISTORIES = [50, 500, 3000];
const STATES = SUBJECTS.flatMap(s => HISTORIES.map(n => `${s}:${n}`)).join(',');
const BUDGETED = ['namedCalls', 'getCalls', 'getChars', 'setChars'];
const BUDGETED_FN = ['introduced', 'scoreOf', 'faOf', 'lvStepCalc', 'bonusCalc', 'lvlNext', 'treeScore', 'achSnap', 'sheetV'];
// A ceiling never below this many calls, so a function the state does not call today may call a few.
const FLOOR = 100;
// The simulated player of the states, as the study's (docs/reviews/2026-11-24-per-answer-cost.md).
const PLAYER = {profile: 'lectureRA', seed: 1};

// ---------------------------------------------------------------------------------------------------------------
// Pure parts (tests/answercost.test.js): states named, counts flattened, ceilings checked and written.

// 'fish:50,coral:3000' -> [{name, subject, answers}]
function parseStates(spec) {
  return String(spec)
    .split(',')
    .filter(Boolean)
    .map(s => {
      const m = new RegExp(`^(${SUBJECTS.join('|')}):(\\d+)$`).exec(s.trim());
      if (!m || Number(m[2]) < 1) throw new Error(`bad state ${s} (fish:50, coral:3000: subject ${SUBJECTS.join(', ')}, then the answers)`);
      return {name: `${m[1]}:${m[2]}`, subject: m[1], answers: Number(m[2])};
    });
}

// A row's counts as one flat map: namedCalls, getCalls, getChars, setCalls, setChars, and fn:<name> for each watched
// function (its calls per answer, over every file).
function metrics(row) {
  const m = {
    namedCalls: row.namedCalls,
    getCalls: row.store.getCalls,
    getChars: row.store.getChars,
    setCalls: row.store.setCalls,
    setChars: row.store.setChars
  };
  for (const [k, c] of Object.entries(row.watch || {})) {
    const key = 'fn:' + k.split('@')[0];
    m[key] = Math.round((m[key] || 0) * 10 + c * 10) / 10;
  }
  return m;
}

// Two significant digits, rounded up: the ceiling reads as a round number and never falls below the value.
function roundUp(x) {
  if (!(x > 0)) return 0;
  const e = 10 ** Math.max(0, Math.floor(Math.log10(x)) - 1);
  return Math.ceil(x / e) * e;
}

// The ceilings for one state's counts (a row, or several rows of the same state: other seeds, other runs): each counted
// metric's largest value times the margin, rounded up, never below FLOOR calls (the characters are in the thousands).
function ceilings(rows, margin) {
  const ms = [].concat(rows).map(metrics),
    out = {};
  for (const k of [...BUDGETED, ...BUDGETED_FN.map(f => 'fn:' + f)])
    out[k] = Math.max(FLOOR, roundUp(Math.max(0, ...ms.map(m => m[k] || 0)) * margin));
  return out;
}

// What a row passes: [{state, metric, value, ceiling}] over the budget's ceilings for that state (none: no check).
function over(row, budget) {
  const c = (budget && budget.states && budget.states[row.state]) || {},
    m = metrics(row);
  return Object.entries(c)
    .filter(([k, ceil]) => (m[k] || 0) > ceil)
    .map(([k, ceil]) => ({state: row.state, metric: k, value: m[k], ceiling: ceil}));
}

// Whether the page's history (H, read after the warm-up answers it played) is far from the state's: more than 5% (at least
// 10 answers) off the state's answers plus the warm-up.
const historyOff = (H, answers, warm) => !(Math.abs(H - warm - answers) <= Math.max(10, 0.05 * answers));

// Whether the runs of one state at one seed (rows of the same state and seed, --repeat) agree: the same units asked, in the
// same order, the same calls an answer (within TOL: the coverage of an idle callback that ran or not moves a count by a few
// calls of a hundred thousand) and the same storage traffic (within STORE_TOL: once in about sixty counts on a throttled,
// loaded machine the device's log was read twice more, 3% of the characters read, with the same questions asked; the cause is
// not known, a timer of the page on the wall clock is a guess).
// {ok, why}: why names the first run that parts from the first, and how.
const TOL = 0.001,
  STORE_TOL = 0.05;
function repeatable(rows, tol = TOL, storeTol = STORE_TOL) {
  const [a, ...rest] = rows;
  for (const [k, r] of rest.entries()) {
    const at = `run ${k + 2} of ${r.state}${r.seed === null || r.seed === undefined ? '' : ` seed ${r.seed}`}`;
    if (a.asked.join() !== r.asked.join()) return {ok: false, why: `${at} asked ${r.asked.join(', ')} where run 1 asked ${a.asked.join(', ')}`};
    if (Math.abs(r.namedCalls - a.namedCalls) > tol * a.namedCalls) return {ok: false, why: `${at} counted ${r.namedCalls} calls an answer where run 1 counted ${a.namedCalls}`};
    for (const f of ['getCalls', 'getChars', 'setChars'])
      if (Math.abs(r.store[f] - a.store[f]) > storeTol * a.store[f]) return {ok: false, why: `${at} counted ${r.store[f]} for ${f} where run 1 counted ${a.store[f]}`};
  }
  return {ok: true, why: ''};
}

const fmt = x => (x === undefined || x === null ? '-' : Math.round(x).toLocaleString('en-US'));

// What a run says against a budget file: {lines, bad, annotations}. Each count over its ceiling is named (state, count,
// value, ceiling) and fails the run; annotations are the same as GitHub's error lines, which CI shows on the job.
function verdict(rows, budget, file) {
  const bad = rows.flatMap(r => over(r, budget)),
    none = rows.filter(r => !(budget.states || {})[r.state]).map(r => r.state),
    lines = [],
    annotations = [];
  if (none.length) lines.push(`\nNo ceiling for ${none.join(', ')} in ${file}: not checked.`);
  for (const b of bad) {
    lines.push(`OVER BUDGET ${b.state}: ${b.metric} ${fmt(b.value)} per answer, ceiling ${fmt(b.ceiling)}`);
    annotations.push(`::error title=Answer cost over budget::${b.state}: ${b.metric} ${fmt(b.value)} per answer, ceiling ${fmt(b.ceiling)} (${file})`);
  }
  if (bad.length) lines.push(`\n${bad.length} count${bad.length > 1 ? 's' : ''} over the budget of ${file}: an answer now does more work than it did.`);
  else lines.push(`\nWithin budget (${file}): ${rows.filter(r => (budget.states || {})[r.state]).map(r => r.state).join(', ') || 'no state'}.`);
  return {lines, bad, annotations};
}
const mil = x => (x >= 1e5 ? (x / 1e6).toFixed(2) + ' M' : fmt(x));

// The study's table (section 1.2), one line a state, from the rows.
function table(rows) {
  const head = ['State', 'U', 'V', 'T', 'R', 'Calls per answer', '`introduced`', '`scoreOf`', 'Storage reads: calls (chars)', 'Chars written'],
    multi = new Set(rows.map(r => r.seed)).size > 1, // several seeds: the seed beside the state
    line = r => {
      const m = metrics(r),
        s = r.size;
      return [
        multi ? `${r.state} (seed ${r.seed})` : r.state,
        fmt(s.records),
        fmt(s.play),
        fmt(s.tree),
        fmt(s.conf + s.off),
        mil(m.namedCalls),
        fmt(m['fn:introduced'] || 0),
        fmt(m['fn:scoreOf'] || 0),
        `${fmt(m.getCalls)} (${mil(m.getChars)})`,
        mil(m.setChars)
      ];
    };
  return [head, head.map(() => '---'), ...rows.map(line)].map(l => `| ${l.join(' | ')} |`).join('\n');
}

// The ceilings written for the states measured: a file {about, margin, states: {name: {metric: ceiling}}}; the states
// not measured keep theirs.
function writeBudget(file, rows, margin) {
  let old = {};
  try {
    old = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  const states = {...(old.states || {})};
  for (const s of new Set(rows.map(r => r.state))) states[s] = ceilings(rows.filter(r => r.state === s), margin);
  const sorted = Object.fromEntries(Object.entries(states).sort(([a], [b]) => a.localeCompare(b, 'en', {numeric: true})));
  fs.writeFileSync(file, JSON.stringify({about: old.about || '', margin, states: sorted}, null, 1) + '\n');
}

// ---------------------------------------------------------------------------------------------------------------
// States: made by tools/learnsim.js, kept in the cache.

// The players are made on a PINNED version of the app, not on the one being counted (REE-274): a player's saved state is
// what the app of its day made of the same simulated person, and a change of the draw or of the rules changes the player
// the app makes (the sea slugs' 500 answers: 82 units met on one commit, 68 after the ease weight changed, and twice the
// `scoreOf` calls), which would move the counts of a change that did not touch the code counted. The pin is a commit of
// main; the app of that commit is read with `git archive` (fetched when this clone lacks it) and served to learnsim
// (--root); the tools, the profiles and the answering are the current ones. The states are what an older save is: the
// version counted must read them. The same pin holds the DATA the count loads (every .json file the page asks for:
// data.json, fish-game.json, seaslug-game.json, curation.json, ...): the code counted is the tree under test, its data is
// the pinned tree's, so a bot's refill of the photos (a Candidate photos commit changes seaslug-game.json and data/cand.json
// on main, with no change of code) never moves a count, and the players' units are the data's they were made on.
// A change that needs newer data (a new field the code reads) moves the pin, as below. Moving the pin means making the
// players again and setting every ceiling again (--write-budget with the three seeds), in a PR of its own;
// tests/answercost.test.js reads this line.
const PLAYERS_AT = 'f848c3d4fa92eec4d6777871431f067ff1f48b74';
// The cache holds one folder per way the states are made (GEN) and per pin, so neither a change of the way nor of the pin
// ever reuses an older state.
const GEN = 'beyond';
const cacheDir = o => path.join(o || process.env.REEFID_ANSWERCOST_CACHE || path.join(os.tmpdir(), 'reefid-answercost'), `${GEN}-${PLAYERS_AT.slice(0, 7)}`);

// The pinned app as files, in DIR/app (made once).
function ensureApp(dir) {
  const app = path.join(dir, 'app');
  if (fs.existsSync(path.join(app, '.pinned'))) return app;
  const git = (a, o) => spawnSync('git', a, {cwd: ROOT, maxBuffer: 1 << 29, ...o});
  if (git(['cat-file', '-e', `${PLAYERS_AT}^{commit}`]).status !== 0) {
    const f = git(['fetch', '--quiet', '--depth=1', 'origin', PLAYERS_AT], {encoding: 'utf8'});
    if (f.status !== 0) throw new Error(`the pinned version of the app (${PLAYERS_AT.slice(0, 7)}) is not in this clone and git fetch could not get it: ${String(f.stderr).slice(-300)}`);
  }
  const tmp = fs.mkdtempSync(path.join(dir, '.app-')),
    ar = git(['archive', PLAYERS_AT]),
    tar = ar.status === 0 ? spawnSync('tar', ['-x', '-C', tmp], {input: ar.stdout, maxBuffer: 1 << 24}) : ar;
  if (ar.status !== 0 || tar.status !== 0) {
    fs.rmSync(tmp, {recursive: true, force: true});
    throw new Error(`the pinned version of the app (${PLAYERS_AT.slice(0, 7)}) could not be read with git archive: ${String(ar.stderr || tar.stderr).slice(-300)}`);
  }
  fs.writeFileSync(path.join(tmp, '.pinned'), PLAYERS_AT + '\n');
  fs.rmSync(app, {recursive: true, force: true});
  fs.renameSync(tmp, app);
  return app;
}
const stateFile = (dir, st) => path.join(dir, `${st.subject}-${PLAYER.profile}-${PLAYER.seed}-${st.answers}.json`);

// Runs fn on each item, at most par at once; the results in the items' order.
async function pool(items, par, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({length: Math.max(1, Math.min(par, items.length))}, async () => {
      for (let i = next++; i < items.length; i = next++) out[i] = await fn(items[i], i);
    })
  );
  return out;
}

// One run of learnsim for a subject, to its longest missing state, saving each missing state of that subject on the
// way (--dump-at): the player and the seed are the same whatever the length, so the state at 500 answers of a run to 3,000
// is the state at 500 answers of a run to 500. The card that offers a part of the slate by choice is answered yes on the
// subjects that have it (the fish and the sea slugs, their circle 3), as the study's was; the corals meet none.
function makeSubject(subject, answers, dir, app) {
  const tmp = fs.mkdtempSync(path.join(dir, '.new-')),
    t0 = Date.now(),
    last = Math.max(...answers);
  console.error(`answercost: making ${subject}:${answers.join(',')} with tools/learnsim.js (${PLAYER.profile}, seed ${PLAYER.seed})…`);
  const args = [
    path.join(__dirname, 'learnsim.js'),
    // --seeds 1 plays seed 1 (learnsim: seeds 1 to N)
    ...['--subject', subject, '--profiles', PLAYER.profile, '--seeds', String(PLAYER.seed), '--questions', String(last)],
    ...['--choice', 'auto', ...(subject === 'coral' ? [] : ['--beyond', 'yes']), '--workers', '1', '--dump', tmp, '--dump-at', answers.join(',')],
    ...['--root', app]
  ];
  return new Promise((ok, fail) => {
    let err = '';
    const ch = spawn(process.execPath, args, {stdio: ['ignore', 'pipe', 'pipe']});
    ch.stdout.on('data', d => (err = (err + d).slice(-2000)));
    ch.stderr.on('data', d => (err = (err + d).slice(-2000)));
    ch.on('error', fail);
    ch.on('close', code => {
      try {
        const made = answers.map(n => [path.join(tmp, `${subject}-${PLAYER.profile}-${PLAYER.seed}-${n}.json`), stateFile(dir, {subject, answers: n})]);
        if (code !== 0 || made.some(([f]) => !fs.existsSync(f))) throw new Error(`learnsim did not make ${subject}:${answers.join(',')} (exit ${code}): ${err.slice(-600)}`);
        for (const [from, to] of made) fs.renameSync(from, to);
        console.error(`answercost: ${subject}:${answers.join(',')} made in ${Math.round((Date.now() - t0) / 1000)} s.`);
        ok();
      } catch (e) {
        fail(e);
      } finally {
        fs.rmSync(tmp, {recursive: true, force: true});
      }
    });
  });
}

// The files of the states, made when the cache has none (or --regen): one run a subject, par at once.
async function ensureStates(states, dir, regen, par) {
  const need = {};
  for (const s of states)
    if (!s.file && (regen || !fs.existsSync(stateFile(dir, s)))) (need[s.subject] = need[s.subject] || new Set()).add(s.answers);
  if (!Object.keys(need).length) return states.map(s => s.file || stateFile(dir, s));
  fs.mkdirSync(dir, {recursive: true});
  const app = ensureApp(dir);
  await pool(Object.entries(need), par, ([subject, answers]) => makeSubject(subject, [...answers].sort((a, b) => a - b), dir, app));
  return states.map(s => s.file || stateFile(dir, s));
}

// ---------------------------------------------------------------------------------------------------------------
// The count, in Chromium.

// The picture every photo is (a 1 x 1 PNG).
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
// The file a request is served from: the code (and everything else) from ROOT, the tree under test; a .json file from
// DATAROOT, the pinned tree, when it holds one (a .json it lacks, a file added since the pin, comes from ROOT); null when
// the path leaves the tree.
function pick(root, dataRoot, u) {
  const rel = u.endsWith('/') ? u + 'index.html' : u,
    f = path.join(root, rel);
  if (!f.startsWith(root)) return null;
  if (dataRoot && path.extname(f) === '.json') {
    const d = path.join(dataRoot, rel);
    if (d.startsWith(dataRoot) && fs.existsSync(d)) return d;
  }
  return f;
}
const serveFrom = dataRoot => (req, res) => {
  const f = pick(ROOT, dataRoot, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f) return res.writeHead(403), res.end();
  fs.readFile(f, (e, b) => {
    if (e) return res.writeHead(404), res.end();
    res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'});
    res.end(b);
  });
};

// Closes what stands between the player and the next question (cards, achievement pops) and waits for an answerable one.
async function prep(p) {
  for (let k = 0; k < 40; k++) {
    const st = await p.evaluate(() => {
      document.querySelectorAll('.achpop').forEach(x => x.remove());
      document.querySelectorAll('.unlock:not(.intro)').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
      const ob = document.querySelector('.unlock.intro [data-opens]') || document.querySelector('.unlock [data-bonus]');
      if (ob) return (ob.click(), 'card');
      const b = document.querySelector('.unlock.intro .ulbtns .next:not([data-open]):not([data-notnow]):not([data-back]):not(.sec)');
      if (b) return (b.click(), 'card');
      window.smokeTiles && smokeTiles();
      if (document.querySelector('#view .q:not(.done) :is([data-c], [data-w], .tyform input):not([disabled])')) return 'ready';
      // A question whose photo did not load (the tool serves none) closes its answers: the page's own "Another question".
      const fb = document.querySelector('#qfail button');
      if (fb) return (fb.click(), 'another');
      const nx = document.querySelector('#view .q.done') && document.getElementById('next');
      if (nx) return (nx.click(), 'next');
      return 'wait';
    });
    if (st === 'ready') return true;
    await p.waitForTimeout(250);
  }
  return false;
}
// Everything the answer scheduled for later has run (two idle periods).
const settle = p =>
  p.evaluate(
    () => new Promise(ok => setTimeout(() => requestIdleCallback(() => setTimeout(() => requestIdleCallback(ok, {timeout: 20000}), 120), {timeout: 20000}), 120))
  );
// One answer through the page's own controls, then Next; its format, or null when no question came.
// why: where the reason of a missing answer is left (what stood between the player and the question).
async function oneAnswer(p, i, why) {
  if (!(await prep(p))) {
    why.push(
      'no question: ' +
        (await p.evaluate(
          () =>
            `${location.hash} | cards: ${[...document.querySelectorAll('.unlock')].map(x => x.className + ' "' + x.innerText.slice(0, 60).replace(/\s+/g, ' ') + '"').join('; ')} | view: ${((document.getElementById('view') || {}).innerText || '').slice(0, 100).replace(/\s+/g, ' ')}`
        ))
    );
    return null;
  }
  await settle(p);
  let fmt;
  try {
    // 4 s to read and answer; the virtual clock (count) stands still otherwise
    const r = await p.evaluate(pick => (window.__tick && __tick(4000), smokeAnswer(pick)), i % 4 !== 3); // three right, one wrong
    fmt = r.fmt;
    (why.asked = why.asked || []).push(r.t); // the units asked (the row's `asked`: what a count is of)
  } catch (e) {
    why.push('smokeAnswer: ' + String(e.message).slice(0, 200));
    return null;
  }
  await settle(p);
  await p.evaluate(() => (window.__tick && __tick(6000), document.getElementById('next') && document.getElementById('next').click()));
  await settle(p);
  return fmt;
}

// When the state's player last answered: the last row of the device's answer log (reefid-log0), else the file's time.
function lastAnswerMs(ls, file) {
  try {
    const L = JSON.parse(ls['reefid-log0'] || '[]'),
      t = Date.parse(L[L.length - 1].t);
    if (t > 0) return t;
  } catch (e) {}
  return fs.statSync(file).mtimeMs;
}

// The row of one saved state: its sizes, the calls per answer, the storage traffic per answer.
// expect ({subject, answers}, for a state made here): what the page must have loaded, or the run fails naming the state.
async function count(browser, base, file, name, o, expect) {
  const PAGE = require(path.join(ROOT, 'tests', 'answer.js')).PAGE,
    ls = JSON.parse(fs.readFileSync(file, 'utf8')),
    ctx = await browser.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
  // Nothing outside the repository: the page asks nothing of the network and the count does not depend on what the
  // checkout holds. Every photo is the same 1 x 1 picture, served at once: photos that fail, each when its error event
  // comes, change which photos the draw may pick (gamePhotoOk) while the page runs, and the same seed then counted two
  // different sequences of questions (REE-281); loaded at once they cannot.
  await ctx.route(
    u => /\.(webp|jpe?g|png|gif)(\?|$)/.test(new URL(u.href).pathname),
    r => r.fulfill({status: 200, contentType: 'image/png', body: PIXEL})
  );
  await ctx.route(
    u => !u.href.startsWith(base),
    r => (/\.(webp|jpe?g|png|gif)(\?|$)/.test(new URL(r.request().url()).pathname) ? r.fallback() : r.abort())
  );
  await ctx.addInitScript(
    ({ls, seed, ref, trace}) => {
      if (ref !== null) {
        // The page's clock is a VIRTUAL one, from the state's own time: the rust since the last answer, the comeback, the time
        // since the first launch read the same whenever the state is played, and it stands still between the tool's ticks
        // (window.__tick, once a thinking time and once a pause an answer: the page's Date and performance.now). A clock that ran
        // with the machine's moved every weight a little, and the draw, with the same seed, flipped to another genus now and then:
        // the same fish:50 counted 133,183 calls an answer twice and 183,144 the third time (REE-281).
        const D = Date,
          V = (window.__vclock = {t: ref, p: performance.now()});
        window.Date = class extends D {
          constructor(...a) {
            super(...(a.length ? a : [V.t]));
          }
          static now() {
            return V.t;
          }
        };
        performance.now = () => V.p;
        // Each tick also starts the random numbers over from the seed and the tick's number: what an idle task drew between two
        // answers (how many numbers, in which order) cannot change the draw of the question that follows.
        let ticks = 0;
        window.__tick = ms => {
          V.t += ms;
          V.p += ms;
          window.__ticksN = ticks + 1;
          if (seed !== null) window.__reseed(++ticks);
        };
      }
      if (seed !== null) {
        let a = seed >>> 0; // mulberry32
        window.__reseed = n => (a = (seed + Math.imul(n, 0x9e3779b1)) >>> 0);
        Math.random = () => {
          a = (a + 0x6d2b79f5) >>> 0;
          let t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          const x = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          // --trace: where each number is drawn (the tick it follows, the callers) and its value, to find what the draws depend on
          if (trace) (window.__rt = window.__rt || []).push(`${window.__ticksN || 0} ${new Error().stack.split('\n').slice(2, 9).map(l => (/at (\S+)/.exec(l) || [])[1]).join('<')} = ${x.toFixed(6)}`);
          return x;
        };
      }
      if (sessionStorage.getItem('answercost')) return;
      sessionStorage.setItem('answercost', '1');
      localStorage.clear();
      for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v);
    },
    {ls, seed: o.seed, ref: o.clock === null ? null : lastAnswerMs(ls, file) + o.clock * 1000, trace: !!o.trace}
  );
  await ctx.addInitScript(PAGE);
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  // --throttle N: the page's CPU N times slower (a phone's, or a loaded machine's): a count must not move with it.
  if (o.throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', {rate: o.throttle});
  // The boot is not repeatable (REE-281): the script tiers come in as they load, a route() of theirs renders Home (its shuffle
  // draws random numbers) or the quiz first, and the question the boot draws is KEPT (quiz.js pendShow: stored, shown again by
  // route() as it was, pendTake) with the photos it joined to the session's window (model.js SEENQ) and the planner's
  // memory of it (last, lastQs). A page that opens on the quiz thus carries whichever question its boot order drew into
  // every later draw, whatever is reseeded or dropped afterwards. So the page opens on a page that draws no question
  // (About: tier 1), every tier is brought in and everything the boot started is awaited (the app's own chain: its tiers, the
  // planned questions' photos), nothing has been asked, and then, from the seed: the questions planned at the boot dropped
  // (the planner's state put back), the numbers from the seed, the quiz opened.
  await p.goto(base + '#about');
  await p.waitForFunction(() => window.APP_READY, null, {timeout: 120000});
  await p.evaluate(() => window.loadTier && window.loadTier(5)); // every script tier in (the promise is awaited), as a player who has opened My progress
  // The Lab's own files (proto/lab.js) load after it, and the last one in redraws Home or a Lab page: LAB.pending is 0 once they are.
  await p.waitForFunction(
    () => typeof HAVE === 'number' && HAVE >= 5 && !document.querySelector('.boot') && (typeof LAB === 'undefined' || LAB.pending === 0),
    null,
    {timeout: 120000}
  );
  await p.evaluate(() => typeof prefetched === 'function' && prefetched()); // the photos planned ahead are in
  await settle(p);
  // --trace: the page as the restart finds it, written into the trace as a line of its own
  const probe = async tag => {
    const s = await p.evaluate(tag => {
      const q = document.querySelector('#view .q'),
        st = {
          hash: location.hash,
          HAVE: typeof HAVE === 'number' ? HAVE : null,
          ready: !!window.APP_READY,
          boot: !!document.querySelector('.boot'),
          lab: typeof LAB === 'undefined' ? 0 : LAB.pending,
          question: !!q,
          seen: typeof SEENQ === 'object' ? SEENQ.length : null,
          kept: Object.keys(localStorage)
            .filter(k => /pending$/.test(k))
            .map(k => localStorage.getItem(k))
            .join('')
        };
      if (window.__rt) __rt.push(`== ${tag}: ${JSON.stringify(st)} last ${typeof last !== 'undefined' ? last : '?'} lastQs ${typeof lastQs !== 'undefined' ? lastQs : '?'}`);
      return st;
    }, tag);
    return s;
  };
  const at = await probe('before the restart');
  // A count over a page that was not at rest is no count (and says why).
  if (at.HAVE < 5 || at.boot || at.lab || at.question || at.seen)
    throw new Error(`${name}: the page was not at rest for the restart (${JSON.stringify(at)}): a question drawn by the boot would carry its draw into the count`);
  await p.evaluate(() => {
    if (window.__reseed) __reseed(0);
    if (typeof dropPlans === 'function') dropPlans();
    typeof go === 'function' ? go('quiz') : (location.hash = '#quiz');
  });
  await p.waitForFunction(() => /quiz/.test(location.hash), null, {timeout: 30000});
  await settle(p);
  if (o.trace) await probe('after the restart');
  for (let i = 0; i < o.warm; i++) await oneAnswer(p, i, []);
  // The state's sizes, as the app reads them: U records, V units in play, T units of the tree, R pair counts.
  const size = await p.evaluate(() => {
    const units = Object.keys(P).filter(n => n !== LEVEL),
      cnt = f => units.reduce((t, n) => t + Object.keys((P[n] || {})[f] || {}).length, 0),
      play = pool();
    return {
      subj: SUBJ.id,
      H: answersSoFar(),
      records: units.length,
      conf: cnt('conf'),
      off: cnt('off'),
      photos: cnt('ps'),
      slate: slateGenera().length,
      bonus: bonusList().length,
      play: play.length,
      met: play.filter(introduced).length,
      tree: typeof TREEU === 'object' && TREEU ? Object.keys(TREEU.gen).length : Object.keys(DATA.gen).length + Object.keys((DATA.x || {}).gen || {}).length,
      sets: SETS().map(S => [S.k, (S.all || S.units)().length]),
      Pchars: JSON.stringify(P).length
    };
  });
  // The page is on the state's subject, with the state's history: a state that loaded as another subject, or with its
  // history lost, would be counted as another player's work and read as a cheap one.
  if (expect && expect.subject && size.subj !== expect.subject) throw new Error(`${name}: the page loaded the subject ${size.subj}, not ${expect.subject}`);
  if (expect && expect.answers && historyOff(size.H, expect.answers, o.warm))
    throw new Error(`${name}: the page holds ${size.H} answers (after ${o.warm} of warm-up) of the state's ${expect.answers}`);
  // The storage's own boundary (localStorage getItem and setItem, whoever calls them: store.get and store.set, the kept
  // queues' direct writes): calls and characters read and written per answer.
  await p.evaluate(() => {
    const C = (window.__st = {get: {calls: 0, chars: 0}, set: {calls: 0, chars: 0}, keys: {}});
    const proto = Storage.prototype,
      once = {get: proto.getItem, set: proto.setItem};
    for (const [op, name] of [
      ['get', 'getItem'],
      ['set', 'setItem']
    ]) {
      proto[name] = function (k, v) {
        const r = once[op].apply(this, arguments),
          n = String(op === 'get' ? r || '' : v).length;
        C[op].calls++;
        C[op].chars += n;
        const kk = op + ' ' + k,
          c = (C.keys[kk] = C.keys[kk] || {calls: 0, chars: 0});
        c.calls++;
        c.chars += n;
        return r;
      };
    }
  });
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.startPreciseCoverage', {callCount: true, detailed: false});
  const fmts = [];
  const why = [];
  for (let i = o.warm; i < o.warm + o.n; i++) fmts.push(await oneAnswer(p, i, why));
  const {result} = await cdp.send('Profiler.takePreciseCoverage');
  await cdp.send('Profiler.stopPreciseCoverage');
  const n = fmts.filter(Boolean).length;
  // Most of the answers played, and no page error: a count over a broken page is no count.
  if (n < Math.ceil(0.75 * o.n)) throw new Error(`${name}: ${n} of ${o.n} answers were played (${errs.join('; ') || 'no page error'}; ${why[0] || 'no reason seen'})`);
  if (errs.length) throw new Error(`${name}: page errors: ${errs.join('; ')}`);
  const by = new Map();
  let total = 0;
  for (const s of result) {
    if (!FILES.test(s.url)) continue;
    const f = path.basename(s.url).replace(/\?.*/, '');
    for (const fn of s.functions) {
      const c = fn.ranges[0].count;
      if (!fn.functionName || !c) continue;
      total += c;
      by.set(fn.functionName + '@' + f, (by.get(fn.functionName + '@' + f) || 0) + c);
    }
  }
  const per = x => Math.round((10 * x) / n) / 10,
    watch = {};
  for (const [k, c] of by) if (WATCH.includes(k.split('@')[0])) watch[k] = per(c);
  const st = await p.evaluate(() => window.__st),
    rtrace = o.trace ? await p.evaluate(() => window.__rt || []) : undefined;
  await ctx.close();
  return {
    state: name,
    size,
    answers: n,
    fmts: fmts.join(','),
    asked: why.asked || [],
    rtrace,
    errs,
    namedCalls: per(total),
    store: {
      getCalls: per(st.get.calls),
      getChars: per(st.get.chars),
      setCalls: per(st.set.calls),
      setChars: per(st.set.chars),
      keys: Object.entries(st.keys)
        .sort((a, b) => b[1].chars - a[1].chars)
        .slice(0, 12)
        .map(([k, v]) => [k, per(v.calls), per(v.chars)])
    },
    watch,
    top: [...by].sort((a, b) => b[1] - a[1]).slice(0, 45).map(([k, c]) => [k, per(c)])
  };
}

// ---------------------------------------------------------------------------------------------------------------

const USAGE =
  'usage: node tools/answercost.js [--states fish:50,coral:3000,seaslug:500 | --dump A.json,B.json] [--n 8] [--warm 2] [--seed 1|off] [--clock 30|SECONDS|off]\n' +
  '                                [--budget FILE | --write-budget FILE [--margin 1.25]] [--out counts.json] [--cache DIR] [--regen] [--par N] [--data-now] [--throttle N] [--repeat N] [--trace]';

async function main() {
  const argv = process.argv.slice(2),
    arg = (k, d) => {
      const i = argv.indexOf('--' + k);
      return i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
    };
  if (argv.includes('--help') || argv.includes('-h')) return console.log(USAGE);
  const known = new Set(['states', 'dump', 'n', 'warm', 'seed', 'clock', 'budget', 'write-budget', 'also', 'margin', 'out', 'cache', 'regen', 'par', 'data-now', 'throttle', 'trace', 'repeat']);
  for (const a of argv.filter(a => a.startsWith('--')))
    if (!known.has(a.slice(2))) return (console.error(`unknown option ${a}\n${USAGE}`), process.exit(2));
  let states;
  try {
    const dumps = arg('dump', '').split(',').filter(Boolean);
    if (dumps.length && arg('states', '')) throw new Error('--states or --dump, not both');
    states = dumps.length ? dumps.map(f => ({name: path.basename(f, '.json'), file: path.resolve(f)})) : parseStates(arg('states', STATES));
  } catch (e) {
    return (console.error(`${e.message}\n${USAGE}`), process.exit(2));
  }
  const o = {
      n: Number(arg('n', 8)),
      warm: Number(arg('warm', 2)),
      // --seed 1,2,3: each state counted once a seed (rows of one state, which --write-budget takes the largest of)
      seeds: arg('seed', '1') === 'off' ? [null] : arg('seed', '1').split(',').map(Number),
      clock: arg('clock', '30') === 'off' ? null : Number(arg('clock', 30)),
      throttle: Number(arg('throttle', 1)),
      trace: argv.includes('--trace'),
      repeat: Number(arg('repeat', 1))
    },
    margin = Number(arg('margin', 1.25)),
    par = Number(arg('par', process.env.CI ? 3 : 1)),
    budgetFile = arg('budget', null),
    budget = budgetFile ? JSON.parse(fs.readFileSync(path.resolve(budgetFile), 'utf8')) : null;
  if (!(o.n >= 1 && o.warm >= 0 && margin >= 1 && par >= 1 && Number.isInteger(o.repeat) && o.repeat >= 1 && o.seeds.every(s => s === null || Number.isInteger(s)))) return (console.error(USAGE), process.exit(2));

  // From here on the run is heavy: the machine slot first (rule W24, a no-op on CI), for the states to make and the count.
  await require('../tests/slot.js')('tools/answercost.js');
  const t0 = Date.now(),
    dir = cacheDir(arg('cache', null)),
    files = await ensureStates(states, dir, argv.includes('--regen'), par);
  const {chromium} = require('playwright');
  // The page's data is the pinned tree's, its code the tree under test's (--data-now: the tree's own data, to see what a
  // refill changes).
  fs.mkdirSync(dir, {recursive: true});
  const server = http.createServer(serveFrom(argv.includes('--data-now') ? null : ensureApp(dir)));
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  let rows;
  try {
    // The longest states first, so the last to finish is a short one; each worker has a Chromium of its own.
    // --repeat N: each state and seed counted N times, the runs compared (repeatable); the first run is the row.
    const jobs = states.flatMap((s, i) => o.seeds.flatMap(seed => Array.from({length: o.repeat}, () => ({i, seed})))),
      queue = jobs.map((j, k) => k).sort((a, b) => (states[jobs[b].i].answers || 0) - (states[jobs[a].i].answers || 0));
    rows = new Array(jobs.length);
    await Promise.all(
      Array.from({length: Math.min(par, jobs.length)}, async () => {
        const browser = await chromium.launch();
        try {
          for (let k = queue.shift(); k !== undefined; k = queue.shift()) {
            const {i, seed} = jobs[k],
              t1 = Date.now();
            rows[k] = {...(await count(browser, base, files[i], states[i].name, {...o, seed}, states[i].subject ? states[i] : null)), seed};
            console.error(`answercost: ${states[i].name}${o.seeds.length > 1 ? ` seed ${seed}` : ''} counted in ${Math.round((Date.now() - t1) / 1000)} s.`);
          }
        } finally {
          await browser.close();
        }
      })
    );
  } finally {
    server.close();
  }
  const every = rows; // every run: --out keeps them all, and a ceiling counts the largest
  if (o.repeat > 1) {
    const by = new Map();
    for (const r of rows) by.set(`${r.state}|${r.seed}`, [...(by.get(`${r.state}|${r.seed}`) || []), r]);
    const bad = [...by.values()].map(g => repeatable(g)).filter(v => !v.ok);
    for (const v of bad) console.log(`NOT REPEATABLE: ${v.why}`);
    console.log(bad.length ? `${bad.length} of ${by.size} counts differ between runs of the same seed.` : `Repeatable: ${by.size} counts, ${o.repeat} runs each, the same questions and the same calls.`);
    if (bad.length) process.exitCode = 1;
    rows = [...by.values()].map(g => g[0]);
  }
  console.error(`answercost: ${states.length} states${o.seeds.length > 1 ? `, seeds ${o.seeds.join(',')}` : ''}, ${Math.round((Date.now() - t0) / 1000)} s in all.`);
  console.log(table(rows));
  // CI shows the table on the job's page.
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Work of one answer, per state\n\n${table(rows)}\n\n`);
  if (arg('out', null)) fs.writeFileSync(path.resolve(arg('out', null)), JSON.stringify(every, null, 1));
  if (arg('write-budget', null)) {
    // --also A.json,B.json: rows of earlier runs (--out), their largest counts counting with this run's.
    const also = arg('also', '')
      .split(',')
      .filter(Boolean)
      .flatMap(f => JSON.parse(fs.readFileSync(path.resolve(f), 'utf8')));
    writeBudget(path.resolve(arg('write-budget', null)), [...every, ...also], margin);
    console.log(`\nCeilings written to ${arg('write-budget', null)} (margin x${margin}, two significant digits up, at least ${FLOOR} calls).`);
  }
  if (budget) {
    const v = verdict(every, budget, budgetFile); // every run of --repeat, not only the first
    for (const l of v.lines) console.log(l);
    if (process.env.GITHUB_ACTIONS) for (const a of v.annotations) console.log(a);
    if (v.bad.length) process.exitCode = 1;
  }
}

module.exports = {repeatable, TOL, parseStates, metrics, roundUp, ceilings, over, verdict, historyOff, table, writeBudget, stateFile, pool, ensureStates, pick, GEN, PLAYERS_AT, cacheDir, STATES, SUBJECTS, HISTORIES, BUDGETED, BUDGETED_FN, FLOOR};
if (require.main === module)
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
