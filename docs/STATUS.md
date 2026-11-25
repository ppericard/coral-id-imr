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
- **2026-11-24 (Manila):** 41 PRs merged (counted from `git log` on main since 2026-11-23 20:00Z, the photo refill and
  curation commits apart). REE-265 steps 0–5 are merged: the per-answer cost is budgeted on every subject, in CI,
  deterministic, with the players and the data pinned (#1528, #1531, #1533, #1540, #1549, #1552).
- **Deploys fail about one run in two** (REE-279): a bounded second attempt merged in #1547. The fish refill that
  reported "exhausted" too early is fixed (#1545, REE-278). The sea slug game cap is lifted (#1544). Pierre's own
  observations always come in, whatever the room (#1534).
- **The Checks were never answered** (REE-252): the Reviews page, a weekly sample instead, is designed in #1551.
  Linear is on a paid plan.
- **Judging is on hold** (rule P7): no judging or re-judging by agents over 100 photos without Pierre's explicit OK.
- **2026-11-25 to 10:30 Manila:** merged #1556, #1557, #1559 (the count repeats), #1560, #1561, #1572 (REE-265: fish
  calls per answer down to 40–62k, 117k at fish:3000 seed 3, of which ~38k is `core.js` `treeTypeNames`), #1562,
  #1563 (`fifoq.sh`), #1564 and #1566 (v228, REE-38), #1565 (Red Team passes note), #1567 (REE-255 study),
  #1568 (v229, REE-33 fish common names), #1569 (REE-218 note), #1570 (REE-239 note), #1573 (v230, REE-293).
- **Running:** REE-265's next views (opening checks, ability chain; app.js, model.js, quiz.js, progress.js, sync.js);
  REE-34 PR 1 (the IMR vocabulary in `ORG`, core lane). Core lane next: REE-39, REE-28, REE-34 PR 2 and 4.
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
Todo. The core.js / Code.gs lane in order: REE-34 PR 1 (running), REE-39, REE-28, REE-34 PR 2 and 4.

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
  Team design C (REE-287, #1565); REE-255 option A; parking REE-239; REE-241 level A or B (#1571).
- Rule P7, counted 2026-11-24 23:40 (`tools/judging_fish.py todo`): fish 228 candidates not judged in 32 species (55
  from the fixed refill in 9 species, 173 older); sea slugs 2,579 in 261 species. Both over 100: his OK first.

Last question number: Q458

## Pierre's hands

See the issues assigned to Pierre in Linear and the app's Admin → Inbox → To do → Points.

## Parked after hours

The questions above.

## Last stop

2026-11-25 10:30 Manila, morning check-in.

[home]: https://linear.app/reef-id/document/project-home-reef-id-d5a0fef1ecbc
[now]: https://linear.app/reef-id/view/0be7e66e-2e7b-4832-9386-1bf6e4f76a59
[next]: https://linear.app/reef-id/view/1c09d0dd-02bb-4fd1-bde2-a6919f2d6418
