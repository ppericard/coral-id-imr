// Q316's two side checks on the real log (tools/studies/q316/README.md), read-only, each with its decision rule declared
// here before any real run (RULES, printed at the head of every run):
//   2B  the step-2 candidates against today's engine: replayed online over the log, every answer scored before it moves
//       anything, the players the unit; the SDs of the candidates come from fit.py on the other half of the players.
//   2C  Q136: is the app's per-unit ability centred across players? (the app's own delta, the corals; descriptive)
//
//   node tools/studies/q316/checks.js <export.json> <out.json> --fit fit.json --fitA a.json --fitB b.json
//                                     [--stats stats.json] [--deadline <epoch s>]
//
// export.json: prep.js's. fit.json: fit.py on every player (the offline reference D(u)); a.json, b.json: fit.py --half A
// and --half B. stats.json (optional): the ?stats=1 reply saved with the log; the replay's end-of-log unit offsets are
// compared with its gd (a sanity check: they should be close, not equal, as the sheet leaves out the players the admin
// excluded and was read later). Writes out.json (outside the repository), prints aggregates and P1, P2... labels only.
//
// The arms (each the item side only; the same person term, memory, mix-ups and format terms score every arm):
//   1 live      the sheet's pass on the answers before (core.js eloOf and genusOffsetsOf, as ?stats=1 serves them: the
//               corals by genus, the fish per rank, unit ids f:, g:, s:), read as model.js photoDiff reads it (the unit
//               asked's offset, the judged ease's prior, PDIFF.W 5 answers).
//   2 shared    the review's Kalman / TrueSkill split (docs/reference/lit-componential-difficulty.md section 5): each
//               component on the question's path (family, genus, species, each photo) a mean and a variance (its level's
//               SD from the other half's fit, squared), the rank offset and the ease weight from that fit; the surprise
//               split by the variances; the item rated against the sheet's chain (PLAYER0, K 0.6 / (1 + n/40)).
//   3 sibling   2 plus the genus term asked at genus and species rank, only when the fit has it (fit.py --sibling) with
//               its SD's 95% interval above SIB_MIN and its acceptance passed.
//   4b, 4c      2 with the item rated against the chain + the app's delta (unit ability - global level, #637), and
//               against the chain + the centred delta (delta minus the unit's running mean over players, one vote each).
// The person term: the app's unit ability replayed per player (core.js scoreAnswer, as tools/studies/q351/refit.js
// replays it, from each answer's scoring record, else its logged expected and ability), before the answer.
const fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');
const C = require(path.join(ROOT, 'core.js'));
const {signFlip} = require(path.join(ROOT, 'tools', 'abilityeval.js'));

// ---- Declared before any real run (the README repeats them; tests/q316.test.js checks they agree).
const RULES = {
  primary: 'fish answers whose photos each had fewer than 3 earlier trusted answers: next-answer log-loss, arm 2 against arm 1',
  pnMax: 3, // "fewer than 3 earlier trusted answers"
  minPlayers: 6, // fewer players with minAnswers primary answers: "the measure cannot tell", no test
  minAnswers: 20,
  alpha: 0.05, // exact two-sided sign-flip over the players (abilityeval.js signFlip)
  compressionMin: 20, // units with 20 or more answers enter the compression slope
  sibMin: 0.05, // arm 3 runs only when the sibling SD's 95% interval is above this
  centring: {
    after: 5, // a delta counts from the player's 6th answer on the unit (playerStart pins the start)
    minPlayers: 3, // a unit counts with 3 or more such players
    minUnits: 8, // fewer units: the measure cannot tell
    perms: 10000, // permutation p over units, seeded
    alpha: 0.05,
    rule: 'clearly negative = Spearman of m_u with the live gd below 0 at permutation p < 0.05, and below 0 in both halves of the players\' order of meeting units'
  },
  bands: [-Infinity, 0, 1, 2, Infinity] // the player's replayed global level, for the calibration table
};
const CANNOT = 'the measure cannot tell';
const sig = x => 1 / (1 + Math.exp(-x)),
  logit = p => Math.log(p / (1 - p)),
  clamp = (x, a, b) => Math.min(b, Math.max(a, x)),
  mean = l => (l.length ? l.reduce((t, x) => t + x, 0) / l.length : NaN);

