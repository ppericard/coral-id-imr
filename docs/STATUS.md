# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-06, about 22:50 Manila, by the integrator.

Last checked: reports and events: 2026-11-06 ~16:20 Manila (no new report since 11-05; no app error today, a few slow saves recovered)

## Now

Night of 2026-11-06 (Pierre confirmed at 19:48, after the 17:30 reminder, three overnight jobs; quota nearly spent).

- **Merged in the evening**: #652, #685, #691, #687, #682, #633, #599, #602, #659, #670, #666, #663 (with #667),
  #692 admin fish sessions and fish Journey progress, #693 fish leaderboard (shows once the sheet is live at v95), #695
  fish family ID marks and "don't confuse with" (FishBase family summaries; angelfish-spine and wrasse-teeth sent to
  points.json), #696 size and depth on the fish sheets (Reef Life Survey, else FishBase).
- **Waiting on Pierre**: #694, the 14 fish achievements (needs-pierre; recommendation: approve as is, add species named
  and Fish basics later). Side effect: a fish player's sign-in card can come a few answers after the 20th when the first
  achievement pops up, as on corals.
- **Open, no rush**: #637 (needs its learnsim before/after), #664 coherence review (to read).
- **Not started**: the species level and the global fish score; the exam over two visits; Glicko / Kalman ability
  uncertainty; per-subject photo stats and Health; fish.exclude by photo id; genus and species ID marks.
- **Morning report trigger disabled** (Q202) until the quota is back.

## Next

1. Exam over two visits on fixed-difficulty photos; ability uncertainty (Glicko / Kalman, #651's remedy).
2. Per-subject photo stats and Health in the admin (admin plan row 11).

## Questions for Pierre

Numbered for good (never reset, AGENTS.md "Working mode"); an answered one goes into its PR and off this list.

- **Q121** photos step 3 (history rewrite, 686 -> 133 MiB per clone): your explicit go and a time; dry run ready.
- #641 confusion-group study, its questions a-j; #651 overconfidence diagnosis, its 5 choices (not numbered yet).
- **Q203** #694: approve the 14 fish achievements and their names (rec. yes, as is).

Last question number: Q203

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

2026-11-06 ~18:35 Manila, integrator. Merged today (about 55 PRs), from 15:00: #598, #660, #671, #657, #673, #676,
#668, #672, #638, #679, #655, #681, #683, #675, #677, #684, #686, #680, #678, #656, #669, #674, #690, #646, #688. Questions Q178-Q202 answered.
