# Fish colour phases sourced: a cited list of each game species' phases, beyond the IMR presentation

Date: 2026-11-20. PR: #1342. Rules or docs touched: tools/fish_phases.json (new), docs/ROADMAP.md

## Context

Until now, the fish judging rubric (judging/FISH.md, "phase") let a photo carry a phase tag (subadult, intermediate, terminal, female, male) only where the IMR fish presentation names that phase for the entry. In practice, only *Diagramma pictum* had a sub-adult. Pierre questioned that limit and named three groups to check: other sweetlips, spadefish and batfish, and parrotfish.

This pass built a sourced list for every fish species with photos in play (662 species). For each species it records which colour phases a solid source documents:
- juvenile;
- sub-adult or intermediate;
- initial and terminal;
- female and male.

## Decision

Any solid, cited source can establish a species' phases. The IMR presentation is one source among others (Pierre, 2026-11-20 19:28: «la parole d'IMR, c'est pas la vérité absolue. C'est une source solide parmi d'autres sources solides … clairement, il y a plein d'autres espèces qui ont des sous-adultes … Ne serait-ce que chez d'autres Sweet Lips … il y a des Spadefish pour lesquels il y a une phase sous-adulte. Je suis à peu près sûr qu'il y a aussi une phase sous-adulte chez certains Parrotfish. Enfin bon, là c'est de tête, il faut me vérifier, mais et aller chercher dans des sources»). He also said, 19:29: «la nouvelle formulation, en fait, elle devrait même pas citer la présentation IMR, puisque c'est une source comme les autres». The rubric's own wording changes in PR #1334.

The list is `tools/fish_phases.json`. Each species has four verdicts, `juv`, `sub`, `ip_tp` and `sex`, and each verdict is one of:
- `yes`: a source describes that phase's colour, and the quote is kept.
- `no`: a source says there is no distinct phase.
- `unknown`: no source was found, or the difference is only one of degree. The note lists the pages that were read.
- `conflict`: sources disagree. Both are quoted and the list does not choose between them (rule C5).

**Sources.**
- FishBase: summary pages, and the Morphology table of the rfishbase v25.04 snapshot.
- Reef Life Survey.
- Fishes of Australia.
- The *Fishes of the Andaman Sea* pages of the National Museum of Nature and Science, Tokyo.
- Bellwood & Choat 1989, Rec. Aust. Mus. 41: 1-41.
- A few encyclopedia pages, marked as such.

**How it was built.**
- Fetches were paced, with public names only (rule C7).
- Keyword hits were candidates only: each one was read, and 40 were rejected.
- The juvenile verdicts come from the earlier juvenile pass (the source of `tools/fish_juv_differs.json`). New sources were added only where that pass had found none.

**Pierre's three examples.**
- **Sweetlips.** A sub-adult with its own pattern is sourced for 3 of 8 species: *D. pictum*, *P. chaetodonoides*, *P. vittatus*. *P. lineatus* is a conflict. *D. melanacrum* is `no`, because its subadult shares the juvenile pattern.
- **Batfish.** *Platax batavianus* has a sub-adult from FishBase and Fishes of Australia. *P. pinnatus* has one from a single personal guide, marked weak. No other ephippid is in play.
- **Parrotfish.**
  - Initial and terminal phases are sourced for 18 of 24 species, and female and male colours for 21.
  - Bellwood & Choat 1989 call "subadults" the immature fish that already wear the initial-phase colours, so a parrotfish sub-adult is not a colour pattern of its own.
  - Two species have a described late-juvenile stage: *Chlorurus spilurus* and *Scarus niger*.

**Counts (yes / no / conflict / unknown).**

| verdict | yes | no | conflict | unknown | in-play photos covered by "yes" |
|---|---|---|---|---|---|
| juvenile | 104 | 26 | 0 | 532 | 1,143 of 2,972 juvenile photos |
| sub-adult | 16 | 6 | 2 | 638 | 7 of 8 intermediate photos |
| initial / terminal | 37 | 0 | 0 | 625 | |
| female / male | 89 | 60 | 1 | 512 | |

Of the 1,666 male and female photos, 1,369 are covered by either `sex` or `ip_tp`.

**Gaps.**
- 297 male and female photos in 49 species have no source. Most are sharks, rays and seahorses, plus *Pseudanthias cheirospilos* and three *Cirrhilabrus*.
- 1,593 juvenile photos have no juvenile source.

Integrator's call: the list's format and where it lives (`tools/`, a data file no tool reads yet).

## Consequences

- No tool reads the file yet, so nothing in play changes.
- The three conflicts (*P. lineatus* sub, *R. quaesita* sub, *M. ornatus* sex) and the disagreement on the female pattern of *S. ghoban* (a `yes` verdict, the note records the conflict) are listed in `data/points.json`, worded neutrally, for Pierre to settle (rule C5). `tests/phasepoints.test.js` fails on a conflict of the list with no point.
- The next step is in ROADMAP (row "Fish photo judging, next"): re-judge the fish photos for phases on this list, measured first (docs/INTEGRATOR.md "A large judging or boxing pass is measured first").
- Left for later:
  - iNaturalist taxon pages;
  - FAO catalogues;
  - applying Bellwood & Choat to the parrotfish juvenile verdicts;
  - the 11 species with no FishBase description.
