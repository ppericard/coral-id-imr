# "Did you know?" tip (c): My mix-ups, for players with several pairs mixed up who never saw the view

Date: 2026-11-21. PR: #1420. Rules or docs touched: S1, W19; docs/spec/cards.md "Did you know tips"; REE-13.

## Context

The owner decided on 2026-11-04 (paraphrase, as recorded in REE-13) that "Did you know?" pop-ups serve players who never used a feature, enabled one at a time, each target checked on the answer log first. Tips `zoom`, `custom` (a) and `duels` (b) were built. Candidate (c), in the list he agreed: "My mix-ups (the custom quiz's view, or My progress 'Often mixed up'): a player with several pairs confused 3+ times who never opened it". The 2026-11-21 06:25 stop was lifted by his 14:41 request («Proceed with the migration and normal project work»).

## Decision

Tip `mixups` is one `tips.js` registry entry plus one counter, `u.m`, the times the Custom quiz's My mix-ups view was drawn (`quiz.js` `viewCustom`; a saved choice of that view folds in as one). It is for a player with 100 questions or more here who has mixed up at least 2 pairs 3 times or more and never saw the view, in the Quiz and the Custom quiz, best at the Next right after a miss, twice at most, 150 questions apart, after the other three tips. Show me opens the Custom quiz's picking page on the My mix-ups view.

The audience is read on the player's own record, not on a counter: `quiz.js` `tipAfter` counts the pairs `mixEdges` already weighs for the view (both ways added) whose total reaches `TIPR.MIX` (3), only while `u.m` is 0, and passes the count to the tip as `b.mix`; `tipDue` now gives `target` the break as well (`target(u, b)`).

Integrator's calls, each easy to correct: "several" is 2 pairs or more; 100 questions as the first showing; the contexts (the Quiz and the Custom quiz, where the view lives); the wording of the card, taken from the Custom quiz page's own lede; the caps; counting `m` whenever the view is drawn; Show me setting the view the page keeps; no tip for My progress's "Your tricky pairs" (it is on the page with no tap, so there is no feature to open).

The answer-log check that came first (aggregates only, 2026-11-21, the Answers tab as saved at 18:21 Manila time for another study, 7,445 rows, as many as the live tab held at 20:50) is in the PR's Tests section: corals, 10 players with 100+ game answers, 8 of them with 2 or more pairs mixed up 3+ times (1 to 18 such pairs each); fish, 7 with 100+, 5 with 2 or more.

## Consequences

- The log cannot say who saw the My mix-ups view (the view is a tap inside a page, no answer or page row records it, and the Custom quiz's answers are the Quiz's), so the "never opened it" half of the target is not measured (the Pages tab's `practice.custom` rows were not counted either: they would only bound the Custom quiz's opens, not the view's); `m` counts from the device on. A player who used the view before `m` existed and left another view chosen may get the tip once or twice.
- The counter is per device and not per subject, like the other tips'; the view is per subject, so a player who used it in one subject may be sent to it in another.
- A player who opens the Custom quiz from Show me finds the My mix-ups view chosen, and it stays their view until they pick another.
- Tips (d) to (h) of REE-13 follow one at a time, each with its own check on the answer log.
- Specified in [cards.md](../spec/cards.md#did-you-know-tips).
