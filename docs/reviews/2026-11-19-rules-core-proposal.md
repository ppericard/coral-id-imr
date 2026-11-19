# The rules core: a proposal for Q425 B (2026-11-19)

**Status: proposal, docs only.** No rule, doc or code changes with this PR. It is the plan for the next PRs of Pierre's
Q425 B («ok», 2026-11-19 08:53 Manila): "apply what is decided, then a short core always loaded, topic files and
guards, step by step after a trial". Pierre made the work a priority at 09:04 because «en attendant on continue de
développer avec les anciennes règles». The questions for him are in §5, in French, with no number.

- **Base:** `origin/main` at `419df09b6` (#1194), plus two open PRs it assumes merged: #1198 (CLAUDE.md imports
  AGENTS.md; merge, never rebase or force-push; one open PR per agent) and #1117 (the four guards, and the rules audit
  `docs/reviews/2026-11-18-rules-audit.md` on its branch). Both are open and unmerged as of this writing.
- **Builds on:** the agentic-practices study
  ([2026-11-19-agentic-practices-study.md](2026-11-19-agentic-practices-study.md), #1197: options a0-a4, the 172 rule
  items, the 267 never/always/must lines, the five contradictions, the citation counts, the research on instruction
  load) and the rules audit (#1117: KEEP 79, GUARD 35, MERGE 31, DELETE 27).
- **Already decided, applied here, not asked again:** the audit's decisions 1-5 and 8 OK'd, 6 and 7 dropped, 9 parked
  (Pierre, 2026-11-18 evening; a paraphrase in STATUS #1122 and on the unmerged branches of #1117 and #1193, not on
  `main`); «ok, lance les quatre» (#1117); Q425 B and the two contradictions settled (08:53, on #1198's branch); S1's
  wording (06:58) and the ledger rule (07:05), both on `main`. Searched: `docs/ANSWERS.md` on `main` and on #1193's
  and #1198's branches, the rules' *Source* lines, `docs/decisions/`. `tools/asked.py` does not exist yet.
- **The rule-writing rule, applied:** a change to what a rule requires needs Pierre's OK; pure editing (wording,
  placement, merging duplicates) does not, and is listed. Every line below carries one of three marks: **V** (verbatim
  from `main` or from an approved PR), **E** (shortened or moved, same substance: editing), **S** (substance: already
  approved, with its source, or waiting for Pierre). No line of the core adds a "never" or an "always" its rule does
  not already hold (Pierre refused a wording as «trop conservatrice», 06:50).

## 0. In short

- **The core is AGENTS.md cut to 150 lines** (from 265; 12.9 KB from 24.1 KB; longest line 119 characters), loaded by
  every session and every subagent but Explore and Plan through #1198's `@AGENTS.md` import. It holds Rule 0 in
  Pierre's words, the merge contract, how to work with Pierre (questions, the ledger, model and effort, data), one
  line for each rule that applies to every task, the table of topic files, and Codex's review guidelines. Its full
  text is in §1.
- **Every rule keeps its home** in `docs/rules/`; no product rule is touched. The index of every rule (one line each,
  72 lines of AGENTS.md today) moves to `docs/rules/README.md`.
- **Counts** (§2.1 lists every rule ID and every AGENTS.md item exactly once). Of the 87 rule IDs: **29 have their own
  line in the core**, 1 is merged into a core line (W5 into W19), **57 are read on demand** from their topic file; by
  class **K 69, G 17, M 1, D 0**. Of AGENTS.md's 30 items: 25 have their substance in the core; K 18, G 5, M 4, T 1
  (the index, moved whole), H 1 (history), D 1 (Projects mode, deletion already approved). **New guards: 13**
  (§2.4), each enforcing a rule already decided. **Deletions proposed: none** beyond those Pierre already approved.
- **Topic files load on demand** by path if the trial shows it works in our worktrees: Claude Code's `.claude/rules/`
  with `paths:` (documented), or a fallback hook (§2.2). The documentation says a subagent in a worktree under
  `.claude/worktrees/` does not load that worktree's `.claude/rules/`; whether the main checkout's path-scoped rules
  match files inside a worktree is not documented, hence the trial.
- **The trial** (§3) runs in a child session on the branch under test: an InstructionsLoaded log, canary quotes by the
  integrator and by subagents, path matching in worktrees, compaction, a stale main checkout.
- **Eleven PRs and two trial runs** (§4): the harness, then the core after the trial and Pierre's OK, the topic files,
  three rule-text PRs, four guard PRs in parallel, the word budget last.
- **Questions for Pierre** (§5): the list of what goes in the core (the step Q425 B announced: "the integrator shows
  you the list of what goes in the core before any wording"), and the agent cap only if the chat of 2026-11-18 does
  not settle it.

## 1. The core: the proposed AGENTS.md, in full

Measured on the text below: 150 lines, 12.9 KB (KiB, as `tests/docs.test.js` counts), longest line 119 characters
(AGENTS.md on `main`: 265 lines, 24.1 KB, 32 lines over 120). CLAUDE.md stays as #1198 leaves it (13 lines: Rule 0
first, `@AGENTS.md`, the integrator's pointer to INTEGRATOR.md): 163 lines load at start. The headings and bold
labels other files cite stay ("Working mode", 15 citations; "Every answer reaches its doc"; "Writing a rule down";
"Data access"; "Read on demand"; the Rule 0 anchor). "The rules" stays a heading, so `#the-rules` still resolves; B
re-points its 10 citations to the index (§4). The marks follow the text (§1.1).

```markdown
# AGENTS.md: the constitution

Core v1: what every agent holds in every task. Each rule's home is under `docs/rules/`, indexed in
[docs/rules/README.md](docs/rules/README.md); state: [docs/STATUS.md](docs/STATUS.md); off GitHub: HANDOVER.md.

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

- **One integrator.** The main agent of a session is the integrator: it starts subagents, each on its own branch,
  worktree and PR (rule W22), checks and merges their work. Subagents build, test, run the review loop (rule W23) and
  report; **subagents never merge**.
- **Launch decided work at once**, never hold it in a queue; only a real dependency waits (two PRs on the same files).
  The machine is protected by `tests/slot.js` (rule W24), not by holding subagents back.
- **The merge contract.** The integrator merges a PR on its own, at any hour, only when all of these hold: (1) every
  check is green on the current head, no failed job was re-run to get green (rule W23), its merge train is green (rule
  W26); (2) every Codex finding is fixed or answered, every review thread resolved; (3) every choice in it is the
  integrator's call (easy to correct, below) or was already decided with Pierre: a standing rule, a ROADMAP row he
  agreed with its spec, his words (quoted with their date in "Decisions"), or a decided process (once he agreed how a
  thing is done and checked the first results, its outputs ship without asking him item by item, e.g. fish photo
  judging on the agreed rubric; only a change to the process waits for him); "Choices I made" is empty; (4) it rides a
  green merge train as a squash merge `… (#N)`; a `Code.gs` PR gets its `VERSION` from the integrator first (rule D3).
- **The integrator decides the small choices; Pierre the ones costly to undo.** **Easy to correct afterwards** ships
  under the contract, listed in Decisions as "integrator's call" ("easy to correct" when players see it): a layout, a
  wording players read, a visible setting or default, a design option, a name inside the code, a test, the fix of
  something plainly broken, an implementation detail. After a merge that changes what players meet or how the game
  behaves, tell Pierre in one line what went live (information, not a question).
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
  question, screenshots as files when visual, a recommendation; only what is costly to undo (the rest ships), never
  the order of work. **A number** (Q1, Q2…, never reset, the last in STATUS) only when the answer commits the future
  (players' learning or game, the engine's model, data or privacy, rights, a rule's substance, an irreversible action,
  a big cost) **and** will be cited; else asked plainly. Subagents apply the same tests. Every answer is quoted in the
  PR's Decisions. When to ask: Rule 0.
- **Every answer reaches its doc, and the answers ledger**: each answer is applied to the document it changes in the PR
  that records it and added to [docs/ANSWERS.md](docs/ANSWERS.md). Before any question, the integrator searches the
  ledger, the rules and `docs/decisions/`; an answer found there is applied, never asked again.
- **Research uses every useful source without asking** (web search engines, guides, forums, publishers, databases and
  their APIs; paced, rule C7); a query holds only public terms, never the project's data; every source is cited (C2).
- **Estimates are in agent time** (reviews and checks included), never human days or weeks; convert any quoted one.
- **The right model and effort for each task**, at every agent launch (`model`, `effort`; table in INTEGRATOR):
  design, architecture, the learning engine, security and rule wording with consequences: Opus 5.5, high (Fable 5.2
  only where Opus at high effort measurably falls short); ordinary code (game formats, admin pages, fixes, docs):
  Sonnet 5.5, medium to high; mechanical, repetitive work: Haiku 5.5, low, after the sample test. In doubt, the
  stronger one; a task that turns out harder is relaunched one step up. Opus 5.5 is the integrator's model.
- **Model choice by measurement**: a task for a lighter model is first run on 50-100 items by the strongest model and
  the candidates; the cheapest that meets a threshold set beforehand does the bulk; a small random sample of the bulk
  is redone by the strong model to catch drift; the PR reports the figures.
- **No permission prompts for Pierre**: files only with Write and Edit, never shell commands that embed code
  (heredocs, `python -c`, `sed -i` on large blocks, `node -e` with code); a script is written with Write, run by name.
- **One writer for `docs/STATUS.md`**: the integrator (overwritten at each stop); subagents report instead.
- **Data access**: any agent may read the sync sheet (read-only, real names included); writing to it is the
  integrator's only, with Pierre's explicit one-off permission for that one correction. Names: rule D2.
- **Reports and events**: at every session start and every morning, the integrator reads the sheet's Reports and
  Events since the last check and gives Pierre a short summary with real names, leaving out what he already handled.
- **`needs-pierre`** marks a PR that waits for Pierre: a reminder, not the source of truth; opened ready, never a
  draft. Before merging, read the PR's open questions; remove the label with the step that records his answer.

## Every task

- **Say what you checked and how**; a guess is labelled as a guess (rule W11).
- **Never contradict or "correct" the IMR course** (rule C1). **Never invent categories or information**; every clue
  carries its source (rule C2). Discrepancies between sources go to `points.json`; never settle them (rule C5).
- **One shared engine**: a difference between subjects is declared and named in one place, never hidden (rule S1).
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
- **No work sleeps on a branch** (rule W6). **Fix by default; never re-ask what was answered** (rule W7). **Never list
  Pierre's curation choices item by item; remind once, never nag** (rule W10).
- **Bounded cost: at most four agents that write code or run tests (read-only studies on top), PRs from `main` only,
  two Codex rounds then cut the scope** (rule W27).

## The rules

Pierre's standing rules: follow them over your own taste; when in doubt, ask him. The full rule, its *Why* and
*Source* are in its topic file. **Writing a rule down** (Pierre, 2026-11-05): keep his scope and meaning; never
generalise beyond the case he spoke about nor harden it; unsure of the scope, ask; the wording of a new or changed rule
goes to him for his OK. A rule is its imperative line, *Why:* one short line in our words, *Source:* Pierre, date
(+ #PR); his sentence and its context go in the PR description, never in the rule. A friction first gets a guard
(hook, test, tool check); prose only when no guard is possible. A rule holds for every subject unless marked
**Corals:**; *unit* and *taxon* are defined in [docs/rules/README.md](docs/rules/README.md).

## Read on demand

IMR content, sources, presence, iNaturalist tools: [content](docs/rules/content.md) (C1-C8). Photos, candidates:
[photos](docs/rules/photos.md) (P1-P6). The draw, Elo, progress, any learning value: [learning](docs/rules/learning.md)
(L1-L15). Pages, layout, CSS: [ui](docs/rules/ui.md) (U1-U14). The admin, `curation.json`, Analyses:
[admin](docs/rules/admin.md) (A1-A5). Fish, sea slugs, `SUBJECTS`, `UNITS`: [subjects](docs/rules/subjects.md)
(S1-S3). `Code.gs`, sync, the progress engine: [sheet](docs/rules/sheet.md) (D1-D9). Tests, versions, `data.json`,
PRs, the merge train: [ship](docs/rules/ship.md) (W1-W27). Why: [docs/decisions/](docs/decisions/README.md).

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
```

### 1.1 The marks, part by part

The marks are mechanical: a part is **V** only when a script (scratchpad, not committed) finds its whole text,
whitespace aside, in AGENTS.md as #1198 and #1117 leave it or in a rule file; everything else is **E**, unless it is
**S**. Eleven parts are V: Rule 0's sentence, "Always ask first", the review guidelines' heading and their eight items
(all kept whole: Codex does not read the topic files). Every other part is E: today's words, shortened or joined, with
the same substance. For each E part, what was cut and where it lives (a home under `docs/rules/` or a record, never
INTEGRATOR alone):

- **Header ("Core v1…")**: new pointer text; "Core v1" is also the trial's canary (§3). The index moves to
  `docs/rules/README.md`.
- **The project in five lines**: facts kept, shortened; the rename's history and the address change left to ROADMAP
  and git.
- **Rule 0, the bullet**: the time source and "asks nothing" kept; the history of its rewordings is in its record
  (`docs/decisions/2026-11-19-rule0-first-message.md`, #1191); what a waiting question holds is in "Questions to
  Pierre".
- **Working mode heading**: kept; "the only place" kept; INTEGRATOR's description shortened.
- **One integrator; launch at once**: kept, shorter; the slot detail ("one Playwright run at a time per 2 cores") is
  rule W24's.
- **The merge contract (1)-(4)**: the four conditions whole; one of the two examples of a decided process kept (fish
  photo judging); "the train tests it on the current `main`, where Publish commits land without PRs" is rule W26's,
  "squash merge" rule W18's.
- **Easy to correct; costly to undo**: the lists and both permissive clauses whole ("ships under the contract"; "A PR
  that holds only decided things merges under the contract, whatever it touches"); Pierre's two quotes go to a record
  (rule format: "his sentence and its context go in the PR description, never in the rule").
- **What players will see comes from Pierre**: **S, approved**: #1117's bullet, shortened (Pierre, 2026-11-18, «ok,
  lance les quatre»); its *Source* and story are in #1117's record.
- **"tu"**: joined with rule W1's line.
- **Questions to Pierre**: the two tests and their list of what "commits the future" whole, "only what is costly to
  undo (the rest ships)", batches, context, recommendation, subagents' questions, every answer in Decisions; "past
  numbers stay as they are" and "he may ask for more" go to the topic file of the questions, ship.md beside W7.
- **Every answer reaches its doc; research; estimates**: shortened; the sources list kept; "(Pierre, 2026-11-17)" and
  the other dates go to the *Source* format.
- **Model and effort; model by measurement**: the three-row mapping Pierre asked to have in the "règles hautes" kept
  in the core; Anthropic's sources stay in INTEGRATOR beside its table; the threshold's content ("agreement and
  serious errors") and the example tasks go to rule W25 in ship.md; Pierre's quotes to a record.
- **No permission prompts**: the rule whole; its *Why* (prompts Pierre cannot judge) is in #1117's guards record.
- **One writer for STATUS; data access; reports and events; `needs-pierre`**: the duties whole; "never appended",
  the subagent-without-connector route, the names put back for Pierre, real-data checks, the tab names (`err`, "save
  failed", old app versions) and the last check's time go to `docs/rules/sheet.md` beside D2; "Pierre does not browse
  GitHub" goes to W6, which already describes the label.
- **Every task** (W11, C1, C2, C5, S1, D2, D1, A1, D3-D5, L11, L12, W15, W16, W12, W14, W17, W22, W18, W24, W23, W26,
  W19, W6, W7, W10, W27): each line is today's AGENTS.md index line or Ship checklist item, joined with a neighbour or
  shortened; W18 and W22 as #1198 words them; W19's line carries W5's substance; W27 keeps `main`'s wording (the cap:
  §5); S1's line is shortened and its whole text stays in the review guidelines.
- **The rules**: "Writing a rule down" whole; **"A friction first gets a guard…": S, approved** (the rules audit's
  decision 4, 2026-11-18 evening).
- **Read on demand**: the same rows as a paragraph; each spec link moves into its topic file's header (B adds those
  missing).

## 2. Where every other rule goes

### 2.1 Every rule and AGENTS.md item, once

Classes: **K** kept as it is (in its topic file, with a core line where "Core" says yes); **G** kept as one line
naming the guard that enforces it, its how-to moved to the tool's `--help` or ARCHITECTURE (audit decision 3); **M**
merged into the item named (a duplicate); **T** moved whole; **H** history moved to a record, nothing it requires
lost; **D** deleted. Guards G1-G13 are in §2.4; "exists" means the check is on `main` or in #1117.

**Rule IDs (87)**

| ID | Class | Core | Mark | Where, and what changes |
| --- | --- | --- | --- | --- |
| C1 | K | yes | V | content.md |
| C2 | K | yes | V | content.md |
| C3 | K | no | V | content.md |
| C4 | K | no | V | content.md |
| C5 | K | yes | V | content.md |
| C6 | K | no | V | content.md |
| C7 | G | no | E | content.md, one line: every call goes through `tools/inat.py` (exists, `tests/inat.test.js`) |
| C8 | K | no | V | content.md; `tools/presence.py` is its single home |
| P1 | K | no | E | photos.md; dated qualifiers ("until 2026-11-15", "since 2026-11-08") to a record |
| P2 | K | no | E | photos.md; "labelled Closer before 2026-11-01" left to git |
| P3 | K | no | E | photos.md (`tests/nobook.test.js` exists); "since #227", "went on 2026-11-03" to git |
| P4 | K | no | V | photos.md |
| P5 | K | no | V | photos.md |
| P6 | K | no | V | photos.md (`tests/skeletons.test.js` exists) |
| L1 | K | no | E | learning.md; "`s.pg` before rules version 9" left to git |
| L2 | K | no | V | learning.md |
| L3 | K | no | V | learning.md; its starred-genera sentence stays (L5 does not say the same) |
| L4 | K | no | V | learning.md |
| L5 | K | no | V | learning.md |
| L6 | K | no | E | learning.md; the bonus mechanics already in ARCHITECTURE "Bonus genera" |
| L7 | K | no | V | learning.md |
| L8 | K | no | V | learning.md |
| L9 | K | no | V | learning.md |
| L10 | K | no | V | learning.md |
| L11 | G | yes | S | learning.md keeps the rule and the cap; its method moves to LEARNING; G4 (audit decision 8) |
| L12 | K | yes | V | learning.md |
| L13 | K | no | V | learning.md |
| L14 | K | no | V | learning.md |
| L15 | K | no | V | learning.md |
| U1 | K | no | V | ui.md |
| U2 | K | no | V | ui.md |
| U3 | K | no | V | ui.md |
| U4 | K | no | E | ui.md, the one home of the test widths (rule W17 points to it) |
| U5 | K | no | V | ui.md (`tests/csp.test.js` exists) |
| U6 | K | no | V | ui.md |
| U7 | K | no | E | ui.md; the stale reason "the IMR/own-first rule P1 …" dropped (P1 changed 2026-11-18) |
| U8 | K | no | V | ui.md |
| U9 | K | no | V | ui.md |
| U10 | K | no | V | ui.md |
| U11 | K | no | V | ui.md |
| U12 | K | no | V | ui.md |
| U13 | K | no | V | ui.md |
| U14 | K | no | V | ui.md |
| A1 | G | yes | E | admin.md; G2 |
| A2 | K | no | V | admin.md |
| A3 | K | no | V | admin.md |
| A4 | K | no | V | admin.md |
| A5 | K | no | V | admin.md |
| S1 | K | yes | V | subjects.md (`tests/subject-neutral.test.js` checks part of it) |
| S2 | K | no | V | subjects.md |
| S3 | K | no | V | subjects.md |
| D1 | K | yes | V | sheet.md, its how-to (the host mapping) kept |
| D2 | K | yes | E | sheet.md; gains AGENTS.md's data-access details (placement) |
| D3 | G | yes | E | sheet.md, about 150 words; its steps to `tools/sheet_version.py --help` (exists) |
| D4 | K | yes | V | sheet.md |
| D5 | K | yes | E | sheet.md; its "No card" bullet points to D6, the one home of "silent" |
| D6 | K | no | E | sheet.md; "Until then … announced with a real pop-up" to a record |
| D7 | K | no | V | sheet.md |
| D8 | K | no | V | sheet.md |
| D9 | K | no | V | sheet.md |
| W1 | K | yes | E | ship.md; absorbs AGENTS.md's "tu" and INTEGRATOR's "Language" (the dictation slips stay there) |
| W2 | K | no | E | ship.md; its "ask first before destructive" half points to the core's "Always ask first" |
| W3 | K | no | V | ship.md |
| W4 | K | no | V | ship.md |
| W5 | M | no | E | into W19 with its words ("with its source and status… development ideas only"); ID retired |
| W6 | G | yes | E | ship.md, one line; `tools/brief.py` lists the branches (exists), #1117's `tools/night.py` too |
| W7 | K | yes | E | ship.md; "check ROADMAP and PR descriptions" becomes the ledger search (AGENTS.md, 07:05) |
| W8 | K | no | V | ship.md |
| W9 | G | no | E | ship.md, one line; `tools/stack_check.py` (exists); absorbs AGENTS.md's Dependabot bullet |
| W10 | K | yes | V | ship.md |
| W11 | K | yes | V | ship.md |
| W12 | G | yes | E | ship.md, "a test with the logic"; the how-to (server, smokes, `answer.js`) to ARCHITECTURE |
| W13 | G | no | E | ship.md, one line (`checks.yml` runs Prettier); the 3.3.3 story to a record |
| W14 | G | yes | E | ship.md, one line naming `tools/precheck.py` (note 1) |
| W15 | G | yes | E | ship.md; `tools/stamp_versions.py` exists; G7 |
| W16 | G | yes | E | ship.md, one line (`tools/datajson.py --check` exists) |
| W17 | G | yes | E | ship.md; G8 |
| W18 | K | yes | E | ship.md as #1198 words it; the 2026-11-08 rewrite bullet to its record (note 2) |
| W19 | K | yes | E | ship.md; absorbs W5; the long description of `tests/docs.test.js` cut (its test names say it) |
| W20 | K | no | V | ship.md; it stays under W (moving it to photos.md would renumber it) |
| W21 | G | no | V | ship.md (`tools/rename_app.py --check` exists) |
| W22 | K | yes | E | ship.md as #1198 words it; the Projects sentence deleted (approved, audit 3) |
| W23 | G | yes | E | ship.md; G1; the REST notes to INTEGRATOR |
| W24 | G | yes | E | ship.md, two lines; the details in `tests/slot.js`'s header (exists) |
| W25 | K | no | E | ship.md; gains the sample test's threshold detail; its model sentence points to the core's |
| W26 | G | yes | E | ship.md, two lines; the mechanics in `tools/train.py`'s docstring (exists) |
| W27 | G | yes | S | ship.md; G4, G9, G10; the "ask back" line per audit decision 2 (note 3); the cap: §5 |

Notes. (1) `tools/precheck.py` is a new tool, not a block: it runs the fast tier and picks the smoke part from the
diff; W14's file-to-smoke map moves into it. (2) "Any other rewrite needs Pierre's explicit go first, and a backup
clone" stays in W18. (3) "A short or ambiguous request from Pierre is asked back" becomes "build the reading that is
easy to correct and say which; ask back only when both readings are costly to undo" (audit decision 2, OK'd).

**AGENTS.md items (30)**

| Item | Class | Core | Mark | Where, and what changes |
| --- | --- | --- | --- | --- |
| Rule 0, the sentence | K | yes | V | |
| Rule 0, the intro (its rewordings) | H | no | E | its decision record (#1191) |
| Rule 0, the bullets | M | yes | E | into the core's one Rule 0 bullet |
| The project in five lines | K | yes | E | shortened |
| One integrator | K | yes | E | |
| Launch decided work at once | K | yes | E | |
| The merge contract | G | yes | E | G1 |
| Easy to correct afterwards | K | yes | E | quotes to a record |
| What players will see (#1117) | G | yes | S | `tools/train.py`'s "Players see" check (in #1117); approved |
| Costly to undo | K | yes | E | |
| Always ask first | K | yes | V | W2 points to it |
| Research uses every source | G | yes | E | G6 |
| Estimates in agent time | K | yes | E | `tools/effort.py --check` covers the studies (exists) |
| Model and effort per task | G | yes | E | G5 |
| Model choice by measurement | K | yes | E | |
| No permission prompts | G | yes | E | `tools/guard_bash.py` (in #1117) |
| One writer for STATUS | K | yes | E | "never appended" to sheet.md beside D2 |
| "tu" | M | yes | E | into W1's core line |
| Questions to Pierre | K | yes | E | INTEGRATOR's "Questions" becomes a pointer to it |
| Every answer reaches its doc | K | yes | E | |
| Data access | K | yes | E | its details next to D2 |
| Reports and events | K | yes | E | |
| Dependabot | M | no | E | into W9 |
| `needs-pierre` | K | yes | E | |
| claude.ai Projects mode | D | no | S | deleted: approved, audit decision 3 ("Projects mode") |
| The rules, Writing a rule down | K | yes | E | whole, plus audit decision 4's line (S, approved) |
| The rule index (72 lines) | T | no | E | `docs/rules/README.md` |
| Read on demand | K | yes | E | |
| Ship checklist | M | no | E | into the "Every task" lines; item 1 deleted (note 4) |
| Review guidelines | K | yes | V | |

Note (4): item 1, "a clone or worktree made before 2026-11-08 16:20 Manila never pushes", is audit decision 3's
"pre-rewrite clones", approved for deletion. The counts in §0 come from these two tables (a scratch script parses
them; not committed).

**How these counts differ from the audit's (K 79, G 35, M 31, D 27 over 172 items).** The audit also classed
INTEGRATOR's 60 habits and 24 AGENTS.md bullets; this table holds the 87 rule IDs and AGENTS.md's 30 items as they
stand after #1198 and #1117, and leaves INTEGRATOR to §2.5. The audit's 27 deletions were INTEGRATOR habits and
obsolete items, approved as its decision 3 and listed in §2.5; it deleted no rule ID either. Its "D" for W18 no longer
holds: #1198 made W18 the home of "merge, never rebase or force-push". Its proposals to move W20 to photos.md and to
drop L3's starred-genera sentence are left as they are (a renumbering; L3's sentence is not L5's).

### 2.2 How the topic files load: what Claude Code documents, and the choice

Read on 2026-11-19 (Claude Code 2.1.327 in this container), in the raw text of each page:

- **Imports.** "Imported files are expanded and loaded into context alongside the CLAUDE.md that references them";
  they "don't reduce its context cost"; at most four hops deep (<https://code.claude.com/docs/en/memory>). #1198's
  `@AGENTS.md` makes the core load with CLAUDE.md; InstructionsLoaded "does fire when a `CLAUDE.md` imports your
  `AGENTS.md`, with `load_reason` set to `include`" (<https://code.claude.com/docs/en/hooks>).
- **Size.** "target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence"
  (memory page). CLAUDE.md with the core: 163 lines.
- **Path-scoped rules exist.** `.claude/rules/*.md` with a `paths:` list in YAML frontmatter; "A path-scoped rule loads
  when Claude uses the Read, Write, or Edit tool on a matching file" (or `cat` or `head` on one file); "Each pattern is
  relative to the rule's base directory", for project rules "the directory that contains the rule's `.claude`
  folder"; rules without `paths` load at launch; the directory "supports symlinks" (a target inside the working
  directory loads like any rule); "To have path-scoped rules load for files in a sibling git worktree, start Claude
  Code in that worktree or move the session there with `/cd`" (memory page).
- **Worktrees.** "A subagent in its own worktree takes the instruction files it starts with from your main
  conversation, not from its worktree. When that worktree is in the default location under `.claude/worktrees/`, the
  subagent also doesn't load the `CLAUDE.md` file or `.claude/rules/` directory at the worktree's root as it reads
  files there" (<https://code.claude.com/docs/en/worktrees>). **Observed in this session:** this subagent works in a
  worktree under `.claude/worktrees/` and its project instructions are the main checkout's CLAUDE.md
  (`/home/user/coral-id-imr/CLAUDE.md`); the main checkout sits on a session branch at `main`'s commit, so what loads
  is that branch's copy, not `origin/main`'s.
- **Subagents.** A non-fork subagent gets "every level of the CLAUDE.md hierarchy the main conversation loads,
  including … project rules"; "The built-in Explore and Plan agents skip this"; for Explore, Plan and `omitClaudeMd`
  subagents, "matching path-scoped rules still load when the subagent works with files there"; "If a rule must …
  restate it in the prompt you give Claude when delegating" (<https://code.claude.com/docs/en/sub-agents>). A
  definition in `.claude/agents/` takes `model`, `effort`, `skills` and `isolation: worktree`; a per-call `effort`
  parameter exists from v2.1.292 (same page).
- **After compaction.** "Project-root CLAUDE.md survives compaction: after `/compact`, Claude re-reads it from disk
  and re-injects it"; path-scoped rules "load again on demand" (memory page); InstructionsLoaded reports
  `load_reason: "compact"` for files re-loaded after a compaction (hooks page).
- **Hooks that carry context.** SessionStart (matchers `startup`, `resume`, `clear`, `compact`, `fork`) and
  SubagentStart add `additionalContext` "at the start of the conversation, before the first prompt"; PreToolUse also
  returns `additionalContext`, "added to Claude's context alongside the tool result"; each string is capped at 10,000
  characters; InstructionsLoaded "doesn't support blocking or decision control. It runs asynchronously for
  observability", and receives `file_path`, `load_reason`, `globs`, `trigger_file_path`, plus `agent_id` and
  `agent_type` inside a subagent (hooks page).
- **Skills** show their description in every session and load the body when used
  (<https://code.claude.com/docs/en/skills>, as the study read it; not re-read here).

**The choice.** The core relies on nothing more than #1198's import. The topic files load by one of three routes,
picked by the trial (§3):

1. **T1, path-scoped rules from the main checkout.** Each `docs/rules/<topic>.md` gains a `paths:` frontmatter, and a
   symlink `.claude/rules/<topic>.md` to it makes Claude Code read it (one home, no copy). The patterns are written to
   match inside a worktree too; whether `**` crosses `.claude/worktrees/<name>/` (a dot directory) is what the trial
   measures, with three forms side by side. Proposed: sheet `**/tools/sync/**`, `**/sync.js`, `**/progress.js`;
   learning `**/model.js`, `**/quiz.js`, `**/core.js`, `**/tools/learnsim.js`, `**/docs/LEARNING.md`; ui `**/*.css`,
   `**/index.html`, `**/app.js`, `**/proto/**`; admin `**/admin*`, `**/autosort.js`, `**/analysis.js`,
   `**/curation.json`; photos `**/judging/**`, `**/tools/fetch_*.py`, `**/tools/fish_*.py`, `**/*cand*.json`;
   content `**/data.json`, `**/points.json`, `**/tools/presence*`, `**/tools/inat.py`; subjects `**/fish.json`,
   `**/tools/build_fish.py`, `**/*seaslug*`; ship `**/tests/**`, `**/.github/**`, `**/tools/train.py`, `**/sw.js`.
2. **T2, a PreToolUse hook on Read, Edit and Write** (`tools/topic_hook.py`): from `tool_input.file_path` it names the
   topic file once per agent (`agent_id`) through `additionalContext` ("This file is under rules D1-D9: read
   docs/rules/sheet.md before editing"). It works wherever the worktree is, since it reads the path, not a glob base.
   It is the fallback if T1 does not match in worktrees.
3. **T3, read on demand only**, as today: the core's table, and every brief names the topic files of its task. It
   stays in any case, for docs-only work that touches no matching file (a photo study edits only `docs/reviews/`).

Not chosen: a SessionStart hook that prints the core from `origin/main` (it would duplicate the import, and two copies
are each other's distractors, study §2 practice 8); skills for the rules (a rule must not depend on the model choosing
to load it); `omitClaudeMd` agents (they would lose the core).

### 2.3 Merged as duplicates

One rule ID: W5 into W19, its words carried over (W19 already says "deferred = add a row inside its section"); the
retired ID goes on `tests/docs.test.js`'s retired list and its citations are updated, in D1 (§4). Not merged: W2
(its "work autonomously: branch, build, test, open PRs and fix findings without asking" is said nowhere else) and W25
(its quota practices are its own); each keeps its ID and points to the core for the half the core holds. Within the
texts: AGENTS.md's "tu" into W1's line, its Dependabot bullet into W9, its Rule 0 bullets into one core bullet, its
Ship checklist into the "Every task" lines; D5's "No card" bullet into D6; U4 the one home of the test widths.
INTEGRATOR's restatements of AGENTS.md (Rule 0, questions, names, the hard limits) become pointers (§2.5).

### 2.4 Guards: what each one checks, beside the rule it enforces

Each guard enforces a rule already decided and blocks nothing the rule allows; none returns `ask` (no new step for
Pierre: his reason for dropping the audit's decisions 6 and 7, which are not proposed again; nor is decision 9, the
names check, which is parked). A rule a guard enforces then says "Enforced: <guard>" in one line.

- **G1, `tools/train.py` `ready()`** (E). Rule: the merge contract (1)-(3); W23 "never re-run a failed CI job".
  Refuses a PR with no Codex receipt on its head, an unresolved thread, "Choices I made" other than None, or a check
  run with `run_attempt` above 1. Dependabot's PRs keep their exemption (`train.py` `exempt()`; rule W9 merges a pure
  version bump once green, with no Codex loop and no template): only the re-run check applies to them.
- **G2, a `checks.yml` step** (E). Rule: A1 "Never write `curation.json` in a PR". Fails a pull request whose diff
  touches `curation.json`; the admin's Publish reaches `main` without a PR and is untouched.
- **G3, a `checks.yml` step** (E: a habit, and the fix of something plainly broken). INTEGRATOR: check for conflict
  markers after a merge. Fails on a line starting `<<<<<<< ` or `>>>>>>> ` in a tracked text file.
- **G4, `tests/slot.js`** (S, approved: audit decision 8). Rule: L11's hard cap of compute ("when the agent reaches
  it, it stops and returns what it has"). A guarded heavy run ends at the cap with "cap reached: report what you
  have".
- **G5, a PreToolUse hook on `Agent` and `.claude/agents/`** (E). Rule: "the integrator applies the table … at every
  agent launch (the Agent tool's `model` and `effort`)". Denies a launch that sets neither `model` and `effort` nor a
  `subagent_type` whose definition sets them; three definitions (design, ordinary code, mechanical) carry the table.
  Unknown: the hooks page lists the Agent tool's `tool_input` as `prompt`, `description`, `subagent_type` and `model`,
  no `effort`, though the sub-agents page documents a per-call `effort`. A deny that cannot see `effort` would block
  every launch, so E4's first test logs a real launch's `tool_input`; if `effort` is not there, G5 checks `model` only.
- **G6, a PreToolUse hook on `WebFetch` and `WebSearch`** (E). Rule: research, "a query holds only public terms …
  never the project's data". Denies a URL or a query holding the R2 photo host, the sheet's id or a repository `img/`
  path.
- **G7, `tools/check_versions.py --sheet-base`** (E). Rule: W15 "a PR never edits `?v=N`, `LAB_V` or `sw.js` `V`".
  Fails when a frozen number differs from the base; a new reference still takes any number, as W15 says.
- **G8, a check in `tests/`** (E). Rule: W17, Playwright's `colorScheme: 'dark'` "changes nothing". Fails on
  `colorScheme: 'dark'` in `tests/` and `tools/` unless the line says why (a marker, as `rename-app: keep` does).
- **G9, `tools/brief.py` lines** (E; reports, blocks nothing). Rule: W27, no two open PRs on a sensitive file, two
  Codex rounds. Lists open PRs sharing `Code.gs`, `core.js`, `sync.js` or `model.js`, and a PR on its third
  `@codex review`.
- **G10, a lock in `tools/train.py`** (E). Rule: W27 "One train at a time". A second train waits on a lock in `.git`;
  no hand-made waiters.
- **G11, `tests/docs.test.js` budgets** (S, approved for the words: audit decision 4; E for the lines). Fails when
  AGENTS.md, `docs/rules/` and INTEGRATOR pass 14,000 words together, or when AGENTS.md passes 150 lines.
- **G12, `tests/docs.test.js` index** (E). Today's "every rule ID … listed in AGENTS.md" checks `docs/rules/README.md`
  instead; every rule a core line names resolves (that check exists).
- **G13, `tools/brief.py --short`** (E; no rule, it makes the core reliable). Warns when the main checkout's
  CLAUDE.md, AGENTS.md or `.claude/` differ from `origin/main`, since those are the copies that load.

**Loaders, not guards** (the trial tests them): the InstructionsLoaded log (`tools/instr_log.py`); a SubagentStart
hook that gives every subagent, Explore and Plan included, the Manila time and the core's version line from
`origin/main`; T1 or T2 of §2.2. Hooks that read JSON on stdin run main's copy as #1117's guard does
(`python3 -I -c "$(git show origin/main:tools/x.py)"`): today's `git show … | python3 -I -` form takes stdin.

### 2.5 History and habits out of the rules; INTEGRATOR

- **To decision records:** Pierre's quotes inside AGENTS.md bullets (easy to correct, model and effort, no permission
  prompts); Rule 0's rewording history; the dated stories in W13 (Prettier 3.3.3), W18 (the 2026-11-08 rewrite), D6
  (the pop-up before 2026-11-09), and the dated qualifiers in P1-P3 and L1. The rule format already says so ("his
  sentence and its context go in the PR description, never in the rule"; W19: "History stays in git and the PRs").
- **To tools' `--help` and ARCHITECTURE** (audit decision 3): the how-to of W9, W12, W14, W24, W26, D3 and C7.
- **To LEARNING "Validating a learning change"** (audit decision 8): L11's method.
- **INTEGRATOR** (the integrator's own habits; audit decisions 3 and 5): its restatements of AGENTS.md become pointers;
  the habits a guard replaces go (the `pgrep -f` waiter: G10; conflict markers: G3; `judging_fish.py one` and the
  generated files: their `--check` exists); the obsolete notes go, as approved: local Prettier 3.8.1, the stacked-PR
  notes, "each merge moves main", pushing from a pre-rewrite clone, the 2026-11-06 quota state.

### 2.6 Deletions

**None proposed beyond what Pierre already approved** (audit decision 3: Projects mode, in AGENTS.md and in W22's last
sentence; the Ship checklist's pre-rewrite-clones item; the obsolete INTEGRATOR notes of §2.5). Considered and kept:
W27's scratch-file names (the scratchpad is still shared by a session's agents: this subagent was briefed to write
under the integrator's session scratchpad); L15 (still the short-term goal); L3's starred-genera sentence; W4; W13's
syntax-tree comparison. Product rules are not candidates (study §3.5: rarely cited is not low value).

## 3. The trial

**The question:** does the new loading reach the integrator and its subagents in this cloud environment, in the
worktrees they work in?

**Who and when.** The integrator starts a child session (`create_session` with `source_revision` set to the branch
under test, so that branch's CLAUDE.md, AGENTS.md and `.claude/` are what load) and gives it the steps below; the
child's main agent plays the integrator and launches the subagents; the integrator reads the log and the answers.
Run 1 happens after #1198, #1117 and the harness PR (A in §4) are merged, on the core PR's branch (B), before B merges;
run 2 on the topic PR's branch (C), before C merges. Each run records `claude --version` (2.1.327 here; the documented
features need 2.1.292 or later).

**Untested: the child session itself.** Whether `create_session` with `source_revision` loads that branch's
instructions and hooks, whether it stops on a trust prompt, and whether its main agent reports back (the integrator
reads its transcript with `list_events` either way) are not known. Its first step is therefore T0: the child prints
`git rev-parse HEAD` and quotes CLAUDE.md's first line; a wrong branch stops the run. **Fallback** if the child
session does not work: B is a docs PR that one train reverts, so it merges once Pierre has OK'd the list, and run 1
happens in the first new integrator session after it, which the integrator reports before anything else relies on
the core; run 2 the same way after C.

**Not loaded and not tested: docs/INTEGRATOR.md.** The integrator reads it because CLAUDE.md and the core tell it to,
not through an import (an import would load its 20 KB into every subagent). This proposal moves nothing into it that
a rule needs: every clause the core cuts goes to a rule file or a record (§1.1).

**The harness** (PR A). An InstructionsLoaded hook appends `time, session_id, agent_id, agent_type, file_path,
load_reason, globs, trigger_file_path, cwd` to `.git/claude-instructions.jsonl` of the shared repository (one file for
every worktree, never committed); `python3 tools/instr_log.py --report --since T` prints, per agent, what loaded and
why. The canary is the core's first words ("Core v1"): no brief contains them.

**The steps, and what passes:**

- **T1, run 1, the child's main agent.** At its start, without opening a file, it quotes Rule 0's sentence and the
  core's first line. Pass: both exact; the log shows CLAUDE.md with `session_start` and AGENTS.md with `include`.
- **T2, run 1, a general-purpose subagent** working in a worktree made with `git worktree add` under
  `.claude/worktrees/`. The same quotes, plus rule W27's core line. Pass: exact; log entries carry its `agent_id`.
- **T3, run 1, an Explore subagent.** It quotes the SubagentStart line (the time and the core's version). Pass: exact
  (Explore skips CLAUDE.md, as documented, so only the hook reaches it).
- **T4, run 1, the integrator.** `brief.py --short` in a checkout whose AGENTS.md differs from `origin/main`. Pass:
  G13's warning shows.
- **T5, run 2, the subagent of T2.** It reads the first lines of `tools/sync/Code.gs` in its worktree, then quotes
  rule D3's first sentence without opening `docs/rules/`. Pass: exact, and the log shows `path_glob_match` for the
  sheet rules with a `trigger_file_path` inside the worktree. Three canary rules with the patterns `tools/sync/**`,
  `**/tools/sync/**` and `.claude/worktrees/*/tools/sync/**` show which form matches. **And no topic file loads with
  `session_start`**: the memory page says a rule whose frontmatter does not parse loads "as if it had no `paths`",
  which would put every topic file in every session.
- **T6, run 2, the child's main agent.** The same read in the main checkout. Pass: the same entries, with a
  `trigger_file_path` in the main checkout.
- **T7, any long integrator session after B merges.** Its first auto-compaction. Pass: the log holds `compact` entries
  for CLAUDE.md and AGENTS.md.

**What the results decide.** T1 and T2 pass in three runs out of three: B merges; either fails: B waits until the
cause is found (a stale main checkout, an import not followed). T5 passes with one pattern form in three runs out of
three: C uses T1 with that form; it fails: C uses T2, the hook, tested the same way; both fail: T3 only, and the core's
table and the briefs carry the load. T3 fails: the SubagentStart hook is fixed before any rule relies on it. T7 is read
when it happens; a failure re-opens the SessionStart-on-compact option of §2.2. Each run's log summary and the quoted
answers go into the PR the run gates.

**Not measured by the trial:** whether agents follow the rules better with less text (the research says adherence
falls as instructions pile up, study §2; for a week after B the integrator watches the relapses the audit listed, from
the ledger and STATUS); Codex's reading of the shorter AGENTS.md (its review guidelines are unchanged).

## 4. The PR sequence

One PR per agent (rule W22), at most four agents that write code at once (rule W27), never two PRs on the same rule
file at once. Estimates are agent time from `tools/effort.py --estimate` (first commit to green checks; reading and the
trial's waits come on top), each the median of the merged PRs it cites.

- **A, the trial harness**: `tools/instr_log.py`, the InstructionsLoaded and SubagentStart hooks, G13, tests. Needs
  #1198 and #1117. Tooling S: median 4 min (#916, #965, #1003, #1072, #1103).
- **Run 1**: T0-T4 on B's branch in a child session. Needs A. Study S: median 11 min (#979, #1064, #1081, #1097, #1185).
- **B, the core**: AGENTS.md as in §1; the index to `docs/rules/README.md`, whose budget (1 KB, lines of 150) is
  raised in `tests/docs.test.js`; G12; G11's line budget; the ten links to `AGENTS.md#the-rules` in the rule files and
  elsewhere re-pointed to the index (the anchor still resolves, so no test would catch them); the spec links each
  topic file's header lacks; the cut clauses carried to their homes (§1.1). Needs Pierre's OK on the list (§5) and run
  1. Docs+tooling L: median 1.6 h (#906, #1047, #1075, #1087, #1133).
- **C, the topic files on demand**: `paths:` frontmatter in every rule file and `.claude/rules/` links (T1), or
  `tools/topic_hook.py` and its entry in `.claude/settings.json` (T2). Needs B, and run 2 on its branch.
  Docs+tooling S: median 13 min (#896, #912, #916, #965, #1011).
- **Run 2**: T5-T6 on C's branch. Needs C's branch. Study S: median 11 min (#979, #1064, #1081, #1097, #1185).
- **D1, `ship.md`**: audit decisions 2 and 3, W5 into W19 (the ID retired, its citations updated), the obsolete
  items, history to records. Needs C. Docs L: median 50 min (#933, #947, #1033, #1089, #1140).
- **D2, the other rule files**: L11's method to LEARNING, D3's steps to `--help`, D5 and D6, P1-P3, L1, U7, D2's
  data-access details. Needs C. Docs M: median 12 min (#892, #903, #944, #1080, #1190).
- **D3, INTEGRATOR**: pointers, the habits a guard replaced, the obsolete notes. Needs B. Docs M: median 12 min
  (#892, #903, #944, #1080, #1190).
- **E1, G1 and G10 in `tools/train.py`.** Needs A. Tooling M: median 15 min (#960, #1040, #1144, #1157, #1160).
- **E2, G2 and G3 in `checks.yml`, G7, G8.** Needs A. Tooling S: median 4 min (#916, #965, #1003, #1072, #1103).
- **E3, G4 in `tests/slot.js`, G9 in `tools/brief.py`.** Needs A. Tooling M: median 15 min (#960, #1040, #1144,
  #1157, #1160).
- **E4, G5 and G6 (PreToolUse hooks) and `.claude/agents/`.** Needs A. Tooling M: median 15 min (#960, #1040, #1144,
  #1157, #1160).
- **F, G11's word budget (14,000).** Needs D1-D3. Tooling S: median 4 min (#916, #965, #1003, #1072, #1103).

**Order.** A first, then run 1; B after Pierre's OK and run 1; then C (it edits every rule file's header, so it runs
alone on them), run 2 on C's branch, and D1, D2, D3 after C (D1 and D2 touch different files and may run together),
each naming in one line the guards merged by then; F last, when the cut words are known. The guard PRs E1-E3 run in
parallel with B and C after A: they touch no rule text. Three PRs edit `.claude/settings.json` (A, E4, and C if it
takes T2): they go one after another, A first, never two open at once. The agent cap stays as `main` words it until
§5's point 2 is settled. A Codex finding that comes back after two rounds cuts the PR's scope (rule W27).

## 5. Questions for Pierre (French, ready to paste)

Already decided, not asked: Q425 B (08:53); merge, never rebase, and one PR per agent (08:53); the audit's decisions
1-5 and 8 (2026-11-18 evening; a paraphrase on #1117's and #1193's branches, not on `main`); «ok, lance les quatre».
No deletion is asked: none is proposed beyond those already approved.

```text
Pierre, deux points sur le noyau des règles (Q425 B), sans numéro :

1. La liste de ce qui va dans le noyau (ce que tu voulais voir avant toute formulation). Le noyau, c'est AGENTS.md
   réduit de 265 à 150 lignes, chargé par chaque agent et sous-agent. Il contient :
   - la Règle 0 avec ta phrase telle quelle ;
   - le contrat de merge : qui merge et quand ; ce qui est facile à corriger part, ce qui est coûteux t'attend ;
     demander d'abord pour le destructif, l'argent, les accès, les données envoyées dehors ; ce que les joueurs
     verront vient de toi ;
   - le travail avec toi : le tu et le français (W1), les questions et le registre des réponses, la recherche
     (termes publics seulement), les estimations en temps d'agent, le modèle et l'effort par tâche, pas de demandes
     de permission, le sheet (lecture libre, écriture avec ton OK ponctuel), les signalements du matin ;
   - une ligne par règle qui vaut pour toute tâche : W11, C1, C2, C5, S1, D1, D2, A1, D3, D4, D5, L11, L12, W15,
     W16, W12, W14, W17, W22, W18, W24, W23, W26, W19, W6, W7, W10, W27 ;
   - le tableau des fichiers thème et la liste de relecture de Codex.
   Les 57 autres règles (C3, C4, C6-C8, P1-P6, L1-L10, L13-L15, U1-U14, A2-A5, S2, S3, D6-D9, W2, W3, W4, W8, W9,
   W13, W20, W21, W25) restent dans leur fichier thème, lu quand l'agent touche les fichiers concernés. Aucune règle
   supprimée, aucune durcie. Un seul doublon fusionné : W5 (noter dans la ROADMAP les idées discutées mais pas
   construites) passe dans W19, qui le dit déjà, avec ses mots.
   Recommandation : ok.

2. Seulement si le chat du 18 au soir ne le tranche pas : le plafond d'agents (W27). La règle dit «au plus quatre
   agents qui écrivent du code ou lancent des tests, les études en lecture seule en plus» (ton «ok» du 18 en
   journée). Le soir, tu as dit ok aux décisions 1 à 5 de l'audit des règles, dont la 1 recommandait de supprimer ce
   plafond. Lequel vaut ?
   Recommandation : supprimer le plafond ; la charge de la machine reste protégée par tests/slot.js, et les conflits
   par la liste des PR ouvertes qui touchent les mêmes fichiers.
```

*Numbered?* Point 1 is a step of Q425 B (no number). Point 2, if asked, confirms an answer already given (no number,
AGENTS.md "Questions to Pierre").

## 6. What I checked and what I did not (rule W11)

- **Read in full:** CLAUDE.md, AGENTS.md, INTEGRATOR, the nine rule files and the rules README, ANSWERS (`main`),
  `.claude/settings.json`, the agentic-practices study; on #1117's branch the rules audit, the guards record, and its
  diffs to AGENTS.md, `.claude/settings.json` and the PR template; #1198's description and its diffs to CLAUDE.md,
  AGENTS.md, ANSWERS, W18, W22, rule A1's file and its record. **Searched, not read whole:** #1193's ledger (its
  rules entries of 2026-11-09, 11-14 and 11-18), `tests/docs.test.js` (its AGENTS.md, index, budget and effort checks),
  the citations of AGENTS.md's headings across the repository.
- **Documentation:** the memory, worktrees, hooks and sub-agents pages read on 2026-11-19 (hooks and sub-agents in
  their raw Markdown, downloaded whole; memory and worktrees through a fetch of the whole page); skills not re-read
  (the study's reading). The quotes in §2.2 are from those texts.
- **Measured:** the core's lines, bytes and longest line on the text of §1 (`wc`, `awk`); the counts of §0 from the
  tables of §2.1 (a scratch script that also checks every rule ID appears once); the effort figures with
  `tools/effort.py --estimate` on 2026-11-19; the existing guards named in §2 exist on `main`, file by file, or in
  #1117's diff; the V marks of §1.1 by a scratch script that looks for each part's whole text in AGENTS.md and the rule
  files as #1198 and #1117 leave them.
- **Observed once, in this session:** a subagent in a worktree got the main checkout's CLAUDE.md, and the main
  checkout is on a session branch. Not observed: AGENTS.md imported (#1198 is not merged), a path-scoped rule loading,
  a hook firing in a subagent.
- **Not checked:** whether `**` in a `paths:` pattern crosses `.claude/worktrees/` (T5); whether a symlinked rule keeps
  its frontmatter's `paths:` (T5 too); the chat of 2026-11-18 evening (only its paraphrase); ARCHITECTURE and the
  specs that D1 and D2 will edit; Codex's behaviour with a shorter AGENTS.md; whether a child session made with
  `create_session` loads its branch's instructions and hooks (T0, with a fallback); whether the Agent tool's
  `tool_input` carries `effort` (E4's first test); how reliably the integrator reads docs/INTEGRATOR.md (by
  instruction, not loaded). That an E part keeps its rule's substance was judged by reading, part by part; only V is
  checked by a tool.
