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

- **Fish score: the second kind of names is slow (2026-11-04 night, fish score simulation).** Context: `tools/fishscore.js`
  (docs/LEARNING.md "Fish: the global score, simulated"): with the agreed anchors (80% common only, 85% scientific only, 100%
  both), a player who finishes one kind of names and then starts the other gains its last 15-20 points 7-12 times slower
  per answer than before (each species' scientific name adds about 0.06 points to someone who knows its common names). This
  comes from the anchors, not from *a* or *b*. Is that what you want? Recommendation: yes, keep the formula as agreed; the
  three bars under the headline (Entries, Common names, Scientific names) show the progress the headline hides.
- **Fish score: the leaderboard at equal effort (same simulation).** Context: at 30,000 simulated answers a player learning
  common names only shows 80%, scientific only 72%, both names side by side 62% (96% at 100,000). On the fish
  leaderboard (ranked by this score) an RA learning both names sits below a diver learning common names only, for most of
  the path. Recommendation: keep the one scale you chose; look again once fish answers are logged (the real pace per kind
  of names will replace the simulation's assumed learning rates).
- **Fish judging, circles 2 and 3: a family exception to the caps?** (fish photos track, 2026-11-04 night.) The 475
  photos of circles 2 and 3 and the winks were judged on the rubric as written (judging/FISH.md). Several of these
  families are almost never shown the way the rubric calls very easy: morays, snake eels, garden eels and jawfishes
  live with most of the body in a hole (partial: at most 3), frogfishes, scorpionfishes, stonefishes and seamoths are
  camouflaged (at most 3), rays and seamoths are mostly seen from above (at most 3). Seven entries have no photo at 4-5
  (Morays, Garden eels, Frogfishes, Snake eels, Jawfishes, Reef sharks and the Thresher sharks wink), so their
  first questions take their 3 easiest (`model.js` `easyFirst`, as designed). Question: keep the caps for them, or add
  a per-entry "natural view" exception like the juvenile classes (e.g. head out of a hole is the normal view of a
  moray)? **Recommendation: keep the caps** (circles 2 and 3 are opt-in, met after circle 1; the fallback to the 3
  easiest already works), and revisit when fish answers are logged.
- **Subject switch: the header chip on phones (2026-11-04 night, PR "Subject switch", not merged).** Context: the chip
  next to the logo with its icon and name did not fit a 390 px phone header with the Sign in pill (27 px too wide). Built:
  on phones the chip shows its icon and a small caret only (its name is its label), and while the Sign in pill shows the
  logotype text steps aside too, as it already does under 380 px for everyone; under 380 px the logotype steps aside
  whenever the chip shows and the chip drops its caret (it then fits from 320 px, signed in or out); on tablets and
  desktops icon + name + caret. Question: keep this, or another trade (e.g. the chip replaces the logotype on phones)?
  **Recommendation: keep** (signed in, the logotype shows from 380 px; screenshots in the PR).
- **Subject switch: the Home row's look (same PR).** Built as DESIGN.md says: one full-width segmented row above the
  doors, each subject with its icon and name, Fish with a small *beta* tag, the Tools tile and the fish emoji on the
  Tools links removed (the chip is the way back). Question: OK as it is, or a quieter row on desktop (it spans the
  page)? **Recommendation: OK as it is**; merge the PR once you have looked at the screenshots.

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
