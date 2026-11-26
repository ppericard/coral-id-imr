# "Not now" always gets a when; Scheduled is a date; a trigger must be sure to come

Date: 2026-11-26. PR: #1609. Rules or docs touched: docs/INTEGRATOR.md "Linear". Changes: [2026-11-22, Scheduled
tasks](2026-11-22-scheduled-tasks.md).

## Context

On 2026-11-26 about fifteen issues sat in Backlog as Parked or Scheduled "on Pierre's signal", with no date. Nothing
would ever bring them back, and some triggers ("the next circle review") might never come.

## Decision

Pierre, 2026-11-26 08:36: «quand je dis "pas maintenant" ça veut dire pas maintenant, dans l'instant. Mais je m'attend à
ce que la question revienne, sauf si j'ai dis explicitement de remettre à plus tard avec un délai explicite. En fait, tu
ne devrais jamais accepter un "pas maintenant" de ma part, et me demander/forcer à donner un délai.» To the wording
shown: «Oui». On triggers, 08:48: «IL faut que ça soit un déclencheur qui ait une chance de se déclencher. Soit par une
date soit par un pré-requis qui va arriver. Attention à ne pas mettre des déclencheurs susceptibles de ne jamais
arriver, sinon l'issue peut être bloquée.»

- A "not now" from Pierre is answered with "when?": an hour, a day, a week, a month, several months. The issue gets that
  date, with the label Scheduled.
- Scheduled is a date only. The 2026-11-22 record's "or a named trigger" no longer holds.
- An event that is not a date becomes a blocked-by relation to the issue of that event, or Waits on › External with a
  date to check again, and only if it is sure to come. A trigger that may never come is not used: a date is asked.
- Parked (reason 4) needs a date or such a trigger.

## Consequences

The issues on Pierre's signal (REE-73, 91, 93, 100, 108, 115) and the photo waits (REE-79, 109, 116) are brought to him
for a date or reworked as relations, at the next session of questions.
