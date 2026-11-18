# Rules audit (2026-11-18, read-only)

## Summary

I counted **172 rule items**: the 87 rule IDs in `docs/rules/` plus the glossary, 24 rules in AGENTS.md (Rule 0, the Working mode bullets, "Writing a rule down", the Ship checklist and the Review guidelines), and 60 habits in docs/INTEGRATOR.md. Of these, 61 are product, learning or content decisions and 111 are process rules. **Words now: 24,592** (AGENTS.md 3,633; docs/rules/ 16,481, of which ship.md is 5,439; INTEGRATOR.md 4,478; CLAUDE.md adds 93). **Words after the proposal: about 13,500** (−45 %). Most of the cut falls on process text: AGENTS "Working mode", ship.md and INTEGRATOR.md go from about 11,900 words to about 3,600. About 1,500 words are moved rather than deleted: how-to text goes to the tools' `--help` or docstrings, the L11 method goes to LEARNING.md, and pipeline detail goes to ARCHITECTURE.md. **Classes: KEEP 79, GUARD 35, MERGE 31, DELETE 27.** For the 111 process rules alone: KEEP 24, GUARD 30, MERGE 30, DELETE 27. The 61 product rules split KEEP 55, GUARD 5, MERGE 1, and none is deleted. Some trims remove history phrases from Pierre's decisions; they never change a decision. Six of the GUARD rows are covered by the guards PR now being built (the PreToolUse Bash hook, the read-only allowlist, the "Players see" check in train.py and `brief.py --night`). Thirteen are already enforced by an existing tool or test, so only their prose goes. The rest need a new check, listed in the table.

Pattern found. The rules that hold are the ones a tool or test enforces: W24 through `tests/slot.js`, W26 and D3 through `train.py` and `sheet_version.py`, and S1, P3, P6, C7, C8 and D8 through their tests. Each of these has had no relapse since its guard landed. The rules that relapsed are prose about agent behaviour that nothing checks:

