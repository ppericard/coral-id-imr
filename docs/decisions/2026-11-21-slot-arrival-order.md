# The machine slot serves its waiters in arrival order

Date: 2026-11-21. PR: #1424. Linear: REE-206. Rules or docs touched: rule W24 (docs/rules/ship.md), `tests/slot.js`.

## Context

On the night of 2026-11-21 about 20 agents shared 2 slots on the 4-core machine. `tests/slot.js` had no order: a freed
slot went to whichever waiter polled first, and some waiters starved for 70-100 minutes while later ones got through.

## Decision

Each waiter takes a ticket, a file `ticket-<ms>-<pid>-<random>` in the slots directory, written whole the way holders'
records are (a file of its own, then linked into place); the fixed-width names sort in arrival order. A waiter tries the
slots only while the live tickets older than its own are fewer than the free slots, so a free slot goes to the oldest
live ticket. A ticket whose process is gone (the holders' PID and start-time check) is skipped and taken back, so a
waiter that dies while waiting never blocks the queue. The ticket is dropped whenever its waiter stops waiting (a slot,
a timeout, a refusal, an exit). A holder's children (`REEFID_SLOT`) still never wait nor take a ticket; a directory
with no tickets works as before, and waiters running an older `tests/slot.js` keep working (they take no ticket, so
they can still jump the queue until their worktree has this version). `tools/slot.py` has no waiting loop of its own:
it re-runs the tool under `node tests/slot.js`, which queues. A tooling fix of something plainly broken: integrator's
call (REE-206).

## Consequences

W24 says so in one bullet, with the wave note's "one command per slot". Not done here (REE-206, item 2, optional):
refusing a long-lived dispatcher command. A waiter that is alive but stuck (stopped, never polling) keeps its turn: the
liveness check cannot see it.
