# The course's words in `ORG`: the core writes them from one place, at today's values

Date: 2026-11-25. PR: #1574. Rules or docs touched: W21 (cited, unchanged), S1, D3; docs/spec/storage.md "The app's name",
docs/spec/site.md, docs/ARCHITECTURE.md "Names, storage keys and caches", docs/spec/data.md "Not in the layer yet".

## Context

The organisation's and the app's names were already in `core.js` `ORG` (`short`, `name`, `app`, `appShort`), but the
course's own words ("the IMR course", "IMR lecture notes", "the IMR fish presentation", "To check with an IMR trainer")
were typed in the code, about 250 lines in 40 files. So IMR-owned wording could not be separated from the core app, the
outcome REE-34 tracks (Pierre, 2026-11-08, #737: «les droits, ils me sont à moi à 100 %»; «quitte si besoin à licencier
une version IMR à IMR»). The scoping comment on REE-34 (2026-11-25) splits the move into PRs; this is the first, the core.

## Decision

Integrator's call, easy to correct (AGENTS.md "Working mode"; the scope in the integrator's calls on REE-34, 2026-11-25):

- `ORG` gains the course's words, each a whole name without its article, at exactly today's values: `course` (IMR
  course), `lecture` (IMR lecture), `lectureRef` (IMR Lecture 6), `fishPres` (IMR fish presentation), `list` (IMR list),
  `slate` (IMR slate), `benthic` (IMR benthic slate), `trainer` (IMR trainer). A phrase not listed builds on `ORG.short`
  ("At IMR or elsewhere", "the IMR survey families"). `ORG` stays one flat literal of quoted values:
  `tools/rename_app.py` reads it.
- The core's own texts read them: `core/subjects.js` (the subjects' lecture, content slots, welcome answers, photo
  origin, fish circles), `core/achievements.js` (the achievements' descriptions), `core/tree.js` (a family's name line
  and its look-alike lines' default source). The IMR edition's texts are byte for byte the ones before: nothing a player
  or the admin sees changes, and the sheet script's copy changes the same way.
- Left as they are (costly to undo, so Pierre's call before any change): the data's values that hold the words (the
  source lines "IMR Lecture 6, slide …" and "IMR fish presentation, …"), which code matches by deriving the prefix from
  `ORG`; the identifiers and keys (`imr` fields, `cqByIMR`, `imr-photos-v1`, the anonymous ids' salt, the lecture
  photos' ids); the sheet backups' pCloud folder name (`Code.gs` `BACKUP.PARENT`); and the rules versions' records
  (`core.js` `RVS` `why`).
- W21 keeps its words (extending it to the course's words would change a standing rule, which needs Pierre); the spec
  carries the extension.
- A guard, `tests/orgwords.test.js`, counts the word "IMR" still written in the code outside comments, per file, against
  the lines left to move (the players' pages, the admin's, the Lab) and those that stay with their reason, so the count
  only shrinks.

## Consequences

The players' pages (REE-34 PR 2) and the admin's (PR 4) move their texts to these fields with no further change to the
core. A fork's edition sets the fields in `core/keys.js` and runs `python3 tools/sync_core.py --fix`; the indefinite
article before a word ("an IMR trainer") stays in the code, so a fork whose words start with a consonant sound reviews
those few lines. The Lab's course citations ("(IMR Lecture 6)") are content and are not in REE-34's plan yet. Specified
in docs/spec/storage.md "The app's name".
