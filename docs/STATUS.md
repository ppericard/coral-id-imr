# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-11, about 10:40 Manila, by the integrator (a new session and account since the morning). **A new
integrator starts here, then reads [INTEGRATOR.md](INTEGRATOR.md)** (how the work is run, what bites, the open work).

Last checked: reports and events: 2026-11-11 ~06:50 Manila

## Now

Main: sheet script **v128** (#840 trust the log v127, #839 other-species split v128, merged 11-09 evening). No PR open
but this STATUS refresh. In a line: no player report from 11-08 to 11-10; two cards left open (To check).

- **11-11 morning**: local `main` realigned on GitHub's (the pre-rewrite clone dropped, never pushed); GitHub cleaned by
  the new **Clean branches and Actions** workflow (#847: 103 leftover branches and the ghost workflows' runs deleted;
  weekly from now on, docs/HANDOVER.md). The two Lab designs STATUS asked to keep as tags (`f46f11c` cards,
  `dd491b0` fish My progress) are **pre-rewrite commits**: a branch or tag on them puts the 2216 Coral Finder crops back
  in every clone. Pushed as branches by mistake on 11-11, deleted 15 min later; they stay reachable only by commit URL,
  as before. Keeping them for good means their Lab files re-committed on today's `main` (Pierre's call).
- **To check**: Progress data rows 9 and 10 once each has synced (unit counts as the log; else correct by hand, Q322 a);
  the leaderboard recalculated (rule D8). From the Events tab: an "account" card drawn **empty** (no title, no text) on
  a new device, build 624, 11-09 11:33 (a possible bug); an "Install the app" card on a device still on build 634 while
  668 is out (its update path).
- **Kept on branches, no PR (W27)**: `claude/admin-signout-seal` (the sealing cut out of #798, Q334; its design note
  `docs/reviews/2026-11-09-admin-signout-seal.md`: one IndexedDB store, every draft write in one transaction);
  `claude/level-count-from-log` (cut out of #840: P8's total still reads 170 until then); `claude/fish-todo-wip`;
  `claude/photo-genus-ability` (#637); `claude/time-weighted-steps` (#808's work, closed unmerged, Q335).
- **Lost with the previous session's machine** (never pushed): `claude/analyses-fsrs` (AV 14), `claude/load-order-b`
  and load order (d) (ROADMAP "Load order, further steps"), the first build of Find the X's format. Rebuilt from their
  ROADMAP rows when the backlog reaches them.

## Next

One at a time (rule W27):

1. **The opening burst** (Pierre 11-09 ~16:40, several players, P11 on corals): a mid player with few genera answers
   everything right, the engine opens many genera in a row and the success rate collapses for a while. Read-only on the
   real log first (who, how often, how deep, how long), then 2-3 ways to soften it without slowing experts, each with
   its benefits and risks, checked in short simulations.
2. **The empty "account" card** (Now, To check), then rows 9-10 and the leaderboard.
3. **Faster learning checks** (W27): tier 2 as a parallel matrix (profile × arm) and answers capped at what is read;
   target under 30 min (Q208's look 2 took 37 s; its full heavy-tail run 3 h).
4. Docs: #822's heavy-tail table and look 2 into LEARNING.md; INTEGRATOR: Rule 0's reading (16:30-17:30 opens nothing
   new, questions that close a topic under way are fine).
5. Then ROADMAP "Backlog in priority order": the Matrix plan (#826 tiles done; Find the X's format, then Matrix), Q208
   C if the data justify it (#822: accepting the scientific names delays every family at Advanced by 2,300-3,300
   answers), load order (b) and (d) rebuilt, the seal rebuild. Deadline: the domain and repository rename before
   December 2026 (ROADMAP).

## Questions for Pierre

Numbered for good (never reset) only when the answer commits the future and will be cited later (AGENTS.md "Working
mode", Pierre 2026-11-08); the others are asked plainly. An answered one goes into its PR and off this list.

- **Q230** out-of-zone taxon-page photos: waits for real arguments.
- **Not numbered, from before**: **#641 a-j** (F7 = j) and #651's 5 choices; **Q123, Q124**; apply the **152 curated
  tag and ease proposals** (`judging/fish-light-q308.json`)? **Eel-tailed catfishes**
  (parked below): what he wants from it. `PFMT` (per-format offsets) also leaks the corals' values to fish (#805).
- Answered 11-09: Q314 Codex limit lifted; Q315-Q317, Q136 (LEARNING.md); Q318 net z (#808); Q319, Q320, Q331, Q333
  strict typed names (#834: a name counts only if it designates the photo's own taxon; a right genus or species name
  counts; errors count); Q321 Matrix plan; Q322 trust the log, 4 rows (only rows 9, 10 hold doubles); Q323, Q336 (#839);
  Q324, Q335 #808 closed, its conclusions kept (#844); Q325 tiles (#826); Q326 Analyses (#829-#832); Q327 Visits
  (#836); Q328 🌱 after the admin's name, no rename (#841); Q329 load order a (#837); Q330, Q332 no exception, no floor,
  no card (#840); Q334 #798 split (#798, the seal on its branch); Q208 A (#822).

Last question number: Q336

## Pierre's hands

Actions only Pierre can do.

- **Delete his rewrite backup** when he says so; restrict the Coral Finder PDF's sharing on his Drive.
- From before: "CF book: off" + Publish; one player's starting answer back to "I'm at IMR" with #726 (Q228); delete the
  morning report scheduled task from claude.ai; the 8 unsure fish candidates and the expert analyses' photos (11-06);
  genus common names without a source (Cephalopholis, Centropyge, Dendrochirus, Dascyllus), if he wants them; covers for
  the 11 fish entries with no reference-level photo.
- **Astrea and Anacropora**: a photo hunt at the Dauin sites IMR trainers know (links: `git show 4c8251a:docs/STATUS.md`).
- **Protect `main`**. Never a tag on `f46f11c` or `dd491b0` (pre-rewrite: the crops would come back; Now).
- Renew the admin GitHub token before late January 2027; say his Lab Keep / Trim votes; look for the IMR benthic deck.

## Parked after hours

Ideas Pierre dictated after 17:30, untouched until the morning, then turned into work or a ROADMAP row (Rule 0).

- (integrator, from Pierre's session) the limit of 8 shaky genera fills with the hardest look-alike families: it held an
  expert's openings for 138 answers. Revisit with the opening burst (Next 1).
- (Pierre 11-08 ~20:20) "Eel-tailed Catfish is really a family with its own thumbnail in the book's index" (circle 3,
  *Plotosus lineatus*). Ask what he wants from it (a circle, a cover, more species?).

## Last stop

2026-11-09 ~17:10 Manila, integrator, end of day: the open PRs closed one by one (49 merged), rule W27, then #840 and
#839 merged. 11-11 morning (new integrator): the catch-up, GitHub's branches and Actions cleaned (#847), this refresh.
