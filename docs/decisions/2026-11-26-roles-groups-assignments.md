# Rights: roles, groups and assignments, each scoped to the instance or a list of subjects

Changes: [2026-11-19, groups carry rights](2026-11-19-groups-carry-rights.md)

Date: 2026-11-26. PR: #1615. Rules or docs touched: none in this PR (the build below carries it out).

## Context

#1554 (REE-31) makes one audited writer for every rights change, with one scope per group. Pierre asked for a real
design study instead: roles he defines himself, given to groups and to people, scoped to the whole instance or to a
list of subjects. Three studies compared the options (two by Claude models, #1611 and #1612, and an independent one by
Astra, with a review of both). The 2026-11-19 decision (groups carry rights, Admin outside the groups) is the base this
changes.

## Decision

Pierre, 2026-11-26, 09:50 to 09:55 (Manila; [docs/ANSWERS.md](../ANSWERS.md), REE-31). Points 1 to 5, 7 and 8: «ok».

1. Roles, groups and assignments, scoped to the whole instance (future subjects included) or to a fixed list of
   subjects. «ok». Earlier, 08:36-08:48: «mieux» (a list of subjects per group), «oui, bien sur. Dans chaque matière
   portée par l'instance» (an instance right).
2. #1554 revised before merge: the central writer and its tests are kept; a list of subjects replaces one scope per
   group; Before and After become columns; each change and its audit are one write. «ok».
3. `grant` may sit in roles other than Manager, through a separately confirmed edit; for the guard, a manager counts
   only with the full bundle (players, settings, grant). «ok».
4. Last admin or manager: Astra's handover. Forcing means replacing in the same operation by a successor or a standby;
   never an empty seat; a player deleting their own account is never trapped (the standby takes over). «C'est
   probablement une meilleure pratique. Une encore meilleure pratique serait d'avoir au moins 2 admins et 2 managers par
   instance. Mais c'est pas toujours possible concrètement». On a permanent warning: «ça va être pénible de voir un
   warning tout le temps si on ne peut rien y faire». Integrator's call, easy to correct: the hard minimum is 1 + 1,
   with the handover; no permanent alert. The counts "Admins: n · Managers: n" show in a neutral colour, and a one-time
   dismissible suggestion appears when a seat drops to one holder.
5. A cohort's own list of subjects is a curriculum setting; trainer lines stay in Groups (Q448). «ok».
6. A role given to an already populated group: after the risk was explained, «Aaaaaaaahhhh. J'ai compris! C'est
   l'inscription libre par un code qui pose problème. Oui, ok». A new group is closed by default; an existing group is
   converted by closing self-join and approving each current member one by one. On "Add all": «plus il va y avoir de
   joueurs plus ce bouton sera dangereux. Je propose qu'on le redesigne autour des bétas exclusivement», «Et avec
   confirmation» (REE-305).
7. Astra's three risks are fixed in the build order: an opaque audit id per account, the live host rechecked at each
   privileged action, a confirmation bound to the exact state. «ok».
8. Build order: writer, audit and guards first; then roles and assignments; then the Roles page. «ok».

On 2026-11-26 (09:20) he also said his ACL idea was «un exemple avec lequel je suis familier, pas un exemple à suivre
absolument»: the model is chosen on its merits.

## Consequences

- #1554 is revised before it merges, as in point 2. Question 6 of 2026-11-19 (groups carry only an instance's rights;
  Admin outside the groups) and the one scope per group give way to roles with assignments; the rest of that decision
  stands.
- The PRs follow point 8, one at a time on `Code.gs` (rule W27); REE-65 and REE-37 follow the assignments.
- REE-305 redesigns "Add all" around betas, with a confirmation, and never into a group that holds a role.
- The seat counts and the one-time suggestion of point 4 are built with the Roles page.
