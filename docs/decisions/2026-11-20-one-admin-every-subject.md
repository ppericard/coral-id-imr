# One admin for every subject: the fish parity row becomes the one-engine plan

Date: 2026-11-20. PR: #1288. Rules or docs touched: S1, A4; ROADMAP "One engine for every subject, what is left" (the
row "Fish admin at parity with the corals, Analyses first" folded into it); docs/spec/admin.md;
[reviews/2026-11-19-admin-one-engine.md](../reviews/2026-11-19-admin-one-engine.md) §5.

## Context

The admin was built as the corals' pages plus a fish twin of each, followed by the ROADMAP row "Fish admin at parity
with the corals" (Pierre, 2026-11-08). The sea slugs came next, on the fish's pages through proxies. The one-engine study
of 2026-11-19 lists the duplicates and a plan in small steps; steps 1 (the ratchet) and 2 (the rubric) were done.

## Decision

Pierre, 2026-11-20 05:53: «l'admin doit être le même ou presque le même pour l'ensemble des matières et des modes de jeu.
Donc il y a un admin qui ensuite est adapté pour chacune des matières. Et donc du coup c'est aussi valable pour le
nidibranche, c'est aussi valable pour quoi que ce soit qu'on veuille plugger derrière.»

- One admin, adapted to each subject: each subject declares only its differences, in one place (rule S1); the goal is no
  longer the fish at parity with the corals but one admin for every subject, the sea slugs and any subject added later.
- The ROADMAP row "Fish admin at parity" is folded into "One engine for every subject, what is left", its open items
  kept; the plan is the study's §5.
- Step 3 is built in the same PR: one registry, `admin.js` `reg(S)`, the corals' built in memory (`reports.js`
  `flatReg`), the only per-subject choice the data shape the subject declares (`SUBJECTS` `flat`). Its names and the
  in-memory adapter are the integrator's call.

## Consequences

- Every page that needs a subject's units or photos reads `reg(S)`; the next steps (one Tree, one Candidates swiper, one
  band review, one montage and coverage, one tile, then the Learn pages) build on it, each lowering the S1 ratchet
  (`tests/subject-neutral-admin.test.js`).
- No data format and no player's progress changes; the study's §6 format changes stay Pierre's call.
- Specified in docs/spec/admin.md "Each subject's admin part".
