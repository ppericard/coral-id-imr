# What the auto-sort proposed reads the newer judgement; a photo it set aside has a route back

Date: 2026-11-19. PR: #1259. Rules or docs touched: A1 (unchanged here: its new wording goes to Pierre); spec/fish-photos.md
"The fish auto-sort" (the route back; proposals and his own decisions) and its log codes; spec/admin.md `autosort`;
ROADMAP "Fish photo judging, next"; changes in part docs/decisions/2026-11-19-fish-saving-crop.md (the 694 had no route).

## Context

The fish auto-sort writes the judging pass's sure decisions into Pierre's draft, and his Publish sends them into
`curation.json`, where they used to count as his choices. Two things followed. A photo it had set aside (log `r`) could
never come back, even once a crop saved it (Q430): 694 candidates coded `k` (one could take another fish for the
subject) were in that case. And a value it had copied (an ease, tags, a crop) kept priority over every newer judgement:
198 juvenile fish photos in play keep the ease of the copy, which the re-rate (#1254) changes for 101 of them.

## Decision

- Q438, Pierre, 2026-11-19 20:34 Manila: «OK pour ta recommandation»: a route back for the photos the auto-sort set aside,
  into his draft, undoable like every auto-sort proposal, as his Q430 answer: «mettre en jeu les suggestions, surtout si
  elles peuvent être corrigées a posteriori».
- Pierre, 20:57: «ce que tu appelles ma curation, si ça se trouve, c'est juste moi qui ai cliqué sur un bouton pour
  valider une proposition … si tu penses que ma curation entre guillemets n'est pas bonne, … il faut que tu fasses une
  proposition qui intègre directement le jeu. Quitte à ce que je corrige a posteriori.»
- Pierre, 20:59: «ma curation, si ça se trouve, c'est juste des propositions d'agents IA et j'ai cliqué OK pour tous …
  Sauf si c'est quelque chose où j'ai fait à la main un par un, c'est pas vraiment ma curation … je pense que j'ai fait
  très peu de curation manuelle et j'ai pas fait 100 photos en curation manuelle.»

What was built:

- **The log tells the two apart.** A value the auto-sort wrote carries its letter in the log (`curation.json` `fish.auto`,
  `auto`); his clicks write none, except his answer to a Check (`?`), an Undo (`-`) and a correction (`@t`). So: (a) his
  own decision is a value with a Check answered, an Undo, a correction, or no log and no proposal it equals; (b) a
  proposal he let through is a value the log marks as the auto-sort's; (c) cannot be told apart is a value with no log
  that equals the proposal the admin showed him (his click on it, or his own same choice). (c) is treated as (a).
- **The build reads (b) anew** (`tools/fish_game.py` `read_cur`, and the players' copy, `tools/curplay.py`; `curation.json`
  itself never written, rule A1): the fields the log lists read the pass's newer values when its judgement is sure (an
  unsure one waits for him), unless he answered its re-judge proposal Keep mine; while he never corrected it, a photo it
  set aside plays again when a sure judgement made since puts it in, and a photo it put in, its tags still its copy (his
  Keep in play gives them up), leaves play when a sure judgement made since sets it aside. (a) and (c) stand.
- **The admin's route back** (`autosort.js` `fishBack`): the same photos come back into his draft, logged `b`, one Undo
  each (it sets them aside again). His own Reject of a photo the auto-sort had set aside marks it `-r`, so it is never
  taken for the auto-sort's.
- **"Made since"**: on or after the day of the decision, by the species' pass date (`suggest.json` `by`), which the
  import and now `tools/judging_fish.py codes` stamp. A reject is logged only from a sure reject, so a sure add judged
  since is a new judgement, never an old one read under a changed rule.
- **The integrator's calls**, each easy to correct: a photo brought back to a species at its target waits as a candidate
  (code `b` alone; the game plays a sure candidate by itself); his tags or crop on a photo set aside keep it out of the
  route (the new code is read on the judge's crop); the admin's own pages show the draft's copies until they read the
  same way (ROADMAP).

## Consequences

The counts of `curation.json` (main of 2026-11-19 21:10 Manila; `node` on `autosort.js` `autoIdx`, `fishIdx`, `autoSure`,
`fishSure`, `forms.json`, `quality.json`, `suggest.json`; an analysis script, not committed):

| Subject, kind | (a) his hand | (b) proposals let through | (c) cannot tell |
|---|---:|---:|---:|
| corals in play (add) | 419 | 809 | 0 |
| corals reject | 74 | 428 | 0 |
| corals excluded | 49 | 27 | 0 |
| corals quality | 127 | 816 | 8 |
| corals growth form | 6 | 817 | 5 |
| corals crop | 92 | 227 | 0 |
| corals cover, featured, view moved, removed | 31 | 0 | 0 |
| fish in play (add) | 3 | 5,848 | 0 |
| fish reject | 12 | 10,554 | 0 |
| fish excluded, Not this, rotation | 5 | 0 | 0 |
| fish tags | 13 | 5,849 | 0 |
| fish ease | 0 | 5,852 | 3 |
| fish phase | 0 | 130 | 0 |
| fish crop | 0 | 5 | 0 |
| fish cover | 0 | 0 | 28 |
| **total** | **831** | **31,362** | **44** |

- What the log cannot tell: a value with no log that differs from today's proposal counts as (a), though it may be an
  older proposal he accepted before the pass changed (the coral adds before the auto-sort of 2026-11-03 among them): (a)
  is an upper bound. The coral growth forms' ✓ Validate N accepts the first guesses in bulk with no log: such a value
  counts (c). A fish cover is his ★ or a Cover proposal he took (admin Cover proposals): the same field, (c). A Light
  proposal he accepted (Accept, or Accept all in one step) makes its fields his in the log (`fishOwn`): (c) when equal
  to the pass, though they are proposals too. The sea slugs' part holds nothing yet.
- In play, on main's data with this PR (the build's reading against the curation as written): 9 photos the auto-sort had
  set aside come back, uncropped: each was re-judged since (the subject unclear `x` then clear, or a near-duplicate then
  another angle, on 2026-11-14 and 15; suggest.json's history), now a sure best or alt; 1 it had put in leaves (judged
  since other species one could take for the subject); and 270 records change (tags 242, ease 123, phase 39; 15
  juveniles' ease), each from a sure judgement. Once #1254's
  re-rate is in, the juveniles' copied ease follows it (the integrator counted 101 that differ).
- The 694 `k` set aside now have a route: a crop that saves one brings it back by itself.
- The corals' games are built as before: their auto-sort's proposals (the (b) column) are not read anew here.
