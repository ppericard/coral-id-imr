# The `shareFree` arm (read-only, 2026-11-21)

Linear REE-11; ROADMAP "learnsim: long runs crash, and the genus share"; the open point 3 of
[2026-11-20-fish-remeasures.md](2026-11-20-fish-remeasures.md) ("The auto IMR genera are not tested"). Read-only: no
app, sheet or tool code changed; the study's two scripts are under `tools/studies/sharefree/`.

## The question

An IMR player (the lecture RA's first-launch answer, `imr`) gets the IMR genera of a family at its Open Water without
the genera's offer (Q219), and `app.js` `shareFree` leaves them outside the rank share (`model.js` `sharesNow`, #975's
reading; Q382 came later and says nothing of them). Does that cost the player anything the rank share was built to
protect, i.e. do the uncapped genera delay the families? Only if it shows a cost does a question go to Pierre.

## Method (declared before the run)

- **World:** the rated world (`tools/ratedworld.js`), fish, `--app truth`, learner `count`, photos `normal`, at head
  `2ef8ff0d1`; 10 paired seeds x 3,000 answers (the free genera act before about answer 2,000; level 2, 40-minute cap).
- **Arms:** `free` is today's code. `empty` is the same world, same seed, with `shareFree` returning nothing, so every
  unit with a parent in the game sits under the rank share. Made by `tools/studies/sharefree/arm.js`, which wraps
  `vm.createContext` before loading `ratedworld.js` and swaps the context's `shareFree` in the `empty` arm only.
  Check: the `free` arm reproduces `node tools/learnsim.js --world rated --subject fish --profiles lectureRA` exactly
  (seed 1 at 1,000 answers: score 31, 2 families at Advanced, 32 met, in both).
- **Profiles:** the lecture RA (the only default profile that answers `imr`). The beginner (`new`) has an empty
  `shareFree` in both arms, so its runs are identical by construction: a control, checked on one seed, not a finding.
- **What the `empty` arm is:** not "the same genera under a cap". With cap = m^2 and no family yet at Advanced, the
  cap is 0, so the auto genera cannot open until families reach Advanced: the arm withdraws Q219's Open Water opening in
  effect. It measures what the free genera cost the families; it is not a candidate rule.
