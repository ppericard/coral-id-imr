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

  // Achievements (docs/spec/achievements.md "Achievements"): learning milestones only, never time or days played (rule
  // L8), plus the Contributions (kind 'contrib', at the end: reports sent). Each [id, title, description, tier (1
  // bronze, 2 silver, 3 gold), icon (its family), test] tests a snapshot the app builds (app.js achSnap): {total, met,
  // q: [genera at Open Water (>= 50%), Advanced (>= 80%), Divemaster (>= 85%, DOM.EX) or above; model.js MASTERY],
  // learned (Instructor), pct, streak (best run of right answers), duel, cor, hard, elo (0 until progress.js ELO_MIN),
  // group (an IMR lecture group fully learned), bonus (bonus genera met), basics (Coral basics done), fb (reports
  // counted, contribAdd)}.
  const ACH = [
    ['met10', 'Explorer', 'Met 10 genera', 1, '🧭', s => s.met >= 10],
    ['met20', 'Wide eyes', 'Met 20 genera', 1, '🧭', s => s.met >= 20],
    ['metall', 'Whole slate', 'Met every genus of the list', 2, '🧭', s => s.total && s.met >= s.total],
    ['q25a', 'Open Water: 5 genera', '5 genera at Open Water level or above (50%+)', 1, '🌱', s => s.q[0] >= 5],
    ['q25b', 'Open Water: 10 genera', '10 genera at Open Water level or above', 1, '🌱', s => s.q[0] >= 10],
    ['q25c', 'Open Water: 20 genera', '20 genera at Open Water level or above', 2, '🌱', s => s.q[0] >= 20],
    ['q50a', 'Advanced: 5 genera', '5 genera at Advanced level or above (80%+)', 1, '🌿', s => s.q[1] >= 5],
    ['q50b', 'Advanced: 10 genera', '10 genera at Advanced level or above', 2, '🌿', s => s.q[1] >= 10],
    ['q50c', 'Advanced: 20 genera', '20 genera at Advanced level or above', 2, '🌿', s => s.q[1] >= 20],
    ['q75a', 'Divemaster: 5 genera', '5 genera at Divemaster level or above (85%: their mastery exam is on)', 2, '🪸', s => s.q[2] >= 5],
    ['q75b', 'Divemaster: 10 genera', '10 genera at Divemaster level or above', 2, '🪸', s => s.q[2] >= 10],
    ['learn1', 'First Instructor', "You passed a genus's mastery exam: you could teach it", 2, '🎓', s => s.learned >= 1],
    ['learn5', 'Instructor: 5 genera', 'Mastery exam passed on 5 genera', 3, '🎓', s => s.learned >= 5],
    ['learn10', 'Instructor: 10 genera', 'Mastery exam passed on 10 genera', 3, '🎓', s => s.learned >= 10],
    ['learn20', 'Instructor: 20 genera', 'Mastery exam passed on 20 genera', 3, '🎓', s => s.learned >= 20],
    ['learnall', 'Coral master', 'You know every genus of the list for sure', 3, '👑', s => s.total && s.learned >= s.total],
    ['pct5', 'First steps', '5% progress', 1, '📈', s => s.pct >= 5],
    ['pct10', 'On the way', '10% progress', 1, '📈', s => s.pct >= 10],
    ['pct25', 'A quarter', '25% progress', 2, '📈', s => s.pct >= 25],
    ['pct50', 'Half the slate', '50% progress', 2, '📈', s => s.pct >= 50],
    ['pct75', 'Three quarters', '75% progress', 3, '📈', s => s.pct >= 75],
    ['pct100', 'Complete', '100% progress', 3, '📈', s => s.pct >= 100],
    ['run10', 'On a roll', '10 right in a row in the Quiz: your eye is getting sharp', 1, '🔥', s => s.streak >= 10],
    ['run25', 'Unstoppable', '25 right in a row in the Quiz: a sharp eye', 2, '🔥', s => s.streak >= 25],
    ['duel', 'Look-alike slayer', 'You told two look-alikes apart', 1, '⚔️', s => s.duel],
    ['cor', 'Corallite reader', 'You named a genus from its corallites alone', 1, '🔬', s => s.cor],
    ['hard', 'Sharp eye', 'You named a photo most players miss, in the Quiz', 2, '🎯', s => s.hard],
    ['elo1100', 'Elo 1100', 'Reached an Elo of 1100', 1, '⭐', s => s.elo >= 1100],
    ['elo1200', 'Elo 1200', 'Reached an Elo of 1200', 2, '⭐', s => s.elo >= 1200],
    ['elo1300', 'Elo 1300', 'Reached an Elo of 1300', 3, '⭐', s => s.elo >= 1300],
    ['elo1400', 'Elo 1400', 'Reached an Elo of 1400', 3, '🌟', s => s.elo >= 1400],
    ['group', 'Group complete', 'You know a whole IMR lecture group', 3, '🧩', s => s.group],
    ['bonus', 'Off the list', 'You met a bonus genus, off the IMR list', 2, '🔓', s => s.bonus >= 1],
    // Coral basics done: every step of the module seen (proto/basics.js), a
    // learning milestone like the others (the words the ID tips use), reached in about 5 minutes by those who take it.
    ['basics', 'Coral basics', 'You know the words the ID tips use: polyp, corallite, septa, walls, growth forms', 1, '📖', s => s.basics],
    // Contributions: a family of its own, apart from the learning ones above, for the players who send reports and
    // feedback, to encourage it and show it is taken seriously. kind 'contrib': never in the learning
    // count (progress.js badge, viewAch), every tier pops up right after the report that earns it (progress.js achCheck).
    // s.fb = reports counted (contribAdd).
    ['fb1', 'First feedback', 'You sent your first report. Every report is read: thank you!', 1, '💬', s => s.fb >= 1, 'contrib'],
    ['fb5', 'Helping hand', '5 reports sent: you are making the app better', 2, '💬', s => s.fb >= 5, 'contrib'],
    ['fb10', 'Co-author', '10 reports sent: the app owes you a lot', 3, '💬', s => s.fb >= 10, 'contrib']
  ].map(([id, title, desc, tier, icon, test, kind = 'learn']) => ({id, title, desc, tier, icon, test, kind}));
  // The fish achievements (docs/LEARNING.md "Fish achievements, around the global score"). Learning milestones only
  // (rule L8), tested on the fish snapshot (progress.js achSnap: the same fields over the fish slate; core = the IMR
  // course's families; circ = each circle's families, Advanced or above counted; sets.sci = scientific genera at Open
  // Water or above, setsAdv.sci at Advanced or above; pct = the global fish score, treeScore's %), in the shared record
  // under ids starting with f, so a fish achievement never counts in the corals' (SUBJECTS achs). Names short, fun and
  // diver-flavoured; descriptions plain and exact. fpct25 is retired: the recount (progress.js ACH_V, achMigrate)
  // removes it from every record. Timing simulated with the real fish game (tools/learnsim.js --subject fish --ach).
  const FISH_ACH = [
    // Fish basics done: every step of the module seen (proto/fishbasics.js; its feat SUBJECTS fish basics.feat, read by
    // progress.js achSnap), the twin of the corals' "Basics" (one 📖 bronze). A learning milestone like the others, earned
    // by finishing the module (a fixed number of screens), never after a number of answers or an amount of time; not in
    // ACH_LEARN (nothing takes it back).
    [
      'fbasics',
      'Fin to tail',
      'You know what to look at first on a reef fish: body shape, the groups, fins, tails and markings',
      1,
      '📖',
      s => s.basics
    ],
    ['fmet5', 'Meet the neighbours', 'Met 5 fish families', 1, '🧭', s => s.met >= 5],
    ['fmetcore', 'Roll call', 'Met every family of the IMR course', 2, '🧭', s => s.core.total && s.core.met >= s.core.total],
    ['fmetall', 'Full logbook', 'Met every fish family in the game', 2, '🧭', s => s.total && s.met >= s.total],
    ['fq50a', 'Certified', '5 families at Open Water level or above (50%+)', 1, '🌱', s => s.q[0] >= 5],
    ['fq50b', "School's in", '20 families at Open Water level or above', 2, '🌱', s => s.q[0] >= 20],
    ['fq80a', 'Night diver', '5 families at Advanced level or above (80%+)', 1, '🌿', s => s.q[1] >= 5],
    ['fq80b', 'Deep diver', '15 families at Advanced level or above', 2, '🌿', s => s.q[1] >= 15],
    ['fq95a', 'Dive guide', '5 families at Divemaster level or above (85%: their mastery exam is on)', 2, '🐠', s => s.q[2] >= 5],
    ['flearn1', 'First briefing', "You passed a family's mastery exam: you could teach it", 2, '🎓', s => s.learned >= 1],
    ['flearn10', 'Course director', 'Mastery exam passed on 10 families', 3, '🎓', s => s.learned >= 10],
    ['flearn30', 'Fish whisperer', 'Mastery exam passed on 30 families', 3, '🎓', s => s.learned >= 30],
    // The circles (the IMR course's families, those that open right after them, those beyond the course).
    [
      'fcoreadv',
      'House reef',
      'Every family of the IMR course at Advanced level or above (80%+)',
      2,
      '🗺️',
      s => s.core.total && s.core.adv >= s.core.total
    ],
    [
      'fc2',
      'Supporting cast',
      'Every family that opens right after the IMR course’s at Advanced level or above',
      2,
      '🗺️',
      s => !!(s.circ && s.circ[1] && s.circ[1].total && s.circ[1].adv >= s.circ[1].total)
    ],
    [
      'fc3adv',
      'Muck diver',
      '20 families beyond the IMR course at Advanced level or above',
      3,
      '🗺️',
      s => !!(s.circ && s.circ[2] && s.circ[2].adv >= 20)
    ],
    [
      'flearncore',
      'Transect master',
      'You know every family of the IMR course for sure',
      3,
      '👑',
      s => s.core.total && s.core.learned >= s.core.total
    ],
    // The global fish score (treeScore), every 10 points; 50% is the families' anchor.
    ['fpct10', 'Giant stride', '10% fish progress', 1, '📈', s => s.pct >= 10],
    ['fpct20', 'Bubble trail', '20% fish progress', 1, '📈', s => s.pct >= 20],
    ['fpct30', 'Reef crest', '30% fish progress', 2, '📈', s => s.pct >= 30],
    ['fpct40', 'Down the wall', '40% fish progress', 2, '📈', s => s.pct >= 40],
    ['fpct50', 'Family reunion', '50% fish progress: what knowing every family for sure is worth', 3, '📈', s => s.pct >= 50],
    ['fpct60', 'Blue water', '60% fish progress', 3, '📈', s => s.pct >= 60],
    // 70% needs the species by their scientific names (families, genera and common names top out lower; Q259-Q264, the
    // name Q299).
    ['fpct70', 'Twilight zone', '70% fish progress', 3, '📈', s => s.pct >= 70],
    // The scientific genera (an opt-in set, SUBJECTS optin sci).
    [
      'fsci5',
      'Latin lessons',
      '5 scientific genera at Open Water level or above: you can name them as EventMeasure does',
      2,
      '🏷️',
      s => (s.sets.sci || 0) >= 5
    ],
    ['fgen20', 'Name dropper', '20 scientific genera at Advanced level or above (80%+)', 2, '🏷️', s => ((s.setsAdv || {}).sci || 0) >= 20],
    ['fgen60', 'Walking field guide', '60 scientific genera at Advanced level or above', 3, '🏷️', s => ((s.setsAdv || {}).sci || 0) >= 60],
    // The species named by a common name: a species named at Advanced, its common-name unit's bar at 80%.
    ['fsp1', 'First name terms', 'A species at Advanced level (80%+) by its common name', 1, '🐟', s => ((s.setsAdv || {}).sp || 0) >= 1],
    ['fsp10', 'Name tags', '10 species at Advanced level or above by their common names', 2, '🐟', s => ((s.setsAdv || {}).sp || 0) >= 10],
    [
      'fsp50',
      'Fish ID nerd',
      '50 species at Advanced level or above by their common names',
      3,
      '🐟',
      s => ((s.setsAdv || {}).sp || 0) >= 50
    ],
    // The species named by their scientific names (docs/reviews/2026-11-18-species-step2-plan.md §2.6): named once the
    // scientific name's bar reaches Advanced (Q262); the names Q299's.
    ['fspsci1', 'Binomial', 'A species at Advanced level (80%+) by its scientific name', 1, '🏷️', s => ((s.setsAdv || {}).ssp || 0) >= 1],
    [
      'fboth25',
      'Bilingual',
      '25 species at Advanced level or above by both their common and scientific names',
      2,
      '🐟',
      s => (s.both || 0) >= 25
    ],
    [
      'fdauin20',
      'Local legend',
      "Dauin's top 20 (the 20 species of the IMR course's families most seen around Dauin) at Advanced level or above by their scientific names",
      3,
      '🗺️',
      s => !!(s.top && s.top.total && s.top.adv >= s.top.total)
    ]
  ].map(([id, title, desc, tier, icon, test, kind = 'learn']) => ({id, title, desc, tier, icon, test, kind}));
  // The sea slug achievements, modelled on FISH_ACH over the sea slugs' own structure: genera met, genera at each level,
  // families with every genus at Advanced, the taxonomic groups (the nudibranchs first), the first circle, the sea slug %
  // every 10 points.
  // Learning milestones only, never time (rule L8), tested on the sea slug snapshot (progress.js achSnap: met, q, learned
  // over its genera; circ, each circle's genera; fam, its families with every genus at Advanced or above; tax, each
  // taxonomic group of the tree's taxa, its genera met and at Advanced or above; pct, its headline %), in the shared record
  // under ids starting with ss. SEA_NUDI: the nudibranchs' taxonomic groups (seaslug.json taxa groups 1 and 2,
  // Nudibranchia · Doridina and · Cladobranchia; tests/seaslugach.test.js checks it against the file).
  const SEA_NUDI = [1, 2],
    seaTax = (s, f) => ((s && s.tax) || []).filter(f),
    seaPct = (id, p, name, tier) => [id, name, p + '% sea slug progress', tier, '📈', s => s.pct >= p];
  const SEASLUG_ACH = [
    ['ssmet5', 'Slug spotter', 'Met 5 sea slug genera', 1, '🧭', s => s.met >= 5],
    ['ssmetall', 'Muck stick', 'Met every sea slug genus in the game', 2, '🧭', s => s.total && s.met >= s.total],
    ['ssq50', 'Rhinophore reader', '10 genera at Open Water level or above (50%+)', 1, '🌱', s => s.q[0] >= 10],
    ['ssq80', 'Macro lens', '10 genera at Advanced level or above (80%+)', 1, '🌿', s => s.q[1] >= 10],
    ['ssq95', 'Slug guide', '5 genera at Divemaster level or above (85%: their mastery exam is on)', 2, '🐌', s => s.q[2] >= 5],
    ['sslearn1', 'Slug whisperer', "You passed a genus's mastery exam: you could teach it", 2, '🎓', s => s.learned >= 1],
    ['ssfam5', 'Family portraits', '5 families with every genus at Advanced level or above (80%+)', 2, '🌳', s => (s.fam || 0) >= 5],
    [
      'ssc1adv',
      'Greatest hits',
      'Every genus the quiz opens first (the most seen in the Philippines) at Advanced level or above',
      2,
      '🗺️',
      s => !!(s.circ && s.circ[0] && s.circ[0].total && s.circ[0].adv >= s.circ[0].total)
    ],
    [
      'ssnudi',
      'Naked gills',
      'Every nudibranch genus (Doridina and Cladobranchia) at Advanced level or above',
      3,
      '🔬',
      s => {
        const L = seaTax(s, t => SEA_NUDI.includes(t.n));
        return L.length > 0 && L.every(t => t.total && t.adv >= t.total);
      }
    ],
    [
      'ssother',
      'Beyond nudibranchs',
      'A genus of each other group (Sacoglossa, Cephalaspidea, Aplysiida, Pleurobranchida) at Advanced level or above',
      2,
      '🔬',
      s => {
        const L = seaTax(s, t => !SEA_NUDI.includes(t.n) && t.total);
        return L.length > 0 && L.every(t => t.adv >= 1);
      }
    ],
    seaPct('sspct10', 10, 'Slow and steady', 1),
    seaPct('sspct20', 20, 'Slime trail', 1),
    seaPct('sspct30', 30, 'Colour chart', 2),
    seaPct('sspct40', 40, 'Torch light', 2),
    seaPct('sspct50', 50, 'Half the reef', 3),
    // Beyond 50%, every 10 points up to 100%, as the corals' (pct75, pct100) and the fish's (fpct60) climb: the sea slugs
    // have no species unit yet, so their % is the mean of the genera's bars and 100% needs every genus learned (names
    // and tiers: docs/decisions/2026-11-18-seaslug-achievements-high.md).
    seaPct('sspct60', 60, 'Gill and frill', 3),
    seaPct('sspct70', 70, 'Muck magnet', 3),
    seaPct('sspct80', 80, 'Slug savant', 3),
    seaPct('sspct90', 90, 'Nudibranch nerd', 3),
    // 100% shows rounded (77 genera learned and one at 95% make 100), so it also asks every genus learned;
    // it rests on genera learned, so ACH_LEARN takes it back with a learned mark.
    [
      'sspct100',
      'Every last slug',
      '100% sea slug progress: every genus learned',
      3,
      '📈',
      s => s.pct >= 100 && s.total > 0 && s.learned >= s.total
    ]
  ].map(([id, title, desc, tier, icon, test, kind = 'learn']) => ({id, title, desc, tier, icon, test, kind}));
  // The Contributions (kind 'contrib') are one family for every subject, listed with the corals' (ACH) and shown on every
  // subject's page; achFind: an achievement of any list by its id (the corals', then each subject's own: SUBJECTS achs).
  const ACH_CONTRIB = ACH.filter(a => a.kind === 'contrib');
  const achFind = id =>
    [ACH, ...SUBJECTS.filter(S => S.ach && S.achs() !== ACH).map(S => S.achs())].reduce(
      (x, L) => x || L.find(a => a.id === id) || null,
      null
    );
  // Reports that count for the Contributions: every report sent (game, enlarged photo, genus
  // sheet, Send feedback), signed in or not; one per photo: a report on photos already in a counted report does not count
  // again (several reports on one photo count once); an "Other" report counts only with a note. A counted report goes into
  // the achievements record's _fb (synced like the rest; mergeAch joins two devices' lists): its photos joined by a space,
  // or r:<id> for a report on no photo. CONTRIB_MAX entries are kept, more than the top tier needs.
  const CONTRIB_MAX = 50;
  const contribPhotos = r =>
    String((r && r.ph) || '')
      .split(/\s+/)
      .filter(Boolean);
  function contribKey(r, have) {
    if (!r || !r.id || (r.why === 'other' && !String(r.note || '').trim())) return '';
    const ph = contribPhotos(r);
    if (!ph.length) return 'r:' + r.id;
    const done = new Set((have || []).flatMap(k => (k.startsWith('r:') ? [] : k.split(' '))));
    return ph.some(f => done.has(f)) ? '' : ph.join(' ');
  }
  // Two devices' lists of counted reports (mergeAch): b's entries join a's by the same rule, so one photo reported on
  // each device before they synced counts once; the last CONTRIB_MAX.
  function contribJoin(a, b) {
    const out = Array.isArray(a) ? [...a] : [];
    (Array.isArray(b) ? b : []).forEach(k => {
      if (typeof k !== 'string' || !k || out.includes(k)) return;
      if (k.startsWith('r:') || contribKey({id: 'x', ph: k}, out)) out.push(k);
    });
    return out.slice(-CONTRIB_MAX);
  }
  // Counts report r into the record A (changes A._fb); true when it counted.
  function contribAdd(A, r) {
    const have = Array.isArray(A && A._fb) ? A._fb : [],
      k = contribKey(r, have);
    if (!A || !k || have.includes(k)) return false;
    A._fb = [...have, k].slice(-CONTRIB_MAX);
    return true;
  }
  // The achievements a snapshot meets that `have` ({id: time}) does not hold yet, in list order.
  const newAch = (snap, have, list = ACH) => list.filter(a => !(have || {})[a.id] && a.test(snap)).map(a => a.id);
  // The full recount from the current progress (progress.js achMigrate, achPending): into B, every achievement of list
  // that the snapshot meets, dated by the
  // earliest of B's own (a copy already recounted, merged in) and old's (the record before the recount), else t. What the
  // snapshot does not meet is left out (an achievement of an older record never comes back through a merge: mergeAch
  // takes no achievement from a record of another version). Changes B; returns the ids it holds from list.
  function achRecount(B, old, list, snap, t) {
    const ok = x => typeof x === 'number' && x > 0;
    return (list || [])
      .filter(a => a.test(snap))
      .map(a => {
        const d = [B[a.id], old && old[a.id]].filter(ok);
        B[a.id] = d.length ? Math.min(...d) : t;
        return a.id;
      });
  }
  // Achievements taken back: only those that rest on genera learned, and only when a recalculation
  // takes a learned mark away (model.js mxRecalc, progress.js achRecheck); anywhere else achievements are only added.
  // achRevoke removes from A ({id: time}) those of ACH_LEARN that the snapshot no longer meets, and dates in A._gone
  // {id: time} every one of them the snapshot does not meet, held here or not: the tombstone keeps a copy earned before
  // (the sheet's, another device's not merged yet) from coming back through a merge (mergeAch); earned again later, the
  // achievement carries a newer time and stays. Returns the ids removed.
  const ACH_LEARN = [
    'learn1',
    'learn5',
    'learn10',
    'learn20',
    'learnall',
    'group',
    'flearn1',
    'flearn10',
    'flearn30',
    'flearncore',
    'sslearn1',
    'sspct100'
  ];
  // list: the achievements the snapshot is about (a subject's own: SUBJECTS achs), the corals' by default.
  function achRevoke(A, snap, t, list = ACH) {
    if (!A || typeof A !== 'object') return [];
    const off = list.filter(a => ACH_LEARN.includes(a.id) && !a.test(snap)).map(a => a.id),
      out = off.filter(id => A[id]);
    if (off.length) A._gone = {...(A._gone || {})};
    off.forEach(id => {
      delete A[id];
      A._gone[id] = Math.max(t, A._gone[id] || 0);
    });
    return out;
  }
  // "Your feedback helped" (docs/spec/achievements.md "Your feedback helped"): the player who sent a report is thanked
  // once it is handled. The achievements record keeps the ids of the reports the player sent (_rep) and those already
  // thanked (_thx), the last LIST_MAX of each, synced and joined across devices (mergeAch); ids only: nothing the admin
  // wrote reaches the player. repsAdd adds ids (true when A changed); helpedDue returns the ids to thank now ([] within
  // HELPED_GAP of _thxAt, the last thanks); helpedMark marks them thanked at `now`.
  const REP_ID = /^[a-z0-9]{1,20}$/,
    LIST_MAX = {_fb: CONTRIB_MAX, _rep: 100, _thx: 200};
  function repsAdd(A, ids) {
    const have = Array.isArray(A && A._rep) ? A._rep : [],
      add = [...new Set((ids || []).map(String))].filter(x => REP_ID.test(x) && !have.includes(x));
    if (!A || !add.length) return false;
    A._rep = [...have, ...add].slice(-LIST_MAX._rep);
    return true;
  }
  // Reports handled in a PR: reports-handled.json {"<report id>": {pr, at}}, edited in PRs by the
  // integrator (agents never write curation.json), counts as Pierre's Done (curation.json seen 'rep:<id>'): handledSeen
  // returns the 'rep:<id>' keys of both, the one map helpedDue and the admin read.
  function handledSeen(seen, file) {
    const out = {};
    Object.keys(seen && typeof seen === 'object' ? seen : {}).forEach(k => k.startsWith('rep:') && seen[k] && (out[k] = 1));
    Object.keys(file && typeof file === 'object' && !Array.isArray(file) ? file : {}).forEach(
      id => REP_ID.test(id) && (out['rep:' + id] = 1)
    );
    return out;
  }
  const HELPED_GAP = 7 * 864e5;
  function helpedDue(A, seen, now) {
    if (!A || !seen || typeof seen !== 'object') return [];
    if (typeof A._thxAt === 'number' && now - A._thxAt < HELPED_GAP) return [];
    const thx = Array.isArray(A._thx) ? A._thx : [];
    return (Array.isArray(A._rep) ? A._rep : []).filter(id => seen['rep:' + id] && !thx.includes(id));
  }
  function helpedMark(A, ids, now) {
    if (!A || !(ids || []).length) return;
    const thx = Array.isArray(A._thx) ? A._thx : [];
    A._thx = [...thx, ...ids.filter(id => !thx.includes(id))].slice(-LIST_MAX._thx);
    A._thxAt = Math.max(now, typeof A._thxAt === 'number' ? A._thxAt : 0);
  }
  // Two achievement records of one player (progress.js achMerge: another device's, the sheet's, this device's before
  // signing in): every achievement with its earliest date, the best run kept; the current run (_run) stays A's. A record of
  // another version than v (progress.js ACH_V: counted on older rules) brings its feats (keys starting with _) but not its
  // achievements. Removals (_gone) join, the latest per id; an achievement dated at or before its removal, on either side,
  // is dropped (taken back, it must be earned again). Changes and returns A.
  function mergeAch(A, ra, v) {
    A = A && typeof A === 'object' ? A : {};
    if (!ra || typeof ra !== 'object') return A;
    const old = ra._v !== v,
      gone = {...(A._gone || {})};
    Object.entries(ra._gone || {}).forEach(([k, t]) => typeof t === 'number' && !(gone[k] >= t) && (gone[k] = t));
    const off = (k, t) => typeof gone[k] === 'number' && !(t > gone[k]);
    Object.keys(ra).forEach(k => {
      if (k === '_run' || k === '_v' || k === '_gone' || (old && k[0] !== '_') || off(k, ra[k])) return;
      // A list: the Contributions' _fb by their rule (contribJoin), any other (the reports sent _rep and thanked _thx)
      // both devices' entries, each once, the last LIST_MAX.
      if (k === '_fb') return (A[k] = contribJoin(A[k], ra[k]));
      if (Array.isArray(ra[k]))
        return (A[k] = [...new Set([...(Array.isArray(A[k]) ? A[k] : []), ...ra[k]])].slice(-(LIST_MAX[k] || CONTRIB_MAX)));
      A[k] = k === '_best' || k === '_thxAt' ? Math.max(A[k] || 0, ra[k] || 0) : A[k] && !off(k, A[k]) ? Math.min(A[k], ra[k]) : ra[k];
    });
    Object.keys(gone).forEach(k => off(k, A[k]) && delete A[k]);
    if (Object.keys(gone).length) A._gone = gone;
    return A;
  }

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

  // The genera the games play, defined once for the app, the admin and tools/fetch_local.py (tools/genera.py reads the
  // two lists below from this file; docs/spec/quiz.md "Bonus genera", docs/LEARNING.md "Millepora and the bonus
  // genera"): BENTHIC, Millepora, a slate genus (app.js isBenthic); BONUS, the opt-in genera off the slate, never
  // counted in the progress. slateOf(d) = the slate as the games and the progress count it (app.js slateGenera);
  // gameOf(d) = every genus a game can ask (slate + BONUS), the admin's game genera; the rest of data.json "x" are
  // Key-only. d = data.json as served ({gen, x: {gen}}), or the admin's copy, whose DATA.gen also holds the "x" genera:
  // a genus of d.x.gen is never a slate genus by its key in d.gen.
  const BENTHIC = ['Millepora'],
    BONUS = ['Isopora', 'Leptoseris', 'Heliopora', 'Sandalolitha', 'Pleuractis'];
  const xGen = d => (d && d.x && d.x.gen) || {};
  function slateOf(d) {
    const X = xGen(d);
    return [...Object.keys((d && d.gen) || {}).filter(n => !X[n]), ...BENTHIC.filter(n => X[n])];
  }
  function gameOf(d) {
    const X = xGen(d);
    return [...slateOf(d), ...BONUS.filter(n => X[n])];
  }
  // The game photos of a subject's units, for the sheet's photo exposure per player (docs/LEARNING.md "Photo exposure";
  // docs/reviews/2026-11-06-photo-exposure-study.md), as its games can draw them: SUBJECTS pool names the site's files a
  // subject reads and its builder here, which gets them parsed, in that order. slots: data.json with Pierre's curation
  // and the photos per context applied (as app.js build), the game list of every game genus (gameOf) in each view;
  // entries: the photos of each entry played (treePhotos, treeGen views.wide). Only which photos are in play matters
  // here, not their order (no picks, no automatic quality). Not applied: the Colony slot's "form not visible" rule
  // (model.js photoSet: a handful of photos, most kept by the one-form exception, which needs app.js imrFormsOf).
  const POOLS = {
    slots: ([raw, cur]) => {
      const d = JSON.parse(JSON.stringify(raw)),
        out = {};
      applyCuration(d, cur);
      applySlots(d, cur);
      if (d.x) {
        const x = {gen: d.x.gen, course: {}, cand: d.cand};
        applyCuration(x, cur);
        applySlots(x, cur);
      }
      gameOf(raw).forEach(n => {
        const g = d.gen[n] || xGen(d)[n];
        // The games' Research Grade rule for the genera off data.json gen (app.js gamePhotoOk: Millepora, the bonus
        // genera).
        if (g) out[n] = VIEWS.flatMap(([v]) => ((g.sl || {})[v] || {}).game || []).filter(p => !g.x || p.own || !p.gid);
      });
      return out;
    },
    // entries: a tree subject's files by what each is (SUBJECTS pool as: f, ph, gm, cur), its part of the curation
    // (treeCur), its units at its unit rank (unitRankOf: the sea slugs' genera, the fish's families); a subject whose
    // units are below its families (treeGen unit) keeps those units only, its families being structure.
    entries: (L, S) => {
      const as = (S && S.pool && S.pool.as) || [],
        x = k => (as.includes(k) ? L[as.indexOf(k)] : null),
        ph = x('ph') || {},
        F = treeGen(
          x('f') || {},
          treePhotos(ph.photos, (treeGameRead(x('gm')) || {}).photos, treeCur(S, x('cur'))),
          ph.sheet,
          unitRankOf(S)
        );
      return Object.fromEntries(
        Object.values(F.gen)
          .filter(g => !g.wink && (!F.unit || g.rank === F.unit))
          .map(g => [g.id, g.views.wide])
      );
    }
  };
  // unitPool(S, files): {unit: [[photo file, …] for each colony]}, subject S's game photos grouped by colony (one
  // observation, o; a photo without one stands alone), its units under the ids its answer log holds (renamedId, with the
  // photo's species: a fish entry logs as its family); null when S names no pool or one of its files is missing.
  function unitPool(S, files) {
    const P = S && S.pool,
      make = P && POOLS[P.of];
    if (!make || !Array.isArray(files) || files.length < P.files.length || files.some(x => !x)) return null;
    const by = {};
    Object.entries(make(files, S) || {}).forEach(([n, L]) =>
      (L || []).forEach(p => {
        if (!p || !p.f) return;
        const O = (by[renamedId(S, n, p.t)] = by[renamedId(S, n, p.t)] || {}),
          c = (O[String(p.o || p.f)] = O[String(p.o || p.f)] || []);
        if (!c.includes(p.f)) c.push(p.f);
      })
    );
    return Object.fromEntries(Object.entries(by).map(([u, O]) => [u, Object.values(O)]));
  }
  // exposureOf(rows, pool): each player's photo exposure in one subject, from that subject's answer-log rows ([player,
  // time ms, unit shown, answered, right, mode, photos], any order)
  // and its unitPool: {player: [seen, of, hit, asked, units]}.
  // - Seen % = seen / of: the distinct game photos the player has been shown, out of the game photos of the units they
  //   have met (a question on it; units: how many, those with no game photo left out).
  // - Spread % = hit / asked, in time order: of the questions on a unit asked while it still had game colonies the player
  //   had never been shown, the share that showed one (a colony is one observation; a photo out of play now counts as a
  //   colony of its own). A count of colonies seen against questions would hide repeats (A, A, B scores 100%).
  function exposureOf(rows, pool) {
    const P = pool || {},
      col = new Map(),
      by = Object.create(null); // by player, no prototype (trustOf)
    Object.entries(P).forEach(([u, L]) => L.forEach((c, i) => c.forEach(f => col.set(u + '|' + f, i))));
    (rows || [])
      .map((r, i) => [r, i])
      .filter(([r]) => r && r[0] && P[r[2]] && String(r[6] || '').trim())
      .sort((a, b) => (Number(a[0][1]) || 0) - (Number(b[0][1]) || 0) || a[1] - b[1])
      .forEach(([r]) => {
        const u = String(r[2]),
          b = (by[r[0]] = by[r[0]] || {hit: 0, asked: 0, U: {}}),
          s = (b.U[u] = b.U[u] || {ph: new Set(), co: new Set(), left: P[u].length}),
          fs = String(r[6]).split(/\s+/).filter(Boolean),
          cs = new Set(fs.map(f => (col.has(u + '|' + f) ? col.get(u + '|' + f) : 'out|' + f)));
        if (s.left > 0) {
          b.asked++;
          if ([...cs].some(c => !s.co.has(c))) b.hit++;
        }
        cs.forEach(c => {
          if (s.co.has(c)) return;
          s.co.add(c);
          if (typeof c === 'number') s.left--;
        });
        fs.forEach(f => col.has(u + '|' + f) && s.ph.add(f));
      });
    return Object.fromEntries(
      Object.entries(by).map(([w, b]) => {
        const U = Object.entries(b.U);
        return [
          w,
          [
            U.reduce((t, [, s]) => t + s.ph.size, 0),
            U.reduce((t, [u]) => t + P[u].reduce((k, c) => k + c.length, 0), 0),
            b.hit,
            b.asked,
            U.length
          ]
        ];
      })
    );
  }
  // The starred (★) genera: on the slate, not numbered (data.json gen[n].n 0, not surveyed by IMR), there because they
  // look like surveyed genera (rule L5). lectureGroup(d, n): the IMR lecture group a genus is shown in, its own
  // (ig), else, for a ★ genus the lecture doesn't group, the group most of its Coral Finder look-alikes belong to (ties:
  // the first listed); 0 for none (app learn.js shownGroup). starRefs(d, n): the surveyed look-alikes in that group, the
  // genera its card names ("★ look-alike of Turbinaria, Tubastraea", learn.js starNote); [] for any other genus.
  // starWaits(d, n, list, met): a ★ genus opens only once the genus its card compares it to has been met (its card,
  // "Like Turbinaria, but corallites about 6 mm", means nothing before Turbinaria): true while
  // one of n's references is in list (the genera the draw can open) and not met. A reference is always a surveyed genus,
  // which never waits itself, and one not in the list never holds n back: no genus can wait for ever.
  function lectureGroup(d, n) {
    const G = (d && d.gen) || {},
      g = G[n];
    if (!g || xGen(d)[n]) return 0;
    if (g.ig) return g.ig;
    const L = (g.look || []).filter(b => G[b] && G[b].ig),
      c = {};
    L.forEach(b => (c[G[b].ig] = (c[G[b].ig] || 0) + 1));
    return L.reduce((best, b) => (c[G[b].ig] > c[best] ? G[b].ig : best), L.length ? G[L[0]].ig : 0) || 0;
  }
  function starRefs(d, n) {
    const G = (d && d.gen) || {},
      X = xGen(d),
      g = G[n];
    if (!g || g.n || X[n]) return [];
    const k = lectureGroup(d, n);
    return (g.look || []).filter(b => G[b] && G[b].n && !X[b] && G[b].ig === k);
  }
  const starWaits = (d, n, list, met) => starRefs(d, n).some(r => list.includes(r) && !met(r));

  // Photos on R2 (docs/ARCHITECTURE.md "Photos"): the site's photos (img/<f>.webp and its -m, -s,
  // -t files) are read from the Cloudflare R2 bucket that tools/r2_sync.sh mirrors img/ to, same paths under this base;
  // the site's own img/ is the fallback (app.js / admin.js photoFail, sw.js photo). The one switch: '' here sends the
  // app, the admin and the Coral ID Key back to img/ (sw.js only caches what it is asked for).
  const PHOTO_BASE = 'https://pub-934250f83b884a4f890497f2027ce251.r2.dev/';
  // The same files on the site: every R2 address in s (a URL, a srcset, an inline style) made relative again.
  const photoLocal = s => (PHOTO_BASE && typeof s === 'string' ? s.split(PHOTO_BASE).join('') : s);

  // Photos out of the repo (docs/ROADMAP.md): git keeps only the photos with no other backup (IMR lecture photos, our own
  // drawings); the photos with an online original (data.json / data/cand.json / fish-photos.json src: iNaturalist, Pierre's
  // own iNaturalist photos, FishBase) are to leave img/. So once R2 fails, a photo with an online original is read from
  // that original, at a light size, and only the others from the site's img/ (app.js photoFail, quiz.js pump, admin.js).
  // Our files are 240 ('t'), 480 ('s'), 960 ('m') and 1600 px (''); iNaturalist serves small (240 px), medium (500 px),
  // large (1024 px) and the original (up to 2048 px, often several MB, never asked for here).
  const ONLINE_SIZE = {t: 'small', s: 'medium', m: 'large', '': 'large'};
  // An online original (src) at the size closest to one of our files. Other hosts (FishBase: one file per photo, about
  // 500 px wide) as they are.
  const photoOnline = (src, size) => String(src).replace('/original.', `/${ONLINE_SIZE[size || ''] || 'large'}.`);
  // The photo file a site address names, on R2 or on the site: {f, size}, or null for any other address.
  function photoFileOf(u) {
    const m = /(?:^|\/)img\/([^/?#\s]+?)(?:-([tsm]))?\.webp(?:[?#]|$)/.exec(photoLocal(String(u || '')));
    return m ? {f: m[1], size: m[2] || ''} : null;
  }
  // The address that replaces a site photo's address u once R2 has failed: its online original at the same size when it
  // has one (look(f): the photo's record, with src), else the same file on the site. Any other address as it is.
  function photoAway(u, look) {
    const x = photoFileOf(u),
      p = x && look ? look(x.f) : null;
    return !x ? u : p && p.src ? photoOnline(p.src, x.size) : photoLocal(u);
  }
  // Every R2 address in a string (an src, a srcset, an inline style) replaced so.
  const R2_ADDR = PHOTO_BASE ? new RegExp(PHOTO_BASE.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + 'img/[^\\s"\'(),]+', 'g') : null;
  const photoAwayAll = (s, look) => (R2_ADDR && typeof s === 'string' ? s.replace(R2_ADDR, u => photoAway(u, look)) : s);
  // Whether one address is on R2: parsed as a URL, its origin (scheme, host and port, compared whole) is PHOTO_BASE's and
  // its path is under PHOTO_BASE's. An address that only names R2 elsewhere (in its path or query, before an @, inside a
  // longer host) is not on R2, nor is a relative or unparsable one. The URLs are parsed here, never when the file loads:
  // the sheet script's copy of this file (Code.gs) runs where URL does not exist.
  function photoOnR2(u) {
    if (!PHOTO_BASE || typeof u !== 'string') return false;
    try {
      const a = new URL(u),
        b = new URL(PHOTO_BASE);
      return a.origin === b.origin && a.pathname.startsWith(b.pathname);
    } catch (e) {
      return false;
    }
  }
  // Whether a string (an src, a srcset, an inline style) holds an R2 address: each absolute address in it tested whole.
  const photoHasR2 = s => typeof s === 'string' && (s.match(/https?:\/\/[^\s"'(),]+/g) || []).some(photoOnR2);
  // An element whose R2 photo failed (an <img>, or the figure holding a game photo's backdrop): its src, srcset, data-lo
  // (the 480 px fallback) and inline style point at the photo's online original, or at the site's copies for a photo with
  // none (no look: the site for every photo). keepLo: data-lo stays on R2 (under the service worker, which keeps photos
  // offline under their R2 address: the 480 px step then tries the offline copy first). True when it had an R2 address.
  // srcset before src: each change starts a new load, and the browser picks from the srcset.
  function photoFallback(el, look, keepLo) {
    let hit = false;
    if (PHOTO_BASE && el && el.getAttribute)
      for (const a of ['data-lo', 'style', 'srcset', 'src']) {
        const v = a === 'data-lo' && keepLo ? null : el.getAttribute(a);
        if (photoHasR2(v)) {
          el.setAttribute(a, photoAwayAll(v, look));
          hit = true;
        }
      }
    return hit;
  }
  // Every photo record (an object with f and src) under the roots given (data.json as built, the fish data), by name and
  // by online original: the fallback's look and the crops' reverse lookup.
  function photoIndex(...roots) {
    const f = new Map(),
      src = new Map(),
      seen = new Set();
    const walk = o => {
      if (!o || typeof o !== 'object' || seen.has(o)) return;
      seen.add(o);
      if (Array.isArray(o)) return o.forEach(walk);
      if (typeof o.f === 'string' && typeof o.src === 'string') {
        if (!f.has(o.f)) f.set(o.f, o);
        if (!src.has(o.src)) src.set(o.src, o);
      }
      for (const k in o) if (o[k] && typeof o[k] === 'object') walk(o[k]);
    };
    roots.forEach(walk);
    return {f, src};
  }
  // The crop to draw on an online original shown at address u (photoAway's): the site's files have Pierre's crop baked in
  // (curation.json crop, data.json cr, tools/fetch_approved.py), the original has not. As object-view-box
  // inset(top right bottom left), as the admin's crop preview (admin.js crSrc); a browser without it shows the whole
  // photo. '' for an uncropped photo, a photo still remote (r: 1: shown whole from iNaturalist anyway) or any other address.
  function photoCropOf(u, idx) {
    if (!idx || typeof u !== 'string') return '';
    const p = idx.src.get(u.replace(/#.*$/, '').replace(/\/(?:small|medium|large)\.(\w+)$/, '/original.$1')),
      c = p && !p.r && p.cr,
      pc = v => +(v * 100).toFixed(1);
    return Array.isArray(c) && c.length === 4 ? `inset(${pc(c[1])}% ${pc(1 - c[2])}% ${pc(1 - c[3])}% ${pc(c[0])}%)` : '';
  }

  // A photo that fails on R2 is asked from R2 once more after PHOTO_RETRY ms before any other source (a load test saw
  // about 1 request in 1000 fail on passing network errors, which a second try gets). An
  // element whose R2 photo fails for the first time: true, and a probe asks R2 again; if it loads, the element's src
  // and srcset are set again (the file now comes from the browser's cache), else fallback(el) runs (photoFallback).
  // The element keeps its attributes meanwhile. False otherwise: the caller falls back at once.
  const PHOTO_RETRY = 800;
  function photoRetry(el, fallback) {
    if (!PHOTO_BASE || !el || !el.getAttribute || !el.dataset || el.dataset.r2try) return false;
    const src = el.getAttribute('src') || '',
      set = el.getAttribute('srcset') || '',
      u = el.currentSrc || src;
    if (!photoOnR2(u)) return false;
    el.dataset.r2try = '1';
    setTimeout(() => {
      const t = new Image();
      t.onload = () => {
        if (set) el.setAttribute('srcset', set);
        if (src) el.setAttribute('src', src);
      };
      t.onerror = () => fallback(el);
      t.src = u;
    }, PHOTO_RETRY);
    return true;
  }

  // Typed answers (docs/LEARNING.md "Typed questions"; quiz.js): the player types the genus instead of picking 1 of 4
  // (recall, not recognition). Light spelling tolerance (1 letter on a short name, 2 on a long one), old names accepted
  // ("formerly X" in the genus's own lines), no suggestions while
  // typing, the phone's autocorrect and capitals off, an "I don't know" button (a miss), the right spelling shown after
  // the answer. A word that is no game genus, even with the tolerance, is no answer: the player is asked to check it.
  const TYPE = {
    // Edits allowed: one for a name of up to 6 letters, two beyond (Porites, Pocillopora).
    tol: n => (n <= 6 ? 1 : 2)
  };
  // Optimal string alignment distance (Levenshtein + a swap of two neighbouring letters, the commonest typo).
  // Three rows of the matrix only (the row being filled, the one above and, for the swap, the one above that): the same
  // values as the whole matrix, without allocating it (tests/typefast.test.js).
  function typeDist(a, b) {
    const m = b.length;
    let p2 = new Array(m + 1).fill(0),
      p1 = Array.from({length: m + 1}, (_, j) => j),
      r = new Array(m + 1).fill(0);
    for (let i = 1; i <= a.length; i++) {
      r[0] = i;
      for (let j = 1; j <= m; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(p1[j] + 1, r[j - 1] + 1, p1[j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, p2[j - 2] + 1);
        r[j] = v;
      }
      [p2, p1, r] = [p1, r, p2];
    }
    return p1[m];
  }
  const typeNorm = s =>
    String(s || '')
      .trim()
      .split(/\s+/)[0] // "Acropora sp." or a species: the genus is the first word
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z]/g, '');
  // Every name a player may type: the genera cur (every genus the app knows, the slate's and the extra ones) and the old
  // names of their own "formerly X" lines (gx(name): the genus's record, its crit and imr lines). An old name that is
  // itself a game genus is left out: Duncanopsammia peltata was "formerly Turbinaria peltata", Turbinaria is still valid.
  // Returns [{k: normalised name, g: genus, old: the old name or ''}].
  function typeNamesOf(cur, gx) {
    const out = cur.map(n => ({k: typeNorm(n), g: n, old: ''}));
    cur.forEach(n => {
      const g = gx(n) || {},
        txt = [...(g.crit || []), ...(g.imr || [])].join(' ');
      for (const m of txt.matchAll(/formerly ((?:[A-Z][a-z]+)(?:\s*\/\s*[A-Z][a-z]+)*)/g))
        m[1]
          .split('/')
          .map(x => x.trim())
          .forEach(o => {
            if (!gx(o) && !out.some(x => x.k === typeNorm(o))) out.push({k: typeNorm(o), g: n, old: o});
          });
    });
    return out;
  }
  // What the typed text names among names (typeNamesOf): {g, old, exact} for one genus within the tolerance, {near:
  // [genera]} when two are as close by spelling (the player is asked to check the spelling), {shared: [units], exact}
  // for a name several units share typed exactly, {known} for a name that is no unit's (treeTypeNames known), null when
  // nothing is close. The closest names decide: a name typed exactly is never read as a slip of another.
  // norm: how the text is read (typeNorm, the first word, for genera; typeNormAll, the whole text, for fish entries).
  function typeMatchIn(names, text, norm = typeNorm) {
    const t = norm(text);
    if (t.length < 3) return null;
    // A name whose length differs from the text's by more than its tolerance is skipped unread: the distance is at
    // least the difference in length (each edit changes it by one at most), so the filter below would drop it anyway.
    const all = names
      .filter(x => Math.abs(x.k.length - t.length) <= TYPE.tol(x.k.length))
      .map(x => ({...x, d: typeDist(t, x.k)}))
      .filter(x => x.d <= TYPE.tol(x.k.length))
      .sort((a, b) => a.d - b.d);
    if (!all.length) return null;
    // The closest names decide. A name the game knows that is no unit's (known: treeTypeNames) closest: {known}, no
    // unit; else the units' names among them. Typed exactly, a name several units share is all of them ({shared}: the
    // answer is right for each, quiz.js typeUnit); two units as close by spelling only is {near} ("which one?").
    const top = all.filter(x => x.d === all[0].d),
      best = top.filter(x => !x.known);
    if (!best.length) return {known: 1, old: top[0].old, ...(top[0].w ? {w: 1} : {})};
    const gs = [...new Set(best.map(x => x.g))];
    // One name several units share, typed exactly or with a slip (every closest name the same key): shared, the slip
    // taking the spelling step as any name's; two names as close: near.
    if (gs.length > 1)
      return best[0].d === 0 || best.every(x => x.k === best[0].k)
        ? {
            shared: gs,
            old: best[0].old,
            // the name as written that the text reads as (Gobies), for the spelling step's correction
            name: best[0].nm || best[0].old,
            exact: best[0].d === 0,
            // each unit's own reading of it: its role (vr), how many of its species carry it (n, of), its gentle name (oft)
            by: Object.fromEntries(
              gs.map(g => {
                const x = best.find(y => y.g === g);
                return [
                  g,
                  {
                    ...(x.vr ? {vr: x.vr} : {}),
                    ...(x.n ? {n: x.n, of: x.of} : {}),
                    ...(x.oft ? {oft: x.oft} : {}),
                    ...(x.sc ? {sc: x.sc} : {})
                  }
                ];
              })
            )
          }
        : {near: gs};
    return {
      g: best[0].g,
      old: best[0].old,
      exact: best[0].d === 0,
      ...(best[0].alt ? {alt: 1} : {}),
      ...(best[0].oft ? {oft: best[0].oft} : {}),
      ...(best[0].vr ? {vr: best[0].vr} : {}),
      ...(best[0].n ? {n: best[0].n, of: best[0].of} : {}),
      ...(best[0].sc ? {sc: best[0].sc} : {})
    };
  }
  // What a typed text that is no unit of the rank asked names instead, for a nudge that gives nothing away
  // (docs/spec/quiz.md "Another rank or a common name"; quiz.js typeBind). other: the names of the units of the other
  // ranks ([{k, g, old, alt}], typeMatchIn's); x.sci: the scientific names at the rank asked, in the game or not (one
  // of them, or another name of a unit that is one, is no common name: the spelling message); x.common: the common
  // names at the rank asked; x.rank(g): the rank word of unit g; x.own(g): IMR's name for it, each part too. Returns
  // x.rank(g) for a unit's own name or a scientific name of it (Damselfishes, Pomacentridae; Scarinae for the book's
  // Parrotfishes), 'common' for any other name it goes by or a common name at the rank asked, '' otherwise. The lists'
  // names are read once per norm and name (TYPE_NORMED).
  const TYPE_NORMED = new Map();
  const typeNormed = norm => {
    let c = TYPE_NORMED.get(norm);
    if (!c) TYPE_NORMED.set(norm, (c = new Map()));
    if (c.size > 50000) c.clear(); // a bound, far above the subjects' lists
    return s => {
      let k = c.get(s);
      if (k === undefined) c.set(s, (k = norm(s)));
      return k;
    };
  };
  function typeElse(text, other, x = {}, norm = typeNorm) {
    const nm = typeNormed(norm),
      sci = new Set((x.sci || []).map(nm)),
      t = norm(text);
    if (!t || sci.has(t)) return '';
    const m = typeMatchIn(
      (other || []).filter(o => !sci.has(nm(o.old))),
      text,
      norm
    );
    if (m && m.known) return 'common';
    // A name the index lifts from below (treeNameIndex): a scientific name (a species', a genus's) is no common name (the
    // spelling message); a shared one is a common name unless it is a family's own (Holocentridae, Goby).
    if (m && (m.vr === 'ss' || m.vr === 'gs')) return '';
    if (m && m.shared)
      return /i[dn]ae$/i.test(m.old || '') || Object.values(m.by || {}).some(r => !r.vr)
        ? (x.rank ? x.rank(m.shared[0]) : '') || ''
        : 'common';
    if (m && !m.near) {
      const imr = String((x.own && x.own(m.g)) || ''),
        own = !m.old || /i[dn]ae$/i.test(m.old) || [imr, ...imr.split(/\s*&\s*|\s+and\s+/)].some(n => n && norm(n) === norm(m.old));
      return own ? (x.rank ? x.rank(m.g) : '') || '' : 'common';
    }
    const c = typeMatchIn(
      (x.common || []).filter(n => !sci.has(nm(n))).map(n => ({k: nm(n), g: 'common', old: ''})),
      text,
      norm
    );
    return c && !c.near ? 'common' : '';
  }
  // The spelling step: how a typed answer reads against the unit asked t, m being typeMatchIn's reading of it. 'exact':
  // one of its names, spelled right (capitals, accents and spaces aside); 'close': one of its names within the spelling
  // tolerance: still a right answer (the genus was recognised), but the player retypes it once (quiz.js typeBind);
  // 'other': another unit's name, close or exact (a wrong answer); 'none': nothing close, or two names as close (no
  // answer: the player is asked to check the spelling).
  // A name several units share ({shared}): as one of t's names when t is one of them, else 'other'; a known name that is
  // no unit's ({known}): 'none'.
  // sp: the species of the photo (its own taxon, quiz.js): a name of part of t only reads as t when it designates them
  // (typeFits), else 'other'.
  function typeVerdict(m, t, sp) {
    if (!m || m.near || m.known) return 'none';
    if (!typeFits(m, t, sp)) return 'other';
    if (m.shared) return m.exact ? 'exact' : 'close';
    if (m.g !== t) return 'other';
    return m.exact ? 'exact' : 'close';
  }
  // Does the reading m name unit t as the photo shows it? A name of t as a whole, or of part of t (sc: its species) when
  // the photo's species sp are among them: "Razorfish" counts for the wrasses on a razorfish's photo, never on another
  // wrasse's (docs/FISH_PATH.md). sp unknown ([]): read as t, nothing proves a mistake.
  function typeFits(m, t, sp) {
    if (!m || m.near || m.known) return false;
    const r = m.shared ? (m.shared.includes(t) ? (m.by || {})[t] || {} : null) : m.g === t ? m : null;
    if (!r) return false;
    return !r.sc || !(sp || []).length || r.sc.some(x => sp.includes(x));
  }
  // The letters of name to show in bold once a retyped spelling is still wrong (quiz.js typeSpell): those the typed text
  // got wrong, left out or swapped, along typeDist's alignment; a letter typed in excess marks the letter of name where it
  // went in. Returns indexes into [...name] (spaces and other signs are never marked). norm: as typeMatchIn's.
  function typeDiff(text, name, norm = typeNorm) {
    const a = norm(text),
      pos = [],
      L = [];
    [...String(name || '')].forEach((c, i) => {
      const k = c
        .toLowerCase()
        .normalize('NFD')
        .replace(/[^a-z]/g, '');
      if (k) (L.push(k[0]), pos.push(i));
    });
    const b = L.join(''),
      n = a.length,
      m = b.length;
    if (!m) return [];
    const d = Array.from({length: n + 1}, (_, i) => [i, ...Array(m).fill(0)]);
    for (let j = 1; j <= m; j++) d[0][j] = j;
    for (let i = 1; i <= n; i++)
      for (let j = 1; j <= m; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    const mark = new Set();
    let i = n,
      j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && d[i][j] === d[i - 1][j - 1]) (i--, j--);
      else if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] && d[i][j] === d[i - 2][j - 2] + 1)
        (mark.add(j - 1), mark.add(j - 2), (i -= 2), (j -= 2));
      else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) (mark.add(j - 1), i--, j--);
      else if (j > 0 && d[i][j] === d[i][j - 1] + 1) (mark.add(j - 1), j--);
      else (mark.add(Math.min(j, m - 1)), i--);
    }
    return [...mark].map(k => pos[k]).sort((x, y) => x - y);
  }
  // The share of a genus's questions asked as typed ones, from its progress x (0 to 1, the % shown): none below T.from,
  // then a straight line between the points T.at ([progress, share], in order), flat after the last (model.js TYPED).
  function typedShare(x, T) {
    const at = T.at || [];
    if (!(x >= T.from) || !at.length) return 0;
    if (x <= at[0][0]) return at[0][1];
    for (let i = 1; i < at.length; i++)
      if (x <= at[i][0]) {
        const [x0, y0] = at[i - 1],
          [x1, y1] = at[i];
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
      }
    return at[at.length - 1][1];
  }

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

  // Rules versions (docs/LEARNING.md "Full replay", Rules versions; docs/spec/sync.md "Full replay"; rules D5, D6, D8,
  // D9): every change to a rule that moves the progress appends an entry here, v (the next number), at (the date), why
  // (one line for the docs), msg (null, or the card every device which skipped this version shows once:
  // docs/spec/cards.md "The rules version's card"). The sync script, which embeds this file, replays a player's log
  // again when their stored replay is older than RV, and the app adopts a replay newer than the one it applied (sync.js
  // replayAdopt); the leaderboards follow on their own (Code.gs boardWarm_). RV_CARD: the standard recalculation card.
  const RV_CARD = {
    kind: 'update', // the card's kind (app.js cardShow, CARD_KINDS)
    t: 'Your progress was recalculated with the improved model',
    p: 'Your progress is now computed again from all your answers, with the rules the app uses today. It went from {from}% to {to}%. Every answer you gave is kept.',
    only: 'changed',
    min: 5
  };
  // The apology card of the domain-score bar's rules version (Pierre's text; docs/LEARNING.md "The domain-score bar"):
  // shown to every player whose % the adoption took down by a point or more (down: a rise gets the standard card when it
  // is of 5 points or more). ps: the key of a line the sheet serves (Code.gs notes_, the Notes tab; sync.js NOTES_KEY),
  // shown small under the text when it is set: Pierre's PS, which may name a player. A name is never written in the repo
  // (rule D2).
  const RV_SORRY = {
    kind: 'apology',
    kick: 'Sorry',
    t: 'Sorry: we recalculated your progress',
    p: "You've been learning so fast that our old way of counting couldn't keep up. It wasn't you, it was us: your new progress is lower, but you haven't lost anything you know.",
    // The two %, on a line of their own that never wraps.
    pct: 'Your progress: {from}% → {to}%',
    ps: 'card.rv8.ps',
    only: 'changed',
    min: 1,
    // Only to the players whose % went down (the card says the new progress is lower); a rise of
    // RV_CARD.min points or more gets the standard card instead (rvMsgs with skip, progress.js rvNoticeAdd).
    down: true
  };
  const RVS = [
    {
      v: 1,
      at: '2026-11-03',
      why: 'Full replay of each player by the sheet: moving average weighed by what each answer proves, photo memory, former-model learned marks dropped, no Elo step on the genus wrongly given, a genus ability moving with the global level and the miss weighed against the aim at that level (#415), a learned mark kept unless a miss logged after its exam takes it away as the game does',
      msg: RV_CARD
    },
    {
      v: 2,
      at: '2026-11-04',
      why: 'The opening pace and known mix-ups (#425): a question whose choices hold a genus the player mixes up with the one shown more than everyone does (3 or more plausible choices) counts as that much harder, for the ability, the global level and the weight of a miss',
      msg: RV_CARD
    },
    {
      v: 3,
      at: '2026-11-04',
      why: 'Hierarchical photo Elo (sheet v31): the genus offset enters the expectation the photo memory offsets are fitted against, so the memory offsets the replay uses change',
      // mem (?stats=1, Code.gs stats_) feeds replayProgress, so this version's replay gives other bars.
      msg: RV_CARD
    },
    {
      v: 4,
      at: '2026-11-04',
      why: "Answer time weighs right answers (Pierre, 2026-11-04): a right answer's ability steps, on the genus and the global level, times clamp(1 - 1.5 z, 0.5, 1.5), z its log seconds against the player's own median over their earlier timed answers (RTIME, rtWeight)",
      msg: RV_CARD
    },
    {
      v: 5,
      at: '2026-11-04',
      why: 'The first-launch question (#428): a genus never answered starts from the global level shrunk towards the level the player said (new 0, IMR course 0.5, know well 1.25), the answer in force at each answer (reefid-sync-coral-start, its history h, or the band below taken with Coral basics on the fallback card, ease)',
      msg: RV_CARD
    },
    {
      v: 6,
      at: '2026-11-06',
      why: 'One scorer (Q132, sheet v61): the game and the replay score an answer through scoreAnswer; an answer logged with its scoring record (photo difficulty, memory, mix-ups, look-alike test, recalls, a corallites hint revealed after it, shown but not recognised) replays exactly as the game scored it, an older row by its logged e as before',
      msg: RV_CARD
    },
    {
      v: 7,
      at: '2026-11-06',
      why: "One surprise counted once (Q137 part 1): the genus shown takes the global level as it stands after this answer's step on it, so levelMove carries only the level's moves from the other answers (a first right answer moved a genus 0.30, then 0.22 more through the level)",
      msg: RV_CARD
    },
    {
      v: 8,
      at: '2026-11-06',
      why: "Per-format offsets (Pierre, 2026-11-06, Q138; sheet v77): the ability steps of the genus and the global level expect each question with its format's offset from the real answers (fmtOffsetsOf: 2 plausible choices among 4, Again, Duel tab, typed...), so a 2-choice question right more often than 1 in 2 explains no longer over-credits the ability; an answer's scoring record logs the offset it was scored with (o), a row logged before the scorer takes today's",
      msg: RV_CARD
    },
    {
      v: 9,
      at: '2026-11-06',
      why: "The domain-score bar (Q127-Q129, Q135, sheet v87): a genus's bar is the share of all its possible photos the player would name alone and typed, the posterior expectation on a grid of abilities from a fixed population prior and the player's own answers on that genus only (format-aware, the photo's difficulty, memory and mix-ups as scored, a drift per answer so old answers fade), at most 95% until the mastery exam, which opens at 85% once the genus has been asked beside each of its look-alikes; a genus named by mistake counts as a false alarm, its bar less its false-alarm rate (Pr = H - FA, Snodgrass & Corwin 1988), not as a miss on its photos; it replaces the moving average s.pg, and the learned marks passed since 2026-11-02 are kept unless a miss logged after the exam takes them away",
      // The apology card; its PS from the sheet's Notes tab under the key card.rv8.ps, kept as it is so the row Pierre
      // added there still matches (progress.js rvNotice).
      msg: RV_SORRY
    },
    {
      v: 10,
      at: '2026-11-09',
      why: "The log is the only reference (rule D9; Pierre, 2026-11-09, Q322, Q330): the replay's record of a genus and its answer count win over the saved copy, also when the copy holds more answers there (they were counted twice: a save whose reply was lost, then another device's save, PR #824), and a genus the log has no answer on loses the answers the copy counts on it.",
      // No card (rule D6): the progress is updated everywhere without telling the player.
      msg: null
    },
    {
      v: 11,
      at: '2026-11-19',
      why: "Typed mix-ups in the pooled pairs (PR #1116; docs/decisions/2026-11-18-typed-answers-rest.md): a trusted player's typed answer that names another genus counts in the sheet's pooled pairs (conf) as offered once and mixed up (confAdd), so a row logged before its scoring record, whose mix-ups term and look-alike test the replay rebuilds from the pooled pairs, can replay differently; a row with its scoring record replays as before",
      // No card (rule D6).
      msg: null
    },
    {
      v: 12,
      at: '2026-11-19',
      why: "Live answers on units not opened count (rule L4, Pierre, 2026-11-18: live answers \"count without unlocking\"; the modes audit, step 3): a signed-in student's live answer on a unit the path has not opened is scored and logged like any answer, the unit staying closed until its card (it was dropped, never logged); its answers before the card are evidence, never the card's question (model.js askedOpen: the opening's pace, the card's question, readiness, the circles' gate). A log replays as before; every device takes the replay once",
      // No card (rule D6).
      msg: null
    },
    {
      v: 13,
      at: '2026-11-21',
      why: "The player's time net of the photo's (Q452, Pierre, 2026-11-21: \"si la lenteur vient d'une photo dure pour tout le monde, c'est injuste pour lui [...] il faut recalculer la progression de tous. On peut le faire en silence\"): a right answer's time weight takes off z its photos' time term (rtWeight ti: the mean of the photos' served terms, ptimeQ), so a slowness the photo explains no longer counts against the player; the game logs the term in the scoring record (i), and the sheet's replay nets every answer logged without it by the photos' terms served now (replayProgress photos), so every player's progress is recalculated, silently",
      // No card (rule D6; Q452: "en silence").
      msg: null
    }
  ];
  const RV = RVS[RVS.length - 1].v;
  // The rules versions of the fish progress replayed by the sheet (SUBJECTS fish replayed rvs; docs/LEARNING.md "Fish:
  // the progress replayed from the answer log"): its own list, numbered from 1 as RVS is, so a fish
  // replay never makes a coral device take its replay again, nor the other way round. Each entry as in RVS; its card is
  // told under the subject's id (progress.js rvNoticeAdd: 'fish:1').
  const FISH_RVS = [
    {
      v: 1,
      at: '2026-11-08',
      why: "The fish progress replayed from the answer log (Pierre, 2026-11-08: recalculate every player's progress from their answers; Q298, Q310): a fish player's progress is replayed by the sheet from their fish answers (logged since sheet v60) with the corals' engine, each unit's bar before its first replay kept as a floor (until fish rules version 2)",
      msg: RV_CARD
    },
    {
      v: 2,
      at: '2026-11-09',
      why: "The log is the only reference (rule D9; Pierre, 2026-11-09, Q322, Q330): the replay's record of a unit and its answer count win over the saved copy, also when the copy holds more answers there (counted twice, or played before the fish log began: in no log, so dropped), and no floor any more: a unit's bar may go down.",
      // No card (rule D6).
      msg: null
    },
    {
      v: 3,
      at: '2026-11-17',
      why: "Learned asks each variant group (Pierre, 2026-11-17 10:52 Manila, Q391 b): a unit's mastery exam is passed only once each variant group it has (its juveniles; its sexes and colour phases), released by its own mastery, has a right answer, its exam drawing that group's photo while one is left (model.js varLeft, examPassed); a learned mark whose unit has a variant group with no right answer in the answer log is taken away by the sheet's replay for every player at once, the leaderboards included (rules D8, D9: replayProgress vars, fishVarTable, replayedOf; Code.gs subjVar_), silently (rule D6), its exam kept as passed but for that group",
      // No card (rule D6). The replay reads the variant table from this version (vars: replayProgress vars; sync.js
      // replayAdoptS).
      vars: true,
      msg: null
    },
    {
      v: 4,
      at: '2026-11-18',
      why: "The scientific genera of every circle (Pierre, 2026-11-18 ~06:32 Manila, \"lance\"; docs/FISH_PATH.md \"Levels\"): the genera of the families of circles 2 and 3 are units as circle 1's are (fishGenSets: their sibling genera as look-alikes, their family's line), so the sheet's replay counts a wrong pick of one against it (rule L2), its variant table holds them and the score's tree credits their species' scientific names with them (fishScoreTree, fishBoardTree), every player replayed at once, the leaderboards included (rules D8, D9), silently (rule D6)",
      // No card (rule D6).
      msg: null
    },
    {
      v: 5,
      at: '2026-11-19',
      why: "The species by their scientific names (docs/reviews/2026-11-18-species-step2-plan.md; Q397, Q398, Pierre, 2026-11-18) and the smaller faults (Q394 A, Pierre, 2026-11-17): the sheet's replay reads every species in play under its genus unit as a unit (treeSpUnits 'sci', sci:<species id>: the other scientific species of its family as its look-alikes, its genus the unit it starts from), so a wrong pick of one counts against it (rule L2); a common name typed for a species' scientific name counts as half a miss, its genus alone as a quarter, never a gain (core.js PART, the scoring record's z); the leaderboard's tree gives each of those species its own entry (treeBoardTree). A log with no such answer replays as before; every player replayed at once, the leaderboards included (rules D8, D9), silently (rule D6)",
      // No card (rule D6).
      msg: null
    },
    {
      v: 6,
      at: '2026-11-21',
      why: "The player's time net of the photo's (Q452, Pierre, 2026-11-21), as the corals' rules version 13: a right answer's time weight takes off z its photos' time term as the game logged it (the scoring record's i, rtWeight ti). The sheet's replay of this subject reads no pooled photo numbers, so an answer logged before the term was logged keeps its weight: a log with no such answer replays as before; every player replayed at once, silently (rule D6)",
      // No card (rule D6).
      msg: null
    }
  ];
  // The rules versions of the sea slugs' progress replayed by the sheet (SUBJECTS seaslug replayed rvs), their own list
  // numbered from 1, as FISH_RVS is. No card (rules D5, D6).
  const SEASLUG_RVS = [
    {
      v: 1,
      at: '2026-11-17',
      why: "The sea slugs' progress replayed from the answer log, as the fish's (rules D8, D9; their leaderboard, Pierre, 2026-11-17): a player's sea slug progress is replayed by the sheet from their sea slug answers with the same engine; the log is the only reference, a bar may go down.",
      msg: null
    },
    {
      v: 2,
      at: '2026-11-19',
      why: "The species by their scientific names (docs/reviews/2026-11-18-species-step2-plan.md §2.6, §2.7; Q397, Q398, Pierre, 2026-11-18) and the smaller faults (Q394 A, Pierre, 2026-11-17): the sheet's replay reads every species under its genus unit as a unit (treeSpUnits 'sci', sci:<species id>, Goniobranchus sp. 5 as sci:xgoniobranchussp5; the other species of its family as its look-alikes, its genus the unit it starts from), so a wrong pick of one counts against it (rule L2); its genus alone typed counts as a quarter of a miss, never a gain (core.js PART). A log with no such answer replays as before; every player replayed at once, the leaderboard included (rules D8, D9), silently (rule D6)",
      msg: null
    },
    {
      v: 3,
      at: '2026-11-21',
      why: "The player's time net of the photo's (Q452, Pierre, 2026-11-21), as the corals' rules version 13 and the fish's 6: a right answer's time weight takes off z its photos' time term as the game logged it (the scoring record's i). The replay reads no pooled photo numbers, so an answer logged before keeps its weight: a log with no such answer replays as before; every player replayed at once, silently (rule D6)",
      msg: null
    }
  ];
  // A subject's rules versions (the corals' RVS, another subject's SUBJECTS replayed rvs) and the last of them (0: none).
  const rvsOf = id => {
    const S = subjectOf(id);
    return S.replay ? RVS : S.replayed && typeof S.replayed.rvs === 'function' ? S.replayed.rvs() : [];
  };
  const rvOf = id => (L => (L.length ? L[L.length - 1].v : 0))(rvsOf(id));
  // Whether a replay under rules version rv of subject id reads the variant table (FISH_RVS vars): this device's answers
  // replayed on top of the sheet's then recompute a unit's variant groups left (vl) with them.
  const rvVars = (id, rv) => rvsOf(id).some(e => e && e.vars && e.v <= rv);
  // The gate floor (rule D4): a sheet script version already confirmed live, at least three days before it was set
  // here, never the version the app is built against (Pages deploys on a push to main, the script only at its next
  // self-update, so the build's VERSION can run ahead of the live script). The app reads the script version as at least
  // this (sync.js sheetV), also before any reply (a new device, an offline first launch), and no gate is left at or
  // below it (tests/gates.test.js lists those removed). Raised by hand in a PR, to a version merged at least three days
  // before (tools/sync/Code.gs VERSION's git log); never above main's VERSION (the ratchet in tests/gates.test.js). Not a
  // gate: tools/sheet_version.py leaves it alone.
  const SHEET_FLOOR = 131;
  // The sync script version that replays a subject's progress under the content editor's structure (Code.gs subjGen_
  // applies curation.json's circles and pairs, replays_ replays when the structure stamp a device applied is not its
  // own). The app lays the structure over its units, sends its stamps and adopts a replay made under a new stamp only
  // once the script's replies say v >= STRUCT_SHEET (rule D4); below, it applies the text slots alone (app.js treeBuild,
  // sync.js stsAsk, replayAdoptS).
  const STRUCT_SHEET = 146;
  // The sync script version that replays the subject it rates photos for (SUBJECTS replay: the corals) under its content
  // editor's look-alike pairs (Code.gs gen_ and replay_ under curation.json's pairs, keyed by the structure stamp). That
  // subject's SUBJECTS structure sheet; a subject that names none, STRUCT_SHEET.
  const PAIRS_SHEET = 163;
  const structSheet = S => (S && S.structure && typeof S.structure.sheet === 'function' ? S.structure.sheet() : STRUCT_SHEET);
  // The sync script version that stores the photo a Find the X answer tapped (Code.gs: Answers Photo answered, the
  // entry's pa). An answer goes to the sheet with pa only once the script's replies say v >= PA_SHEET; below, the copy
  // sent leaves it out (the queue keeps it), so an older script gets what it knows (rule D4). sync.js sends every answer
  // through it, a save's and an anonymous send's.
  const PA_SHEET = 141;
  // The sync script version that stores an answer's content version (Code.gs: Answers Content version, the entry's cv;
  // docs/ROADMAP.md "Content versions and duplicate-safe answers"). Sent with cv only once the script's replies say
  // v >= CV_SHEET; below, the copy sent leaves it out (the queue keeps it), as for pa (rule D4).
  const CV_SHEET = 178;
  const logOut = (a, v) => {
    // (a reply with no version, NaN, is below both)
    const pa = !!a && a.pa !== undefined && !(Number(v) >= PA_SHEET),
      cv = !!a && a.cv !== undefined && !(Number(v) >= CV_SHEET);
    if (!pa && !cv) return a;
    const o = {...a};
    if (pa) delete o.pa;
    if (cv) delete o.cv;
    return o;
  };
  // An answer's id, its attempt id: made on the device once per answer, kept with it in the queue and sent as it is at
  // every try, so the sheet logs it once whatever the retries (Code.gs logAnswers_ skips an id the Answers tab already
  // has, or one met earlier in the same send). The time in base 36 (8 characters, a letter first until 2059) and 8 random
  // characters from the device's crypto: 16 characters of a-z and 0-9, under the sheet's 20 (Code.gs logAnswers_ ID).
  // Enough random characters that two answers of one millisecond never meet (the sheet would skip the second as a
  // resend). rnd: the random bytes (tests); else crypto.getRandomValues, else Math.random (a runtime without crypto,
  // never a browser the app runs in).
  const AID = 'abcdefghijklmnopqrstuvwxyz0123456789';
  function answerId(now = Date.now(), rnd) {
    const c = typeof crypto !== 'undefined' && crypto && crypto.getRandomValues ? crypto : null,
      b = rnd || (c ? c.getRandomValues(new Uint8Array(8)) : Array.from({length: 8}, () => Math.floor(Math.random() * 256)));
    return Number(now).toString(36) + Array.from(b, x => AID[x % 36]).join('');
  }
  // The content version of an answer (docs/spec/sync.md "The Answers tab", Content version): a short id of the content
  // its subject's units were built from on this device, so analyses and replays can tell which content an answer saw.
  // files: the version of each data file the units are built from, in a fixed order (app.js contentVer, fileVer); cur:
  // the curation they were built under, the subject's part only (curPart); st: the structure stamp in force
  // (structStamp). 'c' and a hash53 (12 characters at most): a letter first, so the sheet never reads it as a number.
  function contentVersion(S, cur, files, st) {
    const f = (files || []).map(x => (x == null || x === '' ? '-' : String(x)));
    return 'c' + hash53(JSON.stringify([f, hash53(JSON.stringify(curPart(S, cur))), String(st || '')]));
  }
  // The subject's part of the curation (curation.json, or its players' copy): a tree subject's own key (SUBJECTS admin
  // cur: fish, seaslug) and the root keys every subject reads (CUR_SHARED: the exclusions, read by treeGone and treePhotos
  // for the tree subjects); the first subject's (admin cur ''), the root without the other subjects' keys.
  const CUR_SHARED = ['exclude'];
  function curPart(S, cur) {
    if (!isObj(cur)) return null;
    const k = S && S.admin && S.admin.cur;
    if (k) return Object.fromEntries([k, ...CUR_SHARED].filter(x => x in cur).map(x => [x, cur[x]]));
    const own = new Set(SUBJECTS.map(X => X.admin && X.admin.cur).filter(Boolean));
    return Object.fromEntries(
      Object.keys(cur)
        .filter(x => !own.has(x))
        .map(x => [x, cur[x]])
    );
  }
  // The messages a device that last applied version `from` shows once it applied version `to`: one per version that
  // has one, oldest first; the same message (RV_CARD) once, at the last version that has it, so a device that skips
  // several versions sees one recalculation card with its progress before and after the whole jump. An apology (kind
  // 'apology', RV_SORRY) in the jump says what the standard card says, and more: the standard card is then left out.
  // skip: leave the apologies out (a player whose % did not go down: progress.js rvNoticeAdd), the standard card back.
  // sid: the subject whose rules versions they are (rvsOf: the corals' RVS by default, fish FISH_RVS).
  const rvMsgs = (from, to, skip = false, sid) => {
    // A jump to a version without a card (rule D6) shows none, not even the card of a version it skips.
    const V = (sid ? rvsOf(sid) : RVS).find(x => x.v === to);
    if (V && !V.msg) return [];
    const L = (sid ? rvsOf(sid) : RVS)
      .filter(x => x.v > (from || 0) && x.v <= to && x.msg && !(skip && x.msg.kind === 'apology'))
      .filter((x, i, A) => !A.slice(i + 1).some(y => y.msg === x.msg));
    return L.some(x => x.msg.kind === 'apology') ? L.filter(x => x.msg !== RV_CARD) : L;
  };

  // Full replay (docs/LEARNING.md "Full replay"; docs/spec/sync.md "Full replay"): every player's progress rebuilt from
  // the answer log, in time order, with today's rules, every answer through scoreAnswer. rows: the answer log (the
  // sheet's readAnswers rows, Code.gs rowOf_, or the app's own through logRow: [id, time ms, genus shown, answered,
  // right 0|1, mode, photos, expected e, ability th, new photos, choices, (11: unused here), seconds (null without),
  // (13 to 21: unused here), the scoring record (LOG_SC: scoreRec, null without)]). o: gen (the units: look-alikes
  // look, family fam), mem (?stats=1 mem; the prior without), conf (?stats=1 conf), since ({id: time ms}: only the
  // answers after a reset), memory false (no photo memory) and time false (no response time) for a what-if, fmt
  // (?stats=1 fmt, for a row without a scoring record; one with it replays its own o), start ({id: player}: a replay to
  // go on from, as returned here, the sheet's with this device's unconfirmed answers on top; copied, never changed),
  // onAnswer(row, {d, fam, cf, k, w, look}), dom false (the moving average instead of the bar), gd (the genus offsets
  // for rows logged without them), vars (the variant table), starts (the first-launch records by player). Returns {id:
  // {P: {unit: {dp, ds, ok, ko, h, ps, off, conf, u, th, lt, vr, streak, at, du, lx, lm}, '~level': {ok, ko, th, vr,
  // at, rt}}, n, used, rep}}: pg in place of dp and ds with dom false or from a start record that holds one; u the
  // answers that moved the bar, du a look-alike duel won, lx the last miss on it shown or given, lm the last that took
  // it below the keep rule (keepsMark); n the rows read, used those replayed, rep those on a photo already shown.
  // MEM_LOGGED, CF_LOGGED: from then the logged e includes the photo memory, then the mix-ups term, taken out again for
  // an older row's difficulty. The mastery exam is not replayed (replayedOf).
  const MEM_LOGGED = Date.UTC(2026, 10, 3, 4, 46); // from then the app's logged e includes the photo memory
  // From then the app's logged e includes its mix-ups term (model.js confTerm; the instant tools/abilityeval.js CF_FROM
  // reads on the sheet's wall clock), taken out again here. An app not yet updated logs a few answers without it after.
  const CF_LOGGED = Date.UTC(2026, 10, 3, 15, 35);
  // The first-launch record's history (docs/spec/cards.md "The record", h): an append-only list of timestamped events,
  // merged between devices as a union (startUnion), from which the answer, the silent ease and the prior at any time
  // are derived (startNorm, startPriorAt): a choice event [c, answers then, time, via], an ease event [the band below,
  // answers then, time, 'ease', the answer it eased, the time of that answer's choice event]. Every event is kept and
  // the list never compacted (that would not commute with the union); START_CAP is only a safety bound.
  const START_CAP = 200;
  const stTime = x => (typeof x[2] === 'number' ? x[2] : -Infinity);
  const stEase = x => x[3] === 'ease';
  const stKey = x => (stEase(x) ? `e|${x[2]}|${x[0]}|${x[4]}|${x[5]}` : `c|${x[2]}|${x[0]}`);
  function startEvents(rec) {
    if (!isObj(rec)) return [];
    const h = Array.isArray(rec.h) && rec.h.length ? rec.h : startOpt(rec.c) ? [[rec.c, rec.at || 0, rec.t, rec.via || '']] : [],
      e = rec.ease,
      ev = (
        Array.isArray(e) && startOpt(e[0]) && !h.some(x => Array.isArray(x) && stEase(x))
          ? [...h, [e[0], e[1] || 0, e[2], 'ease', rec.c]]
          : h
      ).filter(x => Array.isArray(x) && startOpt(x[0]));
    // An ease without its choice's time: the latest choice of that answer at or before it, in this record.
    return ev.map(x => {
      if (!stEase(x) || typeof x[5] === 'number') return x;
      const ch = ev
        .filter(y => !stEase(y) && y[0] === x[4] && stTime(y) <= stTime(x))
        .sort((a, b) => stTime(a) - stTime(b))
        .pop();
      return [x[0], x[1], x[2], 'ease', x[4], ch && typeof ch[2] === 'number' ? ch[2] : null];
    });
  }
  // The events of several records, once each (by kind, time and value), oldest first (a choice before an ease at the
  // same time, then by value: the same order whichever record comes first), START_CAP at most (the latest).
  function startEventsOf(...recs) {
    // One per key; between two copies of an event that differ only in their details (answers then, via), the same one
    // whichever record comes first.
    const by = new Map();
    recs.flatMap(startEvents).forEach(x => {
      const k = stKey(x),
        y = by.get(k);
      if (!y || JSON.stringify(x) < JSON.stringify(y)) by.set(k, x);
    });
    return [...by.values()]
      .sort(
        (a, b) =>
          stTime(a) - stTime(b) || (stEase(a) ? 1 : 0) - (stEase(b) ? 1 : 0) || (stKey(a) < stKey(b) ? -1 : stKey(a) > stKey(b) ? 1 : 0)
      )
      .slice(-START_CAP);
  }
  // The choice event and the ease in force at time t (Infinity: now) over a sorted event list.
  function startStateAt(ev, t) {
    let ch = null,
      ez = null;
    ev.forEach(x => {
      if (stTime(x) > t) return;
      if (!stEase(x)) ((ch = x), (ez = null));
      else if (ch && x[4] === ch[0] && x[5] === ch[2]) ez = x; // the very choice event it eased
    });
    return {ch, ez};
  }
  // A short fingerprint of a record's history (the sheet's replay cache, Code.gs replay_: a replay made with another
  // history is not reused): '' with no record.
  function startFp(rec) {
    const ev = startEventsOf(rec);
    if (!ev.length) return '';
    let h = 5381;
    const s = JSON.stringify(ev.map(x => (stEase(x) ? [x[0], x[2], 'ease', x[4], x[5]] : [x[0], x[2]])));
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  // The first-launch answer's prior at time t (CHOICE): the eased band's while an ease is in force, else the
  // answer's, 0 before the first answer (the player then played as the default player). The replay steps the ability
  // with it (o.starts).
  function startPriorAt(rec, t) {
    const {ch, ez} = startStateAt(startEventsOf(rec), t);
    return ez ? startVars(ez[0]).p : ch ? startVars(ch[0]).p : 0;
  }
  // The epoch of a record's fallback window: its last reset (wt), else the answer's time.
  const startWt = x => (x && typeof x.wt === 'number' ? x.wt : (x && x.t) || 0);
  // A record with its fields derived from its history: c, at, t, via the last choice; ease the ease in force on it.
  function startNorm(rec) {
    if (!isObj(rec)) return null;
    const h = startEventsOf(rec),
      {ch, ez} = startStateAt(h, Infinity);
    if (!ch) return null;
    const out = {...rec, h, c: ch[0], at: ch[1], t: ch[2], via: ch[3]};
    if (ez) out.ease = [ez[0], ez[1], ez[2]];
    else delete out.ease;
    return out;
  }
  // Two devices' records merged (model.js startMerge, sync.js signIn): the union of their histories; the fallback window
  // (w, hd, v, wt) of the record that holds the current answer, on the same answer the later window epoch (a progress
  // reset) then the longer window; the fallback cards shown on either.
  function startUnion(a, b) {
    const A = startNorm(a),
      B = startNorm(b);
    if (!A || !B) return A || B;
    const h = startEventsOf(A, B),
      {ch} = startStateAt(h, Infinity),
      own = x => x.c === ch[0] && x.t === ch[2],
      n = x => (Array.isArray(x.w) ? x.w.length : 0),
      W =
        own(A) && own(B)
          ? startWt(A) !== startWt(B)
            ? startWt(A) > startWt(B)
              ? A
              : B
            : n(A) >= n(B)
              ? A
              : B
          : own(B) && !own(A)
            ? B
            : A;
    return startNorm({...W, h, fb: {...(B.fb || {}), ...(A.fb || {})}});
  }
  // Pierre's change of a player's first-launch answer for one subject (docs/spec/admin-players.md, The starting answer;
  // Code.gs users_ userStart): a choice event appended to the history, via 'admin', at now or just after the latest
  // event, never an event taken away; the fallback window starts again from it. data: the player's saved copy (keysIn
  // names, _acct and the rest kept); s: the subject id; c: the answer (CHOICE.opts); now: ms. Returns {data, start: the
  // new record}, or null when nothing is to change (an unknown subject or answer, a subject without the question, or no
  // answer saved for it).
  function startAdminSet(data, s, c, now) {
    if (!isObj(data) || !startOpt(c) || !SUBJECTS.some(S => S.id === s && S.start)) return null;
    const k = startKey(s),
      old = keyLegacy(k),
      parse = x => {
        try {
          return JSON.parse(x || 'null');
        } catch (e) {
          return null;
        }
      },
      rec = startNorm(parse(typeof data[k] === 'string' ? data[k] : old && data[old]));
    if (!rec) return null;
    const P = parse(data[subjKey(s, 'progress')]),
      L = isObj(P) && isObj(P[LEVEL]) ? P[LEVEL] : {},
      num = x => (typeof x === 'number' && isFinite(x) && x > 0 ? x : 0),
      a = num(L.ok) + num(L.ko),
      ev = startEvents(rec),
      t = Math.max(Math.round(Number(now) || 0), ...ev.map(x => stTime(x) + 1).filter(isFinite)),
      {w, hd, v, wt, ...rest} = rec,
      start = startNorm({...rest, w: [], h: startEventsOf({h: [...ev, [c, a, t, 'admin']]})}),
      json = JSON.stringify(start),
      out = {...data, [k]: json};
    if (old && old in data) out[old] = json;
    return {data: out, start};
  }
  function replayProgress(rows, o = {}) {
    const gen = o.gen || {},
      starts = o.starts || {},
      mem = memOf(o.mem),
      conf = o.conf || {},
      since = o.since || {},
      fmt = o.fmt || {},
      // photos: the ?stats=1 photos with their time terms (ptimeInto), for a row logged without its term (scoring record
      // i): its time netted of the terms served now (rtWeight ti, ptimeQ); without them, 0 (the rule before).
      tAt = ptimeAt(o.photos),
      memory = o.memory !== false,
      time = o.time !== false,
      // dom: false, the moving average; gd: the genus offsets ({genus: [offset, weighed answers]}, ?stats=1 gd) for the
      // rows logged without them.
      dom = o.dom !== false,
      gdv = g => {
        const x = (o.gd || {})[g];
        return Math.round((Array.isArray(x) ? Number(x[0]) || 0 : Number(x) || 0) * 1000) / 1000;
      },
      // Keyed by player id: no prototype, so a player named "constructor" or "__proto__" is a player like any other
      // (a plain object read Object's own constructor for one, and replayed nothing). own: an id's entry of a map given.
      out = Object.assign(Object.create(null), o.start ? JSON.parse(JSON.stringify(o.start)) : {}),
      own = (m, k) => (Object.prototype.hasOwnProperty.call(m, k) ? m[k] : undefined);
    const prior = (t, n) => {
      const a = gen[t] || {},
        b = gen[n] || {};
      return (a.look || []).includes(n) || (b.look || []).includes(t) ? CONF.LOOK : a.fam && a.fam === b.fam ? CONF.FAM : CONF.BASE;
    };
    const pooledOf = (t, n) => confScore(conf[t < n ? t + '|' + n : n + '|' + t], prior(t, n));
    // Known mix-ups (model.js confTerm): the most, over the choices, of the player's own score of the pair above
    // the pooled one (confGap), on the record before this answer, on a question with 3 or more plausible choices; it adds
    // to the question's difficulty for the ability, the level and a miss's weight, as quiz.js answer adds it to dm.
    const confTermOf = (P, t, chs, k) =>
      k >= 3 ? Math.max(0, ...chs.filter(n => n !== t && gen[n]).map(n => confGap(pairConf(P, t, n), pooledOf(t, n)))) : 0;
    // model.js pgWeight: a genus among the choices that the player gets confused with (pooled, then their own record).
    const lookOf = (P, t, n) => {
      if (n === t || !gen[n]) return false;
      const pooled = pooledOf(t, n);
      return pooled >= CONF.TRAP || confScore(pairConf(P, t, n), pooled) >= CONF.TRAP;
    };
    const split = x =>
      String(x || '')
        .split(/\s+/)
        .filter(Boolean);
    rows
      .filter(r => r && r[0] && r[2])
      .sort((a, b) => a[1] - b[1])
      .forEach(r => {
        const id = r[0];
        if (own(since, id) && !(r[1] > own(since, id))) return;
        const pl = (out[id] = out[id] || {P: {}, n: 0, used: 0, rep: 0}),
          rec = g => {
            // No former moving average on a new record: the domain-score bar from its first answer (scoreAnswer domIn);
            // a record of the copy it goes on from (start) keeps what it has.
            const x = (pl.P[g] = pl.P[g] || {ok: 0, ko: 0, h: '', ps: {}, u: 0});
            if (!x.ps) x.ps = {};
            x.h = x.h || '';
            x.u = x.u || 0;
            return x;
          },
          t = String(r[2]),
          c = String(r[3] || ''),
          ok = !!r[4],
          mode = String(r[5] || ''),
          fs = split(r[6]),
          e = r[7],
          th = r[8],
          chs = split(r[10]),
          k = kOf(mode, r[10]),
          sec = typeof r[12] === 'number' ? r[12] : null,
          sc = scoreRec(r[LOG_SC]),
          s = rec(t),
          hs = fs.map(f => s.ps[f]),
          wrong = !ok && c && c !== t && gen[c];
        if (wrong) rec(c);
        pl.n++;
        if (hs.some(h => h && h[0])) pl.rep++;
        const pr = startPriorAt(own(starts, id), r[1]), // the first-launch answer's prior at this answer (abilityOf)
          replayable = fs.length && k > 1 && (sc || (typeof e === 'number' && typeof th === 'number'));
        const q = {t, c, ok, k, chs, ph: fs, cv: !!wrong, p: pr, sec, timed: time, rt: time && !!replayable, d0: null, dom};
        // The photos' time term the answer's time is netted of: as the game logged it (sc i), else the terms served now.
        q.ti = sc && typeof sc.i === 'number' ? sc.i : ptimeQ(fs, tAt);
        // the units a species shown or given starts from (treeReplayGen from: its family), as the game does (abilityOf)
        if ((gen[t] || {}).from) q.from = gen[t].from;
        if (wrong && gen[c].from) q.cfrom = gen[c].from;
        // The domain-score bar's genus offsets: as the game logged them (sc m, n), else the replay's gd (o.gd).
        q.mu = sc && typeof sc.m === 'number' ? sc.m : gdv(t);
        q.muc = sc && typeof sc.n === 'number' ? sc.n : gdv(c);
        if (sc) Object.assign(q, {df: sc.o || 0, dt: sc.t || 0, S: sc.s || 1});
        if (sc) {
          // Logged by the scorer: what the game scored with, as it was then; the memory as logged unless the replay
          // leaves it out (memory: false, a what-if).
          Object.assign(q, {d0: sc.d, fam: memory ? sc.f || 0 : 0, cf: sc.c || 0, look: !!sc.l, R: sc.r === undefined ? 1 : sc.r});
          // The format's offset as logged (o): 0 for an answer scored without the offsets.
          Object.assign(q, {Rc: sc.g === undefined ? 1 : sc.g, hint: sc.h, df: sc.o || 0});
          // A smaller fault's kind as logged (z, Q394): the miss weighed by today's size of it (partOf).
          if (sc.z) q.z = sc.z;
        } else if (replayable) {
          // A row logged before the scorer: its difficulty recovered from the logged e (rounded to 0.01), its memory and
          // mix-ups term rebuilt with today's pooled stats, its look-alike test after the offers, as the game ran it.
          const fam = memFam(hs, mem),
            cf = confTermOf(pl.P, t, chs, k), // on the record before this answer (before the offers)
            qq = Math.min(0.995, Math.max(0.005, (e - 1 / k) / (1 - 1 / k))),
            dl = th - Math.log(qq / (1 - qq)), // the difficulty in the logged expectation
            // d: the photo's difficulty alone (quiz.js d0), without the memory and the mix-ups term the app logged in e.
            d = dl - (r[1] >= MEM_LOGGED ? fam : 0) - (r[1] >= CF_LOGGED ? cf : 0);
          // The format's offset from today's pooled fit (fmt), as its memory and mix-ups.
          const df = fmtOff(fmt, fmtOf(mode, chs.length));
          Object.assign(q, {d0: d, fam: memory ? fam : 0, cf, th, df, look: () => chs.some(x => lookOf(pl.P, t, x))});
        }
        const res = scoreAnswer(pl.P, q);
        if (replayable) {
          pl.used++;
          if (o.onAnswer) o.onAnswer(r, {d: q.d0, fam: q.fam, cf: q.cf, k, w: res.w, look: res.look});
        }
        pl.P[LEVEL].at = r[1];
        s.at = r[1];
        // The learned mark (not replayed: replayedOf takes it from the saved copy) is lost, in the game, at a miss that
        // leaves the progress below the keep rule (quiz.js answer, mxKept), on the genus shown as on the genus given: lm,
        // the time of the last such miss, takes away a mark passed before it; lx, the last miss, ends an exam in course.
        if (!ok) s.lx = r[1];
        if (!ok && !keepsMark(s, pl.P, t)) s.lm = r[1];
        if (ok && contrastQ(mode, chs.length)) s.du = 1;
        if (wrong) {
          const x = pl.P[c];
          x.lx = r[1];
          if (!keepsMark(x, pl.P, c)) x.lm = r[1];
        }
      });
    // vars (a subject's variant table, treeVarTable; Code.gs rplMake_): each unit's variant groups with no photo answered
    // right in the log (vl: varLeftOf at a full bar, a learned unit's), which take a learned mark away (replayedOf; rules
    // D8, D9). This device's answers replayed on top of the sheet's pass the same table (sync.js rpVars); without vars
    // (the corals; an app without its table yet), vl stays as it came.
    if (o.vars)
      Object.values(out).forEach(pl =>
        Object.keys(pl.P).forEach(g => {
          const x = pl.P[g];
          if (g === LEVEL || !isObj(x) || !own(o.vars, g)) return;
          const vl = varLeftOf(own(o.vars, g), 1, x.ps);
          if (vl.length) x.vl = vl;
          else delete x.vl;
        })
      );
    return out;
  }
  // An answer of the app's own log (quiz.js answer: {id, t, g, a, ok, m, ph, e, th, nw, ch, rt}) as a replay row for
  // player id: this device's answers the sheet has not confirmed yet, replayed on top of the sheet's replay (sync.js).
  // The seconds rt at index 12 and the scoring record sc at LOG_SC (22), as in the sheet's readAnswers rows (11, their
  // anonymous flag, and 13 to 21, enlarged to species shown, unused here: null).
  const logRow = (a, id) => [
    id,
    Date.parse(a.t) || 0,
    String(a.g || ''),
    String(a.a || ''),
    a.ok ? 1 : 0,
    String(a.m || ''),
    String(a.ph || ''),
    typeof a.e === 'number' ? a.e : null,
    typeof a.th === 'number' ? a.th : null,
    typeof a.nw === 'number' ? a.nw : null,
    String(a.ch || ''),
    null,
    typeof a.rt === 'number' ? a.rt : null,
    ...new Array(LOG_SC - 13).fill(null),
    scoreRec(a.sc)
  ];
  // A player's progress as the app holds it after the replay (docs/LEARNING.md "Full replay", What the replay gives and
  // what the device keeps; rule D9). rep: replayProgress's player; saved: the player's reefid-sync-coral-progress (the
  // device's copy in the app, the sheet's in the admin). From the replay, every unit the log has replayable answers on
  // (pm 1, rv when given, vl its variant groups with no right answer in the log); from the saved copy, what the log
  // cannot give (the exam passed or in course, dropped as the game drops it: afterBkt, a later miss r.lm or r.lx; dd,
  // dl, ro, cor); a unit the log has no answer on keeps the saved record only if it counts no answer either; LEVEL, the
  // replayed ability with the larger answer count. The replay never decides the exam (mxKeeps, lm).
  const LEVEL_LOG = ['th', 'vr', 'lt', 'tyk', 'rt'];
  // vl (replayProgress vars): the unit's variant groups with no right answer in the log, kept on the record so the app's
  // exam asks them (model.js varLeft) even where the photos seen ps, merged with the saved copy below, hold a right answer
  // the log lacks (one played before the fish answers were logged): the log is the only reference (rule D9); quiz.js
  // answer clears a group at a right answer on it (model.js varRight).
  const REPLAYED = ['pg', 'dp', 'ds', 'ok', 'ko', 'ty', 'h', 'ps', 'off', 'conf', 'th', 'lt', 'vr', 'streak', 'vl'];
  function replayedOf(rep, saved, rv) {
    const S = isObj(saved) ? saved : {},
      R = (rep && rep.P) || {},
      out = {},
      n = x => ((x && x.ok) || 0) + ((x && x.ko) || 0),
      dup = x => JSON.parse(JSON.stringify(x)),
      kept = s => {
        const o = dup(s);
        if (!afterBkt(o)) {
          delete o.mx;
          delete o.ex;
        }
        return o;
      };
    new Set([...Object.keys(S), ...Object.keys(R)]).forEach(g => {
      const s = isObj(S[g]) ? S[g] : null,
        r = isObj(R[g]) ? R[g] : null;
      if (g === LEVEL) {
        // One rule for the level (rule D9): every field that feeds progress (the ability th, vr, lt, the typed
        // opportunities tyk, the answer times rt) is the log's, absent when the log has none; only the plain answer count
        // (ok, ko: the clock the checkpoints hang on) keeps the larger of the two.
        const o = s ? dup(s) : {};
        LEVEL_LOG.forEach(f => (r && r[f] !== undefined ? (o[f] = dup(r[f])) : delete o[f]));
        if (r) {
          if (!s || n(r) >= n(s)) [o.ok, o.ko] = [r.ok || 0, r.ko || 0];
          if (r.at) o.at = Math.max(r.at, Number(o.at) || 0);
          if (rv) o.rv = rv;
        }
        out[g] = o;
        return;
      }
      if (!r || !r.u) {
        // No answer of the log on it: the saved record only when it counts no answer either (rule D9).
        if (!r) return void (s && !n(s) && (out[g] = kept(s)));
        // No answer that moved the bar: the counts and recent results only (a former moving average if it has one).
        out[g] = {ok: r.ok || 0, ko: r.ko || 0, h: r.h || '', ...(rv ? {rv} : {})};
        if (domOn(r)) [out[g].dp, out[g].ds] = [dup(r.dp), r.ds];
        else if (typeof r.pg === 'number') out[g].pg = r.pg;
        // Its offers and mix-ups stay: the other genera's false-alarm rates read them (faOf).
        ['conf', 'off'].forEach(f => isObj(r[f]) && Object.keys(r[f]).length && (out[g][f] = dup(r[f])));
        if (r.ty) out[g].ty = r.ty;
        return;
      }
      const o = {};
      REPLAYED.forEach(f => r[f] !== undefined && (o[f] = dup(r[f])));
      if (s && isObj(s.ps) && Object.keys(s.ps).length) {
        o.ps = o.ps || {};
        Object.keys(s.ps).forEach(f => {
          const x = o.ps[f] || [0, 0],
            y = Array.isArray(s.ps[f]) ? s.ps[f] : [];
          o.ps[f] = [0, 1].map(i => Math.max(Number(x[i]) || 0, Number(y[i]) || 0));
        });
      }
      const at = Math.max(Number(r.at) || 0, Number(s && s.at) || 0);
      if (at) o.at = at;
      if (r.du || (s && s.du)) o.du = 1;
      o.pm = 1;
      if (rv) o.rv = rv;
      if (s) {
        ['dd', 'dl', 'ro', 'cor'].forEach(f => s[f] !== undefined && (o[f] = dup(s[f])));
        if (afterBkt(s) && s.mx) {
          // A variant group with no right answer in the log (r.vl, replayProgress vars): the mark goes, silently
          // (rule D6), its exam kept as passed but for that group, started at the later of the mark and the last miss so
          // a miss after it ends it (lx), ready at once (at 0: the app's EXAM.gap long past); the next exam question asks
          // the group (model.js examSet), a right answer makes it learned again.
          if (!(r.lm > s.mx))
            if (Array.isArray(r.vl) && r.vl.length)
              o.ex = {k: MX_EXAM.n, t: MX_EXAM.typed, v: [], ts: Math.max(Number(s.mx) || 0, Number(r.lx) || 0), at: 0};
            else o.mx = s.mx;
        } else if (afterBkt(s) && s.ex && !(r.lx > (s.ex.ts || s.at || 0))) o.ex = dup(s.ex);
      }
      out[g] = o;
    });
    return out;
  }
  // The merge baseline once a replay is adopted (sync.js replayAdopt, mergeProgress's B; docs/spec/sync.md "Full
  // replay", Adopting): the history every device of the account shares, never this device's own answers not in the
  // sheet yet, which stay the difference P - B. rec: the sheet's replay (replay.rec), M: the record adopted
  // (replayedOf), rv: its rules version, B: the baseline before. Per unit: adopted (M[g].rv is rv), replayedOf of rec
  // alone with its photos shown per photo the larger of rec's and B's; kept from this device's copy, B's record. The
  // level: the replay's, with B's answer count and times (rt) when larger; B's when the sheet sent none.
  function replayBase(rec, M, rv, B) {
    const R = replayedOf({P: rec}, {}, rv),
      B0 = isObj(B) ? B : {},
      out = {},
      n = x => ((x && x.ok) || 0) + ((x && x.ko) || 0),
      dup = x => JSON.parse(JSON.stringify(x));
    Object.keys(M || {}).forEach(g => {
      const b = isObj(B0[g]) ? B0[g] : null,
        r = R[g];
      if (g === LEVEL) {
        if (!r) {
          // No level in the log: the shared clock (ok, ko) only, none of the log's fields (LEVEL_LOG), as replayedOf.
          if (!b) return;
          const o = dup(b);
          LEVEL_LOG.forEach(f => delete o[f]);
          return void (out[g] = o);
        }
        const o = dup(r);
        if (b && n(b) > n(r)) [o.ok, o.ko] = [b.ok || 0, b.ko || 0]; // the clock only (replayedOf, LEVEL_LOG)
        out[g] = o;
      } else if (r && M[g] && M[g].rv === rv) {
        const o = dup(r);
        Object.keys((b && b.ps) || {}).forEach(f => {
          const x = (o.ps = o.ps || {})[f] || [0, 0],
            y = b.ps[f];
          if (Array.isArray(y)) o.ps[f] = [Math.max(x[0], Number(y[0]) || 0), Math.max(x[1], Number(y[1]) || 0)];
        });
        out[g] = o;
      } else if (!r && b && n(b) > 0) {
        // A unit the log has no answer on whose shared copy counts answers: discarded by the adoption (rule D9), so no
        // baseline either; this device's unsent answers on it stay the difference and go on top.
      } else if (b) out[g] = dup(b);
    });
    return out;
  }
  const learnedOf = (P, list) => list.filter(n => (P || {})[n] && P[n].mx).length;
  // The progress a device holds once it adopts a replay (sync.js replayAdoptS), and so the one the leaderboard ranks a
  // player by once their saved copy is behind the rules (Code.gs board_; rule D8). R: the replay (with the device's own
  // answers on top, if any), P: the device's copy, rv: the replay's rules version: replayedOf of R over P. No floor: the
  // log is the only reference, a bar may go down (rule D9).
  function replayAdopted(R, P, rv) {
    return replayedOf({P: R}, isObj(P) ? P : {}, rv);
  }

  // Pages opened in a visit (the event 'pages'), to see whether the players who read the genus sheets progress faster.
  // First-party, one
  // summary a visit, no free text: which pages were open, how many times and for how long (seconds visible, the page in
  // view), and the genus sheets opened: how many times, for how long, how the first one was reached (from: the quiz
  // feedback, a Learn page, My progress, anything else) and whether the genus had already been asked to the player
  // then (asked). The app keeps the tally (sync.js pagesRoute) with these pure functions; the sheet cleans what arrives
  // with pagesClean (Code.gs events_, through its embedded copy of this file).
  const PAGES = {
    ROUTES: 30, // at most this many page names a summary, the most opened first
    GEN: 30, // at most this many genus sheets a summary
    MAXN: 1000, // openings of one page counted at most
    MAXS: 86400, // seconds of one page counted at most
    RE: /^[a-zA-Z0-9~][a-zA-Z0-9~|_.-]{0,39}$/, // a page name (a hash without its parameters)
    GENUS: /^[A-Z][a-z]{2,30}$/,
    FROM: ['quiz', 'learn', 'progress', 'other'],
    // The answer's feedback sheet (docs/decisions/2026-11-18-feedback-sheet.md): four numbers a visit, in this order: the
    // answers whose feedback was shown, those where More was
    // opened, the seconds the feedback stayed on screen (each answer's capped at FBSEC) and the taps on a link inside it.
    // Counts only, no answer, unit or time of day; the first number is the denominator.
    FB: ['shown', 'more', 'sec', 'link'],
    FBMAX: 10000, // answers (or taps) counted in one summary, at most
    FBSEC: 120 // seconds one answer's feedback counts at most
  };
  // The screen a summary was sent from (the screen sizes the players really use, for the multi-photo game formats): the
  // usable CSS viewport (innerWidth, innerHeight), each rounded to STEP px, the pixel
  // ratio to one decimal, the orientation (p: portrait, height >= width, as CSS's orientation; l: landscape), and the
  // width band of its short side (b: how many BANDS edges it is above: 0 ≤360, 1 361-390, 2 391-414, 3 415-600, 4 more),
  // taken on the device from the exact width, since a 10 px grid cannot keep the edges (a 393 px phone rounds to 390).
  // Coarse on purpose (no fingerprinting beyond what a summary already says): nothing exact leaves the device, and the
  // sheet rounds and clamps again (pagesClean). Sent only once the sheet keeps it (sync.js VIEWPORT_SHEET, rule D4).
  const VIEWPORT = {
    STEP: 10,
    MAX: 10000, // px, either side
    DPR: [0.5, 8], // the pixel ratio kept within these
    BANDS: [360, 390, 414, 600]
  };
  const vpBand = s => VIEWPORT.BANDS.filter(e => s > e).length;
  // {w, h, d, o, b} from the exact width, height and pixel ratio; null when one is not a positive number.
  function viewportOf(w, h, dpr) {
    const W = Number(w),
      H = Number(h),
      D = Number(dpr);
    if (!(W > 0 && H > 0 && D > 0 && isFinite(W) && isFinite(H) && isFinite(D))) return null;
    const px = v => Math.min(VIEWPORT.MAX, Math.round(v / VIEWPORT.STEP) * VIEWPORT.STEP);
    return {
      w: px(W),
      h: px(H),
      d: Math.round(Math.max(VIEWPORT.DPR[0], Math.min(VIEWPORT.DPR[1], D)) * 10) / 10,
      o: H >= W ? 'p' : 'l',
      b: vpBand(Math.min(W, H))
    };
  }
  // routes: begin
  // The app's addresses (docs/spec/front-end.md "Addresses and routing"; docs/ARCHITECTURE.md "Pages and routing"):
  // #<section>/<page>[/<thing>…][?filters], in the words on screen; a subject other than the corals puts its prefix
  // first (SUBJECTS hash) on the pages of the sections that follow the subject (ROUTE_SUBJ). Inside, the app names a
  // page by its page key ('genera', 'g-Acropora', 'cmp|A|B'…); routeOut and routeIn translate one into the other, here
  // only. No old address is read (rule W3): routeIn gives an unknown one no key.
  const ROUTE_SUBJ = ['learn', 'practice', 'identify', 'progress'];
  // A section's own page, for its bare address (#learn) and an unknown address inside it (the header tabs' targets).
  const ROUTE_FIRST = {
    learn: 'genera',
    practice: 'quiz',
    identify: 'idkey',
    progress: 'progress',
    leaderboard: 'board',
    tools: 'lab',
    about: 'about'
  };
  const ROUTE_FIXED = {
    quiz: 'practice/quiz',
    'quiz-custom': 'practice/custom',
    'quiz-duel': 'practice/duels',
    pairs: 'practice/memory',
    cmp: 'learn/look-alikes',
    basics: 'learn/basics',
    progress: 'progress',
    board: 'leaderboard',
    ach: 'leaderboard/achievements',
    about: 'about',
    // Delete my account (Code.gs selfDelete): a page reached from About, its |done state after the deletion.
    'delete-account': 'about/delete-account',
    lab: 'tools',
    idkey: 'identify/key',
    fishkey: 'identify/key',
    // The live mode (live.js): a student's join page, its session code as a filter
    // (#live?code=123456, the address the trainer's lobby shows), and the trainer's page.
    live: 'live',
    'live-host': 'live/host'
  };
  const routeEnc = x => encodeURIComponent(x).replace(/%2C/g, ',');
  const routeSubj0 = () => SUBJECTS.find(s => !s.hash) || SUBJECTS[0];
  // The address of page key k for subject S (default: the corals), without '#'. null for no known page.
  function routeOut(k, S) {
    S = S || routeSubj0();
    const s = String(k == null ? '' : k),
      [b, ...a] = s.split('|');
    let p, q;
    if (!s || s === 'home') return '';
    if (b === 'genera' && !a.length) p = 'learn/' + S.many;
    else if (b.startsWith('g-') && b.length > 2 && !a.length) {
      // A subject with sheets at several ranks (SUBJECTS sheets: fish families, genera, species) names the rank of the
      // sheet from its id's prefix (g-f:Damselfishes: #fish/learn/family/Damselfishes); any other sheet is its unit's.
      // A species by its scientific name (sci:s091: LEVELS sci) opens its species' sheet, its unit id kept after the
      // prefix (#fish/learn/species/sci:s091; treeSheets spOf reads it back).
      const id = b.slice(2),
        w =
          Object.keys(S.sheets || {}).find(x => id.startsWith(S.sheets[x]) && id.length > S.sheets[x].length) ||
          (levelOf(id) === 'sci' && (S.sheets || {}).species ? 'species' : undefined);
      p = 'learn/' + (w || S.one) + '/' + routeEnc(w && id.startsWith(S.sheets[w]) ? id.slice(S.sheets[w].length) : id);
    } else if (b.startsWith('cmp-') && b.length > 4 && a.length === 1) p = 'learn/compare/' + routeEnc(b.slice(4)) + '/' + routeEnc(a[0]);
    else if (b.startsWith('lab-') && b.length > 4) p = 'tools/' + [b.slice(4), ...a].map(routeEnc).join('/');
    else if ((b === 'idkey' || b === 'fishkey') && a.length <= 1) {
      p = ROUTE_FIXED[b];
      // The Key's clues (form=B;box=B1;not=wall.plo) as filters, kept as they are (the Key encodes its free text).
      if (a[0]) q = a[0].split(';').filter(Boolean).join('&');
    } else if (b === 'live' && (!a.length || (a.length === 1 && /^\d{6}$/.test(a[0])))) {
      p = 'live';
      if (a[0]) q = 'code=' + a[0];
    } else if (b === 'basics') {
      // Coral basics: its step, glossary term or view as segments, its editing switch (|edit) as a filter.
      const e = a[a.length - 1] === 'edit';
      p = ['learn/basics', ...(e ? a.slice(0, -1) : a).map(routeEnc)].join('/');
      if (e) q = 'edit=1';
    } else if (
      ROUTE_FIXED[b] &&
      (!a.length ||
        (['cmp', 'quiz-duel'].includes(b) && a.length === 2) ||
        (b === 'quiz-custom' && a.length === 1 && a[0] === 'play') ||
        (b === 'delete-account' && a.length === 1 && a[0] === 'done'))
    )
      p = [ROUTE_FIXED[b], ...a.map(routeEnc)].join('/');
    else return null;
    const pre = ROUTE_SUBJ.includes(p.split('/')[0]) ? S.hash || '' : '';
    return pre + p + (q ? '?' + q : '');
  }
  // The page an address shows: {S: its subject, bare: no subject prefix, key: its page key (null: unknown), sec: its
  // section (for an unknown address inside a known section), fall: the page key to show instead of an unknown one}.
  // Split before decoding: the filters off the raw hash first, then each segment decoded alone.
  // tool(S): the subject's Identify tool (app.js UNITS identify), 'idkey' when not given.
  function routeIn(h, tool) {
    const raw = String(h == null ? '' : h).replace(/^#/, ''),
      qi = raw.indexOf('?'),
      dec = x => {
        try {
          return decodeURIComponent(x);
        } catch (e) {
          return x;
        }
      };
    let seg = (qi < 0 ? raw : raw.slice(0, qi)).split('/').map(dec);
    const query = qi < 0 ? '' : raw.slice(qi + 1),
      Sx = SUBJECTS.find(s => s.hash && seg[0] + '/' === s.hash),
      S = Sx || routeSubj0();
    if (Sx) seg = seg.slice(1);
    while (seg.length && seg[seg.length - 1] === '') seg.pop();
    const out = (key, sec) => ({S, bare: !Sx, key, sec: sec || seg[0] || 'home', fall: key != null ? key : ROUTE_FIRST[seg[0]] || ''});
    const [s0, s1, ...r] = seg,
      n = seg.length,
      kv = query.split('&').filter(Boolean);
    if (!n) return out(query ? null : '', 'home');
    if (seg.some(x => x === '' || x.includes('|'))) return out(null);
    const key = (() => {
      if (s0 === 'learn') {
        if (s1 === 'basics') {
          const e = kv.some(x => /^edit(=|$)/.test(x));
          return ['basics', ...r, ...(e ? ['edit'] : [])].join('|');
        }
        if (s1 === S.many && n === 2) return 'genera';
        if (S.sheets && S.sheets[s1] && n === 3) return 'g-' + S.sheets[s1] + r[0];
        if (s1 === S.one && n === 3) return 'g-' + r[0];
        if (s1 === 'look-alikes' && (n === 2 || n === 4)) return ['cmp', ...r].join('|');
        if (s1 === 'compare' && n === 4) return 'cmp-' + r[0] + '|' + r[1];
      } else if (s0 === 'practice') {
        if (s1 === 'quiz' && n === 2) return 'quiz';
        if (s1 === 'custom' && (n === 2 || (n === 3 && r[0] === 'play'))) return ['quiz-custom', ...r].join('|');
        if (s1 === 'duels' && (n === 2 || n === 4)) return ['quiz-duel', ...r].join('|');
        if (s1 === 'memory' && n === 2) return 'pairs';
      } else if (s0 === 'identify') {
        if (s1 === 'key' && n === 2) return (tool ? tool(S) : 'idkey') + (kv.length ? '|' + kv.join(';') : '');
      } else if (s0 === 'progress' && n === 1) return 'progress';
      else if (s0 === 'leaderboard' && n === 1) return 'board';
      else if (s0 === 'leaderboard' && s1 === 'achievements' && n === 2) return 'ach';
      else if (s0 === 'about' && n === 1) return 'about';
      else if (s0 === 'about' && s1 === 'delete-account' && (n === 2 || (n === 3 && r[0] === 'done')))
        return ['delete-account', ...r].join('|');
      else if (s0 === 'tools') return n === 1 ? 'lab' : ['lab-' + s1, ...r].join('|');
      else if (s0 === 'live' && n === 1) {
        const c = /^code=(\d{6})$/.exec(kv.find(x => /^code=/.test(x)) || '');
        return c ? 'live|' + c[1] : 'live';
      } else if (s0 === 'live' && s1 === 'host' && n === 2) return 'live-host';
      return null;
    })();
    // A section that follows the subject is the only place a subject prefix means something.
    if (key != null && Sx && !ROUTE_SUBJ.includes(s0)) return out(null);
    return out(key);
  }
  // The page name of a page key, logged in the visit summary ('pages') and used for the photo size per page:
  // its address's section and page, its things and filters dropped ('learn.genus', 'learn.look-alikes',
  // 'practice.duels', 'identify.key', 'tools.anatomy', 'leaderboard.achievements', 'progress', 'home'), in the corals'
  // words whatever the subject (a page's identity). pre: the prefix of the subject on screen (SUBJECTS pv): a page drawn
  // with Fish on screen is 'fish.<page>' ('fish.practice.quiz', 'fish.home'). '.' and '-' are in PAGES.RE: the sheet
  // (pagesClean) keeps these names as they come.
  function pageName(h, pre = '') {
    const s = String(h == null ? '' : h).replace(/^#/, ''),
      p = routeOut(s, Object.assign({}, routeSubj0(), {hash: ''})),
      seg = p == null ? null : p.split('?')[0].split('/');
    let n = !s || s === 'home' ? 'home' : !seg ? 'other' : seg.slice(0, 2).join('.');
    if (!PAGES.RE.test(n)) n = 'other';
    if (!pre) return n;
    return PAGES.RE.test(pre + n) ? pre + n : pre + 'other';
  }
  // routes: end
  // routes-migration: begin
  // The data written under the old addresses and page names (before the current URL scheme), moved once
  // (rule W3: no old address is read anywhere else; the app moves its own stored data at start-up, migrateRoutes; the
  // sheet moves its rows once, Code.gs ONCE_ in its own PR). The old addresses were today's page keys, so routeOut is
  // their translation. Delete this with its callers once every device and the sheet have moved.
  // An old address (the raw hash, without '#') to its new one; a new or unknown one is left as it is.
  const routeRename = h => {
    const s = String(h == null ? '' : h).replace(/^#/, ''),
      n = s === 'home' ? 'home' : routeOut(s === 'quiz-board' ? 'progress' : s === 'credits' ? 'about' : s);
    return n == null ? s : n;
  };
  // An old page name (genus, compare, lookalikes, quiz, fish.quiz, lab-anatomy…) to its new one (learn.genus,
  // learn.compare, learn.look-alikes, practice.quiz, fish.practice.quiz, tools.anatomy); a new one is left as it is.
  const PAGE_OLD = {genus: 'g-x', compare: 'cmp-x|y', lookalikes: 'cmp'};
  function pageRename(n) {
    const s = String(n == null ? '' : n),
      S = SUBJECTS.find(x => x.pv && s.startsWith(x.pv)),
      pre = S ? S.pv : '',
      b = s.slice(pre.length);
    if (
      /^(learn|practice|identify|leaderboard|tools)\./.test(b) ||
      ['home', 'progress', 'about', 'other', 'tools', 'leaderboard'].includes(b)
    )
      return s;
    const k = PAGE_OLD[b] || (b === 'lab' ? 'lab' : b),
      m = pageName(k, pre);
    return m === pre + 'other' ? s : m;
  }
  // This device's data under the old names (app.js and admin.js at start-up, after migrateStorage): the photo size per page
  // (reefid-sync-size, keyed by page name: genera, genus, pair, idkey, lab-gallery, lab-elim; tips dropped), the events
  // still queued (reefid-evq: each one's address, a visit summary's page names), the photos flagged (reefid-photo-flags:
  // where they were seen). Idempotent (a value the sheet sends back from an older device is moved at the next start).
  // Returns the keys it wrote.
  const SIZE_OLD = {
    genera: 'learn.genera',
    genus: 'learn.genus',
    pair: 'learn.compare',
    idkey: 'identify.key',
    'lab-gallery': 'tools.gallery',
    'lab-elim': 'tools.elim',
    tips: null
  };
  function migrateRoutes(s) {
    try {
      s = s || localStorage;
    } catch (e) {
      return [];
    }
    const done = [],
      edit = (k, f) => {
        try {
          const v = s.getItem(k);
          if (v === null) return;
          const w = JSON.stringify(f(JSON.parse(v)));
          if (w !== v) (s.setItem(k, w), done.push(k));
        } catch (e) {}
      };
    edit('reefid-sync-size', o => {
      if (!isObj(o)) return o;
      Object.keys(SIZE_OLD).forEach(a => {
        if (!Object.prototype.hasOwnProperty.call(o, a)) return;
        if (SIZE_OLD[a] && !Object.prototype.hasOwnProperty.call(o, SIZE_OLD[a])) o[SIZE_OLD[a]] = o[a];
        delete o[a];
      });
      return o;
    });
    edit('reefid-evq', L =>
      !Array.isArray(L)
        ? L
        : L.map(x => {
            if (!isObj(x)) return x;
            const y = {...x};
            if (typeof y.pg === 'string') y.pg = routeRename(y.pg).slice(0, 60);
            if (isObj(y.r)) {
              const r = {};
              Object.keys(y.r).forEach(n => {
                const m = pageRename(n),
                  a = r[m],
                  b = y.r[n];
                r[m] = Array.isArray(a) && Array.isArray(b) ? [a[0] + b[0], a[1] + b[1]] : b;
              });
              y.r = r;
            }
            return y;
          })
    );
    edit('reefid-photo-flags', L =>
      !Array.isArray(L)
        ? L
        : L.map(x => {
            if (!isObj(x) || typeof x.where !== 'string') return x;
            const [h, ...rest] = x.where.split(' · ');
            return {...x, where: [h === 'home' ? h : routeRename(h) || 'home', ...rest].join(' · ')};
          })
    );
    return done;
  }
  // routes-migration: end
  // A page name read back (admin): its subject (by its SUBJECTS pv prefix) and its page ('fish.quiz' -> ['fish', 'quiz'],
  // 'quiz' -> ['coral', 'quiz']).
  function pageSubj(n) {
    const s = String(n == null ? '' : n),
      S = SUBJECTS.find(x => x.pv && s.startsWith(x.pv)) || SUBJECTS.find(x => !x.pv);
    return [S.id, S.pv ? s.slice(S.pv.length) : s];
  }
  // How a genus sheet was reached, from the page it was opened from.
  function pageFrom(h) {
    const n = pageName(h);
    if (/^practice\.(quiz|custom|duels)$/.test(n)) return 'quiz';
    if (/^learn\.(genera|genus|compare|look-alikes)$/.test(n) || n === 'practice.memory') return 'learn';
    if (/^(progress|leaderboard)/.test(n)) return 'progress';
    return 'other';
  }
  const pagesNew = () => ({r: Object.create(null), g: Object.create(null), cur: null, at: 0, fb: [0, 0, 0, 0]});
  // One count of the feedback sheet's tally (PAGES.FB): kind 'shown', 'more', 'sec' (n seconds, capped at FBSEC) or 'link'.
  function pagesFb(S, kind, n = 1) {
    const i = PAGES.FB.indexOf(kind),
      v = Math.round(Number(n));
    if (i < 0 || !S.fb || !isFinite(v) || v <= 0) return;
    S.fb[i] += kind === 'sec' ? Math.min(PAGES.FBSEC, v) : v;
  }
  // The page in view stops counting time (hidden, or another page opens).
  function pagesStop(S, now) {
    const c = S.cur;
    if (c && S.at) {
      const ms = Math.max(0, now - S.at);
      (S.r[c.n] = S.r[c.n] || [0, 0])[1] += ms;
      if (c.g) (S.g[c.g] = S.g[c.g] || [0, 0, c.from, c.asked])[1] += ms;
    }
    S.at = 0;
  }
  // A page opened: h its hash; o.genus the genus of a sheet (checked by the caller against the data), o.from how it
  // was reached (pageFrom), o.asked the genus already asked to the player, o.hidden the app not in view, o.pre the
  // page-name prefix of the subject on screen (SUBJECTS pv, pageName).
  function pagesOpen(S, h, now, o = {}) {
    pagesStop(S, now);
    const n = pageName(h, o.pre),
      g = n === 'learn.genus' && PAGES.GENUS.test(String(o.genus || '')) ? o.genus : null;
    (S.r[n] = S.r[n] || [0, 0])[0]++;
    if (g) (S.g[g] = S.g[g] || [0, 0, PAGES.FROM.includes(o.from) ? o.from : 'other', o.asked ? 1 : 0])[0]++;
    S.cur = {n, g, from: g ? S.g[g][2] : '', asked: g ? S.g[g][3] : 0};
    S.at = o.hidden ? 0 : now;
  }
  const pagesResume = (S, now) => {
    if (S.cur && !S.at) S.at = now;
  };
  // The summary: {r: {page: [times, seconds]}, g: {genus: [times, seconds, from, asked]}}, seconds rounded, the most
  // opened first and capped (ROUTES, GEN); null when nothing was open. Times 0 = the page kept from the previous summary
  // of the same visit (pagesTake), still in view.
  function pagesSummary(S) {
    const sec = ms => Math.min(PAGES.MAXS, Math.round(ms / 1000)),
      keep = (O, cap) =>
        Object.keys(O)
          .filter(k => O[k][0] > 0 || sec(O[k][1]) > 0)
          .sort((a, b) => O[b][0] - O[a][0] || O[b][1] - O[a][1] || (a < b ? -1 : 1))
          .slice(0, cap),
      r = {},
      g = {};
    keep(S.r, PAGES.ROUTES).forEach(k => (r[k] = [Math.min(PAGES.MAXN, S.r[k][0]), sec(S.r[k][1])]));
    keep(S.g, PAGES.GEN).forEach(k => (g[k] = [Math.min(PAGES.MAXN, S.g[k][0]), sec(S.g[k][1]), S.g[k][2], S.g[k][3]]));
    return Object.keys(r).length ? {r, g} : null;
  }
  // The summary so far, and a fresh tally for the rest of the visit (the page in view goes on counting from 0 times).
  function pagesTake(S, now) {
    pagesStop(S, now);
    const out = pagesSummary(S);
    S.r = Object.create(null);
    S.g = Object.create(null);
    // The feedback sheet's four numbers ride the summary and start again; with no summary to carry them (no page was open)
    // they wait for the next one.
    if (out && S.fb && S.fb.some(Boolean)) {
      out.fb = S.fb;
      S.fb = [0, 0, 0, 0];
    }
    return out;
  }
  // Whose summary it is: set when it is queued, so a summary left in the queue (offline, a failed
  // send) is never sent under whoever is active later. 'n:<name, lower case>' signed in, 'a:<anonymous answer id>' else.
  // It stays on the device (pagesBatch strips it).
  const pagesOwner = (sync, anon) => (sync && sync.name && sync.pin ? 'n:' + String(sync.name).trim().toLowerCase() : 'a:' + anon);
  // The events a request sends for the player active now (owner): every other event, and the summaries queued for
  // this owner (without their owner field); the ids of the summaries queued for another owner (or none), to drop.
  function pagesBatch(q, owner) {
    const send = [],
      drop = [];
    (q || []).forEach(x => {
      if (!x || x.k !== 'pages') return send.push(x);
      if (x.o !== owner) return drop.push(x.id);
      const {o, ...y} = x;
      send.push(y);
    });
    return {send, drop};
  }
  // At sign-in the device's anonymous summaries become the account's, as its anonymous answers do (sync.js signIn).
  const pagesOwn = (q, from, into) => (q || []).map(x => (x && x.k === 'pages' && x.o === from ? {...x, o: into} : x));
  // What the sheet keeps of a 'pages' event (Code.gs events_): known shapes only, numbers clamped, no other field. The
  // output objects have no prototype (names come from the players' devices: "__proto__" must stay a plain key).
  function pagesClean(x) {
    const o = x && typeof x === 'object' ? x : {},
      n = (v, hi) => {
        const k = Math.round(Number(v));
        return isFinite(k) ? Math.max(0, Math.min(hi, k)) : 0;
      },
      obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}),
      R = obj(o.r),
      G = obj(o.g),
      r = Object.create(null),
      g = Object.create(null);
    Object.keys(R)
      .filter(k => PAGES.RE.test(k) && Array.isArray(R[k]))
      .slice(0, PAGES.ROUTES)
      .forEach(k => (r[k] = [n(R[k][0], PAGES.MAXN), n(R[k][1], PAGES.MAXS)]));
    Object.keys(G)
      .filter(k => PAGES.GENUS.test(k) && Array.isArray(G[k]))
      .slice(0, PAGES.GEN)
      .forEach(
        k => (g[k] = [n(G[k][0], PAGES.MAXN), n(G[k][1], PAGES.MAXS), PAGES.FROM.includes(G[k][2]) ? G[k][2] : 'other', G[k][3] ? 1 : 0])
      );
    const out = {r, g, vi: /^[a-z0-9]{1,12}$/.test(String(o.vi || '')) ? String(o.vi) : ''};
    // The feedback sheet's four numbers (PAGES.FB): four numbers or nothing, each clamped; nothing when all are zero.
    if (Array.isArray(o.fb) && o.fb.length === PAGES.FB.length) {
      const fb = o.fb.map((v, i) => n(v, PAGES.FB[i] === 'sec' ? PAGES.MAXS : PAGES.FBMAX));
      if (fb.some(Boolean)) out.fb = fb;
    }
    if (o.na !== undefined && o.na !== null && o.na !== '' && isFinite(Number(o.na))) out.na = n(o.na, 1e6);
    // The screen (VIEWPORT): rounded and clamped again, whatever the device sent; its band kept when it is
    // one (0 to 4) and agrees with the rounded short side within the grid, else taken from the rounded short side.
    const V = obj(o.vp),
      vp = V.w !== undefined ? viewportOf(V.w, V.h, V.d) : null;
    if (vp) {
      const b = Number(V.b),
        lo = vpBand(Math.min(vp.w, vp.h) - VIEWPORT.STEP / 2),
        hi = vpBand(Math.min(vp.w, vp.h) + VIEWPORT.STEP / 2);
      if (Number.isInteger(b) && b >= lo && b <= hi) vp.b = b;
      out.vp = {w: vp.w, h: vp.h, d: vp.d, o: V.o === 'p' || V.o === 'l' ? V.o : vp.o, b: vp.b};
    }
    return out;
  }

  // The one-tap question's bank (docs/spec/cards.md "One-tap questions", which gives the items, their scales and their
  // sources; quiz.js pulseAsk, admin Errors). Each item {id, q: its question, a: its answers}, each answer [code,
  // label, d, f]: d felt difficulty (-1 too easy, 0 right, +1 too hard), f how the play feels (-1 bad, 0 neutral, +1
  // good), null says nothing on that scale. Every prompt also logs its showing (PULSE_SHOWN) and, when it ends without
  // an answer, a "Not now" (PULSE_SKIP) or moving on without a tap (PULSE_NONE).
  const PULSE_SHOWN = 'shown',
    PULSE_SKIP = 'skip',
    PULSE_NONE = 'none';
  const PULSEQ = [
    {
      id: 'are',
      q: 'These questions are',
      a: [
        ['easy', 'Too easy', -1, null],
        ['ok', 'About right', 0, null],
        ['hard', 'Too hard', 1, null]
      ]
    },
    // The challenge-skill balance as the flow channels, said as states: "the challenge is too low / too high" leaves
    // non-native speakers unsure whether low means easy or hard.
    {
      id: 'zone',
      q: 'Right now I feel',
      a: [
        ['easy', 'Bored', -1, null],
        ['ok', 'In the zone', 0, null],
        ['hard', 'Struggling', 1, null]
      ]
    },
    {
      id: 'more',
      q: 'Want harder photos?',
      a: [
        ['easy', 'Yes', -1, null],
        ['ok', 'Keep it', 0, null],
        ['hard', 'Easier', 1, null]
      ]
    },
    {
      id: 'fun',
      q: 'Having fun?',
      a: [
        ['lo', 'Not really', null, -1],
        ['mid', "It's OK", null, 0],
        ['hi', 'Yes!', null, 1]
      ]
    },
    {
      id: 'frus',
      q: 'Frustrating?',
      a: [
        ['no', 'Not at all', 0, 0],
        ['bit', 'A bit', 0.5, -0.5],
        ['yes', 'Very', 1, -1]
      ]
    },
    {
      id: 'bored',
      q: 'Getting boring?',
      a: [
        ['no', 'Not at all', 0, 0],
        ['bit', 'A bit', -0.5, -0.5],
        ['yes', 'Yes', -1, -1]
      ]
    }
  ];
  // The first item ever asked, and the item of every answer logged without an item id (the oldest sheet rows).
  const PULSE0 = 'are';
  const pulseItem = id => PULSEQ.find(x => x.id === (id || PULSE0)) || null;
  // An answer on the common scales: {d, f}, null where it says nothing (an unknown item or code: both null).
  function pulseScore(id, code) {
    const it = pulseItem(id),
      a = it && it.a.find(x => x[0] === code);
    return a ? {d: a[2], f: a[3]} : {d: null, f: null};
  }
  // Which item to ask next. Rounds: every item once in a shuffled order, then a new round, never starting with the item
  // just asked, so a player never meets the same wording twice in a row and meets each one as often. st is what the
  // device stored at the last ask ({q: item asked, left: the round's items still to ask}; before the bank, {at} alone,
  // which means PULSE0 was asked); rnd a random number generator in [0, 1). Returns {q, left}, to store.
  function pulsePick(st, rnd = Math.random) {
    const ids = PULSEQ.map(x => x.id),
      last = (st && st.q) || (st && typeof st.at === 'number' ? PULSE0 : ''),
      shuffle = L => {
        const o = L.slice();
        for (let i = o.length - 1; i > 0; i--) {
          const j = Math.floor(rnd() * (i + 1));
          [o[i], o[j]] = [o[j], o[i]];
        }
        return o;
      };
    let left = (st && Array.isArray(st.left) ? st.left : []).filter((x, i, L) => ids.includes(x) && x !== last && L.indexOf(x) === i);
    if (!left.length) {
      if (!last) return {q: PULSE0, left: shuffle(ids.filter(x => x !== PULSE0))};
      left = shuffle(ids);
      if (left[0] === last) left.push(left.shift());
    }
    return {q: left[0], left: left.slice(1)};
  }

  // Quantile q (0-1) of a list sorted in ascending order, linear between neighbours (the usual "type 7": the median of
  // 1, 2, 3, 4 is 2.5, its first quartile 1.75). null for an empty list. Admin Photo stats.
  function quantile(a, q) {
    if (!a.length) return null;
    const i = (a.length - 1) * Math.min(1, Math.max(0, q)),
      k = Math.floor(i);
    return a[k] + (a[Math.min(k + 1, a.length - 1)] - a[k]) * (i - k);
  }
  // How a list of numbers spreads (admin Photo stats › Overview: a median and a spread, not a box plot): count, sum,
  // mean, min, max, the median and the middle half (p25 to p75). The list is not changed.
  function distOf(L) {
    const a = L.filter(x => typeof x === 'number' && isFinite(x)).sort((x, y) => x - y),
      sum = a.reduce((t, x) => t + x, 0);
    return {
      n: a.length,
      sum,
      mean: a.length ? sum / a.length : null,
      min: a.length ? a[0] : null,
      p25: quantile(a, 0.25),
      med: quantile(a, 0.5),
      p75: quantile(a, 0.75),
      max: a.length ? a[a.length - 1] : null
    };
  }

  const CORE = {
    quantile,
    distOf,
    BENTHIC,
    BONUS,
    slateOf,
    gameOf,
    lectureGroup,
    starRefs,
    starWaits,
    PHOTO_BASE,
    photoLocal,
    photoOnR2,
    photoHasR2,
    photoFallback,
    photoOnline,
    photoFileOf,
    photoAway,
    photoIndex,
    photoCropOf,
    photoRetry,
    PHOTO_RETRY,
    TYPE,
    TYPED_RE,
    typeDist,
    typeNorm,
    typeNamesOf,
    typeMatchIn,
    typeElse,
    typeVerdict,
    typeDiff,
    typedShare,
    PROG,
    mxKeeps,
    pgStep,
    pgOf,
    scoreOf,
    pctOf,
    rankWeights,
    treeScoreTree,
    treeScore,
    DOM,
    DOM_PRIOR,
    domP,
    domUpdate,
    domScore,
    domBar,
    domStep,
    domOn,
    barOf,
    examOpen,
    keepsMark,
    domFromCounts,
    faOf,
    FA_CHECK,
    faArm,
    faDisarm,
    looksLeft,
    afterBkt,
    TARGET_P,
    AIM,
    aimOf,
    pgRightW,
    pgMissW,
    pgMemW,
    kOf,
    MEM_LOGGED,
    CF_LOGGED,
    replayProgress,
    scoreAnswer,
    scoreRec,
    scoreIn,
    scoreLog,
    startPriorAt,
    startFp,
    startEvents,
    startEventsOf,
    startStateAt,
    startNorm,
    startUnion,
    startAdminSet,
    startWt,
    START_CAP,
    replayedOf,
    replayAdopted,
    replayBase,
    logRow,
    ELO,
    abilityOf,
    levelMove,
    eloStep,
    RV_CARD,
    RV_SORRY,
    RVS,
    RV,
    SHEET_FLOOR,
    SEASLUGRP_SHEET,
    SEASLUGST_SHEET,
    SEASLUGPAIRS_SHEET,
    FISHST_SHEET,
    PTIME_SHEET,
    RTNET_SHEET,
    STRUCT_SHEET,
    PAIRS_SHEET,
    structSheet,
    PA_SHEET,
    CV_SHEET,
    logOut,
    answerId,
    contentVersion,
    curPart,
    CUR_SHARED,
    RTIME,
    rtMedian,
    rtWeight,
    rtAdd,
    rvMsgs,
    learnedOf,
    PAGES,
    ROUTE_SUBJ,
    ROUTE_FIRST,
    routeOut,
    routeIn,
    routeRename,
    pageRename,
    migrateRoutes,
    pageName,
    pageSubj,
    pageFrom,
    pagesNew,
    pagesFb,
    pagesStop,
    pagesOpen,
    pagesResume,
    pagesSummary,
    pagesTake,
    pagesClean,
    VIEWPORT,
    viewportOf,
    pagesOwner,
    pagesBatch,
    pagesOwn,
    ACH,
    FISH_ACH,
    SEASLUG_ACH,
    SEA_NUDI,
    ACH_CONTRIB,
    achFind,
    newAch,
    achRecount,
    ACH_LEARN,
    achRevoke,
    mergeAch,
    CONTRIB_MAX,
    contribKey,
    contribAdd,
    LIST_MAX,
    repsAdd,
    HELPED_GAP,
    handledSeen,
    helpedDue,
    helpedMark,
    LEVEL,
    SORRY,
    firstName,
    RESERVED_NAMES,
    SEED_LOOKALIKES,
    reservedName,
    SEED,
    markRow,
    markHtml,
    sorryFelt,
    sorryOf,
    sorryDue,
    sorryHi,
    sorryText,
    START,
    playerStart,
    CHOICE,
    startKey,
    startText,
    startOpt,
    startVars,
    startCheck,
    startBand,
    levelFit,
    startNext,
    startInfer,
    levelSeed,
    accountOf,
    commonFactor,
    applyCuration,
    applySlots,
    CAP,
    cfCrop,
    isObj,
    eq,
    canon,
    merge3,
    mergeTabs,
    takeTab,
    mergeOld,
    mergeProgress,
    eloOf,
    genusOffsetsOf,
    GENUS_K,
    levelMargin,
    playSplit,
    trustOf,
    guessOf,
    fmtOf,
    contrastQ,
    FMT,
    fmtOffsetsOf,
    fmtPoint,
    fmtFit,
    fmtOff,
    fmtsOf,
    TRUST,
    PHOTO_W,
    PLAYER0,
    MEM,
    memBucket,
    memFam,
    memOf,
    photoMemOf,
    PTIME,
    infoAt,
    fmtCell,
    ptimeNew,
    ptimeBeta,
    ptimeVar,
    ptimeStep,
    ptimeOut,
    ptimeInto,
    ptimeOff,
    ptimeQ,
    ptimeAt,
    ptimeTerm,
    eloReplay,
    photoTimeOf,
    memRecalc,
    confAdd,
    confusionOf,
    CONF,
    confScore,
    confGap,
    dataLook,
    pairConf,
    mergeUsers,
    winkUnion,
    TOLD,
    toldUnion,
    OPEN_AGAIN,
    openState,
    PULSEQ,
    PULSE0,
    PULSE_SHOWN,
    PULSE_SKIP,
    PULSE_NONE,
    pulseItem,
    pulseScore,
    pulsePick,
    ORG,
    KEYS,
    SUBJECTS,
    SUBJECT_KEY,
    subjectOf,
    CALIB,
    calibOf,
    unitRankOf,
    subjGroup,
    replaySubject,
    replayedSubjects,
    rvsOf,
    rvOf,
    rvVars,
    LOG_SUBJ,
    LOG_SC,
    ansSubject,
    rowSubject,
    WINK_MODE,
    LOG_MODE,
    winkEntry,
    winkRow,
    subjRows,
    subjEntries,
    subjCounts,
    subjKey,
    subjDev,
    subjIn,
    noteRun,
    treeGen,
    treeGenSets,
    treeObs,
    RESERVE,
    reserveId,
    resHash,
    reserveOf,
    reserveSplit,
    heldOf,
    treeGlOf,
    treeReplayGen,
    SEASLUG_RVS,
    treeSpUnits,
    LEVELS,
    spUnitId,
    levelOf,
    PART,
    partOf,
    treeBoardTree,
    easyRank,
    easyCover,
    refFirst,
    refLevel,
    refScore,
    PHASE_JUV,
    phaseOf,
    VAR_KINDS,
    varKindOf,
    VAR_AT,
    varRamp,
    VAR_GROUPS,
    varGroup,
    VAR_FULL,
    varUnit,
    varLeftOf,
    MX_EXAM,
    treeVarTable,
    phaseKind,
    phaseCardOf,
    phasePair,
    licOf,
    rightsClass,
    rightsRank,
    treePhotoOn,
    TREE_COUNT,
    treeCount,
    treeOther,
    treePhotoIn,
    treeGone,
    treePid,
    treePhotos,
    treeCur,
    unitPool,
    exposureOf,
    keepSubjectKeys,
    treeNames,
    treeTypeNames,
    treeNameIndex,
    typeFits,
    typeForms,
    treeGameRow,
    treeGameRead,
    renamedId,
    sheetIdOf,
    contentOf,
    montOf,
    contentNodes,
    contentSlot,
    contentVal,
    contentOk,
    contentBase,
    contentState,
    contentSrc,
    contentEntries,
    contentApply,
    CIRCLE_SLOT,
    structEntries,
    structApply,
    structCanon,
    structStamp,
    structFp,
    treeStructure,
    genStructure,
    lookStructure,
    srcsStructure,
    genLooks,
    starHold,
    pairIdOf,
    EDITOR_PAIR,
    hash53,
    contentOut,
    contentSet,
    contentDrop,
    contentPairKey,
    contentPairSet,
    contentPairDrop,
    treeSheets,
    renameUnits,
    renameLogEntry,
    typeNormAll,
    LEGACY_KEYS,
    keyRename,
    keyLegacy,
    keyBefore,
    keyGet,
    travelData,
    withOldNames,
    migrateKeys,
    migrateStorage,
    keysIn,
    LEGACY_SEND,
    withLegacy,
    dataSum,
    sameText,
    dataDelta,
    dataPatch
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
  else Object.assign(root, CORE);
