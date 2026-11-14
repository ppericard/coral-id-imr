// Q351 step 2 (docs/reviews/2026-11-14-q351-step2.md): replays an answer log player by player under today's rules
// (BASE: core.js scoreAnswer) and three uncertainty arms: DAMP (BASE's abilities, the expectation damped by a variance),
// GK (a Glicko / simplified Kalman level + per-unit deviation, each with a mean and a variance) and GKD (GK plus a
// learning drift). The arms' variances are chosen on a grid by leave one player out. Read-only: it reads files and
// writes only the output file; it sends nothing anywhere. Light (seconds), so no machine slot.
//
//   node tools/studies/q351/replay.js <answers.json> <coral|fish|sim> <out.json> [--starts starts.json]
//                                     [--core path/to/core.js] [--check-only] [--gridx]
//
// answers.json, for coral or fish: a pseudonymised copy of the sync sheet's Answers tab, one row per answer,
//   [row index, player label, then the tab's columns from Time on: time, shown, answered, right, mode, photos, id,
//   expected, ability, new photos, choices, seconds, enlarged, UTC offset, typed, retyped right, subject, rank, taxon
//   shown, taxon answered, species shown, scoring, ...]. Labels only (P1, P2...), never names (rule D2).
// For sim: a tools/learnsim.js --out file; each run's own answer log (alog, with the learner's true chance) is a player.
// --starts: {label: the player's reefid-sync-<subject>-start record as its JSON text}, from the Progress data tab; the
//   first-launch prior at each answer (core.js startPriorAt). Without it, the prior is 0 for everyone.
// --core: another core.js (default: this repository's). --check-only: the replay checks only (BASE against
//   replayProgress and against the logged ability), then stop. --gridx: the wider exploratory grid instead of the
//   declared one.
// out.json: per scored answer the inputs and each arm's log-odds and prediction, the grid point each fold chose, the
//   checks. tools/studies/q351/stats.py reads it.
const fs = require('fs'),
  path = require('path');
const argv = process.argv.slice(2),
  opt = name => {
    const i = argv.indexOf('--' + name);
    return i < 0 ? null : argv[i + 1];
  },
  flag = name => argv.includes('--' + name),
  pos = argv.filter((a, i) => !a.startsWith('--') && !['--starts', '--core'].includes(argv[i - 1]));
const [IN, SUBJ, OUT] = pos;
if (!IN || !['coral', 'fish', 'sim'].includes(SUBJ) || !OUT) {
  console.error('usage: node tools/studies/q351/replay.js <answers.json> <coral|fish|sim> <out.json> [--starts f] [--core f] [--check-only] [--gridx]');
  process.exit(2);
}
const C = require(path.resolve(opt('core') || path.join(__dirname, '..', '..', '..', 'core.js')));
const LEVEL = C.LEVEL;
const sig = x => 1 / (1 + Math.exp(-x)),
  logit = p => Math.log(p / (1 - p)),
  clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const split = x =>
  String(x || '')
    .split(/\s+/)
    .filter(Boolean);
const num = x => (x === '' || x === null || x === undefined ? NaN : Number(x));

// ---- Load: one list of answers per player, time order (sheet rows) or the simulated logs.
function loadSheet() {
  const raw = JSON.parse(fs.readFileSync(IN, 'utf8'));
  const rows = raw
    .filter(r => {
      const s = r[18];
      return SUBJ === 'coral' ? s === '' || s === 'coral' : s === SUBJ;
    })
    .map(r => ({
      p: r[1],
      at: Date.parse(String(r[2]).replace(' ', 'T') + ':00+08:00'),
      i: r[0],
      t: String(r[3]),
      c: String(r[4] || ''),
      ok: String(r[5]) === '1',
      mode: String(r[6] || ''),
      ph: split(r[7]),
      e: num(r[9]),
      th: num(r[10]),
      chs: split(r[12]),
      chRaw: r[12],
      sec: num(r[13]),
      sc: C.scoreRec(r[23]),
      old: r[18] === '' // logged before the Subject column: the diagnosis's 2,047
    }))
    .sort((a, b) => a.at - b.at || a.i - b.i);
  const by = {};
  rows.forEach(r => (by[r.p] = by[r.p] || []).push(r));
  return by;
}
function loadSim() {
  const d = JSON.parse(fs.readFileSync(IN, 'utf8')),
    by = {};
  d.runs.forEach(run => {
    if (!run.alog) return;
    const id = `${run.profile}:${run.seed}`;
    by[id] = run.alog.map(([a, pT], i) => ({
      p: id,
      at: Date.parse(a.t),
      i,
      t: String(a.g),
      c: String(a.a || ''),
      ok: !!a.ok,
      mode: String(a.m || ''),
      ph: split(a.ph),
      e: num(a.e),
      th: num(a.th),
      chs: split(a.ch),
      chRaw: a.ch,
      sec: typeof a.rt === 'number' ? a.rt : NaN,
      sc: C.scoreRec(a.sc),
      pT,
      old: false
    }));
  });
  return by;
}
const BY = SUBJ === 'sim' ? loadSim() : loadSheet();
// The first-launch answers (Progress data, reefid-sync-<subject>-start), by label: the prior p at each answer.
const STARTS = opt('starts') ? JSON.parse(fs.readFileSync(opt('starts'), 'utf8')) : {};
const startRec = id => {
  try {
    return STARTS[id] ? JSON.parse(STARTS[id]) : null;
  } catch (e) {
    return null;
  }
};

