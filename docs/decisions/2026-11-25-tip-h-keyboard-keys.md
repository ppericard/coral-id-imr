# "Did you know?" tip (h): the keyboard keys, for the desktop player who always clicks

Date: 2026-11-25. PR: #1588. Rules or docs touched: S1, W19; docs/spec/cards.md "Did you know tips"; docs/spec/quiz.md; docs/DESIGN.md "Cards"; REE-13.

## Context

The owner decided on 2026-11-04 (paraphrase, as recorded in REE-13) that "Did you know?" pop-ups serve players who never used a feature, enabled one at a time, each target checked on the answer log first. Tips `zoom`, `custom` (a), `duels` (b), `mixups` (c), `basics` (d), `identify` (e), `typed` (f) and `hint` (g) were built. Candidate (h), the last in the list he agreed: "keyboard keys (1-4, Enter) for desktop players who always click".

How the keys work today ([quiz.md](../spec/quiz.md)): on a device with a mouse each numbered answer shows its number and **1** to **4** pick it; Next takes Enter (the focus is on it). The marks are hidden on a touch screen (`(hover: none), (pointer: coarse)`).

## Decision

Tip `keys` is one `tips.js` registry entry plus two device counters (`quiz.js`, where the answers are picked):

- `u.y`, the answers picked with a number key: `question()`'s key handler marks its own click (`by = 'key'`), so the answer button's click handler does not take it for a mouse's.
- `u.p`, the answers picked with a real mouse click on a device that shows the key marks: a click of detail 1 or more (a key or a script gives 0) when `matchMedia(MQ.touch)` is false. A tap on a touch screen counts nowhere.

The answer reaches `tipNote` as `tm.by` through `answer()` and `tipAfter`, as the hint tip's miss does. A typed question has no numbered answer and counts for neither.

The tip is for a player with **30 or more** clicked answers (`TIPR.CLICK`) and `u.y` 0, on a device with a keyboard and a mouse (`b.kb`, read in `tipAfter` from the same media query the CSS uses to hide the marks; `tipOut` passes 0). A touch screen never gets it, however many answers. It shows in the Quiz and the Custom quiz at any break (no better moment), twice at most, the second 150 questions after the first, last of the eight in-game tips when several are due. The card: "Did you know?", "Answer faster with the keyboard", "Press the number shown on an answer to pick it, then Enter for the next question: no need to click.", **Got it** only (no `act`: there is nothing to open).

**One engine (S1).** Every subject's questions have the number keys, so the entry names no subject and has no subject gate; the words are neutral.

Integrator's calls, each easy to correct: building (h) with no measured audience (below), N = 30, counting only answers picked with a real mouse click and never a number key, not counting Enter (a player who picks with the number keys knows the marks, and Next shows its own), the games, the moment, the caps, the wording and Got it alone.

## The target, checked on the answer log first (2026-11-25, read-only, counts only)

The answer log cannot show the target. The Answers tab (about 7,700 rows) has no column for how an answer was picked, key or click, and the Events `load` row carries only the window's width (`w`), not whether the device has a mouse or a keyboard. What it can say about the audience's size: the Events tab's `load` rows (1,111 Events rows read, 806 of them `load` rows with a width, from 34 devices), by the width class the device loaded with most often (`w` 1024 or more desktop, 600 to 1023 tablet, less than 600 phone): **9 desktop-width devices (278 visits, one of them 149) and 25 phone devices**; 3 devices were seen in more than one class. Desktop-width devices are the only ones that can have the key marks, and some of them are the admin's. No name was read; a device is an anonymous id.

So the tip's audience, a desktop-width player who has clicked 30 answers and never pressed a number, is somewhere among at most 9 devices, and the log cannot tell which. **The integrator's call (easy to correct): build (h) on the same footing as tips (f) and (g)**, which went ahead with no measured audience, "for the players Pierre trains next" ([f](2026-11-22-tip-f-typed-answers.md), [g](2026-11-25-tip-g-corallites-hint.md)). N = 30 is a choice, not a fit.

## Consequences

- The tip reaches nobody the data shows today; nothing is lost if it never shows. A later study would need the pick (key or click) logged in the answer log, a sheet column, which waits for Pierre.
- Both counters start at 0 on the device (the log cannot say how an answer was picked): a player who used the keys before the counters existed gets the card after 30 clicked answers with no key after the deploy; **Got it** ends it for the visit, and the first number key ends the audience for good.
- A hybrid laptop whose primary input is a touch screen reports `(pointer: coarse)` and gets no tip; a touch screen with a mouse plugged in is counted by what the browser reports.
- Per device, kept on sign-out, as the other tips; a tip shown on two devices does no harm.
- Specified in [cards.md](../spec/cards.md#did-you-know-tips).
