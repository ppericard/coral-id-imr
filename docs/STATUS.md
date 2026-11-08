# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-09, about 00:15 Manila, by the integrator, during the night (Rule 0: the morning report). **A new
integrator starts here, then reads [INTEGRATOR.md](INTEGRATOR.md)** (how the work is run, what bites, the open work).

Last checked: reports and events: 2026-11-08 ~07:20 Manila (4 fish reports on 11-07; events: "Can't find variable: shownGroup" twice on 11-06 on one device, one "left with a card open" on the Scientific names offer on 11-07, two saves failed and not recovered)

## Now

Fish is open to every player (beta). Main: sheet script **v112**. **Merges stopped since 23:35 Manila (15:35 UTC)**:
Codex reached its usage limit (code review and security review); the merge contract wants Codex on every head (Q314).

- **Waiting, all green** (17/17 checks, 2026-11-09 00:10), no Codex review of their heads: #793 rotate a photo, #794 fish
  Analyses, #795 rights badges, #796 #797 #802 #803 fish judging (Blennies, Gobies), #798 admin low items, #799 lighter
  saves, #800 fish Stops and Health, #801 security follow-ups. **#769** (learnsim): Codex-clean, a draft (Pierre's hands).
- **Code.gs PRs, one per train**: #794 (before #800: a small `core.js` conflict), #799, #800, #801, each versioned by
  `tools/sheet_version.py --assign` at its turn: their gates (all 113 tonight) become 113, 114… in merge order.
- **Merged tonight** (`git log`): #756-#759, #766-#768, #770-#792 (#760-#765 closed into #766): merge speed (Q305; CI
  209 s -> 134 s), fish rubric 6 and 4,120 candidates judged (Q308, Q311), the 17 new families live, sheet v109-v112
  (device id Q312, live Activity, the fish replay Q310), Visits (Q301-Q304), reports bar (Q309), common names (Q313),
  ID marks of 40 families, install nudge, the 7 L11 tools, iNaturalist batching, #790 (the #664 re-check's bug).

## Next

This morning: Q314, then the waiting PRs land; the Reports and Events tabs read since 11-08 07:20; then ROADMAP "Backlog in priority order".

## Questions for Pierre

