# Agent brief

What every agent is told when the integrator (or Pierre) hands it a task, whatever the tool: Claude Code, Codex, ChatGPT,
a person. A launch prompt is then short: "Read tools/agent-brief.md; task: REE-N, its Agent notes". Each line cites the
rule that holds it: read the rule when the line is not enough. The task itself (scope, files, boundaries, acceptance) is in
the issue's Agent notes, never retyped here. A new line for every agent goes into this file, not into a launch prompt.

## Before you start

- Check Rule 0 (AGENTS.md): after 17:30 Manila, nobody asks Pierre anything; a question that needs him goes in your report.
- Read the issue, all its comments and linked sources, then reconcile them with current code and open PRs: descriptions
  go stale. Say which source you could not verify. Read the topic rules AGENTS.md "Read on demand" names.
- Stop and report when Pierre's dated words do not settle what players see (a "decided" item was once already built).
- Use every useful public source with public query terms only, and cite it (rules C2, C7).

## Build

- A fresh worktree from `origin/main`, on a branch of your own with your team's prefix (`claude/`, `codex/`), never from
  another PR's branch (rule W22). Stage files by name. One PR per agent.
- Before starting, check the open PRs and the other teams' branches for the files you will touch: no two open PRs on the
  same sensitive file, whoever opened them (rule W27).
- Run the fast tier and the one smoke part your change touches before each push (rule W14); a docs-only change runs no
  smoke. A heavy run takes the machine slot (rule W24). Format with Prettier 3.10.1 (rule W13).
- Never edit a version number (rule W15) or the sheet's `VERSION` (rule D3), never write `curation.json` (rule A1) or the
  sheet, and never reach the real sheet from a test (rule D1).
- Claude Code sessions: edit files with the Edit and Write tools, run a script by name. A refused command is reported,
  never worked around (another tool, `subprocess`, another shell form); no wrapper script, no Monitor, no split command
  name. Never edit the integrator's scratch files or queue tooling outside your own PR.

## Privacy

- Project data never leaves the project: no photo addresses, player or staff names, sheet data, or image searches with
  our photos, in any outside tool or query (AGENTS.md "Always ask first").
- Real player and staff names never reach a commit, PR text, GitHub comment or file in the repo (rule D2);
  use the anonymous id, or P1, P2…, and keep the mapping outside the repo.
- Read the sheet only through the connector (read-only), by the exact tab title and range you need. Ask for aggregates,
  not rows, and leave out the name column: the anonymous id is enough for a check. Named results go to the integrator in
  your report, never into the repo.
- A screenshot that supports a decision is attached to the issue or the PR; never one that shows a player's name (rule D2).

## Push and review

- Open the PR from `.github/pull_request_template.md`, with `Linear: REE-N` and, for a partial PR, "Part of REE-N" (never
  a bare closing reference). Open it ready, not draft, once it is built (rule W6): the queue turns a PR to draft and
  back to ready itself when Codex's security review needs it, so do not.
- Bring a PR up to date by merging `origin/main` into it, never a rebase or a force-push (rule W18).
- After every push, comment `@codex review` (rule W23). Fix each finding with a test that fails first, or answer with
  the reason it does not apply. Reply on its thread, and resolve the thread only after its fix is pushed: resolving first
  lets the queue merge the head without the fix. If the resolve is refused, report the thread IDs. Never re-run a
  failed job to get green.
- When findings come back twice in a row on the same part, stop: that part leaves the PR for a short design note, and
  you report it (rule W27). Never fix the same part a third time.
- Never merge. The integrator merges (AGENTS.md "Working mode").
- Commits and the PR description end with the trailers or footer your session gives.

## Report (hand-back)

Report to the integrator, or when you work outside its session, as a signed comment on the Linear issue (the comment says
"PR open for the integrator"). Say, in this order:

1. The PR number and its head SHA.
2. The checks on that head: how many runs, all green or which are not.
3. Codex: the receipt on that head, each finding fixed or answered, the threads resolved (or their IDs if you could not).
4. What you ran (fast tier, smoke part) and what you looked at; what you could not verify and why (rule W11).
5. "Choices I made" and the questions that would be numbered (INTEGRATOR "Questions and corrections"): a choice for
   Pierre, with its options and your recommendation.
6. What remains, and what you skipped as already covered, each with its reason.

Give numbers and evidence, not the material (rule W25). Keep your worktree until the PR is merged: the integrator may resume
you or a new agent on it after a finding, and then removes it (rule W24).

## In Linear

Only when your task gives you the Linear tools; otherwise the integrator updates Linear from your report.

- Claim the issue with a comment "Executor: <team>, branch <name>". The assignee field says whose hands hold it, and
  Pierre's means his: a connector write or a PR link can assign the issue to him, so clear that when it is not his.
- Sign every comment you write, one line at the end: "— Codex", "— Claude (subagent)".
- A conclusion, with its figures and limits, goes on the issue; the PR body holds the change.
- A study's scripts go to `tools/studies/<issue>/` with a README that names its inputs and whether they are private; its
  results go to the PR or the study document.

An issue meant for another agent keeps its brief in a collapsible section at the end of the description:

```
+++ Agent notes

Scope: what to do, and what not.
Files: to touch, and to leave alone (rule W27 for the sensitive ones).
Boundaries: data, names and decisions that stay out (the Privacy lines above).
Acceptance: what is measured or checked, and where it is reported.
Executor: the team and branch, written when it is claimed.
Hand-back: the signed comment above, the PR open for the integrator.

+++
```
