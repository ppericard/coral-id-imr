# Two fish photos judged against the evidence, corrected; the observer's juvenile on a photo that looks adult waits for Pierre

Date: 2026-11-20. PR: #1323. Rules or docs touched: judging/FISH.md "Tags", "The observer's life stage"; ANSWERS.

## Context

Pierre reported two juvenile cards from the fish practice quiz: one «sur un goat fish qui ressemblait exactement à
l'adulte», and one missing on a sweetlips («Celui là c'est un juvenile qui aurait mérité la carte, pas le goatfish
d'avant»). The card shows from a photo's phase alone (`core.js` `phaseKind`: a juvenile phase, or a sex or colour phase
only on an entry marked `dimorph`); `tools/fish_game.py` `phase` sets that phase from Pierre's own phase and tags, else the
judging's phase word, else its `j` flag, else the observer's life stage `st`.

## Decision

- **The sweetlips** (`fish-s597-cand-254656964`, a young *Diagramma melanacrum*): the judging called it a sub-adult
  (`phase: subadult`, an intermediate phase, which brings no card on an entry that is not `dimorph`). Corrected in
  `judging/fish/s597.json` to the `j` flag with no phase, on Pierre's word: «Celui là c'est un juvénile».
- **A goatfish judged `j` against its own note** (`fish-s330-cand-551266134`, an adult *Parupeneus barberinoides* in
  its red and white colours): the judge's note said "not a juvenile; tag kept as the harder value", a line from when `j`
  capped the ease. It caps nothing since Q435, so `j` is dropped (the judge reads the stage from the photo when no
  annotation gives it). The integrator's call, easy to correct.
- **The goatfish Pierre saw** (`fish-s331-cand-269009395`, a blurred *Parupeneus multifasciatus*): its juvenile phase
  comes from the observer's iNaturalist life stage (`st: juvenile`) and the judge agreed with `j`. The observer's stage
  stands over an agent's look (Pierre, 2026-11-19, 11:43); only Pierre's own phase choice in the admin ("No phase
  included") overrides it (rule A1), so no data is changed here: it is proposed to him.

## Consequences

- `suggest.json` changes by the two records and the two species' pass date (`judging_fish.py codes`); `fish-game.json` is
  rebuilt by the photos workflow after the merge.
- A sub-adult phase of an entry that is not `dimorph` still brings no card: 7 other *Diagramma pictum* photos are
  judged that way; whether a sub-adult card should exist is a `core.js` change, not made here. Since superseded: the
  [juvenile card's new design](2026-11-20-juvenile-card-shows-young-beside-adult.md) brings it where a source names a
  sub-adult stage of its own, from `quiz.js`.
- `tests/fishjuvcard.test.js` pins both photos and that no photo whose judging says it is not a juvenile carries `j`.
