# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-08, about 16:45 Manila, by the integrator, during a working session. **A new integrator starts here, then
reads [INTEGRATOR.md](INTEGRATOR.md)** (how the work is run, what bites, the open work).

Last checked: reports and events: 2026-11-08 ~07:20 Manila (4 fish reports on 11-07; events: "Can't find variable: shownGroup" twice on 11-06 on one device, one "left with a card open" on the Scientific names offer on 11-07, two saves failed and not recovered)

## Now

Fish is open to every player (beta). Main: sheet script v107. **No open PR; merge queue empty.**

- **History rewritten, 2026-11-08 ~16:20 Manila** (photos step 3, Q121, Q300): 8,240 paths out of every commit of the 18
  branches (the 2,216 Coral Finder crop files among them), pack 702 -> 63 MiB, a fresh clone ~75 MB, today's tree
  unchanged, `.git-blame-ignore-revs` remapped (14fdb4b), Pages green and the live site checked. **Every clone or worktree
  made before then must never push: re-clone** (HANDOVER "Photos out of the repo, step 3"). No GitHub Support purge
  (Pierre's choice): the old objects stay reachable only through old PR refs and commit URLs, never in clones.
- **Merged on 11-08**: #711-#753 (`git log`); #637 closed unmerged. **Being built**: nothing.

## Next

ROADMAP "Backlog in priority order" (Pierre, 2026-11-08): (1) everything that speeds up development: Q305 a, b, d
(decided, **their rule wording goes to Pierre tomorrow**) and the CI speed study's first changes (merge train, docs-only
skip of the smokes, unit-test hot spots, smoke rebalance with a start-up signal); (2) then the Visits page (Q301-Q304),
the fish judging flash or lamp bias, the install nudge, the admin reports action bar, the #664 decisions re-check.

## Questions for Pierre

Numbered for good (never reset) only when the answer commits the future and will be cited later (AGENTS.md "Working
mode", Pierre 2026-11-08); the others are asked plainly. An answered one goes into its PR and off this list.

- **Q208** (set aside on 11-08: "on verra plus tard"): families not met before the scientific genera, or genera on
  their own pace? **Q230** out-of-zone taxon-page photos: waits for real arguments (ROADMAP row).
- **Tomorrow, the admin reports action bar** (ROADMAP row). Numbered when asked (both tests): (a) the status names, the
  new curation key `reps`, does Dismiss thank the player; (b) feedback sent from a game carries its game and photo
  (`g` / `ph`). Unnumbered: (c) remember the attached photo (admin detail); (d) the list follows the subject switch (A4).
- Not numbered: **tomorrow, the Q305 rule wording** (a, b, d; his OK goes in the rules' *Source* line); #641 a-j,
  #651's 5 choices, #664's 8 decisions (re-check first). Q123, Q124: maybe answered elsewhere; ask them again (11-08).
- Answered 11-08: Q121 / Q300 the rewrite, all at once (done); Q301-Q304 the Visits page; Q305 a, b, d adopted, c not;
  Q306 #753's look OK; Q307 the one-tap flip chip under 380 px OK.

Last question number: Q307

## Pierre's hands

Actions only Pierre can do.

- **Drop the Coral Finder crops from R2**: Actions > "Drop the book crops from R2" (it runs for him only), dry run first,
  then for real (HANDOVER "Coral Finder book crops on R2"). **Delete his rewrite backup** (mirror clone and bundle) when
  he says so. Restrict the link-sharing of the Coral Finder PDF on his Drive.
- From before: "CF book: off" + Publish; one player's starting answer back to "I'm at IMR" with #726 (Q228); delete the
  morning report scheduled task from claude.ai (not visible from this session).
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

2026-11-08 ~16:45 Manila, integrator, mid-session: the drain done (#748, #753, #664), then the history rewrite (Q121,
Q300); Q301-Q307 recorded; the numbered-question definition replaced (AGENTS.md, INTEGRATOR). Nothing mid-flight.
