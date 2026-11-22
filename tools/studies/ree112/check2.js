// REE-112 part (2): are today's coral ratings, shrunk, precise enough for the placement test?
// Method declared in docs/reviews/2026-11-21-placement-shrinkage-check.md section 1 (commit e3dc326cf).
// usage: node study.js <answers.json (pseudonymised)> <cs.json> <out.json> [--planted N] [--only real|planted]
const fs = require('fs');
const C = require('/home/user/coral-id-imr/.claude/worktrees/placement-shrinkage/core.js');
const argv = process.argv.slice(2);
const [IN, CS, OUT] = argv.filter(a => !a.startsWith('--') && !/^\d+$/.test(a) && !['real', 'planted'].includes(a));
const opt = n => {
  const i = argv.indexOf('--' + n);
  return i < 0 ? null : argv[i + 1];
};
const NREP = Number(opt('planted') || 20),
  ONLY = opt('only');
const sig = x => 1 / (1 + Math.exp(-x));
const infoAt = (x, k) => {
  const s = sig(x),
    p = 1 / k + (1 - 1 / k) * s;
  return ((1 - 1 / k) * s * (1 - s)) ** 2 / (p * (1 - p));
};
const {MEM, PHOTO_W, GENUS_K, PLAYER0} = C;

// ---------- data
const RAW = JSON.parse(fs.readFileSync(IN, 'utf8'));
const atOf = t => Date.parse(String(t).replace(' ', 'T') + ':00+08:00');
const num = x => (x === '' || x == null || !isFinite(Number(x)) ? null : Number(x));
const ROWS = RAW.filter(r => ((r[18] || '') === '' || r[18] === 'coral') && String(r[6] || '') !== C.WINK_MODE)
  .map(r => {
    const a = [r[1], atOf(r[2]), String(r[3]), String(r[4]), Number(r[5]) ? 1 : 0, String(r[6]), String(r[7]), num(r[9]), num(r[10]), num(r[11]), String(r[12] || ''), null, num(r[13])];
    a.idx = r[0];
    return a;
  })
  .sort((a, b) => a[1] - b[1] || a.idx - b.idx);
const NR = ROWS.length;
const FS = ROWS.map(r => r[6].split(/\s+/).filter(Boolean));
const GU = ROWS.map(r => C.guessOf(r[5], r[10]));
const PLAYERS = [...new Set(ROWS.map(r => r[0]))];
// first sight and the player's answer number (design only)
const FIRST = new Uint8Array(NR),
  NTH = new Int32Array(NR);
{
  const seen = {},
    nth = {};
  ROWS.forEach((r, i) => {
    NTH[i] = nth[r[0]] = (nth[r[0]] || 0) + 1;
    FIRST[i] = FS[i].length > 0 && FS[i].every(f => !seen[r[0] + '|' + f]) ? 1 : 0;
    FS[i].forEach(f => (seen[r[0] + '|' + f] = 1));
  });
}
const AFTER = Number(opt('after') || 20);
const heldIdx = (p, minNth) => ROWS.map((r, i) => i).filter(i => ROWS[i][0] === p && FIRST[i] && FS[i].length === 1 && NTH[i] > minNth);

