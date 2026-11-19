# Integrator handover

**For the next integrator** (the main agent of a Claude Code session; AGENTS.md "Working mode"). Read AGENTS.md first,
then [STATUS.md](STATUS.md) for where things stand, then this page for how the work is actually run day to day. Keep it
current: it is the working knowledge that is not a rule (rules live in AGENTS.md and docs/rules/) and not state (state
lives in STATUS.md).

## Habits

What the integrator does day to day, as it stands now. Rules live in AGENTS.md and docs/rules/; where one covers a habit
below, the rule wins. Dated stories behind a habit are in git and the PRs.

- **Work comes from the whole queue.** The turn an agent reports, the next decided item starts, before any merge work;
  every check-in counts the running agents first. The source is [ROADMAP.md](ROADMAP.md) and
  `docs/reviews/2026-11-18-backlog-inventory.md`, never a short list half marked "after Pierre" (AGENTS.md "Working
  mode", rule W27 for the cap).
- **Every turn ends with the next `send_later` check-in.** An agent waiting on a permission prompt is reported to Pierre
  in one line and told how to do without it.
- **The session runs in auto mode** (Pierre, 2026-11-12): a classifier judges each command, and the repo's allow rules
  (`.claude/settings.json`: resolving review threads) pass before it. A refusal: find the narrow allow rule and propose
  it once. GitHub chores (resolving fixed threads, labels, branch updates) are the integrator's, never Pierre's.
- **Pierre's follow-ups go to the running agent** with `SendMessage`, not to a new agent: he corrects the shape of a
  subject quickly.
- **An interruption to ask a question is not a stop**: answer, then carry on.
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
- **Generated files are rebuilt, never hand-merged**: `seaslug-game.json` (`tools/seaslug_game.py --check` fails
  otherwise), `suggest.json` (re-import the PR's species over `main`'s file), `fish-holdout.json`.
- **`tools/judging_fish.py` has no `--help`**: an unknown argument imports every fish species into `suggest.json`. A
  fish judging batch runs `python3 tools/judging_fish.py one` before committing (`one --check` fails CI).
- **Wait on trains with `pgrep -f "python3 tools/train.py"`**, never `ps aux | grep` on a word: the waiter's own command
  line holds the word. A wait loop must end: check with `ps` that a queued train runs, and read its output.
- **After merging `main` into a PR**, check for conflict markers (`git diff --check`, `grep -n '^<<<<<<<'`) before the
  commit and resolve per hunk, never `git checkout --ours` on a whole file; commit the merge before
  `sheet_version.py --assign` (it refuses otherwise).
- **The integrator's helpers do not live in the session scratchpad**, which goes with the session: a PR state line (head,
  checks, Codex receipt on the head, open threads via `pulls/N/ccr/review_threads`, "Choices I made" None), a wait for the
  Codex receipt, a train queue that never starts `tools/train.py` while one runs and waits for the Candidate photos
  workflow, and the sheet VERSION step (`tools/sheet_version.py --assign` in a sparse worktree with `main` merged, commit
  "Sheet script vN assigned at merge", `@codex review`). None is committed as a tool yet: rebuild them first thing as
  small scripts. A docs-only PR has 5 checks, not 17.
- **Test every new card at 390 px with a long list**: a card with a long list once pushed itself off screen behind its
  backdrop. The safety net stays (an invisible card closes itself 2.5 s after the first frame drawn with it, so a card opened
  while the page is busy or hidden is not judged before it could fade in; the events `empty card closed` and
  `left with a card open`): read the Events tab now and then for any other card that hides.

## Working with Pierre

