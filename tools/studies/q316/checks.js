// Q316's side check 2C on the real log (tools/studies/q316/README.md), read-only, its decision rule declared here before
// any real run (RULES, printed at the head of every run):
//   2C  Q136: is the app's per-unit ability centred across players? (the app's own delta, the corals; descriptive)
// (2B, the step-2 candidates replayed against today's engine, is not here: it is the follow-up in the README, which
// replays through core.js's own replay.)
//
//   node tools/studies/q316/checks.js <export.json> <out.json> --fit fit.json [--stats stats.json] [--deadline <epoch s>]
//
// export.json: prep.js's. fit.json: fit.py on every player (the offline reference D(u), exploratory). stats.json
// (optional): the ?stats=1 reply saved with the log; the replay's end-of-log unit offsets are compared with its gd (a
// sanity check: they should be close, not equal, as the sheet leaves out the players the admin excluded and was read
// later). Writes out.json (outside the repository), prints aggregates and P1, P2... labels only.
//
// The live unit offsets gd: the sheet's pass over the whole log (core.js genusOffsetsOf, as ?stats=1 serves them: the
// corals by genus, the fish per rank, unit ids f:, g:, s:).
// The person term: the app's unit ability replayed per player (core.js scoreAnswer, as tools/studies/q351/refit.js
// replays it, from each answer's scoring record, else its logged expected and ability), before the answer. Limit: the
// player's own starting prior (core.js startPriorAt, from the first-launch choice) is not passed (p 0), so a delta here
// is the one of a player who started at the default; the follow-up replays through core.js with the players' starts.
const fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');
const C = require(path.join(ROOT, 'core.js'));

// ---- Declared before any real run (the README repeats them; tests/q316.test.js checks they agree).
const RULES = {
  centring: {
    after: 5, // a delta counts from the player's 6th answer on the unit (playerStart pins the start)
    minPlayers: 3, // a unit counts with 3 or more such players
    minUnits: 8, // fewer units: the measure cannot tell
    perms: 10000, // permutation p over units, seeded
    alpha: 0.05,
    rule: 'clearly negative = Spearman of m_u with the live gd below 0 at permutation p < 0.05, and below 0 in both halves of the players\' order of meeting units'
  }
};
const CANNOT = 'the measure cannot tell';
const logit = p => Math.log(p / (1 - p)),
  clamp = (x, a, b) => Math.min(b, Math.max(a, x)),
  mean = l => (l.length ? l.reduce((t, x) => t + x, 0) / l.length : NaN);

class Cut extends Error {}
// Rule L11's cap: a deadline (epoch seconds) never later than 40 minutes from now, none given included.
const CAP_MIN = 40;
const capDeadline = d => {
  const cap = Date.now() / 1000 + CAP_MIN * 60;
  return d && d < cap ? d : cap;
};
function clock(deadline) {
  const end = capDeadline(deadline);
  return () => {
    if (Date.now() / 1000 > end) throw new Cut();
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

// ---- The person side: each player's app replay (unit ability and global level before each answer), passing what the
// sheet's replay passes (core.js replayProgress): the unit given in a miss (cv), the units a unit shown or given starts
// from when never answered (gen: core.js treeReplayGen's from, a fish species its family or genus), a smaller fault's
// kind (z).
function persons(rows, gen = {}) {
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
      const L = P[C.LEVEL] && typeof P[C.LEVEL].th === 'number' ? P[C.LEVEL].th : null,
        wrong = !r.y && !!r.c && r.c !== r.u;
      const q = {
        t: r.u,
        c: r.c,
        ok: !!r.y,
        k,
        chs: r.chs,
        ph: r.ph,
        cv: wrong,
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
      };
      if (gen[r.u] && gen[r.u].from) q.from = gen[r.u].from;
      if (wrong && gen[r.c] && gen[r.c].from) q.cfrom = gen[r.c].from;
      if (r.z) q.z = r.z;
      const res = C.scoreAnswer(P, q);
      if (d0 != null && typeof res.th0 === 'number') {
        th[i] = res.th0;
        lvl[i] = L;
      }
    });
  });
  return {th, lvl};
}

