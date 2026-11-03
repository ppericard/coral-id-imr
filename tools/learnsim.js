// Learning-outcome simulation (independent review of 2026-11-02, item 1: "make the simulation measure learning and
// noise"). tests/profiles.smoke.js checks the pacing of the path (genera met, traps, genera ready for their exam) on one
// seed; this tool measures what simulated players really learn, and how far the app's own estimates are from that
// truth, over many seeds, so a change to the algorithm can be judged on outcomes with a spread. Not run by CI (minutes,
// numbers for reading). docs/LEARNING.md, "Learning-outcome simulation".
//
//   node tools/learnsim.js [--seeds 5] [--questions 300] [--profiles beginner,lectureRA,strongRA,expert]
//                          [--workers 4] [--out results.json] [--stats stats.json] [--truth truth.json] [--met Acropora,Porites,...]
//                          [--breaks 10m,30m,1h,3h,8h,3d,1w,1mo] [--after 20] [--openall offer|N] [--back keep|one]
//
// --openall (optional; without it the open-all offer is declined, as before): 'offer' accepts the offer card when it shows
// (model.js introOffer: 50-150 answers, 10 genera met, level 0.5); N opens all at question N if the offer has not come
// by then (introAll, as the offer's button). The back card that may follow (model.js backDue) is answered --back: 'keep'
// (default: Keep them all, so its timing is measured and nothing changes) or 'one' (One at a time). Per run: the answer
// at which all were opened, the answer since then at which the back card showed, and after Open all the app's expected
// success (each answer's e) against the learner's true chance and its answers: on the genera opened at once, at their
// first question and over the first 30 answers after Open all, and on the genera met before (the starting ability of a
// genus never answered, core.js playerStart, against what the learner really knows).
//
// --breaks (optional; without it nothing changes): the app runs on a virtual clock (10 s an answer), and after the
// --questions of the first session the player leaves for each break in turn (each from the same state, the generators
// seeded again per break, so the breaks and two versions of the app compare on the same seeds), forgets (below) and
// comes back: the second session runs until the comeback is over (questions flagged warm: the comeback after a break,
// or before it the fixed 10-question gentle restart, which the tool starts at every second session), then --after
// questions more. Per break: the comeback's length, the answers during which no genus could open (the floor), the
// success during the comeback and in the --after questions after it, how often the opening hold was on during them,
// the app's rust at the start and the learner's true loss.
// Forgetting learner (with --breaks): know[g] falls back towards the profile's starting know (prior knowledge, stable)
// over the break on the FSRS curve, know' = k0 + (know - k0) (1 + 19/81 t / S)^-0.5, S = LEARNER.S0 days x LEARNER.G for
// each further day the genus was answered right (spaced successes); our learner, not the app's model (the app reads S
// from the Elo ability and the days answered right).
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
//   photos shown (the app's own photo difficulty, photoDiff: --stats, or 0 for every photo without it), as in
//   profiles.smoke.js; or, with --truth, each photo's true difficulty from that file, independent of the app's estimate
//   (2026-11-03, the hierarchical photo Elo: a change to the app's photo difficulty must not change the learner's world
//   too). truth.json: {photos: {file: difficulty}, gd: {genus: difficulty of a photo not listed}}. Recognised = right.
// - Otherwise it picks among the choices by how much each looks like the photo: weight 1 + LOOK x s(t, c), with
//   s(t, t) = 1 and s(t, c) = min(1, pooledConf(t, c) / CONF.LOOK) for another genus (the app's own confusion prior and
//   pooled mix-ups: about 1 for a declared look-alike, 0.4 same family, 0.27 shared growth form, 0.1 otherwise), times
//   (1 - ELIM x know[c]) for a wrong choice c (a genus it knows well is ruled out). So an unrecognised photo goes to the
//   target about half the time among easy choices, a quarter among 3 look-alikes, and a wrong answer falls on the
//   look-alikes.
// - After each answer, feedback teaches: know[t] += RATE x (1 - know[t]) after a right answer, x MISS after a miss
//   (the side-by-side montage shows the difference); the genus wrongly picked gains RATE x PICKED (its photo is in the
//   montage). A first-meeting card teaches like one right answer. No forgetting, except across --breaks (above).
// - Photo memory (2026-11-03, Pierre: in a genus with few photos the same ones come back, and players learn the photos
//   rather than the genus): the learner remembers each photo it was shown when answering, [seen, right]. Recognising
//   adds LEARNER.MEM[bucket] logits, averaged over the photos shown: new 0, seen but never right 0.4, right once 1.5,
//   right twice or more 2 (our assumption, close to what about 550 real photo-quiz answers showed against the app's
//   logged expectation: 83% right on photos new to the player where 76% was expected, 85% / 72% seen never right, 95% /
//   76% right once, 9 of 9 right twice or more; docs/LEARNING.md "Photo memory"). Memory helps on that photo only: it
//   teaches nothing more about the genus, and the hard reference question below (a photo never seen) ignores it, so
//   what memory adds to the answers is exactly what the app must not count as knowledge. --mem 0 turns it off (the
//   learner before 2026-11-03); --mem 0,0.4,1.5,2 sets the four offsets.
//
// Measures, at each checkpoint (50, 100, 200, 300 questions, then every 300), mean +- sd over the seeds:
// - knowSlate: true mean know over the slate genera (the 39 of the IMR coral slate and Millepora); knowMet: over the
//   genera met (cards or asked).
// - thErr / thBias: mean |theta - logit(know)| and mean (theta - logit(know)) over the genera met, theta = ability(g),
//   the app's Elo estimate (the learner's own model has the same scale: theta = logit(know) means a perfect estimate;
//   theta is clamped to ELO.lo..hi, so a genus known at 2% cannot be estimated below -1.5).
// - progGap: mean (genScore(g) - know[g]) over the genera met: > 0 the progress bar over-claims, < 0 it under-claims;
//   prog / know%: the app's progress over the slate (progPct) next to 100 x knowSlate.
// - met, learned (s.mx), right % over the questions since the previous checkpoint.
// - look: true chance to tell a declared look-alike pair apart (IMR lecture / Coral Finder, `look`, both genera on the
//   slate), in a 2-choice question on an average photo, both directions averaged, over every declared pair.
// - refTrue: genera whose true success on the hard reference question is 0.9 or more (one photo alone, photo
//   difficulty +1 and the single-view 0.5, 4 choices: the genus and its 3 most confusable slate genera by pooledConf).
// - exam: genera that entered the mastery exam so far (examOn true, or an exam question shown), and refEntry, their
//   mean true success on the hard reference question at the moment they entered; refLearned, the same when learned.
// - Per run: when Millepora was met and first asked, when the bonus genera were offered (every slate genus met; the
//   simulated player accepts, "Add them"), and the share of the questions on bonus genera after that.
// - Per run, metAt: the question at which each genus was first met (card or asked); printed as the median question per
//   profile for the genera of --met (a genus not met counts as later than the last question, shown ">N").
// - By photo count (photo memory): the slate genera with few game photos (FEW, 14 or fewer) against those with many
//   (MANY, 20 or more), at each checkpoint: questions so far showing a photo the learner had already been shown (rep%),
//   right % on all of them and on those repeats, mean progress bar against true know (prog-know) and Elo against
//   logit(know) (th-lk) over the genera met, genera learned; and, per genus that entered the exam or was learned, the
//   true reference success then (ref@exam, ref@learn) and the question it happened.
const http = require('http'),
  fs = require('fs'),
  os = require('os'),
  path = require('path');
