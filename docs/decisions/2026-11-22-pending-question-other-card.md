# A kept question is lost only when it is about its own first-meeting card's genus

Date: 2026-11-22. PR: #1428. Rules or docs touched: docs/spec/quiz.md "The pending question".

## Context

[#1375](2026-11-21-quiz-keeps-pending-question.md) keeps the question on screen when the player leaves or reloads, so a
hard question cannot be skipped by leaving. It did not keep a question that came with any first-meeting card. But the card
over a question is often for another genus, one opening next ("It comes up in the questions a little later"), while the
question asks about a genus already met. Such a question was lost on leaving or reloading: a player could swap it for a new
one. In a run on real photos this was 2 of 8 reload points, and the new-RA phone review's "2 of 4 runs" (REE-209); every
photo had loaded, and the lost questions were exactly the ones with a card.

## Decision

Integrator's call, carrying out Pierre's decision of 2026-11-21 18:12 (#1375: «ça permet de skipper des questions
difficiles sans perdre de points … on puisse revenir sur la même question») to the case it missed. A question is kept
unless its own unit is among the genera its card introduces (`quiz.js` `pendRec`). The card of another genus does not come
back with the kept question: `introAdd` marks that genus met when its card shows, so the question comes back without it.
A question about the card's own genus stays not kept: its card is that genus's meeting.

## Consequences

`quiz.js` `pendRec` tests `q.intro` for the question's unit instead of for any card. Specified in
[docs/spec/quiz.md](../spec/quiz.md#the-pending-question); tested in `tests/pending.test.js`.

It changes [2026-11-21-quiz-keeps-pending-question.md](2026-11-21-quiz-keeps-pending-question.md) (the
"a question that came with a first-meeting card is not kept" part).