// ---------- the replay (core.js eloReplay / Code.gs statsStep_, without the time terms). y: outcomes (default the log's).
// excl: a player whose answers rate nothing; cut: a time from which no answer rates (date-cut sensitivity).
function replay(y, excl, cut) {
  const trust = C.trustOf(y ? ROWS.map((r, i) => Object.assign(r.slice(), {4: y[i]})) : ROWS);
  const P = {},
    PG = {},
    G = {},
    R = {},
    H = {},
    mem = MEM.PRIOR.slice(),
    I = [0, 0, 0, 0],
    tau = MEM.N * infoAt(1, 4),
    TH = new Float64Array(NR),
    MT = new Float64Array(NR);
  for (let i = 0; i < NR; i++) {
    const r = ROWS[i],
      fs = FS[i];
    if (!r[0] || !fs.length) continue;
    const ok = y ? y[i] : r[4],
      g = GU[i],
      ra = (R[r[0]] = R[r[0]] || [PLAYER0, 0]),
      gs = r[2],
      rt = !!trust[r[0]] && r[0] !== excl && !(cut && r[1] >= cut);
    const go = rt ? (G[gs] = G[gs] || [0, 0]) : G[gs] || [0, 0];
    const ph = fs.map(f => ((rt || !(f in PG)) && (PG[f] = gs), (P[f] = P[f] || [0, 0, 0, 0])));
    const b = go[0] + ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0);
    const hs = fs.map(f => (H[r[0] + '|' + f] = H[r[0] + '|' + f] || [0, 0]));
    const s = sig(ra[0] - b - C.memFam(hs, mem)),
      e = g + (1 - g) * s,
      d = ok - e,
      n = ra[1];
    TH[i] = ra[0];
    MT[i] = C.memFam(hs, mem);
    if (rt) {
      const w = n / (n + PHOTO_W.N),
        D = (1 - g) * s * (1 - s),
        v = Math.max(1e-6, e * (1 - e)),
        A = [0, 0, 0, 0];
      ph.forEach(p => {
        p[0] -= (0.8 / (1 + p[2] / 10) / ph.length) * d * w;
        p[2] += w;
        p[1] += ok * w;
        p[3]++;
      });
      go[0] -= (GENUS_K / (1 + go[1] / 10)) * d * w;
      go[1] += w;
      hs.forEach(h => (A[C.memBucket(h)] += 1 / hs.length));
      for (let j = 1; j < 4; j++)
        if (A[j]) {
          I[j] += (w * (D * A[j]) ** 2) / v;
          mem[j] -= (w * d * D * A[j]) / v / (tau + I[j]);
        }
    }
    ra[0] += (0.6 / (1 + n / 40)) * d;
    ra[1]++;
    hs.forEach(h => {
      h[0]++;
      h[1] += ok;
    });
  }
  return {P, PG, G, TH, MT, y, excl};
}

// ---------- predictors (post-hoc addition D: a direct MAP fit of the photo's residual on its answers, the players'
// levels and memory terms taken from the replay, the other photos of a question at their Elo residual, a N(0, TAUP^2)
// prior toward the genus offset)
const PRED = ['G', 'E', 'S2', 'S5', 'S10', 'D', 'Dt'];
let TAUP = Number(opt('taup') || 0.86);
const PROWS = {};
FS.forEach((L, i) => L.forEach(f => (PROWS[f] = PROWS[f] || []).push(i)));
let CURTAU = 0.86;
function directOf(rep, f, genus, prior) {
  const go = rep.G[genus] ? rep.G[genus][0] : 0;
  const A = [];
  (PROWS[f] || []).forEach(i => {
    if (ROWS[i][0] === rep.excl) return;
    const L = FS[i],
      oth = L.filter(x => x !== f).reduce((t, x) => t + (rep.P[x] ? rep.P[x][0] : 0), 0);
    A.push([rep.TH[i] - rep.MT[i] - go - oth / L.length - (L.length === 1 ? 0.5 : 0), 1 / L.length, GU[i], rep.y ? rep.y[i] : ROWS[i][4]]);
  });
  let best = -Infinity,
    br = 0;
  for (let r = -3; r <= 3.0001; r += 0.02) {
    let ll = -0.5 * (r / Math.max(0.05, prior)) ** 2;
    for (const a of A) {
      const q = a[2] + (1 - a[2]) * sig(a[0] - a[1] * r);
      ll += Math.log(a[3] ? Math.max(1e-12, q) : Math.max(1e-12, 1 - q));
    }
    if (ll > best) ((best = ll), (br = r));
  }
  return go + br;
}
function predOf(rep, f, genus, name) {
  const go = rep.G[genus] ? rep.G[genus][0] : 0,
    p = rep.P[f],
    res = p ? p[0] : 0,
    m = p ? p[3] : 0;
  if (name === 'G') return go;
  if (name === 'E') return go + res;
  if (name === 'D') return directOf(rep, f, genus, TAUP);
  if (name === 'Dt') return directOf(rep, f, genus, CURTAU);
  const k = Number(name.slice(1));
  return go + (res * m) / (m + k);
}

