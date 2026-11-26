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
    },
    {
      v: 14,
      at: '2026-11-23',
      why: 'One 45-genus coral scale (rule L6; Pierre, 2026-11-20: "Les genres bonus dans les coraux devraient définitivement compter dans le progres global"; Q445 A, 2026-11-21: "une seule échelle de 45 genres, oui, et du coup le pourcentage actuel gardé comme score ardoise IMR"): the global progress % (the header, My progress, the achievements, the leaderboard) is the mean of the bars of every game genus, the slate\'s and the bonus genera\'s (core.js gameOf), for every player, opted in or not; today\'s % over the slate stays as the IMR slate score. No genus\'s bar moves; every device takes the replay once',
      // No card (rule D5).
      msg: null
    },
    {
      v: 15,
      at: '2026-11-23',
      why: "The level's answer count follows the log (rule D9; Q322, Q330, Pierre, 2026-11-09; docs/reviews/2026-11-09-level-count-checkpoints.md): the replay's count of the player's answers wins over the device's also when the device counts more (answers counted twice before #824), as every unit's record already did, and a level with no answer in the log keeps none (replayedOf, replayBase); the app's checkpoints count on their own answer clock (model.js tally), which never goes down. A device whose count agrees with the log keeps it; every device takes the replay once, silently (rule D6), the leaderboard included (rule D8)",
      // No card (rule D6).
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
    },
    {
      v: 7,
      at: '2026-11-23',
      why: "The level's answer count follows the log (rule D9; Q322, Q330, Pierre, 2026-11-09), as the corals' rules version 15: the replay's count of the player's answers wins over the device's also when the device counts more, and a level with no answer in the log keeps none; the app's checkpoints count on their own answer clock (model.js tally). A device whose count agrees with the log keeps it; every device takes the replay once, silently (rule D6), the leaderboard included (rule D8)",
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
    },
    {
      v: 4,
      at: '2026-11-23',
      why: "The level's answer count follows the log (rule D9; Q322, Q330, Pierre, 2026-11-09), as the corals' rules version 15 and the fish's 7: the replay's count of the player's answers wins over the device's also when the device counts more, and a level with no answer in the log keeps none; the app's checkpoints count on their own answer clock (model.js tally). A device whose count agrees with the log keeps it; every device takes the replay once, silently (rule D6), the leaderboard included (rule D8)",
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
  // characters from the device's crypto: 16 characters of a-z and 0-9, under the sheet's 20 (logIdOk).
  // Enough random characters that two answers of one millisecond never meet (the sheet would skip the second as a
  // resend). rnd: the random bytes (tests); else crypto.getRandomValues, else Math.random (a runtime without crypto,
  // never a browser the app runs in).
  const AID = 'abcdefghijklmnopqrstuvwxyz0123456789';
  function answerId(now = Date.now(), rnd) {
    const c = typeof crypto !== 'undefined' && crypto && crypto.getRandomValues ? crypto : null,
      b = rnd || (c ? c.getRandomValues(new Uint8Array(8)) : Array.from({length: 8}, () => Math.floor(Math.random() * 256)));
    return Number(now).toString(36) + Array.from(b, x => AID[x % 36]).join('');
  }
  // Whether the sheet logs an answer of this id (Code.gs logAnswers_, freshAnswers_): one with an id of a-z and 0-9 only,
  // as answerId makes it. A save's or an anonymous send's acknowledgement (log) covers only these: an entry with another
  // id, or none, is never logged, so it stays in the device's queue (sync.js logAcked, REE-351).
  function logIdOk(id) {
    return !!id && /^[a-z0-9]+$/.test(String(id));
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

