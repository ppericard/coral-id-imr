# CI speed, second step: the admin 1280 smoke in three groups balanced by the measured time of each part

Date: 2026-11-19. PR: #1243. Rules or docs touched: W14, W26 (unchanged); ROADMAP "CI speed, what is left";
docs/spec/deploy.md "Tests"; follows [2026-11-19-ci-speed.md](2026-11-19-ci-speed.md).

## Context

After the unit tests went into two shards, `smoke (admin 1280 more)` was the longest job of every PR's and every merge
train's CI: 265 s median over the 14 green Smokes runs before this PR (211-317; the smoke step alone 246 s), against 165 s
for `admin 1280 main` and 130-136 s for the next ones (`fish fresh`, `fish main`, the `pages` groups). A merge train waits
on Smokes, so the longest job sets its time. The `more` group held three parts of `tests/admin.smoke.js` (players,
photos, seal), `actions` another job of its own.

## Decision

Integrator's call (CI layout, an implementation detail; easy to correct), following the CI-speed record's "measure, then
split without weakening a check":
- Each part ran in its own job once (one `workflow_dispatch` run on the branch, with each part's time printed, now kept:
  `admin.smoke part <name>: N s`). In seconds: `photos` 122, `players` 80, `actions` 35, `seal` 12, plus about 25 s of
  runner start-up per job; `main` (everything that is not a part) about 140-150 s.
- The groups at 1280 are now `main`, `photos` and `rest` (`actions`, `players`, `seal`): still three jobs, so no
  runner is added, and every job is about as long as `main` or shorter. `tests/smokeparts.test.js` and
  `slot.parts` still fail when a group is in no job or a part in no group; every part still runs on every PR and train.
- `main` is left whole: it is one sequence of about 4,600 lines inside the pass, and splitting it would re-indent
  about 2,000 lines that other PRs edit; it would only take the longest job from about 165 s to the 136 s of `fish fresh`.

No check was dropped, skipped or weakened.

## Consequences

On #1243's own Smokes runs (three samples, noisy: a job's time moves 20-40% from run to run), job times in seconds:
`admin 1280 main` 160-224, `photos` 141-206, `rest` 149-160, `fish fresh` 147 at the most, the rest under 135; the
whole workflow 182 s on the run where `main` took 170 s. Before: `more` 265 s median (211-317), `main` 165 s. So the
longest job is now about 170-200 s, against 265 s, with no job added; read the medians over the next trains.
`tools/train.py` needs no change: it waits for the Checks and Smokes workflows by name. A part that grows
unbalances the groups again: the printed per-part times are what to read before moving one.
