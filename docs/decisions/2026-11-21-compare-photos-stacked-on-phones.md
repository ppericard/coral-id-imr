# The two compared photos after a wrong answer are stacked on phones

Date: 2026-11-21. PR: #1351. Rules or docs touched: U2, U4, S1; docs/DESIGN.md "Quiz on desktop"; follows [2026-11-20-compare-photos-whole.md](2026-11-20-compare-photos-whole.md).

## Context

After a wrong answer the quiz stage (`.qstage.qvs`) shows the photo of the right unit and the photo of the unit answered.
#1316 made both show whole, but on a phone (< 600 px) they still sat side by side, so each box was a narrow, tall strip and
a landscape photo, a fish, was drawn small. The short feedback sheet had already freed the room under the stage.

## Decision

Pierre, 2026-11-21 05:32, on #1316: «la PR 1316 avec les deux photos comparées qui s'affichent entières sur téléphone,
pour les poissons, je me demande si au lieu de les mettre côte à côte, c'est-à-dire droite et gauche, il ne vaut pas mieux
les mettre au-dessus et en dessous, parce que maintenant on a la place, on avait dégagé de la place pour le faire, donc en
fait je pense que ça s'afficherait beaucoup mieux en étant au-dessus, en dessous. Alors après sur ordinateur je sais pas,
mais sur téléphone je pense que ça marcherait mieux.»

On phones the two photos are stacked, one above the other, each whole. Integrator's call, easy to correct: tablets and
desktop are left as they were (`quiz.js` `fitStage` picks the grid from the photos' shapes), and every subject gets it,
since it is the one shared stage (rule S1, no subject test).

## Consequences

`app.css` phone block: `.q .qstage.qvs` is one column and two equal rows (`!important`, over the grid `fitStage` writes
inline), each box the full width and half the height of the stage, and the stage already ends above the feedback sheet
(rule U2: one screen, no scroll). A tall sheet on a small phone shrinks both photos evenly; they are never cropped and the
stage never scrolls. `tests/qvswhole.test.js` holds the phone grid and that no other size class forces it;
`tests/pages.smoke.js` part `noupscale` checks the boxes in a browser (stacked at 390, side by side at 1280, whole).
