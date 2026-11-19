# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions. **Pierre's answers live in
[ANSWERS.md](ANSWERS.md)** (append-only, history since 2026-11-03): search it, the rules and docs/decisions/ before
asking him anything, **and the open PR branches' copies of it** (an answer recorded on a branch is not on `main` until
that PR merges: on 2026-11-19 at 14:05 the integrator re-asked his 10:12 answers that way). This file only cites
answers.

Written 2026-11-19, about 14:30 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work.

Last checked: reports and events: 2026-11-19 ~14:25 Manila (no new report since 2026-11-17; one `old` event at 08:11,
an app from before 2026-11-03 sending photo stats; nothing else).

## Now

Main: sheet script **v193** (#1195). No agent cap (audit decision 1, Pierre's "ok" of 2026-11-18 evening;
`tests/slot.js` guards the machine). Every blocked PR merged by 13:50 (25 today since 06:00); the open ones:

- **#1099** (a reserve of photos per player, Q420 A): level 2 done, B1 and B2 not confirmed, two new small breaches
  (fish casual diver's plateau +9.2 against +9.1; corals lectureRA's shown score at 1,000 answers −1.8, heavy-tailed
  photos only). **Q432** to Pierre: accept them as the reserve's cost; merge on his yes (remove `needs-pierre`; the
  body's Decisions and level-1 "Not run further" lines are stale, fix before the train).
- **#1217**, the rules core (B): Pierre's 10:12-10:13 answers (Q428, W20 out, U7's line, the core, S1+L6) applied.
  Trial run 1: the quotes pass T0-T4, the log half of T1/T2 fails because **every hook runs `git show
  origin/main:…`, a silent no-op where `origin/main` does not exist** (one-branch cloud clones: the Bash and agent
  guards off there too). B waits for the hooks fix, then runs 1-3 (proposal §3: T1 and T2 three out of three).
- **Agents running**: the hooks fix (`claude/hooks-no-main`; also whether subagents fire InstructionsLoaded); the fish
  judging rubric from Pierre's gold-set review (11:28-11:43; Q429-Q431 left out).

## Next

1. Q432's answer, then #1099's train. #1217 after the hooks fix and three trial runs; then C (topic files on demand,
   run 2), then D1/D2 (proposal §4; the substance review's §4.6 items not in B: W27's scratch-file names to INTEGRATOR,
   D6 after Q330/Q332, P1 after #1045, L11's method to LEARNING).
2. One engine, step 2; then the admin and Learn one-engine PRs in the order of
   docs/reviews/2026-11-19-admin-one-engine.md.
3. Modes audit: step 3's fix (the `asked()` readers: openPace, the planPhoto due filter, ratedworld.js's copy,
   introReady count only answers after the card; then level 2 again); step 4, the duel achievement on the Again
   (branch `claude/duel-ach-again`, head b8f4016, no PR yet).
4. The judging models measured again on a blind gold set (Pierre answering without seeing any judge's view).
5. LEARNING.md is at its size budget: trim history to the notebook in the next docs PR.

## Questions for Pierre

- **Q429-Q431** (the fish judging rubric, asked ~11:50): Q429 a "contrast" field or a rubric rule (rec. the rule);
  Q430 crops of photos 10 and 23, A the judge proposes and he taps, B it enters cropped on its own when the other fish
  leaves the frame whole (rec. B); Q431 juvenile ease, drop "juvenile = hard" and its 2/5 cap except look-alike
  juveniles (rec. yes; about 3,750 juvenile photos to re-rate).
- **Q432** (#1099, above). Rec. yes.
- Q433: withdrawn (a re-ask of 10:12), never reused.
- Still open in older reviews (check ANSWERS.md first, ask only what is not there): the architecture review (a)-(g),
  (i); the app-gaps review (a)-(j); #1041 §6.

Last question number: Q433

## Pierre's hands

- **GitHub**: a `release` ruleset (Restrict deletions + Block force pushes, as `main`).
- **Roles**: grant himself the trainer role to host a live game.
- **In the admin**: Light and Cover proposals, then Publish; Points; the unsure fish candidates; the 16 non-Philippine
  *A. pyroferus* juvenile photos and `fbAcpyr_j0`.
- Check the analyses token's type and the R2 token's scope; renew the admin GitHub token before late January 2027.

## Parked after hours

- None.

## Last stop

2026-11-19 ~14:30 Manila: handover. Scratchpad: `prstate.sh`, `train_queue.sh`, `uptodate.sh` (merge main into a PR
worktree, regenerate the index, push, ask Codex), `resolve_threads.sh` (CCR REST routes; GraphQL is blocked),
`findmsg.py` (Pierre's messages by fragment, Manila time), `goldset/` (the review page, his answers, the scores),
`res1099/l2/` (level 2's declaration and reports), `rcore/` (the trial's notes). No real names.
