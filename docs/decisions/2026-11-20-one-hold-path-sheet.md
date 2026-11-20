# One opening hold path on the sheet for every subject; the app still adopts the corals' only

Date: 2026-11-20. PR: #1346. Rules or docs touched: S1; docs/spec/sync.md "The opening hold"; docs/spec/subjects.md
"The registry", "Sync and replay per subject"; ROADMAP "One engine for every subject, what is left".

## Context

Pierre, 2026-11-19 05:15 Manila: one engine for every subject, with only small per-subject parameters. The
[one-engine audit](../reviews/2026-11-19-one-engine-audit.md) §1 row 1.4: the sheet's opening hold counted the corals'
answers only (`Code.gs` `hold_` read `answerRows_`), while the fish and the sea slugs held on the device alone; §3 step
5: `hold_(sid)` per subject, a sheet version and a rule D4 gate. Step 2 named the corals' feature `SUBJECTS` `hold`
([record](2026-11-19-one-engine-named-fields.md)). `sync.js`, where the app adopts the hold (`holdAdopt`), is held by
another open PR (rule W27), so the step is built in two PRs, the sheet first as rule D4 orders.

## Decision

- One path on the sheet: `hold_` takes the subject, reads its answers (`subjRows_`) since its own reset, and is cached
  per player and subject; a light load or save reply carries `holds`, `{subject: {h, ids}}`, for every subject the
  sheet replays. `hold` and `holdIds` stay the corals' as before.
- `holds` only for a light request (every app since the lighter saves): an older app never reads it, and without
  `light` each subject's ids are its last 500, several KB per subject in every reply. Measured on a stub with 600
  answers in each of three subjects: a light reply grows by about 130 characters; a non-light reply is unchanged.
- The two-PR split, the reply's field name and the light-only rule: the integrator's call, easy to correct.

## Consequences

- No app reads `holds` yet, so nobody's hold, opening or progress moves; no rules version (rule D5).
- Left, the app's half: `sync.js` `holdAdopt` takes each subject's own hold from `holds` once the script reports the
  version this PR gets (rule D4), then `SUBJECTS` `hold` goes and the S1 test drops it from its flags.
