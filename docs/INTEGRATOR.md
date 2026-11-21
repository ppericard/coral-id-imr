# Integrator handover

**For the next integrator** (the main agent of a Claude Code session; AGENTS.md "Working mode"). Read AGENTS.md first,
then [STATUS.md](STATUS.md) for where things stand, then this page for how the work is actually run day to day. Keep it
current: it is the working knowledge that is not a rule (rules live in AGENTS.md and docs/rules/) and not state (state
lives in STATUS.md).

## Habits

What the integrator does day to day, as it stands now. Rules live in AGENTS.md and docs/rules/; where one covers a habit
below, the rule wins. Dated stories behind a habit are in git and the PRs.

- **Work comes from the whole queue.** The turn an agent reports, the next decided item starts, before any merge work;
  every check-in counts the running agents first. The source is Linear ("Linear" below), then the
  [ROADMAP.md](ROADMAP.md) rows not transferred yet, never a short list half marked "after Pierre" (AGENTS.md "Working
  mode": as many agents as useful; rule W27).
- **Every turn ends with the next `send_later` check-in.** An agent waiting on a permission prompt is reported to Pierre
  in one line and told how to do without it.
- **The session runs in auto mode** (Pierre, 2026-11-12): a classifier judges each command, and the repo's allow rules
  (`.claude/settings.json`: resolving review threads) pass before it. A refusal: find the narrow allow rule and propose
  it once. GitHub chores (resolving fixed threads, labels, branch updates) are the integrator's, never Pierre's.
- **Pierre's follow-ups go to the running agent** with `SendMessage`, not to a new agent: he corrects the shape of a
  subject quickly.
- **An interruption to ask a question is not a stop**: answer, then carry on.
- **A handover about every 90 minutes of work** (Pierre, 2026-11-18 11:08): [STATUS.md](STATUS.md) is refreshed then.
- **"Choices I made" is filtered before it is passed on**: what is easy to correct afterwards ships as the integrator's
  call.
- **A rule credited to Pierre quotes his words**; a paraphrase says "integrator's reading". A decision of his is never
  stretched to a new point (the IMR names on screen did not cover the photo credit, which keeps the iNaturalist name).
- **Every brief** lets agents use every useful source and forbids sending the project's data out (photo addresses,
  names, the sheet's data, image searches with our photos). It says that a refused command is reported, never worked
  around (another tool, `subprocess`, another shell form), and names the routes: no wrapper script, no Monitor, no
  split names; files are edited with the Edit tool.
- **A PR is called ready only after counting its check runs**: right after a push only a few exist, all green. The
  Codex summary can say "running" long after its receipt "Reviewed commit: `<head>`" landed: the receipt on the head
  counts.
- **A CI outage is not a red check** (a CodeQL download failing with a 504): say so on the PR, never re-run; a merge of
  `main` (a real new head) re-runs everything.
- **The machine slot is the bottleneck with several agents**: when it is saturated, push and let CI run the suite (it
  does on every head), and say so.
- **The Candidate photos run moves `main`** after any judging merge, and a train started meanwhile stops ("main moved"):
  wait for that workflow's run to end, then train.
- **Before any question to Pierre**: `python3 tools/asked.py <terms>` (open PRs' ledgers included). A hit is evidence,
  not an instruction: read its scope, the later entries and docs that amend it, and whether it still applies; a
  decision that settles the point is applied without asking again; if the evidence is incomplete or contradictory, say
  what is unsure, leave that point open and go on with the work already allowed (AGENTS.md "Every answer reaches its
  doc"). Its last line ("searched: … — N hits") goes under the question.
- **A correction repairs the work and what caused it**: the work itself, and the doc, brief or subject note that held
  the wrong assumption. When it helps Pierre judge the repair, one line names the assumption corrected ("I had taken
  the storage option as agreed; the later answer chooses a sheet tab; the design and the brief are corrected"). A cause
  still unknown is said so: no invented explanation, no promise, no rule added only to show the feedback was heard.
- **Generated files are rebuilt, never hand-merged**: `seaslug-game.json` (`tools/seaslug_game.py --check` fails
  otherwise), `data/suggest.json` (re-import the PR's species over `main`'s file), the decisions index
  (`python3 tools/decisions_index.py --fix`; it also deletes the retired OLDER.md of the split index, which a branch may carry).
- **A doc past its size mark** (`MARK` in the docs test, the brief's last line) is a warning, never a block: read the
  doc against rule W19 (history, versions and duplicates out); if all of it belongs there, raise its mark in
  `tests/docs.test.js` in the same PR. Never move content out of its doc to fit a number
  ([decision](decisions/2026-11-19-doc-size-marks.md)).
- **`tools/judging_fish.py` has no `--help`**: an unknown argument imports every fish species into `data/suggest.json`. A
  fish judging batch runs `python3 tools/judging_fish.py one` before committing (`one --check` fails CI).
- **Wait on trains with `pgrep -f "python3 tools/train.py"`**, never `ps aux | grep` on a word: the waiter's own command
  line holds the word. A wait loop must end: check with `ps` that a queued train runs, and read its output.
- **After merging `main` into a PR**, check for conflict markers (`git diff --check`, `grep -n '^<<<<<<<'`) before the
  commit and resolve per hunk, never `git checkout --ours` on a whole file; commit the merge before
  `sheet_version.py --assign` (it refuses otherwise).
- **The integrator's helpers are in `tools/queue/`**, not in the session scratchpad, which goes with the session: a PR
  state line (head, checks, Codex receipt on the head, open threads via `pulls/N/ccr/review_threads`, "Choices I made"
  None), a train queue that never starts `tools/train.py` while one runs, and the sheet VERSION step (`assignver.sh`).
  A docs-only PR has 5 checks, not 17.
- **Test every new card at 390 px with a long list**: a card with a long list once pushed itself off screen behind its
  backdrop. The safety net stays (an invisible card closes itself 2.5 s after the first frame drawn with it, so a card opened
  while the page is busy or hidden is not judged before it could fade in; the events `empty card closed` and
  `left with a card open`): read the Events tab now and then for any other card that hides.

## Working with Pierre

**The right model and effort for each task** (the Agent tool's `model` and `effort`, set at every agent launch;
Pierre, 2026-11-18: "C'est une bonne idée, et qui doit être bien documenté dans les règles hautes données aux agents
(et notamment à l'intégrateur)"; the named models: "ok, applique ce tableau"):

The table below is #1257's (docs/reviews/2026-11-19-model-effort-combinations.md §4), its strategy approved by Pierre
on 2026-11-20 05:39 («OK pour cette stratégie»):

| Task | Model | Effort | Rests on |
| --- | --- | --- | --- |
| Photo judging (fish candidate pass; slugs and corals until measured) | Opus 5.5 | high | Measured (#1211): nothing lighter validated; gold set 2 tests Sonnet 5.5 high and Opus 5.5 medium; Haiku 5.5 out; 5% drift sample per batch |
| Learning engine, design, architecture, security, independent reviews | Opus 5.5 (Fable 5.2 where Opus at higher effort measurably falls short) | high | Anthropic + judgement: verification and edge cases; costly to undo |
| Rule wording | Opus 5.5 | high | Judgement: Pierre's scope kept; his OK is the check |
| Sourcing research with verbatim quotes | Opus 5.5 | medium (high for a batch where a quote is not found word for word in its source) | Anthropic: research, fewer wrong citations; quote check by script |
| Studies | Opus 5.5 | medium (high when it decides the engine, a data format or the architecture) | Anthropic: research figures |
| UI prototypes | Sonnet 5.5 (Opus 5.5 medium for a new format or the shared engine) | high | Anthropic: coding figures; Pierre's taps |
| CI or test fixes | Sonnet 5.5 (Opus 5.5 high for a flake one run did not explain) | high | Anthropic: bug fixes in existing code want `high` |
| Ordinary code (game formats, admin pages) | Sonnet 5.5 | high (medium for a small, fully specified change) | Anthropic: `medium` 7-15 points lower on coding |
| Bringing PRs up to date, docs | Sonnet 5.5 (Opus 5.5 medium for a conflict in the engine, `core.js`, `Code.gs`) | medium | Judgement: well specified, checked by tests and Codex |
| Mechanical data conversion | A script where a rule can be written; else Haiku 5.5 after the sample test | medium | Anthropic: Haiku for checkable outputs, skips checks at `low` |

Each launch names one level, never a range (in Claude Code a launch without one runs at the session's level on the
session's model, and at the model's own default, `medium` for all four, on another). Where no row fits: Opus 5.5 at
medium, Anthropic's starting point. A task that failed for want of thoroughness (stopped early, skipped a check, missed
a file) is relaunched one effort level up; one that had its context, tried, and was still wrong, one model up. `xhigh`
and `max` only where a gain is measured.
`tools/agent_guard.py` (a PreToolUse hook) refuses a launch without both; `brief.py` prints the day's count by model
and effort, `python3 tools/agent_guard.py --report` lists the launches.

**The rules core trial** (#1200 §3): `tools/instr_log.py` logs which instruction file reached which agent and why;
`--report --since HH:MM` after a run, `--expect origin/main` (or the branch under test) for the texts to quote. A
child session keeps its log in its own `.git`: it prints the report itself. A subagent's startup CLAUDE.md is never
logged, only its later loads: its quotes show it.

Anthropic's guidance (checked 2026-11-18): Opus 5.5 is the recommended starting point and the integrator's model; effort
is often a better lever than the model; an Opus orchestrator with Sonnet subagents measured about a third cheaper at
about the same score; subagents pay off for independent work that would flood the main context, not for one dependent
chain. Sources: <https://code.claude.com/docs/en/sub-agents>,
<https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence>,
<https://platform.claude.com/docs/en/models/overview>.

- **Language**: he writes in French (often dictated: expect speech-to-text slips, e.g. "Yammer" / "AMR" = IMR, players'
  first names misspelled, "Firebase" = FishBase, "Fresh shark" = thresher shark). Answer in French, "tu". Every artifact (code, docs, PRs,
  commits) in English.
- **Questions** go to him numbered, never reset: the last number used is in [STATUS.md](STATUS.md) ("Last question number"; `python3 tools/brief.py` prints it). Each with its context in one or two
  sentences, the options, and a recommendation. He answers "Question N, ok" or picks an option. Record the answer in the
  PR's Decisions ("Pierre, date time (QN)"), empty "Choices I made", remove `needs-pierre`, merge.
  **What gets a number** (Pierre, 2026-11-08, replacing the line of that afternoon; the definition is in AGENTS.md
  "Working mode"): two tests, both needed. (1) The answer commits the future: the players' learning or game, the
  engine's model, data or privacy, rights, a rule's substance, an irreversible action, a big cost. (2) The answer will
  be cited later, to show how a point was reached. **Not numbered**, asked plainly: a confirmation or a fact, the wording
  of a rule already decided (his OK goes in the rule's *Source* line). Every answer, numbered or not, is quoted in the
  PR's Decisions; small questions go in batches. Past numbers are not renumbered. Subagents prepare their questions
  with the same tests and say in their report which ones would be numbered.
- **Keep the integrator's context for integrating** (Pierre, 2026-11-08: "a good idea"). Delegate to a subagent any task
  that would pour raw material into it (sheet dumps, large data files, many files read or many API calls, long logs):
  give the subagent a precise brief and ask for the conclusion, the numbers and the evidence, not the material. Keep in
  your own context what you need to decide, check and merge; small lookups whose target you know stay with you.
- **The quota in practice** (rule W25, Pierre, 2026-11-08): a subagent's brief names the files, the scope and the
  deliverable; large JSON and the sheet are queried (jq, grep, the connector's ranges), never printed whole; a few
  commands are done by the integrator itself; an agent is stopped once its report is in; a wait is one monitor that
  wakes once on a terminal state; Prettier and the unit tests run before a push, every Codex finding fixed in one go;
  two PRs on the same files are not run in parallel. The model and effort follow the table above: the intermediate model for
  ordinary code (a test fix, docs, bringing a PR up to date), the lightest one only for mechanical work that passed
  the sample test (data fetches, conversions); the strongest model for anything judged (learning, content, design,
  reviews, photo judging). Photo judging: sort on metadata first (licence, presence,
  resolution, one species) before looking, and judge the species under target first. A photo in doubt is looked at
  in full size, never only as a thumbnail: small views hide faults and quality (Pierre, 2026-11-19 20:57).
- **A night's work** (Pierre, 2026-11-19 20:42-20:43): a few agents at a time, not a burst; when the decided work
  runs out, take the next decided Linear issues (Todo), or ROADMAP rows not transferred yet, the agents can move alone;
  never invent a study to fill the time.
- **A large judging or boxing pass is measured first, without asking him** (Pierre, 2026-11-20 06:42-06:44: «Il faut
  faire des tests et trouver le modèle/effort le plus léger qui permet de faire le job proprement»; «Je ne devrais pas
  devoir te le suggérer»): a bench of 50-100 items, lighter configurations beside a reference, the threshold written
  before, the cheapest that passes does the bulk, a random sample redone by the strong one (AGENTS.md "Model choice by
  measurement"); the figures go in the PR, never a cost question to him first. The strong model is not the truth by
  itself (Pierre, 06:48-06:50: «ce n'est pas toujours le plus juste […] des fois c'est la calibration qui n'est pas
  bonne»; «ça dépend des sujets/taches. Mais parfois ya effectivement besoin d'une recalibration»): how the reference
  is checked depends on the task, and a recalibration is made when the task needs one, e.g. against a gold set of his
  answers where a strong model's calibration was found off (fish photo ease, 2026-11-19).
- **Don't ask the obvious** (he said so several times): a rule written for corals applies to fish unless coral-specific
  (Q168); micro-choices (names, layout details, test values) are the integrator's call, listed in the PR as such.
- **Visual changes**: send screenshots as files in the chat (SendUserFile, 390 px phone first), then the question.
- **Merge continuously**; keep few PRs open. He dislikes a long open list.
- **Never ask him to click** anything the integrator can do: resolving Codex threads, marking PRs ready, retargeting,
  dispatching a workflow (`gh api -X POST …/actions/workflows/approved-photos.yml/dispatches -f ref=main`).
- **Never give him a command to run** (Pierre, 2026-11-20 05:39: «c'est jamais à moi de lancer une commande à la main
  dans un terminal […] C'est à vous de bosser et de trouver une solution»). A step a subagent was refused is the
  integrator's to judge: undoing an agent's own mistake in a checkout is the integrator's job, done at once; only a
  step it may not take itself goes to him, as a yes/no question, never as a command.
- **Rule 0** (AGENTS.md, one sentence): after 17:30 Manila, ask him nothing until his first message after 04:00;
  questions wait in STATUS. It protects his time, not the agents' (Pierre, 2026-11-20 05:31-05:33): the work goes on
  at every hour, and nothing stops at 04:00. A session restart kills the queue and the background waits, so a
  check-in at most an hour apart, night and day, re-starts them (`tools/queue/`).
- **Quota**: on 2026-11-06 ~17:03 he flagged the quota at 7% and asked to save it; stopped agents' work stayed on branches.
  The daily 04:31 morning-report scheduled task stays disabled (Q202) and is not re-enabled (Pierre closed it on
  2026-11-18: no morning report); the session-start summary of reports and events (AGENTS.md "Working mode") stands.

## Real people (pseudonyms on GitHub, names only in chat)

- Real names never go to GitHub (commits, PRs, docs). Named tables stay local (scratchpad) and are lost with the session.
- **Expert anchors** (Pierre, 2026-11-06/07): two IMR **coral** experts and one IMR **fish** expert (families and
  genera); Pierre himself counts as a fish expert **for families only**. Who they are is in the sheet's Notes tab, keys
  `agent.expert.*` (private: the app only serves `card.*` keys), once Pierre has added those rows (Q206); else ask him.
  Never write their names or results to the repo.
- Before saying who is an expert, or what a player is, read the Notes tab's `agent.expert.*` rows first (they exist
  since Q206); names in chat come from the sheet's RAs tab, never from Pierre's voice transcriptions (rule D2).
- Their logs serve to check the bar's calibration and to find mislabelled photos (an expert missing an "easy" photo).

## Sheet, photos, data: the hard limits

- **The sheet** (its ID is in docs/HANDOVER.md) is **read-only** for agents. Writing is the
  integrator's only, and only with Pierre's explicit one-off permission (used once: the Notes tab, key `card.rv8.ps`,
  the PS of the apology card). Tests never touch it.
- **curation.json** is written only by the admin's draft and Publish, never by an agent.
- **Never force-push** (the classifier refuses it anyway). A PR is not brought up to date with origin/main to merge:
  its train tests it on `main` (rule W26). Only a conflict or the Code.gs `VERSION` assign needs it, and then with a
  merge commit (`gh api -X PUT …/pulls/N/update-branch`, or merge origin/main locally), never a rebase: a new head,
  so green and Codex again. Never force-push main. **The history was rewritten on 2026-11-08 ~16:20 Manila** (photos step 3, Q121, Q300; HANDOVER
  "Photos out of the repo, step 3"): **every clone or worktree made before then must never push** (a push would bring
  the old photos back). Work only from a fresh clone; carry a commit left in an old one over as a patch
  (`git format-patch`, then `git am` in the fresh clone), never by pushing from it.
- **Every fish photo in play is hosted on R2** (Q199): Pierre's adds, the sure judged candidates (Q180) and the
  reference-level photos, all through `tools/fish_game.py` / `fish-game.json`; iNaturalist / FishBase are only the
  fallback (R2 asked twice, then the online original). The "Candidate photos" workflow uploads them after each Publish,
  or on a manual dispatch; if its log says photos wait for the next run, dispatch it again.

## The merge mechanics (what bites)

- **GitHub**: GraphQL is blocked; use REST (`gh api repos/ppericard/coral-id-imr/...`). Review threads, ready-for-review,
  auto-merge go through the CCR routes: `GET …/pulls/N/ccr/review_threads`, `POST …/pulls/N/ccr/comments/ID/resolve`,
  `POST …/pulls/N/ccr/ready_for_review`. Subagents are refused thread resolution: the integrator resolves. In auto
  mode the permission classifier refused the resolve to the integrator too (2026-11-12), so `.claude/settings.json`
  allows exactly `gh api -X POST repos/ppericard/coral-id-imr/pulls/*/ccr/comments/*/resolve` (Pierre, 2026-11-12).
- **Merge**: through a green train (below), which squash-merges at the tested head (`…/pulls/N/merge`,
  `merge_method=squash`, `sha=<head>`), once every check is green on that head (their number grows: CodeQL and other security checks run
  too), the mergeable state is `clean`, no unresolved thread, "Choices I made" empty. Check Codex's latest-head findings
  (`…/pulls/N/comments`, commit_id = head) even when the thread count is 0: a finding on the head may not be a thread yet.
- **Security bots** (Pierre turned on more automatic security audits in GitHub, 2026-11-08: CodeQL, secret scanning
  and push protection, possibly others): their alerts and comments on a PR count like Codex findings. Before a merge,
  each one is fixed, or the PR says in one line why it does not apply (false positive, test-only code), and its thread
  is resolved. A security alert is never merged over in silence.
- **Code.gs VERSION, assigned at merge** (rule D3; Pierre, 2026-11-08, Q305 a): a PR that changes `Code.gs` (or
  `core.js`, through `python3 tools/sync_core.py --fix`) carries one `tools/sync/changes/<branch>.md` and leaves
  `VERSION`, line 1 and `tools/sync/HISTORY.md` alone, so parallel PRs no longer collide. To merge it: in its worktree, merge
  `origin/main` into the branch, run `python3 tools/sheet_version.py --assign --dry-run`, then `--assign` (VERSION + 1,
  line 1 set to the short form, the entry written at the top of HISTORY.md (only there), every gate the PR adds and every bare
  `vNEXT` set to the new number, main's gates left alone, the file removed; a merge stopped on a conflict may stay
  uncommitted until then, the tool reads its `MERGE_HEAD`, and it refuses a branch that does not hold `origin/main`
  yet, unresolved conflicts, or a PR that moves one of main's gates), run the fast tier, commit "Sheet script vN assigned at merge",
  push, `@codex review`, wait for green and Codex, then send it in a train, alone or as that train's one Code.gs PR. A PR built under
  the old rule (its own VERSION bump) passes the check only if its number is still main+1 and HISTORY.md holds its entry on top:
  otherwise move its entry into a changes file and restore main's VERSION, line 1 and HISTORY.md. Rules versions (RVS)
  run with no gap. Main's `VERSION` and the live script's: `python3 tools/brief.py` (STATUS "Now" says what is in flight).
- **The merge train** (rule W26; Pierre, 2026-11-08, Q305 b; every PR, 2026-11-16): when a PR is ready on its own head
  (green, Codex-clean, threads resolved, "Choices I made" empty, no `needs-pierre`), run `python3 tools/train.py
  --dry-run N` (several PRs ready at once: `N1 N2 …`, in merge order; it checks each PR and builds the train locally),
  then the same without `--dry-run` in the background
  (Bash `run_in_background`: it waits about 4 min for Checks and Smokes on `train/<time>`). Green: it squash-merges each
  PR at its tested head, then compares `main`'s tree with the train's. Red: nothing merged; read the failing job, leave
  out the PR it points to (or fix it), build a new train; never re-run (rule W23). It stops before a merge if `main`
  moved (a Publish, Candidate photos): the PRs left go in a new train. Exit 2 = `main`'s tree differs from the train's:
  dispatch Checks and Smokes on `main` and fix forward. Train branches stay on GitHub until the weekly "Clean branches and
  Actions" run deletes them after two days (agents cannot delete branches; docs/HANDOVER.md); `tools/brief.py` does not
  list them. A train of one PR is the usual case (87 of 98 trains, 2026-11-14 to 16): it saves the catch-up merge, its
  CI run and its Codex wait; a docs-only PR runs the smokes on its train (about 3 min). The merges land
  seconds apart: Deploy Pages cancels all but the last run (its concurrency group), so check that last one; a Code.gs
  PR in the train goes live on the sheet at the next self-update, as after any merge (rule D4). The last step of a
  green train moves the `release` branch to the commit `main` ended on (the sheet script installs from `release`, rule
  D3): exit 3 = main is merged but `release` was not moved (a refused push); `release` then stays behind and the next
  train moves it. `git pull` before a train so you run the current `train.py`. Only the train pushes `release`; a Code.gs
  merged any other way does not reach the sheet until the next train.
- **The shared index files**: the decisions index is generated (above). `docs/ANSWERS.md` is append-only: on a conflict
  keep `main`'s lines first, then the PR's, then `python3 tools/answers_check.py`. `merge=union` (#1215) applies to
  local merges (the train's build), not GitHub's: a PR can show a conflict there that the train does not
  ([record](decisions/2026-11-19-rules-tooling.md)).
- **Codex on every new head** (Q305 c not adopted): a catch-up merge of `main`, even a clean one, and the `VERSION`
  assign are new heads, so `@codex review` and wait. The train adds no head.
- **Never hand-edit `?v=N`, `LAB_V` or the sw.js cache name `V`**: tools/stamp_versions.py does it at publish (Codex
  caught this on #701).
- **Prettier**: CI uses 3.10.1; the local copy may be 3.8.1 and reformats some untouched lines differently. Check the
  diff after `--write` and revert unrelated hunks.
- **Stacked PRs**: merging a PR whose base is another PR's branch merges into that branch, not main (it happened with
  #667 into #663; harmless, but check `base.ref` before merging).
- **No stacked PRs at all** (rule W22, Pierre, 2026-11-09: "on fait des PR sur main"; never ask him to change a base
  by hand). Older note: **never put stacked PRs in a train** (2026-11-08 night, the fish judging stack #760-#766): after the first one is
  squashed, the next one conflicts with the squash commit. Land a stack as its top PR (one squash holding every
  commit) and close the others with a pointer to it ("landed in #N").
- **CI waits**: poll a PR with a small loop (head sha → check-runs → Codex state), not with chained sleeps; the
  machine runs heavy tests through `node tests/slot.js --name X -- <cmd>` (one at a time; sims at 1 worker, chunks ≤ 20
  min). The container restarted 3 times on 11-06 (never memory).
- **Learning changes** need rule L11-L12 checks (learnsim before/after, 4 profiles × 5 seeds) or Codex flags them; fish
  has no real-log replay yet (say what was measured instead).
- **Assigning a version on top of main** (2026-11-20): bring main in, then take **only** main's line 1 and `const
  VERSION` (and main's HISTORY.md) before `--assign`; never check out main's whole `Code.gs`: that wiped #1285's code
  once (its tests caught it). When another PR merges first with the same number, the stale one is put back to
  "waiting" (its changes file restored from the commit that deleted it, main's line 1, `VERSION`, HISTORY.md) and
  assigned again.
- **Order the queue: Code.gs PRs first** (2026-11-20): ordinary PRs that keep arriving starve the PRs that wait for a
  version, which need a quiet main between the assignment and the train. Run the version PRs one at a time, then the
  rest, and **the oldest PRs first** in each group, so that none lingers (Pierre, 2026-11-20 17:48).
- **Think before building an engine change** (the integrator's lesson, not a rule of Pierre's; from his remark of
  2026-11-20 17:33 on the response-time change, decided too fast): a fact he states (answer time carries difficulty) is
  decided; how the engine integrates it was not, and the response-time design got a study first. For other engine work,
  weigh the same way how much study the change needs.
- **Every answer reaches the ledger the same day** (Pierre, 2026-11-20 17:53): a decision he gives in the chat that no
  open PR records goes into `docs/ANSWERS.md` at the next check-in, in a small PR of its own, without waiting for the
  work it decides.
- **The queue glue lives in `tools/queue/`** (README there): a loop per PR (merge main, push, `@codex review`, wait for
  CI and Codex on the head, then `tools/train.py N`), a version step per Code.gs PR as above, and a wait so that only one
  wave runs. Its log and state go to `QUEUE_DIR` (default `~/.cache/reefid-queue`), never into the repo. A container
  restart (an idle session's container is reclaimed) kills it and every agent: run the wave as a tracked background
  task, and an hourly check-in (`send_later`) restarts whatever stopped.
- **A "decided" backlog item is checked against Pierre's words before launch** (2026-11-20): three items launched from
  STATUS's list that morning were already built, the integrator's own prose, or a "plus tard". The agent's brief says
  to stop and report when his words, verbatim and dated, do not settle what players see.
- **A reference doc PR goes first** (2026-11-21): the backlog inventory (#1326) conflicted with the ROADMAP at every
  merge and was put back at the end of the queue each time, so for a day the integrator worked without it. Pierre,
  2026-11-21 05:42: «c'est pas possible en fait d'avoir des choses qui sont aussi importantes qui ne sont pas
  mergées». A PR the next work is chosen from (inventory, STATUS, the ledger), or one every merge conflicts with, is
  merged first: pause the queue between trains, bring it up to date, run its train, then resume.
- **A crowded machine cuts agents off**: an agent that waits too long for a `tests/slot.js` slot or a train is handed
  back unfinished. Keep its worktree; resume it later or finish the push and PR yourself (wait until no `train.py`
  runs, then push).
- **One worktree per PR, and never queue a PR whose agent is still on it** (2026-11-21): the queue's `uptodate.sh`
  merges `main` in the PR's own worktree and pushes whatever the agent has committed there (#1348's cut was pushed
  before its agent's tests). A second worktree on the same branch (`git checkout -B` elsewhere) leaves the first with a
  stale index that the queue reads as "local changes": confirm the files equal an older commit of the branch, then
  restore them or remove that worktree.
- **Resolve a thread only after its fix is pushed** (2026-11-20, #1313): an agent that resolves first lets the queue
  merge the head without the fix. Every brief says so.
- **The main checkout must sit on `main`**: `train.py` runs from it, and an agent once left it detached on an old
  commit, so the trains ran an old `train.py`. `git checkout main && git pull` before starting a wave.
- **Shared scratch scripts get overwritten**: an agent rewrote the integrator's push helper for its own branch. Keep
  queue tooling in `tools/queue/` (#1315) and tell agents not to edit the integrator's scratch files.
- **A Codex receipt with findings is its answer**: `prstate.sh` labels it `summary`; waiting for a clean receipt on
  that head only loses time (30 minutes a PR on 11-20); the queue now moves on after 3 minutes.
- **Screenshots with real photos**: the container reaches the R2 host through its proxy (`curl`), but Playwright's
  browser is not proxied: download the photos with `curl` and serve them to the page from a route; never disable TLS
  verification.

### Quota (rule W25), lessons of 2026-11-20

Pierre asked where a third of the quota went in a few hours.

- **Price before launch.** Any image pass or large wave gets a cost estimate first (images × reads per image × runs),
  then a cap. The sea slug box pass read about 8,000 images on Opus (photo, grid and check picture per photo, bench and
  drift included): about half the morning's quota.
- **One read per image** when judging photos: no grid plus check picture unless the measure shows it is needed, a
  smaller resolution where it suffices, and Sonnet wherever the sample test allows.
- **No more test-running agents than test slots**, in practice 2 on this machine. Agents waiting for `tests/slot.js` are
  cut off and resumed, which spends quota for nothing. Agents that only read can run beyond that.
- **Wake the integrator per wave, not per item**: batch judges report through one waiter at the end of a wave, not one
  notification per batch.

## Where open work sits

Never copied here, so it cannot go stale:

- **PRs in flight, questions waiting, what runs and what is next**: [STATUS.md](STATUS.md) ("Now", "Next", "Questions
  for Pierre", "Pierre's hands"), and the PR list `python3 tools/brief.py` prints.
- **Open work, ideas agreed but not built, and their order**: Linear (below), by project and priority; the subjects not
  transferred yet keep their [ROADMAP.md](ROADMAP.md) rows (Pierre, 2026-11-08: first everything that speeds up
  development, then the rest).
- **Where the next task comes from: the tracker, not STATUS** (Pierre, 2026-11-20 16:44, then of the ROADMAP; Linear
  since 2026-11-21). STATUS "Next" is a short pointer (the file stays near 100 lines so that every session start reads
  it cheaply); it never holds the whole backlog. At every check-in, and whenever agents finish, go through the Todo
  issues (and the rows not transferred) and launch every one that is decided (his words, or an integrator's call) and
  blocked by no open PR's file (rule W27).
- **Why something is as it is**: the rule's *Source* line, then [decisions/](decisions/README.md), then the LEARNING.md
  or ARCHITECTURE.md section the rule or record names.
- **Branches without a PR**: `python3 tools/brief.py` lists them. Two keep a design note on the branch only:
  `claude/admin-signout-seal` (`docs/reviews/2026-11-09-admin-signout-seal.md`) and `claude/level-count-from-log`
  (ROADMAP "The level's answer count follows the log"). A branch that is moot is deleted with the "Clean branches and
  Actions" workflow (docs/HANDOVER.md); a clone made before the 2026-11-08 rewrite never pushes one.

## Linear

Open work is tracked in Linear (Pierre, 2026-11-21 14:41; [decision](decisions/2026-11-21-linear-tracking.md)):
workspace reef-id, team REE, nine projects P-REE-1 to P-REE-9 (outcomes). Views:
[active](https://linear.app/reef-id/team/REE/active), [backlog](https://linear.app/reef-id/team/REE/backlog),
[all](https://linear.app/reef-id/team/REE/all), [projects](https://linear.app/reef-id/projects/all). Agents reach it
through the Linear MCP tools. ROADMAP.md keeps a pointer for each subject transferred and the rows not transferred yet.

- **The integrator keeps it current as part of normal work**: In Progress at an agent's launch, In Review when its PR
  opens, Done at merge; a new issue (label Idea) for every idea discussed and not built; an issue's description holds
  the outcome, current understanding, next action, completion evidence and references (the team template), agent
  detail in its collapsible "Agent notes". Todo means ready: permitted by a decision of his or the integrator's
  mandate, never approved by the status alone.
- **Drain the Todo column until he says stop** (Pierre, 2026-11-21 21:00: «tant que j'ai pas dit qu'on s'arrêtait, il
  faut continuer … écluser tout ce qu'il y a dans la roadmap qui est faisable sans moi, et déjà décidé»): every Todo
  issue not assigned to him has an agent, High first, then the rest, evenings and nights included (Rule 0 stops
  questions, not work); the sensitive files go one PR at a time (rule W27), the rest in parallel. A "Next" list in
  STATUS is never a substitute for launching. Launch agents from the main checkout: an agent starts in the
  integrator's current directory, and one started inside a PR's worktree takes it over.
- **Pierre never enters tickets**, relays a subagent's result or approves ordinary bookkeeping. Subagents report; the
  integrator updates Linear, unless the brief tells the subagent to.
- **Labels**: Decision for Pierre only for a real unresolved choice, checked against ANSWERS first, still asked in
  the chat in French (AGENTS.md "Questions to Pierre"); the issue holds its context. Blocked, Study, Idea, Waiting,
  Parked as named. **Scheduled** (Pierre, 2026-11-22; [decision](decisions/2026-11-22-scheduled-tasks.md)): a task
  that only needs to come back on a date or a named trigger goes to Backlog with this label, its due date (or its
  trigger in the description's "Comes back" line); it stays out of every list, report, STATUS and question to Pierre
  until then. The integrator checks Scheduled issues at each session start and brings one back to Todo, telling Pierre
  once, when the date comes (14 days before a due date: integrator's call) or the trigger happens.
- **The free plan**: 250 active issues (archived ones unlimited). Basic (USD 10 a user a month, billed yearly) only if
  the limit blocks useful work, and then asked to him with its price first (money: AGENTS.md "Always ask first").