const {chromium} = require('playwright');
const ROOT = path.join(__dirname, '..');

// Profiles: the three players of profiles.smoke.js (same definitions: beginner, RA = "lectureRA", expert) and a strong
// RA who knows 60% of the genera well (docs/LEARNING.md, the open-all offer and the opening hold). know of slate genus i
// (slateGenera() order: data.json, then Millepora) = hi when i % 5 < m, else lo; bonus genera = lo. rate: RATE of the learner below.
const PROFILES = {
  beginner: {m: 0, hi: 0.02, lo: 0.02, rate: 0.12},
  lectureRA: {m: 2, hi: 0.55, lo: 0.1, rate: 0.12},
  strongRA: {m: 3, hi: 0.85, lo: 0.1, rate: 0.12},
  expert: {m: 5, hi: 0.93, lo: 0.93, rate: 0.05}
};
// The learner's constants (above). LOOK 3: a declared look-alike draws an unrecognised photo as much as the genus
// itself (a coin toss in a look-alike duel), an unrelated genus 1.3 against 4. ELIM 0.5: a genus known for sure is
// half as tempting. MISS 1.5, PICKED 0.5: feedback after a miss teaches more, and a little about the genus picked.
// MEM: the photo memory above (logits added to recognising, by bucket: new, seen never right, right once, right 2+).
// FEW / MANY: the photo-count groups of the measures by photo count (game photos of the genus).
const LEARNER = {
  LOOK: 3,
  ELIM: 0.5,
  MISS: 1.5,
  PICKED: 0.5,
  SINGLE: 0.5,
  REF_D: 1,
  REF_OK: 0.9,
  S0: 2,
  G: 2.5,
  STEP: 10000,
  MEM: [0, 0.4, 1.5, 2],
  FEW: 14,
  MANY: 20
};

