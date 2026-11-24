  // Subjects (docs/spec/subjects.md "The registry", which describes every field; docs/ARCHITECTURE.md "Subjects"): what
  // the game teaches, one record each. The engine (model.js, quiz.js, progress.js) works on the current subject (app.js
  // SUBJ: its units, their records app.js GX, its progress P and quiz settings Q under its own keys) and never names
  // one: everything a subject differs in is a field here or a function of app.js UNITS, and a field one subject alone
  // holds is a declared feature (rule S1, tests/subject-neutral.test.js). FISH_RENAMED: the fish's old IMR entry ids
  // (t01) to the book's families, read through SUBJECTS renamed (docs/spec/fish.md "The game's units: families, genera,
  // species"; tests/fishrename.test.js).
  const FISH_RENAMED = {
    ids: {
      't01': 'f:Damselfishes',
      't02': 'f:Butterflyfishes',
      't03': 'f:Angelfishes',
      't04': 'f:Spadefishes',
      't05': 'f:MoorishIdol',
      't06': 'f:Surgeonfishes',
      't07': 'f:Rabbitfishes',
      't08': 'f:Parrotfishes',
      't09': 'f:Wrasses',
      't10': 'f:Snappers',
      't11': 'f:Emperors',
      't12': 'f:CoralBreams',
      't13': 'f:Groupers',
      't14': 'f:Sweetlips',
      't15': 'f:Anthias',
      't16': 'f:Fusiliers',
      't17': 'f:Boxfishes',
      't18': 'f:Goatfishes',
      't19': 'f:Triggerfishes',
      't20': 'f:Puffers',
      't21': 'f:Filefishes',
      't22': 'f:Lionfishes',
      't23': 'f:Soldierfishes',
      't24': 'f:Cardinalfishes',
      't25': 'f:Squirrelfishes',
      't26': 'f:Lizardfishes',
      't27': 'f:Sandperches',
      't28': 'f:Barracudas',
      't29': 'f:Jacks',
      't42': 'f:Morays',
      't43': 'f:GardenEels',
      't44': 'f:Stingrays',
      't45': 'f:Scorpionfishes',
      't46': 'f:Pipefishes',
      't47': 'f:Frogfishes',
      't48': 'f:GhostPipefishes',
      't49': 'f:SnakeEels',
      't50': 'f:Porcupinefishes',
      't51': 'f:WhaleSharks',
      't52': 'f:Stonefishes',
      't54': 'f:Dragonets',
      't57': 'f:SeaMoths',
      't58': 'f:Jawfishes',
      't59': 'f:FlyingGurnards',
      't60': 'f:Threshersharks',
      't61': 'f:Stargazers',
      't63': 'f:RequiemSharks'
    },
    split: {
      't13': {'Diploprion': 'f:Soapfishes'},
      't46': {'Hippocampus': 'f:Seahorses'},
      't52': {'Ablabys': 'f:Waspfishes', 'Paracentropogon': 'f:Waspfishes'}
    },
    names: {
      'f:Damselfishes': 'Damselfishes',
      'f:Butterflyfishes': 'Butterflyfishes',
      'f:Angelfishes': 'Angelfishes',
      'f:Spadefishes': 'Spadefishes',
      'f:MoorishIdol': 'Moorish Idol',
      'f:Surgeonfishes': 'Surgeonfishes',
      'f:Rabbitfishes': 'Rabbitfishes',
      'f:Parrotfishes': 'Parrotfishes',
      'f:Wrasses': 'Wrasses',
      'f:Snappers': 'Snappers',
      'f:Emperors': 'Emperors',
      'f:CoralBreams': 'Coral Breams',
      'f:Groupers': 'Groupers',
      'f:Soapfishes': 'Soapfishes',
      'f:Sweetlips': 'Sweetlips',
      'f:Anthias': 'Anthias',
      'f:Fusiliers': 'Fusiliers',
      'f:Boxfishes': 'Boxfishes',
      'f:Goatfishes': 'Goatfishes',
      'f:Triggerfishes': 'Triggerfishes',
      'f:Puffers': 'Puffers',
      'f:Filefishes': 'Filefishes',
      'f:Lionfishes': 'Lionfishes',
      'f:Soldierfishes': 'Soldierfishes',
      'f:Cardinalfishes': 'Cardinalfishes',
      'f:Squirrelfishes': 'Squirrelfishes',
      'f:Lizardfishes': 'Lizardfishes',
      'f:Sandperches': 'Sandperches',
      'f:Barracudas': 'Barracudas',
      'f:Jacks': 'Jacks',
      'f:Morays': 'Morays',
      'f:GardenEels': 'Garden Eels',
      'f:Stingrays': 'Stingrays',
      'f:Scorpionfishes': 'Scorpionfishes',
      'f:Pipefishes': 'Pipefishes',
      'f:Seahorses': 'Seahorses',
      'f:Frogfishes': 'Frogfishes',
      'f:GhostPipefishes': 'Ghost Pipefishes',
      'f:SnakeEels': 'Snake Eels',
      'f:Porcupinefishes': 'Porcupinefishes',
      'f:WhaleSharks': 'Whale Sharks',
      'f:Stonefishes': 'Stonefishes',
      'f:Waspfishes': 'Waspfishes',
      'f:Dragonets': 'Dragonets',
      'f:SeaMoths': 'Sea Moths',
      'f:Jawfishes': 'Jawfishes',
      'f:FlyingGurnards': 'Flying Gurnards',
      'f:Threshersharks': 'Thresher sharks',
      'f:Stargazers': 'Stargazers',
      'f:RequiemSharks': 'Requiem Sharks'
    }
  };
  // The sync script version that knows the sea-slug subject (rule D4): its group (Code.gs groupIds_) can be set from the
  // admin's Players page from it (admin.js groupOn, SUBJECTS sheet).
  const SEASLUG_SHEET = 151;
  // The sync script version that replays the sea slugs' progress and serves their leaderboard (rule D4; SUBJECTS seaslug
  // replayed sheet, boardSheet): the app adopts their replay (sync.js rpOn) and shows their board (progress.js boardLive)
  // only from it. An older script answers &s=seaslug with the corals' board, never shown as the sea slugs'.
  const SEASLUGRP_SHEET = 164;
  // The sync script version that pools the sea slugs' own answer statistics (rule D4; SUBJECTS seaslug pool, stats): its
  // ?stats=1&s=seaslug serves their photo ratings, genus offsets and confusions, the reply naming its subject (s). The app
  // asks for and reads them only from it (sync.js loadOwnStats); an older script answers &s=seaslug with the corals'.
  const SEASLUGST_SHEET = 167;
  // The sync script version that replays the sea slugs' progress under the content editor's look-alike pairs (rule D4;
  // SUBJECTS seaslug structure sheet; docs/ARCHITECTURE.md "The content editor's edits"): its replay's units from
  // seaslug.json with curation.json's seaslug pairs laid over it, keyed by the structure stamp (Code.gs subjRpl_). The app
  // adopts a replay under a new stamp only from it (structSheet, sync.js stOn).
  const SEASLUGPAIRS_SHEET = 174;
  // The sync script version from which the app reads the fish's own pooled statistics (rule D4; SUBJECTS fish stats): the
  // script already serves them (?stats=1&s=fish: photo ratings, unit offsets and pairs, rated at the rank each question
  // asked, the reply naming its subject), and the app asks for them and keeps a reply only from a script reporting this
  // version or later, so one it has not seen answer, or an older one, changes nothing.
  const FISHST_SHEET = 189;
  // The sync script version that serves the photos' time terms (rule D4; PTIME, ptimeInto: three more numbers in a photo's
  // ?stats=1 entry): the app reads them only from a reply of this version or later (model.js ptmOf), so with an older
  // script every photo's difficulty stays as it was.
  const PTIME_SHEET = 213;
  // The sync script version whose replay nets a right answer's time of its photos' time term (rtWeight ti, rules version
  // 13) and keeps the term in the scoring record (scoreRec i): the app nets it, and logs it, only with this script or
  // later (quiz.js ptNetOn), so an older script, which would drop the field and replay without it, never meets an
  // answer the app weighed otherwise.
  const RTNET_SHEET = 217;
  // The circle thresholds of the tree subjects (SUBJECTS gate; app.js treeGate): circle 3 at circle 1's Entries component
  // 55%, which simulated players reach at a 50% plain mean (docs/LEARNING.md "Fish: the global score, built"); without
  // that score, the plain mean.
  const TREE_GATE = {c3: {entries: 0.55, mean: 0.5}};
  // The Learn and Practice pages the tree subjects do not have yet, each with its reason (SUBJECTS closed): the plan that
  // opens them is docs/reviews/2026-11-19-modes-every-subject.md.
  const CLOSED_TREE = {};
  // The rubric a tree subject's photos are judged on (judging/*.md "Tags"), declared by each subject in its admin part
  // (SUBJECTS admin.tags) and read by the admin in one place (admin.js tagWords, tagRows, tagFlags). A photo's code is its
  // seven tags by position, 0-6, then its flags' letters; each position and the flags is a list of
  // [value, label, words, more]: the label on the Tags row's button, words how a photo's tags say it ('' for a value that
  // makes no photo harder: its good views), more {tip: the button's tooltip, full: the words the Candidates' judged line
  // says where the short line says none, said: a value the tools write that no button offers}. phase is the phase row. What
  // every subject shares is written once here (the count and its words take the subject's noun: one, many); the subject
  // declares what differs: own[0] (the views), own[2] (the light) and own.flags (the ones Pierre may set). names, each
  // position's name on its Tags row.
  const treeRubric = (one, many, own) => ({
    names: ['View', 'Whole', 'Light', 'Colour loss', 'Clarity', 'Size', 'Count'],
    0: own[0],
    1: [
      ['1', 'Whole'],
      ['0', 'Partial', 'partial']
    ],
    2: own[2],
    3: [
      ['0', 'No loss'],
      ['1', 'Slight', 'slight colour loss'],
      ['2', 'Strong', 'strong colour loss'],
      ['3', 'Mono', 'monochrome']
    ],
    4: [
      ['s', 'Sharp'],
      ['m', 'Soft', 'soft'],
      ['b', 'Blurred', 'blurred']
    ],
    5: [
      ['l', 'Large', '', {full: 'large'}],
      ['m', 'Medium', '', {full: 'medium'}],
      ['s', 'Small', 'small']
    ],
    // The labels say the problem is several species on one photo; the codes are judging/FISH.md's. Other species in two: o in
    // play, k out of play (rule P3); the legacy m (not sorted yet: as k) is read, never offered.
    6: [
      ['1', `One ${one}`, '', {tip: `One ${one} (others, if any, tiny and far)`}],
      ['s', 'Same species', 'several of its kind', {tip: `Several ${many} of the same species, the subject obvious (a pair, a school)`}],
      [
        'o',
        'Other species, no risk',
        'other species in view, no confusion',
        {tip: "Other species in view, none could be taken for the subject at the game's level (stays in play)"}
      ],
      [
        'k',
        'Other species, confusable',
        'other species in view, confusable',
        {tip: 'Other species in view, one could be taken for the subject (on a photo in play: out of play, rule P3)'}
      ],
      [
        'x',
        'Unclear',
        'subject not obvious',
        {tip: `Unclear: which ${one} is asked about is not obvious (on a photo in play: out of play)`}
      ],
      ['m', '', 'other species in view, not sorted', {said: true}]
    ],
    // Watermark (w: a visible watermark or text on the photo): Home skips the photo, the games keep it; his tap sets it or
    // takes it off like any tag. a, p and r are the tools' (the tool adds p and r itself).
    flags: [
      ...own.flags,
      ['a', '', 'out of water or a screen', {said: true}],
      ['p', '', '', {full: 'phase entry', said: true}],
      ['r', '', '', {full: 'reference photo', said: true}]
    ],
    // The IMR phase words (judging/FISH.md "phase"), '' = none (an adult, or a juvenile, which is the j flag).
    phase: [
      ['', 'No phase'],
      ['subadult', 'Subadult'],
      ['intermediate', 'Intermediate'],
      ['terminal', 'Terminal'],
      ['female', 'Female'],
      ['male', 'Male']
    ]
  });
  const SUBJECTS = [
    {
      id: 'coral',
      dev: '',
      base: ['base', 'pending'],
      name: 'Corals',
      icon: '<path d="M12 21v-7M12 14c-3 0-5-2-5-5V6M12 14c3 0 5-2 5-5V4M7 9 4.5 7M17 8l2.5-2M12 14V9M12 9l-2-2.5M12 9l2-3"/>',
      one: 'genus',
      many: 'genera',
      what: 'Coral',
      // several: the report dialog's reason for a photo with more than one of them in frame (sync.js REP_WHY, "Several corals").
      several: 'corals',
      card: 'genus',
      lecture: 'the IMR coral lecture',
      pv: '',
      hash: '',
      zoom: 'the corallites, the detail that often tells look-alikes apart',
      views: [
        ['wide', 'Colony'],
        ['medium', 'Close-up'],
        ['macro', 'Corallites']
      ],
      optin: ['bon'],
      rank: 'genus',
      flat: true,
      replay: true,
      offsets: true,
      anonBase: true,
      pool: {files: ['data.json', 'curation.json'], of: 'slots'},
      ach: true,
      // Its achievements (core.js ACH; a function: the list is defined below) and whether its answers keep the feats of the
      // shared record (runs, corallites, hard photos: progress.js achAfter).
      achs: () => ACH,
      achFeats: true,
      board: true,
      // Its Analyses report (admin Analyses, tools/analyses.js; one per subject, refitted every 1000 of its answers).
      // photos: its photos' features, read by What makes a photo hard (analysis.js photoMeta).
      analyses: {photos: true},
      // basics: Coral basics (proto/basics.js), step 0 of the Learn path. Its record stays on the device (subjDev 'basics':
      // reefid-basics, cleared with the progress at sign-out) and its done feat is in the synced achievements record
      // (basics.feat), read by app.js basicsDone; a subject whose pages hold no 'basics' has none.
      // Every game mode opens to every subject (Pierre, 2026-11-19, Q437): a Learn or Practice page a subject lacks is
      // named in its `closed` with the reason, the one place that says why (tests/subjects.test.js).
      pages: ['basics', 'genera', 'sheet', 'cmp', 'quiz', 'quiz-custom', 'quiz-duel', 'pairs'],
      closed: {},
      basics: {feat: '_basics'},
      // The text slots its content editor may edit on a genus sheet (docs/ARCHITECTURE.md "The content editor's edits"),
      // laid over data.json by contentApply: one rank, the genus, its records in data.json gen and x.gen, by name.
      // lsrc/<other genus> is one look-alike line, at the pairs the base holds only (a new pair is structure). keep:
      // hidden, the field stays empty ([] or ''), as every genus record holds it (contentPut).
      content: {
        genus: {
          at: ['gen', 'x.gen'],
          slots: [
            {k: 'plain', n: 'Plain words', t: 'text'},
            {k: 'qt', n: 'ID tips', t: 'list'},
            {k: 'mn', n: 'Mnemonic', t: 'text', imr: 1},
            {k: 'imr', n: 'IMR lecture notes', t: 'list', imr: 1, keep: 1},
            {k: 'sum', n: 'Summary', t: 'text', keep: 1},
            {k: 'crit', n: 'Coral ID Key criteria', t: 'list', keep: 1},
            {k: 'lsrc', n: 'Look-alike', t: 'text', map: 1},
            {k: 'check', n: 'To check with an IMR trainer', t: 'text'},
            {k: 'info', n: 'Other sources', t: 'list'}
          ]
        }
      },
      // The structure its content editor may change: its look-alike pairs between genera (look: a list of genus names;
      // the pair key a|b, v 1 or null), laid over data.json by structApply (genStructure); no circles. hold: the
      // withdrawals the ★ rule refuses (starHold, rule L5), never applied, shown as held on the admin's pages. sheet: the
      // sync script that replays the progress under it (rule D4). A change replays every player's progress (structStamp).
      structure: {
        pairs: {rank: 'genus', slot: 'look', hold: (R, P) => starHold(R, P), held: '★ rule'},
        apply: (R, X) => genStructure(R, X),
        sheet: () => PAIRS_SHEET
      },
      // The units its replay reads (core.js replayProgress gen: each genus's look-alikes and family), from data.json (gen
      // and x.gen): what the sheet builds its coral replay from under the structure in force (Code.gs subjRpl_, gen_).
      // Only gen: it stays the subject the sheet replays (replay), never one of replayedSubjects.
      replayed: {gen: d => genLooks(d)},
      progress: ['slate', 'photos', 'groups'],
      // The first-launch question (CHOICE below): its words for this subject, one [answer, line] per CHOICE.opts id.
      start: {
        q: 'How well do you know corals?',
        opts: {
          new: ['I’m new to corals', 'Start from scratch: the app shows you the basics first.'],
          imr: ['I had the IMR coral course', 'You have met the genera in the IMR lecture.'],
          know: ['I know corals well', 'At IMR or elsewhere: you can already name many genera.']
        }
      },
      // The admin's part (one subject switch for the whole admin, its address prefix the subject's hash): cur, its part
      // of curation.json ('' = the top level); pages, the admin pages it has (null = every page; a page covers the
      // addresses under it); origins, where its photos come from, [key, name, short name] in the order of the photo
      // pages' filter chips (admin.js fbar, origin); csrc, the sources of its Candidates swiper; todo, the sections of its
      // To do (admin.js renderTriage) besides those every subject has: rule (out of the presence rule), sa (share-alike),
      // poor (Featured but rated Poor), sug (the judging agent's suggestions), and photos (a subject with its own part of
      // curation.json: its photo work as counts that open its pages, in All only).
      admin: {
        cur: '',
        pages: null,
        todo: ['rule', 'sa', 'poor', 'sug'],
        origins: [
          ['imr', 'IMR lecture', 'IMR'],
          ['own', 'Pierre', 'Pierre'],
          ['dauin', 'iNat Dauin', 'Dauin'],
          ['ph', 'iNat Philippines', 'PH'],
          ['world', 'iNat elsewhere', 'World']
        ],
        csrc: ['own', 'dauin', 'ph']
      }
    },
    {
      id: 'fish',
      dev: 'fish-',
      base: ['fbase', 'fpending'],
      name: 'Fish',
      icon: '<path d="M3 12c3-5 9-6.5 13-3.5L21 5v14l-5-3.5C12 18.5 6 17 3 12z"/><circle cx="8" cy="11" r=".9" fill="currentColor"/>',
      one: 'family',
      many: 'families',
      what: 'Fish',
      several: 'fish species',
      card: 'fish',
      lecture: 'the IMR fish presentation',
      pv: 'fish.',
      hash: 'fish/',
      zoom: 'the markings and the fins',
      // A word a typed name may leave out (core.js treeTypeNames): "trigger" for Triggerfish.
      typeDrop: 'fish',
      // Out of beta (no beta label) and open to every player, signed out included (docs/ARCHITECTURE.md "Subjects").
      // 'group' would close it to its group again (the sheet keeps the Groups tab's rows).
      open: 'all',
      views: [['wide', 'Photo']],
      // sci: the scientific genera (app.js treeGenera, docs/FISH_PATH.md "Levels"). beyond: circle 3, the families beyond
      // the IMR course, on the path and in the % but opened by the player's choice (app.js UNITS fish opens). A stored
      // c2 / c3 choice (the old opt-in sets) is never read: a "no" to that old offer is not taken for this one. sp: the
      // species by their common names, on unless turned off on the What I learn card (app.js UNITS fish learn).
      optin: ['sci', 'beyond', 'sp'],
      // family: a family of the book (f:Damselfishes); the IMR course is a tag.
      rank: 'family',
      // Its species by their common names (step 1) and by their scientific names (step 2; docs/reviews/2026-11-18-species-
      // step2-plan.md §2.2): two independent trees, each its own units (LEVELS cn, sci).
      names: ['cn', 'sci'],
      renamed: FISH_RENAMED,
      replay: false,
      // Its progress replayed by the sheet from its own answers (docs/LEARNING.md "Fish: the progress replayed from the
      // answer log"; Code.gs replay_ per subject), served beside the corals' replay (replays: {fish: ...}) to an app that
      // asks for it. replay stays the corals': the subject the sheet rates photos and counts confusions from (each
      // subject's opening hold is its own: sync.js holdAdopt). gen: the replay's units, from fish.json. rvs: its own rules versions (FISH_RVS, rvsOf), so a change to its
      // replay never replays the corals. No floor: the log is the only reference, a fish bar may go down.
      // tree: its leaderboard's tree as the sheet makes it (treeBoardTree; Code.gs subjRpl_, board_). vars: the variant
      // table its replay reads (treeVarTable; Code.gs subjVar_), so the sheet takes a learned mark away when a variant
      // group has no right answer (rule D8).
      replayed: {
        gen: F => treeReplayGen(F),
        rvs: () => FISH_RVS,
        tree: F => treeBoardTree(F),
        vars: (F, Fs, S) => treeVarTable(F, Fs, S)
      },
      pool: {files: ['fish.json', 'fish-photos.json', 'fish-game.json', 'curation.json'], of: 'entries', as: ['f', 'ph', 'gm', 'cur']},
      // The app reads its pooled statistics from the script that serves them (FISHST_SHEET; rule D4): photo ratings, unit
      // offsets and pair counts at the rank asked, so its draw, traps and look-alikes follow its players' answers. Its
      // photo memory and format offsets stay the prior and none (model.js pmem, pfmt), and its replay reads no pooled
      // number: a row carries the scoring record it was scored with.
      stats: FISHST_SHEET,
      // Its own achievements (FISH_ACH), in the shared record under ids of their own, never counted in the corals'.
      ach: true,
      achs: () => FISH_ACH,
      // Its own leaderboard (one per subject, no merged ranking): by its %, then its Elo (Code.gs board_ &s=fish;
      // progress.js loadBoard).
      board: true,
      // Its Analyses report: its units are what the questions ask, families and scientific genera (one, many: the
      // admin's words for them). photos 'judged': What makes a photo hard reads its photos' judged ease, phase and framing
      // (analysis.js photoMetaFish, from fish-game.json).
      analyses: {photos: 'judged', one: 'family or genus', many: 'families and genera'},
      // Its global score (docs/FISH_PATH.md "My progress (fish)"): treeScore over its tree (app.js UNITS fish tree), shown
      // as its headline % (model.js headPct) with its components (My progress's bars). The one switch: without it the
      // headline is the families' mean (progPct), and the rules that read it follow (app.js treeGate).
      score: {entries: 0.25, a: 11 / 15, b: 0.8, half: 0.5, pow: 0.5},
      // Reference-level photos first in the draw, never only them; the judged ease's prior at the shared weight
      // (CALIB.ease). u 0.25: an unanswered photo's prior trusted to 0.5 logit, the photos' own spread around their unit
      // (0.5 squared); pool 30, a species' candidate cap, so a pool of 1,000 photos favours its easy ones as a pool of 30
      // does (docs/LEARNING.md "The fish draw in big pools", tools/fish_draw_sim.js).
      calib: {ref: 3, early: 1.5, u: 0.25, pool: 30},
      gate: TREE_GATE,
      // basics: Fish basics (proto/fishbasics.js), step 0 of the Learn path, with its own record (reefid-fish-basics)
      // and done feat. quiz-duel: the Duel tab on its look-alike pairs (app.js UNITS pairs).
      pages: ['basics', 'genera', 'sheet', 'cmp', 'quiz', 'quiz-custom', 'quiz-duel', 'pairs'],
      closed: CLOSED_TREE,
      basics: {feat: '_fbasics'},
      // Its sheets (learn.js viewTreeSheet; docs/reviews/2026-11-05-fish-sheets-study.md, option B): one per family of the
      // identification key, genus and species, each in its address's word with the prefix of its id (fish.json ids
      // f:Damselfishes, g:Chromis; a species by its name, s:Chromis ternatensis): #fish/learn/genus/Chromis.
      sheets: {family: 'f:', genus: 'g:', species: 's:'},
      // The text slots its content editor may edit on each rank's sheets (docs/ARCHITECTURE.md "The content editor's
      // edits"), laid over fish.json by contentApply: at, where the rank's records sit in the built file (a list of records
      // with an id, or a map by id); each slot k, its name in curation.json (a field of the record; a.b, a field inside
      // one; with rows or map, k/<other id> is one line of a keyed field, [[id, text]] or {id: text}, at the ids the base
      // holds only: a new id would be a new pair, which is structure); t, its type (text, one string; list, a list of
      // strings replaced whole); n, its name on the admin's pages; imr, the IMR's own words (their label stays); f, the
      // record's field when it is not k (a wink family's note is its surprise card's line).
      content: {
        family: {
          at: 'families',
          slots: [
            {k: 'cues', n: 'ID tips', t: 'list', imr: 1},
            {k: 'phase', n: 'Phases', t: 'list', imr: 1},
            {k: 'look', n: 'Look-alike', t: 'text', rows: 1},
            {k: 'marks', n: 'ID marks', t: 'list'},
            {k: 'life', n: 'Behaviour, habitat, size', t: 'list'},
            {k: 'apart', n: 'Tell apart', t: 'text', map: 1},
            {k: 'juv.note', n: 'Juveniles', t: 'text'},
            {k: 'note', n: 'Note', t: 'text', f: 'enote'}
          ]
        },
        genus: {
          at: 'genera',
          slots: [
            {k: 'cues', n: 'ID tips', t: 'list', imr: 1},
            {k: 'note', n: 'Note', t: 'text', f: 'enote'}
          ]
        },
        species: {at: 'species', slots: [{k: 'note', n: 'Note', t: 'text', f: 'enote'}]}
      },
      // The structure its content editor may change, laid over fish.json by structApply before the text slots: circle,
      // the rank whose records carry a circle (of: the circles; null in curation.json: in no circle, off the game) and
      // pairs, the rank whose look-alikes are declared (the pair key a|b, v 1 or null) in its rows slot (look: [[other id,
      // words]]). apply: the records written from the circles and pairs in force (treeStructure: a family's circle onto
      // its teaching nodes, genera and species, start kept to circle 1). A change replays every player's progress
      // (structStamp).
      structure: {
        circle: {rank: 'family', of: [1, 2, 3]},
        pairs: {rank: 'family', slot: 'look'},
        apply: (F, X) => treeStructure(F, X)
      },
      progress: ['photos'],
      // The fish welcome question (docs/FISH_PATH.md "The fish welcome question and the IMR answer"): the coral
      // question's twin, the same three answers' variables (CHOICE.opts). "new" offers Fish basics first.
      start: {
        q: 'How well do you know reef fish?',
        opts: {
          new: ['I’m new to reef fish', 'Start from scratch: the basics first, then a few easy families.'],
          imr: ['I’m at IMR (Research Assistant programme)', 'You are learning the IMR survey families.'],
          know: ['I know reef fish well', 'A diver or a guide: you can already name many families.']
        }
      },
      // The pages not about one subject (reports, errors, players) and its own (docs/ROADMAP.md "Admin for every
      // subject"). origins: no IMR photos for fish, iNaturalist only: Pierre's own, then by place.
      admin: {
        cur: 'fish',
        // files: the public files the admin reads its units and photos from (admin.js unitReg; the app's UNITS get): f,
        // its tree; ph, its first photos (none for a subject without); gm, its game photos; cand, its candidate photos
        // (admin.js fishLoad: Photos › Tree's tools, Candidates).
        files: {f: 'fish.json', ph: 'fish-photos.json', gm: 'fish-game.json', cand: 'data/fish-cand.json'},
        // autosort: the fish auto-sort writes its part at each admin load (admin.js fishAutoRun, autosort.js fishRun),
        // the candidates judged sure that the game does not take in by itself.
        autosort: true,
        // circles: the words the admin's Tree names each circle in, beside its number (admin-content.js circleLab): the
        // players' own, "the IMR course's families", "the family that opens right after the IMR course's" and "the
        // families beyond the IMR course" (docs/spec/fish.md "Circles"). A circle with no words is its number alone.
        circles: {1: 'IMR course', 2: 'After the course', 3: 'Beyond the course'},
        // tags: its rubric (judging/FISH.md "Tags"), as treeRubric lays it out: its views (the profile is the good one: said
        // by the judged line only), its light, and the flags Pierre may set (the tool adds p and r itself).
        tags: treeRubric('fish', 'fish', {
          0: [
            ['p', 'Profile', '', {full: 'profile'}],
            ['o', 'Oblique', 'oblique'],
            ['h', 'Head-on', 'head-on'],
            ['t', 'Tail', 'tail view'],
            ['d', 'Above', 'from above']
          ],
          2: [
            ['g', 'Good light'],
            ['d', 'Dim', 'dim light'],
            ['n', 'Night', 'night livery']
          ],
          flags: [
            ['j', 'Juvenile', '', {full: 'juvenile'}],
            ['c', 'Camouflage', 'camouflage'],
            ['w', 'Watermark', 'watermark']
          ]
        }),
        // To do › All lists the reports, flags and errors with its photo work (todo), never the corals' photo sections;
        // Points, the fish points of data/points.json.
        todo: ['photos'],
        pages: [
          'inbox/todo/all',
          'inbox/todo/reports',
          'inbox/todo/errors',
          // Health: the fish photos everyone misses, with their family page's tools, and the units players are stuck on
          // (admin.js statsHealth, healthBad, healthGenera)
          'inbox/todo/health',
          'inbox/todo/points',
          'inbox/coverage/games',
          'players/list',
          'photos/tree',
          'photos/candidates',
          'photos/review/ease',
          'photos/review/phase-framing',
          // By difficulty: its photos ranked by their answers alone (admin.js renderFishDiff; the sheet rates the corals'
          // photos only)
          'photos/review/by-difficulty',
          'photos/look-alikes',
          // Photo stats › Overview: its photos in play, the answers per photo from the answers alone (admin.js pstatsFish).
          // No Difficulty: its numbers are the sheet's photo ratings, the corals' only.
          'photos/stats/overview',
          // Its Analyses report's views (admin-analyses.js), and the views drawn live from its answers (admin.js
          // LIVE_STATS): Stops (statsHealth, healthSheets), Pairs (statsConf) and Answer log (statsPlayers).
          'analyses/overview',
          'analyses/speed',
          // What makes a photo hard on its judged features (analyses photos 'judged')
          'analyses/difficulty/photos',
          'analyses/difficulty/formats',
          'analyses/difficulty/mix-ups',
          'analyses/difficulty/time',
          'analyses/difficulty/pairs',
          // Heatmap (admin-heatmap.js): every unit against every unit at each rank asked, live from its answers, families
          // in their identification key group, genera in their family
          'analyses/difficulty/heatmap',
          'analyses/learning/practice',
          'analyses/learning/after-a-break',
          'analyses/learning/sessions',
          'analyses/learning/profiles',
          'analyses/learning/answer-log',
          'analyses/learning/stops'
        ],
        // obs: its word for the observations a question's photos come from (Analyses › Difficulty › Pairs: the corals'
        // Colonies, a question showing one colony's views).
        obs: 'Observations',
        origins: [
          ['own', 'Pierre', 'Pierre'],
          ['dauin', 'iNat Dauin', 'Dauin'],
          ['ph', 'iNat Philippines', 'PH'],
          ['world', 'iNat elsewhere', 'World']
        ]
      }
    },
    {
      // The sea slugs (docs/ARCHITECTURE.md "Subjects"; docs/reviews/2026-11-15-nudibranch-mode-study.md): circles by
      // popularity, the Philippines as its area, scientific names only. Read through the fish engine (app.js UNITS seaslug:
      // seaslug.json and seaslug-game.json, built by tools/seaslug_game.py): its genera the units from the start
      // (unitRank), its families structure only; the species have their sheets.
      id: 'seaslug',
      dev: 'seaslug-',
      base: ['sbase', 'spending'],
      name: 'Sea slugs',
      icon: '<path d="M3 16.5c2.2-3 5.4-4.3 9.3-4.3 3.6 0 6.5 1.3 8.7 3.9-2.8 1.3-5.8 1.9-9 1.9-3.3 0-6.3-.5-9-1.5z"/><path d="M6.5 13.4 5.2 9.6M9 12.6l.2-3.8M17.6 13.4c0-1.6.8-2.8 2.2-3.5M17.6 13.4c.9-1.2 2-1.7 3.4-1.6"/>',
      one: 'genus',
      many: 'genera',
      what: 'Sea slug',
      several: 'sea slug species',
      card: 'sea slug',
      lecture: 'a sea slug ID course',
      pv: 'seaslug.',
      hash: 'seaslug/',
      zoom: 'the rhinophores, the gills and the pattern of the mantle',
      beta: {
        kick: 'Sea slugs…',
        line: '<b>Sea slugs are in beta</b>: nudibranchs and other sea slugs of the Philippines, by their scientific names, iNaturalist photos for now. Feedback welcome.'
      },
      // Open to every player, signed out included, the beta label kept (docs/ARCHITECTURE.md "Subjects"). 'group' would
      // close it to its group again. sheet: the sync script version that knows this subject (Code.gs groupIds_; rule D4).
      open: 'all',
      sheet: SEASLUG_SHEET,
      views: [['wide', 'Photo']],
      // Its genera are its units from the start. ssp: its species by their scientific names, on unless turned off on the
      // What I learn card (app.js UNITS seaslug learn).
      optin: ['ssp'],
      rank: 'family',
      unitRank: 'genus',
      // Its species by their scientific names only (Q369, 2026-11-15: the English names are information, never a choice).
      names: ['sci'],
      // Its progress replayed by the sheet from its own answers, as the fish's (Code.gs replays_; rules D5, D8, D9): its
      // units from seaslug.json, the genera played from the start (treeReplayGen at its unitRank), its own rules versions
      // (SEASLUG_RVS), its records in the "Replayed Sea slugs" tab. sheet: the script version that replays it (rule D4).
      // No tree: its board ranks by the genera's mean, its headline %.
      replay: false,
      replayed: {
        file: 'seaslug.json',
        sheet: SEASLUGRP_SHEET,
        gen: F => treeReplayGen(F, 'genus'),
        rvs: () => SEASLUG_RVS
      },
      // Its own leaderboard, shown to those who see the subject, from the script that serves it (boardSheet; progress.js
      // boardLive): by its % then its Elo, its players behind its rules ranked by their replay (Code.gs board_; rule D8).
      board: true,
      boardSheet: SEASLUGRP_SHEET,
      // Its game photos: its tree, its game file and its part of curation.json (treeCur), its genera the units, as the
      // app builds them, so the sheet pools its own answer statistics (Code.gs statsSubjects_: "Stats Sea slugs",
      // ?stats=1&s=seaslug). stats: the app reads them from the script that serves them (rule D4), so a data look-alike
      // seeded from iNaturalist (model.js dataSeed) is dropped once the players tell the pair apart.
      pool: {files: ['seaslug.json', 'seaslug-game.json', 'curation.json'], of: 'entries', as: ['f', 'gm', 'cur']},
      stats: SEASLUGST_SHEET,
      // Its Analyses report, by genus: photos 'judged', its photos' judged ease, phase and framing from its game file
      // (analysis.js photoMetaFish), as the fish's.
      analyses: {photos: 'judged'},
      // Its own achievements (SEASLUG_ACH), in the shared record under ids of their own (ss...), never counted in the
      // corals' or the fish's.
      ach: true,
      achs: () => SEASLUG_ACH,
      // The fish's draw calibration (every photo carries a judged ease, judging/SEASLUG.md), the floor shared over 20
      // observations, the sea slugs' candidate count.
      calib: {ref: 3, early: 1.5, u: 0.25, pool: 20},
      gate: TREE_GATE,
      // basics: Sea slug basics (proto/seaslugbasics.js), step 0 of the Learn path, with its own record
      // (reefid-seaslug-basics) and done feat.
      pages: ['basics', 'genera', 'sheet', 'cmp', 'quiz', 'quiz-custom', 'quiz-duel', 'pairs'],
      closed: CLOSED_TREE,
      basics: {feat: '_sbasics'},
      sheets: {family: 'f:', genus: 'g:', species: 's:'},
      // The text slots its content editor may edit on each rank's sheets (as the fish's), laid over seaslug.json by
      // contentApply (app.js treeBuild and the sheet's replay alike): a family's and a genus's ID marks
      // (tools/seaslug_cues.json; contentPut keeps a line's source numbers when the line is kept word for word) and the
      // free note on every rank. No IMR slot. lsrc/<other genus>: a genus's look-alike line, the sources that name the
      // pair (srcs: [{t, u}], tools/seaslug_game.py genus_looks), shown on the sheet's Don't confuse with (learn.js
      // treeGenusLooks), at the pairs the base holds only (a new pair is structure).
      content: {
        family: {
          at: 'families',
          slots: [
            {k: 'marks', n: 'ID marks', t: 'list'},
            {k: 'note', n: 'Note', t: 'text', f: 'enote'}
          ]
        },
        genus: {
          at: 'genera',
          slots: [
            {k: 'marks', n: 'ID marks', t: 'list'},
            {k: 'lsrc', n: 'Look-alike', t: 'srcs', map: 1},
            {k: 'note', n: 'Note', t: 'text', f: 'enote'}
          ]
        },
        species: {at: 'species', slots: [{k: 'note', n: 'Note', t: 'text', f: 'enote'}]}
      },
      // The structure its content editor may change (docs/ARCHITECTURE.md "The content editor's edits"): its declared
      // look-alike pairs between genera (look: the genera a specialist source names; the pair key a|b, v 1 or null), laid
      // over seaslug.json by structApply (srcsStructure: both genera's look and lsrc lines, an added pair out of dlook).
      // The genera of a family stay each other's look-alikes whatever is withdrawn (treeGenUnits); the data look-alikes
      // (dlook) are the players' answers' to drop (model.js dataSeed); no circles (a genus's circle is its best species',
      // from the build). sheet: the sync script that replays under them (rule D4). A change replays every player's
      // progress (structStamp).
      structure: {
        pairs: {rank: 'genus', slot: 'look'},
        apply: (F, X) => srcsStructure(F, X),
        sheet: () => SEASLUGPAIRS_SHEET
      },
      progress: ['photos'],
      // No IMR content: no "I'm at IMR" answer.
      start: {
        q: 'How well do you know sea slugs?',
        opts: {
          new: ['I’m new to sea slugs', 'Start from scratch: a few easy genera first.'],
          know: ['I know sea slugs well', 'A diver or a photographer: you can already name many genera.']
        }
      },
      // Its admin part: its own key in curation.json (Pierre's choices on its photos, applied by the app through treeCur
      // and by tools/seaslug_game.py), the pages not about one subject's photos, its Players page holding its beta
      // group, and its Photos › Tree with the fish's photo tools.
      admin: {
        cur: 'seaslug',
        // Its files, read by the admin for a reported photo's tile, credits and identification (To do › Reports), and
        // for Photos › Tree (its candidates: Not this, the candidates waiting).
        files: {f: 'seaslug.json', gm: 'seaslug-game.json', cand: 'data/seaslug-cand.json'},
        // target: a species' photos in play its Candidates fill up to (autosort.js fishTarget; the fish's FISHT by
        // default): the game's cap, tools/seaslugs.json photoTarget gameCap (tools/seaslug_game.py puts the sure ones in
        // play up to it; tests/seaslugadmin.test.js keeps the two equal).
        target: 12,
        // circles: the admin's words for its circles, beside their numbers (the fish's field), as Pierre decided them
        // (2026-11-15, Q377): circle 1 the stars and the most common species, circles 2 and 3 the next ones by commonness
        // (docs/reviews/2026-11-15-seaslug-list.md §1.6 and §4).
        circles: {1: 'Stars and most common', 2: 'Next most common', 3: 'Less common'},
        // tags: its rubric (judging/SEASLUG.md "Tags"), as treeRubric lays it out: its six views (the dorsal, lateral and
        // oblique are the good ones: said by the judged line only), its light without night livery, and the flags Pierre
        // may set (the fish's j c w, and f, features hidden).
        tags: treeRubric('sea slug', 'sea slugs', {
          0: [
            ['d', 'Dorsal', '', {full: 'dorsal'}],
            ['p', 'Lateral', '', {full: 'lateral'}],
            ['o', 'Oblique', '', {full: 'oblique'}],
            ['h', 'Head-on', 'head-on'],
            ['t', 'Rear', 'from behind'],
            ['v', 'Ventral', 'ventral']
          ],
          2: [
            ['g', 'Good light'],
            ['d', 'Dim', 'dim light']
          ],
          flags: [
            ['j', 'Juvenile', '', {full: 'juvenile'}],
            ['c', 'Camouflage', 'camouflage'],
            ['w', 'Watermark', 'watermark'],
            ['f', 'Features hidden', 'features hidden']
          ]
        }),
        todo: [],
        // Points: its own (data/points.json subj seaslug: the taxonomic groups' WoRMS / iNaturalist difference, rule C5).
        // Heatmap (admin-heatmap.js): every genus against every genus, live from its answers, the genera in their family's
        // block, the families in their taxonomic group (seaslug.json taxa).
        pages: [
          'inbox/todo/all',
          'inbox/todo/reports',
          'inbox/todo/errors',
          'inbox/todo/points',
          // Health: the photos everyone misses with their tools, the genera players are stuck on, from its answers
          // (admin.js statsHealth, healthBad, healthGenera)
          'inbox/todo/health',
          'players/list',
          // Photos › Tree › Key: the fish's node pages and photo tools on
          // its tree (admin.js renderFishUnits and its tiles), its genus-level photos (gl) a leaf of their genus, its sheets'
          // text slots (content above). WoRMS: the reference taxonomy's tree (seaslug.json ref, tools/seaslug_worms.py;
          // admin.js fuWormsOf), as the fish's.
          'photos/tree/key',
          'photos/tree/worms',
          // Candidates: data/seaslug-cand.json one at a time, as the fish's (admin-fish.js
          // renderFishCand), a photo moved with Not this waiting as its new species' candidate; no auto-sort (autosort)
          'photos/candidates',
          // Photo stats › Overview: its photos in play in its words (admin.js pstatsFish), its genus-level photos counted
          // at their genus, never as a species (autosort.js fishCov)
          'photos/stats/overview',
          'analyses/difficulty/heatmap',
          // Its Analyses report's views (analyses above; admin-analyses.js), and the views drawn live from its answers
          // (admin.js LIVE_STATS), as the fish's
          'analyses/overview',
          'analyses/speed',
          'analyses/difficulty/photos',
          'analyses/difficulty/formats',
          'analyses/difficulty/mix-ups',
          'analyses/difficulty/time',
          'analyses/difficulty/pairs',
          'analyses/learning/practice',
          'analyses/learning/after-a-break',
          'analyses/learning/sessions',
          'analyses/learning/profiles',
          'analyses/learning/answer-log',
          'analyses/learning/stops'
        ],
        obs: 'Observations',
        origins: [
          ['own', 'Pierre', 'Pierre'],
          ['dauin', 'iNat Dauin', 'Dauin'],
          ['ph', 'iNat Philippines', 'PH'],
          ['world', 'iNat elsewhere', 'World']
        ]
      }
    }
  ];
  // The subject chosen on this device (Home or the header), synced with the player's settings.
  const SUBJECT_KEY = 'reefid-sync-subject';
  const subjectOf = id => SUBJECTS.find(s => s.id === id) || SUBJECTS[0];
  // The difficulty engine's calibration, shared by every subject (SUBJECTS calib may set a field for a subject, with its
  // reason, rule S1): ease 0.3, the logits a point of judged ease weighs in a photo's prior, for every subject whose
  // photos carry a judged ease (docs/decisions/2026-11-23-judged-ease-weight.md); ref 1, no draw bonus;
  // early 0, no lean at the start; u unset, a photo nobody answered as unsure as model.js CAL.U says; pool unbounded,
  // every observation keeps the whole floor (model.js PICKD.FLOOR).
  const CALIB = {ease: 0.3, ref: 1, early: 0, pool: Infinity};
  const calibOf = s => ({...CALIB, ...((s && s.calib) || {})});
  // The rank subject s's game units are at (SUBJECTS unitRank, else its rank): what an answer on one of them logs, and the
  // rank app.js rankOf reads as the subject's own.
  const unitRankOf = s => (s && (s.unitRank || s.rank)) || '';
  const subjKey = (s, name) => KEYS.SYNC + subjectOf(s).id + '-' + name;
  const subjDev = (s, name) => KEYS.APP + subjectOf(s).dev + name;
  // A subject that opens to a group of players (SUBJECTS open: 'group'), not to everyone: the app, the admin and the sheet
  // keep a group for it (app.js subjOpen, admin.js groupOn, Code.gs groupIds_). Any other value opens it to all.
  const subjGroup = S => !!S && S.open === 'group';
  // Whether a card or note x concerns subject id (rule S1: the data says which subject a card is about, never the
  // engine): one with no subj is the engine's and shows in every subject; subj, a subject id or a list of them, only there.
  const subjIn = (x, id) => !x || x.subj == null || [].concat(x.subj).includes(id);
  // The notes one card shows (progress.js recalcNotice): from due, the notes not seen yet (oldest first), the longest run
  // one subject can show, and that subject: the one on screen (sid) when the first note may show there, else the first
  // note's first subject. The notes after the run wait for the next card, so marking the run's last one seen (the notes
  // are seen in order) never passes over another subject's note. {sid, L}, L empty when nothing is due.
  const noteRun = (due, sid) => {
    const L = Array.isArray(due) ? due : [],
      s = !L.length || subjIn(L[0], sid) ? sid : [].concat(L[0].subj)[0],
      n = L.findIndex(x => !subjIn(x, s));
    return {sid: s, L: n < 0 ? L : L.slice(0, n)};
  };
  // The subject of the sheet's first replay path (SUBJECTS replay: the corals): its replay, and the subject of an
  // unlabelled row. The sheet's photo memory follows it too (SUBJECTS offsets).
  const replaySubject = () => (SUBJECTS.find(S => S.replay) || SUBJECTS[0]).id;
  // The other subjects whose progress the sheet replays from their own answers (SUBJECTS replayed: fish), by id.
  const replayedSubjects = () => SUBJECTS.filter(S => !S.replay && S.replayed).map(S => S.id);
  // The subject of an answer: the app's log entry's s, and an answer-log row's index LOG_SUBJ in both the sheet's
  // readAnswers rows and its Answers tab rows (column Subject). An entry or row without one is the corals'.
  const LOG_SUBJ = 17;
  // The scoring record (scoreRec; column Scoring, W) at index LOG_SC in the sheet's readAnswers rows,
  // its Answers tab rows and the replay rows (Code.gs rowOf_, logRow) alike.
  const LOG_SC = 22;
  const ansSubject = a => String((a && a.s) || '') || SUBJECTS[0].id;
  const rowSubject = r => String((r && r[LOG_SUBJ]) || '') || SUBJECTS[0].id;
  // A surprise card's answer (quiz.js winkShow), logged like every other answer and never counted: mode WINK_MODE in the
  // app's log entry (m) and at index LOG_MODE of an answer-log row. No progress, ability, hold, replay, photo rating,
  // confusion, exposure, count or analysis reads one: subjRows and subjEntries leave them out, and so do the sheet's
  // readers (Code.gs replayed_, answers_, the Activity tab).
  const WINK_MODE = 'wink',
    LOG_MODE = 5;
  const winkEntry = a => !!a && String(a.m || '') === WINK_MODE;
  const winkRow = r => !!r && String(r[LOG_MODE] || '') === WINK_MODE;
  // The rows (or log entries, entries) of one subject, the replayed one by default: every reader of the answer log that
  // computes a subject's statistics (the analyses, the evaluation tools, the admin) keeps only that subject's rows, so a
  // fish answer never counts in a coral result; a surprise card's answer counts in none (winkRow, winkEntry).
  const subjRows = (rows, id = replaySubject()) => (Array.isArray(rows) ? rows : []).filter(r => r && rowSubject(r) === id && !winkRow(r));
  const subjEntries = (log, id = replaySubject()) =>
    (Array.isArray(log) ? log : []).filter(a => a && ansSubject(a) === id && !winkEntry(a));
  // How many answers each subject has in the answer log, {subject id: count}: its rows with a player (index 0, the name in
  // the Answers tab, the anonymous id in readAnswers) that subjRows keeps for it. The one count behind a subject's
  // Analyses refit, every 1000 of its own answers: the sheet's head (Code.gs analyses_), the Action (tools/analyses.js)
  // and the admin's status line.
  const subjCounts = rows => {
    const R = (Array.isArray(rows) ? rows : []).filter(r => r && r[0]);
    return Object.fromEntries(SUBJECTS.map(S => [S.id, subjRows(R, S.id).length]));
  };
  // A subject's first-launch answer (CHOICE): reefid-sync-<subject>-start, synced with the player's progress.
  const startKey = s => subjKey(s, 'start');
  // An answer's words for a subject (SUBJECTS start): [answer, line], null for an unknown answer.
  const startText = (s, c) => ((subjectOf(s).start || {}).opts || {})[c] || null;

