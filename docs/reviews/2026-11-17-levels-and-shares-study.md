# Levels and shares: one model for ranks and photo variants (design study, 2026-11-17)

Draft: the check plan, declared before any run. The study itself follows in the next commits.

## The check plan (declared before running)

**Arms**, all on the same seeds. A scratch branch, never pushed (`scratch/levels-proto`): #975's head (2c1ba37b) with
#953's head (f1b94621) merged in, and a prototype of the three share rules in `model.js` (calib `lv`), switched by
learnsim's `--calib`:

- **main**: `origin/main` (03e14569);
- **975**: `--calib '{"phase":0}'` (#975 as it stands; checked identical to its head, the same questions on two
  profiles × 1,000 answers);
- **975+953**: `--calib '{}'` (#953 as built, its stage N = 10 answers, on #975);
- **A**, **B**, **C**: `--calib '{"phase":0,"lv":"A"}'` and so on (the three rules of this study).

**Screen**: the rated world, fish, normal photos, the app told the truth, the count learner, the 5 fish profiles × seeds
1-5 × 3,000 answers. Each arm against main with `tools/learncmp.js` (every guardrail, 90% one-sided bounds, one look),
and the per-step measures below, computed the same way for every arm from each run's questions (`expo`, `preOW`) and
the photos' records (`fish-game.json` phase and tags, `fish.json` juvenile classes).

**Per-step measures**:

- family → genus: the share of answers 1-3,000 on genera; genera at Open Water and Advanced at 3,000;
- family → species: the share on species; species met and at Open Water at 3,000; families at Advanced and the fish %
  at 1,000 and 3,000;
- unit → its juveniles: the share of questions showing an early-class juvenile (`fish.json` `juv` class A or early list)
  among the questions on a unit in its first 10 answers (Pierre's "très rapidement": expected at least main's); the same
  for the other juveniles (expected near 0 where held); the same once the unit has 20 answers or more (no wall: within
  ±0.03 of main);
- unit → its phases and sexes: the same for the sex and colour phases.

**The choice among A, B, C** (declared): (1) no guardrail breached against main that 975 does not already breach (its
costs are Q388's); (2) early-class juveniles early at least 90% of main's share; (3) the other variants early at most
0.02; (4) no wall: each kind's late share within ±0.03 of main's; (5) families at Advanced and the fish % within their
margins of 975's; a tie goes to the simplest rule. Then the chosen rule against 975 and main: the app world (5 profiles
× 5 seeds × 600 questions, two looks: 95% bounds), the rated world at 10,000 answers (5 seeds), and heavy-tailed photos
at 3,000. The corals: a run under the chosen rule must be identical to one without it (no parent, no phase).

**Added before reading the screen** (2026-11-17, while its first arms ran; only a 1-seed smoke run of B was seen): arm
**C0**, `--calib '{"phase":0,"lv":"C","lvRamp":0}'`: C with a ramp of width 0 for the ranks (a step at the threshold, so
its rank part is #975's cap m²) and the per-unit ramp for the variants. Read with the same measures and the same choice
rule.
