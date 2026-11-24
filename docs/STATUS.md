# Status

Only the integrator updates this handoff, rewriting it at each stop. Subagents report their updates to the
integrator. Follow [Project Home][home] for work and decisions.
Use `python3 tools/brief.py --short` for current GitHub and sheet version signals; check-ins run
`python3 tools/brief.py --checkin` and follow [tools/checkin.md](../tools/checkin.md).
Search [ANSWERS.md](ANSWERS.md) for historical evidence and use git and PRs for what shipped.

Last checked: reports and events: 2026-11-23 ~15:55 Manila (Claude integrator; nothing new)

Night report: last sent 2026-11-24 (06:11 Manila)

## Now

- **A Claude Code integrator holds Pierre's durable mandate** since 2026-11-23 15:43 Manila: drain decided work
  (INTEGRATOR "Linear"), delegate, integrate. A Codex session may work on REE-121 / REE-220 (queue latency, branch
  `codex/ree121-pinned-queue`); check before touching tools/queue/. Merge only through `tools/queue/nightq.sh`, one
  queue process at a time; a background waiter needs the longest time limit. Study PRs that each add a row to
  docs/reviews/README.md conflict with each other once one merges: queue them one at a time, `uptodate.sh` between
  (REE-121 comment).
- **Judging is on hold** (rule P7): no judging or re-judging by agents over 100 photos without Pierre's explicit OK.
  Waiting for his OK: #1493 (254 re-judged eases), REE-243 (134 faved candidates beyond the cap), REE-257 (the
  `dup` extras), REE-252 (sea slugs: every photo).
- **The night (17:30 → 03:30):** 38 PRs merged, 41 trains, 0 red. Among them: REE-42 done (#1484, #1497, #1511), the
  simulator's fish typed answers fixed (#1502, REE-249) and made fast (#1514, REE-262), REE-35 look-alike names
  (#1509, sheet v224), REE-64 app.js split (#1496, #1510, #1513), the designs for REE-27, REE-245, REE-248, REE-56,
  REE-256, and the studies REE-85, REE-191, REE-252, REE-263.
- **Found at night, matters to players:** with a long fish history an answer takes 0.5–2.5 s of main-thread time on
  a desktop CPU and 2–13 s at 4–6× throttling (#1516, REE-263); corals stay at ~60 ms. Two fixes running (the
  false-alarm table armed in the app; `examLooks` with an index), no value changes.
- **In the queue or waiting:** #1515 (REE-32 sea slug species achievements, sheet v225, integrator's call; names and
  thresholds for Pierre's review), #1512 (REE-249 inventory), #1506 (blocked by a flaky test, REE-264, being fixed).
- **Held for Pierre (`needs-pierre`):** #1493, #1500 (the engine's guiding aims), #1507 (the issue-search guard).
- **Running:** REE-263 fix 1 (quiz.js/progress.js), REE-263 fix 3 (model.js), REE-264 (the flaky test).

## Active discussion

- **The engine's aims** (2026-11-23 evening; #1500, REE-191, REE-253): every player in their own zone at their own
  speed; easy questions cannot reveal an expert (#1503: corals' level at answer 50 against the last, Spearman 0.05);
  a good challenge is hard and identifiable; content is the binding constraint; formats multiply scarce content.
- **Photos:** what a duplicate is (REE-257, #1506: 61% of `dup` extras are another zoom or angle); every photo of an
  observation (REE-252); coral wide views answered better than the app expects (REE-255).
- **One data structure for every subject** (REE-256, #1508): the migration plan waits for Pierre (A–D).
- **Working method:** a rule not followed gets an issue (#1501; REE-251, REE-258); questions live only in Linear's
  Decisions view (REE-258).

## Next

Linear's [Now][now] and [Next][next]. The core.js / Code.gs lane is held by #1515 until it merges; then REE-240,
REE-34, REE-28, REE-38, REE-39, REE-33, REE-31, and the core/score.js comment for REE-263. app.js: REE-263 fix 2
(`lvlNext`), then REE-64's next piece (the lightbox `zoom` block).

## Questions for Pierre

The list is Linear's [Decisions for Pierre](https://linear.app/reef-id/view/cc08634e-681a-4f23-bad9-44505f52118d) view,
not this file (REE-258). The session document, blocking first, with the night's additions (REE-256, REE-243, REE-32)
at its end: [Questions for Pierre — session](https://docs.google.com/document/d/1-nDJdEg3NN49PdcKd7HBKU-8tbwnGBy9iuooKOypxqE/edit).
Pierre dives on 11-24 morning; the session on 11-24 afternoon or a day he does not dive. REE-192 needs a fresh Q
number (Q453 is #1391's).

Last question number: Q458

## Pierre's hands

See the issues assigned to Pierre in Linear and the app's Admin → Inbox → To do → Points.

## Parked after hours

The questions above.

## Last stop

2026-11-24 ~03:35 Manila, end-of-night handoff; the night report goes with Pierre's first message after 04:00.

[home]: https://linear.app/reef-id/document/project-home-reef-id-d5a0fef1ecbc
[now]: https://linear.app/reef-id/view/0be7e66e-2e7b-4832-9386-1bf6e4f76a59
[next]: https://linear.app/reef-id/view/1c09d0dd-02bb-4fd1-bde2-a6919f2d6418
