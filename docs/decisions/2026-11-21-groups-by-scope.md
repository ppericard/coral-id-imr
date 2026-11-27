# Groups by scope, in the Rights column; one audited write for every rights change

Date: 2026-11-21, revised 2026-11-27 before merge (step 1 of
[the 2026-11-26 record](2026-11-26-roles-groups-assignments.md)). PR: #1554. Rules or docs touched: docs/SECURITY.md
"Rights and the Audit tab"; docs/spec/sync.md "Rights and the Audit tab", "Player groups", "Live games";
docs/spec/admin-players.md.

## Context

Groups carry an instance's rights ([the earlier record](2026-11-19-groups-carry-rights.md), Q408). Pierre asked that a
group be scoped to the instance or to subjects, and the scope needed a place in the sheet. The rights were written by
several functions, each writing its own Audit rows. Three studies of 2026-11-26 (#1611, #1612, and Astra's independent
study with its review) then proposed roles, groups and assignments; Pierre answered them on 2026-11-26 and asked for
#1554 to be revised before it merges.

## Decision

Pierre, 2026-11-20 (Reports tab): «Groups have to be either instance wide or subject specific. For example, student
groups and staff are instance wide. Trainers and Curators could be subject specific.» Q447, 2026-11-21 05:40, the
scope in the existing Rights column (`content@subject:fish`), no new column: «Question 447, pour le périmètre d'un
groupe, dans la colonne des droits existants, oui, pourquoi pas, oui, c'est pas con.»

Pierre, 2026-11-26 ~09:50 Manila (REE-31; [the 2026-11-26 record](2026-11-26-roles-groups-assignments.md)), each «ok»:
2. «#1554 revised before merge: keep the central writer and its tests; a list of subjects in place of one scope per
   group; Before/After as columns; each change and its audit in one write.»
3. «`grant` allowed in roles other than Manager, through a separately confirmed edit; for the guard, a manager counts
   only with the full bundle (players, settings, grant).»
4. The last admin or manager: Astra's handover (forcing replaces the holder in the same operation by a successor or a
   standby; never an empty seat; a player deleting their own account is never trapped, the standby takes over). 09:55:
   «ça va être pénible de voir un warning tout le temps si on ne peut rien y faire»: the hard minimum is 1 + 1, with
   no permanent warning.
7. Astra's three risks: an opaque audit id per account, the live host rechecked at each privileged action, a
   confirmation bound to the exact state.

Pierre, 2026-11-27 ~08:40 Manila: «ok» to step 1 only (the writer, the audit, the guards, which give no new right to
anyone); roles and assignments over other accounts wait for REE-172.

Integrator's calls (2026-11-21 and 2026-11-24), easy to correct, kept:
- Only the Curators' and the Trainers' rights (`content`, `live`, `cohorts`) take a subject's scope; `players`,
  `settings` and `grant` stay at the instance (his examples name Trainers and Curators only).
- A subject's scope is `subject:` and the exact id of a subject of `core.js` `SUBJECTS`; anything else is refused, and
  an entry written by hand that the script does not take gives nothing and is a Deploy log line.
- A group without rights stores no scope: it is instance wide (staff, a cohort, a beta group).
- The instance's `grant` reaches its subjects, so a Manager changes a subject's group.
- Deleting an empty group that carries rights takes its rights away first through the one write, audited, and asks
  `grant`.

Asked of Pierre on 2026-11-27 (the PR's "Choices I made"), built as recommended until he answers:
- "One write" is a compensating write: the change, then its Audit rows in one write of the tab; when the rows cannot
  be written the change is taken back and the request answers an error. A true single Sheets batch would need the
  Sheets advanced service, whose scope is broader than `spreadsheets.currentonly`: a new authorisation for Pierre.
- A player's own delete with no standby left goes through, the seat left empty, said by an Audit row and a Deploy log
  line (never trapped wins over never empty; the token gives a seat back).

Integrator's calls of this revision, easy to correct (2026-11-27):
- A group's list of subjects is a rectangle: each of its rights at each of its subjects (refused otherwise, `scope`),
  so a group has one scope as before, now the instance or a list.
- Before and After hold the account's whole rights after the change (`content@instance:imr,live@subject:fish`, `-` for
  none), a group's rights for its own row, `on` / `off` for a standby, the seat counts for a stop.
- The audit id is a keyed hash of the account's generation (`_acct`, made with the account): one per account lifetime,
  not derived from the name, nothing new stored.
- The confirmation expires after 5 minutes.
- `grant` given to a new group (no member yet) is confirmed with its making; to an existing group, by an edit that
  changes nothing else.
- A standby is a row of the Roles tab (role `standby`), no new column; it holds no right until it takes a seat over.
- The live host is checked again at each question and reveal; a right taken since ends the game for everyone.
- The admin's other Audit rows about an account name it by its audit id too.

## Consequences

`Code.gs` `rightsWrite_` is the only writer of the admin list and the standbys, a group's Rights cell and the
memberships of the groups that carry rights; `tests/rightswrite.test.js` traces every write to those stores and checks
that each change of anyone's rights has its Audit row with its Before and After. `can_` reads a right held at a subject
at that subject only, and a live game asks `live` at its subject. The Audit tab gains two columns at its end, Before
and After (sheet `vNEXT`; rule D3; old rows stay blank); nothing in the app reads them, so no version gate. The admin
page shows a subject's right as "Content (subject:fish)", asks before giving Give rights, and says why a change that
would empty a seat was not done; the seat counts, the handover's controls, the standbys and the audit history come
with the Roles page (step 4 of the 2026-11-26 record). Specified in docs/SECURITY.md and docs/spec/sync.md.
