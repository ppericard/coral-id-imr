# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-08, about 12:10 Manila, by the integrator, during a working session. **A new integrator starts here, then
reads [INTEGRATOR.md](INTEGRATOR.md)** (how the work is run, what bites, the open work).

Last checked: reports and events: 2026-11-08 ~07:20 Manila (4 fish reports on 11-07; events: "Can't find variable: shownGroup" twice on 11-06 on one device, one "left with a card open" on the Scientific names offer on 11-07, two saves failed and not recovered)

## Now

Fish is open to every player (beta). Main: sheet script v97; 664 fish species in 67 families since #727.

- **Merged on 11-08**: #711-#735, #737, #738, #740, #741, #743, #745, #746, #750 (`git log`): IMR genera and
  scientific genera at Advanced, 18 new families, the global fish score A + √ and its achievements, refused typed texts
  logged, Coral Finder crops judged out, rule L11 in levels, LICENSE + README, the repo tidy-up. **Open**: the sheet chain
  #742 (v103) → #736 (v104) → #749 (v105); #739, #744, #747, #748: Pierre answered Q288-Q294 on 11-08 (to paste into each PR); #664 open.
- **Being built**: the 11-08 midday items are all open PRs now (above); the batch-5 fish judging.
- **Pierre's hands**: "CF book: off" + Publish; Q121 history rewrite (now also the Coral Finder crops), then a GitHub
  purge request; set one player's starting answer back to "I'm at IMR" with #726 (Q228); delete the morning report
  scheduled task from claude.ai (not visible from this session); later, stop the link-sharing of the Coral Finder PDF
  on his Drive.
- **Expert anchors**: the sheet's Notes tab, keys `agent.expert.*` (names only in chat).

## Next

The backlog in Pierre's order of interest is in [INTEGRATOR.md](INTEGRATOR.md) "Open work": the species level and the
global fish score first, then ID marks for the 23 uncued fish families.

## Questions for Pierre

Numbered for good (never reset, AGENTS.md "Working mode"); an answered one goes into its PR and off this list.

- **Q121** photos step 3 (history rewrite, 686 -> 133 MiB per clone, now with the Coral Finder crops): your go and a time.
- **Q295, Q296** (privacy page, activity study): `privacy.html` says the reports' device id is "not linked to your
  answers", yet Pages rows hold it beside the player's id and the admin joins them; the once-a-visit `load` event is
  described nowhere. Reword each? Rec. yes.
- **Q297** game modes (ROADMAP "Game modes", ReefRecall's and 7 new): which next? Rec. Find the X as agreed, then Odd one
  out and Same or different. **Q298** fish replay: device bar as a floor before sheet v60, or accept the loss? Rec.
  measure the gap in the admin first. **Q299** the names of the 9 fish achievements not built yet (ROADMAP row).
- **Q208** (set aside, wants more information): families not met before the scientific genera, or genera on their own
  pace? **Q230** out-of-zone taxon-page photos: open, waits for real arguments (ROADMAP row).
- Not numbered: #641 a-j, #651's 5 choices, #664's 8 decisions (ROADMAP rows). Q123 (fish confusion a-o) and Q124
  (name study a-h): no answer found after the 11-06 morning list; check before asking.

Last question number: Q299

## Pierre's hands

Actions only Pierre can do.

- **The 8 unsure fish candidates** left in the admin (a drawing, tank shots, a damaged file, a screenshot, a possibly
  wrong species) and the photos the expert analyses flagged (sent in the chat on 11-06).
- **Genus common names without a source in the repo**, to add in place if he wants them: Cephalopholis (hinds),
  Centropyge (pygmy angelfishes), Dendrochirus (dwarf lionfishes), Dascyllus (humbugs).
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

2026-11-08 ~12:10 Manila, integrator, mid-session. Questions Q229-Q280 answered except Q230 (out-of-zone taxon photos,
waits for numbers); Q237 kept as is (common names on genus questions).
Then Q288-Q294 (Pierre, 11-08): Q288 OK, reworded Key labels kept; Q289 his covers are the cards' photo; Q290 his cover
on the thresher card; Q291 covers on Home when landscape and they fit; Q292 the book's 3-8 cm; Q293, Q294 OK.