class Cut extends Error {}
function clock(deadline) {
  return () => {
    if (deadline && Date.now() / 1000 > deadline) throw new Cut();
  };
}

// A seeded generator (mulberry32), so a permutation p is the same on every run.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- The person side: each player's app replay (unit ability and global level before each answer).
function persons(rows) {
  const by = new Map();
  rows.forEach((r, i) => (by.has(r.p) ? by.get(r.p) : by.set(r.p, []).get(r.p)).push(i));
  const th = new Array(rows.length).fill(null),
    lvl = new Array(rows.length).fill(null);
  by.forEach(list => {
    const P = {};
    list.forEach(i => {
      const r = rows[i],
        k = r.k == null ? Infinity : r.k;
      let d0 = r.d0;
      if (d0 == null && isFinite(r.e) && isFinite(r.th) && r.e != null && r.th != null && k > 1)
        d0 = r.th - logit(clamp((r.e - r.g) / (1 - r.g), 0.005, 0.995)) - (r.mem || 0);
      const L = P[C.LEVEL] && typeof P[C.LEVEL].th === 'number' ? P[C.LEVEL].th : null;
      const res = C.scoreAnswer(P, {
        t: r.u,
        c: r.c,
        ok: !!r.y,
        k,
        chs: r.chs,
        ph: r.ph,
        cv: false,
        p: 0,
        sec: isFinite(r.sec) && r.sec != null ? r.sec : null,
        timed: true,
        rt: d0 != null,
        d0: d0 == null ? null : d0,
        fam: r.mem,
        cf: r.cf,
        R: r.R,
        df: r.df,
        S: r.Sl,
        look: false,
        dom: true
      });
      if (d0 != null && typeof res.th0 === 'number') {
        th[i] = res.th0;
        lvl[i] = L;
      }
    });
  });
  return {th, lvl};
}

// ---- The item side, arm 1: the sheet's pass on the answers before, read as photoDiff.
const PW = 5; // model.js PDIFF.W
function liveArm(rows, tick) {
  const out = new Array(rows.length).fill(null),
    eloRow = r => [r.p, r.t, r.u, r.c, r.y, r.mode, r.ph.join(' '), r.e, r.th, null, r.chs.join(' '), 0];
  const ER = rows.map(eloRow);
  // the sheet's ?stats=1 photos and gd on the answers before (core.js eloOf, genusOffsetsOf: its eloReplay), refreshed
  // at each new answer time
  let V = {photos: {}, gd: {}},
    at = -1;
  rows.forEach((r, i) => {
    if (i && r.t !== at) {
      tick();
      const before = ER.slice(0, i);
      V = {photos: C.eloOf(before), gd: C.genusOffsetsOf(before)};
      at = r.t;
    }
    const gd = n => (V.gd[n] ? V.gd[n][0] : 0);
    // model.js photoDiff: the rating with the unit asked's offset swapped in, blended with the prior by its answers
    const ds = r.ph.map((f, j) => {
      const prior = gd(r.u) + r.ez[j] * r.ezK,
        o = V.photos[f];
      if (!o) return prior;
      const d = o[4] && o[4] !== r.u ? o[0] - gd(o[4]) + gd(r.u) : o[0];
      return (o[1] * d + PW * prior) / (o[1] + PW);
    });
    out[i] = mean(ds) + r.solo;
  });
  return {d: out, unit: Object.fromEntries(Object.entries(C.genusOffsetsOf(ER)).map(([u, g]) => [u, g[0]]))};
}

