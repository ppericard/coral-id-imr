  // What one answer proves, the weights of pgStep (docs/LEARNING.md "Progress (moving average) and mastery"), shared by
  // the app (model.js pgWeight, quiz.js answer) and the full replay below, so both run the same rules.
  // TARGET_P: the chance every question aims for, whatever its format (model.js PICKD.P, the difficulty controller:
  // about 80% right).
  const TARGET_P = 0.8;
  // The success aimed for follows the player's global level (strong players find the app challenging quickly, beginners
  // are not overwhelmed): AIM, points [global level, success], 85% up to a level
  // of 0.5, 75% from 1.5, a straight line between, flat outside (no cliff); TARGET_P (0.8, the middle) stays the game's
  // reference. model.js aimP (the photos aimed at, the opening's shaky bar) and the miss weight (pgMissW, in the game
  // and in the full replay) take it from here. docs/LEARNING.md "Beginners and experts".
  const AIM = [
    [0.5, 0.85],
    [1.5, 0.75]
  ];
  function aimOf(L) {
    const [[l0, p0], [l1, p1]] = AIM;
    return p0 + (p1 - p0) * Math.min(1, Math.max(0, ((Number(L) || 0) - l0) / (l1 - l0)));
  }
  const sigm = x => 1 / (1 + Math.exp(-x));
  // A right answer, w from 0 to 1: the plausible choices k ((1 − 1/k) / (1 − 1/4): 4 weigh 1, 3 0.89, 2 0.67), in full
  // when a genus it gets confused with is among the choices (look), PROG.LOOK when none is. model.js pgWeight finds look.
  // A typed answer (k infinite, model.js TYPED.k) counts in full: every genus, its look-alikes included, was a possible
  // answer.
  const pgRightW = (k, look) => Math.min(1, Math.max(0, (1 - 1 / k) / (1 - 1 / 4))) * (look || !isFinite(k) ? 1 : PROG.LOOK);
  // What a miss proves (a miss on a very hard photo does not mean the genus is badly known, and a miss must not cost more
  // than it proves; decision in docs/decisions/2026-11-18-decisions-from-code-comments.md): the Elo chance the player had
  // to get it right (ability th against the photo's difficulty d, k choices, as abilityStep), over the chance the game
  // aims for (aim: aimOf the player's global level, 85% to 75%, whatever the format: model.js aimP; TARGET_P, 0.8, when
  // not given). A photo at the player's level or easier: the miss counts in full; a harder one: less (1 unit harder:
  // 0.78; 2 units: 0.56). No new constant: the Elo and the photo targeting set it. The right answers keep their weight
  // (pgRightW): simulated, a photo factor on them only slowed everyone.
  // R: the recall expected after a break, for a comeback question (model.js comebackOf; 1 otherwise): the chance the
  // player had is then the recall-adjusted one, so a miss the rust explains costs less progress.
  function pgMissW(th, d, k, R = 1, aim = TARGET_P) {
    const e = (x, r = 1) => 1 / k + (1 - 1 / k) * r * sigm(x);
    return Math.min(1, e(th - d, R) / aim);
  }
  // What a right answer on a photo the player knows proves: only what memory does not explain. The
  // mirror of pgMissW (a ratio of chances, like it): the chance the player had on the same photos new over the chance
  // they had with their memory of them (fam, model.js famOf), at most 1: the share of such right answers that would have
  // come without the memory. A new photo (fam 0) keeps its full weight: simulated, a photo-difficulty factor on every
  // right answer only slowed everyone, so only the part memory explains is taken off. 4 choices, a photo at the game's
  // target (ability 1 above it): about x 0.93 shown never right, x 0.87 right once, x 0.84 right twice or more. The
  // room for surprise left ((1 - chance with memory) / (1 - chance new)) was tried and rejected: it put the progress
  // further below the truth than memory had put it above (docs/LEARNING.md "Photo memory").
  function pgMemW(th, d, fam, k, R = 1) {
    const e = x => 1 / k + (1 - 1 / k) * R * sigm(x);
    return fam >= 0 ? 1 : Math.min(1, e(th - d) / e(th - d - fam));
  }
  // Number of choices as the app scored an answer, from its log row: a typed answer (|t, quiz.js answer) none to guess
  // from (Infinity, model.js TYPED.k: no 1/k floor, as guessOf), |kN in the mode (the plausible choices, logged when
  // fewer than the buttons), a duel 2, else the genera offered (2-3), else 4.
  const kOf = (mode, choices) => {
    if (TYPED_RE.test(String(mode || ''))) return Infinity;
    const kq = /\|k(\d)/.exec(String(mode || ''));
    if (kq) return Number(kq[1]);
    if (/duel|\|d(\||$)/.test(String(mode || ''))) return 2;
    const n = String(choices || '')
      .split(/\s+/)
      .filter(Boolean).length;
    return n >= 2 && n < 4 ? n : 4;
  };

  // Player ability per unit (s.th), on the photo-difficulty scale: an Elo step after each answer (docs/LEARNING.md
  // "Ability per genus (Elo) and the global level", which gives the answer model, the volatility s.vr and each ELO
  // constant). Here, not in model.js, so the full replay (replayProgress) rebuilds the ability with the app's own step;
  // model.js ability / abilityStep call these on the app's P. abilityOf(P, n): a record with the old Easy/Medium/Hard
  // steps (s.lv) starts from the matching ability; a unit never answered from playerStart; one already answered from
  // its own estimate (s.th) plus the global level's move since its last own step (levelMove).
  const ELO = {th0: 0, kmax: 0.8, kmin: 0.25, n: 15, lo: -1.5, hi: 3, vr: 0.1, vg: 2};
  // p: the level the player's first-launch answer says (CHOICE, startVars(c).p), which a genus never answered starts
  // from (playerStart); 0, the default player's, when they have not answered.
  // from: the unit a unit never answered starts from instead (a fish species: its family, docs/FISH_PATH.md "Unlock
  // rules"; treeSpUnits from), once that unit has an ability of its own; none, or one
  // never answered: the global level, as any unit.
  const abilityOf = (P, n, p = 0, from) => {
    const s = (P || {})[n] || {};
    if (typeof s.th !== 'number' && from && from !== n && typeof ((P || {})[from] || {}).th === 'number') return abilityOf(P, from, p);
    if (typeof s.th !== 'number') return s.lv ? ELO.th0 + Math.min(2, s.lv) : playerStart(P, n, p);
    return Math.min(ELO.hi, Math.max(ELO.lo, s.th + levelMove(P, n, s)));
  };
  // The global level's move since the genus's own last step (s.lt: the level then), weighed by the genus's own
  // uncertainty 1 / (1 + answers / ELO.n), the share its own Elo step gives a new answer: a genus with few answers leans
  // on the level, one with many on itself. Both ways (a one-way rise was tried: biased upward, it over-rated a simulated
  // beginner by 0.5-0.7). No new constant. Taken in at the genus's next own step (eloStep). A record with no s.lt:
  // nothing until that step.
  function levelMove(P, n, s) {
    const G = (P || {})[LEVEL];
    if (n === LEVEL || !s || typeof s.lt !== 'number' || !G || typeof G.th !== 'number') return 0;
    return Math.round(((G.th - s.lt) / (1 + ((s.ok || 0) + (s.ko || 0)) / ELO.n)) * 100) / 100;
  }
  // w (response time, rtWeight): the step's size times w; 1 by default. The volatility follows the plain surprise
  // either way.
  // p: the first-launch answer's prior (abilityOf, playerStart), for a genus never answered. S: the shared slope of the
  // answer model (scoreAnswer slopeOf: 1 unless the sheet estimates it).
  function eloStep(P, n, s, good, d, k, w = 1, p = 0, S = 1, from) {
    const th = abilityOf(P, n, p, from),
      g = 1 / k,
      e = g + (1 - g) * sigm(S * (th - d)),
      m = (s.ok || 0) + (s.ko || 0);
    s.vr = Math.round(((1 - ELO.vr) * (s.vr || 0) + ELO.vr * ((good ? 1 : 0) - e)) * 1000) / 1000;
    // The global level's step has no floor (ELO.kmin is for a genus, which must ease off quickly when it starts going
    // wrong): the level pools every answer and now moves every genus (levelMove), so it settles as answers build up
    // (Pelánek's uncertainty function), the volatility still letting it catch up with a lasting change. With the floor a
    // run of early misses sank it (one real player to -0.41 against a fit of 0.56) and dragged the genera with it.
    const K = Math.min(ELO.kmax, Math.max(n === LEVEL ? 0 : ELO.kmin, ELO.kmax / (1 + m / ELO.n)) * (1 + ELO.vg * Math.abs(s.vr)));
    // Kept to 4 decimals for the global level (2 for a genus): without the floor its steps fall under 0.005 after a few
    // hundred answers, and rounding them to 2 decimals would lose every one.
    const r = n === LEVEL ? 1e4 : 100;
    s.th = Math.round(Math.min(ELO.hi, Math.max(ELO.lo, th + w * K * ((good ? 1 : 0) - e))) * r) / r;
    // The level this step was taken against (the level before this answer's own step on it); scoreAnswer moves it on to
    // the level after that step, so the genus never takes its own answer twice.
    if (n !== LEVEL && P && P[LEVEL] && typeof P[LEVEL].th === 'number') s.lt = P[LEVEL].th;
    delete s.lv;
    delete s.run;
  }

  // Response time (rule L1: the seconds taken to answer are evidence about that answer, never a decay; docs/LEARNING.md
  // "Response time"): a right answer's two ability steps (the unit shown and the global level) are taken times w =
  // clamp(1 - K z, LO, HI), z = log(seconds) minus the median log(seconds) of the player's own earlier timed answers; w
  // 1 for a miss, an answer without seconds, a typed answer and the first MIN timed answers. The earlier times live in
  // the global level's record (P[LEVEL].rt: how many timed answers took each number of tenths of a second), so the
  // median is exact, two devices' records add up (mergeProgress) and the full replay rebuilds it (replayProgress).
  const RTIME = {K: 1.5, LO: 0.5, HI: 1.5, MIN: 10};
  // The tenths of a second of a timed answer, or 0 when it does not count (no seconds, 0, a typed answer: k infinite).
  const rtTenths = (sec, k) => (typeof sec === 'number' && isFinite(sec) && isFinite(k) ? Math.round(Math.min(600, sec) * 10) : 0);
  // The median log(seconds) of the times in rt, null with fewer than RTIME.MIN (the mean of the two middle ones when even).
  // The record's keys, sorted, are kept beside it (RT_KEYS) and kept in step by rtAdd, so a replay of a long log does not
  // sort them again at every right answer (the admin's replay of every player spent 0.2 s there on a phone).
  // Kept only for a record whose keys are still those it saw (another change to it: sorted again); same result.
  const RT_KEYS = new WeakMap();
  const rtKeys = rt => {
    const c = RT_KEYS.get(rt);
    if (c && c.n === Object.keys(rt).length) return c.ks;
    const ks = Object.keys(rt)
      .map(Number)
      .filter(x => x > 0)
      .sort((a, b) => a - b);
    RT_KEYS.set(rt, {ks, n: Object.keys(rt).length});
    return ks;
  };
  function rtMedian(rt) {
    const ks = rt && typeof rt === 'object' ? rtKeys(rt).filter(x => rt[x] > 0) : [],
      n = ks.reduce((t, x) => t + rt[x], 0);
    if (n < RTIME.MIN) return null;
    const at = i => {
      let c = 0;
      for (const x of ks) if ((c += rt[x]) > i) return Math.log(x / 10);
    };
    return n % 2 ? at((n - 1) / 2) : (at(n / 2 - 1) + at(n / 2)) / 2;
  }
  // The weight of a right answer's ability steps from its seconds, against the player's earlier times (G: P[LEVEL]).
  // ti (step 2 of the time in the photo rating, Q452; docs/LEARNING.md "The player's time net of the photo's"): the
  // question's photo time term (ptimeQ: how much longer than their habit everyone takes on its photos, in the same log
  // seconds), taken off z, so a slowness the photo explains no longer counts against the player (and a speed it explains
  // no longer counts for them); 0 by default, the rule before.
  function rtWeight(G, sec, k, good, ti = 0) {
    const x = rtTenths(sec, k),
      m = good && x > 0 ? rtMedian(G && G.rt) : null,
      t = typeof ti === 'number' && isFinite(ti) ? ti : 0;
    return m === null ? 1 : Math.min(RTIME.HI, Math.max(RTIME.LO, 1 - RTIME.K * (Math.log(x / 10) - m - t)));
  }
  // The answer's seconds added to the player's times (after its own steps: z is against the earlier answers only).
  function rtAdd(G, sec, k) {
    const x = rtTenths(sec, k);
    if (!G || x <= 0) return;
    G.rt = G.rt || {};
    G.rt[x] = (G.rt[x] || 0) + 1;
  }

  // One scorer for an answer (docs/LEARNING.md "One scorer"): the live game (quiz.js answer) and the full replay
  // (replayProgress) score an answer through scoreAnswer(P, q), so a rule is written once and both give the same state.
  // P: the player's progress, changed in place. q: t, c ('' for none or "I don't know"), ok, k (Infinity typed), chs,
  // cv (c is a unit of the game: it then takes a miss too, rule L2); ph the photo files seen, hint (a corallites hint
  // revealed after the answer: shown, never recognised); d0 (null: an answer that moves only the counts), fam, cf, look
  // (a boolean, or a function called after the offers are counted), R, Rc, df (taken by the ability steps' expectation
  // only); p, sec, timed, rt (true unless false: rtAdd records the seconds); z (a smaller fault's kind, weighed by
  // partOf); th, only for a row logged before the scorer (its logged th). Returns {th0, dm, e, w, look, rw}: the
  // ability before the answer, the question's difficulty with memory and mix-ups, the expected success (logged e), the
  // progress weight, the look-alike test and the time weight. What only the game knows stays in quiz.js answer, what
  // only the log knows in replayProgress. domIn: q.dom false keeps the former moving average; a record with s.dp, or
  // without s.pg, takes the domain-score bar.
  const domIn = (q, s) => q.dom !== false && (domOn(s) || typeof s.pg !== 'number');
  // The shared slope of the answer model: one input, used in the expectation (the ability step, the logged e) and in
  // the bar's posterior; 1 (the Elo's own) unless the game passes q.S.
  const slopeOf = q => (q && typeof q.S === 'number' && q.S > 0 ? q.S : 1);
  // mu: the genus offset gd of the genus the bar is for; df: this question's format offset, dt the typed format's (in
  // logits, a format easier than the app thought has a positive offset, as fmtOff, so the question counts as that much
  // easier: a 2-choice right answer, more often right than a 1 in 2 guess explains, proves less, and a 2-choice miss
  // weighs less; 0 unless the game passes the sheet's offsets).
  const domF = (q, mu) => ({mu: Number(mu) || 0, o: -(Number(q.df) || 0), t: -(Number(q.dt) || 0), S: slopeOf(q), z: partOf(q)});
  // A smaller fault (Q394 A, Pierre, 2026-11-17: "A"; docs/reviews/2026-11-18-species-step2-plan.md §3): on a species asked
  // by its scientific name, a common name typed is half a miss (cn), its genus alone (or with a second word no species of
  // the game has) a quarter of a miss (g); never a gain. The app names the kind (the answer's q.z, logged in its scoring
  // record, scoreRec z), the size is here, so a later size is one rules version and the whole log replays with it.
  // The sizes are starting values, read on the real answers later. The weight scales the miss's steps on the unit and
  // the global level (the bar's likelihood, the moving average, the Elo); its counts and recent results take a miss.
  const PART = {cn: 0.5, g: 0.25};
  const partOf = q => (q && !q.ok && typeof q.z === 'string' && Object.prototype.hasOwnProperty.call(PART, q.z) ? PART[q.z] : 1);
  // An answer scored on P (scoreStep, below). It writes the records' conf, off and ty and the level's tyk at different
  // points, so an armed false-alarm table (faArm) is off while it runs, every read of it a scan, and armed again empty
  // after it.
  function scoreAnswer(P, q) {
    if (!FAT.has(P)) return scoreStep(P, q);
    FAT.delete(P);
    try {
      return scoreStep(P, q);
    } finally {
      FAT.set(P, null);
    }
  }
  function scoreStep(P, q) {
    const t = q.t,
      ok = !!q.ok,
      k = q.k,
      chs = q.chs || [],
      rec = n => {
        const x = (P[n] = P[n] || {});
        x.ok = x.ok || 0;
        x.ko = x.ko || 0;
        x.h = x.h || '';
        return x;
      },
      s = rec(t);
    // The choices offered beside it and the genus given instead, before the weights (the player's own mix-up rate).
    chs.forEach(x => x !== t && ((s.off = s.off || {})[x] = (s.off[x] || 0) + 1));
    s[ok ? 'ok' : 'ko']++;
    s.streak = ok ? (s.streak || 0) + 1 : 0;
    if (!ok && q.c) (s.conf = s.conf || {})[q.c] = (s.conf[q.c] || 0) + 1;
    const scored = typeof q.d0 === 'number' && isFinite(q.d0),
      d0 = scored ? q.d0 : 0,
      fam = Number(q.fam) || 0,
      cf = Number(q.cf) || 0,
      R = typeof q.R === 'number' ? q.R : 1,
      p = Number(q.p) || 0,
      df = Number(q.df) || 0,
      zw = partOf(q), // a smaller fault's weight (Q394), 1 for any other answer
      dm = d0 + fam + cf,
      out = {dm, rw: 1, look: false, th0: null, e: null, w: null};
    if (scored) {
      // q.from, q.cfrom: the units the unit shown and the unit given start from when never answered (abilityOf from)
      const th0 = typeof q.th === 'number' ? q.th : abilityOf(P, t, p, q.from),
        look = typeof q.look === 'function' ? !!q.look() : !!q.look;
      let w = null;
      // The bar: the domain score from the player's own answers on the genus, the question's difficulty as the game
      // scores it (photo, memory, mix-ups), its format and recall (domStep); a record not rebuilt under these rules yet,
      // or a replay with q.dom false (rule D4), the moving average.
      if (domIn(q, s)) domStep(s, ok, dm, k, R, domF(q, q.mu));
      else {
        // The miss weighs against the aim at the player's level before this answer's own step on it.
        w = ok ? pgRightW(k, look) * pgMemW(th0, d0, fam, k, R) : pgMissW(th0, dm, k, R, aimOf((P[LEVEL] || {}).th)) * zw;
        s.pg = pgStep(pgOf(s), ok, w);
      }
      delete s.L; // BKT's knowledge, before s.pg
      s.u = (s.u || 0) + 1;
      // The ability: the genus shown against the question's difficulty with the memory and the mix-ups, a right answer's
      // step weighed by its time against the player's earlier ones, net of its photos' time term (q.ti; 0 without).
      const rw = q.timed === false ? 1 : rtWeight(P[LEVEL], q.sec, k, ok, Number(q.ti) || 0);
      eloStep(P, t, s, ok, dm - df, k, rw * zw, p, slopeOf(q), q.from);
      Object.assign(out, {th0, look, w, rw, e: 1 / k + (1 - 1 / k) * R * sigm(slopeOf(q) * (th0 - dm))});
    }
    // The global level: made at the first answer from the player's history (its counts hold this answer), then one step
    // each, with the same weight; this answer's seconds recorded after its steps (rtWeight compares with earlier ones).
    if (P[LEVEL]) P[LEVEL][ok ? 'ok' : 'ko']++;
    else P[LEVEL] = levelSeed(P);
    // Typed questions, every one and those on this genus (ty): any genus could have been typed, so each is a question where
    // any other genus was a possible answer, the false-alarm rate's denominator (faOf).
    if (!isFinite(k)) {
      // Per rank (rankKey: a fish family's f:, a genus's g:; the corals none): a typed answer can only be a unit of the
      // rank asked (quiz.js typeMatch), so only those are possible answers.
      const tk = (P[LEVEL].tyk = P[LEVEL].tyk || {}),
        rk = rankKey(t);
      tk[rk] = (tk[rk] || 0) + 1;
      s.ty = (s.ty || 0) + 1;
    }
    if (scored) {
      eloStep(P, LEVEL, P[LEVEL], ok, dm - df, k, out.rw * zw, p, slopeOf(q));
      // One surprise counted once (docs/LEARNING.md "One surprise, counted once"): the genus shown takes the level as it
      // stands after this answer's step on it, so its levelMove carries only the level's moves from the other answers
      // (against the level before, the genus would also take, at its next question, the level's step on this answer).
      s.lt = P[LEVEL].th;
    }
    if (q.rt !== false) rtAdd(P[LEVEL], q.sec, k);
    // Recent results over every game, newest last (an opening only after a right answer: model.js openRight).
    P[LEVEL].h = ((P[LEVEL].h || '') + (ok ? 1 : 0)).slice(-10);
    // The photos: those seen, shown and (a right answer) recognised; a hint revealed after the answer, shown only.
    const ps = (s.ps = s.ps || {});
    (q.ph || []).forEach(f => {
      const x = (ps[f] = ps[f] || [0, 0]);
      x[0]++;
      if (ok) x[1]++;
    });
    if (q.hint) (ps[q.hint] = ps[q.hint] || [0, 0])[0]++;
    s.h = (s.h + (ok ? 1 : 0)).slice(-10);
    // Rule L2: a wrong answer counts against the genus given too: its progress by the chance the player had on it
    // (its own ability now, against the photo's difficulty without the memory, which is of the genus shown; its recall
    // Rc after a break), a miss in its recent results, its run reset. Not its ability (docs/LEARNING.md "The genus wrongly
    // given in the Elo"): the Elo moves on the questions about the genus itself.
    if (!ok && q.cv && q.c && q.c !== t) {
      const x = rec(q.c);
      if (scored) {
        const Rc = typeof q.Rc === 'number' ? q.Rc : 1;
        // The bar: no miss in its posterior (a false alarm, counted by its record's offers and mix-ups and taken off its
        // bar by faOf); a record under the moving average (s.pg): a miss on the photo shown.
        if (!domIn(q, x)) x.pg = pgStep(pgOf(x), false, pgMissW(abilityOf(P, q.c, p, q.cfrom), d0, k, Rc, aimOf(P[LEVEL].th)));
        delete x.L;
        x.u = (x.u || 0) + 1;
      }
      x.h = (x.h + '0').slice(-10);
      x.streak = 0;
    }
    return out;
  }
  // The scoring record logged with each answer (docs/spec/sync.md "The Answers tab", Scoring; docs/LEARNING.md "One
  // scorer"): the inputs scoreAnswer had that the replay cannot rebuild from the log (quiz.js answer's sc; the replay
  // rows' index LOG_SC), so a replay scores what the game scored. d d0, f fam, c cf, l the look-alike test (1 or 0), r
  // R, g Rc, h the hint revealed after the answer, o df (the sheet's fmt as the game had it, so a replay never takes
  // today's offsets for an answer scored with others; f, c, r, g, h and o left out at their default: 0, 0, 1, 1, none,
  // 0); m, n, t, s the domain-score bar's; z the kind of a smaller fault (PART: 'cn' or 'g'); i the photos' time term
  // the answer's time was netted of (kept even at 0; absent: a row logged before it). Numbers to 3 decimals, as the
  // game rounds them before scoring (scoreIn). x: the record as an object or its JSON; null when it has no d.
  const SC_MAX = 50;
  const r3 = x => Math.round(x * 1000) / 1000;
  const scNum = x => (typeof x === 'number' && isFinite(x) && Math.abs(x) <= SC_MAX ? r3(x) : null);
  function scoreRec(x) {
    let o = x;
    if (typeof o === 'string') {
      if (!o || o[0] !== '{') return null;
      try {
        o = JSON.parse(o);
      } catch (e) {
        return null;
      }
    }
    if (!isObj(o) || scNum(o.d) === null) return null;
    const out = {d: scNum(o.d)};
    if (scNum(o.f)) out.f = scNum(o.f);
    if (scNum(o.c)) out.c = scNum(o.c);
    if (o.l === 1 || o.l === true) out.l = 1;
    if (scNum(o.r) !== null && scNum(o.r) !== 1 && o.r >= 0 && o.r <= 1) out.r = scNum(o.r);
    if (scNum(o.g) !== null && scNum(o.g) !== 1 && o.g >= 0 && o.g <= 1) out.g = scNum(o.g);
    if (typeof o.h === 'string' && /^[A-Za-z0-9_.-]{1,120}$/.test(o.h)) out.h = o.h;
    // The domain-score bar's inputs: m the genus offset of the genus shown and n that of the genus given (kept even at 0:
    // absent means an older row, whose replay takes the sheet's gd), o (above) the format's offset df, which the bar takes
    // too, and t the typed format's dt (left out at 0), s the shared slope (left out at 1).
    if (scNum(o.m) !== null) out.m = scNum(o.m);
    if (scNum(o.n) !== null) out.n = scNum(o.n);
    if (scNum(o.o)) out.o = scNum(o.o);
    if (scNum(o.t)) out.t = scNum(o.t);
    if (scNum(o.s) !== null && o.s > 0 && scNum(o.s) !== 1) out.s = scNum(o.s);
    // z: the kind of a smaller fault (PART: cn, g; Q394), left out for any other answer.
    if (typeof o.z === 'string' && Object.prototype.hasOwnProperty.call(PART, o.z)) out.z = o.z;
    if (scNum(o.i) !== null) out.i = scNum(o.i);
    return out;
  }
  // The game's inputs rounded as they are logged (scoreRec), before it scores with them.
  const scoreIn = q => ({
    ...q,
    d0: r3(q.d0),
    fam: r3(q.fam || 0),
    cf: r3(q.cf || 0),
    R: r3(q.R === undefined ? 1 : q.R),
    Rc: r3(q.Rc === undefined ? 1 : q.Rc),
    df: r3(q.df || 0),
    ...(typeof q.mu === 'number' ? {mu: r3(q.mu)} : {}),
    ...(typeof q.muc === 'number' ? {muc: r3(q.muc)} : {}),
    ...(typeof q.dt === 'number' ? {dt: r3(q.dt)} : {}),
    ...(typeof q.S === 'number' ? {S: r3(q.S)} : {}),
    ...(typeof q.ti === 'number' && isFinite(q.ti) ? {ti: r3(q.ti)} : {})
  });
  // The record of a question scored by scoreAnswer (q after scoreIn, res its result): what quiz.js answer logs as sc.
  const scoreLog = (q, res) =>
    scoreRec({
      d: q.d0,
      f: q.fam,
      c: q.cf,
      l: res.look ? 1 : 0,
      r: q.R,
      g: q.Rc,
      h: q.hint || undefined,
      m: q.mu,
      n: q.muc,
      o: q.df,
      t: q.dt,
      s: q.S,
      z: q.z,
      i: q.ti
    });

