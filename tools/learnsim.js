// Learning-outcome simulation (independent review of 2026-11-02, item 1: "make the simulation measure learning and
// noise"). tests/profiles.smoke.js checks the pacing of the path (genera met, traps, genera ready for their exam) on one
// seed; this tool measures what simulated players really learn, and how far the app's own estimates are from that
// truth, over many seeds, so a change to the algorithm can be judged on outcomes with a spread. Not run by CI (minutes,
// numbers for reading). docs/LEARNING.md, "Learning-outcome simulation".
//
//   node tools/learnsim.js [--seeds 30] [--questions 300] [--profiles beginner,lectureRA,strongRA,expert]
//                          [--workers 4] [--out results.json] [--stats stats.json]
//
// Each run (profile x seed) opens a fresh browser context (empty storage), seeds the app's Math.random and a separate
// learner random generator from the seed (runs are reproducible, and the same seeds before and after a change give
// paired comparisons), then drives the real photo quiz as profiles.smoke.js does: quizPhoto(), the first-meeting cards
// read through, a click on one of the [data-c] choices. The app's own algorithm (draw, photos, traps, duels, Again, exam,
// Elo, knowledge model, progress) runs untouched; only the player is simulated.
//
// The learner (kept simple on purpose; every constant is in LEARNER below):
// - know[g]: the chance to recognise genus g on a photo of average difficulty with all its views. On a question it
//   recognises the genus shown t with p = sigmoid(logit(know[t]) - d - 0.5 x single view), d the mean photoDiff of the
//   photos shown (the app's own photo difficulty: its sets, or --stats), as in profiles.smoke.js. Recognised = right.
// - Otherwise it picks among the choices by how much each looks like the photo: weight 1 + LOOK x s(t, c), with
//   s(t, t) = 1 and s(t, c) = min(1, pooledConf(t, c) / CONF.LOOK) for another genus (the app's own confusion prior and
//   pooled mix-ups: about 1 for a declared look-alike, 0.4 same family, 0.27 shared growth form, 0.1 otherwise), times
//   (1 - ELIM x know[c]) for a wrong choice c (a genus it knows well is ruled out). So an unrecognised photo goes to the
//   target about half the time among easy choices, a quarter among 3 look-alikes, and a wrong answer falls on the
//   look-alikes.
// - After each answer, feedback teaches: know[t] += RATE x (1 - know[t]) after a right answer, x MISS after a miss
//   (the side-by-side montage shows the difference); the genus wrongly picked gains RATE x PICKED (its photo is in the
//   montage). A first-meeting card teaches like one right answer. No forgetting (no time in the app either).
//
// Measures, at each checkpoint (50, 100, 200, 300 questions, then every 300), mean +- sd over the seeds:
// - know39: true mean know over the 39 slate genera; knowMet: over the genera met (cards or asked).
// - thErr / thBias: mean |theta - logit(know)| and mean (theta - logit(know)) over the genera met, theta = ability(g),
//   the app's Elo estimate (the learner's own model has the same scale: theta = logit(know) means a perfect estimate;
//   theta is clamped to ELO.lo..hi, so a genus known at 2% cannot be estimated below -1.5).
// - progGap: mean (genScore(g) - know[g]) over the genera met: > 0 the progress bar over-claims, < 0 it under-claims;
//   prog / know%: the app's progress over the 39 (progPct) next to 100 x know39.
// - met, learned (s.mx), right % over the questions since the previous checkpoint.
// - look: true chance to tell a declared look-alike pair apart (IMR lecture / Coral Finder, `look`, both genera on the
//   slate), in a 2-choice question on an average photo, both directions averaged, over every declared pair.
// - refTrue: genera whose true success on the hard reference question is 0.9 or more (one photo alone, photo
//   difficulty +1 and the single-view 0.5, 4 choices: the genus and its 3 most confusable slate genera by pooledConf).
// - exam: genera that entered the mastery exam so far (examOn true, or an exam question shown), and refEntry, their
//   mean true success on the hard reference question at the moment they entered; refLearned, the same when learned.
const http = require('http'),
  fs = require('fs'),
  os = require('os'),
  path = require('path');
