# Fish reference photos: one judgement, the level read from the photo

Date: 2026-11-19. PR: #1045. Rules or docs touched: P1, L11; judging/FISH.md "Reference photos", "Reference level";
LEARNING.md "Fish: easy, reference-like photos first, whoever took them"; spec/fish-photos.md "Reference photos";
ROADMAP "Fish: the reference route still read in two places".

## Context

A fish photo that came in by the reference route (`rep`: iNaturalist's taxon photos, FishBase's main picture) took one
ease point more than the same judgement as a candidate, its flag `r` weighed 8 points in the order's tie-break, and a
`rep` photo judged 4-5 was reference level without the reference look. #942 found 423 photos judged both ways. Built,
the change moves 1,184 photos one ease point down and 1,555 photos in or out of the reference level, and its level-1
check (5 seeds, the app world) breached one guardrail: the bar's error (`over`) for one profile, +0.045 against the
margin 0.03, the bar moving up toward true knowledge (Q421).

## Decision

- One judgement per photo, whatever its route in, aligned down (no reference ease point on any route): Pierre,
  2026-11-15: "Oui il doit y avoir un seul jugement par photo."; 2026-11-17, about 17:40 Manila, "ok" to A on #942's
  question; 2026-11-18 morning, "ok" to aligning down.
- "Reference" read from the photo, never a tag: Pierre, 2026-11-17: "En vrai 'référence' devrait être déduit des
  caractéristiques de la photo, pas un tag"; 2026-11-18: "La source ne devrait pas être le critère principal de
  'référence' même si ça peut être un fort indice. L'ensemble des photos de référence doit avoir des qualités
  intrinsèques, basées sur des critères objectifs", and "les photos de 'références' par exemple dans iNaturalist
  devraient entrer en priorité dans notre base de données" (rule P1).
- Merge with no further simulation (Q421): Pierre, 2026-11-19 08:53 Manila, "ok" to the question's A ("même réponse,
  merger sans simulation de plus"), as he answered Q413 for #1148: the breach is the bar coming closer to true
  knowledge, so the margin is accepted (rule L11).
- The held-out set follows the new reference level (it leaves out the reference-level photos): Q385 read through rule P1;
  it is not a stored record, so nothing is migrated.
- The integrator's calls, each easy to correct: reference level at ease 4-5 with the look (not 5 only); `REF_LOOK` keeps
  size `m` and count `s`; `tests/winkstock.test.js` tolerates the one surprise-only photo swap waiting for the Candidate
  photos workflow's download; `tests/ratedworld.test.js` checks the species mechanism at 1,200 answers instead of 700;
  the flag `r` stays on the tags as a record of the route.

## Consequences

- `tools/fish_judge.py` `cap` adds the flag `r` and nothing to the ease; `core.js` `refScore` reads the look's traits
  alone; `core.js` `refLevel`, `tools/fish_game.py` `ref_level` and `autosort.js` `fishRec` read the ease (4-5) and the
  look, never `rep` nor the flag. The route only orders the downloads (`tools/fish_game.py` `tier`).
- `suggest.json` (73 judged candidates one point down) and `fish-holdout.json` (117 of 1,945 held-out observations
  swap) are rebuilt with their tools; `fish-game.json` follows at the Candidate photos workflow's next run after the
  merge (the ease of 1,184 photos in play, the covers and first photos of the 1,555 that change level, one surprise-only
  photo).
- `core.js` `refLevel` serves every subject (rule P1 says the same for all): the sea slugs' game photos judged 4 with
  the reference look (a lateral view) join their reference level too, 133 of 3,014 photos in 97 species, none leaving.
  No simulator plays the sea slugs, so no learning check measures that part.
- No progress rule moves (no rules version, rule D5): a replay reads each answer's logged scoring record, never the
  photo's current ease or level. The sheet script's copy of `core.js` changes, with no gate (rule D4).
- Left on the route, as Next work (rule P1): the held-out set's `rep` exclusion (`tools/holdout.py`, which the per-player
  reserve of #1099 replaces). The admin's Coverage "reference" count (`autosort.js` `fishCov`) and tile badge
  (`admin.js` `fishTile`) now read `core.js` `refLevel` on the photo's ease and tags (the admin's, else the pass's).
