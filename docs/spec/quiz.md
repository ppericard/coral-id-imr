# The quiz: formats, feedback and games (`quiz.js`)

What a question asks and how the app answers back: what each mode counts, typed questions, the feedback sheet after an
answer and its tally, the similar-names line, the glossary words, the custom quiz and the coral bonus genera. This is
the specification of what the code does now; why each part was decided is in the PRs and
[docs/decisions/](../decisions/README.md). Which unit and photo come next, the progress and the mastery exam are in
[model.md](model.md); the research behind them in [LEARNING.md](../LEARNING.md); the cards and prompts around a game in
[cards.md](cards.md); rule C3 (a short feedback) in [rules/content.md](../rules/content.md).

## What each mode counts

Every counted answer, whatever its game, goes through one recorder (`quiz.js` `recordAnswer`: the photo quiz's
`answer` and `live.js` `liveLog` call it), one scorer (`core.js` `scoreAnswer`), one log row, the sheet's
pass and the full replay (`core.js` `replayProgress`); the modes and suffixes logged: [sync.md](sync.md) "Mode". The
differences and their reasons (sources, and those left to fix: [the modes audit](../reviews/2026-11-19-modes-audit.md)):

- **Exam** (`|x`): silent, never in the custom quiz (rule L9).
- **Custom quiz** (`quiz|s`): no exam, opening, run or Sharp eye (below).
- **Duel tab** (`quiz-duel`): no run or Sharp eye; out of the admin's quiz success rate (`core.js` `playSplit`).
- **Typed** (`|t`): no guess rate, no time weight, never a comeback, an Again or a duel (below).
- **Find the X** (`|f`): scored as 4 choices, the photo tapped the unit given (rule L2).
- **Every format**: its own fitted offset (`core.js` `fmtOf`); no known-mix-ups term on 2 choices (`model.js`
  `confTerm`).
- **Live** (`live`): its own points, apart from the leaderboards. An answer on a unit the student has not unlocked is
  skipped (`live.js` `liveLog`); rule L4 lets it count without opening the unit: not built yet.
- **Surprise card** (`wink`): counts nowhere.
- **Not logged or scored**: the Tools (Lab prototypes, rule U13: Same or different? among them, below) and Memory.

## Typed questions

Free-text answers: `model.js` `TYPED`, `typedP`, `examTyped`; `quiz.js` `typeForm`, `typeBind`, `typeRead`,
`typeNames`, `typeMatch`, `TYPEDQ`; `core.js` `TYPE`, `typeDist`, `typeNorm`, `typeNamesOf`, `typeMatchIn`,
`typedShare`, `TYPED_RE`.

- **When.** In the photo quiz (`planPhoto`), a question on unit g is asked typed (a field, Check, I don't know; no
  suggestions, autocorrect and capitals off, no autofocus on touch screens, `enterkeyhint`) with the chance
  `typedShare(genScore(g), TYPED)`: none below `TYPED.from`, then a straight line between the points `TYPED.at`
  ([progress, share]), flat after the last; never a comeback question, an Again or a duel. **Every tunable number is in
  `TYPED`** (`from`, `at`, `exam`, and `k` = Infinity: no guess rate); its values are placeholders from the learnsim
  study, to be retuned.
- **Matching.** The answer is matched with a light spelling tolerance (1 edit up to 6 letters, 2 beyond; a swap of two
  letters is one) against every unit the app knows and their old names ("formerly X" in their own lines); a word that
  is no unit, or as close to two, is no answer (the player is asked to check the spelling).
- **Another rank or a common name.** On a question below the subject's rank (a fish scientific genus), a text that
  reads as another rank's name or a common name is told so instead of the spelling message (`core.js` `typeElse`,
  `quiz.js` `typeKind`, `typeKindMsg`, `app.js` `UNITS` fish `typeOther`: the scientific genus names of fish.json, never
  one, and the genera's, IMR tags' and species' common names): "“Anemonefish” is a common name: this question needs a
  genus's scientific name." / "“Damselfishes” is a family: this question needs a genus's scientific name.", the same
  whatever the photo's unit, never for a scientific name (`tests/typedrej.test.js`, `tests/fish.smoke.js`).
- **Fish names** ([FISH_PATH.md](../FISH_PATH.md) "Typed family names"): every name also in the other number (`core.js`
  `typeForms`); the names of the name index (`treeNameIndex`, passed by `app.js` `UNITS` fish `names`; "The name index"
  in [fish.md](fish.md)) read as the family they lift to; a name turned off reads as `{known}` (no unit, a line saying
  so; at a genus question, the common-name nudge); a name several units share, typed exactly, reads as `{shared}`
  (`quiz.js` `typeUnit`: right on any of them, else no unit given, so it is scored as a miss on the photo's unit only,
  its text logged in `ty`; `typeRead` says what else it names). The closest names decide, so a name typed exactly is
  never a slip of another.