// Today's format offsets: the latest offset logged per format (a scoring record without o: 0).
const FMT = {};
Object.values(BY)
  .flat()
  .sort((a, b) => a.at - b.at)
  .forEach(r => {
    if (!r.sc) return;
    FMT[C.fmtOf(r.mode, r.chs.length)] = r.sc.o || 0;
  });

// ---- Inputs per answer, shared by every arm.
function prep(list) {
  const seen = {},
    lastOk = {};
  return list.map(r => {
    const k = C.kOf(r.mode, r.chRaw),
      fmt = C.fmtOf(r.mode, r.chs.length),
      m = seen[r.t] || 0,
      am = lastOk[r.t] === false; // the previous answer on this unit was a miss
    seen[r.t] = m + 1;
    lastOk[r.t] = r.ok;
    const rec = startRec(r.p),
      pr = rec ? C.startPriorAt(rec, r.at) : 0;
    const x = {...r, k, fmt, m, am, pr, g: isFinite(k) ? 1 / k : 0};
    x.replayable = r.ph.length > 0 && k > 1 && (!!r.sc || (isFinite(r.e) && isFinite(r.th)));
    if (r.sc) Object.assign(x, {d0: r.sc.d, fam: r.sc.f || 0, cf: r.sc.c || 0, R: r.sc.r === undefined ? 1 : r.sc.r, df: r.sc.o || 0, S: r.sc.s || 1, src: 'sc'});
    else if (x.replayable) {
      const q = clamp((r.e - x.g) / (1 - x.g), 0.005, 0.995);
      Object.assign(x, {d0: r.th - logit(q), fam: 0, cf: 0, R: 1, df: FMT[fmt] || 0, S: 1, src: 'log'});
    }
    if (x.replayable) x.dm = x.d0 + x.fam + x.cf;
    return x;
  });
}

// ---- BASE: today's scorer. Returns per answer {th (before), x, p, rw} and the final P.
function base(list) {
  const P = {},
    out = [];
  list.forEach(a => {
    if (!a.replayable) {
      C.scoreAnswer(P, {t: a.t, c: a.c, ok: a.ok, k: a.k, chs: a.chs, ph: a.ph, cv: false, p: a.pr, sec: a.sec, timed: true, rt: false, d0: null});
      out.push(null);
      return;
    }
    const th = C.abilityOf(P, a.t, a.pr),
      rw = C.rtWeight(P[LEVEL], isFinite(a.sec) ? a.sec : null, a.k, a.ok),
      x = a.S * (th - a.dm + a.df),
      p = a.g + (1 - a.g) * a.R * sig(x);
    C.scoreAnswer(P, {
      t: a.t,
      c: a.c,
      ok: a.ok,
      k: a.k,
      chs: a.chs,
      ph: a.ph,
      cv: false,
      p: a.pr,
      sec: isFinite(a.sec) ? a.sec : null,
      timed: true,
      rt: true,
      d0: a.d0,
      fam: a.fam,
      cf: a.cf,
      R: a.R,
      df: a.df,
      S: a.S,
      look: false,
      dom: true
    });
    out.push({th, x, p, rw});
  });
  return {out, P};
}

