// Per-genus ability on real answers (2026-11-03): replays the answer log, player by player in time order, with the
// app's own Elo (core.js ELO, abilityOf, eloStep, as model.js runs them; core.js playerStart, levelSeed) under several
// rules for the genus wrongly given (rule L2), and scores how well each rule predicts the next answer.
// Offline, reads a file, sends nothing (docs/LEARNING.md "The genus wrongly given in the Elo").
//
//   node tools/abilityeval.js answers.json [--variants a,e,e+L] [--player <name or id>] [--min 20] [--json out.json]
//                             [--priors priors.json]
//                             [--model other/core.js]
//                             [--grid 0,0.5,1;1,1.5]
//
// answers.json: the answer log, either the admin's readAnswers rows [id, time ms, genus shown, answered, right 0|1, mode,
// photos, expected, ability, new photos, choices, ...] (as tools/memreplay.js reads them), or the sheet's Answers tab as
// rows [name, time, genus shown, answered, right, mode, photos, answer id, expected, ability, new photos, choices, ...]
// (read-only export; row order = time order). Nothing is written anywhere but --json.
//
// Rules for the genus wrongly given c (the genus shown always gets the app's step):
//   a  the app until 2026-11-03: a miss step at difficulty 0, its answer count not raised (K stays at its first value)
//   b  a miss step at the question's difficulty, counted in c's own uncertainty (K shrinks as for its own answers)
//   c  b at half weight
//   d  a, but the genus ability planned as the global level plus an offset (Pelánek et al. 2017's global + concept
//      skill): every answer moves the level, the offset of the genus shown moves by its own K
//   e  no step on c (Pelánek et al. 2017, Papoušek et al. 2014: the learner's knowledge of an item is not updated when it
//      is a distractor); rule L2 stays in the progress (the app since 2026-11-03)
// +X (2026-11-04, docs/LEARNING.md "Known mix-ups"): the confusion term, the question taken that much harder (core.js
// confGap, the most over its choices: the player's own score of the pair, replayed from their answers as the app keeps
// it, s.off and s.conf, against the pooled score) for the prediction and the step; +Y the prediction only; +Z the sum
// over the choices instead of the most; +M only on a question with 3 or more plausible choices (the app's rule: on a
// 2-choice contrast question or easy choices the term made the prediction worse). The pooled score: the other players' answers (the whole log, as ?stats=1 would
// give them, without the player's own) on the prior of each pair, from --priors (the app's pooledConf with no answers,
// {"A|B": prior}; without it: declared look-alikes CONF.LOOK, same family CONF.FAM, else CONF.FORM).
// Options added with +, e.g. e+W+L: W, a genus never answered starts from the full global level (core.js START.W 1, not
// 0.8); L, the global level's step without the floor ELO.kmin (its K keeps shrinking with the answers; the volatility
// still lets it catch up with a lasting change). The level bands of a rule with L are those of its own level.
//
// Response time (2026-11-03, docs/LEARNING.md "Response time"), options with a number: +Tk a right answer's genus step
// times w = clamp(1 - k z, 0.5, 1.5), z its log(seconds) against the player's own median so far; +Sk misses too; +Hh the
// speed-accuracy score of Math Garden instead of right / wrong; +Uc every right answer's step times c (a control); +G
// the level's step too; +N no time effect when a photo was enlarged. The prediction never uses the answer's own time.
// +A (2026-11-04): the app's own rule (core.js RTIME, rtWeight, rtAdd: +T1.5+G, the times kept as the app keeps them);
// with --model and a core.js before it, no change, so `e+X+M+A` replays the app as it is on either version.
// --rtfit: the two measures of PR #431 on the first rule's expectation (a check of tools/learnsim.js's time model on
// simulated logs, docs/LEARNING.md "Response time"): the logistic term of z (log seconds minus the player's median over
// all their timed answers, typed ones left out) on the answer itself, and of the z of a genus's last own answer, when it
// was right, on its next one; each on top of the expectation (offset logit p, with an intercept).
// A '*' in place of a number (e.g. e+X+M+T*+G) replays every value of --grid (one list per '*', ';' between lists) and
// chooses it per player by leave one player out: each player is scored with the value best on the other players.
// After the tables, every rule's paired log-loss difference against the first one, with the players as the unit of
// inference (the answers cluster in about ten players, docs/reviews/2026-11-05-stats-methods-study.md §5.2, PR #580): the mean of
// the players' own mean differences (each player one vote), a 95% t interval on players - 1 degrees of freedom and the
// two-sided p of a sign-flip test over the players (exact up to 16 players, else 9999 draws, seeded: the same p on every
// run). The 'all' row is the primary measure, the group rows exploratory (no correction for their number). Then, as a
// descriptive line only, the former figure per answer, ± a standard error that treats the answers as independent (too
// narrow when the players differ).
// Each question's difficulty d is recovered from what the app logged when it was asked (expected e, ability th, k
// choices): e = 1/k + (1 - 1/k) sig(th - d), so the photo, its memory offset and the single-view handicap are those the
// player really met; answers logged without e/th (before sheet v5) are skipped. The prediction for an answer is the
// replayed ability of its genus before it (a genus never answered: playerStart from the replayed progress) against d,
// with the guess rate of its k choices (typed: none). Scores: log-loss and Brier (lower is better), and calibration,
// mean predicted against mean right, by the number of choices (2; 3-4; typed) and by the player's replayed global level
// then (a reference level stepped by one fixed rule, refStep, so every model and rule has the same answers in each band). Per player: the global level and the answer-weighted mean ability of the genera answered at the end, and, as a
// reference, a static fit of the same answers (maximum likelihood per genus with a normal prior of sd 1 around the
// player's own fit over every answer).
// Approximations: a comeback question's recall is taken as 1; the global level ignores nothing (as the app);
// the genus wrongly given gets the question's difficulty with the memory offset of the genus shown (the app: without it).
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..');

