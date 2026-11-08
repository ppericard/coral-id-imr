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
  force-push main. Photos step 3 (history rewrite, Q121) only with Pierre's explicit go, a time and a backup.
- **Every fish photo in play is hosted on R2** (Q199): Pierre's adds, the sure judged candidates (Q180) and the
  reference-level photos, all through `tools/fish_game.py` / `fish-game.json`; iNaturalist / FishBase are only the
  fallback (R2 asked twice, then the online original). The "Candidate photos" workflow uploads them after each Publish,
  or on a manual dispatch; if its log says photos wait for the next run, dispatch it again.

## The merge mechanics (what bites)

- **GitHub**: GraphQL is blocked; use REST (`gh api repos/ppericard/coral-id-imr/...`). Review threads, ready-for-review,
  auto-merge go through the CCR routes: `GET …/pulls/N/ccr/review_threads`, `POST …/pulls/N/ccr/comments/ID/resolve`,
  `POST …/pulls/N/ccr/ready_for_review`. Subagents are refused thread resolution: the integrator resolves.
- **Merge**: `gh api -X PUT …/pulls/N/merge -f merge_method=squash -f sha=<head>` once the branch is up to date with
  origin/main (above), every check is green on that head (their number grows: CodeQL and other security checks run
  too), the mergeable state is `clean`, no unresolved thread, "Choices I made" empty. Check Codex's latest-head findings
  (`…/pulls/N/comments`, commit_id = head) even when the thread count is 0: a finding on the head may not be a thread yet.
- **Security bots** (Pierre turned on more automatic security audits in GitHub, 2026-11-08: CodeQL, secret scanning
  and push protection, possibly others): their alerts and comments on a PR count like Codex findings. Before a merge,
  each one is fixed, or the PR says in one line why it does not apply (false positive, test-only code), and its thread
  is resolved. A security alert is never merged over in silence.
- **Code.gs VERSION**: every PR that changes core.js bumps it to **main+1 at push time** (header line + constant +
  `python3 tools/sync_core.py --fix`). Parallel PRs collide; the one merged second renumbers. Rules versions (RVS) run with
  no gap. Main's `VERSION` and the live script's: `python3 tools/brief.py` (STATUS "Now" says what is in flight).
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
- **Open PRs**: #637 (photos rated against the genus ability, Q136: needs its learnsim before/after; the local worktree
  `.claude/worktrees/photo-genus-ability` has 2 commits not on the remote head, check before pushing anything) and #664
  (engine coherence review, a doc for Pierre to read).
- **Branch `claude/fish-todo-wip`** (no PR): unfinished, untested follow-up of #686's audit, fish.exclude matched by
  photo id (fishOn / fishPhotos) and the fish To do without the coral-only sections. Finish, renumber Code.gs, PR.
- **Backlog, in Pierre's order of interest** (ROADMAP rows):
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
  left in the admin, the expert analyses' photos to check, Q121, the old branches to delete.
- **Local clutter**: ~70 worktrees under `.claude/worktrees/` and `/home/user/coral-*` / `wt-*`, almost all of merged
  PRs (their branches show "ahead" only because of squash merges). Safe to remove after checking `git status` in each;
  `judge`, `learnsim-field` and `progcov` hold only untracked tmp sim scripts.
