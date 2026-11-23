  // Who rates the photos and the confusions, as tools/sync/Code.gs trusted_: players, devices that never signed in
  // included, with TRUST.N answers or more and a right rate clearly above chance (one-sided z of at least TRUST.Z
  // against each question's guess rate).
  const TRUST = {N: 10, Z: 1.645}; // answers per player, not per photo
  // As Code.gs guess_: without |kN, a photo-quiz question with 2 or 3 genera in its choices (readAnswers row index 10) is
  // rated with 1 / choices ("Again: A or B?", logged as plain "quiz" in the oldest rows).
  // A typed answer (|t: the player types the name instead of picking a choice) has no guess rate: nothing to pick from,
  // so the expected success has no 1/k floor (model.js TYPED.k).
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
  // Question formats (analysis.js FORMATS, whose fmtOf this is: tests/analysis.test.js checks both agree), from the mode
  // quiz.js logs and the number of choices shown: typed (|t), the Duel tab (quiz-duel…), a look-alike duel in the quiz
  // (|d), a Find the X (|f: one name, four photos; its own offset, the one its photo is aimed with, quiz.js planFind),
  // an exam question (|x), "Again: A or B?" (2 choices), 4 shown of which 3 or 2 plausible (|k3, |k2), 4 plausible.
  function fmtOf(m, nch) {
    m = String(m || '');
    if (TYPED_RE.test(m)) return 'typed';
    if (m.indexOf('quiz-duel') === 0) return 'duel';
    if (/\|d(\||$)/.test(m)) return 'qduel';
    if (/\|f(\||$)/.test(m)) return 'find';
    if (/\|x(\||$)/.test(m)) return 'exam';
    if (nch === 2) return 'again';
    const k = /\|k(\d)/.exec(m);
    return k && Number(k[1]) < 4 ? (Number(k[1]) >= 3 ? 'k3' : 'k2') : 'k4';
  }
  // A 2-choice contrast of a look-alike pair (docs/LEARNING.md "One contrast queue": the Again after a mix-up and the
  // duels slipped into the quiz are one kind of question, the Duel tab's too), from its mode and its number of choices:
  // the formats duel, qduel and again of a quiz answer (fmtOf; a live answer is none). A right one counts for the duel
  // achievement (s.du), in the game (quiz.js recordAnswer) and in the replay (replayProgress).
  const contrastQ = (m, nch) => /^quiz/.test(String(m || '')) && ['duel', 'qduel', 'again'].includes(fmtOf(m, nch));
  // Per-format offsets (docs/LEARNING.md "Per-format offsets"): each format f gets an offset d_f in logits on the app's
  // log-odds, P(right) = 1/k + (1 - 1/k) sig(ability - difficulty + d_f), the guess rate staying 1/k. Fitted by the
  // sheet (Code.gs stats_, ?stats=1 fmt, served {format: [offset, answers]}) on the trusted answers and their logged e,
  // by Newton's method under a prior N(0, FMT.SD^2), for a format with FMT.N answers or more; a format absent counts 0
  // (fmtOff). The logged e stays the app's expectation before the offset.
  const FMT = {N: 20, SD: 1};
  function fmtOffsetsOf(rows) {
    const trust = trustOf(rows),
      by = {};
    rows.forEach(r => {
      const p = trust[r[0]] && r[2] ? fmtPoint(r[5], r[7], r[10], r[4]) : null;
      if (p) (by[p[0]] = by[p[0]] || []).push(p.slice(1));
    });
    return fmtFit(by);
  }
  // One answer's point for the fit (fmtOffsetsOf), its player trusted and its unit shown: [format, e, g, right 0|1], null
  // when it is no quiz question or has no logged expectation e. m: its mode, ch: its choices (space-separated). Code.gs
  // collects the same points as it folds the answer log a few rows at a time (statsStep_) and fits them with fmtFit.
  function fmtPoint(m, e, ch, ok) {
    m = String(m || '');
    if (m.indexOf('quiz') !== 0 || typeof e !== 'number' || !isFinite(e)) return null;
    const n = String(ch || '')
      .split(/\s+/)
      .filter(Boolean).length;
    return [fmtOf(m, n), e, guessOf(m, ch), ok ? 1 : 0];
  }
  // The fit itself over {format: [[e, g, right], ...]}, the points in log order: {format: [offset, answers]} for each
  // format with FMT.N points or more.
  function fmtFit(by) {
    const out = {},
      sg = x => 1 / (1 + Math.exp(-x));
    Object.keys(by).forEach(f => {
      const L = by[f].map(([e, g, y]) => {
        const q = Math.min(0.99, Math.max(0.01, g < 1 ? (e - g) / (1 - g) : 0.5));
        return [Math.log(q / (1 - q)), g, y];
      });
      if (L.length < FMT.N) return;
      let d = 0;
      for (let it = 0; it < 50; it++) {
        let gr = -d / FMT.SD ** 2,
          h = 1 / FMT.SD ** 2;
        L.forEach(([x, g, y]) => {
          const s = sg(x + d),
            p = Math.min(1 - 1e-9, Math.max(1e-9, g + (1 - g) * s)),
            j = (1 - g) * s * (1 - s);
          gr += ((y - p) / (p * (1 - p))) * j;
          h += (j * j) / (p * (1 - p));
        });
        const st = Math.min(1, Math.max(-1, gr / h));
        d += st;
        if (Math.abs(st) < 1e-6) break;
      }
      out[f] = [Math.round(d * 100) / 100, L.length];
    });
    return out;
  }
  // The offset of a question's format, from the sheet's fmt ({} or null with an older sheet: 0); f a format key (fmtOf).
  const fmtOff = (F, f) => {
    const o = F && F[f];
    return Array.isArray(o) && typeof o[0] === 'number' && isFinite(o[0]) ? o[0] : 0;
  };
  // The per-format offsets of a ?stats=1 reply (fmt; the sheet replays with them too), {} when it has none.
  const fmtsOf = j => (j && j.fmt && typeof j.fmt === 'object' ? j.fmt : {});
  // How sure a player's level is (a level from 35 answers at 97% right must not read above one from 245): {player id:
  // 95% margin, in level units}, 1.96 / sqrt(Fisher information) gathered on the same replay as the level itself
  // (eloReplay, Code.gs stats_ ras): a near-sure success tells little, so a run of easy right answers keeps it wide.
  // A player's right rate in the photo quiz apart from the Duel tab (31 duels on one chosen pair, 2 choices each, can
  // make 89% in the quiz read as 95%): per anonymous id, [answers, right] in the quiz (mode
  // quiz or quiz|…, duels slipped into the quiz included), in its last 50, and in the Duel tab (quiz-duel…). Other
  // games are in neither. rows: readAnswers rows [id, t, shown, answered, ok, mode, …].
  function playSplit(rows) {
    const out = Object.create(null); // by player, no prototype (trustOf)
    (rows || [])
      .slice()
      .sort((a, b) => a[1] - b[1])
      .forEach(r => {
        const m = String(r[5] || ''),
          o = (out[r[0]] = out[r[0]] || {q: [0, 0], d: [0, 0], L: []});
        if (m.startsWith('quiz-duel')) (o.d[0]++, (o.d[1] += r[4] ? 1 : 0));
        else if (m === 'quiz' || m.startsWith('quiz|')) (o.q[0]++, (o.q[1] += r[4] ? 1 : 0), o.L.push(r[4] ? 1 : 0));
      });
    Object.values(out).forEach(o => {
      const L = o.L.slice(-50);
      o.q50 = [L.length, L.reduce((t, x) => t + x, 0)];
      delete o.L;
    });
    return out;
  }
  function levelMargin(rows) {
    const {R} = eloReplay(rows || []);
    return Object.fromEntries(Object.entries(R).map(([k, r]) => [k, r[2] > 0 ? 1.96 / Math.sqrt(r[2]) : Infinity]));
  }
  // Keyed by player (names lower-cased in the sheet, anonymous ids in the admin), with no prototype: a player named
  // constructor or __proto__ is an entry like any other, never Object's member.
  function trustOf(rows) {
    const T = Object.create(null),
      out = Object.create(null);
    rows.forEach(r => {
      if (!r[0]) return;
      const t = (T[r[0]] = T[r[0]] || [0, 0, 0, 0, 0]),
        g = guessOf(r[5], r[10]);
      t[0]++;
      t[1] += r[4] ? 1 : 0;
      t[2] += g;
      t[3] += g * (1 - g);
      if (r[11]) t[4] = 1;
    });
    Object.keys(T).forEach(w => {
      const t = T[w];
      out[w] = t[0] >= TRUST.N && (t[1] - t[2]) / Math.sqrt(t[3]) >= TRUST.Z;
    });
    return out;
  }

  // How much one answer moves the photos, as Code.gs PHOTO_W: weight n / (n + N) after n answers of the player.
  // NEW and KNOWN: a fixed memory rule (a photo new to the player 0.5 harder, one right twice before 1 easier), the prior
  // of the estimated photo memory below (MEM).
  const PHOTO_W = {N: 10, NEW: 0.5, KNOWN: -1};
  // Every player starts as a beginner (Code.gs PLAYER0): about 45% right on an average photo with 4 choices.
  const PLAYER0 = -1;
  // Photo memory (docs/LEARNING.md "Photo memory"), one rule for the sheet, the admin and the app: an answer on a photo
  // is expected easier by an offset (logits subtracted from its difficulty) by the player's history with it, [times
  // shown, times right] (H in the replay, s.ps in the app): bucket 0 new (the reference, 0), 1 shown but never right, 2
  // right once, 3 right twice or more (memBucket); a question takes the mean offset of its photos (memFam). Estimated
  // in the replay with the photos (eloReplay, Code.gs stats_) under the prior MEM.PRIOR, weighing MEM.N answers; served
  // as mem (memn: the answers behind each bucket); the prior without it (memOf).
  const MEM = {N: 10, PRIOR: [0, -PHOTO_W.NEW, -PHOTO_W.NEW, PHOTO_W.KNOWN - PHOTO_W.NEW]};
  const memBucket = h => (!h || !h[0] ? 0 : !h[1] ? 1 : h[1] === 1 ? 2 : 3);
  const memFam = (hs, mem) => (hs.length ? hs.reduce((t, h) => t + mem[memBucket(h)], 0) / hs.length : 0);
  // The offsets of a ?stats=1 reply (mem), or the prior when it has none.
  const memOf = m =>
    Array.isArray(m) && m.length === 4 && m.every(x => typeof x === 'number' && isFinite(x)) ? m.slice() : MEM.PRIOR.slice();
  // Fisher information of one answer at ability - difficulty x with k choices; the prior's weight is MEM.N of them at
  // x = 1 with 4 choices (about 80% right), 0.135 each.
  const infoAt = (x, k) => {
    const s = 1 / (1 + Math.exp(-x)),
      p = 1 / k + (1 - 1 / k) * s;
    return ((1 - 1 / k) * s * (1 - s)) ** 2 / (p * (1 - p));
  };
  // Hierarchical photo Elo (docs/LEARNING.md "Hierarchical photo Elo"): a photo's difficulty is its
  // genus's offset plus its own residual, the player rule "global level + genus" (Pelánek et al. 2017) applied to the
  // photos. Both move on every trusted answer by the same surprise: the residual as the photo rating always did, the
  // genus offset by GENUS_K / (1 + its weighed answers / 10), the photos' damping form. A photo nobody has answered starts
  // at its genus's offset instead of 0. GENUS_K 0.4: on the real answer log, replayed with each answer scored before it
  // moves anything, 0.2 and 0.4 both beat a photo-only Elo and the Easy / Medium / Hard prior, 0.8 moves too fast.
  // Code.gs GENUS_K in step; ?stats=1 serves the offsets as gd, the photos' ratings as totals.
  const GENUS_K = 0.4;
  // The photo's time term (docs/LEARNING.md "The photo's time term", which gives each step and constant;
  // docs/decisions/2026-11-21-photo-time-term.md): how much longer than their own habit trusted players take to answer
  // a photo right (z: right, timed, not typed, not enlarged answers, each weighed by trust over V(L), the variance of z
  // at the player's level), and how much more often than their own habit they enlarge it, each a shrunk mean per photo,
  // served by the sheet with the photo ratings (ptimeInto) and added to the photo's difficulty in the app (model.js
  // photoDiff) as C x (the two terms) x I0 / (I + I0), fading as the photo's rating gathers information I. One code
  // path for every subject.
  const PTIME = {CLIP: 1, FN: 5, V0: 0.3, VN: 20, MIN_P: 5, MIN_N: 500, BMAX: Math.log(3), TAU2: 0.06, E0: 0.1, EM: 10, NE: 10, C: 0.5};
  // The format cell of an answer for its time: the game (the mode before its first |), fmtOf, the photos shown (1, 2, 3+)
  // and the rank asked (a fish genus question is slower than a family one).
  const fmtCell = (m, nch, nph, rk) =>
    String(m || '').split('|')[0] + ':' + fmtOf(m, nch) + ':' + Math.min(3, nph) + ':' + String(rk || '');
  // An empty state: Z per player {r: their timed right answers as rtAdd keeps times, e: [answers with Enlarged, enlarged]}, F per
  // format cell [sum z, answers], A the fit's sums [n, sum L, sum L^2, sum y, sum L y] (y = z^2) and Q the same per player,
  // P per photo [sum w z / V, sum w / V, sum w (enlarged - rate), sum w, information].
  const ptimeNew = () => ({
    Z: Object.create(null),
    F: Object.create(null),
    A: [0, 0, 0, 0, 0],
    Q: Object.create(null),
    P: Object.create(null)
  });
  // The slope of the variance on the level, relative to its mean, shrunk by its cluster-robust standard error.
  function ptimeBeta(T) {
    const [n, sl, sll, sy, sly] = T.A,
      ks = Object.keys(T.Q),
      det = n * sll - sl * sl;
    if (ks.length < PTIME.MIN_P || n < PTIME.MIN_N || !(det > 1e-9) || !(sy > 0)) return 0;
    const a = (sll * sy - sl * sly) / det,
      b = (n * sly - sl * sy) / det,
      i0 = -sl / det,
      i1 = n / det;
    let v = 0;
    ks.forEach(k => {
      const q = T.Q[k],
        g = i0 * (q[3] - a * q[0] - b * q[1]) + i1 * (q[4] - a * q[1] - b * q[2]);
      v += g * g;
    });
    v *= ks.length / (ks.length - 1);
    return b === 0 ? 0 : (b * Math.max(0, 1 - v / (b * b))) / (sy / n);
  }
  // V(L), the variance of z at level L by the fit so far.
  function ptimeVar(T, L) {
    const [n, sl, , sy] = T.A,
      vb = (sy + PTIME.V0 * PTIME.VN) / (n + PTIME.VN);
    if (!n) return vb;
    const x = ptimeBeta(T) * (L - sl / n);
    return vb * Math.exp(Math.max(-PTIME.BMAX, Math.min(PTIME.BMAX, x)));
  }
  // One answer: w the player's key, fs its photos, m its mode, nch its number of choices, rk the rank asked, ok, sec its
  // seconds (null when none), zm Enlarged (0, 1, null when not logged), L the player's rating before it, rt whether it
  // rates the photos, wt its trust weight, inf its Fisher information ((1 - g) s (1 - s))^2 / (e (1 - e)). Code.gs
  // statsStep_ and eloReplay.
  function ptimeStep(T, {w, fs, m, nch, rk, ok, sec, zm, L, rt, wt, inf}) {
    const Zp = (T.Z[w] = T.Z[w] || {r: {}, e: [0, 0]}),
      len = fs.length,
      ph = rt ? fs.map(f => (T.P[f] = T.P[f] || [0, 0, 0, 0, 0])) : [],
      x = rtTenths(sec, TYPED_RE.test(String(m || '')) ? Infinity : 1),
      md = x > 0 ? rtMedian(Zp.r) : null;
    ph.forEach(p => (p[4] += (wt * inf) / (len * len)));
    if (rt && ok && md !== null && zm !== 1) {
      const z = Math.log(x / 10) - md,
        c = fmtCell(m, nch, len, rk),
        F = (T.F[c] = T.F[c] || [0, 0]),
        zh = Math.max(-PTIME.CLIP, Math.min(PTIME.CLIP, z - F[0] / (F[1] + PTIME.FN))),
        u = wt / ptimeVar(T, L) / len;
      ph.forEach(p => ((p[0] += u * zh), (p[1] += u)));
      const q = (T.Q[w] = T.Q[w] || [0, 0, 0, 0, 0]),
        y = zh * zh;
      [T.A, q].forEach(s => ((s[0] += 1), (s[1] += L), (s[2] += L * L), (s[3] += y), (s[4] += L * y)));
      F[0] += z;
      F[1]++;
    }
    if (zm === 0 || zm === 1) {
      const r = (Zp.e[1] + PTIME.E0 * PTIME.EM) / (Zp.e[0] + PTIME.EM);
      ph.forEach(p => ((p[2] += (wt * (zm - r)) / len), (p[3] += wt / len)));
      Zp.e[0]++;
      Zp.e[1] += zm;
    }
    if (x > 0 && ok && zm !== 1) Zp.r[x] = (Zp.r[x] || 0) + 1;
  }
  // The terms per photo: {photo: [time term, enlargement term, information]}, for the photos with either term not 0 to two
  // decimals (a photo left out counts 0). ?stats=1 serves them as the 6th to 8th elements of the photo's entry in photos
  // (ptimeInto), so a photo with no term keeps its five and the reply grows by a few bytes a photo.
  const ptR2 = v => Math.round(v * 100) / 100 || 0;
  // A photo's time term in the state T, as served (0 for a photo without answers).
  const ptimeTerm = (T, f) => {
    const p = T.P[f];
    return p && p[1] > 0 ? ptR2(p[0] / (p[1] + 1 / PTIME.TAU2)) : 0;
  };
  function ptimeOut(T) {
    const out = {};
    Object.keys(T.P).forEach(f => {
      const p = T.P[f],
        a = ptimeTerm(T, f),
        b = ptR2(p[3] > 0 ? p[2] / (p[3] + PTIME.NE) : 0);
      if (a || b) out[f] = [a, b, ptR2(p[4])];
    });
    return out;
  }
  // The terms appended to the served photo entries (photos: {file: [difficulty, weighed answers, weighed right, answers,
  // unit]}, changed in place).
  function ptimeInto(photos, T) {
    const o = ptimeOut(T);
    Object.keys(o).forEach(f => {
      if (Array.isArray(photos[f]) && photos[f].length === 5) photos[f].push(...o[f]);
    });
    return photos;
  }
  // A photo's time term in logits, as the app adds it to its difficulty (model.js photoDiff): C (time + enlargement) x
  // I0 / (I + I0); o a tm entry (none: 0), W the photo prior's weight in answers (model.js PDIFF.W).
  const ptimeOff = (o, W) =>
    Array.isArray(o) && o.length >= 3 && o.slice(0, 3).every(v => typeof v === 'number' && isFinite(v)) && o[2] >= 0
      ? (PTIME.C * (o[0] + o[1]) * W * infoAt(1, 4)) / (o[2] + W * infoAt(1, 4))
      : 0;
  // A question's time term for the player's side (rtWeight ti; docs/LEARNING.md "The player's time net of the photo's"):
  // the mean over its photos fs of each one's time term at(f), the first of the three served numbers (a photo without
  // one: 0), in log seconds as z; neither C, the fade nor the enlargement term (they turn the terms into a difficulty).
  // Rounded to 3 decimals as the scoring record keeps it (scoreRec i).
  function ptimeQ(fs, at) {
    const v = (fs || []).map(f => {
      const x = at(f);
      return typeof x === 'number' && isFinite(x) ? x : 0;
    });
    return v.length ? Math.round((v.reduce((t, x) => t + x, 0) / v.length) * 1000) / 1000 || 0 : 0;
  }
  // The time term of photo f in ?stats=1 photos (the 6th number of its entry, ptimeInto; none: 0).
  const ptimeAt = photos => f => {
    const o = photos && Object.prototype.hasOwnProperty.call(photos, f) ? photos[f] : null;
    return Array.isArray(o) && o.length >= 6 ? o[5] : 0;
  };
  // Photo Elo replayed over the answer log (rows [id, time ms, genus shown, answered, right 0|1, mode, photos…]), as
  // tools/sync/Code.gs stats_ does in the sheet: keep the two in step (tests/core.test.js compares them;
  // docs/LEARNING.md "Photo memory"). Every answer moves the player's level; the photos and the memory offsets move on
  // trusted players' answers only (trustOf), all against the same expectation, photo memory included. Returns the photo
  // ratings P ([rating, weighed answers, weighed right, answers]), PG (each photo's genus: every photo of a question is
  // of the genus shown, rule P4), the genus offsets G ([offset, weighed answers]), the player levels R ([level,
  // answers, information]), mem (rounded as served) and memn (a question with several photos shares its answer between
  // their buckets). on (optional, tools/abilityeval.js +P): called with each row and the time terms' state TM before
  // the row moves them (ptimeTerm).
  function eloReplay(rows, on) {
    const P = {},
      PG = {},
      G = {},
      R = Object.create(null), // by player, no prototype (trustOf)
      H = {},
      trust = trustOf(rows),
      mem = MEM.PRIOR.slice(),
      I = [0, 0, 0, 0],
      N = [0, 0, 0, 0],
      tau = MEM.N * infoAt(1, 4),
      TM = ptimeNew(),
      sig = x => 1 / (1 + Math.exp(-x));
    rows
      .slice()
      .sort((a, b) => a[1] - b[1])
      .forEach(r => {
        const fs = r[6].split(/\s+/).filter(Boolean);
        if (!r[0] || !fs.length) return;
        const ok = r[4] ? 1 : 0,
          g = guessOf(r[5], r[10]),
          ra = (R[r[0]] = R[r[0]] || [PLAYER0, 0]);
        const gs = String(r[2] || ''),
          go = (G[gs] = G[gs] || [0, 0]),
          ph = fs.map(f => ((PG[f] = gs), (P[f] = P[f] || [0, 0, 0, 0]))),
          b = go[0] + ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0);
        const hs = fs.map(f => (H[r[0] + '|' + f] = H[r[0] + '|' + f] || [0, 0])),
          s = sig(ra[0] - b - memFam(hs, mem)),
          e = g + (1 - g) * s,
          d = ok - e,
          n = ra[1];
        if (on) on(r, TM);
        ptimeStep(TM, {
          w: r[0],
          fs,
          m: r[5],
          nch: String(r[10] || '')
            .split(/\s+/)
            .filter(Boolean).length,
          rk: String(r[18] || ''),
          ok,
          sec: typeof r[12] === 'number' && isFinite(r[12]) ? r[12] : null,
          zm: r[13] === 0 || r[13] === 1 ? r[13] : null,
          L: ra[0],
          rt: !!trust[r[0]],
          wt: n / (n + PHOTO_W.N),
          inf: ((1 - g) * s * (1 - s)) ** 2 / Math.max(1e-6, e * (1 - e))
        });
        if (trust[r[0]]) {
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
          hs.forEach(h => (A[memBucket(h)] += 1 / hs.length));
          for (let j = 1; j < 4; j++)
            if (A[j]) {
              I[j] += (w * (D * A[j]) ** 2) / v;
              mem[j] -= (w * d * D * A[j]) / v / (tau + I[j]);
              N[j] += A[j];
            }
          N[0] += A[0];
        }
        // Fisher information about the level from this answer, on the same model as the level's step (levelMargin).
        ra[2] = (ra[2] || 0) + ((1 - g) * s * (1 - s)) ** 2 / Math.max(1e-6, e * (1 - e));
        ra[0] += (0.6 / (1 + n / 40)) * d;
        ra[1]++;
        hs.forEach(h => {
          h[0]++;
          h[1] += ok;
        });
      });
    return {P, PG, G, R, TM, mem: mem.map(x => Math.round(x * 100) / 100), memn: N.map(x => Math.round(x * 10) / 10)};
  }
  // The photos' time terms from the answer log (ptimeOut), as Code.gs ?stats=1 appends them to photos.
  const photoTimeOf = rows => ptimeOut(eloReplay(rows).TM);
  // The photo memory offsets estimated from the answer log, as Code.gs ?stats=1 mem and memn.
  function photoMemOf(rows) {
    const {mem, memn} = eloReplay(rows);
    return {mem, memn};
  }
  // Progress saved before the photo memory, recalculated once and silently (docs/LEARNING.md "Photo memory", Saved
  // progress recalculated once and Learned under the former model): the record's moving average s.pg corrected from its
  // photos [shown, right] (s.ps), never raised, a learned genus left alone; s.pm marks the record (it travels with
  // s.pg: mergeProgress, mergeUsers), so no device corrects it twice. A learned mark passed under the former model
  // (afterBkt) is dropped at every call; an exam passed since is kept. Returns true when it marked the record now or
  // dropped a former learned mark. Only the fallback for a device that never reaches the sheet's full replay
  // (replayProgress).
  function memRecalc(s, mem) {
    if (!s || typeof s !== 'object') return false;
    let old = false;
    if (s.mx && !afterBkt(s)) {
      delete s.mx;
      delete s.ex;
      old = true;
    }
    if (s.pm) return old;
    s.pm = 1;
    if (s.mx || typeof s.pg !== 'number' || !(s.pg > 0)) return true;
    const e = x => 0.25 + 0.75 / (1 + Math.exp(-x));
    let r = 0,
      w = 0;
    Object.values(s.ps || {}).forEach(h => {
      if (!Array.isArray(h) || !(h[0] > 0) || !(h[1] > 0)) return;
      const first = h[1] / h[0];
      r += h[1];
      w += first + (h[1] - first) * Math.min(1, e(1) / e(1 - mem[memBucket(h)]));
    });
    if (r && w < r) {
      const f = w / r;
      s.pg = Math.round(((f * s.pg) / (f * s.pg + 1 - s.pg)) * 1e4) / 1e4;
    }
    return true;
  }
  // The photo ratings as Code.gs ?stats=1 photos: [difficulty (genus offset + residual), weighed answers, weighed right,
  // answers, the unit whose offset is in the difficulty (model.js photoDiff swaps it for the unit asked)], and a photo with
  // a time term its three numbers after them (ptimeInto).
  function eloOf(rows) {
    const {P, PG, G, TM} = eloReplay(rows);
    const out = {};
    Object.keys(P).forEach(
      f =>
        (out[f] = [
          Math.round((G[PG[f]][0] + P[f][0]) * 100) / 100,
          Math.round(P[f][2] * 10) / 10,
          Math.round(P[f][1] * 10) / 10,
          P[f][3],
          PG[f]
        ])
    );
    return ptimeInto(out, TM);
  }
  // The genus offsets as Code.gs ?stats=1 gd: {genus: [offset, weighed answers]}.
  function genusOffsetsOf(rows) {
    const {G} = eloReplay(rows);
    return Object.fromEntries(Object.entries(G).map(([n, o]) => [n, [Math.round(o[0] * 100) / 100, Math.round(o[1] * 10) / 10]]));
  }

  // One trusted answer added to the pooled pairs (conf: {"A|B": [offered together, mixed up]}, A before B alphabetically):
  // the one rule of core.js confusionOf pair and Code.gs statsStep_ (?stats=1 conf). g the unit shown, a the unit
  // answered, ok right, mode as logged, ch the units offered (space-separated). Each other unit offered beside g: one
  // offer, and a mix-up when it was answered. A typed miss (TYPED_RE, no choices: the player wrote another unit's name
  // from memory) is an unprompted mix-up: the pair counts as offered once and mixed up, as a player's own record counts a
  // mix-up with no offer (pairConf); decision: docs/decisions/2026-11-18-typed-answers-rest.md. "I don't know" ('') and a
  // right typed answer add nothing: no pair was in play.
  function confAdd(conf, g, a, ok, mode, ch) {
    if (!g) return;
    const inc = (x, took) => {
      const k = g < x ? g + '|' + x : x + '|' + g,
        c = (conf[k] = conf[k] || [0, 0]);
      c[0]++;
      if (took) c[1]++;
    };
    const L = String(ch || '')
      .split(/\s+/)
      .filter(x => x && x !== g);
    if (L.length) L.forEach(x => inc(x, !ok && a === x));
    else if (!ok && a && a !== g && TYPED_RE.test(String(mode || ''))) inc(a, true);
  }
  // Confusions between genera: from the answer log rows (as eloOf; row[10] = the genera offered, space-separated).
  // pair["A|B"] (A before B alphabetically) = [offered together, mixed up], the pooled pairs the game plays with
  // (confAdd): one was shown with the other among the choices and the other was answered, or the other was typed for it.
  // Same counts as Code.gs stats_ conf (tests check it). dir["shown|other"] = [offered, answered] keeps the direction,
  // from the choices only. old["shown|answered"] = mix-ups logged without their choices: the oldest rows (they can't be
  // turned into a rate, only counted) and the typed ones (also in pair; admin.js noChoiceMixups tells the two apart).
  function confusionOf(rows) {
    const trust = trustOf(rows);
    rows = rows.filter(r => trust[r[0]]); // trusted players only, as Code.gs stats_
    const pair = {},
      dir = {},
      old = {};
    rows.forEach(r => {
      const g = r[2],
        a = r[3],
        ok = r[4],
        ch = String(r[10] || '')
          .split(/\s+/)
          .filter(x => x && x !== g);
      if (!g) return;
      confAdd(pair, g, a, ok, r[5], r[10]);
      if (!ch.length) {
        if (!ok && a && a !== g) old[g + '|' + a] = (old[g + '|' + a] || 0) + 1;
        return;
      }
      ch.forEach(x => {
        const k = g + '|' + x,
          c = (dir[k] = dir[k] || [0, 0]);
        c[0]++;
        if (!ok && a === x) c[1]++;
      });
    });
    return {pair, dir, old};
  }
  // Confusion score of a pair: its mix-up rate when offered together, starting from a prior rate worth CONF.W offers (the
  // declared look-alikes of the IMR lecture and the Coral Finder start high), then following the players' real answers.
  // N: the offers a pair needs before the data can make it a look-alike (dataLook, below).
  const CONF = {W: 8, LOOK: 0.3, FAM: 0.12, FORM: 0.08, BASE: 0.03, TRAP: 0.2, N: 20};
  const confScore = (c, prior) => ((c ? c[1] : 0) + CONF.W * prior) / ((c ? c[0] : 0) + CONF.W);
  // A look-alike from the data (docs/LEARNING.md "Confusion groups"): genera the players keep confusing become
  // look-alikes, which the courses may never have named. A pair offered together CONF.N times or more (c, the pooled
  // [offered, mixed up]) whose pooled score (confScore on the pair's own prior: same family, a shared growth form or
  // neither) reaches CONF.TRAP. The prior's weight (CONF.W offers at a low rate) keeps it clear: at 20 offers a pair of
  // unrelated genera needs 6 mix-ups (30%), where the declared look-alikes are mixed up about 13% of the time.
  const dataLook = (c, score) => !!c && c[0] >= CONF.N && score >= CONF.TRAP;
  // How much harder a question is for a player who mixes up its genus with one of its choices more than everyone does
  // (docs/LEARNING.md, Known mix-ups): the player's own score of the pair (own, pairConf, shrunk toward the
  // pooled score as confOf does) against the pooled score, in logits, when higher; 0 for a pair the player mixes up no
  // more than everyone. The pooled score already shows in the photos' difficulty (every player's answers); this is the
  // player's own excess, so it is never counted twice. No constant: confScore's own prior weight sets how fast it grows.
  const logitOf = p => Math.log(p / (1 - p));
  const confGap = (own, pooled) => {
    const q = Math.min(0.99, Math.max(0.01, pooled));
    return Math.max(0, logitOf(Math.min(0.99, confScore(own, q))) - logitOf(q));
  };
  // One player's own record on a pair (progress P): [times the two were offered together, times mixed up], both directions.
  // Offers (P[g].off) are missing from the oldest records: a mix-up counts as offered at least once.
  function pairConf(P, a, b) {
    const x = P[a] || {},
      y = P[b] || {},
      mix = ((x.conf || {})[b] || 0) + ((y.conf || {})[a] || 0);
    return [Math.max(mix, ((x.off || {})[b] || 0) + ((y.off || {})[a] || 0)), mix];
  }

