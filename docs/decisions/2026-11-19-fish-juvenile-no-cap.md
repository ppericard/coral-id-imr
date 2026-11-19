# Juveniles (fish and sea slugs): no ease cap; the judged ease is the starting point

Date: 2026-11-19. PR: #1237. Rules or docs touched: judging/FISH.md "Ease", "Caps", "Juveniles", "Entries out of circle
1"; judging/SEASLUG.md "Caps", "Juveniles"; FISH_PATH.md "Juveniles and colour phases"; spec/fish-photos.md "The
pre-sort"; ROADMAP "Remove the fish easy-photos bootstrap".

## Context

Since rubric 5 (2026-11-04), a fish juvenile's ease was capped at 2 unless its entry was class A or its genus or species
on the entry's early list (`tools/fish_judge.py` `juv_early`), and the ease scale listed "a juvenile" at 2 (hard).
Q431 proposed dropping both, except class B and the look-alikes; the juvenile difficulty study
(docs/reviews/2026-11-19-juvenile-difficulty.md, #1228) then proposed four sourced classes, Off keeping the cap.

## Decision

- Q431, 14:42 Manila: «ok» to dropping "juvenile = hard" and its 2/5 cap except look-alike juveniles.
- Q435, 15:32, on keeping a cap for the look-alike or Off juveniles: «Je suis même pas sur, parce que ça peut les rendre
  hyper remarquables et donc facile à apprendre... Je sens qu'on va devoir finir par voir ce que ça donne sur les vrais
  données...».
- Q435, 15:35: «ok» to the integrator's revised proposal: no ease cap a priori on any fish juvenile, look-alike or Off
  included; the judge's ease is the starting point and the players' answers decide.

- The sea slugs follow the same rule: the integrator's call, easy to correct, under rule S1 (one engine, a difference
  needs a reason): they have no juvenile class, and Q435's reason (a juvenile can be memorable; the answers decide)
  holds for every subject.
- The re-rating of the juveniles typed under the old "2 hard: a juvenile" line: accepted, as Q431's text said the
  juvenile eases would need re-rating; run as its own judging pass after this PR (below, "The re-rate").

Built: `cap` caps no juvenile, in either rubric; `juv_early` is gone; the ease scales' "2 hard" no longer name a
juvenile; `suggest.json` re-applied (`tools/judging_fish.py rep`, and `codes` for the sea slugs).

## Consequences

- **The codes held the typed ease**; the cap ran at build. 186 judged candidates in `suggest.json` and 13 reference
  photos move up (2 to 3, 4 or 5); in play, 157 photos of `fish-game.json` (cand 144, ref 13: 2→3 107, 2→4 34,
  2→5 16), rebuilt by the photos workflow after the merge.
- **The typed eases were themselves shaped by the old line** "2 hard: a juvenile": among the 2,557 in-play juveniles of
  no early class, 2,295 were typed 1 or 2 (90%), against 148 of the 500 early-class ones (30%). The 40 sea slug
  juveniles judged (7 in play) were all typed 1 or 2: none moves here.
- 15 in-play juveniles whose ease is the auto-sort's copy in `curation.json` differ from the new cap and keep their
  stored value (rule A1).
- **When a juvenile comes is unchanged**: it rests on the classes of 2026-11-04 and Q391 (`core.js` `varKindOf`,
  `VAR_AT`: early from the first question, class B and late at Advanced, the others from Open Water) and the mimicry
  class of 2026-11-18 (#1133), never on the cap. Which photos are drawn once released moves with their priors.
- No rules version: the sheet's replay scores each answer with the difficulty logged then, never a photo's ease.

## The re-rate (#1254)

- **Which photos**: every in-play juvenile (`fish-game.json`, `seaslug-game.json`) whose single judgement was typed at
  ease 1 or 2, less the 155 another cap holds at 2 anyway (count `x`, colour loss `3`, clarity `b`): 2,289 fish (121 of
  an early class) and 7 sea slugs. Their judgement lives in `judging/fish/<species>.json` (2,208), else
  `tools/fish_judge.json` (81); `judging/seaslug/` for the sea slugs.
- **How**: each photo's R2 file at 960 px (Pierre's crop applied), seen on contact sheets of 12 at about 390 x 290 px
  with a tile number only (no code, tag or species): blind to the old ease. A cross-check against the kept tags then
  flagged 147 eases (a 5 whose tags are not all the rubric's 5, or two or more from the usual ease of the adult photos
  with the same seven tags); all 147 were judged again blind, one by one at about 780 x 585 px, and set from the photo.
  Only the ease digit changed; tags, flags and caps stay.
- **Full size for every 4 and 5** (Pierre, 20:57: «quand on a le doute, il ne faut pas hésiter à les voir en plus
  haute résolution»): all 656 photos the pass put at 4 or 5 were seen again blind, each alone at 960 px. 375 were
  lowered (4→3 247, 4→2 41, 5→4 71, 5→3 16), mostly for softness, dim light or an oblique body the tiles had hidden;
  none raised. 351 of them show a tag the kept code lacks (softness 197, dim light 68, view 65, a watermark 50, a cut
  or hidden fish 46): listed for a tag pass, the tags unchanged here.
- **Consistency**: a blind second look at 60 tiles (30 flagged, 30 not) agreed with the pass within one level on 59
  (exactly on 76% of the unflagged). After the full-size look, re-rated juveniles average 0.23 below the adults on the
  same seven tags (2.99 against 3.22, 1,560 photos), the adults having been judged on contact sheets only.
- **Result** (typed ease, old → new, fish): 1→1 65, 1→2 294, 1→3 110, 2→1 4, 2→2 322, 2→3 1,144, 2→4 306, 2→5 44:
  1,898 up, 4 down, 387 unchanged; the 2,289 now read 1: 69, 2: 616, 3: 1,254, 4: 306, 5: 44. The early class moved
  least (121: 1→1 4, 1→2 15, 1→3 7, 2→1 1, 2→2 52, 2→3 41, 2→4 1). Sea slugs: 1→3 1, 2→2 1, 2→3 3, 2→4 2.
- **Applied**: `judging_fish.py one`, `rep`, `codes`, `--subject seaslug codes`; `one --check` 0; `seaslug-game.json`
  rebuilt. In play after the caps (the build's plan): 1,817 `fish-game.json` juveniles move (1→2 289, 1→3 107,
  2→1 4, 2→3 1,098, 2→4 278, 2→5 41), rebuilt by the photos workflow. Log: `judging/fish-juvenile-rerate.json`.
- 198 in-play juveniles have their ease in `curation.json` (the auto-sort's copies); 100 differ from the new
  judgement and keep the stored value (rule A1).