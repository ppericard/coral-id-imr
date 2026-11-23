# REE-85 study: does the fish judged ease match what players find hard? (2026-11-23)

A read-only study for Linear REE-85 ("Fish judged-ease prior: refit or drop"), reopened by Pierre on 2026-11-23 16:23
Manila. He thinks some criteria were set arbitrarily and that photos rated hard are not that hard for players. His
example: garden eels and snake eels are always seen buried, so a partial fish is not necessarily hard ("c'est toujours
comme ça qu'on les voit"). Nothing in the app, the sheet, Linear or GitHub was changed. Players are P1, P2…
(rule D2). No named data is committed (rule L12).

## Summary

- **Data:** 3,537 fish answers from 9 players (2026-11-06 to 2026-11-22). The analysis uses 3,349 family-level quiz
  answers, 88.7% right (379 misses). There are 2,811 distinct photos, and 82% of them were answered only once.
- **The #1341 gate is not met.** 4 players have 20+ answers after the switch to served ratings (524, 178, 67 and 38),
  where 6 are needed. 15 photos have 5+ answers, where about 100 are needed. So this study uses the whole log, with
  each player held out in turn. It does not use #1341's fresh-window primary test.
- **The judged ease predicts difficulty only within a family, and about half as strongly as the app assumes.** Within a
  family, each ease point moves the odds of a right answer by −0.19 logit (95% interval over players: −0.32 to −0.08).
  On the app's scale that is about 0.24 per point, against 0.5 in force (`calib.ease`). The same figure appears before
  and after the switch, in every question format, early and late on a unit, and with the ease of the time instead of
  today's. It matches #1341 (0.24) and Q351 (0.33).
- **Between families, the judged ease predicts nothing, or slightly the wrong way.** Families whose pools are judged
  harder are answered no worse, and slightly better (Spearman −0.25, permutation p 0.05, 64 families). Yet the app uses
  the mean judged prior as a unit's difficulty (`model.js` line 631, the opening order).
- **The app overrates how hard the hard photos are.** Photos judged 1–2 are answered right 92% of the time, where the
  app expected 87.5–88%. Photos judged 4–5 do slightly worse than it expected (86–88% against 87–89%). This is the mark
  of a prior whose spread is too wide.
- **Pierre's "typical look" point holds.** In the 11 families whose usual look is buried, hidden or camouflaged, the
  photos tagged partial or camouflaged were answered right 101 times in 105 (96.2%). The app expected 89.5%: 4 misses
  observed against about 11 expected. Over and above the general partial and camouflage effects, these photos are
  easier by +0.85 logit (95% interval over players: +0.07 to +1.83). Outside these families, partial or camouflaged
  photos do about as the app expected. Garden eels: 22 right of 22. Snake eels: 11 of 13, as expected (too few
  answers to say more). The 4 families with no photo at ease 4 or more (Garden eels, Snake eels, Soles, Stingrays)
  were answered right 97.2% of the time in a player's first 10 answers on them, against 90.6% expected.
- **The criteria one by one:** no cap criterion shows the difficulty its cap implies, except possibly the night livery
  (4 answers, 3 misses). Refitting a separate weight for each criterion predicts worse on held-out players: with 379
  misses there are not enough data for that.

## Data and method

**Source.** The sync sheet's Answers tab (7,676 rows), read through the Sheets connector on 2026-11-23 about 16:30
Manila and pseudonymised at once (`tools/studies/ree112/pseudo.py`). The columns follow `docs/spec/sync.md` "The
Answers tab". The fish rows are those whose Subject is `fish`. Out of 3,537, 10 non-quiz rows and 14 Find-the-X rows
were left out. The main analysis keeps the family-rank questions (3,349 rows). The 164 genus and species rows are left
out.

**Each photo's judgement.** The judged ease `e` and tag code `jt` come from `fish-game.json` (or the older
`fish-photos.json`) at 12 dated commits, from 2026-11-06 to `origin/main` 98003f41. *Today's* judgement is the current
file, or the last snapshot that held the photo (584 answers are on photos since removed). *The time's* judgement is the
last snapshot before the answer. Check: before the switch, the logged difficulty gives the ease of the time
(e = 4 − 2 × d, with the single-view 0.5 included), and it matches the snapshot of the time on 2,691 of 2,706 rows
(99.4%). Today's ease differs from the time's on 475 of those rows, mostly 5 → 4 and 4 → 3 after the re-judges.

