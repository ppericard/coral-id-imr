# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-16, about 19:10 Manila, by the integrator (the night checkpoint; no agent running).
**A new integrator starts here, then reads [INTEGRATOR.md](INTEGRATOR.md).**

Last checked: reports and events: 2026-11-16 ~07:48 Manila (none since 11-12 needing action: one `err` "left with a
card open", two "save recovered"; summary given to Pierre)

## Now

Main: sheet script **v158** (#1024). Every PR merges through a train, even alone (#1001, Pierre's own PR).

- **Merged on 11-16** (29 PRs, #997-#1024 and #981): the morning's list is in the 11:35 STATUS (git history); since
  then: STATUS (#1014); 16 fish candidates (#1015); sea slug **R2 on** (#1016, Q387) and its first run (2,465 photos
  on R2, 0 failed); Pierre's own sea slug photos by the fish's rule (#1017, Q386: 116 added, 111 of them Research
  Grade his search now takes first) and judged (#1019, 74 new photos in play, uploaded by the Candidate photos run
  it triggers); two smokes made stale by R2 fixed (#1018); **roles step 1** (#981, Q383 A, v156, `readAlerts` in
  `gate_`: Pierre tests it in use); sea slugs **genera as the game units** (78) and the Learn page **WoRMS group →
  family → genus** (#1020, v157; his decisions of 15:00-15:45); STATUS (#1021); 3 fish dups (#1022); the **held-out
  set's data side** (#1023: per species, 10% ≥5, 8 kept: 3,232 observations, not wired yet); the sea slugs' heatmap
  (#1024, v158).
- **Held for Pierre** (`needs-pierre`, green): **#975** reworked on Q382 (the rank share `model.js` `SHARE`, cap m² of
  the parent level at Advanced; Q388 below); #953 (redo on #975's mechanism, Q384); #988 (plain OK).
- **No agent running.**
- **Kept on branches, no PR (W27)**: admin-signout-seal, level-count-from-log, fish-todo-wip (moot: delete when Pierre
  says), photo-genus-ability. Suggested task: check admin.js's GitHub API header in a real browser (CORS).

## Next

1. Morning: send Pierre the Learn page screenshots of #1020 (info, easy to correct: the session scratchpad
   `shots-seaslug-genera/`, else retake), Q388 and the plain questions below.
2. Q388 answered: #975 merge `main`, `--assign` (its `SPECIES_SHEET` gate), Codex, train; then #953 redone on its
   mechanism (Q384) and the held-out set wired into the draw and the exam (#1023's paragraph), each with L11 checks.
3. Judging passes as candidates arrive (the Candidate photos refills); `judging_fish.py todo` (fish, `--subject seaslug`).
4. The other ROADMAP "Next" rows. Deadline: the domain and repository rename before December 2026 (#886).

## Questions for Pierre

Answered on 11-16 (quote in the PRs): **Q382** (15:05) a share of questions per rank set by the mastery of the ranks
above, not one at a time; **Q383** A, he tests it; **Q384** the same global mechanism, juveniles possibly early,
thresholds per family, genus or species; **Q385** yes, granularity left to the integrator; **Q386** A (as the fish);
**Q387** A (R2 at ~7-8 GB of the 10 GB free: warn him before any next big upload). Sea slugs: genera, not families
(15:00); Learn grouped by family and taxonomic group, Nudibranchia (Doridina, Cladobranchia) first (15:43-15:45).

Still open, for the morning:

- **Q388 #975 at m²** (the share of genus and species questions ≤ (share of the parent level at Advanced)²): the
  families' loss is gone (Advanced at 3,000: ~30 for every profile, main 21-32), fish % at 10,000 +0.6 to +9.8 for
  three profiles; costs: beginner and lecture RA −1.8/−1.6 points at 10,000, strong RA −1.2 at 3,000, genera later
  (Q382's intent). Ship at m²? (rec. yes; the PR's tables).
- **Cladobranchia** (#1020, `points.json` `seaslug-cladobranchia-inat`): WoRMS keeps one Cladobranchia group, iNaturalist
  splits its 15 families into five suborders; the Learn page follows WoRMS (once, W10).
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

Last question number: Q388

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

2026-11-16 ~19:10 Manila: night checkpoint (29 merges, no agent running; #975, #953 and #988 held for the morning).
Old player-data extracts may remain in the session scratchpad (`data/`): delete them, never commit them.