// ---------- held-out sets: leave one player out
function heldOut(y, minNth) {
  const out = [];
  PLAYERS.forEach(p => {
    const H = heldIdx(p, minNth);
    if (!H.length) return;
    const rep = replay(y, p);
    H.forEach(i => {
      const f = FS[i][0],
        genus = ROWS[i][2],
        b = {};
      PRED.forEach(n => (b[n] = predOf(rep, f, genus, n) + 0.5));
      out.push({i, p, f, genus, th: rep.TH[i], g: GU[i], y: y ? y[i] : ROWS[i][4], b, m: rep.P[f] ? rep.P[f][3] : 0});
    });
  });
  return out;
}

// ---------- the random-effects fit: P = g + (1-g) sig(th - b - mu - u - v), u per genus, v per photo
// 12-point Gauss-Hermite (physicists'), turned into N(0,1) nodes
const GHx = [0.3142403762544, 0.9477883912402, 1.5976826351526, 2.2795070805011, 3.0206370251209, 3.8897248978698],
  GHw = [0.5701352362625, 0.2604923102642, 0.05160798561588, 0.003905390584629, 8.573687043588e-5, 2.658551684356e-7];
const Z = [],
  LW = [];
GHx.forEach((x, k) => {
  Z.push(Math.SQRT2 * x, -Math.SQRT2 * x);
  LW.push(Math.log(GHw[k] / Math.sqrt(Math.PI)), Math.log(GHw[k] / Math.sqrt(Math.PI)));
});
const NZ = Z.length;
console.log(
  'GH check: sum w',
  r3x(LW.reduce((t, l) => t + Math.exp(l), 0)),
  'E z2',
  r3x(LW.reduce((t, l, i) => t + Math.exp(l) * Z[i] ** 2, 0)),
  'E z4',
  r3x(LW.reduce((t, l, i) => t + Math.exp(l) * Z[i] ** 4, 0))
);
function r3x(x) {
  return Math.round(x * 1e6) / 1e6;
}
const lse = a => {
  let m = -Infinity;
  for (const v of a) if (v > m) m = v;
  let s = 0;
  for (const v of a) s += Math.exp(v - m);
  return m + Math.log(s);
};
// group: [{photos: [{x: Float64Array, g, y}]}] per genus
function groupOf(H, pred) {
  const gm = {};
  H.forEach(h => {
    const G = (gm[h.genus] = gm[h.genus] || {}),
      F = (G[h.f] = G[h.f] || {x: [], g: [], y: []});
    F.x.push(h.th - h.b[pred]);
    F.g.push(h.g);
    F.y.push(h.y);
  });
  return Object.values(gm).map(G => Object.values(G).map(F => ({x: Float64Array.from(F.x), g: Float64Array.from(F.g), y: Uint8Array.from(F.y)})));
}
function loglik(GR, mu, su, sv) {
  su = Math.abs(su);
  sv = Math.abs(sv);
  let tot = 0;
  const outer = new Float64Array(NZ),
    inner = new Float64Array(NZ);
  for (const photos of GR) {
    for (let k = 0; k < NZ; k++) {
      let A = 0;
      for (const F of photos) {
        for (let l = 0; l < NZ; l++) {
          const sh = mu + su * Z[k] + sv * Z[l];
          let s = 0;
          for (let j = 0; j < F.x.length; j++) {
            const q = F.g[j] + (1 - F.g[j]) / (1 + Math.exp(-(F.x[j] - sh)));
            s += Math.log(F.y[j] ? Math.max(1e-12, q) : Math.max(1e-12, 1 - q));
          }
          inner[l] = LW[l] + s;
        }
        A += lse(inner);
      }
      outer[k] = LW[k] + A;
    }
    tot += lse(outer);
  }
  return tot;
}
function nm(f, x0, step, iters = 300, tol = 1e-7) {
  const n = x0.length;
  let S = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const x = x0.slice();
    x[i] += step[i];
    S.push(x);
  }
  let F = S.map(f);
  for (let it = 0; it < iters; it++) {
    const o = F.map((v, i) => i).sort((a, b) => F[a] - F[b]);
    S = o.map(i => S[i]);
    F = o.map(i => F[i]);
    if (Math.abs(F[n] - F[0]) < tol) break;
    const c = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c[j] += S[i][j] / n;
    const xr = c.map((v, j) => v + (v - S[n][j])),
      fr = f(xr);
    if (fr < F[0]) {
      const xe = c.map((v, j) => v + 2 * (v - S[n][j])),
        fe = f(xe);
      if (fe < fr) ((S[n] = xe), (F[n] = fe));
      else ((S[n] = xr), (F[n] = fr));
    } else if (fr < F[n - 1]) ((S[n] = xr), (F[n] = fr));
    else {
      const xc = c.map((v, j) => v + 0.5 * (S[n][j] - v)),
        fc = f(xc);
      if (fc < F[n]) ((S[n] = xc), (F[n] = fc));
      else {
        for (let i = 1; i <= n; i++) S[i] = S[i].map((v, j) => S[0][j] + 0.5 * (v - S[0][j]));
        F = S.map(f);
      }
    }
  }
  const i0 = F.indexOf(Math.min(...F));
  return {x: S[i0], f: F[i0]};
}
function fitRE(GR, start = [0, 0.3, 0.5]) {
  const r = nm(p => -loglik(GR, p[0], p[1], p[2]), start, [0.2, 0.2, 0.2]);
  // restart once from the optimum (Nelder-Mead can stall)
  const r2 = nm(p => -loglik(GR, p[0], p[1], p[2]), r.x, [0.1, 0.1, 0.1]);
  const x = r2.f <= r.f ? r2.x : r.x;
  const su = Math.abs(x[1]),
    sv = Math.abs(x[2]);
  return {mu: x[0], su, sv, s: Math.hypot(su, sv), ll: -Math.min(r.f, r2.f)};
}
function profileSv(GR, fit) {
  const grid = [];
  for (let v = 0; v <= 1.8001; v += 0.05) grid.push(v);
  const pts = grid.map(v => {
    const r = nm(p => -loglik(GR, p[0], p[1], v), [fit.mu, fit.su || 0.1], [0.1, 0.1]);
    return [v, -r.f];
  });
  const top = Math.max(fit.ll, ...pts.map(p => p[1])),
    lim = top - 1.92;
  let lo = 0,
    hi = null;
  // upper: the first grid point above the optimum where the profile falls below the limit (linear interpolation)
  for (let i = 1; i < pts.length; i++)
    if (pts[i][0] > fit.sv && pts[i][1] < lim && pts[i - 1][1] >= lim) {
      const [a, fa] = pts[i - 1],
        [b, fb] = pts[i];
      hi = a + ((fa - lim) / (fa - fb)) * (b - a);
      break;
    }
  for (let i = pts.length - 1; i > 0; i--)
    if (pts[i - 1][0] < fit.sv && pts[i - 1][1] < lim && pts[i][1] >= lim) {
      const [a, fa] = pts[i - 1],
        [b, fb] = pts[i];
      lo = a + ((lim - fa) / (fb - fa)) * (b - a);
      break;
    }
  return {lo, hi, pts};
}
const T14 = 2.145;
function jack(vals) {
  const n = vals.length,
    m = vals.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(((n - 1) / n) * vals.reduce((t, v) => t + (v - m) ** 2, 0));
}
const ll1 = h => {
  const q = h.g + (1 - h.g) * sig(h.th - h.cur);
  return -Math.log(h.y ? Math.max(1e-12, q) : Math.max(1e-12, 1 - q));
};
function logloss(H, pred) {
  return H.map(h => ll1(Object.assign({}, h, {cur: h.b[pred]})));
}

