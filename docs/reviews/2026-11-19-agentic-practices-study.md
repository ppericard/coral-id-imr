# Long-running agentic development: best practices, our rules, and options (2026-11-19)

**Status: study, docs only.** Pierre's request of 2026-11-19, 08:24 Manila. Nothing in the rules, the docs or the code
is changed by this PR: it proposes, Pierre decides (AGENTS.md "Writing a rule down"). No question number is assigned
here: the integrator numbers the questions of §7 when it asks them.

**Pour Pierre : le résumé en français est à la fin (§9), avec les questions (§7).**

## 1. The request and the base

Pierre, 2026-11-19 08:24: «Est-ce que tu peux lancer un agent Opus high sur une étude qui fait le point sur les
dernières best practices pour ce qui concerne le développement agentique long terme, et qui propose des évolutions à
notre manière de fonctionner et nos règles/documentation ? Je me demande s'il ne faudrait pas faire un gros travail
d'édition sur les règles, quitte à supprimer des trucs peu importants pour que les règles les plus importantes ne se
retrouvent pas noyées dans le contexte ? Garde toutes les options ouvertes stp.»

- **Base:** `origin/main` at `fe0dbb1bb` (#1190), 2026-11-19 about 08:25 Manila. Open PRs read: #1117 (guards and the
  rules audit), #1186 (open points), #1191 (Rule 0), #1193 (the ledger's history).