// ---- Arms 2-4: the shared chain with a Kalman split. sd: the level SDs; fx: the rank offsets and the ease weight;
// person: 'chain' (2, 3), 'delta' (4b), 'centred' (4c); sib: the sibling term (3).
function sharedArm(rows, sd, fx, opt = {}) {
  const m = {},
    v = {},
    R = {},
    n = {},
    dl = {},
    out = new Array(rows.length).fill(null),
    who = opt.person || 'chain';
  const comps = r => {
    const L = [];
    if (r.F && sd.fam != null) L.push(['F:' + r.F, sd.fam, 1, 0]);
    if (r.G) L.push(['G:' + r.G, sd.gen != null ? sd.gen : sd.gs, 1, 0]);
    if (r.S && (sd.sp != null || sd.gs != null)) L.push(['S:' + r.S, sd.sp != null ? sd.sp : sd.gs, 1, 0]);
    if (opt.sib && r.G && (r.rk === 'genus' || r.rk === 'species')) L.push(['C:' + r.G, sd.sib, 1, 0]);
    r.ph.forEach((f, j) => L.push(['I:' + f, sd.photo, 1 / r.ph.length, (fx.kappa || 0) * r.ez[j]]));
    return L;
  };
  const rank = r => (r.rk === 'genus' ? fx.r_genus || 0 : r.rk === 'species' ? fx.r_species || 0 : 0);
  rows.forEach((r, i) => {
    const L = comps(r);
    L.forEach(([c, s, , m0]) => {
      if (!(c in m)) {
        m[c] = m0;
        v[c] = s * s;
      }
    });
    const b = rank(r) + L.reduce((t, [c, , a]) => t + a * m[c], 0) + r.solo;
    out[i] = b;
    const ra = (R[r.p] = R[r.p] == null ? C.PLAYER0 : R[r.p]),
      nn = n[r.p] || 0;
    let theta = ra;
    if (who !== 'chain' && opt.delta && opt.delta[i] != null) {
      let dlt = opt.delta[i];
      if (who === 'centred') {
        // the unit's running mean over players: each player's latest delta on it, one vote each, before this answer
        const U = (dl[r.u] = dl[r.u] || new Map());
        dlt -= U.size ? mean([...U.values()]) : 0;
        U.set(r.p, opt.delta[i]);
      }
      theta += dlt;
    }
    const s = sig(theta - b - r.mem - r.cf + r.df),
      e = r.g + (1 - r.g) * s,
      d = r.y - e,
      ee = Math.max(1e-6, e * (1 - e));
    if (r.tr) {
      const w = nn / (nn + C.PHOTO_W.N),
        a = ((1 - r.g) * s * (1 - s)) / ee,
        h = ((1 - r.g) * s * (1 - s)) ** 2 / ee,
        Vt = L.reduce((t, [c, , aa]) => t + aa * aa * v[c], 0),
        den = 1 + w * Vt * h;
      L.forEach(([c, , aa]) => {
        m[c] -= (w * aa * v[c] * a * d) / den;
        v[c] -= (w * aa * aa * v[c] * v[c] * h) / den;
      });
    }
    // the sheet's chain: every answer moves it (eloReplay's rule), against this arm's expectation
    R[r.p] = ra + (0.6 / (1 + nn / 40)) * (r.y - (r.g + (1 - r.g) * sig(ra - b - r.mem - r.cf + r.df)));
    n[r.p] = nn + 1;
  });
  return {d: out, m};
}

// A unit's difficulty from component means (fish: rank offset + family + genus + species down to the unit; corals: the
// genus), its path read from the rows that asked it.
function unitD(rows, get, fx) {
  const path = {};
  rows.forEach(r => (path[r.u] = path[r.u] || r));
  const out = {};
  Object.entries(path).forEach(([u, r]) => {
    const rk = r.rk;
    let x = rk === 'genus' && r.S ? fx.r_genus || 0 : rk === 'species' ? fx.r_species || 0 : 0;
    if (r.S) {
      x += get('fam', r.F);
      if (rk !== 'family') x += get('gen', r.G);
      if (rk === 'species') x += get('sp', r.S);
    } else x += get('gen', r.G);
    out[u] = x;
  });
  return out;
}

