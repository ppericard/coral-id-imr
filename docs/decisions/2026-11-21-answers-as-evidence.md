# A found answer is evidence, not an automatic instruction

Date: 2026-11-21. PR: #1361. Rules or docs touched: AGENTS.md ("One integrator", "Every answer reaches its doc",
"Writing a rule down"), rule W7 (docs/rules/ship.md), docs/INTEGRATOR.md, docs/ANSWERS.md (header),
tools/asked.py (docstring, help), docs/spec/tools.md.

## Context

Since the ledger (2026-11-19), AGENTS.md, rule W7, INTEGRATOR.md and the ledger's header said that an answer found by
the search before a question "is applied, never asked again". The integrator continuity study (2026-11-21, appendix
A) noted that a text match can then be taken for a current decision: an entry later amended, or a correction of one
incident, gets applied as a standing instruction. Its appendix B proposed replacing those passages together.

## Decision

The integrator proposed (2026-11-21 15:43) to carry out appendix B: «un passage retrouvé est une preuve, pas une
consigne : on vérifie sa portée, ce qui l'a corrigé ensuite, et s'il s'applique encore ; une correction ponctuelle ne
devient pas une règle générale ; l'agacement ou l'insistance n'élargit pas une consigne ; un « stop » clair reste un
stop». Pierre, 2026-11-21 15:44: «ok», to launching the PR; 16:02: «ok, merge», to the new AGENTS.md sentences shown to him.

A hit is evidence: checked for its scope, later amendments and whether it still applies. A decision that settles the
point is applied without asking again. Doubtful evidence is named, the point stays open, and the work already allowed
goes on. Writing a rule down keeps an observation, example, hypothesis or request to look into apart from an
instruction; a correction of one incident is not a standing rule; tone and repetition widen nothing; a clear stop is
obeyed. A correction repairs the work and the doc or brief that held the wrong assumption, without an invented cause or
a rule added for show. AGENTS.md also names the integrator Pierre's principal project assistant within the existing
contract, which grants no new kind of action.

## Consequences

The ledger stays append-only and every answer still reaches it and its doc; only how a match is read changes.
`tools/asked.py` searches as before and describes its hits as evidence; no classifier decides what is approved. The
records of 2026-11-19 that quote the old sentence are history and stay as they are.