const {chromium} = require('playwright');
const ROOT = path.join(__dirname, '..');

// Profiles: the three players of profiles.smoke.js (same definitions: beginner, RA = "lectureRA", expert) and a strong
// RA who knows 60% of the genera well (docs/LEARNING.md, the open-all offer and the opening hold). know of slate genus i
// (data.json order) = hi when i % 5 < m, else lo; bonus genera = lo. rate: RATE of the learner below.
const PROFILES = {
  beginner: {m: 0, hi: 0.02, lo: 0.02, rate: 0.12},
  lectureRA: {m: 2, hi: 0.55, lo: 0.1, rate: 0.12},
  strongRA: {m: 3, hi: 0.85, lo: 0.1, rate: 0.12},
  expert: {m: 5, hi: 0.93, lo: 0.93, rate: 0.05}
};
// The learner's constants (above). LOOK 3: a declared look-alike draws an unrecognised photo as much as the genus
// itself (a coin toss in a look-alike duel), an unrelated genus 1.3 against 4. ELIM 0.5: a genus known for sure is
// half as tempting. MISS 1.5, PICKED 0.5: feedback after a miss teaches more, and a little about the genus picked.
const LEARNER = {LOOK: 3, ELIM: 0.5, MISS: 1.5, PICKED: 0.5, SINGLE: 0.5, REF_D: 1, REF_OK: 0.9};

const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : d;
};
const SEEDS = Number(arg('seeds', 30)),
  QN = Number(arg('questions', 300)),
  NAMES = arg('profiles', Object.keys(PROFILES).join(',')).split(','),
  WORKERS = Number(arg('workers', Math.max(1, Math.min(4, os.cpus().length)))),
  OUT = arg('out', null),
  STATS = arg('stats', null);
for (const n of NAMES) if (!PROFILES[n]) throw new Error(`unknown profile ${n} (${Object.keys(PROFILES).join(', ')})`);
const CPS = [
  ...new Set(
    [50, 100, 200, 300]
      .filter(q => q <= QN)
      .concat(
        Array.from({length: Math.floor(QN / 300)}, (_, i) => 300 * (i + 1)),
        [QN]
      )
  )
].sort((a, b) => a - b);
// Photo statistics of the sync sheet (?stats=1 answer, or {photos, conf}), to rate the photos as live players do;
// without it the photo difficulty is Pierre's Easy/Medium/Hard sets, as in CI.
const STATS_JSON = STATS ? JSON.parse(fs.readFileSync(STATS, 'utf8')) : null;

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json'
};
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname),
    f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(f, (e, b) => {
    if (e) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'});
    res.end(b);
  });
});

