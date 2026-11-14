// Learning-outcome simulation (independent review of 2026-11-02, item 1: "make the simulation measure learning and
// noise"). tests/profiles.smoke.js checks the pacing of the path (genera met, traps, genera ready for their exam) on one
// seed; this tool measures what simulated players really learn, and how far the app's own estimates are from that
// truth, over many seeds, so a change to the algorithm can be judged on outcomes with a spread. Not run by CI (minutes,
// numbers for reading). docs/LEARNING.md, "Learning-outcome simulation".
//
//   node tools/learnsim.js [--seeds 5] [--questions 300] [--profiles beginner,lectureRA,strongRA,expert]
//                          [--workers 4] [--out results.json] [--stats stats.json|live] [--truth truth.json] [--met Acropora,Porites,...]
//                          [--breaks 10m,30m,1h,3h,8h,3d,1w,1mo] [--after 20] [--openall N] [--back keep|one]
//                          [--rt off] [--rtapp off] [--rtlog answers.json]
//                          [--choice new|imr|know|auto] [--fallback keep|accept] [--vars '{"imr":{"p":0.8}}']
//                          [--learner item|field] [--tau 0.5] [--custom 8] [--drill 200]
//                          [--subject coral|fish] [--photos fish-photos.json] [--calib '{"u":1,"pool":1e9}'] [--ach]
//                          [--beyond yes|no]
//   node tools/learnsim.js --world rated [--app truth|own|sheet] ...  the rated world (tools/ratedworld.js); --app sheet
//                          [--times rho25|rho0|views|fast] [--every 25] [--gap -0.22]: the sheet's photo Elo
// --ach (2026-11-06, the fish achievements, rule L8: each one's timing checked with the real game): the answer at which
// each achievement of the record first came, median per profile over the runs.
// --beyond (2026-11-08, the fish achievements of circle 3): how the player answers the card that offers a part of the
// slate by choice (quiz.js openOfferShow: fish circle 3, Q204): yes opens it, no keeps it closed; without it, as before
// (the card left unanswered).
// --subject fish (2026-11-06, Q186: the fish draw's learning outcomes, rules L11-L12): the player plays the fish subject
// (its slate of IMR entries, its photos and calibration); the coral-only measures (Millepora, bonus genera) stay empty.
// --photos FILE serves that file as fish-photos.json (another pool, e.g. a branch's); --calib merges fields over the
// subject's draw calibration (core.js SUBJECTS calib) before the run: '{"u":1,"pool":1e9}' gives back the fish draw of
// before Q186 (model.js CAL.U, the whole floor for every observation).
//
// --learner field (2026-11-05, the progress and set-size study; docs/LEARNING.md "Field learner"): a learner whose
// confusions grow with the number of genera it holds in mind and with how much they look alike (below, "The field
// learner"); --tau its transfer, 0 to 1. Without it, the learner of before (item), unchanged.
// --custom N (2026-11-05, the Custom-8 scenario): the player plays the Quiz until N genera are unlocked, picks those N in
// the custom quiz (quiz.js quizCustom, model.js customOf), plays --drill questions there, then goes back to the Quiz for
// the rest of --questions. The measures are those of every run, plus a row at the end of the drill and the selection's
// own bars against its true whole-slate success.
//
// --choice (2026-11-03, the first-launch question, model.js START): the answer the simulated player gives before its
// first question: new (default: the variables of today's default player), imr, know, or auto (beginner new, lecture RA
// imr, strong RA and expert know). --fallback: how the player answers the one-time card that comes when the answers
// do not fit the choice at a checkpoint (core.js CHOICE.AT, model.js startDue): keep (default) or accept (the first
// option it offers). Per run: the first 20 answers' mean surprise (right - the app's expected success), right %, the
// global level then,
// and the fallback card (answer, direction lo / hi). --vars (calibration only): other values for a choice's variables
// (core.js CHOICE opts), e.g. '{"know":{"p":1.5}}'.
// --openall N (optional; without it the player never opens all): opens all genera at question N (introAll, as My
// progress's button). 'offer', which accepted the card that offered it, went with that card (Pierre, 2026-11-12, Q337);
// a file run with it before is read the same. The back card that may follow (model.js backDue) is answered --back: 'keep'
// (default: Keep them all, so its timing is measured and nothing changes) or 'one' (One at a time). Per run: the answer
// at which all were opened, the answer since then at which the back card showed, and after Open all the app's expected
// success (each answer's e) against the learner's true chance and its answers: on the genera opened at once, at their
// first question and over the first 30 answers after Open all, and on the genera met before (the starting ability of a
// genus never answered, core.js playerStart, against what the learner really knows).
//
// --breaks (optional; without it nothing changes): the app runs on a virtual clock (10 s an answer), and after the
// --questions of the first session the player leaves for each break in turn (each from the same state, the generators
// seeded again per break, so the breaks and two versions of the app compare on the same seeds), forgets (below) and
// comes back: the second session runs until the comeback is over (questions flagged warm: the comeback after a break,
// or before it the fixed 10-question gentle restart, which the tool starts at every second session), then --after
// questions more. Per break: the comeback's length, the answers during which no genus could open (the floor), the
// success during the comeback and in the --after questions after it, how often the opening hold was on during them,
// the app's rust at the start and the learner's true loss.
// Forgetting learner (with --breaks): know[g] falls back towards the profile's starting know (prior knowledge, stable)
// over the break on the FSRS curve, know' = k0 + (know - k0) (1 + 19/81 t / S)^-0.5, S = LEARNER.S0 days x LEARNER.G for
// each further day the genus was answered right (spaced successes); our learner, not the app's model (the app reads S
// from the Elo ability and the days answered right).
//
// Long runs (2026-11-08, #734: every run of 4,500 or 8,000 answers ended in "Target crashed"): a run is one synchronous
// page.evaluate, so the page's event loop never turns until it ends, and every localStorage write (the app writes its
// answer log twice an answer, about 300,000 characters each) left messages queued in the renderer, about 1.5 MB an answer,
// until it died. The page's localStorage is now kept in its own memory (tools/memstorage.js): the same values and quota
// for the app, nothing sent, nothing queued: about 1.1 GB at 8,000 answers (9.6 GB at 3,500 before, then the crash).
// Each run (profile x seed) opens a fresh browser context (empty storage), seeds the app's Math.random and a separate
// learner random generator from the seed (runs are reproducible, and the same seeds before and after a change give
// paired comparisons), then drives the real photo quiz as profiles.smoke.js does: quizPhoto(), the first-meeting cards
// read through, a click on one of the [data-c] choices. The app's own algorithm (draw, photos, traps, duels, Again, exam,
// Elo, knowledge model, progress) runs untouched; only the player is simulated.
//
// The learner (kept simple on purpose; every constant is in LEARNER below):
// - know[g]: the chance to recognise genus g on a photo of average difficulty with all its views. On a question it
//   recognises the genus shown t with p = sigmoid(logit(know[t]) - d - 0.5 x single view), d the mean photoDiff of the
//   photos shown (the app's own photo difficulty, photoDiff: --stats, or 0 for every photo without it), as in
//   profiles.smoke.js; or, with --truth, each photo's true difficulty from that file, independent of the app's estimate
//   (2026-11-03, the hierarchical photo Elo: a change to the app's photo difficulty must not change the learner's world
//   too). truth.json: {photos: {file: difficulty}, gd: {genus: difficulty of a photo not listed}}. Recognised = right.
// - Otherwise it picks among the choices by how much each looks like the photo: weight 1 + LOOK x s(t, c), with
//   s(t, t) = 1 and s(t, c) = min(1, pooledConf(t, c) / CONF.LOOK) for another genus (the app's own confusion prior and
//   pooled mix-ups: about 1 for a declared look-alike, 0.4 same family, 0.27 shared growth form, 0.1 otherwise), times
//   (1 - ELIM x know[c]) for a wrong choice c (a genus it knows well is ruled out). So an unrecognised photo goes to the
//   target about half the time among easy choices, a quarter among 3 look-alikes, and a wrong answer falls on the
//   look-alikes.
// - After each answer, feedback teaches: know[t] += RATE x (1 - know[t]) after a right answer, x MISS after a miss
//   (the side-by-side montage shows the difference); the genus wrongly picked gains RATE x PICKED (its photo is in the
//   montage). A first-meeting card teaches like one right answer. No forgetting, except across --breaks (above).
// - Photo memory (2026-11-03, Pierre: in a genus with few photos the same ones come back, and players learn the photos
//   rather than the genus): the learner remembers each photo it was shown when answering, [seen, right]. Recognising
//   adds LEARNER.MEM[bucket] logits, averaged over the photos shown: new 0, seen but never right 0.4, right once 1.5,
//   right twice or more 2 (our assumption, close to what about 550 real photo-quiz answers showed against the app's
//   logged expectation: 83% right on photos new to the player where 76% was expected, 85% / 72% seen never right, 95% /
//   76% right once, 9 of 9 right twice or more; docs/LEARNING.md "Photo memory"). Memory helps on that photo only: it
//   teaches nothing more about the genus, and the hard reference question below (a photo never seen) ignores it, so
//   what memory adds to the answers is exactly what the app must not count as knowledge. --mem 0 turns it off (the
//   learner before 2026-11-03); --mem 0,0.4,1.5,2 sets the four offsets.
//
// - Response time (2026-11-04, docs/LEARNING.md "Response time"): the learner takes t seconds to answer, log t =
//   log T0 - B x right - C x logit(pTrue) + SD x N(0, 1), pTrue its true chance on the question (below), drawn from a
//   generator of its own (the answers and the app's draws are the same whatever the time model), rounded to the tenth
//   as the app logs it (quiz.js qclockRead), and handed to the app's question clock (QCLOCK) before the click. B and C
//   are set so that the simulated logs replayed by tools/abilityeval.js --rtfit give back the two measures of the real
//   answers (PR #431: -0.88 per unit of z on the answer itself, -0.39 on the next answer on the genus after a right one);
//   T0 only sets the scale (z is against the player's own median). No zoom: the learner never enlarges a photo (too
//   few real answers to model it yet). The app weighs a right answer's steps by its time once the sync script replays
//   it (core.js RT_SHEET): the tool says so to the app (the sheet version it last saw, reefid-sheet-v); --rtapp off keeps
//   the app as before that script (every weight 1); --rt off gives no seconds at all (the learner before 2026-11-04).
//   --rtlog writes the app's own answer log of every run (readAnswers rows, player = profile:seed, then the learner's
//   pTrue and its time noise) for tools/abilityeval.js.
//
// The field learner (--learner field; every constant in LEARNER.FIELD). The item learner above recognises a genus whatever
// the competitors: drilling 8 genera raises know as drilling 40 would (docs/LEARNING.md "Field learner"). This one keeps
// know[g] (the same teaching) and adds a contrast skill x per pair of genera, learned only when the pair is contrasted:
// both among a question's choices (RATE x PAIR), or side by side in the montage after a miss (RATE x MISS); a typed
// question contrasts nothing but its montage. A question on genus t among the set V (its choices, or for a typed one the
// genera the learner has met: the names it holds in mind) is answered right with the Luce choice
//   P = 1 / (1 + exp(d + 0.5 x single view - photo memory) x sum over c in V, c != t of r(t, c)),
//   r(t, c) = (1 + LOOK s(t, c)) (1 - ELIM know[c] g) / (1 + LOOK) x (1 - know[t])^(A g),  g = tau + (1 - tau) x(t, c),
// with s the item learner's look (pooledConf), so the odds of taking t for c grow with their pooled confusion, and every
// genus held in mind adds its own: more names, more errors (set size), even unrelated ones. g is the share of what the
// learner knows of t (in log odds) that works against c: tau (transfer) of it with no contrast at all, all of it once the
// pair was contrasted many times. Wrong, it names c with chance proportional to r(t, c) (typed: "I don't know" half the
// time, as the item learner). x starts at min(know0) of the two genera (prior knowledge was learned in the field). A: with
// every pair contrasted at know 0.5 and 4 easy choices, P 0.75 as for the item learner; an expert (0.93) about 0.85
// against the slate.
// Truth (both learners, docs/LEARNING.md): pOpen(t), the learner's success on an average photo of t with every slate genus
// a possible answer (its own choice rule over the 40: Luce for the field learner, the item learner's guess otherwise).
//
// Measures, at each checkpoint (50, 100, 200, 300 questions, then every 300), mean +- sd over the seeds:
// - knowSlate: true mean know over the slate genera (the 39 of the IMR coral slate and Millepora); knowMet: over the
//   genera met (cards or asked).
// - thErr / thBias: mean |theta - logit(know)| and mean (theta - logit(know)) over the genera met, theta = ability(g),
//   the app's Elo estimate (the learner's own model has the same scale: theta = logit(know) means a perfect estimate;
//   theta is clamped to ELO.lo..hi, so a genus known at 2% cannot be estimated below -1.5). level: the app's global level
//   (P['~level'].th).
// - progGap: mean (genScore(g) - know[g]) over the genera met: > 0 the progress bar over-claims, < 0 it under-claims;
//   prog / know%: the app's progress over the slate (progPct) next to 100 x knowSlate.
// - met, learned (s.mx), right % over the questions since the previous checkpoint.
// - open/15: the most genera opened on their own cards (the path's pace, the first cards left out) in any 15
//   consecutive questions so far (2026-11-04: a strong player was opened 7 genera in 16 answers).
// - look: true chance to tell a declared look-alike pair apart (IMR lecture / Coral Finder, `look`, both genera on the
//   slate), in a 2-choice question on an average photo, both directions averaged, over every declared pair.
// - refTrue: genera whose true success on the hard reference question is 0.9 or more (one photo alone, photo
//   difficulty +1 and the single-view 0.5, 4 choices: the genus and its 3 most confusable slate genera by pooledConf).
// - exam: genera that entered the mastery exam so far (examOn true, or an exam question shown), and refEntry, their
//   mean true success on the hard reference question at the moment they entered; refLearned, the same when learned.
// - Per run: when Millepora was met and first asked, when the bonus genera were offered (every slate genus met; the
//   simulated player accepts, "Add them"), and the share of the questions on bonus genera after that.
// - Per run, openings after a miss (model.js openRight, 2026-11-03): the genera opened on their own cards, those on the
//   question right after a miss (0 with the rule), the questions where that rule alone held the opening (with the chance
//   openChance would have opened one), and the questions from each spell of them to the next opening.
// - Per run, metAt: the question at which each genus was first met (card or asked); printed as the median question per
//   profile for the genera of --met (a genus not met counts as later than the last question, shown ">N").
// - By photo count (photo memory): the slate genera with few game photos (FEW, 14 or fewer) against those with many
//   (MANY, 20 or more), at each checkpoint: questions so far showing a photo the learner had already been shown (rep%),
//   right % on all of them and on those repeats, mean progress bar against true know (prog-know) and Elo against
//   logit(know) (th-lk) over the genera met, genera learned; and, per genus that entered the exam or was learned, the
//   true reference success then (ref@exam, ref@learn) and the question it happened.
// - Per run, in --out only (2026-11-06, photo exposure, Q187-Q190): expo, each question's [genus, colony (observation),
//   photos shown], and pool (seed 1's runs), each game genus's photos as [file, colony]: repeats, photos never shown,
//   answers per photo (docs/LEARNING.md "Photo exposure"); preOW (2026-11-08), each question's [under Open Water, the
//   lowest judged ease shown] (docs/LEARNING.md "Rarely under ease 4 before Open Water").
// - The levels and the score (2026-11-08, rule L11's measures, docs/LEARNING.md "Validating a learning change"): at each
//   checkpoint, kinds, per kind of unit (the subject's rank for its slate: genus, family; app.js rankOf for a set's units,
//   the fish scientific genera; bonus for the corals' bonus genera), its units, those met, at Open Water and at Advanced
//   (LV_AT), the judge's D* and E = bar - D* over those met; score, the shown score (model.js headPct) and, for a subject
//   with a global score, its components (core.js treeScore: entries, genera, common, scientific, S, credit, raw; by
//   circle); plateau, the longest stretch of answers so far without a new high of the shown score. Per run: owAt and
//   advAt, the answer at which each unit first reached Open Water and Advanced; kinds, each unit's kind; c3, the answer
//   at which circle 3 was offered (the card) and first met. tools/learncmp.js reads them, with the photo exposure (expo,
//   preOW above).
const http = require('http'),
  fs = require('fs'),
  os = require('os'),
  path = require('path');