- **Primary (one):** the paired difference `free - empty` in the answer at which the lecture RA's **10th family**
  reaches Advanced (the auto genera's share is highest before the 5th-10th family is there). **A cost** = the 95%
  t-interval of the mean difference lies wholly above 0 **and** the mean is 100 answers or more (positive: today's free
  genera delay the families). With sd about 100-135 per pair (#1341) and 10 pairs, the interval's half-width is about
  70-100 answers: "no cost shown" means "none larger than about that", not "none".
- **Secondary, descriptive, no correction:** the same difference at the 5th, 15th, 20th, 25th and 30th family; the
  families at Advanced and the shown score at 100, 300, 1,000 and 3,000 answers; when the auto genera reach Open Water
  and Advanced in each arm (the other side of the trade); the share of answers by kind per window.
- These thresholds were written after one look at one seed at 1,000 answers (the wrapper's check), and committed
  (`e47f8cd80`) before the run.

## Results

The app's code at `2ef8ff0d1` (`origin/main`), the scripts at `e47f8cd80`; 20 runs (10 paired seeds), none failed, none
cut, in 756 s. `node tools/studies/sharefree/arm.js --seeds 10 --questions 3000 --profiles lectureRA`, then
`node tools/studies/sharefree/report.js` on its output. The arm took: the engine's free set held up to 6 genera in the
`free` arm and none in the `empty` arm; no seed gave the same answers in both.

**Primary: no cost shown, by the declared rule, at the edge.** The 10th family reaches Advanced 99 answers later with
today's free genera, 95% interval [59, 139] (sd 56, n 10): the interval excludes 0, and the mean is one answer under the
100-answer bar, a bar set after a single look. The resolution was better than planned (half-width about 40, not 70-100).

| nth family at Advanced | median free / empty | paired free - empty, mean [95%] (sd) |
| --- | --- | --- |
| 5th | 705 / 643 | +94 [61, 127] (46) |
| **10th (primary)** | **869 / 756** | **+99 [59, 139] (56)** |
| 15th | 1,006 / 881 | +147 [110, 185] (53) |
| 20th | 1,129 / 1,064 | +144 [57, 231] (122) |
| 25th | 1,472 / 1,268 | +203 [37, 370] (233) |
| 30th | 2,380 / 2,264 | +275 [−103, 653] (453; 8 pairs reached it by 3,000) |

The secondary rows from the 15th on sit above the bar; they are secondary and uncorrected. What the player sees does
not move: the shown score's paired difference is −0.2 to +0.1 points at 100, 300, 1,000 and 3,000 answers (sd 0.6-1.3),
and the families at Advanced are 14.5 / 17.5 at 1,000 answers and 30 / 31 at 3,000 (median, free / empty).

**What the delay is (added after the results, not declared).** The family answers given before the nth family reaches
Advanced are the same in both arms: 5th +12 [−17, 42], 10th −13 [−43, 18], 15th +8 [−29, 44], 20th −9 [−74, 56], 25th
−19 [−103, 66]. So the delay is the answers handed to the free genera, answer for answer (dilution), not a slower
family once asked. Since no simulated genus answer teaches its family, that is an upper bound on a real player's delay.

**The other side: the IMR genera.** In the `empty` arm they open only once the families reach Advanced (cap m^2 is 0
before), so they come much later. Only the runs that reached the mark by 3,000 answers are paired, so these are at
least the figures shown:

| auto IMR genus | free | empty | paired free - empty |
| --- | --- | --- | --- |
| 1st at Open Water | 632 (10 of 10 runs) | 1,010 (9 of 10) | at least −490 [−684, −297] (9 pairs) |
| 3rd at Open Water | 867 (10 of 10) | 1,241 (9 of 10) | at least −674 [−976, −373] (9 pairs) |
| 5th at Open Water | 1,084 (10 of 10) | 1,892 (6 of 10) | at least −847 [−1,410, −283] (6 pairs) |
| 1st at Advanced | 1,568 (10 of 10) | 1 of 10 runs | - |
| 3rd at Advanced | 2 of 10 runs | 0 of 10 | - |

Share of answers by kind, mean over the seeds (f family, a auto IMR genus, g genus by the offer, s species by common
name, x species by scientific name):

| Answers | free (today) | empty |
| --- | --- | --- |
| 1-300 | f 94.1, a 5.9 | f 99.9, a 0.1 |
| 301-1,000 | f 81.4, a 14.2, s 3.5, g 0.8 | f 90.4, a 6.1, g 2.2, s 1.2 |
| 1,001-2,000 | f 39.4, g 34.4, s 18.0, a 8.0 | f 39.2, g 34.8, s 16.9, a 9.0 |
| 2,001-3,000 | g 50.2, s 30.9, f 15.7, a 2.9 | g 52.2, s 28.5, f 15.1, a 4.1 |

The `free` arm's figures agree with #1341's (the auto genera 14.2% of answers 301-1,000 against 15%; the 5th family
at 705 against 728).

## Reading

- **No question to Pierre from this arm**, by the rule declared before it ran; a close call: today's free IMR genera
  delay the lecture RA's families by about 100-200 answers (13-17% of the `empty` arm's timings, 5th to 25th family), purely by taking those answers, with no change to
  the shown score, and in exchange the IMR genera reach Open Water about 500-850 answers earlier and Advanced at all
  within 3,000 answers.
- **The `empty` arm is not a candidate rule**: it withdraws Q219's Open Water opening in effect. A question worth
  asking would need another arm, not run here: the IMR genera still open at their family's Open Water (Q219), but
  their questions counted under the rank share's draw cap (`shareW`) and not its opening check (`shareRoom`).
- **Limits** ([2026-11-21-simulation-scope.md](2026-11-21-simulation-scope.md)): this is a question of the rules'
  mechanics (where the draw's share goes, when units open), where a simulation is useful. How much a real player's
  genus answers teach the family is not modelled (each unit has its own knowledge), nor is how a real RA values the
  IMR genera early; the profiles are assumptions, not fits (`tools/learnprof.js`). One profile only: the beginner has
  an empty `shareFree` in both arms (checked on one seed: identical answers).
