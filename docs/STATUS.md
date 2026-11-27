# Status

Mode: pilote (Pierre, 2026-11-27 09:52 Manila, the pause; named at 11:27; [INTEGRATOR "Work modes"][modes]): launch
only the tasks he picks, no scheduled tasks.

**Start with Linear [REE-312](https://linear.app/reef-id/issue/REE-312): the handover of 2026-11-26.** It holds the
state at handover, the decided work to launch, the studies, the questions not yet asked (with the two Drive dossiers),
Pierre's hands and how to work with him. Read it first, confirm or correct it in a comment, then use this file.

The next session's summary, rewritten at each stop by the integrator only; subagents report their updates to it.
Linear holds the truth (work, state, questions, who waits on what): [Project Home][home]. This file only summarises and
may be incomplete. `python3 tools/brief.py --short` gives live GitHub and sheet version signals; check-ins follow
[tools/checkin.md](../tools/checkin.md). [ANSWERS.md](ANSWERS.md) holds Pierre's answers; git and PRs hold what shipped.

Last checked: reports and events: 2026-11-27 06:49 Manila (nothing new; integrator via read-only agent). PRs, checks and
Linear re-read at 2026-11-27 ~09:50 Manila.

Night report: last sent 2026-11-27 (06:21 Manila, in the integrator's first reply)

## Now

Snapshot of 2026-11-27 ~09:50 Manila.

- **Integrator:** the Claude Code cloud session of 2026-11-27 (Manila).
- **Pause on new launches** (Pierre, 2026-11-27 09:52 Manila, REE-312 comment): «arrêtes de lancer de nouvelles
  tâches et puis qu'on puisse refaire un point à tête reposée»; the order he wants is 1 working mode, 2 foundations,
  3 features. No new agent or PR; the queue only merges PRs already green, reviewed and with no open question. Held on
  purpose: #1644 (a data format), #1554 (Q-a/Q-b), #1642 (CodeQL cutover). Frozen until the global point: REE-26 11(a)
  with REE-338/343, REE-335, REE-337 twice-weekly backup, REE-256, REE-352/REE-284 seams.
- **Merged today (27 November):** #1622, #1624, #1623, #1625, #1627, #1626, #1629, #1633, #1632, #1634, #1636 (sheet
  script v237, live and on main), #1638, #1628, #1637 (main 88749ba), #1635 (docs, restore), and any later merge (git
  holds them).
- **Open PRs:**
  - #1644 (REE-311 point 8, REE-26 11b: the Answers tab's Context and Offered columns), green: held, not queued and no
    version assigned, until Pierre answers point 1.1 of the global question pass (what the pause covers).
  - #1554 (REE-31, rights step 1), label `needs-pierre`: Q-a and Q-b of 09:43 wait for him; one check was still running
    on its head and Codex was asked again at 09:42 and 09:44.
  - #1642 (REE-121 c, CodeQL advanced setup): its three Analyze checks fail until Pierre's cutover from the default
    setup; it waits for him.
  - #1631 (REE-346, REE-345, the push guard): green, to train by hand.
  - Merged by the queue after this snapshot: #1640 (REE-348), #1641 (REE-352), #1630 (REE-342, sheet script v238),
    #1643 (REE-281); #1639 (REE-339) before it.
- **The global question pass** (written 10:15 Manila): Linear document "Global question pass · 27 November ·
  coherence-checked" on REE-312, 19 questions in Pierre's order, his actions, the integrator's calls, what is not due.
- **P2a trial** running since 2026-11-26 22:19 UTC (window to 2026-12-03 22:19 UTC); the register is on REE-229.
- **Foundation phase:** new feature dispatch is paused. The arbitration point document "Point d'arbitrage · phase
  fondations · 27 novembre" (Linear, on REE-312) holds the points; Pierre's answers of about 08:40 to 08:43 are on the
  tickets they concern.
- **Written, not to relaunch:** REE-297's studies A, B and review C; REE-310's outside review (Done); the Codex and
  Astra passes on REE-288 to REE-292 and REE-285's desk study.
- **Held, do not build from old words:** REE-248 (the reserve): recover his later details through REE-307.
- **Judging is on hold** (rule P7). REE-309 holds the pre-validated order of the passes; each run waits for his go.

## Next

The start order as of 2026-11-27 ~09:50 Manila, from REE-312 and the arbitration point, which keep the longer reasons.
One line per step: the issues, then the reason after the dash (REE-316; tests/docs.test.js checks the form).

Since Pierre's pause of 09:52, step 1 comes before every other: nothing launches until the global point.

1. REE-312: the consolidated question dossier and a global question pass with Pierre, in his order 1 working mode, 2
   foundations, 3 features — he asked for it at 09:52 before any further launch.
2. REE-311 point 8, REE-26 11(b): #1644 — after the global point (held: a data format); then merge.
3. REE-26 11(a), REE-338, REE-343: the Find the X fix, in one rules version — after the global point, and after #1644.
4. REE-335, REE-337: the 14-day keep and the twice-weekly backup — after the global point; contracts the later work
   relies on.
5. REE-121 (c) and (e): the CodeQL cutover with Pierre (#1642) and the budget alert in his settings — after the global
   point; only his hands can do them.
6. REE-31: step 1 (#1554) — after the global point, and his answers to Q-a and Q-b.
7. REE-256: the ids — after the global point, and the decisions of step 9.
8. REE-352, REE-284: the seams, with the test conversion — after the global point; the foundations the next features
   must fit.
9. REE-191, REE-26: the Astra reviews, run by Pierre, then the decisions they ask for — after the global point; his
   hands come first.
10. REE-312: the proposal to restart product work, REE-260 as the first feature — after the global point; he decides
    which features resume.

## Questions for Pierre

Linear's [Decisions for Pierre](https://linear.app/reef-id/view/cc08634e-681a-4f23-bad9-44505f52118d) view holds them,
not this file. Open as of 09:50: point 6 of the arbitration point (REE-345, the deny rules), point 7 (the disposable
Apps Script drill, REE-100 B), REE-31 Q-a and Q-b, the release ruleset (REE-72) and the budget alert (his settings).
REE-312 section 4 names what is not yet asked: dossier A's remainder and dossier B (71 issues, one batch, an ok or no
per line), and REE-297's A1, A2 and C1-C4. His standing remark: no engine change on statistical adjustments alone,
only bugs or fundamental logic.

Last question number: Q458

## Pierre's hands

The two Astra prompts (REE-191, REE-26), the CodeQL cutover (#1642), the release ruleset (REE-72), the budget alert
(his settings), and ANON_SALT in his password manager. Also in REE-312 section 5: send the IMR feedback document to the
trainers (REE-310), REE-74's curation, REE-61 (2) for an IMR expert, and REE-8 (gold set).

## Parked after hours

The questions above, in Linear.

## Last stop

2026-11-27 ~09:50 Manila, mid-session refresh by the integrator of 2026-11-27 (foundation phase); the next integrator
starts with REE-312 and the arbitration point.

[home]: https://linear.app/reef-id/document/project-home-reef-id-d5a0fef1ecbc
[modes]: INTEGRATOR.md#work-modes-auto-and-pilote
