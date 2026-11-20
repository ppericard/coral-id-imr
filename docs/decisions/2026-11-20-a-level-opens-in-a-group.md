# A level opens in a group: at least 4 close units together, no question before

Date: 2026-11-20. PR: #PR. Rules or docs touched: L4; docs/LEARNING.md "A level opens in a group", "Opening pace",
"First meeting with a genus", the species sections; docs/spec/model.md; docs/FISH_PATH.md "Unlock rules"; ROADMAP.

## Context

Below the subject's own level (fish scientific genera, species by their common or scientific names, sea slug species)
the path opened one unit at a time, the first as soon as one parent reached Advanced (the rank share's cap was above 0),
and its question then offered three units of the same level never opened (`model.js` `distractors` widens a ranked
class to every unit of its rank). The base level already starts with four units on cards (`INTRO.START`).

## Decision

Pierre, 2026-11-20, from the app (Reports): sea slugs, «aucun intérêt de n'ouvrir qu'une seule espèce et puis demander
de l'identifier parmis d'autres espèces pas ouvertes. Au minimum 4 espèces proches ouvertes»; fish, «Lorsqu'on ouvre un
niveau taxonomique il faut au moins 4 items ouverts avant de commencer à poser des questions. Sinon c'est juste trop
facile»; sea slugs, «Le mode espèce arrive bien trop tôt».

A level opens as the subject does: a group of `INTRO.START` close units on cards together, none of it before, then one
at a time as before. Integrator's calls, easy to correct: read per level, not per parent; the group drawn from the
drawn unit's parent first, then its grandparent's, then any; recorded as first cards (kind `s`, no new stored value);
a group left half-way is completed at once; the delay bound and its fallback below. Rule L4's new wording («a level
opens in a group of at least 4 close units; no question before») waits for Pierre's OK in the PR.

**The delay bound and the fallback** (integrator's call, declared before measuring). The design asked the rank share
for room for all four at once. Bound: the first species or scientific genus asked no more than 2x later (in answers)
than before, per profile, in the rated world. Fallback if breached: the four open together as soon as each would have
had room alone (the rule before). Measured (rated world, fish, one seed per profile, 3,000 answers, exploratory): the
first species came 1.2x to 6.9x later (strong RA 215 → 1,473, expert 314 → 843, lecture RA 806 → 2,321), the bound
breached, so the fallback is what ships; the level-2 check in the PR is on it.

## Consequences

`model.js` `lvlNeed`, `openFresh`, `openGroup`, `levelTop`; `app.js` `lvlNext` (four of a parent's
next units in play while the level is short); `quiz.js` `planPhoto`, `introStart`, `introShow` (no Open all on a group,
its note), `quizPhoto` (a group waits as a card of the path); `tools/ratedworld.js` mirrors it and measures `uo`;
`tools/learncmp.js` `unopen`, `firstGen`, `firstSp`. No `core.js`, no `Code.gs`, no rules version (no answer is weighed
differently, rule D5), no player record changes.
