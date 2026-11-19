# One engine, step 2: replay's features named, the one-tap question and the notices the engine's

Date: 2026-11-19. PR: #1226. Rules or docs touched: S1; docs/spec/subjects.md "The registry", "Sync and replay per
subject"; docs/spec/cards.md (the notes, the apology); docs/spec/sync.md and docs/LEARNING.md (the one-tap question);
docs/spec/fish-game.md, docs/spec/seaslugs.md, docs/LEARNING.md (the circle-3 threshold); ROADMAP "One engine for every
subject, what is left".

## Context

Pierre, 2026-11-19 05:15 Manila: one engine for every subject. Rule S1, as he OK'd it at 06:58: "A difference between
subjects is declared and named in one place, whatever its form (data, a parameter, a feature switched on for some
subjects, or a patch), and never hidden in the shared code as a test on the subject." At 10:33: "Il faut juste
identifier les spécificités de chaque matières et voir comment les implémenter, soit avec des paramètres, soit avec des
bouts de codes spécialisés." The [one-engine audit](../reviews/2026-11-19-one-engine-audit.md) found one corals-only
flag, `SUBJECTS` `replay`, switching six unrelated features, the circle-3 threshold hardcoded in `app.js` as `FISH_C3`
for the fish and the sea slugs, and the recalculation notice tied to the first subject by its place (§1 rows 1.1, 1.4-1.6,
4; §3 step 2).

## Decision

- What the sheet computes for one subject stays a declared `core.js` `SUBJECTS` field, on the corals as `replay` was:
  `hold` (the sheet's opening hold), `offsets` (the sheet's photo memory and format offsets, `model.js` `pmem`, `pfmt`),
  `anonBase` (the sign-in baseline `ANONB`). `replay` keeps the sheet's first replay path and the subject of an
  unlabelled row. The circle-3 threshold is `SUBJECTS` `gate` `c3` (`TREE_GATE`), read by `app.js` `treeC3`.
- The one-tap question is an engine feature, asked in every subject. Pierre, Q436, 15:54: «Je ne comprends même pas
  pourquoi ça n'est pas juste une fonctionnalité du moteur et qui marche donc déjà pour toutes les matières... Donc oui
  bien sur, et il faut mutualiser le code tant que possible». Its events were already tagged by the page they were
  given on (the Page column, the subject's address); the admin's table reads each subject's apart.
- The apology card and the update notes stay as templates of the engine. Pierre, 15:55: «ça veut pas dire qu'il ne faut
  pas garder les templates. On ne sait jamais quand on en aura besoin». A card or note has no subject and shows in every
  subject, unless its own data names one (`subj`, `core.js` `subjIn`): the two progress notes of `RECALC.L` speak of the
  corals' genera; the typed-questions note (a mode of every subject) and the apology (its window ended 2026-11-17) carry
  none. One card shows the run of notes one subject can show (`core.js` `noteRun`).
- The field names, `subjIn`, `noteRun`, keeping `replay` for what the sheet's own code still reads, and which notes
  carry a subject: the integrator's call.

## Consequences

- The corals see the same notes as before (`tests/noterun.test.js`); a fish or sea slug player now gets the one-tap
  question, and the typed-questions note in their own subject if not seen yet. No progress moves: no rules version
  (rule D5). The sync script's own code is unchanged; its copy of `core.js` carries the fields (rule D3).
- `hold` and `offsets` stay on `replay`'s subject while the sheet computes them for it alone (the audit's steps 5 and
  8); `anonBase` for every subject is step 6.
- A later card or note for one subject is a data entry with its `subj`, no code. The S1 test reads a `subj:` value as a
  declaration, lists the remaining flags with their ROADMAP row and no longer lists the recalculation notice's exception.
