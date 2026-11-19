// The batch refit study (docs/reviews/2026-11-14-q351-refit.md): today's estimators against a batch refit of the engine's
// values, and a learning drift on today's Elo, replayed on an answer log through today's scorer (core.js scoreAnswer).
// Read-only: it reads files and writes only its output file; it sends nothing anywhere. Light (a minute or two), so
// no machine slot. Three modes:
//
//   node tools/studies/q351/refit.js check  <answers.json> <coral|fish> [--starts f] [--ease fish-game.json]
//   node tools/studies/q351/refit.js export <answers.json> <coral|fish> <export.json> [--ease fish-game.json]
//   node tools/studies/q351/refit.js arms   <answers.json> <coral|fish> <out.json> --fits fits.json [--starts f]
//                                           [--ease fish-game.json] [--etax] [--anchor]
//
// answers.json: a pseudonymised copy of the sync sheet's Answers tab, every subject, one row per answer, [row index,
//   player label, then the tab's columns from Time on] (as tools/studies/q351/replay.js). Labels only, never names
//   (rule D2). --starts: {label: the player's reefid-sync-<subject>-start record as its JSON text} (as replay.js).
//   --ease: the fish photos' judged ease, from the repository's fish-game.json (default: this repository's).
// check: today's values reconstructed online (core.js eloReplay, fmtOffsetsOf and the photo memory on the rows strictly
//   before each answer) against the difficulty, memory and format offset the game logged; prints only.
// export: the rows the batch model is fitted on (tools/studies/q351/refit.py reads it).
// arms: BASE (today's rules, the logged inputs), TODAY (today's estimators frozen at each milestone of 1,000 answers of
//   the subject), REFIT (refit.py's batch values frozen the same way) and DRIFT (BASE plus a drift eta after each answer
//   on the unit shown, eta chosen by leave one player out); the delete-one-player replicates of the declared slopes;
//   the end-of-log values for the comparison. --etax: the wider exploratory drift grid. --anchor (exploratory): the
//   refit shifted to today's mean difficulty before each milestone (anchored, below). refit_stats.py reads it.
const fs = require('fs'),
  path = require('path');
const argv = process.argv.slice(2),
  opt = name => {
    const i = argv.indexOf('--' + name);
    return i < 0 ? null : argv[i + 1];
  },
  flag = name => argv.includes('--' + name),
  VALUED = ['--starts', '--core', '--ease', '--fits'],
  pos = argv.filter((a, i) => !a.startsWith('--') && !VALUED.includes(argv[i - 1]));
const [MODE, IN, SUBJ, OUT] = pos;
if (!['check', 'export', 'arms'].includes(MODE) || !IN || !['coral', 'fish'].includes(SUBJ) || (MODE !== 'check' && !OUT)) {
  console.error(
    'usage: node tools/studies/q351/refit.js <check|export|arms> <answers.json> <coral|fish> [out.json] [--starts f] [--ease f] [--fits f] [--etax] [--anchor]'
  );
  process.exit(2);
}
const ROOT = path.join(__dirname, '..', '..', '..');
const C = require(path.resolve(opt('core') || path.join(ROOT, 'core.js')));
const sig = x => 1 / (1 + Math.exp(-x)),
  clamp = (x, a, b) => Math.min(b, Math.max(a, x)),
  r2 = x => Math.round(x * 100) / 100,
  logit = p => Math.log(p / (1 - p));
const split = x =>
  String(x || '')
    .split(/\s+/)
    .filter(Boolean);
const num = x => (x === '' || x === null || x === undefined ? NaN : Number(x));
const numOrNull = x => (x === '' || x === null || x === undefined || !isFinite(Number(x)) ? null : Number(x));
const MILE = 1000, // a refit at every 1,000 answers of the subject (the Analyses' cadence)
  SOLO = 0.5, // model.js PICKD.SINGLE (core.js DOM.SINGLE): one view alone
  PW = 5, // model.js PDIFF.W
  EASE_MID = 3, // model.js PDIFF.MID
  EASE_K = C.calibOf(C.SUBJECTS.find(S => S.id === 'fish')).ease;
const ETA = flag('etax') ? [0, 0.1, 0.2, 0.3, 0.4, 0.6, 0.8, 1, 1.5, 2] : [0, 0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.6];