// One player, inside the page: the app's globals (P, quizPhoto, photoDiff, pooledConf, ...) are in scope.
function play(cfg) {
  const {prof, seed, N, cps, L} = cfg;
  const sig = x => 1 / (1 + Math.exp(-x)),
    cl = q => Math.min(0.995, Math.max(0.005, q)),
    logit = q => Math.log(cl(q) / (1 - cl(q))),
    mean = A => (A.length ? A.reduce((a, x) => a + x, 0) / A.length : null);
  // Two generators (mulberry32) seeded from the run's seed: the app's Math.random, seeded again here because the page
  // load draws a varying number of times (photos and timers come in their own order), and the learner's own.
  const gen = a => () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Math.random = gen((seed * 2246822519) ^ 0x85ebca6b);
  const rnd = gen((seed * 2654435761) ^ 0x9e3779b9);
  const SL = Object.keys(DATA.gen),
    know = {};
  SL.forEach((g, i) => (know[g] = i % 5 < prof.m ? prof.hi : prof.lo));
  BONUS.forEach(g => (know[g] = prof.lo));
  const kn = g => know[g] ?? prof.lo;
  const teach = (g, x) => {
    if (g in know) know[g] += x * (1 - know[g]);
  };
  // How much choice c looks like a photo of t (1 for t itself), and the chance to pick each choice when t is not
  // recognised.
  const sim = (t, c) => (c === t ? 1 : Math.min(1, pooledConf(t, c) / CONF.LOOK));
  const wOf = (t, c) => (1 + L.LOOK * sim(t, c)) * (c === t ? 1 : 1 - L.ELIM * kn(c));
  const pRight = (t, ch, d, single) => {
    const p = sig(logit(kn(t)) - d - (single ? L.SINGLE : 0)),
      ws = ch.map(c => wOf(t, c)),
      tot = ws.reduce((a, x) => a + x, 0);
    return p + (1 - p) * (ws[ch.indexOf(t)] / tot);
  };
  // The hard reference question of a genus: its 3 most confusable slate genera, fixed for the run.
  const REF = Object.fromEntries(
    SL.map(g => [
      g,
      SL.filter(x => x !== g)
        .sort((a, b) => pooledConf(g, b) - pooledConf(g, a))
        .slice(0, 3)
    ])
  );
  const ref = g => pRight(g, [g, ...REF[g]], L.REF_D, true);
  const PAIRS = [];
  SL.forEach(a => SL.forEach(b => a < b && isLook(a, b) && PAIRS.push([a, b])));
  const lookAcc = () => mean(PAIRS.map(([a, b]) => (pRight(a, [a, b], 0, false) + pRight(b, [a, b], 0, false)) / 2));
  const inExam = g => (typeof examOn === 'function' && examOn(g)) || !!(P[g] || {}).ex;

  // A fresh player (the context's storage is empty): no hold, no gentle restart, the open-all offer declined (the path
  // is what is measured, as in profiles.smoke.js).
  P = {};
  INTROS = {};
  HOLDS = 0;
  warmLeft = 0;
  // The planner's history too: start-up's own planNext drew with unseeded randomness and left recent genera damped
  // (weight x 0.1), so the same seed gave different runs (Codex review #365).
  dropPlans();
  NEXTQ = null;
  SHOWNQ = null;
  last = null;
  lastQs = [];
  rematch = null;
  twoAt = againAt = -Infinity;
  duelLog = [];
  store.set(INTRO.OFFER.KEY, {open: 0});
  const q0 = question;
  question = (...a) => ((window.__q = a), q0(...a));

  const rows = [],
    entry = {},
    learnedAt = {};
  let blk = {n: 0, ok: 0},
    nEx = 0,
    nDuel = 0,
    nAgain = 0,
    nCards = 0;
  for (let i = 0; i < N; i++) {
    // Through the real planner (Codex review #365): the questions planned ahead stay after a right answer, as in the app.
    // Its own top-ups are timers, which never fire inside this synchronous loop, so they are called here instead.
    quizPhoto();
    planNext('quiz');
    const q = SHOWNQ;
    // The first-meeting cards, read through: each teaches like one right answer.
    (q.intro || []).forEach(g => (teach(g, prof.rate), nCards++));
    for (let b; (b = document.querySelector('.unlock.intro .ulbtns .next:not([data-open]):not(.sec)'));) b.click();
    const [, t, , , set] = window.__q,
      ch = [...document.querySelectorAll('#view [data-c]')].map(x => x.dataset.c),
      shown = set.shown || [],
      d = mean(shown.map(p => photoDiff(t, p))) || 0,
      single = shown.length === 1;
    if (set.exam) nEx++;
    if (q.auto) nDuel++;
    if (q.again) nAgain++;
    let pick = t;
    if (!(rnd() < sig(logit(kn(t)) - d - (single ? L.SINGLE : 0)))) {
      const ws = ch.map(c => wOf(t, c));
      let r = rnd() * ws.reduce((a, x) => a + x, 0);
      pick = ch[ch.length - 1];
      for (let k = 0; k < ch.length; k++)
        if ((r -= ws[k]) <= 0) {
          pick = ch[k];
          break;
        }
    }
    const good = pick === t;
    document.querySelector(`#view [data-c="${CSS.escape(pick)}"]`).click();
    planNext('quiz'); // answer()'s top-up after the feedback
    teach(t, prof.rate * (good ? 1 : L.MISS));
    if (!good) teach(pick, prof.rate * L.PICKED);
    blk.n++;
    blk.ok += good;
    SL.forEach(g => {
      if (!(g in entry) && inExam(g)) entry[g] = {q: i + 1, ref: ref(g), know: know[g]};
      if (!(g in learnedAt) && (P[g] || {}).mx) learnedAt[g] = {q: i + 1, ref: ref(g), know: know[g]};
    });
    if (cps.includes(i + 1)) {
      const met = SL.filter(introduced),
        th = met.map(g => ability(g) - logit(know[g])),
        en = Object.values(entry),
        le = Object.values(learnedAt);
      rows.push({
        q: i + 1,
        know39: mean(SL.map(g => know[g])),
        knowMet: mean(met.map(g => know[g])),
        thErr: mean(th.map(Math.abs)),
        thBias: mean(th),
        progGap: mean(met.map(g => genScore(g) - know[g])),
        prog: progPct(SL),
        met: met.length,
        learned: SL.filter(g => (P[g] || {}).mx).length,
        right: (100 * blk.ok) / blk.n,
        look: lookAcc(),
        refTrue: SL.filter(g => ref(g) >= L.REF_OK).length,
        exam: en.length,
        refEntry: mean(en.map(e => e.ref)),
        refLearned: mean(le.map(e => e.ref)),
        examQs: nEx,
        duels: nDuel,
        agains: nAgain,
        cards: nCards
      });
      blk = {n: 0, ok: 0};
    }
  }
  return {rows, entry, learnedAt, pairs: PAIRS.length};
}

