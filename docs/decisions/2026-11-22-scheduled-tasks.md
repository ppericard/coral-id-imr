# Tasks that only come back on a date or a trigger are labelled Scheduled and left out of every list

Date: 2026-11-22. PR: #1453. Rules or docs touched: docs/INTEGRATOR.md "Linear".

## Context

Renewing the admin's GitHub token before the end of January kept showing in the task lists and reports Pierre reads,
two months before it matters. A task that cannot be done before a set date or a named trigger has nothing to say until
then.

## Decision

Pierre, 2026-11-22 06:06: «Il va falloir qu'on imagine un statut différent pour certaines tâches … créer une section
pour les tâches juste qui sont programmées et qui n'ont pas besoin de revenir avant une date précise ou un déclenchement
précis. Ça sert à rien de me le répéter, de le faire alors que c'est dans plus de 2 mois.» Linear's team label
**Scheduled**: such a task sits in Backlog with that label, its due date (or its trigger, in the description's "Comes
back" line), and stays out of every list, report, STATUS and question to Pierre until then. The integrator brings it
back to Todo and tells Pierre once. Integrator's call, easy to correct: it brings a dated task back 14 days before its
due date. Scope as he spoke it: tasks scheduled for a date or a precise trigger only; Waiting and Parked are unchanged.

## Consequences

REE-75 (renew the admin GitHub token, due 2027-01-15, back 2027-01-01) and REE-73 (the trainer role to host a live game,
back when Pierre wants to host one) carry the label. The integrator checks the Scheduled issues at each session start.
