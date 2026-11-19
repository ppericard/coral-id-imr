# Fish name roots, circles 2-3: every genus rooted or skipped

Date: 2026-11-19. PR: #1248. Rules or docs touched: C1, C2; docs/spec/fish.md "Name roots of the fish genera",
docs/spec/content.md (the genera a circle edit brings into circle 1), ROADMAP "Name roots".

## Context

The name study ([review](../reviews/2026-11-05-name-confusion-study.md), 5.2 and question d) proposed root meanings on
the genus sheets, sourced, beside the IMR mnemonics. The corals (23 genera) and 76 of the 130 circle-1 fish genera
were built on 2026-11-14 from The ETYFish Project; the 109 genera of circles 2-3 were left.

## Decision

Pierre, 2026-11-14 (Q124 d), on the study's recommendations: "Je suis tes recommandations pour tout". Circles 2-3 are
done exactly as circle 1 was: the root read from the genus's entry on its ETYFish family page (one fetch per page,
paced), each meaning and word verbatim in the entry kept beside it; a genus whose root is a guess, unknown, has two
meanings, names an old genus or points to another unit's IMR cue goes in `skip` with its reason.

Choices made while building, not decided with Pierre, each easy to change (integrator's calls):

- **Which genera are skipped**: the circle-1 criteria applied to the five that touch another unit's IMR cue or read
  against the genus (Taenianotus, Taeniura "band"; Flavocaranx "yellow"; Gnathanodon "without teeth"; Ablabys "harmless"
  for a venomous waspfish).
- **Every genus**, not only circle 1, must have a root or a reason: the build stops otherwise, so a genus is never
  left out silently.
- **The study's warning** (a root that points to another unit's IMR cue gets its line, instead of being held back)
  is not built here: 15 fish genera and the corals' are held back for it, and it needs a data shape and a wording
  players read.

## Consequences

- 72 of the 109 genera of circles 2-3 show a root line on the sheet the genus opens; the 37 others carry their reason in
  `tools/fish_genus_roots.json` `skip`. No change to the draw, the model or any record: no rules version (rule D5).
- `tests/roots.test.js` checks every genus; `tests/fish.smoke.js` a circle-3 genus page.
- Still open: the IMR-cue warning, then the species epithets (ROADMAP "Name roots").
