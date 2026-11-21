# The fish welcome's names step: common names, scientific names or both, right after the first-launch question

Date: 2026-11-21. PR: #1396. Linear: REE-57. Rules or docs touched: S1, D4; docs/FISH_PATH.md "Which names a
player learns", docs/spec/cards.md "The first-launch question", docs/spec/fish-game.md "The What I learn card: names
rows", docs/LEARNING.md "The first-launch question".

## Context

Pierre, 2026-11-04 (paraphrase, the fish UX study's answers): the player chooses common names, scientific names or both at
the fish welcome; "I'm at IMR" means both. On 2026-11-18 the choice moved onto the What I learn card (Q396, Q400 D, Q401 A,
Q402 A, Q404 A, [the names rows](2026-11-18-what-i-learn-names-rows.md)); the species-step-2 plan kept the welcome's part: "a
second step after 'How well do you know reef fish?', skipped for 'I'm at IMR'", the card's rows being what the step sets.

## Decision

Built as the plan says: a second step after the welcome question, in the tour (a forced choice, like the question) and on
the card that asks the question for a player who skipped the tour (its own card, then the Fish basics offer or the quiz).
It reads the card's rows, so a later change on My progress, What I learn, is the same switch.

- **Common names**: nothing is written. The record reads as it plays, so the scientific names are still offered once a family
  is at Advanced (the 2026-11-08 decision: the offer "never locks the setting").
- **Scientific names**: the Scientific names row on, the Common names row off (the families stay, Q404 A); the genera come
  as their family reaches Advanced (Q401 A, never by hand early).
- **Both**: the Scientific names row on.
- **Asked**: of "I'm new to reef fish" and "I know reef fish well"; skipped for "I'm at IMR" (both already; one who said it
  earlier counts), for a player who already set a row (the players who already play keep what they have), and while the
  sheet script does not replay the species level (rule D4: one row, no choice). Closing it (Escape) leaves the record as it
  plays; it is not asked again.
- **Declared in one place** (rule S1): `app.js` `UNITS` fish `names` (the question, the answers' words, the row each sets,
  the first-launch answers that skip it); `tour.js` and `quiz.js` read it and name no subject. The sea slugs and the corals
  declare none, so they have no step.

Integrator's calls, easy to correct: the wording of the question and of the three answers, the layout (the question's big
buttons), the step being forced in the tour, the step asked of "I know reef fish well" too, the card's order (names, then
the basics offer).

## Consequences

- No progress moves (no rules version, rule D5): a row turned on opens nothing early; no sheet script change.
- The What I learn study's §9 table (2026-11-18) reads "new: common names" with no step and the step for "know" only; it was
  never put to Pierre as such. The plan's reading is built (one line in `skip` changes it).
- The Fish welcome row of ROADMAP no longer lists the names step; the card's other levels (Bonus genera, Beyond the IMR
  course, Open all) stay open work (REE-90).
