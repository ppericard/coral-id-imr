# Groups carry an instance's rights; one Trainers group and per-cohort trainer lists; Admin outside the groups

Changed by: [2026-11-26, roles, groups and assignments](2026-11-26-roles-groups-assignments.md)

Date: 2026-11-19. PR: #1190. Rules or docs touched: none in this PR (the study's four PRs carry it out).

## Context

Roles step 1 keeps rights in a Roles tab beside the player groups. The groups-carry-rights study
([the review](../reviews/2026-11-18-groups-carry-rights-study.md) §6) proposed one concept, groups that carry settings
and rights, with eight questions for Pierre (Q408), each with a recommendation.

## Decision

Pierre, 2026-11-19, 06:50 to 06:58 (Manila; [docs/ANSWERS.md](../ANSWERS.md)):

- Questions 1-4 and 8 as recommended: one concept (a player's rights are the union of their groups'); only additive
  settings and rights; the Rights and Code hash columns; only `grant` at the rights' scope changes a rights group; one
  confirm naming the rights when a player is added to a group with rights.
- Question 7 as recommended (a merge drops rights memberships, audited), and: "Une fusion de groupe devrait générer un
  warning, avec les modifications que ça entraine en pratique sur les réglages et les droits."
- Question 5 changed: "je suis pas fan de devoir créer un nouveau groupe de trainer chaque mois". Accepted at 06:52: one
  "Trainers" group gives the capacity; each cohort group carries its own list of trainers (members of "Trainers"); a
  trainer follows and invites only the cohorts that list them; only an account with `grant` edits that list.
- Question 6 changed, after his doubt ("admin … c'est le seul rôle inter-instances"). Accepted at 06:58: groups carry
  only an instance's rights (Managers, Curators, Trainers); Admin stays outside the groups (the token plus a short list
  of admin accounts kept apart, not editable from the Groups page, shown in the Audit).

## Consequences

The study's four PRs (the script, rights on the Groups page, rights in the load reply, the rule and ROADMAP) build it,
with 5 and 6 as changed here and the merge warning. Question 2 asks for a rule on additive settings: its wording goes
to Pierre for his OK first (AGENTS.md "Writing a rule down").
