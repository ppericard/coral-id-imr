# Typed answers, the rest: typed mix-ups in the pooled pairs, the typed text in admin Pairs

Date: 2026-11-18 (Manila). PR: #1116. Docs touched: LEARNING.md "Confusions", the notebook ("Typed mix-ups in the
pooled pairs"), docs/spec/admin-players.md (Pairs), ROADMAP "Typed answers, what is left"; sheet vNEXT; coral rules
version 11.

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
- **Coral rules version 11** (rule D5 "Every change to a progress rule appends a rules version"; integrator's call,
  2026-11-19, replacing the first call of no rules version): a coral row logged before its scoring record (before
  2026-11-06) replays its mix-ups term and look-alike test from today's pooled pairs, so the change of what `conf`
  counts can move it (on the real log 15 of 490 player-genus bars, by at most 0.36 points); rows with a scoring record
  replay the same whatever the pairs hold. `core.js` `RVS` 11, no card (rule D6): every coral player is replayed once,
  silently. The fish and the sea slugs replay with no pooled pairs, so no rules version for them.
- Admin Pairs shows the typed text: the near-misses as typed (a typo of the unit shown with its spelling step, or
  another unit's name) and the spelling steps retyped exactly, from readAnswers' Typed and Retyped right (served since
  sheet v60). Live only, never in a stored report.

Left for Pierre: the `TYPED` values (the share of questions typed, the exam's typed answers), which change what players
meet; he decided on 2026-11-03 to adjust them on the players' own typed answers.

## Consequences

- `?stats=1` `conf` and the admin's Pairs and heatmap scores include the typed mix-ups; Pairs' A→B and B→A and the
  heatmap's cells still count the choices only. On the real log of 2026-11-18, 12 coral and 5 fish pairs move, none
  crosses `CONF.TRAP` or becomes a look-alike from the data. One coral confusion group changes: *Acropora* now groups
  with *Anacropora* (its classic look-alike) instead of *Astreopora* and *Cyphastrea*, which changes the opening order
  and the exam's wait for group partners around those four genera.
- Every coral player's progress is replayed once under rules version 11, silently; the leaderboards follow (rule D8).
- Specified now in LEARNING.md "Confusions" and docs/spec/admin-players.md (Pairs); the measures in the notebook.
