# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-05, about 11:00 Manila, by the integrator.

Last checked: reports and events: 2026-11-05 ~11:30 Manila

## Now

Tracks in flight: track · PR or branch · state · next step.

- Intuitive difficulty display across the admin (ROADMAP Next; Pierre's yes to the whole proposal, Q26) · its own PR ·
  in progress.
- Governance refonte (ROADMAP Next) · PR A merged (#558); PR B (this file, `tools/brief.py`, the hooks) in review · then
  PR C (short AGENTS.md, `docs/rules/` topic files, stable rule IDs by theme, `judging/AGENTS.md` renamed, Codex review
  guidelines) and PR D (size budgets, reference checks).

## Next

The integrator's queue, in order (details in [ROADMAP](ROADMAP.md) "Next").

1. Photos out of the repo, step 2 (top priority, ROADMAP Next): the photos with an online source leave `img/`, the
   fallback switched to their original source.
2. Corals: no share-alike, `thamnasteroid` accepted (Q35, one PR); the fish candidate cap of Q36.
3. The fish track toward the beta (ROADMAP "Next", the fish rows); the fish candidates still to judge
   (`python3 tools/judging_fish.py todo`), same process as #523-#549; FishBase next steps (ROADMAP).
4. The fish sheets at three levels, when Pierre wants them (study:
   [reviews/2026-11-05-fish-sheets-study.md](reviews/2026-11-05-fish-sheets-study.md); its 13 questions not asked yet).

## Questions for Pierre

Open questions, numbered for good (never reset, AGENTS.md "Working mode"). An answered one goes into its PR and off
this list. Long-standing content questions stay in [ROADMAP](ROADMAP.md) "Content questions for Pierre" and
"Questions for an IMR trainer".

_(none: the 13 questions of the fish sheets study are parked by Pierre until he picks that project)_

Last question number: Q36

## Pierre's hands

Actions only Pierre can do.

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
- **Photo memory, point 3**: more photos for the genera with the fewest (admin Coverage › Games, Thinnest).

## Parked after hours

Ideas Pierre dictated after 17:30, in his words (translated), with the context to pick them up; untouched until the
morning, then turned into work or a ROADMAP row with him and cleared (AGENTS.md Rule 0).

_(none)_

## Last stop

Who stopped, when, why, and what was mid-flight.

_(none yet in the integrator mode: first day, 2026-11-05)_
