# Decisions kept from code comments: Pierre's words that were only in core.js and Code.gs

Date: 2026-11-18. PR: the comments clean-up of `core.js` and `tools/sync/Code.gs`. Rules or docs touched: none
(rule W19: history stays in git and the PRs, a decision goes to docs/decisions/).

## Context

The comments of `core.js` and `tools/sync/Code.gs` carried Pierre's dated words above the code they decided. The
clean-up rewrote those comments to say what the code does now. Every quote, question number and dated decision was
first searched for in docs/ (by script, then by hand for what the script did not find); the decisions below were in no
doc, or only without his words, so they are kept here, one line each.

## Decision

One line per decision, oldest first: the date, Pierre's words as the comment gave them, what they decided, where it
lives in the code.

- 2026-11-01: "a small leaderboard to keep a little competition going": the public leaderboard, every signed-in player
  who did not opt out, by progress then level. `tools/sync/Code.gs` `board_`.
- 2026-11-01: "find a way to redeploy the script without me": the sheet script updates itself from GitHub every 15
  minutes. `tools/sync/Code.gs` `autoUpdate`, `installAutoUpdate`.
- 2026-11-01: "good beta testers must not wait 100 questions for it to get harder": a genus never answered starts from
  the player's global level (an Elo over all their answers), shrunk while answers are few. `core.js` `playerStart`,
  `START`, `LEVEL`.
- 2026-11-02: "a miss on a very hard photo doesn't necessarily mean the genus is badly known": a miss weighs the
  chance the player had over the chance aimed for, in full on a photo at their level, less on a harder one; a miss
  never costs more than it proves. `core.js` `pgMissW`.
- 2026-11-02: keep an account played under the old algorithms apart and start over under the name: the admin's
  archive, the record moved to another name and kept out of normal operation. `tools/sync/Code.gs` `usersDo_`
  `userArchive`, `ARCHIVED`.
- 2026-11-03: "I find it hard to believe that the two genera marked as learned really are": a learned mark passed under
  the former BKT model (a record without `s.pg`) is dropped and the genus takes the exam again; silent since
  2026-11-09 (Q332). `core.js` `memRecalc`, `afterBkt`.
- 2026-11-03: "the challenge is too low / too high" (the wording he dropped): the one-tap question about the
  challenge is asked as states (Bored, In the zone, Struggling), since non-native speakers could not tell whether low
  meant easy or hard. `core.js` `PULSEQ` item `zone`.
- 2026-11-04: "a player who answered a single question then must not get it": the apology for the too-fast opening
  goes only to the players who really felt it (enough answers in the window and a high opening hold). `core.js`
  `SORRY`, `sorryFelt`, `sorryOf`; `progress.js` `sorryNotice`.
- 2026-11-05: "a player can delete their own account and all their data themselves": the self-delete, from the app,
  with the player's name and code; everything goes as with the admin's "Delete everything". `tools/sync/Code.gs`
  `selfDelete_`.
- 2026-11-06: the apology card of the domain-score bar: "2-3 short lines, never 'bars' but 'progress', encouraging: it
  is because they learned so fast that the old count could not keep up"; no mechanics on the card, heading "Sorry",
  the two % on a line of their own ("Your progress: 38% → 24%"), shown only to the players whose % went down.
  `core.js` `RV_SORRY`.

## Consequences

Nothing changes in the code or for the players: the comments now point here instead of quoting.
