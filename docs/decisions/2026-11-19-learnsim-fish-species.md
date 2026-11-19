# learnsim fish profiles: species known by the IMR cheatsheet and commonness, values assumed until fitted

Date: 2026-11-19. PR: #1251. Rules or docs touched: tools/learnprof.js, docs/LEARNING.md, docs/FISH_PATH.md, docs/spec/tools.md.

## Context

FISH_PATH.md "Checks before release" asks for learnsim fish profiles (rules L11, L12), and the level-2 checks of the
species level need them. The five fish profiles already knew families by circle 1 or by commonness, and genera through
their family. But every species started at the profile's low value, so an RA who knew a family knew none of its
species. Their numbers were the corals'.

## Decision

Integrator's call, made while building (the values are simulation inputs, easy to correct). Each fish profile knows
species on the fish's own structure:

- the lecture RA knows the IMR course PDF cheatsheet's 24 most sighted species;
- the strong RA knows those and the first 3 of each circle-1 family in its commonness order;
- the casual diver knows the first species of each family it knows;
- the expert knows all of them.

A known species sits below its family, and each RA family keeps species the RA does not know. The values are
assumptions: on 2026-11-19 the real log held no species answer, only 5 players had 200 fish answers or more, and its
right rates follow the draw's target. The fit waits for the ROADMAP row "Simulated profiles fitted to real players".

## Consequences

- A fish run reaches the species level sooner for the strong RA.
- `--spknow off` gives the runs of before exactly, for paired runs against a version without the profiles' species.
- The first-launch answer of each profile is its `choice` in `tools/learnprof.js`, no longer a table in each world.
- Specified in docs/LEARNING.md "Profiles" and FISH_PATH.md "Checks before release".
