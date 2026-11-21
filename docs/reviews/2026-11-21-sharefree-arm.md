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
- These thresholds were written after one look at one seed at 1,000 answers (the wrapper's check).

## Results

(pending the run)
