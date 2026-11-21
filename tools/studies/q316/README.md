# Q316's offline fit (with Q136)

A read-only study tool: it fits Q316's componential difficulty model on an answer log, tests its own estimator before
reporting any value, and runs the two side checks the study planned (2C: whether the app's per-unit ability is centred
across players, Q136; 2B, the step-2 candidates against today's engine). It changes nothing in the app, the sheet or the
rules, and sends nothing anywhere. The plan it builds is section 5 of
[the literature review](../../../docs/reference/lit-componential-difficulty.md) and the study of 2026-11-20 (the
decision's order: the offline fit first, then the sheet, then the app).

**Status: run on the real log on 2026-11-21** (the answers to 2026-11-20 15:50): the results are in
[docs/reviews/2026-11-21-q316-offline-fit.md](../../../docs/reviews/2026-11-21-q316-offline-fit.md). The figures below
are on simulated answers only.

## Files

| File | What it does |
| --- | --- |
| `prep.js` | Reads the answer log (either form below), keeps one subject, labels the players P1, P2... and writes the rows the fit and the checks read |
| `fit.py` | The model, fitted by maximum Laplace marginal likelihood (numpy, scipy), and its acceptance test; `synth` runs the study's synthetic designs |
| `checks.js` | 2C on the real log |
| `replay2b.js` | 2B on the real log: the half fits, then the replay of the arms (after `run.py`, on its out directory) |
| `run.py` | Every step for both subjects under one 40-minute clock |

Tests: `tests/q316.test.js` (the loader, check 2C, the declared rules; and, with numpy and scipy, `tests/q316fit_check.py`:
the sparse Laplace objective against a dense computation, a planted SD recovered, the acceptance rule, the clock).

## The model

One answer: P(right) = g + (1 − g) σ(η), g = 1/k plausible choices (0 typed), and

    η = c + b1 log(1 + earlier answers in the subject) + b2 log(1 + earlier answers on the unit)
        + a_player + d_(player, unit)
        − r_rank − κ · mean over photos of (3 − ease)
        − b_family − b_genus − b_species − mean over photos of b_photo
        − offset

- **Item side**: the rank offsets r_genus and r_species (family 0) as fixed effects; family, genus, species and photo as
  nested random effects, one SD each. The family, genus and species are those of what was shown, whatever the rank asked
  (the fish: the photos' species through `fish-game.json` and `fish-photos.json`, its family and genus in `fish.json`).
  A fish photo's prior mean carries its judged ease (κ, today's `photoDiff` prior). Corals: genus and photo, with the
  coral families of `tools/taxonomy.json` as an exploratory level (`--coral-family`).
- **Person side**: the player's intercept, the player × unit term d (its SD τ is Q136's), and the practice covariates
  b1, b2 (AFM), so that learning is not read as easy items met late.
- **Offset**: the engine's own memory, mix-ups and format terms, from each answer's scoring record (else the memory prior
  by the player's history with the photo, and the latest format offset logged), plus the single-view term for one photo
  alone. Not estimated: the SDs are then those the online update needs.
- **Estimator**: the SDs maximise the Laplace approximation of the marginal likelihood with its log-determinant (as lme4's
  `glmer`), over sparse matrices; not the EM fixed point of `analysis.js` `glmm`, which the study's probe saw drift. The
  observed curvature at the mode (the expected one where the guess floor makes it indefinite). A 90% and a 95% Wald
  interval on log SD; an SD at its lower bound gets [0, U], U the likelihood-ratio bound with the other SDs held.
- **Not in it**: the sibling term c_G (fish, `--sibling`, exploratory) is off by default.

## Declared before any real run

**The acceptance test** (the estimator's own check, `fit.py` `ACCEPT`). On the real design (the real rows' player, unit,
photo, rank, choices and offsets), answers are simulated from known values in 20 replicates and refitted, first from the
rated world's values (family 0.37, genus 0.3, species 0.3, photo 0.46, player 0.5, player × unit 0.3, coral genus 0.37,
rank offsets +0.4 and +0.8), then from the fit's own values (a parametric bootstrap). Each SD and each rank offset
passes when its mean bias is within ±0.1 and its 90% interval covers the truth in at least 15 of the 20 replicates. A
value that fails either is reported **"not estimable on today's log"**, with no value. If the genus or the species SD
fails, the model with one SD shared by the genus and species levels is tested the same way (the study's fallback).

**The estimator's adequacy**: a value that fails on the data-rich synthetic design (`synth fish-rich`) is the
estimator's fault (the next step would be the study's Gibbs sampler); one that passes there and fails at today's size is
not estimable on that much data.

**2B** (`replay2b.js`, declared 2026-11-21 before its first real run; `RULES` in the code, printed at the head of each
run). Each answer is scored before it moves anything, with one expectation for every arm, core.js `scoreAnswer`'s:
e = g + (1 − g) R σ(S (th − (d + f + c))), th the ability the app logged with the answer (the player's real unit ability,
their own first-launch prior in it: no start record needed), f, c, R, S from its scoring record; only d, the photo
difficulty (solo + the mean over the photos, as quiz.js), differs:
- **arm 1**, today's engine: model.js `photoDiff`, run from its source, on core.js `eloReplay` (the engine's own replay)
  over the answers before this one, so trust, the memory offsets and the time term are the prefix's;
