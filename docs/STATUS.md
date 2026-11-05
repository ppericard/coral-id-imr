# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-05, about 16:30 Manila, by the integrator.

Last checked: reports and events: 2026-11-05 ~13:38 Manila (nothing new since 11:30)

## Now

Tracks in flight: track · PR or branch · state · next step. Decided work is launched at once (Pierre, 2026-11-05: no
queue held back; `tests/slot.js` protects the machine).

- Governance PR C #572 · amended today (valid statistics with Holm and pre-declared measures, multifactor method
  rigour, "tu" with Pierre, Dependabot and stack rule) · merge when CI and Codex are green; then the URL refonte and
  the unit-test slot lock start.
- Analyses multiple-testing correction (Q69: Holm on 1-2 declared primaries per analysis, BH on the rest, 999 bootstrap
  draws, "new clear" badge removed) · agent at work · before/after screenshots to Pierre, then merge.
- Contributions achievements #579 (Q65) and "Your feedback helped" #581 (Q66, stacked on #579) · green · wait for the
  wording, Q79-Q81.

## Next

Waiting only on a real dependency (details in [ROADMAP](ROADMAP.md) "Next").

1. URL refonte, app and admin (Q53-Q56 decided; [study](reviews/2026-11-05-url-scheme-study.md)): after #572.
2. The fish track toward the beta (ROADMAP "Next", the fish rows); FishBase next steps.
3. The fish sheets at three levels, when Pierre wants them (study:
   [reviews/2026-11-05-fish-sheets-study.md](reviews/2026-11-05-fish-sheets-study.md); its 13 questions parked).

## Questions for Pierre

Open questions, numbered for good (never reset, AGENTS.md "Working mode"). An answered one goes into its PR and off
this list. Long-standing content and trainer questions live in the admin, To do › Points (`points.json`, #571).

- Q70-Q77, the Analyses visualisations and player profiles ([study](reviews/2026-11-05-multifactor-viz-study.md)
  §6 a-h): a map not named types until ~30 players (Q70); profile on the last 300 answers (Q71); the 8 behaviours
  (Q72); admin only (Q73); phone forms for dense views (Q74); computed in the Action's report (Q75); a player × genus
  effect later (Q76); no PCA on raw answers, residual and behaviour PCAs instead (Q77). Recommendation: yes to each.
- Q78: photos served from a domain of his own instead of `r2.dev` (development-only, rate-limited), with the domain
  rename planned before December. Recommendation: yes.
- Q79-Q81, wording in #579 / #581 (screenshots sent): 5th and 10th report titles and icon (rec. Helping hand,
  Co-author, 💬); the "handled" toast (rec. Your feedback helped, "A report you sent was looked at and handled.", 🙌);
  the 2 reports already done thanked once at release (rec. yes).
- The 13 questions of the fish sheets study stay parked until he picks that project.

Last question number: Q81

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
- **Create the secret `ANALYSES_ADMIN_TOKEN`** (no Analyses report was ever stored without it; asked again
  2026-11-05):
  [HANDOVER "Analyses report"](HANDOVER.md#analyses-report-one-time-setup-2026-11-04).
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

2026-11-05 ~16:30 Manila, integrator, end of Pierre's day (Rule 0). Merged today after 15:30: #578, #580, #582-#587
(Recompute on phones, unstretched IMR photos, per-player replay stats, CI on Node 24 / Ubuntu 26.04 / Python 3.15,
Analyses sort and fold, rclone 1.75.2 checked by a real Photos to R2 run, stack check). Mid-flight: #572 (CI), the
Analyses correction agent; #579/#581 wait for Q79-Q81.
