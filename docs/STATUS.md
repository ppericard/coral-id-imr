# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-15, about 03:00 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md)** (how the work is run, its 11-14 handover first, what bites, the open work).

Last checked: reports and events: 2026-11-12 ~09:45 Manila

## Now

Main: sheet script **v131** (#876). No player report read since 11-12. The night of 11-14 to 11-15 ran on, Pierre asleep.

- **Merged 11-14 day** (35 PRs, #861-#899): the Tree tab (#861, #880 node pages, #887 WoRMS), default covers (#864),
  Light and Cover proposals (#865, #870), `Timings` (#867), Q354 (#869), the "easy to correct" rule (#872), Q124 (b)
  bold letters (#873) and (d) coral name roots (#891), Find the X (#885), the fish admin at parity (#876, #895), the
  coral heatmap (#889), studies (#874 comeback, #883 Q351 step 2, #886 Professionalise, #892 species step 1), fish
  judging, the Candidate photos push split (#884).
- **Merged in the night** (18 PRs): #898 Tree tag filters; #906 the Tree tab for corals (Key = the IMR lecture groups,
  WoRMS families); #901 fish genus name roots (76 circle-1 genera, ETYFish); #903 the sheet overlay design (questions);
  #904 the Q351 batch refit (questions); #908 Journey cards in the player's local time; #909 the fish Home rotates its
  photos; #911 "?" tiles for units not met in My progress (fish; corals for "new" players); #912 an admin dark-mode
  check (no styling gap: tonight's "dark" screenshots were light, a script error); #914 surprise-only species fold to 5
  photos in the admin Tree; #916 CI faster (Smokes ~215 s to ~153 s); fish judging #900 #902 #905 #907 #910 #913 #915.
- **Fish judging, the whole day and night**: about 7,300 candidates judged, about 5,000 photos entering play; every
  game species has photos; about 3,500 candidates left (refills keep adding top-ups). Each PR lists its "Possible
  misidentifications (iNat ID taken as given)" for him to check (#902 holds 40).
- **In flight**: #871 (Q350, parked), #882 (Q123 j corals, parked); agents: fish judging (batch 6), the `smoke (net)`
  admin timeout (a train failed once; 3/3 green locally; root cause sought), IMR lecture photos traced to their sources.
- **Rows 9 and 10** (Q322): not synced since #840, still doubled; corrected at their next sync; no hand correction (D8).
- **Kept on branches, no PR (W27)**: `claude/admin-signout-seal` (Q334), `claude/level-count-from-log`,
  `claude/fish-todo-wip`, `claude/photo-genus-ability` (#637), `claude/time-weighted-steps` (#808, Q335).

## Next

Four agents at a time (W27); what is easy to correct afterwards ships:

1. `Code.gs`, one PR at a time, once #882 is answered: Q123 j fish, the Analyses machine key, roles step 1.
2. Fish photo judging, one batch PR at a time.
3. After his answers: #871, the species level (#892), the sheet overlay (#903), the comeback (#874 d, e).
4. The other ROADMAP "Next" rows. Deadline: the domain and repository rename before December 2026 (#886).

## Questions for Pierre

Numbered for good only when the answer commits the future and will be cited later (AGENTS.md "Working mode").
Each PR or study gives its recommendations; most are one-word answers:

- **#871 (Q350 after Q355 B)**: ship B' (B for corals, the first build's starter order for fish), accepting the costs
  left under every variant (fish rated world: the lecture RA's first Open Water later, the expert's units at Open
  Water at 1,000 lower; coral rated beginner's score at 1,000 −1.3), or a third look.
- **#882 (Q123 j, D2/D7)**: the `Stats` tab keeps per-player derived state (admin id, never served, blanked by a
  delete); accept, or pooled sums only. Not urgent (the 100 KB limit around December).
- **Two judgements of one photo**: the candidate copy wins silently today (his ★ Damselfishes cover became a juvenile
  and is ignored; pick another or retag). Rec. (C): one judgement per photo, an agent re-looks at the ~120 that differ
  on phase or by 2+ ease, the reference copy plays meanwhile.
- **#903 sheet overlay (a-g)**: (a) may he edit the IMR's own words? The ROADMAP records Q341 (a) as "IMR-verbatim
  fields read-only (C1)"; the note recommends editable with the original kept and restorable (this changes Q341).
- **#892 species step 1 (a-d)**; **#874 comeback (a-f)**; **#883 Q351 step 2 (a)** and **#904 refit (a, b)**: no
  game change now; **#886 Professionalise (a-f)**: a domain (~US$10-12 a year), accounts, an IMR agreement, backups.
- **Small ones**: #885 log the tapped photo (a `Code.gs` field) or not; #914 cap the two surprise-only sharks at 5
  photos in the game data too (now 30 and 48); a "watermark" tag for fish photos so Home skips them (#909); covers
  above coral genera in the Tree (#906), and with which default.
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

2026-11-15 ~03:00 Manila, integrator, through the night (Rule 0: agents work on, nothing asked of Pierre): 18
merges after the 35 of 11-14; the questions above wait for his morning.
