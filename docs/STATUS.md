# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version, whether the local `origin/main` is
the remote's) is printed by `python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.
**Pierre's answers live in [ANSWERS.md](ANSWERS.md)** (append-only historical evidence: a hit is checked for its scope,
later amendments and whether it still applies, AGENTS.md "Every answer reaches its doc"). This file only cites answers.

**Start here: the [Project Home](https://linear.app/reef-id/document/project-home-reef-id-d5a0fef1ecbc)** (Linear): where
each kind of information lives. **The work is tracked in Linear**, team REE (Pierre, 2026-11-21 14:41;
[INTEGRATOR "Linear"](INTEGRATOR.md#linear)): [active](https://linear.app/reef-id/team/REE/active),
[backlog](https://linear.app/reef-id/team/REE/backlog), [projects](https://linear.app/reef-id/projects/all). Substantial
new studies go to the Drive folder [Reef_ID](https://drive.google.com/drive/folders/1EHqtC9iINaYrb0zalE7FpX1F01DrskIp).
A subject not transferred yet keeps its [ROADMAP.md](ROADMAP.md) row. This file keeps the active discussion and the
handover.

Written 2026-11-21, about 16:50 Manila, by the integrator, during work (no stop). **A new integrator starts here, then
reads [INTEGRATOR.md](INTEGRATOR.md).**

Last checked: reports and events: 2026-11-21 ~04:30 Manila (no new report since his 17 of 11-20, all handled). Linear
comments: REE-181 (ChatGPT's handoff, answered 16:38).

## Active discussion

- **Subject: how Pierre and the agents work** (Linear project
  [Working method and project tracking](https://linear.app/reef-id/project/working-method-and-project-tracking-15f1518acc1b)).
  Stage: the continuity study (filed: [reviews/2026-11-21-integrator-continuity-study.md](reviews/2026-11-21-integrator-continuity-study.md))
  and ChatGPT's Linear + Drive revision (in Drive) are being carried out. Done today: Linear as the tracker (#1360),
  answers read as evidence (#1361, his OK 16:02), the brief's freshness line (#1363), the response-time note (#1362),
  the Project Home, the Drive route verified. Open: the first real study in Drive (REE-181); his review of where
  simulations decide (REE-71). Slack dropped (16:10). ChatGPT and the integrator write to each other in Linear
  comments, signed; a comment does not wake the session: read the subject's issue comments when resuming it.
- **Subject: response time** ([current understanding](reviews/2026-11-21-response-time-understanding.md)). Stage: step
  1 live (#1357, sheet v213); step 2 (REE-16) is next, its implementation choices open (which z is netted, the
  subtraction form, the enlargement term), the direction (Q452) decided.

## Now

Main: sheet script **v213**. Running: an agent on REE-183 (the flaky smoke "admin 390", root cause and fix, PR to
come). Nothing else runs. Merged today: about 55 PRs (`git log`).

- **Open points**: 2026-11-18 148, 2026-11-20 188, 2026-11-21 173 (inventory counts, his ask 06:27); from 11-21 the
  count is Linear's active and backlog issues (182 issues REE-5 to REE-183 at 16:45, of which 4 done).
- **The seven tasks stopped at 06:25** were released by his 14:41 request («Proceed with the migration and normal
  project work»): REE-6 and REE-10 to REE-15, Todo, not relaunched yet.

## Next

Launch decided work at once, by the Ready issues (Todo, priority High first:
[active view](https://linear.app/reef-id/team/REE/active)), rule W27 on the sensitive files (`Code.gs`, `core.js`,
`sync.js`, `model.js`: one PR at a time). First: the seven released tasks; REE-16 (response time step 2, `core.js`);
the merge of REE-183's fix.

## Questions for Pierre

In Linear, label **Decision for Pierre**; asked in the chat in French, the issue holds the context:

- **REE-7 (Q439)**: which Lab prototypes graduate. He has not tested the Lab yet; four issues wait on it.
- **REE-70**: the new-RA review's two options (a "next step" line on My progress; a Colony / Close-up switch).
  Recommendation (b) for both; asked 15:35, no answer yet.
- **REE-71**: where simulations decide; for his review of the working method.
- **REE-162** (the species order) and **REE-163** (M7 and C11 as family pairs): Ideas, to check before asking.
- One choice to confirm when he looks at #1354: "Delete, keep answers" also deletes the account's report images.

Last question number: Q452

## Pierre's hands

Assigned to him in Linear (REE-8, REE-72 to REE-75): gold set 2 (42 photos); a `release` ruleset and the stray branch
`claude/autosort-followups`; the trainer role for a live game; his curation waiting in the admin (one reminder,
REE-74); the admin GitHub token before late January 2027.

## Parked after hours

- None.

## Last stop

2026-11-21 ~09:00 Manila, at Pierre's stop (06:25); work resumed at his 14:41 request. Queue tooling: `tools/queue/`
(README there). No real names.
