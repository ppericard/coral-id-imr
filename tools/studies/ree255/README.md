# REE-255: the single-view offset per view, on the real answer log (study scripts)

Read-only study tools for Linear REE-255 (the study note: `docs/reviews/2026-11-25-coral-view-offset.md`). They change
nothing in the app, the sheet or the rules, and send nothing anywhere. Inputs stay outside the repository (raw player
histories never go to GitHub); the outputs kept here are aggregates only, with no player label.

## Method, declared before the fit (2026-11-25, before any model was fitted)

**Data.** The sync sheet's Answers tab as REE-252 read it (Sheets connector, read-only, 2026-11-23 about 21:15 Manila;
7,676 rows, the last answer 2026-11-22 18:36), pseudonymised by `pseudo.py` (labels P1, P2… by first appearance; the
name map is never written). About 20 rows came later (one session of 2026-11-24 08:27-08:29, before the REE-254 fix
#1529 merged at 09:44): left out. `prep.py` keeps the photo-quiz answers (Find the X left out) with a logged
expectation; each coral photo's view comes from `data.json` (views, and the lecture photos' `v`) with Pierre's adds
and moves in `curation.json`.

**The question's kind.** One photo: its view alone (`wide`, `medium` = close-up, `macro` = corallites). Two or more:
`multi` (several views of one colony). A one-view question never has a corallites hint (`model.js` `photoSet`), so the
single-view kinds are exact. Before #1529 the Photos column held the hint even when it stayed closed, so `multi` may
include questions answered from one view: two declared sensitivities below.

**The app's own log-odds.** x = logit((e − g) / ((1 − g) R)), e the logged expectation, g the guess rate (`core.js`
`guessOf`, 0 typed), R the comeback recall (the scoring record's `r`, 1 when absent), e clamped as `analysis.js` does.
The logged e already holds `PICKD.SINGLE` (+0.5 difficulty for one photo alone), the photo memory and the mix-ups; it
leaves out the format offset the game scored with (`scoreStep`: the expectation is th0 − dm, the step dm − df).

**Primary model** (corals; typed answers and exam questions left out, as in REE-252):

    P(right) = g + (1 − g) R σ(x + δ_format + λ_band + β_kind + a_player + b_genus)

- δ_format: a fixed effect per format (`core.js` `fmtOf`; k4 the reference, 0), standing in for the sheet's format
  offsets, which the older rows do not log.
- λ_band: a fixed effect per band of the logged ability on the genus (under 0.5, 0.5 to 1.5, 1.5 and over; REE-252's
  bands), so a miscalibration by level is not read as a view effect. It also holds the intercept.
- β_kind: `multi` the reference (0); β_wide, β_medium, β_macro the excess of each view alone over several views, in
  logits. The single-view offset that would have fitted is then SINGLE_v = 0.5 − β_v (today 0.5 for every view).
- a_player ~ N(0, σ_p²), b_genus ~ N(0, σ_g²): random intercepts; their SDs by the Laplace approximation's marginal
  likelihood on a grid (0.05 to 1.5); the fixed effects with a weak N(0, 10²) prior. Fitted by Newton's method (numpy).

**The structures compared** (the issue's question: one shared offset or one per view):
`today` (β_wide = β_medium = β_macro = 0), `shared` (one β for every view alone), `two` (colony = close-up, corallites
apart), `per-view` (three β).

**Primary comparison:** leave one player out. Each structure is fitted on the other players (the SDs fixed at the
whole-log fit's) and predicts the held-out player's answers (their own intercept at 0). Per player, the mean log-loss
of `per-view` less `shared`; an exact two-sided sign-flip test over the players (rule L11: players are the unit), α 0.05.
The same for `shared` less `today` and `two` less `per-view`, reported with Holm over the three.

**Intervals:** 95% percentile bootstrap over players (2,000 draws, seed 255; a player drawn twice counts twice), the
SDs fixed at the whole-log fit's.

**Sensitivities (declared, uncorrected):**
1. the hint: `multi` without the close-up + corallites rows; `multi` without every row holding a corallites photo;
2. the format offset as the game had it: only the rows with a scoring record, x + its logged `o`;
3. a photo random intercept beside the genus's (the excess then read within a photo, alone against with others);
4. by band: β_kind per ability band (does the excess change with the level?);
5. early and late halves of the log (the photo ratings learn with +0.5 built in, so a misfit may shrink as photos
   gather answers);
6. typed answers kept, with their own format effect.

**The replay** (`replay.js`, secondary, the rule L12 view): the sheet's photo Elo (`core.js` `eloReplay`, the same
rules as `tools/sync/Code.gs` `statsStep_`) replayed over the coral answers with the single-view offset as an input,
per view; first checked to give `eloReplay`'s ratings exactly at 0.5. Each answer's expectation before its own step
gives the next-answer log-loss per player, for `today`, the best `shared` value and the best `per-view` values on a
grid (0 to 0.5 by 0.125), each best value chosen without the held-out player. The sheet's model rates the player
with one level for every genus, not the app's per-genus ability, so it shows what the photo ratings make of each
option, not the app's expectation.

**Fish and sea slugs.** Every question shows one photo, so the single-view offset is a constant there: it is absorbed
by the photo and unit ratings and cannot be measured (q351's refit found the same). Their judged framing (profile,
oblique, from above, part of the fish) is a photo feature, not a view shown alone or with others: reported as
exploratory only, with the same model's kind replaced by the framing tag (fish; the sea slugs have 2 players).

## Added after the fit (exploratory, uncorrected)

- `fit.py`: the per-view model on the answers whose photos had under 5, or 5 or more, earlier answers (`prep.py`
  `pn`), and the second half with a photo intercept;
- `replay.js`: a wider grid (−1 to 0.75) and the second half of the scored answers alone (the declared grid).

## Files

| File | What it does |
| --- | --- |
| `pseudo.py` | pseudonymise a fresh read of the Answers tab (Sheets connector JSON) |
| `prep.py` | the rows the fit reads (`python3 -I prep.py answers.json <checkout> rows.json`) |
| `fit.py` | the model, the comparison, the bootstrap and the sensitivities (`python3 -I fit.py rows.json out.json`) |
| `replay.js` | the photo Elo replay under each offset (`node replay.js answers.json rows.json out.json`) |
| `out/` | the aggregate outputs quoted in the note |
