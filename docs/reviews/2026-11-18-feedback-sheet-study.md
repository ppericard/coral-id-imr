# Feedback sheet study: a short sheet by default (2026-11-18)

Status: study, docs only. No app code, data file, photo or account was changed. **Answered by Pierre, 2026-11-18 (~12:08
Manila): "ok pour les 6 recommandations"**: questions (a)-(f) in section 6 are decided as recommended (layout A; the
look-alike cue after a right answer; the first tip when no pair line, never a line made from trait tags; the coral and
sea-slug lines written, corals first; rule C3's new wording; the More counter shipped with the short sheet).

Why it exists. Pierre, 2026-11-18, 10:42 Manila: "J'avoue que j'ai toujours trouvé la feuille d'explication trop chargée
et illisible. Perso je ne la lit jamais parce que ya trop de trucs et c'est pas hyper lisible." He approved ("oui") a
study of a **short feedback sheet by default**, for every question type and every subject (corals, fish, sea slugs),
built as one shared mechanism: (1) the verdict, large and clear; (2) **one useful line**: the decisive criterion between
the right answer and the player's answer, or, when right, the one cue that confirms it (the "decisive criterion"
feedback of an old study, ROADMAP "Parked"); (3) on a miss, the two photos side by side, more compact; (4) More for the
rest, and Next always in the same place.

Labels (rule W11): **[measured]** = measured by a script on `main` @6fe951a3 (the real app served from `127.0.0.1` in
Chromium, or a count over the data files), or counted on the sync sheet's Answers tab (read-only; aggregates only; the
players' names were read in memory only to put each player's answers in order, never kept or written); **[read]** =
read in a file or a doc; **[guess]** = my judgement.

## Summary

- **Today's sheet takes 40-62% of a phone's usable height after a miss, and its most useful line is the one players
  do not see.** At 360 × 724 a wrong answer's sheet is 295-433 px (median 361) of 724; at 390 × 664 it hits its cap
  (62vh, 412 px) for the fish and scrolls in 13 of the 21 family mix-ups. The fish's "Tell them apart (IMR)" line, the
  only decisive line the app shows today, sits **below the fold** in those cases. The mix-up montage is squeezed to its
  180 px floor and the sheet then **covers its bottom** (up to 71 px of 180 at 390 × 664) [measured, section 1].
- **Players do not stop on it.** From the answer log, the time between an answer and the next question's clock is a
  median **0.9 s after a right answer** (corals and fish; 82-83% under 3 s) and **about 3 s after a miss** (half under
  3 s; 16% of misses get 10 s or more). This is an upper bound: it includes the tap on Next and the next photo's loading
  [measured, section 2]. Pierre's "je ne la lis jamais" holds for the players too.
- **What it holds:** up to 11 items: the verdict, "This photo: …", the tips box (ID tips and mnemonic), "Similar names",
  "Your answer, X, would show: …" and Compare them, "Tell them apart" (fish), "This pair comes back as a duel", a fold
  (Coral ID Key criteria, or More), Report a problem, Next. A miss reads 34-96 words (median 49 corals, 75 fish, 35
  sea slugs) [measured].
- **Next already stays in one place** on every phone and on desktop, whatever the state [measured]. Keep that.
- **Analytics: nothing logs a fold opened**; the log gives the time on the feedback only as the gap above. Proposed: four
  numbers added to the pages summary (section 2).
