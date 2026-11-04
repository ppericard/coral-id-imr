# Evening log

Read this first every morning (AGENTS.md › Rule 0). Two parts: ideas Pierre brought after 17:30 Manila time, parked
untouched, and where the last day stopped. Each morning, turn every parked idea into work or a
[ROADMAP](ROADMAP.md) row with Pierre, then remove it from here.

## Ideas parked after hours

One entry per idea: date and Manila time, Pierre's idea in his own words (translated to English), the context needed to
pick it up (what prompted it, related files, PRs or ROADMAP rows), and any question to settle first. No analysis, no
plan: that waits for the morning.

_(none)_

## Questions for the morning

Asked by agents working without Pierre (AGENTS.md Rule 0): the question, its context, the agent's recommendation. Ask
them first thing, then clear them.

- **Fish common names: confirm the proposal, and how many names (2026-11-04 night, PR "Fish common names").** Context:
  `tools/fish_common.json` proposes 1 to 3 names per game species (the PDF name first; the FishBase and iNaturalist main
  English names when both references have them; a third when both have it and FishBase records it 3+ times): 184 species
  with 1 name, 158 with 2, 100 with 3. Every listed name is needed for common-name mastery, and the score simulation puts a
  common-names-only player at 80% after about 2.6 times as many answers as with one name each. Recommendation: confirm the
  first two rules and drop the third (then 252 / 170 / 20 species with 1 / 2 / 3 names); review the per-entry tables in the
  PR for single names you would cut (e.g. "Talbot's demoiselle" beside the PDF's "Talbot's damsel").
- **Fish common names: the two PDF slips (same PR).** Context: rule 6a keeps a likely PDF slip as written and flags it, so
  the proposal shows "Russelss's snapper" and "Eastern triangular" first, with "Russell's snapper" and "Eastern triangular
  butterflyfish" as accepted spellings. Recommendation: show the FishBase spelling and keep the PDF form accepted when
  typed (both are spellings of one name, not a different name).

## Where the day stopped

Overwritten by the end-of-day protocol (16:30-17:30 Manila): date; done today; unfinished work (branch, PR, state, next
step); waiting on Pierre; first thing to do tomorrow.

**2026-11-04, Pierre ended the day at 16:17 Manila** (written by the end-of-day protocol at that moment, Rule 0).

**Merged today (afternoon):** #485 trs field; #492 admin Corals | Fish switch (sheet v45); #494 admin files outlive a
deploy; #495 Analyses in plain words; #496 one presence rule (29 IMR-PDF fish in the game); #497 fish commonness index;
#498 UTC offset per answer (sheet v44; one-shot tz ran 15:49: +480 in 1494 rows); #500 Analyses › Sessions; #501
Players › Activity over time; #502 Analyses as charts with filters and sorts; #503-#511 docs, handover and dead-code
cleanups; #505 every account counts in the admin; #512 no "done" list in any doc (ROADMAP's frozen in docs/archive) and
Rule 0 reworded; #513 sw.js answers a page before its cache copy is written (root cause of the net.smoke hang); #514
net.smoke step 12b reports instead of stopping.

**Unfinished:**
- **#507 Coral basics card**: merged at 16:24 (A3 coloured trail, "Septa / costae", "Start: Colony" until a step is seen).
- **net.smoke hang** (ROADMAP row stays open): fixed by #513 from the CI log; not reproduced locally. Watch CI runs; if
  it comes back, the cache-write contention theory is wrong.
- **lab.css dead classes** not done (list in the cleanup agent's notes: a2arrs, a2chips, anatgrid, anatpanel, ikboxb,
  ikcrumbs, iksearch, ikstep, ikstepn, ikstepnav, labstrip, rref, rreflist, rrefs, zpick).
- **Test backlog:** D3 is a local-only commit (adfcd39, branch `claude/admiring-ramanujan-nw3mxr-tests-14`, lost if the
  container resets); D4, D6 and reduced motion paused.
- **Admin page roles, what is left** (ROADMAP row): the analysis cards and Health's "where players stop" move to
  Analyses; Health keeps only what needs action.

**Waiting on Pierre:**
- Create the two archive tags (the proxy refuses tag pushes from the agents), then the `cards` and `fishprog` branches
  can go: `git push origin f46f11c:refs/tags/archive/cards-mockups` and
  `git push origin dd491b0:refs/tags/archive/fishprog-mockups`.
- Branches he can delete: `netexp` (the agents' delete was refused), `calib-study` (docs salvaged in #503); `fishphotos`
  after the fish Candidates admin PR lands.
- The three fish book mappings (Grunters, Basslets, Flounders) to the identification key's groups.
- Older items in ROADMAP "Waiting on Pierre" (lecture wording points, Merulina, Lab Keep / Trim votes, benthic deck).

**First thing tomorrow:** read this and "Where the night stopped" (agents work on their own tonight, Rule 0); check the card on Learn › Genera is live; check the last CI runs for
the net.smoke hang; then the fish track toward the beta (ROADMAP "Next": judging of circles 2-3 and species photo
pre-proposals, the path as a tree with a genus level, 1-3 common names per species, fish basics, welcome question,
subject switch, opening fish to a group, fish leaderboard), with the admin page roles and lab.css alongside.
