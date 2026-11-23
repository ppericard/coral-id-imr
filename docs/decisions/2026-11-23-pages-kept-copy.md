# Pages opened: the visit's summary kept on the device, so a page killed without a hidden event still sends it, once

Date: 2026-11-23. PR: #1471. Rules or docs touched: spec/sync.md "Events and pages".

## Context

The pages-opened summary of a visit was held in memory and queued only when the app was hidden. A page killed without
that event (the app or the phone stopped, a crash, a computer asleep with the app in view, a browser that closes a page
without a hidden event) lost its visit, so activity outside the quiz went uncounted. Pierre asked how to track activity
outside the quiz on 2026-11-08; part C2 of that work, keeping the count across such a page, is REE-40.

## Decision

Integrator's call (REE-40: "C2 is the integrator's call, design first"; AGENTS.md "Working mode", implementation details
with no player-facing effect). While the visit runs, the summary so far is also written to the device, under its visit
id, as it would be queued: when a page opens and every 15 s while in view, at most five visits. The next page queues,
once, a copy of another visit left two minutes unwritten (a page open in another window rewrites its own every 15 s).
Queuing the summary drops the copy. A page whose copy was queued elsewhere starts its tally again; the copy and the
live summary share one event id, which the sheet keeps once. `pagehide` queues the summary too. No sheet change: the
same event and fields, so an older sheet script takes it (rule D4).

## Consequences

`sync.js` `pvKeep`, `pvRecover`, `pvClaimed`, `pvDone`, `pagesSend`; the storage key `reefid-pv-live`, moved to the
account at sign-in and dropped at sign-out like the queued summaries. A killed visit's summary arrives later, with the
time of its last write. Up to 15 s of a killed page, and the time between a sleep and the next beat, are lost. Specified
in docs/spec/sync.md "Events and pages"; tested in `tests/pages.test.js` and the `visit` part of `tests/pages.smoke.js`.