- **Every text refused** (no unit, two as close, the nudge) goes with the answer finally given, in order (`typeBind`
  `rj`, `TYPEDQ_RJ` = 10, each cut to 40 characters; logged `rj`, the Answers tab's Rejected tries), in every game.
- **The spelling step** (`core.js` `typeVerdict`, `typeDiff`; `quiz.js` `typeBind` with `o.t`, `typeSpell`,
  `typeStep`): a name of the unit asked typed within the tolerance but not exactly (`'close'`) is a right answer, graded
  as such, but no answer yet: a warm nudge under the buttons, "✏️ So close! Right genus: just fix the spelling and try
  once more" (a small card in the warm `--warn` kind with its emoji medallion, `.tyform.retry .tymsg`, `.tymed`); the
  field keeps the text selected and the focus (a warm `--warn` edge); I don't know becomes Show me; one retype, whatever
  it reads as. The verdict stays one line (`fbBody` `step`): exact, the plain "✓ Yes, it's X"; still wrong or skipped,
  "✓ Yes, but not quite: it's spelled X" (`h3.tystep`: the words in normal weight, the name in bold), X the same link to
  the genus sheet with the letters the last try got wrong marked (`.tysp b`: the wrong colour and its underline; the
  field `.close`). The seconds logged are read when the retype is asked (the recognition's), and the hint button hides
  meanwhile. A close typo of another unit is a wrong answer (`'other'`). The mastery exam's typed questions and Tools ›
  Type the genus take the same step.
- **Logged** with the answer: `ty` (the raw text first typed, every typed answer) and `tr` (the step's outcome), the
  Answers tab's Typed and Retyped right columns; the mode `quiz|t` (`quiz|t|x` in the exam).
- **Scoring** (`answer`): k infinite, so the Elo expectation has no 1/k floor (the ability, the global level, the logged
  `e`, the opening hold); a right answer counts in full in the progress (`pgWeight`: every unit, look-alikes included,
  was a possible answer), a miss weighs what it proves (`pgMissW`); a unit typed by mistake counts against both units,
  as a wrong pick and as a mix-up (`s.conf`); "I don't know" is a miss for the unit shown only; no pair counts as
  offered.
- **In the mastery exam**: `TYPED.exam` typed right answers among its `EXAM.n` (`s.ex.t`; `examTyped`: typed while the
  typed answers still needed fill the questions left, else with the unit's usual share, so the format gives nothing
  away); an exam begun without its typed answers needs them first (its count held at `EXAM.n`).
- The Lab prototype `proto/type.js` (Tools › Type the genus) uses the same code. The admin's player journey shows a
  "Typed (recall)" row under Games.

## Same or different? (Lab prototype)

`proto/samediff.js`, Tools › Same or different? (`#tools/samediff`, rule U13: it stays in the Lab until Pierre's OK;
Pierre, 2026-11-18: «to build, most useful first»). Two photos, untimed; the player taps **Same** (1) or **Different**
(2). It runs on the subject on screen (rule S1) and counts nowhere: no answer, no log, no progress, no photo window
(`SEENQ`), no clock; the code never calls `question`, `answer` or the recorders (`tests/samediff.test.js` checks).

- **What is asked** (`sdPlan`, pure): the units are `unlocked()` (rule L4); the pairs are the subject's declared
  look-alikes, `UNITS[SUBJ.id].pairs()` (never the data's, `dataLooks`, nor the mimicry class's), both units unlocked and
  not named by one label (`choiceNames`, as the duels). A pair is drawn, then a coin: **Different** shows its two units
  (sides in a random order), **Same** shows two observations of one of them. A unit with no unlocked look-alike is never
  asked, so no unit is always "Same". None (a new player): the page says to meet a few units in the quiz.
- **The photos** (`sdPhotos`, pure; `photo` in the page): each from `photoSet(n, null, 0, 2, 'compare', keep)`, the draw's
  own choice aimed at the level, as a duel's (2 plausible choices); the closest view it shows (a close-up for a coral, the
  one photo of a fish). **One view on both sides** (a colony beside a close-up would give the answer away), and for Same
  **two observations** (rule P4's multi-photo case: `keep` leaves out the first one's `o`); the last 8 photos shown are left
  out while others fit. A side with nothing to match draws another plan (12 tries, then the "meet a few" note).
- **The screen**: the quiz's own stage, answers and feedback sheet (`.q.bleed.sdq`, `.qstage.qvs`, `.ans`, `#after`,
  `fitStage`), so it fits one screen in every state (rule U2): the photos stacked on a phone, side by side from the tablet
  class, the sheet at the bottom of a phone. Before the answer no name, source or tip shows and the enlarged view is blind
  (rule P5); after it each photo carries its unit's name and source. The one decisive line is the quiz's own `fbLine`
  (rule C3: the pair's sourced line, else the first ID tip), the tips of both units and the credits behind More, and the
  report button (`m: 'samediff'`, rule U14).

## The feedback sheet

After an answer, in every game, subject and format (4 choices, a duel, an Again, Find the X, a typed answer, "I don't
know"; `quiz.js` `fbBody`, `fbLine`, `pairText`, `pairLine`; styles `.fb.fbs`, `.fbline`, `.fbmore`, `.fbrow` in
`app.css`; [the feedback sheet study](../reviews/2026-11-18-feedback-sheet-study.md), rule C3):

- **The sheet** is the verdict (`--fs-xl`), the photo's species line (`taxonLine`, right under it), a typed answer's
  reading (`tyread`) and **one decisive line**, then one row, **More / Less and Next** (More a 44 px button naming the
  panel it opens, `aria-controls`, `aria-expanded`; Next never moves).
- **The More panel** (`#fbmore`, hidden until opened, in the same sheet) holds the rest, in this order: the ID tips box
  with its source label, "Similar names" (below), "Your answer would show" with Compare them, "This pair comes back as a
  duel" (counted as told once More is opened, `againLeft`, `againTold`), a coral genus's Coral ID Key criteria fold or a
  fish entry's IMR names and phases, the credits, ⚑ Report a problem (rule U14: one tap more). `fbMoreBind` toggles it
  (and runs `fitStage` again on phones and tablets, where the sheet is a bottom sheet over the stage). The mix-up
  montage keeps its ✓ / ✗ name chips and carries no notes.
- **The line** (`fbLine`, subject-neutral: it reads record fields, never a subject, rule S1): after a miss, the pair's
  line, both halves, the unit shown first ("Butterflyfish: no opercular spine · Angelfish: spine on the gill cover"),
  from `lk` (IMR's lines, with the editor's source `lksrc`) else `ap` (ours for the pairs IMR does not declare, with
  their sources); after a right answer, the same for the first look-alike among the choices whose line has a half on
  the unit shown (a one-sided line about the look-alike alone leaves the unit's first tip); else the shown unit's
  **first ID tip or mark**, said "X: …", its source small after it (`tipsLabel`, `qsrc`); with none (a fish species, a
  starred coral genus with no tips, a sea slug with no marks), nothing: the sheet is the verdict and the species line.
  Never a line made by comparing trait tags, and no line is made from a coral pair's source label (`lsrc` is a
  citation).
- **Our tell-apart lines** ([decision](../decisions/2026-11-18-tellapart-lines.md)) sit in `ap` / `apsrc`, never in
  `lk` (which the line labels "IMR"): the coral slate pairs' in `data.json` `ap` and `apsrc` on each slate record
  (Millepora's in `x.gen`), written by `tools/apply_coral_apart.py` from the hand-kept `tools/coral_apart.json` (its
  `none` holds the pairs left with the first tip, and why); the fish's in `fish.json` `apart` (the undeclared fish
  pairs, read by `app.js` `treeGenera`; never a look-alike: `look` and the draw do not read it); the sea slugs' declared
  genus pairs' in `tools/seaslug_cues.json` `apart` (`apartNone` the rest), laid by `tools/seaslug_cues.py` `apart_of`
  on `seaslug.json` genera `apart` and `apsrc` and read by `app.js` `treeGenera` as the genus's `ap` and `apsrc`. A side
  may be missing when no source gives the other unit's feature; each side names and describes its own unit.
- Tests: `tests/tellapart.test.js` (on the real files), `tests/booktext.test.js` (the coral `ap` lines too),
  `tests/fbsheet.test.js`; the smoke part `names` (`tests/pages.smoke.js` `namesCheck`).

**Similar names after a mix-up** ([the name study](../reviews/2026-11-05-name-confusion-study.md), its question b;
`quiz.js` `namesAlike`, `nameDice`, `namesDiff`, `namesLine`, in `fbBody`; `app.js` `unameIn`): after any mix-up of two
units (any format: 4 choices, a duel, an Again, a typed name read as another unit; every subject, on the names as
shown), when the two names share their first letter or have a bigram Dice of at least 0.4 (lower case, `#` at each end,
bigrams with repeats), the More panel's line under the tips reads "Similar names: X / Y", the photo's unit first, then
the answer, each set as `uname` sets it, with the letters between their common beginning and common ending in bold
(letters only, never a space or a sign; `.fb .ndiff b` in the text colour). Unit tests `tests/namesdiff.test.js`; the
smoke part `names` (`tests/pages.smoke.js` `namesCheck`).

**The More counter**: `quiz.js` `fbShown`, `fbMoreBind`, `fbEnd` and `sync.js` `fbTally` count into the visit's pages
summary (`core.js` `PAGES.FB`, `pagesFb`) four numbers, `fb: [shown, more, sec, link]`: the answers whose sheet was
shown, those where More was opened (once each), the seconds the sheet stayed on screen (each answer's capped at
`PAGES.FBSEC` = 120; counted when the page is left, `app.js` `route`, and when a summary is taken, `pagesSend`; the time
the app is hidden never counts) and the taps on a link of the app inside it (the genus sheet, Compare them). Counts
only, riding the `pages` event already sent (no new event, tab or column; `pagesClean` keeps four clamped integers in
Detail); no gate (rule D4): a script without it drops the field. Unit tests `tests/pages.test.js`. The pages summary:
[sync.md › Events and pages](sync.md#events-and-pages).

## Glossary words

`app.js` `GLOSS_PAT`, `gloss`, `glossAll`, `termDef`, `showGloss`: a glossary term in a text is underlined (dotted) and
opens its definition on a tap (or focus + Enter): the plain-words sentence (`terms[i][3]`) first, then the sourced
definition and its source, then a link into Coral basics ([basics.md](basics.md#coral-basics-protobasicsjs)).

- Glossed: the ID tips and lecture notes everywhere (`tipsList`, `notesList`), the Genera cards (`card`), the
  wrong-answer line of the quiz ("Your answer, X, would show: ..."), and in the Coral ID Key the tips, the Coral ID Key
  criteria (the Coral Finder book's features), the next-clue questions and the box / clue buttons (inside a button the
  word is tappable but no focus stop of its own, `gloss(text, seen, true)`; a tap opens the definition, not the box).
- Each term is underlined once per text block, at its first occurrence (`seen`; `glossAll` makes one list one block),
  and the longer pattern wins where two start ("axial corallite", "hooded corallites" over "corallite").
- Corallite and Polyp are glossed too, and the terms of `tools/apply_plain_terms.py` `MORE`; "septal teeth" opens Septa.
- The first starter card says once "Tap an underlined word to see what it means" (`quiz.js` `introShow`, on the first
  card whose tips hold a term).
- The lecture group titles on Genera are `.gtitle`, never the glossary's class `.gt`, so they do not look tappable.
- Tests: `tests/gloss.test.js`.

## Custom quiz

The Quiz on the units the player picks (`model.js` `CUSTOM`, `customOf`, `customDraw`, `customChoices`; `quiz.js`
`quizCustom`, `viewCustom`, `CUSTOM_H`, `photoQuiz`, `modeBase`, `cbIn`; LEARNING.md "Custom quiz").

**The selection screen** (`#practice/custom`): every unit in play (the slate, and the bonus genera when on: `pool()`) as
a small photo with its name, in three views (a switch, `reefid-custom-view2`, this device; the older key
`reefid-custom-view` is dropped once): IMR groups by default (the lecture's groups, in IMR order, All / None per group),
My mix-ups (the player's own confusions in clusters, most confused first, with their counts: `model.js` `mixEdges`,
`mixClusters`; the declared look-alikes, `lookEdges`, before any mix-up, with a line saying so) and Progress (To
review, Learning, Not seen yet, Learned); never A–Z or by growth form. A search box, quick picks that replace the
selection (My weakest, Recently missed, Look-alikes of …), Clear all, the count with the units picked named under it,
and Start (at least `CUSTOM.MIN` = 2). The selection is saved at each change in `reefid-sync-coral-custom` = `{g, t}` (a
`reefid-sync` key: it travels with the progress, `sync.js` `mergeSaved` takes another device's when newer, sign-out
clears it) and preselected next time.

**The quiz** (`#practice/custom/play`; without a valid selection it goes back to the selection screen): `quizPhoto(cur)`
/ `planPhoto(cur)` with the selection, the same question screen. `planPhoto('quiz-custom|play')` draws the unit among
the selection with the usual `weight()` and no opening path (no first cards, no opening chance, `openChance`, no hold,
no visit floor; a unit not met yet is asked with its card, `introShow(L, true, 'c', false)`: ready at once, no Open all
box), and the wrong choices from the selection first (`distractors` on it), topped up from the other units in play only
under 4; the unit a photo of the mimicry class resembles is its trap only when selected ([model.md](model.md)). Again
(its selected unit), duels slipped in (pairs of the selection), typed questions, calibration and the comeback (only
with 2 or more selected units answered right, else left to the photo quiz: `cbIn`) work as in the photo quiz; the offers
about the units in play (Open all, the back card, the bonus genera) are not made there. No mastery exam question there
(rule L9: the selection may hold no look-alike), and a question is scored with the look-alikes its choices really hold
(fewer than 2: `plausibleK`, as the photo quiz scores easy choices). Planned questions are keyed on the selection too
(`planPool`). Every answer is a photo-quiz answer (the progress, the Elo, the hold, the achievements but the runs and
Sharp eye, the sheet), logged `quiz|s` first (`quiz|s|d|k2`, `quiz|s|k3`, `quiz|s|t`), which the sheet
stores and rates as a photo-quiz answer (`guess_` reads `|kN` at the end and `|t` anywhere; the mode split `quiz`). The
admin: Activity's Recent sessions count it as **custom**, the player journey has a "Custom quiz (genera picked)" row
under Games and the sessions with it in "When they played". Its reminder of the units waiting in the Quiz:
[cards.md](cards.md#the-custom-quizs-reminder-of-the-units-waiting-in-the-quiz).

## Bonus genera

Coral genera off the IMR list but common at Dauin, an opt-in set (`BONUS` in `core.js`; `isBonus()`, `bonusList()`,
`bonusSet()` in `app.js`; `bonusOfferDue()` / `bonusOfferShow()` in `quiz.js`). The opt-in machinery is generic
(`app.js` `UNITS` sets, `SETS()`): the fish's scientific genera are the same kind of set.

- **Which.** Isopora, Leptoseris, Heliopora, Sandalolitha and Pleuractis: extra Dauin genera (`DATA.x.gen`) with 4
  or more Research Grade iNaturalist observations within 40 km of Dauin and a slate look-alike named by the Coral
  Finder (`look` / `lsrc`), or not a hard coral (Heliopora). Millepora is a slate genus, not a bonus one (`BENTHIC`:
  [front-end.md](front-end.md#shared-helpers-appjs)).
- **The offer**, once, when every slate genus has been asked at least once (`asked`; met alone is not enough: a player
  who taps Open all would otherwise get it a question later), by a card over the question (a prompt like the others,
  `promptOk`): "5 more genera?", "Not on the IMR coral list, but common at Dauin: you may meet them on dives and in
  ReefCloud photos.", **Add them** / **Not now**.
- **The choice** is `Q.bon` in `reefid-sync-coral-quiz` (synced with the quiz settings; `Q.bonT`, when it was made, so
  the latest choice wins across devices in `sync.js` `mergeSaved`, and a newer progress reset from another device clears
  it; `mergeUsers` keeps it on if either account had it on). ⚙ **Bonus genera On / Off** changes it any time (Off takes
  them out of the draw; their `P[n]` stays). Players whose bonus genera were unlocked by the former progress thresholds
  (`Q.bu` 2 or more) start with it on; a progress reset clears it (the offer comes again).
- **Once on**, they join the genera not met yet and open like slate genera (`openPick()`, `openChance()`, `OPEN`: the
  easiest first, the shaky slope, the opening hold), each on its first-meeting card (kicker "Bonus genus", "Not on the
  IMR list, but common at Dauin."); no threshold, no weight cap. They are choices and distractors like slate genera
  (`distractors()` matches look-alikes both ways), duel with their slate look-alike (`duelPick`), have their own `P[n]`
  (synced), count as "wrongly given" (rule L2), and never count in the progress (`progPct`, the slate tiles, the sync
  summary).
- **Where they show.** My progress shows them after the slate genera in all three views once on (the photo wall: tiles
  tagged "Bonus"; Slate: a strip under the slate; Groups: a "+" row). Their ID tips are labelled "ID tips (Coral Finder
  p. …)", never IMR. `#learn/compare/A/B` accepts them (`gameGenus()`). A two-level bonus genus counts its `medium`
  photos as close-ups in games (Sandalolitha). Their game photos (Millepora's too): Research Grade only (`p.gid` = not
  Research Grade, set by `tools/apply_bonus.py`), Pierre's own always, never multi-coral. Memory (Lab `pairs`) does not
  use them.
