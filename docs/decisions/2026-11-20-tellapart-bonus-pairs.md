# The coral pairs with a bonus or Key-only genus: 24 tell-apart lines written, one kept without

Date: 2026-11-20. PR: #1296. Builds on [2026-11-18-tellapart-lines](2026-11-18-tellapart-lines.md) (#1119) and
[2026-11-19-tellapart-none-pairs](2026-11-19-tellapart-none-pairs.md) (#1245). Rules or docs touched: C1, C2, C3, C6;
ROADMAP "The feedback sheet's decisive lines"; spec/tools.md, spec/quiz.md.

## Context

Study (d) of the feedback sheet, approved by Pierre on 2026-11-18 ("ok pour les 6 recommandations"), asks for a sourced
tell-apart line for every declared coral pair. The 59 slate pairs were done (#1119, #1245); the study's other row, "With
a bonus genus" (25 pairs), was left. They are the declared pairs of `data.json` genera where one side is in `x.gen` and
is not Millepora: the five bonus genera of `core.js` `BONUS` and the Key-only genera. Only four have both genera in a
game today (*Acropora* / *Isopora*, *Halomitra* / *Sandalolitha*, *Leptoseris* / *Pavona*, *Lobactis* / *Pleuractis*),
so only they reach the feedback sheet and the Compare page (both read genera a game asks); the 21 others wait until their
Key-only genus is in a game.

## Decision

- **Where**: the same file and shape as the slate's (`tools/coral_apart.json` `pairs` / `none`, laid on `data.json`
  `ap` / `apsrc`). `tools/apply_coral_apart.py` now covers every declared pair of `gen` and `x.gen` genera (84: 59 of
  the slate, 25 more) and clears `ap` / `apsrc` on every coral record before writing. The 59 slate entries and the four
  `none` reasons of #1245 are unchanged.
- **Written (24)**, under the same rules as #1119: each side names and describes its own genus, the same feature on
  both, at most 64 characters, from the IMR lecture where it covers the genus (`data.json` `imr`, the slide in `sl`),
  else the Coral Finder (its criteria as `crit` holds them and the pair's comparison label `lsrc`, cited by the page
  that compares them or the genus's own page). Every side was checked by a script: each sentence it rests on was found
  word for word in that genus's `imr` or `crit`, the pair's `lsrc`, or the saved web page, and each cited source has
  one. No skeleton weight (not seen on a photo): the *Halomitra*, *Sandalolitha* and *Zoopilus* lines use how close and
  how visible the corallites are. The slate side keeps IMR's words where IMR covers it (*Acropora*, *Lobophyllia*,
  *Pavona*, *Porites*, *Pectinia*, *Plerogyra*, *Lobactis*, *Fungia*, *Echinopora*).
- **Corals of the World**, read 2026-11-20, where the Coral Finder criteria do not give the feature on both sides:
  *Catalaphyllia jardinei* (the genus's one species, confirmed in the Philippines, `presence.json`): "Colonies are
  flabello-meandroid", "Polyps have large tubular tentacles", "Colour: Distinctive green with pink tentacle tips" (its
  tentacles against *Fimbriaphyllia*'s anchor, hammer or bubbly tips); *Halomitra pileus* (already a source): "free-living
  [...] circular, dome or bell-shaped" against *Podabacia*'s crusts, plates or tiers.
- **Kept without a line (1)**: *Cycloseris* / *Lithophyllon*. Both have fine septal teeth; the one difference read is
  size and soft sediment, while the Coral Finder's *Cycloseris* page says it is easily taken for a young *Lithophyllon*,
  and no source read gives a feature of *Lithophyllon* beside *Cycloseris*'s (Corals of the World's *Cycloseris
  cyclolites* page names only another *Cycloseris* as similar).
- **No discrepancy found** between the sources read (rule C5): Corals of the World's *Catalaphyllia* page compares it
  with "flabello-meandroid Euphyllia", the species now in *Fimbriaphyllia*: a name of its time, not a disagreement.
- Players see it as the integrator's call, easy to correct (the study's question (d), approved 2026-11-18).

## Consequences

84 declared coral pairs: 79 with a line, 5 in `none`. A player who plays the bonus genera sees, after a mix-up of one of
the four game pairs, what tells the two apart with its source, instead of the first ID tip; the 20 other lines show once
their Key-only genus enters a game. `tests/tellapart.test.js` checks the 84 pairs and a bonus pair's line;
`tests/booktext.test.js` keeps the Coral Finder wording out of them. Pierre reviews the lines in the files, as the others.