**The app's own prediction, with its ease share removed.** Each row logs the expected success `e` and its guess rate
`g` (`core.js` `guessOf`: 1/4, 1/k for |kN, 1/2 for the 2-choice formats, 0 for a typed answer). From these,
z = logit((e − g)/(1 − g)) is the app's ability-minus-difficulty for that player, unit and photo at that moment. The
ease's share in it is (3 − ease) × 0.5 × w. Here w = 1 before the switch (2026-11-19 19:53 Manila) and
`PDIFF.W` / (n + `PDIFF.W`) after it, with n the photo's earlier answers in the log (an approximation of the served
count). Removing that share gives z_ne, the app's prediction without any photo prior.

**Models.** All use P(right) = g + (1 − g) · sigmoid(η), fitted by maximum likelihood with a weak ridge (normal prior,
sd 2) on the photo and format terms:

- **B, calibration** (main): η = λ·z_ne + an offset per format + β·X. β is what the photo terms add to the app's own
  ability estimate.
- **A, absolute** (check): η = a player intercept + the format + log(1 + earlier answers on the unit) + log(1 + earlier
  fish answers) + β·X, with and without an intercept per family (within-family versus between-family effects).
- **X** is one of: (3 − ease); the ease as categories; the 19 criteria as indicators (the reference photo is profile,
  whole, good light, no colour loss, sharp, large, one fish, no flag); the two cap groups; or a typical-look term.

**Uncertainty.** Players are the unit (rule L11, statistics study §5.2):

- Intervals come from 300 player-cluster bootstrap resamples (9 players, so they are wide and approximate). The
  per-answer standard errors are shown as well, and are too narrow.
- Out-of-sample checks hold one player out at a time: the next-answer log-loss of each arm against no photo prior at
  all, with an exact sign-flip test over the 9 players.
- The per-family "observed against expected" z-scores are per answer and descriptive only.

**The typical-look families** were declared from today's pool before any outcome was looked at: the families where at
least half of the pool photos are tagged partial (`0`) or camouflage (`c`). There are 11: Garden eels, Ghost
pipefishes, Jawfishes, Lizardfishes, Morays, Scorpionfishes, Sea moths, Snake eels, Soles, Stargazers and
Waspfishes. Pierre's two families were named in his message before the data were read. Everything else is
exploratory, with no correction for the number of tests.

## Results

### 1. The ease as a whole

| Measure | Estimate | Reading |
| --- | --- | --- |
| Ease slope over and above the app's ability (B1), per ease point | −0.19 [−0.32, −0.08] (per-answer SE 0.07); λ 0.82 | Real, but weaker than the prior: on the app's scale about 0.24 per point against 0.5 |
| The same within a family (A1f, family intercepts) | −0.22 [−0.39, −0.18] | Within a family the ease does rank photos |
| The same across families, no family term (A1) | −0.03 [−0.15, +0.04] | Between families the ease predicts nothing |
| Ease categories, absolute (A1c, against ease 3) | ease 1 −0.01, 2 +0.15, 4 +0.07, 5 +0.16, all intervals across 0 | — |
| B1 slope: before the switch / after it | −0.21 (SE 0.08) / −0.23 (SE 0.17) | Stable |
| B1 slope: 4 plausible choices only / first 10 answers on a unit / 11th answer on | −0.19 / −0.15 / −0.33 | Stable; not stronger at a beginner's start |
| B1 slope with the ease of the time instead of today's | −0.14 (SE 0.07) | The re-judges did not make it worse |
| Family difficulty against the family's mean judged prior (64 families, 12+ answers) | Spearman −0.25, permutation p 0.05 | Families judged harder are, if anything, answered better |

**Calibration of the app as logged, by today's ease** (observed against expected right rate, per-answer z):

| Ease | Answers | Observed | App expected | z |
| --- | --- | --- | --- | --- |
| 1 | 173 | 0.919 | 0.875 | +1.78 |
| 2 | 360 | 0.922 | 0.883 | +2.36 |
| 3 | 675 | 0.893 | 0.890 | +0.24 |
| 4 | 1,582 | 0.882 | 0.890 | −1.12 |
| 5 | 559 | 0.860 | 0.874 | −0.97 |

The raw right rate does not rise with the ease: 91.5% at ease 1 and 85.0% at ease 5. Part of that is the draw, which
sends the harder photos to players already doing well. The models above take this into account through the app's
ability estimate or through a per-player term.

**Held-out players** (next-answer log-loss, difference against no photo prior; negative is better):

