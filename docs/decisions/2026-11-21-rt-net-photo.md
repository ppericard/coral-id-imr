# The player's time net of the photo's: a right answer's z less its photos' time term, a silent replay

Date: 2026-11-21. PR: #1414. Rules or docs touched: L1, D3, D4, D5, D6, S1; docs/LEARNING.md "The player's time net of the
photo's", "Response time", "The photo's time term"; docs/spec/sync.md "Scoring".

## Context

Step 1 (#1357) gave each photo a time term: how much longer than their own habit trusted players take on it, a shrunk
mean in log seconds. A right answer's ability steps were still weighed by the player's own time against their habit
(`rtWeight`), so a photo slow for everyone made every player's right answer on it weigh less. The decision record of
step 1 left three implementation choices open for step 2 (docs/reviews/2026-11-21-response-time-understanding.md).

## Decision

- Pierre, 2026-11-21 05:48 (Q452): «si la lenteur vient d'une photo dure pour tout le monde, c'est injuste pour lui.
  […] il faut recalculer la progression de tous. On peut le faire en silence, c'est pas grave.» A direction, not a
  formula.
- Integrator's call, easy to correct (each the plainest reading of that direction, nothing added):
  - **Which z**: `rtWeight`'s own z (log seconds against the player's median over their earlier timed answers), its
    baseline unchanged; moving it to the photo term's (right answers only, the format cell out) would be a second rule
    change Q452 does not ask for.
  - **The form**: z − ti, ti the mean over the question's photos of their served time term (a photo without one: 0).
    The term is already a shrunk estimate of the photo's part of z, in the same log seconds, so it is taken off once,
    with loading 1: no `C`, no fade, no V(L) (they turn the terms into a difficulty or weigh the photo's own estimate).
    Symmetric: a fast answer on a photo fast for everyone earns less.
  - **The enlargement term**: out (a rate, not seconds).
  - **Mechanics**, after rules version 8's format offset: the game logs the term in the scoring record (`i`, kept at 0),
    the replay takes the logged one, else the terms served now (`replayProgress` photos), so every past coral answer is
    netted; rules version 13 (corals), 6 (fish), 3 (sea slugs), no card (rule D6, Q452 «en silence»); the app nets and
    logs only from the script that stores and replays it (`RTNET_SHEET`, rule D4).

## Consequences

- The fish and sea slugs' replays read no pooled photo numbers (by design: their answers carry their scoring record),
  so only their answers logged from the new script on are netted; their past answers keep their weight. Giving those
  replays the served terms is a follow-up, not built.
- The replay nets a past answer by today's term, which holds that answer's own time (shrunk); the live game nets by the
  term it read before the answer. The real-log check reports both.
- On today's log the bars (the domain score) do not move: the time weight moves only the ability steps; the global
  level moves by a few hundredths (LEARNING.md "The player's time net of the photo's").
