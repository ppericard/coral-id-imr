# "Did you know?" tip (d): Coral basics, for the "new" player who never opened it

Date: 2026-11-21. PR: #1446. Rules or docs touched: S1, W19; docs/spec/cards.md "Did you know tips"; REE-13.

## Context

The owner decided on 2026-11-04 (paraphrase, as recorded in REE-13) that "Did you know?" pop-ups serve players who never used a feature, enabled one at a time, each target checked on the answer log first. Tips `zoom`, `custom` (a), `duels` (b) and `mixups` (c) were built. Candidate (d), in the list he agreed: "Coral basics (Tools): a player new to corals who never opened it, after about 30 answers (the app asks no 'new to corals?' question yet: that question first, or a beginner's level and misses on the first genera as the sign)". The app has since asked that question (the first-launch question, PR #428), and Coral basics moved from Tools into Learn. The 2026-11-21 06:25 stop was lifted by his 14:41 request («Proceed with the migration and normal project work»).

What exists already, so the tip never duplicates it: the first-launch answer "I'm new to corals" offers the basics first (the tour's last button, `quiz.js` `startBasicsOffer` before the first question, Home's line under 50 answers, the Learn card); the "lower" fallback card (at 40 and 60 answers) offers the same module to the players who said "IMR course" or "know well" and find the first genera hard, and eases their start. Coral basics' opening is already recorded on the device: its page stores the step it opens (`reefid-basics` `last`, `seen`), `fin` and the synced `_basics` feat say it is done.

## Decision

Tip `basics` is one `tips.js` registry entry. It has no counter: `quiz.js` `tipBasics` reads the player's own records at the break and passes `b.bx`. The audience is the player the first-launch offer is for (the answer in the subject's record whose `CHOICE` variables offer the basics first, `startVars(c).basics`: "new", asked or inferred) who never opened the module (nothing in `reefid-basics`, not done, here or on another device). It shows in the Quiz only, from 30 questions, best at the Next right after a miss (the first genera felt hard), twice at most, 150 questions apart, after the other four tips. Show me opens the module; the card's words are the subject's own (`UNITS` `basics`: `ask`, `name`, `lo`), so the same entry serves Fish basics with no special case.

The two offers never stack, by construction: the "lower" card is for "IMR course" and "know well", the tip for "new", so no player is in both audiences. The tip also leaves out a "new" player the "higher" card was shown to, or is about to be (`fb` `new-hi`, verdict `v`), who has just been told they know more than they said. The tour's offer and `startBasicsOffer` come before the first question, Home's line is on Home, so the tip is the reminder for the player who passed them by, in a visit later; one card a break and one tip a visit hold as before.

Integrator's calls, each easy to correct: the sign of "new to corals" is the first-launch answer in the record (asked or inferred), not a level with misses on the first genera (that sign would reach the players the "lower" card already serves: both would offer the same module within 10 answers of each other); "never opened" is the module's own record, no new counter; 30 questions as the first showing; the Quiz only; the moment (the Next after a miss, else from 20 later); the caps; the wording ("New to corals? Try Coral basics", the module's `lo` line, "It is in Learn, any time."); the "higher" card exclusion; the sea slugs get none (their subject asks no first-launch question, so there is no record to read: nothing special-cased).

The answer-log check that came first (aggregates only, 2026-11-21, the Answers tab as saved for another study, 7,445 rows, as many as the live tab held at 03:00 Manila time the next day, and the players' progress records) is in the PR's Tests section: corals, 15 players with game answers, 8 said "IMR course", 3 "know well", 1 "new" (inferred), 3 have no record; the audience today is 1 player.

## Consequences

- The audience is small in the data we have, because the players so far are IMR Research Assistants who say they had the course; the tip is for the players Pierre trains next. Nothing is lost if it never shows.
- Opening Coral basics on another device is not seen until its achievement syncs (finishing it), so a player who opened it only there may get the tip once or twice.
- A "new" player with many answers who never opened the module keeps being a target (twice at most): the answer stays "new" until a card or the admin changes it.
- Tips (e) to (h) of REE-13 follow one at a time, each with its own check on the answer log.
- Specified in [cards.md](../spec/cards.md#did-you-know-tips).
