# The level's answer count and the checkpoints that hang on it (2026-11-09)

**Status: decided work, built (2026-11-23, "Step 1 built", "Step 2 built" and "The opt-ins' Not now built", below).**
Written on 2026-11-09 on the branch `claude/level-count-from-log` (a follow-up parked from #840, rule W27's cut) and
brought to `main` on 2026-11-17 (rule W6), checked again against `origin/main` at 2c6815ba. The branch also held
`model.js` `countShift`, a shift this note shows is not enough (below, "The problem"); it is not brought over. Until
step 2 (below) the level's count kept the larger of the device's and the log's (`core.js` `replayedOf`).

Rule D9 (Pierre, 2026-11-09, Q322, Q330) wants the log's counts everywhere, the level's "answers so far" too, so answers
counted twice leave the device. #840 does it for every unit but keeps the level's count as the larger of the two (main's
rule), because of a structural problem.

**The problem.** The app stores its checkpoints as absolute values of `answersSoFar()` (the level's count): the units met
and the gaps between openings (`INTRO`), the open-all record, each exam in course (`s.ex.at`), the comeback's floor
(`CB.f`), the prompt spacing, the one-tap question, the opt-ins' "Not now" (`Q[k + 'A']`). Several are synced across
devices. A count that goes down strands them, and shifting them by the drop (`model.js` `countShift`, on the branch)
breaks when a merge has already taken another device's shifted checkpoint (Codex, #840 round 2: a skipped exam gap) or
when two lists name the same key.

**Models that remove the class:**
1. *Answers since an event*: each checkpoint keeps the answers counted since it, incremented at each answer, never a
   count to compare. Safe under any change of the total; every checkpoint's code changes, and synced ones need a merge
   rule (the smaller since). Medium work.
2. *Done flags and times*: a passed checkpoint is a flag (the exam's spacing a time, an opening's gap a number of
   answers kept as in 1). No arithmetic on the total at all; loses the exact spacing some rules use.
3. *A count epoch*: the level keeps `n0`, the count at the last correction, and each checkpoint the epoch it was stored
   in; reads convert. Smallest code change, but every reader must know about epochs, and merges of two epochs stay subtle.

**Recommendation:** model 1 for the gaps (intro, exam, prompt, pulse, winks, "Not now"), model 2 for one-time events, so no
code compares a stored count with the total; then the level's count can follow the log (the core change is two lines,
`core.js` `replayedOf` and `replayBase`). Players meet the same spacing as today; only a device that counted answers twice
sees its count come down to the log's, which rule D9 already decided (silent, rule D6).

## Checked again on 2026-11-17

- **What still compares a stored count with the total** (`git grep answersSoFar` on `main`, the app's files): `model.js`
  the openings' gaps and records (`introMap`, `openRecent`, `openPace`, `openRight`, the open-all offer), the exam spacing
  (`examReady`, `quiz.js` `ex.at`), the comeback's floor (`noOpen`, `CB.f`); `quiz.js` the prompt spacing
  (`promptOk`), the one-tap question (the pulse, `PULSEK`) and, added since the note, the winks shown (`WINKK`, synced to
  the account's other devices); `app.js` the opt-ins' "Not now" (`Q[k + 'A']`). The rematch queue (`quiz.js` `rematchAdd`) lives in the
  page's memory only. Thresholds compared with the total itself (`OPEN.STUCK_FROM`, `CHOICE.ASK`, `ZHINT.AT`) hang on no
  stored count: they only move with it, which rule D9 accepts.
- **Since #824** (2026-11-09) a save whose reply is lost no longer counts its answers twice, so new doubles stop; the work
  left is to let the doubles counted before it leave the devices that hold them.

## Plan when built

1. Starts from `main` once no open PR holds `model.js`, `quiz.js`, `core.js` or `sync.js` (rule W27), one PR.
2. Each checkpoint of the list above moves to model 1 or 2, with a test that fails first (rule W12); the synced ones get
   their merge rule (the smaller "since") in `sync.js` and the sheet's embedded `core.js` (rule D3: a changes file).
3. Then the two lines in `replayedOf` and `replayBase`, and a rules version (rule D5) if any player's progress moves.
4. Checks (rule L11, proportionate; rule L12): unit tests of every checkpoint across a count that goes down, and a
   read-only count on the real log of the players whose saved level counts more answers than their log (how many, by how
   much). No simulation is needed for a change that leaves every count the log agrees with as it is; the integrator
   decides.

## Step 1 built: the readers on an answer clock (2026-11-23)

The plan's step 2 is split in two PRs (rule W27: `core.js`, `sync.js` and `tools/sync/Code.gs` held elsewhere). The first
changes only `model.js` and `quiz.js` and moves nothing a player meets: model 1 ("answers since an event") counted on one
clock instead of one counter per checkpoint.

- **The answer clock** (`model.js` `tally`): per subject, on the device, kept with the comeback record (`reefid-comeback`
  `c`, `n`: cleared at sign-out and started over at a progress reset with it). It moves up with the level's count and
  stays where it is when that count goes down. It starts at the count, so every checkpoint stored before it is a clock
  value too; until a count goes down (none on `main` but a reset, which starts the clock over) it equals the count.
- **The checkpoints on it**: a card's mark (a 5th field of the intro entry, `introMark`; the answers count stays the
  entry's history for the admin's journey), read by `introReady` and `openRecent`; the comeback's floor (`CB.f`,
  `noOpen`); an exam's last question (`s.ex.at`, `examReady`); the surprise cards (`quiz.js` `winkShow`, `winkDue`); the
  prompts' spacing (`promptOk`, `promptMark`) and the one-tap question's (`pulseDue`, `pulseAsk`). Thresholds on the
  count itself stay on the count. Unit tests show each across a count that goes down (`tests/intro`, `pace`, `comeback`,
  `groups`, `wink`, `pulse`).
