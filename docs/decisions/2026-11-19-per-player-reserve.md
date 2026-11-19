# Per-player exam reserve, every subject; the corals keep theirs; the photos it takes read their qualities only

Date: 2026-11-19. PR: #1099. Rules or docs touched: P1, P4, L3, L11, S1, D4, D8, D9 applied, none changed;
LEARNING.md "The reserve in the game", spec/reserve.md, ROADMAP "A held-out photo set".

## Context

#1057 held back one fixed set of fish observations, the same for every player, which their mastery exam asked first:
those photos were never practised or rated by anyone, and only the fish had one. #1099 replaced it with a reserve per
player for every subject (2026-11-18), which for the first time holds back a few coral colonies (96 in 14 of 39 genera
for one player). Its rule L11 check found two breaches, both for the corals' beginner in the rated world at 1,000
answers (a short run of 5 seeds): the global score 30.2 → 27.2, the genera at Open Water 12.8 → 10.0; it went to
Pierre (Q420). Before merging, the first build was also read against two decided rules: it left out the IMR lecture
photos and the reference sources' photos by their route, and its exam counted "never shown" by observation.

## Decision

- **The reserve is per player, for every subject.** Pierre, 2026-11-18 ~12:05 Manila: "En fait la réserve elle doit
  être définie par joueur. Il n'y a pas d'intérêt d'avoir une réserve globale"; then "oui, lance". #1057's sizing stays
  (up to 15 per unit with an exam, at least 30 per unit and 8 per species left in practice): "Il en faut suffisament
  pour refaire l'examen plusieurs fois, si et seulement si on a assez de photos par ailleurs"; "Si on n'a pas assez de
  photos, ben on privilégie l'apprentissage" (Pierre, 2026-11-18).
- **The corals keep their reserve as built** (Q420 A). Pierre, 2026-11-19 08:53 Manila: "ok. Il n'y a aucune raison
  que ça influence les résultats...". The cost measured is accepted; only a cost of another kind goes back to him.
- **The photos it may take read their qualities, never their route or source** (rule P1; Pierre, 2026-11-18: "La
  source ne devrait pas être le critère principal de 'référence' même si ça peut être un fort indice. L'ensemble des
  photos de référence doit avoir des qualités intrinsèques, basées sur des critères objectifs"). A reference photo
  stays out by its level (`refLevel`); the first build's exclusions by route (`rep`) and of the IMR lecture photos
  (`imr`, which no decision asked for) are gone. Pierre's own photos stay out: Q385 (never his own photos) and rule
  P1's exception (his photos never left out of practice).
- **"Never shown" counts by observation, on any unit** (rule L3, Q187-Q190: a colony, a fish's observation, counts as
  seen whatever view or photo of it was shown).
- **The integrator's calls** (easy to correct: the reserve is recomputed at every build): the exam's order (reserved,
  then never shown, then the least seen); the hash (FNV-1a with murmur3's finaliser); the player id (the account's
  lowercased name, or `~anon <id>`); the order units are filled in; the cards' photos staying in practice; the coral
  calibration set's members staying eligible (about 4 of the 50 in one player's reserve, out of that player's practice
  only).

## Consequences

- `core.js` `reserveOf`, `reserveSplit`, `heldOf` on the units as built, one rule for every subject (rule S1);
  `model.js` `examSet` asks the reserve first; an answer on a reserved photo is logged `|h`. `fish-holdout.json`,
  `tools/holdout.py` and their CI and workflow steps are gone.
- No rules version, no gate: no replay reads the reserve or `|h`, and the sheet script reads `|h` on any subject
  (rules D4, D8, D9; `tests/reserve.test.js`).
- For players: different players practise on different photos; the corals and the sea slugs hold some photos back.
- The checks, before and after the port onto today's code: docs/archive/learning-notebook.md "The per-player reserve:
  the checks".