const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : d;
};
const SEEDS = Number(arg('seeds', 5)),
  QN = Number(arg('questions', 300)),
  NAMES = arg('profiles', Object.keys(PROFILES).join(',')).split(','),
  WORKERS = Number(arg('workers', Math.max(1, Math.min(4, os.cpus().length)))),
  OUT = arg('out', null),
  STATS = arg('stats', null),
  TRUTH = arg('truth', null),
  AFTER = Number(arg('after', 20)),
  UNIT = {m: 60000, h: 3600000, d: 864e5, w: 7 * 864e5, mo: 30 * 864e5},
  BREAKS = (arg('breaks', '') || '')
    .split(',')
    .filter(Boolean)
    .map(b => {
      const m = /^(\d+(?:\.\d+)?)(mo|m|h|d|w)$/.exec(b);
      if (!m) throw new Error(`bad break ${b} (10m, 8h, 3d, 1w, 1mo)`);
      return [b, Number(m[1]) * UNIT[m[2]]];
    }),
  OPENALL = arg('openall', ''),
  BACK = arg('back', 'keep'),
  MET = arg('met', 'Acropora,Porites,Pocillopora,Montipora,Millepora').split(',').filter(Boolean);
{
  const m = arg('mem', null);
  if (m !== null) {
    const v = m.split(',').map(Number);
    if (v.some(isNaN) || (v.length !== 1 && v.length !== 4)) throw new Error('--mem 0 (no photo memory) or four offsets, e.g. 0,0.4,1.5,2');
    LEARNER.MEM = v.length === 1 ? [v[0], v[0], v[0], v[0]] : v;
  }
}
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
// Photo statistics of the sync sheet (?stats=1 answer, or {photos, conf, mem, gd, v}), to rate the photos as live
// players do; without it every photo's difficulty is 0 (no sheet), as in CI (the Easy/Medium/Hard sets before 2026-11-03).
const STATS_JSON = STATS ? JSON.parse(fs.readFileSync(STATS, 'utf8')) : null;
const TRUTH_JSON = TRUTH ? JSON.parse(fs.readFileSync(TRUTH, 'utf8')) : null;

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
  const {prof, seed, N, cps, L, breaks, after, openall, back, truth} = cfg;
  // The learner's difficulty of a photo of genus t: --truth when given, else the app's own (photoDiff).
  const trueD = (t, p) => (truth ? (truth.photos || {})[p.f] ?? ((truth.gd || {})[t] || 0) : photoDiff(t, p));
  // With breaks: a virtual clock, STEP an answer (the app reads Date.now for the comeback).
  let T = Date.parse('2026-11-02T08:00:00Z');
  if (breaks.length) Date.now = () => T;

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
  let rnd = gen((seed * 2654435761) ^ 0x9e3779b9);
  const SL = slateGenera(),
    know = {};
  SL.forEach((g, i) => (know[g] = i % 5 < prof.m ? prof.hi : prof.lo));
  BONUS.forEach(g => (know[g] = prof.lo));
  const kn = g => know[g] ?? prof.lo;
  const teach = (g, x) => {
    if (g in know) know[g] += x * (1 - know[g]);
  };
  const k0 = {...know},
    LS = {}; // the learner's own stability per genus (breaks): [days, last day answered right]
  const spaced = g => {
    const d = Math.floor(T / 864e5),
      x = (LS[g] = LS[g] || [L.S0, null]);
    if (x[1] !== null && x[1] !== d) x[0] *= L.G;
    x[1] = d;
  };
  const forget = ms =>
    Object.keys(know).forEach(g => {
      if (know[g] > k0[g]) know[g] = k0[g] + (know[g] - k0[g]) * (1 + ((19 / 81) * ms) / 864e5 / (LS[g] || [L.S0])[0]) ** -0.5;
    });
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
  // Photo memory: [seen, right] per photo file the learner was shown when answering, and the logits it adds.
  const LM = {},
    bucket = h => (!h || !h[0] ? 0 : !h[1] ? 1 : h[1] === 1 ? 2 : 3),
    memOn = fs => mean(fs.map(f => L.MEM[bucket(LM[f])])) || 0;
  // Game photos per slate genus (as My progress counts them, seenOf), and its group: few, many, or neither.
  const NPH = Object.fromEntries(SL.map(g => [g, new Set(VIEWS.flatMap(([v]) => gamePics(g, v).map(p => p.f))).size])),
    grpOf = g => (!(g in NPH) ? null : NPH[g] <= L.FEW ? 'few' : NPH[g] >= L.MANY ? 'many' : null),
    GRP = {few: SL.filter(g => grpOf(g) === 'few'), many: SL.filter(g => grpOf(g) === 'many')},
    gq = {few: {n: 0, ok: 0, rep: 0, repOk: 0}, many: {n: 0, ok: 0, rep: 0, repOk: 0}};
  const PAIRS = [];
  SL.forEach(a => SL.forEach(b => a < b && isLook(a, b) && PAIRS.push([a, b])));
  const lookAcc = () => mean(PAIRS.map(([a, b]) => (pRight(a, [a, b], 0, false) + pRight(b, [a, b], 0, false)) / 2));
  const inExam = g => (typeof examOn === 'function' && examOn(g)) || !!(P[g] || {}).ex;

  // A fresh player (the context's storage is empty): no hold, no gentle restart, the open-all offer declined (the path
  // is what is measured, as in profiles.smoke.js), unless --openall.
  P = {};
  INTROS = {};
  HOLDS = 0;
  const old = typeof CB === 'undefined'; // before the comeback replaced the gentle restart (warmLeft)
  if (old) warmLeft = 0;
  else CB = {r: 0, t: 0, ok: 0, f: 0};
  // The planner's history too: start-up's own planNext drew with unseeded randomness and left recent genera damped
  // (weight x 0.1), so the same seed gave different runs (Codex review #365).
  dropPlans();
  NEXTQ = null;
  SHOWNQ = null;
  last = null;
  lastQs = [];
  rematch = null;
  twoAt = -Infinity;
  twoPair = '';
  store.set(INTRO.OFFER.KEY, openall ? null : {open: 0});
  // --openall: the app's expectation of each answer (the e the opening hold gets).
  let lastE = null;
  const hs0 = holdStep;
  holdStep = (e, good) => ((lastE = e), hs0(e, good));
  const oa = {at: null, set: [], back: null, ans: []};
  const q0 = question;
  question = (...a) => ((window.__q = a), q0(...a));

  const rows = [],
    entry = {},
    learnedAt = {},
    metAt = {};
  let blk = {n: 0, ok: 0},
    nEx = 0,
    nDuel = 0,
    nAgain = 0,
    nCards = 0;
  const mill = {met: null, asked: null},
    bon = {offer: null, n: 0, q: 0};
  // One question, as the player sees it (pre: called once it shows, for the breaks).
  const ask = (pre, i = -1) => {
    // Achievement toasts have gone by the next question (4 s in the app; no time passes in this loop), and the sign-in
    // card is closed: the out-of-game prompts (the bonus genera offer among them) wait for neither (quiz.js promptOk).
    document.querySelectorAll('.achpop').forEach(x => x.remove());
    achQ.length = 0;
    achBusy = false;
    document.querySelectorAll('.unlock:not(.intro)').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
    // Through the real planner (Codex review #365): the questions planned ahead stay after a right answer, as in the app.
    // Its own top-ups are timers, which never fire inside this synchronous loop, so they are called here instead.
    if (openall && openall !== 'offer' && oa.at === null && i + 1 >= Number(openall)) {
      oa.set = introLeft();
      introAll('offer');
      oa.at = answersSoFar();
      dropPlans();
      NEXTQ = null;
    }
    quizPhoto();
    if (openall) {
      const o = document.querySelector('.unlock.intro [data-open]');
      if (o && oa.at === null) {
        oa.set = introLeft();
        o.click();
        oa.at = answersSoFar();
      }
      if (document.querySelector('.unlock.intro [data-back]')) {
        oa.back = answersSoFar() - oa.at;
        oa.h = (store.get(INTRO.OFFER.KEY, {}) || {}).h;
        document.querySelector(`.unlock.intro [data-${back === 'one' ? 'back' : 'keep'}]`).click();
      }
    }
    planNext('quiz');
    const q = SHOWNQ;
    if (pre) pre(q);
    // The first-meeting cards, read through: each teaches like one right answer.
    (q.intro || []).forEach(g => (teach(g, prof.rate), nCards++));
    // The bonus genera offer (every slate genus met): accepted.
    const bo = document.querySelector('.unlock [data-bonus]');
    if (bo) {
      if (bon.offer === null && i >= 0) bon.offer = i + 1;
      bo.click();
    }
    for (let b; (b = document.querySelector('.unlock.intro .ulbtns .next:not([data-open]):not([data-back]):not(.sec)'));) b.click();
    // A typed question (model.js TYPED, quiz.js typeForm) has no buttons: its choices are the draw's, unseen (Codex
    // review #393). Recall, no guessing: known, the genus is typed; not known, "I don't know" half the time, else a genus
    // it is taken for (the same confusion weights, the genus itself left out).
    const typed = !!document.querySelector('#view .tyform'),
      [, t, , , set] = window.__q,
      ch = typed ? window.__q[2] : [...document.querySelectorAll('#view [data-c]')].map(x => x.dataset.c),
      shown = set.shown || [],
      d = mean(shown.map(p => trueD(t, p))) || 0,
      single = shown.length === 1,
      fs = shown.map(p => p.f),
      rep = fs.some(f => LM[f] && LM[f][0]),
      pRec = sig(logit(kn(t)) - d - (single ? L.SINGLE : 0) + memOn(fs)),
      first = !asked(t);
    let pick = t;
    if (!(rnd() < pRec)) {
      const pool = typed ? ch.filter(c => c !== t) : ch,
        ws = pool.map(c => wOf(t, c));
      let r = rnd() * ws.reduce((a, x) => a + x, 0);
      pick = pool[pool.length - 1];
      for (let k = 0; k < pool.length; k++)
        if ((r -= ws[k]) <= 0) {
          pick = pool[k];
          break;
        }
      if (typed && rnd() < 0.5) pick = ''; // "I don't know"
    }
    const good = pick === t;
    // The learner's true chance on this question: recognised, or (choices only) its guess falls on t.
    const pTrue = typed ? pRec : pRec + (1 - pRec) * (wOf(t, t) / ch.reduce((a, c) => a + wOf(t, c), 0));
    lastE = null;
    if (typed) {
      const f = document.querySelector('#view .tyform');
      if (!pick) f.querySelector('[data-idk]').click();
      else ((f.querySelector('input').value = pick), f.requestSubmit());
    } else document.querySelector(`#view [data-c="${CSS.escape(pick)}"]`).click();
    planNext('quiz'); // answer()'s top-up after the feedback
    if (oa.at !== null && lastE !== null)
      oa.ans.push({k: answersSoFar() - oa.at, e: lastE, p: pTrue, ok: good ? 1 : 0, all: oa.set.includes(t), first});
    teach(t, prof.rate * (good ? 1 : L.MISS));
    if (!good && pick) teach(pick, prof.rate * L.PICKED);
    if (good) spaced(t);
    fs.forEach(f => {
      const h = (LM[f] = LM[f] || [0, 0]);
      h[0]++;
      h[1] += good ? 1 : 0;
    });
    const gr = gq[grpOf(t)];
    if (gr) {
      gr.n++;
      gr.ok += good;
      if (rep) {
        gr.rep++;
        gr.repOk += good;
      }
    }
    T += L.STEP;
    return {q, t, good, set};
  };
  for (let i = 0; i < N; i++) {
    const {q, t, good, set} = ask(null, i);
    if (set.exam) nEx++;
    if (q.auto) nDuel++;
    if (q.again) nAgain++;
    blk.n++;
    blk.ok += good;
    if (mill.met === null && introduced('Millepora')) mill.met = i + 1;
    SL.concat(BONUS).forEach(g => !(g in metAt) && introduced(g) && (metAt[g] = i + 1));
    if (mill.asked === null && t === 'Millepora') mill.asked = i + 1;
    if (bon.offer !== null && bon.offer <= i + 1) {
      bon.q++;
      if (isBonus(t)) bon.n++;
    }
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
        knowSlate: mean(SL.map(g => know[g])),
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
        cards: nCards,
        // By photo count (photo memory): cumulative questions on the group's genera, their genera met.
        grp: Object.fromEntries(
          Object.entries(GRP).map(([k, G]) => {
            const gm = G.filter(introduced),
              c = gq[k];
            return [
              k,
              {
                rep: c.n ? (100 * c.rep) / c.n : null,
                right: c.n ? (100 * c.ok) / c.n : null,
                repRight: c.rep ? (100 * c.repOk) / c.rep : null,
                progGap: mean(gm.map(g => genScore(g) - know[g])),
                thBias: mean(gm.map(g => ability(g) - logit(know[g]))),
                learned: G.filter(g => (P[g] || {}).mx).length
              }
            ];
          })
        )
      });
      blk = {n: 0, ok: 0};
    }
  }
  // Breaks (--breaks): from the state at the end of the first session, each break in turn.
  const out = [];
  if (breaks.length) {
    const ls = {...localStorage},
      snap = {
        P: JSON.stringify(P),
        Q: JSON.stringify(Q),
        HOLDS,
        know: {...know},
        LS: JSON.stringify(LS),
        LM: JSON.stringify(LM),
        T,
        last,
        lastQs: [...lastQs],
        twoAt,
        twoPair,
        rematch: JSON.stringify(rematch)
      };
    breaks.forEach(([name, ms], bi) => {
      localStorage.clear();
      Object.entries(ls).forEach(([k, v]) => localStorage.setItem(k, v));
      P = JSON.parse(snap.P);
      Object.keys(Q).forEach(k => delete Q[k]);
      Object.assign(Q, JSON.parse(snap.Q));
      INTROS = null;
      HOLDS = snap.HOLDS;
      Object.assign(know, snap.know);
      Object.keys(LS).forEach(k => delete LS[k]);
      Object.assign(LS, JSON.parse(snap.LS));
      // The photo memory comes back as it was (it does not fade across a break: a limit of this learner).
      Object.keys(LM).forEach(k => delete LM[k]);
      Object.assign(LM, JSON.parse(snap.LM));
      dropPlans();
      NEXTQ = null;
      SHOWNQ = null;
      last = snap.last;
      lastQs = [...snap.lastQs];
      twoAt = snap.twoAt;
      twoPair = snap.twoPair;
      rematch = JSON.parse(snap.rematch);
      if (!old) CB = Object.assign({r: 0, t: 0, ok: 0, f: 0}, store.get(COMEBACK.KEY, {}) || {});
      Math.random = gen((seed * 2246822519) ^ (0x85ebca6b + 7919 * (bi + 1)));
      rnd = gen((seed * 2654435761) ^ (0x9e3779b9 + 7919 * (bi + 1)));
      const metB = SL.filter(introduced),
        before = mean(metB.map(g => know[g]));
      T = snap.T + ms;
      forget(ms);
      if (old) warmLeft = null; // a new visit: the gentle restart
      const r = {
        brk: name,
        cbLen: 0,
        cbOk: 0,
        held: 0,
        after: 0,
        afterOk: 0,
        holdCb: 0,
        holdAfter: 0,
        hold0: HOLDS,
        rust0: null,
        loss: before - mean(metB.map(g => know[g]))
      };
      let inCb = true,
        inHeld = true;
      for (let i = 0; i < 200 && r.after < after; i++) {
        const {q, good} = ask(q0 => {
          // Openings held: during the gentle restart before (no card), the floor or the comeback now (noOpen).
          if (r.rust0 === null) r.rust0 = old ? null : CB.r;
          if (inHeld && (old ? !!q0.warm : noOpen())) r.held++;
          else inHeld = false;
        });
        if (inCb && q.warm) {
          r.cbLen++;
          r.cbOk += good;
          if (introHold()) r.holdCb++;
        } else {
          inCb = false;
          r.after++;
          r.afterOk += good;
          if (introHold()) r.holdAfter++;
        }
      }
      out.push(r);
    });
  }
  return {
    rows,
    entry,
    learnedAt,
    metAt,
    nph: NPH,
    pairs: PAIRS.length,
    breaks: out,
    millMet: mill.met,
    millAsked: mill.asked,
    bonusOffer: bon.offer,
    bonusShare: bon.q ? bon.n / bon.q : null,
    bonusMet: BONUS.filter(introduced).length,
    openAll: openall ? oa : null
  };
}

