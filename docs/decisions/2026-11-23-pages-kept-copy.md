# Pages opened: the visit's summary kept on the device, so a page killed without a hidden event still sends it, once

Date: 2026-11-23. PR: #1471. Rules or docs touched: spec/sync.md "Events and pages".

## Context

The pages-opened summary of a visit was held in memory and queued only when the app was hidden. A page killed without
that event (the app or the phone stopped, a crash, a computer asleep with the app in view, a browser that closes a page
without a hidden event) lost its visit, so activity outside the quiz went uncounted. Pierre asked how to track activity
outside the quiz on 2026-11-08; part C2 of that work, keeping the count across such a page, is REE-40.

## Decision

Integrator's call (REE-40: "C2 is the integrator's call, design first"; AGENTS.md "Working mode", implementation details
with no player-facing effect). While the visit runs, the summary so far is also written to the device, as it would be
queued, under its tally's event id: when a page opens and every 15 s while in view. Queuing the
summary drops the copy and starts a new tally with a new event id. `pagehide` queues the summary too. No sheet change:
the same event and fields, so an older sheet script takes it (rule D4).

**One local rule** (integrator's decision under rule W27, 2026-11-23): a tally whose copy has not been written for two
minutes is sent as it is, under its own event id, by whichever page sees it first (another page at load or at its beat;
its own page back in view or before its tally changes), and the live page never goes on with a stale tally: it starts a
new one under a new event id. No page needs to know whether another page already sent something.

**The store entry is the token** (a review finding on the rule above, the same day). The rule first let a copy be sent
twice and relied on the sheet keeping the first row of an id, but the sheet only checks its last 2,000 rows: a tab
restored long after another page sent its copy would be counted twice. So "sees it first" means "takes it out of the
store first": a page removes a stale copy from the store, then sends it; its own page, back, sends it only if it is
still there. Each copy is sent once, by the page that removed it, whatever the sheet remembers. A device whose storage
refuses the copy sends its own stale tally itself (no other page can have it). Nothing pushes a copy out any more (the
five-visit limit is gone): only the pages in view and the killed pages not yet found have one, so the store stays small
and a copy is never lost to a limit.

**One writer per key** (integrator's decision, the same day, on a further review finding). The copies first lived in
one shared map that every page read, changed and wrote back: two windows in view could interleave, one writing back a
map read before the other's write, and drop the other's copy, lost if that page was then killed. Each visit now has a
key of its own (`reefid-pv-live-<visit id>`): a page writes only its own key, and another page only reads one and
removes it, found by listing the keys with that prefix. That removes the shared read-modify-write, and with it the
whole class. Two pages taking the same copy at the same instant both send it under one id; the device's queue and the
sheet's check of recent ids absorb that rare case. The shared map of the earlier build is removed at load.

**Why the rule replaced the claim mechanism.** The first design had the live page find out whether another page had
already queued its copy (a "claim"), by the copy being gone, then by a list of recovered ids, then reconciled at each
place the tally changes. Codex found four problems in a row in that part (a copy pushed out by the five-visit limit, a
later tally after a recovery, an opening and then feedback counted after a claim, all lost). Each came from the same
cross-page question asked at one more place. The local rule removes the question, and with it the whole class: the
recovered-ids list and the claim checks are gone.

## Consequences

`sync.js` `pvKeep`, `pvRecover`, `pvRoll`, `pvQueue`, `pvDone`, `pagesSend`, `fbTally`, `pvTake`, `pvVisits`; the storage keys
`reefid-pv-live-<visit id>`, moved to the account at sign-in (with the page's own copy in memory) and dropped at
sign-out like the queued summaries. A killed visit's summary arrives
later, with the time of its last write. Up to one beat (15 s) before a kill or a sleep is lost; a page that misses its
beats for two minutes while in view starts a new tally (its summary is split, nothing counted twice). Specified in
docs/spec/sync.md "Events and pages"; tested in `tests/pages.test.js` and the `visit` part of `tests/pages.smoke.js`.
