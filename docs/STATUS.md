# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-16, about 07:40 Manila, by the integrator (handover: the night session hit its quota at 00:07 and
stopped mid-work). **A new integrator starts here, then reads [INTEGRATOR.md](INTEGRATOR.md).**

Last checked: reports and events: 2026-11-12 ~09:45 Manila

## Now

Main: sheet script **v149** (#995). No agent is running.

- **Merged in the night of 11-15** (16 PRs): genus marks part 2 (#980); sea slugs judged, circles 1 and 2, all 105
  species playable (#978 #982 #989 #991), circle 2 and 3 candidates (#985 #990); fish answers all carry a scoring
  record (#979); sheet overlay step 4, the structure editor, the sheet makes the board tree (#983, v147), step 5, the
  IMR layer as its own files (#984), Photos › Look-alikes lists added pairs (#986); fish Photo stats › Overview (#992,
  v148); Coverage's "+" no longer counts candidates already in play, 17,275 → 824 (#994); watermark pass on the Home
  fallbacks, 158 tagged (#993); Coral ID Key one-shots and `CHOICE` `at` removed (#995, v149).
- **Open, ready, not merged (stopped by the quota; each needs a check, then the train)**:
  - #999 and #997: sea slug circle 3 judging, parts 1 (species 1-34) and 2 (35-67). Check CI, Codex and the body's
    "Choices I made" (move easy ones to integrator's calls, as #989 and #991), then train.
  - #998: `faOf` speed-up for the rated world, same values (core.js: `--assign` v150 at merge). Check the identity
    proof in its body before merging; its agent stopped before reporting.
  - Circle 3 part 3 (species 68-100) was never started (its agent hit the limit at once): relaunch it as #999's brief.
- **Held for Pierre** (`needs-pierre`, green): #975, #981, #987, #988, #996, #953 (questions below).
- **Kept on branches, no PR (W27)**: admin-signout-seal, level-count-from-log, fish-todo-wip (moot: delete when Pierre
  says), photo-genus-ability, time-weighted-steps.

## Next

1. Merge #997, #999, #998 (above); relaunch circle 3 part 3.
2. Pierre's answers on the held PRs, then merge them one at a time (`--assign` for each `Code.gs`/`core.js` one).
3. Once #975's option is chosen: the rated-world check at 10,000 answers (needs #998).
4. Sea slugs after #987: step 6 (R2 game photos, `fish_game.py` generalised; the upload waits for Pierre's go),
   circle 2 into the game data, the admin Reports page for sea slug photos.
5. The other ROADMAP "Next" rows. Deadline: the domain and repository rename before December 2026 (#886).

## Questions for Pierre

- **#975 species level**: as built it breaches rule L11 in both worlds (rated, 3,000 answers: families at Advanced −8 to
  −22, fish right % −1.3 to −6.7: a loss, not a delay). Options (families at Advanced at 600, lecture/strong/expert;
  main 4.4/9.6/11.2): **B** next species only once each one met is at Open Water, 3.8/6.8/8.0 (rec.); C shaky 10 +
  20% cap; D from the family's Divemaster; E no species while a family is below Advanced. Agent's calls to confirm: the
  `famAdv` guardrail, ±3 / +0.05 bounds.
- **#981 roles step 1**: the Roles and Audit tabs' format; the admin token passes every right (against Q364 B?); reads
  not audited; his three grants seeded at the first admin read. Q: may a role holder call the endpoints by name + code?
  (agent: not before the trainer or relay step).
- **#988 overlay step 8, corals**: [format] coral slot names = `data.json` fields, a pair's words = its `lsrc` lines;
  whose are the 14 "Same IMR lecture group" and 2 joint lines (the IMR / Coral Finder pairs split)?
- **#987 sea slugs in the app**: choice 11 turns his one-click admin subject switch (his ask, 11-08) into the chip menu
  with three subjects. Group empty, photos from iNaturalist until step 6.
- **#996 Alerts page**: Codex P1, alert lines keep a deleted or merged account's admin id (D7): (a) as built plus a
  ROADMAP row, or (b) `readAlerts_` withholds those lines. The second of #981/#996 to merge adds `readAlerts` to `gate_`.
- **#953 juveniles**: N=5? exempt class-A juveniles? the heavy-tail breach.
- **Sea slug rubric**: "busy background" has no tag: add a flag or drop it. Pierre's own photos first (as fish P1)?
- **Held-out fish set (#962)** (a)-(e), all as recommended? **Reference bonus** (#942): align 423 photos or leave.
  **Points** (#959): Diploprion; Ferdauia. **Rule D3 wording**: "adds or changes" → "adds".
- **To read, easy to undo** (integrator's calls in the PR bodies): #976 #980 genus marks; #983 (5), #984 (7), #986,
  #989, #991, #992 (5), #993 (5), #994 (3); #995 changed W3's example (`migrateIdKey` → `migrateRoutes`).
- Possible misidentifications listed in #982 (5), #989 (11), #991 (24): for his "Not this" when he wants.
- Not now (Pierre): the domain, the accounts, the IMR agreement, a second person.

Last question number: Q381

## Pierre's hands

Actions only Pierre can do.

- **pCloud backup**: Apps Script › Project settings › Script properties › add `PCLOUD_UPLOAD_CODE` (the part after
  `code=` of his upload link); reload the sheet; Reef ID › Back up to pCloud now (`docs/BACKUP.md`).
- **In the admin**: Light proposals (incl. 38 "One judgement per photo"), Cover proposals, then Publish; "Juvenile:
  confirm as cover?" on Damselfishes and Boxfishes; "Watermark: keep as cover?" for the 4 ★ covers and the
  Scorpionfishes one (`fish-s372-cand-57834053`, "(c) Dan Schofield", found by #993).
- **For an IMR trainer**: the three Q354 points in `points.json` (admin Points).
- Check the "Coral ID analyses" token's type and the R2 token's scope; restrict the Coral Finder PDF's sharing.
- From before: "CF book: off" + Publish; one player's start back to "I'm at IMR" (Q228); the 8 unsure fish candidates;
  covers for the 11 fish entries with no reference-level photo; Astrea and Anacropora photos; **protect `main`**; renew
  the admin GitHub token before late January 2027; the IMR benthic deck.

## Parked after hours

Ideas Pierre dictated after 17:30, kept for the morning.

- None.

## Last stop

2026-11-16 ~07:40 Manila: handover after the night run (16 merges, 6 PRs held, 3 ready) stopped on the quota at
00:07. Old player-data extracts may remain in the session scratchpad (`data/`): delete them, never commit them.