async function run(browser, base, name, seed) {
  const ctx = await browser.newContext({viewport: {width: 1280, height: 800}, serviceWorkers: 'block'});
  await ctx.route(
    u => !u.href.startsWith(base),
    r => r.abort()
  );
  await ctx.addInitScript(st => {
    localStorage.setItem('imr-tour', '"done"');
    if (st)
      localStorage.setItem(
        'imr-photo-stats',
        JSON.stringify({
          t: Date.now(),
          v: st.v,
          photos: st.photos || {},
          conf: st.conf || {},
          ...(st.mem ? {mem: st.mem} : {}),
          ...(st.gd ? {gd: st.gd} : {})
        })
      );
  }, STATS_JSON);
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(base);
  await p.waitForFunction(() => window.APP_READY, null, {timeout: 60000});
  // Every script tier in (My progress, the Tools) and the network quiet, so each run starts from the same state.
  await p.evaluate(() => window.loadTier && window.loadTier(5));
  await p.waitForLoadState('networkidle');
  const r = await p.evaluate(play, {
    prof: PROFILES[name],
    seed,
    N: QN,
    cps: CPS,
    L: LEARNER,
    breaks: BREAKS,
    after: AFTER,
    openall: OPENALL,
    back: BACK,
    truth: TRUTH_JSON
  });
  await ctx.close();
  return {profile: name, seed, errs, ...r};
}