// ---------- RNG
function rng(seed) {
  let a = seed >>> 0;
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const n = () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
  return {u, n};
}

const r3 = x => (x === null || x === undefined ? null : Math.round(x * 1000) / 1000);
const OUTJ = {};
const FULL = replay(null, null);
// check: the replay reproduces core.js eloOf
{
  const E = C.eloOf(ROWS);
  let bad = 0;
  Object.keys(E).forEach(f => {
    const d = Math.round((FULL.G[FULL.PG[f]][0] + FULL.P[f][0]) * 100) / 100;
    if (Math.abs(d - E[f][0]) > 0.011 || FULL.P[f][3] !== E[f][3]) bad++;
  });
  console.log('replay vs core eloOf: photos', Object.keys(E).length, 'differing', bad);
  OUTJ.reproduce = {photos: Object.keys(E).length, differing: bad};
}
const POOL = Object.keys(FULL.P).filter(f => FULL.P[f][3] >= 5);
const CSM = Object.values(JSON.parse(fs.readFileSync(CS, 'utf8')).coral).flat();
{
  const d = POOL.map(f => FULL.G[FULL.PG[f]][0] + FULL.P[f][0]).sort((a, b) => a - b),
    q = x => d[Math.floor(x * (d.length - 1))];
  const gen = new Set(POOL.map(f => FULL.PG[f]));
  OUTJ.pool = {n: POOL.length, genera: gen.size, p10: r3(q(0.1)), p50: r3(q(0.5)), p90: r3(q(0.9)), min: r3(d[0]), max: r3(d[d.length - 1]), below_m1: d.filter(x => x <= -1).length, above_1: d.filter(x => x >= 1).length, above_1_5: d.filter(x => x >= 1.5).length, members5: CSM.filter(f => FULL.P[f] && FULL.P[f][3] >= 5).length};
  console.log('pool', JSON.stringify(OUTJ.pool));
}

