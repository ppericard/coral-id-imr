# Decisions kept from the front-end comments: Pierre's words that only the code held

Date: 2026-11-18. PR: #1126, the comment clean-up of the front-end files under 1,000 comment lines (`progress.js`,
`autosort.js`, `learn.js`, `analysis.js`, `admin-analyses.js`, `admin-demo.js` and the smaller ones). Rules or docs
touched: none (rule W19: history stays in git and the PRs, a decision goes to docs/decisions/).

## Context

The comments of these files carried Pierre's dated words above the code they decided. The clean-up rewrote the comments
to say what the code does now. Each quote and dated decision was first searched for in docs/; those found in no doc, or
only without his words, are kept here, one line each, and the comment points here.

## Decision

One line per decision, oldest first: the date, Pierre's words as the comment gave them, what they decided, where it
lives in the code.

- 2026-11-01: "agents who develop the app must be able to see and test the admin section": the admin's demo mode,
  `admin.html?demo`, every page on made-up players and answers, no token, nothing leaving the browser. `admin-demo.js`.
- 2026-11-01: "a badge, as in video games"; 2026-11-02: one compact element with the ring, at the top of My progress,
  not under the slate tiles. The player's card (ring and %, name, rank and Elo, units learned, achievements).
  `progress.js` `badge`.
- 2026-11-01: "the leaderboard takes long to load": the last board is kept on the device and shown at once, then
  replaced when the fresh one arrives; it is also fetched a few seconds after start-up. `progress.js` `BOARD_C`,
  `boardCached`, `loadBoard`.
- 2026-11-01: "redo the calculation cleanly for everyone, achievements too, locking again those unlocked when they
  should not have been" (the principle docs/LEARNING.md quotes from 2026-11-08): every achievement of every subject is
  tested again on the current progress with the current rules, once per device and record version. `progress.js`
  `achMigrate`, `ACH_V`.
- 2026-11-02, the first RAs playing: "more on each player: their progress, the genera that were easy and less easy for
  them, when they unlocked each genus, an analysis of a person's path": the admin's player Journey. `admin-journey.js`
  `renderJourney`. The same day, on it: "bring that page's numbers into the journey" (the Games card, Players' numbers
  for one player: `jGames`); "you know which question validated the exam" (a genus learned at its last right exam
  question); "what is this curve based on?" (the learned curve counts only the genera whose time is known).
- 2026-11-03, Coral basics: "give 2-3 examples on real photos, larger, beautiful photos": the growth forms step shows
  2-3 large photos per IMR form (`proto/basics.js` `FORMS7`); "many will look at Separate and move on to step 7 without
  seeing the other wall types": the walls step shows the four types one after the other, its main button "Next wall
  type" until all are seen (`proto/basics.js`, the walls step).
- 2026-11-03, of the auto-sort's quality field (the blind test of the calibrated pass gave 73%): "good enough since Elo
  takes over": its auto stays on from 73% agreement, the players' answers setting a photo's difficulty. `autosort.js`
  `AUTO.min.quality`.
- 2026-11-04: "I love this kind of multifactor report… every 1000 new answers… a new section in the admin with several
  sub-pages, with visualisations, reports, graphs, tables": the admin's Analyses group, one report per 1000-answer
  milestone, computed by a GitHub Action and stored in the sheet. `analysis.js`, `admin-analyses.js`.
- 2026-11-04: "a non-statistician must understand it at a glance": every effect of the Analyses has a plain reading in
  words (what is compared, which way and how much, for a typical player and photo, with its likely range).
  `analysis.js` `PLAIN`, `plainOf`; `admin-analyses.js` `anPlain`.
- 2026-11-04: "what can we learn from each play session, and from sessions in general?": Analyses › Sessions in
  figures (every session in a table, when sessions start, the result along a session and at its end, how sessions end,
  the breaks between them, the players who come back). `analysis.js` `sessDesc`.
- 2026-11-06: "Journey is per mode, necessarily" and "everything that helps me follow how players' progress goes": one
  Journey per subject, every subject's progress replayed from its answers. `admin-journey.js` `renderJourney`.
- 2026-11-07 08:50, of a part of the slate opened by choice (the fish's third circle): "the player must be able to
  unlock them later, notably from My progress": My progress offers "Open them" as its card does. `progress.js`
  `quizBoard` (`[data-opens]`).
- 2026-11-08, of an opt-in set (the fish scientific genera): "si les gens veulent aller dans leur page progrès ou même
  dans les settings, d'activer les genres s'ils le veulent": My progress turns the set on as ⚙ does. `progress.js`
  `quizBoard` (`[data-seton]`).
- 2026-11-09, of the fish auto-sort's blind Checks, as the comment gave his ruling: not to-dos, they have their own count
  in Candidates. `autosort.js` `fishCandTodo`.
- 2026-11-14, of the confusion heatmaps (Q123 m): "the fish, once their admin pages name the view": a subject has the
  Heatmap only once its admin pages name it. `admin-heatmap.js`, `core.js` `SUBJECTS` admin pages.
- 2026-11-14, of the light proposals: "ok pour (a)": the admin's adds that kept tags and ease from before rubric 6 get
  the re-judged ones as a proposal, Accept or Keep mine. `admin-light.js`.
- 2026-11-17, of the other cohorts' leaderboards: "éventuellement mais pas forcément en priorité ou mis en avant": they
  sit behind a discreet "Other cohorts" fold, after the player's own cohort, the staff and the general board.
  `progress.js` `boardScopes`.

## Consequences

Nothing changes in the code or for the players: the comments now point here instead of quoting.
