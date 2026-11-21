  // Global player level (docs/LEARNING.md "Ability per genus (Elo) and the global level"; decision in
  // docs/decisions/2026-11-18-decisions-from-code-comments.md): playerStart gives the starting ability of a unit the
  // player has never answered: the global level (LEVEL, '~level', a pseudo-genus of the progress that syncs and merges
  // like one; without it, the mean ability of the units answered), shrunk towards p (the first-launch answer's level,
  // CHOICE below) with the weight START.N, times START.W, clamped to [START.LO, START.HI]. Taken once: the unit's first
  // answer saves its own ability (s.th).
  const LEVEL = '~level',
    START = {W: 0.8, N: 10, LO: -0.5, HI: 1.5};
  function playerStart(P, skip, p = 0) {
    P = P || {};
    const n = s => ((s && s.ok) || 0) + ((s && s.ko) || 0),
      G = P[LEVEL];
    let m = 0,
      t = 0;
    if (G && typeof G.th === 'number' && n(G)) {
      m = n(G);
      t = m * G.th;
    } else
      Object.keys(P).forEach(g => {
        const s = P[g] || {};
        if (g === skip || g === LEVEL || typeof s.th !== 'number' || !n(s)) return;
        m += n(s);
        t += n(s) * s.th;
      });
    p = typeof p === 'number' && isFinite(p) ? p : 0;
    if (!m && !p) return 0;
    const v = (START.W * (t + START.N * p)) / (m + START.N);
    return Math.round(Math.min(START.HI, Math.max(START.LO, v)) * 100) / 100;
  }

  // The first-launch question (docs/LEARNING.md "The first-launch question" and its fallback test; docs/spec/cards.md
  // "The record" and "The fallback card"): a forced choice among three that initialises a few variables of the model,
  // never a coded path (v.p, the level playerStart shrinks towards; v.basics, the basics module offered first). Each
  // subject asks its own (SUBJECTS start), stored in reefid-sync-<subject>-start (startKey) as {c, t, at, via, w, v,
  // hd, fb, h}. Inferred silently from ASK answers on (startInfer). The fallback (startCheck) reads the answers after
  // the choice (w) at AT answers only, against the band the answer predicts: 'lo' below its floor with one-sided
  // confidence ZL or the opening hold fired; 'hi' with MET units met, above its ceiling with confidence Z, the
  // first-answer level (levelFit) above it too.
  const CHOICE = {
    ASK: 50,
    AT: [40, 60], // the checkpoints of the fallback window (answers after the choice); the window ends at the last
    Z: 1.96,
    ZL: 0.84, // "lower": one-sided 80%
    MET: 10, // the slate genera met before a 'hi' verdict: the same as the open-all offer's (model.js INTRO.OFFER.MET)
    // [id, variables], in order from the lowest level to the highest (startBand); their words per subject: SUBJECTS start.
    opts: [
      ['new', {p: 0, basics: 1}],
      ['imr', {p: 0.5, basics: 0}],
      ['know', {p: 1.25, basics: 0}]
    ]
  };
  const startOpt = c => CHOICE.opts.find(o => o[0] === c) || null;
  // The variables of a choice (none yet, or an unknown one: the default player's).
  const startVars = c => (startOpt(c) || CHOICE.opts[0])[1];
  // The band of levels an answer predicts: [floor, ceiling], the edges midway between its prior and its neighbours'.
  function startBand(c) {
    const i = CHOICE.opts.findIndex(o => o[0] === c),
      p = j => CHOICE.opts[j][1].p;
    return [i > 0 ? (p(i - 1) + p(i)) / 2 : -Infinity, i >= 0 && i < CHOICE.opts.length - 1 ? (p(i) + p(i + 1)) / 2 : Infinity];
  }
  // The level that best explains answers A ([difficulty, guess rate, right]) on the ability scale (the app's
  // g + (1 - g) sigmoid(level - difficulty)), searched over ELO.lo..hi, and its standard error 1 / sqrt(information).
  const stSig = x => 1 / (1 + Math.exp(-x));
  const stP = (th, d, g) => g + (1 - g) * stSig(th - d);
  const stInfo = (th, d, g) => {
    const q = stSig(th - d),
      pr = stP(th, d, g);
    return ((1 - g) * q * (1 - q)) ** 2 / Math.max(1e-9, pr * (1 - pr));
  };
  const stSe = (th, A) =>
    1 /
    Math.sqrt(
      Math.max(
        1e-9,
        A.reduce((t, a) => t + stInfo(th, a[0], a[1]), 0)
      )
    );
  function levelFit(A) {
    let best = -Infinity,
      bt = 0;
    for (let i = 0, lo = -1.5, hi = 3; lo + i * 0.02 <= hi + 1e-9; i++) {
      const th = lo + i * 0.02,
        ll = A.reduce((t, a) => t + Math.log(a[2] ? stP(th, a[0], a[1]) : 1 - stP(th, a[0], a[1])), 0);
      if (ll > best) ((best = ll), (bt = th));
    }
    return [Math.round(bt * 100) / 100, stSe(bt, A)];
  }
  // The verdict at a checkpoint (AT: 40 or 60 answers after the choice), null between them and when consistent: 'lo'
  // or 'hi' (above: the opening hold alone is enough for 'lo'). w: the window's answers [d, g, right, first]; lv: the
  // global level now; met: the slate genera met; held: the opening hold fired in the window.
  function startCheck(w, c, lv, met, held) {
    const n = (w || []).length;
    if (!CHOICE.AT.includes(n) || !startOpt(c) || typeof lv !== 'number') return null;
    const [floor, ceil] = startBand(c),
      se = stSe(lv, w),
      z = CHOICE.Z;
    if (isFinite(floor) && (held || lv + CHOICE.ZL * se < floor)) return 'lo';
    if (met < CHOICE.MET || lv - z * se <= ceil) return null;
    // The guard: the first answers on each genus above the ceiling too (never a trigger on their own).
    const F = w.filter(a => a[3]);
    return F.length && levelFit(F)[0] > ceil ? 'hi' : null;
  }
  // The choices a fallback card offers: below the current one ('lo') or above it ('hi').
  const startNext = (c, dir) => {
    const i = CHOICE.opts.findIndex(o => o[0] === c);
    return (dir === 'lo' ? CHOICE.opts.slice(0, Math.max(0, i)).reverse() : CHOICE.opts.slice(i + 1)).map(o => o[0]);
  };
  // An existing player with ASK answers or more is not asked: the choice is inferred from their global level (the Elo
  // over all their answers, LEVEL), the choice whose starting level W x p is nearest (midpoints: under 0.2 new, under 0.7
  // imr, else know). Shown as "inferred" in the admin's player journey.
  function startInfer(P) {
    const G = (P || {})[LEVEL],
      t = G && typeof G.th === 'number' ? G.th : 0;
    return CHOICE.opts.reduce((b, o) => (Math.abs(START.W * o[1].p - t) < Math.abs(START.W * b[1].p - t) ? o : b))[0];
  }
  // The global record made at the first answer of a record without one: it starts from the player's history (every
  // answer so far, the answer-weighted mean ability of the genera), so their earlier answers keep counting.
  function levelSeed(P) {
    let ok = 0,
      ko = 0,
      m = 0,
      t = 0;
    Object.keys(P || {}).forEach(g => {
      const s = P[g] || {},
        n = (s.ok || 0) + (s.ko || 0);
      if (g === LEVEL) return;
      ok += s.ok || 0;
      ko += s.ko || 0;
      if (typeof s.th === 'number' && n) {
        m += n;
        t += n * s.th;
      }
    });
    return {ok, ko, th: m ? Math.round((t / m) * 100) / 100 : 0};
  }

  // An existing account at sign-in (two players can pick the same first name and code, so sync.js bindSync asks "Is it
  // you?" before entering it): what its saved progress, as the sheet's sign-in reply carries it (data, updated), says
  // about it. n: answers (the LEVEL record's ok + ko; 0 for a record without LEVEL), genera: genera answered, at: the
  // last answer (LEVEL.at, else the latest genus s.at, else the sheet's last save, then saved is true). A missing or
  // broken field counts as nothing, never as an error.
  function accountOf(data, updated) {
    let R = {};
    try {
      R = JSON.parse((data && data['reefid-sync-coral-progress']) || '{}');
    } catch (e) {}
    if (!isObj(R)) R = {};
    const num = x => (typeof x === 'number' && isFinite(x) && x > 0 ? x : 0),
      L = isObj(R[LEVEL]) ? R[LEVEL] : {},
      gs = Object.keys(R).filter(g => g !== LEVEL && isObj(R[g]) && num(R[g].ok) + num(R[g].ko) > 0);
    let at = num(L.at) || Math.max(0, ...gs.map(g => num(R[g].at))),
      saved = false;
    if (!at) {
      at = num(typeof updated === 'number' ? updated : Date.parse(String(updated || '')));
      saved = !!at;
    }
    return {n: num(L.ok) + num(L.ko), genera: gs.length, at, saved};
  }

  // Common first (docs/LEARNING.md "Common first"): the opening weight of each genus not met yet (model.js weighted) is
  // multiplied by sqrt((1 + cm) / (1 + median cm of those genera)), cm = how common the genus is near Dauin on
  // iNaturalist (data.json, tools/commonness.py). No constant: the square root damps it, the median makes it relative to
  // the genera still to open. A genus without cm counts as the median (factor 1).
  function commonFactor(cms) {
    const v = (cms || []).filter(x => typeof x === 'number' && x >= 0).sort((a, b) => a - b),
      h = v.length >> 1,
      med = v.length ? (v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2) : 0;
    return (cms || []).map(x => (typeof x === 'number' && x >= 0 ? Math.sqrt((1 + x) / (1 + med)) : 1));
  }