// The fish photos' judged ease (today's), by photo file.
const EASE = {};
if (SUBJ === 'fish') {
  const fg = JSON.parse(fs.readFileSync(opt('ease') || path.join(ROOT, 'fish-game.json'), 'utf8'));
  Object.values(fg.photos || {}).forEach(list => (list || []).forEach(p => p && typeof p.e === 'number' && (EASE[p.f] = p.e)));
}
const easePart = f => (EASE[f] ? (EASE_MID - EASE[f]) * EASE_K : 0);

// ---- Load: every row of every subject in the sheet's order (time, then row), as the sheet's replay rows (Code.gs
// rowOf_), and this subject's answers per player.
const RAW = JSON.parse(fs.readFileSync(IN, 'utf8'));
const atOf = t => Date.parse(String(t).replace(' ', 'T') + ':00+08:00');
const ALL = RAW.map(r => ({r, at: atOf(r[2]), i: r[0]})).sort((a, b) => a.at - b.at || a.i - b.i);
ALL.forEach((x, g) => {
  const r = x.r;
  x.g = g;
  x.row = [
    r[1],
    x.at,
    String(r[3]),
    String(r[4]),
    Number(r[5]) ? 1 : 0,
    String(r[6]),
    String(r[7]),
    numOrNull(r[9]),
    numOrNull(r[10]),
    numOrNull(r[11]),
    String(r[12] || ''),
    null,
    numOrNull(r[13])
  ];
});
const inSubj = r => (String(r[6] || '') === C.WINK_MODE ? false : SUBJ === 'coral' ? r[18] === '' || r[18] === 'coral' : r[18] === SUBJ);
const SROWS = ALL.filter(x => inSubj(x.r));
SROWS.forEach((x, s) => (x.s = s));
const NM = Math.floor((SROWS.length - 1) / MILE); // milestones 1..NM
const cutG = j => SROWS[j * MILE].g; // the global position of the milestone's first row after it
const mileOf = s => Math.min(NM, Math.floor(s / MILE)); // 0: before the first milestone
const STARTS = opt('starts') ? JSON.parse(fs.readFileSync(opt('starts'), 'utf8')) : {};
const startRec = id => {
  try {
    return STARTS[id] ? JSON.parse(STARTS[id]) : null;
  } catch (e) {
    return null;
  }
};

// Today's format offsets as the scorer logged them (step 2's FMT: the latest offset logged per format), for BASE's
// rows logged before the scoring record.
const FMT = {};
SROWS.forEach(x => {
  const sc = C.scoreRec(x.r[23]);
  if (sc) FMT[C.fmtOf(String(x.r[6] || ''), split(x.r[12]).length)] = sc.o || 0;
});

// Each answer's inputs (replay.js prep), plus the unit and subject counts before it and its photos' memory buckets.
const BY = {};
SROWS.forEach(x => (BY[x.r[1]] = BY[x.r[1]] || []).push(x));
const PRE = {};
Object.keys(BY).forEach(id => {
  const seen = {},
    H = {};
  PRE[id] = BY[id].map((x, n) => {
    const r = x.r,
      mode = String(r[6] || ''),
      chs = split(r[12]),
      t = String(r[3]),
      ph = split(r[7]),
      sc = C.scoreRec(r[23]),
      k = C.kOf(mode, r[12]),
      e = num(r[9]),
      th = num(r[10]),
      rec = startRec(id);
    const a = {
      p: id,
      at: x.at,
      gp: x.g,
      s: x.s,
      t,
      c: String(r[4] || ''),
      ok: String(r[5]) === '1',
      mode,
      ph,
      chs,
      chRaw: r[12],
      sec: num(r[13]),
      e,
      th,
      sc,
      k,
      g: isFinite(k) ? 1 / k : 0,
      fmt: C.fmtOf(mode, chs.length),
      m: seen[t] || 0,
      n,
      bk: ph.map(f => C.memBucket(H[f])),
      hs: ph.map(f => (H[f] ? H[f].slice() : [0, 0])),
      pr: rec ? C.startPriorAt(rec, x.at) : 0,
      old: r[18] === ''
    };
    seen[t] = a.m + 1;
    ph.forEach(f => {
      const h = (H[f] = H[f] || [0, 0]);
      h[0]++;
      h[1] += a.ok ? 1 : 0;
    });
    // A corallites hint revealed after the answer (scoring record h) was shown, never recognised: shown once more,
    // never right, as core.js scoreAnswer counts it.
    if (sc && sc.h) (H[sc.h] = H[sc.h] || [0, 0])[0]++;
    a.replayable = ph.length > 0 && k > 1 && (!!sc || (isFinite(e) && isFinite(th)));
    if (sc)
      Object.assign(a, {d0: sc.d, fam: sc.f || 0, cf: sc.c || 0, R: sc.r === undefined ? 1 : sc.r, df: sc.o || 0, S: sc.s || 1, src: 'sc'});
    else if (a.replayable) {
      const q = clamp((e - a.g) / (1 - a.g), 0.005, 0.995);
      Object.assign(a, {d0: th - logit(q), fam: 0, cf: 0, R: 1, df: FMT[a.fmt] || 0, S: 1, src: 'log'});
    }
    return a;
  });
});
const players = Object.keys(PRE);

