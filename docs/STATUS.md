# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-06, about 18:35 Manila, by the integrator.

Last checked: reports and events: 2026-11-06 ~16:20 Manila (no new report since 11-05; no app error today, a few slow saves recovered)

## Now

Fish is open to every player (beta). End of the 2026-11-06 push (Pierre extended to ~18:00; quota nearly spent, so the
other agents were stopped and nothing new was started).

- **Merged after 17:00**: #656 the book's families · #669 every circle counts, circles 2-3 open by themselves · #678
  fish draw calibration (Q186) · #674 judged candidates in play by themselves, every fish photo on R2 (Q180, Q199):
  the workflow put 4,763 more on R2, 8,582 fish photos in play, 1 failed (next Publish retries) · #646 the new coral
  bar (rules v9, apology card when the sheet goes live at v87+) · #688 silent fish recompute (Q200) · #690 admin
  Players shared list, Activity and Journey per subject.
- **Ready, not merged**: #652 surprises once per player (conflicts: merge main, take main+1) · #685 photo exposure
  (Q187-Q190, Q201) · #687 fresh look on 417 candidates (249 enter) · #682 hard photos flagged (Q192) · #599 / #602
  swiper (Q194) and #633 mini switch (Q195), need a rebase · #659 / #663 / #667 fish admin pages, need a rebase.
- **Stopped for quota, restart later**: fish leaderboard and ~14 achievements; fish sheet texts and sizes (publish
  directly, Pierre corrects); fish.exclude by photo id and the fish To do sections; per-subject photo stats and Health.
- **Not started**: the species level and the global fish score (decided 11-04); the exam over two visits; Glicko /
  Kalman ability uncertainty.
- **Morning report trigger disabled** (Q202) until the quota is back.

## Next

1. Exam over two visits on fixed-difficulty photos; ability uncertainty (Glicko / Kalman, #651's remedy).
2. Per-subject photo stats and Health in the admin (admin plan row 11).

## Questions for Pierre

Numbered for good (never reset, AGENTS.md "Working mode"); an answered one goes into its PR and off this list.

- **Q121** photos step 3 (history rewrite, 686 -> 133 MiB per clone): your explicit go and a time; dry run ready.
- #641 confusion-group study, its questions a-j; #651 overconfidence diagnosis, its 5 choices (not numbered yet).
- Coming: the fish achievements list; the admin Players columns.

Last question number: Q202

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