| Arm | Difference per answer | Players better | Sign-flip p |
| --- | --- | --- | --- |
| Today's weight 0.5 (today's ease) | +0.0007 | 4 of 9 | 0.70 |
| The prior of the time as logged | +0.0024 | 5 of 9 | 0.41 |
| Weight 0.1 / 0.2 / 0.3 | −0.0006 / −0.0009 / −0.0008 | 7 / 6 / 6 of 9 | 0.13 / 0.27 / 0.51 |
| Weight 0.2 with the typical-look exception (+1 ease) | −0.0010 | 6 of 9 | 0.20 |
| Ease slope refitted | −0.0006 | 6 of 9 | 0.50 |
| 19 criteria refitted | +0.0039 | 2 of 9 | 0.07 |

All the differences are small: about a thousandth of a nat per answer. A weight of 0.1–0.3 is the best arm, and 0.5
is no better than no prior at all. None of this is clear at 9 players. Refitting the criteria one by one overfits.

### 2. Criterion by criterion

The table gives each criterion's effect on the log-odds of a right answer, against the reference photo, from model B2.
Positive means easier than the reference, and the brackets are the 95% interval over players. The miss rate across
all 3,349 answers is 11.3%.

| Criterion (cap) | Answers (misses, rate) | B2 effect [players 95%] | Absolute A2 | What its cap implies | Reading |
| --- | --- | --- | --- | --- | --- |
| Partial `0` (≤3) | 126 (7, 5.6%) | +0.27 [−0.24, +1.96] | +0.35 | at least −0.5 to −1 | Not harder. In typical-look families it is clearly easier (section 3) |
| Camouflage `c` (≤3) | 117 (12, 10.3%) | −0.43 [−0.78, +0.18] | −0.33 | at least −0.5 to −1 | Harder outside typical-look families (B3: −0.65 [−1.04, −0.09]); not inside them |
| Head-on, tail or top view `h t d` (≤3) | 162 (10, 6.2%) | +0.17 [−0.11, +0.75] | +0.18 | at least −0.5 to −1 | Not harder |
| Night livery `n` (≤3) | 4 (3, 75%) | −2.96 [−3.78, −1.79] | −2.56 | −0.5 to −1 | Possibly harder than its cap, but on 4 answers |
| Strong colour loss `2` (≤3) | 340 (29, 8.5%) | −0.22 [−0.51, +0.31] | +0.01 | at least −0.5 to −1 | Weak at most |
| Monochrome `3` (≤2) | 50 (1, 2%) | +1.17 [−0.21, +2.37] | +1.14 | at least −1 to −1.5 | Not harder (49 right of 50) |
| Strong blur `b` (≤2) | 114 (7, 6.1%) | −0.11 [−0.49, +0.47] | +0.11 | at least −1 to −1.5 | Not harder |
| Unclear subject `x` (≤2) | 2 (0) | — | — | — | No data |
| Not a live fish `a` (≤3) | 0 | — | — | — | No data |
| Any cap-3 tag (B5) | 554 | −0.21 [−0.55, +0.32] | — | at least −0.5 | Weaker than the caps imply |
| Any cap-2 tag (B5) | 141 | +0.20 [−0.23, +1.03] | — | at least −1 | No sign of the implied difficulty |
| Oblique `o` (one step) | 584 (55, 9.4%) | +0.06 [−0.12, +0.27] | +0.14 | −0.5 | Not harder |
| Dim light `d` | 159 (21, 13.2%) | −0.25 [−0.86, +0.11] | −0.29 | −0.5 | Possibly a little harder |
| Slight colour loss `1` | 1,507 (162) | −0.02 [−0.21, +0.23] | +0.06 | −0.5 | None |
| Soft `m` | 146 (11) | +0.18 [−0.62, +1.51] | +0.28 | — | None |
| Medium / small size | 1,193 (123) / 260 (21) | +0.03 / −0.29 [−0.92, +0.34] | +0.06 / −0.07 | −0.5 / −1 | Small at most; within a family, small size −0.47 [−1.11, +0.26] |
| Several of one kind `s` | 288 (16, 5.6%) | +0.60 [−0.26, +1.43] | +0.65 | "a school in the blue" in 2 hard | If anything easier |
| Other species in view `o` / confusable `k` | 74 (8) / 4 (1) | −0.21 / −0.79 | −0.10 / −0.88 | −0.5 | Too few answers |
| Juvenile `j` (no cap since Q435) | 155 (16, 10.3%) | −0.05 [−0.68, +0.82] | +0.16 | — | None (agrees with no cap) |

Caveat for this table: each criterion's interval is wide. "Not harder" means the data show no sign of the difficulty
the cap implies. It does not prove that the criterion has no effect. The reliable pattern is collective: the capped
photos as a group (B5) are far less hard than their caps imply.

