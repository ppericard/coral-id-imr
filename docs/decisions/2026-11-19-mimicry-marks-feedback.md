# Mimicry pairs: their marks after a mix-up, as the feedback's line

Date: 2026-11-19. PR: #1247. Rules or docs touched: C2, C3, S1; LEARNING.md "The mimicry class"; docs/spec/quiz.md "The
feedback sheet"; ROADMAP "Look-alike pairs between species".

## Context

The mimicry pairs M1-M7 (`fish.json` `lookalikes`) each carry the marks that tell their two species apart, each mark on
its side with its sources, shown so far on the pair's card only. #1162 drilled the pairs and left their marks after a
mix-up for Pierre (Q416 b).

## Decision

Pierre, 2026-11-19, 06:50 Manila, Q416 (b), the pair's sourced marks after a mix-up between the two: "oui", next.

The integrator's calls made in the build, each easy to correct:

- **What is a mix-up between the two** (`model.js` `mimMix`): a miss whose photo is of one species of the pair at the
  stage that resembles and whose answer is the other species' unit at the rank asked, either way: a photo of the class
  taken for the species it resembles, or a photo of the species resembled (the other side of the pair's duel and Again)
  taken for the class's unit. In Find the X, the photo tapped taken for the name asked. A juvenile cleaner wrasse taken
  for the blennies takes the pair that names its juveniles (M4) rather than the one about every photo (M3).
- **The line** (rule C3, one decisive line): the first mark of each side, the photo's species first, "Name: mark ·
  Name: mark", each species by the name the player sees first (as on the pair's card), the marks' sources small after it
  in the card's short form; a side with no mark is left out (M2, M4); a pair with no marks keeps the usual line.
- **Behind More**, first: the pair's other marks, listed as on the card, then the two units' own pair line (IMR's or
  ours), which the marks replace on the sheet.
- **The feedback only**: nothing logged, scored or drawn reads it; the Again keeps its own test (`mimUnit`), so the
  reverse mix-up queues an ordinary Again, as before. No rules version (rule D5).
- **One path** (rule S1): it reads the entries `app.js` `mimLay` lays from any tree subject's `lookalikes`; the corals'
  pair lines already come through `ap` / `lk` on the same line, and the sea slugs have no pairs yet.

## Consequences

After a mix-up within a pair, the sheet's line names the species and how to tell them apart, with sources (rule C2),
instead of the families' line or the first ID tip. Specified in docs/spec/quiz.md "The feedback sheet" and LEARNING.md
"The mimicry class". Left (ROADMAP): the reverse trap (Q416 a), Find the X on the pair (Q416 c). The mix-up montage
still shows any photo of the unit answered, not the species resembled: a possible follow-up, not built.