const KEYS = [
  ['knowSlate', 'knowSlate', 2, 1],
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

// By photo count (photo memory): per profile, checkpoint and group (few / many game photos), the mean over the runs of
// each run's cumulative figures; then, pooled over every run, the genera of the group that entered the exam or were
// learned by the last question: how many a run, their mean true reference success then, the median question.
const GKEYS = [
  ['rep', 'rep%', 0],
  ['right', 'right%', 0],
  ['repRight', 'right% rep', 0],
  ['progGap', 'prog-know', 2],
  ['thBias', 'th-lk', 2],
  ['learned', 'learned', 1]
];
function grpSummary(runs) {
  const out = {};
  for (const name of NAMES) {
    const R = runs.filter(r => r.profile === name),
      m = v => (v.length ? v.reduce((a, x) => a + x, 0) / v.length : null),
      med = v => quant(v, 0.5);
    out[name] = {
      rows: CPS.map((q, i) =>
        Object.fromEntries(
          ['few', 'many'].map(gk => [
            gk,
            Object.fromEntries(
              GKEYS.map(([k]) => [
                k,
                m(R.map(r => r.rows[i] && r.rows[i].grp && r.rows[i].grp[gk][k]).filter(x => typeof x === 'number' && !isNaN(x)))
              ])
            )
          ])
        )
      ),
      ev: Object.fromEntries(
        ['few', 'many'].map(gk => {
          const inG = (r, g) => (gk === 'few' ? r.nph[g] <= LEARNER.FEW : r.nph[g] >= LEARNER.MANY),
            pool = key => R.flatMap(r => Object.entries(r[key] || {}).filter(([g]) => r.nph && g in r.nph && inG(r, g)).map(([, e]) => e));
          const en = pool('entry'),
            le = pool('learnedAt');
          return [
            gk,
            {
              genera: R.length ? Object.keys(R[0].nph || {}).filter(g => inG(R[0], g)).length : 0,
              entry: en.length / Math.max(1, R.length),
              refEntry: m(en.map(e => e.ref)),
              qEntry: med(en.map(e => e.q)),
              learned: le.length / Math.max(1, R.length),
              refLearned: m(le.map(e => e.ref)),
              qLearned: med(le.map(e => e.q))
            }
          ];
        })
      )
    };
  }
  return out;
}
function grpTable(GS) {
  const f = (x, d) => (x === null || x === undefined ? '-' : x.toFixed(d));
  const lines = [
    `\nBy photo count (few: ${LEARNER.FEW} game photos or fewer; many: ${LEARNER.MANY} or more); learner photo memory ${LEARNER.MEM.join(' / ')}`,
    'rep%: questions showing a photo already shown to the player; right% on all / on those repeats; prog-know, th-lk: over the genera met; learned: genera.'
  ];
  for (const name of NAMES) {
    lines.push(`\n${name}`);
    const head = ['q', ...['few', 'many'].flatMap(g => GKEYS.map(k => `${g} ${k[1]}`))],
      body = CPS.map((q, i) => [String(q), ...['few', 'many'].flatMap(g => GKEYS.map(([k, , d]) => f(GS[name].rows[i][g][k], d)))]),
      w = head.map((h, j) => Math.max(h.length, ...body.map(b => b[j].length)));
    lines.push(head.map((h, j) => h.padStart(w[j])).join(' '));
    body.forEach(b => lines.push(b.map((x, j) => x.padStart(w[j])).join(' ')));
    ['few', 'many'].forEach(g => {
      const e = GS[name].ev[g];
      lines.push(
        `  ${g} (${e.genera} genera): entered the exam ${f(e.entry, 1)} a run, ref@exam ${f(e.refEntry, 2)}, median question ${f(e.qEntry, 0)}; learned ${f(e.learned, 1)} a run, ref@learn ${f(e.refLearned, 2)}, median question ${f(e.qLearned, 0)}`
      );
    });
  }
  return lines.join('\n');
}

// Breaks (--breaks): per profile and break, over the seeds. Comeback length (questions flagged warm) median [quartiles]
// min-max; held: answers with no genus opening (floor and comeback), median; right % during the comeback and in the
// --after questions after it (mean of the runs' rates); hold: runs where the opening hold was on at some answer of the
// comeback / of the --after questions, and the mean number of such answers; rust: the app's rust at the first question
// back; loss: the learner's true mean know lost over the genera met.
const quant = (v, q) => {
  const a = v.slice().sort((x, y) => x - y),
    i = (a.length - 1) * q,
    lo = Math.floor(i);
  return a.length ? a[lo] + (a[Math.ceil(i)] - a[lo]) * (i - lo) : null;
};
function breakSummary(runs) {
  const out = {};
  for (const name of NAMES)
    out[name] = BREAKS.map(([b]) => {
      const R = runs.filter(r => r.profile === name).map(r => (r.breaks || []).find(x => x.brk === b)).filter(Boolean),
        m = f => {
          const v = R.map(f).filter(x => typeof x === 'number' && !isNaN(x));
          return v.length ? v.reduce((a, x) => a + x, 0) / v.length : null;
        },
        len = R.map(r => r.cbLen),
        held = R.map(r => r.held);
      return {
        brk: b,
        n: R.length,
        len: {med: quant(len, 0.5), q1: quant(len, 0.25), q3: quant(len, 0.75), min: Math.min(...len), max: Math.max(...len)},
        held: {med: quant(held, 0.5), min: Math.min(...held), max: Math.max(...held)},
        cbRight: m(r => (r.cbLen ? (100 * r.cbOk) / r.cbLen : NaN)),
        afterRight: m(r => (100 * r.afterOk) / r.after),
        holdCbRuns: R.filter(r => r.holdCb > 0).length,
        holdCb: m(r => r.holdCb),
        holdAfterRuns: R.filter(r => r.holdAfter > 0).length,
        holdAfter: m(r => r.holdAfter),
        hold0Runs: R.filter(r => r.hold0 >= 1.5).length,
        rust0: m(r => r.rust0),
        loss: m(r => r.loss)
      };
    });
  return out;
}
function breakTable(BS) {
  const f = (x, d = 0) => (x === null || x === undefined ? '-' : x.toFixed(d));
  const lines = [
    `\nAfter a break (${QN} questions first, then the comeback and ${AFTER} more; ${SEEDS} seeds)`,
    'len: comeback questions, median [quartiles] min-max; held: answers with no genus opening, median min-max; right%: during the comeback / the ' +
      AFTER +
      ' after;\nhold: runs with the opening hold on during the comeback / after it (mean answers held), and already on at the break; rust: app, start; loss: true mean know lost (genera met).'
  ];
  for (const name of NAMES) {
    lines.push(`\n${name}`);
    const head = ['break', 'len', 'held', 'right% cb/after', 'hold cb', 'hold after', 'hold@0', 'rust', 'loss'],
      body = BS[name].map(r => [
        r.brk,
        `${f(r.len.med, 1)} [${f(r.len.q1, 1)}-${f(r.len.q3, 1)}] ${r.len.min}-${r.len.max}`,
        `${f(r.held.med, 1)} ${r.held.min}-${r.held.max}`,
        `${f(r.cbRight)} / ${f(r.afterRight)}`,
        `${r.holdCbRuns}/${r.n} (${f(r.holdCb, 1)})`,
        `${r.holdAfterRuns}/${r.n} (${f(r.holdAfter, 1)})`,
        `${r.hold0Runs}/${r.n}`,
        f(r.rust0, 2),
        f(r.loss, 3)
      ]),
      w = head.map((h, j) => Math.max(h.length, ...body.map(b => b[j].length)));
    lines.push(head.map((h, j) => h.padStart(w[j])).join('  '));
    body.forEach(b => lines.push(b.map((x, j) => x.padStart(w[j])).join('  ')));
  }
  return lines.join('\n');
}

// --openall: per profile, the runs where all were opened (median answer), the back card (runs, answers after Open all,
// the sum h then), and after Open all the app's expected success e against the learner's true chance p and its right
// answers, as means over the pooled answers: first question on each genus opened at once, the first 30 answers after
// Open all on those genera and on the genera met before, and every answer after Open all.
function openTable(runs) {
  const f = (x, d = 2) => (x === null || x === undefined || isNaN(x) ? '-' : x.toFixed(d)),
    m = v => (v.length ? v.reduce((a, x) => a + x, 0) / v.length : NaN),
    lines = [`\nOpen all (--openall ${OPENALL}, back card answered ${BACK}); e: app's expected success, p: true chance, ok: right (pooled answers)`];
  for (const name of NAMES) {
    const R = runs.filter(r => r.profile === name && r.openAll && r.openAll.at !== null),
      A = R.flatMap(r => r.openAll.ans),
      bk = R.filter(r => r.openAll.back !== null),
      row = (lab, X) => `    ${lab.padEnd(28)} n ${String(X.length).padStart(4)}  e ${f(m(X.map(x => x.e)))}  p ${f(m(X.map(x => x.p)))}  ok ${f(m(X.map(x => x.ok)))}  e-p ${f(m(X.map(x => x.e - x.p)))}`;
    lines.push(
      `  ${name}: opened in ${R.length}/${runs.filter(r => r.profile === name).length} runs (answer ${R.map(r => r.openAll.at).join(', ') || '-'}; ${f(m(R.map(r => r.openAll.set.length)), 1)} genera at once); back card in ${bk.length}/${R.length} runs, at answer ${bk.map(r => r.openAll.back).join(', ') || '-'} after Open all`
    );
    lines.push(row('first question, opened at once', A.filter(x => x.all && x.first)));
    lines.push(row('first 30, opened at once', A.filter(x => x.all && x.k <= 30)));
    lines.push(row('first 30, met before', A.filter(x => !x.all && x.k <= 30)));
    lines.push(row('every answer after Open all', A));
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
    'knowSlate/knowMet: true knowledge (slate / met); |th-lk|, th-lk: Elo ability vs logit(know), genera met; prog-know: genScore - know, genera met;\n' +
      "prog%: the app's progress over the slate; right%: since the previous row; look: true look-alike pair accuracy; ref>=.9: genera truly passing the\n" +
      'hard reference question 90%; exam: genera entered in the mastery exam; ref@exam / ref@learn: their true reference success then (genera counted).'
  );
  console.log(table(S));
  // Millepora met / first asked and the bonus offer, per profile: median question over the runs where it happened.
  const med = A => {
    const v = A.filter(x => typeof x === 'number').sort((a, b) => a - b);
    return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : '-';
  };
  console.log('\nMillepora met / first asked, bonus genera offered (median question, runs where it happened), bonus share after the offer:');
  for (const name of NAMES) {
    const R = runs.filter(r => r.profile === name),
      n = k => R.filter(r => typeof r[k] === 'number').length;
    console.log(
      `  ${name}: met ${med(R.map(r => r.millMet))} (${n('millMet')}/${R.length}), asked ${med(R.map(r => r.millAsked))} (${n('millAsked')}/${R.length}), offer ${med(R.map(r => r.bonusOffer))} (${n('bonusOffer')}/${R.length}), share ${R.some(r => r.bonusShare !== null) ? (100 * med(R.map(r => r.bonusShare))).toFixed(0) + '%' : '-'}, bonus met ${med(R.map(r => r.bonusMet))}`
    );
  }
  const GS = grpSummary(runs);
  console.log(grpTable(GS));
  const BS = BREAKS.length ? breakSummary(runs) : null;
  if (BS) console.log(breakTable(BS));
  // First met, per genus of --met: median question over every run, a run where it was not met counting as after QN.
  console.log(`\nFirst met (median question over the runs; >${QN}: not met in half of them or more; met in n runs):`);
  for (const name of NAMES) {
    const R = runs.filter(r => r.profile === name),
      cell = g => {
        const m = med(R.map(r => (r.metAt || {})[g] ?? Infinity));
        return `${g} ${m === Infinity ? '>' + QN : m} (${R.filter(r => (r.metAt || {})[g]).length}/${R.length})`;
      };
    console.log(`  ${name}: ${MET.map(cell).join(', ')}`);
  }
  if (OPENALL) console.log(openTable(runs));
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
          truth: TRUTH || null,
          seconds: secs,
          summary: S,
          byPhotos: GS,
          breaks: BS,
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
