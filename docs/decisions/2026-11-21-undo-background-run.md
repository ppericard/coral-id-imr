# Admin: an auto-sort run that lands after the admin's clicks is laid onto his Undo steps, not one of its own

Date: 2026-11-21. PR: #1408. Rules or docs touched: docs/spec/admin-photos.md (the auto-sort's Undo), rule A1 applied.

## Context

The auto-sorts (`admin.js` `autoRun` for the corals, `fishAutoRun` for the auto-sort's subject) save their run as one
Undo step (`saveDraft`). The fish run lands late: it waits for the page to be idle, then reads a 9-million-character
file. The corals' run waits for the suggestions when the admin opens on a Players page. Either can land after the
admin's first clicks. Its step then sits on top of his. The first Undo takes the run back instead of his last click, and
undoing his clicks takes the run with them (seen in #1348's Codex rounds). #1348's first attempt laid the run onto the
newest step only, and was cut under rule W27 after three findings:
1. the run must be carried into **every** Undo and Redo step;
2. a map the admin's click created must keep the run's entries when that click is undone;
3. the startup import of the site's flags must not count as the admin's action.

## Decision (integrator's call, easy to correct; REE-53)

- **The admin has acted** (`ACTED`) from his first save of the visit. Saves nobody clicked do not count:
  `saveDraft(true)`, used by the startup import of the site's flags (`importFlags`) and by a run itself. Undo steps
  restored from before a reload also count: they are his clicks.
- **Before he acts**, a run is one Undo step, as before.
- **After he acts**, `saveRun` lays what the run changed (the draft against the step it started from) onto every Undo
  and every Redo step, and onto the draft, with no step of its own. `layRun` goes key by key down the maps:
  - a value that a step holds differently from the run's starting point stays the step's (his click wins);
  - a map that a step lacks is created there for the run's entries (finding 2);
  - a map that the run empties stays `{}` (`merge3` reads a missing map as removed).
- Undo and Redo then move his clicks only. A run's decisions are taken back one by one (Auto › Undo: `autoUndo`,
  `fishAutoUndo`), as before.

Not changed: the run's decisions, their log, and the stamp of his answers (`autoWhen` compares the next click with
the draft that now holds the run). Rule A1 holds: everything stays in the draft until Publish.

## Consequences

`tests/undorun.test.js` covers the three findings and a value his click set in a Redo step. The cost of laying the run
onto up to 300 steps: each step is parsed and written once, once per run (at most two runs per load).