function slope(xs, ys) {
  const mx = mean(xs),
    my = mean(ys);
  let sxy = 0,
    sxx = 0;
  xs.forEach((x, i) => ((sxy += (x - mx) * (ys[i] - my)), (sxx += (x - mx) ** 2)));
  return sxx ? sxy / sxx : NaN;
}

// ---- Scores and the declared tests.
const ll = (p, y) => -Math.log(clamp(y ? p : 1 - p, 1e-9, 1));
function predict(r, th, d) {
  return r.g + (1 - r.g) * r.R * sig(r.Sl * (th - (d + r.mem + r.cf) + r.df));
}

// The paired test with the players as the unit: d_p, a player's mean log-loss difference (b - a) over the answers kept;
// players with fewer than minAnswers left out; fewer than minPlayers left: the measure cannot tell. names: what a and b
// are, for the verdict ("b better than a").
function pairedTest(rows, keep, la, lb, rule = RULES, names = ["today's engine", 'arm 2']) {
  const by = new Map();
  rows.forEach((r, i) => {
    if (!keep(r, i) || la[i] == null || lb[i] == null) return;
    (by.has(r.p) ? by.get(r.p) : by.set(r.p, []).get(r.p)).push(lb[i] - la[i]);
  });
  const dp = [...by.entries()].filter(([, l]) => l.length >= rule.minAnswers).map(([p, l]) => [p, mean(l), l.length]);
  const res = {players: dp.length, answers: dp.reduce((t, x) => t + x[2], 0), perPlayer: dp.map(([p, x, k]) => ({p, d: x, n: k}))};
  if (dp.length < rule.minPlayers) return {...res, verdict: CANNOT, why: `fewer than ${rule.minPlayers} players with ${rule.minAnswers} answers`};
  const D = dp.map(x => x[1]),
    f = signFlip(D),
    md = mean(D);
  return {
    ...res,
    mean: md,
    p: f.p,
    exact: f.exact,
    verdict: f.p < rule.alpha ? `${names[1]} ${md < 0 ? 'better' : 'worse'} than ${names[0]}` : CANNOT
  };
}

// Spearman's rank correlation, ties by mean rank.
function ranks(x) {
  const o = x.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]),
    r = new Array(x.length);
  for (let i = 0; i < o.length; ) {
    let j = i;
    while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++;
    for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}
function pearson(a, b) {
  const ma = mean(a),
    mb = mean(b);
  let s = 0,
    sa = 0,
    sb = 0;
  a.forEach((x, i) => ((s += (x - ma) * (b[i] - mb)), (sa += (x - ma) ** 2), (sb += (b[i] - mb) ** 2)));
  return sa && sb ? s / Math.sqrt(sa * sb) : NaN;
}
const spearman = (a, b) => pearson(ranks(a), ranks(b));
function spearmanPerm(a, b, perms = RULES.centring.perms, seed = 316) {
  const rho = spearman(a, b),
    R = rng(seed),
    ra = ranks(a),
    rb = ranks(b);
  let hits = 0;
  for (let k = 0; k < perms; k++) {
    const x = ra.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    if (Math.abs(pearson(x, rb)) >= Math.abs(rho) - 1e-12) hits++;
  }
  return {rho, p: (hits + 1) / (perms + 1)};
}

