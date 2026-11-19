# The Look-alikes deck and Compare for every subject

Date: 2026-11-19. PR: #1278. Rules or docs touched: S1, C2, L14; docs/spec/front-end.md "The pages" (Learn ›
Look-alikes), docs/spec/fish-game.md, `docs/reviews/2026-11-19-modes-every-subject.md` (PR 3), ROADMAP "Every game mode
for every subject".

## Context

The Look-alikes deck and Compare read the corals' own shapes (`pairs()`, `DATA.gen` views, `MONT_V`, the Coral Finder
source tag, the Coral ID Key criteria), so `SUBJECTS` closed them for the fish and the sea slugs. Plan:
`docs/reviews/2026-11-19-modes-every-subject.md`, PR 3.

## Decision

Pierre, 2026-11-19 20:34 Manila (Q437): «évidemment oui, il faut ouvrir tous les modes de jeu aux différentes matières,
à toutes les matières. Et oui, c'est du code commun.»

Choices made while building, not decided with Pierre, each easy to change (integrator's calls):

- **What each subject declares, in `UNITS`**: `deck` (which pairs make the deck), `inGame` (which units Compare may show)
  and `cmp` (its sources' words for the ? text, whether a unit's tips are clues, the tag, line and fold that follow its
  name). The shared pages ask `UNITS[SUBJ.id]`; none tests the subject (rule S1).
- **The deck's pairs**: the corals' classic pairs as before; for the fish and the sea slugs their declared pairs, each of
  which a source names (the IMR presentation's slide, the Sea Slug Forum, Nudi Pixel, a paper). Pairs only iNaturalist
  shows stay in the duels (rule C2: no pair without a source).
- **One photo a side** for a subject with one view (`SUBJECTS` `views`): the admin's pick (`curation.json` `mont`
  entry of the subject, its `a`, `b`, `hide`, `v` as a phase), else the first adult photo of each; Compare shows the
  same two photos, with no view heading.
- **Sources in their own names**: `srcTag` says "IMR lecture", "IMR fish presentation" or "Coral Finder" for those, and
  the data's own words for the others; a unit's tips carry the source their label names.
- **A unit with no marks** (a sea slug genus with none yet) shows "No ID marks written for it yet." in Compare and no
  tips in the deck, never its species list as a clue.
- **The tell-apart line** of a pair, with its sources, above Compare's columns where a record has one (`quiz.js`
  `pairText`): the fish's IMR lines and the sea slugs' lines; the corals' Compare gains it too where its data has one.
- **The answer's Compare link** follows `SUBJECTS` `pages` and shows for two units the subject has (`inGame`), replacing
  the `fish = !!g.name` data-shape test.

## Consequences

- The fish and sea slug players get a Look-alikes tab under Learn and the "Compare them" link after a mix-up; the
  admin's Photos › Look-alikes picks for the fish now show on the site.
- No change to the scorer, the replay, any stored record or the draw: no rules version (rule D5), no learning check
  (rule L11, level 0: a new door to existing content). The page is a reading page, so no count of answers moves.
- `tests/subjects.test.js` (cmp open for every subject, the addresses round-trip), `tests/lookalikes.check.js` (run by the
  fish and sea slug smokes: sources named, one photo a side, one screen, no coral word, the answer's link).
