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
- **Admin page roles, the rest: the places and names (#535, open; 2026-11-04 night, admin track).** Context: the
  ROADMAP row you agreed (Health = what needs action, Activity = who plays, Analyses = what we learn; nothing removed,
  only moved) left these choices open; #535 made them (before/after screenshots listed in it): Activity's five analysis
  cards are **Analyses › Learning › Answer log**; the Mix-ups view (pairs, photos, colonies, species) is **Analyses ›
  Difficulty › Pairs** (next to the model's Mix-ups); Health's "Where players stop" and "Genus sheets opened" are
  **Analyses › Learning › Stops**; Health's 30-day answers and players per day went (Activity over time shows them per
  day). Question: these places and names, and dropping that card? **Recommendation: yes as built, then merge #535**;
  later, one Mix-ups view (the model's and the live tables together) if two read as one too many.
- **Health: alerts for what needs action, each linking to its detail? (same PR.)** Context: the row lists for Health app
  errors, photos failing, failed saves, old app versions, slow loads and alerts such as a calibration that drifts; today
  those live in To do › Errors (and All), and #535's Health keeps only its two answer-log alerts (photos everyone misses,
  genera that don't take off). Question: should Health also show a short line per such alert (a count linking to Errors
  or Analyses)? **Recommendation: yes, in a small follow-up PR** once #535 is in (not built: it is new UI).
- **Two fixes players will feel, waiting for your eye (merging was refused at night as a production deploy).** #524:
  a card photo that fails once on R2 no longer shows a broken-image icon for about a second while it is retried (your
  rule: never a broken-image icon on a card); #531: `sw.js` never waits on the browser's Cache Storage more than 3 s,
  for the net.smoke step-9 hang that came back after #513 (the log shows the browser's Cache Storage had stopped
  answering, so the page never loaded; why it stalls is not known; a test that wedges it failed before the fix). #520 (smokes in reduced motion, tests only) waits on
  #524: its CI found that bug. **Recommendation: merge #524, then #531 and #520 once green and Codex-clean.**