// The per-unit mean delta over players (one vote each), from the deltas after the player's `after`th answer on the unit;
// keepRow picks the answers (all, or one half of each player's order of meeting units).
function unitMeans(rows, delta, keepRow = () => true, rule = RULES.centring) {
  const pu = new Map();
  rows.forEach((r, i) => {
    if (delta[i] == null || r.nu < rule.after || !keepRow(r, i)) return;
    const k = r.u + '\u0000' + r.p;
    (pu.has(k) ? pu.get(k) : pu.set(k, []).get(k)).push(delta[i]);
  });
  const U = new Map();
  pu.forEach((l, k) => {
    const u = k.split('\u0000')[0];
    (U.has(u) ? U.get(u) : U.set(u, []).get(u)).push(mean(l));
  });
  const out = {};
  U.forEach((l, u) => {
    if (l.length >= rule.minPlayers) {
      const mu = mean(l),
        s2 = l.reduce((t, x) => t + (x - mu) ** 2, 0) / (l.length - 1);
      out[u] = {m: mu, v: s2 / l.length, n: l.length};
    }
  });
  return out;
}

// DerSimonian-Laird: the spread of the unit means beyond their noise (C1, exploratory).
function dersimonian(M) {
  const L = Object.values(M).filter(x => x.v > 0);
  if (L.length < 2) return {tau: NaN, I2: NaN, units: L.length};
  const w = L.map(x => 1 / x.v),
    sw = w.reduce((t, x) => t + x, 0),
    mw = L.reduce((t, x, i) => t + w[i] * x.m, 0) / sw,
    Q = L.reduce((t, x, i) => t + w[i] * (x.m - mw) ** 2, 0),
    c = sw - w.reduce((t, x) => t + x * x, 0) / sw,
    t2 = Math.max(0, (Q - (L.length - 1)) / c);
  return {tau: Math.sqrt(t2), I2: Q > 0 ? Math.max(0, (Q - (L.length - 1)) / Q) : 0, Q, units: L.length};
}

// 2C: C1 and C2 with the declared rule. gd: the live unit offsets; D: the offline D(u) (exploratory).
function centring(rows, delta, gd, D, rule = RULES.centring) {
  const order = new Map();
  rows.forEach(r => {
    const o = order.get(r.p) || order.set(r.p, new Map()).get(r.p);
    if (!o.has(r.u)) o.set(r.u, o.size);
  });
  const early = (r, i) => order.get(r.p).get(r.u) < order.get(r.p).size / 2,
    late = (r, i) => !early(r, i);
  const corr = (M, ref) => {
    const us = Object.keys(M).filter(u => ref && typeof ref[u] === 'number');
    if (us.length < rule.minUnits) return {units: us.length, verdict: CANNOT};
    return {units: us.length, ...spearmanPerm(us.map(u => M[u].m), us.map(u => ref[u]))};
  };
  const all = unitMeans(rows, delta, () => true, rule),
    c2 = corr(all, gd),
    halves = [corr(unitMeans(rows, delta, early, rule), gd), corr(unitMeans(rows, delta, late, rule), gd)];
  let verdict;
  if (c2.verdict === CANNOT) verdict = CANNOT;
  else if (c2.rho < 0 && c2.p < rule.alpha && halves.every(h => typeof h.rho === 'number' && h.rho < 0))
    verdict = 'not centred: a Q136 rating uses the centred delta (4c) or stays on the chain';
  else verdict = 'centring not rejected: the choice among 2, 4b and 4c rests on 2B';
  return {units: Object.keys(all).length, C1: dersimonian(all), C2: c2, C2offline: corr(all, D), halves, verdict};
}

// The calibration table: mean predicted against mean right, by rank, format and band of the replayed global level.
function calibration(rows, preds, lvl) {
  const out = {};
  const add = (key, i, p) => {
    const c = (out[key] = out[key] || {n: 0, p: 0, y: 0});
    c.n++;
    c.p += p;
    c.y += rows[i].y;
  };
  rows.forEach((r, i) => {
    if (preds[i] == null) return;
    const b = RULES.bands.findIndex((x, j) => lvl[i] != null && lvl[i] >= x && lvl[i] < RULES.bands[j + 1]);
    add('rank ' + r.rk, i, preds[i]);
    add('format ' + r.fmt, i, preds[i]);
    if (b >= 0) add(`level ${RULES.bands[b]} to ${RULES.bands[b + 1]}`, i, preds[i]);
  });
  Object.values(out).forEach(c => ((c.p /= c.n), (c.y /= c.n)));
  return out;
}

