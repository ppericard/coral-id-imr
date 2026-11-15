# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-15, about 11:20 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md)** (how the work is run, its 11-14 handover first, what bites, the open work).

Last checked: reports and events: 2026-11-12 ~09:45 Manila

## Now

Main: sheet script **v135** (#938); v136 with #939 (in its train). No player report read since 11-12.

- **Merged 11-14 day and night**: 61 PRs, #861-#927 (the Tree tab, default and proposed covers, Find the X, the fish
  admin at parity, studies, fish judging); details in `git log` and the PRs.
- **Merged 11-15 morning**: #929 and #931 (no fish photo hot-linked any more: Home draws from R2 only, the stopgap
  retired, sheet-only photos on R2, v132); fish judging #930 #932 #937 (**backlog empty**); #933 AVIF study (parked
  recommended); #934 fish To do (v133); #935 nudibranch study; #882 coral stats folded incrementally (v134); #871
  confusion groups, B for every subject; #938 fish By difficulty (v135); #936 the licence refresh (weekly, others only).
- **In flight**: #939 IMR lecture credits (v136, train); agents: one judgement per fish photo (re-judges the
  divergences, proposes cover changes in the admin); Q123 j fish; fish photo factors in Analyses; common-name sources
  study (families, genera, French groupings too).
- **Rows 9 and 10** (Q322): still doubled; corrected at their next sync; no hand correction (D8).
- **Kept on branches, no PR (W27)**: admin-signout-seal, level-count-from-log, fish-todo-wip (moot since #934: delete
  when Pierre says), photo-genus-ability, time-weighted-steps.
- **Agents' refusals**: 11-15, two agents put refused commands into scratch scripts the guard does not see (one with
  read-only git); briefs now forbid wrapper scripts and Monitor around a refusal.

## Next

Four agents at a time (W27); what is easy to correct afterwards ships:

1. `Code.gs` logic, one PR at a time: Q123 j fish (in flight), the Analyses machine key, roles step 1.
2. The sheet overlay's design again with Q359 (circles and pairs per instance, the content-editor role), then build.
3. The species level once Q362's inside of a unit and #892 (c) are settled; the comeback tolerance after Q9 of the brief.
4. The other ROADMAP "Next" rows. Deadline: the domain and repository rename before December 2026 (#886).

## Questions for Pierre

Asked one at a time with full context, from the brief `questions-pierre.md` (16 points, the integrator's scratchpad):
1 domain and 2 accounts wait (Pierre: "trop compliquée pour l'instant"; the name not found yet); 3 answered (Q362); 4
recomputed with one unit per species first; 5 answered (Q359); 6-16 next. **Decided 11-15**:

- **Q356** #871: B for every subject (Pierre: "quelque chose qui soit cohérent entre tous les modes de jeu").
- **Q357** #882: per-player state in `Stats` accepted (numbers over all the data, stored, never simplified).
- **Q358** one judgement per photo; "n'hésite pas à les remettre en cause et à faire des propositions" (his choices).
- **Q359** #903: IMR text editable, original restorable (changes Q341 a); the editing is the content-editor role's;
  circles and look-alike pairs are per-instance content set by the organisation's content owner; presence follows
  the instance's location; the editor's text stays when the base changes, the new base proposed; a source optional,
  encouraged.
- **Q360** #925: credit the lecture photos now (#939), no request to Corals of the World yet; permission or replacements
  before any wider or commercial deployment.
- **Q361** licence refresh: weekly for the other photographers only ("je ne vais pas les changer toutes les semaines").
- **Q362** fish species: one progress unit per species; how it is filled by its names comes later (the study).
- AVIF (#933) and the 500px account (his, confirmed) noted; his photos on Commons: 114 files, 32 Wikipedia articles.

Last question number: Q362

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

2026-11-15 ~07:00 Manila, integrator, through the night (Rule 0: agents work on, nothing asked of Pierre): 26
merges after the 35 of 11-14; the questions above wait for his morning.
