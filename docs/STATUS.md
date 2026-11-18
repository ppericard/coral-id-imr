# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-18, about 11:15 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers: this file is refreshed about every 90 minutes of work (Pierre, 11:08).

Last checked: reports and events: 2026-11-18 ~10:40 Manila (a coral expert's two reports: the repeat photo, fix in
flight; Mycedium's mnemonic, done in #1084).

## Now

Main: sheet script **v176** (#1067). Trains: `tools/train.py`; `npx --yes prettier@3.10.1`. Agents: at most 4 that write
code or run tests, read-only studies on top (W27 as reworded in #1086); model and effort per task (#1086's table).

- **Merged today** (30+): sea slugs out of beta, stats, admin, WoRMS, Structure (#1051, #1060-#1062, #1075); live mode
  v1 (#1049); staff and cohort boards (#1050); held-out set (#1057); 107 genus presentations (#1074) and the circle 2-3
  genera (#1067); gate floor `SHEET_FLOOR = 131`, 25 gates deleted (#1076); minify at deploy (#1069); the three reviews
  (#1064-#1066); the multi-photo study (#1081); fixes #1053, #1072, #1073, #1082, #1084.
- **Merging** (in order): #1070 fish reference photos → #1079 viewport (v177 assigned).
- **Open, being finished by their agents**: #1083 content version + attempt id (B4, needs a version); #1078 admin seal
  model B; player groups (one model for cohorts, staff, beta; agent); repeat-photo fix (a player's report; agent);
  #1086 rules; #1087 `tools/effort.py`; studies #1071, #1077, #1080, #1085 (answered: merge once Codex-clean); the
  short feedback sheet study (agent); Anthropic's subagent guidance (docs agent).
- **#1045**: decided (down; reference from the photo's traits): `refLevel` from traits still to build.

## Next

The queue, in order (agents take it four at a time):

1. Roles UI (a Roles line in a player's bar: grant role + scope, revoke; Admin › Roles with rights and the audit).
2. Fish basics from Pierre's Drive decks (folder "IMR fish", `Fish Identification_2026`); C12: lecture photos never
   upscaled + the 86 Corals of the World originals with exact credit; held-out sets for corals and sea slugs (L5).
3. Sea slug achievements 60-100%; small fixes (tour, account names, About version, Try again; only the main quiz opens).
4. Variant classes for every subject with the mimicry class (Open Water of both units, a card, look-alike drills);
   class B cards; the out-of-region warning; M1-M7 declared pairs (#1085).
5. Frames model (subject / feature / context), agent-proposed only when sure, live by default, fixed in the admin;
   light models only after a sample test against a strong one.
6. Short feedback sheet (after its study); typed answers (L26); live v1 pooled difficulty, then live prep PRs 1-4
   (familiar live-quiz conventions, our own palette; live answers count without unlocking).
7. What I learn card (Q400 D, Q401 A, Q402 A, Q403 no switch, Q404 A; two independent teaching trees).
8. Game formats in the quiz (Same or different?, Odd one out for every subject incl. corals, Down the tree, Life stages).
9. Coral calibration set (~50 photos to 20+ answers), then the explicit placement test (20-25 adaptive questions).
10. Architecture steps 3-4 (`fish*` → `tree*`, split `core.js`), then the corals-on-the-tree plan to Pierre (Q406).
11. Infrastructure watch (R2, the sheet's size and quotas, Pages): alert early; the domain waits until needed.

## Questions for Pierre

Answered this morning (all recorded in the PRs): Q400-Q406, W27, estimates in agent time, P1, P4, C2/D5, L4, L8 no,
L14 no (packs later), L19 → calibration then an explicit test, F28 → mimicry class, live prep (a)-(e), #1061, seal B,
staff = a group (groups generalised), multi-photo (a) no restriction / (b) frames / (c) keep the header, pairs (a)-(d).

Still open:

- **Viewport band code** (#1079): integrator's call made (keep `b`; the exact width is already in the load event).
- **Studies to come**: the short feedback sheet; Anthropic's subagent guidance (model and effort table).
- **Later**: professionalise and the domain (when the infrastructure demands it); architecture (b)-(i).
- **To read, easy to undo**: #1043 achievements; #1048 gl 30; #1049 points; #1052 cue wording; #1074 marks ≤ 3.

Last question number: Q406

## Pierre's hands

- **Roles**: grant himself the trainer role (to host a live game); the staff group once #groups lands.
- **pCloud backup**: Script properties › `PCLOUD_UPLOAD_CODE`; Reef ID › Back up to pCloud now (`docs/BACKUP.md`).
- **In the admin**: Light and Cover proposals, then Publish; Points; the 8 unsure fish candidates; a look at the 16
  non-Philippine *Acanthurus pyroferus* juvenile photos before its mimicry card uses them.
- Check the "Coral ID analyses" token's type and the R2 token's scope; protect `main`; renew the admin GitHub token
  before late January 2027.
- Long term: contact recognised experts per subject for feedback on the app (ROADMAP).

## Parked after hours

- None.

## Last stop

2026-11-18 ~11:15 Manila: mid-day handover. Scratchpad holds player-data extracts (`placement/data/`, older ones):
delete them, never commit them.