const {chromium} = require('playwright');
const {memStorage} = require('./memstorage.js');
const ROOT = path.join(__dirname, '..');

// Profiles (2026-11-08, rule L11): tools/learnprof.js, the same list for both subjects and both worlds, by lecture group,
// family, circle or commonness rather than data order; loaded in the page too (an init script), where its knownUnits
// reads the app's own units. The default list: every profile with a part for the subject (the corals: beginner, lecture
// RA, strong RA, expert; the fish: and the casual diver).
const {PROFILES, defaults: DEFAULT_PROFILES, profOf} = require('./learnprof.js');
// The learner's constants (above). LOOK 3: a declared look-alike draws an unrecognised photo as much as the genus
// itself (a coin toss in a look-alike duel), an unrelated genus 1.3 against 4. ELIM 0.5: a genus known for sure is
// half as tempting. MISS 1.5, PICKED 0.5: feedback after a miss teaches more, and a little about the genus picked.
// MEM: the photo memory above (logits added to recognising, by bucket: new, seen never right, right once, right 2+).
// FEW / MANY: the photo-count groups of the measures by photo count (game photos of the genus).
const LEARNER = {
  LOOK: 3,
  ELIM: 0.5,
  MISS: 1.5,
  PICKED: 0.5,
  SINGLE: 0.5,
  REF_D: 1,
  REF_OK: 0.9,
  S0: 2,
  G: 2.5,
  STEP: 10000,
  MEM: [0, 0.4, 1.5, 2],
  FEW: 14,
  MANY: 20,
  // Response time (above): log seconds T0, the drop after a right answer B, per logit of the true chance C, noise SD.
  RT: {T0: 7, B: 0.15, C: 0.3, SD: 0.6},
  // The field learner (above): A in (1 - know)^(A g), PAIR the contrast taught to each wrong choice shown.
  FIELD: {A: 1.6, PAIR: 1},
  // A Learned genus counts as rightly learned when its true whole-slate success pOpen is PREC or more (precision of Learned).
  PREC: 0.8,
  // The exemplar learner (--learner exemplar; 2026-11-06, the third world of the judge, docs/LEARNING.md "The judge"): a
  // summed-similarity exemplar model after the GCM (Nosofsky 1986, JEP:General 115:39), with a background (guessing)
  // term. Every photo shown with its answer is stored as an exemplar of the genus shown, and the montage of a miss stores
  // one typical photo of the genus given; prior knowledge know gives w0 = know / (1 - know) typical exemplars. A photo of
  // difficulty d sits at atypicality r = R sig(d) (+ the single-view offset); its similarity to an exemplar of genus c is
  // exp(-K sqrt(D_tc^2 + r^2 + r_e^2)) (the very same photo: exp(-K D_tc)), D_tc = D (1.1 - s(t, c)), s the item
  // learner's look (1 for a declared look-alike, about 0.1 otherwise). With S_c the summed similarity to c's exemplars,
  // P(t) = S_t / (sum over V of S_c + B), and the background share B / (...) is a guess among V (the choices, or the
  // names held when typing). Four constants, chosen by a small grid (scratch gcmgrid.js) so that, open against the slate:
  // 13 exemplars of every genus give 0.85 on an average photo, 0.68 on a hard one (d 2), 0.91 on an easy one; 6 each
  // 0.77; one exemplar of the genus alone 0.43 (0.56 among 4 choices). Unlike the field learner, a genus nobody stored
  // does not compete: a drilled genus is named right among the slate (0.96), the GCM's own prediction.
  EX: {K: 8, R: 0.6, D: 8, B: 0.03}
};
// The judge (2026-11-06, Pierre Q127, docs/reviews/2026-11-06-progress-metric-research.md): the domain score D*(g) = the
// learner's true success naming a photo of g alone (one view), with no choices (every slate genus a possible answer for
// the field and exemplar learners; recognition alone for the item learner), averaged over g's theoretical photo
// distribution N(mu_g, SD^2) (Gauss-Hermite, 7 points). SD: the spread of photo difficulty within a genus (an assumption:
// easy to hard about +-1.5 logits); NOISE: the app's error on a photo's difficulty with --truth gen. GH: the 7-point
// Gauss-Hermite rule for e^(-x^2), [node, weight / sqrt(pi)] (the nodes times sqrt(2) for a standard normal).
const JUDGE = {SD: 0.8, NOISE: 0.3, GH: [[-2.651961, 0.000548], [-1.673552, 0.030757], [-0.816288, 0.240123], [0, 0.457143], [0.816288, 0.240123], [1.673552, 0.030757], [2.651961, 0.000548]]};

const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : d;
};
const SEEDS = Number(arg('seeds', 5)),
  // --seed0 N: seeds N+1 to N+SEEDS (a confirmation on fresh seeds after a selection on 1-SEEDS).
  SEED0 = Number(arg('seed0', 0)),
  // --sheetv N: the sync script version the app last saw (default 1000: every gate on). With --sheetv 55 the field rule
  // (core.js COVER_SHEET 56) is off: today's rules on the same code, for paired comparisons.
  SHEETV = Number(arg('sheetv', 1000)),
  QN = Number(arg('questions', 300)),
  NAMES = arg('profiles', DEFAULT_PROFILES(arg('subject', 'coral')).join(',')).split(','),
  WORKERS = Number(arg('workers', Math.max(1, Math.min(4, os.cpus().length)))),
  OUT = arg('out', null),
  STATS = arg('stats', null),
  TRUTH = arg('truth', null),
  AFTER = Number(arg('after', 20)),
  UNIT = {m: 60000, h: 3600000, d: 864e5, w: 7 * 864e5, mo: 30 * 864e5},
  BREAKS = (arg('breaks', '') || '')
    .split(',')
    .filter(Boolean)
    .map(b => {
      const m = /^(\d+(?:\.\d+)?)(mo|m|h|d|w)$/.exec(b);
      if (!m) throw new Error(`bad break ${b} (10m, 8h, 3d, 1w, 1mo)`);
      return [b, Number(m[1]) * UNIT[m[2]]];
    }),
  OPENALL = arg('openall', ''),
  ACHT = process.argv.includes('--ach'), // the achievements' timing (below: "Achievements")
  BEYOND = arg('beyond', ''),
  CHOICE = arg('choice', 'new'),
  FALLBACK = arg('fallback', 'keep'),
  VARS = JSON.parse(arg('vars', '{}')),
  AUTO = {beginner: 'new', casualDiver: 'new', lectureRA: 'imr', strongRA: 'know', expert: 'know'},
  BACK = arg('back', 'keep'),
  MET = arg('met', 'Acropora,Porites,Pocillopora,Montipora,Millepora').split(',').filter(Boolean),
  RTON = arg('rt', 'on') !== 'off',
  RTAPP = arg('rtapp', 'on') !== 'off',
  RTLOG = arg('rtlog', null),
  LEARN = arg('learner', arg('world', 'app') === 'rated' ? 'count' : 'item'), // the rated world's: count (tools/ratedworld.js)
  TAU = Number(arg('tau', 0.5)),
  CUSTOMN = Number(arg('custom', 0)),
  DRILL = Number(arg('drill', 200)),
  SUBJECT = arg('subject', 'coral'),
  PHOTOS = arg('photos', null),
  CALIBX = JSON.parse(arg('calib', '{}')),
  // --world rated (2026-11-08, rule L11): the rated world in Node (tools/ratedworld.js) instead of the app in Chromium;
  // --dist its photo distribution (normal, tail: 15% of the photos 1.5 harder, t3), --app what the app knows (truth: every
  // photo and unit rated; own: its judged-ease prior alone). --questions counts its answers.
  WORLD = arg('world', 'app'),
  DIST = arg('dist', 'normal'),
  APPK = arg('app', 'truth'),
  // --coralsd: the corals' genus spread in the rated world (default tools/ratedworld.js RATED.CORAL_GD, 0.286; 0.37 the
  // sensitivity variant).
  CORALSD = Number(arg('coralsd', 0)) || null,
  // --app sheet (2026-11-09, Q315 level 2): the rated world's players, one per profile, play one world in turn and the
  // app reads the sheet's photo Elo replayed on their own log (tools/ratedworld.js runPop); --times the case of the
  // simulated seconds (rho25, rho0, views, fast), --every the rounds between two refreshes of the ratings served.
  TIMESK = arg('times', 'rho25'),
  EVERY = Number(arg('every', 25)),
  // --gap (Q324): the knowledge-gap term of the simulated seconds, log seconds per logit of the learner's true ability -
  // difficulty on the question (the real log: -0.22, LEARNING.md "Response time: genus and photo"); 0 by default.
  GAPX = Number(arg('gap', 0));
if (!['app', 'rated'].includes(WORLD)) throw new Error('--world app or rated');
if (OPENALL && !/^\d+$/.test(OPENALL)) throw new Error('--openall N: the question at which all genera open (the offer card went, Q337)');
if (!['normal', 'tail', 't3'].includes(DIST)) throw new Error('--dist normal, tail or t3');
if (!['truth', 'own', ...(WORLD === 'rated' ? ['sheet'] : [])].includes(APPK)) throw new Error('--app truth or own (sheet: the rated world)');
if (!(EVERY >= 1 && isFinite(GAPX))) throw new Error('--every 1 or more, --gap a number');
if (APPK === 'sheet' && SUBJECT !== 'coral') throw new Error('--app sheet: the corals only (tools/ratedworld.js runPop)');
if (!['coral', 'fish'].includes(SUBJECT)) throw new Error('--subject coral or fish');
if (arg('world', 'app') === 'rated' ? !['count', 'item'].includes(LEARN) : !['item', 'field', 'exemplar'].includes(LEARN))
  throw new Error(arg('world', 'app') === 'rated' ? '--learner count or item in the rated world' : '--learner item, field or exemplar');