- **Left for step 2** (the count itself): `sync.js` ticks the clock (`tally`) before a merge or an adoption changes the
  level's count, so a count that goes up then down in one sync, or a device whose clock starts after the drop, loses no
  answer; then `core.js` `replayedOf` and `replayBase` (the sheet's embedded copy too, rule D3) and a rules version (rule
  D5). Not on the clock yet: the opt-ins' "Not now" (`app.js` writes `Q[k + 'A']` and the count `core.js` reads against
  it). A checkpoint written on another device carries that device's clock: the same as its count until the drops, after
  them off by the difference of the doubles the two devices dropped (step 2 keeps the clocks aligned on those marks,
  below).

## Step 2 built: the count follows the log (2026-11-23)

- **The count** (`core.js` `replayedOf`, `replayBase`; the sheet's embedded copy, its changes file, rule D3): the level's
  answer count (`ok`, `ko`) is the replay's, as every unit's already was, in the record adopted and in the merge
  baseline. With no answer in the log at all, the level goes as a unit goes: dropped when the saved copy counts answers
  there, kept (none of the log's fields) when it counts none (rule D9, Q330: no exception).
- **Rules versions** (rule D5): the corals' 15, the fish's 7, the sea slugs' 4, no card (rule D6), so every device takes
  the replay once and the doubles leave it; the leaderboards follow (rule D8). What moves, for whom: only a player whose
  saved level counts more answers than the log (doubles from before #824, or answers from before a subject's log began)
  sees that count come down to the log's: the thresholds on the count itself (`OPEN.STUCK_FROM`, `CHOICE.ASK`,
  `WINK.AT`, `PULSE.FIRST`), the level's Elo step size in the game until the next replay (`core.js` `eloStep`, from the
  count) and the leaderboard's `ELO_MIN` gate read the log's count. No bar, ability or learned mark moves: the
  ability was already the log's. A player whose count agrees with the log sees nothing.
- **The clock across a sync** (`sync.js` `clockTick`): `tally()` before a merge and before a replay's adoption, so a
  count that goes up then down in one sync, or a clock not started before the drop, loses no answer, and right after
  each, so the new count is the clock's baseline before the next answer (Codex, #1497). Before model.js is in (the quiz
  tier) there is no clock to tick: it starts at the count it finds then.
- **Two devices' clocks** (Codex, #1497): once a count goes down, two devices' clocks differ by the doubles each counted
  (a new device's, or one after a sign-in, starts at the log's count), so a synced mark from a device ahead (an exam's
  `s.ex.at`, a card's mark, a surprise card shown) would hold a gap back by the difference. The clock is kept as a
  Lamport clock over those marks: it starts at the latest synced mark when that is ahead of the count (`model.js`
  `clockMarks`), and after each subject's merge it moves up to the latest mark if it is behind (`clockSync`, from
  `sync.js` `mergeSubject`). A mark of this device's is then due as much sooner; no mark is ever ahead of the clock.
  Tests: `tests/trustlog.test.js` (the clock tests, a new device loading an exam in course), `tests/intro.test.js`.

## The opt-ins' Not now built (2026-11-23)

- **The mark** (`app.js` `openNo`): a "Not now" to a part opened by choice (the fish's circle 3) keeps the answer clock
  (`tally()`) in `Q[k + 'A']`, and `openOf` gives `core.js` `openState` the clock as `at`, so the offer's one second ask
  comes `OPEN_AGAIN` (200) answers after the "Not now" whatever the level's count did meanwhile. `core.js` is unchanged:
  `openState` compares the two values it is given.
- **Synced like the others**: the mark travels with the choice in the quiz settings (`sync.js` `mergeSubject`, the
  `S.optin` keys, the latest choice winning), so it is a synced mark of the Lamport clock: `model.js` `clockMarks` reads
  it (`opensNow`), a clock that starts takes it when it is ahead of the count, and `clockSync` (from `sync.js`
  `clockSeen`, after the quiz settings are merged) moves a clock behind it up to it.
- **Marks written before**: on the count, never ahead of the clock (the clock is at least the count), so such a mark
  brings the second ask no later than before, and sooner by a drop that came before it. An app from before this change
  reads a clock mark against its count: later by the drop, as before this change.
- **No rules version** (rule D5): the mark times an offer card; it is not a progress rule, the replay neither reads nor
  writes the quiz settings, and no bar, ability or count moves.
- Tests: `tests/livelocked.test.js` (a count that goes down after "Not now"; a mark synced from a device ahead, and a
  clock that starts at it), `tests/fish.smoke.js` (`SMOKE_ONLY=quiz`: the card's "Not now" marked on the clock).
