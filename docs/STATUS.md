# Status

Only the integrator updates this handoff, rewriting it at each stop. Subagents report their updates to the
integrator. Follow [Project Home][home] for work and decisions.
Use `python3 tools/brief.py --short` for current GitHub and sheet version signals; check-ins run
`python3 tools/brief.py --checkin` and follow [tools/checkin.md](../tools/checkin.md).
Search [ANSWERS.md](ANSWERS.md) for historical evidence and use git and PRs for what shipped.

Last checked: reports and events: 2026-11-23 ~15:55 Manila (Claude integrator; nothing new)

Night report: last sent 2026-11-22 (15:25 Manila, late: a hook's false reminder, fixed in #1464)

## Now

- **A Claude Code integrator holds Pierre's durable mandate** since 2026-11-23 15:43 Manila: drain decided work
  (INTEGRATOR "Linear"), delegate, integrate. A Codex session may work on REE-121 / REE-220 (queue latency); check
  `codex/*` branches before touching tools/queue/. Merge only through `tools/queue/nightq.sh`, one queue process at a
  time (parallel runs collide on main; REE-220).
- **Judging is on hold** (the photos rule added by #1491, Pierre 19:26/19:28): no judging or re-judging by agents over 100 photos without his
  explicit OK with count, purpose, why an agent and cost. #1493 (`needs-pierre`) holds 254 ease changes already
  judged before the rule (5 typical-look families; thin families 19 → 15) for his OK.
- **Merged since 17:21:** #1391 (draw cliff stop-gap), #1471 (REE-40 pagehide), #1474 (corals 45-genus scale,
  sheet v221), #1478 (Key use counts as activity), #1479 (fish smoke flake), #1480 (check-ins from the repo),
  #1481, #1482 (typical-look caps), #1483 and #1486 (judging batches 1–2), #1484 (REE-42 step 1), #1485 (version
  limit warning, sheet v222), #1409 (About), #1490 (About references).
- **In the queue:** #1491 (the judging rule + the evening's ledger), #1492 (REE-248 reserve design), #1487 (REE-243 faved
  candidates beyond the cap), #1488 (judging batch 3), #1489 (REE-27 species exams design), #1494 (REE-245
  continuous draw design).
- **Running:** REE-42 step 2 (holds core.js/core/*.js, Code.gs, sync.js), REE-64 (holds app.js).

## Active discussion

- Fish ease and photos: [REE-85 study](reviews/2026-11-23-fish-ease-vs-answers.md); judging gave few easy adults
  (7 of 387); the levers are #1493 (re-judged, held), the scripted re-cap route (REE-246, on hold) and REE-243.
- Exams and the reserve: REE-27 (#1489), REE-248 (#1492), REE-245 (#1494) — designs waiting for Pierre.
- REE-244 / REE-230: the check-in driver fixed; a real compaction still to observe.

## Next

Linear's [Now][now] and [Next][next]. Remaining decided Todo issues mostly need the core.js / Code.gs lane
(REE-28, 31, 32, 33, 34, 35, 38, 39, 240): one PR at a time; group sheet-script PRs into fewer trains (REE-234 study).

## Questions for Pierre

Morning batch (Rule 0): #1493 (merge the held re-judge?), REE-246 scripted route; REE-27 (a)–(g); REE-248 (quota A,
one pool, corals' cost); REE-245 (rare-then-more vs 10%, where it ends); REE-234 D3 amendment (no VERSION bump for
comment-only changes); REE-61 one-sided Cycloseris line; Acropora/Cyphastrea source discrepancy (C5). See also
[Decisions for Pierre](https://linear.app/reef-id/view/cc08634e-681a-4f23-bad9-44505f52118d).

Last question number: Q458

## Pierre's hands

See the issues assigned to Pierre in Linear and the app's Admin → Inbox → To do → Points.

## Parked after hours

The questions above.

## Last stop

2026-11-23 ~20:00 Manila, mid-session handoff; the integrator keeps working through the night (Rule 0: no questions).

[home]: https://linear.app/reef-id/document/project-home-reef-id-d5a0fef1ecbc
[now]: https://linear.app/reef-id/view/0be7e66e-2e7b-4832-9386-1bf6e4f76a59
[next]: https://linear.app/reef-id/view/1c09d0dd-02bb-4fd1-bde2-a6919f2d6418
