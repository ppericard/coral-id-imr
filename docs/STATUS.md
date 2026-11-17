# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-17, about 10:05 Manila, by the integrator (a morning checkpoint; the container restarted twice).
**A new integrator starts here, then reads [INTEGRATOR.md](INTEGRATOR.md).**

Last checked: reports and events: 2026-11-17 ~06:15 Manila (none needing action; the roles seeded at v156, the
admin grant's Audit row missing: fixed for the future in #1026)

## Now

Main: sheet script **v160** (#1032). Every PR merges through a train, even alone (#1001).

- **Merged on 11-17 morning**: the roles seed's audit gap (#1026, v159); **research uses every useful source**, the
  project's data never leaves (#1027, AGENTS.md, Pierre 06:33-06:37); the undescribed sea slugs study (#1028, Q389);
  the sea slugs' look-alike survey, candidates only (#1029, Q390 open); their English names and nicknames as
  information (#1030); the literature scan and `tools/seaslug_lit.py` (#1031); genus-level candidates and
  *Goniobranchus* sp. 5 (#1032, v160, Q389); all 794 new sea slug candidates judged (#1034, #1035: ~775 in play).
- **Agent running**: the levels-and-shares study (#1033): the 10,000-answer check (its rule / #975 / main), rerun after the
  restarts, and Codex's P1/P2 on the note (P2: should "Learned" need a right answer on each variant?).
- **Held for Pierre** (`needs-pierre`, green): #975 and #953 (Q391, waits for #1033's long check); #988 (plain OK).
- **Kept on branches, no PR (W27)**: admin-signout-seal, level-count-from-log, fish-todo-wip (moot: delete when Pierre
  says), photo-genus-ability; `scratch/levels-proto` (local only, the study's prototype). Suggested task: check
  admin.js's GitHub API header in a real browser (CORS).

## Next

1. #1033's long check in: send Pierre Q391 with the numbers and the variant sub-question; on his yes, #975 (merge
   `main`, `--assign` its `SPECIES_SHEET` gate, Codex, train), then #953 rebuilt on that rule, then the held-out set wired
   (#1023's paragraph), each with L11 checks.
2. Sea slugs: Q390 answered → the look-alikes into play by its rule; "Pikachu" → the names file; the literature
   watch's proposed points (#1031) into `points.json`. Watch: Gosliner et al. 3rd edition (ISBN 978-1-878348-73-9,
   preorder 11-2026) renumbers the "sp. N".
3. On Pierre's go: the licence review of the three subjects for a commercial app (sea slugs: 87% CC BY-NC; top 20
   photographers hold 55% of those) and a draft permission request.
4. Judging passes as candidates arrive; the other ROADMAP "Next" rows; the rename before December 2026 (#886).

## Questions for Pierre

Answered on 11-17: Q389 (1) genus-level photos yes, (2) *G.* sp. 5 yes, the other "sp. N" wait for a published name
(the 2018 guide is a DRM ebook and dated); web research without asking (#1027). Q388 was withdrawn: Pierre wants one
mechanism for every level (06:26), now Q391.

Still open:

- **Q391** (after #1033's long check): one rule (the study's recommended one) for ranks and variants (#975's cap for genera/species; each unit's
  juveniles, sexes and phases on a ramp of its own mastery, thresholds per taxon), a slower player's first family at
  Open Water later; plus: "Learned" needs a right answer on each variant?
- **Q390** sea slug look-alikes: D (specialist-sourced pairs declared; iNaturalist-only pairs as data, droppable by
  answers; species pairs at the species level) (rec.), B one by one, C literature only.
- Plain: **rule C8** wording for undescribed species (3 observers with the label, #1032); **"Pikachu"** to *T.
  pikachu* (rec.); **licence review** go?; the Learn page of the sea slugs (sent 06:13); **Cladobranchia** WoRMS (rec.);
  **#988**; **reference bonus (#942)** A (rec.); **rule D3** "adds"; **rule P1** covers the sea slugs; the IMR fish
  presentation's location (Fish basics).
- **To read, easy to undo** (integrator's calls in the PR bodies): #976 #980 genus marks; #983 (5), #984 (7), #986,
  #989, #991, #992 (5), #993 (5), #994 (3); #995; #997, #999, #1002, #1008, #1009, #1015, #1019, #1034, #1035 reading
  calls; #987 (11); #1012, #1013, #1030 layouts.
- Possible misidentifications in #982 (5), #989 (11), #991 (24), #1002 (10), #1008 (1), #1034 (5), #1035 (18).
- Not now (Pierre): the domain, the accounts, the IMR agreement, a second person.

Last question number: Q391

## Pierre's hands

Actions only Pierre can do.

- **pCloud backup**: Apps Script › Project settings › Script properties › add `PCLOUD_UPLOAD_CODE` (the part after
  `code=` of his upload link); reload the sheet; Reef ID › Back up to pCloud now (`docs/BACKUP.md`).
- **In the admin**: Light proposals (incl. 38 "One judgement per photo"), Cover proposals, then Publish; "Juvenile:
  confirm as cover?" on Damselfishes and Boxfishes; "Watermark: keep as cover?" for the 4 ★ covers and the
  Scorpionfishes one (`fish-s372-cand-57834053`, "(c) Dan Schofield", found by #993); Points: Diploprion, Ferdauia
  (#959), the sea slugs' name and taxonomy points (#1020, #1030). Roles (#981): seeded; test in use.
- **For an IMR trainer**: the three Q354 points in `points.json` (admin Points).
- Check the "Coral ID analyses" token's type and the R2 token's scope; restrict the Coral Finder PDF's sharing.
- Name the unnamed devices in admin Players › Visits if he wants.
- From before: "CF book: off" + Publish; one player's start back to "I'm at IMR" (Q228); the 8 unsure fish candidates;
  covers for the 11 fish entries with no reference-level photo; Astrea and Anacropora photos; **protect `main`**; renew
  the admin GitHub token before late January 2027; the IMR benthic deck.

## Parked after hours

Ideas Pierre dictated after 17:30, kept for the morning.

- None.

## Last stop

2026-11-17 ~10:05 Manila: morning checkpoint (10 merges since 06:00, the study agent running, 3 PRs held).
Old player-data extracts may remain in the session scratchpad (`data/`): delete them, never commit them.
