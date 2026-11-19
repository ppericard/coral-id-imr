# Per-player reserve: each player's own exam photos, every subject

Date: 2026-11-18 (Manila, about 12:05). PR: #1099. Rules or docs touched: LEARNING.md "The reserve in the game",
spec/model.md "The exam's reserve", ROADMAP "A held-out photo set"; rules P1, P4, S1, D4, D8, D9 applied, none changed.

## Context

#1057 held back one fixed set of fish observations (`fish-holdout.json`, built by `tools/holdout.py`) for every player.
Its mastery exam asked them first, so the exam would be on photos never seen in practice. The set was the same for
everyone, so those photos were never practised or rated by any player, and only the fish had one.

## Decision

The reserve is chosen per player, for every subject. Pierre, 2026-11-18 ~12:05 Manila: "En fait la réserve elle doit
être définie par joueur. Il n'y a pas d'intérêt d'avoir une réserve globale"; then "oui, lance".

#1057's sizing rule stays:
- up to 15 observations per unit with an exam;
- taken only from a real surplus: at least 30 observations left in practice per unit and 8 per species, each unit's
  floor guarding its species inside a larger unit.

Pierre, 2026-11-18: "Il en faut suffisament pour refaire l'examen plusieurs fois, si et seulement si on a assez de
photos par ailleurs"; "Si on n'a pas assez de photos, ben on privilégie l'apprentissage".

The exam asks the player's reserved observations first, then observations never shown to them, then seen ones. This
order is the integrator's spec of Pierre's decision.

The integrator's calls (easy to correct):
- the hash (FNV-1a with murmur3's finaliser);
- the player id: the account's lowercased name, or `~anon <id>`;
- the order the units are filled in;
- the reserve kept stateless, recomputed at each build;
- the photos on the cards staying in practice.

## Consequences

- `core.js`:
  - `reserveOf` and `reserveSplit` build the reserve on the units as the app builds them, the same for every subject
    (rule S1);
  - `model.js` `examSet` asks the reserve first;
  - an answer on a reserved photo is logged `|h`, as before.
- `fish-holdout.json`, `tools/holdout.py`, its CI step and its photo-workflow step are gone.
- **Replays (rules D8, D9):** the logged tag is the record. Replays read no reserve and no `|h`, so they are unchanged:
  no rules version.
- **No gate (rule D4):** the script's mode parsing already reads `|h` on any subject.
- **For players:** different players practise on different photos, and the corals and the sea slugs now hold some
  photos back from practice.
- **The rule L11 check** (docs/archive/learning-notebook.md "The per-player reserve: the checks") found two breaches,
  both for the corals' beginner in the rated world; Pierre kept the corals' reserve as built (Q420 A), and the photos
  it may take read their qualities only (rule P1): [2026-11-19-per-player-reserve-corals.md](2026-11-19-per-player-reserve-corals.md).
