# Linear is where open work is tracked; ROADMAP.md keeps pointers and the subjects not transferred yet

Date: 2026-11-21. PR: #1360. Rules or docs touched: AGENTS.md, rules W6 and W19 (docs/rules/ship.md), docs/rules/README.md,
docs/INTEGRATOR.md "Linear", docs/STATUS.md (its top), tools/brief.py, the PR template, CONTRIBUTING.md, README.md.

## Context

The open work lived in docs/ROADMAP.md, a Markdown list every agent edited, with a dated backlog inventory beside it; a
new integrator had to rebuild the priorities, the delegated work and each subject's next action from them and the chat.
The integrator continuity study (2026-11-21) proposed an external tracker, Linear first, with one current home for each
kind of information, ROADMAP.md reduced to orientation and pointers, and never two editable sources at once. The
workspace was set up the same day: team REE, nine projects (outcomes), the labels Decision for Pierre, Blocked, Study,
Idea, Waiting and Parked, an issue template.

## Decision

Pierre, 2026-11-21 14:41, his request with the continuity study (in French; the integrator's English rendering): «Make
Linear the tracking location for transferred subjects: replace their old entries with pointers, keep the location of
unmigrated subjects visible, and apply repo changes through the normal review and merge process. Adapt the recovery
brief (STATUS, brief.py, existing mechanisms) so a successor finds the active discussion, priorities, delegated work,
documents and next action. Maintain Linear as part of normal work: Pierre should not enter tickets, relay subagent
results or approve ordinary bookkeeping. Keep the dev, review and merge workflow.»

The wording of the rules and docs that carry it out is the integrator's call (easy to correct): a closed issue stays in
Linear (Done, Canceled) as the tracker's record, while the docs still keep no done list; a deferred idea gets the label
Parked, a declined one is Canceled with its reason; the paid plan is asked to him with its price first.

## Consequences

- Open work, ideas not built and their order are Linear issues (rule W19); a subject not transferred yet keeps its
  ROADMAP.md row until it moves, and a transferred one leaves a pointer there. An active track is on its issue (W6).
- The merge contract's "ROADMAP row he agreed with its spec" becomes a spec he agreed, linked from its Linear issue (or
  its ROADMAP row while not transferred): the issue points to the decision, its status permits nothing by itself.
- The integrator keeps Linear current (In Progress at launch, In Review at PR, Done at merge; an issue for every idea
  discussed); subagents report; Pierre enters no ticket. "Decision for Pierre" marks a real unresolved choice, still
  asked in the chat (docs/INTEGRATOR.md "Linear").
- The session brief links the team's active and backlog views (`tools/brief.py`; no call to Linear), STATUS's top says
  where the work is tracked, and the PR template has a "Linear:" line.
- The dev, review and merge workflow (worktrees, Codex, the merge train) is unchanged.