if (!(TAU >= 0 && TAU <= 1)) throw new Error('--tau between 0 and 1');
if (CUSTOMN && !(CUSTOMN >= 2 && DRILL >= 1)) throw new Error('--custom 2 or more genera, --drill 1 or more questions');
{
  const m = arg('mem', null);
  if (m !== null) {
    const v = m.split(',').map(Number);
    if (v.some(isNaN) || (v.length !== 1 && v.length !== 4)) throw new Error('--mem 0 (no photo memory) or four offsets, e.g. 0,0.4,1.5,2');
    LEARNER.MEM = v.length === 1 ? [v[0], v[0], v[0], v[0]] : v;
  }
}
for (const n of NAMES) {
  if (!PROFILES[n]) throw new Error(`unknown profile ${n} (${Object.keys(PROFILES).join(', ')})`);
  if (!PROFILES[n][SUBJECT]) throw new Error(`profile ${n} has no ${SUBJECT} part (${DEFAULT_PROFILES(SUBJECT).join(', ')})`);
}
const CPS = [
  ...new Set(
    [50, 100, 200, 300]
      .filter(q => q <= QN)
      .concat(
        Array.from({length: Math.floor(QN / 300)}, (_, i) => 300 * (i + 1)),
        [QN]
      )
  )
].sort((a, b) => a - b);
// Photo statistics of the sync sheet (?stats=1 answer, or {photos, conf, mem, gd, fmt, v}), to rate the photos as live
// players do; without it every photo's difficulty is 0 (no sheet), as in CI (the Easy/Medium/Hard sets before 2026-11-03).
// --stats live reads them from the sheet at start (read-only, the GET the app makes) with av=learnsim: a ?stats=1 read
// without an app version is logged by the sheet as an app from before 2026-11-03 (Code.gs v25 'old'; 2026-11-05: the
// integrator's own curl and, most likely, the files saved for --stats on 11-03 made the only 'old' rows). Fetch a file
// by hand the same way: curl "<SYNC_URL>?stats=1&av=tool" (tests/statsav.test.js checks the repo's own reads).
let STATS_JSON = STATS && STATS !== 'live' ? JSON.parse(fs.readFileSync(STATS, 'utf8')) : null;
const liveStats = () =>
  fetch(/const SYNC_URL = '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'))[1] + '?stats=1&av=learnsim').then(r =>
    r.json()
  );
// --truth gen[:SD[:NOISE]] (2026-11-06, the judge): no file; every photo's true difficulty is drawn from its genus's
// theoretical distribution N(mu_g, SD^2) (mu_g the genus offset of --stats gd, else 0; SD default JUDGE.SD), from a hash
// of its file name, so a photo keeps it across runs and seeds; the app is told an estimate of it (the true value plus
// N(0, NOISE^2), default JUDGE.NOISE, as if 20 trusted answers had rated it). The domain score D* reads the same
// distribution. --truth file.json: as before ({photos, gd}); its sd (or JUDGE.SD) is the spread.
const TRUTH_GEN = TRUTH && /^gen(:|$)/.test(TRUTH) ? TRUTH.split(':').slice(1).map(Number) : null;
const TRUTH_JSON = TRUTH && !TRUTH_GEN ? JSON.parse(fs.readFileSync(TRUTH, 'utf8')) : null;

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json'
};
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname),
    own = PHOTOS && u === '/fish-photos.json',
    f = own ? path.resolve(PHOTOS) : path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!own && !f.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(f, (e, b) => {
    if (e) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'});
    res.end(b);
  });
});

