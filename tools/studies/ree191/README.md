# REE-191 pace for fast learners: the study scripts (recovered, reference)

Recovered on 2026-11-22 from the Claude Code integrator's temporary workspace (Linear REE-231). The study is the Google
Doc "Pace for fast learners — study (2026-11-22)"
(https://docs.google.com/document/d/13zgH3xFHoMy646wm2MEANwPGDh9MOuSU3rJSCYiUvUE/edit, Drive Reef_ID folder, linked
from REE-191), created on 2026-11-21 about 21:35 Manila from the workspace's `doc.md` (its source, not kept here). **These scripts were not reviewed or tested as tools**; they are kept so the study's
figures can be traced and recomputed. They are not wired into CI.

**Engine:** `origin/main` at `7ede594` (2026-11-21 20:53 Manila), passed as `<main worktree>` (scripts `require` its
`core.js`, `model.js` constants and data files). Since #1452-#1457 `core.js` is built from `core/*.js`; a checkout of
`7ede594` has the single file.

**Inputs (not in the repository, private):**

- `answers.json`: the sync sheet's Answers tab (7,445 rows, read-only on 2026-11-21 about 21:00 Manila through the
  Sheets connector, in chunks) combined and pseudonymised by `combine.js` (P1, P2… by first appearance; the name map is
  never written). **Not kept here.**
- `events.txt`, `replayed.txt`, `replayedfish.txt`, `progress.txt`: raw copies of the Events, Replayed, Replayed Fish and
  Progress data tabs, used only by `events.js`, `pulse.js`, `validate.js` and `explore*.js`. **They hold names and are
  not kept anywhere shared.** To reproduce, read the tabs again read-only.

**Scripts (header comment in each gives its command):**

| Script | What it computes |
| --- | --- |
| `combine.js`, `peek.js`, `explore2.js`, `explore3.js` | build and inspect the extract (keys only, no values) |
| `pace.js` | each player's shown % against answers, per subject, replayed with the engine (`node pace.js answers.json <main> [maxN]` → `pace-out.json`, per pseudonymous player: not kept) |
| `summary.js` | group summaries of `pace-out.json`: "strong" = first 50 answers ≥ 94% right and median ≤ 2.6 s (declared from Pierre's words "fast and right from the first answers"), "others" = 100+ answers (`summary.txt`, kept) |
| `mech.js` | mechanics, no learner model: right answers in a row a unit's bar needs for 50%, 80%, 85%, by format |
| `sim2.js`, `sim3.js` | mechanics: the corals' shown % of an always-right player under three openings; `sim3.js seeds` runs 10 seeds (11, 23, 37, 41, 53, 67, 71, 83, 97, 101), the same seeds per variant (`sim2.txt`, `sim2typed*.txt`, `sim3.txt`, kept) |
| `forced.js` | each player's rows replayed as they were, then with every answer forced right (what limits the %: the questions served or the misses) |
| `served.js` | what the game served in answers 51-300 (difficulty against the unit, by format) |
| `trigger.js` | would a typed share keyed on the unit's ability (threshold T) fire, and when |
| `offsets.js` | the format offsets the game logged on typed and 4-plausible coral rows |
| `pulse.js`, `events.js` | the one-tap question answers by level; pace-related events |
| `validate.js` | this study's replay against the sheet's own replay (the Replayed tabs): the % each gives |

**Kept outputs:** aggregates only (`summary.txt`, `sim2*.txt`, `sim3.txt`). Per-player outputs (`pace.txt`,
`pace-out.json`, `served.txt`, `validate.txt`, `forced.txt`) carry pseudonymous labels for about 15 players and are not
published; they stay reproducible from the inputs above.

**Reading the results (cautions from the study and the independent review):** the gains after 200 answers are
simulation predictions, not observed learning or boredom; the log has 22 typed coral and 94 typed fish answers and
almost no true beginner; for fish the displayed % has a structural ceiling (families alone reach 50%), which more
typed questions do not remove; the proposed ability threshold and trigger are hypotheses with false-positive risks.