async function run(browser, base, name, seed) {
  const ctx = await browser.newContext({viewport: {width: 1280, height: 800}, serviceWorkers: 'block'});
  await ctx.route(
    u => !u.href.startsWith(base),
    r => r.abort()
  );
  await ctx.addInitScript(st => {
    localStorage.setItem('imr-tour', '"done"');
    if (st) localStorage.setItem('imr-photo-stats', JSON.stringify({t: Date.now(), photos: st.photos || {}, conf: st.conf || {}}));
  }, STATS_JSON);
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(base);
  await p.waitForFunction(() => window.APP_READY, null, {timeout: 60000});
  // Every script tier in (My progress, the Tools) and the network quiet, so each run starts from the same state.
  await p.evaluate(() => window.loadTier && window.loadTier(5));
  await p.waitForLoadState('networkidle');
  const r = await p.evaluate(play, {prof: PROFILES[name], seed, N: QN, cps: CPS, L: LEARNER});
  await ctx.close();
  return {profile: name, seed, errs, ...r};
}

const KEYS = [
  ['know39', 'know39', 2, 1],
  ['knowMet', 'knowMet', 2, 1],
  ['thErr', '|th-lk|', 2, 1],
  ['thBias', 'th-lk', 2, 1],
  ['progGap', 'prog-know', 2, 1],
  ['prog', 'prog%', 0, 1],
  ['met', 'met', 1, 1],
  ['learned', 'learned', 1, 1],
  ['right', 'right%', 0, 1],
  ['look', 'look', 2, 1],
  ['refTrue', 'ref>=.9', 1, 1],
  ['exam', 'exam', 1, 1],
  ['refEntry', 'ref@exam', 2, 1],
  ['refLearned', 'ref@learn', 2, 1]
];
function summary(runs) {
  const out = {};
  for (const name of NAMES) {
    const R = runs.filter(r => r.profile === name);
    out[name] = CPS.map((q, i) => {
      const row = {q};
      for (const [k] of KEYS.concat([['examQs'], ['duels'], ['agains'], ['cards']])) {
        const v = R.map(r => r.rows[i] && r.rows[i][k]).filter(x => typeof x === 'number' && !isNaN(x)),
          m = v.length ? v.reduce((a, x) => a + x, 0) / v.length : null,
          sd = v.length > 1 ? Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1)) : 0;
        row[k] = {mean: m, sd, n: v.length};
      }
      return row;
    });
  }
  return out;
}
function table(S) {
  const f = (o, dg) => (o.mean === null ? '-' : `${o.mean.toFixed(dg)}±${o.sd.toFixed(dg)}`);
  const lines = [];
  for (const name of NAMES) {
    lines.push(`\n${name} (${SEEDS} seeds)`);
    const head = ['q', ...KEYS.map(k => k[1])],
      body = S[name].map(r => [
        String(r.q),
        ...KEYS.map(([k, , dg]) => f(r[k], dg) + (k === 'refEntry' || k === 'refLearned' ? ` (${r[k].n})` : ''))
      ]),
      w = head.map((h, j) => Math.max(h.length, ...body.map(b => b[j].length)));
    lines.push(head.map((h, j) => h.padStart(w[j])).join(' '));
    body.forEach(b => lines.push(b.map((x, j) => x.padStart(w[j])).join(' ')));
  }
  return lines.join('\n');
}

