# The sea slugs' species achievements: 1, 10 and 50 species at Advanced by their scientific names, and every star

Date: 2026-11-24. PR: #1515. Rules or docs touched: L8, S1; `core.js` `SEASLUG_ACH`, `app.js` `UNITS.seaslug` `top`
and `sciStars`, spec/seaslugs.md, spec/achievements.md, LEARNING.md "Sea slug achievements"; Linear REE-32.

## Context

The first sea slug achievements (Pierre, 2026-11-17: "une première version des succès pour les limaces de mer") and the
% ladder to 100% ([2026-11-18 record](2026-11-18-seaslug-achievements-high.md)) left "the species ones once the sea slugs
have species units". Pierre approved that list and its ladder on 2026-11-18 (paraphrase), and the ladder's names on
2026-11-19 (Q410, "OK"); no list of species achievements was ever drawn up. The species units by their scientific names
are built (#1273), and the stars set of Q369 (c) (2026-11-15, paraphrase: "A 'stars' set ... with an achievement") had
none, since its stars are species and the units were genera.

## Decision

Integrator's call, easy to correct, as the first version's 15 (#1043) and the fish's step-2 four (#1273) were: four
achievements on what the fish's species achievements already read (rule S1), none naming a subject in code.

| Id | Name | Condition | Tier |
|---|---|---|---|
| sssp1 | Down to species | a species at Advanced by its scientific name (`achSnap` `setsAdv.ssp`, as the fish's `fspsci1`) | 1 |
| sssp10 | Species sleuth | 10 species | 2 |
| sssp50 | Fifty shades of slug | 50 species (of 206) | 3 |
| ssstars | Star struck | every star species at Advanced (`achSnap` `top`, the fish's `fdauin20` mechanism; `UNITS.seaslug` `top` = `app.js` `sciStars`, the species units whose record carries `star`) | 3 |

At Advanced, as Q262 names a fish species by its scientific name. None rests on a learned mark, so none is in
`ACH_LEARN`. The stars' description gives no count: the set is Pierre's to edit (`stars.add`, `stars.remove`).

## Consequences

- Timing (rule L8), measured with the real game: the app served locally on the real `seaslug.json` and
  `seaslug-game.json`, the sheet at `SCI_SHEET` (the species level on), a new player of the sea slugs answering every
  question right (the fastest any player can go; `tools/learnsim.js` has no sea slug subject), the app's own `achSnap`
  tested every 5 answers. Two runs (2,000 and 2,250 answers): `ssmet5` at 18-20 answers, `sssp1` at 1,235 and 1,605; at
  2,250 answers 73 genera at Advanced, 197 species met, 806 species questions, 4 species at Advanced, no star. `sssp10`,
  `sssp50` and `ssstars` did not come within 2,250 answers: far goals, as the fish's mastery ones (over 2,500), their
  answer counts not measured (the check stopped at rule L11's 40-minute cap: the page's time per answer grows, about
  7 s for the first 250 answers and 270 s for answers 2,000-2,250). None comes early or with time.
- No rules or progress version (rule D5): achievements are tested in the app; `Code.gs` carries the copy.
- Existing sea slug players get any they already meet at their next sea slug answer.
