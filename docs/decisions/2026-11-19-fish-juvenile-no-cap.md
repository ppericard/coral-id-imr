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
  juvenile eases would need re-rating; run as its own judging pass after this PR.

Built: `cap` caps no juvenile, in either rubric; `juv_early` is gone; the ease scales' "2 hard" no longer name a
juvenile; `suggest.json` re-applied (`tools/judging_fish.py rep`, and `codes` for the sea slugs).

## Consequences

- **The codes held the typed ease**; the cap ran at build. 186 judged candidates in `suggest.json` and 13 reference
  photos move up (2 to 3, 4 or 5); in play, 157 photos of `fish-game.json` (cand 144, ref 13: 2→3 107, 2→4 34,
  2→5 16), rebuilt by the photos workflow after the merge.
- **The typed eases were themselves shaped by the old line** "2 hard: a juvenile": among the 2,557 in-play juveniles of
  no early class, 2,295 were typed 1 or 2 (90%), against 148 of the 500 early-class ones (30%). They keep the ease typed
  then until the re-rating pass. The 40 sea slug juveniles judged (7 in play) were all typed 1 or 2: none moves here.
- 15 in-play juveniles whose ease is the auto-sort's copy in `curation.json` differ from the new cap and keep their
  stored value (rule A1).
- **When a juvenile comes is unchanged**: it rests on the classes of 2026-11-04 and Q391 (`core.js` `varKindOf`,
  `VAR_AT`: early from the first question, class B and late at Advanced, the others from Open Water) and the mimicry
  class of 2026-11-18 (#1133), never on the cap. Which photos are drawn once released moves with their priors.
- No rules version: the sheet's replay scores each answer with the difficulty logged then, never a photo's ease.