const fitVals = F => ({
  sd: Object.fromEntries(Object.entries((F.fit || F).sd || {}).map(([k, v]) => [k, v[0]])),
  fx: Object.fromEntries(Object.entries((F.fit || F).fixed || {}).map(([k, v]) => [k, v[0]])),
  eff: (F.fit || F).effects || {}
});

function run(ex, fits, stats, deadline, log = console.log) {
  const tick = clock(deadline),
    rows = ex.rows,
    fish = ex.subject !== 'coral',
    out = {subject: ex.subject, rules: RULES, cut: false, done: []};
  try {
    const {th, lvl} = persons(rows);
    const delta = th.map((x, i) => (x != null && lvl[i] != null ? x - lvl[i] : null));
    tick();
    const live = liveArm(rows, tick);
    out.done.push('live');
    const full = fitVals(fits.full),
      halfOf = {A: fitVals(fits.B), B: fitVals(fits.A)}; // a player is scored with the other half's SDs
    if (![full, halfOf.A, halfOf.B].every(F => F.sd.photo != null && F.sd.gen != null)) {
      out.primary = {verdict: CANNOT, why: 'a fit did not finish (fit.py cut at the deadline)'};
      out.centring = {primary: !fish, ...centring(rows, delta, live.unit, {})};
      return out;
    }
    const arm = (opt, half) => sharedArm(rows, halfOf[half].sd, halfOf[half].fx, {...opt, delta});
    const both = opt => {
      const a = arm(opt, 'A'),
        b = arm(opt, 'B');
      tick();
      return {d: rows.map((r, i) => (r.half === 'A' ? a.d[i] : b.d[i])), m: a.m};
    };
    const arms = {1: live, 2: both({})};
    out.done.push('shared');
    const sib = fits.full.report && fits.full.report.sib,
      sibOk = sib && sib.verdict === 'pass' && sib.ci95[0] > RULES.sibMin;
    if (sibOk) arms[3] = both({sib: true});
    else out.arm3 = 'not run: the sibling term was not fitted, failed its acceptance, or its 95% interval reaches ' + RULES.sibMin;
    arms['4b'] = both({person: 'delta'});
    arms['4c'] = both({person: 'centred'});
    out.done.push('q136 variants');
    const P = {},
      LL = {};
    Object.entries(arms).forEach(([k, A]) => {
      P[k] = rows.map((r, i) => (th[i] == null || A.d[i] == null ? null : predict(r, th[i], A.d[i])));
      LL[k] = P[k].map((p, i) => (p == null ? null : ll(p, rows[i].y)));
    });
    const primaryKeep = r => fish && r.pn < RULES.pnMax;
    out.primary = fish ? {measure: RULES.primary, ...pairedTest(rows, primaryKeep, LL[1], LL[2])} : {measure: 'none (corals: no primary in 2B)'};
    out.exploratory = {all: pairedTest(rows, () => true, LL[1], LL[2])};
    if (fish) {
      out.exploratory.genusRank = pairedTest(rows, r => r.rk === 'genus', LL[1], LL[2]);
      out.exploratory.speciesRank = pairedTest(rows, r => r.rk === 'species', LL[1], LL[2]);
    }
    ['3', '4b', '4c'].forEach(k => LL[k] && (out.exploratory['arm ' + k] = pairedTest(rows, () => true, LL[2], LL[k], RULES, ['arm 2', 'arm ' + k])));
    out.calibration = Object.fromEntries(Object.keys(P).map(k => [k, calibration(rows, P[k], lvl)]));
    // compression: each arm's end-of-log unit offsets against the offline D(u), units with 20 or more answers
    const nU = {};
    rows.forEach(r => (nU[r.u] = (nU[r.u] || 0) + 1));
    const get = F => (lv, id) => (F.eff[lv] && typeof F.eff[lv][id] === 'number' ? F.eff[lv][id] : 0);
    const D = unitD(rows, get(full), full.fx),
      big = Object.keys(D).filter(u => nU[u] >= RULES.compressionMin);
    const armUnits = {1: live.unit, 2: unitD(rows, (lv, id) => arms[2].m[{fam: 'F:', gen: 'G:', sp: 'S:'}[lv] + id] || 0, halfOf.A.fx)};
    out.compression = Object.fromEntries(
      Object.entries(armUnits).map(([k, U]) => {
        const us = big.filter(u => typeof U[u] === 'number');
        return [k, {units: us.length, slope: us.length >= 3 ? slope(us.map(u => D[u]), us.map(u => U[u])) : null}];
      })
    );
    // 2C: the corals' primary; the fish exploratory
    out.centring = {primary: !fish, ...centring(rows, delta, live.unit, D)};
    out.done.push('centring');
    if (stats && stats.gd) {
      const gaps = Object.keys(stats.gd)
        .filter(u => typeof live.unit[u] === 'number')
        .map(u => Math.abs(stats.gd[u][0] - live.unit[u]))
        .sort((a, b) => a - b);
      out.sanity = {units: gaps.length, medianGap: gaps.length ? gaps[Math.floor(gaps.length / 2)] : null};
    }
  } catch (e) {
    if (!(e instanceof Cut)) throw e;
    out.cut = true;
  }
  return out;
}

