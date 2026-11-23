# Pages opened: pagehide also queues the summary; keeping it across a killed page left for its own issue

Date: 2026-11-23. PR: #1471. Rules or docs touched: spec/sync.md "Events and pages".

## Context

The pages-opened summary of a visit is held in memory and queued only when the app is hidden. A page closed or reloaded
without that event, or killed with no event at all (the app or the phone stopped, a crash, a computer asleep with the
app in view), lost its visit, so activity outside the quiz went uncounted. Pierre asked how to track activity outside
the quiz on 2026-11-08; part C2 of that work, keeping the count across such a page, is REE-40.

## Decision

Integrator's call (REE-40: "C2 is the integrator's call, design first"; AGENTS.md "Working mode", implementation details
with no player-facing effect). What ships: `pagehide` queues the summary as the hidden event does, for a browser that
closes or reloads a page without a hidden event first. After a hidden event the tally is empty, so nothing is queued
twice. No sheet change: the same event and fields, so an older sheet script takes it (rule D4).

What left the PR (integrator's decision under rule W27, 2026-11-23): keeping the summary across a page killed with no
event. The design kept a copy of each visit's summary in localStorage, rewritten every 15 s, and had the next page send
a copy left unwritten for two minutes. Six Codex findings in a row all came from one cause: pages coordinating through
localStorage, which has no compare-and-delete or other atomic step across tabs. The cases were a copy pushed out by a
limit; a later tally taken for one already sent; openings and feedback counted after a claim and lost; a resend beyond
the sheet's 2,000-row id check; two windows' read-modify-write of a shared map; and a check-then-take race and a silent
failed write. Each redesign (one event id, one local rule, one writer per key) removed one class and exposed the next.

## Consequences

`sync.js`: a `pagehide` listener calls `pagesSend` and `sendEvents`, tested in `tests/pages.test.js` (queued once alone,
after the hidden event, and after coming back) and the `visit` part of `tests/pages.smoke.js`. A page killed with no
event still loses its summary so far. Keeping it moves to a new issue (the integrator creates it). Candidate models: the
Web Locks API (`navigator.locks`) as a mutex across tabs around taking and rewriting a copy, or a single writer chosen
over a BroadcastChannel. No `reefid-pv-live` keys need cleaning: no released build ever wrote them (this PR never
merged with them).
