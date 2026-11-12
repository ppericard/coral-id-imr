# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-12, about 17:25 Manila, by the integrator (Rule 0: the end-of-day protocol). **A new integrator
starts here, then reads [INTEGRATOR.md](INTEGRATOR.md)** (how the work is run, what bites, the open work).

Last checked: reports and events: 2026-11-12 ~09:45 Manila

## Now

Main: sheet script **v128** (live). 11-12: no player report; nobody had answered since 11-09 16:25; one player's iPhone
still on build 634 (its update path, when it comes back); newest build 670 before today's merges.

- **Merged 11-12**: #849 (the sign-in card named in the event log: the "empty account card" was the sign-in card, no
  bug), #852 (Q337 (a): the open-all offer card gone, both subjects; Open all instant on the first card and in My
  progress), #853 (LEARNING "What each number measures": a success rate is never a level; rule L12), #850 (the custom
  quiz's one-time reminder of the units waiting in the Quiz, after 100 answers there, never during the opening hold),
  #854 (the Scientific names offer names EventMeasure to IMR players only; ⚙ tip fixed; `.claude/settings.json` allows
  resolving review threads, refused in auto mode), #851 (fish: a card once every family in play is met, with what
  comes next), #855 (Q338 calibrations recorded).
- **In flight**: Q338 (a) (Pierre ~17:19: "B10 après 200 réponses"): a unit still shaky after 10 of its own answers
  stops holding openings, from 200 answers; an agent builds the PR (`claude/stuck-shaky-200`), the integrator merges it
  under the contract once green.
- **Rows 9 and 10** (Q322): not synced since #840, still doubled; corrected at their next sync on a current app; no
  hand correction (the board is already right, D8).
- **Kept on branches, no PR (W27)**: `claude/admin-signout-seal` (the sealing cut out of #798, Q334;
  `docs/reviews/2026-11-09-admin-signout-seal.md`), `claude/level-count-from-log` (cut out of #840),
  `claude/fish-todo-wip`, `claude/photo-genus-ability` (#637), `claude/time-weighted-steps` (#808, Q335).
- **Lost with the 11-09 session's machine** (never pushed): `claude/analyses-fsrs` (AV 14), load order (b) and (d),
  Find the X's first format build: rebuilt from their ROADMAP rows when the backlog reaches them.

## Next

At most three agents (rule W27):

1. Merge the Q338 (a) PR once green (Codex, CI, threads).
2. **The comeback after a break** (Pierre 11-12: worth its own study, the first real case): P11 on 11-09 after three
   days, the comeback ended after 4 right answers, then a look-alike family (the fungiids) pulled her down.
   Read-only first (ROADMAP "Recalibrate the comeback after a break").
3. **The pages smoke `overlays` timed out once** waiting for `#view [data-c]` (#855's first head, a docs-only change);
   a guess: a typed question (no `[data-c]` buttons) inside its 60-answer loop. Confirm before touching it.
4. **Faster learning checks** (W27): tier 2 as a parallel matrix and answers capped at what is read; under 30 min.
5. Then ROADMAP "Backlog in priority order": the Matrix plan (Find the X's format, then Matrix), Q208 C if the data
   justify it, load order (b) and (d) rebuilt, the seal rebuild; the species level (common then scientific names:
   Pierre asked on 11-12 how players reach scientific names; no names choice exists yet). Deadline: the domain and
   repository rename before December 2026.

## Questions for Pierre

Numbered for good (never reset) only when the answer commits the future and will be cited later (AGENTS.md "Working
mode", Pierre 2026-11-08); the others are asked plainly. An answered one goes into its PR and off this list.

- **Q230** out-of-zone taxon-page photos: waits for real arguments.
- **Not numbered, from before**: **#641 a-j** (F7 = j) and #651's 5 choices; **Q123, Q124**; apply the **152 curated
  tag and ease proposals** (`judging/fish-light-q308.json`)? **Eel-tailed catfishes**
  (parked below): what he wants from it. `PFMT` (per-format offsets) also leaks the corals' values to fish (#805).
- Answered 11-12: Q337 (a) the open-all offer card goes (#852); Q338 (a) B10 from 200 answers (in flight); the custom
  quiz reminder and the "every family met" card's wording (#850, #851); EventMeasure for IMR players only (#854).

Last question number: Q338

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

2026-11-12 ~17:25 Manila, integrator, end of day: three read-only studies (the empty card, the opening burst, the shaky
limit) turned into Q337 and Q338; seven PRs merged (#849-#855); Q338 (a) in flight. 11-11: the catch-up, GitHub's
branches and Actions cleaned (#847), the STATUS refresh (#848).
