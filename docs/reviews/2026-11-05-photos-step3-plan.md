# Photos out of the repo, step 3: the history rewrite. Ready-to-run plan

Prepared 2026-11-05 (Manila evening) for Pierre's go, expected the morning of 2026-11-06. Nothing was pushed
and the real repository was not rewritten. Every measurement below comes from mirror copies in this scratchpad.

- Script: `/tmp/claude-0/-home-user-coral-id-imr/fbf94b29-50f3-5d97-a1d3-07ea7e20888a/scratchpad/step3/rewrite.sh`
  (`prepare` / `push` / `verify` / `rollback`). `prepare` was tested end to end against GitHub, and so was the
  stale-lease abort. Its `git push --dry-run` lease logic was also tested on one branch (nothing sent).
- Last test run: `/tmp/claude-0/-home-user-coral-id-imr/fbf94b29-50f3-5d97-a1d3-07ea7e20888a/scratchpad/step3/run1/`
  (backup.git, coral-id-imr-backup.bundle, rewrite.git, strip.txt, log.txt, commit-map). It is a snapshot of
  2026-11-05 09:19 UTC and is **stale already** (main moved). Tomorrow, run `prepare` again with a new WORK.
- The procedure is HANDOVER.md "Photos out of the repo, step 3", with the changes listed in section 4.

## 1. Dry-run results

| | Before | After |
|---|---|---|
| Full mirror (every ref, `refs/pull/*` included), main at 4ef43b16 | 688.5 MiB pack, 2559 commits, 605 refs | 135.5 MiB, 2559 commits (all rewritten, 0 pruned) |
| What a fresh `git clone` downloads (branches only), main at 0760aa60 (run1) | 685.7 MiB, 1138 commits, 13 branches | **132.6 MiB** (-81 %) |
| GitHub API `size` | 703 MB | stays until GitHub's own GC (section 3, "GitHub side") |

