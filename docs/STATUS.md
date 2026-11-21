# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version, whether the local `origin/main` is
the remote's) is printed by `python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.
**Pierre's answers live in [ANSWERS.md](ANSWERS.md)** (append-only historical evidence: a hit is checked for its scope,
later amendments and whether it still applies, AGENTS.md "Every answer reaches its doc"). This file only cites answers.

**Start here: the [Project Home](https://linear.app/reef-id/document/project-home-reef-id-d5a0fef1ecbc)** (Linear): where
each kind of information lives. **The work is tracked in Linear**, team REE (Pierre, 2026-11-21 14:41;
[INTEGRATOR "Linear"](INTEGRATOR.md#linear)): [active](https://linear.app/reef-id/team/REE/active),
[backlog](https://linear.app/reef-id/team/REE/backlog), [projects](https://linear.app/reef-id/projects/all). Substantial
new studies go to the Drive folder [Reef_ID](https://drive.google.com/drive/folders/1EHqtC9iINaYrb0zalE7FpX1F01DrskIp).
A subject not transferred yet keeps its [ROADMAP.md](ROADMAP.md) row. This file keeps the active discussion and the
handover.

Written 2026-11-21, about 21:00 Manila, by the integrator, after hours (Rule 0: nothing asked since 17:30). **A new
integrator starts here, then reads [INTEGRATOR.md](INTEGRATOR.md).**

Last checked: reports and events: 2026-11-21 ~18:20 Manila (an RA's 3 reports, all handled: REE-190). Linear comments:
REE-181 (ChatGPT's handoff, answered 16:38).

## Active discussion

- **An RA's session of 2026-11-21** (Pierre 18:12-18:17, ANSWERS): the quiz keeps its question (#1375, live), the
  near-repeat photos (#1376, #1379, live; the draw's cliff REE-197 in progress), her reports and the iNaturalist audit
  ([review](reviews/2026-11-21-ra-session-review.md), #1374; the weekly photo re-check #1377). Open: **pace for fast
  learners** (REE-191, a study) and the **placement test** (REE-112: today's ratings not precise enough,
  [check](reviews/2026-11-21-placement-shrinkage-check.md), #1380).
- **How Pierre and the agents work** (project "Working method and project tracking"): Linear (#1360), answers as
  evidence (#1361), the brief's freshness line (#1363), the response-time note (#1362), the continuity study filed
  (#1364), the Project Home and the Drive route verified. Open: the first real study in Drive (REE-181); where
  simulations decide (REE-71). Slack dropped (16:10). ChatGPT and the integrator write to each other in Linear comments,
  signed; read a subject's comments when resuming it (no wake-up).
- **Response time** ([current understanding](reviews/2026-11-21-response-time-understanding.md)): step 1 live (v213);
  step 2 next (REE-16), its implementation choices open, the direction (Q452) decided.

## Now

Main: sheet script **v214** (#1369, "Fin to tail"). Running: REE-197 (the draw's RARE.FEW cliff, then judging 387
waiting fish candidates). Nothing else runs; no open PR. Merged today: about 75 PRs (`git log`).

Went live tonight (tell Pierre in one line each, information only): the quiz keeps its question (#1375); fewer repeated
photos and 125 new photos for thin fish families (#1376, #1379); the "Did you know?" tip on look-alike duels (#1370);
Fish basics earns "Fin to tail" (#1369); one Learn list and sheet frame for every subject, HTML identical (#1378).

## Next

Ready issues in Linear (Todo, High first). In order: REE-197's judging pass; REE-16 (response time step 2, `core.js`);
REE-112 part 1 (build the placement test behind its gate); REE-186 (Tree tab's rest); REE-184, REE-196 (flaky waits);
REE-13 tip (c); REE-14's rest (sheet parts; the sea slugs' `build()` onto `in_play`).

## Questions for Pierre

Ask after his first message after 04:00, in one batch, in French; each issue holds the context (label "Decision for
Pierre"):

- **REE-194**: 9 fish photos whose iNaturalist identification changed (recommend: exclude 5, move or exclude 4), a
  replaced Diploastrea photo (exclude), 8 coral photos the fetch rule would refuse (keep his own 6, exclude 2 Tubipora),
  11 photos other players also miss (look in the admin). Ask the RA which genus she meant ("Issabstria").
- **REE-112**: the placement test: recommend a coordinated RA playing week, not a lower bar.
- **REE-192** (a numbered question, the next Q): Q316's fish genus/species spreads not estimable, recommendation A.
- **REE-198**: refill by most-faved first for species short of easy photos (recommend yes, only those).
- **REE-6**: R2 holds only 2 unused objects (36 KB); recommend deleting those two, keeping the rest.
- **REE-70** (asked 15:35, no answer): the new-RA review's two options, recommend (b) for both.
- **REE-7 (Q439)**, **REE-71**: when he has tested the Lab / reviews the working method.
- One choice to confirm when he looks at #1354: "Delete, keep answers" also deletes the account's report images.

Last question number: Q452

## Pierre's hands

Assigned to him in Linear (REE-8, REE-72 to REE-75, REE-194): gold set 2 (42 photos); a `release` ruleset and the stray
branch `claude/autosort-followups`; the trainer role for a live game; his curation waiting in the admin (one reminder,
REE-74); the admin GitHub token before late January 2027; the photos of REE-194 in the admin.

## Parked after hours

- The questions above (Rule 0).

## Last stop

2026-11-21 ~09:00 Manila, at Pierre's stop (06:25); work resumed at his 14:41 request and ran through the evening.
Queue tooling: `tools/queue/` (README there). No real names.
