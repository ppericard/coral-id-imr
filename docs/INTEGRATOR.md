# Integrator handover

**For the next integrator** (the main agent of a Claude Code session; AGENTS.md "Working mode"). Read AGENTS.md first,
then [STATUS.md](STATUS.md) for where things stand, then this page for how the work is actually run day to day. Written
2026-11-07 by the integrator of 2026-11-02..07, before a quota pause. Keep it current: it is the working knowledge that is
not a rule (rules live in AGENTS.md and docs/rules/) and not state (state lives in STATUS.md).

## Working with Pierre

- **Language**: he writes in French (often dictated: expect speech-to-text slips, e.g. "Yammer" / "AMR" = IMR, "Gemma" =
  Jemma, "Firebase" = FishBase, "Fresh shark" = thresher shark). Answer in French, "tu". Every artifact (code, docs, PRs,
  commits) in English.
- **Questions** go to him numbered, never reset: **the last number used is Q205**. Each with its context in one or two
  sentences, the options, and a recommendation. He answers "Question N, ok" or picks an option. Record the answer in the
  PR's Decisions ("Pierre, date time (QN)"), empty "Choices I made", remove `needs-pierre`, merge.
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
  genera); Pierre himself counts as a fish expert **for families only**. Ask Pierre who they are when an analysis needs
  them; never write their names or results to the repo.
- Their logs serve to check the bar's calibration and to find mislabelled photos (an expert missing an "easy" photo).

## Sheet, photos, data: the hard limits

- **The sheet** (its ID is in docs/HANDOVER.md) is **read-only** for agents. Writing is the
  integrator's only, and only with Pierre's explicit one-off permission (used once: the Notes tab, key `card.rv8.ps`,
  the PS of the apology card). Tests never touch it.
- **curation.json** is written only by the admin's draft and Publish, never by an agent.
- **Never force-push** (the classifier refuses it anyway); keep branches current with merge commits. Never force-push
  main. Photos step 3 (history rewrite, Q121) only with Pierre's explicit go, a time and a backup.
- **Every fish photo in play is hosted on R2** (Q199): Pierre's adds, the sure judged candidates (Q180) and the
  reference-level photos, all through `tools/fish_game.py` / `fish-game.json`; iNaturalist / FishBase are only the
  fallback (R2 asked twice, then the online original). The "Candidate photos" workflow uploads them after each Publish,
  or on a manual dispatch; if its log says photos wait for the next run, dispatch it again.

## The merge mechanics (what bites)

- **GitHub**: GraphQL is blocked; use REST (`gh api repos/ppericard/coral-id-imr/...`). Review threads, ready-for-review,
  auto-merge go through the CCR routes: `GET …/pulls/N/ccr/review_threads`, `POST …/pulls/N/ccr/comments/ID/resolve`,
  `POST …/pulls/N/ccr/ready_for_review`. Subagents are refused thread resolution: the integrator resolves.
- **Merge**: `gh api -X PUT …/pulls/N/merge -f merge_method=squash -f sha=<head>` once all 9 checks are green, the
  mergeable state is `clean`, no unresolved thread, "Choices I made" empty. Check Codex's latest-head findings
  (`…/pulls/N/comments`, commit_id = head) even when the thread count is 0: a finding on the head may not be a thread yet.
- **Code.gs VERSION**: every PR that changes core.js bumps it to **main+1 at push time** (header line + constant +
  `python3 tools/sync_core.py --fix`). Parallel PRs collide; the one merged second renumbers. Rules versions (RVS) run with
  no gap. Main is at **v97** (2026-11-07 09:48).
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