module.exports = {RULES, persons, liveArm, sharedArm, unitD, pairedTest, spearman, spearmanPerm, unitMeans, dersimonian, centring, calibration, run};

if (require.main === module) {
  const argv = process.argv.slice(2),
    VAL = ['--fit', '--fitA', '--fitB', '--stats', '--deadline'],
    opt = n => {
      const i = argv.indexOf('--' + n);
      return i < 0 ? null : argv[i + 1];
    },
    pos = argv.filter((a, i) => !a.startsWith('--') && !VAL.includes(argv[i - 1]));
  const [IN, OUT] = pos;
  if (!IN || !OUT || !opt('fit') || !opt('fitA') || !opt('fitB')) {
    console.error('usage: node tools/studies/q316/checks.js <export.json> <out.json> --fit f.json --fitA a.json --fitB b.json [--stats s.json] [--deadline s]');
    process.exit(2);
  }
  const {inRepo} = require('./prep.js');
  if (inRepo(OUT)) {
    console.error('checks.js: the output holds per-player results: write it outside the repository (rule D2).');
    process.exit(2);
  }
  require(path.join(ROOT, 'tests', 'slot.js')).guard('tools/studies/q316/checks.js');
  const rd = f => JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log('Declared before running: ' + JSON.stringify(RULES));
  const out = run(rd(IN), {full: rd(opt('fit')), A: rd(opt('fitA')), B: rd(opt('fitB'))}, opt('stats') ? rd(opt('stats')) : null, Number(opt('deadline')) || null);
  fs.writeFileSync(OUT, JSON.stringify(out));
  const pr = out.primary || {};
  console.log(`${out.subject}${out.cut ? ' (cut at the deadline: ' + CANNOT + ' for the rest)' : ''}`);
  if (pr.verdict) console.log(`  2B primary: ${pr.verdict} (${pr.players} players, ${pr.answers} answers${pr.p != null ? `, p ${pr.p.toFixed(3)}` : ''})`);
  Object.entries(out.exploratory || {}).forEach(([k, v]) => console.log(`  2B ${k} (exploratory): ${v.verdict}${v.p != null ? `, p ${v.p.toFixed(3)}` : ''}`));
  Object.entries(out.compression || {}).forEach(([k, v]) => console.log(`  compression, arm ${k}: slope ${v.slope == null ? '-' : v.slope.toFixed(2)} on ${v.units} units`));
  if (out.centring) console.log(`  2C${out.centring.primary ? '' : ' (exploratory)'}: ${out.centring.verdict}`);
}
