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

