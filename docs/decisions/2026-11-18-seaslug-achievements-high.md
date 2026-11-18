# Sea slug achievements: the % ladder beyond 50%

Date: 2026-11-18 (Manila). PR: #1112. Rules or docs touched: L8
(`docs/rules/learning.md`), `docs/LEARNING.md` "Sea slug achievements", ROADMAP ("Sea slug achievements, after the first
version"), `core.js` `SEASLUG_ACH`, `tools/sync/Code.gs` (copied).

## Context

The first sea slug achievements (2026-11-17, Pierre: "une première version des succès pour les limaces de mer") had 15,
the % ones every 10 points to 50%. The ROADMAP row left the % beyond 50% "once players get there", as the corals have
pct75 and pct100 and the fish fpct60.

## Decision

Five more, `sspct60` to `sspct100`, every 10 points, all on the sea slug headline % (`achSnap` `pct`, the mean of the
genera's bars, since the sea slugs have no score tree and no species unit), in the shared record under their own `ss`
prefix. Total 20.

| Id | Name | Condition | Tier |
|---|---|---|---|
| sspct60 | Gill and frill | 60% sea slug progress | 3 |
| sspct70 | Muck magnet | 70% | 3 |
| sspct80 | Slug savant | 80% | 3 |
| sspct90 | Nudibranch nerd | 90% | 3 |
| sspct100 | Every last slug | 100%: the mean rounds to 100, so (nearly) every genus learned (a bar is 100% only once its exam is passed) | 3 |

Choices, easy to correct (names and tiers are Pierre's to review):
- Every 10 points, as the first version and the fish (Q259), not the corals' 75 and 100 only.
- All gold (tier 3): the first version already gave 50% gold; each of these is harder, and the corals' pct75 and pct100 are gold.
- 100% is built, unlike the fish's fpct100: the fish's 100% waits for the species names, while the sea slugs' % is the
  mean of the genera's bars and every genus can be learned. Like the corals' pct100 it is not in `ACH_LEARN` (not taken
  back with a learned mark). When a species level reaches the sea slugs the headline
  may move to a score and these thresholds will need the recount a % change always needs (fish achievements, Q259).
- Names: short, sea slug and diver flavoured, as the fish's (Pierre, 2026-11-08: "des noms sympas, rigolos, pour varier"),
  none repeating a first-version one.

## Consequences

- Timing (rule L8): not simulated. `tools/learnsim.js` plays corals and fish only, and the sea slugs have almost no
  answers yet; the ladder reads the same % as the 10 to 50% ones, so it comes only after them, and nothing here is
  reachable early.
- The sheet's valid ids come from the embedded `core.js` (`Code.gs` copied; a script version assigned at merge, change
  note `tools/sync/changes/claude-seaslug-ach-high.md`).
- Still waiting: the species achievements, once the sea slugs have species units; the list itself as Pierre reviews it.