- **Fish common names (#522, open).** 442 species: 184 with 1 name, 158 with 2, 100 with 3 (full list in a PR comment).
  Q: drop the third-name rule (gives 252 / 170 / 20)? Recommendation: yes. Q: the two PDF slips ("Russelss's snapper",
  "Eastern triangular"): show the FishBase spelling and still accept the PDF form when typed? Recommendation: yes.
- **Fish genus step (#526, open, sheet v46).** Q: an opt-in "Scientific names" set now, the welcome question later?
  Q: a family's genera join at its Advanced? Q: the offer card and genus card wording (screens in the PR)? Q: genera stay
  out of the progress % until the global score ships? Recommendation: yes to all, as built.
- **Subject switch (#533, open).** Q: on phones the header chip shows icon + caret only and the logotype steps aside
  while Sign in shows (always under 380 px)? Q: the Home row's look (full width, icon, name, *beta* tag)?
  Recommendation: keep both as built.
- **Identify per subject (#536, open).** Q: the fish wording ("On the SVS videos · or a photo from your dive"; SVS or
  EventMeasure?), the "coming soon" card and the fish photo on the Home door. Recommendation: keep until the Fish ID Key
  is designed.
- **Fish welcome question (#538, open, sheet v47).** Q: the line under each answer (agent's wording)? Q: start values
  = the corals' (level 0 / 0.5 / 1.25, open-all card from answer 50 / 30 / 20) until learnsim has fish profiles?
  Recommendation: keep; learnsim fish profiles next.
- **Fish open to a group (#540, open, sheet v48).** Q: the group lives on the Fish side of Players (Beta column, Add /
  Remove, Add all)? Q: "Add all" adds existing players only, later sign-ups are added by hand? Q: the wording.
  Recommendation: keep as built.
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

## Where the night stopped

**2026-11-04 night, stopped at about 19:00 Manila: Pierre's Claude quota was nearly used up (about 6% left), so the
coordinator stopped the agents and wrote this handover; work may continue in another account (docs/HANDOVER.md).**

**Merged tonight:** #516 lab.css dead classes; #517 D3, #518 D4, #534 D6 (test backlog; admin smoke at 390 from 68 s to
12 s); #519 fish score simulation (`tools/fishscore.js`, docs/LEARNING.md); #521 fish photo judging, circles 2-3 and the
winks (all 1,160 fish game photos judged); #523, #525, #527, #528, #529, #532, #539, #541 fish candidates fetched for
every game species (fish-cand.json 8,667 → 12,073) and judged into suggest.json `fish` (8,573 judged, ~70 `unsure`;
nothing reaches the game without Pierre's Publish); #537 night questions.

**Open, waiting for Pierre** (all green and Codex-clean unless said; screenshots listed in each PR; they were saved in
the night session's scratchpad, which a new session cannot see, so re-take them if needed):

| PR | What | Note |
|---|---|---|
| #520 | Smokes in reduced motion by default | Red until #524 merges; then merge main and re-request Codex. |
| #535 | Admin page roles, the rest | Questions above. |
| #522 | Fish common names, 1-3 per species | Editorial; questions above. |
| #526 | Fish genus step | Sheet v46; questions above. |
| #533 | Subject switch, Home row + header chip | Questions above. |
| #536 | Identify per subject | Questions above. |
| #538 | Fish welcome question | Sheet v47; questions above. |
| #540 | Fish opens to a group | Sheet v48; questions above. |

**Morning 2026-11-05 (coordinator):** merged #531 (Cache Storage waits bounded), #551 (admin reads curation.json past 1 MB from its blob; the admin loads again, checked live), #524 (no broken-image flash on cards), #549 (fish candidates batch). #520 brought onto main, CI running. Still open: #520, then Pierre's choices on #535, #522, #526, #533, #536, #538, #540 (questions above).

**Next for the following agent (Pierre, 2026-11-05 morning; not started, to build after the open PRs are merged):**
(1) Journey › "Cards" list: items are not in time order (Nov 4 rows before Nov 2 ones), "inferred" is said twice, and
two identical "Changed to I had the IMR coral course · after answer 160 · in the welcome tour" rows appear 4 min apart
(duplicate event or two real changes: check the data path); check every time is the player's local time (UTC offset
logged per answer since sheet v44). (2) The admin opens on Players › Activity (recent sessions), not Players › List.
(3) Activity: tapping a session unfolds a mini-summary under it, on the same page: the session's success chart, start /
end / length, answers and % right, genera met or opened, notable events, a link to the full Journey; tap again folds it. Its content (Pierre, same morning): what the player made of the session: the most improved genera, the main
difficulties met (the genera or pairs missed most, the hardest photos), achievements unlocked, genera opened; a
short summary of the session, not raw numbers only.

**Pierre's answers (2026-11-05 morning):** yes to #535, #522 (and accept the misspelled forms when typed, the PDF's
especially), #526, #533, #536, #538, #540 as recommended. Notes for later: (1) #526: how to offer the genus step
again once a player has said no; (2) the fish global score (formula agreed, simulated in #519) is still to build;
(3) Identify in fish mode: the tool is used in front of EventMeasure (IMR's fish data-analysis software), not "SVS
videos" (wording fixed in #536).

**Merge-order traps:** the sheet versions 46 / 47 / 48 are reserved by #526 / #538 / #540: merged in another order, the
later ones take the next free number (Code.gs header, ARCHITECTURE's version list, tests). `tests/fish.smoke.js` is
touched by #533, #536, #538 and #540: the second to merge needs a small manual merge; #540 edits the Tools tile that #533
removes (take #533's side).

**Left to do on the fish candidates:** about 3,500 unjudged in 114 species (`python3 tools/judging_fish.py todo`: the
last 25 Wrasse species from s270 *Labroides bicolor*, then circles 2 and 3); same process as #523-#549.
