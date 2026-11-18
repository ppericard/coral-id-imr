# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-18, about 18:45 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work (Pierre, 11:08).

Last checked: reports and events: 2026-11-18 ~16:20 Manila (nothing new since Shannen's 11/17 report).

## Now

Main: sheet script **v181** (#1102), live since 16:05. The script updates from the `release` branch, which only the
train moves (#1102; created by #1109's train); run trains from a checkout holding #1102's `train.py`. Trains: `tools/train.py`, one at a time (overlapping trains fail on "main moved").
Agents: at most 4 that write code or run tests, studies on top; model and effort per the table in #1086 (Opus for
design, engine, security; Sonnet for ordinary code and docs; Haiku for bulk work after a sample test); agents edit files
only with Write/Edit (no inline code in shell: it makes Pierre approve prompts). Estimates: `tools/effort.py` (#1087).

- **Today, merged** (60+): see `git log`. Since 14:40: #1083 content version (v178), #1092 fish grid (its Codex fix had
  declared `boardUnits`, already sync.js's: the app stopped loading; renamed), #1105 (a test that fails on such clashes
  between the app's scripts), #1078 seal model B, #1106 `tools/unminify.js` (error positions through the source maps),
  #1107, #1091 player groups (v179), #1101 infra health (v180, its decision record), #1102 release branch (v181), #1109.
- **Merging**: #1108 Fish basics, v182 assigned (18:40), queued (scratchpad `q16.txt`). Pierre converted the fish decks
  to Google Slides (18:34): the two picture slides confirm the six tails, the six markings and the seven body shapes
  (its decision record says what they show); step 6 kept, the integrator's call. Then remove `/home/user/wt-fishbasics`.
  Next versioned: #1099 (after Pierre).
- **Waiting for Pierre**: `release` ruleset (Restrict deletions + Block force pushes, as `main`); #1104 docs PR 1 (Codex-clean, green; OK on three factual rule wordings: A4 + ui "subject
  picker", W18 "rewrite done 08/11"; its agent holds PR 2 until it merges); #1099 (B floor 40? "never seen" by
  observation?); #1093 repeat-photo fix (A rec.); #1045 reference from traits (A rec.; then apply P1 strictly: no medium
  size, no schools in REF_LOOK); #1095 privacy page (3 points); #1098 one app by role study (a)-(f).
- **Agents running (4/4)**: short feedback sheet build (Sonnet, `wt-fbsheet`; it sat 2 h on a permission prompt for a
  shell grep pipeline, 16:30-18:32); sea slug achievements 60-100% (Sonnet, `wt-slugach`); typed answers, what is left
  (Opus, `wt-typed`); live mode after version 1 (Sonnet, `wt-live2`). Briefs forbid heredocs, `sed -i`, inline code
  and grep pipelines (Grep/Read tools instead); check their reports. When one reports, start the next from
  `docs/reviews/2026-11-18-backlog-inventory.md` in the same turn (INTEGRATOR.md, 11-14 handover).

## Next

1. Versions one at a time: #1108 (queued); #1099 after Pierre; then the four agents' PRs as they come.
2. Next agents, from the whole backlog (`docs/reviews/2026-11-18-backlog-inventory.md`, ROADMAP): sourced tell-apart
   lines (40 coral, 9 sea slug pairs) after the feedback sheet; small fixes; variant classes with mimicry, cards, the
   out-of-region warning, pairs M1-M7 (#1085); frames model; game formats; coral calibration set then the explicit
   placement test (#1080); architecture steps 3-4; fish read their own stats (admin plan PR 11); C12 lecture photos.
   After Pierre: docs restructuring PRs 2+ (#1104), roles UI (#1098), What I learn card (#1071), species step 2 (#1041).
3. Infrastructure watch (R2, sheet cells, quotas, Pages); domain only when needed.

## Questions for Pierre

Answered today (in their PRs): Q400-Q406, W27, model table, estimates, no inline code, P1, P4, C2/D5, C3, L4, W19 +
docs plan, licence A (all rights reserved for now), security reporting (enabled), groups model, Trainer/Curator/
Manager/Admin names, one-app study, placement → calibration then explicit test, feedback sheet (a)-(f), multi-photo,
pairs, mimicry class, per-player reserve, infra 1-4.

Still open: #1104 three wordings; #1099 floor + "never seen"; #1093 A/B; #1045 A/B; #1095 three points (backup "three months" wording; audit rows after deletion; the
Notes tab); #1098 (a)-(f); genera opening vs the two independent trees (#1041 §6).

Last question number: Q406

## Pierre's hands

- **Roles**: grant himself the trainer role to host a live game.
- **In the admin**: Light and Cover proposals, then Publish; Points (incl. the Coral Finder 2022 pages, #1085); the 8
  unsure fish candidates; a look at the 16 non-Philippine *A. pyroferus* juvenile photos.
- Check the "Coral ID analyses" token's type and the R2 token's scope; renew the admin GitHub token before late January
  2027. (Done today: `main` protected; pCloud backup live, weekly.)

## Parked after hours

- None.

## Last stop

2026-11-18 ~18:45 Manila: handover (late: no check-in was set after 16:15, see INTEGRATOR.md). Scratchpad holds player-data extracts (`placement/data/`): delete, never commit.
Queue waiters: never `pgrep -f` a pattern your own command line contains (two waiters deadlocked on it today).
