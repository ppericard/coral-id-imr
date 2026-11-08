# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-08, about 09:00 Manila, by the integrator, during a working session. **A new integrator starts here, then
reads [INTEGRATOR.md](INTEGRATOR.md)** (how the work is run, what bites, the open work).

Last checked: reports and events: 2026-11-08 ~07:20 Manila (4 fish reports on 11-07; events: "Can't find variable: shownGroup" twice on 11-06 on one device, one "left with a card open" on the Scientific names offer on 11-07, two saves failed and not recovered)

## Now

Fish is open to every player (beta). Main: sheet script v97. Agents running: the Dauin species search and new families
(Q214, Q216, Q217), the IMR genera and the scientific genera back at Advanced (Q219-Q221, Q227, Q228), fish candidate
judging batch 4 (Q213), #715 at weight b) (Q226).

- **Merged on 11-08**: #711-#713 (INTEGRATOR, Journey "genus", rule W25) · #714 reference photos in play like candidates
  (Q212; 9,238 fish photos in play) · #716 admin fish pages count every photo in play · #717, #718 fish candidates judged (Q213).
- **Every PR fails `smoke (admin 1280)` since Pierre's Publish 0acfd96** (the smoke depends on live curation data; fix
  being built). Waiting on it: #719 (803 candidates judged, 50 species), #715.
- **Open**: #715 every photo of an observation, an observation weighing 1 + 0.5 per further photo (Q226, Q218) ·
  #637 · #664 · branch `claude/fish-todo-wip`.
- **Decided 11-08, being built**: a species takes its family's circle (Q214; the build forced circle 3); new families:
  circle 2 Trumpetfishes, Shrimpfishes, Sweepers; circle 3 Hawkfishes, Blennies, Triplefins, Convict Blennies,
  Dottybacks, Eel-tailed Catfishes, Bigeyes, Tunas, Soles, Cornetfishes, Remoras, Needlefishes, Eagle Rays, Cat Sharks,
  Gobies, Dartfishes (own key label); set aside Devilfishes (Plesiopidae), Sea Chubs, Grunters; Archerfishes out (no
  Dauin record). Abudefduf caudobimaculatus kept apart from s066, not in the game yet (Q215). Scientific genera offered
  at Advanced again; for anyone who ever answered "I'm at IMR", the IMR genera (Chromis, Dascyllus, Pomacentrus,
  Amphiprion, Heniochus, Naso) open by themselves at Open Water on their family; no fish level-change card for now; a
  one-time card offers the 2 players with scientific names on to close them.
- **To do by the integrator, Pierre's one-off permission (11-08)**: set one player's fish start back to "I'm at IMR" in
  the sheet (Q228; who: chat only), once the IMR PR says how to write it so the device keeps it.
- **Expert anchors**: the sheet's Notes tab, keys `agent.expert.*` (names only in chat).
- **Morning report trigger disabled** (Q202); Pierre asked whether it is still useful (proposal: delete it).

## Next

The backlog in Pierre's order of interest is in [INTEGRATOR.md](INTEGRATOR.md) "Open work": the species level and the
global fish score first, then ID marks for the 23 uncued fish families.

## Questions for Pierre

Numbered for good (never reset, AGENTS.md "Working mode"); an answered one goes into its PR and off this list.

- **Q121** photos step 3 (history rewrite, 686 -> 133 MiB per clone): your explicit go and a time; dry run ready.
- #641 confusion-group study, its questions a-j; #651 overconfidence diagnosis, its 5 choices (not numbered yet).
- **Q208** (set aside 11-08, Pierre wants more information): families not yet met before the scientific genera, or genera on their own pace?

Last question number: Q228

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

2026-11-08 ~09:00 Manila, integrator, mid-session. Questions Q209-Q228 answered (Q208 set aside); see "Decided 11-08".
