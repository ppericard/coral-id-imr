# Learning rules

Pierre's standing rules on the learning logic. The model, its research, every constant and its measurements live in
[LEARNING.md](../LEARNING.md): **change a learning constant only with its reason there.** The index of every rule is in
[AGENTS.md](../../AGENTS.md#the-rules).

### L1

**Time between sessions never decays progress, mastery or ability** (no spaced-repetition days, no decay, no
"refresh"). The app is a practical tool, not a retention or daily-habit app (no streaks, lessons, Duolingo-style units):
someone should be able to master everything in a few hours. Progress (`s.pg`), mastery (`s.mx`) and the Elo ability
(`s.th`) move only with answers (and how fast a right one came).
- **The seconds taken to answer are another matter**: they are evidence about that answer and may weigh how much it
  moves the ability (a right answer given fast proves more than one given slowly: `core.js` `rtWeight`, LEARNING.md
  "Response time"); never a decay, never a penalty for being slow on its own.
- **One exception, time to plan the comeback after a break**: the time since the last answers decides the questions
  after a break (a new visit after 30 minutes without an answer opens no genus in its first 10 answers; the FSRS
  forgetting curve plans a comeback on genera answered right; `model.js` "Comeback after a break", LEARNING.md).

*Why:* the app is for learning fast, in hours or days, not for bringing players back every day; time matters only to
plan a comeback, and the seconds of an answer are evidence, not time between sessions. *Source:* Pierre, by 2026-11-01; comeback, 2026-11-02; seconds, 2026-11-04.

### L2

**A wrong answer counts against both genera, in the progress, not in the ability.** Naming B on a photo of A is a miss
on A everywhere (ability, progress). For B it is a false alarm, not a failure to recognise a photo of B: it counts
against **B's progress bar** (and B's recent results and runs, so B cannot be learned on that run), and the A / B
confusion is kept **on the pair** (the player's own mix-ups bring the pair back as traps, duels and "Again: A or B?";
the pooled confusions pick the traps, rule L7). It does **not** move **B's ability (Elo)**: standard Elo learner models
update only the item asked (Pelánek et al. 2017), and on the real answers a false alarm on B did not make the next B
photo harder (docs/LEARNING.md "The genus wrongly given in the Elo").
*Why:* keeping the false alarm in B's progress keeps the bar from over-claiming a genus the player keeps naming wrongly;
keeping it out of B's ability keeps strong players from being under-rated (one wrong pick used to cost about three right
answers). Whether the new domain-score bar should keep it is open (Pierre, 2026-11-06: only if dropping it does not
make progress rise too fast; until then it stays).
*Source:* Pierre, by 2026-11-01; ability, 2026-11-03; wording clarified, 2026-11-06.

### L3

**Difficulty is adaptive and continuous; no manual Easy/Medium/Hard selector.** Per-genus player ability vs photo
difficulty on one Elo scale (Pelánek 2016), ~80% target success, guaranteed variety and new photos, more single-view
questions as the level rises (details in ARCHITECTURE.md). **Every account counts everywhere**, Pierre's included: the
admin has no filter on his own answers or "test" accounts; the leaderboard's "hidden" changes only the public
leaderboard. Starred genera are always included in Practice. Never split practice by lecture group.
*Why:* Pierre's account is a real player's. *Source:* Pierre, by 2026-11-01; every account, 2026-11-04.

### L4

**One progression path for every game**: the photo quiz is the path that opens genera (one at a time, the ★ rule L5,
Open all); every other game or mode (the Duel tab, Memory, the custom quiz, any future game) draws only from the genera
the player has unlocked, `model.js` `unlocked()`, the one source of truth, and never opens a genus (no card from a
game). A new game uses `unlocked()` too; the Tools' games through `proto/lab.js` `labPlay()` (the reference tools keep
every genus; wrong choices may name any genus, as the quiz's). LEARNING.md "One progression path for every game".
*Why:* one path for every game and mode, present and future, with no exception. *Source:* Pierre, 2026-11-04.

### L5

**Starred genera (Duncanopsammia, Alveopora, Merulina, Cyphastrea, Halomitra) are on the slate *because* they look like
surveyed genera: never show them as a separate "not covered" group.** `shownGroup()` places them in the lecture group of
their Coral Finder look-alikes (display only). On the path a starred genus opens only after the surveyed genera its card
compares it to have been met; the references come from the data (`core.js` `starRefs`), never a list in code; Open all
still opens everything at once. Every game follows that one path (rule L4), so this holds in the Duel tab, Memory and
the custom quiz too.
*Why:* a beginner met *Duncanopsammia*, whose card compares it to *Turbinaria*, before *Turbinaria*. *Source:* Pierre, 2026-11-03.

