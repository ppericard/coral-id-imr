# A goatfish judged a juvenile against its own note loses the flag; the juvenile card's per-photo trigger waits for the integrator's design

Date: 2026-11-20. PR: #1323. Rules or docs touched: ROADMAP "The juvenile card's per-photo trigger"; ANSWERS.

## Context

Pierre reported two juvenile-card oddities from the fish practice quiz: a card on a goatfish photo («J'ai eu une carte de
warning de juvénile sur un goat fish qui ressemblait exactement à l'adulte...»), and none on a sweetlips («Celui là c'est
un juvénile qui aurait mérité la carte, pas le goatfish d'avant»). The card shows from a photo's phase alone (`core.js`
`phaseKind`: a juvenile phase, or a sex or colour phase only on an entry marked `dimorph`); `tools/fish_game.py` `phase`
sets that phase from Pierre's own phase and tags, else the judging's phase word, else its `j` flag, else the observer's
life stage. The goatfish he saw is `fish-s331-cand-269009395` (the Answers tab, 15:28), a juvenile by the observer's
iNaturalist stage with the judge agreeing; the sweetlips is `fish-s597-cand-254656964`, judged a sub-adult.

## Decision

Pierre's three clarifications of 2026-11-20, 17:01-17:02:
- On the goatfish, «Je dis pas que c'était pas un juvénile. Mais la carte disait explicitement qu'il fallait vraiment se
  méfier parce que les juvéniles pouvaient être très différents des adultes. C'était l'un des pires exemples pour ça».
- On whether juveniles and adults look alike in goatfish, «Pas en général !!!!!!!!! Sur celui là spécifiquement !»: the
  card was wrong on that one photo; no species-level rule.
- On the sweetlips, «Non c'était bien un sub-adulte»: the judging (`phase: subadult`) was right and is unchanged.

What this PR does:
- The card's per-photo trigger (and whether a sub-adult brings a card) is the integrator's design, in `core.js`, held by
  open PRs (rule W27): a ROADMAP row, nothing built here.
- A goatfish judged `j` against its own note (`fish-s330-cand-551266134`, an adult *Parupeneus barberinoides* in its red
  and white colours; the note: "not a juvenile; tag kept as the harder value", from when `j` capped the ease) loses `j`:
  the integrator's call, easy to correct. It is not the photo Pierre saw.
- The goatfish he saw (`fish-s331-cand-269009395`) keeps its card for now: its juvenile phase comes from the observer's
  life stage, which an agent's judging cannot override (the judged phase words name no adult, "adult is no extra phase",
  and a made-up phase would put the unit in the "Learned" phase group); only his own phase choice for the photo in the admin
  (curation.json, rule A1) or the trigger's design above changes it.

## Consequences

- `suggest.json` changes by the one `fish-s330` record and its species' pass date (`judging_fish.py codes`);
  `fish-game.json` is rebuilt by the photos workflow after the merge.
- `tests/fishjuvcard.test.js` pins that photo and that no photo whose judging note says it is not a juvenile carries `j`.