- **Strip list**: 6024 paths, computed exactly as HANDOVER step 4 does it (all paths ever in `img/` = 8738, minus
  main's `img/` = 2710, minus `^img/(imrl?-|[a-z]+-cf-)`). The script stops if this count is not the expected one.
  The regex keeps 4 deleted historical files: `imrl-p10_i7`, `imrl-p44_i8` (+ `-s`). Same 6024 whether
  computed on the mirror or on a branches-only clone. Cross-checked against `git filter-repo --analyze` (same
  8738 paths); no subdirectories in `img/`, only `.webp`.
- **Keep list verified against `tools/photos.py` (main's rules) and the data files:**
  - 5548 paths = the 1387 photos main says live on R2 only (`online()`: `src` and no `r`). **All 5548 files
    answer HTTP 200 on R2** (`PHOTO_BASE` pub-934250f8…r2.dev; checked twice, 0 failures).
  - 272 paths = 136 old candidate downloads, now remote candidates (`r: '1'`, `src` = iNaturalist).
  - 204 paths (202 in run1) = 55 photos (54 in run1) that no current record names. Every one of them had an iNaturalist `src` in
    the history of data.json / cand.json (the 85 + 17 historical blobs were checked).
  - 0 stripped paths belong to a no-backup photo (`gitonly()`: 673 photos, 2692 files, all in main's
    `img/`). 0 have an `imr`/`cf` flag. The 14 non-IMR/CF files still in `img/` (hydnophora-cand-245794927,
    millepora-x-175093282, tubastraea-cand-267618191, reefcloud-example) stay, because they are in main.
- **The current tree is byte-identical**: main's tree hash is the same before and after (51c5253c at 4ef43b16;
  the same holds at 0760aa60). Main's `img/` listing is unchanged. For every one of the 2559 commits, old tree
  vs new tree differs **only** by deletions, and only of paths in the strip list (7.9 M deletion entries, 0
  others).
- **Refs that change**: every branch (tip hashes change because the whole history is rewritten):
  - `main`;
  - the open-PR branches. Today there are 8 open PRs: #599 admin-fish-cand, #598 fish-public-copy, #597
    taxonomy-wire, #595 fish-open-field, #592 mfviz-entangled, #581 feedbackach-helped, #579 feedbackach,
    #572 governance-c. Their tip trees are identical before and after, and their PR diffs are byte-identical
    (checked by md5 of `git diff merge-base..tip` for 4 of them);
  - the 6 stale `claude/admiring-ramanujan-nw3mxr-*` branches, which have no PR, sit 64-213 commits behind and
    still date from before step 2. Their tip trees lose only stripped photo files (3016-5548 each).
  - **No tags.** `refs/pull/*` cannot be pushed: GitHub updates an open PR's `refs/pull/N/head` itself when
    its branch is force-pushed, and closed PRs' refs keep the old history on GitHub's side only.
- **Other effects**:
  - author, committer and dates are kept;
  - filter-repo rewrites the abbreviated hashes in commit messages (39 messages, e.g. "This reverts commit …");
  - GitHub's web-flow signatures on 586 of main's 671 commits disappear (no "Verified" badge on the old commits;
    no ruleset requires signatures);
  - hashes quoted in the docs (PAGES.md, reviews, archive) become historical text;
  - the only functional hash is in `.git-blame-ignore-revs`: `dc4320e2…` becomes `e6b63c5b75b40532c4db553b361e23ee7ee985bb`
    (the script writes `git-blame-ignore-revs.new`);
  - the new root is `3a63ab4c…` (old root `24d4d647…`, used as the old-history marker).
- Timings: mirror clone 22 s to 5 min (the network varies), filter-repo 12 s, R2 check 3 min.
- What is left after the rewrite (132 MiB): `img/` 117 MB (today's 678 kept photos and their older versions);
  everything else about 19 MB. 7 MB of that is root-level `fix-*.png` screenshots deleted on 2026-11-01. They
  are not photos and are outside the procedure, so they stay unless Pierre asks.

## 2. Command sequence for the real run (after Pierre's go)

`S=/tmp/claude-0/-home-user-coral-id-imr/fbf94b29-50f3-5d97-a1d3-07ea7e20888a/scratchpad/step3` (copy `rewrite.sh` to the
integrator's scratchpad if this one is gone; it needs only git >= 2.36, python3, network).

**Before the go (the integrator, without Pierre, e.g. 08:00-09:00):**
1. Every agent's unpushed work goes onto GitHub as a branch or PR. Today the integrator's machine has 16
   worktrees and about 15 local branches with no remote (ci-actions-node24, abilityeval-cluster, analyses-sort,
   stretch, stack-check, …). Alternatively, save each one as a patch:
   `git format-patch --stdout origin/main..B > ~/B.patch`.
   Uncommitted changes get committed first. Anything on GitHub is rewritten along with everything else;
   anything left only in an old clone has to be carried over by hand afterwards (section 3).
2. Optional: Pierre deletes the 6 stale `admiring-ramanujan-*` branches in the UI (agents cannot). If he does
   not, they are rewritten and pushed like the others. Either way works: a branch left un-rewritten on GitHub
   would make every fresh clone download the 690 MB again.

**At the go (Pierre about 2 minutes, the integrator about 10-15 minutes):**
1. **Freeze.** Stop every agent session (subagents included). Pierre does not Publish from the admin. Then:
   `gh workflow disable approved-photos.yml && gh workflow disable photos-r2.yml`
   (if the session's gh cannot, Pierre does it under Actions > the workflow > ⋯ > Disable).
   Open PRs **may stay open** (section 4).
2. **Prepare** (pushes nothing):
   `WORK=$S/run-$(date +%H%M) $S/rewrite.sh prepare`
   This takes the backup (mirror with `refs/pull`, plus a verified bundle), clones the branches bare,
   recomputes the strip list, runs the keep-list checks and the R2 200-check, runs filter-repo, and checks
   every tree. Read the log: size before and after, every branch "identical" or "differs only by stripped
   paths". It aborts on any doubt.
3. **Backup outside the session** (the container is not durable). Pierre, on his computer, any time before
   step 5:
   `git clone --mirror https://github.com/ppericard/coral-id-imr.git coral-id-imr-backup.git && git -C coral-id-imr-backup.git bundle create ../coral-id-imr-backup.bundle --all && git -C coral-id-imr-backup.git bundle verify ../coral-id-imr-backup.bundle`
   (about 700 MB). Its `git -C coral-id-imr-backup.git rev-parse main` must equal the old main in
   `$WORK/old-heads.txt`. He keeps it until he says it can go; a cloud-drive copy of the `.bundle` is enough.
4. **Pierre turns off "Block force pushes"**: Settings > Rules > Rulesets > `main` > untick *Block force
   pushes* > Save (keep *Restrict deletions*). Ruleset id 26580397; from his own terminal instead:
   `gh api -X PUT repos/ppericard/coral-id-imr/rulesets/26580397 -f 'rules[][type]=deletion'`.
5. **Push**: `GO=yes WORK=$S/run-HHMM $S/rewrite.sh push`
   It first checks that GitHub's branches still equal the backup (else it aborts: rerun `prepare` with a new
   WORK). Then one `git push --atomic` of **every branch** `refs/heads/B:refs/heads/B`, each with
   `--force-with-lease=refs/heads/B:<old sha>`: all or nothing, and nothing pushed meanwhile can be lost.
   Optional canary if the session's git proxy might refuse force pushes: first push one stale branch alone,
   `GO=yes WORK=$S/run-HHMM $S/rewrite.sh canary claude/admiring-ramanujan-nw3mxr-cards`
   (`--force-with-lease` on its backup sha). The `push` that follows leaves that branch as it is: a ref
   already at its rewritten sha counts as done, while any other change on GitHub since the backup (a new
   commit, a new or deleted branch) still aborts it with nothing pushed (`$WORK/plan.txt` lists each ref).
   If the proxy refuses, Pierre runs `rewrite.sh prepare` then `push` on his own computer (same script,
   same checks).
6. **Pierre turns "Block force pushes" back on** (same page, or
   `gh api -X PUT …/rulesets/26580397 -f 'rules[][type]=deletion' -f 'rules[][type]=non_fast_forward'`).
7. **Verify**: `WORK=$S/run-HHMM $S/rewrite.sh verify`. This checks GitHub refs = rewritten refs, a fresh bare
   clone from GitHub of about 133 MiB, and that no branch holds old root `24d4d647…`.
8. **Workflows and Pages**:
   - `gh workflow enable approved-photos.yml && gh workflow enable photos-r2.yml`.
   - The force-push of main is a push event, so `pages.yml` deploys by itself (Actions > Deploy Pages: check
     it is green, or run it once by hand).
   - The site is byte-identical (same tree). If the deploy fails with "Please cancel <sha> first", run
     Actions > *Cancel Pages deployment* (`pages-cancel.yml`) with that sha (docs/PAGES.md). Meanwhile the
     previous, identical site stays live.
   - Check the site: <https://ppericard.github.io/coral-id-imr/> loads; a photo comes from R2 and an IMR
     photo from `img/`.
9. **`.git-blame-ignore-revs`**: a one-line PR (`dc4320e2…` → the hash in `$WORK/git-blame-ignore-revs.new`,
   expected `e6b63c5b…`), merged under the contract. HANDOVER step 5 commits it on main before the push; the
   PR afterwards keeps the pushed tip byte-identical to the old main, which is the clean check. Either is fine.
10. **Re-clone everywhere** (section 3), then update HANDOVER / ROADMAP / STATUS (step 3 done, sizes, backup
    location) in a docs PR.

**R2 is never touched**: nothing in the run writes to the bucket. photos-r2 is disabled during the freeze and
copies, never deletes. The 5548 R2-only files were checked present before the rewrite.

**Rollback** (if anything looks wrong after the push, with "Block force pushes" off again):
`GO=yes WORK=$S/run-HHMM $S/rewrite.sh rollback`
This force-pushes every branch back to its backup sha from `backup.git` (`--atomic`, about 690 MB upload). If
the session is gone, run from Pierre's backup:
`git -C coral-id-imr-backup.git push --atomic --force https://github.com/ppericard/coral-id-imr.git 'refs/heads/*:refs/heads/*'`
(never `--mirror`: it would try `refs/pull/*` and delete newer branches). Commits made on the new history
after the push are not in the backup: re-apply them by patch.

## 3. After the push: clones, PRs, GitHub

- **Every clone is old history and must be re-cloned before anyone pushes**: the integrator's
  `/home/user/coral-id-imr`, its 16 worktrees, every cloud session started before the push, and Pierre's
  computer.
  - An old clone's `git pull` would merge the two histories. Its push of any branch, including a new PR branch
    based on old main, would bring the 550 MB back to GitHub and to every fresh clone. A `--force-with-lease`
    without a value after a fetch would even overwrite the rewritten branch.
  - For the integrator: `mv /home/user/coral-id-imr /home/user/coral-id-imr.old-history && git clone https://github.com/ppericard/coral-id-imr.git /home/user/coral-id-imr`.
    Worktrees are recreated sparse (AGENTS 16), and `.claude/settings.local.json` / `tools/.cache/` are copied
    over if wanted. Delete `.old-history` once nothing is left in it.
  - New cloud sessions clone the new history by themselves.
- **Carrying unpushed work over**:
  - `git am -3 ~/B.patch` on a branch from the new `origin/main`;
  - or, in the old clone after `git fetch`, `git rebase --onto <new base> <old base> B`. The new base is the
    old base's line in `$WORK/rewrite.git/filter-repo/commit-map`, saved with the backup. Push only from a
    fresh clone.
- **Open PRs**: nothing to do on GitHub. The atomic push moved each head to its rewritten branch; base and diff
  are unchanged, and the "Checks" CI re-runs (synchronize). The timeline shows a force-push. Old review comments
  may show as outdated, and Codex may review again. The owning agent continues from a fresh clone
  (`git fetch origin && git switch B`).
- **GitHub side**:
  - The ~300 closed or merged PRs' `refs/pull/*` and GitHub's cached views keep the old commits reachable on
    GitHub. Old commit links (e.g. "merged commit 4ef43b1" on a PR page) keep working until GitHub garbage-
    collects them.
  - So the repository's `size` on GitHub drops later than the clones', or not at all. That costs nothing
    (clones fetch branches only).
  - Optional: Pierre asks GitHub Support (support.github.com, "Remove cached views / dereference PR refs after
    a history rewrite", repo ppericard/coral-id-imr, first changed commit = old root `24d4d647…`). Support
    tends to do this only for sensitive data, so it is not required.
- **Pierre's GitHub actions in all**:
  - "Block force pushes" off, then on (steps 4 and 6);
  - optionally delete the 6 stale branches;
  - his own backup (step 3);
  - optionally the Support request;
  - re-clone on his computer.
  - Nothing else: no required checks, no other protection, no forks, no releases, no tags.

## 4. Changes from HANDOVER's step 3 (to fold into HANDOVER in the docs PR)

1. **Open PRs can stay open** (HANDOVER step 1 says merge or close them). filter-repo rewrites every branch of
   the clone with one consistent map, so a PR branch keeps its own commits on the rewritten base. Its tree and
   PR diff came out identical (verified). Closing a PR and force-pushing its branch would instead stop it from
   being reopened.
2. Rewrite in a **bare clone of the backup mirror** (`git clone --bare --no-local backup.git`). The rewrite
   then works on exactly the backed-up state, with every branch as a branch and no `refs/pull`.
3. Push **every branch in one `--atomic` push with a per-branch `--force-with-lease=<old sha>`** instead of
   plain `--force` main then the others. Any branch not pushed (or deleted) keeps the 690 MB in every fresh
   clone.
4. `git bundle verify` needs a repository: `git -C backup.git bundle verify ../x.bundle` (git 2.43 refuses
   it outside one).
5. The keep list is checked by script, not just the regex. It checks main's `gitonly()` and each branch's own
   records, looks up a historical `src`/`r` for photos no current record names, and HEAD-checks R2.

## 5. Risks and checks

| Risk | Guard |
|---|---|
| A no-backup photo (IMR, CF book, own drawing) is stripped | `prepare` stops if any stripped path is a `gitonly()` photo, lacks an online original in any branch's or historical records, or if main's `img/` / tree changes. Today: 0. |
| Photos lost on both git and R2 | All 5548 R2-only files checked 200 on R2 before the rewrite. The full backup (mirror and bundle) holds the old blobs. iNaturalist originals stay. |
| Something lands on GitHub between backup and push (admin Publish, Action, agent merge) | Freeze and disabled workflows. `push` compares GitHub's refs to the backup and uses a per-ref lease, so it aborts with nothing pushed. |
| An old clone pushes later and reintroduces the photos | Everyone re-clones. Run `rewrite.sh verify` a day later. Optional follow-up: a cheap CI guard (`git fetch --filter=blob:none` then fail if `24d4d647…` is an ancestor of any ref). |
| The session's git proxy refuses force pushes (it already refuses branch deletion) | Canary push of one stale branch first; if refused, Pierre runs the same script locally. |
| Partial push | `--atomic`: all branches or none. |
| Pages deploy lock on an old sha | `pages-cancel.yml`. The previous, identical site stays live. |
| The session container disappears with the backup | Pierre's own mirror/bundle (step 3) before the push. |
| Push succeeds but something is wrong | `rollback` from the backup (exact old shas). Afterwards only commits made on the new history need re-applying. |
| Stale numbers | `prepare` recomputes everything at run time. The run1 snapshot is for reference only. |

Expected values for the morning:
- strip list about 6024 (more only if photos left `img/` overnight);
- after the rewrite, about 133 MiB;
- main tree identical;
- new root `3a63ab4cc8d23b591c3a9987e18fa7ae5f1ab18a`;
- `.git-blame-ignore-revs` → `e6b63c5b75b40532c4db553b361e23ee7ee985bb`.