// One player, inside the page: the app's globals (P, quizPhoto, photoDiff, pooledConf, ...) are in scope.
function play(cfg) {
  const {prof, seed, N, cps, L, breaks, after, openall, back, truth, rton, choice, fallback, vars} = cfg,
    ACHT = cfg.ach,
    BEYOND = cfg.beyond;
  // The subject's draw calibration overridden (--calib), and the corals' bonus genera only on the corals (--subject).
  if (cfg.calib && Object.keys(cfg.calib).length) SUBJ.calib = {...(SUBJ.calib || {}), ...cfg.calib};
  const BON = SUBJ.id === 'coral' && typeof BONUS !== 'undefined' ? BONUS : [];
  // The fish surprise questions (quiz.js winkDue, from answer 300) count in nothing: left out of the measured path.
  if (typeof winkDue === 'function') winkDue = () => null;
  const field = cfg.learner === 'field',
    exem = cfg.learner === 'exemplar',
    tau = cfg.tau,
    J = cfg.judge;
  if (typeof CHOICE !== 'undefined') CHOICE.opts.forEach(o => Object.assign(o[1], vars[o[0]] || {}));
  // The learner's difficulty of a photo of genus t: --truth when given, else the app's own (photoDiff).
  // --truth gen: each photo's true difficulty drawn from N(mu_g, SD^2) by a hash of its file (a probit of a uniform), the
  // app told the true value plus N(0, NOISE^2) by the same hash (photo statistics as 20 trusted answers would give them).
  const tg = cfg.truthGen,
    TSD = tg && tg[0] > 0 ? tg[0] : (truth && truth.sd) || J.SD,
    TNOISE = tg && tg[1] >= 0 ? tg[1] : J.NOISE,
    hashU = (str, salt) => {
      let h = 2166136261 ^ salt;
      for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
      return ((h >>> 0) + 0.5) / 4294967296;
    },
    probit = u => {
      // Acklam's rational approximation of the normal quantile (|error| < 1.2e-9)
      const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239],
        b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771720, -13.28068155288572],
        c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
        e = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
      const pl = 0.02425;
      if (u < pl) {
        const q = Math.sqrt(-2 * Math.log(u));
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((e[0] * q + e[1]) * q + e[2]) * q + e[3]) * q + 1);
      }
      if (u > 1 - pl) return -probit(1 - u);
      const q = u - 0.5,
        r = q * q;
      return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    };
  const muOf = g => (typeof PGD === 'object' && PGD[g] ? PGD[g][0] || 0 : 0);
  const GEN_D = {};
  if (tg) {
    // Every game photo of every genus the game can ask: its true difficulty, and the app's estimate of it.
    const ps = {};
    [...slateGenera(), ...BON].forEach(g =>
      VIEWS.forEach(([v]) =>
        gamePics(g, v).forEach(p => {
          const d = muOf(g) + TSD * probit(hashU(p.f, 1));
          GEN_D[p.f] = d;
          ps[p.f] = [Math.round((d + TNOISE * probit(hashU(p.f, 2))) * 100) / 100, 20, 20, 20];
        })
      )
    );
    PSTAT = ps;
  }
  const trueD = (t, p) =>
    tg ? GEN_D[p.f] ?? muOf(t) : truth ? (truth.photos || {})[p.f] ?? ((truth.gd || {})[t] || 0) : photoDiff(t, p);
  // The theoretical photo distribution of genus g, as the judge's D* reads it: N(mu, SD^2), mu the genus offset (--truth
  // gen), the file's gd (--truth file), else the mean of the app's own difficulties of g's game photos (and their spread).
  const distOf = g => {
    if (tg) return [muOf(g), TSD];
    if (truth) return [(truth.gd || {})[g] || 0, TSD];
    const ds = VIEWS.flatMap(([v]) => gamePics(g, v).map(p => photoDiff(g, p)));
    if (!ds.length) return [0, J.SD];
    const m = ds.reduce((a, x) => a + x, 0) / ds.length;
    return [m, Math.sqrt(ds.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, ds.length - 1)) || J.SD];
  };
  // With breaks: a virtual clock, STEP an answer (the app reads Date.now for the comeback).
  let T = Date.parse('2026-11-02T08:00:00Z');
  if (breaks.length) Date.now = () => T;

  const sig = x => 1 / (1 + Math.exp(-x)),
    cl = q => Math.min(0.995, Math.max(0.005, q)),
    logit = q => Math.log(cl(q) / (1 - cl(q))),
    mean = A => (A.length ? A.reduce((a, x) => a + x, 0) / A.length : null);
  // The most genera opened on their own cards in any 15 consecutive questions (Q: the questions that opened one).
  const per15 = Q => Math.max(0, ...Q.map(q => Q.filter(x => x >= q && x < q + 15).length));
  // Two generators (mulberry32) seeded from the run's seed: the app's Math.random, seeded again here because the page
  // load draws a varying number of times (photos and timers come in their own order), and the learner's own.
  const gen = a => () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Math.random = gen((seed * 2246822519) ^ 0x85ebca6b);
  let rnd = gen((seed * 2654435761) ^ 0x9e3779b9);
  // The learner's time to answer: a generator of its own (Box-Muller), so the answers never depend on the time model.
  const trnd = gen((seed * 2246822519) ^ 0x27d4eb2f),
    tnorm = () => Math.sqrt(-2 * Math.log(1 - trnd())) * Math.cos(2 * Math.PI * trnd()),
    rtq = []; // per answer: [pTrue, the noise drawn], for --rtlog
  const SL = slateGenera(),
    TRACE = 80,
    know = {};
  // The slate units the profile knows (tools/learnprof.js: by lecture group, family, circle or commonness).
  const UN = typeof UNITS === 'object' ? UNITS[SUBJ.id] : {},
    knows = LEARNPROF.knownUnits(prof, {
      SL,
      group: shownGroup,
      numbered: g => ((DATA.gen || {})[g] || {}).n > 0,
      core: UN.core ? UN.core() : [],
      tree: UN.tree && UN.tree() ? UN.tree().f : []
    });
  SL.forEach(g => (know[g] = knows.has(g) ? prof.hi : prof.lo));
  BON.forEach(g => (know[g] = prof.lo));
  // The units of the subject's opt-in sets (app.js UNITS sets: the fish scientific genera), learned like any unit from the
  // profile's low start (2026-11-08, the fish achievements on genera): before, they were never taught (not in know), so
  // their questions stayed at chance, the genera stayed shaky and held the openings of the families.
  if (typeof SETS === 'function')
    SETS()
      .flatMap(S => (S.all ? S.all() : S.units()))
      .forEach(g => {
        if (g in know) return;
        // A set's unit (a fish scientific genus) by its family (GX parent): gen (tools/learnprof.js).
        know[g] = LEARNPROF.genKnown(prof, knows, (GX(g) || {}).parent, (GX(g) || {}).imrg) ? prof.hi : prof.lo;
      });
  const kn = g => know[g] ?? prof.lo;
  const teach = (g, x) => {
    if (g in know) know[g] += x * (1 - know[g]);
  };
  const k0 = {...know},
    LS = {}; // the learner's own stability per genus (breaks): [days, last day answered right]
  const spaced = g => {
    const d = Math.floor(T / 864e5),
      x = (LS[g] = LS[g] || [L.S0, null]);
    if (x[1] !== null && x[1] !== d) x[0] *= L.G;
    x[1] = d;
  };
  const forget = ms =>
    Object.keys(know).forEach(g => {
      if (know[g] > k0[g]) know[g] = k0[g] + (know[g] - k0[g]) * (1 + ((19 / 81) * ms) / 864e5 / (LS[g] || [L.S0])[0]) ** -0.5;
    });
  // How much choice c looks like a photo of t (1 for t itself), and the chance to pick each choice when t is not
  // recognised.
  const sim = (t, c) => (c === t ? 1 : Math.min(1, pooledConf(t, c) / CONF.LOOK));
  const wOf = (t, c) => (1 + L.LOOK * sim(t, c)) * (c === t ? 1 : 1 - L.ELIM * kn(c));
  const pRight = (t, ch, d, single) => {
    const p = sig(logit(kn(t)) - d - (single ? L.SINGLE : 0)),
      ws = ch.map(c => wOf(t, c)),
      tot = ws.reduce((a, x) => a + x, 0);
    return p + (1 - p) * (ws[ch.indexOf(t)] / tot);
  };
  // The hard reference question of a genus: its 3 most confusable slate genera, fixed for the run.
  const REF = Object.fromEntries(
    SL.map(g => [
      g,
      SL.filter(x => x !== g)
        .sort((a, b) => pooledConf(g, b) - pooledConf(g, a))
        .slice(0, 3)
    ])
  );
  // The field learner (above): the pairs' contrast skill x, its odds r(t, c) of taking t for c, and its chance on t among V.
  const X = {},
    pkey = (a, b) => (a < b ? a + '|' + b : b + '|' + a),
    xOf = (t, c) => X[pkey(t, c)] ?? Math.min(k0[t] ?? prof.lo, k0[c] ?? prof.lo),
    contrast = (t, c, x) => {
      if (c && c !== t) {
        const v = xOf(t, c);
        X[pkey(t, c)] = v + x * (1 - v);
      }
    },
    rOf = (t, c) => {
      const g = tau + (1 - tau) * xOf(t, c);
      return (((1 + L.LOOK * sim(t, c)) * (1 - L.ELIM * kn(c) * g)) / (1 + L.LOOK)) * (1 - kn(t)) ** (L.FIELD.A * g);
    },
    pField = (t, V, d, single, mem = 0) =>
      1 / (1 + Math.exp(d + (single ? L.SINGLE : 0) - mem) * V.reduce((a, c) => a + (c === t ? 0 : rOf(t, c)), 0)),
    // The genera a field learner holds in mind for a typed answer: those it has met, and the genus asked.
    vocab = t => [...new Set([t, ...SL.concat(BON).filter(introduced)])];
  // The exemplar learner (--learner exemplar; LEARNER.EX above): its stored exemplars per genus, [atypicality, weight,
  // photo file or null], prior knowledge as w0 = know / (1 - know) typical ones.
  const EXC = L.EX,
    EXS = {},
    rAt = d => EXC.R * sig(d),
    exAdd = (g, r, f, w = 1) => (EXS[g] = EXS[g] || []).push([r, w, f]);
  if (exem) [...SL, ...BON].forEach(g => exAdd(g, rAt(0), null, Math.min(50, kn(g) / (1 - kn(g)))));
  // The summed similarity of a photo of t (atypicality rx, file fx or null) to c's exemplars.
  const exS = (t, c, rx, fx) => {
    const D = c === t ? 0 : EXC.D * (1.1 - sim(t, c));
    return (EXS[c] || []).reduce((a, [re, w, f]) => a + w * Math.exp(-EXC.K * (fx && f === fx && c === t ? D : Math.sqrt(D * D + rx * rx + re * re))), 0);
  };
  // Its chance on t among V for a photo of difficulty d (fs: the photos shown, a stored one recognised as itself); S the
  // weights of the answers it gives when wrong (the summed similarities, the background spread evenly).
  const pEx = (t, V, d, single, fs = []) => {
    const rx = rAt(d + (single ? L.SINGLE : 0)),
      fx = fs.find(f => (EXS[t] || []).some(e => e[2] === f)) || null,
      S0 = V.map(c => exS(t, c, rx, fx)),
      tot = S0.reduce((a, x) => a + x, 0) + EXC.B,
      S = S0.map(x => x + EXC.B / V.length);
    return {p: S[V.indexOf(t)] / tot, S};
  };
  // A question's true chance by the learner's own rule (pRight for the item learner, as before).
  const pCh = (t, ch, d, single) => (field ? pField(t, ch, d, single) : exem ? pEx(t, ch, d, single).p : pRight(t, ch, d, single));
  // The judge's domain score D*(t): success naming a photo of t alone (one view) with no choices, over t's theoretical
  // photo distribution (distOf). Item learner: recognition alone (no guess); field and exemplar: every slate genus a
  // possible answer.
  // The possible answers for a unit outside the slate (a fish scientific genus, a coral bonus genus: the per-kind measures,
  // Codex review #783): the units of its own kind, itself included; a slate unit keeps the slate.
  const vocabOf = t => (SL.includes(t) ? SL : [...new Set([t, ...UALL.filter(g => kindOf(g) === kindOf(t))])]);
  const dOne = (t, d) => (field ? pField(t, vocabOf(t), d, true) : exem ? pEx(t, vocabOf(t), d, true).p : sig(logit(kn(t)) - d - L.SINGLE));
  const dStar = t => {
    const [mu, sd] = distOf(t);
    // GH holds the physicists' Gauss-Hermite nodes (weight e^(-x^2)) with weights over sqrt(pi): a standard normal z is
    // sqrt(2) x (Codex review #624).
    return J.GH.reduce((a, [x, w]) => a + w * dOne(t, mu + sd * Math.SQRT2 * x), 0);
  };
  // The truth the field measures read: success on an average photo of t with every slate genus a possible answer.
  const pOpen = t => pCh(t, SL, 0, false);
  const ref = g => pCh(g, [g, ...REF[g]], L.REF_D, true);
  // Photo memory: [seen, right] per photo file the learner was shown when answering, and the logits it adds.
  const LM = {},
    bucket = h => (!h || !h[0] ? 0 : !h[1] ? 1 : h[1] === 1 ? 2 : 3),
    memOn = fs => mean(fs.map(f => L.MEM[bucket(LM[f])])) || 0;
  // Game photos per slate genus (as My progress counts them, seenOf), and its group: few, many, or neither.
  const NPH = Object.fromEntries(SL.map(g => [g, new Set(VIEWS.flatMap(([v]) => gamePics(g, v).map(p => p.f))).size])),
    // Photo exposure (2026-11-06, Q187-Q190): each question's unit, colony (observation) and photos shown, and the game
    // photos of each unit with their colony, for the repeat rate, the photos never shown and the answers per photo.
    okey = p => p.o || p.f,
    expo = [],
    // Before Open Water (2026-11-08, model.js RARE): each question's [1 if its unit was under Open Water when drawn, else
    // 0; the lowest judged ease of its photos, 0 for none], for the share of photos under ease 4 before Open Water.
    preOW = [],
    POOL = Object.fromEntries(
      SL.concat(BONUS).map(g => [
        g,
        [...new Map(VIEWS.flatMap(([v]) => gamePics(g, v).filter(p => gamePhotoOk(g, p))).map(p => [p.f, okey(p)])).entries()]
      ])
    ),
    grpOf = g => (!(g in NPH) ? null : NPH[g] <= L.FEW ? 'few' : NPH[g] >= L.MANY ? 'many' : null),
    GRP = {few: SL.filter(g => grpOf(g) === 'few'), many: SL.filter(g => grpOf(g) === 'many')},
    gq = {few: {n: 0, ok: 0, rep: 0, repOk: 0}, many: {n: 0, ok: 0, rep: 0, repOk: 0}};
  const PAIRS = [];
  SL.forEach(a => SL.forEach(b => a < b && isLook(a, b) && PAIRS.push([a, b])));
  const lookAcc = () => mean(PAIRS.map(([a, b]) => (pCh(a, [a, b], 0, false) + pCh(b, [a, b], 0, false)) / 2));
  const inExam = g => (typeof examOn === 'function' && examOn(g)) || !!(P[g] || {}).ex;

  // A fresh player (the context's storage is empty): no hold, no gentle restart, no Open all unless --openall.
  P = {};
  INTROS = {};
  HOLDS = 0;
  const old = typeof CB === 'undefined'; // before the comeback replaced the gentle restart (warmLeft)
  if (old) warmLeft = 0;
  else CB = {r: 0, t: 0, ok: 0, f: 0};
  // The planner's history too: start-up's own planNext drew with unseeded randomness and left recent genera damped
  // (weight x 0.1), so the same seed gave different runs (Codex review #365).
  dropPlans();
  NEXTQ = null;
  SHOWNQ = null;
  last = null;
  lastQs = [];
  rematch = Array.isArray(rematch) ? [] : null; // the Again queue (a list since 2026-11-04; one slot before)
  twoAt = -Infinity;
  twoPair = '';
  store.set(INTRO.OFFER.KEY, null);
  // --openall: the app's expectation of each answer (the e the opening hold gets).
  let lastE = null;
  const hs0 = holdStep;
  holdStep = (e, good) => ((lastE = e), hs0(e, good));
  const oa = {at: null, set: [], back: null, ans: []};
  // The first-launch question (--choice), answered before the first question; the first answers measured, and the
  // fallback card that may follow them.
  if (typeof startSet === 'function') startSet(choice, 'tour');
  const early = {n: 0, s: 0, ok: 0, lvl: null, fb: null, tr: []};
  const q0 = question;
  question = (...a) => ((window.__q = a), q0(...a));
  // An opening only after a right answer (model.js openRight, 2026-11-03): the questions where it alone held the path's
  // opening (every other condition met, a genus left to open), with the chance openChance would then have opened one.
  // planPhoto asks it last, so a false here is that rule's. Main before the rule has no openRight: nothing recorded.
  const blocked = new Map();
  if (typeof openRight === 'function') {
    const or0 = openRight;
    openRight = at => {
      const ok = or0(at),
        a = at === undefined ? answersSoFar() : at;
      if (!ok && pool().some(n => !introduced(n)) && !blocked.has(a)) blocked.set(a, openChance(pool()));
      return ok;
    };
  }

  const rows = [],
    credit = {},
    entry = {},
    learnedAt = {},
    achAt = {},
    metAt = {};
  let blk = {n: 0, ok: 0},
    opens = [], // the questions (1-based) that opened a genus on its own card (the path's pace; not the first cards)
    nEx = 0,
    nDuel = 0,
    nFind = 0, // Find the X questions (quiz.js FIND: fish only)
    nAgain = 0,
    nCards = 0,
    afterMiss = 0, // genera opened on their own cards on the question right after a miss
    prevGood = null;
  const mill = {met: null, asked: null},
    bon = {offer: null, n: 0, q: 0};
  // One question, as the player sees it (pre: called once it shows, for the breaks).
  const ask = (pre, i = -1, cur = 'quiz') => {
    // Achievement toasts have gone by the next question (4 s in the app; no time passes in this loop), and the sign-in
    // card is closed: the out-of-game prompts (the bonus genera offer among them) wait for neither (quiz.js promptOk).
    document.querySelectorAll('.achpop').forEach(x => x.remove());
    achQ.length = 0;
    achBusy = false;
    document.querySelectorAll('.unlock:not(.intro)').forEach(x => (x.ulClose ? x.ulClose() : x.remove()));
    // Through the real planner (Codex review #365): the questions planned ahead stay after a right answer, as in the app.
    // Its own top-ups are timers, which never fire inside this synchronous loop, so they are called here instead.
    if (openall && oa.at === null && i + 1 >= Number(openall)) {
      oa.set = introLeft();
      introAll('progress');
      oa.at = answersSoFar();
      dropPlans();
      NEXTQ = null;
    }
    quizPhoto(cur);
    if (openall) {
      if (document.querySelector('.unlock.intro [data-back]')) {
        oa.back = answersSoFar() - oa.at;
        oa.h = (store.get(INTRO.OFFER.KEY, {}) || {}).h;
        document.querySelector(`.unlock.intro [data-${back === 'one' ? 'back' : 'keep'}]`).click();
      }
    }
    // The fallback card (model.js startDue, quiz.js startFbShow): kept, or taken: on "higher" its first option; on the
    // gentle "lower" offer, Coral basics' silent move one band down (model.js startEase; the Coral basics page itself is
    // not simulated), the card then closed.
    const fb = document.querySelector('.unlock.startfb');
    if (fb) {
      if (!early.fb) early.fb = {at: answersSoFar(), dir: fb.dataset.dir, took: null};
      const lo = fb.dataset.dir === 'lo',
        o = fallback === 'accept' && !lo && fb.querySelector('[data-start]');
      if (fallback === 'accept' && lo) (startEase(), (early.fb.took = 'ease:' + (startOf().ease || [])[0]));
      (o || fb.querySelector('[data-keep]') || fb.querySelector('.next.sec')).click();
      if (o) early.fb.took = (startOf() || {}).c;
    }
    planNext(cur);
    const q = SHOWNQ;
    if (pre) pre(q);
    // The first-meeting cards, read through: each teaches like one right answer.
    (q.intro || []).forEach(g => (teach(g, prof.rate), exem && exAdd(g, rAt(0), null), nCards++));
    // --beyond: the card offering a part of the slate by choice (fish circle 3), answered.
    if (c3.offer === null && i >= 0 && document.querySelector('.unlock.intro [data-opens]')) c3.offer = i + 1;
    const ob = BEYOND && document.querySelector(`.unlock.intro [data-${BEYOND === 'yes' ? 'opens' : 'notnow'}]`);
    if (ob) ob.click();
    // The bonus genera offer (every slate genus met): accepted.
    const bo = document.querySelector('.unlock [data-bonus]');
    if (bo) {
      if (bon.offer === null && i >= 0) bon.offer = i + 1;
      // A player who wants the common names only (PROFILES names) declines the scientific names: Not now.
      const no = prof.names === 'common' && bo.closest('.unlock').querySelector('.next.sec');
      (no || bo).click();
    }
    for (let b, k = 0; k < 50 && (b = document.querySelector('.unlock.intro .ulbtns .next:not([data-open]):not([data-notnow]):not([data-back]):not(.sec)')); k++) {
      b.click();
      if (k === 49) throw new Error('a first-meeting card does not close: ' + (b.closest('.unlock') || {}).className);
    }
    // A typed question (model.js TYPED, quiz.js typeForm) has no buttons: its choices are the draw's, unseen (Codex
    // review #393). Recall, no guessing: known, the genus is typed; not known, "I don't know" half the time, else a genus
    // it is taken for (the same confusion weights, the genus itself left out).
    const typed = !!document.querySelector('#view .tyform'),
      [, t, , , set] = window.__q,
      ch = typed ? window.__q[2] : [...document.querySelectorAll('#view [data-c]')].map(x => x.dataset.c),
      shown = set.shown || [],
      d = mean(shown.map(p => trueD(t, p))) || 0,
      single = shown.length === 1,
      fs = shown.map(p => p.f),
      rep = fs.some(f => LM[f] && LM[f][0]),
      pRec = sig(logit(kn(t)) - d - (single ? L.SINGLE : 0) + memOn(fs)),
      first = !asked(t);
    if (shown.length) expo.push([t, okey(shown[0]), ...fs]);
    if (shown.length) preOW.push([genScore(t) + 1e-9 < LV_AT[0] ? 1 : 0, Math.min(...shown.map(p => p.e || 0))]);
    let pick = t,
      pTrue;
    if (exem) {
      // The exemplar learner (above): Luce over the choices, or over the genera it holds in mind when typing.
      const V = typed ? vocab(t) : ch,
        {p, S} = pEx(t, V, d, single, fs);
      pTrue = p;
      if (!(rnd() < pTrue)) {
        const os = V.map((c, k) => (c === t ? 0 : S[k])),
          tot = os.reduce((a, x) => a + x, 0);
        let r = rnd() * tot;
        pick = V.filter(c => c !== t).pop() || '';
        for (let k = 0; k < V.length; k++)
          if (os[k] && (r -= os[k]) <= 0) {
            pick = V[k];
            break;
          }
        if (typed && rnd() < 0.5) pick = ''; // "I don't know"
      }
    } else if (field) {
      // The field learner (above): Luce over the choices, or over the genera it holds in mind when typing.
      const V = typed ? vocab(t) : ch,
        rs = V.map(c => (c === t ? 0 : rOf(t, c))),
        S = rs.reduce((a, x) => a + x, 0);
      pTrue = 1 / (1 + Math.exp(d + (single ? L.SINGLE : 0) - memOn(fs)) * S);
      if (!(rnd() < pTrue)) {
        let r = rnd() * S;
        pick = V.filter(c => c !== t).pop() || '';
        for (let k = 0; k < V.length; k++)
          if (rs[k] && (r -= rs[k]) <= 0) {
            pick = V[k];
            break;
          }
        if (typed && rnd() < 0.5) pick = ''; // "I don't know"
      }
    } else {
      if (!(rnd() < pRec)) {
        const pool = typed ? ch.filter(c => c !== t) : ch,
          ws = pool.map(c => wOf(t, c));
        let r = rnd() * ws.reduce((a, x) => a + x, 0);
        pick = pool[pool.length - 1];
        for (let k = 0; k < pool.length; k++)
          if ((r -= ws[k]) <= 0) {
            pick = pool[k];
            break;
          }
        if (typed && rnd() < 0.5) pick = ''; // "I don't know"
      }
      // The learner's true chance on this question: recognised, or (choices only) its guess falls on t.
      pTrue = typed ? pRec : pRec + (1 - pRec) * (wOf(t, t) / ch.reduce((a, c) => a + wOf(t, c), 0));
    }
    const good = pick === t;
    lastE = null;
    // The time to answer (above), handed to the question's clock just before the answer (quiz.js QCLOCK, qclockRead).
    if (rton && typeof QCLOCK === 'object') {
      const eps = tnorm(),
        sec = Math.round(Math.min(600, Math.max(0.1, Math.exp(Math.log(L.RT.T0) - L.RT.B * good - L.RT.C * logit(pTrue) + L.RT.SD * eps))) * 10) / 10;
      Object.assign(QCLOCK, {t0: performance.now() - sec * 1000, off: 0, hid: null});
      rtq.push([pTrue, eps]);
    } else rtq.push([pTrue, null]);
    if (typed) {
      const f = document.querySelector('#view .tyform');
      if (!pick) f.querySelector('[data-idk]').click();
      else ((f.querySelector('input').value = pick), f.requestSubmit());
    } else {
      // A Find the X opens its answers once its four tiles are in (quiz.js question): the photos' host is out of reach
      // here, so each tile is counted in (its load event), as a player's would be once it came.
      document.querySelectorAll('#view .qstage.qfx .fxt img').forEach(im => im.dispatchEvent(new Event('load')));
      document.querySelector(`#view [data-c="${CSS.escape(pick)}"]`).click();
    }
    planNext(cur); // answer()'s top-up after the feedback
    if (oa.at !== null && lastE !== null)
      oa.ans.push({k: answersSoFar() - oa.at, e: lastE, p: pTrue, ok: good ? 1 : 0, all: oa.set.includes(t), first});
    teach(t, prof.rate * (good ? 1 : L.MISS));
    if (!good && pick) teach(pick, prof.rate * L.PICKED);
    // The exemplar learner stores every photo shown as an exemplar of t, and after a miss a typical photo of the genus given.
    if (exem) {
      shown.forEach(p2 => exAdd(t, rAt(trueD(t, p2) + (single ? L.SINGLE : 0)), p2.f));
      if (!good && pick) exAdd(pick, rAt(0), null);
    }
    // The field learner's pairs: each wrong choice shown is contrasted with t, the genus wrongly given more (the montage).
    if (field) {
      if (!typed) ch.forEach(c => c !== pick && contrast(t, c, prof.rate * L.FIELD.PAIR));
      if (!good && pick) contrast(t, pick, prof.rate * L.MISS);
    }
    if (good) spaced(t);
    fs.forEach(f => {
      const h = (LM[f] = LM[f] || [0, 0]);
      h[0]++;
      h[1] += good ? 1 : 0;
    });
    const gr = gq[grpOf(t)];
    if (gr) {
      gr.n++;
      gr.ok += good;
      if (rep) {
        gr.rep++;
        gr.repOk += good;
      }
    }
    T += L.STEP;
    return {q, t, good, set, e: lastE, first};
  };
  // The field measures (both learners; docs/LEARNING.md "Field learner"): over the genera met, the bar shown (genScore)
  // against the learner's true whole-slate success pOpen; the share of Learned genera with pOpen >= PREC; the genera at the
  // exam's entry or above (bar 95% or more); and the custom selection's own (--custom).
  const cust = cfg.custom ? {n: cfg.custom, sel: null, from: null, to: null, row: null, nq: 0, ok: 0} : null;
  const fieldRow = () => {
    const po = Object.fromEntries(SL.map(g => [g, pOpen(g)])),
      met = SL.filter(introduced),
      lr = SL.filter(g => (P[g] || {}).mx),
      hi = met.filter(g => genScore(g) >= 0.95 - 1e-9),
      over = L2 => mean(L2.map(g => genScore(g) - po[g])),
      sel = cust && cust.sel;
    return {
      openSlate: mean(SL.map(g => po[g])),
      openMet: mean(met.map(g => po[g])),
      bar: mean(met.map(genScore)),
      over: over(met),
      overPos: mean(met.map(g => Math.max(0, genScore(g) - po[g]))),
      learned: lr.length,
      precL: lr.length ? lr.filter(g => po[g] >= L.PREC).length / lr.length : null,
      openL: mean(lr.map(g => po[g])),
      hi: hi.length,
      openHi: mean(hi.map(g => po[g])),
      selBar: sel ? mean(sel.map(genScore)) : null,
      selOpen: sel ? mean(sel.map(g => po[g])) : null,
      selOver: sel ? over(sel) : null,
      // Per genus (2026-11-06, for the over of a group of genera: those the profile knows, the custom selection): the
      // truth pOpen and the bar shown, the genera met only.
      po: Object.fromEntries(met.map(g => [g, Math.round(po[g] * 1000) / 1000])),
      // The judge's domain score (dStar), the genera met.
      ds: Object.fromEntries(met.map(g => [g, Math.round(dStar(g) * 1000) / 1000])),
      gs: Object.fromEntries(met.map(g => [g, Math.round(genScore(g) * 1000) / 1000]))
    };
  };
  // The levels and the score (2026-11-08, rule L11's measures; docs/LEARNING.md "Validating a learning change"): every
  // unit of the game by kind (the subject's own rank for its slate, app.js rankOf for a set's units, the corals' bonus
  // genera apart), the answer at which each first reached Open Water and Advanced (LV_AT), the shown score after every
  // answer (headPct: the fish global score, else the units' mean) for its plateaus, and when circle 3 came (offered, met).
  const SETU = typeof SETS === 'function' ? [...new Set(SETS().flatMap(S => (S.all ? S.all() : S.units())))].filter(g => !SL.includes(g)) : [],
    kindOf = g => (SL.includes(g) ? SUBJ.rank : BON.includes(g) ? 'bonus' : (typeof rankOf === 'function' && rankOf(g)) || 'other'),
    UALL = [...new Set([...SL, ...SETU, ...BON])],
    KINDS = [...new Set(UALL.map(kindOf))],
    owAt = {},
    advAt = {},
    C3 = typeof UNITS === 'object' && UNITS[SUBJ.id].circles ? UNITS[SUBJ.id].circles()[2] || [] : [],
    c3 = {offer: null, met: null},
    shownPct = () => (typeof headPct === 'function' ? headPct(SL) : progPct(SL)),
    plat = {best: shownPct(), since: 0, max: 0};
  const levelsRow = () =>
    Object.fromEntries(
      KINDS.map(k => {
        const G = UALL.filter(g => kindOf(g) === k),
          met = G.filter(introduced),
          ds = met.map(dStar);
        return [
          k,
          {
            n: G.length,
            met: met.length,
            ow: G.filter(g => genScore(g) + 1e-9 >= LV_AT[0]).length,
            adv: G.filter(g => genScore(g) + 1e-9 >= LV_AT[1]).length,
            dStar: mean(ds),
            over: mean(met.map((g, j) => genScore(g) - ds[j]))
          }
        ];
      })
    );
  const scoreRow = () => {
    const h = typeof headScore === 'function' ? headScore() : null,
      r4 = x => Math.round(x * 1e4) / 1e4,
      comp = o => ({
        entries: r4(o.entries),
        genera: r4(o.genera),
        common: r4(o.common),
        scientific: r4(o.scientific),
        S: r4(o.S),
        credit: r4(o.credit),
        raw: r4(o.raw),
        pct: o.pct
      });
    return h ? {...comp(h), by: Object.fromEntries(Object.entries(h.by || {}).map(([c, o]) => [c, comp(o)]))} : {pct: shownPct()};
  };
  let cur = 'quiz';
  for (let i = 0; i < N; i++) {
    // --custom: once N genera are unlocked, they are the custom quiz's selection for --drill questions, then the Quiz again.
    if (cust && cust.sel === null && SL.filter(introReady).length >= cust.n) {
      cust.sel = SL.filter(introReady)
        .sort((a, b) => (metAt[a] ?? i) - (metAt[b] ?? i))
        .slice(0, cust.n);
      store.set(CUSTOM.KEY, {g: cust.sel, t: Date.now()});
      cust.from = i;
      cur = CUSTOM_H;
      dropPlans();
      NEXTQ = null;
    }
    if (cust && cur === CUSTOM_H && i - cust.from >= cfg.drill) {
      cust.to = i;
      cust.row = {q: i, ...fieldRow(), met: SL.filter(introduced).length, right: (100 * cust.ok) / Math.max(1, cust.nq)};
      cur = 'quiz';
      dropPlans();
      NEXTQ = null;
    }
    const {q, t, good, set, e, first} = ask(null, i, cur);
    if (cust && cur !== 'quiz') (cust.nq++, (cust.ok += good ? 1 : 0));
    UALL.forEach(g => {
      if (!introduced(g) || (g in owAt && g in advAt)) return;
      const b = genScore(g) + 1e-9;
      if (!(g in owAt) && b >= LV_AT[0]) owAt[g] = i + 1;
      if (!(g in advAt) && b >= LV_AT[1]) advAt[g] = i + 1;
    });
    if (c3.met === null && C3.some(introduced)) c3.met = i + 1;
    // Plateaus: the answers since the shown score last reached a new high, the longest such stretch so far.
    const sp = shownPct();
    if (sp > plat.best) ((plat.best = sp), (plat.since = 0));
    else plat.max = Math.max(plat.max, ++plat.since);
    // The first TRACE answers, for the fallback rules (tools/fallback.py): what the app logged with each answer (e, th,
    // mode), whether it was the genus's first answer, and the global level, the opening hold and the genera met after it.
    if (i < TRACE) {
      const lg = (store.get(LOG0, []) || []).slice(-1)[0] || {};
      early.tr.push({
        ok: good ? 1 : 0,
        e: typeof lg.e === 'number' ? lg.e : null,
        th: typeof lg.th === 'number' ? lg.th : null,
        m: lg.m || '',
        first: first ? 1 : 0,
        lv: (P[LEVEL] || {}).th,
        held: introHold() ? 1 : 0,
        met: SL.filter(introduced).length,
        p: know[t]
      });
    }
    if (early.n < 20 && typeof e === 'number') {
      early.n++;
      early.s += (good ? 1 : 0) - e;
      early.ok += good ? 1 : 0;
      if (early.n === 20) early.lvl = (P[LEVEL] || {}).th;
    }
    if (set.exam) nEx++;
    if (q.auto) nDuel++;
    if (q.findx) nFind++;
    if (q.again) nAgain++;
    if ((q.intro || []).length && !q.start) {
      opens.push(i + 1);
      if (prevGood === false) afterMiss++;
    }
    prevGood = good;
    blk.n++;
    blk.ok += good;
    if (mill.met === null && introduced('Millepora')) mill.met = i + 1;
    SL.concat(BON).forEach(g => !(g in metAt) && introduced(g) && (metAt[g] = i + 1));
    if (mill.asked === null && t === 'Millepora') mill.asked = i + 1;
    if (bon.offer !== null && bon.offer <= i + 1) {
      bon.q++;
      if (isBonus(t)) bon.n++;
    }
    // Time to credit (the judge): per genus, its first answer and the questions at which its bar first reached 50% and 80%;
    // and over the genera the profile knows (known), the question at which their mean bar first did, all of them met.
    SL.forEach(g => {
      if (!asked(g)) return;
      const c = (credit[g] = credit[g] || {first: i + 1});
      if (!c.q80) {
        const b = genScore(g);
        if (!c.q50 && b >= 0.5) c.q50 = i + 1;
        if (b >= 0.8) c.q80 = i + 1;
      }
    });
    if (!credit._k80) {
      const kg = SL.filter(g => k0[g] >= 0.5);
      if (kg.length && kg.every(introduced)) {
        const b = mean(kg.map(genScore));
        if (!credit._k50 && b >= 0.5) credit._k50 = i + 1;
        if (b >= 0.8) credit._k80 = i + 1;
      }
    }
    SL.forEach(g => {
      if (!(g in entry) && inExam(g)) entry[g] = {q: i + 1, ref: ref(g), know: know[g]};
      if (!(g in learnedAt) && (P[g] || {}).mx) learnedAt[g] = {q: i + 1, ref: ref(g), know: know[g]};
    });
    // --ach: the answer at which each achievement of the record first shows (progress.js ACHK, the real game's check).
    if (ACHT) Object.keys(store.get(ACHK, {}) || {}).forEach(k => k[0] !== '_' && !(k in achAt) && (achAt[k] = i + 1));
    if (cps.includes(i + 1)) {
      const met = SL.filter(introduced),
        th = met.map(g => ability(g) - logit(know[g])),
        en = Object.values(entry),
        le = Object.values(learnedAt);
      rows.push({
        q: i + 1,
        knowSlate: mean(SL.map(g => know[g])),
        knowMet: mean(met.map(g => know[g])),
        thErr: mean(th.map(Math.abs)),
        thBias: mean(th),
        level: (P[LEVEL] || {}).th || 0,
        progGap: mean(met.map(g => genScore(g) - know[g])),
        prog: progPct(SL),
        met: met.length,
        learned: SL.filter(g => (P[g] || {}).mx).length,
        right: (100 * blk.ok) / blk.n,
        o15: per15(opens),
        look: lookAcc(),
        refTrue: SL.filter(g => ref(g) >= L.REF_OK).length,
        exam: en.length,
        refEntry: mean(en.map(e => e.ref)),
        refLearned: mean(le.map(e => e.ref)),
        examQs: nEx,
        duels: nDuel,
        finds: nFind,
        agains: nAgain,
        cards: nCards,
        f: fieldRow(),
        // The levels by kind of unit, the score shown and its components (scoreRow), the longest plateau so far.
        kinds: levelsRow(),
        score: scoreRow(),
        plateau: plat.max,
        // By photo count (photo memory): cumulative questions on the group's genera, their genera met.
        grp: Object.fromEntries(
          Object.entries(GRP).map(([k, G]) => {
            const gm = G.filter(introduced),
              c = gq[k];
            return [
              k,
              {
                rep: c.n ? (100 * c.rep) / c.n : null,
                right: c.n ? (100 * c.ok) / c.n : null,
                repRight: c.rep ? (100 * c.repOk) / c.rep : null,
                progGap: mean(gm.map(g => genScore(g) - know[g])),
                thBias: mean(gm.map(g => ability(g) - logit(know[g]))),
                learned: G.filter(g => (P[g] || {}).mx).length
              }
            ];
          })
        )
      });
      blk = {n: 0, ok: 0};
    }
  }
  // The app's own answer log of the first session (LOG0: answers of a player not signed in), with the learner's chance
  // and time noise of each answer, for --rtlog.
  const log0 = (store.get(LOG0, []) || []).slice(-rtq.length),
    alog = log0.length === rtq.length ? log0.map((a, i) => [a, ...rtq[i]]) : null;
  // Breaks (--breaks): from the state at the end of the first session, each break in turn.
  const out = [];
  if (breaks.length) {
    const ls = {...localStorage},
      snap = {
        EXS: JSON.stringify(EXS),
        P: JSON.stringify(P),
        Q: JSON.stringify(Q),
        HOLDS,
        know: {...know},
        LS: JSON.stringify(LS),
        LM: JSON.stringify(LM),
        X: JSON.stringify(X), // the field learner's pair skills (Codex review #619: they leaked from one break to the next)
        T,
        last,
        lastQs: [...lastQs],
        twoAt,
        twoPair,
        rematch: JSON.stringify(rematch)
      };
    breaks.forEach(([name, ms], bi) => {
      localStorage.clear();
      Object.entries(ls).forEach(([k, v]) => localStorage.setItem(k, v));
      P = JSON.parse(snap.P);
      Object.keys(Q).forEach(k => delete Q[k]);
      Object.assign(Q, JSON.parse(snap.Q));
      INTROS = null;
      HOLDS = snap.HOLDS;
      Object.assign(know, snap.know);
      Object.keys(LS).forEach(k => delete LS[k]);
      Object.assign(LS, JSON.parse(snap.LS));
      // The photo memory comes back as it was (it does not fade across a break: a limit of this learner).
      Object.keys(LM).forEach(k => delete LM[k]);
      Object.assign(LM, JSON.parse(snap.LM));
      // The field learner's pair skills too (they do not fade across a break either: a limit, as the photo memory).
      Object.keys(X).forEach(k => delete X[k]);
      Object.assign(X, JSON.parse(snap.X));
      // The exemplar learner's memory too (Codex review #624: each break starts from the same first session).
      Object.keys(EXS).forEach(k => delete EXS[k]);
      Object.assign(EXS, JSON.parse(snap.EXS));
      dropPlans();
      NEXTQ = null;
      SHOWNQ = null;
      last = snap.last;
      lastQs = [...snap.lastQs];
      twoAt = snap.twoAt;
      twoPair = snap.twoPair;
      rematch = JSON.parse(snap.rematch);
      if (!old) CB = Object.assign({r: 0, t: 0, ok: 0, f: 0}, store.get(COMEBACK.KEY, {}) || {});
      Math.random = gen((seed * 2246822519) ^ (0x85ebca6b + 7919 * (bi + 1)));
      rnd = gen((seed * 2654435761) ^ (0x9e3779b9 + 7919 * (bi + 1)));
      const metB = SL.filter(introduced),
        before = mean(metB.map(g => know[g]));
      T = snap.T + ms;
      forget(ms);
      if (old) warmLeft = null; // a new visit: the gentle restart
      const r = {
        brk: name,
        cbLen: 0,
        cbOk: 0,
        held: 0,
        after: 0,
        afterOk: 0,
        holdCb: 0,
        holdAfter: 0,
        hold0: HOLDS,
        opens: [], // the --after questions (1-based, from the end of the comeback) that opened a genus on its card
        rust0: null,
        loss: before - mean(metB.map(g => know[g]))
      };
      let inCb = true,
        inHeld = true;
      for (let i = 0; i < 200 && r.after < after; i++) {
        const {q, good} = ask(q0 => {
          // Openings held: during the gentle restart before (no card), the floor or the comeback now (noOpen).
          if (r.rust0 === null) r.rust0 = old ? null : CB.r;
          if (inHeld && (old ? !!q0.warm : noOpen())) r.held++;
          else inHeld = false;
        });
        if (inCb && q.warm) {
          r.cbLen++;
          r.cbOk += good;
          if (introHold()) r.holdCb++;
        } else {
          inCb = false;
          r.after++;
          r.afterOk += good;
          if ((q.intro || []).length && !q.start) r.opens.push(r.after);
          if (introHold()) r.holdAfter++;
        }
      }
      out.push(r);
    });
  }
  return {
    known: SL.filter(g => k0[g] >= 0.5), // the genera the profile knows from the start (the spotty profile's groups)
    knows: [...knows], // the slate units at the profile's hi (tools/learnprof.js)
    credit,
    rows,
    entry,
    learnedAt,
    achAt,
    metAt,
    nph: NPH,
    expo,
    preOW,
    // The answer at which each unit first reached Open Water / Advanced, each unit's kind, and circle 3 (offered, met).
    owAt,
    advAt,
    kinds: Object.fromEntries(UALL.map(g => [g, kindOf(g)])),
    c3,
    pool: seed === 1 ? POOL : null,
    pairs: PAIRS.length,
    breaks: out,
    millMet: mill.met,
    millAsked: mill.asked,
    bonusOffer: bon.offer,
    bonusShare: bon.q ? bon.n / bon.q : null,
    bonusMet: BON.filter(introduced).length,
    openAll: openall ? oa : null,
    choice,
    early,
    // The first session's openings on their own cards (questions, 1-based), those right after a miss, and the questions
    // (1-based) where only the right-answer rule held the opening, with openChance then.
    opens,
    afterMiss,
    blocked: [...blocked].filter(([a]) => a < N).map(([a, c]) => [a + 1, Math.round(c * 1000) / 1000]),
    alog,
    custom: cust,
    lsPeak: window.__lsPeak // the most characters localStorage held (tools/memstorage.js)
  };
}

