# Fish basics earns an achievement, "Fin to tail"

Date: 2026-11-21. PR: #NNNN. Rules or docs touched: L8, D3, D5; docs/LEARNING.md "Fish achievements, around the global score"; docs/FISH_PATH.md "Achievements"; docs/spec/achievements.md.

## Context

The fish achievements were redesigned around the global score (Q259-Q264, 2026-11-08); `fbasics`, the one for Fish basics,
waited for its name and for `core.js` to be free (rule W27). Fish basics was built with its own done feat `_fbasics`
(`SUBJECTS` fish `basics.feat`), set by `achBasics()` and synced, but no achievement read it, and `achSnap` read only the
corals' feat.

## Decision

Pierre, 2026-11-08: «n'hésite pas à réfléchir au nom des succès».

Integrator's calls (easy to correct): the name "Fin to tail", one 📖 bronze (tier 1, like the corals' Coral basics), the
words "You know what to look at first on a reef fish: body shape, the groups, fins, tails and markings", first in the fish
list (it is step 0 of the Learn path), and a line for it in the fish achievements' help text.

## Consequences

- `core.js` `FISH_ACH` gains `fbasics` (32 of the 33 planned; `fpct100` waits for the ultimate exam, Q395); `progress.js`
  `achSnap` reads the feat of the subject on screen (`SUBJECTS` `basics.feat`), so the corals' achievement still comes with
  Coral basics and the fish's with Fish basics, never crossed.
- Earned by finishing the module (every step seen), never after a number of answers or an amount of time (rule L8). A
  player who finished Fish basics before this version gets it at their next achievement check (the feat is already held).
- No progress moves: no rules version (rule D5), no `ACH_V` bump; the sheet script only carries the id (`achs_` counts any
  saved id), so no gate on its version (rule D4). A sheet script change through the embedded `core.js` (rule D3).
