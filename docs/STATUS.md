# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-16, about 08:45 Manila, by the integrator (a checkpoint in the morning session, not an end of day).
**A new integrator starts here, then reads [INTEGRATOR.md](INTEGRATOR.md).**

Last checked: reports and events: 2026-11-16 ~07:48 Manila (none since 11-12 needing action: one `err` "left with a
card open", two "save recovered"; summary given to Pierre)

## Now

Main: sheet script **v152** (#996). Every PR now merges through a train, even alone (#1001, Pierre's own PR).

- **Merged this morning**: sea slugs circle 3 judged, all 100 species (#999 #997 #1002); `faOf` table for the rated
  world, outputs identical (#998, v150); sea slugs in the app as a subject open to an empty beta group (#987, v151;
  its choices taken as integrator's calls, the admin's subject switch becomes the chip menu with three subjects);
  admin To do › Alerts, a deleted, merged or archived account's lines withheld (#996, v152; rule D7, integrator's
  call); `tools/brief.py` pages by hand, so the branches line works again (#1003).
- **Agents running**: sea slugs step 6 (R2 game photos, circles 2 and 3 into the game data; the R2 path off until
  Pierre's go), branch `claude/seaslug-r2-photos`; the admin Reports page for sea slug photos (Codex on #987),
  branch `claude/seaslug-reports`.
- **Held for Pierre** (`needs-pierre`, green): #975 (Q382), #981 (Q383), #953 (Q384), #988 (plain OK). #975 and #988
  conflict with main; #988 also with #987's `app.js`. The second of #981 to merge after #996 adds `readAlerts` to
  `gate_` (#981's source test).
- **Kept on branches, no PR (W27)**: admin-signout-seal, level-count-from-log, fish-todo-wip (moot: delete when Pierre
  says), photo-genus-ability.

## Next

1. Pierre's answers (below), then each held PR: merge `main`, `--assign` for `Code.gs`/`core.js`, Codex, train.
2. Once #975's option is chosen: rework, then its rated-world check at 10,000 answers (#998 makes it fit).
3. Sea slugs: merge step 6 and the Reports page; the first R2 upload once Pierre says go (the PR gives count and MB).
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
- Plain: **#988** coral slot names = current fields; the IMR Lecture 6 and same-group lines to the IMR, the 2 joint
  lines to the sources (rec. yes). **Reference bonus (#942)**: **A** align the 423 photos (rec.) or B leave. **Rule D3
  wording**: "adds or changes" → "adds" (rec. yes).
- Dropped as decided or the integrator's: the sea slug rubric's busy background (fish rubric's practice kept); #959's
  points stay in admin Points (his hands).
- **To read, easy to undo** (integrator's calls in the PR bodies): #976 #980 genus marks; #983 (5), #984 (7), #986,
  #989, #991, #992 (5), #993 (5), #994 (3); #995 changed W3's example; #997, #999, #1002 reading calls; #987 (11).
- Possible misidentifications listed in #982 (5), #989 (11), #991 (24), #1002 (10): for his "Not this" when he wants.
- Not now (Pierre): the domain, the accounts, the IMR agreement, a second person.

Last question number: Q386

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

2026-11-16 ~08:45 Manila: checkpoint (7 merges this morning, 4 PRs held for Q382-Q386, 2 agents on the sea slugs).
Old player-data extracts may remain in the session scratchpad (`data/`): delete them, never commit them.
