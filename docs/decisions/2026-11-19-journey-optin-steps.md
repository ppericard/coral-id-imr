# The Journey lists the opt-in choices of every subject beside its steps

Date: 2026-11-19. PR: #1166. Rules or docs touched: A2; ROADMAP "Fish admin at parity"; docs/spec/admin-players.md.

## Context

The fish's opt-in choices (Scientific names on, circle 3 offered, declined or opened) and the corals' bonus genera live
in the subject's quiz settings in the player's saved copy, with the time of each choice and the offer's "Not now"
count. The Journey read the cards, the Open all offer and the first-launch answer from that copy but not these, so the
fish Journey did not say when a player turned the scientific names on or declined circle 3.

## Decision

Integrator's call (wording and place; easy to correct): `admin-journey.js` `jOptin` lists each opt-in set of the
subject (`SUBJECTS` `optin`) under Cards and steps, in time order, from the saved copy: on (by hand before it was due,
or not) or off, with the time of the latest choice, and the offer's declines as a line of their own with the answer count
of the last "Not now" and no time (the saved time is the latest toggle's, so it is not the decline's). Written in the admin's own words
(`JOPT`), not on the chart (the choice has a time, not an answer index). The corals' bonus genera come with it, the same
code.

## Consequences

`admin.js` `savedPump` also reads `quiz` of each subject. Tests: `tests/journey.test.js` (`jOptin`), the admin smoke's
fish Journey (the demo's Ben has both). `core.js` and `Code.gs` untouched.
