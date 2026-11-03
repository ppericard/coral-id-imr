// Per-genus ability on real answers (2026-11-03): replays the answer log, player by player in time order, with the
// app's own Elo (model.js ELO, ability, abilityStep, run here on stubs; core.js playerStart, levelSeed) under several
// rules for the genus wrongly given (AGENTS.md rule 13), and scores how well each rule predicts the next answer.
// Offline, reads a file, sends nothing (docs/LEARNING.md "The genus wrongly given in the Elo").
//
//   node tools/abilityeval.js answers.json [--variants a,e,e+L] [--player <name or id>] [--min 20] [--json out.json]
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
// then. Per player: the global level and the answer-weighted mean ability of the genera answered at the end, and, as a
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
  GAME = new Set([...Object.keys(DATA.gen || {}), ...C.BONUS]);

// model.js's ELO, ability and abilityStep, as the app runs them (P is this context's global, set per player).
function model() {
  const src = fs.readFileSync(path.join(ROOT, 'model.js'), 'utf8'),
    pick = (a, b) => src.slice(src.indexOf(a), src.indexOf(b)),
    ctx = {P: {}, playerStart: C.playerStart, LEVEL: C.LEVEL, sig: x => 1 / (1 + Math.exp(-x))};
  vm.createContext(ctx);
  vm.runInContext(pick('const ELO =', '// For My progress') + '\nthis.M = {ELO, ability, abilityStep};', ctx);
  return ctx;
}
const M = model(),
  KMIN = M.M.ELO.kmin,
  W0 = C.START.W;
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

// Rows, normalised: readAnswers' rows sorted by time (stable), the sheet's tab in its own order (it appends in time
// order; its times are to the minute).
function normalise(raw) {
  raw = raw.filter(r => r && r[0] && r[0] !== 'Name');
  if (raw.length && typeof raw[0][1] === 'number') raw = raw.map((r, i) => [r, i]).sort((x, y) => x[0][1] - y[0][1] || x[1] - y[1]).map(x => x[0]);
  return raw.map((r, i) =>
    typeof r[1] === 'number'
      ? {p: r[0], i, t: r[2], a: r[3], ok: Number(r[4]) ? 1 : 0, mode: r[5], e: r[7], th: r[8], ch: r[10]}
      : {p: r[0], i, t: r[2], a: r[3], ok: String(r[4]) === '1' ? 1 : 0, mode: r[5], e: r[8], th: r[9], ch: r[11]}
  );
}
const num = x => (x === '' || x === null || x === undefined ? NaN : Number(x));

// One player's replay under one rule. Returns the scored answers and the final model.
function replay(list, variant) {
  const [v, ...flags] = variant.split('+'),
    P = {};
  M.P = P;
  const st = g => (P[g] = P[g] || {ok: 0, ko: 0}),
    off = {}, // rule d: genus offsets from the level
    fa = new Set(), // genera wrongly given since their own last question (a false alarm on them)
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
    const d = th0 - logit(Math.min(0.995, Math.max(0.005, (e - g) / (1 - g)))),
      good = r.ok === 1,
      L = (P[C.LEVEL] || {}).th || 0,
      th = plan(r.t);
    scored.push({y: good ? 1 : 0, p: g + (1 - g) * sig(th - d), pl: g + (1 - g) * sig(L - d), k, L, mode: r.mode, fa: fa.has(r.t)});
    fa.delete(r.t);
    const s = st(r.t);
    if (good) s.ok++;
    else s.ko++;
    if (v === 'd') offStep(r.t, s, good, d, k);
    else M.M.abilityStep(r.t, s, good, d, k);
    if (P[C.LEVEL]) P[C.LEVEL][good ? 'ok' : 'ko']++;
    else P[C.LEVEL] = C.levelSeed(P);
    // +L: the global level's step without the floor ELO.kmin (its K keeps shrinking with the answers, Pelánek's
    // uncertainty function; the volatility still lets it catch up with a lasting change).
    if (flags.includes('L')) M.M.ELO.kmin = 0;
    M.M.abilityStep(C.LEVEL, P[C.LEVEL], good, d, k);
    M.M.ELO.kmin = KMIN;
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
function evaluate(raw, {variants = ['a', 'e'], min = 20, only = null} = {}) {
const byPlayer = {};
normalise(raw).forEach(r => (byPlayer[r.p] = byPlayer[r.p] || []).push(r));
const players = Object.keys(byPlayer).filter(p => (!only || p === only) && byPlayer[p].length >= min);
const res = {};
variants.forEach(v => {
  // +W: a genus never answered starts from the full global level (core.js START.W 1 instead of 0.8; the shrinkage
  // M / (M + START.N) still fades with the answers).
  C.START.W = v.split('+').includes('W') ? 1 : W0;
  const all = [],
    per = {};
  players.forEach(p => {
    const {scored, P, plan} = replay(byPlayer[p], v);
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
module.exports = {evaluate, normalise, kOf};
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
  OUT = opt('json', null);
const J = JSON.parse(fs.readFileSync(file, 'utf8')),
  {players, res, ref, byPlayer} = evaluate(Array.isArray(J) ? J : J.rows || J.values || [], {variants: VARIANTS, min: MIN, only: ONLY});
const f = (x, n = 3) => (typeof x === 'number' && isFinite(x) ? x.toFixed(n) : '-');
console.log(`Players with ${MIN}+ answers: ${players.length}; answers scored: ${res[VARIANTS[0]].all.n}`);
console.log('\nNext-answer prediction (log-loss, Brier; lower is better):');
console.log('rule      log-loss  Brier   mean p  right  (global level alone as the predictor: log-loss)');
VARIANTS.forEach(v => {
  const s = res[v].all;
  console.log(`${v.padEnd(9)} ${f(s.ll).padStart(8)} ${f(s.br).padStart(6)} ${f(s.mp, 2).padStart(7)} ${f(s.my, 2).padStart(6)}  ${f(s.lv)}`);
});
const G0 = Object.keys(res[VARIANTS[0]].groups).sort();
console.log('\nCalibration by group: mean predicted / right, log-loss (answers: ' + G0.map(G => G + ' ' + res[VARIANTS[0]].groups[G].n).join(', ') + ')');
console.log('group'.padEnd(20) + VARIANTS.map(v => v.padEnd(18)).join(''));
G0.forEach(G =>
  console.log(
    `${G.padEnd(20)}` +
      VARIANTS.map(v => {
        const s = res[v].groups[G];
        return `${f(s.mp, 2)}/${f(s.my, 2)} ${f(s.ll, 3)}`.padEnd(18);
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