if (ONLY !== 'planted') {
  // ---------- real: leave one player out
  const H = heldOut(null, AFTER);
  console.log('held-out answers', H.length, 'photos', new Set(H.map(h => h.f)).size);
  OUTJ.real = {n: H.length, photos: new Set(H.map(h => h.f)).size, pred: {}};
  // genus offsets' largest move when a player is left out
  if (!argv.includes('--nosens')) {
    let mx = 0;
    PLAYERS.forEach(p => {
      const rep = replay(null, p);
      Object.keys(FULL.G).forEach(g => FULL.G[g][1] >= 50 && rep.G[g] && (mx = Math.max(mx, Math.abs(rep.G[g][0] - FULL.G[g][0]))));
    });
    OUTJ.real.genusMoveMax50 = r3(mx);
    console.log('largest genus-offset move (genera on 50+ weighed answers) leaving one player out', r3(mx));
  }
  const LLG = logloss(H, 'G');
  (opt('preds') ? opt('preds').split(',') : PRED).forEach(pred => {
    const GR = groupOf(H, pred),
      fit = fitRE(GR);
    const J = PLAYERS.filter(p => H.some(h => h.p === p)).map(p => {
      const f = fitRE(groupOf(H.filter(h => h.p !== p), pred), [fit.mu, fit.su || 0.1, fit.sv || 0.1]);
      return f;
    });
    const se = k => jack(J.map(f => f[k]));
    const o = {mu: r3(fit.mu), su: r3(fit.su), sv: r3(fit.sv), s: r3(fit.s), se_su: r3(se('su')), se_sv: r3(se('sv')), se_s: r3(se('s')), s_hi_jack: r3(fit.s + T14 * se('s')), s_lo_jack: r3(fit.s - T14 * se('s'))};
    const LL = logloss(H, pred),
      dif = LL.map((v, i) => v - LLG[i]),
      md = dif.reduce((a, b) => a + b, 0) / dif.length;
    const Jd = PLAYERS.filter(p => H.some(h => h.p === p)).map(p => {
      const L = dif.filter((v, i) => H[i].p !== p);
      return L.reduce((a, b) => a + b, 0) / L.length;
    });
    o.logloss = r3(LL.reduce((a, b) => a + b, 0) / LL.length);
    o.dll = Math.round(md * 1e5) / 1e5;
    o.dll_lo = Math.round((md - T14 * jack(Jd)) * 1e5) / 1e5;
    o.dll_hi = Math.round((md + T14 * jack(Jd)) * 1e5) / 1e5;
    if (pred === 'G' || pred === 'E') {
      const pr = profileSv(GR, fit);
      o.sv_prof_lo = r3(pr.lo);
      o.sv_prof_hi = r3(pr.hi);
      o.U = r3(Math.max(fit.s + T14 * se('s'), pr.hi === null ? Infinity : Math.hypot(fit.su, pr.hi)));
    }
    // by the photo's answer count without the player (G: none; others: approximate)
    o.byM = {};
    [
      ['1-4', 1, 4],
      ['5+', 5, 1e9]
    ].forEach(([nm_, a, b]) => {
      const Hs = H.filter(h => h.m >= a && h.m <= b);
      const f = fitRE(groupOf(Hs, pred), [fit.mu, fit.su || 0.1, fit.sv || 0.1]);
      o.byM[nm_] = {n: Hs.length, sv: r3(f.sv), su: r3(f.su), s: r3(f.s)};
    });
    OUTJ.real.pred[pred] = o;
    console.log(pred, JSON.stringify(o));
  });
  // sensitivity: held-out with the first 20 answers kept (G only)
  if (!argv.includes('--nosens')) {
    const H0 = heldOut(null, 0),
      f = fitRE(groupOf(H0, 'G'));
    OUTJ.real.sensAll = {n: H0.length, mu: r3(f.mu), su: r3(f.su), sv: r3(f.sv), s: r3(f.s)};
    console.log('sens all answers G', JSON.stringify(OUTJ.real.sensAll));
  }
  // sensitivity: date cut, G only
  if (!argv.includes('--nosens')) {
    const T = atOf('2026-11-06 00:00'),
      rep = replay(null, null, T);
    const Hd = [];
    ROWS.forEach((r, i) => {
      if (r[1] >= T && FIRST[i] && FS[i].length === 1 && NTH[i] > AFTER) {
        const f = FS[i][0],
          b = {G: predOf(rep, f, r[2], 'G') + 0.5, E: predOf(rep, f, r[2], 'E') + 0.5};
        Hd.push({i, p: r[0], f, genus: r[2], th: rep.TH[i], g: GU[i], y: r[4], b, m: rep.P[f] ? rep.P[f][3] : 0});
      }
    });
    const f = fitRE(groupOf(Hd, 'G')),
      fe = fitRE(groupOf(Hd, 'E'));
    const lg = logloss(Hd, 'G'),
      le = logloss(Hd, 'E');
    OUTJ.real.sensDate = {n: Hd.length, G: {mu: r3(f.mu), su: r3(f.su), sv: r3(f.sv), s: r3(f.s)}, E: {mu: r3(fe.mu), su: r3(fe.su), sv: r3(fe.sv), s: r3(fe.s)}, dllE: Math.round(((le.reduce((a, b) => a + b, 0) - lg.reduce((a, b) => a + b, 0)) / lg.length) * 1e5) / 1e5};
    console.log('sens date cut', JSON.stringify(OUTJ.real.sensDate));
  }
}

