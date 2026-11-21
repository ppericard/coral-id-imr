# "Did you know?" tip (b): the look-alike duels, for players who never opened the Duel tab

Date: 2026-11-21. PR: #1370. Rules or docs touched: S1, W19; docs/spec/cards.md "Did you know tips"; REE-13.

## Context

The owner decided on 2026-11-04 (paraphrase, as recorded in REE-13) that "Did you know?" pop-ups serve players who never used a feature, enabled one at a time, each target checked on the answer log first. Tips `zoom` and `custom` (a) were built. Candidate (b) is the Duel tab: players who never played it after about 150 quiz answers with mix-ups on record. The 2026-11-21 06:25 stop was lifted by his 14:41 request («Proceed with the migration and normal project work»).

## Decision

Tip `duels` is one `tips.js` registry entry plus one counter, `u.d`, the opens of the Duel tab (`quiz.js` `quizDuel`, when its page opens; a Duel tab answer in the device's log folds in as one). It is for a player with 150 questions or more here who never opened the Duel tab, in the Quiz only, best at the Next right after a miss, twice at most, 150 questions apart, after the zoom and Custom quiz tips. Show me opens the Duel tab.

Integrator's calls, each easy to correct: "with mix-ups on record" is not a counter of its own (the preferred moment is the Next right after a miss, and the answer log showed every player of that size had mix-ups); the wording of the card, taken from what the Duel tab says and does; the caps; counting `d` when the page opens rather than at each duel.

The answer-log check that came first (aggregates only, 2026-11-21) is in the PR's Tests section: corals, 5 of 8 players with 150+ questions had never played the Duel tab; fish, 6 of 6.

## Consequences

- The counter is per device and not per subject, like the other tips'. A signed-in device holds only its unsent answers, so a player who used the Duel tab there before `d` existed may get the tip once or twice.
- A player with 150+ answers mostly in another subject may be sent to a Duel tab that says its duels start once two look-alikes are met; the page links to the quiz.
- Tips (c) to (h) of REE-13 follow one at a time, each with its own check on the answer log.
- Specified in [cards.md](../spec/cards.md#did-you-know-tips).