const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8')),
  GAME = new Set(C.gameOf(DATA)); // the game genera: slate, Millepora (BENTHIC), bonus genera (the app's GX)

// The app's ELO, ability and abilityStep (core.js ELO, abilityOf, eloStep since 2026-11-03: model.js calls them on its P,
// and the sheet's full replay steps the ability with them too); P is this context's, set per player.
// --model <file>: another core.js (e.g. main's, from git show) to compare the same rules on two versions of the app.
function model(file = path.join(ROOT, 'core.js')) {
  const ctx = {P: {}, module: {exports: {}}};
  if (path.resolve(file) === path.join(ROOT, 'core.js')) ctx.K = C;
  else {
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
    ctx.K = ctx.module.exports;
  }
  const K = ctx.K;
  ctx.M = {ELO: K.ELO, ability: n => K.abilityOf(ctx.P, n), abilityStep: (n, s, good, d, k, w) => K.eloStep(ctx.P, n, s, good, d, k, w)};
  return ctx;
}
let M = model(),
  KMIN = M.M.ELO.kmin;
const W0 = C.START.W;
// Replays with another core.js from now on (the CLI's --model, tests).
function useModel(file) {
  M = model(file);
  KMIN = M.M.ELO.kmin;
}
const sig = x => 1 / (1 + Math.exp(-x)),
  logit = p => Math.log(p / (1 - p)),
  guess = k => (isFinite(k) ? 1 / k : 0);
const kOf = (mode, choices) => {
  if (C.TYPED_RE.test(mode)) return Infinity;
  const kq = /\|k(\d)/.exec(mode);
  if (kq) return Number(kq[1]);
  if (/duel|\|d/.test(mode)) return 2;
  const n = String(choices || '')
    .split(/\s+/)
    .filter(Boolean).length;
  return n >= 2 && n < 4 ? n : 4;
};

// Rows, normalised and sorted by time, stable (ties keep the log's order): readAnswers' times are ms, the sheet tab's
// are text ("2026-11-03 18:09", to the minute) or dates; a device that was offline uploads its older answers after
// newer ones from another device, so the tab's order is not the time order. A time that cannot be read keeps the
// position of the row before it.
const timeOf = x => (typeof x === 'number' ? x : x instanceof Date ? x.getTime() : Date.parse(String(x || '').trim().replace(' ', 'T')));
// The app logs its own confusion term inside e from the release of the known mix-ups (PR #425, live 2026-11-03 15:35
// UTC; the log's clock, as the sheet tab writes it, Asia/Taipei): before it, e has none. An app not yet updated logs a
// few answers without it after that time (no per-answer app version in the log). --cf-from moves it.
let CF_FROM = timeOf('2026-11-03 23:35');
function normalise(raw) {
  raw = raw.filter(r => r && r[0] && r[0] !== 'Name');
  let last = -Infinity;
  raw = raw
    .map((r, i) => {
      const t = timeOf(r[1]);
      if (isFinite(t)) last = t;
      return [r, i, last];
    })
    .sort((x, y) => x[2] - y[2] || x[1] - y[1])
    .map(x => x[0]);
  return raw.map((r, i) =>
    typeof r[1] === 'number'
      ? {p: r[0], i, t: r[2], at: timeOf(r[1]), a: r[3], ok: Number(r[4]) ? 1 : 0, mode: r[5], e: r[7], th: r[8], ch: r[10], ...rt(r)}
      : {p: r[0], i, t: r[2], at: timeOf(r[1]), a: r[3], ok: String(r[4]) === '1' ? 1 : 0, mode: r[5], e: r[8], th: r[9], ch: r[11], ...rt(r)}
  );
}
const num = x => (x === '' || x === null || x === undefined ? NaN : Number(x));
// Seconds to answer and a photo enlarged first (sheet v23 on; both row layouts keep them at 12 and 13): NaN / null before.
const rt = r => ({sec: num(r[12]), zm: r[13] === undefined || r[13] === '' || r[13] === null ? null : Number(r[13]) ? 1 : 0});

