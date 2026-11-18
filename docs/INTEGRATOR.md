# Integrator handover

**For the next integrator** (the main agent of a Claude Code session; AGENTS.md "Working mode"). Read AGENTS.md first,
then [STATUS.md](STATUS.md) for where things stand, then this page for how the work is actually run day to day. Written
2026-11-07 by the integrator of 2026-11-02..07, before a quota pause. Keep it current: it is the working knowledge that is
not a rule (rules live in AGENTS.md and docs/rules/) and not state (state lives in STATUS.md).

## Handover of 2026-11-16 (read first)

What the day (29 merges) added, as habits:

- **A wait on a PR counts its check runs** (19 today) before calling it ready: right after a push only a few runs
  exist, all green, so "no run pending" alone can read ready too early.
- **A switch that changes where data lives makes tests stale**: turning the sea slugs' R2 step on (#1016) broke the
  sea slug smoke and the admin smoke's report tile (#1018). After such a change, run the full unit suite and read the
  smokes that name the data, not only the docs test.
- **Generated files are rebuilt, never hand-merged**: `seaslug-game.json`, `suggest.json` (re-import the PR's species
  over `main`'s file), `fish-holdout.json`. A judging PR on species already in play carries the rebuilt game file
  (`tools/seaslug_game.py --check` fails otherwise).
- **`tools/judging_fish.py` has no `--help`**: an unknown argument imports every fish species into `suggest.json`.
- **The Candidate photos run moves `main`** after any judging merge; a train started meanwhile stops ("main moved"):
  wait for that workflow's run to end, then train (a loop that retries on "main moved" works).
- **The machine slot is the bottleneck with four agents**: a local `node tests/run.js` can wait past a tool's time
  limit. When the slot is saturated, push and let CI run the suite (it does on every head), and say so.
- **Pierre corrects the shape of a subject quickly** (the sea slugs: genera, not families; Learn grouped by taxonomic
  group, 15:00-15:45): pass his follow-ups to the running agent with `SendMessage` rather than starting another.

## Handover of 2026-11-14 evening

What the day added (Pierre's words in AGENTS.md "Working mode", not repeated here), as habits:

- **Keep the four agent slots full from the whole queue** (Pierre, 11-14: "Tu lances tout ce que tu peux lancer…
  Qui t'as demandé de te limiter ?"): when a slot frees, the next decided item starts; never offer him a short list.
- **Filter an agent's "Choices I made" before passing it on**: what is easy to correct afterwards ships as your call.
- **A rule said to be Pierre's quotes his words.** #558 (11-05) wrote "never merged on silence… even when it looks
  reversible" as his; he never said it (11-14) and it is gone. Paraphrase only as "integrator's reading".
- **Do not stretch a decision of his to cover a new point**: Q354's "IMR names on screen" was taken to cover the photo
  credit; he chose the other way (the credit keeps the iNaturalist name).
- **An interruption to ask a question is not a stop**: answer, then carry on.
- **Rule 0 is one sentence since 2026-11-15**: after 17:30 (the hook's time, never a guess) ask Pierre nothing;
  nothing else changes, no "closing" phase, no wind-down talk. He nearly dropped the rule over its misapplication.
- **Every brief lets agents use every useful source** (web search engines, guides, forums, publishers, APIs: AGENTS.md
  "Research uses every useful source", Pierre, 2026-11-17: "je m'attends à ce que tu utilises toutes les sources
  possibles") **and forbids sending the project's data out** (photo addresses, names, the sheet's data, image search
  with our photos): on 11-15 an agent sent R2 photo addresses to Yandex image search; the 11-15 to 11-16 briefs
  banned every search engine for it, which Pierre found too narrow.
- **Every brief says: a refused command is reported, never worked around** (another tool, `subprocess`, another
  shell form): on 11-15 an agent wrote files through Python after a redirect was refused (auto mode flagged it).
  Name the routes in the brief: no wrapper script, no Monitor, no split names; plain separate commands, as the
  refusal itself says, are fine; files are edited with the Edit tool (11-15: two agents ran refused logic from
  scratch scripts the guard does not see).
- **Fish judging batches run `python3 tools/judging_fish.py one` before committing** (#942: one judgement per photo;
  `one --check` fails CI otherwise).
- **Wait on trains with `pgrep -f "python3 tools/train.py"`**, never `ps aux | grep` on a word: a waiter's own command
  line holds the word, so two waiters blocked each other for 45 minutes (11-15).
- **After merging main into a PR, check for conflict markers** (`git diff --check`, `grep -n '^<<<<<<<'`) before the
  commit, resolve per hunk (never `git checkout --ours` on a whole file: it reverted #959's and #960's docs, #964),
  and commit the merge before `sheet_version.py --assign` (it now refuses otherwise, #960).
- **A wait loop must end**: one keyed on "the latest Candidate photos run" among the last 10 runs of any workflow
  spun for an hour (none in the 10); check with `ps` that a queued train runs, and read its output.

## Handover of 2026-11-12 evening

This session runs in **auto mode** (Pierre, 2026-11-12: kept): a permission classifier judges each command; repo allow
rules pass before it (`.claude/settings.json`: resolving review threads). What the two days added:

- **Pierre wants work run in parallel** (11-12: "pourquoi tu me demandes mon avis pour un ordre alors que tu peux tout
  lancer en parallèle ?"): independent read-only studies and PRs on different files go out together, within W27's
  four agents that write code or run tests (studies run on top); ask him only what is his to decide (wording, game rules), never the order of work.
- **Don't send him GitHub chores** (11-12: "c'est quoi ce micromanagement forcé ?"): resolving fixed threads, labels,
  branch updates are the integrator's. A refusal by the classifier: find the narrow allow rule, propose it once.
- **A success rate is never a level** (LEARNING "What each number measures", rule L12): two studies read 75-83% right
  as "mid-level"; the level is the global Elo (settled only after many answers) and progress.
- **Each merge moves `main`**: the next open PR needs `origin/main` merged in (a merge commit), CI again, and
  `@codex review` on the new head before it merges; plan merges in a row, or a train.
- The Codex summary comment can say "running" long after its receipt "Reviewed commit: `<head>`" landed: the receipt
  on the head is what counts.

## Handover of 2026-11-09 evening

Pierre's quota ran out on 11-09 (more than half a week's quota spent in one day on a handful of PRs); the next
integrator starts on another account from 11-11 morning. What the day taught, now rules or habits:

- **Rule W27** (docs/rules/ship.md): at most four agents that write code or run tests, read-only studies on top (11-18); every branch from `origin/main` (no stacked PRs, never ask
  Pierre to change a base); no two open PRs on one sensitive file (`Code.gs`, `core.js`, `sync.js`, `model.js`): one
  after the other, the next merges `main` and runs `sync_core --fix` after the first lands; two Codex rounds, then cut
  the scope to a branch of its own with a short design note (findings that keep coming are a structural problem: we find
  and decide the model; Pierre gets options with benefits, risks and a recommendation only when he would see the
  difference); simulations capped at what is read (Q208's look 2 took 37 s, a full tier-2 run 3 h); one train at a time.
- **Ask back a short or ambiguous request** before any work (the 🌱 was built twice: a drawn badge, then a rename,
  before "the name unchanged, 🌱 added on its own"; a "razorfish" sentence was misread as a rename request).
- **Names**: real names only in the chat, pseudonyms (P1…) in every committed file and PR (rule D2; a slip in this
  STATUS was caught by Codex on #845).
- **Never push a ref to a pre-rewrite commit** (2026-11-11): a SHA from before 2026-11-08 ~16:20 (no common ancestor
  with `main`; `tools/brief.py` says so) carries the photos and the 2216 Coral Finder crops the rewrite stripped, so a
  branch or tag on it brings them back into every clone. Two Lab archives were pushed that way and deleted at once
  (Clean branches and Actions, `also_delete`). Check `git merge-base main <sha>` before pushing any old SHA.
- **CI outage is not a red check**: a CodeQL bundle download 504 (GitHub) failed #834 once; say so on the PR, never
  re-run; a merge of `main` (a real new head) re-runs everything.
- **The integrator's helpers lived in the session scratchpad** (gone with it): a PR state line (head, checks, Codex
  receipt on head, open threads via `pulls/N/ccr/review_threads`, "Choices I made" None), a wait for the Codex receipt
  "Reviewed commit: `<head>`" or a Codex review on the head, a train queue that never starts `tools/train.py` while one
  runs and waits for the "Candidate photos" workflow, and the sheet VERSION step (`tools/sheet_version.py --assign` in a
  sparse worktree with `main` merged, commit "Sheet script vN assigned at merge", `@codex review`). Rebuild them as
  small scripts first thing; a docs-only PR has 5 checks, not 17.
- **In flight**: STATUS "Now". Kept on branches without a PR, each with its note: `claude/admin-signout-seal` (the
  seal cut out of #798; `docs/reviews/2026-11-09-admin-signout-seal.md`: one IndexedDB store, every draft write in one
  transaction), `claude/level-count-from-log` (cut out of #840: the "answers so far" count following the log needs
  checkpoints that are not absolute counts), and the three others in STATUS "Now". Lost with the 11-09 session's
  machine (never pushed): `claude/analyses-fsrs`, `claude/load-order-b`, Find the X's format, load order (d).

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
  two PRs on the same files are not run in parallel. A lighter model (the Agent tool's `model`) only for mechanical work
  a test checks (bringing a PR up to date, docs, data fetches, a test fix); the strongest model for anything judged
  (learning, content, design, reviews, photo judging). Photo judging: sort on metadata first (licence, presence,
  resolution, one species) before looking, and judge the species under target first.
- **Don't ask the obvious** (he said so several times): a rule written for corals applies to fish unless coral-specific
  (Q168); micro-choices (names, layout details, test values) are the integrator's call, listed in the PR as such.
- **Visual changes**: send screenshots as files in the chat (SendUserFile, 390 px phone first), then the question.
- **Merge continuously**; keep few PRs open. He dislikes a long open list.
- **Never ask him to click** anything the integrator can do: resolving Codex threads, marking PRs ready, retargeting,
  dispatching a workflow (`gh api -X POST …/actions/workflows/approved-photos.yml/dispatches -f ref=main`).
- **Rule 0** (AGENTS.md, one sentence since 2026-11-15): after 17:30 Manila, ask him nothing; questions wait in STATUS.
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
  `VERSION` and the header line alone, so parallel PRs no longer collide. To merge it: in its worktree, merge
  `origin/main` into the branch, run `python3 tools/sheet_version.py --assign --dry-run`, then `--assign` (VERSION + 1,
  the entry folded into the header line and ARCHITECTURE.md's version history, every gate the PR adds and every bare
  `vNEXT` set to the new number, main's gates left alone, the file removed; a merge stopped on a conflict may stay
  uncommitted until then, the tool reads its `MERGE_HEAD`, and it refuses a branch that does not hold `origin/main`
  yet, unresolved conflicts, or a PR that moves one of main's gates), run the fast tier, commit "Sheet script vN assigned at merge",
  push, `@codex review`, wait for green and Codex, then send it in a train, alone or as that train's one Code.gs PR. A PR built under
  the old rule (its own VERSION bump) passes the check only if its number is still main+1 and ARCHITECTURE.md names it:
  otherwise move its header entry into a changes file and restore main's VERSION and header line. Rules versions (RVS)
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
  PR in the train goes live on the sheet at the next self-update, as after any merge (rule D4).
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

## Open work and where it sits

- **Fixed (#710): the stuck dimmed screen** (Pierre, 2026-11-07, three times after ~10 fish answers). The Scientific
  names offer (#702, due once a family is at Open Water) drew one thumbnail per genus in a non-wrapping row (40 for him),
  which pushed the card off screen (left 730 px on a 390 px phone) behind its backdrop. Now: 6 thumbnails then "+N", one
  grid column never wider than the screen, the row wraps. #709's safety net (an invisible card closes itself after
  2.5 s, now also checking left/right) and its events (`empty card closed`, `left with a card open`) stay: read the
  Events tab now and then for any other card that hides. Lesson: test every new card at 390 px with a long list.
- **Open PRs**: STATUS "Now". #664
  (engine coherence review) merged as a reference doc; its re-check is done (ROADMAP row): C1 decided by Pierre on 2026-11-09 (Q316: componential difficulty model; Q136 reopened with it). #637 (photos rated against the genus ability, Q136) was
  closed unmerged; its branch stays (ROADMAP "Photos rated against the genus ability"). The old worktree
  `photo-genus-ability` (2 commits not on the remote head) is in a pre-rewrite clone: patches only, never a push.
- **Branch `claude/fish-todo-wip`** (no PR): unfinished, untested follow-up of #686's audit, fish.exclude matched by
  photo id (fishOn / fishPhotos) and the fish To do without the coral-only sections. Finish, renumber Code.gs, PR.
- **Priority after the rewrite** (Pierre, 2026-11-08): first everything that speeds up development (Q305 a, b, d and
  the CI speed study's first changes), then the rest: ROADMAP "Backlog in priority order" is the one list.
- **Backlog, in Pierre's earlier order of interest** (ROADMAP rows):
  1. the **species level and the global fish score** (decided 11-04: 100% only with common and scientific names of
     every species; the path is a tree; a right genus is partial credit);
  2. the fish families' ID marks are in (#773, the 40 with no IMR cue); genus and species ID marks are left;
  3. the **species after a family or genus answer** (Pierre asked again on 11-08 ~20:10: species, common and scientific
     name; morning question: before the species level?);
  4. **photo rotation in the admin** (#793, waiting for Codex);
  5. per-subject **photo stats and Health** in the admin (#800, waiting for Codex);
  6. the **exam over two visits** on fixed-difficulty photos; **ability uncertainty** (Glicko / Kalman, #651's remedy);
  7. the new bar's **live confirmation** (seeds 61-90) and its **τ baseline**, held until after the fish rush;
  8. #641's confusion-group questions a-j and #651's 5 choices for Pierre (not numbered yet).
- **Pierre's hands** (STATUS): covers for the 11 fish families with no reference-level photo, the 8 unsure candidates
  left in the admin, the expert analyses' photos to check, the rewrite's follow-up (deleting his backup when he says so;
  no GitHub Support purge, his choice). The R2 crops are gone (2026-11-09); old branches go through the "Clean branches
  and Actions" workflow (docs/HANDOVER.md).
- **Local clutter**: gone. On 11-11 the old clone's worktrees and branches were deleted and local `main` realigned
  on GitHub's (Pierre); a clone made before the rewrite still never pushes.
