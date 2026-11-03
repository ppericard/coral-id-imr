// Per-genus ability on real answers (2026-11-03): replays the answer log, player by player in time order, with the
// app's own Elo (model.js ELO, ability, abilityStep, run here on stubs; core.js playerStart, levelSeed) under several
// rules for the genus wrongly given (AGENTS.md rule 13), and scores how well each rule predicts the next answer.
// Offline, reads a file, sends nothing (docs/LEARNING.md "The genus wrongly given in the Elo").
//
//   node tools/abilityeval.js answers.json [--variants a,e,e+L] [--player <name or id>] [--min 20] [--json out.json]
//                             [--priors priors.json]
//                             [--model other/model.js]
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
//      is a distractor); rule 13 stays in the progress (the app since 2026-11-03)
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

// model.js's ELO, ability and abilityStep, as the app runs them (P is this context's global, set per player).
// --model <file>: another model.js (e.g. main's, from git show) to compare the same rules on two versions of the app.
function model(file = path.join(ROOT, 'model.js')) {
  const src = fs.readFileSync(file, 'utf8'),
    pick = (a, b) => src.slice(src.indexOf(a), src.indexOf(b)),
    ctx = {P: {}, playerStart: C.playerStart, LEVEL: C.LEVEL, START: C.START, sig: x => 1 / (1 + Math.exp(-x))};
  vm.createContext(ctx);
  vm.runInContext(pick('const ELO =', '// For My progress') + '\nthis.M = {ELO, ability, abilityStep};', ctx);
  return ctx;
}
let M = model(),
  KMIN = M.M.ELO.kmin;
const W0 = C.START.W;
// Replays with another model.js from now on (the CLI's --model, tests).
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
// The app logs its own confusion term inside e from the release of the known mix-ups (PR #425; the log's clock, as the
// sheet tab writes it, Asia/Taipei): before it, e has none. --cf-from moves it.
let CF_FROM = timeOf('2026-11-04 02:00');
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
      ? {p: r[0], i, t: r[2], at: timeOf(r[1]), a: r[3], ok: Number(r[4]) ? 1 : 0, mode: r[5], e: r[7], th: r[8], ch: r[10]}
      : {p: r[0], i, t: r[2], at: timeOf(r[1]), a: r[3], ok: String(r[4]) === '1' ? 1 : 0, mode: r[5], e: r[8], th: r[9], ch: r[11]}
  );
}
const num = x => (x === '' || x === null || x === undefined ? NaN : Number(x));

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
// One player's replay under one rule. Returns the scored answers and the final model.
function replay(list, variant, pooledOf = null) {
  const [v, ...flags] = variant.split('+'),
    P = {};
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
    scored.push({y: good ? 1 : 0, p: g + (1 - g) * sig(th - d0 - cf), cf, pl: g + (1 - g) * sig(L - d), k, L: L0.th, mode: r.mode, fa: fa.has(r.t)});
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
    if (v === 'd') offStep(r.t, s, good, d, k);
    else M.M.abilityStep(r.t, s, good, d, k);
    if (P[C.LEVEL]) P[C.LEVEL][good ? 'ok' : 'ko']++;
    else P[C.LEVEL] = C.levelSeed(P);
    // The level bands come from a reference level stepped by one fixed rule (refStep), whatever the model (--model)
    // or the rule replayed, so every run puts the same answers in each band (Codex review #415).
    if (!L0.seeded) Object.assign(L0, {ok: P[C.LEVEL].ok, ko: P[C.LEVEL].ko, th: P[C.LEVEL].th, seeded: 1});
    else L0[good ? 'ok' : 'ko']++;
    refStep(L0, good, d0, k); // d0: the same difficulty whatever the rule, so every rule's bands hold the same answers (Codex review #425)
    // +L: the global level's step without the floor ELO.kmin (its K keeps shrinking with the answers, Pelánek's
    // uncertainty function; the volatility still lets it catch up with a lasting change).
    // +V: the level's step without the volatility boost (ELO.vg), so a run of misses does not speed its fall.
    const VG = M.M.ELO.vg;
    if (flags.includes('L')) M.M.ELO.kmin = 0;
    if (flags.includes('V')) M.M.ELO.vg = 0;
    M.M.abilityStep(C.LEVEL, P[C.LEVEL], good, d, k);
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
  fGroup = o => (o.k !== 2 ? null : /^quiz-duel/.test(o.mode) ? '2: Duel tab' : /\|d/.test(o.mode) ? '2: quiz duel' : '2: quiz');
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
function evaluate(raw, {variants = ['a', 'e'], min = 20, only = null, priors = null} = {}) {
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
const pooledFor = p => (a, b) => {
  const k = pkey(a, b),
    c = pc[k] || {all: [0, 0]},
    own = c[p] || [0, 0];
  return C.confScore([c.all[0] - own[0], c.all[1] - own[1]], prior(a, b));
};
const players = Object.keys(byPlayer).filter(p => (!only || p === only) && byPlayer[p].length >= min);
const res = {};
variants.forEach(v => {
  // +W: a genus never answered starts from the full global level (core.js START.W 1 instead of 0.8; the shrinkage
  // M / (M + START.N) still fades with the answers).
  C.START.W = v.split('+').includes('W') ? 1 : W0;
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
  const groups = {};
  // 'after a false alarm': a genus's first own question after it was given wrongly for another genus.
  all.forEach(o =>
    [kGroup(o), lGroup(o), fGroup(o), o.fa ? 'after a false alarm' : null].forEach(G => G && (groups[G] = groups[G] || []).push(o))
  );
  C.START.W = W0;
  res[v] = {all: score(all), groups: Object.fromEntries(Object.entries(groups).map(([G, l]) => [G, score(l)])), per};
  Object.defineProperty(res[v], "scored", {value: all}); // every scored answer, for paired comparisons (not in --json)
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
module.exports = {evaluate, normalise, kOf, groupsOf, GAME, useModel};
if (require.main === module) {
const args = process.argv.slice(2),
  opt = (k, d) => {
    const i = args.indexOf('--' + k);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
  },
  file = args.find((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--')));
if (!file) {
  console.error('usage: node tools/abilityeval.js answers.json [--variants a,b,c,d,e] [--player <name>] [--min 20] [--json out.json]');
  process.exit(1);
}
const VARIANTS = opt('variants', 'a,b,c,d,e,e+L').split(','),
  ONLY = opt('player', null),
  MIN = Number(opt('min', 20)),
  OUT = opt('json', null),
  PRIORS = opt('priors', null) ? JSON.parse(fs.readFileSync(opt('priors', null), 'utf8')) : null;
if (opt('cf-from', null)) CF_FROM = timeOf(opt('cf-from', null));
if (opt('model', null)) useModel(path.resolve(opt('model', null)));
  const J = JSON.parse(fs.readFileSync(file, 'utf8')),
  {players, res, ref, byPlayer} = evaluate(Array.isArray(J) ? J : J.rows || J.values || [], {variants: VARIANTS, min: MIN, only: ONLY, priors: PRIORS});
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
if (OUT) fs.writeFileSync(OUT, JSON.stringify({res, ref}, null, 1));
}
