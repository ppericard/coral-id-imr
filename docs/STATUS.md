# Status

Only the integrator updates this handoff, rewriting it at each stop. Subagents report their updates to the
integrator. Follow [Project Home][home] for work and decisions.
Use `python3 tools/brief.py --short` for current GitHub and sheet version signals.
Search [ANSWERS.md](ANSWERS.md) for historical evidence and use git and PRs for what shipped.

Last checked: reports and events: 2026-11-23 ~15:55 Manila (Claude integrator; nothing new: no report since 11-21,
no `err` event)

Night report: last sent 2026-11-22 (15:25 Manila, late: a hook's false reminder, fixed in #1464)

## Now

- **The pause is over.** Since 2026-11-23 15:43 Manila a Claude Code integrator holds Pierre's durable mandate
  («un mandat général pour poursuivre les travaux déjà décidés dans les limites d'autonomie du projet»): drain decided
  work, delegate, integrate. A Codex session may work on REE-121 / REE-220 (queue latency); check its branches
  (`codex/*`) before launching queue or CI work. The integrator alone merges.
- **Incidents of the day, fixed.** The sheet script was stuck at v218: Apps Script's 200-version limit (REE-234;
  Pierre deleted old versions, v220 deployed 16:19). The durable fix (a warning before the limit, fewer versions per
  comment-only change) is REE-234's next action. The hourly Analyses report failed on a network reset after a long
  compute: #1473 (REE-235); Done once an hourly run stores the fish report (a run was dispatched at 16:52).
- **Merged today:** #1470 (Codex: the queue keeps the reviewed head), #1472 (REE-214), #1473 (REE-235), #1475 (rules
  W24 and L11, ledger, the REE-85 study). Use `tools/queue/nightq.sh N` for every merge: it waits for the checks and both
  Codex reviews, then trains the reviewed head.
- **In the queue or in progress:** #1474 (REE-43, coral 45-genus scale, sheet v221 assigned), #1476 (REE-198, most-faved
  refill), #1471 (REE-40: under W27 the claim mechanism was cut, then one storage key per visit; if Codex finds another
  issue in its recovery part, ship without it), #1409 (REE-51, approved; blocked by the fish-fresh flake REE-238, an
  agent investigates), REE-237 (admin counts Key use as activity), REE-238.
- **Held:** #1391 (REE-197). Pierre prefers continuous mechanisms to thresholds; the draw's redesign waits for
  REE-85's decisions. Asked 17:05: merge #1391 as a stop-gap so the 387 waiting candidates can be judged.

## Active discussion

- **Fish ease (REE-85):** [study](reviews/2026-11-23-fish-ease-vs-answers.md); its "experts and response time" section
  (the over-performance on hard photos came from 3 strong players; time confirms ease; blur is a real difficulty) is
  in the integrator's scratchpad and goes into the study by a follow-up PR. Q455–Q458 open, revised recommendations in
  REE-85's comment of 16:49.
- **A player who uses only the Key (REE-236):** Pierre asks the player himself; the desktop mode waits for the answer.
- **REE-230:** no real compaction observed yet in this session.

## Next

Linear's [Now][now] and [Next][next]. The working-method project is ranked (2026-11-23): REE-229 study next when a
machine slot frees, then REE-181's close at this handoff's merge (the successor recovery was observed: the only gaps
were the Linear connector not yet connected on this account and this file still saying "paused").

## Questions for Pierre

See [Decisions for Pierre](https://linear.app/reef-id/view/cc08634e-681a-4f23-bad9-44505f52118d). Open: Q455–Q458
(REE-85), #1391 as a stop-gap, faved candidates beyond the cap (recommendation: not now).

Last question number: Q458

## Pierre's hands

See the issues assigned to Pierre in Linear and the app's Admin → Inbox → To do → Points.

## Parked after hours

None.

## Last stop

2026-11-23 ~17:15 Manila, mid-session handoff (90-minute mark); the integrator keeps working.

[home]: https://linear.app/reef-id/document/project-home-reef-id-d5a0fef1ecbc
[now]: https://linear.app/reef-id/view/0be7e66e-2e7b-4832-9386-1bf6e4f76a59
[next]: https://linear.app/reef-id/view/1c09d0dd-02bb-4fd1-bde2-a6919f2d6418
