// The work of one answer, counted: how many times each named function of the app runs per answer, and how much the
// device's storage is read and written, on a simulated player's saved state (REE-265 step 0; the study is
// docs/reviews/2026-11-24-incremental-engine-state.md, section 1). Work counts, not timings: they do not move with the
// machine's load, so a ceiling on them can fail a check. Offline: reads and serves the repository's files, sends nothing
// (rule D1), the player is signed out, no photo is served.
//
//   node tools/answercost.js                                  the study's states: fish 50 and 3,000 answers, corals 3,000
//   node tools/answercost.js --states fish:50,fish:500        other states (subject:answers, subject fish|coral)
//   node tools/answercost.js --dump A.json,B.json             saved states made earlier (tools/learnsim.js --dump)
//   node tools/answercost.js --budget tools/answercost-budget.json   fail (exit 1) when a count passes its ceiling
//   node tools/answercost.js --write-budget FILE [--margin 1.25] [--also A.json,B.json]   write the measured counts (the
//                                                             largest, with the --out files of other runs), times the
//                                                             margin, as the ceilings of FILE (the states measured replace theirs)
//   [--n 8] [--warm 2] [--seed 1|off] [--clock 30|SECONDS|off] [--out counts.json] [--cache DIR] [--regen]
//
// A state is made once by tools/learnsim.js (profile lectureRA, seed 1, the fish or coral subject, the page's own
// answers) and kept in the cache (REEFID_ANSWERCOST_CACHE, else reefid-answercost in the temporary directory, shared by
// every worktree); a state of 3,000 fish answers takes 5 to 14 minutes to make (by the machine's load), 3,000 corals about 1 minute 20. The
// page plays --warm answers it does not count, then --n it does (three right, one wrong, in the page's own mix of
// formats), each through the tap, the feedback, the deferred planning, Next and its top-up. V8's precise coverage counts
// the invocations of every named function of the app's files (anonymous callbacks are left out, so the true totals are
// higher), divided by the answers counted; localStorage getItem and setItem are wrapped to count calls and characters (the text read or written, however the app parses it). The page's
// Math.random is seeded (--seed off: not) and the seed changes the questions drawn, so the counts of a state move with the
// seed (fish 3,000 answers: 1.8 to 2.6 M calls over seeds 1 to 3); with the seed fixed the same state still differs by up
// to 15% from run to run (what the page schedules for idle time), so a ceiling carries a margin. The page's clock starts --clock seconds (30) after the state's last answer, so the
// player is in the middle of a session whenever the file is played: a gap of several hours since the last answer starts
// a comeback (model.js rustNow), which draws from fewer units and costs less (fish 50 answers: 0.36 M calls an answer after
// a gap of hours, 0.51 M inside a session). --clock off: the machine's clock, so the file's age decides.
//
// Heavy (rule W24): it takes the machine slot before it starts Chromium. A state of 3,000 fish answers is not part of
// any routine check (REE-265 question c is open); tests/answercost.test.js runs the small states only.
//   SMOKE_SLOTS=1 node tests/slot.js --name answercost -- node tools/answercost.js --budget tools/answercost-budget.json
'use strict';
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  http = require('http'),
  {spawnSync} = require('child_process');

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
// The study's states (section 1.2), and what a budget holds by default (--write-budget): the total, the storage and the
// functions whose count grew with the state in the study.
const STUDY = 'fish:50,fish:3000,coral:3000';
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
      const m = /^(fish|coral):(\d+)$/.exec(s.trim());
      if (!m || Number(m[2]) < 1) throw new Error(`bad state ${s} (fish:50, coral:3000: subject fish or coral, then the answers)`);
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

const fmt = x => (x === undefined || x === null ? '-' : Math.round(x).toLocaleString('en-US'));
const mil = x => (x >= 1e5 ? (x / 1e6).toFixed(2) + ' M' : fmt(x));

