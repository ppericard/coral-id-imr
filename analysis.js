// Multifactor analyses of the answer log for the admin's Analyses group (Pierre, 2026-11-04: "every 1000 new answers,
// a new section with several sub-pages, visualisations, reports, graphs, tables"). Pure functions, no DOM: loaded by
// admin.html (window.ANALYSIS), run in a Web Worker (this same file, new Worker('analysis.js?v=N')) so the admin stays
// responsive, and required by Node for the tests (tests/analysis.test.js, synthetic data whose true effects are known).
// Methods (docs/LEARNING.md "Multifactor analyses"): crossed random effects (player, genus, photo; a question's photos
// share its photo effect) fitted by alternating updates with EM variance components (REML-like shrinkage); Gaussian
// for log response time, logistic with each question's guess rate for right / wrong (explanatory IRT, LLTM with a photo
// random effect); 95% intervals by cluster bootstrap over players (from BOOT_MIN players), never narrower than the
// model's own (Wald) interval. Every effect carries a verdict and how many answers it would need (verdictOf).
// Nothing here is sent anywhere; the admin reads the answer log with its token and keeps the results in its browser.
(function (root) {
  'use strict';
  // Bump AV whenever a result could change for the same answers: the admin's cache is keyed by it.
  const AV = 11; // 2: each analysis carries its typical values (typ) for the plain reading (plainOf); 3: Sessions in figures (desc);
  // 4: multiple-testing correction (primary effects under Holm, the others under Benjamini-Hochberg), 999 bootstrap draws
  // 5: effects hard to tell apart (ent) and the mix-up map (Confusions map);
  // 6: the answers a deleted account left (sheet v55, anonymous 2) out of every per-player result and count of players
  // 7: player profiles (who)
  // 8: the Wright map and the genus × player residuals (Learning wright, res)
  // 9: Time and difficulty (tdiff): others' answer time and enlarging on a photo, time intensity beside difficulty
  // 10: interactions (ix): enlarging × view (Zoom), pair × view (Confusions), format × practice (Learning), one omnibus
  // test each in the exploratory family
  // 11: random practice slopes in Learning (each player's and genus's own), their spreads, per-genus learning curves
  // (gcurve), the player profiles' learning slope
  const GAP = 30 * 60e3, // a new session after 30 minutes without an answer (model.js SESSION.GAP, admin HEALTH.GAP)
    STEP = 1000, // a milestone every 1000 answers (Pierre, 2026-11-04)
    // The sync script that stores one report per subject (Code.gs analyses_ anTab_): before it, analysesGet and
    // analysesPut know one report, the corals', so another subject's is neither stored (tools/analyses.js) nor read (the
    // admin's Analyses, admin-analyses.js anLoad) from an older script (rule D4).
    AN_SUBJ_SHEET = 113,
    BOOT_MIN = 6, // players needed before the cluster bootstrap means anything
    Z = 1.96;
  const sig = x => 1 / (1 + Math.exp(-x)),
    logit = p => Math.log(p / (1 - p)),
    clamp = (x, a, b) => Math.min(b, Math.max(a, x)),
    sum = L => L.reduce((s, x) => s + x, 0),
    mean = L => (L.length ? sum(L) / L.length : 0);

  // Seeded random numbers (xorshift32): the same intervals for the same answers.
  function rng(seed) {
    let s = seed >>> 0 || 2463534242;
    return () => {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 4294967296;
    };
  }
  // A copy of L in random order from R (Fisher-Yates): exactly L.length - 1 draws, so a seeded stream stays the same in
  // every engine. Never sort with a random comparator (sort(() => R() - 0.5)): how many times sort calls it is up to the
  // engine, and Chromium calls it a different number of times once the code is optimised, so every later draw moved and
  // the admin demo's made-up answers changed from one load to the next (the Health photos with no difficulty to show,
  // tests/admin.smoke.js "difficulty in words", 2026-11-06).
  function shuffle(L, R) {
    const o = L.slice();
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
    return o;
  }

  // Bootstrap refits stop earlier (looser tolerance): their spread matters, not their fourth decimal.
  let FAST = false;
  // Bootstrap refits start from the full fit of the same model (warm start): the same fit, reached in fewer steps, so
  // 999 draws fit in the Action's time (the multiple-testing study of 2026-11-05, §5.3). WARM[sig] holds the last full
  // fit's fixed effects, variance components and shrunk effects; runAll empties it before each analysis. A player
  // drawn twice in a bootstrap sample is named id + DUP + draw index: both copies start from that player's own effect.
  let WARM = {};
  const DUP = '\u0001',
    baseOf = k => (typeof k === 'string' && k.indexOf(DUP) >= 0 ? k.slice(0, k.indexOf(DUP)) : k);
  const sigOf = (kind, p, F) => kind + ':' + p + ':' + F.map(f => f.name).join(',');
  function warmKeep(kind, p, F, b, s2) {
    WARM[sigOf(kind, p, F)] = {
      b: b.slice(),
      s2,
      f: F.map(f => ({tau2: f.tau2, u: new Map(f.L.map((k, j) => [k, f.u[j]]))}))
    };
  }
  // Sets b, each factor's tau2 and u from the warm state (null when there is none or it does not apply).
  function warmGet(kind, p, F) {
    const W = FAST ? WARM[sigOf(kind, p, F)] : null;
    if (!W) return null;
    F.forEach((f, k) => {
      f.tau2 = W.f[k].tau2;
      for (let j = 0; j < f.n; j++) f.u[j] = W.f[k].u.get(baseOf(f.L[j])) || 0;
    });
    return W;
  }

  /* ---------- Small linear algebra ---------- */
  // Solves A x = b (A symmetric positive definite, p small) by Gaussian elimination with partial pivoting; a tiny ridge
  // keeps a column that is constant in a sample (a bootstrap draw with no typed answer) from breaking it.
  function solve(A, b) {
    const n = b.length,
      M = A.map((r, i) => [...r, b[i]]);
    for (let i = 0; i < n; i++) M[i][i] += 1e-9;
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      [M[c], M[piv]] = [M[piv], M[c]];
      const d = M[c][c] || 1e-12;
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = M[r][c] / d;
        if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    return M.map((r, i) => r[n] / (r[i] || 1e-12));
  }
  // Rows where each column is not 0 (an effect with no such answer yet says so instead of a meaningless interval).
  const nz = X => X[0].map((_, a) => X.filter(x => x[a]).length);
  const inverse = A =>
    A.map((_, j) =>
      solve(
        A,
        A.map((__, i) => (i === j ? 1 : 0))
      )
    );
  // A bootstrap draw (FAST) with no answer moving a column cannot estimate its coefficient: NaN, so boot leaves the draw
  // out for it, rather than counting the warm start's value (the full fit's) or the ridge's 0 as a draw (Codex review
  // #588).
  const drawn = (b, n0) => (FAST ? b.map((v, a) => (n0[a] ? v : NaN)) : b);
  // A column the data never moves (all zero in this sample) gets a ridge, so its coefficient stays 0, not huge.
  const ridge = (A, X) => A.map((r, i) => r.map((v, j) => v + (i === j && !X.some(x => x[i]) ? 1 : 0)));

  /* ---------- Random-effect factors ---------- */
  // keys[i]: the level of row i (a string), or a list of levels sharing the row (a question's photos, weight 1/m each).
  // wt: a random slope instead (one level a row, its weight wt[i], the covariate: Z u adds wt[i] u_level); sl marks it.
  function factor(name, keys, wt) {
    const N = keys.length,
      idx = new Map(),
      L = [],
      start = new Int32Array(N + 1),
      lev = [],
      w = [];
    for (let i = 0; i < N; i++) {
      const k = keys[i],
        K = Array.isArray(k) ? k : k == null ? [] : [k];
      start[i] = lev.length;
      K.forEach(x => {
        if (!idx.has(x)) (idx.set(x, L.length), L.push(x));
        lev.push(idx.get(x));
        w.push(wt ? wt[i] : 1 / K.length);
      });
    }
    start[N] = lev.length;
    const n = L.length,
      den = new Float64Array(n),
      cnt = new Float64Array(n);
    for (let q = 0; q < lev.length; q++) ((den[lev[q]] += w[q] * w[q]), (cnt[lev[q]] += w[q]));
    return {
      name,
      L,
      n,
      start,
      lev: Int32Array.from(lev),
      w: Float64Array.from(w),
      den,
      cnt,
      u: new Float64Array(n),
      cv: new Float64Array(n),
      tau2: 0,
      sl: wt ? 1 : 0
    };
  }
  // Z u for one factor, into out (row contributions).
  function zu(f, out) {
    for (let i = 0; i < out.length; i++) {
      let s = 0;
      for (let q = f.start[i]; q < f.start[i + 1]; q++) s += f.w[q] * f.u[f.lev[q]];
      out[i] = s;
    }
    return out;
  }

  // Covariance of the fixed effects marginal over the random effects: the inverse of the Schur complement
  // X'WX - X'WZ (Z'WZ + D)^-1 Z'WX of the joint precision of (b, u), D the random effects' prior precision (lam per
  // factor), W the rows' weights (1 for the Gaussian model, the Fisher weights of the logistic one), times scale.
  // Exact for crossed and shared (a question's photos) levels; dense, so above MAXM levels each level's block is
  // taken alone (the Schur terms of every level summed), an approximation, kept only while it stays positive.
  const MAXM = 2500;
  function margV(X, F, W, lam, scale, XtWX) {
    const p = X[0].length,
      N = X.length,
      off = [],
      m = F.reduce((t, f) => (off.push(t), t + f.n), 0),
      wt = i => (W ? W[i] : 1);
    if (!m) return inverse(XtWX).map(r => r.map(v => v * scale));
    let S;
    if (m <= MAXM) {
      const C = new Float64Array(m * m),
        B = new Float64Array(p * m);
      for (let i = 0; i < N; i++) {
        const L = [];
        F.forEach((f, k) => {
          for (let q = f.start[i]; q < f.start[i + 1]; q++) L.push([off[k] + f.lev[q], f.w[q]]);
        });
        const wi = wt(i);
        L.forEach(([a, wa]) => {
          for (let c = 0; c < p; c++) B[c * m + a] += X[i][c] * wa * wi;
          L.forEach(([b, wb]) => (C[a * m + b] += wa * wb * wi));
        });
      }
      F.forEach((f, k) => {
        const d = lam(f);
        for (let j = 0; j < f.n; j++) C[(off[k] + j) * m + off[k] + j] += d;
      });
      // Cholesky C = L L' (in place, lower triangle)
      for (let j = 0; j < m; j++) {
        let d = C[j * m + j];
        for (let k = 0; k < j; k++) d -= C[j * m + k] * C[j * m + k];
        d = Math.sqrt(Math.max(d, 1e-12));
        C[j * m + j] = d;
        for (let i = j + 1; i < m; i++) {
          let v = C[i * m + j];
          for (let k = 0; k < j; k++) v -= C[i * m + k] * C[j * m + k];
          C[i * m + j] = v / d;
        }
      }
      // Y = L^-1 B' column by column; then B C^-1 B' = Y'Y
      const Y = [];
      for (let c = 0; c < p; c++) {
        const y = new Float64Array(m);
        for (let i = 0; i < m; i++) {
          let v = B[c * m + i];
          for (let k = 0; k < i; k++) v -= C[i * m + k] * y[k];
          y[i] = v / C[i * m + i];
        }
        Y.push(y);
      }
      S = XtWX.map((r, a) => r.map((v, c) => v - Y[a].reduce((t, x, i) => t + x * Y[c][i], 0)));
    } else {
      S = XtWX.map(r => r.slice());
      F.forEach(f => {
        const A = Array.from({length: f.n}, () => new Float64Array(p)),
          D = new Float64Array(f.n).fill(lam(f));
        for (let i = 0; i < N; i++)
          for (let q = f.start[i]; q < f.start[i + 1]; q++) {
            const j = f.lev[q];
            D[j] += f.w[q] * f.w[q] * wt(i);
            for (let c = 0; c < p; c++) A[j][c] += X[i][c] * f.w[q] * wt(i);
          }
        for (let j = 0; j < f.n; j++) for (let a = 0; a < p; a++) for (let c = 0; c < p; c++) S[a][c] -= (A[j][a] * A[j][c]) / D[j];
      });
      if (S.some((r, a) => !(r[a] > 1e-9))) S = XtWX;
    }
    return inverse(S.map((r, a) => r.map((v, c) => v + (a === c ? 1e-9 : 0)))).map(r => r.map(v => v * scale));
  }

  /* ---------- Linear mixed model (Gaussian, crossed random effects) ---------- */
  // y = X b + sum_f Z_f u_f + e, u_f ~ N(0, tau2_f), e ~ N(0, s2). Alternating (backfitting) updates of b and of each
  // factor's BLUPs, u_j = Z_j'r / (n_j + s2 / tau2), with EM updates of the variance components (posterior second
  // moments: the shrinkage of REML without its exact determinant term). Returns b, its Wald SE, s2, each factor's tau2,
  // u (shrunk effects) and cv (their conditional variances).
  function lmm(y, X, F, o = {}) {
    const N = y.length,
      p = X[0].length,
      vy = mean(y.map(v => v * v)) - mean(y) ** 2 || 1;
    let s2 = vy / 2,
      b = new Array(p).fill(0);
    F.forEach(f => ((f.tau2 = vy / (2 * F.length)), f.u.fill(0), (f.z = new Float64Array(N))));
    const W = warmGet('lmm', p, F);
    if (W) ((b = W.b.slice()), (s2 = W.s2), F.forEach(f => zu(f, f.z)));
    const XtX = ridge(
      X[0].map((_, a) => X[0].map((__, c) => X.reduce((s, x) => s + x[a] * x[c], 0))),
      X
    );
    const r = new Float64Array(N);
    for (let it = 0; it < (o.it || (FAST ? 80 : 300)); it++) {
      const old = [...b, s2, ...F.map(f => f.tau2)];
      // fixed part on y minus the random parts
      const rhs = new Array(p).fill(0);
      for (let i = 0; i < N; i++) {
        let v = y[i];
        F.forEach(f => (v -= f.z[i]));
        for (let a = 0; a < p; a++) rhs[a] += X[i][a] * v;
      }
      b = solve(XtX, rhs);
      for (let i = 0; i < N; i++) {
        let v = y[i];
        for (let a = 0; a < p; a++) v -= X[i][a] * b[a];
        F.forEach(f => (v -= f.z[i]));
        r[i] = v;
      }
      let trace = 0;
      F.forEach(f => {
        // One majorise-minimise step per level on the full residual: the denominator sum_i w_ij (sum_k w_ik) bounds the
        // curvature when a row shares several levels (a question's photos), so updating them together never overshoots;
        // with one level per row it is the exact BLUP update.
        const num = new Float64Array(f.n),
          lam = s2 / f.tau2;
        for (let i = 0; i < N; i++) for (let q = f.start[i]; q < f.start[i + 1]; q++) num[f.lev[q]] += f.w[q] * r[i];
        const st = new Float64Array(f.n);
        let ss = 0;
        for (let j = 0; j < f.n; j++) {
          st[j] = (num[j] - lam * f.u[j]) / (f.cnt[j] + lam);
          f.u[j] += st[j];
          f.cv[j] = s2 / (f.den[j] + lam);
          ss += f.u[j] * f.u[j] + f.cv[j];
          trace += f.den[j] * f.cv[j];
        }
        for (let i = 0; i < N; i++) {
          let d = 0;
          for (let q = f.start[i]; q < f.start[i + 1]; q++) d += f.w[q] * st[f.lev[q]];
          f.z[i] += d;
          r[i] -= d;
        }
        f.tau2 = Math.max(1e-6, ss / f.n);
      });
      let rss = 0;
      for (let i = 0; i < N; i++) rss += r[i] * r[i];
      s2 = Math.max(1e-6, (rss + trace) / N);
      const now = [...b, s2, ...F.map(f => f.tau2)];
      if (now.every((v, k) => Math.abs(v - old[k]) < (FAST ? 1e-4 : 1e-6) * (1 + Math.abs(v)))) break;
    }
    // The fixed effects' covariance, marginal over the random effects (Codex review #441: conditional on them, an effect
    // that is constant within a player looked sure from many answers of a few players).
    const V = FAST ? null : margV(X, F, null, f => s2 / f.tau2, s2, XtX);
    if (!FAST) warmKeep('lmm', p, F, b, s2);
    const n0 = nz(X);
    return {b: drawn(b, n0), se: V ? V.map((row, a) => Math.sqrt(Math.max(0, row[a]))) : b.map(() => NaN), V, s2, F, nz: n0};
  }

  /* ---------- Logistic mixed model with a guess rate (explanatory IRT) ---------- */
  // P(right) = g + (1 - g) sig(eta), eta = off + X b + sum_f Z_f u_f, g the question's guess rate (0 for a typed answer,
  // as the app's). Fisher scoring on b, one Newton step per level on each u_f (Gaussian prior, tau2_f), EM-like updates
  // of tau2_f from the Laplace posterior (u^2 + cv): penalised quasi-likelihood, the usual shrinkage of crossed IRT fits.
  function glmm(y, X, F, o = {}) {
    const N = y.length,
      p = X[0].length,
      off = o.off || new Float64Array(N),
      g = o.g || new Float64Array(N),
      eta = Float64Array.from(off),
      S = new Float64Array(N),
      W = new Float64Array(N);
    let b = new Array(p).fill(0);
    F.forEach(f => ((f.tau2 = o.tau0 || 0.5), f.u.fill(0), f.cv.fill(0)));
    const Wm = warmGet('glmm', p, F);
    if (Wm) {
      b = Wm.b.slice();
      const z = new Float64Array(N);
      for (let i = 0; i < N; i++) for (let a = 0; a < p; a++) eta[i] += X[i][a] * b[a];
      F.forEach(f => {
        zu(f, z);
        for (let i = 0; i < N; i++) eta[i] += z[i];
      });
    }
    const sc = () => {
      for (let i = 0; i < N; i++) {
        const s = sig(eta[i]),
          d = (1 - g[i]) * s * (1 - s),
          P = clamp(g[i] + (1 - g[i]) * s, 1e-9, 1 - 1e-9);
        S[i] = ((y[i] - P) * d) / (P * (1 - P));
        W[i] = (d * d) / (P * (1 - P)) + 1e-12;
      }
    };
    // X flattened into one typed array (row i at i * p): the same sums in the same order, several times faster than
    // nested arrays in the loops below, which run at every step of every bootstrap refit.
    const Xf = new Float64Array(N * p);
    for (let i = 0; i < N; i++) for (let a = 0; a < p; a++) Xf[i * p + a] = X[i][a];
    const zero = X[0].map((_, a) => !X.some(x => x[a])),
      Hf = new Float64Array(p * p);
    let H = null,
      it = 0;
    for (; it < (o.it || (FAST ? 60 : 200)); it++) {
      let move = 0;
      sc();
      Hf.fill(0);
      const gr = new Array(p).fill(0);
      for (let i = 0; i < N; i++) {
        const r = i * p,
          Si = S[i],
          Wi = W[i];
        for (let a = 0; a < p; a++) {
          const xa = Xf[r + a];
          gr[a] += xa * Si;
          for (let c = 0; c <= a; c++) Hf[a * p + c] += xa * Xf[r + c] * Wi;
        }
      }
      // as ridge(): a column the sample never moves gets 1 on its diagonal; then the small ridge
      H = X[0].map((_, a) => X[0].map((__, c) => (c <= a ? Hf[a * p + c] : Hf[c * p + a]) + (a === c ? (zero[a] ? 1 : 0) + 1e-6 : 0)));
      const db = solve(H, gr).map(v => clamp(v, -2, 2));
      b = b.map((v, a) => v + db[a]);
      for (let i = 0; i < N; i++) {
        let d = 0;
        for (let a = 0; a < p; a++) d += Xf[i * p + a] * db[a];
        eta[i] += d;
      }
      move = Math.max(move, ...db.map(Math.abs));
      F.forEach(f => {
        sc();
        const gj = new Float64Array(f.n),
          hj = new Float64Array(f.n),
          hk = new Float64Array(f.n);
        // hj bounds the curvature of a level shared with others in a row (see lmm); hk is its own, for the variance. A
        // random slope has one level a row: its curvature is exact, its weight squared (a weight can exceed 1 or be < 0).
        for (let i = 0; i < N; i++)
          for (let q = f.start[i]; q < f.start[i + 1]; q++)
            ((gj[f.lev[q]] += f.w[q] * S[i]),
              (hj[f.lev[q]] += (f.sl ? f.w[q] * f.w[q] : f.w[q]) * W[i]),
              (hk[f.lev[q]] += f.w[q] * f.w[q] * W[i]));
        const du = new Float64Array(f.n);
        let ss = 0;
        for (let j = 0; j < f.n; j++) {
          const h = hj[j] + 1 / f.tau2;
          du[j] = clamp((gj[j] - f.u[j] / f.tau2) / h, -2, 2);
          f.u[j] += du[j];
          f.cv[j] = 1 / (hk[j] + 1 / f.tau2);
          ss += f.u[j] * f.u[j] + f.cv[j];
          move = Math.max(move, Math.abs(du[j]));
        }
        for (let i = 0; i < N; i++) for (let q = f.start[i]; q < f.start[i + 1]; q++) eta[i] += f.w[q] * du[f.lev[q]];
        const t = clamp(ss / f.n, 1e-4, 25);
        // converged on the SD to 0.001 (an SD heading for 0 creeps there slowly under EM: stop once it is negligible)
        if (t > 1e-3) move = Math.max(move, Math.abs(Math.sqrt(t) - Math.sqrt(f.tau2)));
        f.tau2 = t;
      });
      if (move < (o.tol || (FAST ? 1e-3 : 1e-4))) break;
    }
    let V = null;
    if (!FAST) {
      sc();
      const XW = ridge(
        X[0].map((_, a) => X[0].map((__, c) => X.reduce((t, x, i) => t + x[a] * x[c] * W[i], 0))),
        X
      );
      V = margV(X, F, W, f => 1 / f.tau2, 1, XW);
      warmKeep('glmm', p, F, b, 0);
    }
    const n0 = nz(X);
    return {b: drawn(b, n0), se: V ? V.map((row, a) => Math.sqrt(Math.max(0, row[a]))) : b.map(() => NaN), V, F, eta, nz: n0};
  }

  // Two-parameter fit of one question format against the app's own expectation: P = c + (1 - c) sig(x + d), x the
  // app's log-odds before its guess floor (from the logged Expected), d the format's extra difficulty (negative = harder
  // than the app thinks), c its real guess rate. Gauss-Newton on (d, logit c), a weak prior on c around the app's value.
  function fmtFit(y, x, g0) {
    let d = 0,
      gc = logit(clamp(g0 || 0.02, 0.02, 0.9));
    const pr = logit(clamp(g0 || 0.02, 0.02, 0.9));
    let I = [
      [1, 0],
      [0, 1]
    ];
    for (let it = 0; it < 100; it++) {
      const c = sig(gc);
      let g1 = 0,
        g2 = -(gc - pr) / 4,
        a = 0,
        bb = 0,
        e = 1 / 4;
      for (let i = 0; i < y.length; i++) {
        const s = sig(x[i] + d),
          P = clamp(c + (1 - c) * s, 1e-9, 1 - 1e-9),
          j1 = (1 - c) * s * (1 - s),
          j2 = (1 - s) * c * (1 - c),
          k = (y[i] - P) / (P * (1 - P)),
          w = 1 / (P * (1 - P));
        g1 += k * j1;
        g2 += k * j2;
        a += w * j1 * j1;
        bb += w * j1 * j2;
        e += w * j2 * j2;
      }
      I = [
        [a + 1e-9, bb],
        [bb, e]
      ];
      const st = solve(I, [g1, g2]).map(v => clamp(v, -1, 1));
      d += st[0];
      gc += st[1];
      if (Math.abs(st[0]) + Math.abs(st[1]) < 1e-7) break;
    }
    const V = inverse(I),
      c = sig(gc);
    // cr: the correlation of the two estimates (d and logit c), for "Effects hard to tell apart" (entOf)
    return {
      d,
      c,
      sd: Math.sqrt(Math.max(0, V[0][0])),
      sc: Math.sqrt(Math.max(0, V[1][1])) * c * (1 - c),
      cr: V[0][1] / Math.sqrt(Math.max(1e-300, V[0][0] * V[1][1]))
    };
  }

  /* ---------- The answer log, prepared ---------- */
  // As core.js guessOf (Code.gs guess_): tests/analysis.test.js checks that both agree.
  const TYPED_RE = /\|t(\||$)/;
  const guessOf = (mode, choices) => {
    if (TYPED_RE.test(mode)) return 0;
    const kq = /\|k(\d)$/.exec(mode);
    if (kq) return 1 / Number(kq[1]);
    if (mode.indexOf('quiz-duel') === 0) return 0.5;
    const n = String(choices || '')
      .split(/\s+/)
      .filter(Boolean).length;
    return n >= 2 && n < 4 ? 1 / n : 0.25;
  };
  // Question formats (quiz.js logs them in the mode): typed (|t), the Duel tab (quiz-duel…), a look-alike duel in the
  // quiz (|d), an exam question (|x), "Again: A or B?" after a mix-up (2 choices, plain quiz), 4 choices of which N
  // plausible (|kN), 4 plausible choices.
  const FORMATS = [
    ['k4', '4 choices'],
    ['k3', '4 shown, 3 plausible'],
    ['k2', '4 shown, 2 plausible'],
    ['again', 'Again (2)'],
    ['qduel', 'Duel in quiz'],
    ['duel', 'Duel tab'],
    ['exam', 'Exam'],
    ['typed', 'Typed']
  ];
  function fmtOf(m, nch) {
    if (TYPED_RE.test(m)) return 'typed';
    if (m.indexOf('quiz-duel') === 0) return 'duel';
    if (/\|d(\||$)/.test(m)) return 'qduel';
    if (/\|x(\||$)/.test(m)) return 'exam';
    if (nch === 2) return 'again';
    const k = /\|k(\d)/.exec(m);
    return k && Number(k[1]) < 4 ? (Number(k[1]) >= 3 ? 'k3' : 'k2') : 'k4';
  }
  // rows: the sheet's readAnswers rows [id, time ms, shown, answered, right, mode, photos, expected, ability, new
  // photos, choices, anonymous, seconds, enlarged] (Code.gs answers_), oldest first or not. meta.ph: {file: [view,
  // quality 1-3, sharpness or null, source 'imr' | 'own' | 'inat']} from the admin's data and curation.
  function prep(rows, meta = {}) {
    const PH = meta.ph || {},
      R = (rows || []).filter(r => String(r[5] || '').indexOf('quiz') === 0 && r[2]).sort((a, b) => a[1] - b[1]);
    const per = new Map(),
      out = [];
    R.forEach(r => {
      const m = String(r[5]),
        ch = String(r[10] || '')
          .split(/\s+/)
          .filter(Boolean),
        ph = String(r[6] || '')
          .split(/\s+/)
          .filter(Boolean),
        g0 = guessOf(m, r[10]),
        E = r[7] == null || r[7] === '' || !isFinite(r[7]) ? null : Number(r[7]),
        s = r[12] == null || !isFinite(r[12]) || r[12] <= 0 ? null : Number(r[12]),
        views = ph.map(f => (PH[f] || [])[0]).filter(Boolean),
        A = {
          p: String(r[0]),
          // the answers a deleted account left (Code.gs answers_ anonymous 2, sheet v55): in the pooled fits only, never
          // in a per-player result or a count of players (Pierre, 2026-11-05, Q86)
          gone: r[11] === 2 ? 1 : 0,
          t: Number(r[1]) || 0,
          g: String(r[2]),
          a: String(r[3] || ''),
          y: r[4] ? 1 : 0,
          m,
          ph,
          ch,
          E,
          g0,
          x: E == null ? null : logit(clamp(g0 < 1 ? (E - g0) / (1 - g0) : 0.5, 0.01, 0.99)),
          s: s && s <= 600 ? s : null,
          z: r[13] == null || r[13] === '' ? null : r[13] ? 1 : 0,
          f: fmtOf(m, ch.length),
          typed: TYPED_RE.test(m) ? 1 : 0,
          back: /\|c(\||$)/.test(m) ? 1 : 0,
          // an exam question (|x), typed or not (a typed exam question is logged quiz|t|x; Codex review #441)
          exam: /\|x(\||$)/.test(m) ? 1 : 0,
          qv: !ph.length
            ? null
            : ph.length === 1
              ? views[0] || null
              : new Set(views).size === 1 && views.length === ph.length
                ? views[0]
                : 'multi'
        };
      let P = per.get(A.p);
      if (!P) per.set(A.p, (P = {last: null, sess: 0, pos: 0, g: {}, miss: 0}));
      if (!P.last || A.t - P.last.t > GAP) ((P.sess += 1), (P.pos = 0));
      P.pos += 1;
      P.last = A;
      A.sess = A.p + '#' + P.sess;
      A.pos = P.pos;
      A.streak = A.y ? 0 : P.miss + 1;
      P.miss = A.streak;
      const G = (P.g[A.g] = P.g[A.g] || {n: 0, prev: null, miss: false, again: false});
      A.n = G.n;
      A.prev = G.prev; // the player's previous answer on this genus: {t, y, x}
      // After a miss on the genus: was an "Again: A or B?" on it asked before this answer?
      A.afterMiss = G.miss && A.f !== 'again' ? 1 : 0;
      A.afterAgain = A.afterMiss && G.again ? 1 : 0;
      G.n += 1;
      G.prev = {t: A.t, y: A.y, x: A.x, E: A.E};
      if (A.f === 'again') G.again = G.again || G.miss;
      else ((G.miss = !A.y), (G.again = false));
      // A wrong answer is a miss for the genus given too (quiz.js: it counts against both genera, rule L2), so
      // its next answers are "after a miss" and an Again on the pair follows it (Codex review #441).
      if (!A.y && A.a && A.a !== A.g) {
        const W = (P.g[A.a] = P.g[A.a] || {n: 0, prev: null, miss: false, again: false});
        W.miss = true;
        W.again = false;
      }
      // An Again on a pair also follows a miss on the genus answered for it
      if (A.f === 'again') A.ch.forEach(c => c !== A.g && P.g[c] && P.g[c].miss && (P.g[c].again = true));
      out.push(A);
    });
    return out;
  }
  // Milestones: the first 1000, 2000, 3000, … answers of the log (time order), round thousands only (Pierre, 2026-11-05:
  // never shifted by the count of the first report), none before 1000.
  function milestones(n) {
    const L = [];
    for (let k = STEP; k <= n; k += STEP) L.push(k);
    return L;
  }

  /* ---------- Intervals, verdicts and sample sizes ---------- */
  const q = (L, p) => {
    const s = L.slice().sort((a, b) => a - b),
      i = (s.length - 1) * p,
      lo = Math.floor(i);
    return s.length ? s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo) : NaN;
  };
  // Cluster bootstrap over players: each draw takes as many players as there are, with replacement, every answer of a
  // player drawn twice counted twice under two names. stat(rows) -> {key: number}. Returns {key: [2.5%, 97.5%]}: the
  // percentiles of the draws (999 in the Action), or, when BSE is set (Recompute here: 199 draws, a few minutes in the
  // browser), the normal interval from the draws' standard deviation around the estimate on the sample itself, never
  // beyond the draws' own range (Efron & Tibshirani 1993: some 200 draws give a standard error, percentiles need ~1000).
  let BSE = false;
  function boot(D, stat, B, seed) {
    const by = new Map();
    D.forEach(a => (by.get(a.p) || by.set(a.p, []).get(a.p)).push(a));
    const P = [...by.keys()];
    if (P.length < BOOT_MIN || !B) return null;
    const R = rng(seed),
      acc = {};
    for (let k = 0; k < B; k++) {
      const S = [];
      P.forEach((_, j) => {
        const pl = P[Math.floor(R() * P.length)];
        by.get(pl).forEach(a => S.push({...a, p: a.p + DUP + j}));
      });
      let v = null;
      FAST = true;
      try {
        v = stat(S);
      } catch (e) {
        v = null;
      }
      FAST = false;
      if (v) Object.entries(v).forEach(([key, x]) => isFinite(x) && (acc[key] = acc[key] || []).push(x));
    }
    let c = null;
    if (BSE) {
      FAST = true;
      try {
        c = stat(D);
      } catch (e) {
        c = null;
      }
      FAST = false;
    }
    const out = {};
    Object.entries(acc).forEach(([key, L]) => {
      if (L.length < Math.min(10, B / 2)) return;
      if (!c || !isFinite(c[key])) return (out[key] = [q(L, 0.025), q(L, 0.975)]);
      const m = mean(L),
        sd = Math.sqrt(sum(L.map(v => (v - m) ** 2)) / (L.length - 1)),
        lo0 = L.reduce((x, v) => Math.min(x, v), c[key]),
        hi0 = L.reduce((x, v) => Math.max(x, v), c[key]);
      out[key] = [Math.max(lo0, c[key] - Z * sd), Math.min(hi0, c[key] + Z * sd)];
    });
    return out;
  }
  // The answers needed for an interval of half-width h, from the current n and half-width (h scales as 1/sqrt(n)).
  const nice = n => (n < 1000 ? Math.ceil(n / 100) * 100 : Math.ceil(n / 500) * 500);
  // Verdict of one effect (Pierre, 2026-11-04: each analysis says when it cannot conclude):
  // clear: the 95% interval excludes the null value; margin: it includes it and is narrower than the smallest effect
  // that would matter (sesoi) on each side, so no effect that size; thin: it includes it and is wider, with the answers
  // that would resolve the current estimate (or the sesoi, if the estimate is smaller).
  function verdictOf(e, n) {
    // no interval, or one so wide the fit has nothing to hold on (every answer right, say): nothing to conclude yet
    if (!isFinite(e.lo) || !isFinite(e.hi) || e.hi - e.lo > 20) return {v: 'thin', need: null};
    const nul = e.nul || 0,
      h = (e.hi - e.lo) / 2;
    if (e.lo > nul || e.hi < nul) return {v: 'clear'};
    if (e.lo >= nul - e.sesoi && e.hi <= nul + e.sesoi) return {v: 'margin'};
    const t = Math.max(Math.abs(e.est - nul), e.sesoi);
    return {v: 'thin', need: nice(n * (h / t) ** 2), hw: t};
  }
  // An effect from a point estimate, its Wald SE and its bootstrap interval (the wider of the two).
  function eff(key, label, est, se, bi, unit, sesoi, n, more = {}) {
    if (more.rows === 0) return {k: key, label, unit, n, v: 'none'};
    let lo = est - Z * se,
      hi = est + Z * se;
    if (bi && bi[key]) ((lo = Math.min(lo, bi[key][0])), (hi = Math.max(hi, bi[key][1])));
    const e = {k: key, label, est, lo, hi, unit, sesoi, n, boot: !!(bi && bi[key]), ...more};
    return Object.assign(e, verdictOf(e, n));
  }
  // A variance component as an SD: Wald-like interval from the spread of a sample variance, or the bootstrap's.
  function sdEff(key, label, tau2, J, bi, unit, sesoi, n, cvm = 0) {
    const sd = Math.sqrt(tau2),
      se = J > 1 ? Math.sqrt((2 * (tau2 + cvm) ** 2) / (J - 1)) / (2 * Math.max(sd, 1e-3)) : Infinity;
    let lu = sd - Z * se,
      hi = sd + Z * se;
    if (bi && bi[key]) ((lu = Math.min(lu, bi[key][0])), (hi = Math.max(hi, bi[key][1])));
    const lo = Math.max(0, lu);
    // an SD is never below 0: "includes 0" = its lower bound under a tenth of the sesoi; lu, the lower bound before it is
    // cut at 0, gives its p-value (correct)
    const e = {k: key, label, est: sd, lo, hi, lu, unit, sesoi, n, sd: true, boot: !!(bi && bi[key])};
    if (lo > sesoi / 10) return Object.assign(e, {v: 'clear'});
    if (hi <= sesoi) return Object.assign(e, {v: 'margin'});
    return Object.assign(e, {
      v: 'thin',
      need: isFinite(hi) ? nice(n * ((hi - lo) / 2 / Math.max(sd, sesoi)) ** 2) : null,
      hw: Math.max(sd, sesoi)
    });
  }
  const players = D => new Set(D.filter(a => !a.gone).map(a => a.p)).size;
  // The players to leave out of a per-player list: those whose answers a deleted account left (gone, sheet v55).
  const goneOf = D => new Set(D.filter(a => a.gone).map(a => a.p)),
    livePl = (D, L) => {
      const G = goneOf(D);
      return G.size ? L.filter(x => !G.has(x.k)) : L;
    };
  const centre = L => {
    const m = mean(L);
    return L.map(v => v - m);
  };
  const thin = (n, min, extra) => ({thin: true, n, min, effects: [], ...extra});
  // The typical values an effect is read against (plainOf): the share of right answers, the questions' mean guess rate
  // and the median seconds to answer.
  const typOf = D => {
    const S = D.filter(a => a.s).map(a => a.s);
    return {p: mean(D.map(a => a.y)), g: mean(D.map(a => a.g0 || 0)), s: S.length ? q(S, 0.5) : null};
  };

  /* ---------- 1. Response time: player, genus and photo effects ---------- */
  const RT_X = [
    ['right', 'Right answer'],
    ['typed', 'Typed'],
    ['enl', 'Photo enlarged'],
    ['two', '2 choices'],
    ['diff', 'Expected difficulty (logit)'],
    ['pos', 'Later in the session (log position)']
  ];
  function rtFit(D, full) {
    const y = D.map(a => Math.log(a.s)),
      dif = centre(D.map(a => -a.x)),
      lp = centre(D.map(a => Math.log(a.pos))),
      X = D.map((a, i) => [1, a.y, a.typed, a.z || 0, a.ch.length === 2 ? 1 : 0, dif[i], lp[i]]),
      F = [
        factor(
          'player',
          D.map(a => a.p)
        ),
        factor(
          'genus',
          D.map(a => a.g)
        ),
        factor(
          'photo',
          D.map(a => (a.ph.length ? a.ph : null))
        )
      ];
    const M = lmm(y, X, F);
    return {M, F, X};
  }
  function rtStat(D) {
    const {M, F} = rtFit(D);
    const o = {};
    RT_X.forEach(([k], j) => (o[k] = M.b[j + 1]));
    F.forEach(f => (o['sd_' + f.name] = Math.sqrt(f.tau2)));
    o.sd_res = Math.sqrt(M.s2);
    return o;
  }
  function rt(A, B, seed) {
    const D = A.filter(a => a.s && a.x != null);
    // the model's clusters, a deleted account's included: the count shown (players) leaves it out (Codex review #600)
    if (D.length < 100 || new Set(D.map(a => a.p)).size < 2) return thin(D.length, 100);
    const {M, F, X} = rtFit(D),
      bi = boot(D, rtStat, B, seed),
      n = D.length,
      effects = RT_X.map(([k, l], j) => eff(k, l, M.b[j + 1], M.se[j + 1], bi, 'log', 0.1, n, {rows: M.nz[j + 1]}));
    F.forEach(f => effects.push(sdEff('sd_' + f.name, `SD ${f.name}`, f.tau2, f.n, bi, 'log', 0.1, n, mean([...f.cv]))));
    const parts = [...F.map(f => [f.name, f.tau2]), ['residual', M.s2]],
      tot = sum(parts.map(x => x[1]));
    const lv = (f, min) =>
      f.L.map((k, j) => ({
        k,
        f: k,
        n: f.cnt[j],
        u: f.u[j],
        lo: f.u[j] - Z * Math.sqrt(f.cv[j]),
        hi: f.u[j] + Z * Math.sqrt(f.cv[j])
      })).filter(x => x.n >= min);
    const ph = lv(F[2], 3).sort((a, b) => b.u - a.u);
    return {
      n,
      players: players(D),
      base: Math.exp(M.b[0]),
      typ: typOf(D),
      shares: parts.map(([k, v]) => ({k, v, share: v / tot})),
      effects,
      genus: lv(F[1], 1).sort((a, b) => b.u - a.u),
      photos: [...ph.slice(0, 6), ...ph.slice(-6).filter(x => !ph.slice(0, 6).includes(x))],
      player: livePl(D, lv(F[0], 1)).sort((a, b) => b.u - a.u),
      ent: entOf(M.V, X, [null, ...RT_X.map(x => x[0])])
    };
  }

  /* ---------- 2. Enlarged photos, relative to each player's own habit ---------- */
  function zoomFit(D) {
    const rate = {};
    D.forEach(a => ((rate[a.p] = rate[a.p] || [0, 0]), (rate[a.p][0] += a.z), (rate[a.p][1] += 1)));
    const r = a => rate[a.p][0] / rate[a.p][1],
      rc = centre(D.map(r));
    const X = D.map((a, i) => [1, a.z - r(a), rc[i]]),
      F = [
        factor(
          'player',
          D.map(a => a.p)
        )
      ];
    return Object.assign(
      glmm(
        D.map(a => a.y),
        X,
        F,
        {off: Float64Array.from(D.map(a => a.x)), g: Float64Array.from(D.map(a => a.g0))}
      ),
      {X}
    );
  }
  function zoom(A, B, seed) {
    const D = A.filter(a => a.z != null && a.x != null);
    const n = D.length,
      zn = sum(D.map(a => a.z));
    if (n < 100 || zn < 5) return thin(n, 100, {enlarged: zn});
    const M = zoomFit(D),
      bi = boot(
        D,
        S => {
          const m = zoomFit(S);
          return {rel: m.b[1], hab: m.b[2]};
        },
        B,
        seed
      );
    const by = {};
    D.forEach(a => {
      const o = (by[a.p] = by[a.p] || {k: a.p, n: 0, z: 0, yz: 0, ez: 0, y0: 0, e0: 0});
      o.n++;
      if (a.z) ((o.z += 1), (o.yz += a.y), (o.ez += a.E));
      else ((o.y0 += a.y), (o.e0 += a.E));
    });
    const views = {};
    D.forEach(a => {
      const k = a.qv || 'unknown',
        o = (views[k] = views[k] || {k, n: 0, z: 0});
      o.n++;
      o.z += a.z;
    });
    return {
      n,
      players: players(D),
      enlarged: zn,
      typ: typOf(D),
      effects: [
        eff('rel', 'Enlarged, against the player’s own habit (logit)', M.b[1], M.se[1], bi, 'logit', 0.25, n),
        eff('hab', 'Players who enlarge more (logit per share)', M.b[2], M.se[2], bi, 'logit', 0.25, n)
      ],
      player: livePl(D, Object.values(by)).sort((a, b) => b.z / b.n - a.z / a.n),
      views: Object.values(views),
      ent: entOf(M.V, M.X, [null, 'rel', 'hab']),
      ix: ixOf([zoomIx(D, B, seed + 31)])
    };
  }

  /* ---------- 3. Photo factors: view, quality, sharpness, source (LLTM + photo random effect) ---------- */
  const PH_X = [
    ['medium', 'Close-up (vs colony)'],
    ['macro', 'Corallites (vs colony)'],
    ['fair', 'Fair quality (vs good)'],
    ['poor', 'Poor quality (vs good)'],
    ['sharp', 'Sharper (per SD of log sharpness)'],
    ['own', 'Pierre’s photo (vs IMR lecture)'],
    ['inat', 'Other iNaturalist (vs IMR lecture)'],
    ['alone', 'One view alone (vs several)']
  ];
  function phRows(A, meta) {
    const PH = meta.ph || {},
      D = A.filter(a => a.ph.length && a.ph.every(f => PH[f]));
    const shv = D.flatMap(a => a.ph.map(f => PH[f][2])).filter(v => v != null && v > 0),
      ls = shv.map(Math.log),
      mu = mean(ls),
      sd = Math.sqrt(mean(ls.map(v => (v - mu) ** 2))) || 1;
    return D.map(a => {
      const P = a.ph.map(f => PH[f]),
        sh = P.map(x => x[2]).filter(v => v != null && v > 0),
        share = fn => P.filter(fn).length / P.length;
      a.X = [
        1,
        share(x => x[0] === 'medium'),
        share(x => x[0] === 'macro'),
        share(x => x[1] === 2),
        share(x => x[1] === 1),
        sh.length ? (mean(sh.map(Math.log)) - mu) / sd : 0,
        share(x => x[3] === 'own'),
        share(x => x[3] === 'inat'),
        P.length === 1 ? 1 : 0,
        a.typed
      ];
      return a;
    });
  }
  function phFit(D) {
    const F = [
      factor(
        'player',
        D.map(a => a.p)
      ),
      factor(
        'genus',
        D.map(a => a.g)
      ),
      factor(
        'photo',
        D.map(a => a.ph)
      )
    ];
    const M = glmm(
      D.map(a => a.y),
      D.map(a => a.X),
      F,
      {g: Float64Array.from(D.map(a => a.g0))}
    );
    return {M, F};
  }
  function photo(A, B, seed, meta) {
    const D = phRows(A, meta);
    if (D.length < 200) return thin(D.length, 200);
    const {M, F} = phFit(D),
      n = D.length,
      bi = boot(
        D,
        S => {
          const {M: m, F: f} = phFit(S),
            o = {sd_photo: Math.sqrt(f[2].tau2), sd_genus: Math.sqrt(f[1].tau2)};
          PH_X.forEach(([k], j) => (o[k] = -m.b[j + 1]));
          return o;
        },
        B,
        seed
      );
    // Reported as difficulty: + = harder (the opposite sign of the log-odds of a right answer).
    const effects = PH_X.map(([k, l], j) => eff(k, l, -M.b[j + 1], M.se[j + 1], bi, 'logit', 0.25, n, {rows: M.nz[j + 1]}));
    effects.push(sdEff('sd_photo', 'SD photo (beyond its features)', F[2].tau2, F[2].n, bi, 'logit', 0.25, n, mean([...F[2].cv])));
    effects.push(sdEff('sd_genus', 'SD genus', F[1].tau2, F[1].n, bi, 'logit', 0.25, n, mean([...F[1].cv])));
    const PH = meta.ph,
      tab = (key, lab) => {
        const o = {};
        D.forEach(a =>
          a.ph.forEach(f => {
            const k = key(PH[f]);
            const t = (o[k] = o[k] || {k, label: lab(k), n: 0, y: 0, ph: new Set()});
            t.n += 1 / a.ph.length;
            t.y += a.y / a.ph.length;
            t.ph.add(f);
          })
        );
        return Object.values(o).map(t => ({...t, ph: t.ph.size}));
      };
    const P = F[2],
      L = P.L.map((f, j) => ({
        f,
        g: null,
        n: P.cnt[j],
        d: -P.u[j],
        lo: -P.u[j] - Z * Math.sqrt(P.cv[j]),
        hi: -P.u[j] + Z * Math.sqrt(P.cv[j])
      })).filter(x => x.n >= 2);
    const gen = {};
    D.forEach(a => a.ph.forEach(f => (gen[f] = a.g)));
    L.forEach(x => (x.g = gen[x.f]));
    L.sort((a, b) => b.d - a.d);
    return {
      n,
      players: players(D),
      photos: P.n,
      typ: typOf(D),
      effects,
      views: tab(
        x => x[0],
        k => ({wide: 'Colony', medium: 'Close-up', macro: 'Corallites'})[k] || k
      ),
      sources: tab(
        x => x[3],
        k => ({imr: 'IMR lecture', own: 'Pierre’s', inat: 'Other iNaturalist'})[k] || k
      ),
      quality: tab(
        x => x[1],
        k => ({3: 'Good', 2: 'Fair', 1: 'Poor'})[k] || k
      ),
      harder: L.slice(0, 8),
      easier: L.slice(-8).reverse(),
      ent: entOf(
        M.V,
        D.map(a => a.X),
        [null, ...PH_X.map(x => x[0]), null],
        [1, ...PH_X.map(() => -1), 1]
      )
    };
  }

  /* ---------- 4. Question formats: real guess rate and difficulty against the app's fixed values ---------- */
  function fmtStat(D) {
    const o = {};
    FORMATS.forEach(([k]) => {
      const S = D.filter(a => a.f === k);
      if (S.length < 20) return;
      const r = fmtFit(
        S.map(a => a.y),
        S.map(a => a.x),
        S[0].g0
      );
      o['g_' + k] = r.c;
      o['d_' + k] = r.d;
      o['oe_' + k] = mean(S.map(a => a.y - a.E));
    });
    return o;
  }
  function formats(A, B, seed) {
    const D = A.filter(a => a.x != null);
    if (D.length < 100) return thin(D.length, 100);
    const bi = boot(D, fmtStat, B, seed),
      effects = [],
      table = [];
    FORMATS.forEach(([k, l]) => {
      const S = D.filter(a => a.f === k);
      const g0 = mean(S.map(a => a.g0)),
        row = {k, label: l, n: S.length, right: mean(S.map(a => a.y)), E: mean(S.map(a => a.E)), g0};
      table.push(row);
      if (S.length < 20) return;
      const r = fmtFit(
          S.map(a => a.y),
          S.map(a => a.x),
          S[0].g0
        ),
        oe = S.map(a => a.y - a.E),
        se = Math.sqrt(mean(oe.map(v => (v - mean(oe)) ** 2)) / S.length);
      row.fit = r;
      effects.push(eff('g_' + k, `${l}: guess rate`, r.c, r.sc, bi, 'p', 0.05, S.length, {nul: g0, ref: g0, fmt: k}));
      effects.push(
        eff('d_' + k, `${l}: difficulty beyond the app’s (logit)`, -r.d, r.sd, bi && remap(bi, 'd_' + k), 'logit', 0.25, S.length, {fmt: k})
      );
      effects.push(eff('oe_' + k, `${l}: right − expected`, mean(oe), se, bi, 'p', 0.05, S.length, {fmt: k}));
    });
    return {n: D.length, players: players(D), effects, table, ent: fmtEnt(table)};
  }
  // The bootstrap of a difficulty is stored as the shift d; reported as -d (+ = harder).
  const remap = (bi, k) => (bi[k] ? {[k]: [-bi[k][1], -bi[k][0]]} : null);

  /* ---------- Structure (the multifactor visualisation study of 2026-11-05, Pierre's Q70-Q77) ---------- */
  // Small helpers shared by the views that show how effects, genera and players relate: correlations, clustering.
  const r3 = v => (v == null || !isFinite(v) ? null : Math.round(v * 1000) / 1000);
  // Pearson correlations of the columns cols of X (rows of numbers), lower triangle: R[i][j] for j < i.
  function colCorr(X, cols) {
    const n = X.length,
      mu = cols.map(c => sum(X.map(x => x[c])) / n),
      sd = cols.map((c, a) => Math.sqrt(sum(X.map(x => (x[c] - mu[a]) ** 2)) / n));
    return cols.map((c, a) =>
      cols.slice(0, a).map((d, b) => {
        let s = 0;
        for (let i = 0; i < n; i++) s += (X[i][c] - mu[a]) * (X[i][d] - mu[b]);
        return sd[a] && sd[b] ? s / n / (sd[a] * sd[b]) : null;
      })
    );
  }
  const full = (L, diag = 1) => L.map((r, i) => L.map((_, j) => (i === j ? diag : i > j ? r[j] : L[j][i])));
  // "Effects hard to tell apart" (study §2.2, §2.3; Pierre's "correlations between effects"): for the effects one model
  // reports, the correlation of their estimates, from V, the fixed effects' covariance marginal over the random effects
  // (cov2cor(vcov(fit)) in R: near ±1, one estimate could rise as the other falls with almost as good a fit, so each
  // alone is fragile, their sum is not), and the correlation of the conditions themselves in the answers (the design
  // matrix's columns), with each condition's variance inflation factor, the diagonal of the inverse correlation matrix
  // over every condition of the model (VIF: 1 = independent of the others; above 5 to 10, entangled). keys[c]: the
  // effect key of column c (null for the intercept or a column the analysis does not report); sg[c] = -1 for an effect
  // reported with the opposite sign (a difficulty). Columns that never vary are left out. Lower triangles, 3 decimals.
  function entOf(V, X, keys, sg = []) {
    if (!V || !X || !X.length) return null;
    const vary = c => X.some(x => x[c] !== X[0][c]),
      all = keys.map((_, c) => c).filter(c => c > 0 && vary(c)),
      rep = all.filter(c => keys[c] != null);
    if (rep.length < 2) return null;
    const R = colCorr(X, all),
      Rf = full(R).map(r => r.map(v => (v == null ? 0 : v))),
      inv = inverse(Rf.map((r, i) => r.map((v, j) => v + (i === j ? 1e-9 : 0)))),
      at = c => all.indexOf(c),
      s = c => sg[c] || 1;
    return {
      k: rep.map(c => keys[c]),
      r: rep.map((c, a) => rep.slice(0, a).map(d => r3((s(c) * s(d) * V[c][d]) / Math.sqrt(Math.max(1e-300, V[c][c] * V[d][d]))))),
      x: rep.map((c, a) => rep.slice(0, a).map(d => r3(R[Math.max(at(c), at(d))][Math.min(at(c), at(d))]))),
      vif: rep.map(c => r3(Math.min(999, Math.max(1, inv[at(c)][at(c)]))))
    };
  }
  // Agglomerative clustering on a distance matrix D (n × n), by the Lance-Williams update: 'average' (UPGMA, the mean
  // distance between the two groups) or 'ward' (D holding squared Euclidean distances; heights reported as their square
  // root). Ties go to the lowest indices, so the same input always gives the same tree. Returns m: the merges [a, b,
  // height] (leaves 0..n-1, the k-th merge creates n + k) and order: the leaves left to right, each merge putting first
  // the branch that holds the lowest-numbered leaf.
  function hclust(D, link = 'average') {
    const n = D.length,
      d = D.map(r => r.slice()),
      id = [...Array(n).keys()],
      size = new Array(n).fill(1),
      on = new Array(n).fill(true),
      m = [];
    for (let s = 1; s < n; s++) {
      let bi = -1,
        bj = -1,
        bv = Infinity;
      for (let i = 0; i < n; i++)
        if (on[i]) for (let j = i + 1; j < n; j++) if (on[j] && d[i][j] < bv - 1e-12) ((bv = d[i][j]), (bi = i), (bj = j));
      m.push([id[bi], id[bj], r3(link === 'ward' ? Math.sqrt(Math.max(0, bv)) : bv)]);
      for (let k = 0; k < n; k++) {
        if (!on[k] || k === bi || k === bj) continue;
        const ni = size[bi],
          nj = size[bj],
          nk = size[k],
          v =
            link === 'ward'
              ? ((nk + ni) * d[k][bi] + (nk + nj) * d[k][bj] - nk * d[bi][bj]) / (nk + ni + nj)
              : (ni * d[k][bi] + nj * d[k][bj]) / (ni + nj);
        d[k][bi] = d[bi][k] = v;
      }
      size[bi] += size[bj];
      on[bj] = false;
      id[bi] = n + s - 1;
    }
    const kids = new Map(m.map(([a, b], k) => [n + k, [a, b]])),
      order = [],
      walk = x => (x < n ? order.push(x) : kids.get(x).forEach(walk));
    if (n) walk(n > 1 ? n + m.length - 1 : 0);
    return {m, order};
  }
  // The groups left when the tree is cut at height h: lists of leaves (each in leaf order), the groups in leaf order.
  function cutTree(T, n, h) {
    const up = [...Array(n + T.m.length).keys()],
      top = x => (up[x] === x ? x : (up[x] = top(up[x])));
    T.m.forEach(([a, b, v], k) => v <= h && ((up[top(a)] = n + k), (up[top(b)] = n + k)));
    const G = new Map();
    T.order.forEach(i => (G.get(top(i)) || G.set(top(i), []).get(top(i))).push(i));
    return [...G.values()];
  }

  // Each format's guess rate and difficulty are fitted together (fmtFit) and known to trade off: the correlation of the two
  // estimates, as reported (the guess rate rises with logit c; the difficulty is -d). Formats are fitted apart, so
  // estimates of two formats are independent: null there, and no conditions to correlate (no design matrix).
  function fmtEnt(table) {
    const F = table.filter(t => t.fit && isFinite(t.fit.cr)),
      k = F.flatMap(t => ['g_' + t.k, 'd_' + t.k]);
    return F.length
      ? {k, r: k.map((_, a) => k.slice(0, a).map((__, b) => (a % 2 && b === a - 1 ? r3(-F[(a - 1) / 2].fit.cr) : null)))}
      : null;
  }

  /* ---------- Interactions: does one effect depend on another? (the multifactor visualisation study, §5 item 6) ---------- */
  // The upper tail of a chi-square with k degrees of freedom: Q(k/2, x/2), the regularized incomplete gamma (its series
  // below a + 1, its continued fraction above: Numerical Recipes 6.2), with Lanczos's log gamma.
  function lgam(z) {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = z,
      t = z + 5.5,
      s = 1.000000000190015;
    t -= (z + 0.5) * Math.log(t);
    c.forEach(v => (s += v / ++y));
    return -t + Math.log((2.5066282746310005 * s) / z);
  }
  function chi2q(x, k) {
    if (!(x > 0)) return 1;
    if (!isFinite(x)) return 0;
    const a = k / 2,
      y = x / 2,
      ln = a * Math.log(y) - y - lgam(a);
    if (y < a + 1) {
      let t = 1 / a,
        s = t;
      for (let n = 1; n < 1000 && Math.abs(t) > Math.abs(s) * 1e-15; n++) ((t *= y / (a + n)), (s += t));
      return clamp(1 - s * Math.exp(ln), 0, 1);
    }
    let b = y + 1 - a,
      c = 1e300,
      d = 1 / b,
      h = d;
    for (let i = 1; i < 1000; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      c = b + an / c;
      if (Math.abs(d) < 1e-300) d = 1e-300;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      h *= d * c;
      if (Math.abs(d * c - 1) < 1e-15) break;
    }
    return clamp(Math.exp(ln) * h, 0, 1);
  }
  // The chi-square value with upper tail p (bisection on chi2q).
  function chi2inv(p, k) {
    let lo = 0,
      hi = Math.max(10, 4 * k);
    while (chi2q(hi, k) > p) hi *= 2;
    for (let i = 0; i < 100; i++) {
      const m = (lo + hi) / 2;
      if (chi2q(m, k) > p) lo = m;
      else hi = m;
    }
    return (lo + hi) / 2;
  }
  // b' V^-1 b, and the covariance of bootstrap draws (rows of equal length).
  const quad = (b, V) => {
    const s = solve(
      V.map(r => r.slice()),
      b
    );
    return Math.max(0, sum(b.map((v, i) => v * s[i])));
  };
  const covOf = L => {
    const k = L[0].length,
      m = L[0].map((_, j) => mean(L.map(r => r[j])));
    return m.map((_, a) => m.map((__, c) => sum(L.map(r => (r[a] - m[a]) * (r[c] - m[c]))) / (L.length - 1)));
  };
  // A linear combination c'b of a fit's fixed effects with its 95% interval from the model's covariance (plus a random
  // effect's conditional variance cv, when the combination holds one).
  const lin = (M, c, u = 0, cv = 0) => {
    const est = sum(c.map((v, a) => v * M.b[a])) + u,
      va = sum(c.map((v, a) => sum(c.map((w, d) => v * w * (M.V ? M.V[a][d] : 0))))) + cv,
      se = Math.sqrt(Math.max(0, va));
    return [r3(est), r3(est - Z * se), r3(est + Z * se)];
  };
  // The omnibus test of an interaction: do the coefficients of its product columns (cols, in the fit M) all vanish? A
  // Wald chi-square from the model's covariance and, with BIX_MIN bootstrap draws or more (over players: the same cluster
  // bootstrap, BIX draws, a covariance needs some 200: Efron & Tibshirani 1993), from the draws' covariance; the larger p
  // of the two, as the wider of the two intervals elsewhere (p0). One test per interaction, exploratory (correct: the
  // Benjamini-Hochberg family; Pierre's primary effects stay those of Q69). inm: every product coefficient inside the
  // smallest effect that matters with its 95% interval (the wider of the two): "no difference that would matter".
  const BIX = 199,
    BIX_MIN = 50,
    IX_N = 30; // answers (offers) a level needs to enter an interaction
  function ixTest(k, M, cols, draws, n, sesoi = 0.25) {
    const df = cols.length;
    if (!df || !M.V || cols.some(c => !isFinite(M.b[c]))) return null;
    const b = cols.map(c => M.b[c]),
      Vm = cols.map(a => cols.map(c => M.V[a][c])),
      Wm = quad(b, Vm),
      pm = chi2q(Wm, df),
      D = (draws || []).filter(r => r.every(isFinite)),
      Vb = D.length >= BIX_MIN ? covOf(D) : null,
      Wb = Vb ? quad(b, Vb) : null,
      pb = Vb ? chi2q(Wb, df) : null,
      se = b.map((_, i) => Math.sqrt(Math.max(Vm[i][i], Vb ? Vb[i][i] : 0)));
    return {
      k,
      ix: 1,
      df,
      W: r3(Vb && Wb < Wm ? Wb : Wm),
      pm: sig3(pm),
      pb: sig3(pb),
      p0: Math.max(pm, pb == null ? 0 : pb),
      draws: D.length,
      n,
      sesoi,
      b: b.map(r3),
      se: se.map(r3),
      inm: b.every((v, i) => Math.abs(v) + Z * se[i] <= sesoi) ? 1 : 0
    };
  }
  // The draws of an interaction's product coefficients: the cluster bootstrap over players (boot) of fit(S).b[cols];
  // BIX draws for the latest milestone (B = BOOT), BIX_MIN for the earlier ones and Recompute here (B = 199), so the
  // three interactions add about a sixth to the Action's time at the latest milestone (estimated from 60 draws on 7,200
  // synthetic answers, 2026-11-09).
  const ixB = B => (B >= BOOT ? BIX : B >= 199 ? BIX_MIN : 0);
  function ixDraws(D, fit, cols, B, seed) {
    if (!ixB(B)) return null;
    const L = [];
    boot(
      D,
      S => {
        // not the estimate on the sample itself (boot's BSE call, Recompute here): draws only
        if (S === D) return null;
        const b = fit(S).b;
        L.push(cols.map(c => b[c]));
        return null;
      },
      ixB(B),
      seed
    );
    return L;
  }
  // Enlarging × the view shown (Enlarging photos): the Zoom model with each view's own level and its own effect of
  // enlarging (against a colony photo), views with IX_N answers and 5 enlarged or more. Lines: for each view, the
  // log-odds against the app's expectation, not enlarged and enlarged (the player at their own habit).
  const IX_V = ['medium', 'macro', 'multi'];
  function zoomIxFit(D, L) {
    const rate = {};
    D.forEach(a => ((rate[a.p] = rate[a.p] || [0, 0]), (rate[a.p][0] += a.z), (rate[a.p][1] += 1)));
    const rc = centre(D.map(a => rate[a.p][0] / rate[a.p][1])),
      X = D.map((a, i) => {
        const rel = a.z - rate[a.p][0] / rate[a.p][1],
          v = L.map(x => (a.qv === x ? 1 : 0));
        return [1, rel, rc[i], ...v, ...v.map(x => x * rel)];
      });
    return glmm(
      D.map(a => a.y),
      X,
      [
        factor(
          'player',
          D.map(a => a.p)
        )
      ],
      {off: Float64Array.from(D.map(a => a.x)), g: Float64Array.from(D.map(a => a.g0))}
    );
  }
  function zoomIx(D0, B, seed) {
    const cnt = {};
    D0.forEach(a => {
      const c = (cnt[a.qv] = cnt[a.qv] || [0, 0]);
      c[0]++;
      c[1] += a.z;
    });
    const ok = v => cnt[v] && cnt[v][0] >= IX_N && cnt[v][1] >= 5,
      L = IX_V.filter(ok);
    if (!ok('wide') || !L.length) return null;
    const D = D0.filter(a => a.qv === 'wide' || L.includes(a.qv)),
      k = L.length,
      M = zoomIxFit(D, L),
      cols = L.map((_, j) => 3 + k + j),
      t = ixTest(
        'view',
        M,
        cols,
        ixDraws(D, S => zoomIxFit(S, L), cols, B, seed),
        D.length
      );
    if (!t) return null;
    // enlarging is read against the player's own habit (rel = z - the player's rate): for a player at the typical rate rb
    // (the rows' mean, as the habit column is centred on), not enlarging is rel = -rb, enlarging 1 - rb (Codex review #829)
    const rate = {};
    D.forEach(a => ((rate[a.p] = rate[a.p] || [0, 0]), (rate[a.p][0] += a.z), (rate[a.p][1] += 1)));
    const rb = mean(D.map(a => rate[a.p][0] / rate[a.p][1])),
      cz = (j, rel) => [1, rel, 0, ...L.map((_, i) => (i === j - 1 ? 1 : 0)), ...L.map((_, i) => (i === j - 1 ? rel : 0))],
      c0 = j => cz(j, -rb),
      c1 = j => cz(j, 1 - rb);
    t.lv = ['wide', ...L].map((v, j) => ({
      k: v,
      n: cnt[v][0],
      z: cnt[v][1],
      off: lin(M, c0(j)),
      on: lin(M, c1(j)),
      d: lin(
        M,
        c1(j).map((x, i) => x - c0(j)[i])
      )
    }));
    return t;
  }
  // The pair × the view shown (Genera mixed up; ROADMAP "Analyses: next views"): where a miss goes, by view, pair by pair.
  // Among the questions missed with choices, each wrong genus offered is a chance to be the one picked (the Confusions
  // model on missed questions only: the view's main effect on missing is the photo analysis's; asked on every offer, a
  // pair often mixed up would show a "pair × view" effect from the log-odds scale alone, as misses rise on harder views),
  // with, for the IX_PAIRS pairs most offered together on a colony and on another view (IX_N offers each), the pair's own
  // effect of each such view. Lines: each pair's chance to be the one picked, by view (its own effect included), and a
  // typical pair's.
  const IX_PAIRS = 6,
    IX_NM = 20; // offers on missed questions a pair needs on a view
  function missRows(A) {
    const E = [];
    A.forEach(a => {
      if (a.typed || a.y || a.ch.length < 2 || !a.ch.includes(a.a)) return;
      a.ch.forEach(c => {
        if (c === a.g) return;
        E.push({p: a.p, gone: a.gone, pair: [a.g, c].sort().join('|'), y: a.a === c ? 1 : 0, qv: a.qv, k: a.ch.length});
      });
    });
    return E;
  }
  function confIxFit(E, P) {
    const X = E.map(e => {
      const v = [e.qv === 'medium' ? 1 : 0, e.qv === 'macro' ? 1 : 0, e.qv === 'multi' ? 1 : 0];
      return [1, ...v, Math.log(e.k - 1), ...P.map(([pr, w]) => (e.pair === pr && e.qv === w ? 1 : 0))];
    });
    return glmm(
      E.map(e => e.y),
      X,
      [
        factor(
          'pair',
          E.map(e => e.pair)
        ),
        factor(
          'player',
          E.map(e => e.p)
        )
      ],
      {tau0: 0.3}
    );
  }
  function confIx(A, B, seed) {
    const E = missRows(A),
      by = {};
    E.forEach(e => {
      const o = (by[e.pair] = by[e.pair] || {k: e.pair, off: 0, mix: 0, v: {}}),
        w = e.qv || 'wide',
        c = (o.v[w] = o.v[w] || [0, 0]);
      o.off++;
      o.mix += e.y;
      c[0]++;
      c[1] += e.y;
    });
    const top = Object.values(by)
      .filter(o => o.v.wide && o.v.wide[0] >= IX_NM && IX_V.some(w => o.v[w] && o.v[w][0] >= IX_NM))
      .sort((a, b) => b.off - a.off || (a.k < b.k ? -1 : 1))
      .slice(0, IX_PAIRS);
    const P = top.flatMap(o => IX_V.filter(w => o.v[w] && o.v[w][0] >= IX_NM).map(w => [o.k, w]));
    if (!P.length) return null;
    const fit = S => confIxFit(S, P),
      M = fit(E),
      cols = P.map((_, j) => 5 + j),
      t = ixTest('pairview', M, cols, ixDraws(E, fit, cols, B, seed), E.length);
    if (!t) return null;
    const Fp = M.F[0],
      pj = new Map(Fp.L.map((x, j) => [x, j])),
      base = w => [1, w === 'medium' ? 1 : 0, w === 'macro' ? 1 : 0, w === 'multi' ? 1 : 0, Math.log(3)],
      views = ['wide', ...IX_V.filter(w => P.some(x => x[1] === w))];
    t.views = views;
    t.typ = views.map(w => lin(M, [...base(w), ...P.map(() => 0)]));
    t.pairs = top.map(o => {
      const j = pj.get(o.k);
      return {
        k: o.k,
        off: o.off,
        mix: o.mix,
        v: views.map(w => {
          const at = P.findIndex(x => x[0] === o.k && x[1] === w);
          return [
            w,
            o.v[w] ? o.v[w][0] : 0,
            o.v[w] ? o.v[w][1] : 0,
            ...(w === 'wide' || at >= 0
              ? lin(M, [...base(w), ...P.map((_, i) => (i === at ? 1 : 0))], Fp.u[j], Fp.cv[j])
              : [null, null, null])
          ];
        })
      };
    });
    return t;
  }
  // The format × practice (Learning with practice): the Learning model with a two-choice level, and the practice slope of
  // two-choice and typed questions apart from that of four choices (formats with 100 answers or more, answered at more
  // than one level of practice). Lines: the log-odds of recognising beyond guessing by practice, per format.
  const IX_F = [
      ['four', '4 choices'],
      ['two', '2 choices'],
      ['typed', 'Typed']
    ],
    IX_GRID = [0, 1, 2, 4, 8, 16, 32];
  const fgOf = a => (a.typed ? 'typed' : a.f === 'again' || a.f === 'qduel' || a.f === 'duel' ? 'two' : 'four');
  function lnIxFit(D, L) {
    const X = D.map(a => {
      const l = Math.log(1 + a.n),
        g = fgOf(a);
      return [
        1,
        l,
        a.afterMiss,
        a.afterAgain,
        a.typed,
        a.exam,
        a.back,
        L.includes('two') && g === 'two' ? 1 : 0,
        ...L.map(x => (g === x ? l : 0))
      ];
    });
    // the Learning model's random slopes too (lnFit), so a format's slope is not read off a few players' own
    const l0 = D.map(a => Math.log(1 + a.n)),
      lc = mean(l0);
    return glmm(
      D.map(a => a.y),
      X,
      [
        factor(
          'player',
          D.map(a => a.p)
        ),
        factor(
          'genus',
          D.map(a => a.g)
        ),
        factor(
          'player slope',
          D.map(a => a.p),
          l0.map(v => v - lc)
        ),
        factor(
          'genus slope',
          D.map(a => a.g),
          l0.map(v => v - lc)
        )
      ],
      {g: Float64Array.from(D.map(a => a.g0))}
    );
  }
  function lnIx(D, B, seed) {
    const cnt = {};
    D.forEach(a => {
      const g = fgOf(a),
        c = (cnt[g] = cnt[g] || {n: 0, s: new Set()});
      c.n++;
      c.s.add(a.n); // every practice count it was asked at (Codex review #829: capped at 2, later practice read as none)
    });
    const ok = g => cnt[g] && cnt[g].n >= 100 && cnt[g].s.size > 1,
      L = ['two', 'typed'].filter(ok);
    if (!ok('four') || !L.length) return null;
    const fit = S => lnIxFit(S, L),
      M = fit(D),
      cols = L.map((_, j) => 8 + j),
      t = ixTest('fmtpractice', M, cols, ixDraws(D, fit, cols, B, seed), D.length);
    if (!t) return null;
    t.grid = IX_GRID;
    t.lv = IX_F.filter(([g]) => g === 'four' || L.includes(g)).map(([g, label]) => ({
      k: g,
      label,
      n: cnt[g].n,
      pts: IX_GRID.map(x => {
        const l = Math.log(1 + x);
        return [x, ...lin(M, [1, l, 0, 0, g === 'typed' ? 1 : 0, 0, 0, g === 'two' ? 1 : 0, ...L.map(y => (y === g ? l : 0))])];
      })
    }));
    return t;
  }
  // The interactions an analysis carries (the ones that could be fitted).
  const ixOf = L => {
    const T = L.filter(Boolean);
    return T.length ? T : undefined;
  };

  /* ---------- 5. Confusions: pair × view, each player against the pooled rates ---------- */
  const CF_X = [
    ['medium', 'Close-up shown (vs colony)'],
    ['macro', 'Corallites shown (vs colony)'],
    ['multi', 'Several views shown (vs colony)']
  ];
  function confRows(A) {
    const E = [];
    A.forEach(a => {
      if (a.typed || a.ch.length < 2) return;
      a.ch.forEach(c => {
        if (c === a.g) return;
        E.push({p: a.p, gone: a.gone, pair: [a.g, c].sort().join('|'), from: a.g, to: c, y: a.a === c ? 1 : 0, qv: a.qv, k: a.ch.length});
      });
    });
    return E;
  }
  function confFit(E) {
    const X = E.map(e => [1, e.qv === 'medium' ? 1 : 0, e.qv === 'macro' ? 1 : 0, e.qv === 'multi' ? 1 : 0, Math.log(e.k - 1)]),
      F = [
        factor(
          'pair',
          E.map(e => e.pair)
        ),
        factor(
          'player',
          E.map(e => e.p)
        )
      ];
    return {
      M: glmm(
        E.map(e => e.y),
        X,
        F,
        {tau0: 0.3}
      ),
      F,
      X
    };
  }
  function confusions(A, B, seed) {
    const E = confRows(A),
      mixed = sum(E.map(e => e.y));
    if (E.length < 300 || mixed < 20) return thin(E.length, 300, {mixed});
    const {M, F, X} = confFit(E),
      n = E.length,
      bi = boot(
        E,
        S => {
          const r = confFit(S),
            o = {sd_pair: Math.sqrt(r.F[0].tau2), sd_player: Math.sqrt(r.F[1].tau2)};
          CF_X.forEach(([k], j) => (o[k] = r.M.b[j + 1]));
          return o;
        },
        B,
        seed
      );
    // A view never shown (a subject whose photos have no views: the fish, SUBJECTS analyses photos false) is no effect:
    // nothing measured it, so it is left out rather than read "no clear effect" (and kept out of the multiple-testing count).
    const effects = CF_X.map(([k, l], j) =>
      M.nz[j + 1] ? eff(k, l, M.b[j + 1], M.se[j + 1], bi, 'logit', 0.25, n, {rows: M.nz[j + 1]}) : null
    ).filter(Boolean);
    effects.push(sdEff('sd_player', 'SD player (each player vs pooled)', F[1].tau2, F[1].n, bi, 'logit', 0.25, n, mean([...F[1].cv])));
    effects.push(sdEff('sd_pair', 'SD pair', F[0].tau2, F[0].n, bi, 'logit', 0.25, n, mean([...F[0].cv])));
    const P = {};
    E.forEach(e => {
      const o = (P[e.pair] = P[e.pair] || {k: e.pair, off: 0, mix: 0, v: {}});
      o.off++;
      o.mix += e.y;
      const v = (o.v[e.qv || 'unknown'] = o.v[e.qv || 'unknown'] || [0, 0]);
      v[0]++;
      v[1] += e.y;
    });
    const pj = new Map(F[0].L.map((k, j) => [k, j]));
    const pairs = Object.values(P)
      .filter(o => o.mix)
      .sort((a, b) => b.mix - a.mix || b.off - a.off)
      .slice(0, 15)
      .map(o => {
        const j = pj.get(o.k);
        return {...o, u: F[0].u[j], lo: F[0].u[j] - Z * Math.sqrt(F[0].cv[j]), hi: F[0].u[j] + Z * Math.sqrt(F[0].cv[j])};
      });
    // Each player's mix-ups against what the pooled rates (pair, view, choices) expect of them.
    const pl = {},
      Fp = F[1],
      jp = new Map(Fp.L.map((k, j) => [k, j]));
    E.forEach((e, i) => {
      const o = (pl[e.p] = pl[e.p] || {k: e.p, n: 0, mix: 0, exp: 0});
      o.n++;
      o.mix += e.y;
      o.exp += sig(M.eta[i] - Fp.u[jp.get(e.p)]);
    });
    const plist = Object.values(pl).map(o => {
      const j = jp.get(o.k);
      // observed / expected (expected from the pooled rates: pair, view, choices), its interval from the count's Poisson
      // spread (square-root scale); the player's own effect apart, as an odds ratio (Codex review #441: exp(u) is not
      // observed / expected when mix-ups are common)
      const e = Math.max(o.exp, 1e-9);
      return {
        ...o,
        oe: o.mix / e,
        lo: Math.max(0, Math.sqrt(o.mix) - Z / 2) ** 2 / e,
        hi: (Math.sqrt(o.mix + 1) + Z / 2) ** 2 / e,
        or: Math.exp(Fp.u[j]),
        orLo: Math.exp(Fp.u[j] - Z * Math.sqrt(Fp.cv[j])),
        orHi: Math.exp(Fp.u[j] + Z * Math.sqrt(Fp.cv[j]))
      };
    });
    return {
      n,
      mixed,
      players: players(E),
      typ: {p: mixed / n},
      effects,
      pairs,
      player: livePl(E, plist).sort((a, b) => b.n - a.n),
      ent: entOf(M.V, X, [null, ...CF_X.map(x => x[0]), null]),
      map: mixMap(E, M, F),
      ix: ixOf([confIx(A, B, seed + 31)])
    };
  }

  // The mix-up map (study §2.11, its first pick; Pierre's Q74: a phone form, the whole matrix from tablet width up):
  // which genera form families of mix-ups. Similarity of two genera = how much more often, at the least, their pair is
  // mixed up than a typical pair: the lower end of the 95% range of the pair's shrunk effect u in the model above (a log
  // odds ratio: rates per offer, not counts, which mirror the app's choice of traps), 0 for a pair not clearly above a
  // typical one or never offered, so noise makes no family; distance = 1 - similarity / the largest one; average
  // linkage. Families: the groups of two genera or more left when the tree is cut at MIX_CUT (on average at least a
  // fifth of the clearest pair's excess); none until a pair is clearly mixed up more than typical. Only genera mixed up
  // at least once, as the genus shown or the one answered. Each cell (shown -> answered, the asymmetric matrix) carries its offers, its
  // mix-ups and its rate shrunk towards the pair's model rate (MIX_K offers' worth: a direction shows only with many offers). Across: the 3 cells most mixed up
  // between two families (or genera outside any), at least 2 mix-ups and above the typical rate: look at their photos.
  const MIX_CUT = 0.8,
    MIX_K = 20;
  function mixMap(E, M, F) {
    const P = F[0],
      pj = new Map(P.L.map((k, j) => [k, j])),
      cell = new Map();
    E.forEach(e => {
      const k = e.from + '\u0002' + e.to,
        c = cell.get(k) || cell.set(k, {from: e.from, to: e.to, off: 0, mix: 0}).get(k);
      c.off++;
      c.mix += e.y;
    });
    const g = [...new Set([...cell.values()].filter(c => c.mix).flatMap(c => [c.from, c.to]))].sort();
    if (g.length < 3) return null;
    const n = g.length,
      gi = new Map(g.map((x, i) => [x, i])),
      typ = M.b[0] + M.b[4] * Math.log(3), // a colony photo, 4 choices
      jOf = (a, b) => pj.get([a, b].sort().join('|')),
      u = (a, b) => (jOf(a, b) == null ? null : P.u[jOf(a, b)]),
      lo = (a, b) => (jOf(a, b) == null ? 0 : P.u[jOf(a, b)] - Z * Math.sqrt(P.cv[jOf(a, b)])),
      S = g.map(a => g.map(b => (a === b ? 0 : Math.max(0, lo(a, b))))),
      smax = Math.max(0, ...S.flat());
    const T = hclust(S.map((r, i) => r.map((v, j) => (i === j ? 0 : smax > 0 ? 1 - v / smax : 1)))),
      pos = new Map(T.order.map((i, k) => [i, k])),
      fam = smax > 0 ? cutTree(T, n, MIX_CUT).filter(L => L.length > 1) : [],
      famOf = new Map(fam.flatMap((L, f) => L.map(i => [i, f]))),
      // leaves renumbered in display order (0 = first row and column)
      re = i => pos.get(i),
      cells = [...cell.values()]
        .filter(c => gi.has(c.from) && gi.has(c.to))
        .map(c => {
          const i = gi.get(c.from),
            j = gi.get(c.to),
            pr = sig(typ + (u(c.from, c.to) || 0));
          return [re(i), re(j), c.off, c.mix, r3((c.mix + MIX_K * pr) / (c.off + MIX_K))];
        })
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]),
      fo = i => (famOf.has(i) ? famOf.get(i) : 'g' + i),
      base = sig(typ);
    const across = cells
      .filter(c => c[3] >= 2 && c[4] > base && fo(T.order[c[0]]) !== fo(T.order[c[1]]))
      .sort((a, b) => b[4] - a[4] || b[3] - a[3])
      .slice(0, 3)
      .map(c => [c[0], c[1]]);
    return {
      g: T.order.map(i => g[i]),
      m: T.m.map(([a, b, h]) => [a < n ? re(a) : a, b < n ? re(b) : b, h]),
      fam: fam.map(L => L.map(re)),
      cells,
      base: r3(base),
      cut: MIX_CUT,
      across,
      left: new Set(E.flatMap(e => [e.from, e.to])).size - n
    };
  }

  /* ---------- 6. Learning curves: exposures to mastery, and what follows a miss ---------- */
  const LN_X = [
    ['slope', 'Learning slope (logit per log exposure)'],
    ['afterMiss', 'Right after a miss on the genus'],
    ['again', 'Again asked after the miss (extra effect)'],
    ['typed', 'Typed'],
    ['exam', 'Exam question'],
    ['back', 'Comeback question']
  ];
  const MASTER = 0.8; // mastery = 80% recognised beyond guessing, the app's target success
  // Random practice slopes (Pierre, 2026-11-04, ROADMAP "Analyses: next views": per-genus learning slopes; 2026-11-05,
  // the player profiles' learning slope): each player and each genus its own slope on log(1 + answers on the genus),
  // around the common one, uncorrelated with its own level (lme4's (1 | g) + (0 + x | g)); the covariate centred on the
  // answers' mean (lc), so each level stays the level at typical practice. F: player, genus, player slope, genus slope.
  function lnFit(D) {
    const L = D.map(a => Math.log(1 + a.n)),
      lc = mean(L),
      X = D.map((a, i) => [1, L[i], a.afterMiss, a.afterAgain, a.typed, a.exam, a.back]),
      F = [
        factor(
          'player',
          D.map(a => a.p)
        ),
        factor(
          'genus',
          D.map(a => a.g)
        ),
        factor(
          'player slope',
          D.map(a => a.p),
          L.map(v => v - lc)
        ),
        factor(
          'genus slope',
          D.map(a => a.g),
          L.map(v => v - lc)
        )
      ];
    const M = glmm(
      D.map(a => a.y),
      X,
      F,
      {g: Float64Array.from(D.map(a => a.g0))}
    );
    return {M, F, X, lc};
  }
  // A genus's (or player's) own intercept and slope on log(1 + answers): b0 + u - v lc and b1 + v (the slope's weight is
  // log(1 + answers) - lc).
  const ownLine = (M, lc, u = 0, v = 0) => [M.b[0] + u - v * lc, M.b[1] + v];
  // Answers to reach MASTER: 0 when the start is already there, whatever the slope (Codex review #441); 999 = not
  // reached (a flat or falling slope below it).
  // 95% interval of the answers to MASTER from the joint uncertainty of the intercept and the slope (their covariance in
  // the fit, V: 2 x 2) and of the genus's own effect (u, its conditional variance cv): seeded draws (Codex review #441:
  // varying the slope alone gave [0, 0] for an intercept above the target whatever its own uncertainty).
  function masterCI(b0, b1, V, u = 0, cv = 0, seed = 1, sl = null) {
    const R = rng(seed),
      nrm = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R()),
      a = Math.sqrt(Math.max(0, V[0][0])),
      c = a ? V[1][0] / a : 0,
      d = Math.sqrt(Math.max(0, V[1][1] - c * c)),
      L = [];
    // sl: [cv of the own slope, lc] (lnFit): b0 and b1 are then the own line (ownLine), the slope's draw moving both
    for (let k = 0; k < 1000; k++) {
      const z1 = nrm(),
        z2 = nrm(),
        uu = u + Math.sqrt(Math.max(0, cv)) * nrm(),
        dv = sl ? Math.sqrt(Math.max(0, sl[0])) * nrm() : 0;
      L.push(toMaster(b0 + a * z1 - dv * (sl ? sl[1] : 0), b1 + c * z1 + d * z2 + dv, uu));
    }
    return [q(L, 0.025), q(L, 0.975)];
  }
  const toMaster = (b0, b1, u) => (b0 + u >= logit(MASTER) ? 0 : b1 > 0 ? clamp(Math.exp((logit(MASTER) - b0 - u) / b1) - 1, 0, 999) : 999);
  // The Wright map (study §2.7, §5 item 3): players and genera on the Learning model's one scale, the log-odds of
  // recognising beyond guessing (typical question: no miss just before, not typed, not an exam). A player's place = the
  // intercept, the practice slope at the player's own current practice (the median answers already given on the genus
  // over their last PROF_N answers) and their own effect; a genus's = minus its own effect (its difficulty, the photos
  // the app chose for it included). A genus level with a player: about 50% recognised beyond guessing; 80% when the player
  // sits logit(0.8) above it (the app's target). A snapshot of the bank's reach, not of the questions asked: the app aims
  // near 80%, so it makes players and genera meet. th: [id, place, answers, SE]; g: [genus, difficulty, answers, SE].
  // From random slopes (lnFit): each place at its own slope too, the slope's conditional variance in its SE.
  function wrightOf(D, M, F, lc = 0) {
    const P = F[0],
      G = F[1],
      PS = F[2],
      GS = F[3],
      vs = (f, j) => (f ? [f.u[j], f.cv[j]] : [0, 0]),
      by = new Map(),
      cnt = {},
      gone = goneOf(D);
    D.forEach(a => ((by.get(a.p) || by.set(a.p, []).get(a.p)).push(a), (cnt[a.g] = (cnt[a.g] || 0) + 1)));
    // each place's uncertainty carries the intercept's and the slope's, with their covariance (V, as masterCI), beside the
    // player's or genus's own effect (Codex review #620: the random effect's alone gave ranges too narrow)
    const V = M.V || [
        [0, 0],
        [0, 0]
      ],
      fixVar = l => Math.max(0, V[0][0] + l * l * V[1][1] + 2 * l * V[0][1]),
      lp = P.L.map(id =>
        Math.log(
          1 +
            q(
              by
                .get(id)
                .slice(-PROF_N)
                .map(a => a.n),
              0.5
            )
        )
      ),
      // a deleted account's answers are in the fit, never a player on the map (sheet v55)
      live = P.L.map((id, j) => j).filter(j => !gone.has(P.L[j])),
      lt = q(
        live.map(j => lp[j]),
        0.5
      ); // the typical player: the median current practice, their own effect 0
    const pj = PS ? new Map(PS.L.map((k, j) => [k, j])) : null,
      gj = GS ? new Map(GS.L.map((k, j) => [k, j])) : null;
    return {
      th: live.map(j => {
        const [v, cvv] = vs(PS, pj && pj.get(P.L[j])),
          d = lp[j] - lc;
        return [
          P.L[j],
          r3(M.b[0] + M.b[1] * lp[j] + P.u[j] + v * d),
          by.get(P.L[j]).length,
          r3(Math.sqrt(fixVar(lp[j]) + P.cv[j] + cvv * d * d))
        ];
      }),
      g: G.L.map((x, j) => {
        const [v, cvv] = vs(GS, gj && gj.get(x)),
          d = lt - lc;
        return [x, r3(-G.u[j] - v * d), cnt[x], r3(Math.sqrt(fixVar(lt) + G.cv[j] + cvv * d * d))];
      }),
      mid: r3(M.b[0] + M.b[1] * lt), // the typical player's place: a genus's chance for them is sig(mid - difficulty)
      m: r3(logit(MASTER))
    };
  }
  // A second skill? (study §2.4, §5 item 5; Pierre's Q77: residual PCA, never a PCA of raw right / wrong answers): the
  // genus × player table of standardised residuals after the Learning model, each cell sum(right - P) / sqrt(sum P(1 - P)
  // + RES_K) (shrunk towards the model's prediction when the player met the genus little; 0 when never), players with
  // PROF_MIN answers or more, genera met by 2 of them or more; a PCA of the players' columns (centred): genera as points,
  // players as arrows. If the model's one ability per player and one difficulty per genus explain everything, the first
  // axis is noise: its share of the spread is set against the same share in the table built from RES_SIMS answer logs
  // simulated from the fit itself (the Rasch world's dimensionality check, Linacre 1998, Raîche 2005; a share, not the
  // eigenvalue itself, as the simulated logs are not refitted and their residuals run larger). Descriptive: no verdict,
  // outside the multiple-testing correction. lam: the first two eigenvalues, var: their shares, null: [median, 95th
  // percentile] of the first axis's share in the simulations.
  const RES_K = 2,
    RES_SIMS = 99;
  function resOf(D, M, F, seed) {
    const Pr = D.map((a, i) => clamp(a.g0 + (1 - a.g0) * sig(M.eta[i]), 1e-6, 1 - 1e-6)),
      cnt = {};
    // a deleted account's answers (gone, sheet v55) stay in the fit, never as a player's column
    D.forEach(a => !a.gone && (cnt[a.p] = (cnt[a.p] || 0) + 1));
    const pl = Object.keys(cnt)
        .filter(p => cnt[p] >= PROF_MIN)
        .sort(),
      pi = new Map(pl.map((p, i) => [p, i])),
      gp = {};
    D.forEach(a => pi.has(a.p) && (gp[a.g] = gp[a.g] || new Set()).add(a.p));
    const gs = Object.keys(gp)
        .filter(g => gp[g].size >= 2)
        .sort(),
      gi = new Map(gs.map((g, i) => [g, i]));
    if (pl.length < 3 || gs.length < 5) return null;
    const rows = D.map((a, i) => [gi.get(a.g), pi.get(a.p), i]).filter(r => r[0] != null && r[1] != null);
    const table = y => {
      const num = gs.map(() => pl.map(() => 0)),
        den = gs.map(() => pl.map(() => 0));
      rows.forEach(([g, p, i]) => ((num[g][p] += y(i) - Pr[i]), (den[g][p] += Pr[i] * (1 - Pr[i]))));
      const T = num.map((r, g) => r.map((v, p) => (den[g][p] ? v / Math.sqrt(den[g][p] + RES_K) : 0)));
      // centre each player's column (the player's mean residual is level, which the model already has)
      pl.forEach((_, p) => {
        const m = mean(T.map(r => r[p]));
        T.forEach(r => (r[p] -= m));
      });
      return T;
    };
    const cov = T => pl.map((_, a) => pl.map((__, b) => sum(T.map(r => r[a] * r[b])) / T.length)),
      T = table(i => D[i].y),
      E = eigSym(cov(T)),
      R = rng((seed || 1) + 4242),
      sims = [];
    for (let k = 0; k < RES_SIMS; k++) {
      const ys = Pr.map(p => (R() < p ? 1 : 0));
      const v = eigSym(cov(table(i => ys[i]))).val;
      sims.push(v[0] / (sum(v.map(x => Math.max(0, x))) || 1));
    }
    const tot = sum(E.val.map(v => Math.max(0, v))) || 1,
      ax = [0, 1].map(k => {
        const vec = E.vec.map(r => r[k]),
          big = vec.reduce((m, x) => (Math.abs(x) > Math.abs(m) ? x : m), 0);
        return {vec: vec.map(x => x * (big < 0 ? -1 : 1)), val: Math.max(0, E.val[k])};
      });
    return {
      lam: ax.map(a => r3(a.val)),
      var: ax.map(a => r3(a.val / tot)),
      null: [r3(q(sims, 0.5)), r3(q(sims, 0.95))], // the first axis's share of the spread in the simulated tables
      sims: RES_SIMS,
      g: gs.map((g, i) => [g, ...ax.map(a => r3(sum(T[i].map((v, p) => v * a.vec[p]))))]),
      p: pl.map((p, j) => [p, ...ax.map(a => r3(a.vec[j] * Math.sqrt(a.val)))])
    };
  }
  // Per-genus learning curves (the study's §5 item 7; ROADMAP "Analyses: next views", per-genus learning slopes): for
  // each genus, its own slope (the common one + its random slope, with the fit's variance of the common slope and the
  // random slope's conditional variance), its chance of recognising it beyond guessing at the typical player's current
  // practice (as the Wright map), and, by the answers already given on it (BINS), the right answers against the fitted
  // chance (the model's own prediction of each answer, its player and photo set included). Flat: a slope clearly under
  // the smallest that matters (0.1 per log answer), one-sided, after a Benjamini-Hochberg correction over the genera
  // (a lead: two forms to teach apart?). Sorted by how far below the app's 80% target each one stays.
  const LN_BINS = [
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 4],
    [5, 8],
    [9, 16],
    [17, 32],
    [33, 1e9]
  ];
  function gcurveOf(D, M, F, lc) {
    const G = F[1],
      GS = F[3],
      by = new Map(G.L.map((g, j) => [g, {j, R: []}])),
      lp = [];
    D.forEach((a, i) => by.get(a.g).R.push(i));
    const pl = new Map();
    D.forEach(a => !a.gone && (pl.get(a.p) || pl.set(a.p, []).get(a.p)).push(a.n));
    pl.forEach(L => lp.push(Math.log(1 + q(L.slice(-PROF_N), 0.5))));
    const lt = lp.length ? q(lp, 0.5) : lc,
      v11 = M.V ? M.V[1][1] : 0,
      L = G.L.map(g => {
        const {j, R} = by.get(g),
          own = ownLine(M, lc, G.u[j], GS.u[j]),
          se = Math.sqrt(Math.max(0, v11 + GS.cv[j])),
          players = new Set(R.filter(i => !D[i].gone).map(i => D[i].p)).size;
        return {
          k: g,
          n: R.length,
          players,
          sl: [r3(own[1]), r3(own[1] - Z * se), r3(own[1] + Z * se)],
          pf: (z => (z < 0 ? ntail(z) : 1 - ntail(z)))((own[1] - 0.1) / Math.max(se, 1e-9)),
          at: r3(sig(own[0] + own[1] * lt)),
          b: LN_BINS.map(([lo, hi]) => {
            const S = R.filter(i => D[i].n >= lo && D[i].n <= hi);
            return S.length ? [lo, S.length, sum(S.map(i => D[i].y)), r3(sum(S.map(i => D[i].g0 + (1 - D[i].g0) * sig(M.eta[i]))))] : null;
          }).filter(Boolean),
          line: [r3(own[0]), r3(own[1])]
        };
      });
    // one-sided p of "its slope is at least 0.1" (pf: small when the slope lies clearly below), corrected over the genera
    const pa = bh(L.map(x => x.pf));
    L.forEach((x, i) => {
      x.flat = pa[i] <= FDR ? 1 : 0;
      delete x.pf;
    });
    return {lt: r3(lt), lc: r3(lc), m: MASTER, g: L.sort((a, b) => a.at - b.at || (a.k < b.k ? -1 : 1))};
  }
  function learning(A, B, seed) {
    const D = A;
    if (D.length < 200) return thin(D.length, 200);
    const {M, F, X, lc} = lnFit(D),
      n = D.length,
      bi = boot(
        D,
        S => {
          const r = lnFit(S),
            o = {sd_pslope: Math.sqrt(r.F[2].tau2), sd_gslope: Math.sqrt(r.F[3].tau2)};
          LN_X.forEach(([k], j) => (o[k] = r.M.b[j + 1]));
          o.n_all = toMaster(r.M.b[0], r.M.b[1], 0);
          r.F[1].L.forEach((g, j) => (o['n:' + g] = toMaster(...ownLine(r.M, r.lc, 0, r.F[3].u[j]), r.F[1].u[j])));
          return o;
        },
        B,
        seed
      );
    const effects = LN_X.map(([k, l], j) =>
      eff(k, l, M.b[j + 1], M.se[j + 1], bi, 'logit', k === 'slope' ? 0.1 : 0.25, n, {rows: M.nz[j + 1]})
    );
    // how much the learning slope differs between genera and between players (random slopes; spreads are never primary)
    effects.push(sdEff('sd_gslope', 'SD genus learning slope', F[3].tau2, F[3].n, bi, 'logit', 0.1, n, mean([...F[3].cv])));
    effects.push(sdEff('sd_pslope', 'SD player learning slope', F[2].tau2, F[2].n, bi, 'logit', 0.1, n, mean([...F[2].cv])));
    // Not in the answer log: the first-meeting card and the side-by-side comparison leave no row (ROADMAP).
    effects.push({k: 'card', label: 'First-meeting card', v: 'nolog', n});
    effects.push({k: 'side', label: 'Side-by-side comparison', v: 'nolog', n});
    const G = F[1],
      cnt = {};
    D.forEach(a => {
      const c = (cnt[a.g] = cnt[a.g] || {n: 0, p: new Set(), y: 0});
      c.n++;
      if (!a.gone) c.p.add(a.p); // a deleted account's answers count, never as a player (Codex review #600)
      c.y += a.y;
    });
    const V2 = [
      [M.V[0][0], M.V[0][1]],
      [M.V[1][0], M.V[1][1]]
    ];
    const GS = F[3],
      genus = G.L.map((g, j) => {
        const own = ownLine(M, lc, 0, GS.u[j]),
          est = toMaster(own[0], own[1], G.u[j]);
        let [lo, hi] = masterCI(own[0], own[1], V2, G.u[j], G.cv[j], j + 1, [GS.cv[j], lc]);
        if (bi && bi['n:' + g]) ((lo = Math.min(lo, bi['n:' + g][0])), (hi = Math.max(hi, bi['n:' + g][1])));
        return {k: g, n: cnt[g].n, players: cnt[g].p.size, right: cnt[g].y / cnt[g].n, u: G.u[j], est, lo, hi};
      }).sort((a, b) => a.est - b.est);
    const BINS = [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 4],
      [5, 8],
      [9, 16],
      [17, 32],
      [33, 1e9]
    ];
    const curve = BINS.map(([lo, hi]) => {
      const S = D.map((a, i) => [a, i]).filter(([a]) => a.n >= lo && a.n <= hi);
      const mid = hi > 1e8 ? lo * 1.5 : (lo + hi) / 2;
      return {
        lo,
        hi,
        n: S.length,
        right: mean(S.map(([a]) => a.y)),
        fit: mean(S.map(([a, i]) => a.g0 + (1 - a.g0) * sig(M.eta[i]))),
        core: sig(M.b[0] + M.b[1] * Math.log(1 + mid))
      };
    }).filter(b => b.n);
    const all = toMaster(M.b[0], M.b[1], 0);
    effects.unshift(
      Object.assign(
        {k: 'n_all', label: 'Answers to reach 80% on an average genus', est: all, unit: 'n', n},
        (() => {
          // the model's own interval (joint intercept and slope), widened by the bootstrap's when there is one
          let [lo, hi] = masterCI(M.b[0], M.b[1], V2);
          if (bi && bi.n_all) ((lo = Math.min(lo, bi.n_all[0])), (hi = Math.max(hi, bi.n_all[1])));
          return {lo, hi, v: hi < 999 ? 'clear' : 'thin', need: hi < 999 ? null : nice(n * 2)};
        })()
      )
    );
    return {
      n,
      players: players(D),
      typ: typOf(D),
      effects,
      genus,
      curve,
      b0: M.b[0],
      b1: M.b[1],
      ent: entOf(M.V, X, [null, ...LN_X.map(x => x[0])]),
      wright: wrightOf(D, M, F, lc),
      res: resOf(D, M, F, seed),
      gcurve: gcurveOf(D, M, F, lc),
      ix: ixOf([lnIx(D, B, seed + 31)])
    };
  }

  /* ---------- 7. Comeback: the forgetting curve on real returns ---------- */
  const DAY = 864e5;
  const BANDS = [
    [0, GAP, '< 30 min'],
    [GAP, 6 * 36e5, '30 min – 6 h'],
    [6 * 36e5, DAY, '6 – 24 h'],
    [DAY, 3 * DAY, '1 – 3 days'],
    [3 * DAY, 10 * DAY, '3 – 10 days'],
    [10 * DAY, Infinity, '10+ days']
  ];
  function backFit(D) {
    const X = D.map(a => [1, Math.log(1 + (a.t - a.prev.t) / DAY)]),
      F = [
        factor(
          'player',
          D.map(a => a.p)
        )
      ];
    return glmm(
      D.map(a => a.y),
      X,
      F,
      {off: Float64Array.from(D.map(a => a.prev.x)), g: Float64Array.from(D.map(a => a.g0))}
    );
  }
  function comeback(A, B, seed) {
    // Answers whose previous answer on the same genus (same player) was right and had an expectation.
    const D = A.filter(a => a.prev && a.prev.y && a.prev.x != null),
      far = D.filter(a => a.t - a.prev.t >= GAP);
    if (D.length < 100 || far.length < 20) return thin(far.length, 20, {all: D.length});
    const M = backFit(D),
      n = D.length,
      C = A.filter(a => a.back && a.E != null),
      bi = boot(D, S => ({slope: backFit(S).b[1]}), B, seed),
      // the calibration over every comeback question, its own bootstrap (Codex review #441: the slope's sample keeps
      // only answers after a right one, the estimate takes them all)
      bc = boot(C, S => ({calib: mean(S.map(a => a.y - a.E))}), B, seed + 1);
    const effects = [eff('slope', 'Forgetting slope (logit per log(1 + days))', M.b[1], M.se[1], bi, 'logit', 0.1, n)];
    if (C.length >= 10) {
      const oe = C.map(a => a.y - a.E);
      effects.push(
        eff(
          'calib',
          'Comeback questions: right − app’s expected',
          mean(oe),
          Math.sqrt(mean(oe.map(v => (v - mean(oe)) ** 2)) / C.length),
          bc,
          'p',
          0.05,
          C.length
        )
      );
    } else
      effects.push({
        k: 'calib',
        label: 'Comeback questions: right − app’s expected',
        v: C.length ? 'thin' : 'none',
        n: C.length,
        need: null
      });
    const bands = BANDS.map(([lo, hi, label]) => {
      const S = D.filter(a => a.t - a.prev.t >= lo && a.t - a.prev.t < hi);
      return {
        label,
        n: S.length,
        right: mean(S.map(a => a.y)),
        E: mean(S.filter(a => a.E != null).map(a => a.E)),
        prevE: mean(S.map(a => a.prev.E))
      };
    });
    return {n, far: far.length, back: C.length, players: players(D), typ: typOf(D), effects, bands, b0: M.b[0], b1: M.b[1]};
  }

  /* ---------- 8. Sessions: how long they last and what ends them (discrete-time survival) ---------- */
  const SS_X = [
    ['wrong', 'Last answer wrong'],
    ['streak', '2+ misses in a row'],
    ['diff', 'Harder question (expected, logit)'],
    ['slow', 'Slow answer (vs the player’s usual)'],
    ['pos', 'Later in the session (log position)']
  ];
  function sessRows(A) {
    // a loop, not Math.max(...): a spread of the whole log overflows the stack past about 150,000 answers (Codex review #441)
    const end = A.reduce((m, a) => (a.t > m ? a.t : m), -Infinity),
      S = new Map();
    A.forEach(a => (S.get(a.sess) || S.set(a.sess, []).get(a.sess)).push(a));
    const med = {};
    A.filter(a => a.s).forEach(a => (med[a.p] = med[a.p] || []).push(Math.log(a.s)));
    Object.keys(med).forEach(p => (med[p] = q(med[p], 0.5)));
    const rows = [],
      lens = [];
    S.forEach(L => {
      const open = end - L[L.length - 1].t < GAP;
      lens.push({n: L.length, open});
      L.forEach((a, i) => {
        if (open && i === L.length - 1) return;
        rows.push({
          p: a.p,
          gone: a.gone, // a deleted account's answers: no player in the count (Codex review #600)
          y: i === L.length - 1 ? 1 : 0,
          X: [
            1,
            a.y ? 0 : 1,
            a.streak >= 2 ? 1 : 0,
            a.x == null ? 0 : -a.x,
            a.s && med[a.p] != null ? Math.log(a.s) - med[a.p] : 0,
            Math.log(a.pos)
          ]
        });
      });
    });
    const dm = mean(rows.map(r => r.X[3])),
      pm = mean(rows.map(r => r.X[5]));
    rows.forEach(r => ((r.X[3] -= dm), (r.X[5] -= pm)));
    return {rows, lens};
  }
  function ssFit(R) {
    return glmm(
      R.map(r => r.y),
      R.map(r => r.X),
      [
        factor(
          'player',
          R.map(r => r.p)
        )
      ]
    );
  }
  // Kaplan-Meier: share of sessions still going after n answers; a session still open (last answer under 30 min before
  // the log's end) is censored.
  function km(lens) {
    const max = lens.reduce((m, l) => Math.max(m, l.n), 0),
      out = [{n: 0, s: 1}];
    let s = 1;
    for (let n = 1; n <= max; n++) {
      const risk = lens.filter(l => l.n >= n).length,
        ev = lens.filter(l => l.n === n && !l.open).length;
      if (risk && ev) {
        s *= 1 - ev / risk;
        out.push({n, s, risk});
      }
    }
    return out;
  }
  // Sessions in figures (Pierre, 2026-11-04: "what can we learn from each play session, and from sessions in general?"):
  // every session in a table, when sessions start (Manila time), the result along a session and at its end, how
  // sessions end, the start of a session against the end of the one before by the length of the break, and the players
  // who come back. Counts and means only (no model); the ranges along a session by a bootstrap over sessions.
  const SS_GAPS = [
    [0, 3, 'Under 3 h'],
    [3, 12, '3 – 12 h'],
    [12, 36, '12 – 36 h'],
    [36, Infinity, 'Over 36 h']
  ];
  const SS_POS = [
    [1, 10],
    [11, 25],
    [26, 50],
    [51, 100],
    [101, Infinity]
  ];
  const SS_END = [
    [1, 3, 'Last 3 answers'],
    [4, 10, '4th to 10th from the end'],
    [11, 20, '11th to 20th from the end']
  ];
  const ssMode = a => (a.typed ? 'typed' : /^quiz-duel/.test(a.m) ? 'duel' : /^quiz\|s(\||$)/.test(a.m) ? 'custom' : 'quiz');
  function sessDesc(A, B = 40, seed = 1) {
    if (!A.length) return null;
    const end = A.reduce((m, a) => (a.t > m ? a.t : m), -Infinity),
      S = new Map();
    A.forEach(a => (S.get(a.sess) || S.set(a.sess, []).get(a.sess)).push(a));
    const oe = L => {
      const E = L.filter(a => a.E != null);
      return E.length ? mean(E.map(a => a.y - a.E)) : null;
    };
    const L = [...S.values()].map(R => {
      const md = {quiz: 0, duel: 0, typed: 0, custom: 0};
      R.forEach(a => (md[ssMode(a)] += 1));
      const last = R[R.length - 1];
      return {
        p: R[0].p,
        gone: R[0].gone,
        t0: R[0].t,
        t1: last.t,
        R,
        n: R.length,
        md,
        right: mean(R.map(a => a.y)),
        oe: oe(R),
        newg: R.filter(a => a.n === 0).length,
        back: R.filter(a => a.back).length,
        tail: R.slice(-3)
          .map(a => a.y)
          .join(''),
        miss: last.y ? 0 : 1,
        // two misses in a row within this session (prep's streak runs across sessions; Codex review #500)
        miss2: R.length >= 2 && !last.y && !R[R.length - 2].y ? 1 : 0,
        lastNew: last.n === 0 ? 1 : 0,
        open: end - last.t < GAP ? 1 : 0
      };
    });
    // each player's sessions in time order: their number and the hours since the one before
    const byP = new Map();
    L.forEach(s => (byP.get(s.p) || byP.set(s.p, []).get(s.p)).push(s));
    byP.forEach(Q => {
      Q.sort((a, b) => a.t0 - b.t0);
      Q.forEach((s, i) => ((s.k = i + 1), (s.gap = i ? (s.t0 - Q[i - 1].t1) / 36e5 : null)));
    });
    const r2 = v => (v == null ? null : Math.round(v * 1000) / 1000);
    const table = L.filter(s => !s.gone)
      .sort((a, b) => b.t0 - a.t0)
      .slice(0, 300)
      .map(s => ({
        p: s.p,
        k: s.k,
        t0: s.t0,
        min: Math.round((s.t1 - s.t0) / 6e3) / 10,
        n: s.n,
        md: s.md,
        right: r2(s.right),
        oe: r2(s.oe),
        newg: s.newg,
        back: s.back,
        tail: s.tail,
        gap: s.gap == null ? null : Math.round(s.gap * 10) / 10,
        open: s.open
      }));
    // when sessions start, Manila time (UTC+8, no daylight saving)
    const hours = Array(24).fill(0);
    L.forEach(s => (hours[Math.floor(((s.t0 / 36e5 + 8) % 24) + 24) % 24] += 1));
    // right − expected along a session (sessions of 20+ answers, by fifth) and at its end (closed sessions of 30+),
    // with a bootstrap over sessions: each session gives its sums per bin
    const R0 = rng(seed);
    function binned(sessions, binOf, nb) {
      const per = sessions.map(s => {
        const b = Array.from({length: nb}, () => ({n: 0, y: 0, e: 0, ne: 0}));
        s.R.forEach((a, i) => {
          const j = binOf(a, i, s);
          if (j == null) return;
          const o = b[j];
          o.n += 1;
          o.y += a.y;
          if (a.E != null) ((o.ne += 1), (o.e += a.y - a.E), (o.E = (o.E || 0) + a.E));
        });
        return b;
      });
      const agg = P => {
        const t = Array.from({length: nb}, () => ({n: 0, y: 0, e: 0, ne: 0, E: 0}));
        P.forEach(b => b.forEach((o, j) => ((t[j].n += o.n), (t[j].y += o.y), (t[j].e += o.e), (t[j].ne += o.ne), (t[j].E += o.E || 0))));
        return t;
      };
      const all = agg(per),
        draws = [];
      for (let k = 0; k < (per.length >= 5 ? B : 0); k++) draws.push(agg(per.map(() => per[Math.floor(R0() * per.length)])));
      return all.map((o, j) => {
        const v = draws.map(d => (d[j].ne ? d[j].e / d[j].ne : null)).filter(x => x != null);
        return {
          n: o.n,
          right: o.n ? r2(o.y / o.n) : null,
          E: o.ne ? r2(o.E / o.ne) : null,
          oe: o.ne ? r2(o.e / o.ne) : null,
          lo: v.length >= 10 ? r2(q(v, 0.025)) : null,
          hi: v.length >= 10 ? r2(q(v, 0.975)) : null
        };
      });
    }
    const long = L.filter(s => s.n >= 20),
      fifths = binned(long, (a, i, s) => Math.min(4, Math.floor((i / s.n) * 5)), 5),
      closed30 = L.filter(s => s.n >= 30 && !s.open),
      fromEnd = binned(
        closed30,
        (a, i, s) => {
          const e = s.n - i;
          const j = SS_END.findIndex(([lo, hi]) => e >= lo && e <= hi);
          return j < 0 ? null : j;
        },
        SS_END.length
      );
    // median seconds by position, photo quiz answers only (duels and typed answers are much faster or slower)
    const secs = SS_POS.map(([lo, hi]) => {
      const V = A.filter(a => a.s && a.pos >= lo && a.pos <= hi && ssMode(a) === 'quiz').map(a => a.s);
      return {lo, hi, n: V.length, s: V.length ? r2(q(V, 0.5)) : null};
    });
    // how sessions end (closed sessions only: one still going has not ended)
    const C = L.filter(s => !s.open),
      CA = C.flatMap(s => s.R);
    const ends = {
      sessions: C.length,
      miss: sum(C.map(s => s.miss)),
      miss2: sum(C.map(s => s.miss2)),
      missRate: CA.length ? r2(1 - mean(CA.map(a => a.y))) : null,
      lastNew: sum(C.map(s => s.lastNew)),
      newRate: CA.length ? r2(mean(CA.map(a => (a.n === 0 ? 1 : 0)))) : null,
      lastMode: C.reduce((o, s) => ((o[ssMode(s.R[s.R.length - 1])] = (o[ssMode(s.R[s.R.length - 1])] || 0) + 1), o), {})
    };
    // the last 10 answers of a session against the first 10 of the player's next one, by the length of the break
    const pairs = [];
    byP.forEach(Q =>
      Q.forEach((s, i) => {
        const nx = Q[i + 1];
        if (!nx || s.n < 5 || nx.n < 5) return;
        const a = s.R.slice(-10),
          b = nx.R.slice(0, 10),
          E = X => X.filter(x => x.E != null);
        pairs.push({
          h: nx.gap,
          before: mean(a.map(x => x.y)),
          after: mean(b.map(x => x.y)),
          Eb: E(a).length ? mean(E(a).map(x => x.E)) : null,
          Ea: E(b).length ? mean(E(b).map(x => x.E)) : null
        });
      })
    );
    const avg = L2 => (L2.filter(v => v != null).length ? r2(mean(L2.filter(v => v != null))) : null);
    const gaps = SS_GAPS.map(([lo, hi, label]) => {
      const P = pairs.filter(x => x.h >= lo && x.h < hi);
      return {
        label,
        n: P.length,
        before: avg(P.map(x => x.before)),
        after: avg(P.map(x => x.after)),
        Eb: avg(P.map(x => x.Eb)),
        Ea: avg(P.map(x => x.Ea)),
        up: P.filter(x => x.after > x.before).length
      };
    });
    // players coming back: after their 1st, 2nd, 3rd session; a player whose last session was that one and ended less
    // than a day before the log ends may still come back: not counted
    const returns = [1, 2, 3].map(k => {
      let at = 0,
        back = 0;
      // one observation window for both outcomes (Codex review #500): a kth session that ended less than a day before
      // the log ends counts neither as a return nor as a player who did not come back
      byP.forEach(Q => {
        if (Q[0].gone || Q.length < k || end - Q[k - 1].t1 < DAY) return; // no deleted account in the cohort (Codex #603)
        at += 1;
        if (Q.length > k) back += 1;
      });
      return {k, at, back};
    });
    // first sessions against later ones
    const grp = Q => ({
      sessions: Q.length,
      answers: Q.length
        ? q(
            Q.map(s => s.n),
            0.5
          )
        : null,
      min: Q.length
        ? r2(
            q(
              Q.map(s => (s.t1 - s.t0) / 6e4),
              0.5
            )
          )
        : null,
      right: Q.length ? r2(sum(Q.map(s => s.right * s.n)) / sum(Q.map(s => s.n))) : null,
      oe: Q.length ? r2(oe(Q.flatMap(s => s.R))) : null,
      newg: Q.length
        ? q(
            Q.map(s => s.newg),
            0.5
          )
        : null
    });
    const first = [grp(L.filter(s => s.k === 1)), grp(L.filter(s => s.k === 2)), grp(L.filter(s => s.k >= 3))];
    return {
      sessions: L.length,
      players: [...byP.values()].filter(Q => !Q[0].gone).length,
      table,
      hours,
      fifths,
      fromEnd,
      secs,
      ends,
      gaps,
      returns,
      first,
      len: {
        answers: q(
          L.map(s => s.n),
          0.5
        ),
        min: r2(
          q(
            L.map(s => (s.t1 - s.t0) / 6e4),
            0.5
          )
        )
      }
    };
  }
  function sessions(A, B, seed) {
    const desc = sessDesc(A, B, seed + 3);
    if (A.length < 100) return thin(A.length, 100, {desc});
    const {rows, lens} = sessRows(A),
      ends = sum(rows.map(r => r.y));
    if (ends < 10) return thin(rows.length, 100, {sessions: lens.length, desc});
    const M = ssFit(rows),
      n = rows.length,
      bi = boot(
        rows.map(r => ({...r})),
        S => {
          const m = ssFit(S),
            o = {};
          SS_X.forEach(([k], j) => (o[k] = m.b[j + 1]));
          return o;
        },
        B,
        seed
      );
    const curve = km(lens),
      at = k => (curve.filter(c => c.n <= k).pop() || {s: 1}).s,
      med = (curve.find(c => c.s <= 0.5) || {}).n || null;
    return {
      n,
      players: players(rows),
      sessions: lens.length,
      typ: {p: ends / rows.length},
      open: lens.filter(l => l.open).length,
      median: med,
      effects: SS_X.map(([k, l], j) => eff(k, l, M.b[j + 1], M.se[j + 1], bi, 'logit', 0.25, n, {rows: M.nz[j + 1]})),
      km: curve,
      at: [5, 10, 20, 40, 80].map(k => ({k, s: at(k)})),
      desc,
      ent: entOf(
        M.V,
        rows.map(r => r.X),
        [null, ...SS_X.map(x => x[0])]
      )
    };
  }

  /* ---------- 9. Player profiles (Pierre, 2026-11-05: Q70-Q73; the multifactor visualisation study §3) ---------- */
  // A descriptive map of how each player plays, not a typology: no named types until about 30 players (Q70; Dalmaijer et
  // al. 2022: clusters need 20-30 people per group). Each player's current profile is computed on their last PROF_N
  // answers (the whole history when fewer, Q71), the count shown, rows under PROF_MIN answers greyed and left out of the
  // tree, the map and the groups. The behaviours (Q72, the study's 8; the learning slope waits for a random practice
  // slope in Learning, ROADMAP), each net of what the app decided: the app picks the genus, the photo, the format and
  // the difficulty from the level, so a raw share mostly measures the level.
  const PROF_N = 300,
    PROF_MIN = 100,
    PROF_LOW = 20, // fewer answers than this: not on the page at all
    PROF_K = 10, // pseudo-answers at the pooled rate for the stops after misses (a few misses in a row say little)
    PROF_STAB = 0.75; // Hennig 2007: a group found again with a mean Jaccard of 0.75 or more is stable
  const PROF_F = [
    ['pace', 'Answer time'], // the player's own effect in the Answer time model (log time, net of right or wrong, format, difficulty, genus, photo)
    ['zoom', 'Enlarging'], // share of photos enlarged, minus what the views shown predict from everyone's rates (points)
    ['acc', 'Right beyond the app’s expectation'], // right − the app's expected chance (points), the app's choices already in it
    ['stop', 'Stopping after misses'], // extra chance to end the session after 2+ misses in a row, against after other answers (points)
    ['len', 'Session length'], // median answers per session (log for the map)
    ['wk', 'Sessions per week'], // sessions per week over the window (at least a week; log for the map)
    ['eve', 'Evening play'], // share of answers from 17:00 to midnight, Manila time
    ['slope', 'Learning slope'] // the player's own slope in the Learning model (lnFit, random slopes) on all their answers
  ];
  // The behaviours of every player in D (any set of answers, prep's shape, in time order): {id: [value or null per
  // PROF_F]}. Kept apart from the window so a later analysis can run it on successive windows of a player's history
  // (Pierre, 2026-11-05: whole-history trajectories are a later level).
  function profFeat(D, slopes) {
    const by = new Map();
    D.forEach(a => (by.get(a.p) || by.set(a.p, []).get(a.p)).push(a));
    const out = {},
      ids = [...by.keys()];
    ids.forEach(id => (out[id] = PROF_F.map(() => null)));
    const fi = k => PROF_F.findIndex(f => f[0] === k);
    // pace: the Answer time model on these answers, its player effects (a fast fit: no covariance needed)
    const Dt = D.filter(a => a.s && a.x != null);
    if (Dt.length >= 100 && players(Dt) >= 2) {
      FAST = true;
      try {
        const {F} = rtFit(Dt);
        F[0].L.forEach((id, j) => (out[id][fi('pace')] = F[0].u[j]));
      } catch (e) {
        void e;
      } finally {
        FAST = false;
      }
    }
    // the learning slope, given (slopes: {id: slope}, profiles: from all the player's answers)
    if (slopes) ids.forEach(id => slopes[id] != null && (out[id][fi('slope')] = slopes[id]));
    // enlarging, net of the views: everyone's rate for the view shown is what the app's choice of photo predicts
    const vr = {};
    D.filter(a => a.z != null).forEach(a => {
      const o = (vr[a.qv || '?'] = vr[a.qv || '?'] || [0, 0]);
      o[0] += a.z;
      o[1]++;
    });
    const end = D.reduce((m, a) => (a.t > m ? a.t : m), -Infinity);
    // stops after 2+ misses in a row, pooled first (the last answer of a session ends it; a session still open is not over).
    // The misses are counted within the session (Codex review #604: prep's streak runs across a break, so a session's
    // first miss after a miss that ended the one before read as two in a row).
    const stopRows = id => {
      const L = by.get(id),
        R = [];
      let run = 0;
      L.forEach((a, i) => {
        run = a.y ? 0 : i && L[i - 1].sess === a.sess ? run + 1 : 1;
        const last = i === L.length - 1 || L[i + 1].sess !== a.sess;
        if (last && end - a.t < GAP) return;
        R.push([run >= 2 ? 1 : 0, last ? 1 : 0]);
      });
      return R;
    };
    const SR = Object.fromEntries(ids.map(id => [id, stopRows(id)])),
      pool = f => {
        const L = ids.flatMap(id => SR[id]).filter(r => r[0] === f);
        return L.length ? sum(L.map(r => r[1])) / L.length : 0;
      },
      p2 = pool(1),
      p0 = pool(0);
    ids.forEach(id => {
      const L = by.get(id),
        o = out[id],
        Z = L.filter(a => a.z != null),
        E = L.filter(a => a.E != null);
      if (Z.length >= 20) o[fi('zoom')] = mean(Z.map(a => a.z - vr[a.qv || '?'][0] / vr[a.qv || '?'][1]));
      if (E.length >= 20) o[fi('acc')] = mean(E.map(a => a.y - a.E));
      const S = SR[id],
        n2 = S.filter(r => r[0]).length,
        s2 = S.filter(r => r[0] && r[1]).length,
        n0 = S.length - n2,
        s0 = S.filter(r => !r[0] && r[1]).length;
      if (S.length >= 20) o[fi('stop')] = (s2 + PROF_K * p2) / (n2 + PROF_K) - (s0 + PROF_K * p0) / (n0 + PROF_K);
      const lens = new Map();
      L.forEach(a => lens.set(a.sess, (lens.get(a.sess) || 0) + 1));
      // a session cut by the window's start (its first answer here is not its first, pos > 1) is not a session's length
      // (Codex review #604): left out of the median, unless it is the only one (then it lasted at least that long)
      const cut = L[0].pos > 1 && lens.size > 1 ? L[0].sess : null;
      o[fi('len')] = q(
        [...lens.entries()].filter(([k]) => k !== cut).map(([, v]) => v),
        0.5
      );
      o[fi('wk')] = (lens.size * 7) / Math.max(7, (L[L.length - 1].t - L[0].t) / DAY);
      o[fi('eve')] = mean(L.map(a => ((new Date(a.t).getUTCHours() + 8) % 24 >= 17 ? 1 : 0)));
    });
    return out;
  }
  // The scale each behaviour is mapped on (counts and rates on a log scale), then z-scores over the rows given.
  const profScale = (k, v) => (v == null ? null : k === 'len' || k === 'wk' ? Math.log(Math.max(v, 0.1)) : v);
  function zOf(V, rows) {
    const p = PROF_F.length,
      mu = [],
      sd = [];
    for (let f = 0; f < p; f++) {
      const L = rows.map(r => V[r][f]).filter(v => v != null);
      mu[f] = mean(L);
      sd[f] = Math.sqrt(mean(L.map(v => (v - mu[f]) ** 2)));
      // players who all share one value have no spread: what is left is the rounding of the mean (Codex review #604:
      // seven identical log(40) read ±1 SD each), so a spread under a billionth of the values' size counts as none
      if (sd[f] <= 1e-9 * Math.max(1, Math.abs(mu[f]))) sd[f] = 0;
    }
    return id => V[id].map((v, f) => (v == null || !sd[f] ? 0 : (v - mu[f]) / sd[f]));
  }
  // Eigen decomposition of a symmetric matrix (Jacobi rotations): values in decreasing order, vectors as columns.
  function eigSym(S) {
    const n = S.length,
      a = S.map(r => r.slice()),
      v = S.map((_, i) => S.map((__, j) => (i === j ? 1 : 0)));
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
      if (off < 1e-22) break;
      for (let p = 0; p < n; p++)
        for (let r = p + 1; r < n; r++) {
          if (Math.abs(a[p][r]) < 1e-300) continue;
          const phi = 0.5 * Math.atan2(2 * a[p][r], a[r][r] - a[p][p]),
            c = Math.cos(phi),
            s = Math.sin(phi);
          for (let k = 0; k < n; k++) {
            const x = a[k][p],
              y = a[k][r];
            a[k][p] = c * x - s * y;
            a[k][r] = s * x + c * y;
          }
          for (let k = 0; k < n; k++) {
            const x = a[p][k],
              y = a[r][k];
            a[p][k] = c * x - s * y;
            a[r][k] = s * x + c * y;
          }
          for (let k = 0; k < n; k++) {
            const x = v[k][p],
              y = v[k][r];
            v[k][p] = c * x - s * y;
            v[k][r] = s * x + c * y;
          }
        }
    }
    const I = a.map((_, i) => i).sort((i, j) => a[j][j] - a[i][i]);
    return {val: I.map(i => a[i][i]), vec: v.map(r => I.map(i => r[i]))};
  }
  // k groups from a tree of n leaves: its first n - k merges applied.
  function cutK(T, n, k) {
    const up = [...Array(n + T.m.length).keys()],
      top = x => (up[x] === x ? x : (up[x] = top(up[x])));
    T.m.slice(0, Math.max(0, n - k)).forEach(([a, b], j) => ((up[top(a)] = n + j), (up[top(b)] = n + j)));
    const G = new Map();
    T.order.forEach(i => (G.get(top(i)) || G.set(top(i), []).get(top(i))).push(i));
    return [...G.values()];
  }
  // Average silhouette width of a grouping (Rousseeuw 1987) on a distance matrix.
  function silhouette(Dm, G) {
    const lab = [];
    G.forEach((L, g) => L.forEach(i => (lab[i] = g)));
    const s = Dm.map((r, i) => {
      const own = G[lab[i]].filter(j => j !== i);
      if (!own.length) return 0;
      const a = mean(own.map(j => r[j])),
        b = Math.min(...G.filter((_, g) => g !== lab[i]).map(L => mean(L.map(j => r[j]))));
      return (b - a) / Math.max(a, b, 1e-12);
    });
    return mean(s);
  }
  const jac = (A, B) => {
    const S = new Set(B);
    return A.filter(x => S.has(x)).length / new Set([...A, ...B]).size;
  };
  // Ward's tree on z-scores of the ids given (the groups' structure for the stability runs).
  const wardOf = (ids, zf) => {
    const Z = ids.map(zf),
      D2 = Z.map(a => Z.map(b => sum(a.map((v, f) => (v - b[f]) ** 2))));
    return {T: hclust(D2, 'ward'), D: D2.map(r => r.map(Math.sqrt))};
  };
  // The groups of a set of players (a list, a player drawn twice counted twice in the z-scores and the tree): Ward's tree
  // cut into k groups (fewer when there are fewer distinct players), each group as its distinct players.
  function profRun(V, ids, k) {
    const kk = Math.min(k, new Set(ids).size - 1);
    if (kk < 2) return null;
    const zz = zOf(V, ids),
      {T: t} = wardOf(ids, zz);
    return cutK(t, ids.length, kk)
      .map(L => [...new Set(L.map(i => ids[i]))])
      .filter(L => L.length);
  }
  // Each player's own learning slope: the Learning model with random slopes (lnFit) on all the answers, the common slope
  // + the player's own. A slope needs the whole range of practice: on the last PROF_N answers alone most answers come
  // late, on genera already practised, and the slopes it gave did not follow the planted ones (2026-11-09).
  function slopeOf(A) {
    if (A.length < 200 || players(A) < 3) return null;
    FAST = true;
    try {
      const {M, F} = lnFit(A),
        o = {};
      if (isFinite(M.b[1])) F[2].L.forEach((id, j) => (o[id] = M.b[1] + F[2].u[j]));
      return o;
    } catch (e) {
      return null;
    } finally {
      FAST = false;
    }
  }
  function profiles(A, B, seed) {
    // a deleted account's answers (gone, sheet v55) make no profile (Pierre, 2026-11-05, Q86)
    const by = new Map();
    A.forEach(a => !a.gone && (by.get(a.p) || by.set(a.p, []).get(a.p)).push(a));
    const win = [...by.entries()].filter(([, L]) => L.length >= PROF_LOW).map(([id, L]) => [id, L.slice(-PROF_N)]),
      D = win.flatMap(([, L]) => L).sort((a, b) => a.t - b.t),
      V0 = profFeat(D, slopeOf(A)),
      V = Object.fromEntries(Object.entries(V0).map(([id, L]) => [id, L.map((v, f) => profScale(PROF_F[f][0], v))])),
      cnt = Object.fromEntries(win.map(([id, L]) => [id, L.length])),
      main = win.filter(([id]) => cnt[id] >= PROF_MIN).map(([id]) => id),
      low = win
        .filter(([id]) => cnt[id] < PROF_MIN)
        .map(([id]) => id)
        .sort((a, b) => cnt[b] - cnt[a]),
      feats = PROF_F.map(([k, label]) => ({k, label})),
      row = (id, zf) => ({k: id, n: cnt[id], low: cnt[id] < PROF_MIN ? 1 : 0, v: V0[id].map(r3), z: zf(id).map(r3)});
    if (main.length < 3) {
      const zf = zOf(
        V,
        win.map(([id]) => id)
      );
      return {
        thin: true,
        n: main.length,
        min: 3,
        of: 'players',
        effects: [],
        feats,
        win: PROF_N,
        at: PROF_MIN,
        who: win.map(([id]) => row(id, zf))
      };
    }
    const zf = zOf(V, main),
      n = main.length,
      p = PROF_F.length,
      Z = main.map(zf),
      {T, D: Dm} = wardOf(main, zf),
      pos = new Map(T.order.map((i, k) => [i, k]));
    // the behaviours ordered by how they go together across players (average linkage on 1 - r)
    const C = PROF_F.map((_, f) => PROF_F.map((__, g) => sum(Z.map(z => z[f] * z[g])) / n)),
      Cr = C.map((r, f) => r.map((v, g) => v / Math.sqrt(Math.max(1e-12, C[f][f] * C[g][g])))),
      CT = hclust(Cr.map((r, f) => r.map((v, g) => (f === g ? 0 : 1 - (C[f][f] && C[g][g] ? v : 0))))),
      // PCA of the behaviours (their correlations over players): players as points, behaviours as arrows (a biplot;
      // the arrows are the loadings, the correlation of each behaviour with each axis). Each axis's sign is set so its
      // largest loading is positive (the map would otherwise flip from one milestone to the next).
      E = eigSym(Cr.map(r => r.map(v => (isFinite(v) ? v : 0)))),
      tot = sum(E.val.map(v => Math.max(0, v))) || 1,
      ax = [0, 1].map(k => {
        const vec = E.vec.map(r => r[k]),
          big = vec.reduce((m, x) => (Math.abs(x) > Math.abs(m) ? x : m), 0),
          sg = big < 0 ? -1 : 1;
        return {vec: vec.map(x => x * sg), val: Math.max(0, E.val[k])};
      });
    // groups: the Ward tree cut where the silhouette is best (2 to 5 groups, never named), and how they hold when one
    // player is left out (each run) or the players are drawn again (bootstrap): each group's best Jaccard in the run
    let k = 2,
      sil = -1;
    for (let g = 2; g <= Math.min(5, n - 1); g++) {
      const s = silhouette(Dm, cutK(T, n, g));
      if (s > sil + 1e-9) ((sil = s), (k = g));
    }
    const G = cutK(T, n, k).map(L => L.map(i => main[i])),
      run = ids => profRun(V, ids, k),
      best = (H, L) => (L.length ? Math.max(...H.map(h => jac(L, h))) : null),
      loo = G.map(() => []),
      bt = G.map(() => []);
    let kept = 0,
      done = 0; // the leave-one-out runs that could be compared (Codex review #604: with 3 players none can)
    main.forEach(id => {
      const H = run(main.filter(x => x !== id));
      if (!H) return;
      done++;
      const J = G.map(L =>
        best(
          H,
          L.filter(x => x !== id)
        )
      );
      J.forEach((j, g) => j != null && loo[g].push(j));
      if (J.every(j => j == null || j >= PROF_STAB)) kept++;
    });
    const R = rng(seed || 1),
      NB = B ? Math.min(200, Math.max(50, B)) : 100;
    for (let b = 0; b < NB; b++) {
      // the draw keeps its multiplicities for the standardisation and the tree (Codex review #604: a set of the players
      // drawn measured a subsample, not the bootstrap); the groups compare unique players
      const S = main.map(() => main[Math.floor(R() * n)]),
        U = [...new Set(S)];
      const H = run(S);
      if (!H) continue;
      G.forEach((L, g) => {
        const j = best(
          H,
          L.filter(x => U.includes(x))
        );
        if (j != null) bt[g].push(j);
      });
    }
    // in words: the closest pairs and what they share; the player furthest from everyone and their most marked behaviour
    const pairs = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j, Dm[i][j]]);
    pairs.sort((a, b) => a[2] - b[2]);
    const share = (i, j) =>
      PROF_F.map((_, f) => [f, Math.sign(Z[i][f]) === Math.sign(Z[j][f]) ? Math.min(Math.abs(Z[i][f]), Math.abs(Z[j][f])) : 0])
        .filter(x => x[1] >= 0.5)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(x => x[0]);
    const far = Dm.map((r, i) => [i, sum(r) / (n - 1)]).sort((a, b) => b[1] - a[1])[0][0],
      farF = Z[far].map((v, f) => [f, Math.abs(v)]).sort((a, b) => b[1] - a[1])[0][0],
      re = i => pos.get(i);
    return {
      n: D.length,
      players: n,
      win: PROF_N,
      at: PROF_MIN,
      effects: [],
      feats,
      who: [...T.order.map(i => row(main[i], zf)), ...low.map(id => row(id, zf))],
      m: T.m.map(([a, b, h]) => [a < n ? re(a) : a, b < n ? re(b) : b, h]),
      cols: CT.order,
      cm: CT.m.map(([a, b, h]) => [a < p ? CT.order.indexOf(a) : a, b < p ? CT.order.indexOf(b) : b, h]),
      pca: {
        var: ax.map(a => r3(a.val / tot)),
        load: PROF_F.map((_, f) => ax.map(a => r3(a.vec[f] * Math.sqrt(a.val)))),
        // the players projected on the same standardised behaviours the PCA diagonalised (Codex review #604: a behaviour
        // missing for some players has a spread under 1 once those are set to the average, and Cr rescales it)
        pts: T.order.map(i => ax.map(a => r3(sum(Z[i].map((z, f) => (C[f][f] > 1e-12 ? z / Math.sqrt(C[f][f]) : 0) * a.vec[f])))))
      },
      k,
      sil: r3(sil),
      groups: G.map(L => L.map(id => re(main.indexOf(id))).sort((a, b) => a - b)),
      // stable only when every leave-one-out run keeps every group and each group's bootstrap mean reaches PROF_STAB (Codex
      // review #604: the leave-one-out means alone called groups stable that some runs changed); null when no run could
      // be compared (too few players: unavailable evidence is not instability). runs: the runs compared, of n players.
      stab: {
        loo: loo.map(L => (L.length ? r3(mean(L)) : null)),
        boot: bt.map(L => (L.length ? r3(mean(L)) : null)),
        runs: done,
        of: n,
        kept,
        draws: NB,
        at: PROF_STAB,
        stable: !done ? null : kept === done && bt.every(L => !L.length || mean(L) >= PROF_STAB) ? 1 : 0
      },
      close: pairs.slice(0, 3).map(([i, j, d]) => [re(i), re(j), r3(d), share(i, j)]),
      far: [re(far), farF]
    };
  }

  /* ---------- 10. Time and difficulty: what the time to answer and enlarging say about a photo (Pierre, 2026-11-08) ---------- */
  // The reverse of Answer time and Enlarging: "a slow answer, even a right one, or a photo enlarged first, means the
  // question or the photo was harder than if the player answers at once". Two parts (docs/LEARNING.md "Response time as
  // information on difficulty"):
  // 1. Others' answers on the photo: before each answer, the answers OTHER players gave earlier on its photo (the
  //    question's first photo, the colony of a multi-view question): their right answers' speed, z = log seconds minus
  //    that player's own median over their earlier timed answers (from their TD_MIN-th, typed and enlarged answers left
  //    out of the photo's mean: an enlarged answer's seconds hold the time spent enlarged), and their enlarging against
  //    their own habit (enlarged 0/1 minus their share so far). Each the photo's mean shrunk by TD_K answers' worth (a
  //    photo answered once says a quarter of what it seems). right ~ offset (the app's own expectation, its rated photo
  //    difficulty included) + slow + enlarged + (player), with each question's guess rate: does the time others took on a
  //    photo say it is harder than the app already thinks? Prequential: only earlier answers, as an app would have them.
  // 2. Time intensity beside difficulty (van der Linden 2006, the lognormal model with the item's time intensity, split
  //    into genus and photo): log seconds ~ right + typed + enlarged + 2 choices + (player) + (genus) + (photo), then
  //    right ~ the photo's time intensity + typed + 2 choices + (player) + (genus) + (photo): how much harder a slower
  //    photo is (an LLTM-like covariate). The genus's time intensity is shown beside its difficulty, not tested: with a
  //    few dozen genera, a genus-level covariate beside the genus's own effect is not identified (its interval ran to
  //    thousands on a planted log).
  const TD_K = 3, // shrinkage: 3 = residual variance / photo variance of the time (LEARNING.md "Response time: genus and photo")
    TD_MIN = 10, // a player's timed answers before their median counts (core.js RTIME.MIN)
    TD_ZB = 0.1; // the bins of the others' mean z (fast below -0.1, slow above 0.1)
  // The median of a list in order (medS), of any list (medOf). A player's log seconds are kept in order as they come
  // (tdIns, a sorted insert), so each answer's median needs no sort of the whole history (performance pass, 2026-11-09:
  // the same medians); a NaN (a negative time) breaks the order, so its player's list is then sorted as before.
  const medS = S => {
    const n = S.length;
    return n % 2 ? S[(n - 1) / 2] : (S[n / 2 - 1] + S[n / 2]) / 2;
  };
  const medOf = L => medS(L.slice().sort((a, b) => a - b));
  const tdIns = (S, x) => {
    let lo = 0,
      hi = S.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (S[m] <= x) lo = m + 1;
      else hi = m;
    }
    S.splice(lo, 0, x);
  };
  // Each answer's own z (or null) and the others' shrunk means on its photo (slow, enl; null when no other answer).
  function tdFeat(A) {
    const P = new Map(),
      F = new Map(),
      out = [];
    A.forEach(a => {
      let p = P.get(a.p);
      if (!p) P.set(a.p, (p = {L: [], S: [], nan: false, e: 0, n: 0}));
      const timed = a.s != null && !a.typed,
        z = timed && p.L.length >= TD_MIN ? Math.log(a.s) - (p.nan ? medOf(p.L) : medS(p.S)) : null,
        f = a.ph[0],
        h = f ? F.get(f) || (F.set(f, []), F.get(f)) : null,
        o = h ? h.filter(x => x.p !== a.p) : [],
        zr = o.filter(x => x.zr != null),
        en = o.filter(x => x.en != null);
      out.push({
        a,
        z,
        slow: zr.length ? sum(zr.map(x => x.zr)) / (zr.length + TD_K) : null,
        nz: zr.length,
        enl: en.length ? sum(en.map(x => x.en)) / (en.length + TD_K) : null,
        ne: en.length
      });
      if (h) h.push({p: a.p, zr: a.y && z != null && !a.z ? z : null, en: a.z != null && p.n ? a.z - p.e / p.n : null});
      if (timed) {
        const v = Math.log(a.s);
        p.L.push(v);
        if (v !== v) p.nan = true;
        else tdIns(p.S, v);
      }
      if (a.z != null) ((p.e += a.z), (p.n += 1));
    });
    return out;
  }
  const TD_X = [
    ['slow', 'Others answered this photo right slowly (per log unit of their own usual time)'],
    ['enl', 'Others enlarged this photo more than they usually do']
  ];
  function tdFit1(R) {
    const X = R.map(r => [1, r.slow || 0, r.enl || 0]),
      F = [
        factor(
          'player',
          R.map(r => r.a.p)
        )
      ];
    return Object.assign(
      glmm(
        R.map(r => r.a.y),
        X,
        F,
        {off: Float64Array.from(R.map(r => r.a.x)), g: Float64Array.from(R.map(r => r.a.g0))}
      ),
      {X}
    );
  }
  // Part 2: the time model, then the accuracy model with each photo's and genus's time intensity (the time model's
  // shrunk effects, in log seconds) as covariates.
  function tdFit2(D) {
    const T = D.filter(a => a.s),
      Ft = [
        factor(
          'player',
          T.map(a => a.p)
        ),
        factor(
          'genus',
          T.map(a => a.g)
        ),
        factor(
          'photo',
          T.map(a => (a.ph.length ? a.ph : null))
        )
      ],
      Mt = lmm(
        T.map(a => Math.log(a.s)),
        T.map(a => [1, a.y, a.typed, a.z || 0, a.ch.length === 2 ? 1 : 0]),
        Ft
      ),
      tp = new Map(Ft[2].L.map((k, j) => [k, Ft[2].u[j]])),
      tph = a => (a.ph.length ? mean(a.ph.map(f => tp.get(f) || 0)) : 0),
      X = D.map(a => [1, tph(a), a.typed, a.ch.length === 2 ? 1 : 0]),
      F = [
        factor(
          'player',
          D.map(a => a.p)
        ),
        factor(
          'genus',
          D.map(a => a.g)
        ),
        factor(
          'photo',
          D.map(a => (a.ph.length ? a.ph : null))
        )
      ],
      M = glmm(
        D.map(a => a.y),
        X,
        F,
        {g: Float64Array.from(D.map(a => a.g0))}
      );
    return {M, X, F, Ft, Mt, tp};
  }
  function tdiff(A, B, seed) {
    const D = A.filter(a => a.x != null),
      R = tdFeat(D).filter(r => r.slow != null || r.enl != null),
      n = R.length,
      nt = D.filter(a => a.s).length;
    if (n < 100 || new Set(R.map(r => r.a.p)).size < 2 || nt < 200) return thin(n, 100, {timed: nt});
    const M = tdFit1(R),
      bi = boot(
        R.map(r => ({...r, p: r.a.p})),
        S => {
          const m = tdFit1(S.map(r => ({...r, a: {...r.a, p: r.p}})));
          return {slow: m.b[1], enl: m.b[2]};
        },
        B,
        seed
      ),
      W = tdFit2(D),
      bw = boot(
        D,
        S => {
          const w = tdFit2(S);
          return {tph: w.M.b[1]};
        },
        B,
        seed + 1
      );
    const effects = [
      eff('slow', TD_X[0][1], M.b[1], M.se[1], bi, 'logit', 0.1, n, {rows: M.nz[1]}),
      eff('enl', TD_X[1][1], M.b[2], M.se[2], bi, 'logit', 0.25, n, {rows: M.nz[2]}),
      eff('tph', 'A photo slower to answer (per log unit of its time intensity)', W.M.b[1], W.M.se[1], bw, 'logit', 0.1, D.length, {
        rows: W.M.nz[1]
      })
    ];
    // Right answers against the app's expectation, by how fast others answered the photo right (descriptive).
    const bins = [
      ['fast', 'Faster than their usual', r => r.slow < -TD_ZB],
      ['mid', 'About their usual', r => r.slow >= -TD_ZB && r.slow <= TD_ZB],
      ['slow', 'Slower than their usual', r => r.slow > TD_ZB]
    ].map(([k, label, f]) => {
      const L = R.filter(r => r.slow != null && f(r));
      return {k, label, n: L.length, y: sum(L.map(r => r.a.y)), E: sum(L.map(r => r.a.E))};
    });
    // Each photo's and genus's time intensity beside its difficulty from the accuracy alone (the same accuracy model
    // without the time covariates, one fit: + = harder), and how the two agree over the photos with 3 timed answers or
    // more and the genera with 5 or more (the correlation of the shrunk effects: descriptive, shrinkage lowers it).
    const F0 = [
      factor(
        'player',
        D.map(a => a.p)
      ),
      factor(
        'genus',
        D.map(a => a.g)
      ),
      factor(
        'photo',
        D.map(a => (a.ph.length ? a.ph : null))
      )
    ];
    glmm(
      D.map(a => a.y),
      D.map(a => [1, a.typed, a.ch.length === 2 ? 1 : 0]),
      F0,
      {g: Float64Array.from(D.map(a => a.g0))}
    );
    const Fp = W.Ft[2],
      Fg = W.Ft[1],
      up = new Map(F0[2].L.map((k, j) => [k, F0[2].u[j]])),
      ug = new Map(F0[1].L.map((k, j) => [k, F0[1].u[j]])),
      lv = (Ft, u, min) => Ft.L.map((k, j) => ({k, f: k, n: Ft.cnt[j], t: Ft.u[j], d: -(u.get(k) || 0)})).filter(x => x.n >= min),
      cor = L => {
        if (L.length < 5) return null;
        const mt = mean(L.map(x => x.t)),
          md = mean(L.map(x => x.d)),
          c = sum(L.map(x => (x.t - mt) * (x.d - md))),
          v = Math.sqrt(sum(L.map(x => (x.t - mt) ** 2)) * sum(L.map(x => (x.d - md) ** 2)));
        return v > 0 ? r3(c / v) : null;
      },
      ph = lv(Fp, up, 3).sort((a, b) => b.t - a.t),
      gen = lv(Fg, ug, 5).sort((a, b) => b.t - a.t);
    return {
      n,
      players: players(R.map(r => r.a)),
      timed: nt,
      photos: new Set(R.map(r => r.a.ph[0])).size,
      typ: typOf(D),
      effects,
      bins,
      agree: {photo: cor(ph), photos: ph.length, genus: cor(gen), genera: gen.length},
      slowest: [...ph.slice(0, 6), ...ph.slice(-6).filter(x => !ph.slice(0, 6).includes(x))].map(x => ({
        f: x.k,
        n: x.n,
        t: r3(x.t),
        d: r3(x.d)
      })),
      genus: gen.map(x => ({k: x.k, n: x.n, t: r3(x.t), d: r3(x.d)})),
      ent: entOf(M.V, M.X, [null, 'slow', 'enl'])
    };
  }

  /* ---------- Synthetic answer logs with known effects (the tests and the admin demo) ---------- */
  // TRUTH: the effects the generator plays with; the tests check that the fits give them back.
  const TRUTH = {
    rt: {b0: 1.6, right: -0.35, typed: 0.4, enl: 0.6, two: -0.1, sdPlayer: 0.3, sdGenus: 0.15, sdPhoto: 0.2, sdRes: 0.45},
    ph: {medium: 0.3, macro: 0.7, fair: 0.25, poor: 0.7, sharp: -0.25, own: 0, inat: 0.35, alone: 0.5, sdPhoto: 0.3},
    // flatG: the first flatG genera are not learned with practice (slope 0; the tests of the per-genus curves plant it)
    learn: {b0: -0.3, slope: 0.55, afterMiss: -0.3, again: 0.4, flatG: 0},
    fmt: {k2: [0.4, 0], typed: [0, -0.6], again: [0.5, 0.2]}, // [true guess rate, extra ease (logit, - = harder)]
    zoom: 0.3,
    mix: 4, // a wrong answer goes to a look-alike offered 4 times as often as to another genus offered (the mix-up map)
    back: -0.3,
    sess: {b0: -3.3, wrong: 0.5, streak: 0.6},
    // a photo's time intensity linked to its difficulty: + log seconds per logit of the photo's own difficulty (0: none;
    // the tests of Time and difficulty plant one)
    // blind: the share of a photo's own difficulty the app's expectation misses (0: the app knows it, up to its noise)
    td: {link: 0, blind: 0},
    // interactions (0: none; the tests of the interactions plant them): enlarging on a corallite photo, on the log-odds;
    // a look-alike's pull on a corallite photo for the even-numbered genera, on the log of its weight; the practice slope
    // of typed answers, on top of the others'
    ix: {zoomMacro: 0, pairMacro: 0, typedSlope: 0}
  };
  // o: {players: [[id, ability, answers, enlarge rate, own learning slope (added to the common one; optional)]], photos: {genus: [{f, v, q, sh, src}]}, look: {genus: [genera]},
  // start, end (ms), seed, subject}. Returns readAnswers rows (Code.gs answers_ shape, id as given); with subject, each row
  // carries it in the Subject column (index 17, core.js LOG_SUBJ), as the sheet serves another subject's answers (the
  // fish: units f:Damselfishes, g:Chromis, photos of one view).
  function synth(o) {
    const R = rng(o.seed || 7),
      T = TRUTH,
      nrm = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R()),
      pick = L => L[Math.floor(R() * L.length)],
      // a wrong choice: a look-alike of the genus shown is picked T.mix times as often as another (one draw, as pick)
      pickW = (L, look, pull = 1) => {
        const w = L.map(x => (look.includes(x) ? T.mix * pull : 1));
        let r = R() * sum(w);
        return L.find((x, i) => (r -= w[i]) < 0) || L[L.length - 1];
      },
      G = Object.keys(o.photos).filter(g => o.photos[g].length),
      bg = Object.fromEntries(G.map(g => [g, nrm() * 0.5])),
      rg = Object.fromEntries(G.map(g => [g, nrm() * T.rt.sdGenus])),
      bph = {},
      rph = {},
      shs = Object.values(o.photos)
        .flat()
        .map(p => p.sh)
        .filter(v => v > 0)
        .map(Math.log),
      shm = mean(shs),
      shd = Math.sqrt(mean(shs.map(v => (v - shm) ** 2))) || 1;
    G.forEach(g =>
      o.photos[g].forEach(p => {
        const P = T.ph;
        bph[p.f] =
          (p.v === 'medium' ? P.medium : p.v === 'macro' ? P.macro : 0) +
          (p.q === 2 ? P.fair : p.q === 1 ? P.poor : 0) +
          (p.sh > 0 ? (P.sharp * (Math.log(p.sh) - shm)) / shd : 0) +
          (p.src === 'own' ? P.own : p.src === 'inat' ? P.inat : 0) +
          nrm() * P.sdPhoto;
        rph[p.f] = nrm() * T.rt.sdPhoto + T.td.link * bph[p.f];
      })
    );
    const rows = [],
      span = (o.end || Date.now()) - (o.start || 0);
    o.players.forEach(([id, th, nAns, enl], pi) => {
      const psl = o.players[pi][4] || 0, // the player's own learning slope (the profiles' tests plant it)
        rp = nrm() * T.rt.sdPlayer,
        st = {};
      let t = (o.start || 0) + R() * span * 0.2,
        miss = 0,
        againQ = null,
        pos = 0;
      for (let i = 0; i < nAns; i++) {
        pos++;
        const open = G.slice(0, Math.min(G.length, 4 + Math.floor(i / 8)));
        let g = pick(open),
          f = R() < 0.08 ? 'typed' : R() < 0.12 ? 'qduel' : R() < 0.15 ? 'k2' : 'k4';
        if (againQ) ((g = againQ[0]), (f = 'again'));
        const s = (st[g] = st[g] || {n: 0, last: 0, miss: 0, again: 0}),
          p = pick(o.photos[g]),
          same = o.photos[g].filter(x => x.o && x.o === p.o && x.f !== p.f),
          ph = R() < 0.5 ? [p] : [p, ...same.slice(0, 2)],
          days = s.last ? (t - s.last) / DAY : 0,
          eta =
            th -
            bg[g] -
            mean(ph.map(x => bph[x.f])) -
            (ph.length === 1 ? T.ph.alone : 0) +
            T.learn.b0 +
            (G.indexOf(g) < T.learn.flatG ? 0 : T.learn.slope + psl) * Math.log(1 + s.n) +
            (s.miss && f !== 'again' ? T.learn.afterMiss + (s.again ? T.learn.again : 0) : 0) +
            (s.last ? T.back * Math.log(1 + days) : 0) +
            (f === 'typed' ? T.ix.typedSlope * Math.log(1 + s.n) : 0),
          [cg, ez] = T.fmt[f] || [f === 'qduel' ? 0.5 : 0.25, 0],
          z = R() < enl * (p.v === 'wide' ? 1.5 : 0.6) ? 1 : 0,
          e2 = eta + ez + (z ? T.zoom + (p.v === 'macro' ? T.ix.zoomMacro : 0) : 0),
          right = R() < cg + (1 - cg) * sig(e2) ? 1 : 0,
          look = (o.look[g] || []).filter(x => o.photos[x]),
          ch = [g];
        if (f === 'again') ch.push(againQ[1]);
        else if (f !== 'typed')
          while (ch.length < (f === 'qduel' ? 2 : 4)) {
            const x = look.length && R() < 0.6 ? pick(look) : pick(G);
            if (!ch.includes(x)) ch.push(x);
          }
        const app = f === 'typed' ? 0 : f === 'k2' ? 0.5 : f === 'k4' ? 0.25 : 0.5,
          // the app's expectation: its own estimate of eta (a little off), its fixed guess rate
          E = app + (1 - app) * sig(eta + T.td.blind * mean(ph.map(x => bph[x.f])) + nrm() * 0.1),
          ans = right
            ? g
            : f === 'typed'
              ? R() < 0.5
                ? ''
                : pick(G)
              : pickW(ch.slice(1), look, p.v === 'macro' && G.indexOf(g) % 2 === 0 ? Math.exp(T.ix.pairMacro) : 1),
          sec = Math.exp(
            T.rt.b0 +
              rp +
              rg[g] +
              mean(ph.map(x => rph[x.f])) +
              T.rt.right * right +
              T.rt.typed * (f === 'typed' ? 1 : 0) +
              T.rt.enl * z +
              T.rt.two * (ch.length === 2 ? 1 : 0) +
              nrm() * T.rt.sdRes
          );
        if (o.end && t > o.end) break;
        rows.push([
          id,
          Math.round(t),
          g,
          ans,
          right,
          f === 'typed' ? 'quiz|t' : f === 'qduel' ? 'quiz|d|k2' : f === 'k2' ? 'quiz|k2' : 'quiz',
          ph.map(x => x.f).join(' '),
          Math.round(E * 100) / 100,
          Math.round(th * 100) / 100,
          0,
          shuffle(ch, R).join(' '),
          0,
          Math.round(clamp(sec, 0.5, 600) * 10) / 10,
          z,
          ...(o.subject ? [null, null, null, o.subject] : [])
        ]);
        againQ = !right && f !== 'again' && f !== 'typed' && R() < 0.7 ? [g, ans] : null;
        if (f !== 'again') ((s.miss = !right), (s.again = 0));
        else s.again = s.miss ? 1 : 0;
        s.n++;
        s.last = t;
        miss = right ? 0 : miss + 1;
        // the session ends with a hazard that rises after misses; the next starts 40 minutes to 12 days later
        if (R() < sig(T.sess.b0 + T.sess.wrong * (right ? 0 : 1) + T.sess.streak * (miss >= 2 ? 1 : 0))) {
          t += Math.exp(Math.log(40 * 6e4) + R() * Math.log((12 * DAY) / (40 * 6e4)));
          pos = 0;
        } else t += sec * 1000 + 3000;
      }
      void pi;
    });
    return rows.sort((a, b) => a[1] - b[1]);
  }

  // The demo's made-up players (admin.html?demo, tools/analyses.js --demo): synthetic answers on the real photos of
  // data.json (their view, quality, sharpness, source), from `days` days before `end` until `end`. Names made up.
  const DEMO_PLAYERS = [
    ['Eli Demo', 0.9, 520, 0.04],
    ['Fay Demo', 0.2, 420, 0.25],
    ['Gus Demo', -0.4, 380, 0.08],
    ['Hana Demo', 0.5, 460, 0.15],
    ['Ivo Demo', -0.1, 340, 0.02],
    ['Kai Demo', 1.2, 400, 0.1],
    ['Lia Demo', 0.0, 300, 0.3]
  ];
  function demoLog(data, end, o = {}) {
    const meta = photoMeta(data, o.cur, o.qual, o.met),
      gen = data.gen || {},
      photos = {},
      look = {};
    Object.keys(gen).forEach(g => {
      const L = [];
      const add = p =>
        p &&
        p.f &&
        meta[p.f] &&
        !p.multi &&
        !p.cf &&
        L.push({f: p.f, o: p.o || p.f, v: meta[p.f][0], q: meta[p.f][1], sh: meta[p.f][2], src: meta[p.f][3]});
      Object.values(gen[g].views || {}).forEach(V => (V || []).forEach(add));
      ((data.course || {})[g] || []).forEach(add);
      if (L.length) photos[g] = L;
      look[g] = gen[g].look || [];
    });
    return synth({players: o.players || DEMO_PLAYERS, photos, look, start: end - (o.days || 40) * DAY, end, seed: o.seed || 20261104});
  }

  /* ---------- The plain reading of each effect (Pierre, 2026-11-04: "a non-statistician must understand it at a glance") ---------- */
  // For each effect: what is compared (name), the outcome it moves (o), the contrast its estimate is read at (s: the
  // estimate times s is the change shown), whether the estimate is a difficulty (inv: + = fewer right answers), whether it
  // says how far the app's own estimate is off (cal), and what a clear result suggests for the app (up / down: the
  // outcome going up or down). Outcomes: right = the chance of a right answer; time = seconds to answer; stop = the
  // chance to end the session after this answer; mix = the chance to pick a given wrong genus when it is offered;
  // pts = right answers against the app's expectation, in points; guess = the success of a pure guess.
  const LN2 = Math.log(2),
    LN4 = Math.log(4);
  const FMT_PLAIN = {
    k4: '4 choices',
    k3: '4 choices, one easy to rule out',
    k2: '4 choices, two easy to rule out',
    again: '“Again” after a miss (2 choices)',
    qduel: 'Duel inside the quiz (2 choices)',
    duel: 'Duel tab (2 choices)',
    exam: 'Mastery exam question',
    typed: 'Typed answer (no choices)'
  };
  const PLAIN = {
    rt: {
      right: {name: 'Right answers, compared with wrong ones', o: 'time'},
      typed: {name: 'Answers typed instead of picked from choices', o: 'time'},
      enl: {name: 'Photo enlarged before answering', o: 'time'},
      two: {name: 'Questions with 2 choices instead of 4', o: 'time'},
      diff: {name: 'A question the app rates harder (73% → 50% recognised, beyond guessing)', o: 'time'},
      pos: {
        name: 'Later in a session: the 40th answer against the 10th',
        o: 'time',
        s: LN4,
        up: 'Players slow down as a session goes on: a sign of fatigue.',
        down: 'Players get faster as a session goes on: no sign of fatigue.'
      },
      sd_player: {name: 'How much players differ from each other', o: 'time', who: 'player'},
      sd_genus: {name: 'How much genera differ from each other', o: 'time', who: 'genus'},
      sd_photo: {name: 'How much photos differ from each other', o: 'time', who: 'photo'}
    },
    zoom: {
      rel: {
        name: 'Photo enlarged before answering (same player, with or without)',
        o: 'right',
        up: 'Enlarging helps: keep the enlarge button easy to find.',
        down: 'Players enlarge when a photo is hard for them: an enlarged photo signals a hard question.'
      },
      hab: {name: 'Players who enlarge often (10% more of their answers)', o: 'right', s: 0.1}
    },
    photo: {
      medium: {name: 'A close-up instead of a colony photo', o: 'right', inv: true},
      macro: {name: 'Corallites (macro) instead of a colony photo', o: 'right', inv: true},
      fair: {name: 'A fair-quality photo instead of a good one', o: 'right', inv: true},
      poor: {
        name: 'A poor-quality photo instead of a good one',
        o: 'right',
        inv: true,
        down: 'Poor photos make questions harder: replace the poorest game photos.'
      },
      sharp: {
        name: 'A sharper photo (one typical step sharper)',
        o: 'right',
        inv: true,
        up: 'Sharp photos are easier: prefer sharp photos in the games.'
      },
      own: {name: 'Pierre’s photo instead of an IMR lecture photo', o: 'right', inv: true},
      inat: {name: 'Another iNaturalist photo instead of an IMR lecture photo', o: 'right', inv: true},
      alone: {name: 'One view shown alone instead of several views', o: 'right', inv: true},
      sd_photo: {name: 'How much photos differ, beyond these features', o: 'right', who: 'photo'},
      sd_genus: {name: 'How much genera differ from each other', o: 'right', who: 'genus'}
    },
    conf: {
      medium: {name: 'A close-up shown instead of a colony', o: 'mix'},
      macro: {name: 'Corallites shown instead of a colony', o: 'mix'},
      multi: {name: 'Several views shown instead of a colony', o: 'mix'},
      sd_player: {name: 'How much players differ from each other', o: 'mix', who: 'player'},
      sd_pair: {name: 'How much pairs of genera differ from each other', o: 'mix', who: 'pair of genera'}
    },
    learn: {
      n_all: {name: 'Answers on a genus to reach 80% beyond guessing (a typical genus and player)', o: 'n'},
      slope: {
        name: 'More practice on a genus: twice as many answers on it',
        o: 'right',
        s: LN2,
        up: 'Practice works: each answer on a genus makes the next one more likely right.',
        down: 'Answers on a genus do not make the next ones easier: check the questions.'
      },
      afterMiss: {name: 'The next question on a genus just missed', o: 'right'},
      again: {
        name: 'The next ordinary question after a miss, with an “Again” in between (its extra effect)',
        o: 'right',
        up: '“Again” after a miss helps: keep it.',
        down: '“Again” after a miss does not help: reconsider it.'
      },
      typed: {name: 'Answers typed instead of picked from choices', o: 'right', g1: 0},
      exam: {name: 'Mastery exam questions instead of ordinary ones', o: 'right'},
      back: {name: 'Comeback questions after a break instead of ordinary ones', o: 'right'},
      card: {name: 'The first-meeting card', o: 'right'},
      side: {name: 'The side-by-side comparison', o: 'right'},
      sd_gslope: {name: 'How much genera differ in how fast practice helps', o: 'right', who: 'genus', slope: 1},
      sd_pslope: {name: 'How much players differ in how fast practice helps', o: 'right', who: 'player', slope: 1}
    },
    back: {
      slope: {
        name: 'Time away from a genus: a week against a day',
        o: 'right',
        s: LN4,
        down: 'Players forget over days: the comeback after a break is needed.',
        up: 'No forgetting over days: the comeback after a break could be lighter.'
      },
      calib: {
        name: 'Comeback questions: right answers against the app’s expectation',
        o: 'pts',
        cal: true,
        up: 'Players remember more than the app expects after a break: its comeback could be shorter or harder.',
        down: 'Players remember less than the app expects after a break: its comeback could be longer or easier.'
      }
    },
    sess: {
      wrong: {
        name: 'After a wrong answer instead of a right one',
        o: 'stop',
        up: 'Misses end sessions: make the screen after a miss a good place to go on (an easier next question, a “so far” line).'
      },
      streak: {
        name: 'After 2 or more misses in a row',
        o: 'stop',
        up: 'Runs of misses end sessions: watch for players stuck on hard genera.'
      },
      diff: {name: 'After a question the app rates harder (73% → 50% recognised, beyond guessing)', o: 'stop'},
      slow: {name: 'After a slow answer (twice the player’s usual time)', o: 'stop', s: LN2},
      pos: {
        name: 'Later in a session: after the 40th answer against the 10th',
        o: 'stop',
        s: LN4,
        up: 'Players tire as a session goes on.'
      }
    },
    tdiff: {
      slow: {
        name: 'A photo other players answered right a quarter slower than their usual',
        o: 'right',
        s: Math.log(1.25),
        down: 'A slow right answer says the photo is harder than its rating: the photo rating could take the time into account.'
      },
      enl: {
        name: 'A photo other players enlarged one time in ten more than they usually do',
        o: 'right',
        s: 0.1,
        down: 'Enlarging says the photo is harder than its rating: the photo rating could take it into account.'
      },
      tph: {
        name: 'A photo players take a fifth longer to answer, beyond right or wrong',
        o: 'right',
        s: Math.log(1.2),
        down: 'Photos slow to answer are also missed more: time and accuracy agree on the photos.'
      }
    }
  };
  // Question formats: one entry per format and part (guess rate, difficulty, right − expected).
  Object.keys(FMT_PLAIN).forEach(k => {
    const F = FMT_PLAIN[k];
    PLAIN.fmt = PLAIN.fmt || {};
    PLAIN.fmt['g_' + k] = {name: `${F}: success of a pure guess`, o: 'guess', fmt: k, cal: true};
    // fitted with the format's own guess rate (fmtFit), so read beyond guessing (Codex review #495)
    PLAIN.fmt['d_' + k] = {
      name: `${F}: easier or harder than the app expects, beyond guessing`,
      o: 'right',
      inv: true,
      fmt: k,
      cal: true,
      beyond: true
    };
    PLAIN.fmt['oe_' + k] = {
      name: `${F}: right answers against the app’s expectation`,
      o: 'pts',
      fmt: k,
      cal: true,
      up: 'The app underrates players on this format: its expected chance here could be raised.',
      down: 'The app overrates players on this format: its expected chance here could be lowered.'
    };
  });
  const PLAIN_VERDICT = {
    clear: 'Clear',
    margin: 'No clear effect',
    thin: 'Not enough data yet',
    none: 'No such answers yet',
    nolog: 'Not in the answer log'
  };
  const pctOf = v =>
    v == null || !isFinite(v) ? '–' : v < 0.095 && v > 0 ? (Math.round(v * 1000) / 10).toFixed(1) + '%' : Math.round(v * 100) + '%';
  const secOf = v => (v == null || !isFinite(v) ? '–' : (v < 10 ? v.toFixed(1) : Math.round(v)) + ' s');
  const ptsOf = v => (v == null || !isFinite(v) ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v * 100)) + ' points');
  // The chance of a right answer after a shift d on the log-odds of knowing (the part above the guess floor g).
  const shiftP = (p0, g, d) => {
    const g1 = clamp(g || 0, 0, 0.95),
      q0 = clamp((p0 - g1) / (1 - g1), 0.001, 0.999);
    return g1 + (1 - g1) * sig(logit(q0) + d);
  };
  // How many times as often, from an odds ratio exp(u) at the base chance p (Codex review #495: the odds ratio is not
  // a frequency ratio when the chance is not small; doubling the odds at 30% gives 46%, 1.54 times as often).
  const freqRatio = (p, u) => shiftP(p, 0, u) / clamp(p, 1e-6, 1);
  // One effect read in words: {name, verdict, tone ('good' | 'bad' | 'info' | 'none' | 'thin'), dir ('up' | 'down' |
  // ''), text (direction and size), range (the 95% range in words), advice, scale ('p' | 's' | 'pts'), base, val, lo, hi}.
  // a: the analysis (its typ: typical values); o.row: the format's row (Formats: its own expected chance and guess rate).
  function plainOf(key, e, a = {}, o = {}) {
    const P = (PLAIN[key] || {})[e.k] || {name: e.label, o: 'right'},
      T = Object.assign({p: 0.75, g: 0.25, s: 6}, (a && a.typ) || {}),
      row = o.row || null;
    if (row && row.n) ((T.p = row.E), (T.g = row.g0));
    // v: the verdict on the scale shown (the model's, except where the reading changes scale: typed answers)
    const out = {
      name: P.name,
      v: e.v,
      verdict: PLAIN_VERDICT[e.v] || '',
      tone: 'thin',
      dir: '',
      text: '',
      range: '',
      advice: '',
      scale: 'p'
    };
    if (e.v === 'none' || e.v === 'nolog') {
      out.text = e.v === 'nolog' ? 'It leaves no row in the answer log, so it cannot be measured yet.' : 'No such answers yet.';
      return out;
    }
    // too few answers to estimate anything yet (Codex review #495: not "no such answers")
    if (e.est == null || !isFinite(e.est)) {
      Object.assign(out, {v: 'thin', verdict: PLAIN_VERDICT.thin, text: 'Not enough data yet: too few answers to estimate it.'});
      return out;
    }
    const s = P.s || 1,
      sg = P.inv ? -1 : 1,
      g = P.o === 'right' ? T.g : 0,
      fin = v => v != null && isFinite(v);
    // A spread between players, genera, photos or pairs: the typical range, one spread either side of the average.
    // A spread of the learning slope: the gain from twice as many answers, one spread either side of the common slope.
    if (e.sd && P.slope) {
      const b1 = a && isFinite(a.b1) ? a.b1 : 0,
        gain = v => shiftP(T.p, T.g, LN2 * v) - T.p,
        lo = gain(b1 - e.est),
        hi = gain(b1 + e.est),
        what = `a typical ${P.who} gains between ${ptsOf(lo)} and ${ptsOf(hi)} of right answers from twice as many answers on it`;
      Object.assign(out, {scale: 'pts', base: gain(b1), val: e.est, lo, hi});
      if (e.v === 'clear') ((out.tone = 'info'), (out.text = `They differ: ${what}.`));
      else if (e.v === 'margin') ((out.tone = 'none'), (out.text = `They hardly differ: ${what}.`));
      else out.text = `Too early to tell how much they differ (${what}, if the estimate holds).`;
      return out;
    }
    if (e.sd) {
      const who = P.who || 'one';
      let lo, hi, f;
      if (P.o === 'time') ((lo = T.s * Math.exp(-e.est)), (hi = T.s * Math.exp(e.est)), (f = secOf), (out.scale = 's'));
      else ((lo = shiftP(P.o === 'mix' ? T.p : T.p, g, -e.est)), (hi = shiftP(T.p, g, e.est)), (f = pctOf));
      const what =
        P.o === 'time'
          ? `a typical ${who} takes between ${f(lo)} and ${f(hi)} to answer`
          : P.o === 'mix'
            ? `a typical ${who} picks a wrong genus between ${f(lo)} and ${f(hi)} of the times it is offered`
            : `a typical ${who} gets between ${f(lo)} and ${f(hi)} right`;
      Object.assign(out, {base: P.o === 'time' ? T.s : T.p, val: e.est, lo, hi});
      if (e.v === 'clear') ((out.tone = 'info'), (out.text = `They differ: ${what}.`));
      else if (e.v === 'margin') ((out.tone = 'none'), (out.text = `They hardly differ: ${what}.`));
      else out.text = `Too early to tell how much they differ (${what}, if the estimate holds).`;
      return out;
    }
    // A number of answers (to reach the app's 80% target): no comparison, its value and range.
    if (P.o === 'n') {
      const f = v => (v >= 999 ? '999+' : String(Math.round(v)));
      Object.assign(out, {scale: 'n', val: e.est, lo: e.lo, hi: e.hi, base: null});
      out.range = fin(e.lo) && fin(e.hi) ? `between ${f(e.lo)} and ${f(e.hi)}` : '';
      out.tone = e.v === 'clear' ? 'info' : 'thin';
      out.text = e.v === 'clear' ? `About ${f(e.est)} answers.` : `Too early to tell${out.range ? ': ' + out.range + ' answers' : ''}.`;
      return out;
    }
    let base, at, f;
    if (P.o === 'time') ((out.scale = 's'), (base = T.s), (at = v => T.s * Math.exp(s * v)), (f = secOf));
    else if (P.o === 'pts') ((out.scale = 'pts'), (base = 0), (at = v => v), (f = ptsOf));
    else if (P.o === 'guess') ((base = e.ref != null ? e.ref : T.g), (at = v => v), (f = pctOf));
    else if (P.g1 != null) {
      // the other side has its own guess floor (typed answers: none; Codex review #495): the same recognition, then
      // the change, read with that floor
      const q0 = clamp((T.p - g) / (1 - g), 0.001, 0.999);
      ((base = T.p), (at = v => shiftP(P.g1 + (1 - P.g1) * q0, P.g1, sg * s * v)), (f = pctOf));
    } else if (P.beyond) {
      // recognition beyond guessing: the app's expectation without its guess floor, shifted with no floor (the fit has
      // its own guess rate; the raw right answers are the format's "against the app's expectation", Codex review #495)
      const q0 = clamp((T.p - T.g) / (1 - T.g), 0.001, 0.999);
      ((base = q0), (at = v => shiftP(q0, 0, sg * s * v)), (f = pctOf));
    } else ((base = T.p), (at = v => shiftP(T.p, g, sg * s * v)), (f = pctOf));
    const val = at(e.est),
      a1 = fin(e.lo) ? at(e.lo) : null,
      a2 = fin(e.hi) ? at(e.hi) : null,
      lo = a1 == null || a2 == null ? null : Math.min(a1, a2),
      hi = a1 == null || a2 == null ? null : Math.max(a1, a2),
      up = val > base,
      dir = val === base ? '' : up ? 'up' : 'down';
    Object.assign(out, {base, val, lo, hi, dir});
    out.range = lo == null ? '' : `between ${f(lo)} and ${f(hi)}`;
    // a contrast read on another guess floor (typed answers) is judged on the right answers shown: clear only when the
    // multiple-testing correction finds it clear, tested against as many right answers as the baseline (correct sets
    // its null so: Codex review #588), else no clear effect when its range stays within 5 points of the baseline
    // (Codex review #495)
    let v = e.v;
    // (an effect read here without that correction, its 95% range of right answers holding the baseline, is not clear)
    if (P.g1 != null && lo != null && v !== 'none' && (v !== 'clear' || (lo <= base && hi >= base)))
      v = lo >= base - 0.05 && hi <= base + 0.05 ? 'margin' : 'thin';
    Object.assign(out, {v, verdict: PLAIN_VERDICT[v] || ''});
    let say;
    if (P.o === 'time') say = `${up ? 'Slower' : 'Faster'}: about ${f(val)} instead of ${f(base)}`;
    else if (P.o === 'stop')
      say = `${up ? 'More' : 'Less'} likely to stop: a ${f(val)} chance to end the session after it, instead of ${f(base)}`;
    else if (P.o === 'mix')
      say = `Mixed up ${up ? 'more' : 'less'} often: a wrong genus picked ${f(val)} of the times it is offered, instead of ${f(base)}`;
    else if (P.o === 'pts') say = `Players do ${up ? 'better' : 'worse'} than the app expects: ${f(val)} of right answers`;
    else if (P.o === 'guess') say = `About ${f(val)} right by pure guessing; the app assumes ${f(base)}`;
    else if (P.beyond)
      say = `${up ? 'Easier' : 'Harder'} than the app expects: about ${f(val)} recognised beyond guessing where it expects ${f(base)}`;
    else if (P.cal) say = `${up ? 'Easier' : 'Harder'} than the app expects: about ${f(val)} right where it expects ${f(base)}`;
    else say = `More likely ${up ? 'right' : 'wrong'}: about ${f(val)} right instead of ${f(base)}`;
    if (v === 'clear') {
      out.tone = P.cal || P.o === 'time' || P.o === 'guess' ? 'info' : (P.o === 'stop' || P.o === 'mix') === up ? 'bad' : 'good';
      out.text = say + '.';
      out.advice = (up ? P.up : P.down) || (P.o === 'guess' ? `The app’s guess rate for this format could be about ${f(val)}.` : '');
    } else {
      const ref = P.o === 'pts' ? 'the app’s expectation' : f(base);
      if (v === 'margin') ((out.tone = 'none'), (out.text = `No clear effect: if any, it is small (${out.range} against ${ref}).`));
      else out.text = `Too early to tell: ${out.range ? out.range + ' against ' + ref : 'too uncertain to say'}.`;
    }
    return out;
  }

  // The outcome a chart draws an effect on: its own (right, time, …), except a difficulty read beyond guessing, which is
  // not a chance of a right answer (Codex review #495).
  const outOf = P => (!P ? 'right' : P.beyond ? 'beyond' : P.o || 'right');

  /* ---------- Multiple testing (Pierre, 2026-11-05, Q69; the stats-methods study of 2026-11-05, §2, §5.3, §6.3) ---------- */
  // About 40 effects per milestone, each at 95%: some would read "clear" by chance alone. Each analysis declares the 1-2
  // questions it exists to answer (PRIMARY, chosen before looking at any result: docs/LEARNING.md "Multifactor analyses");
  // they are tested together under Holm (family-wise error 5%: the chance of even one false "clear" among them). Every
  // other effect is secondary, exploratory: tested together under Benjamini-Hochberg (false discovery rate 5%: of the
  // exploratory effects called clear, about 5% may be chance on average), a lead to re-test on later answers. Effects that
  // are not a test (the answers to mastery, a number, not a comparison) are left out of both.
  const PRIMARY = {
    rt: ['right', 'diff'], // is answer time a signal: right answers faster, harder questions slower
    zoom: ['rel'], // does enlarging a photo help the same player
    photo: ['poor', 'macro'], // the photo rules the games rest on: Poor photos harder, corallites harder than a colony
    fmt: ['oe_k4', 'oe_typed'], // is the app's expected chance right on its main format and on typed answers
    conf: ['macro'], // do corallites shown cut mix-ups (an SD is never primary: its test is rough near 0, see pOf)
    learn: ['slope', 'again'], // does practice work; does "Again" after a miss help
    back: ['slope', 'calib'], // do players forget over days; is the comeback after a break right
    sess: ['wrong'], // do misses end sessions
    tdiff: ['slow'] // does the time others took to answer a photo right say it is harder than the app thinks
  };
  const ALPHA = 0.05, // Holm, primary effects
    FDR = 0.05; // Benjamini-Hochberg, secondary effects
  // The normal tail P(Z > |z|) to double precision (Hart 1968, as written by West 2005) and the normal quantile
  // (Acklam's rational approximation, relative error 1e-9).
  function ntail(z) {
    const x = Math.abs(z);
    if (x > 37) return 0;
    const e = Math.exp((-x * x) / 2);
    if (x >= 7.07106781186547) {
      let b = x + 0.65;
      b = x + 4 / b;
      b = x + 3 / b;
      b = x + 2 / b;
      b = x + 1 / b;
      return e / b / 2.506628274631;
    }
    let n = 3.52624965998911e-2 * x + 0.700383064443688;
    n = n * x + 6.37396220353165;
    n = n * x + 33.912866078383;
    n = n * x + 112.079291497871;
    n = n * x + 221.213596169931;
    n = n * x + 220.206867912376;
    let d = 8.83883476483184e-2 * x + 1.75566716318264;
    d = d * x + 16.064177579207;
    d = d * x + 86.7807322029461;
    d = d * x + 296.564248779674;
    d = d * x + 637.333633378831;
    d = d * x + 793.826512519948;
    d = d * x + 440.413735824752;
    return (e * n) / d;
  }
  function nq(p) {
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239],
      b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572],
      c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
      d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    const lo = 0.02425;
    if (p < lo || p > 1 - lo) {
      const r = Math.sqrt(-2 * Math.log(p < lo ? p : 1 - p)),
        x = (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1);
      return p < lo ? x : -x;
    }
    const r = (p - 0.5) * (p - 0.5);
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * (p - 0.5)) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  // An effect's two-sided p-value, from its 95% interval read as a normal one on the side that faces the null value (the
  // wider of the model's and the bootstrap's, so p < 0.05 exactly when that interval leaves the null value out). An SD
  // is tested against a tenth of its smallest effect that matters, from its lower bound before the cut at 0 (lu): rough,
  // as an SD's estimate never reaches 0 (EM keeps it above, and its interval is not valid at that boundary), so a spread
  // that is really 0 can still read clear; that is why no SD is a primary effect. null: not a test (no estimate, no
  // finite interval, or a number of answers).
  function pOf(e) {
    if (e.est == null || !isFinite(e.est) || !isFinite(e.lo) || !isFinite(e.hi) || e.unit === 'n' || e.v === 'none' || e.v === 'nolog')
      return null;
    const nul = e.sd ? e.sesoi / 10 : e.nul || 0,
      d = e.est - nul;
    if (e.sd && d <= 0) return 1;
    if (!d) return 1;
    const s = d > 0 ? (e.est - (e.sd ? e.lu : e.lo)) / Z : (e.hi - e.est) / Z;
    return s > 0 && isFinite(s) ? Math.min(1, 2 * ntail(d / s)) : s > 0 ? 1 : 0;
  }
  // Adjusted p-values, in the order given: Holm (step-down, family-wise error, any dependence between the tests) and
  // Benjamini-Hochberg (step-up, false discovery rate, valid under independence or positive dependence). raw: without
  // the cap at 1, so that level * p / adjusted p stays the level the test faces (settle; Codex review #588).
  function holm(P, raw) {
    const m = P.length,
      I = P.map((_, i) => i).sort((a, b) => P[a] - P[b]),
      out = new Array(m);
    let run = 0;
    I.forEach((i, r) => ((run = Math.max(run, (m - r) * P[i])), (out[i] = raw ? run : Math.min(1, run))));
    return out;
  }
  function bh(P, raw) {
    const m = P.length,
      I = P.map((_, i) => i).sort((a, b) => P[a] - P[b]),
      out = new Array(m);
    let run = Infinity;
    for (let r = m - 1; r >= 0; r--) ((run = Math.min(run, (m * P[I[r]]) / (r + 1))), (out[I[r]] = raw ? run : Math.min(1, run)));
    return out;
  }
  const sig3 = v => (v == null || !isFinite(v) || v === 0 ? v : Number(v.toPrecision(3)));
  // The final verdict of one effect after its correction: clear when its adjusted p is at most the family's level; else
  // "no clear effect" or "not enough data yet" from its 95% interval, as verdictOf. The answers needed are those that
  // would carry it to either verdict: past the level it now faces (lev: the family's level times p / uncapped adjusted p, the
  // per-test level of its rank), or inside the margin; so it never says it needs fewer answers than it has. alo /
  // ahi: its interval at that level (it leaves the null value out exactly when the effect is clear).
  function settle(e, pr, level) {
    const pa = Math.min(1, pr),
      lev = pr > 0 ? Math.min(level, (level * e.p) / pr) : level,
      za = Math.max(Z, nq(1 - lev / 2)),
      sl = (e.est - (e.sd ? e.lu : e.lo)) / Z,
      sh = (e.hi - e.est) / Z;
    Object.assign(e, {pa: sig3(pa), p: sig3(e.p), alo: sig3(e.est - za * sl), ahi: sig3(e.est + za * sh)});
    delete e.need;
    delete e.hw;
    if (e.hi - e.lo > 20) return Object.assign(e, {v: 'thin', need: null});
    if (pa <= level) return Object.assign(e, {v: 'clear'});
    const nul = e.sd ? e.sesoi / 10 : e.nul || 0,
      d = e.est - nul;
    if (e.sd ? e.hi <= e.sesoi : e.lo >= nul - e.sesoi && e.hi <= nul + e.sesoi) return Object.assign(e, {v: 'margin'});
    // Answers for either reachable verdict, the interval shrinking as 1/sqrt(n) (Codex review #588: the sesoi taken as
    // the target half-width asked fewer answers than an effect smaller than it already had): clear, its interval at the
    // level it faces leaving the null value out; or no clear effect, its 95% interval inside the margin. Both need more
    // answers than it has, as it is neither now.
    const at = f => (f > 0 && isFinite(f) ? e.n / (f * f) : Infinity),
      clear = d > 0 ? at(d / (za * sl)) : e.sd ? Infinity : at(-d / (za * sh)),
      margin = e.sd ? at((e.sesoi - e.est) / (Z * sh)) : at(Math.min((d + e.sesoi) / (Z * sl), (e.sesoi - d) / (Z * sh))),
      need = Math.min(clear, margin);
    return Object.assign(e, {v: 'thin', need: isFinite(need) ? nice(need) : null});
  }

  // The verdict of an interaction's omnibus test after its correction: clear when its adjusted p is at most the level;
  // "no clear effect" when every product coefficient lies inside the margin (inm); else not enough data yet, with the
  // answers that would carry it to either verdict if the pattern held (the Wald chi-square grows with the answers; the
  // intervals shrink as 1/sqrt(n)).
  function settleIx(e, pr, level) {
    const pa = Math.min(1, pr),
      lev = pr > 0 ? Math.min(level, (level * e.p) / pr) : level;
    Object.assign(e, {pa: sig3(pa), p: sig3(e.p), need: null});
    if (pa <= level) return Object.assign(e, {v: 'clear'});
    if (e.inm) return Object.assign(e, {v: 'margin'});
    const clear = e.W > 0 ? (e.n * chi2inv(lev, e.df)) / e.W : Infinity,
      margin = e.b.every(v => Math.abs(v) < e.sesoi)
        ? e.n * Math.max(...e.b.map((v, i) => ((Z * e.se[i]) / (e.sesoi - Math.abs(v))) ** 2))
        : Infinity,
      need = Math.max(e.n + 1, Math.min(clear, margin));
    return Object.assign(e, {v: 'thin', need: isFinite(need) ? nice(need) : null});
  }

  // Applies both corrections to one milestone's results (runAll): each tested effect gets its family (fam: 1 primary,
  // 2 secondary), p, adjusted p (pa) and final verdict; the milestone gets mt: how many tests in each family.
  function correct(res) {
    const T = [];
    Object.entries(res.A).forEach(([k, a]) =>
      (a.effects || []).forEach(e => {
        // An effect read as right answers on another guess floor (typed answers, PLAIN g1; plainOf) is tested, and
        // corrected, on that contrast: its null is the coefficient at which it gets as many right answers as the
        // typical question, not 0 (Codex review #588).
        const P = (PLAIN[k] || {})[e.k];
        if (P && P.g1 != null && e.est != null && isFinite(e.est)) {
          const T0 = Object.assign({p: 0.75, g: 0.25}, a.typ || {}),
            g = P.o === 'right' ? T0.g : 0,
            q0 = clamp((T0.p - g) / (1 - g), 0.001, 0.999),
            q1 = clamp((T0.p - P.g1) / (1 - P.g1), 0.001, 0.999);
          e.nul = (logit(q1) - logit(q0)) / ((P.inv ? -1 : 1) * (P.s || 1));
        }
        const p = pOf(e);
        if (p == null) return;
        e.fam = (PRIMARY[k] || []).includes(e.k) ? 1 : 2;
        e.p = p;
        T.push(e);
      })
    );
    // the interactions' omnibus tests (ixTest): exploratory, one p each
    Object.values(res.A).forEach(a => (a.ix || []).forEach(e => e.p0 != null && ((e.fam = 2), (e.p = e.p0), T.push(e))));
    const L1 = T.filter(e => e.fam === 1),
      L2 = T.filter(e => e.fam === 2),
      a1 = holm(
        L1.map(e => e.p),
        true
      ),
      a2 = bh(
        L2.map(e => e.p),
        true
      );
    L1.forEach((e, i) => settle(e, a1[i], ALPHA));
    L2.forEach((e, i) => (e.ix ? settleIx : settle)(e, a2[i], FDR));
    res.mt = {m1: L1.length, m2: L2.length, a: ALPHA, q: FDR};
    return res;
  }

  /* ---------- All of them, for one milestone ---------- */
  const ANALYSES = [
    ['rt', 'Response time', rt],
    ['zoom', 'Zoom', zoom],
    ['photo', 'Photo factors', photo],
    ['fmt', 'Formats', formats],
    ['conf', 'Confusions', confusions],
    ['learn', 'Learning curves', learning],
    ['back', 'Comeback', comeback],
    ['sess', 'Sessions', sessions],
    ['who', 'Player profiles', profiles],
    ['tdiff', 'Time and difficulty', tdiff]
  ];
  // rows: the answer log (readAnswers rows); M: how many of its answers (time order) this milestone takes; B: bootstrap
  // draws (BOOT by default); bse: normal bootstrap intervals (boot). progress(key) is called as each analysis finishes.
  // The verdicts are final only here, after the multiple-testing correction over every analysis (correct).
  const BOOT = 999;
  function runAll(rows, meta = {}, o = {}) {
    const all = (rows || []).slice().sort((a, b) => a[1] - b[1]),
      M = o.M || all.length,
      A = prep(all.slice(0, M), meta),
      B = o.B == null ? BOOT : o.B,
      out = {AV, M, n: A.length, players: players(A), at: A.length ? A[A.length - 1].t : 0, B, bse: o.bse ? 1 : 0, A: {}};
    BSE = !!o.bse;
    ANALYSES.forEach(([k, , fn], i) => {
      const t0 = Date.now();
      WARM = {};
      try {
        out.A[k] = fn(A, B, (o.seed || 1) + i * 7919, meta);
      } catch (e) {
        out.A[k] = {err: String((e && e.message) || e), effects: []};
      }
      out.A[k].ms = Date.now() - t0;
      if (o.progress) o.progress(k);
    });
    BSE = false;
    WARM = {};
    return correct(out);
  }

  /* ---------- Photo features, from the public files (the same for the workflow and the admin) ---------- */
  // {file: [view, quality 1-3, sharpness or null, source]}: the view after Pierre's moves and adds (curation.json), his
  // quality rating else the automatic one (quality.json; an IMR lecture photo is never rated Poor automatically, as the
  // app's autoQ), the sharpness of metrics.json, and the source (IMR lecture, Pierre's, other iNaturalist).
  function photoMeta(data, cur, qual, met, core) {
    const out = {},
      C = (cur && cur.genera) || {},
      CQ = (cur && cur.quality) || {},
      AQ = (qual && qual.q) || {},
      MT = (met && met.m) || {},
      src = p => (p.imr || /^imrl?-/.test(p.f) ? 'imr' : p.own ? 'own' : 'inat');
    let put = (p, v) => {
      const a = AQ[p.f] || 2;
      out[p.f] = [v, CQ[p.f] || (a === 1 && src(p) === 'imr' ? 2 : a), MT[p.f] ? MT[p.f][0] : null, src(p)];
    };
    // The game's own pipeline when core.js is at hand (Codex review #441): applyCuration then applySlots, so a photo's
    // view is the one the games show it in (a genus on 2 zoom levels: its close-ups join Colony; its IMR lecture
    // close-ups count as Corallites), never a copy of those rules here. Then the files' own views for the photos left.
    const K = core || (typeof module !== 'undefined' && module.exports && typeof require === 'function' ? require('./core.js') : root);
    if (K && K.applyCuration && K.applySlots && data && data.gen) {
      const d = JSON.parse(JSON.stringify(data));
      d.course = d.course || {};
      try {
        K.applyCuration(d, cur || {});
        K.applySlots(d, cur || {}, {autoq: AQ});
        Object.values(d.gen).forEach(g =>
          ['wide', 'medium', 'macro'].forEach(v => {
            const S = (g.sl || {})[v] || {};
            [...(S.game || []), ...(S.feat || []), ...(S.more || [])].forEach(p => p && p.f && !out[p.f] && put(p, v));
          })
        );
      } catch (e) {
        void e;
      }
    }
    const gen = {...((data && data.gen) || {}), ...((data && data.x && data.x.gen) || {})};
    const put0 = put;
    put = (p, v) => out[p.f] || put0(p, v);
    Object.keys(gen).forEach(g => {
      const V = gen[g].views || {},
        mv = (C[g] || {}).move || {};
      Object.keys(V).forEach(v => (V[v] || []).forEach(p => p && p.f && put(p, mv[p.f] || v)));
      // IMR lecture photos (data.json course, game photos since PR #227)
      (((data && data.course) || {})[g] || []).forEach(p => p && p.f && put({...p, imr: true}, mv[p.f] || p.v || 'wide'));
      const add = (C[g] || {}).add || {};
      (((data && data.cand) || {})[g] || []).forEach(p => p && p.f && typeof add[p.f] === 'string' && put(p, mv[p.f] || add[p.f]));
    });
    return out;
  }

  /* ---------- The report: every milestone, earlier ones reused ---------- */
  // A milestone's fingerprint: its answers (count, last time, right answers, players), so a stored result is reused only
  // for the very same answers under the same code (AV).
  // The photos' features too (Codex review #441): a view or quality changed in curation refits every milestone.
  function hashOf(o) {
    const t = JSON.stringify(
      Object.keys(o || {})
        .sort()
        .map(k => [k, o[k]])
    );
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0;
    return h.toString(36);
  }
  // Who answered each row too (Codex review #441): a renamed player gets a new anonymous id, and a milestone holding
  // the old one must be refitted, not reused under ids that no longer exist.
  function fpOf(rows, M, mh = '') {
    const S = rows.slice(0, M);
    let h = 2166136261;
    S.forEach(r => {
      const t = String(r[0]) + '|';
      for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0;
    });
    return [AV, M, S.length ? S[S.length - 1][1] : 0, S.reduce((s, r) => s + (r[4] ? 1 : 0), 0), h.toString(36), mh].join(':');
  }

  // rows: the whole answer log; prev: the stored report (or null); o: {B, Bh, hcap, bse, seed, progress, now}. Returns
  // {AV, made, answers, M: [milestones], R: {milestone: result}}; a result carries its fingerprint fp and its draws B.
  // Draws per milestone (Pierre, 2026-11-05: at least 999): the latest milestone, the one read for the verdicts, takes
  // B (999); the earlier ones are looks at a smaller log (history), so they take Bh (199) newest first, as long as their
  // answers add up to at most hcap (60,000: about 25 minutes in the Action), and none beyond (the model's own interval
  // only): a whole recompute (new AV, new photo features) stays inside the Action's 2 hours as the log grows.
  // The answers the report reads: the log's rows without those of the players and devices the admin left out of the
  // statistics (sheet v115, Players' Leave out: readAnswers excluded, the player list's excluded; their admin ids, the
  // rows' first column). The same rule for the stored report (tools/analyses.js) and the admin's Recompute here
  // (admin-analyses.js anRecompute; Codex review #801).
  function leftOut(rows, excluded) {
    const L = Array.isArray(rows) ? rows : [],
      sx = new Set(Array.isArray(excluded) ? excluded : []);
    return sx.size ? L.filter(r => !(r && sx.has(r[0]))) : L;
  }
  // live (the admin's Recompute here only, never the stored report): all the answers as one more point after the
  // milestones, named in live, with B draws like the newest milestone (the one selected by default).
  function report(rows, meta, prev, o = {}) {
    const all = (rows || []).slice().sort((a, b) => a[1] - b[1]),
      live = o.live && all.length % STEP ? all.length : 0,
      Ms = milestones(all.length).concat(live ? [live] : []),
      mh = hashOf(meta && meta.ph),
      B = o.B == null ? BOOT : o.B,
      Bh = Math.min(B, o.Bh == null ? 199 : o.Bh),
      cap = o.hcap == null ? 60000 : o.hcap,
      draws = {},
      R = {};
    let used = 0;
    milestones(all.length)
      .reverse()
      .forEach((M, i) => (draws[M] = !i ? B : (used += M) <= cap ? Bh : 0));
    if (live) draws[live] = B;
    Ms.forEach(M => {
      const fp = fpOf(all, M, mh),
        old = prev && prev.AV === AV && prev.R && prev.R[M];
      if (old && old.fp === fp) R[M] = old;
      else {
        R[M] = runAll(all, meta, {M, B: draws[M], bse: o.bse, seed: o.seed, progress: o.progress && (k => o.progress(M, k))});
        R[M].fp = fp;
      }
    });
    return Object.assign({AV, made: o.now || Date.now(), answers: all.length, M: Ms, R}, live ? {live} : {});
  }
  // Keeps a report under max characters of JSON (the sheet's cap): the oldest milestones lose their tables first (their
  // effects, verdicts and counts stay, for the convergence plots and the Overview).
  // The size is kept as a running total (each milestone's result measured once, again only when it changes, and the rest
  // of the report apart): measuring the whole report at every step made this quadratic (test-suite review, 2026-11-04:
  // 20 s for 300 milestones). J() is exactly JSON.stringify(rep).length.
  function compact(rep, max) {
    const len = {}, // JSON length of each milestone's '"M":{…}' entry in R
      measure = M => (len[M] = JSON.stringify(String(M)).length + 1 + JSON.stringify(rep.R[M]).length),
      shell = () => JSON.stringify(Object.assign({}, rep, {R: {}})).length; // the report with an empty R
    let sh = shell(),
      body = 0, // the entries of R, without the commas between them
      count = 0;
    Object.keys(rep.R).forEach(M => ((body += measure(M)), count++));
    const J = () => sh + body + Math.max(0, count - 1),
      drop = M => {
        if (M in len) {
          body -= len[M];
          count--;
          delete len[M];
        }
        delete rep.R[M];
      };
    // 1. the oldest milestones keep their effects only
    for (const M of rep.M.slice(0, -1)) {
      if (J() <= max) break;
      const r = rep.R[M];
      Object.keys(r.A).forEach(k => {
        const a = r.A[k];
        // what the plain reading needs stays: the typical values, and each format's own expected chance and guess rate
        // (Codex review #495: without them a lean milestone read its formats at 75% and 25%)
        r.A[k] = {n: a.n, players: a.players, thin: a.thin, err: a.err, typ: a.typ, effects: a.effects, lean: 1};
        // an interaction keeps its test, not its lines
        if (a.ix)
          r.A[k].ix = a.ix.map(t => ({k: t.k, ix: 1, df: t.df, W: t.W, n: t.n, fam: t.fam, p: t.p, pa: t.pa, v: t.v, need: t.need}));
        if (Array.isArray(a.table) && k === 'fmt') r.A[k].table = a.table.map(t => ({k: t.k, n: t.n, E: t.E, g0: t.g0}));
      });
      body -= len[M];
      body += measure(M);
    }
    // 2. still too big (hundreds of milestones; Codex review #441): every other older milestone goes, the first and the
    // last 5 stay, until it fits; then, if need be, only the latest
    while (J() > max && rep.M.length > 6) {
      const keep = new Set([rep.M[0], ...rep.M.slice(-5)]),
        old = rep.M.filter(M => !keep.has(M));
      old.filter((_, i) => i % 2 === 0).forEach(drop);
      rep.M = rep.M.filter(M => rep.R[M]);
      rep.thinned = (rep.thinned || 0) + 1;
      sh = shell();
    }
    if (J() > max) {
      const last = rep.M[rep.M.length - 1];
      rep.M.slice(0, -1).forEach(drop);
      rep.M = [last];
    }
    return rep;
  }

  const api = {
    AV,
    GAP,
    STEP,
    AN_SUBJ_SHEET,
    BOOT_MIN,
    FORMATS,
    ANALYSES,
    rng,
    solve,
    factor,
    lmm,
    glmm,
    outOf,
    fmtFit,
    guessOf,
    fmtOf,
    prep,
    milestones,
    boot,
    verdictOf,
    km,
    toMaster,
    masterCI,
    sessRows,
    sessDesc,
    TRUTH,
    shuffle,
    synth,
    DEMO_PLAYERS,
    demoLog,
    runAll,
    PRIMARY,
    ALPHA,
    FDR,
    BOOT,
    ntail,
    nq,
    pOf,
    holm,
    bh,
    correct,
    photoMeta,
    leftOut,
    fpOf,
    hashOf,
    report,
    compact,
    PLAIN,
    FMT_PLAIN,
    plainOf,
    shiftP,
    freqRatio,
    rt,
    zoom,
    photo,
    formats,
    confusions,
    learning,
    comeback,
    sessions,
    colCorr,
    entOf,
    hclust,
    cutTree,
    mixMap,
    MIX_CUT,
    PROF_F,
    PROF_N,
    PROF_MIN,
    profFeat,
    profiles,
    profRun,
    zOf,
    eigSym,
    cutK,
    silhouette,
    wrightOf,
    resOf,
    tdFeat,
    tdiff,
    chi2q,
    chi2inv,
    ixTest,
    zoomIx,
    confIx,
    missRows,
    lnIx,
    lnFit,
    gcurveOf,
    TD_K,
    TD_MIN
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ANALYSIS = api;
  // In a Web Worker (the admin's new Worker('analysis.js?v=N'), Recompute here, and the demo): a whole report per message.
  if (typeof window === 'undefined' && typeof module === 'undefined' && typeof root.postMessage === 'function')
    root.onmessage = e => {
      const {id, rows, meta, B, Bh, bse, seed, prev, live} = e.data || {};
      try {
        root.postMessage({
          id,
          res: report(rows, meta, prev, {B, Bh, bse, seed, live, progress: (M, k) => root.postMessage({id, prog: [M, k]})})
        });
      } catch (err) {
        root.postMessage({id, err: String((err && err.stack) || err)});
      }
    };
})(typeof self !== 'undefined' ? self : this);
