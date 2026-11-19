# The per-player reserve: the corals keep theirs, and which photos it may take reads their qualities only

Date: 2026-11-19. PR: #1099. Rules or docs touched: P1, L3, L11 applied, none changed; LEARNING.md "The reserve in the
game", spec/model.md "The exam's reserve"; follows [2026-11-18-per-player-reserve.md](2026-11-18-per-player-reserve.md).

## Context

The per-player reserve ([2026-11-18-per-player-reserve.md](2026-11-18-per-player-reserve.md)) holds back, for the
first time, a few coral colonies per genus for each player's mastery exam (96 colonies in 14 of 39 genera for one
player). Its rule L11 check found two breaches, both for the corals' beginner in the rated world at 1,000 answers: the
global score 30.2 → 27.2 and the genera at Open Water 12.8 → 10.0, from a short run (5 seeds). The question went to
Pierre (Q420). Before merging, its first build was also read against two decided rules: it left out of the reserve the
IMR lecture photos and the reference sources' photos by their route, and its exam counted "never shown" by observation.

## Decision

- **The corals keep their reserve as built** (Q420 A). Pierre, 2026-11-19 08:53 Manila: "ok. Il n'y a aucune raison
  que ça influence les résultats...". The cost measured is accepted; a new measure after the port is read against it,
  and only a cost of another kind goes back to him.
- **Which photos the reserve may take reads their qualities, never their route or source** (rule P1). Pierre,
  2026-11-18: "La source ne devrait pas être le critère principal de 'référence' même si ça peut être un fort indice.
  L'ensemble des photos de référence doit avoir des qualités intrinsèques, basées sur des critères objectifs"; confirmed
  2026-11-19 06:50 for the corals' code ("J'ai déjà répondu plein de fois à cette question!!!! On avait déjà fait des
  choix"). So a reference photo stays out by its level (`core.js` `refLevel`), and the first build's exclusions by
  route (`rep`) and of the IMR lecture photos (`imr`, which no decision asked for) are gone.
- **Pierre's own photos stay out of the reserve**: Q385 (2026-11-16, his answer to the held-out design note: never his
  own photos), and rule P1's exception for his photos: never left out of practice.
- **"Never shown" counts by observation, on any unit** (rule L3, Q187-Q190, 2026-11-06: a colony, a fish's
  observation, counts as seen whatever view or photo of it was shown).
- **The coral calibration set's members stay eligible** (the integrator's call, easy to correct: the reserve is
  recomputed at every build). About 4 of the 50 fall in one player's reserve (1 to 6 over 20 players); the other
  players' practice draws them, and that player's exam answer on one counts like any.

## Consequences

- `core.js` `resOut`: Pierre's own, `refLevel`, a card's photo; nothing read from `rep` or `imr`. The sizes do not move
  (the floors bind, not the eligibility): one player reserves 2,319 fish observations, 437 sea slug and 96 coral ones,
  as before; 20 players together 14,442 fish observations instead of 14,119.
- No rules version, no gate: no replay reads the reserve or `|h` (`tests/reserve.test.js`).
- The check after the port: docs/archive/learning-notebook.md "The per-player reserve: the checks".