// The study's table (section 1.2), one line a state, from the rows.
function table(rows) {
  const head = ['State', 'U', 'V', 'T', 'R', 'Calls per answer', '`introduced`', '`scoreOf`', 'Storage reads: calls (chars)', 'Chars written'],
    line = r => {
      const m = metrics(r),
        s = r.size;
      return [
        r.state,
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

// The cache holds one folder per way the states are made (GEN), so a change of the way never reuses an older state.
const GEN = 'beyond';
const cacheDir = o => path.join(o || process.env.REEFID_ANSWERCOST_CACHE || path.join(os.tmpdir(), 'reefid-answercost'), GEN);
const stateFile = (dir, st) => path.join(dir, `${st.subject}-${PLAYER.profile}-${PLAYER.seed}-${st.answers}.json`);

// The file of a state, made when the cache has none (or --regen).
function ensureState(st, dir, regen) {
  const f = stateFile(dir, st);
  if (!regen && fs.existsSync(f)) return f;
  fs.mkdirSync(dir, {recursive: true});
  const tmp = fs.mkdtempSync(path.join(dir, '.new-'));
  const t0 = Date.now();
  console.error(`answercost: making ${st.name} with tools/learnsim.js (${PLAYER.profile}, seed ${PLAYER.seed})…`);
  const r = spawnSync(
    process.execPath,
    [
      path.join(__dirname, 'learnsim.js'),
      // --seeds 1 plays seed 1 (learnsim: seeds 1 to N); the fish player says yes to the card that offers a part of the slate by
      // choice, as the study's did (the coral player meets no such card).
      ...['--subject', st.subject, '--profiles', PLAYER.profile, '--seeds', String(PLAYER.seed), '--questions', String(st.answers)],
      ...['--choice', 'auto', ...(st.subject === 'fish' ? ['--beyond', 'yes'] : []), '--workers', '1', '--dump', tmp, '--dump-at', String(st.answers)]
    ],
    {encoding: 'utf8', maxBuffer: 1 << 26}
  );
  const made = path.join(tmp, path.basename(f));
  if (r.status !== 0 || !fs.existsSync(made)) {
    fs.rmSync(tmp, {recursive: true, force: true});
    throw new Error(`learnsim did not make ${st.name} (exit ${r.status}): ${(r.stderr || r.stdout || '').slice(-600)}`);
  }
  fs.renameSync(made, f);
  fs.rmSync(tmp, {recursive: true, force: true});
  console.error(`answercost: ${st.name} made in ${Math.round((Date.now() - t0) / 1000)} s.`);
  return f;
}

// ---------------------------------------------------------------------------------------------------------------
// The count, in Chromium.

const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
const serve = (req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname),
    f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT)) return res.writeHead(403), res.end();
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
async function oneAnswer(p, i) {
  if (!(await prep(p))) return null;
  await settle(p);
  let fmt;
  try {
    fmt = (await p.evaluate(pick => smokeAnswer(pick), i % 4 !== 3)).fmt; // three right, one wrong
  } catch (e) {
    return null;
  }
  await settle(p);
  await p.evaluate(() => document.getElementById('next') && document.getElementById('next').click());
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
async function count(browser, base, file, name, o) {
  const PAGE = require(path.join(ROOT, 'tests', 'answer.js')).PAGE,
    ls = JSON.parse(fs.readFileSync(file, 'utf8')),
    ctx = await browser.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
  // Nothing outside the repository, no photo: the page asks nothing of the network and the count does not depend on what
  // the checkout holds.
  await ctx.route(
    u => !u.href.startsWith(base) || /\.(webp|jpe?g|png|gif)(\?|$)/.test(new URL(u.href).pathname),
    r => r.abort()
  );
  await ctx.addInitScript(
    ({ls, seed, ref}) => {
      if (ref !== null) {
        // The page's clock runs from the state's own time: the rust since the last answer, the comeback, the time since the
        // first launch read the same whenever the state is played.
        const D = Date,
          off = ref - D.now();
        window.Date = class extends D {
          constructor(...a) {
            super(...(a.length ? a : [D.now() + off]));
          }
          static now() {
            return D.now() + off;
          }
        };
      }
      if (seed !== null) {
        let a = seed >>> 0; // mulberry32
        Math.random = () => {
          a = (a + 0x6d2b79f5) >>> 0;
          let t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      if (sessionStorage.getItem('answercost')) return;
      sessionStorage.setItem('answercost', '1');
      localStorage.clear();
      for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v);
    },
    {ls, seed: o.seed, ref: o.clock === null ? null : lastAnswerMs(ls, file) + o.clock * 1000}
  );
  await ctx.addInitScript(PAGE);
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(base + '#quiz');
  await p.waitForFunction(() => window.APP_READY, null, {timeout: 120000});
  await p.evaluate(() => window.loadTier && window.loadTier(5)); // every script tier in, as a player who has opened My progress
  await p.waitForLoadState('networkidle');
  if (!/quiz/.test(await p.evaluate(() => location.hash))) await p.evaluate(() => (typeof go === 'function' ? go('quiz') : (location.hash = '#quiz')));
  await p.waitForTimeout(800);
  for (let i = 0; i < o.warm; i++) await oneAnswer(p, i);
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
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.startPreciseCoverage', {callCount: true, detailed: false});
  const fmts = [];
  for (let i = o.warm; i < o.warm + o.n; i++) fmts.push(await oneAnswer(p, i));
  const {result} = await cdp.send('Profiler.takePreciseCoverage');
  await cdp.send('Profiler.stopPreciseCoverage');
  const n = fmts.filter(Boolean).length;
  if (!n) throw new Error(`${name}: no answer was played (${errs.join('; ') || 'no page error'})`);
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
  const st = await p.evaluate(() => window.__st);
  await ctx.close();
  return {
    state: name,
    size,
    answers: n,
    fmts: fmts.join(','),
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
  'usage: node tools/answercost.js [--states fish:50,fish:3000,coral:3000 | --dump A.json,B.json] [--n 8] [--warm 2] [--seed 1|off] [--clock 30|SECONDS|off]\n' +
  '                                [--budget FILE | --write-budget FILE [--margin 1.25]] [--out counts.json] [--cache DIR] [--regen]';

async function main() {
  const argv = process.argv.slice(2),
    arg = (k, d) => {
      const i = argv.indexOf('--' + k);
      return i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
    };
  if (argv.includes('--help') || argv.includes('-h')) return console.log(USAGE);
  const known = new Set(['states', 'dump', 'n', 'warm', 'seed', 'clock', 'budget', 'write-budget', 'also', 'margin', 'out', 'cache', 'regen']);
  for (const a of argv.filter(a => a.startsWith('--')))
    if (!known.has(a.slice(2))) return (console.error(`unknown option ${a}\n${USAGE}`), process.exit(2));
  let states;
  try {
    const dumps = arg('dump', '').split(',').filter(Boolean);
    if (dumps.length && arg('states', '')) throw new Error('--states or --dump, not both');
    states = dumps.length ? dumps.map(f => ({name: path.basename(f, '.json'), file: path.resolve(f)})) : parseStates(arg('states', STUDY));
  } catch (e) {
    return (console.error(`${e.message}\n${USAGE}`), process.exit(2));
  }
  const o = {
      n: Number(arg('n', 8)),
      warm: Number(arg('warm', 2)),
      seed: arg('seed', '1') === 'off' ? null : Number(arg('seed', 1)),
      clock: arg('clock', '30') === 'off' ? null : Number(arg('clock', 30))
    },
    margin = Number(arg('margin', 1.25)),
    budgetFile = arg('budget', null),
    budget = budgetFile ? JSON.parse(fs.readFileSync(path.resolve(budgetFile), 'utf8')) : null;
  if (!(o.n >= 1 && o.warm >= 0 && margin >= 1)) return (console.error(USAGE), process.exit(2));

  // From here on the run is heavy: the machine slot first (rule W24), for the states to make and the count.
  await require('../tests/slot.js')('tools/answercost.js');
  const dir = cacheDir(arg('cache', null)),
    files = states.map(s => s.file || ensureState(s, dir, argv.includes('--regen')));
  const {chromium} = require('playwright');
  const server = http.createServer(serve);
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`,
    browser = await chromium.launch(),
    rows = [];
  try {
    for (let i = 0; i < states.length; i++) {
      const t0 = Date.now();
      rows.push(await count(browser, base, files[i], states[i].name, o));
      console.error(`answercost: ${states[i].name} counted in ${Math.round((Date.now() - t0) / 1000)} s.`);
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(table(rows));
  if (arg('out', null)) fs.writeFileSync(path.resolve(arg('out', null)), JSON.stringify(rows, null, 1));
  if (arg('write-budget', null)) {
    // --also A.json,B.json: rows of earlier runs (--out), their largest counts counting with this run's.
    const also = arg('also', '')
      .split(',')
      .filter(Boolean)
      .flatMap(f => JSON.parse(fs.readFileSync(path.resolve(f), 'utf8')));
    writeBudget(path.resolve(arg('write-budget', null)), [...rows, ...also], margin);
    console.log(`\nCeilings written to ${arg('write-budget', null)} (margin x${margin}, two significant digits up, at least ${FLOOR} calls).`);
  }
  if (budget) {
    const bad = rows.flatMap(r => over(r, budget)),
      none = rows.filter(r => !(budget.states || {})[r.state]).map(r => r.state);
    if (none.length) console.log(`\nNo ceiling for ${none.join(', ')} in ${budgetFile}: not checked.`);
    for (const b of bad) console.log(`OVER BUDGET ${b.state}: ${b.metric} ${fmt(b.value)} per answer, ceiling ${fmt(b.ceiling)}`);
    if (bad.length) {
      console.log(`\n${bad.length} count${bad.length > 1 ? 's' : ''} over the budget of ${budgetFile}: an answer now does more work than it did.`);
      process.exitCode = 1;
    } else console.log(`\nWithin budget (${budgetFile}): ${rows.filter(r => (budget.states || {})[r.state]).map(r => r.state).join(', ') || 'no state'}.`);
  }
}

module.exports = {parseStates, metrics, roundUp, ceilings, over, table, writeBudget, stateFile, STUDY, BUDGETED, BUDGETED_FN, FLOOR};
if (require.main === module)
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
