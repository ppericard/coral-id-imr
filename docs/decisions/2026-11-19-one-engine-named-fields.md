# One engine, step 2: the features `replay` switched become named `SUBJECTS` fields, at today's values

Date: 2026-11-19. PR: #1226. Rules or docs touched: S1; docs/spec/subjects.md "The registry", "Sync and replay per
subject"; docs/spec/fish-game.md, docs/spec/seaslugs.md, docs/LEARNING.md (the circle-3 threshold); ROADMAP "One engine
for every subject, what is left".

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

Each feature is its own `core.js` `SUBJECTS` field, on the subjects replay was on (the corals): `hold` (the sheet's
opening hold), `offsets` (the sheet's photo memory and format offsets, `model.js` `pmem`, `pfmt`), `anonBase` (the
sign-in baseline `ANONB`), `pulse` (the one-tap question), `sorry` (the apology card), `recalcNote` (the recalculation
notes). `replay` keeps the sheet's first replay path and the subject of an unlabelled row. The circle-3 threshold is
`SUBJECTS` `gate` `c3` (`TREE_GATE`, the fish's and the sea slugs' one value), read by `app.js` `treeC3`. The field
names, and keeping `replay` for what the sheet's own code still reads through `replaySubject`, are the integrator's
call (names inside the code).

## Consequences

- No behaviour changes: every field holds the value `replay` gave it (`tests/subject-neutral.test.js` checks each
  against `replay`, and the gate's values), so nobody's progress moves and no rules version is needed (rule D5). The
  sync script's own code is unchanged; its copy of `core.js` carries the new fields (rule D3).
- `hold` and `offsets` stay on `replay`'s subject while the sheet computes them for it alone; giving them to every
  subject is the audit's steps 5 and 8. Turning the app-only ones on for another subject (the audit's step 6, and the
  pulse, apology or notes if a subject needs them) is now a change of a field's value, not of the code.
- The S1 test lists each new field with its ROADMAP row and drops the recalculation notice's listed exception.
