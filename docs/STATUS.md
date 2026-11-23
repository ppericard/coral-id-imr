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
  time (parallel runs collide on main; REE-220). A queue waiter run in the background needs the longest time limit
  (one was cut at 30 minutes mid-run, 20:50; nothing merged half-way).
- **Judging is on hold** (rule P7, #1491): no judging or re-judging by agents over 100 photos without Pierre's explicit
  OK with count, purpose, why an agent and cost. #1493 (`needs-pierre`) holds 254 ease changes judged before the rule.
- **Merged since 20:00:** #1491 (rule P7), #1488 (judging batch 3), #1494 (REE-245 design), #1495 (STATUS), #1492
  (REE-248 design), #1496 (REE-64: install.js), #1499 (REE-85 experts and response time). #1497 (REE-42 step 2, sheet
  v223) in its train at 21:34.
- **In the queue next:** #1487 (REE-243, 134 faved photos beyond the cap), #1489 (REE-27 design), #1498 (REE-56 hunt
  design), #1502 (REE-249 learnsim fix), #1503 (REE-191 study), #1504 (REE-252 study), #1501 (a rule not followed gets
  an issue).
- **Held for Pierre (`needs-pierre`):** #1493; #1500 (the engine's guiding aims, digested; the rules' wording guide);
  the issue-search guard (REE-251), PR coming.
- **Running:** REE-35 (look-alike names; opens its PR only after #1497 merges), REE-64 next piece (holds app.js),
  REE-256 (one id scheme: design note), REE-257 (what a duplicate is: a 100-photo look), the issue-search guard.

## Active discussion

- **The engine's aims** (Pierre 20:40–21:31; #1500, REE-191, REE-253): every player in their own zone at their own
  speed; easy questions cannot reveal an expert (confirmed on the real log, #1503: corals' level at answer 50 against
  the last, Spearman 0.05); a good challenge is hard and identifiable; content is the binding constraint; formats
  multiply scarce content. The placement test (REE-112) stays first: several tries on one photo (typed, then choices),
  and a card to offer it again. Probes that do not count: kept as a concept (REE-253).
- **Photos of one observation** (REE-252, #1504): fish extras are dropped as `dup` (82%), by design but the definition
  is in question (REE-257); coral wide views are answered better than the app expects (+7.5 points, REE-255); sea slugs
  take one photo per observation (an undeclared difference, rule S1).
- **One data structure for every subject** (REE-256): the corals' bare-name ids; Pierre allows rewriting data to
  homogenise (21:31); the migration plan goes to him first.
- **The simulator** (REE-249, #1502): learnsim typed unit ids, so fish typed answers were never taken; freezes since
  #1375 (11-21), a quieter bias since 11-06. After #1502: inventory of fish decisions resting on app-world learnsim.
- **Working method:** a rule not followed gets an issue labelled "Rule not followed" (#1501; REE-251 is the first);
  the issue-search guard answers Pierre's 21:32 worry that the practice vanishes at a compaction. REE-230: the first
  real compaction (20:05) recovered the mandate and work in progress.

## Next

Linear's [Now][now] and [Next][next]. The decided Todo issues left need the core.js / Code.gs lane (REE-28, 31, 32,
33, 34, 38, 39, 240, 256's steps): one PR at a time, after #1497 and REE-35; app.js after REE-64's next piece (then
REE-42's "Not now" on the clock).

## Questions for Pierre

Morning batch (Rule 0), with the night report: #1493 and REE-246; REE-27 (a)–(g); REE-248; REE-245; REE-234 D3
amendment; REE-61 Cycloseris line; Acropora/Cyphastrea (C5); REE-56 (a)–(f); REE-191 (b) finer ranks sooner, one rule
for every subject; Q385 vs probes (REE-253); #1500's principles; REE-147 speed for experts (and "never rewards time"
read on speed); REE-252 (a) another zoom: alt or dup, (b) sea slugs: every photo or a declared exception; REE-223:
should species sheets skip watermark-flagged photos; the issue-search guard. See also
[Decisions for Pierre](https://linear.app/reef-id/view/cc08634e-681a-4f23-bad9-44505f52118d).

Last question number: Q458

## Pierre's hands

See the issues assigned to Pierre in Linear and the app's Admin → Inbox → To do → Points.

## Parked after hours

The questions above.

## Last stop

2026-11-23 ~21:35 Manila, mid-session handoff; the integrator keeps working through the night (Rule 0: no questions).

[home]: https://linear.app/reef-id/document/project-home-reef-id-d5a0fef1ecbc
[now]: https://linear.app/reef-id/view/0be7e66e-2e7b-4832-9386-1bf6e4f76a59
[next]: https://linear.app/reef-id/view/1c09d0dd-02bb-4fd1-bde2-a6919f2d6418
