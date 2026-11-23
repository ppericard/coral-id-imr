# The sea slugs take every photo of an observation, as the fish do

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
- Implementation details (his own observations not first in genus-level lists, as before; the 40-request stop) are the
  integrator's call, easy to correct.

## Consequences

- `tools/fetch_seaslugs.py` `usable`, `usable_gl`, `pick`, `held`, `kept_of`, `stages`, `fill`, `eggs_back`, `topup`;
  tests `tests/seaslugcand.test.js`; `docs/spec/tools.md`, `judging/SEASLUG.md`.
- A judged candidate set aside as a near-duplicate still counts against a sea slug list's target (only an egg mass frees
  room, unlike the fish's `sure_out`): to settle before the extras are judged.
- The judging files need an explicit `keep` for an observation with several candidates (exactly one `best`).
