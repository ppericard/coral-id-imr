# The two compared photos after a wrong answer: stacked or side by side, whichever shows them larger

Date: 2026-11-21. PR: #1351. Rules or docs touched: U2, U4, S1; docs/DESIGN.md "Quiz on desktop"; follows [2026-11-20-compare-photos-whole.md](2026-11-20-compare-photos-whole.md).

## Context

After a wrong answer the quiz stage (`.qstage.qvs`) shows the photo of the right unit and the photo of the unit answered.
#1316 made both show whole, but on a phone (< 600 px) they still sat side by side (forced by CSS), so each box was a
narrow, tall strip and a landscape photo, a fish, was drawn small. The short feedback sheet had already freed the room
under the stage.

## Decision

Pierre, 2026-11-21 05:32, on #1316: «la PR 1316 avec les deux photos comparées qui s'affichent entières sur téléphone,
pour les poissons, je me demande si au lieu de les mettre côte à côte, c'est-à-dire droite et gauche, il ne vaut pas mieux
les mettre au-dessus et en dessous, parce que maintenant on a la place, on avait dégagé de la place pour le faire, donc en
fait je pense que ça s'afficherait beaucoup mieux en étant au-dessus, en dessous. Alors après sur ordinateur je sais pas,
mais sur téléphone je pense que ça marcherait mieux.»

Then, on a small phone under a tall feedback sheet, where stacked draws the photos smaller (360 x 640, fish: 139 x 104
against about 162 x 108), Pierre, 2026-11-21 05:55: «Après, petit téléphone, je veux dire, à un moment donné, il faut être
un peu logique sur l'espace qui nous reste, quoi. Mais bon, si en même temps la réponse, ça prend toute la place de
l'écran, c'est un problème en soi, en fait, si on ne peut plus afficher les photos. Mais peut-être qu'il faut que ça soit
dynamique, il faut que l'espace, en fonction de l'espace qu'on a, on a une présentation qui est différente, je ne sais
pas.»

The layout is dynamic: whichever of stacked and side by side shows both photos larger in the room left (stacked on a tie).
Integrator's call, easy to correct: the same pick at every size class (tablet and desktop already chose by the photos'
shapes), and every subject gets it, since it is the one shared stage (rule S1, no subject test).

## Consequences

`app.css` no longer forces the compared photos' grid on phones; `quiz.js` `fitStage` picks it at every size, for these two
photos by their known shapes (`data-r`, 4:3 if missing) and the stage's real gap, instead of the 4:3 guess the one-photo
stages keep. The stage already ends above the feedback sheet (rule U2: one screen, no scroll), so neither layout scrolls or
crops. A normal phone (390 x 844) stacks them; a small one under a tall sheet can go side by side. `tests/qvswhole.test.js`
holds that no CSS rule forces the grid and that fitStage scores by shape; `tests/pages.smoke.js` part `noupscale` checks the
choice in a browser (390 x 844 stacked, 360 x 640 with a tall sheet side by side, always the larger of the two, whole).
