# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-06, about 05:50 Manila, by the integrator.

Last checked: reports and events: 2026-11-05 ~13:38 Manila (nothing new since 11:30)

## Now

Tracks in flight: track · PR or branch · state · next step. Priority (Pierre, 2026-11-05 evening): **public fish by
Sunday 2026-11-08**; very short term: the photos' step 3, the fish sheets at three levels, the new app icon.

- **Progress against the field** · #611 draft, needs-pierre · Pierre (2026-11-06 morning) rejected the trade-off:
  the bar must be right for every profile, experts above all early (q300: expert under-claimed by 25 points today, 30
  with the W 1 / C 0.6 rule). Diagnosis: each genus and pair is counted from zero, with no prior from the player's
  level. Being rebuilt as a person-level hierarchical estimate plus a pair-difficulty model; targets pre-declared
  (|over| <= 0.03 at q300, q600, q1000 for every profile, a spotty profile included; Custom-8 within 0.05). Nothing
  reaches players before Pierre validates. Field-learner sensitivity sims (`learnsim-field`) running, then a PR.
- Fish public release · A #595 merged; C #598, admin 5a #599, 5b #602, PR 7 #614 wait for Pierre (Q92-Q100, Q118-Q120)
  · then the flip within his hours (not after 16:30).
- Deleted accounts #600 merged (v55 live, cleanup ran); #603 waits for Q116. Feedback cards #579 / #581 · Q117.
- Typed retry #616 · Q114. One-tap timing #618 · Q115. URL refonte #610 / #612 · after the fish flip + 48 h.

## Next

1. The fish sheets at three levels ([study](reviews/2026-11-05-fish-sheets-study.md)): Q125, then build.
2. Curated fish photos in the game (#599, #602, #614, then answer logging), then independent reviews, after release.

## Questions for Pierre

Numbered for good (never reset, AGENTS.md "Working mode"); an answered one goes into its PR and off this list.

- Q114 #616 typed retry: one retype on a close misspelling, grading unchanged; logs the raw typed text and a retyped
  flag in 2 new Answers columns (a sheet layout change) plus a privacy-page line. Rec. yes.
- Q115 #618: the one-tap "Getting boring?" question only after 15 answers and 5 minutes in the session. Rec. yes.
- Q116 #603: archive message and self-delete page wording. Q117 #579 / #581: the four feedback cards.
- Q118 #598: fish copy edits 1-7 and the "Fish is here" card (kicker, target, once per device, 10-answer minimum).
- Q119 #599 / #602 fish admin screens ("Choices I made" in each PR). Q120 #614: keep the per-entry minimum rule (rec.
  yes); leave the 25 pre-flag-ease photos (rec. yes).
- Q121 photos step 3 (history rewrite, 686 -> 133 MiB per clone): your explicit go and a time; dry run ready.
- Q122 the app icon: D2 (D improved) or a loupe B1-B4.
- Q123 fish confusion study a-o (gos on i, f, k). Q124 name study a-h. Q125 the 13 fish-sheet questions.
- Q105 (personalised exam) and Q113 (rule L11 wording) stay open in #611.
- Q92-Q100, the fish release (plan (a)-(i)): everyone sees fish, signed-out included (Q92); keep "beta" (Q93); a
  "Fish is here" card (Q94); PR C's copy edits (Q95); level 1 on today's photos (Q96); no fish answer logging for a week
  (Q97); smoke tests and the bug sweep as release checks (Q98); new players start on Corals (Q99); the flip Saturday
  ~10:00 Manila, Sunday morning as reserve (Q100). Rec. yes to each.

Last question number: Q125

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

Ideas Pierre dictated after 17:30, untouched until the morning, then turned into work or a ROADMAP row (Rule 0).

- (20:07) Show the genera unlocked in the Progress badge, e.g. "30/40 genera unlocked".
- (20:22) Photos seen again and again: raise the per-genus photo caps a lot (Pierre photographs the frequent genera);
  count photos never shown; an admin stat per player, photos seen / photos available given the genera unlocked; make
  sure the game tries new photos enough. Proposal: a read-only study on the real log first, then the changes.
- (integrator, from Pierre's session) the limit of 8 shaky genera fills with the hardest look-alike families: it held an
  expert's openings for 138 answers. Revisit with the progress rebuild.

## Last stop

2026-11-06 ~05:50 Manila, integrator, morning report. Merged overnight: #572, #591-#597, #600 (sheet v55 live),
#601, #604-#609, #613, #615, #617, #619, #620. The morning report now comes before 05:00 (Pierre wakes ~05:00).
