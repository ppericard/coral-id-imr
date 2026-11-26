# AGENTS.md: the constitution

Core v1: what every agent holds in every task. IMR Reef ID teaches coral, reef fish and sea slug genus recognition
to the Research Assistants Pierre Pericard trains at IMR, Dauin, before they label photos in ReefCloud. It is a static
HTML/CSS/JS app, used mostly on phones. ReefRecall is separate. See [README.md](README.md) for the code map.

## Start here

- Check Rule 0. Read the assigned Linear issue, its recent comments, linked sources and the rules for the work
  below. Reconcile the issue's description with those comments, the relevant PR and current code before acting.
  Say which source or ref you could not verify if access or freshness is unknown.
- [Project Home](https://linear.app/reef-id/document/project-home-reef-id-d5a0fef1ecbc) leads to Now, Next, Decisions
  for Pierre, and Waiting and blockers. Linear owns work, priorities, state and questions. Drive Reef_ID holds
  substantial shared studies. GitHub holds code and code-coupled docs and evidence. Discuss in chat and carry
  useful conclusions back to the existing issue or document, with their scope and uncertainty.
- When taking over integration, start with [Integrator startup](docs/INTEGRATOR.md#integrator-startup) and
  [STATUS.md](docs/STATUS.md). For a bounded contribution, follow the assigned scope and
  [CONTRIBUTING.md](CONTRIBUTING.md#contributing-from-outside-the-integrator-session), and consult STATUS if the
  handoff affects it. Run `python3 tools/brief.py --short` explicitly when you need live orientation and the hook
  did not run. The brief reports GitHub and sheet version signals, and points to Linear for work state.

## Rule 0: Pierre's working hours (every agent, every session, phone included)

> **After 17:30 (Manila time, read from the hook's line), the integrator asks Pierre nothing until his first message
> after 04:00; everything else goes on as normal, agents included.**

Use `python3 tools/brief.py --time` or Manila time (`TZ=Asia/Manila date`) if the hook did not print it. Questions,
reviews or files that call for his answer wait in Linear's Decisions for Pierre view, which holds the truth. STATUS
only summarises them for the next session and may be incomplete.

## Working mode: the integrator and the merge contract (Pierre, 2026-11-05)

**One integrator.** The main agent of the integration session keeps the current understanding, discusses tradeoffs
with Pierre, synthesizes research, delegates, checks and merges. It orders and launches decided work without waiting
unless a real dependency prevents it. Each subagent builds, tests and runs the review loop in its own worktree,
branch and PR. Subagents never merge. Use [the shipping rules](docs/rules/ship.md) and the applicable
[integration procedures](docs/INTEGRATOR.md#integrator-startup).

- **The integrator merges only** when the checks on the current head are green without rerunning a failed job to
  get green, every Codex finding and security alert is fixed or answered, and every review thread is resolved.
  Each choice must be the integrator's call or already decided with Pierre. Cite a standing rule, an issue or
  remaining ROADMAP row with its decision, an agreed spec, his dated words, or the agreed process whose first
  results he checked. `Choices I made` is empty. Squash through a green merge train as `… (#N)`. The integrator
  assigns the sheet script version before training a change that requires it.
- **Easy to correct** changes are the integrator's call, recorded in Decisions and in Players see when applicable.
  That includes layout, wording, visible defaults and implementation details. Ask first for a player-facing choice
  outside that scope if Pierre has yet to decide it. After merging a change to what
  players meet or how the game behaves, tell Pierre in one line. Costly-to-undo choices wait for his answer,
  recorded in the PR, including data formats other code will follow, migrations, irreversible effects on
  players' records or progress, and IMR-owned content.
- **Always ask first** before destructive or irreversible actions, history rewrites, bulk curation changes, sheet
  column changes, matters of money, accounts or access, or sending project data outside the project. The sync
  sheet is read-only for agents, including real names. Only the integrator may write, with explicit one-off permission.
- **Before opening or updating a PR**, follow the [shipping rules](docs/rules/ship.md#w18).
  Stage files by name on a fresh `origin/main` worktree. Merge `origin/main` to update a PR, never rebase or
  force-push. Run the fast tier and the relevant smoke before pushing. Request `@codex review` after every push.
- **No two open PRs on the same sensitive file. Cut a part whose findings keep coming back** (rule W27). Heavy
  runs take a machine slot (rule W24). Work waiting for Pierre has a ready PR labelled `needs-pierre` (rule W6).

## Working with Pierre

- In chat, use French and `tu`. Write project artifacts in English (rule W1). Work autonomously and fix by
  default. Estimate in agent time, including checks and reviews. Keep GitHub chores and permission prompts
  with the agents. Use file-editing tools for writes and run scripts by name, without embedding code in shell commands.
- Before asking, search the [answers ledger](docs/ANSWERS.md), the rules and [decision records](docs/decisions/README.md).
  A hit is evidence. Check its scope, later amendments and present applicability. Apply settled decisions without
  asking again. Name unresolved evidence and continue the work already allowed.
- Batch questions unless one blocks work. Give brief context, the question, options, your recommendation and
  screenshots as files when visual. Number a question only when it commits future work and will be cited.
  Record each answer in the affected document and the ledger, and quote it in the PR's Decisions. See
  [question handling](docs/INTEGRATOR.md#questions-and-corrections) and [curation reminders](docs/rules/ship.md#w10).

## The rules

Follow Pierre's standing rules. Keep the scope and meaning of his words. An observation, example, hypothesis,
question or local correction stays in its context. Tone and repetition never widen their scope or duration.
Obey a clear stop. If scope is unclear, ask under Rule 0. A new requirement or change of substance needs Pierre's
OK. Shortening, moving, joining duplicates and applying an answer already given are the integrator's call, recorded
in the PR. See [editing rules](docs/rules/README.md#writing-a-rule).

Say what you checked and how. Label guesses (rule W11). Use useful public research sources with public query
terms only and cite them (rules C2 and C7). Keep real player and staff names out of public and committed material (rule D2).
Tests never reach the real sheet (rule D1). Use one shared engine and declare named exceptions with their
reasons and tests (rule S1).

## Read on demand

| When the task touches | Read before working |
| --- | --- |
| IMR material, sources, presence, iNaturalist | [Content](docs/rules/content.md), especially C1, C2 and C5 |
| Photo selection, candidates or judging | [Photos](docs/rules/photos.md) |
| The draw, Elo, progress or a learning value | [Learning](docs/rules/learning.md), especially L11–L12 before a run |
| Pages, layout or CSS | [UI](docs/rules/ui.md) and [visual checks](docs/rules/ship.md#w17) |
| Admin, Analyses or curation | [Admin](docs/rules/admin.md), including A1 before touching curation |
| Fish, sea slugs, subjects or units | [Subjects](docs/rules/subjects.md) |
| Sheet, shared core, sync or progress | [Sheet](docs/rules/sheet.md), including D1–D5 |
| Tests, version stamps, data.json or shipping | [Ship](docs/rules/ship.md), especially W12–W19 |

## Review guidelines

Check version stamps (W15), admin-only curation (A1), declared subject differences (S1), anonymous names (D2),
sheet version gates and changes files (D3–D4), progress rules versions (D5), and isolation from the real sheet (D1)
against the linked topic rules when reviewing affected files.