// The reference for the level bands: the app's global level as #413 stepped it (model.js abilityStep of 2026-11-03,
// ELO {kmax 0.8, kmin 0.25, n 15, vr 0.1, vg 2}, with the kmin floor), kept here so that the bands never depend on the
// model or the rule being replayed.
const REF = {kmax: 0.8, kmin: 0.25, n: 15, lo: -1.5, hi: 3, vr: 0.1, vg: 2};
function refStep(s, good, d, k) {
  const g = isFinite(k) ? 1 / k : 0,
    e = g + (1 - g) * sig(s.th - d),
    m = (s.ok || 0) + (s.ko || 0);
  s.vr = Math.round(((1 - REF.vr) * (s.vr || 0) + REF.vr * ((good ? 1 : 0) - e)) * 1000) / 1000;
  const K = Math.min(REF.kmax, Math.max(REF.kmin, REF.kmax / (1 + m / REF.n)) * (1 + REF.vg * Math.abs(s.vr)));
  s.th = Math.round(Math.min(REF.hi, Math.max(REF.lo, s.th + K * ((good ? 1 : 0) - e))) * 100) / 100;
}
// Response time as a weak signal (2026-11-03, docs/LEARNING.md "Response time"): z = log(seconds) minus the median
// log(seconds) of the player's own earlier timed answers (RT.MIN of them at least; typed questions left out, they take
// longer by design), known only once the answer is given, so it changes the step after the answer, never its prediction.
// An answer without time (before sheet v23), a typed one, or one of the player's first RT.MIN timed answers: factor 1.
const RT = {MIN: 10, LO: 0.5, HI: 1.5, ZD: 1};
const median = a => {
  const s = [...a].sort((x, y) => x - y),
    n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
// The step abilityStep just made, redone with its own K on another surprise: K from the answer count and the volatility
// it just stored (model.js abilityStep as of 2026-11-03: the level has no kmin floor, rounded to 4 decimals, a genus
// to 2; with an older --model the time rules' level step would not match it).
function restep(n, s, th, surprise) {
  const E = M.M.ELO,
    m = (s.ok || 0) + (s.ko || 0),
    K = Math.min(E.kmax, Math.max(n === C.LEVEL ? 0 : E.kmin, E.kmax / (1 + m / E.n)) * (1 + E.vg * Math.abs(s.vr || 0))),
    r = n === C.LEVEL ? 1e4 : 100;
  s.th = Math.round(Math.min(E.hi, Math.max(E.lo, th + K * surprise)) * r) / r;
}
// The speed-accuracy score of Maris & van der Maas (2012), used by Math Garden (Klinkenberg et al. 2011, "high speed,
// high stakes"): s = (2x - 1)(1 - t/D), whose expectation is the Langevin function coth(c) - 1/c of the ability gap c
// (P(right) = sig(c), as in the Elo). The app has no time limit: D is a pseudo-deadline, e^RT.ZD times the player's
// median, t capped at D (a slower answer scores 0 either way).
const langevin = c => (Math.abs(c) < 1e-4 ? c / 3 : 1 / Math.tanh(c) - 1 / c);
// One player's replay under one rule. Returns the scored answers and the final model.
function replay(list, variant, pooledOf = null) {
  const [v, ...flags] = variant.split('+'),
    P = {};
  // Time flags (docs/LEARNING.md "Response time"): Tk a right answer's genus step times w = clamp(1 - k z, RT.LO, RT.HI)
  // (fast > 1, slow < 1), misses unchanged; Sk the same w on misses too (a fast miss steps further down); Hh the
  // speed-accuracy score instead of right / wrong, its step K h (s - L(c)), c = th - d (the guess rate left aside); Uc
  // every right answer's genus step times c more, whatever the time (a control: does a speed rule only make the steps
  // up bigger? with T, the two multiply); G the level's step too; N no time effect on an answer with a photo enlarged
  // (the time spent enlarged is in the seconds).
  const fv = c => {
      const f = flags.find(x => x[0] === c && /^[A-Z][\d.]+$/.test(x));
      return f ? Number(f.slice(1)) : null;
    },
    kT = fv('T'),
    kS = fv('S'),
    kH = fv('H'),
    kU = fv('U'),
    past = [], // the player's earlier timed answers, log seconds
    lastZ = {}; // per genus, the z of its last own answer if it was right
  // The confusion term (+X, +Y, +Z): the most (or the sum) over the choices offered of the player's excess on the pair.
  const cX = flags.includes('X') || flags.includes('Y') || flags.includes('Z'),
    termOf = (r, sum, min3) => {
      if (!pooledOf || (min3 && kOf(r.mode, r.ch) < 3)) return 0;
      const gs = String(r.ch || '')
        .split(/\s+/)
        .filter(x => x && x !== r.t && GAME.has(x))
        .map(x => C.confGap(C.pairConf(P, r.t, x), pooledOf(r.t, x)));
      return !gs.length ? 0 : sum ? gs.reduce((a, x) => a + x, 0) : Math.max(0, ...gs);
    },
    confTerm = r => (cX ? termOf(r, flags.includes('Z'), flags.includes('M')) : 0),
    // The term the app itself put in the logged expectation (model.js confTerm: the most over the choices, 3 or more
    // plausible ones) for the answers logged from CF_FROM on: taken out of the recovered difficulty, so a rule's own
    // term is not counted twice (Codex review #425). Replayed from the same record as the app keeps it.
    appTerm = r => (isFinite(r.at) && r.at >= CF_FROM ? termOf(r, false, true) : 0);
  M.P = P;
  const st = g => (P[g] = P[g] || {ok: 0, ko: 0}),
    off = {}, // rule d: genus offsets from the level
    fa = new Set(), // genera wrongly given since their own last question (a false alarm on them)
    L0 = {th: 0}, // the shadow level for the bands
    scored = [];
  const plan = g => {
    if (v !== 'd') return M.M.ability(g);
    const L = (P[C.LEVEL] || {}).th || 0;
    if (!(g in off)) off[g] = M.M.ability(g) - L; // a genus never answered starts where the app would start it
    return L + off[g];
  };
  // The offset's step: the genus's own K (abilityStep's uncertainty and volatility), on the surprise against level + offset.
  const offStep = (g, s, good, d, k, w = 1) => {
    const th = plan(g),
      tmp = {ok: s.ok, ko: s.ko, vr: s.vr, th};
    M.P = {[g]: tmp};
    M.M.abilityStep(g, tmp, good, d, k);
    M.P = P;
    off[g] += w * (tmp.th - th);
    s.vr = tmp.vr;
    s.th = Math.round((((P[C.LEVEL] || {}).th || 0) + off[g]) * 100) / 100;
  };
  list.forEach(r => {
    const e = num(r.e),
      th0 = num(r.th),
      k = kOf(r.mode, r.ch),
      g = guess(k);
    if (!isFinite(e) || !isFinite(th0)) return;
    const d0 = th0 - logit(Math.min(0.995, Math.max(0.005, (e - g) / (1 - g)))) - appTerm(r),
      cf = confTerm(r),
      d = d0 + (flags.includes('Y') ? 0 : cf),
      good = r.ok === 1,
      L = (P[C.LEVEL] || {}).th || 0,
      th = plan(r.t);
    scored.push({y: good ? 1 : 0, p: g + (1 - g) * sig(th - d0 - cf), cf, pl: g + (1 - g) * sig(L - d), k, L: L0.th, mode: r.mode, fa: fa.has(r.t), r});
    fa.delete(r.t);
    const s = st(r.t);
    if (good) s.ok++;
    else s.ko++;
    // The player's own record on the pairs, as the app keeps it (quiz.js answer): offers, and the genus given in a mix-up.
    String(r.ch || '')
      .split(/\s+/)
      .filter(x => x && x !== r.t)
      .forEach(x => ((s.off = s.off || {}), (s.off[x] = (s.off[x] || 0) + 1)));
    if (!good && r.a && r.a !== r.t) (s.conf = s.conf || {}), (s.conf[r.a] = (s.conf[r.a] || 0) + 1);
    // The answer's speed against the player's own earlier answers (z), then the time rule's weight or score.
    const timed = isFinite(r.sec) && r.sec > 0 && isFinite(k),
      zr = timed && past.length >= RT.MIN ? Math.log(r.sec) - median(past) : null,
      z = flags.includes('N') && r.zm === 1 ? null : zr;
    if (timed) past.push(Math.log(r.sec));
    const wT = z === null ? 1 : Math.min(RT.HI, Math.max(RT.LO, 1 - (kT ?? kS ?? 0) * z)),
      w = (good && kU !== null ? kU : 1) * ((kT !== null && good) || kS !== null ? wT : 1),
      sH = z === null || kH === null ? null : (good ? 1 : -1) * Math.max(0, 1 - Math.exp(z - RT.ZD)),
      timeStep = (n, st, th1) => {
        if (sH !== null) restep(n, st, th1, kH * (sH - langevin(th1 - d)));
        else if (w !== 1) restep(n, st, th1, w * ((good ? 1 : 0) - (guess(k) + (1 - guess(k)) * sig(th1 - d))));
      };
    // For the groups: this answer's speed, and the speed of the genus's last own answer when it was right.
    Object.assign(scored[scored.length - 1], {z: zr, pz: lastZ[r.t] ?? null});
    lastZ[r.t] = good ? zr : null;
    // +A: the app's own answer-time rule (core.js rtWeight and rtAdd, as quiz.js answer and replayProgress run them,
    // since rules version 4; a core.js without them, e.g. main's before it through --model: no change).
    const appRT = flags.includes('A') && typeof M.K.rtWeight === 'function',
      wA = appRT ? M.K.rtWeight(P[C.LEVEL], r.sec, k, good) : 1;
    if (v === 'd') offStep(r.t, s, good, d, k);
    else {
      const th1 = M.M.ability(r.t); // what abilityStep starts from (its answer count already holds this answer)
      M.M.abilityStep(r.t, s, good, d, k, wA);
      timeStep(r.t, s, th1);
    }
    if (P[C.LEVEL]) P[C.LEVEL][good ? 'ok' : 'ko']++;
    else P[C.LEVEL] = C.levelSeed(P);
    // The level bands come from a reference level stepped by one fixed rule (refStep), whatever the model (--model)
    // or the rule replayed, so every run puts the same answers in each band (Codex review #415). Its seed too: the
    // first answer's genus stepped by refStep from where it started (th, before any rule touched it), not the rule's
    // own step (a time rule or +U moves it before the level is seeded; Codex review #431).
    if (!L0.seeded) {
      const g0 = {ok: good ? 1 : 0, ko: good ? 0 : 1, th};
      refStep(g0, good, d0, k);
      Object.assign(L0, C.levelSeed({[r.t]: g0}), {seeded: 1});
    } else L0[good ? 'ok' : 'ko']++;
    refStep(L0, good, d0, k); // d0: the same difficulty whatever the rule, so every rule's bands hold the same answers (Codex review #425)
    // +L: the global level's step without the floor ELO.kmin (its K keeps shrinking with the answers, Pelánek's
    // uncertainty function; the volatility still lets it catch up with a lasting change).
    // +V: the level's step without the volatility boost (ELO.vg), so a run of misses does not speed its fall.
    const VG = M.M.ELO.vg;
    if (flags.includes('L')) M.M.ELO.kmin = 0;
    if (flags.includes('V')) M.M.ELO.vg = 0;
    const thL = P[C.LEVEL].th;
    M.M.abilityStep(C.LEVEL, P[C.LEVEL], good, d, k, wA);
    if (appRT) M.K.rtAdd(P[C.LEVEL], r.sec, k);
    if (flags.includes('G')) timeStep(C.LEVEL, P[C.LEVEL], thL);
    M.M.ELO.kmin = KMIN;
    M.M.ELO.vg = VG;
    const c = r.a;
    if (!good && c && c !== r.t && GAME.has(c)) fa.add(c);
    if (!good && c && c !== r.t && GAME.has(c)) {
      const w = st(c);
      if (v === 'a') M.M.abilityStep(c, w, false, 0, k);
      else if (v === 'd') offStep(c, w, false, 0, k);
      else if (v === 'b' || v === 'c') {
        // Counted in its own uncertainty (here a separate count, so ok/ko stay the genus's own answers).
        const before = M.M.ability(c),
          tmp = {ok: w.ok, ko: w.ko + (w.kc || 0) + 1, vr: w.vr, th: before};
        M.P = {[c]: tmp};
        M.M.abilityStep(c, tmp, false, d, k);
        M.P = P;
        w.kc = (w.kc || 0) + 1;
        w.vr = tmp.vr;
        w.th = Math.round((before + (v === 'c' ? 0.5 : 1) * (tmp.th - before)) * 100) / 100;
      }
    }
  });
  return {scored, P, plan};
}
// Static reference: maximum likelihood per genus, normal prior (sd 1) around the player's own fit over all answers.
function mle(obs, prior) {
  let th = prior ? prior[0] : 0;
  for (let it = 0; it < 100; it++) {
    let G = 0,
      H = 0;
    obs.forEach(o => {
      const g = guess(o.k),
        s = sig(th - o.d),
        p = g + (1 - g) * s,
        dp = (1 - g) * s * (1 - s);
      G += ((o.y - p) * dp) / (p * (1 - p));
      H -= (dp * dp) / (p * (1 - p));
    });
    if (prior) {
      G -= (th - prior[0]) / prior[1] ** 2;
      H -= 1 / prior[1] ** 2;
    }
    th = Math.max(-4, Math.min(5, th - G / H));
  }
  return th;
}
const kGroup = o => (!isFinite(o.k) ? 'typed' : o.k === 2 ? 'k2' : 'k3-4'),
  lGroup = o => (o.L < 0 ? 'level<0' : o.L < 0.75 ? 'level 0-0.75' : 'level>=0.75'),
  // The 2-choice questions by kind: the Duel tab, a duel slipped into the quiz (|d), the quiz's other 2-choice
  // questions ("Again: A or B?" and easy choices of other growth forms, |k2).
  fGroup = o => (o.k !== 2 ? null : /^quiz-duel/.test(o.mode) ? '2: Duel tab' : /\|d/.test(o.mode) ? '2: quiz duel' : '2: quiz'),
  // Response time: answers whose genus was last answered right fast (z < -0.3) or slowly (z > 0.3), whatever the rule.
  tGroup = o => (o.pz === null || o.pz === undefined ? null : o.pz < -0.3 ? 'after a fast right' : o.pz > 0.3 ? 'after a slow right' : 'after a mid right');
function groupScores(all) {
  const groups = {};
  // 'after a false alarm': a genus's first own question after it was given wrongly for another genus.
  all.forEach(o =>
    [kGroup(o), lGroup(o), fGroup(o), tGroup(o), o.fa ? 'after a false alarm' : null].forEach(G => G && (groups[G] = groups[G] || []).push(o))
  );
  return Object.fromEntries(Object.entries(groups).map(([G, l]) => [G, score(l)]));
}
// Players are the unit of inference (docs/reviews/2026-11-05-stats-methods-study.md §5.2, PR #580, docs/LEARNING.md "Real-answer
// replay"): the answers cluster in about ten players, so an interval that treats them as independent is too narrow.
// The sign-flip test over players: exact (every sign pattern) up to SIGN.exact players, else SIGN.draws seeded draws.
const SIGN = {exact: 16, draws: 9999, seed: 1};
function mulberry(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Two-sided sign-flip (randomisation) test of a zero mean over the values d (one per player): the share of sign
// patterns whose |sum| reaches the observed one; Monte Carlo p = (1 + hits) / (1 + draws), so it is never 0.
function signFlip(d, {exact = SIGN.exact, draws = SIGN.draws, seed = SIGN.seed} = {}) {
  const n = d.length,
    obs = Math.abs(d.reduce((t, x) => t + x, 0)),
    tol = 1e-12 * (1 + d.reduce((t, x) => t + Math.abs(x), 0)),
    flip = sgn => Math.abs(d.reduce((t, x, i) => t + (sgn(i) ? -x : x), 0)) >= obs - tol;
  if (!n) return {p: NaN, exact: true, draws: 0};
  if (n <= exact) {
    let hits = 0;
    for (let mask = 0; mask < 2 ** n; mask++) hits += flip(i => (mask >>> i) & 1);
    return {p: hits / 2 ** n, exact: true, draws: 2 ** n};
  }
  const r = mulberry(seed);
  let hits = 0;
  for (let k = 0; k < draws; k++) hits += flip(() => r() < 0.5);
  return {p: (1 + hits) / (1 + draws), exact: false, draws};
}
// Student's t quantile (two-sided 95%: tQuantile(0.975, df)) by bisection on its CDF, the regularised incomplete beta
// function (Numerical Recipes' continued fraction).
function lnGamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x,
    s = 1.000000000190015;
  c.forEach(v => (s += v / ++y));
  const t = x + 5.5;
  return Math.log((2.5066282746310005 * s) / x) - t + (x + 0.5) * Math.log(t);
}
function betaCf(a, b, x) {
  let c = 1,
    d = 1 - ((a + b) * x) / (a + 1);
  d = 1 / (Math.abs(d) < 1e-300 ? 1e-300 : d);
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    for (const aa of [(m * (b - m) * x) / ((a + m2 - 1) * (a + m2)), (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1))]) {
      d = 1 + aa * d;
      d = 1 / (Math.abs(d) < 1e-300 ? 1e-300 : d);
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      h *= d * c;
    }
    if (Math.abs(d * c - 1) < 1e-14) break;
  }
  return h;
}
function iBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betaCf(a, b, x)) / a : 1 - (bt * betaCf(b, a, 1 - x)) / b;
}
const tCdf = (t, df) => {
  const q = 0.5 * iBeta(df / (df + t * t), df / 2, 0.5);
  return t > 0 ? 1 - q : q;
};
function tQuantile(p, df) {
  let lo = 0,
    hi = 1e3;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (tCdf(mid, df) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
// Paired log-loss difference of rule b against rule a (the same answers, in the same order), only the answers keep(o)
// holds. Players are the unit: each player's own mean difference d_p, then their plain mean (each player one vote), its
// standard error over the players, a 95% t interval on players - 1 degrees of freedom and the sign-flip test's p over the
// players. The percentile cluster bootstrap was not chosen: with about ten players it under-covers (Cameron, Gelbach &
// Miller 2008), and a wild cluster bootstrap of a mean with Rademacher weights is this sign-flip test. answer: the
// former per-answer figure (mean over answers, which is the answer-weighted mean of the d_p, ± a standard error that
// treats the answers as independent), descriptive only.
function paired(a, b, keep = () => true, opt = {}) {
  const ll = o => -Math.log(o.y ? o.p : 1 - o.p),
    mean = l => l.reduce((t, x) => t + x, 0) / l.length,
    sdm = l => {
      const m = mean(l); // once, not per element (Codex review #583: quadratic on a large export)
      return Math.sqrt(l.reduce((t, x) => t + (x - m) ** 2, 0) / (l.length - 1) / l.length);
    },
    by = new Map(),
    d = [];
  a.scored.forEach((o, i) => {
    if (!keep(o)) return;
    const x = ll(b.scored[i]) - ll(o);
    d.push(x);
    if (!by.has(o.r.p)) by.set(o.r.p, []);
    by.get(o.r.p).push(x);
  });
  const n = d.length,
    am = mean(d),
    ase = sdm(d),
    dp = [...by.values()].map(mean),
    k = dp.length,
    m = mean(dp),
    se = k > 1 ? sdm(dp) : NaN,
    t = k > 1 ? tQuantile(0.975, k - 1) : NaN,
    sf = signFlip(dp, opt);
  return {
    n,
    players: k,
    d: m,
    se,
    lo: m - t * se,
    hi: m + t * se,
    p: sf.p,
    exact: sf.exact,
    answer: {d: am, se: ase, lo: am - 1.96 * ase, hi: am + 1.96 * ase}
  };
}
function score(list) {
  const n = list.length,
    ll = list.reduce((t, o) => t - (o.y ? Math.log(o.p) : Math.log(1 - o.p)), 0) / n,
    br = list.reduce((t, o) => t + (o.p - o.y) ** 2, 0) / n,
    mp = list.reduce((t, o) => t + o.p, 0) / n,
    my = list.reduce((t, o) => t + o.y, 0) / n;
  const lv = list.reduce((t, o) => t - (o.y ? Math.log(o.pl) : Math.log(1 - o.pl)), 0) / n;
  return {n, ll, br, mp, my, lv};
}

// Every rule on every player with min answers or more: {players, res: {rule: {all, groups, per}}, ref}.
// A variant with '*' is a family over grid (one list of values per '*'), scored by leave one player out (below).
function evaluate(raw, {variants = ['a', 'e'], min = 20, only = null, priors = null, grid = [[0.1, 0.2, 0.3, 0.5]]} = {}) {
const byPlayer = {};
normalise(raw).forEach(r => (byPlayer[r.p] = byPlayer[r.p] || []).push(r));
// Pooled confusions (+X/+Y/+Z): [offered together, mixed up] per pair, per player, so each player's own answers can be
// left out of their pooled score (core.js confusionOf's counts, without its trust filter).
const pc = {},
  pkey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
Object.entries(byPlayer).forEach(([p, L]) =>
  L.forEach(r =>
    String(r.ch || '')
      .split(/\s+/)
      .filter(x => x && x !== r.t)
      .forEach(x => {
        const k = pkey(r.t, x),
          c = ((pc[k] = pc[k] || {all: [0, 0]})[p] = pc[k][p] || [0, 0]);
        c[0]++;
        pc[k].all[0]++;
        if (!r.ok && r.a === x) (c[1]++, pc[k].all[1]++);
      })
  )
);
const prior = (a, b) => {
  if (priors && pkey(a, b) in priors) return priors[pkey(a, b)];
  const A = DATA.gen[a] || (DATA.x || {}).gen[a] || {},
    B = DATA.gen[b] || (DATA.x || {}).gen[b] || {};
  return (A.look || []).includes(b) || (B.look || []).includes(a) ? C.CONF.LOOK : A.fam && A.fam === B.fam ? C.CONF.FAM : C.CONF.FORM;
};
// The pooled score of a pair without the answers of the players named (the player replayed; in a leave-one-player-out
// fold, the player left out too).
const pooledFor = (...out) => (a, b) => {
  const k = pkey(a, b),
    c = pc[k] || {all: [0, 0]},
    n = [...new Set(out)].reduce((t, p) => [t[0] - (c[p] || [0, 0])[0], t[1] - (c[p] || [0, 0])[1]], c.all);
  return C.confScore(n, prior(a, b));
};
// Every player with min answers or more: the training population of a '*' family (leave one player out); --player
// (only) limits what is scored and shown, never who k is chosen on (Codex review #431).
const pool = Object.keys(byPlayer).filter(p => byPlayer[p].length >= min),
  players = pool.filter(p => !only || p === only);
const res = {},
  families = {};
variants = variants.flatMap(v => {
  if (!v.includes('*')) return [v];
  // One grid per '*', in order (the last one reused): every combination is a variant replayed.
  let out = [v];
  v.split('*')
    .slice(0, -1)
    .forEach((_, i) => {
      const g = grid[Math.min(i, grid.length - 1)];
      out = out.flatMap(x => g.map(n => x.replace('*', n)));
    });
  families[v] = out;
  return out;
});
variants = [...new Set(variants)];
variants.forEach(v => {
  // +W: a genus never answered starts from the full global level (core.js START.W 1 instead of 0.8; the shrinkage
  // M / (M + START.N) still fades with the answers).
  C.START.W = M.K.START.W = v.split('+').includes('W') ? 1 : W0;
  const all = [],
    per = {};
  players.forEach(p => {
    const {scored, P, plan} = replay(byPlayer[p], v, pooledFor(p));
    all.push(...scored);
    const gs = Object.keys(P).filter(g => g !== C.LEVEL && (P[g].ok || 0) + (P[g].ko || 0) > 0),
      w = gs.reduce((t, g) => t + P[g].ok + P[g].ko, 0);
    M.P = P;
    per[p] = {n: scored.length, level: (P[C.LEVEL] || {}).th, genus: gs.reduce((t, g) => t + (P[g].ok + P[g].ko) * plan(g), 0) / (w || 1), ...score(scored)};
  });
  C.START.W = M.K.START.W = W0;
  res[v] = {all: score(all), groups: groupScores(all), per};
  Object.defineProperty(res[v], "scored", {value: all}); // every scored answer, for paired comparisons (not in --json)
});
// A family with '*' (e.g. e+X+M+T*): each value of its grid replayed, the value chosen for each player by leave one
// player out (the lowest log-loss on the other players' answers), so the score is never fitted on the answers scored.
// Each training player is replayed again for each fold, its pooled mix-up scores without the answers of the player left
// out (the app's own term, appTerm, and +X read them), so the outcomes scored never reach the choice (Codex review
// #431). A player with no answer scored (only answers logged before sheet v5) weighs nothing (foldLoss 0).
const foldLoss = (q, v, p) => {
  C.START.W = M.K.START.W = v.split('+').includes('W') ? 1 : W0;
  const {scored} = replay(byPlayer[q], v, pooledFor(q, p));
  C.START.W = M.K.START.W = W0;
  return scored.length ? score(scored).ll * scored.length : 0;
};
Object.keys(families).forEach(F => {
  const vs = families[F],
    picks = {},
    per = {},
    train = {},
    all = [];
  players.forEach(p => {
    train[p] = {};
    const best = vs.reduce((b, v) => {
      const t = pool.filter(q => q !== p).reduce((a, q) => a + foldLoss(q, v, p), 0);
      train[p][v] = t;
      return t < b[1] - 1e-12 ? [v, t] : b;
    }, [null, Infinity])[0];
    picks[p] = best || vs[0];
    per[p] = res[picks[p]].per[p];
  });
  // In the order of the other rules' scored answers (player by player), so paired differences line up.
  players.forEach(p => all.push(...res[picks[p]].scored.filter(o => o.r.p === p)));
  res[F] = {all: score(all), groups: groupScores(all), per, picks, train};
  Object.defineProperty(res[F], 'scored', {value: all});
});
// Static reference per player (variant-independent).
const ref = {};
players.forEach(p => {
  const obs = [];
  byPlayer[p].forEach(r => {
    const e = num(r.e),
      th0 = num(r.th),
      k = kOf(r.mode, r.ch),
      g = guess(k);
    if (!isFinite(e) || !isFinite(th0)) return;
    obs.push({g: r.t, y: r.ok, k, d: th0 - logit(Math.min(0.995, Math.max(0.005, (e - g) / (1 - g))))});
  });
  const glob = mle(obs),
    G = {};
  obs.forEach(o => (G[o.g] = G[o.g] || []).push(o));
  const w = obs.length;
  ref[p] = {global: glob, genus: Object.values(G).reduce((t, l) => t + l.length * mle(l, [glob, 1]), 0) / (w || 1)};
});
return {players, res, ref, byPlayer};
}
const groupsOf = (res, variants) => [...new Set(variants.flatMap(v => Object.keys(res[v].groups)))].sort();
// --rtfit: the logistic term b of x on y on top of the prediction p (offset logit p, with an intercept a, which takes
// up a prediction running low or high overall, as PR #431 fitted it), with its standard error.
function logitTerm(obs) {
  let a = 0,
    b = 0,
    Hbb = 1,
    Haa = 1,
    Hab = 0;
  for (let it = 0; it < 50; it++) {
    let Ga = 0,
      Gb = 0;
    Haa = Hab = Hbb = 0;
    obs.forEach(({y, p, x}) => {
      const q = sig(logit(Math.min(0.999, Math.max(0.001, p))) + a + b * x),
        w = q * (1 - q);
      Ga += y - q;
      Gb += (y - q) * x;
      Haa += w;
      Hab += w * x;
      Hbb += w * x * x;
    });
    const det = Haa * Hbb - Hab * Hab;
    a += (Hbb * Ga - Hab * Gb) / det;
    b += (Haa * Gb - Hab * Ga) / det;
  }
  return {a, b, se: Math.sqrt(Haa / (Haa * Hbb - Hab * Hab)), n: obs.length};
}
// z against each player's median over all their timed answers (not typed), as PR #431 measured; per scored answer.
function rtFit(scored) {
  const by = {};
  scored.forEach(o => isFinite(o.r.sec) && o.r.sec > 0 && isFinite(o.k) && (by[o.r.p] = by[o.r.p] || []).push(Math.log(o.r.sec)));
  const med = Object.fromEntries(Object.entries(by).map(([p, l]) => [p, median(l)])),
    zOf = o => (isFinite(o.r.sec) && o.r.sec > 0 && isFinite(o.k) ? Math.log(o.r.sec) - med[o.r.p] : null),
    own = [],
    next = [],
    last = {};
  scored.forEach(o => {
    const z = zOf(o),
      key = o.r.p + '|' + o.r.t;
    if (z !== null) own.push({y: o.y, p: o.p, x: z});
    if (last[key] !== undefined && last[key] !== null) next.push({y: o.y, p: o.p, x: last[key]});
    last[key] = o.y && z !== null ? z : null;
  });
  return {own: logitTerm(own), next: logitTerm(next)};
}
module.exports = {evaluate, normalise, kOf, groupsOf, paired, signFlip, tQuantile, SIGN, GAME, useModel, RT, rtFit};
if (require.main === module) {
const args = process.argv.slice(2),
  opt = (k, d) => {
    const i = args.indexOf('--' + k);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
  },
  file = args.find((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--')));
if (!file) {
  console.error(
    'usage: node tools/abilityeval.js answers.json [--variants a,b,c,d,e] [--player <name>] [--min 20] [--json out.json]\n' +
      'Paired log-loss differences against the first rule: players are the unit (mean of the players\' own means, 95% t\n' +
      'interval on players - 1 df, sign-flip p over players); the per-answer figure is descriptive only (see the header).'
  );
  process.exit(1);
}
const VARIANTS = opt('variants', 'a,b,c,d,e,e+L').split(','),
  ONLY = opt('player', null),
  MIN = Number(opt('min', 20)),
  OUT = opt('json', null),
  PRIORS = opt('priors', null) ? JSON.parse(fs.readFileSync(opt('priors', null), 'utf8')) : null,
  GRID = opt('grid', '0,0.25,0.5,1,1.5,2')
    .split(';')
    .map(l => l.split(',').map(Number));
if (opt('cf-from', null)) CF_FROM = timeOf(opt('cf-from', null));
if (opt('model', null)) useModel(path.resolve(opt('model', null)));
  const J = JSON.parse(fs.readFileSync(file, 'utf8')),
  {players, res, ref, byPlayer} = evaluate(Array.isArray(J) ? J : J.rows || J.values || [], {variants: VARIANTS, min: MIN, only: ONLY, priors: PRIORS, grid: GRID});
const f = (x, n = 3) => (typeof x === 'number' && isFinite(x) ? x.toFixed(n) : '-');
console.log(`Players with ${MIN}+ answers: ${players.length}; answers scored: ${res[VARIANTS[0]].all.n}`);
console.log('\nNext-answer prediction (log-loss, Brier; lower is better):');
console.log('rule      log-loss  Brier   mean p  right  (global level alone as the predictor: log-loss)');
VARIANTS.forEach(v => {
  const s = res[v].all;
  console.log(`${v.padEnd(9)} ${f(s.ll).padStart(8)} ${f(s.br).padStart(6)} ${f(s.mp, 2).padStart(7)} ${f(s.my, 2).padStart(6)}  ${f(s.lv)}`);
});
// Every group any rule reached (a rule with +L has its own level bands); a group a rule never reached shows '-'.
const G0 = groupsOf(res, VARIANTS),
  nOf = G => (VARIANTS.map(v => res[v].groups[G]).find(Boolean) || {}).n;
console.log('\nCalibration by group: mean predicted / right, log-loss (answers: ' + G0.map(G => G + ' ' + nOf(G)).join(', ') + ')');
console.log('group'.padEnd(20) + VARIANTS.map(v => v.padEnd(18)).join(''));
G0.forEach(G =>
  console.log(
    `${G.padEnd(20)}` +
      VARIANTS.map(v => {
        const s = res[v].groups[G];
        return (s ? `${f(s.mp, 2)}/${f(s.my, 2)} ${f(s.ll, 3)}` : '-').padEnd(18);
      }).join('')
  )
);
console.log('\nPer player at the end: global level, mean genus ability (answer-weighted); log-loss');
console.log('player'.padEnd(20) + '  n  ' + VARIANTS.map(v => (v + ' lvl/genus/ll').padEnd(19)).join('') + 'static fit global/genus');
players
  .sort((x, y) => byPlayer[y].length - byPlayer[x].length)
  .forEach(p =>
    console.log(
      `${p.slice(0, 18).padEnd(18)} ${String(res[VARIANTS[0]].per[p].n).padStart(4)}  ` +
        VARIANTS.map(v => `${f(res[v].per[p].level, 2)}/${f(res[v].per[p].genus, 2)}/${f(res[v].per[p].ll, 3)}`.padEnd(19)).join('') +
        `${f(ref[p].global, 2)}/${f(ref[p].genus, 2)}`
    )
  );
VARIANTS.filter(v => res[v].picks).forEach(v =>
  console.log(`\n${v}, value chosen for each player on the others: ` + players.map(p => `${p.slice(0, 18)} ${res[v].picks[p]}`).join(', '))
);
if (VARIANTS.length > 1) {
  const rows = ['all', ...G0].map(G => {
    const keep = G === 'all' ? () => true : o => groupScores([o])[G];
    return [G, VARIANTS.slice(1).map(v => paired(res[VARIANTS[0]], res[v], keep))];
  });
  const sg = x => (typeof x === 'number' && isFinite(x) ? (x > 0 ? '+' : '') + x.toFixed(3) : '-'),
    pv = q => (isFinite(q.p) ? (q.p < 0.001 ? '<0.001' : q.p.toFixed(3)) : '-');
  console.log(
    `\nPaired log-loss difference against ${VARIANTS[0]} (negative: better), players as the unit: the mean of the players' own ` +
      `mean differences (each player one vote) [95% t interval, players - 1 df], p of the sign-flip test over the players ` +
      `(exact up to ${SIGN.exact} players, else ${SIGN.draws} seeded draws), (players). The 'all' row is the primary measure; ` +
      `the group rows are exploratory (many rows, no correction):`
  );
  console.log('group'.padEnd(20) + VARIANTS.slice(1).map(v => v.padEnd(42)).join(''));
  rows.forEach(([G, qs]) =>
    console.log(
      G.padEnd(20) +
        qs.map(q => (q.n ? `${sg(q.d)} [${sg(q.lo)}, ${sg(q.hi)}] p ${pv(q)} (${q.players})` : '-').padEnd(41) + ' ').join('')
    )
  );
  console.log(
    `\nPer answer, descriptive only (mean over the answers ± a standard error [95%] that treats them as independent: ` +
      `too narrow when the players differ):`
  );
  console.log('group'.padEnd(20) + VARIANTS.slice(1).map(v => v.padEnd(34)).join(''));
  rows.forEach(([G, qs]) =>
    console.log(
      G.padEnd(20) +
        qs.map(({n, answer: q}) => (n ? `${f(q.d, 4)} ± ${f(q.se, 4)} [${f(q.lo, 3)}, ${f(q.hi, 3)}]` : '-').padEnd(33) + ' ').join('')
    )
  );
}
if (args.includes('--rtfit')) {
  const q = rtFit(res[VARIANTS[0]].scored),
    t = x => `${f(x.b, 2)} ± ${f(x.se, 2)} (${x.n} answers)`;
  console.log(`\nResponse time against ${VARIANTS[0]}'s expectation (logistic term per unit of z): on the answer itself ${t(q.own)}; ` +
    `the z of a genus's last own answer, right, on its next one ${t(q.next)}`);
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify({res, ref}, null, 1));
}
