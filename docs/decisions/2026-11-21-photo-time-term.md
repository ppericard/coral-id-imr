# The photo's time term: a separate term per photo, faded by information, each answer weighed by its level's steadiness

Date: 2026-11-21. PR: #1355. Rules or docs touched: L1, L11, L12, D3, D4, D5, S1; docs/LEARNING.md "The photo's time
term", docs/spec/sync.md "Pooled photo statistics", ROADMAP "Time in the photo rating".

## Context

Pierre, 2026-11-20, took as a fact that the time of an answer, right ones included and experts included, carries
difficulty. The design study proposed a separate time term per photo (candidate A), faded by the information of its
answers rather than their count (form A2), the enlargement its own term, and checks that need no wrong answers. He then
asked that the players not all go in one basket: a strong player's hesitation points to the photo, a beginner's to the
player, continuously, with no categories. The multifactor study (#1352) found the photo's share of the time not clearly
rising with the level, but strong players' times less scattered (clear for the fish).

## Decision

- Q449, Q450, Q451 (Pierre, 2026-11-21 05:40): «Un terme temps séparé pour chaque photo qui s'efface selon
  l'information des réponses […] Ok»; «valider sans réponse fausse. Ok»; the enlargement «un signal faible, mais […]
  différent, qui pour le coup est probablement plus indicatif de la difficulté d'une photo». 05:48: «de manière continue,
  hein, sans forcément faire des catégories».
- The weighting (Pierre, 2026-11-21 06:20, «ok» to the integrator's option A): «chaque réponse pèse selon la régularité
  des temps des joueurs de ce niveau. Ça se mesure dès aujourd'hui sur chaque joueur, sans avoir besoin de plusieurs
  joueurs sur la même photo. Comme les forts sont plus réguliers, leur hésitation compte plus».
- Integrator's call, easy to correct: the fade as an additive term C × term × I₀ / (I + I₀) beside the unchanged
  blend; V(L) as a log-linear fit of z² on the sheet's own level, its slope shrunk by its players-as-clusters error and 0
  below 5 players or 500 answers, the weights capped at 3 either way; the enlargement against each player's own rate;
  C 0.5, TAU2 0.06 (set by a calibration measure on the real log); the terms served as three more numbers in a photo's
  `?stats=1` entry.

## Consequences

- The sheet computes the terms in its photo statistics pass (`Code.gs` `statsStep_`, `core.js` `ptimeStep`, the admin's
  `eloReplay` the same); the app adds them in `model.js` `photoDiff` from the script version `core.js` `PTIME_SHEET`
  (rule D4). The draw, the scoring's d0, the exam's hardest photo and the fish cards' photo order follow; the progress
  replay does not read them, so no rules version (rule D5).
- On today's log the corals' weights sit at their fallback (equal) and the fish's move 0.8 to 1.2; the term moves a
  question by about 0.03 logits. Its re-fit (C, and whether the weighting helps) waits for more players: ROADMAP "Time
  in the photo rating". Step 2 (Q452: the player's time net of the photo's, a silent replay) is next.
