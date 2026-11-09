# The level's answer count and the checkpoints that hang on it (2026-11-09)

A follow-up parked from #840 (W27 cut). Rule D9 (Pierre, 2026-11-09, Q322, Q330) wants the log's counts everywhere, the
level's "answers so far" too, so answers counted twice leave the device. #840 does it for every unit but keeps the
level's count as the larger of the two (main's rule), because of a structural problem.

**The problem.** The app stores its checkpoints as absolute values of `answersSoFar()` (the level's count): the units met
and the gaps between openings (`INTRO`), the open-all record, each exam in course (`s.ex.at`), the comeback's floor
(`CB.f`), the prompt spacing, the one-tap question, the opt-ins' "Not now" (`Q[k + 'A']`). Several are synced across
devices. A count that goes down strands them, and shifting them by the drop (`model.js` `countShift`, on this branch)
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

**Recommendation:** model 1 for the gaps (intro, exam, prompt, pulse, "Not now"), model 2 for one-time events, so no
code compares a stored count with the total; then the level's count can follow the log (the core change is two lines,
`core.js` `replayedOf` and `replayBase`).
