# Groups by scope, in the Rights column; one audited write for every rights change

Date: 2026-11-21. PR: #0000. Rules or docs touched: docs/SECURITY.md "Rights and the Audit tab"; docs/spec/sync.md
"Rights and the Audit tab", "Player groups".

## Context

Groups carry an instance's rights ([the earlier record](2026-11-19-groups-carry-rights.md), Q408). Pierre asked that a
group be scoped to the instance or to one subject, and the scope needed a place in the sheet. The rights were written by
several functions, each writing its own Audit rows.

## Decision

Pierre, 2026-11-20 (Reports tab): «Groups have to be either instance wide or subject specific. For example, student
groups and staff are instance wide. Trainers and Curators could be subject specific.» Q447, 2026-11-21 05:40, the
scope in the existing Rights column (`content@subject:fish`), no new column: «Question 447, pour le périmètre d'un
groupe, dans la colonne des droits existants, oui, pourquoi pas, oui, c'est pas con.» The one audited-write path is
rights PR 2a of Q408's plan (ROADMAP "Roles, instances and cohorts", REE-31).

Integrator's calls, easy to correct, each the narrower reading:
- Only the Curators' and the Trainers' rights (`content`, `live`, `cohorts`) take a subject's scope; `players`,
  `settings` and `grant` stay at the instance (his examples name Trainers and Curators only).
- A group's rights share one scope: instance wide, or one subject (his "either … or").
- A subject's scope is `subject:` and the exact id of a subject of `core.js` `SUBJECTS`; anything else is refused, and
  an entry written by hand that the script does not take gives nothing and is a Deploy log line.
- A group without rights stores no scope: it is instance wide (staff, a cohort, a beta group).
- The instance's `grant` reaches its subjects, so a Manager changes a subject's group.
- Deleting an empty group that carries rights takes its rights away first through the one write, audited, and asks
  `grant` (the study's §3 gate table said `players` for a delete; the audited rows are needed either way, the gate is
  a one-line change back).
- Before and after go in the existing Audit tab (the study's §3 "Audit" names it): a membership or a place on the admin
  list by its verb and Result, a group's rights by a `rights <before> > <after>` row. No column is added.

## Consequences

`Code.gs` `rightsWrite_` is the only writer of the admin list, a group's Rights cell and the memberships of the groups
that carry rights; `tests/rightswrite.test.js` traces every write to those stores and checks that each change of
anyone's rights has its Audit row. `can_` reads a right held at a subject at that subject only, and a live game asks
`live` at its subject. No sheet column or tab changes; the app reads no right, so no version gate. The admin page shows
a subject's right as "Content (subject:fish)"; choosing a scope on the Groups page is a later admin step. Specified in
docs/SECURITY.md and docs/spec/sync.md.
