# Each subject adopts its own opening hold from the sheet

Date: 2026-11-20. PR: #1349. Rules or docs touched: S1, D4, D5, L12; docs/spec/sync.md "The opening hold";
docs/spec/subjects.md "The registry", "Sync and replay per subject"; ROADMAP "One engine for every subject, what is
left".

## Context

Pierre, 2026-11-19 05:15 Manila: one engine for every subject, with only small per-subject parameters; rule S1 as he
OK'd it at 06:58. The [one-engine audit](../reviews/2026-11-19-one-engine-audit.md) §3 step 5: one opening hold path
per subject. The sheet's half ([record](2026-11-20-one-hold-path-sheet.md), #1346, script v210) sends `holds`,
`{subject: {h, ids}}`, in every light load and save reply; the app still adopted the corals' alone (`SUBJECTS` `hold`),
the fish and the sea slugs keeping each device's own sum.

## Decision

- `sync.js` `holdOf` reads each subject's own hold from `holds` once the reply's script is at `HOLDS_SHEET` (rule D4);
  before it, or in a reply without `holds`, the replay subject's alone from `hold` and `holdIds`, exactly as before.
  `holdAdopt(S, j, log)` takes it as that subject (`inSubject`), with this device's queued answers of that subject only;
  a subject the reply leaves out keeps the device's. The load adopts each merged subject's (after its reset check), the
  save every subject's.
- `SUBJECTS` `hold` goes, and with it its entry in `tests/subject-neutral.test.js`'s flags (rule S1: one path).
- `HOLDS_SHEET` is the version this PR gets, not 210: a gate a PR adds is main's `VERSION` + 1 (rule D3,
  `tools/check_versions.py`), and `holds` exists from 210, so the later gate only waits for the script's next update.
  The integrator's call, easy to correct.
- No rules version (rule D5): the hold is a device value rebuilt from the log at each sync, not the progress the replay
  makes (`core.js` `replayProgress`); a rules version would not carry it, the next load or save does.

## Measured (rule L12, level 1)

The real answer log and the saved copies, read-only through the Sheets connector on 2026-11-20 (6,653 answers; nothing
committed): each subject's hold as `Code.gs` `hold_` makes it (that subject's rows, no surprise card, no `|w`, in time
order) against the same sum over each device's own rows (column Device; rows from before it count as one more device),
players as the unit. No saved copy holds a reset, so every sum runs from the first answer. Every fish and sea-slug row
is a `quiz` answer with its expectation, all counted on the device too (`quiz.js` `recordAnswer`, `holdStep`): no
answer the sheet counts that the device does not.

| Subject | Answers | Players | On 2+ devices | Device sum ≠ sheet's | Largest gap | Crosses 1.5 on some device | On the last device used | Held by the sheet |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fish | 2,816 | 9 | 4 | 3 | 2.87 | 1 | 0 differ | 2 |
| Sea slugs | 168 | 2 | 0 | 0 | 0 | 0 | 0 differ | 1 |
| Corals (already adopted) | 3,662 | 15 | 6 | 4 | 0.94 | 2 | 0 differ | 2 |

On the device each player used last, the device's own sum is the sheet's for every player of every subject: nothing
moves there. What moves is an older device of a multi-device player, which now takes the player's hold (one fish
player's other device goes from 0 to the 2.87 the player is held at). `tools/learnsim.js` plays one signed-out device
and never reads a sheet reply, so the simulation cannot see this change.

## Consequences

- A signed-in fish or sea-slug player's opening hold follows them from one device to another, as the corals' did.
- The sheet's `hold` and `holdIds` stay for an app from before `HOLDS_SHEET`.
