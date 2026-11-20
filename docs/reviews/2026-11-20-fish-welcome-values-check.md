# Fish welcome question: the starting values checked with learnsim (2026-11-20)

Status: check, simulation only. No app value changed (rule D5): the figures and a recommendation for Pierre. ROADMAP row
"Fish welcome question", its "Left: learnsim fish profiles for the fish values" (backlog inventory R77).

Labels (rule W11): **[sim]** computed by `tools/learnsim.js` on `main` @199f48af1 and scored by `tools/fallbackeval.js`;
**[read]** read in a file; **[guess]** my judgement.

## What was checked

The fish welcome question ("How well do you know reef fish?", `core.js` `SUBJECTS` fish `start`) uses the corals'
three answers' variables (`core.js` `CHOICE.opts`: new p 0, imr p 0.5, know p 1.25, shared by every subject) [read]. p
is the level a player's answers are shrunk towards (`core.js` `playerStart`): the first questions on each unit never
answered, and through shaky the pace of the opening. The question: do these values fit fish players?

**The profiles already existed** [read]: `tools/learnprof.js` has had a fish part for the beginner, the lecture RA, the
strong RA, the expert and the casual diver since #786, their species since #1251, each with its truthful answer
(`choice`). The ROADMAP's "learnsim fish profiles" were built; the check itself had not been run. The fish parts are
assumptions, not fits (the file's header; ROADMAP "Simulated profiles fitted to real players"): "holds" below means
"holds for these assumed players".

**Runs** [sim]: every fish profile under each of the three answers, the fallback card kept (`--subject fish --seeds 10
--questions 300 --choice new|imr|know --fallback keep`), paired seeds; the corals' yardstick under their truthful
answers on the same code (`--subject coral --seeds 10 --questions 100 --choice auto`); one calibration run with higher
priors (`--subject fish --choice auto --vars '{"imr":{"p":1.25},"know":{"p":1.9}}'`, 100 questions). These runs took
about 1,700 s, plus two short trial runs (20 and 80 questions, about 1 more minute), under rule L11's cap. `tools/fallbackeval.js` reads either subject now (each profile's truthful answer from
`learnprof.js`), and adds the prior's fit: the first 20 answers' mean surprise (right − e; 0 when the prior fits) and
the global level at answers 20, 40 and 60 against the answer's band (`core.js` `startBand`: new under 0.25, IMR 0.25 to
0.875, know above). The fish's level-change cards are off (`UNITS` fish `startFb: false`, Pierre 2026-11-08); their
verdicts are scored anyway: they say whether the answers fit the band. On the corals, `fallbackeval.js` gives back
learnsim's own cards exactly (beginner 2 "higher"; lecture RA 4 "lower" and 4 "higher"; strong RA 3 "lower"); the fish
have no shown card to check it against. Its guess rates match `core.js` `guessOf` on every mode in the fish traces
(plain quiz 63-80% of the first 60 answers, `|k2` and `|d|k2` 18-34%, Find the X `|f` 2-3%, typed under 1%).

**The criteria were chosen after looking** (nothing was written down before the runs; the coral yardstick was run after
the fish results were read). Two readings: (a) absolute, per answer under its truthful profiles: the first 20 answers'
surprise near 0 and the global level at 40 and 60 inside the answer's band; (b) relative: the values were built and
checked for corals, so they fit the fish if they fit the fish profiles at least as well as the coral profiles on the
same code.

## Results

**The prior's fit under the truthful answer** [sim] (mean ± sd over 10 seeds):

| Profile | Answer | Fish surprise, first 20 | Coral surprise, first 20 | Fish level at 20 / 60 | Coral level at 20 / 60 |
| --- | --- | --- | --- | --- | --- |
| beginner | new | −0.01 ± 0.08 | 0.08 ± 0.05 | 0.05 / 1.13 | 0.92 / 0.76 |
| casual diver (fish only) | new | 0.06 ± 0.05 | – | 0.64 / 1.35 | – |
| lecture RA | imr | 0.11 ± 0.04 | 0.12 ± 0.05 | 1.50 / 1.98 | 1.70 / 1.89 |
| strong RA | know | 0.11 ± 0.02 | 0.09 ± 0.06 | 2.14 / 2.64 | 2.05 / 2.02 |
| expert | know | 0.12 ± 0.02 | 0.14 ± 0.04 | 2.21 / 2.69 | 2.43 / 2.88 |