Numbered for good (never reset) only when the answer commits the future and will be cited later (AGENTS.md "Working
mode", Pierre 2026-11-08); the others are asked plainly. An answered one goes into its PR and off this list.

- **Q314** Codex's usage limit (15:35 UTC 11-08) blocks merges: (a) credits, (b) wait, (c, recommended) a Claude reviewer.
- **Q315** Time in the photo rating (ROADMAP row): (1) the genus offset's step too, (2) a time term in `photoDiff`,
  (3) enlarged as a small extra, or none. Recommended: (2), the measure supports it (Holm 0.003), at L11 level 2.
- **Q317** L11 breach (#790 live, #805): without the corals' memory offsets the fish beginner's flat stretch is +11
  (50 → 61). Keep (recommended: the log backs it, 92% right on seen photos) or fit fish offsets? `PFMT` leaks too.
- **Q208** (set aside 11-08): families not met before the scientific genera, or genera on their own pace? **Q230**
  out-of-zone taxon-page photos: waits for real arguments.
- **Q316** (C1, #664's F8) fish photo ratings per rank: (A) one per (photo, rank), or (B, recommended) one per photo
  plus a fitted rank offset (Q136 with it). Not numbered: **Show the species after a family or genus answer**
  (species, common and scientific name, right or wrong; Pierre ~20:10): before the species level? **#641 a-j** (F7 =
  j) and #651's 5 choices; **Q123, Q124** asked again. Apply the **152 curated tag and ease proposals**
  (`judging/fish-light-q308.json` "curation", 105 flash n -> g) in the admin? A **stopgap `fish-photos.json`** so
  unjudged species show remote photos meanwhile (~10,100 candidates in 468 species unjudged)? The **R2 crop
  workflow**: done? **Rule D5**, a one-line change for his OK: "adds an entry at the end of the subject's rules
  versions (`core.js` `RVS` for the corals, `FISH_RVS` for the fish)". **Eel-tailed catfishes** (parked below): what
  he wants from it. Re-read the **Q305 rule texts** (#757 Decisions) and #758's W12/W14 wording.
- FYI. Delegated tonight, to check in use: Visits (#777: device rows with installed / browser and "not known", a
  two-subject visit on each side, one row per Lab page), the reports bar, Home's header switch, the privacy text, the
  install nudge (#768: 10 answers = a session, a visit = a 30-min gap, every touch screen, Home only, a ⚙ Settings row,
  any close ends it). Rule C7's pointer to a deleted ROADMAP row now reads "Every tool goes through `tools/inat.py`, one
  paced, retried client (#784)." Without species units, a player who declines scientific names plateaus at 50% once
  the families are mastered (rated world). Eagle rays and Cat sharks have no species near Dauin: not in play.
- Answered 11-08: Q121 / Q300 the rewrite; Q301-Q304 Visits (#777); Q305 a, b, d, not c (#757); Q306, Q307 (#753);
  Q308 fish light g / d / n (#759); Q309 reports bar (#785); Q310 fish replay, today's bar a floor (#776, #779); Q311
  fish batches (#766, #780, #781); Q312 device id on answers (#774); Q313 fish common names, corrected in use (#778).

Last question number: Q317

## Pierre's hands

Actions only Pierre can do.

- **#769: click "Ready for review"** (the session's permission classifier refused it three times).
- **Drop the Coral Finder crops from R2** (Actions > "Drop the book crops from R2", dry run first; HANDOVER "Coral Finder
  book crops on R2"); **delete his rewrite backup** when he says so; restrict the Coral Finder PDF's sharing on his Drive.
- From before: "CF book: off" + Publish; one player's starting answer back to "I'm at IMR" with #726 (Q228); delete the
  morning report scheduled task from claude.ai; the 8 unsure fish candidates and the expert analyses' photos (11-06);
  genus common names without a source (Cephalopholis, Centropyge, Dendrochirus, Dascyllus), if he wants them; covers for
  the 11 fish entries with no reference-level photo (Barracuda, Seamoths, Scorpionfishes, Flying gurnards, Stargazers,
  Snake eels, Garden eels, Rays, Reef sharks, Whale shark, Thresher sharks).
- **Astrea and Anacropora**: a photo hunt at the Dauin sites IMR trainers know; pre-sort the near-Dauin observations left
  above genus (links: `git show 4c8251a:docs/STATUS.md`); show the Astrea question to a trainer (To do › Points). To do ›
  Out of the presence rule, the 14 share-alike coral photos, more photos for the thinnest genera (Coverage › Thinnest).
- **Protect `main`**, **clean merged branches** (HANDOVER); archive tags `f46f11c` (`archive/cards-mockups`), `dd491b0`
  (`archive/fishprog-mockups`), then delete `claude/admiring-ramanujan-nw3mxr-cards`, `…-fishprog`, `…-calib-study`.
- Renew the admin GitHub token before late January 2027; say his Lab Keep / Trim votes; look for the IMR benthic deck.

## Parked after hours

Ideas Pierre dictated after 17:30, untouched until the morning, then turned into work or a ROADMAP row (Rule 0).

- (integrator, from Pierre's session) the limit of 8 shaky genera fills with the hardest look-alike families: it held an
  expert's openings for 138 answers. Revisit with the progress rebuild.
- (Pierre ~20:10) after every family or genus answer, right or wrong, show the photo's species, common and scientific
  name (ROADMAP row "Show the species after a family or genus answer").
- (Pierre ~20:20) "Eel-tailed Catfish is really a family with its own thumbnail in the book's index" (in the game:
  circle 3, *Plotosus lineatus*). Ask what he wants from it (a circle, a cover, more species?).

## Last stop

2026-11-09 ~00:15 Manila, integrator, night: the acceleration (#756-#758), then trains of the decided work (Q308-Q313,
the 11-08 delegation); stopped at 23:35 by Codex's limit. Mid-flight: the 11 green PRs of "Now"; #769 (Pierre's click).