### 3. The typical look

| Group | Answers | Observed | App expected | z (per answer) |
| --- | --- | --- | --- | --- |
| Typical-look family, photo partial or camouflaged | 105 | 0.962 | 0.895 | +2.26 |
| Typical-look family, neither tag | 188 | 0.899 | 0.903 | −0.21 |
| Other family, partial or camouflaged | 131 | 0.885 | 0.877 | +0.32 |
| Other family, neither | 2,925 | 0.883 | 0.885 | −0.28 |
| Typical-look families, a player's first 10 answers on them | 268 | 0.918 | 0.901 | +0.94 |
| The 4 families with no photo at ease 4+ (Garden eels, Snake eels, Soles, Stingrays), first 10 answers | 71 | 0.972 | 0.906 | +1.92 |

The interaction "typical-look family × partial or camouflaged" is +0.85 [+0.07, +1.83] in B3, +0.89 [−0.05, +1.92]
in B6 and +0.78 [−0.13, +1.62] in A3. All three point the same way. Two of the three intervals just touch zero.

Per family (right of answers, and the app's expected count):

| Family | Right / answers | Expected | Mean judged ease answered |
| --- | --- | --- | --- |
| Garden eels | 22 / 22 | 19.9 | 2.55 |
| Jawfishes | 31 / 31 | 28.5 | 2.84 |
| Sea moths | 21 / 21 | 19.2 | 2.67 |
| Ghost pipefishes | 21 / 21 | 19.6 | 3.43 |
| Soles | 15 / 15 | 13.8 | 3.00 |
| Stingrays (not typical by the rule; no ease 4+) | 23 / 23 | — | — |
| Waspfishes / Stargazers / Scorpionfishes | 22/23, 21/22, 21/23 | 21.2, 20.1, 20.0 | 3.9, 3.6, 3.7 |
| Morays | 22 / 25 | 22.4 | 3.28 |
| Snake eels | 11 / 13 | 11.3 | 2.69 |
| Lizardfishes | 63 / 77 | 67.8 (worse than expected, z −1.73) | 3.49 |

**Reading.** For a family-level question, a buried garden eel, a jawfish in its burrow or a sole on the sand is the
family's usual look, and players name it as easily as a clear profile of a reef fish. The partial and camouflage caps
measure how far a photo is from a field-guide profile. For these families, the right comparison is the family's usual
look. Two exceptions: snake eels are answered as expected (13 answers, too few to say more), and lizardfishes are
answered worse than expected. For lizardfishes the difficulty is likely the family, not the photo: a look-alike
question, which this study did not examine.

## What the figures cannot say

- **There are few misses.** At 88.7% right, the 379 misses carry the information, and many criteria have under 20
  misses. Most effects per criterion have intervals that include both "no effect" and "the cap's effect".
- **There are 9 players, 4 of them after the switch.** The cluster bootstrap over 9 players is rough, and the #1341
  gate (6 players with 20+ post-switch answers) is not met. This is an in-sample study with held-out players, not the
  declared fresh test.
- **Today's ease or the time's.** The answers were given under the ease of their time. The criteria are read from
  today's codes, which the re-judges changed on 18% of the pre-switch rows. The two give the same slope within error.
- **Selection by the draw.** The app aims photos at the player's level and holds the photos under ease 4 to 10% of the
  draw before Open Water. Model B conditions on the app's own ability estimate, which removes most of this, but not
  all of it.
- **The question is at family level.** These results are about naming the family. A buried eel may well be harder for
  a species question, and there are only 4 species answers.
- **Between-family figures** mix photo ease with family difficulty and the order in which families open (later
  families are met by more practised players). They are exploratory.
- **The per-family z-scores** treat answers as independent and are descriptive only.

## Recommendations, ranked

1. **Lower the ease's weight from 0.5 to about 0.2–0.25 per point** (`core.js` `CALIB.ease`, `calib.ease`, which the
   fish inherit).
   - **Evidence:** four estimates agree: this study (0.24 on the app's scale), #1341 (0.24), Q351 (0.33), and the
     held-out arms (0.1–0.3 best).
   - **Effect:** the photos judged 1–3 come earlier and more often in the targeting, and their ratings come from
     answers sooner. On log-loss it is about −0.001 to −0.002 a nat per answer against today: small, and not clear at
     9 players. It removes the miscalibration seen at ease 1–2.
   - **Risk:** low and easy to undo. `RARE` uses the ease threshold and not the weight, so the draw before Open Water
     is unchanged.
   - **Who decides:** this is the refit REE-85 already decided ("refit or drop", 2026-11-04; Q435 "the players'
     answers decide"). Rule L12 asks for the learnsim and real-log tables in its PR. The #1341 gate is not met, so
     acting now rather than waiting is a call for the integrator, or for Pierre.
   - **Rules version:** the replay scores past answers with their logged `d` (`core/replay.js` line 258), so no past
     progress moves. Whether rule D5 still wants an `RVS` entry for future scoring is the integrator's reading.
2. **A typical-look exception in the rubric:** in a family whose usual look is buried, in a burrow or camouflaged, the
   partial `0` and camouflage `c` tags no longer cap the ease. The photo is judged against the family's usual look.
   - **Evidence:** section 3, +0.85 [+0.07, +1.83]. This is the one criterion finding that is close to clear, and it
     is Pierre's own hypothesis.
   - **Effect:** the RARE cliff families (Garden eels, Snake eels, Soles, and Stingrays, whose 115 photos have no
     ease 4+) get easy photos, which removes most of REE-197's cliff without new draw code.
   - **Risk:** the list of families. It needs a declared, cited list or a rule, such as half or more of the pool
     tagged `0`/`c` (the rule used here), and the photos of those families re-judged, or re-capped by
     `tools/fish_judge.py`.
   - **Who decides:** Pierre. The caps are his criteria (2026-11-04, 2026-11-19), and the scope of a "typical look"
     is a game rule. It changes the data (`fish-game.json` `e`), not the engine.
3. **Stop using the judged ease to rate families against each other.** Make it a within-family prior only: centre each
   photo's ease on its family's mean, and stop letting `model.js` line 631 rank units by mean judged prior.
   - **Evidence:** ease has no effect across families (−0.03 [−0.15, +0.04]), and a slightly reversed ranking of
     families (Spearman −0.25, p 0.05).
   - **Effect:** families with buried or camouflaged looks no longer start out as hard, and stop opening late.
   - **Risk:** it changes the opening order (`openPick`) of the families not yet answered, which is visible to
     players.
   - **Who decides:** Pierre, since the opening order is player-facing. It is a learning change (rules L11–L12), and
     it needs an `RVS` entry if the unit difficulty enters progress.
4. **Soften the caps to one ease step instead of a ceiling**, or drop the cap-2 group (monochrome, strong blur,
   unclear subject).
   - **Evidence:** the capped photos as a group are far less hard than their caps imply: cap-3 −0.21 against an
     implied −0.5 or more, and cap-2 +0.20 against an implied −1 or more. Monochrome photos were answered right 49
     times in 50, and blurred ones 107 in 114.
   - **Risk:** each criterion is uncertain on its own (wide intervals). The draw's selection may hide some
     difficulty. A softened cap still lets the judge type a low ease.
   - **Who decides:** Pierre: the caps are his rubric, and the blur cap dates from 2026-11-19.
   - **Recommendation:** do this after the typical-look exception, or together with it in one re-judge pass.
5. **Keep watching the night livery `n`:** 3 misses in 4 answers. It is the one tag that may be harder than its cap.
   Nothing to change on 4 answers.
6. **Do not refit a weight for each criterion yet.** It predicts worse on held-out players (+0.004 nat per answer,
   2 of 9 better, p 0.07). Revisit it at about three times the misses, around 1,000, with 6 or more post-switch
   players.
7. **A faster hand-over from the prior to the answers** (lower `PDIFF.W`) would change little today: photos have 1.2
   answers each, so the prior dominates either way. Recommendation 1 does the work this would do.
8. **Re-run the #1341 primary at its gate**: 6 players with 20+ post-switch answers and about 100 photos with 5+
   answers. Use these scripts with the slope, the cap groups and the typical-look term declared in advance as
   primaries.

## Reproduce

The scripts are in the study's scratch folder. The inputs are not kept in the repository.

1. Read the Answers tab (all columns) and pseudonymise it:
   `python3 -I pseudo.py <get_values.json> answers.json`.
2. Snapshot the photo files: `git show <commit>:fish-game.json` and `git show <commit>:fish-photos.json` for the
   commits listed in `prep.py`.
3. Prepare the rows: `python3 -I prep.py answers.json fg rows.json`.
4. Fit the models: `node tests/slot.js --name ree85-fit -- python3 -I fit.py rows.json fish-game.json --boot 300`.

The bootstrap and the permutation use seed 85. The run is short and goes inside the machine slot (rule W24).
