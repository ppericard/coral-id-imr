# A rule not followed gets a Linear issue, not an automatic new rule

Date: 2026-11-23. PR: #1501. Rules or docs touched: INTEGRATOR.md "Questions and corrections".

## Context

On the evening of 2026-11-23 the integrator opened a Linear issue (REE-250) that duplicated an existing one (REE-191)
and told Pierre a decided feature (the opt-in placement test, REE-112) did not exist, because it had not searched
first. It then said «la leçon pour moi … c'est déjà la règle du projet et je ne l'ai pas suivie ce soir». Pierre's
mandate of the same afternoon already said not to write a new rule for each incident but to look for its cause.

## Decision

Pierre, 2026-11-23 20:51 Manila: «la règle, ça devrait presque être qu'à chaque fois que tu dis « j'ai pas suivi la
règle », il faut que ça crée il faut que tu crées une issue automatiquement pour dire bah, « j'ai pas suivi la règle,
voilà ce qui s'est passé, voilà le contexte » … Et comme ça, ça permet de digérer cette information sans pour autant
créer de manière automatique et de suite une nouvelle règle que tu n'arriveras pas à suivre non plus d'ailleurs.»

So whenever a standing rule is found not followed (by the integrator, or in an agent's report), the integrator opens a
Linear issue labelled "Rule not followed" (project Working method and project tracking) with what happened, the
context, what should have happened, what exists today (and whether the "rule" is written at all), and the causes to
look at. The incident's own repair (the work and what caused it, INTEGRATOR.md "A correction repairs the work and
what caused it") is not held back. What the issue replaces is a new rule written on the spot: such issues are read
together for a common cause, and a change of rule is weighed from that reading.

Integrator's choices (easy to correct): the label's name, the project, the issue's sections, an agent's report as a
trigger.

## Consequences

The Linear label "Rule not followed" exists; REE-251 (the duplicate issue) and REE-258 (questions left outside
Linear's Decisions view) are the first two. A guard that makes the search before a new issue durable (#1507,
`tools/issue_guard.py`) answers REE-251 as a tool, waiting for Pierre's OK.
