# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-05, about 17:10 Manila, by the integrator.

Last checked: reports and events: 2026-11-05 ~13:38 Manila (nothing new since 11:30)

## Now

Tracks in flight: track · PR or branch · state · next step. Decided work is launched at once (Pierre, 2026-11-05: no
queue held back; `tests/slot.js` protects the machine). Priority (Pierre, 2026-11-05 evening): **public fish by Sunday
2026-11-08**, the photos' step 3, the fish sheets at three levels and the new app icon are very short term.

- Fish public release · plan in the scratchpad, items A (gate split from the label), B (bug sweep), C (copy audit and
  "Fish is here" card, draft for Pierre), D (stopgap photo health), E (admin fish Candidates 5a then 5b) · agents at
  work · Pierre's Q92-Q100 in the morning, then the flip within his hours (not after 16:30).
- Governance PR C #572 · merge when green; then the unit-test slot lock; the URL refonte is built but merged only
  after the fish flip (same files).
- Analyses: round-thousand milestones (then a forced clean recompute) · views and player profiles (Q70-Q77) · agents.
- Contributions #579 / "Your feedback helped" #581 as cards, anti-spam, never to a deleted account, reports fixed in a
  PR markable as handled (`reports-handled.json`) · agent · cards to Pierre before merge.
- Deleted accounts (Q84-Q91 answered, plus self-service account deletion) · agent.
- Streaks and Sharp eye in the Quiz only (Q82) · agent. Taxonomy reference in the tools · difficulty display · agents.
- Prepared for Pierre's go: photos step 3 (dry run on a mirror); 4 app icon proposals; progress vs number of genera
  study (replaces Q83).

## Next

Waiting only on a real dependency (details in [ROADMAP](ROADMAP.md) "Next").

1. The fish sheets at three levels ([study](reviews/2026-11-05-fish-sheets-study.md)): its 13 questions to Pierre now
   (none blocks the release); then build.
2. Curated fish photos in the game (admin PR 5b, then 7, then answer logging 11), right after the release.
3. The next round of independent reviews, once fish is public.

## Questions for Pierre

Open questions, numbered for good (never reset, AGENTS.md "Working mode"). An answered one goes into its PR and off
this list. Long-standing content and trainer questions live in the admin, To do › Points (`points.json`, #571).

- Q101-Q113, progress against the number of genera ([study](reviews/2026-11-05-progress-setsize-study.md) §
  questions a-m; replaces Q83): 100% = tells it from every slate unit (Q101); coverage weighted by confusion (Q102);
  how low a beginner's first genera may stop (Q103); a two-tone bar (Q104); exam entry and slate traps (Q105); typed
  vocabulary = genera unlocked (Q106); no custom-quiz cap (Q107); no decay (Q108); the recalculation plan (Q109); fish
  fields per rank (Q110); "another genus" answers later (Q111); simulation first (Q112); rule 14f wording (Q113).
- Q92-Q100, the fish release (plan (a)-(i)): everyone sees fish, signed-out included (Q92); keep the "beta" tag (Q93);
  a "Fish is here" card (Q94); the copy edits of PR C (Q95); level 1 on today's photos (Q96); no fish answer logging
  for a week (Q97); smoke tests and the bug sweep as release checks (Q98); new players still start on Corals (Q99);
  the flip Saturday ~10:00 Manila, Sunday morning as reserve (Q100). Rec. yes to each.
- Also: his explicit go for photos step 3 (dry run ready); the icon: D2 (D improved) or a loupe B1-B4 (round 2); the 13 fish-sheet questions.

Last question number: Q113

## Pierre's hands

Actions only Pierre can do.

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

Ideas Pierre dictated after 17:30, in his words (translated), with the context to pick them up; untouched until the
morning, then turned into work or a ROADMAP row with him and cleared (AGENTS.md Rule 0).

_(none)_

## Last stop

2026-11-05 ~17:10 Manila, integrator, end of Pierre's day (Rule 0). Merged after 15:30: #578, #580, #582-#590 (incl.
the Analyses correction #588). The night: agents keep working on the tracks above; decided work merges when green;
questions wait here for the morning.
