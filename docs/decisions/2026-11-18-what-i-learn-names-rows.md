# The names choice on the What I learn card: Common names and Scientific names rows, each on or off

Date: 2026-11-18. PR: #1301. Rules or docs touched: S1, D3, D4, L11, U7; docs/spec/fish-game.md "The What I learn card:
names rows", docs/FISH_PATH.md "Which names a player learns", docs/DESIGN.md "Screens", docs/ROADMAP.md.

## Context

The names choice of 2026-11-04 (common names, scientific names or both, at the fish welcome and in ⚙; "I'm at IMR" means
both) was planned as a ⚙ row replacing "Scientific names". Pierre, 2026-11-18: «il faudrait pouvoir controler les
niveaux de jeux par mode (coraux, poissons, limaces, ...). On ne peut pas continuer à empiler des settings dans le menu
déroulant», then, on where the choice lives (Q396): «il faudra que ça soit facilement visible et accessible pour les
joueurs». The study of the card is #1071 (docs/reviews/2026-11-18-what-i-learn-study.md).

## Decision

Pierre's answers to the study, 2026-11-18 morning, given as the study's letters: Q400 «D» (the card on My progress, a
line on Home opens it), Q401 «A» (a level turned on comes as its parent reaches the usual threshold, never sooner), Q402
«A» (turned off: progress kept, one score scale), Q404 «A» (every names row can be turned off, a families-only player
allowed). On 2026-11-19 10:12 he said «ok» to "the levels each subject teaches are set on its What I learn card, never
as more ⚙ rows".

Built here, the names rows only: the fish's Common names (the species by common name) and Scientific names (the
genera and their species), the sea slugs' Species (by scientific name), each with ⚙'s On | Off; the base level shown
as always on; the card right after the player's card on My progress; "What I learn ›" on the kicker row of Home's
Learn door; ⚙'s Scientific names row and My progress's "Turn on scientific names" box removed (the card replaces both).
The integrator's calls, easy to correct: the layout (one line on phones, open on desktop), the wording of each row, the
Home link on the kicker row at every size (the study measured that a separate line makes Home scroll at 360 × 640), the
sea slugs' row (the plan's §3 reading of Q396).

How it is built (the agents'): a row is on while not turned off on the card and either turned on or bringing its units
by itself, so no record's draw changes until a switch is tapped; the card's Off stops the units a set brings by itself
(an IMR player's IMR genera, the species), a card's "Not now" keeps them; the card's On never sets `Q.sciH`. Q240 (by
hand before Advanced, from Open Water, 2026-11-08) stays for the records that have it, but nothing sets it any more:
Q401 A is the later, more general answer and says "never sooner".

## Consequences

- The corals have no names row, so no card and no Home link yet. The card's other levels (Bonus genera, Beyond the IMR
  course, Open all, each level's standing) and the names step at the fish welcome stay in ROADMAP "Fish welcome
  question".
- `core.js` `SUBJECTS` `optin` gains `sp` (fish) and `ssp` (sea slugs) so the choice syncs; `mergeUsers` keeps a row
  off only where both accounts have it off (rule D3: a changes file, the version at merge). No progress moves: no rules
  version (rule D5).
- Tests: `tests/namesrows.test.js`, `tests/fish.smoke.js`; the learnsim check of rule L11 in the PR.
