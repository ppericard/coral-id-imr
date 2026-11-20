# Rule W27: no fixed number of Codex rounds; a part whose findings keep coming back leaves the PR

Date: 2026-11-21. PR: #1355. Rules or docs touched: rule W27 (docs/rules/ship.md), docs/rules/README.md, AGENTS.md,
CONTRIBUTING.md, tools/queue/README.md.

## Context

Rule W27 held "Two Codex rounds at most per PR": after the second round's fixes, the integrator cut the PR's scope
instead of a third round. The number came from #843 (2026-11-09), which wrote down Pierre's complaint about stacked
PRs, conflicts, cost and one PR's six Codex rounds in a day; the number itself was not his. When the integrator told
him a PR's "two review rounds" were used up, he asked which two rounds.

## Decision

Pierre, 2026-11-21 06:21: «Quels 2 tours????»; 06:22: «Je suis à peu près sur de ne jamais avoir explicitement validé
ça. Par contre, réduire les périmètres des PR pour faciliter l'intégration, oui c'est une bonne idée. Est-ce que c'est
une bonne pratique validée de faire ça?»; 06:23, on the point that findings coming back on the same part point to its
design: «ça je suis effectivement complètement d'accord».

So W27 keeps no round count. Codex findings are fixed while they are new and small; when findings keep coming back on
the same part (say twice in a row, an example and not a count), that part leaves the PR (a branch of its own, Pierre
told) and restarts from a short design note. The wording is the integrator's call, along his answer; the
structural-problem text and his 2026-11-09 words on design being the agents' job stay as they were.

## Consequences

W27's headline, the point, its *Source*, the rules index, the AGENTS.md bullet, CONTRIBUTING.md and the queue
README's heading say so. No tool counted rounds, so no code changes. Past cuts recorded "at the third round" stay as
history.
