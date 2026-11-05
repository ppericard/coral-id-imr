# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-05, about 13:40 Manila, by the integrator.

Last checked: reports and events: 2026-11-05 ~13:38 Manila (nothing new since 11:30)

## Now

Tracks in flight: track · PR or branch · state · next step. Decided work is launched at once (Pierre, 2026-11-05: no
queue held back; `tests/slot.js` protects the machine).

- Governance refonte · PR A #558 and PR B #561 merged · PR C (short AGENTS.md, `docs/rules/`, stable rule IDs, judging
  brief renamed, Codex review guidelines, the size and reference tests) in progress, waits for Pierre's OK on the new
  text and the dropped list.
- Photos out of the repo · step 1 (online-original fallback, camera icon) merged #569 · step 2 (photos with an online
  source leave `img/`, R2-only upload) in progress, waits for Pierre's OK · step 3 (history rewrite) only with his go.
- Growth-form comparison fix and the 139 missing growth forms (a player's report) · in progress.
- IMR lecture photos in full resolution from the unzipped deck (a player's report, Q27) · in progress.
- Fish candidate cap weighted by phases (Q36) · in progress.

## Next

Waiting only on a real dependency (details in [ROADMAP](ROADMAP.md) "Next").

1. URL refonte, app and admin (Q53-Q56 decided: `#section/page` and `#group/tab/view` in English, filters after `?`,
   the subject prefix everywhere, old links not translated, admin ALIAS emptied; study to save in `docs/reviews/`):
   after governance PR C (same files).
2. The fish track toward the beta (ROADMAP "Next", the fish rows); FishBase next steps.
3. The fish sheets at three levels, when Pierre wants them (study:
   [reviews/2026-11-05-fish-sheets-study.md](reviews/2026-11-05-fish-sheets-study.md); its 13 questions parked).

## Questions for Pierre

Open questions, numbered for good (never reset, AGENTS.md "Working mode"). An answered one goes into its PR and off
this list. Long-standing content and trainer questions live in the admin, To do › Points (`points.json`, #571).

_(none: the 13 questions of the fish sheets study are parked by Pierre until he picks that project)_

Last question number: Q58

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
- **Protect `main` on GitHub**: [HANDOVER "Protect main"](HANDOVER.md#protect-main-one-time-setup).
- **Create the secret `ANALYSES_ADMIN_TOKEN`** (the admin's Analyses report computes itself once it exists):
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

Who stopped, when, why, and what was mid-flight.

_(none yet in the integrator mode: first day, 2026-11-05)_