- **Three layouts mocked up inside the real app** on real questions, Find the X included (section 3). **Recommended: A,
  the short bottom sheet** (the verdict, the photo's species line, one line, then More and Next on one row): 143-276 px
  instead of 241-449 px on a 360 px phone; the mix-up photos go from 162 × 180 to 162 × 370-413 px, and Find the X keeps
  its four tiles at full size [measured].
- **The decisive line exists for a minority of pairs** (section 4): corals 38 of 84 declared pairs (19 of the 59 slate
  pairs); fish all 11 declared family pairs, plus 4 undeclared pairs whose line is on the family sheets only; sea slugs 0
  of 9. Weighted by the real misses in the Answers tab: **29% of coral misses and 51% of fish-family misses** would get
  a pair line [measured]. Where none exists, the fallback is the right unit's first ID tip, which is often not decisive (a
  Damselfish's first IMR cue is "Small to medium size") [measured]: the gaps want written lines (question (d)).
- **Effort** (measured on comparable merged PRs, section 5): the short sheet like #861, #957, #1047, #1060, #1075
  (median 3.2 h); the line chooser like #820, #822, #828, #873, #958 (median 29 min); the counter like #812, #835, #938,
  #958, #1051 (median 45 min); the coral lines like #868, #869, #925, #972, #1070 (median 41 min); the sea-slug lines
  like #868, #869, #894, #972, #1011 (median 17 min).

## 1. Today's sheet, measured

### How it was measured

- **Rule D1 from the very first run.** Every Playwright context routed every request before its first page was opened:
  the local server passed, the photos' R2 host was answered from a local cache (filled once with curl through the
  proxy), everything else aborted; the browser mapped `script.google.com`, `script.googleusercontent.com` and
  `*.googleusercontent.com` to `127.0.0.1`; service workers blocked; every host logged. The app tried its 3 anonymous
  reads to the sync script at each load (`?stats=1`, `?board=1`, `?achs=1`, as the multi-photo study found): **every
  attempt (about 250 over the runs) was aborted inside the browser**; none reached Google [measured]. Signed out,
  made-up state only (rule D2).