// ---- The Kalman / Glicko arms. mode: 'damp' (BASE's means, damped), 'gk', 'gkd'.
const A3 = 3 / (Math.PI * Math.PI);
function kal(list, b, prm, mode) {
  const {vL0, vd0, qL, qd, vD, eta = 0} = prm,
    E = C.ELO,
    S = C.START,
    L = {m: 0, v: vL0, n: 0},
    U = {},
    out = [];
  list.forEach((a, i) => {
    if (!a.replayable) {
      L.n++;
      out.push(null);
      return;
    }
    L.v += qL;
    let u = U[a.t];
    if (!u) {
      // core.js playerStart on GK's own level: W (n L + N p) / (n + N), clamped; 0 with no answer and no prior.
      const th0 = L.n || a.pr ? Math.round(clamp((S.W * (L.n * L.m + S.N * a.pr)) / (L.n + S.N), S.LO, S.HI) * 100) / 100 : 0;
      u = U[a.t] = {m: th0 - L.m, v: vd0};
    } else u.v += qd;
    const th = mode === 'damp' ? b.out[i].th : clamp(L.m + u.m, E.lo, E.hi),
      vt = L.v + u.v,
      av = 1 / Math.sqrt(1 + A3 * (vt + vD)),
      x = av * (th - a.dm) + a.df,
      s = sig(x),
      P = clamp(a.g + (1 - a.g) * a.R * s, 1e-6, 1 - 1e-6),
      y = a.ok ? 1 : 0;
    out.push({th, x, p: P, v: vt});
    const dP = (1 - a.g) * a.R * s * (1 - s) * av,
      I = (dP * dP) / (P * (1 - P)),
      grad = ((y - P) * dP) / (P * (1 - P)),
      den = 1 + vt * I,
      rw = b.out[i].rw;
    if (mode !== 'damp') {
      const dth = ((vt * grad) / den) * rw;
      L.m += (L.v / vt) * dth;
      u.m += (u.v / vt) * dth;
      if (mode === 'gkd') u.m += eta;
      // The bounds on the state itself, as today's eloStep clamps each record (Codex review #883): the level within
      // [lo, hi], then the unit's deviation so that level + deviation stays within them. No excess builds up behind
      // the prediction's clamp.
      L.m = clamp(L.m, E.lo, E.hi);
      u.m = clamp(L.m + u.m, E.lo, E.hi) - L.m;
    }
    L.v -= (L.v * L.v * I) / den;
    u.v -= (u.v * u.v * I) / den;
    L.n++;
  });
  return out;
}

const ll = (p, y) => -(y ? Math.log(p) : Math.log(1 - p));
const grid = [];
for (const vL0 of [0.25, 0.5, 1, 2])
  for (const vd0 of [0.1, 0.3, 0.6, 1])
    for (const qL of [0, 0.003, 0.01]) for (const qd of [0, 0.01, 0.03, 0.1]) for (const vD of [0, 0.3, 0.6]) grid.push({vL0, vd0, qL, qd, vD});
// --gridx (exploratory, after the declared run): a wider grid where the declared one chose its edges.
if (flag('gridx')) {
  grid.length = 0;
  for (const vL0 of [1, 2, 4, 8])
    for (const vd0 of [0.3, 0.6, 1, 2])
      for (const qL of [0, 0.003, 0.01, 0.03]) for (const qd of [0, 0.01]) for (const vD of [0.3, 0.6, 1, 2, 4]) grid.push({vL0, vd0, qL, qd, vD});
}
const gridD = grid.flatMap(g => [0.02, 0.05, 0.1].map(eta => ({...g, eta})));

const players = Object.keys(BY),
  PRE = {},
  B = {};
players.forEach(id => {
  PRE[id] = prep(BY[id]);
  B[id] = base(PRE[id]);
});
const nScored = id => B[id].out.filter(Boolean).length;
const incl = players.filter(id => nScored(id) >= 20);

// Check: BASE's final state against core.js replayProgress on the same rows (genus th per player).
let chk = {n: 0, same: 0, maxd: 0};
if (SUBJ !== 'sim') {
  incl.forEach(id => {
    const rows = PRE[id].map(a => {
      const r = new Array(23).fill(null);
      Object.assign(r, {0: id, 1: a.at, 2: a.t, 3: a.c, 4: a.ok ? 1 : 0, 5: a.mode, 6: a.ph.join(' '), 7: isFinite(a.e) ? a.e : null, 8: isFinite(a.th) ? a.th : null, 10: a.chs.join(' '), 12: isFinite(a.sec) ? a.sec : null});
      // Every replayable row carries the inputs BASE used, as a scoring record, so replayProgress scores exactly them.
      r[C.LOG_SC] = a.replayable ? {d: a.d0, f: a.fam, c: a.cf, r: a.R, o: a.df} : null;
      return r;
    });
    const rep = C.replayProgress(rows, {fmt: {}, memory: true, starts: startRec(id) ? {[id]: startRec(id)} : {}})[id];
    Object.keys(B[id].P).forEach(g => {
      if (g === LEVEL || typeof B[id].P[g].th !== 'number' || !rep.P[g]) return;
      const d = Math.abs(B[id].P[g].th - rep.P[g].th);
      chk.n++;
      if (d < 0.011) chk.same++;
      chk.maxd = Math.max(chk.maxd, d);
    });
  });
}

