# Decisions kept from code comments: Pierre's words that were only in core.js and Code.gs

Date: 2026-11-18. PR: the comments clean-up of `core.js` and `tools/sync/Code.gs`. Rules or docs touched: none
(rule W19: history stays in git and the PRs, a decision goes to docs/decisions/).

## Context

The comments of `core.js` and `tools/sync/Code.gs` carried Pierre's dated words above the code they decided. The
clean-up rewrote those comments to say what the code does now; every quote was checked against docs/ first. The
decisions below were in no doc, or only without his words, so they are kept here, one line each.

## Decision

One line per decision: the date, Pierre's words as written in the comment, what they decided, where it lives in the
code. Quotes in French are his; the others were already in English in the comments.

- 2026-11-01: "good beta testers must not wait 100 questions for it to get harder": a genus never answered starts from
  the player's global level (an Elo over all their answers), shrunk while answers are few. `core.js` `playerStart`,
  `START`, `LEVEL`.
- 2026-11-02: "a miss on a very hard photo doesn't necessarily mean the genus is badly known": a miss weighs the
  chance the player had over the chance aimed for, in full on a photo at their level, less on a harder one; a miss
  never costs more than it proves. `core.js` `pgMissW`.
- 2026-11-03: "I find it hard to believe that the two genera marked as learned really are": a learned mark passed under
  the former BKT model (a record without `s.pg`) is dropped and the genus takes the exam again; silent since
  2026-11-09 (Q332). `core.js` `memRecalc`, `afterBkt`.
- 2026-11-05: "a player can delete their own account and all their data themselves": the self-delete, from the app,
  with the player's name and code; everything goes as with the admin's "Delete everything". `tools/sync/Code.gs`
  `selfDelete_`.
- 2026-11-03: "the challenge is too low / too high" (the wording he dropped): the one-tap question about the
  challenge is asked as states (Bored, In the zone, Struggling), since non-native speakers could not tell whether low
  meant easy or hard. `core.js` `PULSEQ` item `zone`.
- 2026-11-04: "a player who answered a single question then must not get it": the apology for the too-fast opening
  goes only to the players who really felt it (enough answers in the window and a high opening hold). `core.js`
  `SORRY`, `sorryFelt`, `sorryOf`; `progress.js` `sorryNotice`.

## Consequences

Nothing changes in the code or for the players: the comments now point here instead of quoting.
