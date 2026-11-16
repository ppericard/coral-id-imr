# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-16, about 11:35 Manila, by the integrator (a checkpoint in the day session, not an end of day).
**A new integrator starts here, then reads [INTEGRATOR.md](INTEGRATOR.md).**

Last checked: reports and events: 2026-11-16 ~07:48 Manila (none since 11-12 needing action: one `err` "left with a
card open", two "save recovered"; summary given to Pierre)

## Now

Main: sheet script **v155** (#1012). Every PR merges through a train, even alone (#1001, Pierre's own PR).

- **Merged on 11-16** (until ~11:30): sea slugs circle 3 judged, all 100 species (#999 #997 #1002); `faOf` table for
  the rated world, outputs identical (#998, v150); sea slugs in the app, empty beta group (#987, v151; the admin's
  subject switch becomes the chip menu with three subjects, told to Pierre); circles 2-3 in the sea slug game data and
  the R2 step built, **off** (`SEASLUG_R2` in approved-photos.yml) until Q387 (#1005); admin Reports shows sea slug
  photos (#1006, v153); To do › Alerts, D7 lines withheld (#996, v152); fish judged: 88 candidates (#1008) and the 28
  reference photos left (#1009); `brief.py` pages by hand (#1003); the unit tests take the slot themselves (#1007);
  the docs identifier check (#1010); stack: Prettier 3.10.1, Playwright 1.65.1, rclone 1.76.0 (signature checked),
  GitHub API 2026-03-10 in `Code.gs` only (#1011, v154; admin.js waits for a browser CORS check, a suggested task);
  fish heatmap (#1012, v155) and per-player heatmaps (#1013).
- **No agent running.** 16 new fish candidates in 8 species wait for a judging pass (the refill of 11-16).
- **Held for Pierre** (`needs-pierre`, green): #975 (Q382), #981 (Q383), #953 (Q384), #988 (plain OK). #975 and #988
  conflict with main; #988 also with #987's `app.js`. The second of #981 to merge after #996 adds `readAlerts` to
  `gate_` (#981's source test).
- **Kept on branches, no PR (W27)**: admin-signout-seal, level-count-from-log, fish-todo-wip (moot: delete when Pierre
  says), photo-genus-ability.

## Next

1. Pierre's answers (below), then each held PR: merge `main`, `--assign` for `Code.gs`/`core.js`, Codex, train.
2. Once #975's option is chosen: rework, then its rated-world check at 10,000 answers (#998 makes it fit).
3. Sea slugs: Q387 yes → a one-line PR sets `SEASLUG_R2: 'on'` (2,465 photos, ~670-870 MB), then dispatch Candidate
   photos. Fish basics waits for the IMR fish presentation's location (asked).
4. The other ROADMAP "Next" rows. Deadline: the domain and repository rename before December 2026 (#886).

## Questions for Pierre

Asked in the chat on 2026-11-16 ~08:00 Manila, with context and recommendations:

- **Q382 #975 species level**: A as built (a loss in both worlds), **B** next species only once each one met is at
  Open Water (rec.), C shaky 10 + 20% cap, D from the family's Divemaster, E none while a family is below Advanced.
- **Q383 #981 roles step 1**: the Roles and Audit tabs' format, the admin token passes every right, his three grants
  seeded at the first admin read, reads not audited: **A** as built (rec.) or B.
- **Q384 #953 juveniles**: (a) delay A 10 or **B 5** (rec.); (b) his "easy" juveniles of 11-04 **exempt** (rec.) or held.
- **Q385 held-out fish set (#962)**: 10% per family and genus (min 5), never his nor reference photos, unannounced,
  own file: yes (rec.).
- **Q386 his own sea slug photos**: **A** the fish's rule (in play even Needs ID, never boosted; rec.) or B Research
  Grade only as now.
- **Q387 sea slug photos to R2** (asked ~09:00): **A** yes (rec.; 2,465 photos, ~670-870 MB, one run) or B not yet.
- Plain: **where is the IMR fish presentation** (for Fish basics, a Lab prototype)? **#988** coral slot names = current fields; the IMR Lecture 6 and same-group lines to the IMR, the 2 joint
  lines to the sources (rec. yes). **Reference bonus (#942)**: **A** align the 423 photos (rec.) or B leave. **Rule D3
  wording**: "adds or changes" → "adds" (rec. yes).
- Dropped as decided or the integrator's: the sea slug rubric's busy background (fish rubric's practice kept); #959's
  points stay in admin Points (his hands).
- **To read, easy to undo** (integrator's calls in the PR bodies): #976 #980 genus marks; #983 (5), #984 (7), #986,
  #989, #991, #992 (5), #993 (5), #994 (3); #995 changed W3's example; #997, #999, #1002, #1008, #1009 reading calls;
  #987 (11); #1012, #1013 layouts.
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
  (#959).
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

2026-11-16 ~11:35 Manila: checkpoint (17 merges, 4 PRs held for Q382-Q387, no agent running).
Old player-data extracts may remain in the session scratchpad (`data/`): delete them, never commit them.