### L6

**Millepora counts as a slate genus; the other common off-slate genera are opt-in bonus genera; no genus-specific case
in code.** *Millepora* is a slate genus for everything in the games and the progress (`BENTHIC`), with a warning on its
first card and its sheet that it is not a hard coral nor on the IMR coral list, but on the IMR benthic slate. The bonus
genera (`BONUS`: Isopora, Leptoseris, Heliopora, Sandalolitha, Pleuractis) are offered once by a card when the player
has met every slate genus (Add them / Not now; never in the first 10 answers of a visit or during a comeback, rule L1),
and ⚙ Bonus genera On / Off any time (`Q.bon`); once on they open one at a time like slate genera (no threshold, no
weight cap of their own); they never count in the progress, their ID tips are the Coral Finder's (labelled so), their
game photos (Millepora's too) are Research Grade iNat (or Pierre's) only. Details: ARCHITECTURE.md "Bonus genera". The
game genera (slate + Millepora + bonus) and the Key-only ones (the other `data.json` `x` genera) are defined once,
`core.js` `BENTHIC`, `BONUS`, `slateOf()`, `gameOf()` (Python: `tools/genera.py`): use them, never
`n === 'Millepora'` or a `!DATA.gen[n].x` filter for "game genus". In the admin the game genera come first (Candidates,
Game coverage); Key-only genera get no Corallites candidates and a cap of `CAP.sheet` (6) colonies per view.
*Why:* Millepora is very common at Dauin and in ReefCloud photos. *Source:* Pierre, 2026-11-01, changed 2026-11-02; no
genus-specific case, 2026-11-03.

### L7

**Answer choices get harder gradually.** In the photo quiz the wrong choices for a genus start easy (genera sharing no
IMR growth form with it), and its look-alikes come in one by one, and soon (one after the first right answer, all three
after about 5: look-alikes are one of the ways genera are learned), as the player's Elo ability on that genus rises
(`FORMAT`, `trapsFor()`, `distractors()` in `app.js`). Duels stay look-alike pairs by design. Official IMR / Coral Finder
look-alikes only *seed* the confusions: real player answers then decide which genera get confused (confusion scores),
pooled over every player first, then each player's own mix-ups weigh in as their answers on the pair build up (personal
path, `pairConf`; performance only, never time). A genus never answered starts from the player's global level
(`playerStart`, `core.js`: an Elo over all their answers, shrunk while they are few), so a strong player gets traps and
harder photos on a new genus from its first question; "Learned" is still earned genus by genus.
*Why:* the start must be simple; traps come little by little. *Source:* Pierre, 2026-11-01.

### L8

**Achievements reward learning, never time**: unlocked by learning milestones (quarters of the way to learned, genera
learned, progress, runs of right answers, duels, corallites, hard photos, Elo), never by time spent or days played;
spread out so the first come within a few dozen questions (`core.js` `ACH`; check a new one's timing with the real game
before adding it).
*Source:* Pierre, 2026-11-01.

### L9

**Learned = the silent mastery exam.** A genus fills up to 95% with its progress, a moving average of its answers (right
answers against its look-alikes count most, each point harder to earn than the last; LEARNING.md); learned (100%) takes
5 exam questions slipped unannounced into the photo quiz, several answers apart, each as hard as the game gets (one
photo alone, never seen, look-alike traps), all right, at least 2 of them typed from memory (typed questions come in
progressively as the level on a genus rises, never as an on/off mode; `model.js` `TYPED`). Any miss on the genus, or
giving it as the answer for another one, restarts it. No milestone that a player can pass by luck or in a few
questions.
*Source:* Pierre, 2026-11-01; progress weights, 2026-11-02; typed, 2026-11-03.

### L10

**The first-launch question initialises variables, never a path.** "How well do you know corals?" (new to corals / had
the IMR coral course / know corals well) is a forced choice in the welcome tour (or a card before the quiz), asked once
to existing players under 50 answers and inferred silently from 50 on. Each answer only sets values of the existing
model (`core.js` `CHOICE`); the one dynamic algorithm then runs the same for everyone, with a one-time fallback card
when the answers do not fit (its thresholds, cards and the replay's prior: LEARNING.md "The first-launch question",
ARCHITECTURE.md "First-launch question"). A
new variable there needs its learnsim check per answer, right and wrong. **Each subject asks its own** (the fish question works exactly like the coral one): its words in `core.js` `SUBJECTS` `start`, the same answers and engine,
its own record (`startKey`); never a subject named in the code that asks it.
*Source:* Pierre, 2026-11-03; each subject, 2026-11-04.

