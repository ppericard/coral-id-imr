# The coral calibration set: 50 photos drawn a little more often until each has 20 answers

Date: 2026-11-18. PR: #1130. Rules or docs touched: P1 (`docs/rules/photos.md`, applied),
L11 (the check), `docs/LEARNING.md` "The calibration set", `docs/spec/data.md` "The calibration set", ROADMAP
("Placement test", step 2), `calibration-set.json`, `tools/calibset.js`, `model.js` `CSET`, `setBonus`, `photoSet`.

## Context

The placement test study (docs/reviews/2026-11-18-placement-test-check.md) found that no subject has a pool of photos
rated well enough for a test: no coral photo had 20 answers, 39 had 10 or more. It proposed a fixed calibration set
first, then an explicit opt-in test of 20-25 adaptive questions.

## Decision

Pierre, 2026-11-18 (about 10:55 Manila), "ok" to the study's recommendation, which decides: no hidden test now; first a
coral calibration set, "about 50 photos, each until it has 20 or more answers, drawn a little more often in normal play,
never as hidden probes"; then the explicit test.

The integrator's calls inside it (easy to correct: a constant, a list, a rule in one tool):
- **Which photos**: the slate genera only (the bonus genera are opt-in); the views every question shows (colony and
  close-up), not the corallites of a three-level genus (shown as a hint or alone, so slow to rate); never Poor, several
  corals or a Colony photo with no visible form; one per slate genus, the rest to the genera with the most eligible
  colonies; a fixed hash order within a genus and view, one per colony. Never by source, licence, observer or the answers
  a photo has (rule P1). Not chosen on the photos' current ratings: they rest on a few answers each (the study).
- **Sticky**: a member stays while in play; a member out of play is replaced by the tool's next run, by hand.
- **"A little more often"**: ×2 (`CSET.B`) while the sheet's plain count is under 20 (`CSET.N`), only on a unit the player
  holds and for a photo within one width of the question's target. The simple ×2 everywhere slowed the simulated
  beginner (fewer genera met at 300 questions); the two conditions, the calibration questions' own and the targeting's,
  took most of that away (docs/LEARNING.md "The calibration set").
- **Never a hidden probe**: a member's question is a normal one: same format rule, scoring, feedback, log; no mark.

## Consequences

- The members gather answers about 28% faster than in the draw before (simulated share of questions 4.2% → 5.4%); the
  median member reaches 20 answers in roughly 7 weeks at today's traffic, the slowest quarter in 10 weeks or more and
  the slowest in several months (guesses; `node tools/calibset.js --progress`).
- One cost left, unclear: the simulated beginner's true knowledge at question 300, −0.013 on the confirmation seeds
  (bound −0.023, past the margin's −0.02 though the mean is inside it), none at 600. Put to Pierre in the PR with the
  alternative (no factor for beginners); accepted by Pierre, 2026-11-19 05:13 Manila (Q412): merge as is.
- The explicit placement test (ROADMAP step 3) reads this set once its members are rated. Not decided here: whether a
  member may be drawn more for a player who has seen it, or shown alone more often (both left as built, Q412).
