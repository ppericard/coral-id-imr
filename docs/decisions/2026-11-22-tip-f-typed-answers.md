# "Did you know?" tip (f): typed answers, a close spelling counts, for the player who answers "I don't know" every time

Date: 2026-11-22. PR: #0000. Rules or docs touched: S1, W19; docs/spec/cards.md "Did you know tips"; docs/DESIGN.md "Cards"; REE-13.

## Context

The owner decided on 2026-11-04 (paraphrase, as recorded in REE-13) that "Did you know?" pop-ups serve players who never used a feature, enabled one at a time, each target checked on the answer log first. Tips `zoom`, `custom` (a), `duels` (b), `mixups` (c), `basics` (d) and `identify` (e) were built. Candidate (f), in the list he agreed: "Typed answers: once typed questions come, a player who answers 'I don't know' every time, to say a close spelling is accepted". The 2026-11-21 06:25 stop was lifted by his 14:41 request («Proceed with the migration and normal project work»).

How typed questions work today ([quiz.md](../spec/quiz.md#typed-questions)): from the unit's progress `TYPED.from` (0.5) some questions ask for the name typed (a field, Check, I don't know). A name of the unit asked within the spelling tolerance but not exactly is a right answer, with a warm "So close!" and one retype; I don't know is a miss for the unit shown only and shows the answer. What the device records: the progress record counts typed questions (`s.ty`, the level's `tyk`), never how they were answered, so "I don't know every time" cannot be read from the player's own progress record; the answer log can (mode `…|t`, `ty` empty), but a signed-in device keeps only its unsent answers.

## Decision

Tip `typed` is one `tips.js` registry entry plus one counter, `u.k`: the run of typed questions answered "I don't know" on this device since the last typed answer that was not one (`quiz.js` `answer()` tells `tipAfter` how a typed question was answered, `tipNote` counts it). The tip is for a player whose run is **3 or more** (`TIPR.IDK`). Any typed answer ends the run (a wrong genus, a text the game refused before the player gave up, a close one retyped); a question that is not typed leaves it as it is; the mastery exam's typed questions count like the others. The counter is seeded from the log the device holds and folded with the log's trailing run (`tipIdkRun`, `tipsLoad`), so a player who answered so before the counter existed is counted.

It shows in the Quiz and the Custom quiz (the games with typed questions), at the first break while the run holds, which is the Next right after the third "I don't know" (no better moment to prefer), twice at most, the second 150 questions after the first, last of the six tips when several are due. The card is the first with nothing to open: "Did you know?", "Not sure how to spell it? Type it anyway", "A close spelling counts as right: you just retype the genus once to learn its spelling. “I don't know” counts as a miss.", **Got it** only (no `act`, no Show me). The unit's word is the subject's own (`SUBJECTS` `one`), so the same entry serves every subject that has typed questions with no test on the subject (rule S1).

Integrator's calls, each easy to correct: the target's shape (the last 3 typed questions, not a share of all of them), N = 3, a refused text ending the run, no floor of questions before the first showing (the visit's first 10 answers still hold it), the games, the moment, the caps, the wording and Got it alone. Nothing in the card says a wrong guess is better than I don't know: it only says what is true (a close spelling is right; I don't know is a miss).

## The target, checked on the answer log first (2026-11-22, read-only, aggregates only)

The Answers tab as saved at 2026-11-21 17:17 Manila (7,445 rows, the live tab's row count when checked), all subjects, players counted by first appearance, no name kept. A typed answer is a row whose mode has the `|t` token (core.js `TYPED_RE`); "I don't know" is a typed row with no text typed and no unit answered.

- 175 typed answers by 9 players (corals 77, fish 94, sea slugs 4), 4 of them "I don't know" (2.3%: corals 3, fish 1), by 3 players: 1, 1 and 2.
- The longest run of typed "I don't know" in a row per player is 1 for 3 players and 0 for the other 6: **no player has met N = 2 or 3, so the audience today is 0.** The data cannot choose N: N = 3 is the smallest run that is no chance on a 2.3% base, and the tip is for the players Pierre trains next (as tip (d)'s was).
- 3 of the 9 players (8 answers in all) already met the "So close!" step (a retyped close spelling), so they have seen the rule.
- **Not measured:** the run per device (the saved copy has no Device column, the live tab does; with no run of 2 per player there is none per device either); "I don't know" given after refused tries (the saved copy has no Rejected tries column; the rows with the column empty can only overcount "I don't know"); players who answered before the Typed column existed.

## Consequences

- The tip reaches nobody in the data we have; nothing is lost if it never shows.
- A signed-in device holds only its unsent answers and starts `u.k` from them: a player on a new device waits for three typed "I don't know" there.
- The Duel tab has no typed questions, so no tip there; Tools › Type the genus is the Lab and is not counted.
- Tip (g) and (h) of REE-13 follow one at a time, each with its own check on the answer log.
- Specified in [cards.md](../spec/cards.md#did-you-know-tips).
