# Typed answers, the rest: typed mix-ups in the pooled pairs, the typed text in admin Pairs

Date: 2026-11-18 (Manila). PR: #1116. Docs touched: LEARNING.md "Typed questions" (Typed mix-ups in the pooled pairs),
ARCHITECTURE.md (Confusion scores, admin Confusions), ROADMAP "Typed answers, what is left"; sheet vNEXT.

## Context

The ROADMAP row "Typed answers, what is left" (Pierre, 2026-11-03) listed three follow-ups of the typed questions:
typed misses as unprompted confusions in the pooled pair scores, the `TYPED` values tuned on the players' own typed
answers, and the raw typed text and spelling step read by the admin's analyses. A typed mix-up counted in the player's
own record (`s.conf`; `pairConf` takes a mix-up with no offer as offered once) but not in the pooled pairs of
`?stats=1`, which counted only the units offered among the choices, so the player's own excess on such a pair
(`confGap`) was measured against a pooled score that ignored it.

## Decision

Integrator's call (engine work the row already asked for; easy to correct: the pooled pairs are rebuilt from the log at
every stats build, so a revert restores them):

- A trusted player's typed answer that names another unit counts in the pooled pair as **offered once and mixed up**
  (`core.js` `confAdd`, the one rule of `Code.gs` `statsStep_` and the admin's `confusionOf`). Not every unit as offered
  on each typed question (offers no player weighed would bury the pairs), and not a mix-up without its offer (it would
  weigh more than a picked mix-up). "I don't know" and right typed answers add nothing.
- **No rules version** (rule D5): the pooled pairs are data the replay reads as they are; rows with a scoring record
  (since 2026-11-06) replay the same whatever they hold. On the real log the older rows' bars move by at most 0.36
  points (15 of 490 player-genus bars), less than one day of new answers moves them (0.52).
- Admin Pairs shows the typed text: the near-misses as typed (a typo of the unit shown with its spelling step, or
  another unit's name) and the spelling steps retyped exactly, from readAnswers' Typed and Retyped right (served since
  sheet v60). Live only, never in a stored report.

Left for Pierre: the `TYPED` values (the share of questions typed, the exam's typed answers), which change what players
meet; he decided on 2026-11-03 to adjust them on the players' own typed answers.

## Consequences

- `?stats=1` `conf` and the admin's Pairs and heatmap scores include the typed mix-ups; Pairs' A→B and B→A and the
  heatmap's cells still count the choices only. On the real log of 2026-11-18, 12 coral and 5 fish pairs move, none
  crosses `CONF.TRAP` or becomes a look-alike from the data.
- Specified now in LEARNING.md "Typed questions" and ARCHITECTURE.md (Confusion scores; admin Confusions).
