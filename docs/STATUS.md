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

- **Merged on 11-08**: #711-#723 and #727, #732: reference photos in play like candidates (Q212), admin counts every
  photo in play, fish judging batches (Q213), every photo of an observation weighted 1 + 0.5 (Q226), IMR genera and
  scientific genera at Advanced (Q219-Q240), surprises at 200/400 answers, a species in its family's circle and 18 new
  families (Q214-Q217, Q232, Q246-Q249), the load-order crash on deep links (#732), STATUS and rule D2 (#721).
- **Merge queue, in this order** (sheet versions in brackets): #725 wink answers logged (v98; conflict being fixed) →
  #726 admin "change starting answer" (→ v99) → #728 refused typed texts logged + neutral nudge (→ v100) → #730 global
  fish score A + √ (v101) → #734 fish achievements (v102, needs Pierre's OK on the names). Also: #729 hard photos capped
  before Open Water, families only (Q252 0.1, Q271) · #724 judging batch 4 · #731 every taxon-page photo (Q229/Q231;
  Q230 out-of-zone photos open) · #735 rule L11 in levels (approved) · #733 docs fixes · #736 notices after the first
  sync · #737 LICENSE + README (needs Pierre's OK on the About text) · open since 11-06: #637, #664.
- **Being built**: Coral Finder crops out (Pierre switches "CF book" off in the admin; key-box drawings, then removal;
  book-derived texts checked against the PDF) · curated fish covers ignored by the app (bug) · prefer CC0/CC BY photos
  at equal quality (Q270) · fish Home mosaic in landscape tiles · repo tidy-up PRs (docs, config, CI on main, Pages trim).
- **Pierre's hands**: "CF book: off" + Publish; Q121 history rewrite (now also the Coral Finder crops), then a GitHub
  purge request; set one player's starting answer back to "I'm at IMR" with #726 (Q228); delete the morning report
  scheduled task from claude.ai (not visible from this session).
- **Expert anchors**: the sheet's Notes tab, keys `agent.expert.*` (names only in chat).

## Next

The backlog in Pierre's order of interest is in [INTEGRATOR.md](INTEGRATOR.md) "Open work": the species level and the
global fish score first, then ID marks for the 23 uncued fish families.

## Questions for Pierre

Numbered for good (never reset, AGENTS.md "Working mode"); an answered one goes into its PR and off this list.

- **Q121** photos step 3 (history rewrite, 686 -> 133 MiB per clone): your explicit go and a time; dry run ready.
- #641 confusion-group study, its questions a-j; #651 overconfidence diagnosis, its 5 choices (not numbered yet).
- **Q208** (set aside 11-08, Pierre wants more information): families not yet met before the scientific genera, or genera on their own pace?

Last question number: Q280

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
