# The custom quiz for every subject: one key per subject, the groups declared in `UNITS`

Date: 2026-11-19. PR: #1277. Rules or docs touched: S1, D3, D4, D7; docs/spec/quiz.md "Custom quiz",
docs/spec/subjects.md (`pages`), docs/spec/storage.md, ROADMAP "Every game mode for every subject", the plan
`docs/reviews/2026-11-19-modes-every-subject.md` (PR 2).

## Context

The custom quiz saved its selection under one fixed coral key, grouped its tiles by the IMR lecture and printed raw ids
and the word "genera"; the fish and the sea slugs had no such tab. PR 1 (#1265) opened the Duel tab and added
`SUBJECTS` `closed`; this is the plan's PR 2.

## Decision

Pierre, 2026-11-19 20:34 Manila (Q437): «évidemment oui, il faut ouvrir tous les modes de jeu aux différentes matières,
à toutes les matières. Et oui, c'est du code commun.»

Choices made while building, not decided with Pierre, each easy to change (integrator's calls):

- **One key per subject**: `subjKey(id, 'custom')`, which is the corals' `reefid-sync-coral-custom` already, so their saved
  selections stay. `sync.js` merges the latest selection and clears it at sign-out for each subject (rule D7).
- **The groups are one `UNITS` member**, `cq` `{by, about, src, groups}`: the corals' IMR lecture groups, the fish's ID-key
  groups (a species or scientific genus in its family's group), the sea slugs' families (`unitsByParent`, shared with the
  Genera page). The first view's name is the subject's ("IMR groups", "ID groups", "Families").
- **Names and words are the subject's**: `uname` / `unameT` on the tiles, the search (which also reads English names, as
  information) and the menus; `SUBJ.one` / `SUBJ.many` in the texts; each subject's ? text adds one shared paragraph
  (`customPlayLede`).
- **No English name beside a sea slug family** on the picker: the quiz shows scientific names before an answer.

## Consequences

- The fish and sea slug players get a Custom quiz tab under Practice.
- No change to the scorer, the replay or any stored record format: a custom-quiz answer is a photo-quiz answer logged
  `quiz|s` for every subject already; no rules version (rule D5), no learning check (rule L11, level 0: a new door to an
  existing question type). The sheet script computes nothing new: the new keys are stored as every `reefid-sync-` key is,
  so no gate on its version (rule D4); the script's `core.js` copy follows (rule D3).
