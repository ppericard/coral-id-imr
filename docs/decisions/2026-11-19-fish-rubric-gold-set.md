# Fish judging rubric: the gold set's corrections

Date: 2026-11-19. PR: #1218. Rules or docs touched: P1, P3; judging/FISH.md "How to look", "Tags", "The gold set's
corrections", "The observer's life stage", "Ease", "Caps", "Candidates", "Other species: the split"; spec/fish-photos.md
"The pre-sort", "What is in play".

## Context

The model measure of fish photo judging (docs/reviews/2026-11-19-model-measure-fish-judging.md) found that the
committed judgements do not reproduce themselves, and proposed a gold set. Pierre reviewed 30 photos one by one,
2026-11-19 11:28-11:39 Manila, dictating his verdicts against one blind judge's tags (photos 1-14 at 11:28, 14-22 at
11:34, 23-28 at 11:37, 29-30 at 11:39), and added a rule on the observer's life stage at 11:43 (docs/ANSWERS.md).

## Decision

Each rule rests on his words on the photos named (verbatim dictation):

- **The observer's life stage prevails.** 11:43: "Il peut émettre un avis, mais son avis pèse beaucoup moins qu'un
  observateur humain, sauf s'il a des preuves solides". Photo 24: "Si l'observateur il dit que c'est un juvénile, c'est
  qu'il a des raisons de penser que c'est un juvénile. L'agent de jugement, il n'est pas capable de faire un jugement de
  biologie"; photo 20: "Attention à ne pas venir contredire ce que disent des humains potentiellement experts".
- **Screens and video captures, flag `a`.** Photo 12: "c'est une photo d'un écran [...] Donc là typiquement il faut
  l'exclure"; photo 28: "c'est pas un filigrane en fait, c'est un screenshot depuis un lecteur vidéo".
- **A school is sized as the group.** Photo 7: "chaque poisson est petit dans l'image, mais le banc, il prend quasiment
  toute la place de l'image"; photo 17: "Le banc prend toute la place de l'image"; photo 11: "si tu prends en compte les
  deux". A fish beside another animal alone, photo 9: "il n'est pas moyen dans l'image, il est tout petit en haut à
  gauche". Between two sizes the smaller: the judge was a size too large on photos 10, 18, 24, 25, 29 (photo 18: "Grand
  dans l'image, non. Il est moyen dans l'image").
- **Divers or another animal filling the frame, count `x`.** Photo 15: "Les plongeurs prennent juste toute la place";
  photo 9: "il y a surtout un grand jellyfish qui prend toute la place [...] moi celle-là je l'exclurais".
- **Light is the light falling on the fish.** Photo 17: "la lumière est plutôt bonne, c'est le contraste qui est pas
  bon"; photo 28: "pris avec une lampe vidéo sur une partie de l'image"; photo 29: "il y a trop de highlights [...] donc
  la lumière est moyenne".
- **Retouched colours.** Photo 10: "dont les couleurs ont été bidouillées. Mais ça, c'est typiquement des mauvaises
  couleurs"; photo 16: "C'est même beaucoup terni, ça a été corrigé, ça"; photo 23: "ça a été retravaillé proprement";
  photo 18, kept in play: "c'est une photo que je garderai en jeu, même si les couleurs sont pas terribles"; photo 5, on
  the judge's "photo très retouchée": "Moi je le vois pas en tout cas".
- **Strong blur is `b`, at most ease 2, kept in play.** Photos 5, 19: "même beaucoup flou"; photo 28: "c'est même
  beaucoup flou"; photo 29: "même limite beaucoup flou", each typed `m` by the judge; photo 19: "ça c'est une photo qu'on
  garderait en jeu, mais qui effectivement est pas facile". Photo 13 on low contrast: "je pense pas que l'eau soit
  trouble et je pense pas que ça soit flou".
- **What a 5 needs.** Photo 30, a wire coral goby judged 4 with every condition of 5: "qu'est-ce qu'il te faut pour avoir
  un 5/5 [...] parce qu'il n'y a pas beaucoup de photos qui seront mieux que ça en fait".
- **The view: `p` while the flank faces the camera, `o` only when it is foreshortened.** Photo 21: "De 3/4 entiers,
  non, ils sont carrément de profil là"; photo 22: "non, là il est de profil entier"; he confirmed `p` on photos 17
  ("Profil entier, bah à nouveau oui"), 23 ("de profil entier"), 27 ("de profil partiel, oui") and 29 ("de profil
  partiel, ouais, coupé ou caché"), which a first wording of this rule pushed blind judges to `o`; `o` for photo 25,
  "on est légèrement au dessus, on est aux 3/4 au dessus en fait" (three-quarters from above, the back showing).
- **Other fish dark and poorly seen, `o`.** Photo 21: "parce qu'ils sont sombres et qu'on les voit pas bien [...] il n'y
  a pas vraiment de confusion possible".
- **The integrator's calls**, each easy to correct: `a` widened rather than a new flag (a new field in the code is the
  kind of change Q429 holds for Pierre); the blur cap at 2 and for the fish only (his review was of fish; sea slugs keep
  theirs, `tools/fish_judge.py` `RUBRICS` `blur2`); solid evidence against the annotation departs from it only with
  `unsure`, so he sees it; the levels for retouched colours (loss `1` near true, `2` plainly wrong; he gave none); the
  admin's label for `a`, "out of water or a screen"; the rubric's quotes moved here and its passes' history shortened
  (its size budget).
- **Not taken** (a hedge, or open): the fish in front of the moray (photo 5: "Moi je serais un peu moyen sur ça"); the
  colour cast of photo 20 ("je suis pas sûr"); backscatter on a sharp fish (photo 8: "Je suis même pas sûr"); the ease
  of a recognisable family (photos 7, 18), tied to Q431.

Open, unchanged: a contrast field or rule (Q429; photos 6, 13, 17, 27), saving a photo by a crop that takes out the fish
one could confuse (Q430; photos 10, 23), the juvenile ease (Q431; photos 4, 7).

## Consequences

- No photo already judged changes: every committed code with clarity `b` already has an ease of 2 or less
  (`tools/fish_judge.json`, `judging/fish/*.json`, `suggest.json`, `fish-game.json` checked), so nothing is rebuilt.
  The other corrections act on the next judgements.
- Following the annotation puts more juveniles under the juvenile cap (2), which Q431 questions.
- The gold set's 30 photos measure the next judging check, in-sample for this rubric (it was corrected on them).