async function run(browser, base, name, seed) {
  const ctx = await browser.newContext({viewport: {width: 1280, height: 800}, serviceWorkers: 'block'});
  await ctx.route(
    u => !u.href.startsWith(base),
    r => r.abort()
  );
  // localStorage in the page's own memory, before anything writes to it (tools/memstorage.js: a run is one long
  // evaluate, and the browser's storage queued about 1.5 MB an answer in the renderer until it crashed, #734).
  await ctx.addInitScript(memStorage);
  await ctx.addInitScript({path: path.join(__dirname, 'learnprof.js')}); // the profiles' rules, LEARNPROF
  await ctx.addInitScript(([st, rtapp, sv, subj]) => {
    localStorage.setItem('reefid-tour', '"done"');
    localStorage.setItem('reefid-sync-subject', JSON.stringify(subj));
    // The sync script version the app last saw (sync.js sheetV): one that replays the answer time (core.js RT_SHEET), so
    // the app weighs its steps by it; --rtapp off: an older one.
    if (rtapp) localStorage.setItem('reefid-sheet-v', String(sv));
    localStorage.setItem(`reefid-sync-${subj}-start`, '{"c":"new","t":1}');
    if (st)
      localStorage.setItem(
        'reefid-photo-stats',
        JSON.stringify({
          t: Date.now(),
          v: st.v,
          photos: st.photos || {},
          conf: st.conf || {},
          ...(st.mem ? {mem: st.mem} : {}),
          ...(st.gd ? {gd: st.gd} : {}),
          // The per-format offsets (?stats=1 fmt, sheet v77; 2026-11-09): the app reads them as the live game does
          // (model.js PFMT, core.js fmtsOf from a sheet that reports v >= FMT_SHEET); before, every offset was 0 here.
          ...(st.fmt ? {fmt: st.fmt} : {})
        })
      );
  }, [STATS_JSON, RTAPP, SHEETV, SUBJECT]);
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(base);
  await p.waitForFunction(() => window.APP_READY, null, {timeout: 60000});
  // Every script tier in (My progress, the Tools) and the network quiet, so each run starts from the same state.
  await p.evaluate(() => window.loadTier && window.loadTier(5));
  await p.waitForLoadState('networkidle');
  const r = await p.evaluate(play, {
    prof: profOf(name, SUBJECT),
    seed,
    N: QN,
    cps: CPS,
    L: LEARNER,
    breaks: BREAKS,
    after: AFTER,
    openall: OPENALL,
    back: BACK,
    rton: RTON,
    truth: TRUTH_JSON,
    truthGen: TRUTH_GEN,
    judge: JUDGE,
    choice: CHOICE === 'auto' ? AUTO[name] : CHOICE,
    fallback: FALLBACK,
    vars: VARS,
    learner: LEARN,
    tau: TAU,
    custom: CUSTOMN,
    drill: DRILL,
    calib: CALIBX,
    ach: ACHT,
    beyond: BEYOND
  });
  await ctx.close();
  return {profile: name, seed, errs, ...r};
}

