# The two compared photos after a wrong answer show whole

Date: 2026-11-20. PR: #1316. Rules or docs touched: U2, U4, P4; docs/DESIGN.md "Quiz on desktop".

## Context

After a wrong answer the quiz stage (`.qstage.qvs`) shows the photo of the right genus next to a photo of the genus
answered. On phones (< 600 px) the two boxes sit side by side and are portrait, and `app.css` filled them
(`object-fit: cover`), so a landscape photo, a fish, was cut to its middle. Tablets and desktop already showed the photo whole.

## Decision

Pierre, 2026-11-20, from the app, on the fish practice quiz (Abudefduf given for Chromis): «Sur mauvaise réponse, les 2
photos sont hyper croppées horizontalement et on ne voit plus que le milieu des poissons».

Consequence (integrator's call on how, easy to correct): the compared photos use `object-fit: scale-down` on the blurred
background at every size, never `cover`, never drawn past their own pixels. It is the one stage of every subject (rule
S1): fish, corals and sea slugs, with no subject test. `tests/qvswhole.test.js` keeps `cover` out of the rules.
