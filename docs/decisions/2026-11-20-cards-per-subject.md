# Cards per subject: the one-tap question's session is the subject's, and the sea slugs' all-met card before circle 3

Date: 2026-11-20. PR: #1318. Rules or docs touched: S1, U11; docs/spec/cards.md "One-tap questions",
docs/spec/seaslugs.md "Their circles", docs/spec/fish-game.md.

## Context

Pierre sent two reports from the app. In the coral practice quiz, "These questions are" came after a single coral
question. Each subject paced its own one-tap question, but the session it waits for (15 answers over 5 minutes) was the
device's, across subjects, so a long session in another subject made it due at the first coral answer. On Home, he
noticed that the sea slugs had no card before their next circle. Their circle 3 opens by itself with no offer card
(#1005), and they had no all-met card either. The fish have both.

## Decision

Pierre, 2026-11-20 (reports): «Carte "this questions are" après une seule question dans les coraux. Attention à avoir
des compteurs par matière» and «Ya pas de carte avant de passer au cercle suivant pour les nudibranches?».

- The one-tap question's session carries its subject, and an answer in another subject starts a new one. The
  integrator's call: this is the simplest per-subject counter, it is kept on the device, and the synced record does not
  change.
- The sea slugs get the shared all-met card in their own words, which says before circle 3 what comes next. The card
  rather than an opt-in offer, and its wording, are the integrator's call. A circle-3 offer would need `core.js`
  `SUBJECTS` `optin` and a stored choice, so it is left to Pierre.

## Consequences

`quiz.js` `pulseVisit` and `pulseDue` read `reefid-pulse` `v.s`. `app.js` gets `UNITS.seaslug` `done` (`slugNextOf`)
and `CARD_KINDS` `'sea slug'` (🐌; the sea slugs' cards showed an empty medallion). Tests: `tests/pulse.test.js`,
`tests/allmet.test.js`, `tests/seaslug.smoke.js`. The sea slugs' level-change card stays off (`startFb: false`). Pierre's
2026-11-08 decision names only the fish, so this point is left to him.
