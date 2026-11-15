# A held-out photo set for the fish: design note

**Status: design only (docs), waiting on Pierre for questions (a)-(e).** Nothing is built. Written on `origin/main` at
1908b33d, 2026-11-15. Every count below was taken from `fish-game.json`, `fish.json` and `curation.json` at that commit,
read-only (rule W11; the commands are `jq` one-liners over those files, not kept). No sheet data was read for this note.

**The row** (ROADMAP "A held-out photo set", Pierre, 2026-11-04): "a fixed set of photos never shown in practice, for a
transfer check (recognition of photos never seen, at the start and later) and an honest exam. Fish first (many photos per
species); corals later (few photos per genus, so holding some out costs practice photos)." Status: Next (fish). Also in
[FISH_PATH.md](../FISH_PATH.md) "Checks before release": "a fixed set per species and per entry never shown in practice".

## Decided already (not asked again, rule W7)

- **Fish first, corals parked** (the row). Coral genera have few photos per view, and rule P4 means a coral question
  shows one colony in up to three views, so a coral hold-out costs whole colonies. The corals get their own note when
  the row moves.
- **One set, the same for everyone** (the row: "a fixed set"; the Trainer's set row builds on it, "the same for
  everyone"). Why it is the right choice, not just the recorded one:
  - The same photos are answered by many players, at different stages. A photo's difficulty is pooled over players
    (the sheet's photo Elo), so a probe is comparable across players, and between a player's start and later.
  - The analyses compare players on the same items. A per-player set (a hash of the account and the observation) would
    keep every photo in someone's practice, but each held-out photo would be rated from practice answers by other
    players. Its "never seen" would then hold for one player only. It also cannot become the Trainer's set.
  - The per-player guarantee still holds in a fixed set. A probe only ever shows a held-out photo that the player was
    never shown (below).
- **Never Pierre's ★ covers or featured picks.** `curation.json` `fish.genera` holds 28 ★ covers today (27 found in
  play by file name; step 2 matches them by photo id, as `tools/fish_game.py` `wink_trim` does). His featured picks
  (`fish.genera` `feat`, at any rank, which `wink_trim` also keeps): none exist today. Any added later are excluded
  the same way, and a photo he picks after it was held out leaves the set.
- **A whole observation is held out or not** (rule P4; photo exposure, rule L3: a fish observation counts as seen
  whatever photo of it was shown). 23,337 observations carry the 24,323 photos in play.

## 1. Which photos are held out

### Eligible observations

Every observation in play, except:

| Excluded | Why | Observations |
| --- | --- | --- |
| Pierre's ★ covers | the row's brief; a cover is shown on every card and list | 27 |
| Reference photos (`rep`: a reference source's taxon photo, FishBase's main picture) | rule P1: "reference photos first", each list's first photos and the default covers; holding one out could leave a species without its anchor. **Question (b).** | about 2,100 |
| Pierre's own photos (`own`) | rule P1: every compatible photo of his "must be included in the fish photo pool. Never left out". He has also seen them all, so for his account they are never "never seen". **Question (b).** | 752 photos |
| The surprise-only species (whale shark, thresher sharks: `fish.json` wink) | they keep only their 5 best photos (Q372) and are no game unit | 10 |

**Eligible: 20,505 observations** of 23,337 (21,449 photos). The exclusions shift the mix, mostly at ease 5, where the
reference photos sit:

| Share of photos | Ease 1 | 2 | 3 | 4 | 5 | Juvenile | Male or female | Profile view | Oblique |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Every photo in play | 13.0% | 29.9% | 28.3% | 20.3% | 8.5% | 12.0% | 6.8% | 59.2% | 33.3% |
| Eligible | 14.5% | 32.6% | 28.9% | 20.4% | 3.6% | 13.5% | 7.6% | 57.7% | 34.5% |

So the held-out set has fewer very easy photos than the practice pool. The analyses match on the ease band for that
reason (section 2).

### How many

**Per unit, at every rank that is a unit: 10% of its eligible observations, at least 5** (the exam's `EXAM.n`), but
never more than a quarter of them. A genus's set is drawn first. A family's set is its genera's, topped up to its own
floor when needed. The species inherit theirs from the genus draw. **Question (a)** asks about this size.

- **Families** (65 with game photos): 2,287 observations held out, **9.8% of the 23,337 in play** (11.2% of the
  eligible). Per family 8-19% of its observations: about 9% for the large families, up to 19% for the small
  single-species ones, where the floor of 5 bites.
- **Genera** (237 with eligible photos; median 41 eligible observations): the floor of 5 sets the median genus's
  count (12%). 10 tiny genera (fewer than 20 eligible observations) keep fewer than 5.
- **Species, once they are units** (660 with eligible photos; median 30 eligible observations): about 3 each from the
  genus draw. 16 species have fewer than 10 eligible observations and may get none. When species open
  ([FISH_PATH.md](../FISH_PATH.md) "Unlock rules"), each species is topped up to 5 from the photos that enter play
  after that, never from practice (below, "Stable over time"). Whether a species has its own exam is still open
  (FISH_PATH "Open questions for Pierre", 5).

**The cost to practice** (observations in play → left to practice):

| Family | In play | Held out | Left | Share |
| --- | --- | --- | --- | --- |
| Wrasses | 3,352 | 316 | 3,036 | 9% |
| Damselfishes (starter) | 2,380 | 208 | 2,172 | 9% |
| Butterflyfishes (starter) | 1,182 | 110 | 1,072 | 9% |
| Surgeonfishes (starter) | 1,122 | 99 | 1,023 | 9% |
| Angelfishes (starter) | 498 | 49 | 449 | 10% |
| Garden Eels (the median family) | 171 | 15 | 156 | 9% |
| Bigeyes | 64 | 6 | 58 | 9% |
| Moorish Idol | 41 | 5 | 36 | 12% |
| Sweepers | 30 | 5 | 25 | 17% |
| Stargazers (smallest) | 27 | 5 | 22 | 19% |

With a floor of 8 instead of 5, the set is 2,608 observations (12.7% of the eligible) and the smallest families lose
up to a quarter of their eligible observations (the cap). With no floor, it is 2,074 observations (10.1%), but 121 genera would hold fewer than 5, so no clean exam.

### How they are chosen: one systematic sample per unit

Within a genus, sort its eligible observations by species, then ease band (1-2, 3, 4-5), then phase (adult, juvenile,
male or female), then view (profile, oblique, other), then a fixed hash of the observation id. Take every k-th, k =
n / h, starting from a fixed hash of the genus id. A systematic sample from a sorted list is proportional on the sort
keys. That gives each species its share of the genus's set, and within the genus each ease band, phase and view about
its share.

- **Where the stratification holds.** It cannot hold inside one species: 3 photos cannot cover 3 ease bands × 3 phases
  × 3 views. It holds at the genus and family level, and for the whole set. The first sort keys (species, ease band)
  are held tightly; the later ones (phase, view) only roughly. Step 2 (section 5) tests the whole set: within 1 point of
  the eligible pool on each ease band, phase and view. Per family with 50 or more held out, 3 points on the ease bands
  is a target: the PR reports each family's shares, and a miss is shown, not a failed test.
- **The judged ease** is the curated one where Pierre set it (`fish.ease`), else the pass's, the same `e` the game
  reads.
- **No source, licence or observer** enters the choice (rule P1: fish have no source priority).

### Stable over time

The set is sticky. Once held out, a photo stays held out until Pierre's curation removes it from play (reject, exclude,
move). Then it leaves the set and play together.

- **New photos.** A unit below its count is topped up only from the observations that enter play in that run. Those
  were never shown in practice, so "never shown in practice" stays literally true for every top-up.
- **The first draw** (step 2) has to take observations already in play. It prefers those no fish answer has ever shown:
  the Photos column of the fish rows of the Answers tab, read once by an agent with read access, as a list of file
  names used as an input and never committed (rules D2, L12). The step 2 PR reports how many observations that list
  excluded.
- **Never re-drawn.** A re-draw after players have answered probes would mix two sets in the analyses. Each logged probe
  carries its own flag (section 3), so the log says what was held out at the time whatever the files say later.

## 2. What uses them

### The transfer check: silent probes in the quiz

A **probe** is an ordinary photo-quiz question on unit n whose photo comes from n's held-out set instead of its
practice photos. It is drawn by the same rule as the question it replaces: the same target difficulty, format, choices
and traps. It is unannounced, like the exam questions (rule L9), and its answer is shown as usual.

- **When:** any photo-quiz question on a unit becomes a probe with a fixed chance π (one constant, `HELD.p`; start at
  0.1, set by the simulation in step 3), from the unit's first questions on. So probes fall at every stage of the
  path, "at the start and later", with no schedule of milestones to tune (rule L11).
- **Never** a probe: the custom quiz, the Duel tab, a look-alike duel, "Again: A or B?", Find the X, a comeback
  question, the question right after a unit's card (the opening hold). These have their own photo logic, and the exam
  stays in the photo quiz only (Pierre, 2026-11-03).
- **Never seen by this player:** a probe shows only a held-out photo with no entry in the player's photo history (any
  mode, as the replayed log has it, rule D9).