// The logged Ability against BASE's ability before the answer, rows with a scoring record.
const lg = {n: 0, close: 0, first: 0, firstClose: 0};
incl.forEach(id =>
  PRE[id].forEach((a, i) => {
    const b = B[id].out[i];
    if (!b || a.src !== 'sc' || !isFinite(a.th)) return;
    const ok = Math.abs(a.th - b.th) < 0.015;
    lg.n++;
    if (ok) lg.close++;
    if (a.m === 0) (lg.first++, ok && lg.firstClose++);
  })
);
console.log('check replayProgress', JSON.stringify(chk), 'logged ability', JSON.stringify(lg));
if (flag('check-only')) process.exit(0);

// LOPO choice of the grid point.
function lopo(G, mode) {
  const tot = G.map(prm => {
    const per = {};
    incl.forEach(id => {
      const o = kal(PRE[id], B[id], prm, mode);
      let s = 0;
      PRE[id].forEach((a, i) => o[i] && (s += ll(o[i].p, a.ok ? 1 : 0)));
      per[id] = s;
    });
    return per;
  });
  const all = tot.map(per => incl.reduce((s, id) => s + per[id], 0));
  const chosen = {},
    preds = {};
  incl.forEach(id => {
    let best = -1,
      bv = Infinity;
    all.forEach((v, j) => {
      const w = v - tot[j][id];
      if (w < bv) (bv = w), (best = j);
    });
    chosen[id] = G[best];
    preds[id] = kal(PRE[id], B[id], G[best], mode);
  });
  let bi = 0;
  all.forEach((v, j) => v < all[bi] && (bi = j));
  // The jackknife's replicates (Codex review #883): with player q deleted, each other player's grid point is chosen
  // on the players other than itself and q, so a replicate is the whole estimator without q. jk[q]: per remaining
  // player, its log-odds per answer under that choice.
  const cache = {},
    jk = {};
  incl.forEach(q => {
    jk[q] = {};
    incl.forEach(id => {
      if (id === q) return;
      let best = -1,
        bv = Infinity;
      all.forEach((v, j) => {
        const w = v - tot[j][id] - tot[j][q];
        if (w < bv) (bv = w), (best = j);
      });
      const key = id + '|' + best;
      if (!cache[key]) cache[key] = kal(PRE[id], B[id], G[best], mode).map(z => (z ? z.x : null));
      jk[q][id] = cache[key];
    });
  });
  return {chosen, preds, bestAll: G[bi], jk};
}
const arms = {DAMP: lopo(grid, 'damp'), GK: lopo(grid, 'gk'), GKD: lopo(gridD, 'gkd')};

// Output: per scored answer the inputs the statistics need and each arm's x and p.
const rowsOut = [];
incl.forEach(id =>
  PRE[id].forEach((a, i) => {
    const b = B[id].out[i];
    if (!b) return;
    const o = {at: a.at, ph: a.ph, t: a.t, p: id, y: a.ok ? 1 : 0, g: a.g, R: a.R, fmt: a.fmt, m: a.m, am: a.am, old: a.old, src: a.src, lth: a.th, base: [b.x, b.p, b.th]};
    if (a.pT !== undefined) o.pT = a.pT;
    for (const k of Object.keys(arms)) {
      const z = arms[k].preds[id][i];
      o[k] = [z.x, z.p, z.th, z.v];
    }
    rowsOut.push(o);
  })
);
fs.writeFileSync(
  OUT,
  JSON.stringify({
    subj: SUBJ,
    players: incl,
    excluded: players.filter(id => !incl.includes(id)).map(id => [id, nScored(id)]),
    fmtOffsets: FMT,
    check: chk, logged: lg,
    chosen: Object.fromEntries(Object.entries(arms).map(([k, v]) => [k, v.chosen])),
    bestAll: Object.fromEntries(Object.entries(arms).map(([k, v]) => [k, v.bestAll])),
    // jkX[arm][q]: the arm's log-odds for every output row with player q deleted (null on q's own rows), the grid
    // choice redone without q (above).
    jkX: Object.fromEntries(
      Object.entries(arms).map(([k, v]) => [
        k,
        Object.fromEntries(
          incl.map(q => [
            q,
            incl.flatMap(id => (id === q ? PRE[id].map((a, i) => (B[id].out[i] ? null : undefined)).filter(x => x !== undefined) : v.jk[q][id].filter((x, i) => B[id].out[i])))
          ])
        )
      ])
    ),
    rows: rowsOut
  })
);
console.log(SUBJ, 'players', incl.length, 'scored', rowsOut.length, 'check', JSON.stringify(chk), 'FMT', JSON.stringify(FMT));