**The right model and effort for each task** (the Agent tool's `model` and `effort`, set at every agent launch;
Pierre, 2026-11-18: "C'est une bonne idée, et qui doit être bien documenté dans les règles hautes données aux agents
(et notamment à l'intégrateur)"; the named models: "ok, applique ce tableau"):

| Task | Model | Effort |
| --- | --- | --- |
| Design, architecture, the learning engine, security, rule wording with consequences | Opus 5.5 (Fable 5.2 only where Opus at high effort measurably falls short) | high |
| Ordinary code (game formats, admin pages, fixes, docs) | Sonnet 5.5 | medium to high |
| Mechanical, repetitive work (framing, sorting photos, conversions) | Haiku 5.5, after the sample test against a strong model (Model choice by measurement) | low |

In doubt, the stronger one; a task that turns out harder is relaunched one step up, never pushed through.

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
  resolution, one species) before looking, and judge the species under target first.
- **Don't ask the obvious** (he said so several times): a rule written for corals applies to fish unless coral-specific
  (Q168); micro-choices (names, layout details, test values) are the integrator's call, listed in the PR as such.
- **Visual changes**: send screenshots as files in the chat (SendUserFile, 390 px phone first), then the question.
- **Merge continuously**; keep few PRs open. He dislikes a long open list.
- **Never ask him to click** anything the integrator can do: resolving Codex threads, marking PRs ready, retargeting,
  dispatching a workflow (`gh api -X POST …/actions/workflows/approved-photos.yml/dispatches -f ref=main`).
- **Rule 0** (AGENTS.md, one sentence): after 17:30 Manila, ask him nothing until his first message after 04:00;
  questions wait in STATUS.
- **Quota**: on 2026-11-06 ~17:03 he flagged the quota at 7% and asked to save it; stopped agents' work stayed on branches.
  The daily 04:31 Manila morning-report scheduled task is **disabled** (Q202): find it with list_triggers and re-enable
  it once the quota is back and he agrees.

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
- **Codex on every new head** (Q305 c not adopted): a catch-up merge of `main`, even a clean one, and the `VERSION`
  assign are new heads, so `@codex review` and wait. The train adds no head.
- **Never hand-edit `?v=N`, `LAB_V` or the sw.js cache name `V`**: tools/stamp_versions.py does it at publish (Codex
  caught this on #701).
- **Prettier**: CI uses 3.10.1; the local copy may be 3.8.1 and reformats some untouched lines differently. Check the
  diff after `--write` and revert unrelated hunks.
- **Stacked PRs**: merging a PR whose base is another PR's branch merges into that branch, not main (it happened with
  #667 into #663; harmless, but check `base.ref` before merging).
- **No stacked PRs at all** (rule W27, Pierre, 2026-11-09: "on fait des PR sur main"; never ask him to change a base
  by hand). Older note: **never put stacked PRs in a train** (2026-11-08 night, the fish judging stack #760-#766): after the first one is
  squashed, the next one conflicts with the squash commit. Land a stack as its top PR (one squash holding every
  commit) and close the others with a pointer to it ("landed in #N").
- **CI waits**: poll a PR with a small loop (head sha → check-runs → Codex state), not with chained sleeps; the
  machine runs heavy tests through `node tests/slot.js --name X -- <cmd>` (one at a time; sims at 1 worker, chunks ≤ 20
  min). The container restarted 3 times on 11-06 (never memory).
- **Learning changes** need rule L11-L12 checks (learnsim before/after, 4 profiles × 5 seeds) or Codex flags them; fish
  has no real-log replay yet (say what was measured instead).

## Where open work sits

Never copied here, so it cannot go stale:

- **PRs in flight, questions waiting, what runs and what is next**: [STATUS.md](STATUS.md) ("Now", "Next", "Questions
  for Pierre", "Pierre's hands"), and the PR list `python3 tools/brief.py` prints.
- **Ideas agreed but not built, and their order**: [ROADMAP.md](ROADMAP.md) ("Backlog in priority order" is the one
  list; Pierre, 2026-11-08: first everything that speeds up development, then the rest).
- **Why something is as it is**: the rule's *Source* line, then [decisions/](decisions/README.md), then the LEARNING.md
  or ARCHITECTURE.md section the rule or record names.
- **Branches without a PR**: `python3 tools/brief.py` lists them. Two keep a design note on the branch only:
  `claude/admin-signout-seal` (`docs/reviews/2026-11-09-admin-signout-seal.md`) and `claude/level-count-from-log`
  (ROADMAP "The level's answer count follows the log"). A branch that is moot is deleted with the "Clean branches and
  Actions" workflow (docs/HANDOVER.md); a clone made before the 2026-11-08 rewrite never pushes one.