// ---- Today's values from the rows before a global position (optionally without one player), as the sheet serves
// them (?stats=1): the photo ratings (eloOf), the unit offsets (genusOffsetsOf), the memory offsets (photoMemOf), all
// three from core.js eloReplay, and the format offsets (fmtOffsetsOf), on the rows of the one subject the sheet rates
// (Code.gs stats_ reads answerRows_, SUBJECTS replay: the corals). Another subject (fish) is served none of them: the
// app scores it with its judged eases alone, the memory prior and every format offset 0 (model.js pmem, pfmt).
const RATED = C.SUBJECTS.find(S => S.replay).id === SUBJ;
function todayAt(g, without) {
  if (!RATED) return {P: {}, G: {}, mem: C.memOf(), fmt: {}};
  const rows = [];
  for (let i = 0; i < g; i++) if (ALL[i].row[0] !== without && inSubj(ALL[i].r)) rows.push(ALL[i].row);
  return {P: C.eloOf(rows), G: C.genusOffsetsOf(rows), mem: C.photoMemOf(rows).mem, fmt: C.fmtOffsetsOf(rows)};
}
// model.js photoDiff on those values: the rating served (unit offset + residual) blended with the prior (the unit's
// offset, plus a fish photo's ease) by its weighed answers.
function tdPhoto(V, unit, f) {
  const gd = V.G[unit] ? V.G[unit][0] : 0,
    prior = gd + easePart(f),
    o = V.P[f];
  const d = o ? (o[1] * o[0] + PW * prior) / (o[1] + PW) : prior;
  return {d, rho: d - gd};
}
// A question's inputs under today's values V: difficulty (+ SOLO for a photo alone), memory, format offset, and the
// photo residual rho (the mean over its photos of its difficulty minus its unit's part).
function tdInputs(V, a) {
  const ds = a.ph.map(f => tdPhoto(V, a.t, f)),
    mean = k => ds.reduce((t, x) => t + x[k], 0) / ds.length;
  return {
    d0: (a.ph.length === 1 ? SOLO : 0) + mean('d'),
    fam: a.hs.reduce((t, h) => t + V.mem[C.memBucket(h)], 0) / a.hs.length,
    cf: a.cf,
    df: C.fmtOff(V.fmt, a.fmt),
    rho: mean('rho')
  };
}
// The same under a refit F (refit.py): unit offset b, photo r (its ease's part kappa (3 - ease) included), single-photo
// term s, memory offsets, format offsets; shifted so that the 4-choice offset is 0 (the location is not identified
// between players and items; the scorer's abilities take it).
function rfInputs(F, a) {
  const o4 = F.o.k4 || 0,
    b = (F.b[a.t] || [0])[0],
    rs = a.ph.map(f => (F.r[f] ? F.r[f][0] : F.kappa * (EASE[f] ? EASE_MID - EASE[f] : 0))),
    rho = rs.reduce((t, x) => t + x, 0) / rs.length;
  return {
    d0: (a.ph.length === 1 ? F.s : 0) + b + rho - o4 + (F.shift || 0),
    fam: a.bk.reduce((t, k) => t + F.mem[k], 0) / a.bk.length,
    cf: a.cf,
    df: (F.o[a.fmt] || 0) - o4,
    rho
  };
}

