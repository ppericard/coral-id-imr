# Decisions from the admin's code comments: kept here when the comments were cleaned

Date: 2026-11-18. PR: #1132, the comment clean-up of `admin.js`. Rules touched: none (rule W19: history stays in git and the
PRs, decisions in `docs/decisions/`). Docs touched: none.

## Context

The comments of `admin.js` carried Pierre's dated words as a changelog. The clean-up keeps in the code what it does and
why; a dated decision whose words were in no doc moves here, one line each, so it survives. Decisions already
documented (docs/ARCHITECTURE.md, docs/LEARNING.md, docs/PAGES.md, ROADMAP, the rules, `docs/archive/`) are not repeated.

## Decision

Each line: the date, Pierre's words as written (French where he spoke French), what it decided, where in the code.

- 2026-11-01: "weigh the genera that really lack photos more strongly". A candidate's weight in the Candidates queue is
  1 / (1 + the game colonies its genus already has in its view), cubed: on the first 50 of All, the cells of 0-2
  colonies went from 12 candidates to 30, those of 8 or more from 11 to 2. `admin.js` `candQueue`.
- 2026-11-01: "now that beta testers come, I need to see and manage them". The players are managed on a tab of their
  own (Players › List), not under the statistics. `admin.js` `renderUsers`.
- 2026-11-01: "one page, sort the players by name or by score, and act on them there". One row per signed-in player,
  sortable by any column, the account tools on the row's bar. `admin.js` `UCOLS`, `renderUsers`.
- 2026-11-02, after the Candidates swiper opened on its "Pierre 0" source showing "No candidate left": an empty source
  gives way to the first source, in priority order, that still has candidates; a source whose candidates are only
  skipped or waiting in full cells stays. `admin.js` `renderCand`.
- 2026-11-03: "le crop, tu aurais pu presque le faire de manière automatique". A candidate shows the judging pass's
  suggested crop until it is added, then the crop is written to the admin's crops, where it changes as any crop; the
  admin's own crop, or Full photo, always wins. `admin.js` `sugCrop`, `ACT.addc`.
- 2026-11-05: "Players always opens Activity". A click on the Players group always opens its first tab, Activity, never
  the tab used last. `admin.js` `GROUPS` (`{fixed: true}`).
- 2026-11-06: "the Players section needs rethinking now that we have two game modes". Activity and a player's Journey
  follow the Corals | Fish switch; the list of players and Visits are one page for every subject, without a prefix.
  `admin.js` `SHARED`. (The comment cited docs/reviews/2026-11-06-admin-players-two-subjects.md, which is not in the
  repository.)
- 2026-11-06: "the players list must not depend on Corals or Fish: it is independent of the game mode, the same page
  that doesn't change between the two worlds"; "maybe fish columns and coral columns, but there may be too much:
  Journey has the details". The list: the player's own columns, then a group of columns per subject; the rest on the
  Journey. `admin.js` `UCOLS`, `SCOLS`.
- 2026-11-06 13:38: "a tag on the families and genera in the course". The fish Tree shows an IMR tag on the families
  and genera of the IMR course, and the All | IMR filter. `admin.js` `FU_IMR`, `fuTreeOf`.
- 2026-11-17: "un bouton pour supprimer aussi ou enlever tous les gens de la bêta". A beta group's line above the
  player list has Remove all beside Add all, confirmed as a bulk action. `admin.js` `renderUsers` (`gLine`,
  `data-ugnone`).
- Undated (the judging agent's runs): "remind me to launch it". The Candidates swiper reminds that the judging agent
  runs on demand when candidates wait for it. `admin.js` `renderCand` (`nJ`).

## Consequences

The code comments say what the code does now; who asked and when is here, in the docs listed above, or in git.
