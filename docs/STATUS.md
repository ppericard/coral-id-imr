# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-14, about 20:05 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md)** (how the work is run, its 11-14 handover first, what bites, the open work).

Last checked: reports and events: 2026-11-12 ~09:45 Manila

## Now

Main: sheet script **v131** (#876). No player report read since 11-12.

- **Merged 11-14** (22 PRs): #861 Tree tab; #862-#863; #864 default covers (Q339 b); #865 Light proposals; #866;
  #867 `Timings` tab; #868 *N. argenteus*; #869 Q354 Pacific photo taxa; #870 Cover proposals; #872 the "easy to
  correct" rule; #873 Q124 (b) bold letters; #874 comeback study; #875 #877 #878 #879 fish judging (1,555 judged, 988 in
  play, s088 and s244 included); #876 fish Answer log and Pairs; #880 Tree node pages; #883 Q351 step 2 study (scripts in
  `tools/studies/q351/`); #884 Candidate photos push split and Pillow by hash (live run green, 11-14 ~20:00); #886 the
  "Professionalise the platform" study.
- **In flight**: #871 (Q350, parked: questions); #882 (Q123 j corals, parked: privacy question); #885 Find the X
  (a level-3 check on one unclear guardrail running); agents: fish judging (next batch), the Tree WoRMS view, the coral
  confusion heatmap (Q123 m).
- **Rows 9 and 10** (Q322): not synced since #840, still doubled; corrected at their next sync; no hand correction (D8).
- **Kept on branches, no PR (W27)**: `claude/admin-signout-seal` (Q334), `claude/level-count-from-log`,
  `claude/fish-todo-wip`, `claude/photo-genus-ability` (#637), `claude/time-weighted-steps` (#808, Q335).

## Next

Four agents at a time (W27), the slots kept full from this queue; what is easy to correct afterwards ships:

1. `Code.gs`, one PR at a time: #882 once answered, then Q123 j fish, the Analyses machine key, roles step 1.
2. Fish photo judging, one batch PR at a time (about 8,500 candidates left).
3. Tree: the WoRMS view, filters, the sheet overlay (Q341), the corals; fish admin Journey details.
4. The species level, step 1 (FISH_PATH); Q124 (d) name roots; Find the X follow-ups (prefetch, the `find` offset).
5. The Q351 batch refit (read-only, decided); SECURITY.md's Sheets cell limit (20 million, not 10).
   Deadline: the domain and repository rename before December 2026 (see the Professionalise study).

## Questions for Pierre

Numbered for good only when the answer commits the future and will be cited later (AGENTS.md "Working mode").
**For the morning** (after 16:30 nothing new goes to Pierre, Rule 0); each study gives its recommendations:

- **#871 (Q350 after Q355 B)**: ship B' (B for corals, the first build's starter order for fish; the app-world fish
  cells hold), accepting what stays under every variant (fish rated world: the lecture RA's first Open Water later, the
  expert's units at Open Water at 1,000 lower; coral rated beginner's score at 1,000 −1.3), or a third look.
- **#882 (Q123 j corals, D2/D7)**: the `Stats` tab keeps per-player derived state (admin id, never served, blanked by a
  delete); accept, or pooled sums only (an approximation). Not urgent (the 100 KB limit around December).
- **The comeback study (#874) a-f**; **Q351 step 2 (#883) (a)**: no change to the game, the same plan re-run at about
  20 players; **the Professionalise study (#886) a-f**: a domain (~US$10-12 a year, who pays), account ownership, the
  sheet's Google account, an agreement with IMR, a second person, a weekly backup outside Google.
- **#885 Find the X**: log the tapped photo (a `Code.gs` field; rows logged before cannot get it back), or not.
- Answered 11-14: Q352-Q355, Q230, *N. argenteus*, the #861/#864 choices. Q339-Q351 earlier.

Last question number: Q355

## Pierre's hands

Actions only Pierre can do.

- **In the admin, when he wants**: Photo review › Light proposals (152) and › Cover proposals (24), then Publish.
- **For an IMR trainer**: the three Q354 points in `points.json` (admin Points).
- Check the "Coral ID analyses" token's type and the R2 token's scope; **delete his rewrite backup** when he says so; restrict the Coral Finder PDF's sharing on his Drive.
- From before: "CF book: off" + Publish; one player's starting answer back to "I'm at IMR" with #726 (Q228); delete the
  morning report scheduled task from claude.ai; the 8 unsure fish candidates and the expert analyses' photos (11-06);
  genus common names without a source (Cephalopholis, Centropyge, Dendrochirus, Dascyllus), if he wants them; covers for
  the 11 fish entries with no reference-level photo.
- **Astrea and Anacropora** photo hunt (links: `git show 4c8251a:docs/STATUS.md`); **protect `main`**; renew the admin GitHub token before late January 2027; look for the IMR benthic deck.

## Parked after hours

Ideas Pierre dictated after 17:30, untouched until the morning, then turned into work or a ROADMAP row (Rule 0).

- None.

## Last stop

2026-11-14 ~20:05 Manila, integrator: 22 merges; Pierre's rule "push what is
easy to correct afterwards" written into AGENTS.md (the invented "never merged on silence" clause removed); Q352-Q354.
