  // The former moving average (docs/LEARNING.md "Progress (moving average) and mastery", The former moving average):
  // s.pg, an exponential moving average of the answers on a unit, each weighed by what it proves (w, 0 to 1): a right
  // answer s.pg += PROG.A × w × (1 − s.pg), a miss s.pg −= PROG.A × w × s.pg. PROG.M is the mastery exam's entry, shown
  // as 95%. OLD: the weight of a right answer when a record without s.pg (BKT's) is recomputed from its last 10 results
  // (s.h); a unit learned on such a record loses its mark (memRecalc).
  const PROG = {A: 0.15, M: 0.8, LOOK: 0.5, OLD: 0.67};
  // A learned genus keeps its mark while its progress stays at PROG.M × (1 − PROG.A) or above after a miss (one miss from
  // PROG.M or above, not two): the game's rule (model.js mxKept, applied in quiz.js answer after each miss) and the
  // replay's (replayProgress lm, replayedOf).
  const mxKeeps = pg => pg >= PROG.M * (1 - PROG.A) - 1e-6;
  const pgStep = (g, good, w) => Math.round((g + PROG.A * w * ((good ? 1 : 0) - g)) * 1e4) / 1e4;
  // The fallback for a device that never reaches the sheet: once it does, the sheet's full replay of its log replaces
  // such a record (replayProgress, sync.js replayAdopt).
  function pgOf(s) {
    if (!s) return 0;
    if (typeof s.pg === 'number') return s.pg;
    const g = [...String(s.h || '')].reduce((x, c) => x + PROG.A * (c === '1' ? PROG.OLD : 1) * ((c === '1' ? 1 : 0) - x), 0);
    return s.mx ? Math.max(g, PROG.M) : g;
  }
  // The bar of a genus, 0 to 1: the dynamic bar (barOf: the domain score corrected by the genus's false alarms, at most
  // 95%; a record not rebuilt yet, its former moving average s.pg filling 95% on its way to PROG.M), then each
  // mastery-exam question passed fills a fifth of what is left to 100% (1% a question from 95%), the passed exam makes
  // it 100%. P, n: the player's progress and the genus's name, for the false-alarm correction (faOf); without them, none.
  function scoreOf(s, P, n) {
    if (!s) return 0;
    if (s.mx) return 1;
    const b = barOf(s, P, n);
    // At most 4 of the 5 exam steps before the exam is passed: an exam can have 5 right answers still waiting for its
    // typed ones, and only a passed exam (s.mx) makes 100%.
    return b + (examOpen(s, P, n) && s.ex ? ((1 - b) * Math.min(4, s.ex.k || 0)) / 5 : 0);
  }
  // Progress % of a saved progress P over a list of genera, as the app shows it (genScore / progPct). The sync sheet
  // computes the leaderboard % with a copy (Code.gs pctOf_): keep the two in step
  // (tests/sync.test.js compares them; tests/draw.smoke.js compares this with the app's progPct).
  function pctOf(P, list) {
    return list && list.length ? Math.round((100 * list.reduce((t, n) => t + scoreOf((P || {})[n], P, n), 0)) / list.length) : 0;
  }
  // Weights by commonness (the fish global score's): each item weighs 1/√ of its
  // rank by its count, the largest count first (rank 1 weighs 1, rank 4 weighs 0.5, rank 100 weighs 0.1). Tied counts
  // share the mean of the ranks they span (fractional ranking), so the order of the list never matters, and the items
  // nobody counted (0) share the last ranks' mean: they weigh the least, never nothing. counts: numbers (anything else
  // counts 0). Returns the weights in the list's order.
  function rankWeights(counts) {
    const c = (counts || []).map(x => (typeof x === 'number' && isFinite(x) && x > 0 ? x : 0)),
      ord = c.map((x, i) => i).sort((i, j) => c[j] - c[i]),
      w = new Array(c.length);
    for (let a = 0; a < ord.length;) {
      let b = a;
      while (b + 1 < ord.length && c[ord[b + 1]] === c[ord[a]]) b++;
      const r = (a + 1 + b + 1) / 2; // the mean of ranks a+1 .. b+1
      for (let k = a; k <= b; k++) w[ord[k]] = 1 / Math.sqrt(r);
      a = b + 1;
    }
    return w;
  }
  // The tree of a subject's global score (treeScore, SUBJECTS score; docs/LEARNING.md "Fish: the global score, built"):
  // the families of the slate on the trunk, each weighted by the sum of its species' weights (rankWeights over
  // fish.json present.dauinU); on the branches every species of those families with its units, its genus when the game
  // has it as a unit (treeGenSets), the species with no unit of their own packed by genus and circle, the circle the
  // family's. on: the species level on (sync.js speciesOn; rule D4): each species with a common-name unit (treeSpUnits)
  // has an entry of its own, [weight, genus, '', [its unit], circle]; off, every species is packed. sci: the scientific
  // species level on (SCI_SHEET; rule D4): each species with a scientific unit has an entry of its own, that unit in
  // the scientific place, its common-name unit as above (none: null), so a player with none of them answered scores
  // what the tree without them gives.
  function treeScoreTree(X, F, on, sci) {
    const own = sci ? new Set(treeSpUnits(F, X, 'sci').map(u => u.s.id)) : null,
      sp = new Map((F.species || []).map(s => [s.id, s])),
      fam = new Map((F.families || []).map(f => [f.id, f])),
      fams = [...X.c1, ...X.c2, ...X.c3].filter(id => fam.has(id)),
      L = fams.flatMap(id => (fam.get(id).species || []).filter(x => sp.has(x)).map(x => [sp.get(x), id])),
      w = rankWeights(L.map(([s]) => (s.present || {}).dauinU || 0)),
      fw = {},
      pack = new Map(),
      r4 = x => Math.round(x * 1e4) / 1e4,
      circ = id => X.gen[id].circle || 1;
    L.forEach(([s, id], i) => {
      fw[id] = (fw[id] || 0) + w[i];
      const g = s.genus && X.gen[s.genus] ? s.genus : '',
        cn = on && (s.cn || []).length ? spUnitId('cn', s.id) : '';
      // The scientific level on: a species with its scientific unit has its own entry, keyed by it.
      if (own && own.has(s.id)) {
        const u = spUnitId('sci', s.id);
        return pack.set(u, [w[i], g, u, cn ? [cn] : on || !s.common ? null : [], circ(id)]);
      }
      // The species level on: a species with a listed name has its own entry, its unit as its common names; one with none
      // has none, null, and is packed.
      if (cn) return pack.set(cn, [w[i], g, '', [cn], circ(id)]);
      const named = on ? false : !!s.common, // no common name at all: null (treeScore), never packed with the others
        key = g + '|' + circ(id) + '|' + named,
        e = pack.get(key) || [0, g, '', named ? [] : null, circ(id)];
      e[0] += w[i];
      pack.set(key, e);
    });
    return {f: fams.map(id => [id, r4(fw[id] || 0), circ(id)]), s: [...pack.values()].map(e => [r4(e[0]), ...e.slice(1)])};
  }
  // A subject's global score and its components, from one computation (docs/LEARNING.md "Fish: the global score,
  // built"; docs/spec/fish-game.md "The fish global score"); every unit keeps its own bar (scoreOf), this only adds
  // them up. T, the subject's tree (app.js UNITS tree, treeScoreTree): f [[family unit, weight, circle]]; s [[weight,
  // genus unit, species unit, [common-name units], circle]] ('' and [] for units that do not exist yet; null common
  // names: a species with none, which counts its scientific value alone). K, the subject's constants (SUBJECTS score:
  // entries, a, b, half, pow). Returns {pct (the % shown, 0-100, rounded), raw, entries (the families), genera (each
  // weighted by its species), common (C over the species), scientific (the species' own, no genus credit), S (the genus
  // credit included), credit, each a weighted mean from 0 to 1; by: the same per circle; units: every unit of the tree
  // with its own bar}. A rule that reads a score reads one of these (app.js treeGate: by[1].entries).
  function treeScore(P, T, K) {
    const F = (T && T.f) || [],
      S = (T && T.s) || [],
      k = K || {},
      a = k.a,
      b = k.b,
      half = k.half,
      we = k.entries,
      units = {},
      m = k => (k ? (k in units ? units[k] : (units[k] = scoreOf((P || {})[k], P, k))) : 0),
      acc = () => ({fw: 0, f: 0, sw: 0, cw: 0, c: 0, sc: 0, S: 0, cr: 0, gw: 0, g: 0}),
      all = acc(),
      by = {},
      at = c => (by[c] = by[c] || acc()),
      genW = {};
    F.forEach(([u, w, c]) => {
      const x = m(u) * w;
      [all, at(c || 1)].forEach(o => ((o.fw += w), (o.f += x)));
    });
    S.forEach(([w, g, sp, names, c]) => {
      // names null: a species with no common name at all: out of the Common names component, and its credit is its
      // scientific value alone (S), so it still reaches 1 once its scientific name is mastered (100% stays reachable).
      // []: its common names have no unit (0).
      const none = names === null,
        N = Array.isArray(names) ? names : [],
        C = N.length ? N.reduce((t, n) => t + m(n), 0) / N.length : 0,
        own = m(sp),
        G = m(g),
        Sv = Math.max(own, half * G),
        cr = none ? Sv : a * C + b * Sv + (1 - a - b) * C * Sv;
      [all, at(c || 1)].forEach(
        o => ((o.sw += w), none || ((o.cw += w), (o.c += w * C)), (o.sc += w * own), (o.S += w * Sv), (o.cr += w * cr))
      );
      if (g) (genW[g] = genW[g] || {w: 0, c: c || 1, m: G}).w += w;
    });
    Object.values(genW).forEach(o => [all, at(o.c)].forEach(x => ((x.gw += o.w), (x.g += o.w * o.m))));
    const out = o => {
      const d = (x, y) => (y > 0 ? x / y : 0),
        r = {
          entries: d(o.f, o.fw),
          genera: d(o.g, o.gw),
          common: d(o.c, o.cw),
          scientific: d(o.sc, o.sw),
          S: d(o.S, o.sw),
          credit: d(o.cr, o.sw)
        };
      r.raw = we * r.entries + (1 - we) * r.credit;
      r.pct = Math.round(100 * Math.pow(Math.max(0, Math.min(1, r.raw)), k.pow));
      return r;
    };
    const R = out(all);
    R.by = Object.fromEntries(Object.entries(by).map(([c, o]) => [c, out(o)]));
    R.units = units; // every unit of the tree with its own bar (scoreOf), the per-unit level of each part
    return R;
  }

  // The domain-score bar (docs/LEARNING.md "The domain-score bar", which gives the model, its sources and each DOM
  // constant): a unit's bar is the share of all its possible photos the player would name right, one photo alone with
  // no choices, as far as their own answers on that unit have shown: the posterior expected IRT domain score on a grid
  // of abilities, from a population prior, each own answer's likelihood as the game scored it, and a drift DOM.Q before
  // each. Stored at each own answer: s.dp, the log posterior on the grid (relative to its top, 2 decimals, clipped at
  // -DOM.CLIP), and s.ds, the bar (domBar: a ramp from 0 below the KNEE); never moved by the photo statistics. A record
  // with no s.dp keeps its moving average s.pg (pgOf, PROG; rule D4).
  const DOM = {LO: -4, STEP: 0.5, N: 21, M0: -2, SD0: 1.5, TAU: 0.5, SINGLE: 0.5, Q: 0.1, EX: 0.85, KEEP: 0.8, CLIP: 30, KNEE: 2};
  const domTh = i => DOM.LO + i * DOM.STEP;
  const DOM_PRIOR = Array.from({length: DOM.N}, (_, i) => -0.5 * ((domTh(i) - DOM.M0) / DOM.SD0) ** 2);
  const domNorm = lp => {
    const m = Math.max(...lp);
    return lp.map(x => Math.max(-DOM.CLIP, Math.round((x - m) * 100) / 100));
  };
  // The record's log posterior on the grid: its own (s.dp), else the prior (a genus never answered under these rules).
  const domLp = s => (s && Array.isArray(s.dp) && s.dp.length === DOM.N ? s.dp : DOM_PRIOR);
  // The chance of a right answer at ability th: g + (1 - g) R sig(S (th - d)), g the guess rate 1/k (0 typed: k
  // infinite), R the recall after a break, S the shared slope (1, the Elo's, unless the sheet estimates it).
  const domP = (th, d, k, R = 1, S = 1) => {
    const g = isFinite(k) && k > 1 ? 1 / k : 0;
    return g + (1 - g) * R * sigm(S * (th - d));
  };
  // The posterior after one own answer: the drift first (a three-point kernel of variance DOM.Q², on the probabilities;
  // none before the first answer), then the answer's likelihood. lp: the log posterior before. Returns the new one.
  // z: the answer's weight in the likelihood (a tempered one: partOf, a smaller fault counts as part of a miss), 1 a whole
  // answer.
  function domUpdate(lp, ok, d, k, R = 1, S = 1, drift = true, z = 1) {
    let x = lp.slice();
    if (drift) {
      const a = Math.min(1 / 3, (DOM.Q * DOM.Q) / (2 * DOM.STEP * DOM.STEP)),
        p = x.map(v => Math.exp(v));
      x = p.map((v, i) => Math.log(Math.max(1e-300, (1 - 2 * a) * v + a * (i ? p[i - 1] : v) + a * (i < DOM.N - 1 ? p[i + 1] : v))));
    }
    x = x.map((v, i) => {
      const q = Math.min(1 - 1e-9, Math.max(1e-9, domP(domTh(i), d, k, R, S)));
      return v + z * Math.log(ok ? q : 1 - q);
    });
    return domNorm(x);
  }
  // The domain score of a log posterior: the expected share of the genus's photos named right alone and typed,
  // E over θ of E over d ~ N(mu', TAU²) of sig(S (θ - d)), the inner one in closed form (sig(x / sqrt(1 + pi v / 8)),
  // the probit approximation of the logistic-normal integral). mu' = mu (the genus offset gd) + SINGLE + ot (the typed
  // format's offset: 0 unless the sheet serves it).
  function domScore(lp, mu = 0, S = 1, ot = 0) {
    const c = Math.sqrt(1 + (Math.PI / 8) * S * S * DOM.TAU * DOM.TAU),
      m = (Number(mu) || 0) + DOM.SINGLE + (Number(ot) || 0);
    let w = 0,
      t = 0;
    lp.forEach((v, i) => {
      const p = Math.exp(v);
      w += p;
      t += p * sigm((S * (domTh(i) - m)) / c);
    });
    return w > 0 ? t / w : 0;
  }
  // The bar's value, 0 to 1: the domain score itself from the knee up; below, a straight ramp from 0 at the prior's own
  // (D0), so a genus never answered shows 0 and a miss from there leaves it at 0. The knee is twice D0, or halfway from
  // D0 to 1 for a very easy genus (D0 over 1/3, where 2 D0 would be above 1 and the exam out of reach), so the bar always
  // reaches every value up to 1. An increasing map: the bar moves the posterior's way.
  function domBar(lp, mu = 0, S = 1, ot = 0) {
    const d0 = domScore(DOM_PRIOR, mu, S, ot),
      x = domScore(lp, mu, S, ot),
      knee = Math.min(DOM.KNEE * d0, (1 + d0) / 2);
    return Math.max(0, Math.min(1, x >= knee ? x : (knee * (x - d0)) / (knee - d0)));
  }
  // One own answer on the genus record s (scoreAnswer: the genus shown; the genus wrongly given, rule L2, as a
  // miss on its photo). d: the question's difficulty for the player, k the plausible choices, R the recall, f {mu: the
  // genus offset, o: this format's offset, t: the typed format's, S: the slope, z: the answer's weight, partOf}. The
  // stored bar moves the answer's way only (a right answer never lowers it, a miss never raises it): the drift alone can
  // move the posterior's expectation a little either way, and the bar shows evidence, not the passing of answers.
  function domStep(s, ok, d, k, R = 1, f = {}) {
    const S = typeof f.S === 'number' && f.S > 0 ? f.S : 1,
      had = Array.isArray(s.dp) && s.dp.length === DOM.N;
    s.dp = domUpdate(domLp(s), ok, d + (Number(f.o) || 0), k, R, S, had, typeof f.z === 'number' && f.z > 0 ? f.z : 1);
    const b = Math.round(domBar(s.dp, f.mu, S, f.t) * 1e4) / 1e4,
      o = typeof s.ds === 'number' ? s.ds : 0;
    s.ds = ok ? Math.max(o, b) : Math.min(o, b);
    delete s.pg; // the former moving average: this record is under the domain-score rules now
  }
  // Whether a record is under the domain-score rules (s.dp), and the three readings every consumer goes through:
  // barOf (the dynamic bar, 0 to 0.95), examOpen (the mastery exam may start), keepsMark (a learned genus stays learned).
  const domOn = s => !!s && Array.isArray(s.dp) && typeof s.ds === 'number';
  // A record of a subject the sheet does not replay on the device, kept under the former moving average s.pg, rebuilt
  // under the domain-score rules (model.js domRecalcAll), silently, from what every copy of the record holds: ok, ko
  // and the order of its last 10 (h), each answer on a photo of the unit's average difficulty d among k choices
  // (docs/LEARNING.md "Progress (moving average) and mastery", The former moving average). Approximate, deterministic,
  // the same on every device; a false alarm's 0 in h is no miss (h keeps at most ko of its zeros, the latest). Returns
  // the record's new dp and ds (domStep from the prior), the record itself unchanged.
  function domFromCounts(s, d, k = 4, mu = 0) {
    const ok = Math.max(0, s.ok || 0),
      ko = Math.max(0, s.ko || 0),
      h0 = String(s.h || '').replace(/[^01]/g, ''),
      z0 = [...h0].filter(c => c === '0').length;
    let drop = Math.max(0, z0 - ko);
    const h = [...h0]
        .filter(c => c === '1' || (drop > 0 ? (drop--, false) : true))
        .join('')
        .slice(-(ok + ko)),
      hr = [...h].filter(c => c === '1').length,
      r0 = Math.max(0, ok - hr),
      m0 = Math.max(0, ko - (h.length - hr)),
      seq = [];
    for (let i = 0, r = 0; i < r0 + m0; i++) {
      // Bresenham: the i-th earlier answer is right when the rights so far fall behind their share.
      const right = r0 > 0 && (m0 === 0 || (r + 1) * (r0 + m0) <= (i + 1) * r0 + r0 / 2);
      seq.push(right);
      if (right) r++;
    }
    [...h].forEach(c => seq.push(c === '1'));
    const x = {};
    seq.forEach(ok1 => domStep(x, ok1, d, k, 1, {mu}));
    return {dp: x.dp, ds: x.ds};
  }
  // The false-alarm correction (docs/LEARNING.md "The domain-score bar", the unit given in a mix-up): naming n for
  // another unit's photo is a false alarm, a response bias, not a failure on n's own photos, so it never enters n's
  // posterior; faOf(P, n) gives n's false-alarm rate, the times n was given for another unit's photo over the questions
  // where n was a possible answer (offered among the choices, or any typed question on another unit of its rank), 0
  // without P or without such a question, and barOf takes Pr = H - FA. Rule L2's count of the unit given (recent
  // results, run) and the ability are untouched. rankKey: a unit's rank as its id says it (a fish family f:, a
  // scientific genus g:; a coral genus, or an id without a prefix: '').
  const rankKey = n => (/^([a-z]+):/.exec(String(n || '')) || [])[1] || '';
  // The typed questions on other units of n's rank, where the chances to give n start (above).
  const faTyped = (P, n) => Math.max(0, (((P[LEVEL] || {}).tyk || {})[rankKey(n)] || 0) - ((P[n] || {}).ty || 0));
  // The scan: every other record of P read for n.
  function faScan(P, n) {
    let fa = 0,
      op = faTyped(P, n);
    for (const t in P) {
      if (t === n || t === LEVEL || !P[t]) continue;
      fa += (P[t].conf || {})[n] || 0;
      op += (P[t].off || {})[n] || 0;
    }
    return op > 0 ? Math.min(1, fa / op) : 0;
  }
  // The false-alarm table (speed only, every value the same to the last bit; docs/LEARNING.md "Long rated runs: the
  // false-alarm table"). faArm(P) lets the next faOf build one table of every unit's false alarms and chances in a
  // single pass over P, in the scan's own order, and answer later calls from it until scoreAnswer writes P (it disarms
  // the table while it runs and arms it again, empty, after) or faDisarm(P). Opt-in, only while nothing but scoreAnswer
  // writes the records' conf, off, ty or the level's tyk; the app and the sheet never arm. A P whose conf or off is not
  // a plain object of numbers, or a unit id that is not a string or that Object.prototype holds, is scanned.
  // FA_CHECK.on (the tests): every answer from the table is checked against the scan, and a difference throws.
  const FA_CHECK = {on: false},
    FAT = new WeakMap(),
    faArm = P => void (P && typeof P === 'object' && FAT.set(P, null)),
    faDisarm = P => void (P && typeof P === 'object' && FAT.delete(P)),
    faPlain = c => {
      if (typeof c !== 'object' || Array.isArray(c)) return false;
      const p = Object.getPrototypeOf(c);
      return p === null || Object.getPrototypeOf(p) === null; // a plain object, of this realm or of a vm's
    };
  function faTable(P) {
    const u = new Map(),
      // Record t's conf or off (c) added to every other unit's false alarms or chances (key); false when c is not a plain
      // object of numbers. A unit's chances start at its typed questions, as the scan's do.
      add = (c, t, key) => {
        if (!c) return true;
        if (!faPlain(c)) return false;
        for (const k of Object.keys(c)) {
          const v = c[k];
          if (v && typeof v !== 'number') return false;
          if (k === t) continue;
          if (!u.has(k)) u.set(k, {fa: 0, op: faTyped(P, k)});
          u.get(k)[key] += v || 0;
        }
        return true;
      };
    for (const t in P) if (t !== LEVEL && P[t] && !(add(P[t].conf, t, 'fa') && add(P[t].off, t, 'op'))) return {ok: false};
    return {ok: true, u};
  }
  function faOf(P, n) {
    if (!P || !n) return 0;
    if (!FAT.has(P) || typeof n !== 'string' || n in Object.prototype) return faScan(P, n);
    let T = FAT.get(P);
    if (!T) FAT.set(P, (T = faTable(P)));
    if (!T.ok) return faScan(P, n);
    // A unit no other record names nor offers: no false alarm, 0 as the scan gives it.
    const x = T.u.get(n),
      v = x ? (x.op > 0 ? Math.min(1, x.fa / x.op) : 0) : 0;
    if (FA_CHECK.on && !Object.is(v, faScan(P, n))) throw new Error(`faOf: the table gives ${v} for ${n}, the scan ${faScan(P, n)}`);
    return v;
  }
  // The domain score as the bar uses it: s.ds less the genus's false-alarm rate (faOf), at least 0.
  const domVal = (s, P, n) => Math.max(0, s.ds - faOf(P, n));
  const barOf = (s, P, n) => (!s ? 0 : domOn(s) ? Math.min(0.95, domVal(s, P, n)) : 0.95 * Math.min(1, pgOf(s) / PROG.M));
  const examOpen = (s, P, n) => !!s && (domOn(s) ? domVal(s, P, n) >= DOM.EX - 1e-9 : pgOf(s) >= PROG.M);
  const keepsMark = (s, P, n) => !!s && (domOn(s) ? domVal(s, P, n) >= DOM.KEEP - 1e-9 : mxKeeps(pgOf(s)));
  // Pair coverage, the mastery exam's other entry condition (docs/LEARNING.md "The domain-score bar"; the PALM /
  // Larkwire practice): a genus takes its exam only once it has been compared with each of its look-alikes, asked with
  // it among the choices (either way: s.off, as the game counts the offers) or mixed up with it (s.conf). looks: the
  // look-alikes in play (model.js examLooks: the declared ones the player can be asked). Returns the look-alikes not
  // compared yet ([] when the condition holds).
  const looksLeft = (P, n, looks) => {
    const s = (P || {})[n] || {},
      seen = (x, y) => ((P[x] || {}).off || {})[y] > 0 || ((P[x] || {}).conf || {})[y] > 0;
    return (looks || []).filter(x => x !== n && !((s.off || {})[x] > 0 || (s.conf || {})[x] > 0 || seen(x, n)));
  };
  // The learned-mark protection (docs/reviews/2026-11-06-engine-coherence-review.md F8, F9): a mark passed under the
  // former model, Bayesian Knowledge Tracing, is dropped (memRecalc, replayedOf); such a record has
  // neither the moving average s.pg nor the domain-score bar s.ds. Explicit, so a record of the domain-score rules,
  // which carries no s.pg, keeps its mark: "learned after BKT" is a record with either.
  const afterBkt = s => !!s && (typeof s.pg === 'number' || typeof s.ds === 'number');

