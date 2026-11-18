# The mimicry pairs drilled: a photo of the class makes its model's unit a trap, the pair duels on its two species

Date: 2026-11-19. PR: #1162. Rules or docs touched: L11; LEARNING.md "The mimicry class"; docs/spec/model.md,
docs/spec/quiz.md; FISH_PATH.md "Juveniles and colour phases", "Look-alikes at any rank"; ROADMAP "Look-alike pairs
between species".

## Context

Pierre approved the mimicry class on 2026-11-18 ([record](2026-11-18-variant-classes.md)): a species that resembles
another comes in once both units are met, with its card, "and the pair is then drilled in the look-alike formats". The
design is FISH_PATH.md "Look-alikes at any rank", view 2 (Pierre, 2026-11-04): a photo of species A makes the unit of
species B a likely trap, and its Again or duel, never the two whole families as look-alikes. #1133 built the class and
its card, not the drills.

## Decision

Pierre's decision of 2026-11-18, built here: the model's unit is a trap and a duel partner for a photo of the class.

Choices made while building, not decided with Pierre, each easy to change:

- **The trap takes a trap's place**: only on a question that has a trap at all (`trapsFor` 1 or more), in the place of
  its weakest trap (the least confused wrong choice when none is a look-alike), so the trap schedule is unchanged; at
  the rank asked (a genus question gets the model's genus); met and in play, in the custom quiz only when selected; the
  exam's photos too. It counts as plausible (the guess rate, logged `|kN`) and as a look-alike among the choices (the
  progress weight, logged in `sc`), so the score says what the question really was.
- **The duel waits for the card**: the pair duels (slipped into the quiz and in the Duel tab) only once its card was
  shown, at the families as every fish duel, with the classic look-alikes' weight (× 2).
- **Both sides show the pair**: a duel of the pair, or the Again after a photo of the class was taken for the model's
  unit, shows a photo of the class on the resembling side and the species resembled, at the stage that is resembled, on
  the other, so the answer is not always the same side; never, as on the card, a photo taken outside the region of a
  species flagged regional; only while that side's draw holds such a photo, else any photo.
- **The draw and the progress rules stay**: no declared pair (`look`), no confusion prior, no opening group, exam or
  replay change, no rules version (rule D5): what an answer logs (its `|kN`, its `sc`) is what any replay reads.

## Consequences

- The seven pairs M1-M7 are drilled where their two species' units differ: M5 (two blennies) only as a trap on a genus
  or species question, with no duel. Level-1 check (rule L11): docs/archive/learning-notebook.md "The mimicry pairs
  drilled".
- A mix-up on such a question counts in the player's own record of the two units (`off`, `conf`) as any mix-up does,
  so the two families can become that player's own trap, duel and exam look-alike, as any pair they keep mixing up.
- Not built, for Pierre (the PR lists them): the reverse trap (a photo of the model drawing the resembling unit), the
  pair's marks after a mix-up between the two, Find the X on the pair, the share of the class's duels.
