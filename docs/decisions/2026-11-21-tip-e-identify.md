# "Did you know?" tip (e): Identify (the Coral ID Key), for the player who never opened it

Date: 2026-11-21. PR: #1447. Rules or docs touched: S1, W19; docs/spec/cards.md "Did you know tips"; docs/DESIGN.md "Cards"; REE-13.

## Context

The owner decided on 2026-11-04 (paraphrase, as recorded in REE-13) that "Did you know?" pop-ups serve players who never used a feature, enabled one at a time, each target checked on the answer log first. Tips `zoom`, `custom` (a), `duels` (b), `mixups` (c) and `basics` (d) were built. Candidate (e), in the list he agreed: "Identify (Coral ID Key): never opened after about 200 answers, outside the games (Home or My progress)". The 2026-11-21 06:25 stop was lifted by his 14:41 request («Proceed with the migration and normal project work»).

What did not exist: every earlier tip shows at the break at Next in a game. Nothing showed a tip on a page, and no record said the Identify tool was opened (the device keeps only a choice the key saved when its options are changed, `reefid-idkey-start2`, `-lay`, `-pv`).

## Decision

Tip `identify` is one `tips.js` registry entry (`ctx` `home`, `progress`; `out: true`) plus one counter, `u.i`, the draws of the subject's Identify page (`app.js` `route()` calls `quiz.js` `tipRoute`, which counts it; a choice the key saved on the device folds in as one, `tipsLoad`). It is for a player with 200 questions or more here who never opened it, on Home or My progress, 2 s after the page is drawn, twice at most, 150 questions apart. Show me opens the key; Got it leaves the page as it is.

**The smallest shared way to show a tip outside the games.** `quiz.js` `tipOut` (called from `route()` and once from `SETUP[2]`, the way `subjHello` and `installNudge` are: Home is drawn in tier 1, `tips.js` and `quiz.js` in tier 2) waits a calm moment, checks again that the player is still on the page with nothing open (a card, the tour, a toast, the help, the settings, a photo) and within the prompt spacing (`promptOk`, then `promptMark`), then shows the same card through `tipShow`. `tips.js` stays pure: `tipDue(state, b, L, now)` takes the time for a page, which has no answer of its own to date a visit; the visit counted is the last one, over when its last answer is 30 minutes or more before `now`; a tip with `out: true` is not held by the first-10-answers floor (nothing is being answered there); `tipShown(state, id, now)` stamps the visit with the time, so the answers that follow bring no second tip. `CARDS_SAID` (tests wait on it) waits for the timer. One place, no test on the subject (rule S1).

**Which subjects.** The tip's words are declared by the subject in `UNITS` (`idtip`: `ask`, `name`, `lo`); a subject that declares none has no tip (`b.ix` 0). Only the corals declare them today: the Fish ID Key is "coming soon" (#1431, a page that says so) and the sea slugs have no key, so both get nothing by construction; the day the fish key works, declaring its words serves it with the same entry. The counter `u.i` is per device and not per subject, like the other counters.

Integrator's calls, each easy to correct: Home and My progress as the two pages (as the candidate says), the calm moment (2 s, after the install nudge and the subject hello in time, and behind them by the prompt spacing); no floor of first answers on a page; "any visit from 200 questions" with no better moment; the wording ("Stuck on a coral? Try the Coral ID Key", the key's line, "It is under Identify, any time."); the caps (2, 150 apart); counting the page when it is drawn, a choice saved in the key counting as one open before the counter; Got it leaving the page untouched (no redraw).

## The target, checked on the answer log first (2026-11-22, read-only, aggregates only)

What the sheet can say: the Activity tab (answers per player, all subjects) and the Pages tab (one summary a visit: page names with times opened and seconds, `na` the answers so far in the subject on screen, per anonymous player id; it starts on 4 November). Done on the 1,253 rows of the Pages tab as it stood: rows 2 to 560 (4 to 7 November) read with their player ids, rows 561 to 900 (to 21 November) read without the id column, rows 901 to 1254 not read (a reading limit, not a limit of the data). Opens of the key counted 0 to 3 seconds on screen are common (a page glanced at).

- Players with 200 answers or more across the subjects (Activity): 7 of 14 rows other than the owner's. The corals-only split is not in that tab.
- Pages, rows 2 to 560, the 4 player ids (the busiest id, the owner's, left out) that reached 200 answers or more: 3 opened the Coral ID Key (one at 159 answers, one at 249, one at 375: so the key is used by some before 200, and the first openings seen are at or after it), 1 did not open it in these rows.
- Pages, rows 561 to 900, no id: the 4 visits of a coral player at 200 answers or more (234, 473, 618 and 656 answers, quiz, leaderboard) show no `identify.key` page; the key's visits there are those of players under 135 answers or with none.
- The tip's audience today is therefore at least one player and probably several of the 7; the count cannot be pinned without the unread rows and without joining Pages to the Answers tab by the Device column.
- **Not measured:** the audience exactly; how many of the 7 are corals players; anyone who opened the key before the Pages tab (4 November) or on a device other than the one the tip would read (the counter is per device).

## Consequences

- A signed-in device holds only its unsent answers and starts `u.q` low, so a player on a new device waits for 200 questions there before the tip.
- A player who used the key on this device before the counter existed gets the tip unless they changed one of its options; at worst the tip shows once or twice and Got it ends it.
- Opening the key on another device is not seen: the counter is per device (the tips' choice), a tip shown twice on two devices does no harm.
- The first Home tip of a visit comes with the other Home cards in turn: the install nudge and the subject hello come first (the prompt spacing), so a player may see the tip a visit later.
- Tips (f) to (h) of REE-13 follow one at a time, each with its own check on the answer log; a tip on a page now has its place (`out: true`).
- Specified in [cards.md](../spec/cards.md#did-you-know-tips).