### L11

**The simplest algorithm that works.** Don't add a variable, a special case or a hard-coded ramp to patch a problem:
first rethink the rule or recalibrate the existing settings (example: the opening of genera became a slope on `OPEN.K`
instead of new duel/opening knobs, LEARNING.md). **Checks come in four tiers, the effort proportionate to the question,
the statistics always valid** (how and why: [the statistics study](../reviews/2026-11-05-stats-methods-study.md) §0,
§3.2, §4, §6.7; a mean larger than its spread is never a verdict: it passes about 9% of cells with no effect):
- **tier 0, always**: the unit tests and the CI smokes;
- **tier 1, any change to the learning algorithm's behaviour** (`tests/profiles.smoke.js` over several seeds, and
  `node tools/learnsim.js`: the four profiles × 5 seeds, before and after on the same seeds, about 2 min; LEARNING.md
  "Learning-outcome simulation"). Before running, declare one primary measure, its checkpoint and its direction. Test it
  pooled over the four profiles with an exact stratified sign-flip test on the 20 (profile, seed) pairs; only if that
  passes, per-profile tests under Holm. The other measures are guardrails: held when the one-sided 90% bound of the
  paired difference stays inside a margin set once in LEARNING.md. Anything else is labelled exploratory, uncorrected.
  Five seeds catch large effects and breakage, not small improvements;
- **tier 2, fine calibration** (choosing a value, or tier 1 inside the noise): 30-40 common seeds, the number sized from
  tier 1's spread; each setting against the current value (or a fitted curve) with Dunnett or Holm; TOST for "no
  worse"; the chosen value confirmed on fresh seeds;
- **tier 3, real data** (rule L12): inference per player (players are the unit), never per answer.

**Multifactor analyses** (several factors or interactions at once, e.g. profile × parameter × seed; the admin's
Analyses) get the method suited to the design, found before running (e.g. a factorial design with a mixed-effects
model, seeds or players as random effects, interactions in the model rather than many pairwise tests; study §6); state
the model and its assumptions in the PR and check them. They are rare: taking the time is expected.

*Why:* every added part or variable makes the model harder to calibrate.
*Source:* Pierre, 2026-11-02; seeds, 2026-11-03; tiers and statistics, 2026-11-05.

### L12

**Check algorithm changes against the real players, not only the simulation** (tier 3 of rule L11). Any change to the
learning algorithm (Elo, progress, draw, opening, difficulty, typed questions…) is checked twice before its PR: in
`tools/learnsim.js` (5 seeds, the four profiles: no learning path may break) and on the real answer log (read-only
replay of the sheet's Answers tab, or a saved extract kept outside the repo): the change must not move the app's
estimates away from what players really do, and should bring them closer (next-answer log-loss and calibration,
Expected against actual, overall and by level band and question format). Where a replay cannot judge a change (a
different draw asks other questions), say what was measured instead. The PR shows both tables; LEARNING.md keeps them.
Any agent reads the real log through the Google Sheets connector ("Data access" in AGENTS.md; no GitHub Action needed),
for every change to the estimates and **routinely** while the app moves fast and players play every day.
*Why:* the real log caught many problems in these last days. *Source:* Pierre, 2026-11-03; connector and routine,
2026-11-05.

### L13

**Compute once, not on every phone**: what can be computed once (in the sync sheet's stats, or in `data.json` at build
time) and served to the app is preferred over recomputing it on each phone or in each admin session.
*Source:* Pierre, 2026-11-02.

### L14

**Visual recognition and fast side-by-side comparison beat theory.** The 5-question observation routine is only for the
very first contact. In the field people recognise genera by overall look; on photos they use the Coral Finder book (in
the app, the Coral ID Key, which follows it): growth form first, then a quick visual comparison of the candidates. Quiz
feedback shows corallite traits and lecture cues, never growth form as the reason.
*Source:* Pierre, by 2026-11-01.

### L15

**Short-term goal: ID on ideal photos, or on dives with time to look closely.** ReefCloud point drills,
realistic/degraded images, RealityScan and Metashape material are medium term (ROADMAP "Parked").
*Source:* Pierre, by 2026-11-01.
