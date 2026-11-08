# Integrator handover

**For the next integrator** (the main agent of a Claude Code session; AGENTS.md "Working mode"). Read AGENTS.md first,
then [STATUS.md](STATUS.md) for where things stand, then this page for how the work is actually run day to day. Written
2026-11-07 by the integrator of 2026-11-02..07, before a quota pause. Keep it current: it is the working knowledge that is
not a rule (rules live in AGENTS.md and docs/rules/) and not state (state lives in STATUS.md).

## Working with Pierre

- **Language**: he writes in French (often dictated: expect speech-to-text slips, e.g. "Yammer" / "AMR" = IMR, players'
  first names misspelled, "Firebase" = FishBase, "Fresh shark" = thresher shark). Answer in French, "tu". Every artifact (code, docs, PRs,
  commits) in English.
- **Questions** go to him numbered, never reset: the last number used is in [STATUS.md](STATUS.md) ("Last question number"; `python3 tools/brief.py` prints it). Each with its context in one or two
  sentences, the options, and a recommendation. He answers "Question N, ok" or picks an option. Record the answer in the
  PR's Decisions ("Pierre, date time (QN)"), empty "Choices I made", remove `needs-pierre`, merge.
  **What gets a number** (Pierre, 2026-11-08, replacing the line of that afternoon; the definition is in AGENTS.md
  "Working mode"): two tests, both needed. (1) The answer commits the future: the players' learning or game, the
  engine's model, data or privacy, rights, a rule's substance, an irreversible action, a big cost. (2) The answer will
  be cited later, to show how a point was reached. **Not numbered**, asked plainly: a visual detail inside an agreed
  design (screenshots and "OK?"), an implementation detail (the agent's or your call, written in the PR), the order or
  priorities (he sets his ROADMAP order himself: "which next?" is never numbered), a confirmation or a fact, the wording
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
- **Rule 0** (AGENTS.md): after 17:30 Manila, start nothing new he asks for; park it in STATUS "Parked after hours".
  He can override for one evening only after being reminded of his own limit (he did on 11-06 at 19:48, "launch them,
  I won't look"). Finishing already-decided merges after 17:30 is closing, not new work.
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
- **Never force-push** (the classifier refuses it anyway). The merge contract still wants a PR up to date with
  origin/main right before it merges: since a rebase would need a force-push, bring the branch up to date with a merge
  commit (`gh api -X PUT …/pulls/N/update-branch`, or merge origin/main locally), wait for green, then merge. Never
  force-push main. **The history was rewritten on 2026-11-08 ~16:20 Manila** (photos step 3, Q121, Q300; HANDOVER
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
  `POST …/pulls/N/ccr/ready_for_review`. Subagents are refused thread resolution: the integrator resolves.
- **Merge**: `gh api -X PUT …/pulls/N/merge -f merge_method=squash -f sha=<head>` once the branch is up to date with
  origin/main (above) or through a green train (below), every check is green on that head (their number grows: CodeQL and other security checks run
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
  the entry folded into the header line and ARCHITECTURE.md's version history, the gates above the old VERSION and every
  bare `vNEXT` set to the new number, the file removed), run the fast tier, commit "Sheet script vN assigned at merge",
  push, `@codex review`, wait for green and Codex, then merge alone or as the one Code.gs PR of a train. A PR built under
  the old rule (its own VERSION bump) passes the check only if its number is still main+1 and ARCHITECTURE.md names it:
  otherwise move its header entry into a changes file and restore main's VERSION and header line. Rules versions (RVS)
  run with no gap. Main's `VERSION` and the live script's: `python3 tools/brief.py` (STATUS "Now" says what is in flight).
- **The merge train** (rule W26; Pierre, 2026-11-08, Q305 b): when two or more PRs are ready on their own heads (green,
  Codex-clean, threads resolved, "Choices I made" empty, no `needs-pierre`), run `python3 tools/train.py --dry-run N1 N2 …`
  (in merge order: it checks each PR and builds the train locally), then the same without `--dry-run` in the background
  (Bash `run_in_background`: it waits about 4 min for Checks and Smokes on `train/<time>`). Green: it squash-merges each
  PR at its tested head, then compares `main`'s tree with the train's. Red: nothing merged; read the failing job, leave
  out the PR it points to (or fix it), build a new train; never re-run (rule W23). It stops before a merge if `main`
  moved (a Publish, Candidate photos): the PRs left go in a new train. Exit 2 = `main`'s tree differs from the train's:
  dispatch Checks and Smokes on `main` and fix forward. Train branches stay on GitHub (agents cannot delete branches);
  `tools/brief.py` does not list them. One PR alone: merge it as before, a train of one saves nothing. The merges land
  seconds apart: Deploy Pages cancels all but the last run (its concurrency group), so check that last one; a Code.gs
  PR in the train goes live on the sheet at the next self-update, as after any merge (rule D4).
- **Codex on every new head** (Q305 c not adopted): a catch-up merge of `main`, even a clean one, and the `VERSION`
  assign are new heads, so `@codex review` and wait. The train adds no head.
- **Never hand-edit `?v=N`, `LAB_V` or the sw.js cache name `V`**: tools/stamp_versions.py does it at publish (Codex
  caught this on #701).
- **Prettier**: CI uses 3.9.10; the local copy may be 3.8.1 and reformats some untouched lines differently. Check the
  diff after `--write` and revert unrelated hunks.
- **Stacked PRs**: merging a PR whose base is another PR's branch merges into that branch, not main (it happened with
  #667 into #663; harmless, but check `base.ref` before merging).
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
- **Idea, not on the ROADMAP yet**: the Answers rows carry no device id, and Events have the device but only the date,
  so a session cannot be traced to a device (Pierre asked on 11-07). Log the device id with each answer.
- **Open PRs**: none after the 11-08 drain and the history rewrite. #664 (engine coherence review) merged as a reference
  doc; its 8 decisions get a read-only re-check (ROADMAP row). #637 (photos rated against the genus ability, Q136) was
  closed unmerged; its branch stays (ROADMAP "Photos rated against the genus ability"). The old worktree
  `photo-genus-ability` (2 commits not on the remote head) is in a pre-rewrite clone: patches only, never a push.
- **Branch `claude/fish-todo-wip`** (no PR): unfinished, untested follow-up of #686's audit, fish.exclude matched by
  photo id (fishOn / fishPhotos) and the fish To do without the coral-only sections. Finish, renumber Code.gs, PR.
- **Priority after the rewrite** (Pierre, 2026-11-08): first everything that speeds up development (Q305 a, b, d and
  the CI speed study's first changes), then the rest: ROADMAP "Backlog in priority order" is the one list.
- **Backlog, in Pierre's earlier order of interest** (ROADMAP rows):
  1. the **species level and the global fish score** (decided 11-04: 100% only with common and scientific names of
     every species; the path is a tree; a right genus is partial credit);
  2. **ID marks for the 23 fish families with no IMR cue** (circles 2-3, Soapfishes): the feedback shows nothing there;
     genus and species ID marks;
  3. the **species name in small type after a family or genus answer** (ROADMAP, "later");
  4. **photo rotation in the admin** (ROADMAP, "later");
  5. per-subject **photo stats and Health** in the admin (admin plan row 11);
  6. the **exam over two visits** on fixed-difficulty photos; **ability uncertainty** (Glicko / Kalman, #651's remedy);
  7. the new bar's **live confirmation** (seeds 61-90) and its **τ baseline**, held until after the fish rush;
  8. #641's confusion-group questions a-j and #651's 5 choices for Pierre (not numbered yet).
- **Pierre's hands** (STATUS): covers for the 11 fish families with no reference-level photo, the 8 unsure candidates
  left in the admin, the expert analyses' photos to check, the rewrite's follow-ups (the R2 crops, deleting his backup
  when he says so; no GitHub Support purge, his choice), the old branches to delete.
- **Local clutter**: the ~70 worktrees of the old clone (`/home/user/coral-id-imr-OLD-HISTORY` and its
  `.claude/worktrees/`, `/home/user/coral-*`, `wt-*`) are all from before the rewrite: never push from them. Almost all
  are of merged PRs; `judge`, `learnsim-field` and `progcov` hold only untracked tmp sim scripts.
