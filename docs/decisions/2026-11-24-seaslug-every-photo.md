# The sea slugs take every photo of an observation, as the fish do

Changed by: [Pierre's own observations come in whatever the room](2026-11-24-own-observations-everywhere.md) (his
observations on a full list).

Date: 2026-11-24. PR: #1525. Rules or docs touched: S1, P4 (cited, unchanged), P7; docs/spec/tools.md (the sea slug
fetcher), judging/SEASLUG.md; follows [the fish's every photo](2026-11-18-decisions-from-comments-tests-2.md) (Q226).

## Context

`tools/fetch_seaslugs.py` took the first usable photo of each observation and cited rule P4 for it. P4 says only that a
one-photo question shows one observation and that a multi-photo format never shows two photos of one observation as
different choices; it limits nothing about what is fetched. The fish have taken every photo of an observation since
2026-11-08, the extras weighing 0.5 against the species' cap. The difference was undeclared (rule S1).

## Decision

Pierre, 2026-11-23 21:05: «il faut justement toutes les prendre» (REE-252). 2026-11-24 06:45, on the sea slug fetcher
taking only each observation's first photo: «ça c'est une exception forte qui n'a pas lieu d'être»; on doing as the fish
do: «D'accord pour que par défaut on fasse partout pareil !».

- An observation brings every usable photo, in every list the fetcher writes (species, genus-level, species with no
  name): the first photo weighs 1 against the target and each further one 0.5 (`fetch_fish.obs_cost`), picked by the
  fish's own `select` (`pick`). Egg, Dead and licence rules are unchanged.
- `--topup` completes the observations already among the candidates, one batched read (200 ids a request, at most
  `TOPUP_MAX` 40 requests, rule C7). The first run: 5,162 observations, 26 requests, 2,563 photos added, none judged.
- The new candidates stay unjudged and out of play. Judging them is a pass over more than 100 photos: it needs Pierre's
  explicit OK with the count (rule P7).
- Same rule for what frees room (integrator's call on «par défaut on fasse partout pareil»: a difference with no
  written reason is aligned, easy to correct): a candidate Pierre rejected, excluded or sent elsewhere, or the judging set
  aside for sure (`dup`), frees its place as the fish's (`fetch_fish.state`, `sure_out`).
- Pierre's own observations are not aligned here: the sea slugs keep room for them up to `max` (30) on a full list, the
  fish keep none. Which way to align (both keep room, or neither) reduces or grows what his own photos get, so it waits
  for his choice; it is an open difference in the PR.
- Implementation details (his own observations not first in genus-level lists, as before; the 40-request stop) are the
  integrator's call, easy to correct.

## Consequences

- `tools/fetch_seaslugs.py` `usable`, `usable_gl`, `pick`, `held`, `kept_of`, `stages`, `fill`, `eggs_back`, `topup`;
  tests `tests/seaslugcand.test.js`; `docs/spec/tools.md`, `judging/SEASLUG.md`.
- `Gone` replaces the egg-only count in `held`; `fetch_fish.state` takes the subject's part of curation.json and
  data/suggest.json.
- The judging files need an explicit `keep` for an observation with several candidates (exactly one `best`).