// The field measures (both learners): per profile and checkpoint, mean +- sd over the seeds; precL over the runs with a
// genus Learned (their number in brackets); with --custom, the selection's own and a row at the end of the drill.
const FKEYS = [
  ['openSlate', 'open', 2],
  ['openMet', 'openMet', 2],
  ['bar', 'bar', 2],
  ['over', 'over', 2],
  ['overPos', 'over+', 2],
  ['learned', 'learned', 1],
  ['precL', 'precL', 2],
  ['openL', 'openL', 2],
  ['hi', 'bar>=95', 1],
  ['openHi', 'open@95', 2],
  ['selBar', 'selBar', 2],
  ['selOpen', 'selOpen', 2],
  ['selOver', 'selOver', 2]
];
// The levels and the score (per profile and checkpoint, means over the seeds): the shown score and, when the subject has
// a global score, its Entries and credit components; per kind of unit, units at Open Water / Advanced and E = bar - D*
// over the units met; the longest plateau so far; then per run the answer of the first unit at Open Water and circle 3.
function levelTable(runs) {
  const m = v => {
      v = v.filter(x => typeof x === 'number' && !isNaN(x));
      return v.length ? v.reduce((a, x) => a + x, 0) / v.length : null;
    },
    f = (x, d) => (x === null ? '-' : x.toFixed(d)),
    lines = ['\nLevels and score: score% (entries / credit), per kind ow / adv (E = bar - D*), plateau: the longest stretch of answers without a new high of the shown score'];
  for (const name of NAMES) {
    const R = runs.filter(r => r.profile === name),
      kinds = [...new Set(R.flatMap(r => Object.values(r.kinds || {})))];
    lines.push(`\n${name}`);
    CPS.forEach((q, i) => {
      const rows = R.map(r => r.rows[i]).filter(Boolean),
        sc = k => m(rows.map(w => (w.score || {})[k])),
        kd = (k, x) => m(rows.map(w => ((w.kinds || {})[k] || {})[x]));
      lines.push(
        `  ${String(q).padStart(5)}  score ${f(sc('pct'), 1)}${sc('entries') === null ? '' : ` (${f(sc('entries'), 3)} / ${f(sc('credit'), 3)})`}  ` +
          kinds.map(k => `${k} ${f(kd(k, 'ow'), 1)} / ${f(kd(k, 'adv'), 1)} (${f(kd(k, 'over'), 3)})`).join('  ') +
          `  plateau ${f(m(rows.map(w => w.plateau)), 1)}`
      );
    });
    const first = R.map(r => Math.min(...Object.entries(r.owAt || {}).filter(([g]) => (r.kinds || {})[g] !== 'bonus').map(([, a]) => a))).filter(isFinite);
    lines.push(
      `  first unit at Open Water: answer ${f(m(first), 1)} (${first.length}/${R.length} runs); circle 3 offered ${R.filter(r => r.c3 && r.c3.offer).length}/${R.length}, met ${R.filter(r => r.c3 && r.c3.met).length}/${R.length} runs`
    );
  }
  return lines.join('\n');
}
function fieldTable(runs) {
  const ms = v => {
    v = v.filter(x => typeof x === 'number' && !isNaN(x));
    if (!v.length) return ['-', 0];
    const m = v.reduce((a, x) => a + x, 0) / v.length,
      sd = v.length > 1 ? Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1)) : 0;
    return [m, sd, v.length];
  };
  const keys = FKEYS.filter(k => CUSTOMN || !k[0].startsWith('sel')),
    lines = [
      `\nField measures (learner ${LEARN}${LEARN === 'field' ? ', tau ' + TAU : ''}${CUSTOMN ? `; Custom-${CUSTOMN}: ${DRILL} questions in the custom quiz once ${CUSTOMN} genera are unlocked, then the Quiz` : ''})`,
      'open: true whole-slate success (pOpen) over the slate; openMet, bar: pOpen and the bar shown (genScore) over the genera met; over: bar - pOpen,',
      `over+: max(0, bar - pOpen), genera met; learned, precL: Learned genera and the share with pOpen >= ${LEARNER.PREC} (runs with one, n); openL: their pOpen;`,
      'bar>=95, open@95: genera at the exam entry or above and their pOpen' + (CUSTOMN ? '; sel*: the custom selection; drill: at the end of the drill.' : '.')
    ];
  for (const name of NAMES) {
    const R = runs.filter(r => r.profile === name),
      rowsAt = i => R.map(r => r.rows[i] && r.rows[i].f).filter(Boolean),
      lines2 = CPS.map((q, i) => [String(q), rowsAt(i)]);
    if (CUSTOMN) {
      const D = R.map(r => r.custom && r.custom.row).filter(Boolean);
      lines2.push([`drill@${D.length ? Math.round(D.reduce((a, d) => a + d.q, 0) / D.length) : '-'}`, D]);
    }
    lines.push(`\n${name}`);
    const head = ['q', ...keys.map(k => k[1])],
      body = lines2.map(([lab, F]) => [
        lab,
        ...keys.map(([k, , dg]) => {
          const [m, sd, n] = ms(F.map(f => f[k]));
          return m === '-' ? '-' : `${m.toFixed(dg)}±${sd.toFixed(dg)}` + (k === 'precL' ? ` (${n})` : '');
        })
      ]),
      w = head.map((h, j) => Math.max(h.length, ...body.map(b => b[j].length)));
    lines.push(head.map((h, j) => h.padStart(w[j])).join(' '));
    body.forEach(b => lines.push(b.map((x, j) => x.padStart(w[j])).join(' ')));
  }
  return lines.join('\n');
}

