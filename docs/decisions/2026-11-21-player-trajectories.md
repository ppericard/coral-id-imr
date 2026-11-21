# Player trajectories: the profiles' behaviours on windows of a player's whole history, Learning › Trajectories

Date: 2026-11-21. PR: #1401. Rules or docs touched: A3, D2; docs/spec/analyses.md, docs/spec/analyses-method.md,
docs/spec/admin.md.

## Context

The multifactor visualisation study's §5 is built (items 1-8). The ROADMAP row "Analyses: structure views" kept one later
item, "whole-history learning trajectories per player (the profile features are built to be reused)", and Pierre asked for
it on 2026-11-05 (Q78, a follow-up of Q71: the profile uses a player's last 300 answers).

## Decision

Build it as a view of the Learning tab (rule A3: no new tab). Pierre, 2026-11-05 (Q78, docs/ANSWERS.md): "player
learning trajectories from first answer to now as a later analysis level".

- The profiles' behaviours but the learning slope (a slope needs the whole range of practice) on successive windows of
  100 answers or more that end with a session (a window cut inside a session would end it at the cut: Codex's review of
  #1401), every window of every player a unit of one fit, so each window is read against all windows. A player needs
  two windows, 3 players are needed; the 60 players with the most answers, the newest 40 windows each, are kept.
- Descriptive, no verdict, outside the correction; the typical player is the median over the players that have the
  window (from 3); up or down is a last window against the first beyond half a standard deviation. Admin only, names from
  Players (rule D2). The window, the caps and the threshold are the integrator's call, easy to correct.
- The corals' page now; the fish and sea slug pages list it in `core.js` `SUBJECTS` `admin` once the PR holding `core.js`
  has merged (rule W27).

## Consequences

`analysis.js` `trajectories`, `TR`, a last analysis `traj` (`AV` 17); `admin-analyses.js` `anTraj`, `lines` takes a
series class and title; `admin.js` the Trajectories view. Tests: `tests/analysis-trajectories.test.js`, the admin smoke.