- **Absolute (a), per answer.** "new" holds (beginner −0.01; the casual diver 0.06). "imr" does not: the lecture RA
  is under-predicted (+0.11) and sits in its band in 1, 1 and 0 of 10 runs at answers 20, 40 and 60. "know" is in its
  band in 10 of 10 runs but under-predicts the strong RA and the expert (+0.11, +0.12).
- **Relative (b): the fish values fit as well as the corals'.** The beginner's "new" fits better on the fish (−0.01
  against 0.08); the lecture RA, the strong RA and the expert are under-predicted by the same amount in both subjects
  (0.09 to 0.14): the engine's trait, already noted for corals (ROADMAP "First-launch question, follow-ups" (b)), not a
  fish one.
- **The answer costs no measurable knowledge**: the true knowledge at answers 100 and 300 stays within 0.02 of the
  truthful answer's under every wrong answer, for every profile (as for corals).

**The fallback matrix** (`tools/fallbackeval.js`, the fish runs) [sim]: wrong answers caught in the right direction 85
of 100 (corals on 2026-11-04: 36 of 40); cards to truthful answers 12 of 50 (corals today: 13 of 40, 7 "lower" and 6
"higher"), on the fish all "higher": 5 of 10 casual divers under "new" and 7 of 10 lecture RAs under "imr". A beginner who claimed the course or more gets
"lower" in 19 of 20 runs (18 at answer 40); the casual diver in 14 of 20; every strong RA and expert who under-claimed gets "higher" at 60 (40 of 40).

**The bands do not fit the levels, in either subject** [sim]: at answer 60 the fish beginner is at 1.13 ± 0.32 (above
the IMR band's ceiling, 0 of 10 in "new"), the casual diver 1.35, the lecture RA 1.98 (0 of 10 in "imr"), the strong RA
2.64, the expert 2.69. The corals drift too: their beginner at 0.76 (2 of 10 in "new"), their lecture RA at 1.89 (0 of
10 in "imr"). What differs on the fish is the beginner's climb (1.13 against 0.76) and the direction of the cards a
truthful player would get (all "higher").

**Higher priors** (imr p 1.25, know p 1.9) [sim]: the lecture RA's surprise falls from 0.11 to 0.06, the strong RA's
from 0.11 to 0.08, the expert's from 0.12 to 0.09; the levels at 60 hardly move (1.99, 2.70, 2.79). A beginner who
says "imr" with p 1.25 (the run under "know": p 1.25) loses little: surprise −0.02, 76% right against 73% under "new".

**On the real log** [read]: the placement test check of 2026-11-18 replayed the 6 fish players with 100 answers: 5 of 6
sat in the top band at answer 100, and 4 of those 5 had said "new" or "IMR course": the real fish levels run high too.

## Recommendation (for Pierre, nothing built)

1. **Keep the shared values for the fish for now** [guess, on the figures]: "new" holds; "imr" under-predicts the lecture
   RA and "know" the strong players, but by as much as on the corals: the engine's, in both subjects. A fish-only value
   would need a `SUBJECTS` field (rule S1) and a rules version (rule D5) for a gain of 0.03 to 0.05 in the first 20
   answers' surprise (imr p 1.25: 0.11 to 0.06) that fades within a few dozen answers (the prior's weight is
   10 / (m + 10)).
2. **Keep the fish's level-change cards off** (Pierre, 2026-11-08: «on ne fasse pas les propositions de changement de
   niveau sur les poissons tant qu'on n'a pas mieux calibré»). With today's bands they would offer "higher" to 5 of 10
   casual divers and 7 of 10 lecture RAs who answered truthfully, where the corals' few cards to truthful players go
   both ways. Before turning them on, the bands need refitting on the fish's own levels: at answer 60 these assumed
   profiles separate around 1.65 (new | imr) and 2.3 (imr | know) [guess: midpoints of the profiles' means], to be
   checked on real fish players who answered the welcome question.
3. **Recalibrate the priors with the corals' follow-up** (ROADMAP "First-launch question, follow-ups" (b)), on real
   answers, for every subject at once.

## How to re-run

```
node tools/learnsim.js --subject fish --seeds 10 --questions 300 --choice new --fallback keep --out <dir>/t-new.json   (and imr, know)
node tools/fallbackeval.js <dir>
node tools/fallbackeval.js <run.json>     one --out file, each run under its own answer (--choice auto)
```

A `--vars` run is scored against today's bands (`core.js`), not the bands of its own values.