- **The harness** (kept outside the repo, in the session's scratchpad): the worktree served from `127.0.0.1`, phones
  with `isMobile` and `hasTouch` (rule U4), `deviceScaleFactor` 2, light and dark.
- **Distributions**: after one real answer (so the page is in its answered layout), the real `fbBody` was rendered into
  `#after` for **every unit** of each subject (right; "I don't know") and **every look-alike of every unit** (wrong: the
  unit's `look` as the running app has it, 99 coral, 21 fish, 304 sea-slug cases), at each size; `fitStage` re-ran each
  time. Measured: the sheet's visible height and its content (`scrollHeight`), the feedback box itself, the photo stage,
  Next's position, the words, each item's height.
- **Forced questions**: a question on a chosen unit with chosen choices, built with the app's own `photoSet` and
  `question`, answered by a tap, so `answer()`, the montage and `fitStage` are the app's. States: right, wrong (a
  look-alike), typed ("I don't know"), duel (a look-alike pair, wrong), and Find the X (fish, wrong tile). Same photos
  for every layout (a seeded draw).
- Usable sizes: **360 × 724, 390 × 664, 414 × 715** (the viewport; the header, 49 px, and the tab bar, 59 px, are inside
  it), and **desktop 1280 × 800**.

### Height of the sheet

Phones: the bottom sheet's visible height, CSS px, min / median / max over every case; "scrolls" = cases where its
content is taller (the sheet is capped at `max-height: 62vh`). Desktop: the feedback box in the side column, under the
four choices (the column part itself stretches to the column's height, 403-443 px, whatever it holds) [measured].

| Subject | State | 360 × 724 | 390 × 664 | 414 × 715 | Desktop 1280 × 800, feedback box |
|---|---|---|---|---|---|
| Corals (40 units) | right / "I don't know" | 241 / 269 / 316 | 241 / 269 / 316 | 226 / 269 / 316 | 196 / 241 / 307 |
| | wrong (99) | 295 / 361 / 433 | 295 / 343 / 412 | 290 / 343 / 414 | 262 / 330 / 424 |
| Fish (65 families) | right | 261 / 344 / 438 | 261 / 327 / 412, scrolls 1 | 261 / 319 / 395 | 232 / 336 / 446 |
| | wrong (21) | 386 / 449 / 449, **scrolls 11** | 386 / 412 / 412, **scrolls 13** | 366 / 421 / 443, **scrolls 8** | 398 / 456 / 571 |
| Sea slugs (78 genera) | right | 205 / 234 / 332 | 205 / 228 / 332 | 205 / 228 / 308 | 155 / 202 / 303 |
| | wrong (304) | 234 / 297 / 449 | 234 / 284 / 412, scrolls 1 | 234 / 276 / 385 | 183 / 271 / 420 |

The forced questions, one case each (phones: the sheet, and the photo slot left above it; desktop: the feedback box)
[measured]:

| Subject, state | 360 × 724 | 390 × 664 | 414 × 715 | 1280 × 800 |
|---|---|---|---|---|
| Corals right (*Stylophora*) | 294; photo 282 × 279 | 294; 308 × 219 | 294; 329 × 270 | 261 |
| Corals wrong (*Stylophora* taken for *Pocillopora*) | 420; montage 162 × 180 | 412 (capped); 177 × 180, **71 px of it under the sheet** | 420; 189 × 180 | 387 |
| Corals typed, "I don't know" (*Favites*) | 316; 328 × 257 | 316; 358 × 197 | 316; 382 × 248 | 287 |
| Corals duel (*Favites* / *Goniastrea*) | 385; 162 × 188 | 385; 177 × 180 | 385; 189 × 180 | 356 |
| Fish right (Butterflyfishes) | 375; 328 × 230 | 375; 358 × 180 | 375; 382 × 221 | 386 |
| Fish wrong (Butterflyfishes taken for Angelfishes) | 449, content 511; 162 × 180 | 412, content 511; 177 × 180 | 443, content 467; 189 × 180 | 580 |
| Fish Find the X (the Angelfishes tile tapped) | 449, content 551; tiles about 86 px | 412, content 531 | 443, content 488 | 600 |
| Fish typed / duel | 339 / 449 | 296 / 393 | 296 / 393 | 310 / 468 |
| Sea slugs right (*Hypselodoris*) | 308; 328 × 297 | 308; 358 × 237 | 308; 382 × 288 | 279 |
| Sea slugs wrong (*Hypselodoris* taken for *Goniobranchus*) | 446; 162 × 180 | 405; 177 × 180 | 405; 189 × 191 | 417 |
| Sea slugs typed / duel | 308 / 397 | 308 / 377 | 308 / 377 | 340 / 388 |

- **On a miss the photos lose most.** The stage drops to its 180 px floor on every miss at every phone size (a right
  answer leaves 180-297 px), and at 390 × 664 the sheet's top (194 px from the top) is above the stage's bottom (265): 71 of the
  montage's 180 px are under the sheet for the corals, 39 for the fish, 32 for the sea slugs [measured]. The montage's
  notes "The photo shown" / "Your answer, same view" are cut in half (screenshots `today-*-wrong-*`).
- **Find the X** keeps its four tiles but they shrink to about 86 px and the bottom row is half hidden, names cut
  ("Butt…", "Ange…"), as the multi-photo study found (screenshot `today-fish-findx-p360-light`).
- **Next never moves**: 621-660 px at 360 × 724, 561-600 at 390 × 664, 612-651 at 414 × 715, 741-784 on desktop, in
  every case and state [measured].
- **Desktop fits but is crowded**: the box sits under the four choices; on the coral and fish misses its end (the fold,
  Report a problem) scrolls under the pinned Next (screenshot `today-coral-wrong-d1280-light`).
- Rule U2 (one screen in every state) holds today only by squeezing the photo to 180 px and scrolling the sheet.

### What it holds, item by item

Heights at 360 × 724, median / max over the cases where the item appears [measured; read: `quiz.js` `fbBody`,
`answer`].

| # | Item | Where | Height | When |
|---|---|---|---|---|
| 1 | Verdict "✓ Yes, it's X" / "✗ No, it's X" / "No worries, it's X" (typed "I don't know"), with the unit's link, family line (fish, sea slugs), bonus or ★ tag | sheet | 23 / 46 | always |
| 2 | "This photo: common name · scientific name" (`taxonLine`; Pierre, 2026-11-07 and 11-09) | sheet | 20 / 61 | fish always; corals 17 of 40 genera; sea slugs 64 of 78 |
| 3 | How a typed answer was read (`tyread`) | sheet | one line | typed, when read loosely |
| 4 | **Tips box**: ID tips (IMR) or ID marks, the mnemonic (label hidden on phones) | sheet | corals 101 / 149, fish 140 / 207, sea slugs 40 / 120 | when the unit has tips |
| 5 | "Similar names: Styloph*ora* / Pocillop*ora*" (`namesLine`) | sheet | 20 | 33 of 99 coral, 12 of 21 fish, 62 of 304 sea-slug misses |
| 6 | "Your answer, X, would show: …" + Compare them (corals) | sheet | 41-102 / 142 | every miss |
| 7 | **"Tell them apart (IMR): …"** | sheet, after 6 | in item 6's height | fish families only, on the 11 declared pairs |
| 8 | "This pair comes back as a duel in a moment." | sheet | 20 | the first 3 mix-ups of a device (`againTold`) |
| 9 | Fold: "Coral ID Key criteria" (summary, criteria, Coral Finder pages, photo credits) or "More" (IMR names inside, phases, credits) | sheet | 28 closed | always |
| 10 | ⚑ Report a problem (rule U14) | sheet | 17 | always |
| 11 | Next ↵ | sheet, sticky | 39 | always |
| — | Montage: the photo shown and the answer's photo in the same view, ✓ / ✗ name chips, two notes, credits, zoom | stage | 180 px tall | a miss with a photo of the answer in that view |

Words read on the sheet, median / max: corals right 27 / 41, wrong 49 / 75; fish right 45 / 77, wrong 75 / 96; sea
slugs right 21 / 45, wrong 35 / 76 [measured].

## 2. Analytics: does anyone read it?

**Nothing logs a fold opened** [read: `quiz.js` `answer` (the fold's `ontoggle` only calls `fitStage`), `sync.js` `ev`,
`core.js` `pagesClean`, `Code.gs` `EVK`]. The answer log's Seconds column (`rt`) is the time to answer, from the
question's clock (`qclockArm`: started when its first photo is in) to the tap.

What exists:

- **The time on the feedback, from the log.** The sheet stores each answer's time as a full date-time (`Code.gs`
  `logAnswers_`: `new Date(a.t)`), so for two answers in a row of one player, the next answer's time minus its Seconds
  minus this answer's time is the feedback's time on screen plus the tap on Next, the next photo's loading and any card at
  Next: an upper bound. Answers tab, 6,207 answers of 16 players since 2026-11-01, gaps of 0-300 s [measured]:

  | After | Answers | Median | Middle half | Under 3 s | 10 s or more |
  |---|---|---|---|---|---|
  | Corals, right (photo quiz) | 2,212 | 0.9 s | 0.6-1.8 s | 82% | |
  | Fish, right | 2,312 | 0.9 s | 0.6-2.0 s | 83% | |
  | Corals, wrong | 497 | 3.2 s | 1.7-6.8 s | 47% | |
  | Fish, wrong | 320 | 2.9 s | 1.6-5.8 s | 52% | |
  | Duels (corals) | 173 | 0.9-1.1 s | | 96-100% | |

  Duels left out, 6% of the gaps after a right answer and 16% after a miss are 10 s or more. Each
  player's own median (players with 10 gaps or more): 0.5-3.8 s after a right answer (13 players), 1.7-5.1 s after a
  miss (10 players) [measured]. A sheet of 34-96 words is not read in 3 s.
- **Genus sheets opened from a quiz answer**: the pages summary (Pages tab) counts each genus sheet opened with how it
  was reached (`from: 'quiz'`), and the comparison page's openings by name [read: `sync.js` `pagesRoute`, `core.js`
  `PAGES.FROM`]. Corals only (the fish and sea-slug feedback has no sheet link).

**Proposed: four numbers in the pages summary** (one tally a visit, already sent when the app is left, already filed
under the player's anonymous id, so no new event kind, no new tab, no per-answer row):

`fb: [shown, more, sec, link]`: answers whose feedback was shown, those where More was opened, the seconds the feedback
stayed on screen (each answer's capped at 120 s), and the taps on a link inside it (sheet, Compare them). Split by right
/ wrong if wanted (8 numbers). `shown` is the denominator.

- Cost: `quiz.js` counts (the More toggle, the time from the sheet's draw to Next); `core.js` `pagesTake` adds the
  tally and `pagesClean` keeps it (clamped integers), copied into `Code.gs` (rule D3: one changes file; nothing to
  gate, rule D4: an older script drops the field, as it drops any field it does not know); `privacy.html` says it in
  one line in its pages paragraph ("how often you open More after an answer, and how long the answer stays on screen").
  With a unit test; its effort is in section 5.
- The Events tab is the wrong place: an event kind needs `EVK` in `Code.gs`, and `ev` keeps one event per key and at
  most 15 a visit (`EV_MAX`), so a counter per answer would be cut [read: `sync.js` `ev`].
- What it answers that the log cannot: whether More is opened at all, right and wrong, once the short sheet is live;
  the gap above then becomes a check of the short sheet (a miss's gap should not fall further).

## 3. Three layouts, mocked up on real questions

Built inside the real app: the real question, `answer()`, montage, `fitStage` and Next; only `fbBody` was replaced (the
rest of today's output moved behind More) and one style tag added, with the app's tokens. Phone 360 × 724 and desktop
1280 × 800, light and dark. For each subject: right, wrong with a pair line, wrong with no pair line; for the fish, Find
the X too.

The questions: corals *Stylophora* (taken for *Pocillopora*; with no line: *Porites* taken for *Astreopora*); fish
Butterflyfishes (taken for Angelfishes; with no line: Damselfishes taken for Cardinalfishes; Find the X on
Butterflyfishes, the Angelfishes tile tapped); sea slugs *Hypselodoris* (taken for *Goniobranchus*; with no line:
*Coryphellina* taken for *Caloria*).

In all three: the verdict at `--fs-xl`; under it what Pierre asked for after every answer (the photo's species line,
`taxonLine`) and a typed answer's reading (`tyread`), kept outside More; then one line, its source small after it (rule
C2); More / Less and Next on **one row**, Next where it is today, More a 44 px target; the montage keeps its ✓ / ✗ name
chips on the photos and drops its two notes.

| Layout | What it is | Sheet at 360 × 724 | Photos at 360 × 724 | Desktop feedback box | Next |
|---|---|---|---|---|---|
| today | section 1 | 241-449 (content up to 560) | mix-up 162 × 180; Find the X tiles about 86 | 155-600 | 621-660 |
| **A. Short sheet** (recommended) | Today's bottom sheet, cut to the verdict, the species line, the line, More / Next. More unfolds today's content in the same sheet (up to 62vh; Next and Less stay pinned) | **143-276** (corals 160-164, fish 212-276, sea slugs 143-234) | mix-up **162 × 370-413**; with no line 162 × 393-462; Find the X tiles **160 × 160** | **103-240** | 616-660 |
| B. Choices stay | No sheet over the choices: they stay, coloured (✓ right, ✗ yours); the verdict, the lines and More / Next under them. Desktop: as A (the column already keeps the choices) | 125-233, plus the choices (about 100 px) | mix-up 162 × 255-314 | as A | 605-649 |
| C. Verdict on the photo | The verdict, the species line and the line on a dark band over the bottom of the photos; the bar holds only More / Next | 69 (the bar) | mix-up 162 × 504-536 | the band on the photos | 616-660 |

[measured]

Read on the screenshots [my reading]:

- **A** is the one mechanism for every state and subject, closest to today (one bottom sheet, one fold), and leaves the
  mix-up photos about 2.1-2.3 times taller. Find the X keeps its tiles at the size it had before the answer, which
  settles the multi-photo study's finding on the answered state. The sheet reads 7-30 words in place of 34-96.
- **B** shows what was offered, which explains a mix-up a little better, but costs about a third of A's photo gain on
  phones and changes nothing on desktop.
- **C** gives the photos everything, but writes on them: the band covers the bottom fifth of the photos, the text's
  contrast depends on a scrim, and the dark-theme red verdict on the band is weak. The verdict is far from the thumb.
- With **More open** (A), today's content is all there, in today's order, under the line (`A-*-wrong-more-*`).
- The **"no line" case** shows the limit: the first ID tip is not chosen to be decisive (Damselfishes: "Small to medium
  size"; *Porites*: "Small corallites, shared walls"), and a sea slug with no marks gets the verdict and its species
  line alone (*Coryphellina*).

Rules the short sheet touches:

- **C3** says the ID tip is shown in the quiz feedback; behind More it is one tap away. C3's wording changes, which goes
  to Pierre (question (e)).
- **U14**: Report a problem moves behind More (one tap after the answer, still from every game). Integrator's call; a ⚑
  icon on the row is the alternative.
- **P5**: the credits stay on the photo after the answer (today's chip) and behind More.
- **S1**: the line comes from a record field (the unit's `lk`, section 4) and the unit's own tips, never from a test on
  the subject.
- **U11** unchanged (cards still at Next). The quiz's help text (`quiz.js` `gameHelp`: "After answering you get the IMR
  ID tips and why the other … are wrong") changes with it.
- **U2** is better met: the photos keep a real size in every answered state; the multi-photo study (branch
  `claude/multi-photo-study`) asks for the same short sheet for its formats.

## 4. The decisive line: what we have, per subject

Counted on `data.json`, `fish.json` and `seaslug.json` at 6fe951a3. `curation.json` holds no pair or line edit today (no
structure or content overlay for any subject) [read], so these files are the pairs the app plays; the running app's
`look` lists gave the same cases (section 1) [measured]. The coral source lines were read one by one [my reading of
each].

### Corals: 84 declared pairs

The coral pairs carry a **source label** (`lsrc`: "Coral Finder p. 32: Goniastrea neater than Favites", "Same Coral
Finder box: …"), not a feedback line; some state the difference, some only name the pair. The IMR lecture notes
(`gen.imr`, the instructor's notes) state the difference for a few more.

| Pairs | Contrast stated (source line or IMR note) | Named only ("can be confused for", "see also") | Same Coral Finder box or IMR group only | Total |
|---|---|---|---|---|
| Slate (39 + *Millepora*) | **19** (13 source lines, 6 from IMR notes: *Leptoria* / *Platygyra*, *Alveopora* / *Goniopora*, *Dipsastraea* / *Favites*, *Astrea* / *Dipsastraea*, *Duncanopsammia* / *Turbinaria*, *Goniastrea* / *Leptoria*) | 4 (*Montipora* / *Porites*, *Goniopora* / *Porites*, *Astrea* / *Favites*, *Millepora* / *Porites*) | 36 | 59 |
| With a bonus genus | 19 (+1 partial: *Halomitra* / *Podabacia*) | 5 | 0 | 25 |

The **gaps that matter most** are the slate's 36 same-box pairs and 4 named ones. Among the coral pairs players mix up
most (Answers tab, 626 coral-to-coral misses since 2026-11-01), the top ones with no line: *Echinopora* / *Turbinaria*
(21, not even declared), *Astrea* / *Favites* (16), *Ctenactis* / *Herpolitha* (16), *Ctenactis* / *Lobactis* (13),
*Halomitra* / *Lobactis* (13, not declared), *Pavona* / *Pectinia* (13, not declared), *Alveopora* / *Tubastraea* (13,
not declared), *Tubastraea* / *Turbinaria* (12) [measured].

### Fish: 11 declared family pairs, all with a line, and 4 more on the sheets

- The 11 declared look-alike pairs (`look`) all carry IMR's own line for each side ("Angelfish: spine on the gill
  cover, iridescent blue" / "Butterflyfish: no opercular spine, no iridescent blue"). The feedback shows one side today.
- 4 undeclared pairs have a sourced line on the family sheets only (`apart`, from the families' sources: Moorish Idol /
  Surgeonfishes, Surgeonfishes / Rabbitfishes, Snappers / Fusiliers, Boxfishes / Puffers): `fbBody` does not read them
  [read: `quiz.js` `fbBody`, `learn.js` `viewFishSheet`].
- The fish **genus units** (circle 1, 130) and **species units** have no pair line (`lk: []`); 83 of the 130 genera
  have ID marks, the species none (their feedback line is their scientific and other names) [measured].

### Sea slugs: 9 declared genus pairs, no line

The genus pairs' `lsrc` are citations (which species a source shows together), not distinguishing lines; 22 more pairs
come from iNaturalist identifications only (`dlook`). The fallback, ID marks, exists for 19 of 78 genera (18 of the 24
in circle 1, 1 of 22 in circle 2, none in circle 3) [measured].

### Weighted by the real misses

Answers tab, read-only, columns Genus shown / Answered / Right / Mode (6,207 answers since 2026-11-01; no sea-slug
answer yet). A two-choice question (Again after a mix-up, a duel) asks a pair already confused or declared, so it is
counted apart [measured]:

| Subject | Misses between two units of one rank | On a declared pair | With a pair line |
|---|---|---|---|
| Corals, all | 626 | 333 (53%) | **182 (29%)** |
| Corals, 4-choice and typed only | 352 | 194 (55%) | 94 (27%) |
| Fish families, all | 302 | 136 (45%: the line shown today) | **154 (51%)** with the 4 `apart` pairs wired |
| Fish families, 4-choice and typed only | 194 | 80 (41%) | 94 (48%) |
| Fish genera | 35 | 0 | 0 |

So declared pairs are the wrong denominator on their own: about half the misses are between units no source pairs.

### Where the line comes from, per subject, and when there is none

One rule for every subject (rule S1), from record fields:

1. **A miss**: the pair's line for (shown, answered): the unit's `lk` (fish today; corals and sea slugs once filled),
   both halves when each side has one ("Butterflyfish: no opercular spine, no iridescent blue · Angelfish: spine on the
   gill cover, iridescent blue"), with its source.
2. **A right answer**: the line for the shown unit against a look-alike among the choices (what the player just told
   apart), else its first ID tip or mark.
3. **No pair line**: the shown unit's first ID tip (IMR) or ID mark, said as "X: …". **None** (a sea slug with no marks,
   a fish species): the verdict and the species line; More holds the rest.

A line made by comparing the Coral Finder trait tags (`tr`: corallite size, walls, features) would cover 29 of the 36
same-box slate pairs, but it is machine-made contrast (rule C2), and a missing tag is not an absent feature: not
recommended (question (c)).

## 5. Effort, in agent time

Measured, not guessed: `python3 tools/effort.py --estimate TYPE SIZE` (the effort tool, 2026-11-18) gives the agent time
of comparable merged PRs, from the branch's first commit to green checks (Codex rounds and their fixes inside it). Each
row: the type and size band the work would have, then the tool's line to cite.

| Work | Type, size | Comparable PRs (median, range) |
|---|---|---|
| The short sheet (layout A): `fbBody` split into verdict, species line, line and More; the row; CSS for the 3 size classes; every state (right, wrong, typed, duel, Again, Find the X, wink); the montage's notes dropped; help text; DESIGN / ARCHITECTURE; the smokes that read the feedback (pages, draw, fish, sea slugs) | engine+feature, L | comparable to #861, #957, #1047, #1060, #1075: median 3.2 h (range 2.9 h-8.9 h) |
| The line chooser, subject-neutral (`lk` read for every subject, both halves, the right-answer rule, the fallback), with unit tests; the fish `apart` lines into `lk` | engine+feature, M | comparable to #820, #822, #828, #873, #958: median 29 min (range 29 min-1.6 h); #828 (the species line under the verdict) and #873 (similar names after a mix-up) are feedback PRs |
| The More counter in the pages summary (`quiz.js`, `core.js`, `Code.gs` changes file, `privacy.html`, a test) | sheet+engine, S | comparable to #812, #835, #938, #958, #1051: median 45 min (range 29 min-58 min) |
| Corals: a written, sourced line for the 40 slate pairs without one, in our own words (IMR notes first, then the Coral Finder pages; `tests/booktext.test.js` keeps book text out), Pierre's review in the admin | content+tooling, M | comparable to #868, #869, #925, #972, #1070: median 41 min (range 17 min-68 min) |
| Sea slugs: a line for the 9 declared pairs (the sources already gathered for their cues) | content+tooling, S | comparable to #868, #869, #894, #972, #1011: median 17 min (range 13 min-33 min) |
| Optional: a "Tell apart" line slot for coral pairs in the content editor, as the fish's | admin, M | comparable to #798, #869, #908, #1013, #1059: median 41 min (range 18 min-60 min) |

The content rows' comparables are mostly photo and name PRs; writing sourced lines asks more reading, so the coral
lines are likelier near the top of their range (#1070, 3.2 h, the closest in kind) [my reading].

## 6. Questions for Pierre

**Answered, 2026-11-18 (~12:08 Manila): "ok pour les 6 recommandations".** Each question below is decided as its
recommendation:

- (a) layout A, the short bottom sheet;
- (b) after a right answer, the cue that tells it from a look-alike among the choices, else its first ID tip;
- (c) no pair line: the right unit's first tip; never a line made by comparing trait tags;
- (d) the sourced "tell them apart" lines are written for the 40 coral slate pairs and the 9 sea-slug pairs, corals
  first;
- (e) rule C3's new wording: one decisive line on the sheet, the ID tips behind More (the rule's text goes in the build
  PR, quoting this answer);
- (f) the More counter ships with the short sheet.

The questions as they were asked:

(a) **Which layout?** A, the short bottom sheet (the verdict, the photo's species line, one line, More and Next on one
row); B, the choices stay in view with the line under them; C, the verdict and the line on the photo. **Recommendation:
A** (one mechanism, photos about twice as tall on a miss, Find the X's tiles kept, closest to today).

(b) **When the answer is right, what line?** The cue that tells it from a look-alike among the choices (else its first
ID tip); always its first ID tip; or the verdict alone. **Recommendation: the look-alike cue, else the first tip.**

(c) **When no line exists for the pair**: the right unit's first ID tip or mark; or the verdict alone. And may a line be
made from the Coral Finder trait tags ("corallites: shared walls / separate walls")? **Recommendation: the first tip;
no line made from the tags** (rule C2, and a missing tag is not an absent feature).

(d) **Write the missing lines?** A short "tell them apart" line, sourced, in our own words, for the 40 coral slate pairs
without one (the most confused first) and the 9 sea-slug pairs, reviewed by you in the admin as the fish's "Tell
apart". **Recommendation: yes, corals first.**

(e) **Rule C3**: the ID tips leave the default sheet (one tap away behind More) and the sheet shows one line. New
wording: "the quiz feedback shows one decisive line; the ID tips are behind More". **Recommendation: yes.**

(f) **Measure More** with the four numbers in the pages summary (one line added to the privacy page), shipped with the
short sheet. **Recommendation: yes**, so we see whether More is opened at all.

## 7. Screenshots

Kept outside the repo (no image is committed); the integrator sends them to Pierre as files. Ratio 2.

- Today: `today-<subject>-<right|wrong|typed|duel>-<p360|p390|p414|d1280>-light.png`, `-dark` at p360 and d1280, and
  `today-fish-findx-*` (78 shots).
- Mockups: `<A|B|C>-<subject>-<right|wrong|none>-<p360|d1280>-<light|dark>.png`, `<A|B|C>-fish-findx-*`, and
  `<A|B|C>-<subject>-wrong-more-p360-light.png` with More open (129 shots).
