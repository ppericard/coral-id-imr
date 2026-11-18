# Decisions found in the comments of tests/ (sixth pass)

Date: 2026-11-19. PR: #1157. Rules or docs touched: W19.

## Context

The comments of the test files carried dated quotes of Pierre and the decisions they made, beside the checks they
shaped. This sixth and last pass of the cleanup (after `2026-11-19-decisions-from-comments-tests-5.md` and the passes
before it) rewrote those comments to say what each test checks (rule W19: history stays in git and the PRs). Each quote
whose words are found nowhere in `docs/` is kept here, one line each: the date, Pierre's words, what it decided, and
where it lives.

## Decision

- 2026-11-08 (Q312), of the device on every answer: "Oui, cette nuit". Decided that the Answers tab gets a last column,
  Device, built that same night (docs/archive/sheet-history-detail.md, docs/spec/sync.md). Checked by
  `tests/devanswers.test.js`.
- 2026-11-18, of the fish genera of circles 2 and 3: "d'abord le contenu". Decided that their presentation and ID marks
  are written and sourced before their genera open as units (`tools/fish_genus_marks.json`). Checked by
  `tests/genusmarks.test.js`.
- 2026-11-05, of Players › Activity › Recent sessions: "what the player made of the session". Decided that a session
  unfolds into the facts of what the player did in it (`admin-journey.js` `sessionFacts`, docs/spec/admin-players.md).
  Checked by `tests/session.test.js`.
- 2026-11-03, of the one-tap question: "varied questions about the same concept, asked now and then". Decided the bank of
  items and its rotation (`core.js` `PULSEQ`, docs/spec/cards.md). Checked by `tests/pulse.test.js`.
- 2026-11-17, of the sea slugs' ID marks: "complete what is missing for the nudibranchs". Decided the sourced marks of
  `tools/seaslug_cues.json`, built into the sea-slug genera and families. Checked by
  `tests/seaslug-cues.test.js`.

## Consequences

None in the code: the comments now describe the code, and these lines keep the why.