// ---- The live unit offsets gd: the sheet's pass over the whole log (core.js genusOffsetsOf, as ?stats=1 serves them).
function liveUnits(rows) {
  const ER = rows.map(r => [r.p, r.t, r.u, r.c, r.y, r.mode, r.ph.join(' '), r.e, r.th, null, r.chs.join(' '), 0]);
  return Object.fromEntries(Object.entries(C.genusOffsetsOf(ER)).map(([u, g]) => [u, g[0]]));
}

// A unit's offline difficulty from the full fit's component means (fish: rank offset + family + genus + species down to
// the unit; corals: the genus), its path read from the rows that asked it.
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
    verdict = 'not centred: a Q136 rating uses the centred delta or stays on the chain';
  else verdict = 'centring not rejected: the choice rests on the follow-up replay (README, 2B)';
  return {units: Object.keys(all).length, C1: dersimonian(all), C2: c2, C2offline: corr(all, D), halves, verdict};
}

const fitVals = F => ({
  fx: Object.fromEntries(Object.entries((F.fit || F).fixed || {}).map(([k, v]) => [k, v[0]])),
  eff: (F.fit || F).effects || {}
});

// gen: the units' starting units (core.js treeReplayGen; default: the fish's from this checkout's fish.json, none for
// the corals). fits.full: fit.py on every player (its component means give the offline D(u); none: D empty).
function run(ex, fits, stats, deadline, gen = null) {
  const tick = clock(deadline),
    rows = ex.rows,
    fish = ex.subject !== 'coral',
    out = {subject: ex.subject, rules: RULES, cut: false, done: []},
    G = gen || (fish ? C.treeReplayGen(JSON.parse(fs.readFileSync(path.join(ROOT, 'fish.json'), 'utf8'))) : {});
  try {
    const {th, lvl} = persons(rows, G);
    const delta = th.map((x, i) => (x != null && lvl[i] != null ? x - lvl[i] : null));
    tick();
    const live = liveUnits(rows);
    out.done.push('live units');
    tick();
    let D = {};
    if (fits && fits.full) {
      const full = fitVals(fits.full),
        get = (lv, id) => (full.eff[lv] && typeof full.eff[lv][id] === 'number' ? full.eff[lv][id] : 0);
      D = unitD(rows, get, full.fx);
    } else out.offline = 'no fit given: the offline D(u) comparison is empty';
    // 2C: the corals' primary; the fish exploratory
    out.centring = {primary: !fish, ...centring(rows, delta, live, D)};
    out.done.push('centring');
    if (stats && stats.gd) {
      const gaps = Object.keys(stats.gd)
        .filter(u => typeof live[u] === 'number')
        .map(u => Math.abs(stats.gd[u][0] - live[u]))
        .sort((a, b) => a - b);
      out.sanity = {units: gaps.length, medianGap: gaps.length ? gaps[Math.floor(gaps.length / 2)] : null};
    }
  } catch (e) {
    if (!(e instanceof Cut)) throw e;
    out.cut = true;
  }
  return out;
}

module.exports = {RULES, capDeadline, persons, liveUnits, unitD, spearman, spearmanPerm, unitMeans, dersimonian, centring, run};

if (require.main === module) {
  const argv = process.argv.slice(2),
    VAL = ['--fit', '--stats', '--deadline'],
    opt = n => {
      const i = argv.indexOf('--' + n);
      return i < 0 ? null : argv[i + 1];
    },
    pos = argv.filter((a, i) => !a.startsWith('--') && !VAL.includes(argv[i - 1]));
  const [IN, OUT] = pos;
  if (!IN || !OUT || !opt('fit')) {
    console.error('usage: node tools/studies/q316/checks.js <export.json> <out.json> --fit f.json [--stats s.json] [--deadline s]');
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
  const out = run(rd(IN), {full: rd(opt('fit'))}, opt('stats') ? rd(opt('stats')) : null, Number(opt('deadline')) || null);
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`${out.subject}${out.cut ? ' (cut at the deadline: ' + CANNOT + ' for the rest)' : ''}`);
  if (out.centring) console.log(`  2C${out.centring.primary ? '' : ' (exploratory)'}: ${out.centring.verdict}`);
}
