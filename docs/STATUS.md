# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-06, about 17:00 Manila, by the integrator (Pierre extended the day to ~18:00 for the fish push).

Last checked: reports and events: 2026-11-06 ~16:20 Manila (no new report since 11-05; no app error today, a few slow saves recovered)

## Now

Fish is open to every player (beta). Today's push: fish photos, the book's families, the new progress bar.

- **Fish photos** · reference photos: all 1,428 judged and in play (#660, #668, #672, #679, #681, #683); every circle-1
  family has a reference cover · draw calibration #678 (Q186), its L11-L12 learning checks running · then #674: the
  sure judged candidates enter automatically (Q180) and every fish photo in play goes to R2 (Q199, 8,308 photos, ~2.9
  GB); after it merges, dispatch "Candidate photos" (twice if it says more wait).
- **Fish units** · the book's families #656 (failing check being fixed) → circles #669 (Q175-Q177, Q181-Q183), stacked.
- **New coral bar** · #638 merged · #646 (Q196 go) fixing 5 Codex findings, then merge (rules v9, apology card) · then
  the fish recompute, silent, no card (Q200).
- **Fish sheets** · family #675 and genus #677 merged · species #684 next.
- **Fish admin** · Families #655 merged · swiper #599 / #602 (Q194), mini switch #633 (Q195), Coverage #659, Photo
  review #663, Look-alikes #667 · flag ⚑ for fish #686, then fish.exclude by photo id and the fish To do sections.
- **Admin Players for two subjects** (Pierre 16:28): shared list with Corals / Fish column groups, Activity and Journey
  per subject; agent building, questions to come. Photos / Spread columns #680 (Q191), hard photos flagged #682 (Q192).
- **Photo exposure** · study #670 (Q187-Q193 answered) · changes Q187-Q190 for corals and fish, simulating.
- **Fish leaderboard** (decided 11-04) building; ~14 fish achievements proposed next, Pierre picks the list.
- **Experts** · first coral expert analysed (52 -> 44% under #646, 93% right); coral expert 2 and the fish expert
  being analysed (read-only).
- Others: #666 candidate auto-refill (green), #637 (needs its learnsim before/after), #664 coherence review (to read).

## Next

1. Exam over two visits on fixed-difficulty photos; ability uncertainty (Glicko / Kalman, #651's remedy).
2. Per-subject photo stats and Health in the admin (admin plan row 11).

## Questions for Pierre

Numbered for good (never reset, AGENTS.md "Working mode"); an answered one goes into its PR and off this list.

- **Q121** photos step 3 (history rewrite, 686 -> 133 MiB per clone): your explicit go and a time; dry run ready.
- #641 confusion-group study, its questions a-j; #651 overconfidence diagnosis, its 5 choices (not numbered yet).
- Coming: the fish achievements list; the admin Players columns.

Last question number: Q200

## Pierre's hands

Actions only Pierre can do.

- **Covers for the 11 fish entries with no reference-level photo** (Barracuda, Seamoths, Scorpionfishes, Flying
  gurnards, Stargazers, Snake eels, Garden eels, Rays, Reef sharks, Whale shark, Thresher sharks): pick or shoot one.
- **Photo hunt for Astrea and Anacropora** at the Dauin sites where IMR trainers know they occur (colony, close-up,
  macro; posted to iNaturalist under CC BY or CC BY-NC): iNaturalist has no Astrea observation with photos in the
  Philippines.
- **Pre-sort the near-Dauin iNaturalist observations left above genus** (he or an IMR trainer can tell an Astrea or an
  Anacropora; counts of 2026-11-05): stony corals at order only,
  [84](https://www.inaturalist.org/observations?lat=9.19&lng=123.26&radius=40&taxon_id=47532&rank=order&photos=true);
  Merulinidae (Astrea's family) at family only,
  [20](https://www.inaturalist.org/observations?lat=9.19&lng=123.26&radius=40&taxon_id=85893&rank=family&photos=true);
  every stony coral between order and family,
  [57](https://www.inaturalist.org/observations?lat=9.19&lng=123.26&radius=40&taxon_id=47532&rank=suborder,infraorder,superfamily,family&photos=true).
- **Show the Astrea question to an IMR trainer** from the admin (To do › Points, first item) and Publish the answers.
- **Sort the photos out of the presence rule** (To do › Out of the presence rule: Remove / Keep) and, when convenient, the 14 share-alike coral photos (To do › Share-alike).
- **More photos for the genera with the fewest** (photo memory: in a thin genus players learn the photos, not the genus; Pierre, 2026-11-03): [admin Coverage › Games › Thinnest](https://ppericard.github.io/coral-id-imr/admin.html#~cov) lists them.
- **Protect `main` on GitHub**: [HANDOVER "Protect main"](HANDOVER.md#protect-main-one-time-setup).
- **Archive tags, then delete branches** (the proxy refuses tag pushes and branch deletes from the agents):
  `git push origin f46f11c:refs/tags/archive/cards-mockups` and
  `git push origin dd491b0:refs/tags/archive/fishprog-mockups`, then delete the branches
  `claude/admiring-ramanujan-nw3mxr-cards` and `…-fishprog`; `…-calib-study` can go too (its docs were salvaged in
  #503); `…-fishphotos` after the fish Candidates admin PR lands.
- **Clean merged branches**: [HANDOVER "Clean merged branches"](HANDOVER.md#clean-merged-branches-one-time-setup).
- **Renew the admin GitHub token** before late January 2027 (90-day token created around 2026-10-31; the admin lock
  screen links to the token page).
- **Lab Keep / Trim votes**: say which Lab tools he marked (the votes live only in his browser) before the Lab is
  trimmed.
- **IMR benthic deck**: look for it (Millepora's ID tips stay the Coral Finder's until it is in).

## Parked after hours

Ideas Pierre dictated after 17:30, untouched until the morning, then turned into work or a ROADMAP row (Rule 0).

- (integrator, from Pierre's session) the limit of 8 shaky genera fills with the hardest look-alike families: it held an
  expert's openings for 138 answers. Revisit with the progress rebuild.

## Last stop

2026-11-06 ~17:00 Manila, integrator. Merged today (about 55 PRs), from 15:00: #598, #660, #671, #657, #673, #676,
#668, #672, #638, #679, #655, #681, #683, #675, #677. Questions Q178-Q200 answered.