- **arm 2**, the shared chain: rank offset + family + genus + species (corals: genus) + the mean of the photos' parts,
  each a mean and a variance, the surprise of each trusted answer split by the variances (the review's section 5 rule),
  against the arm's own sheet chain (a level stepped as `eloReplay` steps R), the prefix's memory offsets and trust; an
  answer without photos moves nothing; when the prefix's trusted players change, the pass is made again from the first
  answer, as the sheet's pass would;
- **4b** and **4c** (Q136): arm 2 with the item rated against the chain plus the app's δ (checks.js's replay, its `p` 0
  limit), or plus the centred δ (less the mean over the other players of their latest δ on the unit);
- arm 3 (the sibling term) is not run: the fit does not estimate it by default.

**The SDs of arm 2**: from a fit (`fit.py --no-accept`) on the other half of the players (odd labels P1, P3... half A,
even half B), so no SD is fitted on the answers it scores. A level whose SD failed the full fit's acceptance test takes
its **v31-equivalent** variance K / a*, a* the gradient of one answer at the game's target (ability 1 above, 4 choices),
K today's step (photo 0.8, unit `GENUS_K` 0.4; the fish levels that fail share the unit's variance equally): today's
constants written as variances (the review's "today's rule as a special case"), no new value. Genus or species failing
with the shared SD passing: both take the full fit's shared SD. A rank offset that failed: an online part of its own,
from 0, with the unit's v31-equivalent variance. The fish photo prior mean is today's ((3 − ease) × the subject's
calibration), not the fit's κ; the prefix's time term is added in every arm.

**Primary**: next-answer log-loss, arm 2 against arm 1, on fish answers with a scoring record and 2 or more plausible
choices whose photos each had fewer than 3 earlier answers by players trusted at that moment; each player's mean
difference d_p; exact two-sided sign-flip over the players with 20 or more such answers, α 0.05. Arm 2 better = mean
below 0 at p < 0.05, worse = above 0 at p < 0.05, otherwise "the measure cannot tell"; fewer than 6 such players: "the
measure cannot tell" without a test. **Exploratory** (uncorrected): all fish answers, genus-rank answers, the corals
(answers with a scoring record), 4b and 4c against 2, calibration by rank, format and level band, and the compression
(the slope of each arm's end-of-log unit offsets on the offline D(u), units with 20 or more answers). Its own 40-minute
clock (rule L11), from when the machine slot is held.

**Not built**: the study's Gibbs sampler for the photo SD and τ. A level the Laplace fit cannot estimate takes its
v31-equivalent above, so 2B runs without it; the photo SD and τ stay "not estimable" until another estimator exists.

**2C** (the corals; the fish exploratory). δ = the app's unit ability − its global level before each answer, counted from
the player's 6th answer on the unit; per unit, the mean over players (one vote each), units with 3 or more such players.
C1: the spread of those means beyond their noise (DerSimonian-Laird, exploratory). C2: their Spearman correlation with the
live unit offset `gd`, permutation p over units (10,000, seeded), repeated within each half of the players' order of
meeting units. **Clearly negative** (not centred) = below 0 at p < 0.05, and below 0 in both halves: then a Q136 rating
uses the centred δ or stays on the chain. Otherwise the choice rests on 2B's replay.
With fewer than 8 units: "the measure cannot tell". Who reaches which unit is a confound (practice raises δ): an association, not a cause.
**Limit**: the player replay passes no starting prior (`p` 0; core.js `startPriorAt` needs each player's first-launch
choice), so a player's δ is that of one who started at the default; say so with the result. 2B's scorer does not have
the limit (it uses the ability the app logged); its arms 4b and 4c take δ from this replay and keep it.

**The clock**: 40 minutes for everything (rule L11), from when the machine slot is held; `--budget` and `--deadline`
can shorten it, never lengthen it (each step caps its own clock too). Past it each step stops,
keeps what it has and marks the rest "the measure cannot tell"; nothing escalates, and nothing chooses a value (no
level 3).

## Running it on the real log

The integrator puts the log in a new, empty directory outside the repository (the study, section 3): a saved
`readAnswers` reply, or the whole Answers tab from the Sheets connector with its header row (real names may stay in it:
`prep.js` replaces them with P1, P2... at load and prints no name). With the tab form, the names the admin left out of the
statistics go in a text file, one per line. Optionally, `?stats=1` and `?stats=1&s=fish` saved at the same moment (a
sanity check of the live unit offsets). The repository's `fish.json`, `fish-photos.json`, `fish-game.json` and
`tools/taxonomy.json` are read at the commit the tool runs from.

    pip install --require-hashes -r tools/requirements.txt     # numpy and scipy, once
    python3 tools/studies/q316/run.py /path/outside/log.json /path/outside/q316-out \
        [--exclude /path/outside/left-out.txt] [--stats-coral stats.json] [--stats-fish stats-fish.json]

Everything it writes goes into the out directory: per subject the export, `labels-<subject>.json` (each label's
player: for the integrator only, never committed, rule D2), the reference fit, `checks-<subject>.json`, and
`fit-<subject>.json` with the acceptance tests and the values reported. Each step also runs alone (their heads say
how).

## What it can conclude

It can say, each value with its 95% interval, on today's players, for a value that passed its acceptance test: the rank
offsets; the SDs that pass (the simulations below suggest the family SD, the coral genus SD and the player SD); and
which SDs are **not estimable** on today's log, itself a result: step 2 must not treat them as known. It can say whether
the app's per-unit ability is centred (an association); whether the shared chain predicts the next answer better or
worse than today's engine (2B), and how much each rating compresses the difficulty scale.

It cannot say anything causal, or about players unlike today's 10-15; how the online update behaves under adaptive
selection over time (the rated world's job in step 2); anything about the sea slugs; or which draw would follow (the
replay sees only the questions that were asked).

## 2B: how it answers #1310's three findings

Cut from #1310 (rule W27: Codex round 3's three findings on the shared arm's re-implementation of the engine's replay),
built in `replay2b.js` (rules above) so that the class of mismatch goes:
- **today's engine is the engine's own code**: core.js `eloReplay` (run from its source with the function added to the
  export list) on each prefix of the log, model.js `photoDiff` run from its source; one replay per prefix serves what
  `eloOf` and `genusOffsetsOf` serve (a test checks it);
- **answers without photos** move nothing in arm 2, as in `eloReplay` (a test);
- **trust is the prefix's** for the arms' updates and for the primary's coverage (a test);
- **the player's starting prior**: the scorer uses the ability the app logged with each answer, so the player's own
  first-launch prior is in it and no start record is needed; the formula reproduces the logged expected values.

    python3 tools/studies/q316/run.py /path/outside/log.json /path/outside/q316-out
    node tools/studies/q316/replay2b.js /path/outside/q316-out /path/outside/log.json --python <python3 with scipy>

## The estimator on simulated answers (no player)

`python3 tools/studies/q316/fit.py synth <design> out.json`, 20 replicates each, seed 1, the study's designs and truth
(its probe of `glmm`): fish-like 3,000 answers of 10 players (65 families, 130 genera, 325 species, 1,775 photos, ranks
80/15/5%), coral-like 4,000 answers of 15 players (40 genera, 977 photos), the data-rich fish-like 12,000 answers of
20 players (2,567 photos: about 4.7 answers per photo, 4.2 per player × unit), and, added after the first three were
read, a coral-like design with large clusters (10 genera of 4 photos: about 100 answers per photo, 27 per player ×
unit). Mean of the 20 estimates (bias), and how many 90% intervals covered the truth:

| Value (truth) | Fish-like | Coral-like | Fish-like, data-rich | Coral-like, large clusters |
| --- | --- | --- | --- | --- |
| player (0.5) | 0.44 (−0.06), 16: pass | 0.48 (−0.02), 15: pass | 0.49 (−0.01), 19: pass | 0.49 (−0.01), 19: pass |
| player × unit, τ (0.3) | 0.06 (−0.24), 13: fail | 0.18 (−0.12), 15: fail | 0.11 (−0.19), 8: fail | 0.23 (−0.07), 17: pass |
| family (0.37) | 0.41 (+0.04), 17: pass | | 0.35 (−0.02), 19: pass | |
| genus (0.3; corals 0.37) | 0.17 (−0.13), 20: fail | 0.35 (−0.02), 20: pass | 0.29 (−0.01), 20: pass | 0.39 (+0.02), 18: pass |
| species (0.3) | 0.17 (−0.13), 17: fail | | 0.27 (−0.03), 18: pass | |
| photo (0.46) | 0.04 (−0.42), 6: fail | 0.22 (−0.24), 15: fail | 0.22 (−0.24), 11: fail | 0.41 (−0.05), 20: pass |
| rank offset, genus (0.4) | 0.39 (−0.01), 19: pass | | 0.38 (−0.02), 16: pass | |
| rank offset, species (0.8) | 0.64 (−0.16), 18: fail | | 0.72 (−0.08), 18: pass | |

One fit takes about 10 seconds on the fish-like design, 3 on the coral-like, 40-60 on the data-rich (one core). The
whole `run.py` was timed on a made-up log of today's size (4,000 coral and 3,000 fish answers, the real fish taxonomy)
only before the replay and its half fits were cut (27 of its 40 minutes, the fish's shared-SD fallback included): not
timed again since, it does less now.

**Reading.** At today's size the estimator recovers the player SD, the fish family SD, the coral genus SD and the genus
rank offset; with four times the answers, the genus and species SDs and both rank offsets too. The photo SD and τ are
biased low (toward 0) whenever a photo or a player × unit pair has a handful of answers, even at 12,000 answers: by
the rule declared above, that is the estimator's limit (the Laplace approximation's known downward bias on small binary
clusters), not only the data's, since both pass with large clusters. So on the real log they will be reported "not
estimable"; only another estimator (the study's Gibbs sampler, not built) could give them a value. Synthetic answers
only: nothing here is about our players.

## Check 2C on made-up logs (no player)

`checks.js` ran on made-up logs of today's size whose scoring records carry the difficulty the answers were drawn
from, with no player × unit effect. One thing to know before reading it on the real log:

- **2C reads the unit given in a miss.** With the wrong answers always falling on the same few genera, C2 said "not
  centred" on a log with no player × unit effect: rule L2 takes a miss off the unit given too, so a genus often given by
  mistake has a lower δ. With the choices drawn at random, the same log gave "centring not rejected". On the real log,
  look-alikes given by mistake do the same: say so with the result.