// ---- The scorer replay (replay.js base): inp(a) gives the question's inputs (null: the logged ones), eta the drift.
function run(list, inp, eta = 0) {
  const P = {},
    out = [];
  list.forEach(a => {
    if (!a.replayable) {
      C.scoreAnswer(P, {
        t: a.t,
        c: a.c,
        ok: a.ok,
        k: a.k,
        chs: a.chs,
        ph: a.ph,
        cv: false,
        p: a.pr,
        sec: a.sec,
        timed: true,
        rt: false,
        d0: null
      });
      out.push(null);
      return;
    }
    const q = (inp && inp(a)) || a;
    const res = C.scoreAnswer(P, {
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
      d0: q.d0,
      fam: q.fam,
      cf: q.cf,
      R: a.R,
      df: q.df,
      S: a.S,
      look: false,
      dom: true
    });
    const th = res.th0,
      x = a.S * (th - (q.d0 + q.fam + q.cf) + q.df),
      p = a.g + (1 - a.g) * a.R * sig(x);
    // The drift: the unit shown, after its own steps, misses included; its record clamped as eloStep clamps it.
    if (eta && P[a.t] && typeof P[a.t].th === 'number') P[a.t].th = r2(clamp(P[a.t].th + eta, C.ELO.lo, C.ELO.hi));
    out.push({th, x, p, rho: q.rho});
  });
  return {out, P};
}
const nScored = id => PRE[id].filter(a => a.replayable).length;
const incl = players.filter(id => nScored(id) >= 20);

// ---- check
if (MODE === 'check') {
  const st = {n: 0, d05: 0, f05: 0, o05: 0, dd: [], df: [], do: []},
    cache = {};
  incl.forEach(id =>
    PRE[id].forEach(a => {
      if (!a.replayable || a.src !== 'sc') return;
      const V = (cache[a.gp] = cache[a.gp] || todayAt(a.gp)),
        q = tdInputs(V, a),
        dd = Math.abs(q.d0 - a.d0),
        dfm = Math.abs(q.fam - a.fam),
        dof = Math.abs(q.df - a.df);
      st.n++;
      st.dd.push(dd);
      st.df.push(dfm);
      st.do.push(dof);
      if (dd <= 0.05) st.d05++;
      else
        ((st.day = st.day || {}),
          (st.day[new Date(a.at + 8 * 3600e3).toISOString().slice(5, 10)] =
            (st.day[new Date(a.at + 8 * 3600e3).toISOString().slice(5, 10)] || 0) + 1));
      if (dfm <= 0.05) st.f05++;
      if (dof <= 0.05) st.o05++;
    })
  );
  const med = v => v.slice().sort((x, y) => x - y)[Math.floor(v.length / 2)],
    q9 = v => v.slice().sort((x, y) => x - y)[Math.floor(v.length * 0.9)];
  console.log(
    SUBJ,
    `rows with a scoring record ${st.n}: difficulty within 0.05 ${st.d05} (median gap ${med(st.dd).toFixed(3)}, 90th ${q9(st.dd).toFixed(3)}); ` +
      `memory within 0.05 ${st.f05} (median ${med(st.df).toFixed(3)}); format offset within 0.05 ${st.o05} (median ${med(st.do).toFixed(3)})`
  );
  console.log('  difficulty gaps over 0.05, by day (Manila):', JSON.stringify(st.day || {}));
  process.exit(0);
}

// ---- export: the rows the batch model is fitted on, with the milestones and the trusted players before each.
if (MODE === 'export') {
  const rows = [];
  players.forEach(id =>
    PRE[id].forEach(a => {
      if (!a.replayable) return;
      rows.push({
        p: id,
        t: a.t,
        ph: a.ph,
        ez: a.ph.map(f => (EASE[f] ? EASE_MID - EASE[f] : 0)),
        solo: a.ph.length === 1 ? 1 : 0,
        fmt: a.fmt,
        g: a.g,
        R: a.R,
        y: a.ok ? 1 : 0,
        m: a.m,
        n: a.n,
        bk: a.bk,
        c: a.cf,
        s: a.s
      });
    })
  );
  rows.sort((x, y) => x.s - y.s);
  const trustBefore = s => {
    const tr = C.trustOf(SROWS.slice(0, s).map(x => x.row));
    return Object.keys(tr).filter(k => tr[k]);
  };
  const mil = [];
  for (let j = 1; j <= NM; j++) mil.push({j, s: j * MILE, trusted: trustBefore(j * MILE)});
  fs.writeFileSync(
    OUT,
    JSON.stringify({
      subj: SUBJ,
      fish: SUBJ === 'fish',
      rows,
      milestones: mil,
      full: {s: SROWS.length, trusted: trustBefore(SROWS.length)},
      incl
    })
  );
  console.log(
    SUBJ,
    'export rows',
    rows.length,
    'milestones',
    mil.map(m => [m.s, m.trusted.length]),
    'full trusted',
    trustBefore(SROWS.length).length
  );
  process.exit(0);
}

