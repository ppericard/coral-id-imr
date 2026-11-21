# About lists the sources the sea slugs' data cites, by a declaration in the subject's entry

Date: 2026-11-22. PR: #PRNUM. Rules or docs touched: C2, S1; `app.js` `UNITS` `about.cites`, `home.js` `aboutCites`,
spec/subjects.md; Linear REE-213.

## Context

About's References listed WoRMS alone for the sea slugs, while their genus, family and species sheets cite, line by
line, about a hundred papers and pages (the Sea Slug Forum's fact sheets, SEASLUG.WORLD, dive guides, a species named by
a paper) in `seaslug.json` (`msrc`, `lsrc`, `apsrc`, `en[].web`, `ensrc.guide`, a species' `cite`). Rule C2: every clue
carries its source, and what the app cites should be findable in one place. The corals' and the fish's lines are written
by hand (the Coral Finder book; the fish ID book).

## Decision

Integrator's call, easy to correct (the issue's "Next action": build the list from the subject's declared sources, rule
S1; REE-213): a subject's `UNITS` entry declares `about.cites` (`{lead, in}`: the sentence that introduces the list and
the parts of its data file that hold sources). `home.js` `aboutCites` is the one function, subject-neutral: it lists the
sources it finds in those parts, once the file is in (the player's copy when the subject was in force, else the file the
subject's Home reads). A source is an object `{t, u}` named as the data names it, linked when the data has a link, or a
record's `cite` with its `doi`. A site cited by several pages (the Sea Slug Forum, SEASLUG.WORLD, Florent's guide) is one
line, linked to the address of its host as its pages spell it, with its pages counted; a work cited at several places is
one line named by what the places share. Only the sea slugs declare it.

Kept by hand, as before: WoRMS, plus a Wikipedia line (the sea slugs' English names cite it by a key, linked from the
name on the sheets) in the sea slugs' `about.refs`; iNaturalist stays in the shared line. The sources cited by a key
(`en[].src`: `inat`, `worms`, `wiki`) each have their line; `tests/seaslug-about.test.js` fails on a new key.

**The corals and the fish stay as they are.** Run on their data, the same function would add: for the fish, 178 lines
(about 150 of them one per genus, *The ETYFish Project (Genus)*, which needs a grouping rule of its own) beside FishBase,
Reef Life Survey, Fishes of Australia and others; for the corals, 11 (Jaeger 1944 as 22 pages, Merriam-Webster split by
word). The issue and its "Players see" cover the sea slugs only, and listing the fish's would fetch `fish.json` (1.1 MB)
when About opens. Declaring `about.cites` in their entries is the way, when it is decided.

## Consequences

- The sea slugs' About lists 35 lines (the figures: the PR). Opening About fetches `seaslug.json` once for a player who
  has not used the sea slugs (345 KB; the service worker keeps it); offline, the list says it could not load.
- `tests/seaslug-about.test.js` checks every citation in `seaslug.json` has its line (the page, or its site), no line is
  uncited, each key-cited source has its line; `tests/seaslug.smoke.js` checks About in the browser.
- A line may still carry a place in the source (the CIESM Atlas line reads "..., Caloria indica page, Short description"):
  the data names the source that way.