- inline code in the shell (STATUS 11-18: "Agents keep slipping into heredocs / `sed -i` despite the brief");
- holding work back (11-12, 11-14, and studies capped after 11-14);
- asking Pierre for detail (11-12, 11-14);
- attributing words to Pierre that he never said (#558, found 11-14);
- the waiter that blocked itself on `pgrep` (11-15, and again 11-18);
- runaway compute (3 h on 11-09, then about 6 h by 11-17);
- names leaking into the repo (#845);
- dark screenshots taken with `colorScheme` (#908).

Another written rule will not stop any of these. A check can. Several relapses also come from two rules that disagree:

- the W27 agent cap against "launch decided work at once";
- W27 "ask back a short request" against "push what is easy to correct";
- the INTEGRATOR 11-12 "each merge moves main, merge it in" against W26 "never bring a PR up to date to merge".

Overlap: the docs restructuring plan of 2026-11-18 (#1104 PR 1 waiting; its PR 6 folds INTEGRATOR's dated handovers) touches the same files. This audit should feed into that plan, not open a parallel line of work. `tests/docs.test.js` needs two edits for the cuts: retired IDs go on its retired list, and it requires at least 70 rules (after the merges about 80 remain).

## Table

Classes: K = KEEP, G = GUARD, M = MERGE, D = DELETE. "Guards PR" = covered by the guards PR now being built. "Exists" = the guard is already in the repo.

### AGENTS.md

| ID / location | Content | Class | Evidence | Proposal |
|---|---|---|---|---|
| Rule 0 | After 17:30 Manila the integrator asks Pierre nothing | K | Rewritten 4 times (#447, #512, #515, #965); INTEGRATOR 11-14: "He nearly dropped the rule over its misapplication"; no relapse recorded since 11-15 | Keep the one sentence. The hooks already print the window (`brief.py --time`); `brief.py --night` (guards PR) carries the morning part |
| Rule 0 bullets | Time comes from the hook; what "asks nothing" means | D | Repeated in INTEGRATOR twice (11-14 habit, "Working with Pierre") | The hook line already says it. Keep only "questions wait in STATUS" |
| WM: one integrator | The main agent integrates; subagents never merge | K | No relapse found | — |
| WM: launch decided work at once | Never hold decided work in a queue | K | Relapsed: 11-12 "pourquoi tu me demandes mon avis pour un ordre", 11-14 "Qui t'as demandé de te limiter ?", studies still capped after 11-14 (Pierre, 11-18) | Keep. The relapse comes from the competing cap in W27: see decision 1 |
| WM: merge contract 1-4 | Green, Codex done, no own choices, train, squash | G | `train.py ready()` checks open, base, draft, `needs-pierre`, green, changes file. It does not check Codex, threads or "Choices I made" (its docstring: "the integrator's to check") | Extend `train.py ready()`: no unresolved thread (`ccr/review_threads`), a Codex receipt on the head, "Choices I made" = None, no check run with `run_attempt` > 1. The prose shrinks to 4 short lines |
| WM: integrator decides small choices; tell Pierre what went live | Easy to correct afterwards ships | K | Pierre 11-14; agents still ask implementation details (Pierre, 11-18) | Keep. The "tell Pierre what went live" part is the guards PR's "Players see" check |
| WM: costly to undo waits | The PR waits for Pierre | K | No relapse found | — |
| WM: always ask first | Destructive actions, money, access, data sent out | K | No relapse found | One home: W2 and INTEGRATOR "hard limits" merge into it |
| WM: research uses every source | Use every source; no project data in queries | G | 11-15: R2 photo addresses sent to an image search engine (INTEGRATOR 11-14) | A PreToolUse hook on WebFetch/WebSearch that refuses queries or URLs containing the R2 photo host, the sheet id or `img/` paths. The "every source" half stays as one line |
| WM: estimates in agent time | Hours of agent work | K | Exists: `tools/effort.py --check` in docs.test.js (studies from 11-19) | Keep one line |
| WM: model and effort per task | The table, applied at every launch | G | New 11-18; written 4 times (AGENTS, INTEGRATOR table, W25, STATUS) | Table in INTEGRATOR only, one line in AGENTS. A PreToolUse hook on the Agent tool refuses a launch without an explicit `model` (and `effort`) |
| WM: model choice by measurement | Sample of 50-100 items against a strong model | K | Pierre 11-18 | — |
| WM: no permission prompts | Files only through Write/Edit | G | STATUS 11-18 16:05: "Agents keep slipping into heredocs / `sed -i` despite the brief" | Guards PR (the Bash hook and the allowlist). Keep one line |
| WM: one writer for STATUS | Integrator only | K | No relapse found | — |
| WM: "tu", "Pierre" | Address in French | M | Repeated in INTEGRATOR "Language" | One line inside W1 |
| WM: questions to Pierre | Numbering, batches, recommendation | M | About 250 words here plus about 200 in INTEGRATOR "Questions", W7 and the "Don't ask the obvious" habit; docs.test.js already checks numbering | One home here, cut to about 90 words |
| WM: data access | Read the sheet freely; writes only with Pierre's one-off OK | G | Used once (`card.rv8.ps`); nothing stops a write but attention | `.claude/settings.json` `ask` rule on the Sheets/Drive write tools: see decision 7 |
| WM: reports and events | Read them at start and each morning | K | `brief.py` reminds | `brief.py --night` (guards PR) covers the morning |
| WM: Dependabot | The integrator merges once green | M | Repeats W9 | Delete here; W9 holds it |
| WM: `needs-pierre` label | Reminder label; PR opened ready | M | Exists: `train.py` refuses the label and drafts | One line in W6 |
| WM: claude.ai Projects mode | Each thread its own integrator | D | Hypothetical since 11-05; never used | Delete (with W22's last sentence) |
| Writing a rule down | Keep Pierre's scope; his words in the PR | G | #558 (11-05) wrote "never merged on silence" as his words; he never said it (11-14); Pierre's diagnosis 11-18: summaries paraphrase his intent | `train.py` lints the PR's Decisions section: every line naming Pierre carries quoted words or says "integrator's reading/call". docs.test.js: a new *Source:* naming Pierre cites a PR. See decision 6 |
| Ship checklist (9 items) | Worktree, test, fast tier, versions, UI, sheet, docs, PR, Codex | M | Repeats W12-W24; item 1 (pre-rewrite clones) is obsolete since 11-08 | Replace with "run `tools/precheck.py`; fill the PR template" (see W14) |
| Review guidelines | The rules Codex should watch | K | Codex caught W15 (#701) and D2 (#845) | Keep for Codex; drop the items CI already fails (D3, S1) and A1 once its guard lands |

### docs/rules/ship.md (process)

| ID | Content | Class | Evidence | Proposal |
|---|---|---|---|---|
| W1 | English in files, French with Pierre | K | No relapse found | Absorbs "tu" and INTEGRATOR "Language" |
| W2 | Work autonomously; ask before destructive | M | Repeats the merge contract's "always ask first" | Into AGENTS "always ask first" |
| W3 | Alpha: no backward compatibility | K | Pierre's engineering decision | — |
| W4 | Many prototypes; Pierre judges by taps | K | Pierre's working preference | — |
| W5 | Ideas not built go to ROADMAP | M | W19 already says "deferred = add a row" | Into W19 |
| W6 | No work sleeps on a branch | G | 11-09: work lost on unpushed branches (INTEGRATOR); exists: `brief.py` lists branches without a PR; `train.py` refuses drafts | One line. `brief.py --night` (guards PR) lists the branches each morning |
| W7 | Fix by default; never re-ask | M | Repeats merge contract item 2 and the questions bullet | Into AGENTS questions |
| W8 | Independent reviews: an open mission | K | Applied (the docs audit cites it) | — |
| W9 | Latest stable tools | G | Exists: `stack_check.py --check` in CI, `--latest` in the brief, Dependabot | One line; the details go to `stack_check.py --help` |
| W10 | Never list curation choices; remind once | K | Rule born of a relapse (11-01, 11-05); none recorded since | — |
| W11 | Say what you checked; label guesses | K | Core honesty rule; ties to the paraphrase relapse | — |
| W12 | Branch, run locally, test with the logic; smokes; hooks | M | About 600 words of how-to; exists: `answer.test.js` (smoke answers), docs.test.js (hooks run main's brief) | Keep "a test with the logic" as one line; the how-to goes to ARCHITECTURE "Tests" or a CONTRIBUTING page |
| W13 | Prettier 3.10.1 | G | Exists: CI `prettier --check` | One line |
| W14 | Fast tier before each push; which smoke part | G | 11-16: the slot was saturated, so agents pushed and let CI run the suite | New `tools/precheck.py`: runs the fast tier and picks the smoke part from `git diff --name-only origin/main`. The file-to-smoke map moves into the tool |
| W15 | Never edit `?v=`, `LAB_V`, `V` | G | Codex caught an edit on #701; five PRs collided on `V` (the rule's Why) | Exists: the deploy stamps them. Add to `check_versions.py --sheet-base`: fail when a frozen number differs from the base. One line |
| W16 | `data.json` only through `datajson.py` | G | Exists: `datajson.py --check` in CI | One line |
| W17 | Visual check, light and dark; replay as a new player | G | #908: "dark" screenshots taken with `colorScheme` were light (11-15) | A test failing on `colorScheme: 'dark'` in `tests/` and `tools/` (today only a comment in admin.smoke.js). The rest stays as one short rule |
| W18 | PR template, squash, never force-push, rewrite planned | D | Squash and titles: `train.py`; force-push to main: GitHub ruleset (main protected 11-18); the "rewrite is planned" bullet has been stale since 11-08 (docs audit N2) | Delete; the template line goes to W26 |
| W19 | Docs in the same PR; decision records; no history | K | Pierre 11-18; docs.test.js holds most of it | Cut the long description of the test (the test names say it) |
| W20 | Candidate photos refill automatically | M | A pipeline decision (Q171), not a process rule | Move to photos.md |
| W21 | One naming; `reefid-` keys | K | Exists: `rename_app.py --check` in CI | — |
| W22 | Worktree each, sparse checkout, stash, 2 PRs per agent | M | Smoke limit held by `slot.js`; "two open PRs per agent" contradicts W27 "one PR per agent"; the Projects-mode sentence is obsolete | How-to into CONTRIBUTING or ARCHITECTURE; drop the contradiction |
| W23 | `@codex review` after each push; never re-run a failed job | G | INTEGRATOR 11-09: CI outage note; no re-run seen, but only attention checks it | `train.py` and `brief.py` flag any check run with `run_attempt` > 1 on a head. A workflow on `pull_request: synchronize` posts `@codex review` (if Codex answers a bot; otherwise keep the line). The REST note goes to INTEGRATOR |
| W24 | Machine slot, load budget, 5 GB free | G | Exists: `tests/slot.js`, `slot.test.js`, `slotguard.test.js`; no overload since 11-05 | Two lines; the details live in the `tests/slot.js` header |
| W25 | Quota with care; model per table | M | Repeats INTEGRATOR "quota in practice" and the model table | One home: INTEGRATOR table plus "keep context" |
| W26 | Every PR through a green train | G | Exists: `train.py` (98 trains 11-14 to 16) | Two lines; the mechanics are in the `train.py` docstring already |
| W27 | Four agents, PRs from main, no shared sensitive file, two Codex rounds, sim cap, one train, ask back, scratch names | G | Cap over-applied after 11-14 and on 11-18; #798 six Codex rounds (11-09); 3 h sim (11-09), 6 h (11-17); waiters blocked each other (11-15, 11-18) | PRs from main: exists (`train.py`). Sensitive files: `brief.py` lists open PRs sharing `Code.gs`/`core.js`/`sync.js`/`model.js`. Codex rounds: `brief.py` flags a third `@codex review`. One train: a lock and queue in `train.py`. Sim cap: into L11's guard. Agent cap and "ask back": decisions 1 and 2. Scratch names: delete |

### docs/rules/ product, learning and content rules

| ID | Content | Class | Evidence | Proposal |
|---|---|---|---|---|
| C1 | Never contradict the IMR course | K | Tests (`coraltree`, `fish`, `genusmarks`) | — |
| C2 | Never invent categories; cite sources | K | Pierre 11-18 | — |
| C3 | Short ID tips; one decisive feedback line | K | Pierre 11-18 | — |
| C4 | Corals: growth form ranks, never filters | K | Tests (`coraltree`, `photos`, `gameforms`) | — |
| C5 | Discrepancies go to `points.json` | K | `seaslug-names` test | — |
| C6 | Cues only from Dauin or Philippine species | K | `seaslug-looks`/`cues` tests | — |
| C7 | iNaturalist pacing | G | Exists: `tools/inat.py` with `inat.test.js`, `stack.test.js` | One line: "every call goes through `tools/inat.py`" |
| C8 | One presence rule | K | `presence.py` single home with tests | — |
| P1 | Reference photos by objective qualities | K | Pierre 11-18 | Trim history ("the stopgap's… until 2026-11-15", "since 2026-11-08") per W19 |
| P2 | Corals: three views | K | — | Trim "labelled Closer before 2026-11-01" |
| P3 | No multi-organism photo; no book photo | K | Exists: `nobook.test.js` | Trim "since #227", "went on 2026-11-03" |
| P4 | One observation per one-photo question | K | Holdout tests | — |
| P5 | Credits after the answer | K | Smoke tests | — |
| P6 | Corals: no skeleton photo | K | Exists: `skeletons.test.js` | — |
| L1 | Time never decays progress | K | Pierre's | Trim "`s.pg` before rules version 9" |
| L2 | A wrong answer counts against both units | K | Tests | — |
| L3 | Adaptive difficulty; every account counts | K | — | Drop "starred genera always in Practice" (L5 holds it) |
| L4 | One progression path | K | Pierre 11-18 | — |
| L5 | Corals: starred genera follow look-alikes | K | Tests | — |
| L6 | No unit-specific code; Millepora; bonus | K | `subject-neutral` test | Bonus mechanics already in ARCHITECTURE "Bonus genera": trim |
| L7 | Choices harder gradually | K | Tests | — |
| L8 | Achievements reward learning | K | Tests | — |
| L9 | Learned = silent mastery exam | K | — | — |
| L10 | First-launch question sets variables | K | — | — |
| L11 | Simplest algorithm; proportionate checks; 40-min cap | G | 3 h sim (11-09), "6h de calcul ne devrait JAMAIS arriver" (11-17): the cap relapsed while written | `tests/slot.js` ends a guarded heavy run after 40 min with "cap reached: report what you have". The method (levels table, looks, multifactor, about 650 words) moves to LEARNING "Validating a learning change". See decision 8 |
| L12 | Check on the real log; the level is not a success rate | K | 11-12 misreading led to the rule; none since | — |
| L13-L15 | Compute once; visual first; ideal photos first | K | — | — |
| U1-U6, U8-U14 | Interface rules | K | `csp.test.js` (U5), smokes (U2, U9, U14) | U4's test widths repeat W17: one home in U4 |
| U7 | Removed settings stay removed | K | — | Fix a stale reference: "the IMR/own-first rule P1" no longer exists (P1 rewritten 11-18) |
| A1 | Curation never changed automatically or in a PR | G | Only Codex and attention catch a PR that writes `curation.json` | A `checks.yml` step: a pull_request whose diff touches `curation.json` fails |
| A2-A5 | The admin is minimal, short, one switch, honest analyses | K | Tests | A4: "Corals \| Fish" is stale (three subjects): #1104 fixes it |
| S1-S3 | One engine; fish names; key groups | K | Exists: `subject-neutral.test.js`; `build_fish.py` fails without a group | — |
| D1 | Tests never reach the real sheet | K | Exists: `app.js` `LOCAL`, `net.smoke.js` check 11 | Cut the how-to |
| D2 | Real names in chat, pseudonyms in the repo | G | Slip in STATUS caught by Codex on #845 (11-09); docs audit: "rule D2 has no mechanical check" | A CI check of salted hashes of capitalised words in the diff against a hash list held as a GitHub secret. See decision 9 |
| D3 | `Code.gs`: changes file, VERSION at merge, `release` | G | Exists: `check_versions.py --sheet-base`, `sheet_version.py`, `train.py` (refuses changes files, moves `release`) | About 700 words down to about 150; the mechanics go to `sheet_version.py --help` |
| D4 | The app never gets ahead of the sheet | K | `gates.test.js`; `brief.py` prints the live `v` | — |
| D5 | Every progress-rule change appends a rules version | K | `board.test.js` | Trim the `RV_CARD` history |
| D6 | Recalculation silent; announcement cards never held | M | Its first paragraph repeats D5's "No card" bullet | One home for "silent": D6; D5 points to it |
| D7-D9 | Deleted account clean; boards follow; the log is the reference | K | Tests | — |
| README | Glossary (unit, taxon) | K | — | — |

### docs/INTEGRATOR.md

| Location | Content | Class | Evidence | Proposal |
|---|---|---|---|---|
| 11-16 #1 | Count the check runs before calling a PR ready | G | Exists in part: `brief.py` calls a PR green only when every check succeeded | The PR-wait tool (below) compares the run count with the base's |
| 11-16 #2 | A data-location switch makes tests stale | D | One-off (#1016) | CI runs the full tier on every PR |
| 11-16 #3 | Generated files rebuilt, never hand-merged | G | Exists: `seaslug_game.py --check`, `holdout.py --check` | Delete the prose |
| 11-16 #4 | `judging_fish.py` has no `--help` | G | A real trap | Give the tool argparse and `--help`; delete the note |
| 11-16 #5 | Candidate photos run moves main; wait | G | Trains stop on "main moved" | `train.py` waits for a running Candidate photos workflow before it starts |
| 11-16 #6 | Slot saturated: push, let CI run | M | — | Into W14 |
| 11-16 #7 | Pass Pierre's follow-ups via SendMessage | K | — | — |
| 11-14 #1 | Keep the four slots full | D | Repeats "launch at once"; relapsed | Decision 1 |
| 11-14 #2 | Filter "Choices I made" | M | — | Into merge contract item 3 |
| 11-14 #3 | A rule said to be Pierre's quotes him | M | #558 | Into "Writing a rule down" and its guard |
| 11-14 #4 | Do not stretch a decision | M | Q354 photo credit | Into "Writing a rule down" |
| 11-14 #5 | An interruption is not a stop | K | — | — |
| 11-14 #6 | Rule 0 is one sentence | D | Repeats AGENTS | — |
| 11-14 #7 | Every source; no data out | M | 11-15 image search | Into AGENTS research bullet and its hook |
| 11-14 #8 | A refused command is reported, not worked around | G | 11-15: files written through Python after a refusal | Guards PR (the hook refuses `python -c`, `bash -c` and the like). Keep one line in the brief template |
| 11-14 #9 | `judging_fish.py one` before committing | G | Exists: `one --check` fails CI | Delete the prose |
| 11-14 #10 | Wait on trains with `pgrep -f` | G | Relapsed: deadlock 11-15, again 11-18 (STATUS "Last stop") | Lock and queue in `train.py` (`flock` on a file in `.git`); no hand-made waiters |
| 11-14 #11 | Check conflict markers after a merge | G | #964 reverted #959/#960's docs | A `checks.yml` step: `git grep -n '^<<<<<<< '` fails; `sheet_version.py` already refuses |
| 11-14 #12 | A wait loop must end | G | An hour-long loop | The PR-wait tool with a timeout |
| 11-12 #1 | Auto mode; run work in parallel | M | — | Into "launch at once" |
| 11-12 #2 | Don't send Pierre GitHub chores | M | 11-12 "micromanagement forcé" | Into the small-choices bullet |
| 11-12 #3 | A success rate is never a level | D | Repeats L12 | — |
| 11-12 #4 | Each merge moves main: merge it into the next PR | D | Contradicts W26 (trains, no catch-up merges) | — |
| 11-12 #5 | Codex "running" vs receipt | G | — | The PR-wait tool reads the receipt |
| 11-09 #1 | W27 restated | D | Repeats W27 | — |
| 11-09 #2 | Ask back an ambiguous request | D | Repeats W27 | Decision 2 |
| 11-09 #3 | Names: pseudonyms | D | Repeats D2 | — |
| 11-09 #4 | Never push a pre-rewrite SHA | D | Obsolete; `brief.py` flags no common ancestor | — |
| 11-09 #5 | A CI outage is not a red check | M | #834 | Into W23 |
| 11-09 #6 | The integrator's helpers lived in the scratchpad | G | Lost twice with sessions | Commit them as `tools/prstate.py` (head, checks, Codex receipt, threads, Choices) and `tools/prwait.py` (with a timeout) |
| 11-09 #7 | In flight (branches) | D | State, stale (docs audit X14) | STATUS and ROADMAP hold it |
| WwP: model table and Anthropic guidance | Model and effort per task | K | Pierre 11-18 | The one home of the table; the guidance paragraph and sources go to the decision record |
| WwP: Language | French, dictated | M | — | Into W1 (keep the dictation slips list) |
| WwP: Questions | Numbering | M | — | Into AGENTS questions |
| WwP: keep the integrator's context | Delegate raw material | K | Pierre 11-08 | — |
| WwP: quota in practice | Briefs, queries, stop agents | M | — | Into the context bullet and the table |
| WwP: don't ask the obvious | Micro-choices are the integrator's | M | Relapsed (Pierre 11-18) | Into the small-choices bullet; see decision 2 |
| WwP: visual changes | Screenshots as files | M | — | Into AGENTS questions |
| WwP: merge continuously | Few open PRs | D | Repeats launch-at-once and trains | — |
| WwP: never ask him to click | Integrator does GitHub chores | M | — | Into the small-choices bullet |
| WwP: Rule 0 | — | D | Repeats AGENTS | — |
| WwP: quota 7 %, morning task disabled | 11-06 state | D | Obsolete state | Guards PR (`brief.py --night`) |
| Real people: names | Never on GitHub | D | Repeats D2 | — |
| Real people: expert anchors | Two coral experts, one fish expert; Pierre for families | M | Pierre's 11-06/07 decision | Move to sheet.md, next to D2 (roles only) |
| Hard limits: sheet read-only | — | M | — | Into AGENTS data access |
| Hard limits: `curation.json` | — | D | Repeats A1 | — |
| Hard limits: force-push, pre-rewrite clones, merge not rebase | — | D | Ruleset protects main; rewrite done 11-08; W26 | — |
| Hard limits: fish photos on R2 | — | D | Repeats P1 | — |
| Mechanics: GraphQL blocked, CCR routes | — | K | Real constraint | One home (W23's copy goes) |
| Mechanics: merge steps | — | G | — | `train.py ready()` extension (merge contract row) |
| Mechanics: security bots | Alerts count like Codex findings | M | Pierre 11-08 | Into merge contract item 2 |
| Mechanics: Code.gs VERSION steps | — | D | `sheet_version.py` | Its `--help` |
| Mechanics: merge train steps | — | D | `train.py` docstring | — |
| Mechanics: Codex on every new head | — | M | — | Into W23 |
| Mechanics: never hand-edit `?v=` | — | D | Repeats W15 | — |
| Mechanics: local Prettier 3.8.1 | — | D | Obsolete: `npx prettier@3.10.1` is exact | — |
| Mechanics: stacked PRs (two bullets) | — | D | `train.py` refuses base ≠ main | — |
| Mechanics: CI waits; slot | — | G | — | The PR-wait tool |
| Mechanics: learning changes need L11-L12 | — | D | Repeats L11 and L12 | — |
| Open work and where it sits | Backlog, branches, PRs | D | Stale (#793 and #800 listed as waiting, merged 11-09) | STATUS and ROADMAP |

### Words per file, now and after

| File | Now | After (estimate) |
|---|---|---|
| AGENTS.md | 3,633 | 1,700 |
| docs/rules/ship.md | 5,439 | 1,500 |
| docs/rules/learning.md | 3,439 | 2,700 |
| docs/rules/sheet.md | 2,284 | 1,550 |
| docs/rules/photos.md | 1,492 | 1,300 |
| docs/rules/content.md | 1,225 | 1,100 |
| docs/rules/ui.md | 1,142 | 1,100 |
| docs/rules/subjects.md, admin.md, README.md | 1,460 | 1,450 |
| docs/INTEGRATOR.md | 4,478 | 1,100 |
| **Total** | **24,592** | **about 13,500** |

## Decisions for Pierre

1. **The agent cap (W27).** The number "four" is the rule that keeps relapsing: studies were still held back after "Qui t'as demandé de te limiter ?". Machine load is already guarded by `tests/slot.js`, and conflicts would be guarded by a `brief.py` line listing open PRs that share a sensitive file. Options: (a) delete the cap; (b) keep "four that write code or run tests, studies on top". Recommendation: (a).
2. **Ambiguous requests.** W27 says "ask back a short request before any work" (11-09). That clashes with "push what is easy to correct" and "don't ask the obvious" (11-14). Recommendation: take the reading that is easy to correct, build it, and say in one line which reading was taken. Ask back only when both readings are costly to undo.
3. **A rule enforced by a tool becomes one line naming the tool**, and its how-to moves to the tool's `--help`. This covers W9, W12-W16, W24, W26, D3, C7 and INTEGRATOR's merge mechanics. Delete the obsolete items in the same pass: pre-rewrite clones, Projects mode, W18's "rewrite planned", stacked-PR notes, local Prettier 3.8.1, "each merge moves main". Recommendation: ok.
4. **A word budget for the rules.** `tests/docs.test.js` would fail when AGENTS.md + docs/rules/ + INTEGRATOR.md pass 14,000 words, with a budget per file, so a new rule has to replace words. "Writing a rule down" would gain one line: "a friction first gets a guard (hook, test, tool check); prose only when no guard is possible". Recommendation: ok.
5. **INTEGRATOR.md without dated handovers**: habits only, about 1,100 words; each handover's state goes to STATUS "Last stop". This is PR 6 of the docs plan you approved. Recommendation: ok.
6. **Your words, checked.** `tools/train.py` would refuse a PR if any line in its Decisions section credits a decision to you without quoting your words, unless the line says "integrator's reading" or "integrator's call". docs.test.js would require a PR number on every new *Source:* line that names you. Recommendation: ok.
7. **Sheet writes.** Options: (a) an `ask` rule in `.claude/settings.json` on the Sheets/Drive write tools, so each write shows you a prompt and your click is the one-off permission (one write in 18 days); (b) deny those tools to every agent, to be lifted by hand when needed. Recommendation: (a).
8. **The 40-minute compute cap (L11) enforced by `tests/slot.js`.** A guarded heavy run would end at 40 minutes with "cap reached: report what you have". The statistics method (about 650 words) moves to LEARNING.md "Validating a learning change", and L11 keeps 5 lines. Recommendation: ok.
9. **A names check for D2.** A CI step would compare salted hashes of capitalised words in each PR's diff with a hash list built from the sheet's RAs tab and kept as a GitHub secret. No name would ever be committed. It does put derived player data into GitHub secrets, so it needs your OK. Recommendation: ok.
