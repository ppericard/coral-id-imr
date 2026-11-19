# Rule 0: Pierre's day starts with his first message after 04:00

Date: 2026-11-19 (Manila). PR: #1191. Rules or docs touched: AGENTS.md Rule 0, INTEGRATOR "Working with Pierre",
`tools/brief.py` (the hooks' Rule 0 window), `tests/docs.test.js`.

## Context

Rule 0's one sentence (2026-11-15) said when the quiet hours start (17:30) but not when they end; `tools/brief.py`
opened the day at 05:00. On #1117 Pierre had said his day usually starts at 5 in the morning, and the integrator
proposed ending the quiet hours at 05:00.

## Decision

Pierre, 2026-11-19 08:07 Manila: "non. La journée démarre à partir de mon premier message après 4h du mat". At 08:09,
"ok pour cette phrase" to: "After 17:30 (Manila time, read from the hook's line), the integrator asks Pierre nothing
until his first message after 04:00; everything else goes on as normal, agents included."

## Consequences

The hooks' line opens the day window at 04:00 and says that a question waits for his first message after 04:00; the
time alone cannot tell whether he has written, so the integrator checks that his message came after 04:00. A message
before 04:00 opens nothing.