- **The budget is per photo, not per unit.** One held-out observation belongs to its family, genus and species at once.
  Shown as a family probe, it is spent for that player's genus and species too. So a probe on unit n may only take a
  photo that leaves every unit it belongs to and that is in the player's game (the family; the genus when the
  scientific names are on) with more than `EXAM.n` held-out photos the player has never seen. The family draws first
  (it is met first). Once a unit is down to its exam reserve, it gets no more probes.
- **Small units** (a floor of 5 = one exam's worth) give no probes. Their set serves the exam. The transfer data comes
  from the families with ten or more held out, which are most answers.
- **"At the start" in Pierre's words** could also mean a short visible check at the very start and again later.
  **Question (d).**

### The exam

The mastery exam (rule L9; `model.js` `examSet`) takes its photo from the unit's held-out photos the player has never
been shown: the hardest of them, as today. When none is left (small units, or exams failed and retaken), it falls back
to today's rule: practice photos never shown, then never answered right, then the least seen. Logged with `|h` as well
as `|x` when the photo is held out (`…|h|x`: `|h` sits before `|kN`, `|t` and `|x`, section 3).

- Today's exam already prefers photos never shown in a quiz. But "never shown" there means never in a quiz question.
  The same photo may have been seen on a fish sheet, Home, a card, Memory or among Find the X's four photos. A held-out
  photo was seen nowhere. That is the "honest exam" of the row.
- A family of 1 genus with 5 held out has one exam's worth for the family and its genus together. The second exam falls
  back. That is stated, not hidden.

### What the analyses measure

Three contrasts, per player (players are the unit, rules L11, L12), declared before the log is read (as in the photo
memory lag study, [2026-11-15-photo-memory-lag-table.md](2026-11-15-photo-memory-lag-table.md), #944):

1. **Transfer (primary): held-out probes against practice photos at their first exposure.** Both are photos the player
   meets for the first time in a quiz. They are compared raw (right %), matched within each cell of ease band ×
   the unit's stage (bar under 50%, 50-80%, over 80%, learned) × format (4 choices, 3 or 2 plausible, typed). The cells
   are weighted by the probe counts (direct standardisation to the probes' mix). The test is a sign-flip over players.
   Why raw and matched, not right − expected: a held-out photo has only first-exposure answers and its judged-ease prior,
   while a practice photo has an answer-based rating. Right − expected between the two would mix the model's
   calibration with transfer.
2. **Hidden exposure: practice "new" against held-out.** Today's photo memory counts a photo as new (bucket 0) when it
   was never shown in a quiz question (`core.js` `memBucket`). If held-out probes do worse than bucket-0 practice
   photos in the same cells, practice "new" photos are not new: players met them on sheets, cards, Home, Memory or Find
   the X. Then today's memory offsets, measured against bucket 0, understate memory. This is contrast 1 read from the
   memory side. The #944 table's next run (at each subject's next 1,000-answer milestone) gets the held-out row as its
   clean reference.
3. **Photo memory against a clean reference: seen photos (buckets 1-3) against held-out**, same matching. This is what
   Pierre's photo-memory concern of 2026-11-03 asks: do players learn the photos or the unit?

Secondary (model-based, exploratory until the held-out photos are rated): right − expected on each side, and a
mixed-effects logistic model (player and photo random effects; fixed: source, ease band, stage, format) with its
assumptions checked (rule L11, "Multifactor analyses"). Also exploratory: the domain-score bar's claim checked on
never-seen photos. The bar is the share of a unit's photos the player would name alone and typed. Typed probes test it
directly: observed success on typed probes against the bar at that moment, per player, by bar band.

**How much data.** A rough calculation, labelled as one (rule W11). Assume one probe's outcome (right 1, wrong 0) has a
standard deviation of about 0.4 (success near 80%), and players differ in their true gap by about 5 points. A
one-sided test at 5% then has:

| Players × probes each | Power for a 5-point gap | Power for a 10-point gap |
| --- | --- | --- |
| 20 × 20 | about 70% | about 99% |
| 20 × 30 | about 80% | about 99% |
| 6 × 20 | about 33% | about 78% |

At π = 0.1, 20 probes take a player about 200 fish answers on the families that give probes.

**Stop rule for the primary test** (declared now): it runs once 20 players each have 20 probes or more. Before that,
the table is shown with its counts and read as descriptive only.

**What the player base allows.** On 2026-11-09 nine accounts had fish answers in the log, two of them above 300
(LEARNING.md "The log, the only reference for progress"). This note read no newer data. At that size, a few players
with 20 probes each, only a gap of about 10 points or more could show. A 5-point gap waits for about twenty regular
fish players. A probe costs no learning: it is an ordinary question on a photo the player has never seen, with its
answer shown. So the real limit on π is the size of the set, which is why it bears on question (a). At π = 0.2, the
large families still last a long time (Damselfishes: 208 held out, about 1,000 Damselfish answers per player), and the
data comes twice as fast.

## 3. Where the set lives, and what changes

### Stored data

- **Recommended: a separate file, `fish-held.json`**, with the same records as `fish-game.json` (the same short form,
  on R2 the same way), written by `tools/fish_game.py` in the same run. A held-out record leaves `fish-game.json`.
  - The guarantee comes by construction: nothing that reads `fish-game.json` can show a held-out photo. That covers
    every game, the sheets, Home, the Lab tools, a future game (rule L4) and an old app copy still cached on a phone.
    Only code that loads the second file on purpose (the probe and the exam) reaches them.
  - Its header: `v`, `built`, the rule's constants (rate, floor, cap), the salt of the hash.
- The other option, a flag `ho: 1` on records in `fish-game.json`, keeps one file. But every reader must filter it,
  and an old app copy shows the held-out photos in practice until it updates. **Question (e)** (a stored format other
  code will follow: costly to undo, AGENTS.md "Working mode").
- **Who reads `fish-game.json` today** (grep at 1908b33d), and what each option costs:
  - *Readers that show photos* (option B must filter each one): the app through `core.js` `fishPhotos` (the games,
    the cards, the sheets, Find the X, Memory), `tools/fish_game.py` `first_photos` (Home's first photos in
    `fish-photos.json`), `tools/ratedworld.js` (the rated world's pools), the admin's fish pages (`admin.js`
    `withGame`, `admin-fish.js`).
  - *Readers that look a logged photo up by its name* (its species, ease, phase, tags; option A must read
    `fish-held.json` too, or a held-out photo in the log reads as unknown): the sheet's photo pools (`core.js`
    `SUBJECTS` fish `pool` files, which the sheet runs from its embedded copy), What makes a photo hard (`analysis.js` `photoMetaFish`, through
    `admin-analyses.js` and `tools/analyses.js`), the app's species shown after the answer (`app.js`, the photo's
    taxon), the studies' scripts (`tools/studies/`). The Photo answered column (Find the X) never holds a held-out
    photo.
  - So A costs about five lookup readers a second file; B costs every reader that shows photos a filter, now and in
    every future game.

### `core.js`

- `fishPhotos` takes the held-out list beside the game list. `fishGen` builds each unit's `held` (every rank: family,
  genus, species) beside its practice photos. Nothing that builds cards, covers, sheets, lists or the draw reads
  `held`.
- The unit's difficulty (`genusDiff` for a fish unit: its offset plus the mean judged ease of its photos) reads the
  practice and held-out photos together, so it does not move when the set is drawn.
- `heldOf(mode)`: `/\|h(\||$)/`, beside `fmtOf`. The format is unchanged: a probe is a 4-choice, 3-plausible, typed…
  question like any other.
- A change to `core.js` carries a `tools/sync/changes/` file (rule D3): `Code.gs` holds its copy.

### `model.js`, `quiz.js`

- The probe draw (`photoSet` on the held-out list, with the reserve filter) and `examSet` taking the held-out photos
  first.
- `quiz.js` logs `|h` right after `|c`, so **before** `|kN`, `|t` and `|x`. The sheet's `guess_` reads `|kN` only
  at the end of the mode (`/\|k(\d)$/`), which is why `|d` and `|c` sit before it. Placed there, an older sheet script
  rates a probe exactly as today. No version gate is needed (rule D4), and a test checks `guess_` on a mode with `|h`.

### The sheet

- **What changes in `Code.gs`, step by step** (section 5). `Code.gs` embeds a copy of `core.js` (`CORE_`, copied by
  `tools/sync_core.py`). So every step that changes `core.js` changes `Code.gs` too: one `tools/sync/changes/` file,
  and `VERSION` assigned at merge (rule D3).
  - Step 2: the embedded copy (`fishPhotos`, `fishGen`). With option (e) A, the fish `SUBJECTS` `pool` files (in
    `core.js`, so in the copy) also list `fish-held.json`, so the sheet knows a held-out photo by name.
  - Steps 3 and 4: the embedded copy (`heldOf`). Nothing in the sheet's own functions.
  - The Mode column stores `|h` as text. The photo ratings (`stats_`, the fish's Stats Fish snapshot) rate held-out
    photos from probe and exam answers like any photo. The replay replays a probe as any answer.
  - The app needs no gate on the sheet's version (rule D4): an older script reads a probe's row as today's (below).
- **The exams and the replay.** The replay does not decide the exam: a passed exam (`s.mx`) and an exam in course
  (`s.ex`) come from the saved copy (`core.js` `replayedOf`). The replay takes a learned mark away, or ends an exam in
  course, when the log shows a later miss on the unit (`lx`, `lm`). An exam answer (`|x`) moves the bar and the
  ability like any answer. Drawing the exam from held-out photos changes none of that: only the photo name in the row
  differs.
- **Probes counted like any answer (recommended):** a probe moves the ability, the bar, the photo's rating and its
  memory bucket, as today's questions do. Then the replay needs no branch and no rules version (rule D5: no progress
  rule changes). But a probe missed on a unit then ends its exam in course, and can take away its learned mark, in the
  app and in the replay. The alternative, probes that move nothing, needs a replay branch and a rules version, and a
  right answer that moves no bar. **Question (c).**

### What is costly to undo

1. **A held-out photo shown in practice is spoiled for good** for that player (it cannot be unseen). A bug, an old app
   copy or a reader that forgot the filter spends the set. This is why (e) recommends a separate file.
2. **The log token `|h`.** Once logged, every reader of the Answers tab sees it for good: the sheet, `analysis.js`,
   the studies. It is cheap to carry, but it cannot be taken back.
3. **Re-drawing the set** after probes were answered splits the analyses into set versions. Hence the sticky rule.
4. **Counting probes in progress (c)**, once players have answers on them. Switching later is a rules version and a
   replay of every fish player (rules D5, D6, D9).
5. **The file format (e)**, once `tools/fish_game.py`, the app and the admin read it.

Easy to undo: π, the rate and floor (a data rewrite; photos returned to practice are new to everyone who never had
them as probes), the exam's fallback, the analysis.

### The admin and Pierre's own account

Pierre curates every photo in play, held-out ones included (rule A1), so the admin keeps showing them, marked "held
out". He will see some of them there, and his account counts everywhere (rule L3). So the transfer analyses also
report a sensitivity row without the accounts that open the admin. That row is a check on the result, not a filter.
Integrator's call.

## 4. The check plan (rules L11, L12)

| Step | Level and why | Simulation | Real log |
| --- | --- | --- | --- |
| 2. Withhold the set | **1**: one subject, the practice pools 10% smaller with the same mix, the draw's rules unchanged | the app world, fish profiles × 5 seeds × 300 questions, before and after on the same seeds; `tools/fish_draw_sim.js --photos` on the practice pool (share under ease 4 by stage) | a replay cannot judge a pool change (a different draw). Measured instead: the share of logged fish answers whose photo is held out, and each unit's practice pool after |
| 3. Probes | **2**: a share of all fish questions drawn from another pool | both worlds: the app world as level 1; the rated world 10 seeds per profile, 3,000 answers (its planner runs `model.js` `photoSet`, so the probe is the app's own) | read-only replay of the `\|h` rows once logged: next-answer log-loss and calibration, probes against the rest, by level band and format |
| 4. Exam from held-out | **1**: the exam only, a rare situation | the app world, 600 questions, fish profiles × 5 seeds | the exam's pass rate before and after, per player, descriptive |
| 5. The analyses | read-only | the analysis run on simulated logs (below) | the declared plan, its stop rule |

The steps are numbered as in section 5. **Declared for steps 2-4** (each PR declares it again before running, rule
L11). None of them is meant to move learning, so each primary is named with "none expected", as LEARNING.md's leak fix
of 2026-11-08 did (`know@300:up`, none expected), and read with the guardrails as non-inferiority:

| Step | Primary (`tools/learncmp.js`) | World and checkpoint | Looks |
| --- | --- | --- | --- |
| 2 | `know@300:up`, none expected | the app world, fish, 300 questions | one look at 5 seeds; unclear goes to level 2 |
| 3 | `score@3000:up`, none expected | the rated world, fish, 3,000 answers (the app world beside it at 300 questions) | two looks, 10 then 20 seeds: each bound read at 95%, the primary at 0.025 |
| 4 | `know@600:up`, none expected | the app world, fish, 600 questions | one look at 5 seeds |

Step 4's 600 questions is a guess that the strong profiles reach the exam there. The run reports the exams started,
and the horizon goes up if too few start.

Every guardrail of LEARNING.md's table must hold under its margin (the one-sided 90% bound). The ones most at risk:
- the share under ease 4 before Open Water (+0.05), from probes drawn from a pool with fewer very easy photos;
- true knowledge (−0.02);
- answers to the first unit at Open Water (+20% or +10);
- units met (−2 or −5%).

One cost is declared beforehand: probes on units under Open Water may raise that share. Accepted bound +0.05, the
guardrail's own margin. An unclear result goes one level up. A breach goes to Pierre.

**The analysis checked before it meets real data:**
- **Size.** In the app world the item learner has no memory of single photos, and nothing outside the quiz shows a
  photo. So held-out and practice photos at first exposure are alike, and contrast 1 must come out null. Run over the
  simulated players, it must reject at no more than its nominal rate.
- **Power.** The exemplar learner (`--learner exemplar`) stores every photo shown, so seen photos are recognised better
  than new ones: contrast 3 must find that.
- Neither world shows photos outside the quiz, so contrast 2 (hidden exposure) can only be checked on the real log.
  That is said, not hidden.

## 5. Step plan (one PR each, in order)

1. **This note** and the ROADMAP row (docs only).
2. **Withhold the set** (after (a), (b), (e)): `tools/heldout.py` (the systematic sample, the sticky rule, the top-up
   from new photos), `tools/fish_game.py` writing `fish-held.json`, `core.js` `fishPhotos` / `fishGen` (`held`), the
   changes file. Tests: the set against the pool's mix (section 1), no cover, reference photo, own photo or wink in
   it, a re-run keeps membership, and no built list (views, covers, first photos, sheets) holds a held-out photo. The
   step 2 checks (section 4). Players see slightly fewer photos per unit, nothing else.
3. **Probes** (after (c), (d)): the probe draw, `HELD.p`, the reserve, `|h` in the log, `heldOf`, the `guess_` test,
   the rated world's planner. Level 2 checks.
4. **Exam from held-out:** `examSet`, `|x|h`. Level 1 checks.
5. **The analyses:** the admin's Analyses gets a Transfer page that says what it can conclude (rule A5). A read-only
   study on the real log once the stop rule is met; the #944 table's next run with the held-out row.
6. **Later:** species quotas when species open; the Trainer's set (ROADMAP) on top of this set; the corals' note.

## 6. Questions for Pierre

**(a) How many photos are held out.** Today 23,337 fish observations are in play, about 30 per species. Each held-out
photo is one players never practise on.
- **A**: 10% of each family and genus, at least 5 (one exam's worth), never more than a quarter: 2,287 observations
  (9.8%). The large families lose about 9%, the smallest up to 19% (Stargazers 27 → 22).
- **B**: 5%, at least 5: about half the cost, but most units are left with an exam's worth only, so few probes and a
  transfer result much later.
- **C**: 5 per unit, flat: an honest exam only, no transfer check on most units.

*Recommendation: A.* The large families, where most answers are, keep about 90% of their photos and give enough probes
for a result within a few hundred answers per player. With today's few fish players, only a large gap (about 10
points) could show for some time (section 2, "How much data"). A smaller set would push even that further away.

**(b) Two kinds of photos never held out, from rule P1.**
- **A**: neither the reference photos (`rep`, about 2,100) nor Pierre's own photos (752).
- **B**: own photos excluded, reference photos eligible except covers and first photos.
- **C**: both eligible.

*Recommendation: A.* P1 puts reference photos first in every list and says his compatible photos are "never left out".
He has also seen his own. The cost: the set has 3.6% very easy photos against 8.5% in play, which the analyses match on.

**(c) Do probes count in progress like any answer?**
- **A**: yes. A probe moves the ability, the bar and the photo's rating like any question. A miss ends an exam in
  course and can take away a learned mark, as any miss does today.
- **B**: no. Logged, but moving nothing: a rules version, a replay branch, and a right answer that moves no bar.

*Recommendation: A.* A miss on a photo never seen anywhere is the most honest evidence there is, and the replay stays
as it is.

**(d) "At the start" of the transfer check.**
- **A**: silent probes in the quiz, from a unit's first questions on, like the exam's questions.
- **B**: a short visible check (about 10 never-seen photos) when a player starts the fish path, and again later (for
  example after 500 answers).
- **C**: both.

*Recommendation: A.* No test feel, no new screen, and probes measure every stage of every unit. B gives a clean
before-and-after for each player, but it is a new screen, and for a beginner a start check is mostly guesses.

**(e) Where the set is stored.**
- **A**: a separate `fish-held.json`. A held-out photo is absent from `fish-game.json`, so no game, old app copy or
  future reader can show it.
- **B**: a flag on the records in `fish-game.json`, which every reader must filter.

*Recommendation: A.* A held-out photo shown once is spoiled for that player for good, and A is the only way that
guarantees it. Its cost is about five readers that look a logged photo up by name and must read the second file
(section 3).

## Integrator's calls (easy to correct, stated, not asked)

- The systematic sample and its sort keys; the 3-point and 1-point tolerances.
- π = 0.1 as a starting point, set by the step 3 simulation.
- The exam's fallback to today's rule.
- The admin showing held-out photos marked, and the sensitivity row without the admin's accounts.
- The stop rule (20 players × 20 probes) and the matched contrast as the primary.
- Pierre's ★ covers excluded and the surprise-only species left out.
