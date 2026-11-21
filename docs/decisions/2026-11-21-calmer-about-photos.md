# About › Photos reads as a credit and a thank you, not an explanation

Date: 2026-11-21. PR: #1409. Rules or docs touched: ROADMAP "About and credits: a calmer rights text".

## Context

Pierre, 2026-11-08, approving the wording of #737 "for now": it "gives the impression we are trying to explain ourselves
and justify our rights, so it must evolve quickly" (ANSWERS Q282). The ROADMAP row of #738 wanted a short, plain credits
text (sources and licences, thanks, no justification), to be written once the IMR lecture photos are dealt with and the
Coral Finder crops gone.

## Decision

The rewrite is done now, on what is true today (REE-51 drops the condition): the Photos section says where the photos come
from, under which licences, thanks their authors and points to each photo's own credit, and no more. It says nothing new:
the lecture photos are used for IMR's training, many were not taken by IMR, most of those come from Corals of the World
(its terms linked), the others have no known source yet. The summary of the terms and the fish line's "never from IMR's
presentations" are gone as justification. The wording is the integrator's call, easy to correct.

## Consequences

`home.js` `viewAbout` and `app.js` `UNITS.fish.about.photos` carry the text. When the lecture photos are traced, replaced or
moved to an IMR edition (REE-34), this text is shortened again. The ROADMAP row and the mention in the backlog order are
removed.