const KEYS = [
  ['knowSlate', 'knowSlate', 2, 1],
  ['knowMet', 'knowMet', 2, 1],
  ['thErr', '|th-lk|', 2, 1],
  ['thBias', 'th-lk', 2, 1],
  ['level', 'level', 2, 1],
  ['progGap', 'prog-know', 2, 1],
  ['prog', 'prog%', 0, 1],
  ['met', 'met', 1, 1],
  ['learned', 'learned', 1, 1],
  ['right', 'right%', 0, 1],
  ['o15', 'open/15', 1, 1],
  ['look', 'look', 2, 1],
  ['refTrue', 'ref>=.9', 1, 1],
  ['exam', 'exam', 1, 1],
  ['refEntry', 'ref@exam', 2, 1],
  ['refLearned', 'ref@learn', 2, 1]
];
function summary(runs) {
  const out = {};
  for (const name of NAMES) {
    const R = runs.filter(r => r.profile === name);
    out[name] = CPS.map((q, i) => {
      const row = {q};
      for (const [k] of KEYS.concat([['examQs'], ['duels'], ['finds'], ['agains'], ['cards']])) {
        const v = R.map(r => r.rows[i] && r.rows[i][k]).filter(x => typeof x === 'number' && !isNaN(x)),
          m = v.length ? v.reduce((a, x) => a + x, 0) / v.length : null,
          sd = v.length > 1 ? Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1)) : 0;
        row[k] = {mean: m, sd, n: v.length};
      }
      return row;
    });
  }
  return out;
}
function table(S) {
  const f = (o, dg) => (o.mean === null ? '-' : `${o.mean.toFixed(dg)}±${o.sd.toFixed(dg)}`);
  const lines = [];
  for (const name of NAMES) {
    lines.push(`\n${name} (${SEEDS} seeds)`);
    const head = ['q', ...KEYS.map(k => k[1])],
      body = S[name].map(r => [
        String(r.q),
        ...KEYS.map(([k, , dg]) => f(r[k], dg) + (k === 'refEntry' || k === 'refLearned' ? ` (${r[k].n})` : ''))
      ]),
      w = head.map((h, j) => Math.max(h.length, ...body.map(b => b[j].length)));
    lines.push(head.map((h, j) => h.padStart(w[j])).join(' '));
    body.forEach(b => lines.push(b.map((x, j) => x.padStart(w[j])).join(' ')));
  }
  return lines.join('\n');
}

// By photo count (photo memory): per profile, checkpoint and group (few / many game photos), the mean over the runs of
// each run's cumulative figures; then, pooled over every run, the genera of the group that entered the exam or were
// learned by the last question: how many a run, their mean true reference success then, the median question.
const GKEYS = [
  ['rep', 'rep%', 0],
  ['right', 'right%', 0],
  ['repRight', 'right% rep', 0],
  ['progGap', 'prog-know', 2],
  ['thBias', 'th-lk', 2],
  ['learned', 'learned', 1]
];
function grpSummary(runs) {
  const out = {};
  for (const name of NAMES) {
    const R = runs.filter(r => r.profile === name),
      m = v => (v.length ? v.reduce((a, x) => a + x, 0) / v.length : null),
      med = v => quant(v, 0.5);
    out[name] = {
      rows: CPS.map((q, i) =>
        Object.fromEntries(
          ['few', 'many'].map(gk => [
            gk,
            Object.fromEntries(
              GKEYS.map(([k]) => [
                k,
                m(R.map(r => r.rows[i] && r.rows[i].grp && r.rows[i].grp[gk][k]).filter(x => typeof x === 'number' && !isNaN(x)))
              ])
            )
          ])
        )
      ),
      ev: Object.fromEntries(
        ['few', 'many'].map(gk => {
          const inG = (r, g) => (gk === 'few' ? r.nph[g] <= LEARNER.FEW : r.nph[g] >= LEARNER.MANY),
            pool = key => R.flatMap(r => Object.entries(r[key] || {}).filter(([g]) => r.nph && g in r.nph && inG(r, g)).map(([, e]) => e));
          const en = pool('entry'),
            le = pool('learnedAt');
          return [
            gk,
            {
              genera: R.length ? Object.keys(R[0].nph || {}).filter(g => inG(R[0], g)).length : 0,
              entry: en.length / Math.max(1, R.length),
              refEntry: m(en.map(e => e.ref)),
              qEntry: med(en.map(e => e.q)),
              learned: le.length / Math.max(1, R.length),
              refLearned: m(le.map(e => e.ref)),
              qLearned: med(le.map(e => e.q))
            }
          ];
        })
      )
    };
  }
  return out;
}
function grpTable(GS) {
  const f = (x, d) => (x === null || x === undefined ? '-' : x.toFixed(d));
  const lines = [
    `\nBy photo count (few: ${LEARNER.FEW} game photos or fewer; many: ${LEARNER.MANY} or more); learner photo memory ${LEARNER.MEM.join(' / ')}`,
    'rep%: questions showing a photo already shown to the player; right% on all / on those repeats; prog-know, th-lk: over the genera met; learned: genera.'
  ];
  for (const name of NAMES) {
    lines.push(`\n${name}`);
    const head = ['q', ...['few', 'many'].flatMap(g => GKEYS.map(k => `${g} ${k[1]}`))],
      body = CPS.map((q, i) => [String(q), ...['few', 'many'].flatMap(g => GKEYS.map(([k, , d]) => f(GS[name].rows[i][g][k], d)))]),
      w = head.map((h, j) => Math.max(h.length, ...body.map(b => b[j].length)));
    lines.push(head.map((h, j) => h.padStart(w[j])).join(' '));
    body.forEach(b => lines.push(b.map((x, j) => x.padStart(w[j])).join(' ')));
    ['few', 'many'].forEach(g => {
      const e = GS[name].ev[g];
      lines.push(
        `  ${g} (${e.genera} genera): entered the exam ${f(e.entry, 1)} a run, ref@exam ${f(e.refEntry, 2)}, median question ${f(e.qEntry, 0)}; learned ${f(e.learned, 1)} a run, ref@learn ${f(e.refLearned, 2)}, median question ${f(e.qLearned, 0)}`
      );
    });
  }
  return lines.join('\n');
}

// Breaks (--breaks): per profile and break, over the seeds. Comeback length (questions flagged warm) median [quartiles]
// min-max; held: answers with no genus opening (floor and comeback), median; right % during the comeback and in the
// --after questions after it (mean of the runs' rates); hold: runs where the opening hold was on at some answer of the
// comeback / of the --after questions, and the mean number of such answers; rust: the app's rust at the first question
// back; loss: the learner's true mean know lost over the genera met.
const quant = (v, q) => {
  const a = v.slice().sort((x, y) => x - y),
    i = (a.length - 1) * q,
    lo = Math.floor(i);
  return a.length ? a[lo] + (a[Math.ceil(i)] - a[lo]) * (i - lo) : null;
};
function breakSummary(runs) {
  const out = {};
  for (const name of NAMES)
    out[name] = BREAKS.map(([b]) => {
      const R = runs.filter(r => r.profile === name).map(r => (r.breaks || []).find(x => x.brk === b)).filter(Boolean),
        m = f => {
          const v = R.map(f).filter(x => typeof x === 'number' && !isNaN(x));
          return v.length ? v.reduce((a, x) => a + x, 0) / v.length : null;
        },
        len = R.map(r => r.cbLen),
        held = R.map(r => r.held);
      return {
        brk: b,
        n: R.length,
        len: {med: quant(len, 0.5), q1: quant(len, 0.25), q3: quant(len, 0.75), min: Math.min(...len), max: Math.max(...len)},
        held: {med: quant(held, 0.5), min: Math.min(...held), max: Math.max(...held)},
        cbRight: m(r => (r.cbLen ? (100 * r.cbOk) / r.cbLen : NaN)),
        afterRight: m(r => (100 * r.afterOk) / r.after),
        // The opening's pace after the comeback: genera opened in the first 15 answers, and the most in any 15.
        open15: m(r => r.opens.filter(x => x <= 15).length),
        open15max: m(r => Math.max(0, ...r.opens.map(q => r.opens.filter(x => x >= q && x < q + 15).length))),
        opened: m(r => r.opens.length),
        holdCbRuns: R.filter(r => r.holdCb > 0).length,
        holdCb: m(r => r.holdCb),
        holdAfterRuns: R.filter(r => r.holdAfter > 0).length,
        holdAfter: m(r => r.holdAfter),
        hold0Runs: R.filter(r => r.hold0 >= 1.5).length,
        rust0: m(r => r.rust0),
        loss: m(r => r.loss)
      };
    });
  return out;
}
function breakTable(BS) {
  const f = (x, d = 0) => (x === null || x === undefined ? '-' : x.toFixed(d));
  const lines = [
    `\nAfter a break (${QN} questions first, then the comeback and ${AFTER} more; ${SEEDS} seeds)`,
    'len: comeback questions, median [quartiles] min-max; held: answers with no genus opening, median min-max; right%: during the comeback / the ' +
      AFTER +
      ' after;\nopened: genera opened on their cards in the first 15 answers after the comeback / the most in any 15 / in all ' +
      AFTER +
      ';\nhold: runs with the opening hold on during the comeback / after it (mean answers held), and already on at the break; rust: app, start; loss: true mean know lost (genera met).'
  ];
  for (const name of NAMES) {
    lines.push(`\n${name}`);
    const head = ['break', 'len', 'held', 'right% cb/after', 'opened 1st 15/max 15/all', 'hold cb', 'hold after', 'hold@0', 'rust', 'loss'],
      body = BS[name].map(r => [
        r.brk,
        `${f(r.len.med, 1)} [${f(r.len.q1, 1)}-${f(r.len.q3, 1)}] ${r.len.min}-${r.len.max}`,
        `${f(r.held.med, 1)} ${r.held.min}-${r.held.max}`,
        `${f(r.cbRight)} / ${f(r.afterRight)}`,
        `${f(r.open15, 1)} / ${f(r.open15max, 1)} / ${f(r.opened, 1)}`,
        `${r.holdCbRuns}/${r.n} (${f(r.holdCb, 1)})`,
        `${r.holdAfterRuns}/${r.n} (${f(r.holdAfter, 1)})`,
        `${r.hold0Runs}/${r.n}`,
        f(r.rust0, 2),
        f(r.loss, 3)
      ]),
      w = head.map((h, j) => Math.max(h.length, ...body.map(b => b[j].length)));
    lines.push(head.map((h, j) => h.padStart(w[j])).join('  '));
    body.forEach(b => lines.push(b.map((x, j) => x.padStart(w[j])).join('  ')));
  }
  return lines.join('\n');
}

