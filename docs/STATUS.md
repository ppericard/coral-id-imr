# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-07, about 14:40 Manila, by the integrator, before a quota pause. **A new integrator starts here, then
reads [INTEGRATOR.md](INTEGRATOR.md)** (how the work is run, what bites, the open work).

Last checked: reports and events: 2026-11-06 ~16:20 Manila (no new report since 11-05; no app error today, a few slow saves recovered)

## Now

Fish is open to every player (beta). Main: sheet script v97, rules version 9. No agent running. Quota nearly spent:
nothing new is started until it is back.

- **Merged on 11-07**: #694 the 14 fish achievements (Q203) · #698 "Open the game" in the admin's ⋯ menu · #700 genus
  common names (21, sourced) · #701 no empty tips box (Barracudas) · #702 scientific genera at Open Water (Q205) · #703
  circle 3 as an opt-in card, still counted in the % (Q204) · #704 the winks draw from 3 chosen photos each · #699
  ROADMAP notes. The docs audit PR (statuses vs main) is the last one open of this round.
- **Merged 11-06 (about 80 PRs)**: the book's families (#656), every circle on the path (#669), all fish photos on R2
  (#674, 8,582 in play), reference photos first (#660-#683), the domain-score bar with its apology card (#646) and the
  silent fish recompute (#688), fish sheets with texts, sizes and depths (#675-#696), fish leaderboard (#693), admin fish
  pages and Players for two subjects (#655-#692).
- **Open**: #637 (needs its learnsim before/after) · #664 (coherence review, to read) · branch `claude/fish-todo-wip`
  (unfinished: fish.exclude by photo id, fish To do sections).
- **Expert anchors** (names only in chat): two IMR coral experts; one IMR fish expert (families and genera); Pierre for
  fish families only.
- **Morning report trigger disabled** (Q202) until the quota is back.

## Next

The backlog in Pierre's order of interest is in [INTEGRATOR.md](INTEGRATOR.md) "Open work": the species level and the
global fish score first, then ID marks for the 23 uncued fish families.

## Questions for Pierre

Numbered for good (never reset, AGENTS.md "Working mode"); an answered one goes into its PR and off this list.

- **Q121** photos step 3 (history rewrite, 686 -> 133 MiB per clone): your explicit go and a time; dry run ready.
- #641 confusion-group study, its questions a-j; #651 overconfidence diagnosis, its 5 choices (not numbered yet).

Last question number: Q207

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

2026-11-07 ~14:40 Manila, integrator, handover before a quota pause. Questions Q178-Q207 answered (Q204: circle 3 an
opt-in but counted; Q205: genera at Open Water; Q206: the experts in the sheet's Notes tab; Q207:
rule S1 general for anything in beta). The docs audit (#706) closed the shipped ROADMAP rows.
