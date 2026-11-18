# Player groups: no "apart" setting; group changes show at once

Date: 2026-11-18 (Manila). PR: the one that adds this file (branch `claude/groups-saving`). Docs touched:
ARCHITECTURE.md "Player groups" and the leaderboard line, SECURITY.md "The staff are a group, not a role".

## Context

The group model (sheet v179) gave each group an "Apart" setting, so the staff kept v171's behaviour: off the general
board. An agent made it a group setting whose members also left every other group's board, which conflicts when a
player is in an apart group and in a group that is not. Pierre clicked Apart Off on the Staff group in the admin and
nothing happened for about two minutes: the sheet stored it, but the page showed nothing until its answer came back
(the script lock, then the players read again).

## Decision

Pierre, 2026-11-18, about 18:45 Manila: "Et surtout Appart ne peux pas marcher. Si quelqu'un est dans plusieurs groupes
dont certain sont appart on et d'autres appart off, qu'est-ce qu'il se passe?", then "Il peut très bien y avoir un
classement général où tout le monde apparait. Il fallait surtout que le staff ne rentre pas en compétition avec les
cohortes mensuelles, donc qu'on puisse exclure le staff d'un groupe. Ce que permet déjà les groupes", and "ça serait
effectivement bien qu'on puisse exclure/cacher quelqu'un du classement général si besoin".

- Apart is removed: the general board shows everyone, a group's board all its members.
- Hiding one player: the admin's Hide (Players › List, `userBoard`, sheet v20) already exists; it keeps the player off
  every board. Whether it should hide from the general board only (staying on their groups' boards) is open, for
  Pierre (docs/STATUS.md).
- The integrator's call (easy to change): every group change in the admin says "Saving…" at once, shows the choice
  pressed and greys the group's card until the sheet answers.

## Consequences

- The Group settings tab keeps its Apart column (no data moved, rule W3), written 0 and read no more.
- Today's Staff group, set Apart Off by Pierre, behaves as before this change; nothing to migrate.
- Rules out: a group setting that changes another group's board.