if (ONLY !== 'real') {
  // ---------- planted
  const TAUS = (opt('taus') || '0,0.4,0.61,0.8,1.0').split(',').map(Number);
  const GSV = {};
  Object.keys(FULL.G).forEach(g => (GSV[g] = FULL.G[g][0]));
  const allPhotos = Object.keys(FULL.P);
  OUTJ.planted = {};
  // design only: each pool photo's answers shown alone, and first-time answers shown alone
  const ALONE = {},
    ALONE1 = {};
  ROWS.forEach((r, i) => {
    if (FS[i].length === 1) {
      const f = FS[i][0];
      ALONE[f] = (ALONE[f] || 0) + 1;
      if (FIRST[i]) ALONE1[f] = (ALONE1[f] || 0) + 1;
    }
  });
  const share = L => {
    const a = L.reduce((t, f) => t + (ALONE[f] || 0), 0),
      a1 = L.reduce((t, f) => t + (ALONE1[f] || 0), 0),
      n = L.reduce((t, f) => t + FULL.P[f][3], 0),
      first = L.reduce((t, f) => t + (PROWS[f] || []).filter(i => FIRST[i]).length, 0);
    return {photos: L.length, answers: n, aloneShare: r3(a / n), firstShare: r3(first / n), firstAloneShare: r3(a1 / n), alone5: L.filter(f => (ALONE[f] || 0) >= 5).length, alone10: L.filter(f => (ALONE[f] || 0) >= 10).length};
  };
  const P59a = POOL.filter(f => FULL.P[f][3] <= 9),
    P10a = POOL.filter(f => FULL.P[f][3] >= 10);
  OUTJ.design = {pool: share(POOL), p59: share(P59a), p10: share(P10a), members: share(CSM.filter(f => FULL.P[f]))};
  console.log('design', JSON.stringify(OUTJ.design));
  const BK = {
    alone0_4: POOL.filter(f => (ALONE[f] || 0) < 5),
    alone5_9: POOL.filter(f => (ALONE[f] || 0) >= 5 && (ALONE[f] || 0) <= 9),
    alone10: Object.keys(FULL.P).filter(f => (ALONE[f] || 0) >= 10)
  };
  console.log('buckets', Object.entries(BK).map(([k, L]) => k + ':' + L.length).join(' '));
  // items as shown: the photo sets of the log (sorted), with their own answer count
  const SETN = {};
  FS.forEach(L => L.length && (SETN[L.slice().sort().join(' ')] = (SETN[L.slice().sort().join(' ')] || 0) + 1));
  const SETS = {
    s5_9: Object.keys(SETN).filter(k => SETN[k] >= 5 && SETN[k] <= 9),
    s10: Object.keys(SETN).filter(k => SETN[k] >= 10)
  };
  const multiShare = L => r3(L.filter(k => k.includes(' ')).length / L.length);
  console.log('sets', Object.entries(SETS).map(([k, L]) => k + ':' + L.length + ' multi ' + multiShare(L)).join(' '));
  OUTJ.sets = Object.fromEntries(Object.entries(SETS).map(([k, L]) => [k, {n: L.length, multi: multiShare(L)}]));
  TAUS.forEach(tau => {
    CURTAU = tau;
    const rec = {sv: [], su: [], svE: [], err: {}, errM: {}, err59: {}, err10: {}, bk: {}};
    PRED.forEach(p => ((rec.err[p] = []), (rec.errM[p] = []), (rec.err59[p] = []), (rec.err10[p] = []), (rec.bk[p] = {alone0_4: [], alone5_9: [], alone10: []})));
    const P59 = POOL.filter(f => FULL.P[f][3] <= 9),
      P10 = POOL.filter(f => FULL.P[f][3] >= 10);
    for (let rep = 0; rep < NREP; rep++) {
      const R = rng(1000 * Math.round(tau * 100) + rep + 7),
        v = {};
      allPhotos.forEach(f => (v[f] = tau * R.n()));
      // outcomes in time order, the true levels the real replay's, memory at its prior
      const y = new Uint8Array(NR),
        Hh = {};
      for (let i = 0; i < NR; i++) {
        const r = ROWS[i],
          fs_ = FS[i];
        if (!fs_.length) {
          y[i] = r[4];
          continue;
        }
        const b = (GSV[r[2]] || 0) + fs_.reduce((t, f) => t + v[f], 0) / fs_.length + (fs_.length === 1 ? 0.5 : 0);
        const hs = fs_.map(f => (Hh[r[0] + '|' + f] = Hh[r[0] + '|' + f] || [0, 0]));
        const q = GU[i] + (1 - GU[i]) * sig(FULL.TH[i] - b - C.memFam(hs, MEM.PRIOR));
        y[i] = R.u() < q ? 1 : 0;
        hs.forEach(h => {
          h[0]++;
          h[1] += y[i];
        });
      }
      const full = replay(y, null);
      const errOn = (L, pred) => {
        const e = L.map(ff => predOf(full, ff, FULL.PG[ff], pred) - ((GSV[FULL.PG[ff]] || 0) + v[ff])),
          m = e.reduce((a, b) => a + b, 0) / e.length;
        return Math.sqrt(e.reduce((t, x) => t + (x - m) ** 2, 0) / e.length);
      };
      const mem5 = CSM.filter(ff => FULL.P[ff] && FULL.P[ff][3] >= 1);
      PRED.forEach(p => {
        rec.err[p].push(errOn(POOL, p));
        rec.errM[p].push(errOn(mem5, p));
        rec.err59[p].push(errOn(P59, p));
        rec.err10[p].push(errOn(P10, p));
        Object.keys(BK).forEach(k => BK[k].length && rec.bk[p][k].push(errOn(BK[k], p)));
        Object.keys(SETS).forEach(k => {
          const e = SETS[k].map(key => {
              const L = key.split(' '),
                gn = FULL.PG[L[0]],
                go = GSV[gn] || 0;
              return L.reduce((t, ff) => t + predOf(full, ff, gn, p), 0) / L.length - (go + L.reduce((t, ff) => t + v[ff], 0) / L.length);
            }),
            m = e.reduce((a, b) => a + b, 0) / e.length;
          (rec.bk[p]['set_' + k] = rec.bk[p]['set_' + k] || []).push(Math.sqrt(e.reduce((t, x) => t + (x - m) ** 2, 0) / e.length));
        });
      });
    }
    const qt = (s, p) => {
      const h = (s.length - 1) * p,
        lo = Math.floor(h);
      return s[lo] + (h - lo) * ((s[Math.min(s.length - 1, lo + 1)] || s[lo]) - s[lo]);
    };
    const sm = a => {
      const s = a.slice().sort((x, y) => x - y),
        m = a.reduce((x, y) => x + y, 0) / a.length;
      return {mean: r3(m), q10: r3(qt(s, 0.1)), q90: r3(qt(s, 0.9)), min: r3(s[0]), max: r3(s[s.length - 1])};
    };
    const av = a => r3(a.reduce((x, y) => x + y, 0) / a.length);
    const o = {errPool: {}, err59: {}, err10: {}, errMembers: {}, bk: {}};
    PRED.forEach(p => (o.bk[p] = Object.fromEntries(Object.entries(rec.bk[p]).map(([k, a]) => [k, av(a)]))));
    PRED.forEach(p => ((o.errPool[p] = r3(rec.err[p].reduce((a, b) => a + b, 0) / NREP)), (o.err59[p] = r3(rec.err59[p].reduce((a, b) => a + b, 0) / NREP)), (o.err10[p] = r3(rec.err10[p].reduce((a, b) => a + b, 0) / NREP)), (o.errMembers[p] = r3(rec.errM[p].reduce((a, b) => a + b, 0) / NREP))));
    OUTJ.planted[tau] = o;
    console.log('planted tau', tau, JSON.stringify(o));
  });
}
fs.writeFileSync(OUT, JSON.stringify(OUTJ, null, 1));
