# Your tricky pairs on My progress: the player's own mix-ups, shown, with no weight change

Date: 2026-11-19. PR: #1205. Rules or docs touched: S1, U1; docs/spec/front-end.md "The pages" (My progress),
docs/spec/model.md (the personal path), DESIGN.md (My progress), ROADMAP "Name-similarity confusion".

## Context

The name confusion study ([review](../reviews/2026-11-05-name-confusion-study.md), 5.6 and question f) found no firm
player-by-pair signal yet (3.6), but each player does have pairs they keep mixing up, whatever the cause. It proposed
to show players their own hard pairs on My progress ("Your tricky pairs"), so the private confusion becomes visible and
invites a deliberate fix, and not to make a personal pair a trap faster (a learning value). My progress already had an
"Often mixed up" block (the top 3 pairs the player had mixed up even once, ranked by `confOf`, which blends the
player's record with every player's pooled score).

## Decision

Pierre, 2026-11-14 (Q124), on the study's recommendations: "Je suis tes recommandations pour tout". For (f) the
recommendation was "not yet for the weight […]; yes in principle for 'Your tricky pairs'", recorded in ROADMAP as
"Your tricky pairs" on My progress, no weight change.

Choices made while building, not decided with Pierre, each easy to change (integrator's calls):

- **One block, not two**: "Often mixed up" becomes "Your tricky pairs" in the same place of the side column, rather
  than a second list of the same pairs (rule U1, the board fits one screen).
- **Own answers only**: the pairs and their order come from the player's own record (`core.js` `pairConf`), with no
  pooled prior; ranked by the own mix-up rate shrunk toward 0 by `CONF.W` (8) offers, mixed up / (offered + 8), so
  a pair now told apart sinks; ties, more mix-ups first.
- **Threshold and count**: a pair shows once mixed up 2 times (`TRICKY.MIN`; one slip is not a tricky pair), at most
  3 (`TRICKY.N`, as before); nothing shows without such a pair (the study gives no empty text).
- **Each chip** reads "A ↔ B · 3 of 5" (mixed up, offered together) in the subject's own names (`uname`), links to the
  pair's comparison where the subject has that page (the corals), and is a plain chip elsewhere (fish, sea slugs); a
  pair with a mystery tile is never named. One line in the page's "?" help explains it and asks the player what tells
  the two apart for them.

## Consequences

- `progress.js` `trickyPairs` (pure, tested in `tests/tricky.test.js`) and `trickyHTML`;
  the pages smoke's `names` part checks the section on a seeded record and that opening My progress writes nothing.
- No change to the draw, the model, the score or any stored record: no rules version (rule D5), no learning check
  (rule L11: not a learning change).
- Still open in the study's (f): a personal pair becoming a trap faster (own record worth more against the pooled score),
  held until a fairer player-by-pair test on more data.
