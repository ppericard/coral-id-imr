# Alpha: the effort of a refactor is never an argument

Date: 2026-11-26. PR: #1619. Rules or docs touched: docs/rules/ship.md W3, docs/rules/README.md.

## Context

On REE-294 (b) the integrator argued against a separate file for the IMR lecture photo references, because some fifteen
tools read the current format. The question was whether the cost of changing a format weighs in a design choice.

## Decision

Pierre, 2026-11-26 15:05: «La difficulté d'une refont ne doit jamais être un argument à ce stade du développement. Seul
le résultat final et la conception doivent aider à décider». On the first wording ("At this stage of development"):
«ça va mal vieillir.....». To the wording tied to the alpha phase (16:59): «ok». His follow-up, 16:59: «Et du coup il
nous faut un vrai suivi de version pour l'app (ce qu'on n'a pas vraiment à l'heure actuelle...)», now REE-311.

## Consequences

Rule W3 gets a second paragraph: in alpha, the effort of a refactor or a migration never decides a design choice; a
change costly to undo for players or their records still waits for his OK. REE-294 (b) is decided on design alone:
option B, the lecture photos' references in their own file in the IMR layer («ok», 16:59). REE-311 will give the app a
version a person can read, so that "in alpha" is a fact.