// --openall: per profile, the runs where all were opened (median answer), the back card (runs, answers after Open all,
// the sum h then), and after Open all the app's expected success e against the learner's true chance p and its right
// answers, as means over the pooled answers: first question on each genus opened at once, the first 30 answers after
// Open all on those genera and on the genera met before, and every answer after Open all.
function openTable(runs) {
  const f = (x, d = 2) => (x === null || x === undefined || isNaN(x) ? '-' : x.toFixed(d)),
    m = v => (v.length ? v.reduce((a, x) => a + x, 0) / v.length : NaN),
    lines = [`\nOpen all (--openall ${OPENALL}, back card answered ${BACK}); e: app's expected success, p: true chance, ok: right (pooled answers)`];
  for (const name of NAMES) {
    const R = runs.filter(r => r.profile === name && r.openAll && r.openAll.at !== null),
      A = R.flatMap(r => r.openAll.ans),
      bk = R.filter(r => r.openAll.back !== null),
      row = (lab, X) => `    ${lab.padEnd(28)} n ${String(X.length).padStart(4)}  e ${f(m(X.map(x => x.e)))}  p ${f(m(X.map(x => x.p)))}  ok ${f(m(X.map(x => x.ok)))}  e-p ${f(m(X.map(x => x.e - x.p)))}`;
    lines.push(
      `  ${name}: opened in ${R.length}/${runs.filter(r => r.profile === name).length} runs (answer ${R.map(r => r.openAll.at).join(', ') || '-'}; ${f(m(R.map(r => r.openAll.set.length)), 1)} genera at once); back card in ${bk.length}/${R.length} runs, at answer ${bk.map(r => r.openAll.back).join(', ') || '-'} after Open all`
    );
    lines.push(row('first question, opened at once', A.filter(x => x.all && x.first)));
    lines.push(row('first 30, opened at once', A.filter(x => x.all && x.k <= 30)));
    lines.push(row('first 30, met before', A.filter(x => !x.all && x.k <= 30)));
    lines.push(row('every answer after Open all', A));
  }
  return lines.join('\n');
}

(async () => {
  if (WORLD === 'rated') {
    require('../tests/slot.js').guard('tools/learnsim.js'); // heavy at level 3 (40 seeds x 30,000 answers): in a machine slot
    const commit = (() => {
      try {
        return require('child_process').execFileSync('git', ['rev-parse', '--short', 'HEAD'], {cwd: ROOT}).toString().trim();
      } catch (e) {
        return null;
      }
    })();
    return require('./ratedworld.js').main({subject: SUBJECT, profiles: NAMES, seeds: SEEDS, seed0: SEED0, N: QN, workers: WORKERS, dist: DIST, app: APPK, beyond: BEYOND, learner: LEARN, coralSd: CORALSD, out: OUT, commit, times: TIMESK, every: EVERY, gap: GAPX});
  }
  await require('../tests/slot.js')('tools/learnsim.js'); // one Playwright run per 2 cores on this machine (tests/slot.js)
  if (STATS === 'live') STATS_JSON = await liveStats();
  const t0 = Date.now();
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const jobs = [];
  for (let s = SEED0 + 1; s <= SEED0 + SEEDS; s++) for (const name of NAMES) jobs.push([name, s]);
  const runs = [];
  let done = 0;
  await Promise.all(
    Array.from({length: WORKERS}, async () => {
      for (let j; (j = jobs.shift());) {
        runs.push(await run(browser, base, ...j));
        if (++done % 10 === 0 || !jobs.length) process.stderr.write(`\r${done} runs, ${Math.round((Date.now() - t0) / 1000)} s`);
      }
    })
  );
  await browser.close();
  server.close();
  const secs = (Date.now() - t0) / 1000,
    S = summary(runs),
    errs = [...new Set(runs.flatMap(r => r.errs))];
  console.log(
    `\nLearning-outcome simulation: ${NAMES.join(', ')}; ${SEEDS} seeds x ${QN} questions; ${runs.length} runs in ${secs.toFixed(0)} s (${WORKERS} workers)`
  );
  console.log(
    'knowSlate/knowMet: true knowledge (slate / met); |th-lk|, th-lk: Elo ability vs logit(know), genera met; prog-know: genScore - know, genera met;\n' +
      "prog%: the app's progress over the slate; right%: since the previous row; look: true look-alike pair accuracy; ref>=.9: genera truly passing the\n" +
      'hard reference question 90%; exam: genera entered in the mastery exam; ref@exam / ref@learn: their true reference success then (genera counted).'
  );
  console.log(table(S));
  console.log(fieldTable(runs));
  console.log(levelTable(runs));
  // Millepora met / first asked and the bonus offer, per profile: median question over the runs where it happened.
  const med = A => {
    const v = A.filter(x => typeof x === 'number').sort((a, b) => a - b);
    return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : '-';
  };
  console.log('\nMillepora met / first asked, bonus genera offered (median question, runs where it happened), bonus share after the offer:');
  for (const name of NAMES) {
    const R = runs.filter(r => r.profile === name),
      n = k => R.filter(r => typeof r[k] === 'number').length;
    console.log(
      `  ${name}: met ${med(R.map(r => r.millMet))} (${n('millMet')}/${R.length}), asked ${med(R.map(r => r.millAsked))} (${n('millAsked')}/${R.length}), offer ${med(R.map(r => r.bonusOffer))} (${n('bonusOffer')}/${R.length}), share ${R.some(r => r.bonusShare !== null) ? (100 * med(R.map(r => r.bonusShare))).toFixed(0) + '%' : '-'}, bonus met ${med(R.map(r => r.bonusMet))}`
    );
  }
  const GS = grpSummary(runs);
  console.log(grpTable(GS));
  const BS = BREAKS.length ? breakSummary(runs) : null;
  if (BS) console.log(breakTable(BS));
  // First met, per genus of --met: median question over every run, a run where it was not met counting as after QN.
  console.log(`\nFirst met (median question over the runs; >${QN}: not met in half of them or more; met in n runs):`);
  for (const name of NAMES) {
    const R = runs.filter(r => r.profile === name),
      cell = g => {
        const m = med(R.map(r => (r.metAt || {})[g] ?? Infinity));
        return `${g} ${m === Infinity ? '>' + QN : m} (${R.filter(r => (r.metAt || {})[g]).length}/${R.length})`;
      };
    console.log(`  ${name}: ${MET.map(cell).join(', ')}`);
  }
  // --ach (2026-11-06, the fish achievements' timing, rule L8): per achievement of the subject, the median answer at which
  // it came over every run (a run without it counting as after QN), and in how many runs.
  if (ACHT)
    for (const name of NAMES) {
      const R = runs.filter(r => r.profile === name),
        ids = [...new Set(R.flatMap(r => Object.keys(r.achAt || {})))].sort(
          (a, b) => med(R.map(r => (r.achAt || {})[a] ?? Infinity)) - med(R.map(r => (r.achAt || {})[b] ?? Infinity))
        );
      console.log(`\nAchievements, ${name} (median answer; >${QN}: not reached in half of the runs or more; runs reaching it):`);
      ids.forEach(k => {
        const m = med(R.map(r => (r.achAt || {})[k] ?? Infinity));
        console.log(`  ${k}: ${m === Infinity ? '>' + QN : m} (${R.filter(r => (r.achAt || {})[k]).length}/${R.length})`);
      });
    }
  // An opening only after a right answer (model.js openRight): per run, the genera opened on their own cards, those on
  // the question right after a miss (0 with the rule), the questions where the rule alone held the opening and the
  // openings that held back in expectation (their openChance summed), and the questions from each spell of held
  // questions (misses in a row) to the next opening (spells with no opening after them left out). Means over the runs.
  console.log('\nOpenings after a miss (means per run): own cards / on the question after a miss; held by the right-answer rule: questions / openings expected; questions to the next opening:');
  for (const name of NAMES) {
    const R = runs.filter(r => r.profile === name),
      m = f => R.reduce((t, r) => t + f(r), 0) / R.length,
      waits = R.flatMap(r => {
        const B = (r.blocked || []).map(b => b[0]);
        return B.filter(q => !B.includes(q - 1))
          .map(q => (r.opens || []).find(o => o > q) - q)
          .filter(x => !isNaN(x));
      });
    console.log(
      `  ${name}: ${m(r => (r.opens || []).length).toFixed(1)} / ${m(r => r.afterMiss || 0).toFixed(1)}; held ${m(r => (r.blocked || []).length).toFixed(1)} / ${m(r => (r.blocked || []).reduce((t, b) => t + b[1], 0)).toFixed(1)}; ${waits.length ? (waits.reduce((a, x) => a + x, 0) / waits.length).toFixed(1) + ` (${waits.length} spells)` : '-'}`
    );
  }
  if (OPENALL) console.log(openTable(runs));
  // The first-launch question: the first 20 answers against the app's expectation, and the fallback card.
  console.log(`\nChoice ${CHOICE} (fallback card ${FALLBACK}); first 20 answers: surprise = mean(right - e), right %, global level at 20; fallback card:`);
  for (const name of NAMES) {
    const R = runs.filter(r => r.profile === name && r.early),
      ms = v => {
        const m = v.reduce((a, x) => a + x, 0) / Math.max(1, v.length),
          sd = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, v.length - 1));
        return `${m.toFixed(2)}±${sd.toFixed(2)}`;
      },
      F = R.filter(r => r.early.fb);
    console.log(
      `  ${name} (${R[0] ? R[0].choice : '-'}): surprise ${ms(R.map(r => r.early.s / Math.max(1, r.early.n)))} [${R.map(r => (r.early.s / Math.max(1, r.early.n)).toFixed(2)).join(' ')}], right ${ms(R.map(r => (100 * r.early.ok) / Math.max(1, r.early.n)))}%, level ${ms(R.map(r => r.early.lvl || 0))}; card in ${F.length}/${R.length} runs${F.length ? ' (' + F.map(r => `${r.early.fb.dir}@${r.early.fb.at}${r.early.fb.took ? '->' + r.early.fb.took : ''}`).join(', ') + ')' : ''}`
    );
  }
  if (errs.length) console.log('\nPage errors: ' + errs.slice(0, 5).join(' | '));
  // --rtlog: every run's answer log as readAnswers rows [player, time ms, shown, answered, right, mode, photos, e, th, new
  // photos, choices, 0, seconds, enlarged, pTrue, noise], the player 'profile:seed' (tools/abilityeval.js reads them).
  if (RTLOG) {
    const rows = runs.flatMap(r =>
      (r.alog || []).map(([a, p, eps]) => [
        `${r.profile}:${r.seed}`,
        Date.parse(a.t),
        a.g,
        a.a,
        a.ok,
        a.m,
        a.ph,
        a.e,
        a.th,
        a.nw,
        a.ch,
        0,
        typeof a.rt === 'number' ? a.rt : null,
        a.zm,
        p,
        eps
      ])
    );
    fs.writeFileSync(RTLOG, JSON.stringify(rows));
    console.log(`\nAnswer log: ${rows.length} answers written to ${RTLOG}`);
  }
  if (OUT) {
    fs.writeFileSync(
      OUT,
      JSON.stringify(
        {
          date: new Date().toISOString(),
          commit: (() => {
            try {
              return require('child_process').execFileSync('git', ['rev-parse', '--short', 'HEAD'], {cwd: ROOT}).toString().trim();
            } catch (e) {
              return null;
            }
          })(),
          subject: SUBJECT, // tools/learncmp.js reads it (the corals' margins)
          seeds: SEEDS,
          seed0: SEED0,
          sheetv: SHEETV,
          questions: QN,
          checkpoints: CPS,
          profiles: Object.fromEntries(NAMES.map(n => [n, profOf(n, SUBJECT)])),
          learner: LEARNER,
          learnerKind: LEARN,
          tau: LEARN === 'field' ? TAU : null,
          custom: CUSTOMN ? {n: CUSTOMN, drill: DRILL} : null,
          stats: STATS || null,
          truth: TRUTH || null,
          seconds: secs,
          summary: S,
          byPhotos: GS,
          breaks: BS,
          runs
        },
        null,
        1
      )
    );
    console.log(`\nWritten: ${OUT}`);
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
