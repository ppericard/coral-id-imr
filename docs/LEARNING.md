# Learning model: research and choices

How the app decides what to ask, how hard, and when a genus counts as learned; and how the shared statistics rate the
photos. Each choice says where it comes from: published work, Pierre's decisions, or our own measurements (the
three-player simulation, `tests/profiles.smoke.js`). Keep this file in step with the code: a constant changed here is
changed there, with the reason.

Code: `model.js` (the player's own model, in the browser; `app.js` before 2026-11-02), `core.js` (shared helpers, also run by the admin), the sync
sheet script `tools/sync/Code.gs` (statistics pooled over every player, `stats_`). ARCHITECTURE.md describes the code;
this file explains why it works that way.

## The players we design for

Pierre, 2026-11-02: three typical paths, handled by one dynamic algorithm, **never by coded tracks, tiers or
exceptions**:

1. **A complete beginner** who finds the game and starts from nothing.
2. **An IMR Research Assistant (RA)**, who plays from the first day of their course: light, patchy knowledge after one
   lecture.
3. **An expert** who already knows the corals and wants to see how far they can go, up to the hardest levels.

We are closer to Duolingo (bring people who know nothing to knowledge, bringing items back until they are mastered)
than to an exam on people who already know (Pierre). A new player is a beginner, not an average player.

## Research we rely on

- **Elo rating in education** (Pelánek 2016, *Computers & Education*): a student's answer is a match between student
  and item; both ratings move after each answer, by K × (result − expected). An *uncertainty function* (K shrinking with
  the number of answers, e.g. a / (1 + b·n)) gives fast first estimates and stable later ones; different uncertainty
  for students and items is advised. "If the skill is expected to change quickly, K should stay large." Our photo and
  ability ratings are this model.
- **Prior vs current knowledge** (Papoušek, Pelánek & Stanislav, EDM 2014; Pelánek et al., UMUAI 2017): split into
  prior knowledge (item difficulty and global skill, from each student's first answer per item), current knowledge
  (repeated answers, learning, with asymmetric updates: PFA / "PFAE") and question choice. Designed for geography, where
  people already know some facts.
- **Glicko and Glicko-2** (Glickman 1999, 2012), used in education by Coursera (EDM 2019) and Park (EDM 2021): a rating
  carries its uncertainty (rating deviation); an uncertain rating moves its opponents little; **volatility** grows when
  results keep surprising, so the rating catches up with a real change.
- **Duolingo**: *Birdbrain* (2020; IEEE Spectrum) estimates exercise difficulty and learner ability together, an Elo
  generalisation updated after every exercise, every answer counted. *Half-life regression* (Settles & Meeder, ACL 2016)
  fits each word's difficulty beside the learner's own counters with that word (times seen, right, wrong): repeats count,
  against what the learner is expected to remember.
- **Bayesian Knowledge Tracing** (Corbett & Anderson 1994): probability that a skill is known, with guess and slip.
  Used for the progress bar until 2026-11-02, replaced by a moving average (below).
- **Mastery criteria** (Pelánek & Řihák, UMAP 2017; *New Review of Hypermedia and Multimedia* 2018): which answers feed
  the mastery decision and where its threshold sits matter more than the learner model; an exponential moving average of
  the answers is a simple, good criterion. The progress bar since 2026-11-02.
- **Urnings** (Hofman et al. 2020; Bolsinova et al. 2022): an Elo alternative with explicit standard errors, robust to
  adaptive item selection, used in Math Garden. **Keeping Elo alive** (Bolsinova et al. 2025): with adaptive selection,
  Elo ratings' variance inflates over time; two parallel chains help. Not adopted (see below), kept in mind.

## The player's own model (app)

### Ability per genus (Elo) and the global level

- `P[genus].th`, on the photo-difficulty scale (0 = average photo). P(right) = g + (1 − g) · σ(ability − difficulty),
  g = 1 / plausible choices. Step K = `ELO.kmax` / (1 + answers / `ELO.n`), never below `ELO.kmin` (Pelánek's
  uncertainty function). `ELO = {kmax: 0.8, kmin: 0.25, n: 15, lo: −1.5, hi: 3, vr: 0.1, vg: 2}`.
- **Volatility** (2026-11-02, Glicko-2): `s.vr` is the moving average of the surprise (result − expected, rate
  `ELO.vr`); the step grows by up to `ELO.vg` × |vr|, within kmax. Why: simulated, a beginner or an RA at 80-87% right
  stayed rated as a beginner, because a shrinking step assumes a stable skill. A first version (vr 0.2, vg 3) made the
  global level swing; softened.
- **Global level** `P['~level']`: the same Elo over every answer. A genus never answered starts from it
  (`core.js playerStart`: 0.8 × global × M / (M + 10), clamped to [−0.5, 1.5]), so a strong player gets traps, single
  views and harder photos on a new genus from its first question.

### What a question shows

- **Photos**: drawn around ability − `PICKD.TARGET_OFF` (1.0), about 80% expected success.
- **Online calibration** (`CAL`, Pierre 2026-11-02: about half the 600 game photos had never been shown to anyone, so
  they could not be rated). Adaptive tests seed new items among the calibrated ones to calibrate them (pretest items,
  online calibration in computerized adaptive testing). Here a photo with few answers from all players (the sheet's
  plain count) weighs × (1 + `CAL.B` / (1 + answers / `CAL.N`)), B 2, N 2: × 3 with none, × 2 after 2, × 1.5 after 6,
  on top of the difficulty targeting. That alone hardly changed which photos came up: most photos never shown are single
  views of a colony (256 of the 340 unrated), which the colony choice scores down so that beginners see colonies at
  every zoom, and corallite photos of complete colonies only show as the hint (not counted unless opened). So `CAL.RATE`
  = 20% of the questions are calibration questions: one view alone (as for strong players), the colony chosen on the
  targeting and the bonus only, the view the players have answered least. Simulated (3 players, 1200 questions, the
  real ratings of 2026-11-02 as start, counts updated as the sheet does): photos with at least one answer 426-435 →
  465-510, with 3 or more ~200 → 225-234, right rates unchanged (73-87%). The bonus fades by itself as the photos get
  answers.
- **Calibration questions only on a genus the player holds** (met, not shaky): a single, perhaps unusual, photo does
  not help on a genus still being learned (and a simulated beginner opened genera faster than intended with them).
- **A new photo's set is only a guess** (`CAL.U` = 1): the targeting's width grows to √(0.7² + U / (1 + answers / 2))
  for a photo with few answers, so a photo placed in Medium or Hard by hand is not kept away from a player whose target
  is lower; it narrows back to 0.7 as answers come.
- **Every kept photo is in the games** (`applySlots`, 2026-11-02): Medium and Hard were capped at 4 per genus and view,
  other observers' photos only filling a short set, so the candidates Pierre validates would have stayed out.
- All together, simulated as above: photos with an answer 449-461 → 509-519, with 3 or more 214-221 → 239-255,
  right rates unchanged.
- **Look-alike traps** among the wrong choices: from ability (`TRAP`: one per 0.18 above 0, up to 3), chosen among the
  pairs most confused: pooled over every player and declared look-alikes (IMR lecture, Coral Finder) as a prior
  (`CONF`), then the player's own record on the pair (personal path).
- **Experts keep hard choices** (2026-11-02): when the player's own record clears every pair (an expert confuses
  nothing), the traps the level asks for come from the pairs other players confuse most, then the declared look-alikes,
  instead of easy genera. Simulated before this: an expert's traps fell from 1.8 to 0.1 a question.
- **Easy wrong choices come first from genera the player has met** (2026-11-02): a beginner is not asked to choose
  between names never seen.

### Logged for the admin's player journey (2026-11-02)

A mastery exam question is logged with mode `quiz|x` (exams have every trap, so never `|kN`; the sheet's guess rate and
mode split read it as `quiz`), and a passed exam keeps its time (`s.mx` = time, was 1; still truthy everywhere).

### "Again: A or B?" rated as 2 choices (2026-11-02)

Since 2026-11-01 (#251) a mix-up in the photo quiz comes back once as a 2-choice duel of the two genera, one question
later. It was logged plain `quiz`, so the sheet rated it with a 1 in 4 guess instead of 1 in 2 (a right answer looked
more convincing than it is): 59 of the first 552 answers, 11%. The app now logs it `quiz|k2`, and the sheet (v20) and
the admin (`core.js`) read the number of choices from the Choices column when the mode does not give it, which corrects
the answers already logged.

### Look-alike duels slipped into the photo quiz (2026-11-02)

The Duel tab had 13 answers in all (2 players); "Again: A or B?" only follows a mix-up. Pierre (1 in 10): from the 20th
answer on, about 1 photo-quiz question in 10 (`AUTO_DUEL.P` 0.1, `quiz.js`) is a duel on a look-alike pair, picked as the
Duel tab picks (`duelPick`: the player's own mix-ups first, then pairs players confuse, then the IMR / Coral Finder
look-alikes), both genera met and ready, never the same pair within 20 answers (`SAME`), at least 5 questions after the
last one (`GAP`) and 2 after an "Again" (`AGAIN`), never while an "Again" is due, and a mix-up in one of them brings no
"Again" (its pair comes back through the duel choice, mix-ups first; Codex review #352), and never on a question where the
path opens a genus (a card): opening comes first (Pierre, 2026-11-02; with the old order, a duel drawn at the wrong
time delayed a genus, and a weak RA met about 3 genera fewer by question 300). Prompt "Look-alikes: A or B?"; logged `quiz|d|k2` (rated 1 in 2, counted
apart in the player journey; a win counts for the Look-alike slayer achievement, as in the Duel tab). Simulated over 4 seeds, it does not slow the opening of genera (an expert met 27 genera
after 100 questions with duels, 26 without, seed 3333); the profiles test now checks an expert's traps at 300
questions (one or more a question) and more than a beginner's at 100, the mean of the two sitting at the threshold.

### Pierre's Easy / Medium / Hard sets against the players' answers (measured 2026-11-02)

The sets only give a photo's starting difficulty in the app (`photoDiff`: -1 / 0 / +1, weighing 5 answers); the sheet's
Elo never uses them. On the live data (552 answers, 438 photos rated): 342 of the 499 game photos in a set have answers;
Hard photos have 7 (they go to strong players); Easy and Medium are right 78% and 77% of the time. Rank correlation
between set and Elo: 0.00 for photos with 3 answers or more (121), 0.36 (p 0.01) with 5 or more (45: 39 Easy, 6 Medium,
Medium +0.35 against Easy -0.05). Too few answers to drop the sets or to trust them; to measure again once about 100
photos have 5 answers or more, Hard ones included.

### First meeting with a genus (2026-11-02)

Beginner RA review: the first quiz felt like an exam, asking genera the player had never seen. Pierre's design, the same
day: a player starting from zero first meets 4 genera on cards, is asked about those, and new genera then come one at a
time, each on its card, but never as the answer of the question right after its card ("too easy"). In model.js
(`INTRO`) and quiz.js (`introShow`, `planPhoto`):

- **Cards**: name, cover photo, ID tips, and for a ★ genus the surveyed look-alike it is on the slate for (rule 6b).
  The first `INTRO.START` (4) come one after the other ("1 of 4", Next, Start), picked by the progressive path's draw
  (easiest first); the first question is about one of them, never with that card's own photo (`photoSet(n, skip)`; a
  new-player walkthrough, 2026-11-02, got the very same photo twice in a row; same for a duel that brings a card).
- **When a genus opens** stays the progressive path's call (below): a draw that falls on a genus not met yet shows its
  card and asks about a genus already met. At least `INTRO.EVERY` (2) answers between two cards.
- **Held while the player falls behind** (`introHold`, Pierre, 2026-11-02): no new card while a running sum of how
  far the answers fall below the success the game expected for them (each answer's `e`), less an allowance
  `INTRO.SLACK` (0.1) an answer, never below 0, is `INTRO.HOLD` (1.5) or more. A CUSUM (Page 1954, the standard detector of a lasting drop): a run of misses adds up however long it
  lasts, a spell above expectation is not banked against a later drop, and right answers pay the debt back by what they
  beat the expectation by (an easy one, e 0.9, by 0.1). Kept on the device (`imr-hold`), so a player who left on a run
  of misses does not come back to new genera, and, for a signed-in player, synced through the sheet (sheet v23, Pierre
  2026-11-02: it follows the player from one device to another, and is rebuilt from the answers given before it
  existed, an RA having left on a run of misses before it was built): each load of the saved progress carries the same
  sum computed by the sheet over every answer it logged for the player, in time order, since their last progress reset
  (`Code.gs` `hold_`, same formula and allowance, `HOLD.SLACK` kept in step with `INTRO.SLACK` by
  `tests/sync.test.js`); the app adds the answers the sheet has not confirmed yet and keeps the larger of that and its
  own sum (`holdSync`), so a hold is never lifted by a sync. Players not signed in keep the device's only. Cleared with
  the progress. Why: an RA from the previous month's programme
  (the lecture, a few ID dives and analyses: good, not an expert) at 86% right after 50 answers declined "open all"
  (Pierre: even trained RAs prefer to meet the genera progressively; experts must still be able to open them fast),
  then met 9 genera in 21 answers (one every 2, the `EVERY` floor), fell to 5 right in 10 where about 8 were expected,
  answered the one-tap question "too hard" and stopped. Tried first: a fixed wider gap (`EVERY` 5) and holding on any
  miss of a genus just met (both slowed the expert, 26-28 genera after 200 questions down to 22-24); the last 10 answers
  of the visit (forgot the misses at the next visit; a 20-answer window hid the drop behind the earlier good answers and
  never triggered on that RA). The allowance keeps a player the game slightly overrates (0.85 expected, 0.8 right) from
  ever being held: without it, the simulated expert was held for good. On that RA's answers it holds at answers 11-12
  (three misses in a row) and from answer 67, off and on. Simulated (6 seeds, 200 questions, genera met, without →
  with): beginner 15 → 13, lecture-level RA 14 → 13, strong RA 22 → 23, expert 27 → 28.
- **Gentle restart** (`WARM` in `quiz.js`, Pierre, 2026-11-02): a player coming back with `WARM.FROM` (10) answers or
  more first gets `WARM.N` (10; 5 at first, Pierre: too short) questions on genera already answered right, with easy
  choices: no card, no duel, no exam. The first half leaves out the genera to review (unless fewer than 2 others are left), the second half brings them back; an Again after a miss still comes, counted with the restart; fewer than 2 genera answered right: no restart. A positive start before the harder questions; their answers do not count for the hold
  (Pierre: easy right answers must not reopen new genera after a run of misses): logged with `|w` in their mode
  (before `|kN`), which the sheet's hold leaves out too.
- **Not right after**: a genus met on a card alone can be asked from `INTRO.GAP` (2) answers on (one question at least
  in between; the card says "It comes up in the questions a little later"). The first 4 can be asked at once.
- **Choices among the genera met**: easy wrong choices and traps come from the genera met (a card or an answer); a
  look-alike already met beats a name never seen; genera never met only make up the three when too few are met.
- **Duels**: both genera are named on the buttons, so the cards of those not met yet come together before the duel.
- **"I've had the IMR lecture: open all genera"** (Pierre, same day: the first users are RAs who saw every genus in the
  lecture and have little time): a button on the first cards, and in My progress while genera are still unopened,
  opens every slate genus at once, without cards (`introAll`). The draw then asks first the genera never asked, with
  choices from the whole slate. A tinted box with a real button, not a chip (Pierre: white on white was easy to miss).
- **Offer to open all** (Pierre, same day: 10 answers on 4 genera are too few to decide): between the 50th and the
  150th answer (`INTRO.OFFER`), with 10 slate genera met or more and an overall level (Elo, `P[LEVEL].th`) of 0.5 or
  more, a card says "You seem to know your corals already" and offers Open all genera or Not now (`introOffer`), once.
  Simulated at 50 answers: a beginner -0.9, an RA who knows 60% of the genera -0.2, 80% +0.8, an expert +1.2. The
  correct-answer rate does not tell them apart (the game keeps everyone near 80%: 68%, 76%, 86%, 88%). A card, not an
  automatic opening, so a wrong guess costs a tap.
- Synced with the progress: the cards (`imr-coral-intro`: genus -> [answers when shown, 1 when ready at once (first cards, Open all,
  a duel's), time shown, kind: s first cards / c a card of its own / a Open all]) and the offer (`imr-coral-intro-offer`: {at, open, via: card / progress / offer, t}, also written by Open
  all genera, for the admin's player journey) are `imr-coral*` keys, which the sheet keeps; on a pull, the cards seen on another
  device join this one's (`introMerge`), and a progress reset starts them over (`introReset`). A genus already asked
  or a bonus genus (its own unlock card) counts as met. Checked in CI (`tests/draw.smoke.js`, first meetings, offer,
  sync; `tests/pages.smoke.js`, the 4 cards and My progress).

My progress no longer shows "Review" (weak) for a genus with fewer than 5 answers (`REVIEW_MIN`, `shownLevel` in
model.js): it shows "Learning" until there is enough evidence. The ring counts genera met ("6/39 met") until one is
learned, then genera learned. The model itself (`level`) is unchanged.

### Which genus comes next: the progressive path (2026-11-02)

Pierre: rather than spamming a beginner with 40 genera, focus on the easiest ones, opening new ones as they go,
everything estimated from the data. Before, a genus never seen weighed 10 against 1-4 for one being learned: a beginner
met the 39 slate genera almost at once.

- **Opening by results**: the genera not met yet share `OPEN.READY` (35%) of the draw while no genus met is *shaky*,
  down in a straight line to `OPEN.TRICKLE` (3%) at `OPEN.K` (10) shaky genera or more, so a new one still comes now
  and then. A share, not a weight, so the pace holds as the genera met add up. A slope, not a switch (until 2026-11-02:
  35% below 6 shaky genera, 3% from 6; K was 3, then 5, then 6): one genus more or less shaky no longer flips the pace,
  which made the opening a lottery (below).
- **Shaky** = met, not mastered, and the player's expected success on an average photo of the genus (4 choices, at its
  difficulty) under `OPEN.P` = 0.6, from the genus ability. That ability allows for how hard the questions were and
  starts from the global level, so the signal is what the player knows, at any level, from the first answer. Tried and
  dropped, all in the simulation (Pierre spotted the first): recent misses (2 in the last 5): the game keeps everyone
  near 80% right, where that happens about one time in four at any level, so an RA opened fewer genera than a complete
  beginner; BKT knowledge alone: climbs too slowly on a beginner's easy photos; a minimum of answers per new genus: held
  an expert back, each new genus waiting to be drawn again.
- **Easiest first, softly**: among the genera not met, weight exp(−`OPEN.T` × (difficulty − easiest)), `OPEN.T` = 3 (1.5 was too weak to show with the narrow spread of difficulties before real data).
- **Trusted only as far as the data goes** (`easyTrust`): the easy-first preference is scaled by the players' answers
  behind the photo ratings, over `OPEN.DATA` = 300 (weighed), up to 1. Before real answers, the photo sets and declared
  look-alikes put Acropora and Galaxea among the hardest and Alveopora first, against Pierre's experience: the opening
  order stays random (still a few genera at a time) until the answers can say.
- **Genus difficulty from the data** (`genusDiff`), never set by hand: the mean difficulty of its game photos
  (`photoDiff`: Pierre's Easy/Medium/Hard photo sets at first, the players' answers as they come) + `OPEN.CONF` (2) ×
  how much it gets confused (its two highest pooled confusion scores above `CONF.TRAP`). With little data the photo sets
  and declared look-alikes decide; the answers take over as they come (Pierre expects Acropora and Galaxea to come out
  easy: the data will say).

### Progress (moving average) and mastery

Until 2026-11-02 the bar of a genus was Bayesian Knowledge Tracing (BKT: `P[genus].L`, `L0` 0.1, learning `T` 0.08,
guess and slip from the photo's difficulty, a start up to 0.5 for a strong player, `bktStart`). Pierre: it climbed far
too fast (from scratch about 7 right answers to 95%, 4 for a strong player), and a right answer among a few genera met
(easy choices, often only 2 plausible) counted almost as much as one against the genus's real look-alikes: "a genus
can't be confirmed as learned before it has been compared with the genera it gets confused with". He wanted progress
that slows down by itself, each point harder to earn than the last, with no hard cap. The independent review
([reviews](reviews/2026-11-02-learning-algorithm-review.md)) had also found BKT degenerate on hard photos (a right
answer lowered L above difficulty ~2, where exam photos sit) and suggested dropping it; Pelánek & Řihák (UMAP 2017)
find that the data used and the threshold matter more than the learner model, and that an exponential moving average
is a good mastery criterion.

- **The rule** (`core.js` `PROG`, `pgStep`, `pgOf`; `model.js` `pgWeight`, `pgObs`): `s.pg ← s.pg + A · w · (right −
  s.pg)`, `A` = 0.15. A right answer weighs `w` = what it proves, from what the question showed:
  - the plausible choices `k` (`plausibleK`: easy choices of other growth forms do not count): (1 − 1/k) / (1 − 1/4),
    so 4 weigh 1, 3 weigh 0.89, 2 weigh 0.67;
  - its look-alikes: in full when a genus it gets confused with is among the choices (pooled confusion ≥ `CONF.TRAP`,
    declared look-alikes as prior, or the player's own mix-ups: the traps' rule), `PROG.LOOK` = 0.5 when none is.
  
  A right answer between the genus and genera of other forms (k 2, no look-alike) weighs a third of one against three
  look-alikes. **A miss weighs what it proves too** (`model.js` `pgMissW`; Pierre, 2026-11-02: "a miss on a very hard
  photo doesn't mean the genus is badly known", and a miss must not cost more than it proves): the Elo chance the
  player had to get it right (ability against the photo's difficulty, k choices) over the chance the game aims for
  (a photo `PICKD.TARGET_OFF` below the ability: about 80% with 4 choices), at most 1. A photo at the player's level
  or easier: in full; 1 unit harder 0.78, 2 units 0.57, 3 units 0.43 (4 choices; with 2 choices less discount, a guess
  is 1 in 2). No new constant. The choices do not lighten a miss: missing among easy choices says as much about not
  knowing the genus as missing among look-alikes, and with the same light weight a genus answered only on easy
  choices would still climb to its success rate, only more slowly; this way such a run tops out below its success
  rate (90% right on easy choices: about 0.75, under the exam's entry). In the games look-alikes come in among the
  choices after the first right answers anyway (traps, rule 14c). A wrong answer counts against both genera (rule 13),
  each with its own ability against the photo.

  Is it fair? With look-alikes among 4 choices, a right answer and a miss at the player's level weigh the same and the
  average settles on the success rate: at 95% on the bar (0.8) a miss takes 4 times what a right answer adds because
  4 right answers to 1 miss is exactly that level. Simulated (`tools/learnsim.js`, 30 seeds × 4 profiles × 300
  questions, paired with misses in full): progress, genera met, look-alike accuracy and the true success of the genera
  entering the exam unchanged within the spread (strong RA 0.93 against 0.91, expert 0.92 both); as the photos are
  picked at the player's level, a miss weighs 0.90 on average and under 0.8 for about 1 miss in 5 (photos well above
  the level: calibration photos, the exam's hardest ones). The misses that say little cost less; the measure loses
  nothing.
- **The bar** = 0.95 × min(1, `s.pg` / `PROG.M`), `PROG.M` = 0.8 = the mastery exam's entry, shown as 95%; each exam
  question passed adds 1%, the passed exam makes it 100% (`scoreOf`, `genScore`; the sheet's `pctOf_` is a copy,
  v22). The draw weight of a genus being learned uses 1 − `s.pg` where it used 1 − L.
- **The exam's entry is 0.8, not 0.95**: a moving average sits near the recent success rate, and the game keeps
  everyone near 80-88% right (difficulty targeting), so at 0.95 almost no genus ever reached the exam (table: an
  expert had 0 genera at 95% after 600 questions with A 0.1-0.2). 0.8 of what each answer proved, look-alikes in play,
  is reached by holding up against harder and harder questions; the 5 exam questions then decide, as before.
- **Mastery exam**: from `s.pg` ≥ `PROG.M`, `EXAM.n` = 5 hard questions on the genus alone, unannounced, at least
  `EXAM.gap` = 8 answers apart; all right = Learned. Any miss ends an exam in course (unchanged). **A learned genus
  survives one miss** (`mxKept`: lost below `PROG.M` × (1 − A), i.e. on a second miss before it is back up): a single
  miss takes 15% off, so losing it at once (the BKT rule, under which a miss at L 0.99 left the genus above 0.95)
  took learned genera from a simulated expert at every slip (learned genera lost by an expert in 1000 questions:
  2.5-8.5 depending on A and the entry, 0.5-3.3 with this rule). No time criteria anywhere (rule).
- **Photo difficulty left out** of `w`: simulated as a third factor (0.5 on an easy photo to 1 on a hard one), it only
  slowed everyone (an expert mastered 5 genera in 1000 questions instead of 16), which `A` already sets, and the traps
  already come as a genus's photos get harder (both follow its Elo ability). One factor less (rule 14f).
- **Progress saved before `s.pg`** (`pgOf`, the same in the app, `core.js` and the sheet): BKT's L is ignored; the
  device holds no answer log, only the last 10 results of each genus (`s.h`), so those are replayed from 0, a right
  answer weighed `PROG.OLD` = 0.67 (what it proved is not known: the middle weight), a miss in full. Simulated (the
  replay against the live value after 1000 questions, genera with 10 answers or more, misses there weighed as right
  answers, so in full a little lower still): +0.03 for a beginner, −0.07 for
  a lecture-level RA, −0.11 a strong RA, −0.21 an expert (weight 1 would overstate a beginner by 0.15); 10 right in a
  row give 0.65, 77% on the bar: no genus enters the exam on old answers alone. A learned genus (`s.mx`) stays learned,
  at the exam's entry. The record is rewritten at the genus's next answer. On the base runs (BKT, 300 questions, 6
  seeds) this recalculation moves the overall %: beginner 21-30% → 23-28%, lecture-level RA 35-41% → 33-37%, strong
  RA 32-53% → 27-44%, expert 65-82% → 45-51%; genera at 95% or more before their exam all drop under it. A fuller
  recalculation for signed-in players could replay their whole answer log from the sheet's Answers tab (mode `|kN`,
  Choices): ROADMAP.
- **Removed**: `BKT` (7 constants), `bktStep`'s guess and slip formula, `bktStart`, the "a miss never raises L" patch,
  the photo familiarity offsets of `answer()` (`bk`: +0.5 for a new photo, −1 for one right twice; the sheet's `stats_`
  keeps its own copy for the photo ratings, `PHOTO_W`).

Simulation (6 seeds: 11, 222, 3333, 44444, 555, 6666; four profiles: a beginner, a lecture-level RA who knows 60% of
the genera, a quarter more half, a strong RA who knows 60% of the genera well, an expert; the scratch harness of
`tests/profiles.smoke.js`, 1000 questions). Means over seeds; each cell: genera at 50% or more / 80% / 95% / learned,
then the overall progress:

| Rule | Profile | after 100 | after 300 | after 600 | after 1000 |
| --- | --- | --- | --- | --- | --- |
| BKT (before) | beginner | 3.2 / 0.2 / 0 / 0, 11% | 10.5 / 1.7 / 0.3 / 0, 27% | 16.3 / 3.8 / 1.2 / 0.2, 40% | 25.3 / 10.3 / 2.8 / 1.3, 60% |
| | lecture RA | 5.3 / 0.8 / 0 / 0, 17% | 16.0 / 5.2 / 1.2 / 0, 39% | 27.7 / 11.8 / 3.8 / 1.2, 62% | 34.8 / 23.2 / 11.8 / 5.3, 79% |
| | strong RA | 6.7 / 1.7 / 0 / 0, 20% | 18.2 / 7.0 / 2.7 / 0.7, 46% | 32.0 / 18.0 / 7.8 / 2.5, 73% | 37.3 / 29.7 / 20.3 / 12.3, 88% |
| | expert | 14.3 / 3.7 / 0.2 / 0, 34% | 32.7 / 20.5 / 6.2 / 0.3, 74% | 38.0 / 32.7 / 24.3 / 10.0, 91% | 39 / 38.3 / 35.2 / 33.0, 98% |
| **A 0.15, entry 0.8 (now)** | beginner | 0.7 / 0 / 0 / 0, 8% | 6.2 / 0.3 / 0 / 0, 19% | 12.5 / 1.3 / 0.3 / 0, 34% | 22.5 / 4.5 / 2.0 / 1.0, 52% |
| | lecture RA | 2.5 / 0.2 / 0 / 0, 13% | 10.7 / 1.7 / 0.3 / 0, 33% | 23.0 / 7.0 / 2.2 / 0.5, 55% | 35.7 / 18.0 / 6.5 / 3.2, 76% |
| | strong RA | 3.2 / 0 / 0 / 0, 17% | 13.7 / 2.2 / 0 / 0, 40% | 28.2 / 11.5 / 2.2 / 0, 63% | 38.2 / 22.3 / 13.8 / 6.0, 82% |
| | expert | 5.0 / 0 / 0 / 0, 22% | 24.5 / 3.7 / 0.3 / 0, 57% | 38.7 / 25.7 / 9.0 / 0.7, 83% | 39 / 34.8 / 27.0 / 16.5, 94% |
| A 0.10, entry 0.8 | expert | 2.7 / 0 / 0 / 0, 18% | 17.8 / 0.3 / 0 / 0, 48% | 37.2 / 13.0 / 0.5 / 0, 72% | 38.7 / 32.7 / 14.2 / 3.2, 89% |
| A 0.20, entry 0.8 | expert | 8.8 / 1.0 / 0 / 0, 26% | 30.0 / 10.0 / 2.7 / 0, 66% | 38.5 / 30.7 / 17.7 / 3.5, 88% | 39 / 37.5 / 29.3 / 25.7, 97% |
| A 0.15, entry 0.85 | expert | 4.0 / 0 / 0 / 0, 22% | 25.5 / 2.2 / 0.2 / 0, 57% | 37.5 / 22.3 / 3.8 / 0.2, 80% | 39 / 34.7 / 19.0 / 9.8, 92% |
| A 0.15, entry 0.95 (first try, a miss weighed w) | expert | 3.7 / 0 / 0 / 0, 19% | 23.3 / 0.7 / 0 / 0, 52% | 38.3 / 11.7 / 0 / 0, 74% | |

Learned genera for the expert over 1500 questions (all 39 met by question 200): BKT 31.7 at 1000, 38.7 at 1500;
A 0.15: 16.3, 35.7; A 0.2: 24.0, 36.3; A 0.1: 4.0, 30.7. A miss at 90% or more on the bar now takes 11-14 points
off (BKT: 3-6).

Right answers to reach the exam's entry (95% on the bar):

- in a row, from 0 (`core.test.js`): 10 against look-alikes among 4 plausible choices (w 1); 16 with 2 plausible
  choices and a look-alike, or 4 without (w 0.67); 32 with 2 plausible choices and no look-alike (w 0.33). BKT: about
  7, 4 from a strong player's start.
- in the simulated games, misses included (mean right answers on the genus before it got there): beginner 29 (19 of
  them on easy 2-choice questions), lecture RA 17, strong RA 16, expert 15 (BKT: 19, 12, 12, 10).
- no genus reached it while 10 genera or fewer were met, nor before being asked beside a look-alike (in any profile or
  seed; `tests/profiles.smoke.js` now checks the second).

Why A 0.15 and the entry at 0.8: A 0.1 matched Pierre's "15-25 informative right answers" in a row (16 against
look-alikes) but left an expert with 4 genera learned after 1000 questions (rule 12: everything in a few hours); A
0.2 is close to BKT for the expert (8 right in a row) and drops 15-17 points on a miss. A 0.15 sits between: 10 in a
row, 15-17 right answers in a real game for players who know their genera, 29 for a beginner, an expert with every
genus at 50%+ by question 600 and nearly all learned by 1500. The entry: 0.85 kept more genera under it (an expert
learned 9.8 genera in 1000 questions instead of 16.5); 0.8 is the success the game aims at, held on questions that
prove something. To recalibrate with real answers: the per-genus success on look-alike questions of
RAs who then pass the exam.

## Pooled statistics: photo difficulty and confusions (sheet v17-v18, 2026-11-02)

Photo difficulty feeds every player's game (which photos, how hard), and confusions pick the traps. They must reflect
real learners, not bots, random clicks or test runs (17 anonymous "players" turned out to be `tools/perf.js` runs).

- **Who counts** (`trusted_`, `TRUST`): players, signed in or not (v18; v17 left out devices that never signed in),
  with at least 10 answers (per player; a photo counts from its first answer) and a right rate clearly above chance (one-sided z ≥
  1.645 against each question's guess rate), judged on the whole history at each recompute: a beginner who gets out of
  chance then counts with all their answers. Every answer still moves the player's own level.
- **How much an answer weighs** (`PHOTO_W.N`; the sheet also returns the plain count of the answers, v18, which the
  admin's filters use): n / (n + 10) after n answers of the player (n + 30 in v17) (Glicko's idea: an uncertain
  player moves the items little). A beginner's random first answers weigh little, their informed later ones more.
- **Repeats** (`PHOTO_W.NEW`, `KNOWN`): every answer counts, against the player's own history with the photo, as in
  Duolingo's half-life regression and PFA: a photo new to the player is expected 0.5 harder, one already right twice 1
  easier (the rule the app's BKT used until 2026-11-02). Counts grow by the weight too (they damp later steps and are the app's confidence in a
  rating).
- **Everyone starts as a beginner** (`PLAYER0` = −1, about 45% right on an average photo with 4 choices): starting at 0
  (average), a beginner's misses made the photos look harder.
- A corallites hint left closed is not logged with the answer (not seen when answering). Names are matched case-blind.

## Considered and not adopted

- **First answer per photo only** (Papoušek 2014): standard for prior knowledge, where people already know the facts.
  Our players learn the corals in the app, so the first answer is the noisiest and later informed ones would be dropped.
  Tried in v17's first draft; Pierre rejected it, replaced by the experience weight and the history-aware repeats.
- **Urnings**: principled standard errors and robustness to adaptive selection; heavier to build and to run in the sheet
  script. To revisit if the photo ratings drift (the variance inflation "Keeping Elo alive" describes).
- **Coded tracks or tiers** (beginner / RA / expert modes, a fixed genus order, fixed difficulty per genus): ruled out by
  Pierre. Every threshold above is continuous or performance-driven.
- **Time criteria** (response time, spacing in days): ruled out (AGENTS.md rule: no time criteria anywhere).

## Simulation (`tests/profiles.smoke.js`, CI)

Three players through the real quiz, 300 questions each (600 in the exploration). The learner model is ours, not the
app's: `know[g]` = chance to recognise genus g on an average photo (beginner 0.02, RA 0.55 on 2 genera in 5 and 0.1
on the others, expert 0.93), lowered on harder photos and single views; otherwise a guess among the plausible choices;
each answer teaches `rate` × (1 − know). The numbers show trends, not real players: recalibrate with real answers.

The quiz draws from the 39 genera of the IMR slate; the 6 bonus genera (Millepora, Isopora, Leptoseris, Heliopora,
Sandalolitha, Pleuractis) open one by one with the progress (at 10%, 15%, ... 35%, `BONUS_AT`) and keep at most 15% of
the draw. The tables count the 39 (the first table of 2026-11-02 said "45", counting the bonus genera by mistake).

Calibration of `OPEN.K` (Pierre, 2026-11-02: "600 questions and only twenty-some genera open for the RAs may not be
enough"), 600 questions, 3 seeds, genera met (beginner / RA / expert):

| `OPEN` | after 100 | after 300 | after 600 |
| --- | --- | --- | --- |
| K 3, P 0.6 (first) | 12-14 / 9-17 / 25-31 | 14-23 / 18-29 / 34-39 | 26-37 / 26-34 / 39 |
| **K 5, P 0.6** | 9-14 / 14-20 / 21-37 | 19-21 / 27-30 / 39 | 28-29 / 33-39 / 39 |
| **K 5, P 0.6 + online calibration (now)** | 11-15 / 10-15 / 29-31 | 18-25 / 22-23 / 39 | 30-36 / 32-38 / 39 |
| K 5, P 0.5 | 11-15 / 15-28 / 34-35 | 22-30 / 27-34 / 39 | 33-39 / 36-39 / 39 |
| K 6, P 0.5, READY 0.5 | all 39 by question 500 / all 39 by question 200-400 / 39 at 100 | | |
| K 5 + first-meeting cards (EVERY 3) | 12 / 8 / 17 | 15 / 14 / 37 | 25 / 26 / 39 (1 seed; genera asked) |
| **K 6 + first-meeting cards (EVERY 2, now)** | 12-15 / 12-14 / 25 | 18-20 / 17-19 / 39 | 26-28 / 28-35 / 39 (genera asked) |
| K 8 + first-meeting cards (EVERY 2) | 17-18 / 11-17 / 15-25 | 26 / 23 / 39 | 32 / 33 / 39 |

With the cards (2026-11-02) the choices are genera met, so a wrong answer no longer opens a genus never asked (before,
a beginner picking an unknown name as a wrong answer opened it: the earlier rows count those). K 6 brings the RA back
near the pace Pierre asked for while the beginner stays under 16 genera in 100 questions; the expert meets all 39 by
question 200-300 instead of 100 (one card every 2 answers at most). Runs vary by about 5 genera.

The switch to a slope (2026-11-02, Pierre: "35% with no shaky genus and 3% from 6, shouldn't that be better
calibrated? it deserves a test"; and "the simpler the algorithm, the better"). With the switch, a player sitting near
6 shaky genera flipped between 35% and 3% from one answer to the next, so the same player met 8 to 24 genera after 100
questions depending on the draws. Simulated with 6 seeds (11, 222, 3333, 44444, 555, 6666), genera met, mean ± sd
(beginner; weak RA; "lecture" RA, who knows 80% of the genera and a quarter of them only half; expert):

| `OPEN` | after 50 | after 100 | after 200 | after 300 | right at 100 |
| --- | --- | --- | --- | --- | --- |
| switch, K 6 (before) | 12.0 / 11.8 / 12.0 / 15.8 | 14.5±1.4 / 13.8±2.9 / 16.0±7.8 / 22.5±7.0 | 16.3 / 16.0 / 25.3 / 30.8 | 19.8 / 19.3 / 27.5 / 35.5 | 74-88% |
| slope, K 6 | 10.8 / 9.2 / 12.5 / 14.8 | 11.7±0.7 / 11.3±1.4 / 16.7±4.4 / 21.7±3.7 | 14.2 / 14.5 / 23.7 / 31.7 | 17.7 / 17.3 / 28.7 / 35.2 | 75-92% |
| slope, K 9 | 11.7 / 11.7 / 13.5 / 16.2 | 12.7±1.6 / 13.3±2.1 / 19.3±2.8 / 21.7±3.3 | 17.0 / 17.3 / 26.5 / 33.2 | 19.8 / 20.7 / 30.2 / 37.8 | 76-87% |
| slope, K 12 | 11.5 / 12.3 / 14.7 / 15.5 | 14.5±1.0 / 15.7±2.2 / 19.8±2.0 / 25.8±3.8 | 17.3 / 18.7 / 29.2 / 39 | 20.8 / 23.2 / 35.2 / 39 | 72-88% |
| slope, K 15 | 14.5 / 12.7 / 15.8 / 15.3 | 18.7±1.4 / 16.2±1.7 / 23.8±3.1 / 23.8±2.4 | 22.3 / 21.5 / 36.5 / 36.5 | 24.2 / 25.0 / 37.2 / 38.8 | 71-86% |

All rows also have no duel slipped into the quiz when the path opens a genus that question (below). On these data
K 12 kept the beginner where it was (14.5 at 100) and opened faster for those who learn. Then the photo candidates
added on `main` the same day changed the photo ratings the simulation draws on, and the same grid gave:

| `OPEN` (photos of 2026-11-02, after #352) | after 50 | after 100 | after 200 | after 300 | right at 100 |
| --- | --- | --- | --- | --- | --- |
| switch, K 6 (before) | 12.0 / 12.3 / 13.2 / 15.8 | 13.0±2.9 / 13.5±2.3 / 16.5±4.2 / 24.8±6.4 | 16.8 / 17.7 / 21.0 / 32.8 | 19.2 / 20.2 / 24.3 / 36.7 | 76-86% |
| slope, K 8 | 10.2 / 12.0 / 13.5 / 14.0 | 12.8±1.1 / 13.7±0.9 / 20.2±4.1 / 20.5±4.0 | 14.7 / 16.5 / 28.0 / 28.7 | 18.5 / 19.5 / 31.0 / 34.3 | 75-86% |
| **slope, K 10 (now)** | 10.8 / 10.8 / 11.8 / 16.0 | 13.2±1.5 / 12.2±2.0 / 17.3±3.2 / 24.8±3.1 | 17.0 / 16.5 / 25.8 / 38.3 | 20.8 / 20.5 / 29.3 / 39 | 74-86% |
| slope, K 12 | 11.7 / 12.7 / 14.5 / 16.2 | 15.7±1.9 / 15.5±2.9 / 23.3±3.4 / 23.7±2.5 | 18.3 / 19.7 / 33.7 / 36.3 | 23.8 / 23.7 / 37.2 / 39 | 72-84% |

K 12 now opened 16 genera on average to a beginner in 100 questions, at 72% right (18 on the CI seed, over the test's
16), so K 10: the beginner stays at the switch's pace (13.2) with half its spread, the lecture RA meets 29 genera by
question 300 instead of 24, and the expert all 39 by question 200. A change of photos moved the results by about 3
genera: 6 seeds are a minimum, and the order between K 8, 10 and 12 for the RA is within the noise (the independent
review's first point: a simulation over more seeds, ROADMAP). A coupling of the duel rate with the number of shaky
genera was tried as well (3 more settings) and dropped: no gain over the slope alone.

K 5 with P 0.6 is the small step Pierre asked for: the RA opens faster (one genus more every ~15 questions at first),
the beginner stays on about ten genera for the first 100 questions. Lowering P too made the beginner open faster as well (18 genera
in 100 questions in the CI test, which keeps that at 16 at most). Mastery is barely changed: an expert masters
10-17 genera in 600 questions (9-21 with K 3); the first ones come around question 300, after 95% and the 5 exam
questions at least 8 answers apart, so the CI test checked that an expert had genera ready for their exam (95% sure)
after 300 questions, not mastered ones. With the moving average (2026-11-02, above) the first genera reach the exam
around question 400: the test now checks an expert's progress at 300 (genera half way, far ahead of a beginner) and
that no genus reaches 95% before being asked beside a look-alike.

Exploration of the first setting (K 3), 600 questions, 4 seeds:

| | Beginner | RA | Expert |
| --- | --- | --- | --- |
| Genera met after 100 questions (before: all 39) | 11-14 | 8-16 | 11-31 (31 in 2 seeds of 4) |
| Genera met after 600 | 26-33 | 26-35 | 37-39 (39 by question 200 in 2 seeds) |
| Traps a question, end (before: ~0.1 for all) | 0.3-0.5 | 0.2-0.6 | 1.5-1.7 |
| Genera mastered after 600 (before: expert 7) | 0-1 | 0-4 | 5-21 |

The beginner and the RA open at about the same pace here because the learner model's RA knows its genera only at 55%,
near the `OPEN.P` threshold, and its beginner learns fast; with real players, recalibrate.

Known limits: with little real data, the genus difficulty is mostly the photo sets and declared look-alikes, so "easiest
first" is weak until answers come in. Learners are still rated cautiously (abilities around −0.5 at 80-90% right in the
simulation); recalibrate `ELO` and `OPEN` once a few RA cohorts have played.

### Learning-outcome simulation (`tools/learnsim.js`)

The independent review's first point (docs/reviews/2026-11-02-learning-algorithm-review.md, §3-§4): the profiles test
above measures pacing (genera met, traps, genera ready for their exam) on one seed, not learning. `tools/learnsim.js`
drives the same real quiz (the app's draw, photos, traps, duels, Again, exam, Elo, knowledge model and progress, all
untouched; only the player is simulated) and measures what the simulated players really learn, and how far the app's
estimates are from that truth, as a mean ± sd over many seeds. Not in CI (minutes; numbers for reading).

- **Run**: `node tools/learnsim.js [--seeds 30] [--questions 300] [--profiles beginner,lectureRA,strongRA,expert]
  [--workers 4] [--out file.json] [--stats stats.json]`. Each run (profile × seed) gets a fresh browser context; seeds
  are 1..N, the app's `Math.random` and the learner's own generator both seeded from it, so a run is reproducible and
  the same seeds before and after a change give paired comparisons. `--stats` loads a `?stats=1` answer of the sync
  sheet as the photo ratings (default: none, Pierre's Easy/Medium/Hard sets, as in CI). `--out` writes every run and
  the summary as JSON. 30 seeds × 4 profiles × 300 questions: about 9 minutes on 4 cores (with the question planner running between answers, as in the app: Codex review #365).
- **Profiles**: beginner (knows every genus at 2%, learns 0.12 of the gap per exposure), lecture-level RA (the profiles
  test's RA: 55% on 2 genera in 5, 10% on the others, 0.12), strong RA (85% on 3 genera in 5, 10% on the others, 0.12),
  expert (93%, 0.05). The open-all offer is declined (the path is what is measured).
- **Learner**: `know[g]` = chance to recognise genus g on an average photo with all its views; on a question it
  recognises the genus with σ(logit(know) − photo difficulty − 0.5 if one view alone), photo difficulty from the
  app's `photoDiff`. Not recognised, it picks a choice with weight (1 + 3 × s) × (1 − 0.5 × know of that choice), s = 1
  for the genus shown and min(1, `pooledConf` / `CONF.LOOK`) for another (about 1 for a declared look-alike, 0.1 for an
  unrelated genus): wrong answers fall on look-alikes, an unrecognised photo goes to the right genus about half the
  time among easy choices, a quarter among three look-alikes, and a genus the player knows is ruled out more often.
  After each answer the genus shown gains rate × (1 − know), 1.5 × that after a miss (the side-by-side montage), the
  genus wrongly picked 0.5 × that; a first-meeting card teaches like one answer. No forgetting.
- **Measures** at questions 50, 100, 200, 300: true mean `know` over the 39 slate genera and over the genera met; the
  Elo estimate against the truth, |θ − logit(know)| and its sign, over the genera met; the progress bar against the
  truth, genScore − know over the genera met (below 0: it under-claims), and `progPct`; genera met, learned (`s.mx`),
  right % since the previous checkpoint; the true chance to tell each declared look-alike pair apart (2 choices,
  average photo, both ways); genera whose true success on a **hard reference question** (one photo alone, difficulty
  +1 plus the single view's 0.5, 4 choices: the genus and its 3 most confusable slate genera) is 0.9 or more; genera that
  entered the mastery exam (`examOn`, first time), and their true reference success at that moment and when learned.
- **Limits**: the learner is ours, a few round numbers, not fitted to real answers; the photo difficulty it meets is the
  app's own estimate (so photo calibration cannot be judged); learning is per genus only (a duel or a montage teaches
  the two genera, not the pair as such); no forgetting, no fatigue; the RA profiles know a fixed set of genera (every
  5th genus in data.json order), so the spread is that of the draws, not of who knows what. θ is clamped to
  `ELO.lo`..`hi` (−1.5..3), so a genus known at 2% always shows an error of about 2.4 there. Since the learner's
  guesses beat 1 in k (choices from other growth forms are ruled out), a θ that fits its answers would sit a little
  above logit(know): a negative θ − logit(know) is an under-estimate, not an artefact.

Baseline on `main` of 2026-11-02 (BKT knowledge, before the progress formula change), 30 seeds, 300 questions, no
`--stats`, mean ± sd over the seeds (ref@exam: mean over the runs where a genus entered the exam, their number in
brackets). 120 runs in 237 s on 4 cores.

| Profile, question | know39 | knowMet | \|θ − logit k\| | θ − logit k | genScore − know | met | learned | right % | look-alike | ref ≥ 0.9 | entered exam | ref at entry | ref when learned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| beginner 100 | 0.25±0.01 | 0.62±0.04 | 1.38±0.21 | −0.82±0.42 | −0.22±0.07 | 15.2±1.6 | 0 | 83±5 | 0.65±0.01 | 0 | 0 | - | - |
| beginner 300 | 0.54±0.04 | 0.72±0.05 | 1.62±0.21 | −1.27±0.33 | −0.22±0.05 | 29.0±3.6 | 0 | 83±4 | 0.81±0.02 | 0.5±0.6 | 0.7±0.8 | 0.67±0.09 (17) | - |
| lecture RA 100 | 0.47±0.02 | 0.67±0.04 | 1.15±0.17 | −0.73±0.34 | −0.26±0.08 | 18.8±2.4 | 0 | 83±6 | 0.77±0.01 | 0 | 0.3±0.6 | 0.68±0.03 (8) | - |
| lecture RA 300 | 0.71±0.03 | 0.75±0.02 | 1.41±0.21 | −1.15±0.24 | −0.23±0.05 | 35.7±3.9 | 0.2±0.4 | 85±3 | 0.89±0.01 | 0.7±1.1 | 1.8±1.4 | 0.69±0.06 (26) | 0.82±0.04 (5) |
| strong RA 100 | 0.68±0.02 | 0.78±0.03 | 1.49±0.14 | −1.02±0.25 | −0.29±0.08 | 21.7±3.0 | 0 | 84±4 | 0.88±0.01 | 1.3±1.0 | 0.9±0.9 | 0.80±0.12 (18) | - |
| strong RA 300 | 0.85±0.01 | 0.85±0.02 | 1.59±0.16 | −1.42±0.23 | −0.16±0.06 | 38.8±1.3 | 0.6±0.8 | 89±3 | 0.95±0.01 | 5.8±1.4 | 5.5±2.4 | 0.84±0.05 (30) | 0.93±0.05 (15) |
| expert 100 | 0.94±0.00 | 0.95±0.00 | 1.39±0.13 | −1.39±0.13 | −0.19±0.03 | 21.1±1.5 | 0.1±0.3 | 97±3 | 0.98±0.00 | 3.5±1.1 | 4.7±1.8 | 0.89±0.00 (30) | 0.91±0.00 (2) |
| expert 300 | 0.95±0.00 | 0.95±0.00 | 1.30±0.10 | −1.30±0.10 | −0.03±0.02 | 39.0±0.0 | 6.1±2.5 | 96±2 | 0.98±0.00 | 12.6±1.8 | 23.4±2.5 | 0.89±0.00 (30) | 0.91±0.00 (30) |

What it says, on this learner: the Elo ability under-estimates every profile by 0.8 to 1.5 logits and the gap does not
close in 300 questions (so the photos stay easy: an expert answers 96% right, not 80%); the progress bar under-claims
by about 0.2 for the learners; a beginner's or lecture RA's genus enters the mastery exam (BKT 95%) while its true
success on a hard reference question is only about 0.7, an expert's about 0.9 (the review's item 2 asks for ≥ 0.85);
the exam then keeps the genera learned at 0.82-0.93 true reference success.

## Decision log

- 2026-11-02, Pierre: anonymous answers do not rate photos; sign in to count (reversed the same day, below); stats only from players above chance;
  developer test answers deleted (admin anonDelete); first-answer-only rejected; experience weight and history-aware
  repeats; players start as beginners.
- 2026-11-02, Pierre: three player paths, nothing coded per path; progressive opening of genera, easiest first, from
  the data; experts keep hard traps; adaptive step (volatility); BKT start from the global level (point 3).
- 2026-11-02, Pierre: genera should open a little more easily for the RAs: `OPEN.K` 3 → 5 (table above); to
  recalibrate with real answers.
- 2026-11-02, Pierre: devices that never signed in count again for photo difficulty and confusions (sheet v18), under
  the same rule as everyone (clearly above chance, weighed by experience): the rule, not the
  sign-in, is what tells a real player from a bot or a test run. Signing in still saves the progress, for the trainer
  and on any device, and puts the player on the leaderboard.
- 2026-11-02, Pierre: the photo ratings must move quickly, the first players being RAs and experts who all bring real
  information (Pierre, Emmy, and an anonymous player who is probably IMR staff): `PHOTO_W.N` 30 → 10 (sheet v18). The
  10th answer of a player now weighs 0.5, the 30th 0.75 (were 0.25 and 0.5). `TRUST.N` stays 10: it counts a player's
  answers, which every real player passes quickly (lowered to 5 for a moment, when it read as answers per photo; there
  is no minimum per photo: one answer moves it, the app blending it with the photo's set as 5 answers' worth). To
  revisit if beginners or bots arrive in numbers.
- 2026-11-02, Pierre (beginner RA review): first-meeting cards, kinder first My progress, plain words, a bar under
  "Loading…" (above and ARCHITECTURE); ★ genera stay in from the start, being there for comparison. Then: 4 cards to
  start and questions among those, new genera one at a time, never asked right after their card; `OPEN.K` 5 → 6 to
  keep the RA's pace (table above). For the RAs, a button opens all genera at once (on the first cards and in My
  progress), and a card offers it after about 50 answers at a high level; all of it synced.
- 2026-11-02, Pierre: OK to seed the photos nobody has answered into the games to calibrate them (`CAL`, above).
- 2026-11-02, Pierre: relax the arbitrary thresholds so new photos come in quickly (he is validating many candidates)
  and their answers inform the dynamic algorithm: games take every kept photo (no cap of 4 Medium / 4 Hard), and a
  photo with few answers gets a wider targeting (`CAL.U`). Three seeds vary by ±5 genera at a given question count:
  the opening table moved within that noise (a run without `CAL.U` gave the RA 19-21 genera at question 300).
- 2026-11-02, Pierre: the opening as a slope rather than a switch, `OPEN.K` 6 → 10 (tables above), and no duel slipped
  into the quiz on a question that opens a genus. No setting added: "the simpler the algorithm, the better; rethink or
  recalibrate the existing variables rather than add one to patch a problem". K 12 on the first grid, 10 once the
  new photos were in. An independent review of the algorithm against the literature (Pelánek, Papoušek, Duolingo,
  BKT, interleaving) is done (ROADMAP, "To discuss") and may revisit this.
- 2026-11-02, Pierre: the progress % climbed far too fast and a right answer among a few genera counted almost as much
  as one against the genus's look-alikes. Agreed: a moving average weighed by what each answer proves, simulated first
  (6 seeds, 4 profiles, up to 1500 questions). BKT dropped; `PROG` A 0.15, exam entry 0.8 shown as 95%, look-alike
  factor 0.5, misses in full, a learned genus survives one miss; old progress recomputed from its last 10 results
  ("Progress (moving average) and mastery"). Sheet v22 computes the leaderboard % the same way. A pop-up announcing the
  recalculation to the players is not built yet (ROADMAP).

## References

- Pelánek, R. (2016). Applications of the Elo rating system in adaptive educational systems. *Computers & Education*
  98. <https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf>
- Papoušek, J., Pelánek, R., Stanislav, V. (2014). Adaptive practice of facts in domains with varied prior knowledge.
  *EDM 2014*. <https://www.fi.muni.cz/~xpelanek/publications/EDM14-adaptive-facts.pdf>
- Pelánek, R., Papoušek, J., Řihák, J., Stanislav, V., Nižnan, J. (2017). Elo-based learner modeling for the adaptive
  practice of facts. *UMUAI* 27. <https://www.fi.muni.cz/~xpelanek/publications/umuai-adaptive-practice.pdf>
- Glickman, M. (1999). Parameter estimation in large dynamic paired comparison experiments. *Applied Statistics* 48;
  Glickman, M. (2012). Example of the Glicko-2 system.
- Park, Y. (2021). Glicko-2 for student ability and problem difficulty. *EDM 2021*.
  <https://educationaldatamining.org/EDM2021/virtual/static/pdf/EDM21_paper_8.pdf>
- Settles, B., Meeder, B. (2016). A trainable spaced repetition model for language learning. *ACL 2016*.
  <https://aclanthology.org/P16-1174> · code and data: <https://github.com/duolingo/halflife-regression>
- Duolingo, Birdbrain: <https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain>;
  IEEE Spectrum, How Duolingo's AI learns what you need to learn: <https://spectrum.ieee.org/duolingo>
- Corbett, A., Anderson, J. (1994). Knowledge tracing. *UMUAI* 4.
- Pelánek, R., Řihák, J. (2017). Experimental analysis of mastery learning criteria. *UMAP 2017*; Pelánek, R., Řihák, J.
  (2018). Analysis and design of mastery learning criteria. *New Review of Hypermedia and Multimedia* 24.
- Hofman, A. et al. (2020). Tracking with (un)certainty. *Journal of Intelligence* 8.
  <https://dspace.library.uu.nl/bitstream/1874/396191/1/jintelligence_08_00010_v2.pdf>; Bolsinova, M. et al. (2022).
  Urnings: a new method for tracking dynamically changing parameters in paired comparison systems.
- Bolsinova, M. et al. (2025). Keeping Elo alive. *British Journal of Mathematical and Statistical Psychology*.
  <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12784335/>
