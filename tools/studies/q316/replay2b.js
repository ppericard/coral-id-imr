// Q316's side check 2B on the real log (tools/studies/q316/README.md, "2B"): the step-2 candidates against today's
// engine, each answer scored before it moves anything, players as the unit. Read-only; its decision rule is declared
// here (RULES, printed at the head of every run) and in the README, before any real run.
//
//   node tools/studies/q316/replay2b.js <run dir> <log.json> [--python python3] [--deadline <epoch s>]
//
// <run dir>: the out directory of tools/studies/q316/run.py (outside the repository): its export-<s>.json, labels-<s>.json,
// ref-<s>.json and fit-<s>.json (the acceptance report). The log is read again (prep.js load) for the engine's own replay;
// the names are replaced by the labels at load and never printed or written. Writes 2b-<s>.json and the half fits
// (export-<s>-A.json, fit-<s>-A.json, ...) into the run dir.
//
// What scores an answer, the same in every arm, so that only the photo difficulty differs:
//   e = g + (1 - g) R sig(S (th - (d + f + c)))   (core.js scoreAnswer's expectation)
// th the ability the app logged with the answer (the Ability column: the player's real unit ability, with their own
// first-launch prior, so no start record is needed), f, c, R, S its scoring record's memory, mix-ups, recall and slope;
// d the question's photo difficulty, the arm's: solo + the mean over its photos (quiz.js d0).
// Arms:
//   log  d as the game logged it (sc.d): the check that the formula reproduces the logged expected (no verdict on it).
//   1    today's engine: model.js photoDiff (the app's own function, run from its source) on the sheet's pass over the
//        answers before this one (core.js eloReplay, the engine's own replay, called on each prefix of the log, so trust,
//        the memory offsets and the time term are those of that prefix).
//   2    the shared chain (docs/reference/lit-componential-difficulty.md section 5): one difficulty per question =
//        rank offset + family + genus + species (fish; corals: genus) + the mean of the photos' parts, each part a mean
//        and a variance, the surprise of each trusted answer split among the parts by their variances (the Kalman /
//        TrueSkill rule), against the arm's own sheet chain (a player level stepped as eloReplay steps R, against this
//        arm's expectation); the memory offsets and trust of the prefix (shared with arm 1). The prior SDs from a fit on
//        the other half of the players (RULES.halves), or the v31-equivalent (RULES.fallback).
//   4b   arm 2 with each item rated against the chain plus the app's delta (Q136, #637's variant);
//   4c   arm 2 with the chain plus the centred delta (delta less the unit's mean over players).
//   3    (the sibling term) is not run: the fit does not estimate it by default (README).
const fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  {spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..', '..', '..');
const C = require(path.join(ROOT, 'core.js')),
  Pr = require(path.join(__dirname, 'prep.js')),
  K = require(path.join(__dirname, 'checks.js')),
  AE = require(path.join(ROOT, 'tools', 'abilityeval.js')),
  block = require(path.join(ROOT, 'tests', 'block.js'));

// ---- Declared before any real run (the README repeats them; tests/q316.test.js checks they agree).
const RULES = {
  primary: {
    arms: '2 against 1',
    answers: 'fish answers with a scoring record and 2 or more plausible choices whose photos each had fewer than 3 earlier answers by players trusted at that moment (trust of the prefix)',
    measure: 'next-answer log-loss, each player one mean difference d_p (arm 2 - arm 1)',
    test: 'exact two-sided sign-flip over the players with 20 or more primary answers, alpha 0.05',
    minPlayers: 6, // fewer such players: the measure cannot tell, no test
    minAnswers: 20,
    alpha: 0.05,
    rule: 'arm 2 better = mean d_p below 0 at p < 0.05; worse = above 0 at p < 0.05; otherwise the measure cannot tell'
  },
  halves: 'players by label: odd labels (P1, P3...) half A, even half B; each half scored with the SDs fitted on the other half (fit.py --no-accept)',
  fallback:
    "a level whose SD failed the full fit's acceptance test (not estimable) takes its v31-equivalent variance K / a*, a* the gradient of one answer at the game's target (ability 1 above, 4 choices), K today's step: photo 0.8, unit GENUS_K 0.4 (the fish levels that fail share the unit's variance equally); genus or species failing with the shared SD passing: both take the shared SD of the full fit; a rank offset that failed: an online part of its own from 0 with the unit's v31-equivalent variance",
  shared: "photo prior mean (fish): today's (3 - judged ease) x calibOf(subject).ease, not the fit's kappa; the time term (core.js ptimeOff) of the prefix added in every arm",
  exploratory: 'all fish answers; genus-rank answers; the corals (answers with a scoring record); arms 4b, 4c against 2; calibration by rank, format and level band; compression (slope of each arm\'s end-of-log unit offsets on the offline D(u), units with 20 or more answers)',
  minutes: 40 // its own clock (rule L11), from when the machine slot is held
};
const CANNOT = 'the measure cannot tell';

// ---- The engine's own functions: core.js eloReplay (not exported: the source with it added to the export list, run
// in a vm) and model.js photoDiff (its source, as tests/fishstats.test.js runs it).
function engine() {
  const src = fs.readFileSync(path.join(ROOT, 'core.js'), 'utf8'),
    mark = '\n    eloOf,\n';
  if (src.indexOf(mark) < 0 || src.indexOf(mark) !== src.lastIndexOf(mark)) throw new Error('replay2b: core.js export list changed (eloOf)');
  const ctx = vm.createContext({module: {exports: {}}, console});
  vm.runInContext(src.replace(mark, '\n    eloOf,\n    eloReplay,\n'), ctx, {filename: 'core.js'});
  return ctx.module.exports;
}
function photoDiffOf(S) {
  // GX: no unit records here, so model.js easeMid centres a judged prior on the scale's middle, as when this study ran.
  const c = vm.createContext({SUBJ: S, calibOf: C.calibOf, PGD: {}, PSTAT: {}, PTM: {}, ptimeOff: C.ptimeOff, GX: () => undefined});
  const src = fs.readFileSync(path.join(ROOT, 'model.js'), 'utf8');
  vm.runInContext(block(src, 'const PDIFF = {', '\n}\n', {through: 1, file: 'model.js'}) + '\nthis.photoDiff = photoDiff;', c);
  return c;
}
// eloOf's and genusOffsetsOf's served form from one eloReplay (the same rounding; tests/q316.test.js checks it equals
// C.eloOf and C.genusOffsetsOf), so one replay per prefix serves both.
function served(E) {
  const photos = {};
  Object.keys(E.P).forEach(f => {
    const p = E.P[f];
    photos[f] = [Math.round((E.G[E.PG[f]][0] + p[0]) * 100) / 100, Math.round(p[2] * 10) / 10, Math.round(p[1] * 10) / 10, p[3], E.PG[f]];
  });
  const gd = Object.fromEntries(Object.entries(E.G).map(([n, o]) => [n, [Math.round(o[0] * 100) / 100, Math.round(o[1] * 10) / 10]]));
  return {photos: C.ptimeInto(photos, E.TM), gd, ptm: C.ptimeOut(E.TM)};
}

// ---- Arm 2's online update (docs/reference/lit-componential-difficulty.md section 5), one state per SD set.
const sig = x => 1 / (1 + Math.exp(-x));
// a*: the gradient of one answer's log-likelihood in eta per unit of surprise at the game's target (x = 1, 4 choices).
const aStar = (() => {
  const g = 0.25,
    s = sig(1),
    e = g + (1 - g) * s;
  return ((1 - g) * s * (1 - s)) / (e * (1 - e));
})();
const V31 = {photo: 0.8 / aStar, unit: 0.4 / aStar};

// The prior variance of each level: vars {fam, gen, sp, photo, r_genus, r_species: number | 'online'}, from the half
// fit H (fit.py fit --no-accept), the full fit's report (fit-<s>.json report, report_shared) and RULES.fallback.
// ranks: the ranks other than the family's that the subject's answers ask (from the whole export), so a rank whose
// answers all fall in one half still gets its part in the other half's state (Codex #1373).
function variances(subject, H, full, ranks = []) {
  const rep = (full && full.report) || {},
    shr = (full && full.report_shared) || {},
    pass = k => rep[k] && rep[k].verdict === 'pass',
    levels = subject === 'fish' ? ['fam', 'gen', 'sp'] : ['gen'],
    out = {},
    src = {};
  const failed = levels.filter(k => !pass(k) && !((k === 'gen' || k === 'sp') && shr.gs && shr.gs.verdict === 'pass'));
  levels.forEach(k => {
    if (pass(k) && H.sd[k]) ((out[k] = H.sd[k][0] ** 2), (src[k] = 'half fit'));
    else if ((k === 'gen' || k === 'sp') && shr.gs && shr.gs.verdict === 'pass')
      ((out[k] = full.fit_shared.sd.gs[0] ** 2), (src[k] = 'full fit, shared SD'));
    else ((out[k] = V31.unit / failed.length), (src[k] = 'v31-equivalent'));
  });
  if (pass('photo') && H.sd.photo) ((out.photo = H.sd.photo[0] ** 2), (src.photo = 'half fit'));
  else ((out.photo = V31.photo), (src.photo = 'v31-equivalent'));
  ['r_genus', 'r_species'].forEach(k => {
    const has = (H.fixed || {})[k];
    if (!has && !ranks.includes(k.slice(2)) && !rep[k]) return; // a rank no answer asks
    if (pass(k) && has) ((out[k] = H.fixed[k][0]), (src[k] = 'half fit (fixed)'));
    else ((out[k] = 'online'), (src[k] = has ? 'online, v31-equivalent' : 'online, v31-equivalent (no half-fit estimate)'));
  });
  return {v: out, src};
}

// One arm-2 state. o.person: 'chain' (arm 2), 'delta' (4b), 'centred' (4c).
function chainState(subject, V, o = {}) {
  return {subject, V, person: o.person || 'chain', m: Object.create(null), v: Object.create(null), R: Object.create(null), H: Object.create(null), du: Object.create(null)};
}
// The parts on a question's path with their coefficient and prior: [key, coef, prior mean, prior variance].
function pathOf(st, r) {
  const V = st.V,
    out = [];
  if (st.subject === 'fish') {
    if (r.F) out.push(['F|' + r.F, 1, 0, V.fam]);
    if (r.G) out.push(['G|' + r.G, 1, 0, V.gen]);
    if (r.S) out.push(['S|' + r.S, 1, 0, V.sp]);
    const rk = 'r_' + r.rk;
    if (V[rk] === 'online') out.push([rk, 1, 0, V31.unit]);
  } else out.push(['G|' + r.G, 1, 0, V.gen]);
  r.ph.forEach((f, j) => out.push(['I|' + f, 1 / r.ph.length, r.mu[j], V.photo]));
  return out;
}
const fixedRank = (st, r) => (typeof st.V['r_' + r.rk] === 'number' ? st.V['r_' + r.rk] : 0);
// The question's difficulty in the arm (without the single view and the time term): rank + the parts' means.
function chainD(st, r) {
  return fixedRank(st, r) + pathOf(st, r).reduce((t, [k, a, mu]) => t + a * (k in st.m ? st.m[k] : mu), 0);
}
// One answer of the prefix pass (rows in time order): x = {r (export row), w (raw row), trusted, mem, delta}.
// The level steps on every answer with photos, the parts on a trusted one's, as eloReplay does with R and the photos.
function chainStep(st, x) {
  const r = x.r;
  if (!r.ph.length || !x.w[0]) return; // eloReplay: an answer without photos moves nothing (Codex #1310)
  const g = r.g,
    ok = r.y,
    ra = (st.R[r.p] = st.R[r.p] || [C.PLAYER0, 0]),
    hs = r.ph.map(f => (st.H[r.p + '|' + f] = st.H[r.p + '|' + f] || [0, 0])),
    b = chainD(st, r) + (r.ph.length === 1 ? 0.5 : 0),
    memo = C.memFam(hs, x.mem),
    n = ra[1];
  const lvl = () => {
    const s = sig(ra[0] - b - memo),
      e = g + (1 - g) * s;
    return ok - e;
  };
  if (x.trusted) {
    let th = ra[0];
    if (st.person !== 'chain' && x.delta != null) {
      const u = (st.du[r.u] = st.du[r.u] || Object.create(null)),
        others = Object.keys(u).filter(p => p !== r.p),
        mu = st.person === 'centred' && others.length ? others.reduce((t, p) => t + u[p], 0) / others.length : 0;
      th += x.delta - mu;
    }
    const s = sig(th - b - memo),
      e = g + (1 - g) * s,
      d = ok - e,
      w = n / (n + C.PHOTO_W.N),
      ve = Math.max(1e-6, e * (1 - e)),
      a = ((1 - g) * s * (1 - s)) / ve,
      h = ((1 - g) * s * (1 - s)) ** 2 / ve,
      P = pathOf(st, r);
    P.forEach(([k, , mu, v0]) => {
      if (!(k in st.m)) ((st.m[k] = mu), (st.v[k] = v0));
    });
    const Vt = P.reduce((t, [k, c]) => t + st.v[k] * c * c, 0),
      den = 1 + w * Vt * h;
    P.forEach(([k, c]) => {
      const v = st.v[k];
      st.m[k] -= (w * v * c * a * d) / den;
      st.v[k] = v - (w * v * v * c * c * h) / den;
    });
  }
  if (st.person !== 'chain' && x.delta != null) (st.du[r.u] = st.du[r.u] || Object.create(null))[r.p] = x.delta;
  ra[0] += (0.6 / (1 + n / 40)) * lvl();
  ra[1]++;
  hs.forEach(h => ((h[0] += 1), (h[1] += ok)));
}

// ---- Scoring (core.js scoreAnswer's expectation, the logged ability).
function expected(r, d) {
  const S = r.Sl || 1;
  return r.g + (1 - r.g) * (r.R == null ? 1 : r.R) * sig(S * (r.th - (d + (r.mem || 0) + (r.cf || 0))));
}
const LL = (p, y) => {
  const q = Math.min(1 - 1e-6, Math.max(1e-6, p));
  return -Math.log(y ? q : 1 - q);
};
// A typed answer (core.js kOf Infinity, which prep.js's JSON keeps as null; guess rate 0) counts: it has unlimited
// plausible choices (Codex #1373).
const typedK = r => r.k == null && C.TYPED_RE.test(String(r.mode || ''));
const scorable = r =>
  r.sc && ((r.k != null && r.k > 1) || typedK(r)) && isFinite(r.th) && r.th != null && r.d0 != null && r.ph.length > 0;

// The paired comparison, players as the unit (abilityeval.js signFlip, tQuantile), on the answers keep() holds.
function compare(rows, A, B, keep, minAnswers = RULES.primary.minAnswers) {
  const by = new Map();
  rows.forEach((r, i) => {
    if (!keep(r, i) || A[i] == null || B[i] == null) return;
    if (!by.has(r.p)) by.set(r.p, []);
    by.get(r.p).push(LL(B[i], r.y) - LL(A[i], r.y));
  });
  const per = [...by.entries()].map(([p, l]) => ({p, n: l.length, d: l.reduce((t, x) => t + x, 0) / l.length}));
  const units = per.filter(x => x.n >= minAnswers),
    d = units.map(x => x.d),
    n = d.length,
    m = n ? d.reduce((t, x) => t + x, 0) / n : NaN,
    sd = n > 1 ? Math.sqrt(d.reduce((t, x) => t + (x - m) ** 2, 0) / (n - 1)) : NaN,
    hw = n > 1 ? (AE.tQuantile(0.975, n - 1) * sd) / Math.sqrt(n) : NaN,
    sf = n ? AE.signFlip(d) : {p: NaN};
  return {
    players: n,
    answers: units.reduce((t, x) => t + x.n, 0),
    mean: m,
    ci95: [m - hw, m + hw],
    p: sf.p,
    better: d.filter(x => x < 0).length,
    per: per.map(x => ({p: x.p, n: x.n, d: x.d}))
  };
}
function verdict(c, R = RULES.primary) {
  if (c.players < R.minPlayers) return CANNOT;
  if (c.p < R.alpha) return c.mean < 0 ? 'arm 2 predicts better' : 'arm 2 predicts worse';
  return CANNOT;
}
// Calibration cells: mean expected against the right rate, per cell (descriptive).
function calibration(rows, E, keep, cell) {
  const c = {};
  rows.forEach((r, i) => {
    if (!keep(r, i) || E[i] == null) return;
    const k = cell(r),
      x = (c[k] = c[k] || [0, 0, 0]);
    x[0]++;
    x[1] += E[i];
    x[2] += r.y;
  });
  return Object.fromEntries(Object.entries(c).map(([k, x]) => [k, {n: x[0], expected: x[1] / x[0], right: x[2] / x[0]}]));
}
const band = th => (th < 0 ? '<0' : th < 1 ? '0-1' : th < 2 ? '1-2' : '>=2');
const slope = (xs, ys) => {
  const n = xs.length,
    mx = xs.reduce((t, x) => t + x, 0) / n,
    my = ys.reduce((t, y) => t + y, 0) / n,
    sxx = xs.reduce((t, x) => t + (x - mx) ** 2, 0),
    sxy = xs.reduce((t, x, i) => t + (x - mx) * (ys[i] - my), 0);
  return n > 2 && sxx > 0 ? sxy / sxx : NaN;
};

// ---- The replay itself. raw: the subject's log rows in time order (labels for names); X: prep.js's export of the same
// rows (same order); fits: {A, B} half fits; full: fit-<s>.json. Returns the per-answer predictions and the tables.
function replay(raw, X, fits, full, {deadline = null, ER = engine(), S = null} = {}) {
  const subject = X.subject,
    rows = X.rows,
    Sj = S || C.SUBJECTS.find(s => s.id === subject),
    PD = photoDiffOf(Sj),
    ez = C.calibOf(Sj).ease,
    end = K.capDeadline(deadline),
    half = p => (Number(String(p).slice(1)) % 2 ? 'A' : 'B');
  if (raw.length !== rows.length) throw new Error('replay2b: the log and the export differ in length');
  rows.forEach((r, i) => {
    if (raw[i][1] !== r.t || raw[i][0] !== r.p) throw new Error('replay2b: the log and the export are not in the same order at row ' + i);
    r.mu = r.ph.map((f, j) => (subject === 'fish' && r.ez && r.ez[j] ? r.ez[j] * ez : 0)); // today's photo prior (RULES.shared)
  });
  const ranks = [...new Set(rows.map(r => r.rk).filter(k => k && k !== 'family'))],
    VA = variances(subject, fits.A, full, ranks),
    VB = variances(subject, fits.B, full, ranks);
  // Each half is scored by the state fitted on the other half: a half-A player by the B-fit state.
  const mk = person => ({A: chainState(subject, VA.v, {person}), B: chainState(subject, VB.v, {person})});
  const st = {c2: mk('chain'), b4: mk('delta'), c4: mk('centred')};
  const per = K.persons(rows, {}),
    delta = rows.map((r, i) => (per.th[i] != null && per.lvl[i] != null ? per.th[i] - per.lvl[i] : null));
  const n = rows.length,
    E = {log: new Array(n).fill(null), a1: new Array(n).fill(null), a2: new Array(n).fill(null), b4: new Array(n).fill(null), c4: new Array(n).fill(null)},
    prim = new Array(n).fill(false),
    cnt = Object.create(null); // photo -> player -> earlier answers
  let trustKey = '',
    memAt = [],
    trustAt = null,
    cut = false;
  const passRow = (j, mem, tr) => {
    const x = {r: rows[j], w: raw[j], trusted: !!tr[raw[j][0]], mem, delta: delta[j]};
    Object.values(st).forEach(s => (chainStep(s.A, x), chainStep(s.B, x)));
  };
  for (let i = 0; i < n; i++) {
    if (Date.now() / 1000 > end) {
      cut = true;
      break;
    }
    const pre = raw.slice(0, i),
      Ev = ER.eloReplay(pre),
      tr = C.trustOf(pre),
      key = Object.keys(tr)
        .filter(w => tr[w])
        .sort()
        .join(',');
    memAt[i] = Ev.mem;
    // Trust of the prefix changed: the arms' pass is made again from the first answer with it (as the sheet's pass,
    // which replays the whole log with today's trust), each answer with the memory offsets of its own prefix.
    if (key !== trustKey) {
      Object.keys(st).forEach(k => (st[k] = mk(st[k].A.person)));
      for (let j = 0; j < i; j++) passRow(j, memAt[j], tr);
      trustKey = key;
    } else if (i > 0) passRow(i - 1, memAt[i - 1], tr);
    trustAt = tr;
    const r = rows[i];
    // primary coverage: every photo with fewer than 3 earlier answers by players trusted now
    const earlier = f => Object.entries(cnt[f] || {}).reduce((t, [p, c]) => t + (trustAt[p] ? c : 0), 0);
    prim[i] = subject === 'fish' && scorable(r) && r.ph.every(f => earlier(f) < 3);
    if (scorable(r)) {
      const sv = served(Ev);
      Object.assign(PD, {PGD: sv.gd, PSTAT: sv.photos, PTM: sv.ptm});
      const solo = r.ph.length === 1 ? C.DOM.SINGLE : 0,
        mean = l => l.reduce((t, x) => t + x, 0) / l.length,
        tm = mean(r.ph.map(f => C.ptimeOff(sv.ptm[f], 5))),
        d1 = solo + mean(r.ph.map((f, j) => PD.photoDiff(r.u, {f, e: subject === 'fish' && r.ez && r.ez[j] ? 3 - r.ez[j] : undefined}))),
        other = half(r.p) === 'A' ? 'B' : 'A',
        d2 = s => solo + chainD(s[other], r) + tm;
      E.log[i] = expected(r, r.d0);
      E.a1[i] = expected(r, d1);
      E.a2[i] = expected(r, d2(st.c2));
      E.b4[i] = expected(r, d2(st.b4));
      E.c4[i] = expected(r, d2(st.c4));
    }
    r.ph.forEach(f => ((cnt[f] = cnt[f] || Object.create(null)), (cnt[f][raw[i][0]] = (cnt[f][raw[i][0]] || 0) + 1)));
  }
  // The end of the log: the last answer into the arms, with the whole log's trust (the pass made again if it changed),
  // so the end-of-log states (the compression) have the history the live offsets and the reference fit have
  // (Codex #1373). The predictions above are untouched.
  if (!cut && n) {
    const tr = C.trustOf(raw),
      key = Object.keys(tr)
        .filter(w => tr[w])
        .sort()
        .join(',');
    if (key !== trustKey) {
      Object.keys(st).forEach(k => (st[k] = mk(st[k].A.person)));
      for (let j = 0; j < n; j++) passRow(j, memAt[j], tr);
    } else passRow(n - 1, memAt[n - 1], tr);
  }
  return {E, prim, VA, VB, st, cut, rowsDone: memAt.length};
}

// The tables of one subject from a replay.
function tables(X, Rp, full, ref) {
  const rows = X.rows,
    {E, prim} = Rp,
    fish = X.subject === 'fish',
    all = (r, i) => E.a1[i] != null;
  const out = {subject: X.subject, cut: Rp.cut, rowsDone: Rp.rowsDone, variances: {A: Rp.VA, B: Rp.VB}};
  // the formula's check: the logged arm against the logged expected (rounded to 0.01 in the log)
  const dif = rows.map((r, i) => (E.log[i] != null && isFinite(r.e) && r.e != null ? Math.abs(E.log[i] - r.e) : null)).filter(x => x != null);
  out.logCheck = {answers: dif.length, within01: dif.filter(x => x <= 0.006).length, max: dif.length ? Math.max(...dif) : null};
  if (fish) {
    const c = compare(rows, E.a1, E.a2, (r, i) => prim[i]);
    out.primary = {...c, verdict: Rp.cut ? CANNOT : verdict(c)};
    out.allFish = compare(rows, E.a1, E.a2, all);
    out.genusRank = compare(rows, E.a1, E.a2, (r, i) => all(r, i) && r.rk === 'genus', 1);
  } else out.corals = compare(rows, E.a1, E.a2, all);
  // descriptive: today's engine replayed against what the game logged (how far the replay is from what it used)
  out.armLog = compare(rows, E.log, E.a1, all);
  out.arm4b = compare(rows, E.a2, E.b4, all);
  out.arm4c = compare(rows, E.a2, E.c4, all);
  out.calibration = {};
  for (const [k, Ek] of [
    ['1', E.a1],
    ['2', E.a2]
  ])
    out.calibration[k] = {
      rank: calibration(rows, Ek, all, r => r.rk),
      format: calibration(rows, Ek, all, r => r.fmt),
      band: calibration(rows, Ek, all, r => band(r.th))
    };
  // compression: each arm's end-of-log unit offsets against the offline D(u) (the reference fit), units with 20+ answers
  // a replay cut by the deadline holds only a prefix: no end-of-log compression from it (Codex #1373)
  if (Rp.cut) out.compression = {verdict: CANNOT, reason: 'the replay was cut at the deadline'};
  else if (ref && ref.fit) {
    const eff = ref.fit.effects || {},
      get = (lv, id) => ((eff[lv] || {})[id] != null ? eff[lv][id] : 0),
      fx = Object.fromEntries(Object.entries(ref.fit.fixed || {}).map(([k, v]) => [k, v[0]])),
      D = K.unitD(rows, get, fx),
      nU = {};
    rows.forEach(r => (nU[r.u] = (nU[r.u] || 0) + 1));
    const gd = K.liveUnits(rows),
      st = Rp.st.c2,
      armU = (s, u) => {
        const r = rows.find(x => x.u === u);
        let x = fixedRank(s, r) + (s.V['r_' + r.rk] === 'online' ? s.m['r_' + r.rk] || 0 : 0);
        if (fish) {
          x += s.m['F|' + r.F] || 0;
          if (r.rk !== 'family') x += s.m['G|' + r.G] || 0;
          if (r.rk === 'species') x += s.m['S|' + r.S] || 0;
        } else x += s.m['G|' + r.G] || 0;
        return x;
      };
    const us = Object.keys(D).filter(u => nU[u] >= 20 && u in gd),
      xs = us.map(u => D[u]);
    out.compression = {
      units: us.length,
      arm1: slope(xs, us.map(u => gd[u])),
      arm2: slope(xs, us.map(u => (armU(st.A, u) + armU(st.B, u)) / 2))
    };
  }
  return out;
}

// The subject's log rows for the engine's replay, in prep.js's order, the names replaced by the export's labels (map:
// label -> name, labels-<s>.json); a player the export left out (run.py --exclude) is left out here too (Codex #1373).
function rawOf(all, s, map) {
  const lab = new Map(Object.entries(map).map(([l, w]) => [w, l]));
  return C.subjRows(all, s)
    .filter(r => lab.has(r[0]))
    .map((r, i) => ({r, i}))
    .sort((a, b) => a.r[1] - b.r[1] || a.i - b.i)
    .map(x => [lab.get(x.r[0]), ...x.r.slice(1)]);
}

// The half fits (fit.py fit --no-accept on each half's rows): a fit is kept only from a run that exited 0 and wrote its
// file now (a former run's file is removed first), so a failed run never leaves a stale fit to be read (Codex #1373).
function halfFits(DIR, s, X, py, deadline, spawn = spawnSync) {
  const fits = {};
  for (const h of ['A', 'B']) {
    const keep = r => (Number(String(r.p).slice(1)) % 2 ? 'A' : 'B') === h,
      ex = path.join(DIR, `export-${s}-${h}.json`),
      out = path.join(DIR, `fit-${s}-${h}.json`);
    fs.writeFileSync(ex, JSON.stringify({...X, rows: X.rows.map(r => ({...r, use: r.use && keep(r)}))}));
    fs.rmSync(out, {force: true});
    if (deadline - Date.now() / 1000 <= 0) break;
    const r = spawn(py, [path.join(__dirname, 'fit.py'), 'fit', ex, out, '--no-accept', '--deadline', String(deadline)], {stdio: 'inherit', cwd: ROOT});
    if (!r || r.status !== 0 || !fs.existsSync(out)) break;
    const F = JSON.parse(fs.readFileSync(out, 'utf8'));
    if (!F.fit || F.cut) break;
    fits[h] = F.fit;
  }
  return fits;
}

module.exports = {RULES, V31, aStar, engine, halfFits, rawOf, photoDiffOf, served, variances, chainState, chainStep, chainD, expected, scorable, compare, verdict, replay, tables};

// ---- The run: half fits (fit.py), then the replay per subject, under one clock.
function main(argv) {
  const VAL = ['--python', '--deadline'],
    opt = n => {
      const i = argv.indexOf('--' + n);
      return i < 0 ? null : argv[i + 1];
    },
    pos = argv.filter((a, i) => !a.startsWith('--') && !VAL.includes(argv[i - 1]));
  const [DIR, LOG] = pos;
  if (!DIR || !LOG) {
    console.error('usage: node tools/studies/q316/replay2b.js <run dir> <log.json> [--python python3] [--deadline <epoch s>]');
    return 2;
  }
  if (Pr.inRepo(path.join(DIR, 'x'))) {
    console.error('replay2b.js: the run dir holds per-player rows: put it outside the repository (rule D2).');
    return 2;
  }
  require(path.join(ROOT, 'tests', 'slot.js')).guard('tools/studies/q316/replay2b.js');
  const t0 = Date.now(),
    deadline = K.capDeadline(Number(opt('deadline')) || null),
    py = opt('python') || 'python3',
    rd = f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  console.log('Declared before running: ' + JSON.stringify(RULES));
  const L = Pr.load(JSON.parse(fs.readFileSync(LOG, 'utf8'))),
    ER = engine();
  for (const s of ['fish', 'coral']) {
    if (!fs.existsSync(path.join(DIR, `export-${s}.json`))) continue;
    const X = rd(`export-${s}.json`),
      map = rd(`labels-${s}.json`),
      raw = rawOf(L.rows, s, map);
    const fits = halfFits(DIR, s, X, py, deadline);
    if (!fits.A || !fits.B) {
      console.log(`${s}: the half fits did not finish: ${CANNOT}`);
      continue;
    }
    const full = fs.existsSync(path.join(DIR, `fit-${s}.json`)) ? rd(`fit-${s}.json`) : null,
      ref = fs.existsSync(path.join(DIR, `ref-${s}.json`)) ? rd(`ref-${s}.json`) : null;
    const Rp = replay(raw, X, fits, full, {deadline, ER});
    const T = tables(X, Rp, full, ref);
    fs.writeFileSync(path.join(DIR, `2b-${s}.json`), JSON.stringify(T));
    const f = c => (c ? `${c.players} players, ${c.answers} answers, mean ${c.mean.toFixed(4)} [${c.ci95.map(x => x.toFixed(4)).join(', ')}], p ${c.p.toFixed(4)}, ${c.better} better` : '-');
    console.log(`== ${s}${T.cut ? ' (cut at the deadline)' : ''}; variances A ${JSON.stringify(T.variances.A.src)}`);
    console.log(`  formula check: ${T.logCheck.within01} of ${T.logCheck.answers} logged expected reproduced within 0.006 (max ${T.logCheck.max})`);
    if (T.primary) console.log(`  primary (arm 2 - arm 1, new fish photos): ${f(T.primary)}: ${T.primary.verdict}`);
    if (T.allFish) console.log(`  all fish answers (exploratory): ${f(T.allFish)}`);
    if (T.genusRank) console.log(`  genus-rank answers (exploratory): ${f(T.genusRank)}`);
    if (T.corals) console.log(`  corals (exploratory): ${f(T.corals)}`);
    console.log(`  4b - 2 (exploratory): ${f(T.arm4b)}; 4c - 2: ${f(T.arm4c)}`);
    console.log(`  arm 1 - logged (descriptive): ${f(T.armLog)}`);
    if (T.compression && T.compression.verdict) console.log(`  compression: ${T.compression.verdict} (${T.compression.reason})`);
    else if (T.compression) console.log(`  compression on D(u), ${T.compression.units} units: arm 1 ${T.compression.arm1.toFixed(2)}, arm 2 ${T.compression.arm2.toFixed(2)}`);
  }
  console.log(`${((Date.now() - t0) / 60000).toFixed(1)} minutes`);
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
