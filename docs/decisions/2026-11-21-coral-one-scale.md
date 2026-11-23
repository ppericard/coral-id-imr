# Corals: the bonus genera count on one scale of every game genus, today's % kept as the IMR slate score

Date: 2026-11-21. PR: #1474. Rules or docs touched: L6, D4, D5; docs/LEARNING.md "Millepora and the bonus genera"; docs/spec/quiz.md "Bonus genera"; docs/spec/achievements.md "The badge"; docs/spec/sync.md; docs/spec/admin-players.md; REE-43.

## Context

The coral bonus genera (`core.js` `BONUS`: five genera off the IMR list but common at Dauin) were opt-in and never counted in
the progress: the headline % was the mean of the slate genera's bars (rule L6 as it stood). The owner, reading the
players' reports, asked that they count; the question was then on what scale: (A) one scale of every game genus for
every player, today's % kept as an "IMR slate" score, or a scale that changes with the player's choice.

## Decision

The bonus genera count in the global progress, on one scale of every game genus (`core.js` `gameOf`: the slate and the
bonus genera, 45 genera then), for every coral player, opted in or not; today's % over the slate alone stays as a separate
"IMR slate" score (Pierre, 2026-11-20, Reports: «Les genres bonus dans les coraux devraient définitivement compter dans
le progres global»; 2026-11-21 05:40, Q445 (A): «une seule échelle de 45 genres, oui, et du coup le pourcentage actuel
gardé comme score ardoise IMR»). The opt-in, its offer and ⚙ Bonus genera On / Off stay as they were. Where the IMR
slate score shows (a bar under the player's name on My progress, the header pill's tooltip) and its wording are the
integrator's call, easy to correct.

## Consequences

- The headline % (the header pill, My progress's ring, the achievements, the update card, the admin's Progress) is
  over `app.js` `scaleUnits()` (`UNITS` `scale`, generic: a subject without one keeps its slate); the IMR slate score is
  `progress.js` `slatePct` (`UNITS` `slateName`). A player who leaves the bonus genera off tops out below 100%, as a
  fish level turned off stops rising.
- The save summary's genera and % (the sheet's "By genus" header, which the corals' leaderboard ranks over) follow the
  scale only once the script widens that tab's grid before writing (`sync.js` `SCALE_SHEET`, rule D4); before, the
  slate's, as before.
- No genus's bar moves; rules version 14 (`core.js` `RVS`, no card) makes every device take the replay once (rule D5).
- Rule L6 says it now; the simulations' shown % stays over the slate.
