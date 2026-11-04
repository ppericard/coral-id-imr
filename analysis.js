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
  const AV = 2; // 2: each analysis carries its typical values (typ) for the plain reading (plainOf)
  const GAP = 30 * 60e3, // a new session after 30 minutes without an answer (model.js SESSION.GAP, admin HEALTH.GAP)
    STEP = 1000, // a milestone every 1000 answers (Pierre, 2026-11-04)
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

  // Bootstrap refits stop earlier (looser tolerance): their spread matters, not their fourth decimal.
  let FAST = false;

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
  // A column the data never moves (all zero in this sample) gets a ridge, so its coefficient stays 0, not huge.
  const ridge = (A, X) => A.map((r, i) => r.map((v, j) => v + (i === j && !X.some(x => x[i]) ? 1 : 0)));

  /* ---------- Random-effect factors ---------- */
  // keys[i]: the level of row i (a string), or a list of levels sharing the row (a question's photos, weight 1/m each).
  function factor(name, keys) {
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
        w.push(1 / K.length);
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
      tau2: 0
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
    return {b, se: V ? V.map((row, a) => Math.sqrt(Math.max(0, row[a]))) : b.map(() => NaN), V, s2, F, nz: nz(X)};
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
    const sc = () => {
      for (let i = 0; i < N; i++) {
        const s = sig(eta[i]),
          d = (1 - g[i]) * s * (1 - s),
          P = clamp(g[i] + (1 - g[i]) * s, 1e-9, 1 - 1e-9);
        S[i] = ((y[i] - P) * d) / (P * (1 - P));
        W[i] = (d * d) / (P * (1 - P)) + 1e-12;
      }
    };
    let H = null,
      it = 0;
    for (; it < (o.it || (FAST ? 60 : 200)); it++) {
      let move = 0;
      sc();
      H = X[0].map((_, a) => X[0].map((__, c) => 0));
      const gr = new Array(p).fill(0);
      for (let i = 0; i < N; i++)
        for (let a = 0; a < p; a++) {
          gr[a] += X[i][a] * S[i];
          for (let c = 0; c <= a; c++) H[a][c] += X[i][a] * X[i][c] * W[i];
        }
      for (let a = 0; a < p; a++) for (let c = 0; c < a; c++) H[c][a] = H[a][c];
      H = ridge(H, X).map((r, a) => r.map((v, c) => v + (a === c ? 1e-6 : 0)));
      const db = solve(H, gr).map(v => clamp(v, -2, 2));
      b = b.map((v, a) => v + db[a]);
      for (let i = 0; i < N; i++) for (let a = 0; a < p; a++) eta[i] += X[i][a] * db[a];
      move = Math.max(move, ...db.map(Math.abs));
      F.forEach(f => {
        sc();
        const gj = new Float64Array(f.n),
          hj = new Float64Array(f.n),
          hk = new Float64Array(f.n);
        // hj bounds the curvature of a level shared with others in a row (see lmm); hk is its own, for the variance.
        for (let i = 0; i < N; i++)
          for (let q = f.start[i]; q < f.start[i + 1]; q++)
            ((gj[f.lev[q]] += f.w[q] * S[i]), (hj[f.lev[q]] += f.w[q] * W[i]), (hk[f.lev[q]] += f.w[q] * f.w[q] * W[i]));
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
    }
    return {b, se: V ? V.map((row, a) => Math.sqrt(Math.max(0, row[a]))) : b.map(() => NaN), V, F, eta, nz: nz(X)};
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
    return {d, c, sd: Math.sqrt(Math.max(0, V[0][0])), sc: Math.sqrt(Math.max(0, V[1][1])) * c * (1 - c)};
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
  // quality 1-3, sharpness or null, source 'imr' | 'own' | 'inat' | 'book']} from the admin's data and curation.
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
      // A wrong answer is a miss for the genus given too (quiz.js: it counts against both genera, AGENTS.md rule 13), so
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
  // Milestones: the first 1000, 2000, … answers of the log (time order), and all of them.
  function milestones(n) {
    const L = [];
    for (let k = STEP; k <= n; k += STEP) L.push(k);
    if (!L.length || L[L.length - 1] !== n) L.push(n);
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
  // player drawn twice counted twice under two names. stat(rows) -> {key: number}. Returns {key: [2.5%, 97.5%]}.
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
        by.get(pl).forEach(a => S.push({...a, p: a.p + '#' + j}));
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
    const out = {};
    Object.entries(acc).forEach(([key, L]) => L.length >= Math.min(10, B / 2) && (out[key] = [q(L, 0.025), q(L, 0.975)]));
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
    let lo = Math.max(0, sd - Z * se),
      hi = sd + Z * se;
    if (bi && bi[key]) ((lo = Math.min(lo, bi[key][0])), (hi = Math.max(hi, bi[key][1])));
    // an SD is never below 0: "includes 0" = its lower bound under a tenth of the sesoi
    const e = {k: key, label, est: sd, lo, hi, unit, sesoi, n, sd: true, boot: !!(bi && bi[key])};
    if (lo > sesoi / 10) return Object.assign(e, {v: 'clear'});
    if (hi <= sesoi) return Object.assign(e, {v: 'margin'});
    return Object.assign(e, {
      v: 'thin',
      need: isFinite(hi) ? nice(n * ((hi - lo) / 2 / Math.max(sd, sesoi)) ** 2) : null,
      hw: Math.max(sd, sesoi)
    });
  }
  const players = D => new Set(D.map(a => a.p)).size;
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
    return {M, F};
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
    if (D.length < 100 || players(D) < 2) return thin(D.length, 100);
    const {M, F} = rtFit(D),
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
      player: lv(F[0], 1).sort((a, b) => b.u - a.u)
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
    return glmm(
      D.map(a => a.y),
      X,
      F,
      {off: Float64Array.from(D.map(a => a.x)), g: Float64Array.from(D.map(a => a.g0))}
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
      player: Object.values(by).sort((a, b) => b.z / b.n - a.z / a.n),
      views: Object.values(views)
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
        share(x => x[3] === 'inat' || x[3] === 'book'),
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
        x => (x[3] === 'book' ? 'inat' : x[3]),
        k => ({imr: 'IMR lecture', own: 'Pierre’s', inat: 'Other iNaturalist'})[k] || k
      ),
      quality: tab(
        x => x[1],
        k => ({3: 'Good', 2: 'Fair', 1: 'Poor'})[k] || k
      ),
      harder: L.slice(0, 8),
      easier: L.slice(-8).reverse()
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
    return {n: D.length, players: players(D), effects, table};
  }
  // The bootstrap of a difficulty is stored as the shift d; reported as -d (+ = harder).
  const remap = (bi, k) => (bi[k] ? {[k]: [-bi[k][1], -bi[k][0]]} : null);

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
        E.push({p: a.p, pair: [a.g, c].sort().join('|'), from: a.g, to: c, y: a.a === c ? 1 : 0, qv: a.qv, k: a.ch.length});
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
    const effects = CF_X.map(([k, l], j) => eff(k, l, M.b[j + 1], M.se[j + 1], bi, 'logit', 0.25, n, {rows: M.nz[j + 1]}));
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
    void X;
    return {n, mixed, players: players(E), typ: {p: mixed / n}, effects, pairs, player: plist.sort((a, b) => b.n - a.n)};
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
  function lnFit(D) {
    const X = D.map(a => [1, Math.log(1 + a.n), a.afterMiss, a.afterAgain, a.typed, a.exam, a.back]),
      F = [
        factor(
          'player',
          D.map(a => a.p)
        ),
        factor(
          'genus',
          D.map(a => a.g)
        )
      ];
    const M = glmm(
      D.map(a => a.y),
      X,
      F,
      {g: Float64Array.from(D.map(a => a.g0))}
    );
    return {M, F};
  }
  // Answers to reach MASTER: 0 when the start is already there, whatever the slope (Codex review #441); 999 = not
  // reached (a flat or falling slope below it).
  // 95% interval of the answers to MASTER from the joint uncertainty of the intercept and the slope (their covariance in
  // the fit, V: 2 x 2) and of the genus's own effect (u, its conditional variance cv): seeded draws (Codex review #441:
  // varying the slope alone gave [0, 0] for an intercept above the target whatever its own uncertainty).
  function masterCI(b0, b1, V, u = 0, cv = 0, seed = 1) {
    const R = rng(seed),
      nrm = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R()),
      a = Math.sqrt(Math.max(0, V[0][0])),
      c = a ? V[1][0] / a : 0,
      d = Math.sqrt(Math.max(0, V[1][1] - c * c)),
      L = [];
    for (let k = 0; k < 1000; k++) {
      const z1 = nrm(),
        z2 = nrm();
      L.push(toMaster(b0 + a * z1, b1 + c * z1 + d * z2, u + Math.sqrt(Math.max(0, cv)) * nrm()));
    }
    return [q(L, 0.025), q(L, 0.975)];
  }
  const toMaster = (b0, b1, u) => (b0 + u >= logit(MASTER) ? 0 : b1 > 0 ? clamp(Math.exp((logit(MASTER) - b0 - u) / b1) - 1, 0, 999) : 999);
  function learning(A, B, seed) {
    const D = A;
    if (D.length < 200) return thin(D.length, 200);
    const {M, F} = lnFit(D),
      n = D.length,
      bi = boot(
        D,
        S => {
          const r = lnFit(S),
            o = {};
          LN_X.forEach(([k], j) => (o[k] = r.M.b[j + 1]));
          o.n_all = toMaster(r.M.b[0], r.M.b[1], 0);
          r.F[1].L.forEach((g, j) => (o['n:' + g] = toMaster(r.M.b[0], r.M.b[1], r.F[1].u[j])));
          return o;
        },
        B,
        seed
      );
    const effects = LN_X.map(([k, l], j) =>
      eff(k, l, M.b[j + 1], M.se[j + 1], bi, 'logit', k === 'slope' ? 0.1 : 0.25, n, {rows: M.nz[j + 1]})
    );
    // Not in the answer log: the first-meeting card and the side-by-side comparison leave no row (ROADMAP).
    effects.push({k: 'card', label: 'First-meeting card', v: 'nolog', n});
    effects.push({k: 'side', label: 'Side-by-side comparison', v: 'nolog', n});
    const G = F[1],
      cnt = {};
    D.forEach(a => {
      const c = (cnt[a.g] = cnt[a.g] || {n: 0, p: new Set(), y: 0});
      c.n++;
      c.p.add(a.p);
      c.y += a.y;
    });
    const V2 = [
      [M.V[0][0], M.V[0][1]],
      [M.V[1][0], M.V[1][1]]
    ];
    const genus = G.L.map((g, j) => {
      const est = toMaster(M.b[0], M.b[1], G.u[j]),
        sdu = Math.sqrt(G.cv[j]);
      let [lo, hi] = masterCI(M.b[0], M.b[1], V2, G.u[j], G.cv[j], j + 1);
      void sdu;
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
    return {n, players: players(D), typ: typOf(D), effects, genus, curve, b0: M.b[0], b1: M.b[1]};
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
  function sessions(A, B, seed) {
    if (A.length < 100) return thin(A.length, 100);
    const {rows, lens} = sessRows(A),
      ends = sum(rows.map(r => r.y));
    if (ends < 10) return thin(rows.length, 100, {sessions: lens.length});
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
      at: [5, 10, 20, 40, 80].map(k => ({k, s: at(k)}))
    };
  }

  /* ---------- Synthetic answer logs with known effects (the tests and the admin demo) ---------- */
  // TRUTH: the effects the generator plays with; the tests check that the fits give them back.
  const TRUTH = {
    rt: {b0: 1.6, right: -0.35, typed: 0.4, enl: 0.6, two: -0.1, sdPlayer: 0.3, sdGenus: 0.15, sdPhoto: 0.2, sdRes: 0.45},
    ph: {medium: 0.3, macro: 0.7, fair: 0.25, poor: 0.7, sharp: -0.25, own: 0, inat: 0.35, alone: 0.5, sdPhoto: 0.3},
    learn: {b0: -0.3, slope: 0.55, afterMiss: -0.3, again: 0.4},
    fmt: {k2: [0.4, 0], typed: [0, -0.6], again: [0.5, 0.2]}, // [true guess rate, extra ease (logit, - = harder)]
    zoom: 0.3,
    back: -0.3,
    sess: {b0: -3.3, wrong: 0.5, streak: 0.6}
  };
  // o: {players: [[id, ability, answers, enlarge rate]], photos: {genus: [{f, v, q, sh, src}]}, look: {genus: [genera]},
  // start, end (ms), seed}. Returns readAnswers rows (Code.gs answers_ shape, id as given).
  function synth(o) {
    const R = rng(o.seed || 7),
      T = TRUTH,
      nrm = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R()),
      pick = L => L[Math.floor(R() * L.length)],
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
        rph[p.f] = nrm() * T.rt.sdPhoto;
      })
    );
    const rows = [],
      span = (o.end || Date.now()) - (o.start || 0);
    o.players.forEach(([id, th, nAns, enl], pi) => {
      const rp = nrm() * T.rt.sdPlayer,
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
            T.learn.slope * Math.log(1 + s.n) +
            (s.miss && f !== 'again' ? T.learn.afterMiss + (s.again ? T.learn.again : 0) : 0) +
            (s.last ? T.back * Math.log(1 + days) : 0),
          [cg, ez] = T.fmt[f] || [f === 'qduel' ? 0.5 : 0.25, 0],
          z = R() < enl * (p.v === 'wide' ? 1.5 : 0.6) ? 1 : 0,
          e2 = eta + ez + (z ? T.zoom : 0),
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
          E = app + (1 - app) * sig(eta + nrm() * 0.1),
          ans = right ? g : f === 'typed' ? (R() < 0.5 ? '' : pick(G)) : pick(ch.slice(1)),
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
          ch.sort(() => R() - 0.5).join(' '),
          0,
          Math.round(clamp(sec, 0.5, 600) * 10) / 10,
          z
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
      diff: {name: 'A question the app rates harder (73% → 50% expected right)', o: 'time'},
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
        name: 'An “Again” question right after the miss (its extra effect)',
        o: 'right',
        up: '“Again” after a miss helps: keep it.',
        down: '“Again” after a miss does not help: reconsider it.'
      },
      typed: {name: 'Answers typed instead of picked from choices', o: 'right'},
      exam: {name: 'Mastery exam questions instead of ordinary ones', o: 'right'},
      back: {name: 'Comeback questions after a break instead of ordinary ones', o: 'right'},
      card: {name: 'The first-meeting card', o: 'right'},
      side: {name: 'The side-by-side comparison', o: 'right'}
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
      diff: {name: 'After a question the app rates harder (73% → 50% expected right)', o: 'stop'},
      slow: {name: 'After a slow answer (twice the player’s usual time)', o: 'stop', s: LN2},
      pos: {
        name: 'Later in a session: after the 40th answer against the 10th',
        o: 'stop',
        s: LN4,
        up: 'Players tire as a session goes on.'
      }
    }
  };
  // Question formats: one entry per format and part (guess rate, difficulty, right − expected).
  Object.keys(FMT_PLAIN).forEach(k => {
    const F = FMT_PLAIN[k];
    PLAIN.fmt = PLAIN.fmt || {};
    PLAIN.fmt['g_' + k] = {name: `${F}: success of a pure guess`, o: 'guess', fmt: k, cal: true};
    PLAIN.fmt['d_' + k] = {name: `${F}: easier or harder than the app expects`, o: 'right', inv: true, fmt: k, cal: true};
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
    const out = {name: P.name, verdict: PLAIN_VERDICT[e.v] || '', tone: 'thin', dir: '', text: '', range: '', advice: '', scale: 'p'};
    if (e.v === 'none' || e.v === 'nolog' || e.est == null || !isFinite(e.est)) {
      out.text = e.v === 'nolog' ? 'It leaves no row in the answer log, so it cannot be measured yet.' : 'No such answers yet.';
      return out;
    }
    const s = P.s || 1,
      sg = P.inv ? -1 : 1,
      g = P.o === 'right' ? T.g : 0,
      fin = v => v != null && isFinite(v);
    // A spread between players, genera, photos or pairs: the typical range, one spread either side of the average.
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
    else ((base = T.p), (at = v => shiftP(T.p, g, sg * s * v)), (f = pctOf));
    const val = at(e.est),
      a1 = fin(e.lo) ? at(e.lo) : null,
      a2 = fin(e.hi) ? at(e.hi) : null,
      lo = a1 == null || a2 == null ? null : Math.min(a1, a2),
      hi = a1 == null || a2 == null ? null : Math.max(a1, a2),
      up = val > base,
      dir = val === base ? '' : up ? 'up' : 'down';
    Object.assign(out, {base, val, lo, hi, dir});
    out.range = lo == null ? '' : `between ${f(lo)} and ${f(hi)}`;
    let say;
    if (P.o === 'time') say = `${up ? 'Slower' : 'Faster'}: about ${f(val)} instead of ${f(base)}`;
    else if (P.o === 'stop')
      say = `${up ? 'More' : 'Less'} likely to stop: a ${f(val)} chance to end the session after it, instead of ${f(base)}`;
    else if (P.o === 'mix')
      say = `Mixed up ${up ? 'more' : 'less'} often: a wrong genus picked ${f(val)} of the times it is offered, instead of ${f(base)}`;
    else if (P.o === 'pts') say = `Players do ${up ? 'better' : 'worse'} than the app expects: ${f(val)} of right answers`;
    else if (P.o === 'guess') say = `About ${f(val)} right by pure guessing; the app assumes ${f(base)}`;
    else if (P.cal) say = `${up ? 'Easier' : 'Harder'} than the app expects: about ${f(val)} right where it expects ${f(base)}`;
    else say = `More likely ${up ? 'right' : 'wrong'}: about ${f(val)} right instead of ${f(base)}`;
    if (e.v === 'clear') {
      out.tone = P.cal || P.o === 'time' || P.o === 'guess' ? 'info' : (P.o === 'stop' || P.o === 'mix') === up ? 'bad' : 'good';
      out.text = say + '.';
      out.advice = (up ? P.up : P.down) || (P.o === 'guess' ? `The app’s guess rate for this format could be about ${f(val)}.` : '');
    } else {
      const ref = P.o === 'pts' ? 'the app’s expectation' : f(base);
      if (e.v === 'margin') ((out.tone = 'none'), (out.text = `No clear effect: if any, it is small (${out.range} against ${ref}).`));
      else out.text = `Too early to tell: ${out.range ? out.range + ' against ' + ref : 'too uncertain to say'}.`;
    }
    return out;
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
    ['sess', 'Sessions', sessions]
  ];
  // rows: the answer log (readAnswers rows); M: how many of its answers (time order) this milestone takes; B: bootstrap
  // draws. progress(key) is called as each analysis finishes.
  function runAll(rows, meta = {}, o = {}) {
    const all = (rows || []).slice().sort((a, b) => a[1] - b[1]),
      M = o.M || all.length,
      A = prep(all.slice(0, M), meta),
      out = {AV, M, n: A.length, players: players(A), at: A.length ? A[A.length - 1].t : 0, A: {}};
    ANALYSES.forEach(([k, , fn], i) => {
      const t0 = Date.now();
      try {
        out.A[k] = fn(A, o.B == null ? 40 : o.B, (o.seed || 1) + i * 7919, meta);
      } catch (e) {
        out.A[k] = {err: String((e && e.message) || e), effects: []};
      }
      out.A[k].ms = Date.now() - t0;
      if (o.progress) o.progress(k);
    });
    return out;
  }
  // Effects that became clear at this milestone (not clear at the previous one): the "new" marks.
  function newly(cur, prev) {
    const out = new Set();
    if (!cur || !prev) return out;
    Object.entries(cur.A).forEach(([a, R]) =>
      (R.effects || []).forEach(e => {
        const p = ((prev.A[a] || {}).effects || []).find(x => x.k === e.k);
        if (e.v === 'clear' && (!p || p.v !== 'clear')) out.add(a + ':' + e.k);
      })
    );
    return out;
  }

  /* ---------- Photo features, from the public files (the same for the workflow and the admin) ---------- */
  // {file: [view, quality 1-3, sharpness or null, source]}: the view after Pierre's moves and adds (curation.json), his
  // quality rating else the automatic one (quality.json; an IMR lecture photo is never rated Poor automatically, as the
  // app's autoQ), the sharpness of metrics.json, and the source (IMR lecture, Pierre's, other iNaturalist, CF book).
  function photoMeta(data, cur, qual, met, core) {
    const out = {},
      C = (cur && cur.genera) || {},
      CQ = (cur && cur.quality) || {},
      AQ = (qual && qual.q) || {},
      MT = (met && met.m) || {},
      src = p => (p.cf ? 'book' : p.imr || /^imrl?-/.test(p.f) ? 'imr' : p.own ? 'own' : 'inat');
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

  // rows: the whole answer log; prev: the stored report (or null); o: {B, seed, progress, now}. Returns {AV, made,
  // answers, M: [milestones], R: {milestone: result}}; a result carries its fingerprint fp.
  function report(rows, meta, prev, o = {}) {
    const all = (rows || []).slice().sort((a, b) => a[1] - b[1]),
      Ms = milestones(all.length),
      mh = hashOf(meta && meta.ph),
      R = {};
    Ms.forEach(M => {
      const fp = fpOf(all, M, mh),
        old = prev && prev.AV === AV && prev.R && prev.R[M];
      if (old && old.fp === fp) R[M] = old;
      else {
        R[M] = runAll(all, meta, {M, B: o.B, seed: o.seed, progress: o.progress && (k => o.progress(M, k))});
        R[M].fp = fp;
      }
    });
    return {AV, made: o.now || Date.now(), answers: all.length, M: Ms, R};
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
    BOOT_MIN,
    FORMATS,
    ANALYSES,
    rng,
    solve,
    factor,
    lmm,
    glmm,
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
    TRUTH,
    synth,
    DEMO_PLAYERS,
    demoLog,
    runAll,
    newly,
    photoMeta,
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
    sessions
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ANALYSIS = api;
  // In a Web Worker (the admin's new Worker('analysis.js?v=N'), Recompute here, and the demo): a whole report per message.
  if (typeof window === 'undefined' && typeof module === 'undefined' && typeof root.postMessage === 'function')
    root.onmessage = e => {
      const {id, rows, meta, B, seed, prev} = e.data || {};
      try {
        root.postMessage({id, res: report(rows, meta, prev, {B, seed, progress: (M, k) => root.postMessage({id, prog: [M, k]})})});
      } catch (err) {
        root.postMessage({id, err: String((err && err.stack) || err)});
      }
    };
})(typeof self !== 'undefined' ? self : this);
