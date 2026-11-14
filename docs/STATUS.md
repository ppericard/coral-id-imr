# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-14, about 16:50 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md)** (how the work is run, its 11-14 handover first, what bites, the open work).

Last checked: reports and events: 2026-11-12 ~09:45 Manila

## Now

Main: sheet script **v130** (#867, merged about 16:50 by a merge train with #869). No player report read since
11-12.

- **Merged 11-14**: #862 (Pierre's answers of 11-14 recorded), #863 (smokes answer every question format through one
  helper), #861 (admin Photos › Families becomes **Tree**, the key's classification as a tree of any depth; sheet v129),
  #865 (Photo review › Light proposals: the 152 re-judged light tags, Accept / Keep mine), #866 (`fish_refs.py` region
  labels fixed), #864 (Q339 (b): a family or genus card shows the most-seen species near the instance centre among
  those with a reference photo; 49 of 180 cards changed; his 28 covers kept), #868 (s278 shown as *Neoniphon
  argenteus*, the PDF's "argentus" kept in the source), #870 (Photo review › Cover proposals: his 24 family covers beside
  the rule's pick).
- **Merged 11-14 evening (train)**: #867 (the sheet's `Timings` tab: sampled ms and rows of each full read and save, no
  player data; the measure behind Q352), #869 (Q354: s088 and s244 photos from their Pacific taxa, IMR names kept, the
  credit keeps the iNaturalist name; three C5 points).
- **In flight**: #871 (Q350 confusion groups, Q355 B being built); agents: Q124 (b) bold differing
  letters, fish photo judging (the 81 Q354 candidates first, then the backlog).
- **Rows 9 and 10** (Q322): not synced since #840, still doubled; corrected at their next sync on a current app; no
  hand correction (the board is already right, D8).
- **Kept on branches, no PR (W27)**: `claude/admin-signout-seal` (Q334), `claude/level-count-from-log`,
  `claude/fish-todo-wip`, `claude/photo-genus-ability` (#637), `claude/time-weighted-steps` (#808, Q335).

## Next

Four agents at a time (rule W27), the slots kept full from this queue (Pierre, 11-14: "Tu lances tout ce que tu peux
lancer"); what is easy to correct afterwards ships (AGENTS.md "Working mode"):

1. The `Code.gs` line, one PR at a time: Q123 j (corals, then fish), the Analyses
   machine key (fail-closed; Pierre's steps later), roles step 1 (`can_()` and the audit tab).
2. Fish photo judging, batch after batch (about 10,100 candidates left).
3. Fish admin at parity: the Answer log and Pairs, then Journey details.
4. Tree: node pages (replacing the ★ switch), the WoRMS view, filters, the sheet overlay (Q341), then the corals.
5. Find the X's format (Q321), rebuilt; the species level, step 1 (FISH_PATH).
6. Read-only studies: Q351 step 2, the coral confusion heatmap (Q123 m), "Professionalise the platform".
7. The approved-photos workflow follow-ups (split the push job, `pip --require-hashes`); Q124 (d) name roots.
   Deadline: the domain and repository rename before December 2026 (Pierre's choice of name).

## Questions for Pierre

Numbered for good (never reset) only when the answer commits the future and will be cited later (AGENTS.md "Working
mode"); the others are asked plainly. An answered one goes into its PR and off this list.

- **For the morning (after 16:30 nothing new goes to Pierre, Rule 0)**: the comeback study (#874) questions a-f: keep P11's
  4-question comeback (rec. yes); no look-alike groups in the comeback on purpose (rec. no); FSRS stabilities
  recalibrated later (about 20 players with returns); the comeback's rust total given `INTRO.SLACK` (rec. yes, learnsim
  first); log the comeback's rust at its start (rec. yes); keep the recall discount after a comeback (rec. not now).
  Numbers are given when asked.
- Answered 11-14: Q355 (#871) B, "ok pour B" (the first cards as on main, no pull of a pair the cap split;
  declared pairs forced inside groups); Q352 (D1 behind a Worker when a measured threshold is crossed), Q353 (no paid tier; a monthly cost is
  settled with IMR), Q354 a (s164 kept, a C5 point) and b (Pacific photo taxa for s088 and s244, C5 points; the credit
  keeps the iNaturalist name, "ok pour (a)"); Q230: nothing to build (the list would be empty); N. argenteus corrected;
  the #861 and #864 choices; the 152 proposals and cover proposals as admin views. Q339-Q351 earlier (ROADMAP rows).

Last question number: Q355

## Pierre's hands

Actions only Pierre can do.

- **In the admin, when he wants**: Photo review › Light proposals (152) and › Cover proposals (24), then Publish.
- **For an IMR trainer**: the three Q354 points (two lyretail anthias s164 / s511; *Chromis agilis* and *Halichoeres
  marginatus* split into Pacific taxa), in `points.json` (admin Points).
- Check the type of the "Coral ID analyses" token and the R2 token's scope.
- **Delete his rewrite backup** when he says so; restrict the Coral Finder PDF's sharing on his Drive.
- From before: "CF book: off" + Publish; one player's starting answer back to "I'm at IMR" with #726 (Q228); delete the
  morning report scheduled task from claude.ai; the 8 unsure fish candidates and the expert analyses' photos (11-06);
  genus common names without a source (Cephalopholis, Centropyge, Dendrochirus, Dascyllus), if he wants them; covers for
  the 11 fish entries with no reference-level photo.
- **Astrea and Anacropora**: a photo hunt at the Dauin sites IMR trainers know (links: `git show 4c8251a:docs/STATUS.md`).
- **Protect `main`**; renew the admin GitHub token before late January 2027; look for the IMR benthic deck.

## Parked after hours

Ideas Pierre dictated after 17:30, untouched until the morning, then turned into work or a ROADMAP row (Rule 0).

- None.

## Last stop

2026-11-14 ~16:50 Manila, integrator: eight merges (#861-#870 but #867, #869 in flight); Pierre's rule "push what is
easy to correct afterwards" written into AGENTS.md (the invented "never merged on silence" clause removed); Q352-Q354.
