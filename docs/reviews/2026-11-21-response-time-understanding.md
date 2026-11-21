# Response time as a difficulty signal: current understanding (Q449-Q452)

A revisable synthesis kept by the integrator (pilot of the integrator continuity study's appendix C, [REE-179](https://linear.app/reef-id/issue/REE-179)).
**Not evidence of Pierre's approval**: his words are quoted with their date and live in [ANSWERS](../ANSWERS.md); every
line marked *inference* is the integrator's reading. If it conflicts with a decision, correct this note. Edit it in
place; history stays in git.

## Purpose

Use the seconds a player takes, and whether they enlarge the photo, as evidence about **the photo's** difficulty (step
1) and then stop counting against **the player** the slowness that the photo explains (step 2), without turning a
hypothesis into a formula.

## Current position

**Pierre's words (acquired, with their scope):**

- 2026-11-20 17:32: time carries difficulty, experts included, right answers included: «C'est juste un fait, qu'il faut
  intégrer parce qu'il est juste»; and how it enters the engine goes through a study first: «Attention là. Tu prends
  une décision hyper rapide sur une évolution du moteur sans même lancer d'étude et y réfléchir plus longtemps???».
- 2026-11-21 05:40, Q449 «Ok» («Un terme temps séparé pour chaque photo qui s'efface selon l'information des réponses
  et non leur norme»), Q450 «Ok» (validate without wrong answers), Q451 yes with his nuance («c'est un signal faible,
  mais c'est un signal différent, qui pour le coup est probablement plus indicatif de la difficulté d'une photo que de
  la difficulté du taxon pour le joueur, à mon avis. Même si ça peut être une combinaison des deux»).
- 05:48: continuous, no categories («de manière continue, hein, sans forcément faire des catégories»). The
  strong-player / beginner asymmetry is his hypothesis, in his words «c'est mon intuition», and the multifactor study
  comes first («c'est un sujet qui est vraiment à creuser»).
- 05:48, Q452: a step 2 after step 1, and everyone's progress recalculated silently («il faut recalculer la progression
  de tous. On peut le faire en silence, c'est pas grave»). **A direction, not a formula.**
- 06:20: «ok» to the integrator's option A, whose sentence is the integrator's: «chaque réponse pèse selon la régularité
  des temps des joueurs de ce niveau […] Comme les forts sont plus réguliers, leur hésitation compte plus».
- 13:23-13:27: #1357 merged with its breached rated-world guardrail accepted («ok pour merger la PR»). **Scope: that PR
  only.** Rule L11 is unchanged; where simulations decide is open ([REE-71](https://linear.app/reef-id/issue/REE-71),
  [simulation-scope note](2026-11-21-simulation-scope.md)).

**Integrator's calls, easy to correct** (built in #1357; [decision record](../decisions/2026-11-21-photo-time-term.md),
LEARNING.md "The photo's time term"): V(L) as a log-linear fit shrunk by its cluster error, 0 under 5 players or 500
answers, weights capped at 3×; the additive fade C × term × I₀ / (I + I₀); C 0.5, TAU2 0.06; z over right answers only
with the format cell; the enlargement against the player's own rate. `PTIME.C = 0` turns the term off.

**Unresolved implementation choices for step 2** (*inference*, nothing decided): which z is netted (`rtWeight`'s z is
against the median of all timed answers; the photo term's z is against right answers only, less the format cell); the
subtraction form (the study's z − λ(L)·TI_f was written for a loading model that option A did not build; under
option A λ = 1 is the obvious reading, not a decided one); whether the enlargement term enters; the rules version and
the silent replay's mechanics (rules D4, D5).

## Evidence and interpretation

- **Observed** (real log to 2026-11-20 15:50; [multifactor study](2026-11-21-rt-multifactor.md), #1357's checks): on
  corals about 10% of a right answer's time variance is shared by players on a photo; others' time on a photo predicts
  a player's misses beyond today's Expected (12 of 12 coral players), and the term does not worsen the next-answer
  prediction.
- **Not clear**: the photo's share rising with the player's level. Corals could only detect roughly a tripling; the
  fish estimator fails its own simulation check; Part A's L × dq is negative in both subjects. Sea slugs: one player.
- **Exploratory, fish only**: strong players' right-answer times are less scattered (V's slope clear for fish; for
  corals it flips without the clip). Option A states it as a premise; on today's log the corals' weights sit at
  their fallback (equal) and the fish's move 0.8-1.2.
- **Uncertain**: whether the weighting helps at all ("the measure cannot tell"); the cause of the rated-world dip at
  1,000 answers; the right `PTIME.C`.

## Current work

- Step 2 (Q452): [REE-16](https://linear.app/reef-id/issue/REE-16).
- Re-measure of `PTIME.C`, the weighting and the enlargement term: [REE-76](https://linear.app/reef-id/issue/REE-76).
- The genus term (opening order): [REE-77](https://linear.app/reef-id/issue/REE-77).
- Where simulations decide: [REE-71](https://linear.app/reef-id/issue/REE-71).
- Done: the study #1352, step 1 #1357, the simulation note #1359. The superseded option 1 (#808, closed unmerged,
  Q335): docs/archive/learning-notebook.md "Q315 option 1: what three rounds showed".

## Next useful action

Step 2 under the existing mandate (Q452): settle the open choices above as integrator's calls, declared before
measuring, in one `core.js` PR with a rules version. *Inference*: no question to Pierre is needed, since Q452 already
decides the silent recalculation; ask only if a choice proves costly to undo beyond what Q452 covers.

## Last reconciliation

2026-11-21, main `ccf0632d6`. Read: ANSWERS 2026-11-20 and 2026-11-21, the study, the decision record, the simulation
note, LEARNING.md, ROADMAP at `7e28f51b2`, #1352, #1357, #1359, REE-16, REE-71, REE-76, REE-77. **Gaps**: whether the
deployed sheet script is at `PTIME_SHEET` (213; the repo's `VERSION` is 213, the live script was not read); no
real-player data since 2026-11-20 15:50; REE-77 cites Q449-Q452 as its direction, but those answers are about the
photo term (the genus term's own source is Pierre, 2026-11-04 and 2026-11-20); REE-76's "about 10,000 pairs" was
derived for the study's Δs test, not for C or the 1 / V(L) weighting.

## Successor warning

- Do not present 1 / V(L), the study's λ(L) form or any constant as "Pierre's formula": he approved directions and
  option A's principle; the numbers are the integrator's.
- Do not re-ask Q449-Q452 or option A, and do not reopen the study because the hypothesis is "not clear": he asked for
  the study, it is done, and his «ok» to option A came after it (*inference*: option A's fallback to equal weights
  where the data show no slope is part of what he approved).
- Do not read 13:23 as a standing waiver of rule L11; nor treat a simulation's verdict as overriding his logic.
- The 2026-11-21 morning wording "the integrator's recommendation to Pierre pending" (in the study and #1352) is
  superseded by the 06:20 «ok».
