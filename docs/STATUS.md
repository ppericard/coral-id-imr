# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-16, about 17:45 Manila, by the integrator (an evening checkpoint; the session goes on, Rule 0 holds).
**A new integrator starts here, then reads [INTEGRATOR.md](INTEGRATOR.md).**

Last checked: reports and events: 2026-11-16 ~07:48 Manila (none since 11-12 needing action: one `err` "left with a
card open", two "save recovered"; summary given to Pierre)

## Now

Main: sheet script **v156** (#981). Every PR merges through a train, even alone (#1001, Pierre's own PR).

- **Merged on 11-16** (24 PRs, #997-#1019 and #981): the morning's list is in the 11:35 STATUS (git history); since
  then: STATUS (#1014); 16 fish candidates (#1015); sea slug **R2 on** (#1016, Q387) and its first run (2,465 photos
  on R2, 0 failed); Pierre's own sea slug photos by the fish's rule (#1017, Q386: 116 added, 111 of them Research
  Grade his search now takes first) and judged (#1019, 74 new photos in play, uploaded by the Candidate photos run
  it triggers); two smokes made stale by R2 fixed (#1018); **roles step 1** (#981, Q383 A, v156, `readAlerts` in
  `gate_`: Pierre tests it in use).
- **Agents running**: (1) sea slugs: **genera as the game units**, the Learn page **taxonomic group → family → genus**
  (Pierre 15:00-15:45, his grouping "parfait !"), PR #1020; (2) **#975 reworked on Q382's answer**: one global
  mechanism, the share of questions at each rank set by the mastery of the ranks above (no "one at a time"); built to
  take the phases next (Q384), with two-world checks and the 10,000-answer rated run.
- **Held**: #953 (redo on #975's mechanism, Q384), #988 (plain OK), both `needs-pierre`.
- **Kept on branches, no PR (W27)**: admin-signout-seal, level-count-from-log, fish-todo-wip (moot: delete when Pierre
  says), photo-genus-ability. Suggested task: check admin.js's GitHub API header in a real browser (CORS).

## Next

1. #1020 and #975: check, `--assign` where `Code.gs`/`core.js` change, Codex, train. Send Pierre the Learn page
   screenshots of #1020 (in the morning: a visual check is a question).
2. After #975: #953 redone on its mechanism (juveniles and phases per family/genus/species, juveniles early: Q384);
   the held-out set (Q385: granularity the integrator's call, e.g. per species where a family has species units).
3. The sea slugs' next judging pass if candidates wait; 3 fish candidates in 2 species wait (the refill).
4. The other ROADMAP "Next" rows. Deadline: the domain and repository rename before December 2026 (#886).

## Questions for Pierre

Answered on 11-16 (quote in the PRs): **Q382** (15:05) a share of questions per rank set by the mastery of the ranks
above, not one at a time; **Q383** A, he tests it; **Q384** the same global mechanism, juveniles possibly early,
thresholds per family, genus or species; **Q385** yes, granularity left to the integrator; **Q386** A (as the fish);
**Q387** A (R2 at ~7-8 GB of the 10 GB free: warn him before any next big upload). Sea slugs: genera, not families
(15:00); Learn grouped by family and taxonomic group, Nudibranchia (Doridina, Cladobranchia) first (15:43-15:45).

Still open (plain, for the morning):

- **Where is the IMR fish presentation** (for Fish basics, a Lab prototype)?
- **#988** coral slot names = current fields; the IMR Lecture 6 and same-group lines to the IMR, the 2 joint lines to
  the sources (rec. yes). **Reference bonus (#942)**: **A** align the 423 photos (rec.) or B leave. **Rule D3
  wording**: "adds or changes" → "adds" (rec. yes). **Rule P1 wording**: his own photos' rule now covers the sea slugs
  too (Q386): the line to say so, for his OK.
- **To read, easy to undo** (integrator's calls in the PR bodies): #976 #980 genus marks; #983 (5), #984 (7), #986,
  #989, #991, #992 (5), #993 (5), #994 (3); #995 changed W3's example; #997, #999, #1002, #1008, #1009, #1015, #1019
  reading calls; #987 (11); #1012, #1013 layouts.
- Possible misidentifications listed in #982 (5), #989 (11), #991 (24), #1002 (10), #1008 (1): for his "Not this".
- Not now (Pierre): the domain, the accounts, the IMR agreement, a second person.

Last question number: Q387

## Pierre's hands

Actions only Pierre can do.

- **pCloud backup**: Apps Script › Project settings › Script properties › add `PCLOUD_UPLOAD_CODE` (the part after
  `code=` of his upload link); reload the sheet; Reef ID › Back up to pCloud now (`docs/BACKUP.md`).
- **In the admin**: Light proposals (incl. 38 "One judgement per photo"), Cover proposals, then Publish; "Juvenile:
  confirm as cover?" on Damselfishes and Boxfishes; "Watermark: keep as cover?" for the 4 ★ covers and the
  Scorpionfishes one (`fish-s372-cand-57834053`, "(c) Dan Schofield", found by #993); Points: Diploprion, Ferdauia
  (#959). Roles (#981): open the admin once the sheet runs v156, so his three grants are seeded; then test.
- **For an IMR trainer**: the three Q354 points in `points.json` (admin Points).
- Check the "Coral ID analyses" token's type and the R2 token's scope; restrict the Coral Finder PDF's sharing.
- Name the unnamed devices in admin Players › Visits if he wants (two fish devices may be the new RA row).
- From before: "CF book: off" + Publish; one player's start back to "I'm at IMR" (Q228); the 8 unsure fish candidates;
  covers for the 11 fish entries with no reference-level photo; Astrea and Anacropora photos; **protect `main`**; renew
  the admin GitHub token before late January 2027; the IMR benthic deck.

## Parked after hours

Ideas Pierre dictated after 17:30, kept for the morning.

- None.

## Last stop

2026-11-16 ~17:45 Manila: evening checkpoint (24 merges, 2 agents running, #953 and #988 held).
Old player-data extracts may remain in the session scratchpad (`data/`): delete them, never commit them.