(async () => {
  const t0 = Date.now();
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const jobs = [];
  for (let s = 1; s <= SEEDS; s++) for (const name of NAMES) jobs.push([name, s]);
  const runs = [];
  let done = 0;
  await Promise.all(
    Array.from({length: WORKERS}, async () => {
      for (let j; (j = jobs.shift());) {
        runs.push(await run(browser, base, ...j));
        if (++done % 10 === 0 || !jobs.length) process.stderr.write(`\r${done} runs, ${Math.round((Date.now() - t0) / 1000)} s`);
      }
    })
  );
  await browser.close();
  server.close();
  const secs = (Date.now() - t0) / 1000,
    S = summary(runs),
    errs = [...new Set(runs.flatMap(r => r.errs))];
  console.log(
    `\nLearning-outcome simulation: ${NAMES.join(', ')}; ${SEEDS} seeds x ${QN} questions; ${runs.length} runs in ${secs.toFixed(0)} s (${WORKERS} workers)`
  );
  console.log(
    'know39/knowMet: true knowledge (39 slate / met); |th-lk|, th-lk: Elo ability vs logit(know), genera met; prog-know: genScore - know, genera met;\n' +
      "prog%: the app's progress over the 39; right%: since the previous row; look: true look-alike pair accuracy; ref>=.9: genera truly passing the\n" +
      'hard reference question 90%; exam: genera entered in the mastery exam; ref@exam / ref@learn: their true reference success then (genera counted).'
  );
  console.log(table(S));
  if (errs.length) console.log('\nPage errors: ' + errs.slice(0, 5).join(' | '));
  if (OUT) {
    fs.writeFileSync(
      OUT,
      JSON.stringify(
        {
          date: new Date().toISOString(),
          commit: (() => {
            try {
              return require('child_process').execFileSync('git', ['rev-parse', '--short', 'HEAD'], {cwd: ROOT}).toString().trim();
            } catch (e) {
              return null;
            }
          })(),
          seeds: SEEDS,
          questions: QN,
          checkpoints: CPS,
          profiles: Object.fromEntries(NAMES.map(n => [n, PROFILES[n]])),
          learner: LEARNER,
          stats: STATS || null,
          seconds: secs,
          summary: S,
          runs
        },
        null,
        1
      )
    );
    console.log(`\nWritten: ${OUT}`);
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