- **It builds on, and does not redo:** the rules audit of 2026-11-18 (`docs/reviews/2026-11-18-rules-audit.md`, on
  #1117's branch, not merged), which already sorts the 172 rule items into keep / guard / merge / delete; the docs audit
  ([2026-11-18-docs-audit.md](2026-11-18-docs-audit.md)) and its restructuring plan; the governance review
  ([2026-11-05-governance-review.md](2026-11-05-governance-review.md)). What this study adds: the outside sources, how
  the files actually load into an agent's context, tiering, and the options per area that Pierre asked to keep open.
- **Labels (rule W11):** *measured* (counted in this checkout or the PR list), *documented* (a vendor's documentation
  says so), *research* (a paper measured it), *practitioner* (someone's experience or opinion), *judgement* (mine).

## 2. Best practices found, with sources

Each item: what the source says, its kind, and what it implies here.

1. **Instructions are context, not enforcement; length lowers adherence.** Claude Code's memory page: "Claude treats
   them as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse
   hook instead. The more specific and concise your instructions, the more consistently Claude follows them." And:
   "target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence."
   (*documented*, <https://code.claude.com/docs/en/memory>). **Here:** AGENTS.md alone is 263 lines; the integrator's
   must-read set is about 1,000 lines (§3).
2. **Contradictions are resolved at random.** Same page: "if two instructions contradict each other, Claude may pick one
   arbitrarily. Review your CLAUDE.md files [...] periodically to remove outdated or conflicting instructions." It
   offers `/doctor prompt-audit` for that (*documented*). **Here:** §3.4 lists live contradictions.
3. **What loads by itself.** With both files present, "An `AGENTS.md` and a `CLAUDE.md` [...]: Claude reads your
   `CLAUDE.md` files only"; and "A `CLAUDE.md` that tells Claude in words to read `AGENTS.md`: Claude sees `AGENTS.md`
   only if it decides to open the file. [...] replace the sentence with an `@AGENTS.md` import." (*documented*, same
   page). A subagent gets "every level of the CLAUDE.md hierarchy the main conversation loads", not the parent's
   conversation, and the page advises: if a rule must hold, "restate it in the prompt you give Claude when delegating"
   (*documented*, <https://code.claude.com/docs/en/sub-agents>, read through a summarising fetch). **Here:** our
   CLAUDE.md says "Read AGENTS.md" in words, so the constitution, Rule 0's text and the rule index are in an agent's
   context only if it chooses to open them. In this session (a subagent) the project-instructions block held CLAUDE.md
   only (*observed in one session*).
4. **Deterministic for "never", prose for judgement.** Best practices page: "If something has to happen every time,
   make it a hook, a deny rule, or a managed setting. `CLAUDE.md` is for guidelines, and Claude is allowed to decide a
   guideline doesn't apply." "If you keep adding emphasis to a `CLAUDE.md` line and Claude still misses it, that's a
   sign the line belongs in a hook." And the counterweight: "keep the enforced set small [...] If you ever find yourself
   at forty of them, most are probably preferences" (*documented*, <https://code.claude.com/docs/en/best-practices>).
   **Here:** the rules audit found the same pattern in our history: the rules that held are the ones a tool enforces
   (W24 `tests/slot.js`, W26 `train.py`, D3 `sheet_version.py`); the ones that relapsed are prose about behaviour.
5. **On-demand loading.** Path-scoped rules in `.claude/rules/` with a `paths:` list load "only when Claude works with
   matching files"; skills show their description in every session and load the body when used ("Keep `SKILL.md` under
   500 lines"); `@path` imports "don't reduce its context cost" (*documented*, memory and
   <https://code.claude.com/docs/en/skills>). **Here:** our "Read on demand" table in AGENTS.md does by hand what
   path-scoped rules do by themselves.
6. **Hooks can put the right text in context at the right time.** SessionStart (also after `compact`), UserPromptSubmit
   and SubagentStart can add context; PreToolUse exit 2 blocks a call and tells Claude why; PreCompact's output steers
   the compaction summary (*documented*, <https://code.claude.com/docs/en/hooks>, read through a summarising fetch).
   **Here:** we use SessionStart and UserPromptSubmit for `brief.py`; nothing re-states the core after a compaction or
   at a subagent's start.
7. **Context is a finite budget that degrades.** "Context, therefore, must be treated as a finite resource with
   diminishing marginal returns"; keep "lightweight identifiers (file paths, stored queries, web links, etc.)" and load
   just in time; compaction, structured notes and subagents with clean contexts for long-horizon work (*vendor
   engineering blog*, <https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents>).
8. **Context rot and distractors.** "models do not use their context uniformly; instead, their performance grows
   increasingly unreliable as input length grows" (18 models); a single distractor lowers performance and "their
   non-uniformity amplifies as input length grows" (*research*, Chroma technical report,
   <https://www.trychroma.com/research/context-rot>). Lost in the middle: "performance is often highest when relevant
   information occurs at the beginning or end of the input context" (*research*, Liu et al., TACL,
   <https://arxiv.org/abs/2307.03172>). **Here (inference):** two slightly different statements of one rule are each
   other's distractors.
9. **Instruction count.** IFScale: 20 models, 10 to 500 simultaneous instructions; "even the best frontier models only
   achieve 68% accuracy at the max density of 500 instructions", with a "bias towards earlier instructions" (*research*,
   <https://arxiv.org/abs/2507.11538>). ManyIFEval: performance "consistently and drastically degrades" as instructions
   are added (*research*, Harada et al., Findings of EMNLP 2025, <https://arxiv.org/abs/2509.21051>). Both test simple
   checkable instructions (keywords, formats): that this carries over to behavioural rules is an **inference**.
   HumanLayer reads IFScale as "~150-200 instructions with reasonable consistency" and keeps its root file under sixty
   lines (*practitioner*, <https://www.humanlayer.dev/blog/writing-a-good-claude-md>; it also says "Never send an LLM
   to do a linter's job" and "Prefer pointers to copies").
10. **Long-running harnesses.** A progress file plus git as the state a fresh session reads first; "only one feature at
    a time"; failure modes "declares victory on the entire project too early" and leaving "a state with bugs or
    undocumented progress"; a feature list kept in JSON because the model is less likely to overwrite it than Markdown
    (*vendor engineering blog*, <https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents>).
    **Here:** STATUS plays the progress file; the ledger is Markdown that every PR may edit.
11. **Orchestrators and subagents.** "Each subagent needs an objective, an output format, guidance on the tools and
    sources to use, and clear task boundaries"; multi-agent runs "use about 15× more tokens than chats"; "agents are
    stateful and errors compound", so resume rather than restart; "Synchronous execution creates bottlenecks" (*vendor
    engineering blog*, <https://www.anthropic.com/engineering/multi-agent-research-system>). The sub-agents page adds
    `model`, `effort`, `tools`, `skills` and `isolation: worktree` in an agent's definition file (*documented*).
12. **AGENTS.md for other agents.** Codex reads `AGENTS.md` root to leaf, "at most one file per directory", with a
    combined default cap of 32 KiB, after which "it stops adding more files" (*documented*,
    <https://learn.chatgpt.com/docs/agent-configuration/agents-md>); <https://agents.md/>: "the closest one takes
    precedence"; "Treat AGENTS.md as living documentation" (*documented*). **Here:** AGENTS.md is 23.8 KiB; Codex's
    review guidelines are its last section. The docs test caps it at 30 KB (target 20).
13. **Decision records.** Short, one decision each, "If a decision is reversed, we will keep the old one around, but
    mark it as superseded"; "one or two pages long" (*practitioner, the origin of ADRs*, Nygard,
    <https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions>). **Here:** `docs/decisions/` follows
    this already.
14. **Specs as the source of truth.** Spec Kit: specs are "living, executable artifacts that evolve with the project",
    in phases with checkpoints (*vendor blog*, [GitHub, "Spec-driven development with AI"][speckit]).
    **Here:** `docs/spec/` exists; the question is how much of it duplicates code.
15. **Parallel agents and review load.** Willison runs several agents at once on research, maintenance and
    well-specified work, the kinds that do not create a review bottleneck (*practitioner*,
    <https://simonwillison.net/2025/Oct/5/parallel-coding-agents/>). **Here:** the bottleneck is the integrator's
    attention, not the machine.
16. **Append-only files and merges.** git's `union` driver takes "lines from both versions, instead of leaving conflict
    markers", leaving them "in random order"; "Do not use this if you do not understand the implications"
    (*documented*, <https://git-scm.com/docs/gitattributes>).

[speckit]:
  https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit

## 3. Measurements of this repository

All *measured* on `fe0dbb1bb` unless marked. Tokens are bytes / 4, an **estimate**.

### 3.1 What an agent reads before acting

- **Loaded by itself:** `CLAUDE.md`, 786 bytes, 9 lines (about 200 tokens), plus the hook's 5-line brief.
- **A subagent, as briefed** (CLAUDE.md, AGENTS.md, one rule file): 25-60 KB, about 6,000-15,000 tokens (ship.md is
  35 KB alone).
- **The integrator** (CLAUDE.md, AGENTS.md, INTEGRATOR, STATUS, ANSWERS, ship.md): 94 KB, about 23,000 tokens; with
  the ledger's history of #1193 (97 KB on its branch), about 47,000 tokens.
- **The governing set** (CLAUDE, AGENTS, INTEGRATOR, STATUS, ANSWERS, the nine rule files): 166 KB, about 41,000 tokens.

| File | KB | Lines | Lines with never / always / must |
| --- | --- | --- | --- |
| AGENTS.md | 23.8 | 263 | 53 |
| docs/INTEGRATOR.md | 20.5 | 225 | 32 |
| docs/rules/ship.md | 34.2 | 423 | 47 |
| docs/rules/learning.md | 21.1 | 248 | 32 |
| docs/rules/sheet.md | 14.0 | 165 | 25 |
| docs/rules/photos.md | 9.7 | 113 | 25 |
| the five other rule files | 25.6 | 344 | 46 |
| STATUS + ANSWERS | 13.6 | 174 | 7 |

- **Rules:** 87 rule IDs; the rules audit counts 172 rule items with the AGENTS.md bullets and INTEGRATOR's habits, and
  24,592 words.
- **Long lines:** 32 lines of AGENTS.md exceed 120 characters (the model-table bullet is one line of about 600); the
  docs test allows 980 there.

### 3.2 The wider corpus agents slice into

- `docs/`: 4.87 MB. Studies (`docs/reviews/`) 2.16 MB in 65 files; `docs/archive/` 0.94 MB; 28 specs 0.67 MB;
  LEARNING 175 KB, ROADMAP 115 KB, FISH_PATH 83 KB; 42 decision records 113 KB. 178 Markdown files, 4.98 MB.
- **PRs:** 1,196 (1,167 merged) since 2026-10-31; 348 opened since 2026-11-12. PR descriptions: median 5.8 KB, 90th
  percentile 13.7 KB, so a PR body is itself a document an agent reads.
- **Shared files touched by the 420 commits on `main` since 2026-11-12:** ROADMAP 156 (37 %), STATUS 33,
  `docs/decisions/README.md` 32 (it exists since 2026-11-18), INTEGRATOR 21, AGENTS 19, the rule files 21.
- **Handovers:** 31 of the 348 PRs since 2026-11-12 are STATUS-only handovers (9 %).

### 3.3 Duplication: one rule, many homes

Files under AGENTS, CLAUDE, README, INTEGRATOR, STATUS, ANSWERS, HANDOVER, ROADMAP, ARCHITECTURE, LEARNING, the rules
and the specs that state each topic (a search, so it counts mentions, not only restatements):

- the merge train: 11 files; how questions are numbered: 10 (INTEGRATOR restates AGENTS.md's paragraph nearly whole);
  Rule 0 / 17:30: 6; the machine slot: 5; force-push: 5; the model and effort table: 2 in full (AGENTS.md and
  INTEGRATOR), plus W25 and STATUS by reference; `curation.json` written only by Publish: 30 files (mostly specs that
  describe it, which is fine).
- **The cost of a change:** Rule 0's end time (#1191) touches AGENTS.md, INTEGRATOR, `tools/brief.py`, the docs test,
  the ledger, a record and its index row.

### 3.4 Contradictions found today (*read*)

1. **Rebase and force-push.** W18 and the Ship checklist item 8: "rebase on `origin/main` before each push"; W18 allows
   `git push --force-with-lease` to one's own PR branch. INTEGRATOR: "Never force-push", "never a rebase"; W26: "A PR is
   never brought up to date with `main` just to merge". STATUS of 05:20 lists a `--force-with-lease` (#1164) among the
   night's slips. An agent that followed W18 broke INTEGRATOR.
2. **PRs per agent.** W22: "At most two open PRs per agent"; W27: "Each agent is on one PR or one study".
3. **Where to look before asking.** W7: "Never re-ask something already answered: check ROADMAP and PR descriptions";
   AGENTS.md since #1188: search the ledger, the rules and `docs/decisions/`.
4. **Ambiguous requests.** W27: "A short or ambiguous request from Pierre is asked back before any work starts";
   AGENTS.md's merge contract and INTEGRATOR "Don't ask the obvious": push what is easy to correct. The rules audit's
   decision 2 resolves it (§6), but W27 still says it.
5. **The agent cap.** W27 holds "At most four agents that write code or run tests [...] Read-only studies [...] on
   top" with Pierre's "ok" of 2026-11-18; the ledger on #1193 records, as a paraphrase, his OK of the same evening to
   the rules audit's decisions 1-5, whose decision 1 recommended "(a) delete the cap". Two records of his words
   disagree; this study does not pick one (§7, question 4).

### 3.5 Which rules PRs cite

Count of PR descriptions since 2026-11-12 that name "rule X" (348 PRs; older PRs predate the renumbering; counts in code
are useless because P1, D1… are also player pseudonyms and hex strings):

- **Cited by 20 or more:** D3 66, L11 38, S1 36, D4 34, A1 31, C2 30, D1 23, C7 22, L12 22, P1 22, W19 21, D5 20.
- **Cited by 1 or none:** W1, W2, W4, W10, W13, W18, W21, W22, W25 (process); L1, L3, L14, L15, P2, P3, P5, P6, U1,
  U2, U5, U6, U9, U10, U11, U13, U14, S3 (product).
- **Reading (judgement):** a rule nobody cites is not therefore low-value. L14 (visual recognition first), L15 (ideal
  photos first) and U9 (sign-in never on My progress) are principles that shape everything and are rarely the subject of
  a PR; W13 and W21 are cited rarely because CI enforces them. The low-cited *process* rules are the candidates for one
  line or a guard; the low-cited *product* rules are not candidates for deletion.

### 3.6 Questions held in studies

- 42 of the 64 dated studies have a heading about questions or decisions for Pierre; whether each is closed is written
  only in the reviews README's last column, by hand.
- 31 PR descriptions since 2026-11-12 contain "Questions for Pierre".
- STATUS lists 9 numbered questions open and "Still open: #1099 floor…; #1093 A/B; #1045 A/B; #1095 three points;
  #1098 (a)-(f); #1041 §6": questions whose text lives only in PRs. #1186 counts 8 more recorded open elsewhere and
  absent from STATUS.

### 3.7 Today's incidents, as evidence

- **Re-asked:** the rename (answered 2026-11-18), the Pikachu nickname (answered 2026-11-17), the corals' photo source
  weight (rule P1, 2026-11-18). The ledger quotes Pierre at 06:50: «J'ai déjà répondu plein de fois à cette
  question!!!!» Each answer lived in STATUS (overwritten) or a PR description, not in the doc an agent reads.
- **Approved, not applied:** the rules audit's decisions 1-5 and 8, OKed on the evening of 2026-11-18 (ledger on #1193:
  "Applied: STATUS (#1122); #1117's study (to record)"), are in no rule a day later; #1117 itself is green and unmerged.
  The same failure as the re-asks, one level up: a decision taken, waiting on the integrator's attention.
- **Shell rules broken** despite AGENTS.md (heredocs, `python -c`, `sed -i`): a prose rule about behaviour, with no
  guard until #1117's `tools/guard_bash.py` lands.
- **Index conflicts:** `docs/decisions/README.md`, ROADMAP and now ANSWERS.md are appended to by most PRs; 25 PR
  descriptions since 2026-11-12 mention an "index row", and STATUS's merge instructions say "keep both decision index
  rows".
- **A container restart killed every running agent;** the integrator's helper scripts live in the scratchpad and were
  lost with an earlier session (INTEGRATOR: "None is committed as a tool yet").
- **Agents idle while the integrator waited**, and the integrator's context filled up: the integrator is the one
  synchronous step (practice 11).

## 4. Diagnosis

1. **The core is not where the tool looks.** The one file loaded by itself is 9 lines that point elsewhere. Everything
   that matters (Rule 0's text, the merge contract, the "never" list) depends on an agent choosing to open a 24 KB file,
   and a subagent's brief restating it (practice 3). *Documented and observed once; whether a given agent opened
   AGENTS.md today is not measured.*
2. **Too much, at one level.** About 172 rule items and 267 never/always/must lines sit at the same weight: a
   product principle (L14), a hard limit (D1), a habit (wait with `pgrep -f`) and a story ("the container restarted 3
   times on 11-06"). Practices 1, 8 and 9 say adherence falls as the set grows and the middle is read least; the
   important rules are "noyées", as Pierre put it. *Inference from the sources, consistent with the relapses.*
3. **Copies drift into contradictions.** Five live contradictions (§3.4), each with a rule in two homes. Practice 2:
   the model then picks one.
4. **Prose where a guard is possible.** The relapses (shell forms, waiters, compute caps, names) are rules nothing
   checks; the holds are rules a tool checks (rules audit; practice 4).
5. **Truth is spread, and answers do not reach the doc.** An answer can live in the chat, STATUS, a PR's Decisions, the
   ledger, a record, a rule's *Source* line or a study's question list. The ledger fixes "where to look", but it is
   Markdown, appended by every PR, and will be 97 KB: a file to search, not to read.
6. **The integrator is the bottleneck and a single point of failure.** It holds the queue, the trains, Codex, the
   threads, Pierre's questions and the handover; its tools are not committed; a restart or a full context stops
   everything.
7. **Shared append files serialise parallel PRs.** Every decision PR edits one index; most PRs touch ROADMAP.
8. **Volume invites slices, slices disagree.** 4.9 MB of docs, 2.2 MB of studies whose answers are recorded elsewhere.

## 5. Options per area

Each option: what it is, **cost** (agent time measured by `tools/effort.py` on merged PRs: first commit to green
checks, so reading and briefing come on top), **risk**, **buys**, and its kind: **[substance]** changes what a rule
requires and needs Pierre's OK (AGENTS.md "Writing a rule down"); **[editing]** changes wording, placement or tooling
only. Options in one area can be combined.

### (a) A big edit of the rules

- **a1. Apply what is approved, fix the contradictions [editing, plus Pierre's choice on the cap].** Apply the rules
  audit's decisions 1-5 and 8 as he OKed them; one home per rule with a pointer elsewhere; resolve the five
  contradictions of §3.4 (W18 to "merge, never rebase"; W22's two PRs; W7's places; W27's ask-back; the cap, once §7
  question 4 is answered); delete the obsolete items the audit lists (Projects mode, pre-rewrite clones, Prettier 3.8.1,
  stacked-PR notes). **Cost:** two or three docs PRs of size M-L: docs M median 9 min (#1190), docs L median 27 min, up
  to 50 min (#1140). **Risk:** low; a wording Pierre approved could be shortened past his meaning (each cut keeps his
  words in the record). **Buys:** about −45 % words (the audit's estimate), no contradiction left.
- **a2. A tiered set: a short core always loaded, topic files on demand [editing; the choice of what is core is
  Pierre's].** A core of at most about 150 lines that loads by itself (an `@` import from CLAUDE.md, or the core moved
  into CLAUDE.md): Rule 0, the merge contract in a few lines, "ask first", the never-list that has no guard yet, how to
  ask Pierre, where truth lives. Topic files become path-scoped rules in `.claude/rules/` (`sheet` on `Code.gs` and
  `sync.js`, `learning` on `model.js`, `quiz.js`, `core.js`…), so they load when an agent touches those files;
  AGENTS.md stays the index for Codex and humans; the integrator's how-to becomes an `integrate` skill. A
  SubagentStart hook restates the core in every subagent. **Cost:** docs L plus tooling S-M (the docs test learns the
  new homes): docs L median 27 min (#1140), tooling S median 26 min (#916). **Risk:** a rule that sits in a
  path-scoped file is not seen by an agent that never opens a matching file (a rule that must hold everywhere belongs
  in the core); Codex does not read `.claude/rules/`, so its review guidelines stay in AGENTS.md; one more mechanism to
  keep working. **Buys:** the rules that matter in every session are actually in every session, at the start of the
  context (practices 1, 3, 5, 8).
- **a3. Guards first, prose shrinks [substance where a guard blocks something the prose only asked; approved in
  principle by audit decision 3].** Each "never" with a mechanical test gets a hook or a CI check, and its text becomes
  one line naming the guard. Candidates beyond #1117's Bash guard: `train.py` checks the Codex receipt on the head,
  open threads and "Choices I made"; a CI step fails a PR diff that touches `curation.json` (A1) or holds conflict
  markers; a PreToolUse hook on the Agent tool refuses a launch without `model` and `effort`; a hook on web tools
  refuses a query holding the R2 host or the sheet's id; the 40-minute cap in `tests/slot.js` (audit decision 8).
  **Cost:** tooling S-M per guard: median 26 min (#916) to 12 min for M (#960), up to 1.6 h for a large tool (#1087).
  **Risk:** a guard that fires wrongly blocks real work; each one needs maintenance (practice 4 warns at forty); a
  guard can encode a reading Pierre never gave. **Buys:** the relapses stop for good; the text shrinks.
- **a4. Rewrite from zero [substance].** A new constitution of at most 200 lines written from the ledger, the records
  and the rules' sources; every rule re-approved by Pierre in batches; the old files archived. **Cost:** a study and
  several docs PRs, comparable to the docs restructuring of 2026-11-18 (its PRs #1134, #1140, #1151, #1163: docs L
  27 min median, tooling L 57 min median, #1151) plus several hours of Pierre's reading. **Risk:** the highest: a rule
  he cares about dropped by omission, re-approval fatigue ("J'ai déjà répondu plein de fois"), churn while every open
  PR cites old IDs. **Buys:** one coherent text.
- **Deleting rules:** by evidence, never by citation count (§3.5): obsolete items, dated stories inside rules (W19
  already says history goes to records), habits that are state (INTEGRATOR's "quota 7 %"). Product rules stay.

### (b) Where truth lives

- **b1. A map of single homes, written once [editing].** An answer: the ledger, and the doc it changes; a rule:
  `docs/rules/`; why: `docs/decisions/`; state: STATUS; the plan: ROADMAP; a study: a dated snapshot with a status line
  ("open: questions in STATUS" / "answered: see ledger"). A docs test checks that STATUS's questions and the studies'
  status lines agree (the integrator's proposal 2). **Cost:** docs+tooling M, median 31 min (#1056). **Risk:** low.
  **Buys:** one place per kind of fact.
- **b2. Search, do not read [editing].** `tools/asked.py TERM` (the integrator's proposal 1) searches the ledger,
  records, rule *Source* lines, studies and merged PRs' Decisions sections and prints hits with their dates; the ledger
  splits by month (`docs/answers/2026-11.md`) so no one reads it whole. **Cost:** tooling S-M, 26 min median (#916),
  12 min for M (#960). **Risk:** a search misses a paraphrase; a hit is read as current when a later answer changed it.
  **Buys:** the re-asks of today become a one-command check.
- **b3. The ledger as data [editing of the ledger's form].** `docs/answers/*.jsonl` or one YAML file per answer: id,
  time, words, what it decides, `applied_in`, `supersedes`; Markdown views generated; a test fails when an entry says
  "to do" past a set delay, which turns "every answer reaches its doc" into a check. Practice 10's JSON note
  (*vendor observation*). **Cost:** tooling M-L: 12 min (#960) to 57 min median for L (#1087). **Risk:** a format to
  learn; the French quotes must survive escaping. **Buys:** "approved, not applied" becomes visible every day.
- **b4. ROADMAP as per-item files [editing].** One file per backlog item with a generated index, or the "Backlog in
  priority order" kept short (decided, not built) and the rest archived. **Cost:** docs L plus a generator: 27 min
  (#1140) plus 26 min (#916). **Risk:** a list Pierre is used to changes shape. **Buys:** no ROADMAP conflicts (37 % of
  commits touch it).

### (c) The integrator's loop

- **c1. Commit the integrator's tools [editing].** `tools/prstate.py` (head, checks, Codex receipt, threads, Choices),
  `tools/prwait.py` (with a timeout), a train queue with a lock in `train.py` (the audit's proposals). **Cost:** tooling
  M each, 12 min median (#960). **Risk:** low. **Buys:** a restart or a new integrator loses nothing; fewer hand-made
  waiters.
- **c2. Recovery after a restart or a compaction [editing].** A SessionStart hook with the `compact` matcher re-prints
  the brief and the core; a PreCompact hook asks the summary to keep the agents running, their branches and briefs;
  every agent's brief is saved as a file under its branch (or a STATUS line "running: branch, brief file") so a killed
  agent is relaunched from its last push, not from scratch (practice 11: resume, do not restart). **Cost:** tooling S,
  26 min median (#916). **Risk:** hooks that print too much fill the context they protect. **Buys:** today's restart
  costs minutes instead of a lost night.
- **c3. STATUS computed, handovers lighter [editing; substance if STATUS leaves the PR flow].** `brief.py` computes
  what STATUS writes by hand (PRs, trains, agents, questions from the ledger); STATUS keeps only judgement (Now, Next,
  what waits). Options for the 9 % of PRs that are handovers: keep them; batch them; or let the integrator commit STATUS
  without a train **[substance: W26 says every PR]**. **Cost:** tooling M-L, 12 min (#960) to 57 min (#1087). **Risk:**
  generated text hides judgement. **Buys:** fewer handover PRs, less to rewrite every 90 minutes (#1196 is one).
- **c4. Split the role [substance].** A Pierre-facing integrator (questions, plan, briefs) and a merger session (trains,
  Codex, threads), or a merger subagent the integrator launches; the merge contract names who merges. **Cost:** docs M
  plus a new brief, 9 min (#1190) plus a trial day. **Risk:** two writers, coordination costs (practice 11), the merge
  contract's "one integrator" changes. **Buys:** no idle agents while trains run; the integrator's context lasts longer.

### (d) Subagent briefs, model and effort

- **d1. A brief template [editing].** One file (or skill) with the four parts of practice 11 (objective, output format,
  tools and sources, boundaries), the core restated (practice 3), the shell rules, the files to read with sizes, "report
  questions with a ledger search". The integrator fills only the task. **Cost:** docs S, 4 min median (#1111).
  **Risk:** none. **Buys:** the same safety lines in every brief.
- **d2. Agent definitions in `.claude/agents/` [editing; the model table is decided].** `study.md`, `coder.md`,
  `reviewer.md` with `model`, `effort`, `tools`, `isolation: worktree` and preloaded skills, so the table of
  2026-11-18 is configuration, not prose. **Cost:** tooling S, 26 min median (#916). **Risk:** a per-call `model`
  overrides the file; a stale definition. **Buys:** right model and effort without remembering.
- **d3. A hook that refuses a launch without `model` and `effort` [editing; it enforces a decided rule].** **Cost:**
  tooling S, 4-7 min for the closest PRs (#1003). **Risk:** blocks a quick lookup agent. **Buys:** the table cannot be
  forgotten.

### (e) Conflicts on shared index files

- **e1. `merge=union` in `.gitattributes`** for the append-only files (ANSWERS, the decisions index, the reviews index)
  **[editing].** **Cost:** fix S, 5 min median (#912). **Risk:** lines from both sides in random order, a duplicated
  line kept (practice 16); the docs test must check order and duplicates. **Buys:** no hand-merge for the commonest
  conflict.
- **e2. Generated indexes [editing].** The decisions index is built from each record's title and `Date/PR` line by a
  tool; CI checks it is current; or no committed index at all (the file names already sort by date) and a tool prints
  it. **Cost:** tooling S-M, 26 min (#916). **Risk:** the train's tested tree must hold the regenerated index (the train
  adds no commit). **Buys:** decision PRs stop colliding.
- **e3. Per-file records everywhere [editing].** One file per answer (b3), per backlog item (b4), per open question
  (f2): nothing shared to append to. **Cost:** with b3 and b4. **Risk:** many small files; a reader needs the generated
  view. **Buys:** the conflict class disappears.

### (f) How questions reach Pierre

- **f1. The integrator's three proposals [editing; awaiting his OK].** `tools/asked.py` before any question; studies
  hold no open question (they move to STATUS's one list, the study gets a status line, a test); a weekly or automatic
  check that "waiting on Pierre" agrees with the ledger. **Cost:** docs+tooling M, 31 min median (#1056). **Risk:** low.
  **Buys:** today's re-asks and the six "still open" PR questions become visible.
- **f2. One generated question list [editing].** Questions as data (id, context, options, recommendation, PR, "ledger
  searched: no hit"), STATUS's list printed by `brief.py`; an answer closes the question and writes the ledger entry in
  one step. **Cost:** tooling M, 12 min (#960). **Risk:** another format. **Buys:** a question cannot be asked without
  its search, nor answered without its record.
- **f3. Fewer questions [substance].** Widen "easy to correct" further, or let a recommendation ship after a set delay
  without an answer. **Risk:** runs against the merge contract's "Costly to undo: the PR waits for Pierre" and would
  ship choices he never saw. Listed only to keep the option open.
- **Not proposed:** a page or form Pierre would click: his answers of 2026-11-18 dropped audit decisions 6 and 7 as "no
  new manual step for him".

### (g) Documentation volume

- **g1. Archive answered studies [editing].** A study whose status line says "answered" moves to `docs/archive/reviews/`
  after a delay; agents search `docs/` without the archive by default. **Cost:** docs M, 9 min (#1190). **Risk:** a
  study's reasoning is harder to find (git keeps it). **Buys:** 2.2 MB less to slice into.
- **g2. Specs as contracts, not prose copies of code [editing].** A spec keeps what the code cannot say (why, the data
  contract, the invariants); the rest is generated (`--help`, lists) or read from the code. **Cost:** a docs L PR per
  large spec, 27 min median (#1140). **Risk:** a spec that was the only readable description goes. **Buys:** fewer
  copies to drift.
- **g3. Size budgets that bite [editing].** The docs test already budgets every living doc; add a word budget for the
  governing set (audit decision 4: 14,000 words, approved) and a budget for the always-loaded core in lines. **Cost:**
  tooling S, 4-7 min (#1003). **Risk:** a needed rule waits for a cut. **Buys:** the core cannot regrow.
- **g4. Studies outside the repo [substance].** Back to private artifacts. **Risk:** breaks W19's "take over from the
  repo alone"; not recommended.

## 6. What is already decided, and what is in flight

Searched: `docs/ANSWERS.md` on `main` and on #1193's branch, the rules' *Source* lines, `docs/decisions/`, STATUS.

- **Rules audit (#1117), Pierre's evening of 2026-11-18** (ledger, paraphrase): "its decisions 1-5 and 8 ok, 6 and 7
  dropped (the docs describe a coherent model in our words; no new manual step for him), 9 parked". So already decided,
  per that record: (1) the agent cap, recommendation (a) delete it; (2) build the easy-to-correct reading of an
  ambiguous request and say which; (3) a tool-enforced rule becomes one line naming the tool; (4) a word budget of
  14,000 for AGENTS, the rules and INTEGRATOR; (5) INTEGRATOR without dated handovers; (8) the 40-minute cap enforced by
  `tests/slot.js`. Not applied yet (§3.7).
- **Guards rather than prose:** «ok, lance les quatre» (Pierre, 2026-11-18, #1117).
- **Allow rules:** «Par du principe que les intégrateurs tournent en mode auto»: no allowlist PR for read-only
  commands; a narrow allow rule only for a routine command the classifier refuses (2026-11-19 06:37, ledger).
- **The model and effort table:** decided (Pierre, 2026-11-18, «ok, applique ce tableau»).
- **Every answer reaches its doc, and the ledger:** decided (07:05 today, #1188).
- **In flight:** #1191 (Rule 0's end), #1192 (decisions applied to the docs), #1193 (the ledger's history), #1186
  (open points), the docs restructuring plan, and the integrator's three proposals (f1), which wait for his OK.

## 7. Questions for Pierre

Each with options and a recommendation. Which would be numbered (AGENTS.md's two tests) is said for each; the
integrator assigns the numbers.

1. **How deep the edit of the rules goes.** (A) apply what is approved and fix the contradictions (a1); (B) A, plus a
   short core of at most about 150 lines that every agent and subagent gets by itself, the topic files loading when an
   agent touches their files (a2), and guards for each "never" that can be checked (a3); (C) a rewrite from zero, every
   rule re-approved (a4). **Recommendation: B**, in that order (a1 first, then the core, then guards one by one); C
   costs you the most reading for the least gain. *Numbered: it commits the future and a rule's form.*
2. **What the core holds.** The integrator drafts it from §4 and the rules audit, at most about 150 lines, and shows
   you the list of what goes in before any wording: OK? **Recommendation: yes.** *Not numbered (a plain OK; the wording
   comes to you later as usual).*
3. **The integrator's three proposals, plus one.** `tools/asked.py` before any question, studies with no open
   questions, the weekly check (f1); and the ledger kept as data with a check that each answer reached its doc within a
   day (b3). **Recommendation: yes to all four.** *Not numbered if (f1) is asked as proposed; numbered if you want to
   cite it later.*
4. **The agent cap.** Your two records of 2026-11-18 differ: W27 says four agents that write code or run tests, studies
   on top ("ok", the exact wording); the ledger records your OK of the evening to the rules audit's decision 1, whose
   recommendation was to delete the cap (the machine's load is guarded by `tests/slot.js`). Which one holds? (a) no cap,
   the slot guards the machine; (b) four, studies on top. **No recommendation from this study**: a confirmation of what
   you meant. *Not numbered (a confirmation).*

Not asked, the integrator's call (easy to correct): the union merge or generated indexes (e), the brief template (d1),
committing the integrator's tools (c1), the recovery hooks (c2), archiving answered studies (g1).

## 8. What I checked and what I did not (rule W11)

- **Read in full:** CLAUDE.md, AGENTS.md, INTEGRATOR, STATUS, ANSWERS (main), `docs/rules/ship.md`, the rules README,
  `.claude/settings.json`, the decisions README, the PR template, the rules audit (#1117's branch), #1117's, #1191's
  descriptions. **Skimmed:** the other rule files (sizes, IDs, long lines), the docs audit's summary, #1186's study,
  #1193's ledger (searched, not read whole), the reviews README.
- **Measured with scripts** (scratchpad, not committed): sizes, lines, never/always/must lines, mentions per topic,
  "rule X" citations in the 1,196 PR descriptions (REST API), commits per shared file since 2026-11-12. The citation
  count is a regular expression on "rule(s) X": it misses a rule named without the word "rule" and counts a rule named
  in passing.
- **Sources:** the Claude Code memory and best-practices pages were read in their raw text; the sub-agents, hooks and
  skills pages, the Anthropic engineering posts, the Codex page, IFScale, Lost in the middle and the Chroma report were
  read through a summarising fetch, and their quotes may be paraphrased in places; ManyIFEval's abstract was read only
  in search results. The research measures simple checkable instructions; that it carries over to our behavioural rules
  is my inference.
- **Not checked:** whether a given agent today opened AGENTS.md (no transcripts read); the tokens of each file (bytes /
  4 estimated); whether path-scoped rules load in the cloud sessions this project uses (documented, not tried here);
  Codex's reading of a 24 KB AGENTS.md in practice; the effort figures cover first commit to green checks only, and a
  rewrite's cost to Pierre is not measured.

## 9. Résumé pour Pierre

- J'ai lu les règles, la doc et l'historique des PR, et les bonnes pratiques publiées (Anthropic, OpenAI, recherche).
- Le constat le plus net : l'outil ne charge tout seul que CLAUDE.md (9 lignes). AGENTS.md, Rule 0 et l'index des
  règles ne sont lus que si l'agent décide de les ouvrir ; un sous-agent ne les reçoit pas non plus.
- Le volume : environ 172 règles, 267 lignes « jamais / toujours / doit », 23 000 tokens à lire pour l'intégrateur
  (47 000 avec le registre complet). La doc d'Anthropic vise moins de 200 lignes ; la recherche montre que le suivi
  baisse quand les consignes s'accumulent, et que le milieu est le moins lu.
- Cinq contradictions vivantes (ex. W18 autorise rebase et force-push, INTEGRATOR les interdit) : le modèle en choisit
  une au hasard.
- Les règles qui tiennent sont celles qu'un outil vérifie ; celles qui rechutent (heredocs, attentes, noms) sont de la
  prose.
- Tes décisions du 18 au soir sur l'audit des règles (1-5 et 8) ne sont dans aucune règle aujourd'hui : même
  problème que les questions reposées, un cran plus haut.
- Options, de légère à radicale, pour chaque sujet (§5) : appliquer ce qui est décidé ; un noyau court chargé
  automatiquement + fichiers par thème + garde-fous ; ou une réécriture complète.
- Ma recommandation : la voie du milieu (question 1, B), dans l'ordre. Rien n'est supprimé sans ton accord.
- Quatre questions en §7 ; la 4 (le plafond d'agents) demande juste ce que tu voulais dire, deux traces se
  contredisent.
