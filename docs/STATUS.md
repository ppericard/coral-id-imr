# Status

Only the integrator updates this handoff, rewriting it at each stop. Subagents report their updates to the
integrator. Follow [Project Home][home] for work and decisions.
Use `python3 tools/brief.py --short` for current GitHub and sheet version signals; check-ins run
`python3 tools/brief.py --checkin` and follow [tools/checkin.md](../tools/checkin.md).
Search [ANSWERS.md](ANSWERS.md) for historical evidence and use git and PRs for what shipped.

Last checked: reports and events: 2026-11-24 ~22:00 Manila (Claude integrator; end of day)

Night report: last sent 2026-11-25 (06:22 Manila)

## Now

- **A Claude Code integrator holds Pierre's durable mandate** since 2026-11-23 15:43 Manila: drain decided work
  (INTEGRATOR "Linear"), delegate, integrate. A Codex session may work on REE-121 / REE-220 (queue latency, branch
  `codex/ree121-pinned-queue`); check before touching tools/queue/. Merge only through the queue: one call per wave,
  `bash tools/queue/fifoq.sh N…` from the main checkout, in the background with the longest time limit (it runs
  `nightq.sh` in arrival order; #1563). Study PRs that each add a row to docs/reviews/README.md conflict with each
  other once one merges: `uptodate.sh` between (REE-121 comment).
- **New working rules, 2026-11-25** (#1562, REE-244): every open Linear issue is to be done unless it carries one of
  five reasons; an unblock sweep runs about every 90 minutes; a PR that waits only for Pierre yields its lane (W27);
  studies are Study › Decision input or Study › Open inquiry. Agents' briefs repeat W27's stop on findings that
  come back twice on one part. A fresh agent per PR keeps the cost down (REE-244 comment on the night's quota).
- **Deploys fail about one run in two** (REE-279): a bounded second attempt merged in #1547. The fish refill that
  reported "exhausted" too early is fixed (#1545, REE-278). The sea slug game cap is lifted (#1544). Pierre's own
  observations always come in, whatever the room (#1534).
- **The Checks were never answered** (REE-252): the Reviews page, a weekly sample instead, is designed in #1551.
  Linear is on a paid plan.
- **Judging is on hold** (rule P7): no judging or re-judging by agents over 100 photos without Pierre's explicit OK.
- **2026-11-25 to 16:45 Manila:** 30 PRs merged (git log, from midnight Manila). Among them: REE-265 cuts (#1572, #1576, #1583, #1591: every
  state under 100k calls an answer), REE-34 PRs 1–3, REE-294 note and PRs 1–3, REE-39 (v232), REE-28 steps 4 and 9
  (v233, v234), REE-38 (v228), REE-33 (v229), REE-293 (v230), REE-13 tips (g) and (h), REE-193 refit, REE-295.
- **2026-11-25, 16:45 to 22:05 Manila:** merged #1592 and #1593 (REE-34 PRs 2 and 4), #1595 (REE-296, the Analyses
  read `ORG`), #1594 (REE-294 PR 4, the Lab): no "IMR" left in code outside the guarded `KEEP` list, REE-34 Done.
  #1596 (joint reading of the 13 "Rule not followed" issues; 5 closed, 7 proposals in REE-297). #1597 (REE-229:
  `tools/agent-brief.md`, the common agent brief). #1598 (REE-265: answers over 100k calls 10 → 6; heaviest answer
  budgeted). Closed after checks on real runs: REE-278 (refill: +318 fish photos in 61 species), REE-279 (48 of 48
  deploys, 22 by the second attempt), REE-274.
- **The answer log is nearly still since 2026-11-22**: most player-count gates need a new RA intake. REE-39's wait
  needs more admin opens (n=3 after v232). REE-28 step 6 measured: 0 devices at risk today (question below).
- **Running:** REE-265 the typed-name build peak (`core.js`, core lane) and option (a), the draw's views filled in
  idle time (`model.js`, `app.js`). Next: options (b) and (c) need a decision; REE-64 next split after app.js frees.
- **Waiting for Pierre with a ready PR:** #1554 (REE-31) and #1571 (REE-241, level choice A/B); both yield their lane.

## Active discussion

- **The engine's aims** (2026-11-23 evening; #1500, REE-191, REE-253): every player in their own zone at their own
  speed; easy questions cannot reveal an expert (#1503: corals' level at answer 50 against the last, Spearman 0.05);
  a good challenge is hard and identifiable; content is the binding constraint; formats multiply scarce content.
- **Photos:** what a duplicate is (REE-257, #1506); every photo of an observation (REE-252); coral wide views
  answered better than the app expects (REE-255).
- **One data structure for every subject** (REE-256, #1508): the migration plan waits for Pierre (A–D).
- **Working method:** a rule not followed gets an issue (#1501; REE-251, REE-258); questions live only in Linear's
  Decisions view (REE-258).

## Next

Every open Linear issue without one of the five reasons (INTEGRATOR "Linear"); the sweep moves the unblocked ones to
Todo (Todo is empty after the 21:49 sweep: every open issue carries a reason or is running). REE-28's open steps
wait on decisions (3, 6, 7, 8, 11) or a calibration (10). Data gates are re-measured in the morning.

## Questions for Pierre

The list is Linear's [Decisions for Pierre](https://linear.app/reef-id/view/cc08634e-681a-4f23-bad9-44505f52118d) view,
not this file (REE-258). Open items by issue; the question text lives in Linear:

- REE-31: access rules (#1554).
- REE-252: R1–R7 of #1551, the corals' path.
- REE-121: the five CI-cost questions of #1553.
- REE-245: Q1.
- REE-275: (a), (d), (e), (f).
- REE-8 and REE-275: the two review sets waiting for his answers.
- Asked 2026-11-25 morning: the Scheduled mechanism (REE-218, #1569); data waits as reason 2; REE-217 (P7); the Red
  Team design C (REE-287, #1565); REE-255 option A; parking REE-239; REE-241 level A or B (#1571); REE-294 (a)–(d);
  the counting rule for data gates (data gates count every usable answer, people gates count people); REE-101 (a)/
  (b)/(c); REE-102 (do fish errors count toward 650?); REE-7 / Q439 (frees REE-9, 67, 68, 69).
- Added 2026-11-25 evening: REE-297 (the joint reading's 7 proposals); REE-28 step 6 (one sign-in rule for every
  subject: the corals' or the others'); REE-265 options (b) and (c) (keep the draw's views across loads; per-photo
  constants in the game files, a data format); REE-277 (rebuild gold set 2 if REE-282 finds no key); REE-229 P2a, P5.
- Rule P7, counted 2026-11-24 23:40 (`tools/judging_fish.py todo`): fish 228 candidates not judged in 32 species;
  sea slugs 2,579 in 261 species. The refill has added 318 fish photos since: recount in the morning, his OK first.

Last question number: Q458

## Pierre's hands

See the issues assigned to Pierre in Linear and the app's Admin → Inbox → To do → Points.

## Parked after hours

The questions above.

## Last stop

2026-11-25 22:05 Manila, during the quiet hours; the questions above wait for Pierre's first message after 04:00.

[home]: https://linear.app/reef-id/document/project-home-reef-id-d5a0fef1ecbc
[now]: https://linear.app/reef-id/view/0be7e66e-2e7b-4832-9386-1bf6e4f76a59
[next]: https://linear.app/reef-id/view/1c09d0dd-02bb-4fd1-bde2-a6919f2d6418