// ---- arms
const FITS = JSON.parse(fs.readFileSync(opt('fits'), 'utf8'));
// --anchor (exploratory, after looking at the declared run): the batch model's location is not identified between the
// players and the items, and the declared anchor (the 4-choice offset at 0) leaves it to the single-photo term when
// nearly every question shows one photo (fish). With --anchor the refit's question difficulties (format offset taken
// off) are shifted so that their mean over the answers before the milestone equals today's on the same answers, so
// the abilities learned before it keep their scale. Only answers before the milestone are used.
function anchored(F, V, j, without) {
  if (!flag('anchor')) return F;
  let t = 0,
    n = 0;
  players.forEach(id => {
    if (id === without) return;
    PRE[id].forEach(a => {
      if (!a.replayable || a.s >= j * MILE) return;
      const qt = tdInputs(V, a),
        qr = rfInputs(F, a);
      t += qt.d0 - qt.df - (qr.d0 - qr.df);
      n++;
    });
  });
  return {...F, shift: n ? t / n : 0};
}
const TD = {},
  RF = {};
for (let j = 1; j <= NM; j++) {
  TD[j] = todayAt(cutG(j));
  RF[j] = anchored(FITS[String(j)], TD[j], j);
}
const armInp = (V, fn) => a => (a.s >= MILE ? fn(V[mileOf(a.s)], a) : null);
const ll = (p, y) => -(y ? Math.log(p) : Math.log(1 - p));
const B = {},
  T = {},
  Rf = {};
incl.forEach(id => {
  B[id] = run(PRE[id]);
  T[id] = run(PRE[id], armInp(TD, tdInputs));
  Rf[id] = run(PRE[id], armInp(RF, rfInputs));
});
// BASE's photo residual, descriptive: the one today's sheet served at each answer, reconstructed online.
const rhoB = {},
  cache = {};
incl.forEach(id => {
  rhoB[id] = PRE[id].map(a => {
    if (!a.replayable) return null;
    const V = (cache[a.gp] = cache[a.gp] || todayAt(a.gp));
    return tdInputs(V, a).rho;
  });
});

// DRIFT: eta by leave one player out, and the delete-one-player replicates of that choice (replay.js lopo).
const tot = ETA.map(eta => {
  const per = {};
  incl.forEach(id => {
    const o = run(PRE[id], null, eta).out;
    per[id] = PRE[id].reduce((s, a, i) => s + (o[i] ? ll(o[i].p, a.ok ? 1 : 0) : 0), 0);
  });
  return per;
});
const all = tot.map(per => incl.reduce((s, id) => s + per[id], 0));
const pick = (id, q) => {
  let best = -1,
    bv = Infinity;
  all.forEach((v, j) => {
    const w = v - tot[j][id] - (q ? tot[j][q] : 0);
    if (w < bv) ((bv = w), (best = j));
  });
  return best;
};
const runEta = {},
  driftOf = j => (runEta[j] = runEta[j] || Object.fromEntries(incl.map(id => [id, run(PRE[id], null, ETA[j]).out])));
const chosen = {},
  D = {};
incl.forEach(id => {
  const j = pick(id);
  chosen[id] = ETA[j];
  D[id] = driftOf(j)[id];
});
const jkD = {};
incl.forEach(q => {
  jkD[q] = {};
  incl.forEach(id => id !== q && (jkD[q][id] = driftOf(pick(id, q))[id].map(z => (z ? z.x : null))));
});

