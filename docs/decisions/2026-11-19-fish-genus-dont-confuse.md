# The fish genus page's "Don't confuse with" lists sourced pairs only

Date: 2026-11-19. PR: #1171. Rules or docs touched: C1, C2; docs/spec/fish-sheets.md "The genus page"; ROADMAP "Fish genera need a presentation and ID cues before they open widely".

## Context

The fish genus page lists, under "Don't confuse with", the sibling genera IMR gives cues for and the look-alikes a source
names or players mix up, each with its source. The ROADMAP row (Pierre, 2026-11-08) left "cards for sibling genera that
have only our marks" not built, though 154 genera have marks of our own (`tools/fish_genus_marks.json`). A first version
of this PR built them: every sibling genus of the family with our marks as a card (92 of the 99 pages, up to 23 cards,
the first four then "More"). Q418 asked Pierre whether to merge that or to list only sourced look-alike pairs.

## Decision

Pierre, 2026-11-19 05:13 Manila (Q418): (b). "Don't confuse with" shows only the real, sourced look-alike pairs, not
every sibling genus with marks; further look-alikes will be defined later from the players' real data, the pooled
confusions.

- **What the page lists**: the sibling genera IMR gives cues for and the look-alikes a source names or players mix up,
  each card with its source; a sibling genus that has only our own marks is not listed. The page is as it was before the
  first version of this PR; `learn.js` `treeGenusSibs` is the one place that says which siblings.
- **Later**: the further pairs come from the players' pooled confusions once the data is there (ROADMAP row "Fish genera
  need a presentation and ID cues before they open widely"); nothing is built for them now.
- **Not built**: the species mimicry pairs M1-M7 as genus cards (species-level claims, kept off whole ranks by #1162).

## Consequences

- No change for players: the genus page shows what it showed before.
- Tested: `tests/fishsheets.test.js` (`treeGenusSibs` never returns a marks-only sibling, on the real `fish.json`) and
  the fish smoke (every card carries a source line, none is "ID marks", nothing behind "More"; Parupeneus shows no
  section).
