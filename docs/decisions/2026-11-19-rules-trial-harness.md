# The rules core trial's harness, and a guard on agent launches: model and effort set, every launch logged

Date: 2026-11-19 (Manila). PR: #1209. Rules or docs touched: `.claude/settings.json` (four hooks), `tools/instr_log.py`,
`tools/agent_guard.py`, `tools/brief.py`, `docs/spec/tools.md`, `tools/README.md`, INTEGRATOR "Working with Pierre".

## Context

Q425 B (Pierre, 2026-11-19 08:53, «ok»): apply what is decided, then a short core always loaded, topic files and
guards, step by step after a trial. The rules core proposal (#1200) designs the trial (§3): whether the core and the
topic files reach the integrator and its subagents in their worktrees, read from a log of what loaded, and the guard
G5 on the model and effort of each agent launch. AGENTS.md already asks for both at every launch; nothing checked it.

## Decision

- The trial's harness first (#1200 §4, PR A): an InstructionsLoaded, SessionStart and SubagentStart log in the git
  common dir, never committed; SubagentStart gives each subagent the Manila time and origin/main's core line (Explore
  and Plan load no CLAUDE.md); `tools/brief.py` warns when the checkout's instruction files differ from origin/main.
  Integrator's call: the log's fields and its place.
- The launch guard, the integrator's call, its answer to Pierre's question (2026-11-19 10:09: «Que se serait-il passé
  si je n'avais pas posé la question?») after his 10:08 «faire de nouveaux tests au lieu de default sur Opus high»:
  prose rules drift when nothing checks them, so the model and effort rule gets a guard and a log: a launch without `model` or `effort` is refused, a fork
  excepted (it runs on its parent's); every launch is logged with its model, effort and description, never its
  prompt; the brief prints the day's distribution. Claude Code 2.1.327's Agent tool takes both parameters; the refusal
  names the keys it saw, so a launch whose hook input lacks `effort` shows at once.

## Consequences

The trial (#1200 §3) can run once this is on `main`: the hooks run main's copy, so before that they do nothing. A
child session keeps its log in its own `.git`, so it prints `tools/instr_log.py --report` itself. Any error in a hook
lets the work through.