// The delete-one-player replicates of TODAY and REFIT (test 2): today's values recomputed and the batch refitted
// without that player, every other player replayed.
const fc = id => PRE[id].filter(a => a.replayable && a.s >= MILE).length;
const inclF = incl.filter(id => fc(id) >= 20);
const jkT = {};
inclF.forEach(q => {
  const TDq = {},
    RFq = {};
  for (let j = 1; j <= NM; j++) {
    TDq[j] = todayAt(cutG(j), q);
    RFq[j] = anchored(FITS[`${j}|${q}`], TDq[j], j, q);
  }
  jkT[q] = {};
  incl.forEach(id => {
    if (id === q) return;
    const t = run(PRE[id], armInp(TDq, tdInputs)).out,
      r = run(PRE[id], armInp(RFq, rfInputs)).out;
    jkT[q][id] = {T: t.map(z => (z ? [z.x, z.rho] : null)), R: r.map(z => (z ? [z.x, z.rho] : null))};
  });
});

// The end of the log: today's values and BASE's final abilities, for the comparison with the full refit.
const TE = todayAt(ALL.length);
const units = {},
  photos = {};
SROWS.forEach(x => {
  units[String(x.r[3])] = 1;
  split(x.r[7]).forEach(f => (photos[f] = String(x.r[3])));
});
const end = {
  units: Object.keys(units).map(u => [u, TE.G[u] ? TE.G[u][0] : null, TE.G[u] ? TE.G[u][1] : 0]),
  photos: Object.keys(photos).map(f => {
    const q = tdPhoto(TE, photos[f], f),
      P = TE.P[f];
    return [f, photos[f], q.d, q.rho, P ? P[1] : 0, P ? P[3] : 0];
  }),
  mem: TE.mem,
  fmt: TE.fmt,
  solo: SOLO,
  abilities: Object.fromEntries(
    incl.map(id => {
      const P = B[id].P,
        cnt = {};
      PRE[id].forEach(a => (cnt[a.t] = (cnt[a.t] || 0) + 1));
      return [id, {n: PRE[id].length, u: Object.fromEntries(Object.keys(cnt).map(u => [u, [C.abilityOf(P, u, 0), cnt[u]]]))}];
    })
  )
};

const rowsOut = [],
  idx = [];
incl.forEach(id =>
  PRE[id].forEach((a, i) => {
    const b = B[id].out[i];
    if (!b) return;
    idx.push([id, i]);
    rowsOut.push({
      p: id,
      at: a.at,
      s: a.s,
      fc: a.s >= MILE,
      mi: mileOf(a.s),
      y: a.ok ? 1 : 0,
      g: a.g,
      R: a.R,
      fmt: a.fmt,
      m: a.m,
      old: a.old,
      src: a.src,
      d0: a.d0,
      solo: a.ph.length === 1 ? 1 : 0,
      base: [b.x, b.p, rhoB[id][i]],
      TODAY: [T[id].out[i].x, T[id].out[i].p, T[id].out[i].rho],
      REFIT: [Rf[id].out[i].x, Rf[id].out[i].p, Rf[id].out[i].rho],
      DRIFT: [D[id][i].x, D[id][i].p]
    });
  })
);
const along = f => idx.map(([id, i]) => f(id, i));
fs.writeFileSync(
  OUT,
  JSON.stringify({
    subj: SUBJ,
    players: incl,
    playersF: inclF,
    milestones: Array.from({length: NM}, (_, j) => (j + 1) * MILE),
    eta: ETA,
    chosen,
    bestAll: ETA[all.indexOf(Math.min(...all))],
    jkD: Object.fromEntries(incl.map(q => [q, along((id, i) => (id === q ? null : jkD[q][id][i]))])),
    jkT: Object.fromEntries(
      inclF.map(q => [
        q,
        {T: along((id, i) => (id === q ? null : jkT[q][id].T[i])), R: along((id, i) => (id === q ? null : jkT[q][id].R[i]))}
      ])
    ),
    end,
    rows: rowsOut
  })
);
console.log('refit shift by milestone', JSON.stringify(Object.values(RF).map(F => +(F.shift || 0).toFixed(3))));
console.log(
  SUBJ,
  'players',
  incl.length,
  'with 20+ forecast answers',
  inclF.length,
  'scored',
  rowsOut.length,
  'forecast',
  rowsOut.filter(r => r.fc).length
);
