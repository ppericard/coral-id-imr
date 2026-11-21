# Sea slug species look-alikes: the two sourced pairs recorded as decided species pairs, not yet in play

Date: 2026-11-21. PR: #1394. Rules or docs touched: C2, C8; `tools/seaslug_source.json` lookalikes,
`tools/seaslugs.json`, `seaslug.json` species `look`; Linear REE-20 (ROADMAP "More subjects", R223b).

## Context

The literature scan follow-up ([2026-11-19](2026-11-19-seaslug-literature-followup.md), #1164) recorded two sourced
species look-alike pairs as literature sets of `tools/seaslug_lookalikes_source.json`: *Thecacera pacifica* /
*T. pikachu* (`pola2026-pacifica-pikachu`) and *Chromodoris alcalai* / *C. dianae* (`gosliner2021-alcalai-dianae`).
Both lie inside one genus, so they waited for the species level (Q390 D, Pierre, 2026-11-17, paraphrase: the
specialist-sourced species pairs declared), built in #1273. The four species are in play (circles 1 to 3).

## Decision

Integrator's call, easy to correct: the two pairs join the decided species pairs, the path the two Spanish dancers took
(Q377): `tools/seaslug_source.json` `lookalikes`, each entry naming its literature set (`set`) and carrying that set's
source, quote and what was read word for word in `why`; `tools/build_seaslugs.py --target` copies them into
`tools/seaslugs.json` and `tools/seaslug_game.py` writes each species' `look` in `seaslug.json`. Only these two sets: the
survey's other species sets stay candidates. `tests/seaslug-looks.test.js` holds the list and the verbatim copy.

## Consequences

- `seaslug.json` gains `look` on the four species; nothing else changes. No app code reads a species record's `look`
  today (every `.look` reader in the app and admin code reads a unit, genus or family, checked 2026-11-21): a
  sea slug species unit's traps are the other species of its family (`core.js` `treeSpUnits`), which already holds
  each pair, and the Look-alikes deck and the duels read the genus pairs only.
- Not built (Linear): a surface that shows a species pair to players (a species sheet's "Don't confuse with", a deck
  card). By Pierre's answer (c) of 2026-11-18 (the classic look-alike study, §10), a card needs one sourced mark:
  *Thecacera* has one in its quote, *C. alcalai* / *C. dianae* has none, so it would stay out of the deck.
