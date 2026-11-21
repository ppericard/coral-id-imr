# The quiz keeps its question when the player leaves and comes back

Date: 2026-11-21. PR: #1375. Rules or docs touched: docs/spec/quiz.md "The pending question", docs/spec/storage.md,
docs/ANSWERS.md.

## Context

An RA reported that leaving the quiz (to check something in Learn, for instance) and coming back gave a different photo
and a different question: a hard question could be skipped for free, and the player could not verify a point and then
answer the question that prompted the check. Until now a question lived only on the page: leaving drew another on return.

## Decision

Pierre, 2026-11-21 18:12, relaying the RA's feedback: «Quand on quitte le jeu et qu'on y revient … on se retrouve avec
une photo différente et un jeu différent … ça permet de skipper des questions difficiles sans perdre de points …
parfois on a envie d'aller voir dans Learn pour revérifier quelque chose avant de pouvoir répondre à la question, mais
la question a disparu entre temps. Donc ça serait bien que globalement, en fait, on puisse revenir sur la même question
et que les questions restent, plutôt que d'avoir à chaque fois une nouvelle question quand on ne fait juste que partir
pour aller voir un truc et revenir.»

So the question on screen is kept, per subject and per game, until it is answered, across navigation and a reload; a new
one is drawn only after the answer, or when its photo or genus left the draw (then a new one, quietly). Built as the
integrator's calls, easy to correct: one engine for every subject and format (rule S1); a device key, never synced, so no
sheet script and no progress rule; the question is stored as units and photo files and built again from the current data;
the seconds already looked at it are kept and the time away is not counted (a right answer given fast weighs more, so a
quick answer after a look-up in Learn must not read as recognition); a question that came with a first-meeting card, the
surprise cards and the Lab's tools are not kept.

## Consequences

`quiz.js` `PEND` and its functions keep and restore the question; `app.js` `route` writes the clock at each leave; the
key `reefid-<dev>pending` is cleared at sign-out (`sync.js`, rule D7). Specified in [docs/spec/quiz.md](../spec/quiz.md#the-pending-question)
and [storage.md](../spec/storage.md). Tests: `tests/pending.test.js`, `tests/pending.smoke.js`.
