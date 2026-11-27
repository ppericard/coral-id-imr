# Checks follow the question, not the size of the change: a simulation only for a mechanics question

Changes: [2026-11-18, rules wordings](2026-11-18-rules-wordings.md) ("Compute cap and checks", Q405: level 2's worlds now
for a mechanics run only); [2026-11-19, rules wordings](2026-11-19-rules-wordings.md) ("L11 over LEARNING", Q415: level
2's length the minimum for every level-2 check, L12's learnsim profiles); [2026-11-19, the check cap](2026-11-19-check-cap.md)
(level 2's figures the minimum for every check). The levels of 2026-11-08 (#735) have no record: the study's §8 names them.

Date: 2026-11-26. PR: #1616. Rules or docs touched: L10, L11, L12, `docs/rules/README.md` index, `docs/INTEGRATOR.md`
"Learning changes", AGENTS.md "Review guidelines", `docs/LEARNING.md` "Validating a learning change".

## Context

The study [reviews/2026-11-26-when-to-simulate-study.md](../reviews/2026-11-26-when-to-simulate-study.md) (#1614) read
45 engine PRs that declared a check level. A simulation changed the design in 4 and stopped 3 changes; 17 results went
to Pierre, 13 of them kept as built; the simulator or its noise misled at least 4 checks. The 2026-11-23 paragraph on what a simulation decides did not change the practice: L11's
level table still chose the check by the size of the change, and L12 asked learnsim for every engine change. The study
proposed five rules (S1 to S5, §7 and §9).

## Decision

Pierre, 2026-11-26 11:51 Manila, «ok» to each of S1 to S5, every time to the recommended option:

- **S1 (A).** The check follows the question. A regression check always; a mechanics simulation only when the study's
  §7.3 holds; no effect simulation. Effects and values go to the logic, his choice and the real log.
- **S2.** L12 without "learnsim for every change". A Data issue carries the check where the real log cannot judge yet.
- **S3.** Only a failure-sized mechanics result, a real-log reading against the change, or a cost players will feel go
  to him.
- **S4.** Each Data issue sets its own gate, proposed by the integrator in the issue; about 1,500 answers from at least 5
  players with at least 100 each (REE-304's form) when none is proposed.
- **S5.** The earlier words are superseded as the study's §8 says: Q188 (2026-11-06, "only after simulation") and L11's
  levels (2026-11-08) for effects and values. Kept: the 40-minute cap, level 3 behind his go, the regression smokes.

His caution of 2026-11-21 stays: «il faut pas non plus l'inverser complètement et le transformer plus qu'en
garde-fou». A mechanics simulation still decides a design (#1331, the held-back genera of #975); what goes is the
simulation of effects and values, where it decided nothing or misled.

## Consequences

- L11 names the question (regression, mechanics, effect, value), keeps "what a simulation decides" first, adds the
  rule for the time the real log cannot judge, and the three things that go to him. Its level table is gone from the
  rule; the run sizes remain in LEARNING.md for a mechanics run that needs a measure, with the method unchanged.
- L12 checks on the real log where it can judge; L10 says "checked like any engine change".
- INTEGRATOR "Learning changes" and AGENTS.md "Review guidelines" no longer ask for learnsim: Codex is told not to flag
  its absence.
- Q112 and Q315 (study §8) were already moot or overtaken; Q457 was overtaken on 2026-11-26 09:16; the sea slugs'
  no-simulation answer of 2026-11-17 is now the rule for a subject with no data.
- Issues REE-245 and REE-187 are reworded by the integrator in Linear, each to the question it asks.
- No change to the app, the tools or the CI workflow.
