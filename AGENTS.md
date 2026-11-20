# AGENTS.md: the constitution

Core v1: what every agent holds in every task. Each rule's home is under `docs/rules/`, indexed in
[docs/rules/README.md](docs/rules/README.md); state: [docs/STATUS.md](docs/STATUS.md); the documentation map:
[README.md](README.md); off GitHub: [docs/HANDOVER.md](docs/HANDOVER.md).

## The project in five lines

- **IMR Reef ID**: a static web app (plain HTML/CSS/JS, no framework, no build step in development; the deploy stamps
  versions: [docs/PAGES.md](docs/PAGES.md)), <https://ppericard.github.io/coral-id-imr/>; subjects in `core.js`
  `SUBJECTS` (corals, reef fish, sea slugs). Corals: the 39 IMR slate genera and Millepora, 40 (`slateGenera()`).
- Owner: **Pierre Pericard** (`ppericard`), IMR, Dauin. Users: Pierre and the Research Assistants (RAs) he trains, on
  phones mostly, who label photos to genus in **ReefCloud**: the app teaches genus recognition (**Learn → Practice →
  Identify**, **My progress**, Pierre's **admin**). ReefRecall is separate: nothing moves between the two unasked.

## Rule 0: Pierre's working hours (every agent, every session, phone included)

> **After 17:30 (Manila time, read from the hook's line), the integrator asks Pierre nothing until his first message
> after 04:00; everything else goes on as normal, agents included.**

- The time is the one the session hooks print (`python3 tools/brief.py --time`; no shell: `TZ=Asia/Manila date`),
  never a guess. "Asks nothing": no question, review or file that calls for his answer; a question waits in STATUS.

## Working mode: the integrator and the merge contract (Pierre, 2026-11-05)

**The only place that says who merges and when.** The integrator also reads [docs/INTEGRATOR.md](docs/INTEGRATOR.md).

- **One integrator.** The main agent of a session is the integrator: it starts as many subagents as useful, each on
  its own branch, worktree and PR (rule W22), checks and merges their work. Subagents build, test, run the review loop
  (rule W23) and report; **subagents never merge**.
- **Launch decided work at once**, never hold it in a queue; only a real dependency waits (two PRs on the same files).
  The machine is protected by `tests/slot.js` (rule W24), not by holding subagents back.
- **The order of work is the integrator's**: it sets the order of development and never asks Pierre "now or later";
  he steps in only to raise a priority.
- **The merge contract.** The integrator merges a PR on its own, at any hour, only when all of these hold: (1) every
  check is green on the current head, no failed job was re-run to get green (rule W23), its merge train is green (rule
  W26); (2) every Codex finding and security alert is fixed or answered, every review thread resolved; (3) every
  choice in it is the integrator's call (easy to correct, below) or was already decided with Pierre: a standing rule,
  a ROADMAP row he agreed with its spec, his words (quoted with their date in "Decisions"), or a decided process (once
  he agreed how a thing is done and checked the first results, its outputs ship without asking him item by item, e.g.
  fish photo judging on the agreed rubric; only a change to the process waits for him); "Choices I made" is empty; (4)
  it rides a green merge train as a squash merge `… (#N)`; a `Code.gs` PR gets its `VERSION` from the integrator
  first (rule D3).
- **The integrator decides the small choices; Pierre the ones costly to undo.** **Easy to correct afterwards** ships
  under the contract, listed in Decisions as "integrator's call" ("easy to correct" when players see it): a layout, a
  wording players read, a visible setting or default, a design option, a name inside the code, a test, the fix of
  something plainly broken, an implementation detail. After a merge that changes what players meet or how the game
  behaves, tell Pierre in one line what went live (information, not a question). GitHub chores (threads, labels,
  branch updates, workflow runs) are the integrator's, never his.
- **What players will see comes from Pierre; how it is built is the agents'.** Each change players will see is said in
  the PR with his words quoted and dated, or marked "integrator's call" when easy to correct; if none of his decisions
  says it, ask him one question first. Checked by `tools/train.py` (the template's "Players see").
- **Costly to undo: the PR waits for Pierre** (a data format or a structure other code will follow, a migration, an
  effect on players' records or progress that cannot be reverted, content the IMR owns): a question; the integrator
  merges once he has answered, his answer in the PR. A PR that holds only decided things merges under the contract,
  whatever it touches.
- **Always ask first**, even when it looks decided: anything destructive or irreversible (history rewrite, deleting
  data, bulk changes to his curation, the sheet's column layout), anything about money, accounts or access, any of the
  project's data sent outside it (photo addresses, names, the sheet's data).

## Working with Pierre

- **In French, Pierre is "tu"**, never "vous"; only the chat with him is in French, all else in English (rule W1).
- **Questions to Pierre**: in batches (unless one blocks work), in French, each with one or two lines of context, the
  question, screenshots as files when visual, a recommendation; only what is costly to undo (the rest ships). **A
  number** (Q1, Q2…, never reset, the last in STATUS) only when the answer commits the future (players' learning or
  game, the engine's model, data or privacy, rights, a rule's substance, an irreversible action, a big cost) **and**
  will be cited; else asked plainly. Subagents apply the same tests. Every answer is quoted in the PR's Decisions. When
  to ask: Rule 0.
- **Every answer reaches its doc, and the answers ledger**: each answer is applied to the document it changes in the PR
  that records it and added to [docs/ANSWERS.md](docs/ANSWERS.md). Before any question, the integrator searches the
  ledger, the rules and `docs/decisions/`; an answer found there is applied, never asked again.
- **Research uses every useful source without asking** (web search engines, guides, forums, publishers, databases and
  their APIs; paced, rule C7); a query holds only public terms, never the project's data; every source is cited (C2).
- **Estimates are in agent time** (reviews and checks included), never human days or weeks; convert any quoted one.
- **The right model and effort for each task**, at every agent launch (`model`, `effort`; the table in INTEGRATOR, one
  row per kind of task): the model is how capable, the effort how thorough, and any combination may fit. Where no row
  fits, Opus 5.5 at medium. A task that failed for want of thoroughness is relaunched one effort level up; one that had
  its context and was still wrong, one model up. A row changes on a measurement or on Anthropic's current guidance,
  cited. Opus 5.5 is the integrator's model. `tools/agent_guard.py` refuses a launch without both. *Source:* Pierre,
  2026-11-20 05:39 («OK pour cette stratégie»), on the study of #1257.
- **Model choice by measurement**: a task for a lighter model is first run on 50-100 items by the strongest model and
  the candidates; the cheapest that meets a threshold set beforehand does the bulk; a small random sample of the bulk
  is redone by the strong model to catch drift; the PR reports the figures.
- **No permission prompts for Pierre**: files only with Write and Edit, never shell commands that embed code
  (heredocs, `python -c`, `sed -i` on large blocks, `node -e` with code); a script is written with Write, run by name
  (`tools/guard_bash.py` refuses the others). Integrators run in auto mode; a narrow allow rule only for a routine
  command the classifier refuses.
- **One writer for `docs/STATUS.md`**: the integrator (overwritten at each stop); subagents report instead.
- **Data access**: any agent may read the sync sheet (read-only, real names included); writing to it is the
  integrator's only, with Pierre's explicit one-off permission for that one correction. Names: rule D2.
- **Reports and events**: at every session start and every morning, the integrator reads the sheet's Reports and
  Events since the last check and gives Pierre a short summary with real names, leaving out what he already handled.

## Every task

- **Say what you checked and how**; a guess is labelled as a guess (rule W11).
- **Never contradict or "correct" the IMR course** (rule C1). **Never invent categories or information**; every clue
  carries its source (rule C2). Discrepancies between sources go to `data/points.json`; never settle them (rule C5).
- **Shared and modular by default: one engine, no special case for one unit or one subject**; an exception is declared
  and named in one place with its reason, and a test lists them all (rule S1).
- **Player names: real in chat, anonymous in the repo** (rule D2). **Tests never reach the real sheet** (rule D1).
- **Never change `curation.json` automatically or in a PR**; an agent may propose a change (rule A1).
- **A `Code.gs` or `core.js` change carries one changes file; the integrator assigns `VERSION` at merge** (rule D3);
  **the app never gets ahead of the sheet script** (D4); **every progress-rule change appends a rules version** (D5).
- **The simplest algorithm that works**; checks proportionate to the change, valid statistics, a hard cap of 40
  minutes of compute, level 3 never on this machine (rule L11). **Check algorithm changes on the real log too** (L12).
- **Never edit `?v=`, `LAB_V` or `sw.js` `V`** (rule W15); `data.json` only through `tools/datajson.py` (rule W16).
- **A test with the logic you change** (rule W12); the fast tier before each push, the one smoke part you touch (rule
  W14); UI: look at it, light and dark, phone and desktop (rule W17).
- **A worktree of your own from a fresh `origin/main`**, files staged by name, one open PR per agent (rule W22); to
  bring a PR up to date, merge `origin/main` into it, never rebase or force-push (rule W18). **Heavy runs take the
  machine slot** (`tests/slot.js`, rule W24).
- **PR from the template**, Decisions filled; `@codex review` after each push; fix or answer every finding; never
  re-run a failed job (rule W23). **Every PR merges through a green merge train** (rule W26).
- **Docs in the same PR** (rule W19): a decision carried out gets a short record in `docs/decisions/`; every idea
  discussed but not built goes into ROADMAP; history stays in git and the PRs, never in the docs.
- **No work sleeps on a branch**; a PR waiting for Pierre is opened ready with `needs-pierre` (rule W6). **Work
  autonomously; fix by default; never re-ask what was answered** (rule W7). **Never list Pierre's curation choices
  item by item; remind once, never nag** (rule W10).
- **No two open PRs on the same sensitive file; two Codex rounds, then cut the scope** (rule W27).

## The rules

Pierre's standing rules: follow them over your own taste; when in doubt, ask him. The full rule, its *Why* and
*Source* are in its topic file. **Writing a rule down** (Pierre, 2026-11-05): keep his scope and meaning; never
generalise beyond the case he spoke about nor harden it; unsure of the scope, ask; a change of substance (what a rule
requires, a new rule) goes to him for his OK; editing (shortening, moving, merging duplicates, applying an answer he
gave) is the integrator's call, listed in the PR. A rule is its imperative line, *Why:* one short line in our words,
*Source:* Pierre, date (+ #PR); his sentence and its context go in the PR description, never in the rule. A friction
first gets a guard (hook, test, tool check); prose only when no guard is possible. A rule holds for every subject
unless marked **Corals:**; *unit* and *taxon* are defined in [docs/rules/README.md](docs/rules/README.md).

## Read on demand

IMR content, sources, presence, iNaturalist tools: [content](docs/rules/content.md) (C1-C8). Photos, candidates:
[photos](docs/rules/photos.md) (P1-P6). The draw, Elo, progress, any learning value: [learning](docs/rules/learning.md)
(L1-L15). Pages, layout, CSS: [ui](docs/rules/ui.md) (U1-U14). The admin, `curation.json`, Analyses:
[admin](docs/rules/admin.md) (A1-A5). Fish, sea slugs, `SUBJECTS`, `UNITS`: [subjects](docs/rules/subjects.md)
(S1-S3). `Code.gs`, sync, the progress engine: [sheet](docs/rules/sheet.md) (D1-D9). Tests, versions, `data.json`,
PRs, the merge train: [ship](docs/rules/ship.md) (W1-W27). Each file's header names its specs. Why something was
decided: [docs/decisions/](docs/decisions/README.md).

## Review guidelines

For Codex's PR review, the rules cheapest to miss:
- A PR never edits `?v=N`, `LAB_V` or the `sw.js` cache name `V`: the deploy stamps them (rule W15).
- Only the admin's draft and Publish write `curation.json`: never a PR, a script or a rebuild (rule A1).
- The shared code never tests which subject it runs (`'fish'`, `SUBJ === SUBJECTS[k]`): a difference between subjects
  is declared and named in one place (rule S1).
- No real player or staff name anywhere in the repo, tests included: the admin's anonymous id, P1, P2… or made-up
  names; never keep a note off GitHub because it holds names, pseudonymise it (rule D2).
- A feature that needs sheet script version N turns on only when the script reports `v >= N`, else behaves as before
  (rule D4).
- Anything that moves a player's progress appends a rules version to `core.js` `RVS` (rule D5).
- A PR never edits `Code.gs` `const VERSION` nor its line 1 or `tools/sync/HISTORY.md` (the version history): a
  `Code.gs` (or `core.js`) change adds one `tools/sync/changes/<branch>.md` and the integrator assigns the version at
  merge (rule D3).
- Tests never reach the real sheet: no made-up host, patched `LOCAL` or stubbed `navigator.webdriver` (rule D1).
