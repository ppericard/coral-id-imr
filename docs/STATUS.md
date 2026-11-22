# Status

Only the integrator updates this handoff, rewriting it at each stop. Subagents report their updates to the
integrator. Follow [Project Home][home] for work and decisions.
Use `python3 tools/brief.py --short` for current GitHub and sheet version signals.
Search [ANSWERS.md](ANSWERS.md) for historical evidence and use git and PRs for what shipped.

Last checked: reports and events: 2026-11-22 ~15:10 Manila (Claude, REE-222 mission)

Night report: last sent 2026-11-22 (15:25 Manila, late: a hook's false reminder, fixed in #1464)

## Now

- Pierre paused the Claude Code integrator on 2026-11-22 at 07:27 Manila. The last in-flight product PR,
  [#1390](https://github.com/ppericard/coral-id-imr/pull/1390), has merged. The handoff was received (REE-231, Done).
  [#1460](https://github.com/ppericard/coral-id-imr/pull/1460)
  brought the [queue reference scripts](../tools/queue/recovered/README.md) and study code for
  [REE-112](../tools/studies/ree112/README.md) and [REE-191](../tools/studies/ree191/README.md) onto main.
  The recovered queue scripts were unreviewed and untested. Exact study input extracts were unavailable in shared storage.
- On 2026-11-22 at 14:37 Manila Pierre gave a new Claude Code integrator one bounded mission,
  [REE-222](https://linear.app/reef-id/issue/REE-222): done, [#1462](https://github.com/ppericard/coral-id-imr/pull/1462)
  merged through a green train. The general resumption of the backlog waits for his end-of-mission review; the
  takeover notes are in [REE-230](https://linear.app/reef-id/issue/REE-230).
- A second bounded mission (REE-230) integrated Codex's [#1464](https://github.com/ppericard/coral-id-imr/pull/1464):
  the startup hooks refresh `origin/main` (bounded, 3 s) before running the reviewed brief and instructions log, and
  no hook says the night report is due any more (the "Night report" line above is the evidence). Checked for real in
  the cloud container from this morning's stale ref. Still to observe: a real compaction with these hooks.
- [Health #1458](https://github.com/ppericard/coral-id-imr/issues/1458) is open. The hourly "Analyses report" workflow
  has also failed at every run since 2026-11-22 00:46 UTC ("The sheet did not store the report (no reply)"), likely
  the same stuck sheet script; not tracked elsewhere yet. The check reported served sheet
  script v218 against v220 on main. Use the brief for current signals. Scheduled workflows and triggers
  can still run during the pause. The incident is tracked on GitHub.

## Active discussion

- [REE-229](https://linear.app/reef-id/issue/REE-229) carries the wider handoff and the question about when to open
  an issue for an unresolved problem. The [Drive handoff][handoff]
  includes the recovery inventory. The scope of that proposed rule and the pace of a later restart are open.
- [REE-230](https://linear.app/reef-id/issue/REE-230) tracks recovery of the shared work arrangement. Options (a)
  and (b) merged in [#1455](https://github.com/ppericard/coral-id-imr/pull/1455). Option (c), a rule for adopted
  studies, is open. Recovery after Claude compaction still needs to be observed.

## Next

For the Claude Code side, see the pause above. For permitted work, use [Now][now]
and [Next][next]. Check the issue's latest comments
and linked PR before starting.

## Questions for Pierre

See [Decisions for Pierre](https://linear.app/reef-id/view/cc08634e-681a-4f23-bad9-44505f52118d). Also check PRs
marked `needs-pierre`. [#1391](https://github.com/ppericard/coral-id-imr/pull/1391) (REE-197) and
[#1409](https://github.com/ppericard/coral-id-imr/pull/1409) (REE-51) were still waiting at this handoff.
The previous handoff also asked to confirm that “Delete, keep answers” removes report images.
[#1354](https://github.com/ppericard/coral-id-imr/pull/1354) shipped that behaviour as an integrator's call.
The PR records no separate answer from Pierre on this point.

Last question number: Q452

## Pierre's hands

See the issues assigned to Pierre in Linear and the app's Admin → Inbox → To do → Points.

## Parked after hours

None carried over from the handoff.

## Last stop

2026-11-22 ~17:15 Manila, after the REE-230 hooks mission (#1464); before it, the REE-222 mission (#1462). Before
those, the Claude Code side had returned to the pause after #1460; the workspace observations are in the Drive handoff addendum. Check current work and live status through
the sources above.

[home]: https://linear.app/reef-id/document/project-home-reef-id-d5a0fef1ecbc
[handoff]: https://docs.google.com/document/d/1agtmEbHc6f3QD1qdFWMxkCts9QciYT1FEdRuHah3kWM/edit
[now]: https://linear.app/reef-id/view/0be7e66e-2e7b-4832-9386-1bf6e4f76a59
[next]: https://linear.app/reef-id/view/1c09d0dd-02bb-4fd1-bde2-a6919f2d6418
