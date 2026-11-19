# Merulina, Cyphastrea and Halomitra get ID tips from the Coral Finder, under their own heading

Date: 2026-11-19. PR: #1242. Rules or docs touched: C1, C2, C3; docs/DATA.md, docs/spec/tools.md (`apply_id_tips.py`).

## Context

Three starred slate genera (Merulina, Cyphastrea, Halomitra) had no short ID tip: the IMR lecture slides do not cover
them (`imr` empty), and `tools/id_tips.txt` condenses the lecture. Their cards showed the summary and the feedback fell
back to the tell-apart lines. The app-gaps review (item (j), [review](../reviews/2026-11-18-app-gaps-review.md)) asked
whether to give them sourced tips under their own label, never as IMR's, and recommended yes.

## Decision

Integrator's call, easy to correct (item (j) is not yet answered by Pierre): two or three tips each, condensed from the
genus's Coral Finder criteria (`crit`, on its book pages `pages`), the way the 27 extra genera's were. The tips box says
"ID tips (Coral Finder p. …)", not "ID tips (IMR)" (rules C1, C2). Jargon and skeleton cues stay in `crit` on the sheet
(rule C3).

## Consequences

`tools/id_tips.txt` takes a third column, "Coral Finder"; `tools/apply_id_tips.py` writes `qt` and, for those lines,
`tl` (the heading). `app.js` `tipsLabel` and `learn.js` `viewGenus` show `tl` wherever the tips are. A slate genus the
lecture later covers drops the third column and gets the IMR heading again.
